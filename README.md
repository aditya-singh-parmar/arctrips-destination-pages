# Arc Trips, Destination Pages

Destination and activity guides for 26 Canadian towns (15 in British Columbia, 11 elsewhere), written to send travellers on to Arc Trips stays. 47 pages: a home, a search, a region, 26 towns, and 17 Tofino and Ucluelet guide pages, plus a designed 404.

Live: https://arctrips-destination-pages.vercel.app

**This is a static site with no runtime backend.** The pages are hand-written HTML in `design/prototype/`, served by a thin Next.js 16 shell through URL rewrites. All content is baked into the pages at authoring time. Nothing is read from or written to a database or API at runtime. A backend is the next piece of work, and this repo's docs are written to hand it over.

## Start here

| If you are | Read |
|---|---|
| The developer taking over | [docs/HANDOVER.md](docs/HANDOVER.md), then [docs/API.md](docs/API.md) and [docs/DATA-SCHEMA.md](docs/DATA-SCHEMA.md) |
| Touching URLs or routes | [docs/routing.md](docs/routing.md) (URLs are a contract here) |
| Learning what the site does | [docs/FEATURES.md](docs/FEATURES.md) |
| Understanding how it is built and deployed | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/OPERATIONS.md](docs/OPERATIONS.md) |
| Working with images and uploads | [docs/MEDIA.md](docs/MEDIA.md) |
| Asking "why is it like this" | [docs/decisions.md](docs/decisions.md) |
| Editing the design | [DESIGN.md](DESIGN.md), [DESIGN-CONTRACT.md](DESIGN-CONTRACT.md), [PRODUCT.md](PRODUCT.md) |
| Using Claude Code in this repo | [CLAUDE.md](CLAUDE.md) |

## Run it

Needs Node 22 or newer.

```bash
npm ci
npm run build
npm start          # http://localhost:3000
```

`npm run dev` also works. Pages are plain HTML in `public/prototype/`, so a refresh shows an edit.

## Edit it

Pages are edited in `design/prototype/`, never in `public/prototype/`. Vercel serves `public/`, so every edit must be synced and gated:

```bash
node scripts/sync-prototype.mjs                 # design/ -> public/ (code only, not media/)
node scripts/qa-prototype.mjs public/prototype  # links, anchors, images, no .html hrefs
npm run build && npm start &                    # then:
node scripts/qa-runtime.mjs                     # every route in Chromium; QA_BASE=<origin> to aim elsewhere
npm test                                        # vitest, 76 tests, includes the URL contract
```

First run of `qa-runtime.mjs` needs `npx playwright install chromium-headless-shell`.

## Layout

| Path | What |
|---|---|
| `design/prototype/` | Source of every page, the design system (`_system.css`), shared JS (`_nav.js`), data JSON, brand SVGs |
| `public/prototype/` | The deployed copy Vercel serves, plus resized `media/` |
| `scripts/lib/routes.mjs` | The URL map. The only place routes are written down |
| `next.config.ts` | Rewrites (route to file) and legacy 308 redirects, generated from the map |
| `app/` | The whole Next.js shell: layout, `not-found`, `sitemap.ts`, `robots.ts`, icon |
| `scripts/` | Sync, QA gates, nav and canonical generators, the docx content classifier |
| `New Articles - 2026/` | Source `.docx` guides (gitignored, read-only reference) |
| `docs/` | Everything below the README |

## Hard rules

No italics, no em dashes, no emoji in product copy, Inter only (Satoshi for the wordmark), no hardcoded hex, one primary button per screen. Details in [CLAUDE.md](CLAUDE.md) and [DESIGN.md](DESIGN.md).
