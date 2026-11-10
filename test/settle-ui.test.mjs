/* The Settle up list builds its own markup, so the parts that decide what a Pay
 * button will pick up can be checked without a browser. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {load} from './books.mjs';
import {payStep} from '../src/ui/parts.js';

const ids = html => [...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]);

test('two steps with editable amounts do not name their boxes the same', () => {
  // Suppliers and bills both numbered from zero, so both had a box called pay0.
  // The Pay button fetched its amount by name and the browser returned the first
  // one on the page, so the bill offered to pay the supplier's figure.
  load();
  const suppliers = payStep(2, 'Suppliers', '', [
    {x:'Acme', amt:1385500, t:'Supplier Payment', editable:true},
    {x:'Bulk Co', amt:229750, t:'Supplier Payment', editable:true}], '');
  const bills = payStep(5, 'Other bills', '', [
    {x:'Internet', amt:50000, t:'Monthly Bill', editable:true}], '');
  const all = ids(suppliers).concat(ids(bills));
  assert.equal(new Set(all).size, all.length, `ids must be unique across steps: ${all.join(', ')}`);
});

test('each Pay button points at a box in its own row', () => {
  load();
  const html = payStep(2, 'Suppliers', '', [
    {x:'Acme', amt:1385500, t:'Supplier Payment', editable:true},
    {x:'Bulk Co', amt:229750, t:'Supplier Payment', editable:true}], '');
  for (const row of html.split('<tr>').slice(1)) {
    const box = row.match(/id="([^"]+)"/);
    const btn = row.match(/data-in="([^"]+)"/);
    if (box && btn) assert.equal(btn[1], box[1], 'the button must name the box beside it');
  }
});

test('a row with nothing to pay offers no box to type in', () => {
  load();
  const html = payStep(1, 'Salaries', '', [{x:'Dara', amt:0, done:'paid'}], 'all paid');
  assert.equal(ids(html).length, 0);
  assert.match(html, /paid/);
});
