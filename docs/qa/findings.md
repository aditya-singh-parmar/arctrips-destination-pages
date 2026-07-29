### [BLOCKER] index.html - unresolved template literal rendered as literal text
- **Where**: "When should you go?" almanac section, rainfall lede paragraph (`.msw__lead`)
- **Seen**: The page renders the literal string "Each column is that month's average rainfall in ${TOWN_LABEL[almTown]}. Taller means wetter. Choose a month." The `${...}` is not inside a JS template literal in the HTML (design/prototype/index.html:480), so it never gets substituted; it just prints as-is.
- **Expected**: "Each column is that month's average rainfall in Tofino." (or Ucluelet, once the town switcher is used).
- **Width**: both (confirmed at 1440; same static markup renders unchanged at 390)

### [BLOCKER] index.html - "Ucluelet" destination card and footer link do not go to a Ucluelet page
- **Where**: "Destinations" section, the Ucluelet feature card (h3 "Ucluelet"); also footer "Destinations" column "Ucluelet" link
- **Seen**: Clicking the Ucluelet card (href="region.html") navigates to region.html, H1 "Vancouver Island, end to end" — a different page entirely, not about Ucluelet specifically. Verified live: click lands on Vancouver Island region page.
- **Expected**: A dedicated Ucluelet town page (matching the Tofino page pattern), since the homepage copy explicitly says "Tofino and Ucluelet are finished, place by place." There is no ucluelet.html in the 45-page set at all, only hiking-ucluelet.html, kayaking-ucluelet.html, restaurants-ucluelet.html, whale-watching-ucluelet.html.
- **Width**: both

### [MAJOR] index.html - search finder offers "Toronto" and "Qualicum Beach" with no real destination
- **Where**: Nav search combobox (`#q`), FIND array built from the inline `ROSTER` constant in index.html
- **Seen**: `ROSTER`'s Ontario group lists "Toronto" (href defaults to "country.html") and the Vancouver Island group lists "Qualicum Beach" (href "region.html"). Neither has a real page (no toronto.html; qualicum-beach.html does not exist, confirmed against the file listing). Typing "Toronto" or "Qualicum Beach" into search would surface them as results that land on the Canada or Vancouver Island page instead of a matching town.
- **Expected**: Only real, built towns should be searchable, or the copy/roster should not name places that have no page.
- **Width**: both (data-level bug, not layout)

### MINOR index.html - roster "23 more towns" text is briefly wrong before JS overwrite
- **Where**: `#rosterH` heading, set first by `paintRoster()` to "The other 26 towns, by province" (sum of the inline `ROSTER` array, which also includes the phantom Toronto/Qualicum Beach), then overwritten ~120ms later by a second script to "Every town we have written up" with the real 24-town set.
- **Seen**: Two different, disagreeing counts/headings for the same section, resolved only by JS timing.
- **Expected**: One consistent count computed from the real town data, not a hand-maintained duplicate list.
- **Width**: both

### [BLOCKER] victoria.html - Raw Word XML leaked into visible headings and alt text
- **Where**: World-Known Landmarks, Art and History Lovers, Outdoor Attractions, Other Interesting Places sections (21 place entries)
- **Seen**: Both the `<h3>` heading text and the image `alt` attribute render literal OOXML markup, e.g. the heading for what should be "3. British Columbia Parliament Buildings" reads: `<w:left w:space="0" w:sz="0" w:val="nil"/><w:bottom w:space="0" w:sz="0" w:val="nil"/><w:right w:space="0" w:sz="0" w:val="nil"/><w:between .../></w:pBdr><w:shd w:fill="auto" w:val="clear"/><w:spacing w:after="80" w:before="320" .../>...<w:t xml:space="preserve">3. British Columbia Parliament Buildings`. This renders as a wall of bold XML gibberish above the real title, in 21 separate entries across the page.
- **Expected**: Clean place name only, e.g. "3. British Columbia Parliament Buildings"
- **Width**: both (confirmed visually at 1440, source-level so also present at 390)

### [BLOCKER] victoria.html - Photo does not match its caption
- **Where**: World-Known Landmarks, item "2. Inner Harbour"
- **Seen**: image9.jpg, alt="2. Inner Harbour, Victoria", renders a whale fluke breaching open ocean water. No harbour, buildings, or cityscape in the frame.
- **Expected**: A photo of Victoria's Inner Harbour (boats, Empress Hotel, Parliament Buildings waterfront), consistent with the alt text and heading.
- **Width**: 1440

### [BLOCKER] victoria.html - Section content does not match its own heading
- **Where**: Jump-nav section "1. The Inner Harbour" (`#1-the-inner-harbour`), directly before "World-Known Landmarks"
- **Seen**: All four entries under this heading are seasonal blurbs with no connection to the Inner Harbour: "The Peak Season: Summer (July, August)", "The City of Gardens Season: Spring (April, June)", "The Moody & Dramatic Season: Fall (September, October)", "The Storm-Watching Season: Winter (November, March)" - this is "best time to visit Victoria" copy, misfiled under a landmark heading.
- **Expected**: Either real Inner Harbour content, or this block correctly headed as a seasons/planning section.
- **Width**: both

### [MAJOR] victoria.html - Dangling list intros with the list itself missing
- **Where**: Best Places for Birdwatching in Victoria - "Beacon Hill Park", "Witty's Lagoon", "Mount Douglas Park" entries
- **Seen**: Each paragraph ends with an intro sentence that promises a list and then nothing follows: "Beacon Hill Park is best for:", "Witty's Lagoon is best for:", "Mount Douglas is best for:" - the very next element is the unrelated "Good to know" callout.
- **Expected**: The bullet list that was supposed to follow the colon, or drop the dangling sentence.
- **Width**: both

### [MAJOR] victoria.html - Leaked subheadings spliced into paragraph prose
- **Where**: Goldstream Provincial Park entry (Best Places for Birdwatching) and the Winter entry (Best Birdwatching by Season)
- **Seen**: "...The park also has forest birds, river birds, and wetland habitat. Quick Victoria Birdwatching Guide" and "...Many ducks, loons, grebes, and seabirds are easier to see in colder months. Goldstream Provincial Park. Best Birdwatching Spots by Bird Type" - these are document subheadings from elsewhere in the source, dropped in as trailing sentences with no relation to the paragraph they end.
- **Expected**: These heading fragments should not appear as prose; they belong to different sections or should be discarded.
- **Width**: both

