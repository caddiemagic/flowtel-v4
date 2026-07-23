## v0.10.73 — Flow FM Initiation Readiness

- Refines the Flow FM Initiation Hall hero with the scarab image, moderate shared hero typography, and removal of the striped side treatment.
- Adds a shared Flow FM typography token file so new Flow FM pages begin from a restrained hero scale rather than an oversized display default.
- Simplifies Hourly Flow Rate to four focused moments: seasonal location, lodging cost with optional listing link, Current Expenses, and visible-but-locked Lifestyle Layers.
- Removes member-facing Home Base language while preserving historical database fields and calculation compatibility.
- Replaces the dated 28-day Availability Map with reusable Inner Season Monday–Sunday templates for 1:1 client-facing call windows; every day defaults Offline.
- Preserves historical 28-day availability records and returns their legacy payload to older cached pages while the new experience writes separate weekly windows.
- Makes the explicit Flow FM start date the only initiation-progress anchor, adds member confirmation and owner correction, and prevents account creation dates or practitioner activation from resetting the initiation.
- Uses one shared 13-month progress formula: Month 1 at the far left, Month 7 at center, and Month 13 at the far right.
- Organizes the Concierge Desk into Priestess-facing Team Rooms, owner-only Flowtel administration, and Caddie Master administration, including an owner Preview Priestess View.
- Reorganizes Caddie Network administration into Overview, Players + Access, Caddies, and Courses while recording full course pages, timezone mapping, and plotted course maps as intentionally deferred.
- Adds migration 058. Caddie Magic remains v0.5.2 with no Player or Caddie service behavior changes.

## v0.10.72 — Four Seasons + Time and Space

- Simplifies the Four Seasons Lounge workshop to one free-text Winter, Spring, Summer, and Autumn location field with one save action.
- Hides Replay Notes only beneath this Four Seasons workshop while preserving the Replay Notes product, owner archive, consent-aware Flow Map integration, and historical notes.
- Adds `location_label` as the canonical seasonal destination shared bidirectionally by the Lounge and Hourly Flow Rate while preserving all older structured location, lodging, note, date, cost, and snapshot data.
- Keeps legacy seasonal RPCs backward-compatible so older cached pages refresh the same canonical location rather than creating a second source of truth.
- Adds the private Time + Space team-card view for the owner and approved Priestess Concierge Team members with profile photo, display identity, location, timezone, live local time, hemisphere, and outer season.
- Uses Flowtel’s established Northern cadence—Winter Nov–Jan, Spring Feb–Apr, Summer May–Jul, Autumn Aug–Oct—with Southern reversal and an Equatorial local-season state.
- Respects Living Map visibility and excludes legal names, email, clients, cycle data, and administrative status from the team view.
- Adds Flow FM and owner Concierge doorways plus private/no-store/noindex route handling.
- Intentionally defers location autocomplete and the plotted world map.
- Adds migration 057 and keeps Caddie Magic at v0.5.2 with no Caddie behavior changes.

## v0.10.71 — Priestess Network + Shared Identity

- Adds an owner-only Priestess Concierge Team directory containing every Flow FM and Council member, including women who have not started Profile Studio.
- Adds Flow FM/Council, profile-state, and accepting-client filters plus dedicated owner-only team profiles with membership, profile, mentor settings, consented client relationships, and authorized Client Snapshot links.
- Displays **Calendar connection coming soon** until the later shared Acuity integration supplies real practitioner calls.
- Makes `profiles` the canonical source for first name, last name, `display_name`, location, timezone, and hemisphere across Guest Profile and Priestess Profile Studio.
- Adds compatibility triggers that prevent Priestess Profile identity columns from drifting away from the canonical Flowtel identity.
- Adds Northern, Southern, and Equatorial seasonal-context selection while intentionally deferring the plotted Time and Space world map and external location autocomplete.
- Adds migration 056 and preserves all membership, mentor-consent, profile, stay, note, password, and Caddie Magic history.
- Keeps Caddie Magic at v0.5.2 with no Caddie behavior changes.

## v0.10.70 — Caddie Master Command Center

