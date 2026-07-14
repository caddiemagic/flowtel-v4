# Flowtel v0.10.33 — Practitioner Clock-In + Owner Desk Access

## Purpose

Restore practitioner-level operational access during Phase 1 beta without opening the Concierge Desk to client/tester accounts.

## What changed

- Re-enabled **Clock Into the Flowtel** for practitioner-level roles only:
  - `practitioner`
  - `admin`
  - `owner`
- Kept client/beta tester accounts blocked from practitioner-only rooms.
- Concierge Desk now hydrates the current user's active Suite stay when opened directly, so owner/admin/practitioner users can return to their Suite from the Desk.
- Concierge Desk now shows the Suite return card for practitioner-level users even when they opened the Desk directly.
- Updated Concierge Desk copy when no active clock-in context exists:
  - owner/admin users see owner access copy.
  - practitioner users are directed to return to Suite to check in/clock in.
- Updated asset cache-busting to `0.10.33` for Suite and Concierge Desk scripts/styles.

## Role behavior

| Role | Clock In | Concierge Desk | Phase 2 Gate |
|---|---:|---:|---:|
| `client` | No | No | Yes |
| `practitioner` | Yes | Yes | No |
| `admin` | Yes | Yes | No |
| `owner` | Yes | Yes | No |

## Supabase migration

No Supabase migration required.

## QA checklist

1. Log in as `mm.johnson@icloud.com` with role `owner`.
2. Open `/client/` and confirm the **Clock Into the Flowtel** button is visible after check-in data is entered.
3. Clock into the Concierge Desk from the Suite.
4. Confirm `/manager/` opens without a separate password form.
5. Confirm the Suite return card appears and **Clock Out** returns to the Suite.
6. Open `/manager/` directly as owner and confirm it still opens.
7. Log in as a `client` beta tester and confirm the Clock In button is hidden.
8. Open `/manager/` as a `client` and confirm the Phase 2 gate appears.

## Syntax checks

- `node --check client/app.js`
- `node --check manager/app.js`
