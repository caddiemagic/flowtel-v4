-- Flowtel v0.10.72 — Four Seasons + Time and Space
--
-- Purpose:
-- 1. Give every Hourly Flow Rate season one canonical human-readable location
--    label while preserving the existing city, region, country, lodging idea,
--    reflection, links, dates, costs, and append-only history.
-- 2. Let the Four Seasons Lounge workshop and Hourly Flow Rate read and write
--    the same seasonal-location source of truth.
-- 3. Add a privacy-aware Time + Space team view for the Flowtel owner and
--    approved Priestess Concierge Team members without exposing legal names,
--    email, client relationships, cycle data, or administrative status.
-- 4. Keep the plotted world map and external location autocomplete explicitly
--    deferred. Free-text location remains the supported input in this release.
--
-- Migration 037 remains retired and must never be rerun.

alter table public.flowtel_hourly_flow_rate_seasons
  add column if not exists location_label text;

comment on column public.flowtel_hourly_flow_rate_seasons.location_label is
  'Canonical free-text seasonal destination shared by the Four Seasons Lounge workshop and Hourly Flow Rate. Structured provider fields may be added later without replacing this label.';

update public.flowtel_hourly_flow_rate_seasons s
set location_label = nullif(trim(concat_ws(', ',
      nullif(trim(s.city), ''),
      nullif(trim(s.region), ''),
      nullif(trim(s.country), '')
    )), '')
where nullif(trim(coalesce(s.location_label, '')), '') is null
  and nullif(trim(concat_ws(', ',
      nullif(trim(s.city), ''),
      nullif(trim(s.region), ''),
      nullif(trim(s.country), '')
    )), '') is not null;

create or replace function public.flowtel_hfr_normalize_location_label(p_value text)
returns text
language plpgsql
immutable
as $$
declare
  v_value text := nullif(regexp_replace(trim(coalesce(p_value, '')), '\s+', ' ', 'g'), '');
begin
  if v_value is not null and char_length(v_value) > 220 then
    raise exception 'Keep each seasonal location under 220 characters.' using errcode = '22001';
  end if;
  return v_value;
end;
$$;

revoke all on function public.flowtel_hfr_normalize_location_label(text) from public;
grant execute on function public.flowtel_hfr_normalize_location_label(text) to authenticated;

