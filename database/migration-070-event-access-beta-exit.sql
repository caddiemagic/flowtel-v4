-- Flowtel v0.10.85 — Event Access + Beta Exit
--
-- Extends the canonical Queendom event system with:
-- - linked co-hosts
-- - editable How to Prepare guidance
-- - recording disclosure
-- - optional live-room time separate from the experience start time
-- - private Zoom / in-person details revealed only after entitlement
-- - Public / Queendom / Flow FM access tiers
-- - verified Squarespace ticket entitlements
-- - registered event-room data for the within-the-hour doorway

begin;

-- ---------------------------------------------------------------------------
-- Event experience + access fields
-- ---------------------------------------------------------------------------

alter table public.flowtel_queendom_events
  add column if not exists co_host_member_id uuid references public.profiles(id) on delete set null,
  add column if not exists co_host_name text,
  add column if not exists how_to_prepare text,
  add column if not exists attendee_guide_url text,
  add column if not exists will_be_recorded boolean not null default false,
  add column if not exists location_type text not null default 'zoom',
  add column if not exists private_location text,
  add column if not exists live_room_time time without time zone,
  add column if not exists live_room_starts_at timestamptz,
  add column if not exists public_access text not null default 'unavailable',
  add column if not exists queendom_access text not null default 'included',
  add column if not exists flowfm_access text not null default 'included',
  add column if not exists public_price numeric(12,2),
  add column if not exists queendom_price numeric(12,2),
  add column if not exists flowfm_price numeric(12,2),
  add column if not exists access_currency text not null default 'USD',
  add column if not exists ticket_url text,
  add column if not exists squarespace_product_id text;

update public.flowtel_queendom_events
set how_to_prepare = coalesce(
  nullif(trim(how_to_prepare),''),
  'Find a private space. Light a candle + incense. Make tea. Grab a journal + pen. Arrive a few minutes early and let yourself settle in.'
),
public_access = case when public_access is null or public_access='' then 'unavailable' else public_access end,
queendom_access = case
  when audience='flowfm' and (queendom_access is null or queendom_access='' or queendom_access='included') then 'unavailable'
  else coalesce(nullif(queendom_access,''),'included')
end,
flowfm_access = coalesce(nullif(flowfm_access,''),'included'),
live_room_time = coalesce(live_room_time,start_time),
live_room_starts_at = coalesce(live_room_starts_at,starts_at)
where true;

alter table public.flowtel_queendom_events
  alter column how_to_prepare set default 'Find a private space. Light a candle + incense. Make tea. Grab a journal + pen. Arrive a few minutes early and let yourself settle in.';

-- Add constraints idempotently.
do $$
begin
  if not exists (select 1 from pg_constraint where conname='flowtel_queendom_event_location_type_check') then
    alter table public.flowtel_queendom_events add constraint flowtel_queendom_event_location_type_check check (location_type in ('zoom','in_person','hybrid'));
  end if;
  if not exists (select 1 from pg_constraint where conname='flowtel_queendom_event_public_access_check') then
    alter table public.flowtel_queendom_events add constraint flowtel_queendom_event_public_access_check check (public_access in ('included','ticket','unavailable'));
  end if;
  if not exists (select 1 from pg_constraint where conname='flowtel_queendom_event_queendom_access_check') then
    alter table public.flowtel_queendom_events add constraint flowtel_queendom_event_queendom_access_check check (queendom_access in ('included','ticket','unavailable'));
  end if;
  if not exists (select 1 from pg_constraint where conname='flowtel_queendom_event_flowfm_access_check') then
    alter table public.flowtel_queendom_events add constraint flowtel_queendom_event_flowfm_access_check check (flowfm_access in ('included','ticket','unavailable'));
  end if;
  if not exists (select 1 from pg_constraint where conname='flowtel_queendom_event_currency_check') then
    alter table public.flowtel_queendom_events add constraint flowtel_queendom_event_currency_check check (access_currency ~ '^[A-Z]{3}$');
  end if;
  if not exists (select 1 from pg_constraint where conname='flowtel_queendom_event_ticket_url_check') then
    alter table public.flowtel_queendom_events add constraint flowtel_queendom_event_ticket_url_check check (ticket_url is null or ticket_url ~* '^https://');
  end if;
  if not exists (select 1 from pg_constraint where conname='flowtel_queendom_event_guide_url_check') then
    alter table public.flowtel_queendom_events add constraint flowtel_queendom_event_guide_url_check check (attendee_guide_url is null or attendee_guide_url ~* '^https://');
  end if;
  if not exists (select 1 from pg_constraint where conname='flowtel_queendom_event_price_check') then
    alter table public.flowtel_queendom_events add constraint flowtel_queendom_event_price_check check (
      (public_price is null or public_price>=0) and (queendom_price is null or queendom_price>=0) and (flowfm_price is null or flowfm_price>=0)
    );
  end if;
end;
$$;

