# Routing, the URL map, how it is served, and what breaks it

Written 2026-08-13, after the move off `/prototype/<page>.html`. Read this instead of
re-deriving the routing from `next.config.ts` and 47 HTML files.

## The one rule

**`scripts/lib/routes.mjs` is the URL map, and the only place it is written down.**

Five things read it and none of them carries its own copy:

| Consumer | What it uses the map for |
|---|---|
| `next.config.ts` | generates every rewrite and every legacy redirect (308) |
| `scripts/qa-prototype.mjs` | resolves a link back to a file on disk; fails raw `.html` hrefs |
| `scripts/qa-runtime.mjs` | the list of URLs to load in a real browser |
| `scripts/nav-rebuild.mjs` | turns its filename tables into hrefs at emit time |
| `.claude/routes.json` | regenerated from `ROUTES`; the route list the owner's screenshot sweep reads (that script lives outside this repo) |

Adding a page is one line in `ROUTES` plus the HTML file. Hand-editing a route in any
consumer puts the site and its gates out of sync, and the gates are the only thing that
notices.

## How a request is served

```
GET /tofino/hiking
  -> next.config.ts redirects()   no match
  -> filesystem / public          no match
  -> next.config.ts rewrites()    /tofino/hiking -> /prototype/hiking-tofino.html
  -> public/prototype/hiking-tofino.html, served at the clean URL
```

```
GET /prototype/hiking-tofino.html
  -> next.config.ts redirects()   308 -> /tofino/hiking
```

Rewrites, not redirects, so the clean URL is the one the visitor keeps. Verified
empirically: the rewrite destination is resolved against the filesystem and is **not**
re-run through `redirects()`, so the pair does not loop.

## The invariant that makes it work

**Every asset reference in a prototype page is root-absolute `/prototype/...`** , 
`_system.css`, `_nav.js`, `brand/*.svg`, `media/*`, and the `media/` strings inside the
inlined JS data blobs.

This is not stylistic. A page rendered at `/tofino/hiking` resolves `_system.css`
against `/tofino/`, so a single relative path 404s that page's entire stylesheet. That
is exactly why `/` used to be a 307 to `/prototype/index.html` rather than a rewrite:
the old redirect existed to work around relative paths, and removing them removed the
need for it.

The failure is silent in two specific places, so both are gated:

- `scripts/sync-prototype.mjs` maps `/prototype/<path>` onto `public/` and stats it.
- `scripts/qa-runtime.mjs` loads each route in Chromium and fails on any 404 response.
  The JS-data `media/` strings were caught **only** here, because they are assembled at
  runtime and no static scan sees them.

## The route table

47 routes. A town owns its sections and its subjects.

| Route | File |
|---|---|
| `/` | `index.html` |
| `/search` | `search.html` |
| `/vancouver-island` | `region.html` |
| `/not-found` | `not-found.html` |
| `/tofino` | `tofino.html` |
| `/tofino/things-to-do` | `things-to-do.html` |
| `/tofino/plan` | `plan.html` |
| `/tofino/guides` | `guide.html` |
| `/tofino/long-beach` | `long-beach.html` |
| `/tofino/beaches` | `beaches-tofino.html` |
| `/tofino/hiking` | `hiking-tofino.html` |
| `/tofino/kayaking` | `kayaking-tofino.html` |
| `/tofino/whale-watching` | `whale-watching.html` |
| `/tofino/storm-watching` | `storm-watching-tofino.html` |
| `/tofino/restaurants` | `restaurants-tofino.html` |
| `/tofino/surfing` | `surfing-tofino.html` |
| `/tofino/birding` | `birding-tofino.html` |
| `/tofino/fishing` | `fishing-tofino.html` |
| `/ucluelet` | `ucluelet.html` |
| `/ucluelet/hiking` | `hiking-ucluelet.html` |
| `/ucluelet/kayaking` | `kayaking-ucluelet.html` |
| `/ucluelet/whale-watching` | `whale-watching-ucluelet.html` |
| `/ucluelet/restaurants` | `restaurants-ucluelet.html` |
| `/<town>` | 24 further towns, one segment each: banff, campbell-river, charlottetown, chemainus, edmonton, halifax, jasper, montreal, nanaimo, nanoose, nelson, niagara-falls, ottawa, parksville, quebec-city, saskatoon, shawnigan-lake, sidney, sooke, squamish, st-john, vancouver, victoria, whistler |

Not routes: `_map.html` and any underscore-prefixed file. They stay reachable at
`/prototype/<file>` for internal use and are excluded from every gate.

