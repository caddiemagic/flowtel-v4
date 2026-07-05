# Flowtel Release 0.8.3 — Turndown Completion RPC

## Purpose

This release fixes the case where the Concierge Desk button changes to **Completing...** and then returns to **Complete Turndown** without moving the guest into Completed Requests.

That behavior means the browser-side save failed. The most likely causes are Supabase RLS, schema drift, or a migration mismatch.

## Changes

- Adds a dedicated Supabase RPC: `flowtel_complete_turndown(stay_id, note)`.
- Moves the actual completion action into the database as a `security definer` function.
- Keeps the security check: only `practitioner`, `admin`, or `owner` profiles can complete Turndown.
- Updates `shared/stays.js` so the Concierge Desk calls the RPC instead of trying to directly update many columns from the browser.
- Preserves existing Concierge Notes and appends the new note when provided.
- Returns clearer UI errors if the RPC migration has not been installed.

## Database

Run after migrations 010, 011, and 012:

```sql
-- database/migration-013-turndown-completion-rpc.sql
```

## QA

1. Check in as a guest.
2. Request Turndown Service.
3. Clock in as the assigned practitioner.
4. Click **Complete Turndown**.
5. Leave a note in the prompt.
6. Confirm the active request leaves Open Requests.
7. Confirm the guest appears in Completed Requests.
8. Confirm Awaiting Turndown count drops.
9. Confirm the guest Suite shows the Concierge Note.
