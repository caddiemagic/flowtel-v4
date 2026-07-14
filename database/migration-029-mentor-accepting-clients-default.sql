-- Flowtel v0.10.31 — mentor_accepting_clients default safety
-- Practitioner role and accepting-clients status should be explicit.

alter table public.profiles
  add column if not exists mentor_accepting_clients boolean;

alter table public.profiles
  alter column mentor_accepting_clients set default false;

update public.profiles
set mentor_accepting_clients = false
where coalesce(mentor_accepting_clients, false) = true
  and lower(coalesce(role, '')) not in ('admin', 'owner');

comment on column public.profiles.mentor_accepting_clients is
  'Whether this profile is explicitly accepting Mentor to the Moon/client connections. Defaults false; set true intentionally for approved mentors.';

notify pgrst, 'reload schema';
