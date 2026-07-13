# Changelog

## v0.10.21 — Trusted Doorway Bridge Hardening

- Hardened the Squarespace trusted-doorway bridge so optional Supabase admin user preparation no longer blocks Phase 1 beta entry.
- Skipped Supabase admin preparation on the returning member path; returning users now proceed to the existing Flowtel sign-in flow.
- Normalized `SUPABASE_URL` on the server so pasted values with `/auth/v1` or other paths do not create invalid Auth Admin URLs.
- Added safer bridge notes when Supabase admin preparation fails during trusted-doorway beta mode.
- Updated client cache-busting to `0.10.21`.
- No Supabase migration required.

## v0.10.20 — Trusted Doorway + Beta Reset Guide

- Added trusted-doorway beta fallback so Squarespace Contacts API instability does not block Phase 1 testing.
- Kept Squarespace Contacts verification when it works, but accepts the protected Squarespace member doorway as the front gate during beta.
- Added remembered-room-key startup behavior: active Supabase sessions bypass the email doorway and go to Check-In or Suite.
- Added `/client/?logout=1` and `/client/?forceDoorway=1` testing helpers.
- Updated doorway copy for Phase 1 trusted entry.
- Added `docs/BETA_DATA_RESET.md` and `database/beta-reset-before-phase-1.sql` for clearing pre-beta test data safely.
- No Supabase migration required.

## v0.10.18 — Squarespace API Bridge for Phase 1 Beta

- Added `/api/squarespace-bridge` as a server-side Vercel endpoint for Squarespace Contacts API verification.
- Updated the Flowtel member doorway so entered emails are checked against Squarespace Contacts before a room is prepared.
- Kept the Squarespace API key and Supabase service role key out of browser code.
- Added profile metadata fields for Squarespace contact id, contact email, sync timestamp, and verification timestamp.
- Preserved Phase 1 beta gates: guest flow and Profile Studio open, Clock In and live Concierge Desk still closed.
- Adds Supabase migration 027.

## v0.10.17 — Concierge Holding Page + Lounge Profile Access

- Redirected the Flow Map `Return to Concierge` button to a temporary Concierge Desk holding page for Phase 1 beta.
- Added a new `/concierge-soon/` page that tells guests the Concierge Desk will be open for service soon.
- Added the elegant bell image as a soft background on the temporary Concierge Desk page.
- Added direct access to the Profile Studio from the Flowtel Lounge so guests can open their profile view from the lounge experience.
- No Supabase migration required.


## v0.10.15 — Login Recovery + Rollout Hardening

- Hardened the guest/client login app so Phase 1 rollout gating no longer depends on a newly introduced shared rollout module at login time.
- Hardened the mentor directory helper so one-mother/founding-mentor filtering remains local to the relationships module.
- Preserved Phase 1 behavior: Clock In remains disabled and mentor selection remains narrowed to admin/owner mentor accounts.
- Kept the Profile Studio, review queue, and Queendom styling from v0.10.14 unchanged.
- No Supabase migration required.


## v0.10.14 — Phase 1 Guest Beta Rollout + Royal Queendom Hero

- Replaced the Queendom/Profile Studio beetle emblem with the new luxury golden scarab sun-disk artwork.
- Upgraded the Queendom hero with temple-pillar side treatments using carved pillar artwork for a more royal Egyptian feel.
- Added a shared rollout config for intentional user testing phases.
- Set the active rollout to Phase 1: guest flow + Profile Studio beta.
- Disabled Clock In during Phase 1 so guests cannot enter the Concierge Desk yet.
- Restricted mentor selection during Phase 1 to admin/owner mentor accounts only, so a single founding mentor can receive early guest requests.
- Sealed the wider Flow FM curriculum for guest testers and redirected the hallway / portal / moons experience toward Profile Studio during this phase.
- Added rollout planning documentation for the 3-phase testing path.
- No Supabase migration required.


## v0.10.13 — 13 Moon Path Time Vault + Row Layout Polish

