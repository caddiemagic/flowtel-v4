# Flowtel v0.10.32 — Concierge Session Gate Repair

## Summary

This release repairs Concierge Desk access for practitioner-level users during Phase 1 beta.

The Concierge Desk now behaves as a Supabase session + role checkpoint instead of a separate password doorway.

## What changed

- Added the missing `isPractitionerLevel` / Phase 2 gate import to `manager/app.js`.
- Removed the separate Concierge email/password login form from the Desk UI.
- Concierge Desk now checks the active Supabase session automatically.
- Practitioner-level users can open the Desk directly:
  - `practitioner`
  - `admin`
  - `owner`
- Client/beta guest users still see the Phase 2 gated page.
- Logged-out users see a clear access prompt and button to enter through Flowtel first.
- Updated manager asset cache busting to `0.10.32`.

## Migration

No Supabase migration required.

## Testing checklist

1. Log in as `mm.johnson@icloud.com` through Flowtel.
2. Confirm Megan's profile role is `owner`.
3. Open `/manager/`.
4. Confirm the Concierge Desk opens without asking for a separate Concierge password.
5. Log out.
6. Open `/manager/` again.
7. Confirm the page asks you to enter through Flowtel first.
8. Log in as a beta tester with `role = client`.
9. Open `/manager/`.
10. Confirm the Phase 2 beta gate appears.

## Syntax checks

- `node --check manager/app.js`
