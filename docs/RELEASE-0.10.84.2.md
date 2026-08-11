# Flowtel v0.10.84.2 — Queendom Calendar + Lounge Polish

Released: August 10, 2026

## Purpose

Make event discovery feel lighter and more luxurious in the Lounge and Queendom embed without changing the event source of truth, registration rules, protected Zoom access, or My Upcoming Events functionality.

## Lounge changes

- Keeps **UPCOMING EVENTS IN THE QUEENDOM** as the single default event surface in the Lounge.
- Centers the section hierarchy so the eyebrow, title, and supporting copy share one visual axis.
- Limits the Lounge discovery list to the next **3 upcoming events**.
- Keeps the discovery action intentionally simple: eligible unsaved events show **SAVE MY SEAT**; saved events show **✓ SEAT SAVED**; ineligible Flow FM events remain membership-protected.
- Removes **JOIN ZOOM** and personal-calendar controls from the default discovery list.
- Removes the always-visible redundant My Upcoming Events card from the Lounge.
- Adds **VIEW ALL UPCOMING EVENTS** and **MY UPCOMING EVENTS** as centered actions beneath the discovery list.
- Opens My Upcoming Events on demand as a separate Lounge state containing saved community events, the member's personal Womb Magic call, **JOIN ZOOM**, and **ADD TO CALENDAR**.
- Removes the phrase **“The experiences you have chosen.”**
- Preserves the existing event-registration continuation doorway and makes direct `#my-upcoming-events` links open the on-demand My Upcoming Events state.

## Queendom embed changes

- Changes `?embed=1` from an indefinitely long full agenda into a concise marketing module:
  - the next event is featured;
  - the following 3 events appear as compact **Coming Up** cards;
  - **VIEW ALL UPCOMING EVENTS** opens the full chronological agenda.
- Hides the full agenda filter/month tool strip in embed mode.
- Adds iframe height messaging so the recommended Squarespace embed can automatically fit the rendered event module rather than relying on a large fixed minimum height.
- Keeps **SAVE MY SEAT** routed through the existing first-party Flowtel registration doorway.

## Artwork changes

- Event artwork now preserves the full **16:10** composition in the chronological agenda, Queendom embed, and Lounge event cards.
- Uses `object-fit: contain` rather than cropping event posters with `cover`.
- Keeps a soft cream image surface so any natural breathing room around artwork remains visually intentional.
- Does not change the stored event artwork or require existing images to be re-uploaded.

## Access and privacy

No access rule changes:

- all Queendom members can see published Queendom and Flow FM events;
- Flow FM membership is still required to register for or enter Flow FM-exclusive rooms;
- public/embed event payloads still contain no Zoom URL/passcode, registration identity, or private Womb Magic appointment;
- Zoom and Add to Calendar actions remain inside the authenticated My Upcoming Events experience.

## Database

No migration is required.

Next migration number remains **070**.

## Caddie Magic

Caddie Magic remains **v0.6.0**. No Caddie Magic files, schemas, permissions, or product behavior are changed by this release.
