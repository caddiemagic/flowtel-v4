-- Flowtel Release 0.8.1
-- Suite personalization + Concierge profile visibility + Turndown completion polish.
--
-- Purpose:
-- 1. Let Concierge users read guest profile names for queue labels.
-- 2. Add helpful indexes for active/completed Turndown views.
-- 3. Preserve guest privacy by keeping broader Concierge access limited to profiles only when
--    the signed-in user is a practitioner/admin/owner.

-- The helper function flowtel_current_user_is_concierge() is created in migration 010.
-- Recreate defensively in case this migration is run independently.
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

-- Practitioners/admins/owners need profile names for the Concierge Desk guest queue.
-- Without this, Supabase joins can return null profile objects and the UI falls back to "Guest".
alter table public.profiles enable row level security;

drop policy if exists "Concierge team can read guest profile names" on public.profiles;
create policy "Concierge team can read guest profile names"
  on public.profiles for select
  using (auth.uid() = id or public.flowtel_current_user_is_concierge());

-- Helpful indexes for separating active and completed Turndown requests.
create index if not exists flowtel_stays_turndown_status_date_idx
  on public.flowtel_stays (checkin_date, turndown_status, witnessed_at, wing);

create index if not exists flowtel_stays_witnessed_at_idx
  on public.flowtel_stays (witnessed_at)
  where witnessed_at is not null;

comment on policy "Concierge team can read guest profile names" on public.profiles is
  'Allows Concierge users to resolve guest names in the desk queues instead of falling back to Guest.';
