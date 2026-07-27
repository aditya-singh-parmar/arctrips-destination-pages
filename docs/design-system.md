# Arc Trips Destinations, design system

**Direction: field guide, not catalogue.** Hairline rules over boxes. Tabular figures over prose. Photography given real room. Cards only where a card is genuinely the right affordance (a photograph plus a name plus a place).

Two files own the whole system and **only the design-system agent edits them**:

- `app/globals.css`: Tailwind v4 `@theme` tokens (colour, radius, elevation, motion, space).
- `app/theme.css`: the component layer, plain CSS classes.

Everything below exists today and compiles. `npm run build` is clean.

## Hard rules

1. No italics. `em, i` are neutralised to weight 600.
2. No em dashes in rendered copy, UI text, or commit messages.
3. No emoji in product copy.
4. No new hues. Azure `#2874BA`, Emerald `#3A9679`, navy `#0B3356`, the neutral ramp, plus the pre-existing amber coming-soon state.
5. Inter only. Satoshi is for the `ARCTRIPS` wordmark in `.nav__logo` / `.footer__logo` and nowhere else.
6. No hardcoded hex in components. Use the semantic aliases.
7. One `.btn--primary` per screen. `CtaBlock` is never primary.
8. **Banned:** side-stripe borders, gradient text, glassmorphism, hero-metric templates, identical card grids, nested cards, heart icons on cards (`.card__heart` is force-hidden), purple anything.

---

## 1. Tokens

### Colour, semantic aliases (use these, not the raw ramps)

Colour is semantic. Azure is action. Emerald is availability. Nothing is decorative.

| Alias | Value | Use | Contrast on white |
|---|---|---|---|
| `--ink` | `#0B3356` navy | Display, headings, emphatic figures | 13.4:1 |
| `--ink-strong` | `#181A1E` | Highest-emphasis figures | 16.9:1 |
| `--ink-body` | `#474B53` | Long-form prose, default body colour | 8.0:1 |
| `--ink-muted` | `#5F616C` | Labels, meta, eyebrows, captions | 5.7:1 AA |
| `--ink-faint` | `#7F8490` | Non-essential only, never AA body text | 3.6:1 |
| `--ink-invert` | `#FFFFFF` | Type on photography | |
| `--action` | `#2874BA` azure | Links, primary button, focus ring. Nothing else. | 4.7:1 AA |
| `--action-hover` | `#21639E` | Hover state | |
| `--action-ink` | `#21639E` | Action text sitting on `--action-wash` | |
| `--action-wash` | `#EAF2FB` | Action-tinted well | |
| `--signal` | `#3A9679` emerald | Fills, strip cells, dots. Availability only. | |
| `--signal-ink` | `#2F7D64` | Signal **text** on white | 4.9:1 AA |
| `--signal-wash` | `#E8F4F0` | In-season cell fill | |
| `--paper` | `#FFFFFF` | Default surface | |
| `--paper-sunk` | `#F9F9F9` | Wells, footer, panels | |
| `--paper-deep` | `#0B3356` | Inverted bands (`.now`, `.buy__head`, `.selltile`) | |
| `--rule` | `#EBEBEB` | The default hairline | |
| `--rule-strong` | `#D1D3D5` | Rules that must read as structure | |
| `--rule-ink` | `#0B3356` | The 1.5px rule that opens a spread, spec block or index entry | |
| `--amber` / `--amber-bg` / `--amber-border` | `#B54708` / `#FFFAEB` / `#FEDF89` | Coming-soon state only | |

Raw ramps are still mirrored as `--azure`, `--a-100…--a-800`, `--navy`, `--emerald`, `--emerald-100/200/600`, `--n-50…--n-900`, `--white`. Prefer the aliases in new work.

### Space

