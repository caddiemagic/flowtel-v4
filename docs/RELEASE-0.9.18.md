# Flowtel v0.9.18 — Master Powder Room Consent + Flow Map Practice Polish

## Summary

This release replaces reflection-level Powder Room sharing controls with one guest-level master sharing setting, then polishes the Flow Map Practice experience for mentor/client review, mobile Suite layout, and cleaner note cards.

## Changes

- Removed per-reflection Powder Room sharing toggles from the Reflection and Checkout forms.
- Added one master **Powder Room Sharing** setting in the Suite Reflection card.
- Master setting controls all of the guest's reflections and checkout notes for Powder Room visibility.
- Powder Rooms continue to show only anonymous reflections from guests who have not opted out.
- Existing per-reflection sharing flags are normalized back to true so the profile-level opt-out is the single source of truth.
- Flow Map controls now use a stronger grid layout so profile names do not push buttons out of alignment after loading.
- Flow Map note pills no longer show timestamps.
- Flow Map note pills now say **Felt like Winter/Spring/Summer/Autumn** instead of **Feels like**.
- View Flow Map now sits under the Current Room pill instead of inside it.
- Mobile Flowtel Medicine Wheel spacing was tightened so the number ring sits closer to the outer ring.
- Mobile Medicine Wheel card spacing was expanded so all four season cards fit inside the larger wheel container.
- The You Are Here star position was tightened closer to the outer ring.
- Flow Map print layout still preserves the cross-axis view.
- Cache-busted Client, Cycle Data, and Flow Map assets to v0.9.18.

## Database

Run:

`database/migration-021-master-powder-room-sharing.sql`

## QA

1. Open Suite as a guest.
2. Confirm there is one master Powder Room Sharing setting, not per-reflection checkboxes.
3. Toggle sharing off and save a reflection.
4. Confirm that guest's notes do not appear in Powder Rooms.
5. Toggle sharing on and confirm future/existing notes are eligible again.
6. Open `/flow-map/` and confirm the control card stays aligned after the profile name loads.
7. Confirm Flow Map notes do not show timestamps.
8. Confirm note metadata says “Felt like …”.
9. Open Suite on mobile and confirm the wheel panel contains all four seasonal cards and the number ring sits tighter to the outer ring.
10. Confirm View Flow Map appears under the Current Room pill.
