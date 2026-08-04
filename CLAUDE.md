# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working mode — size first, then ceremony

**Pick the lane before the approach** (root `CLAUDE.md` §6). The pipeline below is right
for a real feature and ruinous for a copy change — a plan agent plus a specialist agent
is 50–80k tokens and several minutes *before the first edit*, and most requests here do
not earn it.

| The change | What to do |
|---|---|
| 1–3 files, CSS, copy, spacing, a small bug | **Inline. No subagent, no plan, no skill load.** `/tweak` |
| One surface, up to ~10 files | `/task "<what>"` — plan only above ~5 files |
| A new page or a real redesign | The full pipeline below |

**Never spawn a subagent for small work.** Recon in the main thread, `Grep` for the
string, edit the file. That is the single biggest cost in this repo.

### The full pipeline — for a new page or a real redesign only

1. **Decompose** the request into testable outcomes; read the in-scope files yourself so the brief carries real paths/line numbers.
2. **Brief** — assemble a self-contained context brief (goal + acceptance criteria + exact files + the design rules below + any reference image/Figma path). Subagents don't auto-explore; hand them everything.
3. **Plan agent** writes the implementation spec → you review it against the design system and correct any guessing. Skip this below ~5 files.
4. **Specialist agent** (`frontend-design-engineer` for UI, `backend-engineer` for server/Supabase) implements from the corrected plan.
5. **Verify** — `node scripts/shots.mjs`, read `.screens/manifest.json`, fix every non-clean shot. One review round, then one fix pass, then stop.

## The prototype ships from public/, not design/

**The owner reviews the deployed Vercel site, never localhost.** The prototype is
edited in `design/prototype/` but Vercel serves `public/prototype/` at
`/prototype/<page>.html`. Verifying `design/` and stopping there means verifying a
copy nobody looks at. On 2026-07-30 the deployed copy was a day stale and had no
`ucluelet.html` at all, so every Ucluelet link 404'd on the live site while the
local copy passed clean.

After any prototype edit:

```bash
node scripts/sync-prototype.mjs                 # design/ -> public/, code only
node scripts/qa-prototype.mjs public/prototype  # gates against the DEPLOYED copy
QA_DIR=public/prototype QA_BASE=http://127.0.0.1:4399/prototype/ node scripts/qa-runtime.mjs
git commit && git push                          # Vercel deploys on push
```

`media/` is deliberately not synced: `public/prototype/media` holds resized images
(96 MB against 274 MB of originals). New images go in both, optimised on the public
side. `sync-prototype.mjs` fails if a page exists in only one copy or if a deployed
page references an image the deployed copy lacks.

**A prototype change is not done until it is pushed and checked on the Vercel URL.**

## UI work

**Design-direction work** — a new page, a redesign, "make this look better", anything
where the *composition* is the question — starts with the design skills: invoke
**`/frontend-design`** and **`/impeccable`**, and read **`PRODUCT.md`** and **`DESIGN.md`**
for the register, tone, anti-references and locked palette. Delegate implementation to
`frontend-design-engineer` with a self-contained brief: exact file paths, the design
direction, the hard rules below. Run independent surfaces in parallel; never let two
agents edit `app/theme.css` at the same time.

**Everything else** — a spacing fix, a colour token, a broken breakpoint, a wrong string
— skip all of that and just fix it. Loading two skills and two markdown files to change
a `gap-4` is the ceremony this section used to mandate and no longer does.

Verify by rendering and looking, never by reading the diff: `node scripts/shots.mjs
--routes <route>` gives both viewports and both themes in one run, with overflow,
console errors and non-200s already detected. Do not drive the browser route by route.

**Locked, never change without the owner saying so:** the brand colours in `app/globals.css` (Azure `#2874BA`, Emerald `#3A9679`, navy `#0B3356`, the neutral ramp), and Inter as the only typeface (Satoshi for the `ARCTRIPS` wordmark only). Layout, spacing, density, hierarchy, composition and motion are all fair game and are usually where the real problem is.

