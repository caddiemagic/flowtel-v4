# Caddie Magic v0.1.2 — Velvety Navy Locker + Moon Score Map Refinement

Functional / visual expansion release for the Caddie Magic Moon Score Tracker.

## Purpose

This release evolved the original tracker into a fuller private locker experience and added a dedicated Moon Score Map page for reviewing rounds by moon phase.

## What changed

- Rebuilt `/caddie-magic/` into a velvety navy, hunter green, antique gold, and moon-silver locker room.
- Kept the Round Log limited to the requested essentials:
  - Date
  - Course
  - Score
  - Swing Thoughts
- Added a Moon Score Data snapshot with:
  - current Moon Day
  - Moon Phase
  - theme copy
  - last new moon
  - next new moon
- Added a clickable 28-position moon wheel for day-level round review.
- Added day-level score / swing-thought review inside the dashboard.
- Refined the Player Locker around latest score, moon data, latest swing thought, Notes Under the Door, and previous rounds.
- Added `/caddie-magic/score-map/` with Current Moon, Last Moon, and All filters.
- Added `/caddie-magic/score-map/printable/` as the downloadable / save-PDF Score Map exercise.

## Supabase

No Supabase migration required.

## JS syntax checks

- `node --check caddie-magic/app.js`
- `node --check caddie-magic/score-map/app.js`

## First test checklist

1. Open `/caddie-magic/`.
2. Confirm the velvety navy locker styling loads.
3. Confirm the Moon Score Data dashboard appears after sign-in.
4. Confirm the 28-day wheel is clickable.
5. Confirm the Player Locker shows latest score and swing thought.
6. Open `/caddie-magic/score-map/`.
7. Confirm Current Moon / Last Moon / All filters work.
8. Open the printable Score Map exercise and confirm it prints cleanly.
