-- Flowtel v0.10.71 — Priestess Network + Shared Identity
--
-- Purpose:
-- 1. Make public.profiles the canonical source for legal name, Flowtel display
--    name, location, timezone, and hemisphere across the Guest Profile and
--    Priestess Profile Studio.
-- 2. Add an owner-only Priestess Concierge Team directory containing every
--    Flow FM and Council member, including members who have not started a
--    Priestess Profile.
-- 3. Preserve narrow mentor/client consent while giving the owner one private
--    operational profile for membership, profile, clients, and mentor settings.
-- 4. Prepare structured hemisphere data for the intentionally deferred Time
--    and Space Map without adding a map or external location provider yet.
--
-- Migration 037 remains retired and must never be rerun.

alter table public.profiles
  add column if not exists hemisphere text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_hemisphere_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_hemisphere_check
      check (hemisphere is null or hemisphere in ('northern','southern','equatorial'));
  end if;
end;
$$;

comment on column public.profiles.hemisphere is
  'Member-selected seasonal context: northern, southern, or equatorial. Used by the future Time and Space experience; never inferred from free-text location.';

create or replace function public.flowtel_normalize_hemisphere(p_value text)
returns text
language plpgsql
immutable
as $$
declare
  v_value text := lower(trim(coalesce(p_value, '')));
begin
  if v_value = '' then return null; end if;
  if v_value not in ('northern','southern','equatorial') then
    raise exception 'Choose Northern Hemisphere, Southern Hemisphere, or Equatorial / seasonal context varies.' using errcode = '22023';
  end if;
  return v_value;
end;
$$;

revoke all on function public.flowtel_normalize_hemisphere(text) from public;
grant execute on function public.flowtel_normalize_hemisphere(text) to authenticated;

-- Canonical identity writer used by both profile rooms.
create or replace function public.flowtel_update_my_shared_identity(
  p_first_name text,
  p_last_name text,
  p_display_name text,
  p_location text,
  p_timezone text,
  p_hemisphere text default null
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
  v_hemisphere text := public.flowtel_normalize_hemisphere(p_hemisphere);
  v_profile public.profiles%rowtype;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to update your Flowtel identity.' using errcode = '28000';
  end if;
  if v_first_name is null then raise exception 'Add your legal first name.' using errcode = '22023'; end if;
  if v_last_name is null then raise exception 'Add your legal last name.' using errcode = '22023'; end if;
  if v_display_name is null then raise exception 'Add the name you want shown in the Queendom.' using errcode = '22023'; end if;
  if v_location is null then raise exception 'Add your city, region, or country.' using errcode = '22023'; end if;
  if v_timezone is null or not exists (select 1 from pg_timezone_names where name = v_timezone) then
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
      hemisphere = v_hemisphere,
      profile_confirmation_required = false,
      profile_confirmation_version = 1,
      profile_confirmed_at = now(),
      source_updated_at = now()
  where p.id = v_user_id
  returning p.* into v_profile;

  if not found then
    raise exception 'Flowtel profile not found.' using errcode = 'P0002';
  end if;

  -- Keep the older Priestess Profile identity columns as a compatibility mirror.
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
        'hemisphere', v_hemisphere,
        'flowtel_profile_confirmed_at', now()
      ),
      updated_at = now()
  where u.id = v_user_id;

  return v_profile;
end;
$$;

revoke all on function public.flowtel_update_my_shared_identity(text,text,text,text,text,text) from public;
grant execute on function public.flowtel_update_my_shared_identity(text,text,text,text,text,text) to authenticated;

-- Any direct profile update also refreshes the compatibility mirror.
create or replace function public.flowtel_sync_priestess_identity_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.flow_fm_priestess_profiles pp
  set priestess_name = new.display_name,
      legal_name = nullif(trim(concat_ws(' ', new.first_name, new.last_name)), ''),
      location = new.location,
      timezone = new.timezone,
      updated_at = now()
  where pp.member_id = new.id
    and (
      pp.priestess_name is distinct from new.display_name
      or pp.legal_name is distinct from nullif(trim(concat_ws(' ', new.first_name, new.last_name)), '')
      or pp.location is distinct from new.location
      or pp.timezone is distinct from new.timezone
    );
  return new;
end;
$$;

revoke all on function public.flowtel_sync_priestess_identity_from_profile() from public;