**The failure mode to avoid:** incremental CSS tweaks that leave the page reading as a generic marketplace card grid. `DESIGN.md` lists the anti-references. If the result could be any travel site, it is wrong.

## Project

**Arc Trips — Destination Pages.** Text- and image-heavy destination/activity guide pages for the Arc Trips **stays** experience. Each page covers a place (Tofino, Ucluelet, Victoria, Whistler, Squamish, Banff, and more) or an activity within it (day hikes, kayaking, whale watching, storm-watching), and points travelers toward curated stays there.

Route model:
- **`/`** — destinations index (list/grid of destination guides).
- **`/destinations/[slug]`** — the destination page template: hero · overview · gallery · stays · footer.

**Visual feel is settled, not deferred.** An earlier version of this line said the look was waiting on Figma screens the owner would provide. It is not: the design system landed and is in-repo — brand tokens in `app/globals.css`, the marketplace component system in `app/theme.css`, described under **Design theme** below. **There is no live Figma to consult.** Build against the token files, and treat the direction as locked rather than provisional.

## Content source of truth

The real copy and imagery live in **`New Articles - 2026/`** at the repo root — ~74 image-heavy `.docx` guides (Tofino, Ucluelet, Victoria, Whistler, Squamish, Banff, "Agent Trek" city guides, plus activity guides: hikes, kayaking, whale watching, biking, etc.). This folder is **gitignored** (large binaries) and is treated as **read-only reference** — edit the rendered content/Supabase rows, never the docs.

**Ingestion is a decomposer, not a copier.** The docs are already shaped like the tree: `Tofino - Beaches.docx` is not an article about beaches, it **is** the Beaches category page, where H1 is the category, H2s are its sections, and each H3 under a place-listing H2 is one beach with its own copy, "good for" bullets, "Good to know" note, and two to three embedded images.

`scripts/ingest-articles.mjs` (driver) plus `scripts/lib/decompose.mjs` (pure classifier, unit-tested) therefore split **one `.docx` into a category intro + N place pages + place-tagged photos + FAQs**. Because each embedded image sits directly under its place's H3, `photos.place_slug` is populated automatically, which is what lets the gallery say "Long Beach".

**Critical:** `placeHeadings` is an explicit per-doc whitelist of which H2s yield places. Without it the "Frequently Asked Questions" H3s become place pages titled "Can you swim in Tofino?". When mapping a new doc, open it and read its real H2 list; never guess. Docs that are not category-shaped (Whale Festival, Best Time to Stay, Campgrounds) stay whole as `articles`, and `articles.city_slugs` is an array because several span two towns.

Run order: `npm run seed` (creates rows) **then** `node --env-file=.env.local scripts/ingest-articles.mjs` — re-running seed wipes ingested content, so re-ingest after. Currently ingested: Tofino + Ucluelet (127 places, 284 photos, 13 categories). The other 23 cities are a data job, no new components needed.

## Design theme

The committed look is the Arc Trips **"Full system" — Inter** marketplace style (an Airbnb-style stays browse experience), NOT the splash's Hanken editorial variant. It originated in a Figma CSS export Sam provided (1440 frame, 1280 content / 80px gutters); that export has since been absorbed into `app/globals.css` and `app/theme.css`, which are now the source of truth. Do not go looking for the Figma file to settle a question. Two page types:

