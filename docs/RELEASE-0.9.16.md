# Flowtel v0.9.16 — Flow Map Practice Dashboard

## Purpose

This release separates the analytical Cycle Data Dashboard from the reflective Flow Map Practice.

The Cycle Data Dashboard remains the structured reporting view. The new `/flow-map/` route becomes the spacious practice view where a guest or mentor can review one cycle of check-ins across the four seasonal quadrants.

## What changed

- Added a new `/flow-map/` route.
- The Flow Map defaults to the most recently completed cycle when one exists.
- Added a cycle selector so guests/mentors can switch between current and previous cycles.
- Added a Flow Map quadrant layout based on the printable Flow Map:
  - Top left: Inner Autumn / Half New Moon / Days 20–26
  - Top right: Inner Summer / Full Moon / Days 12–19
  - Bottom left: Inner Winter / New Moon / Days 27–5
  - Bottom right: Inner Spring / Half Full Moon / Days 6–11
- Check-ins render as soft note pills scattered inside the correct quadrant by Actual Inner Season.
- Note pills include:
  - reflection text
  - cycle day
  - feels-like season
  - time of check-in
  - off-cycle amount only when recorded and actual cycle day differ
  - client name when viewed in a mentor/admin client context
- Empty quadrants now say: `10/10 no notes.`
- Added `Print / Save PDF` for the Flow Map Practice.
- Added an `Open Flow Map` link to the Cycle Data Dashboard.
- Reduced the Cycle Data Dashboard title size slightly.
- Added `database/migration-019-flow-map-practice-dashboard.sql` to expand the cycle data RPC with client/context fields for mentor-facing Flow Map views.

## Supabase

Run:

```sql
database/migration-019-flow-map-practice-dashboard.sql
```

## QA

1. Open `/flow-map/` as a guest.
2. Confirm the page opens with the guest’s own data only.
3. Confirm the default cycle is the most recently completed cycle when available.
4. Use the cycle selector to switch to the current cycle.
5. Confirm entries appear in the correct seasonal quadrant.
6. Confirm matched entries do not show an on/off badge.
7. Confirm mismatched entries show days ahead/behind.
8. Open a connected client’s Cycle Data Dashboard from Concierge.
9. Click `Open Flow Map`.
10. Confirm the Flow Map is filtered to that client.
11. Click `Print / Save PDF` and confirm the print dialog opens.
