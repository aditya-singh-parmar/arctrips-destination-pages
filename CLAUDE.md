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
edited in `design/prototype/` but Vercel serves `public/prototype/`, rewritten
onto the clean routes in `scripts/lib/routes.mjs`. Verifying `design/` and stopping there means verifying a
copy nobody looks at. On 2026-07-30 the deployed copy was a day stale and had no
`ucluelet.html` at all, so every Ucluelet link 404'd on the live site while the
local copy passed clean.

After any prototype edit:

```bash
node scripts/sync-prototype.mjs                 # design/ -> public/, code only
node scripts/qa-prototype.mjs public/prototype  # gates against the DEPLOYED copy
node scripts/qa-runtime.mjs                     # needs a Next server; QA_BASE=<origin> for prod
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
agents edit `design/prototype/_system.css` at the same time.

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

**The site IS the prototype.** On 2026-08-12 the owner ruled that the deployed prototype
(`https://arctrips-destination-pages.vercel.app/`) is the primary
site, and the parallel Next.js app that used to serve `/` and the
`/destinations/{country}/{province}/…` tree was deleted. There is now **one** site, not
two. Build new routes as prototype pages.

Route model:
**`scripts/lib/routes.mjs` is the URL map, and the only place it is written down.**
`next.config.ts`, both QA gates, `scripts/nav-rebuild.mjs` and `.claude/routes.json`
all read it. Adding a page means adding one line there; never hand-edit the routes
in any of the consumers.

- **Clean, nested URLs** (since 2026-08-13): `/`, `/tofino`, `/tofino/things-to-do`,
  `/tofino/hiking`, `/ucluelet/whale-watching`, `/vancouver-island`, `/search`, and one
  segment per other town. A town owns its sections and its subjects, which is also what
  fixed `things-to-do.html`, `plan.html` and `guide.html` sitting at global URLs when
  all three are Tofino's.
- **Served by rewrites, not redirects.** Each route rewrites onto its static file in
  `public/prototype/`, so the clean URL is what the visitor keeps. This works only
  because every page now references `_system.css`, `_nav.js`, `brand/` and `media/`
  as **root-absolute `/prototype/...`**. Relative asset paths are what forced the old
  `/` redirect, and a new page that uses one will 404 its own CSS at depth 2.
- **The old `/prototype/<page>.html` URLs 301 to their route.** Do not link to them.
  `qa-prototype.mjs` fails any page that still writes a `.html` href.
- 47 static pages in `public/prototype/`, edited in `design/prototype/`. Navigation is
  generated into each page by `scripts/nav-rebuild.mjs`; shared content lives in
  `corpus.json`.
- The Next.js app that remains is a **shell**: `app/layout.tsx`, `app/globals.css`,
  `app/not-found.tsx`, `app/icon.svg`. Nothing else renders. Do not rebuild the deleted
  React site to satisfy a page request; add the page to the prototype.

**Visual feel is settled, not deferred.** An earlier version of this line said the look was waiting on Figma screens the owner would provide. It is not. **There is no live Figma to consult.** The prototype's design system is `design/prototype/_system.css`; brand tokens for the Next.js shell are in `app/globals.css`. Treat the direction as locked rather than provisional.

## Content source of truth

The real copy and imagery live in **`New Articles - 2026/`** at the repo root — ~74 image-heavy `.docx` guides (Tofino, Ucluelet, Victoria, Whistler, Squamish, Banff, "Agent Trek" city guides, plus activity guides: hikes, kayaking, whale watching, biking, etc.). This folder is **gitignored** (large binaries) and is treated as **read-only reference** — edit the rendered prototype pages, never the docs.

**Ingestion is a decomposer, not a copier.** The docs are already shaped like the tree: `Tofino - Beaches.docx` is not an article about beaches, it **is** the Beaches category page, where H1 is the category, H2s are its sections, and each H3 under a place-listing H2 is one beach with its own copy, "good for" bullets, "Good to know" note, and two to three embedded images.

`scripts/lib/decompose.mjs` (pure classifier, unit-tested) therefore splits **one `.docx` into a category intro + N place entries + place-tagged photos + FAQs**. Its Supabase driver (`ingest-articles.mjs`) went with the deleted app on 2026-08-12; the classifier and its tests were kept because the prototype's `corpus.json` is built from the same decomposition. A driver that writes prototype pages instead of Supabase rows does not exist yet — write one rather than resurrecting the Supabase path.

