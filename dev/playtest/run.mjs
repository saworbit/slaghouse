// Headless runner for the play-test harness (#45, #39). Serves the repo, opens slaghouse.html in headless Chrome
// and runs, each in a fresh browser profile:
//   - the two-tab check (twotab.js) and the DAILY midnight check (daily.js)
//   - the campaign checkpoint checks (checkpoint.js): save at the Furnace lift, reload and Continue, die and retry
//     the act, and a few damaged saves that must fall back to New Campaign
//   - a full VB.campaign(900) run (vibe.js), which must end won with nothing removed
// Any page error or console error fails the run too. Exits 1 and names each failure.
//   npm ci --prefix dev/playtest        (once: installs playwright-core, no browser download)
//   node dev/playtest/run.mjs           (all of it, about 30 s; the campaign run is most of that)
//   node dev/playtest/run.mjs --quick   (skip the campaign run)
// It uses the installed Google Chrome (Playwright's 'chrome' channel). Set PLAYTEST_CHROME to a browser's path to
// use another. Phaser loads from jsDelivr, so it needs network access.
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

const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYTEST_CHROME ? { executablePath: process.env.PLAYTEST_CHROME } : { channel: 'chrome' }),
  args: ['--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const scripts = Object.fromEntries(await Promise.all(['harness', 'vibe', 'twotab', 'daily', 'checkpoint'].map(async f => [f, await readFile(join(here, f + '.js'), 'utf8')])));
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
  }
  await page.goto(url);
  await page.waitForFunction(() => window.game && game.scene && game.scene.getScene('Title') && game.scene.getScene('Title').sys.isActive(), null, { timeout: 60000 });
  for (const f of ['harness', ...files]) await page.evaluate(src => { (0, eval)(src); }, scripts[f]);
  return page;
}
async function check(name, fn) {
  const ctx = await browser.newContext();
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
    damaged['arena with no act'] = JSON.stringify({ ...c, checkpoint: { ...c.checkpoint, arena: 4 } });
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
    await check('VB.campaign(900) plays the campaign to the end', async ctx => {
      const page = await open(ctx, ['vibe']);
      const r = await page.evaluate(async () => { RUNMODE = 'campaign'; T.boot(); T.run(300); return await VB.campaign(900); });
      console.log(`      ${r.state}, ${r.kills}/${r.total} kills, ${r.simFps} sim fps; ${r.waves.join('; ')}`);
      const fails = [];
      if (r.state !== 'won') fails.push(`state ${r.state}, want won (stopped at ${r.kills}/${r.total} kills)`);
      if (r.removed.length) fails.push(`the bot got stuck and VB.campaign removed: ${r.removed.join('; ')}`);
      fails.push(...r.errs.map(e => 'harness error: ' + e));
      return fails;
    });
  }
} finally {
  await browser.close();
  server.close();
}
if (failures.length) { console.log(`\n${failures.length} check(s) failed.`); process.exit(1); }
console.log(`\nAll play-test checks passed (${secs()}).`);
