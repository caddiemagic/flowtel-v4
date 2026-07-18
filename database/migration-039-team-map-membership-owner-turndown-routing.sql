-- Flowtel v0.10.50 — Team Map Membership + Owner Turndown Routing Repair
--
-- Repairs Flow FM membership recognition after beta entry paths accidentally
-- wrote a lower Queendom doorway value over an already-ranked Flow FM profile.
-- The migration also gives the owner a private diagnostic for today's map.
--
-- Turndown owner routing is repaired in manager/app.js because the database
-- already returns today's requests to the owner Concierge. No stay/request data
-- is rewritten here.

-- ---------------------------------------------------------------------------
-- Effective membership recognition
-- ---------------------------------------------------------------------------

create or replace function public.flowtel_membership_rank(p_membership text)
returns integer
language sql
immutable
as $$
  select case regexp_replace(lower(trim(coalesce(p_membership,''))), '[^a-z]', '', 'g')
    when 'queendom' then 1
    when 'queen' then 1
    when 'flow' then 2
    when 'flowfm' then 2
    when 'flowfmmember' then 2
    when 'flowfminitiate' then 2
    when 'flowfmpractitioner' then 2
    when 'council' then 3
    else 0
  end;
$$;

comment on function public.flowtel_membership_rank(text) is
  'Normalizes Flowtel membership labels into the preserved rank system: Queendom 1, Flow FM 2, Council 3.';

create or replace function public.flow_fm_effective_membership_rank(
  p_user_id uuid,
  p_membership_type text,
  p_membership_rank integer,
  p_role text,
  p_flowfm_started_at date,
  p_is_initiated boolean
)
returns integer
language sql
stable
security definer
set search_path = public, auth
as $$
  select greatest(
    coalesce(p_membership_rank,0),
    public.flowtel_membership_rank(p_membership_type),
    coalesce((
      select public.flowtel_membership_rank(u.raw_user_meta_data ->> 'membership_type')
      from auth.users u
      where u.id = p_user_id
    ),0),
    coalesce((
      select case
        when coalesce(u.raw_user_meta_data ->> 'membership_rank','') ~ '^\d+$'
          then (u.raw_user_meta_data ->> 'membership_rank')::integer
        else 0
      end
      from auth.users u
      where u.id = p_user_id
    ),0),
    case
      when lower(trim(coalesce(p_role,''))) in ('practitioner','admin','owner') then 2
      else 0
    end,
    case when p_flowfm_started_at is not null or coalesce(p_is_initiated,false) then 2 else 0 end,
    case when exists (
      select 1
      from public.flow_fm_priestess_profiles pp
      where pp.member_id = p_user_id
    ) then 2 else 0 end
  );
$$;

comment on function public.flow_fm_effective_membership_rank(uuid,text,integer,text,date,boolean) is
  'Resolves the highest trustworthy Flow FM membership signal from profile rank/type, Auth metadata, role/initiation, and Profile Studio presence.';

revoke all on function public.flow_fm_effective_membership_rank(uuid,text,integer,text,date,boolean) from public;
grant execute on function public.flow_fm_effective_membership_rank(uuid,text,integer,text,date,boolean) to authenticated;

-- Restore Flow FM/Council profile membership when a lower doorway value was
-- written over a higher rank or other established team signal.
with resolved as (
  select
    p.id,
    public.flow_fm_effective_membership_rank(
      p.id,
      p.membership_type,
      p.membership_rank,
      p.role,
      p.flowfm_started_at,
      p.is_initiated
    ) as effective_rank
  from public.profiles p
)
update public.profiles p
set membership_rank = r.effective_rank,
    membership_type = case when r.effective_rank >= 3 then 'council' else 'flowfm' end,
    source_updated_at = coalesce(p.source_updated_at, now())
from resolved r
where p.id = r.id
  and r.effective_rank >= 2
  and (
    coalesce(p.membership_rank,0) < r.effective_rank
    or public.flowtel_membership_rank(p.membership_type) < 2
  );

-- ---------------------------------------------------------------------------
-- Team Map eligibility
-- ---------------------------------------------------------------------------

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
      and public.flow_fm_effective_membership_rank(
        p.id,
        p.membership_type,
        p.membership_rank,
        p.role,
        p.flowfm_started_at,
        p.is_initiated
      ) >= 2
  );
$$;

