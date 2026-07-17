-- Flowtel v0.10.42 — Living Map Presence Repair + Priestess Photo Upload
--
-- Purpose:
-- 1. Make today's Living Map presence resilient to legacy season labels and Flowtel-date rows.
-- 2. Expose a private self-diagnostic state so a member can understand why she is or is not visible.
-- 3. Add a secure Supabase Storage bucket for Priestess profile photos.
-- 4. Let a member update her own Priestess/Profile Studio image without changing approved profile status.

alter table public.profiles
  add column if not exists flow_fm_team_map_opt_out boolean not null default false;

-- Public image delivery is intentional: these photos are member-selected profile images
-- designed to appear in the Living Map, Mentor directory, and approved Queendom profiles.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'flow-fm-profile-photos',
  'flow-fm-profile-photos',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;


drop policy if exists "Flow FM members read their own stored profile photo" on storage.objects;
create policy "Flow FM members read their own stored profile photo"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'flow-fm-profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Flow FM members upload their own profile photo" on storage.objects;
create policy "Flow FM members upload their own profile photo"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'flow-fm-profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Flow FM members update their own profile photo" on storage.objects;
create policy "Flow FM members update their own profile photo"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'flow-fm-profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'flow-fm-profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Flow FM members delete their own profile photo" on storage.objects;
create policy "Flow FM members delete their own profile photo"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'flow-fm-profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create or replace function public.flow_fm_normalize_team_map_season(p_value text)
returns text
language sql
immutable
as $$
  select case regexp_replace(lower(trim(coalesce(p_value,''))), '[^a-z]', '', 'g')
    when 'winter' then 'Inner Winter'
    when 'innerwinter' then 'Inner Winter'
    when 'spring' then 'Inner Spring'
    when 'innerspring' then 'Inner Spring'
    when 'summer' then 'Inner Summer'
    when 'innersummer' then 'Inner Summer'
    when 'autumn' then 'Inner Autumn'
    when 'innerautumn' then 'Inner Autumn'
    when 'fall' then 'Inner Autumn'
    when 'innerfall' then 'Inner Autumn'
    else null
  end;
$$;

grant execute on function public.flow_fm_normalize_team_map_season(text) to authenticated;

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
        or regexp_replace(lower(coalesce(p.membership_type,'')), '[^a-z]', '', 'g') like 'flowfm%'
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
        or regexp_replace(lower(coalesce(p.membership_type,'')), '[^a-z]', '', 'g') like 'flowfm%'
        or p.flowfm_started_at is not null
        or coalesce(p.is_initiated,false) = true
        or lower(coalesce(p.role,'')) in ('practitioner','admin','owner')
      )
  );
$$;

grant execute on function public.flow_fm_current_user_can_appear_on_team_map() to authenticated;

