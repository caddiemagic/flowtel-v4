# Flowtel v0.10.21 — Trusted Doorway Bridge Hardening

## Purpose

This release repairs the Phase 1 trusted doorway behavior after the bridge surfaced this login error:

> Returning Member Error: Invalid path specified in request URL

The error can happen when the Supabase admin preparation step is unavailable, misconfigured, or pointed at a Supabase URL that includes an extra path such as `/auth/v1` or `/rest/v1`. During Phase 1 beta, Squarespace is the trusted front gate and the Supabase remembered room key should carry the daily experience, so the bridge should not block testers because optional server-side Auth preparation failed.

## What changed

- Hardened `/api/squarespace-bridge` so trusted-doorway beta mode can continue even if Supabase admin user preparation fails.
- Skipped Supabase admin user creation on the **returning member** path, because returning users should simply sign into their existing Flowtel room key.
- Normalized `SUPABASE_URL` on the server so a copied value with an extra path is reduced to the Supabase project origin before calling Auth Admin endpoints.
- Added more descriptive bridge notes for Supabase admin preparation failures.
- Updated Suite app cache-busting to `0.10.21`.

## Why this matters

The bridge should support beta testing, not block it. If Squarespace Contacts or Supabase admin preparation is unstable during Phase 1, testers can still enter through the protected Queendom/Flow FM doorway and use the remembered Flowtel session.

## Supabase

No Supabase migration required.

## Files changed

- `api/squarespace-bridge.js`
- `client/index.html`
- `docs/RELEASE-0.10.21.md`
- `docs/CHANGELOG.md`

## Test checklist

1. Deploy the patch.
2. Open `/client/?logout=1` to clear any existing test session.
3. Open `/client/?membership=queendom`.
4. Enter a known beta email.
5. Try **I've Stayed Before**.
6. The bridge should no longer show `Invalid path specified in request URL`.
7. If the account does not use the bridge password, Flowtel should reveal the manual login form instead of failing at the bridge step.
8. Once logged in, reopen `/client/?membership=queendom` and confirm the remembered room key bypasses the doorway.

## Syntax checks

- `node --check api/squarespace-bridge.js`
- `node --check client/app.js`
