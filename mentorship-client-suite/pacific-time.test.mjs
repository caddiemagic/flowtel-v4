import test from 'node:test';import assert from 'node:assert/strict';import {pacificTimestamp} from './pacific-time.mjs';
test('Pacific winter and summer wall times resolve correctly',()=>{assert.equal(pacificTimestamp('2027-01-20','11:00'),'2027-01-20T19:00:00.000Z');assert.equal(pacificTimestamp('2027-07-20','11:00'),'2027-07-20T18:00:00.000Z')});
test('reject nonexistent spring hour and ambiguous autumn hour',()=>{assert.throws(()=>pacificTimestamp('2027-03-14','02:30'));assert.throws(()=>pacificTimestamp('2026-11-01','01:30'))});
test('reject invalid dates and out-of-range times',()=>{assert.throws(()=>pacificTimestamp('2027-02-30','11:00'));assert.throws(()=>pacificTimestamp('2027-01-20','25:00'))});
