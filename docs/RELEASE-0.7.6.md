# Flowtel Release 0.7.6 — Flowtel time and moon logic repair

## Fixed
- Re-anchored Moon Magic to the Flowtel framework:
  - Last New Moon: June 14, 2026
  - July 3, 2026 = Moon Day 20
  - July 4, 2026 = Moon Day 21
  - Days 20–26 = Half New Moon Phase
- Added Last New Moon date to the Moon Magic pill.
- Replaced browser-local date logic with Flowtel HQ time:
  - America/Los_Angeles / PST-PDT
- Added Flowtel time display to:
  - Suite page
  - Lounge page
  - Concierge page
- Hardened daily stay lifecycle checks so stale cached stays are cleared when the Flowtel date changes.
- Added future note: guest-selectable time zones should be added in a later release.
