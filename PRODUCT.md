# PRODUCT.md

## What this is

**Arc Trips Destinations.** Not a marketplace listing page. A **planning instrument**: a structured database of places, activities, seasons and stays that answers the questions a guest has *before* they know what to book.

The guest arrives one step earlier than every other travel product: "I have heard of Tofino. What is it? What would I do there? When should I go? Is it right for us?" Every existing surface assumes they already decided.

`register`: **brand** for `/` and `/destinations` index surfaces. **product** for the destination tree, where density and scannability beat expression.

## Users

- **Undecided guest.** Arrives from organic search on an informational query ("whale watching Tofino", "best time to visit Ucluelet"). Browsing, not buying. Needs orientation fast, then a reason to trust us.
- **Decided, unprepared guest.** Has nearly booked. Using guides to prepare. High intent for add-ons. Wants specifics: tides, months, drive times, what to bring.
- **Content editor.** Publishes destinations and guides. Never sees a CMS in this repo yet.

## Tone

Calm, premium, trust-forward. Not promotional, not discount-driven, never breathless. We publish a destination only once we have stayed there and can answer the awkward questions, and the interface should feel like it was written by someone who has actually been.

**Photography is the stage. Type is restrained and precise.**

## Anti-references

The design must not read as any of these:

- **Generic Airbnb/marketplace clone.** Endless equal card grids, heart icons, rounded rectangles, "Guest favorite" pills. This is what the current build looks like and it is the thing to escape.
- **SaaS landing page.** Hero metric, three feature columns with icons, gradient accents, testimonial carousel.
- **Tourism board brochure.** Stock smiling couples, script fonts, sunset gradients, exclamation marks.
- **AI slop.** Purple gradients, glassmorphism, identical icon-heading-text cards, decorative blur.

## Strategic principles

1. **The data is the design.** Months, tides, difficulty, drive times, prices, counts. Surface real structured values rather than hiding them in prose. A guest planning a trip wants specifics, and specifics are what competitors do not have.
2. **Never a dead end.** Every page offers something bookable today, even when its own vertical is coming soon.
3. **Editorial density over card soup.** Long-form content is the asset. Treat it like an almanac or field guide, not a product catalogue.
4. **One primary action per screen.** Everything else is quiet.
5. **Scale without a redesign.** 24 destinations today, 200 later. Nothing may depend on hand-tuning a page.

## Hard rules, non-negotiable

- **No italics anywhere.** The owner has difficulty reading italic text. `em, i` are neutralised in `theme.css`.
- **No em dashes** in any rendered copy, UI text, or commit message.
- **No emoji** in product copy.
- **Brand colours are locked.** Azure `#2874BA`, Emerald `#3A9679`, navy `#0B3356`, plus the neutral ramp in `app/globals.css`. Do not introduce new hues.
- **Inter only**, per the Figma system. Satoshi for the `ARCTRIPS` wordmark only.
- No hardcoded hex in components. Use the tokens.
