-- Flowtel v0.10.58 — Guest House Call Replay Room MVP
--
-- Creates a public request doorway and private token-gated replay rooms for former
-- 1:1 clients who may not be Queendom or Flowtel members. Guest House identities
-- are deliberately separate from Supabase Auth and profiles, so submitting a
-- request never grants Flowtel, Queendom, Flow FM, Concierge, Team Map, Suite,
-- cycle, or Caddie Magic access.
--
-- Replay files remain in a private Storage bucket. Anonymous visitors never
-- receive direct table or bucket permissions; short-lived signed media URLs are
-- prepared only by the server after an opaque access token is validated.
--
-- Migration 037 remains retired and must never be rerun.

-- ---------------------------------------------------------------------------
-- Private storage for owner-supplied audio and video replays
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'flowtel-guest-house-replays',
  'flowtel-guest-house-replays',
  false,
  2147483648,
  array[
    'video/mp4','video/quicktime','video/x-m4v','video/webm',
    'audio/mpeg','audio/mp3','audio/mpeg3','audio/x-mpeg-3',
    'audio/wav','audio/x-wav','audio/wave','audio/vnd.wave',
    'audio/mp4','audio/m4a','audio/x-m4a','audio/aac','audio/x-aac','audio/ogg',
    'application/octet-stream'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Guest House identity, request, file, and append-only event records
-- ---------------------------------------------------------------------------

create table if not exists public.flowtel_guest_house_guests (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null unique,
  member_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint flowtel_guest_house_guest_first_name_check check (char_length(trim(first_name)) between 1 and 100),
  constraint flowtel_guest_house_guest_last_name_check check (char_length(trim(last_name)) between 1 and 100),
  constraint flowtel_guest_house_guest_email_normalized_check check (email = lower(trim(email))),
  constraint flowtel_guest_house_guest_email_length_check check (char_length(email) between 3 and 320)
);

create table if not exists public.flowtel_guest_house_requests (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.flowtel_guest_house_guests(id) on delete restrict,
  call_date_hint text,
  call_topic text,
  requester_note text,
  status text not null default 'requested',
  owner_note text,
  request_source text not null default 'guest_house_public',
  requester_confirmed_ownership boolean not null default false,
  access_token_hash text unique,
  access_token_created_at timestamptz,
  access_expires_at timestamptz,
  access_revoked_at timestamptz,
  ready_at timestamptz,
  delivered_at timestamptz,
  last_accessed_at timestamptz,
  access_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint flowtel_guest_house_request_status_check check (
    status in ('requested','locating','preparing','ready','delivered','received','unable_to_locate','archived')
  ),
  constraint flowtel_guest_house_request_token_hash_check check (
    access_token_hash is null or access_token_hash ~ '^[a-f0-9]{64}$'
  ),
  constraint flowtel_guest_house_request_access_count_check check (access_count >= 0),
  constraint flowtel_guest_house_call_date_length_check check (call_date_hint is null or char_length(call_date_hint) <= 160),
  constraint flowtel_guest_house_call_topic_length_check check (call_topic is null or char_length(call_topic) <= 240),
  constraint flowtel_guest_house_requester_note_length_check check (requester_note is null or char_length(requester_note) <= 2000),
  constraint flowtel_guest_house_owner_note_length_check check (owner_note is null or char_length(owner_note) <= 3000)
);

create table if not exists public.flowtel_guest_house_files (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.flowtel_guest_house_requests(id) on delete restrict,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  storage_path text not null unique,
  original_filename text not null,
  display_title text,
  mime_type text,
  media_kind text not null,
  size_bytes bigint not null,
  note_to_guest text,
  is_active boolean not null default true,
  uploaded_at timestamptz not null default now(),
  deactivated_at timestamptz,
  constraint flowtel_guest_house_file_kind_check check (media_kind in ('audio','video')),
  constraint flowtel_guest_house_file_size_check check (size_bytes > 0 and size_bytes <= 2147483648),
  constraint flowtel_guest_house_file_name_check check (char_length(trim(original_filename)) between 1 and 500),
  constraint flowtel_guest_house_file_title_check check (display_title is null or char_length(display_title) <= 240),
  constraint flowtel_guest_house_file_note_check check (note_to_guest is null or char_length(note_to_guest) <= 1000)
);

create table if not exists public.flowtel_guest_house_events (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.flowtel_guest_house_requests(id) on delete restrict,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  event_context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint flowtel_guest_house_event_type_check check (
    event_type in (
      'request_created','status_changed','replay_uploaded','replay_removed','access_prepared',
      'access_revoked','access_opened','stream_started','download_requested',
      'invitation_sent','invitation_copy_prepared'
    )
  )
);

create index if not exists flowtel_guest_house_requests_guest_created_idx
  on public.flowtel_guest_house_requests (guest_id, created_at desc);
create index if not exists flowtel_guest_house_requests_status_created_idx
  on public.flowtel_guest_house_requests (status, created_at desc);
create index if not exists flowtel_guest_house_requests_token_idx
  on public.flowtel_guest_house_requests (access_token_hash)
  where access_token_hash is not null;
create index if not exists flowtel_guest_house_files_request_uploaded_idx
  on public.flowtel_guest_house_files (request_id, uploaded_at asc);
create index if not exists flowtel_guest_house_events_request_created_idx
  on public.flowtel_guest_house_events (request_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Privacy boundaries: no browser role may query or mutate these tables directly
-- ---------------------------------------------------------------------------

alter table public.flowtel_guest_house_guests enable row level security;
alter table public.flowtel_guest_house_requests enable row level security;
alter table public.flowtel_guest_house_files enable row level security;
alter table public.flowtel_guest_house_events enable row level security;

revoke all on public.flowtel_guest_house_guests from anon, authenticated;
revoke all on public.flowtel_guest_house_requests from anon, authenticated;
revoke all on public.flowtel_guest_house_files from anon, authenticated;
revoke all on public.flowtel_guest_house_events from anon, authenticated;

-- Owner-only Storage access. Guest House visitors receive only server-created,
-- short-lived signed URLs after their opaque room key is validated.
drop policy if exists "Flowtel owner reads Guest House replays" on storage.objects;
create policy "Flowtel owner reads Guest House replays"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'flowtel-guest-house-replays'
    and public.flowtel_current_user_is_concierge()
  );

drop policy if exists "Flowtel owner uploads Guest House replays" on storage.objects;
create policy "Flowtel owner uploads Guest House replays"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'flowtel-guest-house-replays'
    and public.flowtel_current_user_is_concierge()
  );

