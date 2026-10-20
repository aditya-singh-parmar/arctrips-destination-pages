# Handover

For the developer building the backend. Written 2026-10-20 from a full audit of the repo and the live site. Everything stated here was checked against the code or the deployment; where something is inferred it says so.

## 1. What you are inheriting

| Item | State |
|---|---|
| Site | https://arctrips-destination-pages.vercel.app, 47 routes, all return 200 |
| Code | Hand-written static HTML, one shared CSS file, small inline JS per page. No framework in the pages |
| Shell | Next.js 16 App Router, serving `public/` through rewrites. It renders nothing itself except 404, `sitemap.xml`, `robots.txt` |
| Runtime backend | **None.** Zero `fetch` calls, zero API routes, no database reads, no cookies, no `localStorage` |
| Data | Baked into pages at authoring time from `corpus.json`, `climate.json`, `best-months.json`, `deep.json`, `vancouver-island.json` |
| Images | Cloudinary cloud `du9doarye` by URL, plus 96 MB of resized local images under `public/prototype/media` |
| CI | None. No `.github/workflows`. Verification is the local gates in [OPERATIONS.md](OPERATIONS.md) |
| Domain | Only `arctrips-destination-pages.vercel.app` is attached to the Vercel project. The PRD names `arctrips.com` as production |
| Supabase | Not used by this repo since 2026-08-12. The instance still exists and is shared with the sibling Website-Builder project |

Checks run on 2026-10-20, all green: `npm test` (76 tests), `npm run build`, `tsc --noEmit`, `qa-prototype.mjs` (47 pages, every link, anchor and image valid), `qa-runtime.mjs` (0 of 47 pages with errors), a sweep of Cloudinary images (all 156 image IDs in `corpus.json` and the 223 URLs written directly in pages: every one resolves), and a production request to every one of the 47 routes. `npm run lint` has one pre-existing warning in `scripts/lib/decompose.mjs`.

## 2. What the build must deliver

**This site is a deliberate front-end prototype.** The owner built it without a backend on purpose, as the design and behaviour reference for the real build. Every item below is a stub by design. The prototype is the spec for the UI, copy, states and URLs; the build team's job is to make each stub real without changing how it looks or reads.

| # | Build item | Prototype behaviour (this is the spec) | What to build | Detail |
|---|---|---|---|---|
| 1 | **Email capture**, three forms | `index.html` (seasonal letter), `whale-watching.html` (boats go live), `guide.html` (tours open). Form, validation message slots, consent line and confirmation state are final design. Submit currently shows the confirmation only | Real subscriptions: store, double opt-in email, unsubscribe, consent record, rate limiting. Make the consent box mandatory | [API.md](API.md) section 3 |
| 2 | **Stays** | Stay cards, "See all 134 / See every stay / See stays in Ucluelet", counts (134 Tofino, 158 Ucluelet) and "from $320" are placeholder content. `corpus.json` holds 12 sample listings. Links go to `/not-found` | Stays read model fed by the Arc Trips stays product; real counts and prices; links to real stay pages. Business rules come from the ADS PRDs | [API.md](API.md) section 5, [DATA-SCHEMA.md](DATA-SCHEMA.md) `stay_summaries` |
| 3 | **Fishing hand-off** | "Go to ArcTrips Fishing" and "ArcTrips Fishing" link to `/not-found` | The real destination URL for the sister brand | [decisions.md](decisions.md) D-9 |
| 4 | **Site pages** | "About us", "List your place", "Contact" in the footer of 18 pages link to `/not-found` | The pages, or links to the right products | |
| 5 | **Content management** | Content lives in JSON files and inside the HTML | A content store, an admin write path, draft and publish, and a way for published content to reach the pages | [DATA-SCHEMA.md](DATA-SCHEMA.md), [API.md](API.md) sections 4 and 6 |
| 6 | **Uploads** | Images are put into Cloudinary by hand and referenced by public ID | Signed upload endpoints, a media registry, required alt text | [MEDIA.md](MEDIA.md), [API.md](API.md) section 6 |
| 7 | **Search** | Client-side over a 170 KB blob embedded in `search.html`; ranking weights are the spec | `GET /search` with the same scoring (optional; can stay client-side at this size) | [API.md](API.md) section 4, [FEATURES.md](FEATURES.md) section 4 |
| 8 | **Real 404s** | Unknown paths show Next's plain 404. The designed 404 lives at `/not-found` so it can be reviewed | Serve the designed page for real 404s with status 404 | [FEATURES.md](FEATURES.md) section 9 |
| 9 | **Weather and tides** | `climate.json` is seeded sample data, shown as "Environment Canada normals for the Tofino station". The tide block is one sample day | A verified source (ECCC normals; Canadian Hydrographic Service for tides) before launch | [DATA-SCHEMA.md](DATA-SCHEMA.md) section 0 |
| 10 | **Analytics, privacy, consent** | None | Analytics, a privacy page (the forms promise "unsubscribe from any email"), cookie handling if needed | |

