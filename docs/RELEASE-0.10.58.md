# Flowtel v0.10.58 — Guest House Call Replay Room MVP

Release date: 2026-07-20

## Summary

This release opens the **Flowtel Guest House**, a public threshold for former 1:1 clients who may not be Queendom or Flowtel members. A woman can request her own call recording, receive a private audio or video Replay Room, and encounter an invitation into the Queendom without being granted access to the Flowtel.

The central access rule is:

> A Guest House request creates a minimal private request identity—not a Flowtel login, membership, Suite, stay, or product-access grant.

The owner Concierge can locate the recording, upload one or more private replay files, prepare a revocable room key, copy the secure link, optionally email the invitation, and close the room when needed.

## Source preservation

This release was patched from the complete combined **Flowtel v0.10.57 — Hourly Flow Rate MVP** project. It preserves all v0.10.57 Hourly Flow Rate work and the integrated Caddie Magic v0.4.5 source present in that project.

The project was not recreated from memory or from an older Flowtel ZIP.

## Public Guest House doorway

New public route:

`/guest-house/`

The request form collects:

- first name;
- last name;
- the email used for the 1:1 call;
- an optional approximate call date or month;
- an optional memory or topic from the call;
- an optional private note;
- confirmation that the woman is requesting her own recording.

The public form includes a quiet anti-bot field and a simple three-request-per-email daily limit. It creates only:

- a `flowtel_guest_house_guests` identity record;
- a `flowtel_guest_house_requests` record;
- an append-only request event.

It does **not** create or alter:

- a Supabase Auth user;
- a password or personal room key;
- a `profiles` record;
- Queendom, Flow FM, Council, or Caddie Magic access;
- a Flowtel stay;
- membership rank or type;
- Team Map presence;
- cycle, mentor, Powder Room, Flow Map, Concierge, Honors, or Mailbox data.

When the email already belongs to a Flowtel member, the Guest House may privately link the request to the existing profile ID for owner recognition. It never changes that member’s password, membership, display name, product access, or existing data.

## Private Replay Room

New token-gated route:

`/guest-house/replay/`

A Replay Room opens through a 256-bit opaque room key. Flowtel stores only the SHA-256 hash of that key. The raw key appears in the invitation link but is not stored in the database.

On arrival, the browser:

1. receives the room key from the URL;
2. places it in session storage for the current browser session;
3. removes it from the visible address bar;
4. sends it to the private access API;
5. receives short-lived, 15-minute signed media URLs after server-side validation.

The Replay Room:

- requires no Flowtel login or password;
- shows only the files attached to that specific request;
- supports in-browser audio and video playback;
- offers private downloads;
- can contain multiple files or call parts;
- shows a note from Megan when one was added;
- displays the room-key expiration date;
- can refresh its temporary player links;
- records room opens, first plays, and download requests as private delivery events;
- is marked `noindex`, `nofollow`, `noarchive` and uses no-referrer/no-store headers;
- includes a gentle Queendom invitation without making membership a condition of receiving the replay.

## Owner Concierge workflow

A new **Flowtel Guest House** card appears inside the owner-only Concierge Desk.

The queue shows:

- guest name and email;
- whether the email already belongs to an existing Flowtel identity;
- approximate call date or month;
- identifying call memory/topic;
- private request note;
- request status;
- private owner note;
- replay files;
- room-key state and expiration;
- last room access and visit count.

Owner statuses are:

- Request received;
- Locating your replay;
- Preparing your Replay Room;
- Replay Room ready;
- Private invitation shared;
- Replay received;
- A personal reply is needed;
- Room archived.

The owner can:

- save the status and private Concierge note independently;
- upload MP4, MOV, M4V, WEBM, MP3, WAV, M4A, AAC, or OGG files;
- upload files up to 2 GB, subject to the Supabase project’s plan-level Storage limit;
- use resumable uploads in 6 MB chunks for files larger than 6 MB;
- provide a replay title and note visible to the guest;
- upload multiple call parts;
- privately download the preserved master file;
- remove a mistaken file from the guest’s room without deleting its private record;
- prepare 30-, 60-, 90-, 180-, or 365-day room access;
- generate a replacement key, which invalidates the prior key;
- copy the secure link;
- optionally email the invitation without attaching the recording;
- revoke the room key at any time.

If the final active file is removed from a room, the request returns to **Preparing your Replay Room** and current access is revoked automatically.

## Storage and database privacy

Migration 048 creates the private bucket:

`flowtel-guest-house-replays`

The bucket is not public. Anonymous and authenticated browser roles receive no direct Guest House table privileges and no Storage read access.

New tables:

- `flowtel_guest_house_guests`;
- `flowtel_guest_house_requests`;
- `flowtel_guest_house_files`;
- `flowtel_guest_house_events`.

The event table is append-only in normal product behavior and records meaningful events rather than player progress or keystrokes:

- request created;
- status changed;
- replay uploaded;
- replay removed from room;
- access prepared;
- access revoked;
- room opened;
- stream started;
- download requested;
- invitation sent or prepared.