`--space-1…--space-10` in `@theme`, mirrored in `theme.css` as `--s-1…--s-10`:

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128`

### Radius (new)

Radius carries meaning now. The old system used 8px on every surface, which is a large part of why the build read as a marketplace.

| Token | px | Use |
|---|---|---|
| `--r-hair` | 2 | Spec rows, table cells |
| `--r-xs` | 3 | Thumbnails, index-entry media, gallery frames |
| `--r-sm` | 5 | Buttons, inputs, small tiles |
| `--r-md` | 8 | Panels, wells, standard media, `.dcard` |
| `--r-lg` | 12 | Hero and feature photography |
| `--r-xl` | 18 | Inset full-bleed media |
| `--r-full` | 9999 | Pills only |

`@theme` names are `--radius-hair/xs/sm/md/lg/xl/full`. `--radius-card: 8px` survives as a legacy alias.

### Elevation (new)

Tinted with navy, never neutral black. Used sparingly: the system prefers rules to shadows.

- `--e-lift`, button and arrow hover.
- `--e-raise`, the search bar, the one floating surface.
- `--e-media`, a photograph that must lift off the page.

`@theme` names: `--shadow-lift`, `--shadow-raise`, `--shadow-media`, `--shadow-flat`.

### Motion (new)

- `--ease` = `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-quart). `--ease-soft` for long media moves.
- `--dur-1: 200ms` colour / border / small state, `--dur-2: 300ms` transform / elevation, `--dur-3: 400ms` media scale, `--dur-4: 600ms` page-load stagger only.
- Only `transform`, `opacity`, `color`, `background-color`, `border-color`, `box-shadow` are animated. Never a layout property.
- `prefers-reduced-motion: reduce` collapses every animation and transition globally and disables `scroll-behavior`.

### Measure

`--measure: 68ch` · `--measure-tight: 56ch` · `--measure-wide: 78ch` · `--content: 1280px` · `--gutter: clamp(16px, 5.56vw, 80px)`.

---

## 2. Type ramp

The old ramp was flat (48 / 40 / 32 / 24, then a hard drop to 19px section heads). This one steps at roughly **1.28** throughout and adds the missing middle tiers.

`76 · 59 · 46 · 36 · 28 · 22 · 17 · 14 · 12`

| Class | Size (max) | Line | Tracking | Use |
|---|---|---|---|---|
| `.t-display` **new** | clamp 44→76 | 1.02 | -.032em | Full-bleed hero on photography |
| `.t-h0` | clamp 36→59 | 1.06 | -.028em | Page display title |
| `.t-h1` | clamp 31→46 | 1.10 | -.025em | Page title |
| `.t-h2` | clamp 26→36 | 1.16 | -.022em | Major band title |
| `.t-h3` | clamp 22→28 | 1.22 | -.018em | Section head, the middle tier that was missing |
| `.t-h4` **new** | 22 | 1.27 | -.014em | Rail head, sub-section, entry cluster title |
| `.t-h5` **new** | 17 | 1.35 | -.006em | Smallest heading |
| `.t-lead` **new** | 20 | 1.50 | | Standfirst, page subtitle |
| `.t-body` **new** | 17 | 1.65 | | Default body |
| `.t-bold-20/18/16`, `.t-med-16`, `.t-reg-16`, `.t-black-16`, `.t-med-14`, `.t-reg-14`, `.t-med-12`, `.t-reg-12` | literal | tuned | tuned | UI text, names unchanged |
| `.t-eyebrow` **new** | 12 / 700 / .09em uppercase, `--ink-muted` | | | The one eyebrow treatment. Modifiers `--ink`, `--invert` |
| `.t-num` / `.tnum` **new** | | | | Tabular lining figures. `.t-num` also sets weight 500 and ink |

All display classes get `text-wrap: balance` and `color: var(--ink)`. Sizes are fluid via `clamp()`, so there are no separate mobile overrides to keep in sync.

**Every figure on the site is tabular.** Tabular lining numerals are already applied inside `.spec__v`, `.keyfacts__v`, `.figurine__n`, `.card__price`, `.card__specs`, `.pcard__price`, `.pcard__meta`, `.pcard__season`, `.dcard__meta`, `.dest__meta`, `.opt .pr`, `.coll li span`, `.rating`, `.nearby__d`, `.ar-table`, `.ar-meta`, `.crumb`, `.cta__offer`, `.besttime__m`, `.step__num`, `.chero__count`, `.chero__summary`, `.cat__price`. Use `.tnum` anywhere else a number appears.

Utilities: `.clamp-2`, `.clamp-3` **new**, `.sr-only`.

---

## 3. Layout primitives

