-- Flowtel v0.10.74.2 — Guest House recording-choice updates.
-- Migration 059 must already be present. This corrective migration removes the
-- standalone withdrawal RPC while restoring append-only file-scoped choice updates.

begin;

-- Migration 059 may have been installed from either v0.10.74 or v0.10.74.1.
-- Normalize both live shapes into one append-only preference history.
drop index if exists public.flowtel_guest_house_training_consents_request_unique_idx;

alter table public.flowtel_guest_house_training_consents
  drop constraint if exists flowtel_guest_house_training_consent_action_check;
alter table public.flowtel_guest_house_training_consents
  add constraint flowtel_guest_house_training_consent_action_check
  check (consent_action in ('granted','updated','withdrawn'));

alter table public.flowtel_guest_house_training_consents
  drop constraint if exists flowtel_guest_house_training_consent_file_check;
alter table public.flowtel_guest_house_training_consents
  add constraint flowtel_guest_house_training_consent_file_check
  check (
    (consent_action in ('granted','updated') and cardinality(selected_file_ids)>0)
    or (consent_action='withdrawn' and cardinality(selected_file_ids)=0)
  );

alter table public.flowtel_guest_house_events
  drop constraint if exists flowtel_guest_house_event_type_check;
alter table public.flowtel_guest_house_events
  add constraint flowtel_guest_house_event_type_check check (
    event_type in (
      'request_created','status_changed','replay_uploaded','replay_removed','access_prepared',
      'access_revoked','access_opened','stream_started','download_requested',
      'invitation_sent','invitation_copy_prepared','replay_expired','replay_deletion_failed',
      'training_consent_granted','training_consent_updated','training_consent_withdrawn'
    )
  );

-- The old dedicated withdrawal RPC is intentionally retired. A guest changes
-- the checked recording list inside the same gentle preference editor instead.
drop function if exists public.flowtel_guest_house_withdraw_training_consent(boolean);

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
  v_latest_file_ids uuid[] := '{}'::uuid[];
  v_latest_action text;
  v_requested_file_count integer := 0;
  v_consent_id uuid;
  v_has_grant boolean := false;
  v_action text;
  v_event_type text;
  v_consent_version constant text := 'flow-fm-training-offering-v3-2026-07-23';
  v_initial_copy constant text := 'I freely give the selected Guest House session recording(s) as an offering for Moon Priestess training and give Megan Michele permission to share them inside the private Flow FM Mastermind portal. I understand that my name, voice, image, and personal conversation may be included. I understand that the complimentary session offered in gratitude will also be recorded and shared in Flow FM for the same training purpose.';
  v_update_copy constant text := 'I understand that only the recordings checked in my Guest House are currently offered for private Moon Priestess training inside Flow FM.';
  v_empty_copy constant text := 'I changed my Guest House recording choices so that no recording is currently offered for private Moon Priestess training inside Flow FM.';
  v_coupon constant text := 'WITNESSED';
  v_schedule_url constant text := 'https://meganmichele.as.me/energyreading';
  v_gift_created_at timestamptz;
  v_gift_coupon text;
  v_gift_url text;
