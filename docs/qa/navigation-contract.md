# Navigation contract, design/prototype

Written 2026-07-30 after the owner reported that clicking a link lands you on a page
about a different town. This is the ruleset every page in `design/prototype/` must
satisfy. It is a repair contract, not a redesign: do not restyle anything, do not
add sections, do not change copy except where a label is lying about its target.

## The one rule

**A link's destination must be about the thing its label names, in the town the
reader is currently in.** If no page satisfies that, the link's label changes to
name what actually exists, or the link is removed. Never leave a label that
promises Ucluelet and delivers Tofino.

## What actually exists

Filenames without a town suffix are **Tofino's**. This is the trap that caused the
bug: `things-to-do.html` reads "Things to do in Tofino", `plan.html` reads "When
should you go to Tofino?", `guide.html` is the single article "Wildlife tours in
Tofino", `long-beach.html` is a Tofino area.

| Town | Town page | Subject index | Subject pages | Plan | Areas |
|---|---|---|---|---|---|
| Tofino | `tofino.html` | `things-to-do.html` | `beaches-tofino`, `hiking-tofino`, `kayaking-tofino`, `restaurants-tofino`, `storm-watching-tofino`, `whale-watching` | `plan.html` | `long-beach.html` |
| Ucluelet | `ucluelet.html` | `ucluelet.html#do` | `hiking-ucluelet`, `kayaking-ucluelet`, `restaurants-ucluelet`, `whale-watching-ucluelet` | none | none |
| 24 others | `<slug>.html` | in-page `.jump` anchors | none | none | none |

Hubs: `index.html`, `country.html`, `province.html`, `region.html`, `search.html`,
`not-found.html`. Tofino subjects with no page of their own: surfing, birding,
fishing, camping, events.

Only one article page was built (`guide.html`). Search (`search.html`) carries real
data for **Tofino and Ucluelet only**, though its town list names all 26.

## Rules

**N1. Town scope.** Every link on a page belonging to town T that means "here"
resolves inside T. From an Ucluelet page, "Things to do" is `ucluelet.html#do`,
never `things-to-do.html`. From a Tofino page it is `things-to-do.html`.

**N2. Subject links resolve to the subject.** A card or chip labelled "Beaches" on
a Tofino surface goes to `beaches-tofino.html`. A subject with no page of its own
goes to `things-to-do.html#<category-slug>` (Tofino) or `ucluelet.html#do`
(Ucluelet), never to the bare index. This is the reported bug: `tofino.html` routed
every subject except whale watching to `things-to-do.html`.

**N3. Named article links.** A link whose label is the title of a specific article
may only point at `guide.html` if that title is "Wildlife tours in Tofino". Every
other titled article link goes to `search.html?q=<url-encoded title>&in=<town>`,
which lands on a result list containing it. Do not point six different titles at
one article.

**N4. Breadcrumbs are the real ancestry.** Arc Trips / Canada / British Columbia /
Vancouver Island / Town / Subject. The region crumb is `region.html` labelled
"Vancouver Island". `whale-watching.html` currently has `search.html` labelled
"Guides" sitting in the region slot; that is wrong everywhere it appears in a
crumb. "Guides" belongs in the top nav, not the trail.

**N5. Scoped search.** Every "Find a stay" / "Stays" / search action carries
`?in=<town-slug>` for the town you are on. A bare `search.html` on a town page is a
defect.

**N6. No link lands on itself.** A nav entry for the current page is an in-page
anchor with `aria-current`, never an href to its own filename.

**N7. Dead ends.** Every page offers at least one route deeper and one route up.
The 24 towns without subject pages must still reach `region.html` / `province.html`
/ `country.html` / `index.html` and a scoped search.

**N8. Honest counts.** 26 towns, 15 in British Columbia, 11 on Vancouver Island, 2
published in full. Do not restate a count you have not checked against the page you
are editing.

## Verification, mandatory before reporting

```
node scripts/qa-prototype.mjs        # links, anchors, images, hard rules, JS parse
node scripts/_runtime-check.mjs      # console errors + containers that render empty
```

Both must be clean for the files you own. `qa-prototype.mjs` already fails a link
whose label names a subject its target does not (`SUBJ` check) — extend nothing,
just satisfy it.

## Hard rules that still bind

No em dashes or en dashes in rendered copy. No italics. No emoji. No hardcoded hex
colours. One `.btn--primary` per screen. Tokens from `_system.css` only.
