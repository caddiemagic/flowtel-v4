-- Flowtel v0.10.41 — The Living Map + Multidimensional Presence
--
-- Purpose:
-- 1. Add a default-visible, member-controlled Flow FM Team Map preference.
-- 2. Let authenticated Queendom / Flow FM / Council members view today's Flow FM presences.
-- 3. Return only the minimum cycle/profile fields needed for the Living Map.
-- 4. Keep draft/private profile content hidden while approved profiles may open for booking.

alter table public.profiles
  add column if not exists flow_fm_team_map_opt_out boolean not null default false;

comment on column public.profiles.flow_fm_team_map_opt_out is
  'When true, the member is hidden from the Flow FM Living Map even after checking in. Default false means visible by default.';

create index if not exists profiles_flow_fm_team_map_visibility_idx
  on public.profiles (flow_fm_team_map_opt_out, membership_type, flowfm_started_at);

create or replace function public.flow_fm_current_user_can_view_team_map()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        regexp_replace(lower(coalesce(p.membership_type,'')), '[^a-z]', '', 'g') in ('queendom','flowfm','flowfmmember','council')
        or lower(coalesce(p.role,'')) in ('client','guest','member','practitioner','admin','owner')
        or p.flowfm_started_at is not null
        or coalesce(p.is_initiated,false) = true
      )
  );
$$;

grant execute on function public.flow_fm_current_user_can_view_team_map() to authenticated;

create or replace function public.flow_fm_current_user_can_appear_on_team_map()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        regexp_replace(lower(coalesce(p.membership_type,'')), '[^a-z]', '', 'g') in ('flowfm','flowfmmember','council')
        or p.flowfm_started_at is not null
        or coalesce(p.is_initiated,false) = true
        or lower(coalesce(p.role,'')) in ('admin','owner')
      )
  );
$$;

grant execute on function public.flow_fm_current_user_can_appear_on_team_map() to authenticated;

