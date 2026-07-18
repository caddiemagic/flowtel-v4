## v0.10.50 — Team Map Membership + Owner Turndown Routing Repair

- Repaired Flow FM Team Map eligibility after lower Queendom doorway values overwrote visible membership types.
- Added effective membership recognition across profile type/rank, Auth metadata, role/initiation, and Profile Studio presence.
- Backfills eligible Flow FM/Council profiles through migration 039.
- Prevents `/api/beta-request`, `/api/squarespace-bridge`, and browser profile upserts from downgrading a higher membership.
- Applies the repaired eligibility to both authenticated and public-safe embedded Team Maps.
- Adds an owner-only **Add to Concierge Team** control for ambiguous legacy beta profiles.
- Adds an owner-only daily Team Map diagnostic with exact inclusion/exclusion reasons.
- Routes every active Turndown request from the current Flowtel Day to Megan's owner Concierge queue regardless of wing.
- Preserves opposite-wing routing for future practitioner Concierge access.
- Adds automatic Concierge Desk refresh every 45 seconds, on tab visibility, and on window focus.
- Keeps guest wing visible on open and completed Turndown request cards.
- Does not alter passwords or require migration 037 to be rerun.

## v0.10.49 — Personal Room Keys + Secure Remembered Entry

- Turned `FlowtelBeta!2026` into a one-time beta entrance credential for non-admin members.
- Added a mandatory **Create My Private Room Key** doorway before first Suite access.
- Keeps members logged in on the browser where they created their private password.
- Changed **I've Stayed Before** to require the member's actual email and password instead of silently using the shared beta password.
- Stopped `/api/squarespace-bridge` and `/api/beta-request` from resetting passwords on existing Auth accounts.
- Limited automatic Request Access login to Auth accounts created during that same request.
- Added **Forgot your password?** recovery and a Flowtel password-update screen.
- Added **Switch Account** with local-session sign-out and Flowtel cache clearing.
- Added migration 038 with `profiles.password_setup_completed_at` and the authenticated completion RPC.
- Retired migration 037; it must not be rerun after members create personal passwords.

## v0.10.48 — Beta Login Credential Alignment

- Retired the legacy `FlowtelMemberBridge!2026` browser/API credential.
- Standardized the client bridge, Squarespace bridge, beta-request endpoint, and test-account helpers on `FlowtelBeta!2026`.
- Returning and existing bridge users are now refreshed through the Supabase Admin API before browser sign-in when service-role configuration is available.
- Ignored both password environment overrides during Phase 1 so Vercel cannot use a different credential from the browser.
- Improved invalid-credential guidance for beta testers.
- Added migration 037 to reset profile-linked non-admin Auth users to the canonical beta password while preserving admin/owner credentials.

## v0.10.47 — Team Map Runtime Recovery

- Fixed a Team Map JavaScript runtime error introduced in v0.10.46.
- Replaced an undefined `normalizeExternalUrl` call with the Team Map's existing safe external-link normalizer.
- Restored rendering of today's checked-in team members and the signed-in member's presence diagnostics.
- Preserved the v0.10.46 external profile-link merge and profile-card buttons.
- Updated Team Map cache versions so browsers load the repaired script immediately.
- No Supabase migration required.

## v0.10.46 — Profile Link Save Repair

- Added a dedicated member-owned save path for the Profile Studio **External Website URL**.
- Normalizes links entered with or without `https://` instead of silently discarding bare domains.
- Saves the external profile link during both **Save Profile Draft** and **Send Profile to be Witnessed**.
- Saves current Profile Studio form fields before uploading a new profile photo.
- Verifies the saved profile link after each save and surfaces a clear migration message if it cannot be confirmed.
- Merges the signed-in member’s latest saved profile link directly into her Team Map card.
- Adds **Add My Profile Link** to the member’s own Team Map card when no link has been saved yet.
- Bumped Profile Studio and Team Map cache versions so the repair cannot be hidden behind older browser assets.
- Adds migration 036.

## v0.10.45 — Queendom Team Map Embed + External Priestess Profiles

