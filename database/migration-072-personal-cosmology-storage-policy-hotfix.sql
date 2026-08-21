-- Flowtel v0.10.86.1 — Personal Cosmology Storage Policy Hotfix
--
-- Migration 071 intentionally revoked direct browser-role access to
-- flowtel_member_cosmology. Its first Storage SELECT policy then referenced that
-- table directly from storage.objects, which can be evaluated while Supabase is
-- authorizing signed reads for unrelated private buckets (including the Flow FM
-- Lounge video bucket). That produced:
--   permission denied for table flowtel_member_cosmology
--
-- Keep the private-table revoke in place. Move the chart-object authorization
-- behind a SECURITY DEFINER helper instead of granting broad table SELECT.

begin;

create or replace function public.flowtel_can_read_cosmology_storage_object(
  p_bucket_id text,
  p_object_name text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_owner_text text;
  v_owner_id uuid;
begin
  if auth.uid() is null then
    return false;
  end if;

  -- Return before parsing any path from an unrelated Storage bucket.
  if coalesce(p_bucket_id,'') <> 'flowtel-personal-cosmology' then
    return false;
  end if;

  v_owner_text := split_part(coalesce(p_object_name,''),'/',1);
  if v_owner_text = '' then
    return false;
  end if;

  begin
    v_owner_id := v_owner_text::uuid;
  exception
    when invalid_text_representation then
      return false;
  end;

  return public.flowtel_can_view_member_cosmology(v_owner_id);
end;
$$;

revoke all on function public.flowtel_can_read_cosmology_storage_object(text,text) from public;
grant execute on function public.flowtel_can_read_cosmology_storage_object(text,text) to authenticated;

-- Replace the migration-071 policy. The active policy no longer performs a
-- direct SELECT against the private cosmology table as the authenticated role.
drop policy if exists "Authorized viewers read Personal Cosmology charts" on storage.objects;
create policy "Authorized viewers read Personal Cosmology charts"
  on storage.objects for select to authenticated
  using (
    public.flowtel_can_read_cosmology_storage_object(bucket_id,name)
  );

notify pgrst, 'reload schema';

commit;
