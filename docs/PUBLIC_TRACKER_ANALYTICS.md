# Public Cycle Tracker Analytics

Flowtel v0.10.29 adds anonymous public tracker event capture.

The table is:

```sql
public.flowtel_public_tracker_events
```

This table is intended for aggregate usage patterns only. It does not store names, emails, auth user ids, or profile ids.

## Quick health check

```sql
select event_type, count(*)
from public.flowtel_public_tracker_events
group by event_type
order by count(*) desc;
```

## Daily usage

```sql
select
  date_trunc('day', created_at) as day,
  count(*) as events,
  count(*) filter (where event_type = 'tracker_submit') as completed_trackers,
  count(*) filter (where event_type = 'cta_click') as queendom_clicks
from public.flowtel_public_tracker_events
group by 1
order by 1 desc;
```

## Most common selected cycle days

```sql
select selected_cycle_day, count(*)
from public.flowtel_public_tracker_events
where event_type = 'tracker_submit'
  and selected_cycle_day is not null
group by selected_cycle_day
order by count(*) desc, selected_cycle_day asc;
```

## Actual season vs feels-like season

```sql
select
  calculated_inner_season,
  selected_feels_like_season,
  count(*)
from public.flowtel_public_tracker_events
where event_type = 'tracker_submit'
group by 1, 2
order by count(*) desc;
```

## Moon phase at time of tracker use

```sql
select moon_phase, count(*)
from public.flowtel_public_tracker_events
where event_type = 'tracker_submit'
group by moon_phase
order by count(*) desc;
```

## CTA conversion snapshot

```sql
select
  count(*) filter (where event_type = 'tracker_view') as tracker_views,
  count(*) filter (where event_type = 'tracker_submit') as tracker_submits,
  count(*) filter (where event_type = 'cta_click') as queendom_clicks
from public.flowtel_public_tracker_events;
```