- Consolidates Player invitations/access and Caddie lifecycle operations into one Caddie Network room and removes the separate Caddie Players card.
- Adds The Caddie Master attention center for unread Player messages, unread Caddie Team messages, completed Assignments, course-verification requests, and submitted Caddie Profiles.
- Adds the Caddie Concierge Team directory with Active default, lifecycle/course filters, Player/call/availability intelligence, and dedicated owner-only profiles.
- Adds owner-granted Compass Consecration after all four Cardinal Clubs are complete.
- Adds a private Caddie Team ↔ Caddie Master chamber that remains separate from VIP Player messaging.
- Adds Upcoming Golf acknowledgment with **Send the Caddie Force** and the Player status **The Caddie Force is with you.**
- Matches Score Map controls to the Locker Room on desktop and mobile.
- Adds migration 055 and coordinates Caddie Magic v0.5.2.
- Repairs stale static validators that still referenced the retired standalone Member Directory module after v0.10.69.2 embedded that boundary inside the Concierge app.

## Caddie Magic v0.5.2 — Caddie Master Command Center + Concierge Team

- Preserves every Caddie as a Player first while adding a team-specific private support chamber.
- Adds owner Caddie Team profiles, lifecycle/course directory filtering, and Compass Consecration.
- Preserves VIP Player messaging, Scorecard Reviews, Assignments, Player privacy, Caddie consent boundaries, and all historical records.

## v0.10.69.2 — Member Directory Deployment Boundary Hotfix

- Removes the Member Directory's remaining runtime dependency on a separately deployed `shared/member-directory.js` file.
- Embeds the owner-only Member Directory RPC adapter inside the already-loaded Concierge application while preserving database authorization and local failure containment.
- Adds a focused Concierge cache key and validation that prevents this fragile module boundary from returning.
- Requires no migration; migration 054 must not be rerun.

## v0.10.69.1 — Concierge Module Load Resilience Hotfix

- Removes the new Member Directory from the Concierge Desk's top-level static module graph so one unavailable dependency can no longer block the entire owner Desk.
- Lazy-loads the Member Directory with retry-safe failure handling and contains any loading problem to that room.
- Adds a focused Concierge cache key and validator coverage for the resilient module boundary.
- Requires no migration; migration 054 must not be rerun.

## v0.10.69 — Member Integrity + Guest Profiles

- Adds an owner-only Flowtel Member Directory with private legal identity, canonical display name, email, role, membership level, access status, verification status, Last Sign-In, and Last Flowtel Check-In.
- Adds transparent Squarespace-contact evidence plus owner-controlled Queendom, Flow FM, Council, Needs Review, Not Found, Email Mismatch, Inactive, and Manual verification states without automatic revocation.
- Adds Flowtel-only revoke and restore controls for any non-owner account while preserving Auth, passwords, stays, cycle history, mentor history, files, Caddie Magic access, Guest House access, and all historical records.
- Adds an append-only access audit and prevents the normal Flowtel claim helper from silently restoring an owner-revoked account.
- Adds the private `/profile/` room with required first name, last name, Queendom display name, location, timezone, and read-only account email.
- Gently prompts every existing member to confirm her profile on the first post-release Suite entrance while allowing her to return to the Suite for now.
- Collects the complete guest-profile foundation during new beta access requests.
- Adds migration 054. Migration 053 remains installed, both historical migration 052 files remain preserved, and migration 037 remains retired.

## v0.10.68.1 — Caddie Clubhouse Login Bootstrap Hotfix

- Restores the missing top-level Caddie Magic Player Profile startup sequence.
- Reconnects **Enter the Clubhouse**, account creation, invitation-prefill, remembered-session restoration, and return navigation from Score Map.
- Adds a focused Player Profile JavaScript cache-bust so browsers do not retain the broken module.
- Extends the Caddie validator to require the actual event-binding and portal-bootstrap calls, preventing this failure from passing static validation again.
- Requires no migration; migration 053 must not be rerun.

## v0.10.68 — Caddie Network Reintegration + Shared Scheduling Foundation

- Reconciles the preserved Caddie Magic v0.5.0 Network foundation into current Flowtel HEAD while preserving all v0.4.6 geometry, mobile, Moon-data, profile, and valid-score repairs.
- Establishes the permanent Caddie Master versus paired Caddie role boundary.
- Restores Assignments, Caddie Compass, Caddie Network, Calendar, Locker Room Sharing, lifecycle-aware Caddie Desk access, Find a Caddie, and Cardinal Club Rooms.
- Adds 28-entry Scorecard Review credits with safe consumption/restoration and owner-gated VIP Caddie Master Messages.
- Simplifies the Caddie Profile and adds a controlled multi-course catalog with private Pending Verification requests.
- Adds a shared Flowtel/Caddie provider scheduling foundation, seven-day Calls/Caddying templates, date exceptions, 45-minute Caddie Consultation slots, and future Acuity/Zoom mapping fields. External Acuity/Zoom booking is not activated.
- Restores owner Caddie Network operations, explicit Vercel routes, coherent v0.5.1 cache/version wiring, and expanded validation.
- Repairs duplicate static IDs in `tracker/index.html`.
- Adds migration 053. Both historical migration 052 bodies are already live and must not be rerun or renamed. Migration 037 remains retired.

