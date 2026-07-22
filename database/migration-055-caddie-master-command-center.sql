-- Flowtel v0.10.70 / Caddie Magic v0.5.2
-- Caddie Master Command Center + Caddie Concierge Team
--
-- Run exactly once after migrations 053 and 054.
-- This migration is additive. It preserves Players, Caddies, Compasses,
-- Assignments, messages, Upcoming Golf, consultations, courses, and history.
-- Migration 037 remains retired and must never be rerun.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Player VIP message read state and completed-assignment acknowledgment.
-- Existing message and assignment rows remain append-only.
-- ---------------------------------------------------------------------------

alter table public.caddie_magic_compass_dispatches
  add column if not exists master_read_at timestamptz,
  add column if not exists player_read_at timestamptz;

-- Existing historical messages were already visible before this alert system.
-- Begin the unread queue with messages sent after migration 055.
update public.caddie_magic_compass_dispatches
set master_read_at = coalesce(master_read_at, created_at)
where sender_role = 'player' and master_read_at is null;

create index if not exists caddie_magic_dispatches_master_unread_idx
  on public.caddie_magic_compass_dispatches(player_profile_id, created_at desc)
  where sender_role = 'player' and master_read_at is null;

alter table public.caddie_magic_compass_assignments
  add column if not exists master_acknowledged_at timestamptz,
  add column if not exists master_acknowledged_by uuid references auth.users(id) on delete set null;

-- Do not turn old completed work into a surprise historical alert backlog.
update public.caddie_magic_compass_assignments
set master_acknowledged_at = coalesce(master_acknowledged_at, completed_at, updated_at, created_at)
where status = 'completed' and master_acknowledged_at is null;

create index if not exists caddie_magic_assignments_master_attention_idx
  on public.caddie_magic_compass_assignments(completed_at desc)
  where status = 'completed' and master_acknowledged_at is null;

create or replace function public.caddie_magic_reset_assignment_acknowledgment()
returns trigger
language plpgsql
set search_path = public, auth
as $$
begin
  if new.status = 'completed'
     and (old.status is distinct from new.status or old.player_response is distinct from new.player_response)
     and not public.flowtel_current_user_is_phase_one_owner() then
    new.master_acknowledged_at := null;
    new.master_acknowledged_by := null;
  end if;
  return new;
end;
$$;

drop trigger if exists caddie_magic_assignment_attention_reset on public.caddie_magic_compass_assignments;
create trigger caddie_magic_assignment_attention_reset
  before update of status, player_response on public.caddie_magic_compass_assignments
  for each row execute function public.caddie_magic_reset_assignment_acknowledgment();

