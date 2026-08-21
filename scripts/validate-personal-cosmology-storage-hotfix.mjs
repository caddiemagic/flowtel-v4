import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=(path)=>fs.readFileSync(path,'utf8');
const migration=read('database/migration-072-personal-cosmology-storage-policy-hotfix.sql');

for(const expected of [
  'Flowtel v0.10.86.1',
  'flowtel_can_read_cosmology_storage_object',
  'security definer',
  "coalesce(p_bucket_id,'') <> 'flowtel-personal-cosmology'",
  'return public.flowtel_can_view_member_cosmology(v_owner_id)',
  'drop policy if exists "Authorized viewers read Personal Cosmology charts" on storage.objects',
  'public.flowtel_can_read_cosmology_storage_object(bucket_id,name)',
  'grant execute on function public.flowtel_can_read_cosmology_storage_object(text,text) to authenticated'
]){
  assert.ok(migration.toLowerCase().includes(expected.toLowerCase()),`missing hotfix contract: ${expected}`);
}

const recreatedPolicy=migration.slice(migration.indexOf('create policy "Authorized viewers read Personal Cosmology charts"'));
assert.ok(!recreatedPolicy.includes('from public.flowtel_member_cosmology'),'active Storage policy must not query the revoked private table directly');
assert.ok(!/grant\s+select\s+on\s+(table\s+)?public\.flowtel_member_cosmology\s+to\s+authenticated/i.test(migration),'hotfix must not weaken Personal Cosmology table privacy with browser SELECT grants');
assert.ok(read('database/migration-071-moon-mail-personal-cosmology.sql').includes('revoke all on table public.flowtel_member_cosmology from anon, authenticated'),'migration 071 private-table revoke must remain intact');

console.log('Flowtel v0.10.86.1 Personal Cosmology Storage policy hotfix validator passed.');
