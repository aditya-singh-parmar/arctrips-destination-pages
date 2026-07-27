# Destinations Experience, design spec

**Date:** 2026-07-27
**Status:** Approved for planning
**Source:** PRD, Destinations Experience (draft v2, 27 Jul 2026), parts 1 and 2
**Supersedes:** `2026-07-24-destination-pages-v1.1-design.md` on URL structure and navigation depth. Retains its category taxonomy, CTA engine and no-sidebar / no-dropdown-breadcrumb rulings.

---

## 1. What this document decides

The PRD spans more than this repository contains. This spec records which parts are being built here, the five scoping decisions the owner made on 27 Jul, and the architecture that follows from them.

### 1.1 Decisions taken

| # | Decision | Consequence |
|---|---|---|
| D1 | **Deep URL hierarchy wins** over the flat S1 structure shipped 24 Jul | Every destination URL changes. Resolves OQ-1 and OQ-13 for build purposes. |
| D2 | **Build everything technically possible** in this repo | Adds local search, notify-me capture and analytics stubs to the tree, templates and SEO contract. |
| D3 | **Publish all 24 destinations** from the corpus | Country and province nodes for 8 provinces. Import volume rises from 2 towns to 24. |
| D4 | **Auto-derive, then gate** on import | Machine-fixable defects are repaired at import; only unfixable ones block publish. |
| D5 | **Agent Trek docs import whole**, no decomposition | 13 cities get a hub page with auto-TOC, and no category grid, place pages or things-to-do index. |
| D6 | **Additive `geo_places` tree** alongside existing tables | Honours the additive-only constraint on the shared Supabase instance. |

### 1.2 Out of scope

These acceptance criteria need systems that do not exist in this repository and are not being stubbed into it. They are listed so the gap is explicit rather than discovered late.

| PRD area | Acceptance criteria | Missing system |
|---|---|---|
| Permissions, authoring, optimistic locking, import gates as CMS validation | 39 to 43 partially, 42 fully | A CMS with authentication and roles (OQ-2 unanswered) |
| Notify-me delivery, confirmation, bounce handling, unsubscribe | 24, 25, 54 | Transactional email and CASL infrastructure (OQ-11 blocks) |
| Live inventory, availability, from-price, host pause and admin suspend | 15 to 21, 44 to 46 | Feeds from the booking platform |
| Cross-platform search over stays, charters, species, regulations, reports | 26 partially, 29 | A shared search index (OQ-4 unanswered) |
| Read-count ranking, destination-assisted booking attribution | Section 10.2 measures | An events pipeline with session stitching |

What **is** built: routing and taxonomy, the geographic and category model, all page templates, the full section 9 SEO contract, corpus import with gates, local search, notify-me capture, and analytics event emission to a no-op sink.

---

## 2. URL structure and routing

### 2.1 Route shapes

```
/destinations
/destinations/{country}
/destinations/{country}/{province}
/destinations/{country}/{province}/{region}
/destinations/{country}/{province}/[{region}/]{town}
/destinations/{country}/{province}/[{region}/]{town}/{area}
/destinations/{country}/{province}/[{region}/]{town}/things-to-do
/destinations/{country}/{province}/[{region}/]{town}/things-to-do/{category}
/destinations/{country}/{province}/[{region}/]{town}/plan
/destinations/compare/{slug-a}-vs-{slug-b}

/travel-guides/{country}/{province}/{guide-slug}
/travel-guides/{country}/{province}/{region}/{guide-slug}
/travel-guides/{country}/{province}/[{region}/]{town}
/travel-guides/{country}/{province}/[{region}/]{town}/{guide-slug}

/search
```

### 2.2 The resolver

Region is optional, so a town sits at segment 3 or 4 and every deeper segment shifts with it. Position-based routing cannot express this. Both trees therefore use a single optional catch-all route with a shared resolver:

- `app/destinations/[[...path]]/page.tsx`
- `app/travel-guides/[[...path]]/page.tsx`

The resolver walks segments left to right, looking each slug up **scoped to the parent resolved so far**, and branching on the resolved node's `type`. This is the PRD section 5.1 rule generalised from segment 4 to the whole path. One lookup per segment, deterministic, no ambiguity.

```
resolve(segments):
  node = root
  for each segment:
    if segment in RESERVED_DESTINATION_SLUGS and node.type == "town":
      return terminal(segment, remaining)     # things-to-do | plan
    child = lookup(slug=segment, parent=node)
    if child is null: return notFound()
    node = child
  return page_for(node.type)
```

