# Navigation, round two: simpler

Round one produced two directions (`public/ideation/nav/apple-design.html`, `public/ideation/nav/impeccable.html`).
The owner rejected both with one sentence:

> both are making things complex, once I am in things to do, it's difficult to back

Two things in that sentence, and the second one is the brief.

1. **Complexity is the failure.** A popover holding the whole tree is not simpler than three
   bars, it is the same tree behind a door. A context bar plus an in-body rail plus a
   breadcrumb is still three systems. Round two is subtraction only.
2. **Getting back is the actual job.** The site is a reading site. A person lands on
   `/tofino/hiking`, reads, and wants to return to `/tofino/things-to-do`, then to `/tofino`.
   Today that path exists four times over in slightly different forms, which is precisely
   why none of them reads as the way back.

## Hard constraints for every round-two direction

- **One sticky row. 64px maximum.** Not two. Not one plus a contextual one.
- **The way back is the single most prominent control on the page**, and it names its
  destination in words. A bare chevron is not enough.
- **No popovers, no menus, no dropdowns, no accordions in the chrome.** If a direction needs
  a menu to work, it has failed the brief.
- **No component may appear twice.** If the breadcrumb carries "up", the chrome does not.
  If the chrome carries it, there is no breadcrumb.
- **Depth is never more than three**: British Columbia, town, subject. The design must make
  the current depth obvious without being read.
- Lateral movement between subjects is allowed only in the page body, never in sticky chrome.

## Already ruled out, do not re-propose

- A persistent left sidebar. Built, reviewed against TripAdvisor's Tofino page, rejected.
- Breadcrumb segments with dropdowns. Built, rejected, because the control moved
  horizontally as URL depth changed.
- Destination switching in the breadcrumb. It belongs in search.

## What each direction must deliver

One self-contained HTML file, no build step, no external requests, inline CSS and JS.
Images: Cloudinary `du9doarye` URLs already used in `design/prototype/`, or flat colour blocks.

The file contains a short header (direction name, one-paragraph thesis, the reference
pattern being matched) and then **four frames over the same real content**:

1. Desktop 1440: `/tofino` (town overview)
2. Desktop 1440: `/tofino/things-to-do` (the index)
3. Desktop 1440: `/tofino/hiking` (the leaf, where the complaint was made)
4. Mobile 390: `/tofino/hiking`

Each frame shows the chrome plus roughly 600px of real page content beneath it, using real
copy and real image URLs from `design/prototype/tofino.html`,
`design/prototype/things-to-do.html` and `design/prototype/hiking-tofino.html`.

**The back path must actually work in the mock.** From the hiking frame, the back control
moves to the things-to-do frame, and from there to the town frame. Wire it with JS inside
the file. A picture of a back button is not the deliverable.

Each desktop frame carries a measurement callout: sticky chrome height in px, next to
"today: 175px". Each frame also carries a one-line count: how many controls on this screen
lead upward. The target is one.

## Locked

Azure `#2874BA`, Emerald `#3A9679`, navy `#0B3356`, Inter (system-ui fallback, no external
font requests). Composition, density, hierarchy, motion and radius are open.

No italics. No em dashes. No emoji.
