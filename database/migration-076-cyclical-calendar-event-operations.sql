-- Flowtel v0.10.90 — Cyclical Calendar + Event Operations
-- Migration 076
--
-- Extends the event-series foundation without changing the canonical event table
-- into a second scheduling engine. Acuity remains schedule/reminder source of
-- truth when an event is mapped. Flowtel owns discovery, entitlement,
-- registration, protected entry, attendance context, and host group flow.

begin;

-- ---------------------------------------------------------------------------
-- Event shape + Acuity schedule sync metadata
-- ---------------------------------------------------------------------------

alter table public.flowtel_queendom_events
  add column if not exists acuity_sync_enabled boolean not null default false,
  add column if not exists acuity_last_synced_at timestamptz,
  add column if not exists acuity_schedule_label text;

alter table public.flowtel_queendom_events
  drop constraint if exists flowtel_queendom_events_event_format_check,
  add constraint flowtel_queendom_events_event_format_check
    check (event_format in ('single','recurring','series')),
  drop constraint if exists flowtel_queendom_events_series_count_check,
  add constraint flowtel_queendom_events_series_count_check
    check (series_count between 1 and 104);

alter table public.flowtel_queendom_event_occurrences
  drop constraint if exists flowtel_queendom_event_occurrences_occurrence_number_check;

alter table public.flowtel_queendom_event_occurrences
  add constraint flowtel_queendom_event_occurrences_occurrence_number_check
    check (occurrence_number between 1 and 104);

alter table public.flowtel_queendom_event_occurrences
  add column if not exists acuity_slots integer,
  add column if not exists acuity_slots_available integer,
  add column if not exists acuity_is_series boolean,
  add column if not exists acuity_synced_at timestamptz;

-- A recurring class is one parent event with independently claimable dates.
create table if not exists public.flowtel_queendom_event_occurrence_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.flowtel_queendom_events(id) on delete cascade,
  occurrence_id uuid not null references public.flowtel_queendom_event_occurrences(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  registered_at timestamptz not null default now(),
  cancelled_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(event_id,occurrence_id,member_id)
);

create index if not exists flowtel_event_occurrence_regs_member_idx
  on public.flowtel_queendom_event_occurrence_registrations(member_id,event_id,registered_at desc);

alter table public.flowtel_queendom_event_occurrence_registrations enable row level security;
revoke all on table public.flowtel_queendom_event_occurrence_registrations from anon,authenticated;

-- Attendance is append-oriented event context. It intentionally snapshots only
-- the minimum cyclical information needed to hold the room. It does not expose
-- reflections, Flow Map notes, Moon Mail, Personal Cosmology, or care data.
create table if not exists public.flowtel_queendom_event_attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.flowtel_queendom_events(id) on delete cascade,
  occurrence_id uuid references public.flowtel_queendom_event_occurrences(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  stay_id uuid,
  joined_at timestamptz not null default now(),
  flowtel_date date not null,
  cycle_day_actual integer,
  cycle_day_recorded integer,
  inner_season text,
  cycle_source text not null default 'stay' check (cycle_source in ('stay','event_pass')),
  created_at timestamptz not null default now(),
  constraint flowtel_event_attendance_cycle_day_actual_check check (cycle_day_actual is null or cycle_day_actual between 1 and 99),
  constraint flowtel_event_attendance_cycle_day_recorded_check check (cycle_day_recorded is null or cycle_day_recorded between 1 and 99)
);

create unique index if not exists flowtel_event_attendance_occurrence_member_uidx
  on public.flowtel_queendom_event_attendance(occurrence_id,member_id)
  where occurrence_id is not null;
create unique index if not exists flowtel_event_attendance_single_member_uidx
  on public.flowtel_queendom_event_attendance(event_id,member_id)
  where occurrence_id is null;
create index if not exists flowtel_event_attendance_event_idx
  on public.flowtel_queendom_event_attendance(event_id,occurrence_id,joined_at);

alter table public.flowtel_queendom_event_attendance enable row level security;
revoke all on table public.flowtel_queendom_event_attendance from anon,authenticated;

-- ---------------------------------------------------------------------------
-- Small helpers
-- ---------------------------------------------------------------------------

create or replace function public.flowtel_event_season_for_cycle_day(p_day integer)
returns text
language sql
immutable
as $$
  select case
    when p_day is null then null
    when p_day>=27 or p_day<=5 then 'Inner Winter'
    when p_day<=11 then 'Inner Spring'
    when p_day<=19 then 'Inner Summer'
    else 'Inner Autumn'
  end;
$$;
revoke all on function public.flowtel_event_season_for_cycle_day(integer) from public,anon,authenticated;

create or replace function public.flowtel_event_occurrence_json(p_event_id uuid,p_member_id uuid default null)
returns jsonb
language sql
stable
security definer
set search_path=public,auth
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'occurrence_id',o.id,
    'occurrence_number',o.occurrence_number,
    'event_date',o.event_date,
    'start_time',to_char(o.start_time,'HH24:MI'),
    'end_time',case when o.end_time is null then null else to_char(o.end_time,'HH24:MI') end,
    'starts_at',o.starts_at,
    'ends_at',o.ends_at,
    'live_room_starts_at',o.live_room_starts_at,
    'status',o.status,
    'slots',o.acuity_slots,
    'slots_available',o.acuity_slots_available,
    'is_registered',case when p_member_id is null then false else exists(
      select 1 from public.flowtel_queendom_event_occurrence_registrations rr
      where rr.occurrence_id=o.id and rr.member_id=p_member_id and rr.cancelled_at is null
    ) end,
    'enrollment_status',case when p_member_id is null then null else (
      select oe.status from public.flowtel_queendom_event_occurrence_enrollments oe
      where oe.occurrence_id=o.id and oe.member_id=p_member_id limit 1
    ) end
  ) order by o.occurrence_number),'[]'::jsonb)
  from public.flowtel_queendom_event_occurrences o
  where o.event_id=p_event_id;
$$;
revoke all on function public.flowtel_event_occurrence_json(uuid,uuid) from public,anon,authenticated;

-- ---------------------------------------------------------------------------
-- Owner schedule configuration/import. The browser receives sanitized Acuity
-- offerings from the existing /api/acuity function and passes only schedule
-- metadata here. Existing occurrence IDs are preserved by occurrence number.
-- ---------------------------------------------------------------------------

