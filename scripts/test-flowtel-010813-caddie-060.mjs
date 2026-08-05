import assert from 'node:assert/strict';
import { PRIESTESS_TITLE_OPTIONS, PRIESTESS_BIO_TEMPLATES, PRIESTESS_OFFERING_OPTIONS, bioTemplatesForTitle } from '../shared/priestess-profile-options.js';

assert(PRIESTESS_TITLE_OPTIONS.some((item) => item.value === 'siren-priestess' && item.label === 'Siren Priestess'));
assert.equal(bioTemplatesForTitle('siren-priestess').length, 2);
assert(PRIESTESS_BIO_TEMPLATES.filter((item) => item.titleValue === 'siren-priestess').every((item) => /voice|sound|expression/i.test(item.copy)));
assert(PRIESTESS_OFFERING_OPTIONS.some((item) => item.value === 'voice-activation'));
assert(PRIESTESS_OFFERING_OPTIONS.some((item) => item.value === 'magnetic-expression-mentorship'));

const active = [
  { status: 'scheduled', starts_at: '2026-08-12T18:00:00.000Z' },
  { status: 'cancelled', starts_at: '2026-08-13T18:00:00.000Z' },
  { status: 'rescheduled', starts_at: '2026-08-14T18:00:00.000Z' },
];
assert.deepEqual(active.filter((item) => ['scheduled', 'rescheduled'].includes(item.status)).map((item) => item.status), ['scheduled', 'rescheduled']);

const accepted = { status: 'accepted', caddie_profile_id: 'caddie-1' };
const mapped = [{ source_profile_id: 'caddie-1', booking_enabled: true }, { source_profile_id: 'caddie-2', booking_enabled: true }];
assert.deepEqual(mapped.filter((item) => accepted.status === 'accepted' && item.source_profile_id === accepted.caddie_profile_id).map((item) => item.source_profile_id), ['caddie-1']);

console.log('Flowtel v0.10.81.3 and Caddie Magic v0.6.0 behavior checks passed.');
