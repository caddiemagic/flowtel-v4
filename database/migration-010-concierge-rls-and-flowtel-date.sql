-- Flowtel Release 0.8.0
-- Concierge RLS repair + Flowtel Day integrity.
--
-- Purpose:
-- 1. Let practitioners/admins/owners see the stays needed by the Concierge Desk.
-- 2. Let practitioners/admins/owners complete Turndown Service and leave Concierge Notes.
-- 3. Keep guests limited to their own stays.
-- 4. Add an optional one-stay-per-Flowtel-Day guard.

-- Helpful indexes for the Concierge Desk.
create index if not exists flowtel_stays_client_checkin_idx
  on public.flowtel_stays (client_id, checkin_date desc);

create index if not exists flowtel_stays_open_flowtel_date_idx
  on public.flowtel_stays (checkin_date, checked_out_at, stay_status, wing);

create index if not exists flowtel_stays_concierge_queue_idx
  on public.flowtel_stays (wing, turndown_status, turndown_requested_at, witnessed_at, checked_out_at)
  where turndown_status = 'requested' or turndown_requested_at is not null;

-- Enforce the product rule when the existing data is clean.
-- If this fails because beta data already has duplicates, resolve duplicates first, then rerun this line.
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'flowtel_stays_one_stay_per_flowtel_day_idx'
  ) then
    begin
      create unique index flowtel_stays_one_stay_per_flowtel_day_idx
        on public.flowtel_stays (client_id, checkin_date);
    exception
      when unique_violation then
        raise notice 'Duplicate client_id/checkin_date rows exist. Clean beta duplicates, then create flowtel_stays_one_stay_per_flowtel_day_idx.';
    end;
  end if;
end $$;

-- Role helper used by RLS policies.
-- SECURITY DEFINER keeps this check stable even when profiles RLS is restrictive.
create or replace function public.flowtel_current_user_is_concierge()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('practitioner','admin','owner')
  );
$$;

grant execute on function public.flowtel_current_user_is_concierge() to authenticated;

-- Keep RLS enabled and make the Concierge Desk able to do its job.
alter table public.flowtel_stays enable row level security;

-- Guests can read their own stays.
drop policy if exists "Guests can read their own Flowtel stays" on public.flowtel_stays;
create policy "Guests can read their own Flowtel stays"
  on public.flowtel_stays for select
  using (auth.uid() = client_id);

-- Guests can create their own stays.
drop policy if exists "Guests can create their own Flowtel stays" on public.flowtel_stays;
create policy "Guests can create their own Flowtel stays"
  on public.flowtel_stays for insert
  with check (auth.uid() = client_id);

-- Guests can update their own stays for reflections, checkout, turndown request, and read state.
drop policy if exists "Guests can update their own Flowtel stays" on public.flowtel_stays;
create policy "Guests can update their own Flowtel stays"
  on public.flowtel_stays for update
  using (auth.uid() = client_id)
  with check (auth.uid() = client_id);

-- Practitioners, admins, and owners can read stays for the Concierge Desk.
drop policy if exists "Concierge team can read Flowtel stays" on public.flowtel_stays;
create policy "Concierge team can read Flowtel stays"
  on public.flowtel_stays for select
  using (public.flowtel_current_user_is_concierge());

-- Practitioners, admins, and owners can update stays to complete turndown, cleanse rooms, and append notes.
drop policy if exists "Concierge team can update Flowtel stays" on public.flowtel_stays;
create policy "Concierge team can update Flowtel stays"
  on public.flowtel_stays for update
  using (public.flowtel_current_user_is_concierge())
  with check (public.flowtel_current_user_is_concierge());
