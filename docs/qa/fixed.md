# Fixed

## Agreed figures (established from design/prototype/deep.json + corpus.json, computed by hand, not guessed)

- **Vancouver Island: 11 towns.** Tofino, Ucluelet, Victoria, Sooke, Sidney, Shawnigan Lake,
  Nanaimo, Chemainus, Nanoose (Bay), Parksville, Campbell River. "Qualicum Beach" is not a
  12th town: it has no page anywhere in the 46-page set (no `qualicum-beach.html`), it is a
  beach name inside the Parksville write-up, and it was the source of every "12 towns"
  reading found in the corpus. VI documented places (sum of each real town's `places[]` in
  deep.json, with Tofino/Ucluelet from corpus.json): **687**. VI guides (sum of each town's
  `docs[]`/corpus guides): **29**.
- **British Columbia: 4 regions, 15 towns.** Vancouver Island (11) + Sea to Sky (Whistler,
  Squamish = 2) + Lower Mainland (Vancouver = 1) + Kootenays (Nelson = 1) = 15. BC places
  (written up, deep.json + corpus.json): **765**.
- **Canada: 8 provinces, 26 towns.** The 24 towns in `deep.json` plus Tofino and Ucluelet
  from `corpus.json` (deep.json explicitly excludes those two, per the brief). "Toronto" is
  not one of them: it's a stub row in `corpus.json`'s `destinations` array with no body copy
  and no page anywhere in the 46-page set.
- **Tofino: 73 places, 9 guides, 134 stays.** Ucluelet: 54 places, 6 guides, 158 stays.
  Counted directly from `corpus.json.places` grouped by `city` (73/54 entries) and
  `corpus.json.guides` grouped by `city` (9/6). This is what `index.html`'s destination
  cards already said; `province.html` and `region.html`'s ledgers said 232/197, which has no
  backing in either data file and was corrected to 73/54.
- Squamish 73 places (was 117), Vancouver 76 places (was 139), Nelson 12 places (was 13),
  per `deep.json`. Whistler's 219 was already correct everywhere.
- `region.html` still shows Tofino 232 / Ucluelet 197 in one place: its own "Tofino or
  Ucluelet?" comparison table, explicitly and separately labeled **"Documented places"** as
  a distinct row above **"Written up in full, with photos" (73/54)**. Since that table
  already carries its own clear label and is internally self-consistent, and since no source
  file supports a real "documented" superset count for either town, I left this pair alone
  rather than invent replacement numbers with no backing. Flagging this as a labelling call,
  not a numeric one: it does not contradict anything now that `province.html` agrees with
  `index.html` on the unqualified "places" figure.

## Agent 2 (counts + search dead-ends)

Files touched: `province.html`, `region.html`, `tofino.html`, `things-to-do.html`,
`plan.html`, `search.html`, `not-found.html`.

