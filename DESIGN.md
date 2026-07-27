# DESIGN.md

## Direction: field guide, not catalogue

The reference is a **well-made almanac** crossed with a booking tool: hairline rules, tabular figures, dense specification rows, generous editorial measure, photography given real room. The opposite of an equal-card marketplace grid.

The one thing a guest should remember: **this site tells you when to go and what it is actually like, in numbers, before it tries to sell you anything.**

## Colour strategy: restrained

Tinted neutrals carry the surface. Azure is action only. Emerald is the availability and season signal only. Neither is decorative.

Locked values, from `app/globals.css`. Do not add hues.

| Role | Token | Use |
|---|---|---|
| Action | `--azure` `#2874BA` | Links, primary button, focus. Nothing else. |
| Signal | `--emerald` `#3A9679` | In season, available, bookable now. Never decoration. |
| Ink | `--navy` `#0B3356` | Headings and display type. |
| Paper | `--n-50` to `--n-100` | Surfaces, rules, wells. |
| Body | `--n-700` | Long-form text. |

Never pure `#000` or `#fff` for large surfaces; the neutral ramp is already slightly cool and should stay that way.

## Theme: light

The scene: someone on a laptop at a kitchen table on a Sunday, twelve tabs open, comparing two towns and trying to work out whether February is a mistake. Daylight, long reading sessions, lots of photography. Dark would fight the imagery and the reading.

## Typography: Inter, used with real contrast

The failure in the current build is a flat ramp: everything weight 700, page title 40px, section heads 19px, nothing between. Fix the scale, not the family.

- Display and headings: Inter, weight 700, tight tracking (`-0.025em` at large sizes).
- Body: weight 400, 17px, line-height 1.65, measure 68ch maximum.
- Data and figures: `font-variant-numeric: tabular-nums`, weight 500. Numbers must align in columns.
- Eyebrows: 12px, weight 700, `0.09em` tracking, uppercase, neutral 500.
- Step ratio at least 1.25 between adjacent levels.

## Layout

- **Asymmetry over centred stacks.** A destination page should read as a spread, not a column of full-width bands.
- **Vary the rhythm.** Hero, then dense data, then air, then long-form. Identical padding everywhere is monotony.
- **Rules over boxes.** Prefer hairline dividers and typographic grouping to another bordered card. Nested cards are always wrong.
- **Cards only where a card is genuinely the right affordance**: a photograph plus a name plus a destination. Not for text blocks, not for data.
- **Do not wrap everything in `.container`.** Full-bleed photography earns the whole viewport.

## Signature elements

These are what make it recognisably Arc Trips rather than a template:

1. **The season strip.** Twelve cells, filled or hollow, legible without colour. Already built in `BestTime.tsx`. It should appear on category pages, on cards, and in compact form beside a destination name.
2. **Spec rows.** Key facts, tides, difficulty, distance, drive time, rendered as aligned label/value pairs with tabular figures and hairline rules. Not as bordered cards.
3. **Full-bleed photography** with typography set directly on it, generous margin, no heavy scrim wash.

## Motion

Restrained. Ease-out only (`cubic-bezier(0.16, 1, 0.3, 1)`), 200 to 400ms. Never animate layout properties. One staggered reveal on page load at most. No bounce, no parallax, no scroll-jacking.

## Accessibility

- WCAG 2.1 AA contrast throughout.
- Never colour alone: the season strip carries glyphs, badges carry text.
- Visible focus rings, keyboard operable, `prefers-reduced-motion` respected.

## Banned

Side-stripe borders. Gradient text. Glassmorphism. Hero-metric templates. Identical card grids. Modals as a first thought. Heart icons on cards. Purple anything.
