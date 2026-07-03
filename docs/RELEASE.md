# Flowtel Release 0.4.8 — Number Ring Radius Correction

This is a focused Application Release.

## Feature
Medicine Wheel number ring radius correction.

## Changed Files

```text
client/app.js
docs/RELEASE.md
```

## Database
None.

## What Changed

- Reduced the Medicine Wheel day-marker radius from `37.4` to `36.75` inside `wheelPosition()`.
- This pulls the full 28-day number ring inward so the day circles sit cleanly between the existing two gold rings.
- The active gold marker continues to use the same `wheelPosition()` calculation, so it stays centered directly over the active day.
- No non-wheel features were changed.
- No CSS changes were required.

## Installation

Replace:

```text
flowtel-v4/client/app.js
```

with:

```text
Release-0.4.8/client/app.js
```

Copy:

```text
Release-0.4.8/docs/RELEASE.md
```

into:

```text
flowtel-v4/docs/RELEASE-0.4.8.md
```

## Commit

```bash
git add client/app.js docs/RELEASE-0.4.8.md
git commit -m "Release 0.4.8 - medicine wheel number ring radius correction"
```
