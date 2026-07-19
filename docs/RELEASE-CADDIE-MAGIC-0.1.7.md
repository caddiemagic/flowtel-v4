# Caddie Magic v0.1.7 — Elevated Clubhouse Fonts + Full Direction Wheel Asset

## Purpose

This release gives the Caddie Magic portal a more visible typography and styling upgrade, restores the full wooden wheel artwork with all four directions intact, removes the dashboard gold ring treatment, and refines the Score Map center wheel sizing and spacing.

## What changed

- Added a more distinct typography pairing across the Caddie Magic suite using a refined club-style display font and cleaner body font.
- Gave the main Caddie Magic portal another styling pass with a more elegant private-club presentation.
- Tightened and reduced the visual footprint of the **My Moon Score Data** hero so the header pill takes up less space.
- Replaced the wheel-center asset with the newly provided updated wheel artwork.
- Removed the checker / solid background from the new wheel artwork and saved it as a transparent asset.
- Preserved all four directions on the wheel artwork so **North / East / South / West** are no longer cut off.
- Removed the decorative gold wheel ring treatment from the dashboard moon wheel.
- Increased the Score Map center wheel slightly while keeping added buffer space so it does not overlap nearby scores or notes.
- Updated cache versions to `0.1.7`.

## Supabase

No Supabase migration required.

## JS syntax checks

- `node --check caddie-magic/app.js`
- `node --check caddie-magic/score-map/app.js`

## First test checklist

1. Open `/caddie-magic/`.
2. Confirm the page typography now looks visibly different.
3. Confirm the hero feels narrower / lighter.
4. Confirm the center wheel shows the full directional artwork without cropped labels.
5. Confirm the decorative gold ring around the wheel is gone.
6. Open `/caddie-magic/score-map/`.
7. Confirm the center wheel is slightly larger.
8. Confirm the wheel does not overlap quadrant notes or scores.
9. Confirm the Score Map and Locker both use the updated fonts and styling.
