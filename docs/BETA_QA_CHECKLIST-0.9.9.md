# Flowtel Beta QA Checklist — v0.9.9

## Beta posture

Flowtel v0.9.9 is a beta freeze release. The goal is to confirm that the existing product surfaces are coherent, stable, and permission-safe before inviting more Flow FM practitioner testers.

North star: **Flowtel is a luxury hotel that remembers women.**

Do not introduce new UI during this pass unless a bug makes the existing experience unclear or unsafe.

---

## 1. Deployment readiness

- [ ] Deploy patch files.
- [ ] Confirm latest deploy completes without build errors.
- [ ] Hard refresh Suite, Concierge Desk, and Cycle Data dashboard.
- [ ] Confirm browser loads cache-busted assets:
  - `/client/app.js?v=0.9.9`
  - `/manager/app.js?v=0.9.9`
  - `/cycle-data/app.js?v=0.9.9`
- [ ] Confirm no new Supabase migration is expected for v0.9.9.
- [ ] Confirm migrations 010–018 were already run in order.

---

## 2. Guest arrival + stay lifecycle

Test with a fresh guest and a returning guest.

- [ ] Guest can enter through the beta/member bridge.
- [ ] New guest can create profile.
- [ ] Returning guest can log in.
- [ ] If guest has not checked in today, they land on Check In.
- [ ] Guest enters recorded cycle day and feels-like season.
- [ ] Check In creates today’s stay.
- [ ] Only one stay is created per Flowtel Day.
- [ ] Reloading after check-in opens the Suite, not a duplicate check-in.
- [ ] Returning the next Flowtel Day creates/opens the correct new daily flow.
- [ ] Stale/yesterday stays do not trap the guest.

Product rule: one stay per Flowtel Day; history is append-only.

---

## 3. Suite smoke test

- [ ] Greeting shows clean guest name.
- [ ] Current Room is based on Actual Cycle Day.
- [ ] Medicine Wheel highlights the correct actual day.
- [ ] Receiving Season displays beyond mapped cycle range when applicable.
- [ ] Moon Magic pill displays expected phase/day/theme.
- [ ] Reflection can be saved.
- [ ] Saved reflection remains attached to the stay.
- [ ] Concierge Card appears.
- [ ] Turndown request button works.
- [ ] Wake-up text placeholder remains beta copy only.
- [ ] Lounge link opens the correct court.
- [ ] Previous Stays opens append-only history.

---

## 4. Cycle Data pill

Test matching, ahead, behind, Day 1 reset, and late reset scenarios when possible.

- [ ] Pill shows Actual Cycle Day.
- [ ] Pill shows Recorded Cycle Day.
- [ ] Pill shows compassionate feedback.
- [ ] Pill does **not** show the old `Matched` badge.
- [ ] Pill does **not** show the visible current cycle Day 1 line.
- [ ] Previous cycle length appears only when available.
- [ ] Suite room/wheel uses Actual Cycle Day, not merely the recorded value.
- [ ] Day 1 input resets cycle start logic.
- [ ] Late reset does not shame the guest.

---

## 5. Mentor to the Moon flow

Test with at least one guest and two practitioner accounts.

- [ ] Choose Your Mentor opens the mentor directory.
- [ ] Logged-in guest/practitioner does not see themselves in the mentor list.
- [ ] Directory shows eligible mentors.
- [ ] Consent language appears before/while inviting:
  - “By inviting this mentor, you consent to share your Flowtel cycle data, check-ins, reflections, and stay history with them while you are connected.”
- [ ] Guest can send request.
- [ ] Pending state says “they,” not “she.”
- [ ] Pending state shows Cancel / Change Request.
- [ ] Cancel / Change Request removes the pending request from practitioner queue.
- [ ] Guest can choose another mentor after cancellation.
- [ ] Guest has only one active connected mentor at a time.
- [ ] Mentor can have multiple connected clients.

---

## 6. Concierge Desk + Your Clients

- [ ] Practitioner can clock in.
- [ ] Dashboard says Your Clients, not Your Guests.
- [ ] Mentor Requests section shows requested guests.
- [ ] Connect button changes to Connecting… when clicked.
- [ ] Request moves to connected state.
- [ ] Connected client appears under Your Clients.
- [ ] Connected client shows View Data.
- [ ] Pending requests do not show View Data.
- [ ] Mentor can have more than one connected client.
- [ ] Practitioner cannot connect to a request that does not belong to them.