- Reworked the Initiation Hall 13 Moon Path into two clean rows of six doors for Months 1–6 and Months 7–12.
- Moved the 13th Ouroboros Moon into its own centered Time Vault card to build suspense and make the final initiation feel more ceremonial.
- Added anniversary-based locking for the Ouroboros Moon so it stays sealed until the same calendar day one year after the member joined Flow FM.
- Updated initiation progress logic so Month 13 no longer opens early at the start of the anniversary month.
- Added a locked Mystery Moon / Time Vault state on the Moon Portal page for direct access attempts before the vault opens.
- Updated the 13 Moons Path page so the Ouroboros Moon also appears as a sealed mystery until the vault date arrives.
- No Supabase migration required.


## v0.10.12 — Temple Door Grandeur + Royal Queendom Facelift

- Restyled the Initiation Hall hero with a grander Egyptian temple mood, including a winged scarab / sun-disk crest and richer luxury framing.
- Turned the 13 moon preview cards into taller, more extravagant golden temple doors with stronger hover lift, arch structure, and jewel-like detailing.
- Upgraded the Support Rooms cards so they feel like smaller luxury chambers instead of standard dashboard cards.
- Gave the Profile Studio header a more royal Your Queendom presentation with a winged scarab crest, regal copy treatment, and soft architectural framing.
- Elevated the Priestess Profile preview card with a more ceremonial frame, stronger gold trim, and richer rose-gold luxury styling.
- Kept Profile Studio dirty-state behavior, review flow, Flowtel Time logic, and database structure unchanged.
- No Supabase migration required.


## v0.10.11 — Initiation Hall Luxury Polish + Queendom Studio Refinement

- Added Initiation Hall-only rose-gold wax seal hero graphic.
- Replaced Profile Studio rose emoji with the pink rose profile image fallback.
- Added Profile Studio dirty-state display behavior for submitted and approved profiles.
- Upgraded Flow FM buttons, pills, offering chips, status pills, moon-door Enter labels, profile tags, and Planning Room actions with softer luxury styling.
- Reduced Flow FM header scale for less visual overwhelm.
- Refined Your Queendom hero copy/styling without adding the wax seal.
- Updated Planning Room calendar cards to Dragon Moon, Wild Woman Moon, and Lover Moon with New Moon / Full Moon date lines.
- Converted Moon Phase Key and Weekly Planning Prompts into refined teaching cards and prompt notes.
- Documented reserved calendar PDF paths; final calendar PDFs are still pending.


## v0.10.10 — Temple Door Restoration + Portal Cleanup

- Restored the Initiation Hall's 13 moon preview as **The Doors Ahead** with compact temple-door styling, gold trim, arch details, and clear current/open/return states.
- Kept the full Moon Portal Library / 13 Moons Path separate from the simple door preview so the main hall has visual dimension without becoming another dense dashboard.
- Removed the duplicated **Explore the Spiral / All Moon Portals Are Open** section from individual Moon Portal pages.
- Updated Moon Portal orientation copy so the current portal heading can stand alone as the moon name instead of “You are walking…” language.
- Cleaned up the full 13 Moons Path moon date display so New Moon and Full Moon dates render as readable date pills.
- Repaired Priestess Profile Studio loading by rendering the simplified form immediately before Supabase/profile imports finish.
- Added static Profile Studio top navigation fallback so navigation appears even if JavaScript/save hydration fails.
- No Supabase migration required.


## v0.10.9 — Profile Studio Simplification + Initiation Hall Polish

