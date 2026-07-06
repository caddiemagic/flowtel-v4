# Flowtel v0.10.0 — Flow FM Construction

## Release name
Flow FM Construction: Business Assignment Tracker + Cycle, Flow Map, and Initiation Polish

## Version
v0.10.0

## Purpose
This release begins the Flow FM construction phase while preserving the Core Flowtel Beta foundation. It turns the 13 Flow FM business assignments into trackable rooms inside the Initiation Hall and folds in the July 5 cycle, Powder Room, Flow Map, and Initiation Hall polish notes.

Flowtel remains the hotel. Flow FM is the initiation path inside the hotel. This release keeps the experience shame-free, compassionate, data-aware, and free of streak pressure, rankings, or gamification.

## What changed

### Flow FM Business Assignment Tracker
- Added Supabase migration `database/migration-022-flow-fm-business-assignment-tracker.sql`.
- Added new table `flow_fm_assignment_submissions`.
- Added the shared assignment helper module `shared/assignments.js`.
- Added assignment statuses: `not_started`, `drafting`, `submitted`, `reviewed`, `complete`, and `needs_revision`.
- Added member draft saving, submission, optional text/link/media URL fields, and status copy.
- Added mentor/admin review queue, mentor notes, admin notes, and review actions.
- Exported assignment helpers through `shared/flowtel.js`.

### Note 018 — Cycle day confirmation when recorded day moves backward
- Added confirmation logic before creating a new stay when a returning guest records a cycle day lower than Flowtel’s calculated actual day.
- Flowtel now asks whether she started a new cycle instead of automatically treating the lower number as a reset.
- If she confirms a new cycle, Flowtel uses the recorded day to infer the new Day 1, calculates previous cycle length when possible, and stores the new cycle start date on the stay.
- If she says she is still in the same cycle, Flowtel keeps the existing cycle start date, stores the recorded day separately, logs the difference, and keeps the Suite/Dashboard on the actual calculated cycle day.

### Note 019 — Softer Powder Room Sharing UX
- Hid the full Powder Room Sharing pill by default.
- Added the softer inline sentence: “Your reflections will be shared anonymously in the Powder Rooms. Click here to opt out.”
- Added an expandable Powder Room Sharing panel with the checkbox copy: “I want my daily reflections to be witnessed in the Powder Room.”
- Reflection and checkout saves now honor the master Powder Room sharing setting instead of always saving as shareable.

### Note 020 — Initiation Hall access from Concierge Desk
- Removed the Suite-level Flow FM Initiation button.
- Added an `INITIATION HALL` button inside the Concierge Desk dashboard panel.
- Opening the Initiation Hall from the Desk now marks coursework as an on-duty/clocked-in practitioner context in session storage.

### Note 021 — Flow Map and Cycle Data control cleanup
- Grouped Flow Map view switching into a quieter disclosure.
- Grouped print, printable, and return actions into a `More` utility disclosure.
- Kept the primary Flow Map action clear: `View Data Dashboard`.
- Grouped Cycle Data return actions into a `More` disclosure.
- Moved Cycle Data view switching into a quieter disclosure.
- Made Cycle Data filters collapsible so the page feels lighter and less like a crowded control panel.

### Note 022 — Initiation Hall header scale
- Reduced the `INITIATION HALL` hero header size to match the scale of Flow Map and Cycle Data dashboard pages more closely.
- Preserved the elegant serif, uppercased luxury styling.

### Note 023 — Curriculum copy cleanup
- Removed the placeholder-style headline `THE CURRICULUM LIVES HERE.`
- Kept the `13 MOONS PATH` label, supporting copy, and month group cards.

## Files changed
- `client/app.js`
- `client/index.html`
- `client/styles.css`
- `cycle-data/index.html`
- `cycle-data/styles.css`
- `database/migration-022-flow-fm-business-assignment-tracker.sql`
- `docs/CHANGELOG.md`
- `docs/RELEASE-0.10.0.md`
- `flow-fm/app.js`
- `flow-fm/index.html`
- `flow-fm/styles.css`
- `flow-map/index.html`
- `flow-map/styles.css`
- `manager/app.js`
- `manager/index.html`
- `manager/styles.css`
- `shared/assignments.js`
- `shared/flowtel.js`
- `shared/stays.js`

## Supabase migration required
Run:

```sql
database/migration-022-flow-fm-business-assignment-tracker.sql
```

