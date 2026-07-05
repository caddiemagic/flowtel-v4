# Flowtel Release 0.9.5 — Dashboard Click Repair

## Purpose

Repair the two click-path regressions discovered after v0.9.4:

- Connected-client **View Data** buttons rendered but did not navigate.
- Medicine Wheel seasonal cards rendered as links but did not open seasonal dashboards.

## Root causes

1. The connected-client cards were rendered in a hidden relationship cache, bound there, then copied into the visible Concierge queue with `innerHTML`. The copied button inherited `data-bound-view-data="true"` but did not inherit the event listener, so the visible button skipped binding and did nothing.

2. Medicine Wheel seasonal labels had older CSS with `pointer-events: none`. v0.9.4 converted them into links, but the legacy CSS still prevented clicks.

## Fixes

- Replaced the `data-bound-view-data` guard with a `WeakSet`, matching the repaired Connect button pattern.
- Added a reusable `openClientCycleData()` navigation helper.
- Changed seasonal dashboard links to absolute `/cycle-data/?season=...` paths.
- Added explicit seasonal click handling in `renderWheel()` as a safeguard.
- Overrode legacy `.wheel-season` pointer behavior with `pointer-events: auto !important`.

## Database

No Supabase migration required.