### [MAJOR] victoria.html - Image credit URL leaked into place names
- **Where**: World-Known Landmarks - "Craigdarroch Castle" and "Hatley Park National Historic Site" headings
- **Seen**: Heading text reads "5. Craigdarroch Castlehttps://www.istockphoto.com/photo/victoria-british-columbia-canada-craigdarroch-castle-gm1484969214-511063963" and "4. Hatley Park National Historic Sitehttps://www.istockphoto.com/photo/hatley-castle-of-royal-roads-university-gm184992922-18871616" - the stock photo credit URL is concatenated directly onto the place name with no space.
- **Expected**: Place name only; strip photo credit URLs during ingestion.
- **Width**: both

### [MAJOR] victoria.html - Top nav unreadable at 390px
- **Where**: Global nav bar, 390px width
- **Seen**: "Destinations" nav link renders truncated to "De", the search input placeholder shows only "Sear", and "Sign in" wraps to two lines inside its pill.
- **Expected**: Nav labels fully legible at 390px, no clipped text, single-line buttons (44px touch target rule also at risk with the wrap).
- **Width**: 390
### MINOR index.html - dangling sentence in the roster intro
- **Where**: "Destinations" section, roster intro paragraph above "More on Vancouver Island" (design/prototype/index.html:464)
- **Seen**: "These are written and being checked. Each one goes live the same way the first two did, once we have been." The sentence trails off after "once we have been" with no object.
- **Expected**: A complete sentence (e.g. "...once we have been out to check them.").
- **Width**: both
### [MAJOR] country.html - Ucluelet card/roster link and footer link go to region.html, not a Ucluelet page
- **Where**: "Two towns you can book today" Ucluelet card (h3 "Ucluelet"), the British Columbia > Vancouver Island roster row "Ucluelet ... Published", and footer "Destinations" > "Ucluelet"
- **Seen**: All three point to href="region.html" (Vancouver Island), same page as "All of Vancouver Island". There is no ucluelet.html anywhere in the 45-page set. The roster explicitly labels Ucluelet "Published" next to Tofino, which correctly goes to tofino.html, so the mismatch is obvious side by side.
- **Expected**: A dedicated Ucluelet page, or at minimum the same page Tofino gets.
- **Width**: both

### MAJOR country.html - footer "Destinations" column has "Guides" twice, missing "Canada"
- **Where**: Footer, Destinations column (design/prototype/country.html:402-405)
- **Seen**: `Tofino, Ucluelet, Guides, British Columbia, Guides` — "Guides" appears twice (both href="search.html"), and "Canada" is missing even though this is the Canada page itself and every sibling page (whale-watching.html, plan.html, guide.html, search.html, not-found.html) has "Canada" as the fifth item here.
- **Expected**: `Tofino, Ucluelet, Guides, British Columbia, Canada` (or the current page marked plain per breadcrumb rule).
- **Width**: both

### [BLOCKER] sooke.html - Hero description cut off mid-sentence
- **Where**: Hero, directly under the H1 "Sooke"
- **Seen**: "Sooke Potholes Provincial Park is a 7.3-hectare natural area on the banks of the Sooke River, famous for its unique geological formations. These potholes, deep, smooth rock pools, were carved out of volcanic rock by boulders trapped in swirling river currents over thousands of years. While the." - sentence stops dead at "While the."
- **Expected**: The full sentence, e.g. "...While the provincial park itself is smaller and less developed than the adjacent regional park, it serves as the essential southern entry point to this iconic river system." (present verbatim further down the same page under the full place entry, so the source text exists, only the hero excerpt was truncated wrong)
- **Width**: both

### [MAJOR] sooke.html - Leaked subheadings spliced into paragraph prose
- **Where**: "Point No Point Resort", "Scenic drive toward Port Renfrew", "Nearby Golf Courses" entries
- **Seen**: Subheadings from the source document appear inline as plain sentences with no visual separation: "...providing a secluded atmosphere with expansive views of the Olympic Peninsula. Accommodations and Amenities. Rustic Log Cabins: The resort features..."; similarly "...Key Stops and Scenic Points. French Beach Provincial Park is..."; "...Premier Golfing Near Sooke. Olympic View Golf Club is..."
- **Expected**: These should render as actual subheadings (or be dropped), not run into the surrounding prose.
- **Width**: both

### [MAJOR] sooke.html / nanaimo.html / chemainus.html / shawnigan-lake.html - Same hero-truncation bug across pages (pattern)
- **Where**: Hero paragraph, all four town pages
- **Seen**: Same defect class recurs: nanaimo ends "...tranquil escape from the city with its varied landscapes of."; chemainus ends "...turning the town's building exterior walls into."; shawnigan-lake ends "...one of the tallest free-standing timber rail trestle structures in." All four are the true first sentence of the page's first place entry, cut at a fixed character count and closed with a stray period instead of stopping at a sentence boundary.
- **Expected**: Truncate hero excerpts on a sentence boundary, never mid-clause.
- **Width**: both

CLEAN (no additional hero-truncation instances found on sidney.html, parksville.html, nanoose.html, campbell-river.html, hiking-ucluelet.html, kayaking-ucluelet.html, restaurants-ucluelet.html, whale-watching-ucluelet.html, restaurants-tofino.html, storm-watching-tofino.html - checked by source grep, hero paragraphs end on complete sentences)

### [BLOCKER] nanaimo.html - Hero description cut off mid-sentence
- **Where**: Hero, directly under the H1 "Nanaimo"
- **Seen**: "Saysutshun (Newcastle Island Marine) Park is a unique island park located just a few hundred meters off the Nanaimo harbor. Accessible only by water, this marine provincial park is rich in Snuneymuxw First Nation history and offers a tranquil escape from the city with its varied landscapes of." - stops at "of."
- **Expected**: Complete sentence: "...with its varied landscapes of sandstone cliffs and forested trails." (present verbatim in the full place entry further down the page)
- **Width**: both, most visible at 390 where it reads as clearly broken

### [MINOR] nanaimo.html - Hero image sign text collides with H1
- **Where**: Hero, 390px
- **Seen**: The hero photo is a wooden trailhead sign reading "Welcome to Saysutshun (Newcastle Island Marine) Park"; at 390px the sign's own printed text sits directly behind/beside the large "Nanaimo" H1, doubling up two blocks of text in the same area.
- **Expected**: Crop or reposition the hero image, or use a wider establishing shot, so the H1 doesn't compete with in-photo text.
- **Width**: 390

