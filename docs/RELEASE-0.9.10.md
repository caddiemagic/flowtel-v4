# Flowtel v0.9.10 — Final Suite Alignment + Test User Guide

## Purpose

This release completes the last visible Suite alignment notes before beta testing: Moon Magic now lives above the Medicine Wheel, and the Mentor to the Moon card aligns with the other full-width Suite cards.

It also adds a test-user guide for creating clean Supabase beta accounts.

## What changed

- Moved the Moon Magic pill out of the Reflection card and above the Medicine Wheel.
- Kept the Moon Magic pill's existing visual treatment, copy, typography, border, spacing language, and color system.
- Removed any older injected Reflection Moon Magic pill so cached sessions do not show duplicate Moon Magic guidance.
- Made the Mentor to the Moon card the same full Suite width as the other lower Suite cards.
- Updated the Suite app cache-busting query string to `v=0.9.10`.
- Added `docs/TEST_USERS.md` with the recommended beta test user setup process.

## No new migrations

No Supabase migration is required for v0.9.10.

Required historical migrations for a complete beta environment remain:

- `database/migration-010-concierge-rls-and-flowtel-date.sql`
- `database/migration-011-suite-concierge-polish.sql`
- `database/migration-012-turndown-completion-hardening.sql`
- `database/migration-013-turndown-completion-rpc.sql`
- `database/migration-014-choose-your-mentor.sql`
- `database/migration-015-mentor-connect-and-polish.sql`
- `database/migration-016-mentor-connection-consent-foundation.sql`
- `database/migration-017-cycle-data-dashboard-mvp.sql`
- `database/migration-018-actual-vs-recorded-cycle-day.sql`

## Changed files

Replace/add:

- `client/index.html`
- `client/app.js`
- `client/styles.css`
- `docs/CHANGELOG.md`
- `docs/RELEASE.md`
- `docs/RELEASE-0.9.10.md`
- `docs/TEST_USERS.md`

## Smoke test

1. Open the Suite.
2. Confirm Moon Magic appears above the Medicine Wheel.
3. Confirm the Reflection card no longer contains Moon Magic.
4. Confirm the Mentor to the Moon card aligns to the same width as the Reflection card and other full-width Suite cards.
5. Confirm the Medicine Wheel still renders and seasonal links still open the seasonal dashboard views.