- Standardized Team Map preview cards to **CONCIERGE TEAM** and **FLOW FM PRIESTESS** for every member.
- Removed profile bio excerpts from Team Map preview cards.
- Changed Team Map profile buttons to open the latest saved **External Website URL** directly, independent of profile approval.
- Added `/flow-fm/team-map/embed/` as a public-safe, iframe-friendly Team Map for the Queendom members page.
- Added page-load, visibility, and 60-second refresh behavior to the embedded map.
- Added responsive iframe height messaging and a ready-to-copy Squarespace embed snippet.
- Limited the public embed endpoint to display name, public photo, external profile URL, and today's actual / Feels Like seasonal placement.
- Preserved Team Map visibility opt-out and the pink rose fallback.
- Adds Supabase migration 035.

## v0.10.44 — Beta Profile Access + Owner-Only Concierge

- Temporarily bypassed Priestess Profile approval for authenticated Queendom and Flow FM Team Map viewers.
- Added **View My Profile** on a member's own Team Map card and preserved **Visit Her Queendom** for other members.
- Removed the Actual Season pill from the opened Team Map profile preview.
- Added an explicit `concierge_access_enabled` profile permission and enabled it only for Megan's owner account during Phase 1.
- Hardened existing Concierge stay RLS and Turndown actions through the shared owner-only database helper.
- Redirected unauthorized direct Concierge Desk visits to `/concierge-soon/`.
- Hid Clock In from all non-owner accounts during Phase 1.
- Adds Supabase migration 034.

## v0.10.43 — Team Map Concierge Polish + Mentor Portrait

- Removed the large **The Living Map** title while preserving the scarab and **FLOW FM TEAM MAP** identity.
- Changed the Team Map intro to **See where the concierge team is today.**
- Moved Team Map navigation to the bottom, changed Return to Lounge to **Return to Suite**, and removed Initiation Hall.
- Updated the daily status to say team members have **clocked in** to the Flowtel.
- Removed the Actual Season label beneath solid member portraits while preserving multidimensional Feels Like labels.
- Added the latest saved Priestess website URL to the Team Map profile card.
- Added the connected mentor profile photo to the Suite Mentor Panel with the pink rose fallback.
- Added migration 033 to safely expose saved website URLs to authenticated Team Map viewers.

## v0.10.42 — Living Map Presence Repair + Priestess Photo Upload

- Added **View Team Map** beside **View Flow Map** beneath the Suite Current Room card.
- Repaired the Powder Room sharing disclosure so it opens inline and collapses again with **Done**.
- Removed the underline and loud styling from **Click here to opt out**.
- Added a Living Map **Your Presence** diagnostic showing today’s check-in, season, cycle day, visibility, photo fallback, and missing-presence reason.
- Normalized legacy season values and broadened Flow FM/practitioner eligibility for today’s Team Map.
- Added native JPG/PNG/WebP Priestess photo upload through Supabase Storage with a 5 MB limit.
- Restored Profile Studio access for recognized Flow FM and Council members whose role is not yet practitioner-level.
- Synced uploaded photos into Priestess Profile and Mentor-selection photo fields.
- Preserved the Flowtel pink rose as the default image.
- Adds Supabase migration 032.

## v0.10.41 — The Living Map + Multidimensional Presence

- Added `/flow-fm/team-map/` as a daily Team Map for women who checked into Flowtel today.
- Places solid profile presences in actual Inner Seasons and translucent ghost presences in differing Feels Like seasons.
- Added stable floating profile placement, desktop astral-thread highlighting, and mobile seasonal chamber stacking.
- Uses Priestess names with the Flowtel pink rose as the default profile image.
- Flow FM members are visible by default with a clear Team Map opt-out.
- Queendom members may view the map and open approved Priestess profiles for booking.
- Added `/flow-fm/team-map/profile/`, Lounge access, Initiation Hall access, and Vercel routes.
- Adds Supabase migration 031.

## Caddie Magic v0.1.1 — Cycle Tracker-Inspired Cosmetic Refinement

