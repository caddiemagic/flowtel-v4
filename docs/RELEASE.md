# Flowtel Release 0.4.9c — Medicine Wheel Geometry Lock

Changed files:
- client/app.js
- client/styles.css

What changed:
- Locked the day numbers and gold rings to one shared geometry source in `client/app.js`.
- Removed unreliable CSS multiplication from ring sizing.
- Day number size, inner ring size, and outer ring size are now derived from:
  - `WHEEL_DAY_RADIUS`
  - `WHEEL_DAY_SIZE`
  - `WHEEL_RING_GAP`
- Preserved the rose compass image center.
- Added final CSS overrides so the visible wheel uses the synced geometry.

Install:
Replace:
- flowtel-v4/client/app.js
- flowtel-v4/client/styles.css

Commit:
Release 0.4.9c - Lock medicine wheel geometry