| Class | New | What it does |
|---|---|---|
| `.container` | | 1280 content, 80px gutters, clamps down to 16 |
| `.container--narrow` | new | 880 content, for reading-first pages |
| `.bleed` | new | Escapes `.container` to full viewport width (`width:100vw; margin-inline: calc(50% - 50vw)`). `html` is `overflow-x: clip`, so this cannot produce a horizontal scrollbar and sticky still works |
| `.bleed--inset` | new | Caps a bleed at 1720px, centred, `--r-xl` corners (square below 700px) |
| `.spread` | new | The asymmetric spread. `1.62fr / 1fr`, gap `--s-8`, `align-items: start`. One column at 900px |
| `.spread--wide` | new | `2.2fr / 1fr` when the rail is a thin data column |
| `.spread--even` | new | `1fr / 1fr` |
| `.spread--flip` | new | Rail on the left (`direction: rtl` on the grid, `ltr` restored on children) |
| `.spread__main` | new | Left column, `min-width: 0` so overflowing media cannot blow out the grid |
| `.spread__rail` | new | Right column, sticky at `--s-9`. `.spread__rail--static` opts out |
| `.prose` | new | Measured reading column: 68ch, 17/1.7, `--ink-body`, `> * + *` rhythm, styled links and bold. `--wide` (78ch), `--tight` (56ch) |
| `.rule` | new | Hairline `<hr>`. `--strong`, `--ink` (1.5px navy), `--gap` |
| `.stack` / `--sm` / `--lg` | new | Vertical grid gaps |
| `.row` | new | Horizontal flex, wrapping, gap `--s-3` |
| `.grid-3` | | Three-up grid, halves at 980, single at 640 |
| `.reveal` | new | One page-load stagger. Children rise 14px and fade over `--dur-4`, delays 0/70/140/210/280/340ms by `nth-child`. Disabled under reduced motion |

### Section rhythm

Rhythm **varies**. Do not repeat one band down a page.

| Class | Padding-block | Use |
|---|---|---|
| `.section--dense` | 24 | Chip rows, breadcrumb bands |
| `.section--tight` | 32 | Between two related blocks |
| `.section` | 64 | Default |
| `.section--air` | 128 | Before and after the one thing that matters most |
| `.section--flush` | 0 / 64 | First band under a hero |
| `.section--open` **new** | 64 / 0 | Last band before a footer band |
| `.section--ruled` **new** | plus top hairline | |
| `.section--sunk` **new** | plus `--paper-sunk` | |

All drop one step below 700px.

---

## 4. Spec rows, the signature data primitive

Aligned label/value pairs on hairline rules with tabular figures. **Use this for key facts, tides, difficulty, distance, drive times, price bands. Never wrap it in a card.**

```html
<dl class="spec">
  <div class="spec__row">
    <dt class="spec__k">Drive from Victoria</dt>
    <dd class="spec__v">4 hr 20 min
      <span class="spec__note">Highway 4, single lane past Port Alberni</span>
    </dd>
  </div>
  <div class="spec__row">
    <dt class="spec__k">Best months</dt>
    <dd class="spec__v spec__v--signal">March to September</dd>
  </div>
</dl>
```

| Class | Notes |
|---|---|
| `.spec` **new** | Opens on a 1.5px `--rule-ink` rule |
| `.spec__row` **new** | `minmax(7.5rem, 30%) / 1fr`, baseline aligned, 11px block padding, hairline bottom. Stacks below 480px |
| `.spec__k` **new** | 12 / 700 / .07em uppercase, `--ink-muted` |
| `.spec__v` **new** | 16 / 500, `--ink`, tabular lining figures |
| `.spec__note` **new** | 13.5px secondary line inside a value |
| `.spec__v--signal` **new** | Emerald, for in-season / available values |
| `.spec__v--soon` **new** | Amber, for coming-soon values |
| `.spec--split` **new** | Two independent columns of rows, single column below 780px |
| `.spec--tight` **new** | Rail or footer density |
| `.spec--stacked` **new** | Label above value, for narrow rails |
| `.keyfacts` / `__i` / `__k` / `__v` | **Reworked.** Was a bordered grid of boxes. Now an auto-fit set of spec rows, no container border, no fill |
| `.figurine` / `__n` / `__l` **new** | One large tabular number plus an uppercase caption. Maximum two per page, never a hero-metric row |

---

## 5. Season strip

Twelve cells, legible without colour: every cell carries a glyph **and** a fill, and the strip is a real `<table>` with an `.sr-only` caption. Rendered by `app/components/browse/BestTime.tsx`.

