# Caddie Magic Roadmap

## Product metaphor

**Caddie Magic is playing golf on the moon.**

It uses the Flowtel hospitality engine as a foundation, but the brand world remains separate: a private moonlit golf club, a brass-plated Locker Room, personalized Cardinal Clubs, and a quiet professional Caddie Network.


## Current — v0.7.1 Call Your Caddie / Public Recorder

**Flowtel v0.10.93 public recorder:** Call Your Caddie is now a public submission doorway. A caller does not need a Flowtel or Caddie Magic account: they enter first name + handicap, accept the combined recording/media-use consent, optionally request **Please do not use my name in the podcast**, record up to five minutes, preview locally, and send the final voice note.

The public browser never receives mailbox read access or a general Storage permission. The existing Caddie API function issues a short-lived signed upload token for exactly one private object path, then a service-role-only finalize boundary creates the mailbox row. Same-origin checks, a honeypot, HMAC-hashed connection rate limiting, MIME/size checks, and a 15 MB public upload ceiling reduce abuse without storing raw IP addresses. Vercel remains **12/12**. Migration **081** is this public-recorder boundary; **082** is next.

The Caddie Master still receives every accepted message as **NEW · UNHEARD**. Downloading/preparing private audio does not count as listening; `first_listened_at` is written only when owner playback actually starts. The private Mailbox supports New / Listened / Use on Show / Used / Archived, caller-name correction, notes, anonymity-requested badges, and a Show Queue.

OBS Studio Mode remains owner-only and preloads a selected private recording without playing it. When the voicemail ends the visual state becomes **CADDIE'S RESPONSE**. An anonymity request masks the caller name as **ANONYMOUS** in Studio Mode while retaining the submitted name in the private Mailbox. OBS remains the episode recorder; Flowtel remains the control surface.

The public page now leans into the call-in-show concept visually with a voicemail-line status, broadcast/waveform details, and three icon-led How It Works cards. The approved copy is **1. You have a problem or an observation / 2. Leave me a message / 3. Tune in to the Call Your Caddie podcast for my response.**

Phase 1 still has **no Twilio dependency, no transcription, no YouTube/podcast publishing automation, no live caller queue, no browser softphone, and no Acuity private-call dependency**.

### Future Phase 2 — Call Your Caddie Live

Add Twilio only when live call-in infrastructure is ready: permanent number, ON AIR/OFF AIR state, four-caller queue, handicap capture, selectable browser answering, 10 Minutes in Heaven, +2 minutes, OBS broadcast scene, and YouTube livestream support.

### Future Phase 3 — Private Call Your Caddie

Add the $199 / 45-minute private recorded call with Acuity appointment recognition, the same permanent number, browser answering, timer/+2 minutes, and publication workflow.

## Foundation — Player data

Open:

- private Player Profile and account
- Scorecard logging for rounds and swing thoughts
- automatic Moon Day and Moon Phase tagging
- private Score Map
- anonymous Locker Room with player-controlled sharing
- upcoming golf Calendar

## Cardinal Clubs — v0.5.0

Open:

- player-owned Caddie Compass
- North, East, South, and West personalized club mapping
- Putter as the center Staff
- one functional Cardinal Club room per moon phase
- Only Mine / Everyone’s views
- Thoughts + Scores / Scores Only views
- anonymous collective entries following Locker Room sharing

Legacy assignment, dispatch, review, and note records remain preserved, but assignments, portal messaging, and Caddie Notes are no longer part of the active Caddie Network product direction.

## Caddie Network Foundation — v0.5.0

Open:

- owner invitation of an existing player into the Caddie pathway
- professional Caddie Profile
- Draft → Submitted → Approved → Active lifecycle
- separate My Player Profile / Caddie Desk modes
- approved, active, accepting Caddie directory
- one open player-to-Caddie request
- Caddie accept or decline
- exact consultation availability hidden until acceptance
- pre-Pebble Beach consultation booking
- consent-scoped, read-only consultation preparation
- no assignments, messages, notes, or player-data editing for Caddies

## Next — Data collection before pairing

The immediate goal is to collect meaningful data before designing automated pairing logic.

Collect:

- player request patterns
- Pebble Beach dates and itineraries
- consultation goals
- player score ranges and Moon patterns
- Caddie experience, courses, location, availability, and consultation style
- acceptance rates, booking lead time, and consultation completion

Do not automate matching yet.

## Future — Caddie pairing logic

Potential later scope:

- owner-assisted shortlist of two or three Caddies
- player/Caddie compatibility signals
- course and itinerary fit
- availability fit
- experience and service-style fit
- confirmed on-course Caddie pairing distinct from consultation acceptance

## Future — Concierge role architecture

Rework the growing Concierge Desk so each role receives a calm, capability-based view:

- Owner/Admin: complete command center
- Flowtel Practitioner: connected clients and authorized Flowtel services only
- Caddie: Caddie Desk only
- Player/Guest: no manager access

The visual navigation and Supabase permissions must enforce the same boundaries.

## Future — Full Caddie Concierge platform

- consultation completion states
- Caddie scheduling integrations
- trip preparation timeline
- confirmed pairing workflow
- Caddie training portal
- service tiers
- post-round feedback
- testimonials
- payment and booking layer

## Design direction

Caddie Magic should feel like:

- private golf Locker Room on the moon
- moonlit fairway
- old leather scorecard holder
- brass locker plate
- obsidian green
- navy sky
- moon silver
- antique gold
- quiet masculine mysticism

Avoid making it feel like Flowtel with golf words. It should share the engine, not the feminine hotel, rose, or temple skin.
