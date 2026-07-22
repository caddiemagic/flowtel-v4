import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root=process.cwd();
const read=file=>readFile(path.join(root,file),"utf8");
const sql=await read("database/migration-055-caddie-master-command-center.sql");
const managerHtml=await read("manager/index.html");
const managerJs=await read("manager/app.js");
const managerCss=await read("manager/styles.css");
const network=await read("shared/caddie-magic-network.js");
const schedule=await read("shared/caddie-magic-schedule.js");
const compass=await read("shared/caddie-magic-compass.js");
const deskHtml=await read("caddie-magic/caddie-desk/index.html");
const deskJs=await read("caddie-magic/caddie-desk/app.js");
const teamHtml=await read("manager/caddie-team/index.html");
const teamJs=await read("manager/caddie-team/app.js");
const scoreCss=await read("caddie-magic/score-map/styles.css");
const playerCompass=await read("caddie-magic/compass/app.js");
const vercel=JSON.parse(await read("vercel.json"));

for(const token of [
  "caddie_magic_team_messages","caddie_magic_get_master_command_center",
  "caddie_magic_list_caddie_concierge_team","caddie_magic_get_caddie_concierge_profile",
  "caddie_magic_set_compass_consecrated","caddie_magic_acknowledge_upcoming_golf",
  "caddie_magic_mark_player_messages_read","caddie_magic_mark_assignment_noted",
  "master_read_at","compass_consecrated_at","caddie_master_acknowledged_at"
]) assert(sql.includes(token),`Migration 055 is missing ${token}.`);
assert(sql.includes("Migration 037 remains retired"));
assert.equal((sql.match(/\$\$/g)||[]).length%2,0,"Migration 055 has unmatched dollar quotes.");
assert(!/delete\s+from\s+public\.caddie_magic_/i.test(sql),"Migration 055 destructively deletes Caddie Magic history.");
assert(!/grant\s+(insert|update|delete)\s+on\s+public\.caddie_magic_team_messages/i.test(sql),"Browser roles received direct Caddie Team message writes.");
assert(sql.includes("Only The Caddie Master"),"Owner-only Caddie Master authorization language is missing.");
assert(sql.includes("flowtel_current_user_is_phase_one_owner()"),"Migration 055 is not bound to the established owner-only Concierge helper.");
assert(!sql.includes("flowtel_current_user_is_admin_or_owner()"),"Migration 055 must not broaden Caddie Master RPCs to generic admin accounts.");
assert(sql.includes("set master_read_at = coalesce(master_read_at, created_at)"),"Historical Player messages are not safely baselined as read.");

assert(managerHtml.includes('data-filter="caddie-master"'));
assert(managerHtml.includes('data-filter="caddie-network"'));
assert(managerHtml.includes('data-filter="caddie-team"'));
assert(!managerHtml.includes('data-filter="caddie-players"'),"The replaced Caddie Players card is still active.");
for(const token of ["renderCaddieMasterQueue","renderCaddieTeamQueue","Send the Caddie Force","CADDIE TEAM MESSAGES","COURSE VERIFICATION REQUESTS","Submitted Caddie Profiles"]){
  assert(managerJs.toLowerCase().includes(token.toLowerCase()),`Manager is missing ${token}.`);
}
assert(managerJs.includes("listCaddieMagicPlayers")&&managerJs.includes("Create Player Invite"),"Player access was not consolidated into Caddie Network.");
assert(managerJs.includes('caddieTeamStatusFilter="active"'),"Caddie Concierge Team does not default to Active.");
assert(managerJs.includes("caddieTeamCourseFilter"),"Caddie Concierge Team golf-course filtering is missing.");
assert(managerCss.includes(".caddie-master-command-center")&&managerCss.includes(".caddie-team-grid"));

for(const token of ["getCaddieMasterCommandCenter","listCaddieConciergeTeam","getCaddieConciergeProfile","setCompassConsecrated","getMyCaddieTeamMessages","sendMyCaddieTeamMessage","getCaddieTeamMessages","sendCaddieTeamMessage"]){
  assert(network.includes(`function ${token}`),`Network wrapper missing: ${token}.`);
}
assert(schedule.includes("function acknowledgeUpcomingGolf"));
assert(compass.includes("function markPlayerMessagesRead")&&compass.includes("function markAssignmentNoted"));

assert(deskHtml.includes('id="caddieTeamMessagesCard"'));
assert(deskJs.includes("getMyCaddieTeamMessages")&&deskJs.includes("sendMyCaddieTeamMessage"));
assert(teamHtml.includes("CADDIE CONCIERGE TEAM")&&teamHtml.includes('id="teamMessageThread"'));
assert(teamJs.includes("currentUserHasConciergeAccess"),"Caddie Team profile is missing owner authorization.");
assert(teamJs.includes("Consecrate Compass")&&teamJs.includes("setCompassConsecrated"));
assert(teamJs.includes("getCaddieConciergeProfile")&&teamJs.includes("getCaddieTeamMessages"));
assert(playerCompass.includes("The Caddie Force is with you."));
assert(scoreCss.includes("Score Map controls use the Locker Room system"));
assert(scoreCss.includes(".cm-display-button.is-active,.cm-filter-button.is-active"));
assert((vercel.rewrites||[]).some(row=>row.source==="/manager/caddie-team"&&row.destination==="/manager/caddie-team/index.html"));

function duplicateIds(html){const ids=[...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match=>match[1]);return ids.filter((id,index)=>ids.indexOf(id)!==index);}
for(const [name,html] of Object.entries({manager:managerHtml,desk:deskHtml,team:teamHtml})) assert.deepEqual(duplicateIds(html),[],`${name} has duplicate IDs.`);

console.log("Flowtel v0.10.70 / Caddie Magic v0.5.2 command center validation passed.");
