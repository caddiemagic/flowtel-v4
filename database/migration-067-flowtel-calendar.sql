-- Flowtel v0.10.83 — The Flowtel Calendar
--
-- 1. Materialize monthly Priestess availability from saved Inner Season rhythms.
-- 2. Preserve date-specific overrides without changing the recurring seasonal template.
-- 3. Alert the Flowtel owner when a month is submitted or a submitted month changes,
--    with an explicit owner acknowledgement after Acuity is updated.
-- 4. Add the assigned Priestess name to the existing owner-wide Upcoming Calls view.
-- 5. Create the unified Queendom event calendar, Save My Seat registrations, protected Zoom joins, event artwork, and public embed feed.

begin;

-- ---------------------------------------------------------------------------
-- Monthly cycle-aware Availability calendar
-- ---------------------------------------------------------------------------

create table if not exists public.flowtel_flow_fm_availability_months (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  month_start date not null,
  status text not null default 'draft',
  projection_anchor_date date,
  projection_anchor_source text,
  first_submitted_at timestamptz,
  last_submitted_at timestamptz,
  owner_acknowledged_at timestamptz,
  owner_acknowledged_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(member_id, month_start),
  constraint flowtel_availability_month_first_day_check
    check (month_start = date_trunc('month', month_start)::date),
  constraint flowtel_availability_month_status_check
    check (status in ('draft','submitted'))
);

comment on table public.flowtel_flow_fm_availability_months is
  'Monthly operational Availability snapshot generated from a member''s Inner Season rhythm. First submission creates an owner Acuity-update alert; later date changes reopen that alert.';

create table if not exists public.flowtel_flow_fm_availability_month_days (
  member_id uuid not null references public.profiles(id) on delete cascade,
  month_start date not null,
  calendar_date date not null,
  projected_cycle_day smallint not null,
  projected_inner_season text not null,
  is_available boolean not null default false,
  is_override boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(member_id, calendar_date),
  foreign key(member_id, month_start)
    references public.flowtel_flow_fm_availability_months(member_id, month_start)
    on delete cascade,
  constraint flowtel_availability_month_day_cycle_check
    check (projected_cycle_day between 1 and 28),
  constraint flowtel_availability_month_day_season_check
    check (projected_inner_season in ('Inner Winter','Inner Spring','Inner Summer','Inner Autumn')),
  constraint flowtel_availability_month_day_month_check
    check (calendar_date >= month_start and calendar_date < (month_start + interval '1 month')::date)
);

comment on table public.flowtel_flow_fm_availability_month_days is
  'One date in a Priestess monthly availability calendar. Non-overrides may refresh from the current cycle projection while the month is still a draft.';

create table if not exists public.flowtel_flow_fm_availability_month_windows (
  member_id uuid not null,
  calendar_date date not null,
  window_order smallint not null,
  starts_at time without time zone not null,
  ends_at time without time zone not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(member_id, calendar_date, window_order),
  foreign key(member_id, calendar_date)
    references public.flowtel_flow_fm_availability_month_days(member_id, calendar_date)
    on delete cascade,
  constraint flowtel_availability_month_window_order_check check (window_order between 1 and 8),
  constraint flowtel_availability_month_window_time_check check (starts_at < ends_at)
);

comment on table public.flowtel_flow_fm_availability_month_windows is
  'Exact local-time windows for an individual date in a submitted or draft Flow FM Availability month.';

create index if not exists flowtel_flow_fm_availability_months_member_idx
  on public.flowtel_flow_fm_availability_months(member_id, month_start);
create index if not exists flowtel_flow_fm_availability_months_owner_attention_idx
  on public.flowtel_flow_fm_availability_months(owner_acknowledged_at, month_start)
  where first_submitted_at is not null;
create index if not exists flowtel_flow_fm_availability_month_days_month_idx
  on public.flowtel_flow_fm_availability_month_days(member_id, month_start, calendar_date);

alter table public.flowtel_flow_fm_availability_months enable row level security;
alter table public.flowtel_flow_fm_availability_month_days enable row level security;
alter table public.flowtel_flow_fm_availability_month_windows enable row level security;

revoke all on public.flowtel_flow_fm_availability_months from anon;
revoke all on public.flowtel_flow_fm_availability_month_days from anon;
revoke all on public.flowtel_flow_fm_availability_month_windows from anon;
revoke insert, update, delete on public.flowtel_flow_fm_availability_months from authenticated;
revoke insert, update, delete on public.flowtel_flow_fm_availability_month_days from authenticated;
revoke insert, update, delete on public.flowtel_flow_fm_availability_month_windows from authenticated;
grant select on public.flowtel_flow_fm_availability_months to authenticated;
grant select on public.flowtel_flow_fm_availability_month_days to authenticated;
grant select on public.flowtel_flow_fm_availability_month_windows to authenticated;

drop policy if exists "Members read their own availability months" on public.flowtel_flow_fm_availability_months;
create policy "Members read their own availability months"
  on public.flowtel_flow_fm_availability_months for select to authenticated
  using (member_id = auth.uid());

drop policy if exists "Members read their own availability month days" on public.flowtel_flow_fm_availability_month_days;
create policy "Members read their own availability month days"
  on public.flowtel_flow_fm_availability_month_days for select to authenticated
  using (member_id = auth.uid());

drop policy if exists "Members read their own availability month windows" on public.flowtel_flow_fm_availability_month_windows;
create policy "Members read their own availability month windows"
  on public.flowtel_flow_fm_availability_month_windows for select to authenticated
  using (member_id = auth.uid());

