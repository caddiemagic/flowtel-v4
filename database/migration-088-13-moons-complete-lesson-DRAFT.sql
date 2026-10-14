-- DRAFT ONLY. Do not apply before migrations 085 and 087 and a staging security review.
-- Explicitly records completion in canonical Womb Magic order, never moon-name order.
-- Does not touch Flow Map entries, cycle journal, or the Big Vision Vortex.
create or replace function public.flowtel_complete_13_moons_lesson(p_lesson integer)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_allowed boolean := false;
  v_row public.flowtel_13_moons_lesson_progress%rowtype;
begin
  if v_uid is null or p_lesson is null or p_lesson not between 1 and 13 then
    raise exception 'Invalid lesson or session' using errcode='22023';
  end if;
  select (
    exists(select 1 from public.flowtel_13_moons_entitlements e
      where e.user_id=v_uid and e.access_granted=true)
    or exists(select 1 from public.profiles p where p.id=v_uid and
      (p.membership_rank>=2 or p.membership_type in ('flowfm','council')))
  ) into v_allowed;
  if not v_allowed then
    raise exception '13 Moons membership required' using errcode='42501';
  end if;
  insert into public.flowtel_13_moons_lesson_progress(user_id)
  values(v_uid) on conflict(user_id) do nothing;
  select * into v_row from public.flowtel_13_moons_lesson_progress
    where user_id=v_uid for update;
  if p_lesson = any(v_row.completed_lessons) then
    return jsonb_build_object('complete',true,'current_lesson',v_row.current_lesson,
      'completed_lessons',v_row.completed_lessons);
  end if;
  if p_lesson <> v_row.current_lesson then
    raise exception 'Complete the current Womb Magic lesson first' using errcode='22023';
  end if;
  update public.flowtel_13_moons_lesson_progress
  set completed_lessons = array_append(completed_lessons, p_lesson),
    current_lesson=least(13,p_lesson+1), updated_at=now()
  where user_id=v_uid
  returning * into v_row;
  return jsonb_build_object('complete',true,'current_lesson',v_row.current_lesson,
    'completed_lessons',v_row.completed_lessons);
end; $$;
revoke all on function public.flowtel_complete_13_moons_lesson(integer) from public, anon;
grant execute on function public.flowtel_complete_13_moons_lesson(integer) to authenticated;
