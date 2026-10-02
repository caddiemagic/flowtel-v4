# Caddie Magic Roadmap

## Product metaphor

**Caddie Magic is playing golf on the moon.**

It uses the Flowtel hospitality engine as a foundation, but the brand world remains separate: a private moonlit golf club, a brass-plated Locker Room, personalized Cardinal Clubs, and a quiet professional Caddie Network.


## Current — v0.7.0 Call Your Caddie / Caddie Mailbox

**v0.10.92.1 launch polish:** the player recorder now uses one combined recording/media-use consent, larger identity fields, the simplified three-step HOW IT WORKS copy, and an optional **Please do not use my name in the podcast** request. The private Mailbox retains the submitted name and shows **ANONYMITY REQUESTED**; Show Queue/Studio Mode substitute **ANONYMOUS** for public-facing use. Migration 080 adds the privacy flag; migration 081 is next.

Call Your Caddie launches first as a **native Caddie Magic voice-note experience**, not a telephone integration. An authenticated Player enters a first name + handicap, explicitly consents to recording/publication, records up to five minutes in the browser, previews/re-records locally, and sends the final audio into a private Supabase Storage bucket.

The Caddie Master receives each message as **NEW · UNHEARD**. Downloading/preparing private audio does not count as listening; the canonical `first_listened_at` is written only when owner playback actually starts. The owner Mailbox supports New / Listened / Use on Show / Used / Archived, caller-name correction, notes, and a Show Queue.

OBS Studio Mode preloads a selected private recording without playing it, then provides a clean **PLAY VOICEMAIL** stage. When the message ends the visual state becomes **CADDIE'S RESPONSE**, preserving the intended first-reaction workflow. OBS remains the recorder; Flowtel remains the content/control surface.

Phase 1 intentionally has **no Twilio dependency, no transcription, no YouTube/podcast publishing automation, no live caller queue, no browser softphone, and no Acuity private-call dependency**. Vercel remains 12/12 because the feature uses existing Supabase Auth + private Storage + RLS/RPC boundaries instead of a new API function. Migration **079** is the Caddie Mailbox foundation. Migration **080** adds the anonymity request; **081** is next.

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
