-- Caddie Magic v0.4.2 — Player Invitation Code Hotfix
--
-- Purpose:
-- Repair player invitation creation on Supabase projects where pgcrypto is
-- installed in the extensions schema and gen_random_bytes() is therefore not
-- available through the function's restricted search_path.
--
-- This migration is safe to run after migration 044. It only replaces the
-- invitation creation function and does not alter existing invitations,
-- product access rows, player profiles, or Flowtel data.

create or replace function public.caddie_magic_create_player_invitation(
  p_email text,
  p_first_name text default null,
  p_last_name text default null,
  p_expires_at timestamptz default null
)
returns public.caddie_magic_player_invitations
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text := lower(trim(coalesce(p_email,'')));
  v_invite public.caddie_magic_player_invitations%rowtype;
  v_invite_code text;
begin
  if not public.flowtel_current_user_is_admin_or_owner() then
    raise exception 'Owner access is required to invite Caddie Magic players.' using errcode = '42501';
  end if;

  if v_email = '' or position('@' in v_email) = 0 then
    raise exception 'Enter a valid player email.' using errcode = '22023';
  end if;

  -- Two UUIDs provide 144 bits of random invitation-code material without
  -- depending on pgcrypto function schema visibility.
  v_invite_code :=
    replace(gen_random_uuid()::text, '-', '')
    || left(replace(gen_random_uuid()::text, '-', ''), 4);

  update public.caddie_magic_player_invitations
  set status = 'revoked', updated_at = now()
  where lower(email) = v_email and status = 'invited';

  insert into public.caddie_magic_player_invitations (
    email,
    first_name,
    last_name,
    invite_code,
    status,
    invited_by,
    expires_at
  ) values (
    v_email,
    nullif(trim(coalesce(p_first_name,'')),''),
    nullif(trim(coalesce(p_last_name,'')),''),
    v_invite_code,
    'invited',
    auth.uid(),
    p_expires_at
  ) returning * into v_invite;

  return v_invite;
end;
$$;

revoke all on function public.caddie_magic_create_player_invitation(text,text,text,timestamptz) from public;
grant execute on function public.caddie_magic_create_player_invitation(text,text,text,timestamptz) to authenticated;
