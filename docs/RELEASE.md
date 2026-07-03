# Flowtel Release 0.4.9d — Medicine Wheel Radius Lock

## Changed files
- client/app.js
- client/styles.css

## What changed
- Shrunk the shared day/ring radius to 31%.
- Tied the day number ring, inner gold ring, and outer gold ring to the same geometry.
- Added breathing room between day circles and gold rings.
- Restored the rose compass image path to `../assets/rose_compass_center.png`.
- Removed old rose compass proof text from the rendered wheel.
- Fixed the accidental `=medicineWheel.innerHTML` syntax issue if present.

## Install
Replace:
- `flowtel-v4/client/app.js`
- `flowtel-v4/client/styles.css`

Commit:
`Release 0.4.9d - Lock medicine wheel radius`