begin
  if v_user_id is null then
    raise exception 'Sign in to save your Flow FM recording choices.' using errcode='28000';
  end if;
  if p_confirmed is not true then
    raise exception 'Confirm your recording choices before continuing.' using errcode='22023';
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

  if v_requested_file_count > 0 then
    select coalesce(array_agg(distinct f.id order by f.id),'{}'::uuid[]) into v_file_ids
    from public.flowtel_guest_house_files f
    where f.request_id=v_request_id
      and f.id=any(coalesce(p_file_ids,'{}'::uuid[]))
      and f.is_active=true
      and coalesce(f.deletion_status,'active') <> 'deleted'
      and (f.expires_at is null or f.expires_at>now());

    if cardinality(v_file_ids) <> v_requested_file_count then
      raise exception 'One or more selected recordings do not belong to this active Replay Room.' using errcode='42501';
    end if;
  end if;

  select exists(
    select 1 from public.flowtel_guest_house_training_consents c
    where c.request_id=v_request_id and c.consent_action='granted'
  ) into v_has_grant;

  select c.consent_action,coalesce(c.selected_file_ids,'{}'::uuid[])
    into v_latest_action,v_latest_file_ids
  from public.flowtel_guest_house_training_consents c
  where c.request_id=v_request_id
  order by c.created_at desc,c.id desc
  limit 1;

  if not v_has_grant and v_requested_file_count < 1 then
    raise exception 'Choose at least one session recording for your first offering.' using errcode='22023';
  end if;

  if v_requested_file_count < 1 then
    v_action := 'withdrawn';
    v_event_type := 'training_consent_withdrawn';
  elsif not v_has_grant then
    v_action := 'granted';
    v_event_type := 'training_consent_granted';
  else
    v_action := 'updated';
    v_event_type := 'training_consent_updated';
  end if;

  -- Saving the same current choice is harmless and does not create duplicate history.
  if v_latest_action is not null
     and ((v_action='withdrawn' and v_latest_action='withdrawn')
       or (v_action in ('granted','updated') and v_latest_action in ('granted','updated') and v_file_ids=v_latest_file_ids)) then
    select c.created_at,c.gift_coupon_code,c.gift_schedule_url
      into v_gift_created_at,v_gift_coupon,v_gift_url
    from public.flowtel_guest_house_training_consents c
    where c.request_id=v_request_id and c.consent_action='granted'
    order by c.created_at asc,c.id asc
    limit 1;

    return jsonb_build_object(
      'status',v_latest_action,
      'file_ids',to_jsonb(v_latest_file_ids),
      'consent_version',v_consent_version,
      'coupon_code',case when v_latest_action<>'withdrawn' then v_gift_coupon else null end,
      'scheduling_url',case when v_latest_action<>'withdrawn' then v_gift_url else null end,
      'gift_granted_at',v_gift_created_at,
      'unchanged',true
    );
  end if;

  insert into public.flowtel_guest_house_training_consents (
    request_id,guest_id,auth_user_id,consent_action,selected_file_ids,
    consent_version,consent_copy,gift_coupon_code,gift_schedule_url
  ) values (
    v_request_id,v_guest_id,v_user_id,v_action,
    case when v_action='withdrawn' then '{}'::uuid[] else v_file_ids end,
    v_consent_version,
    case when v_action='granted' then v_initial_copy when v_action='updated' then v_update_copy else v_empty_copy end,
    case when v_action='granted' then v_coupon else null end,
    case when v_action='granted' then v_schedule_url else null end
  ) returning id into v_consent_id;

  insert into public.flowtel_guest_house_events(request_id,actor_id,event_type,event_context)
  values (v_request_id,v_user_id,v_event_type,jsonb_build_object(
    'consent_id',v_consent_id,
    'consent_version',v_consent_version,
    'selected_file_ids',to_jsonb(case when v_action='withdrawn' then '{}'::uuid[] else v_file_ids end),
    'previous_file_ids',to_jsonb(v_latest_file_ids),
    'gift_coupon_code',case when v_action='granted' then v_coupon else null end,
    'gift_schedule_url',case when v_action='granted' then v_schedule_url else null end
  ));

  select c.created_at,c.gift_coupon_code,c.gift_schedule_url
    into v_gift_created_at,v_gift_coupon,v_gift_url
  from public.flowtel_guest_house_training_consents c
  where c.request_id=v_request_id and c.consent_action='granted'
  order by c.created_at asc,c.id asc
  limit 1;

  return jsonb_build_object(
    'consent_id',v_consent_id,
    'status',v_action,
    'file_ids',to_jsonb(case when v_action='withdrawn' then '{}'::uuid[] else v_file_ids end),
    'consent_version',v_consent_version,
    'coupon_code',case when v_action<>'withdrawn' then v_gift_coupon else null end,
    'scheduling_url',case when v_action<>'withdrawn' then v_gift_url else null end,
    'gift_granted_at',v_gift_created_at,
    'created_at',now()
  );
end;
$$;
revoke all on function public.flowtel_guest_house_submit_training_consent(uuid[],boolean) from public;
grant execute on function public.flowtel_guest_house_submit_training_consent(uuid[],boolean) to authenticated;

-- Rebuild the owner queue so current file choices and any full deselection are
-- visible as an owner-only operational signal inside the Concierge Desk.
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

comment on function public.flowtel_guest_house_submit_training_consent(uuid[],boolean) is
  'Appends the guest current file-scoped Flow FM offering choices; an empty update records no current approved recordings without exposing a standalone withdrawal button.';

commit;
