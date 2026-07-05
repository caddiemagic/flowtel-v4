# Flowtel v0.9.15 — Powder Room Label + Mirror Spacing Polish

This release completes a tiny Powder Room language and spacing pass.

## Changes

- Changed the Powder Room hero eyebrow from **FLOW MAP** to **ANONYMOUS REFLECTIONS**.
- Added a little more breathing room between the return buttons and **Notes left on the mirror**.
- Updated `/cycle-data/` cache-busting to `v=0.9.15`.

## Database

No Supabase migration required.

## QA

1. Open any Powder Room from the Medicine Wheel seasonal cards.
2. Confirm the top eyebrow reads **ANONYMOUS REFLECTIONS**.
3. Confirm the buttons and **Notes left on the mirror** heading have a little more space between them.
4. Confirm normal Cycle Data dashboard views still keep the **FLOW MAP** eyebrow.
