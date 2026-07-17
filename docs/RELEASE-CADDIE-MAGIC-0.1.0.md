# Caddie Magic v0.1.0 — Moon Score Tracker Foundation

First Caddie Magic product release inside the Flowtel platform engine.

## Purpose

This release creates the first public-facing Caddie Magic MVP: a simple score tracker that lets players create a profile and log scores/swing thoughts with moon phase and moon day data stored behind the scenes.

## What changed

- Added `/caddie-magic/` as the Caddie Magic portal.
- Created a masculine Caddie Magic design system: private clubhouse, moonlit fairway, brass, leather, obsidian green, navy, and moon silver.
- Added account entry for players using Supabase Auth.
- Added Player Locker profile form.
- Added Round Log form with only the requested visible fields:
  - Date of Round, defaulted to today
  - Course Played
  - Score
  - Swing Thoughts
- Auto-tags each round with moon data behind the scenes:
  - moon phase
  - moon day
  - moon inner season
  - last new moon date
  - next new moon date
- Added Player Locker dashboard with latest score, total rounds, best score, and average score.
- Added Moon Scorecard / Flow Map-style grouping by moon phase.
- Added round history archive.
- Added Notes Under the Door placeholder and table foundation.
- Added Caddie Magic roadmap documentation.
- Added `/caddie-magic` Vercel rewrite.

## Database

Adds Supabase migration:

```text
migration-030-caddie-magic-moon-score-tracker.sql
```

This migration creates:

- `public.caddie_magic_player_profiles`
- `public.caddie_magic_round_logs`
- `public.caddie_magic_player_notes`

## Supabase instructions

Run this migration before sending the Caddie Magic portal to players:

```sql
-- database/migration-030-caddie-magic-moon-score-tracker.sql
```

## JS syntax checks

Run before shipping:

```bash
node --check caddie-magic/app.js
```

## First test checklist

1. Open `/caddie-magic/`.
2. Create a new player profile or sign in with an existing test player.
3. Confirm the Player Locker profile form appears if the player does not have a locker yet.
4. Save the Player Locker profile.
5. Log a round with date, course, score, and swing thoughts.
6. Confirm the round appears in Previous Rounds.
7. Confirm Moon Day and Moon Phase show in the history row.
8. Confirm the Moon Scorecard groups the round into the correct moon phase.
9. Confirm Notes Under the Door shows the placeholder if no notes exist.
10. Confirm page still feels like Caddie Magic, not Flowtel.
