-- Flowtel v0.10.93 / Caddie Magic v0.7.1 — Public Call Your Caddie Recorder
--
-- Makes ONLY the Call Your Caddie recorder public. Mailbox reads, Show Queue,
-- Studio Mode, and private audio remain owner-only. Public callers receive a
-- short-lived signed upload token for one private object path; they never gain
-- list/read access to the bucket or any Flowtel/Caddie Magic account data.
--
-- Migration 080 remains historical. This is migration 081; migration 082 is next.

begin;

-- Public callers do not have an auth user or Caddie Magic Player Profile.
alter table public.caddie_magic_mailbox_messages
  alter column submitted_by_user_id drop not null,
  alter column player_profile_id drop not null;

alter table public.caddie_magic_mailbox_messages
  drop constraint if exists caddie_magic_mailbox_source_check;

alter table public.caddie_magic_mailbox_messages
  add constraint caddie_magic_mailbox_source_check
  check (source_type in (
    'browser_voice_note',
    'public_browser_voice_note',
    'twilio_mailbox',
    'live_call',
    'private_call'
  ));

comment on column public.caddie_magic_mailbox_messages.submitted_by_user_id is
  'Authenticated submitter when available. Null for the public Call Your Caddie recorder.';
comment on column public.caddie_magic_mailbox_messages.player_profile_id is
  'Linked Caddie Magic Player Profile when available. Null for public recorder submissions.';

-- Server-only staging records authorize one signed upload path and provide a
-- privacy-preserving per-IP rate-limit key. Raw IP addresses are never stored.
create table if not exists public.caddie_magic_public_mailbox_uploads (
  message_id uuid primary key,
  ip_hash text not null,
  finalize_token_hash text not null unique,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null,
  recording_duration_seconds integer not null,
  created_at timestamptz not null default now(),
  finalized_at timestamptz,
  constraint caddie_magic_public_mailbox_ip_hash_check check (char_length(ip_hash) = 64),
  constraint caddie_magic_public_mailbox_finalize_hash_check check (finalize_token_hash ~ '^[a-f0-9]{64}$'),
  constraint caddie_magic_public_mailbox_size_check check (size_bytes between 1 and 15728640),
  constraint caddie_magic_public_mailbox_duration_check check (recording_duration_seconds between 1 and 300)
);

create index if not exists caddie_magic_public_mailbox_ip_created_idx
  on public.caddie_magic_public_mailbox_uploads (ip_hash, created_at desc);

alter table public.caddie_magic_public_mailbox_uploads enable row level security;
revoke all on public.caddie_magic_public_mailbox_uploads from anon, authenticated;

comment on table public.caddie_magic_public_mailbox_uploads is
  'Server-only public Call Your Caddie upload staging and rate-limit ledger. Stores an HMAC hash of the caller IP, never the raw IP.';

