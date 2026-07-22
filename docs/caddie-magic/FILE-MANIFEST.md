# Caddie Magic File Manifest

Latest integrated release: **Caddie Magic v0.5.1** with **Flowtel v0.10.68**

## Application files

- `caddie-magic/index.html`
- `caddie-magic/app.js`
- `caddie-magic/styles.css`
- `caddie-magic/score-map/`
- `caddie-magic/collective-map/`
- `caddie-magic/compass/`
- `caddie-magic/compass/admin/`
- `caddie-magic/compass/club/`
- `caddie-magic/caddies/`
- `caddie-magic/caddie-desk/`

## Shared modules

- `shared/caddie-magic-access.js`
- `shared/caddie-magic-reviews.js`
- `shared/caddie-magic-compass.js`
- `shared/caddie-magic-network.js`
- `shared/caddie-magic-schedule.js`
- `shared/caddie-magic-moon-calendar.js`
- `shared/caddie-magic-score-calculations.js`
- `shared/product-access.js`
- `shared/supabase.js`

## Owner integration

- `manager/index.html`
- `manager/app.js`
- `manager/styles.css`

## Core assets

- `assets/caddie-magic-medicine-wheel-directions.png`
- `assets/caddie-magic-map-wheel.png`
- `assets/caddie-magic-wheel-center.png`
- `assets/queendom-scarab-sundisk-transparent.png`

## Database history

- `database/migration-030-caddie-magic-moon-score-tracker.sql`
- `database/migration-040-caddie-magic-reflections-collective-swing-map.sql`
- `database/migration-041-caddie-magic-review-service.sql`
- `database/migration-042-caddie-magic-compass-assignments-dispatches.sql`
- `database/migration-043-caddie-magic-v0.4.0-portal-polish-upcoming-golf.sql`
- `database/migration-044-caddie-magic-player-only-access-private-beta.sql`
- `database/migration-045-caddie-magic-player-invite-code-hotfix.sql`
- `database/migration-052-caddie-magic-caddie-network-foundation.sql` — historical and already live
- `database/migration-052-combined-flowtel-caddie-updates.sql` — historical and already live
- `database/migration-053-caddie-network-reintegration-shared-scheduling.sql` — run once for v0.5.1/v0.10.68

Do not rerun or rename either migration 052 file. Migration 037 remains retired.

## Release and validation files

- `docs/RELEASE-CADDIE-MAGIC-0.4.6.md`
- `docs/RELEASE-CADDIE-MAGIC-0.5.0.md`
- `docs/RELEASE-CADDIE-MAGIC-0.5.1.md`
- `docs/RELEASE-0.10.68.md`
- `scripts/validate-caddie-magic.mjs`

Run `node scripts/validate-caddie-magic.mjs` before shipping.
