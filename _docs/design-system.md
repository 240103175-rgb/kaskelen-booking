# Design system

## References

The coding agent builds screens from these references instead of inventing a style:

| Reference | What we take from it |
|---|---|
| Fresha / Booksy (beauty & barber booking) | Venue cards with a cover, rating-free compact meta row, time slots as a grid of pills |
| Playtomic (sports court booking) | Horizontal day strip, "today" first, one tap on a free slot books it |
| Airbnb | Category chips that scroll sideways, generous white space, rounded cards |
| Linear / Vercel dashboards | Business panel: dense rows, status pills, small ghost buttons |

## Tokens (`frontend/src/styles.css`, `:root`)

- **Colour:** primary indigo `#4f46e5` (dark mode `#818cf8`), surfaces `#ffffff` / `#f2f3f8`, text `#0f172a` / `#475569` / `#94a3b8`; status: ok green, warn amber, danger red — each with a soft background.
- **Category colours:** each category has a hue pair (`--h`, `--h2`) used for tiles, card covers and the venue header gradient.
- **Type:** Manrope 400–800; h1 `clamp(1.7rem, 4vw, 2.4rem)` 800, body 16px.
- **Shape:** radius 20px cards, 14px inputs and slots, 999px pills and buttons.
- **Dark mode:** follows `prefers-color-scheme`, all colours come from tokens.

## Components

Header (sticky, blurred), hero with search, category tile, chip, venue card, day strip, slot (free / full / blocked / past / mine), booking card, status pill, toast, form field, ghost / primary / danger-soft buttons.

## States every screen must have

- **Loading:** spinner + "Жүктелуде…".
- **Empty:** dashed box with a sentence that says what to do next.
- **Error:** red box with the translated reason and a **Retry** button.
- **Busy action:** the pressed button is disabled and shows "Жіберілуде…".
- Mobile first: works at 375 px without horizontal scroll; slots 3 per row.