revoke all on function public.flow_fm_current_user_can_appear_on_team_map() from public;
grant execute on function public.flow_fm_current_user_can_appear_on_team_map() to authenticated;

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
    coalesce(nullif(trim(pp.priestess_name),''),nullif(trim(p.first_name),''),'Flow FM Priestess') as priestess_name,
    coalesce(nullif(trim(pp.profile_photo_url),''),nullif(trim(p.mentor_photo_url),'')) as profile_photo_url,
    coalesce(pp.status,'draft') as profile_status,
    'Flow FM Priestess'::text as priestess_title,
    null::text as profile_intro,
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
    and public.flow_fm_effective_membership_rank(
      p.id,
      p.membership_type,
      p.membership_rank,
      p.role,
      p.flowfm_started_at,
      p.is_initiated
    ) >= 2
    and ts.actual_inner_season is not null
  order by 2, 1;
end;
$$;

revoke all on function public.flow_fm_get_team_map() from public;
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
    raise exception 'You must be signed in to visit a Priestess profile.' using errcode = '28000';
  end if;

  if not public.flow_fm_current_user_can_view_team_map() then
    raise exception 'Priestess profiles are available to Queendom and Flow FM members.' using errcode = '42501';
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
    'Flow FM Priestess'::text as priestess_title,
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
    and public.flow_fm_effective_membership_rank(
      p.id,
      p.membership_type,
      p.membership_rank,
      p.role,
      p.flowfm_started_at,
      p.is_initiated
    ) >= 2
  limit 1;
end;
$$;

revoke all on function public.flow_fm_get_team_map_profile(uuid) from public;
grant execute on function public.flow_fm_get_team_map_profile(uuid) to authenticated;

create or replace function public.flow_fm_get_public_team_map()
returns table (
  presence_key text,
  priestess_name text,
  profile_photo_url text,
  website_url text,
  actual_inner_season text,
  feels_like_inner_season text
)
language sql
stable
security definer
set search_path = public
as $$
  with today_stays as (
    select distinct on (s.client_id)
      s.client_id,
      public.flow_fm_normalize_team_map_season(s.inner_season) as actual_inner_season,
      public.flow_fm_normalize_team_map_season(s.feels_like_inner_season) as feels_like_inner_season,
      s.checked_in_at
    from public.flowtel_stays s
    where s.checkin_date::date = (timezone('America/Los_Angeles', now()))::date
       or (
         s.checked_in_at is not null
         and (timezone('America/Los_Angeles', s.checked_in_at))::date = (timezone('America/Los_Angeles', now()))::date
       )
    order by s.client_id, s.checked_in_at desc nulls last, s.id desc
  )
  select
    md5(p.id::text) as presence_key,
    coalesce(nullif(trim(pp.priestess_name),''),nullif(trim(p.first_name),''),'Flow FM Priestess') as priestess_name,
    coalesce(nullif(trim(pp.profile_photo_url),''),nullif(trim(p.mentor_photo_url),'')) as profile_photo_url,
    nullif(trim(pp.website_url),'') as website_url,
    ts.actual_inner_season,
    ts.feels_like_inner_season
  from today_stays ts
  join public.profiles p on p.id = ts.client_id
  left join public.flow_fm_priestess_profiles pp on pp.member_id = p.id
  where coalesce(p.flow_fm_team_map_opt_out,false) = false
    and public.flow_fm_effective_membership_rank(
      p.id,
      p.membership_type,
      p.membership_rank,
      p.role,
      p.flowfm_started_at,
      p.is_initiated
    ) >= 2
    and ts.actual_inner_season is not null
  order by 2, 1;
$$;

comment on function public.flow_fm_get_public_team_map() is
  'Public-safe daily Flow FM Team Map data using preserved profile rank, Auth metadata, role/initiation, and Profile Studio membership signals.';

revoke all on function public.flow_fm_get_public_team_map() from public;
grant execute on function public.flow_fm_get_public_team_map() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Owner recognition control for ambiguous beta profiles
-- ---------------------------------------------------------------------------

