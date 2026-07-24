import assert from 'node:assert/strict';
import {
  FLOW_FM_BUSY_WORK,
  FLOW_FM_ASSIGNMENTS,
  getFlowFmBusyWorkForMoon,
  getFlowFmAssignmentForMoon,
  getPersonalizedMoonPath,
} from '../shared/initiation.js';

assert.equal(FLOW_FM_BUSY_WORK.length, 13);
assert.equal(FLOW_FM_ASSIGNMENTS, FLOW_FM_BUSY_WORK, 'Compatibility alias must reference the same curriculum array.');
assert.equal(getFlowFmBusyWorkForMoon(1)?.title, 'Your Queendom');
assert.equal(getFlowFmAssignmentForMoon(1)?.title, getFlowFmBusyWorkForMoon(1)?.title);

const path = getPersonalizedMoonPath({ flowfm_started_at: '2026-07-02' }, new Date('2026-07-23T12:00:00-07:00'));
assert.equal(path.length, 13);
for (const portal of path) {
  assert.ok(portal.wombWorkModule, `Moon ${portal.portalIndex} must include Womb Work.`);
  assert.ok(portal.busyWork, `Moon ${portal.portalIndex} must include Busy Work.`);
  assert.equal(portal.businessAssignment, portal.busyWork, 'Historical property must remain compatible.');
}
console.log('Flow FM curriculum consolidation behavior passed.');
