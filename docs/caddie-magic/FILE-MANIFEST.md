# Caddie Magic File Manifest

Latest integrated release: **Caddie Magic v0.5.2** preserved through **Flowtel v0.10.73**

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
- `manager/caddie-team/` — owner-only full Caddie Concierge Team profiles

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
- `manager/caddie-team/index.html`
- `manager/caddie-team/app.js`
- `manager/caddie-team/styles.css`

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
- `database/migration-053-caddie-network-reintegration-shared-scheduling.sql` — historical; already live
- `database/migration-055-caddie-master-command-center.sql` — run once for v0.5.2/v0.10.70

Do not rerun or rename either migration 052 file. Migration 037 remains retired.

## Release and validation files

- `docs/RELEASE-CADDIE-MAGIC-0.4.6.md`
- `docs/RELEASE-CADDIE-MAGIC-0.5.0.md`
- `docs/RELEASE-CADDIE-MAGIC-0.5.1.md`
- `docs/RELEASE-CADDIE-MAGIC-0.5.2.md`
- `docs/RELEASE-0.10.70.md`
- `docs/RELEASE-0.10.68.md`
- `scripts/validate-caddie-magic.mjs`
- `scripts/validate-caddie-master-command-center.mjs`

Run `node scripts/validate-caddie-magic.mjs` and `node scripts/validate-caddie-master-command-center.mjs` before shipping.