### Build checklist (done when)

| # | Done when |
|---|---|
| 1 | Submitting each form stores a pending subscription, sends a confirmation email, confirms on click, and unsubscribe works from any email. The three forms show loading, success, validation error and rate-limited states using the existing design. Unticked consent blocks submit |
| 2 | Tofino and Ucluelet stay cards, counts and prices come from the stays product. No link to a stay goes to `/not-found` |
| 3 to 4 | No footer or hand-off link on any of the 47 pages resolves to `/not-found` (a gate can grep for it) |
| 5 | An editor can create, edit, preview and publish a place, guide or article, and the live page reflects it. The 47 existing URLs keep resolving and keep their canonical |
| 6 | An editor uploads an image, must enter alt text, and can attach it to a place. The public ID follows the convention in [MEDIA.md](MEDIA.md) |
| 7 | Search results match the prototype for the same queries (weights 18, 14, 5, 6, 2) |
| 8 | `GET /nonsense` returns HTTP 404 with the designed page |
| 9 | Every weather figure on the site has a cited, verified source |
| 10 | A privacy page exists and is linked from every form |

## 3. Fixed during this handover

| Fix | Evidence |
|---|---|
| No `sitemap.xml` or `robots.txt` (both 404 in production) | `app/sitemap.ts`, `app/robots.ts`, built from the route map. 46 URLs, `/not-found` excluded |
| No canonical tags. `/Tofino` and `?x=1` served the same page as duplicate 200s | `<link rel="canonical">` on 46 pages via `scripts/canonical-rebuild.mjs`. A test fails if one drifts from its route |
| README described the deleted app (Supabase, `/destinations/[slug]`) | Rewritten |
| `docs/routing.md` said legacy URLs return 301 | They return 308. Corrected. Em dashes removed. Indexing and URL-policy sections added |
| 23 stale `.playwright-mcp` logs tracked in git | Deleted from the index and the folder ignored |

## 4. Things to know

Found during the audit and deliberately left unchanged: owner decisions, accepted gaps, or clean-up that belongs to the build.

