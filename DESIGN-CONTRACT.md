# DESIGN-CONTRACT.md

Locked 28 July 2026. This governs the next set of prototypes. Where it conflicts with
`DESIGN.md`, this file wins on the four subjects it rules on (season, weather, navigation,
earned moments). Everywhere else `DESIGN.md` and `CLAUDE.md` still stand.

---

## 1. What is locked

**Set 3, concept D: `design/concepts/2026-07-27/d-destinations-home.html`.**
Its own banner names it: "Globe Trekker structure, tofino-info craft."

**E and F are explicitly not the direction.** E is the centered, rounded-card, live-site
language version with "How planning here works" and a trust-badge row. It is competent and
it is the generic marketplace page this project exists to avoid. F is E made clickable.
Neither carries forward.

### What D already has that the others do not

1. **The tide strip.** A live band under the hero: Tofino Harbour, low 06:14 at 0.8m, high
   12:38 at 3.1m, low 18:52 at 1.2m, sunset 21:07, drawn over a wave line. This is already an
   earned moment under section 5's doctrine, built before the doctrine was written down here.
   It is the single most Vancouver Island thing on any of the concepts and it is the reason
   D is the direction.
2. **An asymmetric, crafted hero.** "The coast we know properly", set left, against an
   overlapping three-photo collage rather than a centered banner.
3. **The almanac panel** as a dark navy inset, not a pale card: subject, twelve-cell season
   strip, booking state, in one table.
4. **A testimonial that already argues the off-season.** "We went in February on your advice,
   which everyone told us was mad. Empty beaches, half the price, and the storms were the
   whole point. The tide times in the guide were exact." That is the thesis of section 2 in a
   customer's voice, and it stays.

What carries forward without change: the locked palette, Inter throughout, Satoshi for the
wordmark only, the voice, full-bleed photography, the honest-numbers posture.

What changes: everything in sections 2 to 5 below, applied inside D.

---

## 2. The season problem

### Root cause

