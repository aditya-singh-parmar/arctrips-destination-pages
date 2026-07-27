# Destinations Experience, Plan 2: Templates and SEO

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every node in the destination tree a real template and the full section 9 SEO contract, so no URL borrows another page's content and nothing dead-ends.

**Architecture:** Plan 1 left country, province and region borrowing the landing page under `noindex`, and left area, things-to-do, plan and compare returning 404. This plan gives each its own template, adds JSON-LD and two database-driven sitemaps, and adds the ancestor-status cascade so hiding a town removes its descendants from render and index without mutating their stored status.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, Supabase, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-27-destinations-experience-design.md` sections 5, 6 and 3.7.

## Scope correction against the spec

Spec section 10 assigned the six typed content components (spot index, season matrix, trip-style index, wildlife index, comparison matrix, cost table) and the best-time module to Plan 2. Every one of them renders data the corpus import produces: `best_months`, and the 57 tables currently sitting in `.docx`. `destination_categories.best_months` is empty in the database today.

Building them now means building against nothing and guessing at shapes. **They move to Plan 3**, immediately after the import that populates them. The comparison template moves with them, since exactly one comparison document exists and it is not yet imported.

Plan 2 is therefore: structural templates, the applicability model made real, JSON-LD, sitemaps, error pages, and the status cascade.

## Global Constraints

- **No em dashes** in rendered copy, UI text, code comments meant to render, or commit messages. Use a comma, colon, parentheses, or "to" for ranges.
- **No italics anywhere.** `em, i` are neutralised in `app/theme.css`.
- **No emoji** in product copy.
- **One `.btn--primary` per screen.** Secondary `.btn--ghost`, tertiary `.btn--outline`.
- **No hardcoded hex colours.** Brand tokens and CSS vars only.
- **Migrations additive only**, applied with `supabase db query --linked -f <file>`, never `db push` (history is shared with Website-Builder).
- **Server components.** Full content in the initial HTML with JavaScript disabled.
- **No redirects inside the tree.** Archived returns 410, hidden and draft return 404.
- **Commits attributed to the owner.** No `Co-Authored-By` trailer.
- **Verification:** `npm test`, `npm run build`, `npm run lint`.

## File Structure

| File | Responsibility |
|---|---|
| `app/lib/jsonld.ts` (create) | Pure JSON-LD builders. No I/O. |
| `app/lib/jsonld.test.ts` (create) | Shape and required-field tests |
| `app/lib/geo.ts` (modify) | Ancestor-status cascade, published descendants, sitemap reads |
| `app/lib/geo.test.ts` (create) | Cascade rules |
| `app/components/ui/JsonLd.tsx` (create) | Renders a `<script type="application/ld+json">` |
| `app/components/templates/GeoIndex.tsx` (create) | One template for country, province and region |
| `app/components/templates/AreaPage.tsx` (create) | Area template |
| `app/components/templates/ThingsToDoIndex.tsx` (create) | Full category grid |
| `app/components/templates/PlanIndex.tsx` (create) | Planning topics and profile filters |
| `app/destinations/[[...path]]/page.tsx` (modify) | Route the new kinds, drop the noindex workaround |
| `app/sitemap-destinations.xml/route.ts` (create) | Destination sitemap |
| `app/sitemap-travel-guides.xml/route.ts` (create) | Guide sitemap |
| `app/robots.txt/route.ts` (create) | Points at both sitemaps |
| `app/not-found.tsx` (create) | 404 with search and suggestions |
| `app/gone/page.tsx` (create) | 410 body, served via a route handler status |
| `scripts/backfill-destination-categories.mjs` (create) | Populates the applicability join from `city_categories` |

---

### Task 1: Ancestor-status cascade

Spec 3.7. Hiding or archiving a town must make its descendants unreachable for rendering, without mutating their stored status, so re-publishing restores the prior state exactly (AC 13).

**Files:** Create `app/lib/geo.test.ts`; modify `app/lib/geo.ts`.

**Interfaces:**
- Produces: `effectiveStatus(trail: GeoNode[]): GeoStatus`, `isTrailRenderable(trail: GeoNode[]): boolean`

- [ ] **Step 1: Write the failing test**

```ts
// app/lib/geo.test.ts
import { describe, it, expect } from "vitest";
import { effectiveStatus, isTrailRenderable } from "./geo";
import type { GeoNode, GeoStatus } from "./geo-types";

