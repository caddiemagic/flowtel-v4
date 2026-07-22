# Caddie Magic Application

This directory is the canonical Caddie Magic product surface inside the shared Flowtel repository.

## Canonical pages

- `/caddie-magic/` — Player Profile, Moon Scorecard, entry logging, Caddie Network status, and service doorway
- `/caddie-magic/score-map/` — private player Score Map
- `/caddie-magic/collective-map/` — anonymous Locker Room
- `/caddie-magic/compass/` — player-owned Caddie Compass and Calendar
- `/caddie-magic/compass/club/` — personalized North, East, South, or West Cardinal Club room
- `/caddie-magic/caddies/` — approved Caddie directory, player request, accepted-only availability, and consultation scheduling
- `/caddie-magic/caddie-desk/` — owner-approved Caddie Profile, player requests, availability, consultations, and read-only preparation
- `/caddie-magic/compass/admin/` — retained legacy owner/admin Compass history surface; not part of Caddie Network permissions

## Current service boundary

Every Caddie is a player first. The Caddie capability is attached to an existing player account through owner invitation and approval.

Caddies may:

- maintain a professional Caddie Profile;
- accept or decline player requests;
- set simple recurring Calls/Caddying availability and date exceptions;
- see scheduled consultations and mark completed meetings;
- open only the player data consented to for accepted consultation preparation.

Caddies may not:

- create assignments;
- enter VIP Caddie Master conversations;
- leave Caddie Master Notes or complete Scorecard Reviews;
- edit player Scorecard, Score Map, Compass, or Calendar records;
- access Flowtel unless separately granted Flowtel product access.

## Shared Caddie Magic modules

- `shared/caddie-magic-access.js`
- `shared/caddie-magic-compass.js`
- `shared/caddie-magic-network.js`
- `shared/caddie-magic-schedule.js`
- `shared/caddie-magic-moon-calendar.js`
- `shared/product-access.js`

## Access boundary

Caddie Magic players use the explicit product-access registry introduced in migration 044. A player-only account has:

- `caddie_magic_access = true`
- `flowtel_access = false`
- `access_role = 'player'`

Both historical migration 052 bodies are already live and must not be rerun or renamed. Migration 053 adds controlled courses, Scorecard Review credits, VIP Caddie Master access, and the shared scheduling foundation without replacing Player identity.

Current integrated version: **Caddie Magic v0.5.1 / Flowtel v0.10.68.1**.

Run `node scripts/validate-caddie-magic.mjs` before shipping a merged release.