In D's almanac panel ("Worth doing in July") each row is a subject with a twelve-cell strip,
and out-of-season cells render grey against a legend that reads "in season / quieter". The
summary line counts the shortfall out loud ("Seven of thirteen guides are at their best this
month") and off-season rows resolve to a waiting message ("Storm watching, back in November").
In July that is tolerable because most rows are green. In January the same panel is mostly
grey cells, mostly waiting messages, and a summary that leads with how little is on.

The same logic in code is `app.js: seasonTiers()`, which computes `peak | good | quiet` per
**category** against the **current month**, defaults to `quiet`, and paints `quiet` amber.

The data does not support that reading. Across the 22 categories, every month has a real
answer:

| Month | Categories in season |
|---|---|
| Jan, Feb, Nov, Dec | 10 |
| Mar, Oct | 12 |
| Apr | 13 |
| Jun, Jul, Aug | 18 |
| May, Sep | 19 |

**There is no bad month in the data. The discouragement is entirely presentational.**
Three compounding errors produce it:

1. **Wrong subject.** It ranks categories against a month. The visitor is asking about the
   month. Answer the month.
2. **Deficit vocabulary.** "Quiet" plus amber is caution styling. Amber is not in the
   locked palette table in `DESIGN.md` and should never have carried a season meaning.
3. **Absence rendered as negative.** `best_months` records when a thing peaks. It never
   records what a month offers instead, so the UI renders the gap rather than the offer.

### Rulings

- **S1. No month renders as a deficit.** Every month view opens with what is at its peak
  then. January opens on storm watching, surfing, hot springs, skiing, empty trails.
- **S2. Amber leaves the season system.** Emerald means in season. Neutral means out of
  season, stated plainly. No warning colour anywhere in the season vocabulary.
- **S3. Rank, never gate.** Reorder by fit. Never grey out, never hide, never disable, never
  badge something as a bad idea.
- **S4. Every month belongs to a named season with a claim that is true and appealing.**
  Storm season (Nov to Feb), the green months (Mar to Apr, Oct), long days (May to Sep).
  Storm season is a product, not an off-season. Operators in Tofino sell it as one.
- **S5. State the trade, do not hide it.** `DESIGN.md` promises we say what a place is
  actually like, in numbers, before selling. So January says 5 degrees and rain on 24 days.
  Concealing that would break the brand promise and is also what makes the honest version
  persuasive.
- **S6. Never a dead end on a month.** If someone picks a month where their activity does
  not peak, give two exits: the nearest month that does, and what to do instead in the month
  they picked. Two exits, never zero.
- **S7. The summary line leads with what is on, never with the shortfall.** "Seven of thirteen
  guides are at their best this month" becomes a count of what to do, and the panel heading
  keeps D's "Worth doing in {month}" framing, which was already right.

These apply **inside D's almanac panel**. The panel is the right component and keeps its
shape, its dark navy inset, its subject / season / booking columns. What changes is the
vocabulary, the colour coding, the ordering and the summary line.

### Why this also answers the weather request

Weather is not a separate feature. **It is the mechanism that redeems the off-season.**
The rain is why the rainforest is a rainforest, why storm watching exists, why the hot
springs are worth the boat ride. Presented as a warning it kills November. Presented as the
reason, it sells November. Rainfall is therefore the single highest-leverage number on the
page, and it belongs next to the season claim, not in a separate weather widget.

---

## 3. Weather data

No climate columns exist. `geo_place_climate` is new and additive:

```
place_slug, month (1-12), temp_high_c, temp_low_c, rain_mm, rain_days,
daylight_hours, sea_temp_c, source, verified (bool)
```

- Prototype rows seed from published Environment and Climate Change Canada normals for the
  nearest station, written with `verified = false`.
- **Nothing renders a climate figure as fact while `verified` is false.** Prototype surfaces
  may show them; the shipping gate is a human check against the station record.
- Weather never appears as a raw dump or a five-day forecast. It appears in exactly two
  places: the honest trade line (S5) and as the evidence behind a season claim (S4).

---

## 4. Navigation

### The complaint

Articles dead-end, and the model overall is confusing. Confirmed in `app.js`: `viewArticle`
renders without the town's chrome, and there is no onward path off it.

### Constraints that still bind

No sidebar (built, reviewed against TripAdvisor's Tofino page, rejected). The breadcrumb
stays a plain non-interactive trail (dropdown segments built and rejected). TripAdvisor
idiom: sticky tab bar, horizontal rails, filter chips. `DockBar` on mobile. One
`.btn--primary` per screen. No page dead-ends.

### Rulings

- **N1. The town is the spine and it never leaves.** Every page below a town keeps a
  persistent town anchor in the sticky bar: the town's name, and one tap back to it. You can
  always answer "whose page is this" without reading the URL. This single change is the
  main fix for "the navigation is confusing".
- **N2. An article wears its town's chrome.** An article about Long Beach is a Tofino page.
  Same tab bar, same anchor. Articles currently fall out of the navigation model entirely;
  that is the bug.
- **N3. Every reading surface ends with a next step, never with a footer.** Three fixed
  slots: next in this guide, more in this town, the booking path from `app/lib/cta.ts`.
  `.keepgoing` already exists in `theme.css` and gets extended rather than replaced.
- **N4. In-article orientation without a sidebar.** Long guides get the existing `.toc` as a
  horizontal chip row (reusing `.chiprow`), plus a reading-progress hairline. Collapsible on
  mobile. This is the sidebar's job done inside the accepted idiom.
- **N5. Breadcrumb stays passive.** Destination switching lives in the top-nav search. Not
  reopening this.

---

## 5. Earned moments, the Jeep windshield rule

The reference already has a name and a doctrine, from
`Website-Builder/docs/superpowers/specs/2026-07-14-tofino-chart-voice-design.md` section 4.6.
Adopted here, extended from one town to the tree.

### Doctrine

1. **Real data or real geography only.** If we cannot get it real, we cut the feature rather
   than fake it.
2. **Never announced.** No tooltip, no "did you know", no legend. A Jeep does not label the
   silhouette in the windshield.
3. **Never load-bearing.** Remove every earned moment and the page still works completely.
4. **Dosage: at most two per screen.** The motif must never eat the photography. If a page
   reads as "a chart with photos in it" instead of "photographs on chart paper", it is wrong
   and gets pulled back.
5. **Every town earns its own.** One generic moment applied to 26 towns is decoration, which
   is exactly the failure mode we are avoiding.

### The set for the first prototypes (Tofino and Ucluelet)

- **The tide strip.** Already built in D and kept as the anchor of the whole system: today's
  real highs, lows and sunset for the town's harbour, over a wave line. Coastal towns only.
  Everything else in this list is judged against how well it sits next to this.
- **The rain column.** In storm season the rainfall figure renders as a column of real
  height, in real millimetres. The number is the ornament.
- **The horizon.** Each town's actual landmark profile as seen from a named public spot,
  used as a section divider. Lone Cone from the First Street dock for Tofino, Amphitrite
  Point for Ucluelet.
- **First light.** On first visit only, a slow header tint matching the actual time of day
  in the town. Never repeats in that session, cannot be triggered on purpose.

Inland fallbacks when the tree grows: elevation profile in place of bathymetry, snow line in
place of tide.

### Success test

Carried verbatim from the source doctrine, because it is the right bar:

> A visitor sees a clean, quiet, photo-led site. A local sees that whoever built it knew the
> difference between a chinook and a halibut, recognized Lone Cone, and got the tide right.

---

## 6. Playful, readable, exciting: the actual levers

Not whimsy. Whimsy is what generic sites add when the structure is boring. These are the
levers that make the page feel alive:

- **Type contrast.** Display at three times body size minimum, step ratio at least 1.25.
  The flat ramp is the single biggest cause of the current blandness.
- **Numbers are heroes.** Tabular figures, large, unapologetic. 3,306 millimetres of rain is
  more interesting than "wet winters".
- **Photography unfiltered and full-bleed.** No duotone, no grain, no gradient scrim wash.
- **One motion moment per page, earned.** Ease-out only, 200 to 400ms.
- **Voice: specific and countable.** "Nine things worth doing" beats "Explore activities".
  Real place names beat category labels.

### Banned, in addition to the `DESIGN.md` list

Announced easter eggs. Amber as a season signal. Weather widgets. Any month presented as a
mistake. Any article that ends without a next step.

---

## 7. Assumptions

- Concept D is the direction, confirmed 28 July after an initial wrong lock on E/F. The
  deciding evidence: D carries the tide strip, its banner claims tofino-info craft, and E is
  the centered marketplace layout this project is defined against.
- The Jeep windshield reference means the earned-moments doctrine above: unannounced,
  real-data details that reward a local's attention. This is reconstructed from the sibling
  repo's section 4.6, which matches the description.
- Climate figures are seeded from published ECCC normals and flagged unverified. They are
  good enough to design against and not good enough to ship.

## 8. Deferred

- The season vocabulary (S4) names three seasons for the west coast. Whistler, Banff and the
  interior towns will need their own named seasons. Not designed yet.
- Tide and sunrise data need a real source before the earned moments in section 5 can ship.
  Doctrine rule 1 says we cut them rather than fake them, so this is a real dependency.
- `geo_place_climate` is specified but not migrated.
