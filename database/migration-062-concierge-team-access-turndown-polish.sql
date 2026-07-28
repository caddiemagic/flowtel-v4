-- Flowtel v0.10.78 — Concierge Team Access + Turndown Polish
--
-- Purpose:
-- 1. Keep the existing owner Concierge authority owner-only.
-- 2. Let the Flowtel owner manually grant approved practitioners access to the
--    existing Concierge Desk's Team Rooms through concierge_access_enabled.
-- 3. Scope practitioner stay/profile visibility to current-day Turndown requests
--    in the wing opposite the practitioner's own current Flowtel stay.
-- 4. Allow approved practitioners to complete only those authorized Turndown requests.
--
-- This migration does not delete, rewrite, or broaden owner-only Guest House,
-- Honors, mailbox, membership, or Caddie Master permissions.

begin;

-- The Phase 1 owner helper remains unchanged and continues to protect owner-only
-- RPCs and administration. This separate helper is only for the Priestess-facing
-- Concierge Team Rooms.
create or replace function public.flowtel_current_user_has_concierge_team_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.flowtel_current_user_is_concierge()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role,'')) = 'practitioner'
        and coalesce(p.concierge_access_enabled,false) = true
    );
$$;

revoke all on function public.flowtel_current_user_has_concierge_team_access() from public;
grant execute on function public.flowtel_current_user_has_concierge_team_access() to authenticated;

comment on function public.flowtel_current_user_has_concierge_team_access() is
  'True for the Phase 1 owner or an explicitly approved practitioner. Does not grant owner administration.';

comment on column public.profiles.concierge_access_enabled is
  'Owner-managed Concierge Desk permission. True for the Phase 1 owner or a manually approved practitioner; audience and data scope remain role-restricted.';

