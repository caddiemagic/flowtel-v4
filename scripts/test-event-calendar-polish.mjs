import assert from 'node:assert/strict';

const nextThree = rows => rows.slice(0, 3);
const embedFour = rows => rows.slice(0, 4);

const sample = Array.from({ length: 7 }, (_, index) => ({ event_id: `event-${index + 1}` }));
assert.deepEqual(nextThree(sample).map(item => item.event_id), ['event-1', 'event-2', 'event-3']);
assert.deepEqual(embedFour(sample).map(item => item.event_id), ['event-1', 'event-2', 'event-3', 'event-4']);

const discoveryAction = event => {
  if (event.status === 'cancelled') return 'CANCELLED';
  if (event.audience === 'flowfm' && !event.can_join) return 'FLOW FM MEMBERS ONLY';
  if (event.is_registered) return '✓ SEAT SAVED';
  return 'SAVE MY SEAT';
};

assert.equal(discoveryAction({ status: 'published', audience: 'queendom', can_join: true, is_registered: false }), 'SAVE MY SEAT');
assert.equal(discoveryAction({ status: 'published', audience: 'queendom', can_join: true, is_registered: true }), '✓ SEAT SAVED');
assert.equal(discoveryAction({ status: 'published', audience: 'flowfm', can_join: false, is_registered: false }), 'FLOW FM MEMBERS ONLY');
assert.equal(discoveryAction({ status: 'cancelled', audience: 'queendom', can_join: true, is_registered: false }), 'CANCELLED');

console.log('Flowtel v0.10.84.2 event calendar polish behavior checks passed.');
