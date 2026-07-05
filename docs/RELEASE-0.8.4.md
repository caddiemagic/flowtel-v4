# Flowtel Release 0.8.4 — Completed Turndown Log Date Fix

## Purpose

This release fixes a small Concierge Desk quirk discovered after v0.8.3: when multiple Turndown requests were completed, one request could move into **Completed Requests** while another disappeared after completion.

## Root Cause

The Completed Requests filter was using the guest's original Flowtel check-in date to decide whether a completed request belonged in today's completed log.

That works for same-day check-ins, but it fails for any older/open stay or beta row that is completed today. The request leaves **Open Requests** because it is no longer active, but it does not appear in **Completed Requests** because its check-in date is not today's Flowtel Date.

## Changes

- Adds `turndownCompletionFlowtelDate(stay)` in `manager/app.js`.
- Completed Requests now uses the Turndown completion timestamp first:
  - `turndown_completed_at`
  - then `witnessed_at`
  - then `updated_at`
  - then the original stay Flowtel Date as final fallback.
- Keeps the daily completed-request log aligned with the day the practitioner tended the guest.
- No Supabase migration required.

## QA

1. Have two guests request Turndown Service.
2. Complete the first request with a note.
3. Confirm it moves to **Completed Requests**.
4. Complete the second request with a note.
5. Confirm it also moves to **Completed Requests** instead of disappearing.
6. Confirm the Awaiting Turndown count drops to 0 when all active requests are complete.
