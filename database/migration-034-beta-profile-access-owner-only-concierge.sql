-- Flowtel v0.10.44 — Beta Profile Access + Owner-Only Concierge
--
-- Phase 1 decisions:
-- 1. Authenticated Queendom / Flow FM members may open saved Priestess profiles
--    without waiting for the future profile approval workflow.
-- 2. The Concierge Desk is restricted to Megan's owner account only.
--
-- This migration does not delete or rewrite stays, reflections, relationships,
-- photos, or Priestess Profile content.

-- ---------------------------------------------------------------------------
-- Owner-only Concierge permission
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists concierge_access_enabled boolean not null default false;

comment on column public.profiles.concierge_access_enabled is
  'Explicit access to the Flowtel Concierge Desk. Phase 1 defaults to false and is enabled only for the owner account.';

-- Phase 1 source of truth: Megan is the only Concierge Desk user.
update public.profiles
set concierge_access_enabled = (
  lower(coalesce(email,'')) = 'mm.johnson@icloud.com'
  and lower(coalesce(role,'')) in ('admin','owner')
);

-- Prevent ordinary authenticated users from granting themselves Concierge access
-- through a broad self-profile update. SQL editor / service-role operations have
-- no auth.uid() and remain able to manage this flag intentionally.
create or replace function public.flowtel_protect_concierge_access_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and new.concierge_access_enabled is distinct from old.concierge_access_enabled
     and lower(coalesce(auth.jwt() ->> 'email','')) <> 'mm.johnson@icloud.com' then
    new.concierge_access_enabled := old.concierge_access_enabled;
  end if;
  return new;
end;
$$;

drop trigger if exists flowtel_protect_concierge_access_flag_trigger on public.profiles;
create trigger flowtel_protect_concierge_access_flag_trigger
before update of concierge_access_enabled on public.profiles
for each row execute function public.flowtel_protect_concierge_access_flag();

-- All existing Concierge RLS policies and Turndown RPCs call this helper.
-- Replacing it immediately hardens queue reads, stay updates, profile visibility,
-- and Turndown completion without duplicating permission logic.
create or replace function public.flowtel_current_user_is_concierge()
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
      and lower(coalesce(p.email,'')) = 'mm.johnson@icloud.com'
      and lower(coalesce(auth.jwt() ->> 'email','')) = 'mm.johnson@icloud.com'
      and lower(coalesce(p.role,'')) in ('admin','owner')
      and coalesce(p.concierge_access_enabled,false) = true
  );
$$;

revoke all on function public.flowtel_current_user_is_concierge() from public;
grant execute on function public.flowtel_current_user_is_concierge() to authenticated;

-- ---------------------------------------------------------------------------
-- Temporary authenticated-community Priestess Profile approval bypass
-- ---------------------------------------------------------------------------

-- The Team Map card may open any saved Priestess Profile during beta.
-- profile_status is still returned so the future approval flow remains intact.
drop function if exists public.flow_fm_get_team_map();

create or replace function public.flow_fm_get_team_map()
returns table (
  member_id uuid,
  priestess_name text,
  profile_photo_url text,
  profile_status text,
  priestess_title text,
  profile_intro text,
  website_url text,
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
      public.flow_fm_normalize_team_map_season(s.inner_season) as actual_inner_season,
      public.flow_fm_normalize_team_map_season(s.feels_like_inner_season) as feels_like_inner_season,
      coalesce(s.cycle_day_actual, s.cycle_day_calculated, s.cycle_day_recorded, s.cycle_day_claimed) as cycle_day,
      s.checked_in_at
    from public.flowtel_stays s
    where s.checkin_date::date = v_today
       or (s.checked_in_at is not null and (timezone('America/Los_Angeles', s.checked_in_at))::date = v_today)
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
    coalesce(nullif(trim(pp.modalities),''),nullif(trim(p.mentor_title),''),'Flow FM Priestess') as priestess_title,
    coalesce(nullif(trim(pp.bio),''),nullif(trim(p.mentor_bio),'')) as profile_intro,
    nullif(trim(pp.website_url),'') as website_url,
    ts.actual_inner_season,
    ts.feels_like_inner_season,
    ts.cycle_day,
    ts.checked_in_at,
    (pp.member_id is not null) as profile_available
  from today_stays ts
  join public.profiles p on p.id = ts.client_id
  left join public.flow_fm_priestess_profiles pp on pp.member_id = p.id
  where coalesce(p.flow_fm_team_map_opt_out,false) = false
    and (
      regexp_replace(lower(coalesce(p.membership_type,'')), '[^a-z]', '', 'g') in ('flowfm','flowfmmember','council')
      or regexp_replace(lower(coalesce(p.membership_type,'')), '[^a-z]', '', 'g') like 'flowfm%'
      or p.flowfm_started_at is not null
      or coalesce(p.is_initiated,false) = true
      or lower(coalesce(p.role,'')) in ('practitioner','admin','owner')
    )
    and ts.actual_inner_season is not null
  order by 2, 1;
end;
$$;

revoke all on function public.flow_fm_get_team_map() from public;
grant execute on function public.flow_fm_get_team_map() to authenticated;

-- The full internal Priestess profile route also bypasses approval during beta.
-- It remains available only to authenticated members who can view the Team Map.
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
    coalesce(nullif(trim(pp.modalities),''),nullif(trim(p.mentor_title),''),'Flow FM Priestess') as priestess_title,
    coalesce(nullif(trim(pp.bio),''),nullif(trim(p.mentor_bio),'')) as bio,
    coalesce(nullif(trim(pp.offerings),''),nullif(trim(array_to_string(p.mentor_specialties, ', ')),'')) as offerings,
    nullif(trim(pp.modalities),'') as modalities,
    nullif(trim(pp.who_she_serves),'') as who_she_serves,
    nullif(trim(pp.session_types),'') as session_types,
    coalesce(nullif(trim(pp.scheduling_url),''),nullif(trim(p.mentor_scheduling_url),''),nullif(trim(p.scheduling_url),''),nullif(trim(p.booking_url),'')) as scheduling_url,
    nullif(trim(pp.website_url),'') as website_url,
    nullif(trim(pp.queendom_name),'') as queendom_name,
    nullif(trim(pp.location),'') as location,
    nullif(trim(pp.framework_language),'') as framework_language,
    (pp.member_id is not null) as profile_available
  from public.profiles p
  left join public.flow_fm_priestess_profiles pp on pp.member_id = p.id
  where p.id = p_member_id
    and (
      regexp_replace(lower(coalesce(p.membership_type,'')), '[^a-z]', '', 'g') in ('flowfm','flowfmmember','council')
      or regexp_replace(lower(coalesce(p.membership_type,'')), '[^a-z]', '', 'g') like 'flowfm%'
      or p.flowfm_started_at is not null
      or coalesce(p.is_initiated,false) = true
      or lower(coalesce(p.role,'')) in ('practitioner','admin','owner')
    )
  limit 1;
end;
$$;

revoke all on function public.flow_fm_get_team_map_profile(uuid) from public;
grant execute on function public.flow_fm_get_team_map_profile(uuid) to authenticated;