create index if not exists flowtel_queendom_events_co_host_idx on public.flowtel_queendom_events(co_host_member_id,event_date);
create index if not exists flowtel_queendom_events_product_idx on public.flowtel_queendom_events(squarespace_product_id) where squarespace_product_id is not null;

-- ---------------------------------------------------------------------------
-- Verified ticket entitlements. buyer_email is retained even when a purchaser
-- has not created/claimed a Flowtel account yet.
-- ---------------------------------------------------------------------------

create table if not exists public.flowtel_queendom_event_entitlements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.flowtel_queendom_events(id) on delete cascade,
  member_id uuid references public.profiles(id) on delete set null,
  buyer_email text not null,
  source text not null default 'squarespace',
  source_order_id text not null,
  source_product_id text not null,
  payment_state text not null default 'PAID',
  paid_amount numeric(12,2),
  currency text,
  verified_at timestamptz not null default now(),
  revoked_at timestamptz,
  raw_context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id,source_order_id,source_product_id)
);

create index if not exists flowtel_queendom_event_entitlements_member_idx on public.flowtel_queendom_event_entitlements(member_id,event_id) where revoked_at is null;
create index if not exists flowtel_queendom_event_entitlements_email_idx on public.flowtel_queendom_event_entitlements(lower(buyer_email),event_id) where revoked_at is null;

alter table public.flowtel_queendom_event_entitlements enable row level security;
revoke all on public.flowtel_queendom_event_entitlements from anon,authenticated;

comment on table public.flowtel_queendom_event_entitlements is
  'Append-only-ish verified event admission receipts. Squarespace order/payment state is the source; revocation preserves history.';

-- ---------------------------------------------------------------------------
-- First-time member signup admissions.
--
-- Public Supabase email signup is intentionally NOT the Flowtel authorization
-- boundary. Before a first-time Queendom / Flow FM member creates an Auth user,
-- the server verifies her existing Flowtel profile or a paid Squarespace
-- membership order and writes this short-lived admission. The browser cannot
-- read or write these rows. flowtel_claim_default_access() consumes the
-- admission only after the user proves control of the same email through Auth.
-- ---------------------------------------------------------------------------

