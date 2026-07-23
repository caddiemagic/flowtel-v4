-- Flowtel v0.10.73 — Flow FM Initiation Readiness
-- Additive foundation for reusable Inner Season client-call availability and
-- one canonical Flow FM start date. Historical 28-day availability rows remain
-- preserved for rollback and audit purposes.

begin;

-- ---------------------------------------------------------------------------
-- Canonical Flow FM start date
-- ---------------------------------------------------------------------------

create or replace function public.flowtel_set_my_flowfm_start_date(
  p_started_at date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member uuid := auth.uid();
  v_today date := (timezone('America/Los_Angeles', now()))::date;
  v_profile public.profiles%rowtype;
begin
  if v_member is null then
    raise exception 'Sign in to confirm your Flow FM start date.' using errcode = '28000';
  end if;

  select * into v_profile from public.profiles where id = v_member;
  if v_profile.id is null then
    raise exception 'Your Flowtel profile could not be found.' using errcode = '22023';
  end if;

  if coalesce(v_profile.membership_rank, 0) < 2
     and lower(coalesce(v_profile.membership_type, '')) not in ('flowfm', 'council')
     and lower(coalesce(v_profile.role, '')) not in ('practitioner', 'admin', 'owner') then
    raise exception 'A Flow FM membership is required to set this date.' using errcode = '42501';
  end if;

  if p_started_at is null then
    raise exception 'Choose your Flow FM start date.' using errcode = '22023';
  end if;

  if p_started_at > v_today then
    raise exception 'Your Flow FM start date cannot be in the future.' using errcode = '22023';
  end if;

  update public.profiles
  set flowfm_started_at = p_started_at
  where id = v_member
  returning * into v_profile;

  return to_jsonb(v_profile);
end;
$$;

revoke all on function public.flowtel_set_my_flowfm_start_date(date) from public;
grant execute on function public.flowtel_set_my_flowfm_start_date(date) to authenticated;

create or replace function public.flowtel_admin_set_flowfm_start_date(
  p_member_id uuid,
  p_started_at date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (timezone('America/Los_Angeles', now()))::date;
  v_profile public.profiles%rowtype;
begin
  if not public.flowtel_current_user_is_phase_one_owner() then
    raise exception 'Only the Flowtel owner may update another member''s Flow FM start date.' using errcode = '42501';
  end if;

  if p_member_id is null then
    raise exception 'Choose a Flow FM member.' using errcode = '22023';
  end if;

  if p_started_at is null then
    raise exception 'Choose the Flow FM start date.' using errcode = '22023';
  end if;

  if p_started_at > v_today then
    raise exception 'The Flow FM start date cannot be in the future.' using errcode = '22023';
  end if;

  update public.profiles
  set flowfm_started_at = p_started_at
  where id = p_member_id
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'That Flow FM member could not be found.' using errcode = '22023';
  end if;

  return to_jsonb(v_profile);
end;
$$;

revoke all on function public.flowtel_admin_set_flowfm_start_date(uuid,date) from public;
grant execute on function public.flowtel_admin_set_flowfm_start_date(uuid,date) to authenticated;

-- ---------------------------------------------------------------------------
-- Reusable Inner Season weekly availability for 1:1 client-facing calls
-- ---------------------------------------------------------------------------

create table if not exists public.flowtel_flow_fm_availability_windows (
  member_id uuid not null references public.profiles(id) on delete cascade,
  inner_season text not null,
  weekday smallint not null,
  window_order smallint not null default 1,
  starts_at time without time zone not null,
  ends_at time without time zone not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (member_id, inner_season, weekday, window_order),
  constraint flowtel_availability_window_season_check
    check (inner_season in ('Inner Winter','Inner Spring','Inner Summer','Inner Autumn')),
  constraint flowtel_availability_window_weekday_check check (weekday between 1 and 7),
  constraint flowtel_availability_window_order_check check (window_order between 1 and 8),
  constraint flowtel_availability_window_time_check check (starts_at < ends_at)
);

comment on table public.flowtel_flow_fm_availability_windows is
  'Mutable weekly preference windows for 1:1 client-facing calls by Inner Season. No date or Moon-day attachment.';

create index if not exists flowtel_flow_fm_availability_windows_member_idx
  on public.flowtel_flow_fm_availability_windows(member_id, inner_season, weekday, window_order);

alter table public.flowtel_flow_fm_availability_windows enable row level security;
revoke all on public.flowtel_flow_fm_availability_windows from anon;
revoke insert, update, delete on public.flowtel_flow_fm_availability_windows from authenticated;
grant select on public.flowtel_flow_fm_availability_windows to authenticated;

drop policy if exists "Members read their own seasonal availability" on public.flowtel_flow_fm_availability_windows;
create policy "Members read their own seasonal availability"
  on public.flowtel_flow_fm_availability_windows for select to authenticated
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

  -- Keep the prior 28-day payload available to older cached pages. The new
  -- v0.10.73 interface does not read these dates or Moon fields.
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
  v_order integer;
  v_start time;
  v_end time;
begin
  if p_inner_season not in ('Inner Winter','Inner Spring','Inner Summer','Inner Autumn') then
    raise exception 'Choose a valid Inner Season.' using errcode = '22023';
  end if;

  if p_days is null or jsonb_typeof(p_days) <> 'array' then
    raise exception 'Availability days must be provided as a list.' using errcode = '22023';
  end if;

  if jsonb_array_length(p_days) <> 7 then
    raise exception 'Include Monday through Sunday before saving.' using errcode = '22023';
  end if;

  if (
    select count(distinct nullif(day->>'weekday','')::integer)
    from jsonb_array_elements(p_days) as item(day)
  ) <> 7 then
    raise exception 'Each weekday may appear once.' using errcode = '22023';
  end if;

  delete from public.flowtel_flow_fm_availability_windows
  where member_id = v_member and inner_season = p_inner_season;

  for v_day in select value from jsonb_array_elements(p_days)
  loop
    v_weekday := nullif(v_day->>'weekday', '')::integer;
    v_available := coalesce((v_day->>'available')::boolean, false);

    if v_weekday not between 1 and 7 then
      raise exception 'Choose a weekday from Monday through Sunday.' using errcode = '22023';
    end if;

    if v_available then
      if jsonb_typeof(coalesce(v_day->'windows', '[]'::jsonb)) <> 'array'
         or jsonb_array_length(coalesce(v_day->'windows', '[]'::jsonb)) = 0 then
        raise exception 'Add at least one time window for every available day.' using errcode = '22023';
      end if;

      v_order := 0;
      for v_window in select value from jsonb_array_elements(v_day->'windows')
      loop
        v_order := v_order + 1;
        if v_order > 8 then
          raise exception 'A weekday may contain up to eight time windows.' using errcode = '22023';
        end if;
        begin
          v_start := (v_window->>'start')::time;
          v_end := (v_window->>'end')::time;
        exception when others then
          raise exception 'Use valid start and end times.' using errcode = '22023';
        end;
        if v_start >= v_end then
          raise exception 'Each availability window must end after it begins.' using errcode = '22023';
        end if;

        insert into public.flowtel_flow_fm_availability_windows(
          member_id, inner_season, weekday, window_order, starts_at, ends_at
        ) values (
          v_member, p_inner_season, v_weekday, v_order, v_start, v_end
        );
      end loop;
    end if;
  end loop;

  return public.flowtel_availability_load();
end;
$$;

revoke all on function public.flowtel_availability_save_season(text,jsonb) from public;
grant execute on function public.flowtel_availability_save_season(text,jsonb) to authenticated;

commit;
