-- Flowtel v0.10.68 / Caddie Magic v0.5.1
-- Network Reintegration + Caddie Master Rewards + Shared Provider Scheduling
--
-- IMPORTANT:
-- - Both historical migration 052 files are already represented in the live schema.
-- - Do not rerun or rename either migration 052 file.
-- - Migration 037 is retired and must never be rerun.
--
-- This migration is additive. It preserves player history, Caddie Network records,
-- exact availability slots, consultations, assignments, messages, notes, and reviews.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Shared provider scheduling foundation.
-- Flowtel Practitioners and Caddie Magic Caddies use the same scheduling engine,
-- while product access, relationships, service permissions, and UI remain separate.
-- ---------------------------------------------------------------------------

create table if not exists public.flowtel_provider_scheduling_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_key text not null check (product_key in ('flowtel','caddie_magic')),
  provider_kind text not null check (provider_kind in ('practitioner','caddie')),
  source_profile_id uuid not null,
  display_name text,
  timezone text not null default 'America/Los_Angeles',
  acuity_calendar_id text,
  zoom_host_email text,
  integration_status text not null default 'not_connected'
    check (integration_status in ('not_connected','ready','connected','paused','error')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_key, provider_kind, source_profile_id)
);

create table if not exists public.flowtel_provider_service_types (
  id uuid primary key default gen_random_uuid(),
  product_key text not null check (product_key in ('flowtel','caddie_magic')),
  service_key text not null,
  service_name text not null,
  duration_minutes integer not null check (duration_minutes between 15 and 480),
  acuity_appointment_type_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_key, service_key)
);

create table if not exists public.flowtel_provider_service_assignments (
  provider_id uuid not null references public.flowtel_provider_scheduling_profiles(id) on delete cascade,
  service_type_id uuid not null references public.flowtel_provider_service_types(id) on delete cascade,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (provider_id, service_type_id)
);

create table if not exists public.flowtel_provider_weekly_availability (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.flowtel_provider_scheduling_profiles(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  daypart text not null check (daypart in ('morning','afternoon','evening')),
  available_for_calls boolean not null default false,
  available_for_in_person boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, weekday, daypart)
);

create table if not exists public.flowtel_provider_availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.flowtel_provider_scheduling_profiles(id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  block_calls boolean not null default true,
  block_in_person boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on),
  check (block_calls or block_in_person)
);

