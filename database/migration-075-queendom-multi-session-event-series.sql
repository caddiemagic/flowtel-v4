-- Flowtel v0.10.89 — Multi-Session Event Series + Acuity Group Enrollment
-- Migration 075
--
-- Keeps the existing Queendom event as the canonical parent/container.
-- Adds repeatable session occurrences plus a private Acuity enrollment/sync layer.
-- Existing single-session events continue to use the exact same registration,
-- ticket/payment, Event Pass, and protected Event Room boundaries.

begin;

alter table public.flowtel_queendom_events
  add column if not exists event_format text not null default 'single',
  add column if not exists series_count integer not null default 1,
  add column if not exists series_interval_days integer not null default 7,
  add column if not exists acuity_appointment_type_id text,
  add column if not exists acuity_calendar_id text;

alter table public.flowtel_queendom_events
  drop constraint if exists flowtel_queendom_events_event_format_check,
  add constraint flowtel_queendom_events_event_format_check
    check (event_format in ('single','series')),
  drop constraint if exists flowtel_queendom_events_series_count_check,
  add constraint flowtel_queendom_events_series_count_check
    check (series_count between 1 and 12),
  drop constraint if exists flowtel_queendom_events_series_interval_days_check,
  add constraint flowtel_queendom_events_series_interval_days_check
    check (series_interval_days between 1 and 90);

create table if not exists public.flowtel_queendom_event_occurrences (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.flowtel_queendom_events(id) on delete cascade,
  occurrence_number integer not null check (occurrence_number between 1 and 12),
  event_date date not null,
  start_time time without time zone not null,
  end_time time without time zone,
  starts_at timestamptz not null,
  ends_at timestamptz,
  live_room_time time without time zone not null,
  live_room_starts_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id,occurrence_number)
);

create index if not exists flowtel_queendom_event_occurrences_event_date_idx
  on public.flowtel_queendom_event_occurrences(event_id,event_date,occurrence_number);
create index if not exists flowtel_queendom_event_occurrences_starts_idx
  on public.flowtel_queendom_event_occurrences(starts_at);

create table if not exists public.flowtel_queendom_event_series_enrollments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.flowtel_queendom_events(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','active','failed','cancelled')),
  acuity_series_anchor_id text,
  error_text text,
  enrolled_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id,member_id)
);

create index if not exists flowtel_queendom_event_series_enrollments_member_idx
  on public.flowtel_queendom_event_series_enrollments(member_id,event_id);

create table if not exists public.flowtel_queendom_event_occurrence_enrollments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.flowtel_queendom_events(id) on delete cascade,
  occurrence_id uuid not null references public.flowtel_queendom_event_occurrences(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  acuity_appointment_id text,
  status text not null default 'pending' check (status in ('pending','scheduled','rescheduled','cancelled')),
  meeting_url text,
  external_payload jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id,occurrence_id,member_id),
  unique(acuity_appointment_id)
);

create index if not exists flowtel_queendom_event_occurrence_enrollments_member_idx
  on public.flowtel_queendom_event_occurrence_enrollments(member_id,event_id);
create index if not exists flowtel_queendom_event_occurrence_enrollments_acuity_idx
  on public.flowtel_queendom_event_occurrence_enrollments(acuity_appointment_id)
  where acuity_appointment_id is not null;

alter table public.flowtel_queendom_event_occurrences enable row level security;
alter table public.flowtel_queendom_event_series_enrollments enable row level security;
alter table public.flowtel_queendom_event_occurrence_enrollments enable row level security;

-- These tables are intentionally RPC/server-only. They contain operational
-- scheduling data and may contain protected Zoom URLs in the enrollment layer.
revoke all on table public.flowtel_queendom_event_occurrences from anon,authenticated;
revoke all on table public.flowtel_queendom_event_series_enrollments from anon,authenticated;
revoke all on table public.flowtel_queendom_event_occurrence_enrollments from anon,authenticated;

