-- Flowtel v0.10.69 — Member Integrity + Guest Profiles
--
-- Purpose:
-- 1. Add a private guest profile foundation with required identity, location,
--    timezone, and one-time post-release confirmation.
-- 2. Give the Phase 1 owner a complete Flowtel member directory with separate
--    last-sign-in and last-check-in intelligence.
-- 3. Add membership-verification records without automatically revoking anyone.
-- 4. Add durable Flowtel-only revoke/restore controls with append-only audit.
-- 5. Preserve Caddie Magic, Guest House, Auth accounts, passwords, sessions,
--    stays, cycle history, mentor relationships, and all historical records.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Phase 1 owner boundary
-- ---------------------------------------------------------------------------

create or replace function public.flowtel_current_user_is_phase_one_owner()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.email, '')) = 'mm.johnson@icloud.com'
      and lower(coalesce(p.role, '')) in ('owner', 'admin')
      and coalesce(p.concierge_access_enabled, false) = true
  );
$$;

revoke all on function public.flowtel_current_user_is_phase_one_owner() from public;
grant execute on function public.flowtel_current_user_is_phase_one_owner() to authenticated;

-- ---------------------------------------------------------------------------
-- Guest profile foundation
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists location text,
  add column if not exists timezone text not null default 'America/Los_Angeles',
  add column if not exists profile_confirmation_required boolean not null default true,
  add column if not exists profile_confirmation_version integer not null default 1,
  add column if not exists profile_confirmed_at timestamptz;

comment on column public.profiles.location is
  'Private member-entered city/region/country used for scheduling and matching; never a street address.';
comment on column public.profiles.timezone is
  'IANA timezone selected by the member for scheduling and matching.';
comment on column public.profiles.profile_confirmation_required is
  'When true, the member receives a gentle profile-confirmation prompt on her next Flowtel entrance.';
comment on column public.profiles.profile_confirmed_at is
  'Most recent time the member confirmed required guest-profile fields.';

-- Preserve existing practitioner profile data where available. The canonical
-- profiles table remains the shared private identity source for every member.
update public.profiles p
set location = coalesce(nullif(trim(p.location), ''), nullif(trim(pp.location), '')),
    timezone = coalesce(nullif(trim(pp.timezone), ''), nullif(trim(p.timezone), ''), 'America/Los_Angeles')
from public.flow_fm_priestess_profiles pp
where pp.member_id = p.id
  and (
    nullif(trim(coalesce(p.location, '')), '') is null
    or nullif(trim(coalesce(pp.timezone, '')), '') is not null
  );

