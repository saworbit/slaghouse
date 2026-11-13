// Headless runner for the play-test harness (#45, #39). Routes repo files into headless Chrome
// and runs, each in a fresh browser profile:
//   - the two-tab check (twotab.js) and the DAILY midnight check (daily.js)
//   - every enemy kind (kinds.js), warped in one at a time: a codex row, its start frame, then it runs, takes a hit
//     and dies without an error
//   - every breakable prop in every arena (props.js): it sits where it can, breaks and goes off, restocks and breaks
//     again to a blast without an error
//   - the campaign checkpoint checks (checkpoint.js): save at the Furnace lift, reload and Continue, die and retry
//     the act, and a few damaged saves that must fall back to New Campaign
//   - full VB.campaign(1500) runs (vibe.js), which must win with every wave enemy killed and no survivors
// Any page error or console error fails the run too. Exits 1 and names each failure.
//   npm ci --prefix dev/playtest        (once: installs playwright-core, no browser download)
//   node dev/playtest/run.mjs           (all checks)
//   node dev/playtest/run.mjs --quick   (skip the campaign run)
//   node dev/playtest/run.mjs --campaign --brutal --seeds=91,404
//   node dev/playtest/run.mjs --help    (every option; an unknown option or a bad --seeds exits with status 2)
// It uses the installed Google Chrome (Playwright's 'chrome' channel). Set PLAYTEST_CHROME to a browser's path to
// use another. It needs network access once: it fetches Phaser from jsDelivr (with retries), checks it against the
// tag's integrity hash, and serves that copy to every page, so a fresh profile doesn't refetch it each time.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const USAGE = `Usage: node dev/playtest/run.mjs [options]
  (no options)       every check, then the Normal campaigns
  --quick            every check except the full campaigns
  --campaign         full campaigns only
  --seeds=91,404     seeds for the full campaigns (comma-separated unsigned 32-bit integers)
  --brutal           play the full campaigns on Brutal
  --lab              Lab sweeps, menu controls, presets, snapshots, reset and save isolation
  --lab-sweep        weapon, enemy and hazard sweeps only
  --help             print this and exit`;
const usageError = (msg, usage = false) => { console.error(`run.mjs: ${msg}` + (usage ? `\n\n${USAGE}` : '')); process.exit(2); };
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(USAGE); process.exit(0); }
for (const arg of args) {
  if (!['--quick', '--lab', '--lab-sweep', '--campaign', '--brutal'].includes(arg) && !arg.startsWith('--seeds=')) usageError(`unknown option ${arg}`, true);
}
const quick = args.includes('--quick');
const labOnly = args.includes('--lab');
const sweepOnly = args.includes('--lab-sweep');
const campaignOnly = args.includes('--campaign');
const brutal = args.includes('--brutal');
const seedArg = args.findLast(arg => arg.startsWith('--seeds='));
const campaignSeeds = (seedArg?.slice('--seeds='.length) ?? '91,404,137').split(',').map(seed => /^[0-9]+$/.test(seed) ? Number(seed) : NaN);
if (campaignSeeds.some(seed => !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)) {
  usageError(`--seeds expects comma-separated unsigned 32-bit integers, got ${seedArg}`);
}
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css' };

const origin = 'http://slaghouse.test';
const url = origin + '/slaghouse.html';
async function serveRepo(route) {
  const path = decodeURIComponent(new URL(route.request().url()).pathname);
  if (path === '/favicon.ico') return route.fulfill({ status: 204 });
  const file = normalize(join(root, path));
  if (!file.startsWith(root + sep)) return route.fulfill({ status: 403 });
  try { return route.fulfill({ body: await readFile(file), contentType: TYPES[extname(file)] || 'application/octet-stream' }); }
  catch { return route.fulfill({ status: 404 }); }
}

// Phaser, fetched once: every check opens a fresh profile with an empty cache, and a CDN fetch that stalls on a CI
// runner would otherwise time a page load out. The browser still checks the integrity hash on the copy it's given.
const tag = (await readFile(join(root, 'slaghouse.html'), 'utf8')).match(/<script src="(https:\/\/[^"]+)" integrity="(sha\d+)-([^"]+)"/);
if (!tag) throw new Error('slaghouse.html: no CDN <script> with an integrity hash (node dev/check.mjs says why)');
const [, cdnSrc, hashAlg, hashB64] = tag;
let phaser = null, served = 0;
const verifiedPhaser = body => {
  const got = createHash(hashAlg).update(body).digest('base64');
  if (got !== hashB64) throw new Error(`its ${hashAlg} is ${got}, the tag wants ${hashB64}`);
  return body;
};
if (process.env.PLAYTEST_PHASER) phaser = verifiedPhaser(await readFile(process.env.PLAYTEST_PHASER));
for (let attempt = 1; !phaser; attempt++) {
  try {
    const r = await fetch(cdnSrc, { signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    phaser = verifiedPhaser(Buffer.from(await r.arrayBuffer()));
  } catch (err) {
    if (attempt === 3) throw new Error(`couldn't fetch ${cdnSrc}: ${err.message}`);
    console.log(`note  fetching ${cdnSrc} failed (${err.message}); trying again`);
  }
}

