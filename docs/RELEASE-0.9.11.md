# Flowtel v0.9.11 — First Check-In Guard

## Purpose

This release fixes a beta-testing edge case where a newly signed-in test account could be taken straight into a cached Suite stay from a previous browser session instead of being asked to check in.

This preserves the product rule: a guest should only skip Check-In when Flowtel finds a valid stay for that same signed-in guest on the current Flowtel Day.

## What changed

- Added a Suite cache ownership guard.
- Cached Suite stays now have to belong to the currently signed-in profile before they can be restored.
- Cached stays from another browser user/test account are cleared automatically.
- The Concierge return-to-Suite path now validates both Flowtel Date and current profile ownership.
- The beta-account switcher clears cached Suite state when changing test users.
- Member bridge signup/login clears stale cached Suite state when changing accounts.
- Normal email sign-in clears stale cached Suite state when the cached stay belongs to another guest.
- Updated the Suite app cache-busting query string to `v=0.9.11`.

## No new migrations

No Supabase migration is required for v0.9.11.

## Changed files

Replace/add:

- `client/app.js`
- `client/index.html`
- `docs/CHANGELOG.md`
- `docs/RELEASE.md`
- `docs/RELEASE-0.9.11.md`
- `docs/TEST_USERS.md`

## Smoke test

1. Log in as Guest A and check into the Suite.
2. In the same browser, log out or return to the entrance.
3. Log in as a completely different Guest B who has no stay for today.
4. Confirm Guest B lands on Check-In, not Guest A's Suite.
5. Check in as Guest B.
6. Confirm returning as Guest B later today opens Guest B's own Suite.
7. Test the Concierge return-to-Suite path for a practitioner and confirm it still opens the correct same-user Suite.

## If a test user still opens directly to the Suite

Check `flowtel_stays` for that test user's auth id and today's `checkin_date`. If a row already exists for that user today, the app is correctly opening that user's current stay. Delete that test stay or use a fresh test user to test first arrival again.
