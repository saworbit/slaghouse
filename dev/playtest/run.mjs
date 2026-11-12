// Headless runner for the play-test harness (#45, #39). Serves the repo, opens slaghouse.html in headless Chrome
// and runs, each in a fresh browser profile:
//   - the two-tab check (twotab.js) and the DAILY midnight check (daily.js)
//   - every enemy kind (kinds.js), warped in one at a time: a codex row, its start frame, then it runs, takes a hit
//     and dies without an error
//   - the campaign checkpoint checks (checkpoint.js): save at the Furnace lift, reload and Continue, die and retry
//     the act, and a few damaged saves that must fall back to New Campaign
//   - a full VB.campaign(1500) run (vibe.js), which must end won; foes the bot couldn't reach are listed as a note
// Any page error or console error fails the run too. Exits 1 and names each failure.
//   npm ci --prefix dev/playtest        (once: installs playwright-core, no browser download)
//   node dev/playtest/run.mjs           (all of it, about 30 s; the campaign run is most of that)
//   node dev/playtest/run.mjs --quick   (skip the campaign run)
// It uses the installed Google Chrome (Playwright's 'chrome' channel). Set PLAYTEST_CHROME to a browser's path to
// use another. It needs network access once: it fetches Phaser from jsDelivr (with retries), checks it against the
// tag's integrity hash, and serves that copy to every page, so a fresh profile doesn't refetch it each time.
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const quick = process.argv.includes('--quick');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css' };

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/favicon.ico') { res.writeHead(204).end(); return; }  // the game has no icon; don't log a 404 as an error
  const file = normalize(join(root, path));
  if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
  try { const body = await readFile(file); res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' }).end(body); }
  catch { res.writeHead(404).end(); }
});
await new Promise(ok => server.listen(0, '127.0.0.1', ok));
const url = `http://127.0.0.1:${server.address().port}/slaghouse.html`;

