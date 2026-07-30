# British Columbia becomes the root

Decided 2026-07-30. Arc Trips launches in Ucluelet and Tofino, British Columbia.
Everything the product does is in BC, so Canada is a level the reader is made to
walk through for nothing. It goes.

This contract is the single ruling both workstreams build to. Do not renegotiate
it mid-task; if you believe a clause is wrong, implement it and say so in your
report.

## The tree, before and after

```
before   Arc Trips / Canada / British Columbia / Vancouver Island / Tofino / Long Beach
after    Arc Trips / British Columbia / Vancouver Island / Tofino / Long Beach
```

Two levels are removed as *pages*, not as concepts:

- **`country.html` is deleted.** Canada is not a page and not a breadcrumb
  segment anywhere.
- **`province.html` is deleted.** `index.html` becomes the British Columbia home
  and absorbs what province.html carried. Two pages both titled British Columbia
  is the redundancy this change exists to remove.

`region.html` (Vancouver Island) stays. It is a real level with fifteen towns
under BC and eleven under it.

Resulting levels: **BC (`index.html`) → region → town → area**, with `things-to-do`,
`plan` and `guides` as sections of a town, per the navigation contract.

## URL structure, Next app

```
before   /destinations/canada/bc/vancouver-island/tofino
after    /destinations/bc/vancouver-island/tofino
```

The country segment is gone from the destination tree and the travel-guide tree.
`GeoType` keeps `country` in the union only if the data layer still needs it;
the resolver must not require a country segment, and `root` legally parents
`province`.

Old URLs that shipped with `/canada/` must **redirect permanently** in
`next.config.ts`. This is the one place redirects are allowed: the no-redirect
rule covers URLs *inside* the tree, and these are URLs from before the tree
changed shape. Keep them specific enough not to swallow the new tree, the trap
already documented in that file.

Sitemaps, canonicals and BreadcrumbList JSON-LD all follow the new depth.

## The eleven towns outside BC

banff, jasper, edmonton, saskatoon, montreal, quebec-city, ottawa,
niagara-falls, halifax, charlottetown, st-john.

They carry real ingested content, so they are **not deleted**. They leave the
destination tree:

- Reachable from search, and from nowhere in the BC tree.
- Breadcrumb is `Arc Trips / <Town>`. No Canada segment, no province page to
  point at.
- Each carries one plain line saying Arc Trips publishes in British Columbia and
  this town is not part of the published tree yet. No em dashes, no apology.
- They must not appear in any BC count.

## Counts, after

Recount from the pages themselves; do not copy these if the pages disagree.

| Figure | Value |
|---|---|
| Towns in British Columbia | 15 |
| Towns on Vancouver Island | 11 |
| Towns published in full | 2 (Tofino, Ucluelet) |
| Towns outside BC, off-tree | 11 |

`region.html` currently claims 687 island places and 429 across Tofino and
Ucluelet. The corpus and every other page say 127 (73 + 54). The corpus wins.

## What must still be true afterwards

- No link anywhere resolves to `country.html` or `province.html`.
- No breadcrumb contains Canada.
- Every page still reaches a route up and a scoped search (navigation contract
  N5, N7).
- The tab bar still carries only the town's sections (navigation contract).
- Hard rules hold: no em dashes or en dashes, no italics, no emoji, no hardcoded
  hex, one `.btn--primary` per screen.

## Gates

```
node scripts/qa-prototype.mjs
node scripts/nav-rebuild.mjs --check     # must report 0 pages
node scripts/sync-prototype.mjs
node scripts/qa-prototype.mjs public/prototype
QA_DIR=public/prototype QA_BASE=http://127.0.0.1:4399/prototype/ node scripts/qa-runtime.mjs
```

For the Next app: `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm test`.
