-- Flowtel v0.10.54 — The Moonbox
--
-- Creates a separate authenticated room for unsent letters to lovers.
-- A member may send a message anonymously into the Collective Moonbox or keep
-- it private between herself and the Moon. Collective readers receive only
-- the message and broad moon/season context; member identities, emails, legal
-- names, profile data, cycle days, stay IDs, and exact timestamps are withheld.
--
-- This migration does not alter Flowtel stays, Powder Rooms, the Flow Map,
-- passwords, sessions, mentor relationships, Team Map data, or Concierge rules.
-- Migration 037 remains retired and must never be rerun.

create table if not exists public.flowtel_moonbox_messages (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references auth.users(id) on delete cascade,
  message_text text not null,
  recipient_archetype text,
  share_collectively boolean not null default true,
  flowtel_date date not null default (timezone('America/Los_Angeles', now()))::date,
  cycle_day_actual integer,
  inner_season text,
  feels_like_inner_season text,
  moon_phase text,
  moon_day integer,
  created_at timestamptz not null default now()
);

comment on table public.flowtel_moonbox_messages is
  'Authenticated Moonbox letters. Private rows remain visible only to their author; collective rows are exposed only through a deliberately anonymous RPC.';

comment on column public.flowtel_moonbox_messages.recipient_archetype is
  'Optional broad relationship archetype only. Names and identifying details should not be stored here.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'flowtel_moonbox_message_length_check'
      and conrelid = 'public.flowtel_moonbox_messages'::regclass
  ) then
    alter table public.flowtel_moonbox_messages
      add constraint flowtel_moonbox_message_length_check
      check (char_length(trim(message_text)) between 1 and 4000) not valid;
  end if;
end;
$$;

alter table public.flowtel_moonbox_messages
  validate constraint flowtel_moonbox_message_length_check;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'flowtel_moonbox_recipient_archetype_check'
      and conrelid = 'public.flowtel_moonbox_messages'::regclass
  ) then
    alter table public.flowtel_moonbox_messages
      add constraint flowtel_moonbox_recipient_archetype_check
      check (
        recipient_archetype is null
        or recipient_archetype in (
          'lover',
          'partner',
          'husband',
          'ex',
          'father',
          'brother',
          'friend',
          'colleague',
          'unknown_masculine',
          'the_masculine'
        )
      ) not valid;
  end if;
end;
$$;

alter table public.flowtel_moonbox_messages
  validate constraint flowtel_moonbox_recipient_archetype_check;

create index if not exists flowtel_moonbox_messages_member_created_idx
  on public.flowtel_moonbox_messages (member_id, created_at desc);

create index if not exists flowtel_moonbox_messages_collective_created_idx
  on public.flowtel_moonbox_messages (created_at desc)
  where share_collectively = true;

alter table public.flowtel_moonbox_messages enable row level security;

drop policy if exists "Moonbox members read their own messages" on public.flowtel_moonbox_messages;
create policy "Moonbox members read their own messages"
  on public.flowtel_moonbox_messages
  for select
  to authenticated
  using (member_id = auth.uid());

drop policy if exists "Moonbox members create their own messages" on public.flowtel_moonbox_messages;
create policy "Moonbox members create their own messages"
  on public.flowtel_moonbox_messages
  for insert
  to authenticated
  with check (member_id = auth.uid());

-- All browser access uses the authenticated RPCs below. Keep the table itself
-- unavailable to anon/authenticated roles so collective readers can never
-- bypass the safe return shape or query another member's rows directly.
revoke all on table public.flowtel_moonbox_messages from anon, authenticated;

create table if not exists public.flowtel_moonbox_witnesses (
  message_id uuid not null references public.flowtel_moonbox_messages(id) on delete cascade,
  witness_member_id uuid not null references auth.users(id) on delete cascade,
  witnessed_at timestamptz not null default now(),
  primary key (message_id, witness_member_id)
);

comment on table public.flowtel_moonbox_witnesses is
  'Silent anonymous Moonbox witnessing. No comments, threads, or member identity are exposed to other readers.';