The reserved-slug test runs **before** the area lookup, so an area can never shadow `things-to-do` or `plan`.

`RESERVED_DESTINATION_SLUGS = ["things-to-do", "plan", "compare"]`, enforced in three places: the resolver, a database check constraint on `geo_places.slug`, and the import pipeline.

### 2.3 Travel-guides disambiguation

`/travel-guides/canada/bc/X` is ambiguous between a region index and a province-scoped guide. Resolved by lookup, in this order:

1. If `X` is a `geo_places` row of type `region` under `bc`, render the region guide index.
2. Otherwise if `X` is a published content item scoped to `bc`, render the guide.
3. Otherwise 404.

A check constraint prevents a guide slug colliding with a region slug under the same province, so the order can never mask a real collision.

### 2.4 Trailing slashes

The taxonomy PRD forbids trailing slashes on canonical URLs and forbids redirects. Next.js resolves this by default with a 308, which breaches the second rule. Instead:

- `skipTrailingSlashRedirect: true` in `next.config.ts`
- `middleware.ts` **rewrites** a trailing-slash request to the canonical path

The response is a 200 at the canonical path with no redirect hop. Canonical tags and every internal link are emitted without the slash.

### 2.5 Legacy redirects, an explicit assumption

`next.config.ts` currently carries seven `permanent: true` redirects covering URLs shipped before this tree existed. Section 4.2 of the PRD forbids redirects.

**Decision:** these seven are retained. They cover live inbound links that predate the tree, and returning 410 for them would discard real traffic for no SEO benefit. No new redirect is ever emitted for a URL inside this tree; archived places return 410 as specified.

This is a deliberate reading of the no-redirect rule as forward-looking rather than retroactive, and it must be confirmed alongside OQ-1.

The flat S1 URLs (`/tofino`, `/tofino/beaches`) are additionally redirected to their new deep equivalents, one time, for the same reason.

### 2.6 Slug generation

Slugs are lowercase ASCII, hyphen-separated, transliterated from the display name. The display name retains correct orthography everywhere it renders.

```
name  "ʔapsčiik t̓ašii"    slug  "apsciik-tasii"
name  "Yuułuʔiłʔatḥ"       slug  "yuulu-ilath"
```

Transliteration is a pure function, unit-tested, applied at import and at authoring. Editors may override a generated slug. Editors may never override a display name to an ASCII approximation. Uniqueness is `(parent_id, slug)`, enforced by a database constraint so two concurrent creates cannot both succeed (AC 43).

---

## 3. Data model

Migration `supabase/migrations/0003_geo_tree.sql`. **Additive only.** The Supabase instance is shared with the sibling Website-Builder project, so nothing is dropped, renamed or altered in place. Existing columns gain no new NOT NULL constraints.

### 3.1 Naming, and why there are two geography tables

The PRD's `place` and this repository's existing `places` mean different things:

- **`places`** (existing, 127 rows): a point of interest inside a category guide. Long Beach at `(city=tofino, category=beaches, slug=long-beach)`.
- **PRD `place`**: a geographic node. Country, province, region, town, area.

The new table is therefore named **`geo_places`**, and the existing `places` table keeps its meaning unchanged. The cost is two tables that both describe geography, with `destinations` becoming a detail table hanging off `town` nodes. That cost is accepted in exchange for not mutating a shared database.

### 3.2 `geo_places`

| Column | Notes |
|---|---|
| `id` uuid pk | |
| `slug` text | ASCII, per 2.6. Check constraint excludes reserved slugs. |
| `name` text | Correct orthography |
| `type` text | `country` `province` `region` `town` `area` |
| `parent_id` uuid | Self-reference. Path is derived, never stored. |
| `status` text | `draft` `coming_soon` `published` `hidden` `archived` |
| `intro`, `body` jsonb | ArticleBlock[] |
| `hero_public_id`, `gallery` jsonb | Cloudinary refs, alt text required |
| `lat`, `lng` numeric, `bounds` jsonb | |
| `timezone`, `currency`, `unit_system` text | Set at country, inherited by descendants |
| `also_appears_in` uuid[] | Areas only |
| `seo_title`, `seo_description`, `og_image` | Overridable, auto-generated defaults |
| `sort_priority` int | |
| `updated_at` timestamptz | Drives sitemap lastmod for destination and area pages |

Constraints: `unique (parent_id, slug)`; check that `type` is legal for `parent.type`; check `slug not in (reserved)`; check `also_appears_in` is empty unless `type = 'area'`.

