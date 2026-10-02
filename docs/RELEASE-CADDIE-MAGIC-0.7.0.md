# Caddie Magic v0.7.0 — Call Your Caddie

Release date: October 1, 2026

## Purpose

Launch the simplest useful Call Your Caddie format: a Player has a golf problem, records a voice note directly inside Caddie Magic, and the Caddie Master hears it for the first time while recording a response in OBS.

## Player experience

`/caddie-magic/call-your-caddie/` provides:

- first name + handicap;
- explicit recording/publication consent;
- native browser microphone recording;
- a hard 5-minute recording ceiling;
- local listen-back before submission;
- record-again support;
- **SEND TO MY CADDIE**;
- Mailbox available now / Live coming soon / Private coming soon positioning.

The Player preview is local and does not count as the Caddie Master's first listen.

## Caddie Master Mailbox

`/manager/call-your-caddie/` provides:

- New;
- Listened;
- Use on Show;
- Used;
- Archived;
- independent UNHEARD state from `first_listened_at`;
- secure private playback;
- caller-name correction;
- handicap + duration + received time;
- consent confirmation;
- private notes;
- Show Queue / Studio Mode doorway.

## Studio Mode

`/manager/call-your-caddie/studio/` is intentionally sparse for OBS capture. Selected audio is downloaded privately but not played until the Caddie Master presses **PLAY VOICEMAIL**. Playback completion switches the screen to **CADDIE'S RESPONSE**.

## Architecture

Phase 1 uses:

`MediaRecorder -> authenticated private Supabase Storage -> migration-079 RPC -> Caddie Mailbox -> OBS Studio Mode`

There is no Twilio dependency and no new Vercel function.

## Protected boundaries

- Every Caddie remains a Player first.
- Existing Caddie Magic access remains authoritative.
- Call Your Caddie does not grant Flowtel access to Player-only identities.
- Mailbox administration remains owner-only.
- Existing Acuity Player Session Scheduling remains unchanged.
- Existing Scorecard, Score Map, Compass, Locker Room, Caddie Network, and scheduling history remain unchanged.