create or replace function public.flowtel_hfr_save_season_location(
  p_season_id uuid,
  p_location_label text,
  p_last_open_section text default null,
  p_calling_reflection text default null,
  p_inspiration_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member uuid := public.flowtel_hfr_require_member();
  v_plan_id uuid;
  v_location text := public.flowtel_hfr_normalize_location_label(p_location_label);
begin
  update public.flowtel_hourly_flow_rate_seasons s
  set location_label = v_location,
      calling_reflection = case
        when p_calling_reflection is null then s.calling_reflection
        else nullif(trim(p_calling_reflection), '')
      end,
      inspiration_url = case
        when p_inspiration_url is null then s.inspiration_url
        else nullif(trim(p_inspiration_url), '')
      end,
      updated_at = now()
  where s.id = p_season_id
    and s.member_id = v_member
  returning s.plan_id into v_plan_id;

  if v_plan_id is null then
    raise exception 'This seasonal room is not available.' using errcode = '42501';
  end if;

  update public.flowtel_hourly_flow_rate_plans p
  set last_open_section = coalesce(nullif(trim(p_last_open_section), ''), 'season-' || p_season_id::text),
      updated_at = now()
  where p.id = v_plan_id
    and p.member_id = v_member;

  return public.flowtel_hfr_load_plan(false);
end;
$$;

revoke all on function public.flowtel_hfr_save_season_location(uuid,text,text,text,text) from public;
grant execute on function public.flowtel_hfr_save_season_location(uuid,text,text,text,text) to authenticated;

create or replace function public.flowtel_hfr_save_four_season_locations(p_locations jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member uuid := public.flowtel_hfr_require_member();
  v_plan_id uuid;
  v_key text;
begin
  if p_locations is null or jsonb_typeof(p_locations) <> 'object' then
    raise exception 'The four seasonal locations could not be read.' using errcode = '22023';
  end if;

  for v_key in select jsonb_object_keys(p_locations)
  loop
    if v_key not in ('winter','spring','summer','autumn') then
      raise exception 'Unknown seasonal location: %', v_key using errcode = '22023';
    end if;
  end loop;

  select p.id into v_plan_id
  from public.flowtel_hourly_flow_rate_plans p
  where p.member_id = v_member;

  if v_plan_id is null then
    raise exception 'Open your Hourly Flow Rate plan before saving the four locations.' using errcode = 'P0002';
  end if;

  update public.flowtel_hourly_flow_rate_seasons s
  set location_label = case
        when p_locations ? s.season_key
          then public.flowtel_hfr_normalize_location_label(p_locations ->> s.season_key)
        else s.location_label
      end,
      updated_at = case when p_locations ? s.season_key then now() else s.updated_at end
  where s.plan_id = v_plan_id
    and s.member_id = v_member
    and p_locations ? s.season_key;

  update public.flowtel_hourly_flow_rate_plans p
  set last_open_section = 'lounge-workshop',
      updated_at = now()
  where p.id = v_plan_id
    and p.member_id = v_member;

  return public.flowtel_hfr_load_plan(false);
end;
$$;

revoke all on function public.flowtel_hfr_save_four_season_locations(jsonb) from public;
grant execute on function public.flowtel_hfr_save_four_season_locations(jsonb) to authenticated;

-- Backward-compatible destination writer. Older cached pages may still submit
-- city/region/country separately; keep those details and refresh the canonical
-- shared label rather than creating a second location source.
create or replace function public.flowtel_hfr_save_destination(
  p_season_id uuid,
  p_city text,
  p_region text,
  p_country text,
  p_calling_reflection text,
  p_inspiration_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member uuid := public.flowtel_hfr_require_member();
  v_plan_id uuid;
  v_city text := nullif(trim(coalesce(p_city, '')), '');
  v_region text := nullif(trim(coalesce(p_region, '')), '');
  v_country text := nullif(trim(coalesce(p_country, '')), '');
  v_location text;
begin
  v_location := public.flowtel_hfr_normalize_location_label(
    nullif(trim(concat_ws(', ', v_city, v_region, v_country)), '')
  );

  update public.flowtel_hourly_flow_rate_seasons s
  set city = v_city,
      region = v_region,
      country = v_country,
      location_label = v_location,
      calling_reflection = nullif(trim(coalesce(p_calling_reflection, '')), ''),
      inspiration_url = nullif(trim(coalesce(p_inspiration_url, '')), ''),
      updated_at = now()
  where s.id = p_season_id
    and s.member_id = v_member
  returning s.plan_id into v_plan_id;

  if v_plan_id is null then
    raise exception 'This season is not available.' using errcode = '42501';
  end if;

  update public.flowtel_hourly_flow_rate_plans p
  set last_open_section = 'season-' || p_season_id::text,
      updated_at = now()
  where p.id = v_plan_id
    and p.member_id = v_member;

  return public.flowtel_hfr_load_plan(false);
end;
$$;

revoke all on function public.flowtel_hfr_save_destination(uuid,text,text,text,text,text) from public;
grant execute on function public.flowtel_hfr_save_destination(uuid,text,text,text,text,text) to authenticated;

-- Backward-compatible Lounge writer from v0.10.67. Preserve every existing
-- detailed field while also refreshing the canonical location label.
create or replace function public.flowtel_hfr_save_workshop_season(
  p_season_id uuid,
  p_city text default null,
  p_region text default null,
  p_country text default null,
  p_lodging_idea text default null,
  p_calling_reflection text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member uuid := public.flowtel_hfr_require_member();
  v_plan_id uuid;
  v_city text := nullif(trim(coalesce(p_city, '')), '');
  v_region text := nullif(trim(coalesce(p_region, '')), '');
  v_country text := nullif(trim(coalesce(p_country, '')), '');
begin
  update public.flowtel_hourly_flow_rate_seasons s
  set city = v_city,
      region = v_region,
      country = v_country,
      location_label = public.flowtel_hfr_normalize_location_label(
        nullif(trim(concat_ws(', ', v_city, v_region, v_country)), '')
      ),
      lodging_idea = nullif(trim(coalesce(p_lodging_idea, '')), ''),
      calling_reflection = nullif(trim(coalesce(p_calling_reflection, '')), ''),
      updated_at = now()
  where s.id = p_season_id
    and s.member_id = v_member
  returning s.plan_id into v_plan_id;

  if v_plan_id is null then
    raise exception 'This seasonal room is not available.' using errcode = '42501';
  end if;

  update public.flowtel_hourly_flow_rate_plans p
  set last_open_section = 'lounge-workshop',
      updated_at = now()
  where p.id = v_plan_id
    and p.member_id = v_member;

  return public.flowtel_hfr_load_plan(false);
end;
$$;

revoke all on function public.flowtel_hfr_save_workshop_season(uuid,text,text,text,text,text) from public;
grant execute on function public.flowtel_hfr_save_workshop_season(uuid,text,text,text,text,text) to authenticated;

create or replace function public.flowtel_current_user_can_view_time_and_space()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select auth.uid() is not null
    and public.flowtel_current_user_has_product_access('flowtel')
    and (
      public.flowtel_current_user_is_phase_one_owner()
      or exists (
        select 1
        from public.profiles p
        join public.flow_fm_priestess_profiles pp on pp.member_id = p.id
        where p.id = auth.uid()
          and pp.status = 'approved'
          and public.flow_fm_effective_membership_rank(
            p.id,p.membership_type,p.membership_rank,p.role,p.flowfm_started_at,p.is_initiated
          ) >= 2
      )
    );
$$;

revoke all on function public.flowtel_current_user_can_view_time_and_space() from public;
grant execute on function public.flowtel_current_user_can_view_time_and_space() to authenticated;

create or replace function public.flowtel_get_time_and_space_team()
returns table (
  member_id uuid,
  display_name text,
  priestess_title text,
  profile_photo_url text,
  location text,
  timezone text,
  hemisphere text
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.flowtel_current_user_can_view_time_and_space() then
    raise exception 'The Time + Space Map is reserved for the approved Priestess Concierge Team.' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    coalesce(nullif(trim(p.display_name), ''), 'Flow FM Priestess'),
    coalesce(nullif(trim(pp.modalities), ''), nullif(trim(p.mentor_title), ''), 'Flow FM Priestess'),
    pp.profile_photo_url,
    p.location,
    p.timezone,
    p.hemisphere
  from public.profiles p
  join public.flow_fm_priestess_profiles pp on pp.member_id = p.id
  left join public.flowtel_product_access a on a.user_id = p.id
  where pp.status = 'approved'
    and public.flow_fm_effective_membership_rank(
      p.id,p.membership_type,p.membership_rank,p.role,p.flowfm_started_at,p.is_initiated
    ) >= 2
    and coalesce(p.flow_fm_team_map_opt_out, false) = false
    and coalesce(a.flowtel_access, true) = true
    and coalesce(a.flowtel_access_status, 'active') <> 'revoked'
  order by lower(coalesce(nullif(trim(p.display_name), ''), 'Flow FM Priestess'));
end;
$$;

comment on function public.flowtel_get_time_and_space_team() is
  'Returns only approved, visibility-enabled Priestess Concierge Team display identity, profile photo, location, timezone, and hemisphere. Legal names, email, clients, cycle data, and admin state are excluded.';

revoke all on function public.flowtel_get_time_and_space_team() from public;
grant execute on function public.flowtel_get_time_and_space_team() to authenticated;
