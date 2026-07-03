# 🌹 Flowtel Release 0.4.3

## Feature
Luxury Suite & Concierge Refinement

This is an Application Release for the existing `flowtel-v4` repository. It does not include standalone components, demo files, SSO, routing redesign, or Squarespace integration.

## Changed Files

```txt
client/app.js
client/styles.css
manager/index.html
manager/app.js
manager/styles.css
shared/turndown.js
database/migration-004-turndown-service.sql
docs/RELEASE.md
docs/DESIGN_SYSTEM.md
docs/MEDICINE_WHEEL_SPEC.md
docs/CONCIERGE_SPEC.md
docs/FLOWTEL_LANGUAGE.md
docs/CHANGELOG.md
```

## Database

Run this migration in Supabase SQL Editor:

```txt
database/migration-004-turndown-service.sql
```

This adds Turndown Service request fields to existing stay records so guests only appear in the Concierge queue when they request extra care.

## Installation Instructions

Replace:

```txt
flowtel-v4/client/app.js
```

with:

```txt
Release-0.4.3/client/app.js
```

Replace:

```txt
flowtel-v4/client/styles.css
```

with:

```txt
Release-0.4.3/client/styles.css
```

Replace:

```txt
flowtel-v4/manager/index.html
```

with:

```txt
Release-0.4.3/manager/index.html
```

Replace:

```txt
flowtel-v4/manager/app.js
```

with:

```txt
Release-0.4.3/manager/app.js
```

Replace:

```txt
flowtel-v4/manager/styles.css
```

with:

```txt
Release-0.4.3/manager/styles.css
```

Add:

```txt
Release-0.4.3/shared/turndown.js
```

to:

```txt
flowtel-v4/shared/turndown.js
```

Run:

```txt
Release-0.4.3/database/migration-004-turndown-service.sql
```

in the Supabase SQL Editor.

Add the documentation files in:

```txt
Release-0.4.3/docs/
```

to:

```txt
flowtel-v4/docs/
```

## What Changed

### Compass Medicine Wheel

- Refines the wheel instead of replacing it.
- Day 1 sits just below WEST.
- Day 28+ sits just above WEST.
- All 28 day markers are equally spaced around the wheel.
- Numbers move counter-clockwise from Day 1 toward SOUTH, EAST, NORTH, and back to WEST.
- Cardinal directions now sit outside the number ring but inside the wheel card boundary.
- Inner Season labels now anchor the four corners around the wheel.
- Center rose has been upgraded into a gold rose compass with a compass rose and blooming spiral.
- The current-room marker is a precise gold star/diamond layered directly over the active day.
- The “YOU ARE HERE” legend sits lower, with helper text below it.

### Suite Refinement

- Removes repetitive “Room X is ready” language from the Suite subline.
- Expands the Medicine Wheel card and Moon Magic card for better balance against the right column.
- Keeps the Suite layout familiar and restrained.

### Turndown Service

- Replaces passive Concierge copy with a hospitality-style Turndown Service request.
- Guests can request extra care from the Suite.
- The button hides after request and shows “Turndown Service Requested.”
- Fulfilled Concierge notes display like a handwritten note left in the room.

### Concierge Desk

- Renames the return button to “Clock Out.”
- Removes the “Witnessed Today” metric.
- Renames the queue to “Guests Awaiting Turndown Service.”
- Only guests who requested Turndown Service appear in the primary care queue.
- Adds a placeholder “My Guests” section for future assigned clients.
- Guest cards display name, current room, cycle day, and calculated inner season without repeated side flags.

### Documentation

- Adds first living Flowtel design documents:
  - `DESIGN_SYSTEM.md`
  - `MEDICINE_WHEEL_SPEC.md`
  - `CONCIERGE_SPEC.md`
  - `FLOWTEL_LANGUAGE.md`
  - `CHANGELOG.md`

## QA Checklist

- Sign in as a guest.
- Enter cycle day and feels-like inner season.
- Check into the Flowtel.
- Confirm Suite opens normally.
- Confirm wheel geometry and current marker position.
- Confirm Moon Magic card aligns visually with wheel card width.
- Request Turndown Service.
- Confirm the request button disappears and requested state appears.
- Sign in as practitioner / owner / admin.
- Confirm Concierge Desk opens.
- Confirm only Turndown requests appear in the Turndown queue.
- Leave a Concierge note.
- Confirm guest is removed from queue.
- Return to Suite and confirm Concierge note state appears.
- Confirm Lounge still loads previous visits.
- Confirm Clock Into / Clock Out flows still route correctly.

## Commit

```bash
git add .
git commit -m "Release 0.4.3 - Luxury suite refinement and Turndown Service"
```

## Optional Tag

```bash
git tag -a v0.4.3 -m "Flowtel Release 0.4.3"
git push origin main
git push origin v0.4.3
```
