-- Flowtel Release 0.9.0
-- Choose Your Mentor logic.
--
-- Purpose:
-- 1. Treat “Mentor to the Moon” as the guest-facing relationship layer.
-- 2. Keep practitioner as internal/technical language only.
-- 3. Let a guest choose one active mentor request at a time.
-- 4. Let the selected mentor Connect from the Concierge Desk.
-- 5. Preserve the relationship across stays until intentionally changed in a future release.

-- Mentor directory fields. These are optional and safe for beta; the UI has fallbacks.
alter table public.profiles
  add column if not exists mentor_title text,
  add column if not exists mentor_bio text,
  add column if not exists mentor_photo_url text,
  add column if not exists mentor_specialties text[] default '{}'::text[],
  add column if not exists mentor_accepting_clients boolean not null default true,
  add column if not exists mentor_sort_order integer,
  add column if not exists serving_wing text;

comment on column public.profiles.mentor_title is
  'Guest-facing mentor title displayed in the Mentor to the Moon directory.';
comment on column public.profiles.mentor_bio is
  'Short guest-facing mentor description for the Choose Your Mentor directory.';
comment on column public.profiles.mentor_photo_url is
  'Optional hosted profile image URL for the mentor directory.';
comment on column public.profiles.mentor_specialties is
  'Optional guest-facing specialties shown as small tags in the mentor card.';
comment on column public.profiles.mentor_accepting_clients is
  'Whether this mentor should appear in the Choose Your Mentor directory.';
comment on column public.profiles.serving_wing is
  'Optional default wing identity for mentor directory display; operational turndown routing still follows clock-in assignment.';


-- Safety bootstrap: some beta databases have not run migration-007 yet.
-- The Choose Your Mentor layer depends on this relationship table, so create it
-- defensively before altering it. Safe to rerun.
create table if not exists public.flowtel_practitioner_relationships (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  practitioner_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'requested',
  consent_granted boolean not null default true,
  requested_at timestamptz not null default now(),
  connected_at timestamptz,
  disconnected_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(client_id, practitioner_id)
);

create index if not exists flowtel_relationships_client_idx
  on public.flowtel_practitioner_relationships (client_id, status);

create index if not exists flowtel_relationships_practitioner_idx
  on public.flowtel_practitioner_relationships (practitioner_id, status);

-- Relationship audit/persistence fields.
alter table public.flowtel_practitioner_relationships
  add column if not exists choice_note text,
  add column if not exists connected_by uuid references public.profiles(id) on delete set null,
  add column if not exists disconnected_reason text;

-- Normalize older beta data before enforcing one active Mentor to the Moon per guest.
with ranked as (
  select
    id,
    row_number() over (
      partition by client_id
      order by
        case status when 'connected' then 0 when 'requested' then 1 else 2 end,
        coalesce(connected_at, requested_at, updated_at) desc
    ) as active_rank
  from public.flowtel_practitioner_relationships
  where status in ('requested','connected')
)
update public.flowtel_practitioner_relationships r
  set status = 'disconnected',
      disconnected_at = coalesce(r.disconnected_at, now()),
      disconnected_reason = coalesce(r.disconnected_reason, 'superseded during mentor relationship cleanup'),
      updated_at = now()
from ranked
where r.id = ranked.id
  and ranked.active_rank > 1;

-- Product rule: one active Mentor to the Moon at a time.
create unique index if not exists flowtel_one_active_mentor_per_guest_idx
  on public.flowtel_practitioner_relationships (client_id)
  where status in ('requested','connected');

create index if not exists flowtel_relationships_status_updated_idx
  on public.flowtel_practitioner_relationships (status, updated_at desc);

-- Helper: current user is a mentor/admin/owner.
create or replace function public.flowtel_current_user_is_mentor()
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
      and p.role in ('practitioner','admin','owner')
  );
$$;

grant execute on function public.flowtel_current_user_is_mentor() to authenticated;

