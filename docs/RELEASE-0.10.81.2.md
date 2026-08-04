# Flowtel v0.10.81.2 — Womb Magic Booking Flow + Mentor and Availability Visibility

Release date: August 4, 2026

## Purpose

Refine the member booking experience and owner visibility without changing the working Acuity appointment, webhook, consent, temporary client-access, or one-Mentor-to-the-Moon foundations.

## Womb Magic Suite experience

- Restores **Schedule Womb Magic** as a full-width Suite action matching **Choose Your Mentor**.
- Removes **See Available Dates**.
- Automatically refreshes dates when the member changes the month, selects First Available, or chooses a Priestess.
- Expands available times directly beneath the selected date.
- Moves the consent and confirmation step beneath the selected time.
- Redesigns Priestess cards with lighter typography, larger portraits, cleaner location/timezone lines, and a softer selected state.

## Mentor to the Moon directory

- Removes the retired Phase One owner/admin-only Mentor visibility restriction.
- A Priestess is now eligible when she has active Flow FM/Council rank, **Accepting Clients** enabled, and approved Concierge Team access.
- The protected owner/admin remains eligible when accepting clients.
- The signed-in member is still excluded from choosing herself.
- The one-active-Mentor-to-the-Moon rule and existing relationship consent remain unchanged.

## Powder Rooms

- Replaces the loose flex layout with a dense masonry-style mirror wall.
- Shorter notes fill open spaces beneath and beside taller notes.
- Slight rotations, varied card spans, anonymity, season filtering, and note content remain intact.
- Mobile continues to use a clean single-column layout.

## Owner Flow FM Availability room

Adds `/manager/availability/` under Owner Administration.

The owner can see:

- every Flow FM and Council member;
- profile photo, location, and timezone;
- current Inner Season and Cycle Day when available;
- the four saved seasonal weekly rhythms;
- intentionally resting seasons saved after migration 065;
- Accepting Clients and Concierge Team access status;
- seasons completed and last update date;
- filters for Available Now, Accepting Clients, Incomplete Rhythms, and Recently Updated.

The room is read-only. Members remain the only people who can edit their own availability.

## Migration

Run once:

```text
database/migration-065-mentor-directory-owner-availability.sql
```

Migration 065:

- adds append-safe seasonal save-status records so a resting season can be distinguished from an unsaved season going forward;
- preserves the existing day-state behavior where closing a day retains its saved windows;
- backfills seasonal save status from existing day states, with a defensive fallback for older windows;
- updates the existing save RPC to record intentional seasonal saves;
- adds the eligible Mentor directory RPC;
- adds the owner-only Flow FM Availability read model.

Do not rerun or rename either migration 052 file. Migration 064 remains the Acuity scheduling foundation.

## Preserved

- Acuity calendar mapping and real availability;
- appointment creation, rescheduling, cancellation, and webhook synchronization;
- one complimentary Womb Magic call per calendar month;
- exact booking consent and seven-day client access;
- one ongoing Mentor to the Moon;
- append-only stays, appointments, grants, and history;
- Flowtel Time and role boundaries;
- Powder Room anonymity;
- Caddie Magic v0.5.2.
