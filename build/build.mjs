#!/usr/bin/env node
/* Assemble the single-file app from src/.
 *
 * The app ships as one HTML file on purpose: the helper serves it from a folder,
 * it also opens straight from disk, and an update is then one file to replace.
 * So the source is modular and the deliverable is not. This joins the modules
 * back into one scope - which is all the import lines ever described - and
 * refuses to build if two modules declare the same name.
 *
 * No dependencies. node build/build.mjs
 */
import {readFileSync, writeFileSync, readdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const order = JSON.parse(readFileSync(join(ROOT, 'build/modules.json'), 'utf8'));

const IMPORT = /^import\s*\{[^}]*\}\s*from\s*['"][^'"]+['"];?[ \t]*\r?\n/gm;
const EXPORT = /^export\s+(?=(?:async\s+)?function\s|const\s|let\s|class\s)/gm;
const TOPDECL = /^(?:(?:async\s+)?function\s+([A-Za-z0-9_$]+)|const\s+([A-Za-z0-9_$]+)\s*=|let\s+([A-Za-z0-9_$]+))/gm;

// every file under src/ must be listed, or the build would silently drop one
const listed = new Set(order);
const onDisk = [];
(function walk(dir) {
  for (const e of readdirSync(join(ROOT, dir), {withFileTypes: true})) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(rel);
    else if (e.name.endsWith('.js')) onDisk.push(rel);
  }
})('src');
const missing = onDisk.filter(f => !listed.has(f));
if (missing.length) {
  console.error('  not listed in build/modules.json, so it would be left out of the app:');
  for (const f of missing) console.error('    ' + f);
  process.exit(1);
}

const seen = new Map();
const parts = [];
let clashes = 0;

for (const mod of order) {
  const raw = readFileSync(join(ROOT, mod), 'utf8');
  const body = raw.replace(IMPORT, '').replace(EXPORT, '').trim();
  for (const m of body.matchAll(TOPDECL)) {
    const name = m[1] || m[2] || m[3];
    if (seen.has(name)) {
      console.error(`  name clash: ${name} is declared in both ${seen.get(name)} and ${mod}`);
      clashes++;
    } else seen.set(name, mod);
  }
  parts.push(`/* ${'='.repeat(8)} ${mod} */\n${body}`);
}

if (clashes) {
  console.error(`\n${clashes} name clash(es). The modules share one scope once built, so this would break silently. Nothing written.`);
  process.exit(1);
}

const bundle = parts.join('\n\n');
const tpl = readFileSync(join(ROOT, 'src/index.html'), 'utf8');
if (!tpl.includes('/*BUNDLE*/')) {
  console.error('  src/index.html has no /*BUNDLE*/ placeholder.');
  process.exit(1);
}
const out = tpl.replace('/*BUNDLE*/',
  `(function(){\n"use strict";\n\n${bundle}\n\n})();`);

writeFileSync(join(ROOT, 'TwilightBooks.html'), out);
console.log(`  built TwilightBooks.html  ${out.length.toLocaleString()} bytes`);
console.log(`  ${order.length} modules, ${seen.size} top-level names, no clashes`);
