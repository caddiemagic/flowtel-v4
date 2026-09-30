# Flowtel Roadmap

Updated: September 30, 2026

This roadmap records intentional future work without making unfinished ideas part of the current live release contract. Source code and current release notes remain authoritative for shipped behavior.

## Current — v0.10.91.2 Mobile Event Experience Polish

v0.10.91.2 is the launch-critical mobile event repair rather than a full mobile redesign. Calendar preview/month tiles now have native event links and can open preview events outside the displayed month; mobile event sheets are compact and vertically stacked; claimed-seat styling is consistent; ENTER GATHERING hands off to the full protected Event Room; protected Zoom entry is resilient to mobile popup blocking; event artwork preserves the full uploaded graphic across member-facing event surfaces; and Lounge/My Upcoming Events uses equal-width, stacked mobile actions. No migration is required; migration **078** remains latest and **079** remains next. Vercel remains 12/12.

### Previous — v0.10.91.1 Event Claim Conversion Flow

v0.10.91.1 turns the compact next-three-gatherings preview into a conversion surface. Eligible signed-in members can claim the exact preview occurrence immediately; signed-out visitors choose between entering Flowtel and joining the Queendom; signed-in nonmembers route to the canonical Queendom signup. Exact recurring-occurrence context survives the v0.10.91 login/automatic-provisioning invitation flow so a selected Monday remains the selected Monday after authentication.

### Previous — v0.10.91 Automatic Queendom Provisioning + Member Reconciliation

v0.10.91 removes the second manual Flowtel signup for paid Queendom / Flow FM members. Squarespace remains the current Pricing Plan/billing authority; after exact-email Contact + PAID mapped-order verification, Flowtel reuses the existing Auth UUID or sends a Supabase invite for a missing identity, then applies membership server-side without lowering rank or replacing history. Owner Administration gains a paid-member reconciliation room for legacy members. Migration **078** is this release boundary; **079** is next. Vercel remains 12/12.

### Previous — v0.10.90.3 Event Experience Polish

v0.10.90.3 finishes the member-facing event experience after the v0.10.90.2 lifecycle work. Registered Recurring Event rooms are occurrence-specific and include exact-occurrence **UNCLAIM MY SEAT**; claimed-seat copy is simplified; The Queendom Calendar gains a compact next-three-gatherings snapshot; and the Lounge opens directly on **MY UPCOMING EVENTS** with one **VIEW ALL UPCOMING EVENTS** doorway. The month-calendar dialog also supports the existing Acuity-first seat-release path. No migration is required; migration **077** remains latest and **078** remains next. Vercel remains 12/12.

### Previous lifecycle hotfix — v0.10.90.2

v0.10.90.2 closes the first live event-lifecycle gaps on top of v0.10.90.1. Cancelled events are removed from public/member calendar feeds; members can **UNCLAIM MY SEAT** with Acuity cancellation first; and Owner/Admin can permanently delete Draft/Cancelled events after active Acuity seats are cleared. Migration **077** is this release boundary and **078** is next.

### Previous hotfix — v0.10.90.1

v0.10.90.1 prevents Series-only session controls from appearing or participating in validation for Single and Recurring events. Its browser-validation repair remains included in v0.10.90.2.

### Foundation — v0.10.90 Cyclical Calendar + Event Operations

v0.10.90 consolidates the unshipped v0.10.89.1 login repair with the next event-operations release. The Queendom Calendar is publicly discoverable while admission remains entitlement-gated. Flowtel now distinguishes Single Event, independent Recurring Event occurrences, and whole-container Series / Vortex enrollment. Owner Event Administration imports/refreshes the mapped Acuity group schedule; Acuity remains the appointment/reminder engine while Flowtel owns discovery, access resolution, registration confirmation, protected entry, and event context.

The release adds the universal **ENTER THE FLOWTEL** reminder doorway, current Flowtel-Day check-in before Zoom entry, attendance snapshots, claimed-seat tracking, the four-chamber Event Flow Map, and automatic New / Half Full / Full / Half New Moon calendar markers. Migration **076** is the release database boundary. Vercel remains **12/12** serverless functions. Caddie Magic remains **v0.6.0** and Player-first.

