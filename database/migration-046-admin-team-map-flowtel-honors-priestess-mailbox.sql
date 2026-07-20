-- Flowtel v0.10.56 — Admin Team Map + Flowtel Honors + Priestess Mailbox
--
-- Adds three owner/practitioner foundations without rewriting established Flowtel data:
-- 1. An owner-only 28-Flowtel-Day Team Map sourced from each member's latest stay.
-- 2. An append-only Flowtel Honors ledger with automatic 77/23 contribution calculations.
-- 3. A private, bi-directional Priestess Audio Mailbox for practitioner/admin file handoff.
--
-- Flowtel Time remains America/Los_Angeles. Migration 037 remains retired and must not be rerun.

-- ---------------------------------------------------------------------------
-- Owner-only 28-day Team Map
-- ---------------------------------------------------------------------------

create or replace function public.flowtel_admin_get_28_day_team_map()
returns table (
  member_id uuid,
  display_name text,
  priestess_title text,
  profile_photo_url text,
  last_checkin_date date,
  last_checked_in_at timestamptz,
  cycle_day integer,
  actual_inner_season text,
  feels_like_inner_season text,
  current_client_count integer,
  current_clients jsonb,
  upcoming_call_count integer,
  upcoming_calls_note text,
  checked_in_today boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_today date := (timezone('America/Los_Angeles', now()))::date;
  v_window_start date := ((timezone('America/Los_Angeles', now()))::date - 27);
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to open the admin Team Map.' using errcode = '28000';
  end if;

  if not public.flowtel_current_user_is_concierge() then
    raise exception 'The 28-day Team Map is reserved for the Flowtel owner.' using errcode = '42501';
  end if;

  return query
  with latest_stays as (
    select distinct on (s.client_id)
      s.client_id,
      coalesce(s.checkin_date::date, (timezone('America/Los_Angeles', s.checked_in_at))::date) as stay_date,
      s.checked_in_at,
      s.cycle_start_date::date as cycle_start_date,
      coalesce(s.cycle_day_actual, s.cycle_day_calculated, s.cycle_day_recorded, s.cycle_day_claimed) as recorded_cycle_day,
      public.flow_fm_normalize_team_map_season(s.inner_season) as recorded_inner_season,
      public.flow_fm_normalize_team_map_season(s.feels_like_inner_season) as feels_like_inner_season
    from public.flowtel_stays s
    where coalesce(s.checkin_date::date, (timezone('America/Los_Angeles', s.checked_in_at))::date) between v_window_start and v_today
    order by s.client_id,
      coalesce(s.checkin_date::date, (timezone('America/Los_Angeles', s.checked_in_at))::date) desc,
      s.checked_in_at desc nulls last,
      s.id desc
  ), resolved as (
    select
      ls.*,
      case
        when ls.cycle_start_date is not null then greatest(1, (v_today - ls.cycle_start_date) + 1)
        else ls.recorded_cycle_day
      end::integer as resolved_cycle_day
    from latest_stays ls
  )
  select
    p.id as member_id,
    coalesce(
      nullif(trim(p.display_name),''),
      nullif(trim(pp.priestess_name),''),
      nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),
      nullif(split_part(coalesce(p.email,''),'@',1),''),
      'Flow FM Priestess'
    ) as display_name,
    coalesce(nullif(trim(pp.modalities),''),nullif(trim(p.mentor_title),''),'Flow FM Priestess') as priestess_title,
    coalesce(nullif(trim(pp.profile_photo_url),''),nullif(trim(p.mentor_photo_url),'')) as profile_photo_url,
    r.stay_date as last_checkin_date,
    r.checked_in_at as last_checked_in_at,
    r.resolved_cycle_day as cycle_day,
    coalesce(
      case
        when r.resolved_cycle_day is null then null
        when r.resolved_cycle_day <= 5 or r.resolved_cycle_day >= 27 then 'Inner Winter'
        when r.resolved_cycle_day between 6 and 11 then 'Inner Spring'
        when r.resolved_cycle_day between 12 and 19 then 'Inner Summer'
        when r.resolved_cycle_day between 20 and 26 then 'Inner Autumn'
        else null
      end,
      r.recorded_inner_season,
      'Inner Winter'
    ) as actual_inner_season,
    r.feels_like_inner_season,
    coalesce(client_rollup.client_count,0)::integer as current_client_count,
    coalesce(client_rollup.clients,'[]'::jsonb) as current_clients,
    0::integer as upcoming_call_count,
    'Calendar connection coming soon.'::text as upcoming_calls_note,
    (r.stay_date = v_today) as checked_in_today
  from resolved r
  join public.profiles p on p.id = r.client_id
  left join public.flow_fm_priestess_profiles pp on pp.member_id = p.id
  left join lateral (
    select
      count(*)::integer as client_count,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'client_id',cp.id,
            'display_name',coalesce(
              nullif(trim(cp.display_name),''),
              nullif(trim(concat_ws(' ',cp.first_name,cp.last_name)),''),
              nullif(split_part(coalesce(cp.email,''),'@',1),''),
              'Flowtel Guest'
            )
          ) order by coalesce(nullif(trim(cp.display_name),''),nullif(trim(cp.first_name),''),cp.email)
        ),
        '[]'::jsonb
      ) as clients
    from public.flowtel_practitioner_relationships rel
    join public.profiles cp on cp.id = rel.client_id
    where rel.practitioner_id = p.id
      and rel.status = 'connected'
  ) client_rollup on true
  where public.flow_fm_effective_membership_rank(
      p.id,
      p.membership_type,
      p.membership_rank,
      p.role,
      p.flowfm_started_at,
      p.is_initiated
    ) >= 2
  order by r.stay_date desc, 2;
