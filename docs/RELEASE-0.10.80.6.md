# Flowtel v0.10.80.6 — Priestess Mailbox Upload Reliability Repair

Release date: 2026-08-03

Caddie Magic remains **v0.5.2**.

## Why this repair was needed

Two consecutive custom resumable-upload authorization approaches failed against the live Supabase Storage project:

- direct TUS requests carrying the signed-in member access token;
- signed upload tokens sent through the TUS `x-signature` header.

The rest of the Concierge Desk remained authenticated and could read private Mailbox data, so asking the owner to sign out again was not an appropriate repair.

## What changed

The Priestess Mailbox no longer creates its own cross-origin TUS authorization requests.

Every Mailbox upload now uses the established authenticated Supabase Storage SDK:

```js
supabase.storage
  .from('flowtel-priestess-mailbox')
  .upload(path, file, options)
```

This removes the failing custom credential path while preserving the existing Storage RLS policies and exact private object paths.

Supabase supports standard uploads up to 5 GB. Flowtel intentionally keeps the Priestess Mailbox boundary at 1 GB per file.

## Upload feedback

The Storage SDK does not expose byte-by-byte browser progress for this upload method. Flowtel now shows an honest indeterminate progress treatment and the message:

> Uploading privately… Keep this page open.

The treatment finishes only when Storage confirms the upload.

If a network interruption occurs, the selected file remains available in the current form so the sender can press Send again. The retry begins a new upload rather than claiming to resume a completed chunk.

## Migration

**No migration is required.**

Migration 063 remains the confirmed 1 GB Mailbox and Inbox Clearance foundation. Do not rerun it.

## Minimal live deployment

Deploy these files while preserving paths:

```text
shared/priestess-mailbox.js

flow-fm/priestess-mailbox/index.html
flow-fm/priestess-mailbox/page.js
flow-fm/priestess-mailbox/styles.css

flow-fm/profile-studio/index.html
flow-fm/profile-studio/page.js

manager/index.html
manager/app.js
manager/styles.css
```

## Preserved boundaries

- 1 GB per-file Mailbox limit;
- supported private video, audio, image, document, spreadsheet, presentation, PDF, and ZIP formats;
- private bucket, RLS, signed downloads, and append-only thread history;
- selected-file preservation during the current page session;
- owner **Clear Without Downloading** behavior;
- existing Mailbox alerts and acknowledgment rules;
- Flow FM/Council and Concierge permissions;
- Caddie Magic v0.5.2;
- every unrelated Flowtel subsystem.

## First live test checklist

1. Deploy the nine runtime files and hard-refresh the Concierge Desk.
2. Reselect the same 15 MB MP3.
3. Confirm the private-upload animation begins without an authorization or session message.
4. Keep the tab open until the delivery finishes.
5. Confirm the file appears in the member's Priestess Mailbox.
6. Test one video between 250 MB and 1 GB.
7. Confirm **Clear Without Downloading**, download acknowledgment, and Mailbox alert counts remain correct.

Static validation cannot reproduce the authenticated live Storage transfer. The decisive verification is the same 15 MB owner-to-member upload that failed in v0.10.80.4 and v0.10.80.5.
