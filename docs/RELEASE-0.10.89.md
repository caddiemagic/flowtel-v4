# Flowtel v0.10.89 — Multi-Session Event Series + Acuity Group Enrollment

## Release purpose

This release extends the existing Queendom Calendar so one Flowtel event may contain multiple scheduled gatherings while preserving **one canonical event, one Flowtel registration, and one protected Event Room**.

The first intended use is **Womb Magic Committee**, a four-week Queendom group vortex. The implementation is generic so the same foundation can later support multi-week committees, classes, book clubs, initiations, and other repeated group gatherings.

This release does **not** replace the private 4-Week Womb Magic Portal. The Portal remains a 1:1 Queendom member → one Flow FM Priestess → four private Acuity appointments product. Event Series is a group-event capability inside the Queendom Calendar.

## Ownership boundary

The release deliberately keeps the existing service boundaries:

- **Flowtel owns** eligibility, payment/access state, the parent event, one member registration, the session itinerary, protected Event Room, and the member-facing Zoom doorway.
- **Acuity owns** the group class series, class capacity, the member's Acuity enrollment, and the confirmation/reminder emails configured in Acuity.
- **Zoom hosts** the live gathering; Flowtel exposes the member's protected Acuity-provided meeting URL only after event entitlement + registration are confirmed.

Flowtel does not create a second scheduling database and does not attempt to create an Acuity series definition through the API. The Owner creates the group series and reminder templates in Acuity first, then maps that existing series in Flowtel Event Administration.

## Owner Event Administration

The existing Owner Event Manager now supports:

- **Single Event** or **Multi-Session Series**;
- 2–12 sessions;
- a repeat interval in days (weekly = 7 days);
- a preview of all generated Flowtel session dates;
- mapping to an active Acuity appointment type whose type is `series`;
- mapping to an Acuity calendar on which that series is offered.

For a new published series, Flowtel stages the parent event safely as a draft, creates the occurrence layer, then publishes the event. Existing single-day events keep their current behavior.

Once an Acuity series has pending/active member enrollment, the schedule, session count/cadence, and Acuity mapping are locked against casual edits. Content such as title, description, hosts, artwork, and preparation copy may still be edited.

## Member registration

A member joins the vortex **once**.

The existing `flowtel_queendom_event_registrations` record remains the canonical Flowtel seat. After Flowtel verifies the existing event entitlement boundary, the existing `/api/acuity.js` function:

1. validates the mapped Acuity type is a true `series`;
2. validates its selected calendar;
3. searches Acuity first for an existing matching member enrollment;
4. validates the first mapped class offering through `/availability/classes` before a new booking;
5. creates the Acuity client booking only when no existing enrollment evidence exists;
6. leaves normal Acuity email behavior enabled so the Owner's configured confirmation/reminder emails can send;
7. maps the member's resulting Acuity appointments back to the Flowtel session occurrences.

The pre-booking Acuity search is intentional idempotency protection. If Acuity accepted a prior request but the browser lost its response, a return/refresh should synchronize the existing appointments rather than create a duplicate series enrollment.

If Acuity definitively rejects a booking, the local enrollment is marked `failed` rather than being left as a permanently locked pending row. The member's Flowtel event registration is preserved so the doorway may be retried after the Acuity setup is corrected.

## Session doorway + My Upcoming Events

A registered series remains one card in **My Upcoming Events** through the final gathering.

The member sees:

- the full date range;
- a `4-WEEK VORTEX` or `N-SESSION SERIES` label;
- the next session number automatically;
- all session dates/times in the protected Event Room;
- Flowtel Time and her saved local time;
- the current session's protected **JOIN ZOOM · SESSION X** doorway when Acuity provides it.

The normal within-one-hour Flowtel event alert now evaluates every occurrence rather than only the parent event's first date.

The full Queendom agenda and month calendar also understand occurrences. The agenda presents one parent vortex; the month calendar can place each occurrence on its actual date while every tile still points to the same parent registration and Event Room.

## Add to Calendar

For registered multi-session events:

- **Apple / Outlook** downloads one `.ics` containing all series occurrences as separate `VEVENT` entries;
- **Google** opens the next upcoming session because the Google Calendar template URL represents one event at a time.

Calendar descriptions direct the member back to **My Upcoming Events** rather than exposing protected Zoom credentials.

## Acuity email reminders

Acuity remains responsible for the reminder schedule for this release. Flowtel does not add a cron, Twilio task, or second reminder engine.

For Womb Magic Committee, configure the desired reminder emails in Acuity on the mapped series before publishing in Flowtel. Recommended copy should direct women back to My Upcoming Events / the Flowtel rather than putting protected Zoom passcodes into routine reminders.

The booking request intentionally does **not** use Acuity's `noEmail=true` option.

## Webhook synchronization