1. **Destinations landing page** (`/`, `app/page.tsx`) — nav → hero + search → listing rails (recently viewed, per-destination, holiday) → Explore destinations → Culture of excellence → Real stories (reviews + video card) → How it works → email capture → List-your-accommodation banner → Promise cards → Find-a-stay band → footer. **Built (Phase 1), faithful + responsive.**
2. **Destination tree pages**: **deep hierarchy, Plan 1 built (2026-07-27).** Source of truth: `docs/superpowers/specs/2026-07-27-destinations-experience-design.md`. Read that before changing structure or navigation. It supersedes the v1.1 spec on URL structure only; v1.1's taxonomy, CTA engine and navigation rulings still stand.

   ```
   /destinations/{country}/{province}/[{region}/]{town}
   /destinations/{country}/{province}/[{region}/]{town}/{area}
   /destinations/{country}/{province}/[{region}/]{town}/things-to-do[/{category}]
   /destinations/{country}/{province}/[{region}/]{town}/plan
   /travel-guides/{country}/{province}/[{region}/][{town}/]{guide}
   ```

   **Region is optional**, so a town sits at segment 3 or 4 and every deeper segment shifts with it. Position-based routing cannot express that: both trees are single catch-alls (`app/destinations/[[...path]]`, `app/travel-guides/[[...path]]`) driven by `app/lib/resolver.ts`, which walks segments and looks each slug up **scoped to its parent**, branching on the resolved node's `type`. Never add a fixed route file under these trees.

   Model is **Country → Province → [Region] → Town → Area**, with **Category as the canonical node** for subjects, drawn from one finite 22-category taxonomy (`app/lib/taxonomy.ts`), so a subject has exactly one URL. A category page exists **if and only if** a `destination_categories` row exists. Guides likewise have exactly one home, enforced by `guideBelongsToScope`.

   **No redirects inside the tree.** Archived places return 410. Trailing slashes are **rewritten** by `middleware.ts`, never redirected, because a 308 would breach the no-redirect rule. Redirects in `next.config.ts` cover only URLs shipped before this tree existed, and must stay city-specific: a generic `/:city/:category/:place` rule matches `/destinations/canada/bc` and redirects the tree into itself.

   Navigation is the **TripAdvisor destination-page idiom**: a **sticky horizontal tab bar** (`app/components/nav/TabBar.tsx`) plus horizontal **rails** and filter **chips**. There is deliberately **no sidebar**: a persistent left sidebar was built, reviewed against TripAdvisor's Tofino page, and rejected by the owner as hard to navigate. The **breadcrumb is a plain non-interactive trail**; dropdown segments were also built and rejected, because the control moved horizontally with URL depth. Destination switching belongs in the top-nav search, never the breadcrumb. Do not reintroduce either pattern.

   Every page carries a booking path via the **CTA engine** (`app/lib/cta.ts`), which derives the button from `product_lines` rows: Stays is live on Arc Trips, fishing charters hand off to the ArcTrips Fishing sister brand, and whale watching / kayaking / hot springs are coming soon. A coming-soon category captures an email **and** falls through to stays, so no page dead-ends. The **one `.btn--primary` per screen** rule is carried by the tab bar (desktop) and `DockBar` (mobile, mutually exclusive by breakpoint); `CtaBlock` is therefore `.btn--outline`.

## Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript.
- **Styling**: Tailwind v4. Brand tokens (Azure/Emerald/Neutral ramps, fonts) live in `app/globals.css` `@theme`. The marketplace design system (type ramp `.t-*`, `.container`, `.card`, `.nav`, `.hero`, `.searchbar`, `.panel`, `.masonry`, `.steps`, `.promise__*`, `.footer`, …) lives in `app/theme.css` — use these classes for structure.
- **Fonts**: **Inter** via `next/font/google` (`--font-inter`) for all headings + body; **Satoshi** (Fontshare `@import` in `globals.css`) ONLY for the `ARCTRIPS` wordmark, per the Figma.
- **Content / data**: **Supabase** (`@supabase/ssr` + `@supabase/supabase-js`), tables `destinations` / `listings` / `reviews`. Read via the typed data layer in `app/lib/content.ts`, which **falls back to the `SEED_*` content** in that file when Supabase env is absent or a table/row is missing — so the app renders identically before the tables exist. The seed is also the source for `scripts/seed.ts`. Schema in `supabase/migrations/`.
- **Images**: `next/image` + Cloudinary (cloud `djqswlfat`). `app/lib/cloudinary.ts` holds `cld()` + an `IMG` map. **Caveat:** many old `arcstudio/*` public IDs have been deleted (return 404) — always verify an ID resolves (`curl -sI https://res.cloudinary.com/djqswlfat/image/upload/<id>`) before adding it to `IMG`. `next.config.ts` allows `res.cloudinary.com/djqswlfat/**`.
- **Deploy**: Vercel (zero-config, auto-deploys on push once the repo is connected). Repository to be provided by the owner.

