# Flowtel v0.9.9 — Beta Freeze + QA Polish

## Purpose

This release freezes the current beta feature set and prepares Flowtel for structured tester use. It does not add a new product surface or Supabase schema change. The focus is deployment reliability, documentation, and a clear QA path before wider Flow FM practitioner beta testing.

## What changed

- Added cache-busted stylesheet and app script references for the Suite, Concierge Desk, and Cycle Data dashboard so beta testers are less likely to see stale front-end assets after deploy.
- Added a full beta QA checklist covering guest flow, mentor flow, concierge flow, cycle data, seasonal reflections, permissions, privacy, mobile checks, and release-readiness.
- Updated the active release notes and changelog to mark the current package as v0.9.9.

## No new migrations

No Supabase migration is required for v0.9.9.

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
- `manager/index.html`
- `cycle-data/index.html`
- `docs/CHANGELOG.md`
- `docs/RELEASE.md`
- `docs/RELEASE-0.9.9.md`
- `docs/BETA_QA_CHECKLIST-0.9.9.md`

## Test checklist

Use `docs/BETA_QA_CHECKLIST-0.9.9.md` as the canonical test script.

Minimum smoke test:

1. Open Suite as a guest and confirm today’s stay loads.
2. Confirm Cycle Data pill shows Actual Cycle Day, Recorded Cycle Day, and compassionate feedback.
3. Confirm Choose Your Mentor does not show the logged-in guest/practitioner as their own mentor option.
4. Request a mentor, connect as that mentor, and confirm the guest appears under Your Clients.
5. Confirm View Data opens the client dashboard.
6. Confirm each seasonal card opens a seasonal reflection dashboard.
7. Request Turndown, complete Turndown with a note, and confirm the request moves to Completed Requests.
8. Confirm Previous Stays still shows append-only history.

## Release posture

Feature set is beta-frozen. New work after this release should be bug fixes, profile photo sourcing, dashboard redesign, opt-out/privacy controls, and true Squarespace identity bridge work.
