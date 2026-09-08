-- Flowtel v0.10.88 — 14-Day Complimentary Stay
--
-- Adds a one-time, server-authorized 14-day Flowtel stay for people who have
-- not yet joined the Queendom. A complimentary stay grants the personal
-- Flowtel experience, but it is not a Queendom membership and never raises the
-- member's membership rank. When the stay ends, the Auth identity and all
-- Flowtel history remain intact while product access closes. A later verified
-- Queendom / Flow FM purchase reopens the same account and preserves history.

begin;

-- ---------------------------------------------------------------------------
-- Durable trial state lives on the existing product-access boundary.
-- ---------------------------------------------------------------------------

alter table public.flowtel_product_access
  add column if not exists flowtel_trial_started_at timestamptz,
  add column if not exists flowtel_trial_ends_at timestamptz,
  add column if not exists flowtel_trial_converted_at timestamptz;

create index if not exists flowtel_product_access_trial_end_idx
  on public.flowtel_product_access(flowtel_trial_ends_at)
  where flowtel_trial_started_at is not null
    and flowtel_trial_converted_at is null;

comment on column public.flowtel_product_access.flowtel_trial_started_at is
  'Start of the one-time 14-day Flowtel Complimentary Stay. Preserved after expiry or membership conversion.';
comment on column public.flowtel_product_access.flowtel_trial_ends_at is
  'Exact end timestamp for the one-time 14-day Flowtel Complimentary Stay.';
comment on column public.flowtel_product_access.flowtel_trial_converted_at is
  'Set when a complimentary-stay account is converted to verified Queendom / Flow FM membership access.';

-- ---------------------------------------------------------------------------
-- Server-only trial admissions.
--
-- Public Supabase signup is never enough to grant a trial. The existing
-- squarespace-bridge server function creates a short-lived admission first.
-- Auth then proves control of the exact email before
-- flowtel_claim_default_access() consumes it. claimed_at is deliberately kept
-- forever so the same email cannot silently restart another 14-day stay.
-- ---------------------------------------------------------------------------

