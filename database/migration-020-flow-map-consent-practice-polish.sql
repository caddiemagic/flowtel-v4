-- Flowtel Release 0.9.17
-- Flow Map Consent + Practice Polish
--
-- Purpose:
-- 1. Add reflection-level anonymous Powder Room sharing controls.
-- 2. Add checkout-note sharing controls so checkout notes can join Flow Maps and Powder Rooms.
-- 3. Add mentor scheduling URL fields for the Suite Schedule Call button.
-- 4. Refresh cycle-data and Powder Room RPCs so Flow Map practice can include checkout notes without showing quiet/no-note check-ins.

alter table public.flowtel_reflections
  add column if not exists share_in_powder_rooms boolean not null default true;

comment on column public.flowtel_reflections.share_in_powder_rooms is
  'When false, this individual reflection is kept out of anonymous Powder Room views.';

alter table public.flowtel_stays
  add column if not exists reflection_share_in_powder_rooms boolean not null default true,
  add column if not exists checkout_share_in_powder_rooms boolean not null default true;

comment on column public.flowtel_stays.reflection_share_in_powder_rooms is
  'Fallback sharing preference for the stay-level reflection field when no reflection-log row exists.';
comment on column public.flowtel_stays.checkout_share_in_powder_rooms is
  'When false, checkout_notes for this stay are kept out of anonymous Powder Room views.';

alter table public.profiles
  add column if not exists mentor_scheduling_url text,
  add column if not exists scheduling_url text,
  add column if not exists booking_url text;

comment on column public.profiles.mentor_scheduling_url is
  'Optional public scheduling URL used by the Suite Schedule Call button for connected mentors.';

-- Keep existing relationship/data-access rules, but make sure the function exists
-- even in databases that skipped an earlier local patch.
create or replace function public.flowtel_can_view_cycle_subject(p_subject_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and p_subject_id is not null
    and (
      p_subject_id = auth.uid()
      or public.flowtel_current_user_is_admin_or_owner()
      or exists (
        select 1
        from public.flowtel_practitioner_relationships r
        where r.client_id = p_subject_id
          and r.practitioner_id = auth.uid()
          and r.status = 'connected'
          and coalesce(r.consent_granted, false) = true
      )
    );
$$;

grant execute on function public.flowtel_can_view_cycle_subject(uuid) to authenticated;

drop function if exists public.flowtel_get_cycle_data_entries(uuid, text);

create or replace function public.flowtel_get_cycle_data_entries(
  p_subject_id uuid default null,
  p_scope text default 'self'
)
returns table (
  stay_id uuid,
  client_id uuid,
  client_name text,
  checkin_date date,
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  cycle_day_actual integer,
  cycle_day_recorded integer,
  cycle_day_difference integer,
  cycle_day_match_status text,
  cycle_accuracy_message text,
  cycle_start_date date,
  previous_cycle_length_days integer,
  inner_season text,
  feels_like_inner_season text,
  moon_phase text,
  moon_day integer,
  moon_inner_season text,
  moon_theme text,
  moon_cycle_start_date date,
  reflection_text text,
  reflection_created_at timestamptz,
  checkout_notes text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_scope text := coalesce(nullif(p_scope,''),'self');
begin
  if v_user_id is null then
    raise exception 'You must be signed in to view cycle data.' using errcode = '28000';
  end if;

  select role into v_role from public.profiles where id = v_user_id;

  if p_subject_id is not null and not public.flowtel_can_view_cycle_subject(p_subject_id) then
    raise exception 'This cycle dashboard is only available with active consent.' using errcode = '42501';
  end if;

  if v_scope in ('all','clients') and coalesce(v_role,'') not in ('practitioner','admin','owner') then
    raise exception 'Only mentors and admins can view client cycle data.' using errcode = '42501';
  end if;

  return query
  select
    s.id as stay_id,
    s.client_id,
    coalesce(nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), p.email, 'Flowtel Guest') as client_name,
    s.checkin_date::date as checkin_date,
    s.checked_in_at,
    s.checked_out_at,
    coalesce(s.cycle_day_actual, s.cycle_day_calculated, s.cycle_day_claimed) as cycle_day_actual,
    coalesce(s.cycle_day_recorded, s.cycle_day_claimed) as cycle_day_recorded,
    coalesce(
      s.cycle_day_difference,
      coalesce(s.cycle_day_recorded, s.cycle_day_claimed, 0) - coalesce(s.cycle_day_actual, s.cycle_day_calculated, s.cycle_day_claimed, 0)
    ) as cycle_day_difference,
    s.cycle_day_match_status,
    s.cycle_accuracy_message,
    s.cycle_start_date::date as cycle_start_date,
    s.previous_cycle_length_days,
    s.inner_season,
    s.feels_like_inner_season,
    s.moon_phase,
    s.moon_day,
    s.moon_inner_season,
    s.moon_theme,
    public.flowtel_moon_cycle_start_for_date(s.checkin_date::date) as moon_cycle_start_date,
    coalesce(lr.reflection, nullif(s.reflection,'')) as reflection_text,
    coalesce(lr.created_at, s.updated_at, s.checked_in_at) as reflection_created_at,
    s.checkout_notes
  from public.flowtel_stays s
  join public.profiles p on p.id = s.client_id
  left join lateral (
    select r.reflection, r.created_at
    from public.flowtel_reflections r
    where r.stay_id = s.id
    order by r.created_at desc
    limit 1
  ) lr on true
  where
    case
      when p_subject_id is not null then s.client_id = p_subject_id
      when v_scope = 'self' then s.client_id = v_user_id
      when v_scope in ('all','clients') and coalesce(v_role,'') in ('admin','owner') then true
      when v_scope in ('all','clients') and coalesce(v_role,'') = 'practitioner' then exists (
        select 1
        from public.flowtel_practitioner_relationships r
        where r.client_id = s.client_id
          and r.practitioner_id = v_user_id
          and r.status = 'connected'
          and coalesce(r.consent_granted, false) = true
      )
      else false
    end
  order by s.checkin_date desc, s.checked_in_at desc
  limit 1000;
end;
$$;

grant execute on function public.flowtel_get_cycle_data_entries(uuid, text) to authenticated;

drop function if exists public.flowtel_get_collective_season_reflections(text, text, date, date, date);

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
    where coalesce(r.share_in_powder_rooms, true) = true

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
      and coalesce(s.reflection_share_in_powder_rooms, true) = true
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
      and coalesce(s.checkout_share_in_powder_rooms, true) = true
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