const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYTEST_CHROME ? { executablePath: process.env.PLAYTEST_CHROME } : { channel: 'chrome' }),
  args: ['--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const scripts = Object.fromEntries(await Promise.all(['harness', 'campaign-bot', 'vibe', 'twotab', 'daily', 'kinds', 'props', 'checkpoint', 'lab', 'lab-sweep'].map(async f => [f, await readFile(join(here, f + '.js'), 'utf8')])));
const failures = [];
const t0 = Date.now(), secs = () => ((Date.now() - t0) / 1000).toFixed(0) + 's';
const report = (name, fails) => {
  if (fails.length) { console.log(`FAIL  ${name}`); for (const f of fails) console.log(`        ${f}`); failures.push(name); }
  else console.log(`ok    ${name} (${secs()})`);
};

// a fresh profile, the page on its title screen, the harness files loaded; page errors and console errors collected
async function open(ctx, files, query = '') {
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
    const open = [...page._pending].map(([r, t]) => `${r.url().replace(origin, '').slice(0, 70)} (${((Date.now() - t) / 1000).toFixed(0)}s)`);
    return new Error(`${String(err.message).split('\n')[0]}; requests still open: ${open.join(', ') || 'none'}`);
  };
  // the game only needs its scripts (all parser-blocking, so DOMContentLoaded waits for them) and then its title screen
  try { await page.goto(url + query, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (err) { throw stuck(err); }
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
  ctx.setDefaultTimeout(8000);
  await ctx.route(origin + '/**', serveRepo);
  await ctx.route(cdnSrc, r => { served++; return r.fulfill({ status: 200, contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: phaser }); });
  try {
    const fails = await fn(ctx);
    for (const p of ctx.pages()) fails.push(...(p._errs || []));
    report(name, fails);
  } catch (err) {
    const errs = ctx.pages().flatMap(p => p._errs || []);
    report(name, ['threw: ' + String(err && err.message || err).split('\n').slice(0, 5).join(' | '),
      ...(err.stack ? err.stack.split('\n').filter(line => line.includes('run.mjs:')).slice(0, 1) : []), ...errs]);
  } finally { await ctx.close(); }
}

try {
  if (!campaignOnly) for (const section of ['weapons', 'mobs', 'hazards']) await check('Lab sweep: ' + section, async ctx => {
    const page = await open(ctx, ['lab-sweep']);
    const result = await page.evaluate(section => labSweep(section), section);
    console.log(`      ${result.count} ${section} exercised`);
    return result.fails;
  });
  if (!sweepOnly && !campaignOnly) {
  await check('Lab menu, keyboard controls and in-room redeploy', async ctx => {
    const page = await open(ctx, []);
    const fail = [];
    const wait = async (what, predicate) => {
      try { await page.waitForFunction(predicate); }
      catch (err) {
        const info = await page.evaluate(() => ({ menu: game.scene.getScene('Title').menuSel,
          lab: SlagLab.snapshot()?.config.room, paused: SlagLab.snapshot()?.paused,
          ready: SlagLab.snapshot()?.ready, weapon: SlagLab.snapshot()?.player.weapon,
          error: document.getElementById('lab-error').textContent, focus: document.activeElement?.name }));
        throw new Error(`${what}: ${JSON.stringify(info)} (${err.message.split('\n')[0]})`);
      }
    };
    await page.keyboard.down('w'); // wrap from Campaign to Lab
    await wait('select Lab', () => game.scene.getScene('Title').menuSel === 8);
    await page.keyboard.up('w');
    // Phaser retains input events through post-step. Separate the two title actions by a game frame.
    await page.evaluate(() => new Promise(resolve => game.events.once('poststep', resolve)));
    await page.keyboard.press('Enter');
    const panel = page.getByRole('dialog', { name: 'Slaghouse Lab' });
    await wait('open Lab from title', () => document.getElementById('lab-panel').open);
    await wait('focus Room', () => document.activeElement?.name === 'room');
    await page.keyboard.press('Tab');
    await wait('Tab to starting weapon', () => document.activeElement?.name === 'weapon');
    await panel.getByLabel('Room', { exact: true }).selectOption('encounter');
    await panel.getByLabel('Starting weapon').selectOption('rail');
    await panel.getByLabel('Invulnerable player').check();
    await panel.getByRole('button', { name: 'Deploy room' }).click();
    await wait('deploy Combat Pit', () => SlagLab.snapshot()?.ready);
    let s = await page.evaluate(() => SlagLab.snapshot());
    if (s.config.room !== 'encounter' || s.player.weapon !== 'rail' || s.enemies.length !== 7) fail.push('Combat Pit did not apply its roster and starting weapon');
    await page.keyboard.down('2');
    try { await wait('equip shotgun', () => SlagLab.snapshot()?.player.weapon === 'shotgun'); }
    finally { await page.keyboard.up('2'); }
    await page.keyboard.down('r');
    try { await wait('reset Combat Pit', () => SlagLab.snapshot()?.ready && SlagLab.snapshot().player.weapon === 'rail'); }
    finally { await page.keyboard.up('r'); }
    await page.keyboard.press('F2');
    await panel.waitFor({ state: 'visible' });
    await wait('pause on F2', () => SlagLab.snapshot()?.paused);
    await page.keyboard.press('Escape');
    await panel.waitFor({ state: 'hidden' });
    await wait('resume on Escape', () => !SlagLab.snapshot()?.paused);
    await page.keyboard.press('F2');
    await panel.getByLabel('Room', { exact: true }).selectOption('breakables');
    await panel.getByRole('button', { name: 'Deploy room' }).click();
    await wait('redeploy Breakables Bay', () => SlagLab.snapshot()?.config.room === 'breakables' && SlagLab.snapshot().ready);
    s = await page.evaluate(() => SlagLab.snapshot());
    if (!s.props.some(p => p.id === 'ladle' && p.state === 'ok')) fail.push('Breakables Bay did not build its props');
    await page.getByRole('button', { name: 'Lab controls' }).click();
    await panel.getByRole('button', { name: 'Exit to title' }).click();
    await wait('exit to title', () => game.scene.getScene('Title').sys.isActive());
    if (await page.evaluate(() => SlagLab.snapshot()) !== null) fail.push('Exit left the Lab running');
    await open(ctx, [], '?lab=yard');
    await wait('open linked room', () => document.getElementById('lab-panel').open && document.querySelector('#lab-form [name=room]').value === 'yard');
    return fail;
  });
  await check('Lab presets, combat, snapshots, clean reset and save isolation', async ctx => {
    const page = await open(ctx, ['lab']);
    return page.evaluate(() => checkLab());
  });
  }
  if (!labOnly && !sweepOnly && !campaignOnly) {
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
  await check('Furnace squads arrive in stages and the Gunship warns before attacking', async ctx => {
    const page = await open(ctx, ['checkpoint']);
    return (await page.evaluate(() => CP.furnacePacing())).fails;
  });
  await check('Gravity Loss Linkers descend from all three ceiling pockets', async ctx => {
    const page = await open(ctx, ['checkpoint']);
    return (await page.evaluate(() => CP.linkerRecovery())).fails;
  });
  await check('upper catwalks and responsive wall jumps', async ctx => {
    const page = await open(ctx, ['checkpoint']);
    return (await page.evaluate(() => CP.traversal())).fails;
  });
  await check('late campaign stages hazard warnings, weapon issues and boss machinery', async ctx => {
    const page = await open(ctx, ['checkpoint']);
    return (await page.evaluate(() => CP.latePacing())).fails;
  });
  await check('every enemy kind spawns, takes a hit and dies cleanly', async ctx => {
    const page = await open(ctx, ['kinds']);
    return (await page.evaluate(() => { RUNMODE = 'campaign'; T.boot(); T.run(300); return KC.check(); })).fails;
  });
  await check('every breakable prop goes off cleanly in every arena', async ctx => {
    const page = await open(ctx, ['props']);
    return (await page.evaluate(() => { RUNMODE = 'campaign'; T.boot(); T.run(300); return PR.check(); })).fails;
  });
  await check('early campaign prop contact damage on Normal', async ctx => {
    const page = await open(ctx, ['props']);
    return page.evaluate(() => PR.campaignContactDamage());
  });
  await check('campaign bot clears the Blackout ceiling creeper and disguised mimic', async ctx => {
    const page = await open(ctx, ['campaign-bot']);
    return page.evaluate(() => {
      Math.random = seeded(91);
      RUNMODE = 'campaign'; T.boot(); T.run(300);
      const g = T.g();
      g.time.removeAllEvents(); g.wave = 1; g.enemiesLeft = 2; g.applyMod('dark');
      const creeper = g.spawnEnemy('creeper', 68, 2), mimic = g.spawnEnemy('mimic', 95, 24);
      const fails = [];
      const drive = campaignBot();
      for (let i = 0; i < 3600 && g.enemiesLeft && g.state === 'play'; i++) { drive(g); T.run(17); }
      if (creeper.alive || mimic.alive || g.enemiesLeft || g.stats.kills !== 2) {
        fails.push(`Blackout stalled with ${creeper.hp} creeper HP, ${mimic.hp} mimic HP and ${g.stats.kills}/2 kills`);
      }
      return [...fails, ...T.errs];
    });
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
  }
  if (campaignOnly || (!quick && !labOnly && !sweepOnly)) for (const seed of campaignSeeds) {
    await check(`${brutal ? 'Brutal' : 'Normal'} campaign seed ${seed} clears all five acts`, async ctx => {
      const page = await open(ctx, ['campaign-bot', 'vibe']);
      const r = await page.evaluate(async ({ seed, brutal }) => {
        // Hold the simulation clock and game RNG steady across fresh browser profiles.
        Math.random = seeded(seed);
        Sfx.muted = true;
        game.loop.now = game.loop.time = 10000;
        OPTS.diff = DIFFS.findIndex(d => d.name === (brutal ? 'BRUTAL' : 'NORMAL'));
        RUNMODE = 'campaign'; T.boot(); T.run(300);
        return await VB.campaign(1500);
      }, { seed, brutal });
      console.log(`      seed ${seed}: ${r.state}, ${r.kills}/${r.total} kills, ${r.pending} pending, ${r.remaining.length} survivors, ${Math.round(r.hp)} HP at finish (${Math.round(r.minHp)} minimum), ${r.simFps} sim fps; ${r.waves.join('; ')}`);
      const fails = [];
      if (r.difficulty !== (brutal ? 'BRUTAL' : 'NORMAL')) fails.push(`unexpected difficulty: ${r.difficulty}`);
      if (r.state !== 'won') fails.push(`state ${r.state}, want won (stopped at ${r.kills}/${r.total} kills)`);
      for (let i = 1; i <= 10; i++) if (!r.waves.some(w => w.startsWith(`w${i}/`))) fails.push(`campaign skipped operation ${i}`);
      if (r.kills !== r.total || r.pending !== 0) fails.push(`${r.kills}/${r.total} kills and ${r.pending} pending`);
      if (r.remaining.length) fails.push('survivors: ' + r.remaining.join('; '));
      if (r.leftBehind.length) fails.push('enemies left at act transitions: ' + r.leftBehind.join('; '));
      if (r.bossCleanup.length) fails.push('summons alive when the Smelter fell: ' + r.bossCleanup.join('; '));
      if (r.state !== 'won') fails.push('controller: ' + JSON.stringify({ ...r.control, hp: r.hp, killer: r.killer }));
      if (r.state !== 'won') fails.push('campaign: ' + JSON.stringify(r.campaign));
      fails.push(...r.errs.map(e => 'harness error: ' + e));
      return fails;
    });
  }
} finally {
  await browser.close();
}
console.log(`\nnote  Verified Phaser was served to ${served} page load(s).`);
if (failures.length) { console.log(`${failures.length} check(s) failed.`); process.exit(1); }
console.log(`All play-test checks passed (${secs()}).`);
