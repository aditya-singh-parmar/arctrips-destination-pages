# Destination Pages v1.1 — design

Date: 2026-07-24
Status: approved in brainstorm, ready for implementation planning
Mockups: `.superpowers/brainstorm/8272-1784880858/content/rails-v4.html` (approved), plus `decomposition.html`, `beaches-chain.html`, `cta-crumbs-v2.html` (superseded stages)

## 1. Goal

Turn the destination pages into a browsable, sales-driven tree where every informational page carries a booking path. One finite category taxonomy drives things-to-do, guides, and gallery, so a subject has exactly one home. Navigation follows the TripAdvisor destination-page idiom (sticky tab bar plus horizontal rails), not a documentation sidebar.

Scope for v1.1: Tofino and Ucluelet, built end to end. The remaining 23 cities in the corpus become a data and ingestion job afterwards, with no new components.

## 2. Information architecture

```
Region            Vancouver Island
  City            Tofino
    Category      Beaches            (one finite set, shared across the site)
      Place       Long Beach
      Article     Best time to stay in Tofino
```

The Category is the canonical node. Things to do, Guides, and Gallery are three entry points that filter the same categories, not three parallel content branches. This is what prevents `/things-to-do/fishing` and `/guides/fishing` both existing.

Every article inherits its category, so a fishing article automatically knows to sell fishing charters. The sales mechanic falls out of the tree rather than being wired per page.

## 3. URL map

| Path | Page |
|---|---|
| `/destinations` | all regions |
| `/destinations/vancouver-island` | region page, holds cross-city content |
| `/tofino` | city page |
| `/tofino/things-to-do` | category index |
| `/tofino/guides` | category index, article framing |
| `/tofino/gallery` | category index, photo framing |
| `/tofino/beaches` | category page |
| `/tofino/beaches/long-beach` | place page |
| `/tofino/beaches/best-time-to-stay` | article page |

Cities sit at the root so their URLs stay short. Regions are routable because the corpus has genuine region-level content ("Best Beaches on Vancouver Island", "Top 20 Ski Mountains in BC").

**Slug collision.** Places and articles share the `/[city]/[category]/[slug]` namespace. Enforce a uniqueness constraint across both tables on `(city_slug, category_slug, slug)`. The route resolver checks places first, then articles. Keeps URLs clean and makes collisions a database error rather than a silent 404.

## 4. Data model

New tables. Existing `destinations`, `listings`, `reviews`, `articles` are extended rather than replaced.

```
regions          slug, name, hero_public_id, blurb, sort_order
cities           slug, name, region_slug, hero_public_id, standfirst, overview[], published
                 (this is today's `destinations` table, plus region_slug)

categories       slug, name, theme, icon, sort_order
                 finite global list, see section 8. theme is a grouping label, not a route.

city_categories  city_slug, category_slug, intro[], sort_order, published
                 the per-city category page body. A category exists for a city only if it has a row here.

places           slug, city_slug, category_slug, name, blurb, body[], hero_public_id,
                 good_for[], good_to_know, lat, lng, sort_order, published

articles         + city_slugs[]  (many-to-many: "Tofino & Ucluelet - Campgrounds" spans two)
                 + region_slug   (for region-level articles)
                 + category_slug

photos           public_id, city_slug, category_slug, place_slug, caption, source_url, sort_order
                 place_slug is populated by the ingest, which is what makes the gallery say "Long Beach"

product_lines    slug, name, brand, status, external_url, blurb
                 status: live | coming_soon.  brand: arctrips | arctrips-fishing

category_products category_slug, product_line_slug, priority

experiences      slug, product_line_slug, city_slug, category_slug, place_slug,
                 title, duration, price_from, currency, hero_public_id, book_url, published

notify_signups   email, product_line_slug, city_slug, created_at
```

`articles.city_slugs` being an array is deliberate: three of the five true Tofino/Ucluelet articles span both towns.

## 5. The CTA engine

The button on any page is derived from data, never hardcoded. Launching whale watching tours is a status change on one `product_lines` row.

| Product line | Brand | Status | Categories | Button |
|---|---|---|---|---|
| Stays | ArcTrips | live | all, universal fallback | Book dates |
| Fishing charters | ArcTrips Fishing | live | Fishing | Book a charter on ArcTrips Fishing |
| Whale watching tours | ArcTrips | coming soon | Whale watching, Birding & wildlife | Notify me when tours open |
| Kayaking tours | ArcTrips | coming soon | Kayaking & paddling | Notify me when tours open |
| Hot springs tours | ArcTrips | coming soon | Hot springs | Notify me when tours open |

**Resolution ladder** for any page with a category:

1. Highest-priority `live` product line mapped to that category. Render as the primary CTA.
2. If none is live, render the `coming_soon` capture form as a secondary surface, and promote Stays to the primary CTA, scoped to the category where possible ("Book a stay for whale season").
3. Stays is always available, so no page can dead-end.

**Rules.**
- Exactly one `.btn--primary` per page, per the brand hard rules. The coming-soon capture uses the amber secondary treatment, never primary.
- Sister-brand CTAs are visually distinct, carry the ArcTrips Fishing wordmark, and state the hand-off.
- Coming-soon impressions convert to either an email or a stay. Never a dead link.
- A place with no experiences shows "Free to visit" rather than a disabled button, so the prices elsewhere stay credible.

## 6. UI system

Approved pattern, from `rails-v4.html`.

