# Caddie Magic v0.5.1 — Network Reintegration + Caddie Master Service Boundaries

Release date: 2026-07-22

Integrated Flowtel release: **v0.10.68**

## Purpose

Caddie Magic v0.5.1 resolves the mixed-version state left after the v0.5.0 Network commit and the later combined v0.10.67/v0.4.6 repair commit. It restores the approved Network foundation from commit `8ff30e5` into the current Flowtel HEAD without discarding the newer v0.4.6 geometry, mobile, Moon-data, profile, and valid-score repairs.

## Roles

- **The Caddie Master** is the owner/admin and controls Assignments, VIP Messages, Scorecard Reviews, Caddie Master Notes, invitations, approvals, and course verification.
- **Caddies** are Players first and members of the golf-course Concierge Team. They use the Caddie Desk and receive only profile, request, availability, consultation, and consent-scoped read-only preparation capabilities.

The boundary is enforced in the UI, shared modules, RPCs, and existing RLS/product-access framework.

## Player experience

- Restores Assignments, Caddie Compass, Caddie Network, and Calendar cards.
- Keeps Locker Room Sharing in the Player Profile.
- Adds a lifecycle-aware, full-width Caddie Desk doorway.
- Restores functional Cardinal Club Room navigation.
- Keeps Caddie Master Notes and Scorecard Reviews active.
- Adds owner-gated VIP Messages inside the Caddie Master Notes area.
- Removes the user-facing version pill.

## Scorecard Review game loop

- one credit per 28 log entries;
- scores, thoughts, and combined entries all count;
- one pending request at a time;
- submit consumes one credit;
- cancel/decline restores it;
- completed review permanently consumes it.

## Caddie Network

- owner invitation of an existing Player;
- Invited → Draft → Submitted → Approved → Active lifecycle;
- Paused and Declined safety states;
- approved/active/accepting-only directory;
- one open Player-to-Caddie request;
- availability hidden until acceptance;
- 45-minute consultation booking;
- read-only preparation limited to explicit Player consent.

## Courses and scheduling

- controlled initial course catalog;
- multiple approved courses per Caddie;
- private Pending Verification course requests;
- seven-day Morning/Afternoon/Evening recurring schedule;
- Calls and Caddying tracked separately;
- date/date-range exceptions;
- eight weeks of 45-minute call slots;
- future Acuity/Zoom mapping foundation only—external integration remains inactive.

## Preserved v0.4.6 repairs

- North/East/West/South Score Map and Locker Room geometry;
- valid-score-only average and best calculations;
- thought-only rows never become zero scores;
- future-date round blocking;
- one next-relevant major Moon card;
- Moon event versus multi-day Phase language;
- mobile controls and Upcoming Golf polish;
- Player-Only access and invitation codes.

## Routes restored

- `/caddie-magic/caddies/`
- `/caddie-magic/caddie-desk/`
- `/caddie-magic/compass/club/`

## Migration

Both historical migration 052 bodies are already represented in the live database. Do not rerun or rename either one.

Run once:

`database/migration-053-caddie-network-reintegration-shared-scheduling.sql`

Migration 037 remains retired and must never be rerun.

## Live validation required

Static validators can confirm syntax, files, routes, version coherence, HTML/CSS structure, and required role/data wiring. They cannot prove hosted Supabase RLS, authenticated role behavior, Acuity behavior, email delivery, or Zoom hosting. Complete the live account matrix in the Flowtel v0.10.68 release note before treating the Network as production-confirmed.
