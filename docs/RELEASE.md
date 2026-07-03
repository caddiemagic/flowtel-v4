# 🌹 Flowtel Release 0.5.0

## Feature
Arrival Flow + SSO Prep

## Changed Files

- `client/index.html`
- `client/app.js`
- `client/styles.css`
- `shared/stays.js`
- `shared/flowtel.js`

## Database

None.

## What Changed

- Removed the top arrival choice buttons from the cycle input flow.
- Guests now enter cycle day and feels-like inner season first.
- Replaced the room-key button with `Check In`.
- Added practitioner-only `Clock In` below `Check In`.
- Added daily routing after Supabase sign-in:
  - if today’s stay exists, open the Suite automatically.
  - if today’s stay does not exist, open the arrival/check-in form.
- Added a Suite-level `Clock In` button for practitioner/admin/owner roles so practitioners can clock in later after checking in as guests.
- Kept the Lounge-level `Clock In` option for practitioner/admin/owner roles.
- Added clear Squarespace SSO prep hooks while preserving the current Supabase email/password beta login.
- Added `getTodaysStay()` to the shared stay layer and exported it through `shared/flowtel.js`.

## Medicine Wheel

No Medicine Wheel geometry, styling, rendering, or behavior was intentionally changed in this release.

## Installation Instructions

Replace:

```txt
flowtel-v4/client/index.html
```

with:

```txt
Release-0.5.0/client/index.html
```

Replace:

```txt
flowtel-v4/client/app.js
```

with:

```txt
Release-0.5.0/client/app.js
```

Replace:

```txt
flowtel-v4/client/styles.css
```

with:

```txt
Release-0.5.0/client/styles.css
```

Replace:

```txt
flowtel-v4/shared/stays.js
```

with:

```txt
Release-0.5.0/shared/stays.js
```

Replace:

```txt
flowtel-v4/shared/flowtel.js
```

with:

```txt
Release-0.5.0/shared/flowtel.js
```

No SQL migration is required.

## Commit

```bash
git add .
git commit -m "Release 0.5.0 - Arrival flow and SSO prep"
```