end;
$$;

revoke all on function public.flowtel_admin_get_28_day_team_map() from public;
grant execute on function public.flowtel_admin_get_28_day_team_map() to authenticated;

comment on function public.flowtel_admin_get_28_day_team_map() is
  'Owner-only map of eligible Flow FM/Council team members with a stay during the last 28 Flowtel Days. Uses the latest stay and does not expose this data to the member-facing Team Map.';

-- ---------------------------------------------------------------------------
-- Flowtel Honors: append-only tracking foundation
-- ---------------------------------------------------------------------------

create table if not exists public.flowtel_honors_ledger (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null references public.profiles(id) on delete restrict,
  source_member_id uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  transaction_type text not null,
  source_transaction text,
  gross_amount numeric(14,2) not null default 0,
  practitioner_payout numeric(14,2) not null default 0,
  flowtel_share numeric(14,2) not null default 0,
  points_delta numeric(14,2) not null,
  reason text,
  direct_line_relationship text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint flowtel_honors_transaction_type_check check (
    transaction_type in ('practitioner_revenue','direct_line_referral','bonus','adjustment','redemption')
  ),
  constraint flowtel_honors_amounts_nonnegative_check check (
    gross_amount >= 0 and practitioner_payout >= 0 and flowtel_share >= 0
  )
);

create index if not exists flowtel_honors_practitioner_created_idx
  on public.flowtel_honors_ledger (practitioner_id, created_at desc);
create index if not exists flowtel_honors_source_member_created_idx
  on public.flowtel_honors_ledger (source_member_id, created_at desc)
  where source_member_id is not null;

alter table public.flowtel_honors_ledger enable row level security;
revoke insert, update, delete on public.flowtel_honors_ledger from anon, authenticated;
grant select on public.flowtel_honors_ledger to authenticated;

drop policy if exists "Flowtel owner reads Honors ledger" on public.flowtel_honors_ledger;
create policy "Flowtel owner reads Honors ledger"
  on public.flowtel_honors_ledger for select
  to authenticated
  using (public.flowtel_current_user_is_concierge());

comment on table public.flowtel_honors_ledger is
  'Append-only Flowtel Honors ledger. Positive points are awards; redemptions and corrections are recorded as new negative entries rather than rewriting history.';

