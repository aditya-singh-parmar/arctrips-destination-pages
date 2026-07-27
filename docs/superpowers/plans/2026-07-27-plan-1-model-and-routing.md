# Destinations Experience, Plan 1: Model and Routing

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every destination page onto the deep URL hierarchy `/destinations/{country}/{province}/[{region}/]{town}/...`, backed by a new additive `geo_places` tree, with existing page templates rendering unchanged at the new URLs.

**Architecture:** A self-referencing `geo_places` table (country, province, region, town, area) is added alongside the existing `destinations` / `city_categories` / `places` tables, which are never mutated. Routing moves from fixed route files to two optional catch-all routes driven by a pure path resolver that walks segments, looks each slug up scoped to its parent, and branches on the resolved node's `type`. This is the only design that handles an optional region tier, where a town sits at segment 3 or 4 and every deeper segment shifts with it.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, Supabase (`@supabase/ssr`), Vitest.

**Spec:** `docs/superpowers/specs/2026-07-27-destinations-experience-design.md` sections 2 and 3.

## Global Constraints

- **No em dashes** in rendered copy, UI text, code comments meant to render, commit messages, or replies. Use a comma, colon, parentheses, or "to" for ranges.
- **No italics anywhere.** `em, i` are neutralised to weight 600 in `app/theme.css`. Never add italic styling.
- **No emoji** in product copy.
- **One `.btn--primary` per screen.** Secondary actions use `.btn--ghost`, tertiary use `.btn--outline`.
- **No hardcoded hex colours in components.** Use brand tokens and CSS vars from `app/globals.css` and `app/theme.css`.
- **Migrations are additive only.** The Supabase instance is shared with the sibling Website-Builder project. Never drop, rename, or alter an existing table or column. New columns are nullable or carry defaults.
- **Server components by default.** Full page content must be in the initial HTML response with JavaScript disabled.
- **Commits are attributed to the owner.** No `Co-Authored-By` trailer, no author override. Plain `git commit`.
- **Node invocation:** scripts call `node node_modules/next/dist/bin/next ...` directly, working around a Node 25 `.bin/` shim bug on the host. Do not "fix" this to `npx next`.
- **Verification commands:** `npm test` (vitest), `npm run build` (production build), `npm run lint`.

## File Structure

| File | Responsibility |
|---|---|
| `app/lib/slug.ts` (create) | ASCII transliteration and slug generation. Pure. |
| `app/lib/slug.test.ts` (create) | Transliteration tests including Nuu-chah-nulth cases |
| `app/lib/geo-types.ts` (create) | `GeoType`, `GeoStatus`, `GeoNode`, legal child-type rules, URL builders. Pure, no I/O. |
| `app/lib/geo-types.test.ts` (create) | Child-type legality and URL building |
| `app/lib/resolver.ts` (create) | Path resolvers for both trees. Pure over an injected lookup. |
| `app/lib/resolver.test.ts` (create) | Every path shape, reserved slugs, optional region, guide disambiguation |
| `app/lib/geo.ts` (create) | Supabase reads for `geo_places` and `destination_categories`, with SEED fallback |
| `supabase/migrations/0003_geo_tree.sql` (create) | Additive schema: geo tree, category join, planning, capture, search support |
| `scripts/seed-geo.mjs` (create) | Builds the geo tree from existing `destinations` rows |
| `middleware.ts` (create) | Trailing-slash rewrite, no redirect |
| `next.config.ts` (modify) | `skipTrailingSlashRedirect`, legacy S1 redirects |
| `app/destinations/[[...path]]/page.tsx` (create) | Destination tree catch-all |
| `app/travel-guides/[[...path]]/page.tsx` (create) | Guide tree catch-all |
| `app/destinations/page.tsx` (delete) | Replaced by the catch-all at zero segments |
| `app/[city]/page.tsx` (delete) | Body moves to a template component under the catch-all |
| `app/[city]/[category]/page.tsx` (delete) | Same |
| `app/components/templates/DestinationHub.tsx` (create) | Extracted from `app/[city]/page.tsx`, unchanged rendering |
| `app/components/templates/CategoryGuide.tsx` (create) | Extracted from `app/[city]/[category]/page.tsx`, unchanged rendering |
| `app/components/templates/DestinationsLanding.tsx` (create) | Extracted from `app/destinations/page.tsx` |

---

### Task 1: Slug transliteration

**Files:**
- Create: `app/lib/slug.ts`
- Test: `app/lib/slug.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `toAsciiSlug(name: string): string`, `RESERVED_DESTINATION_SLUGS: readonly string[]`, `isReservedSlug(slug: string): boolean`

- [ ] **Step 1: Write the failing test**

```ts
// app/lib/slug.test.ts
import { describe, it, expect } from "vitest";
import { toAsciiSlug, isReservedSlug } from "./slug";

describe("toAsciiSlug", () => {
  it("lowercases and hyphenates plain names", () => {
    expect(toAsciiSlug("Long Beach")).toBe("long-beach");
    expect(toAsciiSlug("Sidney & the Saanich Peninsula")).toBe("sidney-and-the-saanich-peninsula");
  });

  it("strips diacritics to their ASCII base", () => {
    expect(toAsciiSlug("Québec City")).toBe("quebec-city");
    expect(toAsciiSlug("Tofino Inlet")).toBe("tofino-inlet");
  });

  it("transliterates Nuu-chah-nulth orthography", () => {
    expect(toAsciiSlug("ʔapsčiik t̓ašii")).toBe("apsciik-tasii");
    expect(toAsciiSlug("Yuułuʔiłʔatḥ")).toBe("yuuluilath");
  });

  it("collapses runs and trims separators", () => {
    expect(toAsciiSlug("  Hot  Springs -- Cove  ")).toBe("hot-springs-cove");
    expect(toAsciiSlug("1. Lake Louise")).toBe("1-lake-louise");
  });

  it("never returns an empty slug", () => {
    expect(toAsciiSlug("ʔ")).toBe("place");
    expect(toAsciiSlug("")).toBe("place");
  });
});

