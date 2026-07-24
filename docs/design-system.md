# Arc Trips design system

Status: current as of 2026-07-24. Source of truth for anything visual in this repo.
Tokens live in `app/globals.css` (`@theme`), components in `app/theme.css`.

A note on scope: this documents the system the project **has**, deliberately. The brand
is fixed (Azure/Emerald/navy, Inter, restrained) and the owner has confirmed the theme
stays. This is not an invitation to redesign; it is the reference that stops each new
page inventing its own spacing, crops and type sizes, which is how the first build
ended up reading as bland and cramped.

## 1. Hard rules

Non-negotiable, from `CLAUDE.md`. A change that breaks one of these is wrong even if it
looks better.

1. **No italics anywhere.** The owner has difficulty reading italic text. `em, i` are
   neutralised to weight 600 in `theme.css`. Do not use `<i>` or `<em>` even for icons
   or breadcrumb separators; use `<span class="sep">`.
2. **No em dashes** in rendered copy, UI text, or commit messages. Use a comma, colon,
   parentheses, or "to" for ranges. The ingest strips them at the door
   (`scripts/lib/decompose.mjs` `normalizeCopy`) so they cannot re-enter through content.
3. **No emoji** in product copy.
4. **One `.btn--primary` per rendered page.** Everything else is `.btn--outline`.
5. **No hardcoded hex in components.** Use the CSS vars below.
6. **Inter everywhere.** Satoshi is reserved for the `ARCTRIPS` wordmark only.

## 2. Colour

Ramps are defined in `app/globals.css`. Use the semantic role, not the raw hex.

| Role | Token | Value |
|---|---|---|
| Primary action, links | `--color-primary-600` | `#2874BA` |
| Primary hover | `--color-primary-700` | `#21639E` |
| Headings, navy surfaces | `--color-primary-900` | `#0B3356` |
| Tint background | `--color-primary-100` | `#EAF2FB` |
| Success, bookable, price-positive | `--color-secondary-600` | `#2F7D64` |
| Body text | `--color-neutral-700` | `#474B53` |
| Meta and captions | `--color-neutral-500` | `#7F8490` |
| Hairlines | `--color-neutral-100` | `#EBEBEB` |
| Coming soon | `--warn` | `#B54708` on `#FFFAEB`, border `#FEDF89` |

**Usage discipline.** Azure is for action, not decoration. Navy carries headings and the
one dark surface per page (booking rail head, sell tile). Emerald means "you can book
this now" and appears nowhere else, so a green badge always means money. Amber means
"coming soon" and is never a primary.

## 3. Type

Inter throughout, `font-feature-settings: "cv02","cv03","cv04","ss01"`. The ramp lives in
`theme.css` as `.t-*`. Headings sit on navy, body on neutral-700.

| Class | Size / weight | Use |
|---|---|---|
| `.t-h1` | 40 / 700, tracking -0.02em | Page title in a hero |
| `.t-h2` | 28 / 700 | Section heading |
| `.t-h3` | 20 / 600 | Card group heading |
| `.t-bold-16` | 16 / 700 | Card title |
| `.t-reg-16` | 16 / 400, line-height 1.6 | Body |
| `.t-reg-14` | 14 / 400 | Meta |
| `.t-reg-12` | 12 / 400 | Fine print |

**Reading measure.** Article body is capped at `68ch`. Never let prose run the full
1280px container; that was a real complaint about the first build.

**Article rhythm.** `.ar-lead` (19/500) opens a body, `.ar-p` (16.5, line-height 1.75)
follows, `.ar-h2` (24/700 navy) breaks it up. The lead paragraph is promoted into the
hero as the standfirst and must be removed from the body, or every guide repeats itself.

## 4. Spacing and shape

- Container `1280px`, gutter `80px` desktop and `20px` below 900px.
- Section rhythm `48px` vertical. Between a heading and its grid, `18px`.
- Grid gap `20px`. Card padding `14px`.
- Radius: `8px` (`--radius-card`) for cards and buttons, `999px` for pills and chips.
- Shadow: cards are flat with a `1px` hairline at rest, and lift to
  `0 6px 20px -8px rgba(24,26,30,.18)` with `translateY(-2px)` on hover. No heavy or
  dark drop shadows.

