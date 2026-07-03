# 🌹 Flowtel Release 0.4.7

## Feature
Final Medicine Wheel spacing and rose compass refinement.

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
Release-0.4.7/client/app.js
```

Replace:

```txt
flowtel-v4/client/styles.css
```

with:

```txt
Release-0.4.7/client/styles.css
```

Copy:

```txt
Release-0.4.7/docs/RELEASE.md
```

into:

```txt
flowtel-v4/docs/RELEASE.md
```

## Notes

This is a focused wheel-only application release.

- Removed temporary compass proof text.
- Removed extra wheel axis / guide details from the rendered wheel.
- Preserved exactly two gold rings around the number path: one inside the day circles and one outside the day circles.
- Re-centered the day numbers between the two rings.
- Kept Day 1 below WEST and Day 28+ above WEST with equally spaced positions.
- Moved cardinal labels outside the number ring while keeping them inside the wheel card.
- Moved season blocks inward from card edges and away from the wheel perimeter.
- Simplified the rose compass details and strengthened the blooming spiral center.

## Commit

```bash
git add .
git commit -m "Release 0.4.7 - Final medicine wheel spacing and rose compass"
```
