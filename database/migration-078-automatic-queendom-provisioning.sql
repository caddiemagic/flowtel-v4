-- Flowtel migration 078 — Automatic Queendom Provisioning + Member Reconciliation
-- Server-only verified membership application for Supabase Auth identities.
-- Squarespace purchase verification remains fail-closed in api/squarespace-bridge.js.

create or replace function public.flowtel_apply_verified_membership_server(
  p_user_id uuid,
  p_email text,
  p_membership_type text,
  p_source text default 'squarespace-auto-provision',
  p_source_order_id text default null,
  p_squarespace_contact_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_auth_email text;
  v_membership text:=lower(regexp_replace(coalesce(p_membership_type,''),'[^a-z]','','g'));
  v_rank integer;
  v_profile public.profiles%rowtype;
  v_access public.flowtel_product_access%rowtype;
  v_access_role text:='flowtel_member';
  v_now timestamptz:=now();
begin
  if p_user_id is null then
    raise exception 'A Flowtel Auth user is required.';
  end if;

  if v_membership in ('queen','queendom') then
    v_membership:='queendom'; v_rank:=1;
  elsif v_membership in ('flow','flowfm','flowfmmember') then
    v_membership:='flowfm'; v_rank:=2;
  elsif v_membership='council' then
    v_rank:=3;
  else
    raise exception 'Unsupported Flowtel membership type.';
  end if;

  select lower(trim(coalesce(email,''))) into v_auth_email
  from auth.users
  where id=p_user_id;

  if coalesce(v_auth_email,'')='' then
    raise exception 'The Flowtel Auth user could not be found.';
  end if;

  if v_auth_email<>lower(trim(coalesce(p_email,''))) then
    raise exception 'Verified membership email does not match this Flowtel Auth identity.';
  end if;

  select * into v_access
  from public.flowtel_product_access
  where user_id=p_user_id
  for update;

  if v_access.user_id is not null
     and coalesce(v_access.flowtel_access_status,'active')='revoked' then
    raise exception 'This Flowtel identity is revoked and requires Owner review before membership can be restored.';
  end if;

  insert into public.flowtel_member_signup_admissions(
    email,membership_type,membership_rank,source,source_order_id,
    squarespace_contact_id,expires_at,claimed_by,claimed_at,updated_at
  ) values(
    v_auth_email,v_membership,v_rank,coalesce(nullif(trim(p_source),''),'squarespace-auto-provision'),
    nullif(trim(coalesce(p_source_order_id,'')),''),nullif(trim(coalesce(p_squarespace_contact_id,'')),''),
    v_now + interval '24 hours',p_user_id,v_now,v_now
  )
  on conflict(email) do update
  set membership_type=case
        when public.flowtel_member_signup_admissions.membership_rank>=excluded.membership_rank
          then public.flowtel_member_signup_admissions.membership_type
        else excluded.membership_type
      end,
      membership_rank=greatest(public.flowtel_member_signup_admissions.membership_rank,excluded.membership_rank),
      source=excluded.source,
      source_order_id=coalesce(excluded.source_order_id,public.flowtel_member_signup_admissions.source_order_id),
      squarespace_contact_id=coalesce(excluded.squarespace_contact_id,public.flowtel_member_signup_admissions.squarespace_contact_id),
      expires_at=excluded.expires_at,
      claimed_by=excluded.claimed_by,
      claimed_at=excluded.claimed_at,
      updated_at=v_now;

  insert into public.profiles(
    id,email,role,membership_type,membership_rank,
    squarespace_source,squarespace_contact_id,squarespace_contact_email,source_updated_at
  ) values(
    p_user_id,v_auth_email,'client',v_membership,v_rank,
    coalesce(nullif(trim(p_source),''),'squarespace-auto-provision'),
    nullif(trim(coalesce(p_squarespace_contact_id,'')),''),v_auth_email,v_now
  )
  on conflict(id) do update
  set email=coalesce(public.profiles.email,excluded.email),
      membership_type=case
        when greatest(coalesce(public.profiles.membership_rank,0),public.flowtel_membership_rank(public.profiles.membership_type))>=excluded.membership_rank
          then public.profiles.membership_type
        else excluded.membership_type
      end,
      membership_rank=greatest(coalesce(public.profiles.membership_rank,0),excluded.membership_rank),
      squarespace_source=coalesce(excluded.squarespace_source,public.profiles.squarespace_source),
      squarespace_contact_id=coalesce(excluded.squarespace_contact_id,public.profiles.squarespace_contact_id),
      squarespace_contact_email=coalesce(public.profiles.squarespace_contact_email,excluded.squarespace_contact_email),
      source_updated_at=v_now;

  select * into v_profile from public.profiles where id=p_user_id;
  v_access_role:=case
    when lower(coalesce(v_profile.role,''))='owner' then 'owner'
    when lower(coalesce(v_profile.role,''))='admin' then 'admin'
    when lower(coalesce(v_profile.role,''))='practitioner' then 'practitioner'
    else 'flowtel_member'
  end;

  insert into public.flowtel_product_access(
    user_id,flowtel_access,caddie_magic_access,access_role,access_source,flowtel_access_status,
    flowtel_trial_started_at,flowtel_trial_ends_at,flowtel_trial_converted_at
  ) values(
    p_user_id,true,false,v_access_role,'verified-squarespace-auto-provision','active',
    null,null,null
  )
  on conflict(user_id) do update
  set flowtel_access=true,
      caddie_magic_access=coalesce(public.flowtel_product_access.caddie_magic_access,false),
      access_role=v_access_role,
      access_source=case
        when public.flowtel_product_access.access_role in ('guest_house','event_pass')
          then 'limited-account-upgraded-through-membership'
        else 'verified-squarespace-auto-provision'
      end,
      flowtel_access_status='active',
      flowtel_trial_converted_at=case
        when public.flowtel_product_access.flowtel_trial_started_at is not null
          then coalesce(public.flowtel_product_access.flowtel_trial_converted_at,v_now)
        else public.flowtel_product_access.flowtel_trial_converted_at
      end,
      updated_at=v_now;

  return jsonb_build_object(
    'ok',true,
    'user_id',p_user_id,
    'email',v_auth_email,
    'membership_type',v_membership,
    'membership_rank',v_rank,
    'access_role',v_access_role
  );
end;
$$;

revoke all on function public.flowtel_apply_verified_membership_server(uuid,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.flowtel_apply_verified_membership_server(uuid,text,text,text,text,text) to service_role;

comment on function public.flowtel_apply_verified_membership_server(uuid,text,text,text,text,text) is
  'Server-only exact-email application of a previously verified paid Squarespace membership. Preserves existing Auth UUID/history, never lowers membership rank, and refuses revoked Flowtel identities.';
