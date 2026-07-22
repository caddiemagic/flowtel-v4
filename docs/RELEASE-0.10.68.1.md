# Flowtel v0.10.68.1 — Caddie Clubhouse Login Bootstrap Hotfix

Release date: 2026-07-22

Coordinated Caddie release: **Caddie Magic v0.5.1 hotfix 1**

## Summary

This focused hotfix repairs the Caddie Magic Player Profile module bootstrap that was accidentally omitted from the end of `caddie-magic/app.js` in v0.10.68.

The missing top-level initialization meant the page rendered but never:

- bound the **Enter the Clubhouse** or **Create Player Profile** buttons;
- restored an existing remembered Supabase session;
- read invitation and player-only query parameters; or
- opened the Player Profile automatically when returning from Score Map.

Static links such as **Score Map** still worked because they did not depend on JavaScript, which made the failure look like a credential or access problem even though authentication was never being attempted.

## Root repair

The hotfix restores the complete startup sequence:

1. read invitation and email query parameters;
2. populate invitation fields when present;
3. show the Player-Only access message when applicable;
4. call `bindEvents()`;
5. call `bootPortal()` to restore a remembered session or show the correct login/profile state.

The Player Profile module receives a new cache-bust so browsers do not continue serving the broken v0.10.68 JavaScript.

The Caddie validator now fails if the Player Profile module does not end with the required invitation-state, event-binding, and session-bootstrap sequence. This guards the root behavior instead of checking only that the functions exist.

## Migration

**No migration is required.**

Do not rerun migration 053. Do not rerun or rename either historical migration 052 file. Migration 037 remains retired and must never be rerun.

## Preservation guarantees

This hotfix changes no database schema, roles, RLS, product access, passwords, sessions, Player history, Caddie Network data, Scorecard Review credits, scheduling records, Flowtel hospitality behavior, or privacy boundaries.

## First test checklist

1. Deploy the v0.10.68.1 files without rerunning migration 053.
2. Open `/caddie-magic/` while signed out and click **Enter the Clubhouse** with valid credentials.
3. Confirm the button displays opening feedback and enters the Player Profile.
4. Sign out, then sign in again and confirm the session is remembered after refresh.
5. Open **Score Map**, select **Back to Player Profile**, and confirm the Player Profile opens without showing a dead login form.
6. Open an invitation URL and confirm the invitation code/email fields populate.
7. Confirm Player-Only accounts remain blocked from Flowtel.