create or replace function public.flowtel_admin_get_concierge_team_access(
  p_member_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_enabled boolean;
begin
  if not public.flowtel_current_user_is_phase_one_owner() then
    raise exception 'Only the Flowtel owner may review Concierge Team access.' using errcode = '42501';
  end if;

  select coalesce(p.concierge_access_enabled,false)
  into v_enabled
  from public.profiles p
  where p.id = p_member_id;

  if not found then
    raise exception 'Flowtel member not found.' using errcode = 'P0002';
  end if;

  return v_enabled;
end;
$$;

revoke all on function public.flowtel_admin_get_concierge_team_access(uuid) from public;
grant execute on function public.flowtel_admin_get_concierge_team_access(uuid) to authenticated;

create or replace function public.flowtel_admin_set_concierge_team_access(
  p_member_id uuid,
  p_enabled boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_email text;
begin
  if not public.flowtel_current_user_is_phase_one_owner() then
    raise exception 'Only the Flowtel owner may change Concierge Team access.' using errcode = '42501';
  end if;

  select lower(coalesce(p.role,'')), lower(coalesce(p.email,''))
  into v_role, v_email
  from public.profiles p
  where p.id = p_member_id
  for update;

  if not found then
    raise exception 'Flowtel member not found.' using errcode = 'P0002';
  end if;

  if v_email = 'mm.johnson@icloud.com' then
    raise exception 'The owner Concierge permission is permanent and is not managed from the Priestess Team profile.' using errcode = '42501';
  end if;

  if v_role <> 'practitioner' then
    raise exception 'Concierge Team access may be granted only to an approved practitioner.' using errcode = '42501';
  end if;

  update public.profiles
  set concierge_access_enabled = coalesce(p_enabled,false),
      updated_at = now()
  where id = p_member_id;

  return coalesce(p_enabled,false);
end;
$$;

revoke all on function public.flowtel_admin_set_concierge_team_access(uuid, boolean) from public;
grant execute on function public.flowtel_admin_set_concierge_team_access(uuid, boolean) to authenticated;

comment on function public.flowtel_admin_set_concierge_team_access(uuid, boolean) is
  'Owner-only manual grant/pause control for the existing Concierge Desk Team Rooms.';

-- A practitioner serves the wing opposite the wing of her own current Flowtel stay.
create or replace function public.flowtel_current_user_assigned_concierge_wing()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_own_wing text;
begin
  if auth.uid() is null then
    return null;
  end if;

  select s.wing
  into v_own_wing
  from public.flowtel_stays s
  where s.client_id = auth.uid()
    and s.checkin_date::date = (timezone('America/Los_Angeles',now()))::date
    and s.checked_out_at is null
  order by s.checked_in_at desc nulls last, s.created_at desc nulls last, s.id desc
  limit 1;

  return case lower(trim(coalesce(v_own_wing,'')))
    when 'east wing' then 'West Wing'
    when 'west wing' then 'East Wing'
    when 'north wing' then 'South Wing'
    when 'south wing' then 'North Wing'
    else null
  end;
end;
$$;

revoke all on function public.flowtel_current_user_assigned_concierge_wing() from public;
grant execute on function public.flowtel_current_user_assigned_concierge_wing() to authenticated;

create or replace function public.flowtel_current_user_can_tend_stay(
  p_stay_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_assigned_wing text;
begin
  if public.flowtel_current_user_is_concierge() then
    return true;
  end if;

  if not public.flowtel_current_user_has_concierge_team_access() then
    return false;
  end if;

  v_assigned_wing := public.flowtel_current_user_assigned_concierge_wing();
  if v_assigned_wing is null then
    return false;
  end if;

  return exists (
    select 1
    from public.flowtel_stays s
    where s.id = p_stay_id
      and s.checkin_date::date = (timezone('America/Los_Angeles',now()))::date
      and lower(trim(coalesce(s.wing,''))) = lower(trim(v_assigned_wing))
      and (
        s.turndown_requested_at is not null
        or lower(coalesce(s.turndown_status,'')) in ('requested','completed')
      )
  );
end;
$$;

revoke all on function public.flowtel_current_user_can_tend_stay(uuid) from public;
grant execute on function public.flowtel_current_user_can_tend_stay(uuid) to authenticated;

comment on function public.flowtel_current_user_can_tend_stay(uuid) is
  'Owner access is universal; approved practitioners are limited to current-day Turndown requests in their assigned opposite wing.';

alter table public.flowtel_stays enable row level security;

drop policy if exists "Approved Concierge team reads authorized Turndown stays" on public.flowtel_stays;
create policy "Approved Concierge team reads authorized Turndown stays"
  on public.flowtel_stays for select to authenticated
  using (public.flowtel_current_user_can_tend_stay(id));

alter table public.profiles enable row level security;

drop policy if exists "Approved Concierge team reads authorized guest names" on public.profiles;
create policy "Approved Concierge team reads authorized guest names"
  on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or public.flowtel_current_user_is_concierge()
    or (
      public.flowtel_current_user_has_concierge_team_access()
      and exists (
        select 1
        from public.flowtel_stays s
        where s.client_id = profiles.id
          and public.flowtel_current_user_can_tend_stay(s.id)
      )
    )
  );

-- Replace the Turndown completion helper with the latest display-name-aware body,
-- changing only the authorization check to the scoped stay permission above.
create or replace function public.flowtel_complete_turndown(
  p_stay_id uuid,
  p_witness_note text default ''
)
returns public.flowtel_stays
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile_display_name text;
  v_profile_first_name text;
  v_profile_last_name text;
  v_profile_email text;
  v_profile_role text;
  v_label text := 'Your Concierge';
  v_existing public.flowtel_stays%rowtype;
  v_now timestamptz := now();
  v_note_text text := nullif(trim(coalesce(p_witness_note, '')), '');
  v_notes jsonb := '[]'::jsonb;
  v_updated public.flowtel_stays%rowtype;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to complete Turndown Service.' using errcode = '28000';
  end if;

  if not public.flowtel_current_user_can_tend_stay(p_stay_id) then
    raise exception 'This Turndown request is not assigned to your Concierge access.' using errcode = '42501';
  end if;

  select *
  into v_existing
  from public.flowtel_stays
  where id = p_stay_id
  for update;

  if not found then
    raise exception 'Flowtel stay not found.' using errcode = 'P0002';
  end if;

  select display_name, first_name, last_name, email, role
  into v_profile_display_name, v_profile_first_name, v_profile_last_name, v_profile_email, v_profile_role
  from public.profiles
  where id = v_user_id;

  v_label := trim(
    concat(
      case when lower(coalesce(v_profile_role,'')) = 'practitioner' then 'Practitioner ' else 'Concierge ' end,
      public.flowtel_resolve_display_name(
        v_profile_display_name,
        v_profile_first_name,
        v_profile_last_name,
        v_profile_email,
        'Your Concierge'
      )
    )
  );

  if v_existing.witness_note is not null and trim(v_existing.witness_note) <> '' then
    begin
      v_notes := v_existing.witness_note::jsonb;
      if jsonb_typeof(v_notes) <> 'array' then
        v_notes := jsonb_build_array(v_notes);
      end if;
    exception when others then
      v_notes := jsonb_build_array(
        jsonb_build_object(
          'id', 'legacy-' || extract(epoch from v_now)::text,
          'note', v_existing.witness_note,
          'by', coalesce(v_existing.witness_note_by, 'Your Concierge'),
          'at', coalesce(v_existing.witnessed_at, v_existing.updated_at, v_now)::text
        )
      );
    end;
  end if;

  if v_note_text is not null then
    v_notes := v_notes || jsonb_build_array(
      jsonb_build_object(
        'id', 'note-' || replace(v_now::text, ' ', 'T'),
        'note', v_note_text,
        'by', v_label,
        'at', v_now::text
      )
    );
  end if;

  update public.flowtel_stays
  set turndown_status = 'completed',
      turndown_completed_at = v_now,
      turndown_completed_by = v_user_id,
      turndown_completed_by_name = v_label,
      witnessed_by = v_user_id,
      witnessed_at = v_now,
      witness_note = v_notes::text,
      witness_note_by = v_label,
      stay_status = case
        when public.flowtel_stays.stay_status = 'checked_out' then public.flowtel_stays.stay_status
        else 'witnessed'
      end,
      updated_at = v_now
  where id = p_stay_id
  returning * into v_updated;

  return v_updated;
end;
$$;

revoke all on function public.flowtel_complete_turndown(uuid, text) from public;
grant execute on function public.flowtel_complete_turndown(uuid, text) to authenticated;

comment on function public.flowtel_complete_turndown(uuid, text) is
  'Completes an owner-authorized or assigned-practitioner Turndown request and appends the optional Concierge Note.';

commit;