---

## 7. View Data + Cycle Data dashboard

Test as guest, mentor, admin/owner.

- [ ] `/cycle-data/` loads for signed-in user.
- [ ] Mentor can view My Data.
- [ ] Mentor can view individual connected client data.
- [ ] Mentor can view All My Clients.
- [ ] Admin/owner can view All Flowtel Clients.
- [ ] Non-connected mentor cannot view unrelated guest’s private client dashboard.
- [ ] View Data button opens the intended client view.
- [ ] Dashboard filters do not break page load.
- [ ] Empty states are graceful when there is no data.

---

## 8. Anonymous seasonal reflection dashboards

- [ ] Inner Winter card opens seasonal view.
- [ ] Inner Spring card opens seasonal view.
- [ ] Inner Summer card opens seasonal view.
- [ ] Inner Autumn card opens seasonal view.
- [ ] Reflections are grouped/filterable by Actual Inner Season.
- [ ] Cards show feels-like season when available.
- [ ] Cards show moon phase when available.
- [ ] Cards show moon cycle when available.
- [ ] Names, emails, profile IDs, and user IDs are not displayed.
- [ ] Free-text reflections display as written.
- [ ] Date range filter works.
- [ ] Moon phase filter works.
- [ ] Moon cycle filter works.
- [ ] All data view works.

Future privacy note: guest opt-out exists in data model but guest-facing toggle is not yet built.

---

## 9. Turndown + Concierge Notes

- [ ] Guest requests Turndown.
- [ ] Awaiting Turndown count increases.
- [ ] Practitioner sees active request.
- [ ] Practitioner completes Turndown with note.
- [ ] Button changes to completion state.
- [ ] Active count decreases.
- [ ] Request moves to Completed Requests.
- [ ] Completed request stays visible for the day.
- [ ] Guest sees Concierge Note in Suite.
- [ ] Multiple completed requests remain in Completed Requests.

---

## 10. Previous Stays + append-only history

- [ ] Previous Stays opens.
- [ ] Past stays are not overwritten.
- [ ] Current open stay is visible.
- [ ] Checked-out stays remain in history.
- [ ] Reflections stay attached to correct stay.
- [ ] Turndown/completion history stays attached to correct stay.

---

## 11. Role and permission checks

- [ ] Guest cannot access Concierge Desk functions.
- [ ] Guest cannot see unrelated private cycle data dashboards.
- [ ] Practitioner can access Concierge Desk.
- [ ] Practitioner can see own clients only for private client data.
- [ ] Admin/owner can access global data views.
- [ ] RLS allows required reads/writes without exposing private data broadly.

---

## 12. Mobile pass

Test on iPhone/Safari or responsive simulator.

- [ ] Suite layout remains readable.
- [ ] Medicine Wheel does not overflow badly.
- [ ] Seasonal cards are tappable.
- [ ] Cycle Data pill remains readable.
- [ ] Concierge Desk stat cards are usable.
- [ ] View Data button is tappable.
- [ ] Cycle Data dashboard filters are usable.
- [ ] Forms have comfortable tap targets.

---

## 13. Copy sweep

- [ ] Guest-facing copy says Guest, Suite, Check In, Concierge Note, Mentor to the Moon.
- [ ] Practitioner-facing management copy can say Clients.
- [ ] No shame/streak/gamification language has slipped in.
- [ ] No accidental “dashboard” language appears in guest-facing hospitality copy unless intentional.
- [ ] Pending mentor copy uses “they.”
- [ ] Consent copy is explicit and readable.

---

## 14. Known deferred work

These are not blockers for v0.9.9 beta freeze:

- [ ] Final Cycle Data dashboard redesign.
- [ ] Practitioner profile photo sourcing/upload.
- [ ] Display-only Priestess Profile polish.
- [ ] Guest-facing collective reflection opt-out toggle.
- [ ] True Squarespace identity bridge.
- [ ] SMS Wake-Up Text integration.
- [ ] Broader AI or analytics features.

---

## Beta sign-off

Ship to the next tester group only after:

- [ ] Guest check-in works.
- [ ] Mentor connection works.
- [ ] View Data works.
- [ ] Seasonal reflection views work.
- [ ] Turndown completion works.
- [ ] Previous Stays remains append-only.
- [ ] No severe mobile blocker appears.
