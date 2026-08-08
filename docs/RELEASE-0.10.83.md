# Flowtel v0.10.83 — The Flowtel Calendar

Release date: August 7, 2026

## Purpose

This release makes Flowtel the operational calendar for Womb Magic and the Queendom. A Priestess can translate her Inner Season Availability into real upcoming dates, the owner can review submitted changes before mirroring them into Acuity, members can discover and save community events, and one canonical Queendom event record now powers the Lounge, **My Calendar**, a visual master calendar, and a sanitized Squarespace embed.

The release deliberately keeps the current system boundaries clear:

- **Acuity** remains the source of real bookable Womb Magic appointment times.
- **Flowtel Availability** remains a Priestess planning/submission layer; v0.10.83 does not write Availability directly into Acuity.
- **Zoom** remains the meeting host.
- Personal Womb Magic appointments remain private and never appear on the public/master Queendom event calendar.

## Womb Magic polish

### Consent form alignment

The Womb Magic consent row now uses one left-aligned content grid on desktop and mobile. The checkbox sits directly beside the consent language and follows the same visual edge as the phone field and booking action.

No consent language or booking rules change.

### Client Zoom doorway

The member-facing appointment action is renamed from **ENTER WOMB MAGIC** to **JOIN ZOOM**.

The Priestess-facing **BEGIN WOMB MAGIC** action remains unchanged.

All v0.10.82 Zoom URL extraction, Acuity refresh, cancellation, and appointment-scoped permission rules remain in place.

## Upcoming Calls — assigned Priestess visibility

The existing provider scope is preserved:

- a regular Priestess sees only calls assigned to herself;
- Owner/Admin retains the full upcoming Womb Magic calendar.

Owner-wide call cards now include **Held by [Priestess]** so the owner can distinguish the client from the Priestess holding each appointment.

Migration 067 updates `flowtel_list_my_upcoming_service_calls()` only to add the assigned provider identity to its return shape; it deliberately preserves the existing owner/provider predicate.

## Cycle-aware monthly Availability

The existing Inner Season Availability room remains the source of each Priestess's recurring weekly rhythm. A new monthly calendar translates that rhythm onto real dates.

### Projection model

Flowtel uses the member's latest cycle anchor and the established 28-day planning map:

- Inner Winter — days 27–5
- Inner Spring — days 6–11
- Inner Summer — days 12–19
- Inner Autumn — days 20–26

When a current `cycle_start_date` exists, it is the preferred planning anchor. Otherwise Flowtel derives an anchor from the latest check-in/cycle day when possible. If neither exists, the current Flowtel date becomes a planning reference.

This is a **planning projection**, not a promise about the member's future biology. The Priestess can correct real-life exceptions date by date.

### Monthly calendar

- Opens on the current month and supports the current month through the next 12 months.
- Uses a Monday–Sunday calendar layout modeled on the operational clarity of Acuity.
- Shows the projected Inner Season and exact local-time Availability windows on each date.
- Past dates are read-only.
- A draft month refreshes non-overridden dates from the currently saved Inner Season rhythm.

### Date-specific edits

A Priestess may open any future date and:

- change the available hours;
- add multiple windows;
- make the date unavailable;
- add Availability where the recurring rhythm normally has none; or
- restore that date to the projected Inner Season rhythm.

A date-specific change is stored as an **EDITED** override and never changes the underlying recurring Inner Season template.

### Submit to the owner

A monthly calendar begins as **DRAFT**. When the Priestess presses **Submit [Month] Availability**:

1. the month becomes Submitted;
2. an owner Acuity-update alert is created;
3. the owner sees the exact submitted month under the Availability **ACUITY UPDATE QUEUE**;
4. edited dates are visibly marked;
5. the owner manually reflects the change in Acuity; and
6. the owner presses **MARK UPDATED IN ACUITY**.

If the Priestess changes any date after submission, the owner acknowledgement is cleared automatically and the Acuity-update alert reopens.

A submitted month is intentionally treated as an operational snapshot. Changing the recurring Inner Season template later does not silently rewrite an already-submitted month; date changes may still be made explicitly and will reopen the owner alert.

