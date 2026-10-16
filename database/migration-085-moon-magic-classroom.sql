-- Moon Magic 101 classroom · separate from queued Mentorship Client Suite changes.
-- Guests participate anonymously after explicit consent. Only the owner sees aggregated positions.
create table if not exists public.flowtel_moon_magic_class_entries (
  room_slug text not null,
  guest_token uuid not null,
  cycle_day integer,
  tracking_method text not null,
  shared_at timestamptz not null default now(),
  primary key (room_slug, guest_token),
  constraint moon_magic_class_room_check check (room_slug = 'moon-magic-101-2026-10-16'),
  constraint moon_magic_class_day_check check (cycle_day is null or cycle_day between 1 and 120),
  constraint moon_magic_class_method_check check (tracking_method in ('bleed','moon-no-period','moon-unknown-day-1'))
);
comment on table public.flowtel_moon_magic_class_entries is
  'Consented, anonymous classroom wheel positions. No names, emails, start dates, identity, or member records.';
alter table public.flowtel_moon_magic_class_entries enable row level security;
revoke all on public.flowtel_moon_magic_class_entries from anon, authenticated;
create index if not exists flowtel_moon_magic_class_entries_recent
  on public.flowtel_moon_magic_class_entries (shared_at desc);
notify pgrst, 'reload schema';
