# Flowtel v0.10.87.2 — Squarespace Signup Diagnostic Hotfix

## Purpose

Make the live first-time account-creation failure diagnosable without redesigning signup or weakening membership verification.

The current member-facing error **“You are not authorized to do that.”** is a generic Squarespace provider response. Flowtel verifies a new member in two separate Squarespace stages before Supabase Auth signup begins:

1. exact-email Contacts lookup;
2. membership Orders lookup.

Before this hotfix, either stage could surface the same generic provider error.

## Hotfix

`api/squarespace-bridge.js` now distinguishes the two stages.

If Squarespace rejects Contacts with HTTP 401/403, Flowtel shows:

`Squarespace Contacts authorization failed (403). Check that the Flowtel Squarespace API key has Contacts Read Only permission.`

If Squarespace rejects Orders with HTTP 401/403, Flowtel shows:

`Squarespace Orders authorization failed (403). Check that the Flowtel Squarespace API key has Orders Read Only permission.`

Other provider failures identify the failing stage and status code while keeping the member-facing message restrained. The server also writes stage-specific diagnostics to Vercel logs without including the member email, API key, or Squarespace order payload.

## What does not change

- No change to Squarespace membership product-ID matching.
- Flow FM purchases remain valid membership proof and continue to imply Flowtel/Queendom access according to the existing membership rank.
- No change to the server-only `flowtel_member_signup_admissions` boundary.
- No change to Supabase Auth signup, confirmation, password recovery, or product-access claims.
- No new serverless function. Flowtel remains at the current Vercel Hobby function budget.

## Migration

**No Supabase migration required.**

Migration 073 remains the latest applied migration. The next migration remains **074**.

## Deployment

Deploy the website files from v0.10.87.2. No database work is required.

After production is Ready, retry **Create My Flowtel Account** with a real eligible member email. Capture the exact new error text before changing any more Squarespace configuration.

## Expected diagnostic outcomes

- **Contacts authorization failed** → inspect the API key's Contacts permission/site ownership.
- **Orders authorization failed** → inspect the API key's Orders permission/site ownership.
- **Could not verify an active Queendom or Flow FM membership purchase** → API authorization succeeded; next inspect mapped Squarespace product IDs and the member's paid order.
- **Check your email to confirm your Flowtel account** → Squarespace verification and Supabase signup both succeeded.

## Validation

Run:

`node --check api/squarespace-bridge.js`

`node scripts/validate-event-access-beta-exit.mjs`

`node scripts/validate-vercel-function-budget.js`

This hotfix is diagnostic source validation only; the live account-creation result remains the production verification.