| Class | Notes |
|---|---|
| `.besttime` | Wrapper `<figure>` |
| `.besttime__cap` | **Reworked** to an eyebrow: 12 / 700 / .07em uppercase, muted |
| `.besttime__grid` | `table-layout: fixed`, max 540px, 3px column spacing |
| `.besttime__cell` | Hairline-ruled, `--r-hair` corners, `--paper-sunk` off-season. `[data-good="true"]` gets `--signal-wash` fill, emerald rule, `--signal-ink` type |
| `.besttime__m` | Month abbreviation, 11 / 700 / uppercase / tabular |
| `.besttime__dot` | The filled or hollow glyph |
| `.besttime__legend`, `.besttime__sep` | Legend row |
| `.besttime--compact` **new** | The inline variant. 17px cells, no caption chrome, no dot row, no legend. In-season cells keep a darker rule so they survive greyscale. Sits beside a heading or inside an entry body |
| `.seasonline` / `__label` **new** | Flex lockup for a label plus a compact strip on one line |

To render compact, pass both classes to the figure: `className="besttime besttime--compact"`. `BestTime.tsx` needs a `variant` prop to emit that; the component change belongs to whoever owns it.

---

## 6. Headers and navigation

| Class | Notes |
|---|---|
| `.sechead` / `__eyebrow` / `__action` | Section header. `h2` now sits at the `.t-h3` tier (clamp 22→28), the middle step the old system lacked. `--ruled` **new** adds the 1.5px ink rule |
| `.pagehead` / `__sub` | Index or plan page head, 19px subtitle at 68ch |
| `.rowhead` / `__arrows` | Legacy title-plus-arrows row, still used by the landing rails |
| `.crumb` / `__sep` | Plain non-interactive breadcrumb trail. Never a dropdown, never a destination switcher |
| `.nav` / `__inner` / `__logo` / `__links` / `__link` / `__right` / `__list` | Top nav, 72px, solid paper (no glass). Active link is an inset azure underline |
| `.footer` / `__inner` / `__logo` / `__cols` / `__col` / `__rule` / `__copy` | Footer on `--paper-sunk`, column heads are eyebrows |

## 7. Controls

| Class | Notes |
|---|---|
| `.btn` | `--r-sm` corners, 15.5 / 600, 1px press translate, token-curve transitions |
| `.btn--primary` | Azure fill. **One per screen** |
| `.btn--outline` | Neutral rule, azure type, azure wash on hover. The `CtaBlock` default |
| `.btn--ghost` **new** | Transparent, azure type |
| `.btn--ink` **new** | Navy fill, for inverted bands |
| `.btn--white` | White fill, for photography |
| `.btn--amber` | Coming-soon capture |
| `.btn--search` | Search bar size |
| `.btn--block` **new** | Full width |
| `.arrow` / `--filled` | 40px circular rail arrow. Hover darkens the rule and lifts |
| `.chiprow` / `.chip` / `.chip--on` | Filter chips. Active is navy fill, not azure (azure is action) |
| `.goodfor` | "Good for" tags, quiet sunk pills |
| `.profiles` | Traveller-profile shortcut pills |
| `.nearby` / `__i` / `__d` | Nearby-place pills with a round thumbnail |
| `.searchbar` / `__row` / `.searchfield` | The one elevated surface on the site |
| `.capture` / `__title` / `__form` / `__input` | Email capture band, sunk paper on a hairline |

## 8. Focus and accessibility

- Every `a, button, input, select, textarea, summary, details, [tabindex]` gets `outline: 2px solid var(--action); outline-offset: 3px` on `:focus-visible`.
- Interactive photography (`.dcard`, `.cat`, `.feature__media`, `.thumb`) gets an inset white ring plus an azure halo so focus survives on any image.
- Muted text is `--ink-muted` (5.7:1), not `--n-500`. `--ink-faint` exists but must not carry AA body text.
- Emerald **text** always uses `--signal-ink` (4.9:1); raw `--signal` is for fills only.
- Never colour alone: the season strip carries glyphs, badges carry text.

---

## 9. Photography and heroes

| Class | Notes |
|---|---|
| `.hero` / `__media` / `__scrim` / `__title` | Landing hero, `clamp(360px, 52vh, 520px)` |
| `.chero` / `__media` / `__scrim` / `__text` / `__sub` / `__count` / `__summary` | Destination hero. Type set directly on the photograph, generous padding, soft base scrim (no heavy wash). `.chero--sm`, `.chero--bleed` **new** (square corners inside a `.bleed`) |
| `.banner` / `__scrim` / `__content` | Full-bleed banner |
| `.cta-band` | Inverted navy band |
| `.now` / `__media` / `__b` | Seasonal split band. **Reworked**: flat navy, the gradient is gone |
| `.selltile` / `__headline` / `__blurb` / `__go` | Sister-brand tile. **Reworked**: flat navy, the gradient is gone |
| `.gallery` **new** | 3-up photo grid, `--r-xs` frames |
| `.gallery--lead` **new** | Asymmetric: first frame spans 2 by 2 |
| `.thumb` **new** | Generic media link with a hover scale |