### 3.3 `destination_categories`

| Column | Notes |
|---|---|
| `geo_place_id` uuid, `category_slug` text | Composite pk |
| `status` text | `active` `coming_soon` `hidden` |
| `overview_body` jsonb | The page. Check constraint blocks `active` with an empty body (AC 10). |
| `best_months` int[] | 1 to 12. Drives the season module and seasonal ordering. |
| `hero_public_id`, `gallery` jsonb | |
| `sort_order` int | Per-destination override of the global order |
| `seo_title`, `seo_description` | |
| `updated_at` timestamptz | Drives sitemap lastmod for category pages |

**A category page exists if and only if this row exists with status `active` or `coming_soon`.** No row means no page, no nav entry, no sitemap entry, 404. This single mechanism satisfies AC 5, AC 9 and AC 12.

`category_slug` references the existing `categories` table, which already holds the finite 22-category taxonomy from `app/lib/taxonomy.ts`.

### 3.4 Planning

- **`planning_topics`**: slug, name, sort_order, status. Seeded with the twelve topics in PRD 5.3.
- **`traveller_profiles`**: slug, name, sort_order. Seeded with the nine profiles.
- **`geo_place_topics`**: joins a topic to a town, mirroring `destination_categories`.

A guide carries one topic and any number of profiles. `/plan` browses by topic and filters by profile via query parameters.

### 3.5 Content items

The existing `articles` table is extended rather than replaced. It already carries `city_slugs[]`, `region_slug`, `category_slug` and `faqs`.

Added columns: `type` (`article` `guide` `itinerary` `fishing_report` `comparison` `event` `roundup`), `section_tag`, `geo_place_id`, `topic_id`, `profile_ids[]`, `published_at`, `status` (`draft` `pending_review` `scheduled` `published` `unpublished`).

The URL is **derived** from type, section tag, geo place and slug. It is never stored and never hand-entered.

Status drives the HTTP response directly:

| Status | Response | Sitemap | Search index |
|---|---|---|---|
| `draft`, `pending_review` | 404 | No | No |
| `scheduled` | 404 until `published_at` passes, evaluated in the place's timezone | No | No |
| `published` | 200 | Yes | Yes |
| `unpublished` | 410 | No | No |

### 3.6 Capture and search support

- **`notify_requests`**: email, geo_place_id, category_slug, `consent_timestamp`, `consent_source_url`, `consent_text_version`, status, `bounce_count`, timestamps. Unique on `(email, geo_place_id, category_slug)` so a duplicate submission updates rather than inserts (AC 23). No public select policy; inserts via a server action on the service role.
- **`search_synonyms`**: term, maps_to, editor-maintained, not code (AC 30).
- **`search_zero_results`**: query, count, last_seen. This log is the content roadmap.

### 3.7 Cascade and lifecycle

Hiding or archiving a town makes its `destination_categories` rows and area children unreachable **for rendering purposes only**, without mutating their stored status, so re-publishing restores the prior state exactly (AC 13). This is implemented as an ancestor-status check in the read layer, not a write cascade.

Invalid transitions (`archived` to `published`, `draft` to `published` without required fields) are rejected with a named error.

---

## 4. Import pipeline

`scripts/ingest-articles.mjs` and `scripts/lib/decompose.mjs` gain a gate layer. Gates run at import; every run writes `docs/import-audit.md`.

### 4.1 Auto-derived

| Defect | Count | Repair |
|---|---|---|
| Missing meta description | 33 docs | Derive from the lead paragraph, truncated at 155 characters on a word boundary |
| Blank headings used as image spacers | 735 | Stripped. A heading with no text is not a heading. |
| iStock source URLs pasted into body | 1,805 | Extracted to `photos.source_url`, removed from body |
| Files with no H2 at all | 5 docs | Promote the top H3 group to H2 where the shape allows, otherwise block |

### 4.2 Hard blocks

| Defect | Count | Reason |
|---|---|---|
| Unresolved editorial notes | 6 | Pattern: parenthetical starting with add, todo, tbd, check, fix. Ships editor scratch into production copy. |
| Duplicated tables between hub and category article | 2 confirmed | A component instance belongs to exactly one page. The hub links to it. |
| Image with no alt text | scan | AC 39 |

### 4.3 Warnings

Missing FAQ (38 docs, a FAQPage schema opportunity), full sentences styled as headings (about 21), and cost tables with no "as at" date.

### 4.4 Archetype routing