create or replace function public.caddie_magic_mark_player_messages_read(p_player_profile_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_count integer := 0;
begin
  if not public.flowtel_current_user_is_phase_one_owner() then
    raise exception 'Only The Caddie Master may tend Player messages.' using errcode = '42501';
  end if;
  update public.caddie_magic_compass_dispatches
  set master_read_at = coalesce(master_read_at, now())
  where player_profile_id = p_player_profile_id
    and sender_role = 'player'
    and master_read_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.caddie_magic_mark_assignment_noted(p_assignment_id uuid)
returns public.caddie_magic_compass_assignments
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_assignment public.caddie_magic_compass_assignments%rowtype;
begin
  if not public.flowtel_current_user_is_phase_one_owner() then
    raise exception 'Only The Caddie Master may note completed Assignments.' using errcode = '42501';
  end if;
  update public.caddie_magic_compass_assignments
  set master_acknowledged_at = now(), master_acknowledged_by = auth.uid()
  where id = p_assignment_id and status = 'completed'
  returning * into v_assignment;
  if v_assignment.id is null then
    raise exception 'That completed Assignment could not be found.' using errcode = '22023';
  end if;
  return v_assignment;
end;
$$;

-- ---------------------------------------------------------------------------
-- Private Caddie Team ↔ Caddie Master message chamber.
-- This is separate from VIP Player messaging and never exposes Player threads.
-- ---------------------------------------------------------------------------

create table if not exists public.caddie_magic_team_messages (
  id uuid primary key default gen_random_uuid(),
  caddie_profile_id uuid not null references public.caddie_magic_caddie_profiles(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('caddie','caddie_master')),
  message_body text not null,
  master_read_at timestamptz,
  caddie_read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists caddie_magic_team_messages_thread_idx
  on public.caddie_magic_team_messages(caddie_profile_id, created_at asc);
create index if not exists caddie_magic_team_messages_master_unread_idx
  on public.caddie_magic_team_messages(caddie_profile_id, created_at desc)
  where sender_role = 'caddie' and master_read_at is null;

alter table public.caddie_magic_team_messages enable row level security;

drop policy if exists "Caddie Team reads its private message chamber" on public.caddie_magic_team_messages;
create policy "Caddie Team reads its private message chamber"
  on public.caddie_magic_team_messages for select
  using (
    public.flowtel_current_user_is_phase_one_owner()
    or exists (
      select 1 from public.caddie_magic_caddie_profiles c
      where c.id = caddie_profile_id and c.user_id = auth.uid()
    )
  );

revoke insert, update, delete on public.caddie_magic_team_messages from authenticated;
grant select on public.caddie_magic_team_messages to authenticated;

create or replace function public.caddie_magic_send_my_team_message(p_message text)
returns public.caddie_magic_team_messages
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_caddie public.caddie_magic_caddie_profiles%rowtype;
  v_message text := nullif(btrim(coalesce(p_message,'')), '');
  v_row public.caddie_magic_team_messages%rowtype;
begin
  perform public.caddie_magic_require_product_access();
  if auth.uid() is null then
    raise exception 'Sign in to message The Caddie Master.' using errcode = '28000';
  end if;
  if v_message is null then
    raise exception 'Write a message before sending it.' using errcode = '22023';
  end if;
  select * into v_caddie
  from public.caddie_magic_caddie_profiles
  where user_id = auth.uid() and status = 'active';
  if v_caddie.id is null then
    raise exception 'Your Caddie Team message chamber is not available.' using errcode = '42501';
  end if;
  insert into public.caddie_magic_team_messages(
    caddie_profile_id, sender_user_id, sender_role, message_body, caddie_read_at
  ) values (
    v_caddie.id, auth.uid(), 'caddie', v_message, now()
  ) returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.caddie_magic_send_caddie_team_message(
  p_caddie_profile_id uuid,
  p_message text
)
returns public.caddie_magic_team_messages
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_message text := nullif(btrim(coalesce(p_message,'')), '');
  v_row public.caddie_magic_team_messages%rowtype;
begin
  if not public.flowtel_current_user_is_phase_one_owner() then
    raise exception 'Only The Caddie Master may send an owner message to the Caddie Team.' using errcode = '42501';
  end if;
  if v_message is null then
    raise exception 'Write a message before sending it.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.caddie_magic_caddie_profiles where id = p_caddie_profile_id) then
    raise exception 'That Caddie Profile could not be found.' using errcode = '22023';
  end if;
  insert into public.caddie_magic_team_messages(
    caddie_profile_id, sender_user_id, sender_role, message_body, master_read_at
  ) values (
    p_caddie_profile_id, auth.uid(), 'caddie_master', v_message, now()
  ) returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.caddie_magic_get_my_team_messages()
returns setof public.caddie_magic_team_messages
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_caddie_id uuid;
begin
  perform public.caddie_magic_require_product_access();
  select id into v_caddie_id
  from public.caddie_magic_caddie_profiles
  where user_id = auth.uid() and status = 'active';
  if v_caddie_id is null then
    raise exception 'Your Caddie Team message chamber is not available.' using errcode = '42501';
  end if;
  update public.caddie_magic_team_messages
  set caddie_read_at = coalesce(caddie_read_at, now())
  where caddie_profile_id = v_caddie_id
    and sender_role = 'caddie_master'
    and caddie_read_at is null;
  return query
  select * from public.caddie_magic_team_messages
  where caddie_profile_id = v_caddie_id
  order by created_at asc;
end;
$$;

create or replace function public.caddie_magic_get_caddie_team_messages(p_caddie_profile_id uuid)
returns setof public.caddie_magic_team_messages
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.flowtel_current_user_is_phase_one_owner() then
    raise exception 'Only The Caddie Master may open Caddie Team messages.' using errcode = '42501';
  end if;
  update public.caddie_magic_team_messages
  set master_read_at = coalesce(master_read_at, now())
  where caddie_profile_id = p_caddie_profile_id
    and sender_role = 'caddie'
    and master_read_at is null;
  return query
  select * from public.caddie_magic_team_messages
  where caddie_profile_id = p_caddie_profile_id
  order by created_at asc;
end;
$$;

-- ---------------------------------------------------------------------------
-- Owner-granted Compass Consecration and Caddie Concierge Team directory.
-- ---------------------------------------------------------------------------

alter table public.caddie_magic_caddie_profiles
  add column if not exists compass_consecrated_at timestamptz,
  add column if not exists compass_consecrated_by uuid references auth.users(id) on delete set null;

create or replace function public.caddie_magic_set_compass_consecrated(
  p_caddie_profile_id uuid,
  p_consecrated boolean
)
returns public.caddie_magic_caddie_profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_caddie public.caddie_magic_caddie_profiles%rowtype;
  v_complete boolean := false;
begin
  if not public.flowtel_current_user_is_phase_one_owner() then
    raise exception 'Only The Caddie Master may consecrate a Caddie Compass.' using errcode = '42501';
  end if;
  select exists(
    select 1
    from public.caddie_magic_caddie_profiles cp
    join public.caddie_magic_compasses compass
      on compass.player_profile_id = cp.player_profile_id and compass.is_active = true
    where cp.id = p_caddie_profile_id
      and nullif(btrim(compass.north_club),'') is not null
      and nullif(btrim(compass.east_club),'') is not null
      and nullif(btrim(compass.south_club),'') is not null
      and nullif(btrim(compass.west_club),'') is not null
  ) into v_complete;
  if coalesce(p_consecrated,false) and not v_complete then
    raise exception 'All four Cardinal Clubs must be complete before the Compass can be consecrated.' using errcode = '22023';
  end if;
  update public.caddie_magic_caddie_profiles
  set compass_consecrated_at = case when coalesce(p_consecrated,false) then now() else null end,
      compass_consecrated_by = case when coalesce(p_consecrated,false) then auth.uid() else null end
  where id = p_caddie_profile_id
  returning * into v_caddie;
  if v_caddie.id is null then
    raise exception 'That Caddie Profile could not be found.' using errcode = '22023';
  end if;
  return v_caddie;
end;
$$;

create or replace function public.caddie_magic_list_caddie_concierge_team()
returns table (
  caddie_profile_id uuid,
  player_profile_id uuid,
  user_id uuid,
  display_name text,
  professional_title text,
  email text,
  profile_photo_url text,
  status text,
  city text,
  timezone text,
  courses_served text,
  accepting_requests boolean,
  availability_status text,
  active_player_count bigint,
  upcoming_call_count bigint,
  compass_status text,
  compass_consecrated_at timestamptz,
  unread_team_message_count bigint,
  latest_team_message_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.flowtel_current_user_is_phase_one_owner() then
    raise exception 'Only The Caddie Master may open the Caddie Concierge Team.' using errcode = '42501';
  end if;
  return query
  select
    cp.id,
    cp.player_profile_id,
    cp.user_id,
    coalesce(nullif(btrim(cp.display_name),''), nullif(btrim(concat_ws(' ',pp.first_name,pp.last_name)),''), pp.email),
    cp.professional_title,
    pp.email,
    cp.profile_photo_url,
    cp.status,
    cp.city,
    cp.timezone,
    (
      select string_agg(course.course_name, ', ' order by course.course_name)
      from public.caddie_magic_caddie_courses cc
      join public.caddie_magic_courses course on course.id = cc.course_id
      where cc.caddie_profile_id = cp.id and course.status = 'approved'
    ),
    cp.accepting_requests,
    case
      when exists (
        select 1 from public.flowtel_provider_weekly_availability w
        join public.flowtel_provider_scheduling_profiles sp on sp.id = w.provider_id
        where sp.product_key = 'caddie_magic' and sp.provider_kind = 'caddie'
          and sp.source_profile_id = cp.id and w.available_for_calls and w.available_for_in_person
      ) or (
        exists (
          select 1 from public.flowtel_provider_weekly_availability w
          join public.flowtel_provider_scheduling_profiles sp on sp.id = w.provider_id
          where sp.source_profile_id = cp.id and sp.product_key = 'caddie_magic' and w.available_for_calls
        ) and exists (
          select 1 from public.flowtel_provider_weekly_availability w
          join public.flowtel_provider_scheduling_profiles sp on sp.id = w.provider_id
          where sp.source_profile_id = cp.id and sp.product_key = 'caddie_magic' and w.available_for_in_person
        )
      ) then 'Calls + Caddying'
      when exists (
        select 1 from public.flowtel_provider_weekly_availability w
        join public.flowtel_provider_scheduling_profiles sp on sp.id = w.provider_id
        where sp.source_profile_id = cp.id and sp.product_key = 'caddie_magic' and w.available_for_calls
      ) then 'Calls'
      when exists (
        select 1 from public.flowtel_provider_weekly_availability w
        join public.flowtel_provider_scheduling_profiles sp on sp.id = w.provider_id
        where sp.source_profile_id = cp.id and sp.product_key = 'caddie_magic' and w.available_for_in_person
      ) then 'Caddying'
      else 'Not Set'
    end,
    (select count(*) from public.caddie_magic_caddie_requests r where r.caddie_profile_id = cp.id and r.status = 'accepted'),
    (select count(*) from public.caddie_magic_consultations c where c.caddie_profile_id = cp.id and c.status = 'scheduled' and c.starts_at >= now()),
    case
      when cp.compass_consecrated_at is not null then 'Consecrated'
      when compass.id is not null
        and nullif(btrim(compass.north_club),'') is not null
        and nullif(btrim(compass.east_club),'') is not null
        and nullif(btrim(compass.south_club),'') is not null
        and nullif(btrim(compass.west_club),'') is not null then 'Complete'
      else 'Incomplete'
    end,
    cp.compass_consecrated_at,
    (select count(*) from public.caddie_magic_team_messages m where m.caddie_profile_id = cp.id and m.sender_role = 'caddie' and m.master_read_at is null),
    (select max(m.created_at) from public.caddie_magic_team_messages m where m.caddie_profile_id = cp.id),
    cp.updated_at
  from public.caddie_magic_caddie_profiles cp
  join public.caddie_magic_player_profiles pp on pp.id = cp.player_profile_id
  left join lateral (
    select c.* from public.caddie_magic_compasses c
    where c.player_profile_id = cp.player_profile_id and c.is_active = true
    order by c.version desc
    limit 1
  ) compass on true
  order by
    case cp.status when 'active' then 0 when 'submitted' then 1 when 'approved' then 2 when 'draft' then 3 when 'invited' then 4 when 'paused' then 5 else 6 end,
    coalesce(cp.display_name, pp.first_name, pp.email);
end;
$$;

create or replace function public.caddie_magic_get_caddie_concierge_profile(p_caddie_profile_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare v_result jsonb;
begin
  if not public.flowtel_current_user_is_phase_one_owner() then
    raise exception 'Only The Caddie Master may open a Caddie Concierge Team profile.' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'profile', jsonb_build_object(
      'caddie_profile_id',cp.id,'player_profile_id',cp.player_profile_id,'user_id',cp.user_id,
      'display_name',coalesce(nullif(btrim(cp.display_name),''),nullif(btrim(concat_ws(' ',pp.first_name,pp.last_name)),''),pp.email),
      'professional_title',cp.professional_title,'email',pp.email,'profile_photo_url',cp.profile_photo_url,
      'status',cp.status,'city',cp.city,'timezone',cp.timezone,'accepting_requests',cp.accepting_requests,
      'submitted_at',cp.submitted_at,'approved_at',cp.approved_at,'updated_at',cp.updated_at,
      'compass_consecrated_at',cp.compass_consecrated_at
    ),
    'courses',coalesce((
      select jsonb_agg(jsonb_build_object('course_id',course.id,'course_name',course.course_name,'city',course.city,'region',course.region,'country',course.country) order by course.course_name)
      from public.caddie_magic_caddie_courses cc
      join public.caddie_magic_courses course on course.id = cc.course_id
      where cc.caddie_profile_id = cp.id and course.status = 'approved'
    ),'[]'::jsonb),
    'pending_courses',coalesce((
      select jsonb_agg(jsonb_build_object('request_id',r.id,'requested_name',r.requested_name,'status',r.status,'created_at',r.created_at) order by r.created_at desc)
      from public.caddie_magic_course_requests r where r.caddie_profile_id = cp.id and r.status = 'pending'
    ),'[]'::jsonb),
    'compass',coalesce((
      select to_jsonb(compass) from public.caddie_magic_compasses compass
      where compass.player_profile_id = cp.player_profile_id and compass.is_active = true
      order by compass.version desc limit 1
    ),'null'::jsonb),
    'assignments',coalesce((
      select jsonb_agg(to_jsonb(a) order by a.created_at desc)
      from public.caddie_magic_compass_assignments a where a.player_profile_id = cp.player_profile_id
    ),'[]'::jsonb),
    'weekly_availability',coalesce((
      select jsonb_agg(to_jsonb(w) order by w.weekday,w.daypart)
      from public.flowtel_provider_weekly_availability w
      join public.flowtel_provider_scheduling_profiles sp on sp.id = w.provider_id
      where sp.product_key = 'caddie_magic' and sp.provider_kind = 'caddie' and sp.source_profile_id = cp.id
    ),'[]'::jsonb),
    'availability_exceptions',coalesce((
      select jsonb_agg(to_jsonb(e) order by e.starts_on desc)
      from public.flowtel_provider_availability_exceptions e
      join public.flowtel_provider_scheduling_profiles sp on sp.id = e.provider_id
      where sp.product_key = 'caddie_magic' and sp.provider_kind = 'caddie' and sp.source_profile_id = cp.id
    ),'[]'::jsonb),
    'player_requests',coalesce((
      select jsonb_agg(jsonb_build_object(
        'request_id',r.id,'status',r.status,'player_profile_id',r.player_profile_id,
        'player_name',coalesce(nullif(btrim(concat_ws(' ',player.first_name,player.last_name)),''),player.email),
        'player_email',player.email,'anticipated_trip_date',r.anticipated_trip_date,
        'consultation_goal',r.consultation_goal,'requested_at',r.requested_at,'responded_at',r.responded_at
      ) order by r.requested_at desc)
      from public.caddie_magic_caddie_requests r
      join public.caddie_magic_player_profiles player on player.id = r.player_profile_id
      where r.caddie_profile_id = cp.id
    ),'[]'::jsonb),
    'consultations',coalesce((
      select jsonb_agg(jsonb_build_object(
        'consultation_id',c.id,'status',c.status,'starts_at',c.starts_at,'ends_at',c.ends_at,
        'player_profile_id',c.player_profile_id,
        'player_name',coalesce(nullif(btrim(concat_ws(' ',player.first_name,player.last_name)),''),player.email)
      ) order by c.starts_at desc)
      from public.caddie_magic_consultations c
      join public.caddie_magic_player_profiles player on player.id = c.player_profile_id
      where c.caddie_profile_id = cp.id
    ),'[]'::jsonb)
  ) into v_result
  from public.caddie_magic_caddie_profiles cp
  join public.caddie_magic_player_profiles pp on pp.id = cp.player_profile_id
  where cp.id = p_caddie_profile_id;
  if v_result is null then
    raise exception 'That Caddie Concierge Team profile could not be found.' using errcode = '22023';
  end if;
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Caddie Master command-center alert feed.
-- Course requests and submitted profiles remain actionable through the Network.
-- ---------------------------------------------------------------------------

create or replace function public.caddie_magic_get_master_command_center()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_player_messages jsonb;
  v_team_messages jsonb;
  v_assignments jsonb;
begin
  if not public.flowtel_current_user_is_phase_one_owner() then
    raise exception 'Only The Caddie Master may open the command center.' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.latest_at desc),'[]'::jsonb)
  into v_player_messages
  from (
    select
      pp.id as player_profile_id,
      coalesce(nullif(btrim(concat_ws(' ',pp.first_name,pp.last_name)),''),pp.email) as sender_name,
      pp.email,
      count(*)::integer as unread_count,
      max(d.created_at) as latest_at,
      (array_agg(d.message_body order by d.created_at desc))[1] as latest_message
    from public.caddie_magic_compass_dispatches d
    join public.caddie_magic_player_profiles pp on pp.id = d.player_profile_id
    where d.sender_role = 'player' and d.master_read_at is null
    group by pp.id,pp.first_name,pp.last_name,pp.email
  ) row_data;

  select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.latest_at desc),'[]'::jsonb)
  into v_team_messages
  from (
    select
      cp.id as caddie_profile_id,
      coalesce(nullif(btrim(cp.display_name),''),nullif(btrim(concat_ws(' ',pp.first_name,pp.last_name)),''),pp.email) as sender_name,
      pp.email,
      count(*)::integer as unread_count,
      max(m.created_at) as latest_at,
      (array_agg(m.message_body order by m.created_at desc))[1] as latest_message
    from public.caddie_magic_team_messages m
    join public.caddie_magic_caddie_profiles cp on cp.id = m.caddie_profile_id
    join public.caddie_magic_player_profiles pp on pp.id = cp.player_profile_id
    where m.sender_role = 'caddie' and m.master_read_at is null
    group by cp.id,cp.display_name,pp.first_name,pp.last_name,pp.email
  ) row_data;

  select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.completed_at desc),'[]'::jsonb)
  into v_assignments
  from (
    select
      a.id as assignment_id,
      a.player_profile_id,
      coalesce(nullif(btrim(concat_ws(' ',pp.first_name,pp.last_name)),''),pp.email) as player_name,
      pp.email,
      a.title,
      a.player_response,
      a.completed_at
    from public.caddie_magic_compass_assignments a
    join public.caddie_magic_player_profiles pp on pp.id = a.player_profile_id
    where a.status = 'completed' and a.master_acknowledged_at is null
  ) row_data;

  return jsonb_build_object(
    'player_messages',v_player_messages,
    'caddie_team_messages',v_team_messages,
    'assignments',v_assignments,
    'player_message_count',coalesce((select sum((item->>'unread_count')::integer) from jsonb_array_elements(v_player_messages) item),0),
    'caddie_team_message_count',coalesce((select sum((item->>'unread_count')::integer) from jsonb_array_elements(v_team_messages) item),0),
    'assignment_count',jsonb_array_length(v_assignments),
    'course_request_count',(select count(*) from public.caddie_magic_course_requests where status = 'pending'),
    'submitted_profile_count',(select count(*) from public.caddie_magic_caddie_profiles where status = 'submitted')
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Upcoming Golf acknowledgment: "The Caddie Force is with you."
-- ---------------------------------------------------------------------------

alter table public.caddie_magic_upcoming_golf_events
  add column if not exists caddie_master_acknowledged_at timestamptz,
  add column if not exists caddie_master_acknowledged_by uuid references auth.users(id) on delete set null;

create index if not exists caddie_magic_upcoming_golf_unacknowledged_idx
  on public.caddie_magic_upcoming_golf_events(date_start, created_at desc)
  where caddie_master_acknowledged_at is null;

create or replace function public.caddie_magic_reset_upcoming_golf_acknowledgment()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.event_type is distinct from new.event_type
     or old.title is distinct from new.title
     or old.date_start is distinct from new.date_start
     or old.date_end is distinct from new.date_end
     or old.location is distinct from new.location
     or old.course is distinct from new.course
     or old.notes is distinct from new.notes
     or old.moon_forecast is distinct from new.moon_forecast then
    new.caddie_master_acknowledged_at := null;
    new.caddie_master_acknowledged_by := null;
  end if;
  return new;
end;
$$;

drop trigger if exists caddie_magic_upcoming_golf_ack_reset on public.caddie_magic_upcoming_golf_events;
create trigger caddie_magic_upcoming_golf_ack_reset
  before update of event_type,title,date_start,date_end,location,course,notes,moon_forecast
  on public.caddie_magic_upcoming_golf_events
  for each row execute function public.caddie_magic_reset_upcoming_golf_acknowledgment();

create or replace function public.caddie_magic_acknowledge_upcoming_golf(p_event_id uuid)
returns public.caddie_magic_upcoming_golf_events
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_event public.caddie_magic_upcoming_golf_events%rowtype;
begin
  if not public.flowtel_current_user_is_phase_one_owner() then
    raise exception 'Only The Caddie Master may send The Caddie Force.' using errcode = '42501';
  end if;
  update public.caddie_magic_upcoming_golf_events
  set caddie_master_acknowledged_at = now(), caddie_master_acknowledged_by = auth.uid()
  where id = p_event_id
  returning * into v_event;
  if v_event.id is null then
    raise exception 'That Upcoming Golf event could not be found.' using errcode = '22023';
  end if;
  return v_event;
end;
$$;

-- Return acknowledgment fields to the owner calendar while preserving its name/signature.
drop function if exists public.caddie_magic_list_upcoming_golf_events(date,date);
create function public.caddie_magic_list_upcoming_golf_events(
  p_start date default current_date,
  p_end date default (current_date + 120)
)
returns table (
  event_id uuid,
  player_profile_id uuid,
  player_name text,
  player_email text,
  event_type text,
  event_title text,
  date_start date,
  date_end date,
  location text,
  course text,
  notes text,
  moon_forecast jsonb,
  caddie_master_acknowledged_at timestamptz,
  caddie_master_acknowledged_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.flowtel_current_user_is_phase_one_owner() then
    raise exception 'Owner or admin access is required.' using errcode = '42501';
  end if;
  return query
  select
    e.id,e.player_profile_id,
    coalesce(nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),''),p.email),
    p.email,e.event_type,e.title,e.date_start,e.date_end,e.location,e.course,e.notes,e.moon_forecast,
    e.caddie_master_acknowledged_at,e.caddie_master_acknowledged_by,e.created_at,e.updated_at
  from public.caddie_magic_upcoming_golf_events e
  join public.caddie_magic_player_profiles p on p.id = e.player_profile_id
  where e.date_end >= coalesce(p_start,current_date)
    and e.date_start <= coalesce(p_end,current_date + 120)
  order by e.date_start asc,p.first_name asc nulls last,p.email asc;