-- Protect an already-enrolled series from silent parent schedule drift. Content
-- such as title, description, host, artwork, and preparation may still change.
create or replace function public.flowtel_protect_enrolled_queendom_event_series_schedule()
returns trigger
language plpgsql
security definer
set search_path=public,auth
as $$
begin
  if old.event_format='series'
     and exists(
       select 1 from public.flowtel_queendom_event_series_enrollments se
       where se.event_id=old.id and se.status in ('pending','active')
     )
     and (
       new.event_date is distinct from old.event_date
       or new.start_time is distinct from old.start_time
       or new.end_time is distinct from old.end_time
       or new.event_timezone is distinct from old.event_timezone
       or new.live_room_time is distinct from old.live_room_time
     ) then
    raise exception 'This event series already has Acuity enrollments. Keep its session schedule fixed; update the Acuity series and create a new Flowtel series if the dates must change.' using errcode='22023';
  end if;
  return new;
end;
$$;

revoke all on function public.flowtel_protect_enrolled_queendom_event_series_schedule() from public,anon,authenticated;

drop trigger if exists flowtel_protect_enrolled_queendom_event_series_schedule_trigger on public.flowtel_queendom_events;
create trigger flowtel_protect_enrolled_queendom_event_series_schedule_trigger
before update of event_date,start_time,end_time,event_timezone,live_room_time
on public.flowtel_queendom_events
for each row execute function public.flowtel_protect_enrolled_queendom_event_series_schedule();

-- Configure the series layer after the existing canonical event save RPC has
-- persisted the parent event. This avoids replacing the mature access/ticket
-- save function solely to add recurrence metadata.
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
  v_format text:=lower(trim(coalesce(p_event_format,'single')));
  v_count integer:=coalesce(p_series_count,1);
  v_interval integer:=coalesce(p_series_interval_days,7);
  v_type text:=nullif(trim(coalesce(p_acuity_appointment_type_id,'')),'');
  v_calendar text:=nullif(trim(coalesce(p_acuity_calendar_id,'')),'');
  v_has_enrollment boolean:=false;
  v_date date;
  v_start timestamptz;
  v_end timestamptz;
  v_live timestamptz;
  v_live_time time without time zone;
  i integer;
