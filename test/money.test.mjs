import {test} from 'node:test';
import assert from 'node:assert/strict';
import {load} from './books.mjs';
import {num, mround, money, noteSize} from '../src/util/money.js';

test('num reads what people actually type', () => {
  load();
  assert.equal(num('1,250'), 1250);
  assert.equal(num(''), 0);
  assert.equal(num(null), 0);
  assert.equal(num('abc'), 0);
  assert.equal(num(7), 7);
});

test('mround lands on a note you can hand over', () => {
  load();
  assert.equal(noteSize(), 250);
  assert.equal(mround(1000), 1000);
  assert.equal(mround(1124), 1000);
  assert.equal(mround(1125), 1250);   // half goes up
  assert.equal(mround(0), 0);
});

test('mround rounds away from zero on both sides, so a debt is not quietly shaved', () => {
  load();
  assert.equal(mround(-1125), -1250);
  assert.equal(mround(-1124), -1000);
  assert.equal(mround(-246625), -246750);
});

test('money never prints a stray minus on zero', () => {
  load();
  assert.equal(money(0), '0');
  assert.equal(money(-0.2), '0');
  assert.equal(money(1234567), '1,234,567');
  assert.equal(money(-5000), '-5,000');
});