### [MAJOR] nanaimo.html - Top nav unreadable at 390px
- **Where**: Global nav bar, 390px width
- **Seen**: "Destinations" renders as "De", search placeholder shows "Sear", "Sign in" wraps to two lines.
- **Expected**: Full legible nav labels at 390px.
- **Width**: 390
### [BLOCKER] country.html - Vancouver Island roster is missing Nanoose Bay, so BC and Canada totals undercount by one town
- **Where**: "Eight provinces, 27 towns" section, British Columbia > Vancouver Island group (design/prototype/country.html:434-441, the `BC` array)
- **Seen**: The Vancouver Island town list has 11 entries (Tofino, Ucluelet, Victoria, Nanaimo, Campbell River, Parksville, Qualicum Beach, Sooke, Sidney, Chemainus, Shawnigan Lake) and is headed "Vancouver Island ... 11 towns". Nanoose (Nanoose Bay) is missing entirely, even though nanoose.html exists and is one of the 45 built pages. Because of this the page also states "British Columbia, 15 towns in four regions" and "27 towns across 8 provinces".
- **Expected**: province.html (my other assigned page) states Vancouver Island has **twelve** towns ("Twelve towns from Victoria north to Campbell River", "TOWNS 12") and lists Nanoose Bay explicitly with 16 places. So British Columbia should read 16 towns, not 15, and Canada should read 28, not 27. Two pages one click apart disagree on the same numbers.
- **Width**: both

### [BLOCKER] chemainus.html - Hero description cut off mid-sentence
- **Where**: Hero, directly under the H1 "Chemainus"
- **Seen**: "...The Chemainus Murals tell the vivid history of the region's indigenous roots, forestry heritage, and community life, turning the town's building exterior walls into." - stops at "into."
- **Expected**: "...turning the town's building exterior walls into a massive, walkable history book." (present verbatim in the full place entry below)
- **Width**: both, confirmed rendered broken at 390

### [MAJOR] chemainus.html - Top nav unreadable at 390px
- **Where**: Global nav bar, 390px width
- **Seen**: "Destinations" renders as "De", search placeholder shows "Sear", "Sign in" wraps to two lines.
- **Expected**: Full legible nav labels at 390px.
- **Width**: 390
### [BLOCKER] province.html vs index.html - the two flagship towns' "places" counts wildly disagree across pages
- **Where**: province.html "All twelve towns on the island" list (Tofino, Ucluelet rows) vs index.html town data and destination cards
- **Seen**: province.html: Tofino 232 places, Ucluelet 197 places. index.html: Tofino 73 places, Ucluelet 54 places (used in its "9 guides · 73 places · 134 stays" and "6 guides · 54 places · 158 stays" destination cards, and in the DATA blob driving the whole almanac). Also British Columbia's own total ("PLACES 1,154") on province.html exceeds the national total on index.html/country.html ("1,108 places" and "127 places" are both quoted elsewhere for the same "places written up" concept), so the parts are bigger than the whole.
- **Expected**: One source of truth for "places written up" per town, consistent everywhere it is quoted (nav, cards, stat bands, roster tables). Right now every page appears to hand-roll its own numbers.
- **Width**: both
### MAJOR province.html vs index.html - Squamish, Vancouver and Nelson place counts also disagree
- **Where**: province.html "Three more regions, told straight" band (Sea to Sky / Lower Mainland / Kootenays pills) vs index.html "The rest of Canada" town cards
- **Seen**: province.html: Squamish 117, Vancouver 139, Nelson 13 (as part of "13 places, 2 guides" for Kootenays). index.html: Squamish 73 places, Vancouver 76 places, Nelson 12 places. Whistler is the one town that does match (219 both places).
- **Expected**: Same numbers on both pages for the same town.
- **Width**: both

### [BLOCKER] shawnigan-lake.html - Hero description cut off mid-sentence
- **Where**: Hero, directly under the H1 "Shawnigan Lake"
- **Seen**: "...Standing 44 meters high and stretching 187 meters across the Koksilah River, it is one of the tallest free-standing timber rail trestle structures in." - stops at "in."
- **Expected**: "...one of the tallest free-standing timber rail trestle structures in the world." (present verbatim in the full place entry below)
- **Width**: both, confirmed rendered broken at 390

### [MAJOR] shawnigan-lake.html - Leaked subheadings spliced into paragraph prose
- **Where**: "3. Cowichan Valley Trail" and "12. Short scenic day trips around the South Cowichan area" entries
- **Seen**: "...connecting communities from the Malahat summit north to Shawnigan Lake... Key Trail Segments and Experience. The Historic Trestle Route: The most popular section runs..."; "...temperate rainforest landscapes, all within a short drive from Shawnigan Lake. Coastal and Marine Adventures. Cowichan Bay is a historic waterfront village..."
- **Expected**: Subheadings should render as real headings or be dropped, not run into the surrounding sentence.
- **Width**: both

### [MAJOR] shawnigan-lake.html - Top nav unreadable at 390px
- **Where**: Global nav bar, 390px width
- **Seen**: "Destinations" renders as "De", search placeholder shows "Sear", "Sign in" wraps to two lines.
- **Expected**: Full legible nav labels at 390px.
- **Width**: 390

### [MAJOR] parksville.html - Top nav unreadable at 390px
- **Where**: Global nav bar, 390px width
- **Seen**: "Destinations" renders as "De", search placeholder shows "Sear", "Sign in" wraps to two lines.
- **Expected**: Full legible nav labels at 390px.
- **Width**: 390

Otherwise parksville.html is clean: hero copy complete, no leaked headings, tabs/breadcrumb correct, no photo/caption mismatches spotted at 1440.
### [BLOCKER] Cross-page: British Columbia / Vancouver Island town counts disagree on every page that states them
- **Where**: country.html ("Eight provinces, 27 towns" section), province.html (hero stat band + "All twelve towns on the island"), tofino.html ("Tofino is one of eleven towns on Vancouver Island" + its "Up the tree" card grid)
- **Seen**: Three different totals for the same British Columbia, and three different totals for the same Vancouver Island, each missing a different real town:
  - **British Columbia towns**: tofino.html says "3 regions · 14 towns"; country.html says "4 regions... 15 towns" (and literally lists only 11 Vancouver Island towns, omitting Nanoose); province.html says "Four regions, sixteen towns" (16, and its own town list of 12 for the island is the only one that is actually complete).
  - **Vancouver Island towns**: country.html says "11 towns" (list omits Nanoose Bay); tofino.html says "one of eleven towns" and its pill list of the other nine omits Shawnigan Lake (2 published + 9 listed = 11); province.html says "Twelve towns" and correctly lists all 12 (including both Nanoose Bay and Shawnigan Lake).
