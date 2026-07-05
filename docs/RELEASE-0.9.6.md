# Flowtel Release 0.9.6 — Actual vs Recorded Cycle Day

## Purpose

This release introduces the first layer of Flowtel cycle intelligence.

Guests still enter their cycle day at every check-in so the ritual stays embodied and accountable, but Flowtel now maintains a calculated actual cycle day in the background as the source of truth for the Suite, Medicine Wheel, room, season, guidance, and dashboards.

## What changed

- Stores both:
  - `cycle_day_recorded` — the day the guest entered.
  - `cycle_day_actual` — Flowtel’s calculated source of truth.
- Keeps compatibility fields:
  - `cycle_day_claimed` remains the recorded day.
  - `cycle_day_calculated` remains the actual day.
- Adds compassionate check-in feedback:
  - “You nailed it. You are on Day 23.”
  - “Your mind is 2 days ahead of your body. You are actually on Day 23.”
  - “Your mind is 2 days behind your body. You are actually on Day 23.”
  - “Permission to play hooky today.”
- Adds late-reset handling when a guest returns after time away and enters an early-cycle day.
- Stores previous cycle length when a Day 1 or inferred reset makes it available.
- Updates the Cycle Data pill to show Actual Cycle Day, Recorded Cycle Day, match status, Day 1, previous cycle length, and streak/welcome-back copy.
- Uses actual cycle day for the Suite room, Medicine Wheel, Day Content, and Lounge/Concierge room labels.

## Database migration

Run:

```sql
database/migration-018-actual-vs-recorded-cycle-day.sql
```

## Testing checklist

1. Existing guest checks in with the expected day.
   - Cycle Data shows matched.
2. Existing guest checks in ahead of calculated day.
   - Cycle Data shows recorded ahead and uses actual day for room.
3. Existing guest checks in behind calculated day.
   - Cycle Data shows recorded behind and uses actual day for room.
4. Guest enters Day 1.
   - New cycle start date is today.
   - Previous cycle length is stored when possible.
5. Guest returns after time away with an early-cycle day.
   - Flowtel infers a new cycle start date and stores prior cycle length.
6. Suite Medicine Wheel highlights actual day, not recorded day.
7. Cycle Data dashboard still opens.