create or replace function public.flow_fm_set_priestess_profile_photo(
  p_profile_photo_url text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_url text := public.flow_fm_clean_profile_url(p_profile_photo_url);
begin
  if v_user_id is null then
    raise exception 'You must be signed in to tend your Priestess photo.' using errcode = '28000';
  end if;

  if not public.flow_fm_current_user_can_tend_assignments() then
    raise exception 'Priestess photo upload is available to Flow FM members.' using errcode = '42501';
  end if;

  insert into public.flow_fm_priestess_profiles (
    member_id,
    status,
    profile_photo_url,
    created_at,
    updated_at
  ) values (
    v_user_id,
    'draft',
    v_url,
    now(),
    now()
  )
  on conflict (member_id) do update
    set profile_photo_url = excluded.profile_photo_url,
        updated_at = now();

  -- The Mentor directory already uses this field. Keeping it synchronized means one
  -- uploaded photo can follow her through Profile Studio, Mentor selection, and the Living Map.
  update public.profiles
    set mentor_photo_url = v_url
    where id = v_user_id;

  return v_url;
end;
$$;

grant execute on function public.flow_fm_set_priestess_profile_photo(text) to authenticated;

-- The v0.10.41 viewer-state function returned four columns. PostgreSQL requires
-- dropping it before expanding the result shape with diagnostic fields.
drop function if exists public.flow_fm_get_team_map_viewer_state();

create or replace function public.flow_fm_get_team_map_viewer_state()
returns table (
  flowtel_date date,
  can_view boolean,
  can_appear boolean,
  is_visible boolean,
  checked_in_today boolean,
  appears_today boolean,
  actual_inner_season text,
  feels_like_inner_season text,
  cycle_day integer,
  profile_photo_url text,
  presence_status text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := (timezone('America/Los_Angeles', now()))::date;
  v_profile public.profiles%rowtype;
  v_stay public.flowtel_stays%rowtype;
  v_can_view boolean;
  v_can_appear boolean;
  v_is_visible boolean;
  v_actual text;
  v_feels text;
  v_cycle_day integer;
  v_photo text;
  v_appears boolean;
  v_status text;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to enter the Living Map.' using errcode = '28000';
  end if;

  select * into v_profile
  from public.profiles p
  where p.id = v_user_id;

  v_can_view := public.flow_fm_current_user_can_view_team_map();
  if not v_can_view then
    raise exception 'The Living Map is available to Queendom and Flow FM members.' using errcode = '42501';
  end if;

  v_can_appear := public.flow_fm_current_user_can_appear_on_team_map();
  v_is_visible := v_can_appear and not coalesce(v_profile.flow_fm_team_map_opt_out,false);

  select s.* into v_stay
  from public.flowtel_stays s
  where s.client_id = v_user_id
    and (
      s.checkin_date::date = v_today
      or (s.checked_in_at is not null and (timezone('America/Los_Angeles', s.checked_in_at))::date = v_today)
    )
  order by s.checked_in_at desc nulls last, s.id desc
  limit 1;

  v_actual := public.flow_fm_normalize_team_map_season(v_stay.inner_season);
  v_feels := public.flow_fm_normalize_team_map_season(v_stay.feels_like_inner_season);
  v_cycle_day := coalesce(v_stay.cycle_day_actual, v_stay.cycle_day_calculated, v_stay.cycle_day_recorded, v_stay.cycle_day_claimed);

  select coalesce(nullif(trim(pp.profile_photo_url),''),nullif(trim(v_profile.mentor_photo_url),''))
    into v_photo
  from public.flow_fm_priestess_profiles pp
  where pp.member_id = v_user_id
  limit 1;
  v_photo := coalesce(v_photo,nullif(trim(v_profile.mentor_photo_url),''));

  v_appears := v_is_visible and v_stay.id is not null and v_actual is not null;

  v_status := case
    when not v_can_appear then 'Your account can view the Living Map, but it is not marked as a Flow FM presence.'
    when not v_is_visible then 'Your presence is private. Turn visibility on when you are ready to be seen.'
    when v_stay.id is null then 'No Flowtel check-in was found for today.'
    when v_actual is null then 'Today’s stay needs a recognized Inner Season before it can appear.'
    else 'You are visible on the Living Map today.'
  end;

  return query
  select
    v_today,
    v_can_view,
    v_can_appear,
    v_is_visible,
    v_stay.id is not null,
    v_appears,
    v_actual,
    v_feels,
    v_cycle_day,
    v_photo,
    v_status;
end;
$$;

grant execute on function public.flow_fm_get_team_map_viewer_state() to authenticated;

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
    case when pp.status = 'approved' then coalesce(nullif(trim(pp.modalities),''),nullif(trim(p.mentor_title),'')) else null end as priestess_title,
    case when pp.status = 'approved' then coalesce(nullif(trim(pp.bio),''),nullif(trim(p.mentor_bio),'')) else null end as profile_intro,
    ts.actual_inner_season,
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
      or regexp_replace(lower(coalesce(p.membership_type,'')), '[^a-z]', '', 'g') like 'flowfm%'
      or p.flowfm_started_at is not null
      or coalesce(p.is_initiated,false) = true
      or lower(coalesce(p.role,'')) in ('practitioner','admin','owner')
    )
    and ts.actual_inner_season is not null
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
      or regexp_replace(lower(coalesce(p.membership_type,'')), '[^a-z]', '', 'g') like 'flowfm%'
      or p.flowfm_started_at is not null
      or coalesce(p.is_initiated,false) = true
      or lower(coalesce(p.role,'')) in ('practitioner','admin','owner')
    )
  limit 1;
end;
$$;

grant execute on function public.flow_fm_get_team_map_profile(uuid) to authenticated;