drop policy if exists "Flowtel owner updates Guest House replays" on storage.objects;
create policy "Flowtel owner updates Guest House replays"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'flowtel-guest-house-replays'
    and public.flowtel_current_user_is_concierge()
  )
  with check (
    bucket_id = 'flowtel-guest-house-replays'
    and public.flowtel_current_user_is_concierge()
  );

drop policy if exists "Flowtel owner removes failed Guest House uploads" on storage.objects;
create policy "Flowtel owner removes failed Guest House uploads"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'flowtel-guest-house-replays'
    and public.flowtel_current_user_is_concierge()
  );

-- ---------------------------------------------------------------------------
-- Owner Concierge RPCs
-- ---------------------------------------------------------------------------

create or replace function public.flowtel_guest_house_admin_get_queue()
returns table (
  request_id uuid,
  guest_id uuid,
  first_name text,
  last_name text,
  email text,
  member_id uuid,
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
  select
    r.id,
    g.id,
    g.first_name,
    g.last_name,
    g.email,
    g.member_id,
    r.call_date_hint,
    r.call_topic,
    r.requester_note,
    r.status,
    r.owner_note,
    r.created_at,
    r.updated_at,
    r.ready_at,
    r.delivered_at,
    r.access_expires_at,
    r.access_revoked_at,
    r.last_accessed_at,
    r.access_count,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'file_id',f.id,
          'storage_path',f.storage_path,
          'original_filename',f.original_filename,
          'display_title',f.display_title,
          'mime_type',f.mime_type,
          'media_kind',f.media_kind,
          'size_bytes',f.size_bytes,
          'note_to_guest',f.note_to_guest,
          'is_active',f.is_active,
          'uploaded_at',f.uploaded_at
        ) order by f.uploaded_at asc, f.id
      ) filter (where f.id is not null),
      '[]'::jsonb
    ) as files
  from public.flowtel_guest_house_requests r
  join public.flowtel_guest_house_guests g on g.id = r.guest_id
  left join public.flowtel_guest_house_files f on f.request_id = r.id
  group by r.id,g.id
  order by
    case r.status
      when 'requested' then 0
      when 'locating' then 1
      when 'preparing' then 2
      when 'ready' then 3
      when 'delivered' then 4
      when 'received' then 5
      when 'unable_to_locate' then 6
      else 7
    end,
    r.created_at desc;
