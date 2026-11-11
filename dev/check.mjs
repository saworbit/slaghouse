// Static checks for the single-file game, run locally (`node dev/check.mjs`) and in CI.
// - every inline <script> in slaghouse.html compiles
// - the optional audio banks compile
// - every local <script src> exists, and CDN scripts are pinned to an exact version with an integrity hash
// - notes any sampled sound name the game asks for that sfx_bank.js doesn't have (the synth plays instead)
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const ok = (msg) => console.log(`ok    ${msg}`);
const fail = (msg) => { console.log(`FAIL  ${msg}`); failures.push(msg); };

function compile(code, filename) {
  try { new vm.Script(code, { filename }); return true; }
  catch (err) { fail(`${filename}: ${err.message}`); return false; }
}

const htmlPath = join(root, 'slaghouse.html');
const html = readFileSync(htmlPath, 'utf8');

const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
if (!inline.length) fail('slaghouse.html: no inline <script> found');
inline.forEach((code, i) => {
  if (compile(code, `slaghouse.html <script #${i + 1}>`)) ok(`slaghouse.html inline script #${i + 1} compiles (${(code.length / 1024).toFixed(0)} KB)`);
});

for (const m of html.matchAll(/<script[^>]*\bsrc="([^"]+)"[^>]*>/g)) {
  const src = m[1];
  if (/^https?:\/\//.test(src)) {
    if (/@\d+\.\d+\.\d+\//.test(src)) ok(`CDN script pinned: ${src}`);
    else fail(`CDN script is not pinned to an exact version: ${src}`);
    if (/\bintegrity="sha(256|384|512)-[A-Za-z0-9+/]+={0,2}"/.test(m[0]) && /\bcrossorigin="anonymous"/.test(m[0])) ok(`CDN script has an integrity hash: ${src}`);
    else fail(`CDN script needs integrity="sha384-..." and crossorigin="anonymous": ${src}`);
  } else if (existsSync(join(root, src))) {
    ok(`local script present: ${src}`);
  } else {
    fail(`local script missing: ${src}`);
  }
}

const SYNTH_ONLY = new Set(['skitter']);          // no take sounded right, so it stays synth on purpose
for (const bank of ['sfx_bank.js', 'music_bank.js']) {
  const p = join(root, bank);
  if (!existsSync(p)) { ok(`${bank} absent (optional; the game falls back to synth audio)`); continue; }
  const src = readFileSync(p, 'utf8');
  if (!compile(src, bank)) continue;
  ok(`${bank} compiles`);
  if (bank !== 'sfx_bank.js') continue;
  const ctx = { window: {} }; vm.runInNewContext(src, ctx);
  const have = new Set(Object.keys(ctx.window.SLAG_SFX || {})), asked = new Set();
  for (const m of html.matchAll(/\b(?:smp|loopNode)\(([^)]*)\)/g)) for (const q of m[1].matchAll(/'([A-Za-z][A-Za-z0-9_]+)'/g)) asked.add(q[1]);
  const missing = [...asked].filter((n) => !have.has(n) && !SYNTH_ONLY.has(n)).sort();
  if (missing.length) console.log(`note  ${missing.length} sampled sound(s) not in sfx_bank.js, so the synth plays: ${missing.join(' ')}`);
  else ok(`every sampled sound name the game asks for is in sfx_bank.js`);
}

if (failures.length) {
  console.log(`\n${failures.length} check(s) failed.`);
  process.exit(1);
}
console.log('\nAll checks passed.');