## Caddie Magic v0.5.1 — Network Reintegration + Caddie Master Service Boundaries

- Restores the v0.5.0 Caddie directory, Caddie Desk, owner approval flow, accepted-only availability, consultation preparation, and Cardinal Club Rooms.
- Preserves v0.4.6 Score Map/Locker Room geometry, valid-score calculations, future-date protection, and mobile/Upcoming Golf fixes.
- Separates owner Caddie Master Assignments, VIP Messages, Notes, and Reviews from paired Caddie permissions.
- Adds controlled courses, recurring Calls/Caddying availability, calendar blocks, and 45-minute consultation slot materialization.
- Removes the user-facing version pill and aligns active routes, headers, cache keys, manifest, and validator at v0.5.1.

## v0.10.67 — Combined Flowtel + Caddie Magic Experience Update

- Adds four independently saved seasonal-location, lodging-idea, and private-note cards beneath the Flow FM Lounge workshop video, stored inside the member’s existing Hourly Flow Rate plan.
- Adds the private `/flow-fm/availability/` four-week map with 28 independently saved availability days, dates, Moon context, weekday planets, and optional client-facing availability notes.
- Removes the Guest House account banner, updates the Queendom invitation copy, and repairs collapsed request bodies so only one replay request opens at a time.
- Matches Guest Suite Concierge button widths on desktop and mobile.
- Rebuilds the connected-client Cycle Data view as a private mentor Guest Chart with account/Queendom match status, current cycle state, check-in and clock-in quadrants, and Current Moon, Last Moon, Inner Season, Yearly Season, and All Time filters.
- Repairs the visible Flow Map `note_entries.reflection_created_at` schema/code mismatch without rewriting historical notes.
- Adds owner-to-Priestess private file delivery through the existing private Priestess Inbox and preserves the established practitioner audio workflow.
- Corrects owner 28-Day Team Map quadrants to Autumn/Summer/Winter/Spring.
- Integrates Caddie Magic v0.4.6 with corrected cardinal quadrants, simplified Player Profile/actions, revised Swing Thoughts copy, one next-relevant Moon card, and valid-score-only average/best calculations.
- Adds migration 052. Migration 037 remains retired and must never be rerun.

## Caddie Magic v0.4.6 — Quadrants, Player Profile, and Score Calculation Repair

- Corrects Score Map and Locker Room quadrants to North/East/West/South in the approved top-left, top-right, bottom-left, bottom-right geometry.
- Removes Latest Score, Moon Data, and Latest Swing Thought from the Player Profile summary.
- Keeps only Log a Round and Score Map in the top action pill.
- Changes the Swing Thoughts prompt to “What went well? What went wrong? What did you notice?”
- Removes Last New Moon and displays only the next relevant Full Moon or New Moon.
- Excludes blank, null, swing-thought-only, invalid, and zero values from average and best score calculations.
- Preserves Player-Only Access, invitations, Caddie relationships, Compass, Upcoming Golf, and all historical player data.

## v0.10.66 — Squarespace Replay Notes Session Bridge

- Displays the complete workshop replay comment/reflection form by default inside Squarespace instead of replacing it with a large login card.
- Keeps the visible form softly disabled and private until the member passes the existing Flowtel product and Queendom membership boundaries.
- Adds a one-click first-party Flowtel connection window for browsers that partition embedded iframe storage.
- Reuses an existing remembered Flowtel session without requesting the password again; signed-out members can enter their existing Flowtel credentials in the first-party window.
- Returns the session through an exact-origin, one-time-nonce `postMessage` bridge without placing credentials or tokens in URLs.
- Automatically opens the embedded room on later visits from the same Squarespace site/browser while the embedded session remains remembered.
- Adds no migration and preserves migration 037 as retired.
- Preserves all v0.10.65 Lounge video, replay-note, Guest House, Hourly Flow Rate, and Caddie Magic v0.4.5 boundaries.

## v0.10.65 — Private Lounge Video Uploader + Squarespace Replay Notes Embed

