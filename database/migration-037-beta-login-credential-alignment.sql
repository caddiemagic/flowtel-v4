-- Flowtel v0.10.48 — Beta Login Credential Alignment
--
-- Resets all profile-linked NON-admin beta accounts to the canonical shared
-- temporary password: FlowtelBeta!2026
--
-- Admin and owner accounts are deliberately excluded so this migration cannot
-- overwrite Megan's private owner credentials. Re-running this migration will
-- reset the included beta accounts to the same temporary password again.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
set search_path = public, extensions, auth;

do $$
declare
  v_reset_count integer := 0;
begin
  update auth.users as u
  set
    encrypted_password = crypt(
      'FlowtelBeta!2026',
      gen_salt('bf', 10)
    ),
    email_confirmed_at = coalesce(u.email_confirmed_at, now()),
    updated_at = now(),
    raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object('flowtel_beta_access', true)
  from public.profiles as p
  where p.id = u.id
    and lower(coalesce(p.role, 'client')) not in ('admin', 'owner')
    and lower(coalesce(u.email, '')) <> 'mm.johnson@icloud.com';

  get diagnostics v_reset_count = row_count;
  raise notice 'Flowtel beta password aligned for % non-admin account(s).', v_reset_count;
end
$$;

reset search_path;