- Simplified Priestess Profile Studio into a low-overwhelm selection flow with Profile Name, Legal Name, Title, Bio Template, Offerings, optional Location, Preferred Timezone, and External Website URL.
- Added prepared Priestess title, bio, offering, and timezone options in `shared/priestess-profile-options.js`.
- Changed the Profile Studio hero to `Your Queendom` and updated Assignment 1 language to match.
- Hid Access State from normal users while keeping admin/debug access available with `?debug=1`.
- Simplified Flow FM top navigation to Initiation Hall, Planning Room, Profile Studio, and Return to Suite.
- Added `Track Your Cycle` to Womb Work Module 1.
- Added New Moon and Full Moon date lines to 13 Moons / Explore the Spiral cards.
- Began restyling moon portals as gold-trimmed temple-door cards.
- Updated coursework navigation to include Return to Concierge.
- Tightened Review Desk front-end access to admin/owner roles.
- No Supabase migration required.


## v0.10.7 — Moon Portal Experience + Hall Facelift

- Added `/flow-fm/portal/` as the primary Moon Portal experience where each moon contains the initiation teaching, Womb Work module, Business Assignment, practice prompt, reflection prompt, and submission pathway.
- Updated `/flow-fm/` with a more Flowtel-branded Hallway facelift, “You Are Here” panel, current Womb Work, current Business Assignment, and direct Current Moon Portal action.
- Rotated the visible 13 Moons Path and portal library around each user’s unique initiation entry moon instead of always beginning with November / Temple Moon.
- Kept Womb Work Modules and Business Assignments as library/tracker rooms while making the Moon Portal the main practitioner flow.
- Clarified Assignment 1 logic: Priestess Profile Studio is the true workroom for the Profile Foundation assignment, so members should not need to submit the same profile twice.
- Updated Flow Map rendering so quadrant density is calculated before notes render, rows expand after notes reach a minimum readable size, and the horizontal axis moves with the available top/bottom room.
- Improved desktop Flow Map note fields and mobile seasonal stacking so the map behaves more like living inner space than a fixed dashboard grid.
- No Supabase migration required.

## v0.10.6 — Womb Work Room + Practitioner Polish

- Expanded the Womb Work Modules room with an interactive module detail panel, practice prompts, reflection prompts, assignment pairings, and future Squarespace lesson placeholders.
- Stabilized the Review Desk so assignment and Priestess Profile queues load independently and show more specific queue errors instead of one generic failure message.
- Added migration 025 to broaden review queue role recognition and return empty queues for non-review users while preserving mentor consent boundaries.
- Moved the INITIATION HALL pill into the right side of the Concierge Desk hero panel.
- Fixed the expanded Powder Room Sharing pill so text wraps inside the Reflection card and added a Done collapse action.
- Returned bottom Suite buttons to a two-button aligned layout.
- Reduced Mentor to the Moon card vertical spacing and changed connected mentor state into an Open Mentor Panel action.
- Added a front-end Mentor Panel foundation for upcoming calls, notes exchanged, and future between-call mentor reflections.
- Restyled Powder Room season-switching and return links as Flowtel button/pills with proper spacing.

## v0.10.5 — Profile Studio Loader Repair

- Fixed the invalid Flow FM UI regular expression that prevented subpage modules from loading and left Profile Studio stuck on loading placeholders.
- Updated Flow FM subpage CSS/script references to absolute paths for clean URL stability.
- Updated Flow FM module imports to absolute paths for nested route stability.
- Updated Planning Room calendar links to absolute asset paths.
- No Supabase migration required.

## v0.10.3 — Flow FM Access Gate Repair

- Fixed the Flow FM access gate so authenticated users with a profile row can see their own Business Assignment and Priestess Profile forms.
- Added additional role aliases for Flow FM UI recognition, including `mentor`, `manager`, and `concierge`.
- Added migration 024 to broaden the Supabase self-service gate used by assignment/profile save RPCs.
- Preserved consent-aware read access, mentor/admin Review Desk boundaries, and read-only mode when viewing another member.


## v0.10.2 — Flow FM Hallway + Planning Room

