-- Flowtel v0.10.63 — Guest House Accounts + Replay Status Portal
--
-- Adds a remembered, password-based Guest House account without granting
-- Queendom, Flow FM, Suite, Team Map, cycle-data, Concierge, or Caddie Magic
-- access. Guests sign in before submitting a replay request, can return to see
-- one of three hospitality states, and can receive ready replay media directly
-- inside their authenticated Guest House portal.
--
-- Existing Guest House requests, private room keys, files, and event history are
-- preserved. Legacy token-gated requests remain separate from new password-based
-- accounts so an unverified login email can never claim an older private replay.
--
-- Migration 037 remains retired and must never be rerun.

-- ---------------------------------------------------------------------------
-- Guest House account ownership
-- ---------------------------------------------------------------------------

alter table public.flowtel_guest_house_guests
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null,
  add column if not exists account_created_at timestamptz;

-- Email is a login label in this no-email-delivery MVP, not proof of ownership.
-- Permit a legacy token identity and a newer account identity to share an email
-- while keeping each Auth account linked to exactly one Guest House identity.
alter table public.flowtel_guest_house_guests
  drop constraint if exists flowtel_guest_house_guests_email_key;

create index if not exists flowtel_guest_house_guests_email_idx
  on public.flowtel_guest_house_guests (email);

create unique index if not exists flowtel_guest_house_guests_auth_user_idx
  on public.flowtel_guest_house_guests (auth_user_id)
  where auth_user_id is not null;

-- The revised request asks only for the client's memory of the conversation.
alter table public.flowtel_guest_house_requests
  drop constraint if exists flowtel_guest_house_call_topic_length_check;

alter table public.flowtel_guest_house_requests
  add constraint flowtel_guest_house_call_topic_length_check
  check (call_topic is null or char_length(call_topic) <= 2000);

-- ---------------------------------------------------------------------------
-- Explicit Guest House product boundary
-- ---------------------------------------------------------------------------

alter table public.flowtel_product_access
  drop constraint if exists flowtel_product_access_access_role_check;

alter table public.flowtel_product_access
  add constraint flowtel_product_access_access_role_check
  check (access_role in ('guest_house','player','flowtel_member','practitioner','admin','owner'));

-- A Guest House account must not self-upgrade merely by opening a protected
-- Flowtel route. If a real membership doorway later creates a profile for the
-- same Auth user, the established Flowtel claim helper may promote the account
-- without losing Guest House history.
create or replace function public.flowtel_claim_default_access()
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_access public.flowtel_product_access%rowtype;
  v_profile_role text;
begin
  if v_user_id is null then return false; end if;

  select * into v_access
  from public.flowtel_product_access
  where user_id = v_user_id
  for update;

  if v_access.user_id is null then
    if exists (
      select 1 from public.flowtel_guest_house_guests
      where auth_user_id = v_user_id
    ) then
      insert into public.flowtel_product_access (
        user_id, flowtel_access, caddie_magic_access, access_role, access_source
      ) values (
        v_user_id, false, false, 'guest_house', 'guest-house-account'
      )
      on conflict (user_id) do nothing;
      return false;
    end if;

    insert into public.flowtel_product_access (
      user_id, flowtel_access, caddie_magic_access, access_role, access_source
    ) values (
      v_user_id, true, false, 'flowtel_member', 'flowtel-entry'
    );
    return true;
  end if;

  if v_access.flowtel_access then return true; end if;

  if v_access.access_role = 'guest_house' then
    select lower(coalesce(role,'')) into v_profile_role
    from public.profiles
    where id = v_user_id;

    if v_profile_role is null then return false; end if;

    update public.flowtel_product_access
    set flowtel_access = true,
        access_role = case
          when v_profile_role = 'owner' then 'owner'
          when v_profile_role = 'admin' then 'admin'
          when v_profile_role = 'practitioner' then 'practitioner'
          else 'flowtel_member'
        end,
        access_source = 'guest-house-upgraded-through-flowtel-membership',
        updated_at = now()
    where user_id = v_user_id;

    return true;
  end if;

  -- Preserve Caddie Magic Player-Only Access.
  if v_access.caddie_magic_access and v_access.access_role = 'player' then
    return false;
  end if;

  update public.flowtel_product_access
  set flowtel_access = true,
      access_role = case when access_role = 'player' then 'flowtel_member' else access_role end,
      access_source = coalesce(access_source, 'flowtel-entry'),
      updated_at = now()
  where user_id = v_user_id;

  return true;
end;
$$;

revoke all on function public.flowtel_claim_default_access() from public;
grant execute on function public.flowtel_claim_default_access() to authenticated;