create or replace function public.flowtel_update_my_guest_profile(
  p_first_name text,
  p_last_name text,
  p_display_name text,
  p_location text,
  p_timezone text
)
returns public.profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_first_name text := nullif(trim(coalesce(p_first_name, '')), '');
  v_last_name text := nullif(trim(coalesce(p_last_name, '')), '');
  v_display_name text := nullif(trim(coalesce(p_display_name, '')), '');
  v_location text := nullif(trim(coalesce(p_location, '')), '');
  v_timezone text := nullif(trim(coalesce(p_timezone, '')), '');
  v_profile public.profiles%rowtype;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to tend your Flowtel profile.' using errcode = '28000';
  end if;

  if v_first_name is null then
    raise exception 'Add your first name.' using errcode = '22023';
  end if;
  if v_last_name is null then
    raise exception 'Add your last name.' using errcode = '22023';
  end if;
  if v_display_name is null then
    raise exception 'Add the name you want shown in the Queendom.' using errcode = '22023';
  end if;
  if v_location is null then
    raise exception 'Add your city, region, or country.' using errcode = '22023';
  end if;
  if v_timezone is null or not exists (
    select 1 from pg_timezone_names t where t.name = v_timezone
  ) then
    raise exception 'Choose a valid timezone.' using errcode = '22023';
  end if;

  if char_length(v_first_name) > 100
     or char_length(v_last_name) > 100
     or char_length(v_display_name) > 140
     or char_length(v_location) > 180
     or char_length(v_timezone) > 100 then
    raise exception 'One or more profile fields are longer than the supported limit.' using errcode = '22001';
  end if;

  update public.profiles p
  set first_name = v_first_name,
      last_name = v_last_name,
      display_name = v_display_name,
      location = v_location,
      timezone = v_timezone,
      profile_confirmation_required = false,
      profile_confirmation_version = 1,
      profile_confirmed_at = now(),
      source_updated_at = now()
  where p.id = v_user_id
  returning p.* into v_profile;

  if not found then
    raise exception 'Flowtel profile not found.' using errcode = 'P0002';
  end if;

  update public.flow_fm_priestess_profiles pp
  set priestess_name = v_display_name,
      legal_name = trim(concat_ws(' ', v_first_name, v_last_name)),
      location = v_location,
      timezone = v_timezone,
      updated_at = now()
  where pp.member_id = v_user_id;

  update auth.users u
  set raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
        'first_name', v_first_name,
        'last_name', v_last_name,
        'display_name', v_display_name,
        'full_name', v_display_name,
        'name', v_display_name,
        'location', v_location,
        'timezone', v_timezone,
        'flowtel_profile_confirmed_at', now()
      ),
      updated_at = now()
  where u.id = v_user_id;

  return v_profile;
end;
$$;

revoke all on function public.flowtel_update_my_guest_profile(text,text,text,text,text) from public;
grant execute on function public.flowtel_update_my_guest_profile(text,text,text,text,text) to authenticated;

-- ---------------------------------------------------------------------------
-- Verification and durable access status
-- ---------------------------------------------------------------------------

alter table public.flowtel_product_access
  add column if not exists flowtel_access_status text,
  add column if not exists flowtel_revoked_at timestamptz,
  add column if not exists flowtel_revoked_by uuid references auth.users(id) on delete set null,
  add column if not exists flowtel_revocation_reason text;

update public.flowtel_product_access
set flowtel_access_status = case when flowtel_access then 'active' else 'not_granted' end
where flowtel_access_status is null;

alter table public.flowtel_product_access
  alter column flowtel_access_status set default 'not_granted',
  alter column flowtel_access_status set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'flowtel_product_access_status_check'
      and conrelid = 'public.flowtel_product_access'::regclass
  ) then
    alter table public.flowtel_product_access
      add constraint flowtel_product_access_status_check
      check (flowtel_access_status in ('active', 'not_granted', 'revoked'));
  end if;
end;
$$;

create index if not exists flowtel_product_access_flowtel_status_idx
  on public.flowtel_product_access(flowtel_access_status, flowtel_access);

create table if not exists public.flowtel_member_verifications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  verification_status text not null default 'needs_review'
    check (verification_status in (
      'queendom_verified',
      'flowfm_verified',
      'council_verified',
      'contact_found',
      'not_found',
      'inactive',
      'email_mismatch',
      'needs_review',
      'manually_verified'
    )),
  verified_membership_type text
    check (verified_membership_type is null or verified_membership_type in ('queendom', 'flowfm', 'council')),
  verification_source text not null default 'owner_review',
  source_email text,
  squarespace_contact_id text,
  checked_at timestamptz not null default now(),
  checked_by uuid references auth.users(id) on delete set null,
  owner_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.flowtel_access_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('revoked', 'restored')),
  previous_flowtel_access boolean not null,
  resulting_flowtel_access boolean not null,
  previous_access_status text,
  resulting_access_status text not null,
  reason text,
  acted_by uuid not null references auth.users(id) on delete restrict,
  acted_at timestamptz not null default now()
);

create index if not exists flowtel_member_verifications_status_idx
  on public.flowtel_member_verifications(verification_status, checked_at desc);
create index if not exists flowtel_access_audit_user_idx
  on public.flowtel_access_audit_log(user_id, acted_at desc);

