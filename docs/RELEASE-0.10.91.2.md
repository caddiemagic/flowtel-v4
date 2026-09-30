# Flowtel v0.10.91.2 — Mobile Event Experience Polish

**Release date:** September 30, 2026
**Source base:** current GitHub `main` at `142cd099f964978a108711b40ebc5b47f143257b` (v0.10.91.1 + invite-redirect bridge)
**Database:** no migration
**Latest migration:** 078
**Next migration:** 079
**Vercel functions:** 12 / 12

## Purpose

Make the current event experience launch-ready on phones without attempting the larger post-launch mobile redesign. This release fixes broken mobile event openings, protected gathering entry, cramped layouts, image cropping, inconsistent claimed-seat styling, and uneven/poorly stacked Lounge actions while preserving desktop behavior and the existing event-access/Acuity boundaries.

## Queendom Calendar

- **COMING UP NEXT** event-copy areas are now native links with JavaScript enhancement rather than JavaScript-only buttons.
- Preview events can open from the full six-month preview feed even when the event is not inside the month currently displayed in the calendar grid.
- Month-calendar event tiles also have native event-detail URLs as a mobile fallback.
- Direct calendar deep links support `openEvent` plus the exact recurring `occurrence` id, and closing the sheet removes that query state.
- The registered preview action remains **✓ SEAT CLAIMED · OPEN EVENT** and now opens the protected Event Room directly.
- The calendar event sheet no longer attempts the protected Zoom workflow itself. **ENTER GATHERING** hands off to the full Event Room, which owns check-in, cycle-day sharing, Acuity/Zoom readiness, and attendance.
- Hero copy now says gatherings happen **in the Flowtel** rather than inside Flow FM.

## Mobile event sheet

The month-calendar event popup is tightened for phones:

- smaller image footprint;
- reduced title/description density;
- viewport-aware `92dvh` maximum height;
- single-column actions;
- touch-friendly controls;
- sticky/accessible close control.

A claimed seat now uses the same pink/gold treatment as the primary Flowtel event action and visibly reads **✓ SEAT CLAIMED**.

## Protected Zoom entry

Mobile browsers can block `window.open()` if it happens only after asynchronous security checks. The protected Event Room now establishes the destination window synchronously from the user's tap, then completes the existing Flowtel/Acuity/check-in checks before navigating that window to Zoom. If the browser does not allow the new tab, Flowtel falls back to the current tab instead of appearing unresponsive.

The existing security checks are unchanged; this only changes how the already-authorized meeting URL is opened.

## Event artwork

Member-facing event artwork now uses `object-fit: contain` in the calendar, calendar dialog, Upcoming Events cards, and Lounge/My Upcoming Events card so the complete uploaded event graphic remains visible rather than being cropped differently in each location.

The frame may still vary by context, but the source artwork is preserved.

## Upcoming Events / Event Room

On narrow screens:

- event cards stack date → artwork → details → actions;
- event art is reduced and centered;
- text spacing and titles are tightened;
- claimed-state actions use the pink button treatment;
- Event Room content fits as a bottom-style mobile sheet with vertically stacked actions.

## Flowtel Lounge / My Upcoming Events

- **OPEN EVENT** is now a native protected Event Room link rather than a JavaScript-only action.
- **OPEN EVENT** and **ADD TO CALENDAR** share the same full action width/minimum height.
- My Upcoming Events mobile cards stack image → details → actions.
- Calendar choices stack one per row on narrow screens.
- Event artwork uses the same non-cropping treatment.

## Not part of this release

This is a launch repair, not the planned full Flowtel mobile reorganization. The larger mobile redesign remains intentionally deferred until after launch so navigation, hierarchy, cards/sheets, and above-the-fold density can be redesigned as one system rather than patched incrementally.

## Database / environment / Vercel

No database change. Do **not** rerun migration 078.

No environment-variable changes.

No `/api/*.js` function is added or removed. Function budget remains **12 / 12**.

## First live proof

1. On an iPhone/Android-sized viewport, open `/queendom-calendar/` and tap an event in **COMING UP NEXT**, including one outside the displayed month. Confirm the event opens.
2. Tap a month-calendar event and confirm the event sheet is compact, scrollable, and does not crowd the viewport.
3. Confirm event artwork is fully visible rather than cropped in the preview/calendar dialog, `/queendom-events/`, and Lounge/My Upcoming Events.
4. On a claimed event, confirm the pink **✓ SEAT CLAIMED** state and use **ENTER GATHERING** to reach the protected Event Room.
5. From the Event Room, confirm **JOIN ZOOM** works on mobile after normal Flowtel check-in/cycle-day requirements.
6. In Lounge/My Upcoming Events, confirm **OPEN EVENT** works as a real link, matches **ADD TO CALENDAR** in width/height, and all actions stack cleanly on mobile.
7. Regression-check claim/unclaim, recurring-occurrence isolation, Series/Vortex rooms, Event Flow Map, v0.10.91 paid-member activation, Womb Magic, and Caddie Magic.

Source validation does not equal live production verification.