describe("isReservedSlug", () => {
  it("flags the reserved destination words", () => {
    expect(isReservedSlug("things-to-do")).toBe(true);
    expect(isReservedSlug("plan")).toBe(true);
    expect(isReservedSlug("compare")).toBe(true);
  });

  it("passes real area slugs", () => {
    expect(isReservedSlug("long-beach")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- slug`
Expected: FAIL, cannot find module `./slug`.

- [ ] **Step 3: Write the implementation**

```ts
// app/lib/slug.ts
/**
 * Slug generation for the geographic tree. Slugs are lowercase ASCII,
 * hyphen-separated, derived from the display name. The display name always
 * keeps its correct orthography; the slug is never the display name.
 * See docs/superpowers/specs/2026-07-27-destinations-experience-design.md 2.6.
 */

/** Reserved at segment 5 of a /destinations URL. An area may never use one. */
export const RESERVED_DESTINATION_SLUGS = ["things-to-do", "plan", "compare"] as const;

export function isReservedSlug(slug: string): boolean {
  return (RESERVED_DESTINATION_SLUGS as readonly string[]).includes(slug);
}

/**
 * Characters that Unicode NFD does not decompose, chiefly the Nuu-chah-nulth
 * orthography already in scope (ʔapsčiik t̓ašii, Yuułuʔiłʔatḥ). Glottal stops
 * and ejective marks carry no ASCII equivalent and are dropped; barred l and
 * eth-like forms map to their nearest letter.
 */
const EXTRA: Record<string, string> = {
  "ʔ": "", "ʕ": "", "ʼ": "", "̓": "", "̕": "",
  "ł": "l", "ƛ": "tl", "ʷ": "w", "ḥ": "h", "ḵ": "k", "ẖ": "h",
  "đ": "d", "ø": "o", "æ": "ae", "œ": "oe", "ß": "ss", "þ": "th", "ð": "d",
};

export function toAsciiSlug(name: string): string {
  const folded = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")          // drop combining diacritics
    .split("")
    .map((ch) => (ch in EXTRA ? EXTRA[ch] : ch))
    .join("")
    .toLowerCase();

  const slug = folded
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "place";
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- slug`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add app/lib/slug.ts app/lib/slug.test.ts
git commit -m "Add ASCII slug generation for the geographic tree"
```

---

### Task 2: Geo types, child-type legality, URL builders

**Files:**
- Create: `app/lib/geo-types.ts`
- Test: `app/lib/geo-types.test.ts`

**Interfaces:**
- Consumes: `toAsciiSlug` from Task 1 (not used directly here, but the same module family)
- Produces:
  - `type GeoType = "country" | "province" | "region" | "town" | "area"`
  - `type GeoStatus = "draft" | "coming_soon" | "published" | "hidden" | "archived"`
  - `type GeoNode` with fields `id, slug, name, type, parentId, status, heroPublicId?, standfirst?, body, lat?, lng?, timezone?, currency?, unitSystem?, alsoAppearsIn, seoTitle?, seoDescription?, sortPriority, updatedAt`
  - `isLegalChildType(parent: GeoType | null, child: GeoType): boolean`
  - `geoPath(trail: GeoNode[]): string`
  - `guidePath(trail: GeoNode[], guideSlug?: string): string`
  - `isRenderable(status: GeoStatus): boolean`

- [ ] **Step 1: Write the failing test**

```ts
// app/lib/geo-types.test.ts
import { describe, it, expect } from "vitest";
import { isLegalChildType, geoPath, guidePath, isRenderable, type GeoNode } from "./geo-types";

function node(slug: string, type: GeoNode["type"]): GeoNode {
  return {
    id: slug, slug, name: slug, type, parentId: null, status: "published",
    body: [], alsoAppearsIn: [], sortPriority: 0, updatedAt: "2026-07-27T00:00:00Z",
  };
}

describe("isLegalChildType", () => {
  it("allows the canonical chain", () => {
    expect(isLegalChildType(null, "country")).toBe(true);
    expect(isLegalChildType("country", "province")).toBe(true);
    expect(isLegalChildType("province", "town")).toBe(true);
    expect(isLegalChildType("province", "region")).toBe(true);
    expect(isLegalChildType("region", "town")).toBe(true);
    expect(isLegalChildType("town", "area")).toBe(true);
  });

  it("rejects skipped and inverted tiers", () => {
    expect(isLegalChildType(null, "town")).toBe(false);
    expect(isLegalChildType("country", "town")).toBe(false);
    expect(isLegalChildType("region", "region")).toBe(false);
    expect(isLegalChildType("area", "area")).toBe(false);
    expect(isLegalChildType("town", "town")).toBe(false);
  });
});

describe("geoPath", () => {
  it("builds a path without a region", () => {
    const trail = [node("canada", "country"), node("bc", "province"), node("tofino", "town")];
    expect(geoPath(trail)).toBe("/destinations/canada/bc/tofino");
  });

  it("builds a path with a region and an area", () => {
    const trail = [
      node("canada", "country"), node("bc", "province"),
      node("vancouver-island", "region"), node("tofino", "town"), node("long-beach", "area"),
    ];
    expect(geoPath(trail)).toBe("/destinations/canada/bc/vancouver-island/tofino/long-beach");
  });

  it("returns the landing path for an empty trail", () => {
    expect(geoPath([])).toBe("/destinations");
  });

  it("never emits a trailing slash", () => {
    expect(geoPath([node("canada", "country")]).endsWith("/")).toBe(false);
  });
});

describe("guidePath", () => {
  it("builds a town-scoped guide path", () => {
    const trail = [node("canada", "country"), node("bc", "province"), node("tofino", "town")];
    expect(guidePath(trail, "getting-there")).toBe("/travel-guides/canada/bc/tofino/getting-there");
  });

  it("builds a province-scoped guide path", () => {
    const trail = [node("canada", "country"), node("bc", "province")];
    expect(guidePath(trail, "top-ski-mountains")).toBe("/travel-guides/canada/bc/top-ski-mountains");
  });

  it("builds a scope index path when no guide slug is given", () => {
    const trail = [node("canada", "country"), node("bc", "province"), node("tofino", "town")];
    expect(guidePath(trail)).toBe("/travel-guides/canada/bc/tofino");
  });
});

describe("isRenderable", () => {
  it("renders published and coming_soon only", () => {
    expect(isRenderable("published")).toBe(true);
    expect(isRenderable("coming_soon")).toBe(true);
    expect(isRenderable("draft")).toBe(false);
    expect(isRenderable("hidden")).toBe(false);
    expect(isRenderable("archived")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- geo-types`
Expected: FAIL, cannot find module `./geo-types`.

- [ ] **Step 3: Write the implementation**

```ts
// app/lib/geo-types.ts
/**
 * The geographic tree: country > province > [region >] town > area.
 * Pure types and rules, no I/O, so the resolver can be unit-tested.
 * See docs/superpowers/specs/2026-07-27-destinations-experience-design.md 3.2.
 */
import type { ArticleBlock } from "./content";

export type GeoType = "country" | "province" | "region" | "town" | "area";
export type GeoStatus = "draft" | "coming_soon" | "published" | "hidden" | "archived";

export type GeoNode = {
  id: string;
  slug: string;
  /** Correct orthography, never an ASCII approximation. */
  name: string;
  type: GeoType;
  parentId: string | null;
  status: GeoStatus;
  heroPublicId?: string;
  standfirst?: string;
  body: ArticleBlock[];
  lat?: number;
  lng?: number;
  /** Set at country level, inherited by descendants. */
  timezone?: string;
  currency?: string;
  unitSystem?: string;
  /** Areas only: other towns that link here. Canonical still follows parentId. */
  alsoAppearsIn: string[];
  seoTitle?: string;
  seoDescription?: string;
  sortPriority: number;
  updatedAt: string;
};

/** Region is optional, so a province may parent either a region or a town. */
const LEGAL_CHILDREN: Record<string, GeoType[]> = {
  root: ["country"],
  country: ["province"],
  province: ["region", "town"],
  region: ["town"],
  town: ["area"],
  area: [],
};

export function isLegalChildType(parent: GeoType | null, child: GeoType): boolean {
  return LEGAL_CHILDREN[parent ?? "root"].includes(child);
}

/** Renders a 200. draft and hidden 404, archived 410. */
export function isRenderable(status: GeoStatus): boolean {
  return status === "published" || status === "coming_soon";
}

function segments(trail: GeoNode[]): string {
  return trail.map((n) => n.slug).join("/");
}

/** Canonical destination path. Never carries a trailing slash. */
export function geoPath(trail: GeoNode[]): string {
  return trail.length ? `/destinations/${segments(trail)}` : "/destinations";
}

/**
 * Canonical guide path. The location path may terminate at province, region
 * or town, which is what gives the regional roundups a legal URL.
 */
export function guidePath(trail: GeoNode[], guideSlug?: string): string {
  const base = trail.length ? `/travel-guides/${segments(trail)}` : "/travel-guides";
  return guideSlug ? `${base}/${guideSlug}` : base;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- geo-types`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add app/lib/geo-types.ts app/lib/geo-types.test.ts
git commit -m "Add geographic tree types, child-type rules and URL builders"
```

---

### Task 3: Destination path resolver

**Files:**
- Create: `app/lib/resolver.ts`
- Test: `app/lib/resolver.test.ts`

**Interfaces:**
- Consumes: `GeoNode`, `GeoType`, `isLegalChildType` from Task 2; `isReservedSlug` from Task 1
- Produces:
  - `type GeoLookup = (slug: string, parentId: string | null) => Promise<GeoNode | null>`
  - `type DestinationResolution` (discriminated on `kind`)
  - `resolveDestinationPath(segments: string[], lookup: GeoLookup): Promise<DestinationResolution>`

- [ ] **Step 1: Write the failing test**

```ts
// app/lib/resolver.test.ts
import { describe, it, expect } from "vitest";
import { resolveDestinationPath, type GeoLookup } from "./resolver";
import type { GeoNode } from "./geo-types";

function n(slug: string, type: GeoNode["type"], parentId: string | null): GeoNode {
  return {
    id: slug, slug, name: slug, type, parentId, status: "published",
    body: [], alsoAppearsIn: [], sortPriority: 0, updatedAt: "2026-07-27T00:00:00Z",
  };
}

// canada > bc > { vancouver-island > tofino > long-beach , squamish }
const NODES: GeoNode[] = [
  n("canada", "country", null),
  n("bc", "province", "canada"),
  n("vancouver-island", "region", "bc"),
  n("tofino", "town", "vancouver-island"),
  n("long-beach", "area", "tofino"),
  n("squamish", "town", "bc"),
];

const lookup: GeoLookup = async (slug, parentId) =>
  NODES.find((x) => x.slug === slug && x.parentId === parentId) ?? null;

describe("resolveDestinationPath", () => {
  it("resolves the landing page", async () => {
    expect((await resolveDestinationPath([], lookup)).kind).toBe("landing");
  });

  it("resolves each geographic tier", async () => {
    expect((await resolveDestinationPath(["canada"], lookup)).kind).toBe("geo");
    const prov = await resolveDestinationPath(["canada", "bc"], lookup);
    expect(prov.kind === "geo" && prov.node.type).toBe("province");
    const region = await resolveDestinationPath(["canada", "bc", "vancouver-island"], lookup);
    expect(region.kind === "geo" && region.node.type).toBe("region");
  });

  it("resolves a town with a region in the path", async () => {
    const r = await resolveDestinationPath(["canada", "bc", "vancouver-island", "tofino"], lookup);
    expect(r.kind === "geo" && r.node.slug).toBe("tofino");
    expect(r.kind === "geo" && r.trail.map((t) => t.slug)).toEqual(["canada", "bc", "vancouver-island", "tofino"]);
  });

  it("resolves a town with no region in the path", async () => {
    const r = await resolveDestinationPath(["canada", "bc", "squamish"], lookup);
    expect(r.kind === "geo" && r.node.type).toBe("town");
  });

  it("resolves an area", async () => {
    const r = await resolveDestinationPath(["canada", "bc", "vancouver-island", "tofino", "long-beach"], lookup);
    expect(r.kind === "geo" && r.node.type).toBe("area");
  });

  it("resolves the things-to-do index and a category page", async () => {
    const base = ["canada", "bc", "vancouver-island", "tofino"];
    expect((await resolveDestinationPath([...base, "things-to-do"], lookup)).kind).toBe("things-to-do");
    const cat = await resolveDestinationPath([...base, "things-to-do", "surfing"], lookup);
    expect(cat.kind === "category" && cat.categorySlug).toBe("surfing");
    expect(cat.kind === "category" && cat.town.slug).toBe("tofino");
  });

  it("resolves the plan index", async () => {
    const r = await resolveDestinationPath(["canada", "bc", "squamish", "plan"], lookup);
    expect(r.kind === "plan" && r.town.slug).toBe("squamish");
  });

  it("resolves a comparison", async () => {
    const r = await resolveDestinationPath(["compare", "squamish-vs-whistler"], lookup);
    expect(r).toMatchObject({ kind: "compare", a: "squamish", b: "whistler" });
  });

  it("rejects reserved words anywhere but under a town", async () => {
    expect((await resolveDestinationPath(["canada", "bc", "things-to-do"], lookup)).kind).toBe("not-found");
    expect((await resolveDestinationPath(["canada", "plan"], lookup)).kind).toBe("not-found");
  });

  it("rejects a category with no things-to-do segment", async () => {
    const r = await resolveDestinationPath(["canada", "bc", "squamish", "surfing"], lookup);
    expect(r.kind).toBe("not-found");
  });

  it("rejects a skipped tier", async () => {
    expect((await resolveDestinationPath(["tofino"], lookup)).kind).toBe("not-found");
    expect((await resolveDestinationPath(["canada", "tofino"], lookup)).kind).toBe("not-found");
  });

  it("rejects an unknown slug", async () => {
    expect((await resolveDestinationPath(["canada", "bc", "nowhere"], lookup)).kind).toBe("not-found");
  });

  it("rejects a path past an area", async () => {
    const r = await resolveDestinationPath(
      ["canada", "bc", "vancouver-island", "tofino", "long-beach", "extra"], lookup);
    expect(r.kind).toBe("not-found");
  });

  it("rejects a malformed comparison", async () => {
    expect((await resolveDestinationPath(["compare"], lookup)).kind).toBe("not-found");
    expect((await resolveDestinationPath(["compare", "squamish"], lookup)).kind).toBe("not-found");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- resolver`
Expected: FAIL, cannot find module `./resolver`.

- [ ] **Step 3: Write the implementation**

```ts
// app/lib/resolver.ts
/**
 * Path resolvers for the destination and travel-guide trees.
 *
 * Region is optional, so a town sits at segment 3 or 4 and every deeper
 * segment shifts with it. Position-based routing cannot express that, so the
 * resolver walks segments left to right, looking each slug up scoped to the
 * parent resolved so far, and branches on the resolved node's type.
 *
 * Pure over an injected lookup so it is unit-testable without a database.
 * See docs/superpowers/specs/2026-07-27-destinations-experience-design.md 2.2.
 */
import { isReservedSlug } from "./slug";
import { isLegalChildType, type GeoNode } from "./geo-types";

export type GeoLookup = (slug: string, parentId: string | null) => Promise<GeoNode | null>;

export type DestinationResolution =
  | { kind: "landing" }
  | { kind: "geo"; node: GeoNode; trail: GeoNode[] }
  | { kind: "things-to-do"; town: GeoNode; trail: GeoNode[] }
  | { kind: "category"; town: GeoNode; categorySlug: string; trail: GeoNode[] }
  | { kind: "plan"; town: GeoNode; trail: GeoNode[] }
  | { kind: "compare"; a: string; b: string }
  | { kind: "not-found" };

const NOT_FOUND = { kind: "not-found" } as const;

export async function resolveDestinationPath(
  segments: string[],
  lookup: GeoLookup,
): Promise<DestinationResolution> {
  if (segments.length === 0) return { kind: "landing" };

  if (segments[0] === "compare") {
    if (segments.length !== 2) return NOT_FOUND;
    const match = /^(.+?)-vs-(.+)$/.exec(segments[1]);
    return match ? { kind: "compare", a: match[1], b: match[2] } : NOT_FOUND;
  }

  const trail: GeoNode[] = [];
  let parentId: string | null = null;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const current = trail[trail.length - 1];

    // Reserved words are tested before the area lookup, so an area can never
    // shadow things-to-do or plan. They are only legal directly under a town.
    if (isReservedSlug(segment)) {
      if (!current || current.type !== "town") return NOT_FOUND;
      const rest = segments.length - 1 - i;

      if (segment === "things-to-do") {
        if (rest === 0) return { kind: "things-to-do", town: current, trail };
        if (rest === 1) return { kind: "category", town: current, categorySlug: segments[i + 1], trail };
        return NOT_FOUND;
      }
      if (segment === "plan") {
        return rest === 0 ? { kind: "plan", town: current, trail } : NOT_FOUND;
      }
      return NOT_FOUND; // "compare" is only legal as the first segment
    }

    const node = await lookup(segment, parentId);
    if (!node) return NOT_FOUND;
    if (!isLegalChildType(current?.type ?? null, node.type)) return NOT_FOUND;

    trail.push(node);
    parentId = node.id;
  }

  return { kind: "geo", node: trail[trail.length - 1], trail };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- resolver`
Expected: PASS, 14 tests.

- [ ] **Step 5: Commit**

```bash
git add app/lib/resolver.ts app/lib/resolver.test.ts
git commit -m "Add the destination path resolver for the deep URL tree"
```

---

### Task 4: Travel-guide path resolver

**Files:**
- Modify: `app/lib/resolver.ts` (append)
- Modify: `app/lib/resolver.test.ts` (append)

**Interfaces:**
- Consumes: `GeoLookup`, `GeoNode`, `isLegalChildType`
- Produces:
  - `type GuideResolution` (discriminated on `kind`)
  - `resolveGuidePath(segments: string[], lookup: GeoLookup): Promise<GuideResolution>`

- [ ] **Step 1: Write the failing test**

Append to `app/lib/resolver.test.ts`:

```ts
import { resolveGuidePath } from "./resolver";

describe("resolveGuidePath", () => {
  it("resolves the guides landing page", async () => {
    expect((await resolveGuidePath([], lookup)).kind).toBe("landing");
  });

  it("resolves a town-scoped guide index", async () => {
    const r = await resolveGuidePath(["canada", "bc", "squamish"], lookup);
    expect(r.kind === "index" && r.scope.slug).toBe("squamish");
  });

  it("prefers a region node over a guide slug at the same segment", async () => {
    const r = await resolveGuidePath(["canada", "bc", "vancouver-island"], lookup);
    expect(r.kind === "index" && r.scope.type).toBe("region");
  });

  it("resolves a province-scoped guide", async () => {
    const r = await resolveGuidePath(["canada", "bc", "top-ski-mountains"], lookup);
    expect(r.kind === "guide" && r.slug).toBe("top-ski-mountains");
    expect(r.kind === "guide" && r.scope.slug).toBe("bc");
  });

  it("resolves a region-scoped guide", async () => {
    const r = await resolveGuidePath(["canada", "bc", "vancouver-island", "best-beaches"], lookup);
    expect(r.kind === "guide" && r.slug).toBe("best-beaches");
    expect(r.kind === "guide" && r.scope.type).toBe("region");
  });

  it("resolves a town-scoped guide with and without a region", async () => {
    const withRegion = await resolveGuidePath(
      ["canada", "bc", "vancouver-island", "tofino", "getting-there"], lookup);
    expect(withRegion.kind === "guide" && withRegion.scope.slug).toBe("tofino");
    const without = await resolveGuidePath(["canada", "bc", "squamish", "what-to-pack"], lookup);
    expect(without.kind === "guide" && without.scope.slug).toBe("squamish");
  });

  it("rejects a guide scoped above province", async () => {
    expect((await resolveGuidePath(["canada", "some-guide"], lookup)).kind).toBe("not-found");
  });

  it("rejects a guide slug that is not the last segment", async () => {
    const r = await resolveGuidePath(["canada", "bc", "some-guide", "another"], lookup);
    expect(r.kind).toBe("not-found");
  });

  it("rejects a guide scoped to an area", async () => {
    const r = await resolveGuidePath(
      ["canada", "bc", "vancouver-island", "tofino", "long-beach", "a-guide"], lookup);
    expect(r.kind).toBe("not-found");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- resolver`
Expected: FAIL, `resolveGuidePath` is not exported.

- [ ] **Step 3: Write the implementation**

Append to `app/lib/resolver.ts`:

```ts
export type GuideResolution =
  | { kind: "landing" }
  | { kind: "index"; scope: GeoNode; trail: GeoNode[] }
  | { kind: "guide"; scope: GeoNode; slug: string; trail: GeoNode[] }
  | { kind: "not-found" };

/** A guide may be scoped to a province, a region or a town, never higher or lower. */
const GUIDE_SCOPES = ["province", "region", "town"];

/**
 * Walks the location path greedily. The first segment that is not a geo node
 * is taken as the guide slug, which is why a region always wins over a guide
 * of the same slug: the geo lookup is tried first.
 */
export async function resolveGuidePath(
  segments: string[],
  lookup: GeoLookup,
): Promise<GuideResolution> {
  if (segments.length === 0) return { kind: "landing" };

  const trail: GeoNode[] = [];
  let parentId: string | null = null;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const current = trail[trail.length - 1];
    const node = await lookup(segment, parentId);

    if (node && isLegalChildType(current?.type ?? null, node.type)) {
      trail.push(node);
      parentId = node.id;
      continue;
    }

    // Not a geo node, so it must be the guide slug: last segment, legal scope.
    if (i !== segments.length - 1) return NOT_FOUND;
    if (!current || !GUIDE_SCOPES.includes(current.type)) return NOT_FOUND;
    return { kind: "guide", scope: current, slug: segment, trail };
  }

  const last = trail[trail.length - 1];
  if (!GUIDE_SCOPES.includes(last.type)) return NOT_FOUND;
  return { kind: "index", scope: last, trail };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- resolver`
Expected: PASS, 23 tests total across both describe blocks.

- [ ] **Step 5: Commit**

```bash
git add app/lib/resolver.ts app/lib/resolver.test.ts
git commit -m "Add the travel-guide path resolver with region-first disambiguation"
```

---

### Task 5: Additive migration for the geo tree

**Files:**
- Create: `supabase/migrations/0003_geo_tree.sql`

**Interfaces:**
- Consumes: existing `destinations`, `categories`, `articles` tables
- Produces: tables `geo_places`, `destination_categories`, `planning_topics`, `traveller_profiles`, `geo_place_topics`, `notify_requests`, `search_synonyms`, `search_zero_results`; new nullable columns on `destinations`, `places`, `photos`, `articles`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/0003_geo_tree.sql
-- Arc Trips, Destinations Experience: the geographic tree.
-- country > province > [region >] town > area, self-referencing.
--
-- ADDITIVE ONLY. This Supabase instance is shared with the sibling
-- Website-Builder project. Nothing here drops, renames or alters an existing
-- table or column. Every added column is nullable or carries a default.
--
-- The existing `places` table means a point of interest inside a category
-- guide (Long Beach within tofino/beaches). This new `geo_places` table means
-- a geographic node. They are different things and both are kept.
-- See docs/superpowers/specs/2026-07-27-destinations-experience-design.md 3.

create table if not exists public.geo_places (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null,
  name            text not null,                       -- correct orthography
  type            text not null check (type in ('country','province','region','town','area')),
  parent_id       uuid references public.geo_places(id) on delete cascade,
  status          text not null default 'draft'
                    check (status in ('draft','coming_soon','published','hidden','archived')),
  standfirst      text,
  intro           jsonb not null default '[]'::jsonb,  -- ArticleBlock[]
  body            jsonb not null default '[]'::jsonb,  -- ArticleBlock[]
  hero_public_id  text,
  gallery         jsonb not null default '[]'::jsonb,
  lat             numeric,
  lng             numeric,
  bounds          jsonb,
  timezone        text,                                -- set at country, inherited
  currency        text,
  unit_system     text,
  also_appears_in uuid[] not null default '{}',        -- areas only
  seo_title       text,
  seo_description text,
  og_image        text,
  sort_priority   int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- An area may never take a reserved slug. Blocked at write, not at render.
  constraint geo_places_slug_not_reserved
    check (slug not in ('things-to-do','plan','compare')),
  -- also_appears_in is meaningful only for areas.
  constraint geo_places_also_appears_areas_only
    check (type = 'area' or cardinality(also_appears_in) = 0)
);

-- Slugs are unique among siblings. Enforced by constraint, not by a
-- pre-check, so two concurrent creates cannot both succeed.
create unique index if not exists geo_places_sibling_slug_idx
  on public.geo_places (coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), slug);
create index if not exists geo_places_parent_idx on public.geo_places (parent_id);
create index if not exists geo_places_type_idx   on public.geo_places (type);

-- The category join. A category page exists if and only if a row is here.
create table if not exists public.destination_categories (
  geo_place_id    uuid not null references public.geo_places(id) on delete cascade,
  category_slug   text not null references public.categories(slug) on delete cascade,
  status          text not null default 'coming_soon'
                    check (status in ('active','coming_soon','hidden')),
  overview_body   jsonb not null default '[]'::jsonb,  -- ArticleBlock[]
  best_months     int[] not null default '{}',         -- 1 to 12
  hero_public_id  text,
  gallery         jsonb not null default '[]'::jsonb,
  sort_order      int not null default 0,
  seo_title       text,
  seo_description text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (geo_place_id, category_slug),

  -- A category cannot go active with an empty body. An empty category page is
  -- worse than no page.
  constraint destination_categories_active_needs_body
    check (status <> 'active' or jsonb_array_length(overview_body) > 0),
  constraint destination_categories_months_valid
    check (best_months <@ array[1,2,3,4,5,6,7,8,9,10,11,12])
);

-- Planning: the practical axis and the intent axis, joined to towns.
create table if not exists public.planning_topics (
  slug       text primary key,
  name       text not null,
  sort_order int not null default 0,
  status     text not null default 'active'
);

create table if not exists public.traveller_profiles (
  slug       text primary key,
  name       text not null,
  sort_order int not null default 0
);

create table if not exists public.geo_place_topics (
  geo_place_id uuid not null references public.geo_places(id) on delete cascade,
  topic_slug   text not null references public.planning_topics(slug) on delete cascade,
  sort_order   int not null default 0,
  published    boolean not null default true,
  primary key (geo_place_id, topic_slug)
);

-- Existing tables gain a nullable link to their geo node. Nothing is moved.
alter table public.destinations add column if not exists geo_place_id uuid references public.geo_places(id) on delete set null;
alter table public.places       add column if not exists geo_place_id uuid references public.geo_places(id) on delete set null;
alter table public.photos       add column if not exists geo_place_id uuid references public.geo_places(id) on delete set null;
alter table public.articles     add column if not exists geo_place_id uuid references public.geo_places(id) on delete set null;

-- Content items: the articles table widens rather than being replaced.
alter table public.articles add column if not exists type         text not null default 'article';
alter table public.articles add column if not exists section_tag  text;
alter table public.articles add column if not exists topic_slug   text references public.planning_topics(slug) on delete set null;
alter table public.articles add column if not exists profile_slugs text[] not null default '{}';
alter table public.articles add column if not exists status       text not null default 'published';
alter table public.articles add column if not exists published_at timestamptz;
alter table public.articles add column if not exists updated_at   timestamptz not null default now();
alter table public.articles add column if not exists author       text;
alter table public.articles add column if not exists seo_description text;

-- Notify-me capture. CASL requires express consent, stored and versioned.
-- Nothing is sent from this repository; delivery is blocked on OQ-11.
create table if not exists public.notify_requests (
  id                    uuid primary key default gen_random_uuid(),
  email                 text not null,
  geo_place_id          uuid references public.geo_places(id) on delete cascade,
  category_slug         text references public.categories(slug) on delete cascade,
  consent_timestamp     timestamptz not null default now(),
  consent_source_url    text not null,
  consent_text_version  text not null,
  status                text not null default 'pending'
                          check (status in ('pending','notified','unsubscribed','bounced')),
  bounce_count          int not null default 0,
  created_at            timestamptz not null default now(),
  notified_at           timestamptz
);

-- A duplicate email + place + category updates rather than inserting.
create unique index if not exists notify_requests_unique_idx
  on public.notify_requests (
    lower(email),
    coalesce(geo_place_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(category_slug, '')
  );

-- Search support. The synonym list is editor-maintained, never code.
create table if not exists public.search_synonyms (
  term     text primary key,
  maps_to  text not null
);

create table if not exists public.search_zero_results (
  query      text primary key,
  hits       int not null default 1,
  last_seen  timestamptz not null default now()
);

alter table public.geo_places             enable row level security;
alter table public.destination_categories enable row level security;
alter table public.planning_topics        enable row level security;
alter table public.traveller_profiles     enable row level security;
alter table public.geo_place_topics       enable row level security;
alter table public.notify_requests        enable row level security;
alter table public.search_synonyms        enable row level security;
alter table public.search_zero_results    enable row level security;

-- Public read of renderable rows only. draft, hidden and archived are invisible
-- to the anon key, so an unpublished node cannot leak through the resolver.
create policy "geo_places public read" on public.geo_places
  for select using (status in ('published','coming_soon'));
create policy "destination_categories public read" on public.destination_categories
  for select using (status in ('active','coming_soon'));
create policy "planning_topics public read"    on public.planning_topics    for select using (status = 'active');
create policy "traveller_profiles public read" on public.traveller_profiles for select using (true);
create policy "geo_place_topics public read"   on public.geo_place_topics   for select using (published = true);
create policy "search_synonyms public read"    on public.search_synonyms    for select using (true);
-- notify_requests and search_zero_results: no public select. Writes happen
-- through a server action on the service role.
```

- [ ] **Step 2: Apply the migration and verify it lands**

```bash
set -a; source .env.local; set +a
node -e '
const {createClient}=require("@supabase/supabase-js");
const fs=require("fs");
const s=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);
(async()=>{
  const sql=fs.readFileSync("supabase/migrations/0003_geo_tree.sql","utf8");
  const {error}=await s.rpc("exec_sql",{sql});
  if(error){console.error("Apply via the Supabase SQL editor:",error.message);process.exit(1);}
  console.log("applied");
})();'
```

If no `exec_sql` RPC exists on this instance, paste the file into the Supabase SQL editor and run it there. Then verify:

```bash
set -a; source .env.local; set +a
node -e '
const {createClient}=require("@supabase/supabase-js");
const s=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);
(async()=>{
  for (const t of ["geo_places","destination_categories","planning_topics","traveller_profiles","geo_place_topics","notify_requests","search_synonyms","search_zero_results"]) {
    const {error}=await s.from(t).select("*",{count:"exact",head:true});
    console.log(t, error ? "MISSING: "+error.message : "ok");
  }
})();'
```

Expected: all eight report `ok`.

- [ ] **Step 3: Verify the existing tables are untouched**

```bash
set -a; source .env.local; set +a
node -e '
const {createClient}=require("@supabase/supabase-js");
const s=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);
(async()=>{
  for (const t of ["destinations","city_categories","places","photos","articles","experiences"]) {
    const {count,error}=await s.from(t).select("*",{count:"exact",head:true});
    console.log(t, error? "ERR "+error.message : count);
  }
})();'
```

Expected: `destinations 5`, `city_categories 15`, `places 127`, `photos 284`, `articles 31`, `experiences 6`. Any change to these counts means the migration was not additive; stop and investigate.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0003_geo_tree.sql
git commit -m "Add the additive geo tree migration"
```

---

### Task 6: Geo read layer

**Files:**
- Create: `app/lib/geo.ts`

**Interfaces:**
- Consumes: `getServerSupabase` from `app/lib/supabase.ts`; `GeoNode`, `GeoType` from Task 2
- Produces:
  - `lookupGeoChild(slug: string, parentId: string | null): Promise<GeoNode | null>` (satisfies `GeoLookup`)
  - `getGeoChildren(parentId: string | null, type?: GeoType): Promise<GeoNode[]>`
  - `getGeoNodeById(id: string): Promise<GeoNode | null>`
  - `getTrailFor(id: string): Promise<GeoNode[]>`
  - `getDestinationCategories(geoPlaceId: string): Promise<DestinationCategory[]>`
  - `type DestinationCategory = { geoPlaceId, categorySlug, status, overviewBody, bestMonths, heroPublicId?, sortOrder, updatedAt }`
  - `SEED_GEO: GeoNode[]` covering canada > bc > vancouver-island > {tofino, ucluelet}

- [ ] **Step 1: Write the implementation**

Follow the exact pattern used throughout `app/lib/content.ts`: try Supabase, fall back to the SEED constant when `getServerSupabase()` returns null or the query errors, so pages render identically without a database.

```ts
// app/lib/geo.ts
/**
 * Reads for the geographic tree. Mirrors the Supabase-to-SEED fallback pattern
 * in app/lib/content.ts, so every page renders with or without a database.
 */
import { getServerSupabase } from "./supabase";
import type { ArticleBlock } from "./content";
import type { GeoNode, GeoType } from "./geo-types";

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToNode(r: any): GeoNode {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    type: r.type as GeoType,
    parentId: r.parent_id ?? null,
    status: r.status,
    heroPublicId: r.hero_public_id ?? undefined,
    standfirst: r.standfirst ?? undefined,
    body: (r.body ?? []) as ArticleBlock[],
    lat: r.lat ?? undefined,
    lng: r.lng ?? undefined,
    timezone: r.timezone ?? undefined,
    currency: r.currency ?? undefined,
    unitSystem: r.unit_system ?? undefined,
    alsoAppearsIn: r.also_appears_in ?? [],
    seoTitle: r.seo_title ?? undefined,
    seoDescription: r.seo_description ?? undefined,
    sortPriority: r.sort_priority ?? 0,
    updatedAt: r.updated_at ?? new Date(0).toISOString(),
  };
}

/** Minimal tree so the app renders before the geo rows are seeded. */
export const SEED_GEO: GeoNode[] = [
  { id: "geo-canada", slug: "canada", name: "Canada", type: "country", parentId: null,
    status: "published", body: [], alsoAppearsIn: [], sortPriority: 0,
    timezone: "America/Vancouver", currency: "CAD", unitSystem: "metric",
    updatedAt: "2026-07-27T00:00:00Z" },
  { id: "geo-bc", slug: "bc", name: "British Columbia", type: "province", parentId: "geo-canada",
    status: "published", body: [], alsoAppearsIn: [], sortPriority: 0, updatedAt: "2026-07-27T00:00:00Z" },
  { id: "geo-vancouver-island", slug: "vancouver-island", name: "Vancouver Island", type: "region",
    parentId: "geo-bc", status: "published", body: [], alsoAppearsIn: [], sortPriority: 0,
    updatedAt: "2026-07-27T00:00:00Z" },
  { id: "geo-tofino", slug: "tofino", name: "Tofino", type: "town", parentId: "geo-vancouver-island",
    status: "published", body: [], alsoAppearsIn: [], sortPriority: 10, updatedAt: "2026-07-27T00:00:00Z" },
  { id: "geo-ucluelet", slug: "ucluelet", name: "Ucluelet", type: "town", parentId: "geo-vancouver-island",
    status: "published", body: [], alsoAppearsIn: [], sortPriority: 20, updatedAt: "2026-07-27T00:00:00Z" },
];

const RENDERABLE = ["published", "coming_soon"];

export async function lookupGeoChild(slug: string, parentId: string | null): Promise<GeoNode | null> {
  const sb = getServerSupabase();
  if (sb) {
    let q = sb.from("geo_places").select("*").eq("slug", slug).in("status", RENDERABLE).limit(1);
    q = parentId === null ? q.is("parent_id", null) : q.eq("parent_id", parentId);
    const { data, error } = await q;
    if (!error && data?.length) return rowToNode(data[0]);
    if (!error) return null;
  }
  return SEED_GEO.find((n) => n.slug === slug && n.parentId === parentId) ?? null;
}

export async function getGeoChildren(parentId: string | null, type?: GeoType): Promise<GeoNode[]> {
  const sb = getServerSupabase();
  if (sb) {
    let q = sb.from("geo_places").select("*").in("status", RENDERABLE);
    q = parentId === null ? q.is("parent_id", null) : q.eq("parent_id", parentId);
    if (type) q = q.eq("type", type);
    const { data, error } = await q.order("sort_priority").order("name");
    if (!error && data) return data.map(rowToNode);
  }
  return SEED_GEO
    .filter((n) => n.parentId === parentId && (!type || n.type === type))
    .sort((a, b) => a.sortPriority - b.sortPriority || a.name.localeCompare(b.name));
}

export async function getGeoNodeById(id: string): Promise<GeoNode | null> {
  const sb = getServerSupabase();
  if (sb) {
    const { data, error } = await sb.from("geo_places").select("*").eq("id", id).limit(1);
    if (!error && data?.length) return rowToNode(data[0]);
    if (!error) return null;
  }
  return SEED_GEO.find((n) => n.id === id) ?? null;
}

/** Root-first ancestor chain, used for breadcrumbs and canonical URLs. */
export async function getTrailFor(id: string): Promise<GeoNode[]> {
  const trail: GeoNode[] = [];
  let cursor: string | null = id;
  while (cursor && trail.length < 8) {
    const node: GeoNode | null = await getGeoNodeById(cursor);
    if (!node) break;
    trail.unshift(node);
    cursor = node.parentId;
  }
  return trail;
}

export type DestinationCategory = {
  geoPlaceId: string;
  categorySlug: string;
  status: "active" | "coming_soon" | "hidden";
  overviewBody: ArticleBlock[];
  bestMonths: number[];
  heroPublicId?: string;
  sortOrder: number;
  updatedAt: string;
};

export async function getDestinationCategories(geoPlaceId: string): Promise<DestinationCategory[]> {
  const sb = getServerSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("destination_categories")
    .select("*")
    .eq("geo_place_id", geoPlaceId)
    .in("status", ["active", "coming_soon"])
    .order("sort_order");
  if (error || !data) return [];
  return data.map((r: any) => ({
    geoPlaceId: r.geo_place_id,
    categorySlug: r.category_slug,
    status: r.status,
    overviewBody: (r.overview_body ?? []) as ArticleBlock[],
    bestMonths: r.best_months ?? [],
    heroPublicId: r.hero_public_id ?? undefined,
    sortOrder: r.sort_order ?? 0,
    updatedAt: r.updated_at ?? new Date(0).toISOString(),
  }));
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors from `app/lib/geo.ts`.

- [ ] **Step 3: Commit**

```bash
git add app/lib/geo.ts
git commit -m "Add the geo tree read layer with seed fallback"
```

---

### Task 7: Seed the geo tree from existing destinations

**Files:**
- Create: `scripts/seed-geo.mjs`
- Modify: `package.json` (add `"seed:geo"` script)

**Interfaces:**
- Consumes: `destinations` and `regions` tables, `toAsciiSlug` logic (reimplemented inline, since scripts are plain `.mjs` and cannot import TS)
- Produces: `geo_places` rows for Canada, its provinces, its regions and its towns; `destinations.geo_place_id` backfilled

- [ ] **Step 1: Write the seed script**

The script is idempotent: it upserts by `(parent_id, slug)` and may be re-run safely. It must not delete anything.

```js
// scripts/seed-geo.mjs
/**
 * Builds the geographic tree from the existing `destinations` rows.
 * Idempotent: upserts by (parent, slug) and never deletes.
 *
 * Run: node --env-file=.env.local scripts/seed-geo.mjs
 */
import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/** Which province and region each known city belongs to. Read from the corpus,
 *  never guessed. Cities absent here are skipped and reported. */
const CITY_GEO = {
  tofino:    { province: "bc", region: "vancouver-island" },
  ucluelet:  { province: "bc", region: "vancouver-island" },
  edmonton:  { province: "ab", region: null },
  montreal:  { province: "qc", region: null },
  toronto:   { province: "on", region: null },
};

const PROVINCES = {
  bc: "British Columbia", ab: "Alberta", on: "Ontario", qc: "Quebec",
  ns: "Nova Scotia", nl: "Newfoundland and Labrador", pe: "Prince Edward Island", sk: "Saskatchewan",
};

const REGIONS = {
  "vancouver-island": { name: "Vancouver Island", province: "bc" },
  "sea-to-sky":       { name: "Sea to Sky",       province: "bc" },
};

async function upsert(row) {
  const parentFilter = row.parent_id === null
    ? sb.from("geo_places").select("id").is("parent_id", null).eq("slug", row.slug)
    : sb.from("geo_places").select("id").eq("parent_id", row.parent_id).eq("slug", row.slug);
  const { data: found } = await parentFilter.limit(1);
  if (found?.length) {
    await sb.from("geo_places").update({ ...row, updated_at: new Date().toISOString() }).eq("id", found[0].id);
    return found[0].id;
  }
  const { data, error } = await sb.from("geo_places").insert(row).select("id").single();
  if (error) throw new Error(`insert ${row.slug}: ${error.message}`);
  return data.id;
}

const canada = await upsert({
  slug: "canada", name: "Canada", type: "country", parent_id: null, status: "published",
  timezone: "America/Vancouver", currency: "CAD", unit_system: "metric", sort_priority: 0,
});

const provinceIds = {};
for (const [slug, name] of Object.entries(PROVINCES)) {
  provinceIds[slug] = await upsert({ slug, name, type: "province", parent_id: canada, status: "published" });
}

const regionIds = {};
for (const [slug, r] of Object.entries(REGIONS)) {
  regionIds[slug] = await upsert({
    slug, name: r.name, type: "region", parent_id: provinceIds[r.province], status: "published",
  });
}

const { data: cities } = await sb.from("destinations").select("*").order("slug");
let linked = 0;
const skipped = [];
for (const city of cities ?? []) {
  const geo = CITY_GEO[city.slug];
  if (!geo) { skipped.push(city.slug); continue; }
  const parent = geo.region ? regionIds[geo.region] : provinceIds[geo.province];
  const id = await upsert({
    slug: city.slug, name: city.name, type: "town", parent_id: parent,
    status: city.published ? "published" : "draft",
    standfirst: city.standfirst ?? null,
    hero_public_id: city.hero_public_id ?? null,
    sort_priority: city.sort_order ?? 0,
  });
  await sb.from("destinations").update({ geo_place_id: id }).eq("slug", city.slug);
  linked++;
}

console.log(`geo tree: 1 country, ${Object.keys(provinceIds).length} provinces, ` +
  `${Object.keys(regionIds).length} regions, ${linked} towns linked`);
if (skipped.length) console.log(`skipped, no province mapping: ${skipped.join(", ")}`);
```

- [ ] **Step 2: Add the npm script**

In `package.json` `"scripts"`, add:

```json
"seed:geo": "node --env-file=.env.local scripts/seed-geo.mjs"
```

- [ ] **Step 3: Run it**

Run: `npm run seed:geo`
Expected output: `geo tree: 1 country, 8 provinces, 2 regions, 5 towns linked`

- [ ] **Step 4: Verify the tree resolves**

```bash
set -a; source .env.local; set +a
node -e '
const {createClient}=require("@supabase/supabase-js");
const s=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);
(async()=>{
  const {data}=await s.from("geo_places").select("slug,type,parent_id").order("type");
  console.log(data.length,"nodes");
  const byId=Object.fromEntries(data.map(n=>[n.parent_id,n]));
  const {data:t}=await s.from("geo_places").select("id,slug,parent_id").eq("slug","tofino").single();
  let cur=t, path=[];
  while(cur){ path.unshift(cur.slug);
    const {data:p}=await s.from("geo_places").select("id,slug,parent_id").eq("id",cur.parent_id).maybeSingle();
    cur=p; }
  console.log("/destinations/"+path.join("/"));
})();'
```

Expected: `/destinations/canada/bc/vancouver-island/tofino`

- [ ] **Step 5: Commit**

```bash
git add scripts/seed-geo.mjs package.json
git commit -m "Seed the geographic tree from the existing destination rows"
```

---

### Task 8: Trailing-slash rewrite and config

**Files:**
- Create: `middleware.ts` (repo root)
- Modify: `next.config.ts`

**Interfaces:**
- Consumes: nothing
- Produces: a 200 at the canonical path for any trailing-slash request, with no redirect hop

- [ ] **Step 1: Write the middleware**

```ts
// middleware.ts
import { NextResponse, type NextRequest } from "next/server";

/**
 * The taxonomy PRD forbids trailing slashes on canonical URLs and forbids
 * redirects. Next.js resolves that by default with a 308, which breaches the
 * second rule. Rewriting instead serves the canonical path at 200 with no hop.
 * See docs/superpowers/specs/2026-07-27-destinations-experience-design.md 2.4.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.length > 1 && pathname.endsWith("/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/\/+$/, "");
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
```

- [ ] **Step 2: Update next.config.ts**

Add `skipTrailingSlashRedirect: true` at the top level of `nextConfig`, and replace the `redirects()` comment block and body with the following. The seven pre-existing rules are kept (they cover URLs shipped before this tree existed, and 410ing them would discard live inbound links); the flat S1 city URLs gain one-time rules to their deep equivalents.

```ts
  /**
   * Next would answer a trailing slash with a 308. The taxonomy PRD forbids
   * redirects, so middleware.ts rewrites instead and this turns the default off.
   */
  skipTrailingSlashRedirect: true,

  /**
   * Redirects here cover URLs shipped BEFORE the deep destination tree existed.
   * No URL inside the tree ever redirects: archived places return 410.
   * Order matters, the region rules must precede the generic city rule.
   */
  async redirects() {
    return [
      { source: "/destinations/vancouver-island", destination: "/destinations/canada/bc/vancouver-island", permanent: true },
      { source: "/destinations/sea-to-sky", destination: "/destinations/canada/bc/sea-to-sky", permanent: true },
      // Flat S1 city URLs (shipped 2026-07-24) move under the deep tree.
      { source: "/tofino", destination: "/destinations/canada/bc/vancouver-island/tofino", permanent: true },
      { source: "/ucluelet", destination: "/destinations/canada/bc/vancouver-island/ucluelet", permanent: true },
      { source: "/tofino/:category", destination: "/destinations/canada/bc/vancouver-island/tofino/things-to-do/:category", permanent: true },
      { source: "/ucluelet/:category", destination: "/destinations/canada/bc/vancouver-island/ucluelet/things-to-do/:category", permanent: true },
      { source: "/things-to-do", destination: "/destinations", permanent: true },
    ];
  },
```

- [ ] **Step 3: Verify**

```bash
npm run build && (npm start &) && sleep 6
for u in /destinations /destinations/ /destinations/canada/bc/vancouver-island/tofino/; do
  echo "$u -> $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000$u)"
done
curl -s -o /dev/null -w 'legacy /tofino -> %{http_code} %{redirect_url}\n' http://localhost:3000/tofino
pkill -f "next start"
```

Expected: `/destinations/` returns **200**, not 308. `/tofino` returns 308 to the deep URL.

- [ ] **Step 4: Commit**

```bash
git add middleware.ts next.config.ts
git commit -m "Serve trailing-slash requests at the canonical path without a redirect"
```

---

### Task 9: Extract the existing templates into components

**Files:**
- Create: `app/components/templates/DestinationsLanding.tsx`
- Create: `app/components/templates/DestinationHub.tsx`
- Create: `app/components/templates/CategoryGuide.tsx`

**Interfaces:**
- Consumes: everything the current pages import
- Produces:
  - `DestinationsLanding(): Promise<JSX.Element>`
  - `DestinationHub({ citySlug, trail }: { citySlug: string; trail: GeoNode[] }): Promise<JSX.Element>`
  - `CategoryGuide({ citySlug, categorySlug, trail }: { citySlug: string; categorySlug: string; trail: GeoNode[] }): Promise<JSX.Element>`

This task is a pure move. **Rendering must not change**, only the breadcrumb trail and internal hrefs, which now come from `geoPath(trail)`.

- [ ] **Step 1: Move the landing body**

Copy the entire default-export body of `app/destinations/page.tsx` into `DestinationsLanding.tsx` as a named async component. Keep every import, every class name and every string. Do not restyle.

- [ ] **Step 2: Move the destination hub body**

Copy the default-export body of `app/[city]/page.tsx` (lines 41 to 146) into `DestinationHub.tsx`. Change exactly three things:

1. The signature takes `{ citySlug, trail }` instead of `{ params }`, and drops the `await params` line.
2. The breadcrumb trail becomes the geographic chain:
   ```tsx
   <Breadcrumb trail={[
     { href: "/destinations", label: "Destinations" },
     ...trail.slice(0, -1).map((node, i) => ({
       href: geoPath(trail.slice(0, i + 1)),
       label: node.name,
     })),
     { label: city.name },
   ]} />
   ```
3. Every internal href built from `citySlug` uses `geoPath(trail)`:
   - `href={`/${citySlug}#stays`}` becomes `href={`${geoPath(trail)}#stays`}`
   - `<CategoryCard citySlug={citySlug} ...>` gains a `basePath={`${geoPath(trail)}/things-to-do`}` prop (added in Step 4).

- [ ] **Step 3: Move the category guide body**

Copy the default-export body of `app/[city]/[category]/page.tsx` into `CategoryGuide.tsx` with the same three changes: signature, breadcrumb, and hrefs via `geoPath(trail)`. The breadcrumb gains the category name as its final non-linked crumb.

- [ ] **Step 4: Teach CategoryCard the new base path**

In `app/components/browse/CategoryCard.tsx`, add an optional `basePath?: string` prop. Where it currently builds `href={`/${citySlug}/${category.slug}`}`, use:

```tsx
const href = basePath ? `${basePath}/${category.slug}` : `/${citySlug}/${category.slug}`;
```

This keeps the component working for any caller not yet migrated.

- [ ] **Step 5: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors. The old pages still exist and still compile at this point.

- [ ] **Step 6: Commit**

```bash
git add app/components/templates app/components/browse/CategoryCard.tsx
git commit -m "Extract the destination templates into reusable components"
```

---

### Task 10: The destinations catch-all route

**Files:**
- Create: `app/destinations/[[...path]]/page.tsx`
- Delete: `app/destinations/page.tsx`, `app/[city]/page.tsx`, `app/[city]/[category]/page.tsx`
- Delete: `app/[city]/` directory if empty afterwards

**Interfaces:**
- Consumes: `resolveDestinationPath`, `lookupGeoChild`, `geoPath`, the three template components from Task 9
- Produces: every `/destinations/...` URL

- [ ] **Step 1: Write the route**

```tsx
// app/destinations/[[...path]]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveDestinationPath } from "@/app/lib/resolver";
import { lookupGeoChild } from "@/app/lib/geo";
import { geoPath } from "@/app/lib/geo-types";
import { DestinationsLanding } from "@/app/components/templates/DestinationsLanding";
import { DestinationHub } from "@/app/components/templates/DestinationHub";
import { CategoryGuide } from "@/app/components/templates/CategoryGuide";

type Props = { params: Promise<{ path?: string[] }> };

/**
 * The whole destination tree resolves here. Region is optional, so a town sits
 * at segment 3 or 4 and everything deeper shifts with it; a catch-all plus the
 * segment resolver is the only shape that expresses that.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { path = [] } = await params;
  const r = await resolveDestinationPath(path, lookupGeoChild);
  const canonical = `https://arctrips.com${geoPath("trail" in r ? r.trail : [])}`;

  if (r.kind === "landing") {
    return { title: "Destinations | Arc Trips", alternates: { canonical: "https://arctrips.com/destinations" } };
  }
  if (r.kind === "geo") {
    return {
      title: r.node.seoTitle ?? `${r.node.name} | Arc Trips`,
      description: r.node.seoDescription ?? r.node.standfirst,
      alternates: { canonical: `https://arctrips.com${geoPath(r.trail)}` },
    };
  }
  if (r.kind === "category") {
    return {
      title: `${r.categorySlug} in ${r.town.name} | Arc Trips`,
      alternates: { canonical: `${canonical}/things-to-do/${r.categorySlug}` },
    };
  }
  return { title: "Arc Trips" };
}

export default async function DestinationsRoute({ params }: Props) {
  const { path = [] } = await params;
  const resolution = await resolveDestinationPath(path, lookupGeoChild);

  switch (resolution.kind) {
    case "landing":
      return <DestinationsLanding />;

    case "geo":
      // Country, province and region indexes land in Plan 2. Until then a town
      // renders its hub and the higher tiers fall through to the landing page.
      if (resolution.node.type === "town") {
        return <DestinationHub citySlug={resolution.node.slug} trail={resolution.trail} />;
      }
      if (resolution.node.type === "area") notFound();
      return <DestinationsLanding />;

    case "category":
      return (
        <CategoryGuide
          citySlug={resolution.town.slug}
          categorySlug={resolution.categorySlug}
          trail={resolution.trail}
        />
      );

    // things-to-do, plan and compare templates land in Plan 2.
    case "things-to-do":
    case "plan":
    case "compare":
    case "not-found":
    default:
      notFound();
  }
}
```

- [ ] **Step 2: Delete the superseded routes**

```bash
git rm app/destinations/page.tsx app/[city]/page.tsx "app/[city]/[category]/page.tsx"
rmdir "app/[city]/[category]" "app/[city]" 2>/dev/null || true
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: success, with `/destinations/[[...path]]` listed in the route table and no `/[city]` routes.

- [ ] **Step 4: Verify the tree serves**

```bash
(npm start &) && sleep 6
for u in \
  /destinations \
  /destinations/canada \
  /destinations/canada/bc \
  /destinations/canada/bc/vancouver-island \
  /destinations/canada/bc/vancouver-island/tofino \
  /destinations/canada/bc/vancouver-island/tofino/things-to-do/surfing \
  /destinations/canada/bc/nowhere ; do
  echo "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000$u)  $u"
done
pkill -f "next start"
```

Expected: 200 for the first six, 404 for `nowhere`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Move the destination tree onto the deep URL hierarchy"
```

---

### Task 11: The travel-guides catch-all route

**Files:**
- Create: `app/travel-guides/[[...path]]/page.tsx`
- Modify: `app/guides/[slug]/page.tsx` (keep, it still serves cross-city guides)

**Interfaces:**
- Consumes: `resolveGuidePath`, `lookupGeoChild`, `guidePath`, `getArticleBySlug` from `app/lib/content.ts`
- Produces: every `/travel-guides/...` URL

- [ ] **Step 1: Write the route**

```tsx
// app/travel-guides/[[...path]]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveGuidePath } from "@/app/lib/resolver";
import { lookupGeoChild } from "@/app/lib/geo";
import { guidePath } from "@/app/lib/geo-types";
import { getArticleBySlug } from "@/app/lib/content";
import { GuideDetail } from "@/app/components/templates/GuideDetail";

type Props = { params: Promise<{ path?: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { path = [] } = await params;
  const r = await resolveGuidePath(path, lookupGeoChild);
  if (r.kind !== "guide") return { title: "Travel guides | Arc Trips" };
  const article = await getArticleBySlug(r.slug);
  return {
    title: article ? `${article.title} | Arc Trips` : "Travel guides | Arc Trips",
    description: article?.excerpt,
    alternates: { canonical: `https://arctrips.com${guidePath(r.trail, r.slug)}` },
  };
}

export default async function TravelGuidesRoute({ params }: Props) {
  const { path = [] } = await params;
  const resolution = await resolveGuidePath(path, lookupGeoChild);

  if (resolution.kind === "guide") {
    const article = await getArticleBySlug(resolution.slug);
    if (!article) notFound();
    return <GuideDetail article={article} trail={resolution.trail} />;
  }

  // Guide indexes by scope land in Plan 2.
  notFound();
}
```

- [ ] **Step 2: Create the GuideDetail component**

Extract the body of `app/guides/[slug]/page.tsx` into `app/components/templates/GuideDetail.tsx`, taking `{ article, trail }` instead of `{ params }`. Keep the rendering identical. Leave `app/guides/[slug]/page.tsx` in place, rewritten to call the same component, so existing `/guides/...` links keep working.

- [ ] **Step 3: Build and verify**

Run: `npm run build`
Then:

```bash
(npm start &) && sleep 6
set -a; source .env.local; set +a
SLUG=$(node -e '
const {createClient}=require("@supabase/supabase-js");
const s=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);
s.from("articles").select("slug").limit(1).single().then(r=>console.log(r.data.slug));')
echo "guide slug: $SLUG"
curl -s -o /dev/null -w '%{http_code}  /travel-guides/canada/bc/vancouver-island/tofino/'"$SLUG"'\n' \
  "http://localhost:3000/travel-guides/canada/bc/vancouver-island/tofino/$SLUG"
pkill -f "next start"
```

Expected: 200.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add the travel-guides tree with scope-terminating guide URLs"
```

---

### Task 12: Sweep internal links and verify the whole site

**Files:**
- Modify: `app/components/landing/ExploreDestinations.tsx`, `app/components/landing/TopNav.tsx`, `app/components/landing/Footer.tsx`, `app/components/nav/DestinationSearch.tsx`, `app/page.tsx`, and any other file containing a flat city href

**Interfaces:**
- Consumes: `geoPath`, `getTrailFor`
- Produces: no internal link anywhere points at a retired flat URL

- [ ] **Step 1: Find every flat link**

```bash
grep -rn 'href="/\(tofino\|ucluelet\|things-to-do\)' app/ --include=*.tsx
grep -rn 'href={`/${' app/ --include=*.tsx
grep -rn '"/destinations/' app/ --include=*.tsx
```

- [ ] **Step 2: Add a path helper for city slugs**

Add to `app/lib/geo.ts`:

```ts
import { geoPath } from "./geo-types";

/** Canonical destination path for a town slug. Used by landing-page links. */
export async function pathForTownSlug(slug: string): Promise<string> {
  const sb = getServerSupabase();
  if (sb) {
    const { data } = await sb.from("geo_places").select("id").eq("slug", slug).eq("type", "town").limit(1);
    if (data?.length) return geoPath(await getTrailFor(data[0].id));
  }
  const seed = SEED_GEO.find((n) => n.slug === slug && n.type === "town");
  if (!seed) return "/destinations";
  const trail: GeoNode[] = [];
  let cursor: string | null = seed.id;
  while (cursor) {
    const node = SEED_GEO.find((n) => n.id === cursor);
    if (!node) break;
    trail.unshift(node);
    cursor = node.parentId;
  }
  return geoPath(trail);
}
```

- [ ] **Step 3: Rewrite each call site**

Every component that renders a destination card resolves its href through `pathForTownSlug(slug)`. These are all server components, so awaiting is fine. Replace each flat href found in Step 1.

- [ ] **Step 4: Full verification**

```bash
npm test && npm run lint && npm run build
(npm start &) && sleep 6
# Crawl every internal link from the landing page and the tree, report non-200s.
node -e '
const seen=new Set(), queue=["/","/destinations"];
const bad=[];
(async()=>{
  while(queue.length){
    const p=queue.shift();
    if(seen.has(p))continue; seen.add(p);
    const res=await fetch("http://localhost:3000"+p);
    if(res.status!==200) { bad.push(p+" -> "+res.status); continue; }
    const html=await res.text();
    for(const m of html.matchAll(/href="(\/[^"#?]*)"/g)){
      const href=m[1];
      if(!seen.has(href) && queue.length<200) queue.push(href);
    }
  }
  console.log("crawled",seen.size,"pages");
  console.log(bad.length? "BROKEN:\n"+bad.join("\n") : "no broken links");
})();'
pkill -f "next start"
```

Expected: `no broken links`, and every test passing.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Point every internal link at the deep destination tree"
```

---

## Self-Review

**Spec coverage.** Spec section 2.1 route shapes: Tasks 3, 4, 10, 11. Section 2.2 resolver: Task 3. Section 2.3 guide disambiguation: Task 4. Section 2.4 trailing slashes: Task 8. Section 2.5 legacy redirects: Task 8. Section 2.6 slug generation: Task 1. Section 3.2 `geo_places`: Task 5. Section 3.3 `destination_categories`: Task 5, read in Task 6. Section 3.4 planning tables: Task 5 (schema only; UI is Plan 2). Section 3.5 content items: Task 5 columns. Section 3.6 capture and search tables: Task 5 (schema only; behaviour is Plan 3). Section 3.7 cascade: deferred to Plan 2, where the ancestor-status check joins the read layer, and noted below.

**Known deferrals into Plan 2.** Country, province and region index templates; `things-to-do`, `plan` and `compare` templates; the ancestor-status render cascade (spec 3.7); 410 for archived places; JSON-LD; sitemaps. Task 10 routes these to the landing page or `notFound()` deliberately, so no URL 500s in the interim.

**Type consistency.** `GeoNode` is defined once in Task 2 and consumed unchanged in Tasks 3, 4, 6, 9, 10, 11, 12. `GeoLookup` in Task 3 is satisfied by `lookupGeoChild` in Task 6, both `(slug: string, parentId: string | null) => Promise<GeoNode | null>`. `geoPath(trail: GeoNode[])` is used with the same signature in Tasks 9, 10, 12. `isReservedSlug` from Task 1 is consumed in Task 3. `RESERVED_DESTINATION_SLUGS` matches the SQL check constraint in Task 5 exactly: `things-to-do`, `plan`, `compare`.
