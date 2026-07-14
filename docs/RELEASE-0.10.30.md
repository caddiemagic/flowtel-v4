# Flowtel v0.10.30 — Public Cycle Tracker Refinement + PDF Snapshot Cleanup

## Summary

This release softens the public Cycle Tracker after the v0.10.29 temple facelift. It keeps the luxurious Flowtel / Egyptian direction, but removes the oversized hero treatment and makes the experience feel more dainty, calm, and useful for public visitors.

## What changed

- Removed the large top **Track Your Cycle** hero from the public tracker.
- Removed the heavy carved pillar treatment from the public tracker page.
- Kept the scarab as a smaller refined motif.
- Added a transparent/cropped scarab asset for tracker use:
  - `assets/queendom-scarab-sundisk-transparent.png`
- Moved the public tracker intro and privacy note into a smaller, quieter opening area.
- Reduced oversized tracker result typography, including the day-result headline.
- Reduced the **Want your cycle map to remember you?** CTA headline scale.
- Changed feels-like season labels to simple season names:
  - Winter
  - Spring
  - Summer
  - Autumn
- Removed **Inner** from displayed feels-like season language.
- Removed **Wing** from the public tracker result data chart.
- Cleaned up the moon-tracking result data by removing a duplicate Next New Moon pill.
- Updated the PDF/print snapshot layout to fit more cleanly on one page.
- Removed the rose compass / mini wheel from the PDF snapshot output.

## Supabase

No Supabase migration required.

## Syntax checks

- Extracted the inline public tracker script from `tracker/index.html` and checked it with `node --check`.

## First test checklist

1. Open `/tracker/`.
2. Confirm there is no giant hero or pillar treatment at the top.
3. Confirm the scarab appears as a smaller motif without a visible rectangular background.
4. Complete the bleed/cycle-day path.
5. Confirm the result card no longer includes **Wing**.
6. Confirm feels-like season values show as Winter, Spring, Summer, or Autumn.
7. Complete the moon-tracking path.
8. Confirm there is only one Next New Moon field.
9. Use **Download / Save PDF** and confirm the PDF snapshot is one-page oriented and does not include the rose compass wheel.
