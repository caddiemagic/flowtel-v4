import assert from "node:assert/strict";
import {toClientSuite} from "./client-suite-view.mjs";
const enrollment={id:"enrollment-a",status:"active",starts_on:"2026-10-20",ends_on:"2027-01-20",support_ends_on:"2027-01-20"};
const offering={title:"Sacred Self-Study",price_cents:377700};
const suite=toClientSuite({enrollment,offering,
 sessions:[
 {id:"session-a",enrollment_id:"enrollment-a",session_number:1,session_kind:"activation",duration_minutes:180,status:"completed"},
 {id:"session-b",enrollment_id:"enrollment-a",session_number:2,session_kind:"empowerment",duration_minutes:90,status:"confirmed",scheduled_at:"2026-11-03T19:00:00Z"},
 {id:"foreign",enrollment_id:"enrollment-b",session_number:3,session_kind:"empowerment",duration_minutes:90,status:"confirmed"}],
 focus:{client_visible_focus:"Practice receiving support",private_mentor_notes:"OWNER ONLY"},
 replays:[{id:"replay-a",session_id:"session-a",title:"Activation",storage_path:"secret-path",visible_to_client:true},
          {id:"replay-b",session_id:"session-b",title:"Hidden",storage_path:"hidden",visible_to_client:false},
          {id:"replay-other",session_id:"foreign",title:"Another client",visible_to_client:true}],
 cycle:{day:22,season:"Inner Autumn",asOf:"2026-10-15",sensitiveRawData:"hidden"}});
assert.equal(suite.progress.total,2);
assert.equal(suite.progress.completed,1);
assert.equal(suite.replays.length,1);
assert.equal(suite.nextCall.id,"session-b");
assert.equal(suite.monthlyFocus,"Practice receiving support");
assert.ok(!JSON.stringify(suite).includes("OWNER ONLY"));
assert.ok(!JSON.stringify(suite).includes("secret-path"));
assert.ok(!JSON.stringify(suite).includes("Another client"));
assert.ok(!JSON.stringify(suite).includes("sensitiveRawData"));
console.log("Client Suite projection tests passed.");