## 5. Imagery

This is where the most visible defects have come from, so the rules are specific.

**Always request the crop you are going to display.** Every fixed-size image slot must
pass both `w` and `h` with `fit: "fill"` (Cloudinary `c_fill`), at **2x** the CSS box.
Never use `fit: "limit"` for a fixed box: limit returns the source aspect ratio, which
then gets centre-cropped by CSS and reads as a bad crop. This is exactly what made the
booking rail thumbnails look wrong.

```ts
// 64x64 box on screen
cld(id, { w: 128, h: 128, fit: "fill" })   // correct
cld(id, { w: 150, fit: "limit" })          // wrong, produces the squashed thumbnails
```

**Standard slots**

| Slot | CSS box | Request |
|---|---|---|
| Rail thumbnail | 64 x 64 | `w:128, h:128, fill` |
| Card media | aspect 16/10 | `w:380, h:260, fill` |
| Hero | full bleed | `w:1600, limit` with `fill` layout and `objectFit: cover` |

**Verify every public ID before shipping it.** Many old `arcstudio/*` IDs are deleted and
return 404:

```bash
curl -sI https://res.cloudinary.com/djqswlfat/image/upload/<id>
```

**Known content debt.** Seed listings currently point at generic brand imagery
(`arc-trips/pillar-connection`, `arc-trips/founding-key`), which is why stay thumbnails
show candles and keys rather than properties. The crop is now correct; the subject
matter is not. Real property photography replaces these, not a CSS change.

## 6. Components

| Class | What it is | Notes |
|---|---|---|
| `.nav` | Top bar, sticky | Home, Accommodations, Destinations, Things to do |
| `.chero` / `.chero--sm` | Page hero over a photo | Scrim is mandatory, white text needs it |
| `.pcard` | Card for a guide, article or category | Always a `<Link>`, never a bare `<div>` |
| `.pcardgrid` | 4-up grid, 2-up under 1000px, 1-up under 640px | |
| `.rail` | Horizontal scroller with a head and See all | For stays and long lists |
| `.selltile` | Navy gradient band, one CTA | The destination page's primary CTA |
| `.buy` / `.guiderail` | Booking rail beside an article | Renders `resolveCta` output only |
| `.opt` | One bookable row inside the rail | Thumbnail, title clamped to 2 lines, price right |
| `.ar-*` | Article body primitives | lead, p, h2, list, table, note, figure |
| `.faq` | Accordion | `<details>`, no JS |
| `.softnote` | Dashed neutral panel | Editorial or explanatory asides |

## 7. Commerce surfaces

The CTA is derived from `app/lib/cta.ts`, never hardcoded. Three visual states:

- **Live on Arc Trips**: emerald badge, azure primary button.
- **Live, sister brand**: navy button, ArcTrips Fishing wordmark, states the hand-off,
  opens in a new tab.
- **Coming soon**: amber panel with an email capture, and the primary button falls
  through to stays. A coming-soon category still sells something.

**No page dead-ends.** If a category has no live product line, the rail lists real stays
with real nightly prices. Rows must always agree with the button: if the button says
"Book a stay", the rows are stays, not placeholder tours.

## 8. Anti-patterns, learned here

Each of these shipped at least once in this project.

- A hero followed by a single card stranded in white space. If a section has one item,
  it is not a grid; give it a different treatment.
- Repeated identical listing cards ("Riverside Cabin, 4.9, 2 room(s), 3 bed(s)" four
  times). Placeholder data must vary or the page reads as broken.
- `room(s)` style pluralisation. Compute the plural.
- Cards rendered as `<div>` so nothing is clickable. Every card is a link.
- Stacked grey paragraphs with no lead, no measure cap and no headings.
- Tables flattened into middot-separated paragraphs. `ArticleBlocks` stitches these back
  into real tables at render time.
- Pages that exist but nothing links to (`/things-to-do` shipped unreachable).
