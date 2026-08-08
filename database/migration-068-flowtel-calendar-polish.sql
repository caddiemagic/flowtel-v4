-- Flowtel v0.10.83.1 — Flowtel Calendar polish + event-host linking
--
-- Requires migration 067 first.
-- 1. Repairs/ensures the Queendom event image bucket and refreshes PostgREST schema cache.
-- 2. Links community events to a Flow FM host member instead of a free-text host field.
-- 3. Returns host_member_id to authenticated event feeds/admin views.
-- 4. Adds an owner/admin host-directory RPC for the event editor.

begin;

do $$
begin
  if to_regclass('public.flowtel_queendom_events') is null then
    raise exception 'Flowtel migration 067 must be installed before migration 068.';
  end if;
end;
$$;

-- Make the event-artwork bucket idempotently available. This also repairs live
-- environments where the v0.10.83 UI deployed before migration 067 completed.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'flowtel-queendom-event-images',
  'flowtel-queendom-event-images',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public=true,
    file_size_limit=excluded.file_size_limit,
    allowed_mime_types=excluded.allowed_mime_types;

-- Re-assert owner/admin artwork policies in case the storage portion of 067
-- was the piece that did not reach the live project.
drop policy if exists "Flowtel owner uploads Queendom event images" on storage.objects;
create policy "Flowtel owner uploads Queendom event images"
on storage.objects for insert to authenticated
with check (
  bucket_id='flowtel-queendom-event-images'
  and public.flowtel_current_user_is_admin_or_owner()
);

drop policy if exists "Flowtel owner updates Queendom event images" on storage.objects;
create policy "Flowtel owner updates Queendom event images"
on storage.objects for update to authenticated
using (
  bucket_id='flowtel-queendom-event-images'
  and public.flowtel_current_user_is_admin_or_owner()
)
with check (
  bucket_id='flowtel-queendom-event-images'
  and public.flowtel_current_user_is_admin_or_owner()
);

drop policy if exists "Flowtel owner removes Queendom event images" on storage.objects;
create policy "Flowtel owner removes Queendom event images"
on storage.objects for delete to authenticated
using (
  bucket_id='flowtel-queendom-event-images'
  and public.flowtel_current_user_is_admin_or_owner()
);

alter table public.flowtel_queendom_events
  add column if not exists host_member_id uuid references public.profiles(id) on delete set null;

create index if not exists flowtel_queendom_events_host_member_idx
  on public.flowtel_queendom_events(host_member_id,event_date);

comment on column public.flowtel_queendom_events.host_member_id is
  'Optional Flow FM/Council member hosting the event. Host name remains a snapshot for history; the member id links to her current Priestess profile.';

-- Owner/admin dropdown source. The dropdown contains members with effective
-- Flow FM/Council rank and uses the Priestess name first when one exists.
create or replace function public.flowtel_admin_list_queendom_event_hosts()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  v_result jsonb;
begin
  if not public.flowtel_current_user_is_admin_or_owner() then
    raise exception 'Only Flowtel administration may choose Queendom event hosts.' using errcode='42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'member_id',p.id,
    'display_name',coalesce(
      nullif(trim(pp.priestess_name),''),
      nullif(trim(p.display_name),''),
      nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),
      p.email,
      'Flow FM Priestess'
    ),
    'profile_photo_url',coalesce(nullif(trim(pp.profile_photo_url),''),nullif(trim(p.mentor_photo_url),'')),
    'profile_status',coalesce(pp.status,'draft'),
    'membership_type',p.membership_type
  ) order by lower(coalesce(nullif(trim(pp.priestess_name),''),nullif(trim(p.display_name),''),nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),p.email))), '[]'::jsonb)
  into v_result
  from public.profiles p
  left join public.flow_fm_priestess_profiles pp on pp.member_id=p.id
  where public.flow_fm_effective_membership_rank(
    p.id,p.membership_type,p.membership_rank,p.role,p.flowfm_started_at,p.is_initiated
  ) >= 2;

  return v_result;
end;
$$;

revoke all on function public.flowtel_admin_list_queendom_event_hosts() from public;
grant execute on function public.flowtel_admin_list_queendom_event_hosts() to authenticated;

