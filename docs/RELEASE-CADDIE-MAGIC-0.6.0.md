# Caddie Magic v0.6.0 — Player Session Scheduling

Release date: August 4, 2026

## Purpose

This release extends the existing private Acuity bridge into Caddie Magic while preserving Caddie Magic as a separate product, permission system, and visual experience.

## Player experience

The Player portal now includes **Book a Session**. Eligible Players may:

- schedule a session with Megan when the Caddie Master calendar is enabled;
- schedule with their accepted Caddie when that Caddie is mapped and bookable;
- view real Acuity dates and times;
- reschedule or cancel inside Caddie Magic;
- see a live upcoming-session count;
- grant appointment-scoped consent before booking.

The initial services are:

- **Session with Megan** — 45 minutes;
- **Session with My Caddie** — 45 minutes.

Payment mode is configurable as manual, Acuity, complimentary, included, or package credit. This release does not define revenue sharing, Caddie compensation, refunds, or package economics.

## Provider experience

Approved Caddies see Acuity-booked Player sessions inside the Caddie Desk. The appointment-specific preparation doorway includes read-only access to the Player Profile, Scorecard, Score Map, Caddie Compass, and Upcoming Golf through seven days after the appointment.

This access does not create a new permanent Caddie pairing and does not grant access to unrelated Players.

## Caddie Master setup

The owner-only room `/manager/caddie-scheduling/` supports:

- mapping Session with Megan and Session with My Caddie to existing Acuity appointment types;
- mapping Megan and approved Caddies to existing Acuity calendars;
- activating or pausing each provider;
- selecting initial payment handling;
- viewing upcoming Caddie Magic sessions.

The already-installed Acuity `changed` webhook is reused. Do not add a second webhook.

## Migration

Run once:

`database/migration-066-priestess-title-caddie-acuity-scheduling.sql`

Migration 066:

- extends shared provider kinds with `caddie_master`;
- adds configurable payment metadata to shared service types;
- seeds the two 45-minute Caddie Magic services;
- adds appointment-scoped Caddie Magic access grants;
- adds provider/player/owner upcoming-session visibility;
- adds the consent-aware appointment preparation snapshot.

It is additive and does not alter Player history, pairings, scorecards, the Caddie Compass, messages, assignments, or either historical migration 052 body.

## Existing environment

No new Vercel environment variables are required. The release reuses:

- `ACUITY_USER_ID`
- `ACUITY_API_KEY`

## Protected boundaries

- Every Caddie remains a Player first.
- Only the accepted Caddie can be offered through **Session with My Caddie**.
- Players cannot browse unrelated Caddie calendars.
- The owner retains Caddie Master visibility.
- Flowtel data and Caddie Magic data remain separate.
- Appointment access is time-limited, read-only, and consented.
