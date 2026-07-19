-- Caddie Magic v0.1.8 — Reflections + Collective Swing Map
-- Purpose:
-- 1. Make swing thoughts optional when logging a scored round.
-- 2. Allow thought-only reflection entries without course or score.
-- 3. Provide an authenticated anonymous collective Swing Map feed.

alter table public.caddie_magic_round_logs
  add column if not exists entry_type text not null default 'round',
  add column if not exists share_anonymously boolean not null default true;

update public.caddie_magic_round_logs
set entry_type = 'round'
where entry_type is null or entry_type not in ('round', 'reflection');

alter table public.caddie_magic_round_logs
  alter column course_played drop not null,
  alter column score drop not null,
  alter column swing_thoughts drop not null;

alter table public.caddie_magic_round_logs
  drop constraint if exists caddie_magic_round_logs_entry_type_check;

alter table public.caddie_magic_round_logs
  add constraint caddie_magic_round_logs_entry_type_check
  check (
    (
      entry_type = 'round'
      and nullif(btrim(course_played), '') is not null
      and score is not null
    )
    or
    (
      entry_type = 'reflection'
      and nullif(btrim(swing_thoughts), '') is not null
    )
  );

comment on column public.caddie_magic_round_logs.entry_type is
  'round = scored golf round; reflection = thought-only entry with no course or score required.';
comment on column public.caddie_magic_round_logs.share_anonymously is
  'When true, a non-empty swing thought may appear without identity on the Collective Swing Map.';

create index if not exists caddie_magic_collective_swing_map_idx
  on public.caddie_magic_round_logs (moon_last_new_moon_date desc, moon_phase, created_at desc)
  where share_anonymously = true and nullif(btrim(swing_thoughts), '') is not null;

create or replace function public.caddie_magic_get_collective_swing_thoughts(
  p_moon_cycle_start date default null,
  p_moon_phase text default null
)
returns table (
  entry_id uuid,
  moon_day integer,
  moon_phase text,
  moon_cycle_start_date date,
  swing_thought text,
  reflected_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to open the Collective Swing Map.' using errcode = '28000';
  end if;

  return query
  select
    l.id as entry_id,
    l.moon_day,
    l.moon_phase,
    l.moon_last_new_moon_date as moon_cycle_start_date,
    btrim(l.swing_thoughts) as swing_thought,
    coalesce(l.created_at, l.updated_at) as reflected_at
  from public.caddie_magic_round_logs l
  where l.share_anonymously = true
    and nullif(btrim(l.swing_thoughts), '') is not null
    and (p_moon_cycle_start is null or l.moon_last_new_moon_date = p_moon_cycle_start)
    and (p_moon_phase is null or l.moon_phase = p_moon_phase)
  order by coalesce(l.created_at, l.updated_at) desc
  limit 1000;
end;
$$;

grant execute on function public.caddie_magic_get_collective_swing_thoughts(date, text) to authenticated;

notify pgrst, 'reload schema';