-- Member feed: preserve permissions and add only the host member id. Protected
-- Zoom credentials remain excluded.
create or replace function public.flowtel_list_queendom_events(
  p_month_start date default null,
  p_month_count integer default 6
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  v_member uuid := auth.uid();
  v_rank integer;
  v_start date;
  v_count integer := greatest(1,least(coalesce(p_month_count,6),18));
  v_end date;
  v_result jsonb;
begin
  if v_member is null or not public.flowtel_current_user_has_product_access('flowtel') then
    raise exception 'Enter the Flowtel to open the Queendom calendar.' using errcode='42501';
  end if;
  v_rank := public.flowtel_queendom_event_member_rank(v_member);
  if v_rank<1 then
    raise exception 'A Queendom membership is required to open this calendar.' using errcode='42501';
  end if;

  v_start := coalesce(p_month_start,date_trunc('month',(timezone('America/Los_Angeles',now()))::date)::date);
  if v_start<>date_trunc('month',v_start)::date then
    raise exception 'Choose the first day of a calendar month.' using errcode='22023';
  end if;
  v_end := (v_start + make_interval(months=>v_count))::date;

  select coalesce(jsonb_agg(jsonb_build_object(
    'event_id',e.id,
    'title',e.title,
    'event_type',e.event_type,
    'description',e.description,
    'event_date',e.event_date,
    'start_time',to_char(e.start_time,'HH24:MI'),
    'end_time',case when e.end_time is null then null else to_char(e.end_time,'HH24:MI') end,
    'starts_at',e.starts_at,
    'ends_at',e.ends_at,
    'event_timezone',e.event_timezone,
    'host_name',e.host_name,
    'host_member_id',e.host_member_id,
    'audience',e.audience,
    'image_url',e.image_url,
    'status',e.status,
    'is_registered',coalesce(r.cancelled_at is null and r.registered_at is not null,false),
    'can_join',(e.status='published' and v_rank>=case when e.audience='flowfm' then 2 else 1 end),
    'zoom_ready',(e.status='published' and nullif(trim(coalesce(e.zoom_url,'')),'') is not null),
    'registration_count',(select count(*)::integer from public.flowtel_queendom_event_registrations rr where rr.event_id=e.id and rr.cancelled_at is null)
  ) order by e.starts_at,e.title),'[]'::jsonb)
  into v_result
  from public.flowtel_queendom_events e
  left join public.flowtel_queendom_event_registrations r
    on r.event_id=e.id and r.member_id=v_member
  where e.published_at is not null
    and e.status in ('published','cancelled')
    and e.event_date>=v_start
    and e.event_date<v_end;

  return v_result;
end;
$$;

revoke all on function public.flowtel_list_queendom_events(date,integer) from public;
grant execute on function public.flowtel_list_queendom_events(date,integer) to authenticated;

create or replace function public.flowtel_admin_list_queendom_events()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  v_result jsonb;
begin
  if not public.flowtel_current_user_is_admin_or_owner() then
    raise exception 'Only Flowtel administration may manage Queendom events.' using errcode='42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'event_id',e.id,
    'title',e.title,
    'event_type',e.event_type,
    'description',e.description,
    'event_date',e.event_date,
    'start_time',to_char(e.start_time,'HH24:MI'),
    'end_time',case when e.end_time is null then null else to_char(e.end_time,'HH24:MI') end,
    'starts_at',e.starts_at,
    'ends_at',e.ends_at,
    'event_timezone',e.event_timezone,
    'host_name',e.host_name,
    'host_member_id',e.host_member_id,
    'audience',e.audience,
    'zoom_url',e.zoom_url,
    'zoom_passcode',e.zoom_passcode,
    'image_path',e.image_path,
    'image_url',e.image_url,
    'status',e.status,
    'published_at',e.published_at,
    'cancelled_at',e.cancelled_at,
    'registration_count',(select count(*)::integer from public.flowtel_queendom_event_registrations r where r.event_id=e.id and r.cancelled_at is null),
    'updated_at',e.updated_at
  ) order by e.event_date desc,e.start_time desc),'[]'::jsonb)
  into v_result
  from public.flowtel_queendom_events e;
  return v_result;
end;
$$;

revoke all on function public.flowtel_admin_list_queendom_events() from public;
grant execute on function public.flowtel_admin_list_queendom_events() to authenticated;

-- Replace the v0.10.83 save RPC with a host-member-aware signature. Keeping
-- p_host_name in the signature preserves historical/manual event snapshots,
-- while the new admin UI sends p_host_member_id and the server derives the
-- canonical host name from that Flow FM member.
drop function if exists public.flowtel_admin_save_queendom_event(uuid,text,text,text,date,time without time zone,time without time zone,text,text,text,text,text,text,text,text);

