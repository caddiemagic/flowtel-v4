-- database/migration-007-hospitality-relationships.sql
-- Manual bridge copy support, practitioner relationship model, and public tracker support.

create table if not exists public.flowtel_practitioner_relationships (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  practitioner_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'requested',
  consent_granted boolean not null default true,
  requested_at timestamptz not null default now(),
  connected_at timestamptz,
  disconnected_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(client_id, practitioner_id)
);

create index if not exists flowtel_relationships_client_idx
  on public.flowtel_practitioner_relationships (client_id, status);

create index if not exists flowtel_relationships_practitioner_idx
  on public.flowtel_practitioner_relationships (practitioner_id, status);

alter table public.flowtel_practitioner_relationships enable row level security;

drop policy if exists "Clients can read their practitioner relationships" on public.flowtel_practitioner_relationships;
create policy "Clients can read their practitioner relationships"
  on public.flowtel_practitioner_relationships for select
  using (auth.uid() = client_id);

drop policy if exists "Practitioners can read their client relationships" on public.flowtel_practitioner_relationships;
create policy "Practitioners can read their client relationships"
  on public.flowtel_practitioner_relationships for select
  using (auth.uid() = practitioner_id);

drop policy if exists "Clients can request practitioner connections" on public.flowtel_practitioner_relationships;
create policy "Clients can request practitioner connections"
  on public.flowtel_practitioner_relationships for insert
  with check (auth.uid() = client_id);

drop policy if exists "Clients can update their own connection requests" on public.flowtel_practitioner_relationships;
create policy "Clients can update their own connection requests"
  on public.flowtel_practitioner_relationships for update
  using (auth.uid() = client_id or auth.uid() = practitioner_id)
  with check (auth.uid() = client_id or auth.uid() = practitioner_id);

-- Allow signed-in members to see the practitioner directory.
-- If your profiles table already has broader select policies, this is harmless.
drop policy if exists "Members can view practitioner directory" on public.profiles;
create policy "Members can view practitioner directory"
  on public.profiles for select
  using (auth.uid() = id or role in ('practitioner','owner','admin'));

-- Make reflection logging resilient.
create table if not exists public.flowtel_reflections (
  id uuid primary key default gen_random_uuid(),
  stay_id uuid not null references public.flowtel_stays(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  reflection text not null,
  created_at timestamptz not null default now()
);

alter table public.flowtel_reflections enable row level security;

drop policy if exists "Clients can read their own reflection entries" on public.flowtel_reflections;
create policy "Clients can read their own reflection entries"
  on public.flowtel_reflections for select
  using (auth.uid() = client_id);

drop policy if exists "Clients can create their own reflection entries" on public.flowtel_reflections;
create policy "Clients can create their own reflection entries"
  on public.flowtel_reflections for insert
  with check (auth.uid() = client_id);
