-- Flowtel v0.10.80.3 — Priestess Mailbox 1 GB Media + Inbox Clearance
--
-- Purpose:
-- 1. Raise the private Priestess Mailbox bucket boundary from 250 MB to 1 GB.
-- 2. Align every mailbox RPC with the safe media/document types already exposed
--    by the v0.10.80.2 browser experience.
-- 3. Preserve all existing threads, files, acknowledgments, RLS, and private paths.
-- 4. Keep received_at as the canonical owner-handled state so the UI may clear an
--    alert without downloading or deleting the file.
--
-- This migration is additive. It does not delete or rewrite mailbox history.

begin;

update storage.buckets
set public = false,
    file_size_limit = 1073741824,
    allowed_mime_types = array[
      'audio/mpeg','audio/mp3','audio/mpeg3','audio/x-mpeg-3','audio/wav','audio/x-wav','audio/wave','audio/vnd.wave',
      'audio/mp4','audio/m4a','audio/x-m4a','audio/aac','audio/x-aac','audio/ogg',
      'video/mp4','video/quicktime','video/x-m4v','video/webm',
      'image/jpeg','image/png','image/webp','image/gif',
      'application/pdf','text/plain','text/csv','application/zip','application/x-zip-compressed',
      'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/octet-stream'
    ]
where id = 'flowtel-priestess-mailbox';

create or replace function public.flowtel_mailbox_create_thread(
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
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_thread_id uuid := coalesce(p_thread_id,gen_random_uuid());
begin
  if v_user_id is null then
    raise exception 'You must be signed in to send a private file through the Priestess Mailbox.' using errcode = '28000';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = v_user_id
      and public.flow_fm_effective_membership_rank(
        p.id,p.membership_type,p.membership_rank,p.role,p.flowfm_started_at,p.is_initiated
      ) >= 2
  ) then
    raise exception 'The Priestess Mailbox is available to Flow FM and Council practitioners.' using errcode = '42501';
  end if;
  if split_part(coalesce(p_storage_path,''),'/',1) <> v_user_id::text
     or split_part(coalesce(p_storage_path,''),'/',2) <> v_thread_id::text
     or split_part(coalesce(p_storage_path,''),'/',3) <> 'to-admin' then
    raise exception 'The mailbox file path is not valid for this Priestess.' using errcode = '42501';
  end if;
  if coalesce(trim(p_original_filename),'') = '' then
    raise exception 'The private file needs a name.' using errcode = '22023';
  end if;
  if lower(p_original_filename) !~ '\.(pdf|txt|csv|zip|doc|docx|xls|xlsx|ppt|pptx|jpg|jpeg|png|webp|gif|mp3|wav|m4a|aac|ogg|mp4|mov|m4v|webm)$' then
    raise exception 'Choose a supported video, audio, image, PDF, document, spreadsheet, presentation, or ZIP file.' using errcode = '22023';
  end if;
  if coalesce(p_size_bytes,0) <= 0 or p_size_bytes > 1073741824 then
    raise exception 'Choose a private file between 1 byte and 1 GB.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'flowtel-priestess-mailbox'
      and o.name = p_storage_path
  ) then
    raise exception 'The uploaded Priestess file could not be verified.' using errcode = 'P0002';
  end if;

  insert into public.flowtel_priestess_mailbox_threads (
    id,practitioner_id,subject,message,status,created_at,updated_at,last_activity_at
  ) values (
    v_thread_id,v_user_id,coalesce(nullif(trim(p_subject),''),'Private file for Megan'),
    nullif(trim(coalesce(p_message,'')),''),'awaiting_concierge',now(),now(),now()
  );

  insert into public.flowtel_priestess_mailbox_files (
    thread_id,sender_id,direction,storage_path,original_filename,mime_type,size_bytes,note
  ) values (
    v_thread_id,v_user_id,'to_admin',p_storage_path,p_original_filename,
    nullif(trim(coalesce(p_mime_type,'')),''),greatest(coalesce(p_size_bytes,0),0),
    nullif(trim(coalesce(p_file_note,'')),'')
  );

  return v_thread_id;
end;
$$;

revoke all on function public.flowtel_mailbox_create_thread(uuid,text,text,text,text,text,bigint,text) from public;
grant execute on function public.flowtel_mailbox_create_thread(uuid,text,text,text,text,text,bigint,text) to authenticated;

create or replace function public.flowtel_mailbox_admin_add_return_file(
  p_thread_id uuid,
  p_storage_path text,
  p_original_filename text,
  p_mime_type text,
  p_size_bytes bigint,
  p_file_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_practitioner_id uuid;
  v_file_id uuid;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to return a Priestess file.' using errcode = '28000';
  end if;
  if not public.flowtel_current_user_is_concierge() then
    raise exception 'Only the Flowtel owner can return Priestess files.' using errcode = '42501';
  end if;

  select practitioner_id into v_practitioner_id
  from public.flowtel_priestess_mailbox_threads
  where id = p_thread_id
  for update;

  if v_practitioner_id is null then
    raise exception 'This Priestess Mailbox thread could not be found.' using errcode = 'P0002';
  end if;
  if split_part(coalesce(p_storage_path,''),'/',1) <> v_practitioner_id::text
     or split_part(coalesce(p_storage_path,''),'/',2) <> p_thread_id::text
     or split_part(coalesce(p_storage_path,''),'/',3) <> 'to-practitioner' then
    raise exception 'The returned-file path does not match this Priestess Mailbox thread.' using errcode = '42501';
  end if;
  if coalesce(trim(p_original_filename),'') = ''
     or lower(p_original_filename) !~ '\.(pdf|txt|csv|zip|doc|docx|xls|xlsx|ppt|pptx|jpg|jpeg|png|webp|gif|mp3|wav|m4a|aac|ogg|mp4|mov|m4v|webm)$' then
    raise exception 'Choose a supported video, audio, image, PDF, document, spreadsheet, presentation, or ZIP file.' using errcode = '22023';
  end if;
  if coalesce(p_size_bytes,0) <= 0 or p_size_bytes > 1073741824 then
    raise exception 'Choose a private file between 1 byte and 1 GB.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'flowtel-priestess-mailbox'
      and o.name = p_storage_path
  ) then
    raise exception 'The returned Priestess file could not be verified.' using errcode = 'P0002';
  end if;

  insert into public.flowtel_priestess_mailbox_files (
    thread_id,sender_id,direction,storage_path,original_filename,mime_type,size_bytes,note
  ) values (
    p_thread_id,v_user_id,'to_practitioner',p_storage_path,p_original_filename,
    nullif(trim(coalesce(p_mime_type,'')),''),greatest(coalesce(p_size_bytes,0),0),
    nullif(trim(coalesce(p_file_note,'')),'')
  ) returning id into v_file_id;

  update public.flowtel_priestess_mailbox_threads
  set status = 'returned_to_priestess',updated_at = now(),last_activity_at = now()
  where id = p_thread_id;

  return v_file_id;
