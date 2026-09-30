# Flowtel v0.10.90.3 — First Live Test

Status before owner testing: **SOURCE VALIDATED — NOT YET LIVE PRODUCTION VERIFIED**

## Lounge

- Enter the Lounge as a Queendom member with at least one saved event.
- Confirm **MY UPCOMING EVENTS** is visible immediately.
- Confirm no discovery/My Events toggle is required.
- Confirm the footer contains one **VIEW ALL UPCOMING EVENTS** doorway.
- Confirm the doorway opens `/queendom-calendar/`.

## Calendar preview

- Open `/queendom-calendar/`.
- Confirm a compact next-three-gatherings strip appears above the full month calendar.
- Confirm it does not materially increase page height.
- Confirm recurring occurrences can appear independently.
- Click one preview item and verify the exact date/occurrence opens.

## Registered recurring gathering

- Claim one occurrence of a recurring Acuity-linked event.
- Confirm the registered action reads **✓ SEAT CLAIMED · OPEN EVENT**.
- Open that event.
- Confirm only the claimed occurrence's date/time appears.
- Confirm the recurring parent `UPCOMING GATHERINGS` itinerary is absent.
- Confirm **UNCLAIM MY SEAT** is visible inside the protected room.
- Unclaim and confirm the matching Acuity appointment is cancelled before Flowtel releases the seat.
- If another occurrence is registered, confirm it remains registered.

## Calendar dialog release

- Claim an event from the month calendar.
- Reopen it and confirm **UNCLAIM MY SEAT** is available.
- Release it and confirm Acuity + Flowtel remain synchronized.

## Regression

- Open one Series / Vortex and verify its complete session itinerary still appears.
- Verify Event Flow Map remains available to the intended host/co-host/Owner.
- Verify one normal single event.
- Verify monthly Womb Magic and the 4-Week Womb Magic Portal.
- Verify remembered-session login.
- Verify Caddie Magic remains Player-first.
