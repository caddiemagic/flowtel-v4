# Live Test — Flowtel v0.10.93

Run only after migration 081 is applied and the Vercel deployment is Ready.

## Public recorder

1. Open `/caddie-magic/call-your-caddie/` in an incognito/private browser with no Flowtel session.
2. Confirm the form opens directly without asking for login or Player Profile creation.
3. Confirm How It Works shows exactly:
   - **1. You have a problem or an observation**
   - **2. Leave me a message**
   - **3. Tune in to the Call Your Caddie podcast for my response**
4. Record a 15–30 second test message, listen back, and send it.
5. Repeat once with **Please do not use my name in the podcast** checked.
6. Repeat microphone recording/upload on iPhone/Safari.

## Private owner boundary

1. While still signed out, directly open `/manager/call-your-caddie/` and `/manager/call-your-caddie/studio/`; neither may reveal owner data.
2. Sign in as The Caddie Master and confirm both public test messages arrive **NEW · UNHEARD**.
3. Confirm the anonymity-requested message shows **ANONYMITY REQUESTED** privately.
4. Add the anonymous message to Use on Show without playing it; it must remain unheard.
5. Open Studio Mode: it must show **ANONYMOUS**, not the caller's submitted name.
6. Start playback and confirm first-listen state changes only when playback actually begins.
7. Let playback end and confirm **CADDIE'S RESPONSE** appears.
8. Mark the message Used.

## Storage / abuse boundary

- Confirm there is no public bucket URL in the browser UI/network flow.
- Confirm the public caller cannot list or download mailbox audio.
- Confirm the page is using the private signed-upload flow and normal submissions still work after a hard refresh.
- Do not intentionally hammer the production rate limiter; source validation covers the 8-per-hour database boundary.

## OBS rehearsal

Record one short rehearsal with OBS capturing only camera + host mic + Flowtel browser audio. The Flowtel screen does not need to be part of the finished video.

Production status becomes **LIVE PRODUCTION VERIFIED** only after these checks pass.
