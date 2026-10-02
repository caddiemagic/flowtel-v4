-- Flowtel v0.10.92.1 — Call Your Caddie form + anonymity polish
--
-- Adds an optional caller anonymity request without hiding the caller's private
-- identity from The Caddie Master. Public-facing Studio Mode must display
-- ANONYMOUS whenever the request is true.
--
-- Migration 079 remains historical. This is migration 080; migration 081 is next.

begin;

alter table public.caddie_magic_mailbox_messages
  add column if not exists anonymity_requested boolean not null default false;

comment on column public.caddie_magic_mailbox_messages.anonymity_requested is
  'Caller request that their name not be used in the podcast/public Call Your Caddie media. Private Caddie Master views may retain the submitted name.';

-- New submission signature for the v2 combined-consent UI. The migration-079
-- nine-argument overload is intentionally preserved during rollout so a stale
-- browser can still complete an already-started v1 submission.
create or replace function public.caddie_magic_submit_mailbox_message(
  p_message_id uuid,
  p_caller_name text,
  p_handicap text,
  p_storage_path text,
  p_mime_type text,
  p_size_bytes bigint,
  p_recording_duration_seconds integer,
  p_consent_recording boolean,
  p_consent_publication boolean,
  p_anonymity_requested boolean
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
    raise exception 'Recording and media-use consent are required before a voice note can be sent.' using errcode = '42501';
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
    consented_at,anonymity_requested,status,received_at,created_at,updated_at
  ) values (
    p_message_id,v_user_id,v_player_profile_id,v_name,v_handicap,'browser_voice_note',
    p_storage_path,v_mime,p_size_bytes,p_recording_duration_seconds,
    true,true,'browser_checkbox','caddie-mailbox-v2',
    now(),coalesce(p_anonymity_requested,false),'new',now(),now(),now()
  );

  return p_message_id;
end;
$$;
revoke all on function public.caddie_magic_submit_mailbox_message(uuid,text,text,text,text,bigint,integer,boolean,boolean,boolean) from public;
grant execute on function public.caddie_magic_submit_mailbox_message(uuid,text,text,text,text,bigint,integer,boolean,boolean,boolean) to authenticated;

-- Return the privacy request to owner surfaces. PostgreSQL requires dropping the
-- existing table-returning function before changing its row shape.
drop function if exists public.caddie_magic_mailbox_admin_list(text);
create function public.caddie_magic_mailbox_admin_list(p_status text default null)
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
  anonymity_requested boolean,
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
    m.consent_version,m.consented_at,m.anonymity_requested,m.status,m.first_listened_at,m.selected_at,m.used_at,
    m.archived_at,m.admin_notes,m.received_at,m.player_profile_id
  from public.caddie_magic_mailbox_messages m
  where p_status is null or m.status = lower(trim(p_status))
  order by m.received_at desc,m.id;
end;
$$;
revoke all on function public.caddie_magic_mailbox_admin_list(text) from public;
grant execute on function public.caddie_magic_mailbox_admin_list(text) to authenticated;

commit;
