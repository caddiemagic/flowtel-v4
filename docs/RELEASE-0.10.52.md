# Flowtel v0.10.52 — Priestess Identity + Display Name Sync

Release date: 2026-07-18

## Summary

This release gives every Flow FM member one clear identity doorway inside Profile Studio: private legal first and last names, plus a member-chosen Priestess Display Name that becomes the canonical name shown throughout the Flowtel. It also straightens the portrait rings in the Queendom embedded Team Map.

## Profile Studio identity fields

The Profile Studio now includes three separate fields:

- **Legal First Name — private**
- **Legal Last Name — private**
- **Priestess Display Name**

The legal names are stored separately in `public.profiles.first_name` and `public.profiles.last_name`. The public-facing name is stored in the new `public.profiles.display_name` field.

The Priestess Display Name is the name used for hospitality and community identity throughout Flowtel, including:

- Suite greetings
- Flow FM Team Map and Queendom embed
- Priestess profile previews
- Concierge Desk identity and guest cards
- mentor and client cards
- Flow Map and Cycle Data member labels
- Flow FM review queues
- future Turndown completion attribution

Profile Studio also keeps the existing `flow_fm_priestess_profiles.priestess_name` field synchronized for compatibility with older profile surfaces.

## Supabase Auth synchronization

Saving or submitting a Priestess Profile updates the signed-in member's Supabase Auth metadata with:

- `first_name`
- `last_name`
- `display_name`
- `full_name`
- `name`

The active browser session is refreshed after saving, so the new display name can appear without requiring the member to sign out.

Existing beta-entry and Squarespace bridge pathways preserve an existing member's chosen identity rather than overwriting it on later visits.

## Privacy boundary

Legal first and last names are account identity fields and are not used as the visible Flowtel name when a display name exists. Another member opening a consent-aware Priestess Profile does not receive the saved private legal-name string from the Profile Studio RPC.

The fallback order is:

1. Priestess Display Name
2. legal first and last name
3. account email
4. a generic Flowtel fallback

## Existing member backfill

Migration 040 gives existing profiles a display name using this order:

1. existing Priestess Profile name
2. existing first and last name
3. email prefix

This means a member already using a name such as **Megan Michele** on her Priestess Profile keeps that name when the new identity system is installed.

## Embedded Team Map portrait rings

The Queendom embedded Team Map now wraps each portrait and halo inside one fixed-size concentric frame. The photo circle, inner gold border, blush orbit, and outer halo share the same center instead of positioning independently from the member's name length.

This repairs the slightly offset or uneven rings shown around embedded Team Map portraits.

## Supabase migration

Run:

`database/migration-040-priestess-identity-display-name-sync.sql`

Migration 040:

- adds `profiles.display_name`
- backfills existing display names
- adds the authenticated member-owned identity update function
- synchronizes Profile Studio and Auth metadata
- updates current name-bearing Team Map, Concierge, Flow Map, Cycle Data, assignment, and profile RPCs
- updates future Turndown attribution to use the canonical display name

It does **not** modify passwords, authentication sessions, stays, cycle data, reflections, mentor relationships, profile photos, or external profile URLs.

Do not rerun migration 037.

## Files changed

- `api/beta-request.js`
- `api/squarespace-bridge.js`
- `client/app.js`
- `client/index.html`
- `cycle-data/app.js`
- `cycle-data/index.html`
- `database/migration-040-priestess-identity-display-name-sync.sql`
- `docs/CHANGELOG.md`
- `docs/RELEASE-0.10.52.md`
- `flow-fm/profile-studio/index.html`
- `flow-fm/profile-studio/page.js`
- `flow-fm/styles.css`
- `flow-fm/team-map/embed/index.html`
- `flow-fm/team-map/embed/page.js`
- `flow-fm/team-map/embed/styles.css`
- `flow-fm/team-map/index.html`
- `flow-fm/team-map/page.js`
- `flow-map/app.js`
- `flow-map/index.html`
- `manager/app.js`
- `manager/index.html`
- `shared/flowtel.js`
- `shared/priestess-profiles.js`
- `shared/profiles.js`
- `shared/relationships.js`
- `shared/stays.js`

## First test

1. Run migration 040.
2. Deploy v0.10.52.
3. Open Profile Studio as the owner account.
4. Enter legal first name **Megan**, legal last name **Johnson**, and Priestess Display Name **Megan Michele**.
5. Click **Save Profile Draft**.
6. Reload Profile Studio and confirm all three fields persist.
7. Return to the Suite and confirm the welcome uses the display name.
8. Open the Concierge Desk and confirm the owner identity uses **Megan Michele**.
9. Confirm guest and mentor/client cards use each member's display name when one exists.
10. Complete a new Turndown request and confirm the new attribution uses the canonical display name.
11. Open the authenticated Team Map and confirm the updated display name appears.
12. Open the Queendom embedded Team Map and confirm the portrait rings are evenly centered around every photo.
13. Confirm passwords, remembered sessions, stays, profile photos, and external profile links remain unchanged.