create table if not exists public.flowtel_member_signup_admissions (
  email text primary key,
  membership_type text not null check (membership_type in ('queendom','flowfm','council')),
  membership_rank integer not null check (membership_rank between 1 and 3),
  source text not null default 'squarespace-membership',
  source_order_id text,
  squarespace_contact_id text,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists flowtel_member_signup_admissions_expires_idx
  on public.flowtel_member_signup_admissions(expires_at)
  where claimed_at is null;

alter table public.flowtel_member_signup_admissions enable row level security;
revoke all on public.flowtel_member_signup_admissions from anon,authenticated;

comment on table public.flowtel_member_signup_admissions is
  'Server-only, short-lived proof that a first-time Auth email was verified against an existing Flowtel membership or a paid Squarespace membership product. Prevents public Supabase signup from granting Flowtel access by metadata alone.';


-- ---------------------------------------------------------------------------
-- Event Pass accounts.
-- Public ticket buyers can hold access to a paid event without receiving
-- Queendom / Flow FM product access. They authenticate with Supabase so paid
-- event rooms and downloads remain private, but their account cannot claim the
-- Suite or Lounge unless a real Flowtel membership is later attached.
-- ---------------------------------------------------------------------------

alter table public.flowtel_product_access
  drop constraint if exists flowtel_product_access_access_role_check;

alter table public.flowtel_product_access
  add constraint flowtel_product_access_access_role_check
  check (access_role in ('guest_house','event_pass','player','flowtel_member','practitioner','admin','owner'));

create or replace function public.flowtel_event_pass_claim_auth_user()
returns trigger
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_source text:=lower(trim(coalesce(new.raw_user_meta_data->>'source','')));
  v_email text:=lower(trim(coalesce(new.email,'')));
  v_first text:=trim(coalesce(new.raw_user_meta_data->>'first_name',''));
  v_last text:=trim(coalesce(new.raw_user_meta_data->>'last_name',''));
  v_display text:=trim(coalesce(new.raw_user_meta_data->>'display_name',''));
begin
  if v_source<>'flowtel_event_pass' or v_email='' then return new; end if;

  insert into public.profiles(
    id,email,first_name,last_name,display_name,role,membership_type,membership_rank,
    squarespace_source,squarespace_contact_email
  ) values(
    new.id,v_email,nullif(v_first,''),nullif(v_last,''),
    coalesce(nullif(v_display,''),nullif(trim(concat_ws(' ',v_first,v_last)),''),split_part(v_email,'@',1)),
    'client',null,0,'event-pass',v_email
  )
  on conflict(id) do nothing;

  insert into public.flowtel_product_access(
    user_id,flowtel_access,caddie_magic_access,access_role,access_source,flowtel_access_status
  ) values(
    new.id,false,false,'event_pass','event-pass-account','active'
  )
  on conflict(user_id) do update
  set flowtel_access=false,
      caddie_magic_access=false,
      access_role='event_pass',
      access_source='event-pass-account',
      flowtel_access_status=case when public.flowtel_product_access.flowtel_access_status='revoked' then 'revoked' else 'active' end,
      updated_at=now()
  where public.flowtel_product_access.flowtel_access=false
    and public.flowtel_product_access.caddie_magic_access=false
    and public.flowtel_product_access.access_role not in ('admin','owner','practitioner','flowtel_member');

  return new;
end;
$$;

drop trigger if exists flowtel_event_pass_claim_after_auth_user on auth.users;
create trigger flowtel_event_pass_claim_after_auth_user
  after insert on auth.users
  for each row execute function public.flowtel_event_pass_claim_auth_user();

create or replace function public.flowtel_current_user_is_event_pass()
returns boolean
language sql
stable
security definer
set search_path=public,auth
as $$
  select exists(
    select 1 from public.flowtel_product_access a
    where a.user_id=auth.uid()
      and a.access_role='event_pass'
      and a.flowtel_access=false
      and coalesce(a.flowtel_access_status,'active')<>'revoked'
  );
$$;
revoke all on function public.flowtel_current_user_is_event_pass() from public,anon,authenticated;

-- Reassert the product-access claim boundary so Event Pass and Guest House
-- accounts cannot silently promote themselves merely by visiting /client/.
create or replace function public.flowtel_claim_default_access()
returns boolean
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_user_id uuid:=auth.uid();
  v_access public.flowtel_product_access%rowtype;
  v_profile public.profiles%rowtype;
  v_admission public.flowtel_member_signup_admissions%rowtype;
  v_source text;
  v_email text;
  v_profile_rank integer:=0;
  v_access_role text:='flowtel_member';
  v_needs_admission boolean:=false;
begin
  if v_user_id is null then return false; end if;

  select lower(trim(coalesce(u.raw_user_meta_data->>'source',''))), lower(trim(coalesce(u.email,'')))
    into v_source,v_email
  from auth.users u
  where u.id=v_user_id;

  select * into v_access
  from public.flowtel_product_access
  where user_id=v_user_id
  for update;

  if v_access.user_id is not null then
    if coalesce(v_access.flowtel_access_status,'active')='revoked' then return false; end if;
    if v_access.flowtel_access then return true; end if;
    if v_access.caddie_magic_access and v_access.access_role='player' then return false; end if;
  end if;

  -- Limited Event Pass / Guest House accounts cannot self-promote merely by
  -- changing Auth metadata. They need a real existing membership profile or a
  -- fresh server-created membership admission just like every other account.
  select * into v_profile from public.profiles where id=v_user_id;
  if v_profile.id is not null then
    v_profile_rank:=greatest(
      coalesce(v_profile.membership_rank,0),
      public.flowtel_membership_rank(v_profile.membership_type),
      case when lower(coalesce(v_profile.role,'')) in ('practitioner','admin','owner') then 2 else 0 end
    );
  end if;

  -- A brand-new Auth user never receives Flowtel product access merely because
  -- client-writable metadata or a profile row claims a membership. With no
  -- existing product-access row, a server-created admission is mandatory.
  -- Existing limited accounts may also use an admission to upgrade when a real
  -- membership is purchased later.
  v_needs_admission := v_access.user_id is null or v_profile_rank<1;

  if v_needs_admission then
    if v_source in ('flowtel_guest_house','flowtel_event_pass') and v_email='' then return false; end if;

    select * into v_admission
    from public.flowtel_member_signup_admissions a
    where a.email=v_email
      and a.expires_at>now()
      and (a.claimed_by is null or a.claimed_by=v_user_id)
    for update;

    if v_admission.email is null then
      return false;
    end if;

    insert into public.profiles(
      id,email,role,membership_type,membership_rank,
      squarespace_source,squarespace_contact_id,squarespace_contact_email,
      source_updated_at
    ) values(
      v_user_id,v_email,'client',v_admission.membership_type,v_admission.membership_rank,
      v_admission.source,v_admission.squarespace_contact_id,v_email,now()
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
        source_updated_at=now();

    update public.flowtel_member_signup_admissions
    set claimed_by=v_user_id,
        claimed_at=coalesce(claimed_at,now()),
        updated_at=now()
    where email=v_admission.email;

    select * into v_profile from public.profiles where id=v_user_id;
    v_profile_rank:=greatest(
      coalesce(v_profile.membership_rank,0),
      public.flowtel_membership_rank(v_profile.membership_type),
      case when lower(coalesce(v_profile.role,'')) in ('practitioner','admin','owner') then 2 else 0 end
    );
  end if;

  if v_profile_rank<1 then return false; end if;

  v_access_role:=case
    when lower(coalesce(v_profile.role,''))='owner' then 'owner'
    when lower(coalesce(v_profile.role,''))='admin' then 'admin'
    when lower(coalesce(v_profile.role,''))='practitioner' then 'practitioner'
    else 'flowtel_member'
  end;

  insert into public.flowtel_product_access(
    user_id,flowtel_access,caddie_magic_access,access_role,access_source,flowtel_access_status
  ) values(
    v_user_id,true,coalesce(v_access.caddie_magic_access,false),v_access_role,
    case when v_access.access_role in ('guest_house','event_pass') then 'limited-account-upgraded-through-membership' else 'verified-flowtel-membership' end,
    'active'
  )
  on conflict(user_id) do update
  set flowtel_access=true,
      flowtel_access_status='active',
      access_role=excluded.access_role,
      access_source=case
        when public.flowtel_product_access.access_role in ('guest_house','event_pass') then 'limited-account-upgraded-through-membership'
        else coalesce(public.flowtel_product_access.access_source,excluded.access_source)
      end,
      updated_at=now();

  return true;
end;
$$;
revoke all on function public.flowtel_claim_default_access() from public;
grant execute on function public.flowtel_claim_default_access() to authenticated;

-- ---------------------------------------------------------------------------
-- Internal helper: current member access state for an event.
-- ---------------------------------------------------------------------------

create or replace function public.flowtel_queendom_event_access_state(p_event_id uuid,p_member_id uuid default auth.uid())
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  v_event public.flowtel_queendom_events%rowtype;
  v_rank integer := 0;
  v_email text;
  v_tier text := 'public';
  v_mode text := 'unavailable';
  v_price numeric;
  v_entitled boolean := false;
begin
  select * into v_event from public.flowtel_queendom_events where id=p_event_id;
  if v_event.id is null then return jsonb_build_object('entitled',false,'mode','unavailable','tier','public'); end if;

  if p_member_id is not null then
    v_rank := public.flowtel_queendom_event_member_rank(p_member_id);
    select lower(trim(u.email)) into v_email from auth.users u where u.id=p_member_id;
  end if;

  if v_rank>=2 then
    v_tier:='flowfm'; v_mode:=v_event.flowfm_access; v_price:=v_event.flowfm_price;
  elsif v_rank>=1 then
    v_tier:='queendom'; v_mode:=v_event.queendom_access; v_price:=v_event.queendom_price;
  else
    v_tier:='public'; v_mode:=v_event.public_access; v_price:=v_event.public_price;
  end if;

  v_entitled := v_mode='included';
  if not v_entitled and p_member_id is not null then
    v_entitled := exists(
      select 1 from public.flowtel_queendom_event_entitlements x
      where x.event_id=v_event.id and x.revoked_at is null and x.payment_state='PAID'
        and (x.member_id=p_member_id or (v_email is not null and lower(trim(x.buyer_email))=v_email))
    );
  end if;

  return jsonb_build_object(
    'tier',v_tier,'mode',v_mode,'price',v_price,'currency',v_event.access_currency,
    'entitled',v_entitled,'requires_ticket',(v_mode='ticket' and not v_entitled),
    'can_register',(v_entitled and v_event.status='published'),'ticket_url',v_event.ticket_url
  );
end;
$$;

revoke all on function public.flowtel_queendom_event_access_state(uuid,uuid) from public,anon,authenticated;

-- ---------------------------------------------------------------------------
-- Event host directory: same privacy foundation as the Flow FM world map.
-- ---------------------------------------------------------------------------

create or replace function public.flowtel_admin_list_queendom_event_hosts()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare v_result jsonb;
begin
  if not public.flowtel_current_user_is_admin_or_owner() then
    raise exception 'Only Flowtel administration may choose Queendom event hosts.' using errcode='42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'member_id',p.id,
    'display_name',coalesce(nullif(trim(pp.priestess_name),''),nullif(trim(p.display_name),''),nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),p.email,'Flow FM Priestess'),
    'profile_photo_url',coalesce(nullif(trim(pp.profile_photo_url),''),nullif(trim(p.mentor_photo_url),'')),
    'profile_status',coalesce(pp.status,'draft'),'membership_type',p.membership_type,
    'timezone',case when coalesce(p.flow_fm_team_map_opt_out,false)=false then p.timezone else null end,
    'current_time_visible',coalesce(p.flow_fm_team_map_opt_out,false)=false
  ) order by lower(coalesce(nullif(trim(pp.priestess_name),''),nullif(trim(p.display_name),''),nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),p.email))), '[]'::jsonb)
  into v_result
  from public.profiles p
  left join public.flow_fm_priestess_profiles pp on pp.member_id=p.id
  where public.flow_fm_effective_membership_rank(p.id,p.membership_type,p.membership_rank,p.role,p.flowfm_started_at,p.is_initiated)>=2;
  return v_result;
