# 🌹 Flowtel Release 0.4.5a

## Feature
Medicine Wheel v1.0 Design Freeze and suite layout refinement.

This is an Application Release. It integrates into the existing `flowtel-v4` application, includes only changed files, and does not create standalone components, demo files, routing changes, Squarespace integration, SSO, or database redesign.

## Changed Files

```txt
client/app.js
client/styles.css
docs/RELEASE.md
docs/MEDICINE_WHEEL_SPEC.md
```

## Database

None.

## Installation Instructions

Replace:

```txt
flowtel-v4/client/app.js
```

with:

```txt
Release-0.4.5a/client/app.js
```

Replace:

```txt
flowtel-v4/client/styles.css
```

with:

```txt
Release-0.4.5a/client/styles.css
```

Copy:

```txt
Release-0.4.5a/docs/RELEASE.md
Release-0.4.5a/docs/MEDICINE_WHEEL_SPEC.md
```

into:

```txt
flowtel-v4/docs/
```

No Supabase SQL migration is required for this release.

## What Changed

- Finalized the Medicine Wheel as v1.0 design-freeze geometry.
- Locked the gold ring rule: exactly two gold rings bracket the number circles, with one ring inside the number circles and one ring outside the number circles.
- Kept all 28 day positions equally spaced.
- Preserved Day 1 directly below WEST and Day 28+ directly above WEST.
- Kept the day-number circles centered between the inner and outer gold rings.
- Enlarged and refined the number circles while preserving comfortable spacing.
- Centered the active gold star/diamond precisely over the active day circle.
- Repositioned the four Inner Season blocks into the four card corners so they do not overlap the wheel.
- Finalized the Rose Compass center as a gold, dimensional, feminine compass rose with layered petals and spiral linework.
- Kept cardinal directions outside the number ring but inside the wheel card boundary.
- Removed the standalone Moon Magic card and merged Moon Magic data into the Reflection card.
- Improved suite symmetry so the wheel card can visually balance the right-side column height.
- Preserved check-in, clock-in, Concierge Desk, Turndown Service, previous visits, reflection saving, Lounge behavior, and practitioner roles.
- Added `docs/MEDICINE_WHEEL_SPEC.md` as the canonical Medicine Wheel v1.0 design specification.

## QA Checklist

1. Check in as a guest and confirm the Suite opens.
2. Confirm the Medicine Wheel appears on the left side of the Suite.
3. Confirm Day 1 sits directly below WEST and Day 28+ sits directly above WEST.
4. Confirm all 28 day circles are evenly spaced and do not touch.
5. Confirm one gold ring sits inside the number circles and one gold ring sits outside the number circles.
6. Confirm the day-number circles sit centered between the two gold rings.
7. Confirm the current-room gold star/diamond sits directly over the active day circle.
8. Confirm NORTH, EAST, SOUTH, and WEST sit inside the wheel card boundary and outside the number ring.
9. Confirm Inner Autumn, Inner Summer, Inner Spring, and Inner Winter sit in the four card corners without overlapping the wheel.
10. Confirm the center Rose Compass feels finished, dimensional, gold, and feminine.
11. Confirm the separate Moon Magic card is gone.
12. Confirm Moon phase, moon day, and moon theme appear inside the Reflection card.
13. Save a reflection and confirm it still persists.
14. Open previous visits from a day circle and confirm the drawer still works.
15. Request Turndown Service and confirm Concierge behavior is preserved.
16. Check responsive layout and confirm the wheel remains centered, proportional, and spacious.

## Commit

```bash
git add .
git commit -m "Release 0.4.5a - medicine wheel updates and suite layout refinement"
```