## Upcoming Events in the Queendom

The Lounge now includes **UPCOMING EVENTS IN THE QUEENDOM**.

One published community event may be one of:

- Ceremony
- Workshop
- Call
- Other

Each event includes a date, local start/end time, timezone, host, description, audience, optional artwork, and optional manually supplied Zoom link/passcode.

### Audience behavior

Events may be marked **Queendom** or **Flow FM**.

All signed-in Queendom members can see all published events, including Flow FM events. This lets Queendom members see what is happening inside Flow FM without receiving protected access.

Membership controls the Zoom doorway:

- Queendom event + Queendom member → eligible to join;
- Flow FM event + Queendom-only member → visible, but locked;
- Flow FM event + Flow FM/Council member → eligible to join.

The normal event feeds return only a `zoom_ready` state. They never return the Zoom URL or passcode. The protected `flowtel_get_queendom_event_join_details()` RPC releases credentials only after rechecking the signed-in member's Flowtel access and event audience entitlement.

## Save My Seat

Eligible members may press **SAVE MY SEAT** with one click. Flowtel already knows the signed-in member, so no duplicate name/email form is required.

Registration is intentionally lightweight:

- **membership controls access**;
- **registration controls commitment and My Calendar**.

An eligible member who did not register is still allowed to join the event. A Queendom-only member cannot register for a Flow FM-exclusive event because she is not yet entitled to that experience.

Registration history is preserved with soft cancellation rather than destructive deletion.

## My Calendar

The Lounge now includes **MY CALENDAR**.

It combines:

- the member's active personal Womb Magic appointment; and
- future Queendom/Flow FM events for which she has saved her seat.

A personal Womb Magic call uses its existing secure Acuity/Zoom appointment doorway. Community events use the protected Queendom Event join RPC.

Personal service appointments never enter the master/public community event feed.

## The Queendom Calendar

New route:

`/queendom-calendar/`

The calendar uses the same canonical community event records as the Lounge. Desktop uses a Monday–Sunday month grid with event artwork inside the date cells. Mobile collapses the event-bearing dates into readable visual cards rather than squeezing artwork into tiny columns.

Members can open an event to see its details, save their seat when eligible, and join Zoom when entitled.

## Squarespace embed

A sanitized embed mode is available at:

`/queendom-calendar/?embed=1`

The embed deliberately uses the anonymous-safe public event feed. It can show published event artwork, title, type, audience, date/time, host, description, and cancelled state, but it receives:

- no Zoom URL;
- no Zoom passcode;
- no member identity;
- no registration state; and
- no private Womb Magic appointments.

The Flowtel deployment URL can therefore be placed in a Squarespace iframe/code block without exposing protected meeting credentials. Changes made once in Flowtel automatically change the embedded calendar because both views read the same event record.

## Owner event administration

New route:

`/manager/events/`

Owner/Admin can:

- create an event;
- choose Ceremony, Workshop, Call, or Other;
- choose Queendom or Flow FM audience;
- set event date, local time, timezone, host, and description;
- enter a manual Zoom link and passcode;
- upload one JPG, PNG, or WebP calendar image up to 10 MB;
- save as Draft;
- Publish; and
- Cancel a published event.

Cancelled events remain in history and remain visible as Cancelled to members who saved them. The admin editor treats cancelled events as read-only and migration 067 prevents a cancelled event from being silently republished through the save RPC.

The new public Storage bucket is used only for event artwork. Upload/update/delete is limited to signed-in Flowtel Owner/Admin roles. Meeting credentials are stored only in the protected event table and are not present in Storage metadata or public calendar RPCs.

## Database

Run exactly:

`database/migration-067-flowtel-calendar.sql`

Migration 067 adds:

- `flowtel_flow_fm_availability_months`
- `flowtel_flow_fm_availability_month_days`
- `flowtel_flow_fm_availability_month_windows`
- monthly Availability member/owner RPCs
- the assigned-provider columns on `flowtel_list_my_upcoming_service_calls()`
- `flowtel_queendom_events`
- `flowtel_queendom_event_registrations`
- protected member/admin event RPCs
- the sanitized public event feed
- `flowtel-queendom-event-images` Storage bucket and Owner/Admin write policies