end;
$$;

-- ---------------------------------------------------------------------------
-- Function permissions.
-- ---------------------------------------------------------------------------

revoke all on function public.caddie_magic_mark_player_messages_read(uuid) from public;
revoke all on function public.caddie_magic_mark_assignment_noted(uuid) from public;
revoke all on function public.caddie_magic_send_my_team_message(text) from public;
revoke all on function public.caddie_magic_send_caddie_team_message(uuid,text) from public;
revoke all on function public.caddie_magic_get_my_team_messages() from public;
revoke all on function public.caddie_magic_get_caddie_team_messages(uuid) from public;
revoke all on function public.caddie_magic_set_compass_consecrated(uuid,boolean) from public;
revoke all on function public.caddie_magic_list_caddie_concierge_team() from public;
revoke all on function public.caddie_magic_get_caddie_concierge_profile(uuid) from public;
revoke all on function public.caddie_magic_get_master_command_center() from public;
revoke all on function public.caddie_magic_acknowledge_upcoming_golf(uuid) from public;
revoke all on function public.caddie_magic_list_upcoming_golf_events(date,date) from public;

grant execute on function public.caddie_magic_mark_player_messages_read(uuid) to authenticated;
grant execute on function public.caddie_magic_mark_assignment_noted(uuid) to authenticated;
grant execute on function public.caddie_magic_send_my_team_message(text) to authenticated;
grant execute on function public.caddie_magic_send_caddie_team_message(uuid,text) to authenticated;
grant execute on function public.caddie_magic_get_my_team_messages() to authenticated;
grant execute on function public.caddie_magic_get_caddie_team_messages(uuid) to authenticated;
grant execute on function public.caddie_magic_set_compass_consecrated(uuid,boolean) to authenticated;
grant execute on function public.caddie_magic_list_caddie_concierge_team() to authenticated;
grant execute on function public.caddie_magic_get_caddie_concierge_profile(uuid) to authenticated;
grant execute on function public.caddie_magic_get_master_command_center() to authenticated;
grant execute on function public.caddie_magic_acknowledge_upcoming_golf(uuid) to authenticated;
grant execute on function public.caddie_magic_list_upcoming_golf_events(date,date) to authenticated;

notify pgrst, 'reload schema';
