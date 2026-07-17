# Flowtel v0.10.44 — Beta Profile Access + Owner-Only Concierge

Release date: 2026-07-17

## Summary

This release temporarily opens saved Priestess Profiles to authenticated Queendom and Flow FM members without requiring the unfinished profile-approval workflow. It also closes the Concierge Desk to every account except Megan's designated owner account during Phase 1 and removes the Actual Season pill from Team Map profile previews.

## What changed

### Temporary internal profile-approval bypass

- Saved Priestess Profiles may now open from the Flow FM Team Map even when their status is draft, submitted, or refinement requested.
- The bypass remains inside the authenticated Flowtel community; profiles are not made publicly searchable.
- Team Map profile cards now expose the latest intentionally saved profile fields, including photo, Priestess name, title, bio, offerings, website, and scheduling link.
- The profile status remains stored and returned so the formal approval workflow can be restored later without losing review history.
- A member viewing her own card sees **View My Profile**.
- Other members see **Visit Her Queendom**.
- Removed the **Actual Season** pill from the opened Team Map profile card.
- Preserved the cycle-day pill and multidimensional **Feels Like** pill when relevant.

### Owner-only Concierge Desk

- Added `profiles.concierge_access_enabled`, defaulting to `false`.
- Enabled Concierge access only for `mm.johnson@icloud.com` when the profile role is `admin` or `owner`.
- Replaced the shared database Concierge permission helper so existing stay RLS policies and Turndown completion RPCs immediately use the owner-only permission.
- Added a trigger that prevents ordinary authenticated users from granting themselves Concierge access.
- Added a browser route guard that sends unauthorized direct visits to `/concierge-soon/`.
- Hid **Clock Into the Flowtel** from all other accounts during Phase 1.
- Updated the Concierge entry copy to describe owner-only Phase 1 access.

## Files changed

- `client/app.js`
- `client/index.html`
- `database/migration-034-beta-profile-access-owner-only-concierge.sql`
- `docs/CHANGELOG.md`
- `docs/RELEASE-0.10.44.md`
- `flow-fm/team-map/index.html`
- `flow-fm/team-map/page.js`
- `flow-fm/team-map/profile/index.html`
- `flow-fm/team-map/profile/page.js`
- `manager/app.js`
- `manager/index.html`
- `shared/flowtel.js`
- `shared/stays.js`

## Supabase

Run:

`database/migration-034-beta-profile-access-owner-only-concierge.sql`

Migration 034:

- adds the explicit Concierge access flag
- enables it only for Megan's owner account
- hardens Concierge RLS and Turndown actions through the existing shared helper
- opens saved Priestess Profiles to authenticated Team Map viewers during beta

No stays, reflections, relationships, profile photos, or Priestess Profile content are deleted.

## JavaScript syntax checks

- `node --check client/app.js`
- `node --check manager/app.js`
- `node --check shared/stays.js`
- `node --check shared/flowtel.js`
- `node --check flow-fm/team-map/page.js`
- `node --check flow-fm/team-map/profile/page.js`

## First test checklist

1. Run migration 034 in Supabase.
2. Log in as `mm.johnson@icloud.com` with role `owner` or `admin`.
3. Confirm **Clock Into the Flowtel** remains available and `/manager/` opens.
4. Log in as a non-owner member, practitioner, or test admin.
5. Confirm Clock In is hidden.
6. Visit `/manager/` directly and confirm the account is sent to `/concierge-soon/`.
7. Confirm the unauthorized account cannot read or update the Concierge stay queue through Supabase.
8. Open the Team Map and select a saved profile that is not approved.
9. Confirm the profile button appears despite the saved review status.
10. Confirm your own card says **View My Profile**.
11. Confirm another member's card says **Visit Her Queendom**.
12. Confirm the Actual Season pill is absent from the preview card.
13. Confirm Cycle Day and a differing Feels Like season remain visible.
14. Open the full profile and confirm the latest saved bio, offerings, website, and booking links appear.
