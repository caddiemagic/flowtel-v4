# Flowtel v0.10.61 — Concierge Browser Module Syntax Recovery Hotfix

Release date: 2026-07-20

## Summary

This hotfix restores the owner Concierge Desk after v0.10.60 still stopped on **Checking your role**.

The failure was not the owner account, remembered session, role, or Concierge database permission. The browser could not parse `manager/app.js`, so none of the Concierge application code executed and the role check never began.

The malformed code was inside the Guest House replay upload click handler added during the large-file upload work. The previous validation used `node --check manager/app.js`, which parsed the `.js` file with a different script goal and did not expose this browser-module parsing failure. Running the same source explicitly as an ES module reproduced the browser error at the upload handler.

v0.10.61 rewrites that upload handler as a readable, balanced block, adds explicit browser-module syntax validation, and changes the Concierge page to dynamically load the application so any future module-loading error is shown directly instead of appearing only as a frozen role check.

## What changed

- Corrects the malformed Guest House replay upload event handler that prevented `manager/app.js` from parsing in the browser.
- Preserves the v0.10.59 resumable upload, progress, finalization, and preserved-upload recovery behavior.
- Loads the Concierge application through a guarded dynamic import with a v0.10.61 cache key.
- Displays the actual module-loading error if the application cannot be parsed or a required dependency cannot be loaded.
- Keeps the existing boot watchdog as a second fallback for a stalled application.
- Adds an explicit `node --check --input-type=module` validation to the Guest House validation suite so browser-module syntax is tested before release.
- Verifies the Concierge static module graph can link across its 29 required modules.

## Migration instructions

**No new migration is required.**

Keep migrations 046, 047, and 048 installed. Migration 037 remains retired and must never be rerun.

## Files changed

- `manager/app.js`
- `manager/index.html`
- `scripts/validate-guest-house.mjs`
- `docs/CHANGELOG.md`
- `docs/RELEASE-0.10.61.md`

## Preservation guarantees

This release does not change owner authorization, `concierge_access_enabled`, roles, passwords, remembered sessions, stays, unread Concierge notes, Turndown routing, Team Maps, memberships, mentor relationships, Powder Rooms, Flow Map history, Medicine Wheel geometry, Hourly Flow Rate records, Flowtel Honors, Priestess Mailbox, Guest House request/file data, replay-room keys, Moonbox, or Caddie Magic.

## First test

1. Deploy the complete v0.10.61 project.
2. Open `/manager/` and hard-refresh once.
3. Confirm the checking card disappears and the complete Concierge Desk opens.
4. Open **Flowtel Guest House** and confirm the request queue loads.
5. Upload a small replay and confirm the progress state remains visible through **FINISHING…**.
6. Upload the 450 MB replay and leave the page open until the replay appears in the room.
7. Confirm existing Guest House requests, replay files, room keys, memberships, passwords, and Caddie Magic access remain unchanged.
