-- Release 0.7.4 — Stay logic and hospitality polish
-- Persistent concierge note read state.

alter table public.flowtel_stays
  add column if not exists concierge_notes_read_signature text,
  add column if not exists concierge_notes_read_at timestamptz;

create index if not exists flowtel_stays_concierge_notes_read_idx
  on public.flowtel_stays (client_id, concierge_notes_read_at);

-- Older installs may still have a restrictive stay_status check.
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'flowtel_stays_stay_status_check'
  ) then
    alter table public.flowtel_stays
      drop constraint flowtel_stays_stay_status_check;
  end if;

  alter table public.flowtel_stays
    add constraint flowtel_stays_stay_status_check
    check (stay_status in ('arrived', 'settled', 'witnessed', 'checked_out', 'room_prepared'));
exception
  when duplicate_object then null;
end $$;
