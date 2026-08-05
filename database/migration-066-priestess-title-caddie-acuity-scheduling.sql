-- Flowtel v0.10.81.3 / Caddie Magic v0.6.0
-- Editable Priestess Titles + Caddie Magic Acuity Scheduling Foundation
--
-- Additive only. Migration 037 remains retired. Never rerun or rename either migration 052 file.

create extension if not exists pgcrypto with schema extensions;

-- Caddie Master is a distinct provider capability. Every Caddie remains a Player first.
alter table public.flowtel_provider_scheduling_profiles
  drop constraint if exists flowtel_provider_scheduling_profiles_provider_kind_check;
alter table public.flowtel_provider_scheduling_profiles
  add constraint flowtel_provider_scheduling_profiles_provider_kind_check
  check (provider_kind in ('practitioner','caddie','caddie_master'));

alter table public.flowtel_provider_service_types
  add column if not exists payment_mode text not null default 'manual'
    check (payment_mode in ('included','complimentary','manual','acuity','package_credit')),
  add column if not exists price_cents integer
    check (price_cents is null or price_cents >= 0),
  add column if not exists booking_copy text;

insert into public.flowtel_provider_service_types (
  product_key,service_key,service_name,duration_minutes,is_active,
  eligibility_period,access_days_after,is_complimentary,payment_mode,booking_copy
) values
  ('caddie_magic','caddie_master_session','Session with Megan',45,true,'none',7,false,'manual','Schedule a private Caddie Magic session with The Caddie Master.'),
  ('caddie_magic','paired_caddie_session','Session with My Caddie',45,true,'none',7,false,'manual','Schedule a private session with your accepted Caddie.')
on conflict (product_key,service_key) do update
set service_name=excluded.service_name,
    duration_minutes=excluded.duration_minutes,
    is_active=true,
    access_days_after=excluded.access_days_after,
    payment_mode=coalesce(public.flowtel_provider_service_types.payment_mode,excluded.payment_mode),
    booking_copy=excluded.booking_copy,
    updated_at=now();

create table if not exists public.caddie_magic_appointment_access_grants (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.flowtel_external_appointments(id) on delete cascade,
  player_profile_id uuid not null references public.caddie_magic_player_profiles(id) on delete cascade,
  provider_user_id uuid not null references auth.users(id) on delete cascade,
  service_key text not null,
  source_relationship_id uuid references public.caddie_magic_caddie_requests(id) on delete set null,
  consent_language text not null,
  consent_granted_at timestamptz not null default now(),
  access_scope text not null default 'player_profile_scorecard_score_map_compass_upcoming_golf',
  active_from timestamptz not null default now(),
  active_until timestamptz not null,
  status text not null default 'active' check (status in ('active','revoked','expired')),
  revoked_at timestamptz,
  revoked_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (appointment_id,provider_user_id)
);
create index if not exists caddie_magic_appointment_access_provider_idx
  on public.caddie_magic_appointment_access_grants(provider_user_id,player_profile_id,active_until,status);
alter table public.caddie_magic_appointment_access_grants enable row level security;
drop policy if exists "Caddie appointment participants read grants" on public.caddie_magic_appointment_access_grants;
create policy "Caddie appointment participants read grants"
  on public.caddie_magic_appointment_access_grants for select
  using (
    provider_user_id=auth.uid()
    or exists (select 1 from public.caddie_magic_player_profiles p where p.id=player_profile_id and p.user_id=auth.uid())
    or public.flowtel_current_user_is_admin_or_owner()
  );
grant select on public.caddie_magic_appointment_access_grants to authenticated;

create or replace function public.caddie_magic_has_active_appointment_access(
  p_player_profile_id uuid,
  p_provider_user_id uuid default auth.uid()
) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(
    select 1
    from public.caddie_magic_appointment_access_grants g
    join public.flowtel_external_appointments a on a.id=g.appointment_id
    where g.player_profile_id=p_player_profile_id
      and g.provider_user_id=coalesce(p_provider_user_id,auth.uid())
      and g.status='active' and g.active_from<=now() and g.active_until>now()
      and a.status in ('scheduled','rescheduled','completed')
  );
$$;
revoke all on function public.caddie_magic_has_active_appointment_access(uuid,uuid) from public;
grant execute on function public.caddie_magic_has_active_appointment_access(uuid,uuid) to authenticated;

drop function if exists public.caddie_magic_list_my_upcoming_sessions();
create or replace function public.caddie_magic_list_my_upcoming_sessions()
returns table(
  appointment_id uuid,service_key text,service_name text,player_profile_id uuid,
  player_name text,provider_user_id uuid,provider_name text,starts_at timestamptz,
  ends_at timestamptz,status text,client_timezone text,access_until timestamptz,
  source_relationship_id uuid,viewer_role text
)
language plpgsql security definer set search_path=public,auth as $$
begin
  if auth.uid() is null then raise exception 'Sign in to view Caddie Magic sessions.' using errcode='28000'; end if;
  return query
  select a.id,s.service_key,s.service_name,pp.id,
    coalesce(nullif(trim(concat_ws(' ',pp.first_name,pp.last_name)),''),'Caddie Magic Player'),
    provider.user_id,provider.display_name,a.starts_at,a.ends_at,a.status,a.client_timezone,
    g.active_until,a.source_relationship_id,
    case when provider.user_id=auth.uid() then 'provider'
         when pp.user_id=auth.uid() then 'player'
         else 'caddie_master' end
  from public.flowtel_external_appointments a
  join public.flowtel_provider_service_types s on s.id=a.service_type_id
  join public.flowtel_provider_scheduling_profiles provider on provider.id=a.provider_id
  join public.caddie_magic_player_profiles pp on pp.user_id=a.customer_user_id
  left join public.caddie_magic_appointment_access_grants g on g.appointment_id=a.id and g.provider_user_id=provider.user_id
  where a.source_product='caddie_magic'
    and a.starts_at>=now()-interval '1 day'
    and a.status in ('scheduled','rescheduled')
    and (provider.user_id=auth.uid() or pp.user_id=auth.uid() or public.flowtel_current_user_is_admin_or_owner())
  order by a.starts_at;
