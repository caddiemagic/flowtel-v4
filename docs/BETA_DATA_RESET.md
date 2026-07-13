# Beta Data Reset Guide

Use this before Phase 1 beta if the database contains testing notes, fake check-ins, fake mentor relationships, or draft Profile Studio submissions.

## Recommended approach

Do **not** delete only the visible “Previous Stays” rows.

The Previous Stays experience is powered mainly by `flowtel_stays`, but related data may also live in:

- `flowtel_reflections`
- `flowtel_practitioner_relationships`
- `flowtel_practitioner_clock_sessions`
- `flow_fm_priestess_profiles`
- `flow_fm_assignment_submissions`

For beta cleanup, prefer a targeted reset by tester email so real profiles and admin accounts are not damaged.

## Best Phase 1 reset

1. Export or back up the database first.
2. Decide which emails are test users or pre-beta fake data.
3. Edit `database/beta-reset-before-phase-1.sql` and replace the sample emails in the `target_emails` CTE.
4. Run one section at a time in Supabase SQL Editor.
5. Keep Supabase Auth users unless you intentionally want to recreate accounts.

## What to keep

Usually keep:

- Supabase Auth users for Megan/admin accounts
- `profiles` rows for real testers/admins
- role and membership fields
- production assets and migrations

Usually clear:

- fake stays
- fake reflections
- fake checkout notes
- fake turndown states
- fake mentor relationships
- fake Profile Studio drafts/submissions
- fake assignment submissions

## If you want a totally clean tester account

After deleting public app data for that email, you can optionally delete the matching Supabase Auth user from:

Supabase → Authentication → Users

Only do this if you want the tester to fully re-enter as if new.