### Findings 18, 21, 26, 43 - town/place counts disagreeing across the drill-down path
- **province.html**: `DATA.island` — removed the phantom "Qualicum Beach" 12th-town row;
  fixed Tofino `p:232→73`, Ucluelet `p:197→54` and `h:"region.html"→"ucluelet.html"`,
  Victoria `p:79→100`; fixed Parksville's `h` (was wrongly `"nanoose.html"`, now
  `"parksville.html"`). `DATA.rest`: Squamish `p:117→73, g:5→4`; Vancouver `p:139→76, g:9→2`;
  Nelson `p:13→12`. `DATA.islandGuideTotal` 22→29 (sum of real per-town guide/doc counts).
  Every headline stat on this page (`T.towns`, `T.places`, `T.allGuides`, the "Fifteen
  towns"/"eleven towns" copy, the hero facts row, the "twelve towns" section comment) is
  computed at runtime from these rows, so fixing the rows fixed the whole page. Also fixed
  the "town with the most written up" keep-going card, whose claim ("more than any other
  town in BC") became false once Victoria/Whistler's real counts exceeded Tofino's;
  reworded to the true superlative (Tofino has the most guides finished: 9).
- **region.html**: town ledger Victoria row `79→100` places (was silently using the same
  wrong number province.html had); "South Island" group subtotal `137→158`; hero stat
  "Documented places" `666→687`; "Guides" `22→29`; meta description `666→687`. Fixed Ucluelet
  href (`search.html`→`ucluelet.html`) and Parksville href (`search.html`→`parksville.html`)
  in the town ledger, both of which pointed at the wrong page. Left the Tofino/Ucluelet
  232/197 "documented" row as-is (see agreed-figures note above).
- **tofino.html**: town roster `<li>` list swapped the phantom "Qualicum Beach" for the real,
  missing "Shawnigan Lake" (now the honest 9-town remainder + Tofino + Ucluelet = 11). Sibs
  card: Ucluelet href `region.html→ucluelet.html`; "British Columbia" stat `3 regions · 14
  towns→4 regions · 15 towns`. Auto-linker map (`M`): Parksville was wrongly mapped to
  `nanoose.html`, now `parksville.html`; Qualicum Beach now points at `parksville.html`
  (where its content actually lives) instead of `region.html`.
- **things-to-do.html**: "Elsewhere" band `British Columbia, 14 towns→15 towns` (its
  `Canada, 26 towns` was already correct).
- **plan.html**: hero "Twelve towns on the island"→"Eleven towns...nine are being written";
  `SOON_TOWNS` list dropped the phantom Qualicum Beach (was 10 items, now the real 9);
  Ucluelet href in the published-towns card `region.html→ucluelet.html`. Also fixed a
  related MAJOR (not one of my numbered findings, but in a file only I can edit and directly
  about numbers contradicting across the same page): the "Every month, at a glance" table's
  "X of 22 things at their best" used the sitewide 22-category taxonomy as its denominator,
  while `things-to-do.html`/`tofino.html` score Tofino against its own 9 subject guides (11
  once camping/events are counted, which the page's own `SUBJECTS` array and inline comment
  already established as "Tofino's own eleven subjects, not the twenty-two in the
  taxonomy" — that comment was true of the comparison-card code path but not of the month
  board, which still used the wrong, sitewide-scoped `inSeason()`/`TAXN`). Added a
  Tofino-scoped `inSeasonTofino()`/`TOFINO_N` (=11) and switched the month board and the
  "leanest month" topic line to use it, so the whole page now agrees with itself and with
  the other Tofino pages.
- **search.html**: `ROSTER` — removed "Qualicum Beach" from the Vancouver Island group (was
  12 items) and "Toronto" from the Ontario/Quebec group (no page anywhere in the set).
  `NTOWNS` is derived from this array at runtime, so the "Search all N towns" copy went from
  28→26 automatically. Auto-linker map (`M`): same Parksville/Qualicum Beach href bug as
  tofino.html, fixed the same way.
- **not-found.html**: `ROSTER` Vancouver Island group dropped "Qualicum Beach" (was 12
  entries); Ucluelet's `u`/`href` fixed from `region.html` to `ucluelet.html` in both
  `ROSTER` and `DATA.towns`.

### Finding 3 - search finder offers destinations with no page ("Toronto", "Qualicum Beach")
- Root cause in my files was `search.html`'s `ROSTER` array (see above) and its `townHref()`
  helper, which mapped every slug except `tofino`/`ucluelet` to a generic `country.html`
  fallback — so even towns that DO have real pages (Edmonton, Montreal, Victoria, ...) were
  being routed to the wrong place, and Toronto (no page) landed on the same generic
  fallback, reading as a plausible but wrong result rather than an honest "not built yet."
  Replaced with a `REAL_TOWNS` set of the 25 slugs that actually have pages; any of those
  resolves to `${slug}.html`, anything else (there is now only one: Toronto, and it no
  longer appears in the roster at all) falls back to `country.html` rather than a 404.
- `not-found.html`, `search.html`, `tofino.html`: the phantom "Qualicum Beach" is removed
  from every list it appeared in within my files (see per-file notes above); where it's
  auto-linked from body prose (the `M` maps), it now points at `parksville.html`, since the
  province.html data explicitly says Qualicum Beach content "is written up inside the
  Parksville guide, which it shares."

### Verification
`node scripts/qa-prototype.mjs` → `clean: 46 pages, every link, anchor and image valid`
(run after every file; ucluelet.html landed mid-session from Agent 1, which is why an
earlier pass showed `broken link ucluelet.html` on province.html/region.html only — those
were forward references to a page not yet written, not a mistake on my end).

Grep proof, all pages, after all fixes:
```
$ grep -rn "eleven towns\|Eleven towns\|11 towns\|twelve towns\|Twelve towns\|12 towns" *.html | grep -vi "_map\|_sweep"
country.html:      Eleven towns on one island...
index.html:        Region, 12 towns                    <- FOR AGENT 1, see below
long-beach.html:    Vancouver Island, all eleven towns
province.html/region.html/tofino.html/ucluelet.html/plan.html/things-to-do.html: eleven / 11, consistently

$ grep -rEn "\b(14|15|16) towns\b|fifteen towns|sixteen towns" *.html | grep -vi "_map\|_sweep"
index.html:         Province, 16 towns                 <- FOR AGENT 1
things-to-do.html/tofino.html/country.html/province.html: fifteen / 15, consistently
ucluelet.html:      3 regions · 14 towns                <- FOR AGENT 1 (their new page)

$ grep -rEn "\b(25|26|27|28) towns\b" *.html | grep -vi "_map\|_sweep"
index.html:         25 towns (line 306) and 28 towns (line 719) - disagrees with itself <- FOR AGENT 1
things-to-do.html/search.html comments: 26, consistently
country.html:       27 towns (three mentions)          <- FOR AGENT 1
```
All 7 of my files now agree with each other on all three counts (11 / 15 / 26) and with
`index.html`'s per-town place figures (73/54, and the corrected Squamish/Vancouver/Nelson
numbers). The remaining disagreements are all in files I do not own.

## FOR AGENT 1
- `index.html`: town-count contradicts itself internally — "25 towns" (line ~306, 386) vs
  "28 towns" (line 719, the `Canada` destination-card stat) vs "12 towns"/"16 towns" for
  Vancouver Island/BC (lines 717-718). Agreed figures: Canada 26, BC 15, Vancouver Island 11.
- `country.html`: says "27 towns across 8 provinces" in three places (meta, lede, `<h2>`).
  Agreed figure: 26. Its BC figure ("fifteen towns", line 376) is already correct and needs
  no change.
- `ucluelet.html` (your new page): the British Columbia sibling stat says "3 regions · 14
  towns" — should be "4 regions · 15 towns" (matches what `province.html`/`tofino.html`/
  `things-to-do.html` now say). Its Vancouver Island stat ("11 towns · 2 published") is
  already correct.

