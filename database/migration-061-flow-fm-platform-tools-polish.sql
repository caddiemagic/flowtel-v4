-- Flowtel v0.10.76 — Flow FM Platform + Tools Polish
-- Adds persistent weekday open/closed state without deleting saved time windows,
-- and an owner-only Hourly Flow Rate summary for the Priestess Team profile.

begin;

-- ---------------------------------------------------------------------------
-- Inner Season Availability: preserve windows when a day is temporarily closed
-- ---------------------------------------------------------------------------

create table if not exists public.flowtel_flow_fm_availability_day_states (
  member_id uuid not null references public.profiles(id) on delete cascade,
  inner_season text not null,
  weekday smallint not null,
  is_available boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (member_id, inner_season, weekday),
  constraint flowtel_availability_day_state_season_check
    check (inner_season in ('Inner Winter','Inner Spring','Inner Summer','Inner Autumn')),
  constraint flowtel_availability_day_state_weekday_check check (weekday between 1 and 7)
);

comment on table public.flowtel_flow_fm_availability_day_states is
  'Current open/closed preference for each weekday and Inner Season. Saved time windows remain preserved when a day is closed.';

insert into public.flowtel_flow_fm_availability_day_states(member_id,inner_season,weekday,is_available)
select distinct member_id,inner_season,weekday,true
from public.flowtel_flow_fm_availability_windows
on conflict (member_id,inner_season,weekday) do nothing;

alter table public.flowtel_flow_fm_availability_day_states enable row level security;
revoke all on public.flowtel_flow_fm_availability_day_states from anon;
revoke insert, update, delete on public.flowtel_flow_fm_availability_day_states from authenticated;
grant select on public.flowtel_flow_fm_availability_day_states to authenticated;

drop policy if exists "Members read their seasonal availability day states" on public.flowtel_flow_fm_availability_day_states;
create policy "Members read their seasonal availability day states"
  on public.flowtel_flow_fm_availability_day_states for select to authenticated
  using (member_id = auth.uid());

create or replace function public.flowtel_availability_load()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_member uuid := public.flowtel_hfr_require_member();
  v_timezone text;
  v_today date := (timezone('America/Los_Angeles',now()))::date;
  v_anchor date;
  v_source text := 'planning_reference';
  v_latest record;