## Credentials

Project credentials live in **`.env.local`** at the repo root (gitignored — never commit). `.env.example` documents the keys. Current values (setup 2026-07-23):

- **Supabase** — reused from the sibling **Website-Builder (ArcStudio)** instance: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- **Cloudinary** — cloud `djqswlfat` (public): `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

Next.js reads `.env.local` automatically at dev/build. For a standalone Bash script that needs the vars, source the file first: `set -a; source .env.local; set +a`. Gemini/Nanobanana image-gen keys are **not** used in this project. If `.env.local` is missing on a fresh machine, ask the owner for the values (don't guess) and recreate it with the same gitignored status.

## Commands

```bash
npm install          # install deps
npm run dev          # local dev at http://localhost:3000 — shared default, see note
npm run build        # production build (run before pushing)
npm run lint         # eslint
npm start            # serve the production build
npm test             # vitest — cta.test.ts + decompose.test.mjs

npm run shots        # sweep every route, both viewports + themes
npm run audit:ui     # static UI-law scan, whole repo, ~1s
```

**Port:** three sibling ArcTrips repos also default to 3000. Whichever starts first wins and the rest land on 3001+ silently. This repo answers 200 on `/`, so a sweep meant for another ArcTrips app can land here and report clean — confirm what is on the port first.

**Data and content scripts** (all need `.env.local`; `seed` wipes ingested content, so re-ingest after):

```bash
npm run seed                 # create rows      npm run seed:geo    # geo tree
npm run seed:facts           # facts            npm run concepts    # concept rows
npm run ingest               # docx -> Supabase (see Content source of truth)
npm run verify:ingest        # check what landed
npm run backfill:categories  # category backfill
```

**Prototype gates** — `prototype:sync`, `qa:prototype`, `qa:runtime`, `qa:deployed`. See the section above; the deployed copy is what counts.

**Node version note**: scripts invoke `node node_modules/next/dist/bin/next ...` directly to work around a Node 25 `.bin/` shim resolution bug on the host machine. This form also works on Vercel (Node 22) — no change needed for deploy.

## Git workflow

This **is** a git repo with a remote. After completing a change, run `npm run build`, then commit and push to `origin main` so Vercel auto-deploys for review. **Attribute commits to the owner (Aditya Parmar)** — do **not** add a `Co-Authored-By: Claude` trailer and do **not** override the author. Just `git commit` / `git push` normally.

**Check `git status` before assuming `main` is current.** As of 2026-08-04 this repo carries an unpushed `fix/cloudinary-credit-usage` branch, one commit ahead and clean to fast-forward. See `../HANDOFF-CLOUDINARY.md` before merging it — two sibling repos are *not* safe to fast-forward, and the ladder in `app/lib/cloudinary.ts` must stay byte-identical across all four repos that build Cloudinary URLs.

## Design system & hard rules

Built on the **official Arc Trips brand** (from the splash + product surfaces): Azure `#2874BA` (primary), Emerald `#3A9679` (secondary), navy `#0B3356`, crisp neutral paper. Tone is calm, premium, trust-forward — not promotional or discount-driven. Photography is the stage; type is restrained.

Hard rules (carried from sibling projects, non-negotiable):

