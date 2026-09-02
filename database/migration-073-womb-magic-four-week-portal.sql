-- Flowtel v0.10.87 — Four-Week Womb Magic Portal
-- Migration 073
--
-- Adds one continuous four-week Womb Magic practicum container without
-- replacing the existing once-per-calendar-month complimentary Womb Magic call.
-- One client and one Priestess may each hold only one active portal at a time.
-- The same Priestess holds all four 45-minute sessions. The first booked
-- appointment establishes a standing weekly time; all four appointments are
-- created together when that same time is available for four consecutive weeks.

create table if not exists public.flowtel_womb_magic_portals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  practitioner_id uuid not null references public.profiles(id) on delete restrict,
  provider_id uuid not null references public.flowtel_provider_scheduling_profiles(id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending','active','completed','cancelled')),
  starts_at timestamptz not null,
  active_until timestamptz not null,
  recurrence_timezone text,
  recurrence_weekday smallint check (recurrence_weekday is null or recurrence_weekday between 0 and 6),
  recurrence_time time,
  consent_language text not null,
  consent_granted_at timestamptz not null default now(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (active_until > starts_at)
);

comment on table public.flowtel_womb_magic_portals is
  'Private four-week Womb Magic practicum container. One Queendom client stays with one Flow FM Priestess for up to four sessions across 28 days.';

create unique index if not exists flowtel_one_active_womb_magic_portal_per_client_idx
  on public.flowtel_womb_magic_portals(client_id)
  where status in ('pending','active');

create unique index if not exists flowtel_one_active_womb_magic_portal_per_priestess_idx
  on public.flowtel_womb_magic_portals(practitioner_id)
  where status in ('pending','active');

create index if not exists flowtel_womb_magic_portal_practitioner_idx
  on public.flowtel_womb_magic_portals(practitioner_id, status, active_until);

alter table public.flowtel_external_appointments
  add column if not exists womb_magic_portal_id uuid references public.flowtel_womb_magic_portals(id) on delete set null,
  add column if not exists womb_magic_portal_session_number integer;

alter table public.flowtel_external_appointments
  drop constraint if exists flowtel_womb_magic_portal_session_number_check;

alter table public.flowtel_external_appointments
  add constraint flowtel_womb_magic_portal_session_number_check
  check (womb_magic_portal_session_number is null or womb_magic_portal_session_number between 1 and 4);

create index if not exists flowtel_womb_magic_portal_appointments_idx
  on public.flowtel_external_appointments(womb_magic_portal_id, womb_magic_portal_session_number, starts_at);

create unique index if not exists flowtel_womb_magic_portal_session_unique_idx
  on public.flowtel_external_appointments(womb_magic_portal_id, womb_magic_portal_session_number)
  where womb_magic_portal_id is not null
    and status in ('pending','scheduled','rescheduled','completed');

alter table public.flowtel_womb_magic_portals enable row level security;
revoke all on table public.flowtel_womb_magic_portals from anon;
grant select on table public.flowtel_womb_magic_portals to authenticated;

drop policy if exists "Portal participants read Womb Magic portal" on public.flowtel_womb_magic_portals;
create policy "Portal participants read Womb Magic portal"
  on public.flowtel_womb_magic_portals for select to authenticated
  using (
    client_id = auth.uid()
    or practitioner_id = auth.uid()
    or public.flowtel_current_user_is_admin_or_owner()
  );

create or replace function public.flowtel_has_active_womb_magic_portal_access(
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
    from public.flowtel_womb_magic_portals portal
    where portal.client_id = p_client_id
      and portal.practitioner_id = coalesce(p_practitioner_id, auth.uid())
      and portal.status = 'active'
      and portal.starts_at <= now()
      and portal.active_until > now()
  );
$$;

revoke all on function public.flowtel_has_active_womb_magic_portal_access(uuid,uuid) from public;
grant execute on function public.flowtel_has_active_womb_magic_portal_access(uuid,uuid) to authenticated;

-- Extend the existing cycle/client consent gate to the active four-week container.
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
      or public.flowtel_has_active_womb_magic_portal_access(p_subject_id, auth.uid())
    );
$$;

revoke all on function public.flowtel_can_view_cycle_subject(uuid) from public;
grant execute on function public.flowtel_can_view_cycle_subject(uuid) to authenticated;

-- Personal Cosmology still requires the member-level sharing switch in addition
-- to an active relationship. The Portal simply becomes another legitimate active
-- practitioner relationship when that switch is on.
create or replace function public.flowtel_can_view_member_cosmology(
  p_member_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and p_member_id is not null
    and (
      p_member_id = auth.uid()
      or (
        exists (
          select 1
          from public.flowtel_member_cosmology cosmology
          where cosmology.member_id = p_member_id
            and cosmology.share_with_active_practitioner = true
        )
        and (
          exists (
            select 1
            from public.flowtel_practitioner_relationships relationship
            where relationship.client_id = p_member_id
              and relationship.practitioner_id = auth.uid()
              and relationship.status = 'connected'
              and coalesce(relationship.consent_granted, false) = true
          )
          or public.flowtel_has_active_appointment_access(p_member_id, auth.uid())
          or public.flowtel_has_active_womb_magic_portal_access(p_member_id, auth.uid())
        )
      )
    );
$$;

revoke all on function public.flowtel_can_view_member_cosmology(uuid) from public;
grant execute on function public.flowtel_can_view_member_cosmology(uuid) to authenticated;

-- Include an active Portal client in the established practitioner client list even
-- between weekly appointments. Keep the original function shape unchanged.
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
    and appointment.womb_magic_portal_id is null

  union all

  select
    portal.client_id,
    public.flowtel_resolve_display_name(profile.display_name, profile.first_name, profile.last_name, profile.email, 'Flowtel Guest'),
    profile.email,
    null::uuid,
    'womb_magic_portal'::text,
    '4-Week Womb Magic Portal'::text,
    portal.starts_at,
    portal.active_until,
    portal.active_until,
    'cycle_data_checkins_reflections_flow_map_stays'::text,
    'womb_magic_portal'::text
  from public.flowtel_womb_magic_portals portal
  join public.profiles profile on profile.id = portal.client_id
  where portal.practitioner_id = auth.uid()
    and portal.status = 'active'
    and portal.active_until > now()
  order by 7 asc;
end;
$$;

revoke all on function public.flowtel_list_my_service_clients() from public;
grant execute on function public.flowtel_list_my_service_clients() to authenticated;
