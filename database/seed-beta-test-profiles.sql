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
insert into public.profiles (id,email,first_name,last_name,role)
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
  end
from users
on conflict (id) do update set
  email=excluded.email,
  first_name=excluded.first_name,
  last_name=excluded.last_name,
  role=excluded.role;
