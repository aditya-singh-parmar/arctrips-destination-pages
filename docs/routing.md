# Routing — the URL map, how it is served, and what breaks it

Written 2026-08-13, after the move off `/prototype/<page>.html`. Read this instead of
re-deriving the routing from `next.config.ts` and 47 HTML files.

## The one rule

**`scripts/lib/routes.mjs` is the URL map, and the only place it is written down.**

Five things read it and none of them carries its own copy:

| Consumer | What it uses the map for |
|---|---|
| `next.config.ts` | generates every rewrite and every legacy 301 |
| `scripts/qa-prototype.mjs` | resolves a link back to a file on disk; fails raw `.html` hrefs |
| `scripts/qa-runtime.mjs` | the list of URLs to load in a real browser |
| `scripts/nav-rebuild.mjs` | turns its filename tables into hrefs at emit time |
| `.claude/routes.json` | regenerated from `ROUTES`; what `shots.mjs` sweeps |

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
  -> next.config.ts redirects()   301 -> /tofino/hiking
```

Rewrites, not redirects, so the clean URL is the one the visitor keeps. Verified
empirically: the rewrite destination is resolved against the filesystem and is **not**
re-run through `redirects()`, so the pair does not loop.

## The invariant that makes it work

**Every asset reference in a prototype page is root-absolute `/prototype/...`** —
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
5. `node scripts/sync-prototype.mjs` — design/ to public/. The deployed copy is what ships.
6. Gates, in this order: `qa-prototype.mjs`, `qa-runtime.mjs` (needs a Next server —
   `QA_BASE=<origin>` aims it at production), `shots.mjs`, `npm run build`.

Renaming an existing route needs a 301 from the old one. The legacy `/prototype/*.html`
redirects are generated from the same map, so they follow a rename for free.

## Verification on record — 2026-08-13, commit 49da45f

- `qa-prototype.mjs`: clean, 47 pages, every link, anchor and image valid
- `qa-runtime.mjs` against localhost: 0 of 47 pages with errors or empty containers
- `qa-runtime.mjs` against `https://arctrips-destination-pages.vercel.app`: 0 of 47
- `shots.mjs`: 188 shots, 47 routes, **188/188 clean**, both viewports, both themes
- `npm run build`, `npx tsc --noEmit`, `npm test` (69 tests): pass. `npm run lint` has
  one pre-existing warning in `decompose.mjs`, unrelated.
- Production spot checks: `/`, `/tofino`, `/tofino/hiking`, `/tofino/things-to-do`,
  `/ucluelet/whale-watching`, `/vancouver-island`, `/search`, `/whistler` all 200;
  `/prototype/hiking-tofino.html` 308 to `/tofino/hiking`; `/prototype/_system.css` 200.

The codemod that did the one-time conversion rewrote **1,720 links and 1,063 asset
references across 48 files**. It was a throwaway; the map is the durable artefact.
