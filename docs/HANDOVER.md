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

## 2. Where the backend plugs in

These are the exact seams. Each one currently fakes or hardcodes something.

| # | Seam | Today | What the backend provides | Spec |
|---|---|---|---|---|
| 1 | **Email capture**, three forms | `guide.html` (whale watching notify), `index.html` (seasonal letter), `whale-watching.html` (boats notify). Each form's submit handler calls `preventDefault()` and then shows "Thank you, you are on the list". **Nothing is stored or sent.** A visitor who subscribes today is told it worked and it did not | `POST /api/v1/subscriptions`, double opt-in, unsubscribe | [API.md](API.md) section 3 |
| 2 | **Stays** | Cards and "See all 134 / See every stay / See stays in Ucluelet" link to `/not-found`. The counts (134 Tofino, 158 Ucluelet) are hardcoded editorial numbers. `corpus.json` holds only 12 sample listings | A stays read API fed by the Arc Trips stays product, then real links to stay pages | [API.md](API.md) section 5, [DATA-SCHEMA.md](DATA-SCHEMA.md) `stay_summaries` |
| 3 | **Fishing hand-off** | "Go to ArcTrips Fishing" and "ArcTrips Fishing" link to `/not-found` | A real destination URL for the sister brand | [decisions.md](decisions.md) D-9 |
| 4 | **Site pages** | "About us", "List your place", "Contact" in the footer of 18 pages link to `/not-found` | The pages, or links to the right products | |
| 5 | **Content** | Lives in JSON files and inside the HTML | A content store with an admin write path, and a publish step that regenerates or serves the pages | [DATA-SCHEMA.md](DATA-SCHEMA.md), [API.md](API.md) sections 4 and 6 |
| 6 | **Uploads** | Images are put into Cloudinary by hand and referenced by public ID in the data | Signed upload endpoints and a media registry | [MEDIA.md](MEDIA.md), [API.md](API.md) section 6 |
| 7 | **Search** | Entirely client-side over a 170 KB data blob embedded in `search.html` | Optional. A `GET /api/v1/search` that mirrors the same scoring | [API.md](API.md) section 4, [FEATURES.md](FEATURES.md) section 4 |
| 8 | **Real 404s** | Unknown paths return Next's plain 404 (`app/not-found.tsx`). The designed 404 page lives at `/not-found` and returns 200 so it can be reviewed | Wire the designed page to real 404s with a 404 status | [FEATURES.md](FEATURES.md) section 9 |

## 3. Fixed during this handover

| Fix | Evidence |
|---|---|
| No `sitemap.xml` or `robots.txt` (both 404 in production) | `app/sitemap.ts`, `app/robots.ts`, built from the route map. 46 URLs, `/not-found` excluded |
| No canonical tags. `/Tofino` and `?x=1` served the same page as duplicate 200s | `<link rel="canonical">` on 46 pages via `scripts/canonical-rebuild.mjs`. A test fails if one drifts from its route |
| README described the deleted app (Supabase, `/destinations/[slug]`) | Rewritten |
| `docs/routing.md` said legacy URLs return 301 | They return 308. Corrected. Em dashes removed. Indexing and URL-policy sections added |
| 23 stale `.playwright-mcp` logs tracked in git | Deleted from the index and the folder ignored |

## 4. Flagged, not touched

Found, real, deliberately left for an owner decision or because the change is outside a handover.

| Item | Why it matters |
|---|---|
| **The URL structure disagrees with the PRD** | See [routing.md](routing.md) "Production URL target". The PRD (ADS page 117735426) wants `/destinations/canada/bc/{town}` on `arctrips.com`. The site is flat (`/tofino`). The PRD also says "no redirects", which conflicts with the legacy-URL 308s. Nothing was re-routed |
| Canonicals and the sitemap point at the Vercel domain | Correct today. One line to change at cutover (`SITE_ORIGIN` in `scripts/lib/routes.mjs`) |
| The 25 town pages cannot be regenerated | `deep.json` holds their content, but no script in the repo turns it into HTML. The Supabase driver that did so was deleted on 2026-08-12. Pages are edited by hand. Only the nav bar (`nav-rebuild.mjs`) and canonicals are generated |
| Page data is inlined, not fetched | `corpus.json` is not read at runtime. Pages carry their own copy. Editing the JSON changes nothing on the site until the HTML is edited |
| `deep.json` has defects that do not render today | 758 of 1,075 places carry a bare source URL (often iStock) as a body line; `vancouver-island.json` has 21 `Meta description:` prefixes and lists FAQ questions inside `places`. Clean before any of it is published |
| **Weather is attributed to Environment Canada but is unverified** | `climate.json` says it is seeded for design and not verified, and warns never to present it as fact. `tofino.html` and `long-beach.html` print it as "Environment Canada normals for the Tofino station". Verify against the ECCC record or remove the attribution. The `tides` sample is a single fixed day |
| `/Tofino` (uppercase) returns 200 | Handled by the canonical tag. A true redirect needs middleware |
| `package.json` scripts `shots` and `audit:ui` point at `/Users/aditya/Projects/arctrips/harness/...` | The owner's local screenshot and UI-audit harness, kept on purpose (PR #1). They fail anywhere else. Ignore them or delete them on your machine |
| `scripts/qa.mjs` is dead | Written for the deleted app (port 3111, sitemaps, SEO contract). It will fail. Use `qa-prototype.mjs` and `qa-runtime.mjs` |
| `docs/design-system.md` references `app/theme.css` | That file is gone. The real design system is `design/prototype/_system.css` |
| `.env.example` lists Supabase keys | Nothing reads them. Cloudinary keys are used only by one-off scripts, not the site |
| `public/ideation/nav/` is live | Five rejected navigation mockups served at `/ideation/nav`. `robots.txt` now disallows `/ideation/`, but the files are public |
| No Open Graph or Twitter tags, no JSON-LD | The PRD requires BreadcrumbList on every page and WebSite plus Organization on the home page |
| No analytics, no cookie banner, no privacy policy page | The forms promise "unsubscribe from any email"; a privacy page does not exist |
| Navigation defects the owner accepted | See `navigation-stays-as-is` in [decisions.md](decisions.md) D-6: `aria-current` on the wrong tab on Tofino subject pages, hardcoded sticky offsets, search hidden under 760 px, 14 of 24 towns with no inbound links |

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
3. Ship `POST /subscriptions` and point the three forms at it. This removes the only user-facing falsehood on the site.
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
