-- Flowtel v0.10.49 — Personal Room Keys + Secure Remembered Entry
--
-- Adds a profile marker for the one-time private-password doorway. Passwords
-- remain inside Supabase Auth; this table stores only the completion timestamp.
--
-- IMPORTANT: do not rerun migration 037 after members create personal passwords.
-- Migration 037 intentionally reset beta passwords and is now retired.

alter table public.profiles
  add column if not exists password_setup_completed_at timestamptz;

comment on column public.profiles.password_setup_completed_at is
  'Timestamp when this member replaced the temporary Flowtel beta password with a private password. The password itself remains in Supabase Auth.';

-- Owner/admin accounts keep their existing private credentials and do not need
-- to pass through the beta password-creation doorway.
update public.profiles
set password_setup_completed_at = coalesce(password_setup_completed_at, now())
where lower(coalesce(role, 'client')) in ('admin', 'owner')
   or lower(coalesce(email, '')) = 'mm.johnson@icloud.com'
   or lower(coalesce(email, '')) like '%@test.local';

create or replace function public.flowtel_complete_password_setup()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to create a private Flowtel room key.' using errcode = '28000';
  end if;

  update public.profiles p
  set password_setup_completed_at = now()
  where p.id = v_user_id
  returning p.* into v_profile;

  if v_profile.id is null then
    raise exception 'No Flowtel profile exists for this authenticated member.' using errcode = 'P0002';
  end if;

  return v_profile;
end;
$$;

revoke all on function public.flowtel_complete_password_setup() from public;
grant execute on function public.flowtel_complete_password_setup() to authenticated;
