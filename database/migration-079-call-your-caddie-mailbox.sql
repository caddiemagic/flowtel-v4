-- Flowtel v0.10.92 / Caddie Magic v0.7.0 — Call Your Caddie Mailbox
--
-- Phase 1 intentionally does NOT use Twilio. Authenticated Caddie Magic Players
-- record a browser voice note, preview it locally, explicitly consent to recording
-- and publication, then upload the final audio into a private Supabase Storage
-- bucket. The Caddie Master receives the message NEW + UNHEARD and can preserve
-- the first listen for an OBS-recorded reaction.
--
-- Migration 078 remains historical. This is migration 079; migration 080 is next.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'caddie-mailbox-audio',
  'caddie-mailbox-audio',
  false,
  52428800,
  array[
    'audio/webm','audio/mp4','audio/ogg','audio/mpeg','audio/mp3',
    'audio/wav','audio/x-wav','audio/aac','audio/x-m4a','audio/m4a'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.caddie_magic_mailbox_messages (
  id uuid primary key default gen_random_uuid(),
  submitted_by_user_id uuid not null references auth.users(id) on delete restrict,
  player_profile_id uuid not null references public.caddie_magic_player_profiles(id) on delete restrict,
  caller_name text not null,
  handicap text not null,
  source_type text not null default 'browser_voice_note',
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null,
  recording_duration_seconds integer not null,
  consent_recording boolean not null default false,
  consent_publication boolean not null default false,
  consent_method text not null default 'browser_checkbox',
  consent_version text not null default 'caddie-mailbox-v1',
  consented_at timestamptz not null,
  status text not null default 'new',
  first_listened_at timestamptz,
  selected_at timestamptz,
  used_at timestamptz,
  archived_at timestamptz,
  admin_notes text,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint caddie_magic_mailbox_name_check check (char_length(trim(caller_name)) between 1 and 60),
  constraint caddie_magic_mailbox_handicap_check check (char_length(trim(handicap)) between 1 and 24),
  constraint caddie_magic_mailbox_source_check check (source_type in ('browser_voice_note','twilio_mailbox','live_call','private_call')),
  constraint caddie_magic_mailbox_size_check check (size_bytes between 1 and 52428800),
  constraint caddie_magic_mailbox_duration_check check (recording_duration_seconds between 1 and 300),
  constraint caddie_magic_mailbox_status_check check (status in ('new','listened','selected','used','archived')),
  constraint caddie_magic_mailbox_consent_check check (consent_recording and consent_publication)
);

comment on table public.caddie_magic_mailbox_messages is
  'Private Call Your Caddie voice notes. Phase 1 uses browser recordings; future source_type values reserve Twilio/live/private call ingestion without coupling launch to a phone provider.';
comment on column public.caddie_magic_mailbox_messages.first_listened_at is
  'Canonical Caddie Master first-listen timestamp. Uploading or downloading media never sets this; the owner client marks it only when playback actually begins.';
comment on column public.caddie_magic_mailbox_messages.consent_version is
  'Version of the explicit recording + public-media consent displayed before submission.';

create index if not exists caddie_magic_mailbox_status_received_idx
  on public.caddie_magic_mailbox_messages (status, received_at desc);
create index if not exists caddie_magic_mailbox_unheard_idx
  on public.caddie_magic_mailbox_messages (first_listened_at, received_at desc)
  where first_listened_at is null;
create index if not exists caddie_magic_mailbox_player_idx
  on public.caddie_magic_mailbox_messages (player_profile_id, received_at desc);

alter table public.caddie_magic_mailbox_messages enable row level security;
revoke insert, update, delete on public.caddie_magic_mailbox_messages from anon, authenticated;
grant select on public.caddie_magic_mailbox_messages to authenticated;

drop policy if exists "Caddie Master reads Call Your Caddie mailbox" on public.caddie_magic_mailbox_messages;
create policy "Caddie Master reads Call Your Caddie mailbox"
  on public.caddie_magic_mailbox_messages for select
  to authenticated
  using (public.flowtel_current_user_is_concierge());

-- Private audio path contract:
--   authenticated_user_uuid / message_uuid / voice-note.ext
-- Players may upload only to their own first-level folder. They may clean up a
-- failed upload only before an accepted mailbox row references that object.
-- Submitted audio is read only by the Caddie Master.

drop policy if exists "Caddie Magic Players upload mailbox audio" on storage.objects;
create policy "Caddie Magic Players upload mailbox audio"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'caddie-mailbox-audio'
    and public.flowtel_current_user_has_product_access('caddie_magic')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Caddie Master reads mailbox audio" on storage.objects;
create policy "Caddie Master reads mailbox audio"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'caddie-mailbox-audio'
    and public.flowtel_current_user_is_concierge()
  );

