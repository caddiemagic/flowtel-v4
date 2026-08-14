import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const must=(file,needles)=>{const text=read(file);for(const needle of needles)assert.ok(text.includes(needle),`${file} missing ${needle}`);return text;};

const migration=must('database/migration-070-event-access-beta-exit.sql',[
  'co_host_member_id','how_to_prepare','attendee_guide_url','will_be_recorded','live_room_time',
  'public_access','queendom_access','flowfm_access','squarespace_product_id',
  'flowtel_queendom_event_entitlements','flowtel_member_signup_admissions','flowtel_current_user_is_event_pass','flowtel_event_pass_claim_auth_user',
  "'event_pass'",'flowtel_get_queendom_event_join_details','notify pgrst',
]);
assert.ok(migration.trim().startsWith('-- Flowtel v0.10.85'));
assert.ok(migration.includes('begin;')&&migration.trim().endsWith('commit;'));
assert.equal((migration.match(/\$\$/g)||[]).length%2,0,'migration dollar quotes must balance');
assert.ok(!migration.includes('if v_rank<case'),'old invalid PL/pgSQL comparison returned');
assert.ok(migration.includes("Find a private space. Light a candle + incense. Make tea. Grab a journal + pen."));

must('manager/events/index.html',['Co-host','How to prepare','Attendee guide URL','Will this be recorded?','Live room / gathering time','Who is included?','Squarespace product ID']);
must('manager/events/app.js',['co_host_member_id','how_to_prepare','attendee_guide_url','will_be_recorded','public_access','queendom_access','flowfm_access']);
must('client/index.html',['First time here? Create your account','Forgot your password?','eventRoomOverlay']);
const client=must('client/app.js',['createAccountWithEmail','FLOWTEL TIME','YOUR TIME','HOW TO PREPARE','Co-host','verifyQueendomEventTicket','live_room_starts_at',"phase:'event'","phase:separate?'live':'event-live'"]);
assert.ok(!/temporary Flowtel beta password/i.test(client),'customer beta password copy must not return');
assert.ok(!client.includes('membershipType:SQUARESPACE_MEMBERSHIP || undefined'),'URL membership doorway must not authorize remembered/sign-in profile claims');
must('queendom-events/index.html',['YOUR EVENT PASS','CREATE EVENT PASS','agendaEventRoom']);
must('queendom-events/app.js',['flowtel_event_pass','LIVE ROOM OPENS','HOW TO PREPARE','Will this be recorded?','co_host_name','FLOWTEL TIME','YOUR TIME',"phase:'event'","phase:separate?'live':'event-live'"]);
must('api/event-ticket-verify.js',['orderMatchForProduct','REFUNDED','flowtel_queendom_event_entitlements']);
must('api/squarespace-bridge.js',['verifySquarespaceMembershipPurchase','upsertMemberSignupAdmission','flowtel_member_signup_admissions','SQUARESPACE_QUEENDOM_PRODUCT_IDS','SQUARESPACE_FLOWFM_PRODUCT_IDS','squarespace-paid-membership']);
must('server/squarespace-commerce.js',['paymentStates','productId','customerId','paymentState']);
must('shared/auth.js',['createAccountWithEmail','resetPasswordForEmail','updateCurrentPassword']);
must('docs/SUPABASE-AUTH-EMAIL-SETUP.md',['Custom SMTP','Confirm Email','https://app.theflowtel.com/client/']);
must('docs/SQUARESPACE-EVENT-TICKET-SETUP.md',['SQUARESPACE_QUEENDOM_PRODUCT_IDS','SQUARESPACE_FLOWFM_PRODUCT_IDS','Orders — Read Only']);
assert.ok(!fs.existsSync(path.join(root,'api/squarespace-event-webhook.js')),'unsafe API-key webhook scaffold must not ship');
assert.ok(!fs.existsSync(path.join(root,'api/event-pass-preflight.js')),'public purchase-status preflight must not ship; ticket verification happens only after authentication');

console.log('Flowtel v0.10.85 static validator passed.');
