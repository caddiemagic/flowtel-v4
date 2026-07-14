# Flowtel v0.10.37 — Suite Checkout + Tracker CTA Combined

Release date: 2026-07-14

## Summary

This release combines the previously separated Suite checkout cleanup and public tracker CTA copy swap into one patch for projects that have not yet applied v0.10.35 or v0.10.36.

## Changes

- Removed the duplicate **Check Out** button from the Suite action row.
- Kept checkout inside the Flowtel Lounge.
- Kept **Clock Into the Flowtel** visible only for practitioner-level roles.
- Guarded the old Suite checkout button binding so the Suite does not error when the removed button is absent.
- Changed the public tracker result action-row button to **Enter The Flowtel**.
- Changed the Enter the Queendom card button to **Join The Queendom**.
- Kept both public tracker CTA buttons pointing to the Queendom page.
- Updated client cache-busting to `0.10.37`.
- Removed the optional helper line under the beta access code field on the Request Flowtel Access page.

## Supabase

No Supabase migration required.

## Syntax checks

- `node --check client/app.js`
- Extracted the inline public tracker script from `tracker/index.html` and checked it with `node --check`.

## First test checklist

1. Open the Suite and confirm the duplicate **Check Out** button is gone.
2. Confirm **Go to Flowtel Lounge** still appears.
3. Open the Lounge and confirm checkout still lives there.
4. Log in as owner/practitioner and confirm **Clock Into the Flowtel** still appears.
5. Open `/tracker/` and complete the tracker flow.
6. Confirm the result action-row button reads **Enter The Flowtel**.
7. Confirm the Enter the Queendom card button reads **Join The Queendom**.
8. Confirm both tracker CTA buttons route to the Queendom page.
9. Confirm the beta request form only labels the field **Beta access code**.
