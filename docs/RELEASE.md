# 🌹 Flowtel Release 0.4.4

## Feature
Final Medicine Wheel and Suite Layout Refinement

## Changed Files

```txt
client/app.js
client/styles.css
docs/RELEASE.md
```

## Database
None.

No Supabase migration is required for this release.

## Installation Instructions

Replace:

```txt
flowtel-v4/client/app.js
```

with:

```txt
Release-0.4.4/client/app.js
```

Replace:

```txt
flowtel-v4/client/styles.css
```

with:

```txt
Release-0.4.4/client/styles.css
```

Add or replace this release note at:

```txt
flowtel-v4/docs/RELEASE.md
```

using:

```txt
Release-0.4.4/docs/RELEASE.md
```

## What Changed

### Medicine Wheel Number Ring

- Expanded the day number circles slightly.
- Increased the number ring radius so the circles sit between the two gold rings.
- Preserved 28 equally spaced positions.
- Preserved Day 1 directly below WEST and Day 28+ directly above WEST.
- Centered the gold current-room marker precisely over the active day.
- Removed visual reliance on extra/fragile rings.

### Season Blocks

- Kept the existing visual language.
- Moved the four Inner Season blocks farther outside the wheel perimeter.
- Preserved the correct corner placement:
  - Inner Autumn: top-left
  - Inner Summer: top-right
  - Inner Spring: bottom-right
  - Inner Winter: bottom-left

### Rose Compass Center

- Replaced the unfinished CSS-only compass center with an inline SVG gold rose compass.
- Added layered compass points, gold gradients, rose spiral lines, and petal geometry.
- Preserved the cream, gold, blush, and soft-brown luxury palette.

### Moon Magic + Reflection

- Removed the separate Moon Magic card from the Suite layout.
- Moved Moon Magic data into the Reflection card.
- Reflection now contains a small Moon Magic row before the text field.
- Existing moon data IDs remain supported for backward compatibility.

### Suite Layout Symmetry

- Made the Suite grid stretch more gracefully.
- Allowed the Medicine Wheel card to visually align with the right column height.
- Kept the wheel centered inside its card.
- Moved the “You Are Here” legend lower so it does not overlap SOUTH.

## Preserved Behavior

This release does not intentionally change:

- check-in
- clock-in
- Concierge Desk
- Turndown Service
- previous visits
- reflection saving
- lounge
- practitioner role visibility
- Supabase authentication

## Commit

```bash
git add .
git commit -m "Release 0.4.4 - Final medicine wheel and suite layout refinement"
```
