# Caddie Magic v0.1.8 — Reflections + Collective Swing Map

## Purpose

This release separates scored rounds from thought-only reflections, makes swing thoughts optional for a scored round, simplifies the personal Score Map cards, and adds a standalone anonymous Collective Swing Map inspired by the Flowtel Powder Rooms.

## What changed

### Scorecard and Player Profile language

- Renamed the main hero title from **My Moon Score Data** to **SCORECARD**.
- Updated the hero copy to: **Track your scores and swing thoughts to uncover patterns over time.**
- Renamed visible **Player Locker** labels to **Player Profile**.
- Changed the player profile heading to display only the player’s name.
- Updated the profile copy to: **Your private locker on the moon.**
- Renamed **Moon Score Map** to **SCORE MAP** and removed its subtitle.

### Scored rounds and thought-only reflections

- Swing Thoughts are now optional when logging a scored round.
- Added a low-key entry mode switch:
  - **Log a Round**
  - **Just a Swing Thought**
- Thought-only reflections require only a date and swing thought.
- Reflection entries are stored with moon data and appear in the Scorecard, moon-day detail, history, personal Score Map, and Collective Swing Map.

### Personal Score Map refinement

- Personal Score Map cards now show only:
  - score or Reflection label
  - swing thought
- Clicking a card opens a detail popout with the remaining date, course, moon-day, moon-phase, entry-type, and score information.
- Score Map calculations ignore thought-only entries when calculating score averages and best scores.

### Collective Swing Map

- Added `/caddie-magic/collective-map/`.
- Shows swing thoughts anonymously across all participating Caddie Magic players.
- Collective cards show only:
  - Moon Day
  - Swing Thought
- Does not expose names, emails, courses, scores, dates, or player-profile IDs.
- Uses the four cardinal club quadrants:
  - West Club — New Moon
  - South Club — First Quarter
  - East Club — Full Moon
  - North Club — Last Quarter
- Supports Current Moon, Last Moon, and All filters.
- The map and quadrant rows expand as more anonymous thoughts are added.

## Supabase migration

Run:

`database/migration-040-caddie-magic-reflections-collective-swing-map.sql`

This migration:

- Adds `entry_type` and `share_anonymously` to `caddie_magic_round_logs`.
- Makes `course_played`, `score`, and `swing_thoughts` nullable.
- Adds validation for scored rounds versus thought-only reflections.
- Adds the authenticated anonymous RPC `caddie_magic_get_collective_swing_thoughts`.

## JavaScript syntax checks

- `node --check caddie-magic/app.js`
- `node --check caddie-magic/score-map/app.js`
- `node --check caddie-magic/collective-map/app.js`

## First test checklist

1. Run migration 040 in Supabase.
2. Open `/caddie-magic/` and confirm the hero says **SCORECARD**.
3. Confirm the Player Profile heading shows only the player’s name.
4. Log a scored round without a swing thought.
5. Confirm the score saves successfully.
6. Select **Just a Swing Thought** and save a thought without course or score.
7. Confirm the reflection appears in the Scorecard, history, and moon-day detail.
8. Open `/caddie-magic/score-map/`.
9. Confirm cards show only score / Reflection and swing thought.
10. Click a Score Map card and confirm the detail popout opens.
11. Open `/caddie-magic/collective-map/`.
12. Confirm only anonymous Moon Day and swing-thought text are visible.
13. Confirm the map expands when multiple thoughts appear in a quadrant.