| Archetype | Docs | Handling |
|---|---|---|
| Category guide | 30 | Decomposed as today: category intro plus N places plus place-tagged photos plus FAQs |
| Destination hub | 12 | Imported to `geo_places.body` for the town, after section-grammar normalisation |
| Agent Trek | 13 | **Imported whole** to `geo_places.body`, per D5. Auto-TOC from H2 and H3. No decomposition, no place rows. |
| Regional roundup | 11 | Content item scoped to a region node |
| Comparison | 1 | `/destinations/compare/squamish-vs-whistler` |
| Event | 1 | Content item of type `event`, scoped to both towns |
| Seasonal, species | 5 | Content items |

`placeHeadings` remains an explicit per-doc whitelist. It is never guessed. Each new doc's real H2 list is read before mapping.

### 4.5 Area promotion

Selected `places` rows are promoted into `geo_places` as areas while keeping their POI row serving the category guide. Phase 1 promotes at minimum Long Beach, parented to Tofino with `also_appears_in = [ucluelet]`, because it is the shared-area case named in PRD section 11 and exercised by AC 6.

### 4.6 Run order

`npm run seed` creates rows and wipes ingested content, so ingest always follows it:

```
npm run seed
node --env-file=.env.local scripts/ingest-articles.mjs
```

---

## 5. Page templates

Ten templates. Layout follows the existing marketplace design system in `app/theme.css`. Every module is **suppressed when empty**, never rendered as an empty grid. This is what makes the 13 Agent Trek cities render correctly: a hub body with auto-TOC, no category grid, and no things-to-do index.

| Template | Route | Key modules |
|---|---|---|
| Landing | `/destinations` | Editorial hero, search, country to province to town hierarchy, destination cards, map, category entry points, latest guides |
| Country | `/destinations/{c}` | Provinces, featured towns. Not rendered at all if it has no published towns (AC 51). |
| Province | `/destinations/{c}/{p}` | Regions and towns |
| Region | `/destinations/{c}/{p}/{r}` | Towns in region, regional roundup guides |
| Destination hub | `.../{town}` | Hero, why go, key facts, category grid, plan entry points, stays and charters, areas, map, nearby, recent articles |
| Area | `.../{town}/{area}` | Hero, editorial, categories here, getting here, practical notes, nearest inventory, related articles, map |
| Category | `.../things-to-do/{category}` | Per section 5.1 below |
| Things-to-do index | `.../things-to-do` | Full category grid, seasonal and bookable filters |
| Plan index | `.../plan` | Topics, profile filters, guide cards, itineraries, persistent stays module, advisory slot |
| Guide detail | `/travel-guides/...` | Title, hero, author, dates, TOC, body, tags, related, back-links, topic-matched commerce |

### 5.1 Category page structure

Adopts the editor's template from PRD section 16.1, not the first-principles version in section 6.4, because it is what will actually be imported and it is the stronger template.

1. H1, `{Activity} in {Town}: {three specifics}`
2. Meta description as a typed field, not a body paragraph
3. Hero image with source and licence
4. Why `{Town}` is good for `{activity}`
5. Best time, season matrix component
6. Best places, spot index component, cross-linked to area pages
7. Skill or difficulty tiers where the activity has them
8. Operators, rentals and costs, cost table component
9. What to wear and bring
10. Safety
11. `{Town}` versus the neighbouring town
12. FAQ component
13. Final thoughts
14. Commerce module

### 5.2 Typed content components

The corpus contains 57 tables typed into Word because there was nowhere else to put them. Six become first-class components with typed fields, because each drives filtering, a rendered module, or structured data.

| Component | Fields | Occurrences | Powers |
|---|---|---|---|
| Spot index | Name, Location, Best For, Difficulty or Skill Level, Best Tide, Distance, Time | 18 | Where-to-do-it module, area cross-links, difficulty filter |
| Season matrix | Season, Months, Best For, Wildlife, Good to Know | 5 | Best-time module, `best_months`, seasonal ordering |
| Trip-style index | Trip Style or Rider Type, Best X | 5 | `traveller_profiles` filtering |
| Wildlife index | Bird or Group, Where to Look, Best Clue, Best Season | 5 | Species pages, wildlife modules |
| Comparison matrix | Category, Option A, Option B | 2 | Comparison pages |
| Cost table | Expense Type, Estimated Cost CAD, Notes | 1 | Price expectation, carries an "as at" date |

FAQ and itinerary are typed the same way, from heading conventions rather than tables.