end;
$$;

revoke all on function public.flowtel_mailbox_admin_add_return_file(uuid,text,text,text,bigint,text) from public;
grant execute on function public.flowtel_mailbox_admin_add_return_file(uuid,text,text,text,bigint,text) to authenticated;

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
set search_path = public
as $$
declare
  v_sender uuid := auth.uid();
  v_thread uuid := coalesce(p_thread_id,gen_random_uuid());
  v_file uuid;
begin
  if v_sender is null then
    raise exception 'You must be signed in to send a private file.' using errcode = '28000';
  end if;
  if not public.flowtel_current_user_is_concierge() then
    raise exception 'Only the Flowtel owner can send private files.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = p_recipient_id
      and public.flow_fm_effective_membership_rank(
        p.id,p.membership_type,p.membership_rank,p.role,p.flowfm_started_at,p.is_initiated
      ) >= 2
  ) then
    raise exception 'Choose a Flow FM or Council Priestess.' using errcode = '42501';
  end if;
  if split_part(coalesce(p_storage_path,''),'/',1) <> p_recipient_id::text
     or split_part(coalesce(p_storage_path,''),'/',2) <> v_thread::text
     or split_part(coalesce(p_storage_path,''),'/',3) <> 'to-practitioner' then
    raise exception 'This private file path does not match the chosen Priestess.' using errcode = '42501';
  end if;
  if coalesce(trim(p_original_filename),'') = '' then
    raise exception 'Choose a file with a name.' using errcode = '22023';
  end if;
  if lower(p_original_filename) !~ '\.(pdf|txt|csv|zip|doc|docx|xls|xlsx|ppt|pptx|jpg|jpeg|png|webp|gif|mp3|wav|m4a|aac|ogg|mp4|mov|m4v|webm)$' then
    raise exception 'Choose a supported video, audio, image, PDF, document, spreadsheet, presentation, or ZIP file.' using errcode = '22023';
  end if;
  if coalesce(p_size_bytes,0) <= 0 or p_size_bytes > 1073741824 then
    raise exception 'Choose a private file between 1 byte and 1 GB.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'flowtel-priestess-mailbox'
      and o.name = p_storage_path
  ) then
    raise exception 'The private upload could not be verified.' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.flowtel_priestess_mailbox_threads t where t.id = v_thread
  ) then
    insert into public.flowtel_priestess_mailbox_threads(
      id,practitioner_id,subject,message,status,created_at,updated_at,last_activity_at
    ) values (
      v_thread,p_recipient_id,coalesce(nullif(trim(p_subject),''),'A file from the Flowtel'),
      nullif(trim(coalesce(p_message,'')),''),'returned_to_priestess',now(),now(),now()
    );
  elsif not exists (
    select 1 from public.flowtel_priestess_mailbox_threads t
    where t.id = v_thread and t.practitioner_id = p_recipient_id
  ) then
    raise exception 'This Priestess Mailbox thread does not match the recipient.' using errcode = '42501';
  end if;

  insert into public.flowtel_priestess_mailbox_files(
    thread_id,sender_id,direction,storage_path,original_filename,mime_type,size_bytes,note
  ) values (
    v_thread,v_sender,'to_practitioner',p_storage_path,p_original_filename,
    nullif(trim(coalesce(p_mime_type,'')),''),p_size_bytes,
    nullif(trim(coalesce(p_file_note,'')),'')
  ) returning id into v_file;

  update public.flowtel_priestess_mailbox_threads
  set status = 'returned_to_priestess',updated_at = now(),last_activity_at = now()
  where id = v_thread;

  return v_file;
end;
$$;

revoke all on function public.flowtel_mailbox_admin_send_file(uuid,uuid,text,text,text,text,text,bigint,text) from public;
grant execute on function public.flowtel_mailbox_admin_send_file(uuid,uuid,text,text,text,text,text,bigint,text) to authenticated;

comment on function public.flowtel_mailbox_create_thread(uuid,text,text,text,text,text,bigint,text) is
  'Creates a private member-to-owner Priestess Mailbox thread for an approved safe file up to 1 GB.';
comment on function public.flowtel_mailbox_admin_add_return_file(uuid,text,text,text,bigint,text) is
  'Adds an owner-to-Priestess private return file to an existing thread, up to 1 GB.';
comment on function public.flowtel_mailbox_admin_send_file(uuid,uuid,text,text,text,text,text,bigint,text) is
  'Creates an owner-to-Priestess private delivery for an approved safe file up to 1 GB.';

commit;
