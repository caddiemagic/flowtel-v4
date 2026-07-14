-- Flowtel Release 0.10.40
-- Flow Map Complete Note History
--
-- Purpose:
-- 1. Preserve the existing one-stay-per-Flowtel-Day model.
-- 2. Return every append-only reflection row for each stay to the Flow Map.
-- 3. Return checkout notes once, as their own Flow Map note entry.
-- 4. Keep current guest / connected mentor / admin / owner consent boundaries.

create or replace function public.flowtel_get_flow_map_entries(
  p_subject_id uuid default null,
  p_scope text default 'self'
)
returns table (
  entry_id text,
  entry_type text,
  stay_id uuid,
  client_id uuid,
  client_name text,
  checkin_date date,
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  cycle_day_actual integer,
  cycle_day_recorded integer,
  cycle_day_difference integer,
  cycle_day_match_status text,
  cycle_accuracy_message text,
  cycle_start_date date,
  previous_cycle_length_days integer,
  inner_season text,
  feels_like_inner_season text,
  moon_phase text,
  moon_day integer,
  moon_inner_season text,
  moon_theme text,
  moon_cycle_start_date date,
  reflection_text text,
  reflection_created_at timestamptz,
  checkout_notes text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_scope text := coalesce(nullif(p_scope,''),'self');
begin
  if v_user_id is null then
    raise exception 'You must be signed in to view Flow Map notes.' using errcode = '28000';
  end if;

  select role into v_role
  from public.profiles
  where id = v_user_id;

  if p_subject_id is not null and not public.flowtel_can_view_cycle_subject(p_subject_id) then
    raise exception 'This Flow Map is only available with active consent.' using errcode = '42501';
  end if;

  if v_scope in ('all','clients') and coalesce(v_role,'') not in ('practitioner','admin','owner') then
    raise exception 'Only mentors and admins can view client Flow Maps.' using errcode = '42501';
  end if;

  return query
  with permitted_stays as (
    select
      s.*,
      coalesce(nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), p.email, 'Flowtel Guest') as resolved_client_name
    from public.flowtel_stays s
    join public.profiles p on p.id = s.client_id
    where
      case
        when p_subject_id is not null then s.client_id = p_subject_id
        when v_scope = 'self' then s.client_id = v_user_id
        when v_scope in ('all','clients') and coalesce(v_role,'') in ('admin','owner') then true
        when v_scope in ('all','clients') and coalesce(v_role,'') = 'practitioner' then exists (
          select 1
          from public.flowtel_practitioner_relationships relationship
          where relationship.client_id = s.client_id
            and relationship.practitioner_id = v_user_id
            and relationship.status = 'connected'
            and coalesce(relationship.consent_granted, false) = true
        )
        else false
      end
  ),
  reflection_entries as (
    select
      r.id::text as entry_id,
      'reflection'::text as entry_type,
      s.id as stay_id,
      s.client_id,
      s.resolved_client_name as client_name,
      s.checkin_date::date as checkin_date,
      s.checked_in_at,
      s.checked_out_at,
      coalesce(s.cycle_day_actual, s.cycle_day_calculated, s.cycle_day_claimed) as cycle_day_actual,
      coalesce(s.cycle_day_recorded, s.cycle_day_claimed) as cycle_day_recorded,
      coalesce(
        s.cycle_day_difference,
        coalesce(s.cycle_day_recorded, s.cycle_day_claimed, 0)
          - coalesce(s.cycle_day_actual, s.cycle_day_calculated, s.cycle_day_claimed, 0)
      ) as cycle_day_difference,
      s.cycle_day_match_status,
      s.cycle_accuracy_message,
      s.cycle_start_date::date as cycle_start_date,
      s.previous_cycle_length_days,
      s.inner_season,
      s.feels_like_inner_season,
      s.moon_phase,
      s.moon_day,
      s.moon_inner_season,
      s.moon_theme,
      public.flowtel_moon_cycle_start_for_date(s.checkin_date::date) as moon_cycle_start_date,
      r.reflection as reflection_text,
      r.created_at as reflection_created_at,
      null::text as checkout_notes
    from permitted_stays s
    join public.flowtel_reflections r on r.stay_id = s.id
    where nullif(trim(r.reflection),'') is not null
  ),
  fallback_reflection_entries as (
    select
      ('stay-reflection-' || s.id::text) as entry_id,
      'reflection'::text as entry_type,
      s.id as stay_id,
      s.client_id,
      s.resolved_client_name as client_name,
      s.checkin_date::date as checkin_date,
      s.checked_in_at,
      s.checked_out_at,
      coalesce(s.cycle_day_actual, s.cycle_day_calculated, s.cycle_day_claimed) as cycle_day_actual,
      coalesce(s.cycle_day_recorded, s.cycle_day_claimed) as cycle_day_recorded,
      coalesce(
        s.cycle_day_difference,
        coalesce(s.cycle_day_recorded, s.cycle_day_claimed, 0)
          - coalesce(s.cycle_day_actual, s.cycle_day_calculated, s.cycle_day_claimed, 0)
      ) as cycle_day_difference,
      s.cycle_day_match_status,
      s.cycle_accuracy_message,
      s.cycle_start_date::date as cycle_start_date,
      s.previous_cycle_length_days,
      s.inner_season,
      s.feels_like_inner_season,
      s.moon_phase,
      s.moon_day,
      s.moon_inner_season,
      s.moon_theme,
      public.flowtel_moon_cycle_start_for_date(s.checkin_date::date) as moon_cycle_start_date,
      s.reflection as reflection_text,
      coalesce(s.updated_at, s.checked_in_at) as reflection_created_at,
      null::text as checkout_notes
    from permitted_stays s
    where nullif(trim(s.reflection),'') is not null
      and not exists (
        select 1
        from public.flowtel_reflections r
        where r.stay_id = s.id
      )
  ),
  checkout_entries as (
    select
      ('checkout-' || s.id::text) as entry_id,
      'checkout'::text as entry_type,
      s.id as stay_id,
      s.client_id,
      s.resolved_client_name as client_name,
      s.checkin_date::date as checkin_date,
      s.checked_in_at,
      s.checked_out_at,
      coalesce(s.cycle_day_actual, s.cycle_day_calculated, s.cycle_day_claimed) as cycle_day_actual,
      coalesce(s.cycle_day_recorded, s.cycle_day_claimed) as cycle_day_recorded,
      coalesce(
        s.cycle_day_difference,
        coalesce(s.cycle_day_recorded, s.cycle_day_claimed, 0)
          - coalesce(s.cycle_day_actual, s.cycle_day_calculated, s.cycle_day_claimed, 0)
      ) as cycle_day_difference,
      s.cycle_day_match_status,
      s.cycle_accuracy_message,
      s.cycle_start_date::date as cycle_start_date,
      s.previous_cycle_length_days,
      s.inner_season,
      s.feels_like_inner_season,
      s.moon_phase,
      s.moon_day,
      s.moon_inner_season,
      s.moon_theme,
      public.flowtel_moon_cycle_start_for_date(s.checkin_date::date) as moon_cycle_start_date,
      null::text as reflection_text,
      coalesce(s.checked_out_at, s.updated_at, s.checked_in_at) as reflection_created_at,
      s.checkout_notes
    from permitted_stays s
    where nullif(trim(s.checkout_notes),'') is not null
  ),
  all_note_entries as (
    select * from reflection_entries
    union all
    select * from fallback_reflection_entries
    union all
    select * from checkout_entries
  )
  select note_entries.*
  from all_note_entries note_entries
  order by note_entries.checkin_date desc, note_entries.reflection_created_at desc
  limit 3000;
end;
$$;

grant execute on function public.flowtel_get_flow_map_entries(uuid, text) to authenticated;

comment on function public.flowtel_get_flow_map_entries(uuid, text) is
  'Returns every append-only reflection and checkout note for consent-aware Flow Map views without collapsing a stay to its latest reflection.';
