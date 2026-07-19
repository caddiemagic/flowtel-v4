-- Caddie Magic v0.4.0 — Portal Polish + Upcoming Golf Schedule
--
-- Purpose:
-- 1. Protect Scorecard integrity by rejecting future-dated entries at the database layer.
-- 2. Add a simple master Locker Room sharing preference that hides both scores and thoughts.
-- 3. Expand the anonymous Locker Room feed to support thoughts + scores and Scores Only views.
-- 4. Add future tournaments, rounds, and golf trips with a per-day moon forecast.
-- 5. Give owner/admin users a secure upcoming-golf calendar feed for the Concierge Desk.

-- ---------------------------------------------------------------------------
-- Master anonymous Locker Room preference
-- ---------------------------------------------------------------------------

alter table public.caddie_magic_player_profiles
  add column if not exists share_anonymously boolean not null default true;

comment on column public.caddie_magic_player_profiles.share_anonymously is
  'Master Caddie Magic Locker Room preference. When false, both scores and swing thoughts are excluded from anonymous collective views.';

create or replace function public.caddie_magic_set_locker_room_sharing(p_enabled boolean)
returns public.caddie_magic_player_profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile public.caddie_magic_player_profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to change Locker Room sharing.' using errcode = '28000';
  end if;

  update public.caddie_magic_player_profiles
  set share_anonymously = coalesce(p_enabled, false)
  where user_id = auth.uid()
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'Create your Player Profile before changing Locker Room sharing.' using errcode = '22023';
  end if;

  update public.caddie_magic_round_logs
  set share_anonymously = v_profile.share_anonymously
  where player_profile_id = v_profile.id;

  return v_profile;
end;
$$;

revoke all on function public.caddie_magic_set_locker_room_sharing(boolean) from public;
grant execute on function public.caddie_magic_set_locker_room_sharing(boolean) to authenticated;

create or replace function public.caddie_magic_get_locker_room_entries(
  p_moon_cycle_start date default null,
  p_moon_phase text default null
)
returns table (
  entry_id uuid,
  moon_day integer,
  moon_phase text,
  moon_cycle_start_date date,
  swing_thought text,
  score integer,
  entry_type text,
  logged_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to open the Locker Room.' using errcode = '28000';
  end if;

  return query
  select
    l.id as entry_id,
    l.moon_day,
    l.moon_phase,
    l.moon_last_new_moon_date as moon_cycle_start_date,
    nullif(btrim(l.swing_thoughts), '') as swing_thought,
    l.score,
    l.entry_type,
    coalesce(l.created_at, l.updated_at) as logged_at
  from public.caddie_magic_round_logs l
  join public.caddie_magic_player_profiles p
    on p.id = l.player_profile_id
  where p.share_anonymously = true
    and l.share_anonymously = true
    and (l.score is not null or nullif(btrim(l.swing_thoughts), '') is not null)
    and (p_moon_cycle_start is null or l.moon_last_new_moon_date = p_moon_cycle_start)
    and (p_moon_phase is null or l.moon_phase = p_moon_phase)
  order by coalesce(l.created_at, l.updated_at) desc
  limit 1500;
end;
$$;

revoke all on function public.caddie_magic_get_locker_room_entries(date, text) from public;
grant execute on function public.caddie_magic_get_locker_room_entries(date, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Reject future Scorecard dates at the database layer
-- ---------------------------------------------------------------------------

create or replace function public.caddie_magic_reject_future_round_date()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.round_date > (timezone('America/Los_Angeles', now()))::date then
    raise exception 'You can''t log a round from the future. Choose today or a past date.' using errcode = '22007';
  end if;
  return new;
end;
$$;

drop trigger if exists caddie_magic_round_logs_reject_future_date on public.caddie_magic_round_logs;
create trigger caddie_magic_round_logs_reject_future_date
  before insert or update of round_date on public.caddie_magic_round_logs
  for each row execute function public.caddie_magic_reject_future_round_date();

-- ---------------------------------------------------------------------------
-- Upcoming golf schedule
-- ---------------------------------------------------------------------------

create table if not exists public.caddie_magic_upcoming_golf_events (
  id uuid primary key default gen_random_uuid(),
  player_profile_id uuid not null references public.caddie_magic_player_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('round', 'tournament', 'golf_trip')),
  title text not null,
  date_start date not null,
  date_end date not null,
  location text,
  course text,
  notes text,
  moon_forecast jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (date_end >= date_start),
  check ((date_end - date_start) <= 31)
);

comment on table public.caddie_magic_upcoming_golf_events is
  'Future rounds, tournaments, and golf trips recorded from the Caddie Compass. moon_forecast contains one moon-day/phase record for every calendar day of the event.';

create index if not exists caddie_magic_upcoming_golf_events_player_date_idx
  on public.caddie_magic_upcoming_golf_events (player_profile_id, date_start, date_end);

create index if not exists caddie_magic_upcoming_golf_events_admin_calendar_idx
  on public.caddie_magic_upcoming_golf_events (date_start, date_end, created_at desc);

drop trigger if exists caddie_magic_upcoming_golf_events_set_updated_at on public.caddie_magic_upcoming_golf_events;
create trigger caddie_magic_upcoming_golf_events_set_updated_at
  before update on public.caddie_magic_upcoming_golf_events
  for each row execute function public.caddie_magic_set_updated_at();

alter table public.caddie_magic_upcoming_golf_events enable row level security;

drop policy if exists "Players can read their upcoming golf events" on public.caddie_magic_upcoming_golf_events;
create policy "Players can read their upcoming golf events"
  on public.caddie_magic_upcoming_golf_events
  for select
  using (user_id = auth.uid() or public.flowtel_current_user_is_admin_or_owner());

drop policy if exists "Players can create their upcoming golf events" on public.caddie_magic_upcoming_golf_events;
create policy "Players can create their upcoming golf events"
  on public.caddie_magic_upcoming_golf_events
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.caddie_magic_player_profiles p
      where p.id = player_profile_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "Players can update their upcoming golf events" on public.caddie_magic_upcoming_golf_events;
create policy "Players can update their upcoming golf events"
  on public.caddie_magic_upcoming_golf_events
  for update
  using (user_id = auth.uid() or public.flowtel_current_user_is_admin_or_owner())
  with check (user_id = auth.uid() or public.flowtel_current_user_is_admin_or_owner());

drop policy if exists "Players can delete their upcoming golf events" on public.caddie_magic_upcoming_golf_events;
create policy "Players can delete their upcoming golf events"
  on public.caddie_magic_upcoming_golf_events
  for delete
  using (user_id = auth.uid() or public.flowtel_current_user_is_admin_or_owner());

create or replace function public.caddie_magic_save_upcoming_golf_event(
  p_event_type text,
  p_title text,
  p_date_start date,
  p_date_end date default null,
  p_location text default null,
  p_course text default null,
  p_notes text default null,
  p_moon_forecast jsonb default '[]'::jsonb
)
returns public.caddie_magic_upcoming_golf_events
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile public.caddie_magic_player_profiles%rowtype;
  v_event public.caddie_magic_upcoming_golf_events%rowtype;
  v_type text := lower(btrim(coalesce(p_event_type, '')));
  v_title text := nullif(btrim(coalesce(p_title, '')), '');
  v_start date := p_date_start;
  v_end date := coalesce(p_date_end, p_date_start);
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to add upcoming golf.' using errcode = '28000';
  end if;

  select * into v_profile
  from public.caddie_magic_player_profiles
  where user_id = auth.uid()
  limit 1;

  if v_profile.id is null then
    raise exception 'Create your Player Profile before adding upcoming golf.' using errcode = '22023';
  end if;

  if v_type not in ('round', 'tournament', 'golf_trip') then
    raise exception 'Choose Round, Tournament, or Golf Trip.' using errcode = '22023';
  end if;

  if v_title is null then
    raise exception 'Name the upcoming golf event.' using errcode = '22023';
  end if;

  if v_start is null or v_start < (timezone('America/Los_Angeles', now()))::date then
    raise exception 'Upcoming golf must begin today or in the future.' using errcode = '22007';
  end if;

  if v_end < v_start then
    raise exception 'The end date cannot be before the start date.' using errcode = '22007';
  end if;

  if (v_end - v_start) > 31 then
    raise exception 'An upcoming golf event may span no more than 32 calendar days.' using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(p_moon_forecast, '[]'::jsonb)) <> 'array' then
    raise exception 'Moon forecast must be a daily array.' using errcode = '22023';
  end if;

  insert into public.caddie_magic_upcoming_golf_events (
    player_profile_id,
    user_id,
    event_type,
    title,
    date_start,
    date_end,
    location,
    course,
    notes,
    moon_forecast
  ) values (
    v_profile.id,
    auth.uid(),
    v_type,
    v_title,
    v_start,
    v_end,
    nullif(btrim(coalesce(p_location, '')), ''),
    nullif(btrim(coalesce(p_course, '')), ''),
    nullif(btrim(coalesce(p_notes, '')), ''),
    coalesce(p_moon_forecast, '[]'::jsonb)
  )
  returning * into v_event;

  return v_event;