- Moves the Flow FM Lounge workshop video out of GitHub and into the private `flowtel-lounge-videos` Supabase Storage bucket.
- Adds an owner-only **Lounge Video** Concierge room with resumable uploads up to 2 GB, selected-file continuity, progress, preserved-finalization recovery, owner download, and archive controls.
- Automatically archives the prior active transmission when a new Lounge video is registered.
- Gives recognized Flow FM/Council members private signed playback URLs while keeping the bucket non-public and blocking Queendom-only, Guest House-only, and Player-Only accounts.
- Dynamically updates the Lounge title, invitation copy, and embedded replay-note source from the active video record.
- Removes the GitHub dependency on `assets/Four-Seasons-Flowtel-Workshop.mp4`; the large MP4 should not be committed to the repository.
- Documents the Squarespace iframe embed for the living replay-notes room.
- Adds migration 051. Migration 037 remains retired and must never be rerun.
- Preserves Flowtel v0.10.64, Guest House replay expiration, workshop replay notes, Hourly Flow Rate, Honors, Priestess Mailbox, and Caddie Magic v0.4.5 boundaries.

## v0.10.64 — Five Experience Updates

- Adds an embedded Queendom workshop replay-notes room with append-only Question, Note, Download, Reflection, and Track This in Cycle Data entries.
- Preserves Flowtel Time, current-day actual/recorded cycle context when checked in, Inner Season where available, and current Moon context with each replay note and returns the note to the consent-aware Flow Map.
- Adds an owner-only **Workshop Replay Notes** Concierge view grouped by workshop and canonical `display_name`.
- Replaces the Flow FM Lounge video placeholder with the **Four Seasons Flowtel Workshop** player and embedded living replay notes.
- References `/assets/Four-Seasons-Flowtel-Workshop.mp4`; the named media was not present in the supplied source ZIP and must be placed at that exact path before deployment.
- Collapses all Guest House replay requests by default and keeps only one request expanded at a time while protecting selected and active uploads.
- Removes **her** from the three owner Guest House statuses.
- Gives every replay a 28-day stay, displays days remaining, blocks expired playback, records view/download receipts, and removes expired private Storage objects on the next owner Concierge visit while preserving the file record.
- Removes the large Guest House threshold headline while preserving the invitation eyebrow, body copy, and **Join the Queendom** button.
- Improves Caddie Magic Upcoming Golf calendar legibility with practical sans-serif typography while preserving the dark/gold world and all v0.4.5 product boundaries.
- Adds migration 050. Migration 037 remains retired and must never be rerun.

## v0.10.63 — Guest House Accounts + Replay Status Portal

- Replaces the anonymous Guest House request doorway with a remembered email-and-password Guest House account.
- Requires a woman to sign in before submitting her call replay request and automatically restores her Guest House session on return.
- Reduces the request to first name, last name, **What do you remember about the call?**, and ownership confirmation.
- Removes the approximate call date/month and requester private-note fields from the client experience and owner queue.
- Adds exactly three client hospitality states: **Concierge is locating your recording**, **Your Replay Room is ready**, and **Concierge couldn't find your replay**.
- Displays ready private audio/video replays directly inside the authenticated Guest House account using 15-minute signed media URLs.
- Adds an explicit `guest_house` product-access role with no Flowtel or Caddie Magic access and blocks self-upgrade through protected routes.
- Preserves a safe same-account path for a future legitimate Queendom/Flowtel membership profile to promote access without losing Guest House history.
- Keeps legacy token-based requests separate from new accounts so an unverified login email cannot claim an older private replay.
- Removes the Concierge **Email Invitation** workflow and requires no email-provider integration in this release.
- Preserves existing legacy room-key links, private files, append-only events, and the v0.10.62 resumable large-upload protections.
- Adds migration 049. Migration 037 remains retired and must never be rerun.
- Preserves all established Flowtel, Hourly Flow Rate, Honors, Priestess Mailbox, Moonbox, and Caddie Magic boundaries.

## v0.10.62 — Guest House Replay Selection + Storage Limit Recovery Hotfix