- Restyled `/caddie-magic/` to feel much closer to the public Cycle Tracker layout and elegance.
- Rebalanced the Caddie Magic palette into cream, navy, deep hunter green, and antique gold.
- Reduced the oversized hero typography and softened the overall page from a loud dark dashboard into a refined card-based tracker.
- Added the existing scarab/sun-disk mark at the top of the Caddie Magic tracker hero.
- Kept all Phase 1 score tracker fields, Supabase storage, moon tagging, Player Locker, Moon Scorecard, and Notes Under the Door behavior unchanged.
- No Supabase migration required.


## Caddie Magic v0.1.0 — Moon Score Tracker Foundation

- Added `/caddie-magic/` as the first Caddie Magic portal inside the Flowtel platform engine.
- Created a masculine private-clubhouse design system for Caddie Magic.
- Added player account entry, Player Locker profile form, Round Log form, Player Locker dashboard, Moon Scorecard view, round history, and Notes Under the Door placeholder.
- Round Log visible fields are intentionally minimal: Date of Round, Course Played, Score, and Swing Thoughts.
- Auto-tags each round with moon phase, moon day, moon inner season, last new moon date, and next new moon date behind the scenes.
- Added Supabase migration 030 for Caddie Magic player profiles, round logs, and player notes.
- Added `docs/CADDIE_MAGIC_ROADMAP.md` and `docs/RELEASE-CADDIE-MAGIC-0.1.0.md`.


## v0.10.37 — Suite Checkout + Tracker CTA Combined

- Removed the optional helper line under the beta access code field on the Request Flowtel Access page.

- Combines v0.10.35 and v0.10.36 into one patch for projects that have not applied either release yet.
- Removed the duplicate **Check Out** button from the Suite action row; checkout remains in the Flowtel Lounge.
- Changed the public tracker result action-row button to **Enter The Flowtel**.
- Changed the Enter the Queendom card button to **Join The Queendom**.
- Updated client cache-busting to `0.10.37`.
- No Supabase migration required.

## v0.10.35 — Suite Checkout Button Cleanup

- Removed the duplicate **Check Out** button from the Suite action row.
- Kept checkout inside the Flowtel Lounge.
- Guarded the old Suite checkout button binding so the page does not error when the button is absent.
- Updated client cache-busting to `0.10.35`.
- No Supabase migration required.

## v0.10.34 — Suite Clock-In Button Repair

- Added the Suite-level **Clock Into the Flowtel** button for practitioner-level roles.
- Kept client beta testers blocked from practitioner-only Clock In access.
- Updated client cache-busting to `0.10.34`.


## v0.10.32 — Concierge Session Gate Repair

- Fixed `isPractitionerLevel is not defined` on the Concierge Desk.
- Removed the separate Concierge email/password form.
- Concierge Desk now opens from the active Supabase session for practitioner/admin/owner roles.
- Client accounts remain blocked behind the Phase 2 beta gate.
- Logged-out users are directed to enter through Flowtel first.
- No Supabase migration required.

## v0.10.31 — Flow Map + Tracker + Mentor Polish

- Applied Notes 037–050: Flow Map day tags, Powder Room copy, mentor selection polish, tracker copy updates, Flow Map simplification, and login loading state.
- Flow Map note cards now show only **DAY X**.
- Public tracker Actual Season labels restore **Inner** while Feels Like remains simple season names.
- Public tracker CTA now reads **Enter The Flowtel** and points to the Queendom page.
- Flow Map Practice moved below the map with Printable Flow Map inside the same pill.
- Removed Flow Map Print / Save PDF.
- Added a loading overlay when entering the Flowtel.
- Adds Supabase migration 029 for `mentor_accepting_clients` default safety.

## v0.10.30 — Public Cycle Tracker Refinement + PDF Snapshot Cleanup

- Removed the oversized public tracker hero and heavy pillar treatment.
- Kept the scarab as a smaller refined motif using a new transparent/cropped asset.
- Moved tracker intro/privacy copy into a smaller opening area inside the tracker.
- Reduced oversized result and CTA typography.
- Changed displayed feels-like seasons to Winter, Spring, Summer, and Autumn.
- Removed Wing from the public tracker data chart.
- Cleaned up the public tracker print/PDF snapshot so it fits more cleanly on one page without the rose compass wheel.
- No Supabase migration required.

