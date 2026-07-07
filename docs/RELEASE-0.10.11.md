# Flowtel v0.10.11 — Initiation Hall Luxury Polish + Queendom Studio Refinement

Recovery polish release built from the fresh v17 project ZIP. This release intentionally patches only the missing v0.10.11 scope and does not redesign the database or Flowtel Time logic.

## What changed

- Added a decorative rose-gold wax seal asset and placed it on the Initiation Hall hero only.
- Replaced the Profile Studio rose emoji placeholder with `assets/flowtel-pinkrose.png`, with custom profile photo override support and graceful fallback.
- Added front-end dirty-state display behavior in Profile Studio:
  - submitted profile edits show **Draft**
  - approved profile edits show **Draft Revision**
  - sending to be witnessed still uses the existing submitted/review flow
- Upgraded luxury button, pill, offering chip, status pill, moon door, profile preview, and Planning Room action styling.
- Reduced oversized Flow FM headers so the hall feels quieter and less dashboard-like.
- Refined the Profile Studio / Your Queendom hero copy and styling without adding the wax seal there.
- Updated Planning Room cards to Dragon Moon, Wild Woman Moon, and Lover Moon for 2026.
- Replaced Portal opens / Portal closes with New Moon and Full Moon date lines.
- Turned the Moon Phase Key into refined teaching cards.
- Turned Weekly Planning Prompts into individual prompt notes.

## Calendar PDF note

Final custom calendar PDFs were not provided in this release. The Planning Room cards reserve the expected future paths:

- `flow-fm/assets/planning/month-view-calendar-jun-jul-2026.pdf`
- `flow-fm/assets/planning/month-view-calendar-jul-aug-2026.pdf`
- `flow-fm/assets/planning/month-view-calendar-aug-sep-2026.pdf`

The UI labels these as placeholder paths until the final PDFs are installed.

## Supabase

No Supabase migration required.

## Syntax checks

Run before shipping:

```bash
node --check flow-fm/app.js
node --check flow-fm/profile-studio/page.js
node --check flow-fm/planning-room/page.js
node --check shared/moon-calendars.js
```

## First test after deploy

1. Open `/flow-fm/`.
2. Confirm Initiation Hall hero shows the rose-gold wax seal.
3. Confirm headers feel smaller and less overwhelming.
4. Confirm The Doors Ahead has more spacing, hover lift, and gold/temple styling.
5. Open `/flow-fm/profile-studio/`.
6. Confirm the profile preview shows the pink rose image, not the emoji.
7. Submit a profile, edit a field, and confirm visible status returns to Draft.
8. If possible, edit an approved profile and confirm visible status becomes Draft Revision.
9. Open `/flow-fm/planning-room/`.
10. Confirm cards show Dragon Moon / Wild Woman Moon / Lover Moon.
11. Confirm cards show New Moon / Full Moon instead of Portal opens / Portal closes.
12. Confirm weekly planning prompts render as individual prompt notes.
13. Confirm Review Desk, timezone, Flowtel Time, and database structure were not changed.
