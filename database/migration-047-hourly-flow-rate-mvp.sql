-- Flowtel v0.10.57 — Hourly Flow Rate MVP
--
-- Private Flow FM receiving-standard experience. The member begins with one
-- preserved future seasonal cycle, then adds optional monetary layers. The
-- authoritative formula is fixed at 480 annual Self-Care Hours and a 2x Flow
-- Multiplier. All member writes pass through ownership-aware RPCs.
--
-- Flowtel Time remains America/Los_Angeles. Migration 037 remains retired and
-- must never be rerun.

create table if not exists public.flowtel_hourly_flow_rate_plans (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  base_currency text not null default 'USD',
  planning_started_on date not null,
  starts_with_season text not null,
  starts_with_year integer not null,
  last_open_section text,
  witness_reflection text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint flowtel_hfr_plan_currency_check check (base_currency ~ '^[A-Z]{3}$'),
  constraint flowtel_hfr_plan_start_season_check check (starts_with_season in ('spring','summer','autumn','winter'))
);

create unique index if not exists flowtel_hfr_one_plan_per_member_idx
  on public.flowtel_hourly_flow_rate_plans(member_id);

create table if not exists public.flowtel_hourly_flow_rate_seasons (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.flowtel_hourly_flow_rate_plans(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  sort_order integer not null,
  season_key text not null,
  starts_on date not null,
  ends_on date not null,
  city text,
  region text,
  country text,
  calling_reflection text,
  inspiration_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint flowtel_hfr_season_sort_check check (sort_order between 1 and 4),
  constraint flowtel_hfr_season_key_check check (season_key in ('spring','summer','autumn','winter')),
  constraint flowtel_hfr_season_dates_check check (ends_on >= starts_on),
  constraint flowtel_hfr_season_plan_order_unique unique(plan_id, sort_order),
  constraint flowtel_hfr_season_plan_key_unique unique(plan_id, season_key)
);

create index if not exists flowtel_hfr_seasons_member_idx
  on public.flowtel_hourly_flow_rate_seasons(member_id, sort_order);

create table if not exists public.flowtel_hourly_flow_rate_cost_entries (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.flowtel_hourly_flow_rate_plans(id) on delete cascade,
  season_id uuid not null references public.flowtel_hourly_flow_rate_seasons(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  layer_key text not null,
  entry_mode text not null default 'detailed',
  label text,
  source_url text,
  starts_on date,
  ends_on date,
  quantity numeric(12,2),
  frequency_label text,
  fees_status text,
  base_amount numeric(14,2) not null,
  original_amount numeric(14,2),
  original_currency text,
  private_note text,
  researched_on date not null default ((timezone('America/Los_Angeles', now()))::date),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint flowtel_hfr_cost_layer_check check (layer_key in ('lodging','nourishment','self_care','transitions','pleasure_support')),
  constraint flowtel_hfr_cost_mode_check check (entry_mode in ('estimate','detailed')),
  constraint flowtel_hfr_cost_nonnegative_check check (base_amount >= 0 and (original_amount is null or original_amount >= 0)),
  constraint flowtel_hfr_cost_original_currency_check check (original_currency is null or original_currency ~ '^[A-Z]{3}$'),
  constraint flowtel_hfr_cost_original_pair_check check ((original_amount is null and original_currency is null) or (original_amount is not null and original_currency is not null)),
  constraint flowtel_hfr_cost_dates_check check (starts_on is null or ends_on is null or ends_on >= starts_on),
  constraint flowtel_hfr_cost_fees_check check (fees_status is null or fees_status in ('yes','no','unsure'))
);

create index if not exists flowtel_hfr_costs_plan_layer_idx
  on public.flowtel_hourly_flow_rate_cost_entries(plan_id, season_id, layer_key, created_at);
create unique index if not exists flowtel_hfr_one_estimate_per_layer_idx
  on public.flowtel_hourly_flow_rate_cost_entries(plan_id, season_id, layer_key)
  where entry_mode = 'estimate';

create table if not exists public.flowtel_hourly_flow_rate_home_base (
  plan_id uuid primary key references public.flowtel_hourly_flow_rate_plans(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  monthly_amount numeric(14,2) not null default 0,
  reviewed_on date,
  privately_confirmed boolean not null default false,
  private_reflection text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint flowtel_hfr_home_base_nonnegative_check check (monthly_amount >= 0)
);

create table if not exists public.flowtel_hourly_flow_rate_snapshots (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.flowtel_hourly_flow_rate_plans(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  layer_key text,
  season_id uuid references public.flowtel_hourly_flow_rate_seasons(id) on delete set null,
  annual_home_base numeric(14,2) not null,
  seasonal_freedom numeric(14,2) not null,
  annual_vision_total numeric(14,2) not null,
  base_hourly_rate numeric(14,2) not null,
  hourly_flow_rate numeric(14,2) not null,
  base_currency text not null,
  flowing_layers integer not null default 0,
  created_at timestamptz not null default now(),
  constraint flowtel_hfr_snapshot_currency_check check (base_currency ~ '^[A-Z]{3}$')
);

create index if not exists flowtel_hfr_snapshots_plan_created_idx
  on public.flowtel_hourly_flow_rate_snapshots(plan_id, created_at desc);

alter table public.flowtel_hourly_flow_rate_plans enable row level security;
alter table public.flowtel_hourly_flow_rate_seasons enable row level security;
alter table public.flowtel_hourly_flow_rate_cost_entries enable row level security;
alter table public.flowtel_hourly_flow_rate_home_base enable row level security;
alter table public.flowtel_hourly_flow_rate_snapshots enable row level security;

revoke all on public.flowtel_hourly_flow_rate_plans from anon;
revoke all on public.flowtel_hourly_flow_rate_seasons from anon;
revoke all on public.flowtel_hourly_flow_rate_cost_entries from anon;
revoke all on public.flowtel_hourly_flow_rate_home_base from anon;
revoke all on public.flowtel_hourly_flow_rate_snapshots from anon;
revoke insert, update, delete on public.flowtel_hourly_flow_rate_plans from authenticated;
revoke insert, update, delete on public.flowtel_hourly_flow_rate_seasons from authenticated;
revoke insert, update, delete on public.flowtel_hourly_flow_rate_cost_entries from authenticated;
revoke insert, update, delete on public.flowtel_hourly_flow_rate_home_base from authenticated;
revoke insert, update, delete on public.flowtel_hourly_flow_rate_snapshots from authenticated;
grant select on public.flowtel_hourly_flow_rate_plans to authenticated;
grant select on public.flowtel_hourly_flow_rate_seasons to authenticated;
grant select on public.flowtel_hourly_flow_rate_cost_entries to authenticated;
grant select on public.flowtel_hourly_flow_rate_home_base to authenticated;
grant select on public.flowtel_hourly_flow_rate_snapshots to authenticated;

create or replace function public.flowtel_hfr_current_user_is_eligible()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select auth.uid() is not null
    and public.flowtel_current_user_has_product_access('flowtel')
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and (
          lower(trim(coalesce(p.role,''))) in ('owner','admin')
          or public.flow_fm_effective_membership_rank(
            p.id,p.membership_type,p.membership_rank,p.role,p.flowfm_started_at,p.is_initiated
          ) >= 2
        )
    );
$$;

revoke all on function public.flowtel_hfr_current_user_is_eligible() from public;
grant execute on function public.flowtel_hfr_current_user_is_eligible() to authenticated;

create or replace function public.flowtel_hfr_require_member()
returns uuid
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in through the Flowtel doorway to open this room.' using errcode = '28000';
  end if;
  if not public.flowtel_hfr_current_user_is_eligible() then
    raise exception 'The Hourly Flow Rate room is reserved for Flow FM members.' using errcode = '42501';
  end if;
  return auth.uid();
end;
$$;

revoke all on function public.flowtel_hfr_require_member() from public;
grant execute on function public.flowtel_hfr_require_member() to authenticated;

-- Read policies are deliberately member-owned. Writes remain RPC-only.
drop policy if exists "Members read their Hourly Flow Rate plans" on public.flowtel_hourly_flow_rate_plans;
create policy "Members read their Hourly Flow Rate plans"
  on public.flowtel_hourly_flow_rate_plans for select to authenticated
  using (member_id = auth.uid() and public.flowtel_hfr_current_user_is_eligible());

drop policy if exists "Members read their Hourly Flow Rate seasons" on public.flowtel_hourly_flow_rate_seasons;
create policy "Members read their Hourly Flow Rate seasons"
  on public.flowtel_hourly_flow_rate_seasons for select to authenticated
  using (member_id = auth.uid() and public.flowtel_hfr_current_user_is_eligible());

drop policy if exists "Members read their Hourly Flow Rate costs" on public.flowtel_hourly_flow_rate_cost_entries;
create policy "Members read their Hourly Flow Rate costs"
  on public.flowtel_hourly_flow_rate_cost_entries for select to authenticated
  using (member_id = auth.uid() and public.flowtel_hfr_current_user_is_eligible());

drop policy if exists "Members read their Hourly Flow Rate home base" on public.flowtel_hourly_flow_rate_home_base;
create policy "Members read their Hourly Flow Rate home base"
  on public.flowtel_hourly_flow_rate_home_base for select to authenticated
  using (member_id = auth.uid() and public.flowtel_hfr_current_user_is_eligible());

drop policy if exists "Members read their Hourly Flow Rate timeline" on public.flowtel_hourly_flow_rate_snapshots;
create policy "Members read their Hourly Flow Rate timeline"
  on public.flowtel_hourly_flow_rate_snapshots for select to authenticated
  using (member_id = auth.uid() and public.flowtel_hfr_current_user_is_eligible());

create or replace function public.flowtel_hfr_calculation(p_plan_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with home as (
    select coalesce(max(h.monthly_amount),0)::numeric as monthly_amount
    from public.flowtel_hourly_flow_rate_home_base h
    where h.plan_id = p_plan_id
  ), effective_costs as (
    select c.*
    from public.flowtel_hourly_flow_rate_cost_entries c
    where c.plan_id = p_plan_id
      and c.base_amount > 0
      and (
        c.layer_key = 'lodging'
        or (
          c.entry_mode = 'detailed'
          and exists (
            select 1 from public.flowtel_hourly_flow_rate_cost_entries d
            where d.plan_id = c.plan_id and d.season_id = c.season_id
              and d.layer_key = c.layer_key and d.entry_mode = 'detailed' and d.base_amount > 0
          )
        )
        or (
          c.entry_mode = 'estimate'
          and not exists (
            select 1 from public.flowtel_hourly_flow_rate_cost_entries d
            where d.plan_id = c.plan_id and d.season_id = c.season_id
              and d.layer_key = c.layer_key and d.entry_mode = 'detailed' and d.base_amount > 0
          )
        )
      )
  ), totals as (
    select
      round((select monthly_amount from home) * 12,2) as annual_home_base,
      round(coalesce((select sum(base_amount) from effective_costs),0),2) as seasonal_freedom
  ), rates as (
    select
      annual_home_base,
      seasonal_freedom,
      round(annual_home_base + seasonal_freedom,2) as annual_vision_total,
      round((annual_home_base + seasonal_freedom) / 480.0,2) as base_hourly_rate,
      round(((annual_home_base + seasonal_freedom) / 480.0) * 2.0,2) as hourly_flow_rate
    from totals
  ), layers as (
    select count(*)::integer as flowing_layers
    from (
      select 'home_base'::text as key where (select monthly_amount from home) > 0
      union all
      select concat(season_id::text,':',layer_key)
      from effective_costs
      group by season_id, layer_key
    ) x
  )
  select jsonb_build_object(
    'annual_home_base',r.annual_home_base,
    'seasonal_freedom',r.seasonal_freedom,
    'annual_vision_total',r.annual_vision_total,
    'base_hourly_rate',r.base_hourly_rate,
    'flow_multiplier',2.00,
    'annual_self_care_hours',480,
    'hourly_flow_rate',r.hourly_flow_rate,
    'has_monetary_value',r.annual_vision_total > 0,
    'flowing_layers',(select flowing_layers from layers)
  )
  from rates r;
$$;

revoke all on function public.flowtel_hfr_calculation(uuid) from public;

create or replace function public.flowtel_hfr_capture_snapshot(
  p_plan_id uuid,
  p_reason text,
  p_layer_key text default null,
  p_season_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan public.flowtel_hourly_flow_rate_plans%rowtype;
  v_calc jsonb;
  v_last numeric(14,2);
begin
  select * into v_plan from public.flowtel_hourly_flow_rate_plans where id = p_plan_id;
  if v_plan.id is null then return; end if;

  v_calc := public.flowtel_hfr_calculation(p_plan_id);
  if not coalesce((v_calc ->> 'has_monetary_value')::boolean,false) then return; end if;

  select hourly_flow_rate into v_last
  from public.flowtel_hourly_flow_rate_snapshots
  where plan_id = p_plan_id
  order by created_at desc, id desc limit 1;

  if v_last is not null and v_last = (v_calc ->> 'hourly_flow_rate')::numeric then return; end if;

  insert into public.flowtel_hourly_flow_rate_snapshots(
    plan_id,member_id,reason,layer_key,season_id,annual_home_base,seasonal_freedom,
    annual_vision_total,base_hourly_rate,hourly_flow_rate,base_currency,flowing_layers
  ) values (
    v_plan.id,v_plan.member_id,left(coalesce(nullif(trim(p_reason),''),'Vision expanded'),180),
    p_layer_key,p_season_id,
    (v_calc ->> 'annual_home_base')::numeric,
    (v_calc ->> 'seasonal_freedom')::numeric,
    (v_calc ->> 'annual_vision_total')::numeric,
    (v_calc ->> 'base_hourly_rate')::numeric,
    (v_calc ->> 'hourly_flow_rate')::numeric,
    v_plan.base_currency,
    coalesce((v_calc ->> 'flowing_layers')::integer,0)
  );
end;
$$;

revoke all on function public.flowtel_hfr_capture_snapshot(uuid,text,text,uuid) from public;

create or replace function public.flowtel_hfr_load_plan(p_create_if_missing boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member uuid := public.flowtel_hfr_require_member();
  v_plan public.flowtel_hourly_flow_rate_plans%rowtype;
  v_today date := (timezone('America/Los_Angeles', now()))::date;
  v_first_index integer;
  v_first_year integer;
  v_index integer;
  v_year integer;
  v_key text;
  v_start date;
  v_end date;
  v_offset integer;
begin
  select * into v_plan
  from public.flowtel_hourly_flow_rate_plans
  where member_id = v_member
  order by created_at asc limit 1;

  if v_plan.id is null and p_create_if_missing then
    if extract(month from v_today)::integer = 1 then
      v_first_index := 1; v_first_year := extract(year from v_today)::integer;
    elsif extract(month from v_today)::integer between 2 and 4 then
      v_first_index := 2; v_first_year := extract(year from v_today)::integer;
    elsif extract(month from v_today)::integer between 5 and 7 then
      v_first_index := 3; v_first_year := extract(year from v_today)::integer;
    elsif extract(month from v_today)::integer between 8 and 10 then
      v_first_index := 4; v_first_year := extract(year from v_today)::integer;
    else
      v_first_index := 1; v_first_year := extract(year from v_today)::integer + 1;
    end if;

    v_key := (array['spring','summer','autumn','winter'])[v_first_index];
    insert into public.flowtel_hourly_flow_rate_plans(
      member_id,base_currency,planning_started_on,starts_with_season,starts_with_year,last_open_section
    ) values (v_member,'USD',v_today,v_key,v_first_year,'seasonal-map')
    returning * into v_plan;

    for v_offset in 0..3 loop
      v_index := mod((v_first_index - 1) + v_offset,4) + 1;
      v_year := v_first_year + floor(((v_first_index - 1) + v_offset) / 4.0)::integer;
      v_key := (array['spring','summer','autumn','winter'])[v_index];
      if v_key = 'spring' then v_start := make_date(v_year,2,1); v_end := make_date(v_year,4,30);
      elsif v_key = 'summer' then v_start := make_date(v_year,5,1); v_end := make_date(v_year,7,31);
      elsif v_key = 'autumn' then v_start := make_date(v_year,8,1); v_end := make_date(v_year,10,31);
      else v_start := make_date(v_year,11,1); v_end := make_date(v_year + 1,1,31);
      end if;
      insert into public.flowtel_hourly_flow_rate_seasons(
        plan_id,member_id,sort_order,season_key,starts_on,ends_on
      ) values (v_plan.id,v_member,v_offset + 1,v_key,v_start,v_end);
    end loop;
  end if;

  if v_plan.id is null then return null; end if;

  return jsonb_build_object(
    'plan',to_jsonb(v_plan),
    'seasons',coalesce((
      select jsonb_agg(to_jsonb(s) order by s.sort_order)
      from public.flowtel_hourly_flow_rate_seasons s where s.plan_id = v_plan.id
    ),'[]'::jsonb),
    'cost_entries',coalesce((
      select jsonb_agg(to_jsonb(c) order by c.created_at,c.id)
      from public.flowtel_hourly_flow_rate_cost_entries c where c.plan_id = v_plan.id
    ),'[]'::jsonb),
    'home_base',(
      select to_jsonb(h) from public.flowtel_hourly_flow_rate_home_base h where h.plan_id = v_plan.id
    ),
    'snapshots',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id desc)
      from (
        select * from public.flowtel_hourly_flow_rate_snapshots s
        where s.plan_id = v_plan.id order by s.created_at desc,s.id desc limit 24
      ) x
    ),'[]'::jsonb),
    'calculation',public.flowtel_hfr_calculation(v_plan.id)
  );
end;
$$;

revoke all on function public.flowtel_hfr_load_plan(boolean) from public;
grant execute on function public.flowtel_hfr_load_plan(boolean) to authenticated;

create or replace function public.flowtel_hfr_save_plan_state(
  p_plan_id uuid,
  p_last_open_section text default null,
  p_witness_reflection text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_member uuid := public.flowtel_hfr_require_member();
begin
  update public.flowtel_hourly_flow_rate_plans
  set last_open_section = coalesce(nullif(trim(p_last_open_section),''),last_open_section),
      witness_reflection = case when p_witness_reflection is null then witness_reflection else nullif(trim(p_witness_reflection),'') end,
      updated_at = now()
  where id = p_plan_id and member_id = v_member;
  if not found then raise exception 'This receiving plan is not available.' using errcode = '42501'; end if;
  return public.flowtel_hfr_load_plan(false);
end;
$$;

revoke all on function public.flowtel_hfr_save_plan_state(uuid,text,text) from public;
grant execute on function public.flowtel_hfr_save_plan_state(uuid,text,text) to authenticated;

create or replace function public.flowtel_hfr_set_base_currency(p_plan_id uuid,p_base_currency text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member uuid := public.flowtel_hfr_require_member();
  v_currency text := upper(trim(coalesce(p_base_currency,'')));
  v_current text;
  v_has_money boolean;
begin
  if v_currency !~ '^[A-Z]{3}$' then raise exception 'Choose a three-letter base currency.'; end if;
  select base_currency into v_current from public.flowtel_hourly_flow_rate_plans where id=p_plan_id and member_id=v_member;
  if v_current is null then raise exception 'This receiving plan is not available.' using errcode='42501'; end if;
  select exists(select 1 from public.flowtel_hourly_flow_rate_cost_entries where plan_id=p_plan_id and base_amount>0)
      or exists(select 1 from public.flowtel_hourly_flow_rate_home_base where plan_id=p_plan_id and monthly_amount>0)
    into v_has_money;
  if v_has_money and v_currency <> v_current then
    raise exception 'Your base currency is held steady after money begins flowing. Remove monetary entries before changing it.';
  end if;
  update public.flowtel_hourly_flow_rate_plans set base_currency=v_currency,updated_at=now() where id=p_plan_id;
  return public.flowtel_hfr_load_plan(false);
end;
$$;

revoke all on function public.flowtel_hfr_set_base_currency(uuid,text) from public;
grant execute on function public.flowtel_hfr_set_base_currency(uuid,text) to authenticated;

create or replace function public.flowtel_hfr_save_destination(
  p_season_id uuid,p_city text,p_region text,p_country text,p_calling_reflection text,p_inspiration_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member uuid := public.flowtel_hfr_require_member();
  v_plan_id uuid;
begin
  update public.flowtel_hourly_flow_rate_seasons
  set city=nullif(trim(p_city),''),region=nullif(trim(p_region),''),country=nullif(trim(p_country),''),
      calling_reflection=nullif(trim(p_calling_reflection),''),inspiration_url=nullif(trim(p_inspiration_url),''),updated_at=now()
  where id=p_season_id and member_id=v_member
  returning plan_id into v_plan_id;
  if v_plan_id is null then raise exception 'This season is not available.' using errcode='42501'; end if;
  update public.flowtel_hourly_flow_rate_plans set last_open_section='season-'||p_season_id::text,updated_at=now() where id=v_plan_id;
  return public.flowtel_hfr_load_plan(false);
end;
$$;

revoke all on function public.flowtel_hfr_save_destination(uuid,text,text,text,text,text) from public;
grant execute on function public.flowtel_hfr_save_destination(uuid,text,text,text,text,text) to authenticated;

create or replace function public.flowtel_hfr_save_cost_entry(
  p_plan_id uuid,
  p_season_id uuid,
  p_layer_key text,
  p_entry_mode text,
  p_base_amount numeric,
  p_entry_id uuid default null,
  p_label text default null,
  p_source_url text default null,
  p_starts_on date default null,
  p_ends_on date default null,
  p_quantity numeric default null,
  p_frequency_label text default null,
  p_fees_status text default null,
  p_original_amount numeric default null,
  p_original_currency text default null,
  p_private_note text default null,
  p_researched_on date default null,
  p_details jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member uuid := public.flowtel_hfr_require_member();
  v_id uuid := p_entry_id;
  v_layer text := lower(trim(coalesce(p_layer_key,'')));
  v_mode text := lower(trim(coalesce(p_entry_mode,'detailed')));
  v_amount numeric(14,2) := round(coalesce(p_base_amount,0)::numeric,2);
  v_original_currency text := nullif(upper(trim(coalesce(p_original_currency,''))), '');
  v_reason text;
begin
  if v_layer not in ('lodging','nourishment','self_care','transitions','pleasure_support') then raise exception 'Choose a valid receiving layer.'; end if;
  if v_mode not in ('estimate','detailed') then raise exception 'Choose a valid entry depth.'; end if;
  if v_amount < 0 or coalesce(p_original_amount,0) < 0 then raise exception 'Costs must be zero or positive.'; end if;
  if v_original_currency is not null and v_original_currency !~ '^[A-Z]{3}$' then raise exception 'Original currency must use a three-letter code.'; end if;
  if (p_original_amount is null) <> (v_original_currency is null) then raise exception 'Original amount and original currency must be saved together.'; end if;
  if p_starts_on is not null and p_ends_on is not null and p_ends_on < p_starts_on then raise exception 'The ending date must follow the starting date.'; end if;
  if not exists(select 1 from public.flowtel_hourly_flow_rate_plans where id=p_plan_id and member_id=v_member) then raise exception 'This receiving plan is not available.' using errcode='42501'; end if;
  if not exists(select 1 from public.flowtel_hourly_flow_rate_seasons where id=p_season_id and plan_id=p_plan_id and member_id=v_member) then raise exception 'This season is not available.' using errcode='42501'; end if;

  if v_id is null and v_mode='estimate' then
    select id into v_id from public.flowtel_hourly_flow_rate_cost_entries
    where plan_id=p_plan_id and season_id=p_season_id and layer_key=v_layer and entry_mode='estimate';
  end if;

  if v_id is null then
    insert into public.flowtel_hourly_flow_rate_cost_entries(
      plan_id,season_id,member_id,layer_key,entry_mode,label,source_url,starts_on,ends_on,quantity,
      frequency_label,fees_status,base_amount,original_amount,original_currency,private_note,researched_on,details
    ) values (
      p_plan_id,p_season_id,v_member,v_layer,v_mode,nullif(trim(p_label),''),nullif(trim(p_source_url),''),
      p_starts_on,p_ends_on,p_quantity,nullif(trim(p_frequency_label),''),nullif(lower(trim(coalesce(p_fees_status,''))),''),
      v_amount,case when p_original_amount is null then null else round(p_original_amount::numeric,2) end,
      v_original_currency,nullif(trim(p_private_note),''),
      coalesce(p_researched_on,(timezone('America/Los_Angeles', now()))::date),coalesce(p_details,'{}'::jsonb)
    ) returning id into v_id;
  else
    update public.flowtel_hourly_flow_rate_cost_entries
    set layer_key=v_layer,entry_mode=v_mode,label=nullif(trim(p_label),''),source_url=nullif(trim(p_source_url),''),
        starts_on=p_starts_on,ends_on=p_ends_on,quantity=p_quantity,frequency_label=nullif(trim(p_frequency_label),''),
        fees_status=nullif(lower(trim(coalesce(p_fees_status,''))),''),base_amount=v_amount,
        original_amount=case when p_original_amount is null then null else round(p_original_amount::numeric,2) end,
        original_currency=v_original_currency,private_note=nullif(trim(p_private_note),''),
        researched_on=coalesce(p_researched_on,researched_on),details=coalesce(p_details,'{}'::jsonb),updated_at=now()
    where id=v_id and plan_id=p_plan_id and season_id=p_season_id and member_id=v_member;
    if not found then raise exception 'This saved cost is not available.' using errcode='42501'; end if;
  end if;

  update public.flowtel_hourly_flow_rate_plans set last_open_section='season-'||p_season_id::text,updated_at=now() where id=p_plan_id;
  v_reason := case v_layer
    when 'lodging' then 'A seasonal home was added'
    when 'nourishment' then 'Seasonal nourishment was resourced'
    when 'self_care' then 'Sovereign self-care was resourced'
    when 'transitions' then 'A seasonal transition was resourced'
    else 'Pleasure and support expanded'
  end;
  perform public.flowtel_hfr_capture_snapshot(p_plan_id,v_reason,v_layer,p_season_id);
  return public.flowtel_hfr_load_plan(false);
end;
$$;

revoke all on function public.flowtel_hfr_save_cost_entry(uuid,uuid,text,text,numeric,uuid,text,text,date,date,numeric,text,text,numeric,text,text,date,jsonb) from public;
grant execute on function public.flowtel_hfr_save_cost_entry(uuid,uuid,text,text,numeric,uuid,text,text,date,date,numeric,text,text,numeric,text,text,date,jsonb) to authenticated;

create or replace function public.flowtel_hfr_delete_cost_entry(p_entry_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member uuid := public.flowtel_hfr_require_member();
  v_plan_id uuid;
  v_season_id uuid;
  v_layer text;
begin
  delete from public.flowtel_hourly_flow_rate_cost_entries
  where id=p_entry_id and member_id=v_member
  returning plan_id,season_id,layer_key into v_plan_id,v_season_id,v_layer;
  if v_plan_id is null then raise exception 'This saved cost is not available.' using errcode='42501'; end if;
  perform public.flowtel_hfr_capture_snapshot(v_plan_id,'A receiving layer was gently revised',v_layer,v_season_id);
  return public.flowtel_hfr_load_plan(false);
end;
$$;

revoke all on function public.flowtel_hfr_delete_cost_entry(uuid) from public;
grant execute on function public.flowtel_hfr_delete_cost_entry(uuid) to authenticated;

create or replace function public.flowtel_hfr_save_home_base(
  p_plan_id uuid,p_monthly_amount numeric,p_reviewed_on date default null,
  p_privately_confirmed boolean default false,p_private_reflection text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member uuid := public.flowtel_hfr_require_member();
  v_amount numeric(14,2) := round(coalesce(p_monthly_amount,0)::numeric,2);
begin
  if v_amount < 0 then raise exception 'The Home Base Number must be zero or positive.'; end if;
  if not exists(select 1 from public.flowtel_hourly_flow_rate_plans where id=p_plan_id and member_id=v_member) then raise exception 'This receiving plan is not available.' using errcode='42501'; end if;
  insert into public.flowtel_hourly_flow_rate_home_base(
    plan_id,member_id,monthly_amount,reviewed_on,privately_confirmed,private_reflection
  ) values (p_plan_id,v_member,v_amount,p_reviewed_on,coalesce(p_privately_confirmed,false),nullif(trim(p_private_reflection),''))
  on conflict(plan_id) do update set
    monthly_amount=excluded.monthly_amount,reviewed_on=excluded.reviewed_on,
    privately_confirmed=excluded.privately_confirmed,private_reflection=excluded.private_reflection,updated_at=now();
  update public.flowtel_hourly_flow_rate_plans set last_open_section='home-base',updated_at=now() where id=p_plan_id;
  perform public.flowtel_hfr_capture_snapshot(p_plan_id,'The Home Base was welcomed into the vision','home_base',null);
  return public.flowtel_hfr_load_plan(false);
end;
$$;

revoke all on function public.flowtel_hfr_save_home_base(uuid,numeric,date,boolean,text) from public;
grant execute on function public.flowtel_hfr_save_home_base(uuid,numeric,date,boolean,text) to authenticated;

comment on table public.flowtel_hourly_flow_rate_plans is
  'One private, preserved Hourly Flow Rate planning cycle per eligible Flow FM member.';
comment on table public.flowtel_hourly_flow_rate_snapshots is
  'Append-only meaningful Receiving Timeline snapshots. Created on explicit monetary saves, never per keystroke.';
comment on function public.flowtel_hfr_load_plan(boolean) is
  'Loads the authenticated member private Hourly Flow Rate plan and creates one preserved future four-season cycle when requested.';
