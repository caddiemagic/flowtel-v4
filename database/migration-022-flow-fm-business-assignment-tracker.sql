-- Flowtel v0.10.0 — Flow FM Business Assignment Tracker
--
-- Purpose:
-- 1. Turn the 13 Flow FM business assignments into trackable member records.
-- 2. Let Flow FM members save drafts and submit assignment evidence.
-- 3. Let connected mentors and admin/owner accounts tend submitted assignments.
-- 4. Preserve mentor consent rules and avoid gamification language.

create table if not exists public.flow_fm_assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  assignment_index integer not null check (assignment_index between 1 and 13),
  status text not null default 'not_started' check (status in ('not_started','drafting','submitted','reviewed','complete','needs_revision')),
  submission_text text,
  submission_url text,
  attachment_url text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  mentor_note text,
  admin_note text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(member_id, assignment_index)
);

comment on table public.flow_fm_assignment_submissions is
  'Flow FM business assignment tracker records for the 13 Moons initiation path.';
comment on column public.flow_fm_assignment_submissions.member_id is
  'The Flow FM member / guest whose assignment is being tracked.';
comment on column public.flow_fm_assignment_submissions.assignment_index is
  'Flow FM assignment number, 1 through 13, matching shared/initiation.js.';
comment on column public.flow_fm_assignment_submissions.status is
  'Assignment state: not_started, drafting, submitted, reviewed, complete, or needs_revision.';
comment on column public.flow_fm_assignment_submissions.submission_text is
  'Member notes, reflection, or written evidence for the assignment.';
comment on column public.flow_fm_assignment_submissions.submission_url is
  'Optional URL for the assignment evidence, such as a page, video, audio, design, or document.';
comment on column public.flow_fm_assignment_submissions.attachment_url is
  'Optional manually pasted file or media URL while storage/source-of-truth remains undecided.';
comment on column public.flow_fm_assignment_submissions.mentor_note is
  'Mentor-facing review note visible to the member and care team.';
comment on column public.flow_fm_assignment_submissions.admin_note is
  'Internal/admin review note for the assignment record.';

create index if not exists flow_fm_assignment_member_idx
  on public.flow_fm_assignment_submissions (member_id, assignment_index);

create index if not exists flow_fm_assignment_status_idx
  on public.flow_fm_assignment_submissions (status, updated_at desc);

create index if not exists flow_fm_assignment_review_idx
  on public.flow_fm_assignment_submissions (submitted_at desc)
  where status in ('submitted','needs_revision');

alter table public.flow_fm_assignment_submissions enable row level security;

-- Consent-aware helper: members see their own records, admins/owners see all,
-- and connected mentors see records only while relationship consent is active.
create or replace function public.flow_fm_can_view_assignment_member(p_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and p_member_id is not null
    and (
      p_member_id = auth.uid()
      or public.flowtel_current_user_is_admin_or_owner()
      or exists (
        select 1
        from public.flowtel_practitioner_relationships r
        where r.client_id = p_member_id
          and r.practitioner_id = auth.uid()
          and r.status = 'connected'
          and coalesce(r.consent_granted, false) = true
      )
    );
$$;

grant execute on function public.flow_fm_can_view_assignment_member(uuid) to authenticated;

create or replace function public.flow_fm_current_user_can_tend_assignments()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role in ('practitioner','admin','owner')
        or regexp_replace(lower(coalesce(p.membership_type,'')), '[^a-z]', '', 'g') in ('flowfm','flowfmmember','council')
        or p.flowfm_started_at is not null
        or coalesce(p.is_initiated, false) = true
      )
  );
$$;

grant execute on function public.flow_fm_current_user_can_tend_assignments() to authenticated;

-- Direct table access is intentionally read-only. Mutations happen through RPCs
-- so members cannot directly write review fields and mentors cannot bypass consent checks.
drop policy if exists "Flow FM assignment records are consent-aware readable" on public.flow_fm_assignment_submissions;
create policy "Flow FM assignment records are consent-aware readable"
  on public.flow_fm_assignment_submissions
  for select
  using (public.flow_fm_can_view_assignment_member(member_id));

revoke insert, update, delete on public.flow_fm_assignment_submissions from anon, authenticated;
grant select on public.flow_fm_assignment_submissions to authenticated;

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
    coalesce(nullif(trim(concat_ws(' ', reviewer.first_name, reviewer.last_name)), ''), reviewer.email, 'Flowtel Mentor') as reviewer_name,
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

