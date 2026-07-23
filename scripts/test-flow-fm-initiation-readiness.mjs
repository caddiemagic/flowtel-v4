import assert from 'node:assert/strict';
import { getFlowFmInitiationStatus, flowFmProgressPercent } from '../shared/initiation.js';
import { FLOW_FM_WEEKDAYS, validateFlowFmAvailabilitySeason } from '../shared/flow-fm-availability-core.js';

const missing = getFlowFmInitiationStatus({ created_at: '2020-01-01' }, new Date('2026-07-01T12:00:00Z'));
assert.equal(missing.hasStartDate, false, 'Account creation must never stand in for the Flow FM start date.');
assert.equal(flowFmProgressPercent(missing), 0, 'Missing start dates must remain at the beginning of the bar.');

const monthOne = getFlowFmInitiationStatus({ flowfm_started_at: '2026-07-01' }, new Date('2026-07-01T12:00:00Z'));
assert.equal(monthOne.anchorMoon.name, 'Dragon Moon');
assert.equal(monthOne.progressMonth, 1);
assert.equal(flowFmProgressPercent(monthOne), 0);
assert.equal(flowFmProgressPercent(7), 50);
assert.equal(flowFmProgressPercent(13), 100);

const days = FLOW_FM_WEEKDAYS.map(({ weekday }) => ({
  weekday,
  available: weekday === 2,
  windows: weekday === 2
    ? [{ start: '09:00', end: '11:00' }, { start: '14:00', end: '16:00' }]
    : [],
}));
const checked = validateFlowFmAvailabilitySeason('Inner Summer', days);
assert.equal(checked.length, 7);
assert.equal(checked[1].weekday, 2);
assert.equal(checked[1].windows.length, 2);
assert.equal(checked[0].available, false);

assert.throws(
  () => validateFlowFmAvailabilitySeason('Inner Summer', days.map(day => day.weekday === 2
    ? { ...day, windows: [{ start: '11:00', end: '10:00' }] }
    : day)),
  /end after it begins/i,
);
assert.throws(
  () => validateFlowFmAvailabilitySeason('Inner Summer', days.slice(0, 6)),
  /Monday through Sunday/i,
);

console.log('Flow FM initiation readiness behavior tests passed.');
