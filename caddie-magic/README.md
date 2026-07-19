# Caddie Magic Application

This directory is the canonical Caddie Magic product surface inside the shared Flowtel repository.

## Canonical pages

- `/caddie-magic/` — Scorecard, Player Profile, Caddie Review, and entry logging
- `/caddie-magic/score-map/` — private player Score Map
- `/caddie-magic/collective-map/` — anonymous Locker Room
- `/caddie-magic/compass/` — player Caddie Compass, Homework, Caddie Shack, and upcoming golf
- `/caddie-magic/compass/admin/` — owner/admin Caddie Compass management

## Shared Caddie Magic modules

- `shared/caddie-magic-access.js`
- `shared/caddie-magic-reviews.js`
- `shared/caddie-magic-compass.js`
- `shared/caddie-magic-schedule.js`
- `shared/product-access.js`

## Access boundary

Caddie Magic players use the explicit product-access registry introduced in migration 044. A player-only account has:

- `caddie_magic_access = true`
- `flowtel_access = false`
- `access_role = 'player'`

Do not replace the Caddie Magic directory with files from a Flowtel-only branch. Run `node scripts/validate-caddie-magic.mjs` before shipping a merged release.
