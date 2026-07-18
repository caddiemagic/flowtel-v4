-- Flowtel v0.10.52 — Priestess Identity + Display Name Sync
--
-- Establishes one canonical, member-controlled display name for the Flowtel while
-- keeping legal first and last names in separate private profile fields. Profile
-- Studio saves all three identity values, synchronizes the Priestess Profile record
-- and Supabase Auth metadata, and every current Flowtel name-bearing RPC resolves
-- the canonical display name before legal-name or email fallbacks.

-- ---------------------------------------------------------------------------
-- Canonical profile identity
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists display_name text;

comment on column public.profiles.display_name is
  'Member-controlled name shown throughout Flowtel. Legal first_name and last_name remain separate private account fields.';

create or replace function public.flowtel_resolve_display_name(
  p_display_name text,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_fallback text default 'Flowtel Guest'
)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(trim(coalesce(p_display_name,'')), ''),
    nullif(trim(concat_ws(' ', p_first_name, p_last_name)), ''),
    nullif(trim(split_part(coalesce(p_email,''), '@', 1)), ''),
    p_fallback
  );
$$;

comment on function public.flowtel_resolve_display_name(text,text,text,text,text) is
  'Resolves the canonical public-facing Flowtel identity without exposing legal-name fields when a display name exists.';

grant execute on function public.flowtel_resolve_display_name(text,text,text,text,text) to anon, authenticated;

-- Prefer the existing Priestess Profile name, then the legal name, for the first
-- canonical backfill. Existing legal names are preserved exactly as stored.
update public.profiles p
set display_name = coalesce(
  (
    select nullif(trim(pp.priestess_name),'')
    from public.flow_fm_priestess_profiles pp
    where pp.member_id = p.id
    limit 1
  ),
  nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
  nullif(trim(split_part(coalesce(p.email,''), '@', 1)), ''),
  'Flowtel Guest'
)
where nullif(trim(coalesce(p.display_name,'')), '') is null;

-- Keep the existing Priestess Profile display field aligned during migration so
-- older surfaces continue to carry the same chosen identity.
update public.flow_fm_priestess_profiles pp
set priestess_name = p.display_name,
    legal_name = nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
    updated_at = now()
from public.profiles p
where p.id = pp.member_id
  and (
    pp.priestess_name is distinct from p.display_name
    or pp.legal_name is distinct from nullif(trim(concat_ws(' ', p.first_name, p.last_name)), '')
  );

create or replace function public.flowtel_update_my_identity(
  p_first_name text,
  p_last_name text,
  p_display_name text
)
returns public.profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_first_name text := nullif(trim(coalesce(p_first_name,'')), '');
  v_last_name text := nullif(trim(coalesce(p_last_name,'')), '');
  v_display_name text := nullif(trim(coalesce(p_display_name,'')), '');
  v_profile public.profiles%rowtype;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to update your Flowtel identity.' using errcode = '28000';
  end if;

  if v_first_name is null then
    raise exception 'Add your legal first name.' using errcode = '22023';
  end if;
  if v_last_name is null then
    raise exception 'Add your legal last name.' using errcode = '22023';
  end if;
  if v_display_name is null then
    raise exception 'Add the display name you want to use inside the Flowtel.' using errcode = '22023';
  end if;
  if char_length(v_first_name) > 100 or char_length(v_last_name) > 100 or char_length(v_display_name) > 140 then
    raise exception 'Flowtel identity fields are longer than the supported limit.' using errcode = '22001';
  end if;

  update public.profiles p
  set first_name = v_first_name,
      last_name = v_last_name,
      display_name = v_display_name,
      source_updated_at = now()
  where p.id = v_user_id
  returning p.* into v_profile;

  if not found then
    raise exception 'Flowtel profile not found.' using errcode = 'P0002';
  end if;

  update public.flow_fm_priestess_profiles pp
  set priestess_name = v_display_name,
      legal_name = trim(concat_ws(' ', v_first_name, v_last_name)),
      updated_at = now()
  where pp.member_id = v_user_id;

  update auth.users u
  set raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
        'first_name', v_first_name,
        'last_name', v_last_name,
        'display_name', v_display_name,
        'full_name', v_display_name,
        'name', v_display_name
      ),
      updated_at = now()
  where u.id = v_user_id;

  return v_profile;
end;
$$;

comment on function public.flowtel_update_my_identity(text,text,text) is
  'Lets an authenticated member update only her own private legal names and canonical Flowtel display name, synchronizing Profile Studio and Auth metadata.';

revoke all on function public.flowtel_update_my_identity(text,text,text) from public;
grant execute on function public.flowtel_update_my_identity(text,text,text) to authenticated;

