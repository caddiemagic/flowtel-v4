import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => readFile(path.join(root, file), 'utf8');

const sql = await read('database/migration-057-four-seasons-time-space.sql');
const clientHtml = await read('client/index.html');
const clientJs = await read('client/app.js');
const clientCss = await read('client/styles.css');
const hfrHtml = await read('flow-fm/hourly-flow-rate/index.html');
const hfrJs = await read('flow-fm/hourly-flow-rate/page.js');
const hfrShared = await read('shared/hourly-flow-rate.js');
const hfrCore = await read('shared/hourly-flow-rate-calculations.js');
const timeHtml = await read('flow-fm/time-space/index.html');
const timeJs = await read('flow-fm/time-space/page.js');
const timeCss = await read('flow-fm/time-space/styles.css');
const timeShared = await read('shared/time-and-space.js');
const timeCore = await read('shared/time-and-space-core.js');
const flowFmJs = await read('flow-fm/app.js');
const flowFmHtml = await read('flow-fm/index.html');
const managerHtml = await read('manager/index.html');
const managerCss = await read('manager/styles.css');
const vercel = JSON.parse(await read('vercel.json'));

for (const token of [
  'location_label',
  'flowtel_hfr_save_season_location',
  'flowtel_hfr_save_four_season_locations',
  'flowtel_current_user_can_view_time_and_space',
  'flowtel_get_time_and_space_team',
  "pp.status = 'approved'",
  'flow_fm_team_map_opt_out',
]) assert(sql.includes(token), `Migration 057 is missing ${token}.`);

assert(sql.includes("public.flowtel_current_user_is_phase_one_owner()"), 'Owner Time + Space access is missing.');
assert(sql.includes("public.flowtel_current_user_has_product_access('flowtel')"), 'Time + Space does not enforce Flowtel product access.');
assert(sql.includes("coalesce(a.flowtel_access_status, 'active') <> 'revoked'"), 'Revoked team profiles may still appear.');
assert(sql.includes('nullif(trim(concat_ws'), 'Existing structured seasonal locations are not backfilled into the canonical label.');
assert(!/delete\s+from\s+public\.(flowtel_hourly_flow_rate|profiles|flow_fm_priestess_profiles)/i.test(sql), 'Migration 057 destructively deletes preserved data.');
assert(!/drop\s+(table|column)/i.test(sql), 'Migration 057 drops a table or column.');
assert(!/encrypted_password|raw_app_meta_data/i.test(sql), 'Migration 057 touches authentication secrets.');
assert.equal((sql.match(/\$\$/g) || []).length % 2, 0, 'Migration 057 has unmatched SQL dollar quotes.');

const teamFunction = sql.split('create or replace function public.flowtel_get_time_and_space_team()')[1] || '';
const teamReturns = teamFunction.split('language plpgsql')[0] || '';
for (const forbidden of ['first_name', 'last_name', 'email', 'client_count', 'cycle_day']) {
  assert(!teamReturns.includes(forbidden), `Time + Space RPC exposes ${forbidden}.`);
}

for (const label of ['Winter Location', 'Spring Location', 'Summer Location', 'Autumn Location']) {
  assert(clientJs.includes(label), `Lounge is missing ${label}.`);
}
assert(clientHtml.includes('id="loungeSeasonPlannerForm"'), 'Simplified Four Seasons form is missing.');
assert(clientHtml.includes('Save My Four Locations'), 'Single Four Seasons save action is missing.');
assert(!clientHtml.includes('id="loungeReplayNotes"'), 'Replay Notes should be hidden only from this Four Seasons workshop.');
assert(!clientJs.includes('lodging_idea') && !clientJs.includes('calling_reflection'), 'The Lounge still exposes detailed seasonal planning fields.');
assert(clientJs.includes('saveHourlyFlowRateFourSeasonLocations'), 'The Lounge does not save to the canonical Hourly Flow Rate plan.');
assert(clientCss.includes('.lounge-season-planner-form') && clientCss.includes('.lounge-season-save'), 'Simplified Lounge styling is missing.');
assert(clientHtml.includes('styles.css?v=0.10.75') && clientHtml.includes('app.js?v=0.10.75'), 'Client cache keys are not on v0.10.75.');

