import assert from 'node:assert/strict';
import { outerSeasonForHemisphere, timeAndSpacePresentation } from '../shared/time-and-space-core.js';
import { seasonLocationLabel, seasonStatus } from '../shared/hourly-flow-rate-calculations.js';

assert.equal(outerSeasonForHemisphere('northern', 1), 'Outer Winter');
assert.equal(outerSeasonForHemisphere('northern', 4), 'Outer Spring');
assert.equal(outerSeasonForHemisphere('northern', 7), 'Outer Summer');
assert.equal(outerSeasonForHemisphere('northern', 10), 'Outer Autumn');

// Preserve Flowtel's established outer-season boundaries rather than using
// meteorological quarter boundaries.
assert.equal(outerSeasonForHemisphere('northern', 2), 'Outer Spring');
assert.equal(outerSeasonForHemisphere('northern', 5), 'Outer Summer');
assert.equal(outerSeasonForHemisphere('northern', 8), 'Outer Autumn');
assert.equal(outerSeasonForHemisphere('northern', 11), 'Outer Winter');
assert.equal(outerSeasonForHemisphere('southern', 1), 'Outer Summer');
assert.equal(outerSeasonForHemisphere('southern', 4), 'Outer Autumn');
assert.equal(outerSeasonForHemisphere('southern', 7), 'Outer Winter');
assert.equal(outerSeasonForHemisphere('southern', 10), 'Outer Spring');
assert.equal(outerSeasonForHemisphere('equatorial', 7), 'Season varies locally');
assert.equal(outerSeasonForHemisphere('', 7), 'Hemisphere needed');

const fixed = new Date('2026-07-22T19:00:00.000Z');
const california = timeAndSpacePresentation({
  display_name: 'Rose Priestess',
  timezone: 'America/Los_Angeles',
  hemisphere: 'northern',
}, fixed);
assert.equal(california.outerSeason, 'Outer Summer');
assert.match(california.localTime, /12:00\s?PM/i);
assert.equal(california.hemisphereLabel, 'Northern Hemisphere');

const australia = timeAndSpacePresentation({
  display_name: 'Ocean Priestess',
  timezone: 'Australia/Sydney',
  hemisphere: 'southern',
}, fixed);
assert.equal(australia.outerSeason, 'Outer Winter');
assert.equal(australia.hemisphereLabel, 'Southern Hemisphere');

assert.equal(seasonLocationLabel({ location_label: '  Carmel-by-the-Sea, California  ' }), 'Carmel-by-the-Sea, California');
assert.equal(seasonLocationLabel({ city: 'Carmel-by-the-Sea', region: 'California', country: 'United States' }), 'Carmel-by-the-Sea, California, United States');
assert.equal(seasonLocationLabel({}), '');
assert.equal(seasonStatus({ season: { id: 'season-1', location_label: 'Pacific Grove, California' }, costEntries: [] }), 'Location Chosen');

console.log('Flowtel v0.10.72 Four Seasons location and Time + Space season behavior tests passed.');
