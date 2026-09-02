# Flowtel v0.10.87.1 — Vercel Function Budget Hotfix

## Purpose

Restore deployment of v0.10.87 on the current Vercel Hobby plan without weakening or redesigning the new 4-Week Womb Magic Portal.

The v0.10.87 build completed successfully, but Vercel refused to deploy the output because Flowtel contained 13 JavaScript files under `/api`, while the Hobby plan permits at most 12 Serverless Functions per deployment.

## Root cause

v0.10.87 added:

`api/womb-magic-portal.js`

That was the 13th deployed Serverless Function. The Portal function itself is valid and remains required.

The repository still also contained:

`api/beta-request.js`

The public beta-request flow was retired in v0.10.85.1. `/beta-request/` now immediately redirects to the canonical `/client/` entrance, so the legacy beta-request serverless backend is no longer part of the live member journey.

## Hotfix

- Remove only `api/beta-request.js`.
- Keep the static `/beta-request/` page and redirect so old bookmarks remain safe.
- Keep `api/womb-magic-portal.js` and every currently active server boundary unchanged.
- Add `scripts/validate-vercel-function-budget.js` to enforce a maximum of 12 `/api/*.js` functions while Flowtel remains on the Hobby plan.

After this hotfix, Flowtel has exactly 12 Serverless Functions.

## Migration

**No migration required.**

If migration 073 was already run for v0.10.87, do not rerun it. The next migration remains **074**.

## Deployment

Deploy v0.10.87.1 to Vercel. The prior failed v0.10.87 deployment never became production, so no rollback is required.

First verify the Vercel deployment reaches Ready/Production, then confirm the Suite displays the **4-WEEK WOMB MAGIC PORTAL** card beneath the complimentary Womb Magic card.

## First live checks

1. Vercel build and deployment completes instead of failing on the 12-function Hobby limit.
2. `/client/` displays the new 4-Week Womb Magic Portal card.
3. `/beta-request/` still safely redirects to `/client/`.
4. Existing sign-in, first-time account creation, and Forgot Password remain on the canonical `/client/` architecture.
5. Existing monthly Womb Magic still opens.
6. The 4-Week Portal can load providers/recurring availability.
7. Event ticket verification, Guest House, and Caddie Magic server routes remain reachable.

## Validation

Run:

`node scripts/validate-vercel-function-budget.js`

Expected:

`Vercel Hobby function budget OK: 12/12`

This is source/deployment validation only. Production behavior still requires the first-live checks above.