-- Internal payload builder. Direct execution is intentionally withheld from
-- client roles; member/owner RPCs below are the permission boundary.
create or replace function public.flowtel_availability_month_payload(
  p_member_id uuid,
  p_month_start date
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'member_id', m.member_id,
    'month_start', m.month_start,
    'status', m.status,
    'projection_anchor_date', m.projection_anchor_date,
    'projection_anchor_source', m.projection_anchor_source,
    'first_submitted_at', m.first_submitted_at,
    'last_submitted_at', m.last_submitted_at,
    'owner_acknowledged_at', m.owner_acknowledged_at,
    'updated_at', m.updated_at,
    'days', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'calendar_date', d.calendar_date,
          'projected_cycle_day', d.projected_cycle_day,
          'projected_inner_season', d.projected_inner_season,
          'is_available', d.is_available,
          'is_override', d.is_override,
          'updated_at', d.updated_at,
          'windows', coalesce((
            select jsonb_agg(jsonb_build_object(
              'start', to_char(w.starts_at,'HH24:MI'),
              'end', to_char(w.ends_at,'HH24:MI')
            ) order by w.window_order)
            from public.flowtel_flow_fm_availability_month_windows w
            where w.member_id=d.member_id and w.calendar_date=d.calendar_date
          ), '[]'::jsonb)
        ) order by d.calendar_date
      )
      from public.flowtel_flow_fm_availability_month_days d
      where d.member_id=m.member_id and d.month_start=m.month_start
    ), '[]'::jsonb)
  )
  from public.flowtel_flow_fm_availability_months m
  where m.member_id=p_member_id and m.month_start=p_month_start;
$$;

revoke all on function public.flowtel_availability_month_payload(uuid,date) from public;
revoke all on function public.flowtel_availability_month_payload(uuid,date) from anon;
revoke all on function public.flowtel_availability_month_payload(uuid,date) from authenticated;

