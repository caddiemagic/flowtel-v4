# Flowtel v0.10.31 — Flow Map + Tracker + Mentor Polish

## Summary

This release applies Notes 037–050 from the latest Flowtel product notes packet. It focuses on Flow Map simplification, public tracker copy polish, mentor selection refinement, Powder Room wording, and clearer login loading states.

## What changed

- Flow Map note cards now show only a simple **DAY X** tag.
- Powder Room copy now uses **others** instead of **other women** in Summer and Autumn descriptions.
- Mentor selection copy no longer repeats **Choose your Mentor to the Moon**.
- Mentor cards have a more refined full-width luxury presentation.
- Mentor cards use `queendom-scarab-sundisk.png` as the fallback image when no mentor photo exists.
- Mentor card moon initiation/wing metadata is removed.
- The public tracker intro line and header disclaimer were removed from the top of the tracker.
- The anonymous data disclaimer now appears under the public tracker **Enter the Queendom** CTA.
- Actual Season labels on the tracker show the full Inner Season names.
- Feels Like labels remain simple season names.
- Public tracker CTA button now reads **Enter The Flowtel** and points to the Queendom registration page.
- Public tracker CTA body copy now explains the Flowtel value more directly.
- Flow Map Practice guidance moved below the Flow Map.
- The Printable Flow Map action now lives inside the Flow Map Practice pill.
- Flow Map **Print / Save PDF** was removed from the page and More menu.
- Flow Map controls were simplified and no longer show the person name prominently.
- Added a soft loading overlay after login begins, with disabled login controls while Flowtel routes the guest.

## Supabase

Run this migration:

```text
database/migration-029-mentor-accepting-clients-default.sql
```

This sets `mentor_accepting_clients` to default `false` and prevents practitioner/client accounts from appearing as mentors unless explicitly approved.

## Syntax checks

- `node --check api/beta-request.js`
- `node --check client/app.js`
- `node --check cycle-data/app.js`
- `node --check flow-map/app.js`
- `node --check shared/relationships.js`
- Extracted the inline public tracker script from `tracker/index.html` and checked it with `node --check`.

## First test checklist

1. Run migration 029.
2. Open `/flow-map/` and confirm note cards only show **DAY X**.
3. Confirm Flow Map controls no longer show the guest name prominently.
4. Confirm Printable Flow Map is in the Flow Map Practice pill below the map.
5. Confirm Print / Save PDF is gone from Flow Map.
6. Open `/tracker/` and confirm Actual Season says Inner Winter/Spring/Summer/Autumn.
7. Confirm Feels Like still shows Winter/Spring/Summer/Autumn only.
8. Confirm the tracker CTA button reads **Enter The Flowtel** and points to Queendom.
9. Open mentor selection and confirm the card feels full-width/luxury and does not show wing/moon metadata.
10. Test login and confirm the loading overlay appears while routing.
