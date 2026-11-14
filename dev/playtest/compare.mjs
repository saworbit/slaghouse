// Build-to-build kind check (#147). Serves the working tree and a git ref side by side in headless Chrome, runs
// dump.js's spawn, draw and kill dumps for every enemy kind in both, and lists the kinds and cases that differ.
// Use it around a refactor or a balance pass to see exactly which kinds it touched.
//   node dev/playtest/compare.mjs                 (working tree against origin/main)
//   node dev/playtest/compare.mjs HEAD~1          (any commit, branch or tag)
//   node dev/playtest/compare.mjs main --kinds=grunt,heavy
// Both pages get the working tree's harness.js and dump.js, and the same lists of kinds and AI states in the same
// order (the ref's order, then any kinds only the working tree has). Exits 0 with no differences, 1 when anything
// differs or a page throws, and 2 on a bad option or ref. Needs what run.mjs needs (npm ci --prefix dev/playtest).
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { chromium } from 'playwright-core';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const run = promisify(execFile);
const USAGE = `Usage: node dev/playtest/compare.mjs [ref] [options]
  ref              commit, branch or tag to compare the working tree with (default origin/main)
  --kinds=a,b      only these enemy kinds
  --help           print this and exit`;
const usageError = msg => { console.error(`compare.mjs: ${msg}\n\n${USAGE}`); process.exit(2); };
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(USAGE); process.exit(0); }
const refs = args.filter(a => !a.startsWith('--'));
for (const a of args) if (a.startsWith('--') && !a.startsWith('--kinds=')) usageError(`unknown option ${a}`);
if (refs.length > 1) usageError(`one ref at a time, got ${refs.join(' ')}`);
const ref = refs[0] || 'origin/main';
const only = args.findLast(a => a.startsWith('--kinds='))?.slice('--kinds='.length).split(',').filter(Boolean);
if (only && !only.length) usageError('--kinds needs at least one kind');
let sha;
try { sha = (await run('git', ['rev-parse', '--verify', '--quiet', ref + '^{commit}'], { cwd: root })).stdout.trim(); }
catch { usageError(`${ref} isn't a commit git knows`); }

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css' };
const fromDisk = path => readFile(join(root, path));
const fromRef = path => run('git', ['cat-file', 'blob', `${sha}:${path}`], { cwd: root, encoding: 'buffer', maxBuffer: 256 << 20 }).then(r => r.stdout);
const sides = [
  { name: ref, origin: 'http://ref.slaghouse.test', read: fromRef },
  { name: 'working tree', origin: 'http://work.slaghouse.test', read: fromDisk },
];

// Phaser from each build's CDN tag, fetched once per URL and checked against the tag's integrity hash
const phasers = new Map();
async function phaserFor(html) {
  const tag = html.match(/<script src="(https:\/\/[^"]+)" integrity="(sha\d+)-([^"]+)"/);
  if (!tag) throw new Error('slaghouse.html: no CDN <script> with an integrity hash');
  const [, src, alg, want] = tag;
  if (!phasers.has(src)) phasers.set(src, (async () => {
    for (let attempt = 1; ; attempt++) {
      try {
        const r = await fetch(src, { signal: AbortSignal.timeout(30000) });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const body = Buffer.from(await r.arrayBuffer()), got = createHash(alg).update(body).digest('base64');
        if (got !== want) throw new Error(`its ${alg} is ${got}, the tag wants ${want}`);
        return body;
      } catch (err) { if (attempt === 3) throw new Error(`couldn't fetch ${src}: ${err.message}`); }
    }
  })());
  return { src, body: await phasers.get(src) };
}

