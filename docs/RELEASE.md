# 🌹 Flowtel Release 0.4.3

## Feature
Luxury Suite Refinement + Turndown Service

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

Run this migration in the Supabase SQL Editor:

```txt
database/migration-004-turndown-service.sql
```

This adds Turndown Service request tracking to existing stays:

```txt
turndown_requested_at
turndown_status
```

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

in the Supabase SQL Editor.

## Notes

This release does not work on Squarespace integration, SSO, URL routing, or database redesign.

The Medicine Wheel was refined, not redesigned:

- Day 1 sits directly below WEST.
- Day 28+ sits directly above WEST.
- All 28 day markers are equally spaced.
- Cardinal directions sit outside the number ring.
- Inner Seasons anchor the four corners surrounding the wheel.
- The center rose has been replaced with an elegant gold compass rose.
- The “You Are Here” label sits lower with a gold diamond legend.

The Suite was refined:

- Removed repeated “Room X is ready.” language.
- Increased Moon Magic card width to align with the Medicine Wheel card.
- Replaced the old Concierge note state with Turndown Service language.

The Concierge Desk was refined:

- Removed the Witnessed Today stat pill.
- Renamed the queue to Guests Awaiting Turndown Service.
- Queue now only shows stays with a Turndown Service request.
- Completing a Concierge Note removes the guest from the Turndown queue.

## Important Shared Module Note

`shared/turndown.js` dynamically looks for your existing Supabase client export in one of these files:

```txt
shared/supabase.js
shared/supabaseClient.js
shared/client.js
```

It expects one of those modules to export `supabase` or a default Supabase client. If your project uses a different shared Supabase filename, update the candidate list at the top of `shared/turndown.js`.

## QA Checklist

1. Run the Supabase migration.
2. Replace the changed files.
3. Sign in as a guest.
4. Enter cycle day and feels-like season.
5. Check into the Suite.
6. Confirm Medicine Wheel placement:
   - Day 1 below WEST.
   - Day 28+ above WEST.
   - numbers are evenly spaced.
   - cardinal directions are outside the number ring.
7. Confirm Moon Magic card width aligns visually with the Medicine Wheel card.
8. Click Request Turndown Service.
9. Confirm the request state changes to Turndown Service Requested.
10. Sign into Concierge as practitioner/owner/admin.
11. Confirm the guest appears in Guests Awaiting Turndown Service.
12. Leave a Concierge Note.
13. Confirm the guest leaves the Turndown queue.
14. Return to the Suite and confirm the Concierge note card appears.

## Commit

```bash
git add client/app.js client/styles.css manager/index.html manager/app.js manager/styles.css shared/turndown.js database/migration-004-turndown-service.sql docs/RELEASE.md
git commit -m "Release 0.4.3 - Luxury suite refinement and Turndown Service"
```
