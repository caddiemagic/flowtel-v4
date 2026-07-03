-- Flowtel Release 0.4.3
-- Turndown Service request tracking for existing stays.

alter table public.stays
  add column if not exists turndown_requested_at timestamptz,
  add column if not exists turndown_status text;

create index if not exists stays_turndown_queue_idx
  on public.stays (turndown_requested_at, witnessed_at, stay_status)
  where turndown_requested_at is not null;
