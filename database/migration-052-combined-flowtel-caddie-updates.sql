-- Flowtel v0.10.67 — Combined Flowtel + Caddie Magic Updates
--
-- Adds the Flow FM Availability Map, Lounge workshop seasonal planning bridge,
-- mentor client snapshot, owner-to-Priestess file delivery, and fixes the Flow
-- Map timestamp mismatch. User-facing UI polish and Caddie Magic calculations
-- are shipped in application code. Migration 037 remains retired.

create or replace function public.flowtel_get_flow_map_entries(
  p_subject_id uuid default null,
  p_scope text default 'self'
)
returns table (
  entry_id text,
  entry_type text,
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
    raise exception 'You must be signed in to view Flow Map notes.' using errcode = '28000';
  end if;

  select role into v_role from public.profiles where id = v_user_id;

  if p_subject_id is not null and not public.flowtel_can_view_cycle_subject(p_subject_id) then
    raise exception 'This Flow Map is only available with active consent.' using errcode = '42501';
  end if;
  if v_scope in ('all','clients') and coalesce(v_role,'') not in ('practitioner','admin','owner') then
    raise exception 'Only mentors and admins can view client Flow Maps.' using errcode = '42501';
  end if;

  return query
  with permitted_clients as (
    select p.id,
      public.flowtel_resolve_display_name(p.display_name,p.first_name,p.last_name,p.email,'Flowtel Guest') as resolved_client_name
    from public.profiles p
    where case
      when p_subject_id is not null then p.id = p_subject_id
      when v_scope = 'self' then p.id = v_user_id
      when v_scope in ('all','clients') and coalesce(v_role,'') in ('admin','owner') then true
      when v_scope in ('all','clients') and coalesce(v_role,'') = 'practitioner' then exists (
        select 1 from public.flowtel_practitioner_relationships relationship
        where relationship.client_id = p.id
          and relationship.practitioner_id = v_user_id
          and relationship.status = 'connected'
          and coalesce(relationship.consent_granted,false) = true
      )
      else false
    end
  ),
  permitted_stays as (
    select s.*,pc.resolved_client_name
    from public.flowtel_stays s
    join permitted_clients pc on pc.id = s.client_id
  ),
  reflection_entries as (
    select r.id::text,'reflection'::text,s.id,s.client_id,s.resolved_client_name,
      s.checkin_date::date,s.checked_in_at,s.checked_out_at,
      coalesce(s.cycle_day_actual,s.cycle_day_calculated,s.cycle_day_claimed),
      coalesce(s.cycle_day_recorded,s.cycle_day_claimed),
      coalesce(s.cycle_day_difference,coalesce(s.cycle_day_recorded,s.cycle_day_claimed,0)-coalesce(s.cycle_day_actual,s.cycle_day_calculated,s.cycle_day_claimed,0)),
      s.cycle_day_match_status,s.cycle_accuracy_message,s.cycle_start_date::date,
      s.previous_cycle_length_days,s.inner_season,s.feels_like_inner_season,
      s.moon_phase,s.moon_day,s.moon_inner_season,s.moon_theme,
      public.flowtel_moon_cycle_start_for_date(s.checkin_date::date),
      r.reflection as reflection_text,r.created_at as reflection_created_at,null::text as checkout_notes
    from permitted_stays s
    join public.flowtel_reflections r on r.stay_id = s.id
    where nullif(trim(r.reflection),'') is not null
  ),
  fallback_reflection_entries as (
    select ('stay-reflection-'||s.id::text),'reflection'::text,s.id,s.client_id,s.resolved_client_name,
      s.checkin_date::date,s.checked_in_at,s.checked_out_at,
      coalesce(s.cycle_day_actual,s.cycle_day_calculated,s.cycle_day_claimed),
      coalesce(s.cycle_day_recorded,s.cycle_day_claimed),
      coalesce(s.cycle_day_difference,coalesce(s.cycle_day_recorded,s.cycle_day_claimed,0)-coalesce(s.cycle_day_actual,s.cycle_day_calculated,s.cycle_day_claimed,0)),
      s.cycle_day_match_status,s.cycle_accuracy_message,s.cycle_start_date::date,
      s.previous_cycle_length_days,s.inner_season,s.feels_like_inner_season,
      s.moon_phase,s.moon_day,s.moon_inner_season,s.moon_theme,
      public.flowtel_moon_cycle_start_for_date(s.checkin_date::date),
      s.reflection as reflection_text,coalesce(s.updated_at,s.checked_in_at) as reflection_created_at,null::text as checkout_notes
    from permitted_stays s
    where nullif(trim(s.reflection),'') is not null
      and not exists (select 1 from public.flowtel_reflections r where r.stay_id=s.id)
  ),
  checkout_entries as (
    select ('checkout-'||s.id::text),'checkout'::text,s.id,s.client_id,s.resolved_client_name,
      s.checkin_date::date,s.checked_in_at,s.checked_out_at,
      coalesce(s.cycle_day_actual,s.cycle_day_calculated,s.cycle_day_claimed),
      coalesce(s.cycle_day_recorded,s.cycle_day_claimed),
      coalesce(s.cycle_day_difference,coalesce(s.cycle_day_recorded,s.cycle_day_claimed,0)-coalesce(s.cycle_day_actual,s.cycle_day_calculated,s.cycle_day_claimed,0)),
      s.cycle_day_match_status,s.cycle_accuracy_message,s.cycle_start_date::date,
      s.previous_cycle_length_days,s.inner_season,s.feels_like_inner_season,
      s.moon_phase,s.moon_day,s.moon_inner_season,s.moon_theme,
      public.flowtel_moon_cycle_start_for_date(s.checkin_date::date),
      null::text as reflection_text,coalesce(s.checked_out_at,s.updated_at,s.checked_in_at) as reflection_created_at,s.checkout_notes
    from permitted_stays s
    where nullif(trim(s.checkout_notes),'') is not null
  ),
  replay_note_entries as (
    select ('workshop-'||n.id::text),'workshop_replay'::text,n.stay_id,n.member_id,pc.resolved_client_name,
      n.flowtel_date,n.created_at,null::timestamptz,
      n.cycle_day_actual,n.cycle_day_recorded,
      case when n.cycle_day_actual is not null and n.cycle_day_recorded is not null then n.cycle_day_recorded-n.cycle_day_actual else null end,
      null::text,null::text,n.cycle_start_date,n.previous_cycle_length_days,
      coalesce(n.inner_season,n.moon_inner_season),n.feels_like_inner_season,
      n.moon_phase,n.moon_day,n.moon_inner_season,n.moon_theme,
      public.flowtel_moon_cycle_start_for_date(n.flowtel_date),
      format('[%s · %s] %s',n.workshop_title,initcap(replace(n.note_type,'_',' ')),n.note_body),
      n.created_at as reflection_created_at,null::text as checkout_notes
    from public.flowtel_workshop_replay_notes n
    join permitted_clients pc on pc.id = n.member_id
  ),
  all_note_entries as (
    select * from reflection_entries
    union all select * from fallback_reflection_entries
    union all select * from checkout_entries
    union all select * from replay_note_entries
  )
  select note_entries.*
  from all_note_entries note_entries
  order by note_entries.checkin_date desc,note_entries.reflection_created_at desc
  limit 3000;
end;
$$;

grant execute on function public.flowtel_get_flow_map_entries(uuid,text) to authenticated;
comment on function public.flowtel_get_flow_map_entries(uuid,text) is
  'Returns append-only reflections, checkout notes, and workshop replay notes for consent-aware Flow Map views.';

-- ---------------------------------------------------------------------------
-- Lounge workshop seasonal planning bridge into Hourly Flow Rate
-- ---------------------------------------------------------------------------

alter table public.flowtel_hourly_flow_rate_seasons
  add column if not exists lodging_idea text;

create or replace function public.flowtel_hfr_save_workshop_season(
  p_season_id uuid,
  p_city text default null,
  p_region text default null,
  p_country text default null,
  p_lodging_idea text default null,
  p_calling_reflection text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member uuid := public.flowtel_hfr_require_member();
  v_plan_id uuid;
begin
  update public.flowtel_hourly_flow_rate_seasons
  set city = nullif(trim(coalesce(p_city,'')),''),
      region = nullif(trim(coalesce(p_region,'')),''),
      country = nullif(trim(coalesce(p_country,'')),''),
      lodging_idea = nullif(trim(coalesce(p_lodging_idea,'')),''),
      calling_reflection = nullif(trim(coalesce(p_calling_reflection,'')),''),
      updated_at = now()
  where id = p_season_id and member_id = v_member
  returning plan_id into v_plan_id;

  if v_plan_id is null then
    raise exception 'This seasonal room is not available.' using errcode = '42501';
  end if;

  update public.flowtel_hourly_flow_rate_plans
  set last_open_section = 'lounge-workshop', updated_at = now()
  where id = v_plan_id and member_id = v_member;

  return public.flowtel_hfr_load_plan(false);
end;
$$;

revoke all on function public.flowtel_hfr_save_workshop_season(uuid,text,text,text,text,text) from public;
grant execute on function public.flowtel_hfr_save_workshop_season(uuid,text,text,text,text,text) to authenticated;

-- ---------------------------------------------------------------------------
-- Flow FM 4-week Inner Season Availability Map
-- ---------------------------------------------------------------------------

create table if not exists public.flowtel_flow_fm_availability_days (
  member_id uuid not null references public.profiles(id) on delete cascade,
  cycle_day integer not null,
  is_available boolean not null default false,
  availability_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (member_id, cycle_day),
  constraint flowtel_availability_cycle_day_check check (cycle_day between 1 and 28),
  constraint flowtel_availability_note_length_check check (char_length(coalesce(availability_note,'')) <= 500)
);

alter table public.flowtel_flow_fm_availability_days enable row level security;
revoke all on public.flowtel_flow_fm_availability_days from anon;
revoke insert,update,delete on public.flowtel_flow_fm_availability_days from authenticated;
grant select on public.flowtel_flow_fm_availability_days to authenticated;

drop policy if exists "Members read their own availability map" on public.flowtel_flow_fm_availability_days;
create policy "Members read their own availability map"
  on public.flowtel_flow_fm_availability_days for select to authenticated
  using (member_id = auth.uid() and public.flowtel_hfr_current_user_is_eligible());

create or replace function public.flowtel_availability_load()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_member uuid := public.flowtel_hfr_require_member();
  v_today date := (timezone('America/Los_Angeles',now()))::date;
  v_anchor date;
  v_source text := 'planning_reference';
  v_latest record;
begin
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

create or replace function public.flowtel_availability_save_day(
  p_cycle_day integer,
  p_is_available boolean,
  p_availability_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_member uuid := public.flowtel_hfr_require_member();
begin
  if p_cycle_day not between 1 and 28 then raise exception 'Choose a cycle day from 1 through 28.'; end if;
  insert into public.flowtel_flow_fm_availability_days(member_id,cycle_day,is_available,availability_note)
  values(v_member,p_cycle_day,coalesce(p_is_available,false),nullif(trim(coalesce(p_availability_note,'')),''))
  on conflict(member_id,cycle_day) do update
  set is_available=excluded.is_available,
      availability_note=excluded.availability_note,
      updated_at=now();
  return public.flowtel_availability_load();
end;
$$;

revoke all on function public.flowtel_availability_save_day(integer,boolean,text) from public;
grant execute on function public.flowtel_availability_save_day(integer,boolean,text) to authenticated;

-- ---------------------------------------------------------------------------
-- Mentor Client Snapshot / guest chart
-- ---------------------------------------------------------------------------

create or replace function public.flowtel_get_cycle_subject_snapshot(p_subject_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public,auth
as $$
declare
  v_profile record;
  v_latest record;
  v_auth_email text;
  v_flowtel_access boolean := false;
begin
  if auth.uid() is null then raise exception 'You must be signed in to open this guest chart.' using errcode='28000'; end if;
  if p_subject_id is null or not public.flowtel_can_view_cycle_subject(p_subject_id) then
    raise exception 'This guest chart is only available with active consent.' using errcode='42501';
  end if;

  select p.id,p.email,p.display_name,p.first_name,p.last_name,p.membership_type,p.membership_rank,p.role,
    public.flowtel_resolve_display_name(p.display_name,p.first_name,p.last_name,p.email,'Flowtel Guest') as resolved_name,
    public.flow_fm_effective_membership_rank(p.id,p.membership_type,p.membership_rank,p.role,p.flowfm_started_at,p.is_initiated) as effective_rank
  into v_profile
  from public.profiles p where p.id=p_subject_id;

  select u.email into v_auth_email from auth.users u where u.id=p_subject_id;
  select coalesce(a.flowtel_access,false) into v_flowtel_access from public.flowtel_product_access a where a.user_id=p_subject_id;
  v_flowtel_access := coalesce(v_flowtel_access,false);

  select s.checkin_date::date,s.checked_in_at,
    coalesce(s.cycle_day_actual,s.cycle_day_calculated,s.cycle_day_claimed) as cycle_day,
    s.inner_season,s.feels_like_inner_season
  into v_latest
  from public.flowtel_stays s where s.client_id=p_subject_id
  order by s.checkin_date desc,s.checked_in_at desc limit 1;

  return jsonb_build_object(
    'subject',jsonb_build_object(
      'id',v_profile.id,'display_name',v_profile.resolved_name,'email',v_profile.email,
      'membership_type',v_profile.membership_type,'effective_membership_rank',v_profile.effective_rank,
      'account_match_status',case
        when v_auth_email is null then 'No authenticated account found'
        when lower(trim(coalesce(v_profile.email,''))) <> lower(trim(coalesce(v_auth_email,''))) then 'Profile email does not match account email'
        when not v_flowtel_access or coalesce(v_profile.effective_rank,0)<1 then 'Account found · Queendom access not recognized'
        else 'Account and Queendom access matched' end
    ),
    'current',jsonb_build_object(
      'cycle_day',v_latest.cycle_day,'inner_season',v_latest.inner_season,
      'feels_like_inner_season',v_latest.feels_like_inner_season,
      'latest_checkin_date',v_latest.checkin_date,'latest_checkin_at',v_latest.checked_in_at
    ),
    'seasons',(
      select jsonb_agg(jsonb_build_object(
        'inner_season',season_name,
        'checkins',checkins,
        'clockins',clockins
      ) order by season_order)
      from (
        select season_name,season_order,
          count(distinct s.id)::integer as checkins,
          count(distinct cs.id)::integer as clockins
        from (values
          ('Inner Autumn',1),('Inner Summer',2),('Inner Winter',3),('Inner Spring',4)
        ) season(season_name,season_order)
        left join public.flowtel_stays s on s.client_id=p_subject_id and s.inner_season=season.season_name
        left join public.flowtel_practitioner_clock_sessions cs on cs.stay_id=s.id and cs.practitioner_id=p_subject_id
        group by season_name,season_order
      ) q
    )
  );
end;
$$;

revoke all on function public.flowtel_get_cycle_subject_snapshot(uuid) from public;
grant execute on function public.flowtel_get_cycle_subject_snapshot(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Owner-to-Priestess private file delivery
-- ---------------------------------------------------------------------------

update storage.buckets
set public=false,
    file_size_limit=262144000,
    allowed_mime_types=array[
      'audio/mpeg','audio/mp3','audio/mpeg3','audio/x-mpeg-3','audio/wav','audio/x-wav','audio/wave','audio/vnd.wave',
      'audio/mp4','audio/m4a','audio/x-m4a','audio/aac','audio/x-aac','audio/ogg',
      'video/mp4','video/quicktime','video/x-m4v','video/webm','image/jpeg','image/png','image/webp','image/gif',
      'application/pdf','text/plain','text/csv','application/zip','application/x-zip-compressed',
      'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/octet-stream'
    ]
where id='flowtel-priestess-mailbox';

create or replace function public.flowtel_mailbox_admin_list_recipients()
returns table(member_id uuid,display_name text,email text,profile_photo_url text)
language plpgsql
stable
security definer
set search_path=public
as $$
begin
  if auth.uid() is null then raise exception 'You must be signed in to open the Priestess directory.' using errcode='28000'; end if;
  if not public.flowtel_current_user_is_concierge() then raise exception 'Only the Flowtel owner can send private files.' using errcode='42501'; end if;
  return query
  select p.id,
    public.flowtel_resolve_display_name(p.display_name,p.first_name,p.last_name,p.email,'Flow FM Priestess'),
    p.email,
    coalesce(nullif(trim(pp.profile_photo_url),''),nullif(trim(p.mentor_photo_url),''))
  from public.profiles p
  left join public.flow_fm_priestess_profiles pp on pp.member_id=p.id
  where p.id<>auth.uid()
    and public.flow_fm_effective_membership_rank(p.id,p.membership_type,p.membership_rank,p.role,p.flowfm_started_at,p.is_initiated)>=2
  order by lower(public.flowtel_resolve_display_name(p.display_name,p.first_name,p.last_name,p.email,'Flow FM Priestess'));
end;
$$;

revoke all on function public.flowtel_mailbox_admin_list_recipients() from public;
grant execute on function public.flowtel_mailbox_admin_list_recipients() to authenticated;

create or replace function public.flowtel_mailbox_admin_send_file(
  p_recipient_id uuid,
  p_thread_id uuid,
  p_subject text,
  p_message text,
  p_storage_path text,
  p_original_filename text,
  p_mime_type text,
  p_size_bytes bigint,
  p_file_note text default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_sender uuid:=auth.uid();
  v_thread uuid:=coalesce(p_thread_id,gen_random_uuid());
  v_file uuid;
begin
  if v_sender is null then raise exception 'You must be signed in to send a private file.' using errcode='28000'; end if;
  if not public.flowtel_current_user_is_concierge() then raise exception 'Only the Flowtel owner can send private files.' using errcode='42501'; end if;
  if not exists(select 1 from public.profiles p where p.id=p_recipient_id and public.flow_fm_effective_membership_rank(p.id,p.membership_type,p.membership_rank,p.role,p.flowfm_started_at,p.is_initiated)>=2) then
    raise exception 'Choose a Flow FM or Council Priestess.' using errcode='42501';
  end if;
  if split_part(coalesce(p_storage_path,''),'/',1)<>p_recipient_id::text
    or split_part(coalesce(p_storage_path,''),'/',2)<>v_thread::text
    or split_part(coalesce(p_storage_path,''),'/',3)<>'to-practitioner' then
    raise exception 'This private file path does not match the chosen Priestess.' using errcode='42501';
  end if;
  if coalesce(trim(p_original_filename),'')='' then raise exception 'Choose a file with a name.'; end if;
  if coalesce(p_size_bytes,0)<=0 or p_size_bytes>262144000 then raise exception 'Choose a file between 1 byte and 250 MB.'; end if;
  if not exists(select 1 from storage.objects o where o.bucket_id='flowtel-priestess-mailbox' and o.name=p_storage_path) then
    raise exception 'The private upload could not be verified.' using errcode='P0002';
  end if;

  if not exists(select 1 from public.flowtel_priestess_mailbox_threads t where t.id=v_thread) then
    insert into public.flowtel_priestess_mailbox_threads(id,practitioner_id,subject,message,status,created_at,updated_at,last_activity_at)
    values(v_thread,p_recipient_id,coalesce(nullif(trim(p_subject),''),'A file from the Flowtel'),nullif(trim(coalesce(p_message,'')),''),'returned_to_priestess',now(),now(),now());
  elsif not exists(select 1 from public.flowtel_priestess_mailbox_threads t where t.id=v_thread and t.practitioner_id=p_recipient_id) then
    raise exception 'This Priestess Mailbox thread does not match the recipient.' using errcode='42501';
  end if;

  insert into public.flowtel_priestess_mailbox_files(thread_id,sender_id,direction,storage_path,original_filename,mime_type,size_bytes,note)
  values(v_thread,v_sender,'to_practitioner',p_storage_path,p_original_filename,nullif(trim(coalesce(p_mime_type,'')),''),p_size_bytes,nullif(trim(coalesce(p_file_note,'')),''))
  returning id into v_file;

  update public.flowtel_priestess_mailbox_threads
  set status='returned_to_priestess',updated_at=now(),last_activity_at=now()
  where id=v_thread;
  return v_file;
end;
$$;

revoke all on function public.flowtel_mailbox_admin_send_file(uuid,uuid,text,text,text,text,text,bigint,text) from public;
grant execute on function public.flowtel_mailbox_admin_send_file(uuid,uuid,text,text,text,text,text,bigint,text) to authenticated;

create or replace function public.flowtel_get_cycle_subject_clockins(p_subject_id uuid)
returns table(stay_id uuid,clocked_in_at timestamptz,clocked_out_at timestamptz,inner_season text,checkin_date date)
language plpgsql
stable
security definer
set search_path=public
as $$
begin
  if auth.uid() is null then raise exception 'You must be signed in to open client clock-in patterns.' using errcode='28000'; end if;
  if p_subject_id is null or not public.flowtel_can_view_cycle_subject(p_subject_id) then raise exception 'Clock-in patterns are only available with active consent.' using errcode='42501'; end if;
  return query
  select cs.stay_id,cs.clocked_in_at,cs.clocked_out_at,coalesce(s.inner_season,cs.inner_season),s.checkin_date::date
  from public.flowtel_practitioner_clock_sessions cs
  left join public.flowtel_stays s on s.id=cs.stay_id
  where cs.practitioner_id=p_subject_id
  order by cs.clocked_in_at desc;
end;
$$;
revoke all on function public.flowtel_get_cycle_subject_clockins(uuid) from public;
grant execute on function public.flowtel_get_cycle_subject_clockins(uuid) to authenticated;
