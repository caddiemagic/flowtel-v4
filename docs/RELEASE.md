# 🌹 Flowtel Release 0.4.2

## Feature
Compass Medicine Wheel + Arrival Flow Refinement

## Changed Files
- `client/app.js`
- `client/styles.css`
- `manager/index.html`
- `manager/app.js`
- `manager/styles.css`
- `docs/RELEASE.md`

## Database
None.

This release preserves current check-in logging by continuing to write arrivals through the existing `createStay()` / `flowtel_stays` flow. Clock-in preparation is handled with the existing stay record plus Concierge handoff values in `sessionStorage`:

- `flowtel:clockInStayId`
- `flowtel:clockInAt`
- `flowtel:lastSuiteStay`
- `flowtel:openSuiteFromConcierge`

A dedicated clock-in table is intentionally not included yet. For private beta, this keeps the release small and avoids adding a second source of truth before the Passport model is finalized.

## Install Instructions

Replace:

```txt
flowtel-v4/client/app.js
```

with:

```txt
Release-0.4.2/client/app.js
```

Replace:

```txt
flowtel-v4/client/styles.css
```

with:

```txt
Release-0.4.2/client/styles.css
```

Replace:

```txt
flowtel-v4/manager/index.html
```

with:

```txt
Release-0.4.2/manager/index.html
```

Replace:

```txt
flowtel-v4/manager/app.js
```

with:

```txt
Release-0.4.2/manager/app.js
```

Replace:

```txt
flowtel-v4/manager/styles.css
```

with:

```txt
Release-0.4.2/manager/styles.css
```

No SQL migration is required.

## QA Checklist

1. Sign into the Flowtel Passport.
2. Confirm cycle day and feels-like fields are visible before the arrival choice.
3. Confirm regular guests only see `Check Into the Flowtel`.
4. Confirm practitioners, owners, and admins see both `Check Into the Flowtel` and `Clock Into the Flowtel`.
5. Enter a cycle day and feels-like inner season.
6. Click `Check Into the Flowtel` and confirm the Suite opens normally.
7. Confirm the stay is still saved in Supabase.
8. Confirm the Medicine Wheel:
   - Day 1 sits just below WEST.
   - Day 28+ sits just above WEST.
   - Days travel Day 1 → SOUTH → EAST → NORTH → 28+.
   - Cardinal directions sit outside the number ring.
   - Inner Season labels sit in the four square corners.
9. Confirm the Moon Magic card width visually matches the Medicine Wheel card width.
10. As a practitioner, click `Clock Into the Flowtel` and confirm the app routes to `../manager/`.
11. Sign into the Concierge Desk.
12. Confirm the dashboard stats and filters load without console errors.
13. Confirm `Go to My Suite` appears when a Suite handoff exists.
14. Click `Go to My Suite` and confirm the app returns to the client Suite using the cached stay.
15. Open the Flowtel Lounge as a practitioner and confirm `Clock Into the Flowtel` remains available.

## Commit

```bash
git add client/app.js client/styles.css manager/index.html manager/app.js manager/styles.css docs/RELEASE.md
git commit -m "Release 0.4.2 - Compass Medicine Wheel and arrival flow refinement"
```
