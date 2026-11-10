import {test} from 'node:test';
import assert from 'node:assert/strict';
import {load, books} from './books.mjs';
import {potBalance, cashOnHand, inHands} from '../src/core/pots.js';
import {countedTotal, countRows} from '../src/core/counts.js';
import {S} from '../src/state.js';

test('a transfer moves money without creating or destroying any', () => {
  load();
  assert.equal(potBalance('Box'), 1370000);
  assert.equal(potBalance('Safe'), 100000);
  assert.equal(cashOnHand(), 1470000);
});

test('a float is money in someone hands, not cash on hand', () => {
  load();
  assert.equal(inHands(), 0);
  S.cb.push({id:'f1', d:'2026-03-07', t:'Daily Expense', x:'Ice', in:0, out:5000, p:'Runner'});
  assert.equal(inHands(), -5000);
  assert.equal(cashOnHand(), 1470000, 'a float must not move cash on hand');
});

test('a count is read whether it names each pot or carries one total', () => {
  load();
  assert.equal(countedTotal({counts:{Box:1370000, Safe:100000}}), 1470000);
  assert.equal(countedTotal({counted:1470000}), 1470000);
});

test('a count of some pots is judged against only those pots', () => {
  const b = books();
  b.rc = [{id:'r1', d:'2026-03-06', counts:{Box:1370000}}];   // Safe not counted
  load(b);
  const [row] = countRows();
  assert.equal(row.diff, 0, 'counting the Box alone must not report the Safe as missing');
});
