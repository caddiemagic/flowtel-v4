-- DRAFT ONLY; requires migration 085. Do not apply without staged RLS tests.
-- Register the actual initiation day only once, in Flowtel Time.
create table if not exists public.flowtel_13_moons_starts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 initiation_start_date date not null,
 created_at timestamptz not null default now()
);
alter table public.flowtel_13_moons_starts enable row level security;
revoke all on public.flowtel_13_moons_starts from anon,authenticated;
grant select on public.flowtel_13_moons_starts to authenticated;
drop policy if exists thirteen_moons_start_owner_read on public.flowtel_13_moons_starts;
create policy thirteen_moons_start_owner_read on public.flowtel_13_moons_starts
for select to authenticated using(user_id=auth.uid());
create or replace function public.flowtel_begin_13_moons()
returns date language plpgsql security definer set search_path=public as $$
declare v_uid uuid := auth.uid(); v_day date;
begin
 if v_uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if not (
   exists(select 1 from public.flowtel_13_moons_entitlements e where e.user_id=v_uid and e.access_granted)
   or exists(select 1 from public.profiles p where p.id=v_uid and
    (p.membership_rank>=2 or lower(p.membership_type) in ('flowfm','council')))
 ) then raise exception '13 Moons access required' using errcode='42501'; end if;
 insert into public.flowtel_13_moons_starts(user_id,initiation_start_date)
 values (v_uid,(now() at time zone 'America/Los_Angeles')::date)
 on conflict(user_id) do nothing;
 select initiation_start_date into v_day from public.flowtel_13_moons_starts where user_id=v_uid;
 return v_day;
end;
$$;
revoke all on function public.flowtel_begin_13_moons() from public,anon;
grant execute on function public.flowtel_begin_13_moons() to authenticated;
