# Routing: the URL map, how it is served, and what breaks it

URLs follow the PRD "URL Structure & Site Taxonomy" (Confluence space ADS, page 117735426, last modified 2026-07-22). Rewritten 2026-10-20 when the site moved from a flat tree (`/tofino/hiking`) to the PRD tree (`/destinations/canada/bc/tofino/things-to-do/hiking`). Read this instead of re-deriving the routing from `next.config.ts` and 47 HTML files.

## The one rule

**`scripts/lib/routes.mjs` is the URL map, and the only place it is written down.**

Nothing else carries its own copy:

| Consumer | What it uses the map for |
|---|---|
| `next.config.ts` | every rewrite (routes and aliases) and the `/prototype/<file>.html` redirects |
| `app/sitemap.ts`, `app/robots.ts` | the sitemap and robots.txt |
| `scripts/canonical-rebuild.mjs` | writes `<link rel="canonical">` into each page |
| `scripts/nav-rebuild.mjs` | turns its filename tables into hrefs at emit time |
| `scripts/qa-prototype.mjs` | resolves a link back to a file on disk; fails raw `.html` hrefs |
| `scripts/qa-runtime.mjs` | the URLs to load in a real browser, and the set of valid link targets |
| `scripts/lib/routes.test.mjs` | the URL contract test |
| `.claude/routes.json` | regenerated from `ROUTES`; the route list the owner's screenshot sweep reads (that script lives outside this repo) |

Adding a page is one line in `ROUTES` plus the HTML file.

## How a request is served

```
GET /destinations/canada/bc/tofino/things-to-do/hiking
  -> next.config.ts redirects()   no match
  -> filesystem / public          no match
  -> next.config.ts rewrites()    -> /prototype/hiking-tofino.html
  -> public/prototype/hiking-tofino.html, served at the PRD URL
```

```
GET /prototype/hiking-tofino.html
  -> next.config.ts redirects()   308 -> /destinations/canada/bc/tofino/things-to-do/hiking
```

Rewrites, not redirects, so the PRD URL is the one the visitor keeps. The rewrite destination is resolved against the filesystem and is **not** re-run through `redirects()`, so the pair does not loop.

## The invariant that makes it work

**Every asset reference in a page is root-absolute `/prototype/...`**: `_system.css`, `_nav.js`, `brand/*.svg`, `media/*`, and the `media/` strings inside the inlined JS data blobs. A page rendered six segments deep would resolve a relative `_system.css` against its own folder and lose its entire stylesheet.

The failure is silent in places, so it is gated:

- `scripts/sync-prototype.mjs` maps `/prototype/<path>` onto `public/` and stats it.
- `scripts/qa-runtime.mjs` loads each route in Chromium, fails on any 404 sub-request, and **checks every rendered `<a href>`** against the route table. Links assembled in JavaScript are invisible to a static scan. This gate found that the live `/search` linked towns to relative `banff.html`, `victoria.html` and so on, which 404 on a clean-URL site. Fixed in the same change.

## The route table

47 routes plus 2 aliases. Pattern from the PRD: `/{section}/{country}/{province}/{town}/{page-slug}`, always location order, lowercase, hyphenated, no trailing slash.

