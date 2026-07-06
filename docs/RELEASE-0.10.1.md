# Flowtel v0.10.1 — Priestess Profile Studio

## Release name
Priestess Profile Studio

## Version
v0.10.1

## Purpose
This release turns Flow FM Assignment 1 into a guided Priestess Profile Studio inside the Initiation Hall. Flow FM members can draft the profile their future clients will meet first, preview a display-only profile card, and send it to be witnessed by a connected mentor or Flowtel admin.

Flowtel remains the hotel. Flow FM remains the initiation path inside the hotel. This release does not open a public marketplace, payment path, or revenue-share engine yet.

## What changed

### Priestess Profile Studio
- Added a new Priestess Profile Studio section to `/flow-fm/`.
- Replaced the previous “coming next” card with a real Assignment 1 intake experience.
- Added fields for Priestess name, legal/profile name, profile email, photo URL, bio, modalities, who she serves, session types, scheduling link, social links, Queendom name, offerings, location, timezone, framework language, and practitioner/network interest signals.
- Added Save Profile Draft and Send Profile to be Witnessed actions.
- Added a Refresh Preview action so members can see the display-only profile card before saving.
- Added a display-only profile preview card that can show photo, Queendom name, bio, offerings, modalities, session types, framework language, and links.
- Added an `Open Priestess Profile Studio` link inside Assignment 1.

### Supabase profile model
- Added `database/migration-023-priestess-profile-studio.sql`.
- Added table `flow_fm_priestess_profiles`.
- Added profile statuses: `draft`, `submitted`, `approved`, and `needs_revision`.
- Added manual profile photo URL support as a placeholder until Squarespace or Supabase media storage is chosen.
- Added network/revenue-share interest fields as ops signals only; no payment or commission logic is coded in this release.

### Mentor/admin review
- Added a Profile Review Queue for practitioners/admins/owners inside `/flow-fm/`.
- Connected mentors and admins can approve submitted Priestess Profiles or request refinement.
- Mentors can leave the note the member sees.
- Admin/owner users can also leave internal admin notes.
- Mentor visibility follows the same consent-aware access pattern as the Flow FM assignment tracker.

### Shared helpers
- Added `shared/priestess-profiles.js`.
- Exported Priestess Profile helper functions through `shared/flowtel.js`.
- Added frontend helpers for profile status labels, status copy, draft/save/submit, queue listing, and review actions.

## Files changed
- `database/migration-023-priestess-profile-studio.sql`
- `docs/CHANGELOG.md`
- `docs/RELEASE-0.10.1.md`
- `flow-fm/app.js`
- `flow-fm/index.html`
- `flow-fm/styles.css`
- `shared/flowtel.js`
- `shared/priestess-profiles.js`

## Supabase migration required
Run:

```sql
database/migration-023-priestess-profile-studio.sql
```

Migration 023 depends on the v0.10.0 assignment migration because it reuses the consent-aware Flow FM helper functions added in migration 022.

## Supabase functions added by migration 023
- `flow_fm_clean_profile_url(text)`
- `flow_fm_get_priestess_profile(uuid)`
- `flow_fm_save_priestess_profile_draft(...)`
- `flow_fm_submit_priestess_profile(...)`
- `flow_fm_review_priestess_profile(uuid, text, text, text)`
- `flow_fm_get_priestess_profile_review_queue()`

## RLS / consent rules
- Members can view their own Priestess Profile.
- Flow FM members/practitioners/admins/owners can save and submit their own profile drafts.
- Admin/owner users can view all Priestess Profiles.
- Connected mentors can view and review a member’s profile only while mentor relationship consent is active.
- Direct insert/update/delete access is revoked for authenticated users; profile mutations happen through RPCs so review/admin fields are protected.

## Testing checklist

### Supabase
1. Apply `database/migration-023-priestess-profile-studio.sql` after migration 022 is already live.
2. Confirm `flow_fm_priestess_profiles` exists.
3. Confirm the Priestess Profile RPCs exist.
4. Confirm normal authenticated users cannot directly insert/update/delete profile rows.

### Flow FM member test
1. Sign in as a Flow FM member/practitioner.
2. Open `/flow-fm/`.
3. Scroll to `Priestess Profile Studio`.
4. Fill Priestess name and About Me.
5. Click `Refresh Preview` and confirm the display-only profile card updates.
6. Click `Save Profile Draft`.
7. Refresh the page and confirm the draft persists.
8. Click `Send Profile to be Witnessed` and confirm the profile status changes to `Submitted`.

### Mentor/admin review test
1. Sign in as a connected mentor/admin.
2. Open `/flow-fm/`.
3. Confirm the submitted Priestess Profile appears in the Profile Review Queue.
4. Open the member’s profile studio from the queue.
5. Approve the profile and confirm the member sees the approved status and note.
6. Repeat with another test profile and request refinement.

### Regression watch
1. Confirm the v0.10.0 assignment tracker still saves drafts and submissions.
2. Confirm the assignment review queue still works.
3. Confirm `/flow-fm/` still shows the 13 Moons Path, Moon by Moon, and assignment list.
4. Confirm `/flowtel`, `/concierge`, `/cycle-data`, `/flow-map`, and `/flow-map/printable` still route correctly.
5. Confirm mentor/client data access still honors relationship consent.

## Known limitations
- This is not a public marketplace or public Queendom page yet.
- Profile photo handling is a manual URL field only; Supabase Storage and Squarespace media sync are intentionally deferred.
- Admins can review and approve/request refinement, but full admin-side field editing remains deferred.
- Revenue-share/network opt-in fields are saved as signals only; no payment, contract, commission, or revenue-share logic is coded.
- Course module video/audio integration remains a future Flow FM construction release.
- Live Supabase/browser QA still needs to be run after deploying and applying migration 023.