begin
  if not public.flowtel_current_user_is_admin_or_owner() then
    raise exception 'Only Flowtel administration may configure event series.' using errcode='42501';
  end if;

  select * into v_event from public.flowtel_queendom_events where id=p_event_id for update;
  if v_event.id is null then raise exception 'Save the event before configuring its series.' using errcode='22023'; end if;
  if v_format not in ('single','series') then raise exception 'Choose Single Event or Multi-Session Series.' using errcode='22023'; end if;

  select exists(
    select 1 from public.flowtel_queendom_event_series_enrollments se
    where se.event_id=p_event_id and se.status in ('pending','active')
  ) into v_has_enrollment;

  if v_format='single' then
    if v_has_enrollment and v_event.event_format='series' then
      raise exception 'This series already has Acuity enrollments and cannot be converted back to a single event.' using errcode='22023';
    end if;
    delete from public.flowtel_queendom_event_occurrences where event_id=p_event_id;
    update public.flowtel_queendom_events
      set event_format='single',series_count=1,series_interval_days=7,
          acuity_appointment_type_id=null,acuity_calendar_id=null,updated_at=now(),updated_by=auth.uid()
      where id=p_event_id;
    return jsonb_build_object('event_id',p_event_id,'event_format','single','occurrences','[]'::jsonb);
  end if;

  if v_count<2 or v_count>12 then raise exception 'A multi-session series needs between 2 and 12 sessions.' using errcode='22023'; end if;
  if v_interval<1 or v_interval>90 then raise exception 'Choose between 1 and 90 days between sessions.' using errcode='22023'; end if;
  if v_event.status='published' and (v_type is null or v_calendar is null) then
    raise exception 'Published event series must be mapped to an Acuity series and calendar.' using errcode='22023';
  end if;

  if v_has_enrollment and (
    v_event.event_format is distinct from 'series'
    or v_event.series_count is distinct from v_count
    or v_event.series_interval_days is distinct from v_interval
    or v_event.acuity_appointment_type_id is distinct from v_type
    or v_event.acuity_calendar_id is distinct from v_calendar
  ) then
    raise exception 'This event series already has Acuity enrollments. Its session count, cadence, and Acuity mapping are locked.' using errcode='22023';
  end if;

  update public.flowtel_queendom_events
    set event_format='series',series_count=v_count,series_interval_days=v_interval,
        acuity_appointment_type_id=v_type,acuity_calendar_id=v_calendar,
        updated_at=now(),updated_by=auth.uid()
    where id=p_event_id;

  if not v_has_enrollment then
    delete from public.flowtel_queendom_event_occurrences where event_id=p_event_id;
    v_live_time:=coalesce(v_event.live_room_time,v_event.start_time);
    for i in 1..v_count loop
      v_date:=v_event.event_date+((i-1)*v_interval);
      v_start:=(v_date+v_event.start_time) at time zone v_event.event_timezone;
      if v_event.end_time is not null then v_end:=(v_date+v_event.end_time) at time zone v_event.event_timezone; else v_end:=null; end if;
      v_live:=(v_date+v_live_time) at time zone v_event.event_timezone;
      insert into public.flowtel_queendom_event_occurrences(
        event_id,occurrence_number,event_date,start_time,end_time,starts_at,ends_at,live_room_time,live_room_starts_at,status
      ) values(
        p_event_id,i,v_date,v_event.start_time,v_event.end_time,v_start,v_end,v_live_time,v_live,
        case when v_event.status='cancelled' then 'cancelled' else 'scheduled' end
      );
    end loop;
  end if;

  return jsonb_build_object(
    'event_id',p_event_id,'event_format','series','series_count',v_count,'series_interval_days',v_interval,
    'occurrences',coalesce((
      select jsonb_agg(jsonb_build_object(
        'occurrence_id',o.id,'occurrence_number',o.occurrence_number,'event_date',o.event_date,
        'start_time',to_char(o.start_time,'HH24:MI'),'end_time',case when o.end_time is null then null else to_char(o.end_time,'HH24:MI') end,
        'starts_at',o.starts_at,'ends_at',o.ends_at,'live_room_starts_at',o.live_room_starts_at,'status',o.status
      ) order by o.occurrence_number)
      from public.flowtel_queendom_event_occurrences o where o.event_id=p_event_id
    ),'[]'::jsonb)
  );
end;
$$;

revoke all on function public.flowtel_admin_configure_queendom_event_series(uuid,text,integer,integer,text,text) from public;
grant execute on function public.flowtel_admin_configure_queendom_event_series(uuid,text,integer,integer,text,text) to authenticated;

-- Server booking context. Uses the exact same entitlement + active Flowtel
-- registration boundary as the protected Event Room before Acuity is touched.
create or replace function public.flowtel_get_queendom_event_series_booking_context(p_event_id uuid)
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
  v_registered boolean;
  v_status text;
