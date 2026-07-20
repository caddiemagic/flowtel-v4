-- Flowtel v0.10.65 — Flow FM Lounge Video Uploader
--
-- Moves large Lounge workshop videos out of GitHub and into private Supabase
-- Storage. The owner uploads through Concierge; recognized Flow FM/Council
-- members receive short-lived signed playback URLs inside the Lounge.
--
-- Migration 037 remains retired and must never be rerun.

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'flowtel-lounge-videos',
  'flowtel-lounge-videos',
  false,
  2147483648,
  array[
    'video/mp4','video/quicktime','video/x-m4v','video/webm','application/octet-stream'
  ]
)
on conflict (id) do update
set public=false,
    file_size_limit=excluded.file_size_limit,
    allowed_mime_types=excluded.allowed_mime_types;

create table if not exists public.flowtel_lounge_videos (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  storage_path text not null unique,
  original_filename text not null,
  title text not null,
  description text,
  mime_type text,
  size_bytes bigint not null,
  is_active boolean not null default true,
  activated_at timestamptz not null default now(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  constraint flowtel_lounge_video_filename_check check (char_length(trim(original_filename)) between 1 and 500),
  constraint flowtel_lounge_video_title_check check (char_length(trim(title)) between 1 and 240),
  constraint flowtel_lounge_video_description_check check (description is null or char_length(description) <= 1200),
  constraint flowtel_lounge_video_size_check check (size_bytes > 0 and size_bytes <= 2147483648)
);

create unique index if not exists flowtel_lounge_videos_one_active_idx
  on public.flowtel_lounge_videos ((is_active)) where is_active=true;
create index if not exists flowtel_lounge_videos_created_idx
  on public.flowtel_lounge_videos (created_at desc);

alter table public.flowtel_lounge_videos enable row level security;
revoke all on public.flowtel_lounge_videos from anon,authenticated;

create or replace function public.flowtel_lounge_video_current_user_is_eligible()
returns boolean
language sql
stable
security definer
set search_path=public,auth
as $$
  select auth.uid() is not null
    and public.flowtel_current_user_has_product_access('flowtel')
    and exists (
      select 1
      from public.profiles p
      where p.id=auth.uid()
        and public.flow_fm_effective_membership_rank(
          p.id,p.membership_type,p.membership_rank,p.role,p.flowfm_started_at,p.is_initiated
        ) >= 2
    );
$$;

revoke all on function public.flowtel_lounge_video_current_user_is_eligible() from public;
grant execute on function public.flowtel_lounge_video_current_user_is_eligible() to authenticated;

-- The owner may upload, inspect, and remove unfinished private objects.
drop policy if exists "Flowtel owner uploads Lounge videos" on storage.objects;
create policy "Flowtel owner uploads Lounge videos"
on storage.objects for insert to authenticated
with check (
  bucket_id='flowtel-lounge-videos'
  and public.flowtel_current_user_is_concierge()
);

drop policy if exists "Flowtel owner updates Lounge videos" on storage.objects;
create policy "Flowtel owner updates Lounge videos"
on storage.objects for update to authenticated
using (
  bucket_id='flowtel-lounge-videos'
  and public.flowtel_current_user_is_concierge()
)
with check (
  bucket_id='flowtel-lounge-videos'
  and public.flowtel_current_user_is_concierge()
);

drop policy if exists "Flowtel owner removes Lounge videos" on storage.objects;
create policy "Flowtel owner removes Lounge videos"
on storage.objects for delete to authenticated
using (
  bucket_id='flowtel-lounge-videos'
  and public.flowtel_current_user_is_concierge()
);

-- Flow FM/Council members may request signed URLs for private playback. The
-- object itself never becomes public.
drop policy if exists "Flow FM members read Lounge videos" on storage.objects;
create policy "Flow FM members read Lounge videos"
on storage.objects for select to authenticated
using (
  bucket_id='flowtel-lounge-videos'
  and public.flowtel_lounge_video_current_user_is_eligible()
);

create or replace function public.flowtel_admin_register_lounge_video(
  p_storage_path text,
  p_original_filename text,
  p_title text,
  p_description text default null,
  p_mime_type text default null,
  p_size_bytes bigint default null
)
returns uuid
language plpgsql
security definer
set search_path=public,storage,auth
as $$
declare
  v_user_id uuid:=auth.uid();
  v_video_id uuid;
begin
  if v_user_id is null then
    raise exception 'Enter through the owner Concierge Desk first.' using errcode='28000';
  end if;
  if not public.flowtel_current_user_is_concierge() then
    raise exception 'Only the Flowtel owner may place a Lounge transmission.' using errcode='42501';
  end if;
  if nullif(trim(coalesce(p_storage_path,'')),'') is null
     or nullif(trim(coalesce(p_original_filename,'')),'') is null
     or nullif(trim(coalesce(p_title,'')),'') is null then
    raise exception 'Storage path, filename, and title are required.' using errcode='22023';
  end if;
  if coalesce(p_size_bytes,0)<=0 or p_size_bytes>2147483648 then
    raise exception 'The Lounge video must be between 1 byte and 2 GB.' using errcode='22023';
  end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id='flowtel-lounge-videos' and o.name=p_storage_path
  ) then
    raise exception 'The private Lounge video has not reached Storage yet.' using errcode='P0002';
  end if;

  update public.flowtel_lounge_videos
  set is_active=false,archived_at=coalesce(archived_at,now())
  where is_active=true;

  insert into public.flowtel_lounge_videos(
    uploaded_by,storage_path,original_filename,title,description,mime_type,size_bytes,is_active,activated_at
  ) values (
    v_user_id,trim(p_storage_path),trim(p_original_filename),trim(p_title),
    nullif(trim(coalesce(p_description,'')),''),nullif(trim(coalesce(p_mime_type,'')),''),
    p_size_bytes,true,now()
  ) returning id into v_video_id;

  return v_video_id;