end;
$$;

revoke all on function public.caddie_magic_save_upcoming_golf_event(text, text, date, date, text, text, text, jsonb) from public;
grant execute on function public.caddie_magic_save_upcoming_golf_event(text, text, date, date, text, text, text, jsonb) to authenticated;

create or replace function public.caddie_magic_delete_upcoming_golf_event(p_event_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_deleted integer := 0;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to remove upcoming golf.' using errcode = '28000';
  end if;

  delete from public.caddie_magic_upcoming_golf_events e
  where e.id = p_event_id
    and (
      e.user_id = auth.uid()
      or public.flowtel_current_user_is_admin_or_owner()
    );

  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

revoke all on function public.caddie_magic_delete_upcoming_golf_event(uuid) from public;
grant execute on function public.caddie_magic_delete_upcoming_golf_event(uuid) to authenticated;

create or replace function public.caddie_magic_list_upcoming_golf_events(
  p_start date default current_date,
  p_end date default (current_date + 120)
)
returns table (
  event_id uuid,
  player_profile_id uuid,
  player_name text,
  player_email text,
  event_type text,
  event_title text,
  date_start date,
  date_end date,
  location text,
  course text,
  notes text,
  moon_forecast jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.flowtel_current_user_is_admin_or_owner() then
    raise exception 'Owner or admin access is required.' using errcode = '42501';
  end if;

  return query
  select
    e.id,
    e.player_profile_id,
    coalesce(nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''), p.email) as player_name,
    p.email,
    e.event_type,
    e.title,
    e.date_start,
    e.date_end,
    e.location,
    e.course,
    e.notes,
    e.moon_forecast
  from public.caddie_magic_upcoming_golf_events e
  join public.caddie_magic_player_profiles p on p.id = e.player_profile_id
  where e.date_end >= coalesce(p_start, current_date)
    and e.date_start <= coalesce(p_end, current_date + 120)
  order by e.date_start asc, p.first_name asc nulls last, p.email asc;
end;
$$;

revoke all on function public.caddie_magic_list_upcoming_golf_events(date, date) from public;
grant execute on function public.caddie_magic_list_upcoming_golf_events(date, date) to authenticated;

grant select, insert, update, delete on public.caddie_magic_upcoming_golf_events to authenticated;

notify pgrst, 'reload schema';
