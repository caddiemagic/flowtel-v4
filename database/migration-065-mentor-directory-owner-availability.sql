-- Flowtel v0.10.81.2 — Mentor Directory + Owner Availability Visibility
--
-- Additive purposes:
-- 1. Replace the retired Phase One owner-only Mentor directory with an
--    authenticated, eligibility-aware Mentor to the Moon directory.
-- 2. Record whether each Inner Season availability rhythm has intentionally
--    been saved, including seasons where a Priestess is resting.
-- 3. Give the Phase One owner a private read-only view of Flow FM availability.
--
-- This migration does not alter Acuity appointment creation, Womb Magic
-- consent grants, Mentor relationship cardinality, Flow Map access, or history.

begin;

create table if not exists public.flowtel_flow_fm_availability_season_status (
  member_id uuid not null references public.profiles(id) on delete cascade,
  inner_season text not null,
  accepting_calls boolean not null default false,
  first_saved_at timestamptz not null default now(),
  last_saved_at timestamptz not null default now(),
  primary key (member_id, inner_season),
  constraint flowtel_availability_season_status_season_check
    check (inner_season in ('Inner Winter','Inner Spring','Inner Summer','Inner Autumn'))
);

comment on table public.flowtel_flow_fm_availability_season_status is
  'Tracks intentional saves of each Flow FM Inner Season rhythm, including a deliberately resting season with no windows.';

alter table public.flowtel_flow_fm_availability_season_status enable row level security;
revoke all on public.flowtel_flow_fm_availability_season_status from anon;
revoke insert, update, delete on public.flowtel_flow_fm_availability_season_status from authenticated;
grant select on public.flowtel_flow_fm_availability_season_status to authenticated;

drop policy if exists "Members read their own availability season status" on public.flowtel_flow_fm_availability_season_status;
create policy "Members read their own availability season status"
  on public.flowtel_flow_fm_availability_season_status for select to authenticated
  using (member_id = auth.uid());

-- Availability day states are the source of truth for whether a saved day is
-- currently open. They also preserve retained time windows when a member closes
-- a day, so the owner view must not infer openness from windows alone.
insert into public.flowtel_flow_fm_availability_season_status(
  member_id, inner_season, accepting_calls, first_saved_at, last_saved_at
)
select
  d.member_id,
  d.inner_season,
  bool_or(d.is_available),
  min(coalesce(d.created_at,now())),
  max(coalesce(d.updated_at,d.created_at,now()))
from public.flowtel_flow_fm_availability_day_states d
group by d.member_id,d.inner_season
on conflict (member_id,inner_season) do update
set accepting_calls = excluded.accepting_calls,
    last_saved_at = greatest(
      public.flowtel_flow_fm_availability_season_status.last_saved_at,
      excluded.last_saved_at
    );

-- Defensive fallback for an environment where older windows exist without the
-- migration-061 day-state backfill. Empty/resting seasons become explicit after
-- the member next saves because historic windows cannot prove that distinction.
insert into public.flowtel_flow_fm_availability_season_status(
  member_id, inner_season, accepting_calls, first_saved_at, last_saved_at
)
select
  w.member_id,
  w.inner_season,
  true,
  min(coalesce(w.created_at,now())),
  max(coalesce(w.updated_at,w.created_at,now()))
from public.flowtel_flow_fm_availability_windows w
group by w.member_id,w.inner_season
on conflict (member_id,inner_season) do nothing;

