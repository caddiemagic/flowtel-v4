# Flowtel v0.10.34 — Suite Clock-In Button Repair

## Summary

Restores the practitioner-level Clock Into the Flowtel action inside the guest Suite so owner/admin/practitioner users can enter the Concierge Desk while client beta testers remain blocked.

## Changes

- Added a Suite-level **Clock Into the Flowtel** button for practitioner-level roles.
- The Suite button is only visible for `practitioner`, `admin`, and `owner`.
- Client beta testers still do not see Clock In.
- The Suite button uses the same clock-in handler as the check-in and Lounge clock-in paths.
- Updated client cache-busting to `0.10.34`.

## Migration

No Supabase migration required.

## Syntax checks

- `node --check client/app.js`

## First test checklist

1. Log in as `mm.johnson@icloud.com` with role `owner`.
2. Open the Suite.
3. Confirm **Clock Into the Flowtel** appears near the Suite actions.
4. Click it and confirm the Concierge Desk opens.
5. Log in as a beta tester with role `client`.
6. Confirm the Clock In button does not appear.
