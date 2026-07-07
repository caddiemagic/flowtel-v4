# Flowtel v0.10.17 — Concierge Holding Page + Lounge Profile Access

Small Phase 1 refinement release.

## What changed

- Updated the Flow Map utility menu so `Return to Concierge` now routes to `/concierge-soon/` instead of the live Concierge Desk.
- Added a temporary Concierge Desk holding page with luxury copy and the user's elegant bell image softly in the background.
- Added a new Profile View / Profile Studio access card in the Flowtel Lounge so guests can open their profile from the lounge page.

## Supabase

No Supabase migration required.

## Syntax checks

No JavaScript files changed in this release.

## First test after deploy

1. Open `/flow-map/`.
2. Open the `More` menu.
3. Click `Return to Concierge`.
4. Confirm it opens `/concierge-soon/`.
5. Confirm the page says the Concierge Desk will be open for service soon.
6. Confirm the elegant bell image appears softly in the background.
7. Open `/client/?suite=1` and go to the Flowtel Lounge.
8. Confirm the new Profile View card appears.
9. Confirm `Open Profile View` routes to `/flow-fm/profile-studio/`.
