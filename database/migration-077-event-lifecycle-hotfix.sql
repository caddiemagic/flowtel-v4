-- Flowtel v0.10.90.2 — Event Lifecycle Hotfix
--
-- Requires migration 076 first.
-- - Hides cancelled events from public/member calendar feeds.
-- - Adds an authenticated member cancellation RPC used after Acuity cancellation.
-- - Adds an Owner/Admin permanent-delete RPC with active-Acuity safety checks.

begin;

do $$
begin
  if to_regclass('public.flowtel_queendom_events') is null
     or to_regclass('public.flowtel_queendom_event_occurrence_enrollments') is null
     or to_regclass('public.flowtel_queendom_event_occurrence_registrations') is null then
    raise exception 'Flowtel migration 076 must be installed before migration 077.';
  end if;
end;
$$;

create or replace function public.flowtel_list_queendom_events(p_month_start date default null,p_month_count integer default 6)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  v_member uuid:=auth.uid();v_rank integer;v_start date;v_count integer:=greatest(1,least(coalesce(p_month_count,6),18));v_end date;v_result jsonb;
begin
  if v_member is null then raise exception 'Sign in to open your upcoming events.' using errcode='42501'; end if;
  if not public.flowtel_current_user_has_product_access('flowtel') and not public.flowtel_current_user_is_event_pass() then raise exception 'This account does not have access to the Flowtel event calendar.' using errcode='42501'; end if;
  v_rank:=public.flowtel_queendom_event_member_rank(v_member);
  if v_rank<1 and not public.flowtel_current_user_is_event_pass() then raise exception 'A Queendom membership is required to open this calendar.' using errcode='42501'; end if;
  v_start:=coalesce(p_month_start,date_trunc('month',(timezone('America/Los_Angeles',now()))::date)::date);v_end:=(v_start+make_interval(months=>v_count))::date;
  select coalesce(jsonb_agg(jsonb_build_object(
    'event_id',e.id,'title',e.title,'event_type',e.event_type,'description',e.description,'event_date',e.event_date,
    'start_time',to_char(e.start_time,'HH24:MI'),'end_time',case when e.end_time is null then null else to_char(e.end_time,'HH24:MI') end,
    'starts_at',e.starts_at,'ends_at',e.ends_at,'event_timezone',e.event_timezone,
    'live_room_time',case when e.live_room_time is null then null else to_char(e.live_room_time,'HH24:MI') end,'live_room_starts_at',e.live_room_starts_at,
    'host_name',e.host_name,'host_member_id',e.host_member_id,'co_host_name',e.co_host_name,'co_host_member_id',e.co_host_member_id,
    'host_timezone',case when coalesce(h.flow_fm_team_map_opt_out,false)=false then h.timezone else null end,
    'co_host_timezone',case when coalesce(ch.flow_fm_team_map_opt_out,false)=false then ch.timezone else null end,
    'audience',e.audience,'image_url',e.image_url,'status',e.status,'will_be_recorded',e.will_be_recorded,
    'public_access',e.public_access,'queendom_access',e.queendom_access,'flowfm_access',e.flowfm_access,
    'public_price',e.public_price,'queendom_price',e.queendom_price,'flowfm_price',e.flowfm_price,'access_currency',e.access_currency,'ticket_url',e.ticket_url,
    'event_format',e.event_format,'series_count',e.series_count,'series_interval_days',e.series_interval_days,
    'acuity_sync_enabled',e.acuity_sync_enabled,'acuity_schedule_label',e.acuity_schedule_label,
    'occurrences',case when e.event_format in ('recurring','series') or exists(select 1 from public.flowtel_queendom_event_occurrences ox where ox.event_id=e.id)
      then public.flowtel_event_occurrence_json(e.id,v_member) else '[]'::jsonb end,
    'series_enrollment_status',(select se.status from public.flowtel_queendom_event_series_enrollments se where se.event_id=e.id and se.member_id=v_member),
    'access',public.flowtel_queendom_event_access_state(e.id,v_member),
    'is_registered',case when e.event_format='recurring' then exists(select 1 from public.flowtel_queendom_event_occurrence_registrations rr where rr.event_id=e.id and rr.member_id=v_member and rr.cancelled_at is null)
      else exists(select 1 from public.flowtel_queendom_event_registrations r where r.event_id=e.id and r.member_id=v_member and r.cancelled_at is null) end,
    'can_join',(public.flowtel_queendom_event_access_state(e.id,v_member)->>'entitled')::boolean,
    'registration_count',case when e.event_format='recurring' then (select count(*)::integer from public.flowtel_queendom_event_occurrence_registrations rr where rr.event_id=e.id and rr.cancelled_at is null)
      else (select count(*)::integer from public.flowtel_queendom_event_registrations r where r.event_id=e.id and r.cancelled_at is null) end
  ) order by coalesce((select min(o.starts_at) from public.flowtel_queendom_event_occurrences o where o.event_id=e.id and o.status='scheduled'),e.starts_at),e.title),'[]'::jsonb) into v_result
  from public.flowtel_queendom_events e
  left join public.profiles h on h.id=e.host_member_id
  left join public.profiles ch on ch.id=e.co_host_member_id
  where e.published_at is not null and e.status='published' and (
    (not exists(select 1 from public.flowtel_queendom_event_occurrences o where o.event_id=e.id) and e.event_date>=v_start and e.event_date<v_end)
    or exists(select 1 from public.flowtel_queendom_event_occurrences o where o.event_id=e.id and o.event_date>=v_start and o.event_date<v_end)
  );
  return v_result;
