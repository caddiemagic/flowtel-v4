# Caddie Magic v0.1.6 — Elegant Navy Clubhouse Styling + Clean Wheel Transparency

## Purpose

This release cleans up the wheel artwork presentation, removes the unwanted circular background treatments, and gives the full Caddie Magic suite a more elegant, elevated styling pass.

## What changed

- Cleaned the wheel-center artwork so the checkerboard background no longer appears in the Caddie Magic portal.
- Kept the provided wooden wheel artwork and used it as a transparent asset inside the dashboard wheel and Score Map center.
- Removed the circular / gradient background treatment from the cards and simplified the visual system into cleaner navy panels.
- Updated the full suite typography to a more refined, classic club-style combination.
- Reduced the visual footprint of the “My Moon Score Data” hero header so the top pill feels narrower and lighter.
- Refined the hero, Moon Score Data dashboard, snapshot cards, selected-day detail, Mood Swings, Player Locker, Caddie Notes, and round history styling.
- Increased the Score Map center wheel slightly.
- Added spacing around the Score Map center so the wheel does not overlap nearby scores or notes.
- Updated cache versions to `0.1.6`.

## Supabase

No Supabase migration required.

## JS syntax checks

- `node --check caddie-magic/app.js`
- `node --check caddie-magic/score-map/app.js`

## First test checklist

1. Open `/caddie-magic/`.
2. Confirm the wheel center no longer shows a checkerboard background.
3. Confirm the dashboard wheel still uses the clickable 28-day number ring.
4. Confirm the overall portal no longer shows the circular background treatment on the cards.
5. Confirm the typography and overall styling feel more elevated and refined.
6. Open `/caddie-magic/score-map/`.
7. Confirm the Score Map center wheel is slightly larger.
8. Confirm the center wheel does not overlap scores or notes in the quadrants.
9. Confirm the printable Score Map page still opens cleanly.
