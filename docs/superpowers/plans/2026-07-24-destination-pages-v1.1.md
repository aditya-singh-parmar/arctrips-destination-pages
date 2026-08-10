# Destination Pages v1.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the destination pages as a Region to City to Category to Place tree with TripAdvisor-idiom navigation (sticky tab bar plus horizontal rails) and a data-driven CTA engine, shipped end to end for Tofino and Ucluelet.

**Architecture:** Supabase holds the tree; `app/lib/content.ts` reads it with a seed fallback so pages render before tables exist. A pure resolver in `app/lib/cta.ts` derives every booking button from `product_lines` rows, so launching a tour line is a data change. `scripts/ingest-articles.mjs` becomes a decomposer that splits one `.docx` into a category page, N place pages, and place-tagged photos.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4 with hand-written classes in `app/theme.css`, Supabase (`@supabase/ssr`), Cloudinary, vitest (added by Task 1).

## Global Constraints

Copied verbatim from `CLAUDE.md` and the spec. Every task's requirements implicitly include this section.

- **No italics anywhere.** `em, i` are neutralised in `theme.css`. Applies to copy, UI, and rendered comments.
- **No em dashes** in rendered copy, UI text, or commit messages. Use a comma, colon, parentheses, or "to" for ranges.
- **No emoji** in product copy.
- **One `.btn--primary` per screen.** Secondary actions use `.btn--ghost` or `.btn--outline`.
- **No hardcoded hex colours in components.** Use the brand tokens in `app/globals.css` and `app/theme.css`.
- **Commits are attributed to the owner.** No `Co-Authored-By: Claude` trailer, no author override.
- **Cloudinary IDs must be verified before use:** `curl -sI https://res.cloudinary.com/du9doarye/image/upload/<id>` must return 200. Many old `arcstudio/*` IDs are deleted.
- **Node invocation:** scripts call `node node_modules/next/dist/bin/next ...` directly. Do not "fix" this to `npx next`.
- **Ingestion run order:** `npm run seed` first (creates rows), then the ingest (fills bodies). Re-running seed wipes ingested content.
- Fonts: Inter for everything, Satoshi only for the `ARCTRIPS` wordmark.

## Spec reference

`docs/superpowers/specs/2026-07-24-destination-pages-v1.1-design.md`. Read it before starting. Section numbers referenced below point there.

## File structure

**Created**
- `supabase/migrations/0002_tree.sql` — regions, categories, city_categories, places, photos, product_lines, category_products, experiences, notify_signups
- `app/lib/taxonomy.ts` — the 22-category finite list plus themes, single source for seed and UI
- `app/lib/cta.ts` — pure CTA resolver, no I/O
- `app/lib/cta.test.ts` — resolver unit tests
- `scripts/lib/decompose.mjs` — pure docx-block to tree classifier
- `scripts/lib/decompose.test.mjs` — classifier unit tests
- `app/components/nav/Breadcrumb.tsx`, `TabBar.tsx`, `DestinationSearch.tsx`
- `app/components/browse/Rail.tsx`, `ChipRow.tsx`, `PlaceCard.tsx`, `CategoryCard.tsx`, `ThemeGrid.tsx`, `FaqList.tsx`
- `app/components/sell/CtaBlock.tsx`, `SellTile.tsx`, `NotifyForm.tsx`
- `app/[city]/page.tsx`, `app/[city]/[category]/page.tsx`, `app/[city]/[category]/[slug]/page.tsx`
- `app/[city]/things-to-do/page.tsx`, `app/[city]/guides/page.tsx`, `app/[city]/gallery/page.tsx`
- `app/destinations/[region]/page.tsx`

**Modified**
- `app/lib/content.ts` — new types and reads, keep the Supabase-to-seed fallback pattern
- `scripts/seed.mjs` — seed the new tables
- `scripts/ingest-articles.mjs` — becomes the decomposer driver
- `app/theme.css` — tab bar, rails, chips, cards, CTA states
- `package.json` — vitest, `test` script
- `CLAUDE.md` — replace the stale Phase 2 sidebar description

**Deleted after Task 11 lands**
- `app/components/area/SectionNav.tsx`, `ThingsToDo.tsx`, `GuidesGrid.tsx`, `AreaGallery.tsx`, `AreaHero.tsx`
- `app/destinations/[slug]/` route tree, superseded by `app/[city]/`

---

## Phase A — Data foundation

### Task 1: Test runner and schema migration

**Files:**
- Modify: `package.json`
- Create: `supabase/migrations/0002_tree.sql`
- Create: `vitest.config.ts`

**Interfaces:**
- Produces: table names and column names consumed by every later task. Treat this file as the contract.

- [ ] **Step 1: Add vitest**

```bash
npm install -D vitest@^3
```

Add to `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["app/**/*.test.ts", "scripts/**/*.test.mjs"],
    environment: "node",
  },
});
```

- [ ] **Step 3: Verify the runner starts**

Run: `npm test`
Expected: exits 0 with "No test files found" (this is fine, tests arrive in Task 4).

- [ ] **Step 4: Write `supabase/migrations/0002_tree.sql`**

Follow the RLS pattern already in `0001_destinations.sql`: public read of `published = true`, writes via service role only.