drop trigger if exists flowtel_profiles_sync_priestess_identity on public.profiles;
create trigger flowtel_profiles_sync_priestess_identity
  after insert or update on public.profiles
  for each row execute function public.flowtel_sync_priestess_identity_from_profile();

-- Old or future callers cannot create a second identity source by writing the
-- Priestess Profile mirror directly.
create or replace function public.flowtel_enforce_priestess_identity_mirror()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.profiles%rowtype;
begin
  select * into v_member from public.profiles where id = new.member_id;
  if v_member.id is null then return new; end if;
  new.priestess_name := coalesce(nullif(trim(v_member.display_name), ''), new.priestess_name);
  new.legal_name := nullif(trim(concat_ws(' ', v_member.first_name, v_member.last_name)), '');
  new.location := v_member.location;
  new.timezone := v_member.timezone;
  return new;
end;
$$;

revoke all on function public.flowtel_enforce_priestess_identity_mirror() from public;

drop trigger if exists flowtel_priestess_profiles_enforce_identity on public.flow_fm_priestess_profiles;
create trigger flowtel_priestess_profiles_enforce_identity
  before insert or update on public.flow_fm_priestess_profiles
  for each row execute function public.flowtel_enforce_priestess_identity_mirror();

update public.flow_fm_priestess_profiles pp
set priestess_name = coalesce(nullif(trim(p.display_name), ''), pp.priestess_name),
    legal_name = nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
    location = p.location,
    timezone = p.timezone,
    updated_at = now()
from public.profiles p
where p.id = pp.member_id
  and (
    pp.priestess_name is distinct from coalesce(nullif(trim(p.display_name), ''), pp.priestess_name)
    or pp.legal_name is distinct from nullif(trim(concat_ws(' ', p.first_name, p.last_name)), '')
    or pp.location is distinct from p.location
    or pp.timezone is distinct from p.timezone
  );

-- Existing profile reads now resolve the shared identity from public.profiles.
create or replace function public.flow_fm_get_priestess_profile(
  p_member_id uuid default null
)
returns table (
  id uuid,
  member_id uuid,
  member_name text,
  member_email text,
  status text,
  priestess_name text,
  legal_name text,
  profile_email text,
  profile_photo_url text,
  bio text,
  modalities text,
  who_she_serves text,
  session_types text,
  scheduling_url text,
  website_url text,
  instagram_url text,
  tiktok_url text,
  podcast_url text,
  queendom_name text,
  offerings text,
  location text,
  timezone text,
  framework_language text,
  network_opt_in boolean,
  revenue_share_opt_in boolean,
  mentor_note text,
  admin_note text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  approved_at timestamptz,
  reviewed_by uuid,
  reviewer_name text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_member_id uuid := coalesce(p_member_id, auth.uid());
begin
  if v_user_id is null then
    raise exception 'You must be signed in to view a Priestess Profile.' using errcode = '28000';
  end if;
  if v_member_id is null or not public.flow_fm_can_view_assignment_member(v_member_id) then
    raise exception 'This Priestess Profile is only available with active consent.' using errcode = '42501';
  end if;

  return query
  select
    pp.id,
    pp.member_id,
    coalesce(nullif(trim(p.display_name), ''), nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), p.email, 'Flowtel Guest') as member_name,
    p.email as member_email,
    pp.status,
    coalesce(nullif(trim(p.display_name), ''), pp.priestess_name) as priestess_name,
    case when pp.member_id = v_user_id then nullif(trim(concat_ws(' ', p.first_name, p.last_name)), '') else null end as legal_name,
    pp.profile_email,
    pp.profile_photo_url,
    pp.bio,
    pp.modalities,
    pp.who_she_serves,
    pp.session_types,
    pp.scheduling_url,
    pp.website_url,
    pp.instagram_url,
    pp.tiktok_url,
    pp.podcast_url,
    pp.queendom_name,
    pp.offerings,
    p.location,
    p.timezone,
    pp.framework_language,
    pp.network_opt_in,
    case when public.flowtel_current_user_is_admin_or_owner() or pp.member_id = v_user_id then pp.revenue_share_opt_in else false end,
    pp.mentor_note,
    case when public.flowtel_current_user_is_admin_or_owner() then pp.admin_note else null end,
    pp.submitted_at,
    pp.reviewed_at,
    pp.approved_at,
    pp.reviewed_by,
    coalesce(nullif(trim(reviewer.display_name), ''), nullif(trim(concat_ws(' ', reviewer.first_name, reviewer.last_name)), ''), reviewer.email, 'Flowtel Mentor'),
    pp.created_at,
    pp.updated_at
  from public.flow_fm_priestess_profiles pp
  join public.profiles p on p.id = pp.member_id
  left join public.profiles reviewer on reviewer.id = pp.reviewed_by
  where pp.member_id = v_member_id
  limit 1;