end;
$$;

revoke all on function public.flowtel_guest_house_admin_get_queue() from public;
grant execute on function public.flowtel_guest_house_admin_get_queue() to authenticated;

create or replace function public.flowtel_guest_house_admin_update_request(
  p_request_id uuid,
  p_status text,
  p_owner_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_old_status text;
  v_new_status text := lower(trim(coalesce(p_status,'')));
begin
  if v_user_id is null then
    raise exception 'You must be signed in to tend a Guest House request.' using errcode = '28000';
  end if;
  if not public.flowtel_current_user_is_concierge() then
    raise exception 'Only the Flowtel owner may tend Guest House requests.' using errcode = '42501';
  end if;
  if v_new_status not in ('requested','locating','preparing','ready','delivered','received','unable_to_locate','archived') then
    raise exception 'Choose a valid Guest House request status.' using errcode = '22023';
  end if;

  select status into v_old_status
  from public.flowtel_guest_house_requests
  where id = p_request_id
  for update;

  if v_old_status is null then
    raise exception 'This Guest House request could not be found.' using errcode = 'P0002';
  end if;

  update public.flowtel_guest_house_requests
  set status = v_new_status,
      owner_note = nullif(trim(coalesce(p_owner_note,'')),''),
      ready_at = case when v_new_status = 'ready' then coalesce(ready_at,now()) else ready_at end,
      delivered_at = case when v_new_status = 'delivered' then coalesce(delivered_at,now()) else delivered_at end,
      updated_at = now()
  where id = p_request_id;

  if v_old_status is distinct from v_new_status then
    insert into public.flowtel_guest_house_events(request_id,actor_id,event_type,event_context)
    values (p_request_id,v_user_id,'status_changed',jsonb_build_object('from',v_old_status,'to',v_new_status));
  end if;

  return p_request_id;
end;
$$;

revoke all on function public.flowtel_guest_house_admin_update_request(uuid,text,text) from public;
grant execute on function public.flowtel_guest_house_admin_update_request(uuid,text,text) to authenticated;

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
    where o.bucket_id = 'flowtel-guest-house-replays'
      and o.name = p_storage_path
  ) then
    raise exception 'The private replay upload could not be verified.' using errcode = 'P0002';
  end if;

  insert into public.flowtel_guest_house_files (
    request_id,uploaded_by,storage_path,original_filename,display_title,mime_type,
    media_kind,size_bytes,note_to_guest
  ) values (
    p_request_id,v_user_id,p_storage_path,trim(p_original_filename),
    nullif(trim(coalesce(p_display_title,'')),''),nullif(trim(coalesce(p_mime_type,'')),''),
    v_kind,p_size_bytes,nullif(trim(coalesce(p_note_to_guest,'')),'')
  ) returning id into v_file_id;

  update public.flowtel_guest_house_requests
  set status = 'ready',
      ready_at = coalesce(ready_at,now()),
      updated_at = now()
  where id = p_request_id;

  insert into public.flowtel_guest_house_events(request_id,actor_id,event_type,event_context)
  values (
    p_request_id,v_user_id,'replay_uploaded',
    jsonb_build_object('file_id',v_file_id,'filename',trim(p_original_filename),'media_kind',v_kind,'size_bytes',p_size_bytes)
  );

  return v_file_id;
end;
$$;

revoke all on function public.flowtel_guest_house_admin_add_file(uuid,text,text,text,text,text,bigint,text) from public;
grant execute on function public.flowtel_guest_house_admin_add_file(uuid,text,text,text,text,text,bigint,text) to authenticated;