-- ---------------------------------------------------------------------------
-- Name-bearing Flowtel RPCs now resolve profiles.display_name first
-- ---------------------------------------------------------------------------

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
    public.flowtel_resolve_display_name(member.display_name, member.first_name, member.last_name, member.email, 'Flowtel Guest') as member_name,
    member.email as member_email,
    pp.status,
    pp.priestess_name,
    case when pp.member_id = v_user_id then pp.legal_name else null end as legal_name,
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
    pp.location,
    pp.timezone,
    pp.framework_language,
    pp.network_opt_in,
    case when public.flowtel_current_user_is_admin_or_owner() or pp.member_id = v_user_id then pp.revenue_share_opt_in else false end as revenue_share_opt_in,
    pp.mentor_note,
    case when public.flowtel_current_user_is_admin_or_owner() then pp.admin_note else null end as admin_note,
    pp.submitted_at,
    pp.reviewed_at,
    pp.approved_at,
    pp.reviewed_by,
    public.flowtel_resolve_display_name(reviewer.display_name, reviewer.first_name, reviewer.last_name, reviewer.email, 'Flowtel Mentor') as reviewer_name,
    pp.created_at,
    pp.updated_at
  from public.flow_fm_priestess_profiles pp
  join public.profiles member on member.id = pp.member_id
  left join public.profiles reviewer on reviewer.id = pp.reviewed_by
  where pp.member_id = v_member_id
  limit 1;
end;
$$;

grant execute on function public.flow_fm_get_priestess_profile(uuid) to authenticated;


