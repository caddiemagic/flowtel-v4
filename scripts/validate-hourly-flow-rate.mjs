import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile('flow-fm/hourly-flow-rate/index.html', 'utf8');
const js = await readFile('flow-fm/hourly-flow-rate/page.js', 'utf8');
const css = await readFile('flow-fm/hourly-flow-rate/styles.css', 'utf8');
const migration = await readFile('database/migration-047-hourly-flow-rate-mvp.sql', 'utf8');
const vercel = JSON.parse(await readFile('vercel.json', 'utf8'));

const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
assert.deepEqual(duplicates, [], `Duplicate HTML ids: ${duplicates.join(', ')}`);

for (const id of ['topNav','accessGate','experience','rateHero','currencyRoom','seasonMap','seasonStudio','homeBaseRoom','timelineRoom','witnessRoom','pageMessage']) {
  assert(ids.includes(id), `Missing required HTML id: ${id}`);
  assert(js.includes(`getElementById('${id}')`) || js.includes(`getElementById("${id}")`), `JS does not reference required element: ${id}`);
}

assert.equal((css.match(/{/g) || []).length, (css.match(/}/g) || []).length, 'CSS braces are unbalanced.');
assert(!/percentage[- ]complete|progress bar/i.test(html + js), 'Pressure-based completion language found.');
assert(!/\$0\s*\/\s*hour/i.test(html + js), 'A $0/hour judgment state was introduced.');
assert(js.includes('YOUR SEASONAL SOVEREIGNTY MAP'));
assert(js.includes('YOUR EMERGING HOURLY FLOW RATE'));
assert(js.includes('revenue capacity required to resource your vision'));
assert(js.includes('calculateNourishmentTotal'), 'Detailed nourishment calculation is not wired into the experience.');
assert(js.includes('calculateSelfCareServiceTotal'), 'Detailed self-care calculation is not wired into the experience.');
assert(js.includes('financial, tax, legal, or investment advice'), 'Educational disclaimer missing.');

for (const table of ['plans','seasons','cost_entries','home_base','snapshots']) {
  assert(migration.includes(`alter table public.flowtel_hourly_flow_rate_${table} enable row level security;`), `RLS missing for ${table}.`);
  assert(migration.includes(`revoke all on public.flowtel_hourly_flow_rate_${table} from anon;`), `Anonymous privileges were not revoked for ${table}.`);
  assert(migration.includes(`revoke insert, update, delete on public.flowtel_hourly_flow_rate_${table} from authenticated;`), `Direct writes were not revoked for ${table}.`);
}
assert(migration.includes("member_id = auth.uid() and public.flowtel_hfr_current_user_is_eligible()"), 'Member-owned RLS boundary missing.');
assert(migration.includes("public.flowtel_current_user_has_product_access('flowtel')"), 'Flowtel product access boundary missing.');
assert(migration.includes('>= 2'), 'Flow FM/Council eligibility boundary missing.');
assert(migration.includes('/ 480.0'));
assert(migration.includes('* 2.0'));
assert(migration.includes("timezone('America/Los_Angeles', now())"));
assert(migration.includes('create unique index if not exists flowtel_hfr_one_plan_per_member_idx'), 'One preserved plan per member is not enforced.');
assert(migration.includes("last_open_section='home-base'"), 'Home Base save/return state is not persisted.');
assert(migration.includes("last_open_section='season-'||p_season_id::text"), 'Season save/return state is not persisted.');
assert(migration.includes('flowtel_hourly_flow_rate_snapshots'), 'Receiving Timeline storage missing.');
assert(migration.includes('Original amount and original currency must be saved together.'), 'Original currency pairing guard missing.');
assert(migration.includes('researched_on date not null'), 'Price research date is not preserved.');
assert(migration.includes("details jsonb not null default '{}'::jsonb"), 'Detailed builder inputs are not preserved.');
assert(!/grant\s+(insert|update|delete)\s+on\s+public\.flowtel_hourly_flow_rate_/i.test(migration), 'Direct authenticated table writes were granted.');

assert((vercel.rewrites || []).some((item) => item.source === '/flow-fm/hourly-flow-rate' && item.destination === '/flow-fm/hourly-flow-rate/index.html'), 'Hourly Flow Rate rewrite missing.');

console.log('Hourly Flow Rate HTML, JS reference, CSS structure, route, and static RLS privacy validation passed.');
