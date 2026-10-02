# Caddie Magic v0.7.1 — Public Call Your Caddie Recorder

Caddie Magic v0.7.1 opens the Call Your Caddie voicemail line to people who do not have a Flowtel account while keeping the actual Caddie workspace private.

## Caller experience

- Public `/caddie-magic/call-your-caddie/` recorder.
- First name + handicap remain required.
- One required recording/media-use consent.
- Optional **Please do not use my name in the podcast** request.
- Up to five minutes of browser audio.
- Local listen-back / record-again before explicit send.
- No Flowtel signup or Player Profile required.

## Caddie Master privacy boundary

Public callers cannot:

- list mailbox messages;
- retrieve any recording;
- open `/manager/call-your-caddie/`;
- open `/manager/call-your-caddie/studio/`;
- access Player data or other Caddie Magic rooms.

Accepted public messages enter the same owner workflow as **NEW · UNHEARD**. Anonymity requests remain visible privately as **ANONYMITY REQUESTED** and render as **ANONYMOUS** in Studio Mode.

## Media architecture

The public browser receives one short-lived signed upload token for one private object path. The Caddie Mailbox bucket remains private. Owner playback still marks first listen only from the actual audio `play` event, preserving the first-reaction OBS workflow.

## Version / database

- Flowtel: v0.10.93
- Caddie Magic: v0.7.1
- Migration: 081
- Next migration: 082
- Vercel: 12/12