No additional Supabase migration was added for Notes 018–023. The cycle confirmation update uses existing stay fields: recorded day, actual day, cycle start date, previous cycle length, match status, and reset type.

## Supabase functions added by migration 022
- `flow_fm_can_view_assignment_member(uuid)`
- `flow_fm_current_user_can_tend_assignments()`
- `flow_fm_get_assignment_statuses(uuid)`
- `flow_fm_save_assignment_draft(integer, text, text, text)`
- `flow_fm_submit_assignment(integer, text, text, text)`
- `flow_fm_review_assignment(uuid, text, text, text)`
- `flow_fm_get_assignment_review_queue()`

## RLS / consent rules
- Members can view their own assignment records.
- Draft/save and submit RPCs are limited to Flow FM/Council/practitioner/admin/owner profiles or profiles with a Flow FM start date.
- Admin/owner can view all assignment records.
- Connected mentors can view and review a member’s assignment records only while mentor relationship consent is active.
- Direct insert/update/delete access is revoked for authenticated users; assignment mutations happen through RPCs so review fields are protected.

## Testing checklist

### Supabase
1. Apply `database/migration-022-flow-fm-business-assignment-tracker.sql`.
2. Confirm `flow_fm_assignment_submissions` exists.
3. Confirm the seven Flow FM assignment RPCs exist.
4. Confirm normal authenticated users cannot directly insert/update/delete assignment rows.

### Flow FM assignment tracker
1. Sign in as a Flow FM member/practitioner.
2. Open `/flow-fm/`.
3. Save a draft for Assignment 1.
4. Refresh and confirm the draft persists.
5. Submit Assignment 1 with text or a link.
6. Confirm status changes to `Submitted`.
7. Sign in as a connected mentor/admin and confirm the submitted assignment appears in the review queue.
8. Mark an assignment `Reviewed`, `Complete`, and `Needs revision` in separate tests.

### Cycle confirmation
1. Use a test guest with an existing cycle start date and actual day above the recorded day.
2. Check in with a lower recorded day.
3. Confirm Flowtel asks: `Did you start a new cycle?`
4. Choose `No, I am still in the same cycle` and confirm the Suite remains on the actual calculated day.
5. Repeat and choose `Yes, today is part of a new cycle`; confirm the new stay uses the recorded day as actual day and stores cycle reset metadata.

### Powder Room sharing
1. Open the Suite Reflection card.
2. Confirm only the soft inline Powder Room sentence appears by default.
3. Click the opt-out text and confirm the full sharing panel expands.
4. Uncheck the witness checkbox, save a reflection, and confirm the reflection is not saved as Powder Room shareable.
5. Re-check it and confirm later reflections can be shared anonymously again.

### Concierge Desk / Initiation Hall
1. Sign in as a practitioner/admin/owner.
2. Open `/manager/`.
3. Confirm the new `INITIATION HALL` button appears in the Concierge Desk panel.
4. Click it and confirm `/flow-fm/` opens.
5. Confirm the Suite no longer shows the old Flow FM Initiation button.

### Flow Map / Cycle Data polish
1. Open `/flow-map/` and confirm the page feels less crowded.
2. Confirm the cycle selector and primary `View Data Dashboard` action are visible.
3. Confirm view switching opens from `Switch view`.
4. Confirm print, printable, Suite return, and Concierge return live under `More`.
5. Open `/cycle-data/` and confirm view switching and filters are collapsed by default.
6. Confirm filters still work after opening the filter disclosure.

### Regression watch
1. Confirm `/flowtel`, `/concierge`, `/cycle-data`, `/flow-map`, `/flow-map/printable`, and `/flow-fm` still route correctly.
2. Confirm one stay per Flowtel Day still holds.
3. Confirm Powder Room anonymity is preserved.
4. Confirm mentor/client data access still honors relationship consent.
5. Confirm Concierge/Turndown completion still works.
6. Confirm the Medicine Wheel still uses actual inner season as the source of truth.

## Known limitations
- Live Supabase/browser QA still needs to be run after deploying and applying migration 022.
- Priestess Profile Studio is intentionally deferred to v0.10.1/v0.10.2 depending on the next release numbering decision.
- Supabase Storage is not added yet; assignment file/media evidence uses manually pasted URLs during beta.
- Course module video/audio integration remains a future Flow FM construction release.
- Cycle confirmation stores reset outcomes on the stay record but does not yet expose a dedicated cycle-history archive UI.