end;
$$;
revoke all on function public.flowtel_admin_list_queendom_event_hosts() from public;
grant execute on function public.flowtel_admin_list_queendom_event_hosts() to authenticated;

-- ---------------------------------------------------------------------------
-- Shared event-feed fields.
-- ---------------------------------------------------------------------------

create or replace function public.flowtel_list_queendom_events(p_month_start date default null,p_month_count integer default 6)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  v_member uuid:=auth.uid(); v_rank integer; v_start date; v_count integer:=greatest(1,least(coalesce(p_month_count,6),18)); v_end date; v_result jsonb;
begin
  if v_member is null then raise exception 'Sign in to open your upcoming events.' using errcode='42501'; end if;
  if not public.flowtel_current_user_has_product_access('flowtel') and not public.flowtel_current_user_is_event_pass() then
    raise exception 'This account does not have access to the Flowtel event calendar.' using errcode='42501';
  end if;
  v_rank:=public.flowtel_queendom_event_member_rank(v_member);
  if v_rank<1 and not public.flowtel_current_user_is_event_pass() then raise exception 'A Queendom membership is required to open this calendar.' using errcode='42501'; end if;
  v_start:=coalesce(p_month_start,date_trunc('month',(timezone('America/Los_Angeles',now()))::date)::date); v_end:=(v_start+make_interval(months=>v_count))::date;
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
    'access',public.flowtel_queendom_event_access_state(e.id,v_member),
    'is_registered',coalesce(r.cancelled_at is null and r.registered_at is not null,false),
    'can_join',(public.flowtel_queendom_event_access_state(e.id,v_member)->>'entitled')::boolean,
    'zoom_ready',(e.status='published' and nullif(trim(coalesce(e.zoom_url,'')),'') is not null),
    'registration_count',(select count(*)::integer from public.flowtel_queendom_event_registrations rr where rr.event_id=e.id and rr.cancelled_at is null)
  ) order by coalesce(e.live_room_starts_at,e.starts_at),e.title),'[]'::jsonb) into v_result
  from public.flowtel_queendom_events e
  left join public.flowtel_queendom_event_registrations r on r.event_id=e.id and r.member_id=v_member
  left join public.profiles h on h.id=e.host_member_id
  left join public.profiles ch on ch.id=e.co_host_member_id
  where e.published_at is not null and e.status in ('published','cancelled') and e.event_date>=v_start and e.event_date<v_end;
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
declare v_start date:=coalesce(p_month_start,date_trunc('month',(timezone('America/Los_Angeles',now()))::date)::date); v_count integer:=greatest(1,least(coalesce(p_month_count,3),18)); v_end date; v_result jsonb;
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
    'public_price',e.public_price,'queendom_price',e.queendom_price,'flowfm_price',e.flowfm_price,'access_currency',e.access_currency,'ticket_url',e.ticket_url
  ) order by coalesce(e.live_room_starts_at,e.starts_at),e.title),'[]'::jsonb) into v_result
  from public.flowtel_queendom_events e
  left join public.profiles h on h.id=e.host_member_id
  left join public.profiles ch on ch.id=e.co_host_member_id
  where e.published_at is not null and e.status in ('published','cancelled') and e.event_date>=v_start and e.event_date<v_end;
  return v_result;
