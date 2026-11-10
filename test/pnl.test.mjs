import {test} from 'node:test';
import assert from 'node:assert/strict';
import {load, books} from './books.mjs';
import {live} from '../src/core/pnl.js';
import {livePayroll, livePartners} from '../src/core/people.js';
import {liveSuppliers} from '../src/core/suppliers.js';

test('the month adds up', () => {
  load();
  const r = live();
  assert.equal(r.rev, 2400000);
  assert.equal(r.cogs.value, 1538000);
  assert.equal(r.gross, 862000);
  assert.equal(r.daily, 80000, 'daily costs plus the internet bill');
  assert.equal(r.elec, 75250, 'charged from the meter, not from what was paid');
  assert.equal(r.fixed, 500000);
  assert.equal(r.salaries, 700000, 'the whole roster, paid or not');
  assert.equal(r.opex, 1355250);
  assert.equal(r.net, -493250);
});

test('an electricity bill typed into the cashbook is not charged twice', () => {
  const b = books();
  b.cb.push({id:'e1', d:'2026-03-20', t:'Monthly Bill', x:'Electricity (Public)', in:0, out:18500, p:'Box'});
  load(b);
  const r = live();
  assert.equal(r.elec, 75250, 'still only what the meter says');
  assert.equal(r.daily, 80000, 'and the payment stays out of daily costs');
});

test('advances come off the salary, and a carried advance reduces what is handed over', () => {
  load();
  const [dara, eli] = livePayroll();
  assert.equal(dara.adv, 150000);
  assert.equal(dara.payNow, 250000);
  assert.equal(eli.carryIn, 50000);
  assert.equal(eli.payNow, 250000, '300,000 earned less 50,000 carried in from last month');
});

test('an advance handed back nets off', () => {
  const b = books();
  b.cb.push({id:'b1', d:'2026-03-08', t:'Staff Advance', x:'Dara', in:50000, out:0, p:'Box'});
  load(b);
  const [dara] = livePayroll();
  assert.equal(dara.adv, 100000);
});

test('the last partner absorbs the rounding, so the shares add to the profit exactly', () => {
  load();
  const [ana, bes] = livePartners();
  assert.equal(ana.profit, -246750);
  assert.equal(bes.profit, -246500);
  assert.equal(ana.profit + bes.profit, live().net, 'to the dinar');
});

test('a share gap is not dumped on the last partner when the shares do not add to 100%', () => {
  const b = books();
  b.setup.partners = [{name:'Ana', share:0.5}, {name:'Bes', share:0.3}];
  load(b);
  const [ana, bes] = livePartners();
  const net = live().net;
  assert.equal(ana.profit, Math.sign(net*0.5) * Math.round(Math.abs(net*0.5)/250) * 250);
  assert.ok(ana.profit + bes.profit !== net, 'the hole stays visible rather than landing on Bes');
});

test('a partner taking money out reduces their balance, not the profit', () => {
  load();
  const [ana, bes] = livePartners();
  assert.equal(ana.wd, 300000);
  assert.equal(ana.bal, -546750);
  assert.equal(bes.wd, 0);
  assert.equal(live().net, -493250, 'the withdrawal changed nothing here');
});

test('a supplier is owed what was brought forward plus credit receipts, less payments', () => {
  load();
  const [acme, bulk] = liveSuppliers();
  assert.equal(acme.owedBefore, 1900000);
  assert.equal(acme.paid, 400000);
  assert.equal(acme.still, 1500000);
  assert.equal(acme.stock, 114400);
  assert.equal(bulk.still, 0, 'a cash receipt creates no debt');
  assert.equal(bulk.stock, 47500);
});