- Reorganized `/flow-fm/` into a cleaner Initiation Hallway with separate doors instead of one dense page.
- Added dedicated routes for the 13 Moons Path, Womb Work Modules, Business Assignments, Priestess Profile Studio, Planning Room, and Review Desk.
- Moved assignment and Priestess Profile review queues into `/flow-fm/review/` so the student hallway stays calmer.
- Added the Planning Room with current moon-calendar example PDFs, a moon phase key, portal open/close explanation, and weekly business planning prompts.
- Added `shared/womb-work.js` for the 13 inner curriculum modules and `shared/moon-calendars.js` for planning-room content.
- Added a first-pass initiation anchor helper so Flow FM can reflect the “before full moon = current moon / after full moon = next moon” rule in the hallway experience.
- Hardened Flow FM page loading so failed assignment/profile RPC calls no longer collapse the entire experience back into one generic preview state.
- Added access diagnostics to help identify when a signed-in practitioner profile is not being recognized as Flow FM-enabled.
- No Supabase migration required.

## v0.10.1 — Priestess Profile Studio

- Added the Priestess Profile Studio inside `/flow-fm/` for Flow FM Assignment 1.
- Added guided profile intake fields for Priestess name, bio, modalities, who she serves, session types, scheduling/social links, Queendom name, offerings, location/timezone, framework language, and practitioner network interest signals.
- Added a display-only profile preview card with photo URL support, profile sections, links, tags, and review notes.
- Added Supabase migration 023 with `flow_fm_priestess_profiles`, profile statuses, draft/save/submit RPCs, consent-aware read access, and mentor/admin review RPCs.
- Added a Profile Review Queue for mentors/admins to approve submitted profiles or request refinement.
- Added `shared/priestess-profiles.js` and exported profile helpers through `shared/flowtel.js`.
- Preserved Flow FM assignment tracking, mentor consent, luxury language, and no-gamification rules.


## v0.10.0 — Flow FM Construction

- Added the Flow FM Business Assignment Tracker with migration 022, `flow_fm_assignment_submissions`, assignment draft/submission RPCs, mentor/admin review RPCs, review queue, progress cards, and status pills.
- Added `shared/assignments.js` and exported Flow FM assignment helpers through `shared/flowtel.js`.
- Added confirmation logic when a returning guest records a cycle day lower than Flowtel’s calculated actual day, so lower numbers no longer automatically create a new cycle.
- Hid the full Powder Room Sharing pill by default behind soft inline opt-out copy and updated reflection/checkout saves to honor the master Powder Room sharing setting.
- Moved Initiation Hall access into the Concierge Desk panel with the button label `INITIATION HALL` and removed the old Suite-level initiation button.
- Simplified Flow Map and Cycle Data controls by grouping view switching, filters, utility actions, print/save, and return actions into quieter disclosures.
- Reduced the Initiation Hall hero header scale and removed the placeholder headline `THE CURRICULUM LIVES HERE.` from the 13 Moons Path section.
- Preserved core stay logic, Flowtel Time, append-only history, Powder Room anonymity, Flow Map orientation, Concierge/Turndown, and no-gamification language.


## v0.9.23 — Flow FM Initiation Hall
- Added `/flow-fm/` as the first Flow FM curriculum home inside Flowtel.
- Added current moon, curriculum arcs, 13 moon path, and business assignment list.
- Added Suite link into Flow FM Initiation.
- No Supabase migration required.


## v0.9.22 — Flow Map Room Expansion + Printable Map

- Added a Printable Flow Map button on the Flow Map Practice screen.
- Added a blank one-page printable Flow Map at `/flow-map/printable/`.
- Expanded the Flow Map canvas dynamically when seasonal notes crowd a quadrant.
- Added note-density sizing so notes become smaller when there are many notes in one season.
- Added the line: “There’s always room on the moon.”
- No Supabase migration required.


## v0.9.21 — Suite Spacing + Cycle Tracker Facelift

- Tightened Suite Cycle Data, Today's Room, Reflection, and Mentor card spacing.
- Moved Mentor to the Moon below the Reflection card.
- Updated feels-like language to Winter/Spring/Summer/Fall and lowercase conversational day/season phrasing.
- Added the “That’s so _season_ of you.” Suite line for off-day + mismatched feels-like check-ins.
- Polished the public Cycle Tracker lobby and medicine wheel proportions.
- Added Download / Save PDF support for public Cycle Tracker results.