## 10. Rails

| Class | Notes |
|---|---|
| `.railwrap` / `.rail` / `.rail__track` / `.rail__arrow` | Horizontal scroll-snap rail. **Slots widened from 172px to 228px** and media moved to 4:3, so a rail entry reads as an index entry rather than a thumbnail. Arrow hides below 1100px |
| `.rail__head` | **Reworked**: opens on a 1.5px ink rule, `h2` at 22px (was 19), subtitle at 13.5 (was 11.5) |
| `.rail__seeall` | Azure link |
| `.scroller` | Landing-page 3-up scroller |
| `.viewall` | Centred "view all" footer |

## 11. Cards and index entries

**`.dcard` is the only true card in the system** (photograph plus name plus place). Everything that used to be a bordered rounded box on white is now an *index entry*: a 1.5px ink rule opens it, the media is larger, and typography carries the hierarchy. Hover moves the rule to azure and scales the media 4%.

| Class | Status | Notes |
|---|---|---|
| `.dest-cards`, `.dcard`, `__scrim`, `__body`, `__name`, `__meta`, `__badge`, `--soon` | **kept as a card** | `--r-md`, 4:3.2, name at 21/700, tabular meta, media scale on hover |
| `.cat`, `__scrim`, `__b`, `__where`, `__price`, `__price--soon` | kept as a card | Same affordance, larger scale. Price uses `--signal-ink`, amber when coming soon |
| `.pcard`, `__media`, `__title`, `__meta`, `__price`, `__free`, `__season`, `__badge` | **reworked, de-boxed** | Border-top hairline, 4:3 media at `--r-xs`, title 16/700 navy. `[data-state="soon"|"sister"]` recolours badge and price |
| `.pcardgrid` | reworked | `auto-fill minmax(244px, 1fr)`, 2-up below 560px |
| `.card`, `__media`, `__body`, `__loc`, `__title`, `__specs`, `__spec`, `__foot`, `__price`, `__note`, `__fav`, `--holiday` | **reworked, de-boxed** | No border, no rounded container, no shadow. Border-top hairline, 16:10 media, two-line title reserve and pinned footer so rows still align |
| `.card__heart` | **force-hidden** | Heart icons are banned. Remove the element from `ListingCard.tsx` |
| `.rating` | reworked | Was an emerald pill, but emerald is availability, not a review score. Now ink on sunk paper with a hairline, tabular |
| `.dests`, `.dest__media`, `__name`, `__meta` | reworked | Media scales on hover, tabular meta |
| `.feature`, `__media`, `__scrim`, `__cap`, `__side` | reworked | One large photograph beside a **ruled list**, not four equal cards. `.feature__side` gap is 0 because `.mini` supplies its own rules |
| `.mini`, `__b` | **reworked, de-boxed** | Hairline rows, first row on the ink rule. Was a bordered box inside a bordered layout, which is the nested-card failure |
| `.collections`, `.coll` | **reworked, de-boxed** | Three ruled indexes, not three grey boxes. Items are hairline rows with a tabular right-hand count |
| `.kicker`, `.kicker--ink` | reworked | The `--ink` variant is a plain eyebrow now, not an azure pill (azure is action only) |

## 12. Panels and bands

| Class | Notes |
|---|---|
| `.panel`, `__title`, `__lead`, `__media` | **Reworked**: sunk paper, not an azure wash |
| `.feat`, `__icon`, `__title`, `__text` | Hairline rows inside the panel. Icon well is neutral, not azure |
| `.masonry`, `.review`, `__head`, `__avatar`, `__name`, `__date`, `__text`, `.review--media`, `__overlay`, `__play`, `.reviews__head`, `__sub`, `.reviews__more` | **Reworked**: flat paper on a hairline, no shadow stack |
| `.steps`, `__title`, `__grid`, `.step`, `__num`, `__title`, `__text` | **Reworked**: the grey rounded panel and the azure numbered squares are gone. Three ruled columns with large tabular numerals |
| `.promise__title`, `__grid`, `__card`, `__icon`, `__name`, `__text` | **Reworked**: shadowed boxes to ruled columns |
| `.softnote` | Editor explainer, dashed hairline |