- Prevents the Concierge Desk from discarding a selected Guest House audio/video file when the operating-system file picker returns focus to the browser.
- Protects the Guest House editor from scheduled, focus-triggered, visibility-triggered, and already-running Desk refreshes while a file is being chosen, held, or uploaded.
- Preserves the selected browser File, replay title, and guest-visible note in owner-session memory and uses that preserved File even if the native input is rebuilt.
- Adds a persistent **Ready to Upload** filename/size panel, **Clear File**, and a leave-page warning while a replay is selected or uploading.
- Keeps the selected file available after an upload error so the owner can retry without choosing it again.
- Converts Supabase **Maximum size exceeded** responses into exact guidance to raise the project-wide Storage **Global file size limit** to at least 1 GB for a roughly 450 MB replay.
- Clarifies that migration 048 already sets the private Guest House bucket limit to 2 GB, while the hosted project-wide limit must be changed in Supabase Storage Settings.
- Adds v0.10.62 cache keys and validation for file-picker focus protection, selected-file persistence, and actionable Storage-limit errors.
- No Supabase migration required. Migration 048 remains current, and migration 037 remains retired.
- Preserves all established Flowtel, Guest House, Hourly Flow Rate, Priestess Mailbox, Honors, and Caddie Magic boundaries.

## v0.10.61 — Concierge Browser Module Syntax Recovery Hotfix

- Restores the owner Concierge Desk after v0.10.60 still stopped on **Checking your role**.
- Fixes a malformed Guest House replay-upload event handler that prevented `manager/app.js` from parsing as a browser ES module, so the role check never began.
- Rewrites the upload handler as a readable, balanced block while preserving resumable 450 MB uploads, progress continuity, finalization, and pending-upload recovery.
- Loads the Concierge application through a guarded dynamic import and shows the actual module-loading error instead of only a frozen access screen.
- Adds explicit browser-module syntax validation using `node --check --input-type=module` and verifies the Concierge static module graph links across 29 modules.
- No Supabase migration required. Migration 048 remains current, and migration 037 remains retired.
- Preserves all existing Flowtel, Guest House, Hourly Flow Rate, Priestess Mailbox, Honors, and Caddie Magic boundaries.

## v0.10.60 — Concierge Access Gate Recovery Hotfix

- Restores owner access to the Concierge Desk after the screen could remain frozen on **Checking your role** following the Guest House large-upload release.
- Removes the Guest House owner module from the Concierge application's required static import graph so an optional module load or stale-cache mismatch cannot prevent owner role verification.
- Lazy-loads and validates Guest House helpers only after the core Concierge shell is available.
- Adds v0.10.60 cache-busting for the Concierge application and Guest House modules.
- Adds bounded identity/permission checks and a visible owner-recognized state instead of allowing an indefinite checking screen.
- Adds a boot watchdog that gives a clear refresh instruction if the Concierge script itself does not finish loading.
- Preserves the v0.10.59 450 MB resumable-upload continuity and all existing Flowtel and Caddie Magic boundaries.
- No Supabase migration required. Migration 048 remains the current Guest House migration, and migration 037 remains retired.

## v0.10.59 — Guest House Large Replay Upload Continuity Hotfix

- Prevents the Concierge Desk's 45-second background refresh from re-rendering and visually erasing an active Guest House upload.
- Keeps the selected replay, progress bar, upload status, and finalization message visible for long video uploads such as a 450 MB call recording.
- Uses Supabase's direct Storage hostname for resumable TUS uploads while preserving 6 MB chunks and retries.
- Separates Storage transfer from Replay Room registration so a fully uploaded file is no longer deleted when the final database step has a temporary failure.
- Preserves unfinished upload metadata in the owner browser and adds **Finish Adding to Room** rather than requiring the same large file to be uploaded again.
- Adds an explicit removal control for an unfinished private upload when the owner intentionally wants to replace it.
- Surfaces detailed upload errors in the visible Guest House panel and Concierge message area.
- Adds upload-state validation and browser cache busting for the Concierge Desk.
- No Supabase migration required. Migration 048 remains the current Guest House migration, and migration 037 remains retired.
- Preserves Flowtel v0.10.58, Hourly Flow Rate, established Flowtel privacy/access boundaries, and integrated Caddie Magic v0.4.5.

## v0.10.58 — Guest House Call Replay Room MVP

