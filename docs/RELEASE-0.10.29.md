# Flowtel v0.10.29 — Public Cycle Tracker Temple Facelift

## Purpose

This release upgrades the public Cycle Tracker into a more luxurious Flowtel doorway and adds anonymous usage tracking so Megan can see how the free tool is being used without collecting names, emails, or user identities.

## What changed

- Gave the public Cycle Tracker a stronger Flowtel / Queendom temple visual treatment.
- Added scarab and carved-pillar visual language to the tracker hero.
- Updated the tracker hero copy so the page feels like a public temple courtyard, not a bland worksheet.
- Added a lightweight privacy note: anonymous tracker patterns may be counted, but no name or email is collected.
- Added a new “What season do you feel like today?” step before showing the result.
- Results now show both actual/calculated season and feels-like season.
- Updated the public tracker CTA to **Join the Queendom to Enter the Flowtel**.
- Added anonymous public tracker event capture through `/api/public-tracker-event`.
- Added `/tracker` to `vercel.json` rewrites.
- Added `database/migration-028-public-tracker-events.sql`.
- Added `docs/PUBLIC_TRACKER_ANALYTICS.md` with starter Supabase queries.

## Anonymous event data captured

The public tracker event table stores aggregate-friendly fields only:

- event type
- source page
- tracking method
- selected cycle day, when applicable
- selected feels-like season
- calculated inner season
- moon phase
- moon day
- next new moon
- CTA target

It does not store names, emails, auth user ids, profile ids, or direct account links.

## Supabase migration

Run:

```sql
database/migration-028-public-tracker-events.sql
```

## Syntax checks

- `node --check api/public-tracker-event.js`
- inline tracker script extracted and checked with `node --check`

## First test checklist

1. Deploy the patch.
2. Run migration 028 in Supabase.
3. Open `/tracker/`.
4. Complete the flow using a bleed date.
5. Confirm the result shows actual inner season and feels-like season.
6. Complete the flow using moon tracking.
7. Click the Queendom CTA.
8. In Supabase, confirm rows appear in `public.flowtel_public_tracker_events`.
9. Confirm no name/email/user id is stored in the public tracker event row.
