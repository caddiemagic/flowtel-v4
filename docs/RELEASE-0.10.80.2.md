# Flowtel v0.10.80.2 — Priestess Mailbox Private Media Exchange

Release date: 2026-08-03

Caddie Magic remains **v0.5.2**. This focused release expands the existing private Priestess Mailbox from an audio-first handoff into a safe, resumable private-media exchange without changing its database ownership, RLS, signed downloads, alerts, or historical threads.

## Member-to-owner private media

The dedicated Priestess Mailbox now lets a Flow FM or Council member send:

- video: MP4, MOV, M4V, WEBM;
- audio: MP3, WAV, M4A, AAC, OGG;
- images: JPG, JPEG, PNG, WEBP, GIF;
- PDF, text, CSV, ZIP;
- Word, Excel, and PowerPoint formats.

The member experience now says **Choose a private file** and **Send Private File to Megan** rather than limiting the handoff to audio.

Executable, disk-image, and script formats remain blocked.

## Resumable large-file uploads

Files larger than 6 MB use the established Supabase TUS resumable upload endpoint with:

- 6 MB chunks;
- automatic retry delays;
- visible upload percentage;
- a stable path-specific upload fingerprint;
- a private pending-transfer record in the browser so the same file can resume after an interruption;
- continued upload after a refresh when the member reselects the same file.

The browser cannot retain access to a local file automatically after a full refresh. The member must reselect the same file, after which Flowtel can reconnect it to the saved private transfer.

Files at or below 6 MB continue through the standard private Storage upload path.

## Owner returns

Inside the owner Priestess Mailbox, **Return edited audio** is replaced by **Return a private file**.

The owner can return the same supported video, audio, image, document, spreadsheet, presentation, PDF, or ZIP formats through the existing thread. Large return files use the same resumable upload path and progress display.

The owner can still send a new private delivery directly to any eligible Priestess. That flow now shares the same accepted-format list and retry-safe transfer identity.

## Clearer errors

The mailbox now distinguishes common upload failures, including:

- unsupported or unsafe file type;
- empty file;
- file over 250 MB;
- live Supabase Storage limit below the file size;
- private Storage MIME rejection;
- interrupted network connection;
- unavailable resumable uploader.

## File-size boundary

The application and existing private mailbox bucket remain capped at **250 MB per file**.

The historical migration-052 mailbox expansion already includes the supported video MIME types and the 250 MB bucket limit. The live Supabase project-wide Storage limit must also be at least 250 MB; a lower project-wide limit will still reject a large upload and now produces a clearer message.

## Preserved boundaries

This release preserves:

- all existing `flowtel_priestess_mailbox_threads` and `flowtel_priestess_mailbox_files` records;
- private bucket ownership and RLS;
- owner-only queue access;
- member-only thread access;
- signed download URLs;
- received/downloaded acknowledgment history;
- unread private-file alerts;
- Profile Studio doorway access;
- Caddie Magic v0.5.2 boundaries.

## Migration

**No new migration is required.**

Do not rerun migration 046 or either migration 052 file. The existing confirmed-live migration-052 mailbox bucket update already supports the media types used here.

## Minimal live deployment

Deploy these nine runtime files while preserving folder paths:

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

## First live test checklist

1. Deploy the nine-file minimal package and hard-refresh Flowtel.
2. Sign in as a Flow FM member and open the Priestess Mailbox.
3. Upload a small MP4 or MOV and confirm the member sees filename, size, progress, and successful thread creation.
4. Upload a file larger than 6 MB and confirm percentage progress appears.
5. Interrupt a large upload, press Send again with the same selected file, and confirm it resumes.
6. Refresh during an interrupted upload, reselect the same file, and confirm the transfer can reconnect.
7. Upload an unsupported `.exe` or `.js` test filename and confirm it is rejected before Storage.
8. Upload a file over 250 MB and confirm the exact limit message appears.
9. Open the owner Priestess Mailbox and download the member’s video.
10. Return a video through the same thread and confirm the Priestess receives the existing unread-file alert.
11. Download the returned video as the Priestess and confirm the alert clears only after acknowledgment.
12. Confirm existing audio threads and owner-to-Priestess private deliveries still work.
