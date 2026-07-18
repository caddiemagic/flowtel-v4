# Flowtel Beta Test Users

## Personal room keys as of v0.10.49

`FlowtelBeta!2026` is now a **temporary first-entry password**, not the permanent password for every beta member.

The intended flow is:

1. A missing beta Auth account is created with `FlowtelBeta!2026`.
2. The member signs in once with that temporary password.
3. Flowtel requires her to create a private password before entering the Suite.
4. The browser remembers the Supabase session until she signs out, clears browser storage, or uses a private/incognito session that later closes.
5. A different browser or device requires the member's private password.

Run `database/migration-038-personal-room-keys.sql` after deploying v0.10.49.

### Do not rerun migration 037

`database/migration-037-beta-login-credential-alignment.sql` is retired. It was used once to align beta accounts before personal passwords existed. Rerunning it would reset non-admin beta users back to the shared temporary password.

## New account behavior

A missing Auth user may be created through:

- Request Flowtel Access
- the **I'm New** member doorway
- the server-side Squarespace bridge

Only a newly created Auth account receives `FlowtelBeta!2026`. Existing accounts keep their current password.

The Request Access page may automatically log in a member only when it created that Auth account during the same request. An existing account must use its personal password.

## Returning account behavior

**I've Stayed Before** must require:

- the exact Flowtel email
- the private password the member created

The returning path must never silently substitute `FlowtelBeta!2026` and must never reset the Auth password.

## Forgot password test

Before testing recovery, add this production redirect URL in Supabase Auth → URL Configuration:

`https://app.theflowtel.com/client/`

Then:

1. Open the secure Flowtel login.
2. Enter the member email.
3. Choose **Forgot your password?**
4. Open the newest recovery email in the same browser.
5. Confirm the Flowtel private-room-key screen appears.
6. Save a new password.
7. Confirm the member remains logged in and can return later with that password.

## Recommended test matrix

Use real inboxes or email aliases you can access:

- 3 guest/client accounts
- 2 practitioner accounts
- 1 admin/owner account

Suggested pattern:

- `you+flowtel-guest1@example.com`
- `you+flowtel-guest2@example.com`
- `you+flowtel-practitioner1@example.com`
- `you+flowtel-admin@example.com`

## Supabase Auth and profile requirements

Each Auth user should be confirmed and have a matching `public.profiles` row with the same UUID.

Minimum profile fields:

- `id` = Auth user ID
- `email`
- `first_name`
- `last_name`
- `role`
- `membership_type`
- `serving_wing` for practitioners when applicable

Migration 038 adds:

- `password_setup_completed_at`

The password itself is never stored in `public.profiles`.

## Clean account-switch testing

Use the new **Switch Account** control. It signs out only the current browser session and clears the same-day Flowtel Suite handoff.

For a completely fresh browser test:

1. Choose **Switch Account**.
2. Close all private/incognito windows when using private mode.
3. Open a new private window.
4. Enter with the test account's email and appropriate password.

## Clean first-arrival testing

A remembered session and an existing stay are separate things:

- remembered session = Flowtel knows which Auth user owns the browser session
- today's stay = the member has already checked in for the current Flowtel Date

For a clean first-arrival test, use a confirmed Auth user with no `flowtel_stays` row for today's Flowtel Date, or remove only that test user's stay data for today. Preserve profiles and Auth users unless specifically testing account creation.
