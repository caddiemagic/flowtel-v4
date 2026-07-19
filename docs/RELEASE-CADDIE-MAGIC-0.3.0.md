# Caddie Magic v0.3.0 — Caddie Compass + Moon Assignments

## Purpose

This release turns the Caddie Compass into a personalized initiation portal. Players record the first four clubs they would instinctively pull from their bag, the system maps them through NEWS, and the owner Caddie can create moon-phase assignments and exchange private Caddie Dispatches with each player.

## Player experience

New page:

- `/caddie-magic/compass/`

The setup maps the first four clubs in this exact order:

1. North
2. East
3. West
4. South
5. Center Staff — Putter

The player can:

- save and view their personalized five-club compass;
- edit it while it remains a draft;
- see the compass become sealed after the first assignment is sent;
- open current personalized assignments;
- move an assignment into progress;
- complete an assignment and record what it revealed;
- review completed initiation history;
- exchange private Caddie Dispatches;
- connect a dispatch to a specific assignment.

The main Scorecard now includes a direct **Caddie Compass** doorway.

## Owner / admin experience

The Flowtel Concierge Desk now includes a **Caddie Compass** queue.

The queue shows:

- players who have saved a compass;
- their four directional clubs;
- active and completed assignment counts;
- whether the latest private dispatch is waiting for an owner reply.

Detailed admin page:

- `/caddie-magic/compass/admin/?player=PLAYER_PROFILE_ID`

The owner can:

- view the player’s North, East, West, South, and Staff clubs;
- create a general or direction-specific assignment;
- assign a moon phase and optional due date;
- automatically snapshot the assigned club;
- read player completion reflections;
- mark assignments complete;
- exchange private Caddie Dispatches.

## Compass sealing rule

The compass remains editable until the first assignment is created. The first assignment automatically seals the active compass.

Existing assignment history always preserves the club assigned at the time the initiation was created.

## Supabase migration

Run:

`database/migration-042-caddie-magic-compass-assignments-dispatches.sql`

This migration creates:

- `caddie_magic_compasses`
- `caddie_magic_compass_assignments`
- `caddie_magic_compass_dispatches`
- secure player save/update/send RPCs
- secure owner assignment/list/send RPCs
- automatic compass sealing after the first assignment
- Concierge Desk player and dispatch summary support

## JavaScript syntax checks

- `node --check caddie-magic/app.js`
- `node --check caddie-magic/compass/app.js`
- `node --check caddie-magic/compass/admin/app.js`
- `node --check caddie-magic/score-map/app.js`
- `node --check caddie-magic/collective-map/app.js`
- `node --check shared/caddie-magic-compass.js`
- `node --check manager/app.js`

## First test checklist

1. Run migration 042 in Supabase.
2. Open `/caddie-magic/` and confirm **Caddie Compass** appears in the hero.
3. Open `/caddie-magic/compass/` as a player.
4. Save four different clubs in NEWS order.
5. Confirm the personalized compass displays North, East, West, South, and Putter as the center Staff.
6. Confirm the compass remains editable before the first assignment.
7. Open `/manager/` as owner/admin and choose **Caddie Compass**.
8. Open the player’s compass.
9. Create a direction-specific moon assignment.
10. Return as the player and confirm the assignment appears.
11. Confirm the compass now displays as sealed.
12. Move the assignment to In Progress and then complete it with a response.
13. Confirm the response appears in owner administration.
14. Send a player dispatch and confirm the Concierge Desk reports a dispatch waiting.
15. Reply from the owner page and confirm the player sees the response.