create or replace function public.caddie_magic_mailbox_storage_is_unclaimed(p_storage_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.caddie_magic_mailbox_messages m
    where m.storage_path = p_storage_path
  );
$$;
revoke all on function public.caddie_magic_mailbox_storage_is_unclaimed(text) from public;
grant execute on function public.caddie_magic_mailbox_storage_is_unclaimed(text) to authenticated;

drop policy if exists "Players remove failed mailbox uploads" on storage.objects;
create policy "Players remove failed mailbox uploads"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'caddie-mailbox-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.caddie_magic_mailbox_storage_is_unclaimed(name)
  );

drop policy if exists "Caddie Master removes mailbox audio" on storage.objects;
create policy "Caddie Master removes mailbox audio"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'caddie-mailbox-audio'
    and public.flowtel_current_user_is_concierge()
  );

create or replace function public.caddie_magic_submit_mailbox_message(
  p_message_id uuid,
  p_caller_name text,
  p_handicap text,
  p_storage_path text,
  p_mime_type text,
  p_size_bytes bigint,
  p_recording_duration_seconds integer,
  p_consent_recording boolean,
  p_consent_publication boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, storage, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_player_profile_id uuid;
  v_name text := trim(coalesce(p_caller_name,''));
  v_handicap text := trim(coalesce(p_handicap,''));
  v_mime text := lower(split_part(trim(coalesce(p_mime_type,'')),';',1));
begin
  if v_user_id is null then
    raise exception 'Sign in to leave a message for your Caddie.' using errcode = '28000';
  end if;
  if not public.flowtel_current_user_has_product_access('caddie_magic') then
    raise exception 'Your Caddie Magic Player key is required to use the Caddie Mailbox.' using errcode = '42501';
  end if;

  select id into v_player_profile_id
  from public.caddie_magic_player_profiles
  where user_id = v_user_id;

  if v_player_profile_id is null then
    raise exception 'Complete your Caddie Magic Player Profile before leaving a message.' using errcode = '42501';
  end if;
  if p_message_id is null then
    raise exception 'The mailbox message identifier is missing.' using errcode = '22023';
  end if;
  if char_length(v_name) not between 1 and 60 then
    raise exception 'Enter your first name before sending the voice note.' using errcode = '22023';
  end if;
  if char_length(v_handicap) not between 1 and 24 then
    raise exception 'Enter your current handicap before sending the voice note.' using errcode = '22023';
  end if;
  if p_consent_recording is distinct from true or p_consent_publication is distinct from true then
    raise exception 'Recording and publication consent are required before a voice note can be sent.' using errcode = '42501';
  end if;
  if coalesce(p_recording_duration_seconds,0) < 1 or p_recording_duration_seconds > 300 then
    raise exception 'Your Call Your Caddie message must be between 1 second and 5 minutes.' using errcode = '22023';
  end if;
  if coalesce(p_size_bytes,0) < 1 or p_size_bytes > 52428800 then
    raise exception 'The voice note is outside the supported upload size.' using errcode = '22023';
  end if;
  if v_mime not in ('audio/webm','audio/mp4','audio/ogg','audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/aac','audio/x-m4a','audio/m4a') then
    raise exception 'This browser audio format is not supported by the Caddie Mailbox.' using errcode = '22023';
  end if;
  if split_part(coalesce(p_storage_path,''),'/',1) <> v_user_id::text
     or split_part(coalesce(p_storage_path,''),'/',2) <> p_message_id::text then
    raise exception 'The mailbox audio path is not valid for this Player.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'caddie-mailbox-audio'
      and o.name = p_storage_path
  ) then
    raise exception 'The uploaded voice note could not be verified.' using errcode = 'P0002';
  end if;

  insert into public.caddie_magic_mailbox_messages (
    id,submitted_by_user_id,player_profile_id,caller_name,handicap,source_type,
    storage_path,mime_type,size_bytes,recording_duration_seconds,
    consent_recording,consent_publication,consent_method,consent_version,
    consented_at,status,received_at,created_at,updated_at
  ) values (
    p_message_id,v_user_id,v_player_profile_id,v_name,v_handicap,'browser_voice_note',
    p_storage_path,v_mime,p_size_bytes,p_recording_duration_seconds,
    true,true,'browser_checkbox','caddie-mailbox-v1',
    now(),'new',now(),now(),now()
  );

  return p_message_id;
end;
$$;
revoke all on function public.caddie_magic_submit_mailbox_message(uuid,text,text,text,text,bigint,integer,boolean,boolean) from public;
grant execute on function public.caddie_magic_submit_mailbox_message(uuid,text,text,text,text,bigint,integer,boolean,boolean) to authenticated;

