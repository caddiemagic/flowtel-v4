# Caddie Magic File Manifest

Latest integrated release: **Caddie Magic v0.5.0**

## Player application

- `caddie-magic/index.html`
- `caddie-magic/app.js`
- `caddie-magic/styles.css`
- `caddie-magic/score-map/index.html`
- `caddie-magic/score-map/app.js`
- `caddie-magic/score-map/styles.css`
- `caddie-magic/score-map/printable/index.html`
- `caddie-magic/score-map/printable/styles.css`
- `caddie-magic/collective-map/index.html`
- `caddie-magic/collective-map/app.js`
- `caddie-magic/collective-map/styles.css`

## Caddie Compass and Cardinal Club rooms

- `caddie-magic/compass/index.html`
- `caddie-magic/compass/app.js`
- `caddie-magic/compass/styles.css`
- `caddie-magic/compass/club/index.html`
- `caddie-magic/compass/club/app.js`
- `caddie-magic/compass/club/styles.css`
- `caddie-magic/compass/admin/index.html`
- `caddie-magic/compass/admin/app.js`
- `caddie-magic/compass/admin/styles.css`

The admin Compass path is retained for historical owner/admin records. Active Caddie Network roles do not receive assignments, Messages, Caddie Notes, or write access to player data.

## Caddie Network

- `caddie-magic/caddies/index.html`
- `caddie-magic/caddies/app.js`
- `caddie-magic/caddies/styles.css`
- `caddie-magic/caddie-desk/index.html`
- `caddie-magic/caddie-desk/app.js`
- `caddie-magic/caddie-desk/styles.css`
- `shared/caddie-magic-network.js`

## Shared modules

- `shared/caddie-magic-access.js`
- `shared/caddie-magic-reviews.js` — legacy history only
- `shared/caddie-magic-compass.js`
- `shared/caddie-magic-schedule.js`
- `shared/caddie-magic-moon-calendar.js`
- `shared/product-access.js`
- `shared/supabase.js`

## Owner integration

- `manager/index.html`
- `manager/app.js`
- `manager/styles.css`

## Assets

- `assets/caddie-magic-medicine-wheel-directions.png`
- `assets/caddie-magic-map-wheel.png`
- `assets/caddie-magic-wheel-center.png`
- `assets/queendom-scarab-sundisk-transparent.png`

## Database migrations

- `database/migration-030-caddie-magic-moon-score-tracker.sql`
- `database/migration-040-caddie-magic-reflections-collective-swing-map.sql`
- `database/migration-041-caddie-magic-review-service.sql` — preserved legacy history
- `database/migration-042-caddie-magic-compass-assignments-dispatches.sql` — preserved legacy history
- `database/migration-043-caddie-magic-v0.4.0-portal-polish-upcoming-golf.sql`
- `database/migration-044-caddie-magic-player-only-access-private-beta.sql`
- `database/migration-045-caddie-magic-player-invite-code-hotfix.sql`
- `database/migration-052-caddie-magic-caddie-network-foundation.sql`

Run migration 052 after migration 051.