create or replace function public.flowtel_guest_house_admin_deactivate_file(p_file_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_request_id uuid;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to remove a replay from a Guest House room.' using errcode = '28000';
  end if;
  if not public.flowtel_current_user_is_concierge() then
    raise exception 'Only the Flowtel owner may remove a replay from a Guest House room.' using errcode = '42501';
  end if;

  update public.flowtel_guest_house_files
  set is_active = false,
      deactivated_at = coalesce(deactivated_at,now())
  where id = p_file_id
    and is_active = true
  returning request_id into v_request_id;

  if v_request_id is null then
    raise exception 'This Guest House replay could not be found or is already removed.' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.flowtel_guest_house_files
    where request_id = v_request_id and is_active = true
  ) then
    update public.flowtel_guest_house_requests
    set status = 'preparing',
        access_revoked_at = coalesce(access_revoked_at,now()),
        updated_at = now()
    where id = v_request_id;
  end if;

  insert into public.flowtel_guest_house_events(request_id,actor_id,event_type,event_context)
  values (v_request_id,v_user_id,'replay_removed',jsonb_build_object('file_id',p_file_id));

  return p_file_id;
end;
$$;

revoke all on function public.flowtel_guest_house_admin_deactivate_file(uuid) from public;
grant execute on function public.flowtel_guest_house_admin_deactivate_file(uuid) to authenticated;

create or replace function public.flowtel_guest_house_admin_prepare_access(
  p_request_id uuid,
  p_token_hash text,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'You must be signed in to prepare a private Replay Room.' using errcode = '28000';
  end if;
  if not public.flowtel_current_user_is_concierge() then
    raise exception 'Only the Flowtel owner may prepare private Replay Room access.' using errcode = '42501';
  end if;
  if coalesce(p_token_hash,'') !~ '^[a-f0-9]{64}$' then
    raise exception 'The private room key could not be prepared.' using errcode = '22023';
  end if;
  if p_expires_at is null or p_expires_at <= now() or p_expires_at > now() + interval '366 days' then
    raise exception 'Choose an access expiration between tomorrow and one year from now.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.flowtel_guest_house_files
    where request_id = p_request_id and is_active = true
  ) then
    raise exception 'Add at least one replay file before opening the private room.' using errcode = '22023';
  end if;

  update public.flowtel_guest_house_requests
  set access_token_hash = p_token_hash,
      access_token_created_at = now(),
      access_expires_at = p_expires_at,
      access_revoked_at = null,
      status = case when status in ('delivered','received') then status else 'ready' end,
      ready_at = coalesce(ready_at,now()),
      updated_at = now()
  where id = p_request_id;

  if not found then
    raise exception 'This Guest House request could not be found.' using errcode = 'P0002';
  end if;

  insert into public.flowtel_guest_house_events(request_id,actor_id,event_type,event_context)
  values (p_request_id,v_user_id,'access_prepared',jsonb_build_object('expires_at',p_expires_at));

  return p_request_id;
end;
$$;

revoke all on function public.flowtel_guest_house_admin_prepare_access(uuid,text,timestamptz) from public;
grant execute on function public.flowtel_guest_house_admin_prepare_access(uuid,text,timestamptz) to authenticated;

create or replace function public.flowtel_guest_house_admin_revoke_access(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'You must be signed in to close a private Replay Room.' using errcode = '28000';
  end if;
  if not public.flowtel_current_user_is_concierge() then
    raise exception 'Only the Flowtel owner may close private Replay Room access.' using errcode = '42501';
  end if;

  update public.flowtel_guest_house_requests
  set access_revoked_at = now(),updated_at = now()
  where id = p_request_id;

  if not found then
    raise exception 'This Guest House request could not be found.' using errcode = 'P0002';
  end if;

  insert into public.flowtel_guest_house_events(request_id,actor_id,event_type,event_context)
  values (p_request_id,v_user_id,'access_revoked','{}'::jsonb);

  return p_request_id;
end;
$$;

revoke all on function public.flowtel_guest_house_admin_revoke_access(uuid) from public;
grant execute on function public.flowtel_guest_house_admin_revoke_access(uuid) to authenticated;

comment on table public.flowtel_guest_house_guests is
  'Minimal Guest House identity record. It is not a Supabase Auth user, Flowtel profile, or membership grant.';
comment on table public.flowtel_guest_house_requests is
  'Owner-reviewed call replay requests with revocable opaque-token access. No public table access is granted.';
comment on table public.flowtel_guest_house_files is
  'Private owner-uploaded audio/video replay metadata. Storage remains private and is served only through expiring signed URLs.';
comment on table public.flowtel_guest_house_events is
  'Append-only privacy and delivery history for Guest House requests and replay access.';