## Agent 1 (Ucluelet)

### Finding 2 - index.html Ucluelet destination card and footer link go to region.html
- Fixed the root cause: `TOWN_PAGE` helper (index.html) mapped every non-Tofino slug to
  `region.html`. Now maps `ucluelet` to the new `ucluelet.html`. This single fix corrects
  both the destination feature card and the nav search finder results, since both read
  from `TOWN_PAGE`.
- Footer "Destinations" column "Ucluelet" link repointed to `ucluelet.html`.

### Finding 11 - country.html Ucluelet card/roster link and footer link go to region.html
- "Two towns you can book today" Ucluelet card href -> `ucluelet.html`.
- British Columbia > Vancouver Island roster row for Ucluelet (`BC` array) href -> `ucluelet.html`.
- Footer "Destinations" column "Ucluelet" link -> `ucluelet.html`.

### Finding 41 - hiking/kayaking/restaurants/whale-watching-ucluelet.html "Ucluelet" links go to region.html
- All four subject pages: place-bar back link (`&larr; Ucluelet`), place-bar "Overview" link,
  breadcrumb "Ucluelet" segment, and the "Keep going" sibling card labeled "Ucluelet / The
  town" all repointed from `region.html` to the new `ucluelet.html`.
- Left the "Vancouver Island" labeled links (global nav third item, breadcrumb Vancouver
  Island segment) pointing at `region.html` alone, since that label is correct.

