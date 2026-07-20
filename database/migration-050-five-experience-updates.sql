-- Flowtel v0.10.64 — Five Experience Updates
--
-- 1. Adds append-only workshop replay notes that preserve Flowtel Time, cycle,
--    and moon context and appear in consent-aware Flow Map history.
-- 2. Adds owner-readable workshop-note reporting.
-- 3. Adds 28-day Guest House replay expiration, view/download receipts, and
--    owner-triggered private Storage cleanup support.
--
-- Migration 037 remains retired and must never be rerun.

-- ---------------------------------------------------------------------------
-- Workshop replay notes: private, append-only, cycle-aware
-- ---------------------------------------------------------------------------

create table if not exists public.flowtel_workshop_replay_notes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete restrict,
  stay_id uuid references public.flowtel_stays(id) on delete set null,
  workshop_key text not null,
  workshop_title text not null,
  source_url text,
  note_type text not null,
  note_body text not null,
  flowtel_date date not null,
  cycle_day_actual integer,
  cycle_day_recorded integer,
  cycle_start_date date,
  previous_cycle_length_days integer,
  inner_season text,
  feels_like_inner_season text,
  moon_day integer,
  moon_phase text,
  moon_inner_season text,
  moon_theme text,
  created_at timestamptz not null default now(),
  constraint flowtel_workshop_replay_note_type_check check (
    note_type in ('question','note','download','reflection','cycle_data')
  ),
  constraint flowtel_workshop_replay_workshop_key_check check (
    char_length(trim(workshop_key)) between 1 and 120
  ),
  constraint flowtel_workshop_replay_workshop_title_check check (
    char_length(trim(workshop_title)) between 1 and 240
  ),
  constraint flowtel_workshop_replay_source_url_check check (
    source_url is null or char_length(source_url) <= 1000
  ),
  constraint flowtel_workshop_replay_note_body_check check (
    char_length(trim(note_body)) between 1 and 4000
  ),
  constraint flowtel_workshop_replay_actual_day_check check (
    cycle_day_actual is null or cycle_day_actual >= 1
  ),
  constraint flowtel_workshop_replay_recorded_day_check check (
    cycle_day_recorded is null or cycle_day_recorded >= 1
  ),
  constraint flowtel_workshop_replay_moon_day_check check (
    moon_day is null or moon_day between 1 and 31
  )
);

create index if not exists flowtel_workshop_replay_notes_member_created_idx
  on public.flowtel_workshop_replay_notes (member_id, created_at desc);
create index if not exists flowtel_workshop_replay_notes_workshop_created_idx
  on public.flowtel_workshop_replay_notes (workshop_key, created_at desc);

alter table public.flowtel_workshop_replay_notes enable row level security;
revoke all on public.flowtel_workshop_replay_notes from anon;
revoke insert, update, delete on public.flowtel_workshop_replay_notes from authenticated;
grant select on public.flowtel_workshop_replay_notes to authenticated;

drop policy if exists flowtel_workshop_replay_notes_member_select on public.flowtel_workshop_replay_notes;
create policy flowtel_workshop_replay_notes_member_select
on public.flowtel_workshop_replay_notes
for select
to authenticated
using (
  member_id = auth.uid()
  or public.flowtel_current_user_is_concierge()
);

drop policy if exists flowtel_workshop_replay_notes_product_boundary on public.flowtel_workshop_replay_notes;
create policy flowtel_workshop_replay_notes_product_boundary
on public.flowtel_workshop_replay_notes
as restrictive
for select
to authenticated
using (public.flowtel_current_user_has_product_access('flowtel'));

create or replace function public.flowtel_workshop_replay_current_user_is_eligible()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select auth.uid() is not null
    and public.flowtel_current_user_has_product_access('flowtel')
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and (
          lower(trim(coalesce(p.role,''))) in ('owner','admin')
          or public.flow_fm_effective_membership_rank(
            p.id,p.membership_type,p.membership_rank,p.role,p.flowfm_started_at,p.is_initiated
          ) >= 1
        )
    );