create or replace function public.flow_fm_get_team_map_viewer_state()
returns table (
  flowtel_date date,
  can_view boolean,
  can_appear boolean,
  is_visible boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_can_view boolean;
  v_can_appear boolean;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to enter the Living Map.' using errcode = '28000';
  end if;

  v_can_view := public.flow_fm_current_user_can_view_team_map();
  if not v_can_view then
    raise exception 'The Living Map is available to Queendom and Flow FM members.' using errcode = '42501';
  end if;

  v_can_appear := public.flow_fm_current_user_can_appear_on_team_map();

  return query
  select
    (timezone('America/Los_Angeles', now()))::date,
    v_can_view,
    v_can_appear,
    case
      when not v_can_appear then false
      else not coalesce((select p.flow_fm_team_map_opt_out from public.profiles p where p.id = v_user_id), false)
    end;
end;
$$;

grant execute on function public.flow_fm_get_team_map_viewer_state() to authenticated;

create or replace function public.flow_fm_set_team_map_visibility(
  p_visible boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_visible boolean := coalesce(p_visible,true);
begin
  if v_user_id is null then
    raise exception 'You must be signed in to change your Living Map setting.' using errcode = '28000';
  end if;

  if not public.flow_fm_current_user_can_appear_on_team_map() then
    raise exception 'Only Flow FM members can change a Living Map presence setting.' using errcode = '42501';
  end if;

  update public.profiles
    set flow_fm_team_map_opt_out = not v_visible
    where id = v_user_id;

  return v_visible;
end;
$$;

grant execute on function public.flow_fm_set_team_map_visibility(boolean) to authenticated;

create or replace function public.flow_fm_get_team_map()
returns table (
  member_id uuid,
  priestess_name text,
  profile_photo_url text,
  profile_status text,
  priestess_title text,
  profile_intro text,
  actual_inner_season text,
  feels_like_inner_season text,
  cycle_day integer,
  checked_in_at timestamptz,
  profile_available boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_today date := (timezone('America/Los_Angeles', now()))::date;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to enter the Living Map.' using errcode = '28000';
  end if;

  if not public.flow_fm_current_user_can_view_team_map() then
    raise exception 'The Living Map is available to Queendom and Flow FM members.' using errcode = '42501';
  end if;

  return query
  with today_stays as (
    select distinct on (s.client_id)
      s.client_id,
      s.inner_season,
      s.feels_like_inner_season,
      coalesce(s.cycle_day_actual, s.cycle_day_calculated, s.cycle_day_claimed) as cycle_day,
      s.checked_in_at
    from public.flowtel_stays s
    where s.checkin_date::date = v_today
    order by s.client_id, s.checked_in_at desc nulls last, s.id desc
  )
  select
    p.id as member_id,
    coalesce(
      nullif(trim(pp.priestess_name),''),
      nullif(trim(p.first_name),''),
      'Flow FM Priestess'
    ) as priestess_name,
    coalesce(nullif(trim(pp.profile_photo_url),''),nullif(trim(p.mentor_photo_url),'')) as profile_photo_url,
    coalesce(pp.status,'draft') as profile_status,
    case when pp.status = 'approved' then coalesce(nullif(trim(pp.modalities),''),nullif(trim(p.mentor_title),'')) else null end as priestess_title,
    case when pp.status = 'approved' then coalesce(nullif(trim(pp.bio),''),nullif(trim(p.mentor_bio),'')) else null end as profile_intro,
    ts.inner_season as actual_inner_season,
    ts.feels_like_inner_season,
    ts.cycle_day,
    ts.checked_in_at,
    coalesce(pp.status = 'approved',false) as profile_available
  from today_stays ts
  join public.profiles p on p.id = ts.client_id
  left join public.flow_fm_priestess_profiles pp on pp.member_id = p.id
  where coalesce(p.flow_fm_team_map_opt_out,false) = false
    and (
      regexp_replace(lower(coalesce(p.membership_type,'')), '[^a-z]', '', 'g') in ('flowfm','flowfmmember','council')
      or p.flowfm_started_at is not null
      or coalesce(p.is_initiated,false) = true
      or lower(coalesce(p.role,'')) in ('admin','owner')
    )
    and ts.inner_season in ('Inner Winter','Inner Spring','Inner Summer','Inner Autumn')
  order by 2, 1;
end;
$$;

grant execute on function public.flow_fm_get_team_map() to authenticated;

create or replace function public.flow_fm_get_team_map_profile(
  p_member_id uuid
)
returns table (
  member_id uuid,
  priestess_name text,
  profile_photo_url text,
  profile_status text,
  priestess_title text,
  bio text,
  offerings text,
  modalities text,
  who_she_serves text,
  session_types text,
  scheduling_url text,
  website_url text,
  queendom_name text,
  location text,
  framework_language text,
  profile_available boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to visit a Priestess Queendom.' using errcode = '28000';
  end if;

  if not public.flow_fm_current_user_can_view_team_map() then
    raise exception 'Priestess Queendoms are available to Queendom and Flow FM members.' using errcode = '42501';
  end if;

  if p_member_id is null then
    raise exception 'Choose a Priestess to visit.' using errcode = '22023';
  end if;

  return query
  select
    p.id as member_id,
    coalesce(nullif(trim(pp.priestess_name),''),nullif(trim(p.first_name),''),'Flow FM Priestess') as priestess_name,
    coalesce(nullif(trim(pp.profile_photo_url),''),nullif(trim(p.mentor_photo_url),'')) as profile_photo_url,
    coalesce(pp.status,'draft') as profile_status,
    case when pp.status = 'approved' then coalesce(nullif(trim(pp.modalities),''),nullif(trim(p.mentor_title),'')) else null end as priestess_title,
    case when pp.status = 'approved' then coalesce(nullif(trim(pp.bio),''),nullif(trim(p.mentor_bio),'')) else null end as bio,
    case when pp.status = 'approved' then coalesce(nullif(trim(pp.offerings),''),nullif(trim(array_to_string(p.mentor_specialties, ', ')),'')) else null end as offerings,
    case when pp.status = 'approved' then nullif(trim(pp.modalities),'') else null end as modalities,
    case when pp.status = 'approved' then nullif(trim(pp.who_she_serves),'') else null end as who_she_serves,
    case when pp.status = 'approved' then nullif(trim(pp.session_types),'') else null end as session_types,
    case when pp.status = 'approved' then coalesce(nullif(trim(pp.scheduling_url),''),nullif(trim(p.mentor_scheduling_url),''),nullif(trim(p.scheduling_url),''),nullif(trim(p.booking_url),'')) else null end as scheduling_url,
    case when pp.status = 'approved' then nullif(trim(pp.website_url),'') else null end as website_url,
    case when pp.status = 'approved' then nullif(trim(pp.queendom_name),'') else null end as queendom_name,
    case when pp.status = 'approved' then nullif(trim(pp.location),'') else null end as location,
    case when pp.status = 'approved' then nullif(trim(pp.framework_language),'') else null end as framework_language,
    coalesce(pp.status = 'approved',false) as profile_available
  from public.profiles p
  left join public.flow_fm_priestess_profiles pp on pp.member_id = p.id
  where p.id = p_member_id
    and (
      regexp_replace(lower(coalesce(p.membership_type,'')), '[^a-z]', '', 'g') in ('flowfm','flowfmmember','council')
      or p.flowfm_started_at is not null
      or coalesce(p.is_initiated,false) = true
      or lower(coalesce(p.role,'')) in ('admin','owner')
    )
  limit 1;
end;
$$;

grant execute on function public.flow_fm_get_team_map_profile(uuid) to authenticated;
