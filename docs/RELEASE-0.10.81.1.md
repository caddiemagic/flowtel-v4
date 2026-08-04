# Flowtel v0.10.81.1 — Womb Magic Suite + Upcoming Calls Polish

Release date: August 3, 2026

## Purpose

Refine the working Acuity integration without changing its booking, webhook, consent, appointment-access, or calendar-mapping foundations.

This release moves the complimentary Womb Magic experience out of the Flow FM Initiation Hall shell and into the member's private Suite, condenses Priestess selection, makes upcoming call priority easier to read, and replaces the Concierge Desk's generic LIVE label with a real appointment count.

## Member Suite

- Womb Magic scheduling now expands directly inside the existing **Complimentary Mentor Call** card.
- Members remain inside the Suite throughout Priestess selection, date/time selection, consent, booking, rescheduling, and cancellation.
- An existing appointment appears as a compact Suite summary with View Details, Reschedule, and Cancel actions.
- After a successful booking or reschedule, the scheduling panel collapses back into the appointment summary.
- The legacy `/flow-fm/womb-magic/` URL now returns the member to the Suite and opens the inline scheduler.
- Womb Magic is removed from Flow FM navigation so Queendom scheduling does not expose Initiation Hall rooms.

## Priestess selection

Each participating Priestess card now shows only:

- profile picture;
- Priestess name;
- profile location, when supplied;
- a human-readable profile timezone, when supplied.

Long biographies, modalities, calendar identifiers, and oversized empty card space are removed from the booking choice.

## Upcoming Calls

The Priestess Upcoming Calls room now:

- groups appointments into **This Week**, **Next Week**, and **Later**;
- makes the appointment date and time the primary visual focus;
- displays the client's timezone as a human-readable name, such as `Pacific Daylight Time (PDT)`;
- removes the weekday from the **Access closes** value;
- excludes canceled, completed, and expired appointments from the active upcoming list.

## Concierge Desk count

The **Upcoming Calls** Team Room card now displays the live number of active upcoming calls.

- `0` appears when no calls are scheduled.
- The supporting line becomes **No calls currently scheduled** when empty.
- Owner view counts all active Womb Magic calls; a Priestess Team view counts only her own calls.
- The count refreshes with the existing Concierge Desk refresh cycle.

## Preserved

- Acuity availability and appointment creation;
- signed webhook synchronization;
- one complimentary call per calendar month;
- first-available and choose-a-Priestess pathways;
- member consent language and timestamps;
- seven-day appointment access window;
- Cycle Data and Flow Map permissions;
- one ongoing Mentor to the Moon;
- cancellation eligibility restoration;
- owner calendar and appointment-type mapping;
- Caddie Magic v0.5.2.

## Migration

No migration is required.

Migration 064 remains the live Acuity scheduling foundation and must not be rerun for this visual release.

## Minimal live deployment

Deploy these 17 runtime files:

```text
api/acuity.js

client/app.js
client/index.html
client/styles.css

flow-fm/app.js
flow-fm/index.html
flow-fm/ui.js
flow-fm/upcoming-calls/index.html
flow-fm/upcoming-calls/page.js
flow-fm/upcoming-calls/styles.css
flow-fm/womb-magic/index.html
flow-fm/womb-magic/page.js
flow-fm/womb-magic/styles.css

manager/app.js
manager/index.html

shared/timezone-labels.js
shared/womb-magic-booking.js
```

After deployment, hard-refresh the Suite, Concierge Desk, and Upcoming Calls room.