$$;

revoke all on function public.flowtel_workshop_replay_current_user_is_eligible() from public;
grant execute on function public.flowtel_workshop_replay_current_user_is_eligible() to authenticated;

create or replace function public.flowtel_save_workshop_replay_note(
  p_workshop_key text,
  p_workshop_title text,
  p_note_type text,
  p_note_body text,
  p_source_url text default null,
  p_moon_day integer default null,
  p_moon_phase text default null,
  p_moon_inner_season text default null,
  p_moon_theme text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := (timezone('America/Los_Angeles', now()))::date;
  v_stay public.flowtel_stays%rowtype;
  v_note_id uuid;
  v_key text := lower(regexp_replace(trim(coalesce(p_workshop_key,'')), '[^a-zA-Z0-9_-]+', '-', 'g'));
  v_type text := lower(trim(coalesce(p_note_type,'')));
begin
  if v_user_id is null then
    raise exception 'Sign in through the Flowtel doorway to save replay notes.' using errcode = '28000';
  end if;
  if not public.flowtel_workshop_replay_current_user_is_eligible() then
    raise exception 'Replay notes are reserved for Queendom members.' using errcode = '42501';
  end if;
  if char_length(v_key) not between 1 and 120 then
    raise exception 'This workshop could not be identified.' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_workshop_title,''))) not between 1 and 240 then
    raise exception 'Add a workshop title.' using errcode = '22023';
  end if;
  if v_type not in ('question','note','download','reflection','cycle_data') then
    raise exception 'Choose a replay note type.' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_note_body,''))) not between 1 and 4000 then
    raise exception 'Write a note between 1 and 4,000 characters.' using errcode = '22023';
  end if;
  if p_source_url is not null and char_length(p_source_url) > 1000 then
    raise exception 'The replay source link is too long.' using errcode = '22023';
  end if;
  if p_moon_day is not null and p_moon_day not between 1 and 31 then
    raise exception 'Moon day must be between 1 and 31.' using errcode = '22023';
  end if;

  select s.* into v_stay
  from public.flowtel_stays s
  where s.client_id = v_user_id
    and coalesce(s.checkin_date::date,(timezone('America/Los_Angeles',s.checked_in_at))::date) = v_today
  order by s.checked_in_at desc nulls last,s.id desc
  limit 1;

  insert into public.flowtel_workshop_replay_notes (
    member_id,stay_id,workshop_key,workshop_title,source_url,note_type,note_body,
    flowtel_date,cycle_day_actual,cycle_day_recorded,cycle_start_date,
    previous_cycle_length_days,inner_season,feels_like_inner_season,
    moon_day,moon_phase,moon_inner_season,moon_theme
  ) values (
    v_user_id,v_stay.id,v_key,trim(p_workshop_title),nullif(trim(coalesce(p_source_url,'')),''),
    v_type,trim(p_note_body),v_today,
    coalesce(v_stay.cycle_day_actual,v_stay.cycle_day_calculated,v_stay.cycle_day_claimed),
    coalesce(v_stay.cycle_day_recorded,v_stay.cycle_day_claimed),
    v_stay.cycle_start_date::date,v_stay.previous_cycle_length_days,
    v_stay.inner_season,v_stay.feels_like_inner_season,
    coalesce(p_moon_day,v_stay.moon_day),
    coalesce(nullif(trim(coalesce(p_moon_phase,'')),''),v_stay.moon_phase),
    coalesce(nullif(trim(coalesce(p_moon_inner_season,'')),''),v_stay.moon_inner_season),
    coalesce(nullif(trim(coalesce(p_moon_theme,'')),''),v_stay.moon_theme)
  ) returning id into v_note_id;

  return v_note_id;
end;
$$;

