# Flowtel v0.10.39 — Suite Geometry + Quiet Control Polish

Release date: 2026-07-14

## Summary

This release applies the post-review polish pass from v0.10.38. It quiets the Suite welcome header, rebuilds the Medicine Wheel proportions for both desktop and mobile, clarifies Powder Room entry cards, softens the Powder Room pages, simplifies the guest-facing Flow Map controls, and upgrades the loading cards so the concierge bell image fills the entire arrival experience.

## What changed

### Suite welcome refinement

- Reduced the visual dominance of the Suite welcome header.
- Tightened vertical spacing and softened the heading treatment so it feels gentler and less loud.
- Kept the Return to the Queendom CTA while reducing its footprint.

### Medicine Wheel proportion repair

- Reduced the desktop and mobile orbit radius so the outer gold ring, number ring, and inner gold ring sit in better proportion.
- Increased the visual size of the rose compass center image so it feels more connected to the surrounding rings.
- Forced day markers to render as true circles and tightened their spacing.
- Repositioned seasonal cards to the four corners on desktop so they no longer overlap the wheel.
- Preserved the mobile two-by-two seasonal card layout while improving wheel proportion on small screens.
- Updated seasonal card titles to explicitly say **Inner [Season] Powder Room**.

### Powder Room sharing and loading-state polish

- Refined the Powder Room sharing disclaimer and expansion panel in the Suite for better desktop and mobile balance.
- Updated the Flowtel loading overlay so the concierge bell image fills the full loading card background rather than appearing as a separate dropped-in square image.
- Applied the same full-card bell treatment to the Smart Entry and Beta Request loading cards for consistency.

### Powder Room page refinement

- Removed the Powder Room switch-view pill.
- Softened the Powder Room hero/header scale and typography so the page feels more elegant and less loud.
- Kept the season room navigation and mirror notes experience intact.

### Flow Map simplification

- Simplified the guest/client Flow Map filters to a compact cycle switcher: **Current Cycle**, **Last Cycle**, and **All Cycles**.
- Only shows the non-active cycle options at a time so the control set stays compact.
- Reduced the size of the Flow Map header and control card to feel quieter and cleaner.
- Preserved broader toggle/filter behavior for mentor/admin views.

## Files changed

- `beta-request/index.html`
- `beta-request/styles.css`
- `client/app.js`
- `client/index.html`
- `client/styles.css`
- `cycle-data/index.html`
- `cycle-data/styles.css`
- `docs/CHANGELOG.md`
- `docs/RELEASE-0.10.39.md`
- `enter/index.html`
- `enter/styles.css`
- `flow-map/app.js`
- `flow-map/index.html`
- `flow-map/styles.css`

## Supabase

No Supabase migration required.

## Syntax checks

- `node --check client/app.js`
- `node --check flow-map/app.js`

## First test checklist

1. Open the Suite on desktop and confirm the welcome header is visually quieter and no longer dominates the page.
2. Confirm the desktop Medicine Wheel shows smaller rings, a larger center rose compass, circular day markers, and seasonal cards that do not overlap the wheel.
3. Confirm the mobile Medicine Wheel keeps the improved card placement and also has corrected wheel proportion and day-circle shape.
4. Click each Suite seasonal card and confirm it routes into the correct Powder Room.
5. Expand the Powder Room sharing control in the Suite on desktop and mobile and confirm the layout stays proportional and readable.
6. Trigger Flowtel login/loading and confirm the concierge bell image fills the whole loading card background.
7. Repeat the loading-state check on `/enter/` and `/beta-request/`.
8. Open a Powder Room and confirm the switch-view pill is gone and the header is smaller and more elegant.
9. Open `/flow-map/` as a guest/client account and confirm only the compact Current / Last / All cycle controls appear.
10. Open `/flow-map/` as an admin or mentor collective view and confirm the broader controls still work.
