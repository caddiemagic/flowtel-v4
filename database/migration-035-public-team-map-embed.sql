-- Flowtel migration 035 — Public-safe Queendom Team Map embed
--
-- Creates a deliberately minimal read-only Team Map endpoint for the
-- Squarespace Queendom members-page iframe. The endpoint exposes only fields
-- already intended for the collective map: Priestess display name, public
-- profile photo, chosen external profile URL, and today's actual / Feels Like
-- seasonal placement. It never exposes email, cycle day, reflections, notes,
-- stays, member UUIDs, mentor relationships, or private profile content.

drop function if exists public.flow_fm_get_public_team_map();

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
    coalesce(
      nullif(trim(pp.priestess_name),''),
      nullif(trim(p.first_name),''),
      'Flow FM Priestess'
    ) as priestess_name,
    coalesce(
      nullif(trim(pp.profile_photo_url),''),
      nullif(trim(p.mentor_photo_url),'')
    ) as profile_photo_url,
    nullif(trim(pp.website_url),'') as website_url,
    ts.actual_inner_season,
    ts.feels_like_inner_season
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
$$;

comment on function public.flow_fm_get_public_team_map() is
  'Public-safe daily Flow FM Team Map data for the Queendom iframe embed. Returns no private cycle, stay, reflection, email, relationship, or member-ID data.';

revoke all on function public.flow_fm_get_public_team_map() from public;
grant execute on function public.flow_fm_get_public_team_map() to anon, authenticated;
