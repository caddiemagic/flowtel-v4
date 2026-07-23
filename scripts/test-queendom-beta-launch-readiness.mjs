import assert from 'node:assert/strict';
import { formatDateOnly, dateOnlyParts, flowtelTodayISO } from '../shared/flowtel-date.js';
import { getFlowFmInitiationStatus } from '../shared/initiation.js';

assert.deepEqual(dateOnlyParts('2026-07-02'), {
  year: 2026,
  month: 7,
  day: 2,
  iso: '2026-07-02',
});
assert.equal(
  formatDateOnly('2026-07-02', { month: 'short', day: 'numeric', year: 'numeric' }, 'en-US'),
  'Jul 2, 2026',
  'A date-only Flow FM start date must never render as the previous day.',
);
assert.equal(
  flowtelTodayISO(new Date('2026-07-24T02:00:00.000Z')),
  '2026-07-23',
  'Flowtel date limits must follow America/Los_Angeles rather than UTC.',
);

const status = getFlowFmInitiationStatus(
  { flowfm_started_at: '2026-07-02', practitioner_level: 'Initiate' },
  new Date('2026-07-23T19:00:00.000Z'),
);
assert.equal(status.startedDateISO, '2026-07-02');
assert.equal(status.anchorMoon.name, 'Dragon Moon');
assert.equal(status.progressMonth, 1);
assert.equal(status.startedAt.getFullYear(), 2026);
assert.equal(status.startedAt.getMonth(), 6);
assert.equal(status.startedAt.getDate(), 2);

console.log('Flowtel v0.10.75 date-only and beta launch readiness behavior tests passed.');