create table if not exists public.flowtel_external_appointments (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.flowtel_provider_scheduling_profiles(id) on delete restrict,
  service_type_id uuid not null references public.flowtel_provider_service_types(id) on delete restrict,
  customer_user_id uuid references auth.users(id) on delete set null,
  source_product text not null check (source_product in ('flowtel','caddie_magic')),
  source_relationship_id uuid,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending','scheduled','completed','cancelled','rescheduled','failed')),
  acuity_appointment_id text,
  acuity_calendar_id text,
  acuity_appointment_type_id text,
  external_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists flowtel_provider_schedule_user_idx
  on public.flowtel_provider_scheduling_profiles(user_id, product_key, is_active);
create index if not exists flowtel_provider_weekly_lookup_idx
  on public.flowtel_provider_weekly_availability(provider_id, weekday, daypart);
create index if not exists flowtel_provider_exception_lookup_idx
  on public.flowtel_provider_availability_exceptions(provider_id, starts_on, ends_on);
create index if not exists flowtel_external_appointments_provider_time_idx
  on public.flowtel_external_appointments(provider_id, starts_at, status);

insert into public.flowtel_provider_service_types (
  product_key, service_key, service_name, duration_minutes, is_active
) values (
  'caddie_magic', 'caddie_consultation', 'Caddie Consultation', 45, true
)
on conflict (product_key, service_key) do update
set service_name = excluded.service_name,
    duration_minutes = excluded.duration_minutes,
    is_active = true,
    updated_at = now();

alter table public.flowtel_provider_scheduling_profiles enable row level security;
alter table public.flowtel_provider_service_types enable row level security;
alter table public.flowtel_provider_service_assignments enable row level security;
alter table public.flowtel_provider_weekly_availability enable row level security;
alter table public.flowtel_provider_availability_exceptions enable row level security;
alter table public.flowtel_external_appointments enable row level security;

drop policy if exists "Providers read their scheduling profile" on public.flowtel_provider_scheduling_profiles;
create policy "Providers read their scheduling profile"
  on public.flowtel_provider_scheduling_profiles for select
  using (user_id = auth.uid() or public.flowtel_current_user_is_admin_or_owner());

drop policy if exists "Providers update their scheduling profile" on public.flowtel_provider_scheduling_profiles;
create policy "Providers update their scheduling profile"
  on public.flowtel_provider_scheduling_profiles for update
  using (user_id = auth.uid() or public.flowtel_current_user_is_admin_or_owner())
  with check (user_id = auth.uid() or public.flowtel_current_user_is_admin_or_owner());

drop policy if exists "Authenticated users read service types" on public.flowtel_provider_service_types;
create policy "Authenticated users read service types"
  on public.flowtel_provider_service_types for select
  using (auth.uid() is not null);

drop policy if exists "Providers read service assignments" on public.flowtel_provider_service_assignments;
create policy "Providers read service assignments"
  on public.flowtel_provider_service_assignments for select
  using (
    public.flowtel_current_user_is_admin_or_owner()
    or exists (
      select 1 from public.flowtel_provider_scheduling_profiles p
      where p.id = provider_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "Providers manage weekly availability" on public.flowtel_provider_weekly_availability;
create policy "Providers manage weekly availability"
  on public.flowtel_provider_weekly_availability for all
  using (
    public.flowtel_current_user_is_admin_or_owner()
    or exists (
      select 1 from public.flowtel_provider_scheduling_profiles p
      where p.id = provider_id and p.user_id = auth.uid()
    )
  )
  with check (
    public.flowtel_current_user_is_admin_or_owner()
    or exists (
      select 1 from public.flowtel_provider_scheduling_profiles p
      where p.id = provider_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "Providers manage availability exceptions" on public.flowtel_provider_availability_exceptions;
create policy "Providers manage availability exceptions"
  on public.flowtel_provider_availability_exceptions for all
  using (
    public.flowtel_current_user_is_admin_or_owner()
    or exists (
      select 1 from public.flowtel_provider_scheduling_profiles p
      where p.id = provider_id and p.user_id = auth.uid()
    )
  )
  with check (
    public.flowtel_current_user_is_admin_or_owner()
    or exists (
      select 1 from public.flowtel_provider_scheduling_profiles p
      where p.id = provider_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "Appointment participants read appointments" on public.flowtel_external_appointments;
create policy "Appointment participants read appointments"
  on public.flowtel_external_appointments for select
  using (
    customer_user_id = auth.uid()
    or public.flowtel_current_user_is_admin_or_owner()
    or exists (
      select 1 from public.flowtel_provider_scheduling_profiles p
      where p.id = provider_id and p.user_id = auth.uid()
    )
  );

grant select on public.flowtel_provider_service_types to authenticated;
grant select on public.flowtel_provider_scheduling_profiles to authenticated;
grant select on public.flowtel_provider_service_assignments to authenticated;
grant select, insert, update, delete on public.flowtel_provider_weekly_availability to authenticated;
grant select, insert, update, delete on public.flowtel_provider_availability_exceptions to authenticated;
grant select on public.flowtel_external_appointments to authenticated;

-- ---------------------------------------------------------------------------
-- Controlled golf-course catalog and Caddie-to-course relationships.
-- ---------------------------------------------------------------------------

create table if not exists public.caddie_magic_courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  course_name text not null,
  city text,
  region text,
  country text not null default 'United States',
  status text not null default 'approved' check (status in ('approved','retired')),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.caddie_magic_caddie_courses (
  caddie_profile_id uuid not null references public.caddie_magic_caddie_profiles(id) on delete cascade,
  course_id uuid not null references public.caddie_magic_courses(id) on delete restrict,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (caddie_profile_id, course_id)
);

create table if not exists public.caddie_magic_course_requests (
  id uuid primary key default gen_random_uuid(),
  caddie_profile_id uuid not null references public.caddie_magic_caddie_profiles(id) on delete cascade,
  requested_name text not null,
  normalized_name text not null,
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  approved_course_id uuid references public.caddie_magic_courses(id) on delete set null,
  requested_by uuid not null references auth.users(id) on delete cascade,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists caddie_magic_course_requests_one_pending_idx
  on public.caddie_magic_course_requests(caddie_profile_id, normalized_name)
  where status = 'pending';

insert into public.caddie_magic_courses(slug, course_name, city, region, country, status, approved_at)
values
  ('pebble-beach-golf-links','Pebble Beach Golf Links','Pebble Beach','California','United States','approved',now()),
  ('spyglass-hill-golf-course','Spyglass Hill Golf Course','Pebble Beach','California','United States','approved',now()),
  ('the-links-at-spanish-bay','The Links at Spanish Bay','Pebble Beach','California','United States','approved',now()),
  ('cypress-point-club','Cypress Point Club','Pebble Beach','California','United States','approved',now()),
  ('monterey-peninsula-country-club','Monterey Peninsula Country Club','Pebble Beach','California','United States','approved',now())
on conflict (slug) do update
set course_name = excluded.course_name,
    city = excluded.city,
    region = excluded.region,
    country = excluded.country,
    status = 'approved',
    updated_at = now();

alter table public.caddie_magic_courses enable row level security;
alter table public.caddie_magic_caddie_courses enable row level security;
alter table public.caddie_magic_course_requests enable row level security;

drop policy if exists "Players read approved Caddie Magic courses" on public.caddie_magic_courses;
create policy "Players read approved Caddie Magic courses"
  on public.caddie_magic_courses for select
  using (
    status = 'approved'
    and auth.uid() is not null
    and public.flowtel_current_user_has_product_access('caddie_magic')
  );

drop policy if exists "Caddies read their course links" on public.caddie_magic_caddie_courses;
create policy "Caddies read their course links"
  on public.caddie_magic_caddie_courses for select
  using (
    public.flowtel_current_user_is_admin_or_owner()
    or exists (
      select 1 from public.caddie_magic_caddie_profiles c
      where c.id = caddie_profile_id and c.user_id = auth.uid()
    )
    or (
      public.flowtel_current_user_has_product_access('caddie_magic')
      and exists (
        select 1 from public.caddie_magic_caddie_profiles c
        where c.id = caddie_profile_id and c.status = 'active'
      )
    )
  );

drop policy if exists "Caddies manage their course links" on public.caddie_magic_caddie_courses;
create policy "Caddies manage their course links"
  on public.caddie_magic_caddie_courses for all
  using (
    public.flowtel_current_user_is_admin_or_owner()
    or exists (
      select 1 from public.caddie_magic_caddie_profiles c
      where c.id = caddie_profile_id and c.user_id = auth.uid()
    )
  )
  with check (
    public.flowtel_current_user_is_admin_or_owner()
    or exists (
      select 1 from public.caddie_magic_caddie_profiles c
      where c.id = caddie_profile_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "Caddies read their course requests" on public.caddie_magic_course_requests;
create policy "Caddies read their course requests"
  on public.caddie_magic_course_requests for select
  using (
    public.flowtel_current_user_is_admin_or_owner()
    or requested_by = auth.uid()
  );

grant select on public.caddie_magic_courses to authenticated;
grant select, insert, update, delete on public.caddie_magic_caddie_courses to authenticated;
grant select on public.caddie_magic_course_requests to authenticated;

-- ---------------------------------------------------------------------------
-- Caddie Master VIP messaging and Scorecard Review credit accounting.
-- ---------------------------------------------------------------------------

create table if not exists public.caddie_magic_master_access (
  player_profile_id uuid primary key references public.caddie_magic_player_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  vip_messaging_enabled boolean not null default false,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.caddie_magic_master_access enable row level security;

drop policy if exists "Players read their Caddie Master access" on public.caddie_magic_master_access;
create policy "Players read their Caddie Master access"
  on public.caddie_magic_master_access for select
  using (user_id = auth.uid() or public.flowtel_current_user_is_admin_or_owner());

grant select on public.caddie_magic_master_access to authenticated;

alter table public.caddie_magic_review_requests
  add column if not exists credit_number integer,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references auth.users(id) on delete set null,
  add column if not exists declined_at timestamptz,
  add column if not exists declined_by uuid references auth.users(id) on delete set null,
  add column if not exists resolution_note text;

alter table public.caddie_magic_review_requests
  drop constraint if exists caddie_magic_review_requests_status_check;
alter table public.caddie_magic_review_requests
  add constraint caddie_magic_review_requests_status_check
  check (status in ('requested','completed','cancelled','declined'));

-- Scorecard Review credits must be consumed through the RPC, never by a direct
-- browser insert that bypasses the 28-entry gate. Players retain read access.
drop policy if exists "Players can create their Caddie Magic review requests"
  on public.caddie_magic_review_requests;
revoke insert, update, delete on public.caddie_magic_review_requests from authenticated;
grant select on public.caddie_magic_review_requests to authenticated;

create or replace function public.caddie_magic_get_my_master_access()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_profile public.caddie_magic_player_profiles%rowtype;
  v_total integer := 0;
  v_earned integer := 0;
  v_used integer := 0;
  v_pending integer := 0;
  v_vip boolean := false;
begin
  perform public.caddie_magic_require_product_access();
  select * into v_profile
  from public.caddie_magic_player_profiles
  where user_id = auth.uid()
  limit 1;
  if v_profile.id is null then
    return jsonb_build_object(
      'total_entries',0,'earned_review_credits',0,'used_review_credits',0,
      'available_review_credits',0,'entries_toward_next_credit',0,
      'entries_needed_for_next_credit',28,'pending_review',false,
      'vip_messaging_enabled',false
    );
  end if;

  select count(*)::integer into v_total
  from public.caddie_magic_round_logs
  where player_profile_id = v_profile.id;
  v_earned := floor(v_total / 28.0)::integer;

  select count(*)::integer into v_used
  from public.caddie_magic_review_requests
  where player_profile_id = v_profile.id
    and status in ('requested','completed');
  select count(*)::integer into v_pending
  from public.caddie_magic_review_requests
  where player_profile_id = v_profile.id and status = 'requested';
  select coalesce(a.vip_messaging_enabled,false) into v_vip
  from public.caddie_magic_master_access a
  where a.player_profile_id = v_profile.id;

  return jsonb_build_object(
    'player_profile_id',v_profile.id,
    'total_entries',v_total,
    'earned_review_credits',v_earned,
    'used_review_credits',v_used,
    'available_review_credits',greatest(0,v_earned-v_used),
    'entries_toward_next_credit',mod(v_total,28),
    'entries_needed_for_next_credit',case when mod(v_total,28)=0 and v_total>0 then 28 else 28-mod(v_total,28) end,
    'pending_review',v_pending>0,
    'vip_messaging_enabled',coalesce(v_vip,false)
  );
end;
$$;

create or replace function public.caddie_magic_request_score_review()
returns public.caddie_magic_review_requests
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile public.caddie_magic_player_profiles%rowtype;
  v_request public.caddie_magic_review_requests%rowtype;
  v_total integer;
  v_earned integer;
  v_used integer;
begin
  perform public.caddie_magic_require_product_access();
  if auth.uid() is null then
    raise exception 'You must be signed in to request a Scorecard Review.' using errcode = '28000';
  end if;

  select * into v_profile
  from public.caddie_magic_player_profiles
  where user_id = auth.uid()
  limit 1;
  if v_profile.id is null then
    raise exception 'Create your Player Profile before requesting a Scorecard Review.' using errcode = '22023';
  end if;

  select * into v_request
  from public.caddie_magic_review_requests
  where player_profile_id = v_profile.id and status = 'requested'
  order by requested_at desc limit 1;
  if v_request.id is not null then return v_request; end if;

  select count(*)::integer into v_total
  from public.caddie_magic_round_logs
  where player_profile_id = v_profile.id;
  v_earned := floor(v_total / 28.0)::integer;
  select count(*)::integer into v_used
  from public.caddie_magic_review_requests
  where player_profile_id = v_profile.id and status in ('requested','completed');

  if v_earned - v_used < 1 then
    raise exception 'Log 28 entries to earn each Scorecard Review credit. You currently have % of 28 toward your next credit.', mod(v_total,28)
      using errcode = '22023';
  end if;

  insert into public.caddie_magic_review_requests(
    player_profile_id,user_id,status,requested_at,credit_number
  ) values (
    v_profile.id,auth.uid(),'requested',now(),v_used+1
  ) returning * into v_request;
  return v_request;
exception when unique_violation then
  select * into v_request
  from public.caddie_magic_review_requests
  where player_profile_id = v_profile.id and status = 'requested'
  order by requested_at desc limit 1;
  return v_request;
end;
$$;

create or replace function public.caddie_magic_close_score_review(
  p_request_id uuid,
  p_status text,
  p_note text default null
)
returns public.caddie_magic_review_requests
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_status text := lower(btrim(coalesce(p_status,'')));
  v_request public.caddie_magic_review_requests%rowtype;
begin
  if not public.flowtel_current_user_is_admin_or_owner() then
    raise exception 'Only the Caddie Master can close a Scorecard Review request.' using errcode = '42501';
  end if;
  if v_status not in ('cancelled','declined') then
    raise exception 'Choose cancelled or declined.' using errcode = '22023';
  end if;
  update public.caddie_magic_review_requests
  set status = v_status,
      cancelled_at = case when v_status='cancelled' then now() else cancelled_at end,
      cancelled_by = case when v_status='cancelled' then auth.uid() else cancelled_by end,
      declined_at = case when v_status='declined' then now() else declined_at end,
      declined_by = case when v_status='declined' then auth.uid() else declined_by end,
      resolution_note = nullif(btrim(coalesce(p_note,'')), '')
  where id = p_request_id and status = 'requested'
  returning * into v_request;
  if v_request.id is null then
    raise exception 'That open Scorecard Review request could not be found.' using errcode = '22023';
  end if;
  return v_request;
end;
$$;

create or replace function public.caddie_magic_set_vip_messaging(
  p_player_profile_id uuid,
  p_enabled boolean
)
returns public.caddie_magic_master_access
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_player public.caddie_magic_player_profiles%rowtype;
  v_access public.caddie_magic_master_access%rowtype;
begin
  if not public.flowtel_current_user_is_admin_or_owner() then
    raise exception 'Only the Caddie Master can grant VIP messaging.' using errcode = '42501';
  end if;
  select * into v_player from public.caddie_magic_player_profiles where id = p_player_profile_id;
  if v_player.id is null then
    raise exception 'Choose an active Caddie Magic Player.' using errcode = '22023';
  end if;
  insert into public.caddie_magic_master_access(
    player_profile_id,user_id,vip_messaging_enabled,
    granted_by,granted_at,revoked_by,revoked_at
  ) values (
    v_player.id,v_player.user_id,coalesce(p_enabled,false),
    case when p_enabled then auth.uid() else null end,
    case when p_enabled then now() else null end,
    case when not p_enabled then auth.uid() else null end,
    case when not p_enabled then now() else null end
  )
  on conflict (player_profile_id) do update
  set vip_messaging_enabled = excluded.vip_messaging_enabled,
      granted_by = case when excluded.vip_messaging_enabled then auth.uid() else caddie_magic_master_access.granted_by end,
      granted_at = case when excluded.vip_messaging_enabled then now() else caddie_magic_master_access.granted_at end,
      revoked_by = case when not excluded.vip_messaging_enabled then auth.uid() else null end,
      revoked_at = case when not excluded.vip_messaging_enabled then now() else null end,
      updated_at = now()
  returning * into v_access;
  return v_access;
end;
$$;

create or replace function public.caddie_magic_list_master_access()
returns table (
  player_profile_id uuid,
  vip_messaging_enabled boolean,
  granted_at timestamptz,
  revoked_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.flowtel_current_user_is_admin_or_owner() then
    raise exception 'Only the Caddie Master may view VIP messaging access.' using errcode = '42501';
  end if;
  return query
  select p.id,coalesce(a.vip_messaging_enabled,false),a.granted_at,a.revoked_at
  from public.caddie_magic_player_profiles p
  left join public.caddie_magic_master_access a on a.player_profile_id=p.id;
end;
$$;

create or replace function public.caddie_magic_send_compass_dispatch(
  p_player_profile_id uuid,
  p_assignment_id uuid,
  p_message text
)
returns public.caddie_magic_compass_dispatches
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_dispatch public.caddie_magic_compass_dispatches%rowtype;
  v_message text := nullif(btrim(coalesce(p_message, '')), '');
  v_sender_role text;
  v_is_owner boolean := public.flowtel_current_user_is_admin_or_owner();
begin
  perform public.caddie_magic_require_product_access();
  if auth.uid() is null then
    raise exception 'You must be signed in to message the Caddie Master.' using errcode = '28000';
  end if;
  if v_message is null then
    raise exception 'Write a message before sending it.' using errcode = '22023';
  end if;

  if v_is_owner then
    v_sender_role := 'caddie';
  elsif exists (
    select 1
    from public.caddie_magic_player_profiles p
    join public.caddie_magic_master_access a on a.player_profile_id=p.id
    where p.id=p_player_profile_id
      and p.user_id=auth.uid()
      and a.vip_messaging_enabled=true
  ) then
    v_sender_role := 'player';
  else
    raise exception 'VIP Caddie Master messaging has not been opened for this Player.' using errcode = '42501';
  end if;

  if p_assignment_id is not null and not exists (
    select 1 from public.caddie_magic_compass_assignments a
    where a.id=p_assignment_id and a.player_profile_id=p_player_profile_id
  ) then
    raise exception 'That assignment does not belong to this Player.' using errcode = '22023';
  end if;

  insert into public.caddie_magic_compass_dispatches(
    player_profile_id,assignment_id,sender_user_id,sender_role,message_body
  ) values (
    p_player_profile_id,p_assignment_id,auth.uid(),v_sender_role,v_message
  ) returning * into v_dispatch;
  return v_dispatch;
end;
$$;

-- ---------------------------------------------------------------------------
-- Caddie profile simplification and course helpers.
-- Removed fields remain stored historically but are no longer changed by the UI.
-- ---------------------------------------------------------------------------

create or replace function public.caddie_magic_save_my_caddie_profile(
  p_display_name text,
  p_professional_title text default null,
  p_profile_photo_url text default null,
  p_years_experience integer default null,
  p_courses_served text default null,
  p_pebble_beach_experience text default null,
  p_city text default null,
  p_timezone text default 'America/Los_Angeles',
  p_philosophy text default null,
  p_consultation_method text default null,
  p_consultation_duration_minutes integer default 45,
  p_meeting_link text default null,
  p_submit boolean default false
)
returns public.caddie_magic_caddie_profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_caddie public.caddie_magic_caddie_profiles%rowtype;
  v_display text := nullif(btrim(coalesce(p_display_name,'')), '');
  v_next_status text;
begin
  perform public.caddie_magic_require_product_access();
  if v_display is null then
    raise exception 'Add your professional display name.' using errcode = '22023';
  end if;
  select * into v_caddie
  from public.caddie_magic_caddie_profiles
  where user_id=auth.uid() for update;
  if v_caddie.id is null then
    raise exception 'Your Player account has not been invited into the Caddie Network.' using errcode = '42501';
  end if;
  v_next_status := case
    when v_caddie.status in ('active','approved','paused','submitted') then v_caddie.status
    when coalesce(p_submit,false) then 'submitted'
    else 'draft'
  end;
  update public.caddie_magic_caddie_profiles
  set display_name=v_display,
      professional_title=nullif(btrim(coalesce(p_professional_title,'')),''),
      city=nullif(btrim(coalesce(p_city,'')),''),
      timezone=coalesce(nullif(btrim(coalesce(p_timezone,'')),''),'America/Los_Angeles'),
      consultation_duration_minutes=45,
      status=v_next_status,
      submitted_at=case when v_next_status='submitted' then now() else submitted_at end
  where id=v_caddie.id
  returning * into v_caddie;
  return v_caddie;
end;
$$;

create or replace function public.caddie_magic_list_course_catalog()
returns table (course_id uuid, course_name text, city text, region text, country text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.caddie_magic_require_product_access();
  return query
  select c.id,c.course_name,c.city,c.region,c.country
  from public.caddie_magic_courses c
  where c.status='approved'
  order by c.course_name;
end;
$$;

create or replace function public.caddie_magic_get_my_course_settings()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare v_caddie public.caddie_magic_caddie_profiles%rowtype;
begin
  perform public.caddie_magic_require_product_access();
  select * into v_caddie from public.caddie_magic_caddie_profiles where user_id=auth.uid();
  if v_caddie.id is null then return jsonb_build_object('selected','[]'::jsonb,'pending','[]'::jsonb); end if;
  return jsonb_build_object(
    'selected',coalesce((
      select jsonb_agg(jsonb_build_object('course_id',c.id,'course_name',c.course_name) order by c.course_name)
      from public.caddie_magic_caddie_courses cc
      join public.caddie_magic_courses c on c.id=cc.course_id
      where cc.caddie_profile_id=v_caddie.id and c.status='approved'
    ),'[]'::jsonb),
    'pending',coalesce((
      select jsonb_agg(jsonb_build_object('request_id',r.id,'requested_name',r.requested_name,'status',r.status) order by r.created_at desc)
      from public.caddie_magic_course_requests r
      where r.caddie_profile_id=v_caddie.id and r.status='pending'
    ),'[]'::jsonb)
  );
end;
$$;

create or replace function public.caddie_magic_save_my_courses(p_course_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_caddie public.caddie_magic_caddie_profiles%rowtype;
begin
  perform public.caddie_magic_require_product_access();
  select * into v_caddie from public.caddie_magic_caddie_profiles where user_id=auth.uid();
  if v_caddie.id is null then raise exception 'Open your Caddie Profile first.' using errcode='42501'; end if;
  delete from public.caddie_magic_caddie_courses where caddie_profile_id=v_caddie.id;
  insert into public.caddie_magic_caddie_courses(caddie_profile_id,course_id)
  select v_caddie.id,c.id
  from public.caddie_magic_courses c
  where c.status='approved' and c.id=any(coalesce(p_course_ids,'{}'::uuid[]));
  update public.caddie_magic_caddie_profiles cp
  set courses_served=(
    select string_agg(c.course_name,', ' order by c.course_name)
    from public.caddie_magic_caddie_courses cc
    join public.caddie_magic_courses c on c.id=cc.course_id
    where cc.caddie_profile_id=v_caddie.id
  )
  where cp.id=v_caddie.id;
  return public.caddie_magic_get_my_course_settings();
end;
$$;

create or replace function public.caddie_magic_request_course(p_course_name text)
returns public.caddie_magic_course_requests
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_caddie public.caddie_magic_caddie_profiles%rowtype;
  v_name text := nullif(btrim(coalesce(p_course_name,'')),'');
  v_normalized text;
  v_request public.caddie_magic_course_requests%rowtype;
begin
  perform public.caddie_magic_require_product_access();
  if v_name is null then raise exception 'Enter the course you want to request.' using errcode='22023'; end if;
  v_normalized := lower(regexp_replace(v_name,'[^a-zA-Z0-9]+','','g'));
  select * into v_caddie from public.caddie_magic_caddie_profiles where user_id=auth.uid();
  if v_caddie.id is null then raise exception 'Open your Caddie Profile first.' using errcode='42501'; end if;
  if exists (
    select 1 from public.caddie_magic_courses c
    where lower(regexp_replace(c.course_name,'[^a-zA-Z0-9]+','','g'))=v_normalized and c.status='approved'
  ) then
    raise exception 'That course is already available in the approved list.' using errcode='22023';
  end if;
  insert into public.caddie_magic_course_requests(
    caddie_profile_id,requested_name,normalized_name,requested_by
  ) values (v_caddie.id,v_name,v_normalized,auth.uid())
  on conflict (caddie_profile_id,normalized_name) where status='pending'
  do update set requested_name=excluded.requested_name,updated_at=now()
  returning * into v_request;
  return v_request;
end;
$$;

create or replace function public.caddie_magic_list_course_requests()
returns table (
  request_id uuid,caddie_profile_id uuid,caddie_name text,
  requested_name text,status text,created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.flowtel_current_user_is_admin_or_owner() then
    raise exception 'Only the Caddie Master may review course requests.' using errcode='42501';
  end if;
  return query
  select r.id,r.caddie_profile_id,c.display_name,r.requested_name,r.status,r.created_at
  from public.caddie_magic_course_requests r
  join public.caddie_magic_caddie_profiles c on c.id=r.caddie_profile_id
  order by case when r.status='pending' then 0 else 1 end,r.created_at desc;
end;
$$;

create or replace function public.caddie_magic_review_course_request(
  p_request_id uuid,p_decision text
)
returns public.caddie_magic_course_requests
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_decision text:=lower(btrim(coalesce(p_decision,'')));
  v_request public.caddie_magic_course_requests%rowtype;
  v_course public.caddie_magic_courses%rowtype;
  v_slug text;
begin
  if not public.flowtel_current_user_is_admin_or_owner() then
    raise exception 'Only the Caddie Master may review course requests.' using errcode='42501';
  end if;
  if v_decision not in ('approved','declined') then raise exception 'Choose approved or declined.' using errcode='22023'; end if;
  select * into v_request from public.caddie_magic_course_requests where id=p_request_id and status='pending' for update;
  if v_request.id is null then raise exception 'That pending course request could not be found.' using errcode='22023'; end if;
  if v_decision='approved' then
    v_slug:=trim(both '-' from lower(regexp_replace(v_request.requested_name,'[^a-zA-Z0-9]+','-','g')));
    insert into public.caddie_magic_courses(slug,course_name,status,approved_by,approved_at)
    values(v_slug,v_request.requested_name,'approved',auth.uid(),now())
    on conflict (slug) do update set status='approved',approved_by=auth.uid(),approved_at=now(),updated_at=now()
    returning * into v_course;
    insert into public.caddie_magic_caddie_courses(caddie_profile_id,course_id)
    values(v_request.caddie_profile_id,v_course.id) on conflict do nothing;
    update public.caddie_magic_course_requests
    set status='approved',approved_course_id=v_course.id,reviewed_by=auth.uid(),reviewed_at=now()
    where id=v_request.id returning * into v_request;
  else
    update public.caddie_magic_course_requests
    set status='declined',reviewed_by=auth.uid(),reviewed_at=now()
    where id=v_request.id returning * into v_request;
  end if;
  return v_request;
end;
$$;

-- Keep the existing directory function signature while sourcing course names
-- from the controlled catalog and fixing the consultation duration at 45 minutes.
create or replace function public.caddie_magic_list_available_caddies()
returns table (
  caddie_profile_id uuid,
  display_name text,
  professional_title text,
  profile_photo_url text,
  years_experience integer,
  courses_served text,
  pebble_beach_experience text,
  city text,
  timezone text,
  philosophy text,
  consultation_method text,
  consultation_duration_minutes integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.caddie_magic_require_product_access();
  if auth.uid() is null then raise exception 'Sign in to browse the Caddie Network.' using errcode='28000'; end if;
  return query
  select c.id,c.display_name,c.professional_title,null::text,
    null::integer,
    (
      select string_agg(course.course_name,', ' order by course.course_name)
      from public.caddie_magic_caddie_courses cc
      join public.caddie_magic_courses course on course.id=cc.course_id
      where cc.caddie_profile_id=c.id and course.status='approved'
    ),
    null::text,c.city,c.timezone,null::text,
    'Acuity + Zoom details are arranged after acceptance'::text,45
  from public.caddie_magic_caddie_profiles c
  where c.status='active' and c.accepting_requests=true
  order by c.display_name;
end;
$$;

-- ---------------------------------------------------------------------------
-- Caddie recurring availability and date exceptions.
-- Call slots are materialized eight weeks ahead for the existing accepted-only
-- booking flow. Acuity IDs remain empty until the external integration release.
-- ---------------------------------------------------------------------------

alter table public.caddie_magic_caddie_availability_slots
  add column if not exists source text not null default 'manual'
    check (source in ('manual','weekly_template','acuity')),
  add column if not exists source_date date,
  add column if not exists daypart text
    check (daypart is null or daypart in ('morning','afternoon','evening'));

create index if not exists caddie_magic_availability_source_idx
  on public.caddie_magic_caddie_availability_slots(caddie_profile_id,source,starts_at,status);

create or replace function public.caddie_magic_ensure_my_scheduling_profile()
returns public.flowtel_provider_scheduling_profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_caddie public.caddie_magic_caddie_profiles%rowtype;
  v_provider public.flowtel_provider_scheduling_profiles%rowtype;
  v_service public.flowtel_provider_service_types%rowtype;
begin
  perform public.caddie_magic_require_product_access();
  select * into v_caddie from public.caddie_magic_caddie_profiles where user_id=auth.uid();
  if v_caddie.id is null then raise exception 'Your Player account has not been invited into the Caddie Network.' using errcode='42501'; end if;
  insert into public.flowtel_provider_scheduling_profiles(
    user_id,product_key,provider_kind,source_profile_id,display_name,timezone,is_active
  ) values (
    auth.uid(),'caddie_magic','caddie',v_caddie.id,v_caddie.display_name,
    coalesce(nullif(v_caddie.timezone,''),'America/Los_Angeles'),v_caddie.status in ('approved','active')
  )
  on conflict (product_key,provider_kind,source_profile_id) do update
  set user_id=excluded.user_id,display_name=excluded.display_name,timezone=excluded.timezone,
      is_active=excluded.is_active,updated_at=now()
  returning * into v_provider;
  select * into v_service from public.flowtel_provider_service_types
  where product_key='caddie_magic' and service_key='caddie_consultation';
  insert into public.flowtel_provider_service_assignments(provider_id,service_type_id,is_enabled)
  values(v_provider.id,v_service.id,true) on conflict do nothing;
  return v_provider;
end;
$$;

create or replace function public.caddie_magic_refresh_consultation_slots(p_caddie_profile_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_caddie public.caddie_magic_caddie_profiles%rowtype;
  v_provider public.flowtel_provider_scheduling_profiles%rowtype;
  v_date date;
  v_avail record;
  v_hour integer;
  v_start timestamptz;
  v_inserted integer:=0;
  v_timezone text;
begin
  select * into v_caddie from public.caddie_magic_caddie_profiles where id=p_caddie_profile_id;
  if v_caddie.id is null then return 0; end if;
  if not (v_caddie.user_id=auth.uid() or public.flowtel_current_user_is_admin_or_owner()) then
    raise exception 'That Caddie schedule is private.' using errcode='42501';
  end if;
  select * into v_provider from public.flowtel_provider_scheduling_profiles
  where product_key='caddie_magic' and provider_kind='caddie' and source_profile_id=v_caddie.id;
  if v_provider.id is null then return 0; end if;
  v_timezone:=coalesce(nullif(v_provider.timezone,''),'America/Los_Angeles');

  delete from public.caddie_magic_caddie_availability_slots
  where caddie_profile_id=v_caddie.id
    and source='weekly_template'
    and status='available'
    and starts_at>now();

  for v_date in
    select generate_series(
      (timezone('America/Los_Angeles',now()))::date,
      (timezone('America/Los_Angeles',now()))::date+55,
      interval '1 day'
    )::date
  loop
    for v_avail in
      select * from public.flowtel_provider_weekly_availability a
      where a.provider_id=v_provider.id
        and a.weekday=extract(dow from v_date)::integer
        and a.available_for_calls=true
    loop
      if exists (
        select 1 from public.flowtel_provider_availability_exceptions e
        where e.provider_id=v_provider.id and e.block_calls=true
          and v_date between e.starts_on and e.ends_on
      ) then continue; end if;

      for v_hour in
        select unnest(case v_avail.daypart
          when 'morning' then array[9,10,11]
          when 'afternoon' then array[13,14,15]
          else array[17,18,19]
        end)
      loop
        v_start:=((v_date::text||' '||lpad(v_hour::text,2,'0')||':00:00')::timestamp at time zone v_timezone);
        if v_start<=now() then continue; end if;
        if exists (
          select 1 from public.caddie_magic_caddie_availability_slots s
          where s.caddie_profile_id=v_caddie.id and s.starts_at=v_start
            and s.status in ('available','booked')
        ) then continue; end if;
        insert into public.caddie_magic_caddie_availability_slots(
          caddie_profile_id,starts_at,ends_at,status,source,source_date,daypart
        ) values (
          v_caddie.id,v_start,v_start+interval '45 minutes','available','weekly_template',v_date,v_avail.daypart
        );
        v_inserted:=v_inserted+1;
      end loop;
    end loop;
  end loop;
  return v_inserted;
end;
$$;

-- Cancellation reopens a future template slot only when it remains eligible.
-- Refreshing after release removes blocked/retired template slots and rematerializes
-- only the weekly call times that are still valid. Manual historical slots remain intact.
create or replace function public.caddie_magic_cancel_consultation(p_consultation_id uuid)
returns public.caddie_magic_consultations
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_consultation public.caddie_magic_consultations%rowtype;
begin
  perform public.caddie_magic_require_product_access();
  select * into v_consultation from public.caddie_magic_consultations co
  where co.id = p_consultation_id and co.status = 'scheduled'
    and (
      public.flowtel_current_user_is_admin_or_owner()
      or exists (select 1 from public.caddie_magic_player_profiles p where p.id = co.player_profile_id and p.user_id = auth.uid())
      or exists (select 1 from public.caddie_magic_caddie_profiles c where c.id = co.caddie_profile_id and c.user_id = auth.uid())
    )
  for update;
  if v_consultation.id is null then
    raise exception 'That consultation could not be cancelled.' using errcode = '42501';
  end if;
  update public.caddie_magic_consultations
  set status = 'cancelled', cancelled_by = auth.uid(), cancelled_at = now()
  where id = v_consultation.id returning * into v_consultation;
  if v_consultation.availability_slot_id is not null and v_consultation.starts_at > now() then
    update public.caddie_magic_caddie_availability_slots
    set status = 'available'
    where id = v_consultation.availability_slot_id and status = 'booked';
    perform public.caddie_magic_refresh_consultation_slots(v_consultation.caddie_profile_id);
  end if;
  return v_consultation;
end;
$$;

create or replace function public.caddie_magic_cancel_my_caddie_request(p_request_id uuid)
returns public.caddie_magic_caddie_requests
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_request public.caddie_magic_caddie_requests%rowtype;
begin
  perform public.caddie_magic_require_product_access();
  update public.caddie_magic_caddie_requests r
  set status = case when r.status = 'accepted' then 'ended' else 'cancelled' end,
      ended_at = now()
  where r.id = p_request_id
    and r.status in ('requested','accepted')
    and exists (
      select 1 from public.caddie_magic_player_profiles p
      where p.id = r.player_profile_id and p.user_id = auth.uid()
    )
  returning * into v_request;
  if v_request.id is null then
    raise exception 'That Caddie request could not be cancelled.' using errcode = '42501';
  end if;

  with cancelled_consultations as (
    update public.caddie_magic_consultations co
    set status = 'cancelled', cancelled_by = auth.uid(), cancelled_at = now()
    where co.request_id = v_request.id and co.status = 'scheduled'
    returning co.availability_slot_id, co.starts_at
  )
  update public.caddie_magic_caddie_availability_slots s
  set status = 'available'
  from cancelled_consultations cancelled
  where s.id = cancelled.availability_slot_id
    and cancelled.starts_at > now()
    and s.status = 'booked';

  perform public.caddie_magic_refresh_consultation_slots(v_request.caddie_profile_id);
  return v_request;
end;
$$;

create or replace function public.caddie_magic_get_my_schedule()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_provider public.flowtel_provider_scheduling_profiles%rowtype;
  v_caddie public.caddie_magic_caddie_profiles%rowtype;
begin
  v_provider:=public.caddie_magic_ensure_my_scheduling_profile();
  select * into v_caddie from public.caddie_magic_caddie_profiles where id=v_provider.source_profile_id;
  return jsonb_build_object(
    'provider_id',v_provider.id,
    'timezone',v_provider.timezone,
    'service',jsonb_build_object('service_key','caddie_consultation','service_name','Caddie Consultation','duration_minutes',45),
    'weekly',coalesce((
      select jsonb_agg(jsonb_build_object(
        'weekday',a.weekday,'daypart',a.daypart,
        'calls',a.available_for_calls,'caddying',a.available_for_in_person
      ) order by a.weekday,a.daypart)
      from public.flowtel_provider_weekly_availability a where a.provider_id=v_provider.id
    ),'[]'::jsonb),
    'exceptions',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',e.id,'starts_on',e.starts_on,'ends_on',e.ends_on,
        'block_calls',e.block_calls,'block_caddying',e.block_in_person,'note',e.note
      ) order by e.starts_on,e.created_at)
      from public.flowtel_provider_availability_exceptions e
      where e.provider_id=v_provider.id and e.ends_on>=(timezone('America/Los_Angeles',now()))::date
    ),'[]'::jsonb),
    'acuity',jsonb_build_object(
      'calendar_id',v_provider.acuity_calendar_id,
      'integration_status',v_provider.integration_status,
      'zoom_host_email',v_provider.zoom_host_email
    ),
    'accepting_requests',v_caddie.accepting_requests
  );
end;
$$;

create or replace function public.caddie_magic_save_my_weekly_schedule(p_schedule jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_provider public.flowtel_provider_scheduling_profiles%rowtype;
  v_item jsonb;
  v_weekday integer;
  v_daypart text;
begin
  v_provider:=public.caddie_magic_ensure_my_scheduling_profile();
  if jsonb_typeof(coalesce(p_schedule,'[]'::jsonb))<>'array' then
    raise exception 'The weekly schedule must be an array.' using errcode='22023';
  end if;
  delete from public.flowtel_provider_weekly_availability where provider_id=v_provider.id;
  for v_item in select * from jsonb_array_elements(coalesce(p_schedule,'[]'::jsonb))
  loop
    v_weekday:=(v_item->>'weekday')::integer;
    v_daypart:=lower(v_item->>'daypart');
    if v_weekday < 0 or v_weekday > 6 or v_daypart not in ('morning','afternoon','evening') then
      raise exception 'Every availability row needs a valid weekday and daypart.' using errcode='22023';
    end if;
    insert into public.flowtel_provider_weekly_availability(
      provider_id,weekday,daypart,available_for_calls,available_for_in_person
    ) values (
      v_provider.id,v_weekday,v_daypart,
      coalesce((v_item->>'calls')::boolean,false),
      coalesce((v_item->>'caddying')::boolean,false)
    );
  end loop;
  perform public.caddie_magic_refresh_consultation_slots(v_provider.source_profile_id);
  return public.caddie_magic_get_my_schedule();
end;
$$;

create or replace function public.caddie_magic_add_my_schedule_exception(
  p_starts_on date,p_ends_on date,p_block_calls boolean,p_block_caddying boolean,p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_provider public.flowtel_provider_scheduling_profiles%rowtype;
begin
  v_provider:=public.caddie_magic_ensure_my_scheduling_profile();
  if p_starts_on is null or p_ends_on is null or p_ends_on<p_starts_on then
    raise exception 'Choose a valid date or date range.' using errcode='22023';
  end if;
  if not coalesce(p_block_calls,false) and not coalesce(p_block_caddying,false) then
    raise exception 'Choose Calls, Caddying, or both.' using errcode='22023';
  end if;
  insert into public.flowtel_provider_availability_exceptions(
    provider_id,starts_on,ends_on,block_calls,block_in_person,note
  ) values (
    v_provider.id,p_starts_on,p_ends_on,coalesce(p_block_calls,false),coalesce(p_block_caddying,false),
    nullif(btrim(coalesce(p_note,'')),'')
  );
  perform public.caddie_magic_refresh_consultation_slots(v_provider.source_profile_id);
  return public.caddie_magic_get_my_schedule();
end;
$$;

create or replace function public.caddie_magic_remove_my_schedule_exception(p_exception_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_provider public.flowtel_provider_scheduling_profiles%rowtype;
begin
  v_provider:=public.caddie_magic_ensure_my_scheduling_profile();
  delete from public.flowtel_provider_availability_exceptions
  where id=p_exception_id and provider_id=v_provider.id;
  perform public.caddie_magic_refresh_consultation_slots(v_provider.source_profile_id);
  return public.caddie_magic_get_my_schedule();
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants for new RPCs.
-- ---------------------------------------------------------------------------

revoke all on function public.caddie_magic_request_score_review() from public;
revoke all on function public.caddie_magic_send_compass_dispatch(uuid,uuid,text) from public;
revoke all on function public.caddie_magic_save_my_caddie_profile(text,text,text,integer,text,text,text,text,text,text,integer,text,boolean) from public;
revoke all on function public.caddie_magic_list_available_caddies() from public;
revoke all on function public.caddie_magic_refresh_consultation_slots(uuid) from public;
revoke all on function public.caddie_magic_cancel_consultation(uuid) from public;
revoke all on function public.caddie_magic_cancel_my_caddie_request(uuid) from public;
revoke all on function public.caddie_magic_get_my_master_access() from public;
revoke all on function public.caddie_magic_close_score_review(uuid,text,text) from public;
revoke all on function public.caddie_magic_set_vip_messaging(uuid,boolean) from public;
revoke all on function public.caddie_magic_list_master_access() from public;
revoke all on function public.caddie_magic_list_course_catalog() from public;
revoke all on function public.caddie_magic_get_my_course_settings() from public;
revoke all on function public.caddie_magic_save_my_courses(uuid[]) from public;
revoke all on function public.caddie_magic_request_course(text) from public;
revoke all on function public.caddie_magic_list_course_requests() from public;
revoke all on function public.caddie_magic_review_course_request(uuid,text) from public;
revoke all on function public.caddie_magic_ensure_my_scheduling_profile() from public;
revoke all on function public.caddie_magic_get_my_schedule() from public;
revoke all on function public.caddie_magic_save_my_weekly_schedule(jsonb) from public;
revoke all on function public.caddie_magic_add_my_schedule_exception(date,date,boolean,boolean,text) from public;
revoke all on function public.caddie_magic_remove_my_schedule_exception(uuid) from public;

grant execute on function public.caddie_magic_request_score_review() to authenticated;
grant execute on function public.caddie_magic_send_compass_dispatch(uuid,uuid,text) to authenticated;
grant execute on function public.caddie_magic_save_my_caddie_profile(text,text,text,integer,text,text,text,text,text,text,integer,text,boolean) to authenticated;
grant execute on function public.caddie_magic_list_available_caddies() to authenticated;
grant execute on function public.caddie_magic_refresh_consultation_slots(uuid) to authenticated;
grant execute on function public.caddie_magic_cancel_consultation(uuid) to authenticated;
grant execute on function public.caddie_magic_cancel_my_caddie_request(uuid) to authenticated;
grant execute on function public.caddie_magic_get_my_master_access() to authenticated;
grant execute on function public.caddie_magic_close_score_review(uuid,text,text) to authenticated;
grant execute on function public.caddie_magic_set_vip_messaging(uuid,boolean) to authenticated;
grant execute on function public.caddie_magic_list_master_access() to authenticated;
grant execute on function public.caddie_magic_list_course_catalog() to authenticated;
grant execute on function public.caddie_magic_get_my_course_settings() to authenticated;
grant execute on function public.caddie_magic_save_my_courses(uuid[]) to authenticated;
grant execute on function public.caddie_magic_request_course(text) to authenticated;
grant execute on function public.caddie_magic_list_course_requests() to authenticated;
grant execute on function public.caddie_magic_review_course_request(uuid,text) to authenticated;
grant execute on function public.caddie_magic_ensure_my_scheduling_profile() to authenticated;
grant execute on function public.caddie_magic_get_my_schedule() to authenticated;
grant execute on function public.caddie_magic_save_my_weekly_schedule(jsonb) to authenticated;
grant execute on function public.caddie_magic_add_my_schedule_exception(date,date,boolean,boolean,text) to authenticated;
grant execute on function public.caddie_magic_remove_my_schedule_exception(uuid) to authenticated;

comment on table public.flowtel_provider_scheduling_profiles is
  'Shared scheduling identity for Flowtel Practitioners and Caddie Magic Caddies. Product and role boundaries remain separate.';
comment on table public.flowtel_provider_weekly_availability is
  'Simple recurring Morning/Afternoon/Evening availability for calls and in-person service.';
comment on table public.flowtel_provider_availability_exceptions is
  'Date or date-range blocks that override a provider recurring schedule.';
comment on table public.caddie_magic_master_access is
  'Owner-controlled VIP access to private two-way messaging with the Caddie Master.';
comment on table public.caddie_magic_course_requests is
  'Private Caddie course proposals. Pending requests appear in private profile preview but never in player discovery until approved.';
