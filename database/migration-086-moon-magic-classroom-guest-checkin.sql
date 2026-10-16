-- Oct 16 Moon Magic 101 guest check-in enhancement.
-- Reuse existing class entries without creating Guest House or Queendom accounts.
-- Names and contact emails are strictly server-access-only, never public browser tables.
alter table public.flowtel_moon_magic_class_entries
  add column if not exists guest_name text,
  add column if not exists email text,
  add column if not exists show_first_name boolean not null default false,
  add column if not exists email_updates_opt_in boolean not null default false;

alter table public.flowtel_moon_magic_class_entries
  add constraint moon_magic_guest_name_length
    check (guest_name is null or char_length(guest_name) between 1 and 100),
  add constraint moon_magic_email_length
    check (email is null or char_length(email) between 3 and 320);

comment on table public.flowtel_moon_magic_class_entries is
  'Opt-in classroom guest list and cycle position. Names and unverified contact emails are private to Flowtel owner; projection shows first names only by explicit choice.';
comment on column public.flowtel_moon_magic_class_entries.email is
  'Unverified contact address supplied at classroom check-in. Email invitations require separate explicit opt in.';
revoke all on public.flowtel_moon_magic_class_entries from anon, authenticated;
alter table public.flowtel_moon_magic_class_entries enable row level security;
notify pgrst, 'reload schema';
