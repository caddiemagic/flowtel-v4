-- Flowtel v0.10.53 — Unread Concierge Notes + Profile Button Polish
--
-- Historical Concierge notes remain attached to the original stay where they
-- were written. These authenticated RPCs only surface the signed-in guest's
-- own unread note-bearing stays and record receipt on that original stay.
--
-- This migration does not copy notes, create stays, alter Flowtel Day logic,
-- change passwords/sessions, or modify Concierge routing and identity rules.
-- Migration 037 is retired and must not be rerun.

create index if not exists flowtel_stays_unread_concierge_notes_idx
  on public.flowtel_stays (client_id, witnessed_at, concierge_notes_read_at)
  where witness_note is not null and trim(witness_note) <> '';

create or replace function public.flowtel_get_my_unread_concierge_notes()
returns table (
  id uuid,
  client_id uuid,
  checkin_date text,
  checked_in_at timestamptz,
  witness_note text,
  witness_note_by text,
  witnessed_at timestamptz,
  updated_at timestamptz,
  concierge_notes_read_signature text,
  concierge_notes_read_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'You must be signed in to receive Concierge notes.' using errcode = '28000';
  end if;

  return query
  select
    s.id,
    s.client_id,
    s.checkin_date::text,
    s.checked_in_at,
    s.witness_note,
    s.witness_note_by,
    s.witnessed_at,
    s.updated_at,
    s.concierge_notes_read_signature,
    s.concierge_notes_read_at
  from public.flowtel_stays s
  where s.client_id = v_user_id
    and nullif(trim(coalesce(s.witness_note, '')), '') is not null
    and (
      nullif(trim(coalesce(s.concierge_notes_read_signature, '')), '') is null
      or s.concierge_notes_read_at is null
      or coalesce(s.witnessed_at, s.updated_at, s.checked_in_at) > s.concierge_notes_read_at
    )
  order by
    coalesce(s.witnessed_at, s.updated_at, s.checked_in_at) asc nulls first,
    s.checkin_date asc,
    s.id asc;
end;
$$;

revoke all on function public.flowtel_get_my_unread_concierge_notes() from public;
grant execute on function public.flowtel_get_my_unread_concierge_notes() to authenticated;

comment on function public.flowtel_get_my_unread_concierge_notes() is
  'Returns only the authenticated guest''s own note-bearing stays that have not been received or have received a newer Concierge-note write. Notes remain on their original stays. Added by Flowtel v0.10.53.';

create or replace function public.flowtel_mark_concierge_note_received(
  p_stay_id uuid,
  p_signature text
)
returns public.flowtel_stays
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_updated public.flowtel_stays%rowtype;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to receive a Concierge note.' using errcode = '28000';
  end if;

  if p_stay_id is null then
    raise exception 'The original Flowtel stay is required.' using errcode = '22023';
  end if;

  if nullif(trim(coalesce(p_signature, '')), '') is null then
    raise exception 'The Concierge-note signature is required.' using errcode = '22023';
  end if;

  update public.flowtel_stays s
  set concierge_notes_read_signature = p_signature,
      concierge_notes_read_at = v_now,
      updated_at = v_now
  where s.id = p_stay_id
    and s.client_id = v_user_id
    and nullif(trim(coalesce(s.witness_note, '')), '') is not null
  returning s.* into v_updated;

  if v_updated.id is null then
    raise exception 'Concierge note not found for this authenticated guest.' using errcode = 'P0002';
  end if;

  return v_updated;
end;
$$;

revoke all on function public.flowtel_mark_concierge_note_received(uuid, text) from public;
grant execute on function public.flowtel_mark_concierge_note_received(uuid, text) to authenticated;

comment on function public.flowtel_mark_concierge_note_received(uuid, text) is
  'Marks a Concierge note received on the authenticated guest''s original stay without moving, copying, or rewriting the note. Added by Flowtel v0.10.53.';