1. **No italics anywhere** — the owner (Sam) has difficulty reading italic text. `em, i` are neutralized to normal weight-600 in `theme.css`. Applies to copy, UI, and code comments meant to render.
2. **No em dashes (—)** in rendered copy, UI text, commit messages, or chat replies. Use a comma, colon, parentheses, or "to" for ranges. Strip any you find when editing.
3. **No emoji** in product copy unless the owner asks.
4. **One primary CTA per screen** (`.btn--primary`); secondary actions use `.btn--ghost`.
5. No hardcoded hex colors in components — use the brand tokens / CSS vars from `globals.css` and `theme.css`.

## Key files

- `app/globals.css` — Tailwind v4 `@theme` brand tokens (color ramps, fonts, radius/shadow).
- `app/theme.css` — all component classes + hard-rule enforcement (`em,i` reset). v1.1 blocks: `.tabbar`, `.rail`, `.chiprow`, `.pcard`, `.cta--live/--sister/--soon`, `.dockbar`, `.toc`.
- `app/layout.tsx` — root layout, Inter font wiring, metadata.
- `app/page.tsx` — marketplace landing page.
- `app/destinations/[[...path]]/page.tsx`: the whole destination tree. One catch-all, no fixed route files beneath it.
- `app/travel-guides/[[...path]]/page.tsx`: the guide tree. The location path may terminate at province, region or town.
- `app/lib/resolver.ts`: segment resolvers for both trees plus `guideBelongsToScope`. Pure over an injected lookup, unit-tested.
- `app/lib/geo-types.ts`: `GeoNode`, child-type legality, `geoPath` / `guidePath` URL builders. Pure.
- `app/lib/geo.ts`: geo tree reads, Supabase with SEED fallback, plus `pathForTownSlug` for building links from a city slug.
- `app/lib/slug.ts`: ASCII transliteration and the reserved-slug list.
- `app/components/templates/`: `DestinationsLanding`, `DestinationHub`, `CategoryGuide`, `GuideDetail`. Routes resolve, templates render.
- `middleware.ts`: trailing-slash rewrite.
- `app/guides/[slug]/page.tsx`: pre-tree article URLs, kept alive, sharing `GuideDetail` so the two routes cannot drift.
- `app/lib/taxonomy.ts` — the finite 22-category list, themes, product lines, `THEME_GRID_THRESHOLD`.
- `app/lib/cta.ts` — pure CTA resolver. Unit-tested. Never hardcode a booking button; render what this returns.
- `app/lib/content.ts` — types + reads for region/city/category/place/photo/experience, all Supabase→SEED fallback so pages render without Supabase.
- `app/lib/supabase.ts` — `getServerSupabase()` (anon, read-only) + `getServiceSupabase()` (service role, ingestion only).
- `app/lib/cloudinary.ts` — `cld()` URL builder + `IMG` public-ID map.
- `supabase/migrations/0001_destinations.sql` — `destinations` (the city table) + RLS.
- `supabase/migrations/0002_tree.sql` — regions, categories, city_categories, places, photos, product_lines, category_products, experiences, notify_signups. **Additive only**: the Supabase instance is shared with the sibling Website-Builder project, so never drop or rename anything here.

Tests run with `npm test` (vitest). Only pure logic is tested: `app/lib/cta.test.ts` and `scripts/lib/decompose.test.mjs`. Pages are verified with `npm run build` and by loading them.

## Token discipline (browser & subagents)

- Default to the cheapest tool that answers the question: `curl -sL <url> | grep` for static content, chrome-devtools-mcp for functional/JS testing, `scripts/shots.mjs` for anything visual.
- A subagent costs 25–40k tokens before doing any work. Recon in the main thread first (identify exact file:line), dispatch with explicit paths, and don't parallelize unless tasks are genuinely independent. Under three files, do not dispatch at all.
- `node scripts/shots.mjs --fast --routes <route>` is ~2s and costs nothing. Reach for it instead of a browser session; read `.screens/manifest.json` rather than looking at every shot.
- **One change per session, then `/clear`.** A session carrying four earlier tasks re-reads all of them.