function n(slug: string, status: GeoStatus): GeoNode {
  return {
    id: slug, slug, name: slug, type: "town", parentId: null, status,
    body: [], alsoAppearsIn: [], sortPriority: 0, updatedAt: "2026-07-27T00:00:00Z",
  };
}

describe("effectiveStatus", () => {
  it("is the node's own status when every ancestor is published", () => {
    expect(effectiveStatus([n("canada", "published"), n("tofino", "published")])).toBe("published");
    expect(effectiveStatus([n("canada", "published"), n("tofino", "coming_soon")])).toBe("coming_soon");
  });

  it("takes the most restrictive status in the chain", () => {
    expect(effectiveStatus([n("canada", "hidden"), n("tofino", "published")])).toBe("hidden");
    expect(effectiveStatus([n("canada", "archived"), n("tofino", "published")])).toBe("archived");
    expect(effectiveStatus([n("canada", "published"), n("bc", "draft"), n("tofino", "published")])).toBe("draft");
  });

  it("prefers archived over hidden over draft", () => {
    expect(effectiveStatus([n("a", "hidden"), n("b", "archived")])).toBe("archived");
    expect(effectiveStatus([n("a", "draft"), n("b", "hidden")])).toBe("hidden");
  });

  it("treats an empty trail as published", () => {
    expect(effectiveStatus([])).toBe("published");
  });
});

