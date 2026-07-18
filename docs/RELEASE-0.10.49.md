# Flowtel v0.10.49 — Personal Room Keys + Secure Remembered Entry

Release date: 2026-07-17

## Summary

This release turns the shared beta password into a one-time entrance credential. A beta member may enter with `FlowtelBeta!2026`, but non-admin members must create a private Flowtel password before the Suite opens. The browser keeps the Supabase session, so later visits on that browser continue directly into Flowtel until the member signs out or clears browser storage.

The release also stops the beta bridge and Request Access endpoint from resetting passwords on accounts that already exist.

## Intended member journey

### New beta member

1. The member requests beta access or chooses **I'm New**.
2. If no Auth account exists, Flowtel creates one with `FlowtelBeta!2026`.
3. The member signs in with the temporary beta password.
4. Before entering the Suite, Flowtel requires **Create My Private Room Key**.
5. The authenticated member chooses and confirms a private password.
6. Flowtel stores only a completion timestamp in `public.profiles`; the password remains in Supabase Auth.
7. The member continues into today's Flowtel arrival flow without being logged out.

The Request Beta Access page may automatically complete step 3 only when it created a brand-new account during that same request. Existing accounts are never automatically entered with the shared beta password.

### Returning member

- **I've Stayed Before** opens the secure email-and-password form.
- Flowtel does not call the bridge to replace or guess the password.
- The member enters the private password she created.
- On a browser with a valid remembered session, Flowtel bypasses the doorway and opens her account automatically.

### Forgot password

- **Forgot your password?** sends a Supabase recovery email.
- The recovery link returns to `/client/?passwordRecovery=1`.
- The member chooses a new private room key inside Flowtel and remains logged in on that browser.

### Switch Account

A new **Switch Account** control signs out only the current browser session, clears Flowtel's local Suite handoff, and returns to the secure doorway.

## Password preservation repair

### `/api/squarespace-bridge`

- Creates a missing Auth account with the temporary password.
- Updates metadata and email confirmation for an existing account.
- Never sends a password field when updating an existing Auth user.
- Reports whether the account was created or already existed.

### `/api/beta-request`

- Returns the temporary password only when the request created a brand-new Auth account.
- Preserves an existing member's personal password.
- Does not automatically sign an existing account in.
- Preserves existing profile roles when refreshing name and membership metadata.

## Supabase migration required

Run:

`database/migration-038-personal-room-keys.sql`

Migration 038:

- adds `profiles.password_setup_completed_at`
- marks admin, owner, Megan's owner account, and local `@test.local` development profiles as already complete
- adds `flowtel_complete_password_setup()` for the authenticated member
- stores no password or password hash in `public.profiles`
- does not alter existing Supabase Auth passwords

## Important migration warning

Do **not** rerun:

`database/migration-037-beta-login-credential-alignment.sql`

Migration 037 was a one-time beta alignment script. Rerunning it after v0.10.49 would replace members' private passwords with the shared temporary password again.

## Supabase Auth URL configuration

For **Forgot your password?** to return to the Flowtel recovery screen, add this production redirect URL in Supabase Auth → URL Configuration:

`https://app.theflowtel.com/client/`

The production Site URL should also use the Flowtel production domain rather than localhost.

## Files changed

- `api/beta-request.js`
- `api/squarespace-bridge.js`
- `beta-request/app.js`
- `beta-request/index.html`
- `client/app.js`
- `client/index.html`
- `client/styles.css`
- `database/migration-038-personal-room-keys.sql`
- `docs/CHANGELOG.md`
- `docs/RELEASE-0.10.49.md`
- `docs/TEST_USERS.md`
- `shared/auth.js`
- `shared/profiles.js`

## Syntax and validation checks

- `node --check api/beta-request.js`
- `node --check api/squarespace-bridge.js`
- `node --check beta-request/app.js`
- `node --check client/app.js`
- `node --check shared/auth.js`
- `node --check shared/profiles.js`
- HTML duplicate-ID validation for `client/index.html` and `beta-request/index.html`
- CSS parse validation for `client/styles.css` and `beta-request/styles.css`
- mocked API test confirming existing beta-request users preserve passwords
- mocked API test confirming new beta-request users receive the temporary password once
- mocked API test confirming existing Squarespace bridge users preserve passwords
- mocked API test confirming the Squarespace bridge assigns the temporary password only to missing Auth users

## First test checklist

1. Run migration 038.
2. Do not rerun migration 037.
3. Add `https://app.theflowtel.com/client/` to Supabase Auth Redirect URLs.
4. Deploy v0.10.49.
5. Open Flowtel in a fresh private browser.
6. Sign in as an existing non-admin beta member with `FlowtelBeta!2026`.
7. Confirm the private room-key doorway appears before the Suite or check-in form.
8. Create and confirm a private password of at least 10 characters.
9. Confirm the member enters Flowtel without being logged out.
10. Close the tab, return to the Flowtel URL in the same browser, and confirm the remembered session opens automatically.
11. Choose **Switch Account** and confirm Flowtel returns to the login doorway.
12. Sign in again with the new private password.
13. Confirm `FlowtelBeta!2026` no longer opens that member's account.
14. Test **Forgot your password?**, open the email link, and save a new password.
15. Submit Request Beta Access for an already-existing account and confirm its personal password is preserved.
16. Submit Request Beta Access for a genuinely new account and confirm the first-time private room-key doorway appears.
17. Confirm Megan's owner password and Concierge access were not changed.
