-- Flowtel v0.10.1 — Priestess Profile Studio
--
-- Purpose:
-- 1. Support Flow FM Assignment 1 with a guided Priestess Profile intake.
-- 2. Let Flow FM members save profile drafts and submit them for review.
-- 3. Let connected mentors and Flowtel admins approve or request revisions.
-- 4. Generate a display-only profile record without opening the public Queendom marketplace yet.

create table if not exists public.flow_fm_priestess_profiles (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft','submitted','approved','needs_revision')),
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
  network_opt_in boolean not null default false,
  revenue_share_opt_in boolean not null default false,
  mentor_note text,
  admin_note text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  approved_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(member_id)
);

comment on table public.flow_fm_priestess_profiles is
  'Guided Priestess Profile Studio drafts and review records for Flow FM Assignment 1.';
comment on column public.flow_fm_priestess_profiles.status is
  'Profile state: draft, submitted, approved, or needs_revision.';
comment on column public.flow_fm_priestess_profiles.profile_photo_url is
  'Manual profile photo URL placeholder until Squarespace or Supabase media storage is selected.';
comment on column public.flow_fm_priestess_profiles.framework_language is
  'The womb, moon, magic, and framework language the practitioner wants reflected in her profile.';
comment on column public.flow_fm_priestess_profiles.network_opt_in is
  'Practitioner network interest signal. Legal/ops and revenue-share enforcement are intentionally deferred.';
comment on column public.flow_fm_priestess_profiles.revenue_share_opt_in is
  'Revenue-share/network opt-in signal for future ops review only; not used for payments in this release.';

create index if not exists flow_fm_priestess_profiles_member_idx
  on public.flow_fm_priestess_profiles (member_id);

create index if not exists flow_fm_priestess_profiles_status_idx
  on public.flow_fm_priestess_profiles (status, updated_at desc);

alter table public.flow_fm_priestess_profiles enable row level security;

-- Profiles follow the same consent-aware visibility as Flow FM assignments:
-- members see their own profile, admins/owners see all, connected mentors see client profiles
-- while mentor consent is active.
drop policy if exists "Priestess profiles are consent-aware readable" on public.flow_fm_priestess_profiles;
create policy "Priestess profiles are consent-aware readable"
  on public.flow_fm_priestess_profiles
  for select
  using (public.flow_fm_can_view_assignment_member(member_id));

revoke insert, update, delete on public.flow_fm_priestess_profiles from anon, authenticated;
grant select on public.flow_fm_priestess_profiles to authenticated;

create or replace function public.flow_fm_clean_profile_url(p_value text)
returns text
language sql
immutable
as $$
  select case
    when nullif(trim(coalesce(p_value,'')), '') is null then null
    when trim(p_value) ~* '^(https?://|mailto:)' then trim(p_value)
    else null
  end;
$$;

grant execute on function public.flow_fm_clean_profile_url(text) to authenticated;

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
    coalesce(nullif(trim(concat_ws(' ', member.first_name, member.last_name)), ''), member.email, 'Flowtel Guest') as member_name,
    member.email as member_email,
    pp.status,
    pp.priestess_name,
    pp.legal_name,
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
    coalesce(nullif(trim(concat_ws(' ', reviewer.first_name, reviewer.last_name)), ''), reviewer.email, 'Flowtel Mentor') as reviewer_name,
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