begin
  if v_member is null then raise exception 'Enter the Flowtel before joining this series.' using errcode='42501'; end if;
  select * into v_event from public.flowtel_queendom_events where id=p_event_id;
  if v_event.id is null or v_event.published_at is null or v_event.status<>'published' or v_event.event_format<>'series' then
    raise exception 'That event series is not currently open.' using errcode='22023';
  end if;
  v_access:=public.flowtel_queendom_event_access_state(p_event_id,v_member);
  if not coalesce((v_access->>'entitled')::boolean,false) then
    raise exception 'This series opens after your event access is confirmed.' using errcode='42501';
  end if;
  select exists(
    select 1 from public.flowtel_queendom_event_registrations r
    where r.event_id=p_event_id and r.member_id=v_member and r.cancelled_at is null
  ) into v_registered;
  if not v_registered then raise exception 'Join the Flowtel event before Acuity enrollment.' using errcode='42501'; end if;
  if nullif(trim(coalesce(v_event.acuity_appointment_type_id,'')),'') is null or nullif(trim(coalesce(v_event.acuity_calendar_id,'')),'') is null then
    raise exception 'The owner still needs to map this event to its Acuity series.' using errcode='55000';
  end if;

  select se.status into v_status from public.flowtel_queendom_event_series_enrollments se
  where se.event_id=p_event_id and se.member_id=v_member;

  return jsonb_build_object(
    'event_id',v_event.id,'title',v_event.title,'event_timezone',v_event.event_timezone,
    'event_format',v_event.event_format,'series_count',v_event.series_count,'series_interval_days',v_event.series_interval_days,
    'acuity_appointment_type_id',v_event.acuity_appointment_type_id,'acuity_calendar_id',v_event.acuity_calendar_id,
    'series_enrollment_status',v_status,
    'occurrences',coalesce((
      select jsonb_agg(jsonb_build_object(
        'occurrence_id',o.id,'occurrence_number',o.occurrence_number,'event_date',o.event_date,
        'starts_at',o.starts_at,'ends_at',o.ends_at,'live_room_starts_at',o.live_room_starts_at,'status',o.status
      ) order by o.occurrence_number)
      from public.flowtel_queendom_event_occurrences o where o.event_id=v_event.id
    ),'[]'::jsonb)
  );
end;
$$;

revoke all on function public.flowtel_get_queendom_event_series_booking_context(uuid) from public;
grant execute on function public.flowtel_get_queendom_event_series_booking_context(uuid) to authenticated;

-- Member feed: one parent card with a non-sensitive occurrence itinerary.
create or replace function public.flowtel_list_queendom_events(p_month_start date default null,p_month_count integer default 6)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  v_member uuid:=auth.uid(); v_rank integer; v_start date; v_count integer:=greatest(1,least(coalesce(p_month_count,6),18)); v_end date; v_result jsonb;
begin
  if v_member is null then raise exception 'Sign in to open your upcoming events.' using errcode='42501'; end if;
  if not public.flowtel_current_user_has_product_access('flowtel') and not public.flowtel_current_user_is_event_pass() then
    raise exception 'This account does not have access to the Flowtel event calendar.' using errcode='42501';
  end if;
  v_rank:=public.flowtel_queendom_event_member_rank(v_member);
  if v_rank<1 and not public.flowtel_current_user_is_event_pass() then raise exception 'A Queendom membership is required to open this calendar.' using errcode='42501'; end if;
  v_start:=coalesce(p_month_start,date_trunc('month',(timezone('America/Los_Angeles',now()))::date)::date); v_end:=(v_start+make_interval(months=>v_count))::date;
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
    'occurrences',case when e.event_format='series' then coalesce((select jsonb_agg(jsonb_build_object(
      'occurrence_id',o.id,'occurrence_number',o.occurrence_number,'event_date',o.event_date,
      'start_time',to_char(o.start_time,'HH24:MI'),'end_time',case when o.end_time is null then null else to_char(o.end_time,'HH24:MI') end,
      'starts_at',o.starts_at,'ends_at',o.ends_at,'live_room_starts_at',o.live_room_starts_at,'status',o.status
    ) order by o.occurrence_number) from public.flowtel_queendom_event_occurrences o where o.event_id=e.id),'[]'::jsonb) else '[]'::jsonb end,
    'series_enrollment_status',(select se.status from public.flowtel_queendom_event_series_enrollments se where se.event_id=e.id and se.member_id=v_member),
    'access',public.flowtel_queendom_event_access_state(e.id,v_member),
    'is_registered',coalesce(r.cancelled_at is null and r.registered_at is not null,false),
    'can_join',(public.flowtel_queendom_event_access_state(e.id,v_member)->>'entitled')::boolean,
    'zoom_ready',case when e.event_format='series' then (
      nullif(trim(coalesce(e.zoom_url,'')),'') is not null or exists(
        select 1 from public.flowtel_queendom_event_occurrence_enrollments oe
        where oe.event_id=e.id and oe.member_id=v_member and oe.status in ('scheduled','rescheduled') and nullif(trim(coalesce(oe.meeting_url,'')),'') is not null
      )
    ) else (e.status='published' and nullif(trim(coalesce(e.zoom_url,'')),'') is not null) end,
    'registration_count',(select count(*)::integer from public.flowtel_queendom_event_registrations rr where rr.event_id=e.id and rr.cancelled_at is null)
  ) order by coalesce(e.live_room_starts_at,e.starts_at),e.title),'[]'::jsonb) into v_result
  from public.flowtel_queendom_events e
  left join public.flowtel_queendom_event_registrations r on r.event_id=e.id and r.member_id=v_member
  left join public.profiles h on h.id=e.host_member_id
  left join public.profiles ch on ch.id=e.co_host_member_id
  where e.published_at is not null and e.status in ('published','cancelled') and (
    (e.event_format='single' and e.event_date>=v_start and e.event_date<v_end)
    or (e.event_format='series' and exists(select 1 from public.flowtel_queendom_event_occurrences o where o.event_id=e.id and o.event_date>=v_start and o.event_date<v_end))
  );
  return v_result;
