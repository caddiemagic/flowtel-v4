-- DRAFT ONLY; NOT APPLIED. Requires migration 085 and security review.
-- Actual initiation start date is independent of the first-of-month Vortex calendar key.
-- The future-self letter is private and is opened again in initiation 13.
create table if not exists public.flowtel_13_moons_future_letters (
  user_id uuid primary key references auth.users(id) on delete cascade,
  initiation_start_date date not null,
  letter_date date not null,
  letter_text text not null default '',
  sealed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint letter_length check (char_length(letter_text) <= 20000)
);
alter table public.flowtel_13_moons_future_letters enable row level security;
revoke all on public.flowtel_13_moons_future_letters from anon, authenticated;
grant select on public.flowtel_13_moons_future_letters to authenticated;
drop policy if exists "13 moons read own future letter" on public.flowtel_13_moons_future_letters;
create policy "13 moons read own future letter"
on public.flowtel_13_moons_future_letters for select to authenticated
using (user_id=auth.uid() and (
  exists (select 1 from public.flowtel_13_moons_entitlements e
    where e.user_id=auth.uid() and e.access_granted)
  or exists (select 1 from public.profiles p where p.id=auth.uid()
    and (p.membership_rank>=2 or p.membership_type in ('flowfm','council')))
));
-- No direct writes from browsers. A later audited SECURITY DEFINER RPC must:
-- 1. verify current membership and ownership using auth.uid();
-- 2. establish the actual start date once, using Flowtel Time, and never silently change it;
-- 3. compute letter_date as start_date + interval '13 months' (last-day clamp);
-- 4. save a draft or explicitly seal the letter, disallowing later changes to sealed text;
-- 5. let the owner read their own letter in Lesson 13 and retain their history.
-- Important: this draft's SELECT policy permits owners to read their own letter
-- before Lesson 13; delayed reveal is a separate product decision, not implemented.
