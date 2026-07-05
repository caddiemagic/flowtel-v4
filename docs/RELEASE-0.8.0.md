# Flowtel Release 0.8.0 — Stay Logic + Concierge Stabilization

## Scope

This release stabilizes the highest-priority beta issues without changing the visual system.

## Fixed

### Daily Stay / Flowtel Time

- Added a shared Flowtel Date helper using `America/Los_Angeles`.
- Auto-closes all stale open stays for a guest, not only the latest one.
- Uses UTC-safe date math for stay length calculations.
- Beta login now runs the daily stay lifecycle check before opening a Suite.
- Beta practitioner clock-in context now uses Flowtel Date instead of UTC date slicing.

### Moon Magic

- Replaced the drifting public tracker moon anchor with the same canonical 2026 New Moon dates used by the app.
- Updated shared Moon Magic to use Pacific Time New Moon calendar dates.
- Added `nextNewMoonDate` to the shared Moon Magic payload for future UI use.

### Concierge Desk

- Repaired Flowtel Date comparisons in the Concierge Desk.
- Guests in House now uses Flowtel Date consistently.
- Extended Stay calculations now use Flowtel Date.
- In-house rows now show checked-in status instead of incorrectly displaying a turndown line.
- Queue rows now display the guest wing to make routing easier to test.

### Supabase

Added `database/migration-010-concierge-rls-and-flowtel-date.sql`:

- Adds Concierge Desk indexes.
- Adds RLS policies so practitioners/admins/owners can read and update stays needed for Concierge operations.
- Keeps guests limited to their own stays.
- Adds an optional unique index for one stay per guest per Flowtel Day when beta data is clean.

## Install Notes

1. Deploy the app files.
2. Run migrations through `database/migration-010-concierge-rls-and-flowtel-date.sql` in Supabase.
3. If the one-stay-per-day index notice appears, clean duplicate beta rows for the same `client_id + checkin_date`, then rerun the unique index line.

## Test Checklist

Guest:

- Log in after a new Flowtel Day begins.
- Confirm yesterday’s open stay auto-closes.
- Confirm Check In creates today’s stay.
- Confirm returning the same Flowtel Day opens today’s stay.

Moon Magic:

- Confirm June 14, 2026 = Moon Day 1.
- Confirm July 3, 2026 = Moon Day 20.
- Confirm July 14, 2026 = Moon Day 1.

Concierge:

- Create three open guest stays today.
- Request turndown for one guest in the practitioner’s assigned wing.
- Confirm Guests in House = all three open stays.
- Confirm Awaiting Turndown = matching requested stays only.
- Open a requested room and leave a note.
- Confirm the note appends to the guest stay and the request leaves the Awaiting Turndown queue.
