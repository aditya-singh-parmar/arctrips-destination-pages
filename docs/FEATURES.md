# Features, end to end

What the site does today, page by page, from the code. "Client-side" means the logic runs in the visitor's browser over data already inside the page. No feature below calls a server.

## 1. Page inventory

47 routes ([routing.md](routing.md) has the table). By kind:

| Kind | Routes | Count | Built how |
|---|---|---|---|
| Home | `/` | 1 | Hand HTML, inline JS: finder, seasonal almanac, accordions, email capture |
| Search | `/search` | 1 | Hand HTML, 170 KB inline data blob and search engine |
| Region | `/vancouver-island` | 1 | Hand HTML, minimal JS, data from `vancouver-island.json` |
| Town hub, fully designed | `/tofino` | 1 | Hand HTML (84 KB), three inline scripts driven by `corpus.json`, `climate.json`, `best-months.json` |
| Town hub, lighter | `/ucluelet` | 1 | Hand HTML (23 KB), one script. Not at parity with Tofino |
| Tofino section pages | `/tofino/things-to-do`, `/plan`, `/guides`, `/long-beach` | 4 | Hand HTML with seasonal logic |
| Subject pages | `/tofino/{beaches,hiking,kayaking,whale-watching,storm-watching,restaurants,surfing,birding,fishing}`, `/ucluelet/{hiking,kayaking,whale-watching,restaurants}` | 13 | Hand HTML; most are mostly static, `whale-watching` and `guide` are interactive |
| Town pages, content only | 24 further towns, one segment each | 24 | Static sections written from `deep.json` (by hand, see [HANDOVER.md](HANDOVER.md) section 4), a search box, a place bar, one script |
| 404 design | `/not-found` | 1 | Hand HTML, address-walking logic |

## 2. Shared behaviour on every page

| Behaviour | Where | Detail |
|---|---|---|
| Global nav, place bar, subject rail, plain breadcrumb | generated into each page by `scripts/nav-rebuild.mjs` | Edit the tables in that script, never the nav in a page. `node scripts/nav-rebuild.mjs --check` verifies. The owner ruled in August 2026 that this navigation stays as is |
| Place-bar scroll spy | `design/prototype/_nav.js` (2.4 KB) | Underlines the in-page section you are in; a click wins for 900 ms so short sections do not lose the highlight; the last section wins at the page bottom |
| Search box | every page, a plain `GET /search?q=...` form | No JS needed to submit |
| "/" focuses the search field | subject pages, `guide`, `whale-watching` | Ignored when typing in an input |
| Reading-progress hairline | long pages (`tofino`, `things-to-do`, `plan`) | Scroll-driven |
| Reduced motion | `_system.css` | Count-up and smooth scroll are skipped under `prefers-reduced-motion` |
| Theme | light only | No dark mode exists |
| Fonts | Google Fonts (Inter), Fontshare (Satoshi, wordmark only) | Two third-party requests per page load |

## 3. Home (`/`)

| Feature | Behaviour |
|---|---|
| Finder | Type-ahead over towns, beaches, trails and guides (`paintFinder`). Placeholder shortens under 760 px |
| Regions | Vancouver Island (11 towns) first, then three mainland regions. Totals are summed once from the BC data |
| "When should you go?" almanac | Month strip; picking a month re-paints the figures with a count-up. Heat cells are shaded by how many subjects are in season |
| Awkward questions | Native `<details>` accordion, one column, no JS |
| Seasonal letter | **Email form. Submits nowhere.** See section 8 |

## 4. Search (`/search`)

Entirely client-side. Index is built in the page from a compact blob with short keys: `RAW.d` towns, `RAW.g` guides, `RAW.p` places, `RAW.a` articles, `RAW.q` questions.

| Item | Behaviour |
|---|---|
| Query parameters | `q` (text), `in` (town slug scope), `show` (tab). `history.replaceState` keeps the URL in step as the user types |
| Result types | Towns (weight 18), Guides (14), Places (5), Articles (6), Questions (2). Caps per type 4, 6, 8, 6, 6 |
| Tabs | `all` plus one per type |
| Category chips | Filter by subject; "Clear N filters" |
| Scope | `in=tofino` limits to a town and rewrites the breadcrumb. A scope with no hits offers "Search all N towns instead" |
| Empty query | Not blank: offers the two towns that have full content |
| Links out | Place cards resolve to the subject page that owns them, never by name. Article hits that have no page go to a scoped result list |

A backend equivalent is specified in [API.md](API.md) section 4. The scoring weights above are the contract to reproduce.

## 5. Town hubs

`/tofino` is the reference hub. `/ucluelet` is a shorter page with the same place bar and no almanac. Tofino's sections: overview (the "why"), month almanac, what to do (best for), areas (Tofino has thirteen beaches), places to stay, guides to read, nearby towns, FAQ accordion.

