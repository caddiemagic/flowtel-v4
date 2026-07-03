# Release 0.5.0 — Flow recovery, arrival routing, and beta test accounts

## Replace
- client/index.html
- client/app.js
- manager/index.html
- manager/app.js
- shared/stays.js
- shared/flowtel.js

## Add
- database/seed-beta-test-profiles.sql

## What changed
- Removed the top Check In / Clock In buttons from the cycle input area.
- Guests enter cycle day and feels-like season first.
- Check Into the Flowtel creates/opens the Suite.
- Clock Into the Flowtel is visible only for practitioners/admin/owners and routes to the Concierge Desk.
- Users with a check-in for today are sent directly to their Suite.
- Users without a check-in for today land on the check-in page.
- Concierge Desk now reads clock-in context and shows a wing assignment.
- Turndown queue can be filtered to the practitioner's assigned polarity wing.
- Added SQL for 4 practitioner and 4 guest beta test profiles.

## Commit
Release 0.5.0 - Flow recovery and beta test accounts
