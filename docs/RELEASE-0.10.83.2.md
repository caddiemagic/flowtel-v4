# Flowtel v0.10.83.2 — Calendar Migration Syntax Hotfix

Release date: August 7, 2026

## Purpose

This hotfix repairs a PL/pgSQL syntax error in migration 067 that prevented **The Flowtel Calendar** database foundation from being installed.

The failed statement used a `CASE` expression directly inside an `IF` comparison without grouping the expression. PostgreSQL stopped at the first affected event-access function before migration 067 could complete.

## What changed

Two event membership checks in `database/migration-067-flowtel-calendar.sql` are corrected from the invalid form:

`if v_rank<case when ... end then`

to the grouped PL/pgSQL expression:

`if v_rank < (case when ... end) then`

The two repaired functions are:

- `flowtel_set_queendom_event_registration(...)`
- `flowtel_get_queendom_event_join_details(...)`

No application behavior, permissions, event audience rules, Zoom protection, Availability rules, or Caddie Magic behavior are changed by this hotfix.

## Database instructions

Migration 067 did **not** complete successfully in the reported live run. The migration file is wrapped in an explicit transaction and never reached its final `COMMIT`, so the corrected migration should be run again from the beginning.

Run in this order:

1. `database/migration-067-flowtel-calendar.sql` — use the corrected v0.10.83.2 copy.
2. `database/migration-068-flowtel-calendar-polish.sql`

Do not run migration 068 first; it intentionally depends on the core event tables/functions created by 067.

Do not rename or rerun either historical migration 052 file.

No new migration number is introduced by this hotfix because migration 067 had not successfully shipped to the live database. The next new migration number remains **069**.

## Caddie Magic

Caddie Magic remains **v0.6.0**. No Caddie files, permissions, schemas, or behavior are changed.