```sql
-- Arc Trips — Destination Pages v1.1 tree
-- Region > City > Category > Place, plus the CTA engine tables.
-- Public pages are read-only: RLS allows anon read of published rows.

create table if not exists public.regions (
  slug           text primary key,
  name           text not null,
  hero_public_id text,
  blurb          text,
  sort_order     int not null default 0,
  published      boolean not null default true
);

-- `destinations` (from 0001) is the city table. Add the region link.
alter table public.destinations add column if not exists region_slug text references public.regions(slug) on delete set null;

create table if not exists public.categories (
  slug        text primary key,
  name        text not null,
  theme       text not null,          -- grouping label only, never a route
  sort_order  int not null default 0
);

create table if not exists public.city_categories (
  city_slug      text not null references public.destinations(slug) on delete cascade,
  category_slug  text not null references public.categories(slug) on delete cascade,
  intro          jsonb not null default '[]'::jsonb,   -- ArticleBlock[]
  hero_public_id text,
  sort_order     int not null default 0,
  published      boolean not null default true,
  primary key (city_slug, category_slug)
);

create table if not exists public.places (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null,
  city_slug      text not null references public.destinations(slug) on delete cascade,
  category_slug  text not null references public.categories(slug) on delete cascade,
  name           text not null,
  blurb          text,
  body           jsonb not null default '[]'::jsonb,   -- ArticleBlock[]
  good_for       jsonb not null default '[]'::jsonb,   -- string[]
  good_to_know   text,
  hero_public_id text,
  lat            numeric,
  lng            numeric,
  sort_order     int not null default 0,
  published      boolean not null default true,
  unique (city_slug, category_slug, slug)
);
create index if not exists places_city_cat_idx on public.places (city_slug, category_slug);

-- articles gains multi-city and region attachment
alter table public.articles add column if not exists city_slugs   text[] not null default '{}';
alter table public.articles add column if not exists region_slug  text references public.regions(slug) on delete set null;
alter table public.articles add column if not exists category_slug text references public.categories(slug) on delete set null;
alter table public.articles add column if not exists faqs jsonb not null default '[]'::jsonb;  -- {q,a}[]

create table if not exists public.photos (
  id            uuid primary key default gen_random_uuid(),
  public_id     text not null,
  city_slug     text references public.destinations(slug) on delete cascade,
  category_slug text references public.categories(slug) on delete set null,
  place_slug    text,                                  -- matches places.slug within the city+category
  caption       text,
  source_url    text,
  sort_order    int not null default 0,
  published     boolean not null default true
);
create index if not exists photos_city_cat_idx on public.photos (city_slug, category_slug);

create table if not exists public.product_lines (
  slug         text primary key,
  name         text not null,
  brand        text not null default 'arctrips',      -- arctrips | arctrips-fishing
  status       text not null default 'coming_soon',   -- live | coming_soon
  external_url text,
  blurb        text,
  sort_order   int not null default 0
);

create table if not exists public.category_products (
  category_slug     text not null references public.categories(slug) on delete cascade,
  product_line_slug text not null references public.product_lines(slug) on delete cascade,
  priority          int not null default 0,
  primary key (category_slug, product_line_slug)
);

create table if not exists public.experiences (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  product_line_slug text not null references public.product_lines(slug) on delete cascade,
  city_slug         text references public.destinations(slug) on delete cascade,
  category_slug     text references public.categories(slug) on delete set null,
  place_slug        text,
  title             text not null,
  duration          text,
  price_from        numeric,
  currency          text not null default 'CAD',
  hero_public_id    text,
  book_url          text,
  sort_order        int not null default 0,
  published         boolean not null default true
);
create index if not exists experiences_city_cat_idx on public.experiences (city_slug, category_slug);

create table if not exists public.notify_signups (
  id                uuid primary key default gen_random_uuid(),
  email             text not null,
  product_line_slug text references public.product_lines(slug) on delete set null,
  city_slug         text,
  created_at        timestamptz not null default now()
);

alter table public.regions           enable row level security;
alter table public.categories        enable row level security;
alter table public.city_categories   enable row level security;
alter table public.places            enable row level security;
alter table public.photos            enable row level security;
alter table public.product_lines     enable row level security;
alter table public.category_products enable row level security;
alter table public.experiences       enable row level security;
alter table public.notify_signups    enable row level security;

create policy "regions public read"           on public.regions           for select using (published = true);
create policy "categories public read"        on public.categories        for select using (true);
create policy "city_categories public read"   on public.city_categories   for select using (published = true);
create policy "places public read"            on public.places            for select using (published = true);
create policy "photos public read"            on public.photos            for select using (published = true);
create policy "product_lines public read"     on public.product_lines     for select using (true);
create policy "category_products public read" on public.category_products for select using (true);
create policy "experiences public read"       on public.experiences       for select using (published = true);
-- notify_signups: no public select policy. Inserts happen via a server action using the service role.
```

- [ ] **Step 5: Commit**

```bash
git add package.json vitest.config.ts supabase/migrations/0002_tree.sql package-lock.json
git commit -m "Add v1.1 tree schema and vitest runner"
```

---

### Task 2: Taxonomy and product lines as code

**Files:**
- Create: `app/lib/taxonomy.ts`

**Interfaces:**
- Produces: `CATEGORIES`, `THEMES`, `PRODUCT_LINES`, `CATEGORY_PRODUCTS`, `type Category`, `type ProductLine`, `type ProductStatus`. Consumed by Task 3 (seed), Task 4 (resolver), and every UI task.