| Route | File | PRD basis |
|---|---|---|
| `/destinations/canada/bc` | `index.html` | PRD tree; British Columbia index |
| `/destinations/canada/bc/vancouver-island` | `region.html` | optional area level |
| `/search` | `search.html` | named in the PRD's WebSite `SearchAction` |
| `/not-found` | `not-found.html` | design surface, `noindex` |
| `/destinations/canada/bc/tofino` | `tofino.html` | PRD destination page example |
| `/destinations/canada/bc/tofino/things-to-do` | `things-to-do.html` | inferred (Spec 2026-07-27) |
| `/destinations/canada/bc/tofino/long-beach` | `long-beach.html` | PRD destination area page |
| `/destinations/canada/bc/tofino/things-to-do/beaches` | `beaches-tofino.html` | inferred |
| `/destinations/canada/bc/tofino/things-to-do/hiking` | `hiking-tofino.html` | inferred |
| `/destinations/canada/bc/tofino/things-to-do/storm-watching` | `storm-watching-tofino.html` | inferred |
| `/destinations/canada/bc/tofino/things-to-do/restaurants` | `restaurants-tofino.html` | inferred |
| `/destinations/canada/bc/tofino/things-to-do/surfing` | `surfing-tofino.html` | inferred |
| `/destinations/canada/bc/tofino/things-to-do/birding` | `birding-tofino.html` | inferred |
| `/whale-watching/canada/bc/tofino` | `whale-watching.html` | PRD "whale watching town page" |
| `/kayaking/canada/bc/tofino` | `kayaking-tofino.html` | PRD "kayaking town page" |
| `/fishing/canada/bc/tofino` | `fishing-tofino.html` | PRD "fishing town page" |
| `/travel-guides/canada/bc/tofino` | `plan.html` | PRD "travel guide" |
| `/blog/whale-watching/canada/bc/tofino/wildlife-tours-in-tofino` | `guide.html` | PRD blog pattern |
| `/destinations/canada/bc/ucluelet` | `ucluelet.html` | PRD destination page example |
| `/destinations/canada/bc/ucluelet/things-to-do/hiking` | `hiking-ucluelet.html` | inferred |
| `/destinations/canada/bc/ucluelet/things-to-do/restaurants` | `restaurants-ucluelet.html` | inferred |
| `/whale-watching/canada/bc/ucluelet` | `whale-watching-ucluelet.html` | PRD |
| `/kayaking/canada/bc/ucluelet` | `kayaking-ucluelet.html` | PRD "kayaking town page" |
| `/destinations/canada/bc/{town}` | 13 files: victoria, vancouver, whistler, squamish, sooke, sidney, chemainus, nanaimo, nanoose, parksville, shawnigan-lake, campbell-river, nelson | PRD |
| `/destinations/canada/{ab,sk,on,qc,ns,pe,nl}/{town}` | 11 files: banff, jasper, edmonton (ab); saskatoon (sk); niagara-falls, ottawa (on); montreal, quebec-city (qc); halifax (ns); charlottetown (pe); st-john (nl, St. John's) | PRD pattern; province code inferred from the town |

**Aliases** (`ALIASES` in `routes.mjs`): `/` and `/destinations` both serve the British Columbia index with HTTP 200 by rewrite, not redirect. Their canonical is `/destinations/canada/bc`. They stay until the real build gives each its own page (see "Not built yet").

"Inferred" means the PRD defines the pattern but not that specific page. The owner chose these on 2026-10-20:

- The three bookable verticals (whale watching, kayaking, fishing) use their PRD sections; every other subject sits under the town's `things-to-do`.
- The Tofino plan page ("When should you go") is the town's travel guide; the single article "Wildlife tours in Tofino" uses the PRD blog pattern.
- The British Columbia index is `/destinations/canada/bc`.

`_map.html` and any underscore-prefixed file are not routes. They stay reachable at `/prototype/<file>` for internal use and are excluded from every gate.

## Not built yet (the PRD requires these for production)

The prototype has no page for these, so they return 404. They belong to the real build ([HANDOVER.md](HANDOVER.md) section 2):

| Missing | PRD requirement |
|---|---|
| `/destinations` as its own page, `/destinations/canada` | Section landing pages must be real indexable pages, not redirects. Today `/destinations` is an alias of the BC index |
| `/travel-guides`, `/whale-watching`, `/kayaking`, `/fishing`, `/species`, `/fishing-reports`, `/stays`, `/aboutus`, `/blog` | Section landing pages; the homepage must link to the main sections with the PRD's anchor text |
| `/{section}/canada` and `/{section}/canada/bc` for non-destination sections | BreadcrumbList items point at them |
| BreadcrumbList JSON-LD on every page; WebSite and Organization JSON-LD on the home page | PRD section 7. Visible breadcrumbs exist but omit the Canada level (decision D-5) |
| One sitemap per section (`sitemap-destinations.xml`, ...) | PRD section 7. Today one `sitemap.xml` |
| Unique titles and descriptions, `robots: index,follow` | Present on every page today; `follow` is implicit |
| Production host `arctrips.com`; root `/` is the stays landing | The prototype root serves the BC index. The domain is decided when the backend is built |
| Species, fishing report, regulations, stays and charter URL shapes | Out of scope for this repo |

## Changing routes

1. Edit `ROUTES` (and `ALIASES`) in `scripts/lib/routes.mjs`; add new exports to `routes.d.mts`.
2. Write links as routes. `qa-prototype.mjs` fails any literal `.html` href. Do not build a URL by concatenating strings in page JavaScript; resolve it from a map (see `TOWN_ROUTE` in `search.html`).
3. Write assets as `/prototype/...`. Never relative.
4. `node scripts/nav-rebuild.mjs`, `node scripts/canonical-rebuild.mjs`, then `node scripts/sync-prototype.mjs`.
5. Regenerate `.claude/routes.json` from `Object.values(ROUTES)`.
6. Gates, in this order: `npm test`, `qa-prototype.mjs public/prototype`, `npm run build`, `qa-runtime.mjs` (needs a Next server; `QA_BASE=<origin>` aims it elsewhere).

**Old URLs are not redirected.** The PRD forbids redirects and the owner ruled on 2026-10-20 that prototype-era URLs may break. If a route changes after production launches, that decision must be revisited with real traffic in mind. The only redirects are `/prototype/<file>.html` to its route, so a page has one address.

## Indexing surface: canonical, sitemap, robots

All three are generated from `ROUTES` and `SITE_ORIGIN` (`scripts/lib/routes.mjs`), so none can disagree with the map.

| Piece | Where | Behaviour |
|---|---|---|
| `<link rel="canonical">` | every routed page except `/not-found` | absolute URL, no trailing slash (PRD section 7). Written by `node scripts/canonical-rebuild.mjs`, which edits `design/prototype/*.html`; then run `sync-prototype.mjs`. `--check` exits 1 when a page is stale |
| `/sitemap.xml` | `app/sitemap.ts` | 46 URLs: every route except `/not-found`. Aliases are excluded |
| `/robots.txt` | `app/robots.ts` | allows `/`; disallows `/prototype/_` and `/ideation/`; names the sitemap |
| `/not-found` | `not-found.html` | `noindex,follow`, deliberately not disallowed in robots.txt so a crawler can read the noindex |

`SITE_ORIGIN` is `https://arctrips-destination-pages.vercel.app`, the only domain attached to the Vercel project. The PRD names `arctrips.com`; the owner decides the domain when the backend is built. **At cutover change that one line, run `canonical-rebuild.mjs` and `sync-prototype.mjs`, and commit.**

## URL policy, as served

| Case | Behaviour |
|---|---|
| Trailing slash, `/destinations/canada/bc/tofino/` | 308 to the same path without the slash (Vercel `trailingSlash:false`) |
| `/prototype/<file>.html` | 308 to the route |
| Old flat route, `/tofino`, `/tofino/hiking` | 404 (not redirected, by decision) |
| Unknown path | 404 from `app/not-found.tsx` (plain page, not the designed `/not-found`) |
| Uppercase, `/Destinations/Canada/BC/Tofino` | 200, same page. The canonical names the lowercase URL, which consolidates it for crawlers. A redirect would need middleware, and the PRD forbids redirects |
| Query string, `?x=1` | 200, same page; canonical strips it. Only `/search` reads parameters (`q`, `in`, `show`), and `?m=1` to `?m=12` on the whale watching page |
| `/` and `/destinations` | 200, the BC index, canonical `/destinations/canada/bc` |
| `/not-found` | 200 by design, `noindex` |

`routes.test.mjs` enforces: unique routes; lowercase hyphenated segments with no trailing slash; every non-search page follows `{section}/canada/{2-letter province}/...`; no old flat route remains; every file is deployed and every deployed page is routed; every page's canonical equals its route; aliases serve a real page whose canonical is the real route.

## How it got here

1. Until 2026-08-12 the site lived at `/prototype/<page>.html`.
2. 2026-08-12/13: flat clean routes (`/tofino`, `/tofino/hiking`), served by rewrites. British Columbia was made the tree root and Canada dropped as a breadcrumb (D-5, D-10, D-11).
3. 2026-10-20: the owner ruled that the PRD's URL structure is required and the flat tree "will not work". The tree was rebuilt to the PRD and old URLs were allowed to break (D-18).

## Verification on record, 2026-10-20

- `npm test`: 79 passed (URL contract included). `tsc`, `npm run build`: pass.
- `qa-prototype.mjs public/prototype`: 47 pages, every link, anchor and image valid.
- `qa-runtime.mjs` (47 routes, 2 aliases, 6 search states): 0 of 55 pages with errors, empty containers or broken rendered links.
- Local server: every route above 200; `/tofino`, `/tofino/hiking`, `/destinations/canada` 404; `/prototype/hiking-tofino.html` 308 to `/destinations/canada/bc/tofino/things-to-do/hiking`; sitemap 46 URLs.