end;
$$;
revoke all on function public.flowtel_list_queendom_events(date,integer) from public;
grant execute on function public.flowtel_list_queendom_events(date,integer) to authenticated;

-- Public agenda receives the session itinerary but never enrollment state,
-- private location, attendee guide, Zoom URLs, or passcodes.
create or replace function public.flowtel_public_queendom_events(p_month_start date default null,p_month_count integer default 3)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare v_start date:=coalesce(p_month_start,date_trunc('month',(timezone('America/Los_Angeles',now()))::date)::date); v_count integer:=greatest(1,least(coalesce(p_month_count,3),18)); v_end date; v_result jsonb;
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
    'occurrences',case when e.event_format='series' then coalesce((select jsonb_agg(jsonb_build_object(
      'occurrence_id',o.id,'occurrence_number',o.occurrence_number,'event_date',o.event_date,
      'start_time',to_char(o.start_time,'HH24:MI'),'end_time',case when o.end_time is null then null else to_char(o.end_time,'HH24:MI') end,
      'starts_at',o.starts_at,'ends_at',o.ends_at,'live_room_starts_at',o.live_room_starts_at,'status',o.status
    ) order by o.occurrence_number) from public.flowtel_queendom_event_occurrences o where o.event_id=e.id),'[]'::jsonb) else '[]'::jsonb end
  ) order by coalesce(e.live_room_starts_at,e.starts_at),e.title),'[]'::jsonb) into v_result
  from public.flowtel_queendom_events e
  left join public.profiles h on h.id=e.host_member_id
  left join public.profiles ch on ch.id=e.co_host_member_id
  where e.published_at is not null and e.status in ('published','cancelled') and (
    (e.event_format='single' and e.event_date>=v_start and e.event_date<v_end)
    or (e.event_format='series' and exists(select 1 from public.flowtel_queendom_event_occurrences o where o.event_id=e.id and o.event_date>=v_start and o.event_date<v_end))
  );
  return v_result;
end;
$$;
revoke all on function public.flowtel_public_queendom_events(date,integer) from public;
grant execute on function public.flowtel_public_queendom_events(date,integer) to anon,authenticated;

