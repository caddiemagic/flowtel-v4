-- Flowtel v0.10.74 — Guest House Flow FM training consent + shared gift session.
-- Migration 058 is confirmed live. This migration is append-only and preserves
-- existing Guest House accounts, replay files, requests, events, and access.

begin;

create table if not exists public.flowtel_guest_house_training_consents (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.flowtel_guest_house_requests(id) on delete restrict,
  guest_id uuid not null references public.flowtel_guest_house_guests(id) on delete restrict,
  auth_user_id uuid not null,
  consent_action text not null,
  selected_file_ids uuid[] not null default '{}'::uuid[],
  consent_version text not null,
  consent_copy text not null,
  gift_coupon_code text,
  gift_schedule_url text,
  created_at timestamptz not null default now(),
  constraint flowtel_guest_house_training_consent_action_check
    check (consent_action in ('granted','withdrawn')),
  constraint flowtel_guest_house_training_consent_file_check
    check (
      (consent_action='granted' and cardinality(selected_file_ids)>0)
      or (consent_action='withdrawn' and cardinality(selected_file_ids)=0)
    ),
  constraint flowtel_guest_house_training_consent_version_check
    check (char_length(consent_version) between 1 and 120),
  constraint flowtel_guest_house_training_consent_copy_check
    check (char_length(consent_copy) between 1 and 4000),
  constraint flowtel_guest_house_training_consent_coupon_check
    check (gift_coupon_code is null or char_length(gift_coupon_code) <= 120),
  constraint flowtel_guest_house_training_consent_url_check
    check (gift_schedule_url is null or char_length(gift_schedule_url) <= 1000)
);

create index if not exists flowtel_guest_house_training_consents_request_created_idx
  on public.flowtel_guest_house_training_consents (request_id,created_at desc,id desc);
create index if not exists flowtel_guest_house_training_consents_guest_created_idx
  on public.flowtel_guest_house_training_consents (guest_id,created_at desc,id desc);

alter table public.flowtel_guest_house_training_consents enable row level security;
revoke all on public.flowtel_guest_house_training_consents from anon, authenticated;

alter table public.flowtel_guest_house_events
  drop constraint if exists flowtel_guest_house_event_type_check;
alter table public.flowtel_guest_house_events
  add constraint flowtel_guest_house_event_type_check check (
    event_type in (
      'request_created','status_changed','replay_uploaded','replay_removed','access_prepared',
      'access_revoked','access_opened','stream_started','download_requested',
      'invitation_sent','invitation_copy_prepared','replay_expired','replay_deletion_failed',
      'training_consent_granted','training_consent_withdrawn'
    )
  );