create or replace function public.flowtel_honors_admin_list_practitioners()
returns table (
  practitioner_id uuid,
  display_name text,
  email text,
  profile_photo_url text,
  practitioner_level text,
  membership_type text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to view Flowtel Honors.' using errcode = '28000';
  end if;
  if not public.flowtel_current_user_is_concierge() then
    raise exception 'Flowtel Honors administration is reserved for the owner.' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    coalesce(
      nullif(trim(p.display_name),''),
      nullif(trim(pp.priestess_name),''),
      nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),
      nullif(split_part(coalesce(p.email,''),'@',1),''),
      'Flow FM Priestess'
    ),
    p.email,
    coalesce(nullif(trim(pp.profile_photo_url),''),nullif(trim(p.mentor_photo_url),'')),
    p.practitioner_level,
    p.membership_type
  from public.profiles p
  left join public.flow_fm_priestess_profiles pp on pp.member_id = p.id
  where public.flow_fm_effective_membership_rank(
      p.id,p.membership_type,p.membership_rank,p.role,p.flowfm_started_at,p.is_initiated
    ) >= 2
  order by 2;
end;
$$;

revoke all on function public.flowtel_honors_admin_list_practitioners() from public;
grant execute on function public.flowtel_honors_admin_list_practitioners() to authenticated;

