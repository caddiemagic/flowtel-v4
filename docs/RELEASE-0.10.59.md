# Flowtel v0.10.59 — Guest House Large Replay Upload Continuity Hotfix

Release date: 2026-07-20

## Summary

This hotfix repairs the owner Concierge experience for large Guest House call recordings. The v0.10.58 Desk refreshed itself every 45 seconds. That refresh could replace the active Guest House card while a 450 MB video was still transferring, making the progress bar, selected file, and any later error appear to vanish.

The upload itself now owns the screen until it has either completed or reported a visible error.

## What changed

- Active Guest House uploads suspend Concierge background re-rendering.
- A Desk refresh that began immediately before the upload is prevented from replacing the active panel when its data returns.
- The upload panel keeps the file name, human-readable size, progress percentage, and **Keep this tab open** guidance visible.
- The interface distinguishes **uploading** from **finishing the private Replay Room record**.
- Resumable uploads use the direct Supabase Storage hostname and keep the required 6 MB TUS chunk size.
- A successful Storage transfer is preserved if the final `flowtel_guest_house_admin_add_file` RPC temporarily fails.
- Pending finalization data is held in memory and local browser storage for the owner.
- The Guest House card presents **Finish Adding to Room**, which retries only the lightweight database registration instead of re-uploading the video.
- The owner may deliberately remove an unfinished private upload before choosing a replacement.
- Upload and finalization errors are shown both beside the upload and in the Concierge status area.

## Root cause

The Concierge Desk runs a background refresh every 45 seconds. `renderQueue()` rebuilt the Guest House HTML even when a TUS upload was in progress. The upload's callbacks still pointed at the old detached progress and status elements, so the owner could no longer see progress or the final error.

The original uploader also wrapped Storage transfer and metadata registration in one cleanup block. A temporary registration failure therefore removed a fully transferred file from private Storage, forcing a large upload to begin again.

## Migration instructions

**No new migration is required.**

Keep migration 048 installed. Do not rerun retired migration 037.

## Files changed

- `shared/guest-house.js`
- `manager/app.js`
- `manager/index.html`
- `manager/styles.css`
- `scripts/validate-guest-house.mjs`
- `docs/CHANGELOG.md`
- `docs/RELEASE-0.10.59.md`

## Preservation guarantees

This release does not change Guest House request identity, room-key security, private bucket policies, public Replay Room access, membership boundaries, passwords, stays, Team Maps, mentor relationships, Powder Rooms, Flow Map history, Medicine Wheel geometry, Hourly Flow Rate, Honors, Priestess Mailbox, Moonbox, or Caddie Magic.

## First test

1. Deploy the full v0.10.59 project.
2. Open the owner Concierge Desk and select Flowtel Guest House.
3. Choose a video larger than 6 MB; the 450 MB replay is an appropriate production test after a smaller test succeeds.
4. Click **Upload Replay** and leave the Desk open for more than 45 seconds.
5. Confirm the selected card and progress bar remain visible rather than disappearing during the automatic refresh window.
6. Confirm the message changes from uploading to finishing and then the replay appears in the room.
7. Temporarily interrupt the network and confirm the resumable upload retries or reports a visible error.
8. If final registration is intentionally made unavailable after Storage completes, confirm **Finish Adding to Room** appears and succeeds after service is restored without re-uploading the video.
9. Confirm the replay can be streamed and downloaded through a private room key.