end;
$$;

revoke all on function public.flow_fm_get_priestess_profile(uuid) from public;
grant execute on function public.flow_fm_get_priestess_profile(uuid) to authenticated;

-- Owner directory: every Flow FM and Council member, profile started or not.
create or replace function public.flowtel_admin_list_priestess_concierge_team()
returns table (
  member_id uuid,
  first_name text,
  last_name text,
  display_name text,
  email text,
  location text,
  timezone text,
  hemisphere text,
  role text,
  membership_type text,
  membership_rank integer,
  flowfm_started_at date,
  profile_id uuid,
  profile_status text,
  profile_photo_url text,
  priestess_title text,
  mentor_accepting_clients boolean,
  active_client_count bigint,
  pending_request_count bigint,
  flowtel_access_status text,
  profile_updated_at timestamptz,
  upcoming_calls_note text
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.flowtel_current_user_is_phase_one_owner() then
    raise exception 'Only the Flowtel owner may open the Priestess Concierge Team directory.' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    p.first_name,
    p.last_name,
    coalesce(nullif(trim(p.display_name), ''), nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), p.email),
    p.email,
    p.location,
    p.timezone,
    p.hemisphere,
    p.role,
    case
      when public.flow_fm_effective_membership_rank(p.id,p.membership_type,p.membership_rank,p.role,p.flowfm_started_at,p.is_initiated) >= 3 then 'council'
      else 'flowfm'
    end,
    public.flow_fm_effective_membership_rank(p.id,p.membership_type,p.membership_rank,p.role,p.flowfm_started_at,p.is_initiated),
    p.flowfm_started_at,
    pp.id,
    coalesce(pp.status, 'not_started'),
    pp.profile_photo_url,
    coalesce(nullif(trim(pp.modalities), ''), nullif(trim(p.mentor_title), ''), 'Flow FM Member'),
    coalesce(p.mentor_accepting_clients, false),
    (
      select count(*)
      from public.flowtel_practitioner_relationships r
      where r.practitioner_id = p.id
        and r.status = 'connected'
        and coalesce(r.consent_granted, false) = true
    ),
    (
      select count(*)
      from public.flowtel_practitioner_relationships r
      where r.practitioner_id = p.id
        and r.status = 'requested'
    ),
    coalesce(a.flowtel_access_status, case when coalesce(a.flowtel_access,false) then 'active' else 'not_granted' end),
    pp.updated_at,
    'Calendar connection coming soon.'::text
  from public.profiles p
  left join public.flow_fm_priestess_profiles pp on pp.member_id = p.id
  left join public.flowtel_product_access a on a.user_id = p.id
  where public.flow_fm_effective_membership_rank(p.id,p.membership_type,p.membership_rank,p.role,p.flowfm_started_at,p.is_initiated) >= 2
  order by
    case coalesce(pp.status, 'not_started') when 'submitted' then 0 when 'needs_revision' then 1 when 'draft' then 2 when 'approved' then 3 else 4 end,
    lower(coalesce(nullif(trim(p.display_name), ''), p.email));
end;
$$;

revoke all on function public.flowtel_admin_list_priestess_concierge_team() from public;
grant execute on function public.flowtel_admin_list_priestess_concierge_team() to authenticated;