-- New Auth users created specifically through the public Guest House doorway
-- receive an explicit no-Flowtel/no-Caddie product-access record and a new
-- account-owned Guest House identity. Legacy token identities are never claimed
-- automatically by email because this release intentionally sends no verification.
create or replace function public.flowtel_guest_house_claim_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_source text := lower(trim(coalesce(new.raw_user_meta_data->>'source','')));
  v_first_name text := trim(coalesce(new.raw_user_meta_data->>'first_name',''));
  v_last_name text := trim(coalesce(new.raw_user_meta_data->>'last_name',''));
  v_email text := lower(trim(coalesce(new.email,'')));
begin
  if v_source <> 'flowtel_guest_house' or v_email = '' then return new; end if;

  insert into public.flowtel_product_access (
    user_id, flowtel_access, caddie_magic_access, access_role, access_source
  ) values (
    new.id, false, false, 'guest_house', 'guest-house-account'
  )
  on conflict (user_id) do nothing;

  insert into public.flowtel_guest_house_guests (
    first_name,last_name,email,auth_user_id,account_created_at,updated_at
  ) values (
    coalesce(nullif(v_first_name,''),'Guest'),
    coalesce(nullif(v_last_name,''),'House'),
    v_email,
    new.id,
    now(),
    now()
  )
  on conflict (auth_user_id) where auth_user_id is not null do update
  set first_name = case
        when nullif(v_first_name,'') is not null then v_first_name
        else public.flowtel_guest_house_guests.first_name
      end,
      last_name = case
        when nullif(v_last_name,'') is not null then v_last_name
        else public.flowtel_guest_house_guests.last_name
      end,
      email = excluded.email,
      account_created_at = coalesce(public.flowtel_guest_house_guests.account_created_at,now()),
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists flowtel_guest_house_claim_after_auth_user on auth.users;
create trigger flowtel_guest_house_claim_after_auth_user
  after insert on auth.users
  for each row execute function public.flowtel_guest_house_claim_auth_user();

-- ---------------------------------------------------------------------------
-- Authenticated Guest House account RPCs
-- ---------------------------------------------------------------------------

