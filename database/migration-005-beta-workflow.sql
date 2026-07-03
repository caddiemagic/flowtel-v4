-- Flowtel Release 0.5.2
-- Reflection log, Turndown queue repair, practitioner clock sessions,
-- and Flow FM 13 Moon initiation profile metadata.

-- Store every reflection as its own entry instead of overwriting the stay.
create table if not exists public.flowtel_reflections (
  id uuid primary key default gen_random_uuid(),
  stay_id uuid not null references public.flowtel_stays(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  reflection text not null,
  created_at timestamptz not null default now()
);

create index if not exists flowtel_reflections_stay_idx
  on public.flowtel_reflections (stay_id, created_at);

create index if not exists flowtel_reflections_client_idx
  on public.flowtel_reflections (client_id, created_at desc);

alter table public.flowtel_reflections enable row level security;

drop policy if exists "Clients can read their own reflection entries" on public.flowtel_reflections;
create policy "Clients can read their own reflection entries"
  on public.flowtel_reflections for select
  using (auth.uid() = client_id);

drop policy if exists "Clients can create their own reflection entries" on public.flowtel_reflections;
create policy "Clients can create their own reflection entries"
  on public.flowtel_reflections for insert
  with check (auth.uid() = client_id);

-- Make sure Turndown Service exists on the table the app actually uses.
alter table public.flowtel_stays
  add column if not exists turndown_requested_at timestamptz,
  add column if not exists turndown_status text;

create index if not exists flowtel_stays_turndown_queue_idx
  on public.flowtel_stays (turndown_requested_at, witnessed_at, stay_status, wing)
  where turndown_requested_at is not null;

-- Practitioner clock sessions for future hours/rewards reporting.
create table if not exists public.flowtel_practitioner_clock_sessions (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null references public.profiles(id) on delete cascade,
  stay_id uuid references public.flowtel_stays(id) on delete set null,
  clocked_in_at timestamptz not null default now(),
  clocked_out_at timestamptz,
  cycle_day_claimed int,
  inner_season text,
  practitioner_wing text,
  assigned_wing text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists flowtel_clock_sessions_practitioner_idx
  on public.flowtel_practitioner_clock_sessions (practitioner_id, clocked_in_at desc);

alter table public.flowtel_practitioner_clock_sessions enable row level security;

drop policy if exists "Practitioners can read their own clock sessions" on public.flowtel_practitioner_clock_sessions;
create policy "Practitioners can read their own clock sessions"
  on public.flowtel_practitioner_clock_sessions for select
  using (auth.uid() = practitioner_id);

drop policy if exists "Practitioners can create their own clock sessions" on public.flowtel_practitioner_clock_sessions;
create policy "Practitioners can create their own clock sessions"
  on public.flowtel_practitioner_clock_sessions for insert
  with check (auth.uid() = practitioner_id);

drop policy if exists "Practitioners can update their own clock sessions" on public.flowtel_practitioner_clock_sessions;
create policy "Practitioners can update their own clock sessions"
  on public.flowtel_practitioner_clock_sessions for update
  using (auth.uid() = practitioner_id)
  with check (auth.uid() = practitioner_id);

-- Flow FM initiation metadata.
alter table public.profiles
  add column if not exists flowfm_started_at date,
  add column if not exists practitioner_level text default 'Initiate',
  add column if not exists is_initiated boolean default false;