create or replace function public.flowtel_admin_get_priestess_concierge_profile(p_member_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_result jsonb;
begin
  if not public.flowtel_current_user_is_phase_one_owner() then
    raise exception 'Only the Flowtel owner may open a Priestess Concierge Team profile.' using errcode = '42501';
  end if;
  if p_member_id is null then
    raise exception 'Choose a Flow FM member.' using errcode = '22023';
  end if;

  select jsonb_build_object(
    'member', jsonb_build_object(
      'member_id', p.id,
      'first_name', p.first_name,
      'last_name', p.last_name,
      'display_name', coalesce(nullif(trim(p.display_name), ''), nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), p.email),
      'email', p.email,
      'location', p.location,
      'timezone', p.timezone,
      'hemisphere', p.hemisphere,
      'role', p.role,
      'membership_type', case when public.flow_fm_effective_membership_rank(p.id,p.membership_type,p.membership_rank,p.role,p.flowfm_started_at,p.is_initiated) >= 3 then 'council' else 'flowfm' end,
      'membership_rank', public.flow_fm_effective_membership_rank(p.id,p.membership_type,p.membership_rank,p.role,p.flowfm_started_at,p.is_initiated),
      'flowfm_started_at', p.flowfm_started_at,
      'mentor_title', p.mentor_title,
      'mentor_accepting_clients', coalesce(p.mentor_accepting_clients,false),
      'flowtel_access_status', coalesce(a.flowtel_access_status, case when coalesce(a.flowtel_access,false) then 'active' else 'not_granted' end)
    ),
    'priestess_profile', case when pp.id is null then null else jsonb_build_object(
      'id', pp.id,
      'status', pp.status,
      'profile_photo_url', pp.profile_photo_url,
      'priestess_title', coalesce(nullif(trim(pp.modalities), ''), nullif(trim(p.mentor_title), ''), 'Flow FM Priestess'),
      'bio', pp.bio,
      'who_she_serves', pp.who_she_serves,
      'session_types', pp.session_types,
      'offerings', pp.offerings,
      'website_url', pp.website_url,
      'scheduling_url', pp.scheduling_url,
      'network_opt_in', pp.network_opt_in,
      'revenue_share_opt_in', pp.revenue_share_opt_in,
      'mentor_note', pp.mentor_note,
      'admin_note', pp.admin_note,
      'submitted_at', pp.submitted_at,
      'reviewed_at', pp.reviewed_at,
      'approved_at', pp.approved_at,
      'updated_at', pp.updated_at
    ) end,
    'clients', coalesce((
      select jsonb_agg(jsonb_build_object(
        'relationship_id', r.id,
        'client_id', r.client_id,
        'display_name', coalesce(nullif(trim(c.display_name), ''), nullif(trim(concat_ws(' ', c.first_name, c.last_name)), ''), c.email),
        'email', c.email,
        'status', r.status,
        'consent_granted', coalesce(r.consent_granted,false),
        'connected_at', r.connected_at,
        'updated_at', r.updated_at
      ) order by lower(coalesce(nullif(trim(c.display_name), ''), c.email)))
      from public.flowtel_practitioner_relationships r
      join public.profiles c on c.id = r.client_id
      where r.practitioner_id = p.id
        and r.status in ('connected','requested')
    ), '[]'::jsonb),
    'upcoming_calls_note', 'Calendar connection coming soon.',
    'cycle_data_scope', 'Connected clients only. Existing mentor consent remains required.'
  ) into v_result
  from public.profiles p
  left join public.flow_fm_priestess_profiles pp on pp.member_id = p.id
  left join public.flowtel_product_access a on a.user_id = p.id
  where p.id = p_member_id
    and public.flow_fm_effective_membership_rank(p.id,p.membership_type,p.membership_rank,p.role,p.flowfm_started_at,p.is_initiated) >= 2;

  if v_result is null then
    raise exception 'Flow FM or Council member not found.' using errcode = 'P0002';
  end if;
  return v_result;
end;
$$;

revoke all on function public.flowtel_admin_get_priestess_concierge_profile(uuid) from public;
grant execute on function public.flowtel_admin_get_priestess_concierge_profile(uuid) to authenticated;

create or replace function public.flowtel_admin_set_priestess_accepting_clients(
  p_member_id uuid,
  p_accepting boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.flowtel_current_user_is_phase_one_owner() then
    raise exception 'Only the Flowtel owner may update Priestess mentor availability.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = p_member_id
      and public.flow_fm_effective_membership_rank(p.id,p.membership_type,p.membership_rank,p.role,p.flowfm_started_at,p.is_initiated) >= 2
  ) then
    raise exception 'Flow FM or Council member not found.' using errcode = 'P0002';
  end if;

  update public.profiles
  set mentor_accepting_clients = coalesce(p_accepting,false)
  where id = p_member_id;
  return true;
end;
$$;

revoke all on function public.flowtel_admin_set_priestess_accepting_clients(uuid,boolean) from public;
grant execute on function public.flowtel_admin_set_priestess_accepting_clients(uuid,boolean) to authenticated;

notify pgrst, 'reload schema';