### 5.3 Best-time module

Rendered from `best_months` as structured markup, not prose. It must be legible without colour and announced correctly by a screen reader (AC 49). Implementation is a twelve-cell table with visible text state per month plus `aria-label`, never colour alone.

### 5.4 Commerce modules

Driven by the existing CTA engine in `app/lib/cta.ts`, which already derives buttons from `product_lines` rows and maps cleanly onto the PRD's `commerce_section` concept. It is extended, not replaced.

| Condition | Module |
|---|---|
| Product line live and inventory exists in town | Inventory cards plus primary CTA to the section town page |
| Product line live, no inventory yet | Notify-me, plus a stays cross-sell below it |
| No product line | Stays cross-sell plus nearest bookable activity in town |

No configuration renders an empty product grid (AC 18). Every from-price carries a "before taxes and fees" qualifier (AC 19). A listing with zero visible reviews renders no rating element (AC 20).

The one-primary-CTA-per-screen rule is preserved: the tab bar carries it on desktop, `DockBar` on mobile, mutually exclusive by breakpoint. `CtaBlock` stays `.btn--outline`.

### 5.5 Navigation

The rulings from the v1.1 spec stand and are not revisited:

- **No sidebar.** Built, reviewed against TripAdvisor's Tofino page, rejected as hard to navigate.
- **Breadcrumb is a plain non-interactive trail.** Dropdown segments were built and rejected because the control moved horizontally with URL depth.
- Destination switching belongs in the top-nav search.

The breadcrumb now renders full geographic depth, following `parent_id` always, never the referring town. A shared area reached from its non-canonical parent still emits its canonical breadcrumb (AC 6).

---

## 6. SEO contract

| Requirement | Applies to |
|---|---|
| Visible breadcrumb plus BreadcrumbList JSON-LD following `parent_id` | Every page |
| Self-referencing canonical, no trailing slash | Every indexable page |
| Unique title and meta description, templated defaults, overridable | Every page |
| `index,follow` | `published` and `coming_soon` destination, area, category, plan and guide pages |
| `noindex,follow` plus canonical to parent | Faceted URLs, thin coming-soon category pages |
| TouristDestination JSON-LD | Destination and area pages |
| ItemList JSON-LD | Category grids, article lists, destination index |
| FAQPage JSON-LD | Category pages with an FAQ block |
| Article JSON-LD with author and both dates | Guides and blog posts |
| Reciprocal internal links | Destination to category to section town page to article, all directions |

**Thin-page gate.** A `coming_soon` category page whose `overview_body` renders under **250 words** gets `noindex,follow` (AC 11). A teaser with no substance is a soft 404 and costs crawl budget. The threshold lives in one exported constant so it can be tuned without hunting through templates.

**Sitemaps.** `sitemap-destinations.xml` and `sitemap-travel-guides.xml`, generated from the database on request with a 60 second revalidation window, never at build time. `lastmod` is sourced per entity: `geo_places.updated_at` for destination and area pages, `destination_categories.updated_at` for category pages, `articles.updated_at` for content. A file exceeding 45,000 URLs splits into an indexed set.

PRD 8.7 specifies event-driven, debounced regeneration. Request-time generation with a 60 second window is the equivalent here and is strictly stronger: it cannot miss a trigger, because there are no triggers to wire. AC 35 is satisfied by construction, since every status transition is visible to the next request. This also satisfies the 60 second publish-visibility requirement in PRD 10.1 with one mechanism instead of two.

**Error pages.** 404 and 410 both render a search box, the nearest matching destination and top destinations. Neither returns 200. Soft 404s are the specific failure this prevents.

**Rendering.** Server components throughout. Full content in the initial HTML response with JavaScript disabled (AC 37). This is a hard requirement, not a performance preference.

### 6.1 Intent separation

Category pages and section town pages must not compete:

- Both self-canonical. Neither canonicals to the other.
- Titles differ in intent. Category: `Whale Watching in Tofino, BC, Best Time, Where to Go | ArcTrips`. Section town: `Whale Watching Tours in Tofino, BC | ArcTrips`.
- Reciprocal links, one each way, above the fold.

---

## 7. Search

Postgres full-text search over local content only: `geo_places`, `destination_categories`, `articles` and `places`. Stays, charters, species and regulations are out of scope until a shared index exists (OQ-4).