## 13. CTA engine

Driven by `app/lib/cta.ts`. **Never `.btn--primary`**: the page's single primary action lives elsewhere.

| Class | Notes |
|---|---|
| `.cta`, `__button`, `__offer` | Base, uses `.btn--outline` |
| `.cta--live` **new styling** | Emerald rule and type: bookable now |
| `.cta--sister` | Solid navy fill, so the ArcTrips Fishing hand-off still reads as a strong action |
| `.cta--soon`, `__notify-form`, `__notify-input`, `__notify-error` | Amber capture surface, `--r-sm` |
| `.cta__badge` | **Reworked** from an azure pill to a plain eyebrow |

## 14. Reading, article, FAQ

| Class | Notes |
|---|---|
| `.guidelayout`, `.guiderail`, `.guiderail-stack` | Article beside a sticky booking rail, stacks below 1000px |
| `.toc`, `__label`, `__list` | **Reworked, de-boxed**: hairline rows with a leading dash that extends on hover, not a bordered grey card |
| `.buy`, `__head`, `__foot`, `__fine`, `.opt`, `.pr` | Booking rail. Navy head, hairline option rows, tabular prices |
| `.guide-places`, `.guide-place`, `__blurb` | Places as sections inside a guide |
| `.keepgoing` | Onward-navigation block on the ink rule |
| `.cityintro` | 19px intro paragraph at 68ch |
| `.ar`, `.ar-head`, `.ar-chip`, `.ar-title`, `.ar-standfirst`, `.ar-meta`, `.ar-meta__dot`, `.ar-hero` | Article header. `.ar-chip` is an eyebrow now, not an azure pill |
| `.ar-body`, `.ar-lead`, `.ar-p` | 17/1.75 at 68ch. Lead is 20px ink at 56ch |
| `.ar-h2` | **Reworked**: 28px on a 1.5px ink rule. The azure-to-emerald gradient bar is gone |
| `.ar-h3` **new** | 22px sub-heading |
| `.ar-list` | Hairline dash markers, was an emerald diamond |
| `.ar-table-wrap`, `.ar-table` | **Reworked**: rule-based table, uppercase muted head, no navy header fill, no zebra stripes, tabular figures throughout |
| `.ar-fig`, `.ar-fig--wide` **new** | Interleaved photography with a caption. `--wide` breaks the measure up to 1080px |
| `.ar-note` | **Reworked**: top hairline rule. The azure left side-stripe is gone (side stripes are banned) |
| `.faq`, `__item`, `__q`, `__a` | **Reworked**: 16px question (was 12.5), 16px answer (was 11.5), plus-to-cross toggle on the token curve |

---

## 15. Removed

These were defined but referenced by no `.tsx` in the repo (verified by grep against `app/**/*.tsx`) and were deleted with the S1 rebuild:

`.tabbar*`, `.dockbar`, `.has-dockbar`, `.themegrid*`, `.things`, `.thing*`, `.guides`, `.guide` and `.guide__*` (the old guide card; `.guide-place*`, `.guidelayout`, `.guiderail*` are unaffected), `.area-hero*`, `.area-layout`, `.area-nav*`, `.area-section`, `.area-prose`, `.area-gallery` (replaced by `.gallery`), `.gs-back*`, `.gs-label`, `.gs-list`, `.gs-item*`, `.guide-side`, `.guide-layout`, `.readlayout`.

If you need one back, build it from the primitives above rather than restoring the old rule.

## 16. Building a page against this system

1. Open with a hero (`.chero`, optionally inside `.bleed`).
2. Follow with the data, not prose: a `.spec` block and a `.besttime` strip inside a `.section--tight`.
3. Then the long-form in a `.spread`: `.prose` in `.spread__main`, `.spec--tight` plus the CTA in a sticky `.spread__rail`.
4. Vary the rhythm: `--tight`, then `--air` around the one thing that matters, then default.
5. Photography earns width. Use `.bleed` or `.gallery--lead` rather than a third equal grid.
6. One `.btn--primary`. Everything else is `.btn--outline` or `.btn--ghost`.
7. Every number gets `.tnum`, or lives in a class that already sets it.
8. If you are about to add a bordered rounded box, add a `.rule` and a heading instead.