create or replace function public.flowtel_honors_admin_record_entry(
  p_practitioner_id uuid,
  p_transaction_type text,
  p_gross_amount numeric default 0,
  p_manual_points numeric default null,
  p_source_member_id uuid default null,
  p_source_transaction text default null,
  p_reason text default null,
  p_direct_line_relationship text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_type text := lower(trim(coalesce(p_transaction_type,'')));
  v_gross numeric(14,2) := round(greatest(coalesce(p_gross_amount,0),0)::numeric,2);
  v_payout numeric(14,2) := 0;
  v_share numeric(14,2) := 0;
  v_points numeric(14,2);
  v_available numeric(14,2);
  v_entry_id uuid;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to record Flowtel Honors.' using errcode = '28000';
  end if;
  if not public.flowtel_current_user_is_concierge() then
    raise exception 'Flowtel Honors administration is reserved for the owner.' using errcode = '42501';
  end if;
  if p_practitioner_id is null or not exists (select 1 from public.profiles where id = p_practitioner_id) then
    raise exception 'Choose a valid Flowtel practitioner.' using errcode = '22023';
  end if;
  if v_type not in ('practitioner_revenue','direct_line_referral','bonus','adjustment','redemption') then
    raise exception 'Choose a valid Honors transaction type.' using errcode = '22023';
  end if;

  if v_type in ('practitioner_revenue','direct_line_referral') then
    if v_gross <= 0 then
      raise exception 'Add the gross contribution amount.' using errcode = '22023';
    end if;
    v_payout := round(v_gross * 0.77,2);
    v_share := round(v_gross * 0.23,2);
    v_points := v_share;
  elsif v_type = 'redemption' then
    v_gross := 0;
    if coalesce(p_manual_points,0) = 0 then
      raise exception 'Add the number of Honors points being redeemed.' using errcode = '22023';
    end if;
    select coalesce(sum(points_delta),0) into v_available
    from public.flowtel_honors_ledger
    where practitioner_id = p_practitioner_id;
    if abs(round(p_manual_points::numeric,2)) > v_available then
      raise exception 'This redemption is larger than the available Honors balance.' using errcode = '22023';
    end if;
    v_points := -abs(round(p_manual_points::numeric,2));
  else
    v_gross := 0;
    if coalesce(p_manual_points,0) = 0 then
      raise exception 'Add the Honors points for this entry.' using errcode = '22023';
    end if;
    v_points := round(p_manual_points::numeric,2);
  end if;

  insert into public.flowtel_honors_ledger (
    practitioner_id,
    source_member_id,
    created_by,
    transaction_type,
    source_transaction,
    gross_amount,
    practitioner_payout,
    flowtel_share,
    points_delta,
    reason,
    direct_line_relationship
  ) values (
    p_practitioner_id,
    p_source_member_id,
    v_user_id,
    v_type,
    nullif(trim(coalesce(p_source_transaction,'')),''),
    v_gross,
    v_payout,
    v_share,
    v_points,
    nullif(trim(coalesce(p_reason,'')),''),
    nullif(trim(coalesce(p_direct_line_relationship,'')),'')
  ) returning id into v_entry_id;

  return v_entry_id;
end;
$$;

revoke all on function public.flowtel_honors_admin_record_entry(uuid,text,numeric,numeric,uuid,text,text,text) from public;
grant execute on function public.flowtel_honors_admin_record_entry(uuid,text,numeric,numeric,uuid,text,text,text) to authenticated;

create or replace function public.flowtel_honors_admin_get_dashboard()
returns table (
  practitioner_id uuid,
  display_name text,
  profile_photo_url text,
  available_points numeric,
  lifetime_points numeric,
  redeemed_points numeric,
  gross_volume numeric,
  flowtel_share_total numeric,
  latest_activity_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to view Flowtel Honors.' using errcode = '28000';
  end if;
  if not public.flowtel_current_user_is_concierge() then
    raise exception 'Flowtel Honors administration is reserved for the owner.' using errcode = '42501';
  end if;

  return query
  with practitioners as (
    select * from public.flowtel_honors_admin_list_practitioners()
  ), totals as (
    select
      l.practitioner_id,
      coalesce(sum(l.points_delta),0)::numeric as available_points,
      coalesce(sum(greatest(l.points_delta,0)),0)::numeric as lifetime_points,
      coalesce(sum(abs(l.points_delta)) filter (where l.transaction_type = 'redemption'),0)::numeric as redeemed_points,
      coalesce(sum(l.gross_amount),0)::numeric as gross_volume,
      coalesce(sum(l.flowtel_share),0)::numeric as flowtel_share_total,
      max(l.created_at) as latest_activity_at
    from public.flowtel_honors_ledger l
    group by l.practitioner_id
  )
  select
    p.practitioner_id,
    p.display_name,
    p.profile_photo_url,
    coalesce(t.available_points,0),
    coalesce(t.lifetime_points,0),
    coalesce(t.redeemed_points,0),
    coalesce(t.gross_volume,0),
    coalesce(t.flowtel_share_total,0),
    t.latest_activity_at
  from practitioners p
  left join totals t on t.practitioner_id = p.practitioner_id
  order by coalesce(t.available_points,0) desc, p.display_name;
end;
$$;

revoke all on function public.flowtel_honors_admin_get_dashboard() from public;
grant execute on function public.flowtel_honors_admin_get_dashboard() to authenticated;

create or replace function public.flowtel_honors_admin_get_ledger(p_limit integer default 100)
returns table (
  entry_id uuid,
  practitioner_id uuid,
  practitioner_name text,
  source_member_id uuid,
  source_member_name text,
  transaction_type text,
  source_transaction text,
  gross_amount numeric,
  practitioner_payout numeric,
  flowtel_share numeric,
  points_delta numeric,
  reason text,
  direct_line_relationship text,
  created_at timestamptz,
  created_by_name text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to view Flowtel Honors.' using errcode = '28000';
  end if;
  if not public.flowtel_current_user_is_concierge() then
    raise exception 'Flowtel Honors administration is reserved for the owner.' using errcode = '42501';
  end if;

  return query
  select
    l.id,
    l.practitioner_id,
    coalesce(nullif(trim(p.display_name),''),nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),p.email,'Flow FM Priestess'),
    l.source_member_id,
    coalesce(nullif(trim(sp.display_name),''),nullif(trim(concat_ws(' ',sp.first_name,sp.last_name)),''),sp.email),
    l.transaction_type,
    l.source_transaction,
    l.gross_amount,
    l.practitioner_payout,
    l.flowtel_share,
    l.points_delta,
    l.reason,
    l.direct_line_relationship,
    l.created_at,
    coalesce(nullif(trim(cp.display_name),''),nullif(trim(concat_ws(' ',cp.first_name,cp.last_name)),''),cp.email,'Flowtel Owner')
  from public.flowtel_honors_ledger l
  join public.profiles p on p.id = l.practitioner_id
  left join public.profiles sp on sp.id = l.source_member_id
  left join public.profiles cp on cp.id = l.created_by
  order by l.created_at desc, l.id desc
  limit greatest(1,least(coalesce(p_limit,100),500));
end;
$$;

revoke all on function public.flowtel_honors_admin_get_ledger(integer) from public;
grant execute on function public.flowtel_honors_admin_get_ledger(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Bi-directional Priestess Audio Mailbox
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'flowtel-priestess-mailbox',
  'flowtel-priestess-mailbox',
  false,
  262144000,
  array[
    'audio/mpeg','audio/mp3','audio/mpeg3','audio/x-mpeg-3','audio/wav','audio/x-wav','audio/wave','audio/vnd.wave',
    'audio/mp4','audio/m4a','audio/x-m4a','audio/aac','audio/x-aac','audio/ogg','application/octet-stream'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.flowtel_priestess_mailbox_threads (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null references public.profiles(id) on delete restrict,
  subject text not null default 'Audio for Megan',
  message text,
  status text not null default 'awaiting_concierge',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  constraint flowtel_priestess_mailbox_thread_status_check check (
    status in ('awaiting_concierge','received_by_concierge','returned_to_priestess','complete')
  )
);

create table if not exists public.flowtel_priestess_mailbox_files (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.flowtel_priestess_mailbox_threads(id) on delete restrict,
  sender_id uuid not null references public.profiles(id) on delete restrict,
  direction text not null,
  storage_path text not null unique,
  original_filename text not null,
  mime_type text,
  size_bytes bigint not null default 0,
  note text,
  uploaded_at timestamptz not null default now(),
  received_at timestamptz,
  received_by uuid references public.profiles(id) on delete set null,
  downloaded_at timestamptz,
  downloaded_by uuid references public.profiles(id) on delete set null,
  constraint flowtel_priestess_mailbox_direction_check check (direction in ('to_admin','to_practitioner')),
  constraint flowtel_priestess_mailbox_size_check check (size_bytes >= 0)
);

create index if not exists flowtel_priestess_mailbox_threads_practitioner_idx
  on public.flowtel_priestess_mailbox_threads (practitioner_id, last_activity_at desc);
create index if not exists flowtel_priestess_mailbox_files_thread_idx
  on public.flowtel_priestess_mailbox_files (thread_id, uploaded_at asc);
create index if not exists flowtel_priestess_mailbox_files_admin_queue_idx
  on public.flowtel_priestess_mailbox_files (direction, received_at, uploaded_at)
  where direction = 'to_admin';

alter table public.flowtel_priestess_mailbox_threads enable row level security;
alter table public.flowtel_priestess_mailbox_files enable row level security;
revoke insert, update, delete on public.flowtel_priestess_mailbox_threads from anon, authenticated;
revoke insert, update, delete on public.flowtel_priestess_mailbox_files from anon, authenticated;
grant select on public.flowtel_priestess_mailbox_threads to authenticated;
grant select on public.flowtel_priestess_mailbox_files to authenticated;

drop policy if exists "Priestesses read their own mailbox threads" on public.flowtel_priestess_mailbox_threads;
create policy "Priestesses read their own mailbox threads"
  on public.flowtel_priestess_mailbox_threads for select
  to authenticated
  using (practitioner_id = auth.uid() or public.flowtel_current_user_is_concierge());

drop policy if exists "Priestesses read their own mailbox files" on public.flowtel_priestess_mailbox_files;
create policy "Priestesses read their own mailbox files"
  on public.flowtel_priestess_mailbox_files for select
  to authenticated
  using (
    public.flowtel_current_user_is_concierge()
    or exists (
      select 1 from public.flowtel_priestess_mailbox_threads t
      where t.id = thread_id and t.practitioner_id = auth.uid()
    )
  );

-- Private Storage access. Every object path is:
-- practitioner_uuid / thread_uuid / to-admin|to-practitioner / unique-file-name

drop policy if exists "Priestess mailbox participants read private audio" on storage.objects;
create policy "Priestess mailbox participants read private audio"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'flowtel-priestess-mailbox'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.flowtel_current_user_is_concierge()
    )
  );

drop policy if exists "Priestesses upload audio to Concierge" on storage.objects;
create policy "Priestesses upload audio to Concierge"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'flowtel-priestess-mailbox'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (storage.foldername(name))[3] = 'to-admin'
  );

drop policy if exists "Flowtel owner returns edited audio" on storage.objects;
create policy "Flowtel owner returns edited audio"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'flowtel-priestess-mailbox'
    and public.flowtel_current_user_is_concierge()
    and (storage.foldername(name))[3] = 'to-practitioner'
  );

