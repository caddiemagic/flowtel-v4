-- Flowtel v0.10.46 — Priestess Profile Link Save Repair
--
-- Purpose:
-- 1. Accept existing Priestess profile URLs with or without an explicit protocol.
-- 2. Persist the external profile link independently from the larger Profile Studio draft.
-- 3. Prevent a valid link from being silently discarded by the original strict URL cleaner.

create or replace function public.flow_fm_normalize_external_profile_url(p_value text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_raw text := nullif(trim(coalesce(p_value,'')), '');
  v_candidate text;
begin
  if v_raw is null then
    return null;
  end if;

  if v_raw ~* '^https?://' then
    v_candidate := v_raw;
  elsif v_raw ~* '^[a-z][a-z0-9+.-]*://' then
    raise exception 'Only http and https profile links are supported.' using errcode = '22023';
  else
    v_candidate := 'https://' || v_raw;
  end if;

  if v_candidate !~* '^https?://[^[:space:]]+$' then
    raise exception 'Add a valid website or Priestess profile URL.' using errcode = '22023';
  end if;

  return v_candidate;
end;
$$;

grant execute on function public.flow_fm_normalize_external_profile_url(text) to authenticated;

create or replace function public.flow_fm_set_priestess_profile_website(
  p_website_url text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_url text := public.flow_fm_normalize_external_profile_url(p_website_url);
begin
  if v_user_id is null then
    raise exception 'You must be signed in to tend your Priestess profile link.' using errcode = '28000';
  end if;

  if not public.flow_fm_current_user_can_tend_assignments() then
    raise exception 'The Priestess Profile Studio opens for Flow FM members.' using errcode = '42501';
  end if;

  insert into public.flow_fm_priestess_profiles (
    member_id,
    status,
    website_url,
    created_at,
    updated_at
  ) values (
    v_user_id,
    'draft',
    v_url,
    now(),
    now()
  )
  on conflict (member_id) do update
    set website_url = excluded.website_url,
        updated_at = now();

  return v_url;
end;
$$;

grant execute on function public.flow_fm_set_priestess_profile_website(text) to authenticated;

comment on function public.flow_fm_set_priestess_profile_website(text) is
  'v0.10.46: saves a member-owned external Priestess profile link independently, normalizing bare domains to https.';
