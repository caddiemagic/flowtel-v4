-- Flowtel Release 0.9.3
-- Mentor Connection Repair + Consent Foundation
--
-- Purpose:
-- 1. Keep the Mentor to the Moon connection action database-owned.
-- 2. Record explicit consent language when a guest invites a mentor.
-- 3. Allow guests to cancel/change a pending mentor request.
-- 4. Preserve the product rule: one active mentor per guest, many guests per mentor.

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

alter table public.flowtel_practitioner_relationships
  add column if not exists consent_granted_at timestamptz,
  add column if not exists consent_language text,
  add column if not exists data_access_scope text not null default 'full_history_while_connected',
  add column if not exists connected_by uuid references public.profiles(id) on delete set null,
  add column if not exists disconnected_reason text;

comment on column public.flowtel_practitioner_relationships.consent_language is
  'Exact consent language shown when the guest invited the mentor.';
comment on column public.flowtel_practitioner_relationships.data_access_scope is
  'Data access scope granted by the guest. Initial beta value: full_history_while_connected.';

update public.flowtel_practitioner_relationships
  set consent_granted_at = coalesce(consent_granted_at, requested_at, updated_at, now()),
      consent_language = coalesce(
        consent_language,
        'By inviting this mentor, you consent to share your Flowtel cycle data, check-ins, reflections, and stay history with them while you are connected.'
      ),
      data_access_scope = coalesce(nullif(data_access_scope,''), 'full_history_while_connected')
where status in ('requested','connected')
  and consent_granted is true;

-- Helper remains available even when migrations are run out of order.
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

-- Wrapper used by the v0.9.3 UI. It preserves the existing choose function but records
-- the exact consent language displayed to the guest.
create or replace function public.flowtel_choose_mentor_with_consent(
  p_mentor_id uuid,
  p_consent_language text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_relationship_id uuid;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to choose a mentor.' using errcode = '28000';
  end if;

  v_relationship_id := public.flowtel_choose_mentor(p_mentor_id);

  update public.flowtel_practitioner_relationships
    set consent_granted = true,
        consent_granted_at = coalesce(consent_granted_at, v_now),
        consent_language = coalesce(nullif(p_consent_language,''), consent_language),
        data_access_scope = 'full_history_while_connected',
        updated_at = v_now
    where id = v_relationship_id
      and client_id = v_user_id;

  return v_relationship_id;
end;
$$;

grant execute on function public.flowtel_choose_mentor_with_consent(uuid, text) to authenticated;

-- Guests can cancel a pending request before it is connected. We do not delete the row;
-- we preserve the relationship history and remove it from active queues.
create or replace function public.flowtel_cancel_mentor_request(
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
  v_cancelled_id uuid;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to cancel a mentor request.' using errcode = '28000';
  end if;

  update public.flowtel_practitioner_relationships
    set status = 'cancelled',
        disconnected_at = coalesce(disconnected_at, v_now),
        disconnected_reason = coalesce(disconnected_reason, 'guest cancelled pending mentor request'),
        updated_at = v_now
    where id = p_relationship_id
      and client_id = v_user_id
      and status = 'requested'
    returning id into v_cancelled_id;

  if v_cancelled_id is null then
    raise exception 'This mentor request could not be cancelled.' using errcode = '22023';
  end if;

  return v_cancelled_id;
end;
$$;

grant execute on function public.flowtel_cancel_mentor_request(uuid) to authenticated;

-- Recreate the Connect action one more time so v0.9.3 deployments have a known-good RPC.
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
        consent_granted = true,
        consent_granted_at = coalesce(consent_granted_at, requested_at, v_now),
        data_access_scope = coalesce(nullif(data_access_scope,''), 'full_history_while_connected'),
        updated_at = v_now
    where id = v_relationship.id
    returning id into v_connected_id;

  return v_connected_id;
end;
$$;

grant execute on function public.flowtel_connect_mentor_relationship(uuid) to authenticated;

-- Guardrails: one active mentor per guest; many clients per mentor.
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
      disconnected_reason = coalesce(r.disconnected_reason, 'superseded during v0.9.3 mentor ratio cleanup'),
      updated_at = now()
from ranked
where r.id = ranked.id
  and ranked.active_rank > 1;

create unique index if not exists flowtel_one_active_mentor_per_guest_idx
  on public.flowtel_practitioner_relationships (client_id)
  where status in ('requested','connected');

create index if not exists flowtel_relationships_practitioner_status_idx
  on public.flowtel_practitioner_relationships (practitioner_id, status, updated_at desc);
