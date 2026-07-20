# Caddie Magic v0.4.5 — Compass Query + Medicine Wheel Hotfix

## Problem repaired

The Player Caddie Compass queried every active Compass visible to the authenticated session and then requested a single JSON object. Owner/admin accounts can see several players through RLS, so the query returned multiple rows and PostgREST raised:

`JSON object requested, multiple (or no) rows returned`

The Moon Score Data medicine wheel also placed the 28 Moon Day buttons too close to a direction-labeled image whose transparent canvas reaches almost to its edges. This caused the numbers to overlap the wooden handles and cardinal labels.

## What changed

- `getMyActiveCompass()` now filters by the signed-in user's `user_id`.
- Both personal and admin Compass lookups order by the newest Compass version and limit the result to one row.
- The direction-labeled wheel artwork now renders at 78% of the wheel container.
- Moon Day buttons now sit on an outer 45% ring, with 44.5% used on narrow phones.
- Every Caddie Magic HTML, CSS, and JavaScript cache reference was bumped to v0.4.5.

## Supabase

No migration is required. The existing data and RLS policies remain unchanged.

## JavaScript checks

- `shared/caddie-magic-compass.js`
- `caddie-magic/app.js`
- `caddie-magic/compass/app.js`
- `caddie-magic/compass/admin/app.js`
- `manager/app.js`

## First test checklist

1. Deploy the patch, including `shared/caddie-magic-compass.js`.
2. Hard refresh Caddie Magic and confirm the badge says v0.4.5.
3. Sign in as owner/admin and open the player-facing Caddie Compass.
4. Confirm the page opens instead of showing the multiple-row JSON error.
5. Open the owner Compass for a player from the Concierge Desk.
6. Confirm the correct player's newest active Compass loads.
7. Open Moon Score Data on desktop and mobile.
8. Confirm all 28 numbers sit outside the wheel handles and cardinal-direction labels.
