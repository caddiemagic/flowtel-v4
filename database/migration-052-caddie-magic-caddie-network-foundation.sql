-- Caddie Magic v0.5.0 — Caddie Network Foundation
--
-- Purpose:
-- 1. Keep every Caddie a player first while granting a separate, owner-approved service capability.
-- 2. Let players request an active Caddie and reveal consultation availability only after acceptance.
-- 3. Let Caddies manage profile, requests, exact availability slots, and consultations without assignments/messages/notes.
-- 4. Provide read-only, consent-scoped player preparation data for accepted consultations.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.caddie_magic_require_product_access()
returns void
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.flowtel_current_user_has_product_access('caddie_magic') then
    raise exception 'Caddie Magic access is required.' using errcode = '42501';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Compass becomes a player-owned four-room map rather than an assignment channel.
-- Existing assignment/message history is preserved in legacy tables, but it no
-- longer seals the active compass and no Caddie Network role receives write access.
-- ---------------------------------------------------------------------------

drop trigger if exists caddie_magic_assignments_seal_compass on public.caddie_magic_compass_assignments;

update public.caddie_magic_compasses
set status = 'draft', sealed_at = null
where is_active = true and (status = 'sealed' or sealed_at is not null);

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
  perform public.caddie_magic_require_product_access();
  if auth.uid() is null then
    raise exception 'You must be signed in to save a Caddie Compass.' using errcode = '28000';
  end if;
  select * into v_profile from public.caddie_magic_player_profiles
  where user_id = auth.uid() limit 1;
  if v_profile.id is null then
    raise exception 'Create your Player Profile before setting your Caddie Compass.' using errcode = '22023';
  end if;
  if v_north is null or v_east is null or v_west is null or v_south is null then
    raise exception 'Name all four clubs before saving your compass.' using errcode = '22023';
  end if;
  if (
    select count(distinct lower(club_name))
    from unnest(array[v_north,v_east,v_west,v_south]) as clubs(club_name)
  ) <> 4 then
    raise exception 'Choose four different clubs for the four directions.' using errcode = '22023';
  end if;

  select * into v_compass from public.caddie_magic_compasses
  where player_profile_id = v_profile.id and is_active = true
  order by version desc limit 1;

  if v_compass.id is null then
    insert into public.caddie_magic_compasses (
      player_profile_id,user_id,version,is_active,status,north_club,east_club,west_club,south_club,staff_club,sealed_at
    ) values (
      v_profile.id,auth.uid(),1,true,'draft',v_north,v_east,v_west,v_south,'Putter',null
    ) returning * into v_compass;
  else
    update public.caddie_magic_compasses
    set north_club=v_north,east_club=v_east,west_club=v_west,south_club=v_south,
        staff_club='Putter',status='draft',sealed_at=null
    where id=v_compass.id returning * into v_compass;
  end if;
  return v_compass;
end;
$$;

-- ---------------------------------------------------------------------------
-- Caddie identity: an additional capability attached to an existing player.
-- ---------------------------------------------------------------------------

