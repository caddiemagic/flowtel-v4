# Flowtel v0.10.26 — Beta Access Auto-Login + Smart Entry Polish

## Summary

This release combines the pending Smart Entry copy polish with a smoother beta access flow. After a Queendom or Flow FM member requests access with the beta code, Flowtel now creates or refreshes the Supabase account and automatically logs the guest into Flowtel instead of sending her to a second password screen.

## What changed

- Added `/enter/` smart entry page.
- Moon Magic widget CTA now says **Enter the Flowtel** and routes to `/enter/?membership=queendom`.
- Smart Entry uses clear beta language:
  - **I’ve checked in before**
  - **Request access**
  - **We’re logging you in.**
- Smart Entry bottom line says: **It’s always sunny on the moon.**
- Removed room-key language from the beta access request flow.
- Removed the extra login step after successful beta access request.
- `/api/beta-request` now refreshes the beta temporary password for created/existing beta accounts and returns it to the requesting page for automatic sign-in.
- `/beta-request/` signs the guest in automatically after successful access creation and sends her to `/client/?membership=...`.
- Updated cache-busting to `0.10.26` for affected routes.

## Supabase

No migration required.

Requires these Vercel environment variables for beta access creation:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FLOWTEL_BETA_REQUEST_CODE`
- `FLOWTEL_BETA_TEMP_PASSWORD`

## Testing

1. Open `/enter/?membership=queendom` while logged out.
2. Confirm it shows **I’ve checked in before** and **Request access**.
3. Click **Request access**.
4. Submit the beta request form with the correct beta code.
5. Confirm the guest is automatically logged in and routed into Flowtel.
6. Close the tab and reopen `/enter/?membership=queendom`.
7. Confirm it says **We’re logging you in.** and opens Flowtel.
8. Visit `/client/?logout=1` to clear the remembered session during testing.

## Syntax checks

- `node --check api/beta-request.js`
- `node --check beta-request/app.js`
- `node --check enter/app.js`
- `node --check client/app.js`
- `node --check moon-widget/app.js`
