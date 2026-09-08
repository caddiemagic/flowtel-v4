# Flowtel v0.10.89.1 — First Live Test

## Deploy

1. Do **not** run a new migration for this hotfix.
2. If migration 075 is already live, leave it unchanged.
3. Overlay the v0.10.89.1 patch onto current v0.10.89 source.
4. Commit/push and wait for Vercel to report Ready.

## Test auth doorway first

1. Open `/client/` in a browser/profile that was previously logged in.
2. Confirm the remembered session auto-enters.
3. Sign out and return to `/client/`.
4. Click Sign In with an intentionally wrong password and confirm visible error feedback.
5. Enter a valid email/password and confirm the existing account opens.
6. Refresh `/client/` and confirm the valid remembered session opens again.
7. Repeat once in a private/incognito window to confirm a clean login works.

## Then test the v0.10.89 event feature

1. Open My Upcoming Events.
2. Confirm existing single-day events still render.
3. Confirm Womb Magic Committee renders as one series/vortex.
4. Register/open one eligible test member and confirm the series sync path still works.
5. Confirm no duplicate Acuity enrollment is created on refresh.
6. Download Apple/Outlook calendar and confirm all sessions are present.

## Status language

Do not mark v0.10.89.1 production verified until the owner confirms the auth-doorway checks above in the live deployment.
