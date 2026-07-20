import assert from 'node:assert/strict';
import {
  ANNUAL_SELF_CARE_HOURS,
  FLOW_MULTIPLIER,
  analyzeLodgingCoverage,
  buildFutureSeasonCycle,
  calculateHourlyFlowRate,
  calculateNourishmentTotal,
  calculateSelfCareServiceTotal,
  effectiveCostEntries,
  flowtelDateISO,
  inclusiveDayCount,
  normalizeCurrencyCode,
} from '../shared/hourly-flow-rate-calculations.js';

assert.equal(ANNUAL_SELF_CARE_HOURS, 480);
assert.equal(FLOW_MULTIPLIER, 2);

const summerCycle = buildFutureSeasonCycle('2026-07-20');
assert.deepEqual(summerCycle.map((season) => [season.seasonKey, season.startsOn, season.endsOn]), [
  ['autumn', '2026-08-01', '2026-10-31'],
  ['winter', '2026-11-01', '2027-01-31'],
  ['spring', '2027-02-01', '2027-04-30'],
  ['summer', '2027-05-01', '2027-07-31'],
]);
assert.equal(summerCycle[0].isSuggested, true);
assert.equal(summerCycle[1].dayCount, 92);

assert.equal(buildFutureSeasonCycle('2026-01-15')[0].startsOn, '2026-02-01');
assert.equal(buildFutureSeasonCycle('2026-04-30')[0].seasonKey, 'summer');
assert.equal(buildFutureSeasonCycle('2026-10-31')[0].seasonKey, 'winter');
assert.equal(buildFutureSeasonCycle('2026-11-01')[0].startsOn, '2027-02-01');
assert.equal(buildFutureSeasonCycle('2028-01-10')[0].dayCount, 90, 'Leap-year spring includes February 29.');
assert.equal(inclusiveDayCount('2027-02-01', '2027-04-30'), 89);
assert.equal(inclusiveDayCount('2028-02-01', '2028-04-30'), 90);

assert.equal(flowtelDateISO(new Date('2026-07-20T06:30:00.000Z')), '2026-07-19', 'Flowtel Time must govern the date near UTC midnight.');
assert.equal(flowtelDateISO(new Date('2026-07-20T08:30:00.000Z')), '2026-07-20');

const example = calculateHourlyFlowRate({
  monthlyHomeBase: 7000,
  costEntries: [{ seasonId: 'a', layerKey: 'lodging', entryMode: 'detailed', baseAmount: 130000 }],
});
assert.equal(example.annualHomeBase, 84000);
assert.equal(example.seasonalFreedom, 130000);
assert.equal(example.annualVisionTotal, 214000);
assert.equal(example.baseHourlyRate, 214000 / 480);
assert.equal(example.hourlyFlowRate, (214000 / 480) * 2);
assert.equal(example.heroRate, 892);

const empty = calculateHourlyFlowRate();
assert.equal(empty.hasMonetaryValue, false);
assert.equal(empty.heroRate, null, 'No $0/hour hero before money is entered.');

const entries = [
  { seasonId: 'spring', layerKey: 'nourishment', entryMode: 'estimate', baseAmount: 5000 },
  { seasonId: 'spring', layerKey: 'nourishment', entryMode: 'detailed', baseAmount: 1000 },
  { seasonId: 'spring', layerKey: 'nourishment', entryMode: 'detailed', baseAmount: 1500 },
  { seasonId: 'spring', layerKey: 'lodging', entryMode: 'detailed', baseAmount: 8000 },
  { seasonId: 'spring', layerKey: 'lodging', entryMode: 'detailed', baseAmount: 9000 },
];
assert.equal(effectiveCostEntries(entries).reduce((sum, entry) => sum + entry.baseAmount, 0), 19500, 'Detailed optional entries supersede the estimate; lodging entries all sum.');

const season = { id: 'spring', startsOn: '2027-02-01', endsOn: '2027-04-30' };
assert.deepEqual(analyzeLodgingCoverage(season, [
  { seasonId: 'spring', layerKey: 'lodging', baseAmount: 1, startsOn: '2027-02-01', endsOn: '2027-03-10' },
  { seasonId: 'spring', layerKey: 'lodging', baseAmount: 1, startsOn: '2027-03-12', endsOn: '2027-04-30' },
]).hasGaps, true);
assert.deepEqual(analyzeLodgingCoverage(season, [
  { seasonId: 'spring', layerKey: 'lodging', baseAmount: 1, startsOn: '2027-02-01', endsOn: '2027-03-15' },
  { seasonId: 'spring', layerKey: 'lodging', baseAmount: 1, startsOn: '2027-03-10', endsOn: '2027-04-30' },
]).hasOverlaps, true);

const nourishment = calculateNourishmentTotal({ averageBreakfast: 20, averageLunch: 30, averageDinner: 50, dayCount: 90, serviceAllowancePercent: 25 });
assert.equal(nourishment.mealsTotal, 9000);
assert.equal(nourishment.serviceAllowanceTotal, 2250);
assert.equal(nourishment.total, 11250);
assert.equal(calculateSelfCareServiceTotal({ costPerAppointment: 175.50, appointments: 6 }), 1053);

assert.equal(normalizeCurrencyCode('eur'), 'EUR');
assert.equal(normalizeCurrencyCode(''), 'USD');
assert.throws(() => calculateHourlyFlowRate({ monthlyHomeBase: -1 }), /zero or positive/);

console.log('Hourly Flow Rate formula, season, leap-year, currency, layer, and coverage tests passed.');
