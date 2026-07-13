# Flowtel v0.10.19 — Remembered Room Key + Bridge Fallback

This release makes the Phase 1 beta doorway feel more like SSO without depending on full Squarespace SSO.

## What changed

- Added a startup remembered-session check to the guest app.
- If a Supabase session already exists in the browser, Flowtel now bypasses the email doorway and opens the correct daily flow:
  - if the guest already checked in today, open the Suite;
  - if the guest has not checked in today, open Check-In.
- Preserved Flowtel Day logic and stale-stay protection before reopening any remembered room.
- Added explicit testing helpers:
  - `/client/?logout=1` signs out and clears the remembered room key on that browser;
  - `/client/?forceDoorway=1` or `/client/?doorway=1` forces the member doorway even if a remembered Supabase session exists.
- Improved the Squarespace bridge authorization failure path.
  - If the Squarespace Contacts API returns an authorization/permission error during beta setup, Flowtel opens the Developer Login fallback instead of leaving the tester stuck at a raw returning-member error.
- Improved server bridge error metadata so Vercel/API logs can distinguish a Squarespace Contacts rejection from a generic bridge failure.
- Updated client cache busting to v0.10.19.

## What this does not change

- This is still a Squarespace member bridge, not full automatic Squarespace SSO.
- It does not expose Squarespace API keys in browser code.
- It does not open Clock In, the live Concierge Desk, or the broader practitioner ecosystem during Phase 1.
- No Supabase migration is required.

## Recommended testing

1. Log in through the Flowtel member bridge or Developer Login once.
2. Close the tab.
3. Reopen `/client/?membership=queendom` or `/client/?membership=flowfm` in the same browser.
4. Confirm the email doorway is bypassed.
5. Confirm the guest lands on Check-In if they have not checked in today.
6. Confirm the guest lands on the Suite if they already checked in today.
7. Visit `/client/?forceDoorway=1` and confirm the email doorway appears.
8. Visit `/client/?logout=1` and confirm the browser signs out.
9. While the Squarespace API key setup is still being debugged, click `I've Stayed Before` and confirm the app opens Developer Login instead of only showing a raw `not authorized` error.

## Syntax checks

- `node --check api/squarespace-bridge.js`
- `node --check client/app.js`