alter table public.flowtel_member_verifications enable row level security;
alter table public.flowtel_access_audit_log enable row level security;

drop policy if exists "Owner reads Flowtel member verifications" on public.flowtel_member_verifications;
create policy "Owner reads Flowtel member verifications"
  on public.flowtel_member_verifications for select
  using (public.flowtel_current_user_is_phase_one_owner());

drop policy if exists "Owner reads Flowtel access audit" on public.flowtel_access_audit_log;
create policy "Owner reads Flowtel access audit"
  on public.flowtel_access_audit_log for select
  using (public.flowtel_current_user_is_phase_one_owner());

revoke insert, update, delete on public.flowtel_member_verifications from anon, authenticated;
revoke insert, update, delete on public.flowtel_access_audit_log from anon, authenticated;
grant select on public.flowtel_member_verifications to authenticated;
grant select on public.flowtel_access_audit_log to authenticated;

create or replace function public.flowtel_admin_set_member_verification(
  p_user_id uuid,
  p_verification_status text,
  p_verified_membership_type text default null,
  p_owner_note text default null
)
returns public.flowtel_member_verifications
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_status text := lower(trim(coalesce(p_verification_status, '')));
  v_membership text := nullif(lower(trim(coalesce(p_verified_membership_type, ''))), '');
  v_profile public.profiles%rowtype;
  v_row public.flowtel_member_verifications%rowtype;
begin
  if not public.flowtel_current_user_is_phase_one_owner() then
    raise exception 'Only the Flowtel owner may verify a member.' using errcode = '42501';
  end if;

  if v_status not in (
    'queendom_verified', 'flowfm_verified', 'council_verified',
    'contact_found', 'not_found', 'inactive', 'email_mismatch',
    'needs_review', 'manually_verified'
  ) then
    raise exception 'Choose a supported verification status.' using errcode = '22023';
  end if;

  if v_membership is not null and v_membership not in ('queendom', 'flowfm', 'council') then
    raise exception 'Choose Queendom, Flow FM, or Council.' using errcode = '22023';
  end if;

  -- Keep explicit verification labels and their membership levels coherent.
  if v_status = 'queendom_verified' then v_membership := 'queendom'; end if;
  if v_status = 'flowfm_verified' then v_membership := 'flowfm'; end if;
  if v_status = 'council_verified' then v_membership := 'council'; end if;
  if v_status = 'manually_verified' and v_membership is null then
    raise exception 'Choose the membership level for a manually verified member.' using errcode = '22023';
  end if;
  if v_status not in ('queendom_verified', 'flowfm_verified', 'council_verified', 'manually_verified') then
    v_membership := null;
  end if;

  select * into v_profile from public.profiles where id = p_user_id;
  if v_profile.id is null then
    raise exception 'Flowtel member not found.' using errcode = 'P0002';
  end if;

  insert into public.flowtel_member_verifications (
    user_id, verification_status, verified_membership_type,
    verification_source, source_email, squarespace_contact_id,
    checked_at, checked_by, owner_note
  ) values (
    p_user_id, v_status, v_membership,
    'owner_review', lower(v_profile.email), v_profile.squarespace_contact_id,
    now(), auth.uid(), nullif(trim(coalesce(p_owner_note, '')), '')
  )
  on conflict (user_id) do update
  set verification_status = excluded.verification_status,
      verified_membership_type = excluded.verified_membership_type,
      verification_source = excluded.verification_source,
      source_email = excluded.source_email,
      squarespace_contact_id = excluded.squarespace_contact_id,
      checked_at = excluded.checked_at,
      checked_by = excluded.checked_by,
      owner_note = excluded.owner_note,
      updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.flowtel_admin_set_member_verification(uuid,text,text,text) from public;
grant execute on function public.flowtel_admin_set_member_verification(uuid,text,text,text) to authenticated;

