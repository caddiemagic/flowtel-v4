# Caddie Magic v0.1.4 — First Class Navy Gold Country Club Facelift

Visual refinement release for the Caddie Magic Locker and Moon Score Map.

## Purpose

This release returns the Caddie Magic cards and pills to the velvety navy direction while upgrading the finish into a quieter first-class country club experience. The visual goal is less oversized, less dashboard-like, and more refined gold-card hospitality.

## What changed

- Returned the Caddie Magic cards, data pills, stats, history rows, Caddie Notes, and Score Map entries to navy backgrounds.
- Added layered navy gradients, restrained gold edging, inset highlights, and subtle card shine for a first-class gold-card treatment.
- Downsized heading typography across the Locker and Score Map.
- Refined every Caddie Magic button into a slimmer, quieter shape with lighter typography and gold detailing.
- Preserved the green primary-action treatment for Log a Round.
- Preserved the wooden ship wheel, gold rose compass center, and existing 28-position number ring.
- Removed the redundant **Open Score Map** button from the Moon Score Data card.
- Kept the hero-level **Open Score Map** action and the Round History Score Map action.
- Updated asset cache versions to `0.1.4`.

## Supabase

No Supabase migration required.

## JS syntax checks

- `node --check caddie-magic/app.js`
- `node --check caddie-magic/score-map/app.js`

## First test checklist

1. Open `/caddie-magic/`.
2. Confirm the hero and all dashboard cards / pills use navy backgrounds with gold details.
3. Confirm heading fonts are smaller and quieter than v0.1.3.
4. Confirm buttons are slimmer and feel less bulky.
5. Confirm the hero still includes **Log a Round** and **Open Score Map**.
6. Confirm the Moon Score Data card no longer has its own redundant **Open Score Map** button.
7. Confirm the 28-position number ring is unchanged.
8. Confirm the wooden ship wheel and gold rose compass center remain intact.
9. Confirm **MOOD SWINGS** and **CADDIE NOTES** remain intact.
10. Open `/caddie-magic/score-map/` and confirm all score cards, filters, sidebar pills, and insight cards use the upgraded navy / gold treatment.
11. Confirm the printable Score Map exercise still renders and prints cleanly.
