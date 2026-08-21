-- Flowtel v0.10.86 — Moon Mail + Personal Cosmology
--
-- Extends the existing v0.10.54 Moonbox rather than creating a second
-- unsent-message system. Adds a private seven-day return ritual and a dedicated
-- private Personal Cosmology room for birth data + Human Design chart storage.
--
-- This migration is additive to migration 042. It does not alter Flowtel stays,
-- Powder Room anonymity, Flow Map history, Mentor relationship rules, Womb Magic
-- appointment access, Queendom event access/payment/registration boundaries, or
-- Caddie Magic Player-first identity. Historical migrations must not be renamed
-- or rerun casually.

begin;

-- ---------------------------------------------------------------------------
-- Moon Mail — extend the existing Moonbox
-- ---------------------------------------------------------------------------

alter table public.flowtel_moonbox_messages
  add column if not exists return_due_at timestamptz;

comment on column public.flowtel_moonbox_messages.return_due_at is
  'Private seven-day Moon Mail return due time. Null means the letter predates the v0.10.86 return ritual or was created outside the updated RPC.';

alter table public.flowtel_moonbox_messages
  drop constraint if exists flowtel_moonbox_message_length_check;

alter table public.flowtel_moonbox_messages
  add constraint flowtel_moonbox_message_length_check
  check (char_length(trim(message_text)) between 1 and 16000) not valid;

alter table public.flowtel_moonbox_messages
  validate constraint flowtel_moonbox_message_length_check;

create table if not exists public.flowtel_moonbox_returns (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.flowtel_moonbox_messages(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  feeling_now text not null,
  what_happened text not null,
  what_i_know_now text,
  created_at timestamptz not null default now(),
  unique (message_id)
);

comment on table public.flowtel_moonbox_returns is
  'Append-only private seven-day Moon Mail reflections. A collective Moonbox letter never makes its return outcome collective.';

alter table public.flowtel_moonbox_returns
  drop constraint if exists flowtel_moonbox_returns_feeling_length_check,
  drop constraint if exists flowtel_moonbox_returns_happened_length_check,
  drop constraint if exists flowtel_moonbox_returns_know_length_check;

alter table public.flowtel_moonbox_returns
  add constraint flowtel_moonbox_returns_feeling_length_check
    check (char_length(trim(feeling_now)) between 1 and 6000),
  add constraint flowtel_moonbox_returns_happened_length_check
    check (char_length(trim(what_happened)) between 1 and 6000),
  add constraint flowtel_moonbox_returns_know_length_check
    check (what_i_know_now is null or char_length(trim(what_i_know_now)) <= 6000);

create index if not exists flowtel_moonbox_returns_member_created_idx
  on public.flowtel_moonbox_returns (member_id, created_at desc);

create index if not exists flowtel_moonbox_messages_member_return_due_idx
  on public.flowtel_moonbox_messages (member_id, return_due_at)
  where return_due_at is not null;

alter table public.flowtel_moonbox_returns enable row level security;
revoke all on table public.flowtel_moonbox_returns from anon, authenticated;

-- Keep the original RPC signature/return shape for backwards compatibility.
-- New letters receive a private due time exactly seven days after submission.
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
    raise exception 'You must be signed in to enter Moon Mail.' using errcode = '28000';
  end if;

  if v_text = '' then
    raise exception 'Write the message before sending it to the Moon.' using errcode = '22023';
  end if;

  if char_length(v_text) > 16000 then
    raise exception 'Moon Mail may contain up to 16,000 characters.' using errcode = '22023';
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
    moon_day,
    return_due_at
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
    v_stay.moon_day,
    now() + interval '7 days'
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

revoke all on function public.flowtel_create_moonbox_message(text,text,boolean) from public;
grant execute on function public.flowtel_create_moonbox_message(text,text,boolean) to authenticated;

create or replace function public.flowtel_get_my_moon_mail_messages()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', m.id,
    'message_text', m.message_text,
    'recipient_archetype', m.recipient_archetype,
    'share_collectively', m.share_collectively,
    'flowtel_date', m.flowtel_date,
    'cycle_day_actual', m.cycle_day_actual,
    'inner_season', m.inner_season,
    'feels_like_inner_season', m.feels_like_inner_season,
    'moon_phase', m.moon_phase,
    'moon_day', m.moon_day,
    'created_at', m.created_at,
    'return_due_at', m.return_due_at,
    'return_completed_at', r.created_at,
    'return_feeling_now', r.feeling_now,
    'return_what_happened', r.what_happened,
    'return_what_i_know_now', r.what_i_know_now,
    'witness_count', (select count(*)::bigint from public.flowtel_moonbox_witnesses w where w.message_id = m.id)
  ) order by m.created_at desc, m.id desc), '[]'::jsonb)
  from public.flowtel_moonbox_messages m
  left join public.flowtel_moonbox_returns r on r.message_id = m.id
  where auth.uid() is not null
    and m.member_id = auth.uid();