end;
$$;

revoke all on function public.flowtel_admin_register_lounge_video(text,text,text,text,text,bigint) from public;
grant execute on function public.flowtel_admin_register_lounge_video(text,text,text,text,text,bigint) to authenticated;

create or replace function public.flowtel_admin_archive_lounge_video(p_video_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public,auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Enter through the owner Concierge Desk first.' using errcode='28000';
  end if;
  if not public.flowtel_current_user_is_concierge() then
    raise exception 'Only the Flowtel owner may close a Lounge transmission.' using errcode='42501';
  end if;
  update public.flowtel_lounge_videos
  set is_active=false,archived_at=coalesce(archived_at,now())
  where id=p_video_id;
  if not found then raise exception 'This Lounge video could not be found.' using errcode='P0002'; end if;
  return p_video_id;
end;
$$;

revoke all on function public.flowtel_admin_archive_lounge_video(uuid) from public;
grant execute on function public.flowtel_admin_archive_lounge_video(uuid) to authenticated;

create or replace function public.flowtel_admin_list_lounge_videos()
returns table (
  video_id uuid,
  storage_path text,
  original_filename text,
  title text,
  description text,
  mime_type text,
  size_bytes bigint,
  is_active boolean,
  activated_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path=public,auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Enter through the owner Concierge Desk first.' using errcode='28000';
  end if;
  if not public.flowtel_current_user_is_concierge() then
    raise exception 'Only the Flowtel owner may view Lounge video administration.' using errcode='42501';
  end if;
  return query
  select v.id,v.storage_path,v.original_filename,v.title,v.description,v.mime_type,v.size_bytes,
    v.is_active,v.activated_at,v.archived_at,v.created_at
  from public.flowtel_lounge_videos v
  order by v.is_active desc,v.created_at desc;
end;
$$;

revoke all on function public.flowtel_admin_list_lounge_videos() from public;
grant execute on function public.flowtel_admin_list_lounge_videos() to authenticated;

create or replace function public.flowtel_get_active_lounge_video()
returns table (
  video_id uuid,
  storage_path text,
  original_filename text,
  title text,
  description text,
  mime_type text,
  size_bytes bigint,
  activated_at timestamptz
)
language plpgsql
stable
security definer
set search_path=public,auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Enter through Flowtel to open the Lounge transmission.' using errcode='28000';
  end if;
  if not public.flowtel_lounge_video_current_user_is_eligible() then
    raise exception 'This Lounge transmission is reserved for Flow FM members.' using errcode='42501';
  end if;
  return query
  select v.id,v.storage_path,v.original_filename,v.title,v.description,v.mime_type,v.size_bytes,v.activated_at
  from public.flowtel_lounge_videos v
  where v.is_active=true
  order by v.activated_at desc
  limit 1;
end;
$$;

revoke all on function public.flowtel_get_active_lounge_video() from public;
grant execute on function public.flowtel_get_active_lounge_video() to authenticated;

comment on table public.flowtel_lounge_videos is
  'Private Flow FM Lounge video metadata. Large media remains outside GitHub in the private flowtel-lounge-videos Storage bucket.';
