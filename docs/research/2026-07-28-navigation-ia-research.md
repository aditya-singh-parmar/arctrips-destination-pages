# Navigation and IA research

**Date:** 2026-07-28
**Trigger:** "This whole navigation is really confusing. Really really confusing, like going from vancouver > destination and back."
**Method:** Field study of seven travel platforms, a published-evidence review, and an analysis of our own corpus.
**Status:** Research. The recommendation in section 6 is a proposal, not a decision.

---

## 1. The finding that reframes everything: our tree describes a catalogue we do not have

Branching factor, counting only children that have real content:

| Level | Children with content |
|---|---|
| Arc Trips to countries | **1** (Canada) |
| Canada to provinces | **1** (British Columbia) |
| British Columbia to regions | **1** (Vancouver Island) |
| Vancouver Island to towns | **2** (Tofino, Ucluelet) |
| Tofino to categories | 9 |
| Ucluelet to categories | 6 |

Total leaf content: 127 places, 31 articles, 15 category guides. **173 pages.**

Three of the five geographic levels present exactly one onward choice. A traveller walking
`Canada / British Columbia / Vancouver Island` passes three screens that ask them to decide
nothing. The complaint about "vancouver to destination and back" is not really about the bars
at the top. It is that the movement itself has no payoff, so it reads as overhead.

---

## 2. Field study: nobody puts geography in the URL path

Seven platforms, studied independently. They converge, and we are the outlier.

| Platform | Geo levels in the data | Geo levels in the URL |
|---|---|---|
| TripAdvisor | 6 | **0**, every page is one flat segment |
| Wikivoyage | 7 | **0**, `/wiki/Tofino` |
| Atlas Obscura | variable | **0**, `/places/{slug}` |
| Rough Guides | 4 | 3 max |
| Lonely Planet | variable | 1 to 4, continent never a segment |
| Booking.com | 4 | 2 to 3, type plus country plus slug |
| MICHELIN Guide | 3 | 3, but exposed in the UI only via breadcrumb |
| **Arc Trips today** | **5** | **up to 7** |

Three findings inside that table matter more than the table itself.

**TripAdvisor runs six geographic levels and zero URL depth.** Every page is
`/{PageType}-g{id}-{tail}.html`. Depth never appears in the path and never changes as you
descend. Thin levels cost nothing because **you never pass through them**. Clayoquot Sound,
a level almost nobody has heard of, has the same full page family as Tofino. It is simply
less linked.

**Rough Guides was deeper and reversed it.** The legacy URL
`/destinations/north-america/canada/vancouver-vancouver-island/victoria/` now 301s to
`/canada/vancouver-island/victoria/`. A publisher with our exact content shape tried the deep
path and retreated from it.

**Booking's Tofino URL contains no trace of Vancouver Island.** `/city/ca/tofino.html`.
The ancestry lives only in the breadcrumb.

### Neither "area" nor "category" is geography anywhere else

- TripAdvisor demotes neighbourhoods to **facet codes with no geo ID at all**: Downtown
  Chicago is `HotelsList-Chicago-Downtown-Hotels-zfp718718.html`. The geo tree stops at the town.
- Categories are facet codes too: Tofino hiking is `Attractions-g154942-Activities-c61-t87`.
- Rough Guides demotes small towns to `#tofino` anchors on a shared parent page.
- TripAdvisor indexes the same POI under two parents. Parent geo is a **parameter, not an
  ownership claim**, which is the direct opposite of our "a subject has exactly one URL" rule.

### The breadcrumb is near-universal, and it is never inert

Six of seven have one. It sits **above the H1**. The current page is unlinked and every
ancestor is a link. Not one platform ships a fully non-interactive trail.

### Search splits cleanly by product type

- **Database-shaped** (TripAdvisor, MICHELIN, Booking): search is prominent, often the widest
  element on the page, and it is the primary way people move between places.
- **Editorial** (Lonely Planet, Atlas Obscura): search is an icon that hides the input.
- **Rough Guides has no site search at all.** Verified by grepping their 414KB page source.

Critically, TripAdvisor's search is **not scoped to the current place**. The tabs answer
"which subject", the search answers "which place". Narrowing within a place is done with
facets, not with search.

---

## 3. Published evidence

Full citations in the workflow transcript. The important ones, with their limits stated.

