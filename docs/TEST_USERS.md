# Flowtel Beta Test Users


## Canonical Phase 1 beta credential

As of Flowtel v0.10.48, every non-admin beta account uses one temporary password:

`FlowtelBeta!2026`

Run `database/migration-037-beta-login-credential-alignment.sql` after deployment to align existing profile-linked Auth users. The migration excludes admin and owner accounts. New and returning member bridge requests also refresh eligible Auth users to this password when the Vercel service-role configuration is available.

The legacy `FlowtelMemberBridge!2026` password is retired. `FLOWTEL_BRIDGE_PASSWORD` is intentionally ignored by the beta account endpoints so an old Vercel environment value cannot recreate the mismatch. Both `FLOWTEL_BRIDGE_PASSWORD` and `FLOWTEL_BETA_TEMP_PASSWORD` are intentionally ignored for Phase 1 so Vercel cannot use a different password from the browser.

## Best practice

For beta testing, create test users directly in Supabase Auth instead of relying on the public/new-member sign-up path.

The current Flowtel beta bridge signs a user up and then immediately tries to sign that same user in. If Supabase email confirmation is enabled, the sign-up can create the user but no active session is returned yet, so the immediate sign-in can fail until the email is confirmed.

## Recommended test account pattern

Create a small matrix of clean accounts:

- 3 guest accounts
- 2 practitioner accounts
- 1 admin/owner account

Use a consistent password for temporary beta accounts, such as the current beta password used by the app:

`FlowtelBeta!2026`

Use real inboxes or email aliases you can access. Example pattern:

- `you+flowtel-guest1@example.com`
- `you+flowtel-guest2@example.com`
- `you+flowtel-practitioner1@example.com`
- `you+flowtel-admin@example.com`

## Supabase Auth setup

In Supabase, create each test user as a confirmed email user.

Recommended values:

- Email: test email
- Password: beta password
- Email confirmed: yes / auto-confirmed

If creating users through Supabase Admin APIs, use `email_confirm: true`.

## Profile setup

After the auth user exists, create or update the matching row in `public.profiles` with the same `id` as the Supabase Auth user id.

Minimum profile fields to confirm:

- `id` = auth user id
- `email`
- `first_name`
- `last_name`
- `role`
- `membership_type`
- `serving_wing` for practitioners

Suggested roles:

- guest/member: `guest` or existing guest-equivalent role used in the project
- practitioner: `practitioner`
- admin: `admin` or `owner`

## Why not rely on new random emails in the app?

The app can still create users when Auth settings allow it, but for controlled beta testing, manual creation is more reliable because:

- you control whether the email is confirmed
- you can assign the correct role immediately
- you can create predictable guest/practitioner/admin test flows
- you avoid hidden email-confirmation failures
- you avoid accidentally mixing Squarespace bridge behavior with Supabase Auth behavior

## Clean beta reset

For repeat testing:

1. Keep the same auth users.
2. Clear only the test data rows you want to reset, such as stays, reflections, mentor relationships, or turndown requests.
3. Avoid deleting auth users unless you need to test first-time signup from scratch.

## Suggested first beta matrix

- Guest A: daily check-in, no mentor
- Guest B: pending mentor request
- Guest C: connected to Practitioner A
- Practitioner A: multiple connected clients
- Practitioner B: no connected clients yet
- Admin/Owner: global dashboard access

## Browser cache note for first-arrival tests

When testing several accounts in the same browser, Flowtel stores a small same-day Suite handoff in session storage so a practitioner can return from the Concierge Desk to her own Suite.

As of v0.9.11, that cached Suite can only reopen when it belongs to the same signed-in profile. If a new test user lands directly in the Suite, check whether that user already has a `flowtel_stays` row for today's Flowtel Date. If they do, Flowtel is correctly treating them as already checked in for the day.

For a clean first-arrival test, use either:

- a fresh confirmed auth user with no `flowtel_stays` row for today, or
- delete that test user's stay rows for the current Flowtel Date before testing again.
