-- Flowtel v0.10.6 — Review Desk Stabilization
--
-- Purpose:
-- 1. Make Flow FM review queue permission checks more tolerant of mentor/practitioner role labels.
-- 2. Return empty queues instead of throwing for signed-in users who are not review roles.
-- 3. Preserve mentor consent boundaries for non-admin review visibility.

create or replace function public.flow_fm_current_user_can_review()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and (
          lower(coalesce(p.role,'')) in ('practitioner','mentor','admin','owner','manager','concierge')
          or regexp_replace(lower(coalesce(p.membership_type,'')), '[^a-z]', '', 'g') in ('flowfm','flowfmmember','council')
        )
    );
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

  if not public.flow_fm_current_user_can_review() then
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
    case when public.flowtel_current_user_is_admin_or_owner() then s.admin_note else null end as admin_note,
    s.completed_at,
    s.updated_at
  from public.flow_fm_assignment_submissions s
  join public.profiles p on p.id = s.member_id
  where s.status = 'submitted'
    and s.member_id <> v_user_id
    and (
      public.flowtel_current_user_is_admin_or_owner()
      or exists (
        select 1
        from public.flowtel_practitioner_relationships r
        where r.client_id = s.member_id
          and r.practitioner_id = v_user_id
          and r.status = 'connected'
          and coalesce(r.consent_granted, false) = true
      )
    )
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

  if not public.flow_fm_current_user_can_review() then
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
