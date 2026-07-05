-- Flowtel Release 0.8.3
-- Turndown completion RPC hardening.
--
-- Purpose:
-- The browser-side direct update can be blocked by RLS, missing columns, or schema drift.
-- This migration installs one dedicated, authenticated Concierge action for completing
-- Turndown Service. It keeps the security check in the database and gives the UI a
-- reliable single action to call.

-- Recreate the Concierge role helper defensively so this migration can be run safely
-- after, or in place of, earlier beta RLS migrations.
create or replace function public.flowtel_current_user_is_concierge()
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

grant execute on function public.flowtel_current_user_is_concierge() to authenticated;

-- Make sure the completion/note fields exist before the RPC is created.
alter table public.flowtel_stays
  add column if not exists witnessed_by uuid references public.profiles(id) on delete set null,
  add column if not exists witnessed_at timestamptz,
  add column if not exists witness_note text,
  add column if not exists witness_note_by text,
  add column if not exists turndown_completed_at timestamptz,
  add column if not exists turndown_completed_by uuid references public.profiles(id) on delete set null,
  add column if not exists turndown_completed_by_name text;

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
  v_is_concierge boolean := false;
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

  select public.flowtel_current_user_is_concierge() into v_is_concierge;
  if not coalesce(v_is_concierge, false) then
    raise exception 'Only Concierge team members can complete Turndown Service.' using errcode = '42501';
  end if;

  select *
    into v_existing
    from public.flowtel_stays
    where id = p_stay_id
    for update;

  if not found then
    raise exception 'Flowtel stay not found.' using errcode = 'P0002';
  end if;

  select first_name, last_name, email, role
    into v_profile_first_name, v_profile_last_name, v_profile_email, v_profile_role
    from public.profiles
    where id = v_user_id;

  v_label := trim(
    concat(
      case when v_profile_role = 'practitioner' then 'Practitioner ' else 'Concierge ' end,
      nullif(trim(concat(coalesce(v_profile_first_name, ''), ' ', coalesce(v_profile_last_name, ''))), '')
    )
  );

  if v_label is null or v_label = '' then
    v_label := coalesce(v_profile_email, 'Your Concierge');
  end if;

  -- Preserve existing notes. If an older note is plain text instead of JSON, wrap it as
  -- a legacy note so the guest-facing Concierge Notes card still has a readable log.
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
  'Completes a Turndown request from the Concierge Desk and appends the optional Concierge Note. Used by Flowtel v0.8.3.';
