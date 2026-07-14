# Flowtel v0.10.36 — Public Tracker CTA Copy Swap

Release date: 2026-07-14

## Summary

This release makes a small public Cycle Tracker copy correction so the two Queendom/Flowtel CTAs read with the intended clarity.

## Changes

- Changed the tracker result action-row button from **Join the Queendom to Enter the Flowtel** to **Enter The Flowtel**.
- Changed the Enter the Queendom card button from **Enter The Flowtel** to **Join The Queendom**.
- Kept both buttons pointing to the Queendom registration/home page for public users.

## Supabase

No Supabase migration required.

## QA checklist

1. Open `/tracker/`.
2. Complete the tracker flow.
3. Confirm the result action-row button reads **Enter The Flowtel**.
4. Confirm the Enter the Queendom card button reads **Join The Queendom**.
5. Confirm both still route to the Queendom page.