create or replace function public.flowtel_guest_house_claim_my_account(
  p_first_name text default null,
  p_last_name text default null
)
returns table (
  guest_id uuid,
  first_name text,
  last_name text,
  email text,
  member_id uuid,
  auth_user_id uuid
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_first_name text := trim(coalesce(p_first_name,''));
  v_last_name text := trim(coalesce(p_last_name,''));
  v_existing public.flowtel_guest_house_guests%rowtype;
begin
  if v_user_id is null then
    raise exception 'Sign in to open the Flowtel Guest House.' using errcode = '28000';
  end if;

  select lower(trim(u.email)) into v_email
  from auth.users u
  where u.id = v_user_id;

  if coalesce(v_email,'') = '' then
    raise exception 'Your Guest House email could not be verified.' using errcode = '28000';
  end if;

  select g.* into v_existing
  from public.flowtel_guest_house_guests g
  where g.auth_user_id = v_user_id
  limit 1
  for update;

  if v_existing.id is null and (v_first_name = '' or v_last_name = '') then
    raise exception 'Add your first and last name to prepare your Guest House account.' using errcode = '22023';
  end if;

  if v_existing.id is null then
    insert into public.flowtel_guest_house_guests (
      first_name,last_name,email,auth_user_id,member_id,account_created_at,updated_at
    ) values (
      v_first_name,v_last_name,v_email,v_user_id,
      (select p.id from public.profiles p where p.id = v_user_id),
      now(),now()
    ) returning * into v_existing;
  else
    update public.flowtel_guest_house_guests g
    set auth_user_id = v_user_id,
        member_id = coalesce(g.member_id,(select p.id from public.profiles p where p.id = v_user_id)),
        account_created_at = coalesce(g.account_created_at,now()),
        first_name = coalesce(nullif(v_first_name,''),g.first_name),
        last_name = coalesce(nullif(v_last_name,''),g.last_name),
        updated_at = now()
    where g.id = v_existing.id
    returning g.* into v_existing;
  end if;

  insert into public.flowtel_product_access (
    user_id,flowtel_access,caddie_magic_access,access_role,access_source
  ) values (
    v_user_id,false,false,'guest_house','guest-house-account'
  )
  on conflict (user_id) do nothing;

  return query
  select v_existing.id,v_existing.first_name,v_existing.last_name,v_existing.email,v_existing.member_id,v_existing.auth_user_id;
end;
$$;

revoke all on function public.flowtel_guest_house_claim_my_account(text,text) from public;
grant execute on function public.flowtel_guest_house_claim_my_account(text,text) to authenticated;

create or replace function public.flowtel_guest_house_submit_my_request(
  p_first_name text,
  p_last_name text,
  p_call_memory text,
  p_confirmed boolean
)
returns table (
  request_id uuid,
  request_status text,
  request_created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_guest public.flowtel_guest_house_guests%rowtype;
  v_first_name text := trim(coalesce(p_first_name,''));
  v_last_name text := trim(coalesce(p_last_name,''));
  v_memory text := trim(coalesce(p_call_memory,''));
  v_request public.flowtel_guest_house_requests%rowtype;
begin
  if v_user_id is null then
    raise exception 'Sign in before requesting your call replay.' using errcode = '28000';
  end if;
  if v_first_name = '' or char_length(v_first_name) > 100 then
    raise exception 'Enter your first name.' using errcode = '22023';
  end if;
  if v_last_name = '' or char_length(v_last_name) > 100 then
    raise exception 'Enter your last name.' using errcode = '22023';
  end if;
  if v_memory = '' then
    raise exception 'Share what you remember about the call.' using errcode = '22023';
  end if;
  if char_length(v_memory) > 2000 then
    raise exception 'Keep your call memory under 2,000 characters.' using errcode = '22023';
  end if;
  if coalesce(p_confirmed,false) is not true then
    raise exception 'Confirm that you are requesting your own private call replay.' using errcode = '22023';
  end if;

  select lower(trim(u.email)) into v_email from auth.users u where u.id = v_user_id;

  select g.* into v_guest
  from public.flowtel_guest_house_guests g
  where g.auth_user_id = v_user_id
  limit 1
  for update;

  if v_guest.id is null then
    insert into public.flowtel_guest_house_guests (
      first_name,last_name,email,auth_user_id,member_id,account_created_at,updated_at
    ) values (
      v_first_name,v_last_name,v_email,v_user_id,
      (select p.id from public.profiles p where p.id = v_user_id),
      now(),now()
    ) returning * into v_guest;
  else
    update public.flowtel_guest_house_guests
    set first_name = v_first_name,
        last_name = v_last_name,
        auth_user_id = v_user_id,
        member_id = coalesce(member_id,(select p.id from public.profiles p where p.id = v_user_id)),
        account_created_at = coalesce(account_created_at,now()),
        updated_at = now()
    where id = v_guest.id
    returning * into v_guest;
  end if;

  insert into public.flowtel_product_access (
    user_id,flowtel_access,caddie_magic_access,access_role,access_source
  ) values (
    v_user_id,false,false,'guest_house','guest-house-account'
  )
  on conflict (user_id) do nothing;

  select * into v_request
  from public.flowtel_guest_house_requests
  where guest_id = v_guest.id
    and status <> 'archived'
  order by created_at desc
  limit 1;

  if v_request.id is null then
    insert into public.flowtel_guest_house_requests (
      guest_id,call_date_hint,call_topic,requester_note,status,request_source,
      requester_confirmed_ownership,created_at,updated_at
    ) values (
      v_guest.id,null,v_memory,null,'locating','guest_house_account',true,now(),now()
    ) returning * into v_request;

    insert into public.flowtel_guest_house_events(request_id,event_type,event_context)
    values (v_request.id,'request_created',jsonb_build_object('source','guest_house_account'));
  end if;

  return query select v_request.id,v_request.status,v_request.created_at;
end;
$$;

revoke all on function public.flowtel_guest_house_submit_my_request(text,text,text,boolean) from public;
grant execute on function public.flowtel_guest_house_submit_my_request(text,text,text,boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Owner queue extension: account ownership is visible only to the owner
-- ---------------------------------------------------------------------------

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
  select
    r.id,
    g.id,
    g.first_name,
    g.last_name,
    g.email,
    g.member_id,
    g.auth_user_id,
    g.account_created_at,
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
      when 'locating' then 0
      when 'requested' then 0
      when 'preparing' then 0
      when 'ready' then 1
      when 'delivered' then 1
      when 'received' then 1
      when 'unable_to_locate' then 2
      else 3
    end,
    r.created_at desc;
end;
$$;

revoke all on function public.flowtel_guest_house_admin_get_queue() from public;
grant execute on function public.flowtel_guest_house_admin_get_queue() to authenticated;

comment on column public.flowtel_guest_house_guests.auth_user_id is
  'Remembered Supabase Auth identity for the private Guest House portal. This does not grant Flowtel membership and never claims a legacy request by email.';
comment on function public.flowtel_guest_house_submit_my_request(text,text,text,boolean) is
  'Creates one authenticated Guest House replay request using only first name, last name, and call memory.';
