# Prototype QA, shared context

Three agents audit 45 pages in parallel. Everyone reads this file first and appends
findings to `docs/qa/findings.md` as they go, so the others can see them.

## The prototype
- Served at `http://127.0.0.1:4321/prototype/<page>.html` (no-cache server, a plain reload is current).
- Source files: `design/prototype/*.html`. Shared system: `_system.css` (LOCKED, never edit).
  Shared place-bar behaviour: `_nav.js`.
- Inventory of all 45 pages: `docs/qa/inventory.json`.

## What the product is
Arc Trips destination guides. The tree is Canada > province > region > town > places.
25 towns, 1,108 documented places, 837 photographed, extracted from the owner's Word documents.
Tofino and Ucluelet are the deepest. Everything else is a real page with real prose and photos.

## The rules a page must obey
1. Global nav identical on every page: Stays, Destinations, Guides.
2. Place bar: `<- {parent}` then that page's own sections. Never another town's sections.
3. Breadcrumb in the body above the H1. Every ancestor a real link, only the current page plain.
4. Exactly one visible `.btn--primary` per breakpoint.
5. No green as a season signal (it reads as TripAdvisor). In season = navy, out = neutral.
6. No em dashes, no italics, no emoji. Inter only. No raw hex, tokens only.
7. Nothing below 14px. No month or category greyed out or shown as a warning.
8. Zero horizontal overflow at 390px. Contrast 4.5:1. Touch targets 44px. alt on every image.
9. Every page ends with a next step, never a bare footer.
10. Context must match: a Whistler page must not offer Tofino's sections or Vancouver Island framing.

## Known-good baseline
`node scripts/qa-prototype.mjs` passes clean. It checks structure only, not appearance
or behaviour. Your job is what it cannot see.

## How to report
Append to `docs/qa/findings.md` using this exact shape, one block per issue:

```
### [SEVERITY] page.html - short title
- **Where**: section or element
- **Seen**: what is actually on screen
- **Expected**: what should be there
- **Width**: 1440 / 390 / both
```
SEVERITY is BLOCKER (breaks a demo), MAJOR (visibly wrong), MINOR (polish).
If a page is clean, add one line to `docs/qa/findings.md`: `CLEAN: page.html`.
