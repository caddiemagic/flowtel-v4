# Flowtel v0.10.90.3 — Event Experience Polish

**Release date:** September 30, 2026
**Source base:** v0.10.90.2 (`907eb6e725385480c20f67b2877aae6bd660c6b4`)
**Database:** no migration
**Latest migration remains:** 077
**Next migration remains:** 078
**Vercel functions:** 12 / 12

## Purpose

This release closes the remaining member-facing event UX gaps found during live use of recurring Acuity-linked events.

The goal is to make the experience read naturally from discovery → registration → Lounge → registered Event Room without making a woman mentally separate the recurring parent event from the specific gathering she claimed.

## Registered recurring Event Room

When a member opens a recurring gathering she claimed:

- Flowtel anchors the protected room to the requested occurrence id when supplied;
- if no occurrence id is supplied, Flowtel prefers her next **registered** occurrence rather than simply the next date in the recurring schedule;
- only that gathering's date/time is shown;
- the parent recurrence's full `UPCOMING GATHERINGS` itinerary is not rendered in the protected registered room;
- **UNCLAIM MY SEAT** is available directly inside the room;
- recurring unclaim carries the exact occurrence id into the existing v0.10.90.2 Acuity-first cancellation path.

Series / Vortex rooms remain intentionally multi-session and still show the complete series itinerary.

## Seat-claimed copy

A registered independently claimable event now uses the simpler action copy:

**✓ SEAT CLAIMED · OPEN EVENT**

The previous `NEXT GATHERING CLAIMED` wording is removed.

## Compact next-three preview on The Queendom Calendar

The calendar page now includes a small snapshot above the full month calendar showing the next three upcoming gatherings.

The preview:

- stays visually compact;
- shows date/time, event title, and event/occurrence context;
- treats recurring occurrences as individual upcoming gatherings;
- keeps Series sessions distinguishable;
- opens the exact event occurrence when selected;
- uses the signed-in member feed when available and the sanitized public feed otherwise.

The full month calendar remains the primary browsing surface beneath the preview.

## Lounge defaults to My Upcoming Events

The Flowtel Lounge no longer makes members toggle between discovery and their own saved events.

For an eligible signed-in member:

- the visible event card defaults directly to **MY UPCOMING EVENTS**;
- it shows her registered Flowtel events plus her current Womb Magic appointment when applicable;
- the old discovery card remains non-visible legacy markup so unrelated behavior is not reopened in this hotfix;
- the single footer doorway is **VIEW ALL UPCOMING EVENTS** and opens The Queendom Calendar.

Complimentary Stay still does not receive Queendom member event entitlement merely because the Lounge section exists.

## Queendom Calendar seat release

For consistency with the full Event Room, the month-calendar event dialog now also exposes **UNCLAIM MY SEAT** for an already registered event. Acuity cancellation remains first; Flowtel releases the registration only after the linked appointment/session cancellation path succeeds.

## Unchanged

- Public visibility remains separate from membership/payment/registration/private-room access.
- Single / Recurring / Series architecture is unchanged.
- Acuity remains the schedule/reminder/appointment source of truth.
- Event Flow Map and attendance snapshots are unchanged.
- Cancelled-event filtering and Owner permanent delete remain from v0.10.90.2.
- Womb Magic and 4-Week Womb Magic Portal ownership boundaries are unchanged.
- Flowtel Time remains `America/Los_Angeles`.
- One Stay per Flowtel Day and append/history behavior are unchanged.
- Caddie Magic remains v0.6.0 and Player-first.
- Vercel remains 12/12.

## Deployment

**No migration required.** Migration 077 remains latest; 078 remains next.

Overlay the v0.10.90.3 patch onto v0.10.90.2, deploy through the existing GitHub/Vercel workflow, then hard-refresh `/client/`, `/queendom-events/`, and `/queendom-calendar/`.

## First live proof

1. Open the Lounge and confirm **MY UPCOMING EVENTS** is the visible event area without toggling.
2. Confirm the only footer doorway says **VIEW ALL UPCOMING EVENTS** and opens The Queendom Calendar.
3. Open The Queendom Calendar and confirm a compact next-three-gatherings preview appears above the month grid.
4. Click a preview occurrence and confirm the correct event/date opens.
5. For a claimed recurring gathering, confirm the action says **✓ SEAT CLAIMED · OPEN EVENT**.
6. Open that registered recurring gathering and confirm only that date/time appears; no parent `UPCOMING GATHERINGS` list appears.
7. Confirm **UNCLAIM MY SEAT** appears inside the registered room and cancels the matching Acuity appointment before the Flowtel seat disappears.
8. Confirm another independently claimed occurrence remains untouched.
9. Open a Series / Vortex and confirm its complete multi-session itinerary remains visible.

Source validation does not equal live production verification.
