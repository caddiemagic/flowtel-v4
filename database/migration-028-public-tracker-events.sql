-- Flowtel v0.10.29 — Public Cycle Tracker Anonymous Events
-- Stores aggregate-friendly usage patterns from the public tracker.
-- No names, emails, profile ids, or auth user ids are collected here.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.flowtel_public_tracker_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_type text not null default 'tracker_event',
  source_page text,
  tracking_method text,
  selected_cycle_day integer,
  selected_feels_like_season text,
  calculated_inner_season text,
  moon_phase text,
  moon_day integer,
  next_new_moon date,
  cta_target text,
  metadata jsonb not null default '{}'::jsonb,
  constraint flowtel_public_tracker_events_event_type_check
    check (event_type in ('tracker_view','tracker_submit','cta_click','tracker_day_preview','tracker_event')),
  constraint flowtel_public_tracker_events_cycle_day_check
    check (selected_cycle_day is null or selected_cycle_day between 1 and 120),
  constraint flowtel_public_tracker_events_moon_day_check
    check (moon_day is null or moon_day between 1 and 60)
);

alter table public.flowtel_public_tracker_events enable row level security;

-- Keep this table private from browser clients. Server endpoints use the service role key.
drop policy if exists "No public read on tracker events" on public.flowtel_public_tracker_events;
drop policy if exists "No public insert on tracker events" on public.flowtel_public_tracker_events;

create index if not exists idx_flowtel_public_tracker_events_created_at
  on public.flowtel_public_tracker_events (created_at desc);

create index if not exists idx_flowtel_public_tracker_events_event_type
  on public.flowtel_public_tracker_events (event_type);

create index if not exists idx_flowtel_public_tracker_events_cycle_day
  on public.flowtel_public_tracker_events (selected_cycle_day)
  where selected_cycle_day is not null;

create index if not exists idx_flowtel_public_tracker_events_moon_phase
  on public.flowtel_public_tracker_events (moon_phase)
  where moon_phase is not null;

notify pgrst, 'reload schema';
