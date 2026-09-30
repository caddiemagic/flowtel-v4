# Flowtel v0.10.90.2 — First Live Test Checklist

Do not mark v0.10.90.2 production verified until these checks pass against the deployed site.

## Deployment

- [ ] Migration 077 applied successfully after migration 076.
- [ ] GitHub/Vercel deployment contains v0.10.90.2 and Vercel reports Ready.
- [ ] Vercel function count remains 12/12.
- [ ] No Vercel environment variables were added or changed.

## Cancelled-event visibility

- [ ] Cancel one test event in Owner Event Administration.
- [ ] Refresh the public calendar and confirm the event is absent.
- [ ] Sign in as a Queendom member and confirm the event is absent from the member calendar.
- [ ] Confirm it is absent from My Upcoming Events.
- [ ] Confirm the cancelled event still appears in Owner Event Administration until deleted.

## Unclaim — Acuity-linked recurring event

- [ ] Claim one real recurring meditation occurrence.
- [ ] Confirm exactly one corresponding Acuity appointment exists.
- [ ] Confirm **UNCLAIM MY SEAT** appears in My Upcoming Events / member calendar.
- [ ] Click **UNCLAIM MY SEAT** and confirm the warning.
- [ ] Confirm the Acuity appointment is cancelled.
- [ ] Confirm the Flowtel occurrence no longer shows as claimed.
- [ ] Confirm a different claimed recurring occurrence remains claimed.
- [ ] Reclaim the released occurrence and confirm Flowtel can create a new valid Acuity appointment if capacity remains.

## Unclaim — Single / Series

- [ ] Confirm a linked Single Event releases its Acuity appointment before removing the Flowtel seat.
- [ ] Confirm a Series / Vortex unclaim cancels all active linked series sessions before releasing the parent Flowtel registration.

## Permanent delete

- [ ] Confirm a Draft event shows **DELETE EVENT PERMANENTLY**.
- [ ] Confirm a Published event does not offer permanent delete until it is cancelled.
- [ ] Confirm delete requires the irreversible-action confirmation.
- [ ] Confirm delete removes the event from Owner Event Administration after refresh.
- [ ] Confirm permanent delete is blocked if active/pending Acuity appointments remain attached.
- [ ] Confirm a cancelled/no-active-Acuity event can be deleted successfully.

## Regressions

- [ ] Claim My Seat still creates Acuity appointments and confirmation/reminder email behavior remains intact.
- [ ] Public / Queendom / Flow FM access rules remain correct.
- [ ] Event Pass remains isolated from Suite/Queendom membership access.
- [ ] Event Flow Map / JOIN ZOOM still work.
- [ ] Monthly Womb Magic works.
- [ ] 4-Week Womb Magic Portal works.
- [ ] Remembered-session login works.
- [ ] Caddie Magic remains Player-first.

**SOURCE VALIDATED is not LIVE PRODUCTION VERIFIED.**