create or replace function public.flowtel_admin_save_queendom_event(
  p_event_id uuid default null,
  p_title text default null,
  p_event_type text default 'workshop',
  p_description text default null,
  p_event_date date default null,
  p_start_time time without time zone default null,
  p_end_time time without time zone default null,
  p_timezone text default 'America/Los_Angeles',
  p_host_name text default null,
  p_audience text default 'queendom',
  p_zoom_url text default null,
  p_zoom_passcode text default null,
  p_image_path text default null,
  p_image_url text default null,
  p_status text default 'draft',
  p_host_member_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid := coalesce(p_event_id,gen_random_uuid());
  v_title text := trim(coalesce(p_title,''));
  v_type text := lower(trim(coalesce(p_event_type,'workshop')));
  v_description text := nullif(trim(coalesce(p_description,'')),'');
  v_timezone text := trim(coalesce(nullif(p_timezone,''),'America/Los_Angeles'));
  v_host text := nullif(trim(coalesce(p_host_name,'')),'');
  v_host_member uuid := p_host_member_id;
  v_audience text := lower(trim(coalesce(p_audience,'queendom')));
  v_zoom text := nullif(trim(coalesce(p_zoom_url,'')),'');
  v_passcode text := nullif(trim(coalesce(p_zoom_passcode,'')),'');
  v_image_path text := nullif(trim(coalesce(p_image_path,'')),'');
  v_image_url text := nullif(trim(coalesce(p_image_url,'')),'');
  v_status text := lower(trim(coalesce(p_status,'draft')));
  v_starts_at timestamptz;
  v_ends_at timestamptz;
begin
  if not public.flowtel_current_user_is_admin_or_owner() then
    raise exception 'Only Flowtel administration may manage Queendom events.' using errcode='42501';
  end if;
  if p_event_id is not null and exists (select 1 from public.flowtel_queendom_events e where e.id=p_event_id and e.status='cancelled') then
    raise exception 'Cancelled events stay in history and cannot be republished. Create a new event instead.' using errcode='22023';
  end if;
  if char_length(v_title)<1 or char_length(v_title)>180 then
    raise exception 'Event title must be between 1 and 180 characters.' using errcode='22023';
  end if;
  if v_type not in ('workshop','ceremony','call','other') then
    raise exception 'Choose Workshop, Ceremony, Call, or Other.' using errcode='22023';
  end if;
  if p_event_date is null or p_start_time is null then
    raise exception 'Choose the event date and start time.' using errcode='22023';
  end if;
  if p_end_time is not null and p_end_time<=p_start_time then
    raise exception 'Event end time must be after the start time.' using errcode='22023';
  end if;
  if v_audience not in ('queendom','flowfm') then
    raise exception 'Choose Queendom or Flow FM access.' using errcode='22023';
  end if;
  if v_status not in ('draft','published') then
    raise exception 'Events may be saved as Draft or Published. Use Cancel Event to cancel one.' using errcode='22023';
  end if;
  if v_zoom is not null and v_zoom !~* '^https://([a-z0-9-]+\.)*(zoom\.us|zoom\.com|zoomgov\.com)(/|$)' then
    raise exception 'Enter a valid Zoom meeting URL.' using errcode='22023';
  end if;
  begin
    perform timezone(v_timezone,now());
  exception when others then
    raise exception 'Choose a valid timezone.' using errcode='22023';
  end;

  if v_host_member is not null then
    select coalesce(
      nullif(trim(pp.priestess_name),''),
      nullif(trim(p.display_name),''),
      nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),
      p.email,
      'Flow FM Priestess'
    )
    into v_host
    from public.profiles p
    left join public.flow_fm_priestess_profiles pp on pp.member_id=p.id
    where p.id=v_host_member
      and public.flow_fm_effective_membership_rank(
        p.id,p.membership_type,p.membership_rank,p.role,p.flowfm_started_at,p.is_initiated
      ) >= 2;

    if not found then
      raise exception 'Choose a current Flow FM member as the event host.' using errcode='22023';
    end if;
  end if;

  v_starts_at := (p_event_date+p_start_time) at time zone v_timezone;
  if p_end_time is not null then
    v_ends_at := (p_event_date+p_end_time) at time zone v_timezone;
  end if;

  insert into public.flowtel_queendom_events(
    id,title,event_type,description,event_date,start_time,end_time,event_timezone,starts_at,ends_at,
    host_name,host_member_id,audience,zoom_url,zoom_passcode,image_path,image_url,status,published_at,cancelled_at,
    created_by,updated_by,created_at,updated_at
  ) values (
    v_id,v_title,v_type,v_description,p_event_date,p_start_time,p_end_time,v_timezone,v_starts_at,v_ends_at,
    v_host,v_host_member,v_audience,v_zoom,v_passcode,v_image_path,v_image_url,v_status,
    case when v_status='published' then now() else null end,null,
    v_user,v_user,now(),now()
  )
  on conflict(id) do update set
    title=excluded.title,
    event_type=excluded.event_type,
    description=excluded.description,
    event_date=excluded.event_date,
    start_time=excluded.start_time,
    end_time=excluded.end_time,
    event_timezone=excluded.event_timezone,
    starts_at=excluded.starts_at,
    ends_at=excluded.ends_at,
    host_name=excluded.host_name,
    host_member_id=excluded.host_member_id,
    audience=excluded.audience,
    zoom_url=excluded.zoom_url,
    zoom_passcode=excluded.zoom_passcode,
    image_path=excluded.image_path,
    image_url=excluded.image_url,
    status=excluded.status,
    published_at=case when excluded.status='published' then coalesce(public.flowtel_queendom_events.published_at,now()) else public.flowtel_queendom_events.published_at end,
    cancelled_at=null,
    updated_by=v_user,
    updated_at=now();

  return v_id;
end;
$$;

revoke all on function public.flowtel_admin_save_queendom_event(uuid,text,text,text,date,time without time zone,time without time zone,text,text,text,text,text,text,text,text,uuid) from public;
grant execute on function public.flowtel_admin_save_queendom_event(uuid,text,text,text,date,time without time zone,time without time zone,text,text,text,text,text,text,text,text,uuid) to authenticated;

-- Ask PostgREST to pick up newly created/replaced functions immediately. This
-- directly addresses the live "schema cache" error reported against 067.
notify pgrst, 'reload schema';

commit;
