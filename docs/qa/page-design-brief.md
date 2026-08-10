# Common brief: copy, layout and pictures on every page

Written 2026-07-30 from the owner's review notes across a full session. Every page
agent builds to this. It is not a style suggestion; each rule below came from a
specific thing he rejected on the live site.

Read this, then `docs/qa/navigation-contract.md` and `docs/qa/bc-root-contract.md`,
which are still binding and are not yours to renegotiate.

---

## 1. Write for the traveller, never for the publisher

**This is the rule everything else hangs off.** The pages kept describing the
corpus instead of the trip.

He said it plainly: *"the page should be about what is there and not a count to the
customer that these are counted etc. This will help people travelling to plan their
travel, not how things have to be counted."*

Rejected, verbatim, from the live site:

| Rejected | Why |
|---|---|
| "The two towns that are finished" | A traveller does not care that a town is finished |
| "They hold 127 of the island's 385 places between them" | A fact about our progress |
| "Researched, written and being checked" | Production status |
| "The bar is that town's library measured against Victoria's 100" | Ranking towns by how much we wrote |
| "127 places in the two finished towns" | A whole band built on a count |
| "38 walks written up" | Say "38 walks" |
| "Thirteen beaches are named in the island beach guide" | Counts what the guide names |
| "Six places, written up one at a time" | Filler, 148 times across 25 pages |

**Banned words in reader-facing copy:** written up, documented, being checked,
finished (of a town or region), library, one at a time, named in the guide,
counted, sectioned, questions answered (as a badge repeated on every card).

**A count is allowed only when it helps someone decide.** "Tours run 2.5 to 3
hours", "134 stays from $320", "40 minutes down the same road", "rain on 22 days
in January" are all facts a traveller acts on. "73 places written up" is not.

**Coverage honesty is allowed, demoted.** A reader does need to know a town has no
guide yet. Say it once, plainly, as a caveat, never as the headline or the value.

## 2. Cut what is not doing a job

He has removed, by name: a Tofino-versus-Ucluelet comparison, tide tables on a
whale page, a photo strip, a proof band, an in-page chip bar, a section that was a
heading with a button and nothing under it, and a whole province level.

Before you keep a section, answer in one sentence what a traveller does with it.
If you cannot, cut it. *"Sections like these don't add any value, it's just too
much."*

Do not replace a cut section with another one. Fewer, better sections.

## 3. Pictures, and sequence

*"Images always help. Sequence always help."*

- Any list of places, towns, subjects or guides gets **a photograph per row**.
  Text-only lists were rejected twice.
- Use the photograph the destination's own page opens on, so the list and the page
  can never show different places. Never a stock or generic image where a real one
  exists in `media/` or Cloudinary.
- **Verify every image renders.** Cloudinary IDs in this project 404 silently:
  `curl -sI https://res.cloudinary.com/du9doarye/image/upload/<id>`. A local
  `media/...` path must exist on disk and in `public/prototype/`.
- Check the photo matches the subject. A surf beach was standing in for mountain
  biking.
- **Sequence**: number a list, or order it so the order means something. An
  unordered wall of equal cards is what he keeps rejecting.

## 4. Density and layout

*"When there are so many columns and too much information in a small space, it's
difficult to read. It is distracting."*

- Do not cram. Three places per row, not thirteen. One idea per row.
- **Long question lists are one column, collapsed, click to expand.** Native
  `<details>`, so keyboard and screen readers work without script.
- **FAQs always sit at the bottom of the page.**
- Two columns of body prose is usually wrong. If a two-column block runs out of
  content on one side, the layout is wrong, not the content.
- Nothing scrolls horizontally at 1440 or 390.

## 5. Colour

- The brand is **locked**: Azure `#2874BA`, Emerald `#3A9679`, navy `#0B3356`, the
  neutral ramp, Inter everywhere, Satoshi for the ArcTrips wordmark only. Tokens
  live in `design/prototype/_system.css`. No new hues, no hardcoded hex.
- **Use colour to carry meaning**, for example intensity on the azure ramp to show
  how busy a month is. A flat binary state where a gradient would inform is a
  missed opportunity.
- **Never green for this.** Emerald is the season signal and reads as a second
  meaning; he asked for it explicitly.

## 6. Rules that are already settled. Do not undo them

- **Tides only on storm watching, kayaking and surfing pages.** Nowhere else.
- **The tab bar carries the town's sections only.** Never the page's own name.
  Subjects live in the `.subjectbar` rail beneath it. There is no Areas tab.
- **Breadcrumb** is `British Columbia / Vancouver Island / Town / Subject`. No
  Canada. No Arc Trips crumb above British Columbia.
- **No em dashes or en dashes** in rendered copy, including `&mdash;`. No italics
  (the owner cannot read them). No emoji.
- **One `.btn--primary` per screen.**
- Every link's label must name what its target actually is.

## 7. How to verify. Not optional

Render it and look at it. Reading your own diff is not evidence, and neither is a
passing script.

```
node scripts/qa-prototype.mjs                 # links, anchors, images, hard rules, JS parse
node scripts/nav-rebuild.mjs --check          # must report 0 pages
```

Then load your page in the already-running server at
`http://127.0.0.1:4321/prototype/<page>.html` at **1440 and 390**, and confirm:

- zero console errors and zero uncaught page errors
- zero horizontal overflow at both widths
- every image you added has `naturalWidth > 0` after scrolling it into view
  (images are lazy; an early screenshot under-reports)
- no container that should hold content renders empty

Do not start a server. One is already running.

## 8. Scope discipline

- Touch **only the files you are given**. Other agents are editing other pages
  concurrently. `design/prototype/_system.css` is shared and is **off limits**: if
  you need a system change, say so in your report and use a page-scoped rule.
- Do not edit `public/prototype/`. It is generated by `scripts/sync-prototype.mjs`.
- Do not run git commands.
- Content is real and came from a corpus. Rewrite framing and headings freely;
  do not invent facts, place names, prices, distances or seasons.

## 9. Report

State what you cut and why, what you rewrote, what images you added and how you
verified they load, and the two viewport checks with real numbers. List anything
you deliberately left and anything you found in a file you do not own.
