# Flowtel v0.9.22 — Flow Map Room Expansion + Printable Map

## Summary
Adds a dedicated printable blank Flow Map and expands the live Flow Map canvas so crowded seasonal quadrants have more vertical room instead of feeling cramped.

## Changes

- Added a **Printable Flow Map** button on the Flow Map Practice screen.
- Added `/flow-map/printable/`, a clean one-page blank Flow Map designed for printing or saving as a PDF.
- Added a Flow Map room-expansion protocol:
  - counts notes in each seasonal quadrant,
  - expands the top or bottom row when a season needs more space,
  - moves the horizontal axis with the expanding row,
  - gently reduces note size when a quadrant becomes dense.
- Added the experience line into Flow Map practice copy: **There’s always room on the moon.**
- Updated Flow Map cache-busting to `v=0.9.22`.

## Database

No Supabase migration required.

## QA

1. Open `/flow-map/` with a cycle that has multiple notes in one season.
2. Confirm the notes shrink gently and the map creates more vertical room.
3. Confirm the horizontal axis moves with the expanded seasonal row.
4. Click **Printable Flow Map**.
5. Confirm the blank Flow Map opens at `/flow-map/printable/`.
6. Click **Download / Save PDF** and confirm the print preview is a clean one-page map.
