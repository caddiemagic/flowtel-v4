# 🌹 Flowtel Release 0.4.5

## Feature
Medicine wheel updates and suite layout refinement.

This is an Application Release. It refines the existing Flowtel v4 Guest Suite files directly and does not include standalone components, demos, routing changes, Squarespace integration, SSO, or database redesign.

## Changed Files

```txt
client/app.js
client/styles.css
docs/RELEASE.md
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
Release-0.4.5/client/app.js
```

Replace:

```txt
flowtel-v4/client/styles.css
```

with:

```txt
Release-0.4.5/client/styles.css
```

No Supabase SQL migration is required for this release.

## What Changed

- Expanded the Medicine Wheel number ring outward so the day buttons sit cleanly between the two gold concentric rings.
- Corrected the gold ring geometry so one gold ring sits just inside the number circles and one gold ring sits just outside the number circles.
- Kept exactly two gold rings around the number path and removed reliance on extra visible rings.
- Slightly increased the day button size while preserving equal spacing around all 28 rooms.
- Preserved Day 1 directly below WEST and Day 28+ directly above WEST.
- Re-centered the active gold star marker precisely over the active day circle.
- Repositioned Inner Autumn, Inner Summer, Inner Spring, and Inner Winter blocks so they sit outside the wheel perimeter with generous spacing.
- Upgraded the center into a more finished gold rose compass using inline SVG: compass points, layered petals, spiral rose lines, subtle guide rings, and soft gold dimensionality.
- Kept the cream, blush, gold, and dark-brown luxury hotel aesthetic.
- Removed the separate Moon Magic card from the suite layout.
- Moved Moon Magic data into the Reflection card so the reflection area becomes one intentional card.
- Preserved check-in, clock-in, Concierge Desk, Turndown Service, previous visits, reflection saving, Lounge behavior, and practitioner roles.

## QA Checklist

1. Check in as a guest and confirm the Suite opens.
2. Confirm the Medicine Wheel appears on the left side of the Suite.
3. Confirm Day 1 sits just below WEST and Day 28+ sits just above WEST.
4. Confirm all 28 day circles are evenly spaced and do not touch.
5. Confirm the current-room gold star sits directly over the active day circle.
6. Confirm the two gold rings bracket the number circles: one inside the circles and one outside the circles.
7. Confirm the cardinal directions sit inside the wheel card but outside the number ring.
8. Confirm the four Inner Season labels do not overlap the wheel perimeter.
9. Confirm the center rose compass appears gold, dimensional, and finished.
10. Confirm the separate Moon Magic card is hidden.
11. Confirm Moon phase, moon day, and moon theme appear inside the Reflection card.
12. Save a reflection and confirm it still persists.
13. Open previous visits from a day circle and confirm the drawer still works.
14. Request Turndown Service and confirm Concierge behavior is preserved.
15. Check mobile layout and confirm the wheel remains centered and legible.

## Commit

```bash
git add .
git commit -m "Release 0.4.5 - medicine wheel updates and suite layout refinement"
```
