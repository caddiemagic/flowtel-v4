-- Flowtel v0.9.18 — Master Powder Room Sharing
-- Moves Powder Room consent from reflection-level controls to one profile-level setting.

alter table public.profiles
  add column if not exists collective_season_notes_opt_out boolean not null default false;

comment on column public.profiles.collective_season_notes_opt_out is
  'When true, this guest''s reflections and checkout notes are excluded from anonymous Powder Room views.';

-- Guests need to be able to update their own privacy setting from the Suite.
alter table public.profiles enable row level security;

drop policy if exists "Guests can update their own profile privacy settings" on public.profiles;
create policy "Guests can update their own profile privacy settings"
  on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Reflection-level consent has been retired. Existing per-reflection flags are
-- normalized back to true so the profile-level opt-out is the single source of truth.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='flowtel_reflections' and column_name='share_in_powder_rooms'
  ) then
    update public.flowtel_reflections set share_in_powder_rooms = true where coalesce(share_in_powder_rooms,false) = false;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='flowtel_stays' and column_name='reflection_share_in_powder_rooms'
  ) then
    update public.flowtel_stays set reflection_share_in_powder_rooms = true where coalesce(reflection_share_in_powder_rooms,false) = false;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='flowtel_stays' and column_name='checkout_share_in_powder_rooms'
  ) then
    update public.flowtel_stays set checkout_share_in_powder_rooms = true where coalesce(checkout_share_in_powder_rooms,false) = false;
  end if;
end $$;

create or replace function public.flowtel_get_collective_season_reflections(
  p_inner_season text default null,
  p_moon_phase text default null,
  p_start_date date default null,
  p_end_date date default null,
  p_moon_cycle_start date default null
)
returns table (
  entry_id text,
  checkin_date date,
  reflection_created_at timestamptz,
  cycle_day_actual integer,
  cycle_day_recorded integer,
  inner_season text,
  feels_like_inner_season text,
  moon_phase text,
  moon_day integer,
  moon_inner_season text,
  moon_theme text,
  moon_cycle_start_date date,
  reflection_text text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'You must be signed in to read seasonal reflections.' using errcode = '28000';
  end if;

  return query
  with reflection_entries as (
    select
      r.id::text as entry_id,
      s.id as stay_id,
      s.client_id,
      s.checkin_date::date as checkin_date,
      r.created_at as reflection_created_at,
      coalesce(s.cycle_day_actual, s.cycle_day_calculated, s.cycle_day_claimed) as cycle_day_actual,
      coalesce(s.cycle_day_recorded, s.cycle_day_claimed) as cycle_day_recorded,
      s.inner_season,
      s.feels_like_inner_season,
      s.moon_phase,
      s.moon_day,
      s.moon_inner_season,
      s.moon_theme,
      public.flowtel_moon_cycle_start_for_date(s.checkin_date::date) as moon_cycle_start_date,
      r.reflection as reflection_text
    from public.flowtel_reflections r
    join public.flowtel_stays s on s.id = r.stay_id

    union all

    select
      ('stay-' || s.id::text) as entry_id,
      s.id as stay_id,
      s.client_id,
      s.checkin_date::date as checkin_date,
      coalesce(s.updated_at, s.checked_in_at) as reflection_created_at,
      coalesce(s.cycle_day_actual, s.cycle_day_calculated, s.cycle_day_claimed) as cycle_day_actual,
      coalesce(s.cycle_day_recorded, s.cycle_day_claimed) as cycle_day_recorded,
      s.inner_season,
      s.feels_like_inner_season,
      s.moon_phase,
      s.moon_day,
      s.moon_inner_season,
      s.moon_theme,
      public.flowtel_moon_cycle_start_for_date(s.checkin_date::date) as moon_cycle_start_date,
      s.reflection as reflection_text
    from public.flowtel_stays s
    where nullif(s.reflection,'') is not null
      and not exists (
        select 1 from public.flowtel_reflections r where r.stay_id = s.id
      )

    union all

    select
      ('checkout-' || s.id::text) as entry_id,
      s.id as stay_id,
      s.client_id,
      s.checkin_date::date as checkin_date,
      coalesce(s.checked_out_at, s.updated_at, s.checked_in_at) as reflection_created_at,
      coalesce(s.cycle_day_actual, s.cycle_day_calculated, s.cycle_day_claimed) as cycle_day_actual,
      coalesce(s.cycle_day_recorded, s.cycle_day_claimed) as cycle_day_recorded,
      s.inner_season,
      s.feels_like_inner_season,
      s.moon_phase,
      s.moon_day,
      s.moon_inner_season,
      s.moon_theme,
      public.flowtel_moon_cycle_start_for_date(s.checkin_date::date) as moon_cycle_start_date,
      s.checkout_notes as reflection_text
    from public.flowtel_stays s
    where nullif(s.checkout_notes,'') is not null
  )
  select
    e.entry_id,
    e.checkin_date,
    e.reflection_created_at,
    e.cycle_day_actual,
    e.cycle_day_recorded,
    e.inner_season,
    e.feels_like_inner_season,
    e.moon_phase,
    e.moon_day,
    e.moon_inner_season,
    e.moon_theme,
    e.moon_cycle_start_date,
    e.reflection_text
  from reflection_entries e
  join public.profiles p on p.id = e.client_id
  where nullif(e.reflection_text,'') is not null
    and coalesce(p.collective_season_notes_opt_out, false) = false
    and (p_inner_season is null or e.inner_season = p_inner_season)
    and (p_moon_phase is null or e.moon_phase = p_moon_phase)
    and (p_start_date is null or e.checkin_date >= p_start_date)
    and (p_end_date is null or e.checkin_date <= p_end_date)
    and (p_moon_cycle_start is null or e.moon_cycle_start_date = p_moon_cycle_start)
  order by e.checkin_date desc, e.reflection_created_at desc
  limit 500;
end;
$$;

grant execute on function public.flowtel_get_collective_season_reflections(text, text, date, date, date) to authenticated;
