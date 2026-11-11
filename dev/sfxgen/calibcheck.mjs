// Lists calib.json entries measured against an older version of their procedural sound than the one in
// slaghouse.html now, so their samples would be levelled against the wrong loudness. build.py runs this first.
//   node dev/sfxgen/calibcheck.mjs            notes only (exit 0)
//   node dev/sfxgen/calibcheck.mjs --strict   exit 1 when anything is stale
// It loads the Sfx object from slaghouse.html and the sound list and fingerprint function from calib.js, the same
// code the browser runs when it measures, so a fingerprint here matches the one slagCalib() recorded.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');

export function sfxFrom(html) {
  const i = html.indexOf('const Sfx = {'), j = html.indexOf('\n};\n', i);
  if (i < 0 || j < 0) throw new Error('no `const Sfx = { ... };` block in slaghouse.html');
  return vm.runInNewContext(html.slice(i, j + 3) + '\nSfx', {});
}

export function calibTools(src = readFileSync(join(here, 'calib.js'), 'utf8')) {
  const ctx = { window: {} };
  vm.runInNewContext(src, ctx);
  return ctx.window;
}

export function fingerprints(html, tools = calibTools()) {
  const S = sfxFrom(html), L = tools.slagCalibList(S), out = {};
  for (const [name, [call]] of Object.entries(L)) out[name] = tools.slagFingerprint(S, call);
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const now = fingerprints(readFileSync(join(root, 'slaghouse.html'), 'utf8'));
  const calib = JSON.parse(readFileSync(join(here, 'calib.json'), 'utf8'));
  const stale = [], unrecorded = [], gone = [];
  for (const [name, entry] of Object.entries(calib)) {
    if (!(name in now)) gone.push(name);
    else if (!entry[2]) unrecorded.push(name);
    else if (entry[2] !== now[name]) stale.push(name);
  }
  if (stale.length) console.log(`calib: ${stale.length} stale (the procedural sound changed since it was measured; re-run slagCalib for them): ${stale.join(' ')}`);
  if (unrecorded.length) console.log(`calib: ${unrecorded.length} with no fingerprint (measured before fingerprints): ${unrecorded.join(' ')}`);
  if (gone.length) console.log(`calib: ${gone.length} no longer in calib.js's list: ${gone.join(' ')}`);
  if (!stale.length && !unrecorded.length && !gone.length) console.log(`calib: all ${Object.keys(calib).length} entries match slaghouse.html`);
  if (stale.length && process.argv.includes('--strict')) process.exit(1);
}