create or replace function public.flow_fm_save_assignment_draft(
  p_assignment_index integer,
  p_submission_text text default null,
  p_submission_url text default null,
  p_attachment_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_existing public.flow_fm_assignment_submissions%rowtype;
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to tend this assignment.' using errcode = '28000';
  end if;

  if not public.flow_fm_current_user_can_tend_assignments() then
    raise exception 'Flow FM assignments are available to Flow FM members.' using errcode = '42501';
  end if;

  if p_assignment_index is null or p_assignment_index < 1 or p_assignment_index > 13 then
    raise exception 'Choose a Flow FM assignment between 1 and 13.' using errcode = '22023';
  end if;

  select * into v_existing
  from public.flow_fm_assignment_submissions
  where member_id = v_user_id
    and assignment_index = p_assignment_index
  for update;

  if found and v_existing.status = 'complete' then
    raise exception 'This assignment has already been completed. Ask your mentor before reopening it.' using errcode = '23514';
  end if;

  if found then
    update public.flow_fm_assignment_submissions
      set status = 'drafting',
          submission_text = nullif(trim(coalesce(p_submission_text,'')), ''),
          submission_url = nullif(trim(coalesce(p_submission_url,'')), ''),
          attachment_url = nullif(trim(coalesce(p_attachment_url,'')), ''),
          updated_at = v_now
      where id = v_existing.id
      returning id into v_id;
  else
    insert into public.flow_fm_assignment_submissions (
      member_id,
      assignment_index,
      status,
      submission_text,
      submission_url,
      attachment_url,
      created_at,
      updated_at
    ) values (
      v_user_id,
      p_assignment_index,
      'drafting',
      nullif(trim(coalesce(p_submission_text,'')), ''),
      nullif(trim(coalesce(p_submission_url,'')), ''),
      nullif(trim(coalesce(p_attachment_url,'')), ''),
      v_now,
      v_now
    ) returning id into v_id;
  end if;

  return v_id;
end;
$$;

grant execute on function public.flow_fm_save_assignment_draft(integer, text, text, text) to authenticated;

create or replace function public.flow_fm_submit_assignment(
  p_assignment_index integer,
  p_submission_text text default null,
  p_submission_url text default null,
  p_attachment_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_existing public.flow_fm_assignment_submissions%rowtype;
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to submit this assignment.' using errcode = '28000';
  end if;

  if not public.flow_fm_current_user_can_tend_assignments() then
    raise exception 'Flow FM assignments are available to Flow FM members.' using errcode = '42501';
  end if;

  if p_assignment_index is null or p_assignment_index < 1 or p_assignment_index > 13 then
    raise exception 'Choose a Flow FM assignment between 1 and 13.' using errcode = '22023';
  end if;

  if nullif(trim(coalesce(p_submission_text,'')), '') is null
     and nullif(trim(coalesce(p_submission_url,'')), '') is null
     and nullif(trim(coalesce(p_attachment_url,'')), '') is null then
    raise exception 'Leave a note or link before sending this assignment to be witnessed.' using errcode = '22023';
  end if;

  select * into v_existing
  from public.flow_fm_assignment_submissions
  where member_id = v_user_id
    and assignment_index = p_assignment_index
  for update;

  if found and v_existing.status = 'complete' then
    raise exception 'This assignment has already been completed. Ask your mentor before reopening it.' using errcode = '23514';
  end if;

  if found then
    update public.flow_fm_assignment_submissions
      set status = 'submitted',
          submission_text = nullif(trim(coalesce(p_submission_text,'')), ''),
          submission_url = nullif(trim(coalesce(p_submission_url,'')), ''),
          attachment_url = nullif(trim(coalesce(p_attachment_url,'')), ''),
          submitted_at = v_now,
          reviewed_at = null,
          reviewed_by = null,
          completed_at = null,
          updated_at = v_now
      where id = v_existing.id
      returning id into v_id;
  else
    insert into public.flow_fm_assignment_submissions (
      member_id,
      assignment_index,
      status,
      submission_text,
      submission_url,
      attachment_url,
      submitted_at,
      created_at,
      updated_at
    ) values (
      v_user_id,
      p_assignment_index,
      'submitted',
      nullif(trim(coalesce(p_submission_text,'')), ''),
      nullif(trim(coalesce(p_submission_url,'')), ''),
      nullif(trim(coalesce(p_attachment_url,'')), ''),
      v_now,
      v_now,
      v_now
    ) returning id into v_id;
  end if;

  return v_id;
end;
$$;

grant execute on function public.flow_fm_submit_assignment(integer, text, text, text) to authenticated;

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
  v_role text;
  v_submission public.flow_fm_assignment_submissions%rowtype;
  v_status text := lower(trim(coalesce(p_status,'')));
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to review Flow FM assignments.' using errcode = '28000';
  end if;

  if p_submission_id is null then
    raise exception 'Choose an assignment submission to review.' using errcode = '22023';
  end if;

  if v_status not in ('reviewed','complete','needs_revision') then
    raise exception 'Review status must be reviewed, complete, or needs_revision.' using errcode = '22023';
  end if;

  select role into v_role from public.profiles where id = v_user_id;
  if coalesce(v_role,'') not in ('practitioner','admin','owner') then
    raise exception 'Only mentors and admins can review Flow FM assignments.' using errcode = '42501';
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

  if not (
    public.flowtel_current_user_is_admin_or_owner()
    or exists (
      select 1
      from public.flowtel_practitioner_relationships r
      where r.client_id = v_submission.member_id
        and r.practitioner_id = v_user_id
        and r.status = 'connected'
        and coalesce(r.consent_granted, false) = true
    )
  ) then
    raise exception 'This assignment can only be reviewed with active mentor consent.' using errcode = '42501';
  end if;

  update public.flow_fm_assignment_submissions
    set status = v_status,
        reviewed_at = v_now,
        reviewed_by = v_user_id,
        mentor_note = nullif(trim(coalesce(p_mentor_note,'')), ''),
        admin_note = case
          when public.flowtel_current_user_is_admin_or_owner() then nullif(trim(coalesce(p_admin_note,'')), '')
          else admin_note
        end,
        completed_at = case when v_status = 'complete' then coalesce(completed_at, v_now) else null end,
        updated_at = v_now
    where id = v_submission.id
    returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.flow_fm_review_assignment(uuid, text, text, text) to authenticated;

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
  v_role text;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to view the Flow FM review queue.' using errcode = '28000';
  end if;

  select role into v_role from public.profiles where id = v_user_id;
  if coalesce(v_role,'') not in ('practitioner','admin','owner') then
    raise exception 'Only mentors and admins can view the Flow FM review queue.' using errcode = '42501';
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
    case
      when public.flowtel_current_user_is_admin_or_owner() then s.admin_note
      else null
    end as admin_note,
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
