# Decisions

Owner rulings and the reasons, so the next developer does not re-litigate them. Newest last. "Owner" is Aditya Parmar unless stated. Reversal needs the owner.

| ID | Date | Decision | Why | Where it lives |
|---|---|---|---|---|
| D-1 | by 2026-07-24 | Inter for all text; Satoshi for the `ARCTRIPS` wordmark only. Brand colours locked: Azure `#2874BA`, Emerald `#3A9679`, navy `#0B3356`, the neutral ramp | The committed "Full system, Inter" look | `design/prototype/_system.css`, `DESIGN.md` |
| D-2 | July 2026 | No italics anywhere; no em dashes; no emoji in product copy; one primary button per screen; no hardcoded hex | A reader on the team has difficulty with italic text; house style | `CLAUDE.md` |
| D-3 | July 2026 | A persistent left sidebar and dropdown breadcrumb segments were built, reviewed and rejected. Do not reintroduce | Sidebar was hard to navigate; the dropdown control moved horizontally with URL depth | `CLAUDE.md` Design theme |
| D-4 | 2026-07-27 | The deep hierarchy `/destinations/{country}/{province}/...` was approved as the IA | Matched the URL PRD | `docs/superpowers/specs/2026-07-27-destinations-experience-design.md` |
| D-5 | 2026-07-30 | British Columbia is the tree root. Canada is not a page or a breadcrumb | Everything the product does is in BC | `docs/qa/bc-root-contract.md` |
| D-6 | 2026-08-12 | The three-bar navigation (global nav, place bar, subject rail, plain breadcrumb) stays as built. Five alternatives were mocked and rejected | Owner: "We'll stick with our existing navigation." Do not propose an overhaul | `public/ideation/nav/`, `docs/ideation/nav-round2-brief.md` |
| D-7 | 2026-08-12 | The deployed prototype is the site. The parallel Next.js app and Supabase layer were deleted | One site, not two | `CLAUDE.md` |
| D-8 | 2026-08-12 | Stays removed from the navigation and "Find a stay" CTAs (commit `1797b99`) | Reason not recorded in the commit; stay pages do not exist yet (inferred). Stay cards on some pages remain and link to `/not-found` | git history |
| D-9 | 2026-08-12 | Booking-path rule: every page carries a way forward. Stays on Arc Trips, fishing hands off to the sister brand, whale watching, kayaking and hot springs are "coming soon" with an email capture that falls through to stays. A subject has exactly one URL; a guide has exactly one home | No page dead-ends | `CLAUDE.md`; implementation incomplete, see [HANDOVER.md](HANDOVER.md) section 2 |
| D-10 | 2026-08-12 | Clean nested URLs replace `/prototype/<page>.html`. Served by rewrites, not redirects. Assets root-absolute. `scripts/lib/routes.mjs` is the only route table | Owner wanted "a proper app"; three Tofino-only pages held global URLs | [routing.md](routing.md) |
| D-11 | 2026-08-12 | The geo tree `/destinations/{country}/{province}/{town}` is rejected for the built site (supersedes D-4 here) | BC is the root (D-5); the app that implemented the tree was deleted | [routing.md](routing.md) |
| D-12 | 2026-08-12 | `/not-found` returns 200 on purpose: it is a design surface the sweep checks. Real 404s use `app/not-found.tsx` | Gates need the page reachable | [routing.md](routing.md) |
| D-13 | 2026-08-12 | The prototype ships from `public/`, not `design/`. The owner reviews the deployed Vercel URL only. `media/` is not synced | A stale deployed copy once 404'd every Ucluelet link while local passed | `CLAUDE.md` |
| D-14 | 2026-08-12 | Supabase is not a dependency of this repo. The shared instance serves Website-Builder; do not re-add a dependency without the owner | Instance is shared; keys may linger in `.env.local` | `CLAUDE.md` |
| D-15 | 2026-10-20 | Add `rel=canonical`, `sitemap.xml`, `robots.txt`, all from the route map. Canonical origin is the Vercel URL until a domain exists. No trailing slash; root is the bare origin | Duplicate 200s (`/Tofino`, query strings) and no crawl surface; the PRD requires self-referencing canonicals without a trailing slash | `scripts/canonical-rebuild.mjs`, `app/sitemap.ts`, `app/robots.ts` |
| D-16 | 2026-10-20 | Handover documentation lives in this repo (`docs/`) | The backend developer works from GitHub | this folder |
| D-17 | 2026-10-20 | The prototype's stubs are intentional: email forms show confirmation only, stays and fishing and About/List/Contact links go to `/not-found`, sample listings, placeholder counts and weather. They exist so the build team has the finished UI and copy to implement against | Owner: the prototype is fake on purpose and is being handed to the real build | [HANDOVER.md](HANDOVER.md) section 2 |

## Assumptions awaiting an owner ruling

| # | Assumption in force | Needs | Owner |
|---|---|---|---|
| A-1 | The flat URL tree stands over the PRD's `/destinations/canada/bc/...` | Ruling on production URL shape and the "no redirects" clause ([routing.md](routing.md)) | Aditya Parmar |
| A-2 | `SITE_ORIGIN` is the Vercel URL | Production domain | Aditya Parmar |
| A-3 | Whale watching forms are one topic | Confirm, or split into two | Aditya Parmar |
| A-4 | Province for `st-john` | St. John's NL or Saint John NB | Aditya Parmar |
| A-5 | Climate figures are unverified and must not be asserted as Environment Canada data | Verify or reword | Aditya Parmar |
| A-6 | Rate limits and token lifetimes in [API.md](API.md) | Confirm | Aditya Parmar |
