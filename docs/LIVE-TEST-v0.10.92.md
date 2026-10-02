# Flowtel v0.10.92 / Caddie Magic v0.7.0 — Live Test

Source validation does not replace these production checks.

## Deploy order

1. Run `database/migration-079-call-your-caddie-mailbox.sql` once in the production Supabase project.
2. Confirm the private `caddie-mailbox-audio` bucket and `caddie_magic_mailbox_messages` table exist.
3. Deploy the v0.10.92 source to Vercel.
4. Wait for Vercel to report Ready, then hard-refresh Caddie Magic.

## Player recorder

1. Sign in with a real Caddie Magic Player account.
2. Open `/caddie-magic/call-your-caddie/` from the Player Profile doorway.
3. Confirm first name / handicap can be edited.
4. Verify **Start Recording** refuses to begin until BOTH recording and publication consent boxes are checked.
5. Grant microphone permission.
6. Record a short voice note, stop it, listen back locally, and use **Record Again** once.
7. Record the final note and press **Send to My Caddie**.
8. Confirm the success state appears and no public media URL is exposed.
9. Repeat on iPhone/Safari. Confirm the timer, microphone permission, preview, upload, and success state work on mobile.

## Caddie Mailbox / first-listen preservation

1. Sign in as the Flowtel owner / Caddie Master.
2. Open `/manager/call-your-caddie/`.
3. Confirm the new recording shows **NEW · UNHEARD**, with name, handicap, duration, received time, and consent.
4. Without pressing Play, choose **USE ON SHOW**.
5. Confirm it leaves New, appears in **Use on Show**, and is still labeled **UNHEARD**.
6. Enter Studio Mode. Loading/preparing the selected private audio must remain silent and must not change the unheard state.

## OBS rehearsal

1. Open the selected unheard message in Studio Mode and wait until **PLAY VOICEMAIL** is ready.
2. Start OBS recording.
3. Capture the host microphone as its own OBS audio source/track.
4. Capture the Flowtel Studio browser audio as its own source/track.
5. Say: “Let’s see who called the Caddie.”
6. Press **PLAY VOICEMAIL** in Flowtel.
7. Confirm this is the first audible playback and the message becomes listened only after playback begins.
8. Confirm progress/current time advances.
9. When the voicemail finishes, confirm the screen changes to **CADDIE'S RESPONSE** with caller name + handicap.
10. Answer the question on camera, then press **MARK USED**.
11. Confirm the message leaves the Show Queue and appears under Used in the Mailbox.
12. Stop OBS and confirm the host microphone and voicemail browser audio can be adjusted independently.

## Security / regression

- A normal Player cannot open owner Mailbox data or private recordings.
- The Storage bucket is private and `getPublicUrl` is not used.
- A submitted Player recording cannot be deleted by that Player through the failed-upload cleanup policy.
- Existing Caddie Magic Scorecard, Score Map, Locker Room, Compass, Caddie Network, and Player Session Scheduling still open normally.
- Existing Caddie/Acuity booking, reschedule, and cancel behavior remains unchanged.
- Vercel function count remains 12/12.

## Status

Mark the release **LIVE PRODUCTION VERIFIED** only after the real browser recording → Mailbox → Show Queue → Studio/OBS path succeeds in production.
