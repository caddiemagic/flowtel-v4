# Flowtel v0.10.28 — Phase 2 Access Gates + Queendom Return

## Summary

This release adds Phase 2 access gates for practitioner-level rooms and adds a clear return path from the Flowtel back to the Queendom.

## Changes

- Added a **Return to the Queendom** button inside the guest Suite and Lounge.
- Added shared Phase 2 beta gate helper at `shared/beta-access.js`.
- Restricted the following rooms to practitioner-level users (`practitioner`, `admin`, `owner`):
  - Concierge Desk
  - Initiation Hall
  - Profile Studio
  - Cycle Data Dashboard
  - Flow FM support rooms and curriculum pages
- Guests who try to open those rooms now see a soft Phase 2 message instead of the working page.
- Hid the Lounge Profile Studio card from non-practitioner users.
- Updated Concierge holding page copy for Phase 2.

## Migration

No Supabase migration required.

## Syntax checks

- `node --check shared/beta-access.js`
- `node --check client/app.js`
- `node --check manager/app.js`
- `node --check cycle-data/app.js`
- `node --check flow-fm/app.js`
- `node --check flow-fm/profile-studio/page.js`
- `node --check flow-fm/assignments/page.js`
- `node --check flow-fm/moons/page.js`
- `node --check flow-fm/portal/page.js`
- `node --check flow-fm/planning-room/page.js`
- `node --check flow-fm/womb-work/page.js`
- `node --check flow-fm/review/page.js`
