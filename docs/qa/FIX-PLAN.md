# Fix plan. Exclusive file ownership, no two agents touch the same file.

Source of truth for issues: docs/qa/findings.md (56 findings).
Already fixed and deployed: 1, 4, 30, 31, 33, 34, 35, 36, 44, 45, 55, 56.

## AGENT 1 owns: creating ucluelet.html, and every page that links to Ucluelet
Files: design/prototype/ucluelet.html (NEW), index.html, country.html,
hiking-ucluelet.html, kayaking-ucluelet.html, restaurants-ucluelet.html,
whale-watching-ucluelet.html, long-beach.html
Findings: 2, 11, 41, 42

## AGENT 2 owns: the counts, and only these files
Files: design/prototype/province.html, region.html, tofino.html,
things-to-do.html, plan.html, search.html, not-found.html
Findings: 18, 21, 26, 43, 3

## AGENT 3 owns: extraction artefacts, and only these files
Files: design/prototype/victoria.html, sooke.html, sidney.html,
shawnigan-lake.html, nanaimo.html, chemainus.html, storm-watching-tofino.html,
vancouver.html
Findings: 5, 6, 7, 8, 9, 13, 16, 23, 27, 37, 46

## THE MAIN THREAD owns: design/prototype/_system.css and _nav.js
Findings: 10, 17, 20, 24, 25, 28, 29, 32, 38, 39, 40, 47, 48, 49, 50, 51, 52, 53, 54
(the 390px nav overflow, clipped place-bar tab, and unlinked breadcrumb province)
NO AGENT MAY EDIT _system.css OR _nav.js.

## Rules for every agent
- Edit ONLY the files listed under your name. Never _system.css, never _nav.js.
- After each file, run: node scripts/qa-prototype.mjs   (must stay clean)
- Verify in the browser at http://127.0.0.1:4321/prototype/<page>.html
- Do not regenerate pages with any script in /tmp. Edit the HTML directly.
- Append what you fixed to docs/qa/fixed.md with the finding number.
