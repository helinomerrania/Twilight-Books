import {test} from 'node:test';
import assert from 'node:assert/strict';
import {load} from './books.mjs';
import {localDay, monthOf, endOfMonth, nextMonth, shiftMonth, ymd, inPer} from '../src/util/dates.js';

test('the day is the local one, because the lounge closes after midnight', () => {
  // 1 January, 00:30 local. toISOString() would call this 31 December anywhere
  // east of Greenwich, and the night's takings would land in the wrong month.
  const d = new Date(2026, 0, 1, 0, 30, 0);
  assert.equal(localDay(d), '2026-01-01');
  const e = new Date(2026, 11, 31, 23, 59, 0);
  assert.equal(localDay(e), '2026-12-31');
});

test('month arithmetic', () => {
  assert.equal(monthOf('2026-03-15'), '2026-03');
  assert.equal(endOfMonth('2026-02'), '2026-02-28');
  assert.equal(endOfMonth('2024-02'), '2024-02-29');   // leap year
  assert.equal(endOfMonth('2026-12'), '2026-12-31');
  assert.equal(nextMonth('2026-12'), '2027-01');
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
});

test('ymd keeps only the date part', () => {
  assert.equal(ymd('2026-03-15T22:00:00Z'), '2026-03-15');
  assert.equal(ymd(null), '');
});

test('inPer is inclusive of both ends', () => {
  load(undefined, '2026-03-01', '2026-03-31');
  assert.ok(inPer('2026-03-01'));
  assert.ok(inPer('2026-03-31'));
  assert.ok(!inPer('2026-02-28'));
  assert.ok(!inPer('2026-04-01'));
});
