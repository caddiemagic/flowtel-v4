-- Flowtel beta test profiles
-- Step 1: Create these 8 users in Supabase Auth first.
-- Dashboard → Authentication → Users → Add user
-- Use password: FlowtelBeta!2026
-- Turn on "Auto Confirm User" if available.
--
-- Step 2: Run this SQL to assign names and roles in public.profiles.

with users as (
  select id, email from auth.users
  where email in (
    'flowtel.practitioner1@test.local',
    'flowtel.practitioner2@test.local',
    'flowtel.practitioner3@test.local',
    'flowtel.practitioner4@test.local',
    'flowtel.guest1@test.local',
    'flowtel.guest2@test.local',
    'flowtel.guest3@test.local',
    'flowtel.guest4@test.local'
  )
)
insert into public.profiles (id,email,first_name,last_name,role,flowfm_started_at,practitioner_level,is_initiated)
select
  id,
  email,
  case email
    when 'flowtel.practitioner1@test.local' then 'Practitioner'
    when 'flowtel.practitioner2@test.local' then 'Practitioner'
    when 'flowtel.practitioner3@test.local' then 'Practitioner'
    when 'flowtel.practitioner4@test.local' then 'Practitioner'
    when 'flowtel.guest1@test.local' then 'Guest'
    when 'flowtel.guest2@test.local' then 'Guest'
    when 'flowtel.guest3@test.local' then 'Guest'
    when 'flowtel.guest4@test.local' then 'Guest'
  end,
  case email
    when 'flowtel.practitioner1@test.local' then 'Summer'
    when 'flowtel.practitioner2@test.local' then 'Autumn'
    when 'flowtel.practitioner3@test.local' then 'Winter'
    when 'flowtel.practitioner4@test.local' then 'Spring'
    when 'flowtel.guest1@test.local' then 'Winter'
    when 'flowtel.guest2@test.local' then 'Spring'
    when 'flowtel.guest3@test.local' then 'Summer'
    when 'flowtel.guest4@test.local' then 'Autumn'
  end,
  case
    when email like 'flowtel.practitioner%' then 'practitioner'
    else 'client'
  end,
  case email
    when 'flowtel.practitioner1@test.local' then date '2025-11-01'
    when 'flowtel.practitioner2@test.local' then date '2025-12-01'
    when 'flowtel.practitioner3@test.local' then date '2025-06-01'
    when 'flowtel.practitioner4@test.local' then date '2025-08-01'
    else null
  end,
  case
    when email like 'flowtel.practitioner%' then 'Initiate'
    else null
  end,
  false
from users
on conflict (id) do update set
  email=excluded.email,
  first_name=excluded.first_name,
  last_name=excluded.last_name,
  role=excluded.role,
  flowfm_started_at=excluded.flowfm_started_at,
  practitioner_level=excluded.practitioner_level,
  is_initiated=excluded.is_initiated;