- [ ] **Step 1: Write `app/lib/taxonomy.ts`**

The 22 categories are fixed by spec section 8. `theme` is a grouping label and never a route.

```ts
export type ThemeSlug =
  | "on-the-water" | "wildlife-nature" | "on-land"
  | "food-drink" | "culture-landmarks" | "plan-your-trip";

export const THEMES: { slug: ThemeSlug; name: string }[] = [
  { slug: "on-the-water",     name: "On the water" },
  { slug: "wildlife-nature",  name: "Wildlife & nature" },
  { slug: "on-land",          name: "On land" },
  { slug: "food-drink",       name: "Food & drink" },
  { slug: "culture-landmarks", name: "Culture & landmarks" },
  { slug: "plan-your-trip",   name: "Plan your trip" },
];

export type Category = { slug: string; name: string; theme: ThemeSlug; sortOrder: number };

export const CATEGORIES: Category[] = [
  { slug: "beaches",             name: "Beaches",                 theme: "on-the-water",     sortOrder: 10 },
  { slug: "surfing",             name: "Surfing",                 theme: "on-the-water",     sortOrder: 20 },
  { slug: "kayaking",            name: "Kayaking & paddling",     theme: "on-the-water",     sortOrder: 30 },
  { slug: "fishing",             name: "Fishing",                 theme: "on-the-water",     sortOrder: 40 },
  { slug: "boating",             name: "Boating & sailing",       theme: "on-the-water",     sortOrder: 50 },
  { slug: "hot-springs",         name: "Hot springs",             theme: "on-the-water",     sortOrder: 60 },
  { slug: "whale-watching",      name: "Whale watching",          theme: "wildlife-nature",  sortOrder: 70 },
  { slug: "birding",             name: "Birding & wildlife",      theme: "wildlife-nature",  sortOrder: 80 },
  { slug: "storm-watching",      name: "Storm watching",          theme: "wildlife-nature",  sortOrder: 90 },
  { slug: "parks",               name: "Parks & rainforest",      theme: "wildlife-nature",  sortOrder: 100 },
  { slug: "hiking",              name: "Hiking & trails",         theme: "on-land",          sortOrder: 110 },
  { slug: "mountain-biking",     name: "Mountain biking",         theme: "on-land",          sortOrder: 120 },
  { slug: "skiing",              name: "Skiing & snowboarding",   theme: "on-land",          sortOrder: 130 },
  { slug: "camping",             name: "Camping",                 theme: "on-land",          sortOrder: 140 },
  { slug: "restaurants",         name: "Restaurants",             theme: "food-drink",       sortOrder: 150 },
  { slug: "markets",             name: "Markets & local food",    theme: "food-drink",       sortOrder: 160 },
  { slug: "breweries",           name: "Breweries & tasting",     theme: "food-drink",       sortOrder: 170 },
  { slug: "landmarks",           name: "Landmarks & scenic spots", theme: "culture-landmarks", sortOrder: 180 },
  { slug: "arts-history",        name: "Arts, history & museums", theme: "culture-landmarks", sortOrder: 190 },
  { slug: "events",              name: "Events & festivals",      theme: "culture-landmarks", sortOrder: 200 },
  { slug: "when-to-go",          name: "When to go",              theme: "plan-your-trip",   sortOrder: 210 },
  { slug: "getting-around",      name: "Getting around",          theme: "plan-your-trip",   sortOrder: 220 },
];

export type ProductStatus = "live" | "coming_soon";
export type ProductLine = {
  slug: string; name: string; brand: "arctrips" | "arctrips-fishing";
  status: ProductStatus; externalUrl?: string; blurb: string;
};

export const PRODUCT_LINES: ProductLine[] = [
  { slug: "stays", name: "Stays", brand: "arctrips", status: "live",
    blurb: "Cabins, cottages and lodges booked on Arc Trips." },
  { slug: "fishing-charters", name: "Fishing charters", brand: "arctrips-fishing", status: "live",
    externalUrl: "https://arctripsfishing.com",
    blurb: "Salmon and halibut charters, run and booked on our fishing site." },
  { slug: "whale-watching-tours", name: "Whale watching tours", brand: "arctrips", status: "coming_soon",
    blurb: "Grey whale and humpback trips, coming to Arc Trips." },
  { slug: "kayaking-tours", name: "Kayaking tours", brand: "arctrips", status: "coming_soon",
    blurb: "Guided paddles, coming to Arc Trips." },
  { slug: "hot-springs-tours", name: "Hot springs tours", brand: "arctrips", status: "coming_soon",
    blurb: "Boat access hot springs trips, coming to Arc Trips." },
];

/** category slug to product line slugs, highest priority first. Stays is implicit everywhere. */
export const CATEGORY_PRODUCTS: Record<string, string[]> = {
  fishing:         ["fishing-charters"],
  boating:         ["fishing-charters"],
  "whale-watching": ["whale-watching-tours"],
  birding:         ["whale-watching-tours"],
  kayaking:        ["kayaking-tours"],
  "hot-springs":   ["hot-springs-tours"],
};

export const CATEGORY_BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));

/** Spec section 8: chips at 10 or fewer, theme grids above that. */
export const THEME_GRID_THRESHOLD = 10;
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/lib/taxonomy.ts
git commit -m "Add finite category taxonomy and product line definitions"
```