### Finding 42 - long-beach.html sibling cards link to guide.html instead of the beach they name
- The 12 grouped sibling cards ("Close to town" / "In the national park" / "Quieter and
  sheltered") all hardcoded `href="guide.html"` (Wildlife Tours) regardless of the beach
  name. Repointed to `beaches-tofino.html`, which is the real Tofino beaches category page.
- Left the page's other `guide.html` references alone (nav "Guides", "All nine Tofino
  guides", "What to pack", the reading feature card) since those are genuinely about
  guides, not beach siblings, and were not part of this finding.

### New page: design/prototype/ucluelet.html
- Built from scratch: same nav.top, same `.placebar` shape, same `.crumb`, same footer
  structure and `<script src="_nav.js"></script>` as tofino.html, using the shared design
  tokens in `_system.css` (no new colours, Inter only, no raw hex).
- All content pulled from `design/prototype/corpus.json` (`destinations` entry for
  `ucluelet`, `places` filtered to `city === "ucluelet"` (54 places), `guides` filtered the
  same way (6 guides), and the 3 real Ucluelet `listings`). Real hero images, real blurbs,
  real counts (54 places / 6 guides / 158 stays / 32 photographed / $320 from).
- Place bar: `&larr; Vancouver Island` back link (href `region.html`), then Overview (`#top`),
  Things to do (`#do`), Stays (`#stays`), Vancouver Island (`region.html`), matching the
  brief. "Things to do" points at an in-page anchor rather than an external hub page
  because there is no Ucluelet-scoped `things-to-do.html` in this build; the section itself
  links out to the four real subject pages (hiking/kayaking/restaurants/whale-watching-ucluelet.html).
  "Find a stay" CTA carries `?in=ucluelet`.
- Breadcrumb: Arc Trips / Canada / British Columbia / Vancouver Island / Ucluelet, every
  ancestor a real link, Ucluelet plain with `aria-current="page"`.
- Ends on a "keep going" three-slot block (whale watching / things to do / stays), never a
  bare footer.
- `node scripts/qa-prototype.mjs` clean (46 pages). Verified rendering at 1440x900 and
  390x844 via Playwright: zero horizontal overflow at 390 (`scrollWidth` 375 < `innerWidth`
  390), placebar scrollspy correctly tracks section, all images resolve (200), one visible
  `.btn--primary` ("Find a stay"), no em dashes/italics/emoji, nothing below 14px.

## Agent 3 (extraction artefacts)

Files touched: `victoria.html`, `sooke.html`, `sidney.html`, `shawnigan-lake.html`,
`nanaimo.html`, `chemainus.html`, `storm-watching-tofino.html`, `vancouver.html`.

Finding numbers below use `findings.md`'s own numbering (only `### [SEVERITY]`-prefixed
blocks count — the unbracketed `### MINOR/MAJOR` and `### CLEAN/addendum/CORRECTION`
lines are not separately numbered, which is why the brief's list lands where it does).

### Finding 5 - victoria.html photo does not match caption ("2. Inner Harbour")
- `image9.jpg` (a whale-tail breach shot) swapped for `image61.jpg`, a genuine Inner
  Harbour scene (the harbour floatplane terminal, docks, city skyline) already present in
  `media/victoria/`. No unused image in the folder shows the Empress/Parliament angle the
  finding describes as ideal, but this is unmistakably the Inner Harbour and far better
  than a whale fluke next to that heading.

### Finding 6 - victoria.html section content doesn't match its heading ("1. The Inner Harbour")
- The section held four seasonal-planning blurbs (Peak Season: Summer, City of Gardens:
  Spring, Moody & Dramatic: Fall, Storm-Watching: Winter) with zero Inner Harbour content.
  Retitled the section (jump-nav link, section `id`, `.sechead` label, `<h2>`) from
  "1. The Inner Harbour" to "Best time to visit Victoria," which is what the four entries
  actually are. Content itself untouched since it's accurate, just mislabeled.

### Finding 7 - victoria.html dangling list intros with the list missing
- "Beacon Hill Park is best for:", "Witty's Lagoon is best for:", "Mount Douglas is best
  for:" all ended with a colon and nothing after it. Completed each from the matching
  `goodFor` array in `deep.json` (e.g. "...best for: easy city birding, families, ducks,
  songbirds, hummingbirds, woodpeckers, and peacocks.").
- Found the same bug on two entries not named in this finding but in the same section: the
  "2. Whale Watching" card (Outdoor Attractions) ended "...can be spotted throughout the
  year:" with nothing following; restored the species list from `deep.json` body text
  (orcas, humpbacks, gray whales, plus harbor seals/sea lions/porpoises/eagles), skipping
  the tour-operator half of that same source block since it duplicates the dedicated
  "Best whale watching tours in Victoria" section lower on the page.

### Finding 8 - victoria.html leaked subheadings spliced into prose
- Goldstream Provincial Park (birdwatching entry): dropped the leaked "Quick Victoria
  Birdwatching Guide" table-dump (a sitewide bird/spot summary table that doesn't belong to
  this one place), completed its own dangling "Goldstream is best for:" from `deep.json`.
- Winter entry (Best Birdwatching by Season): dropped two trailing leaked fragments,
  "Goldstream Provincial Park" and "Best Birdwatching Spots by Bird Type," that had nothing
  to do with the Winter paragraph they were appended to.

### Finding 9 - victoria.html image credit URL leaked into place names
- Stripped the concatenated istockphoto.com URLs from both the `<h3>` and the image `alt`
  for "5. Craigdarroch Castle" and "4. Hatley Park National Historic Site."
- Extra fix while in the same cards: Hatley Park's photo was `image16.jpg`, which is
  actually the whale-watching tour boats (also correctly used, a second time, in the real
  whale-watching section) — swapped it for `image37.jpg`, an exact, unused photo of Hatley
  Castle itself.
- Deferred: Craigdarroch Castle's photo (`image11.jpg`) is also a whale-watching boat/orca
  shot, wrongly placed. Checked ~20 unused images in `media/victoria/` for a castle/mansion
  match and found none, so left the photo as-is rather than swap in something equally wrong.
  Also noticed `image11.jpg` is reused a second time for "Lochside Regional Trail" further
  down the page (same wrong photo, different caption) — flagging both for whoever does the
  next media pass, not fixed here since no replacement was found and it's outside this
  finding's explicit scope.

### Finding 13 - sooke.html leaked subheadings spliced into paragraph prose
- "Point No Point Resort," "Scenic drive toward Port Renfrew," "Nearby Golf Courses"
  entries: dropped the leaked mid-paragraph labels ("Accommodations and Amenities," "Key
  Stops and Scenic Points," "Premier Golfing Near Sooke") since the very next sentence in
  each case already carries its own inline label (e.g. "Rustic Log Cabins: The resort
  features...") and reads correctly once the redundant heading is gone.
- Verified sooke.html's hero paragraph (finding 12/17's cross-page truncation pattern) is
  already a complete sentence — no change needed there.

### Finding 16 - nanaimo.html hero image sign text collides with H1
- The hero photo was a trailhead sign reading "Welcome to Saysutshun (Newcastle Island
  Marine) Park," which visually doubled up with the "Nanaimo" H1 at 390px. Swapped to
  `image1.jpg`, an unused wide harbourfront establishing shot with no in-photo text,
  already present in `media/nanaimo/`. Confirmed no collision at both 1440 and 390 widths.
- Also fixed nanaimo.html's own hero paragraph, which was still truncated mid-sentence
  ("...varied landscapes of.") — completed from the matching place entry's full body text
  ("...varied landscapes of sandstone cliffs and forested trails.").
- Found and fixed one more leaked subheading in the same file, not separately numbered:
  the diving entry's "The Artificial Reefs (Wreck Diving)" leaked label between two
  unrelated sentences, dropped the same way as the sooke.html/sidney.html instances.

### Finding 23 - shawnigan-lake.html leaked subheadings spliced into paragraph prose
- "3. Cowichan Valley Trail" and "12. Short scenic day trips..." entries: dropped "Key
  Trail Segments and Experience" and "Coastal and Marine Adventures."
- Also fixed shawnigan-lake.html's hero paragraph, still truncated ("...structures in.") —
  completed to "...structures in the world." from the place entry's own full sentence.
- The chemainus.html hero-truncation half of this shared finding (`chemainus.html` "Top nav
  unreadable" is finding 20, main-thread-owned and untouched) is not mine by number, but
  its own separate hero cutoff ("...building exterior walls into.") was still broken in my
  file, so fixed it too, per the brief's "if any remain, verify before changing" note.

### Finding 27 - sidney.html leaked subheadings spliced into paragraph prose
- "4. Fishing Trip," "14. G.B. Church and HMCS Mackenzie," "16. Golfing" entries: dropped
  "Where to Fish and What to Catch," "Artificial reef G.B. Church," "Premier Golf Courses
  Nearby." Also caught and fixed one more in the same file: the whale-watching entry's
  leaked "Whale Watching & Eco-Tours" label.

### Finding 37 - vancouver.html "the The Lions" duplicate-word typo
- The literal duplicate ("the The Lions") was already gone by the time I got to this file;
  what remained was "inspired by the Lions (Ch'ich'iyúy Elxwíkn)" with a lowercase "the."
  Capitalized to "The Lions" to match the finding's expected text and the proper name.

### Finding 46 - storm-watching-tofino.html empty place card
- Confirmed against `corpus.json`: the "Public Viewing Points" place record has empty
  `body`/`blurb`/`hero` fields — there is no real content anywhere to restore, and it isn't
  in `deep.json` either (storm-watching-tofino isn't one of the 24 `deep.json` towns).
  Removed the empty card entirely rather than leave a heading with no body, and corrected
  the hero's "Places written up" stat from 8 to 7 to match.

### Sweep for additional instances
Ran a pattern sweep across all 8 owned files for (a) short Title-Case-only paragraphs with
no ending punctuation (the leaked-subheading signature) and (b) place cards whose last
paragraph ends in a bare colon (the dangling-list-intro signature). Caught and fixed three
extra leaked subheadings this way (victoria's Whale Watching card, nanaimo's Wreck Diving
card, sidney's Whale Watching card) beyond the ones named in the assigned findings. Re-ran
the sweep clean after fixes; the two remaining colon-free short paragraphs it flags on
`storm-watching-tofino.html` are legitimate "Best for: ..." lines matching that page's own
existing convention (see Cox Bay), not bugs.

### Verification
`node scripts/qa-prototype.mjs` → `clean: 46 pages, every link, anchor and image valid`,
re-run after every file. Rendered `victoria.html`, `storm-watching-tofino.html`, and
`nanaimo.html` in the browser at 1440x900 and 390x844 (Playwright) and visually confirmed:
the Inner Harbour and Hatley Park photo swaps, the retitled "Best time to visit Victoria"
section, the completed Beacon Hill Park birdwatching card, the removed empty storm-watching
card with corrected count, and the nanaimo hero with no sign/H1 text collision at either
width. Did not touch `_system.css` or `_nav.js`; the "Destinations/Guides" nav clipping
visible at 390px on every page is the known main-thread-owned bug, left alone.
