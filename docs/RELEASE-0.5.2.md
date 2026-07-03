# Flowtel Release 0.5.2 — Beta workflow fixes + Flow FM initiation

## Changed files

- `client/index.html`
- `client/app.js`
- `client/styles.css`
- `manager/index.html`
- `manager/app.js`
- `manager/styles.css`
- `shared/stays.js`
- `shared/flowtel.js`
- `shared/profiles.js`
- `shared/turndown.js`
- `shared/initiation.js`
- `database/migration-005-beta-workflow.sql`
- `database/seed-beta-test-profiles.sql`

## What changed

- Every saved reflection now creates a new reflection entry.
- Previous visit/day drawer displays all reflection entries for that stay.
- Turndown Service now updates `flowtel_stays`, the table used by the app.
- Guests in House now counts people who checked in today.
- Practitioner clock-in sessions are stored for future hour/reward tracking.
- Clock Out writes a clock-out timestamp when possible.
- Flowtel Lounge opens at the top of the page.
- Personal checkout now opens a clean completion screen.
- Flow FM 13 Moon initiation metadata is available for practitioner profiles.
- Concierge Desk Today's Flow now includes the practitioner's initiation moon/level.

## Required database step

Run:

`database/migration-005-beta-workflow.sql`

in the Supabase SQL Editor before testing reflection logs, practitioner clock tracking, or Flow FM initiation metadata.

## Commit

`Release 0.5.2 - Beta workflow fixes and Flow FM initiation`