create or replace function public.flowtel_admin_revoke_member_access(
  p_user_id uuid,
  p_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_target public.profiles%rowtype;
  v_access public.flowtel_product_access%rowtype;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  if not public.flowtel_current_user_is_phase_one_owner() then
    raise exception 'Only the Flowtel owner may revoke member access.' using errcode = '42501';
  end if;

  select * into v_target from public.profiles where id = p_user_id;
  if v_target.id is null then
    raise exception 'Flowtel member not found.' using errcode = 'P0002';
  end if;

  if lower(coalesce(v_target.email, '')) = 'mm.johnson@icloud.com'
     or lower(coalesce(v_target.role, '')) = 'owner' then
    raise exception 'The Flowtel owner account cannot be revoked.' using errcode = '42501';
  end if;

  select * into v_access
  from public.flowtel_product_access
  where user_id = p_user_id
  for update;

  if v_access.user_id is null then
    insert into public.flowtel_product_access (
      user_id, flowtel_access, caddie_magic_access, access_role,
      access_source, flowtel_access_status, flowtel_revoked_at,
      flowtel_revoked_by, flowtel_revocation_reason
    ) values (
      p_user_id, false, false,
      case when lower(coalesce(v_target.role, '')) = 'practitioner' then 'practitioner' else 'flowtel_member' end,
      'owner-revocation', 'revoked', now(), auth.uid(), v_reason
    ) returning * into v_access;

    insert into public.flowtel_access_audit_log (
      user_id, action, previous_flowtel_access, resulting_flowtel_access,
      previous_access_status, resulting_access_status, reason, acted_by
    ) values (
      p_user_id, 'revoked', false, false,
      'not_granted', 'revoked', v_reason, auth.uid()
    );
    return true;
  end if;

  if v_access.flowtel_access_status = 'revoked' and not v_access.flowtel_access then
    return true;
  end if;

  insert into public.flowtel_access_audit_log (
    user_id, action, previous_flowtel_access, resulting_flowtel_access,
    previous_access_status, resulting_access_status, reason, acted_by
  ) values (
    p_user_id, 'revoked', v_access.flowtel_access, false,
    v_access.flowtel_access_status, 'revoked', v_reason, auth.uid()
  );

  update public.flowtel_product_access
  set flowtel_access = false,
      flowtel_access_status = 'revoked',
      flowtel_revoked_at = now(),
      flowtel_revoked_by = auth.uid(),
      flowtel_revocation_reason = v_reason
  where user_id = p_user_id;

  return true;
end;
$$;

revoke all on function public.flowtel_admin_revoke_member_access(uuid,text) from public;
grant execute on function public.flowtel_admin_revoke_member_access(uuid,text) to authenticated;

create or replace function public.flowtel_admin_restore_member_access(
  p_user_id uuid,
  p_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_target public.profiles%rowtype;
  v_access public.flowtel_product_access%rowtype;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  if not public.flowtel_current_user_is_phase_one_owner() then
    raise exception 'Only the Flowtel owner may restore member access.' using errcode = '42501';
  end if;

  select * into v_target from public.profiles where id = p_user_id;
  if v_target.id is null then
    raise exception 'Flowtel member not found.' using errcode = 'P0002';
  end if;

  select * into v_access
  from public.flowtel_product_access
  where user_id = p_user_id
  for update;

  if v_access.user_id is null then
    insert into public.flowtel_product_access (
      user_id, flowtel_access, caddie_magic_access, access_role,
      access_source, flowtel_access_status
    ) values (
      p_user_id, true, false,
      case
        when lower(coalesce(v_target.role, '')) = 'admin' then 'admin'
        when lower(coalesce(v_target.role, '')) = 'practitioner' then 'practitioner'
        else 'flowtel_member'
      end,
      'owner-restoration', 'active'
    ) returning * into v_access;

    insert into public.flowtel_access_audit_log (
      user_id, action, previous_flowtel_access, resulting_flowtel_access,
      previous_access_status, resulting_access_status, reason, acted_by
    ) values (
      p_user_id, 'restored', false, true,
      'not_granted', 'active', v_reason, auth.uid()
    );
    return true;
  end if;

  if v_access.flowtel_access and v_access.flowtel_access_status = 'active' then
    return true;
  end if;

  insert into public.flowtel_access_audit_log (
    user_id, action, previous_flowtel_access, resulting_flowtel_access,
    previous_access_status, resulting_access_status, reason, acted_by
  ) values (
    p_user_id, 'restored', v_access.flowtel_access, true,
    v_access.flowtel_access_status, 'active', v_reason, auth.uid()
  );

  update public.flowtel_product_access
  set flowtel_access = true,
      flowtel_access_status = 'active',
      access_role = case
        when access_role = 'player' and lower(coalesce(v_target.role, '')) = 'admin' then 'admin'
        when access_role = 'player' and lower(coalesce(v_target.role, '')) = 'practitioner' then 'practitioner'
        when access_role = 'player' then 'flowtel_member'
        else access_role
      end,
      flowtel_revoked_at = null,
      flowtel_revoked_by = null,
      flowtel_revocation_reason = null
  where user_id = p_user_id;

  return true;
end;
$$;

revoke all on function public.flowtel_admin_restore_member_access(uuid,text) from public;
grant execute on function public.flowtel_admin_restore_member_access(uuid,text) to authenticated;

-- Durable revocation: ordinary Flowtel entry may still claim first-time access,
-- but it can never silently restore an owner-revoked account.
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
      user_id, flowtel_access, caddie_magic_access, access_role,
      access_source, flowtel_access_status
    ) values (
      v_user_id, true, false, 'flowtel_member', 'flowtel-entry', 'active'
    );
    return true;
  end if;

  if v_access.flowtel_access_status = 'revoked' then return false; end if;
  if v_access.flowtel_access then return true; end if;

  -- Never let an explicit Player-only account self-upgrade through Flowtel.
  if v_access.caddie_magic_access and v_access.access_role = 'player' then
    return false;
  end if;

  update public.flowtel_product_access
  set flowtel_access = true,
      flowtel_access_status = 'active',
      access_role = case when access_role = 'player' then 'flowtel_member' else access_role end,
      access_source = coalesce(access_source, 'flowtel-entry')
  where user_id = v_user_id;

  return true;
end;
$$;

revoke all on function public.flowtel_claim_default_access() from public;
grant execute on function public.flowtel_claim_default_access() to authenticated;

-- ---------------------------------------------------------------------------
-- Owner member directory
-- ---------------------------------------------------------------------------

create or replace function public.flowtel_admin_get_member_directory(
  p_access_filter text default 'all'
)
returns table (
  user_id uuid,
  first_name text,
  last_name text,
  display_name text,
  email text,
  role text,
  membership_type text,
  membership_rank integer,
  access_role text,
  flowtel_access boolean,
  caddie_magic_access boolean,
  access_status text,
  verification_status text,
  verified_membership_type text,
  verification_source text,
  verification_note text,
  squarespace_contact_id text,
  squarespace_verified_at timestamptz,
  last_sign_in_at timestamptz,
  last_checkin_date date,
  last_checked_in_at timestamptz,
  profile_confirmation_required boolean,
  profile_confirmed_at timestamptz,
  location text,
  timezone text,
  revoked_at timestamptz,
  revoked_by_name text,
  revocation_reason text
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_filter text := lower(trim(coalesce(p_access_filter, 'all')));
begin
  if not public.flowtel_current_user_is_phase_one_owner() then
    raise exception 'Only the Flowtel owner may open the member directory.' using errcode = '42501';
  end if;

  if v_filter not in ('all', 'active', 'revoked') then
    v_filter := 'all';
  end if;

  return query
  select
    p.id as user_id,
    p.first_name,
    p.last_name,
    public.flowtel_resolve_display_name(p.display_name, p.first_name, p.last_name, p.email, 'Flowtel Guest') as display_name,
    p.email,
    p.role,
    p.membership_type,
    coalesce(p.membership_rank, 0)::integer,
    coalesce(a.access_role,
      case
        when lower(coalesce(p.role, '')) = 'owner' then 'owner'
        when lower(coalesce(p.role, '')) = 'admin' then 'admin'
        when lower(coalesce(p.role, '')) = 'practitioner' then 'practitioner'
        else 'flowtel_member'
      end
    ) as access_role,
    coalesce(a.flowtel_access, false) as flowtel_access,
    coalesce(a.caddie_magic_access, false) as caddie_magic_access,
    coalesce(a.flowtel_access_status, case when coalesce(a.flowtel_access, false) then 'active' else 'not_granted' end) as access_status,
    coalesce(
      v.verification_status,
      case
        when nullif(lower(trim(coalesce(p.squarespace_contact_email, ''))), '') is not null
          and lower(trim(p.squarespace_contact_email)) <> lower(trim(coalesce(p.email, '')))
          then 'email_mismatch'
        when p.squarespace_contact_id is not null and p.squarespace_verified_at is not null
          then 'contact_found'
        when lower(coalesce(p.squarespace_source, '')) like '%trusted%'
          or (p.squarespace_source is not null and p.squarespace_contact_id is null)
          then 'needs_review'
        else 'not_found'
      end
    ) as verification_status,
    coalesce(v.verified_membership_type,
      case
        when coalesce(p.membership_rank, 0) >= 3 then 'council'
        when coalesce(p.membership_rank, 0) >= 2 then 'flowfm'
        when coalesce(p.membership_rank, 0) >= 1 then 'queendom'
        else null
      end
    ) as verified_membership_type,
    coalesce(v.verification_source,
      case when p.squarespace_contact_id is not null then 'squarespace_contacts' else 'profile_evidence' end
    ) as verification_source,
    v.owner_note as verification_note,
    p.squarespace_contact_id,
    p.squarespace_verified_at,
    u.last_sign_in_at,
    latest_stay.stay_date as last_checkin_date,
    latest_stay.checked_in_at as last_checked_in_at,
    coalesce(p.profile_confirmation_required, true),
    p.profile_confirmed_at,
    p.location,
    p.timezone,
    a.flowtel_revoked_at as revoked_at,
    public.flowtel_resolve_display_name(rp.display_name, rp.first_name, rp.last_name, rp.email, 'Flowtel Owner') as revoked_by_name,
    a.flowtel_revocation_reason as revocation_reason
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.flowtel_product_access a on a.user_id = p.id
  left join public.flowtel_member_verifications v on v.user_id = p.id
  left join public.profiles rp on rp.id = a.flowtel_revoked_by
  left join lateral (
    select
      coalesce(s.checkin_date::date, (timezone('America/Los_Angeles', coalesce(s.checked_in_at, s.created_at)))::date) as stay_date,
      coalesce(s.checked_in_at, s.created_at) as checked_in_at
    from public.flowtel_stays s
    where s.client_id = p.id
    order by coalesce(s.checked_in_at, s.created_at) desc
    limit 1
  ) latest_stay on true
  where
    v_filter = 'all'
    or (v_filter = 'active' and coalesce(a.flowtel_access, false) = true and coalesce(a.flowtel_access_status, 'not_granted') <> 'revoked')
    or (v_filter = 'revoked' and coalesce(a.flowtel_access_status, '') = 'revoked')
  order by
    case when coalesce(a.flowtel_access_status, 'active') = 'revoked' then 1 else 0 end,
    lower(public.flowtel_resolve_display_name(p.display_name, p.first_name, p.last_name, p.email, 'Flowtel Guest'));
end;
$$;

revoke all on function public.flowtel_admin_get_member_directory(text) from public;
grant execute on function public.flowtel_admin_get_member_directory(text) to authenticated;