// Phaser, fetched once: every check opens a fresh profile with an empty cache, and a CDN fetch that stalls on a CI
// runner would otherwise time a page load out. The browser still checks the integrity hash on the copy it's given.
const tag = (await readFile(join(root, 'slaghouse.html'), 'utf8')).match(/<script src="(https:\/\/[^"]+)" integrity="(sha\d+)-([^"]+)"/);
if (!tag) throw new Error('slaghouse.html: no CDN <script> with an integrity hash (node dev/check.mjs says why)');
const [, cdnSrc, hashAlg, hashB64] = tag;
let phaser = null, served = 0;
for (let attempt = 1; !phaser; attempt++) {
  try {
    const r = await fetch(cdnSrc, { signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const body = Buffer.from(await r.arrayBuffer()), got = createHash(hashAlg).update(body).digest('base64');
    if (got !== hashB64) throw new Error(`its ${hashAlg} is ${got}, the tag wants ${hashB64}`);
    phaser = body;
  } catch (err) {
    if (attempt === 3) { server.close(); throw new Error(`couldn't fetch ${cdnSrc}: ${err.message}`); }
    console.log(`note  fetching ${cdnSrc} failed (${err.message}); trying again`);
  }
}

const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYTEST_CHROME ? { executablePath: process.env.PLAYTEST_CHROME } : { channel: 'chrome' }),
  args: ['--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const scripts = Object.fromEntries(await Promise.all(['harness', 'vibe', 'twotab', 'daily', 'kinds', 'checkpoint'].map(async f => [f, await readFile(join(here, f + '.js'), 'utf8')])));
const failures = [];
const t0 = Date.now(), secs = () => ((Date.now() - t0) / 1000).toFixed(0) + 's';
const report = (name, fails) => {
  if (fails.length) { console.log(`FAIL  ${name}`); for (const f of fails) console.log(`        ${f}`); failures.push(name); }
  else console.log(`ok    ${name} (${secs()})`);
};

// a fresh profile, the page on its title screen, the harness files loaded; page errors and console errors collected
async function open(ctx, files) {
  const page = ctx.pages()[0] || await ctx.newPage();
  if (!page._errs) {
    page._errs = [];
    page.on('pageerror', e => page._errs.push('page error: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
    page.on('console', m => { if (m.type() === 'error') page._errs.push('console error: ' + m.text()); });
    page._pending = new Map();                                          // request -> start time, so a stuck load can say what it's waiting on
    page.on('request', r => page._pending.set(r, Date.now()));
    for (const ev of ['requestfinished', 'requestfailed']) page.on(ev, r => page._pending.delete(r));
  }
  const stuck = err => {
    const open = [...page._pending].map(([r, t]) => `${r.url().replace(/^https?:\/\/127\.0\.0\.1:\d+/, '').slice(0, 70)} (${((Date.now() - t) / 1000).toFixed(0)}s)`);
    return new Error(`${String(err.message).split('\n')[0]}; requests still open: ${open.join(', ') || 'none'}`);
  };
  // the game only needs its scripts (all parser-blocking, so DOMContentLoaded waits for them) and then its title screen
  try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (err) { throw stuck(err); }
  try { await page.waitForFunction(() => window.game && game.scene && game.scene.getScene('Title') && game.scene.getScene('Title').sys.isActive(), null, { timeout: 60000 }); }
  catch (err) { throw stuck(err); }
  // No drawing: nothing here reads pixels, and on a runner without a GPU every stepped frame is software WebGL in
  // the GPU process all pages share. Its backlog stalled the next page's WebGL setup for minutes. VB.campaign
  // already turns rendering off for the same reason.
  await page.evaluate(() => { game.renderer.render = function () {}; });
  for (const f of ['harness', ...files]) await page.evaluate(src => { (0, eval)(src); }, scripts[f]);
  return page;
}
async function check(name, fn) {
  const ctx = await browser.newContext();
  await ctx.route(cdnSrc, r => { served++; return r.fulfill({ status: 200, contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: phaser }); });
  try {
    const fails = await fn(ctx);
    for (const p of ctx.pages()) fails.push(...(p._errs || []));
    report(name, fails);
  } catch (err) {
    const errs = ctx.pages().flatMap(p => p._errs || []);
    report(name, ['threw: ' + String(err && err.message || err).split('\n')[0], ...errs]);
  } finally { await ctx.close(); }
}

try {
  await check('two tabs: lifetime stats, codex and campaign save', async ctx => {
    const page = await open(ctx, ['twotab']);
    return (await page.evaluate(() => { RUNMODE = 'campaign'; T.boot(); T.run(300); return TT.check(); })).fails;
  });
  await check('DAILY keeps its day past 00:00 UTC', async ctx => {
    const page = await open(ctx, ['daily']);
    return (await page.evaluate(() => { RUNMODE = 'daily'; T.boot(); T.run(300); return DY.check(); })).fails;
  });
  await check('campaign patrol, weapon access, reinforcement break and staged blackout', async ctx => {
    const page = await open(ctx, ['checkpoint']);
    return (await page.evaluate(() => CP.progression())).fails;
  });
  await check('every enemy kind spawns, takes a hit and dies cleanly', async ctx => {
    const page = await open(ctx, ['kinds']);
    return (await page.evaluate(() => { RUNMODE = 'campaign'; T.boot(); T.run(300); return KC.check(); })).fails;
  });
  let saved = null;
  await check('campaign checkpoint: save, reload, Continue, die, retry the act', async ctx => {
    let page = await open(ctx, ['checkpoint']);
    const s = await page.evaluate(() => CP.save());
    if (s.fails.length) return s.fails;
    saved = await page.evaluate(() => localStorage.getItem(CAMPAIGN_KEY));
    page = await open(ctx, ['checkpoint']);                               // a real reload: same profile, new page state
    const r = await page.evaluate(snap => CP.resume(snap), s.snap);
    if (r.fails.length) return r.fails;
    return (await page.evaluate(snap => CP.retry(snap), s.snap)).fails;
  });
  const damaged = { 'not JSON': '{"checkpoint": {', 'no checkpoint fields': '{"checkpoint":{"arena":1,"wave":2},"cleared":false}' };
  if (saved) {
    const c = JSON.parse(saved);
    damaged['weapon out of range'] = JSON.stringify({ ...c, checkpoint: { ...c.checkpoint, weapon: 999 } });
    damaged['arena with no act'] = JSON.stringify({ ...c, checkpoint: { ...c.checkpoint, arena: 5 } });
    await check('legacy campaign checkpoint keeps its equipped weapon', async ctx => {
      let page = await open(ctx, []);
      await page.evaluate(payload => {
        const legacy = JSON.parse(payload);
        delete legacy.checkpoint.revision;
        legacy.checkpoint.weapon = weaponSlot('nuke');
        legacy.checkpoint.stats.kills = 34;                         // 32 base foes cleared, plus two extras in the old opening acts
        legacy.checkpoint.totalEnemies = 98;
        localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(legacy));
      }, saved);
      page = await open(ctx, ['checkpoint']);
      return (await page.evaluate(() => CP.legacy())).fails;
    });
    damaged['unknown perk'] = JSON.stringify({ ...c, checkpoint: { ...c.checkpoint, perks: { ...c.checkpoint.perks, nope: true } } });
  }
  for (const [what, payload] of Object.entries(damaged)) {
    await check(`damaged campaign save (${what}) falls back to New Campaign`, async ctx => {
      let page = await open(ctx, []);
      await page.evaluate(([k, v]) => localStorage.setItem(k, v), ['slaghouse.campaign.v1', payload]);
      page = await open(ctx, ['checkpoint']);
      return (await page.evaluate(() => CP.damaged())).fails;
    });
  }
  if (!quick) {
    await check('VB.campaign(1500) plays all five acts', async ctx => {
      const page = await open(ctx, ['vibe']);
      const r = await page.evaluate(async () => { RUNMODE = 'campaign'; T.boot(); T.run(300); return await VB.campaign(1500); });
      console.log(`      ${r.state}, ${r.kills}/${r.total} kills, ${r.simFps} sim fps; ${r.waves.join('; ')}`);
      const fails = [];
      if (r.state !== 'won') fails.push(`state ${r.state}, want won (stopped at ${r.kills}/${r.total} kills)`);
      if ([1, 2, 3, 4, 5].some(a => !r.waves.some(w => w.includes('/a' + a + ' ')))) fails.push('campaign did not visit all five arenas');
      // a removal is the bot failing to reach a foe (a mimic hiding as a drum, say), not the game failing: report it
      if (r.removed.length) console.log(`note  the bot couldn't reach ${r.removed.length} foe(s), so VB.campaign removed them: ${r.removed.join('; ')}`);
      fails.push(...r.errs.map(e => 'harness error: ' + e));
      return fails;
    });
  }
} finally {
  await browser.close();
  server.close();
}
console.log(`\nnote  Phaser was fetched once and served to ${served} page load(s).`);
if (failures.length) { console.log(`${failures.length} check(s) failed.`); process.exit(1); }
console.log(`All play-test checks passed (${secs()}).`);