| Item | Why it matters |
|---|---|
| **The URL structure disagrees with the PRD** | See [routing.md](routing.md) "Production URL target". The PRD (ADS page 117735426) wants `/destinations/canada/bc/{town}` on `arctrips.com`. The site is flat (`/tofino`). The PRD also says "no redirects", which conflicts with the legacy-URL 308s. Nothing was re-routed |
| Canonicals and the sitemap point at the Vercel domain | Correct today. One line to change at cutover (`SITE_ORIGIN` in `scripts/lib/routes.mjs`) |
| The 24 content-only town pages cannot be regenerated | `deep.json` holds their content, but no script in the repo turns it into HTML. The Supabase driver that did so was deleted on 2026-08-12. Pages are edited by hand. Only the nav bar (`nav-rebuild.mjs`) and canonicals are generated |
| Page data is inlined, not fetched | `corpus.json` is not read at runtime. Pages carry their own copy. Editing the JSON changes nothing on the site until the HTML is edited |
| `deep.json` needs clean-up before import | 758 of 1,075 places carry a bare source URL (often iStock) as a body line; `vancouver-island.json` has 21 `Meta description:` prefixes and lists FAQ questions inside `places`. Clean before any of it is published |
| Weather figures are placeholder data | `climate.json` is seeded for design and marked unverified, while `tofino.html` and `long-beach.html` label it "Environment Canada normals for the Tofino station". Build item 9 replaces it with verified data. The `tides` sample is a single fixed day |
| `/Tofino` (uppercase) returns 200 | Handled by the canonical tag. A true redirect needs middleware |
| `package.json` scripts `shots` and `audit:ui` point at `/Users/aditya/Projects/arctrips/harness/...` | The owner's local screenshot and UI-audit harness, kept on purpose (PR #1). They fail anywhere else. Ignore them or delete them on your machine |
| `scripts/qa.mjs` is obsolete | Written for the deleted app (port 3111, sitemaps, SEO contract). It will fail. Use `qa-prototype.mjs` and `qa-runtime.mjs` |
| `docs/design-system.md` references `app/theme.css` | That file is gone. The real design system is `design/prototype/_system.css` |
| `.env.example` lists Supabase keys | Nothing reads them. nothing in this repo reads the Cloudinary keys either; the backend's signed uploads will |
| `public/ideation/nav/` is live | Five rejected navigation mockups served at `/ideation/nav`. `robots.txt` now disallows `/ideation/`, but the files are public |
| No Open Graph or Twitter tags, no JSON-LD | The PRD requires BreadcrumbList on every page and WebSite plus Organization on the home page |
| No analytics, no cookie banner, no privacy policy page | The forms promise "unsubscribe from any email"; the privacy page is part of build item 10 |
| Known navigation gaps the owner accepted | See `navigation-stays-as-is` in [decisions.md](decisions.md) D-6: `aria-current` on the wrong tab on Tofino subject pages, hardcoded sticky offsets, search hidden under 760 px, 14 of 24 towns with no inbound links |

## 5. Owner decisions needed

Each is a stated assumption until the named person rules. None blocks reading the docs.

| # | Decision | Assumed until decided | Owner |
|---|---|---|---|
| 1 | Production URL shape: keep flat, or move to the PRD tree. Whale watching, kayaking and fishing guide pages: under `things-to-do` or under their own section | Flat tree stays | Aditya Parmar |
| 2 | Production domain and cutover date | Vercel URL | Aditya Parmar |
| 3 | Email provider, double opt-in copy, retention, who receives the lists | Double opt-in, one list per topic, see [API.md](API.md) section 3 | Aditya Parmar |
| 4 | Where stays links go before stay pages exist | `/not-found` stays | Aditya Parmar |
| 5 | Province for `st-john` (St. John's NL or Saint John NB) | Unresolved, no URL assigned | Aditya Parmar |
| 6 | Business rules for stays (fees, availability, cancellation) | **Out of scope here.** This repo shows no prices beyond sample "from $X" copy; the stays rules live in the ADS PRDs | Owner of the ADS stays PRDs (to be named) |

## 6. Suggested order of work

1. Read [routing.md](routing.md) and get decision 1 and 2 made, because everything else keys off URLs.
2. Stand up the content store from [DATA-SCHEMA.md](DATA-SCHEMA.md) and load the existing JSON (a loader outline is in section 6 of that file).
3. Ship `POST /subscriptions` and point the three forms at it (build item 1), the smallest end-to-end slice.
4. Add admin content CRUD and signed media upload.
5. Decide render strategy (see [ARCHITECTURE.md](ARCHITECTURE.md) section 7). Keep every URL in `ROUTES` stable while doing it.
6. Add a GitHub Actions workflow running the gates in [OPERATIONS.md](OPERATIONS.md) so merges can be blocked on red.

## Future work

- Generate town pages from the content store, retiring hand-edited HTML.
- BreadcrumbList, WebSite and Organization JSON-LD, Open Graph tags.
- Redirect uppercase URLs in middleware.
- Remove `scripts/qa.mjs` and `docs/design-system.md` drift.
- CI workflow with `npm test`, `qa:prototype`, `build`, `qa:runtime`.
- Retire `public/ideation/`.