### Decisions inside the table

- **`things-to-do`, `plan`, `guides` are Tofino's.** All three were global filenames for
  Tofino-only pages. Nesting them under `/tofino/` was the fix, not a side effect. When
  Ucluelet gets its own, they are new files at `/ucluelet/things-to-do`, not a shared page.
- **`whale-watching.html` is Tofino's** despite the generic filename (its `<title>` is
  "Whale watching in Tofino"). Ucluelet's is a separate file. Do not merge them.
- **`region.html` became `/vancouver-island`, not `/regions`.** The page is Vancouver
  Island, and towns already sit at root, so places share one flat namespace.
- **The geo tree was rejected.** `docs/superpowers/specs/2026-07-27-destinations-experience-design.md`
  proposed `/destinations/{country}/{province}/{town}`. It belongs to the deleted app,
  and BC is the tree root here, not Canada.
- `/not-found` returns **200**. It is a design surface the sweep checks, not the 404
  handler. Real 404s are `app/not-found.tsx`.

## Changing routes

1. Edit `ROUTES` in `scripts/lib/routes.mjs`.
2. Regenerate the sweep list into `.claude/routes.json` from `Object.values(ROUTES)`.
3. Write links as clean routes. `qa-prototype.mjs` fails any literal `.html` href.
4. Write assets as `/prototype/...`. Never relative.
5. `node scripts/sync-prototype.mjs`, design/ to public/. The deployed copy is what ships.
6. Gates, in this order: `qa-prototype.mjs`, `qa-runtime.mjs` (needs a Next server,
   `QA_BASE=<origin>` aims it at production), `npm run build`.

Renaming an existing route needs a permanent redirect (308) from the old one. The legacy `/prototype/*.html`
redirects are generated from the same map, so they follow a rename for free.

## Indexing surface: canonical, sitemap, robots

Added 2026-10-20. All three are generated from `ROUTES` and `SITE_ORIGIN`
(`scripts/lib/routes.mjs`), so none of them can disagree with the map.

| Piece | Where | Behaviour |
|---|---|---|
| `<link rel="canonical">` | every routed page except `/not-found` | absolute URL, no trailing slash (the root is the bare origin). Written by `node scripts/canonical-rebuild.mjs`, which edits `design/prototype/*.html`; then run `sync-prototype.mjs`. `--check` exits 1 when a page is stale. |
| `/sitemap.xml` | `app/sitemap.ts` | 46 URLs: every route except `/not-found` |
| `/robots.txt` | `app/robots.ts` | allows `/`; disallows `/prototype/_` (internal pages) and `/ideation/` (design exploration); names the sitemap |
| `/not-found` | `not-found.html` | `noindex,follow`, deliberately not disallowed in robots.txt so a crawler can read the noindex |

`SITE_ORIGIN` is `https://arctrips-destination-pages.vercel.app` because that is the only
domain attached to the Vercel project (checked 2026-10-20). **At domain cutover change that
one line, run `canonical-rebuild.mjs` and `sync-prototype.mjs`, and commit.**
`scripts/lib/routes.test.mjs` fails the build if any page's canonical drifts from its route.

## URL policy, as served today

| Case | Behaviour | Verified |
|---|---|---|
| Trailing slash, `/tofino/` | 308 to `/tofino` (Vercel `trailingSlash:false`) | yes |
| Legacy `/prototype/<file>.html` | 308 to the route (generated from `ROUTES`) | yes |
| Unknown path, `/nope` | 404 from `app/not-found.tsx` (plain page, not the designed `/not-found`) | yes |
| Uppercase, `/Tofino` | **200, same page.** Not redirected. The canonical tag names the lowercase URL, which is what consolidates it for crawlers. A redirect would need middleware. | yes |
| Query string, `/tofino/hiking?x=1` | 200, same page. Canonical strips it. Only `/search` reads parameters: `q`, `in`, `show`. | yes |
| `/index.html` | 404 | yes |
| `/not-found` | 200 by design (it is a design surface), `noindex` | yes |

Segment rules, enforced by `routes.test.mjs`: lowercase letters, digits and hyphens;
one segment for a town, two for a town's section or subject; no trailing slash; no
duplicates; every deployed non-underscore page is routed.

## Production URL target: PRD versus what is built

**Status: unresolved, owner decision needed. This is the largest open item in the handover.**

The Confluence PRD "PRD, URL Structure & Site Taxonomy" (space ADS, page 117735426,
last modified 2026-07-22) says production lives on `arctrips.com`, with no subdomains,
no trailing slash, no redirects, and location pages shaped
`/{section}/{country}/{province}/{town}/{slug}`. For this repo's content it names:

- destinations: `/destinations/canada/bc/ucluelet`, area pages `/destinations/canada/bc/tofino/clayoquot-sound`
- travel guides: `/travel-guides/canada/bc/ucluelet`
- section landing pages that must be real, indexable pages: `/destinations`, `/travel-guides`, `/whale-watching`, `/kayaking`, `/fishing`, `/stays`
- BreadcrumbList JSON-LD on every page, WebSite and Organization JSON-LD on the homepage, a sitemap per section

What is built is the flat tree in the route table above (`/tofino`, `/tofino/hiking`),
chosen by the owner on 2026-08-13 after the deep tree (`/destinations/{country}/{province}/...`,
spec dated 2026-07-27) had been tried and the deleted Next.js app removed. The PRD page
has not been updated since, and the two disagree. Nothing in this repo was re-routed to
match the PRD.

Proposed mapping, for the owner to accept or amend. "Spec" means
`docs/superpowers/specs/2026-07-27-destinations-experience-design.md`; the PRD does not
define subject or section URLs under a town, so those rows are inferred.

| Built today | PRD-shaped target | Basis |
|---|---|---|
| `/` | `/destinations` | PRD section landing. `arctrips.com` itself is the stays landing, a different product. |
| `/vancouver-island` | `/destinations/canada/bc/vancouver-island` | Spec |
| `/tofino`, `/ucluelet` and the other 13 BC towns | `/destinations/canada/bc/{town}` | PRD example |
| `/tofino/long-beach` | `/destinations/canada/bc/tofino/long-beach` | PRD area-page example |
| `/tofino/{subject}`, `/ucluelet/{subject}` (beaches, hiking, kayaking, surfing, birding, restaurants, storm-watching) | `/destinations/canada/bc/{town}/things-to-do/{subject}` | Spec |
| `/tofino/things-to-do` | `/destinations/canada/bc/tofino/things-to-do` | Spec |
| `/tofino/guides`, `/tofino/plan` | `/travel-guides/canada/bc/tofino` and a plan page under it | PRD, inferred |
| `/tofino/whale-watching`, `/ucluelet/whale-watching`, `/tofino/kayaking`, `/tofino/fishing` | **Conflict**: the PRD gives `/whale-watching/canada/bc/{town}`, `/kayaking/...` and `/fishing/...` to bookable products. Whether these guide pages live there or under `things-to-do` is undecided. | PRD vs Spec |
| Alberta, Saskatchewan, Ontario, Quebec, Maritime towns (banff, jasper, edmonton, saskatoon, montreal, quebec-city, ottawa, niagara-falls, halifax, charlottetown) | `/destinations/canada/{ab,sk,qc,on,ns,pe}/{town}` | Province inferred from the town. `st-john` is ambiguous (St. John's NL or Saint John NB) and must be confirmed before it gets a URL. |
| `/search`, `/not-found` | not in the PRD | |

Consequences the PRD sets: with "no redirects" the legacy URLs would 404, so a move needs
either an owner exception for 308s from the current URLs or acceptance that the
deployed prototype URLs die. The current `/prototype/*.html` to route redirects would
need to be retargeted in the same change. Because every URL is derived from
`ROUTES`, a move is one edit to that table plus `canonical-rebuild.mjs`, `nav-rebuild.mjs`
and the gates; the backend should still treat URLs as data (a `slug` plus a parent chain),
not as strings baked into code.

## Verification on record, 2026-08-13, commit 49da45f

- `qa-prototype.mjs`: clean, 47 pages, every link, anchor and image valid
- `qa-runtime.mjs` against localhost: 0 of 47 pages with errors or empty containers
- `qa-runtime.mjs` against `https://arctrips-destination-pages.vercel.app`: 0 of 47
- `npm run build`, `npx tsc --noEmit`, `npm test` (69 tests): pass. `npm run lint` has
  one pre-existing warning in `decompose.mjs`, unrelated.
- Production spot checks: `/`, `/tofino`, `/tofino/hiking`, `/tofino/things-to-do`,
  `/ucluelet/whale-watching`, `/vancouver-island`, `/search`, `/whistler` all 200;
  `/prototype/hiking-tofino.html` 308 to `/tofino/hiking`; `/prototype/_system.css` 200.

The codemod that did the one-time conversion rewrote **1,720 links and 1,063 asset
references across 48 files**. It was a throwaway; the map is the durable artefact.
