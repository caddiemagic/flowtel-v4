# Flowtel v0.10.79 — Availability Rhythm Redesign

Release date: 2026-07-29

Caddie Magic remains **v0.5.2**. This release redesigns the Flow FM Availability experience without changing its database model, permissions, saved timezone, historical dated availability table, or future calendar-integration boundary.

## Summary

Availability now opens as four quiet Inner Season summary cards rather than four always-expanded Monday-through-Sunday forms. A Priestess edits one season at a time through a guided flow that supports a simple shared rhythm first and reveals individual-day complexity only when requested.

## Seasonal overview

Each Inner Season card shows one concise result:

- resting with no client calls;
- selected days plus one shared time window;
- selected days plus multiple shared windows; or
- a custom-hours summary when individual days differ.

The main page contains no weekday inputs or empty time controls.

## Guided rhythm flow

For one selected Inner Season, the member chooses:

1. whether she is accepting client calls or resting;
2. the weekdays that feel available;
3. a Morning, Afternoon, Evening, or exact-time rhythm;
4. optional individual-day hours;
5. whether to copy the rhythm to another season or use it all year.

The final review shows the selected days, times, and saved timezone before **Save My Rhythm** is pressed.

## Preservation rules

- Existing saved seasonal availability is loaded into the new flow.
- Existing custom hours and multiple windows remain editable.
- Closing a day or resting for a season preserves retained time windows under migration 061 behavior.
- The current `flowtel_availability_load` and `flowtel_availability_save_season` RPCs remain the source of truth.
- The legacy dated 28-day availability table remains preserved for compatibility and audit.
- Availability remains a weekly preference, not a live booking promise.

## Migration

**No new migration is required.**

Migrations 058 and 061 remain the existing Availability foundation and should not be rerun merely for this release.

## First test checklist

1. Deploy v0.10.79 and hard-refresh `/flow-fm/availability/`.
2. Confirm only four seasonal summary cards appear initially.
3. Open a season and choose **No calls this season**; save and confirm the card changes to Resting.
4. Open another season, choose Tuesday through Thursday and Afternoon; save and confirm the summary reads Tuesday–Thursday and 12:00 PM–4:00 PM.
5. Customize one selected day and confirm the card changes to Custom hours.
6. Add a second time window and confirm it persists after refresh.
7. Use **Use this rhythm all year** and confirm all four cards update.
8. Confirm times display in the member’s saved timezone.
9. Confirm existing previously saved custom schedules load without data loss.
10. Confirm Caddie Magic v0.5.2 is unchanged.