end;
$$;
revoke all on function public.caddie_magic_list_my_upcoming_sessions() from public;
grant execute on function public.caddie_magic_list_my_upcoming_sessions() to authenticated;

create or replace function public.caddie_magic_get_appointment_snapshot(p_appointment_id uuid)
returns jsonb
language plpgsql security definer set search_path=public,auth as $$
declare
  v_appointment public.flowtel_external_appointments%rowtype;
  v_provider public.flowtel_provider_scheduling_profiles%rowtype;
  v_grant public.caddie_magic_appointment_access_grants%rowtype;
  v_player public.caddie_magic_player_profiles%rowtype;
  v_request public.caddie_magic_caddie_requests%rowtype;
  v_scorecard jsonb := '[]'::jsonb;
  v_score_map jsonb := '[]'::jsonb;
  v_compass jsonb := null;
  v_upcoming jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in to open this Player preparation view.' using errcode='28000'; end if;
  select a.* into v_appointment
  from public.flowtel_external_appointments a
  where a.id=p_appointment_id and a.source_product='caddie_magic';
  if v_appointment.id is null then raise exception 'This Caddie Magic session could not be found.' using errcode='P0002'; end if;

  select * into v_provider from public.flowtel_provider_scheduling_profiles where id=v_appointment.provider_id;
  select * into v_grant from public.caddie_magic_appointment_access_grants
    where appointment_id=v_appointment.id and provider_user_id=v_provider.user_id limit 1;
  if not public.flowtel_current_user_is_admin_or_owner() and (
    v_provider.user_id<>auth.uid() or v_grant.id is null or v_grant.status<>'active'
    or v_grant.active_from>now() or v_grant.active_until<=now()
  ) then
    raise exception 'This appointment-scoped preparation view is not available.' using errcode='42501';
  end if;

  select * into v_player from public.caddie_magic_player_profiles where user_id=v_appointment.customer_user_id;
  if v_player.id is null then raise exception 'The Player Profile could not be found.' using errcode='P0002'; end if;
  if v_appointment.source_relationship_id is not null then
    select * into v_request from public.caddie_magic_caddie_requests where id=v_appointment.source_relationship_id;
  end if;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.round_date desc,x.created_at desc),'[]'::jsonb)
  into v_scorecard from (
    select id,round_date,course_played,score,swing_thoughts,moon_day,moon_phase,entry_type,created_at
    from public.caddie_magic_round_logs where player_profile_id=v_player.id and score is not null
    order by round_date desc,created_at desc limit 20
  ) x;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.round_date desc,x.created_at desc),'[]'::jsonb)
  into v_score_map from (
    select id,round_date,course_played,score,swing_thoughts,moon_day,moon_phase,moon_last_new_moon_date,entry_type,created_at
    from public.caddie_magic_round_logs where player_profile_id=v_player.id
    order by round_date desc,created_at desc limit 150
  ) x;
  select to_jsonb(x) into v_compass from (
    select id,north_club,east_club,west_club,south_club,staff_club,version,status,updated_at
    from public.caddie_magic_compasses where player_profile_id=v_player.id and is_active=true
    order by version desc limit 1
  ) x;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.date_start),'[]'::jsonb)
  into v_upcoming from (
    select id,event_type,title,date_start,date_end,location,course,notes,moon_forecast
    from public.caddie_magic_upcoming_golf_events
    where player_profile_id=v_player.id and date_end>=(timezone('America/Los_Angeles',now()))::date
    order by date_start limit 20
  ) x;

  return jsonb_build_object(
    'appointment',jsonb_build_object('id',v_appointment.id,'starts_at',v_appointment.starts_at,'ends_at',v_appointment.ends_at,'status',v_appointment.status),
    'access',jsonb_build_object('scope',coalesce(v_grant.access_scope,'owner'),'active_until',v_grant.active_until),
    'request',case when v_request.id is null then null else jsonb_build_object(
      'id',v_request.id,'anticipated_trip_date',v_request.anticipated_trip_date,'course_itinerary',v_request.course_itinerary,
      'consultation_goal',v_request.consultation_goal,'played_pebble_before',v_request.played_pebble_before) end,
    'player',jsonb_build_object('id',v_player.id,'name',coalesce(nullif(trim(concat_ws(' ',v_player.first_name,v_player.last_name)),''),'Caddie Magic Player'),
      'home_course',v_player.home_course,'handicap_or_score_range',v_player.handicap_or_score_range,
      'main_goal',v_player.main_goal,'biggest_frustration',v_player.biggest_frustration),
    'provider',jsonb_build_object('id',v_provider.id,'name',v_provider.display_name),
    'scorecard',v_scorecard,'score_map',v_score_map,'compass',v_compass,'upcoming_golf',v_upcoming
  );
end;
$$;
revoke all on function public.caddie_magic_get_appointment_snapshot(uuid) from public;
grant execute on function public.caddie_magic_get_appointment_snapshot(uuid) to authenticated;

comment on table public.caddie_magic_appointment_access_grants is
  'Appointment-scoped consent for Caddie Magic providers. Separate from permanent Player/Caddie pairing and from Flowtel cycle-data consent.';

notify pgrst, 'reload schema';
