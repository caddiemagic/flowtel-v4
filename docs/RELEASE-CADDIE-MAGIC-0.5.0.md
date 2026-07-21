# Caddie Magic v0.5.0 — Caddie Network Foundation + Cardinal Club Rooms

## Purpose

This release turns the approved Caddie Network product design into the first working foundation. Every Caddie remains a Caddie Magic player first, then receives a separate owner-approved service doorway for player requests, consultation availability, and scheduled pre-Pebble Beach meetings.

It also reworks the player Caddie Compass from a decorative map into four functional Cardinal Club rooms and carries the v0.4.6 mobile Score Map control repair into the latest Flowtel source.

## Player experience

- Adds **Find a Caddie** to the Player Profile.
- Lists only owner-approved, active Caddies who have turned on **Accepting Player Requests**.
- Allows one open Caddie request per player.
- Collects anticipated Pebble Beach date, itinerary, consultation goal, prior Pebble Beach experience, and explicit sharing consent.
- Keeps Caddie availability private until the requested Caddie accepts.
- Lets the player schedule an exact available consultation time after acceptance.
- Displays scheduled consultations and meeting links when supplied.
- Allows the player to cancel a pending request, end an accepted request, or cancel a consultation. Ending an accepted request also cancels its scheduled consultation and reopens a future slot.
- Clearly states that a request or consultation is not yet a confirmed on-course pairing.

## Caddie pathway

- Owner invites an existing Caddie Magic Player into the Caddie Network.
- The invited player keeps the same login, Player Profile, Scorecard, Score Map, Locker Room, Compass, and Calendar.
- Adds a separate **Caddie Desk** doorway.
- Adds professional Caddie Profile setup with draft, submitted, approved, active, paused, and declined states.
- Owner may approve, activate, pause, or decline the service profile without changing the player identity or score history.
- Active Caddies may turn **Accepting Player Requests** on or off.
- Caddies may accept or decline player requests, post exact consultation times, see scheduled meetings, mark completed consultations, and open consent-scoped read-only preparation data.
- Caddies cannot create assignments, send portal messages, leave Caddie Notes, or edit player records.

## Caddie Compass and Cardinal Club rooms

- Removes player-facing Homework, Messages, assignment history, and Caddie Note workflows from the active Compass experience.
- Keeps the Compass editable by its player.
- Converts North, East, West, and South cards into clickable room doorways.
- Uses the player’s personalized clubs in every room:
  - North Club → Last Quarter Phase → Moon Days 20–26
  - East Club → Full Moon Phase → Moon Days 12–19
  - South Club → First Quarter Phase → Moon Days 6–11
  - West Club → New Moon Phase → Moon Days 27–5
- Adds **Only Mine / Everyone’s** and **Thoughts + Scores / Scores Only** controls.
- Personal entries include date and course context.
- Everyone’s entries remain anonymous and follow the existing Locker Room sharing preference.
- Adds personal entry count, average score, and best score for each Cardinal Club.

## Owner Concierge integration

- Adds a visible **Caddie Network** owner card.
- Adds **Invite as Caddie** to existing Caddie Magic player rows.
- Adds owner review queues for submitted, active, and developing Caddie Profiles.
- Removes the visible legacy Caddie Review and Assignments + Messages cards from the owner dashboard.
- The broader Concierge Desk role-architecture redesign remains a future release; this source still protects the current Desk as owner-only.

## Score Map mobile repair

- Carries the complete v0.4.6 mobile control fix into this source.
- **Current Moon / Last Moon / All** fills one full-width segmented row.
- **Thoughts + Scores / Scores Only** fills a second full-width segmented row.
- Matches the Locker Room’s height, gold dividers, centered labels, and green active state.

## Supabase migration

Run:

`database/migration-052-caddie-magic-caddie-network-foundation.sql`

Run migration 052 after migration 051. It creates the Caddie Network service profiles, player requests, exact availability slots, consultations, consent-scoped read-only preparation RPCs, owner approval RPCs, and restrictive Caddie Magic product-access boundaries for every new table and service function.

The migration preserves legacy assignment, dispatch, review, and note records for historical safety, but those features are no longer surfaced as Caddie Network capabilities.

## First test checklist

1. Run migration 052 in Supabase.
2. Deploy the full project or all patch files, including `vercel.json`.
3. Confirm Caddie Magic displays v0.5.0.
4. From Concierge Desk → Caddie Players, invite an existing player as a Caddie.
5. Sign in as that player and confirm **Caddie Desk** appears without replacing **My Player Profile**.
6. Complete and submit the Caddie Profile.
7. From the owner Caddie Network queue, approve and activate it.
8. As the Caddie, turn on **Accepting Player Requests** and add future availability.
9. As another player, open **Find a Caddie**, submit a request, and confirm availability remains hidden.
10. As the Caddie, accept the request and confirm read-only preparation opens without editing, assignments, notes, or messages.
11. As the player, confirm availability now appears, schedule one consultation, and confirm additional slots hide while it is scheduled.
12. As the Caddie, confirm the consultation can be marked complete after it begins.
13. Cancel a future consultation and confirm its time returns to availability.
14. Open the Caddie Compass and enter all four Cardinal Club rooms.
15. Confirm personalized club names and correct moon-phase mappings.
16. Confirm **Only Mine / Everyone’s** and **Thoughts + Scores / Scores Only** work.
17. Confirm anonymous entries contain no player name, course, or exact date.
18. Open the Score Map on mobile and confirm both control rows match the Locker Room.

## Validation boundary

This package receives static file, JavaScript syntax, route, ID/reference, migration-structure, and archive-integrity validation. A live Supabase project and authenticated browser sessions are still required for end-to-end permission and booking tests.
