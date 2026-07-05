# Flowtel Changelog


## v0.9.14 — Powder Room Title Final Polish

- Updated Powder Room hero titles so the full season name and **POWDER ROOM** render in all caps.
- Reduced Powder Room title scale again so the room title can sit on one line on desktop.
- Removed the small secondary **POWDER ROOM** label above **Notes left on the mirror**.
- No Supabase migration required.

## v0.9.11 — First Check-In Guard

- Fixed a beta browser-session edge case where a newly signed-in test account could restore a cached Suite stay from another account.
- Cached Suite restores now require the stay to belong to the currently signed-in profile.
- Cleared stale Suite cache during beta account switching, member bridge login/signup, and normal email sign-in when needed.
- Updated Suite app cache-busting to `0.9.11`.
- No Supabase migration required.

## v0.9.10 — Final Suite Alignment + Test User Guide

- Moved Moon Magic above the Medicine Wheel and removed the Reflection Moon Magic pill.
- Kept the Moon Magic pill styling intact while changing only its placement.
- Made the Mentor to the Moon card align to the full Suite card width.
- Added a beta test user guide for creating confirmed Supabase Auth users and matching profile rows.
- No Supabase migration required.

## v0.9.9 — Beta Freeze + QA Polish

- Cache-busted Suite, Concierge Desk, and Cycle Data dashboard CSS/JS assets for cleaner beta deploys.
- Added the canonical v0.9.9 beta QA checklist.
- Updated active release notes for beta freeze posture.
- No Supabase migration required.

## v0.9.8 — Cycle Data Pill Final Polish

- Removed the visible match-status badge from the Suite Cycle Data pill.
- Removed the visible current cycle Day 1 line from the Suite Cycle Data pill.
- Preserved Actual Cycle Day, Recorded Cycle Day, and compassionate feedback.
- Updated Suite app cache-busting to `0.9.8`.
- No Supabase migration required.


## v0.9.7 — Cycle Data Pill Rendering Repair

- Fixed Cycle Data pill rendering so Actual Cycle Day and Recorded Cycle Day display immediately.
- Added a cache-busted Suite app script reference to avoid stale app.js in deployment.
- No new migration required.

# Flowtel Changelog


## v0.9.14 — Powder Room Title Final Polish

- Updated Powder Room hero titles so the full season name and **POWDER ROOM** render in all caps.
- Reduced Powder Room title scale again so the room title can sit on one line on desktop.
- Removed the small secondary **POWDER ROOM** label above **Notes left on the mirror**.
- No Supabase migration required.

## v0.9.6 — Actual vs Recorded Cycle Day

- Added explicit actual vs recorded cycle day storage.
- Uses Flowtel-calculated actual day as the Suite source of truth.
- Added compassionate accuracy messages.
- Added Day 1 and late-reset handling for cycle starts and previous cycle length.
- Updated Cycle Data pill, Medicine Wheel, room labels, and Concierge/Lounge labels to respect actual day.



## v0.9.0 — Choose Your Mentor

- Adds guest-facing Mentor to the Moon selection logic.
- Replaces plain practitioner directory buttons with mentor cards.
- Adds mentor profile metadata fields for title, bio, photo URL, specialties, accepting-client status, sort order, and serving wing.
- Adds RPCs for choosing a mentor and connecting with a guest from the Concierge Desk.
- Enforces one active Mentor to the Moon relationship per guest.
- Preserves relationship history by disconnecting superseded pending requests instead of deleting them.
- Softens Concierge Desk relationship language from clients/connections into mentor requests and guests.

## v0.8.3 — Turndown Completion RPC

- Added database RPC `flowtel_complete_turndown` for reliable Concierge completion.
- Moved Turndown completion out of fragile browser-side multi-column updates.
- Preserves and appends Concierge Notes during completion.
- Adds clearer migration-missing error copy when the RPC is not installed.

## v0.8.2 — Turndown Completion Hardening

- Added durable Turndown completion columns.
- Made completion state independent from Concierge Note display.
- Fixed active Awaiting Turndown count so completed requests no longer remain active.
- Added visible Concierge action error handling.


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
## v0.9.3 — Mentor Connection Repair + Consent Foundation

- Fixed the dead visible **Connect** button by removing copied DOM binding state from the hidden relationship cache.
- Added explicit mentor data-sharing consent language.
- Added consent-aware mentor invitation and pending request cancellation RPC support.
- Changed pending mentor copy from “she” to “they.”
- Renamed practitioner relationship language from Your Guests to **Your Clients**.
- Added **View Data** buttons for connected clients only.
- Added the first `/cycle-data` / `/flow-map` dashboard shell for future Flow Map work.

## v0.9.2 — Mentor Connect + Latest Polish

- Fixed visible Concierge Desk **Connect** button for Mentor Requests.
- Confirmed one active Mentor to the Moon per guest, many guests per mentor.
- Added defensive mentor Connect RPC migration.
- Updated Reflection Moon Magic copy to show theme before Next New Moon date.
- Aligned Return to Suite button with the card above.
- Polished Cycle Tracker result card structure and medicine wheel styling.
- Removed Open Room from Guests in House.
- Updated Concierge request cards to show Feels Like instead of Wing and removed Today's Room from request cards.

## v0.9.4 — Cycle Data Dashboard MVP + Seasonal Reflection Foundation

- Hid the signed-in user from the Choose Your Mentor directory so no guest can invite herself.
- Upgraded `/cycle-data/` from a placeholder shell into a live Cycle Data Dashboard MVP.
- Added self, connected-client, mentor collective, and admin global data views.
- Added Flow Map seasonal counts, snapshot metrics, and entry logs.
- Added anonymous seasonal reflection views from medicine wheel season cards.
- Added filters for actual season, moon phase, moon cycle, and date range.
- Added `collective_season_notes_opt_out` privacy groundwork for future opt-out controls.
- Added database RPCs for consent-aware cycle data access and anonymous seasonal reflections.
## v0.9.5 — Dashboard Click Repair

- Fixed connected-client **View Data** buttons in the Concierge Desk.
- Fixed Medicine Wheel seasonal card links into seasonal Flow Map views.
- No Supabase migration required.

## v0.9.12 — Powder Rooms + Suite Layout Polish

- Renamed seasonal reflection views into Summer, Autumn, Winter, and Spring Powder Rooms.
- Redesigned seasonal reflection pages as open floating-note rooms instead of structured dashboards.
- Hid dashboard filters, data tabs, snapshot panels, and Flow Map grids from Powder Room views.
- Kept anonymous seasonal reflections filtered by Actual Inner Season in the background.
- Moved Moon Magic inside the Medicine Wheel container to reduce negative space.
- Updated the Cycle Data welcome-back message to appear only after 14+ days away.
- No Supabase migration required.

## v0.9.13 — Powder Room Mirror Polish

- Reduced Powder Room hero banner scale so the mirror/notes area has more visual presence.
- Updated Powder Room titles to use **POWDER ROOM** in caps.
- Changed the Powder Room note heading to **Notes left on the mirror**.
- Removed the anonymous note count from Powder Rooms.
- Moved the Next New Moon date to its own line under the Moon Magic phase theme.
- No Supabase migration required.
