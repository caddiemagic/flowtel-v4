# Flowtel v0.10.48 — Beta Login Credential Alignment

Release date: 2026-07-17

## Summary

This release fixes the beta login failure caused by Flowtel using two different temporary passwords. The browser member bridge and Squarespace bridge used `FlowtelMemberBridge!2026`, while the beta roster and access-request flow used `FlowtelBeta!2026`. All beta entry paths now use the same canonical credential, and migration 037 realigns existing non-admin Supabase Auth users.

## What changed

### One canonical beta password

The following now use `FlowtelBeta!2026`:

- the New Member bridge
- the Returning Member bridge
- the normal beta login form guidance
- `/api/squarespace-bridge`
- `/api/beta-request`
- built-in development beta accounts

The legacy password `FlowtelMemberBridge!2026` is retired.

### Vercel environment hardening

The beta endpoints intentionally no longer fall back to `FLOWTEL_BRIDGE_PASSWORD`. This matters because an older Vercel deployment may still have that variable set to the retired password.

Both `FLOWTEL_BRIDGE_PASSWORD` and `FLOWTEL_BETA_TEMP_PASSWORD` are intentionally ignored during Phase 1. The browser and server always use `FlowtelBeta!2026`.

### Existing-user refresh

When `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are available, the Squarespace bridge now:

- locates an existing Auth user by email
- refreshes that user's temporary password
- confirms the email when needed
- then allows the browser to sign in using the same canonical password

If the Auth user does not exist, the bridge creates it with the canonical password.

### Clearer login errors

Invalid credentials now instruct testers to use:

- the exact email on the tester roster
- `FlowtelBeta!2026`

The message also explains that the Front Desk may need to refresh the Auth account if the credentials still fail.

## Supabase migration required

Run:

`database/migration-037-beta-login-credential-alignment.sql`

The migration:

- resets every profile-linked non-admin/non-owner Auth account to `FlowtelBeta!2026`
- confirms unconfirmed emails
- marks the account as Flowtel beta access in Auth metadata
- excludes admin and owner accounts
- explicitly excludes `mm.johnson@icloud.com`

This migration directly updates Supabase Auth password hashes with `pgcrypto`. It does not delete profiles, stays, cycle data, reflections, relationships, or uploaded photos.

## Files changed

- `api/beta-request.js`
- `api/squarespace-bridge.js`
- `client/app.js`
- `client/index.html`
- `database/migration-037-beta-login-credential-alignment.sql`
- `docs/CHANGELOG.md`
- `docs/RELEASE-0.10.48.md`
- `docs/TEST_USERS.md`

## Syntax checks

- `node --check api/beta-request.js`
- `node --check api/squarespace-bridge.js`
- `node --check client/app.js`

## First test checklist

1. Deploy v0.10.48.
2. Run migration 037 in Supabase SQL Editor.
3. Confirm the SQL notice reports one or more aligned non-admin accounts.
4. Open Flowtel in a private browser.
5. Enter the exact lowercase tester email.
6. Use `FlowtelBeta!2026`.
7. Confirm the returning-member bridge opens the account without the invalid-credentials error.
8. Test a second existing beta user.
9. Test a newly requested beta account and confirm automatic login works.
10. Confirm Megan's admin/owner password was not changed.
