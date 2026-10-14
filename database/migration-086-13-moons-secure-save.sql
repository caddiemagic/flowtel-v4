-- Release 1 supplementary migration; run only after migration 085.
-- All Vortex edits pass through this membership-checked function.
create or replace function public.flowtel_save_13_moons_vortex(
  p_start_month date,
  p_reflections jsonb
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_existing public.flowtel_13_moons_vortices%rowtype;
  v_complete boolean;
  v_allowed boolean;
begin
  select exists (
    select 1 from public.flowtel_13_moons_entitlements e
    where e.user_id=v_uid and e.access_granted
  ) or exists (
    select 1 from public.profiles p
    where p.id=v_uid and (p.membership_rank >= 2
      or p.membership_type in ('flowfm','council'))
  ) into v_allowed;
  if v_uid is null or not v_allowed then
    raise exception '13 Moons access required' using errcode='42501';
  end if;
  if p_start_month is null or extract(day from p_start_month) <> 1 then
    raise exception 'Invalid start month';
  end if;
  if p_reflections is null or jsonb_typeof(p_reflections) <> 'array'
     or jsonb_array_length(p_reflections) <> 13 then
    raise exception 'Exactly 13 reflections required';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_reflections) x
    where jsonb_typeof(x) <> 'string' or length(x #>> '{}') > 4000
  ) then
    raise exception 'Invalid reflection';
  end if;
  v_complete := not exists (
    select 1 from jsonb_array_elements_text(p_reflections) x
    where length(btrim(x)) = 0
  );
  select * into v_existing from public.flowtel_13_moons_vortices
  where user_id=v_uid for update;
  if found and (v_existing.completed_at is not null
    or v_existing.start_month <> p_start_month) then
    raise exception 'The opening Vortex cannot be changed';
  end if;
  insert into public.flowtel_13_moons_vortices
    (user_id,start_month,reflections,completed_at,updated_at)
  values (v_uid,p_start_month,p_reflections,
    case when v_complete then now() else null end,now())
  on conflict (user_id) do update
    set reflections=excluded.reflections,
        completed_at=excluded.completed_at,
        updated_at=now()
  where public.flowtel_13_moons_vortices.completed_at is null
    and public.flowtel_13_moons_vortices.start_month=excluded.start_month;
  if not found then
    raise exception 'The opening Vortex is sealed';
  end if;
  return jsonb_build_object('saved',true,'complete',v_complete);
end;
$$;
revoke all on function public.flowtel_save_13_moons_vortex(date,jsonb) from public,anon;
grant execute on function public.flowtel_save_13_moons_vortex(date,jsonb) to authenticated;
