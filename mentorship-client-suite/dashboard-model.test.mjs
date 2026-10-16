import test from 'node:test';import assert from 'node:assert/strict';import {dashboardModel,dateLabel,filterSessions} from './dashboard-model.mjs';
const now=new Date('2026-10-16T00:30:00Z');
test('dashboard uses Pacific date and current month without promoting historical calls as upcoming',()=>{
 const suite={sessions:[{id:'past',status:'confirmed',duration_minutes:90,scheduled_at:'2026-10-01T19:00:00Z',session_number:1},{id:'future',status:'confirmed',duration_minutes:90,scheduled_at:'2026-10-20T19:00:00Z',session_number:2},{id:'cancelled',status:'cancelled',session_number:3},{id:'complete',status:'completed',session_number:4},{id:'draft',status:'proposed',duration_minutes:90,scheduled_at:'2026-10-17T19:00:00Z',session_number:5}],monthlyFocus:[{focus_month:'2026-11-01',client_visible_focus:'Future'},{focus_month:'2026-10-01',client_visible_focus:'Current'},{focus_month:'2026-09-01',client_visible_focus:'Past'}]};
 const model=dashboardModel(suite,now);assert.equal(model.today,'2026-10-15');assert.equal(model.nextCall.id,'future');assert.equal(model.pastPending[0].id,'past');assert.equal(model.focus.client_visible_focus,'Current');assert.equal(model.completed,1);assert.equal(model.cancelled,1);assert.equal(model.remaining,3);assert.equal(model.percent,20);
});
test('zero sessions and no current focus produce honest empty states',()=>{const model=dashboardModel({sessions:[],monthlyFocus:[{focus_month:'2026-09-01',client_visible_focus:'Old'}]},now);assert.equal(model.percent,0);assert.equal(model.focus,null);assert.equal(model.nextCall,null);assert.equal(model.remaining,0);});
test('date-only program boundaries are not shifted across time zones',()=>{assert.equal(dateLabel('2026-10-01'),'Oct 1, 2026');});
test('call filters retain unscheduled and in-progress sessions while separating historical and terminal sessions',()=>{
 const sessions=[{id:'unscheduled',status:'unscheduled'},{id:'future',status:'proposed',scheduled_at:'2026-10-20T19:00:00Z',duration_minutes:45},{id:'in-progress',status:'confirmed',scheduled_at:'2026-10-16T00:00:00Z',duration_minutes:45},{id:'past',status:'confirmed',scheduled_at:'2026-10-15T00:00:00Z',duration_minutes:45},{id:'past-proposed',status:'proposed',scheduled_at:'2026-10-15T00:00:00Z',duration_minutes:45},...['completed','cancelled','missed'].map(status=>({id:status,status}))];
 assert.deepEqual(filterSessions(sessions,'upcoming',now).map(s=>s.id),['unscheduled','future','in-progress']);
 assert.deepEqual(filterSessions(sessions,'history',now).map(s=>s.id),['past','past-proposed','completed','cancelled','missed']);
 assert.equal(filterSessions(sessions,'all',now).length,sessions.length);assert.equal(filterSessions(sessions,'unknown',now).length,sessions.length);
});
