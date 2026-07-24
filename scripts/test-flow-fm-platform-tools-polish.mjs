import assert from 'node:assert/strict';
import { validateFlowFmAvailabilitySeason, FLOW_FM_WEEKDAYS } from '../shared/flow-fm-availability-core.js';
import { roundHourlyFlowRateUp } from '../shared/hourly-flow-rate-calculations.js';

assert.equal(roundHourlyFlowRateUp(0), 0);
assert.equal(roundHourlyFlowRateUp(126), 126);
assert.equal(roundHourlyFlowRateUp(126.01), 127);
assert.equal(roundHourlyFlowRateUp(126.99), 127);
assert.equal(roundHourlyFlowRateUp('88.10'), 89);
assert.equal(roundHourlyFlowRateUp(-3), 0);

const days=FLOW_FM_WEEKDAYS.map(({weekday})=>({
  weekday,
  available:weekday===2,
  windows:weekday===2
    ? [{start:'09:00',end:'11:00'}]
    : weekday===4
      ? [{start:'13:00',end:'15:00'}]
      : [],
}));
const normalized=validateFlowFmAvailabilitySeason('Inner Autumn',days);
const closedWithSavedWindow=normalized.find(day=>day.weekday===4);
assert.equal(closedWithSavedWindow.available,false);
assert.deepEqual(closedWithSavedWindow.windows,[{start:'13:00',end:'15:00'}], 'Closing a day must preserve its saved windows.');

assert.throws(()=>validateFlowFmAvailabilitySeason('Inner Autumn',days.map(day=>day.weekday===2?{...day,windows:[]}:day)),/at least one time window/i);

console.log('Flow FM v0.10.76 platform and tools behavior tests passed.');