- **Expected**: One number for "how many towns are on Vancouver Island" and "how many towns are in British Columbia," identical on every page that states it, especially since country -> province -> town is the primary drill-down path a viewer will click through in sequence and directly compare.
- **Width**: both

### [MAJOR] sidney.html - Leaked subheadings spliced into paragraph prose
- **Where**: "4. Fishing Trip", "14. G.B. Church and HMCS Mackenzie", "16. Golfing" entries
- **Seen**: "...year-round salmon fishing, protected from the open swells of the Pacific. Where to Fish and What to Catch. Sidney Channel and Coal Island: These local waters..."; "...offer divers a chance to see significant marine colonization on historical vessels. Artificial reef G.B. Church. The G.B. Church is a 175-foot coastal freighter..."; "...The region's mild climate allows for year-round play... Premier Golf Courses Nearby. Ardmore Golf Course: A local favorite..."
- **Expected**: Subheadings should render as real headings, not run into the surrounding sentence.
- **Width**: both

### [MAJOR] sidney.html - Top nav unreadable at 390px
- **Where**: Global nav bar, 390px width
- **Seen**: "Destinations" renders as "De", search placeholder shows "Sear", "Sign in" wraps to two lines.
- **Expected**: Full legible nav labels at 390px.
- **Width**: 390

Otherwise sidney.html hero copy is complete, breadcrumb/tabs correct.

### [MAJOR] nanoose.html - Top nav unreadable at 390px
- **Where**: Global nav bar, 390px width
- **Seen**: "Destinations" renders as "De", search placeholder shows "Sear", "Sign in" wraps to two lines.
- **Expected**: Full legible nav labels at 390px.
- **Width**: 390

Otherwise nanoose.html is clean: hero copy complete, no leaked headings found, tabs/breadcrumb correct.
### [BLOCKER] tofino.html - every place card in "Thirteen beaches, all different" links to Long Beach, regardless of which beach it is
- **Where**: "Stays" section preceding grid, "Thirteen beaches, all different" place cards (Chesterman Beach, Cox Bay, Long Beach, Tinwis Beach, Tonquin Beach, Middle Beach, Rosie Bay, Wickaninnish Beach, ...)
- **Seen**: design/prototype/tofino.html:685: `const PLACE_PAGE = (name) => name === "Long Beach" ? "long-beach.html" : "long-beach.html";` — both branches of the ternary resolve to the same URL. Confirmed live: clicking the "Chesterman Beach" card (and every other beach card) navigates to long-beach.html, whose H1 is "Long Beach". Verified via Playwright: `a[href="long-beach.html"]` resolves to 10+ different beach cards on this one page.
- **Expected**: Each beach card should link to its own write-up. Since there is no individual page per beach in this build, the honest link is to `beaches-tofino.html#<beach-slug>` (the anchor already exists there, e.g. "Chesterman Beach" is a real `<h3>` on that page), not a hardcoded stub that always returns Long Beach.
- **Width**: both (this is a data/JS bug, not a layout one)

### [BLOCKER] campbell-river.html - Place list renders in reverse numeric order
- **Where**: "Campbell River" section, all 14 places
- **Seen**: Entries run top to bottom as 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1 ("14. Cold Water Diving" is the first card on the page, "1. Elk Falls Provincial Park" is the last).
- **Expected**: Ascending order 1 through 14, matching every other town page in the set (sidney, chemainus, shawnigan-lake all render 1..N ascending correctly).
- **Width**: both

### [MAJOR] campbell-river.html - Top nav unreadable at 390px
- **Where**: Global nav bar, 390px width
- **Seen**: "Destinations" renders as "De", search placeholder shows "Sear", "Sign in" wraps to two lines.
- **Expected**: Full legible nav labels at 390px.
- **Width**: 390

## Agent C — whistler, squamish, vancouver, nelson, banff, jasper, edmonton, saskatoon, montreal, quebec-city, ottawa, niagara-falls, halifax, charlottetown, st-john

**Tooling note, read before the findings below**: the Playwright MCP session is shared live across all three QA agents. Repeatedly, a `browser_navigate`/`browser_take_screenshot` pair I issued was hijacked mid-flight by another agent's `navigate` or `resize` call landing on the same tab, so the resulting screenshot showed someone else's page (province.html, sooke.html, shawnigan-lake.html, parksville.html, sidney.html, tofino.html all appeared in my capture attempts at one point or another) or was written as a 0-byte file. After ~15 retries per capture I verified only **whistler.html** and **st-john.html** cleanly at both 1440 and 390 (files saved to `docs/qa/shots/whistler-1440.jpeg`, `whistler-390.jpeg`, `st-john-1440.jpeg`, `st-john-390.jpeg`, plus `ottawa-1440.jpeg` which is actually a mis-hijacked capture of sidney.html, kept only as evidence of the collision, not a finding). The remaining 13 pages were audited from the rendered HTML source (`curl` against the live server, cross-checked against `design/prototype/*.html`), which is deterministic and unaffected by the shared-session collision. Everything below is sourced from actual page markup; the two screenshot pairs additionally confirm the nav-overflow and truncation findings on-screen.

### [BLOCKER] whistler / squamish / vancouver / nelson / banff / jasper / edmonton / saskatoon / montreal / quebec-city / ottawa / niagara-falls / halifax / charlottetown / st-john - every "Find a stay" / "Stays in {town}" link silently drops the visitor into Tofino, searching "whale"
- **Where**: placebar CTA (`.placebar__cta`, "Find a stay") and the "Keep going" footer link ("Stays in {Town}") on all 15 pages
- **Seen**: Every one of these links is a bare `href="search.html"` with no query string, confirmed by grep across all 15 files. `search.html`'s own script defaults an absent `in` param to `"tofino"` and an absent `q` param to `"whale"` (`design/prototype/search.html:745-750`: `const INCOMING = params.get("in") === null ? "tofino" : ...`, `q: params.get("q") === null ? "whale" : ...`). So clicking "Find a stay" from Banff, Montreal, Halifax, or any of my other 14 pages lands on a search page scoped to Tofino, pre-filled with the query "whale". Compare `tofino.html`, whose own placebar CTA correctly uses `href="search.html?in=tofino"`.
- **Expected**: Each town's CTA should carry `?in={town-slug}` (and no stray default query) so "Find a stay" from Whistler actually searches Whistler stays, not Tofino whale-watching stays.
- **Width**: both (source-level, applies at every breakpoint)

