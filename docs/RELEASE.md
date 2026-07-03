# 🌹 Flowtel Release 0.4.10

## Feature
Medicine Wheel DOM Ring Placement Patch

This is a focused Application Release. It updates only the Medicine Wheel render path and styling so the two gold rings are real DOM elements mathematically tied to the day-number radius.

## Changed Files

- `client/app.js`
- `client/styles.css`
- `docs/RELEASE.md`

## Database

None.

## Installation Instructions

Replace:

```txt
flowtel-v4/client/app.js
```

with:

```txt
Release-0.4.10/client/app.js
```

Replace:

```txt
flowtel-v4/client/styles.css
```

with:

```txt
Release-0.4.10/client/styles.css
```

Copy:

```txt
Release-0.4.10/docs/RELEASE.md
```

into:

```txt
flowtel-v4/docs/RELEASE-0.4.10.md
```

## Confirmed Diff

- `wheelPosition()` now uses `const radius = 44.25;`.
- `renderWheel()` now renders:
  - `.wheel-number-ring.wheel-number-ring-inner`
  - `.wheel-number-ring.wheel-number-ring-outer`
- Old compass/ring guide DOM elements were removed from `renderWheel()`.
- `.medicine-wheel` no longer relies on radial-gradient gold rings.
- Number circles use `--day-size: 38px`.
- The inner and outer gold rings are calculated from `--day-radius` and `--day-size`.

## Commit

```bash
git add .
git commit -m "Release 0.4.10 - DOM-tied medicine wheel rings"
```
