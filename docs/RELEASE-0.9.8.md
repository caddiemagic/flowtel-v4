# Flowtel v0.9.8 — Cycle Data Pill Final Polish

## Purpose

This release completes the Cycle Data pill cleanup after the Actual vs Recorded Cycle Day feature became visible in the Suite.

## Changes

- Removes the small `Matched` / ahead / behind status badge from the Suite Cycle Data pill.
- Removes the visible `Current cycle Day 1` line from the Suite Cycle Data pill.
- Keeps the two primary data points visible:
  - Actual Cycle Day
  - Recorded Cycle Day
- Keeps the compassionate cycle feedback message visible.
- Keeps previous cycle length and streak/welcome-back copy available when those lines are relevant.
- Updates the Suite script cache-busting version to `0.9.8`.

## Database

No Supabase migration is required for this release. Migration 018 remains the required database migration for Actual vs Recorded Cycle Day fields.

## Test checklist

1. Open the Suite as a checked-in guest.
2. Confirm the Cycle Data pill shows Actual Cycle Day and Recorded Cycle Day.
3. Confirm the `Matched` badge no longer appears.
4. Confirm `Current cycle Day 1` no longer appears in the pill.
5. Confirm the compassionate cycle feedback still appears.