### Priority 0 — v0.10.91.2 launch verification

Verify the mobile calendar, Event Room, protected Zoom doorway, Lounge/My Upcoming Events stacking, equal action sizing, and non-cropping event artwork on real phones. Keep v0.10.91 automatic provisioning/reconciliation and the recurring-event/Acuity regression in the same launch checklist. Source validation does not replace production verification.

### Deferred post-launch — Full Mobile Experience Redesign

Reorganize Flowtel mobile as an intentional information architecture rather than continuing to compress desktop surfaces. Revisit the mobile hierarchy across **Suite → Lounge → Calendar → Event Room**, establish a consistent card/sheet/navigation system, reduce above-the-fold density, and decide which hospitality actions deserve primary placement on small screens. Preserve the current launch-safe mobile behaviors while redesigning the system as a whole.

### Next planned functional release — v0.10.92 Cycle Restart Correction

Add a member-facing **Return to Previous Cycle** / **Undo Cycle Restart** correction for an accidental confirmed cycle restart. Preserve the mistaken restart and correction in history/audit context; restore the prior cycle anchor and recalculate subsequent cycle progression without requiring the member to remember a historical start date. Keep one Stay per Flowtel Day and append/history principles intact. Migration **079** is next if the cycle-correction release needs database work.

### After that — Front Desk / Concierge Messages

Resume the Flowtel-owned support inbox / Correct Member Email operational work after the cyclical correction unless the owner reprioritizes it.

### Previous foundation — v0.10.89.1 / v0.10.89

The unshipped v0.10.89.1 login isolation fix and the v0.10.89 multi-session foundation are retained inside v0.10.90. v0.10.89.1 removed the Queendom Events module from `/client/` authentication boot and repaired iCalendar escaping; v0.10.89 established migration 075 and the group Series / Vortex contract.

## Previous — v0.10.89.1 Login Doorway Isolation Hotfix

v0.10.89 extends the existing Queendom Calendar with **Multi-Session Series**. One Flowtel parent event now holds a repeatable occurrence itinerary while preserving one canonical member registration. Flowtel owns eligibility, Event Room access, and the protected member-facing Zoom doorway; Acuity owns the existing group-class series, class capacity, enrollment, and configured confirmation/reminder emails. Migration 075 adds the private occurrence/enrollment sync layer. No new Vercel function is added; the project remains at 12/12.

The first intended use is **Womb Magic Committee**, a four-week Queendom group vortex. This group-event series is intentionally separate from the private **4-Week Womb Magic Portal**, which remains one Queendom member → one Flow FM Priestess → four private Womb Magic appointments.

A series is created in Acuity first, including its dates, Zoom/location integration, capacity, and reminder emails. Owner Event Administration then maps the existing Acuity appointment type of `series` + calendar to the Flowtel event. A member joins the Flowtel vortex once; the existing `/api/acuity.js` boundary verifies the mapping, searches Acuity before creating anything, validates the class offering, and enrolls the member without suppressing Acuity email. My Upcoming Events keeps one vortex card visible through the final gathering and advances the protected session doorway automatically.

v0.10.88.1 remains the current Complimentary Stay access foundation beneath this release. The public login separates Queendom-member account creation, the 14-day stay, and joining the Queendom; monthly Womb Magic is visible to active trial guests only as a locked Queendom benefit; and an eligible verified purchase upgrades the same Auth identity. v0.10.88 / migration 074 remains the trial database boundary.

v0.10.87.4 confirmed through live diagnostics that Squarespace Pricing Plan purchases surface as `PAYWALL_PRODUCT` Commerce line items with stable `productId` values. Flow FM is `47815dfc-d06e-45bb-8581-332cdff0fbff`; The Queendom | Feminine Mystery School Portal is `9ebc509d-6678-43d0-9162-df7f4cb505e4`. These IDs remain the server-side paid-membership mapping boundary.