create or replace function public.flowtel_admin_configure_queendom_event_operations(
  p_event_id uuid,
  p_event_format text default 'single',
  p_acuity_appointment_type_id text default null,
  p_acuity_calendar_id text default null,
  p_acuity_sync_enabled boolean default false,
  p_acuity_schedule_label text default null,
  p_occurrences jsonb default '[]'::jsonb,
  p_series_interval_days integer default 7
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_event public.flowtel_queendom_events%rowtype;
  v_format text:=lower(trim(coalesce(p_event_format,'single')));
  v_type text:=nullif(trim(coalesce(p_acuity_appointment_type_id,'')),'');
  v_calendar text:=nullif(trim(coalesce(p_acuity_calendar_id,'')),'');
  v_rows jsonb:=coalesce(p_occurrences,'[]'::jsonb);
  v_count integer:=jsonb_array_length(v_rows);
  v_item jsonb;
  v_number integer:=0;
  v_date date;
  v_start_time time;
  v_end_time time;
  v_live_time time;
  v_starts timestamptz;
  v_ends timestamptz;
  v_live timestamptz;
  v_max integer:=0;
begin
  if not public.flowtel_current_user_is_admin_or_owner() then
    raise exception 'Only Flowtel administration may configure event operations.' using errcode='42501';
  end if;
  select * into v_event from public.flowtel_queendom_events where id=p_event_id for update;
  if v_event.id is null then raise exception 'Save the event before configuring its schedule.' using errcode='22023'; end if;
  if v_format not in ('single','recurring','series') then raise exception 'Choose Single Event, Recurring Event, or Series / Vortex.' using errcode='22023'; end if;
  if v_count>104 then raise exception 'Flowtel can import up to 104 upcoming occurrences at a time.' using errcode='22023'; end if;
  if v_format='recurring' and v_event.status='published' and v_count<1 then raise exception 'A published recurring event needs at least one occurrence.' using errcode='22023'; end if;
  if v_format='series' and v_event.status='published' and v_count<2 then raise exception 'A published series needs at least two occurrences.' using errcode='22023'; end if;
  if coalesce(p_acuity_sync_enabled,false) and (v_type is null or v_calendar is null) then
    raise exception 'Choose an Acuity appointment type and calendar before enabling Acuity sync.' using errcode='22023';
  end if;

  update public.flowtel_queendom_events set
    event_format=v_format,
    series_count=greatest(1,case when v_count>0 then v_count else 1 end),
    series_interval_days=greatest(1,least(coalesce(p_series_interval_days,7),90)),
    acuity_appointment_type_id=v_type,
    acuity_calendar_id=v_calendar,
    acuity_sync_enabled=coalesce(p_acuity_sync_enabled,false),
    acuity_schedule_label=nullif(trim(coalesce(p_acuity_schedule_label,'')),''),
    acuity_last_synced_at=case when coalesce(p_acuity_sync_enabled,false) then now() else acuity_last_synced_at end,
    updated_at=now(),updated_by=auth.uid()
  where id=p_event_id;

  if v_count>0 then
    for v_item in select value from jsonb_array_elements(v_rows)
    loop
      v_number:=v_number+1;
      v_date:=nullif(v_item->>'event_date','')::date;
      v_start_time:=nullif(v_item->>'start_time','')::time;
      v_end_time:=nullif(v_item->>'end_time','')::time;
      v_live_time:=coalesce(nullif(v_item->>'live_room_time','')::time,v_start_time);
      if v_date is null or v_start_time is null then raise exception 'Every imported occurrence needs a date and start time.' using errcode='22023'; end if;
      v_starts:=(v_date+v_start_time) at time zone v_event.event_timezone;
      v_ends:=case when v_end_time is null then null else (v_date+v_end_time) at time zone v_event.event_timezone end;
      v_live:=(v_date+v_live_time) at time zone v_event.event_timezone;

      insert into public.flowtel_queendom_event_occurrences(
        event_id,occurrence_number,event_date,start_time,end_time,starts_at,ends_at,live_room_time,live_room_starts_at,status,
        acuity_slots,acuity_slots_available,acuity_is_series,acuity_synced_at,updated_at
      ) values(
        p_event_id,v_number,v_date,v_start_time,v_end_time,v_starts,v_ends,v_live_time,v_live,
        case when coalesce(v_item->>'status','scheduled')='cancelled' then 'cancelled' else 'scheduled' end,
        nullif(v_item->>'slots','')::integer,nullif(v_item->>'slots_available','')::integer,
        case when v_item ? 'is_series' then coalesce((v_item->>'is_series')::boolean,false) else null end,
        case when coalesce(p_acuity_sync_enabled,false) then now() else null end,now()
      )
      on conflict(event_id,occurrence_number) do update set
        event_date=excluded.event_date,start_time=excluded.start_time,end_time=excluded.end_time,
        starts_at=excluded.starts_at,ends_at=excluded.ends_at,live_room_time=excluded.live_room_time,
        live_room_starts_at=excluded.live_room_starts_at,status=excluded.status,
        acuity_slots=excluded.acuity_slots,acuity_slots_available=excluded.acuity_slots_available,
        acuity_is_series=excluded.acuity_is_series,acuity_synced_at=excluded.acuity_synced_at,updated_at=now();
      v_max:=v_number;
    end loop;

    -- Old occurrences beyond the imported horizon may be removed only when they
    -- have no operational history. Otherwise retain them and mark cancelled.
    delete from public.flowtel_queendom_event_occurrences o
      where o.event_id=p_event_id and o.occurrence_number>v_max
        and not exists(select 1 from public.flowtel_queendom_event_occurrence_enrollments oe where oe.occurrence_id=o.id)
        and not exists(select 1 from public.flowtel_queendom_event_occurrence_registrations rr where rr.occurrence_id=o.id)
        and not exists(select 1 from public.flowtel_queendom_event_attendance a where a.occurrence_id=o.id);
    update public.flowtel_queendom_event_occurrences o set status='cancelled',updated_at=now()
      where o.event_id=p_event_id and o.occurrence_number>v_max;
  elsif v_format='single' then
    delete from public.flowtel_queendom_event_occurrences o
      where o.event_id=p_event_id
        and not exists(select 1 from public.flowtel_queendom_event_occurrence_enrollments oe where oe.occurrence_id=o.id)
        and not exists(select 1 from public.flowtel_queendom_event_attendance a where a.occurrence_id=o.id);
  end if;

  return jsonb_build_object(
    'event_id',p_event_id,'event_format',v_format,'occurrence_count',v_count,
    'acuity_sync_enabled',coalesce(p_acuity_sync_enabled,false),
    'occurrences',public.flowtel_event_occurrence_json(p_event_id,auth.uid())
  );
end;
$$;
revoke all on function public.flowtel_admin_configure_queendom_event_operations(uuid,text,text,text,boolean,text,jsonb,integer) from public;
grant execute on function public.flowtel_admin_configure_queendom_event_operations(uuid,text,text,text,boolean,text,jsonb,integer) to authenticated;

-- Compatibility wrapper for the v0.10.89 owner UI/API while v0.10.90 moves to
-- the generic event operations RPC.
create or replace function public.flowtel_admin_configure_queendom_event_series(
  p_event_id uuid,
  p_event_format text default 'single',
  p_series_count integer default 1,
  p_series_interval_days integer default 7,
  p_acuity_appointment_type_id text default null,
  p_acuity_calendar_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_event public.flowtel_queendom_events%rowtype;
  v_occ jsonb:='[]'::jsonb;
  i integer;
  v_date date;
begin
  select * into v_event from public.flowtel_queendom_events where id=p_event_id;
  if v_event.id is null then raise exception 'Save the event before configuring its series.' using errcode='22023'; end if;
  if lower(coalesce(p_event_format,'single'))='series' then
    for i in 1..greatest(2,least(coalesce(p_series_count,4),104)) loop
      v_date:=v_event.event_date+((i-1)*greatest(1,least(coalesce(p_series_interval_days,7),90)));
      v_occ:=v_occ||jsonb_build_array(jsonb_build_object(
        'event_date',v_date,'start_time',to_char(v_event.start_time,'HH24:MI'),
        'end_time',case when v_event.end_time is null then null else to_char(v_event.end_time,'HH24:MI') end,
        'live_room_time',to_char(coalesce(v_event.live_room_time,v_event.start_time),'HH24:MI'),'is_series',true
      ));
    end loop;
  end if;
  return public.flowtel_admin_configure_queendom_event_operations(
    p_event_id,lower(coalesce(p_event_format,'single')),p_acuity_appointment_type_id,p_acuity_calendar_id,
    lower(coalesce(p_event_format,'single'))='series',null,v_occ,p_series_interval_days
  );
end;
$$;
revoke all on function public.flowtel_admin_configure_queendom_event_series(uuid,text,integer,integer,text,text) from public;
grant execute on function public.flowtel_admin_configure_queendom_event_series(uuid,text,integer,integer,text,text) to authenticated;

-- ---------------------------------------------------------------------------
-- Booking context + confirmation. Acuity-first: the browser never inserts a
-- confirmed Flowtel seat for an Acuity-linked event. /api/acuity books first,
-- maps the Acuity appointment(s), then calls the confirmation RPC.
-- ---------------------------------------------------------------------------

create or replace function public.flowtel_get_queendom_event_booking_context(
  p_event_id uuid,
  p_occurrence_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  v_member uuid:=auth.uid();
  v_event public.flowtel_queendom_events%rowtype;
  v_access jsonb;
  v_occ public.flowtel_queendom_event_occurrences%rowtype;
begin
  if v_member is null then raise exception 'Sign in before claiming this seat.' using errcode='42501'; end if;
  if not public.flowtel_current_user_has_product_access('flowtel') and not public.flowtel_current_user_is_event_pass() then
    raise exception 'This account cannot register for Flowtel events.' using errcode='42501';
  end if;
  select * into v_event from public.flowtel_queendom_events where id=p_event_id;
  if v_event.id is null or v_event.published_at is null or v_event.status<>'published' then raise exception 'That event is not currently open.' using errcode='22023'; end if;
  v_access:=public.flowtel_queendom_event_access_state(p_event_id,v_member);
  if not coalesce((v_access->>'entitled')::boolean,false) then
    if v_access->>'mode'='ticket' then raise exception 'A paid ticket is required before this seat can be claimed.' using errcode='42501'; end if;
    raise exception 'This gathering is reserved for the membership shown on the event.' using errcode='42501';
  end if;
  if v_event.event_format='recurring' then
    if p_occurrence_id is null then raise exception 'Choose which gathering you want to attend.' using errcode='22023'; end if;
    select * into v_occ from public.flowtel_queendom_event_occurrences where id=p_occurrence_id and event_id=p_event_id and status='scheduled';
    if v_occ.id is null then raise exception 'That gathering is no longer available.' using errcode='22023'; end if;
  elsif p_occurrence_id is not null then
    select * into v_occ from public.flowtel_queendom_event_occurrences where id=p_occurrence_id and event_id=p_event_id and status='scheduled';
  end if;

  return jsonb_build_object(
    'event_id',v_event.id,'title',v_event.title,'event_format',v_event.event_format,'event_timezone',v_event.event_timezone,
    'acuity_sync_enabled',v_event.acuity_sync_enabled,'acuity_appointment_type_id',v_event.acuity_appointment_type_id,
    'acuity_calendar_id',v_event.acuity_calendar_id,'access',v_access,
    'requested_occurrence_id',p_occurrence_id,
    'occurrence',case when v_occ.id is null then null else jsonb_build_object(
      'occurrence_id',v_occ.id,'occurrence_number',v_occ.occurrence_number,'event_date',v_occ.event_date,
      'starts_at',v_occ.starts_at,'ends_at',v_occ.ends_at,'live_room_starts_at',v_occ.live_room_starts_at,
      'slots_available',v_occ.acuity_slots_available
    ) end,
    'occurrences',public.flowtel_event_occurrence_json(v_event.id,v_member)
  );
end;
$$;
revoke all on function public.flowtel_get_queendom_event_booking_context(uuid,uuid) from public;
grant execute on function public.flowtel_get_queendom_event_booking_context(uuid,uuid) to authenticated;

create or replace function public.flowtel_get_queendom_event_series_booking_context(p_event_id uuid)
returns jsonb
language sql
stable
security definer
set search_path=public,auth
as $$
  select public.flowtel_get_queendom_event_booking_context(p_event_id,null);
$$;
revoke all on function public.flowtel_get_queendom_event_series_booking_context(uuid) from public;
grant execute on function public.flowtel_get_queendom_event_series_booking_context(uuid) to authenticated;

create or replace function public.flowtel_confirm_queendom_event_registration(
  p_event_id uuid,
  p_occurrence_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_member uuid:=auth.uid();
  v_event public.flowtel_queendom_events%rowtype;
  v_access jsonb;
  v_mapped boolean;
begin
  if v_member is null then raise exception 'Sign in before confirming this seat.' using errcode='42501'; end if;
  select * into v_event from public.flowtel_queendom_events where id=p_event_id for update;
  if v_event.id is null or v_event.status<>'published' then raise exception 'That event is not currently open.' using errcode='22023'; end if;
  v_access:=public.flowtel_queendom_event_access_state(p_event_id,v_member);
  if not coalesce((v_access->>'entitled')::boolean,false) then raise exception 'Your event access is not confirmed.' using errcode='42501'; end if;
  v_mapped:=coalesce(v_event.acuity_sync_enabled,false) and nullif(trim(coalesce(v_event.acuity_appointment_type_id,'')),'') is not null;

  if v_event.event_format='recurring' then
    if p_occurrence_id is null or not exists(select 1 from public.flowtel_queendom_event_occurrences o where o.id=p_occurrence_id and o.event_id=p_event_id and o.status='scheduled') then
      raise exception 'Choose an available occurrence.' using errcode='22023';
    end if;
    if v_mapped and not exists(
      select 1 from public.flowtel_queendom_event_occurrence_enrollments oe
      where oe.event_id=p_event_id and oe.occurrence_id=p_occurrence_id and oe.member_id=v_member and oe.status in ('scheduled','rescheduled') and oe.acuity_appointment_id is not null
    ) then raise exception 'Acuity has not confirmed this seat yet.' using errcode='55000'; end if;
    insert into public.flowtel_queendom_event_occurrence_registrations(event_id,occurrence_id,member_id,registered_at,cancelled_at,updated_at)
    values(p_event_id,p_occurrence_id,v_member,now(),null,now())
    on conflict(event_id,occurrence_id,member_id) do update set registered_at=now(),cancelled_at=null,updated_at=now();
  else
    if v_event.event_format='series' and v_mapped and not exists(
      select 1 from public.flowtel_queendom_event_series_enrollments se
      where se.event_id=p_event_id and se.member_id=v_member and se.status='active'
    ) then raise exception 'Acuity has not confirmed the full series yet.' using errcode='55000'; end if;
    if v_event.event_format='single' and v_mapped and not exists(
      select 1 from public.flowtel_queendom_event_occurrence_enrollments oe
      where oe.event_id=p_event_id and oe.member_id=v_member and oe.status in ('scheduled','rescheduled') and oe.acuity_appointment_id is not null
    ) then raise exception 'Acuity has not confirmed this seat yet.' using errcode='55000'; end if;
    insert into public.flowtel_queendom_event_registrations(event_id,member_id,registered_at,cancelled_at,updated_at)
    values(p_event_id,v_member,now(),null,now())
    on conflict(event_id,member_id) do update set registered_at=now(),cancelled_at=null,updated_at=now();
  end if;

  return jsonb_build_object('event_id',p_event_id,'occurrence_id',p_occurrence_id,'registered',true,'event_format',v_event.event_format,'access',v_access);
end;
$$;
revoke all on function public.flowtel_confirm_queendom_event_registration(uuid,uuid) from public;
grant execute on function public.flowtel_confirm_queendom_event_registration(uuid,uuid) to authenticated;

-- Legacy registration RPC now delegates new registrations to the confirmation
-- boundary only for non-Acuity events. Acuity-linked registration must go via
-- /api/acuity so capacity/booking completes first.
create or replace function public.flowtel_set_queendom_event_registration(p_event_id uuid,p_registered boolean default true)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_member uuid:=auth.uid();
  v_event public.flowtel_queendom_events%rowtype;
  v_access jsonb;
begin
  if v_member is null then raise exception 'Enter the Flowtel before saving an event.' using errcode='42501'; end if;
  select * into v_event from public.flowtel_queendom_events where id=p_event_id;
  if v_event.id is null then raise exception 'That event is not available.' using errcode='22023'; end if;
  if coalesce(p_registered,true) then
    if v_event.event_format='recurring' then raise exception 'Choose a specific recurring gathering.' using errcode='22023'; end if;
    if coalesce(v_event.acuity_sync_enabled,false) then raise exception 'This event is linked to Acuity. Claim the seat through the event doorway so capacity and reminders stay synchronized.' using errcode='55000'; end if;
    return public.flowtel_confirm_queendom_event_registration(p_event_id,null);
  end if;
  if v_event.event_format='series' and exists(
    select 1 from public.flowtel_queendom_event_series_enrollments se where se.event_id=p_event_id and se.member_id=v_member and se.status in ('pending','active')
  ) then raise exception 'This series is enrolled through Acuity. Message the Front Desk to leave it safely.' using errcode='22023'; end if;
  update public.flowtel_queendom_event_registrations set cancelled_at=now(),updated_at=now() where event_id=p_event_id and member_id=v_member and cancelled_at is null;
  v_access:=public.flowtel_queendom_event_access_state(p_event_id,v_member);
  return jsonb_build_object('event_id',p_event_id,'registered',false,'event_format',v_event.event_format,'access',v_access);
end;
$$;
revoke all on function public.flowtel_set_queendom_event_registration(uuid,boolean) from public;
grant execute on function public.flowtel_set_queendom_event_registration(uuid,boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Protected event entry + cyclical attendance snapshot
-- ---------------------------------------------------------------------------

create or replace function public.flowtel_enter_queendom_event(
  p_event_id uuid,
  p_occurrence_id uuid default null,
  p_event_cycle_day integer default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_member uuid:=auth.uid();
  v_event public.flowtel_queendom_events%rowtype;
  v_access jsonb;
  v_occ public.flowtel_queendom_event_occurrences%rowtype;
  v_registered boolean:=false;
  v_is_pass boolean:=false;
  v_today date:=(timezone('America/Los_Angeles',now()))::date;
  v_stay record;
  v_cycle_actual integer;
  v_cycle_recorded integer;
  v_season text;
  v_source text:='stay';
  v_meeting text;
  v_passcode text;
begin
  if v_member is null then raise exception 'Enter the Flowtel before opening this gathering.' using errcode='42501'; end if;
  select * into v_event from public.flowtel_queendom_events where id=p_event_id;
  if v_event.id is null or v_event.status<>'published' then raise exception 'That gathering is not currently open.' using errcode='22023'; end if;
  v_access:=public.flowtel_queendom_event_access_state(p_event_id,v_member);
  if not coalesce((v_access->>'entitled')::boolean,false) then raise exception 'Your event access is not confirmed.' using errcode='42501'; end if;
  v_is_pass:=public.flowtel_current_user_is_event_pass();

  if v_event.event_format='recurring' then
    if p_occurrence_id is null then raise exception 'Choose the gathering you are entering.' using errcode='22023'; end if;
    select * into v_occ from public.flowtel_queendom_event_occurrences where id=p_occurrence_id and event_id=p_event_id and status='scheduled';
    if v_occ.id is null then raise exception 'That gathering is no longer available.' using errcode='22023'; end if;
    select exists(select 1 from public.flowtel_queendom_event_occurrence_registrations rr where rr.occurrence_id=v_occ.id and rr.member_id=v_member and rr.cancelled_at is null) into v_registered;
  else
    select exists(select 1 from public.flowtel_queendom_event_registrations r where r.event_id=p_event_id and r.member_id=v_member and r.cancelled_at is null) into v_registered;
    if p_occurrence_id is not null then select * into v_occ from public.flowtel_queendom_event_occurrences where id=p_occurrence_id and event_id=p_event_id and status='scheduled'; end if;
    if v_event.event_format='series' and v_occ.id is null then
      select * into v_occ from public.flowtel_queendom_event_occurrences o
      where o.event_id=p_event_id and o.status='scheduled'
      order by case when coalesce(o.ends_at,o.live_room_starts_at,o.starts_at)>=now()-interval '60 minutes' then 0 else 1 end,
               case when coalesce(o.ends_at,o.live_room_starts_at,o.starts_at)>=now()-interval '60 minutes' then o.starts_at end asc,
               o.starts_at desc limit 1;
    end if;
  end if;
  if not v_registered then raise exception 'Claim your seat before entering this gathering.' using errcode='42501'; end if;

  if v_is_pass then
    if p_event_cycle_day is null then
      return jsonb_build_object('ready',false,'requires_event_cycle_day',true,'message','Tell Flowtel your current cycle day to enter this gathering.');
    end if;
    if p_event_cycle_day<1 or p_event_cycle_day>99 then raise exception 'Choose your current cycle day.' using errcode='22023'; end if;
    v_cycle_actual:=p_event_cycle_day;v_cycle_recorded:=p_event_cycle_day;v_season:=public.flowtel_event_season_for_cycle_day(p_event_cycle_day);v_source:='event_pass';
  else
    select s.id,s.cycle_day_actual,s.cycle_day_calculated,s.cycle_day_recorded,s.cycle_day_claimed,s.inner_season
      into v_stay
    from public.flowtel_stays s
    where s.client_id=v_member and s.checkin_date::date=v_today
    order by s.checked_in_at desc nulls last,s.created_at desc nulls last,s.id desc limit 1;
    if v_stay.id is null then
      return jsonb_build_object('ready',false,'requires_checkin',true,'checkin_url','/client/?returnToEvent='||p_event_id||case when p_occurrence_id is null then '' else '&returnToOccurrence='||p_occurrence_id end,'message','Check in to your cycle before entering this gathering.');
    end if;
    v_cycle_actual:=coalesce(v_stay.cycle_day_actual,v_stay.cycle_day_calculated,v_stay.cycle_day_claimed);
    v_cycle_recorded:=coalesce(v_stay.cycle_day_recorded,v_stay.cycle_day_claimed,v_cycle_actual);
    v_season:=coalesce(v_stay.inner_season,public.flowtel_event_season_for_cycle_day(v_cycle_actual));
  end if;

  if v_occ.id is not null then
    select coalesce(nullif(trim(oe.meeting_url),''),nullif(trim(v_event.zoom_url),'')) into v_meeting
      from public.flowtel_queendom_event_occurrence_enrollments oe
      where oe.occurrence_id=v_occ.id and oe.member_id=v_member and oe.status in ('scheduled','rescheduled') limit 1;
    v_meeting:=coalesce(v_meeting,nullif(trim(v_event.zoom_url),''));
  else
    select coalesce((select nullif(trim(oe.meeting_url),'') from public.flowtel_queendom_event_occurrence_enrollments oe where oe.event_id=p_event_id and oe.member_id=v_member and oe.status in ('scheduled','rescheduled') order by oe.created_at desc limit 1),nullif(trim(v_event.zoom_url),'')) into v_meeting;
  end if;
  v_passcode:=case when v_meeting is not null and v_meeting is distinct from nullif(trim(v_event.zoom_url),'') then null else v_event.zoom_passcode end;
  if v_meeting is null and v_event.location_type in ('zoom','hybrid') then
    raise exception 'Your Zoom doorway is still syncing from Acuity. Refresh in a moment.' using errcode='55000';
  end if;

  if v_occ.id is not null then
    insert into public.flowtel_queendom_event_attendance(event_id,occurrence_id,member_id,stay_id,flowtel_date,cycle_day_actual,cycle_day_recorded,inner_season,cycle_source)
    values(p_event_id,v_occ.id,v_member,case when v_is_pass then null else v_stay.id end,v_today,v_cycle_actual,v_cycle_recorded,v_season,v_source)
    on conflict(occurrence_id,member_id) where occurrence_id is not null do nothing;
  else
    insert into public.flowtel_queendom_event_attendance(event_id,occurrence_id,member_id,stay_id,flowtel_date,cycle_day_actual,cycle_day_recorded,inner_season,cycle_source)
    values(p_event_id,null,v_member,case when v_is_pass then null else v_stay.id end,v_today,v_cycle_actual,v_cycle_recorded,v_season,v_source)
    on conflict(event_id,member_id) where occurrence_id is null do nothing;
  end if;

  return jsonb_build_object('ready',true,'event_id',p_event_id,'occurrence_id',v_occ.id,'meeting_url',v_meeting,'zoom_passcode',v_passcode,'cycle_day',v_cycle_actual,'inner_season',v_season);
end;
$$;
revoke all on function public.flowtel_enter_queendom_event(uuid,uuid,integer) from public;
grant execute on function public.flowtel_enter_queendom_event(uuid,uuid,integer) to authenticated;

create or replace function public.flowtel_get_queendom_event_flow_map(
  p_event_id uuid,
  p_occurrence_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  v_event public.flowtel_queendom_events%rowtype;
  v_allowed boolean:=false;
  v_claimed jsonb;
  v_joined jsonb;
begin
  select * into v_event from public.flowtel_queendom_events where id=p_event_id;
  if v_event.id is null then raise exception 'That event could not be found.' using errcode='22023'; end if;
  v_allowed:=public.flowtel_current_user_is_admin_or_owner() or auth.uid()=v_event.host_member_id or auth.uid()=v_event.co_host_member_id;
  if not v_allowed then raise exception 'Only this gathering’s host, co-host, or Flowtel administration may open the Event Flow Map.' using errcode='42501'; end if;

  if v_event.event_format='recurring' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'member_id',rr.member_id,'display_name',coalesce(nullif(trim(p.display_name),''),nullif(trim(p.first_name),''),'Guest'),
      'profile_photo_url',coalesce(nullif(trim(pp.profile_photo_url),''),nullif(trim(p.mentor_photo_url),'')),
      'registered_at',rr.registered_at,'joined',exists(select 1 from public.flowtel_queendom_event_attendance a where a.occurrence_id=rr.occurrence_id and a.member_id=rr.member_id)
    ) order by coalesce(nullif(trim(p.display_name),''),nullif(trim(p.first_name),''),'Guest')),'[]'::jsonb) into v_claimed
    from public.flowtel_queendom_event_occurrence_registrations rr
    join public.profiles p on p.id=rr.member_id
    left join public.flow_fm_priestess_profiles pp on pp.member_id=rr.member_id
    where rr.event_id=p_event_id and rr.occurrence_id=p_occurrence_id and rr.cancelled_at is null;
  else
    select coalesce(jsonb_agg(jsonb_build_object(
      'member_id',r.member_id,'display_name',coalesce(nullif(trim(p.display_name),''),nullif(trim(p.first_name),''),'Guest'),
      'profile_photo_url',coalesce(nullif(trim(pp.profile_photo_url),''),nullif(trim(p.mentor_photo_url),'')),
      'registered_at',r.registered_at,'joined',exists(select 1 from public.flowtel_queendom_event_attendance a where a.event_id=r.event_id and a.member_id=r.member_id and (p_occurrence_id is null or a.occurrence_id=p_occurrence_id))
    ) order by coalesce(nullif(trim(p.display_name),''),nullif(trim(p.first_name),''),'Guest')),'[]'::jsonb) into v_claimed
    from public.flowtel_queendom_event_registrations r
    join public.profiles p on p.id=r.member_id
    left join public.flow_fm_priestess_profiles pp on pp.member_id=r.member_id
    where r.event_id=p_event_id and r.cancelled_at is null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'member_id',a.member_id,
    'display_name',coalesce(nullif(trim(p.display_name),''),nullif(trim(p.first_name),''),'Guest'),
    'profile_photo_url',coalesce(nullif(trim(pp.profile_photo_url),''),nullif(trim(p.mentor_photo_url),'')),
    'cycle_day',coalesce(a.cycle_day_actual,a.cycle_day_recorded),
    'inner_season',a.inner_season,
    'joined_at',a.joined_at
  ) order by a.joined_at),'[]'::jsonb) into v_joined
  from public.flowtel_queendom_event_attendance a
  join public.profiles p on p.id=a.member_id
  left join public.flow_fm_priestess_profiles pp on pp.member_id=a.member_id
  where a.event_id=p_event_id and (p_occurrence_id is null or a.occurrence_id=p_occurrence_id);

  return jsonb_build_object(
    'event_id',p_event_id,'occurrence_id',p_occurrence_id,'title',v_event.title,
    'claimed_count',jsonb_array_length(v_claimed),'joined_count',jsonb_array_length(v_joined),
    'claimed',v_claimed,'joined',v_joined
  );
end;
$$;
revoke all on function public.flowtel_get_queendom_event_flow_map(uuid,uuid) from public;
grant execute on function public.flowtel_get_queendom_event_flow_map(uuid,uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Discovery feeds: public visibility remains separate from entitlement.
-- ---------------------------------------------------------------------------

create or replace function public.flowtel_list_queendom_events(p_month_start date default null,p_month_count integer default 6)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  v_member uuid:=auth.uid();v_rank integer;v_start date;v_count integer:=greatest(1,least(coalesce(p_month_count,6),18));v_end date;v_result jsonb;
begin
  if v_member is null then raise exception 'Sign in to open your upcoming events.' using errcode='42501'; end if;
  if not public.flowtel_current_user_has_product_access('flowtel') and not public.flowtel_current_user_is_event_pass() then raise exception 'This account does not have access to the Flowtel event calendar.' using errcode='42501'; end if;
  v_rank:=public.flowtel_queendom_event_member_rank(v_member);
  if v_rank<1 and not public.flowtel_current_user_is_event_pass() then raise exception 'A Queendom membership is required to open this calendar.' using errcode='42501'; end if;
  v_start:=coalesce(p_month_start,date_trunc('month',(timezone('America/Los_Angeles',now()))::date)::date);v_end:=(v_start+make_interval(months=>v_count))::date;
  select coalesce(jsonb_agg(jsonb_build_object(
    'event_id',e.id,'title',e.title,'event_type',e.event_type,'description',e.description,'event_date',e.event_date,
    'start_time',to_char(e.start_time,'HH24:MI'),'end_time',case when e.end_time is null then null else to_char(e.end_time,'HH24:MI') end,
    'starts_at',e.starts_at,'ends_at',e.ends_at,'event_timezone',e.event_timezone,
    'live_room_time',case when e.live_room_time is null then null else to_char(e.live_room_time,'HH24:MI') end,'live_room_starts_at',e.live_room_starts_at,
    'host_name',e.host_name,'host_member_id',e.host_member_id,'co_host_name',e.co_host_name,'co_host_member_id',e.co_host_member_id,
    'host_timezone',case when coalesce(h.flow_fm_team_map_opt_out,false)=false then h.timezone else null end,
    'co_host_timezone',case when coalesce(ch.flow_fm_team_map_opt_out,false)=false then ch.timezone else null end,
    'audience',e.audience,'image_url',e.image_url,'status',e.status,'will_be_recorded',e.will_be_recorded,
    'public_access',e.public_access,'queendom_access',e.queendom_access,'flowfm_access',e.flowfm_access,
    'public_price',e.public_price,'queendom_price',e.queendom_price,'flowfm_price',e.flowfm_price,'access_currency',e.access_currency,'ticket_url',e.ticket_url,
    'event_format',e.event_format,'series_count',e.series_count,'series_interval_days',e.series_interval_days,
    'acuity_sync_enabled',e.acuity_sync_enabled,'acuity_schedule_label',e.acuity_schedule_label,
    'occurrences',case when e.event_format in ('recurring','series') or exists(select 1 from public.flowtel_queendom_event_occurrences ox where ox.event_id=e.id)
      then public.flowtel_event_occurrence_json(e.id,v_member) else '[]'::jsonb end,
    'series_enrollment_status',(select se.status from public.flowtel_queendom_event_series_enrollments se where se.event_id=e.id and se.member_id=v_member),
    'access',public.flowtel_queendom_event_access_state(e.id,v_member),
    'is_registered',case when e.event_format='recurring' then exists(select 1 from public.flowtel_queendom_event_occurrence_registrations rr where rr.event_id=e.id and rr.member_id=v_member and rr.cancelled_at is null)
      else exists(select 1 from public.flowtel_queendom_event_registrations r where r.event_id=e.id and r.member_id=v_member and r.cancelled_at is null) end,
    'can_join',(public.flowtel_queendom_event_access_state(e.id,v_member)->>'entitled')::boolean,
    'registration_count',case when e.event_format='recurring' then (select count(*)::integer from public.flowtel_queendom_event_occurrence_registrations rr where rr.event_id=e.id and rr.cancelled_at is null)
      else (select count(*)::integer from public.flowtel_queendom_event_registrations r where r.event_id=e.id and r.cancelled_at is null) end
  ) order by coalesce((select min(o.starts_at) from public.flowtel_queendom_event_occurrences o where o.event_id=e.id and o.status='scheduled'),e.starts_at),e.title),'[]'::jsonb) into v_result
  from public.flowtel_queendom_events e
  left join public.profiles h on h.id=e.host_member_id
  left join public.profiles ch on ch.id=e.co_host_member_id
  where e.published_at is not null and e.status in ('published','cancelled') and (
    (not exists(select 1 from public.flowtel_queendom_event_occurrences o where o.event_id=e.id) and e.event_date>=v_start and e.event_date<v_end)
    or exists(select 1 from public.flowtel_queendom_event_occurrences o where o.event_id=e.id and o.event_date>=v_start and o.event_date<v_end)
  );
  return v_result;
end;
$$;
revoke all on function public.flowtel_list_queendom_events(date,integer) from public;
grant execute on function public.flowtel_list_queendom_events(date,integer) to authenticated;

create or replace function public.flowtel_public_queendom_events(p_month_start date default null,p_month_count integer default 3)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare v_start date:=coalesce(p_month_start,date_trunc('month',(timezone('America/Los_Angeles',now()))::date)::date);v_count integer:=greatest(1,least(coalesce(p_month_count,3),18));v_end date;v_result jsonb;
begin
  v_end:=(v_start+make_interval(months=>v_count))::date;
  select coalesce(jsonb_agg(jsonb_build_object(
    'event_id',e.id,'title',e.title,'event_type',e.event_type,'description',e.description,'event_date',e.event_date,
    'start_time',to_char(e.start_time,'HH24:MI'),'end_time',case when e.end_time is null then null else to_char(e.end_time,'HH24:MI') end,
    'starts_at',e.starts_at,'ends_at',e.ends_at,'event_timezone',e.event_timezone,
    'live_room_time',case when e.live_room_time is null then null else to_char(e.live_room_time,'HH24:MI') end,'live_room_starts_at',e.live_room_starts_at,
    'host_name',e.host_name,'host_member_id',e.host_member_id,'co_host_name',e.co_host_name,'co_host_member_id',e.co_host_member_id,
    'host_timezone',case when coalesce(h.flow_fm_team_map_opt_out,false)=false then h.timezone else null end,
    'co_host_timezone',case when coalesce(ch.flow_fm_team_map_opt_out,false)=false then ch.timezone else null end,
    'audience',e.audience,'image_url',e.image_url,'status',e.status,'will_be_recorded',e.will_be_recorded,
    'public_access',e.public_access,'queendom_access',e.queendom_access,'flowfm_access',e.flowfm_access,
    'public_price',e.public_price,'queendom_price',e.queendom_price,'flowfm_price',e.flowfm_price,'access_currency',e.access_currency,'ticket_url',e.ticket_url,
    'event_format',e.event_format,'series_count',e.series_count,'series_interval_days',e.series_interval_days,
    'acuity_sync_enabled',e.acuity_sync_enabled,'acuity_schedule_label',e.acuity_schedule_label,
    'occurrences',case when e.event_format in ('recurring','series') or exists(select 1 from public.flowtel_queendom_event_occurrences ox where ox.event_id=e.id)
      then public.flowtel_event_occurrence_json(e.id,null) else '[]'::jsonb end,
    'registration_count',case when e.event_format='recurring' then (select count(*)::integer from public.flowtel_queendom_event_occurrence_registrations rr where rr.event_id=e.id and rr.cancelled_at is null)
      else (select count(*)::integer from public.flowtel_queendom_event_registrations r where r.event_id=e.id and r.cancelled_at is null) end
  ) order by coalesce((select min(o.starts_at) from public.flowtel_queendom_event_occurrences o where o.event_id=e.id and o.status='scheduled'),e.starts_at),e.title),'[]'::jsonb) into v_result
  from public.flowtel_queendom_events e
  left join public.profiles h on h.id=e.host_member_id
  left join public.profiles ch on ch.id=e.co_host_member_id
  where e.published_at is not null and e.status in ('published','cancelled') and (
    (not exists(select 1 from public.flowtel_queendom_event_occurrences o where o.event_id=e.id) and e.event_date>=v_start and e.event_date<v_end)
    or exists(select 1 from public.flowtel_queendom_event_occurrences o where o.event_id=e.id and o.event_date>=v_start and o.event_date<v_end)
  );
  return v_result;
end;
$$;
revoke all on function public.flowtel_public_queendom_events(date,integer) from public;
grant execute on function public.flowtel_public_queendom_events(date,integer) to anon,authenticated;

-- Protected room details omit Zoom URLs. The actual meeting doorway is returned
-- only by flowtel_enter_queendom_event after current check-in + attendance log.
create or replace function public.flowtel_get_queendom_event_join_details(p_event_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare v_member uuid:=auth.uid();v_event public.flowtel_queendom_events%rowtype;v_access jsonb;v_registered boolean;v_series_status text;v_can_map boolean;
begin
  if v_member is null then raise exception 'Enter the Flowtel before opening this event room.' using errcode='42501'; end if;
  select * into v_event from public.flowtel_queendom_events where id=p_event_id;
  if v_event.id is null or v_event.published_at is null or v_event.status<>'published' then raise exception 'That event is not currently open.' using errcode='22023'; end if;
  v_can_map:=public.flowtel_current_user_is_admin_or_owner() or v_member=v_event.host_member_id or v_member=v_event.co_host_member_id;
  v_access:=public.flowtel_queendom_event_access_state(p_event_id,v_member);
  if not coalesce((v_access->>'entitled')::boolean,false) and not v_can_map then raise exception 'This event room opens after your event access is confirmed.' using errcode='42501'; end if;
  if v_event.event_format='recurring' then
    select exists(select 1 from public.flowtel_queendom_event_occurrence_registrations rr where rr.event_id=p_event_id and rr.member_id=v_member and rr.cancelled_at is null) into v_registered;
  else
    select exists(select 1 from public.flowtel_queendom_event_registrations r where r.event_id=p_event_id and r.member_id=v_member and r.cancelled_at is null) into v_registered;
  end if;
  if not v_registered and not v_can_map then raise exception 'Claim your seat before opening the event room.' using errcode='42501'; end if;
  select se.status into v_series_status from public.flowtel_queendom_event_series_enrollments se where se.event_id=p_event_id and se.member_id=v_member;
  return jsonb_build_object(
    'event_id',v_event.id,'title',v_event.title,'event_type',v_event.event_type,'description',v_event.description,
    'event_date',v_event.event_date,'starts_at',v_event.starts_at,'ends_at',v_event.ends_at,'event_timezone',v_event.event_timezone,
    'live_room_starts_at',coalesce(v_event.live_room_starts_at,v_event.starts_at),
    'host_name',v_event.host_name,'host_member_id',v_event.host_member_id,'co_host_name',v_event.co_host_name,'co_host_member_id',v_event.co_host_member_id,
    'will_be_recorded',v_event.will_be_recorded,'how_to_prepare',v_event.how_to_prepare,'attendee_guide_url',v_event.attendee_guide_url,
    'location_type',v_event.location_type,'private_location',v_event.private_location,'access',v_access,
    'event_format',v_event.event_format,'series_count',v_event.series_count,'series_interval_days',v_event.series_interval_days,
    'series_enrollment_status',v_series_status,'can_view_flow_map',v_can_map,'is_operational_host',v_can_map,'is_registered',v_registered,
    'occurrences',public.flowtel_event_occurrence_json(v_event.id,v_member)
  );
end;
$$;
revoke all on function public.flowtel_get_queendom_event_join_details(uuid) from public;
grant execute on function public.flowtel_get_queendom_event_join_details(uuid) to authenticated;

create or replace function public.flowtel_admin_list_queendom_events()
returns jsonb language plpgsql stable security definer set search_path=public,auth
as $$
declare v_result jsonb;
begin
  if not public.flowtel_current_user_is_admin_or_owner() then raise exception 'Only Flowtel administration may manage Queendom events.' using errcode='42501'; end if;
  select coalesce(jsonb_agg(to_jsonb(e) || jsonb_build_object(
    'event_id',e.id,'start_time',to_char(e.start_time,'HH24:MI'),'end_time',case when e.end_time is null then null else to_char(e.end_time,'HH24:MI') end,
    'live_room_time',case when e.live_room_time is null then null else to_char(e.live_room_time,'HH24:MI') end,
    'registration_count',case when e.event_format='recurring' then (select count(*)::integer from public.flowtel_queendom_event_occurrence_registrations rr where rr.event_id=e.id and rr.cancelled_at is null) else (select count(*)::integer from public.flowtel_queendom_event_registrations r where r.event_id=e.id and r.cancelled_at is null) end,
    'series_enrollment_count',(select count(*)::integer from public.flowtel_queendom_event_series_enrollments se where se.event_id=e.id and se.status='active'),
    'attendance_count',(select count(*)::integer from public.flowtel_queendom_event_attendance a where a.event_id=e.id),
    'occurrences',public.flowtel_event_occurrence_json(e.id,null)
  ) order by e.event_date desc,e.start_time desc),'[]'::jsonb) into v_result from public.flowtel_queendom_events e;
  return v_result;
end;
$$;
revoke all on function public.flowtel_admin_list_queendom_events() from public;
grant execute on function public.flowtel_admin_list_queendom_events() to authenticated;

-- Acuity-linked events must be cancelled in Acuity first. Otherwise Acuity may
-- continue to hold seats and send reminders after Flowtel says the gathering is
-- closed. This applies to single, recurring, and series events.
create or replace function public.flowtel_admin_cancel_queendom_event(p_event_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public,auth
as $$
declare v_event public.flowtel_queendom_events%rowtype;
begin
  if not public.flowtel_current_user_is_admin_or_owner() then
    raise exception 'Only Flowtel administration may cancel Queendom events.' using errcode='42501';
  end if;
  select * into v_event from public.flowtel_queendom_events where id=p_event_id;
  if v_event.id is null then raise exception 'That event could not be found.' using errcode='22023'; end if;
  if coalesce(v_event.acuity_sync_enabled,false) and exists(
    select 1 from public.flowtel_queendom_event_occurrence_enrollments oe
    where oe.event_id=p_event_id and oe.status in ('pending','scheduled','rescheduled')
  ) then
    raise exception 'Cancel the active member appointments in Acuity first. After Acuity webhooks mark those linked seats cancelled, return here to cancel the Flowtel event so reminders and room access stay consistent.' using errcode='22023';
  end if;
  if v_event.event_format='series' and exists(
    select 1 from public.flowtel_queendom_event_series_enrollments se
    where se.event_id=p_event_id and se.status in ('pending','active')
  ) then
    raise exception 'Cancel the enrolled Acuity series first. After its session webhooks mark the Flowtel enrollment cancelled, return here to cancel the Flowtel event.' using errcode='22023';
  end if;
  update public.flowtel_queendom_events
  set status='cancelled',cancelled_at=now(),updated_by=auth.uid(),updated_at=now()
  where id=p_event_id and published_at is not null;
  if not found then raise exception 'That published event could not be found.' using errcode='22023'; end if;
  update public.flowtel_queendom_event_occurrences set status='cancelled',updated_at=now() where event_id=p_event_id;
  return true;
end;
$$;
revoke all on function public.flowtel_admin_cancel_queendom_event(uuid) from public;
grant execute on function public.flowtel_admin_cancel_queendom_event(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
