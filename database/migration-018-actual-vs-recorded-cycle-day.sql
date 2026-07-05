-- Flowtel Release 0.9.6
-- Actual vs Recorded Cycle Day
--
-- Purpose:
-- 1. Store the guest's recorded check-in day separately from Flowtel's calculated actual cycle day.
-- 2. Preserve compassionate accuracy feedback for the Suite and future dashboards.
-- 3. Store previous cycle length when Day 1 or a late reset implies a new cycle.
-- 4. Keep old columns working: cycle_day_claimed remains the recorded day, and
--    cycle_day_calculated remains the actual day for compatibility.

alter table public.flowtel_stays
  add column if not exists cycle_day_recorded integer,
  add column if not exists cycle_day_actual integer,
  add column if not exists cycle_day_difference integer,
  add column if not exists cycle_day_match_status text,
  add column if not exists cycle_accuracy_message text,
  add column if not exists previous_cycle_length_days integer,
  add column if not exists cycle_reset_type text;

-- Backfill existing stays so dashboards can read both values immediately.
update public.flowtel_stays
set cycle_day_recorded = coalesce(cycle_day_recorded, cycle_day_claimed),
    cycle_day_actual = coalesce(cycle_day_actual, cycle_day_calculated, cycle_day_claimed),
    cycle_day_difference = coalesce(cycle_day_difference, coalesce(cycle_day_claimed, 0) - coalesce(cycle_day_calculated, cycle_day_claimed, 0)),
    cycle_day_match_status = coalesce(
      cycle_day_match_status,
      case
        when coalesce(cycle_day_claimed, 0) = coalesce(cycle_day_calculated, cycle_day_claimed, 0) then 'matched'
        when coalesce(cycle_day_claimed, 0) > coalesce(cycle_day_calculated, cycle_day_claimed, 0) then 'recorded_ahead'
        else 'recorded_behind'
      end
    )
where cycle_day_recorded is null
   or cycle_day_actual is null
   or cycle_day_difference is null
   or cycle_day_match_status is null;

comment on column public.flowtel_stays.cycle_day_recorded is
  'The cycle day entered by the guest at check-in. This is compassionate awareness data.';

comment on column public.flowtel_stays.cycle_day_actual is
  'Flowtel-calculated actual cycle day used as the source of truth for Suite, room, season, guidance, and dashboards.';

comment on column public.flowtel_stays.cycle_day_difference is
  'Recorded day minus actual day. Positive means the guest recorded ahead; negative means recorded behind.';

comment on column public.flowtel_stays.cycle_accuracy_message is
  'Guest-facing compassionate accuracy copy shown after check-in and in the Cycle Data pill.';

comment on column public.flowtel_stays.previous_cycle_length_days is
  'Captured on Day 1 or inferred resets when Flowtel can calculate the prior cycle length.';

create index if not exists flowtel_stays_cycle_actual_idx
  on public.flowtel_stays (client_id, cycle_day_actual, checkin_date desc);

create index if not exists flowtel_stays_cycle_start_idx
  on public.flowtel_stays (client_id, cycle_start_date desc, checkin_date desc);