create or replace function public.flowtel_availability_save_season(
  p_inner_season text,
  p_days jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member uuid := public.flowtel_hfr_require_member();
  v_day jsonb;
  v_window jsonb;
  v_weekday integer;
  v_available boolean;
  v_any_available boolean := false;
  v_windows jsonb;
  v_order integer;
  v_start time;
  v_end time;
begin
  if p_inner_season not in ('Inner Winter','Inner Spring','Inner Summer','Inner Autumn') then
    raise exception 'Choose a valid Inner Season.' using errcode = '22023';
  end if;
  if p_days is null or jsonb_typeof(p_days) <> 'array' or jsonb_array_length(p_days) <> 7 then
    raise exception 'Include Monday through Sunday before saving.' using errcode = '22023';
  end if;
  if (
    select count(distinct nullif(day->>'weekday','')::integer)
    from jsonb_array_elements(p_days) as item(day)
  ) <> 7 then
    raise exception 'Each weekday may appear once.' using errcode = '22023';
  end if;

  for v_day in select value from jsonb_array_elements(p_days)
  loop
    v_weekday := nullif(v_day->>'weekday', '')::integer;
    v_available := coalesce((v_day->>'available')::boolean, false);
    v_windows := coalesce(v_day->'windows', '[]'::jsonb);
    v_any_available := v_any_available or v_available;

    if v_weekday not between 1 and 7 then
      raise exception 'Choose a weekday from Monday through Sunday.' using errcode = '22023';
    end if;
    if jsonb_typeof(v_windows) <> 'array' then
      raise exception 'Availability windows must be provided as a list.' using errcode = '22023';
    end if;
    if v_available and jsonb_array_length(v_windows) = 0 then
      raise exception 'Add at least one time window for every available day.' using errcode = '22023';
    end if;
    if jsonb_array_length(v_windows) > 8 then
      raise exception 'A weekday may contain up to eight time windows.' using errcode = '22023';
    end if;

    insert into public.flowtel_flow_fm_availability_day_states(
      member_id,inner_season,weekday,is_available,updated_at
    ) values (
      v_member,p_inner_season,v_weekday,v_available,now()
    )
    on conflict (member_id,inner_season,weekday) do update
      set is_available=excluded.is_available,updated_at=now();

    -- Preserve the established v0.10.79 behavior: closing a day does not erase
    -- the member's retained time windows. Replacing only this weekday preserves
    -- deliberate edits while its day-state decides whether it is currently open.
    delete from public.flowtel_flow_fm_availability_windows
    where member_id=v_member and inner_season=p_inner_season and weekday=v_weekday;

    v_order := 0;
    for v_window in select value from jsonb_array_elements(v_windows)
    loop
      v_order := v_order + 1;
      begin
        v_start := (v_window->>'start')::time;
        v_end := (v_window->>'end')::time;
      exception when others then
        raise exception 'Use valid start and end times.' using errcode='22023';
      end;
      if v_start >= v_end then
        raise exception 'Each availability window must end after it begins.' using errcode='22023';
      end if;
      insert into public.flowtel_flow_fm_availability_windows(
        member_id,inner_season,weekday,window_order,starts_at,ends_at
      ) values (
        v_member,p_inner_season,v_weekday,v_order,v_start,v_end
      );
    end loop;
  end loop;

  insert into public.flowtel_flow_fm_availability_season_status(
    member_id, inner_season, accepting_calls, first_saved_at, last_saved_at
  ) values (
    v_member, p_inner_season, v_any_available, now(), now()
  )
  on conflict (member_id,inner_season) do update
  set accepting_calls = excluded.accepting_calls,
      last_saved_at = now();

  return public.flowtel_availability_load();
end;
$$;

revoke all on function public.flowtel_availability_save_season(text,jsonb) from public;
grant execute on function public.flowtel_availability_save_season(text,jsonb) to authenticated;

-- Member-facing Mentor directory. Every candidate must be an eligible Flow FM
-- or Council member, explicitly accepting clients, and either the protected
-- owner/admin Concierge or a practitioner with Concierge Team access.
create or replace function public.flowtel_list_available_mentors()
returns table (
  id uuid,
  display_name text,
  first_name text,
  last_name text,
  email text,
  role text,
  membership_type text,
  practitioner_level text,
  flowfm_started_at date,
  is_initiated boolean,
  mentor_title text,
  mentor_bio text,
  mentor_photo_url text,
  mentor_specialties text[],
  mentor_accepting_clients boolean,
  mentor_sort_order integer,
  mentor_scheduling_url text,
  scheduling_url text,
  booking_url text,
  serving_wing text,
  concierge_access_enabled boolean
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    p.id,
    coalesce(nullif(trim(p.display_name),''),nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),p.email),
    p.first_name,
    p.last_name,
    p.email,
    p.role,
    p.membership_type,
    p.practitioner_level,
    p.flowfm_started_at,
    p.is_initiated,
    coalesce(nullif(trim(p.mentor_title),''),nullif(trim(pp.modalities),''),'Flowtel Mentor'),
    p.mentor_bio,
    coalesce(nullif(trim(pp.profile_photo_url),''),nullif(trim(p.mentor_photo_url),'')),
    p.mentor_specialties,
    coalesce(p.mentor_accepting_clients,false),
    p.mentor_sort_order,
    p.mentor_scheduling_url,
    p.scheduling_url,
    p.booking_url,
    p.serving_wing,
    coalesce(p.concierge_access_enabled,false)
  from public.profiles p
  left join public.flow_fm_priestess_profiles pp on pp.member_id = p.id
  where auth.uid() is not null
    and public.flow_fm_effective_membership_rank(
      p.id,p.membership_type,p.membership_rank,p.role,p.flowfm_started_at,p.is_initiated
    ) >= 2
    and coalesce(p.mentor_accepting_clients,false) = true
    and (
      lower(coalesce(p.role,'')) in ('owner','admin')
      or (
        lower(coalesce(p.role,'')) = 'practitioner'
        and coalesce(p.concierge_access_enabled,false) = true
      )
    )
  order by p.mentor_sort_order nulls last,
    lower(coalesce(nullif(trim(p.display_name),''),nullif(trim(p.first_name),''),p.email));
$$;

revoke all on function public.flowtel_list_available_mentors() from public;
grant execute on function public.flowtel_list_available_mentors() to authenticated;

comment on function public.flowtel_list_available_mentors() is
  'Consent doorway directory for one Mentor to the Moon: eligible membership + accepting clients + approved Concierge Team access.';

create or replace function public.flowtel_admin_list_flow_fm_availability()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_result jsonb;
begin
  if not public.flowtel_current_user_is_phase_one_owner() then
    raise exception 'Only the Flowtel owner may view all Flow FM availability.' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(member_row order by lower(member_row->>'display_name')),'[]'::jsonb)
  into v_result
  from (
    select jsonb_build_object(
      'member_id',p.id,
      'display_name',coalesce(nullif(trim(p.display_name),''),nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),p.email),
      'email',p.email,
      'location',p.location,
      'timezone',coalesce(nullif(trim(p.timezone),''),'America/Los_Angeles'),
      'profile_photo_url',coalesce(nullif(trim(pp.profile_photo_url),''),nullif(trim(p.mentor_photo_url),'')),
      'membership_type',case when public.flow_fm_effective_membership_rank(p.id,p.membership_type,p.membership_rank,p.role,p.flowfm_started_at,p.is_initiated)>=3 then 'council' else 'flowfm' end,
      'mentor_accepting_clients',coalesce(p.mentor_accepting_clients,false),
      'concierge_access_enabled',coalesce(p.concierge_access_enabled,false),
      'current_inner_season',latest.inner_season,
      'current_cycle_day',latest.cycle_day,
      'last_checkin_date',latest.checkin_date,
      'completed_season_count',coalesce(metrics.completed_season_count,0),
      'resting_season_count',coalesce(metrics.resting_season_count,0),
      'availability_updated_at',metrics.availability_updated_at,
      'windows',coalesce(metrics.windows,'[]'::jsonb),
      'day_states',coalesce(metrics.day_states,'[]'::jsonb),
      'season_status',coalesce(metrics.season_status,'[]'::jsonb)
    ) as member_row
    from public.profiles p
    left join public.flow_fm_priestess_profiles pp on pp.member_id=p.id
    left join lateral (
      select
        s.inner_season,
        coalesce(s.cycle_day_actual,s.cycle_day_calculated,s.cycle_day_claimed) as cycle_day,
        s.checkin_date
      from public.flowtel_stays s
      where s.client_id=p.id
      order by s.checkin_date desc,s.checked_in_at desc nulls last,s.created_at desc nulls last
      limit 1
    ) latest on true
    left join lateral (
      select
        (select count(*) from public.flowtel_flow_fm_availability_season_status st where st.member_id=p.id) as completed_season_count,
        (select count(*) from public.flowtel_flow_fm_availability_season_status st where st.member_id=p.id and st.accepting_calls=false) as resting_season_count,
        greatest(
          (select max(st.last_saved_at) from public.flowtel_flow_fm_availability_season_status st where st.member_id=p.id),
          (select max(coalesce(d.updated_at,d.created_at)) from public.flowtel_flow_fm_availability_day_states d where d.member_id=p.id),
          (select max(coalesce(w.updated_at,w.created_at)) from public.flowtel_flow_fm_availability_windows w where w.member_id=p.id)
        ) as availability_updated_at,
        (select jsonb_agg(jsonb_build_object(
          'inner_season',w.inner_season,
          'weekday',w.weekday,
          'window_order',w.window_order,
          'starts_at',to_char(w.starts_at,'HH24:MI'),
          'ends_at',to_char(w.ends_at,'HH24:MI')
        ) order by case w.inner_season when 'Inner Winter' then 1 when 'Inner Spring' then 2 when 'Inner Summer' then 3 else 4 end,w.weekday,w.window_order)
        from public.flowtel_flow_fm_availability_windows w where w.member_id=p.id) as windows,
        (select jsonb_agg(jsonb_build_object(
          'inner_season',d.inner_season,
          'weekday',d.weekday,
          'is_available',d.is_available,
          'updated_at',d.updated_at
        ) order by case d.inner_season when 'Inner Winter' then 1 when 'Inner Spring' then 2 when 'Inner Summer' then 3 else 4 end,d.weekday)
        from public.flowtel_flow_fm_availability_day_states d where d.member_id=p.id) as day_states,
        (select jsonb_agg(jsonb_build_object(
          'inner_season',st.inner_season,
          'accepting_calls',st.accepting_calls,
          'first_saved_at',st.first_saved_at,
          'last_saved_at',st.last_saved_at
        ) order by case st.inner_season when 'Inner Winter' then 1 when 'Inner Spring' then 2 when 'Inner Summer' then 3 else 4 end)
        from public.flowtel_flow_fm_availability_season_status st where st.member_id=p.id) as season_status
    ) metrics on true
    where public.flow_fm_effective_membership_rank(
      p.id,p.membership_type,p.membership_rank,p.role,p.flowfm_started_at,p.is_initiated
    ) >= 2
  ) rows;

  return v_result;
end;
$$;

revoke all on function public.flowtel_admin_list_flow_fm_availability() from public;
grant execute on function public.flowtel_admin_list_flow_fm_availability() to authenticated;

comment on function public.flowtel_admin_list_flow_fm_availability() is
  'Owner-only read model for saved Flow FM Inner Season availability rhythms. Does not allow the owner to edit member rhythms.';

commit;
