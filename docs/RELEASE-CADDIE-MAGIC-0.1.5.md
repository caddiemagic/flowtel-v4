# Caddie Magic v0.1.5 — Flowtel Wheel-Center Styling Alignment

## Purpose

This release aligns the Caddie Magic suite more closely with the Flowtel styling system while preserving the darker Caddie Magic palette. It also changes the medicine wheel implementation so the wheel center works like the Flowtel tracker: a centered image inside the number ring.

## What changed

- Rebuilt the Caddie Magic wheel center to use a centered artwork image rather than a CSS-constructed wheel.
- Added the supplied wooden ship-wheel artwork as `assets/caddie-magic-wheel-center.png`.
- Preserved the existing clickable 28-day number ring.
- Hid the standalone club direction labels so the centered wheel artwork reads cleanly.
- Refined the overall Caddie Magic suite styling to better match Flowtel structure and polish while keeping Caddie Magic colors.
- Updated the Moon Score Data dashboard card styling.
- Updated the snapshot cards, selected-day detail, Mood Swings card, Player Locker card, Caddie Notes, and round history styling.
- Updated the Moon Score Map page styling and center marker to use the same wheel artwork.
- Updated cache versions to `0.1.5`.

## Supabase

No Supabase migration required.

## JS syntax checks

- `node --check caddie-magic/app.js`
- `node --check caddie-magic/score-map/app.js`

## First test checklist

1. Open `/caddie-magic/`.
2. Confirm the moon wheel still has the full 28-position number ring.
3. Confirm the center of the wheel now uses the supplied wooden ship-wheel image.
4. Confirm the moon-day buttons still open the correct selected-day data.
5. Confirm the dashboard and locker cards feel visually aligned with Flowtel styling while keeping Caddie Magic colors.
6. Open `/caddie-magic/score-map/` and confirm the styling alignment carries through.
7. Confirm the center marker on the Score Map also uses the Caddie Magic wheel artwork.
8. Confirm the printable Score Map page still opens cleanly.
