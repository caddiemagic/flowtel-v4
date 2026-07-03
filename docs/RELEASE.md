# 🌹 Flowtel Release 0.4.9

## Feature
Final medicine wheel geometry before SSO.

This is a focused Application Release. It only touches the Medicine Wheel number-ring geometry and the rose compass image scale.

## Changed Files

```text
client/app.js
client/styles.css
docs/RELEASE.md
```

## Database
None.

## What Changed

- Repositioned the number-ring radius so the 28 day circles sit cleanly between the existing inner and outer gold rings.
- Preserved equal spacing across all 28 positions.
- Preserved Day 1 below WEST, Day 28+ above WEST, and counter-clockwise order.
- Kept the existing gold rings as the source of truth.
- Enlarged the `rose_compass_center.png` center image while preserving aspect ratio and centering.
- Did not modify workflow, SSO, Concierge, Lounge, Turndown Service, or database behavior.

## Installation

Replace:

```text
flowtel-v4/client/app.js
```

with:

```text
Release-0.4.9/client/app.js
```

Replace:

```text
flowtel-v4/client/styles.css
```

with:

```text
Release-0.4.9/client/styles.css
```

Copy:

```text
Release-0.4.9/docs/RELEASE.md
```

into:

```text
flowtel-v4/docs/RELEASE-0.4.9.md
```

## Commit

```bash
git add .
git commit -m "Release 0.4.9 - Final medicine wheel geometry before SSO"
```