end;
$$;
revoke all on function public.flowtel_list_queendom_events(date,integer) from public;
grant execute on function public.flowtel_list_queendom_events(date,integer) to authenticated;

create or replace function public.flowtel_public_queendom_events(p_month_start date default null,p_month_count integer default 3)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare v_start date:=coalesce(p_month_start,date_trunc('month',(timezone('America/Los_Angeles',now()))::date)::date);v_count integer:=greatest(1,least(coalesce(p_month_count,3),18));v_end date;v_result jsonb;
begin
  v_end:=(v_start+make_interval(months=>v_count))::date;
  select coalesce(jsonb_agg(jsonb_build_object(
    'event_id',e.id,'title',e.title,'event_type',e.event_type,'description',e.description,'event_date',e.event_date,
    'start_time',to_char(e.start_time,'HH24:MI'),'end_time',case when e.end_time is null then null else to_char(e.end_time,'HH24:MI') end,
    'starts_at',e.starts_at,'ends_at',e.ends_at,'event_timezone',e.event_timezone,
    'live_room_time',case when e.live_room_time is null then null else to_char(e.live_room_time,'HH24:MI') end,'live_room_starts_at',e.live_room_starts_at,
    'host_name',e.host_name,'host_member_id',e.host_member_id,'co_host_name',e.co_host_name,'co_host_member_id',e.co_host_member_id,
    'host_timezone',case when coalesce(h.flow_fm_team_map_opt_out,false)=false then h.timezone else null end,
    'co_host_timezone',case when coalesce(ch.flow_fm_team_map_opt_out,false)=false then ch.timezone else null end,
    'audience',e.audience,'image_url',e.image_url,'status',e.status,'will_be_recorded',e.will_be_recorded,
    'public_access',e.public_access,'queendom_access',e.queendom_access,'flowfm_access',e.flowfm_access,
    'public_price',e.public_price,'queendom_price',e.queendom_price,'flowfm_price',e.flowfm_price,'access_currency',e.access_currency,'ticket_url',e.ticket_url,
    'event_format',e.event_format,'series_count',e.series_count,'series_interval_days',e.series_interval_days,
    'acuity_sync_enabled',e.acuity_sync_enabled,'acuity_schedule_label',e.acuity_schedule_label,
    'occurrences',case when e.event_format in ('recurring','series') or exists(select 1 from public.flowtel_queendom_event_occurrences ox where ox.event_id=e.id)
      then public.flowtel_event_occurrence_json(e.id,null) else '[]'::jsonb end,
    'registration_count',case when e.event_format='recurring' then (select count(*)::integer from public.flowtel_queendom_event_occurrence_registrations rr where rr.event_id=e.id and rr.cancelled_at is null)
      else (select count(*)::integer from public.flowtel_queendom_event_registrations r where r.event_id=e.id and r.cancelled_at is null) end
  ) order by coalesce((select min(o.starts_at) from public.flowtel_queendom_event_occurrences o where o.event_id=e.id and o.status='scheduled'),e.starts_at),e.title),'[]'::jsonb) into v_result
  from public.flowtel_queendom_events e
  left join public.profiles h on h.id=e.host_member_id
  left join public.profiles ch on ch.id=e.co_host_member_id
  where e.published_at is not null and e.status='published' and (
    (not exists(select 1 from public.flowtel_queendom_event_occurrences o where o.event_id=e.id) and e.event_date>=v_start and e.event_date<v_end)
    or exists(select 1 from public.flowtel_queendom_event_occurrences o where o.event_id=e.id and o.event_date>=v_start and o.event_date<v_end)
  );
  return v_result;
