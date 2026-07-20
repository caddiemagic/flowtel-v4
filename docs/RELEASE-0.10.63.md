# Flowtel v0.10.63 — Guest House Accounts + Replay Status Portal

Release date: 2026-07-20

## Summary

This release changes the Flowtel Guest House from an anonymous request form plus manually shared room key into a remembered, password-based portal for former 1:1 clients.

A woman now creates a private Guest House account or signs into an existing account before requesting her call replay. Her browser keeps the Supabase session, allowing her to return to `/guest-house/` and check her replay status without waiting for an email or retaining a reference number as her only doorway.

The Guest House account remains explicitly separate from the Flowtel membership system. It does not open the Suite, Queendom, Flow FM, Team Map, cycle data, stays, Powder Rooms, Flow Map, mentor data, Concierge, Honors, Priestess Mailbox, Moonbox, or Caddie Magic.

## Approved client journey

1. Open `/guest-house/`.
2. Create a Guest House account with first name, last name, email, and password, or sign into an existing account.
3. Submit a replay request using only:
   - first name;
   - last name;
   - **What do you remember about the call?**;
   - ownership confirmation.
4. Return to the same page to see one of three hospitality states:
   - **Concierge is locating your recording**;
   - **Your Replay Room is ready**;
   - **Concierge couldn't find your replay**.
5. When ready, stream or download the private replay directly inside the signed-in Guest House portal.

The approximate call date/month and requester private-note fields have been removed.

## Account and session behavior

- New accounts use email and password.
- Accounts are created as confirmed Supabase Auth users without requiring an email-confirmation message.
- Supabase's remembered browser session automatically reopens the Guest House on return.
- No email notification or email-delivery integration is required in this release.
- Password recovery email is intentionally not exposed yet; the sign-in page directs a guest to contact Megan if her room key is lost.
- Existing Flowtel members sign in with their existing account rather than creating a duplicate.
- Existing anonymous Guest House requests remain separate and continue through their original private room keys; a login email never claims an older replay automatically.
- Existing private Replay Room token links continue to work for legacy requests.

## Product-access protection

Migration 049 adds an explicit `guest_house` access role with both `flowtel_access` and `caddie_magic_access` set to false.

A Guest House account cannot self-upgrade by visiting a protected Flowtel route. It is redirected back to the Guest House.

If the same woman later enters through a legitimate Queendom or Flowtel membership doorway and a real Flowtel profile is created for the same Auth identity, the established product-access claim can promote the account while preserving her Guest House request and replay history.

## Concierge changes

The owner Guest House queue now:

- identifies remembered Guest House accounts separately from legacy anonymous requests;
- displays only **What she remembers about the call** from the client request;
- removes the call date/month and requester private-note fields;
- offers the three approved owner-facing statuses;
- explains that account holders return through `/guest-house/` and need no emailed invitation or private link;
- removes the **Email Invitation** control;
- preserves legacy private-room-key controls for requests created before account-based access;
- preserves the v0.10.62 large-file selection, resumable upload, progress continuity, and pending-finalization recovery.

## Private media

- Ready recordings remain in the private `flowtel-guest-house-replays` bucket.
- The account portal verifies the signed-in Auth user and the Guest House identity linked to that user.
- Private media URLs are signed for 15 minutes.
- Storage paths are never returned to the visitor.
- Stream and download events remain append-only.
- Existing token-gated Replay Rooms remain available for legacy links.

## Migration instructions

Run once, after migrations 046, 047, and 048:

`database/migration-049-guest-house-accounts-replay-status-portal.sql`

Migration 049:

- adds `auth_user_id` and `account_created_at` to Guest House identities;
- adds the explicit `guest_house` product-access role;
- protects Guest House-only accounts from automatic Flowtel access;
- adds safe same-account membership promotion after a legitimate profile exists;
- creates an account-owned Guest House identity without claiming legacy requests by email;
- adds authenticated account-claim and replay-request RPCs;
- expands the call-memory field to 2,000 characters;
- extends the owner queue with account ownership information;
- preserves all existing requests, files, room keys, and events.

**Do not rerun migration 037.**

No email-provider environment variables are required for v0.10.63.

## Files changed

- `api/guest-house-account.js`
- `api/guest-house-portal.js`
- `api/guest-house-request.js`
- `api/guest-house-access.js`
- `database/migration-049-guest-house-accounts-replay-status-portal.sql`
- `guest-house/index.html`
- `guest-house/app.js`
- `guest-house/styles.css`
- `guest-house/replay/index.html`
- `guest-house/replay/page.js`
- `manager/index.html`
- `manager/app.js`
- `manager/styles.css`
- `server/guest-house-server.js`
- `shared/guest-house-core.js`
- `shared/guest-house.js`
- `shared/supabase.js`
- `scripts/test-guest-house.mjs`
- `scripts/test-guest-house-api.mjs`
- `scripts/validate-guest-house.mjs`
- `docs/CHANGELOG.md`
- `docs/RELEASE-0.10.63.md`

## Preservation guarantees

This release does not reset passwords or remembered sessions; does not create Flowtel membership for Guest House accounts; and does not change one-stay-per-Flowtel-Day behavior, append-only stay/note history, Flowtel Time, owner-only Concierge access, owner all-wing Turndown routing, unread Concierge-note continuity, Team Map boundaries, mentor consent, Powder Room anonymity, Flow Map history, Medicine Wheel geometry, actual-versus-recorded cycle-day behavior, Moonbox beta hold, Hourly Flow Rate records, Flowtel Honors, Priestess Mailbox, or Caddie Magic.

## First test

1. Confirm migrations 046–048 are already installed.
2. Run migration 049 once.
3. Deploy the complete v0.10.63 project.
4. Open `/guest-house/` in a private browser.
5. Create a new Guest House account.
6. Confirm no confirmation email is required and the portal opens immediately.
7. Submit a request using first name, last name, and call memory only.
8. Confirm the portal shows **Concierge is locating your recording**.
9. Close and reopen the browser, return to `/guest-house/`, and confirm the remembered session reopens the request.
10. In owner Concierge, confirm the request is labeled **Guest House Account** and contains no call-date or requester-note fields.
11. Upload a small replay and confirm the owner status becomes ready.
12. Return to the guest browser and confirm **Your Replay Room is ready** with stream and download controls.
13. Set another test request to **Concierge couldn't find her replay** and confirm the client sees **Concierge couldn't find your replay**.
14. Sign out and sign back in with the same email/password.
15. Create an account using the same email as a legacy anonymous request and confirm it creates a separate account-owned doorway rather than exposing or claiming the older replay.
16. Confirm the old token-based Replay Room link still opens independently.
17. Attempt to open `/client/` as a Guest House-only account and confirm it returns to `/guest-house/` without creating Flowtel access.
