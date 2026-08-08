-- Flowtel v0.10.83.3 — Queendom event artwork Storage RLS hotfix
--
-- Requires migrations 067 and 068 first.
-- Supabase Storage upserts require SELECT + INSERT + UPDATE on storage.objects.
-- Migrations 067/068 intentionally granted INSERT/UPDATE/DELETE to Flowtel owner/admin
-- accounts, but omitted SELECT. The event editor uploads to a stable cover path with
-- upsert=true, so the missing SELECT policy blocks artwork replacement (and can surface
-- as a row-level security violation during upload).

begin;

do $$
begin
  if to_regclass('public.flowtel_queendom_events') is null then
    raise exception 'Flowtel migrations 067 and 068 must be installed before migration 069.';
  end if;
end;
$$;

-- Keep the public artwork bucket present and correctly constrained.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'flowtel-queendom-event-images',
  'flowtel-queendom-event-images',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public=true,
    file_size_limit=excluded.file_size_limit,
    allowed_mime_types=excluded.allowed_mime_types;

-- Upsert requires SELECT in addition to INSERT + UPDATE. Restrict authenticated
-- Storage metadata reads to Flowtel administration for this bucket only.
drop policy if exists "Flowtel owner reads Queendom event images" on storage.objects;
create policy "Flowtel owner reads Queendom event images"
on storage.objects for select to authenticated
using (
  bucket_id='flowtel-queendom-event-images'
  and public.flowtel_current_user_is_admin_or_owner()
);

-- Re-assert the companion write policies so migration 069 is an idempotent repair
-- for any live project where event-artwork policies were partially installed.
drop policy if exists "Flowtel owner uploads Queendom event images" on storage.objects;
create policy "Flowtel owner uploads Queendom event images"
on storage.objects for insert to authenticated
with check (
  bucket_id='flowtel-queendom-event-images'
  and public.flowtel_current_user_is_admin_or_owner()
);

drop policy if exists "Flowtel owner updates Queendom event images" on storage.objects;
create policy "Flowtel owner updates Queendom event images"
on storage.objects for update to authenticated
using (
  bucket_id='flowtel-queendom-event-images'
  and public.flowtel_current_user_is_admin_or_owner()
)
with check (
  bucket_id='flowtel-queendom-event-images'
  and public.flowtel_current_user_is_admin_or_owner()
);

drop policy if exists "Flowtel owner removes Queendom event images" on storage.objects;
create policy "Flowtel owner removes Queendom event images"
on storage.objects for delete to authenticated
using (
  bucket_id='flowtel-queendom-event-images'
  and public.flowtel_current_user_is_admin_or_owner()
);

commit;