create or replace function public.caddie_magic_begin_public_mailbox_upload(
  p_message_id uuid,
  p_ip_hash text,
  p_finalize_token_hash text,
  p_storage_path text,
  p_mime_type text,
  p_size_bytes bigint,
  p_recording_duration_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent integer;
  v_mime text := lower(split_part(trim(coalesce(p_mime_type,'')),';',1));
begin
  if p_message_id is null then
    raise exception 'The mailbox message identifier is missing.' using errcode = '22023';
  end if;
  if coalesce(p_ip_hash,'') !~ '^[a-f0-9]{64}$' then
    raise exception 'The public mailbox request could not be verified.' using errcode = '22023';
  end if;
  if coalesce(p_finalize_token_hash,'') !~ '^[a-f0-9]{64}$' then
    raise exception 'The public mailbox finalize token is invalid.' using errcode = '22023';
  end if;
  if coalesce(p_storage_path,'') <> ('public/' || p_message_id::text || '/voice-note.' ||
    case v_mime
      when 'audio/webm' then 'webm'
      when 'audio/mp4' then 'm4a'
      when 'audio/ogg' then 'ogg'
      when 'audio/mpeg' then 'mp3'
      when 'audio/mp3' then 'mp3'
      when 'audio/wav' then 'wav'
      when 'audio/x-wav' then 'wav'
      when 'audio/aac' then 'aac'
      when 'audio/x-m4a' then 'm4a'
      when 'audio/m4a' then 'm4a'
      else 'invalid'
    end) then
    raise exception 'The public mailbox upload path is invalid.' using errcode = '22023';
  end if;
  if v_mime not in ('audio/webm','audio/mp4','audio/ogg','audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/aac','audio/x-m4a','audio/m4a') then
    raise exception 'This browser audio format is not supported by the Caddie Mailbox.' using errcode = '22023';
  end if;
  if coalesce(p_size_bytes,0) < 1 or p_size_bytes > 15728640 then
    raise exception 'That voice note is too large for the public Caddie line.' using errcode = '22023';
  end if;
  if coalesce(p_recording_duration_seconds,0) < 1 or p_recording_duration_seconds > 300 then
    raise exception 'Your Call Your Caddie message must be between 1 second and 5 minutes.' using errcode = '22023';
  end if;

  -- Serialize requests for the same privacy-preserving IP key before counting.
  perform pg_advisory_xact_lock(hashtext(p_ip_hash));
  select count(*) into v_recent
  from public.caddie_magic_public_mailbox_uploads
  where ip_hash = p_ip_hash
    and created_at >= now() - interval '1 hour';

  if v_recent >= 8 then
    raise exception 'That Caddie line has received several messages from this connection. Try again a little later.' using errcode = 'P0001';
  end if;

  insert into public.caddie_magic_public_mailbox_uploads (
    message_id,ip_hash,finalize_token_hash,storage_path,mime_type,size_bytes,recording_duration_seconds
  ) values (
    p_message_id,p_ip_hash,p_finalize_token_hash,p_storage_path,v_mime,p_size_bytes,p_recording_duration_seconds
  );

  return true;
end;
$$;
revoke all on function public.caddie_magic_begin_public_mailbox_upload(uuid,text,text,text,text,bigint,integer) from public, anon, authenticated;
grant execute on function public.caddie_magic_begin_public_mailbox_upload(uuid,text,text,text,text,bigint,integer) to service_role;

create or replace function public.caddie_magic_finalize_public_mailbox_message(
  p_message_id uuid,
  p_finalize_token_hash text,
  p_caller_name text,
  p_handicap text,
  p_consent_recording boolean,
  p_consent_publication boolean,
  p_anonymity_requested boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_upload public.caddie_magic_public_mailbox_uploads%rowtype;
  v_name text := trim(coalesce(p_caller_name,''));
  v_handicap text := trim(coalesce(p_handicap,''));
  v_object storage.objects%rowtype;
begin
  if coalesce(p_finalize_token_hash,'') !~ '^[a-f0-9]{64}$' then
    raise exception 'The public mailbox request could not be verified.' using errcode = '22023';
  end if;

  select * into v_upload
  from public.caddie_magic_public_mailbox_uploads
  where message_id = p_message_id
    and finalize_token_hash = p_finalize_token_hash
  for update;

  if v_upload.message_id is null then
    raise exception 'This public Caddie Mailbox upload was not authorized.' using errcode = '42501';
  end if;
  if v_upload.finalized_at is not null then
    raise exception 'That voice note has already been sent.' using errcode = '23505';
  end if;
  if v_upload.created_at < now() - interval '2 hours' then
    raise exception 'That upload window expired. Please record the message again.' using errcode = '42501';
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

  select * into v_object
  from storage.objects
  where bucket_id = 'caddie-mailbox-audio'
    and name = v_upload.storage_path;

  if v_object.id is null then
    raise exception 'The uploaded voice note could not be verified.' using errcode = 'P0002';
  end if;
  if coalesce((v_object.metadata->>'size')::bigint,0) <> v_upload.size_bytes then
    raise exception 'The uploaded voice note size did not match the authorized recording.' using errcode = '22023';
  end if;
  if lower(coalesce(v_object.metadata->>'mimetype','')) <> v_upload.mime_type then
    raise exception 'The uploaded voice note format did not match the authorized recording.' using errcode = '22023';
  end if;

  insert into public.caddie_magic_mailbox_messages (
    id,submitted_by_user_id,player_profile_id,caller_name,handicap,source_type,
    storage_path,mime_type,size_bytes,recording_duration_seconds,
    consent_recording,consent_publication,consent_method,consent_version,
    consented_at,anonymity_requested,status,received_at,created_at,updated_at
  ) values (
    p_message_id,null,null,v_name,v_handicap,'public_browser_voice_note',
    v_upload.storage_path,v_upload.mime_type,v_upload.size_bytes,v_upload.recording_duration_seconds,
    true,true,'public_browser_checkbox','caddie-mailbox-v3',
    now(),coalesce(p_anonymity_requested,false),'new',now(),now(),now()
  );

  update public.caddie_magic_public_mailbox_uploads
  set finalized_at = now()
  where message_id = p_message_id;

  return p_message_id;
end;
$$;
revoke all on function public.caddie_magic_finalize_public_mailbox_message(uuid,text,text,text,boolean,boolean,boolean) from public, anon, authenticated;
grant execute on function public.caddie_magic_finalize_public_mailbox_message(uuid,text,text,text,boolean,boolean,boolean) to service_role;

commit;