## v0.10.29 — Public Cycle Tracker Temple Facelift

- Upgraded the public Cycle Tracker into a more luxurious Flowtel / Egyptian temple doorway.
- Added scarab and carved-pillar visual language to the public tracker hero.
- Added a feels-like season step so the tracker can compare calculated inner season with how the visitor feels.
- Updated the public tracker CTA to **Join the Queendom to Enter the Flowtel**.
- Added anonymous public tracker event capture through `/api/public-tracker-event`.
- Added the private `flowtel_public_tracker_events` table for aggregate usage patterns only.
- Added `docs/PUBLIC_TRACKER_ANALYTICS.md` with starter Supabase queries.
- Adds Supabase migration 028.


## v0.10.28 — Phase 2 Access Gates + Queendom Return

- Added Return to the Queendom button inside the Suite and Lounge.
- Added Phase 2 beta gate for Concierge Desk, Initiation Hall, Profile Studio, Cycle Data Dashboard, and Flow FM rooms.
- Hid Profile Studio access from guest Lounge view.
- Added shared practitioner-level access helper.
- No Supabase migration required.

## v0.10.27 — Moon Widget Queendom Variant

- Added `/moon-widget-join-queendom/`, a public/free moon calendar version of the Moon Magic widget.
- Kept `/moon-widget/` unchanged as the Queendom member widget that routes to Smart Flowtel Entry.
- Updated both widget footer lines to **It’s always sunny on the moon.**
- Public widget CTA says **Join the Queendom to Enter the Flowtel** and points to the Queendom home page.
- No Supabase migration required.


## v0.10.26 — Beta Access Auto-Login + Smart Entry Polish

- Added `/enter/` smart entry page for Moon Widget → Flowtel access.
- Updated Moon Magic widget CTA to **Enter the Flowtel**.
- Combined Smart Entry copy polish: removed redundant copy and added **It’s always sunny on the moon.**
- Removed room-key language from the beta access request flow.
- Beta access request now creates/refreshes the account and automatically logs the guest into Flowtel.
- No Supabase migration required.


## v0.10.23 — Queendom Moon Magic Widget

- Added `/moon-widget/`, an iframe-friendly Moon Magic card for the Queendom homepage.
- The widget shows the current Moon phase, Moon day, phase theme, Next New Moon date, and Flowtel Time date.
- Added a **Check Into the Flowtel** call-to-action from the Moon widget.
- Removed the unused tracking-style question from the beta access request form.
- Updated remembered-room-key login copy to **“We’re logging you in.”**
- No Supabase migration required.

# Changelog


## v0.10.22 — Beta Access Request Form

- Added `/beta-request/` so Queendom/Flow FM beta testers can request their own Flowtel room key from a protected Squarespace page.
- Added `/api/beta-request` to create or refresh Supabase Auth users and `public.profiles` rows with `role = client`.
- Added optional beta access code support through `FLOWTEL_BETA_REQUEST_CODE`.
- Added optional temporary beta password override through `FLOWTEL_BETA_TEMP_PASSWORD`.
- Added a focused SQL cleanup script for removing the manually seeded beta tester accounts before testing the new access request flow.
- No Supabase migration required.

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

## v0.10.33 — Practitioner Clock-In + Owner Desk Access

- Re-enabled Clock Into the Flowtel for practitioner-level roles only.
- Kept client/beta tester accounts blocked from Concierge Desk and practitioner rooms.
- Concierge Desk now hydrates the current user’s active Suite stay when opened directly.
- Suite return / Clock Out card now appears for practitioner-level users in the Concierge Desk.
- Updated owner/admin Concierge Desk guidance when no clock-in context exists.
- No Supabase migration required.

## v0.10.36 — Public Tracker CTA Copy Swap

- Changed the tracker result action-row CTA from **Join the Queendom to Enter the Flowtel** to **Enter The Flowtel**.
- Changed the Enter the Queendom card CTA from **Enter The Flowtel** to **Join The Queendom**.
- No Supabase migration required.
