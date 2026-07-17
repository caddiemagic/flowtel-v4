# Flowtel v0.10.43 — Team Map Concierge Polish + Mentor Portrait

Release date: 2026-07-17

## Summary

This release refines the Flow FM Team Map into a quieter concierge-team view, moves navigation to the bottom, simplifies member portraits, restores saved website doorways on Priestess cards, and adds the connected mentor’s profile photo to the Suite Mentor Panel.

## What changed

### Team Map header and navigation

- Preserved the scarab and **FLOW FM TEAM MAP** eyebrow.
- Removed the large **The Living Map** title.
- Replaced the introductory sentence with **See where the concierge team is today.**
- Moved navigation from the top to the bottom of the page.
- Changed **Return to Lounge** to **Return to Suite**.
- Removed the **Initiation Hall** button.
- Kept **Return to the Queendom**.

### Team presence language

- Updated the count to use **team member(s)** and **clocked in** language.
- Removed the Actual Season label beneath solid portraits on the map.
- Preserved the Feels Like label beneath multidimensional ghost presences.
- Actual season and cycle-day context remain available inside the opened Priestess card.

### Priestess website doorway

- Added the latest saved Priestess website URL to the Team Map response.
- Added **Visit Her Website** to the opened Priestess card whenever a valid URL exists.
- Website links open in a new tab.
- **Visit Her Queendom** remains approval-gated.

### Mentor Panel portrait

- Added the connected mentor’s circular profile photo to the Suite Mentor Panel.
- Uses the uploaded Priestess/Mentor photo when available.
- Falls back to `assets/flowtel-pinkrose.png`.
- Added responsive desktop and mobile sizing.

## Files changed

- `client/app.js`
- `client/index.html`
- `client/styles.css`
- `database/migration-033-team-map-website-card.sql`
- `docs/CHANGELOG.md`
- `docs/RELEASE-0.10.43.md`
- `flow-fm/team-map/index.html`
- `flow-fm/team-map/page.js`
- `flow-fm/team-map/styles.css`

## Supabase

Run:

`database/migration-033-team-map-website-card.sql`

Migration 033 replaces only the authenticated Team Map read function so it includes the latest saved website URL. It does not alter, delete, or rewrite profile, stay, cycle, reflection, or photo data.

## Syntax checks

- `node --check client/app.js`
- `node --check flow-fm/team-map/page.js`

## First test checklist

1. Run migration 033.
2. Open `/flow-fm/team-map/` and confirm the large Living Map title is gone.
3. Confirm the line reads **See where the concierge team is today.**
4. Confirm the map reports team members who have clocked in today.
5. Confirm navigation appears only at the bottom.
6. Confirm **Return to Suite** opens the active Suite and Initiation Hall is absent.
7. Confirm solid member portraits no longer show Actual Season beneath the name.
8. Confirm ghost portraits still show the Feels Like season.
9. Save a website URL in Profile Studio and confirm **Visit Her Website** appears in the Team Map card.
10. Open the Mentor Panel in the Suite and confirm the connected mentor photo appears.
11. Confirm a missing or broken mentor photo falls back to the pink rose.
