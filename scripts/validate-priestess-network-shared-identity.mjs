import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const read = file => readFile(path.join(root, file), "utf8");

const sql = await read("database/migration-056-priestess-network-shared-identity.sql");
const managerHtml = await read("manager/index.html");
const managerJs = await read("manager/app.js");
const managerCss = await read("manager/styles.css");
const teamHtml = await read("manager/priestess-team/index.html");
const teamJs = await read("manager/priestess-team/app.js");
const teamCss = await read("manager/priestess-team/styles.css");
const guestProfileHtml = await read("profile/index.html");
const guestProfileJs = await read("profile/app.js");
const studioHtml = await read("flow-fm/profile-studio/index.html");
const studioJs = await read("flow-fm/profile-studio/page.js");
const profilesJs = await read("shared/profiles.js");
const priestessProfilesJs = await read("shared/priestess-profiles.js");
const flowtelJs = await read("shared/flowtel.js");
const directoryJs = await read("shared/priestess-concierge-team.js");
const vercel = JSON.parse(await read("vercel.json"));

for (const token of [
  "profiles_hemisphere_check",
  "flowtel_normalize_hemisphere",
  "flowtel_update_my_shared_identity",
  "flowtel_profiles_sync_priestess_identity",
  "flowtel_priestess_profiles_enforce_identity",
  "flowtel_admin_list_priestess_concierge_team",
  "flowtel_admin_get_priestess_concierge_profile",
  "flowtel_admin_set_priestess_accepting_clients",
  "Calendar connection coming soon.",
]) assert(sql.includes(token), `Migration 056 is missing ${token}.`);

assert(sql.includes("left join public.flow_fm_priestess_profiles pp"), "Members without a Priestess Profile would be excluded.");
assert(sql.includes("flow_fm_effective_membership_rank") && sql.includes(">= 2"), "Directory is not based on all Flow FM and Council members.");
assert(sql.includes("coalesce(pp.status, 'not_started')"), "Profile-not-started state is not represented.");
assert(sql.includes("r.status = 'connected'") && sql.includes("coalesce(r.consent_granted, false) = true"), "Active client totals do not preserve relationship consent.");
assert(sql.includes("flowtel_current_user_is_phase_one_owner()"), "Priestess Team RPCs are not bound to the owner-only Concierge helper.");
const ownerDirectorySql = sql.split("-- Owner directory: every Flow FM and Council member, profile started or not.")[1] || "";
assert(!ownerDirectorySql.includes("flowtel_current_user_is_admin_or_owner()"), "Priestess Team RPCs must not broaden to generic admin accounts.");
assert(sql.includes("case when pp.member_id = v_user_id") && sql.includes("else null end as legal_name"), "The shared Priestess Profile reader exposes legal names beyond the member.");
assert(!/delete\s+from\s+public\.(profiles|flow_fm_priestess_profiles|flowtel_practitioner_relationships)/i.test(sql), "Migration 056 destructively deletes identity or relationship history.");
assert(!/update\s+auth\.users[\s\S]{0,260}encrypted_password/i.test(sql), "Migration 056 touches personal passwords.");
assert.equal((sql.match(/\$\$/g) || []).length % 2, 0, "Migration 056 has unmatched dollar quotes.");

assert(managerHtml.includes('data-filter="priestess-team"'), "Priestess Concierge Team card is missing.");
assert(managerHtml.includes('styles.css?v=0.10.74.2') && managerHtml.includes('app.js?v=0.10.74.2'), "Concierge cache keys are not on v0.10.71.");
assert(managerJs.includes("flowtel_admin_list_priestess_concierge_team"), "Concierge does not contain the resilient Priestess Team RPC boundary.");
assert(!managerJs.includes('from "../shared/priestess-concierge-team.js'), "Optional Priestess Team code must not be a required top-level Concierge dependency.");
for (const token of ["renderPriestessTeamQueue", "Every woman is included", "Calendar connection coming soon.", "Accepting Clients", "Profile Studio has not been started yet."]) {
  assert(managerJs.includes(token), `Priestess directory is missing ${token}.`);
}
assert(managerJs.includes('/manager/priestess-team/?member='), "Priestess cards do not open dedicated owner profiles.");
assert(managerCss.includes(".priestess-team-grid") && managerCss.includes(".priestess-team-card"), "Priestess Team directory styling is missing.");

assert(teamHtml.includes("PRIESTESS CONCIERGE TEAM"));
assert(teamJs.includes("currentUserHasConciergeAccess"), "Dedicated Priestess Team page is missing owner authorization.");
for (const token of ["getPriestessConciergeProfile", "setPriestessAcceptingClients", "CLIENTS + MENTEES", "Calendar connection coming soon.", "Open Client Snapshot"]) {
  assert(teamJs.includes(token), `Dedicated Priestess Team page is missing ${token}.`);
}
assert(teamCss.includes(".priestess-team-identity") && teamCss.includes(".priestess-team-summary"));
assert(directoryJs.includes("flowtel_admin_get_priestess_concierge_profile") && directoryJs.includes("flowtel_admin_set_priestess_accepting_clients"));

for (const html of [guestProfileHtml, studioJs]) {
  assert(html.includes("Hemisphere"), "Hemisphere selector/copy is missing from a profile room.");
  assert(html.includes("northern") && html.includes("southern") && html.includes("equatorial"), "Hemisphere options are incomplete.");
}
assert(guestProfileJs.includes("hemisphere:"), "Guest Profile does not save hemisphere.");
assert(studioJs.includes("update") || studioJs.includes("savePriestessProfileDraft"));
assert(studioJs.includes("This shared location also appears in your Guest Flowtel Profile."), "Profile Studio does not explain shared identity.");
assert(studioJs.includes("location: values.location"), "Profile Studio still drops private shared location when public display is off.");
assert(profilesJs.includes("function updateMySharedFlowtelIdentity") && profilesJs.includes("flowtel_update_my_shared_identity"));
assert(priestessProfilesJs.includes("updateMySharedFlowtelIdentity"), "Priestess Profile saves bypass the canonical identity writer.");
assert(flowtelJs.includes('profiles.js?v=0.10.73') && flowtelJs.includes('priestess-profiles.js?v=0.10.73'), "Flowtel barrel exports can serve stale profile modules.");

const rewrites = vercel.rewrites || [];
assert(rewrites.some(row => row.source === "/manager/priestess-team" && row.destination === "/manager/priestess-team/index.html"), "Dedicated Priestess Team route is missing.");

function duplicateIds(html) {
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
  return ids.filter((id, index) => ids.indexOf(id) !== index);
}
for (const [name, html] of Object.entries({ manager: managerHtml, team: teamHtml, guestProfile: guestProfileHtml, studio: studioHtml })) {
  assert.deepEqual(duplicateIds(html), [], `${name} has duplicate IDs.`);
}

assert(!managerHtml.toLowerCase().includes("world map"), "The intentionally deferred plotted world map was added to this release.");
console.log("Flowtel v0.10.71 Priestess Network and Shared Identity validation passed.");