create or replace function public.flowtel_guest_house_submit_training_consent(
  p_file_ids uuid[],
  p_confirmed boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_guest_id uuid;
  v_request_id uuid;
  v_file_ids uuid[] := '{}'::uuid[];
  v_requested_file_count integer := 0;
  v_consent_id uuid;
  v_consent_version constant text := 'flow-fm-training-v1-2026-07-23';
  v_consent_copy constant text := 'I give Megan Michele permission to share the selected Guest House session recording(s) inside the private Flow FM Mastermind portal for Moon Priestess training. I understand that my name, voice, image, and personal conversation may be included. I also agree that my complimentary gift session will be recorded and shared in Flow FM for the same training purpose.';
  v_coupon constant text := 'WITNESSED';
  v_schedule_url constant text := 'https://meganmichele.as.me/energyreading';
begin
  if v_user_id is null then
    raise exception 'Sign in to choose whether your session may be shared.' using errcode='28000';
  end if;
  if p_confirmed is not true then
    raise exception 'Confirm your permission before sharing a session with Flow FM.' using errcode='22023';
  end if;

  select g.id into v_guest_id
  from public.flowtel_guest_house_guests g
  where g.auth_user_id=v_user_id
  limit 1;
  if v_guest_id is null then
    raise exception 'Your Guest House account could not be found.' using errcode='P0002';
  end if;

  select r.id into v_request_id
  from public.flowtel_guest_house_requests r
  where r.guest_id=v_guest_id and r.status <> 'archived'
  order by r.created_at desc,r.id desc
  limit 1;
  if v_request_id is null then
    raise exception 'No Replay Room request belongs to this Guest House account.' using errcode='P0002';
  end if;

  select count(distinct value) into v_requested_file_count
  from unnest(coalesce(p_file_ids,'{}'::uuid[])) as selected(value)
  where value is not null;

  select coalesce(array_agg(distinct f.id order by f.id),'{}'::uuid[]) into v_file_ids
  from public.flowtel_guest_house_files f
  where f.request_id=v_request_id
    and f.id=any(coalesce(p_file_ids,'{}'::uuid[]))
    and f.is_active=true
    and coalesce(f.deletion_status,'active') <> 'deleted'
    and (f.expires_at is null or f.expires_at>now());

  if v_requested_file_count < 1 then
    raise exception 'Choose at least one session recording to share.' using errcode='22023';
  end if;
  if cardinality(v_file_ids) <> v_requested_file_count then
    raise exception 'One or more selected recordings do not belong to this active Replay Room.' using errcode='42501';
  end if;

  insert into public.flowtel_guest_house_training_consents (
    request_id,guest_id,auth_user_id,consent_action,selected_file_ids,
    consent_version,consent_copy,gift_coupon_code,gift_schedule_url
  ) values (
    v_request_id,v_guest_id,v_user_id,'granted',v_file_ids,
    v_consent_version,v_consent_copy,v_coupon,v_schedule_url
  ) returning id into v_consent_id;

  insert into public.flowtel_guest_house_events(request_id,actor_id,event_type,event_context)
  values (v_request_id,v_user_id,'training_consent_granted',jsonb_build_object(
    'consent_id',v_consent_id,
    'consent_version',v_consent_version,
    'selected_file_ids',to_jsonb(v_file_ids),
    'gift_coupon_code',v_coupon,
    'gift_schedule_url',v_schedule_url
  ));

  return jsonb_build_object(
    'consent_id',v_consent_id,
    'status','granted',
    'file_ids',to_jsonb(v_file_ids),
    'consent_version',v_consent_version,
    'coupon_code',v_coupon,
    'scheduling_url',v_schedule_url,
    'created_at',now()
  );
end;
$$;
revoke all on function public.flowtel_guest_house_submit_training_consent(uuid[],boolean) from public;
grant execute on function public.flowtel_guest_house_submit_training_consent(uuid[],boolean) to authenticated;

create or replace function public.flowtel_guest_house_withdraw_training_consent(
  p_confirmed boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_guest_id uuid;
  v_request_id uuid;
  v_consent_id uuid;
  v_consent_version constant text := 'flow-fm-training-v1-2026-07-23';
  v_withdrawal_copy constant text := 'I withdraw permission for my Guest House session recording(s) to be shared in the Flow FM Mastermind portal for future training use.';
begin
  if v_user_id is null then
    raise exception 'Sign in to change your Flow FM training permission.' using errcode='28000';
  end if;
  if p_confirmed is not true then
    raise exception 'Confirm that you want to withdraw this permission.' using errcode='22023';
  end if;

  select g.id into v_guest_id
  from public.flowtel_guest_house_guests g
  where g.auth_user_id=v_user_id
  limit 1;
  if v_guest_id is null then
    raise exception 'Your Guest House account could not be found.' using errcode='P0002';
  end if;

  select r.id into v_request_id
  from public.flowtel_guest_house_requests r
  where r.guest_id=v_guest_id and r.status <> 'archived'
  order by r.created_at desc,r.id desc
  limit 1;
  if v_request_id is null then
    raise exception 'No Replay Room request belongs to this Guest House account.' using errcode='P0002';
  end if;
  if not exists (
    select 1 from public.flowtel_guest_house_training_consents c
    where c.request_id=v_request_id and c.consent_action='granted'
  ) then
    raise exception 'No Flow FM training permission has been granted for this Replay Room.' using errcode='P0002';
  end if;

  insert into public.flowtel_guest_house_training_consents (
    request_id,guest_id,auth_user_id,consent_action,selected_file_ids,
    consent_version,consent_copy,gift_coupon_code,gift_schedule_url
  ) values (
    v_request_id,v_guest_id,v_user_id,'withdrawn','{}'::uuid[],
    v_consent_version,v_withdrawal_copy,null,null
  ) returning id into v_consent_id;

  insert into public.flowtel_guest_house_events(request_id,actor_id,event_type,event_context)
  values (v_request_id,v_user_id,'training_consent_withdrawn',jsonb_build_object(
    'consent_id',v_consent_id,'consent_version',v_consent_version
  ));

  return jsonb_build_object(
    'consent_id',v_consent_id,
    'status','withdrawn',
    'consent_version',v_consent_version,
    'created_at',now()
  );
end;
$$;
revoke all on function public.flowtel_guest_house_withdraw_training_consent(boolean) from public;
grant execute on function public.flowtel_guest_house_withdraw_training_consent(boolean) to authenticated;

-- Rebuild the owner queue so the latest append-only permission snapshot is
-- visible beside each private replay request.
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
  files jsonb,
  training_consent jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to open the Guest House.' using errcode='28000';
  end if;
  if not public.flowtel_current_user_is_concierge() then
    raise exception 'The Guest House request queue is reserved for the Flowtel owner.' using errcode='42501';
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
    ) order by f.uploaded_at asc,f.id) filter (where f.id is not null),'[]'::jsonb),
    (
      select jsonb_build_object(
        'status',latest.consent_action,
        'file_ids',to_jsonb(latest.selected_file_ids),
        'consent_version',latest.consent_version,
        'updated_at',latest.created_at,
        'gift_granted',exists(
          select 1 from public.flowtel_guest_house_training_consents gift
          where gift.request_id=r.id and gift.consent_action='granted'
        ),
        'gift_granted_at',(
          select min(gift.created_at) from public.flowtel_guest_house_training_consents gift
          where gift.request_id=r.id and gift.consent_action='granted'
        ),
        'coupon_code',(
          select gift.gift_coupon_code from public.flowtel_guest_house_training_consents gift
          where gift.request_id=r.id and gift.consent_action='granted'
          order by gift.created_at asc,gift.id asc limit 1
        ),
        'scheduling_url',(
          select gift.gift_schedule_url from public.flowtel_guest_house_training_consents gift
          where gift.request_id=r.id and gift.consent_action='granted'
          order by gift.created_at asc,gift.id asc limit 1
        )
      )
      from public.flowtel_guest_house_training_consents latest
      where latest.request_id=r.id
      order by latest.created_at desc,latest.id desc
      limit 1
    )
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

comment on table public.flowtel_guest_house_training_consents is
  'Append-only Guest House permission receipts for selected private replays and the recorded complimentary Flow FM training session.';
comment on function public.flowtel_guest_house_submit_training_consent(uuid[],boolean) is
  'Records explicit file-scoped Flow FM training permission and immediately grants the shared WITNESSED scheduling gift.';
comment on function public.flowtel_guest_house_withdraw_training_consent(boolean) is
  'Appends a withdrawal receipt without deleting prior consent history or the already-granted scheduling gift.';

commit;