**Global**
- Top nav: wordmark, destination search field, Stays / Experiences / Guides / Sign in.
- Breadcrumb: plain non-interactive trail, full depth (Canada › British Columbia › Vancouver Island › Clayoquot Sound › Tofino). No dropdowns.
- **Sticky tab bar** directly under the breadcrumb. Seven or eight items, same position on every page in the city: Overview, Things to do, Where to stay, Food & drink, Fishing, Whale watching, Guides, Photos. Sticks to the top of the viewport on scroll. Tabs whose product line is not live carry a small amber dot.
- **The Book button lives in the tab bar**, right-aligned. This is how the CTA stays permanently on screen without a third column or a floating dock.
- Destination switching happens through the top-nav search, not the breadcrumb. The control must not move position with URL depth.

**City page**, in order: hero with photo count and a stays/trips summary, intro paragraph, "Essential {City}" intent chips, Things to do rail, Where to stay rail, a product-line sell tile, Guides rail, "{City} is great for" theme grids, FAQ accordion.

**Category page**: category chips replacing the sidebar, title, intro, facet chips ("Best for surfing", "Family friendly", "Walk from town"), a card grid of places with per-place booking state, "Show all N".

**Place and article pages**: these are reading pages. They get a sticky "On this page" contents rail on desktop only, and sibling cards at the foot of the content rather than a persistent sidebar. This is the one place a rail earns its keep, and it disappears entirely on mobile.

**Mobile**: tab bar scrolls horizontally and sticks. Rails scroll sideways. Nothing hidden behind a hamburger. Book bar docked to the bottom of the viewport.

**Deliberate omission**: TripAdvisor's density comes largely from ratings and review counts. Arc Trips does not have review volume yet, so cards carry bookable counts and prices instead.

## 7. Ingestion: the decomposer

The corpus docs are already shaped like the tree. `Tofino - Beaches.docx` is not an article about beaches, it is the Beaches category page: H1 is the category, H2s are its sections, and each H3 under the beach-listing H2s is a place with its own copy, "good for" list, "Good to know" note, and two to three embedded images.

`scripts/ingest-articles.mjs` becomes a decomposer:

- H1 plus intro plus non-listing H2s → `city_categories.intro`
- H3 under a listing H2 → one `places` row (name, body, good_for from the bullet list, good_to_know from the "Good to know:" paragraph)
- images under an H3 → `photos` rows tagged with that `place_slug`, `source_url` from the adjacent iStock link
- H3 under the "Frequently Asked Questions" H2 → FAQ entries, **not** places. The decomposer must whitelist which H2s yield places.
- docs that are not category-shaped (Whale Festival, Best Time to Stay, Campgrounds, Whale Tails, How to Choose a Vacation Rental) stay whole as `articles`

Each decomposed doc needs a human review pass before publish. The H3-to-place split is reliable but the H2 whitelist is per-doc.

Run order stays: `npm run seed` creates rows, then the ingest fills bodies. Re-running seed wipes ingested content, so re-ingest after.

## 8. Category taxonomy

One finite global list. `theme` groups them in the UI and is never a route, so there are no thin theme pages. A city renders category chips directly when it has few categories, and theme grids when content is spread thin across many. This is how the same taxonomy serves both Tofino and Vancouver, and why the top grid and the chips are guaranteed to agree.

| Theme | Categories |
|---|---|
| On the water | Beaches, Surfing, Kayaking & paddling, Fishing, Boating & sailing, Hot springs |
| Wildlife & nature | Whale watching, Birding & wildlife, Storm watching, Parks & rainforest |
| On land | Hiking & trails, Mountain biking, Skiing & snowboarding, Camping |
| Food & drink | Restaurants, Markets & local food, Breweries & tasting |
| Culture & landmarks | Landmarks & scenic spots, Arts history & museums, Events & festivals |
| Plan your trip | When to go, Getting around |

v1.1 coverage: **Tofino** gets Beaches, Surfing, Kayaking, Fishing, Whale watching, Birding & wildlife, Storm watching, Hiking & trails, Restaurants. **Ucluelet** gets Hiking & trails, Kayaking, Whale watching, Birding & wildlife, Restaurants, Fishing.

Fishing has no Tofino doc but is included as a category in both cities, because ArcTrips Fishing sells there and the category page can launch on experience inventory plus a short hand-written intro.

## 9. Out of scope for v1.1

- The other 23 cities and 63 docs. Data work, no new components.
- Real experience inventory. `experiences` ships with placeholder rows; the structure is correct from day one.
- Map view, user reviews and ratings, saved trips, i18n.
- Clicking a gallery photo through to its place page. The `place_slug` tag ships, the interaction comes later.

## 10. Decisions taken, with the reasoning

- **Category is the canonical node**, not parallel things-to-do and guides branches. Otherwise a subject gets two URLs and split SEO authority.
- **Places are routable pages.** Thirteen beaches means thirteen booking surfaces instead of one, and each can rank for its own name. Cost: four of Tofino's thirteen beaches have thin copy and will need merging or a shorter template.
- **Flat categories with a theme label**, not two routable levels. Avoids thin theme pages while still giving big cities a grid.
- **Regions routable, cities at the root.** Region-level corpus content gets a home without lengthening every deep URL.
- **Coming-soon states are shown, not hidden.** A captured email plus a stays fallback beats a hidden page. Flagged at the time as a business judgment: showing three amber states per destination can read as a thin catalogue. Owner chose to show them.
- **No sidebar.** Rejected after review against TripAdvisor. A sidebar reads as documentation; a sticky tab bar plus rails reads as travel and works far better on mobile.
- **Breadcrumb is non-interactive.** Dropdown segments were built and rejected: the control moved horizontally with URL depth, which is what made switching feel unintuitive.

## 11. Assumption to confirm

Reading pages (places, articles) use a desktop-only "On this page" rail plus sibling cards at the foot. This was option C in the final mockup and was not explicitly chosen. It is applied here because a 1,200-word beach page is a reading page, not a browse page. Easy to drop if unwanted.