create table if not exists public.flowtel_trial_admissions (
  email text primary key,
  admission_expires_at timestamptz not null default (now() + interval '24 hours'),
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists flowtel_trial_admissions_pending_idx
  on public.flowtel_trial_admissions(admission_expires_at)
  where claimed_at is null;

alter table public.flowtel_trial_admissions enable row level security;
revoke all on public.flowtel_trial_admissions from anon, authenticated;

comment on table public.flowtel_trial_admissions is
  'Server-only proof for the one-time 14-day Flowtel Complimentary Stay. claimed_at is the durable do-not-reset marker; the browser cannot read or write this table.';

-- ---------------------------------------------------------------------------
-- Expiry-aware product access.
--
-- This helper is used by security-definer RPCs throughout Flowtel. It must
-- refuse an expired complimentary stay even when the browser has not visited
-- /client/ yet to let the claim function persist the expired state.
-- ---------------------------------------------------------------------------

create or replace function public.flowtel_current_user_has_product_access(p_product text)
returns boolean
language plpgsql
stable
security definer
set search_path=public,auth
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

    if v_product = 'flowtel' then
      if not coalesce(v_access.flowtel_access,false) then return false; end if;
      if v_access.flowtel_trial_started_at is not null
         and v_access.flowtel_trial_converted_at is null
         and v_access.flowtel_trial_ends_at is not null
         and v_access.flowtel_trial_ends_at <= now() then
        return false;
      end if;
      return true;
    end if;

    if v_product in ('caddie_magic','caddie-magic','caddie') then
      return v_access.caddie_magic_access;
    end if;
    return false;
  end if;

  -- Safe compatibility fallback for accounts created before product-access
  -- rows became canonical. A real product-access row always wins above.
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

-- ---------------------------------------------------------------------------
-- Claim boundary: verified membership always outranks a complimentary stay.
-- ---------------------------------------------------------------------------

create or replace function public.flowtel_claim_default_access()
returns boolean
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_user_id uuid:=auth.uid();
  v_access public.flowtel_product_access%rowtype;
  v_profile public.profiles%rowtype;
  v_member_admission public.flowtel_member_signup_admissions%rowtype;
  v_trial_admission public.flowtel_trial_admissions%rowtype;
  v_source text;
  v_email text;
  v_profile_rank integer:=0;
  v_access_role text:='flowtel_member';
  v_trial_start timestamptz;
  v_trial_end timestamptz;
begin
  if v_user_id is null then return false; end if;

  select lower(trim(coalesce(u.raw_user_meta_data->>'source',''))),
         lower(trim(coalesce(u.email,'')))
    into v_source,v_email
  from auth.users u
  where u.id=v_user_id;

  if v_email='' then return false; end if;

  select * into v_access
  from public.flowtel_product_access
  where user_id=v_user_id
  for update;

  if v_access.user_id is not null
     and coalesce(v_access.flowtel_access_status,'active')='revoked' then
    return false;
  end if;

  select * into v_profile
  from public.profiles
  where id=v_user_id;

  if v_profile.id is not null then
    v_profile_rank:=greatest(
      coalesce(v_profile.membership_rank,0),
      public.flowtel_membership_rank(v_profile.membership_type),
      case when lower(coalesce(v_profile.role,'')) in ('practitioner','admin','owner') then 2 else 0 end
    );
  end if;

  -- A fresh server-created membership admission always wins. This is what lets
  -- an active or expired complimentary stay become a permanent Queendom / Flow
  -- FM account without deleting the Auth identity or any Flowtel history.
  select * into v_member_admission
  from public.flowtel_member_signup_admissions a
  where a.email=v_email
    and a.expires_at>now()
    and (a.claimed_by is null or a.claimed_by=v_user_id)
  for update;

  if v_member_admission.email is not null then
    insert into public.profiles(
      id,email,role,membership_type,membership_rank,
      squarespace_source,squarespace_contact_id,squarespace_contact_email,
      source_updated_at
    ) values(
      v_user_id,v_email,'client',v_member_admission.membership_type,v_member_admission.membership_rank,
      v_member_admission.source,v_member_admission.squarespace_contact_id,v_email,now()
    )
    on conflict(id) do update
    set email=coalesce(public.profiles.email,excluded.email),
        membership_type=case
          when greatest(coalesce(public.profiles.membership_rank,0),public.flowtel_membership_rank(public.profiles.membership_type))>=excluded.membership_rank
            then public.profiles.membership_type
          else excluded.membership_type
        end,
        membership_rank=greatest(coalesce(public.profiles.membership_rank,0),excluded.membership_rank),
        squarespace_source=coalesce(excluded.squarespace_source,public.profiles.squarespace_source),
        squarespace_contact_id=coalesce(excluded.squarespace_contact_id,public.profiles.squarespace_contact_id),
        squarespace_contact_email=coalesce(public.profiles.squarespace_contact_email,excluded.squarespace_contact_email),
        source_updated_at=now();

    update public.flowtel_member_signup_admissions
    set claimed_by=v_user_id,
        claimed_at=coalesce(claimed_at,now()),
        updated_at=now()
    where email=v_member_admission.email;

    select * into v_profile from public.profiles where id=v_user_id;
    v_profile_rank:=greatest(
      coalesce(v_profile.membership_rank,0),
      public.flowtel_membership_rank(v_profile.membership_type),
      case when lower(coalesce(v_profile.role,'')) in ('practitioner','admin','owner') then 2 else 0 end
    );

    v_access_role:=case
      when lower(coalesce(v_profile.role,''))='owner' then 'owner'
      when lower(coalesce(v_profile.role,''))='admin' then 'admin'
      when lower(coalesce(v_profile.role,''))='practitioner' then 'practitioner'
      else 'flowtel_member'
    end;

    insert into public.flowtel_product_access(
      user_id,flowtel_access,caddie_magic_access,access_role,access_source,flowtel_access_status,
      flowtel_trial_started_at,flowtel_trial_ends_at,flowtel_trial_converted_at
    ) values(
      v_user_id,true,coalesce(v_access.caddie_magic_access,false),v_access_role,
      case
        when v_access.access_role in ('guest_house','event_pass') then 'limited-account-upgraded-through-membership'
        else 'verified-flowtel-membership'
      end,
      'active',
      v_access.flowtel_trial_started_at,
      v_access.flowtel_trial_ends_at,
      case when v_access.flowtel_trial_started_at is not null
        then coalesce(v_access.flowtel_trial_converted_at,now())
        else v_access.flowtel_trial_converted_at
      end
    )
    on conflict(user_id) do update
    set flowtel_access=true,
        flowtel_access_status='active',
        access_role=excluded.access_role,
        access_source=excluded.access_source,
        flowtel_trial_converted_at=case
          when public.flowtel_product_access.flowtel_trial_started_at is not null
            then coalesce(public.flowtel_product_access.flowtel_trial_converted_at,now())
          else public.flowtel_product_access.flowtel_trial_converted_at
        end,
        updated_at=now();

    return true;
  end if;

  -- Preserve the existing-member compatibility behavior: a canonical member
  -- who already has a product-access row can continue to use it. A brand-new
  -- profile without an access row still needs a server-created admission.
  if v_profile_rank>=1 and v_access.user_id is not null then
    v_access_role:=case
      when lower(coalesce(v_profile.role,''))='owner' then 'owner'
      when lower(coalesce(v_profile.role,''))='admin' then 'admin'
      when lower(coalesce(v_profile.role,''))='practitioner' then 'practitioner'
      else 'flowtel_member'
    end;

    update public.flowtel_product_access
    set flowtel_access=true,
        flowtel_access_status='active',
        access_role=v_access_role,
        access_source=case
          when access_role in ('guest_house','event_pass') then 'limited-account-upgraded-through-membership'
          when flowtel_trial_started_at is not null then 'verified-flowtel-membership'
          else coalesce(access_source,'verified-flowtel-membership')
        end,
        flowtel_trial_converted_at=case
          when flowtel_trial_started_at is not null then coalesce(flowtel_trial_converted_at,now())
          else flowtel_trial_converted_at
        end,
        updated_at=now()
    where user_id=v_user_id;
    return true;
  end if;

  -- Existing active complimentary stay: never extend its end timestamp.
  if v_access.user_id is not null
     and v_access.flowtel_trial_started_at is not null
     and v_access.flowtel_trial_converted_at is null then
    if v_access.flowtel_trial_ends_at is not null and v_access.flowtel_trial_ends_at>now() then
      if not coalesce(v_access.flowtel_access,false)
         or coalesce(v_access.flowtel_access_status,'not_granted')<>'active' then
        update public.flowtel_product_access
        set flowtel_access=true,
            flowtel_access_status='active',
            access_source='complimentary-stay',
            updated_at=now()
        where user_id=v_user_id;
      end if;
      return true;
    end if;

    update public.flowtel_product_access
    set flowtel_access=false,
        flowtel_access_status='not_granted',
        access_source='complimentary-stay-expired',
        updated_at=now()
    where user_id=v_user_id;
    return false;
  end if;

  -- Preserve pre-v0.10.88 canonical Flowtel access that was already granted
  -- by earlier migrations. Some legacy beta rows intentionally have product
  -- access even though their profile membership rank was never backfilled.
  -- A complimentary stay never reclassifies or expires those existing rows.
  if v_access.user_id is not null
     and coalesce(v_access.flowtel_access,false)
     and v_access.flowtel_trial_started_at is null then
    return true;
  end if;

  -- No real membership and no already-established trial. The exact-email
  -- trial admission is the only path into a first complimentary stay.
  select * into v_trial_admission
  from public.flowtel_trial_admissions a
  where a.email=v_email
    and (a.claimed_by is null or a.claimed_by=v_user_id)
  for update;

  if v_trial_admission.email is null then return false; end if;

  if v_trial_admission.claimed_at is null then
    if v_trial_admission.admission_expires_at<=now() then return false; end if;
    v_trial_start:=now();
  else
    v_trial_start:=v_trial_admission.claimed_at;
  end if;
  v_trial_end:=v_trial_start + interval '14 days';

  -- claimed_at is never cleared or moved. Once 14 days have elapsed, a new
  -- admission request cannot restart the stay for this email.
  if v_trial_end<=now() then
    if v_access.user_id is not null then
      update public.flowtel_product_access
      set flowtel_access=false,
          flowtel_access_status='not_granted',
          access_source='complimentary-stay-expired',
          flowtel_trial_started_at=coalesce(flowtel_trial_started_at,v_trial_start),
          flowtel_trial_ends_at=coalesce(flowtel_trial_ends_at,v_trial_end),
          updated_at=now()
      where user_id=v_user_id;
    end if;
    return false;
  end if;

  update public.flowtel_trial_admissions
  set claimed_by=v_user_id,
      claimed_at=coalesce(claimed_at,v_trial_start),
      updated_at=now()
  where email=v_trial_admission.email;

  insert into public.profiles(
    id,email,role,membership_type,membership_rank,
    squarespace_source,squarespace_contact_email,source_updated_at
  ) values(
    v_user_id,v_email,'client',null,0,
    'complimentary-stay',v_email,now()
  )
  on conflict(id) do update
  set email=coalesce(public.profiles.email,excluded.email),
      role=case when public.profiles.role in ('admin','owner','practitioner') then public.profiles.role else 'client' end,
      squarespace_source=case
        when greatest(coalesce(public.profiles.membership_rank,0),public.flowtel_membership_rank(public.profiles.membership_type))>=1
          then public.profiles.squarespace_source
        else coalesce(public.profiles.squarespace_source,excluded.squarespace_source)
      end,
      squarespace_contact_email=coalesce(public.profiles.squarespace_contact_email,excluded.squarespace_contact_email),
      source_updated_at=case
        when greatest(coalesce(public.profiles.membership_rank,0),public.flowtel_membership_rank(public.profiles.membership_type))>=1
          then public.profiles.source_updated_at
        else now()
      end;

  insert into public.flowtel_product_access(
    user_id,flowtel_access,caddie_magic_access,access_role,access_source,flowtel_access_status,
    flowtel_trial_started_at,flowtel_trial_ends_at,flowtel_trial_converted_at
  ) values(
    v_user_id,true,coalesce(v_access.caddie_magic_access,false),'flowtel_member','complimentary-stay','active',
    v_trial_start,v_trial_end,null
  )
  on conflict(user_id) do update
  set flowtel_access=true,
      flowtel_access_status='active',
      access_role=case
        when public.flowtel_product_access.access_role in ('owner','admin','practitioner')
          then public.flowtel_product_access.access_role
        else 'flowtel_member'
      end,
      access_source='complimentary-stay',
      flowtel_trial_started_at=coalesce(public.flowtel_product_access.flowtel_trial_started_at,excluded.flowtel_trial_started_at),
      flowtel_trial_ends_at=coalesce(public.flowtel_product_access.flowtel_trial_ends_at,excluded.flowtel_trial_ends_at),
      updated_at=now();

  return true;
end;
$$;
revoke all on function public.flowtel_claim_default_access() from public;
grant execute on function public.flowtel_claim_default_access() to authenticated;

-- ---------------------------------------------------------------------------
-- Mentor relationship is a Queendom membership benefit. Trial guests may see
-- the invitation to join, but cannot create a relationship by calling the RPC
-- directly.
-- ---------------------------------------------------------------------------

create or replace function public.flowtel_choose_mentor(
  p_mentor_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_member_rank integer := 0;
  v_mentor_role text;
  v_accepting boolean;
  v_existing public.flowtel_practitioner_relationships%rowtype;
  v_relationship_id uuid;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to choose a mentor.' using errcode = '28000';
  end if;

  select greatest(
           coalesce(p.membership_rank,0),
           public.flowtel_membership_rank(p.membership_type),
           case when lower(coalesce(p.role,'')) in ('practitioner','admin','owner') then 2 else 0 end
         )
    into v_member_rank
  from public.profiles p
  where p.id=v_user_id;

  if coalesce(v_member_rank,0)<1 then
    raise exception 'A Queendom membership is required to choose a Mentor to the Moon.' using errcode = '42501';
  end if;

  if p_mentor_id is null then
    raise exception 'Choose a mentor to connect with.' using errcode = '22023';
  end if;

  if p_mentor_id = v_user_id then
    raise exception 'You cannot choose yourself as your Mentor to the Moon.' using errcode = '22023';
  end if;

  select role, mentor_accepting_clients
    into v_mentor_role, v_accepting
    from public.profiles
    where id = p_mentor_id;

  if not found or v_mentor_role not in ('practitioner','admin','owner') then
    raise exception 'This mentor is not available.' using errcode = '42501';
  end if;

  if coalesce(v_accepting, true) is false then
    raise exception 'This mentor is not accepting new guests right now.' using errcode = '42501';
  end if;

  select *
    into v_existing
    from public.flowtel_practitioner_relationships
    where client_id = v_user_id
      and status in ('requested','connected')
    order by case status when 'connected' then 0 else 1 end,
             coalesce(connected_at, requested_at, updated_at) desc
    limit 1
    for update;

  if found and v_existing.status = 'connected' and v_existing.practitioner_id <> p_mentor_id then
    raise exception 'You already have a Mentor to the Moon. Changing mentors will be added in a future release.' using errcode = '23505';
  end if;

  if found and v_existing.status = 'connected' and v_existing.practitioner_id = p_mentor_id then
    return v_existing.id;
  end if;

  if found and v_existing.status = 'requested' and v_existing.practitioner_id = p_mentor_id then
    update public.flowtel_practitioner_relationships
      set requested_at = v_now,
          updated_at = v_now
      where id = v_existing.id;
    return v_existing.id;
  end if;

  update public.flowtel_practitioner_relationships
    set status = 'disconnected',
        disconnected_at = coalesce(disconnected_at, v_now),
        disconnected_reason = coalesce(disconnected_reason, 'guest chose a different mentor before connection'),
        updated_at = v_now
    where client_id = v_user_id
      and status = 'requested'
      and practitioner_id <> p_mentor_id;

  insert into public.flowtel_practitioner_relationships (
    client_id,
    practitioner_id,
    status,
    consent_granted,
    requested_at,
    connected_at,
    disconnected_at,
    disconnected_reason,
    updated_at
  ) values (
    v_user_id,
    p_mentor_id,
    'requested',
    true,
    v_now,
    null,
    null,
    null,
    v_now
  )
  on conflict (client_id, practitioner_id) do update set
    status = 'requested',
    consent_granted = true,
    requested_at = v_now,
    connected_at = null,
    disconnected_at = null,
    disconnected_reason = null,
    updated_at = v_now
  returning id into v_relationship_id;

  return v_relationship_id;
end;
$$;
revoke all on function public.flowtel_choose_mentor(uuid) from public;
grant execute on function public.flowtel_choose_mentor(uuid) to authenticated;

commit;