### [BLOCKER] st-john.html - Page names the wrong city: "St. John" instead of "St. John's"
- **Where**: `<title>`, `<meta name="description">`, breadcrumb current-page crumb, placebar `aria-label`, hero `<h1>`, hero image `alt`, "Keep going" sibling link, and nav search placeholder ("Search St. John")
- **Seen**: All of the above render "St. John" (44 occurrences), while the body prose correctly and repeatedly says "St. John's" or "St. John's" with a curly apostrophe (26 occurrences), e.g. hero copy reads "...the crown jewel of St. John's..." directly under an H1 that reads "St. John". Confirmed on screen (`st-john-1440.jpeg`, `st-john-390.jpeg`): the H1 and body sentence one line below it visibly disagree on the town's own name. St. John's, Newfoundland and Labrador (Signal Hill, Cape Spear, Jellybean Row) is a real, different city from Saint John, New Brunswick, so dropping the possessive doesn't just look like a typo, it names a different place.
- **Expected**: "St. John's" everywhere the town name appears standalone (title, meta, breadcrumb, H1, alt text, aria-label, nav placeholder, sibling link "Stays in St. John's").
- **Width**: both

### [BLOCKER] vancouver / banff / jasper / montreal / ottawa / niagara-falls / charlottetown / st-john - Hero paragraph truncated mid-sentence, same pattern already flagged elsewhere in this file for Vancouver Island towns
- **Where**: Hero, directly under each page's H1
- **Seen**: Confirmed the same defect class the shared findings above already caught on sooke/nanaimo/chemainus/shawnigan-lake reproduces on 8 of my 15 pages, all cut to 292-300 characters with a stray period and no ellipsis, mid-word/mid-clause:
  - vancouver.html: "...looking to stock up on fresh goods without leaving the."
  - banff.html: "...This isn't a trick of the light; it's the result of rock flour, fine."
  - jasper.html: "...providing the most spectacular front-row seat to the."
  - montreal.html: "...having hosted the wedding of Céline Dion and the funeral of Prime."
  - ottawa.html: "...currently closed for a long-term restoration (projected to last until the early." (full sentence exists verbatim further down the page, ending "...until the early 2030s), the Hill is more active than ever...")
  - niagara-falls.html: "...This place's history dates back centuries, as it was formed over."
  - charlottetown.html: "...As of 2026, the site is entering."
  - st-john.html: "...The site remains the." (visible on screen in `st-john-1440.jpeg`/`st-john-390.jpeg`)