**Migration 066 must already be live** because it contains the existing coordinated Flowtel/Caddie Acuity scheduling foundation. Do not rename or rerun either historical migration 052 file.

## Environment

No new Vercel environment variables are required.

Existing Acuity variables remain unchanged:

- `ACUITY_USER_ID`
- `ACUITY_API_KEY`

No Zoom API credentials are added. Group-event Zoom links are entered manually by Flowtel administration; personal Womb Magic Zoom rooms continue to arrive through Acuity.

## Caddie Magic

Caddie Magic remains **v0.6.0**.

No Caddie Magic product, Player, Caddie, pairings, scheduling, score, Compass, or permission behavior is changed by this release. The shared Caddie regression validator is updated only to recognize the coordinated Flowtel manager loader at v0.10.83.

## Validation completed before packaging

- `node --check` on every changed/new JavaScript file.
- Flowtel v0.10.83 calendar static validator.
- Flowtel v0.10.83 calendar behavior checks.
- Existing Acuity/Womb Magic behavior checks.
- Existing Caddie Magic v0.6.0 regression validator.
- `git diff --check`.
- `vercel.json` JSON parse validation.
- ZIP integrity checks after packaging.

Static/source validation is not a substitute for live Supabase, Acuity, Zoom, or Squarespace verification.

## First live test checklist

### Migration and Womb Magic

1. Confirm migration 066 is already live.
2. Run `database/migration-067-flowtel-calendar.sql` once.
3. Book a Womb Magic call as a Queendom member and verify the client action says **JOIN ZOOM**.
4. Confirm the consent checkbox/text is aligned on desktop and mobile and booking consent still functions.
5. Open Upcoming Calls as the booked Priestess and verify she sees her own call with **BEGIN WOMB MAGIC**.
6. Open Upcoming Calls as Owner/Admin and verify all calls remain visible and every card identifies **Held by [Priestess]**.

### Availability

7. Open Availability as a Flow FM Priestess with saved Inner Season rhythms and cycle data.
8. Confirm the current month maps expected Inner Seasons and weekday time windows onto real dates.
9. Edit one future date, save it, and confirm it displays **EDITED** without changing the recurring seasonal rhythm.
10. Restore the date to its seasonal rhythm.
11. Submit the month.
12. As Owner, confirm the Availability card shows an Acuity alert and `/manager/availability/` shows the submitted month in the **ACUITY UPDATE QUEUE**.
13. Press **MARK UPDATED IN ACUITY** and confirm the alert clears.
14. Change a date after submission and confirm the owner alert reopens.

### Queendom events and security

15. As Owner/Admin, open `/manager/events/`, create a Queendom event with image + Zoom credentials, and Publish it.
16. Confirm it appears in the Lounge and `/queendom-calendar/` with the same image and details.
17. Save the seat as an eligible member and verify the event appears in **MY CALENDAR**.
18. Confirm **JOIN ZOOM** works even for an eligible member who did not save a seat.
19. Create and Publish a Flow FM event with Zoom credentials.
20. As a Queendom-only member, verify the Flow FM event is visible but there is no Join Zoom action and no ability to save a seat.
21. As a Flow FM member, verify the same event permits Save My Seat and Join Zoom.
22. Cancel a published event and confirm it remains visible as Cancelled to a member who previously saved it.
23. Open `/queendom-calendar/?embed=1` while signed out and confirm the public calendar renders artwork/details but offers no Zoom credential or registration UI.
24. Embed the deployed `.../queendom-calendar/?embed=1` URL in Squarespace and confirm a Flowtel event edit appears there without maintaining a second calendar.
25. Confirm the member's personal Womb Magic appointment appears in **MY CALENDAR** but never appears on the master/public Queendom Calendar.
26. Run the Caddie Magic v0.6.0 smoke test and confirm its product boundaries remain intact.
