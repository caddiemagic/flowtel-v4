-- Flowtel Release 1 candidate: 13 Moons entitlement and private Vortex data.
-- Additive only. Review on a staging database before applying in production.
-- Purchases MUST be verified server-side; clients never self-grant entitlements.
create table if not exists public.flowtel_13_moons_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_granted boolean not null default false,
  source text not null default 'squarespace',
  source_order_id text,
  verified_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.flowtel_13_moons_entitlements enable row level security;
revoke all on public.flowtel_13_moons_entitlements from anon, authenticated;
grant select on public.flowtel_13_moons_entitlements to authenticated;
drop policy if exists thirteen_moons_entitlement_self_read on public.flowtel_13_moons_entitlements;
create policy thirteen_moons_entitlement_self_read
on public.flowtel_13_moons_entitlements for select to authenticated
using (user_id = (select auth.uid()));

create table if not exists public.flowtel_13_moons_vortices (
  user_id uuid primary key references auth.users(id) on delete cascade,
  start_month date not null,
  reflections jsonb not null default '[]'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint thirteen_moons_start_first_of_month check (
    extract(day from start_month) = 1
  ),
  constraint thirteen_moons_reflections_array check (jsonb_typeof(reflections) = 'array')
);
alter table public.flowtel_13_moons_vortices enable row level security;
revoke all on public.flowtel_13_moons_vortices from anon, authenticated;
grant select on public.flowtel_13_moons_vortices to authenticated;
drop policy if exists thirteen_moons_vortex_owner_read on public.flowtel_13_moons_vortices;
create policy thirteen_moons_vortex_owner_read
on public.flowtel_13_moons_vortices for select to authenticated
using (user_id=(select auth.uid()));
-- Writes are deliberately not enabled until a server-side validation routine
-- enforces eligibility, immutable start month, and completed reflections.