- **Expected**: Truncate on a sentence boundary (or don't truncate the hero excerpt at all; every one of these full sentences exists intact later on the same page), same fix already requested for the Vancouver Island instances.
- **Width**: both, visually confirmed broken on st-john.html at both 1440 and 390

### [MAJOR] ottawa.html - Source typo duplicated in two places on the page: "the the political heart of Canadal"
- **Where**: Hero paragraph (truncated copy) and the full Parliament Hill place entry body (untruncated copy), both under "World-Known Landmarks"
- **Seen**: Both instances read verbatim "Parliament Hill is the the political heart of Canadal, a massive neo-Gothic complex..." - a duplicated "the the" and "Canada" misspelled as "Canadal". Since it appears identically in both the hero excerpt and the full body paragraph, this is a copy-editing error in the source content, not a truncation artifact.
- **Expected**: "Parliament Hill is the political heart of Canada, a massive neo-Gothic complex..."
- **Width**: both

### [MINOR] vancouver.html - "the The Lions" duplicate-word typo
- **Where**: Lions Gate Bridge entry, "Lion Statues" paragraph
- **Seen**: "...you'll find two large concrete lions carved by sculptor Charles Marega. They are inspired by the The Lions (Ch'ich'iyúy Elxwíkn), the two mountain peaks..."
- **Expected**: "...inspired by The Lions (Ch'ich'iyúy Elxwíkn)..."
- **Width**: both

### [MAJOR] banff / jasper / edmonton / saskatoon / montreal / quebec-city / ottawa / niagara-falls / halifax / charlottetown / st-john - Breadcrumb province segment is unlinked plain text, not a real link
- **Where**: Breadcrumb, the province/territory segment (Alberta, Saskatchewan, Quebec, Ontario, Nova Scotia, Prince Edward Island, Newfoundland and Labrador)
- **Seen**: `<span class="lvl-deep">Alberta</span>` (and equivalent for the other 6 provinces) with no `<a href>`, unlike "Canada" one level up which is a real link. Only the four British Columbia towns I own (whistler, squamish, vancouver, nelson) get a linked province crumb, because `province.html` only represents British Columbia; no other province page exists in the 45-page set.
- **Expected**: Per the shared rule "every ancestor a real link, only the current page plain," either build an Alberta/Saskatchewan/etc. province page and link it, or the breadcrumb needs a design accommodation for provinces with no page rather than silently rendering dead text that looks clickable (same grey-on-white styling as the linked "Canada" segment, so visually indistinguishable from a working link until you hover).
- **Width**: both

### [MAJOR] whistler.html / st-john.html (confirms pattern already reported repeatedly above for Vancouver Island towns) - Global nav overflow at 390px is not region-specific, it is a fully global template bug
- **Where**: Top nav bar, 390px
- **Seen**: On both whistler.html and st-john.html (screenshots `whistler-390.jpeg`, `st-john-390.jpeg`), "Destinations" clips to "De", the search input placeholder clips to "Sear", and "Sign in" wraps to two lines inside its pill. Identical to what this file already reports for victoria/nanaimo/chemainus/shawnigan-lake/sidney/parksville, confirming this is not a Vancouver-Island-only issue: it reproduces identically on a Whistler (BC mainland) and a St. John's (Newfoundland) page, i.e. every one of the 45 pages sharing this nav template.
- **Expected**: A responsive nav (hamburger / collapsed search) below a real breakpoint, not desktop nav items clipped by viewport edge.
- **Width**: 390

### [MINOR] st-john.html - Breadcrumb collapses to first+last only at 390px, dropping both intermediate ancestors
- **Where**: Breadcrumb, 390px
- **Seen**: At 1440 the breadcrumb reads "Arc Trips / Canada / Newfoundland and Labrador / St. John"; at 390 (`st-john-390.jpeg`) it renders only "Arc Trips / St. John", so "Canada" and the province are not reachable at all on mobile, not even as plain text.
- **Expected**: Either keep all ancestor levels (wrapping if needed) or provide another way back to Canada/province on mobile; right now the only way up is the `<- Canada` placebar link.
- **Width**: 390

### CLEAN (no additional defects beyond the cross-page items above): squamish.html, nelson.html, edmonton.html, saskatoon.html, halifax.html, quebec-city.html
- Hero paragraphs complete (not truncated), no leaked sub-subheadings spliced into prose (checked for the "Label. Bold Phrase:" pattern seen on Sooke/Sidney/Victoria, none found on any of my 15 pages), single H1, single visible `.btn--primary`, alt text present on every image (all 15 pages: 0 missing, 0 empty), no em dash/italics/emoji, place bar never leaks another town's sections (all 15 correctly show only Overview + Stays + parent + All destinations, never Tofino's Things to do/Areas/Plan), and no Tofino/Ucluelet/Vancouver Island framing bled into any of these 15 non-Island towns (one incidental, correctly-contrastive mention of "Vancouver Island" in nelson.html's climate comparison paragraph, not a context error).

### [BLOCKER] hiking-ucluelet.html / kayaking-ucluelet.html / restaurants-ucluelet.html / whale-watching-ucluelet.html - "Ucluelet" link goes to the Vancouver Island region page, not a town page
- **Where**: Breadcrumb, place-bar back link ("← Ucluelet"), and the "Keep going" card labeled "Ucluelet - The town" - same bug on all four Ucluelet subject pages
- **Seen**: There is no `ucluelet.html` file in this prototype. Every link labeled "Ucluelet" (breadcrumb segment, place-bar back-arrow, footer "keep going" card) points to `region.html` instead - the same href as the adjacent "Vancouver Island" breadcrumb link. Clicking breadcrumb "Ucluelet" on hiking-ucluelet.html was verified live: it navigates to `region.html`, titled "Vancouver Island, Arc Trips" (region overview, not a Ucluelet page).
- **Expected**: A link labeled "Ucluelet" should land on an Ucluelet town page, distinct from the Vancouver Island region page it currently duplicates. If the Ucluelet town page genuinely does not exist yet in this prototype, the label should not claim otherwise.
- **Width**: both
### [BLOCKER] long-beach.html - all 12 sibling beach cards link to an unrelated "Wildlife Tours" guide, not the beach they name
- **Where**: "20 places in and beside this one unit of the park" section, the grouped sibling cards (Chesterman Beach, Cox Bay, Tonquin Beach, Tinwis Beach, Wickaninnish Beach, Combers Beach, Schooner Cove, Florencia Bay, Middle Beach, Kennedy Lake, Grice Bay, Rosie Bay)
- **Seen**: design/prototype/long-beach.html:997: `` `<a class="sib" href="guide.html"> ...` `` — every sibling card hardcodes href="guide.html" regardless of `s.n`. Verified live: clicking "Chesterman Beach" navigates to guide.html, whose H1 is "Wildlife tours in Tofino", not a beach page at all.
- **Expected**: Each sibling should link to its own place, or at minimum to the relevant category page/anchor (e.g. `beaches-tofino.html#chesterman-beach`), not a single hardcoded, thematically unrelated guide.
- **Width**: both
### MINOR things-to-do.html - "Beaches" subject preview shows the same beach twice out of three photos
- **Where**: "02 Beaches" subject block, three-photo preview strip
- **Seen**: Captions read "Chesterman Beach", "Chesterman Beach", "Cox Bay" — the first two preview photos are both Chesterman Beach (the data has two consecutive Chesterman photos before Cox Bay and the preview just takes the first three in array order).
- **Expected**: A 3-photo preview of a beaches subject should show 3 different beaches, not repeat one.
- **Width**: 1440 (not rechecked at 390, but the data source issue is the same)
### [BLOCKER] Cross-page: "how many towns in Canada" also disagrees (25 / 26 / 27)
- **Where**: index.html hero note ("25 towns written up"), country.html ("27 towns across 8 provinces"), things-to-do.html "Elsewhere" band ("British Columbia, 14 towns" / "Canada, 26 towns")
- **Seen**: Three different totals for the same "towns in Canada" figure, none of which agree with each other, adding to the British Columbia/Vancouver Island mismatches already logged above. things-to-do.html also independently says BC has 14 towns, a fourth number alongside tofino.html's 14, country.html's 15 and province.html's 16.
- **Expected**: One number, computed once, reused everywhere.
- **Width**: both
### [BLOCKER] whale-watching.html - breadcrumb replaces "Vancouver Island" with "Guides" linking to search.html
- **Where**: Breadcrumb trail above the H1 (design/prototype/whale-watching.html:443-453)
- **Seen**: `Canada / British Columbia / Guides / Tofino / Things to do / Whale watching` — the third crumb is "Guides" linking to search.html. Every sibling Tofino page (tofino.html, long-beach.html, things-to-do.html) instead has "Vancouver Island" linking to region.html in that position. "Guides" is not a geographic ancestor of this page and does not belong in a location breadcrumb at all.
- **Expected**: `Canada / British Columbia / Vancouver Island / Tofino / Things to do / Whale watching`, matching every other Tofino-scoped page.
- **Width**: both
### MAJOR whale-watching.html - the H1 element contains the full deck paragraph, not just the title
- **Where**: Hero heading (design/prototype/whale-watching.html:465-468)
- **Seen**: `<h1>Whale watching in <span class="mark">Tofino</span><span class="deck">Gray whales north from March, humpbacks all summer. Six places to watch from, four of them free and on foot.</span></h1>` — the entire subtitle/deck sentence is nested inside the `<h1>`, not in a separate `<p>`. Visually it reads fine (the deck is styled smaller/lighter), but the accessible name of the H1 (what a screen reader announces, and what `docs/qa/inventory.json` extracted) is "Whale watching in Tofino Gray whales north from March, humpb..." - the whole paragraph glued onto the title.
- **Expected**: The deck sentence should be a sibling `<p>` after the `</h1>`, not inside it, so the page has one clean, short H1.
- **Width**: both

### [BLOCKER] hiking-ucluelet.html / kayaking-ucluelet.html / restaurants-ucluelet.html / whale-watching-ucluelet.html / restaurants-tofino.html / storm-watching-tofino.html - Every place card repeats its opening sentence twice, often truncated the first time
- **Where**: Every single place entry on all six subject pages (confirmed by source in all six, confirmed on-screen for hiking-ucluelet.html and storm-watching-tofino.html)
- **Seen**: Each card renders two paragraphs back to back that are the same sentence(s), e.g. on storm-watching-tofino.html, "Cox Bay": "Cox Bay is one of the most famous storm-watching spots in Tofino. It is wide, open, and exposed to the Pacific Ocean. This makes it a great place to see large waves roll in. On stormy days, the waves" (cut off mid-word) immediately followed by "Cox Bay is one of the most famous storm-watching spots in Tofino. It is wide, open, and exposed to the Pacific Ocean. This makes it a great place to see large waves roll in. On stormy days, the waves can look huge..." (full version). Same pattern on "Chesterman Beach" (cut off at "waves crash along t"), "Long Beach" (cut off at "watch wint"), "Tonquin Beach", "Pettinger Point", "Oceanfront Resorts and Cabins" - literally every card on the page. Confirmed identically on hiking-ucluelet.html ("Wild Pacific Trail", "Lighthouse Loop", "Big Beach Park Trail" all duplicate).
- **Expected**: One paragraph block per place, not an excerpt-then-full-text duplicate. The truncated first instance in particular reads as a rendering bug, not intentional copy.
- **Width**: both

### [BLOCKER] storm-watching-tofino.html - Empty place card, heading with no content
- **Where**: First entry after the hero, "Public Viewing Points"
- **Seen**: The heading "Public Viewing Points" renders with no photo, no paragraph, no note - completely blank body, leaving a large empty gap before the next card ("Cox Bay").
- **Expected**: Either real copy under this heading or remove the empty entry.
- **Width**: both

### [MINOR] storm-watching-tofino.html - Active place-bar tab clipped at 390px
- **Where**: Place bar, 390px width
- **Seen**: The current section's own tab, "Storm watching", is cut off mid-word ("Storm watchin") at the right edge of the viewport with no visible scroll affordance.
- **Expected**: Truncate with an ellipsis, allow horizontal scroll with a visible fade/arrow, or wrap, so the active tab is never partially unreadable.
- **Width**: 390

### [MAJOR] storm-watching-tofino.html - Top nav unreadable at 390px
- **Where**: Global nav bar, 390px width
- **Seen**: "Destinations" renders as "De", search placeholder shows "Sear", "Sign in" wraps to two lines.
- **Expected**: Full legible nav labels at 390px.
- **Width**: 390
### MAJOR plan.html - "X of 22 things at their best" uses the sitewide 22-category taxonomy, not Tofino's actual 9 subjects
- **Where**: "Every month, at a glance" table, "AT THEIR BEST" column (e.g. "18 of 22 things at their best" for July)
- **Seen**: plan.html reuses the global `bestMonths` taxonomy object (22 categories sitewide, including things Tofino does not offer at all, like skiing, hot springs, markets, arts-history) as the denominator. Every other Tofino page (things-to-do.html: "6 of the nine subjects are at their best" in July; tofino.html: "9 subjects") is scoped to Tofino's real 9 subjects. So the same town, the same month, reads "6 of 9" on one page and "18 of 22" on this one.
- **Expected**: The denominator on a Tofino-scoped page should be Tofino's 9 subjects, matching things-to-do.html and tofino.html.
- **Width**: 1440 (data bug, applies at any width)

### [MINOR] kayaking-ucluelet.html - Active place-bar tab clipped at 390px
- **Where**: Place bar, 390px width
- **Seen**: "Kayaking & paddling" tab clipped to "Kayaking &" at the right edge, no scroll affordance shown.
- **Expected**: Full tab label visible or a clear scroll/ellipsis affordance.
- **Width**: 390

### [MAJOR] kayaking-ucluelet.html - Top nav unreadable at 390px
- **Where**: Global nav bar, 390px width
- **Seen**: "Destinations" renders as "De", search placeholder shows "Sear", "Sign in" wraps to two lines.
- **Expected**: Full legible nav labels at 390px.
- **Width**: 390

(Duplicate-paragraph bug for this page already covered in the combined finding above.)
### (addendum) search.html - "Search all 28 towns instead" adds a fourth number for Canada's town total
- **Where**: search.html, "You are searching Tofino only. Search all 28 towns instead"
- **Seen**: A fourth distinct total (28) for the same "how many towns does Arc Trips cover" figure, alongside index.html's 25, country.html's 27, and things-to-do.html/plan.html's 26. See the consolidated cross-page town-count BLOCKER above.
- **Width**: both

### [MAJOR] restaurants-ucluelet.html - Top nav unreadable at 390px
- **Where**: Global nav bar, 390px width
- **Seen**: "Destinations" renders as "De", search placeholder shows "Sear", "Sign in" wraps to two lines.
- **Expected**: Full legible nav labels at 390px.
- **Width**: 390

(Duplicate-paragraph bug for this page already covered in the combined finding above. Otherwise clean: hero complete, breadcrumb/tabs correct.)

### [MINOR] whale-watching-ucluelet.html - Active place-bar tab clipped at 390px
- **Where**: Place bar, 390px width
- **Seen**: "Whale watching" tab clipped to "Whale watc" at the right edge.
- **Expected**: Full tab label visible or scroll affordance.
- **Width**: 390

### [MAJOR] whale-watching-ucluelet.html - Top nav unreadable at 390px
- **Where**: Global nav bar, 390px width
- **Seen**: "Destinations" renders as "De", search placeholder shows "Sear", "Sign in" wraps to two lines.
- **Expected**: Full legible nav labels at 390px.
- **Width**: 390

(Duplicate-paragraph bug for this page already covered in the combined finding above.)

### [MAJOR] restaurants-tofino.html - Top nav unreadable at 390px
- **Where**: Global nav bar, 390px width
- **Seen**: "Destinations" renders as "De", search placeholder shows "Sear", "Sign in" wraps to two lines.
- **Expected**: Full legible nav labels at 390px.
- **Width**: 390

(Duplicate-paragraph bug for this page already covered in the combined finding above. Otherwise clean: hero complete, breadcrumb/tabs correct, back-link correctly points to tofino.html since the Tofino town page exists.)
### MAJOR not-found.html (and most other pages) - global nav "Destinations"/"Guides" are hidden behind an undiscoverable horizontal scroll at 390px, inconsistent with index.html/tofino.html
- **Where**: Top global nav, `.nav-links` (Stays / Destinations / Guides)
- **Seen**: At 390px, only "Stays" and a sliver of "D" are visible before the search box; "Destinations" and "Guides" are clipped. This is _system.css's documented behavior (`.nav-links{overflow-x:auto;...}` at ≤980px, "the global nav ... scrolls instead of vanishing") — so the items are technically reachable by scrolling the nav strip sideways, but there is no visible affordance (no fade, no arrow, no partial-next-item peek beyond one clipped letter) to tell a user that's possible. index.html and tofino.html both add a page-scoped override (`@media(max-width:760px){.nav-in{flex-wrap:wrap}.nav-links{order:4;width:100%;justify-content:space-between}}`) that instead wraps the three links onto their own full-width row, so all three are always visible with no scrolling. The other 43 pages (confirmed: things-to-do.html, whale-watching.html, long-beach.html, plan.html, guide.html, search.html, beaches-tofino.html, hiking-tofino.html, kayaking-tofino.html, country.html, province.html, not-found.html all lack this override) fall back to the clipped-scroll behavior.
- **Expected**: Rule 1 says the global nav is identical on every page. Right now its mobile behavior is not: two different treatments of the same three links depending on which page happens to carry the extra CSS.
- **Width**: 390 only
### [BLOCKER] beaches-tofino.html / hiking-tofino.html / kayaking-tofino.html - every place's opening paragraph is duplicated verbatim
- **Where**: Every place write-up on all three "Subject" category pages (e.g. Chesterman Beach, Cox Bay, Long Beach, Tinwis Beach, Tonquin Beach, Middle Beach, Rosie Bay, Wickaninnish Beach, Florencia Bay, Combers Beach, Schooner Cove, Kennedy Lake on beaches-tofino.html)
- **Seen**: The first paragraph of every place's copy is immediately repeated as the second paragraph, word for word, then the unique detail paragraph follows. Confirmed in source, not just on screen: `grep` for duplicate `<p>` text finds **12 duplicated paragraphs on beaches-tofino.html** (out of 13 places, i.e. almost every single one), **16 on hiking-tofino.html**, and **17 on kayaking-tofino.html**. Example (beaches-tofino.html:79-80): the sentence "Chesterman Beach is one of the most loved beaches in Tofino..." appears twice back to back before the unique Frank Island detail.
- **Expected**: One paragraph of intro copy per place, not a repeated block. This reads as broken/unedited to anyone scrolling the page, and it is the majority of the visible copy on three subject pages.
- **Width**: both (content bug, not layout)
### MAJOR beaches-tofino.html / hiking-tofino.html / kayaking-tofino.html - "More on X" related-guide cards show a raw category slug as the subtitle, and all link to the same unrelated guide.html
- **Where**: "More on beaches" / "More on hiking & trails" / "More on kayaking & paddling" section near the bottom of each page
- **Seen**: The card subtitle is the raw internal category key, not formatted copy: "Hiking FAQs — hiking", "The Best Beaches in Tofino — beaches", "Beaches FAQs — beaches", "Kayaking in Tofino — kayaking", "Kayaking FAQs — kayaking". Every one of these cards also links to `guide.html`, which is "Wildlife Tours in Tofino" (the same page long-beach.html's siblings and tofino.html's beach cards wrongly link to as well, see above).
- **Expected**: A real subtitle (e.g. "4 questions answered" or "Tofino"), and a link to the actual guide it names, not a shared stub.
- **Width**: both
### CORRECTION - duplicate-paragraph BLOCKER above has been fixed live
- **Where**: beaches-tofino.html, hiking-tofino.html, kayaking-tofino.html
- **Update**: Re-checked after a file-change notification mid-session: all three pages now show 0 duplicated paragraphs (was 12/16/17). The "every place's opening paragraph duplicated verbatim" BLOCKER logged above is **resolved**, presumably by another agent's fix. Leaving the original entry above for the record but flagging it as fixed so it is not double-counted.
- The related MAJOR finding ("More on X" cards show raw category slug + link to guide.html) is still present as of this check.
### [BLOCKER] beaches-tofino.html / hiking-tofino.html / kayaking-tofino.html - global nav's third link is "Vancouver Island", not "Guides"
- **Where**: Top global nav (Stays / Destinations / ???)
- **Seen**: `<ul class="nav-links"><li>Stays</li><li>Destinations</li><li><a href="region.html">Vancouver Island</a></li></ul>` on all three subject pages. Every other page in the set (tofino.html, things-to-do.html, long-beach.html, whale-watching.html, index.html, country.html, province.html, guide.html, search.html, not-found.html) has "Guides" (linking to search.html) as the third global nav item instead.
- **Expected**: Rule 1: "Global nav identical on every page: Stays, Destinations, Guides." These three pages substitute a page-scoped geography link for the global "Guides" link, which is both a rule violation and a duplicate of the breadcrumb/place-bar's own "Vancouver Island" reference.
- **Width**: both
### (addendum) region.html - also says "Eleven towns" for Vancouver Island, a fourth disagreement point
- **Where**: region.html hero ("Eleven towns from Sooke to Campbell River" / "TOWNS 11")
- **Seen**: Same 11-vs-12 mismatch as country.html and tofino.html, against province.html's correct 12 (which lists Nanoose Bay and Shawnigan Lake that region.html/country.html/tofino.html all separately drop). Folds into the consolidated Vancouver Island/BC/Canada town-count BLOCKER above; this is the fourth page independently getting it wrong, each in a slightly different way.
- **Width**: both
### CLARIFICATION on the Tofino/Ucluelet "places" BLOCKER above
- region.html distinguishes two real metrics: "Documented places" (Tofino 232, Ucluelet 197) vs "Written up in full, with photos" (Tofino 73, Ucluelet 54) — so 232 vs 73 is not necessarily a data error, it may be two legitimately different counts (raw corpus vs polished pages).
- The underlying defect stands regardless: province.html's town list labels its number just "places" with no qualifier, so a reader cannot tell it means "documented" rather than "written up," and it reads as a direct contradiction of tofino.html/index.html's "73 places written up." At minimum this is a MAJOR labelling-clarity defect rather than a raw numeric bug. The town-count disagreements (11 vs 12 vs 14/15/16 etc.) logged separately are not explained by this distinction and remain a full BLOCKER.