$$;

revoke all on function public.flowtel_get_my_moon_mail_messages() from public;
grant execute on function public.flowtel_get_my_moon_mail_messages() to authenticated;

comment on function public.flowtel_get_my_moon_mail_messages() is
  'Returns only the authenticated author''s Moon Mail archive, including private seven-day return state/outcome. No return data is exposed through the collective feed.';

create or replace function public.flowtel_get_due_moonbox_returns(
  p_limit integer default 20
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'message_id', m.id,
    'message_text', m.message_text,
    'recipient_archetype', m.recipient_archetype,
    'share_collectively', m.share_collectively,
    'return_due_at', m.return_due_at,
    'created_at', m.created_at
  ) order by m.return_due_at asc, m.created_at asc), '[]'::jsonb)
  from (
    select source.*
    from public.flowtel_moonbox_messages source
    where auth.uid() is not null
      and source.member_id = auth.uid()
      and source.return_due_at is not null
      and source.return_due_at <= now()
      and not exists (
        select 1 from public.flowtel_moonbox_returns completed
        where completed.message_id = source.id
      )
    order by source.return_due_at asc, source.created_at asc
    limit greatest(1, least(coalesce(p_limit, 20), 100))
  ) m;
$$;

revoke all on function public.flowtel_get_due_moonbox_returns(integer) from public;
grant execute on function public.flowtel_get_due_moonbox_returns(integer) to authenticated;

