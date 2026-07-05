# Flowtel Release 0.8.1 — Suite + Concierge Polish

Date: July 5, 2026

## Purpose

This release addresses the July 5 Product Notes & Bug Log items around personalization, the Suite card stack, Lounge placeholder polish, and Turndown queue state.

## Fixes

### Suite name display

- Adds cleaner profile display helpers.
- Pulls first/last name from future Squarespace bridge fields when available.
- Avoids accidental initials as the preferred greeting when a cleaner name source exists.
- Applies the same display logic to Suite greeting, welcome-back copy, and key card.

### Cycle Data card

- Adds a new thin **Cycle Data** card above the Concierge Card.
- Moves current cycle Day 1 display out of the Current Room card.
- Adds a gentle check-in streak display only after more than 14 consecutive Flowtel Day check-ins.
- Adds no-shame welcome-back copy when a guest returns after time away.

### Lounge video placeholder

- Restores the nested video placeholder pill inside the Lounge Content card.
- Keeps it as a visual placeholder only; no video integration is included.

### Concierge guest names

- Uses guest profile names in Concierge Desk rows when profile data is readable.
- Adds migration 011 to let Concierge users read profile names needed for queue labels.
- Keeps `Guest` as the final fallback only.

### Turndown queue completion

- Active Awaiting Turndown count now counts unresolved requests only.
- Completing Turndown marks the request as `completed` when the stay had an active request.
- Completed requests remain visible in the Turndown section under **Completed Requests** for the same Flowtel Day.
- Completed rows display: `[Practitioner Name] has tended to this guest.`

## Files changed

- `client/app.js`
- `client/index.html`
- `client/styles.css`
- `manager/app.js`
- `manager/styles.css`
- `shared/stays.js`
- `database/migration-011-suite-concierge-polish.sql`
- `docs/CHANGELOG.md`
- `docs/RELEASE-0.8.1.md`

## Required Supabase step

Run:

```sql
-- database/migration-011-suite-concierge-polish.sql
```

Run migration 010 first if it has not already been installed.

## Test checklist

1. Suite greeting shows a clean first name when profile/member name data is available.
2. Cycle Data appears above Concierge Card.
3. Current Room no longer shows Day 1.
4. Lounge Content shows nested video placeholder.
5. Concierge Desk shows guest names instead of generic `Guest` after migration 011.
6. Request Turndown from guest.
7. Confirm Awaiting Turndown count increases.
8. Complete Turndown with a note.
9. Confirm Awaiting Turndown count decreases.
10. Confirm the guest appears under Completed Requests for the same day.
11. Confirm completed row says the practitioner has tended to this guest.
