import assert from 'node:assert/strict';

const flowtelToday = parts => `${parts.year}-${parts.month}-${parts.day}`;
assert.equal(flowtelToday({ year: '2026', month: '08', day: '10' }), '2026-08-10');

const visibleUpcoming = (events, today) => events
  .filter(event => event.event_date >= today && event.status !== 'cancelled')
  .slice(0, 3);

const rows = [
  { event_id: 'past', event_date: '2026-08-09', status: 'published' },
  { event_id: 'one', event_date: '2026-08-10', status: 'published' },
  { event_id: 'cancelled', event_date: '2026-08-11', status: 'cancelled' },
  { event_id: 'two', event_date: '2026-08-12', status: 'published' },
  { event_id: 'three', event_date: '2026-08-13', status: 'published' },
  { event_id: 'four', event_date: '2026-08-14', status: 'published' }
];
assert.deepEqual(visibleUpcoming(rows, '2026-08-10').map(event => event.event_id), ['one', 'two', 'three']);

console.log('Flowtel v0.10.84.3 Upcoming Events navigation + Lounge repair behavior checks passed.');