**Critical:** `placeHeadings` is an explicit per-doc whitelist of which H2s yield places. Without it the "Frequently Asked Questions" H3s become place pages titled "Can you swim in Tofino?". When mapping a new doc, open it and read its real H2 list; never guess. Docs that are not category-shaped (Whale Festival, Best Time to Stay, Campgrounds) stay whole as articles, and several span two towns.

Covered so far: Tofino + Ucluelet. The other 23 cities are a content job.

## Design theme

The committed look is the Arc Trips **"Full system" — Inter** style (an Airbnb-style stays browse experience), NOT the splash's Hanken editorial variant. It originated in a Figma CSS export Sam provided (1440 frame, 1280 content / 80px gutters). Do not go looking for the Figma file to settle a question — `design/prototype/_system.css` (426 lines) is the source of truth for the prototype, and it is what ships.

Navigation is the **TripAdvisor destination-page idiom**: a sticky horizontal nav plus horizontal rails and filter chips. There is deliberately **no sidebar**: a persistent left sidebar was built, reviewed against TripAdvisor's Tofino page, and rejected by the owner as hard to navigate. The **breadcrumb is a plain non-interactive trail**; dropdown segments were also built and rejected, because the control moved horizontally with URL depth. Destination switching belongs in the top-nav search, never the breadcrumb. Do not reintroduce either pattern.

The deleted Next.js app carried a taxonomy, a resolver and a CTA engine. Their **rulings still stand** as product decisions even though the code is gone: a subject has exactly one URL, a guide has exactly one home, and every page carries a booking path (Stays live on Arc Trips, fishing hands off to the sister brand, whale watching / kayaking / hot springs coming soon with an email capture that falls through to stays, so no page dead-ends). The old spec is `docs/superpowers/specs/2026-07-27-destinations-experience-design.md` — read it for intent, not for file paths.

## Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript — a thin shell that serves `public/` and redirects `/`. The pages themselves are hand-written static HTML.
- **Styling**: the prototype is plain CSS in `design/prototype/_system.css`. Tailwind v4 remains wired for the shell, with brand tokens (Azure/Emerald/Neutral ramps, fonts) in `app/globals.css` `@theme`.
- **Fonts**: **Inter** for all headings + body; **Satoshi** ONLY for the `ARCTRIPS` wordmark, per the Figma.
- **Content / data**: static. `public/prototype/corpus.json` plus the per-topic JSON beside it (`climate.json`, `best-months.json`, `deep.json`). **Supabase is gone** — the client, the typed data layer, the seed/ingest scripts and `supabase/migrations/` were deleted with the app on 2026-08-12. The shared instance still exists for the sibling Website-Builder project; do not re-add a dependency on it here without the owner saying so.
- **Images**: Cloudinary (cloud `du9doarye`), referenced by plain URLs in the HTML, with resized copies under `public/prototype/media`. **Caveat:** many old `arcstudio/*` public IDs have been deleted (return 404) — always verify an ID resolves (`curl -sI https://res.cloudinary.com/du9doarye/image/upload/<id>`) before using it.
- **Deploy**: Vercel (zero-config, auto-deploys on push once the repo is connected). Repository to be provided by the owner.

## Credentials

Project credentials live in **`.env.local`** at the repo root (gitignored — never commit). `.env.example` documents the keys. Current values (setup 2026-07-23):

- **Supabase** — no longer used here (the app that read it was deleted on 2026-08-12). The keys may still sit in `.env.local`; nothing reads them.
- **Cloudinary** — cloud `du9doarye` (public): `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

Next.js reads `.env.local` automatically at dev/build. For a standalone Bash script that needs the vars, source the file first: `set -a; source .env.local; set +a`. Gemini/Nanobanana image-gen keys are **not** used in this project. If `.env.local` is missing on a fresh machine, ask the owner for the values (don't guess) and recreate it with the same gitignored status.

## Commands

```bash
npm install          # install deps
npm run dev          # local dev at http://localhost:3000 — shared default, see note
npm run build        # production build (run before pushing)
npm run lint         # eslint
npm start            # serve the production build
npm test             # vitest — clean.test.mjs + decompose.test.mjs

