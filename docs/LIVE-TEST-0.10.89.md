# Flowtel v0.10.89 — First Live Test Checklist

Use this only after migration 075 is installed and the v0.10.89 Vercel deployment is Ready.

## 1. Acuity setup before Flowtel

- [ ] Create the Womb Magic Committee appointment type in Acuity as a **series**, not a normal class/service.
- [ ] Place all four class dates/times in Acuity.
- [ ] Confirm the correct Acuity calendar/provider.
- [ ] Confirm capacity is greater than the expected enrollment.
- [ ] Confirm Zoom/location integration produces a usable meeting URL for the class appointments.
- [ ] Configure the desired Acuity confirmation/reminder emails for each gathering.
- [ ] Keep protected Zoom passcodes out of routine reminder copy; direct members back to My Upcoming Events in Flowtel.

## 2. Migration / deployment

- [ ] Run `database/migration-075-queendom-multi-session-event-series.sql` exactly once.
- [ ] Confirm migration completes and PostgREST schema cache reloads.
- [ ] Deploy v0.10.89.
- [ ] Confirm Vercel is Ready.
- [ ] Confirm Vercel function budget remains 12/12.

## 3. Owner Event Manager

- [ ] Open Owner → Queendom Events.
- [ ] Existing single-day events still load/edit normally.
- [ ] Create/edit **Womb Magic Committee**.
- [ ] Event format = **Multi-Session Series**.
- [ ] Session count = 4.
- [ ] Days between sessions = 7.
- [ ] Flowtel preview shows all four correct Fridays.
- [ ] Select the Acuity series and correct calendar.
- [ ] Queendom access is configured as intended (normally included).
- [ ] Publish.
- [ ] Re-open the event and confirm mapping + four occurrences persisted.

## 4. Discovery / calendar

- [ ] Queendom agenda shows one Womb Magic Committee vortex card, not four unrelated parent events.
- [ ] Month calendar shows a session tile on each actual gathering date.
- [ ] Public/member discovery does not expose Zoom URL, passcode, private location, or attendee guide before entitlement/registration.
- [ ] Flowtel Time renders date-correct PST/PDT; member local time remains correct.

## 5. First real member enrollment

Use a real eligible Queendom member whose Flowtel email exactly matches the email Acuity should receive.

- [ ] Click **JOIN THE 4-WEEK VORTEX** once.
- [ ] Only one Flowtel event registration exists for the whole vortex.
- [ ] Acuity creates one client enrollment into the existing series and all expected class occurrences are present for that member.
- [ ] Refresh/reopen Flowtel and confirm no duplicate Acuity enrollment is created.
- [ ] My Upcoming Events shows one Womb Magic Committee card through the full date range.
- [ ] Event Room lists Session 1–4.
- [ ] Next session is highlighted correctly.
- [ ] JOIN ZOOM resolves to the member's correct Acuity/Zoom doorway for the next session.
- [ ] A different member cannot retrieve this member's session enrollment/Zoom row.

## 6. Acuity emails

- [ ] Member receives the expected Acuity series confirmation.
- [ ] Configured reminder email arrives for an upcoming occurrence.
- [ ] Reminder copy points her back into Flowtel as intended.
- [ ] Flowtel did not suppress Acuity email delivery (`noEmail=true` is not used).

## 7. Calendar + live-room behavior

- [ ] Apple / Outlook download contains all four VEVENT sessions.
- [ ] Google action targets the next session.
- [ ] Within one hour of any session, the Flowtel registered-event alert recognizes that occurrence rather than only Session 1.
- [ ] After Session 1 passes, My Upcoming Events advances to Session 2 and keeps the vortex visible.
- [ ] Vortex remains visible through Session 4 and then ages out normally after the final gathering.

## 8. Webhook regression

- [ ] Acuity scheduled/changed webhook refreshes a series occurrence without affecting unrelated Womb Magic calls.
- [ ] If a class occurrence is cancelled in Acuity, its Flowtel occurrence-enrollment state updates appropriately.
- [ ] Existing monthly Womb Magic booking/reschedule/cancel/JOIN ZOOM still works.
- [ ] Existing private 4-Week Womb Magic Portal still books all four 1:1 calls and remains architecturally separate.
- [ ] Caddie Magic v0.6.0 scheduling remains Player-first and unchanged.

## 9. Cancellation safety

Do not test cancellation on the live Committee unless intended; use a dedicated test series where possible.

- [ ] A member with active/pending Acuity enrollment cannot simply unsave the vortex in Flowtel.
- [ ] Flowtel refuses Owner cancellation while active/pending Acuity enrollments remain.
- [ ] Cancel the series/appointments in Acuity first.
- [ ] Confirm Acuity cancellation webhooks move all Flowtel occurrence enrollments to cancelled.
- [ ] Then Flowtel parent-event cancellation succeeds and the event remains in history as Cancelled.

## Still separate from this release

Priority-0 live checks from v0.10.88.1 remain open until explicitly verified: paid first-time Queendom / Flow FM signup, Complimentary Stay UI/expiry/conversion, password recovery actual save, Event Pass isolation, refund/revocation, and full 4-Week Womb Magic Portal production regression.