end;
$$;
revoke all on function public.flowtel_public_queendom_events(date,integer) from public;
grant execute on function public.flowtel_public_queendom_events(date,integer) to anon,authenticated;

create or replace function public.flowtel_cancel_queendom_event_registration(
  p_event_id uuid,
  p_occurrence_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_member uuid:=auth.uid();
  v_event public.flowtel_queendom_events%rowtype;
  v_changed integer:=0;
begin
  if v_member is null then raise exception 'Sign in before releasing this seat.' using errcode='42501'; end if;
  select * into v_event from public.flowtel_queendom_events where id=p_event_id;
  if v_event.id is null then raise exception 'That event is not available.' using errcode='22023'; end if;

  if v_event.event_format='recurring' then
    if p_occurrence_id is null then raise exception 'Choose the recurring gathering you want to leave.' using errcode='22023'; end if;
    if coalesce(v_event.acuity_sync_enabled,false) and exists(
      select 1 from public.flowtel_queendom_event_occurrence_enrollments oe
      where oe.event_id=p_event_id and oe.occurrence_id=p_occurrence_id and oe.member_id=v_member
        and oe.status in ('pending','scheduled','rescheduled')
    ) then raise exception 'Acuity still holds this seat. Cancel the linked Acuity appointment before releasing the Flowtel seat.' using errcode='55000'; end if;
    update public.flowtel_queendom_event_occurrence_registrations
    set cancelled_at=now(),updated_at=now()
    where event_id=p_event_id and occurrence_id=p_occurrence_id and member_id=v_member and cancelled_at is null;
    get diagnostics v_changed=row_count;
  else
    if coalesce(v_event.acuity_sync_enabled,false) and exists(
      select 1 from public.flowtel_queendom_event_occurrence_enrollments oe
      where oe.event_id=p_event_id and oe.member_id=v_member and oe.status in ('pending','scheduled','rescheduled')
    ) then raise exception 'Acuity still holds this seat. Cancel the linked Acuity appointment before releasing the Flowtel seat.' using errcode='55000'; end if;
    if v_event.event_format='series' and exists(
      select 1 from public.flowtel_queendom_event_series_enrollments se
      where se.event_id=p_event_id and se.member_id=v_member and se.status in ('pending','active')
    ) then raise exception 'Acuity still holds this series. Cancel the linked Acuity sessions before releasing the Flowtel vortex.' using errcode='55000'; end if;
    update public.flowtel_queendom_event_registrations
    set cancelled_at=now(),updated_at=now()
    where event_id=p_event_id and member_id=v_member and cancelled_at is null;
    get diagnostics v_changed=row_count;
  end if;

  return jsonb_build_object(
    'event_id',p_event_id,
    'occurrence_id',p_occurrence_id,
    'registered',false,
    'event_format',v_event.event_format,
    'released',v_changed>0
  );
end;
$$;
revoke all on function public.flowtel_cancel_queendom_event_registration(uuid,uuid) from public;
grant execute on function public.flowtel_cancel_queendom_event_registration(uuid,uuid) to authenticated;

create or replace function public.flowtel_admin_delete_queendom_event(p_event_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public,auth
as $$
declare v_event public.flowtel_queendom_events%rowtype;
begin
  if not public.flowtel_current_user_is_admin_or_owner() then
    raise exception 'Only Flowtel administration may permanently delete Queendom events.' using errcode='42501';
  end if;
  select * into v_event from public.flowtel_queendom_events where id=p_event_id;
  if v_event.id is null then raise exception 'That event could not be found.' using errcode='22023'; end if;
  if v_event.status='published' then
    raise exception 'Cancel this event before deleting it permanently.' using errcode='22023';
  end if;
  if exists(
    select 1 from public.flowtel_queendom_event_occurrence_enrollments oe
    where oe.event_id=p_event_id and oe.status in ('pending','scheduled','rescheduled')
  ) then
    raise exception 'This event still has active Acuity appointments. Cancel those appointments first, then delete the event.' using errcode='22023';
  end if;
  if exists(
    select 1 from public.flowtel_queendom_event_series_enrollments se
    where se.event_id=p_event_id and se.status in ('pending','active')
  ) then
    raise exception 'This event still has an active Acuity series enrollment. Cancel the series first, then delete the event.' using errcode='22023';
  end if;
  delete from public.flowtel_queendom_events where id=p_event_id;
  if not found then raise exception 'That event could not be deleted.' using errcode='22023'; end if;
  return true;
end;
$$;
revoke all on function public.flowtel_admin_delete_queendom_event(uuid) from public;
grant execute on function public.flowtel_admin_delete_queendom_event(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
