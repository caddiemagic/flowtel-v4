# Flowtel v0.10.90.2 — Event Lifecycle Hotfix

**Release date:** September 30, 2026
**Base source:** v0.10.90.1 — Event Editor Validation Hotfix
**Database:** migration 077 required
**Next migration after deploy:** 078
**Vercel functions:** 12/12 unchanged

## Purpose

Close three lifecycle gaps uncovered during the first live recurring-event setup:

1. cancelled events remained visible in member/public calendars;
2. members could claim a seat but could not safely release it;
3. Owner/Admin could cancel an event but could not permanently remove obsolete/draft/cancelled event records.

## Cancelled event visibility

Migration 077 updates both canonical calendar feeds so only `status='published'` events are returned to public/member discovery.

Cancelled events remain visible in **Owner → Queendom Events** for operational history and optional permanent deletion, but disappear from:

- public Flowtel calendar;
- authenticated Queendom calendar;
- My Upcoming Events after refresh;
- normal protected event-room discovery.

## UNCLAIM MY SEAT

Registered members now receive **UNCLAIM MY SEAT** in the event calendar and My Upcoming Events.

For an Acuity-linked event, Flowtel uses the existing `/api/acuity.js` boundary to:

1. resolve the member/event/occurrence;
2. locate active linked Acuity appointment mappings;
3. cancel the actual Acuity appointment(s);
4. update Flowtel enrollment mappings to `cancelled`;
5. only then cancel the Flowtel registration.

This is fail-closed: if Acuity cancellation fails, Flowtel does not pretend the seat was released.

### Event-format behavior

- **Single Event:** releases the one event seat and linked appointment.
- **Recurring Event:** releases only the selected occurrence; other claimed weeks remain intact.
- **Series / Vortex:** releases the whole container and cancels all active linked series session appointments before closing the parent Flowtel registration.

Paid-ticket entitlement is not deleted when a member unclaims; she may reclaim later if the event remains open and capacity exists.

## Admin permanent delete

Owner/Admin Event Administration now exposes **DELETE EVENT PERMANENTLY** for Draft and Cancelled events.

Published events must be cancelled first.

Permanent deletion removes the Flowtel event and its cascade-owned records, including:

- occurrences;
- Flowtel registrations;
- occurrence registrations;
- event attendance snapshots;
- event entitlements;
- local Acuity occurrence-enrollment mappings;
- local series-enrollment mappings.

The event artwork is also removed from the existing event-image Storage bucket when possible.

Flowtel refuses permanent deletion if active/pending Acuity appointments or active/pending series enrollments are still attached. This prevents deleting the local event while Acuity can still send reminders or hold class capacity.

## My Upcoming Events recurring cleanup

Recurring My Upcoming Events now resolves the member's next **registered** occurrence for Open Event / Unclaim actions rather than blindly targeting the next scheduled occurrence.

## Boundaries preserved

No change to:

- Public / Queendom / Flow FM entitlement resolution;
- Event Pass isolation;
- Acuity-first booking and confirmation/reminder behavior;
- Event Flow Map / attendance privacy boundary;
- Flowtel Time;
- Womb Magic monthly or 4-Week Portal flows;
- Complimentary Stay;
- Caddie Magic Player-first behavior;
- Vercel environment variables;
- Vercel serverless function count.

## Deployment order

**Run migration 077 before deploying the website files.**

Then deploy the v0.10.90.2 patch/source and wait for Vercel Ready.

## First live tests

1. Confirm a cancelled event disappears from public `/queendom-events/` after refresh.
2. Confirm it also disappears from a signed-in member calendar and My Upcoming Events.
3. Register one real Queendom member for one Acuity-linked recurring meditation occurrence.
4. Confirm the Acuity appointment exists.
5. Click **UNCLAIM MY SEAT**.
6. Confirm the Acuity appointment is cancelled and the Flowtel occurrence is no longer registered.
7. Confirm another claimed recurring occurrence, if present, remains untouched.
8. In Owner Event Administration, cancel a no-longer-needed event and then choose **DELETE EVENT PERMANENTLY**.
9. Confirm it disappears from Event Administration and does not reappear after refresh.
10. Confirm permanent delete is blocked while active Acuity appointments are still attached.

**Source validated does not mean live production verified.**