begin
  select coalesce(nullif(trim(p.timezone), ''), 'America/Los_Angeles')
  into v_timezone
  from public.profiles p
  where p.id = v_member;

  -- Preserve the prior 28-day compatibility payload for cached pages.
  select s.cycle_start_date::date as cycle_start_date,
         s.checkin_date::date as checkin_date,
         coalesce(s.cycle_day_actual,s.cycle_day_calculated,s.cycle_day_claimed) as cycle_day
  into v_latest
  from public.flowtel_stays s
  where s.client_id = v_member
  order by s.checkin_date desc,s.checked_in_at desc
  limit 1;

  if v_latest.cycle_start_date is not null then
    v_anchor := v_latest.cycle_start_date;
    v_source := 'cycle_start_date';
  elsif v_latest.checkin_date is not null and coalesce(v_latest.cycle_day,0) > 0 then
    v_anchor := v_latest.checkin_date - (v_latest.cycle_day - 1);
    v_source := 'latest_checkin';
  else
    v_anchor := v_today;
  end if;

  return jsonb_build_object(
    'timezone', coalesce(v_timezone, 'America/Los_Angeles'),
    'weekly_days', coalesce((
      select jsonb_agg(jsonb_build_object(
        'inner_season', d.inner_season,
        'weekday', d.weekday,
        'is_available', d.is_available
      ) order by
        case d.inner_season
          when 'Inner Winter' then 1
          when 'Inner Spring' then 2
          when 'Inner Summer' then 3
          else 4
        end,
        d.weekday)
      from public.flowtel_flow_fm_availability_day_states d
      where d.member_id = v_member
    ), '[]'::jsonb),
    'windows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'inner_season', w.inner_season,
        'weekday', w.weekday,
        'window_order', w.window_order,
        'starts_at', to_char(w.starts_at, 'HH24:MI'),
        'ends_at', to_char(w.ends_at, 'HH24:MI')
      ) order by
        case w.inner_season
          when 'Inner Winter' then 1
          when 'Inner Spring' then 2
          when 'Inner Summer' then 3
          else 4
        end,
        w.weekday,
        w.window_order)
      from public.flowtel_flow_fm_availability_windows w
      where w.member_id = v_member
    ), '[]'::jsonb),
    'anchor_date',v_anchor,
    'anchor_source',v_source,
    'flowtel_date',v_today,
    'days',(
      select jsonb_agg(jsonb_build_object(
        'cycle_day',d.cycle_day,
        'calendar_date',d.calendar_date,
        'availability_season',case when d.cycle_day <= 7 then 'Inner Winter' when d.cycle_day <= 14 then 'Inner Spring' when d.cycle_day <= 21 then 'Inner Summer' else 'Inner Autumn' end,
        'actual_inner_season',case when d.cycle_day <= 5 then 'Inner Winter' when d.cycle_day <= 11 then 'Inner Spring' when d.cycle_day <= 19 then 'Inner Summer' when d.cycle_day <= 26 then 'Inner Autumn' else 'Inner Winter' end,
        'moon_day',(d.calendar_date - public.flowtel_moon_cycle_start_for_date(d.calendar_date)) + 1,
        'moon_phase',case
          when ((d.calendar_date - public.flowtel_moon_cycle_start_for_date(d.calendar_date)) + 1) between 1 and 5 then 'New Moon Phase'
          when ((d.calendar_date - public.flowtel_moon_cycle_start_for_date(d.calendar_date)) + 1) between 6 and 11 then 'First Quarter Phase'
          when ((d.calendar_date - public.flowtel_moon_cycle_start_for_date(d.calendar_date)) + 1) between 12 and 19 then 'Full Moon Phase'
          else 'Last Quarter Phase' end,
        'weekday_planet',case extract(isodow from d.calendar_date)::integer
          when 1 then 'Moon' when 2 then 'Mars' when 3 then 'Mercury' when 4 then 'Jupiter'
          when 5 then 'Venus' when 6 then 'Saturn' else 'Sun' end,
        'is_available',coalesce(a.is_available,false),
        'availability_note',a.availability_note
      ) order by d.cycle_day)
      from (
        select series as cycle_day,(v_anchor + (series-1))::date as calendar_date
        from generate_series(1,28) series
      ) d
      left join public.flowtel_flow_fm_availability_days a
        on a.member_id=v_member and a.cycle_day=d.cycle_day
    )
  );
end;
$$;

revoke all on function public.flowtel_availability_load() from public;
grant execute on function public.flowtel_availability_load() to authenticated;

