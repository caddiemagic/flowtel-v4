-- Caddie Magic v0.2.0 — Locker Room + Caddie Review Service
--
-- Purpose:
-- 1. Make course optional for scored rounds.
-- 2. Add a player-requested Caddie Review workflow.
-- 3. Route review requests securely to the Flowtel owner/admin Concierge Desk.
-- 4. Let the owner complete a review by sending a private Caddie Note.

-- ---------------------------------------------------------------------------
-- Course is optional for scored rounds
-- ---------------------------------------------------------------------------

alter table public.caddie_magic_round_logs
  drop constraint if exists caddie_magic_round_logs_entry_type_check;

alter table public.caddie_magic_round_logs
  add constraint caddie_magic_round_logs_entry_type_check
  check (
    (
      entry_type = 'round'
      and score is not null
    )
    or
    (
      entry_type = 'reflection'
      and score is null
      and course_played is null
      and nullif(btrim(swing_thoughts), '') is not null
    )
  );

comment on column public.caddie_magic_round_logs.course_played is
  'Optional course name for a scored round. Thought-only reflections never store a course.';

-- ---------------------------------------------------------------------------
-- Caddie Review requests
-- ---------------------------------------------------------------------------

create table if not exists public.caddie_magic_review_requests (
  id uuid primary key default gen_random_uuid(),
  player_profile_id uuid not null references public.caddie_magic_player_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'requested' check (status in ('requested', 'completed')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  completed_by uuid references public.profiles(id) on delete set null,
  response_note_id uuid references public.caddie_magic_player_notes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.caddie_magic_review_requests is
  'Player requests asking the Caddie Magic owner to review scores and swing thoughts for patterns.';

create unique index if not exists caddie_magic_review_requests_one_open_idx
  on public.caddie_magic_review_requests (player_profile_id)
  where status = 'requested';

create index if not exists caddie_magic_review_requests_status_requested_idx
  on public.caddie_magic_review_requests (status, requested_at desc);

create index if not exists caddie_magic_review_requests_player_idx
  on public.caddie_magic_review_requests (player_profile_id, requested_at desc);

drop trigger if exists caddie_magic_review_requests_set_updated_at on public.caddie_magic_review_requests;
create trigger caddie_magic_review_requests_set_updated_at
  before update on public.caddie_magic_review_requests
  for each row execute function public.caddie_magic_set_updated_at();

alter table public.caddie_magic_review_requests enable row level security;

drop policy if exists "Players can read their Caddie Magic review requests" on public.caddie_magic_review_requests;
create policy "Players can read their Caddie Magic review requests"
  on public.caddie_magic_review_requests
  for select
  using (
    user_id = auth.uid()
    or public.flowtel_current_user_is_admin_or_owner()
  );

drop policy if exists "Players can create their Caddie Magic review requests" on public.caddie_magic_review_requests;
create policy "Players can create their Caddie Magic review requests"
  on public.caddie_magic_review_requests
  for insert
  with check (
    user_id = auth.uid()
    and status = 'requested'
    and completed_at is null
    and completed_by is null
    and response_note_id is null
    and exists (
      select 1
      from public.caddie_magic_player_profiles p
      where p.id = player_profile_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "Admins can update Caddie Magic review requests" on public.caddie_magic_review_requests;
create policy "Admins can update Caddie Magic review requests"
  on public.caddie_magic_review_requests
  for update
  using (public.flowtel_current_user_is_admin_or_owner())
  with check (public.flowtel_current_user_is_admin_or_owner());

drop policy if exists "Admins can delete Caddie Magic review requests" on public.caddie_magic_review_requests;
create policy "Admins can delete Caddie Magic review requests"
  on public.caddie_magic_review_requests
  for delete
  using (public.flowtel_current_user_is_admin_or_owner());

-- ---------------------------------------------------------------------------
-- Player request helper
-- ---------------------------------------------------------------------------

create or replace function public.caddie_magic_request_score_review()
returns public.caddie_magic_review_requests
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile public.caddie_magic_player_profiles%rowtype;
  v_request public.caddie_magic_review_requests%rowtype;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to request a Caddie Review.' using errcode = '28000';
  end if;

  select *
  into v_profile
  from public.caddie_magic_player_profiles
  where user_id = auth.uid()
  limit 1;

  if v_profile.id is null then
    raise exception 'Create your Player Profile before requesting a Caddie Review.' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.caddie_magic_round_logs l
    where l.player_profile_id = v_profile.id
  ) then
    raise exception 'Log at least one score or swing thought before requesting a review.' using errcode = '22023';
  end if;

  select *
  into v_request
  from public.caddie_magic_review_requests
  where player_profile_id = v_profile.id
    and status = 'requested'
  order by requested_at desc
  limit 1;

  if v_request.id is not null then
    return v_request;
  end if;

  begin
    insert into public.caddie_magic_review_requests (
      player_profile_id,
      user_id,
      status,
      requested_at
    ) values (
      v_profile.id,
      auth.uid(),
      'requested',
      now()
    )
    returning * into v_request;
  exception when unique_violation then
    select *
    into v_request
    from public.caddie_magic_review_requests
    where player_profile_id = v_profile.id
      and status = 'requested'
    order by requested_at desc
    limit 1;
  end;

  return v_request;
end;
$$;

revoke all on function public.caddie_magic_request_score_review() from public;
grant execute on function public.caddie_magic_request_score_review() to authenticated;

-- ---------------------------------------------------------------------------
-- Concierge Desk list helper
-- ---------------------------------------------------------------------------

create or replace function public.caddie_magic_list_score_review_requests()
returns table (
  request_id uuid,
  player_profile_id uuid,
  user_id uuid,
  player_name text,
  player_email text,
  status text,
  requested_at timestamptz,
  completed_at timestamptz,
  response_note_id uuid
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to open Caddie Review requests.' using errcode = '28000';
  end if;

  if not public.flowtel_current_user_is_admin_or_owner() then
    raise exception 'Caddie Review requests are reserved for the owner Concierge.' using errcode = '42501';
  end if;

  return query
  select
    r.id,
    r.player_profile_id,
    r.user_id,
    coalesce(
      nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''),
      p.email,
      'Caddie Magic Player'
    ) as player_name,
    p.email as player_email,
    r.status,
    r.requested_at,
    r.completed_at,
    r.response_note_id
  from public.caddie_magic_review_requests r
  join public.caddie_magic_player_profiles p on p.id = r.player_profile_id
  order by
    case when r.status = 'requested' then 0 else 1 end,
    coalesce(r.requested_at, r.created_at) desc
  limit 250;
end;
$$;

revoke all on function public.caddie_magic_list_score_review_requests() from public;
grant execute on function public.caddie_magic_list_score_review_requests() to authenticated;

-- ---------------------------------------------------------------------------
-- Complete review + send private Caddie Note atomically
-- ---------------------------------------------------------------------------

create or replace function public.caddie_magic_complete_score_review(
  p_request_id uuid,
  p_note text
)
returns public.caddie_magic_review_requests
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_request public.caddie_magic_review_requests%rowtype;
  v_note_id uuid;
  v_author_id uuid;
  v_clean_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to complete a Caddie Review.' using errcode = '28000';
  end if;

  if not public.flowtel_current_user_is_admin_or_owner() then
    raise exception 'Only the owner Concierge can complete a Caddie Review.' using errcode = '42501';
  end if;

  if p_request_id is null then
    raise exception 'Choose a Caddie Review request.' using errcode = '22023';
  end if;

  if v_clean_note is null then
    raise exception 'Leave a Caddie Note before completing the review.' using errcode = '22023';
  end if;

  select *
  into v_request
  from public.caddie_magic_review_requests
  where id = p_request_id
  for update;

  if v_request.id is null then
    raise exception 'This Caddie Review request could not be found.' using errcode = 'P0002';
  end if;

  if v_request.status = 'completed' then
    return v_request;
  end if;

  select p.id
  into v_author_id
  from public.profiles p
  where p.id = auth.uid()
  limit 1;

  insert into public.caddie_magic_player_notes (
    player_profile_id,
    author_id,
    note_title,
    note_body,
    is_visible_to_player
  ) values (
    v_request.player_profile_id,
    v_author_id,
    'Caddie Review',
    v_clean_note,
    true
  )
  returning id into v_note_id;

  update public.caddie_magic_review_requests
  set status = 'completed',
      completed_at = now(),
      completed_by = v_author_id,
      response_note_id = v_note_id,
      updated_at = now()
  where id = v_request.id
  returning * into v_request;

  return v_request;
end;
$$;

revoke all on function public.caddie_magic_complete_score_review(uuid, text) from public;
grant execute on function public.caddie_magic_complete_score_review(uuid, text) to authenticated;

grant select, insert, update, delete on public.caddie_magic_review_requests to authenticated;

notify pgrst, 'reload schema';