| Logic | Source |
|---|---|
| "Best months" windows | `best-months.json`, contiguous runs read round the year, so a winter window prints "November to February" |
| Weather rows | `climate.json`: monthly high, low, rainfall (mm) and rain days per town |
| Daylight | Computed in the browser from latitude 49.153 N, solar declination and hour angle. No data file |
| Tides and sunset | `climate.json` `tides` block per town |
| Stay cards | Four distinct Tofino listings from the `listings` sample; all link to `/not-found` |
| Link resolution | A place goes to the subject page that owns it, never by name. Subjects with no page of their own land on their section of `/tofino/things-to-do` |

## 6. Tofino section pages

| Route | Feature |
|---|---|
| `/tofino/things-to-do` | Nine subject cards, ranked by whether they are in season now. Ordering is stated twice (number plus a divider where the in-season run ends). One photograph per subject, the same one the subject page opens on. Questions dealt round the subjects so the first screen spans the whole town. Collapsed answers |
| `/tofino/plan` | "When should you go to Tofino?" Twelve-month board, **two-month compare**, "at their best in {month}", nine topic cards with counts matched from the guides' own "good for" wording, a stays strip, FAQ. Counts only Tofino's eleven subjects, never the 22-category taxonomy |
| `/tofino/guides` | The single built article, "Wildlife tours in Tofino". Whale-watching booking status panel with the email form, a year strip, spots, month switcher, questions, reading minutes (not word counts) |
| `/tofino/long-beach` | The one built area page: six things people do there with best months, the other twelve beaches grouped by the kind of day they suit, stays from the Tofino end to the far end, climate |

## 7. Subject pages

Pattern: a "when" band (season window), a list of places ordered from the village outward, rules or tips, "Asked before people book", "Three ways on from here". Each place shows blurb, "good for" bullets, a note, and photographs.

`/tofino/whale-watching` adds: three whale portraits (gray, humpback, orca) with a month switcher that shows three states (at peak, possible, not here), `?m=1`..`12` to land on a month (the only month deep link in the site), a six-places table, filters, and a "coming soon" panel with the email form. `/ucluelet/*` subject pages follow the same pattern with fewer sections.

## 8. Forms and calls to action

| Control | Page | Behaviour today | Needs backend |
|---|---|---|---|
| Seasonal letter, "Send me the letter" | `/` | `preventDefault`, then button text becomes "Thank you, you are on the list". Required email, unchecked consent box that is **not** validated | Yes |
| "Tell me when boats go live" | `/tofino/whale-watching` | Same, text "Thank you, we will write once" | Yes |
| "Tell me when tours open" | `/tofino/guides` | `preventDefault`, form replaced by a confirmation paragraph, consent line removed | Yes |
| Search forms (about 24) | most pages | Real `GET /search?q=` | No |
| Stays links ("See all 134", "See every stay", stay cards) | many | Link to `/not-found?in=tofino` (or `ucluelet`). `not-found` reads `in` but only to offer that town | Stays product |
| "Go to ArcTrips Fishing", "ArcTrips Fishing" | fishing, others | `/not-found`. The "Fishing charters" links mostly go to the Tofino fishing guide `/tofino/fishing` (an editorial page, not a booking page); three go to `/not-found` | Sister brand URL |
| Footer "About us", "List your place", "Contact" | 18 pages | `/not-found` | Pages or product links |

Booking-path ruling carried from the deleted app: every page carries a way forward. Stays are live on Arc Trips, fishing hands off to the sister brand, whale watching, kayaking and hot springs are "coming soon" with an email capture that falls through to stays. Today the stays and fishing targets do not exist, which is seam 2 and 3 in [HANDOVER.md](HANDOVER.md).

## 9. States

| State | Behaviour |
|---|---|
| Unknown URL | Next's plain 404 page (`app/not-found.tsx`): heading, one sentence, link home. `noindex`. HTTP 404 |
| `/not-found` | Designed page, HTTP 200, `noindex,follow`. Walks the address in `?path=` segment by segment (default sample: a ziplining URL), resolves each segment inside the town it has passed through, prints a plain breadcrumb of how far the address got, offers the last real parent and the two written towns, and runs a live search. It tolerates old deep URLs (`/destinations/british-columbia/...`) but nothing links to it with `?path=`, and real 404s never reach it |
| Empty search | Offers the two towns that have full content |
| No JS | Static sections render; search, almanacs, finders, accordions that need JS do not. Native `<details>` works |
| Slow or missing Cloudinary image | `<img>` shows alt text. No fallback image |
| Loading and error states | None needed: nothing is fetched |
| Permissions | None. No accounts |

## 10. Accessibility and responsive

Responsive at 375, 768 and 1440 px (the QA gates load at 1440). Native `<details>` for FAQs; `aria-current` on active links; visually hidden labels on inputs (`.vh`). Known accepted gaps are listed in [HANDOVER.md](HANDOVER.md) section 4.

## 11. What the site does not do

No accounts or sign-in, no booking, no payments, no reviews, no user-generated content, no analytics, no cookies, no consent banner, no server-side rendering of data, no per-page Open Graph or structured data, no multi-language support (`lang="en-CA"` throughout).