---

### Task 3: Data layer reads

**Files:**
- Modify: `app/lib/content.ts`

**Interfaces:**
- Consumes: `CATEGORIES`, `PRODUCT_LINES`, `CATEGORY_PRODUCTS` from Task 2.
- Produces:
  - `type Region`, `type City`, `type CityCategory`, `type Place`, `type Photo`, `type Experience`
  - `getRegions(): Promise<Region[]>`
  - `getCity(slug): Promise<City | null>`
  - `getCityCategories(citySlug): Promise<CityCategory[]>`
  - `getCityCategory(citySlug, categorySlug): Promise<CityCategory | null>`
  - `getPlaces(citySlug, categorySlug?): Promise<Place[]>`
  - `getPlace(citySlug, categorySlug, slug): Promise<Place | null>`
  - `getPhotos(citySlug, opts?: { categorySlug?: string; placeSlug?: string }): Promise<Photo[]>`
  - `getExperiences(citySlug, opts?: { categorySlug?: string; placeSlug?: string }): Promise<Experience[]>`
  - `getArticlesForCity(citySlug, categorySlug?): Promise<Article[]>`

- [ ] **Step 1: Add the types and reads, keeping the existing fallback pattern**

Every read follows the shape already used by `getDestinations` in this file: try Supabase, fall through to a `SEED_*` constant when the client is absent or the query returns empty. Do not throw when Supabase is unconfigured, the app must render without it.

`getArticlesForCity` must match on the `city_slugs` array, not `destination_slug`, because three v1.1 articles span two towns:

```ts
const { data } = await s.from("articles").select("*").contains("city_slugs", [citySlug]);
```

Seed constants to add alongside the existing ones: `SEED_REGIONS` (Vancouver Island), `SEED_CITY_CATEGORIES` (Tofino 9, Ucluelet 6, per spec section 8), `SEED_PLACES` (the 13 Tofino beaches from `Tofino - Beaches.docx`, at minimum Long Beach, Cox Bay, Chesterman, Tonquin, Tinwis with real blurbs), `SEED_EXPERIENCES` (placeholder rows, spec section 9 says inventory is not real yet).

- [ ] **Step 2: Typecheck and build**

Run: `npx tsc --noEmit && npm run build`
Expected: both clean. The existing `/destinations/[slug]` route still builds at this point.

- [ ] **Step 3: Commit**

```bash
git add app/lib/content.ts
git commit -m "Add region, city-category, place, photo and experience reads"
```

---

## Phase B — CTA engine

### Task 4: CTA resolver

**Files:**
- Create: `app/lib/cta.ts`
- Create: `app/lib/cta.test.ts`

**Interfaces:**
- Consumes: `PRODUCT_LINES`, `CATEGORY_PRODUCTS` from Task 2; `Experience` from Task 3.
- Produces: `resolveCta(input: CtaInput): CtaResult`, `type CtaInput`, `type CtaResult`, `type CtaKind`.

This is the whole sales mechanic and it is pure, so it gets real tests. Spec section 5 is the contract.

- [ ] **Step 1: Write the failing tests in `app/lib/cta.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { resolveCta } from "./cta";

const stayExp = { slug: "cabin", productLineSlug: "stays", title: "Riverside Cabin", priceFrom: 320 } as never;
const charter = { slug: "salmon", productLineSlug: "fishing-charters", title: "Half day salmon", priceFrom: 189 } as never;

describe("resolveCta", () => {
  it("uses the category's live product line as primary", () => {
    const r = resolveCta({ citySlug: "tofino", cityName: "Tofino", categorySlug: "fishing", experiences: [charter, stayExp] });
    expect(r.primary.kind).toBe("sister-brand");
    expect(r.primary.productLineSlug).toBe("fishing-charters");
    expect(r.primary.label).toBe("Book a charter on ArcTrips Fishing");
    expect(r.primary.external).toBe(true);
  });

  it("promotes stays to primary and shows capture when the line is coming soon", () => {
    const r = resolveCta({ citySlug: "tofino", cityName: "Tofino", categorySlug: "whale-watching", experiences: [stayExp] });
    expect(r.primary.kind).toBe("stays");
    expect(r.primary.productLineSlug).toBe("stays");
    expect(r.notify?.productLineSlug).toBe("whale-watching-tours");
    expect(r.notify?.label).toBe("Notify me when tours open");
  });

  it("falls back to stays for a category with no product line at all", () => {
    const r = resolveCta({ citySlug: "tofino", cityName: "Tofino", categorySlug: "beaches", experiences: [stayExp] });
    expect(r.primary.kind).toBe("stays");
    expect(r.notify).toBeUndefined();
  });

  it("never returns a dead end: no experiences still yields a stays primary", () => {
    const r = resolveCta({ citySlug: "tofino", cityName: "Tofino", categorySlug: "beaches", experiences: [] });
    expect(r.primary).toBeDefined();
    expect(r.primary.kind).toBe("stays");
  });

  it("returns exactly one primary", () => {
    const r = resolveCta({ citySlug: "tofino", cityName: "Tofino", categorySlug: "whale-watching", experiences: [stayExp] });
    const primaries = [r.primary, r.notify].filter((c) => c && "isPrimary" in c && c.isPrimary);
    expect(primaries).toHaveLength(1);
  });

  it("scopes the stays label to the category when it is a fallback", () => {
    const r = resolveCta({ citySlug: "tofino", cityName: "Tofino", categorySlug: "whale-watching", experiences: [stayExp] });
    expect(r.primary.label).toBe("Book a stay for whale watching season");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL, "Failed to resolve import ./cta".

- [ ] **Step 3: Implement `app/lib/cta.ts`**

Rules, in order, from spec section 5:
1. Look up `CATEGORY_PRODUCTS[categorySlug]`. Take the first entry whose `PRODUCT_LINES` status is `live`. That becomes the primary. `kind` is `sister-brand` when `brand !== "arctrips"`, otherwise `tours`.
2. If the mapped line exists but is `coming_soon`, emit a `notify` block for it (never primary, amber treatment) and promote `stays` to primary with a category-scoped label.
3. If no line is mapped, primary is `stays` with the plain label.
4. `stays` is always available, so `primary` is never undefined.

Labels: sister brand reads `Book a charter on ArcTrips Fishing`; plain stays reads `Book dates`; category-scoped stays reads `Book a stay for {category name lowercased} season`; notify reads `Notify me when tours open`.

Attach the matching experiences to each block by filtering on `productLineSlug` so the caller does not re-filter.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add app/lib/cta.ts app/lib/cta.test.ts
git commit -m "Add CTA resolver: live, sister-brand and coming-soon states with stays fallback"
```

