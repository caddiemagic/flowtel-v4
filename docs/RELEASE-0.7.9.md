# Flowtel Release 0.7.9 — Concierge Dashboard Counts and Routing Repair

## Scope

This release focuses only on the practitioner Concierge Desk dashboard logic.

## Changes

- Restores Awaiting Turndown as the only turndown alert source.
- Shows Awaiting Turndown count from all open stays where:
  - `turndown_status = requested` or `turndown_requested_at` exists
  - the stay is still open
  - the stay wing matches the practitioner assigned wing
- Guests in House now renders from a dedicated `todayOpenStays()` array.
- Guests in House no longer receives alert styling.
- Extended Stay no longer receives alert styling.
- Your Clients only receives alert styling when there are new connection requests.
- Increases the front desk stay fetch limit from 100 to 500 rows for beta testing.

## Expected Beta Test

Use three guests:

1. Guest A: checked in, no turndown.
2. Guest B: checked in, requested turndown, matching practitioner wing.
3. Guest C: checked in, requested turndown, different practitioner wing.

Expected dashboard:

- Guests in House = 3
- Awaiting Turndown = 1
- Awaiting Turndown queue shows Guest B only
- Guests in House queue shows all three open stays
- Alerts only on Awaiting Turndown and Your Clients when relevant