Caddie Magic remains **v0.6.0** and Player-first. Migration **077** is the v0.10.90.2 boundary; **078** is next after it is applied live.

### Carry-forward access verification

Source validation does not replace live production verification. Keep the existing v0.10.88.1 access checks open: first-time paid Queendom / Flow FM signup, Complimentary Stay desktop/mobile UI, Day-15 closure, same-account trial → paid conversion, password recovery actual save, remembered session, Event Pass isolation, refund/revocation, and the full private 4-Week Womb Magic Portal regression.

Also verify v0.10.89 with one real Womb Magic Committee member: the mapped Acuity series exists at the exact first-session time, one Flowtel registration creates/synchronizes the full Acuity series enrollment, Acuity confirmation/reminder emails arrive, every session receives the correct protected Zoom doorway, refresh is idempotent, the event remains in My Upcoming Events through Session 4, and existing single events / monthly Womb Magic / Caddie Magic remain unchanged.

## Deferred Priority — Front Desk / Concierge Messages

Build a Flowtel-owned support inbox rather than making Squarespace Forms the source of truth.

Desired first contract:

- a pre-login **Message the Front Desk** doorway for login/account/event/technical help;
- a logged-in **Front Desk / Concierge Messages** room with thread history and replies;
- Concierge inbox states such as Needs Response / Open / Waiting on Guest / Resolved;
- staff assignment, unread state, and verified-member association after sign-in;
- optional Resend notification that a reply is waiting while the canonical thread remains in Flowtel;
- public-form rate limiting/CAPTCHA;
- no automatic exposure of private cycle, reflection, client, Moon Mail, or Personal Cosmology data to support staff.

## Deferred — Flowtel Messaging + Wake Up Text

### Shared messaging foundation

Preferred messaging provider: Twilio Programmable Messaging, implemented server-side so provider credentials never enter browser code.

The messaging layer should eventually support separate consented use cases rather than one broad all-texts permission:

- Request Wake Up Text;
- saved-event reminders;
- optional Womb Magic appointment reminders.

Each use case must keep its own consent/opt-out state and delivery history.

### Request Wake Up Text

The existing **REQUEST WAKE UP TEXT** action should become a real one-time SMS request.

When a member requests it:

1. Flowtel stores a request for the next local morning;
2. delivery is scheduled for **6:00 AM in that member's saved timezone**;
3. timezone conversion must be DST-aware and use the named timezone rather than a fixed UTC offset;
4. the message is generated near send time from current Flowtel data rather than frozen the night before.

The morning message should include:

- current cycle day;
- current Inner Season;
- current moon day;
- current moon phase;
- one canonical affirmation paired with that Flowtel/cycle day;
- a short doorway back into the member's Flowtel room.

### Affirmation library

Create a canonical **Day 1–28 affirmation library**. Affirmations should be intentionally authored/stored rather than randomly generated on each send.

The library may later become more season-aware, but the first contract should remain deterministic: a defined affirmation for each day.

### International phone support

Store mobile numbers in normalized international/E.164 form and capture country code explicitly in the member experience.

Do not assume one sender configuration works identically in every country. International rollout should be limited to destinations configured and approved in the messaging provider account.

### Consent and safety

- Wake-up texts are explicitly requested by the member and are not automatically enabled from merely providing a phone number.
- Event reminders are a separate opt-in from wake-up texts.
- Store consent timestamp/context and opt-out state.
- Never put private Flowtel cycle data into an SMS unless the member explicitly requested the wake-up message.
- Never place protected Zoom passcodes in routine SMS reminders.

### Delivery model

Flowtel remains the intelligence layer:

`Flowtel data + timezone + consent -> compose message -> messaging provider sends`

Twilio should not become the source of truth for cycle, moon, membership, event, appointment, or consent logic.

### Event reminders later

After My Upcoming Events is stable, an eligible registered member may opt into event reminders, with a restrained initial cadence such as:

- 24 hours before;
- 1 hour before.

The reminder should direct the member back to **My Upcoming Events** rather than exposing a protected Zoom room in the text itself.
