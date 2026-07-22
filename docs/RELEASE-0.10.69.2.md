# Flowtel v0.10.69.2 — Member Directory Deployment Boundary Hotfix

Release date: 2026-07-22

## Summary

This focused hotfix repairs the remaining Flowtel Member Directory loading failure after v0.10.69.1. The owner Concierge Desk now opens, but the Member Directory room could still fail when the separately deployed `shared/member-directory.js` file was unavailable at the live URL.

The Member Directory RPC adapter is now contained directly inside the existing Concierge application module. This removes the fragile second-file deployment boundary while preserving the same owner-only database authorization, verification, revoke, restore, and audit behavior.

## Root cause

The v0.10.69.1 resilience boundary correctly prevented a missing Member Directory module from blocking the whole Concierge Desk. The live deployment still could not fetch `/shared/member-directory.js`, so the isolated room remained unavailable.

This hotfix does not hide or retry that deployment mismatch. It removes the unnecessary runtime dependency entirely.

## What changed

- Moves the four Member Directory RPC wrappers into `manager/app.js`.
- Uses the already-required shared Supabase client rather than dynamically importing a newly introduced file.
- Removes the runtime fetch of `/shared/member-directory.js`.
- Keeps Member Directory database/RPC failures contained to the Member Directory room.
- Adds a fresh `v0.10.69.2` Concierge cache key.
- Extends validation so the Concierge cannot regain a separate Member Directory module dependency.

## Migration

No migration is required.

Migration 054 must already be installed from v0.10.69. Do not rerun migration 054, migration 053, either historical migration 052, or retired migration 037.

## Preservation guarantees

This hotfix does not change database records, owner authorization, verification states, revoke/restore rules, audit history, profiles, passwords, remembered sessions, stays, Flowtel Time, Caddie Magic, or privacy boundaries.

## First test checklist

1. Deploy the hotfix with no migration.
2. Hard-refresh `/manager/` once.
3. Open **Flowtel Members**.
4. Confirm the directory lists accounts instead of reporting a module-fetch failure.
5. Confirm Last Sign-In and Last Flowtel Check-In remain separate.
6. Save a test verification update and refresh.
7. Confirm revoke/restore still protects the owner and preserves historical records.
8. Confirm non-owner accounts remain blocked from the Concierge Desk.