create or replace function public.flow_fm_save_priestess_profile_draft(
  p_priestess_name text default null,
  p_legal_name text default null,
  p_profile_email text default null,
  p_profile_photo_url text default null,
  p_bio text default null,
  p_modalities text default null,
  p_who_she_serves text default null,
  p_session_types text default null,
  p_scheduling_url text default null,
  p_website_url text default null,
  p_instagram_url text default null,
  p_tiktok_url text default null,
  p_podcast_url text default null,
  p_queendom_name text default null,
  p_offerings text default null,
  p_location text default null,
  p_timezone text default null,
  p_framework_language text default null,
  p_network_opt_in boolean default false,
  p_revenue_share_opt_in boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to tend your Priestess Profile.' using errcode = '28000';
  end if;

  if not public.flow_fm_current_user_can_tend_assignments() then
    raise exception 'The Priestess Profile Studio opens for Flow FM members.' using errcode = '42501';
  end if;

  insert into public.flow_fm_priestess_profiles (
    member_id,
    status,
    priestess_name,
    legal_name,
    profile_email,
    profile_photo_url,
    bio,
    modalities,
    who_she_serves,
    session_types,
    scheduling_url,
    website_url,
    instagram_url,
    tiktok_url,
    podcast_url,
    queendom_name,
    offerings,
    location,
    timezone,
    framework_language,
    network_opt_in,
    revenue_share_opt_in,
    created_at,
    updated_at
  ) values (
    v_user_id,
    'draft',
    nullif(trim(coalesce(p_priestess_name,'')), ''),
    nullif(trim(coalesce(p_legal_name,'')), ''),
    nullif(trim(coalesce(p_profile_email,'')), ''),
    public.flow_fm_clean_profile_url(p_profile_photo_url),
    nullif(trim(coalesce(p_bio,'')), ''),
    nullif(trim(coalesce(p_modalities,'')), ''),
    nullif(trim(coalesce(p_who_she_serves,'')), ''),
    nullif(trim(coalesce(p_session_types,'')), ''),
    public.flow_fm_clean_profile_url(p_scheduling_url),
    public.flow_fm_clean_profile_url(p_website_url),
    public.flow_fm_clean_profile_url(p_instagram_url),
    public.flow_fm_clean_profile_url(p_tiktok_url),
    public.flow_fm_clean_profile_url(p_podcast_url),
    nullif(trim(coalesce(p_queendom_name,'')), ''),
    nullif(trim(coalesce(p_offerings,'')), ''),
    nullif(trim(coalesce(p_location,'')), ''),
    nullif(trim(coalesce(p_timezone,'')), ''),
    nullif(trim(coalesce(p_framework_language,'')), ''),
    coalesce(p_network_opt_in,false),
    coalesce(p_revenue_share_opt_in,false),
    v_now,
    v_now
  )
  on conflict (member_id) do update
    set status = case when public.flow_fm_priestess_profiles.status = 'approved' then 'draft' else 'draft' end,
        priestess_name = excluded.priestess_name,
        legal_name = excluded.legal_name,
        profile_email = excluded.profile_email,
        profile_photo_url = excluded.profile_photo_url,
        bio = excluded.bio,
        modalities = excluded.modalities,
        who_she_serves = excluded.who_she_serves,
        session_types = excluded.session_types,
        scheduling_url = excluded.scheduling_url,
        website_url = excluded.website_url,
        instagram_url = excluded.instagram_url,
        tiktok_url = excluded.tiktok_url,
        podcast_url = excluded.podcast_url,
        queendom_name = excluded.queendom_name,
        offerings = excluded.offerings,
        location = excluded.location,
        timezone = excluded.timezone,
        framework_language = excluded.framework_language,
        network_opt_in = excluded.network_opt_in,
        revenue_share_opt_in = excluded.revenue_share_opt_in,
        updated_at = v_now
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.flow_fm_save_priestess_profile_draft(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,boolean,boolean) to authenticated;

create or replace function public.flow_fm_submit_priestess_profile(
  p_priestess_name text default null,
  p_legal_name text default null,
  p_profile_email text default null,
  p_profile_photo_url text default null,
  p_bio text default null,
  p_modalities text default null,
  p_who_she_serves text default null,
  p_session_types text default null,
  p_scheduling_url text default null,
  p_website_url text default null,
  p_instagram_url text default null,
  p_tiktok_url text default null,
  p_podcast_url text default null,
  p_queendom_name text default null,
  p_offerings text default null,
  p_location text default null,
  p_timezone text default null,
  p_framework_language text default null,
  p_network_opt_in boolean default false,
  p_revenue_share_opt_in boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
begin
  if nullif(trim(coalesce(p_priestess_name,'')), '') is null then
    raise exception 'Add your Priestess name before sending the profile to be witnessed.' using errcode = '22023';
  end if;

  if nullif(trim(coalesce(p_bio,'')), '') is null then
    raise exception 'Add your About Me before sending the profile to be witnessed.' using errcode = '22023';
  end if;

  select public.flow_fm_save_priestess_profile_draft(
    p_priestess_name,
    p_legal_name,
    p_profile_email,
    p_profile_photo_url,
    p_bio,
    p_modalities,
    p_who_she_serves,
    p_session_types,
    p_scheduling_url,
    p_website_url,
    p_instagram_url,
    p_tiktok_url,
    p_podcast_url,
    p_queendom_name,
    p_offerings,
    p_location,
    p_timezone,
    p_framework_language,
    p_network_opt_in,
    p_revenue_share_opt_in
  ) into v_id;

  update public.flow_fm_priestess_profiles
    set status = 'submitted',
        submitted_at = now(),
        reviewed_at = null,
        approved_at = null,
        reviewed_by = null,
        updated_at = now()
    where id = v_id
      and member_id = v_user_id;

  return v_id;
end;
$$;

grant execute on function public.flow_fm_submit_priestess_profile(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,boolean,boolean) to authenticated;

create or replace function public.flow_fm_review_priestess_profile(
  p_profile_id uuid,
  p_status text,
  p_mentor_note text default null,
  p_admin_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_role text;
  v_profile public.flow_fm_priestess_profiles%rowtype;
  v_status text := lower(trim(coalesce(p_status,'')));
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to review Priestess Profiles.' using errcode = '28000';
  end if;

  if p_profile_id is null then
    raise exception 'Choose a Priestess Profile to review.' using errcode = '22023';
  end if;

  if v_status not in ('approved','needs_revision') then
    raise exception 'Profile review status must be approved or needs_revision.' using errcode = '22023';
  end if;

  select role into v_role from public.profiles where id = v_user_id;
  if coalesce(v_role,'') not in ('practitioner','admin','owner') then
    raise exception 'Only mentors and admins can review Priestess Profiles.' using errcode = '42501';
  end if;

  select * into v_profile
  from public.flow_fm_priestess_profiles
  where id = p_profile_id
  for update;

  if not found then
    raise exception 'Priestess Profile not found.' using errcode = 'P0002';
  end if;

  if v_profile.member_id = v_user_id then
    raise exception 'You cannot review your own Priestess Profile.' using errcode = '42501';
  end if;

  if not (
    public.flowtel_current_user_is_admin_or_owner()
    or exists (
      select 1
      from public.flowtel_practitioner_relationships r
      where r.client_id = v_profile.member_id
        and r.practitioner_id = v_user_id
        and r.status = 'connected'
        and coalesce(r.consent_granted, false) = true
    )
  ) then
    raise exception 'This Priestess Profile can only be reviewed with active mentor consent.' using errcode = '42501';
  end if;

  update public.flow_fm_priestess_profiles
    set status = v_status,
        mentor_note = nullif(trim(coalesce(p_mentor_note,'')), ''),
        admin_note = case
          when public.flowtel_current_user_is_admin_or_owner() then nullif(trim(coalesce(p_admin_note,'')), '')
          else admin_note
        end,
        reviewed_at = v_now,
        approved_at = case when v_status = 'approved' then v_now else null end,
        reviewed_by = v_user_id,
        updated_at = v_now
    where id = v_profile.id
    returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.flow_fm_review_priestess_profile(uuid, text, text, text) to authenticated;

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
  v_role text;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to view Priestess Profile reviews.' using errcode = '28000';
  end if;

  select role into v_role from public.profiles where id = v_user_id;
  if coalesce(v_role,'') not in ('practitioner','admin','owner') then
    raise exception 'Only mentors and admins can view Priestess Profile reviews.' using errcode = '42501';
  end if;

  return query
  select
    pp.id,
    pp.member_id,
    coalesce(nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), p.email, 'Flowtel Guest') as member_name,
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
    case when public.flowtel_current_user_is_admin_or_owner() then pp.admin_note else null end as admin_note,
    pp.updated_at
  from public.flow_fm_priestess_profiles pp
  join public.profiles p on p.id = pp.member_id
  where pp.status = 'submitted'
    and pp.member_id <> v_user_id
    and (
      public.flowtel_current_user_is_admin_or_owner()
      or exists (
        select 1
        from public.flowtel_practitioner_relationships r
        where r.client_id = pp.member_id
          and r.practitioner_id = v_user_id
          and r.status = 'connected'
          and coalesce(r.consent_granted, false) = true
      )
    )
  order by pp.submitted_at desc nulls last, pp.updated_at desc
  limit 100;
end;
$$;

grant execute on function public.flow_fm_get_priestess_profile_review_queue() to authenticated;