- Adds the public **Flowtel Guest House** doorway at `/guest-house/` for former 1:1 clients to request their own call replay without joining the Queendom or signing into Flowtel.
- Creates a minimal Guest House identity and request record only; no Supabase Auth user, password, profile, membership, stay, or product-access grant is created.
- Adds the token-gated `/guest-house/replay/` room for signed-out audio/video streaming and private downloads.
- Stores only a SHA-256 hash of each 256-bit room key and removes the raw key from the visible address bar after entry.
- Serves replay media through private Storage and 15-minute signed URLs; no Guest House table or bucket access is granted directly to anonymous or authenticated browser roles.
- Adds an owner-only **Flowtel Guest House** queue to Concierge with request details, private owner notes, statuses, access history, and existing-member recognition without membership changes.
- Supports private MP4/MOV/M4V/WEBM/MP3/WAV/M4A/AAC/OGG uploads up to 2 GB, with resumable 6 MB chunks for files over 6 MB.
- Supports multiple replay files, guest-visible titles and notes, owner downloads, and safe removal of a mistaken file from the room without deleting its preserved record.
- Adds 30-, 60-, 90-, 180-, and 365-day revocable Replay Room keys; replacement keys invalidate prior links.
- Adds copy-link delivery and optional Resend invitation email while never attaching the recording to email.
- Invites women into the Queendom from both the request page and Replay Room without making membership a condition of receiving their replay.
- Adds append-only Guest House delivery events for requests, status changes, uploads, safe removals, room-key changes, room opens, playback, downloads, and invitations.
- Adds Supabase migration 048 and the private `flowtel-guest-house-replays` bucket. Migration 037 remains retired and must not be rerun.
- Preserves Flowtel v0.10.57 Hourly Flow Rate, all established Flowtel boundaries, and integrated Caddie Magic v0.4.5.

## v0.10.57 — Hourly Flow Rate MVP

- Adds the private Flow FM **Hourly Flow Rate** experience at `/flow-fm/hourly-flow-rate/`.
- Begins with one preserved future four-season cycle calculated from Flowtel Time (`America/Los_Angeles`) and highlights the next upcoming season without forcing completion order.
- Opens with **Your Seasonal Sovereignty Map** and does not show a `$0/hour` judgment before a valid monetary amount is saved.
- Activates **Your Emerging Hourly Flow Rate** after the first valid seasonal or Home Base cost.
- Implements the fixed teaching formula: Annual Home Base = monthly Home Base Number × 12; Annual Vision Total = Home Base + seasonal costs; Base Rate = Annual Vision Total ÷ 480; Hourly Flow Rate = Base Rate × 2.
- Keeps the 480-hour denominator and 2x Flow Multiplier fixed and non-editable.
- Preserves the current Home Base underneath seasonal freedom rather than netting one life against the other.
- Adds independent destination, lodging, nourishment, sovereign self-care, seasonal transition, pleasure/support, Home Base, and private witnessing saves.
- Supports both simple estimates and detailed builds; detailed optional-layer entries carry the calculation while the earlier estimate remains preserved.
- Uses one locked base currency after money begins flowing and preserves optional original amount/currency pairs without live exchange rates.
- Adds a meaningful append-only **Receiving Timeline** that records rate-changing saves rather than keystrokes.
- Adds private member-owned RLS tables and authenticated RPCs through migration 047; no public comparison, booking, scraping, bank connection, tax calculation, or AI pricing behavior is introduced.
- Adds an Hourly Flow Rate doorway to the Flow FM Initiation Hall and top navigation while keeping the wider 13-Moon curriculum beta seal intact.
- Restores the missing shared Flow FM rollout module and repairs the malformed Moon Portal import so current Flow FM routes can load without opening sealed curriculum areas.
- Preserves the newer integrated Caddie Magic v0.4.5 source found in the newest uploaded combined ZIP and passes the canonical Caddie Magic validator.
- Adds Supabase migration 047. Migration 037 remains retired and must not be rerun.

## Caddie Magic v0.4.5 — Compass Query + Medicine Wheel Hotfix

- Fixed the Caddie Compass failing for owner/admin sessions with `JSON object requested, multiple (or no) rows returned`.
- Scoped **My Caddie Compass** queries to the currently authenticated user instead of every active Compass visible to an owner/admin through RLS.
- Added deterministic newest-version ordering to player and admin Compass lookups.
- Reduced the direction-labeled wooden wheel artwork to 78% inside the Moon Score Data wheel.
- Returned the 28 Moon Day buttons to an outer 45% ring so they no longer overlap the wheel handles or cardinal-direction labels.
- Bumped Caddie Magic browser cache versions to v0.4.5.
- No Supabase migration required.

## Caddie Magic v0.4.4 — Verified Portal Update + Mobile Route Repair

