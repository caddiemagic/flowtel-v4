# Flowtel Changelog

## v0.8.1

Suite + Concierge Polish

- Adds clean profile/member name display for Suite greetings and Concierge queue labels.
- Adds the new Cycle Data pill above the Concierge Card.
- Moves current cycle Day 1 out of Current Room.
- Adds gentle 14+ day check-in streak copy and no-shame welcome-back copy.
- Restores the nested Lounge video placeholder pill.
- Separates active Awaiting Turndown requests from Completed Requests.
- Marks fulfilled Turndown requests as completed so they stop counting as active alerts.
- Adds Supabase migration 011 for Concierge profile-name visibility.

## v0.8.0

Stay Logic + Concierge Stabilization

- Stabilized Flowtel Date handling across guest and concierge flows.
- Auto-closes stale open stays before creating today’s stay.
- Re-anchors Moon Magic to canonical 2026 Pacific Time New Moon dates.
- Repairs Concierge Desk date filtering and in-house row language.
- Adds Supabase RLS migration for practitioner concierge visibility and updates.


## v0.4.3

Luxury Suite & Concierge Refinement

- Refined Medicine Wheel into a cream-and-gold compass.
- Improved day marker geometry and current day marker alignment.
- Added cardinal directions and season labels as stable visual anchors.
- Upgraded center from rose image to CSS gold rose compass.
- Refined Suite language to reduce repetition.
- Added Turndown Service request flow.
- Updated Concierge queue to only show requested care.
- Added Clock Out return flow for practitioners.
- Added placeholder My Guests section.
- Added foundational design documentation.

## v0.4.2

Compass Medicine Wheel + Arrival Flow Refinement

- Added arrival-first check-in flow.
- Added practitioner Clock In path.
- Added Lounge clock-in option.
- Prepared Suite handoff between Guest Suite and Concierge Desk.

## v0.4.1

Medicine Wheel Compass

- Rebuilt Medicine Wheel as an integrated application release.
- Added compass math and current-room highlighting.
