/* One test for every fault these books have actually suffered. Each name says
 * what went wrong, so a failure here is a return of a known problem. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {load, books} from './books.mjs';
import {elecPaidFor, elecOwedFor, elecCharged} from '../src/core/electricity.js';
import {paidForMonth, settlesOn, dueSuppliers, dueFixed} from '../src/core/settle.js';
import {livePayroll} from '../src/core/people.js';
import {liveSuppliers} from '../src/core/suppliers.js';
import {checks} from '../src/core/checks.js';
import {localDay} from '../src/util/dates.js';

test('electricity paid as a Monthly Bill still counts as paid', () => {
  // It used to be ignored, and Settle up kept asking for money already gone.
  const b = books();
  b.cb.push({id:'e1', d:'2026-03-20', t:'Monthly Bill', x:'Electricity (Public)', in:0, out:18500, p:'Box'});
  load(b);
  assert.equal(elecCharged('2026-03'), 75250);
  assert.equal(elecPaidFor('2026-03'), 18500);
  assert.equal(elecOwedFor('2026-03'), 56750);
});

test('an electricity payment with no month on it counts against the month it is dated in', () => {
  // Changing a row's Type by hand never set a month, so the payment vanished.
  const b = books();
  b.cb.push({id:'e2', d:'2026-03-21', t:'Electricity Payment', x:'Electricity (Private)', in:0, out:50000, p:'Box'});
  load(b);
  assert.equal(elecPaidFor('2026-03'), 50000);
  assert.equal(elecPaidFor('2026-04'), 0);
});

test('paying last month from Settle up clears last month, not this one', () => {
  // The Dated field used to stamp the end of the period, back-dating the cash.
  const b = books();
  b.cb.push({id:'s1', d:'2026-04-05', t:'Salary Payment', x:'Dara', in:0, out:250000, p:'Box', m:'2026-03'});
  load(b, '2026-03-01', '2026-03-31');
  assert.equal(paidForMonth('Salary Payment','Dara'), 250000, 'March sees it');
  const [dara] = livePayroll();
  assert.equal(dara.payNow, 0, 'so March shows nothing left to pay');
  load(b, '2026-04-01', '2026-04-30');
  assert.equal(paidForMonth('Salary Payment','Dara'), 0, 'April does not count it again');
});

test('a payment tagged to an earlier month still counts in the months after it', () => {
  // Supplier debt is a running total: a March payment must not reappear as owed in April.
  const b = books();
  b.cb.push({id:'s2', d:'2026-04-10', t:'Supplier Payment', x:'Acme', in:0, out:500000, p:'Box', m:'2026-03'});
  load(b, '2026-03-01', '2026-03-31');
  assert.equal(liveSuppliers()[0].paid, 900000);
  load(b, '2026-04-01', '2026-04-30');
  assert.equal(liveSuppliers()[0].paid, 900000, 'still paid in April');
  assert.equal(settlesOn(b.cb.at(-1)), '2026-03-31');
});

test('what a supplier is asked for is the debt less their own stock still here', () => {
  load();
  const acme = dueSuppliers().find(r => r.x === 'Acme');
  assert.equal(acme.amt, 1385500);      // 1,500,000 owed less 114,400 of stock, down to a note
  const bulk = dueSuppliers().find(r => r.x === 'Bulk Co');
  assert.equal(bulk.amt, 0, 'nothing consumed, so nothing to pay');
});

test('a pot cannot hold less than nothing, and says so when it does', () => {
  // Back-dated payments drove the Box below zero for a week without a word.
  const b = books();
  b.cb.push({id:'n1', d:'2026-03-02', t:'Supplier Payment', x:'Acme', in:0, out:9000000, p:'Safe'});
  load(b);
  const bad = checks().find(c => /below zero/i.test(c.label));
  assert.ok(bad, 'the check fires');
  assert.equal(bad.level, 'bad');
  assert.match(bad.detail, /Safe/);
});

test('a day that starts after midnight belongs to the local day, not to Greenwich', () => {
  // The lounge closes at 1am; toISOString() put those takings in yesterday.
  assert.equal(localDay(new Date(2026, 2, 15, 1, 0, 0)), '2026-03-15');
});

test('rent charged to the month is asked for once, and only until it is paid', () => {
  load();
  assert.equal(dueFixed()[0].amt, 500000);
  const b = books();
  b.cb.push({id:'r1', d:'2026-03-28', t:'Fixed Expense Payment', x:'Rent', in:0, out:500000, p:'Box'});
  load(b);
  assert.equal(dueFixed()[0].amt, 0);
  assert.equal(dueFixed()[0].done, 'paid');
});
