alter table public.flowtel_stays
  add column if not exists cycle_day_calculated integer null,
  add column if not exists stay_status text not null default 'arrived',
  add column if not exists stay_end_type text null,
  add column if not exists stay_length_days integer null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'flowtel_stays_stay_status_check'
  ) then
    alter table public.flowtel_stays
      add constraint flowtel_stays_stay_status_check
      check (stay_status in ('arrived', 'settled', 'witnessed', 'checked_out'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'flowtel_stays_stay_end_type_check'
  ) then
    alter table public.flowtel_stays
      add constraint flowtel_stays_stay_end_type_check
      check (stay_end_type is null or stay_end_type in ('manual', 'automatic'));
  end if;
end $$;

create index if not exists flowtel_stays_status_idx
  on public.flowtel_stays (stay_status);

create index if not exists flowtel_stays_checked_in_idx
  on public.flowtel_stays (checked_in_at desc);
