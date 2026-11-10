/* The shape of the app. These are the rules the rebuild was done to, written
 * down so they stay true: tabs are jobs, views only compose, cards are not
 * repeated across screens. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {TABS} from '../src/state.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(join(ROOT, f), 'utf8');
const viewFiles = readdirSync(join(ROOT, 'src/ui/views')).filter(f => f.endsWith('.js'));
const cardFiles = readdirSync(join(ROOT, 'src/ui/cards')).filter(f => f.endsWith('.js'));

test('there is one tab per job, and no more', () => {
  assert.deepEqual(TABS.map(t => t[0]), ['tonight','stock','month','books','setup']);
});

test('every tab has a view and a place on the page to draw into', () => {
  const shell = read('src/index.html');
  const views = viewFiles.map(f => read(`src/ui/views/${f}`)).join('\n');
  for (const [key] of TABS) {
    assert.match(shell, new RegExp(`id="tab-${key}"`), `the page has no section for ${key}`);
    assert.match(views, new RegExp(`VIEWS\\.${key}\\s*=`), `nothing draws ${key}`);
  }
  const extra = [...shell.matchAll(/id="tab-([a-z]+)"/g)].map(m => m[1])
    .filter(k => !TABS.some(t => t[0] === k));
  assert.deepEqual(extra, [], `the page still has sections for removed tabs: ${extra}`);
});

test('a view composes cards and writes no markup of its own', () => {
  // The point of the split: deciding what goes where is editing a list, not
  // moving hundreds of lines of template between files.
  for (const f of viewFiles) {
    if (f === 'setup.js') continue;              // setup is still one long form
    const src = read(`src/ui/views/${f}`);
    assert.ok(!/<div class="card"/.test(src), `${f} builds its own card markup`);
    assert.ok(src.length < 1200, `${f} is ${src.length} bytes — too big to be only a composition`);
  }
});

test('no card is drawn on two screens', () => {
  // Partners used to appear on the dashboard and again on settlement, with
  // different columns, and cash on hand was on four screens at once.
  const exported = new Map();
  for (const f of cardFiles)
    for (const m of read(`src/ui/cards/${f}`).matchAll(/^export function (\w+)/gm))
      exported.set(m[1], f);
  const used = new Map();
  for (const f of viewFiles) {
    const src = read(`src/ui/views/${f}`);
    for (const name of exported.keys())
      if (new RegExp(`\\b${name}\\(\\)`).test(src)) {
        if (!used.has(name)) used.set(name, []);
        used.get(name).push(f);
      }
  }
  const twice = [...used].filter(([, where]) => where.length > 1);
  assert.deepEqual(twice, [], `drawn on more than one screen: ${twice.map(([n, w]) => `${n} (${w})`)}`);
});

test('every card is used by a screen', () => {
  const views = viewFiles.map(f => read(`src/ui/views/${f}`)).join('\n');
  const orphans = [];
  for (const f of cardFiles)
    for (const m of read(`src/ui/cards/${f}`).matchAll(/^export function (\w+)/gm))
      if (!new RegExp(`\\b${m[1]}\\b`).test(views) && m[1] !== 'allChecks' && m[1] !== 'needsALook')
        orphans.push(`${m[1]} in cards/${f}`);
  assert.deepEqual(orphans, [], `written but never drawn: ${orphans}`);
});

test('the nightly screen stays short', () => {
  // It gets used at one in the morning. Four cards is the ceiling.
  const src = read('src/ui/views/tonight.js');
  const calls = (src.match(/\b\w+\(\)/g) || []).filter(c => c !== 'function()');
  assert.ok(calls.length <= 4, `Tonight draws ${calls.length} things: ${calls}`);
});
