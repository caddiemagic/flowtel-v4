# Flowtel v0.10.74.1 — Guest House Session Offering Refinement

Release date: 2026-07-23

Caddie Magic remains **v0.5.2**.

## Summary

This focused refinement keeps the Guest House consent experience minimal, gentle, and aligned with the idea of a session being given as an offering. It removes the self-service withdrawal button and the post-grant recording editor so the interface does not promise immediate removal after a recording may already have been placed inside Flow FM.

The initial invitation remains optional and nothing is preselected. Before submitting, the guest may freely select or deselect any available recording. After she offers the selected session recording(s), the Guest House displays a compact confirmation and reveals the shared **WITNESSED** code with the Energy Reading scheduling link.

The gift copy no longer promises that the complimentary session remains available after a later consent withdrawal. A future removal-request process is intentionally deferred until it can include thoughtful owner notification, tracking, and publication-state handling.

## Migration

Migration 059 has been revised before live use. Run the updated file exactly once:

```text
database/migration-059-guest-house-flow-fm-training-consent.sql
```

The revised migration creates grant-only, append-only session-offering receipts. It does not create a self-service withdrawal RPC or withdrawal event type.

If an earlier copy of migration 059 was already run, do **not** rerun it; create a corrective migration 060 instead.

## First test checklist

1. Confirm migration 059 has not already been run.
2. Run the revised migration 059 and deploy v0.10.74.1.
3. Open a ready Guest House Replay Room and confirm no recording is preselected.
4. Select and deselect recordings before submitting and confirm the form remains gentle and clear.
5. Submit one or more selected recordings and confirm the heading says **Your session has been received as an offering.**
6. Confirm no Withdraw Permission button or post-grant recording editor appears.
7. Confirm code **WITNESSED** and the scheduling link appear only after the offering is submitted.
8. Confirm the gift copy does not promise continued eligibility after a future removal request.
9. Confirm the owner Guest House card says **Offering received** and names the selected recordings.
10. Recheck multiple-file upload, private playback, downloads, 28-day expiration, Guest House-only access, and all Caddie Magic boundaries.
