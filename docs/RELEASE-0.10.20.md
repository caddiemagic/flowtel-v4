# Flowtel v0.10.20 — Trusted Doorway + Beta Reset Guide

## Purpose

Prepare Flowtel for Phase 1 beta testing without blocking the rollout on Squarespace Contacts API instability.

Flowtel now treats the Squarespace member page as the trusted front gate during beta. A Queendom / Flow FM member can enter through the protected Squarespace doorway, create or open a Flowtel room key once, and then let Supabase remember the browser session for future check-ins.

## What changed

- Added trusted-doorway beta fallback to `/api/squarespace-bridge`.
- If Squarespace Contacts rejects or cannot complete the lookup, the bridge can still prepare/open the Flowtel account during Phase 1 beta.
- Preserved the Squarespace Contacts path for later: verified Contacts still store Squarespace contact metadata when the API works.
- Added a remembered-room-key startup check in `client/app.js`:
  - if Supabase has an active session, bypass the email doorway;
  - open today’s Suite if the guest already checked in;
  - otherwise open Check-In.
- Added test helpers:
  - `/client/?logout=1` signs out and clears local room-key cache;
  - `/client/?forceDoorway=1` forces the doorway even if a session exists.
- Updated doorway copy to make the Phase 1 trusted doorway clear.
- Added a beta data reset guide and a SQL helper script.

## Files changed

- `api/squarespace-bridge.js`
- `client/app.js`
- `client/index.html`
- `database/beta-reset-before-phase-1.sql`
- `docs/BETA_DATA_RESET.md`
- `docs/RELEASE-0.10.20.md`
- `docs/CHANGELOG.md`

## Supabase migration

No migration required.

This release adds a helper SQL script only:

`database/beta-reset-before-phase-1.sql`

Read it carefully before running it. It is intended for clearing testing data before Phase 1 beta, not for routine app migrations.

## Environment variables

No new required environment variables.

Optional kill switch:

`FLOWTEL_TRUSTED_DOORWAY=0`

Set this in Vercel only if you want to turn off trusted-doorway fallback and require Squarespace Contacts verification again.

## First test checklist

1. Deploy the patch.
2. Open `/client/?logout=1` to clear the current browser test session.
3. Open `/client/?membership=queendom`.
4. Enter a beta tester email.
5. Click **I’m New**.
6. Confirm the guest reaches Check-In even if Squarespace Contacts is still rejecting the API call.
7. Check in.
8. Close the tab.
9. Reopen `/client/?membership=queendom`.
10. Confirm the remembered room key bypasses the doorway.
11. Confirm the guest lands on Check-In if she has not checked in today, or Suite if she already has.
