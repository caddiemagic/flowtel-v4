-- Flowtel v0.10.81 — Acuity Scheduling + Consented Client Access
--
-- Purpose:
-- 1. Connect the existing shared provider scheduling foundation to one Acuity account.
-- 2. Add the complimentary 45-minute Womb Magic service for Queendom members.
-- 3. Preserve one ongoing Mentor to the Moon while allowing an appointment-holding
--    Priestess temporary, explicit, consented access to the booked member's Flowtel data.
-- 4. Keep appointment history, access grants, and webhook sync history append-only.
--
-- This migration is additive. It does not alter Caddie Magic booking behavior.
-- Migration 037 remains retired. Never rerun or rename either migration 052 file.

create extension if not exists pgcrypto with schema extensions;

alter table public.flowtel_provider_scheduling_profiles
  add column if not exists acuity_calendar_name text,
  add column if not exists booking_enabled boolean not null default false,
  add column if not exists acuity_last_verified_at timestamptz,
  add column if not exists booking_note text;

alter table public.flowtel_provider_service_types
  add column if not exists eligibility_period text not null default 'none',
  add column if not exists access_days_after integer not null default 0,
  add column if not exists is_complimentary boolean not null default false;

alter table public.flowtel_external_appointments
  add column if not exists client_timezone text,
  add column if not exists service_period_key text,
  add column if not exists consent_language text,
  add column if not exists consent_granted_at timestamptz,
  add column if not exists canceled_at timestamptz,
  add column if not exists last_synced_at timestamptz,
  add column if not exists booking_source text not null default 'flowtel',
  add column if not exists access_grant_id uuid;