---

## Phase C — Ingestion

### Task 5: Docx decomposer classifier

**Files:**
- Create: `scripts/lib/decompose.mjs`
- Create: `scripts/lib/decompose.test.mjs`

**Interfaces:**
- Produces: `classify(blocks, opts) -> { intro, places, faqs, images }`, `slugify(text) -> string`.
- `blocks` is the ordered array the existing `scripts/ingest-articles.mjs` already extracts: `{ style: "Heading1"|"Heading2"|"Heading3"|"Body", text, imageRef? }`.

The rules are subtle and getting them wrong silently produces junk pages, so this is tested. Verified against `Tofino - Beaches.docx`: 13 real beaches under two listing H2s, then 12 FAQ questions under an H3-per-question FAQ H2.

- [ ] **Step 1: Write the failing tests in `scripts/lib/decompose.test.mjs`**

```js
import { describe, it, expect } from "vitest";
import { classify, slugify } from "./decompose.mjs";

const blocks = [
  { style: "Heading1", text: "Best Beaches in Tofino" },
  { style: "Body", text: "Tofino is famous for its beaches." },
  { style: "Heading2", text: "Best Time to Visit Tofino Beaches" },
  { style: "Body", text: "Summer is the warmest and busiest time." },
  { style: "Heading2", text: "Best Beaches in and Around Tofino" },
  { style: "Heading3", text: "Chesterman Beach" },
  { style: "Body", text: "https://www.istockphoto.com/photo/x-gm1", imageRef: "image1.jpg" },
  { style: "Body", text: "Chesterman Beach is one of the most loved beaches in Tofino." },
  { style: "Body", text: "Chesterman Beach is a good place for:" },
  { style: "Body", text: "Long beach walks" },
  { style: "Body", text: "Beginner surf lessons" },
  { style: "Body", text: "Good to know: Always check the tide before walking toward Frank Island." },
  { style: "Heading3", text: "Cox Bay" },
  { style: "Body", text: "Cox Bay is one of the best beaches in Tofino for surfing." },
  { style: "Heading2", text: "Frequently Asked Questions" },
  { style: "Heading3", text: "What is the nicest beach in Tofino?" },
  { style: "Body", text: "Chesterman Beach is the most loved." },
];

const opts = { placeHeadings: ["Best Beaches in and Around Tofino"] };

describe("classify", () => {
  it("promotes H3 under a listing H2 to a place", () => {
    const r = classify(blocks, opts);
    expect(r.places.map((p) => p.name)).toEqual(["Chesterman Beach", "Cox Bay"]);
  });

  it("does not promote FAQ questions to places", () => {
    const r = classify(blocks, opts);
    expect(r.places.find((p) => p.name.startsWith("What is"))).toBeUndefined();
  });

  it("captures FAQ questions and answers separately", () => {
    const r = classify(blocks, opts);
    expect(r.faqs).toEqual([{ q: "What is the nicest beach in Tofino?", a: "Chesterman Beach is the most loved." }]);
  });

  it("puts H1 and non-listing H2 content into the category intro", () => {
    const r = classify(blocks, opts);
    const text = r.intro.map((b) => b.text).join(" ");
    expect(text).toContain("Tofino is famous for its beaches.");
    expect(text).toContain("Summer is the warmest");
    expect(text).not.toContain("Chesterman Beach is one of the most loved");
  });

  it("extracts the good-for bullet list", () => {
    const r = classify(blocks, opts);
    expect(r.places[0].goodFor).toEqual(["Long beach walks", "Beginner surf lessons"]);
  });

  it("extracts the good-to-know note without its label", () => {
    const r = classify(blocks, opts);
    expect(r.places[0].goodToKnow).toBe("Always check the tide before walking toward Frank Island.");
  });

  it("tags images with the place they sit under, and keeps the source url", () => {
    const r = classify(blocks, opts);
    expect(r.images).toEqual([
      { ref: "image1.jpg", placeSlug: "chesterman-beach", sourceUrl: "https://www.istockphoto.com/photo/x-gm1" },
    ]);
  });

  it("drops istock url paragraphs from body copy", () => {
    const r = classify(blocks, opts);
    const body = r.places[0].body.map((b) => b.text).join(" ");
    expect(body).not.toContain("istockphoto");
  });
});

describe("slugify", () => {
  it("handles the renamed-beach case", () => {
    expect(slugify("Tinwis Beach, formerly Mackenzie Beach")).toBe("tinwis-beach-formerly-mackenzie-beach");
  });
  it("strips punctuation and lowercases", () => {
    expect(slugify("St. John's Bay")).toBe("st-johns-bay");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL, cannot resolve `./decompose.mjs`.

- [ ] **Step 3: Implement `scripts/lib/decompose.mjs`**

Key rules:
- `opts.placeHeadings` is an explicit per-doc whitelist of H2 texts whose H3 children become places. Any H2 not in the list contributes to `intro`. This is what keeps the FAQ out.
- An H2 whose text matches `/frequently asked questions/i` switches to FAQ mode: each H3 is a question, the Body blocks until the next H3 are its answer.
- A Body paragraph ending in `:` immediately followed by short Body lines is the `goodFor` bullet list. Terminate the list at the first paragraph longer than 60 characters or at a `Good to know:` line.
- A Body paragraph starting `Good to know:` becomes `goodToKnow` with the label stripped.
- Body text matching `/istockphoto\.com/` is not copy: it is the source URL for the image block adjacent to it. Exclude it from body, attach it as `sourceUrl`.
- `slugify`: lowercase, strip apostrophes entirely, replace any run of non-alphanumerics with a single hyphen, trim hyphens.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS, 10 tests across both files plus the 6 from Task 4.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/decompose.mjs scripts/lib/decompose.test.mjs
git commit -m "Add docx decomposer: places, FAQs, good-for lists and place-tagged images"
```