create index if not exists flowtel_moonbox_witnesses_member_idx
  on public.flowtel_moonbox_witnesses (witness_member_id, witnessed_at desc);

alter table public.flowtel_moonbox_witnesses enable row level security;

-- Direct table access is intentionally limited. The authenticated RPC below
-- inserts witness rows only after confirming the source message is collective.
revoke all on table public.flowtel_moonbox_witnesses from anon, authenticated;

create or replace function public.flowtel_create_moonbox_message(
  p_message_text text,
  p_recipient_archetype text default null,
  p_share_collectively boolean default true
)
returns table (
  id uuid,
  message_text text,
  recipient_archetype text,
  share_collectively boolean,
  flowtel_date date,
  cycle_day_actual integer,
  inner_season text,
  feels_like_inner_season text,
  moon_phase text,
  moon_day integer,
  created_at timestamptz,
  witness_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_text text := trim(coalesce(p_message_text, ''));
  v_archetype text := nullif(trim(lower(coalesce(p_recipient_archetype, ''))), '');
  v_today date := (timezone('America/Los_Angeles', now()))::date;
  v_stay public.flowtel_stays%rowtype;
  v_message public.flowtel_moonbox_messages%rowtype;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to enter the Moonbox.' using errcode = '28000';
  end if;

  if v_text = '' then
    raise exception 'Write the message before sending it to the Moon.' using errcode = '22023';
  end if;

  if char_length(v_text) > 4000 then
    raise exception 'Moonbox messages may contain up to 4,000 characters.' using errcode = '22023';
  end if;

  if coalesce(p_share_collectively, true) and (
    v_text ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}'
    or v_text ~* '(https?://|www\.)'
    or v_text ~ '(^|[[:space:]])@[A-Za-z0-9_.]{2,}'
    or v_text ~ '(\+?1[ .-]?)?(\(?[0-9]{3}\)?[ .-]?)?[0-9]{3}[ .-]?[0-9]{4}'
  ) then
    raise exception 'Remove contact details before releasing this letter into the Collective Moonbox. You may still keep the original version private.' using errcode = '22023';
  end if;

  if v_archetype is not null and v_archetype not in (
    'lover', 'partner', 'husband', 'ex', 'father', 'brother', 'friend',
    'colleague', 'unknown_masculine', 'the_masculine'
  ) then
    raise exception 'Choose one of the available relationship archetypes.' using errcode = '22023';
  end if;

  select s.*
    into v_stay
  from public.flowtel_stays s
  where s.client_id = v_user_id
    and s.checkin_date::date = v_today
  order by s.checked_in_at desc nulls last, s.id desc
  limit 1;

  insert into public.flowtel_moonbox_messages (
    member_id,
    message_text,
    recipient_archetype,
    share_collectively,
    flowtel_date,
    cycle_day_actual,
    inner_season,
    feels_like_inner_season,
    moon_phase,
    moon_day
  ) values (
    v_user_id,
    v_text,
    v_archetype,
    coalesce(p_share_collectively, true),
    v_today,
    coalesce(v_stay.cycle_day_actual, v_stay.cycle_day_calculated),
    v_stay.inner_season,
    v_stay.feels_like_inner_season,
    v_stay.moon_phase,
    v_stay.moon_day
  )
  returning * into v_message;

  return query
  select
    v_message.id,
    v_message.message_text,
    v_message.recipient_archetype,
    v_message.share_collectively,
    v_message.flowtel_date,
    v_message.cycle_day_actual,
    v_message.inner_season,
    v_message.feels_like_inner_season,
    v_message.moon_phase,
    v_message.moon_day,
    v_message.created_at,
    0::bigint;
end;
$$;

revoke all on function public.flowtel_create_moonbox_message(text, text, boolean) from public;
grant execute on function public.flowtel_create_moonbox_message(text, text, boolean) to authenticated;

comment on function public.flowtel_create_moonbox_message(text, text, boolean) is
  'Creates an authenticated member-owned Moonbox letter, blocks obvious contact details from collective publication, and snapshots broad current Flowtel moon/season context without changing the current stay.';