const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYTEST_CHROME ? { executablePath: process.env.PLAYTEST_CHROME } : { channel: 'chrome' }),
  args: ['--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const scripts = await Promise.all(['harness', 'dump'].map(f => readFile(join(here, f + '.js'), 'utf8')));
const t0 = Date.now(), secs = () => ((Date.now() - t0) / 1000).toFixed(0) + 's';

async function open(side) {
  const html = (await side.read('slaghouse.html')).toString('utf8');
  const phaser = await phaserFor(html);
  const ctx = await browser.newContext();
  ctx.setDefaultTimeout(300000);
  await ctx.route(side.origin + '/**', async route => {
    const path = decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/+/, '');
    if (path === 'favicon.ico') return route.fulfill({ status: 204 });
    if (normalize(join(root, path)).indexOf(root + sep) !== 0) return route.fulfill({ status: 403 });
    try { return route.fulfill({ body: await side.read(path), contentType: TYPES[extname(path)] || 'application/octet-stream' }); }
    catch { return route.fulfill({ status: 404 }); }
  });
  await ctx.route(phaser.src, r => r.fulfill({ status: 200, contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: phaser.body }));
  const page = await ctx.newPage();
  side.errs = [];
  page.on('pageerror', e => side.errs.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', m => { if (m.type() === 'error') side.errs.push('console error: ' + m.text()); });
  await page.goto(side.origin + '/slaghouse.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.game && game.scene && game.scene.getScene('Title') && game.scene.getScene('Title').sys.isActive(), null, { timeout: 60000 });
  await page.evaluate(() => { game.renderer.render = function () {}; });   // nothing here reads pixels
  for (const src of scripts) await page.evaluate(s => { (0, eval)(s); }, src);
  side.page = page;
  return page.evaluate(() => ({ kinds: KD.kinds(), states: KD.states() }));
}

let code = 0;
try {
  const lists = await Promise.all(sides.map(open));
  const kinds = only || [...new Set([...lists[0].kinds, ...lists[1].kinds])];
  const states = [...new Set([...lists[0].states, ...lists[1].states])].sort();
  console.log(`comparing ${kinds.length} kinds over ${states.length} AI states: ${ref} (${sha.slice(0, 7)}) against the working tree`);
  const [a, b] = await Promise.all(sides.map(s => s.page.evaluate(([k, st]) => KD.run(k, st), [kinds, states])));
  console.log(`dumped both in ${secs()}`);

  const clip = s => s.length > 150 ? s.slice(0, 147) + '...' : s;
  const missing = (from, against) => {                                  // lines of `from` that `against` doesn't have, in order
    const left = new Map();
    for (const x of against) left.set(x, (left.get(x) || 0) + 1);
    return from.filter(x => { const n = left.get(x); if (n) { left.set(x, n - 1); return false; } return true; });
  };
  const diff = (old, now) => {
    const gone = missing(old, now), added = missing(now, old);
    if (!gone.length && !added.length) {
      const i = old.findIndex((x, j) => x !== now[j]);
      return [`same lines in another order, first at line ${i + 1}:`, `- ${clip(old[i])}`, `+ ${clip(now[i])}`];
    }
    const some = (list, mark) => [...list.slice(0, 4).map(x => `${mark} ${clip(x)}`), ...(list.length > 4 ? [`${mark} ...and ${list.length - 4} more`] : [])];
    return [...some(gone, '-'), ...some(added, '+')];
  };
  const differ = [];
  let cases = 0;
  for (const kind of kinds) {
    const A = a[kind], B = b[kind];
    if (!A || !B) {
      if (A || B) { differ.push(kind); console.log(`\n${kind}: only in ${A ? ref : 'the working tree'}`); }
      continue;
    }
    const groups = new Map();                                           // cases with the same change print once
    for (const key of [...new Set([...Object.keys(A), ...Object.keys(B)])]) {
      cases++;
      const x = A[key], y = B[key];
      if (JSON.stringify(x) === JSON.stringify(y)) continue;
      const lines = !x ? [`only in the working tree`] : !y ? [`only in ${ref}`] : diff(x, y);
      const sig = lines.join('\n');
      if (!groups.has(sig)) groups.set(sig, []);
      groups.get(sig).push(key);
    }
    if (!groups.size) continue;
    differ.push(kind);
    const n = [...groups.values()].reduce((s, g) => s + g.length, 0);
    console.log(`\n${kind}: ${n} case${n > 1 ? 's' : ''} differ`);
    for (const [sig, keys] of groups) {
      console.log(`  ${keys[0]}${keys.length > 1 ? ` (and ${keys.length - 1} more with the same change: ${clip(keys.slice(1, 4).join(', ') + (keys.length > 4 ? ', ...' : ''))})` : ''}`);
      for (const line of sig.split('\n')) console.log(`      ${line}`);
    }
  }
  for (const s of sides) if (s.errs.length) { code = 1; console.log(`\n${s.name} page errors:`); for (const e of s.errs) console.log(`  ${e}`); }
  if (differ.length) { code = 1; console.log(`\n${differ.length} of ${kinds.length} kinds differ: ${differ.join(' ')}`); }
  else console.log(`no differences in ${kinds.length} kinds and ${cases} cases (${secs()})`);
} catch (err) {
  code = 1;
  console.log('compare.mjs threw: ' + String(err && err.message || err).split('\n').slice(0, 5).join(' | '));
  for (const s of sides) for (const e of s.errs || []) console.log(`  ${s.name}: ${e}`);
} finally { await browser.close(); }
process.exit(code);
