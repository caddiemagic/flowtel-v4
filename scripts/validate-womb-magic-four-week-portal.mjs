import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const files={
  migration:read('database/migration-073-womb-magic-four-week-portal.sql'),
  api:read('api/womb-magic-portal.js'),
  scheduling:read('shared/acuity-scheduling.js'),
  portal:read('shared/womb-magic-portal.js'),
  html:read('client/index.html'),
  client:read('client/app.js'),
  providerApi:read('api/acuity.js'),
  providerPage:read('flow-fm/upcoming-calls/page.js'),
  providerHtml:read('flow-fm/upcoming-calls/index.html'),
  release:read('docs/RELEASE-0.10.87.md'),
};
function expect(condition,message){if(!condition)throw new Error(message);}
expect(files.migration.includes('flowtel_womb_magic_portals'),'migration creates Portal table');
expect(files.migration.includes('flowtel_one_active_womb_magic_portal_per_client_idx'),'one active portal/client enforced');
expect(files.migration.includes('flowtel_one_active_womb_magic_portal_per_priestess_idx'),'one active portal/Priestess enforced');
expect(files.migration.includes('womb_magic_portal_session_number between 1 and 4'),'four-session cap enforced');
expect(files.migration.includes('recurrence_timezone text'),'standing recurrence timezone stored');
expect(files.migration.includes('recurrence_weekday smallint'),'standing recurrence weekday stored');
expect(files.migration.includes('recurrence_time time'),'standing recurrence time stored');
expect(files.migration.includes('flowtel_has_active_womb_magic_portal_access'),'continuous portal consent helper exists');
expect(files.migration.includes('flowtel_has_active_womb_magic_portal_access(p_member_id, auth.uid())'),'Personal Cosmology can honor active Portal only behind existing share gate');
expect(files.api.includes('const PORTAL_DAYS=28'),'Portal is 28 days');
expect(files.api.includes('const MAX_SESSIONS=4'),'Portal is capped at four sessions');
expect(files.api.includes('recurringSeriesSlots'),'server checks recurring weekly Acuity availability');
expect(files.api.includes('[0,7,14,21]'),'series checks four consecutive weekly dates');
expect(files.api.includes('series.length!==MAX_SESSIONS'),'series booking requires all four slots');
expect(files.api.includes('rollbackPortalSeries'),'partial series is rolled back');
expect(files.api.includes("service_period_key:null"),'Portal appointments do not consume monthly Womb Magic entitlement');
expect(files.api.includes("service_key:'womb_magic_portal'"),'Portal appointment grant is distinguishable');
expect(files.api.includes("case 'session-dates'"),'participant reschedule date availability exists');
expect(files.api.includes("case 'session-times'"),'participant reschedule time availability exists');
expect(files.api.includes("Only this Portal client or her assigned Priestess can change this session."),'reschedule authorization is participant-scoped');
expect(files.portal.includes('Same time weekly · all 4 sessions'),'member sees recurring-series times');
expect(files.portal.includes('Consent + Schedule All 4 Sessions'),'one confirmation schedules the full series');
expect(files.portal.includes('Individual weeks can be rescheduled without moving the rest of the Portal.'),'member UI explains independent rescheduling');
expect(files.html.includes('4-WEEK WOMB MAGIC PORTAL'),'Suite exposes Portal card');
expect(files.html.includes('Flowtel schedules all four private 45-minute sessions for you.'),'Suite explains automatic four-call scheduling');
expect(files.html.includes('This is separate from your monthly complimentary Womb Magic call.'),'member UI preserves monthly call distinction');
expect(files.html.includes('href="/moonbox/">Moon Mail</a>'),'deferred Moon Mail doorway uses canonical working route');
expect(!files.html.includes('href="/moon-mail/">Moon Mail</a>'),'Suite no longer links to missing Moon Mail alias');
expect(files.client.includes('mountWombMagicPortal'),'Portal mounts in Suite runtime');
expect(files.providerApi.includes('womb_magic_portal_session_number'),'provider calls hydrate Portal session metadata');
expect(files.providerApi.includes('4-Week Womb Magic Portal · Session'),'provider calls label Portal sessions');
expect(files.scheduling.includes("portalApi('session-dates'"),'shared client exposes participant date availability');
expect(files.scheduling.includes("portalApi('session-times'"),'shared client exposes participant time availability');
expect(files.providerPage.includes('Reschedule This Session'),'Priestess receives Portal reschedule action');
expect(files.providerPage.includes('rescheduleWombMagicPortalSession'),'Priestess reschedule uses protected Portal API');
expect(files.providerHtml.includes('portalReschedulePanel'),'Upcoming Calls includes practitioner reschedule panel');
expect(files.release.includes('same weekday/time is open'),'release documents recurring-time preflight');
expect(files.release.includes('Either the client or the assigned Priestess may reschedule'),'release documents both-party rescheduling');
console.log('✓ Flowtel v0.10.87 4-Week Womb Magic Portal validation passed');