The existing `api/acuity-webhook.js` function now recognizes event-series appointments in addition to the existing Womb Magic / Caddie appointment flow.

It can:

- update a known occurrence appointment by Acuity appointment ID;
- associate a newly observed series appointment to the correct Flowtel event occurrence using mapped appointment type + calendar + session time + exact normalized registered-member email;
- refresh the protected Zoom URL;
- mark occurrence state scheduled / rescheduled / cancelled;
- update the parent enrollment state when all sessions are synchronized or cancelled.

The existing Womb Magic and Caddie webhook behavior remains in place after the series matching path.

## Cancellation / leaving a vortex

A member cannot casually "unsave" a series after Acuity enrollment is pending/active. Doing so would leave the Acuity class seat and reminder emails alive while Flowtel claimed she had left. The member is instead directed to the Front Desk for an operational cancellation.

Likewise, an Owner cannot mark an enrolled Flowtel series cancelled while Acuity still has pending/active enrollments. Cancel the class series / enrolled appointments in Acuity first. The existing Acuity webhook should move the Flowtel session enrollments to cancelled; then cancel the parent Flowtel event.

This guard is intentional until Flowtel has a deliberately designed group-series cancellation workflow.

## Database

Run:

`database/migration-075-queendom-multi-session-event-series.sql`

Migration 075:

- extends the existing parent event with series metadata;
- creates child occurrence rows;
- creates private series enrollment + occurrence enrollment/sync tables;
- keeps those operational tables RPC/server-only with RLS and revoked browser table grants;
- replaces the existing event list/public/registration/join/admin RPCs only to extend them with series-aware behavior while preserving the v0.10.85 event access boundary;
- adds schedule/mapping locks after enrollment;
- preserves public/private Event Room separation.

After this release, migration **075** is latest and **076** is next.

## Vercel function budget

No serverless function is added.

The release extends:

- `api/acuity.js`
- `api/acuity-webhook.js`

Flowtel remains at **12 / 12 Vercel Hobby serverless functions**.

## Deployment order

1. Start from v0.10.88.1 / GitHub `main` HEAD `ecd951e858b2152a43998910c8cd83debd8203f9`.
2. In Acuity, create the intended group class **series**, all session dates, Zoom integration/location, capacity, and reminder emails.
3. Run migration **075** in Supabase once.
4. Deploy the v0.10.89 source.
5. Open Owner → Queendom Events and map the Flowtel multi-session event to the existing Acuity series + calendar.
6. Publish only after the Flowtel date/time preview matches the Acuity series.
7. Perform the first-live-test checklist in `docs/LIVE-TEST-0.10.89.md`.

Do not deploy the source before migration 075; the v0.10.89 Event Manager calls the new series configuration RPC even when preserving a single event.

## Source validation vs production verification

Source validators can verify the access boundaries, recurrence structure, no-13th-function constraint, and browser/server wiring. They cannot prove that the Owner's live Acuity series, reminders, Zoom integration, Supabase migration, and production environment are configured correctly.

The first real member enrollment is therefore a required production verification step before calling Womb Magic Committee fully live-verified.

## Validation performed

Source validation for this release includes:

- `node --check` for all 12 `api/*.js` functions;
- `node --check` for changed member/admin/shared browser JavaScript;
- `node scripts/validate-flowtel-01089-event-series.mjs`;
- `node scripts/validate-flowtel-complimentary-stay.mjs`;
- canonical Flowtel entry validator;
- event-access beta-exit validator;
- member-integrity validator;
- 4-Week Womb Magic Portal validator;
- Acuity Womb Magic validator;
- Personal Cosmology storage hotfix validator;
- Womb Magic recording-consent validator;
- My Upcoming Events validator;
- current calendar-polish / artwork-time / navigation validators;
- canonical Caddie Magic v0.6.0 validator;
- `node scripts/validate-vercel-function-budget.js` → 12/12;
- relevant event / My Upcoming Events / Acuity / Caddie behavior test scripts;
- `git diff --check`.

Known historical validator drift remains deliberately unresolved in this feature release:

1. `validate-guest-house.mjs` — stale Concierge dynamic-loader cache-bust assertion;
2. `validate-queendom-beta-launch-readiness.mjs` — stale My Profile cache-key assertion;
3. `validate-flowtel-010813-caddie-060.mjs` — stale historical Acuity bridge version assertion;
4. `validate-moon-mail-personal-cosmology.mjs` — stale exact `/moon-mail` rewrite destination assertion;
5. `validate-flowtel-calendar.mjs` — an additional pre-existing historical assertion expecting Upcoming Calls `page.js?v=0.10.83`, while the v0.10.88.1 source already correctly uses the newer Womb Magic Portal-era asset version.

The focused current calendar validators pass. Do not roll current working behavior backward solely to satisfy these old static version assertions.
