# Flowtel v0.10.41 — The Living Map + Multidimensional Presence

Release date: 2026-07-17

## Summary

This release adds the Flow FM Team Map as **The Living Map**: a daily, consent-aware collective view showing where checked-in Flow FM women are rooted in their actual Inner Season and where their energy is traveling when their Feels Like season differs. Queendom members may witness the map, open approved Priestess profiles, and continue into booking links.

## What changed

### The Living Map

- Added `/flow-fm/team-map/`.
- Shows only Flow FM women who checked into Flowtel during the current Flowtel Day.
- Uses `America/Los_Angeles` as the daily source of truth.
- Places each solid profile presence in her actual Inner Season.
- Adds a translucent ghost presence in her Feels Like season when it differs from her actual season.
- Uses stable, non-overlapping seasonal grids with subtle floating motion.
- Adds an astral thread between actual and ghost presences on desktop hover/focus.
- Mobile stacks chambers in the approved cycle order: Winter, Spring, Summer, Autumn.
- Refreshes every 30 seconds and when the page regains focus or visibility.

### Identity and profile fallback

- Uses Priestess name first.
- Falls back to first name, then `Flow FM Priestess`.
- Uses the approved rose image, `/assets/flowtel-pinkrose.png`, whenever no profile photo is available or the image cannot load.

### Visibility and privacy

- Flow FM members are visible by default after checking in.
- Added a clear member-controlled opt-out:
  - **Show me on the Living Map when I check in.**
- Opting out removes both actual and multidimensional presences without changing check-in or cycle history.
- The map endpoint exposes no email, reflections, checkout notes, mentor relationships, or stay history.

### Queendom profile discovery and booking

- Queendom, Flow FM, and Council members may view the Living Map after signing into Flowtel.
- Selecting a presence opens a preview with actual season, Feels Like season, cycle day, title, and short approved bio.
- Approved profiles display **Visit Her Queendom**.
- Added `/flow-fm/team-map/profile/` as the approved Priestess profile doorway.
- Approved profiles may show bio, offerings, who she serves, location, medicine language, scheduling link, and website link.
- Draft/unapproved profiles remain visible on the map but their profile doorway stays closed.

### Flowtel doorways

- Added **The Living Map** to the Flow FM Initiation Hall support rooms.
- Added **Living Map** to Flow FM navigation.
- Added a Living Map card inside the Flowtel Lounge so Queendom members can enter directly.
- Added `?lounge=1` return routing so the Living Map can return directly to an active Lounge stay.
- Added Vercel rewrites for the map and approved-profile routes.

## Files changed

- `client/app.js`
- `client/index.html`
- `client/styles.css`
- `database/migration-031-flow-fm-team-map.sql`
- `docs/CHANGELOG.md`
- `docs/RELEASE-0.10.41.md`
- `flow-fm/app.js`
- `flow-fm/index.html`
- `flow-fm/styles.css`
- `flow-fm/ui.js`
- `flow-fm/team-map/index.html`
- `flow-fm/team-map/page.js`
- `flow-fm/team-map/styles.css`
- `flow-fm/team-map/profile/index.html`
- `flow-fm/team-map/profile/page.js`
- `shared/flowtel.js`
- `shared/team-map.js`
- `vercel.json`

## Supabase

Run:

`database/migration-031-flow-fm-team-map.sql`

This migration:

- adds `profiles.flow_fm_team_map_opt_out`
- adds secure viewer-state and visibility-setting RPCs
- adds the daily Team Map RPC
- adds the approved Team Map profile RPC

It does not delete or rewrite existing stays, profiles, or Priestess Profile records.

## JavaScript syntax checks

- `node --check client/app.js`
- `node --check shared/team-map.js`
- `node --check flow-fm/team-map/page.js`
- `node --check flow-fm/team-map/profile/page.js`
- `node --check flow-fm/app.js`
- `node --check flow-fm/ui.js`

## First test checklist

1. Run migration 031 in Supabase.
2. Sign in as a Flow FM member and check into Flowtel today.
3. Open `/flow-fm/team-map/` and confirm the member appears in her actual season.
4. Check in with a different Feels Like season and confirm a ghost presence appears in the second quadrant.
5. Hover or focus either presence on desktop and confirm both versions highlight and the astral thread appears.
6. Open the map on mobile and confirm seasonal order is Winter, Spring, Summer, Autumn.
7. Turn off **Show me on the Living Map when I check in** and confirm both presences disappear after refresh.
8. Turn visibility back on and confirm the member returns.
9. Confirm a missing profile photo uses `/assets/flowtel-pinkrose.png`.
10. Select an approved Priestess and confirm **Visit Her Queendom** appears.
11. Open the profile and test **Book a Session** and **Visit Her Website** when those URLs exist.
12. Select a draft profile and confirm private profile content and booking links are not exposed.
13. Sign in as a Queendom member and confirm the Living Map can be viewed from the Lounge.
14. Confirm no emails, reflections, checkout notes, or private profile review notes appear anywhere on the map.