create or replace function public.flow_fm_get_assignment_statuses(
  p_member_id uuid default null
)
returns table (
  id uuid,
  member_id uuid,
  assignment_index integer,
  status text,
  submission_text text,
  submission_url text,
  attachment_url text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid,
  reviewer_name text,
  mentor_note text,
  admin_note text,
  completed_at timestamptz,
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
    raise exception 'You must be signed in to view Flow FM assignments.' using errcode = '28000';
  end if;

  if v_member_id is null or not public.flow_fm_can_view_assignment_member(v_member_id) then
    raise exception 'These Flow FM assignments are only available with active consent.' using errcode = '42501';
  end if;

  return query
  select
    s.id,
    s.member_id,
    s.assignment_index,
    s.status,
    s.submission_text,
    s.submission_url,
    s.attachment_url,
    s.submitted_at,
    s.reviewed_at,
    s.reviewed_by,
    public.flowtel_resolve_display_name(reviewer.display_name, reviewer.first_name, reviewer.last_name, reviewer.email, 'Flowtel Mentor') as reviewer_name,
    s.mentor_note,
    case
      when public.flowtel_current_user_is_admin_or_owner() then s.admin_note
      else null
    end as admin_note,
    s.completed_at,
    s.created_at,
    s.updated_at
  from public.flow_fm_assignment_submissions s
  left join public.profiles reviewer on reviewer.id = s.reviewed_by
  where s.member_id = v_member_id
  order by s.assignment_index;
end;
$$;

grant execute on function public.flow_fm_get_assignment_statuses(uuid) to authenticated;


create or replace function public.flow_fm_get_assignment_review_queue()
returns table (
  id uuid,
  member_id uuid,
  member_name text,
  member_email text,
  assignment_index integer,
  status text,
  submission_text text,
  submission_url text,
  attachment_url text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid,
  mentor_note text,
  admin_note text,
  completed_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'You must be signed in to view the Flow FM review queue.' using errcode = '28000';
  end if;

  if not public.flowtel_current_user_is_admin_or_owner() then
    return;
  end if;

  return query
  select
    s.id,
    s.member_id,
    public.flowtel_resolve_display_name(p.display_name, p.first_name, p.last_name, p.email, 'Flowtel Guest') as member_name,
    p.email as member_email,
    s.assignment_index,
    s.status,
    s.submission_text,
    s.submission_url,
    s.attachment_url,
    s.submitted_at,
    s.reviewed_at,
    s.reviewed_by,
    s.mentor_note,
    s.admin_note,
    s.completed_at,
    s.updated_at
  from public.flow_fm_assignment_submissions s
  join public.profiles p on p.id = s.member_id
  where s.status = 'submitted'
    and s.member_id <> v_user_id
  order by s.submitted_at desc nulls last, s.updated_at desc
  limit 100;
end;
$$;

grant execute on function public.flow_fm_get_assignment_review_queue() to authenticated;

create or replace function public.flow_fm_get_priestess_profile_review_queue()
returns table (
  id uuid,
  member_id uuid,
  member_name text,
  member_email text,
  status text,
  priestess_name text,
  profile_email text,
  bio text,
  modalities text,
  queendom_name text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  approved_at timestamptz,
  reviewed_by uuid,
  mentor_note text,
  admin_note text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'You must be signed in to view Priestess Profile reviews.' using errcode = '28000';
  end if;

  if not public.flowtel_current_user_is_admin_or_owner() then
    return;
  end if;

  return query
  select
    pp.id,
    pp.member_id,
    public.flowtel_resolve_display_name(p.display_name, p.first_name, p.last_name, p.email, 'Flowtel Guest') as member_name,
    p.email as member_email,
    pp.status,
    pp.priestess_name,
    pp.profile_email,
    pp.bio,
    pp.modalities,
    pp.queendom_name,
    pp.submitted_at,
    pp.reviewed_at,
    pp.approved_at,
    pp.reviewed_by,
    pp.mentor_note,
    pp.admin_note,
    pp.updated_at
  from public.flow_fm_priestess_profiles pp
  join public.profiles p on p.id = pp.member_id
  where pp.status = 'submitted'
    and pp.member_id <> v_user_id
  order by pp.submitted_at desc nulls last, pp.updated_at desc
  limit 100;
end;
$$;



drop function if exists public.flowtel_get_cycle_data_entries(uuid, text);

create or replace function public.flowtel_get_cycle_data_entries(
  p_subject_id uuid default null,
  p_scope text default 'self'
)
returns table (
  stay_id uuid,
  client_id uuid,
  client_name text,
  checkin_date date,
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  cycle_day_actual integer,
  cycle_day_recorded integer,
  cycle_day_difference integer,
  cycle_day_match_status text,
  cycle_accuracy_message text,
  cycle_start_date date,
  previous_cycle_length_days integer,
  inner_season text,
  feels_like_inner_season text,
  moon_phase text,
  moon_day integer,
  moon_inner_season text,
  moon_theme text,
  moon_cycle_start_date date,
  reflection_text text,
  reflection_created_at timestamptz,
  checkout_notes text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_scope text := coalesce(nullif(p_scope,''),'self');
begin
  if v_user_id is null then
    raise exception 'You must be signed in to view cycle data.' using errcode = '28000';
  end if;

  select role into v_role from public.profiles where id = v_user_id;

  if p_subject_id is not null and not public.flowtel_can_view_cycle_subject(p_subject_id) then
    raise exception 'This cycle dashboard is only available with active consent.' using errcode = '42501';
  end if;

  if v_scope in ('all','clients') and coalesce(v_role,'') not in ('practitioner','admin','owner') then
    raise exception 'Only mentors and admins can view client cycle data.' using errcode = '42501';
  end if;

  return query
  select
    s.id as stay_id,
    s.client_id,
    public.flowtel_resolve_display_name(p.display_name, p.first_name, p.last_name, p.email, 'Flowtel Guest') as client_name,
    s.checkin_date::date as checkin_date,
    s.checked_in_at,
    s.checked_out_at,
    coalesce(s.cycle_day_actual, s.cycle_day_calculated, s.cycle_day_claimed) as cycle_day_actual,
    coalesce(s.cycle_day_recorded, s.cycle_day_claimed) as cycle_day_recorded,
    coalesce(
      s.cycle_day_difference,
      coalesce(s.cycle_day_recorded, s.cycle_day_claimed, 0) - coalesce(s.cycle_day_actual, s.cycle_day_calculated, s.cycle_day_claimed, 0)
    ) as cycle_day_difference,
    s.cycle_day_match_status,
    s.cycle_accuracy_message,
    s.cycle_start_date::date as cycle_start_date,
    s.previous_cycle_length_days,
    s.inner_season,
    s.feels_like_inner_season,
    s.moon_phase,
    s.moon_day,
    s.moon_inner_season,
    s.moon_theme,
    public.flowtel_moon_cycle_start_for_date(s.checkin_date::date) as moon_cycle_start_date,
    coalesce(lr.reflection, nullif(s.reflection,'')) as reflection_text,
    coalesce(lr.created_at, s.updated_at, s.checked_in_at) as reflection_created_at,
    s.checkout_notes
  from public.flowtel_stays s
  join public.profiles p on p.id = s.client_id
  left join lateral (
    select r.reflection, r.created_at
    from public.flowtel_reflections r
    where r.stay_id = s.id
    order by r.created_at desc
    limit 1
  ) lr on true
  where
    case
      when p_subject_id is not null then s.client_id = p_subject_id
      when v_scope = 'self' then s.client_id = v_user_id
      when v_scope in ('all','clients') and coalesce(v_role,'') in ('admin','owner') then true
      when v_scope in ('all','clients') and coalesce(v_role,'') = 'practitioner' then exists (
        select 1
        from public.flowtel_practitioner_relationships r
        where r.client_id = s.client_id
          and r.practitioner_id = v_user_id
          and r.status = 'connected'
          and coalesce(r.consent_granted, false) = true
      )
      else false
    end
  order by s.checkin_date desc, s.checked_in_at desc
  limit 1000;
end;
$$;

grant execute on function public.flowtel_get_cycle_data_entries(uuid, text) to authenticated;


create or replace function public.flowtel_get_flow_map_entries(
  p_subject_id uuid default null,
  p_scope text default 'self'
)
returns table (
  entry_id text,
  entry_type text,
  stay_id uuid,
  client_id uuid,
  client_name text,
  checkin_date date,
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  cycle_day_actual integer,
  cycle_day_recorded integer,
  cycle_day_difference integer,
  cycle_day_match_status text,
  cycle_accuracy_message text,
  cycle_start_date date,
  previous_cycle_length_days integer,
  inner_season text,
  feels_like_inner_season text,
  moon_phase text,
  moon_day integer,
  moon_inner_season text,
  moon_theme text,
  moon_cycle_start_date date,
  reflection_text text,
  reflection_created_at timestamptz,
  checkout_notes text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_scope text := coalesce(nullif(p_scope,''),'self');
begin
  if v_user_id is null then
    raise exception 'You must be signed in to view Flow Map notes.' using errcode = '28000';
  end if;

  select role into v_role
  from public.profiles
  where id = v_user_id;

  if p_subject_id is not null and not public.flowtel_can_view_cycle_subject(p_subject_id) then
    raise exception 'This Flow Map is only available with active consent.' using errcode = '42501';
  end if;

  if v_scope in ('all','clients') and coalesce(v_role,'') not in ('practitioner','admin','owner') then
    raise exception 'Only mentors and admins can view client Flow Maps.' using errcode = '42501';
  end if;

  return query
  with permitted_stays as (
    select
      s.*,
      public.flowtel_resolve_display_name(p.display_name, p.first_name, p.last_name, p.email, 'Flowtel Guest') as resolved_client_name
    from public.flowtel_stays s
    join public.profiles p on p.id = s.client_id
    where
      case
        when p_subject_id is not null then s.client_id = p_subject_id
        when v_scope = 'self' then s.client_id = v_user_id
        when v_scope in ('all','clients') and coalesce(v_role,'') in ('admin','owner') then true
        when v_scope in ('all','clients') and coalesce(v_role,'') = 'practitioner' then exists (
          select 1
          from public.flowtel_practitioner_relationships relationship
          where relationship.client_id = s.client_id
            and relationship.practitioner_id = v_user_id
            and relationship.status = 'connected'
            and coalesce(relationship.consent_granted, false) = true
        )
        else false
      end
  ),
  reflection_entries as (
    select
      r.id::text as entry_id,
      'reflection'::text as entry_type,
      s.id as stay_id,
      s.client_id,
      s.resolved_client_name as client_name,
      s.checkin_date::date as checkin_date,
      s.checked_in_at,
      s.checked_out_at,
      coalesce(s.cycle_day_actual, s.cycle_day_calculated, s.cycle_day_claimed) as cycle_day_actual,
      coalesce(s.cycle_day_recorded, s.cycle_day_claimed) as cycle_day_recorded,
      coalesce(
        s.cycle_day_difference,
        coalesce(s.cycle_day_recorded, s.cycle_day_claimed, 0)
          - coalesce(s.cycle_day_actual, s.cycle_day_calculated, s.cycle_day_claimed, 0)
      ) as cycle_day_difference,
      s.cycle_day_match_status,
      s.cycle_accuracy_message,
      s.cycle_start_date::date as cycle_start_date,
      s.previous_cycle_length_days,
      s.inner_season,
      s.feels_like_inner_season,
      s.moon_phase,
      s.moon_day,
      s.moon_inner_season,
      s.moon_theme,
      public.flowtel_moon_cycle_start_for_date(s.checkin_date::date) as moon_cycle_start_date,
      r.reflection as reflection_text,
      r.created_at as reflection_created_at,
      null::text as checkout_notes
    from permitted_stays s
    join public.flowtel_reflections r on r.stay_id = s.id
    where nullif(trim(r.reflection),'') is not null
  ),
  fallback_reflection_entries as (
    select
      ('stay-reflection-' || s.id::text) as entry_id,
      'reflection'::text as entry_type,
      s.id as stay_id,
      s.client_id,
      s.resolved_client_name as client_name,
      s.checkin_date::date as checkin_date,
      s.checked_in_at,
      s.checked_out_at,
      coalesce(s.cycle_day_actual, s.cycle_day_calculated, s.cycle_day_claimed) as cycle_day_actual,
      coalesce(s.cycle_day_recorded, s.cycle_day_claimed) as cycle_day_recorded,
      coalesce(
        s.cycle_day_difference,
        coalesce(s.cycle_day_recorded, s.cycle_day_claimed, 0)
          - coalesce(s.cycle_day_actual, s.cycle_day_calculated, s.cycle_day_claimed, 0)
      ) as cycle_day_difference,
      s.cycle_day_match_status,
      s.cycle_accuracy_message,
      s.cycle_start_date::date as cycle_start_date,
      s.previous_cycle_length_days,
      s.inner_season,
      s.feels_like_inner_season,
      s.moon_phase,
      s.moon_day,
      s.moon_inner_season,
      s.moon_theme,
      public.flowtel_moon_cycle_start_for_date(s.checkin_date::date) as moon_cycle_start_date,
      s.reflection as reflection_text,
      coalesce(s.updated_at, s.checked_in_at) as reflection_created_at,
      null::text as checkout_notes
    from permitted_stays s
    where nullif(trim(s.reflection),'') is not null
      and not exists (
        select 1
        from public.flowtel_reflections r
        where r.stay_id = s.id
      )
  ),
  checkout_entries as (
    select
      ('checkout-' || s.id::text) as entry_id,
      'checkout'::text as entry_type,
      s.id as stay_id,
      s.client_id,
      s.resolved_client_name as client_name,
      s.checkin_date::date as checkin_date,
      s.checked_in_at,
      s.checked_out_at,
      coalesce(s.cycle_day_actual, s.cycle_day_calculated, s.cycle_day_claimed) as cycle_day_actual,
      coalesce(s.cycle_day_recorded, s.cycle_day_claimed) as cycle_day_recorded,
      coalesce(
        s.cycle_day_difference,
        coalesce(s.cycle_day_recorded, s.cycle_day_claimed, 0)
          - coalesce(s.cycle_day_actual, s.cycle_day_calculated, s.cycle_day_claimed, 0)
      ) as cycle_day_difference,
      s.cycle_day_match_status,
      s.cycle_accuracy_message,
      s.cycle_start_date::date as cycle_start_date,
      s.previous_cycle_length_days,
      s.inner_season,
      s.feels_like_inner_season,
      s.moon_phase,
      s.moon_day,
      s.moon_inner_season,
      s.moon_theme,
      public.flowtel_moon_cycle_start_for_date(s.checkin_date::date) as moon_cycle_start_date,
      null::text as reflection_text,
      coalesce(s.checked_out_at, s.updated_at, s.checked_in_at) as reflection_created_at,
      s.checkout_notes
    from permitted_stays s
    where nullif(trim(s.checkout_notes),'') is not null
  ),
  all_note_entries as (
    select * from reflection_entries
    union all
    select * from fallback_reflection_entries
    union all
    select * from checkout_entries
  )
  select note_entries.*
  from all_note_entries note_entries
  order by note_entries.checkin_date desc, note_entries.reflection_created_at desc
  limit 3000;
end;
$$;

grant execute on function public.flowtel_get_flow_map_entries(uuid, text) to authenticated;

comment on function public.flowtel_get_flow_map_entries(uuid, text) is
  'Returns every append-only reflection and checkout note for consent-aware Flow Map views without collapsing a stay to its latest reflection.';


create or replace function public.flow_fm_get_team_map()
returns table (
  member_id uuid,
  priestess_name text,
  profile_photo_url text,
  profile_status text,
  priestess_title text,
  profile_intro text,
  website_url text,
  actual_inner_season text,
  feels_like_inner_season text,
  cycle_day integer,
  checked_in_at timestamptz,
  profile_available boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_today date := (timezone('America/Los_Angeles', now()))::date;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to enter the Living Map.' using errcode = '28000';
  end if;

  if not public.flow_fm_current_user_can_view_team_map() then
    raise exception 'The Living Map is available to Queendom and Flow FM members.' using errcode = '42501';
  end if;

  return query
  with today_stays as (
    select distinct on (s.client_id)
      s.client_id,
      public.flow_fm_normalize_team_map_season(s.inner_season) as actual_inner_season,
      public.flow_fm_normalize_team_map_season(s.feels_like_inner_season) as feels_like_inner_season,
      coalesce(s.cycle_day_actual, s.cycle_day_calculated, s.cycle_day_recorded, s.cycle_day_claimed) as cycle_day,
      s.checked_in_at
    from public.flowtel_stays s
    where s.checkin_date::date = v_today
       or (s.checked_in_at is not null and (timezone('America/Los_Angeles', s.checked_in_at))::date = v_today)
    order by s.client_id, s.checked_in_at desc nulls last, s.id desc
  )
  select
    p.id as member_id,
    coalesce(nullif(trim(p.display_name),''),nullif(trim(pp.priestess_name),''),nullif(trim(p.first_name),''),'Flow FM Priestess') as priestess_name,
    coalesce(nullif(trim(pp.profile_photo_url),''),nullif(trim(p.mentor_photo_url),'')) as profile_photo_url,
    coalesce(pp.status,'draft') as profile_status,
    'Flow FM Priestess'::text as priestess_title,
    null::text as profile_intro,
    nullif(trim(pp.website_url),'') as website_url,
    ts.actual_inner_season,
    ts.feels_like_inner_season,
    ts.cycle_day,
    ts.checked_in_at,
    (pp.member_id is not null) as profile_available
  from today_stays ts
  join public.profiles p on p.id = ts.client_id
  left join public.flow_fm_priestess_profiles pp on pp.member_id = p.id
  where coalesce(p.flow_fm_team_map_opt_out,false) = false
    and public.flow_fm_effective_membership_rank(
      p.id,
      p.membership_type,
      p.membership_rank,
      p.role,
      p.flowfm_started_at,
      p.is_initiated
    ) >= 2
    and ts.actual_inner_season is not null
  order by 2, 1;
end;
$$;

revoke all on function public.flow_fm_get_team_map() from public;
grant execute on function public.flow_fm_get_team_map() to authenticated;

create or replace function public.flow_fm_get_team_map_profile(
  p_member_id uuid
)
returns table (
  member_id uuid,
  priestess_name text,
  profile_photo_url text,
  profile_status text,
  priestess_title text,
  bio text,
  offerings text,
  modalities text,
  who_she_serves text,
  session_types text,
  scheduling_url text,
  website_url text,
  queendom_name text,
  location text,
  framework_language text,
  profile_available boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to visit a Priestess profile.' using errcode = '28000';
  end if;

  if not public.flow_fm_current_user_can_view_team_map() then
    raise exception 'Priestess profiles are available to Queendom and Flow FM members.' using errcode = '42501';
  end if;

  if p_member_id is null then
    raise exception 'Choose a Priestess to visit.' using errcode = '22023';
  end if;

  return query
  select
    p.id as member_id,
    coalesce(nullif(trim(p.display_name),''),nullif(trim(pp.priestess_name),''),nullif(trim(p.first_name),''),'Flow FM Priestess') as priestess_name,
    coalesce(nullif(trim(pp.profile_photo_url),''),nullif(trim(p.mentor_photo_url),'')) as profile_photo_url,
    coalesce(pp.status,'draft') as profile_status,
    'Flow FM Priestess'::text as priestess_title,
    coalesce(nullif(trim(pp.bio),''),nullif(trim(p.mentor_bio),'')) as bio,
    coalesce(nullif(trim(pp.offerings),''),nullif(trim(array_to_string(p.mentor_specialties, ', ')),'')) as offerings,
    nullif(trim(pp.modalities),'') as modalities,
    nullif(trim(pp.who_she_serves),'') as who_she_serves,
    nullif(trim(pp.session_types),'') as session_types,
    coalesce(nullif(trim(pp.scheduling_url),''),nullif(trim(p.mentor_scheduling_url),''),nullif(trim(p.scheduling_url),''),nullif(trim(p.booking_url),'')) as scheduling_url,
    nullif(trim(pp.website_url),'') as website_url,
    nullif(trim(pp.queendom_name),'') as queendom_name,
    nullif(trim(pp.location),'') as location,
    nullif(trim(pp.framework_language),'') as framework_language,
    (pp.member_id is not null) as profile_available
  from public.profiles p
  left join public.flow_fm_priestess_profiles pp on pp.member_id = p.id
  where p.id = p_member_id
    and public.flow_fm_effective_membership_rank(
      p.id,
      p.membership_type,
      p.membership_rank,
      p.role,
      p.flowfm_started_at,
      p.is_initiated
    ) >= 2
  limit 1;
end;
$$;

revoke all on function public.flow_fm_get_team_map_profile(uuid) from public;
grant execute on function public.flow_fm_get_team_map_profile(uuid) to authenticated;

create or replace function public.flow_fm_get_public_team_map()
returns table (
  presence_key text,
  priestess_name text,
  profile_photo_url text,
  website_url text,
  actual_inner_season text,
  feels_like_inner_season text
)
language sql
stable
security definer
set search_path = public
as $$
  with today_stays as (
    select distinct on (s.client_id)
      s.client_id,
      public.flow_fm_normalize_team_map_season(s.inner_season) as actual_inner_season,
      public.flow_fm_normalize_team_map_season(s.feels_like_inner_season) as feels_like_inner_season,
      s.checked_in_at
    from public.flowtel_stays s
    where s.checkin_date::date = (timezone('America/Los_Angeles', now()))::date
       or (
         s.checked_in_at is not null
         and (timezone('America/Los_Angeles', s.checked_in_at))::date = (timezone('America/Los_Angeles', now()))::date
       )
    order by s.client_id, s.checked_in_at desc nulls last, s.id desc
  )
  select
    md5(p.id::text) as presence_key,
    coalesce(nullif(trim(p.display_name),''),nullif(trim(pp.priestess_name),''),nullif(trim(p.first_name),''),'Flow FM Priestess') as priestess_name,
    coalesce(nullif(trim(pp.profile_photo_url),''),nullif(trim(p.mentor_photo_url),'')) as profile_photo_url,
    nullif(trim(pp.website_url),'') as website_url,
    ts.actual_inner_season,
    ts.feels_like_inner_season
  from today_stays ts
  join public.profiles p on p.id = ts.client_id
  left join public.flow_fm_priestess_profiles pp on pp.member_id = p.id
  where coalesce(p.flow_fm_team_map_opt_out,false) = false
    and public.flow_fm_effective_membership_rank(
      p.id,
      p.membership_type,
      p.membership_rank,
      p.role,
      p.flowfm_started_at,
      p.is_initiated
    ) >= 2
    and ts.actual_inner_season is not null
  order by 2, 1;
$$;

comment on function public.flow_fm_get_public_team_map() is
  'Public-safe daily Flow FM Team Map data using preserved profile rank, Auth metadata, role/initiation, and Profile Studio membership signals.';

revoke all on function public.flow_fm_get_public_team_map() from public;
grant execute on function public.flow_fm_get_public_team_map() to anon, authenticated;


create or replace function public.flow_fm_get_team_map_diagnostics()
returns table (
  member_id uuid,
  member_name text,
  email text,
  membership_type text,
  membership_rank integer,
  auth_membership_type text,
  role text,
  actual_inner_season text,
  feels_like_inner_season text,
  team_map_visible boolean,
  effective_membership_rank integer,
  included_on_map boolean,
  inclusion_reason text
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_today date := (timezone('America/Los_Angeles', now()))::date;
begin
  -- SQL Editor/service-role runs have no auth.uid() and may inspect directly.
  -- Authenticated browser callers must be the owner Concierge.
  if auth.uid() is not null and not public.flowtel_current_user_is_concierge() then
    raise exception 'Only the owner Concierge may inspect Team Map diagnostics.' using errcode = '42501';
  end if;

  return query
  with today_stays as (
    select distinct on (s.client_id)
      s.client_id,
      public.flow_fm_normalize_team_map_season(s.inner_season) as actual_inner_season,
      public.flow_fm_normalize_team_map_season(s.feels_like_inner_season) as feels_like_inner_season
    from public.flowtel_stays s
    where s.checkin_date::date = v_today
       or (s.checked_in_at is not null and (timezone('America/Los_Angeles', s.checked_in_at))::date = v_today)
    order by s.client_id, s.checked_in_at desc nulls last, s.id desc
  ), inspected as (
    select
      p.*,
      ts.actual_inner_season,
      ts.feels_like_inner_season,
      u.raw_user_meta_data ->> 'membership_type' as auth_membership_type,
      public.flow_fm_effective_membership_rank(
        p.id,
        p.membership_type,
        p.membership_rank,
        p.role,
        p.flowfm_started_at,
        p.is_initiated
      ) as effective_rank
    from today_stays ts
    join public.profiles p on p.id = ts.client_id
    left join auth.users u on u.id = p.id
  )
  select
    i.id,
    public.flowtel_resolve_display_name(i.display_name, i.first_name, i.last_name, i.email, 'Guest') as member_name,
    i.email,
    i.membership_type,
    coalesce(i.membership_rank,0),
    i.auth_membership_type,
    i.role,
    i.actual_inner_season,
    i.feels_like_inner_season,
    not coalesce(i.flow_fm_team_map_opt_out,false) as team_map_visible,
    i.effective_rank,
    (
      not coalesce(i.flow_fm_team_map_opt_out,false)
      and i.effective_rank >= 2
      and i.actual_inner_season is not null
    ) as included_on_map,
    case
      when coalesce(i.flow_fm_team_map_opt_out,false) then 'Excluded: Team Map visibility is turned off.'
      when i.effective_rank < 2 then 'Excluded: profile is currently recognized as Queendom-only.'
      when i.actual_inner_season is null then 'Excluded: today''s stay has no recognized actual Inner Season.'
      else 'Included: checked in today and recognized as Flow FM/Council team.'
    end as inclusion_reason
  from inspected i
  order by 2, 1;
end;
$$;

comment on function public.flow_fm_get_team_map_diagnostics() is
  'Owner-only daily diagnostic showing why each checked-in member is included or excluded from the Flow FM Team Map.';

revoke all on function public.flow_fm_get_team_map_diagnostics() from public;
grant execute on function public.flow_fm_get_team_map_diagnostics() to authenticated;


create or replace function public.flowtel_complete_turndown(
  p_stay_id uuid,
  p_witness_note text default ''
)
returns public.flowtel_stays
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_concierge boolean := false;
  v_profile_display_name text;
  v_profile_first_name text;
  v_profile_last_name text;
  v_profile_email text;
  v_profile_role text;
  v_label text := 'Your Concierge';
  v_existing public.flowtel_stays%rowtype;
  v_now timestamptz := now();
  v_note_text text := nullif(trim(coalesce(p_witness_note, '')), '');
  v_notes jsonb := '[]'::jsonb;
  v_updated public.flowtel_stays%rowtype;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to complete Turndown Service.' using errcode = '28000';
  end if;

  select public.flowtel_current_user_is_concierge() into v_is_concierge;
  if not coalesce(v_is_concierge, false) then
    raise exception 'Only Concierge team members can complete Turndown Service.' using errcode = '42501';
  end if;

  select *
    into v_existing
    from public.flowtel_stays
    where id = p_stay_id
    for update;

  if not found then
    raise exception 'Flowtel stay not found.' using errcode = 'P0002';
  end if;

  select display_name, first_name, last_name, email, role
    into v_profile_display_name, v_profile_first_name, v_profile_last_name, v_profile_email, v_profile_role
    from public.profiles
    where id = v_user_id;

  v_label := trim(
    concat(
      case when v_profile_role = 'practitioner' then 'Practitioner ' else 'Concierge ' end,
      public.flowtel_resolve_display_name(
        v_profile_display_name,
        v_profile_first_name,
        v_profile_last_name,
        v_profile_email,
        'Your Concierge'
      )
    )
  );

  -- Preserve existing notes. If an older note is plain text instead of JSON, wrap it as
  -- a legacy note so the guest-facing Concierge Notes card still has a readable log.
  if v_existing.witness_note is not null and trim(v_existing.witness_note) <> '' then
    begin
      v_notes := v_existing.witness_note::jsonb;
      if jsonb_typeof(v_notes) <> 'array' then
        v_notes := jsonb_build_array(v_notes);
      end if;
    exception when others then
      v_notes := jsonb_build_array(
        jsonb_build_object(
          'id', 'legacy-' || extract(epoch from v_now)::text,
          'note', v_existing.witness_note,
          'by', coalesce(v_existing.witness_note_by, 'Your Concierge'),
          'at', coalesce(v_existing.witnessed_at, v_existing.updated_at, v_now)::text
        )
      );
    end;
  end if;

  if v_note_text is not null then
    v_notes := v_notes || jsonb_build_array(
      jsonb_build_object(
        'id', 'note-' || replace(v_now::text, ' ', 'T'),
        'note', v_note_text,
        'by', v_label,
        'at', v_now::text
      )
    );
  end if;

  update public.flowtel_stays
    set turndown_status = 'completed',
        turndown_completed_at = v_now,
        turndown_completed_by = v_user_id,
        turndown_completed_by_name = v_label,
        witnessed_by = v_user_id,
        witnessed_at = v_now,
        witness_note = v_notes::text,
        witness_note_by = v_label,
        stay_status = case
          when public.flowtel_stays.stay_status = 'checked_out' then public.flowtel_stays.stay_status
          else 'witnessed'
        end,
        updated_at = v_now
    where id = p_stay_id
    returning * into v_updated;

  return v_updated;
end;
$$;

revoke all on function public.flowtel_complete_turndown(uuid, text) from public;
grant execute on function public.flowtel_complete_turndown(uuid, text) to authenticated;

comment on function public.flowtel_complete_turndown(uuid, text) is
  'Completes a Turndown request from the Concierge Desk and appends the optional Concierge Note. Uses the canonical Flowtel display name for future Concierge attribution. Updated by Flowtel v0.10.52.';

-- Keep Profile Studio's compatibility name aligned whenever a canonical display
-- name is already present, without rewriting legal names or profile content.
update public.flow_fm_priestess_profiles pp
set priestess_name = p.display_name,
    updated_at = now()
from public.profiles p
where p.id = pp.member_id
  and nullif(trim(coalesce(p.display_name,'')), '') is not null
  and pp.priestess_name is distinct from p.display_name;
