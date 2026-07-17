-- Caddie Magic v0.1.0 — Moon Score Tracker Foundation
-- Purpose:
-- 1. Create the Caddie Magic player profile foundation.
-- 2. Store simple round logs: date, course, score, swing thoughts, and moon tags.
-- 3. Prepare Notes Under the Door for future Caddie Master review.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.caddie_magic_player_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  first_name text not null,
  last_name text,
  home_course text,
  handicap_or_score_range text,
  main_goal text,
  biggest_frustration text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

comment on table public.caddie_magic_player_profiles is
  'Caddie Magic player locker profiles. One row per authenticated player.';
comment on column public.caddie_magic_player_profiles.handicap_or_score_range is
  'Loose self-described skill signal for early beta; not used for matching yet.';

create table if not exists public.caddie_magic_round_logs (
  id uuid primary key default gen_random_uuid(),
  player_profile_id uuid not null references public.caddie_magic_player_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  round_date date not null,
  course_played text not null,
  score integer not null check (score between 1 and 300),
  swing_thoughts text not null,
  moon_phase text,
  moon_day integer check (moon_day is null or moon_day between 1 and 60),
  moon_inner_season text,
  moon_last_new_moon_date date,
  moon_next_new_moon_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.caddie_magic_round_logs is
  'Simple score tracker entries for Caddie Magic: score, course, swing thoughts, and moon data.';
comment on column public.caddie_magic_round_logs.moon_phase is
  'Auto-tagged client-side from shared Moon Magic logic at the time of entry.';
comment on column public.caddie_magic_round_logs.moon_day is
  'Auto-tagged client-side moon day for the selected round date.';

create table if not exists public.caddie_magic_player_notes (
  id uuid primary key default gen_random_uuid(),
  player_profile_id uuid not null references public.caddie_magic_player_profiles(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  note_title text,
  note_body text not null,
  is_visible_to_player boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.caddie_magic_player_notes is
  'Caddie Master notes under the door for player review. Admin authoring UI is deferred to Caddie Magic v0.2.';

create index if not exists caddie_magic_player_profiles_user_idx
  on public.caddie_magic_player_profiles (user_id);

create index if not exists caddie_magic_round_logs_player_date_idx
  on public.caddie_magic_round_logs (player_profile_id, round_date desc, created_at desc);

create index if not exists caddie_magic_round_logs_moon_phase_idx
  on public.caddie_magic_round_logs (moon_phase)
  where moon_phase is not null;

create index if not exists caddie_magic_player_notes_player_visible_idx
  on public.caddie_magic_player_notes (player_profile_id, is_visible_to_player, created_at desc);

create or replace function public.caddie_magic_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists caddie_magic_player_profiles_set_updated_at on public.caddie_magic_player_profiles;
create trigger caddie_magic_player_profiles_set_updated_at
  before update on public.caddie_magic_player_profiles
  for each row execute function public.caddie_magic_set_updated_at();

drop trigger if exists caddie_magic_round_logs_set_updated_at on public.caddie_magic_round_logs;
create trigger caddie_magic_round_logs_set_updated_at
  before update on public.caddie_magic_round_logs
  for each row execute function public.caddie_magic_set_updated_at();

drop trigger if exists caddie_magic_player_notes_set_updated_at on public.caddie_magic_player_notes;
create trigger caddie_magic_player_notes_set_updated_at
  before update on public.caddie_magic_player_notes
  for each row execute function public.caddie_magic_set_updated_at();

alter table public.caddie_magic_player_profiles enable row level security;
alter table public.caddie_magic_round_logs enable row level security;
alter table public.caddie_magic_player_notes enable row level security;

-- Player locker profiles: players manage their own; Flowtel admins/owners may read all for future review.
drop policy if exists "Players can read their Caddie Magic profile" on public.caddie_magic_player_profiles;
create policy "Players can read their Caddie Magic profile"
  on public.caddie_magic_player_profiles
  for select
  using (user_id = auth.uid() or public.flowtel_current_user_is_admin_or_owner());

drop policy if exists "Players can create their Caddie Magic profile" on public.caddie_magic_player_profiles;
create policy "Players can create their Caddie Magic profile"
  on public.caddie_magic_player_profiles
  for insert
  with check (user_id = auth.uid());

drop policy if exists "Players can update their Caddie Magic profile" on public.caddie_magic_player_profiles;
create policy "Players can update their Caddie Magic profile"
  on public.caddie_magic_player_profiles
  for update
  using (user_id = auth.uid() or public.flowtel_current_user_is_admin_or_owner())
  with check (user_id = auth.uid() or public.flowtel_current_user_is_admin_or_owner());

-- Round logs: players manage their own; admins/owners can read all for pattern review.
drop policy if exists "Players can read their Caddie Magic round logs" on public.caddie_magic_round_logs;
create policy "Players can read their Caddie Magic round logs"
  on public.caddie_magic_round_logs
  for select
  using (user_id = auth.uid() or public.flowtel_current_user_is_admin_or_owner());

drop policy if exists "Players can create their Caddie Magic round logs" on public.caddie_magic_round_logs;
create policy "Players can create their Caddie Magic round logs"
  on public.caddie_magic_round_logs
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.caddie_magic_player_profiles p
      where p.id = player_profile_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "Players can update their Caddie Magic round logs" on public.caddie_magic_round_logs;
create policy "Players can update their Caddie Magic round logs"
  on public.caddie_magic_round_logs
  for update
  using (user_id = auth.uid() or public.flowtel_current_user_is_admin_or_owner())
  with check (user_id = auth.uid() or public.flowtel_current_user_is_admin_or_owner());

-- Notes Under the Door: players read visible notes for their profile; admins/owners manage notes.
drop policy if exists "Players can read visible Caddie Magic notes" on public.caddie_magic_player_notes;
create policy "Players can read visible Caddie Magic notes"
  on public.caddie_magic_player_notes
  for select
  using (
    public.flowtel_current_user_is_admin_or_owner()
    or (
      is_visible_to_player = true
      and exists (
        select 1
        from public.caddie_magic_player_profiles p
        where p.id = player_profile_id
          and p.user_id = auth.uid()
      )
    )
  );

drop policy if exists "Admins can create Caddie Magic notes" on public.caddie_magic_player_notes;
create policy "Admins can create Caddie Magic notes"
  on public.caddie_magic_player_notes
  for insert
  with check (public.flowtel_current_user_is_admin_or_owner());

drop policy if exists "Admins can update Caddie Magic notes" on public.caddie_magic_player_notes;
create policy "Admins can update Caddie Magic notes"
  on public.caddie_magic_player_notes
  for update
  using (public.flowtel_current_user_is_admin_or_owner())
  with check (public.flowtel_current_user_is_admin_or_owner());

drop policy if exists "Admins can delete Caddie Magic notes" on public.caddie_magic_player_notes;
create policy "Admins can delete Caddie Magic notes"
  on public.caddie_magic_player_notes
  for delete
  using (public.flowtel_current_user_is_admin_or_owner());

grant select, insert, update on public.caddie_magic_player_profiles to authenticated;
grant select, insert, update on public.caddie_magic_round_logs to authenticated;
grant select, insert, update, delete on public.caddie_magic_player_notes to authenticated;
grant execute on function public.caddie_magic_set_updated_at() to authenticated;

notify pgrst, 'reload schema';
