import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration=await readFile(new URL('../database/migration-067-flowtel-calendar.sql',import.meta.url),'utf8');

// Reference checks for the 28-day planning map used by migration 067.
const seasonFor=(day)=>day<=5||day>=27?'Inner Winter':day<=11?'Inner Spring':day<=19?'Inner Summer':'Inner Autumn';
assert.deepEqual(Array.from({length:28},(_,i)=>seasonFor(i+1)).reduce((acc,season)=>(acc[season]=(acc[season]||0)+1,acc),{}),{
  'Inner Winter':7,
  'Inner Spring':6,
  'Inner Summer':8,
  'Inner Autumn':7,
});
assert.equal(seasonFor(1),'Inner Winter');
assert.equal(seasonFor(6),'Inner Spring');
assert.equal(seasonFor(12),'Inner Summer');
assert.equal(seasonFor(20),'Inner Autumn');
assert.equal(seasonFor(27),'Inner Winter');

// Audience matrix expressed by migration 067: visibility is universal to Queendom+
// while Zoom access is membership-gated, not RSVP-gated.
const canJoin=(rank,audience)=>rank>=(audience==='flowfm'?2:1);
assert.equal(canJoin(1,'queendom'),true);
assert.equal(canJoin(1,'flowfm'),false);
assert.equal(canJoin(2,'queendom'),true);
assert.equal(canJoin(2,'flowfm'),true);
assert.equal(canJoin(3,'flowfm'),true);
assert(migration.includes("v_rank<case when v_event.audience='flowfm' then 2 else 1 end"));
assert(!migration.slice(migration.indexOf('function public.flowtel_get_queendom_event_join_details'),migration.indexOf('function public.flowtel_admin_list_queendom_events')).includes('cancelled_at is null'));

// Owner/Priestess call visibility is intentionally different from member event visibility.
assert(migration.includes('and (v_owner or provider.user_id = v_user_id)'));

console.log('Flowtel v0.10.83 calendar behavior checks passed.');