Owner browser operations use authenticated, owner-only RPCs. Public requests and replay access pass through Vercel server functions using the server-side Supabase service role. The service-role key never appears in browser code.

## Optional invitation email

The recording is never attached to an email.

The owner can always copy the Replay Room link and share it through her preferred private message. Optional automatic email delivery uses Resend when these Vercel environment variables are configured:

- `RESEND_API_KEY`;
- `FLOWTEL_GUEST_HOUSE_FROM_EMAIL`;
- `FLOWTEL_GUEST_HOUSE_REPLY_TO` — optional;
- `FLOWTEL_PUBLIC_ORIGIN` — optional, defaults to `https://app.theflowtel.com`.

When Resend is not configured, the owner receives a clear copy-link fallback rather than a failed replay upload or a broken room.

## Routes and files

New routes:

- `/guest-house/`;
- `/guest-house/replay/`.

New server endpoints:

- `/api/guest-house-request`;
- `/api/guest-house-access`;
- `/api/guest-house-notify`.

New migration:

`database/migration-048-guest-house-call-replay-room.sql`

## Preservation guarantees

This release does not change:

- Flowtel Time;
- one stay per Flowtel Day;
- append-only stays, reflections, checkout notes, or Concierge-note history;
- personal passwords or remembered sessions;
- retired migration 037;
- canonical `display_name` behavior or legal-name privacy;
- owner-only Concierge access for `mm.johnson@icloud.com`;
- owner all-wing Turndown routing;
- unread Concierge-note continuity;
- member, public, and owner Team Map boundaries;
- membership preservation;
- mentor consent or relationship rules;
- Powder Room anonymity or master sharing;
- Flow Map history;
- Medicine Wheel geometry;
- actual-versus-recorded cycle-day logic;
- Moonbox beta hold;
- Flowtel Honors 77/23 append-only calculations;
- Priestess Audio Mailbox privacy or file preservation;
- Hourly Flow Rate calculations, routes, data, or Receiving Timeline;
- Caddie Magic files, invitations, Player-Only Access, migrations, or product-access boundaries.

## Migration instructions

1. Confirm migrations through **047** are already installed for the deployed v0.10.57 project.
2. Run once:

   `database/migration-048-guest-house-call-replay-room.sql`

3. Do **not** rerun migration 037.
4. Confirm the Storage bucket `flowtel-guest-house-replays` exists and remains private.
5. Confirm the owner account can open the new Guest House card in Concierge.
6. Configure Resend environment variables only when automatic invitation email is desired. Copy-link delivery works without them.

## Validation completed

- Guest House request validation and email normalization tests;
- audio/video extension, MIME, size, and media-kind tests;
- 256-bit token generation and SHA-256 hash tests;
- private Replay Room URL and expiration tests;
- public request API mock test confirming no Auth user or product-access creation;
- private access API mock test confirming hashed-token lookup and signed media URLs;
- optional email fallback API test;
- duplicate HTML ID checks;
- JavaScript element-reference checks for the new pages and Concierge card;
- CSS brace and structure checks;
- route and privacy-header checks;
- migration RLS and browser-privilege checks;
- private Storage policy checks;
- owner RPC and safe file-removal checks;
- raw room-key URL removal and session preservation checks;
- project-wide JavaScript syntax validation;
- canonical Caddie Magic preservation validation;
- patch and code-diff reconstruction verification;
- ZIP integrity checks;
- secret and local-artifact scan.

Live Supabase RLS, Storage, resumable upload, signed-media playback, and optional Resend delivery must be confirmed after migration 048 is installed in the deployed environment.

## First-test checklist

1. Run migration 048 once after migration 047.
2. Deploy the complete v0.10.58 project.
3. Open `/guest-house/` in a signed-out/private browser.
4. Submit a request with first name, last name, email, and ownership confirmation.
5. Confirm no Supabase Auth user, Flowtel profile, stay, or product-access row is created.
6. Sign in as `mm.johnson@icloud.com` and open the **Flowtel Guest House** card in Concierge.
7. Confirm the request contains the submitted identifying details.
8. Move the request through Locating and Preparing and save a private owner note.
9. Upload a small audio file and a larger video file; confirm the larger file uses visible resumable progress.
10. Confirm the replay becomes Ready and both files remain private.
11. Remove a test file from the room and confirm it disappears from guest access without deleting the owner’s preserved record.
12. Prepare a 90-day room key and copy the private link.
13. Open the link in a signed-out/private browser and confirm no Flowtel login is requested.
14. Confirm only that guest’s active replay files appear.
15. Test playback, download, temporary-player refresh, and room-access count.
16. Confirm the raw key disappears from the visible address bar after entry.
17. Revoke the room and confirm the old link can no longer open it.
18. Generate a replacement key and confirm the previous key is invalid.
19. With Resend unconfigured, confirm the Email Invitation button gives a copy-link fallback.
20. When Resend is configured, confirm the email contains only the private link—not the recording attachment.
21. Confirm the public and private pages both invite the guest into the Queendom without requiring her to join.
22. Sign in as another Flowtel member and a Player-Only Caddie Magic account; confirm neither can access the Guest House owner queue or any replay data.