drop policy if exists "Priestesses remove failed mailbox uploads" on storage.objects;
create policy "Priestesses remove failed mailbox uploads"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'flowtel-priestess-mailbox'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (storage.foldername(name))[3] = 'to-admin'
  );

drop policy if exists "Flowtel owner removes mailbox audio" on storage.objects;
create policy "Flowtel owner removes mailbox audio"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'flowtel-priestess-mailbox'
    and public.flowtel_current_user_is_concierge()
  );

create or replace function public.flowtel_mailbox_create_thread(
  p_thread_id uuid,
  p_subject text,
  p_message text,
  p_storage_path text,
  p_original_filename text,
  p_mime_type text,
  p_size_bytes bigint,
  p_file_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_thread_id uuid := coalesce(p_thread_id,gen_random_uuid());
begin
  if v_user_id is null then
    raise exception 'You must be signed in to send audio through the Priestess Mailbox.' using errcode = '28000';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = v_user_id
      and public.flow_fm_effective_membership_rank(
        p.id,p.membership_type,p.membership_rank,p.role,p.flowfm_started_at,p.is_initiated
      ) >= 2
  ) then
    raise exception 'The Priestess Mailbox is available to Flow FM and Council practitioners.' using errcode = '42501';
  end if;
  if split_part(coalesce(p_storage_path,''),'/',1) <> v_user_id::text
     or split_part(coalesce(p_storage_path,''),'/',2) <> v_thread_id::text
     or split_part(coalesce(p_storage_path,''),'/',3) <> 'to-admin' then
    raise exception 'The mailbox file path is not valid for this Priestess.' using errcode = '42501';
  end if;
  if coalesce(trim(p_original_filename),'') = '' then
    raise exception 'The audio file needs a name.' using errcode = '22023';
  end if;
  if lower(p_original_filename) !~ '\.(mp3|wav|m4a|aac|ogg)$' then
    raise exception 'Choose an MP3, WAV, M4A, AAC, or OGG audio file.' using errcode = '22023';
  end if;
  if coalesce(p_size_bytes,0) <= 0 or p_size_bytes > 262144000 then
    raise exception 'Choose an audio file between 1 byte and 250 MB.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'flowtel-priestess-mailbox'
      and o.name = p_storage_path
  ) then
    raise exception 'The uploaded Priestess audio could not be verified.' using errcode = 'P0002';
  end if;

  insert into public.flowtel_priestess_mailbox_threads (
    id,practitioner_id,subject,message,status,created_at,updated_at,last_activity_at
  ) values (
    v_thread_id,v_user_id,coalesce(nullif(trim(p_subject),''),'Audio for Megan'),
    nullif(trim(coalesce(p_message,'')),''),'awaiting_concierge',now(),now(),now()
  );

  insert into public.flowtel_priestess_mailbox_files (
    thread_id,sender_id,direction,storage_path,original_filename,mime_type,size_bytes,note
  ) values (
    v_thread_id,v_user_id,'to_admin',p_storage_path,p_original_filename,
    nullif(trim(coalesce(p_mime_type,'')),''),greatest(coalesce(p_size_bytes,0),0),
    nullif(trim(coalesce(p_file_note,'')),'')
  );

  return v_thread_id;
