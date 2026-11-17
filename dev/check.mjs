// Static checks for the single-file game, run locally (`node dev/check.mjs`) and in CI.
// - slaghouse.html is exactly what src/ builds (node src/join.mjs)
// - every inline <script> in slaghouse.html compiles
// - the optional audio banks compile, and each AAC copy (loaded where Ogg Opus won't decode) holds the same sounds
//   and tracks as its Opus bank, and every AAC clip has the MP4 edit list that trims AAC's encoder priming, with the
//   priming shorter than a looping track's 100 ms pad (#169)
// - every local <script src> exists, and CDN scripts are pinned to an exact version with an integrity hash
// - notes any sampled sound name the game asks for that sfx_bank.js doesn't have (the synth plays instead)
// - the Sfx block loads on its own and every dev/sfxgen/calib.json entry matches its procedural sound (calibcheck)
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
// The seconds of priming an MP4's edit list skips (its first entry's media time over the track's timescale), or null
// if it has no edit list.
function mp4Priming(buf) {
  const inside = new Set(['moov', 'trak', 'mdia', 'edts']), found = {};
  const walk = (s, e) => {
    while (s + 8 <= e) {
      let size = buf.readUInt32BE(s), hdr = 8;
      const type = buf.toString('latin1', s + 4, s + 8);
      if (size === 1) { size = Number(buf.readBigUInt64BE(s + 8)); hdr = 16; } else if (size === 0) size = e - s;
      if (size < hdr || s + size > e) return;
      if (!found[type]) found[type] = s + hdr;
      if (inside.has(type)) walk(s + hdr, s + size);
      s += size;
    }
  };
  walk(0, buf.length);
  if (found.elst === undefined || found.mdhd === undefined) return null;
  const m = found.mdhd, ts = buf[m] === 1 ? buf.readUInt32BE(m + 20) : buf.readUInt32BE(m + 12);
  const q = found.elst, media = buf[q] === 1 ? Number(buf.readBigInt64BE(q + 16)) : buf.readInt32BE(q + 12);
  return media / ts;
}
const ok = (msg) => console.log(`ok    ${msg}`);
const fail = (msg) => { console.log(`FAIL  ${msg}`); failures.push(msg); };

function compile(code, filename) {
  try { new vm.Script(code, { filename }); return true; }
  catch (err) { fail(`${filename}: ${err.message}`); return false; }
}

const htmlPath = join(root, 'slaghouse.html');
const html = readFileSync(htmlPath, 'utf8');

// src/ (#7): slaghouse.html is built from it by plain concatenation, so the two must match byte for byte
{
  const { build, PARTS } = await import(pathToFileURL(join(root, 'src', 'join.mjs')).href);
  if (Buffer.compare(build(), readFileSync(htmlPath))) fail('slaghouse.html is not what src/ builds: edit the files in src/ and run node src/join.mjs');
  else ok(`slaghouse.html is what the ${PARTS.length} parts in src/ build`);
}

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
for (const [bank, aacBank, key] of [['sfx_bank.js', 'sfx_bank_aac.js', 'SLAG_SFX'], ['music_bank.js', 'music_bank_aac.js', 'SLAG_MUSIC']]) {
  const p = join(root, bank), q = join(root, aacBank);
  if (!existsSync(p)) continue;
  if (!existsSync(q)) { fail(`${aacBank} is missing, so browsers without Ogg Opus get no samples (dev/sfxgen or dev/synthwave build.py makes it)`); continue; }
  const src = readFileSync(q, 'utf8');
  if (!compile(src, aacBank)) continue;
  const a = { window: {} }, b = { window: {} };
  vm.runInNewContext(readFileSync(p, 'utf8'), a); vm.runInNewContext(src, b);
  const opus = Object.keys(a.window[key] || {}).sort().join(' '), aac = Object.keys(b.window[key + '_AAC'] || {}).sort().join(' ');
  if (opus !== aac) fail(`${aacBank} is out of step with ${bank}: rebuild it (names differ)`);
  else ok(`${aacBank} compiles and matches ${bank}`);
  // AAC starts every clip with encoder priming (1024 samples from ffmpeg). The MP4 edit list (elst) tells the decoder
  // to skip it, so a one-shot starts on time. A loop plays [ls, ls + len] of a clip padded with 100 ms of its own wrap
  // either side, so if a decoder ignores the edit list, priming shorter than that pad still keeps the seam clean.
  const late = [], bare = [];
  for (const [name, rec] of Object.entries(b.window[key + '_AAC'] || {})) for (const [i, d] of [].concat(rec.d).entries()) {
    const p = mp4Priming(Buffer.from(d, 'base64')), id = `${name}${Array.isArray(rec.d) ? '#' + i : ''}`;
    if (p === null) bare.push(id);
    else if (p <= 0 || (rec.loop && p >= rec.ls)) late.push(`${id} (${(p * 1000).toFixed(1)} ms${rec.loop ? ', pad ' + rec.ls * 1000 + ' ms' : ''})`);
  }
  if (bare.length) fail(`${aacBank}: ${bare.length} clip(s) with no MP4 edit list, so a decoder plays AAC's priming as a late start or a click: ${bare.slice(0, 6).join(' ')}`);
  else if (late.length) fail(`${aacBank}: priming that a loop's pad can't cover, or none trimmed: ${late.slice(0, 6).join(' ')}`);
  else ok(`${aacBank}: every clip's edit list trims the encoder priming, inside each loop's pad`);
}

// sfxgen calibration (#124): calibcheck.mjs evaluates the `const Sfx = { ... };` block with no page globals, the
// way build.py's stale check does. A block that can't load that way, or a calib.json entry measured against an older
// version of its procedural sound, fails here (re-run slagCalib in the browser for stale ones; see dev/sfxgen/README.md).
try {
  const { fingerprints } = await import('./sfxgen/calibcheck.mjs');
  const now = fingerprints(html), calib = JSON.parse(readFileSync(join(root, 'dev', 'sfxgen', 'calib.json'), 'utf8'));
  const stale = Object.entries(calib).filter(([name, entry]) => name in now && entry[2] && entry[2] !== now[name]).map(([name]) => name);
  if (stale.length) fail(`calib.json: ${stale.length} entries were measured against an older procedural sound: ${stale.join(' ')}`);
  else ok(`calib.json: all ${Object.keys(calib).length} entries match the Sfx block`);
} catch (err) { fail(`dev/sfxgen/calibcheck.mjs could not load the Sfx block from slaghouse.html: ${err.message}`); }

if (failures.length) {
  console.log(`\n${failures.length} check(s) failed.`);
  process.exit(1);
}
console.log('\nAll checks passed.');
