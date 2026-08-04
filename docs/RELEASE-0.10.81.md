# Flowtel v0.10.81 — Acuity Scheduling + Consented Client Access

Release date: August 3, 2026

## Purpose

Open the first real Acuity-powered Flowtel service: one complimentary 45-minute **Womb Magic** call per calendar month for Queendom members, held by any approved Flow FM Priestess whose mapped Acuity calendar has availability.

This release preserves the rule that a guest has only one ongoing **Mentor to the Moon**. A Womb Magic booking creates a separate, temporary service relationship so the Priestess holding that appointment may prepare with the member's consented Flowtel data.

## Member experience

- New `/flow-fm/womb-magic/` room and Suite doorway.
- Choose first available or choose a specific participating Priestess.
- Read real Acuity dates and times in the member's saved timezone.
- Book one complimentary 45-minute call per Flowtel-Time calendar month.
- Explicit consent before booking.
- View, reschedule, or cancel the upcoming call.
- A canceled call restores monthly eligibility.

## Consented service access

The exact booking consent is stored with the appointment. The booked Priestess receives access to the member's Cycle Data and Flow Map immediately after booking and through seven days after the call. Cancellation revokes the temporary grant. Rescheduling moves its expiration.

Temporary appointment access does not:

- replace the member's Mentor to the Moon;
- expose Powder Room identities;
- expose Priestess Mailbox files, payment data, credentials, or owner-only records;
- grant indefinite client access.

## Priestess experience

- New `/flow-fm/upcoming-calls/` Concierge Team Room.
- Upcoming Womb Magic calls with client name, time, timezone, and access-close date.
- Direct links to the consented Client Snapshot and Flow Map.
- Existing permanent clients remain available through **Your Clients**.

## Owner experience

- New `/manager/acuity/` private setup room.
- Reads the live Acuity calendar and appointment-type catalog.
- Maps the Womb Magic appointment type.
- Maps each Flow FM Priestess to her existing Acuity calendar.
- Requires an explicit **Bookable** toggle for each Priestess.
- Shows the static webhook URL.
- Adds **Acuity Scheduling** and **Profile Review Desk** to Owner Administration.
- Adds **Upcoming Calls** to Concierge Team Rooms.

## Acuity integration

Server-only environment variables:

```text
ACUITY_USER_ID
ACUITY_API_KEY
```

The browser never receives either credential. Flowtel server endpoints retrieve availability, create appointments, reschedule/cancel appointments, and synchronize changes through the signed Acuity webhook.

Register one static Acuity webhook using the `changed` action:

```text
https://app.theflowtel.com/api/acuity-webhook
```

Do not register `changed` together with separate scheduled/rescheduled/canceled hooks, because Acuity may send duplicates.

## Migration

Run once:

```text
database/migration-064-acuity-womb-magic-scheduling.sql
```

Migration 064 extends the existing provider scheduling foundation, creates temporary appointment access grants and Acuity sync history, and expands the established cycle-data consent gate.

## Deferred

- 28 Days of Moon Magic four-week mentorship.
- Paid Practitioner Network services and 77/23 revenue share.
- Multiple ongoing Mentors to the Moon.
- Flowtel writing seasonal Availability back into Acuity.
- Automatic Zoom-host mapping beyond what Acuity already provides.
