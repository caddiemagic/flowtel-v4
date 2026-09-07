# Flowtel v0.10.87.3 — Squarespace Contacts Fallback + Site Probe Hotfix

## Why this hotfix exists

Live v0.10.87.2 testing isolated first-time member signup to a Squarespace Contacts 403. The production Squarespace API key was regenerated on the Advanced site with **Contacts (Read Only)** and **Orders (Read Only)**, but `POST /v1/contacts/query` still returned 403.

This hotfix keeps Squarespace and Flowtel membership verification authoritative while adding one documented read-only fallback and a server-only site diagnostic.

## Signup behavior

Flowtel still starts with the exact-email Contacts query. If `POST /v1/contacts/query` succeeds, nothing changes.

If that endpoint returns HTTP 401/403:

1. Flowtel retries with `GET /v1/contacts?pageSize=1000`.
2. It follows Squarespace pagination server-side and looks for the same exact normalized email.
3. If an exact contact is found, signup proceeds into the existing Orders verification.
4. If the list endpoint is also unauthorized, Flowtel calls `GET /1.0/authorization/website` server-side to determine whether Squarespace recognizes the API key and which website owns it.

The browser never receives the API key. The diagnostic logs do not include the member email, API key, or order payload.

## Membership boundary remains unchanged

The fallback does **not** grant a Flowtel membership. A brand-new member still needs:

- an exact Squarespace contact match;
- a PAID mapped Council, Flow FM, or Queendom order;
- the short-lived server-only `flowtel_member_signup_admissions` record;
- successful Supabase Auth signup and the existing access claim.

Flow FM purchases continue to qualify at Flow FM rank and therefore include Queendom/Flowtel access.

## Possible live outcomes

- **Account creation proceeds / confirmation email is sent** — Contacts list fallback worked and the existing Orders + Supabase path continued.
- **No Squarespace contact was found for this email address** — Contacts access worked, but the exact member email is not present on that site.
- **Squarespace Orders authorization failed** — Contacts is now working; inspect the Orders permission.
- **Could not verify an active Queendom or Flow FM membership purchase** — Contacts + Orders authorization worked; inspect mapped product IDs and the member's paid order.
- **Squarespace recognized the Flowtel API key, but Contacts access is still forbidden** — both Contacts endpoints are forbidden even though the Website authorization endpoint recognizes the key; use the server log's site metadata to verify site ownership and escalate to Squarespace if needed.
- **Squarespace rejected the Flowtel API key itself** — the Website authorization endpoint also rejected it; regenerate the key from the membership site and redeploy.

## Migration

**No Supabase migration required.**

Migration 073 remains the latest applied migration. The next migration remains **074**.

## Deployment

Deploy v0.10.87.3 website files. No database change and no new environment variable are required.

After Vercel is Ready, retry **Create My Flowtel Account** with the same eligible Flow FM member email and capture the exact result.

## Validation

Run:

`node --check api/squarespace-bridge.js`

`node scripts/validate-event-access-beta-exit.mjs`

`node scripts/validate-vercel-function-budget.js`

This is source validation only; live Squarespace behavior must still be verified in production.
