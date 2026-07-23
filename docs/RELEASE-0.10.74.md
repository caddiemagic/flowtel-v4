# Flowtel v0.10.74 — Guest House Witnessed Sessions

Release date: 2026-07-23

Caddie Magic remains **v0.5.2**. No Caddie Magic files, Player behavior, Caddie permissions, score history, messages, Compass data, or product-access boundaries change in this release.

## Summary

This focused release gives former 1:1 clients an optional, private way to permit selected Guest House recordings to be used inside the Flow FM Mastermind for Moon Priestess training.

The experience remains gentle and compact. It does not add a large banner or oversized heading to the Guest House. The invitation appears only after the client is signed in and a private replay is available.

It also lets the owner select and upload several replay files for the same client in one action instead of repeating the file picker for every recording.

## Optional Flow FM training permission

Inside a ready Replay Room, the client may choose one or more available recordings and explicitly agree to the complete permission statement.

The statement explains that:

- the selected recordings may be placed inside the private Flow FM Mastermind portal;
- Moon Priestesses in training may watch them for educational purposes;
- the client’s name, voice, image, and personal conversation may be included; and
- the complimentary gift session will also be recorded and shared in Flow FM for the same training purpose.

Nothing is preselected. Declining or ignoring the invitation does not affect access to the client’s private replay.

Each permission choice is stored as an append-only receipt containing the exact consent version, exact displayed copy, selected replay file IDs, Auth user, Guest House request, and timestamp. The offering is submitted once for the recordings selected in that moment. The Replay Room does not include a self-service withdrawal or post-grant editing control. Any future removal-request workflow will be designed separately with owner notification and tracking before it is introduced. The owner Concierge view distinguishes only:

- no offering recorded; and
- offering received for the named recordings.

This release records the permission and gives the owner a precise file-scoped consent boundary. It does **not** automatically publish recordings into a new Flow FM training-library page. Training-library presentation and automated publication remain a separate future experience.

## Complimentary session gift

Immediately after the session offering is submitted, the Replay Room reveals:

```text
Coupon code: WITNESSED
Scheduling link: https://meganmichele.as.me/energyreading
```

The client may copy the code or open the scheduling page directly.

The code is intentionally shared rather than unique. It is revealed only after the session offering is submitted.

## Multiple replay uploads

The owner Guest House uploader now accepts one or more audio/video files in a single selection.

- All selected filenames and total size remain visible before upload.
- Files upload sequentially so progress remains clear and one failed transfer does not erase the rest of the selection.
- Overall progress shows which file is being uploaded and its position in the batch.
- Successfully registered files are removed from the preserved draft as the batch proceeds.
- A file that reached private Storage but could not finish its database record keeps the existing **Finish Adding to Room** recovery path.
- Remaining files stay selected for a later retry.
- Multiple independent sessions are no longer labeled as “Part 2,” “Part 3,” and so on.
- When several files are selected, Flowtel uses a cleaned filename as the individual replay title, optionally preceded by the owner’s shared title.

Existing 28-day replay expiration, private Storage, TUS resumable upload, signed playback, download receipts, and legacy room-key access remain unchanged.

## Migration

Migration 058 has been confirmed live. Run exactly once before deploying the website files:

```text
database/migration-059-guest-house-flow-fm-training-consent.sql
```

Migration 059:

- creates the append-only `flowtel_guest_house_training_consents` table;
- revokes direct browser table access and enables RLS;
- adds an authenticated offering RPC tied to the signed-in Guest House account and latest request;
- verifies every selected file belongs to the client’s active Replay Room;
- records the offering event in the existing append-only Guest House event ledger;
- snapshots the shared `WITNESSED` code and scheduling URL with the grant;
- extends the owner Guest House queue with the offering state and gift details; and
- preserves all prior Guest House requests, files, accounts, receipts, expiration history, and access links.

Do not rerun migration 058, either historical migration 052 body, or retired migration 037.

## Main files changed

- `api/guest-house-portal.js`
- `database/migration-059-guest-house-flow-fm-training-consent.sql`
- `docs/CHANGELOG.md`
- `docs/RELEASE-0.10.74.md`
- `docs/RELEASE-0.10.74.1.md`
- `guest-house/index.html`
- `guest-house/app.js`
- `guest-house/styles.css`
- `manager/index.html`
- `manager/app.js`
- `manager/styles.css`
- `scripts/test-guest-house-api.mjs`
- `scripts/test-guest-house.mjs`
- `scripts/validate-caddie-magic.mjs`
- `scripts/validate-combined-updates.mjs`
- `scripts/validate-four-seasons-time-space.mjs`
- `scripts/validate-guest-house.mjs`
- `scripts/validate-priestess-network-shared-identity.mjs`
- `shared/guest-house-core.js`
- `shared/guest-house.js`

## Preservation guarantees

This release does not change Flowtel Time, one-stay-per-Flowtel-Day behavior, append-only stays or notes, personal passwords, remembered sessions, membership rank, cross-product access, canonical `profiles.display_name`, legal-name privacy, owner-only Concierge access, Turndown routing, unread Concierge continuity, mentor consent, Powder Room anonymity, Flow Map history, Medicine Wheel geometry, Actual-versus-Recorded cycle logic, Flow FM Start Date, Hourly Flow Rate, Lifestyle Layers, Client-Facing Calls, Priestess Mailbox, Lounge video, Replay Notes, Flowtel Honors, or any Caddie Magic boundary.

## First test checklist

1. Confirm migration 058 is already live.
2. Run migration 059 exactly once, then deploy v0.10.74.1.
3. Sign in to a Guest House account with no ready replay and confirm no training invitation appears yet.
4. Upload one replay, open the client Replay Room, and confirm the invitation is compact and uses restrained heading sizes.
5. Confirm no replay checkbox or permission confirmation is preselected.
6. Submit without choosing a recording and confirm the client receives a gentle validation message.
7. Select one recording, confirm the offering, and save.
8. Refresh and confirm the offering state persists with the selected recording title.
9. Confirm code **WITNESSED** appears immediately and Copy Code works.
10. Confirm **Schedule My Gift Session** opens `https://meganmichele.as.me/energyreading`.
11. Return to owner Concierge → Guest House and confirm the same request shows **Offering received** and the selected replay name.
12. Confirm there is no self-service withdrawal or post-grant selection editor in the client Replay Room.
13. Confirm the gift appears only after the offering is submitted.
14. In the owner queue, select two or more replay files at once and confirm every filename and total size appear.
15. Upload the batch and confirm files process sequentially with overall progress.
16. Refresh the client Replay Room and confirm every uploaded file appears as its own recording without “Part 2” language.
17. Test a controlled failed finalization and confirm **Finish Adding to Room** remains available while unprocessed batch files remain selected.
18. Confirm replay expiration, signed playback, downloads, view/download receipts, and legacy room keys still work.
19. Confirm a Guest House-only account still cannot enter Flowtel or Caddie Magic.
20. Confirm Caddie Magic v0.5.2 remains unchanged.