**Depth itself is not the problem.** The three-click rule is unsupported: 44 users, 620 tasks,
no drop in success or satisfaction after the third click, some users past 25 clicks
([NN/g](https://www.nngroup.com/articles/3-click-rule/)). What degrades is **information
scent**, not click count. So we cannot defend or attack a structure by counting clicks.

**But a level must earn its place by offering a real choice.** Miller (1981) found a U-shaped
curve with the optimum at 8x8. Kiger (1984) and Larson and Czerwinski (CHI 1998) agree
directionally: breadth beats depth when the extra depth adds no discrimination. A level
offering **one** option carries zero information gain.

**The closest direct evidence is Baymard's**, on intermediary category pages: **31% of
participants struggled to reach product lists**, many mistaking the intermediary page for the
destination. Test quote: *"I wish I had been brought here quicker than it took us to get here."*
This is contested and I am reporting the counter-case: Baymard also argues intermediary pages
help **when the catalogue justifies them**, recommending them at the first one to two levels
only. With two towns, ours do not justify three.

**Honest limit:** no published study directly tests collapsing a single-child level. The case
is a reasoned inference from three converging lines, not a cited result.

**Breadcrumbs are used 1.4% to 6% of the time.** (Lida, Hull and Chaparro 2003; Rogers and
Chaparro 2003.) This is the decisive number for us. **If the breadcrumb is the only way up,
roughly 94% of upward intent goes to the browser Back button or nowhere.** That is precisely
the state we shipped.

**A fully inert breadcrumb is endorsed by no source.** NN/g makes exactly one item
non-clickable, the current page. Their stated second benefit is "one-click access to higher
site levels, rescuing users who parachute into very specific destinations through search or
deep links". An inert trail keeps the weaker half of the value and discards the half that
matters for organic search arrivals, which is our main traffic. NN/g also states plainly:
"Breadcrumbs should not replace the global navigation bar or the local navigation within a
section."

---

## 4. What is actually wrong with the prototype, in order of severity

1. **Three of five geographic levels present no choice.** Root cause.
2. **The breadcrumb is inert on four of five pages and clickable on one.** No source supports
   inert, and the inconsistency is worse than either state.
3. **The breadcrumb is the only up-path**, and the evidence says it carries under 6% of clicks.
4. **The same visual row means four different things**: town sections on `guide`, in-page
   anchors on `long-beach` and `whale-watching`, filters on `things-to-do`.
5. **"Things to do" and "Plan" appear twice** in two bars at two scopes.
6. **Up to four stacked bars** before content on some pages.
7. **Search is a decorative input.** It is the mechanism every database-shaped competitor uses
   as the primary movement control, and ours does nothing.

---

## 5. What this says about rulings we already made

Two standing decisions look wrong in the light of the evidence, and one looks right.

- **"Breadcrumb is a plain non-interactive trail" is not supportable.** It was made to kill
  dropdown segments, which was correct, but it over-corrected into removing the only up-path.
  No platform and no research endorses the result.
- **The deep URL (spec decision D1) is contradicted by every platform studied**, including one
  that tried it and reversed. It was chosen partly for SEO, but TripAdvisor and Wikivoyage
  demonstrate that geography can live entirely in breadcrumb and structured data.
- **"No sidebar" holds.** Nobody in the field study uses one for in-article navigation.

---

## 6. Recommendation

Presented as a proposal with costs, not a decision.

**Separate three things that are currently welded together: the data tree, the URL, and the chrome.**

Keep Country to Province to Region to Town to Area as **data**. It is needed for scale, for
`BreadcrumbList` structured data, and for the day there are 24 towns. Stop expressing it as
screens a traveller walks through.

| # | Change | Cost |
|---|---|---|
| R1 | **Cap the URL at the town.** `/destinations/tofino`, not four ancestors first. Geography stays in the breadcrumb and JSON-LD. | High. Every URL changes again, and it reverses spec decision D1. |
| R2 | **Breadcrumb becomes clickable**, every segment except the current page, sitting above the H1. | Low. This is a bug fix and should happen regardless of R1. |
| R3 | **One bar below the global nav, always meaning the town's sections.** In-page anchors and filters get a visually distinct treatment inside the page body. | Low. |
| R4 | **Search becomes the destination switcher**, answering "which place" while the town bar answers "which subject". Not scoped-to-page search. | Medium. Needs the real index. |
| R5 | **Lateral movement moves to rails and nearby modules**, not tree climbing. Every leaf gets siblings with counts and distances. | Medium. |
| R6 | **Country, province and region stop being destinations.** They become lateral collection pages reachable from the breadcrumb, never steps you must pass through. | Medium. |

**R2 and R3 are unambiguous and cheap. I would do them regardless of what is decided about
the rest.** R1 is the real question, because it reverses a decision that is already built and
shipped, and its benefit is largest at today's scale and smallest at 24 towns.

### The honest counter-argument to R1

At 24 towns across 8 provinces, the branching factor problem partly solves itself: provinces
would have real choices in them. R1 optimises for today's shape. If the 24-destination import
in Plan 3 is imminent, capping the URL now may be solving a problem that is about to expire.
The pass-through levels are a real cost today, and a diminishing one over time.

That trade is a business call about roadmap timing, not a design call, which is why this
document stops here rather than picking.

---

## 7. What I would want to know next

- When does the 24-destination import actually land? It changes the answer to R1.
- Is the SEO value of the deep URL measured, or assumed? Every platform studied says assumed.
- Do we have analytics on whether anyone ever visits a country or province page today?
