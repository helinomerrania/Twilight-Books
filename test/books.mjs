/* A small, made-up set of books. Not anyone's real figures - every number here
 * exists so a test can check one thing, and the totals are worked out by hand in
 * the tests rather than copied from the app. */
import {S} from '../src/state.js';

export const setup = () => ({
  business: {name: 'Test Cafe', currency: 'IQD', owner: 'Owner', rounding: 250},
  partners: [{name: 'Ana', share: 0.5}, {name: 'Bes', share: 0.5}],
  staff: [{name: 'Dara', salary: 400000, carryIn: 0},
          {name: 'Eli',  salary: 300000, carryIn: 50000}],
  suppliers: ['Acme', 'Bulk Co'],
  fixedExpenses: [{name: 'Rent', amount: 500000}],
  pots: [{name: 'Box', kind: 'own'}, {name: 'Safe', kind: 'own'}, {name: 'Runner', kind: 'float'}],
  categories: ['A - Mixed Tobacco (weighed)', 'B - Sealed Tobacco (blocks)',
               'D - Cafe Goods', 'E - Ice Cream'],
  conversions: {gramsPerKilo: 1000, gramsPerPack: 50, packsPerBlock: 10,
                blocksPerCarton: 12, bucketsPerCarton: 2},
  tare: [{name: 'Small bucket', g: 300}, {name: 'No bucket', g: 0}],
  stockItems: [
    {name: 'Leaf',  category: 'A - Mixed Tobacco (weighed)', unit: 'kg',   how: 'By single piece', per: 1, price: 20000, supplier: 'Acme'},
    {name: 'Block', category: 'B - Sealed Tobacco (blocks)', unit: 'kg',   how: 'By single piece', per: 1, price: 24000, supplier: 'Acme'},
    {name: 'Cola',  category: 'D - Cafe Goods',              unit: 'Set',  how: 'By package',      per: 12, price: 1000, supplier: 'Bulk Co'},
    {name: 'Cone',  category: 'E - Ice Cream',               unit: 'Cartoon', how: 'By single piece', per: 2, price: 30000, supplier: 'Bulk Co'}],
  types: [
    {name: 'Daily Sales', details: ['Total sales of the day']},
    {name: 'Other Income', details: ['Other income']},
    {name: 'Daily Expense', details: ['Ice', 'Staff meals']},
    {name: 'Staff Advance', details: ['Dara', 'Eli']},
    {name: 'Salary Payment', details: ['Dara', 'Eli']},
    {name: 'Owner Advance', details: ['Ana', 'Bes']},
    {name: 'Owner Repayment', details: ['Ana', 'Bes']},
    {name: 'Owner Capital In', details: ['Ana', 'Bes']},
    {name: 'Partner Settlement', details: ['Ana', 'Bes']},
    {name: 'Supplier Payment', details: ['Acme', 'Bulk Co']},
    {name: 'Fixed Expense Payment', details: ['Rent']},
    {name: 'Monthly Bill', details: ['Electricity (Private)', 'Electricity (Elevator)',
                                     'Electricity (Public)', 'Internet']}],
  reasons: ['Counted - no difference'],
  period: {start: '2026-03-01', end: '2026-03-31'}
});

const cb = (d, t, x, inn, out, extra = {}) =>
  ({id: `${t}-${x}-${d}-${inn || out}`, d, t, x, in: inn, out, p: 'Box', ...extra});

export const books = () => ({
  setup: setup(),
  cb: [
    cb('2026-03-01', 'Daily Sales',   'Total sales of the day', 1000000, 0),
    cb('2026-03-01', 'Daily Expense', 'Ice',                          0, 20000),
    cb('2026-03-02', 'Daily Sales',   'Total sales of the day',  800000, 0),
    cb('2026-03-02', 'Staff Advance', 'Dara',                         0, 150000),
    cb('2026-03-03', 'Daily Sales',   'Total sales of the day',  600000, 0),
    cb('2026-03-03', 'Owner Advance', 'Ana',                          0, 300000),
    cb('2026-03-04', 'Supplier Payment', 'Acme',                      0, 400000),
    cb('2026-03-05', 'Monthly Bill', 'Internet',                      0, 60000),
    cb('2026-03-06', 'Cash Transfer', 'Box → Safe',              0, 100000, {p2: 'Safe'}),
  ],
  pu: [
    {id: 'p1', d: '2026-03-02', s: 'Acme',    no: '1', amt: 900000, terms: 'Credit'},
    {id: 'p2', d: '2026-03-05', s: 'Bulk Co', no: '2', amt: 300000, terms: 'Cash'},
  ],
  rc: [],
  inv: {
    '2026-02-28': {closing: 500000},   // a stored close, no quantities
    '2026-03-31': {counts: {
      Leaf:  {g: 5300, bucket: 'Small bucket'},   // 5.0 kg after 300 g tare
      Block: {cartons: 0, blocks: 1, packs: 2},   // 1 block = 0.5 kg, 2 packs = 0.1 kg
      Cola:  {pkg: 2, pcs: 6},                    // 2 sets + 6/12 of a set
      Cone:  {cartons: 1, buckets: 1}}},          // 1 carton + 1/2 carton
  },
  ledger: [], closed: {},
  debt: {asAt: '2026-02-28', brought: {Acme: 1000000, 'Bulk Co': 0}},
  elec: {factors: {privateAmps: 25, elevatorAmps: 20, elevatorShare: 6,
                   publicRate: 185, publicShare: 3},
         rows: [{m: '2026-03', last: 1000, now: 1300, pp: 2000, pe: 2000}]},
  log: [],
});

/** Load a set of books and point the app at a period. */
export function load(b = books(), start = '2026-03-01', end = '2026-03-31') {
  Object.assign(S, {ui: {tab: 'tonight', start, end, d: {}, drill: null, logAll: false}}, b);
  S.ui.start = start; S.ui.end = end;
  return S;
}
