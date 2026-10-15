-- DRAFT ONLY. Requires schemas 089 and 091, with staging security review.
-- Uses the authenticated user's own record; no direct browser table writes.
create or replace function public.flowtel_save_13_moons_future_letter(
  p_text text,
  p_seal boolean default false
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
 v_uid uuid := auth.uid();
 v_allowed boolean;
 v_record public.flowtel_13_moons_future_letters%rowtype;
 v_start date;
begin
 if v_uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select (
  exists(select 1 from public.flowtel_13_moons_entitlements e where e.user_id=v_uid and e.access_granted)
  or exists(select 1 from public.profiles p where p.id=v_uid and (p.membership_rank>=2 or p.membership_type in ('flowfm','council')))
 ) into v_allowed;
 if not v_allowed then raise exception '13 Moons access required' using errcode='42501'; end if;
 if p_text is null or char_length(p_text)>20000 then
  raise exception 'Invalid letter length' using errcode='22023';
 end if;
 if p_seal and length(btrim(p_text))=0 then
  raise exception 'Write your letter before sealing' using errcode='22023';
 end if;
 select * into v_record from public.flowtel_13_moons_future_letters where user_id=v_uid for update;
 if found then
  if v_record.sealed_at is not null then
   raise exception 'Letter is already sealed' using errcode='22023';
  end if;
  update public.flowtel_13_moons_future_letters
   set letter_text=p_text, sealed_at=case when p_seal then now() else null end, updated_at=now()
   where user_id=v_uid returning * into v_record;
 else
  -- The actual initiation date was registered at entry, not at letter save.
  select initiation_start_date into v_start from public.flowtel_13_moons_starts where user_id=v_uid;
  if v_start is null then raise exception 'Begin your 13 Moons initiation before writing your letter' using errcode='22023'; end if;
  insert into public.flowtel_13_moons_future_letters
   (user_id,initiation_start_date,letter_date,letter_text,sealed_at)
  values (v_uid,v_start,(v_start+interval '13 months')::date,p_text,
    case when p_seal then now() else null end)
  on conflict (user_id) do nothing;
  select * into v_record from public.flowtel_13_moons_future_letters where user_id=v_uid;
  if v_record.sealed_at is not null and v_record.letter_text<>p_text then
    raise exception 'Letter is already sealed' using errcode='22023';
  end if;
 end if;
 return jsonb_build_object('saved',true,'sealed',v_record.sealed_at is not null,
  'initiation_start_date',v_record.initiation_start_date,'letter_date',v_record.letter_date);
end;
$$;
revoke all on function public.flowtel_save_13_moons_future_letter(text,boolean) from public,anon;
grant execute on function public.flowtel_save_13_moons_future_letter(text,boolean) to authenticated;
-- Validate registration/letter concurrency and month-end clamping in staging.
