# 🌹 Flowtel Release 0.4.1

## Feature
Medicine Wheel Compass

## Changed Files
- `client/app.js`
- `client/styles.css`
- `docs/RELEASE.md`

## Database
None

## Commit
`Release 0.4.1 - Medicine Wheel Compass`

## What Changed
- Rebuilt the Guest Suite Medicine Wheel geometry so the cycle rooms move counter-clockwise around the compass.
- Day 1 now sits just below WEST.
- Day 28+ now sits just above WEST.
- Added subtle compass styling with NORTH, EAST, SOUTH, and WEST labels.
- Added Inner Winter, Inner Spring, Inner Summer, and Inner Autumn quadrant labels.
- Preserved the blush highlight for the current room.
- Preserved the gold star as a separate visual marker.
- Updated room placement to use CSS custom properties for cleaner future animation and Passport overlays.

## Installation Instructions
Replace:

`flowtel-v4/client/app.js`

with:

`Release-0.4.1/client/app.js`

Replace:

`flowtel-v4/client/styles.css`

with:

`Release-0.4.1/client/styles.css`

Add or replace:

`flowtel-v4/docs/RELEASE.md`

with:

`Release-0.4.1/docs/RELEASE.md`

## QA Checklist
1. Sign in with an existing Supabase guest account.
2. Check into Room 1 and confirm the active blush bubble appears below WEST.
3. Check into Room 28 or any day above 28 and confirm the active bubble displays as `28+` above WEST.
4. Confirm wheel room buttons still open previous visits.
5. Confirm reflections still save.
6. Confirm personal checkout still works.
7. Confirm Flowtel Lounge still opens and displays previous stays.
8. Confirm the Moon Magic card remains aligned with the wheel column.

## Rollback
Restore the previous versions of:

- `client/app.js`
- `client/styles.css`

No database rollback is required.