create or replace function public.flowtel_get_my_moonbox_messages()
returns table (
  id uuid,
  message_text text,
  recipient_archetype text,
  share_collectively boolean,
  flowtel_date date,
  cycle_day_actual integer,
  inner_season text,
  feels_like_inner_season text,
  moon_phase text,
  moon_day integer,
  created_at timestamptz,
  witness_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id,
    m.message_text,
    m.recipient_archetype,
    m.share_collectively,
    m.flowtel_date,
    m.cycle_day_actual,
    m.inner_season,
    m.feels_like_inner_season,
    m.moon_phase,
    m.moon_day,
    m.created_at,
    count(w.message_id)::bigint as witness_count
  from public.flowtel_moonbox_messages m
  left join public.flowtel_moonbox_witnesses w on w.message_id = m.id
  where auth.uid() is not null
    and m.member_id = auth.uid()
  group by m.id
  order by m.created_at desc, m.id desc;
$$;

revoke all on function public.flowtel_get_my_moonbox_messages() from public;
grant execute on function public.flowtel_get_my_moonbox_messages() to authenticated;

comment on function public.flowtel_get_my_moonbox_messages() is
  'Returns the authenticated member''s own private and collective Moonbox archive.';

create or replace function public.flowtel_get_collective_moonbox_messages(
  p_limit integer default 100
)
returns table (
  id uuid,
  message_text text,
  recipient_archetype text,
  sent_on date,
  inner_season text,
  feels_like_inner_season text,
  moon_phase text,
  witness_count bigint,
  has_witnessed boolean,
  is_mine boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id,
    m.message_text,
    m.recipient_archetype,
    m.flowtel_date as sent_on,
    m.inner_season,
    m.feels_like_inner_season,
    m.moon_phase,
    count(w.message_id)::bigint as witness_count,
    exists (
      select 1
      from public.flowtel_moonbox_witnesses mine
      where mine.message_id = m.id
        and mine.witness_member_id = auth.uid()
    ) as has_witnessed,
    m.member_id = auth.uid() as is_mine
  from public.flowtel_moonbox_messages m
  left join public.flowtel_moonbox_witnesses w on w.message_id = m.id
  where auth.uid() is not null
    and m.share_collectively = true
  group by m.id
  order by m.created_at desc, m.id desc
  limit greatest(1, least(coalesce(p_limit, 100), 200));
$$;

revoke all on function public.flowtel_get_collective_moonbox_messages(integer) from public;
grant execute on function public.flowtel_get_collective_moonbox_messages(integer) to authenticated;

comment on function public.flowtel_get_collective_moonbox_messages(integer) is
  'Returns anonymous collective Moonbox letters to authenticated members. It never returns author IDs, names, emails, profile data, cycle days, stay IDs, or exact timestamps.';

create or replace function public.flowtel_witness_moonbox_message(
  p_message_id uuid
)
returns table (
  witness_count bigint,
  has_witnessed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_owner_id uuid;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to witness a Moonbox message.' using errcode = '28000';
  end if;

  select m.member_id
    into v_owner_id
  from public.flowtel_moonbox_messages m
  where m.id = p_message_id
    and m.share_collectively = true;

  if v_owner_id is null then
    raise exception 'This Moonbox message is not available for collective witnessing.' using errcode = 'P0002';
  end if;

  if v_owner_id <> v_user_id then
    insert into public.flowtel_moonbox_witnesses (message_id, witness_member_id)
    values (p_message_id, v_user_id)
    on conflict (message_id, witness_member_id) do nothing;
  end if;

  return query
  select
    count(*)::bigint,
    exists (
      select 1
      from public.flowtel_moonbox_witnesses mine
      where mine.message_id = p_message_id
        and mine.witness_member_id = v_user_id
    )
  from public.flowtel_moonbox_witnesses w
  where w.message_id = p_message_id;
end;
$$;

revoke all on function public.flowtel_witness_moonbox_message(uuid) from public;
grant execute on function public.flowtel_witness_moonbox_message(uuid) to authenticated;

comment on function public.flowtel_witness_moonbox_message(uuid) is
  'Adds one silent anonymous witness per authenticated member to a collective Moonbox letter. Authors cannot witness their own messages.';