end;
$$;
revoke all on function public.flowtel_public_queendom_events(date,integer) from public;
grant execute on function public.flowtel_public_queendom_events(date,integer) to anon,authenticated;

-- Registration is now entitlement-aware. Ticketed events cannot be saved before payment.
create or replace function public.flowtel_set_queendom_event_registration(p_event_id uuid,p_registered boolean default true)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare v_member uuid:=auth.uid(); v_event public.flowtel_queendom_events%rowtype; v_access jsonb;
begin
  if v_member is null then raise exception 'Sign in before saving an event.' using errcode='42501'; end if;
  if not public.flowtel_current_user_has_product_access('flowtel') and not public.flowtel_current_user_is_event_pass() then
    raise exception 'This account cannot register for Flowtel events.' using errcode='42501';
  end if;
  select * into v_event from public.flowtel_queendom_events where id=p_event_id;
  if v_event.id is null or v_event.published_at is null or v_event.status='cancelled' then raise exception 'That event is not available.' using errcode='22023'; end if;
  v_access:=public.flowtel_queendom_event_access_state(p_event_id,v_member);
  if coalesce(p_registered,true) and not coalesce((v_access->>'entitled')::boolean,false) then
    if v_access->>'mode'='ticket' then raise exception 'A ticket is required before you can save your seat.' using errcode='42501'; end if;
    raise exception 'This event is not included with your current access.' using errcode='42501';
  end if;
  if coalesce(p_registered,true) then
    insert into public.flowtel_queendom_event_registrations(event_id,member_id,registered_at,cancelled_at,updated_at)
    values(p_event_id,v_member,now(),null,now()) on conflict(event_id,member_id) do update set cancelled_at=null,registered_at=now(),updated_at=now();
  else
    update public.flowtel_queendom_event_registrations set cancelled_at=now(),updated_at=now() where event_id=p_event_id and member_id=v_member and cancelled_at is null;
  end if;
  return jsonb_build_object('event_id',p_event_id,'registered',coalesce(p_registered,true),'access',v_access);
