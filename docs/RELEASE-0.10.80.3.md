# Flowtel v0.10.80.3 — Priestess Mailbox 1 GB Media + Inbox Clearance

Release date: 2026-08-03

Caddie Magic remains **v0.5.2**.

This corrected release replaces the unprocessed 10 GB draft of v0.10.80.3. The Priestess Mailbox is capped at **1 GB per file**, while the confirmed Supabase project-wide limit remains 10 GB.

## What changed

### 1 GB private-file boundary

The member upload, owner direct-delivery, and owner thread-return experiences now accept supported files from 1 byte through **1 GB**.

Supported formats remain:

- video: MP4, MOV, M4V, WEBM;
- audio: MP3, WAV, M4A, AAC, OGG;
- images: JPG, JPEG, PNG, WEBP, GIF;
- documents: PDF, TXT, CSV, DOC, DOCX;
- spreadsheets: XLS, XLSX;
- presentations: PPT, PPTX;
- ZIP archives.

Executable, script, application, and disk-image formats remain blocked.

### Clear an owner notification without downloading

An incoming Priestess file now gives Megan two choices:

- **Download + Clear** — prepares the private download and clears the waiting alert;
- **Clear Without Downloading** — clears the waiting alert without opening or deleting the file.

Clearing does not remove the file or its thread history. The file remains available through **Download Again** later.

The existing `received_at` mailbox field remains the canonical owner-handled state. No historical records are rewritten.

### Large-upload continuity

Files larger than 6 MB use the resumable TUS uploader with:

- 6 MB transfer chunks;
- automatic retries;
- refreshed Supabase authentication before chunk requests;
- visible upload progress;
- path-specific transfer fingerprints;
- resumable transfer discovery;
- a pending-transfer record retained for 14 days.

The final file is still one file. The chunks are only the temporary network transfer pieces used to make interruption recovery safer.

### Large private downloads

Fresh private download links default to six hours and may be issued for up to twelve hours. The Storage bucket remains private and every link remains time-limited.

## Database alignment

Migration 063:

- sets the private mailbox bucket to `1073741824` bytes;
- preserves the safe MIME list;
- aligns member-to-owner, owner-return, and owner-direct-delivery RPCs with the supported private-media formats;
- replaces the old 250 MB database validation with the 1 GB boundary;
- preserves existing threads, files, acknowledgments, paths, RLS, and signed-download behavior.

## Migration

Run this migration once in Supabase:

```text
database/migration-063-priestess-mailbox-1gb-inbox-clearance.sql
```

Do not run the migration from the withdrawn 10 GB draft. Do not rerun migration 046 or either migration 052 file.

Verify the bucket boundary with:

```sql
select id, file_size_limit
from storage.buckets
where id = 'flowtel-priestess-mailbox';
```

Expected `file_size_limit`:

```text
1073741824
```

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
manager/styles.css

database/migration-063-priestess-mailbox-1gb-inbox-clearance.sql
```

Run migration 063 before testing files over 250 MB or non-audio uploads that depend on the corrected RPC validation.

## Preserved boundaries

This release preserves:

- existing private mailbox threads and file records;
- member delivery alerts and owner queue history;
- member-only and owner-only access rules;
- private Storage paths and signed downloads;
- Flow FM/Council membership boundaries;
- Concierge owner authority;
- Caddie Magic v0.5.2;
- every unrelated Flowtel subsystem.

## First live test checklist

1. Run the corrected migration 063 once.
2. Confirm the mailbox bucket reports `1073741824` bytes.
3. Deploy the nine browser/runtime files and hard-refresh Flowtel.
4. Upload a member video larger than 250 MB and smaller than 1 GB.
5. Confirm the owner alert appears.
6. Press **Clear Without Downloading** and confirm the alert clears.
7. Confirm the file still appears in its original thread and can be downloaded later.
8. Upload another file and use **Download + Clear**.
9. Return a video larger than 250 MB through the same thread.
10. Confirm a file larger than 1 GB is rejected before upload.
11. Interrupt a large upload, reselect the same file, and confirm the resumable transfer is discovered.