## v0.9.20 — Mobile Medicine Wheel Breathing Room

- Spreads the mobile day-number ring outward and slightly tightens bubble size.
- Increases the mobile Medicine Wheel card space so season cards stay inside the pill.
- Adds clearance between Moon Magic and the top season cards.
- Adds responsive wheel re-rendering on resize.
- No Supabase migration required.


## v0.9.19 — Powder Room Navigation + Reflection Sharing Copy Polish

- Added Powder Room season-to-season navigation.
- Moved Powder Room return actions to the bottom of the page.
- Simplified Powder Room Sharing consent copy in the Reflection card.
- Tightened common pill and card spacing.
- No Supabase migration required.

# Changelog

## v0.9.18 — Master Powder Room Consent + Flow Map Practice Polish

- Replaced per-reflection Powder Room toggles with one master guest-level Powder Room Sharing setting.
- Added database migration 021 to store profile-level Powder Room opt-out and normalize reflection sharing flags.
- Strengthened Flow Map control layout so names no longer force buttons to wrap awkwardly.
- Removed timestamps from Flow Map notes and changed note metadata to “Felt like …”.
- Moved View Flow Map under the Current Room pill.
- Tightened mobile Medicine Wheel ring spacing and expanded the wheel panel so season cards fit inside the container.


## v0.9.18 — Master Powder Room Consent + Flow Map Control Polish

- Replaced reflection-level Powder Room sharing with one master guest setting.
- Added Suite UI for account-level anonymous Powder Room sharing.
- Updated Powder Room RPC to use profile-level opt-out as the single source of truth.
- Normalized legacy per-reflection share flags back to true.
- Polished Flow Map control layout so names do not push controls out of alignment.


## v0.9.16 — Flow Map Practice Dashboard

- Added a new `/flow-map/` route for the Flow Map Practice.
- Separated the reflective Flow Map from the analytical Cycle Data Dashboard.
- Added a four-quadrant seasonal spread based on the printable Flow Map.
- Organized one cycle of check-ins by Actual Inner Season into Inner Autumn, Inner Summer, Inner Winter, and Inner Spring quadrants.
- Added a cycle selector that defaults to the most recently completed cycle when available.
- Added note pills with reflection text, cycle day, feels-like season, check-in time, and days ahead/behind when relevant.
- Added client name context for mentor/admin client Flow Map views.
- Added `Print / Save PDF` for Flow Map practice sessions.
- Added `Open Flow Map` from the Cycle Data Dashboard.
- Reduced the Cycle Data Dashboard hero title size slightly.
- Added Supabase migration 019 to expand consent-aware cycle data entries for Flow Map views.

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


## v0.9.15 — Powder Room Label + Mirror Spacing Polish

- Changed the Powder Room hero eyebrow from **FLOW MAP** to **ANONYMOUS REFLECTIONS**.
- Added a little more vertical space between Powder Room navigation buttons and **Notes left on the mirror**.
- Updated `/cycle-data/` cache-busting to `v=0.9.15`.
- No Supabase migration required.

## v0.9.17 — Flow Map Consent + Practice Polish

- Added reflection-level anonymous Powder Room sharing controls, checked by default.
- Added checkout-note sharing controls, checked by default.
- Removed quiet/no-note check-ins from the Flow Map Practice.
- Added checkout notes to Flow Map note pills, Cycle Data entry logs, and eligible Powder Room reflections.
- Added mentor/admin Flow Map toggles for self, individual clients, and collective client views.
- Added Last 3 Cycles to the Flow Map cycle selector.
- Improved mobile Flow Map order: Winter, Spring, Summer, Autumn.
- Improved Print / Save PDF to preserve the cross-axis Flow Map layout.
- Added Schedule Call to the connected Mentor to the Moon card.
- Added View Flow Map under the Current Room pill.
- Adds Supabase migration 020.