create or replace function public.flowtel_availability_month_load(
  p_month_start date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member uuid := public.flowtel_hfr_require_member();
  v_timezone text := 'America/Los_Angeles';
  v_today date;
  v_current_month date;
  v_month_start date;
  v_month public.flowtel_flow_fm_availability_months%rowtype;
  v_latest record;
  v_anchor date;
  v_anchor_source text := 'planning_reference';
  v_date date;
  v_cycle_day integer;
  v_season text;
  v_weekday integer;
  v_available boolean;
  v_has_day boolean;
  v_override boolean;
  v_template_windows jsonb;
  v_window jsonb;
  v_order integer;
begin
  select coalesce(nullif(trim(p.timezone),''),'America/Los_Angeles')
  into v_timezone
  from public.profiles p
  where p.id=v_member;

  begin
    v_today := (timezone(v_timezone,now()))::date;
  exception when others then
    v_timezone := 'America/Los_Angeles';
    v_today := (timezone(v_timezone,now()))::date;
  end;

  v_current_month := date_trunc('month',v_today)::date;
  v_month_start := coalesce(p_month_start,v_current_month);

  if v_month_start <> date_trunc('month',v_month_start)::date then
    raise exception 'Choose the first day of a calendar month.' using errcode='22023';
  end if;
  if v_month_start < v_current_month or v_month_start > (v_current_month + interval '12 months')::date then
    raise exception 'Availability calendars may be prepared from this month through the next twelve months.' using errcode='22023';
  end if;

  select s.cycle_start_date::date as cycle_start_date,
         s.checkin_date::date as checkin_date,
         coalesce(s.cycle_day_actual,s.cycle_day_calculated,s.cycle_day_recorded,s.cycle_day_claimed) as cycle_day
  into v_latest
  from public.flowtel_stays s
  where s.client_id=v_member
  order by s.checkin_date desc,s.checked_in_at desc nulls last,s.created_at desc nulls last
  limit 1;

  if v_latest.cycle_start_date is not null then
    v_anchor := v_latest.cycle_start_date;
    v_anchor_source := 'cycle_start_date';
  elsif v_latest.checkin_date is not null and coalesce(v_latest.cycle_day,0)>0 then
    v_anchor := v_latest.checkin_date - (v_latest.cycle_day - 1);
    v_anchor_source := 'latest_checkin';
  else
    v_anchor := v_today;
  end if;

  insert into public.flowtel_flow_fm_availability_months(
    member_id,month_start,status,projection_anchor_date,projection_anchor_source
  ) values (
    v_member,v_month_start,'draft',v_anchor,v_anchor_source
  )
  on conflict(member_id,month_start) do nothing;

  select * into v_month
  from public.flowtel_flow_fm_availability_months
  where member_id=v_member and month_start=v_month_start
  for update;

  if v_month.status='draft' then
    update public.flowtel_flow_fm_availability_months
    set projection_anchor_date=v_anchor,
        projection_anchor_source=v_anchor_source,
        updated_at=now()
    where member_id=v_member and month_start=v_month_start;
  else
    v_anchor := coalesce(v_month.projection_anchor_date,v_anchor);
    v_anchor_source := coalesce(v_month.projection_anchor_source,v_anchor_source);
  end if;

  v_date := v_month_start;
  while v_date < (v_month_start + interval '1 month')::date loop
    v_cycle_day := mod(mod((v_date-v_anchor),28)+28,28)+1;
    v_season := case
      when v_cycle_day<=5 or v_cycle_day>=27 then 'Inner Winter'
      when v_cycle_day between 6 and 11 then 'Inner Spring'
      when v_cycle_day between 12 and 19 then 'Inner Summer'
      else 'Inner Autumn'
    end;
    v_weekday := extract(isodow from v_date)::integer;

    select d.is_override into v_override
    from public.flowtel_flow_fm_availability_month_days d
    where d.member_id=v_member and d.calendar_date=v_date;
    v_has_day := found;

    if not v_has_day or (v_month.status='draft' and not coalesce(v_override,false)) then
      select d.is_available into v_available
      from public.flowtel_flow_fm_availability_day_states d
      where d.member_id=v_member and d.inner_season=v_season and d.weekday=v_weekday;
      v_available := coalesce(v_available,false);

      select coalesce(jsonb_agg(jsonb_build_object(
        'start',to_char(w.starts_at,'HH24:MI'),
        'end',to_char(w.ends_at,'HH24:MI')
      ) order by w.window_order),'[]'::jsonb)
      into v_template_windows
      from public.flowtel_flow_fm_availability_windows w
      where w.member_id=v_member and w.inner_season=v_season and w.weekday=v_weekday;

      insert into public.flowtel_flow_fm_availability_month_days(
        member_id,month_start,calendar_date,projected_cycle_day,projected_inner_season,is_available,is_override,updated_at
      ) values (
        v_member,v_month_start,v_date,v_cycle_day,v_season,v_available,false,now()
      )
      on conflict(member_id,calendar_date) do update
        set month_start=excluded.month_start,
            projected_cycle_day=excluded.projected_cycle_day,
            projected_inner_season=excluded.projected_inner_season,
            is_available=excluded.is_available,
            is_override=false,
            updated_at=now();

      delete from public.flowtel_flow_fm_availability_month_windows
      where member_id=v_member and calendar_date=v_date;

      v_order := 0;
      for v_window in select value from jsonb_array_elements(v_template_windows)
      loop
        v_order := v_order+1;
        insert into public.flowtel_flow_fm_availability_month_windows(
          member_id,calendar_date,window_order,starts_at,ends_at
        ) values (
          v_member,v_date,v_order,(v_window->>'start')::time,(v_window->>'end')::time
        );
      end loop;
    end if;

    v_date := v_date+1;
  end loop;

  return public.flowtel_availability_month_payload(v_member,v_month_start)
    || jsonb_build_object('timezone',v_timezone,'flowtel_date',v_today);
end;
$$;

revoke all on function public.flowtel_availability_month_load(date) from public;
grant execute on function public.flowtel_availability_month_load(date) to authenticated;

create or replace function public.flowtel_availability_month_save_day(
  p_calendar_date date,
  p_is_available boolean,
  p_windows jsonb default '[]'::jsonb,
  p_use_seasonal boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member uuid := public.flowtel_hfr_require_member();
  v_timezone text := 'America/Los_Angeles';
  v_today date;
  v_month_start date;
  v_month public.flowtel_flow_fm_availability_months%rowtype;
  v_day public.flowtel_flow_fm_availability_month_days%rowtype;
  v_windows jsonb := coalesce(p_windows,'[]'::jsonb);
  v_window jsonb;
  v_order integer := 0;
  v_start time;
  v_end time;
  v_available boolean;
begin
  if p_calendar_date is null then
    raise exception 'Choose a calendar date.' using errcode='22023';
  end if;

  select coalesce(nullif(trim(p.timezone),''),'America/Los_Angeles') into v_timezone
  from public.profiles p where p.id=v_member;
  begin
    v_today := (timezone(v_timezone,now()))::date;
  exception when others then
    v_today := (timezone('America/Los_Angeles',now()))::date;
  end;

  if p_calendar_date < v_today then
    raise exception 'Past availability dates are read-only.' using errcode='22023';
  end if;

  v_month_start := date_trunc('month',p_calendar_date)::date;
  perform public.flowtel_availability_month_load(v_month_start);

  select * into v_month from public.flowtel_flow_fm_availability_months
  where member_id=v_member and month_start=v_month_start
  for update;
  select * into v_day from public.flowtel_flow_fm_availability_month_days
  where member_id=v_member and calendar_date=p_calendar_date
  for update;

  if v_day.calendar_date is null then
    raise exception 'That availability date could not be prepared.' using errcode='22023';
  end if;

  delete from public.flowtel_flow_fm_availability_month_windows
  where member_id=v_member and calendar_date=p_calendar_date;

  if coalesce(p_use_seasonal,false) then
    select d.is_available into v_available
    from public.flowtel_flow_fm_availability_day_states d
    where d.member_id=v_member
      and d.inner_season=v_day.projected_inner_season
      and d.weekday=extract(isodow from p_calendar_date)::integer;
    v_available := coalesce(v_available,false);

    update public.flowtel_flow_fm_availability_month_days
    set is_available=v_available,is_override=false,updated_at=now()
    where member_id=v_member and calendar_date=p_calendar_date;

    insert into public.flowtel_flow_fm_availability_month_windows(
      member_id,calendar_date,window_order,starts_at,ends_at
    )
    select v_member,p_calendar_date,w.window_order,w.starts_at,w.ends_at
    from public.flowtel_flow_fm_availability_windows w
    where w.member_id=v_member
      and w.inner_season=v_day.projected_inner_season
      and w.weekday=extract(isodow from p_calendar_date)::integer
    order by w.window_order;
  else
    if jsonb_typeof(v_windows)<>'array' then
      raise exception 'Availability windows must be provided as a list.' using errcode='22023';
    end if;
    if jsonb_array_length(v_windows)>8 then
      raise exception 'A date may contain up to eight time windows.' using errcode='22023';
    end if;
    if coalesce(p_is_available,false) and jsonb_array_length(v_windows)=0 then
      raise exception 'Add at least one time window for an available day.' using errcode='22023';
    end if;

    update public.flowtel_flow_fm_availability_month_days
    set is_available=coalesce(p_is_available,false),is_override=true,updated_at=now()
    where member_id=v_member and calendar_date=p_calendar_date;

    for v_window in select value from jsonb_array_elements(v_windows)
    loop
      v_order := v_order+1;
      begin
        v_start := (v_window->>'start')::time;
        v_end := (v_window->>'end')::time;
      exception when others then
        raise exception 'Use valid start and end times.' using errcode='22023';
      end;
      if v_start>=v_end then
        raise exception 'Each availability window must end after it begins.' using errcode='22023';
      end if;
      insert into public.flowtel_flow_fm_availability_month_windows(
        member_id,calendar_date,window_order,starts_at,ends_at
      ) values (v_member,p_calendar_date,v_order,v_start,v_end);
    end loop;
  end if;

  update public.flowtel_flow_fm_availability_months
  set updated_at=now(),
      owner_acknowledged_at=case when first_submitted_at is not null then null else owner_acknowledged_at end,
      owner_acknowledged_by=case when first_submitted_at is not null then null else owner_acknowledged_by end
  where member_id=v_member and month_start=v_month_start;

  return public.flowtel_availability_month_load(v_month_start);
end;
$$;

revoke all on function public.flowtel_availability_month_save_day(date,boolean,jsonb,boolean) from public;
grant execute on function public.flowtel_availability_month_save_day(date,boolean,jsonb,boolean) to authenticated;

create or replace function public.flowtel_availability_month_submit(
  p_month_start date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member uuid := public.flowtel_hfr_require_member();
  v_payload jsonb;
begin
  v_payload := public.flowtel_availability_month_load(p_month_start);

  update public.flowtel_flow_fm_availability_months
  set status='submitted',
      first_submitted_at=coalesce(first_submitted_at,now()),
      last_submitted_at=now(),
      owner_acknowledged_at=null,
      owner_acknowledged_by=null,
      updated_at=now()
  where member_id=v_member and month_start=p_month_start;

  return public.flowtel_availability_month_load(p_month_start);
end;
$$;

revoke all on function public.flowtel_availability_month_submit(date) from public;
grant execute on function public.flowtel_availability_month_submit(date) to authenticated;

-- ---------------------------------------------------------------------------
-- Owner Acuity-update queue
-- ---------------------------------------------------------------------------

create or replace function public.flowtel_admin_list_availability_month_updates()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_current_month date := date_trunc('month',(timezone('America/Los_Angeles',now()))::date)::date;
  v_result jsonb;
begin
  if not public.flowtel_current_user_is_phase_one_owner() then
    raise exception 'Only the Flowtel owner may review submitted Availability calendars.' using errcode='42501';
  end if;

  select coalesce(jsonb_agg(row_data order by
    case when coalesce((row_data->>'pending_owner_update')::boolean,false) then 0 else 1 end,
    (row_data->>'updated_at')::timestamptz desc
  ),'[]'::jsonb)
  into v_result
  from (
    select public.flowtel_availability_month_payload(m.member_id,m.month_start)
      || jsonb_build_object(
        'display_name',coalesce(nullif(trim(p.display_name),''),nullif(trim(pp.priestess_name),''),nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),p.email,'Flow FM Priestess'),
        'email',p.email,
        'timezone',coalesce(nullif(trim(p.timezone),''),'America/Los_Angeles'),
        'profile_photo_url',coalesce(nullif(trim(pp.profile_photo_url),''),nullif(trim(p.mentor_photo_url),'')),
        'pending_owner_update',(m.first_submitted_at is not null and m.owner_acknowledged_at is null)
      ) as row_data
    from public.flowtel_flow_fm_availability_months m
    join public.profiles p on p.id=m.member_id
    left join public.flow_fm_priestess_profiles pp on pp.member_id=m.member_id
    where m.first_submitted_at is not null
      and m.month_start between v_current_month and (v_current_month + interval '12 months')::date
  ) q;

  return v_result;
end;
$$;

revoke all on function public.flowtel_admin_list_availability_month_updates() from public;
grant execute on function public.flowtel_admin_list_availability_month_updates() to authenticated;

create or replace function public.flowtel_admin_acknowledge_availability_month(
  p_member_id uuid,
  p_month_start date
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.flowtel_current_user_is_phase_one_owner() then
    raise exception 'Only the Flowtel owner may clear an Availability Acuity-update alert.' using errcode='42501';
  end if;

  update public.flowtel_flow_fm_availability_months
  set owner_acknowledged_at=now(),owner_acknowledged_by=auth.uid(),updated_at=updated_at
  where member_id=p_member_id and month_start=p_month_start and first_submitted_at is not null;

  if not found then
    raise exception 'That submitted Availability month could not be found.' using errcode='22023';
  end if;

  return public.flowtel_availability_month_payload(p_member_id,p_month_start)
    || jsonb_build_object('pending_owner_update',false);
end;
$$;

revoke all on function public.flowtel_admin_acknowledge_availability_month(uuid,date) from public;
grant execute on function public.flowtel_admin_acknowledge_availability_month(uuid,date) to authenticated;

-- ---------------------------------------------------------------------------
-- Upcoming Calls: preserve owner-wide visibility while identifying the holder
-- ---------------------------------------------------------------------------

-- PostgreSQL cannot CREATE OR REPLACE a function when the table return shape
-- changes, so replace this no-argument read RPC in-place.
drop function if exists public.flowtel_list_my_upcoming_service_calls();

create function public.flowtel_list_my_upcoming_service_calls()
returns table (
  appointment_id uuid,
  acuity_appointment_id text,
  service_key text,
  service_name text,
  client_id uuid,
  client_name text,
  provider_user_id uuid,
  provider_name text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text,
  client_timezone text,
  access_until timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_owner boolean := public.flowtel_current_user_is_admin_or_owner();
begin
  if v_user_id is null then
    raise exception 'You must be signed in to view upcoming calls.' using errcode = '28000';
  end if;

  return query
  select
    appointment.id,
    appointment.acuity_appointment_id,
    service.service_key,
    service.service_name,
    appointment.customer_user_id,
    public.flowtel_resolve_display_name(client_profile.display_name, client_profile.first_name, client_profile.last_name, client_profile.email, 'Flowtel Guest'),
    provider.user_id,
    coalesce(nullif(trim(provider_priestess.priestess_name),''), public.flowtel_resolve_display_name(provider_profile.display_name, provider_profile.first_name, provider_profile.last_name, provider_profile.email, 'Flowtel Priestess')),
    appointment.starts_at,
    appointment.ends_at,
    appointment.status,
    appointment.client_timezone,
    grant_row.active_until
  from public.flowtel_external_appointments appointment
  join public.flowtel_provider_scheduling_profiles provider
    on provider.id = appointment.provider_id
  join public.flowtel_provider_service_types service
    on service.id = appointment.service_type_id
  left join public.profiles client_profile
    on client_profile.id = appointment.customer_user_id
  left join public.profiles provider_profile
    on provider_profile.id = provider.user_id
  left join public.flow_fm_priestess_profiles provider_priestess
    on provider_priestess.member_id = provider.user_id
  left join public.flowtel_appointment_access_grants grant_row
    on grant_row.id = appointment.access_grant_id
  where appointment.source_product = 'flowtel'
    and appointment.starts_at >= now() - interval '1 day'
    and appointment.status in ('pending','scheduled','rescheduled')
    and (v_owner or provider.user_id = v_user_id)
  order by appointment.starts_at asc
  limit 250;
end;
$$;

revoke all on function public.flowtel_list_my_upcoming_service_calls() from public;
grant execute on function public.flowtel_list_my_upcoming_service_calls() to authenticated;

comment on function public.flowtel_list_my_upcoming_service_calls() is
  'Upcoming Flowtel service calls. Priestesses see their own assigned calls; owner/admin retains the full calendar and receives provider_name for each call.';

-- ---------------------------------------------------------------------------
-- The Queendom Calendar: one event source for Lounge, My Calendar, and embeds
-- ---------------------------------------------------------------------------

-- Event artwork is intentionally public. Meeting credentials remain private
-- inside RPCs and are never stored in the public image object metadata.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'flowtel-queendom-event-images',
  'flowtel-queendom-event-images',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public=true,
    file_size_limit=excluded.file_size_limit,
    allowed_mime_types=excluded.allowed_mime_types;

create table if not exists public.flowtel_queendom_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_type text not null default 'workshop',
  description text,
  event_date date not null,
  start_time time without time zone not null,
  end_time time without time zone,
  event_timezone text not null default 'America/Los_Angeles',
  starts_at timestamptz not null,
  ends_at timestamptz,
  host_name text,
  audience text not null default 'queendom',
  zoom_url text,
  zoom_passcode text,
  image_path text,
  image_url text,
  status text not null default 'draft',
  published_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint flowtel_queendom_event_title_check check (char_length(trim(title)) between 1 and 180),
  constraint flowtel_queendom_event_type_check check (event_type in ('workshop','ceremony','call','other')),
  constraint flowtel_queendom_event_description_check check (description is null or char_length(description)<=4000),
  constraint flowtel_queendom_event_audience_check check (audience in ('queendom','flowfm')),
  constraint flowtel_queendom_event_status_check check (status in ('draft','published','cancelled')),
  constraint flowtel_queendom_event_end_check check (end_time is null or end_time>start_time),
  constraint flowtel_queendom_event_zoom_check check (
    zoom_url is null or zoom_url ~* '^https://([a-z0-9-]+\.)*(zoom\.us|zoom\.com|zoomgov\.com)(/|$)'
  ),
  constraint flowtel_queendom_event_passcode_check check (zoom_passcode is null or char_length(zoom_passcode)<=200),
  constraint flowtel_queendom_event_image_url_check check (image_url is null or image_url ~* '^https://')
);

comment on table public.flowtel_queendom_events is
  'Canonical Flowtel community event source powering the Lounge, member calendar, and sanitized Squarespace embed. Zoom credentials remain server-protected by membership.';

create index if not exists flowtel_queendom_events_date_idx
  on public.flowtel_queendom_events(event_date,starts_at);
create index if not exists flowtel_queendom_events_status_idx
  on public.flowtel_queendom_events(status,event_date);

create table if not exists public.flowtel_queendom_event_registrations (
  event_id uuid not null references public.flowtel_queendom_events(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  registered_at timestamptz not null default now(),
  cancelled_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(event_id,member_id)
);

comment on table public.flowtel_queendom_event_registrations is
  'Lightweight Save My Seat commitments. Membership controls Zoom access; registration controls My Calendar and preserves cancelled RSVP history.';

create index if not exists flowtel_queendom_event_registrations_member_idx
  on public.flowtel_queendom_event_registrations(member_id,registered_at desc);

alter table public.flowtel_queendom_events enable row level security;
alter table public.flowtel_queendom_event_registrations enable row level security;
revoke all on public.flowtel_queendom_events from anon,authenticated;
revoke all on public.flowtel_queendom_event_registrations from anon,authenticated;

-- The image bucket is public for Squarespace calendar artwork, but only an
-- authenticated Flowtel admin/owner can change event artwork.
drop policy if exists "Flowtel owner uploads Queendom event images" on storage.objects;
create policy "Flowtel owner uploads Queendom event images"
on storage.objects for insert to authenticated
with check (
  bucket_id='flowtel-queendom-event-images'
  and public.flowtel_current_user_is_admin_or_owner()
);

drop policy if exists "Flowtel owner updates Queendom event images" on storage.objects;
create policy "Flowtel owner updates Queendom event images"
on storage.objects for update to authenticated
using (
  bucket_id='flowtel-queendom-event-images'
  and public.flowtel_current_user_is_admin_or_owner()
)
with check (
  bucket_id='flowtel-queendom-event-images'
  and public.flowtel_current_user_is_admin_or_owner()
);

drop policy if exists "Flowtel owner removes Queendom event images" on storage.objects;
create policy "Flowtel owner removes Queendom event images"
on storage.objects for delete to authenticated
using (
  bucket_id='flowtel-queendom-event-images'
  and public.flowtel_current_user_is_admin_or_owner()
);

create or replace function public.flowtel_queendom_event_member_rank(p_member_id uuid)
returns integer
language sql
stable
security definer
set search_path=public,auth
as $$
  select coalesce((
    select public.flow_fm_effective_membership_rank(
      p.id,p.membership_type,p.membership_rank,p.role,p.flowfm_started_at,p.is_initiated
    )
    from public.profiles p
    where p.id=p_member_id
  ),0);
$$;

revoke all on function public.flowtel_queendom_event_member_rank(uuid) from public;
revoke all on function public.flowtel_queendom_event_member_rank(uuid) from anon;
revoke all on function public.flowtel_queendom_event_member_rank(uuid) from authenticated;

create or replace function public.flowtel_list_queendom_events(
  p_month_start date default null,
  p_month_count integer default 6
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  v_member uuid := auth.uid();
  v_rank integer;
  v_start date;
  v_count integer := greatest(1,least(coalesce(p_month_count,6),18));
  v_end date;
  v_result jsonb;
begin
  if v_member is null or not public.flowtel_current_user_has_product_access('flowtel') then
    raise exception 'Enter the Flowtel to open the Queendom calendar.' using errcode='42501';
  end if;
  v_rank := public.flowtel_queendom_event_member_rank(v_member);
  if v_rank<1 then
    raise exception 'A Queendom membership is required to open this calendar.' using errcode='42501';
  end if;

  v_start := coalesce(p_month_start,date_trunc('month',(timezone('America/Los_Angeles',now()))::date)::date);
  if v_start<>date_trunc('month',v_start)::date then
    raise exception 'Choose the first day of a calendar month.' using errcode='22023';
  end if;
  v_end := (v_start + make_interval(months=>v_count))::date;

  select coalesce(jsonb_agg(jsonb_build_object(
    'event_id',e.id,
    'title',e.title,
    'event_type',e.event_type,
    'description',e.description,
    'event_date',e.event_date,
    'start_time',to_char(e.start_time,'HH24:MI'),
    'end_time',case when e.end_time is null then null else to_char(e.end_time,'HH24:MI') end,
    'starts_at',e.starts_at,
    'ends_at',e.ends_at,
    'event_timezone',e.event_timezone,
    'host_name',e.host_name,
    'audience',e.audience,
    'image_url',e.image_url,
    'status',e.status,
    'is_registered',coalesce(r.cancelled_at is null and r.registered_at is not null,false),
    'can_join',(e.status='published' and v_rank>=case when e.audience='flowfm' then 2 else 1 end),
    'zoom_ready',(e.status='published' and nullif(trim(coalesce(e.zoom_url,'')),'') is not null),
    'registration_count',(select count(*)::integer from public.flowtel_queendom_event_registrations rr where rr.event_id=e.id and rr.cancelled_at is null)
  ) order by e.starts_at,e.title),'[]'::jsonb)
  into v_result
  from public.flowtel_queendom_events e
  left join public.flowtel_queendom_event_registrations r
    on r.event_id=e.id and r.member_id=v_member
  where e.published_at is not null
    and e.status in ('published','cancelled')
    and e.event_date>=v_start
    and e.event_date<v_end;

  return v_result;
end;
$$;

revoke all on function public.flowtel_list_queendom_events(date,integer) from public;
grant execute on function public.flowtel_list_queendom_events(date,integer) to authenticated;

-- Sanitized calendar feed for Squarespace embeds. It intentionally exposes no
-- member identity, registration state, Zoom URL, or passcode.
create or replace function public.flowtel_public_queendom_events(
  p_month_start date default null,
  p_month_count integer default 3
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_start date := coalesce(p_month_start,date_trunc('month',(timezone('America/Los_Angeles',now()))::date)::date);
  v_count integer := greatest(1,least(coalesce(p_month_count,3),18));
  v_end date;
  v_result jsonb;
begin
  if v_start<>date_trunc('month',v_start)::date then
    raise exception 'Choose the first day of a calendar month.' using errcode='22023';
  end if;
  v_end := (v_start + make_interval(months=>v_count))::date;
  select coalesce(jsonb_agg(jsonb_build_object(
    'event_id',e.id,
    'title',e.title,
    'event_type',e.event_type,
    'description',e.description,
    'event_date',e.event_date,
    'start_time',to_char(e.start_time,'HH24:MI'),
    'end_time',case when e.end_time is null then null else to_char(e.end_time,'HH24:MI') end,
    'starts_at',e.starts_at,
    'ends_at',e.ends_at,
    'event_timezone',e.event_timezone,
    'host_name',e.host_name,
    'audience',e.audience,
    'image_url',e.image_url,
    'status',e.status
  ) order by e.starts_at,e.title),'[]'::jsonb)
  into v_result
  from public.flowtel_queendom_events e
  where e.published_at is not null
    and e.status in ('published','cancelled')
    and e.event_date>=v_start
    and e.event_date<v_end;
  return v_result;
end;
$$;

revoke all on function public.flowtel_public_queendom_events(date,integer) from public;
grant execute on function public.flowtel_public_queendom_events(date,integer) to anon,authenticated;

create or replace function public.flowtel_set_queendom_event_registration(
  p_event_id uuid,
  p_registered boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_member uuid := auth.uid();
  v_event public.flowtel_queendom_events%rowtype;
  v_rank integer;
begin
  if v_member is null or not public.flowtel_current_user_has_product_access('flowtel') then
    raise exception 'Enter the Flowtel before saving an event.' using errcode='42501';
  end if;
  select * into v_event from public.flowtel_queendom_events where id=p_event_id;
  if v_event.id is null or v_event.published_at is null then
    raise exception 'That event is not available.' using errcode='22023';
  end if;
  if v_event.status='cancelled' then
    raise exception 'That event has been cancelled.' using errcode='22023';
  end if;
  v_rank := public.flowtel_queendom_event_member_rank(v_member);
  if v_rank < (case when v_event.audience='flowfm' then 2 else 1 end) then
    raise exception 'This event is inside Flow FM.' using errcode='42501';
  end if;

  if coalesce(p_registered,true) then
    insert into public.flowtel_queendom_event_registrations(event_id,member_id,registered_at,cancelled_at,updated_at)
    values(p_event_id,v_member,now(),null,now())
    on conflict(event_id,member_id) do update
      set cancelled_at=null,registered_at=now(),updated_at=now();
  else
    update public.flowtel_queendom_event_registrations
    set cancelled_at=now(),updated_at=now()
    where event_id=p_event_id and member_id=v_member and cancelled_at is null;
  end if;

  return jsonb_build_object('event_id',p_event_id,'registered',coalesce(p_registered,true));
end;
$$;

revoke all on function public.flowtel_set_queendom_event_registration(uuid,boolean) from public;
grant execute on function public.flowtel_set_queendom_event_registration(uuid,boolean) to authenticated;

create or replace function public.flowtel_get_queendom_event_join_details(p_event_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  v_member uuid := auth.uid();
  v_event public.flowtel_queendom_events%rowtype;
  v_rank integer;
begin
  if v_member is null or not public.flowtel_current_user_has_product_access('flowtel') then
    raise exception 'Enter the Flowtel before joining this event.' using errcode='42501';
  end if;
  select * into v_event from public.flowtel_queendom_events where id=p_event_id;
  if v_event.id is null or v_event.published_at is null or v_event.status<>'published' then
    raise exception 'That event is not currently open.' using errcode='22023';
  end if;
  v_rank := public.flowtel_queendom_event_member_rank(v_member);
  if v_rank < (case when v_event.audience='flowfm' then 2 else 1 end) then
    raise exception 'This Zoom room is reserved for Flow FM members.' using errcode='42501';
  end if;
  if nullif(trim(coalesce(v_event.zoom_url,'')),'') is null then
    raise exception 'The Zoom room has not been placed yet.' using errcode='22023';
  end if;
  return jsonb_build_object(
    'event_id',v_event.id,
    'title',v_event.title,
    'zoom_url',v_event.zoom_url,
    'zoom_passcode',v_event.zoom_passcode
  );
end;
$$;

revoke all on function public.flowtel_get_queendom_event_join_details(uuid) from public;
grant execute on function public.flowtel_get_queendom_event_join_details(uuid) to authenticated;

create or replace function public.flowtel_admin_list_queendom_events()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  v_result jsonb;
begin
  if not public.flowtel_current_user_is_admin_or_owner() then
    raise exception 'Only Flowtel administration may manage Queendom events.' using errcode='42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'event_id',e.id,
    'title',e.title,
    'event_type',e.event_type,
    'description',e.description,
    'event_date',e.event_date,
    'start_time',to_char(e.start_time,'HH24:MI'),
    'end_time',case when e.end_time is null then null else to_char(e.end_time,'HH24:MI') end,
    'starts_at',e.starts_at,
    'ends_at',e.ends_at,
    'event_timezone',e.event_timezone,
    'host_name',e.host_name,
    'audience',e.audience,
    'zoom_url',e.zoom_url,
    'zoom_passcode',e.zoom_passcode,
    'image_path',e.image_path,
    'image_url',e.image_url,
    'status',e.status,
    'published_at',e.published_at,
    'cancelled_at',e.cancelled_at,
    'registration_count',(select count(*)::integer from public.flowtel_queendom_event_registrations r where r.event_id=e.id and r.cancelled_at is null),
    'updated_at',e.updated_at
  ) order by e.event_date desc,e.start_time desc),'[]'::jsonb)
  into v_result
  from public.flowtel_queendom_events e;
  return v_result;
end;
$$;

revoke all on function public.flowtel_admin_list_queendom_events() from public;
grant execute on function public.flowtel_admin_list_queendom_events() to authenticated;

create or replace function public.flowtel_admin_save_queendom_event(
  p_event_id uuid default null,
  p_title text default null,
  p_event_type text default 'workshop',
  p_description text default null,
  p_event_date date default null,
  p_start_time time without time zone default null,
  p_end_time time without time zone default null,
  p_timezone text default 'America/Los_Angeles',
  p_host_name text default null,
  p_audience text default 'queendom',
  p_zoom_url text default null,
  p_zoom_passcode text default null,
  p_image_path text default null,
  p_image_url text default null,
  p_status text default 'draft'
)
returns uuid
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid := coalesce(p_event_id,gen_random_uuid());
  v_title text := trim(coalesce(p_title,''));
  v_type text := lower(trim(coalesce(p_event_type,'workshop')));
  v_description text := nullif(trim(coalesce(p_description,'')),'');
  v_timezone text := trim(coalesce(nullif(p_timezone,''),'America/Los_Angeles'));
  v_host text := nullif(trim(coalesce(p_host_name,'')),'');
  v_audience text := lower(trim(coalesce(p_audience,'queendom')));
  v_zoom text := nullif(trim(coalesce(p_zoom_url,'')),'');
  v_passcode text := nullif(trim(coalesce(p_zoom_passcode,'')),'');
  v_image_path text := nullif(trim(coalesce(p_image_path,'')),'');
  v_image_url text := nullif(trim(coalesce(p_image_url,'')),'');
  v_status text := lower(trim(coalesce(p_status,'draft')));
  v_starts_at timestamptz;
  v_ends_at timestamptz;
begin
  if not public.flowtel_current_user_is_admin_or_owner() then
    raise exception 'Only Flowtel administration may manage Queendom events.' using errcode='42501';
  end if;
  if p_event_id is not null and exists (select 1 from public.flowtel_queendom_events e where e.id=p_event_id and e.status='cancelled') then
    raise exception 'Cancelled events stay in history and cannot be republished. Create a new event instead.' using errcode='22023';
  end if;
  if char_length(v_title)<1 or char_length(v_title)>180 then
    raise exception 'Event title must be between 1 and 180 characters.' using errcode='22023';
  end if;
  if v_type not in ('workshop','ceremony','call','other') then
    raise exception 'Choose Workshop, Ceremony, Call, or Other.' using errcode='22023';
  end if;
  if p_event_date is null or p_start_time is null then
    raise exception 'Choose the event date and start time.' using errcode='22023';
  end if;
  if p_end_time is not null and p_end_time<=p_start_time then
    raise exception 'Event end time must be after the start time.' using errcode='22023';
  end if;
  if v_audience not in ('queendom','flowfm') then
    raise exception 'Choose Queendom or Flow FM access.' using errcode='22023';
  end if;
  if v_status not in ('draft','published') then
    raise exception 'Events may be saved as Draft or Published. Use Cancel Event to cancel one.' using errcode='22023';
  end if;
  if v_zoom is not null and v_zoom !~* '^https://([a-z0-9-]+\.)*(zoom\.us|zoom\.com|zoomgov\.com)(/|$)' then
    raise exception 'Enter a valid Zoom meeting URL.' using errcode='22023';
  end if;
  begin
    perform timezone(v_timezone,now());
  exception when others then
    raise exception 'Choose a valid IANA timezone.' using errcode='22023';
  end;

  v_starts_at := (p_event_date+p_start_time) at time zone v_timezone;
  if p_end_time is not null then
    v_ends_at := (p_event_date+p_end_time) at time zone v_timezone;
  end if;

  insert into public.flowtel_queendom_events(
    id,title,event_type,description,event_date,start_time,end_time,event_timezone,starts_at,ends_at,
    host_name,audience,zoom_url,zoom_passcode,image_path,image_url,status,published_at,cancelled_at,
    created_by,updated_by,created_at,updated_at
  ) values (
    v_id,v_title,v_type,v_description,p_event_date,p_start_time,p_end_time,v_timezone,v_starts_at,v_ends_at,
    v_host,v_audience,v_zoom,v_passcode,v_image_path,v_image_url,v_status,
    case when v_status='published' then now() else null end,null,
    v_user,v_user,now(),now()
  )
  on conflict(id) do update set
    title=excluded.title,
    event_type=excluded.event_type,
    description=excluded.description,
    event_date=excluded.event_date,
    start_time=excluded.start_time,
    end_time=excluded.end_time,
    event_timezone=excluded.event_timezone,
    starts_at=excluded.starts_at,
    ends_at=excluded.ends_at,
    host_name=excluded.host_name,
    audience=excluded.audience,
    zoom_url=excluded.zoom_url,
    zoom_passcode=excluded.zoom_passcode,
    image_path=excluded.image_path,
    image_url=excluded.image_url,
    status=excluded.status,
    published_at=case when excluded.status='published' then coalesce(public.flowtel_queendom_events.published_at,now()) else public.flowtel_queendom_events.published_at end,
    cancelled_at=null,
    updated_by=v_user,
    updated_at=now();

  return v_id;
end;
$$;

revoke all on function public.flowtel_admin_save_queendom_event(uuid,text,text,text,date,time without time zone,time without time zone,text,text,text,text,text,text,text,text) from public;
grant execute on function public.flowtel_admin_save_queendom_event(uuid,text,text,text,date,time without time zone,time without time zone,text,text,text,text,text,text,text,text) to authenticated;

create or replace function public.flowtel_admin_cancel_queendom_event(p_event_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public,auth
as $$
begin
  if not public.flowtel_current_user_is_admin_or_owner() then
    raise exception 'Only Flowtel administration may cancel Queendom events.' using errcode='42501';
  end if;
  update public.flowtel_queendom_events
  set status='cancelled',cancelled_at=now(),updated_by=auth.uid(),updated_at=now()
  where id=p_event_id and published_at is not null;
  if not found then
    raise exception 'That published event could not be found.' using errcode='22023';
  end if;
  return true;
end;
$$;

revoke all on function public.flowtel_admin_cancel_queendom_event(uuid) from public;
grant execute on function public.flowtel_admin_cancel_queendom_event(uuid) to authenticated;

commit;
