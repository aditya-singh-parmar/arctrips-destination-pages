# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working mode — delegate, don't guess

For any **substantive build/design/refactor request**, do NOT implement directly from the raw prompt. Translate it into a precise spec and run **Plan → Build → Verify** via subagents:

1. **Decompose** the request into testable outcomes; read the in-scope files yourself so the brief carries real paths/line numbers.
2. **Brief** — assemble a self-contained context brief (goal + acceptance criteria + exact files + the design rules below + any reference image/Figma path). Subagents don't auto-explore; hand them everything.
3. **Plan agent** writes the implementation spec → you review it against the design system and correct any guessing.
4. **Specialist agent** (`frontend-design-engineer` for UI, `backend-engineer` for server/Supabase) implements from the corrected plan.
5. **Verify** — `npm run build` and Read/render the result before claiming done; loop back on any defect.

You are the architect and reviewer. Trivial one-line tweaks and plain questions can be answered directly — the pipeline is for anything that would otherwise be reactive guesswork.

## Project

**Arc Trips — Destination Pages.** Text- and image-heavy destination/activity guide pages for the Arc Trips **stays** experience. Each page covers a place (Tofino, Ucluelet, Victoria, Whistler, Squamish, Banff, and more) or an activity within it (day hikes, kayaking, whale watching, storm-watching), and points travelers toward curated stays there.

Route model:
- **`/`** — destinations index (list/grid of destination guides).
- **`/destinations/[slug]`** — the destination page template: hero · overview · gallery · stays · footer.

**Visual feel is deferred.** The committed look for these pages comes from **Figma screens the owner will provide**. Until then, the app renders on the locked Arc Trips brand tokens with restrained placeholder styling in `app/theme.css` — do not over-invest in section aesthetics before Figma lands; replace the starter section styles there once it does.

## Content source of truth

The real copy and imagery live in **`New Articles - 2026/`** at the repo root — ~74 image-heavy `.docx` guides (Tofino, Ucluelet, Victoria, Whistler, Squamish, Banff, "Agent Trek" city guides, plus activity guides: hikes, kayaking, whale watching, biking, etc.). This folder is **gitignored** (large binaries) and is treated as **read-only reference** — edit the rendered content/Supabase rows, never the docs.

Ingestion (docx → Supabase rows + images → Cloudinary) is a **later task, not yet built**. Until a destination is ingested, its page renders from the placeholder content in `app/lib/content.ts`.

## Design theme (Figma source of truth)

The committed look is the Arc Trips **"Full system" — Inter** marketplace style (an Airbnb-style stays browse experience), NOT the splash's Hanken editorial variant. Source: the Figma CSS export Sam provided (1440 frame, 1280 content / 80px gutters). Two page types:

1. **Destinations landing page** (`/`, `app/page.tsx`) — nav → hero + search → listing rails (recently viewed, per-destination, holiday) → Explore destinations → Culture of excellence → Real stories (reviews + video card) → How it works → email capture → List-your-accommodation banner → Promise cards → Find-a-stay band → footer. **Built (Phase 1), faithful + responsive.**
2. **Area/destination pages** (`/destinations/[slug]`, `app/components/area/*`) — city/area pages with a **sticky section jump-menu** (sidebar on desktop, horizontal bar on mobile, scrollspy): Overview · Things to do · Guides & articles · Where to stay · Gallery. Guides link to **article pages** (`/destinations/[slug]/guides/[guide]`) that currently render title/hero/excerpt + a "full guide coming soon" note. **Built as a first cut** (Phase 2); the exact section structure will be refined against Sam's "Destination structure page" + Herm's input, and article bodies come from ingesting the New Articles corpus (not yet built).

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
npm run dev          # local dev at http://localhost:3000
npm run build        # production build (run before pushing)
npm run lint         # eslint
npm start            # serve the production build
```

**Node version note**: scripts invoke `node node_modules/next/dist/bin/next ...` directly to work around a Node 25 `.bin/` shim resolution bug on the host machine. This form also works on Vercel (Node 22) — no change needed for deploy.

## Git workflow

The repository will be provided by the owner (not yet initialized here). Once connected: after completing a change, run `npm run build`, then commit and push to `origin main` so Vercel auto-deploys for review. **Attribute commits to the owner (Aditya Parmar)** — do **not** add a `Co-Authored-By: Claude` trailer and do **not** override the author. Just `git commit` / `git push` normally.

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
- `app/theme.css` — starter destination-page component classes + hard-rule enforcement (`em,i` reset). Replace section styles here when Figma lands.
- `app/layout.tsx` — root layout, Hanken Grotesk font wiring, metadata.
- `app/page.tsx` — destinations index.
- `app/destinations/[slug]/page.tsx` — the destination page template (`generateStaticParams` + `generateMetadata`).
- `app/components/destination/*` — `DestinationHero`, `Overview`, `Gallery`, `StaysList`, `Footer`.
- `app/lib/content.ts` — `Destination` type + `getDestination` / `getAllDestinations` with Supabase→placeholder fallback. Placeholder content (Tofino, Ucluelet) lives here.
- `app/lib/supabase.ts` — `getServerSupabase()` (anon, read-only) + `getServiceSupabase()` (service role, ingestion only).
- `app/lib/cloudinary.ts` — `cld()` URL builder + `IMG` public-ID map.
- `supabase/migrations/0001_destinations.sql` — `destinations` table + RLS (public read of `published` rows; writes via service role).

## Token discipline (browser & subagents)

- Default to the cheapest tool that answers the question: `curl -sL <url> | grep` for static content, chrome-devtools-mcp for functional/JS testing, ONE screenshot only for visual sign-off.
- A subagent costs 25–40k tokens before doing any work. Recon in the main thread first (identify exact file:line), dispatch with explicit paths, and don't parallelize unless tasks are genuinely independent.