-- Registration preserves the existing entitlement boundary and now tells the
-- browser whether the saved seat belongs to a series so the existing Acuity
-- function can enroll it without a second registration system.
create or replace function public.flowtel_set_queendom_event_registration(p_event_id uuid,p_registered boolean default true)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare v_member uuid:=auth.uid(); v_event public.flowtel_queendom_events%rowtype; v_access jsonb;
begin
  if v_member is null then raise exception 'Sign in before saving an event.' using errcode='42501'; end if;
  if not public.flowtel_current_user_has_product_access('flowtel') and not public.flowtel_current_user_is_event_pass() then
    raise exception 'This account cannot register for Flowtel events.' using errcode='42501';
  end if;
  select * into v_event from public.flowtel_queendom_events where id=p_event_id;
  if v_event.id is null or v_event.published_at is null or v_event.status='cancelled' then raise exception 'That event is not available.' using errcode='22023'; end if;
  v_access:=public.flowtel_queendom_event_access_state(p_event_id,v_member);
  if coalesce(p_registered,true) and not coalesce((v_access->>'entitled')::boolean,false) then
    if v_access->>'mode'='ticket' then raise exception 'A ticket is required before you can save your seat.' using errcode='42501'; end if;
    raise exception 'This event is not included with your current access.' using errcode='42501';
  end if;
  if not coalesce(p_registered,true) and v_event.event_format='series' and exists(
    select 1 from public.flowtel_queendom_event_series_enrollments se
    where se.event_id=p_event_id and se.member_id=v_member and se.status in ('pending','active')
  ) then
    raise exception 'This group series is already enrolled through Acuity. Message the Front Desk if you need to leave the vortex so the Acuity seat and reminders can be handled safely.' using errcode='22023';
  end if;
  if coalesce(p_registered,true) then
    insert into public.flowtel_queendom_event_registrations(event_id,member_id,registered_at,cancelled_at,updated_at)
    values(p_event_id,v_member,now(),null,now()) on conflict(event_id,member_id) do update set cancelled_at=null,registered_at=now(),updated_at=now();
  else
    update public.flowtel_queendom_event_registrations set cancelled_at=now(),updated_at=now() where event_id=p_event_id and member_id=v_member and cancelled_at is null;
  end if;
  return jsonb_build_object('event_id',p_event_id,'registered',coalesce(p_registered,true),'event_format',v_event.event_format,'series_count',v_event.series_count,'access',v_access);
end;
$$;
revoke all on function public.flowtel_set_queendom_event_registration(uuid,boolean) from public;
grant execute on function public.flowtel_set_queendom_event_registration(uuid,boolean) to authenticated;

