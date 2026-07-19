# Caddie Magic v0.2.0 — Locker Room + Caddie Review Service

## Purpose

This release promotes the anonymous Collective Swing Map into the **Locker Room**, simplifies personal Score Map cards, makes course optional, and opens the first Caddie Master review workflow through the existing Flowtel Concierge Desk.

## What changed

### Locker Room

- Renamed **Collective Swing Map** to **LOCKER ROOM** throughout the player-facing experience.
- Updated the disclosure copy to:
  - **Anonymous collective view. Names and courses are never shown here.**
- Preserved anonymous Moon Day + swing-thought cards and the existing moon-phase quadrants.

### Personal Score Map

- Moved the numeric score to the right side of each note card.
- Thought-only entries no longer display a **Reflection** label.
- Thought-only cards now show only the thought.
- Clicking a card still opens the full detail popout.
- Added owner/admin viewing through `?player=<player_profile_id>&from=manager` so the Concierge Desk can open a requested player’s Score Map securely.

### Round logging

- Course is now optional for scored rounds.
- Updated the score placeholder to **69**.
- Score remains required for a scored round.
- Swing thought remains optional for a scored round.
- Thought-only logging remains available through **Just a Swing Thought**.

### Caddie Review Service

- Added a **Request Caddie Review** section to the Player Profile.
- Players can ping the Caddie to review their scores and swing thoughts for patterns.
- Only one open review request is allowed at a time per player.
- Request status appears directly in the Player Profile.
- Added **Caddie Reviews** to the Flowtel Concierge Desk.
- Open requests are routed to the owner/admin Concierge.
- The owner can open the player’s Score Map from the request card.
- Completing a review sends a private **Caddie Review** note into the player’s Caddie Notes section.
- Completed requests remain visible in the Concierge Desk history.

## Supabase migration

Run:

`database/migration-041-caddie-magic-review-service.sql`

This migration:

- makes course optional for scored rounds;
- creates `caddie_magic_review_requests`;
- adds player/admin RLS policies;
- adds the player request RPC;
- adds the owner/admin review queue RPC;
- adds the atomic review-completion + private-note RPC.

## JavaScript syntax checks

- `node --check caddie-magic/app.js`
- `node --check caddie-magic/score-map/app.js`
- `node --check caddie-magic/collective-map/app.js`
- `node --check shared/caddie-magic-reviews.js`
- `node --check manager/app.js`

## First test checklist

1. Run migration 041 in Supabase.
2. Open `/caddie-magic/` and confirm all former Collective Swing Map links read **Locker Room**.
3. Log a scored round with score only and leave Course blank.
4. Confirm the score saves successfully.
5. Confirm the score placeholder reads **69**.
6. Open `/caddie-magic/score-map/`.
7. Confirm scored note cards show the thought on the left and score on the right.
8. Confirm thought-only cards show only the thought and never say **Reflection**.
9. Open `/caddie-magic/collective-map/` and confirm the heading reads **LOCKER ROOM**.
10. Confirm the disclosure says names and courses are never shown.
11. In the Player Profile, click **Request Caddie Review**.
12. Confirm the request changes to **Review Requested**.
13. Open `/manager/` as the owner and select **Caddie Reviews**.
14. Confirm the player request appears.
15. Click **Open Scorecard** and confirm the requested player’s Score Map opens.
16. Return to the Concierge Desk and click **Send Caddie Note**.
17. Enter a review note and confirm the request moves to Completed Reviews.
18. Refresh the player profile and confirm the private note appears under **Caddie Notes**.