---

### Task 6: Ingest driver and seed

**Files:**
- Modify: `scripts/ingest-articles.mjs`
- Modify: `scripts/seed.mjs`

**Interfaces:**
- Consumes: `classify`, `slugify` from Task 5; `CATEGORIES`, `PRODUCT_LINES`, `CATEGORY_PRODUCTS` from Task 2.

- [ ] **Step 1: Extend `scripts/seed.mjs`**

Seed `regions`, `categories`, `product_lines`, `category_products` from `app/lib/taxonomy.ts`, plus `city_categories` rows for Tofino (9 categories) and Ucluelet (6), and placeholder `experiences`. Keep the existing delete-then-insert pattern so the script stays re-runnable. Set `destinations.region_slug = 'vancouver-island'` for both cities.

- [ ] **Step 2: Rewrite the ingest driver**

Replace the flat article mapping with a per-doc config carrying `citySlug`, `categorySlug`, and the `placeHeadings` whitelist:

```js
const DOC_MAP = [
  { file: "Tofino - Beaches.docx", citySlug: "tofino", categorySlug: "beaches",
    placeHeadings: ["Best Beaches in and Around Tofino", "Beaches Near Tofino in Pacific Rim National Park"] },
  // ... the other 9 category docs
];
const ARTICLE_MAP = [
  { file: "Pacific Rim Whale Festival Guide.docx", citySlugs: ["tofino", "ucluelet"], categorySlug: "events" },
  { file: "Best Time to Stay in Ucluelet or Tofino_ Weather, Prices, and What to See.docx",
    citySlugs: ["tofino", "ucluelet"], categorySlug: "when-to-go" },
  { file: "Tofino & Ucluelet - Campgrounds.docx", citySlugs: ["tofino", "ucluelet"], categorySlug: "camping" },
  // ...
];
```

For each `DOC_MAP` entry: unzip, extract ordered blocks (the existing code already does this), run `classify`, upload each image to Cloudinary at `guides/<city>/<category>/<placeSlug>-<n>`, then upsert `city_categories.intro`, the `places` rows, the `photos` rows, and `articles.faqs`.

- [ ] **Step 3: Run it against the real corpus**

```bash
npm run seed
node --env-file=.env.local scripts/ingest-articles.mjs
```

Expected: reports 10 category docs processed and roughly 60 places created. Tofino beaches must yield 13 places and zero places whose name ends in a question mark. If any FAQ question appears as a place, the `placeHeadings` whitelist for that doc is wrong.

- [ ] **Step 4: Spot check**

```bash
node --env-file=.env.local -e "
import('@supabase/supabase-js').then(async ({createClient}) => {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data } = await s.from('places').select('slug,name').eq('city_slug','tofino').eq('category_slug','beaches');
  console.log(data.length, data.map(d => d.slug).join(', '));
});"
```

