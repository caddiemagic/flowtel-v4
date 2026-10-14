-- DEVELOPMENT DRAFT ONLY: do not apply to production without RLS/security review.
-- Separate Womb Magic lesson position from existing Flow Map and journal data.
create table if not exists public.flowtel_13_moons_lesson_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_lesson integer not null default 1 check (current_lesson between 1 and 13),
  completed_lessons integer[] not null default '{}',
  updated_at timestamptz not null default now(),
  constraint completed_lessons_valid check (
    completed_lessons <@ array[1,2,3,4,5,6,7,8,9,10,11,12,13]::integer[]
  )
);
alter table public.flowtel_13_moons_lesson_progress enable row level security;
revoke all on public.flowtel_13_moons_lesson_progress from anon, authenticated;
grant select on public.flowtel_13_moons_lesson_progress to authenticated;
drop policy if exists "13 moons members read own lesson progress" on public.flowtel_13_moons_lesson_progress;
create policy "13 moons members read own lesson progress"
on public.flowtel_13_moons_lesson_progress for select to authenticated
using (user_id=auth.uid() and (
  exists(select 1 from public.flowtel_13_moons_entitlements e where e.user_id=auth.uid() and e.access_granted)
  or exists(select 1 from public.profiles p where p.id=auth.uid() and
    (p.membership_rank>=2 or p.membership_type in ('flowfm','council')))
));
-- Deliberately no direct INSERT, UPDATE, or DELETE rights to authenticated.
-- Trusted completion RPC is a separate, later audited migration.
