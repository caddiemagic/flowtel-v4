# Caddie Magic v0.1.9 — Gold Number Wheel + Thought Mode Cleanup

## Purpose

This release softens the medicine wheel number styling, removes quotation marks from swing thought displays, and refines the thought-only logging mode so players can log a thought without seeing the date field.

## What changed

- Updated the dashboard medicine wheel number buttons to use gold rings with transparent centers instead of ivory-filled circles.
- Changed the number text color to match the gold header styling.
- Kept selected and current moon-day states visible with a softer gold treatment.
- Removed decorative quotation marks from swing thoughts anywhere they appear in Caddie Magic.
- Removed the date field when **Just a Swing Thought** mode is selected.
- Thought-only entries now automatically use today’s date behind the scenes.
- Updated the thought-only card heading to **Log Your Thoughts** while reflection mode is selected.
- Updated the thought-only submit button text to **Log Your Thoughts**.
- Updated cache versions to `0.1.9`.

## Supabase

No Supabase migration required.

## JS syntax checks

- `node --check caddie-magic/app.js`
- `node --check caddie-magic/score-map/app.js`
- `node --check caddie-magic/collective-map/app.js`

## First test checklist

1. Open `/caddie-magic/`.
2. Confirm the medicine wheel numbers now use gold rings with transparent centers.
3. Confirm the number text is gold instead of dark-on-ivory.
4. Switch the form to **Just a Swing Thought**.
5. Confirm the date field disappears.
6. Confirm the card heading changes to **Log Your Thoughts**.
7. Confirm the submit button also says **Log Your Thoughts**.
8. Save a thought-only entry and confirm it still stores successfully.
9. Confirm swing thoughts no longer show quotation marks in the dashboard, history, Score Map, or Collective Swing Map.
