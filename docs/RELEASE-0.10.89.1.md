# Flowtel v0.10.89.1 — Login Doorway Isolation Hotfix

## Release purpose

This narrow hotfix repairs the `/client/` authentication doorway after the v0.10.89 event-series release. The observed production symptom was that a remembered Flowtel session did not auto-enter and the visible Sign In button appeared inert.

The authentication flow itself is not redesigned. Instead, the Queendom Events module is removed from the client entry bundle's hard static import chain so event/calendar code cannot prevent login/session initialization.

## What changed

- `/client/app.js` now lazy-loads `shared/queendom-events.js` only when an event function is actually needed.
- Remembered-session boot, Sign In, account creation, password recovery, Complimentary Stay, membership recognition, and the rest of the lobby initialization can therefore run without first evaluating the Queendom Events module.
- The lazy event module uses a new `v=0.10.89.1` cache key.
- `/client/index.html` advances the app/style cache key to `v0.10.89.1` so browsers do not continue using the broken v0.10.89 client bundle.
- Repairs the v0.10.89 iCalendar escaping helper so generated Apple/Outlook `.ics` files escape backslashes, newlines, commas, and semicolons correctly.

## What did not change

- No Supabase schema or RPC changes.
- Do not rerun migration 075 if it is already installed. Migration 075 remains the event-series database boundary and 076 remains next.
- No Acuity API/server changes.
- No Squarespace membership/access changes.
- No Complimentary Stay access changes.
- No Womb Magic or 4-Week Womb Magic Portal changes.
- No Caddie Magic changes.
- No Vercel environment-variable changes.
- No serverless function was added or removed; the project remains 12/12.

## Deployment

Overlay the v0.10.89.1 patch onto the current v0.10.89 source, commit/push, and wait for Vercel Ready.

**No migration is required for this hotfix.**

After deployment, first verify `/client/` in a fresh/private browser window and in a browser that previously loaded v0.10.89.

## Production verification required

Source validation cannot prove the browser/CDN state in production. Confirm:

1. a remembered valid session auto-enters again;
2. the Sign In button responds immediately;
3. an invalid password produces normal feedback rather than a dead button;
4. a valid login opens the existing Flowtel account;
5. My Upcoming Events still loads after login;
6. the Womb Magic Committee series can still be opened/registered;
7. Apple/Outlook calendar export produces a valid multi-session `.ics` file.

Until those checks pass, this release is **SOURCE VALIDATED**, not **LIVE PRODUCTION VERIFIED**.