-- Guests choose a mentor. This creates a request, not an automatic connection.
create or replace function public.flowtel_choose_mentor(
  p_mentor_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_mentor_role text;
  v_accepting boolean;
  v_existing public.flowtel_practitioner_relationships%rowtype;
  v_relationship_id uuid;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to choose a mentor.' using errcode = '28000';
  end if;

  if p_mentor_id is null then
    raise exception 'Choose a mentor to connect with.' using errcode = '22023';
  end if;

  if p_mentor_id = v_user_id then
    raise exception 'You cannot choose yourself as your Mentor to the Moon.' using errcode = '22023';
  end if;

  select role, mentor_accepting_clients
    into v_mentor_role, v_accepting
    from public.profiles
    where id = p_mentor_id;

  if not found or v_mentor_role not in ('practitioner','admin','owner') then
    raise exception 'This mentor is not available.' using errcode = '42501';
  end if;

  if coalesce(v_accepting, true) is false then
    raise exception 'This mentor is not accepting new guests right now.' using errcode = '42501';
  end if;

  select *
    into v_existing
    from public.flowtel_practitioner_relationships
    where client_id = v_user_id
      and status in ('requested','connected')
    order by case status when 'connected' then 0 else 1 end,
             coalesce(connected_at, requested_at, updated_at) desc
    limit 1
    for update;

  if found and v_existing.status = 'connected' and v_existing.practitioner_id <> p_mentor_id then
    raise exception 'You already have a Mentor to the Moon. Changing mentors will be added in a future release.' using errcode = '23505';
  end if;

  if found and v_existing.status = 'connected' and v_existing.practitioner_id = p_mentor_id then
    return v_existing.id;
  end if;

  if found and v_existing.status = 'requested' and v_existing.practitioner_id = p_mentor_id then
    update public.flowtel_practitioner_relationships
      set requested_at = v_now,
          updated_at = v_now
      where id = v_existing.id;
    return v_existing.id;
  end if;

  -- A guest may change a pending request before it is connected. Keep history append-only by
  -- disconnecting/superseding the older request rather than deleting it.
  update public.flowtel_practitioner_relationships
    set status = 'disconnected',
        disconnected_at = coalesce(disconnected_at, v_now),
        disconnected_reason = coalesce(disconnected_reason, 'guest chose a different mentor before connection'),
        updated_at = v_now
    where client_id = v_user_id
      and status = 'requested'
      and practitioner_id <> p_mentor_id;

  insert into public.flowtel_practitioner_relationships (
    client_id,
    practitioner_id,
    status,
    consent_granted,
    requested_at,
    connected_at,
    disconnected_at,
    disconnected_reason,
    updated_at
  ) values (
    v_user_id,
    p_mentor_id,
    'requested',
    true,
    v_now,
    null,
    null,
    null,
    v_now
  )
  on conflict (client_id, practitioner_id) do update set
    status = 'requested',
    consent_granted = true,
    requested_at = v_now,
    connected_at = null,
    disconnected_at = null,
    disconnected_reason = null,
    updated_at = v_now
  returning id into v_relationship_id;

  return v_relationship_id;
end;
$$;

grant execute on function public.flowtel_choose_mentor(uuid) to authenticated;

-- Mentors Connect with a guest. This is intentionally “Connect,” not “Accept.”
create or replace function public.flowtel_connect_mentor_relationship(
  p_relationship_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_user_role text;
  v_relationship public.flowtel_practitioner_relationships%rowtype;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to connect with a guest.' using errcode = '28000';
  end if;

  select role into v_user_role from public.profiles where id = v_user_id;

  if v_user_role not in ('practitioner','admin','owner') then
    raise exception 'Only mentors can connect with guests.' using errcode = '42501';
  end if;

  select *
    into v_relationship
    from public.flowtel_practitioner_relationships
    where id = p_relationship_id
    for update;

  if not found then
    raise exception 'Mentor request not found.' using errcode = 'P0002';
  end if;

  if v_user_role = 'practitioner' and v_relationship.practitioner_id <> v_user_id then
    raise exception 'This mentor request belongs to another mentor.' using errcode = '42501';
  end if;

  if v_relationship.status = 'connected' then
    return v_relationship.id;
  end if;

  if v_relationship.status <> 'requested' then
    raise exception 'This mentor request is no longer open.' using errcode = '22023';
  end if;

  update public.flowtel_practitioner_relationships
    set status = 'connected',
        connected_at = v_now,
        connected_by = v_user_id,
        updated_at = v_now
    where id = p_relationship_id
    returning id into p_relationship_id;

  return p_relationship_id;
end;
$$;

grant execute on function public.flowtel_connect_mentor_relationship(uuid) to authenticated;

-- Keep RLS policies clear and mentor-language aligned.
alter table public.flowtel_practitioner_relationships enable row level security;

drop policy if exists "Guests can read their mentor relationships" on public.flowtel_practitioner_relationships;
create policy "Guests can read their mentor relationships"
  on public.flowtel_practitioner_relationships for select
  using (auth.uid() = client_id);

drop policy if exists "Mentors can read their guest relationships" on public.flowtel_practitioner_relationships;
create policy "Mentors can read their guest relationships"
  on public.flowtel_practitioner_relationships for select
  using (auth.uid() = practitioner_id or public.flowtel_current_user_is_mentor());

-- The RPC owns inserts/updates, but these policies preserve compatibility with older beta code.
drop policy if exists "Guests can request practitioner connections" on public.flowtel_practitioner_relationships;
drop policy if exists "Guests can request mentor connections" on public.flowtel_practitioner_relationships;
create policy "Guests can request mentor connections"
  on public.flowtel_practitioner_relationships for insert
  with check (auth.uid() = client_id);

drop policy if exists "Clients can update their own connection requests" on public.flowtel_practitioner_relationships;
drop policy if exists "Guests and mentors can update mentor requests" on public.flowtel_practitioner_relationships;
create policy "Guests and mentors can update mentor requests"
  on public.flowtel_practitioner_relationships for update
  using (auth.uid() = client_id or auth.uid() = practitioner_id or public.flowtel_current_user_is_mentor())
  with check (auth.uid() = client_id or auth.uid() = practitioner_id or public.flowtel_current_user_is_mentor());

-- Mentor directory policy. Guests can see mentor rows; everyone can read their own profile.
alter table public.profiles enable row level security;

drop policy if exists "Members can view practitioner directory" on public.profiles;
drop policy if exists "Members can view mentor directory" on public.profiles;
create policy "Members can view mentor directory"
  on public.profiles for select
  using (auth.uid() = id or role in ('practitioner','admin','owner'));

-- Friendly beta directory copy. Safe to rerun.
update public.profiles
  set mentor_title = coalesce(mentor_title, 'Flowtel Mentor'),
      mentor_bio = coalesce(mentor_bio, 'Available to witness your Flowtel stays, tend your room, and remember your cyclical patterns with care.'),
      mentor_specialties = case
        when mentor_specialties is null or mentor_specialties = '{}'::text[] then array['Cycle witnessing','Concierge care','Flow FM']::text[]
        else mentor_specialties
      end,
      mentor_accepting_clients = coalesce(mentor_accepting_clients, true)
where role in ('practitioner','admin','owner');

-- Seed more specific beta mentor profiles when the local beta accounts exist.
update public.profiles set
  first_name = coalesce(nullif(first_name,''),'Priya'),
  last_name = coalesce(nullif(last_name,''),'Winter'),
  mentor_title = 'West Wing Mentor',
  mentor_bio = 'Tends the quieter rooms: release, reflection, and the first return home.',
  mentor_specialties = array['Inner Winter','Reflection','Turndown'],
  serving_wing = 'West Wing',
  mentor_sort_order = 10
where email = 'flowtel.practitioner1@test.local';

update public.profiles set
  first_name = coalesce(nullif(first_name,''),'Sage'),
  last_name = coalesce(nullif(last_name,''),'Spring'),
  mentor_title = 'South Wing Mentor',
  mentor_bio = 'Supports soft beginnings, creative re-entry, and the first yes after rest.',
  mentor_specialties = array['Inner Spring','Emergence','Creative flow'],
  serving_wing = 'South Wing',
  mentor_sort_order = 20
where email = 'flowtel.practitioner2@test.local';

update public.profiles set
  first_name = coalesce(nullif(first_name,''),'Sol'),
  last_name = coalesce(nullif(last_name,''),'Summer'),
  mentor_title = 'East Wing Mentor',
  mentor_bio = 'Holds visibility, overflow, leadership, and the rooms where a woman lets herself be seen.',
  mentor_specialties = array['Inner Summer','Visibility','Overflow'],
  serving_wing = 'East Wing',
  mentor_sort_order = 30
where email = 'flowtel.practitioner3@test.local';

update public.profiles set
  first_name = coalesce(nullif(first_name,''),'Amina'),
  last_name = coalesce(nullif(last_name,''),'Autumn'),
  mentor_title = 'North Wing Mentor',
  mentor_bio = 'Witnesses discernment, boundaries, intuition, and the rooms where truth becomes simple.',
  mentor_specialties = array['Inner Autumn','Boundaries','Intuition'],
  serving_wing = 'North Wing',
  mentor_sort_order = 40
where email = 'flowtel.practitioner4@test.local';