revoke all on function public.flowtel_save_workshop_replay_note(text,text,text,text,text,integer,text,text,text) from public;
grant execute on function public.flowtel_save_workshop_replay_note(text,text,text,text,text,integer,text,text,text) to authenticated;

create or replace function public.flowtel_get_my_workshop_replay_notes(p_workshop_key text default null)
returns table (
  note_id uuid,
  workshop_key text,
  workshop_title text,
  source_url text,
  note_type text,
  note_body text,
  flowtel_date date,
  cycle_day_actual integer,
  cycle_day_recorded integer,
  inner_season text,
  moon_day integer,
  moon_phase text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in through the Flowtel doorway to open replay notes.' using errcode = '28000';
  end if;
  if not public.flowtel_workshop_replay_current_user_is_eligible() then
    raise exception 'Replay notes are reserved for Queendom members.' using errcode = '42501';
  end if;

  return query
  select n.id,n.workshop_key,n.workshop_title,n.source_url,n.note_type,n.note_body,
    n.flowtel_date,n.cycle_day_actual,n.cycle_day_recorded,n.inner_season,
    n.moon_day,n.moon_phase,n.created_at
  from public.flowtel_workshop_replay_notes n
  where n.member_id = auth.uid()
    and (p_workshop_key is null or n.workshop_key = lower(regexp_replace(trim(p_workshop_key), '[^a-zA-Z0-9_-]+', '-', 'g')))
  order by n.created_at desc
  limit 500;
end;
$$;

revoke all on function public.flowtel_get_my_workshop_replay_notes(text) from public;
grant execute on function public.flowtel_get_my_workshop_replay_notes(text) to authenticated;

create or replace function public.flowtel_admin_get_workshop_replay_notes(p_workshop_key text default null)
returns table (
  note_id uuid,
  member_id uuid,
  display_name text,
  workshop_key text,
  workshop_title text,
  source_url text,
  note_type text,
  note_body text,
  flowtel_date date,
  cycle_day_actual integer,
  cycle_day_recorded integer,
  inner_season text,
  moon_day integer,
  moon_phase text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to open workshop replay notes.' using errcode = '28000';
  end if;
  if not public.flowtel_current_user_is_concierge() then
    raise exception 'Workshop replay notes are reserved for the Flowtel owner.' using errcode = '42501';
  end if;

  return query
  select n.id,n.member_id,
    public.flowtel_resolve_display_name(p.display_name,p.first_name,p.last_name,p.email,'Flowtel Guest'),
    n.workshop_key,n.workshop_title,n.source_url,n.note_type,n.note_body,
    n.flowtel_date,n.cycle_day_actual,n.cycle_day_recorded,n.inner_season,
    n.moon_day,n.moon_phase,n.created_at
  from public.flowtel_workshop_replay_notes n
  join public.profiles p on p.id = n.member_id
  where p_workshop_key is null
    or n.workshop_key = lower(regexp_replace(trim(p_workshop_key), '[^a-zA-Z0-9_-]+', '-', 'g'))
  order by n.created_at desc
  limit 3000;
end;
$$;

revoke all on function public.flowtel_admin_get_workshop_replay_notes(text) from public;
grant execute on function public.flowtel_admin_get_workshop_replay_notes(text) to authenticated;

-- Keep workshop notes inside the established, consent-aware Flow Map rather
-- than creating a second disconnected reflection history.
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
      r.reflection,r.created_at,null::text
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
      s.reflection,coalesce(s.updated_at,s.checked_in_at),null::text
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
      null::text,coalesce(s.checked_out_at,s.updated_at,s.checked_in_at),s.checkout_notes
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
      n.created_at,null::text
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
-- Guest House: 28-day replay lifecycle + receipts
-- ---------------------------------------------------------------------------

alter table public.flowtel_guest_house_files
  add column if not exists expires_at timestamptz,
  add column if not exists deletion_status text not null default 'active',
  add column if not exists deleted_at timestamptz,
  add column if not exists deletion_error text,
  add column if not exists first_viewed_at timestamptz,
  add column if not exists last_viewed_at timestamptz,
  add column if not exists view_count integer not null default 0,
  add column if not exists first_downloaded_at timestamptz,
  add column if not exists last_downloaded_at timestamptz,
  add column if not exists download_count integer not null default 0;

update public.flowtel_guest_house_files
set expires_at = uploaded_at + interval '28 days'
where expires_at is null;

alter table public.flowtel_guest_house_files
  drop constraint if exists flowtel_guest_house_file_deletion_status_check;
alter table public.flowtel_guest_house_files
  add constraint flowtel_guest_house_file_deletion_status_check
  check (deletion_status in ('active','deleted','delete_failed'));

alter table public.flowtel_guest_house_files
  drop constraint if exists flowtel_guest_house_file_view_count_check;
alter table public.flowtel_guest_house_files
  add constraint flowtel_guest_house_file_view_count_check check (view_count >= 0);

alter table public.flowtel_guest_house_files
  drop constraint if exists flowtel_guest_house_file_download_count_check;
alter table public.flowtel_guest_house_files
  add constraint flowtel_guest_house_file_download_count_check check (download_count >= 0);

create index if not exists flowtel_guest_house_files_expiry_idx
  on public.flowtel_guest_house_files (expires_at)
  where is_active = true and deletion_status <> 'deleted';

alter table public.flowtel_guest_house_events
  drop constraint if exists flowtel_guest_house_event_type_check;
alter table public.flowtel_guest_house_events
  add constraint flowtel_guest_house_event_type_check check (
    event_type in (
      'request_created','status_changed','replay_uploaded','replay_removed','access_prepared',
      'access_revoked','access_opened','stream_started','download_requested',
      'invitation_sent','invitation_copy_prepared','replay_expired','replay_deletion_failed'
    )
  );

create or replace function public.flowtel_guest_house_admin_add_file(
  p_request_id uuid,
  p_storage_path text,
  p_original_filename text,
  p_display_title text,
  p_mime_type text,
  p_media_kind text,
  p_size_bytes bigint,
  p_note_to_guest text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_file_id uuid;
  v_kind text := lower(trim(coalesce(p_media_kind,'')));
  v_expires_at timestamptz := now() + interval '28 days';
begin
  if v_user_id is null then
    raise exception 'You must be signed in to prepare a Guest House replay.' using errcode = '28000';
  end if;
  if not public.flowtel_current_user_is_concierge() then
    raise exception 'Only the Flowtel owner may prepare Guest House replay files.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.flowtel_guest_house_requests where id = p_request_id) then
    raise exception 'This Guest House request could not be found.' using errcode = 'P0002';
  end if;
  if split_part(coalesce(p_storage_path,''),'/',1) <> p_request_id::text then
    raise exception 'The replay file path does not match this Guest House request.' using errcode = '42501';
  end if;
  if coalesce(trim(p_original_filename),'') = ''
     or lower(p_original_filename) !~ '\.(mp4|mov|m4v|webm|mp3|wav|m4a|aac|ogg)$' then
    raise exception 'Choose an MP4, MOV, M4V, WEBM, MP3, WAV, M4A, AAC, or OGG replay file.' using errcode = '22023';
  end if;
  if v_kind not in ('audio','video') then
    raise exception 'The replay must be identified as audio or video.' using errcode = '22023';
  end if;
  if coalesce(p_size_bytes,0) <= 0 or p_size_bytes > 2147483648 then
    raise exception 'Choose a replay file between 1 byte and 2 GB.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'flowtel-guest-house-replays' and o.name = p_storage_path
  ) then
    raise exception 'The private replay upload could not be verified.' using errcode = 'P0002';
  end if;

  insert into public.flowtel_guest_house_files (
    request_id,uploaded_by,storage_path,original_filename,display_title,mime_type,
    media_kind,size_bytes,note_to_guest,expires_at,deletion_status
  ) values (
    p_request_id,v_user_id,p_storage_path,trim(p_original_filename),
    nullif(trim(coalesce(p_display_title,'')),''),nullif(trim(coalesce(p_mime_type,'')),''),
    v_kind,p_size_bytes,nullif(trim(coalesce(p_note_to_guest,'')),''),v_expires_at,'active'
  ) returning id into v_file_id;

  update public.flowtel_guest_house_requests
  set status='ready',ready_at=coalesce(ready_at,now()),updated_at=now()
  where id=p_request_id;

  insert into public.flowtel_guest_house_events(request_id,actor_id,event_type,event_context)
  values (p_request_id,v_user_id,'replay_uploaded',jsonb_build_object(
    'file_id',v_file_id,'filename',trim(p_original_filename),'media_kind',v_kind,
    'size_bytes',p_size_bytes,'expires_at',v_expires_at
  ));

  return v_file_id;
end;
$$;

revoke all on function public.flowtel_guest_house_admin_add_file(uuid,text,text,text,text,text,bigint,text) from public;
grant execute on function public.flowtel_guest_house_admin_add_file(uuid,text,text,text,text,text,bigint,text) to authenticated;

drop function if exists public.flowtel_guest_house_admin_get_queue();
create function public.flowtel_guest_house_admin_get_queue()
returns table (
  request_id uuid,
  guest_id uuid,
  first_name text,
  last_name text,
  email text,
  member_id uuid,
  auth_user_id uuid,
  account_created_at timestamptz,
  call_date_hint text,
  call_topic text,
  requester_note text,
  request_status text,
  owner_note text,
  request_created_at timestamptz,
  request_updated_at timestamptz,
  ready_at timestamptz,
  delivered_at timestamptz,
  access_expires_at timestamptz,
  access_revoked_at timestamptz,
  last_accessed_at timestamptz,
  access_count integer,
  files jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to open the Guest House.' using errcode = '28000';
  end if;
  if not public.flowtel_current_user_is_concierge() then
    raise exception 'The Guest House request queue is reserved for the Flowtel owner.' using errcode = '42501';
  end if;

  return query
  select r.id,g.id,g.first_name,g.last_name,g.email,g.member_id,g.auth_user_id,g.account_created_at,
    r.call_date_hint,r.call_topic,r.requester_note,r.status,r.owner_note,r.created_at,r.updated_at,
    r.ready_at,r.delivered_at,r.access_expires_at,r.access_revoked_at,r.last_accessed_at,r.access_count,
    coalesce(jsonb_agg(jsonb_build_object(
      'file_id',f.id,'storage_path',f.storage_path,'original_filename',f.original_filename,
      'display_title',f.display_title,'mime_type',f.mime_type,'media_kind',f.media_kind,
      'size_bytes',f.size_bytes,'note_to_guest',f.note_to_guest,'is_active',f.is_active,
      'uploaded_at',f.uploaded_at,'expires_at',f.expires_at,'deletion_status',f.deletion_status,
      'deleted_at',f.deleted_at,'deletion_error',f.deletion_error,
      'first_viewed_at',f.first_viewed_at,'last_viewed_at',f.last_viewed_at,'view_count',f.view_count,
      'first_downloaded_at',f.first_downloaded_at,'last_downloaded_at',f.last_downloaded_at,
      'download_count',f.download_count
    ) order by f.uploaded_at asc,f.id) filter (where f.id is not null),'[]'::jsonb)
  from public.flowtel_guest_house_requests r
  join public.flowtel_guest_house_guests g on g.id=r.guest_id
  left join public.flowtel_guest_house_files f on f.request_id=r.id
  group by r.id,g.id
  order by case r.status
    when 'locating' then 0 when 'requested' then 0 when 'preparing' then 0
    when 'ready' then 1 when 'delivered' then 1 when 'received' then 1
    when 'unable_to_locate' then 2 else 3 end,r.created_at desc;
end;
$$;

revoke all on function public.flowtel_guest_house_admin_get_queue() from public;
grant execute on function public.flowtel_guest_house_admin_get_queue() to authenticated;

create or replace function public.flowtel_guest_house_admin_get_expired_files()
returns table (file_id uuid,request_id uuid,storage_path text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Sign in to tend expired replays.' using errcode='28000'; end if;
  if not public.flowtel_current_user_is_concierge() then raise exception 'Only the Flowtel owner may tend expired replays.' using errcode='42501'; end if;
  return query
  select f.id,f.request_id,f.storage_path
  from public.flowtel_guest_house_files f
  where f.is_active=true and f.deletion_status <> 'deleted' and f.expires_at <= now()
  order by f.expires_at asc;
end;
$$;
revoke all on function public.flowtel_guest_house_admin_get_expired_files() from public;
grant execute on function public.flowtel_guest_house_admin_get_expired_files() to authenticated;

create or replace function public.flowtel_guest_house_admin_mark_files_deleted(p_file_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_count integer;
begin
  if auth.uid() is null then raise exception 'Sign in to tend expired replays.' using errcode='28000'; end if;
  if not public.flowtel_current_user_is_concierge() then raise exception 'Only the Flowtel owner may tend expired replays.' using errcode='42501'; end if;
  update public.flowtel_guest_house_files
  set is_active=false,deletion_status='deleted',deleted_at=now(),deactivated_at=coalesce(deactivated_at,now()),deletion_error=null
  where id=any(coalesce(p_file_ids,'{}'::uuid[]));
  get diagnostics v_count = row_count;
  insert into public.flowtel_guest_house_events(request_id,actor_id,event_type,event_context)
  select distinct f.request_id,auth.uid(),'replay_expired',jsonb_build_object('file_id',f.id,'deleted_at',now())
  from public.flowtel_guest_house_files f where f.id=any(coalesce(p_file_ids,'{}'::uuid[]));
  return v_count;
end;
$$;
revoke all on function public.flowtel_guest_house_admin_mark_files_deleted(uuid[]) from public;
grant execute on function public.flowtel_guest_house_admin_mark_files_deleted(uuid[]) to authenticated;

create or replace function public.flowtel_guest_house_admin_mark_file_delete_failed(p_file_id uuid,p_error text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_request_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to tend expired replays.' using errcode='28000'; end if;
  if not public.flowtel_current_user_is_concierge() then raise exception 'Only the Flowtel owner may tend expired replays.' using errcode='42501'; end if;
  update public.flowtel_guest_house_files
  set deletion_status='delete_failed',deletion_error=left(coalesce(p_error,'Storage deletion failed.'),1000)
  where id=p_file_id returning request_id into v_request_id;
  if v_request_id is not null then
    insert into public.flowtel_guest_house_events(request_id,actor_id,event_type,event_context)
    values (v_request_id,auth.uid(),'replay_deletion_failed',jsonb_build_object('file_id',p_file_id,'error',left(coalesce(p_error,''),1000)));
  end if;
  return p_file_id;
end;
$$;
revoke all on function public.flowtel_guest_house_admin_mark_file_delete_failed(uuid,text) from public;
grant execute on function public.flowtel_guest_house_admin_mark_file_delete_failed(uuid,text) to authenticated;

comment on table public.flowtel_workshop_replay_notes is
  'Append-only Queendom workshop replay notes with Flowtel Time, cycle, and moon context. Notes appear in consent-aware Flow Map history.';
comment on column public.flowtel_guest_house_files.expires_at is
  'The private replay becomes unavailable 28 days after upload. Physical Storage cleanup completes on the next owner Concierge visit.';
