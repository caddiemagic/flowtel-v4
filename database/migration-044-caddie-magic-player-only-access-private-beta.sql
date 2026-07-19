-- Caddie Magic v0.4.1 — Player-Only Access + Private Beta Invitations
--
-- Purpose:
-- 1. Give Caddie Magic players explicit Caddie-only product access.
-- 2. Prevent player-only accounts from reading or writing Flowtel data.
-- 3. Require an owner-created invitation for new Caddie Magic player accounts.
-- 4. Give the owner/admin a player invitation and access-management queue.
-- 5. Preserve all existing Flowtel and Caddie Magic users through a safe backfill.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Product access registry
-- ---------------------------------------------------------------------------

create table if not exists public.flowtel_product_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  flowtel_access boolean not null default false,
  caddie_magic_access boolean not null default false,
  access_role text not null default 'player'
    check (access_role in ('player','flowtel_member','practitioner','admin','owner')),
  access_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.flowtel_product_access is
  'Explicit product boundary for Flowtel and Caddie Magic. Player-only accounts have Caddie Magic access and no Flowtel access.';

alter table public.flowtel_product_access enable row level security;

drop policy if exists "Users can read their own product access" on public.flowtel_product_access;
create policy "Users can read their own product access"
  on public.flowtel_product_access
  for select
  using (user_id = auth.uid() or public.flowtel_current_user_is_admin_or_owner());

create or replace function public.flowtel_product_access_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists flowtel_product_access_set_updated_at on public.flowtel_product_access;
create trigger flowtel_product_access_set_updated_at
  before update on public.flowtel_product_access
  for each row execute function public.flowtel_product_access_set_updated_at();

-- Existing Flowtel users receive Flowtel access. Owner/admin accounts receive both.
insert into public.flowtel_product_access (
  user_id,
  flowtel_access,
  caddie_magic_access,
  access_role,
  access_source
)
select
  p.id,
  true,
  case when lower(coalesce(p.role,'')) in ('admin','owner') then true else false end,
  case
    when lower(coalesce(p.role,'')) = 'owner' then 'owner'
    when lower(coalesce(p.role,'')) = 'admin' then 'admin'
    when lower(coalesce(p.role,'')) = 'practitioner' then 'practitioner'
    else 'flowtel_member'
  end,
  'migration-044-flowtel-backfill'
from public.profiles p
on conflict (user_id) do update
set
  flowtel_access = true,
  caddie_magic_access = public.flowtel_product_access.caddie_magic_access
    or excluded.caddie_magic_access,
  access_role = case
    when excluded.access_role in ('owner','admin') then excluded.access_role
    when public.flowtel_product_access.access_role = 'player' then excluded.access_role
    else public.flowtel_product_access.access_role
  end,
  access_source = coalesce(public.flowtel_product_access.access_source, excluded.access_source),
  updated_at = now();

-- Existing Caddie Magic players receive Caddie Magic access without losing Flowtel access.
insert into public.flowtel_product_access (
  user_id,
  flowtel_access,
  caddie_magic_access,
  access_role,
  access_source
)
select
  cp.user_id,
  exists (
    select 1 from public.profiles p where p.id = cp.user_id
  ),
  true,
  case
    when exists (
      select 1 from public.profiles p
      where p.id = cp.user_id and lower(coalesce(p.role,'')) = 'owner'
    ) then 'owner'
    when exists (
      select 1 from public.profiles p
      where p.id = cp.user_id and lower(coalesce(p.role,'')) = 'admin'
    ) then 'admin'
    else 'player'
  end,
  'migration-044-caddie-backfill'
from public.caddie_magic_player_profiles cp
on conflict (user_id) do update
set
  caddie_magic_access = true,
  flowtel_access = public.flowtel_product_access.flowtel_access
    or excluded.flowtel_access,
  access_role = case
    when public.flowtel_product_access.access_role in ('owner','admin')
      then public.flowtel_product_access.access_role
    else excluded.access_role
  end,
  updated_at = now();