describe("isTrailRenderable", () => {
  it("renders only when the whole chain is renderable", () => {
    expect(isTrailRenderable([n("canada", "published"), n("tofino", "coming_soon")])).toBe(true);
    expect(isTrailRenderable([n("canada", "hidden"), n("tofino", "published")])).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npm test -- geo.test`. Expected: FAIL, `effectiveStatus` is not exported.

- [ ] **Step 3: Implement in `app/lib/geo.ts`**

```ts
/**
 * Spec 3.7: hiding or archiving an ancestor makes its descendants unreachable
 * for rendering only. Stored status is never mutated, so re-publishing the
 * ancestor restores the prior state exactly.
 */
const STATUS_SEVERITY: Record<GeoStatus, number> = {
  published: 0, coming_soon: 1, draft: 2, hidden: 3, archived: 4,
};

export function effectiveStatus(trail: GeoNode[]): GeoStatus {
  return trail.reduce<GeoStatus>(
    (worst, node) => (STATUS_SEVERITY[node.status] > STATUS_SEVERITY[worst] ? node.status : worst),
    "published",
  );
}

export function isTrailRenderable(trail: GeoNode[]): boolean {
  return isRenderable(effectiveStatus(trail));
}
```

Import `isRenderable` and `GeoStatus` from `./geo-types`.

- [ ] **Step 4: Run tests** Run: `npm test -- geo.test`. Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add app/lib/geo.ts app/lib/geo.test.ts
git commit -m "Add the ancestor-status cascade for the geographic tree"
```

---

### Task 2: JSON-LD builders

**Files:** Create `app/lib/jsonld.ts`, `app/lib/jsonld.test.ts`, `app/components/ui/JsonLd.tsx`.

**Interfaces:**
- Produces: `breadcrumbList(items: {name: string; url?: string}[]): object`, `touristDestination(node, url, description?): object`, `itemList(items: {name: string; url: string}[], name?): object`, `faqPage(faqs: {q: string; a: string}[]): object`, `articleLd(a: {title, url, published?, updated?, author?, image?}): object`, `JsonLd({data})`

- [ ] **Step 1: Write the failing test**

```ts
// app/lib/jsonld.test.ts
import { describe, it, expect } from "vitest";
import { breadcrumbList, touristDestination, itemList, faqPage, articleLd } from "./jsonld";

describe("breadcrumbList", () => {
  it("numbers positions from one and carries urls", () => {
    const ld = breadcrumbList([
      { name: "Destinations", url: "https://arctrips.com/destinations" },
      { name: "Canada", url: "https://arctrips.com/destinations/canada" },
      { name: "Tofino" },
    ]) as any;
    expect(ld["@type"]).toBe("BreadcrumbList");
    expect(ld.itemListElement).toHaveLength(3);
    expect(ld.itemListElement[0].position).toBe(1);
    expect(ld.itemListElement[2].position).toBe(3);
    expect(ld.itemListElement[2].item).toBeUndefined();
    expect(ld.itemListElement[1].item).toBe("https://arctrips.com/destinations/canada");
  });
});

describe("touristDestination", () => {
  it("carries name, url and geo when present", () => {
    const ld = touristDestination(
      { name: "Tofino", lat: 49.15, lng: -125.9 },
      "https://arctrips.com/destinations/canada/bc/tofino",
      "A surf town",
    ) as any;
    expect(ld["@type"]).toBe("TouristDestination");
    expect(ld.name).toBe("Tofino");
    expect(ld.geo).toEqual({ "@type": "GeoCoordinates", latitude: 49.15, longitude: -125.9 });
  });

  it("omits geo when there are no coordinates", () => {
    const ld = touristDestination({ name: "Ucluelet" }, "https://arctrips.com/x") as any;
    expect(ld.geo).toBeUndefined();
  });
});

describe("itemList", () => {
  it("numbers items from one", () => {
    const ld = itemList([{ name: "Surfing", url: "https://a/1" }, { name: "Beaches", url: "https://a/2" }]) as any;
    expect(ld["@type"]).toBe("ItemList");
    expect(ld.itemListElement[1]).toMatchObject({ position: 2, name: "Beaches", url: "https://a/2" });
  });
});

describe("faqPage", () => {
  it("maps each pair to a Question with an acceptedAnswer", () => {
    const ld = faqPage([{ q: "Can you swim?", a: "Yes, in summer." }]) as any;
    expect(ld["@type"]).toBe("FAQPage");
    expect(ld.mainEntity[0]["@type"]).toBe("Question");
    expect(ld.mainEntity[0].acceptedAnswer.text).toBe("Yes, in summer.");
  });

  it("returns null for an empty list so no empty block is emitted", () => {
    expect(faqPage([])).toBeNull();
  });
});

describe("articleLd", () => {
  it("carries both dates and the author", () => {
    const ld = articleLd({
      title: "Storm watching", url: "https://a/s",
      published: "2026-01-02T00:00:00Z", updated: "2026-03-04T00:00:00Z", author: "Arc Trips",
    }) as any;
    expect(ld["@type"]).toBe("Article");
    expect(ld.datePublished).toBe("2026-01-02T00:00:00Z");
    expect(ld.dateModified).toBe("2026-03-04T00:00:00Z");
    expect(ld.author).toEqual({ "@type": "Organization", name: "Arc Trips" });
  });
});
```

- [ ] **Step 2: Run it and confirm it fails** Run: `npm test -- jsonld`.

- [ ] **Step 3: Implement `app/lib/jsonld.ts`**

```ts
/**
 * JSON-LD builders for the SEO contract in
 * docs/superpowers/specs/2026-07-27-destinations-experience-design.md section 6.
 * Pure: every builder takes plain data and returns a plain object, so the
 * shapes are unit-testable without rendering a page.
 */
const CTX = "https://schema.org";

export function breadcrumbList(items: { name: string; url?: string }[]) {
  return {
    "@context": CTX,
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      ...(it.url ? { item: it.url } : {}),
    })),
  };
}

export function touristDestination(
  node: { name: string; lat?: number; lng?: number },
  url: string,
  description?: string,
) {
  return {
    "@context": CTX,
    "@type": "TouristDestination",
    name: node.name,
    url,
    ...(description ? { description } : {}),
    ...(node.lat !== undefined && node.lng !== undefined
      ? { geo: { "@type": "GeoCoordinates", latitude: node.lat, longitude: node.lng } }
      : {}),
  };
}

export function itemList(items: { name: string; url: string }[], name?: string) {
  return {
    "@context": CTX,
    "@type": "ItemList",
    ...(name ? { name } : {}),
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem", position: i + 1, name: it.name, url: it.url,
    })),
  };
}

export function faqPage(faqs: { q: string; a: string }[]) {
  if (!faqs.length) return null;
  return {
    "@context": CTX,
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function articleLd(a: {
  title: string; url: string; published?: string; updated?: string; author?: string; image?: string;
}) {
  return {
    "@context": CTX,
    "@type": "Article",
    headline: a.title,
    url: a.url,
    ...(a.image ? { image: a.image } : {}),
    ...(a.published ? { datePublished: a.published } : {}),
    ...(a.updated ? { dateModified: a.updated } : {}),
    author: { "@type": "Organization", name: a.author ?? "Arc Trips" },
    publisher: { "@type": "Organization", name: "Arc Trips" },
  };
}
```

- [ ] **Step 4: Create the renderer**

```tsx
// app/components/ui/JsonLd.tsx
/** Emits structured data into the server-rendered HTML. */
export function JsonLd({ data }: { data: object | null }) {
  if (!data) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
```

The `<` escape prevents a `</script>` inside content from closing the tag early.

- [ ] **Step 5: Run tests** Expected: PASS, 8 tests.

- [ ] **Step 6: Commit**

```bash
git add app/lib/jsonld.ts app/lib/jsonld.test.ts app/components/ui/JsonLd.tsx
git commit -m "Add JSON-LD builders for the SEO contract"
```

---

### Task 3: Geo index template for country, province and region

Replaces the Plan 1 workaround where these tiers borrowed the landing page under `noindex`.

**Files:** Create `app/components/templates/GeoIndex.tsx`; modify `app/lib/geo.ts` (add `getGeoChildrenWithPaths`).

**Interfaces:**
- Consumes: `getGeoChildren`, `geoPath`, `breadcrumbList`, `itemList`, `touristDestination`
- Produces: `GeoIndex({ node, trail })`

- [ ] **Step 1: Add the child-listing read to `app/lib/geo.ts`**

```ts
export type GeoChildLink = { node: GeoNode; path: string; townCount: number };

/** Children of a node with their canonical paths, for index templates. */
export async function getGeoChildLinks(trail: GeoNode[]): Promise<GeoChildLink[]> {
  const parent = trail[trail.length - 1];
  const children = await getGeoChildren(parent.id);
  return Promise.all(
    children.map(async (node) => {
      const towns = node.type === "town" ? [] : await getGeoChildren(node.id, "town");
      return { node, path: geoPath([...trail, node]), townCount: node.type === "town" ? 1 : towns.length };
    }),
  );
}
```

- [ ] **Step 2: Write the template**

`GeoIndex` renders: TopNav, breadcrumb from the trail, an H1 of the node name, the node's `standfirst` when present, a card grid of children each linking to `child.path` with its town count, and BreadcrumbList plus ItemList JSON-LD. Reuse the existing `.dest-cards` / `.dcard` classes from `DestinationsLanding` so the look matches. A tier with no children renders a short "nothing published here yet" note and the link back to `/destinations`, never an empty grid.

Per AC 51, a country with no published towns anywhere beneath it must not render at all: the route calls `notFound()` before reaching the template.

- [ ] **Step 3: Route it in `app/destinations/[[...path]]/page.tsx`**

Replace the `case "geo"` fallthrough. Town keeps `DestinationHub`; country, province and region render `GeoIndex`; area renders `AreaPage` from Task 4. Delete the `noindex` workaround added in Plan 1, since each tier now has its own content and self-canonicalises.

- [ ] **Step 4: Verify**

```bash
npm run build && (PORT=3111 node node_modules/next/dist/bin/next start &) && sleep 9
for u in /destinations/canada /destinations/canada/bc /destinations/canada/bc/vancouver-island; do
  echo "$u -> $(curl -s -m 20 -o /dev/null -w '%{http_code}' http://localhost:3111$u)"
  curl -s -m 20 http://localhost:3111$u | grep -o 'rel="canonical" href="[^"]*"'
done
```

Expected: 200 each, and each canonical is its own URL, not `/destinations`.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "Give country, province and region their own index template"
```

---

### Task 4: Area pages

**Files:** Create `app/components/templates/AreaPage.tsx`; create `scripts/seed-areas.mjs`.

Areas are the one node type with no rows yet. Long Beach is named in spec section 11 as the Phase 1 shared-area case and is what exercises AC 6.

- [ ] **Step 1: Seed the shared area**

`scripts/seed-areas.mjs` promotes selected `places` rows into `geo_places` as areas, keeping the POI row intact. It is idempotent and seeds at minimum:

```js
const AREAS = [
  { slug: "long-beach", name: "Long Beach", town: "tofino", alsoAppearsIn: ["ucluelet"],
    sourcePlace: { city: "tofino", category: "beaches", slug: "long-beach" } },
  { slug: "chesterman-beach", name: "Chesterman Beach", town: "tofino", alsoAppearsIn: [],
    sourcePlace: { city: "tofino", category: "beaches", slug: "chesterman-beach" } },
  { slug: "wild-pacific-trail", name: "Wild Pacific Trail", town: "ucluelet", alsoAppearsIn: [],
    sourcePlace: { city: "ucluelet", category: "hiking", slug: "wild-pacific-trail" } },
];
```

For each, copy `name`, `blurb` into `standfirst`, `body`, `hero_public_id`, `lat`, `lng` from the source place, resolve `also_appears_in` to the other town's `geo_places.id`, and set `status` to `published`. Add `"seed:areas": "node --env-file=.env.local scripts/seed-areas.mjs"` to `package.json`. Verify the source place slugs exist first with a query; skip and report any that do not.

- [ ] **Step 2: Write the template**

`AreaPage` renders: breadcrumb through `parent_id` **always**, never the referring town; hero; body; a "getting here" block naming the parent town and, when `alsoAppearsIn` is non-empty, the other towns too; nearest stays from the parent town; related guides in the parent town; TouristDestination and BreadcrumbList JSON-LD. Canonical is `geoPath(trail)`, which follows `parent_id`, so the same area reached conceptually from Ucluelet still emits Tofino's breadcrumb (AC 6).

- [ ] **Step 3: Verify**

```bash
npm run seed:areas
curl -s -m 20 -o /dev/null -w '%{http_code}\n' http://localhost:3111/destinations/canada/bc/vancouver-island/tofino/long-beach
curl -s -m 20 http://localhost:3111/destinations/canada/bc/vancouver-island/tofino/long-beach | grep -o '"@type":"BreadcrumbList".*Tofino'
```

Expected: 200, and the breadcrumb names Tofino.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "Add area pages and seed the shared Long Beach area"
```

---

### Task 5: Applicability backfill, things-to-do index and plan index

**Files:** Create `scripts/backfill-destination-categories.mjs`, `app/components/templates/ThingsToDoIndex.tsx`, `app/components/templates/PlanIndex.tsx`.

- [ ] **Step 1: Backfill the applicability join**

`destination_categories` is empty, so the rule "a category page exists if and only if a row exists" is not yet load-bearing. The backfill creates one row per existing `city_categories` row, joined to the town's `geo_places.id`, with `status` set to `active` when the guide has a real body (more than one intro block) and `coming_soon` otherwise, `overview_body` copied from `city_categories.intro`, and `sort_order` from the taxonomy.

Note the check constraint: `active` requires a non-empty `overview_body`, so a guide with an empty intro must be written as `coming_soon` or the insert is rejected. That is the constraint doing its job.

Add `"backfill:categories"` to `package.json`. Run it, then verify the row count matches the 15 `city_categories` rows.

- [ ] **Step 2: Things-to-do index**

Full grid of every category applicable to the town, from `getGuidesForCity`, with the same `CategoryCard` the hub uses and `basePath` set to `${geoPath(trail)}/things-to-do`. Emits ItemList and BreadcrumbList JSON-LD. Exists so the hub can cap its own grid without hiding anything and the whole set is crawlable in one hop.

A town with no categories, which is every Agent Trek city, must **404 rather than render an empty grid** (spec assumption A6, AC 5 and AC 18).

- [ ] **Step 3: Plan index**

Lists planning topics applicable to the town from `getPlanningPieces(citySlug)`, which already returns the cross-cutting articles. Profile filters are query parameters, and any URL carrying one gets `robots: noindex, follow` with canonical to the unfaceted `/plan` (AC 33). Carries the persistent stays module, since a guest planning a trip needs somewhere to sleep. A town with no planning pieces 404s rather than rendering empty.

- [ ] **Step 4: Route both kinds** in `app/destinations/[[...path]]/page.tsx`, replacing the `notFound()` fallthrough for `things-to-do` and `plan`.

- [ ] **Step 5: Verify**

```bash
for u in /destinations/canada/bc/vancouver-island/tofino/things-to-do \
         /destinations/canada/bc/vancouver-island/tofino/plan \
         "/destinations/canada/bc/vancouver-island/tofino/plan?for=families"; do
  echo "$u -> $(curl -s -m 20 -o /dev/null -w '%{http_code}' "http://localhost:3111$u")"
done
```

Expected: 200, 200, 200, with the faceted URL carrying `noindex, follow` and canonical to the plain `/plan`.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "Add the things-to-do and plan indexes and backfill applicability"
```

---

### Task 6: Sitemaps and robots

**Files:** Create `app/sitemap-destinations.xml/route.ts`, `app/sitemap-travel-guides.xml/route.ts`, `app/robots.txt/route.ts`; modify `app/lib/geo.ts`.

- [ ] **Step 1: Add the sitemap reads to `app/lib/geo.ts`**

`getSitemapNodes(): Promise<{url: string; lastmod: string}[]>` walks every renderable `geo_places` row, builds its path, and pairs it with `updated_at`. For each town it also emits `/things-to-do`, `/plan` and one entry per `destination_categories` row using **that row's** `updated_at`, not the town's. Nodes whose trail fails `isTrailRenderable` are excluded, which is how hiding a town removes its descendants from the sitemap (AC 13, AC 34).

- [ ] **Step 2: Write the route handlers**

Each returns `Content-Type: application/xml` and sets `export const revalidate = 60`. Generated from the database on request, never at build time. If a file would exceed 45,000 URLs, split into an indexed set; log a warning below that threshold so the split is not a surprise.

- [ ] **Step 3: robots.txt** points at both sitemaps and disallows nothing.

- [ ] **Step 4: Verify**

```bash
curl -s -m 20 http://localhost:3111/sitemap-destinations.xml | head -20
curl -s -m 20 http://localhost:3111/sitemap-destinations.xml | grep -c "<url>"
curl -s -m 20 http://localhost:3111/robots.txt
```

Expected: valid XML, one `<url>` per renderable node, `lastmod` values that differ between a town and its category (proving per-entity sourcing rather than build time).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "Add database-driven sitemaps with per-entity lastmod"
```

---

### Task 7: Error pages

**Files:** Create `app/not-found.tsx`; modify `app/destinations/[[...path]]/page.tsx` for the 410 path.

- [ ] **Step 1: 404 page**

Renders TopNav, a heading, the global search entry point, and a grid of top destinations resolved through `pathForTownSlug`. Never a dead end (spec section 6). Must return HTTP 404, which `not-found.tsx` does by default.

- [ ] **Step 2: 410 for archived places**

An archived node must return 410, not 404 and not a redirect. In the route, when the resolved node's `effectiveStatus` is `archived`, respond with a 410. Because a page component cannot set an arbitrary status code, this is done by rendering the same body through a route segment that sets it:

```ts
// in the route, before rendering
if (effectiveStatus(resolution.trail) === "archived") {
  const { notFound } = await import("next/navigation");
  // Next has no built-in 410; set it on the response via the gone route.
  redirectToGone();
}
```

Implement `app/gone/route.ts` returning the 410 body with `status: 410`, and have the destination route `rewrite` to it in `middleware.ts` when the path resolves to an archived node. Keep the resolution in middleware cheap: match only on a cached list of archived paths refreshed every 60 seconds.

If that proves heavier than its value, the acceptable fallback is a route handler at the tree root that inspects the path and returns 410 directly, documented in the spec as a deviation. Decide during implementation and record which was chosen.

- [ ] **Step 3: Verify** Archive a test node, confirm 410, then restore it. Confirm an unknown URL returns 404 with a search box present in the HTML.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "Add the 404 and 410 pages so no URL dead-ends"
```

---

### Task 8: Wire JSON-LD into every template and verify

- [ ] **Step 1** Add `JsonLd` to `DestinationHub` (TouristDestination, BreadcrumbList, ItemList of categories), `CategoryGuide` (BreadcrumbList, FAQPage when FAQs exist, ItemList of places), `GuideDetail` (Article, BreadcrumbList), `GeoIndex` and `AreaPage` (done in their tasks), `ThingsToDoIndex` and `PlanIndex` (ItemList).

- [ ] **Step 2: Thin-page gate** A `coming_soon` category whose `overview_body` renders under 250 words gets `robots: noindex, follow` (AC 11). Put the threshold in one exported constant, `THIN_BODY_WORDS`, in `app/lib/geo-types.ts`.

- [ ] **Step 3: Full verification**

```bash
npm test && npm run lint && npm run build
node /tmp/crawl.mjs
```

Then validate the structured data on one page of each type:

```bash
for u in /destinations/canada/bc /destinations/canada/bc/vancouver-island/tofino \
         /destinations/canada/bc/vancouver-island/tofino/things-to-do/surfing; do
  echo "== $u"
  curl -s -m 20 "http://localhost:3111$u" | grep -o '"@type":"[A-Za-z]*"' | sort -u
done
```

Expected: BreadcrumbList everywhere, TouristDestination on destination and area pages, ItemList on grids, FAQPage where FAQs exist, Article on guides. Every block must parse as JSON.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "Emit structured data on every page in the destination tree"
```

---

## Self-Review

**Spec coverage.** Section 5 templates: Tasks 3, 4, 5 (landing, destination hub and category guide already exist from Plan 1). Section 3.7 cascade: Task 1. Section 6 JSON-LD: Tasks 2 and 8. Sitemaps and `lastmod`: Task 6. Thin-page gate: Task 8. Error pages: Task 7. Faceted `noindex`: Task 5.

**Deliberately deferred to Plan 3**, with reasons stated in the scope correction above: the six typed content components, the best-time module, and the comparison template, all of which render data the import produces. Also deferred: `coming_soon` teaser pages for content-less towns (Edmonton, Toronto, Montreal), which currently 404 because `getCity` requires a `standfirst`; they need imported content to say anything.

**Type consistency.** `GeoNode` and `GeoStatus` come from `app/lib/geo-types.ts` throughout. `effectiveStatus` and `isTrailRenderable` (Task 1) are consumed by the sitemap reads (Task 6) and the 410 path (Task 7). `geoPath(trail)` keeps its Plan 1 signature everywhere. The JSON-LD builders take plain data, never `GeoNode`, so they stay pure and testable.

**Known risk.** Task 7's 410 handling is the one place with genuine implementation uncertainty, because Next has no first-class way to return 410 from a page. The task names both an approach and an acceptable fallback, and requires recording which was used.