end;
$$;

revoke all on function public.flowtel_mailbox_create_thread(uuid,text,text,text,text,text,bigint,text) from public;
grant execute on function public.flowtel_mailbox_create_thread(uuid,text,text,text,text,text,bigint,text) to authenticated;

create or replace function public.flowtel_mailbox_get_my_threads()
returns table (
  thread_id uuid,
  practitioner_id uuid,
  subject text,
  thread_message text,
  thread_status text,
  thread_created_at timestamptz,
  last_activity_at timestamptz,
  file_id uuid,
  direction text,
  storage_path text,
  original_filename text,
  mime_type text,
  size_bytes bigint,
  file_note text,
  uploaded_at timestamptz,
  received_at timestamptz,
  downloaded_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to open your Priestess Mailbox.' using errcode = '28000';
  end if;

  return query
  select
    t.id,t.practitioner_id,t.subject,t.message,t.status,t.created_at,t.last_activity_at,
    f.id,f.direction,f.storage_path,f.original_filename,f.mime_type,f.size_bytes,f.note,
    f.uploaded_at,f.received_at,f.downloaded_at
  from public.flowtel_priestess_mailbox_threads t
  join public.flowtel_priestess_mailbox_files f on f.thread_id = t.id
  where t.practitioner_id = auth.uid()
  order by t.last_activity_at desc,f.uploaded_at asc,f.id;
end;
$$;

revoke all on function public.flowtel_mailbox_get_my_threads() from public;
grant execute on function public.flowtel_mailbox_get_my_threads() to authenticated;

create or replace function public.flowtel_mailbox_admin_get_queue()
returns table (
  thread_id uuid,
  practitioner_id uuid,
  practitioner_name text,
  practitioner_email text,
  profile_photo_url text,
  subject text,
  thread_message text,
  thread_status text,
  thread_created_at timestamptz,
  last_activity_at timestamptz,
  file_id uuid,
  direction text,
  storage_path text,
  original_filename text,
  mime_type text,
  size_bytes bigint,
  file_note text,
  uploaded_at timestamptz,
  received_at timestamptz,
  downloaded_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to open the Priestess Mailbox queue.' using errcode = '28000';
  end if;
  if not public.flowtel_current_user_is_concierge() then
    raise exception 'The Priestess Mailbox queue is reserved for the Flowtel owner.' using errcode = '42501';
  end if;

  return query
  select
    t.id,t.practitioner_id,
    coalesce(nullif(trim(p.display_name),''),nullif(trim(pp.priestess_name),''),nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),p.email,'Flow FM Priestess'),
    p.email,
    coalesce(nullif(trim(pp.profile_photo_url),''),nullif(trim(p.mentor_photo_url),'')),
    t.subject,t.message,t.status,t.created_at,t.last_activity_at,
    f.id,f.direction,f.storage_path,f.original_filename,f.mime_type,f.size_bytes,f.note,
    f.uploaded_at,f.received_at,f.downloaded_at
  from public.flowtel_priestess_mailbox_threads t
  join public.profiles p on p.id = t.practitioner_id
  left join public.flow_fm_priestess_profiles pp on pp.member_id = p.id
  join public.flowtel_priestess_mailbox_files f on f.thread_id = t.id
  order by
    case when f.direction = 'to_admin' and f.received_at is null then 0 else 1 end,
    t.last_activity_at desc,f.uploaded_at asc,f.id;
end;
$$;

revoke all on function public.flowtel_mailbox_admin_get_queue() from public;
grant execute on function public.flowtel_mailbox_admin_get_queue() to authenticated;

create or replace function public.flowtel_mailbox_admin_mark_received(p_file_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_thread_id uuid;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to receive a Priestess file.' using errcode = '28000';
  end if;
  if not public.flowtel_current_user_is_concierge() then
    raise exception 'Only the Flowtel owner can receive Priestess files.' using errcode = '42501';
  end if;

  update public.flowtel_priestess_mailbox_files
  set received_at = coalesce(received_at,now()),
      received_by = coalesce(received_by,v_user_id)
  where id = p_file_id and direction = 'to_admin'
  returning thread_id into v_thread_id;

  if v_thread_id is null then
    raise exception 'This Priestess file could not be found.' using errcode = 'P0002';
  end if;

  update public.flowtel_priestess_mailbox_threads
  set status = case when status = 'awaiting_concierge' then 'received_by_concierge' else status end,
      updated_at = now(),
      last_activity_at = now()
  where id = v_thread_id;

  return p_file_id;
end;
$$;

revoke all on function public.flowtel_mailbox_admin_mark_received(uuid) from public;
grant execute on function public.flowtel_mailbox_admin_mark_received(uuid) to authenticated;

create or replace function public.flowtel_mailbox_admin_add_return_file(
  p_thread_id uuid,
  p_storage_path text,
  p_original_filename text,
  p_mime_type text,
  p_size_bytes bigint,
  p_file_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_practitioner_id uuid;
  v_file_id uuid;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to return a Priestess file.' using errcode = '28000';
  end if;
  if not public.flowtel_current_user_is_concierge() then
    raise exception 'Only the Flowtel owner can return edited Priestess files.' using errcode = '42501';
  end if;

  select practitioner_id into v_practitioner_id
  from public.flowtel_priestess_mailbox_threads
  where id = p_thread_id
  for update;

  if v_practitioner_id is null then
    raise exception 'This Priestess Mailbox thread could not be found.' using errcode = 'P0002';
  end if;
  if split_part(coalesce(p_storage_path,''),'/',1) <> v_practitioner_id::text
     or split_part(coalesce(p_storage_path,''),'/',2) <> p_thread_id::text
     or split_part(coalesce(p_storage_path,''),'/',3) <> 'to-practitioner' then
    raise exception 'The returned-file path does not match this Priestess Mailbox thread.' using errcode = '42501';
  end if;
  if coalesce(trim(p_original_filename),'') = ''
     or lower(p_original_filename) !~ '\.(mp3|wav|m4a|aac|ogg)$' then
    raise exception 'Choose an MP3, WAV, M4A, AAC, or OGG audio file.' using errcode = '22023';
  end if;
  if coalesce(p_size_bytes,0) <= 0 or p_size_bytes > 262144000 then
    raise exception 'Choose an audio file between 1 byte and 250 MB.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'flowtel-priestess-mailbox'
      and o.name = p_storage_path
  ) then
    raise exception 'The returned Priestess audio could not be verified.' using errcode = 'P0002';
  end if;

  insert into public.flowtel_priestess_mailbox_files (
    thread_id,sender_id,direction,storage_path,original_filename,mime_type,size_bytes,note
  ) values (
    p_thread_id,v_user_id,'to_practitioner',p_storage_path,p_original_filename,
    nullif(trim(coalesce(p_mime_type,'')),''),greatest(coalesce(p_size_bytes,0),0),
    nullif(trim(coalesce(p_file_note,'')),'')
  ) returning id into v_file_id;

  update public.flowtel_priestess_mailbox_threads
  set status = 'returned_to_priestess',updated_at = now(),last_activity_at = now()
  where id = p_thread_id;

  return v_file_id;
end;
$$;

revoke all on function public.flowtel_mailbox_admin_add_return_file(uuid,text,text,text,bigint,text) from public;
grant execute on function public.flowtel_mailbox_admin_add_return_file(uuid,text,text,text,bigint,text) to authenticated;

create or replace function public.flowtel_mailbox_member_mark_return_downloaded(p_file_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_thread_id uuid;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to receive your returned audio.' using errcode = '28000';
  end if;

  update public.flowtel_priestess_mailbox_files f
  set downloaded_at = coalesce(f.downloaded_at,now()),
      downloaded_by = coalesce(f.downloaded_by,v_user_id)
  from public.flowtel_priestess_mailbox_threads t
  where f.id = p_file_id
    and f.thread_id = t.id
    and f.direction = 'to_practitioner'
    and t.practitioner_id = v_user_id
  returning f.thread_id into v_thread_id;

  if v_thread_id is null then
    raise exception 'This returned Priestess file could not be found.' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.flowtel_priestess_mailbox_files f
    where f.thread_id = v_thread_id
      and f.direction = 'to_practitioner'
      and f.downloaded_at is null
  ) then
    update public.flowtel_priestess_mailbox_threads
    set status = 'complete',updated_at = now(),last_activity_at = now()
    where id = v_thread_id;
  end if;

  return p_file_id;
end;
$$;

revoke all on function public.flowtel_mailbox_member_mark_return_downloaded(uuid) from public;
grant execute on function public.flowtel_mailbox_member_mark_return_downloaded(uuid) to authenticated;