- **Index**: a materialised `search_documents` view with a `tsvector` column, refreshed on write. Entity type, title, body excerpt, geo scope, url.
- **Typeahead** from two characters, grouped, capped per group, with a "See all results for X" footer.
- **Results page** at `/search?q=`, tabs by group, location and activity facets.
- **Scoped search**: inside a destination the box defaults to that destination, shown as a removable chip with one-click escape (AC 28).
- **Ranking**: exact and prefix match on name, entity-type priority (places outrank articles for short queries), content recency, seasonal relevance from `best_months`.
- **Zero results**: nearest destination, popular destinations, suggested categories, and a write to `search_zero_results` (AC 27).
- **Synonyms** from the `search_synonyms` table, editor-maintained. "Ukee" to Ucluelet, "Tofinno" to Tofino, "whale watch" to whale-watching.
- **Suppression**: unpublished, hidden and archived entities are evicted on revalidation.
- Keyboard operable end to end, with screen-reader announced result counts (AC 31).
- Query, facets and scroll position survive back-navigation (AC 32).

This replaces the non-functional top-nav search control, so AR-461 and AR-479 close against it.

---

## 8. Notify-me and analytics

**Notify-me** captures to `notify_requests` with full CASL consent fields: express consent, checkbox unticked by default, versioned consent wording stored with timestamp and source URL (AC 22). Duplicate submissions are idempotent (AC 23). **Nothing is sent.** The delivery, confirmation, bounce and unsubscribe behaviours in PRD 5.5 stay blocked on OQ-11.

**Analytics** emit the section 10.2 event names with `place_id`, `category_id` and `surface`, through a single `track()` function writing to a no-op sink. When a pipeline exists, one function body changes.

---

## 9. Testing

The existing convention holds: Vitest covers pure logic only; pages are verified with `npm run build` and by loading them.

New unit tests:

| Module | Covers |
|---|---|
| `app/lib/resolver.ts` | Segment resolution across all path shapes, optional region, reserved slugs, travel-guides disambiguation |
| `app/lib/slug.ts` | Transliteration, including the Nuu-chah-nulth cases |
| `app/lib/seasonal.ts` | Seasonal ordering. Storm watching above whale watching in December, below in April (AC 48). |
| `scripts/lib/gates.mjs` | Gate classification: auto-derive, block, warn |
| `app/lib/cta.ts` | Existing tests extended for the three commerce conditions |

---

## 10. Implementation phasing

Three sequential plans. Each ends with a green `npm run build` and a working site.

**Plan 1, model and routing.** Migration 0003, the resolver, middleware, slug transliteration, read layer, legacy redirects. Existing templates render at new URLs. Tofino and Ucluelet stay live throughout.

**Plan 2, templates and SEO.** Ten templates, six typed components, the season module, commerce modules, JSON-LD, sitemaps, 404 and 410.

**Plan 3, import and search.** Gate layer, audit report, full 24-destination ingest, area promotion, search index and UI, notify-me capture, analytics stubs.

---

## 11. Assumptions carried forward

Each needs owner confirmation. None blocks starting Plan 1.

| # | Assumption |
|---|---|
| A1 | The seven pre-existing redirects in `next.config.ts` are retained, and the flat S1 URLs gain one-time redirects to their deep equivalents. The no-redirect rule is read as forward-looking. Rides with OQ-1. |
| A2 | Region and country nodes are authored as data during import, not seeded by hand, so AC 14 holds. |
| A3 | Image licensing (OQ-15) is unresolved. Import extracts `source_url` and licence into the photo record so the question can be answered later without re-import. It does not gate publish. |
| A4 | The Indigenous content gate (OQ-12) has no named owner. Indigenous Experiences categories and any area covering Tla-o-qui-aht, Ahousaht or Yuułuʔiłʔatḥ territory import to `coming_soon`, not `active`, until review is recorded. |
| A5 | Destination-hub section grammar (PRD 17.1 step 4) is not yet agreed. Import normalises to the category taxonomy where an H2 maps, and preserves the original H2 otherwise, flagged in the audit. |
| A6 | The 13 Agent Trek cities have no `destination_categories` rows, so their category grid and things-to-do index are suppressed and the index route 404s, consistent with AC 5 and AC 18. |

---

## 12. Rules that are not negotiable

Carried from the project design system, applying to all copy, UI and rendered content:

1. No italics anywhere. `em, i` are neutralised in `theme.css`.
2. No em dashes in rendered copy, UI text, commit messages or replies.
3. No emoji in product copy.
4. One primary CTA per screen.
5. No hardcoded hex colours. Brand tokens only.
6. Migrations are additive. The Supabase instance is shared.
