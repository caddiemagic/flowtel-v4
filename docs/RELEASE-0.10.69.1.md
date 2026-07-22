# Flowtel v0.10.69.1 — Concierge Module Load Resilience Hotfix

Release date: 2026-07-22

## Summary

This focused hotfix repairs a Concierge Desk startup failure introduced when the new Flowtel Member Directory became a top-level JavaScript dependency in v0.10.69. If that newly deployed module was unavailable, stale, or briefly failed to fetch, the browser rejected the entire Concierge application before owner access could be checked.

The Member Directory now loads behind a resilient lazy boundary. A Member Directory loading or migration problem is contained to that one room while Turndown Service, guests in house, Caddie operations, Guest House, Honors, mailbox, Lounge video, and the rest of the owner Concierge Desk continue opening normally.

## What changed

- Removes `shared/member-directory.js` from the Concierge app's top-level static import graph.
- Loads the Member Directory module only when Concierge data is requested.
- Clears and retries the lazy module promise after a failed fetch.
- Shows a local Member Directory availability message instead of failing the entire Desk.
- Adds a focused `v0.10.69.1` Concierge JavaScript cache key.
- Extends validation so the Member Directory cannot become a required top-level Concierge dependency again.

## Migration

No migration is required.

Migration 054 must already have been run for the v0.10.69 Member Directory and Guest Profile features. Do not rerun migration 054 for this hotfix. Do not rerun migration 053, either historical migration 052, or retired migration 037.

## Preservation guarantees

This hotfix does not change database records, owner permissions, member verification, revoke/restore behavior, Guest Profiles, stays, passwords, remembered sessions, Flowtel Time, Caddie Magic, or any privacy boundary.

## First test checklist

1. Deploy the hotfix with no migration.
2. Hard-refresh `/manager/` once.
3. Confirm the owner Concierge Desk opens instead of remaining on “Checking your role.”
4. Open Turndown Service and Guests in House.
5. Open Flowtel Members and confirm the directory loads after migration 054.
6. Temporarily block or rename the Member Directory module in a test deployment and confirm the rest of the Desk still opens with a local directory warning.
7. Confirm non-owner accounts remain routed away from the owner Desk.
