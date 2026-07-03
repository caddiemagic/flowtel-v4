# 🌹 Flowtel Release 0.4.3

## Feature
Luxury Suite Refinement + Turndown Service

## Additional Refinements Included

- Concierge Desk button changed from “Go to My Suite” to “Clock Out.”
- Added placeholder “My Guests” section for future assigned clients.
- Removed repeated feels-like / inner-season flag beside the Concierge action button.
- Updated Turndown copy to “a little extra love today.”
- Added welcome-page copy normalization for “WELCOME HOME TO” and “the Flowtel.”
- Moved “You Are Here” lower so it clears SOUTH.
- Pulled cardinal directions inward so they remain inside the wheel card perimeter while staying outside the number ring.
- Center compass upgraded into a gold rose compass with compass points, rose spiral, and subtle blooming petals.
- Strengthened the Medicine Wheel rings for a cream-and-gold luxury spa-day look.

## Changed Files

```txt
client/app.js
client/styles.css
manager/index.html
manager/app.js
manager/styles.css
shared/turndown.js
database/migration-004-turndown-service.sql
docs/RELEASE.md
```

## Database

Run this migration in the Supabase SQL Editor if you have not already run the 0.4.3 migration:

```txt
database/migration-004-turndown-service.sql
```

This adds Turndown Service request tracking to existing stays:

```txt
turndown_requested_at
turndown_status
```

No additional database changes were added for the extra refinements.

## Installation Instructions

Replace:

```txt
flowtel-v4/client/app.js
```

with:

```txt
Release-0.4.3/client/app.js
```

Replace:

```txt
flowtel-v4/client/styles.css
```

with:

```txt
Release-0.4.3/client/styles.css
```

Replace:

```txt
flowtel-v4/manager/index.html
```

with:

```txt
Release-0.4.3/manager/index.html
```

Replace:

```txt
flowtel-v4/manager/app.js
```

with:

```txt
Release-0.4.3/manager/app.js
```

Replace:

```txt
flowtel-v4/manager/styles.css
```

with:

```txt
Release-0.4.3/manager/styles.css
```

Add:

```txt
Release-0.4.3/shared/turndown.js
```

to:

```txt
flowtel-v4/shared/turndown.js
```

Run:

```txt
Release-0.4.3/database/migration-004-turndown-service.sql
```

in the Supabase SQL Editor if it has not already been run.

## Notes

This release does not work on Squarespace integration, SSO, URL routing, or database redesign.

The “Open My Passport” replacement copy is intentionally not changed yet because the final replacement text has not been confirmed.

The “My Guests” area is a visual placeholder only. No assigned-client data model was added in this release.

## QA Checklist

1. Replace the changed files.
2. Run the Turndown migration if it has not already been run.
3. Sign in as a guest.
4. Confirm the welcome copy reads “WELCOME HOME TO” and “the Flowtel.”
5. Enter cycle day and feels-like season.
6. Check into the Suite.
7. Confirm Medicine Wheel placement:
   - Day 1 is directly below WEST.
   - Day 28+ is directly above WEST.
   - numbers are evenly spaced.
   - cardinal directions sit inside the wheel card perimeter but outside the number ring.
   - “You Are Here” no longer overlaps SOUTH.
   - gold marker sits directly over the active room.
8. Confirm the center reads as a gold rose compass, not four pillars.
9. Confirm Turndown copy says “a little extra love today.”
10. Request Turndown Service.
11. Sign into Concierge as practitioner/owner/admin.
12. Confirm the Suite action says “Clock Out.”
13. Confirm the placeholder “My Guests” section appears.
14. Confirm the Turndown queue cards do not repeat feels-like / inner-season data beside the action button.
15. Leave a Concierge Note and confirm the guest leaves the Turndown queue.

## Commit

```bash
git add client/app.js client/styles.css manager/index.html manager/app.js manager/styles.css shared/turndown.js database/migration-004-turndown-service.sql docs/RELEASE.md
git commit -m "Release 0.4.3 - Luxury suite refinement and Turndown Service"
```
