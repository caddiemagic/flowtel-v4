-- SECURITY-REVIEW DRAFT ONLY. DO NOT APPLY TO PRODUCTION.
-- Requires draft migrations 085, 086 and 092, plus tested ownership/RLS.
-- Appends a dated observation without altering the sealed original Vortex wish.
create or replace function public.flowtel_append_13_moons_wish_journal(
 p_moon_position integer,p_entry_text text
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
 v_uid uuid := auth.uid();
 v_allowed boolean := false;
 v_saved public.flowtel_13_moons_wish_journal%rowtype;
begin
 if v_uid is null or p_moon_position is null or p_moon_position not between 2 and 13
    or p_entry_text is null or length(btrim(p_entry_text)) not between 1 and 4000 then
   raise exception 'Invalid wish journal entry or session' using errcode='22023';
 end if;
 select (
   exists(select 1 from public.flowtel_13_moons_entitlements e
     where e.user_id=v_uid and e.access_granted=true)
   or exists(select 1 from public.profiles p where p.id=v_uid
     and (p.membership_rank>=2 or p.membership_type in ('flowfm','council')))
 ) into v_allowed;
 if not v_allowed then
   raise exception '13 Moons membership required' using errcode='42501';
 end if;
 if not exists(
   select 1 from public.flowtel_13_moons_vortices v
   where v.user_id=v_uid and v.completed_at is not null
     and jsonb_typeof(v.reflections)='array'
     and jsonb_array_length(v.reflections)=13
 ) then
   raise exception 'Seal your original wishes before journaling' using errcode='22023';
 end if;
 insert into public.flowtel_13_moons_wish_journal(user_id,moon_position,entry_text)
 values(v_uid,p_moon_position,btrim(p_entry_text)) returning * into v_saved;
 return jsonb_build_object('saved',true,'entry_id',v_saved.id,'moon_position',v_saved.moon_position,'created_at',v_saved.created_at);
end; $$;
revoke all on function public.flowtel_append_13_moons_wish_journal(integer,text) from public,anon;
grant execute on function public.flowtel_append_13_moons_wish_journal(integer,text) to authenticated;
