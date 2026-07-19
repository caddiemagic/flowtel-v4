-- Caddie Magic v0.3.0 — Caddie Compass + Moon Assignments
--
-- Purpose:
-- 1. Record each player's NEWS compass and central Putter / Staff.
-- 2. Seal the active compass after the first assignment is created.
-- 3. Let the owner/admin create personalized moon assignments.
-- 4. Let players record completion reflections and assignment progress.
-- 5. Add private Caddie Dispatches between the player and the owner/admin.
-- 6. Route compass players and unanswered dispatches into the Concierge Desk.

create table if not exists public.caddie_magic_compasses (
  id uuid primary key default gen_random_uuid(),
  player_profile_id uuid not null references public.caddie_magic_player_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  version integer not null default 1 check (version > 0),
  is_active boolean not null default true,
  status text not null default 'draft' check (status in ('draft', 'sealed', 'retired')),
  north_club text not null,
  east_club text not null,
  west_club text not null,
  south_club text not null,
  staff_club text not null default 'Putter',
  sealed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.caddie_magic_compasses is
  'Versioned Caddie Compass profiles. NEWS maps the first four selected clubs to North, East, West, and South. Putter is the central Staff.';

create unique index if not exists caddie_magic_compasses_one_active_idx
  on public.caddie_magic_compasses (player_profile_id)
  where is_active = true;

create index if not exists caddie_magic_compasses_user_idx
  on public.caddie_magic_compasses (user_id, is_active, version desc);

create table if not exists public.caddie_magic_compass_assignments (
  id uuid primary key default gen_random_uuid(),
  player_profile_id uuid not null references public.caddie_magic_player_profiles(id) on delete cascade,
  compass_id uuid not null references public.caddie_magic_compasses(id) on delete restrict,
  title text not null,
  instructions text not null,
  moon_phase text,
  direction text not null default 'general' check (direction in ('north', 'east', 'west', 'south', 'center', 'general')),
  assigned_club text,
  due_date date,
  status text not null default 'assigned' check (status in ('assigned', 'in_progress', 'completed')),
  player_response text,
  player_response_at timestamptz,
  assigned_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.caddie_magic_compass_assignments is
  'Personalized Caddie Compass initiations assigned by the owner/admin. assigned_club is snapshotted so old assignments remain historically accurate.';

create index if not exists caddie_magic_compass_assignments_player_idx
  on public.caddie_magic_compass_assignments (player_profile_id, status, created_at desc);

create index if not exists caddie_magic_compass_assignments_compass_idx
  on public.caddie_magic_compass_assignments (compass_id, created_at desc);

create table if not exists public.caddie_magic_compass_dispatches (
  id uuid primary key default gen_random_uuid(),
  player_profile_id uuid not null references public.caddie_magic_player_profiles(id) on delete cascade,
  assignment_id uuid references public.caddie_magic_compass_assignments(id) on delete set null,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('player', 'caddie')),
  message_body text not null,
  created_at timestamptz not null default now()
);

comment on table public.caddie_magic_compass_dispatches is
  'Private two-way Caddie Dispatches between a player and the owner/admin, optionally connected to an assignment.';

create index if not exists caddie_magic_compass_dispatches_player_idx
  on public.caddie_magic_compass_dispatches (player_profile_id, created_at asc);

create index if not exists caddie_magic_compass_dispatches_assignment_idx
  on public.caddie_magic_compass_dispatches (assignment_id, created_at asc)
  where assignment_id is not null;

-- Updated-at triggers

drop trigger if exists caddie_magic_compasses_set_updated_at on public.caddie_magic_compasses;
create trigger caddie_magic_compasses_set_updated_at
  before update on public.caddie_magic_compasses
  for each row execute function public.caddie_magic_set_updated_at();

drop trigger if exists caddie_magic_compass_assignments_set_updated_at on public.caddie_magic_compass_assignments;
create trigger caddie_magic_compass_assignments_set_updated_at
  before update on public.caddie_magic_compass_assignments
  for each row execute function public.caddie_magic_set_updated_at();

-- Seal the compass after the first assignment is created.

create or replace function public.caddie_magic_seal_compass_on_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.caddie_magic_compasses
  set
    status = 'sealed',
    sealed_at = coalesce(sealed_at, now())
  where id = new.compass_id
    and is_active = true;
  return new;
end;
$$;

drop trigger if exists caddie_magic_assignments_seal_compass on public.caddie_magic_compass_assignments;
create trigger caddie_magic_assignments_seal_compass
  after insert on public.caddie_magic_compass_assignments
  for each row execute function public.caddie_magic_seal_compass_on_assignment();

-- RLS

alter table public.caddie_magic_compasses enable row level security;
alter table public.caddie_magic_compass_assignments enable row level security;
alter table public.caddie_magic_compass_dispatches enable row level security;

drop policy if exists "Players can read their Caddie Compass" on public.caddie_magic_compasses;
create policy "Players can read their Caddie Compass"
  on public.caddie_magic_compasses
  for select
  using (
    user_id = auth.uid()
    or public.flowtel_current_user_is_admin_or_owner()
  );

drop policy if exists "Players can read their Caddie Compass assignments" on public.caddie_magic_compass_assignments;
create policy "Players can read their Caddie Compass assignments"
  on public.caddie_magic_compass_assignments
  for select
  using (
    public.flowtel_current_user_is_admin_or_owner()
    or exists (
      select 1
      from public.caddie_magic_player_profiles p
      where p.id = player_profile_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "Admins manage Caddie Compass assignments" on public.caddie_magic_compass_assignments;
create policy "Admins manage Caddie Compass assignments"
  on public.caddie_magic_compass_assignments
  for all
  using (public.flowtel_current_user_is_admin_or_owner())
  with check (public.flowtel_current_user_is_admin_or_owner());

drop policy if exists "Players can read their Caddie Dispatches" on public.caddie_magic_compass_dispatches;
create policy "Players can read their Caddie Dispatches"
  on public.caddie_magic_compass_dispatches
  for select
  using (
    public.flowtel_current_user_is_admin_or_owner()
    or exists (
      select 1
      from public.caddie_magic_player_profiles p
      where p.id = player_profile_id
        and p.user_id = auth.uid()
    )
  );

-- Save or update the player's active, unsealed compass.

create or replace function public.caddie_magic_save_my_compass(
  p_north_club text,
  p_east_club text,
  p_west_club text,
  p_south_club text
)
returns public.caddie_magic_compasses
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile public.caddie_magic_player_profiles%rowtype;
  v_compass public.caddie_magic_compasses%rowtype;
  v_north text := nullif(btrim(coalesce(p_north_club, '')), '');
  v_east text := nullif(btrim(coalesce(p_east_club, '')), '');
  v_west text := nullif(btrim(coalesce(p_west_club, '')), '');
  v_south text := nullif(btrim(coalesce(p_south_club, '')), '');
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to save a Caddie Compass.' using errcode = '28000';
  end if;

  select * into v_profile
  from public.caddie_magic_player_profiles
  where user_id = auth.uid()
  limit 1;

  if v_profile.id is null then
    raise exception 'Create your Player Profile before setting your Caddie Compass.' using errcode = '22023';
  end if;

  if v_north is null or v_east is null or v_west is null or v_south is null then
    raise exception 'Name all four clubs before saving your compass.' using errcode = '22023';
  end if;

  if (
    select count(distinct lower(club_name))
    from unnest(array[v_north, v_east, v_west, v_south]) as clubs(club_name)
  ) <> 4 then
    raise exception 'Choose four different clubs for the four directions.' using errcode = '22023';
  end if;

  select * into v_compass
  from public.caddie_magic_compasses
  where player_profile_id = v_profile.id
    and is_active = true
  order by version desc
  limit 1;

  if v_compass.id is not null and v_compass.sealed_at is not null then
    raise exception 'Your active Caddie Compass is sealed because an initiation has begun. Message your Caddie to request a new compass version.' using errcode = '22023';
  end if;

  if v_compass.id is null then
    insert into public.caddie_magic_compasses (
      player_profile_id,
      user_id,
      version,
      is_active,
      status,
      north_club,
      east_club,
      west_club,
      south_club,
      staff_club
    ) values (
      v_profile.id,
      auth.uid(),
      1,
      true,
      'draft',
      v_north,
      v_east,
      v_west,
      v_south,
      'Putter'
    )
    returning * into v_compass;
  else
    update public.caddie_magic_compasses
    set
      north_club = v_north,
      east_club = v_east,
      west_club = v_west,
      south_club = v_south,
      staff_club = 'Putter',
      status = 'draft'
    where id = v_compass.id
    returning * into v_compass;
  end if;

  return v_compass;
end;
$$;

-- Player updates assignment progress and completion reflection.

create or replace function public.caddie_magic_update_my_assignment(
  p_assignment_id uuid,
  p_status text,
  p_response text default null
)
returns public.caddie_magic_compass_assignments
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_assignment public.caddie_magic_compass_assignments%rowtype;
  v_status text := lower(btrim(coalesce(p_status, '')));
  v_response text := nullif(btrim(coalesce(p_response, '')), '');
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to update an assignment.' using errcode = '28000';
  end if;

  if v_status not in ('in_progress', 'completed') then
    raise exception 'Choose In Progress or Completed.' using errcode = '22023';
  end if;

  select a.* into v_assignment
  from public.caddie_magic_compass_assignments a
  join public.caddie_magic_player_profiles p on p.id = a.player_profile_id
  where a.id = p_assignment_id
    and p.user_id = auth.uid()
  limit 1;

  if v_assignment.id is null then
    raise exception 'This assignment could not be opened.' using errcode = '42501';
  end if;

  update public.caddie_magic_compass_assignments
  set
    status = v_status,
    player_response = coalesce(v_response, player_response),
    player_response_at = case when v_response is not null then now() else player_response_at end,
    completed_at = case when v_status = 'completed' then now() else null end
  where id = v_assignment.id
  returning * into v_assignment;

  return v_assignment;
end;
$$;

-- Admin creates a personalized assignment and snapshots the directional club.

create or replace function public.caddie_magic_create_compass_assignment(
  p_player_profile_id uuid,
  p_title text,
  p_instructions text,
  p_moon_phase text default null,
  p_direction text default 'general',
  p_due_date date default null
)
returns public.caddie_magic_compass_assignments
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_compass public.caddie_magic_compasses%rowtype;
  v_assignment public.caddie_magic_compass_assignments%rowtype;
  v_title text := nullif(btrim(coalesce(p_title, '')), '');
  v_instructions text := nullif(btrim(coalesce(p_instructions, '')), '');
  v_direction text := lower(btrim(coalesce(p_direction, 'general')));
  v_club text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to create a Caddie Compass assignment.' using errcode = '28000';
  end if;

  if not public.flowtel_current_user_is_admin_or_owner() then
    raise exception 'Only the owner Concierge can create Caddie Compass assignments.' using errcode = '42501';
  end if;

  if v_title is null or v_instructions is null then
    raise exception 'Add an assignment title and instructions.' using errcode = '22023';
  end if;

  if v_direction not in ('north', 'east', 'west', 'south', 'center', 'general') then
    raise exception 'Choose a valid compass direction.' using errcode = '22023';
  end if;

  select * into v_compass
  from public.caddie_magic_compasses
  where player_profile_id = p_player_profile_id
    and is_active = true
  order by version desc
  limit 1;

  if v_compass.id is null then
    raise exception 'This player has not saved a Caddie Compass yet.' using errcode = '22023';
  end if;

  v_club := case v_direction
    when 'north' then v_compass.north_club
    when 'east' then v_compass.east_club
    when 'west' then v_compass.west_club
    when 'south' then v_compass.south_club
    when 'center' then v_compass.staff_club
    else null
  end;

  insert into public.caddie_magic_compass_assignments (
    player_profile_id,
    compass_id,
    title,
    instructions,
    moon_phase,
    direction,
    assigned_club,
    due_date,
    status,
    assigned_by
  ) values (
    p_player_profile_id,
    v_compass.id,
    v_title,
    v_instructions,
    nullif(btrim(coalesce(p_moon_phase, '')), ''),
    v_direction,
    v_club,
    p_due_date,
    'assigned',
    auth.uid()
  )
  returning * into v_assignment;

  return v_assignment;
end;
$$;

-- Private two-way dispatch helper.

create or replace function public.caddie_magic_send_compass_dispatch(
  p_player_profile_id uuid,
  p_assignment_id uuid,
  p_message text
)
returns public.caddie_magic_compass_dispatches
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_dispatch public.caddie_magic_compass_dispatches%rowtype;
  v_message text := nullif(btrim(coalesce(p_message, '')), '');
  v_sender_role text;
  v_is_owner boolean := public.flowtel_current_user_is_admin_or_owner();
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to send a Caddie Dispatch.' using errcode = '28000';
  end if;

  if v_message is null then
    raise exception 'Write a message before sending the dispatch.' using errcode = '22023';
  end if;

  if v_is_owner then
    v_sender_role := 'caddie';
  elsif exists (
    select 1
    from public.caddie_magic_player_profiles p
    where p.id = p_player_profile_id
      and p.user_id = auth.uid()
  ) then
    v_sender_role := 'player';
  else
    raise exception 'This Caddie Dispatch thread is private.' using errcode = '42501';
  end if;

  if p_assignment_id is not null and not exists (
    select 1
    from public.caddie_magic_compass_assignments a
    where a.id = p_assignment_id
      and a.player_profile_id = p_player_profile_id
  ) then
    raise exception 'That assignment does not belong to this compass.' using errcode = '22023';
  end if;

  insert into public.caddie_magic_compass_dispatches (
    player_profile_id,
    assignment_id,
    sender_user_id,
    sender_role,
    message_body
  ) values (
    p_player_profile_id,
    p_assignment_id,
    auth.uid(),
    v_sender_role,
    v_message
  )
  returning * into v_dispatch;

  return v_dispatch;
end;
$$;

-- Concierge Desk summary.

create or replace function public.caddie_magic_list_compass_players()
returns table (
  player_profile_id uuid,
  player_name text,
  player_email text,
  compass_id uuid,
  compass_status text,
  compass_version integer,
  north_club text,
  east_club text,
  west_club text,
  south_club text,
  staff_club text,
  active_assignment_count bigint,
  completed_assignment_count bigint,
  needs_reply boolean,
  latest_dispatch_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to open Caddie Compass players.' using errcode = '28000';
  end if;

  if not public.flowtel_current_user_is_admin_or_owner() then
    raise exception 'Caddie Compass administration is reserved for the owner Concierge.' using errcode = '42501';
  end if;

  return query
  select
    p.id as player_profile_id,
    coalesce(nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''), p.email, 'Caddie Magic Player') as player_name,
    p.email as player_email,
    c.id as compass_id,
    c.status as compass_status,
    c.version as compass_version,
    c.north_club,
    c.east_club,
    c.west_club,
    c.south_club,
    c.staff_club,
    (select count(*) from public.caddie_magic_compass_assignments a where a.player_profile_id = p.id and a.status in ('assigned', 'in_progress')) as active_assignment_count,
    (select count(*) from public.caddie_magic_compass_assignments a where a.player_profile_id = p.id and a.status = 'completed') as completed_assignment_count,
    coalesce((
      select d.sender_role = 'player'
      from public.caddie_magic_compass_dispatches d
      where d.player_profile_id = p.id
      order by d.created_at desc
      limit 1
    ), false) as needs_reply,
    (select max(d.created_at) from public.caddie_magic_compass_dispatches d where d.player_profile_id = p.id) as latest_dispatch_at
  from public.caddie_magic_player_profiles p
  join public.caddie_magic_compasses c
    on c.player_profile_id = p.id
   and c.is_active = true
  order by
    coalesce((
      select d.sender_role = 'player'
      from public.caddie_magic_compass_dispatches d
      where d.player_profile_id = p.id
      order by d.created_at desc
      limit 1
    ), false) desc,
    coalesce((select max(d.created_at) from public.caddie_magic_compass_dispatches d where d.player_profile_id = p.id), c.updated_at) desc;
end;
$$;

revoke all on function public.caddie_magic_save_my_compass(text, text, text, text) from public;
revoke all on function public.caddie_magic_update_my_assignment(uuid, text, text) from public;
revoke all on function public.caddie_magic_create_compass_assignment(uuid, text, text, text, text, date) from public;
revoke all on function public.caddie_magic_send_compass_dispatch(uuid, uuid, text) from public;
revoke all on function public.caddie_magic_list_compass_players() from public;

grant execute on function public.caddie_magic_save_my_compass(text, text, text, text) to authenticated;
grant execute on function public.caddie_magic_update_my_assignment(uuid, text, text) to authenticated;
grant execute on function public.caddie_magic_create_compass_assignment(uuid, text, text, text, text, date) to authenticated;
grant execute on function public.caddie_magic_send_compass_dispatch(uuid, uuid, text) to authenticated;
grant execute on function public.caddie_magic_list_compass_players() to authenticated;

grant select on public.caddie_magic_compasses to authenticated;
grant select, insert, update, delete on public.caddie_magic_compass_assignments to authenticated;
grant select on public.caddie_magic_compass_dispatches to authenticated;

notify pgrst, 'reload schema';
