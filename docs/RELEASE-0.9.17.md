# Flowtel v0.9.17 — Flow Map Consent + Practice Polish

## Purpose

This release turns the Flow Map Practice into a more complete client/mentor reflection activity while adding consent controls for anonymous Powder Room sharing.

## Included

- Added reflection-level Powder Room sharing control under the Suite Reflection box.
- Sharing is checked by default; guests can uncheck it per reflection.
- Added a matching sharing control for checkout notes.
- Removed quiet/no-note check-ins from Flow Map note pills.
- Added checkout notes to Flow Map practice cards and Cycle Data entry logs.
- Added checkout notes to anonymous Powder Room eligibility when sharing is allowed.
- Added Flow Map view toggles for mentors/admins: My Flow Map, individual clients, and all client data.
- Added Last 3 Cycles option to the Flow Map cycle selector.
- Kept the default Flow Map view on the most recently completed cycle when available.
- Added mobile quadrant order: Winter, Spring, Summer, Autumn.
- Improved Print / Save PDF so the Flow Map prints in the cross-axis layout.
- Added a Schedule Call button to the connected Mentor to the Moon card.
- Added View Flow Map under the Current Room pill.

## Supabase

Run:

`database/migration-020-flow-map-consent-practice-polish.sql`

This migration adds:

- `flowtel_reflections.share_in_powder_rooms`
- `flowtel_stays.reflection_share_in_powder_rooms`
- `flowtel_stays.checkout_share_in_powder_rooms`
- mentor scheduling URL profile fields
- refreshed cycle-data and Powder Room RPCs

## Test

1. Save a reflection with the Powder Room share box checked.
2. Save another reflection with the box unchecked.
3. Confirm only the checked reflection appears in a Powder Room.
4. Open `/flow-map/` and confirm only entries with notes appear.
5. Confirm checkout notes appear as Checkout note pills.
6. Test Flow Map as a mentor with My Flow Map, client view, and All My Clients.
7. Print / Save PDF and confirm the cross-axis layout remains.
8. Open the Suite and confirm View Flow Map appears under Current Room.
9. Confirm the Schedule Call button appears when a Mentor to the Moon is connected.
