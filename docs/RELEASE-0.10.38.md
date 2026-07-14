# Flowtel v0.10.38 — Seamless Entry + Responsive Suite Temple Polish

Release date: 2026-07-14

## Summary

This release gives the Phase 1 guest arrival and Suite a launch-critical visual and responsive polish pass. It adds the Flowtel bell as the waiting experience during access preparation and login, rebuilds the Suite Medicine Wheel presentation for reliable desktop and mobile proportions, replaces seasonal emojis with moon-phase symbols, elevates the Suite into a softer temple chamber, and installs the Summer Waning Moon 2026 calendar in the Planning Room.

## What changed

### Seamless Flowtel entry

- Added a full-screen bell waiting experience to the Flowtel client while login, access verification, check-in, and room routing are in progress.
- Added the same bell transition to the Smart Entry remembered-session check.
- Added the bell transition to first-time beta access creation and automatic login.
- Added patient long-load copy after 5.5 seconds so guests know their room is still being prepared.
- Added mobile-safe spacing, clear status language, and loading-state scroll locking.
- Replaced the older moon-only Preparing Room scene with the concierge bell image.

### Responsive Medicine Wheel repair

- Rebuilt the Suite wheel presentation around a dedicated square orbit so rings, day markers, star, and compass center scale from one geometry.
- Uses fluid day-marker sizes and ring spacing based on the available width.
- Keeps both gold rings within the orbit from narrow 320px phones through desktop widths.
- Re-renders after the Suite becomes visible so the wheel uses the final rendered container width.
- Preserves Day 1 below West, Day 28+ above West, counter-clockwise ordering, room click behavior, and current-day logic.
- Removed the old mobile card offsets that pushed seasonal cards outside the wheel boundary.

### Seasonal card facelift

- Replaced seasonal emojis with calendar-inspired moon symbols:
  - New Moon = Inner Winter
  - Half Full Moon = Inner Spring
  - Full Moon = Inner Summer
  - Half New Moon = Inner Autumn
- Added a soft current-season highlight.
- Desktop cards remain arranged around the wheel within the chamber boundary.
- Mobile cards move into a contained two-by-two grid beneath the wheel.
- Mobile order follows the cycle: Winter, Spring, Summer, Autumn.

### Suite temple polish

- Added a winged-scarab Suite arrival header using the existing transparent Queendom asset.
- Refined Suite borders, shadows, gradients, spacing, Moon Magic pill, Current Room card, and wheel chamber.
- Rebalanced the desktop Suite grid to give the Medicine Wheel more intentional visual presence.
- Added narrow-phone refinements down to 320px without changing Suite logic or data behavior.

### Planning Room calendar

- Added `flow-fm/assets/planning/summer-waning-moon-2026.pdf`.
- Added **Summer Waning Moon 2026** as the featured current calendar in the Planning Room.
- Added the Jul 14 / Aug 12 New Moons and Jul 29 Full Moon to the calendar card.
- Updated the phase teaching key to explicitly pair each moon phase with its Inner Season.
- Prevented older calendar cards from displaying undefined New Moon / Full Moon values when those dates are not present in their data.

## Files changed

- `beta-request/app.js`
- `beta-request/index.html`
- `beta-request/styles.css`
- `client/app.js`
- `client/index.html`
- `client/styles.css`
- `enter/app.js`
- `enter/index.html`
- `enter/styles.css`
- `flow-fm/assets/planning/summer-waning-moon-2026.pdf`
- `flow-fm/planning-room/index.html`
- `flow-fm/planning-room/page.js`
- `flow-fm/styles.css`
- `shared/moon-calendars.js`
- `docs/CHANGELOG.md`
- `docs/RELEASE-0.10.38.md`

## Supabase

No Supabase migration required.

## Syntax checks

- `node --check client/app.js`
- `node --check enter/app.js`
- `node --check beta-request/app.js`
- `node --check flow-fm/planning-room/page.js`
- `node --check shared/moon-calendars.js`

CSS files were parsed with `tinycss2`; no stylesheet parse errors were found.

## Responsive geometry checks

The wheel geometry was calculated at 320px, 360px, 390px, 430px, 700px, 900px, and 1440px viewport widths. At every checked width, the computed outer gold ring remains below 100% of the square orbit and therefore stays contained.

## First test checklist

1. Open `/enter/` in a browser with no remembered session and confirm the bell appears briefly while Flowtel checks for a room key, then reveals the two entry choices.
2. Open `/enter/` with a remembered Supabase session and confirm the bell remains visible while the guest is routed into Flowtel.
3. Submit `/beta-request/` and confirm the bell screen appears during access creation and automatic login.
4. Log in from `/client/` and confirm the bell loading screen appears instead of a blank or frozen login page.
5. Test check-in and confirm the bell appears while the stay is saved and the Suite is prepared.
6. Open the Suite on desktop and confirm the Medicine Wheel is a true circle with two contained rings and evenly spaced days.
7. Confirm Day 1 remains below West, Day 28+ remains above West, and days move counter-clockwise.
8. Confirm seasonal cards use moon symbols rather than emojis and the active season receives a soft highlight.
9. Test the Suite at 320px, 360px, 390px, and a large phone width. Confirm there is no horizontal scrolling, clipping, or card overflow.
10. Confirm the mobile seasonal cards appear as a two-by-two grid beneath the wheel in Winter, Spring, Summer, Autumn order.
11. Click a day and a seasonal card to confirm previous-visit and Powder Room navigation still work.
12. Open `/flow-fm/planning-room/` with a permitted practitioner-level account and confirm **Summer Waning Moon 2026** appears as the featured current calendar.
13. Open the new calendar PDF and confirm the Jul/Aug calendar loads correctly.
