# Flowtel Release 0.8.2 — Turndown Completion Hardening

## Purpose

This release fixes the case where a practitioner completes Turndown Service, but the guest remains in the active Awaiting Turndown queue.

## Changes

- Added durable Turndown completion fields:
  - `turndown_completed_at`
  - `turndown_completed_by`
  - `turndown_completed_by_name`
- Updated Concierge Desk queue logic so active requests are only unresolved requests.
- Completed Turndown requests now stay in the daily log without generating an active alert.
- Completion is no longer blocked by note display behavior.
- Concierge action buttons now show errors instead of failing silently.

## Database

Run after migrations 010 and 011:

```sql
-- database/migration-012-turndown-completion-hardening.sql
```

## QA

1. Guest requests Turndown Service.
2. Practitioner opens Concierge Desk.
3. Awaiting Turndown count should increase by 1.
4. Practitioner clicks Complete Turndown and leaves a note.
5. Awaiting Turndown count should decrease by 1.
6. Guest should move to Completed Requests.
7. Completed copy should show who tended to the guest.
8. Guest Suite should show the Concierge Note.
