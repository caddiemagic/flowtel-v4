# Flowtel v0.10.87 — 4-Week Womb Magic Portal

## Purpose

Add a deeper Flow FM practicum container without replacing the existing monthly complimentary Womb Magic call.

A Queendom member chooses one Flow FM Priestess and one standing weekly time. Flowtel confirms that same weekday/time is open on the Priestess's Acuity calendar for four consecutive weeks, then schedules all four private 45-minute Womb Magic calls together inside one 28-day Portal.

## Product rules

- Existing monthly Womb Magic remains intact and separate.
- One Queendom member may hold one active Portal at a time.
- One Flow FM Priestess may hold one active Portal client at a time.
- The client chooses her Priestess once.
- The same Priestess holds all four sessions.
- The first appointment establishes the standing weekly Portal time.
- Flowtel schedules Sessions 1–4 at that same local weekday/time when all four slots are available.
- The Portal runs for 28 days from Session 1.
- Portal sessions do not consume the monthly complimentary Womb Magic eligibility period.
- Either the client or the assigned Priestess may reschedule an individual Portal session; the other three sessions stay unchanged.
- The client may cancel one Portal session and book a replacement inside the same 28-day window.
- Each call retains the existing recording disclosure.
- Client preparation access may remain active across the 28-day Portal rather than only seven days after an individual session.
- Personal Cosmology still requires its separate explicit member sharing toggle.

## Scheduling architecture

This release reuses the existing Womb Magic Acuity setup:

- same Acuity appointment type;
- same mapped Flow FM Priestess calendars;
- same Zoom creation/reschedule/cancel mechanics;
- same Flowtel appointment history.

Before opening a new Portal, Flowtel checks Acuity availability on the selected start date and the matching dates 7, 14, and 21 days later. Only times present at the same local clock time on all four dates are offered as Portal start times.

When the member confirms one of those times, Flowtel rechecks the four-week series server-side and creates all four appointments. If one of the four appointments becomes unavailable during booking, the series is rolled back instead of leaving a partial Portal.

The Portal remains a Flowtel relationship/container layered around ordinary Acuity appointments. It is **not** four new Acuity appointment types and is not a second Womb Magic scheduling database.

## Migration

Run once after migration 072:

`database/migration-073-womb-magic-four-week-portal.sql`

Because v0.10.87 has not yet been deployed, migration 073 includes the standing-weekly-time fields in the initial Portal table definition. Do not use the earlier pre-release 073 draft; use the migration contained in this final v0.10.87 package.

Migration 073 adds:

- `flowtel_womb_magic_portals`;
- standing recurrence timezone / weekday / time fields;
- Portal ID/session-number fields on `flowtel_external_appointments`;
- one-active-Portal constraints for clients and Priestesses;
- continuous active-Portal authorization helper;
- Portal-aware cycle/client access;
- Portal-aware Personal Cosmology authorization while retaining the member sharing gate;
- active Portal clients in the established practitioner service-client RPC.

Do not rename or rerun historical migrations.

## Member experience

The Suite presents two distinct Womb Magic choices:

1. **Complimentary Mentor Call** — one private 45-minute Womb Magic call each calendar month.
2. **4-Week Womb Magic Portal** — four weekly sessions with one Priestess across 28 days.

For a new Portal the member:

1. chooses a Priestess who has Portal capacity;
2. chooses a start date;
3. sees only times that repeat at the same local time for all four weeks;
4. consents once to the four-week container and recording/preparation terms;
5. confirms the weekly time;
6. receives all four scheduled Portal sessions immediately.

Each session remains individually visible with Join Zoom and Reschedule. Moving Session 2, for example, does not move Sessions 1, 3, or 4.

## Flow FM practitioner experience

Portal sessions appear in Upcoming Calls as `4-Week Womb Magic Portal · Session N`.

For Portal calls, the assigned Priestess receives **Reschedule This Session** in Flowtel. She can choose another available date/time inside the active 28-day Portal. That action moves only the selected Acuity appointment.

An active Portal client also remains in the established service-client access list between weekly calls for the duration of the Portal.

## Deferred Moon Mail correction consolidated

The Lounge/Suite Moon Mail doorways point to `/moonbox/`, which is the existing working implementation. This avoids requiring the previously drafted standalone `/moon-mail/` route hotfix.

No separate v0.10.86.2 deployment is required if v0.10.87 is deployed.

## Live setup / first test

1. Confirm migrations 071 and 072 are already live.
2. Discard the earlier pre-release v0.10.87 package if downloaded.
3. Run the final migration 073 once.
4. Deploy this final v0.10.87 source.
5. As a Queendom test member, confirm the ordinary monthly Womb Magic call still opens normally.
6. Begin a 4-Week Portal and choose one mapped Flow FM Priestess.
7. Pick a start date and confirm Flowtel only offers times available at the same local time across all four weeks.
8. Confirm one consent/booking action creates Sessions 1–4 in Acuity and Flowtel.
9. Confirm all four Zoom appointments appear and Portal session numbers are correct.
10. Confirm the same member can still use monthly Womb Magic separately.
11. Confirm the Portal locks to the original Priestess and that Priestess is unavailable to a second active Portal client.
12. As the Queendom member, reschedule Session 2 and confirm Sessions 1, 3, and 4 do not move.
13. As the assigned Priestess, use Upcoming Calls → Reschedule This Session on Session 3 and confirm only Session 3 moves.
14. Confirm the Priestess can open consented client preparation during the Portal.
15. Confirm Personal Cosmology remains inaccessible unless its separate sharing toggle is enabled.
16. Confirm the Lounge Moon Mail link opens `/moonbox/`.

## Validation posture

Source validation is not live-production verification. Acuity recurring availability, the four-appointment series booking/rollback path, Zoom creation, practitioner-side rescheduling, and Supabase migration behavior must still be confirmed against production after deployment.
