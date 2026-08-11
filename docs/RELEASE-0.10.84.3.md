# Flowtel v0.10.84.3 — Upcoming Events Navigation + Lounge Repair

Released: August 10, 2026

## Purpose

Repair the Lounge Upcoming Events regression introduced in v0.10.84.2 and make the full Upcoming Events room a complete Flowtel destination instead of a navigation dead end.

## Lounge repair

- Fixes the runtime error `loungeTodayIso is not defined` that prevented Upcoming Events from rendering in the Lounge.
- Reuses Flowtel's established `localTodayISO()` / `FLOWTEL_TIME_ZONE` date path so the event list follows canonical Flowtel Time (`America/Los_Angeles`) rather than adding a second date helper.
- Restores the next 3 Upcoming Events and existing **SAVE MY SEAT / ✓ SEAT SAVED** behavior without changing event records, registrations, artwork, Zoom access, or membership rules.
- Keeps My Upcoming Events and personal Womb Magic rendering on the same corrected date boundary.
- Replaces raw JavaScript exception text in the Lounge with a guest-safe fallback message while still logging the actual exception to the browser console for debugging.

## Upcoming Events navigation

The full `/queendom-events/` page now includes clear Flowtel navigation:

- **GO TO MY SUITE** → `/client/?suite=1`
- **RETURN TO THE LOUNGE** → `/client/?lounge=1`
- **RETURN TO THE LOUNGE** is repeated at the bottom of the full agenda so a member never has to scroll all the way back to the top after browsing a long event list.

The Squarespace/Queendom `?embed=1` marketing view intentionally hides these internal Flowtel navigation controls.

## Access and privacy

No access-rule changes:

- all Queendom members can still see published Queendom and Flow FM event marketing;
- Flow FM membership remains required to register for or enter Flow FM-exclusive rooms;
- protected Zoom details remain server-gated;
- My Upcoming Events remains authenticated;
- personal Womb Magic appointments remain private.

## Database

No migration is required.

Next migration number remains **070**.

## Caddie Magic

Caddie Magic remains **v0.6.0**. No Caddie Magic files, schemas, permissions, or product behavior are changed by this release.
