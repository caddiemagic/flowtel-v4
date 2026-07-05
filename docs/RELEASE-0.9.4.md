# Flowtel v0.9.4 — Cycle Data Dashboard MVP + Seasonal Reflection Foundation

Release date: July 5, 2026

## Purpose

This release begins the next phase after Mentor to the Moon connections were stabilized in v0.9.3.

The release focuses on three foundations:

1. A guest should not be able to invite herself as her own Mentor to the Moon.
2. Connected mentors should be able to open a consent-aware Cycle Data Dashboard for themselves and connected clients.
3. Seasonal Flow Map cards should begin opening anonymous collective reflection views by actual inner season.

## Product decisions preserved

- A practitioner is a guest first and a mentor second.
- One guest may have one active Mentor to the Moon at a time.
- One mentor may have many connected clients.
- By inviting a mentor, the guest consents to share Flowtel cycle data, check-ins, reflections, and stay history while connected.
- Admins/owners may view all Flowtel client data.
- Mentors may view their own data and connected-client data.
- Anonymous seasonal dashboards do not show names, emails, user IDs, or profile data.
- The seasonal reflection view filters by Actual Inner Season.

## Updates included

### Choose Your Mentor

- The mentor directory now excludes the signed-in user.
- This prevents a practitioner/guest from seeing herself on the mentor list and sending a self-connection request.

### Cycle Data Dashboard

- `/cycle-data/` now loads real Flowtel stay/reflection data instead of only a placeholder shell.
- Views supported:
  - My Data
  - Individual connected client data
  - All My Clients for mentors
  - All Flowtel Clients for admins/owners
- Dashboard includes:
  - Entry count
  - Reflection count
  - Top actual season
  - Top feels-like season
  - Latest check-in
  - Top moon phase
  - Flow Map seasonal counts
  - Entry log with actual day, recorded day, actual season, feels-like season, moon phase, moon cycle, and reflection text

### Seasonal Reflections

- Medicine wheel seasonal cards now link to `/cycle-data/?season=...`.
- Seasonal reflection pages show anonymous reflections across Flowtel by Actual Inner Season.
- The anonymous view includes:
  - actual cycle day
  - recorded cycle day
  - actual inner season
  - feels-like season
  - moon phase
  - moon cycle
  - reflection text
- Names, emails, IDs, and profile data are not exposed in the seasonal reflection UI.

### Filters

Cycle Data Dashboard and Seasonal Reflection views include filters for:

- actual inner season
- moon phase
- moon cycle
- date range

Moon cycle currently uses the canonical 2026 Flowtel New Moon dates already used by Moon Magic.

### Privacy groundwork

- Added `profiles.collective_season_notes_opt_out` for a future guest-facing opt-out toggle.
- Default is opt-in, matching the beta decision for anonymous seasonal reflections.

## Database migration

Run:

`database/migration-017-cycle-data-dashboard-mvp.sql`

This migration adds:

- `profiles.collective_season_notes_opt_out`
- `flowtel_current_user_role()`
- `flowtel_current_user_is_admin_or_owner()`
- `flowtel_can_view_cycle_subject(uuid)`
- `flowtel_moon_cycle_start_for_date(date)`
- `flowtel_get_cycle_data_entries(uuid, text)`
- `flowtel_get_collective_season_reflections(text, text, date, date, date)`

## Test plan

1. Log in as a practitioner.
2. Open Choose Your Mentor as that same user.
3. Confirm she does not appear in her own mentor directory.
4. Log in as a connected mentor.
5. Open Your Clients.
6. Click View Data.
7. Confirm the client Cycle Data Dashboard opens.
8. Open `/cycle-data/` without a client query and confirm the mentor sees her own data.
9. Open `/cycle-data/?scope=all` and confirm the mentor sees connected-client aggregate data.
10. Log in as admin/owner and confirm `/cycle-data/?scope=all` opens global Flowtel client data.
11. Click an Inner Season card on the medicine wheel and confirm the anonymous seasonal reflection view opens.
12. Test date, moon phase, moon cycle, and season filters.

## Known limitations

- Actual vs Recorded Cycle Day intelligence is not fully implemented yet. This release displays both values when present but does not yet make calculated cycle day the new universal source of truth.
- Seasonal reflections are anonymized by removing profile identity, but free-text reflections are shown as written. AI redaction is not included yet.
- Profile photo upload remains deferred until Squarespace image/profile source is confirmed.
