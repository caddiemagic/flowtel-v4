-- Flowtel v0.10.43 — Team Map Website Card
-- Adds the latest saved Priestess website URL to authenticated Team Map cards.
-- Visit Her Queendom remains approval-gated; the external website doorway may appear
-- as soon as a Flow FM member intentionally saves a valid website URL.

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
    case when pp.status = 'approved' then coalesce(nullif(trim(pp.modalities),''),nullif(trim(p.mentor_title),'')) else null end as priestess_title,
    case when pp.status = 'approved' then coalesce(nullif(trim(pp.bio),''),nullif(trim(p.mentor_bio),'')) else null end as profile_intro,
    nullif(trim(pp.website_url),'') as website_url,
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
