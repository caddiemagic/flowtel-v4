-- database/migration-006-squarespace-identity-bridge.sql
-- Adds safe membership metadata for the Squarespace → Flowtel beta bridge.
-- Existing profiles always win; lower membership doorways should never downgrade a profile.

alter table public.profiles
  add column if not exists membership_type text,
  add column if not exists membership_rank integer default 0,
  add column if not exists squarespace_source text,
  add column if not exists source_updated_at timestamptz;

create index if not exists profiles_membership_type_idx
  on public.profiles (membership_type);

create index if not exists profiles_membership_rank_idx
  on public.profiles (membership_rank);

comment on column public.profiles.membership_type is
  'Squarespace membership doorway/type: queendom, flowfm, or council.';

comment on column public.profiles.membership_rank is
  'Access rank used to prevent lower doorways from downgrading higher memberships: queendom=1, flowfm=2, council=3.';

comment on column public.profiles.squarespace_source is
  'Last Squarespace doorway used to enter Flowtel.';