Expected: 13 rows including `long-beach`, `cox-bay`, `chesterman-beach`.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed.mjs scripts/ingest-articles.mjs
git commit -m "Decompose corpus docs into category intros, places, photos and FAQs"
```

---

## Phase D — UI

### Task 7: Theme classes

**Files:**
- Modify: `app/theme.css`

**Interfaces:**
- Produces the class names every component task uses. Follow the existing BEM-ish convention already in the file (`.card__body`, `.nav__link`).

- [ ] **Step 1: Add the v1.1 block**

New blocks, appended below the existing area styles: `.crumb` / `.crumb__sep`, `.tabbar` / `.tabbar__link` / `.tabbar__link--on` / `.tabbar__dot` / `.tabbar__book`, `.rail` / `.rail__track` / `.rail__arrow`, `.chiprow` / `.chip` / `.chip--on`, `.pcard` (place and category card, media, title, meta, price, state badge), `.themegrid` / `.themegrid__card`, `.faq` / `.faq__q` / `.faq__a`, `.cta` / `.cta--live` / `.cta--sister` / `.cta--soon` / `.cta__badge` / `.cta__offer`, `.selltile`, `.dockbar`.

Rules: sticky tab bar is `position: sticky; top: 0; z-index: 20` with a translucent background. Rails use `overflow-x: auto; scroll-snap-type: x mandatory` with hidden scrollbars and `scroll-snap-align: start` on children. All colours come from existing CSS vars, none hardcoded. Mobile breakpoint at 900px collapses the tab bar to a horizontally scrolling row and pins `.dockbar` to the viewport bottom.

Match the visual reference: `.superpowers/brainstorm/8272-1784880858/content/rails-v4.html`.

- [ ] **Step 2: Verify no hardcoded hex**

Run: `grep -nE '#[0-9a-fA-F]{3,8}' app/theme.css | grep -v '^\s*--'`
Expected: no matches inside the new block. Existing older matches may remain.

- [ ] **Step 3: Commit**

```bash
git add app/theme.css
git commit -m "Add tab bar, rail, chip, card and CTA-state styles"
```

---

### Task 8: Navigation and browse components

**Files:**
- Create: `app/components/nav/Breadcrumb.tsx`, `app/components/nav/TabBar.tsx`, `app/components/nav/DestinationSearch.tsx`
- Create: `app/components/browse/Rail.tsx`, `ChipRow.tsx`, `PlaceCard.tsx`, `CategoryCard.tsx`, `ThemeGrid.tsx`, `FaqList.tsx`
- Create: `app/components/sell/CtaBlock.tsx`, `SellTile.tsx`, `NotifyForm.tsx`

**Interfaces:**
- Consumes: `CtaResult` from Task 4, `Place` / `Experience` / `CityCategory` from Task 3.
- Produces:
  - `<Breadcrumb trail={{ href?: string; label: string }[]} />` — renders a plain non-interactive trail, only the last item unlinked. **No dropdowns.** Spec section 6 and decision log.
  - `<TabBar city={City} categories={CityCategory[]} active={string} cta={CtaResult} />` — composition rule from spec section 6: Overview, Things to do, Where to stay, then every category mapped to a non-Stays product line, then Guides, Photos. Cap 8, overflow scrolls. Amber dot when that category's line is `coming_soon`. Book button right-aligned inside the bar.
  - `<Rail title, href?, subtitle?, children />` — horizontal scroller with a "See all" link and a right arrow control.
  - `<ChipRow items={{label, href, active?}[]} />`
  - `<PlaceCard place={Place} experienceCount={number} priceFrom?={number} />` — shows "N to book" badge when count > 0, "Free to visit" when 0. Never a disabled button.
  - `<CategoryCard category, placeCount, state: "live"|"sister"|"soon", priceFrom? />`
  - `<CtaBlock cta={CtaResult} />` — renders exactly one `.btn--primary`. The notify capture is always secondary.
  - `<NotifyForm productLineSlug, citySlug />` — client component posting to a server action that inserts into `notify_signups` using the service-role client.

Everything except `NotifyForm` and `Rail` is a server component. Do not add `"use client"` to the rest.

- [ ] **Step 1: Build the components**

- [ ] **Step 2: Typecheck and build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add app/components/nav app/components/browse app/components/sell
git commit -m "Add tab bar, breadcrumb, rail, card and CTA components"
```

---

### Task 9: City page

**Files:**
- Create: `app/[city]/page.tsx`, `app/[city]/layout.tsx`

**Interfaces:**
- Consumes: everything from Tasks 3, 4, 8.

`layout.tsx` renders `TopNav`, `Breadcrumb`, `TabBar` and `Footer` so every page under `/[city]` shares them and the tab bar keeps its position. `page.tsx` renders, in order: hero with photo count and stays/trips summary, intro, "Essential {City}" chip row, Things to do rail, Where to stay rail, sell tile, Guides rail, "{City} is great for" theme grids (only above `THEME_GRID_THRESHOLD`), FAQ list.

`generateStaticParams` returns the cities that have a `city_categories` row, so links never 404. `generateMetadata` uses the city standfirst.

- [ ] **Step 1: Build it**
- [ ] **Step 2:** Run `npm run build`, then `npm run dev` and load `http://localhost:3000/tofino`. Expected: tab bar sticks on scroll, rails scroll horizontally, exactly one primary button on the page.
- [ ] **Step 3: Commit**

```bash
git add app/\[city\]
git commit -m "Add city page with sticky tab bar and browse rails"
```

---

### Task 10: Category index and category page

**Files:**
- Create: `app/[city]/things-to-do/page.tsx`, `app/[city]/guides/page.tsx`, `app/[city]/gallery/page.tsx`
- Create: `app/[city]/[category]/page.tsx`

