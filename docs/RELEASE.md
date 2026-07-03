# Flowtel Release 0.4.9 — Tiny Radius Tightening Patch

## Feature
Medicine Wheel radius tightening only.

## Changed Files
- client/app.js
- client/styles.css

## Database
None.

## Installation
Replace:

`flowtel-v4/client/app.js`

with:

`Release-0.4.9-radius-tighten/client/app.js`

Replace:

`flowtel-v4/client/styles.css`

with:

`Release-0.4.9-radius-tighten/client/styles.css`

## Notes
This patch only reduces the shared Medicine Wheel day radius from `39.5` to `36.75`, and updates the CSS `--day-radius` from `39.5%` to `36.75%`. The day circles, inner gold ring, and outer gold ring remain mathematically tied together. No workflow, Concierge, Lounge, Turndown, Reflection, navigation, authentication, or database behavior was changed.

## Commit
`git commit -m "Flowtel Release 0.4.9 — Medicine Wheel radius tightening"`