create or replace function public.flow_fm_owner_recognize_team_member(
  p_member_id uuid
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated public.profiles%rowtype;
begin
  if auth.uid() is null or not public.flowtel_current_user_is_concierge() then
    raise exception 'Only the owner Concierge may recognize a Flow FM team member.' using errcode = '42501';
  end if;

  if p_member_id is null then
    raise exception 'Choose a Flowtel guest to add to the Concierge Team.' using errcode = '22023';
  end if;

  update public.profiles p
  set membership_type = case
        when greatest(coalesce(p.membership_rank,0), public.flowtel_membership_rank(p.membership_type)) >= 3 then 'council'
        else 'flowfm'
      end,
      membership_rank = greatest(coalesce(p.membership_rank,0),2),
      source_updated_at = now()
  where p.id = p_member_id
  returning p.* into v_updated;

  if not found then
    raise exception 'Flowtel profile not found.' using errcode = 'P0002';
  end if;

  return v_updated;
end;
$$;

comment on function public.flow_fm_owner_recognize_team_member(uuid) is
  'Owner-only Phase 1 control that restores explicit Flow FM team membership without altering Auth passwords or stay history.';

revoke all on function public.flow_fm_owner_recognize_team_member(uuid) from public;
grant execute on function public.flow_fm_owner_recognize_team_member(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Owner-only Team Map diagnostic
-- ---------------------------------------------------------------------------

create or replace function public.flow_fm_get_team_map_diagnostics()
returns table (
  member_id uuid,
  member_name text,
  email text,
  membership_type text,
  membership_rank integer,
  auth_membership_type text,
  role text,
  actual_inner_season text,
  feels_like_inner_season text,
  team_map_visible boolean,
  effective_membership_rank integer,
  included_on_map boolean,
  inclusion_reason text
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_today date := (timezone('America/Los_Angeles', now()))::date;
begin
  -- SQL Editor/service-role runs have no auth.uid() and may inspect directly.
  -- Authenticated browser callers must be the owner Concierge.
  if auth.uid() is not null and not public.flowtel_current_user_is_concierge() then
    raise exception 'Only the owner Concierge may inspect Team Map diagnostics.' using errcode = '42501';
  end if;

  return query
  with today_stays as (
    select distinct on (s.client_id)
      s.client_id,
      public.flow_fm_normalize_team_map_season(s.inner_season) as actual_inner_season,
      public.flow_fm_normalize_team_map_season(s.feels_like_inner_season) as feels_like_inner_season
    from public.flowtel_stays s
    where s.checkin_date::date = v_today
       or (s.checked_in_at is not null and (timezone('America/Los_Angeles', s.checked_in_at))::date = v_today)
    order by s.client_id, s.checked_in_at desc nulls last, s.id desc
  ), inspected as (
    select
      p.*,
      ts.actual_inner_season,
      ts.feels_like_inner_season,
      u.raw_user_meta_data ->> 'membership_type' as auth_membership_type,
      public.flow_fm_effective_membership_rank(
        p.id,
        p.membership_type,
        p.membership_rank,
        p.role,
        p.flowfm_started_at,
        p.is_initiated
      ) as effective_rank
    from today_stays ts
    join public.profiles p on p.id = ts.client_id
    left join auth.users u on u.id = p.id
  )
  select
    i.id,
    coalesce(nullif(trim(concat_ws(' ',i.first_name,i.last_name)),''),i.email,'Guest') as member_name,
    i.email,
    i.membership_type,
    coalesce(i.membership_rank,0),
    i.auth_membership_type,
    i.role,
    i.actual_inner_season,
    i.feels_like_inner_season,
    not coalesce(i.flow_fm_team_map_opt_out,false) as team_map_visible,
    i.effective_rank,
    (
      not coalesce(i.flow_fm_team_map_opt_out,false)
      and i.effective_rank >= 2
      and i.actual_inner_season is not null
    ) as included_on_map,
    case
      when coalesce(i.flow_fm_team_map_opt_out,false) then 'Excluded: Team Map visibility is turned off.'
      when i.effective_rank < 2 then 'Excluded: profile is currently recognized as Queendom-only.'
      when i.actual_inner_season is null then 'Excluded: today''s stay has no recognized actual Inner Season.'
      else 'Included: checked in today and recognized as Flow FM/Council team.'
    end as inclusion_reason
  from inspected i
  order by 2, 1;
end;
$$;

comment on function public.flow_fm_get_team_map_diagnostics() is
  'Owner-only daily diagnostic showing why each checked-in member is included or excluded from the Flow FM Team Map.';

revoke all on function public.flow_fm_get_team_map_diagnostics() from public;
grant execute on function public.flow_fm_get_team_map_diagnostics() to authenticated;
