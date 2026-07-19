# Caddie Magic v0.4.1 — Player-Only Access + Phase Language

## Purpose

This release creates a true Caddie Magic private-beta access boundary, gives the owner a player invitation queue, restores the complete v0.4.0 Caddie Magic migration set inside the updated Flowtel project, and codifies the framework distinction between a multi-day moon phase and the exact moon event that marks its peak.

## What changed

### Player-only product access

- Added `flowtel_product_access` as the shared product-access registry.
- Added the explicit `player` access role.
- Player-only accounts receive Caddie Magic access and no Flowtel access.
- Owner/admin accounts receive both products.
- Existing Flowtel and Caddie Magic users are safely backfilled.
- Added a browser route guard that redirects player-only sessions away from protected Flowtel member pages.
- Added restrictive RLS policies to the core Flowtel and Caddie Magic tables so product access is enforced in the database as well as the interface.
- Updated Flowtel profile creation so an explicit Caddie-only account cannot create a Flowtel profile by visiting the Flowtel doorway.

### Private beta invitations

- New Caddie Magic registration is invitation-only.
- Added a personal invitation code field to the Caddie Magic clubhouse doorway.
- Invitation links can prefill both the code and the invited email.
- New invited auth users are automatically assigned Player-Only Access.
- Existing Flowtel auth users can claim a Caddie Magic invitation without creating a duplicate account.

### Concierge Desk player administration

Added a new **Caddie Players** area where owner/admin users can:

- create a private player invitation;
- copy the personal invitation link;
- view open, claimed, and revoked invitations;
- see active Caddie Magic players;
- confirm whether Flowtel is blocked;
- pause or restore Caddie Magic beta access.

### Phase language

Updated visible Caddie Magic phase labels to distinguish the multi-day phase span from the exact moon event:

- New Moon Phase — Days 27–5
- First Quarter Phase — Days 6–11
- Full Moon Phase — Days 12–19
- Last Quarter Phase — Days 20–26

Exact event labels such as **Next Full Moon** remain unchanged because they refer to the astronomical peak, not the entire phase span.

### File organization and merge protection

- Audited the uploaded `flowtel-v4(36).zip` against Caddie Magic v0.4.0.
- Confirmed the Caddie Magic application pages were retained.
- Found that migration 043 was missing from the updated ZIP and restored it.
- Added a canonical Caddie Magic README, file manifest, phase-language guide, migration registry, and validation script.
- Added `node scripts/validate-caddie-magic.mjs` to detect missing canonical files or regressed phase labels before future merged releases ship.

## Supabase

Run:

`database/migration-044-caddie-magic-player-only-access-private-beta.sql`

Migration 043 was restored to the repository because it was absent from the uploaded ZIP. If migration 043 was already run in Supabase after v0.4.0, do not run it again merely because the file was restored.

## JavaScript checks

- `shared/supabase.js`
- `shared/product-access.js`
- `shared/caddie-magic-access.js`
- `shared/profiles.js`
- `caddie-magic/app.js`
- `caddie-magic/score-map/app.js`
- `caddie-magic/collective-map/app.js`
- `caddie-magic/compass/app.js`
- `caddie-magic/compass/admin/app.js`
- `manager/app.js`
- `scripts/validate-caddie-magic.mjs`

## First test checklist

1. Confirm migration 043 has already been installed, then run migration 044.
2. Enter `/manager/` as owner/admin and open **Caddie Players**.
3. Create a player invitation and copy the link.
4. Open the link in a private browser and create the invited account.
5. Confirm the player can enter Caddie Magic and create a Player Profile.
6. Confirm the player appears in the Concierge Desk as Player-Only with Flowtel blocked.
7. While signed in as that player, manually open `/client/` and confirm the session redirects to Caddie Magic.
8. Confirm the player cannot read or create Flowtel profile, stay, reflection, relationship, or Flow FM table rows.
9. Confirm owner/admin can still access both Flowtel and Caddie Magic.
10. Confirm Score Map, Locker Room, Caddie Compass, assignment, and schedule phase labels use **First Quarter Phase** and **Last Quarter Phase**.
11. Run `node scripts/validate-caddie-magic.mjs` from the project root.