create or replace function public.flowtel_current_user_has_product_access(p_product text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_product text := lower(trim(coalesce(p_product,'')));
  v_access public.flowtel_product_access%rowtype;
  v_profile_role text;
begin
  if v_user_id is null then return false; end if;

  select * into v_access
  from public.flowtel_product_access
  where user_id = v_user_id;

  if v_access.user_id is not null then
    if v_access.access_role in ('owner','admin') then return true; end if;
    if v_product = 'flowtel' then return v_access.flowtel_access; end if;
    if v_product in ('caddie_magic','caddie-magic','caddie') then return v_access.caddie_magic_access; end if;
    return false;
  end if;

  -- Safe compatibility fallback for accounts created before this migration.
  select lower(coalesce(role,'')) into v_profile_role
  from public.profiles
  where id = v_user_id;

  if v_profile_role in ('owner','admin') then return true; end if;
  if v_product = 'flowtel' then
    return exists (select 1 from public.profiles where id = v_user_id);
  end if;
  if v_product in ('caddie_magic','caddie-magic','caddie') then
    return exists (select 1 from public.caddie_magic_player_profiles where user_id = v_user_id);
  end if;
  return false;
end;
$$;

revoke all on function public.flowtel_current_user_has_product_access(text) from public;
grant execute on function public.flowtel_current_user_has_product_access(text) to authenticated;

-- A new Flowtel account may claim Flowtel access only when it does not already
-- have an explicit Caddie-only access record.
create or replace function public.flowtel_claim_default_access()
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_access public.flowtel_product_access%rowtype;
begin
  if v_user_id is null then return false; end if;

  select * into v_access
  from public.flowtel_product_access
  where user_id = v_user_id
  for update;

  if v_access.user_id is null then
    insert into public.flowtel_product_access (
      user_id, flowtel_access, caddie_magic_access, access_role, access_source
    ) values (
      v_user_id, true, false, 'flowtel_member', 'flowtel-entry'
    );
    return true;
  end if;

  if v_access.flowtel_access then return true; end if;

  -- Never let an explicit player-only record self-upgrade through the Flowtel doorway.
  if v_access.caddie_magic_access and v_access.access_role = 'player' then
    return false;
  end if;

  update public.flowtel_product_access
  set flowtel_access = true,
      access_role = case when access_role = 'player' then 'flowtel_member' else access_role end,
      access_source = coalesce(access_source, 'flowtel-entry')
  where user_id = v_user_id;

  return true;
end;
$$;

revoke all on function public.flowtel_claim_default_access() from public;
grant execute on function public.flowtel_claim_default_access() to authenticated;

-- ---------------------------------------------------------------------------
-- Caddie Magic private beta invitations
-- ---------------------------------------------------------------------------

create table if not exists public.caddie_magic_player_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  first_name text,
  last_name text,
  invite_code text not null unique,
  status text not null default 'invited'
    check (status in ('invited','claimed','revoked','expired')),
  invited_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz,
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists caddie_magic_player_invitations_active_email_idx
  on public.caddie_magic_player_invitations (lower(email))
  where status = 'invited';

alter table public.caddie_magic_player_invitations enable row level security;

drop policy if exists "Owner can read Caddie Magic invitations" on public.caddie_magic_player_invitations;
create policy "Owner can read Caddie Magic invitations"
  on public.caddie_magic_player_invitations
  for select
  using (public.flowtel_current_user_is_admin_or_owner());

create or replace function public.caddie_magic_validate_player_invitation(
  p_email text,
  p_invite_code text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.caddie_magic_player_invitations i
    where lower(i.email) = lower(trim(coalesce(p_email,'')))
      and i.invite_code = trim(coalesce(p_invite_code,''))
      and i.status = 'invited'
      and (i.expires_at is null or i.expires_at > now())
  );
$$;

revoke all on function public.caddie_magic_validate_player_invitation(text,text) from public;
grant execute on function public.caddie_magic_validate_player_invitation(text,text) to anon, authenticated;


create or replace function public.caddie_magic_claim_player_invitation(p_invite_code text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_invite public.caddie_magic_player_invitations%rowtype;
  v_existing_role text;
begin
  if v_user_id is null then return false; end if;

  select lower(email) into v_email from auth.users where id = v_user_id;

  select * into v_invite
  from public.caddie_magic_player_invitations
  where lower(email) = v_email
    and invite_code = trim(coalesce(p_invite_code,''))
    and status = 'invited'
    and (expires_at is null or expires_at > now())
  for update;

  if v_invite.id is null then return false; end if;

  select access_role into v_existing_role
  from public.flowtel_product_access
  where user_id = v_user_id;

  insert into public.flowtel_product_access (
    user_id, flowtel_access, caddie_magic_access, access_role, access_source
  ) values (
    v_user_id,
    exists (select 1 from public.profiles where id = v_user_id),
    true,
    case when v_existing_role in ('owner','admin','practitioner','flowtel_member') then v_existing_role else 'player' end,
    'caddie-magic-private-beta-invitation'
  )
  on conflict (user_id) do update
  set caddie_magic_access = true,
      access_source = 'caddie-magic-private-beta-invitation',
      updated_at = now();

  update public.caddie_magic_player_invitations
  set status = 'claimed', claimed_by = v_user_id, claimed_at = now(), updated_at = now()
  where id = v_invite.id;

  return true;
end;
$$;

revoke all on function public.caddie_magic_claim_player_invitation(text) from public;
grant execute on function public.caddie_magic_claim_player_invitation(text) to authenticated;

create or replace function public.caddie_magic_create_player_invitation(
  p_email text,
  p_first_name text default null,
  p_last_name text default null,
  p_expires_at timestamptz default null
)
returns public.caddie_magic_player_invitations
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text := lower(trim(coalesce(p_email,'')));
  v_invite public.caddie_magic_player_invitations%rowtype;
begin
  if not public.flowtel_current_user_is_admin_or_owner() then
    raise exception 'Owner access is required to invite Caddie Magic players.' using errcode = '42501';
  end if;
  if v_email = '' or position('@' in v_email) = 0 then
    raise exception 'Enter a valid player email.' using errcode = '22023';
  end if;

  update public.caddie_magic_player_invitations
  set status = 'revoked', updated_at = now()
  where lower(email) = v_email and status = 'invited';

  insert into public.caddie_magic_player_invitations (
    email, first_name, last_name, invite_code, status, invited_by, expires_at
  ) values (
    v_email,
    nullif(trim(coalesce(p_first_name,'')),''),
    nullif(trim(coalesce(p_last_name,'')),''),
    encode(gen_random_bytes(18),'hex'),
    'invited',
    auth.uid(),
    p_expires_at
  ) returning * into v_invite;

  return v_invite;
end;
$$;

revoke all on function public.caddie_magic_create_player_invitation(text,text,text,timestamptz) from public;
grant execute on function public.caddie_magic_create_player_invitation(text,text,text,timestamptz) to authenticated;

create or replace function public.caddie_magic_revoke_player_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.flowtel_current_user_is_admin_or_owner() then
    raise exception 'Owner access is required.' using errcode = '42501';
  end if;
  update public.caddie_magic_player_invitations
  set status = 'revoked', updated_at = now()
  where id = p_invitation_id and status = 'invited';
end;
$$;

revoke all on function public.caddie_magic_revoke_player_invitation(uuid) from public;
grant execute on function public.caddie_magic_revoke_player_invitation(uuid) to authenticated;

create or replace function public.caddie_magic_list_player_access()
returns table (
  user_id uuid,
  player_profile_id uuid,
  player_name text,
  email text,
  caddie_magic_access boolean,
  flowtel_access boolean,
  access_role text,
  access_source text,
  activated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.user_id,
    cp.id as player_profile_id,
    nullif(trim(concat_ws(' ',cp.first_name,cp.last_name)),'') as player_name,
    coalesce(cp.email,u.email) as email,
    a.caddie_magic_access,
    a.flowtel_access,
    a.access_role,
    a.access_source,
    a.created_at as activated_at
  from public.flowtel_product_access a
  join auth.users u on u.id = a.user_id
  left join public.caddie_magic_player_profiles cp on cp.user_id = a.user_id
  where public.flowtel_current_user_is_admin_or_owner()
    and a.caddie_magic_access = true
    and a.access_role not in ('owner','admin')
  order by coalesce(cp.first_name,u.email), coalesce(cp.last_name,'');
$$;

revoke all on function public.caddie_magic_list_player_access() from public;
grant execute on function public.caddie_magic_list_player_access() to authenticated;

create or replace function public.caddie_magic_list_player_invitations()
returns table (
  invitation_id uuid,
  email text,
  first_name text,
  last_name text,
  invite_code text,
  status text,
  expires_at timestamptz,
  claimed_by uuid,
  claimed_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.id, i.email, i.first_name, i.last_name, i.invite_code,
    case when i.status = 'invited' and i.expires_at is not null and i.expires_at <= now()
      then 'expired' else i.status end as status,
    i.expires_at, i.claimed_by, i.claimed_at, i.created_at
  from public.caddie_magic_player_invitations i
  where public.flowtel_current_user_is_admin_or_owner()
  order by i.created_at desc;
$$;

revoke all on function public.caddie_magic_list_player_invitations() from public;
grant execute on function public.caddie_magic_list_player_invitations() to authenticated;

create or replace function public.caddie_magic_set_player_access(
  p_user_id uuid,
  p_enabled boolean
)
returns public.flowtel_product_access
language plpgsql
security definer
set search_path = public
as $$
declare
  v_access public.flowtel_product_access%rowtype;
begin
  if not public.flowtel_current_user_is_admin_or_owner() then
    raise exception 'Owner access is required.' using errcode = '42501';
  end if;

  update public.flowtel_product_access
  set caddie_magic_access = coalesce(p_enabled,false),
      updated_at = now()
  where user_id = p_user_id
    and access_role not in ('owner','admin')
  returning * into v_access;

  if v_access.user_id is null then
    raise exception 'Player access record not found.' using errcode = '22023';
  end if;
  return v_access;
end;
$$;

revoke all on function public.caddie_magic_set_player_access(uuid,boolean) from public;
grant execute on function public.caddie_magic_set_player_access(uuid,boolean) to authenticated;

-- Claim an invitation automatically when Supabase creates the auth user.
create or replace function public.caddie_magic_claim_invitation_on_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_code text := trim(coalesce(new.raw_user_meta_data->>'caddie_invite_code',''));
  v_invite public.caddie_magic_player_invitations%rowtype;
begin
  if v_code = '' then return new; end if;

  select * into v_invite
  from public.caddie_magic_player_invitations
  where lower(email) = lower(new.email)
    and invite_code = v_code
    and status = 'invited'
    and (expires_at is null or expires_at > now())
  for update;

  if v_invite.id is null then return new; end if;

  insert into public.flowtel_product_access (
    user_id, flowtel_access, caddie_magic_access, access_role, access_source
  ) values (
    new.id, false, true, 'player', 'caddie-magic-private-beta-invitation'
  )
  on conflict (user_id) do update
  set caddie_magic_access = true,
      access_role = case
        when public.flowtel_product_access.access_role in ('owner','admin')
          then public.flowtel_product_access.access_role
        else 'player'
      end,
      access_source = 'caddie-magic-private-beta-invitation',
      updated_at = now();

  update public.caddie_magic_player_invitations
  set status = 'claimed',
      claimed_by = new.id,
      claimed_at = now(),
      updated_at = now()
  where id = v_invite.id;

  return new;
end;
$$;

drop trigger if exists caddie_magic_claim_invitation_after_auth_user on auth.users;
create trigger caddie_magic_claim_invitation_after_auth_user
  after insert on auth.users
  for each row execute function public.caddie_magic_claim_invitation_on_auth_user();

-- ---------------------------------------------------------------------------
-- Restrictive product-boundary RLS policies
-- These policies combine with existing policies and prevent player-only accounts
-- from reading or writing Flowtel rows, even when a permissive policy exists.
-- ---------------------------------------------------------------------------

do $$
declare
  v_table text;
  v_flowtel_tables text[] := array[
    'profiles',
    'flowtel_stays',
    'flowtel_reflections',
    'flowtel_practitioner_relationships',
    'flowtel_practitioner_clock_sessions',
    'flow_fm_assignment_submissions',
    'flow_fm_priestess_profiles',
    'flowtel_moonbox_messages',
    'flowtel_moonbox_witnesses'
  ];
  v_caddie_tables text[] := array[
    'caddie_magic_player_profiles',
    'caddie_magic_round_logs',
    'caddie_magic_player_notes',
    'caddie_magic_review_requests',
    'caddie_magic_compasses',
    'caddie_magic_compass_assignments',
    'caddie_magic_compass_dispatches',
    'caddie_magic_upcoming_golf_events'
  ];
begin
  foreach v_table in array v_flowtel_tables loop
    if to_regclass('public.' || v_table) is not null then
      execute format('alter table public.%I enable row level security', v_table);
      execute format('drop policy if exists %I on public.%I', 'Flowtel product access required', v_table);
      execute format(
        'create policy %I on public.%I as restrictive for all to authenticated using (public.flowtel_current_user_has_product_access(''flowtel'')) with check (public.flowtel_current_user_has_product_access(''flowtel''))',
        'Flowtel product access required', v_table
      );
    end if;
  end loop;

  foreach v_table in array v_caddie_tables loop
    if to_regclass('public.' || v_table) is not null then
      execute format('alter table public.%I enable row level security', v_table);
      execute format('drop policy if exists %I on public.%I', 'Caddie Magic product access required', v_table);
      execute format(
        'create policy %I on public.%I as restrictive for all to authenticated using (public.flowtel_current_user_has_product_access(''caddie_magic'')) with check (public.flowtel_current_user_has_product_access(''caddie_magic''))',
        'Caddie Magic product access required', v_table
      );
    end if;
  end loop;
end;
$$;