create table if not exists public.flowtel_appointment_access_grants (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.flowtel_external_appointments(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  practitioner_id uuid not null references public.profiles(id) on delete cascade,
  service_key text not null,
  consent_language text not null,
  consent_granted_at timestamptz not null default now(),
  access_scope text not null default 'cycle_data_checkins_reflections_flow_map_stays',
  active_from timestamptz not null default now(),
  active_until timestamptz not null,
  status text not null default 'active'
    check (status in ('active','revoked','expired')),
  revoked_at timestamptz,
  revoked_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (appointment_id, practitioner_id)
);

create table if not exists public.flowtel_acuity_sync_events (
  id uuid primary key default gen_random_uuid(),
  acuity_appointment_id text,
  action text not null,
  appointment_id uuid references public.flowtel_external_appointments(id) on delete set null,
  calendar_id text,
  appointment_type_id text,
  processing_status text not null default 'received'
    check (processing_status in ('received','processed','ignored','failed')),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.flowtel_external_appointments
  drop constraint if exists flowtel_external_appointments_access_grant_id_fkey;

alter table public.flowtel_external_appointments
  add constraint flowtel_external_appointments_access_grant_id_fkey
  foreign key (access_grant_id)
  references public.flowtel_appointment_access_grants(id)
  on delete set null
  deferrable initially deferred;

create index if not exists flowtel_access_grants_practitioner_active_idx
  on public.flowtel_appointment_access_grants(practitioner_id, client_id, active_until, status);

create index if not exists flowtel_access_grants_client_active_idx
  on public.flowtel_appointment_access_grants(client_id, active_until, status);

create index if not exists flowtel_external_appointments_customer_time_idx
  on public.flowtel_external_appointments(customer_user_id, starts_at, status);

create index if not exists flowtel_acuity_sync_events_lookup_idx
  on public.flowtel_acuity_sync_events(acuity_appointment_id, created_at desc);

create unique index if not exists flowtel_one_womb_magic_per_period_idx
  on public.flowtel_external_appointments(customer_user_id, service_type_id, service_period_key)
  where source_product = 'flowtel'
    and service_period_key is not null
    and status in ('pending','scheduled','rescheduled','completed');

insert into public.flowtel_provider_service_types (
  product_key,
  service_key,
  service_name,
  duration_minutes,
  is_active,
  eligibility_period,
  access_days_after,
  is_complimentary
) values (
  'flowtel',
  'womb_magic',
  'Womb Magic',
  45,
  true,
  'calendar_month',
  7,
  true
)
on conflict (product_key, service_key) do update
set service_name = excluded.service_name,
    duration_minutes = excluded.duration_minutes,
    is_active = true,
    eligibility_period = excluded.eligibility_period,
    access_days_after = excluded.access_days_after,
    is_complimentary = excluded.is_complimentary,
    updated_at = now();

comment on table public.flowtel_appointment_access_grants is
  'Append-only consented service access for a Priestess holding a specific Flowtel appointment. Separate from the ongoing Mentor to the Moon relationship.';

comment on table public.flowtel_acuity_sync_events is
  'Private append-only log of Acuity webhook receipt and processing outcomes.';

comment on column public.flowtel_external_appointments.service_period_key is
  'Eligibility period consumed by a complimentary service. Womb Magic v1 uses the Flowtel-Time calendar month YYYY-MM.';

comment on column public.flowtel_external_appointments.consent_language is
  'Exact member-facing consent shown when the appointment was booked.';

alter table public.flowtel_appointment_access_grants enable row level security;
alter table public.flowtel_acuity_sync_events enable row level security;

-- Participants may read the narrow access grant. Only trusted server code writes it.
drop policy if exists "Appointment participants read access grants" on public.flowtel_appointment_access_grants;
create policy "Appointment participants read access grants"
  on public.flowtel_appointment_access_grants for select
  using (
    client_id = auth.uid()
    or practitioner_id = auth.uid()
    or public.flowtel_current_user_is_admin_or_owner()
  );

-- Acuity sync events are owner-only.
drop policy if exists "Owner reads Acuity sync events" on public.flowtel_acuity_sync_events;
create policy "Owner reads Acuity sync events"
  on public.flowtel_acuity_sync_events for select
  using (public.flowtel_current_user_is_admin_or_owner());

grant select on public.flowtel_appointment_access_grants to authenticated;
grant select on public.flowtel_acuity_sync_events to authenticated;

create or replace function public.flowtel_womb_magic_period_key(
  p_at timestamptz default now()
)
returns text
language sql
stable
set search_path = public
as $$
  select to_char(timezone('America/Los_Angeles', coalesce(p_at, now())), 'YYYY-MM');
$$;

revoke all on function public.flowtel_womb_magic_period_key(timestamptz) from public;
grant execute on function public.flowtel_womb_magic_period_key(timestamptz) to authenticated;

create or replace function public.flowtel_has_active_appointment_access(
  p_client_id uuid,
  p_practitioner_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.flowtel_appointment_access_grants grant_row
    join public.flowtel_external_appointments appointment
      on appointment.id = grant_row.appointment_id
    where grant_row.client_id = p_client_id
      and grant_row.practitioner_id = coalesce(p_practitioner_id, auth.uid())
      and grant_row.status = 'active'
      and grant_row.active_from <= now()
      and grant_row.active_until > now()
      and appointment.status in ('scheduled','rescheduled','completed')
  );
$$;

revoke all on function public.flowtel_has_active_appointment_access(uuid,uuid) from public;
grant execute on function public.flowtel_has_active_appointment_access(uuid,uuid) to authenticated;

-- Extend the established consent gate without changing permanent Mentor to the Moon rules.
create or replace function public.flowtel_can_view_cycle_subject(p_subject_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and p_subject_id is not null
    and (
      p_subject_id = auth.uid()
      or public.flowtel_current_user_is_admin_or_owner()
      or exists (
        select 1
        from public.flowtel_practitioner_relationships relationship
        where relationship.client_id = p_subject_id
          and relationship.practitioner_id = auth.uid()
          and relationship.status = 'connected'
          and coalesce(relationship.consent_granted, false) = true
      )
      or public.flowtel_has_active_appointment_access(p_subject_id, auth.uid())
    );
$$;

revoke all on function public.flowtel_can_view_cycle_subject(uuid) from public;
grant execute on function public.flowtel_can_view_cycle_subject(uuid) to authenticated;

create or replace function public.flowtel_list_my_service_clients()
returns table (
  client_id uuid,
  display_name text,
  email text,
  appointment_id uuid,
  service_key text,
  service_name text,
  starts_at timestamptz,
  ends_at timestamptz,
  access_until timestamptz,
  access_scope text,
  relationship_kind text
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to view service clients.' using errcode = '28000';
  end if;

  return query
  select
    grant_row.client_id,
    public.flowtel_resolve_display_name(profile.display_name, profile.first_name, profile.last_name, profile.email, 'Flowtel Guest'),
    profile.email,
    appointment.id,
    service.service_key,
    service.service_name,
    appointment.starts_at,
    appointment.ends_at,
    grant_row.active_until,
    grant_row.access_scope,
    'service_appointment'::text
  from public.flowtel_appointment_access_grants grant_row
  join public.flowtel_external_appointments appointment
    on appointment.id = grant_row.appointment_id
  join public.flowtel_provider_service_types service
    on service.id = appointment.service_type_id
  join public.profiles profile
    on profile.id = grant_row.client_id
  where grant_row.practitioner_id = auth.uid()
    and grant_row.status = 'active'
    and grant_row.active_from <= now()
    and grant_row.active_until > now()
    and appointment.status in ('scheduled','rescheduled','completed')
  order by appointment.starts_at asc;
end;
$$;

revoke all on function public.flowtel_list_my_service_clients() from public;
grant execute on function public.flowtel_list_my_service_clients() to authenticated;

create or replace function public.flowtel_list_my_upcoming_service_calls()
returns table (
  appointment_id uuid,
  acuity_appointment_id text,
  service_key text,
  service_name text,
  client_id uuid,
  client_name text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text,
  client_timezone text,
  access_until timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_owner boolean := public.flowtel_current_user_is_admin_or_owner();
begin
  if v_user_id is null then
    raise exception 'You must be signed in to view upcoming calls.' using errcode = '28000';
  end if;

  return query
  select
    appointment.id,
    appointment.acuity_appointment_id,
    service.service_key,
    service.service_name,
    appointment.customer_user_id,
    public.flowtel_resolve_display_name(profile.display_name, profile.first_name, profile.last_name, profile.email, 'Flowtel Guest'),
    appointment.starts_at,
    appointment.ends_at,
    appointment.status,
    appointment.client_timezone,
    grant_row.active_until
  from public.flowtel_external_appointments appointment
  join public.flowtel_provider_scheduling_profiles provider
    on provider.id = appointment.provider_id
  join public.flowtel_provider_service_types service
    on service.id = appointment.service_type_id
  left join public.profiles profile
    on profile.id = appointment.customer_user_id
  left join public.flowtel_appointment_access_grants grant_row
    on grant_row.id = appointment.access_grant_id
  where appointment.source_product = 'flowtel'
    and appointment.starts_at >= now() - interval '1 day'
    and appointment.status in ('pending','scheduled','rescheduled')
    and (v_owner or provider.user_id = v_user_id)
  order by appointment.starts_at asc
  limit 250;
end;
$$;

revoke all on function public.flowtel_list_my_upcoming_service_calls() from public;
grant execute on function public.flowtel_list_my_upcoming_service_calls() to authenticated;

create or replace function public.flowtel_list_my_booked_calls()
returns table (
  appointment_id uuid,
  acuity_appointment_id text,
  service_key text,
  service_name text,
  practitioner_id uuid,
  practitioner_name text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text,
  client_timezone text,
  service_period_key text
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to view your calls.' using errcode = '28000';
  end if;

  return query
  select
    appointment.id,
    appointment.acuity_appointment_id,
    service.service_key,
    service.service_name,
    provider.user_id,
    public.flowtel_resolve_display_name(profile.display_name, profile.first_name, profile.last_name, profile.email, 'Flowtel Priestess'),
    appointment.starts_at,
    appointment.ends_at,
    appointment.status,
    appointment.client_timezone,
    appointment.service_period_key
  from public.flowtel_external_appointments appointment
  join public.flowtel_provider_scheduling_profiles provider
    on provider.id = appointment.provider_id
  join public.flowtel_provider_service_types service
    on service.id = appointment.service_type_id
  left join public.profiles profile
    on profile.id = provider.user_id
  where appointment.customer_user_id = auth.uid()
    and appointment.source_product = 'flowtel'
  order by appointment.starts_at desc
  limit 100;
end;
$$;

revoke all on function public.flowtel_list_my_booked_calls() from public;
grant execute on function public.flowtel_list_my_booked_calls() to authenticated;

-- Ensure the existing appointment participant policy continues to cover the
-- service provider, booked member, and owner after the new columns are added.
drop policy if exists "Appointment participants read appointments" on public.flowtel_external_appointments;
create policy "Appointment participants read appointments"
  on public.flowtel_external_appointments for select
  using (
    customer_user_id = auth.uid()
    or public.flowtel_current_user_is_admin_or_owner()
    or exists (
      select 1
      from public.flowtel_provider_scheduling_profiles provider
      where provider.id = flowtel_external_appointments.provider_id
        and provider.user_id = auth.uid()
    )
  );

comment on function public.flowtel_list_my_service_clients() is
  'Returns only clients whose active appointment consent currently grants the signed-in Priestess access.';

comment on function public.flowtel_list_my_upcoming_service_calls() is
  'Returns upcoming Flowtel service calls for the signed-in provider, or all calls for the owner.';

comment on function public.flowtel_list_my_booked_calls() is
  'Returns the signed-in member appointment history without exposing other members.';
