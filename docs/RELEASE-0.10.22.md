# Flowtel v0.10.22 — Beta Access Request Form

## Purpose

This release adds a controlled self-access flow for Phase 1 beta testers. Instead of manually creating every Queendom or Flow FM beta tester in Supabase, Megan can place a **Request Flowtel Access** button or embedded form inside a Squarespace member-gated page.

Squarespace remains the front gate. Flowtel prepares the room key.

## What changed

- Added `/beta-request/` as a standalone Flowtel beta access request page.
- Added `/api/beta-request` as a server-side Vercel endpoint.
- The endpoint can create or refresh:
  - Supabase Auth user
  - `public.profiles` row
  - `role = client`
  - email-confirmed beta access
- Added optional beta access code support through `FLOWTEL_BETA_REQUEST_CODE`.
- Added optional beta password override through `FLOWTEL_BETA_TEMP_PASSWORD`.
- Added `database/remove-manual-beta-test-accounts.sql` so manually seeded tester accounts can be cleared before testing the request form.
- Added `/beta-request` rewrite in `vercel.json`.

## Recommended beta setup

Add these optional environment variables in Vercel:

```text
FLOWTEL_BETA_REQUEST_CODE=your-private-beta-code
FLOWTEL_BETA_TEMP_PASSWORD=your-temporary-beta-password
```

If `FLOWTEL_BETA_REQUEST_CODE` is set, the form will require testers to enter that code before account creation.

If `FLOWTEL_BETA_TEMP_PASSWORD` is not set, the endpoint falls back to `FLOWTEL_BRIDGE_PASSWORD`, then `FlowtelBeta!2026`.

## Squarespace usage

Inside a protected Queendom or Flow FM Squarespace page, either link to:

```text
https://app.theflowtel.com/beta-request/
```

or embed:

```html
<iframe
  src="https://app.theflowtel.com/beta-request/"
  style="width:100%; border:0; min-height:760px;"
  loading="lazy"
></iframe>
```

## Supabase

No Supabase migration required.

The release uses existing tables and the server-side Supabase service role key already stored in Vercel.

## Files changed

- `api/beta-request.js`
- `beta-request/index.html`
- `beta-request/styles.css`
- `beta-request/app.js`
- `database/remove-manual-beta-test-accounts.sql`
- `vercel.json`
- `docs/RELEASE-0.10.22.md`
- `docs/CHANGELOG.md`

## Manual beta account cleanup

If the six beta testers were manually seeded before this release, run:

```text
database/remove-manual-beta-test-accounts.sql
```

This deletes only the six seeded beta tester Auth/profile accounts and does not delete Megan.

## Test checklist

1. Deploy v0.10.22.
2. Optional: add `FLOWTEL_BETA_REQUEST_CODE` in Vercel and redeploy.
3. Optional: add `FLOWTEL_BETA_TEMP_PASSWORD` in Vercel and redeploy.
4. Open `/beta-request/`.
5. Submit a test name/email.
6. Confirm the page shows the room key success state.
7. Confirm the user exists in Supabase Auth.
8. Confirm the user exists in `public.profiles` with `role = client`.
9. Log into `/client/?membership=queendom` with that email and the beta temporary password.
10. Confirm the remembered room key works on the second visit.

## Syntax checks

- `node --check api/beta-request.js`
- `node --check beta-request/app.js`
