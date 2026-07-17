# Flowtel v0.10.42 — Living Map Presence Repair + Priestess Photo Upload

Release date: 2026-07-17

## Summary

This release completes the first Living Map repair pass after launch. It adds a second Suite doorway into the Team Map, restores the Powder Room sharing disclosure behavior, makes today’s Living Map eligibility easier to understand, broadens resilient season and membership matching, and adds native Priestess profile-photo upload through Supabase Storage.

## What changed

### Suite map doorways

- Added **View Team Map** beside **View Flow Map** beneath the Current Room card.
- Both actions use matching widths and sit side by side on desktop and mobile.
- Team Map routes to `/flow-fm/team-map/`.

### Powder Room sharing disclosure repair

- Restored the sharing preference to a collapsed state whenever the Suite opens.
- Fixed the CSS specificity conflict that forced the expanded panel to remain visible.
- **Click here to opt out** now sits naturally inline with the surrounding sentence.
- Removed the underline and louder button styling from the inline disclosure.
- The full interaction now works as intended:
  1. click the inline text
  2. opt in or out
  3. click **Done**
  4. the sharing panel collapses again
- Preserved the existing master Powder Room sharing setting and database behavior.

### Living Map presence repair

- Expanded Flow FM eligibility matching to include practitioner-level accounts and normalized Flow FM membership variants.
- Added resilient Inner Season normalization for legacy values such as `Spring`, `Inner Spring`, `Fall`, and `Inner Autumn`.
- A today stay may be recognized from the saved Flowtel date or its `checked_in_at` timestamp in `America/Los_Angeles`.
- Added a **Your Presence** diagnostic card showing:
  - whether today’s check-in was found
  - actual Inner Season
  - Feels Like season when different
  - cycle day
  - whether the rose fallback is being used
  - the exact reason a profile is not appearing
- Preserved default-visible behavior with the existing Living Map opt-out.

### Native Priestess profile-photo upload

- Added photo upload inside Profile Studio.
- Restored Profile Studio access for recognized Flow FM and Council members even when their role is not yet practitioner-level.
- Supports JPG, PNG, and WebP images up to 5 MB.
- Shows a local preview before upload.
- Adds **Upload Photo** and **Use the Rose** actions.
- Stores the selected photo in the new public Supabase Storage bucket:
  - `flow-fm-profile-photos`
- Restricts upload, update, and delete access to the authenticated member’s own folder.
- Synchronizes the uploaded URL into:
  - `flow_fm_priestess_profiles.profile_photo_url`
  - `profiles.mentor_photo_url`
- This allows one photo to appear in:
  - The Living Map
  - multidimensional ghost presence
  - Priestess Profile preview
  - approved Queendom profile
  - Choose Your Mentor
- Keeps `/assets/flowtel-pinkrose.png` as the default fallback.
- Photo-only updates do not automatically revoke an already approved profile status.

## Files changed

- `client/app.js`
- `client/index.html`
- `client/styles.css`
- `database/migration-032-living-map-presence-and-profile-photos.sql`
- `docs/CHANGELOG.md`
- `docs/RELEASE-0.10.42.md`
- `flow-fm/profile-studio/index.html`
- `flow-fm/profile-studio/page.js`
- `flow-fm/styles.css`
- `flow-fm/team-map/index.html`
- `flow-fm/team-map/page.js`
- `flow-fm/team-map/styles.css`
- `flow-fm/team-map/profile/index.html`
- `flow-fm/team-map/profile/page.js`
- `shared/flowtel.js`
- `shared/priestess-profiles.js`
- `shared/team-map.js`

## Supabase

Run:

`database/migration-032-living-map-presence-and-profile-photos.sql`

Migration 031 must already be installed because it creates the original Living Map functions and preference field. Migration 032 is defensive and also re-adds the preference column if it is missing.

Migration 032:

- creates the `flow-fm-profile-photos` Storage bucket
- adds authenticated owner-only Storage policies
- adds resilient Team Map season normalization
- repairs current-user and map presence RPCs
- expands the Team Map viewer diagnostic state
- adds the photo URL update RPC
- refreshes approved profile eligibility for practitioner-level Flow FM accounts

No existing stays, reflections, profiles, or profile images are deleted.

## JavaScript syntax checks

- `node --check client/app.js`
- `node --check shared/flowtel.js`
- `node --check shared/priestess-profiles.js`
- `node --check shared/team-map.js`
- `node --check flow-fm/profile-studio/page.js`
- `node --check flow-fm/team-map/page.js`
- `node --check flow-fm/team-map/profile/page.js`

## First test checklist

1. Run migration 032 in Supabase.
2. Open the Suite and confirm **View Flow Map** and **View Team Map** sit side by side.
3. Confirm both map buttons work on desktop and mobile.
4. Reload the Suite and confirm the Powder Room sharing panel is collapsed.
5. Confirm **Click here to opt out** is inline, unbolded, and not underlined.
6. Open the sharing panel, change the checkbox, and confirm the preference saves.
7. Click **Done** and confirm the panel collapses.
8. Check into the Flowtel today and open `/flow-fm/team-map/`.
9. Review **Your Presence** and confirm it reports today’s stay and season.
10. Confirm the signed-in Priestess appears in her actual season.
11. Confirm a different Feels Like season creates the ghost presence.
12. Open Profile Studio with a Flow FM, Council, practitioner, admin, or owner account and choose a JPG, PNG, or WebP under 5 MB.
13. Confirm the local photo preview appears before upload.
14. Upload the photo and confirm it replaces the rose in Profile Studio.
15. Reopen the Living Map and confirm the uploaded photo appears.
16. Confirm the uploaded photo also appears in Choose Your Mentor where applicable.
17. Select **Use the Rose** and confirm the default rose returns.
18. Confirm another authenticated account cannot update or delete this member’s stored photo.