end;
$$;
revoke all on function public.flowtel_set_queendom_event_registration(uuid,boolean) from public;
grant execute on function public.flowtel_set_queendom_event_registration(uuid,boolean) to authenticated;

-- Registered event room. Private preparation, guide, Zoom/passcode and exact
-- location are never included in the public/member list feeds.
create or replace function public.flowtel_get_queendom_event_join_details(p_event_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  v_member uuid:=auth.uid(); v_event public.flowtel_queendom_events%rowtype; v_access jsonb; v_registered boolean;
begin
  if v_member is null then raise exception 'Enter the Flowtel before opening this event room.' using errcode='42501'; end if;
  select * into v_event from public.flowtel_queendom_events where id=p_event_id;
  if v_event.id is null or v_event.published_at is null or v_event.status<>'published' then raise exception 'That event is not currently open.' using errcode='22023'; end if;
  v_access:=public.flowtel_queendom_event_access_state(p_event_id,v_member);
  if not coalesce((v_access->>'entitled')::boolean,false) then raise exception 'This event room opens after your event access is confirmed.' using errcode='42501'; end if;
  select exists(select 1 from public.flowtel_queendom_event_registrations r where r.event_id=p_event_id and r.member_id=v_member and r.cancelled_at is null) into v_registered;
  if not v_registered then raise exception 'Save your seat before opening the event room.' using errcode='42501'; end if;
  return jsonb_build_object(
    'event_id',v_event.id,'title',v_event.title,'event_type',v_event.event_type,'description',v_event.description,
    'event_date',v_event.event_date,'starts_at',v_event.starts_at,'ends_at',v_event.ends_at,'event_timezone',v_event.event_timezone,
    'live_room_starts_at',coalesce(v_event.live_room_starts_at,v_event.starts_at),
    'host_name',v_event.host_name,'host_member_id',v_event.host_member_id,'co_host_name',v_event.co_host_name,'co_host_member_id',v_event.co_host_member_id,
    'will_be_recorded',v_event.will_be_recorded,'how_to_prepare',v_event.how_to_prepare,'attendee_guide_url',v_event.attendee_guide_url,
    'location_type',v_event.location_type,'private_location',v_event.private_location,
    'zoom_url',v_event.zoom_url,'zoom_passcode',v_event.zoom_passcode,'access',v_access
  );
end;
$$;
revoke all on function public.flowtel_get_queendom_event_join_details(uuid) from public;
grant execute on function public.flowtel_get_queendom_event_join_details(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin list + save RPC
-- ---------------------------------------------------------------------------

create or replace function public.flowtel_admin_list_queendom_events()
returns jsonb language plpgsql stable security definer set search_path=public,auth
as $$
declare v_result jsonb;
begin
  if not public.flowtel_current_user_is_admin_or_owner() then raise exception 'Only Flowtel administration may manage Queendom events.' using errcode='42501'; end if;
  select coalesce(jsonb_agg(to_jsonb(e) || jsonb_build_object(
    'event_id',e.id,'start_time',to_char(e.start_time,'HH24:MI'),'end_time',case when e.end_time is null then null else to_char(e.end_time,'HH24:MI') end,
    'live_room_time',case when e.live_room_time is null then null else to_char(e.live_room_time,'HH24:MI') end,
    'registration_count',(select count(*)::integer from public.flowtel_queendom_event_registrations r where r.event_id=e.id and r.cancelled_at is null)
  ) order by e.event_date desc,e.start_time desc),'[]'::jsonb) into v_result from public.flowtel_queendom_events e;
  return v_result;
end;
$$;
revoke all on function public.flowtel_admin_list_queendom_events() from public;
grant execute on function public.flowtel_admin_list_queendom_events() to authenticated;

-- Drop previous 16-argument save function to avoid PostgREST overload ambiguity.
drop function if exists public.flowtel_admin_save_queendom_event(uuid,text,text,text,date,time without time zone,time without time zone,text,text,text,text,text,text,text,text,uuid);

create or replace function public.flowtel_admin_save_queendom_event(
  p_event_id uuid default null,p_title text default null,p_event_type text default 'workshop',p_description text default null,
  p_event_date date default null,p_start_time time without time zone default null,p_end_time time without time zone default null,
  p_timezone text default 'America/Los_Angeles',p_host_name text default null,p_audience text default 'queendom',
  p_zoom_url text default null,p_zoom_passcode text default null,p_image_path text default null,p_image_url text default null,
  p_status text default 'draft',p_host_member_id uuid default null,p_co_host_member_id uuid default null,
  p_how_to_prepare text default null,p_attendee_guide_url text default null,p_will_be_recorded boolean default false,
  p_location_type text default 'zoom',p_private_location text default null,p_live_room_time time without time zone default null,
  p_public_access text default 'unavailable',p_queendom_access text default 'included',p_flowfm_access text default 'included',
  p_public_price numeric default null,p_queendom_price numeric default null,p_flowfm_price numeric default null,p_access_currency text default 'USD',
  p_ticket_url text default null,p_squarespace_product_id text default null
)
returns uuid language plpgsql security definer set search_path=public,auth
as $$
declare
  v_user uuid:=auth.uid(); v_id uuid:=coalesce(p_event_id,gen_random_uuid()); v_title text:=trim(coalesce(p_title,''));
  v_host text:=nullif(trim(coalesce(p_host_name,'')),''); v_co_host text; v_timezone text:=trim(coalesce(nullif(p_timezone,''),'America/Los_Angeles'));
  v_start timestamptz; v_end timestamptz; v_live timestamptz; v_live_time time:=coalesce(p_live_room_time,p_start_time);
  v_how text:=coalesce(nullif(trim(coalesce(p_how_to_prepare,'')),''),'Find a private space. Light a candle + incense. Make tea. Grab a journal + pen. Arrive a few minutes early and let yourself settle in.');
begin
  if not public.flowtel_current_user_is_admin_or_owner() then raise exception 'Only Flowtel administration may manage Queendom events.' using errcode='42501'; end if;
  if p_event_date is null or p_start_time is null or v_title='' then raise exception 'Add the event name, date, and start time.' using errcode='22023'; end if;
  if lower(trim(coalesce(p_event_type,''))) not in ('workshop','ceremony','call','other') then raise exception 'Choose a valid event type.' using errcode='22023'; end if;
  if lower(trim(coalesce(p_audience,''))) not in ('queendom','flowfm') then raise exception 'Choose Queendom or Flow FM visibility.' using errcode='22023'; end if;
  if lower(trim(coalesce(p_status,''))) not in ('draft','published') then raise exception 'Choose Draft or Published.' using errcode='22023'; end if;
  if p_end_time is not null and p_end_time<=p_start_time then raise exception 'Event end time must be later than the start time.' using errcode='22023'; end if;
  if p_location_type not in ('zoom','in_person','hybrid') then raise exception 'Choose Zoom, In Person, or Hybrid.' using errcode='22023'; end if;
  if nullif(trim(coalesce(p_zoom_url,'')),'') is not null and p_zoom_url !~* '^https://' then raise exception 'Zoom links must begin with https://.' using errcode='22023'; end if;
  if nullif(trim(coalesce(p_attendee_guide_url,'')),'') is not null and p_attendee_guide_url !~* '^https://' then raise exception 'Attendee guide links must begin with https://.' using errcode='22023'; end if;
  if p_host_member_id is not null and p_co_host_member_id=p_host_member_id then raise exception 'Choose a different Flow FM member as the co-host.' using errcode='22023'; end if;
  if p_public_access not in ('included','ticket','unavailable') or p_queendom_access not in ('included','ticket','unavailable') or p_flowfm_access not in ('included','ticket','unavailable') then raise exception 'Choose a valid access rule for each membership tier.' using errcode='22023'; end if;
  if (p_public_access='ticket' and p_public_price is null) or (p_queendom_access='ticket' and p_queendom_price is null) or (p_flowfm_access='ticket' and p_flowfm_price is null) then raise exception 'Add a price for every ticket-required tier.' using errcode='22023'; end if;
  if (p_public_access='ticket' or p_queendom_access='ticket' or p_flowfm_access='ticket') and nullif(trim(coalesce(p_ticket_url,'')),'') is null then raise exception 'Ticketed events need a Buy Ticket link.' using errcode='22023'; end if;
  if (p_public_access='ticket' or p_queendom_access='ticket' or p_flowfm_access='ticket') and nullif(trim(coalesce(p_squarespace_product_id,'')),'') is null then raise exception 'Ticketed events need the Squarespace product ID so Flowtel can verify payment.' using errcode='22023'; end if;
  if nullif(trim(coalesce(p_ticket_url,'')),'') is not null and p_ticket_url !~* '^https://' then raise exception 'Buy Ticket links must begin with https://.' using errcode='22023'; end if;
  if p_host_member_id is not null then
    select coalesce(nullif(trim(pp.priestess_name),''),nullif(trim(p.display_name),''),nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),p.email) into v_host
    from public.profiles p left join public.flow_fm_priestess_profiles pp on pp.member_id=p.id
    where p.id=p_host_member_id and public.flow_fm_effective_membership_rank(p.id,p.membership_type,p.membership_rank,p.role,p.flowfm_started_at,p.is_initiated)>=2;
    if not found then raise exception 'Choose a current Flow FM member as the host.' using errcode='22023'; end if;
  end if;
  if p_co_host_member_id is not null then
    select coalesce(nullif(trim(pp.priestess_name),''),nullif(trim(p.display_name),''),nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),p.email) into v_co_host
    from public.profiles p left join public.flow_fm_priestess_profiles pp on pp.member_id=p.id
    where p.id=p_co_host_member_id and public.flow_fm_effective_membership_rank(p.id,p.membership_type,p.membership_rank,p.role,p.flowfm_started_at,p.is_initiated)>=2;
    if not found then raise exception 'Choose a current Flow FM member as the co-host.' using errcode='22023'; end if;
  end if;
  begin perform timezone(v_timezone,now()); exception when others then raise exception 'Choose a valid timezone.' using errcode='22023'; end;
  v_start:=(p_event_date+p_start_time) at time zone v_timezone;
  if p_end_time is not null then v_end:=(p_event_date+p_end_time) at time zone v_timezone; end if;
  v_live:=(p_event_date+v_live_time) at time zone v_timezone;
  insert into public.flowtel_queendom_events(
    id,title,event_type,description,event_date,start_time,end_time,event_timezone,starts_at,ends_at,host_name,host_member_id,co_host_name,co_host_member_id,
    audience,zoom_url,zoom_passcode,image_path,image_url,status,published_at,cancelled_at,created_by,updated_by,created_at,updated_at,
    how_to_prepare,attendee_guide_url,will_be_recorded,location_type,private_location,live_room_time,live_room_starts_at,
    public_access,queendom_access,flowfm_access,public_price,queendom_price,flowfm_price,access_currency,ticket_url,squarespace_product_id
  ) values(
    v_id,v_title,lower(trim(coalesce(p_event_type,'workshop'))),nullif(trim(coalesce(p_description,'')),''),p_event_date,p_start_time,p_end_time,v_timezone,v_start,v_end,
    v_host,p_host_member_id,v_co_host,p_co_host_member_id,lower(trim(coalesce(p_audience,'queendom'))),nullif(trim(coalesce(p_zoom_url,'')),''),nullif(trim(coalesce(p_zoom_passcode,'')),''),
    nullif(trim(coalesce(p_image_path,'')),''),nullif(trim(coalesce(p_image_url,'')),''),lower(trim(coalesce(p_status,'draft'))),case when lower(trim(coalesce(p_status,'draft')))='published' then now() else null end,null,
    v_user,v_user,now(),now(),v_how,nullif(trim(coalesce(p_attendee_guide_url,'')),''),coalesce(p_will_be_recorded,false),p_location_type,nullif(trim(coalesce(p_private_location,'')),''),v_live_time,v_live,
    p_public_access,p_queendom_access,p_flowfm_access,p_public_price,p_queendom_price,p_flowfm_price,upper(coalesce(nullif(trim(p_access_currency),''),'USD')),nullif(trim(coalesce(p_ticket_url,'')),''),nullif(trim(coalesce(p_squarespace_product_id,'')),'')
  ) on conflict(id) do update set
    title=excluded.title,event_type=excluded.event_type,description=excluded.description,event_date=excluded.event_date,start_time=excluded.start_time,end_time=excluded.end_time,event_timezone=excluded.event_timezone,
    starts_at=excluded.starts_at,ends_at=excluded.ends_at,host_name=excluded.host_name,host_member_id=excluded.host_member_id,co_host_name=excluded.co_host_name,co_host_member_id=excluded.co_host_member_id,
    audience=excluded.audience,zoom_url=excluded.zoom_url,zoom_passcode=excluded.zoom_passcode,image_path=excluded.image_path,image_url=excluded.image_url,status=excluded.status,
    published_at=case when excluded.status='published' then coalesce(public.flowtel_queendom_events.published_at,now()) else public.flowtel_queendom_events.published_at end,cancelled_at=null,updated_by=v_user,updated_at=now(),
    how_to_prepare=excluded.how_to_prepare,attendee_guide_url=excluded.attendee_guide_url,will_be_recorded=excluded.will_be_recorded,location_type=excluded.location_type,private_location=excluded.private_location,
    live_room_time=excluded.live_room_time,live_room_starts_at=excluded.live_room_starts_at,public_access=excluded.public_access,queendom_access=excluded.queendom_access,flowfm_access=excluded.flowfm_access,
    public_price=excluded.public_price,queendom_price=excluded.queendom_price,flowfm_price=excluded.flowfm_price,access_currency=excluded.access_currency,ticket_url=excluded.ticket_url,squarespace_product_id=excluded.squarespace_product_id;
  return v_id;
end;
$$;

revoke all on function public.flowtel_admin_save_queendom_event(uuid,text,text,text,date,time without time zone,time without time zone,text,text,text,text,text,text,text,text,uuid,uuid,text,text,boolean,text,text,time without time zone,text,text,text,numeric,numeric,numeric,text,text,text) from public;
grant execute on function public.flowtel_admin_save_queendom_event(uuid,text,text,text,date,time without time zone,time without time zone,text,text,text,text,text,text,text,text,uuid,uuid,text,text,boolean,text,text,time without time zone,text,text,text,numeric,numeric,numeric,text,text,text) to authenticated;

notify pgrst, 'reload schema';
commit;
