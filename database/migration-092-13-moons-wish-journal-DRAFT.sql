-- DESIGN / SECURITY REVIEW DRAFT ONLY. NOT APPLIED.
-- Append-only observations about one of the 13 calendar positions in a sealed Vortex.
-- Original wishes remain in flowtel_13_moons_vortices.reflections and are NOT modified.
create table if not exists public.flowtel_13_moons_wish_journal (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 moon_position integer not null check (moon_position between 2 and 13),
 entry_text text not null check (length(btrim(entry_text)) between 1 and 4000),
 created_at timestamptz not null default now()
);
create index if not exists flowtel_13_moons_wish_journal_owner_moon
 on public.flowtel_13_moons_wish_journal(user_id,moon_position,created_at desc);
alter table public.flowtel_13_moons_wish_journal enable row level security;
revoke all on public.flowtel_13_moons_wish_journal from anon,authenticated;
grant select on public.flowtel_13_moons_wish_journal to authenticated;
drop policy if exists "wish journal owner select" on public.flowtel_13_moons_wish_journal;
create policy "wish journal owner select" on public.flowtel_13_moons_wish_journal
 for select to authenticated using (user_id=auth.uid() and exists(
 select 1 from public.flowtel_13_moons_vortices v where v.user_id=auth.uid() and v.completed_at is not null
));
-- Deliberately no direct INSERT/UPDATE/DELETE to members.
-- A membership-checked SECURITY DEFINER append RPC, plus tests for RLS
-- and original-wish immutability, must be reviewed before applying.
