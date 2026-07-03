# 🌹 Flowtel Release 0.4.8

## Feature
Application Release and Medicine Wheel Image Center

## Goal
Finalize the Medicine Wheel / Rose Compass and correct the suite wheel spacing without redesigning unrelated Flowtel features.

## Changed Files

```txt
client/app.js
client/styles.css
assets/rose_compass_center.png
docs/RELEASE.md
```

## Database
None.

## What Changed

- Replaced the CSS/SVG-rendered center compass with a single image asset:
  `assets/rose_compass_center.png`.
- Updated `renderWheel()` to render:
  `<img class="rose-compass-center" src="../assets/rose_compass_center.png" alt="" aria-hidden="true" />`.
- Removed the temporary Rose Compass proof label from the live render path.
- Removed decorative axis markup from the wheel render path.
- Preserved the current correct wheel render path.
- Corrected number ring radius so the number circles sit between exactly two gold rings.
- Locked ring placement to exactly two gold rings:
  - one inner gold ring inside the number circle path
  - one outer gold ring outside the number circle path
- Hid old/conflicting compass center selectors and old `.wheel-rose` output.
- Kept check-in, clock-in, Concierge, Turndown Service, reflections, previous visits, Lounge, and practitioner behavior unchanged.

## Installation Instructions

Replace:

```txt
flowtel-v4/client/app.js
```

with:

```txt
Release-0.4.8/client/app.js
```

Replace:

```txt
flowtel-v4/client/styles.css
```

with:

```txt
Release-0.4.8/client/styles.css
```

Copy:

```txt
Release-0.4.8/assets/rose_compass_center.png
```

into:

```txt
flowtel-v4/assets/rose_compass_center.png
```

Copy:

```txt
Release-0.4.8/docs/RELEASE.md
```

into:

```txt
flowtel-v4/docs/RELEASE.md
```

## Commit

```bash
git add .
git commit -m "Release 0.4.8 - Application Release and Medicine Wheel Image Center"
```
