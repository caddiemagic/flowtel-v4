# Flowtel v0.10.80.5 — Priestess Mailbox Signed Upload Authorization Hotfix

Release date: 2026-08-03

Caddie Magic remains **v0.5.2**.

## Why this hotfix was needed

The v0.10.80.4 repair still asked the browser to validate and forward the signed-in user access token directly to Supabase's resumable TUS endpoint. The live owner session remained valid for the Concierge Desk, but the Mailbox uploader rejected the credential path and displayed a session-refresh instruction that signing out and back in could not resolve.

This release removes that fragile direct-token path.

## What changed

For files larger than 6 MB, Flowtel now:

1. asks the authenticated Supabase Storage SDK to create a signed upload token for the exact private Mailbox path;
2. sends that token to the resumable endpoint in the supported `x-signature` header;
3. preserves the same token for the TUS creation and chunk requests;
4. continues using the direct Storage hostname, 6 MB chunks, automatic retries, progress events, and transfer fingerprints.

The release removes:

- the browser-side compact-JWT structure test;
- forced `refreshSession()` calls for resumable uploads;
- manually forwarded `Authorization` headers on Mailbox TUS requests;
- the misleading “sign out and sign back in” error loop.

Standard uploads at or below 6 MB remain on the established Supabase Storage SDK upload path.

## Migration

**No migration is required.**

Migration 063 remains the 1 GB Mailbox and Inbox Clearance foundation. Do not rerun it if it is already live.

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
- private bucket, RLS, signed downloads, and append-only thread history;
- resumable upload fingerprints and interrupted-transfer recovery;
- owner **Clear Without Downloading** behavior;
- existing Mailbox alerts and acknowledgment rules;
- Flow FM/Council and Concierge permissions;
- Caddie Magic v0.5.2;
- every unrelated Flowtel subsystem.

## First live test checklist

1. Deploy the seven runtime files and hard-refresh the Concierge Desk.
2. Reselect the same 15 MB MP3.
3. Confirm the progress bar begins moving without a sign-out instruction.
4. Confirm the file appears in the member's Priestess Mailbox.
5. Send a file smaller than 6 MB and confirm standard upload still works.
6. Send a larger video and confirm resumable progress and retry behavior remain intact.
7. Confirm **Clear Without Downloading**, download acknowledgment, and Mailbox alert counts remain correct.
