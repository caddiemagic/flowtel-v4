# Flowtel v0.10.92 — Call Your Caddie Mailbox

Release date: October 1, 2026

Caddie Magic advances to **v0.7.0** with the first Call Your Caddie Studio release.

## Launch contract

Phase 1 deliberately bypasses Twilio. An authenticated Caddie Magic Player can open `/caddie-magic/call-your-caddie/`, enter a first name and handicap, explicitly consent to recording/publication, record a browser voice note up to five minutes, preview/re-record it locally, and submit the final recording to the private Caddie Mailbox.

The owner opens `/manager/call-your-caddie/` to manage **New / Listened / Use on Show / Used / Archived** messages. Private audio is retrieved through authenticated Supabase Storage access and is never published through a public bucket URL.

## First-listen preservation

A submitted recording arrives **NEW · UNHEARD**. Uploading, listing, or downloading the private media does not mark it listened. `first_listened_at` is written only when owner playback actually begins.

This allows the owner to select an unheard message for the Show Queue, start OBS, enter Studio Mode, and hear the voicemail for the first time on camera.

## OBS Studio Mode

`/manager/call-your-caddie/studio/` is a clean broadcast-friendly screen rather than an admin dashboard. It preloads selected private audio without playing it, then shows the caller name, handicap, duration, progress, and **PLAY VOICEMAIL** control. When playback finishes the stage changes to **CADDIE'S RESPONSE**.

OBS remains responsible for camera, microphone, browser-audio capture, recording, editing, and eventual livestreaming. Flowtel owns the message/content state.

## Privacy and consent

- Caddie Magic Player access is required to submit a message.
- Explicit browser-checkbox consent is required for both recording and publication.
- Consent timestamp, method, and version are stored server-side.
- Audio is stored in a private `caddie-mailbox-audio` bucket.
- Players may upload only inside their own authenticated storage prefix.
- Submitted recordings are readable only by the Flowtel owner/Caddie Master.
- A Player can remove an orphaned failed upload only before a mailbox row references it.
- The browser never receives a public recording URL.

## Database

Run once before deploying the UI:

`database/migration-079-call-your-caddie-mailbox.sql`

Migration 079 creates the private storage bucket, `caddie_magic_mailbox_messages`, indexes, RLS/storage policies, and the authenticated submission/owner mailbox RPCs.

Migration **079 is latest** after this release. Migration **080 is next**.

## Infrastructure

No new Vercel serverless function is added. The budget remains **12/12**.

No new environment variables are required.

Twilio is intentionally not part of this release. It remains future infrastructure for Call Your Caddie Live and private phone sessions.

## Deferred

Not included in v0.10.92:

- Twilio / permanent phone number
- live call-in queue
- browser softphone
- 10 Minutes in Heaven / +2-minute extensions
- Acuity private Call Your Caddie sessions
- transcription / AI summary
- YouTube or podcast publishing automation
- public Call Your Caddie content archive

## Live verification

Source validation does not replace production verification. After migration 079 and deployment, test at least one real Chrome/Edge desktop recording and one iPhone/Safari recording, confirm private upload/owner playback, verify an unheard selected message stays unheard until Studio Mode playback begins, and record a short OBS rehearsal with microphone and browser audio captured separately.
