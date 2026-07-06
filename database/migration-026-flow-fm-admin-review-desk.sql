-- Flowtel v0.10.8 — Admin Review Desk Boundary
--
-- Purpose:
-- Restrict Flow FM Review Desk queue access and review actions to admin/owner accounts only.
-- Practitioners continue using their guest-facing Mentor Panel / client relationship surfaces,
-- not the Flow FM administrative Review Desk.

create or replace function public.flow_fm_current_user_can_review()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.flowtel_current_user_is_admin_or_owner();
$$;

grant execute on function public.flow_fm_current_user_can_review() to authenticated;

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
    coalesce(nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), p.email, 'Flowtel Guest') as member_name,
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

grant execute on function public.flow_fm_get_priestess_profile_review_queue() to authenticated;

create or replace function public.flow_fm_review_assignment(
  p_submission_id uuid,
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
  v_submission public.flow_fm_assignment_submissions%rowtype;
  v_status text := lower(trim(coalesce(p_status,'')));
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to review Flow FM assignments.' using errcode = '28000';
  end if;

  if not public.flowtel_current_user_is_admin_or_owner() then
    raise exception 'The Flow FM Review Desk is reserved for admin and owner accounts.' using errcode = '42501';
  end if;

  if p_submission_id is null then
    raise exception 'Choose an assignment submission to review.' using errcode = '22023';
  end if;

  if v_status not in ('reviewed','complete','needs_revision') then
    raise exception 'Review status must be reviewed, complete, or needs_revision.' using errcode = '22023';
  end if;

  select * into v_submission
  from public.flow_fm_assignment_submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'Assignment submission not found.' using errcode = 'P0002';
  end if;

  if v_submission.member_id = v_user_id then
    raise exception 'You cannot review your own Flow FM assignment.' using errcode = '42501';
  end if;

  update public.flow_fm_assignment_submissions
    set status = v_status,
        reviewed_at = v_now,
        reviewed_by = v_user_id,
        mentor_note = nullif(trim(coalesce(p_mentor_note,'')), ''),
        admin_note = nullif(trim(coalesce(p_admin_note,'')), ''),
        completed_at = case when v_status = 'complete' then coalesce(completed_at, v_now) else null end,
        updated_at = v_now
    where id = v_submission.id
    returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.flow_fm_review_assignment(uuid, text, text, text) to authenticated;

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
  v_profile public.flow_fm_priestess_profiles%rowtype;
  v_status text := lower(trim(coalesce(p_status,'')));
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to review Priestess Profiles.' using errcode = '28000';
  end if;

  if not public.flowtel_current_user_is_admin_or_owner() then
    raise exception 'The Flow FM Review Desk is reserved for admin and owner accounts.' using errcode = '42501';
  end if;

  if p_profile_id is null then
    raise exception 'Choose a Priestess Profile to review.' using errcode = '22023';
  end if;

  if v_status not in ('approved','needs_revision') then
    raise exception 'Profile review status must be approved or needs_revision.' using errcode = '22023';
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

  update public.flow_fm_priestess_profiles
    set status = v_status,
        mentor_note = nullif(trim(coalesce(p_mentor_note,'')), ''),
        admin_note = nullif(trim(coalesce(p_admin_note,'')), ''),
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
