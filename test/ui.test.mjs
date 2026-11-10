/* The screen is built from strings, so most of it can be checked without a
 * browser: what the helpers produce, and what the stylesheet promises. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {load} from './books.mjs';
import {esc} from '../src/util/money.js';
import {tile, tbl} from '../src/ui/dom.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CSS = (() => {
  const html = readFileSync(join(ROOT, 'src/index.html'), 'utf8');
  return [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
})();

/* ---- what the helpers produce ---- */

test('a supplier named like markup cannot inject any', () => {
  const nasty = '<img src=x onerror="alert(1)">';
  const out = esc(nasty);
  assert.ok(!out.includes('<'), 'angle brackets are escaped');
  assert.equal(esc(`"'&`), '&quot;&#39;&amp;');
});

test('a tile puts the figure in the big slot and the caption in the small one', () => {
  load();
  const html = tile('Cash on hand', '1,470,000', 'Box + Safe');
  assert.match(html, /class="k">Cash on hand</);
  assert.match(html, /class="v[^"]*">1,470,000</);
  assert.match(html, /class="n">Box \+ Safe</, 'the caption must not land in the value slot');
});

test('a tile with no caption leaves the slot out entirely', () => {
  load();
  assert.ok(!tile('Sales', '0').includes('class="n"'));
});

test('a table gets a head and a body', () => {
  const html = tbl('<th>Who</th>', '<tr><td>Dara</td></tr>');
  assert.match(html, /<thead>[\s\S]*Who[\s\S]*<\/thead>/);
  assert.match(html, /<tbody>[\s\S]*Dara[\s\S]*<\/tbody>/);
});

/* ---- what the stylesheet promises ---- */

test('every class the screens use is styled', () => {
  // This is the one that catches a rename or a rule left behind: the pot boxes
  // on Count the cash once lost their styling this way and nothing complained.
  const files = [];
  (function walk(d) {
    for (const e of readdirSync(join(ROOT, d), {withFileTypes: true})) {
      if (e.isDirectory()) walk(`${d}/${e.name}`);
      else if (e.name.endsWith('.js')) files.push(`${d}/${e.name}`);
    }
  })('src/ui');
  const src = files.map(f => readFileSync(join(ROOT, f), 'utf8')).join('\n');

  const used = new Set();
  for (const m of src.matchAll(/class="([^"]*)"/g)) {
    // class="num ${cls(x)}" and class="num '+cls(x)+'" both decide part of the
    // name at run time. Drop those pieces and check whatever is written plainly.
    const literal = m[1].replace(/\$\{[^}]*\}/g, ' ').replace(/'\s*\+[^+]*\+\s*'/g, ' ');
    for (const c of literal.split(/\s+/)) if (c && /^[a-z][\w-]*$/i.test(c)) used.add(c);
  }
  const styled = new Set([...CSS.matchAll(/\.([A-Za-z][\w-]*)/g)].map(m => m[1]));
  const missing = [...used].filter(c => !styled.has(c)).sort();
  assert.deepEqual(missing, [], `these classes have no rule: ${missing.join(', ')}`);
});

test('the till-roll rules are intact', () => {
  // Thermal printing is easy to break from the screen side and hard to notice.
  assert.match(CSS, /@media print/);
  assert.match(CSS, /size:72mm auto/, 'the paper is a 72mm roll, not a page');
  assert.match(CSS, /body\.slipping>\*\{display:none!important\}/);
  for (const c of ['sl-biz','sl-title','sl-rule','sl-row','sl-tot','sl-end'])
    assert.match(CSS, new RegExp(`\\.${c}\\b`), `#slip .${c} must keep its rule`);
});

test('nothing on screen shouts', () => {
  // All-caps labels were everywhere and made a dense page harder to read.
  const screen = CSS.slice(0, CSS.indexOf('@media print'));
  assert.ok(!/text-transform:\s*uppercase/.test(screen),
    'no rule should upper-case label text');
});

test('the surfaces are flat', () => {
  const screen = CSS.slice(0, CSS.indexOf('@media print'));
  assert.ok(!/box-shadow/.test(screen), 'depth is carried by hairlines, not shadows');
});

test('every colour has a value for working at night', () => {
  const light = [...CSS.matchAll(/^\s*--([a-z-]+):/gm)].map(m => m[1]);
  const darkBlock = CSS.slice(CSS.indexOf('[data-theme="dark"]'));
  const tokens = [...new Set(light)].filter(t =>
    !['sans','r','gut'].includes(t));
  const missing = tokens.filter(t => !darkBlock.includes(`--${t}:`));
  assert.deepEqual(missing, [], `no dark value for: ${missing.join(', ')}`);
});

test('the figures line up wherever they appear', () => {
  assert.match(CSS, /font-variant-numeric:tabular-nums/,
    'money must use tabular figures or columns of it will not align');
});
