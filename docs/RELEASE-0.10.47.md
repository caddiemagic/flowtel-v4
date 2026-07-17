# Flowtel v0.10.47 — Team Map Runtime Recovery

Release date: 2026-07-17

## Summary

This emergency hotfix restores the Flow FM Team Map after v0.10.46 introduced a client-side runtime error during the optional self-profile website merge. The Team Map data calls were completing, but rendering stopped before any portraits or presence diagnostics could be drawn.

## Root cause

`flow-fm/team-map/page.js` called `normalizeExternalUrl(...)`, but that helper exists only inside Profile Studio and was never defined or imported on the Team Map page. The resulting `ReferenceError` occurred inside `refreshMap()` after the database responses returned, which sent the page into its error state and displayed **The Living Map is resting** even when checked-in members existed.

## What changed

- Replaced the undefined function call with the Team Map's existing `safeExternalHref(...)` helper.
- Restored the merge of the signed-in member's latest saved External Website URL into her own Team Map card.
- Restored rendering of all checked-in team members, seasonal placements, ghost presences, counts, and **Your Presence** diagnostics.
- Updated Team Map cache versions to v0.10.47 so the repaired JavaScript is loaded immediately.

## Files changed

- `flow-fm/team-map/index.html`
- `flow-fm/team-map/page.js`
- `docs/CHANGELOG.md`
- `docs/RELEASE-0.10.47.md`

## Supabase

No Supabase migration required.

## Syntax checks

- `node --check flow-fm/team-map/page.js`

## First test checklist

1. Deploy v0.10.47.
2. Open `/flow-fm/team-map/` in a fresh tab or hard-refresh the existing tab.
3. Confirm the page no longer displays **The Living Map is resting** when checked-in members exist.
4. Confirm today's team-member count appears.
5. Confirm all checked-in portraits render in their actual Inner Season quadrants.
6. Confirm multidimensional ghost presences still render where Feels Like differs.
7. Confirm the **Your Presence** card finishes loading.
8. Open your portrait and confirm **View My Profile** appears when an External Website URL has been saved.
