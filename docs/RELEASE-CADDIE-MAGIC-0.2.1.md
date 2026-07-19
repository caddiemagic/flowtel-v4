# Caddie Magic v0.2.1 — Score Map View Toggle

## Purpose

This release adds a simplified score-only view to the personal Score Map while preserving thoughts + scores as the default experience.

## What changed

- Added a Score Map display toggle with:
  - **Thoughts + Scores**
  - **Scores Only**
- The Score Map defaults to **Thoughts + Scores** each time it opens.
- Added the calendar date to each card in the default view.
- The default view continues to show the swing thought on the left and numeric score on the right.
- The **Scores Only** view removes thought-only reflections and displays only numeric scores in the four moon-phase quadrants.
- Score-only number cards remain clickable so the full scorecard detail popout is still available.
- The map count and player-view label update to reflect the selected display mode.
- Updated cache versions to `0.2.1`.

## Supabase

No Supabase migration required.

## JavaScript syntax checks

- `node --check caddie-magic/score-map/app.js`

## First test checklist

1. Open `/caddie-magic/score-map/`.
2. Confirm **Thoughts + Scores** is selected by default.
3. Confirm default cards display the swing thought, calendar date, and score.
4. Select **Scores Only**.
5. Confirm thought-only reflections disappear from the map.
6. Confirm each remaining card displays only its numeric score.
7. Click a score number and confirm the full detail popout still opens.
8. Change Current Moon / Last Moon / All while in Scores Only mode and confirm the view remains filtered correctly.