create table if not exists public.caddie_magic_caddie_profiles (
  id uuid primary key default gen_random_uuid(),
  player_profile_id uuid not null unique references public.caddie_magic_player_profiles(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  status text not null default 'invited'
    check (status in ('invited','draft','submitted','approved','active','paused','declined')),
  display_name text,
  professional_title text,
  profile_photo_url text,
  years_experience integer check (years_experience is null or years_experience between 0 and 80),
  courses_served text,
  pebble_beach_experience text,
  city text,
  timezone text not null default 'America/Los_Angeles',
  philosophy text,
  consultation_method text,
  consultation_duration_minutes integer not null default 30
    check (consultation_duration_minutes between 15 and 180),
  meeting_link text,
  accepting_requests boolean not null default false,
  invited_by uuid references auth.users(id) on delete set null,
  invited_at timestamptz not null default now(),
  submitted_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.caddie_magic_caddie_profiles is
  'Owner-approved Caddie capability attached to an existing Caddie Magic player. Player identity and player history remain intact.';

create index if not exists caddie_magic_caddie_profiles_directory_idx
  on public.caddie_magic_caddie_profiles (status, accepting_requests, display_name)
  where status = 'active';

-- ---------------------------------------------------------------------------
-- Player requests and consent.
-- ---------------------------------------------------------------------------

create table if not exists public.caddie_magic_caddie_requests (
  id uuid primary key default gen_random_uuid(),
  player_profile_id uuid not null references public.caddie_magic_player_profiles(id) on delete cascade,
  caddie_profile_id uuid not null references public.caddie_magic_caddie_profiles(id) on delete cascade,
  status text not null default 'requested'
    check (status in ('requested','accepted','declined','cancelled','ended')),
  anticipated_trip_date date,
  course_itinerary text,
  consultation_goal text,
  played_pebble_before boolean,
  share_scorecard boolean not null default true,
  share_score_map boolean not null default true,
  share_compass boolean not null default true,
  share_upcoming_golf boolean not null default true,
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.caddie_magic_caddie_requests is
  'Player-requested Caddie relationships. Availability is not exposed until the Caddie accepts.';

create unique index if not exists caddie_magic_one_open_caddie_request_per_player_idx
  on public.caddie_magic_caddie_requests (player_profile_id)
  where status in ('requested','accepted');

create index if not exists caddie_magic_caddie_requests_caddie_idx
  on public.caddie_magic_caddie_requests (caddie_profile_id, status, requested_at desc);

-- ---------------------------------------------------------------------------
-- Exact consultation availability and bookings.
-- ---------------------------------------------------------------------------

create table if not exists public.caddie_magic_caddie_availability_slots (
  id uuid primary key default gen_random_uuid(),
  caddie_profile_id uuid not null references public.caddie_magic_caddie_profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'available'
    check (status in ('available','booked','blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create unique index if not exists caddie_magic_caddie_availability_unique_idx
  on public.caddie_magic_caddie_availability_slots (caddie_profile_id, starts_at, ends_at);

create index if not exists caddie_magic_caddie_availability_open_idx
  on public.caddie_magic_caddie_availability_slots (caddie_profile_id, starts_at)
  where status = 'available';

create table if not exists public.caddie_magic_consultations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.caddie_magic_caddie_requests(id) on delete cascade,
  availability_slot_id uuid unique references public.caddie_magic_caddie_availability_slots(id) on delete set null,
  player_profile_id uuid not null references public.caddie_magic_player_profiles(id) on delete cascade,
  caddie_profile_id uuid not null references public.caddie_magic_caddie_profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  consultation_method text,
  meeting_link text,
  status text not null default 'scheduled'
    check (status in ('scheduled','completed','cancelled')),
  cancelled_by uuid references auth.users(id) on delete set null,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists caddie_magic_consultations_player_idx
  on public.caddie_magic_consultations (player_profile_id, starts_at desc);
create index if not exists caddie_magic_consultations_caddie_idx
  on public.caddie_magic_consultations (caddie_profile_id, starts_at desc);

create unique index if not exists caddie_magic_one_scheduled_consultation_per_request_idx
  on public.caddie_magic_consultations (request_id)
  where status = 'scheduled';

-- ---------------------------------------------------------------------------
-- Updated-at triggers.
-- ---------------------------------------------------------------------------

drop trigger if exists caddie_magic_caddie_profiles_set_updated_at on public.caddie_magic_caddie_profiles;
create trigger caddie_magic_caddie_profiles_set_updated_at
  before update on public.caddie_magic_caddie_profiles
  for each row execute function public.caddie_magic_set_updated_at();

drop trigger if exists caddie_magic_caddie_requests_set_updated_at on public.caddie_magic_caddie_requests;
create trigger caddie_magic_caddie_requests_set_updated_at
  before update on public.caddie_magic_caddie_requests
  for each row execute function public.caddie_magic_set_updated_at();

drop trigger if exists caddie_magic_caddie_availability_set_updated_at on public.caddie_magic_caddie_availability_slots;
create trigger caddie_magic_caddie_availability_set_updated_at
  before update on public.caddie_magic_caddie_availability_slots
  for each row execute function public.caddie_magic_set_updated_at();

drop trigger if exists caddie_magic_consultations_set_updated_at on public.caddie_magic_consultations;
create trigger caddie_magic_consultations_set_updated_at
  before update on public.caddie_magic_consultations
  for each row execute function public.caddie_magic_set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: directory and operational writes are RPC-mediated.
-- ---------------------------------------------------------------------------

alter table public.caddie_magic_caddie_profiles enable row level security;
alter table public.caddie_magic_caddie_requests enable row level security;
alter table public.caddie_magic_caddie_availability_slots enable row level security;
alter table public.caddie_magic_consultations enable row level security;

drop policy if exists "Caddie Magic product boundary" on public.caddie_magic_caddie_profiles;
create policy "Caddie Magic product boundary"
  on public.caddie_magic_caddie_profiles as restrictive for all to authenticated
  using (public.flowtel_current_user_has_product_access('caddie_magic'))
  with check (public.flowtel_current_user_has_product_access('caddie_magic'));

drop policy if exists "Caddie Magic product boundary" on public.caddie_magic_caddie_requests;
create policy "Caddie Magic product boundary"
  on public.caddie_magic_caddie_requests as restrictive for all to authenticated
  using (public.flowtel_current_user_has_product_access('caddie_magic'))
  with check (public.flowtel_current_user_has_product_access('caddie_magic'));

drop policy if exists "Caddie Magic product boundary" on public.caddie_magic_caddie_availability_slots;
create policy "Caddie Magic product boundary"
  on public.caddie_magic_caddie_availability_slots as restrictive for all to authenticated
  using (public.flowtel_current_user_has_product_access('caddie_magic'))
  with check (public.flowtel_current_user_has_product_access('caddie_magic'));

drop policy if exists "Caddie Magic product boundary" on public.caddie_magic_consultations;
create policy "Caddie Magic product boundary"
  on public.caddie_magic_consultations as restrictive for all to authenticated
  using (public.flowtel_current_user_has_product_access('caddie_magic'))
  with check (public.flowtel_current_user_has_product_access('caddie_magic'));

drop policy if exists "Caddies read their profile" on public.caddie_magic_caddie_profiles;
create policy "Caddies read their profile"
  on public.caddie_magic_caddie_profiles for select
  using (user_id = auth.uid() or public.flowtel_current_user_is_admin_or_owner());

drop policy if exists "Players and Caddies read their requests" on public.caddie_magic_caddie_requests;
create policy "Players and Caddies read their requests"
  on public.caddie_magic_caddie_requests for select
  using (
    public.flowtel_current_user_is_admin_or_owner()
    or exists (
      select 1 from public.caddie_magic_player_profiles p
      where p.id = player_profile_id and p.user_id = auth.uid()
    )
    or exists (
      select 1 from public.caddie_magic_caddie_profiles c
      where c.id = caddie_profile_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "Caddies read their availability" on public.caddie_magic_caddie_availability_slots;
create policy "Caddies read their availability"
  on public.caddie_magic_caddie_availability_slots for select
  using (
    public.flowtel_current_user_is_admin_or_owner()
    or exists (
      select 1 from public.caddie_magic_caddie_profiles c
      where c.id = caddie_profile_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "Players and Caddies read consultations" on public.caddie_magic_consultations;
create policy "Players and Caddies read consultations"
  on public.caddie_magic_consultations for select
  using (
    public.flowtel_current_user_is_admin_or_owner()
    or exists (
      select 1 from public.caddie_magic_player_profiles p
      where p.id = player_profile_id and p.user_id = auth.uid()
    )
    or exists (
      select 1 from public.caddie_magic_caddie_profiles c
      where c.id = caddie_profile_id and c.user_id = auth.uid()
    )
  );

grant select on public.caddie_magic_caddie_profiles to authenticated;
grant select on public.caddie_magic_caddie_requests to authenticated;
grant select on public.caddie_magic_caddie_availability_slots to authenticated;
grant select on public.caddie_magic_consultations to authenticated;

-- ---------------------------------------------------------------------------
-- Owner invitation and approval.
-- ---------------------------------------------------------------------------

create or replace function public.caddie_magic_invite_player_to_caddie_network(p_player_profile_id uuid)
returns public.caddie_magic_caddie_profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_player public.caddie_magic_player_profiles%rowtype;
  v_caddie public.caddie_magic_caddie_profiles%rowtype;
begin
  perform public.caddie_magic_require_product_access();
  if not public.flowtel_current_user_is_admin_or_owner() then
    raise exception 'Owner access is required to invite a Caddie.' using errcode = '42501';
  end if;

  select * into v_player from public.caddie_magic_player_profiles where id = p_player_profile_id;
  if v_player.id is null then
    raise exception 'Choose an existing Caddie Magic player.' using errcode = '22023';
  end if;

  insert into public.caddie_magic_caddie_profiles (
    player_profile_id, user_id, status, display_name, invited_by, invited_at
  ) values (
    v_player.id,
    v_player.user_id,
    'invited',
    nullif(btrim(concat_ws(' ', v_player.first_name, v_player.last_name)), ''),
    auth.uid(),
    now()
  )
  on conflict (player_profile_id) do update
  set status = case
        when public.caddie_magic_caddie_profiles.status in ('active','approved','paused','submitted')
          then public.caddie_magic_caddie_profiles.status
        else 'invited'
      end,
      invited_by = auth.uid(),
      invited_at = now(),
      updated_at = now()
  returning * into v_caddie;

  return v_caddie;
end;
$$;

create or replace function public.caddie_magic_set_caddie_profile_status(
  p_caddie_profile_id uuid,
  p_status text
)
returns public.caddie_magic_caddie_profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_status text := lower(btrim(coalesce(p_status,'')));
  v_caddie public.caddie_magic_caddie_profiles%rowtype;
begin
  perform public.caddie_magic_require_product_access();
  if not public.flowtel_current_user_is_admin_or_owner() then
    raise exception 'Owner access is required to approve a Caddie.' using errcode = '42501';
  end if;
  if v_status not in ('approved','active','paused','declined') then
    raise exception 'Choose approved, active, paused, or declined.' using errcode = '22023';
  end if;

  update public.caddie_magic_caddie_profiles
  set status = v_status,
      accepting_requests = case when v_status = 'active' then accepting_requests else false end,
      approved_by = case when v_status in ('approved','active') then auth.uid() else approved_by end,
      approved_at = case when v_status in ('approved','active') then coalesce(approved_at, now()) else approved_at end
  where id = p_caddie_profile_id
  returning * into v_caddie;

  if v_caddie.id is null then
    raise exception 'That Caddie profile could not be found.' using errcode = '22023';
  end if;
  return v_caddie;
end;
$$;

create or replace function public.caddie_magic_list_caddie_network_profiles()
returns table (
  caddie_profile_id uuid,
  player_profile_id uuid,
  user_id uuid,
  player_name text,
  email text,
  status text,
  display_name text,
  professional_title text,
  city text,
  timezone text,
  years_experience integer,
  accepting_requests boolean,
  submitted_at timestamptz,
  approved_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.caddie_magic_require_product_access();
  if not public.flowtel_current_user_is_admin_or_owner() then
    raise exception 'Owner access is required to view the Caddie Network.' using errcode = '42501';
  end if;
  return query
  select c.id, c.player_profile_id, c.user_id,
    nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''), p.email,
    c.status, c.display_name, c.professional_title, c.city, c.timezone,
    c.years_experience, c.accepting_requests, c.submitted_at, c.approved_at, c.updated_at
  from public.caddie_magic_caddie_profiles c
  join public.caddie_magic_player_profiles p on p.id = c.player_profile_id
  order by
    case c.status when 'submitted' then 0 when 'invited' then 1 when 'draft' then 2 when 'active' then 3 else 4 end,
    c.updated_at desc;
end;
$$;

-- ---------------------------------------------------------------------------
-- Caddie profile self-service.
-- ---------------------------------------------------------------------------

create or replace function public.caddie_magic_save_my_caddie_profile(
  p_display_name text,
  p_professional_title text default null,
  p_profile_photo_url text default null,
  p_years_experience integer default null,
  p_courses_served text default null,
  p_pebble_beach_experience text default null,
  p_city text default null,
  p_timezone text default 'America/Los_Angeles',
  p_philosophy text default null,
  p_consultation_method text default null,
  p_consultation_duration_minutes integer default 30,
  p_meeting_link text default null,
  p_submit boolean default false
)
returns public.caddie_magic_caddie_profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_caddie public.caddie_magic_caddie_profiles%rowtype;
  v_display text := nullif(btrim(coalesce(p_display_name,'')), '');
  v_next_status text;
begin
  perform public.caddie_magic_require_product_access();
  if auth.uid() is null then
    raise exception 'Sign in to complete your Caddie Profile.' using errcode = '28000';
  end if;
  if v_display is null then
    raise exception 'Add your professional display name.' using errcode = '22023';
  end if;

  select * into v_caddie
  from public.caddie_magic_caddie_profiles
  where user_id = auth.uid()
  for update;

  if v_caddie.id is null then
    raise exception 'Your Player account has not been invited into the Caddie Network.' using errcode = '42501';
  end if;

  v_next_status := case
    when v_caddie.status in ('active','approved','paused','submitted') then v_caddie.status
    when coalesce(p_submit,false) then 'submitted'
    else 'draft'
  end;

  update public.caddie_magic_caddie_profiles
  set display_name = v_display,
      professional_title = nullif(btrim(coalesce(p_professional_title,'')), ''),
      profile_photo_url = nullif(btrim(coalesce(p_profile_photo_url,'')), ''),
      years_experience = p_years_experience,
      courses_served = nullif(btrim(coalesce(p_courses_served,'')), ''),
      pebble_beach_experience = nullif(btrim(coalesce(p_pebble_beach_experience,'')), ''),
      city = nullif(btrim(coalesce(p_city,'')), ''),
      timezone = coalesce(nullif(btrim(coalesce(p_timezone,'')), ''), 'America/Los_Angeles'),
      philosophy = nullif(btrim(coalesce(p_philosophy,'')), ''),
      consultation_method = nullif(btrim(coalesce(p_consultation_method,'')), ''),
      consultation_duration_minutes = greatest(15, least(180, coalesce(p_consultation_duration_minutes,30))),
      meeting_link = nullif(btrim(coalesce(p_meeting_link,'')), ''),
      status = v_next_status,
      submitted_at = case when v_next_status = 'submitted' then now() else submitted_at end
  where id = v_caddie.id
  returning * into v_caddie;

  return v_caddie;
end;
$$;

create or replace function public.caddie_magic_set_accepting_player_requests(p_enabled boolean)
returns public.caddie_magic_caddie_profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_caddie public.caddie_magic_caddie_profiles%rowtype;
begin
  perform public.caddie_magic_require_product_access();
  update public.caddie_magic_caddie_profiles
  set accepting_requests = coalesce(p_enabled,false)
  where user_id = auth.uid() and status = 'active'
  returning * into v_caddie;
  if v_caddie.id is null then
    raise exception 'Your Caddie Profile must be active before accepting players.' using errcode = '42501';
  end if;
  return v_caddie;
end;
$$;

-- ---------------------------------------------------------------------------
-- Player directory and request flow.
-- ---------------------------------------------------------------------------

create or replace function public.caddie_magic_list_available_caddies()
returns table (
  caddie_profile_id uuid,
  display_name text,
  professional_title text,
  profile_photo_url text,
  years_experience integer,
  courses_served text,
  pebble_beach_experience text,
  city text,
  timezone text,
  philosophy text,
  consultation_method text,
  consultation_duration_minutes integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.caddie_magic_require_product_access();
  if auth.uid() is null then
    raise exception 'Sign in to browse the Caddie Network.' using errcode = '28000';
  end if;
  return query
  select c.id, c.display_name, c.professional_title, c.profile_photo_url,
    c.years_experience, c.courses_served, c.pebble_beach_experience,
    c.city, c.timezone, c.philosophy, c.consultation_method,
    c.consultation_duration_minutes
  from public.caddie_magic_caddie_profiles c
  where c.status = 'active' and c.accepting_requests = true
  order by c.display_name;
end;
$$;

create or replace function public.caddie_magic_request_caddie(
  p_caddie_profile_id uuid,
  p_anticipated_trip_date date default null,
  p_course_itinerary text default null,
  p_consultation_goal text default null,
  p_played_pebble_before boolean default null,
  p_share_scorecard boolean default true,
  p_share_score_map boolean default true,
  p_share_compass boolean default true,
  p_share_upcoming_golf boolean default true
)
returns public.caddie_magic_caddie_requests
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_player public.caddie_magic_player_profiles%rowtype;
  v_caddie public.caddie_magic_caddie_profiles%rowtype;
  v_request public.caddie_magic_caddie_requests%rowtype;
begin
  perform public.caddie_magic_require_product_access();
  select * into v_player from public.caddie_magic_player_profiles where user_id = auth.uid();
  if v_player.id is null then
    raise exception 'Create your Player Profile before requesting a Caddie.' using errcode = '22023';
  end if;
  select * into v_caddie from public.caddie_magic_caddie_profiles
  where id = p_caddie_profile_id and status = 'active' and accepting_requests = true;
  if v_caddie.id is null then
    raise exception 'This Caddie is not accepting player requests right now.' using errcode = '22023';
  end if;
  if v_caddie.user_id = auth.uid() then
    raise exception 'Choose a different Caddie for your consultation.' using errcode = '22023';
  end if;

  insert into public.caddie_magic_caddie_requests (
    player_profile_id, caddie_profile_id, anticipated_trip_date, course_itinerary,
    consultation_goal, played_pebble_before, share_scorecard, share_score_map,
    share_compass, share_upcoming_golf
  ) values (
    v_player.id, v_caddie.id, p_anticipated_trip_date,
    nullif(btrim(coalesce(p_course_itinerary,'')), ''),
    nullif(btrim(coalesce(p_consultation_goal,'')), ''),
    p_played_pebble_before,
    coalesce(p_share_scorecard,true), coalesce(p_share_score_map,true),
    coalesce(p_share_compass,true), coalesce(p_share_upcoming_golf,true)
  ) returning * into v_request;

  return v_request;
exception when unique_violation then
  raise exception 'You already have an open Caddie request. End or cancel it before choosing another Caddie.' using errcode = '23505';
end;
$$;

create or replace function public.caddie_magic_cancel_my_caddie_request(p_request_id uuid)
returns public.caddie_magic_caddie_requests
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_request public.caddie_magic_caddie_requests%rowtype;
begin
  perform public.caddie_magic_require_product_access();
  update public.caddie_magic_caddie_requests r
  set status = case when r.status = 'accepted' then 'ended' else 'cancelled' end,
      ended_at = now()
  where r.id = p_request_id
    and r.status in ('requested','accepted')
    and exists (
      select 1 from public.caddie_magic_player_profiles p
      where p.id = r.player_profile_id and p.user_id = auth.uid()
    )
  returning * into v_request;
  if v_request.id is null then
    raise exception 'That Caddie request could not be cancelled.' using errcode = '42501';
  end if;

  with cancelled_consultations as (
    update public.caddie_magic_consultations co
    set status = 'cancelled', cancelled_by = auth.uid(), cancelled_at = now()
    where co.request_id = v_request.id and co.status = 'scheduled'
    returning co.availability_slot_id, co.starts_at
  )
  update public.caddie_magic_caddie_availability_slots s
  set status = 'available'
  from cancelled_consultations cancelled
  where s.id = cancelled.availability_slot_id
    and cancelled.starts_at > now()
    and s.status = 'booked';

  return v_request;
end;
$$;

create or replace function public.caddie_magic_list_my_caddie_requests()
returns table (
  request_id uuid,
  status text,
  caddie_profile_id uuid,
  caddie_name text,
  professional_title text,
  city text,
  consultation_method text,
  consultation_duration_minutes integer,
  anticipated_trip_date date,
  course_itinerary text,
  consultation_goal text,
  played_pebble_before boolean,
  share_scorecard boolean,
  share_score_map boolean,
  share_compass boolean,
  share_upcoming_golf boolean,
  requested_at timestamptz,
  responded_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  perform public.caddie_magic_require_product_access();
  return query
  select r.id, r.status, c.id, c.display_name, c.professional_title, c.city,
    c.consultation_method, c.consultation_duration_minutes,
    r.anticipated_trip_date, r.course_itinerary, r.consultation_goal,
    r.played_pebble_before, r.share_scorecard, r.share_score_map,
    r.share_compass, r.share_upcoming_golf, r.requested_at, r.responded_at
  from public.caddie_magic_caddie_requests r
  join public.caddie_magic_player_profiles p on p.id = r.player_profile_id
  join public.caddie_magic_caddie_profiles c on c.id = r.caddie_profile_id
  where p.user_id = auth.uid()
  order by r.requested_at desc;
end;
$$;

-- ---------------------------------------------------------------------------
-- Caddie request inbox. No assignments, messages, or notes.
-- ---------------------------------------------------------------------------

create or replace function public.caddie_magic_list_my_player_requests()
returns table (
  request_id uuid,
  status text,
  player_profile_id uuid,
  player_name text,
  anticipated_trip_date date,
  course_itinerary text,
  consultation_goal text,
  played_pebble_before boolean,
  share_scorecard boolean,
  share_score_map boolean,
  share_compass boolean,
  share_upcoming_golf boolean,
  requested_at timestamptz,
  responded_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  perform public.caddie_magic_require_product_access();
  return query
  select r.id, r.status, p.id,
    coalesce(nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),''),'Player'),
    r.anticipated_trip_date, r.course_itinerary, r.consultation_goal,
    r.played_pebble_before, r.share_scorecard, r.share_score_map,
    r.share_compass, r.share_upcoming_golf, r.requested_at, r.responded_at
  from public.caddie_magic_caddie_requests r
  join public.caddie_magic_caddie_profiles c on c.id = r.caddie_profile_id
  join public.caddie_magic_player_profiles p on p.id = r.player_profile_id
  where c.user_id = auth.uid()
  order by case r.status when 'requested' then 0 when 'accepted' then 1 else 2 end, r.requested_at desc;
end;
$$;

create or replace function public.caddie_magic_respond_to_player_request(
  p_request_id uuid,
  p_response text
)
returns public.caddie_magic_caddie_requests
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_response text := lower(btrim(coalesce(p_response,'')));
  v_request public.caddie_magic_caddie_requests%rowtype;
begin
  perform public.caddie_magic_require_product_access();
  if v_response not in ('accepted','declined') then
    raise exception 'Choose accepted or declined.' using errcode = '22023';
  end if;
  update public.caddie_magic_caddie_requests r
  set status = v_response, responded_at = now()
  where r.id = p_request_id and r.status = 'requested'
    and exists (
      select 1 from public.caddie_magic_caddie_profiles c
      where c.id = r.caddie_profile_id and c.user_id = auth.uid() and c.status = 'active'
    )
  returning * into v_request;
  if v_request.id is null then
    raise exception 'That player request is no longer available.' using errcode = '42501';
  end if;
  return v_request;
end;
$$;

-- ---------------------------------------------------------------------------
-- Availability management and accepted-only booking.
-- ---------------------------------------------------------------------------

create or replace function public.caddie_magic_add_my_availability_slot(
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns public.caddie_magic_caddie_availability_slots
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_caddie public.caddie_magic_caddie_profiles%rowtype;
  v_slot public.caddie_magic_caddie_availability_slots%rowtype;
begin
  perform public.caddie_magic_require_product_access();
  select * into v_caddie from public.caddie_magic_caddie_profiles
  where user_id = auth.uid() and status = 'active';
  if v_caddie.id is null then
    raise exception 'Your Caddie Profile must be active before adding availability.' using errcode = '42501';
  end if;
  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then
    raise exception 'Choose a valid consultation start and end time.' using errcode = '22007';
  end if;
  if p_starts_at <= now() then
    raise exception 'Availability must begin in the future.' using errcode = '22007';
  end if;
  if exists (
    select 1 from public.caddie_magic_caddie_availability_slots s
    where s.caddie_profile_id = v_caddie.id and s.status <> 'blocked'
      and tstzrange(s.starts_at,s.ends_at,'[)') && tstzrange(p_starts_at,p_ends_at,'[)')
  ) then
    raise exception 'That availability overlaps an existing slot.' using errcode = '23P01';
  end if;
  insert into public.caddie_magic_caddie_availability_slots (caddie_profile_id,starts_at,ends_at)
  values (v_caddie.id,p_starts_at,p_ends_at)
  returning * into v_slot;
  return v_slot;
end;
$$;

create or replace function public.caddie_magic_remove_my_availability_slot(p_slot_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_count integer;
begin
  perform public.caddie_magic_require_product_access();
  delete from public.caddie_magic_caddie_availability_slots s
  where s.id = p_slot_id and s.status = 'available'
    and exists (
      select 1 from public.caddie_magic_caddie_profiles c
      where c.id = s.caddie_profile_id and c.user_id = auth.uid()
    );
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

create or replace function public.caddie_magic_list_accepted_caddie_availability(p_request_id uuid)
returns table (
  slot_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  caddie_timezone text
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  perform public.caddie_magic_require_product_access();
  if not exists (
    select 1 from public.caddie_magic_caddie_requests r
    join public.caddie_magic_player_profiles p on p.id = r.player_profile_id
    where r.id = p_request_id and r.status = 'accepted' and p.user_id = auth.uid()
  ) then
    raise exception 'Availability opens only after the Caddie accepts your request.' using errcode = '42501';
  end if;
  return query
  select s.id, s.starts_at, s.ends_at, c.timezone
  from public.caddie_magic_caddie_availability_slots s
  join public.caddie_magic_caddie_profiles c on c.id = s.caddie_profile_id
  join public.caddie_magic_caddie_requests r on r.caddie_profile_id = c.id
  where r.id = p_request_id and s.status = 'available' and s.starts_at > now()
  order by s.starts_at;
end;
$$;

create or replace function public.caddie_magic_book_consultation(
  p_request_id uuid,
  p_slot_id uuid
)
returns public.caddie_magic_consultations
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_request public.caddie_magic_caddie_requests%rowtype;
  v_slot public.caddie_magic_caddie_availability_slots%rowtype;
  v_caddie public.caddie_magic_caddie_profiles%rowtype;
  v_consultation public.caddie_magic_consultations%rowtype;
begin
  perform public.caddie_magic_require_product_access();
  select r.* into v_request
  from public.caddie_magic_caddie_requests r
  join public.caddie_magic_player_profiles p on p.id = r.player_profile_id
  where r.id = p_request_id and r.status = 'accepted' and p.user_id = auth.uid()
  for update of r;
  if v_request.id is null then
    raise exception 'This accepted Caddie request could not be opened.' using errcode = '42501';
  end if;

  select * into v_slot from public.caddie_magic_caddie_availability_slots
  where id = p_slot_id and caddie_profile_id = v_request.caddie_profile_id
  for update;
  if v_slot.id is null or v_slot.status <> 'available' or v_slot.starts_at <= now() then
    raise exception 'That consultation time is no longer available.' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.caddie_magic_consultations co
    where co.request_id = v_request.id and co.status = 'scheduled'
  ) then
    raise exception 'A consultation is already scheduled for this accepted Caddie request.' using errcode = '23505';
  end if;

  select * into v_caddie from public.caddie_magic_caddie_profiles where id = v_request.caddie_profile_id;

  insert into public.caddie_magic_consultations (
    request_id, availability_slot_id, player_profile_id, caddie_profile_id,
    starts_at, ends_at, consultation_method, meeting_link
  ) values (
    v_request.id, v_slot.id, v_request.player_profile_id, v_request.caddie_profile_id,
    v_slot.starts_at, v_slot.ends_at, v_caddie.consultation_method, v_caddie.meeting_link
  ) returning * into v_consultation;

  update public.caddie_magic_caddie_availability_slots set status = 'booked' where id = v_slot.id;
  return v_consultation;
end;
$$;

create or replace function public.caddie_magic_cancel_consultation(p_consultation_id uuid)
returns public.caddie_magic_consultations
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_consultation public.caddie_magic_consultations%rowtype;
begin
  perform public.caddie_magic_require_product_access();
  select * into v_consultation from public.caddie_magic_consultations co
  where co.id = p_consultation_id and co.status = 'scheduled'
    and (
      public.flowtel_current_user_is_admin_or_owner()
      or exists (select 1 from public.caddie_magic_player_profiles p where p.id = co.player_profile_id and p.user_id = auth.uid())
      or exists (select 1 from public.caddie_magic_caddie_profiles c where c.id = co.caddie_profile_id and c.user_id = auth.uid())
    )
  for update;
  if v_consultation.id is null then
    raise exception 'That consultation could not be cancelled.' using errcode = '42501';
  end if;
  update public.caddie_magic_consultations
  set status = 'cancelled', cancelled_by = auth.uid(), cancelled_at = now()
  where id = v_consultation.id returning * into v_consultation;
  if v_consultation.availability_slot_id is not null and v_consultation.starts_at > now() then
    update public.caddie_magic_caddie_availability_slots
    set status = 'available'
    where id = v_consultation.availability_slot_id and status = 'booked';
  end if;
  return v_consultation;
end;
$$;

create or replace function public.caddie_magic_complete_consultation(p_consultation_id uuid)
returns public.caddie_magic_consultations
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_consultation public.caddie_magic_consultations%rowtype;
begin
  perform public.caddie_magic_require_product_access();
  update public.caddie_magic_consultations co
  set status = 'completed'
  where co.id = p_consultation_id
    and co.status = 'scheduled'
    and co.starts_at <= now()
    and (
      public.flowtel_current_user_is_admin_or_owner()
      or exists (
        select 1 from public.caddie_magic_caddie_profiles c
        where c.id = co.caddie_profile_id and c.user_id = auth.uid()
      )
    )
  returning * into v_consultation;

  if v_consultation.id is null then
    raise exception 'Only the scheduled Caddie may complete a consultation after it begins.' using errcode = '42501';
  end if;
  return v_consultation;
end;
$$;

create or replace function public.caddie_magic_list_my_consultations()
returns table (
  consultation_id uuid,
  request_id uuid,
  status text,
  starts_at timestamptz,
  ends_at timestamptz,
  consultation_method text,
  meeting_link text,
  player_name text,
  caddie_name text,
  viewer_role text
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  perform public.caddie_magic_require_product_access();
  return query
  select co.id, co.request_id, co.status, co.starts_at, co.ends_at,
    co.consultation_method, co.meeting_link,
    coalesce(nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),''),'Player'),
    c.display_name,
    case when p.user_id = auth.uid() then 'player' else 'caddie' end
  from public.caddie_magic_consultations co
  join public.caddie_magic_player_profiles p on p.id = co.player_profile_id
  join public.caddie_magic_caddie_profiles c on c.id = co.caddie_profile_id
  where p.user_id = auth.uid() or c.user_id = auth.uid() or public.flowtel_current_user_is_admin_or_owner()
  order by co.starts_at desc;
end;
$$;

-- ---------------------------------------------------------------------------
-- Accepted, read-only consultation preparation snapshot.
-- ---------------------------------------------------------------------------

create or replace function public.caddie_magic_get_player_consultation_snapshot(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_request public.caddie_magic_caddie_requests%rowtype;
  v_player public.caddie_magic_player_profiles%rowtype;
  v_caddie public.caddie_magic_caddie_profiles%rowtype;
  v_scorecard jsonb := '[]'::jsonb;
  v_score_map jsonb := '[]'::jsonb;
  v_compass jsonb := null;
  v_upcoming jsonb := '[]'::jsonb;
begin
  perform public.caddie_magic_require_product_access();
  select r.* into v_request
  from public.caddie_magic_caddie_requests r
  join public.caddie_magic_caddie_profiles c on c.id = r.caddie_profile_id
  where r.id = p_request_id and r.status = 'accepted'
    and (c.user_id = auth.uid() or public.flowtel_current_user_is_admin_or_owner());
  if v_request.id is null then
    raise exception 'Only the accepted Caddie may open this preparation view.' using errcode = '42501';
  end if;

  select * into v_player from public.caddie_magic_player_profiles where id = v_request.player_profile_id;
  select * into v_caddie from public.caddie_magic_caddie_profiles where id = v_request.caddie_profile_id;

  if v_request.share_scorecard then
    select coalesce(jsonb_agg(to_jsonb(x) order by x.round_date desc, x.created_at desc),'[]'::jsonb)
    into v_scorecard
    from (
      select id, round_date, course_played, score, swing_thoughts, moon_day, moon_phase, entry_type, created_at
      from public.caddie_magic_round_logs
      where player_profile_id = v_player.id and score is not null
      order by round_date desc, created_at desc limit 20
    ) x;
  end if;

  if v_request.share_score_map then
    select coalesce(jsonb_agg(to_jsonb(x) order by x.round_date desc, x.created_at desc),'[]'::jsonb)
    into v_score_map
    from (
      select id, round_date, course_played, score, swing_thoughts, moon_day, moon_phase,
        moon_last_new_moon_date, entry_type, created_at
      from public.caddie_magic_round_logs
      where player_profile_id = v_player.id
      order by round_date desc, created_at desc limit 150
    ) x;
  end if;

  if v_request.share_compass then
    select to_jsonb(x) into v_compass
    from (
      select id, north_club, east_club, west_club, south_club, staff_club, version, status, updated_at
      from public.caddie_magic_compasses
      where player_profile_id = v_player.id and is_active = true
      order by version desc limit 1
    ) x;
  end if;

  if v_request.share_upcoming_golf then
    select coalesce(jsonb_agg(to_jsonb(x) order by x.date_start),'[]'::jsonb)
    into v_upcoming
    from (
      select id, event_type, title, date_start, date_end, location, course, notes, moon_forecast
      from public.caddie_magic_upcoming_golf_events
      where player_profile_id = v_player.id and date_end >= (timezone('America/Los_Angeles',now()))::date
      order by date_start limit 20
    ) x;
  end if;

  return jsonb_build_object(
    'request', jsonb_build_object(
      'id', v_request.id,
      'anticipated_trip_date', v_request.anticipated_trip_date,
      'course_itinerary', v_request.course_itinerary,
      'consultation_goal', v_request.consultation_goal,
      'played_pebble_before', v_request.played_pebble_before,
      'share_scorecard', v_request.share_scorecard,
      'share_score_map', v_request.share_score_map,
      'share_compass', v_request.share_compass,
      'share_upcoming_golf', v_request.share_upcoming_golf
    ),
    'player', jsonb_build_object(
      'id', v_player.id,
      'name', nullif(btrim(concat_ws(' ',v_player.first_name,v_player.last_name)),''),
      'home_course', v_player.home_course,
      'handicap_or_score_range', v_player.handicap_or_score_range,
      'main_goal', v_player.main_goal,
      'biggest_frustration', v_player.biggest_frustration
    ),
    'caddie', jsonb_build_object('id',v_caddie.id,'name',v_caddie.display_name),
    'scorecard', v_scorecard,
    'score_map', v_score_map,
    'compass', v_compass,
    'upcoming_golf', v_upcoming
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants.
-- ---------------------------------------------------------------------------

revoke all on function public.caddie_magic_require_product_access() from public;
revoke all on function public.caddie_magic_invite_player_to_caddie_network(uuid) from public;
revoke all on function public.caddie_magic_set_caddie_profile_status(uuid,text) from public;
revoke all on function public.caddie_magic_list_caddie_network_profiles() from public;
revoke all on function public.caddie_magic_save_my_caddie_profile(text,text,text,integer,text,text,text,text,text,text,integer,text,boolean) from public;
revoke all on function public.caddie_magic_set_accepting_player_requests(boolean) from public;
revoke all on function public.caddie_magic_list_available_caddies() from public;
revoke all on function public.caddie_magic_request_caddie(uuid,date,text,text,boolean,boolean,boolean,boolean,boolean) from public;
revoke all on function public.caddie_magic_cancel_my_caddie_request(uuid) from public;
revoke all on function public.caddie_magic_list_my_caddie_requests() from public;
revoke all on function public.caddie_magic_list_my_player_requests() from public;
revoke all on function public.caddie_magic_respond_to_player_request(uuid,text) from public;
revoke all on function public.caddie_magic_add_my_availability_slot(timestamptz,timestamptz) from public;
revoke all on function public.caddie_magic_remove_my_availability_slot(uuid) from public;
revoke all on function public.caddie_magic_list_accepted_caddie_availability(uuid) from public;
revoke all on function public.caddie_magic_book_consultation(uuid,uuid) from public;
revoke all on function public.caddie_magic_cancel_consultation(uuid) from public;
revoke all on function public.caddie_magic_complete_consultation(uuid) from public;
revoke all on function public.caddie_magic_list_my_consultations() from public;
revoke all on function public.caddie_magic_get_player_consultation_snapshot(uuid) from public;

grant execute on function public.caddie_magic_require_product_access() to authenticated;
grant execute on function public.caddie_magic_invite_player_to_caddie_network(uuid) to authenticated;
grant execute on function public.caddie_magic_set_caddie_profile_status(uuid,text) to authenticated;
grant execute on function public.caddie_magic_list_caddie_network_profiles() to authenticated;
grant execute on function public.caddie_magic_save_my_caddie_profile(text,text,text,integer,text,text,text,text,text,text,integer,text,boolean) to authenticated;
grant execute on function public.caddie_magic_set_accepting_player_requests(boolean) to authenticated;
grant execute on function public.caddie_magic_list_available_caddies() to authenticated;
grant execute on function public.caddie_magic_request_caddie(uuid,date,text,text,boolean,boolean,boolean,boolean,boolean) to authenticated;
grant execute on function public.caddie_magic_cancel_my_caddie_request(uuid) to authenticated;
grant execute on function public.caddie_magic_list_my_caddie_requests() to authenticated;
grant execute on function public.caddie_magic_list_my_player_requests() to authenticated;
grant execute on function public.caddie_magic_respond_to_player_request(uuid,text) to authenticated;
grant execute on function public.caddie_magic_add_my_availability_slot(timestamptz,timestamptz) to authenticated;
grant execute on function public.caddie_magic_remove_my_availability_slot(uuid) to authenticated;
grant execute on function public.caddie_magic_list_accepted_caddie_availability(uuid) to authenticated;
grant execute on function public.caddie_magic_book_consultation(uuid,uuid) to authenticated;
grant execute on function public.caddie_magic_cancel_consultation(uuid) to authenticated;
grant execute on function public.caddie_magic_complete_consultation(uuid) to authenticated;
grant execute on function public.caddie_magic_list_my_consultations() to authenticated;
grant execute on function public.caddie_magic_get_player_consultation_snapshot(uuid) to authenticated;

notify pgrst, 'reload schema';