create or replace function public.flowtel_availability_save_season(
  p_inner_season text,
  p_days jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member uuid := public.flowtel_hfr_require_member();
  v_day jsonb;
  v_window jsonb;
  v_weekday integer;
  v_available boolean;
  v_windows jsonb;
  v_order integer;
  v_start time;
  v_end time;
begin
  if p_inner_season not in ('Inner Winter','Inner Spring','Inner Summer','Inner Autumn') then
    raise exception 'Choose a valid Inner Season.' using errcode = '22023';
  end if;
  if p_days is null or jsonb_typeof(p_days) <> 'array' or jsonb_array_length(p_days) <> 7 then
    raise exception 'Include Monday through Sunday before saving.' using errcode = '22023';
  end if;
  if (
    select count(distinct nullif(day->>'weekday','')::integer)
    from jsonb_array_elements(p_days) as item(day)
  ) <> 7 then
    raise exception 'Each weekday may appear once.' using errcode = '22023';
  end if;

  for v_day in select value from jsonb_array_elements(p_days)
  loop
    v_weekday := nullif(v_day->>'weekday', '')::integer;
    v_available := coalesce((v_day->>'available')::boolean, false);
    v_windows := coalesce(v_day->'windows', '[]'::jsonb);

    if v_weekday not between 1 and 7 then
      raise exception 'Choose a weekday from Monday through Sunday.' using errcode = '22023';
    end if;
    if jsonb_typeof(v_windows) <> 'array' then
      raise exception 'Availability windows must be provided as a list.' using errcode = '22023';
    end if;
    if v_available and jsonb_array_length(v_windows) = 0 then
      raise exception 'Add at least one time window for every available day.' using errcode = '22023';
    end if;
    if jsonb_array_length(v_windows) > 8 then
      raise exception 'A weekday may contain up to eight time windows.' using errcode = '22023';
    end if;

    insert into public.flowtel_flow_fm_availability_day_states(
      member_id,inner_season,weekday,is_available,updated_at
    ) values (
      v_member,p_inner_season,v_weekday,v_available,now()
    )
    on conflict (member_id,inner_season,weekday) do update
      set is_available=excluded.is_available,updated_at=now();

    -- The page always returns the currently retained windows, even while the
    -- day is closed. Replacing this one weekday preserves deliberate edits and
    -- prevents closing a day from destroying its schedule.
    delete from public.flowtel_flow_fm_availability_windows
    where member_id=v_member and inner_season=p_inner_season and weekday=v_weekday;

    v_order := 0;
    for v_window in select value from jsonb_array_elements(v_windows)
    loop
      v_order := v_order + 1;
      begin
        v_start := (v_window->>'start')::time;
        v_end := (v_window->>'end')::time;
      exception when others then
        raise exception 'Use valid start and end times.' using errcode='22023';
      end;
      if v_start >= v_end then
        raise exception 'Each availability window must end after it begins.' using errcode='22023';
      end if;
      insert into public.flowtel_flow_fm_availability_windows(
        member_id,inner_season,weekday,window_order,starts_at,ends_at
      ) values (
        v_member,p_inner_season,v_weekday,v_order,v_start,v_end
      );
    end loop;
  end loop;

  return public.flowtel_availability_load();
end;
$$;

revoke all on function public.flowtel_availability_save_season(text,jsonb) from public;
grant execute on function public.flowtel_availability_save_season(text,jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Owner profile: concise Hourly Flow Rate result
-- ---------------------------------------------------------------------------

create or replace function public.flowtel_admin_get_member_hourly_flow_rate(p_member_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_plan public.flowtel_hourly_flow_rate_plans%rowtype;
  v_calculation jsonb;
  v_raw numeric := 0;
begin
  if not public.flowtel_current_user_is_phase_one_owner() then
    raise exception 'Only the Flowtel owner may view a member Hourly Flow Rate.' using errcode='42501';
  end if;
  if p_member_id is null then
    raise exception 'Choose a Flow FM member.' using errcode='22023';
  end if;

  select * into v_plan
  from public.flowtel_hourly_flow_rate_plans
  where member_id=p_member_id
  order by updated_at desc
  limit 1;

  if v_plan.id is null then
    return jsonb_build_object(
      'has_plan',false,
      'has_monetary_value',false,
      'base_currency','USD',
      'hourly_flow_rate',null,
      'hourly_flow_rate_rounded_up',null
    );
  end if;

  v_calculation := public.flowtel_hfr_calculation(v_plan.id);
  v_raw := coalesce((v_calculation->>'hourly_flow_rate')::numeric,0);
  return jsonb_build_object(
    'has_plan',true,
    'has_monetary_value',coalesce((v_calculation->>'has_monetary_value')::boolean,false),
    'base_currency',v_plan.base_currency,
    'hourly_flow_rate',v_raw,
    'hourly_flow_rate_rounded_up',case when v_raw>0 then ceil(v_raw)::integer else 0 end,
    'annual_vision_total',coalesce((v_calculation->>'annual_vision_total')::numeric,0),
    'updated_at',v_plan.updated_at
  );
end;
$$;

revoke all on function public.flowtel_admin_get_member_hourly_flow_rate(uuid) from public;
grant execute on function public.flowtel_admin_get_member_hourly_flow_rate(uuid) to authenticated;

commit;
