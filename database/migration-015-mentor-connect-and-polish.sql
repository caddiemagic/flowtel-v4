-- Flowtel Release 0.9.2
-- Mentor Connect hardening + relationship ratio guardrails.
--
-- Purpose:
-- 1. Confirm product ratio: one active Mentor to the Moon per guest.
-- 2. Preserve many guests per mentor.
-- 3. Recreate the Connect RPC defensively so the Concierge Desk button can complete requests reliably.
-- 4. Keep mentor profile photo support URL-ready while the Squarespace/profile-image bridge is decided.

alter table public.profiles
  add column if not exists mentor_photo_url text;

alter table public.flowtel_practitioner_relationships
  add column if not exists connected_by uuid references public.profiles(id) on delete set null,
  add column if not exists disconnected_reason text;

-- One active Mentor to the Moon per guest. This index is intentionally on client_id only.
-- There is intentionally no unique index on practitioner_id, so one mentor can tend many guests.
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
      disconnected_reason = coalesce(r.disconnected_reason, 'superseded during v0.9.2 mentor ratio cleanup'),
      updated_at = now()
from ranked
where r.id = ranked.id
  and ranked.active_rank > 1;

create unique index if not exists flowtel_one_active_mentor_per_guest_idx
  on public.flowtel_practitioner_relationships (client_id)
  where status in ('requested','connected');

create index if not exists flowtel_relationships_practitioner_status_idx
  on public.flowtel_practitioner_relationships (practitioner_id, status, updated_at desc);

-- Keep this helper available even if migrations were run out of order.
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

-- Recreate the Connect action defensively. The UI calls this from the visible Mentor Requests card.
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
  v_connected_id uuid;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to connect with a guest.' using errcode = '28000';
  end if;

  select role into v_user_role from public.profiles where id = v_user_id;

  if coalesce(v_user_role,'') not in ('practitioner','admin','owner') then
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

  -- Preserve the one-active-mentor rule by disconnecting any other open request for this guest.
  update public.flowtel_practitioner_relationships
    set status = 'disconnected',
        disconnected_at = coalesce(disconnected_at, v_now),
        disconnected_reason = coalesce(disconnected_reason, 'superseded when mentor connection was completed'),
        updated_at = v_now
    where client_id = v_relationship.client_id
      and id <> v_relationship.id
      and status in ('requested','connected');

  update public.flowtel_practitioner_relationships
    set status = 'connected',
        connected_at = coalesce(connected_at, v_now),
        connected_by = v_user_id,
        updated_at = v_now
    where id = v_relationship.id
    returning id into v_connected_id;

  return v_connected_id;
end;
$$;

grant execute on function public.flowtel_connect_mentor_relationship(uuid) to authenticated;

alter table public.flowtel_practitioner_relationships enable row level security;

drop policy if exists "Guests can read their mentor relationships" on public.flowtel_practitioner_relationships;
create policy "Guests can read their mentor relationships"
  on public.flowtel_practitioner_relationships for select
  using (auth.uid() = client_id);

drop policy if exists "Mentors can read their guest relationships" on public.flowtel_practitioner_relationships;
create policy "Mentors can read their guest relationships"
  on public.flowtel_practitioner_relationships for select
  using (auth.uid() = practitioner_id or public.flowtel_current_user_is_mentor());

drop policy if exists "Guests and mentors can update mentor requests" on public.flowtel_practitioner_relationships;
create policy "Guests and mentors can update mentor requests"
  on public.flowtel_practitioner_relationships for update
  using (auth.uid() = client_id or auth.uid() = practitioner_id or public.flowtel_current_user_is_mentor())
  with check (auth.uid() = client_id or auth.uid() = practitioner_id or public.flowtel_current_user_is_mentor());
