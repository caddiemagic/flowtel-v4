# Flowtel v0.10.90 — First Live Test Checklist

Do not mark v0.10.90 production verified until these checks have been performed against the deployed site.

## 1. Deployment boundary

- [ ] Migration 076 completed successfully before website deployment.
- [ ] GitHub/Vercel deployment contains v0.10.90 and Vercel reports Ready.
- [ ] `/client/` remembered-session auto-entry still works.
- [ ] Sign In responds normally after signing out.

## 2. Public discovery / Queendom-only weekly meditation

Create or use an Acuity group class for the weekly meditation, with multiple independently bookable dates.

- [ ] In Flowtel Owner Events, map the Acuity class + calendar.
- [ ] Choose **IMPORT / REFRESH ACUITY SCHEDULE**.
- [ ] Flowtel recognizes multiple class dates as **Recurring Event**.
- [ ] Publish with Public = unavailable, Queendom = included, Flow FM = included.
- [ ] Logged-out visitor can see the meditation and its upcoming dates on the public calendar.
- [ ] Logged-out visitor sees **JOIN THE QUEENDOM TO CLAIM YOUR SEAT**, not a registration bypass.
- [ ] Complimentary Stay account can browse the public calendar but cannot claim the Queendom-only seat.

## 3. Real Queendom member claim

Use one real eligible Queendom test member.

- [ ] Claim one specific weekly occurrence.
- [ ] Acuity creates exactly one appointment for that exact date/time.
- [ ] Flowtel confirms the seat only after Acuity accepts it.
- [ ] Refreshing/retrying does not create a duplicate Acuity appointment.
- [ ] Another weekly occurrence remains independently unclaimed.
- [ ] Acuity confirmation/reminder email arrives.
- [ ] Email can use the universal **ENTER THE FLOWTEL** doorway rather than exposing Zoom.

## 4. Event-day entry + Event Flow Map

- [ ] Following `/queendom-events/?enter=1` opens the next gathering the member actually registered for.
- [ ] If she has not checked in for the current Flowtel Day, JOIN ZOOM returns her to Flowtel check-in.
- [ ] After check-in, she returns to the correct event/occurrence.
- [ ] JOIN ZOOM opens the protected Acuity/Zoom doorway.
- [ ] Host/co-host/Owner can open and **REFRESH** the Event Flow Map without claiming an attendee seat or creating an Acuity appointment.
- [ ] Host/co-host/Owner sees her in **IN THE ROOM** only after she enters.
- [ ] Her Event Flow Map tile shows the expected Cycle Day and Inner Season.
- [ ] No reflection, Moon Mail, Personal Cosmology, Flow Map notes, or unrelated private data is exposed.
- [ ] Four chambers render in the requested North/East/West/South layout.

## 5. Moon calendar

- [ ] Public/member month calendar shows New / Half Full / Full / Half New Moon markers on expected Flowtel Moon dates.
- [ ] Owner event editor shows lunar context for the selected date.

## 6. Existing event contracts

- [ ] Existing single event still claims/opens normally.
- [ ] Existing v0.10.89 Series / Vortex still enrolls once for the whole Acuity series and advances sessions correctly.
- [ ] Paid event still requires verified ticket before the Acuity booking is confirmed.
- [ ] Event Pass remains isolated from Suite/Lounge/Queendom/Flow FM/Caddie Magic access.
- [ ] Refund/revocation removes current event entitlement while preserving history.

## 7. Womb Magic / core regressions

- [ ] Monthly Womb Magic still books/opens normally.
- [ ] Private 4-Week Womb Magic Portal still works independently of group events.
- [ ] Personal Cosmology sharing remains separate.
- [ ] Caddie Magic remains Player-first.
