/* TwilightBooks.html is committed because that is what gets shipped and updated.
 * It must always be exactly what src/ builds, or the two would drift and the file
 * people actually run would stop matching the code the tests check. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BUILT = join(ROOT, 'TwilightBooks.html');

test('the committed app is what src/ builds', () => {
  const before = readFileSync(BUILT, 'utf8');
  try {
    execFileSync(process.execPath, [join(ROOT, 'build/build.mjs')], {cwd: ROOT, stdio: 'pipe'});
    const after = readFileSync(BUILT, 'utf8');
    assert.equal(after, before,
      'TwilightBooks.html is out of date. Run: node build/build.mjs');
  } finally {
    writeFileSync(BUILT, before);
  }
});

test('the app carries the version the release says', () => {
  const html = readFileSync(BUILT, 'utf8');
  const v = JSON.parse(readFileSync(join(ROOT, 'version.json'), 'utf8')).version;
  assert.match(html, new RegExp(`APP_VERSION='${v.replace(/\./g, '\\.')}'`),
    `version.json says ${v}; the app must say the same`);
});

test('no books are shipped inside the app', () => {
  const html = readFileSync(BUILT, 'utf8');
  assert.match(html, /const SEED=\{v:1,setup:null/, 'the seed must stay empty');
  assert.ok(!/Daily Sales","x"/.test(html), 'no cashbook rows baked in');
});