create or replace function public.flowtel_complete_moonbox_return(
  p_message_id uuid,
  p_feeling_now text,
  p_what_happened text,
  p_what_i_know_now text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_message public.flowtel_moonbox_messages%rowtype;
  v_return public.flowtel_moonbox_returns%rowtype;
  v_feeling text := trim(coalesce(p_feeling_now, ''));
  v_happened text := trim(coalesce(p_what_happened, ''));
  v_know text := nullif(trim(coalesce(p_what_i_know_now, '')), '');
begin
  if v_user_id is null then
    raise exception 'You must be signed in to return to Moon Mail.' using errcode = '28000';
  end if;

  select * into v_message
  from public.flowtel_moonbox_messages
  where id = p_message_id and member_id = v_user_id;

  if v_message.id is null then
    raise exception 'That Moon Mail message is not in your private archive.' using errcode = 'P0002';
  end if;

  if v_message.return_due_at is null then
    raise exception 'This message predates the seven-day Moon Mail return ritual.' using errcode = '22023';
  end if;

  if v_message.return_due_at > now() then
    raise exception 'The Moon is still holding this message. Return after seven days.' using errcode = '22023';
  end if;

  if v_feeling = '' or v_happened = '' then
    raise exception 'Complete the first two return reflections before closing the ritual.' using errcode = '22023';
  end if;

  if char_length(v_feeling) > 6000 or char_length(v_happened) > 6000 or char_length(coalesce(v_know, '')) > 6000 then
    raise exception 'Each Moon Mail return reflection may contain up to 6,000 characters.' using errcode = '22023';
  end if;

  insert into public.flowtel_moonbox_returns (
    message_id, member_id, feeling_now, what_happened, what_i_know_now
  ) values (
    v_message.id, v_user_id, v_feeling, v_happened, v_know
  )
  on conflict (message_id) do nothing
  returning * into v_return;

  if v_return.id is null then
    raise exception 'You already completed the seven-day return for this message.' using errcode = '23505';
  end if;

  return jsonb_build_object(
    'id', v_return.id,
    'message_id', v_return.message_id,
    'completed_at', v_return.created_at
  );
end;
$$;

revoke all on function public.flowtel_complete_moonbox_return(uuid,text,text,text) from public;
grant execute on function public.flowtel_complete_moonbox_return(uuid,text,text,text) to authenticated;

-- ---------------------------------------------------------------------------
-- Personal Cosmology — private birth/design source data
-- ---------------------------------------------------------------------------

create table if not exists public.flowtel_member_cosmology (
  member_id uuid primary key references public.profiles(id) on delete cascade,
  birth_date date,
  birth_time time without time zone,
  birth_time_confidence text not null default 'unknown',
  birthplace text,
  notes text,
  share_with_active_practitioner boolean not null default false,
  sharing_consented_at timestamptz,
  sharing_revoked_at timestamptz,
  human_design_storage_path text,
  human_design_original_filename text,
  human_design_mime_type text,
  human_design_size_bytes bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint flowtel_member_cosmology_time_confidence_check
    check (birth_time_confidence in ('exact','approximate','unknown')),
  constraint flowtel_member_cosmology_birthplace_length_check
    check (birthplace is null or char_length(trim(birthplace)) <= 240),
  constraint flowtel_member_cosmology_notes_length_check
    check (notes is null or char_length(trim(notes)) <= 3000),
  constraint flowtel_member_cosmology_chart_size_check
    check (human_design_size_bytes is null or (human_design_size_bytes >= 0 and human_design_size_bytes <= 15728640))
);

comment on table public.flowtel_member_cosmology is
  'Private member-owned birth data and Human Design chart metadata. Never use this table as a Team Map/public-profile source.';

alter table public.flowtel_member_cosmology enable row level security;
revoke all on table public.flowtel_member_cosmology from anon, authenticated;

create or replace function public.flowtel_can_view_member_cosmology(
  p_member_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and p_member_id is not null
    and (
      p_member_id = auth.uid()
      or (
        exists (
          select 1
          from public.flowtel_member_cosmology cosmology
          where cosmology.member_id = p_member_id
            and cosmology.share_with_active_practitioner = true
        )
        and (
          exists (
            select 1
            from public.flowtel_practitioner_relationships relationship
            where relationship.client_id = p_member_id
              and relationship.practitioner_id = auth.uid()
              and relationship.status = 'connected'
              and coalesce(relationship.consent_granted, false) = true
          )
          or public.flowtel_has_active_appointment_access(p_member_id, auth.uid())
        )
      )
    );
$$;

revoke all on function public.flowtel_can_view_member_cosmology(uuid) from public;
grant execute on function public.flowtel_can_view_member_cosmology(uuid) to authenticated;

create or replace function public.flowtel_get_member_cosmology(
  p_member_id uuid default auth.uid()
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_target uuid := coalesce(p_member_id, auth.uid());
  v_cosmology public.flowtel_member_cosmology%rowtype;
  v_name text;
  v_can_view boolean;
begin
  if auth.uid() is null then
    raise exception 'Enter the Flowtel before opening Personal Cosmology.' using errcode = '28000';
  end if;

  v_can_view := public.flowtel_can_view_member_cosmology(v_target);
  if not v_can_view then
    raise exception 'These Birth + Design details are private unless the member explicitly shares them with an active Mentor or appointment-holding Priestess.' using errcode = '42501';
  end if;

  select * into v_cosmology
  from public.flowtel_member_cosmology
  where member_id = v_target;

  select public.flowtel_resolve_display_name(p.display_name,p.first_name,p.last_name,p.email,'Flowtel Guest')
    into v_name
  from public.profiles p
  where p.id = v_target;

  return jsonb_build_object(
    'member_id', v_target,
    'member_name', coalesce(v_name,'Flowtel Guest'),
    'editable', v_target = auth.uid(),
    'birth_date', v_cosmology.birth_date,
    'birth_time', case when v_cosmology.birth_time is null then null else to_char(v_cosmology.birth_time,'HH24:MI') end,
    'birth_time_confidence', coalesce(v_cosmology.birth_time_confidence,'unknown'),
    'birthplace', v_cosmology.birthplace,
    'notes', v_cosmology.notes,
    'share_with_active_practitioner', coalesce(v_cosmology.share_with_active_practitioner,false),
    'sharing_consented_at', v_cosmology.sharing_consented_at,
    'human_design_storage_path', v_cosmology.human_design_storage_path,
    'human_design_original_filename', v_cosmology.human_design_original_filename,
    'human_design_mime_type', v_cosmology.human_design_mime_type,
    'human_design_size_bytes', v_cosmology.human_design_size_bytes,
    'updated_at', v_cosmology.updated_at
  );
end;
$$;

revoke all on function public.flowtel_get_member_cosmology(uuid) from public;
grant execute on function public.flowtel_get_member_cosmology(uuid) to authenticated;

create or replace function public.flowtel_save_my_cosmology(
  p_birth_date date,
  p_birth_time time without time zone,
  p_birth_time_confidence text,
  p_birthplace text,
  p_notes text default null,
  p_share_with_active_practitioner boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_confidence text := lower(trim(coalesce(p_birth_time_confidence,'unknown')));
  v_birthplace text := nullif(trim(coalesce(p_birthplace,'')), '');
  v_notes text := nullif(trim(coalesce(p_notes,'')), '');
  v_birth_time time without time zone := case when v_confidence = 'unknown' then null else p_birth_time end;
  v_existing_share boolean := false;
begin
  if v_user_id is null then
    raise exception 'Enter the Flowtel before saving Personal Cosmology.' using errcode = '28000';
  end if;

  if v_confidence not in ('exact','approximate','unknown') then
    raise exception 'Birth-time confidence must be Exact, Approximate, or Unknown.' using errcode = '22023';
  end if;

  if v_confidence in ('exact','approximate') and p_birth_time is null then
    raise exception 'Add a birth time or choose Unknown.' using errcode = '22023';
  end if;

  if char_length(coalesce(v_birthplace,'')) > 240 then
    raise exception 'Birthplace may contain up to 240 characters.' using errcode = '22023';
  end if;

  if char_length(coalesce(v_notes,'')) > 3000 then
    raise exception 'Personal Cosmology notes may contain up to 3,000 characters.' using errcode = '22023';
  end if;

  select coalesce(share_with_active_practitioner,false)
    into v_existing_share
  from public.flowtel_member_cosmology
  where member_id = v_user_id;

  insert into public.flowtel_member_cosmology (
    member_id,birth_date,birth_time,birth_time_confidence,birthplace,notes,
    share_with_active_practitioner,sharing_consented_at,sharing_revoked_at,updated_at
  ) values (
    v_user_id,p_birth_date,v_birth_time,v_confidence,v_birthplace,v_notes,
    coalesce(p_share_with_active_practitioner,false),
    case when coalesce(p_share_with_active_practitioner,false) then now() else null end,
    null,
    now()
  )
  on conflict (member_id) do update
  set birth_date = excluded.birth_date,
      birth_time = excluded.birth_time,
      birth_time_confidence = excluded.birth_time_confidence,
      birthplace = excluded.birthplace,
      notes = excluded.notes,
      share_with_active_practitioner = excluded.share_with_active_practitioner,
      sharing_consented_at = case
        when excluded.share_with_active_practitioner and not v_existing_share then now()
        when excluded.share_with_active_practitioner then public.flowtel_member_cosmology.sharing_consented_at
        else public.flowtel_member_cosmology.sharing_consented_at
      end,
      sharing_revoked_at = case
        when not excluded.share_with_active_practitioner and v_existing_share then now()
        when excluded.share_with_active_practitioner then null
        else public.flowtel_member_cosmology.sharing_revoked_at
      end,
      updated_at = now();

  return public.flowtel_get_member_cosmology(v_user_id);
end;
$$;

revoke all on function public.flowtel_save_my_cosmology(date,time without time zone,text,text,text,boolean) from public;
grant execute on function public.flowtel_save_my_cosmology(date,time without time zone,text,text,text,boolean) to authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'flowtel-personal-cosmology',
  'flowtel-personal-cosmology',
  false,
  15728640,
  array['image/png','image/jpeg','image/webp','application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Members may upload/change/remove only inside their own UUID folder.
drop policy if exists "Members upload their own Personal Cosmology chart" on storage.objects;
create policy "Members upload their own Personal Cosmology chart"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'flowtel-personal-cosmology'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Members update their own Personal Cosmology chart" on storage.objects;
create policy "Members update their own Personal Cosmology chart"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'flowtel-personal-cosmology'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'flowtel-personal-cosmology'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Members remove their own Personal Cosmology chart" on storage.objects;
create policy "Members remove their own Personal Cosmology chart"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'flowtel-personal-cosmology'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Signed downloads remain possible only for the owner or an explicitly shared,
-- currently authorized Mentor / appointment-holding Priestess.
drop policy if exists "Authorized viewers read Personal Cosmology charts" on storage.objects;
create policy "Authorized viewers read Personal Cosmology charts"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'flowtel-personal-cosmology'
    and exists (
      select 1
      from public.flowtel_member_cosmology cosmology
      where cosmology.member_id::text = (storage.foldername(name))[1]
        and public.flowtel_can_view_member_cosmology(cosmology.member_id)
    )
  );

create or replace function public.flowtel_set_my_cosmology_chart(
  p_storage_path text,
  p_original_filename text,
  p_mime_type text,
  p_size_bytes bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_user_id uuid := auth.uid();
  v_path text := trim(coalesce(p_storage_path,''));
  v_name text := nullif(trim(coalesce(p_original_filename,'')), '');
  v_mime text := lower(trim(coalesce(p_mime_type,'')));
  v_size bigint := coalesce(p_size_bytes,0);
begin
  if v_user_id is null then
    raise exception 'Enter the Flowtel before saving a Human Design chart.' using errcode = '28000';
  end if;

  if v_path = '' or split_part(v_path,'/',1) <> v_user_id::text then
    raise exception 'Human Design charts must stay inside your private Personal Cosmology room.' using errcode = '42501';
  end if;

  if v_mime not in ('image/png','image/jpeg','image/webp','application/pdf') then
    raise exception 'Upload a PNG, JPG, WebP, or PDF Human Design chart.' using errcode = '22023';
  end if;

  if v_size < 1 or v_size > 15728640 then
    raise exception 'Human Design charts may be up to 15 MB.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'flowtel-personal-cosmology'
      and o.name = v_path
  ) then
    raise exception 'The Human Design chart upload could not be verified.' using errcode = 'P0002';
  end if;

  insert into public.flowtel_member_cosmology (
    member_id,birth_time_confidence,human_design_storage_path,
    human_design_original_filename,human_design_mime_type,human_design_size_bytes,updated_at
  ) values (
    v_user_id,'unknown',v_path,v_name,v_mime,v_size,now()
  )
  on conflict (member_id) do update
  set human_design_storage_path = excluded.human_design_storage_path,
      human_design_original_filename = excluded.human_design_original_filename,
      human_design_mime_type = excluded.human_design_mime_type,
      human_design_size_bytes = excluded.human_design_size_bytes,
      updated_at = now();

  return public.flowtel_get_member_cosmology(v_user_id);
end;
$$;

revoke all on function public.flowtel_set_my_cosmology_chart(text,text,text,bigint) from public;
grant execute on function public.flowtel_set_my_cosmology_chart(text,text,text,bigint) to authenticated;

create or replace function public.flowtel_clear_my_cosmology_chart(
  p_storage_path text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_current text;
begin
  if v_user_id is null then
    raise exception 'Enter the Flowtel before changing Personal Cosmology.' using errcode = '28000';
  end if;

  select human_design_storage_path into v_current
  from public.flowtel_member_cosmology
  where member_id = v_user_id;

  if v_current is not null and p_storage_path is not null and v_current <> p_storage_path then
    raise exception 'That Human Design chart is not the chart currently attached to your room.' using errcode = '42501';
  end if;

  update public.flowtel_member_cosmology
  set human_design_storage_path = null,
      human_design_original_filename = null,
      human_design_mime_type = null,
      human_design_size_bytes = null,
      updated_at = now()
  where member_id = v_user_id;

  return public.flowtel_get_member_cosmology(v_user_id);
end;
$$;

revoke all on function public.flowtel_clear_my_cosmology_chart(text) from public;
grant execute on function public.flowtel_clear_my_cosmology_chart(text) to authenticated;

notify pgrst, 'reload schema';

commit;