- Rebuilt the requested update set from the latest integrated `flowtel-v4(38).zip` rather than the older Caddie-only base.
- Added explicit Vercel rewrites for Compass, Compass Admin, Score Map, Locker Room, and printable Score Map routes to prevent nested-route JSON responses on mobile.
- Added no-cache beta headers for Caddie Magic and manager routes so deployed HTML and JavaScript do not remain visually stuck on an older release.
- Corrected the wooden-wheel assets: the Moon Score Data wheel now uses the transparent direction-labeled image, while Score Map, Locker Room, and Compass centers use the transparent unlabeled image.
- Removed the **Download Score Map Exercise** button.
- Added the 28-day Pattern Insights gate and daily-tracking encouragement.
- Added authoritative exact-event language for New Moon, First Quarter Moon, Full Moon, and Last Quarter Moon while preserving multi-day **Phase** labels on all other dates.
- Rebuilt the owner Upcoming Golf calendar as a moon-to-moon calendar beginning on New Moon and titled with the 13 Moons curriculum name.
- Added `MON 00` Gregorian date labels, Moon Day numbers, and the four exact lunar-event markers.
- Added direct **Reply to Message** access from the Concierge Desk and anchored the player admin page directly to Messages.
- Kept Messages unavailable until a player submits the Caddie Compass and made the sequence explicit.
- Expanded the Player Profile snapshot with direct Assignments, Messages, and Calendar cards.
- Added the player’s corresponding cardinal club beneath the current Moon Phase without changing the snapshot-card size.
- Matched Score Map mobile segmented controls to the Locker Room layout.
- No Supabase migration required.

## v0.10.56 — Admin Team Map + Flowtel Honors + Priestess Mailbox

- Adds an owner-only **28-Day Team Map** to the Concierge Desk for eligible team members who checked in during the last 28 Flowtel Days.
- Shows each member’s photo, canonical display name, calculated cycle day/Inner Season, last check-in, current connected clients, and an Upcoming Calls placeholder for future calendar integration.
- Keeps the member-facing Team Map limited to today and preserves the public-safe Queendom boundary.
- Adds an append-only **Flowtel Honors** ledger visible in Concierge with automatic 77% practitioner payout, 23% Flowtel share, and Honors points equal to the 23% share.
- Adds manual bonuses, adjustments, direct-line entries, redemptions, balances, lifetime totals, source references, and redemption safeguards.
- Adds a private bi-directional **Priestess Audio Mailbox** for MP3/WAV/M4A/AAC/OGG handoffs up to 250 MB.
- Lets Megan download and mark original audio received, then return edited or music-backed audio through the same preserved private thread.
- Compacts the Profile Studio hero, removes the **PROFILE STUDIO** eyebrow, and uses **You can return and refine this profile as often as your medicine evolves.**
- Replaces raw timezone strings with a dynamic two-line format such as **Pacific Daylight Time** and **Current time: 3:42 PM (PDT)**.
- Adds Supabase migration 046. Migration 037 remains retired and must not be rerun.
- Preserves all integrated Caddie Magic v0.4.2 work from the uploaded v37 source.

## Caddie Magic v0.4.2 — Player Invitation Code Hotfix

- Fixed **Create Player Invite** failing with `function gen_random_bytes(integer) does not exist`.
- Replaced the invitation-code generator with a schema-independent UUID-based generator.
- Added migration 045 for Supabase projects where migration 044 was already installed.
- Corrected migration 044 as well so fresh installations do not reproduce the error.
- Preserved existing invitations, Player-Only Access, Flowtel access boundaries, and all Caddie Magic data.

## Caddie Magic v0.4.1 — Player-Only Access + Phase Language

- Added an explicit shared product-access registry with `player`, Flowtel, Caddie Magic, owner, and admin boundaries.
- Added true Player-Only Access: Caddie Magic enabled, Flowtel disabled.
- Added restrictive database policies to the core Flowtel and Caddie Magic tables.
- Prevented Caddie-only accounts from self-creating a Flowtel profile through the Flowtel doorway.
- Added private-beta player invitations tied to an email and personal invitation code.
- Added a **Caddie Players** queue to the Concierge Desk for invitations, activation status, invite revocation, and beta-access management.
- Added automatic invitation claiming for new auth users and a claim path for existing Flowtel auth users.
- Updated map and Compass language to **First Quarter Phase** and **Last Quarter Phase** to preserve the distinction between phase spans and exact moon events.
- Audited `flowtel-v4(36).zip` against v0.4.0; application files were intact, but migration 043 was missing and has been restored.
- Added Caddie Magic file, migration, and phase-language manifests plus `scripts/validate-caddie-magic.mjs`.
- Added migration 044.

## v0.10.55 — Priestess Profile Studio Elevation + Moonbox Beta Hold

