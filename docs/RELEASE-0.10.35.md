# Flowtel v0.10.35 — Suite Checkout Button Cleanup

## Summary

This release removes the duplicate **Check Out** button from the guest Suite action row because checkout already lives inside the Flowtel Lounge.

## What changed

- Removed the Suite-level **Check Out** button.
- Kept **Go to Flowtel Lounge** as the path to the Lounge checkout experience.
- Kept **Clock Into the Flowtel** visible only for practitioner-level roles.
- Guarded the old checkout button event binding so the Suite does not error when the removed button is absent.
- Updated client cache-busting to `0.10.35`.

## Supabase

No migration required.

## Syntax checks

- `node --check client/app.js`

## First test checklist

1. Open the Suite as a client/beta guest.
2. Confirm **Check Out** no longer appears in the Suite action row.
3. Confirm **Go to Flowtel Lounge** still appears.
4. Open the Lounge and confirm checkout still exists there.
5. Log in as owner/practitioner and confirm **Clock Into the Flowtel** still appears.
