# Flowtel v0.10.62 — Guest House Replay Selection + Storage Limit Recovery Hotfix

Release date: 2026-07-20

## Summary

This hotfix addresses two separate behaviors reported while preparing a roughly 450 MB Guest House call replay:

1. The selected video could disappear from the Concierge form shortly after the operating-system file picker closed.
2. Starting the upload returned **Maximum size exceeded** before the recording transferred.

The disappearing selection was caused by the Concierge Desk's focus/visibility refresh. Returning from the operating-system file picker focuses the browser window, which could immediately start a Desk refresh and rebuild the Guest House request card before the owner clicked **Upload Replay**.

The maximum-size response is a separate Supabase project setting. Migration 048 already configures the private Guest House bucket for files up to 2 GB, but Supabase also applies a project-wide Global file size limit. The project-wide value takes precedence over a bucket's higher limit.

v0.10.62 preserves the selected browser File in Concierge memory, prevents refreshes from replacing the editor while a file is being chosen or held, displays a persistent **Ready to Upload** confirmation, and translates the generic Supabase response into exact dashboard guidance.

## What changed

- Adds a Guest House replay draft held in browser memory for each request.
- Protects the Guest House editor while the operating-system file picker is open.
- Delays focus and visibility refreshes long enough for the file-selection event to complete.
- Prevents both scheduled and already-running Desk refreshes from replacing a selected replay editor.
- Restores the selected File to a rebuilt input where the browser permits it.
- Falls back to the preserved in-memory File when browser security prevents assigning the native file input programmatically.
- Displays a persistent **Ready to Upload** panel containing the filename and human-readable size.
- Adds **Clear File** so the owner can intentionally release the selection.
- Preserves replay title and guest-visible note alongside the selected file.
- Warns before leaving the page while a replay is selected or uploading.
- Keeps the selected replay available after an upload error so the owner can retry without reopening the file picker.
- Clears the browser-memory draft only after the replay successfully reaches the Replay Room.
- Detects Supabase `Maximum size exceeded`, `EntityTooLarge`, and `Payload too large` responses.
- Replaces the generic response with instructions to raise Supabase's project-wide **Global file size limit** to at least 1 GB for a 450 MB recording.
- Clarifies that the private Guest House bucket itself remains configured for 2 GB.
- Adds v0.10.62 cache keys for the Concierge application and Guest House modules.

## Required Supabase setting

No SQL migration can raise the hosted Supabase project's Global file size limit.

Before retrying the 450 MB recording:

1. Open the Supabase project dashboard.
2. Open **Storage**.
3. Open **Settings**.
4. Set **Global file size limit** to at least **1 GB**.
5. Save the setting.
6. Confirm the `flowtel-guest-house-replays` bucket remains private and has its 2 GB bucket limit.

If the project is on a Supabase plan that does not allow a project-wide limit above 450 MB, the plan must be changed or the Guest House recordings must use a different private storage provider.

## Migration instructions

**No new migration is required.**

Keep migrations 046, 047, and 048 installed. Migration 048 already configures the private Guest House bucket for 2 GB files.

Migration 037 remains retired and must never be rerun.

## Files changed

- `manager/app.js`
- `manager/index.html`
- `manager/styles.css`
- `shared/guest-house.js`
- `shared/guest-house-core.js`
- `scripts/test-guest-house.mjs`
- `scripts/validate-guest-house.mjs`
- `docs/CHANGELOG.md`
- `docs/RELEASE-0.10.62.md`

## Preservation guarantees

This release does not change owner authorization, passwords, remembered sessions, stays, unread Concierge notes, Turndown routing, Team Maps, memberships, mentor relationships, Powder Rooms, Flow Map history, Medicine Wheel geometry, Hourly Flow Rate records, Flowtel Honors, Priestess Mailbox, Guest House request/file records, replay-room keys, Moonbox, or Caddie Magic.

The selected File exists only in the owner's current browser memory until it is uploaded or cleared. It is not written to local storage, a database, or a public URL.

## First test

1. Deploy the complete v0.10.62 project.
2. In Supabase Storage Settings, set the Global file size limit to at least 1 GB.
3. Hard-refresh `/manager/` once.
4. Open **Flowtel Guest House**.
5. Choose the 450 MB recording and wait at least one minute without clicking Upload.
6. Confirm the filename remains visible in the native field and/or the **Ready to Upload** panel.
7. Confirm the Desk does not refresh away from the selected request.
8. Click **Upload Replay**.
9. Confirm the progress bar remains visible and advances through the resumable upload.
10. Confirm the state changes to **Finishing…** and the replay appears under **Call Replays**.
11. Temporarily lower the Supabase Global file size limit in a nonproduction test project and confirm the new error identifies the project-wide setting rather than showing only **Maximum size exceeded**.
