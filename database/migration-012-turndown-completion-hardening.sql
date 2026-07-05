-- Flowtel Release 0.8.2
-- Turndown completion hardening.
--
-- Purpose:
-- 1. Give Turndown completion its own durable fields, separate from generic witness notes.
-- 2. Defensively create the Concierge Note columns expected by the app.
-- 3. Keep completed requests out of the active alert count while preserving the daily log.

alter table public.flowtel_stays
  add column if not exists witnessed_by uuid references public.profiles(id) on delete set null,
  add column if not exists witnessed_at timestamptz,
  add column if not exists witness_note text,
  add column if not exists witness_note_by text,
  add column if not exists turndown_completed_at timestamptz,
  add column if not exists turndown_completed_by uuid references public.profiles(id) on delete set null,
  add column if not exists turndown_completed_by_name text;

-- Backfill completion fields for beta rows that were already completed by earlier code.
update public.flowtel_stays
set turndown_completed_at = coalesce(turndown_completed_at, witnessed_at, updated_at),
    turndown_completed_by = coalesce(turndown_completed_by, witnessed_by),
    turndown_completed_by_name = coalesce(turndown_completed_by_name, witness_note_by),
    turndown_status = 'completed'
where turndown_requested_at is not null
  and (turndown_status in ('completed','fulfilled') or witnessed_at is not null);

create index if not exists flowtel_stays_turndown_completed_idx
  on public.flowtel_stays (checkin_date, turndown_status, turndown_completed_at, wing)
  where turndown_requested_at is not null or turndown_completed_at is not null;

comment on column public.flowtel_stays.turndown_completed_at is
  'Timestamp when a Turndown request was completed. This drives completed-request state independently from Concierge Note display.';

comment on column public.flowtel_stays.turndown_completed_by_name is
  'Display label for the mentor/concierge who tended to the guest.';