npm run shots        # sweep every route, both viewports + themes
npm run audit:ui     # static UI-law scan, whole repo, ~1s
```

**Port:** three sibling ArcTrips repos also default to 3000. Whichever starts first wins and the rest land on 3001+ silently. This repo answers 200 on `/` with the destination home, so a sweep meant for another ArcTrips app can land here — confirm what is on the port first.

The Supabase seed and ingest scripts (`seed`, `seed:geo`, `seed:facts`, `ingest`,
`verify:ingest`, `backfill:categories`) were deleted with the app on 2026-08-12.

**Prototype gates** — `prototype:sync`, `qa:prototype`, `qa:runtime`, `qa:deployed`. See the section above; the deployed copy is what counts.

**Node version note**: scripts invoke `node node_modules/next/dist/bin/next ...` directly to work around a Node 25 `.bin/` shim resolution bug on the host machine. This form also works on Vercel (Node 22) — no change needed for deploy.

## Git workflow

This **is** a git repo with a remote. After completing a change, run `npm run build`, then commit and push to `origin main` so Vercel auto-deploys for review. **Attribute commits to the owner (Aditya Parmar)** — do **not** add a `Co-Authored-By: Claude` trailer and do **not** override the author. Just `git commit` / `git push` normally.

**Check `git status` before assuming `main` is current.** As of 2026-08-04 this repo carries an unpushed `fix/cloudinary-credit-usage` branch, one commit ahead and clean to fast-forward. See `../HANDOFF-CLOUDINARY.md` before merging it — two sibling repos are *not* safe to fast-forward, and the Cloudinary width ladder must stay byte-identical across the sibling repos that build Cloudinary URLs. This repo's copy went with `app/lib/` on 2026-08-12.

## Design system & hard rules

Built on the **official Arc Trips brand** (from the splash + product surfaces): Azure `#2874BA` (primary), Emerald `#3A9679` (secondary), navy `#0B3356`, crisp neutral paper. Tone is calm, premium, trust-forward — not promotional or discount-driven. Photography is the stage; type is restrained.

Hard rules (carried from sibling projects, non-negotiable):

1. **No italics anywhere** — the owner (Sam) has difficulty reading italic text. `em, i` are neutralized to normal weight-600 in `_system.css`. Applies to copy, UI, and code comments meant to render.
2. **No em dashes (—)** in rendered copy, UI text, commit messages, or chat replies. Use a comma, colon, parentheses, or "to" for ranges. Strip any you find when editing.
3. **No emoji** in product copy unless the owner asks.
4. **One primary CTA per screen** (`.btn--primary`); secondary actions use `.btn--ghost`.
5. No hardcoded hex colors — use the CSS vars from `_system.css` (or `globals.css` in the Next.js shell).

## Key files

- `design/prototype/` — the site source. Edit here, then `npm run prototype:sync`.
- `design/prototype/_system.css` — the whole design system, 426 lines. Source of truth for the look.
- `design/prototype/_nav.js` — shared nav behaviour; `scripts/nav-rebuild.mjs` writes the nav into each page.
- `public/prototype/` — the deployed copy, plus `media/` (resized images, deliberately not synced).
- `public/prototype/corpus.json` — shared content, read by `guide.html`, `search.html`, `things-to-do.html`, `long-beach.html`, `not-found.html`.
- `next.config.ts` — the `/` redirect to the prototype, and the Cloudinary image host allowlist.
- `app/layout.tsx`, `app/globals.css`, `app/not-found.tsx` — the entire remaining Next.js shell.
- `scripts/sync-prototype.mjs` — design to public, code only. Fails if a page exists in one copy only.
- `scripts/qa-prototype.mjs` / `qa-runtime.mjs` — link, anchor, image and runtime gates over 47 pages.
- `scripts/lib/decompose.mjs` — docx classifier, unit-tested, kept from the deleted ingestion pipeline.
- `scripts/lib/routes.mjs` — the URL map. One entry per page; every route consumer reads it.
- `.claude/routes.json` — the 47 routes `shots.mjs` sweeps. Regenerate from `ROUTES`, never by hand.

Tests run with `npm test` (vitest): `scripts/lib/clean.test.mjs` and `scripts/lib/decompose.test.mjs`, 69 tests. Pages are verified with the prototype QA gates and `scripts/shots.mjs`, not with unit tests.

## Token discipline (browser & subagents)

- Default to the cheapest tool that answers the question: `curl -sL <url> | grep` for static content, chrome-devtools-mcp for functional/JS testing, `scripts/shots.mjs` for anything visual.
- A subagent costs 25–40k tokens before doing any work. Recon in the main thread first (identify exact file:line), dispatch with explicit paths, and don't parallelize unless tasks are genuinely independent. Under three files, do not dispatch at all.
- `node scripts/shots.mjs --fast --routes <route>` is ~2s and costs nothing. Reach for it instead of a browser session; read `.screens/manifest.json` rather than looking at every shot.
- **One change per session, then `/clear`.** A session carrying four earlier tasks re-reads all of them.
