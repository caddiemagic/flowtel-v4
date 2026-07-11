-- database/migration-027-squarespace-api-bridge.sql
-- Flowtel v0.10.18 — Squarespace Contacts API identity metadata.
-- Stores the Squarespace contact identifier used by the server-side bridge.

alter table public.profiles
  add column if not exists squarespace_contact_id text,
  add column if not exists squarespace_contact_email text,
  add column if not exists squarespace_contact_synced_at timestamptz,
  add column if not exists squarespace_verified_at timestamptz;

create index if not exists profiles_squarespace_contact_id_idx
  on public.profiles (squarespace_contact_id);

create index if not exists profiles_squarespace_contact_email_idx
  on public.profiles (squarespace_contact_email);

comment on column public.profiles.squarespace_contact_id is
  'Squarespace Contacts API contact id for the member record matched by Flowtel.';

comment on column public.profiles.squarespace_verified_at is
  'Last time Flowtel verified this profile through the server-side Squarespace API bridge.';
