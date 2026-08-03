# Flowtel v0.10.80.4 — Priestess Mailbox Resumable Authentication Hotfix

Release date: 2026-08-03

Caddie Magic remains **v0.5.2**.

## What changed

Priestess Mailbox files larger than 6 MB use Supabase's resumable TUS endpoint. The previous browser request sent both the signed-in member access token and the newer opaque Supabase publishable key. The Storage endpoint rejected that combination with `Invalid Compact JWS` before creating the upload.

This hotfix:

- removes the `apikey` header from resumable Mailbox requests;
- sends the signed-in Flowtel user's JWT only through `Authorization: Bearer ...`;
- validates that the access token has compact-JWT structure before upload creation;
- refreshes the Supabase session once when a stored token is missing or malformed;
- refreshes and reapplies authenticated authorization before every resumable request;
- replaces raw JWT/JWS failures with a clear Flowtel session-refresh message;
- preserves the 1 GB Mailbox boundary, 6 MB chunks, retries, progress, resumability, safe file types, thread history, owner clearance controls, and private Storage rules.

Standard uploads at or below 6 MB remain on the established Supabase Storage SDK path.

## Roadmap recorded

The Concierge specification now records two future Owner Administration improvements:

- a Profile Review Desk card with a submitted-profile count and witnessing alert;
- private owner activity alerts when members update Hourly Flow Rate or Availability.

Those owner-visibility features are documented but are **not activated in this hotfix**.

## Migration

**No new migration is required.**

Migration 063 remains the existing 1 GB Mailbox foundation. Do not rerun it if it is already live.

## Minimal live deployment

Deploy these files while preserving paths:

```text
shared/priestess-mailbox.js

flow-fm/priestess-mailbox/index.html
flow-fm/priestess-mailbox/page.js

flow-fm/profile-studio/index.html
flow-fm/profile-studio/page.js

manager/index.html
manager/app.js
```

## Preserved boundaries

- 1 GB per-file Mailbox limit;
- supported private video, audio, image, document, spreadsheet, presentation, PDF, and ZIP formats;
- private bucket and signed downloads;
- resumable upload fingerprints and interrupted-transfer recovery;
- owner **Clear Without Downloading** behavior;
- existing mailbox alerts, threads, files, and acknowledgments;
- Flow FM/Council and Concierge permissions;
- Caddie Magic v0.5.2;
- every unrelated Flowtel subsystem.

## First live test checklist

1. Deploy the seven runtime files and hard-refresh the Concierge Desk and Priestess Mailbox.
2. Send the same 15 MB MP3 that previously produced `Invalid Compact JWS`.
3. Confirm the upload begins and the progress bar advances.
4. Send a file smaller than 6 MB and confirm standard upload still works.
5. Send a larger video and confirm resumable progress and retry behavior remain intact.
6. Sign out during a test upload and confirm the interface shows the Flowtel session-refresh message rather than raw JWS text.
7. Confirm incoming and outgoing Mailbox alerts still clear according to the existing rules.
