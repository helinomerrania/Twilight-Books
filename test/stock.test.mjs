import {test} from 'node:test';
import assert from 'node:assert/strict';
import {load, books} from './books.mjs';
import {itemQty, stockValue, booked, cogs, openingStock, countForPeriod} from '../src/core/stock.js';
import {S} from '../src/state.js';

const item = n => S.setup.stockItems.find(i => i.name === n);
const counts = d => S.inv[d].counts;

test('weighed tobacco has its bucket taken off', () => {
  load();
  assert.equal(itemQty(item('Leaf'), counts('2026-03-31')), 5);   // 5300 g less a 300 g bucket
});

test('sealed tobacco counts cartons, blocks and loose packs', () => {
  load();
  // a block is 10 packs of 50 g = 0.5 kg; two loose packs are 0.1 kg
  assert.equal(itemQty(item('Block'), counts('2026-03-31')), 0.6);
});

test('packaged goods count whole packages and loose pieces', () => {
  load();
  assert.equal(itemQty(item('Cola'), counts('2026-03-31')), 2.5);   // 2 sets + 6 of 12
});

test('ice cream counts cartons and half-cartons', () => {
  load();
  assert.equal(itemQty(item('Cone'), counts('2026-03-31')), 1.5);
});

test('stock is valued at the price stored with the count', () => {
  load();
  assert.equal(stockValue('2026-03-31'), 100000 + 14400 + 2500 + 45000);
  assert.equal(booked('2026-03-31'), 162000, 'and rounded to a note');
});

test('a month closed with a figure keeps that figure, not a fresh sum', () => {
  load();
  assert.equal(booked('2026-02-28'), 500000);
});

test('cost of goods is opening plus what was bought less what is left', () => {
  load();
  const c = cogs();
  assert.equal(c.opening, 500000);
  assert.equal(c.purchases, 1200000);
  assert.equal(c.closing, 162000);
  assert.equal(c.value, 1538000);
  assert.equal(openingStock(), 500000);
  assert.equal(countForPeriod(), '2026-03-31');
});

test('more stock than can be explained is shown as nothing consumed, not as profit', () => {
  const b = books();
  b.inv['2026-03-31'].counts.Leaf = {g: 100300, bucket: 'Small bucket'};  // 100 kg
  load(b);
  const c = cogs();
  assert.ok(c.raw < 0, 'the arithmetic really does go negative here');
  assert.equal(c.value, 0, 'but cost of goods is floored at zero');
});
