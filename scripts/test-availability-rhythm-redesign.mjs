import assert from 'node:assert/strict';
import {
  FLOW_FM_WEEKDAYS,
  FLOW_FM_AVAILABILITY_PRESETS,
  validateFlowFmAvailabilitySeason,
  matchingFlowFmAvailabilityPreset,
  summarizeFlowFmAvailabilityDays,
  formatFlowFmAvailabilityDayList,
  formatFlowFmAvailabilityTime,
} from '../shared/flow-fm-availability-core.js';

assert.deepEqual(FLOW_FM_AVAILABILITY_PRESETS.map(item=>item.key),['morning','afternoon','evening']);
assert.equal(matchingFlowFmAvailabilityPreset([{start:'09:00',end:'12:00'}]),'morning');
assert.equal(matchingFlowFmAvailabilityPreset([{start:'12:00',end:'16:00'}]),'afternoon');
assert.equal(matchingFlowFmAvailabilityPreset([{start:'10:30',end:'14:30'}]),'exact');
assert.equal(formatFlowFmAvailabilityTime('00:00'),'12:00 AM');
assert.equal(formatFlowFmAvailabilityTime('12:30'),'12:30 PM');
assert.equal(formatFlowFmAvailabilityTime('17:00'),'5:00 PM');
assert.equal(formatFlowFmAvailabilityDayList([2,3,4]),'Tue–Thu');
assert.equal(formatFlowFmAvailabilityDayList([1,3,5]),'Mon · Wed · Fri');

const simple=FLOW_FM_WEEKDAYS.map(({weekday})=>({
  weekday,
  available:[2,3,4].includes(weekday),
  windows:[2,3,4].includes(weekday)?[{start:'12:00',end:'16:00'}]:[],
}));
assert.deepEqual(summarizeFlowFmAvailabilityDays(simple),{status:'Tue–Thu',detail:'12:00 PM–4:00 PM'});

const custom=simple.map(day=>day.weekday===4?{...day,windows:[{start:'10:00',end:'14:00'}]}:day);
assert.deepEqual(summarizeFlowFmAvailabilityDays(custom),{status:'3 available days',detail:'Custom hours'});

const resting=FLOW_FM_WEEKDAYS.map(({weekday})=>({weekday,available:false,windows:weekday===2?[{start:'09:00',end:'11:00'}]:[]}));
assert.deepEqual(summarizeFlowFmAvailabilityDays(resting),{status:'Resting this season',detail:'No client calls'});
const normalized=validateFlowFmAvailabilitySeason('Inner Winter',resting);
assert.deepEqual(normalized.find(day=>day.weekday===2).windows,[{start:'09:00',end:'11:00'}]);

console.log('Flow FM v0.10.79 Availability Rhythm Redesign behavior tests passed.');
