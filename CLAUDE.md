# CLAUDE.md

Repo-specific conventions only; stack, lanes, autonomy, reporting, Node and git rules are
in the root `CLAUDE.md`. History and rationale live in `docs/claude-md-archive.md`.

## What this repo is

**Arc Trips Destination Pages**: image-heavy destination and activity guides (Tofino,
Ucluelet, Victoria, Whistler, Banff, more) pointing travelers to curated stays. Deployed
at `https://arctrips-destination-pages.vercel.app/`.

**The site IS the prototype**: 47 static HTML pages. The Next.js app was deleted on
2026-08-12; `app/` is a shell. Build new routes as prototype pages; never rebuild it.

## The prototype ships from public/, not design/

The owner reviews the Vercel site, never localhost. Edit `design/prototype/`; Vercel
serves `public/prototype/`, rewritten onto clean routes. After any prototype edit:

```bash
npm run prototype:sync   # design/ -> public/, code only; fails on a page in one copy only
npm run qa:deployed      # gates the deployed copy
npm run qa:runtime       # needs a Next server; QA_BASE=<origin> for prod
git commit && git push   # Vercel deploys on push
```

`media/` is not synced (resized copies live in `public/`); new images go in both. **Not
done until pushed and checked on the Vercel URL.**

## Routing

- `scripts/lib/routes.mjs` is the URL map; `next.config.ts`, the QA gates,
  `nav-rebuild.mjs` and `.claude/routes.json` all read it. Never hand-edit a consumer.
- Clean nested URLs (`/tofino/hiking`) are **rewrites**, so every page references
  `_system.css`, `_nav.js`, `brand/`, `media/` as root-absolute `/prototype/...`.
- Never link to `/prototype/<page>.html` (301s; `qa-prototype.mjs` fails `.html` hrefs).
- Reference: `docs/routing.md`.

## Product rulings that still stand

- A subject has exactly one URL; a guide has exactly one home.
- Every page carries a booking path (stays here, fishing to the sister brand, other
  activities "coming soon" with email capture falling through to stays). No dead-ends.
- Navigation is the TripAdvisor idiom: sticky horizontal nav, rails, chips. **No
  sidebar, no breadcrumb dropdowns**; both were built and rejected.
- Destination switching lives in top-nav search, never the breadcrumb.

## Content source of truth

Real copy and imagery: **`New Articles - 2026/`** (gitignored, read-only `.docx`).
Edit the prototype pages, never the docs. Shared content:
`public/prototype/corpus.json` plus `climate.json`, `best-months.json`, `deep.json`.

`scripts/lib/decompose.mjs` splits one category-shaped `.docx` into intro + places +
photos + FAQs. `placeHeadings` is a per-doc whitelist of which H2s yield places; read the
doc's real H2s, never guess. No driver writes prototype pages yet; write one rather than
resurrecting the Supabase path. Covered: Tofino, Ucluelet.

## Design theme

Source of truth for the look is **`public/prototype/_system.css`** (edited as
`design/prototype/_system.css`, then synced). No live Figma exists; do not look for one.
Shell tokens: `app/globals.css` `@theme`. Inter everywhere; Satoshi only for the
`ARCTRIPS` wordmark. Brand colours and typeface are locked; layout, spacing, density,
hierarchy and motion are fair game.

Composition-level work starts with `/frontend-design`, `/impeccable`, `PRODUCT.md` and
`DESIGN.md`. If it could be any travel site, it is wrong.

## Hard rules

1. **No italics anywhere** (owner readability; `em, i` neutralised in `_system.css`).
2. **No em dashes** in copy, UI, commits or chat. Use comma, colon, parentheses, "to".
3. **No emoji** in product copy unless asked.
4. **One primary CTA per screen** (`.btn--primary`); secondary is `.btn--ghost`.
5. **No hardcoded hex**; use CSS vars from `_system.css` (or `globals.css`).
6. Never let two agents edit `_system.css` at once.
7. Cloudinary (cloud `du9doarye`): verify an ID resolves before use; old `arcstudio/*`
   IDs mostly 404.
8. Supabase is gone here; do not re-add without the owner.
9. Commits push to `origin main` (Vercel deploys), attributed to the owner, no
   `Co-Authored-By`. `npm run build` first.

## Credentials

Project credentials live in **`.env.local`** at the repo root (gitignored — never commit). `.env.example` documents the keys. Current values (setup 2026-07-23):

- **Supabase** — no longer used here (the app that read it was deleted on 2026-08-12). The keys may still sit in `.env.local`; nothing reads them.
- **Cloudinary** — cloud `du9doarye` (public): `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

Next.js reads `.env.local` automatically at dev/build. For a standalone Bash script that needs the vars, source the file first: `set -a; source .env.local; set +a`. Gemini/Nanobanana image-gen keys are **not** used in this project. If `.env.local` is missing on a fresh machine, ask the owner for the values (don't guess) and recreate it with the same gitignored status.

## Commands

Root table plus `prototype:sync`, `qa:prototype`, `qa:runtime`, `qa:deployed`. Pages are
verified by the QA gates and `shots`, not unit tests. Scripts call
`node node_modules/next/dist/bin/next` directly (Node 25 `.bin/` shim bug).

## Key files

- `design/prototype/_nav.js`: shared nav, written into pages by `scripts/nav-rebuild.mjs`.
- `next.config.ts`: rewrites and Cloudinary host allowlist.
- `.claude/routes.json`: sweep list; regenerate from `ROUTES`, never by hand.

## Token discipline

- Cheapest tool first: `curl | grep`, then `shots --fast --routes`, a browser only for JS.
- Under three files, no subagent; recon in the main thread, dispatch with exact paths.
- Read `.screens/manifest.json`, not every shot. One change per session, then `/clear`.