The three index pages are the same component with different framing and counts (things to do shows bookable counts, guides shows article counts, gallery shows photo counts). Do not write three copies: extract a shared `CategoryIndex` and pass a `mode` prop.

The category page renders the category chip row, title, intro from `city_categories.intro`, a facet chip row, the place card grid, the CTA block, and the guides in that category.

**Route conflict warning:** `things-to-do`, `guides` and `gallery` are literal segments that would otherwise be captured by `[category]`. Next.js resolves static segments before dynamic ones, so this works, but add a guard in `[category]/page.tsx` that calls `notFound()` for those three slugs so a stray link cannot render an empty category.

- [ ] **Step 1: Build them**
- [ ] **Step 2:** Build, then load `/tofino/things-to-do` and `/tofino/beaches`. Expected: 9 categories listed, 13 beach cards.
- [ ] **Step 3: Commit**

```bash
git commit -am "Add category index and category pages"
```

---

### Task 11: Place and article pages, and the slug resolver

**Files:**
- Create: `app/[city]/[category]/[slug]/page.tsx`
- Delete: `app/components/area/*`, `app/destinations/[slug]/`

**Interfaces:**
- Consumes: `getPlace`, `getArticle`, `getPhotos`, `getExperiences`, `resolveCta`.

Places and articles share one URL namespace (spec section 3). The resolver checks `getPlace` first, then falls back to the article read, then `notFound()`.

These are reading pages, so per spec section 6 they get a desktop-only "On this page" contents rail and sibling cards at the foot, not a persistent sidebar. Hide the rail below 900px.

Place page order: hero, title, standfirst, body, good-for chips, good-to-know note, CTA block ("Trips that run on {place}"), place-tagged photo grid, sibling place cards.

- [ ] **Step 1: Build the resolver page**
- [ ] **Step 2: Delete the superseded route and components.** Confirm nothing still imports them: `grep -rn "components/area" app/`
- [ ] **Step 3:** Build, then load `/tofino/beaches/long-beach`. Expected: real copy from the docx, four place-tagged photos, one primary button.
- [ ] **Step 4: Commit**

```bash
git add -A app/
git commit -m "Add place and article pages, retire the sidebar area route"
```

---

### Task 12: Region pages and destinations index

**Files:**
- Modify: `app/destinations/page.tsx`
- Create: `app/destinations/[region]/page.tsx`

The region page holds the cross-city corpus content ("Best Beaches on Vancouver Island") and a city grid. `/destinations` lists regions rather than cities.

- [ ] **Step 1: Build them**
- [ ] **Step 2:** Build, load `/destinations` and `/destinations/vancouver-island`.
- [ ] **Step 3: Commit**

```bash
git commit -am "Add region pages and region-first destinations index"
```

---

### Task 13: Documentation and final verification

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Replace the stale Phase 2 description.** The "Design theme" section still describes destination pages as having "a sticky section jump-menu (sidebar on desktop, horizontal bar on mobile, scrollspy)". That design was built and rejected. Replace with the tab-bar-and-rails model and point at the spec. Update the "Content source of truth" section: ingestion is now a decomposer, and describe the new run order consequences.

- [ ] **Step 2: Full verification**

```bash
npm test && npx tsc --noEmit && npm run lint && npm run build
```

Expected: 16 tests pass, no type errors, no lint errors, build succeeds.

- [ ] **Step 3: Check the hard rules across the diff**

```bash
git diff main --stat
grep -rnE '—' app/ --include=*.tsx --include=*.css   # expect no matches
grep -rn "<em>\|<i>" app/ --include=*.tsx            # expect no matches
```

- [ ] **Step 4: Commit and push**

```bash
git add CLAUDE.md
git commit -m "Update CLAUDE.md for the v1.1 tab-bar navigation and decomposer ingest"
git push origin HEAD
```

---

## Self-review

**Spec coverage.** Section 2 tree: Tasks 1, 3. Section 3 URL map: Tasks 9 to 12, collision handled in Task 11. Section 4 data model: Task 1. Section 5 CTA engine: Tasks 2, 4, 8. Section 6 UI: Tasks 7 to 12; the tab-bar composition rule is in Task 8, the reading-page rail in Task 11. Section 7 decomposer: Tasks 5, 6, including the FAQ whitelist. Section 8 taxonomy and the 10-category render threshold: Tasks 2, 9. Section 9 out-of-scope items are absent, correctly. Section 10 decisions are reflected: no sidebar (Task 8), non-interactive breadcrumb (Task 8), routable places (Task 11), routable regions (Task 12).

**Gap found and closed.** The spec's `notify_signups` table had no write path in the first draft of this plan. Task 8 now specifies the server action, and Task 1 notes the deliberate absence of a public select policy.

**Type consistency.** `CtaResult` is produced in Task 4 and consumed in Task 8 under the same name. `Place`, `Experience`, `CityCategory` are defined in Task 3 and used unchanged afterwards. `classify` and `slugify` are defined in Task 5 and called in Task 6.

**Known risk.** Task 6 depends on the `placeHeadings` whitelist being right per document. It is verified for `Tofino - Beaches.docx` only. The other nine docs need their listing H2s read before the map is filled in, which is the first real work of that task rather than a guess.