- Removes the guest-facing **Enter The Moonbox** entrance from the Suite.
- Removes the Moonbox card and entrance from the Flowtel Lounge while preserving the route, migration 042, privacy boundary, and stored Moonbox data behind the scenes.
- Removes the oversized **Your Queendom** hero, side pillars, emblem, and mantra from the Priestess Profile Studio.
- Changes **Choose your doorway.** to **YOUR PRIESTESS PROFILE**.
- Elevates the editor with a quieter header, refined spacing, cleaner form and preview surfaces, softer shadows, and a sticky desktop preview.
- Replaces repeated doorway language with **PROFILE DETAILS**, **Shape how you are seen.**, and **Choose your profile photo.**
- Preserves Profile Studio save/submit/photo/external-link behavior, canonical `display_name`, legal-name privacy, Team Map integration, and all established Flowtel systems.
- No Supabase migration required. Migration 037 remains retired and must not be rerun.

## v0.10.54 — The Moonbox

- Adds `/moonbox/` as a separate authenticated Flowtel room for unsent letters to lovers and other masculines.
- Adds **SEND TO THE MOON** for anonymous collective sharing and **KEEP BETWEEN ME & THE MOON** for private storage.
- Adds a private **My Moonbox** archive containing both private and collectively shared letters.
- Adds the authenticated **Collective Moonbox**, which exposes only message text, broad relationship archetype, Flowtel date, moon phase, and Inner Season context.
- Withholds author IDs, names, emails, profile data, exact timestamps, cycle days, stay IDs, reflections, and relationship data from collective readers.
- Adds silent **I WITNESS YOU** acknowledgements with one anonymous witness per member and no comments, threads, or direct messages.
- Blocks collective submission in both the browser and authenticated RPC when phone numbers, emails, links, or social handles are detected, while still allowing the unedited letter to be kept private.
- Adds direct **Enter The Moonbox** doorways from the Suite and Flowtel Lounge.
- Keeps the Moonbox separate from the Powder Rooms and Flow Map and does not change their storage, consent, or anonymous-sharing behavior.
- Adds Supabase migration 042. Migration 037 remains retired and must not be rerun.

## v0.10.53 — Unread Concierge Notes + Profile Button Polish

- Carries unread Concierge notes into the guest’s current Suite across Flowtel Days without copying or moving them from their original stays.
- Shows multiple historical unread notes oldest-first and keeps their original author/date context.
- Marks each note received by updating the read signature and timestamp on its original stay.
- Preserves current-day Concierge-note, available Concierge, and pending Turndown states alongside carried notes.
- Adds authenticated member-owned RPCs for unread-note retrieval and original-stay receipt updates.
- Hardens migration 041 to safely create missing Concierge read-signature/read-timestamp columns before its index and RPC definitions.
- Makes the Lounge **Open Profile View** button full-width and removes its 320px maximum-width treatment.
- Changes authenticated and embedded Team Map external-profile buttons to **VIEW PROFILE** while preserving **Add My Profile Link** for the signed-in member with no URL.
- Preserves Flowtel Time, one-stay-per-day behavior, append-only history, passwords, sessions, display-name identity, Concierge permissions/routing, Team Map privacy/membership, mentor logic, Powder Room privacy, Medicine Wheel geometry, and cycle-day logic.
- Adds Supabase migration 041. Migration 037 remains retired and must not be rerun.

## v0.10.52 — Priestess Identity + Display Name Sync

- Added separate **Legal First Name**, **Legal Last Name**, and **Priestess Display Name** fields to Profile Studio.
- Stores legal names privately in `profiles.first_name` and `profiles.last_name`.
- Adds `profiles.display_name` as the canonical name shown throughout the Flowtel.
- Synchronizes the chosen display name with the Priestess Profile record and Supabase Auth metadata.
- Updates Suite greetings, Team Map, Concierge Desk, mentor/client cards, Flow Map data, review queues, and future Turndown attribution to resolve the display name first.
- Preserves existing member passwords, sessions, stays, profile photos, external links, and Priestess Profile content.
- Backfills display names from the existing Priestess Profile name before falling back to legal names or email.
- Keeps legal-name values out of another member's Profile Studio view.
- Straightened the embedded Team Map portrait rings with a fixed concentric portrait frame.
- Adds Supabase migration 040.

## v0.10.51 — Lounge Profile Pill Polish

- Restyled the Lounge **Priestess Profile** card to match the clean white hospitality cards used elsewhere on the Lounge page.
- Removed the warm gold gradient treatment from the Priestess Profile card.
- Removed the **Living Map** card from the Lounge.
- Kept Team Map access available from the Suite only.
- No Supabase migration required.

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