assert(hfrJs.includes('hourlyFlowRateSeasonLocation'), 'Hourly Flow Rate does not read the canonical location label.');
assert(hfrJs.includes('saveHourlyFlowRateSeasonLocation'), 'Hourly Flow Rate does not write the canonical location label.');
assert(hfrJs.includes('name="location_label"'), 'Hourly Flow Rate still lacks the single location field.');
assert(!hfrJs.includes('name="city"') && !hfrJs.includes('name="region"') && !hfrJs.includes('name="country"'), 'Hourly Flow Rate still renders separate city/region/country fields.');
assert(hfrShared.includes('flowtel_hfr_save_four_season_locations') && hfrShared.includes('flowtel_hfr_save_season_location'), 'Shared HFR data boundary is missing new RPCs.');
assert(hfrCore.includes('seasonLocationLabel') && hfrCore.includes('location_label'), 'Pure HFR status logic does not recognize the canonical label.');
assert(hfrHtml.includes('page.js?v=0.10.77'), 'Hourly Flow Rate cache key is stale.');

assert(timeHtml.includes('Time + Space'), 'Time + Space page title is missing.');
for (const token of ['Local time', 'Hemisphere']) {
  assert(timeJs.includes(token), `Time + Space cards are missing ${token}.`);
}
assert(timeJs.includes('outerSeason'), 'Time + Space cards do not render the current outer season.');
assert(timeHtml.includes('plotted world map') && timeHtml.includes('later release'), 'The plotted map deferral is not recorded in the UI.');
assert(timeJs.includes('listTimeAndSpaceTeam') && timeJs.includes('timeAndSpacePresentation'), 'Time + Space rendering is not wired.');
assert(timeCore.includes('outerSeasonForHemisphere'), 'Time + Space pure seasonal helper is missing.');
assert(timeCore.includes('[11,12,1]') && timeCore.includes('[2,3,4]') && timeCore.includes('[5,6,7]'), 'Time + Space does not use the established Flowtel outer-season cadence.');
assert(!timeCore.includes('America/Los_Angeles'), 'Member clocks are incorrectly hard-coded to Flowtel Time.');
assert(timeShared.includes("supabase.rpc('flowtel_get_time_and_space_team')"), 'Time + Space RPC wrapper is missing.');
assert(timeCss.includes('.time-space-grid') && timeCss.includes('.outer-season'), 'Time + Space card styling is missing.');
assert(!/mapbox|google\.maps|leaflet|<svg[^>]*world/i.test(`${timeHtml}\n${timeJs}`), 'The intentionally deferred plotted map or external location SDK was added.');

assert(flowFmJs.includes("href:'/flow-fm/time-space/'"), 'Flow FM support-room doorway is missing.');
assert(flowFmHtml.includes('/flow-fm/app.js?v=0.10.77'), 'Flow FM hallway cache key is stale.');
assert(managerHtml.includes('href="/flow-fm/time-space/"') && managerHtml.includes('Time + Space'), 'Owner Concierge doorway is missing.');
assert(managerHtml.includes('styles.css?v=0.10.76') && managerHtml.includes('app.js?v=0.10.76'), 'Concierge cache keys are stale.');
assert(managerCss.includes('.stat-card-link'), 'Owner Time + Space card styling is missing.');

const rewrite = (vercel.rewrites || []).find((row) => row.source === '/flow-fm/time-space');
assert.equal(rewrite?.destination, '/flow-fm/time-space/index.html', 'Time + Space rewrite is missing.');
const privateHeader = (vercel.headers || []).find((row) => row.source === '/flow-fm/time-space');
assert(privateHeader?.headers?.some((header) => header.key === 'X-Robots-Tag'), 'Time + Space noindex header is missing.');

function duplicateIds(html){
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
  return ids.filter((id, index) => ids.indexOf(id) !== index);
}
for (const [name, html] of Object.entries({ client: clientHtml, hfr: hfrHtml, timeSpace: timeHtml, manager: managerHtml })) {
  assert.deepEqual(duplicateIds(html), [], `${name} has duplicate IDs.`);
}

function balancedCss(text){
  let depth = 0, quote = '', comment = false;
  for(let i = 0; i < text.length; i += 1){
    const char = text[i], next = text[i + 1];
    if(comment){ if(char === '*' && next === '/'){ comment = false; i += 1; } continue; }
    if(!quote && char === '/' && next === '*'){ comment = true; i += 1; continue; }
    if(quote){ if(char === '\\'){ i += 1; continue; } if(char === quote) quote = ''; continue; }
    if(char === '"' || char === "'"){ quote = char; continue; }
    if(char === '{') depth += 1;
    if(char === '}') depth -= 1;
    if(depth < 0) return false;
  }
  return depth === 0 && !quote && !comment;
}
for (const [name, css] of Object.entries({ client: clientCss, timeSpace: timeCss, manager: managerCss })) {
  assert(balancedCss(css), `${name} CSS is structurally unbalanced.`);
}

console.log('Flowtel v0.10.76 Four Seasons quadrant and Time + Space validation passed.');
