# Flowtel v0.10.9 — Profile Studio Simplification + Initiation Hall Polish

## Release theme
This release simplifies the Priestess Profile Studio into a low-overwhelm, selection-based doorway and folds in Initiation Hall polish notes 029–036.

## What changed
- Simplified the Priestess Profile Studio so the first profile is chosen from prepared options instead of written from scratch.
- Replaced the long custom profile form with:
  - Profile Name
  - Legal Name, private/admin use later
  - Title dropdown
  - Bio template dropdown
  - Offering selections
  - Optional location
  - Display location toggle
  - Preferred timezone dropdown
  - External website URL
- Changed the Profile Studio hero from `Assignment 1` to `Your Queendom`.
- Added prepared title, bio, offering, and timezone option data in `shared/priestess-profile-options.js`.
- Kept profile photo upload out of Flowtel for now and added copy that points toward Squarespace/content storage.
- Kept Flowtel Time untouched and used the existing profile timezone field as the local-time foundation.
- Updated Assignment 1 language to `Your Queendom` so the first assignment feels like a doorway, not generic coursework.
- Hid the Access State panel from normal user view. It is now only available for admin/owner users with `?debug=1`.
- Simplified the Flow FM top navigation to `Initiation Hall`, `Planning Room`, `Profile Studio`, and `Return to Suite`.
- Changed Moon Portal coursework action navigation to include `Return to Concierge` for practitioner coursework flow.
- Simplified the current moon heading so the moon name can stand alone.
- Added a `Track Your Cycle` button to Womb Work Module 1 and to Module 1 inside the Moon Portal.
- Added New Moon and Full Moon date lines to moon portal cards and 13 Moons Path cards.
- Began shifting The Doors Ahead toward temple-door styling with gold-trimmed card treatment and calmer hierarchy.
- Tightened Review Desk front-end access to admin/owner roles.

## Files changed
- `flow-fm/app.js`
- `flow-fm/index.html`
- `flow-fm/styles.css`
- `flow-fm/ui.js`
- `flow-fm/moons/index.html`
- `flow-fm/moons/page.js`
- `flow-fm/portal/index.html`
- `flow-fm/portal/page.js`
- `flow-fm/profile-studio/index.html`
- `flow-fm/profile-studio/page.js`
- `flow-fm/review/index.html`
- `flow-fm/review/page.js`
- `flow-fm/womb-work/index.html`
- `flow-fm/womb-work/page.js`
- `shared/flowtel.js`
- `shared/initiation.js`
- `shared/priestess-profile-options.js`
- `docs/CHANGELOG.md`
- `docs/RELEASE-0.10.9.md`

## Supabase migration
No Supabase migration required.

This release intentionally reuses existing Priestess Profile columns:
- `priestess_name`
- `legal_name`
- `modalities` for selected title
- `bio` for selected bio template
- `offerings` for selected offerings
- `location` for display location
- `timezone` for preferred timezone
- `website_url` for external website link

## Testing checklist
1. Open `/flow-fm/profile-studio/`.
2. Confirm the hero reads `Your Queendom`.
3. Confirm the form only shows the simplified fields.
4. Select a title and confirm bio choices update.
5. Select offerings and confirm the preview updates.
6. Add optional location, timezone, and website URL.
7. Click `Refresh Preview`.
8. Save a Profile Draft.
9. Send the profile to be witnessed.
10. Open `/flow-fm/` and confirm the current moon heading is calmer.
11. Open `/flow-fm/portal/?portal=1` and confirm Module 1 has `Track Your Cycle`.
12. Open `/flow-fm/moons/` and confirm moon cards show New Moon and Full Moon dates.
13. Confirm Access State does not show to normal users.
14. Confirm `/flow-fm/review/` is only useful to admin/owner roles.

## Known limitations
- Profile photo upload is still intentionally deferred to Squarespace/content storage.
- The title selection is stored in the existing `modalities` field to avoid a database migration in this simplification release.
- The display-location toggle does not create a separate database field yet; if location is not displayed, Flowtel does not save it as a public profile location.
- Moon dates are generated from the current Flowtel moon-date foundation and approximate full moons by lunar phase timing.