-- Protected Event Room now returns the registered member's own per-session
-- Acuity doorways. A manually-entered parent Zoom URL remains a deliberate
-- fallback; it is never included in public/member discovery feeds.
create or replace function public.flowtel_get_queendom_event_join_details(p_event_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  v_member uuid:=auth.uid(); v_event public.flowtel_queendom_events%rowtype; v_access jsonb; v_registered boolean; v_series_status text;
begin
  if v_member is null then raise exception 'Enter the Flowtel before opening this event room.' using errcode='42501'; end if;
  select * into v_event from public.flowtel_queendom_events where id=p_event_id;
  if v_event.id is null or v_event.published_at is null or v_event.status<>'published' then raise exception 'That event is not currently open.' using errcode='22023'; end if;
  v_access:=public.flowtel_queendom_event_access_state(p_event_id,v_member);
  if not coalesce((v_access->>'entitled')::boolean,false) then raise exception 'This event room opens after your event access is confirmed.' using errcode='42501'; end if;
  select exists(select 1 from public.flowtel_queendom_event_registrations r where r.event_id=p_event_id and r.member_id=v_member and r.cancelled_at is null) into v_registered;
  if not v_registered then raise exception 'Save your seat before opening the event room.' using errcode='42501'; end if;
  select se.status into v_series_status from public.flowtel_queendom_event_series_enrollments se where se.event_id=p_event_id and se.member_id=v_member;
  return jsonb_build_object(
    'event_id',v_event.id,'title',v_event.title,'event_type',v_event.event_type,'description',v_event.description,
    'event_date',v_event.event_date,'starts_at',v_event.starts_at,'ends_at',v_event.ends_at,'event_timezone',v_event.event_timezone,
    'live_room_starts_at',coalesce(v_event.live_room_starts_at,v_event.starts_at),
    'host_name',v_event.host_name,'host_member_id',v_event.host_member_id,'co_host_name',v_event.co_host_name,'co_host_member_id',v_event.co_host_member_id,
    'will_be_recorded',v_event.will_be_recorded,'how_to_prepare',v_event.how_to_prepare,'attendee_guide_url',v_event.attendee_guide_url,
    'location_type',v_event.location_type,'private_location',v_event.private_location,
    'zoom_url',case when v_event.event_format='single' then v_event.zoom_url else null end,'zoom_passcode',case when v_event.event_format='single' then v_event.zoom_passcode else null end,'access',v_access,
    'event_format',v_event.event_format,'series_count',v_event.series_count,'series_interval_days',v_event.series_interval_days,
    'series_enrollment_status',v_series_status,
    'occurrences',case when v_event.event_format='series' then coalesce((
      select jsonb_agg(jsonb_build_object(
        'occurrence_id',o.id,'occurrence_number',o.occurrence_number,'event_date',o.event_date,
        'start_time',to_char(o.start_time,'HH24:MI'),'end_time',case when o.end_time is null then null else to_char(o.end_time,'HH24:MI') end,
        'starts_at',o.starts_at,'ends_at',o.ends_at,'live_room_starts_at',o.live_room_starts_at,'status',o.status,
        'enrollment_status',oe.status,'meeting_url',coalesce(nullif(trim(coalesce(oe.meeting_url,'')),''),nullif(trim(coalesce(v_event.zoom_url,'')),'')),
        'zoom_passcode',case when nullif(trim(coalesce(oe.meeting_url,'')),'') is null then v_event.zoom_passcode else null end
      ) order by o.occurrence_number)
      from public.flowtel_queendom_event_occurrences o
      left join public.flowtel_queendom_event_occurrence_enrollments oe
        on oe.occurrence_id=o.id and oe.member_id=v_member
      where o.event_id=v_event.id
    ),'[]'::jsonb) else '[]'::jsonb end
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
    'registration_count',(select count(*)::integer from public.flowtel_queendom_event_registrations r where r.event_id=e.id and r.cancelled_at is null),
    'series_enrollment_count',(select count(*)::integer from public.flowtel_queendom_event_series_enrollments se where se.event_id=e.id and se.status='active'),
    'occurrences',case when e.event_format='series' then coalesce((select jsonb_agg(jsonb_build_object(
      'occurrence_id',o.id,'occurrence_number',o.occurrence_number,'event_date',o.event_date,
      'start_time',to_char(o.start_time,'HH24:MI'),'end_time',case when o.end_time is null then null else to_char(o.end_time,'HH24:MI') end,
      'starts_at',o.starts_at,'ends_at',o.ends_at,'live_room_starts_at',o.live_room_starts_at,'status',o.status
    ) order by o.occurrence_number) from public.flowtel_queendom_event_occurrences o where o.event_id=e.id),'[]'::jsonb) else '[]'::jsonb end
  ) order by e.event_date desc,e.start_time desc),'[]'::jsonb) into v_result from public.flowtel_queendom_events e;
  return v_result;
end;
$$;
revoke all on function public.flowtel_admin_list_queendom_events() from public;
grant execute on function public.flowtel_admin_list_queendom_events() to authenticated;

-- For an enrolled series, Acuity must be cancelled first so its reminders do not
-- outlive the Flowtel event. Acuity webhooks move the enrollment state to cancelled.
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
  if v_event.event_format='series' and exists(
    select 1 from public.flowtel_queendom_event_series_enrollments se
    where se.event_id=p_event_id and se.status in ('pending','active')
  ) then
    raise exception 'Cancel the enrolled class series in Acuity first. After its session webhooks mark the Flowtel enrollments cancelled, return here to cancel the Flowtel event so members do not keep receiving Acuity reminders.' using errcode='22023';
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
