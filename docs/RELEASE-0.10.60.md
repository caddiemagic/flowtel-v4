# Flowtel v0.10.60 — Concierge Access Gate Recovery Hotfix

Release date: 2026-07-20

## Summary

This hotfix restores the owner Concierge Desk after the v0.10.59 Guest House uploader work left the access gate vulnerable to a Guest House module-loading failure.

The Concierge application previously imported the Guest House owner module as a required top-level dependency. If the browser received a stale or mismatched cached module, if one of the newly added named exports was unavailable during deployment propagation, or if that optional feature module failed to load for any reason, the entire Concierge application stopped before `openDeskFromSession()` could verify the remembered owner session. The screen therefore remained indefinitely on **Checking your role** even though the owner account and migration permissions had not changed.

The Guest House now loads only after the core Concierge application has booted and owner access verification has begun. A Guest House loading issue can make only that one Desk card temporarily unavailable; it can no longer lock Megan out of the entire Concierge Desk.

## What changed

- Removes the Guest House owner helpers from the Concierge application's static import graph.
- Lazy-loads the Guest House owner and core modules only when the Desk requests Guest House data or an owner uses a Guest House control.
- Validates the expected Guest House exports after the lazy module loads.
- Uses v0.10.60 cache-busting for the Guest House modules and Concierge application.
- Keeps fallback Guest House status labels and file-size formatting inside the Concierge shell so the access gate does not depend on the optional module.
- Preserves normal Concierge access even when the Guest House module is unavailable; the Guest House card alone shows its existing service-unavailable state.
- Adds a 15-second timeout around owner identity and Concierge-permission verification so the screen cannot remain silently on **Checking your role** forever.
- Shows **Owner identity recognized. Opening the Concierge Desk...** between the identity and permission checks.
- Adds a lightweight boot watchdog that replaces the frozen checking message with an explicit refresh instruction if the Concierge application itself does not finish loading.
- Preserves the v0.10.59 large-upload continuity, resumable upload, pending-finalization recovery, and 45-second refresh suspension.

## Migration instructions

**No new migration is required.**

Keep migrations 046, 047, and 048 installed. Migration 037 remains retired and must never be rerun.

## Files changed

- `manager/app.js`
- `manager/index.html`
- `scripts/validate-guest-house.mjs`
- `docs/CHANGELOG.md`
- `docs/RELEASE-0.10.60.md`

## Preservation guarantees

This release does not change owner email authorization, `concierge_access_enabled`, roles, passwords, remembered sessions, stays, unread Concierge notes, Turndown routing, Team Maps, memberships, mentor relationships, Powder Rooms, Flow Map history, Medicine Wheel geometry, Hourly Flow Rate records, Flowtel Honors, Priestess Mailbox, Guest House request/file data, replay-room keys, Moonbox, or Caddie Magic.

## First test

1. Deploy the complete v0.10.60 project.
2. Hard-refresh `/manager/` once.
3. Confirm the checking card changes to **Owner identity recognized. Opening the Concierge Desk...** and then disappears as the Desk opens.
4. Confirm Turndown Service, Team Map, Honors, Priestess Mailbox, and the other owner cards load normally.
5. Open **Flowtel Guest House** and confirm existing requests and replay files remain present.
6. Upload a small replay, then test the 450 MB recording and confirm the v0.10.59 progress continuity remains intact.
7. In a signed-out/private browser, confirm `/manager/` shows the Enter Through Flowtel prompt rather than remaining frozen.
