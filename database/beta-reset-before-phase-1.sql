-- Flowtel Phase 1 Beta Reset Helper
--
-- IMPORTANT:
-- This is NOT a migration. Do not run blindly.
-- Back up Supabase first, then edit the target emails below.
-- This script is designed to clear pre-beta/fake testing data while preserving profiles and auth users.

-- 1) Replace these sample emails with the accounts whose test data should be cleared.
--    Add Megan/admin emails only if you intentionally want to clear their fake test stays too.

with target_emails(email) as (
  values
    ('tester1@example.com'),
    ('tester2@example.com'),
    ('tester3@example.com')
),
target_profiles as (
  select p.id, p.email
  from public.profiles p
  join target_emails t on lower(p.email) = lower(t.email)
),
target_stays as (
  select s.id
  from public.flowtel_stays s
  where s.client_id in (select id from target_profiles)
)
delete from public.flowtel_reflections r
where r.stay_id in (select id from target_stays);

with target_emails(email) as (
  values
    ('tester1@example.com'),
    ('tester2@example.com'),
    ('tester3@example.com')
),
target_profiles as (
  select p.id, p.email
  from public.profiles p
  join target_emails t on lower(p.email) = lower(t.email)
)
delete from public.flowtel_stays s
where s.client_id in (select id from target_profiles);

with target_emails(email) as (
  values
    ('tester1@example.com'),
    ('tester2@example.com'),
    ('tester3@example.com')
),
target_profiles as (
  select p.id, p.email
  from public.profiles p
  join target_emails t on lower(p.email) = lower(t.email)
)
delete from public.flowtel_practitioner_relationships r
where r.client_id in (select id from target_profiles)
   or r.practitioner_id in (select id from target_profiles);

with target_emails(email) as (
  values
    ('tester1@example.com'),
    ('tester2@example.com'),
    ('tester3@example.com')
),
target_profiles as (
  select p.id, p.email
  from public.profiles p
  join target_emails t on lower(p.email) = lower(t.email)
)
delete from public.flowtel_practitioner_clock_sessions c
where c.practitioner_id in (select id from target_profiles);

with target_emails(email) as (
  values
    ('tester1@example.com'),
    ('tester2@example.com'),
    ('tester3@example.com')
),
target_profiles as (
  select p.id, p.email
  from public.profiles p
  join target_emails t on lower(p.email) = lower(t.email)
)
delete from public.flow_fm_priestess_profiles pp
where pp.member_id in (select id from target_profiles);

with target_emails(email) as (
  values
    ('tester1@example.com'),
    ('tester2@example.com'),
    ('tester3@example.com')
),
target_profiles as (
  select p.id, p.email
  from public.profiles p
  join target_emails t on lower(p.email) = lower(t.email)
)
delete from public.flow_fm_assignment_submissions a
where a.member_id in (select id from target_profiles);

-- Optional: reset profile bridge/status metadata for targeted testers while preserving accounts.
-- Uncomment only if you want them to feel brand-new inside Flowtel.
--
-- with target_emails(email) as (
--   values
--     ('tester1@example.com'),
--     ('tester2@example.com'),
--     ('tester3@example.com')
-- )
-- update public.profiles p
-- set
--   squarespace_contact_id = null,
--   squarespace_contact_synced_at = null,
--   squarespace_verified_at = null,
--   source_updated_at = now()
-- from target_emails t
-- where lower(p.email) = lower(t.email);