create or replace function public.caddie_magic_mailbox_admin_list(p_status text default null)
returns table (
  message_id uuid,
  caller_name text,
  handicap text,
  source_type text,
  storage_path text,
  mime_type text,
  size_bytes bigint,
  recording_duration_seconds integer,
  consent_recording boolean,
  consent_publication boolean,
  consent_method text,
  consent_version text,
  consented_at timestamptz,
  status text,
  first_listened_at timestamptz,
  selected_at timestamptz,
  used_at timestamptz,
  archived_at timestamptz,
  admin_notes text,
  received_at timestamptz,
  player_profile_id uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to open the Caddie Mailbox.' using errcode = '28000';
  end if;
  if not public.flowtel_current_user_is_concierge() then
    raise exception 'Only The Caddie Master can open the Caddie Mailbox.' using errcode = '42501';
  end if;
  if p_status is not null and lower(trim(p_status)) not in ('new','listened','selected','used','archived') then
    raise exception 'Unknown Caddie Mailbox status.' using errcode = '22023';
  end if;

  return query
  select
    m.id,m.caller_name,m.handicap,m.source_type,m.storage_path,m.mime_type,m.size_bytes,
    m.recording_duration_seconds,m.consent_recording,m.consent_publication,m.consent_method,
    m.consent_version,m.consented_at,m.status,m.first_listened_at,m.selected_at,m.used_at,
    m.archived_at,m.admin_notes,m.received_at,m.player_profile_id
  from public.caddie_magic_mailbox_messages m
  where p_status is null or m.status = lower(trim(p_status))
  order by m.received_at desc,m.id;
end;
$$;
revoke all on function public.caddie_magic_mailbox_admin_list(text) from public;
grant execute on function public.caddie_magic_mailbox_admin_list(text) to authenticated;

create or replace function public.caddie_magic_mailbox_mark_listened(p_message_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to update the Caddie Mailbox.' using errcode = '28000';
  end if;
  if not public.flowtel_current_user_is_concierge() then
    raise exception 'Only The Caddie Master can update the Caddie Mailbox.' using errcode = '42501';
  end if;

  update public.caddie_magic_mailbox_messages
  set first_listened_at = coalesce(first_listened_at,now()),
      status = case when status = 'new' then 'listened' else status end,
      updated_at = now()
  where id = p_message_id;

  if not found then
    raise exception 'Caddie Mailbox message not found.' using errcode = 'P0002';
  end if;
  return true;
end;
$$;
revoke all on function public.caddie_magic_mailbox_mark_listened(uuid) from public;
grant execute on function public.caddie_magic_mailbox_mark_listened(uuid) to authenticated;

create or replace function public.caddie_magic_mailbox_admin_update(
  p_message_id uuid,
  p_status text,
  p_caller_name text,
  p_admin_notes text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text := lower(trim(coalesce(p_status,'')));
  v_name text := trim(coalesce(p_caller_name,''));
begin
  if auth.uid() is null then
    raise exception 'Sign in to update the Caddie Mailbox.' using errcode = '28000';
  end if;
  if not public.flowtel_current_user_is_concierge() then
    raise exception 'Only The Caddie Master can update the Caddie Mailbox.' using errcode = '42501';
  end if;
  if v_status not in ('new','listened','selected','used','archived') then
    raise exception 'Choose a valid Caddie Mailbox state.' using errcode = '22023';
  end if;
  if char_length(v_name) not between 1 and 60 then
    raise exception 'Caller name must be between 1 and 60 characters.' using errcode = '22023';
  end if;
  if char_length(coalesce(p_admin_notes,'')) > 5000 then
    raise exception 'Caddie Mailbox notes are limited to 5,000 characters.' using errcode = '22023';
  end if;

  update public.caddie_magic_mailbox_messages
  set caller_name = v_name,
      admin_notes = nullif(trim(coalesce(p_admin_notes,'')),''),
      status = v_status,
      selected_at = case when v_status = 'selected' then coalesce(selected_at,now()) else selected_at end,
      used_at = case when v_status = 'used' then coalesce(used_at,now()) else used_at end,
      archived_at = case when v_status = 'archived' then coalesce(archived_at,now()) else archived_at end,
      updated_at = now()
  where id = p_message_id;

  if not found then
    raise exception 'Caddie Mailbox message not found.' using errcode = 'P0002';
  end if;
  return true;
end;
$$;
revoke all on function public.caddie_magic_mailbox_admin_update(uuid,text,text,text) from public;
grant execute on function public.caddie_magic_mailbox_admin_update(uuid,text,text,text) to authenticated;

-- Keep updated_at coherent with the existing Caddie Magic trigger helper.
drop trigger if exists caddie_magic_mailbox_messages_set_updated_at on public.caddie_magic_mailbox_messages;
create trigger caddie_magic_mailbox_messages_set_updated_at
before update on public.caddie_magic_mailbox_messages
for each row execute function public.caddie_magic_set_updated_at();

commit;
