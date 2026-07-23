# Flowtel v0.10.74.2 — Guest House Recording Choice Continuity

**Released:** July 23, 2026
**Flowtel:** v0.10.74.2
**Caddie Magic:** v0.5.2 unchanged
**Migration:** 060 after migration 059

## Purpose

This focused Guest House hotfix restores the recording-choice editor the guest originally had after giving her offering. It keeps the experience minimal: there is no standalone **Withdraw Permission** button and no oversized header treatment.

## Guest experience

After an offering is saved, the compact disclosure **Change which recordings I am sharing** remains available beneath the confirmation. The guest sees every active replay file with its current checkbox state and may save a different selection.

- At least one recording is required for the first offering.
- Later updates may add or remove individual recordings.
- Deselecting every recording saves a current state with no approved Flow FM recording.
- The full consent checkbox remains part of the first offering.
- A shorter confirmation checkbox is used when updating recording choices.
- The shared **WITNESSED** gift appears only while one or more recordings are currently selected.
- The interface does not promise that the complimentary session remains available following full deselection.

## Concierge visibility

The owner Guest House request card now states **Approved for Flow FM** and names the recordings currently selected.

If the guest deselects every recording, the owner sees:

- **Recording permission removed**
- an owner-only **Review** state;
- the date of the latest choice change;
- a reminder to review any recording already uploaded to Flow FM manually.

This is an in-product operational signal. It does not automatically remove a recording from Flow FM and does not introduce external email or webhook notifications.

## Data and privacy

Migration 060 supports both live migration-059 shapes that may have been deployed from v0.10.74 or v0.10.74.1. It:

- removes the one-off unique index so real selection changes can remain append-only;
- supports `granted`, `updated`, and `withdrawn` snapshots;
- records `training_consent_granted`, `training_consent_updated`, and `training_consent_withdrawn` events;
- includes both current and previous file IDs in change events;
- retires the older standalone withdrawal RPC;
- preserves private Storage and prevents direct browser access to consent records;
- keeps the first WITNESSED gift receipt preserved historically.

## Migration instructions

Migration 058 is already confirmed live.

1. Confirm migration 059 has been run. If it has not, run:

```text
database/migration-059-guest-house-flow-fm-training-consent.sql
```

2. Run this corrective migration once:

```text
database/migration-060-guest-house-recording-choice-updates.sql
```

3. Deploy Flowtel v0.10.74.2.

Do not rerun migration 058, either historical migration 052 body, or retired migration 037.

## First-test checklist

1. Open a Guest House Replay Room with two active recordings.
2. Confirm the initial offering has no preselected recording or consent checkbox.
3. Select one recording, affirm the offering, and submit.
4. Confirm **WITNESSED** and the scheduling button appear.
5. Reopen **Change which recordings I am sharing** and confirm the selected recording remains checked.
6. Select the second recording, save, and confirm both remain checked after refresh.
7. Confirm the Concierge Desk says **Approved for Flow FM** and names both recordings.
8. Deselect one recording, save, and confirm only the remaining recording appears in the Guest House and Concierge state.
9. Deselect every recording, save, and confirm the Guest House shows no current Flow FM selection and no standalone withdrawal button.
10. Confirm the Concierge Desk shows **Recording permission removed** and **Review**.
11. Reselect one recording and confirm the active approved state returns.
12. Recheck private playback, downloads, multi-file upload, signed URLs, 28-day expiration, and Guest House-only access boundaries.

## Live-test limitation

Static validation cannot prove hosted Supabase migration execution, live RLS behavior, browser caching, real large-file transfers, or responsive rendering. Complete the checklist above in the deployed environment.
