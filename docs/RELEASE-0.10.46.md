# Flowtel v0.10.46 — Profile Link Save Repair

Release date: 2026-07-17

## Summary

This hotfix repairs the External Website URL path in Priestess Profile Studio. A member can now paste an existing Priestess profile link with or without `https://`, save or submit her profile, and have the link reliably appear as **View My Profile** or **Visit Her Profile** on the Flow FM Team Map.

## Root cause

The original database URL cleaner accepted only values that already began with `http://` or `https://`. Profile Studio action buttons bypassed native browser URL validation, so a visually valid domain such as `theidyllcollective.com/maggierose` could reach Supabase and be silently converted to `NULL`. In addition, the profile page and shared modules were still using older cache-version identifiers, allowing stale browser assets to persist.

## What changed

### Durable external-link save

- Added `flow_fm_normalize_external_profile_url(text)`.
- Bare domains are normalized to `https://...`.
- Unsupported protocols are rejected clearly.
- Added `flow_fm_set_priestess_profile_website(text)` so the external link saves independently from the larger profile draft.
- Both Save Profile Draft and Send Profile to be Witnessed now call the dedicated link save.
- The Profile Studio verifies that the saved value can be read back before reporting success.

### Profile Studio reliability

- External Website URL now uses a flexible URL text field with a clear hint.
- The form normalizes the URL before saving.
- Upload Photo now saves the current form details first, preventing unsaved profile-link changes from being lost.
- Updated cache versions for Profile Studio and its shared profile module.

### Team Map card repair

- The signed-in member’s latest Priestess Profile is read alongside Team Map data and merged into her own presence card.
- A successfully saved URL produces **View My Profile** immediately after refresh.
- When no link exists, the member sees **Add My Profile Link** instead of a dead-end message.
- Other members continue to see **Visit Her Profile** when their URL exists.

## Files changed

- `database/migration-036-priestess-profile-link-save-repair.sql`
- `docs/CHANGELOG.md`
- `docs/RELEASE-0.10.46.md`
- `flow-fm/profile-studio/index.html`
- `flow-fm/profile-studio/page.js`
- `flow-fm/team-map/index.html`
- `flow-fm/team-map/page.js`
- `shared/flowtel.js`
- `shared/priestess-profiles.js`
- `shared/team-map.js`

## Supabase migration

Run:

`database/migration-036-priestess-profile-link-save-repair.sql`

## Syntax checks

- `node --check shared/priestess-profiles.js`
- `node --check shared/flowtel.js`
- `node --check flow-fm/profile-studio/page.js`
- `node --check flow-fm/team-map/page.js`
- `node --check shared/team-map.js`

## First test checklist

1. Run migration 036.
2. Open Profile Studio in a fresh browser tab.
3. Enter a bare domain such as `theidyllcollective.com/maggierose`.
4. Click Save Profile Draft.
5. Confirm the field is normalized to an `https://` URL and the success message confirms the profile link.
6. Reload Profile Studio and confirm the URL remains in the field.
7. Open the Team Map and select your portrait.
8. Confirm **View My Profile** appears and opens the saved external URL.
9. Change the URL and use Send Profile to be Witnessed.
10. Reload the Team Map and confirm the new URL is used.
11. Change the URL, select a new photo, and click Upload Photo.
12. Confirm both the photo and the current external URL remain saved.
