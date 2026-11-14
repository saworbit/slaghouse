// Headless runner for the play-test harness (#45, #39). Routes repo files into headless Chrome
// and runs, each in a fresh browser profile:
//   - the two-tab check (twotab.js) and the DAILY midnight check (daily.js)
//   - every enemy kind (kinds.js), warped in one at a time: a codex row, its start frame, then it runs, takes a hit
//     and dies without an error
//   - every breakable prop in every arena (props.js): it sits where it can, breaks and goes off, restocks and breaks
//     again to a blast without an error
//   - every arena's nav graph, with the player's long drops and wall climbs: each standing cell reaches the start
//     and gets back (#125)
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
const campaignSeeds = (seedArg?.slice('--seeds='.length) ?? '91,404,137,5').split(',').map(seed => /^[0-9]+$/.test(seed) ? Number(seed) : NaN);
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
  await check('title pages: mouse paging, an explicit BACK, and the touch-only notice', async ctx => {
    const fail = [];
    let page = await open(ctx, []);
    const at = async (x, y) => page.evaluate(([x, y]) => { const r = game.canvas.getBoundingClientRect(); return [r.left + x * r.width / VIEW_W, r.top + y * r.height / VIEW_H]; }, [x, y]);
    const click = async (x, y, button = 'left') => { const [px, py] = await at(x, y); await page.mouse.click(px, py, { button }); await page.waitForTimeout(80); };
    const title = () => page.evaluate(() => { const t = game.scene.getScene('Title'); return { sub: t.sub, sel: t.subSel }; });
    const row = name => page.evaluate(n => { const o = game.scene.getScene('Title').menuItems.find(m => m._text === n); return [o.x, o.y]; }, name);
    const wheel = async (x, y, dy) => { const [px, py] = await at(x, y); await page.mouse.move(px, py); await page.mouse.wheel(0, dy); await page.waitForTimeout(160); };
    await click(...await row('CODEX'));
    if ((await title()).sub !== 'codex') fail.push('clicking CODEX did not open it');
    await wheel(480, 260, 120);
    if ((await title()).sel < 66) fail.push('the mouse wheel did not page the CODEX forward');
    await wheel(480, 260, -120);
    if ((await title()).sel >= 66) fail.push('the mouse wheel did not page the CODEX back');
    await click(480, await page.evaluate(() => game.scene.getScene('Title').codexCount.y));
    if ((await title()).sel < 66) fail.push('clicking PAGE 1/2 did not turn the page');
    await click(480, 514);                                            // the Q/E PAGE hint
    await click(480, 500);                                            // empty space below the grid
    if ((await title()).sub !== 'codex') fail.push('a stray click closed the CODEX');
    await click(70, 64);                                              // < BACK
    if ((await title()).sub !== null) fail.push('clicking BACK did not leave the CODEX');
    await click(...await row('MEDALS'));
    const medal = await page.evaluate(() => { const r = game.scene.getScene('Title').medalRows[4].name; return [r.x + 20, r.y + 6]; });
    await click(...medal);
    if ((await title()).sub !== 'medals') fail.push('clicking a medal closed MEDALS');
    await click(480, 300, 'right');
    if ((await title()).sub !== null) fail.push('a right click did not leave MEDALS');
    await click(...await row('ARMORY'));
    const [ax, ay] = await at(480, 200); await page.mouse.move(ax, ay); await page.waitForTimeout(80);   // hovering picks the gun under the cursor
    const before = (await title()).sel;
    await wheel(480, 200, 120);
    if ((await title()).sel !== before + 13) fail.push(`the wheel on ARMORY moved from gun ${before} to ${(await title()).sel}, want one row down`);
    await click(480, 500);
    if ((await title()).sub !== 'armory') fail.push('a click off the guns closed ARMORY');
    await click(...await row('OPTIONS'));
    if ((await title()).sub !== 'armory') fail.push('fixture: the menu took a click through the ARMORY page');
    // a touch-only device: the notice shows and runs wait for a key press
    await ctx.addInitScript(() => {
      const real = window.matchMedia.bind(window);
      window.matchMedia = q => (/pointer: coarse/.test(q) ? { matches: true } : /any-pointer: fine/.test(q) ? { matches: false } : real(q));
    });
    page = await open(ctx, []);
    const touch = await page.evaluate(() => { const t = game.scene.getScene('Title'); return { gate: t.touchGate, note: t.touchNote.visible }; });
    if (!touch.gate || !touch.note) fail.push(`a touch-only device saw no notice: ${JSON.stringify(touch)}`);
    await page.evaluate(() => game.scene.getScene('Title').menuPick(1));
    await page.waitForTimeout(500);
    if (await page.evaluate(() => game.scene.getScene('Game').sys.isActive())) fail.push('a touch-only device started OVERTIME with no keyboard or pad');
    await page.keyboard.down('Shift'); await page.waitForTimeout(70); await page.keyboard.up('Shift');
    if (await page.evaluate(() => game.scene.getScene('Title').touchNote.visible)) fail.push('a key press did not clear the touch notice');
    await page.evaluate(() => game.scene.getScene('Title').menuPick(1));
    try { await page.waitForFunction(() => game.scene.getScene('Game').sys.isActive()); }
    catch { fail.push('OVERTIME did not start after a key press on a touch device'); }
    return fail;
  });
  await check('Lab setup keeps your changes across rooms, tallies the roster, and works with a gamepad', async ctx => {
    const fail = [];
    let page = await open(ctx, []);
    const panel = page.getByRole('dialog', { name: 'Slaghouse Lab' });
    const form = () => page.evaluate(() => { const f = document.getElementById('lab-form').elements; return { room: f.room.value, weapon: f.weapon.value, difficulty: f.difficulty.value, groups: document.getElementById('lab-groups').children.length, tally: document.getElementById('lab-tally').textContent, deploy: !document.querySelector('#lab-form button[type=submit]').disabled, focus: document.activeElement?.name || document.activeElement?.textContent, notice: document.getElementById('lab-error').textContent }; });
    await page.evaluate(() => game.scene.getScene('Title').menuPick(8));
    await panel.waitFor({ state: 'visible' });
    // changing Room keeps what you set; untouched fields take the new room's preset
    await panel.getByLabel('Starting weapon').selectOption('rail');
    await panel.getByLabel('Difficulty').selectOption('2');
    await panel.getByRole('button', { name: 'Add group' }).click();
    const before = await form();
    await panel.getByLabel('Room', { exact: true }).selectOption('encounter');
    let f = await form();
    if (f.weapon !== 'rail' || f.difficulty !== '2' || f.groups !== before.groups) fail.push(`changing Room dropped the setup: ${JSON.stringify({ before, after: f })}`);
    // a live tally, and Deploy waits while the roster is over the limit
    await page.locator('#lab-groups [data-field=count]').last().fill('20');
    f = await form();
    if (!/Enemies \d+ \/ 16/.test(f.tally) || f.deploy) fail.push(`a roster over 16 left Deploy on or showed no tally: ${f.tally}`);
    await page.locator('#lab-groups [data-field=count]').last().fill('1');
    if (!(await form()).deploy) fail.push('Deploy stayed off once the roster fit again');
    await panel.getByRole('button', { name: 'Back' }).click();
    await panel.waitFor({ state: 'hidden' });
    // ?lab= with an unknown room says so
    page = await open(ctx, [], '?lab=nowhere');
    await panel.waitFor({ state: 'visible' });
    f = await form();
    if (!f.notice.includes('nowhere') || f.room !== 'range') fail.push(`?lab=nowhere opened ${f.room} with notice '${f.notice}'`);
    await page.keyboard.press('Escape');
    await panel.waitFor({ state: 'hidden' });
    // a standard-mapped pad opens the Lab, moves and changes fields, deploys, and backs out of LAB CONTROLS
    page = await open(ctx, []);                                       // a plain title: the cursor starts on CAMPAIGN
    await page.evaluate(() => {
      window.__pad = { connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ value: 0 })) };
      navigator.getGamepads = () => [window.__pad];
    });
    const down = b => page.evaluate(b => { window.__pad.buttons[b].value = 1; }, b), up = b => page.evaluate(b => { window.__pad.buttons[b].value = 0; }, b);
    const pad = async b => { await down(b); await page.waitForTimeout(80); await up(b); await page.waitForTimeout(80); };
    await pad(12);                                                    // D-pad up from CAMPAIGN wraps to LAB
    if (await page.evaluate(() => game.scene.getScene('Title').menuSel) !== 8) fail.push('D-pad up did not reach LAB');
    await down(0);
    await panel.waitFor({ state: 'visible' });
    await page.waitForTimeout(150);                                   // A still held: the dialog must not act on it
    f = await form();
    if (f.focus !== 'room' || f.room !== 'range') fail.push(`the A press that opened the Lab also acted in it: ${JSON.stringify(f)}`);
    await up(0); await page.waitForTimeout(80);
    await pad(13);
    if ((await form()).focus !== 'weapon') fail.push('D-pad down did not move to Starting weapon');
    const w0 = (await form()).weapon;
    await pad(15);
    const w1 = (await form()).weapon;
    if (w1 === w0) fail.push('D-pad right did not change the starting weapon');
    await pad(12); await pad(12); await pad(12);                      // weapon -> room -> Back -> Deploy room
    if ((await form()).focus !== 'Deploy room') fail.push(`D-pad up did not wrap round to Deploy room: focus ${(await form()).focus}`);
    await pad(0);
    try { await page.waitForFunction(w => SlagLab.snapshot()?.ready && SlagLab.snapshot().player.weapon === w, w1); }
    catch { fail.push('A on Deploy room did not deploy with the chosen weapon'); return fail; }
    if (await panel.isVisible()) fail.push('the dialog stayed open after deploying');
    await pad(9);                                                     // Start pauses the run
    await page.waitForFunction(() => game.scene.getScene('Hud').pauseOn);
    for (let n = 0; n < 12 && await page.evaluate(() => PAUSE_ITEMS[game.scene.getScene('Hud').pSel].id) !== 'controls'; n++) await pad(13);
    await pad(0);
    await panel.waitFor({ state: 'visible' });
    await pad(1);                                                     // B closes LAB CONTROLS and leaves the pause menu up
    await panel.waitFor({ state: 'hidden' });
    await page.waitForTimeout(120);
    const after = await page.evaluate(() => ({ pauseOn: game.scene.getScene('Hud').pauseOn, paused: SlagLab.snapshot()?.paused }));
    if (!after.pauseOn || !after.paused) fail.push(`B on LAB CONTROLS also left the pause menu: ${JSON.stringify(after)}`);
    return fail;
  });
  await check('Lab presets, combat, snapshots, clean reset and save isolation', async ctx => {
    const page = await open(ctx, ['lab']);
    return page.evaluate(() => checkLab());
  });
  }
  if (!labOnly && !sweepOnly && !campaignOnly) {
  await check('mid-run R and the pause menu ask before restarting or quitting', async ctx => {
    // Real key and pad input on the live game loop. Each key is held across a frame: keyboard.press() lands keydown
    // and keyup in one frame, and Phaser's Key.onUp clears _justDown before JustDown sees it.
    const page = await open(ctx, []);
    const fail = [];
    const wait = async (what, predicate, arg) => {
      try { await page.waitForFunction(predicate, arg); }
      catch (err) {
        const info = await page.evaluate(() => { const g = T.g(), h = game.scene.getScene('Hud'); return { title: game.scene.getScene('Title').sys.isActive(), state: g?.state, paused: g?.paused, pauseOn: h?.pauseOn, pSel: h?.pSel, pConfirm: h?.pConfirm, armed: h?.rArmLbl.visible }; });
        throw new Error(`${what}: ${JSON.stringify(info)} (${err.message.split('\n')[0]})`);
      }
    };
    const hold = async key => { await page.keyboard.down(key); await page.waitForTimeout(70); await page.keyboard.up(key); await page.waitForTimeout(60); };
    const pad = async button => {
      await page.evaluate(b => { window.__pad.buttons[b].value = 1; }, button); await page.waitForTimeout(70);
      await page.evaluate(b => { window.__pad.buttons[b].value = 0; }, button); await page.waitForTimeout(60);
    };
    const hud = () => page.evaluate(() => { const h = game.scene.getScene('Hud'); return { pSel: h.pSel, pConfirm: h.pConfirm, pauseOn: h.pauseOn, id: PAUSE_ITEMS[h.pSel].id }; });
    const sameRun = () => page.evaluate(() => T.g().stats === window.__run);
    const startCampaign = async () => {
      await page.evaluate(() => { const ts = game.scene.getScene('Title'); ts.showSub('campaign'); ts.subSel = 1; ts.subKey('ok'); });
      await wait('start a campaign', () => T.g()?.sys.isActive() && T.g().state === 'play' && !T.g().needReset);
      await page.evaluate(() => { T.g().hurtPlayer = () => false; window.__run = T.g().stats; });   // the stub outlives scene.restart()
    };
    const newRun = async what => {
      await wait(what, () => T.g().stats !== window.__run && T.g().state === 'play' && !T.g().needReset && !T.g().paused);
      await page.evaluate(() => { window.__run = T.g().stats; });
    };
    const pickRow = async id => {                                       // walk the pause list to a row with W / S
      for (let n = 0; n < PAUSE_ROWS && (await hud()).id !== id; n++) await hold((await hud()).pSel < await page.evaluate(i => PAUSE_ITEMS.findIndex(r => r.id === i), id) ? 's' : 'w');
      if ((await hud()).id !== id) throw new Error(`could not reach the ${id} row`);
    };
    const PAUSE_ROWS = await page.evaluate(() => PAUSE_ITEMS.length);
    await page.evaluate(() => {                                         // a standard-mapped pad, so B and Start can be pressed
      window.__pad = { connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ value: 0 })) };
      navigator.getGamepads = () => [window.__pad];
    });
    await startCampaign();

    // one R arms the prompt and keeps the run; it clears after RESTART_CONFIRM_MS; two R inside the window restart
    await hold('r');
    await wait('first R shows the prompt', () => game.scene.getScene('Hud').rArmLbl.visible);
    if (!await sameRun()) fail.push('the first R restarted the run');
    await wait('the prompt clears', () => !game.scene.getScene('Hud').rArmLbl.visible, null);
    if (!await sameRun()) fail.push('the run restarted when the R prompt ran out');
    await hold('r'); await hold('r');
    await newRun('two R presses restart');
    // pausing clears a pending R
    await hold('r');
    await wait('R armed before pausing', () => game.scene.getScene('Hud').rArmLbl.visible);
    await hold('Escape');
    await wait('Esc pauses', () => game.scene.getScene('Hud').pauseOn);
    if (await page.evaluate(() => T.g().restartArmUntil) !== 0) fail.push('pausing left the R prompt armed');
    await hold('Escape');
    await wait('Esc resumes', () => !game.scene.getScene('Hud').pauseOn && !T.g().paused);
    await hold('r');
    await wait('R after resuming only asks', () => game.scene.getScene('Hud').rArmLbl.visible);
    if (!await sameRun()) fail.push('R after resuming restarted at once: the pause did not clear the pending R');
    await wait('the prompt clears', () => !game.scene.getScene('Hud').rArmLbl.visible, null);

    // the pause menu: ends don't wrap, RESTART and QUIT ask once, and every way out of the ask keeps the game paused
    await hold('Escape');
    await wait('pause', () => game.scene.getScene('Hud').pauseOn);
    await hold('w');
    if ((await hud()).id !== 'resume') fail.push('W on RESUME moved the selection');
    await pickRow('quit');
    await hold('s');
    if ((await hud()).id !== 'quit') fail.push('S on QUIT TO TITLE moved the selection');
    await pickRow('restart');
    const asks = async how => {
      await hold('Enter');
      const h = await hud();
      if (h.pConfirm !== h.pSel || !h.pauseOn || !await sameRun()) fail.push(`the first RESTART pick did not ask (${how})`);
    };
    const cancelled = async how => {
      const h = await hud();
      if (h.pConfirm !== -1 || !h.pauseOn || !await page.evaluate(() => T.g().paused) || !await sameRun()) fail.push(`${how} did not cancel the RESTART ask and stay paused: ${JSON.stringify(h)}`);
    };
    await asks('before moving off'); await hold('s'); await cancelled('moving off'); await hold('w');
    await asks('before Esc'); await hold('Escape'); await cancelled('Esc');
    await asks('before B'); await pad(1); await cancelled('B');
    await asks('before Start'); await pad(9); await cancelled('Start');
    await asks('before the second pick'); await hold('Enter');
    await newRun('a second RESTART pick restarts');
    await hold('Escape');
    await wait('pause again', () => game.scene.getScene('Hud').pauseOn);
    await pickRow('quit');
    await hold('Enter');
    if ((await hud()).pConfirm !== (await hud()).pSel) fail.push('the first QUIT TO TITLE pick did not ask');
    if (await page.evaluate(() => game.scene.getScene('Title').sys.isActive())) fail.push('the first QUIT TO TITLE pick quit');
    await hold('Enter');
    await wait('a second QUIT pick reaches the title', () => game.scene.getScene('Title').sys.isActive());

    // R on the results screen still acts on the first press (the Lab's single-press R is in the Lab menu check)
    await startCampaign();
    await wait('the first squad', () => T.g().enemiesLeft > 0);        // a campaign spares the player while no foe is due
    await page.evaluate(() => { const g = T.g(); delete g.hurtPlayer; g.hurtPlayer(9999, g.player.x, { iframes: false }); });
    await wait('the results screen', () => T.g().overShown, null);
    await hold('r');
    await newRun('R on the results screen restarts at once');
    await page.evaluate(() => { delete T.g().hurtPlayer; });
    return fail;
  });
  await check('the pause menu hides a perk draft, blur pauses, and mute shows and is remembered', async ctx => {
    const page = await open(ctx, []);
    return page.evaluate(() => {
      const fails = [], expect = (ok, msg) => { if (!ok) fails.push(msg); };
      RUNMODE = 'endless'; T.boot(); T.run(300);
      const g = T.g(), hud = game.scene.getScene('Hud'), row = id => PAUSE_ITEMS.findIndex(r => r.id === id);
      BUS.emit('perks', PERKS.slice(0, 3).map(p => p.id)); T.run(50);
      expect(hud.perkOn && hud.perkTitle.visible, 'fixture: the perk draft did not show');
      g.pauseGame(); T.run(50);
      expect(hud.pauseOn && !hud.perkTitle.visible && !hud.perkCards.some(c => c.name.visible), 'the perk draft stayed visible under the pause menu');
      hud.pausePick(row('resume')); T.run(50);
      expect(!hud.pauseOn && hud.perkOn && hud.perkTitle.visible && hud.perkCards[0].name.visible, 'the perk draft did not come back after RESUME');
      hud.pickPerk(0); T.run(50);
      BUS.emit('wavecard', 'OVERTIME 2', 'TEST'); g.keys.TAB.isDown = true; T.run(100);   // hold Tab: the wheel opens
      expect(g.wheelOn && !hud.wcTitle.visible, 'the wave card showed through the open weapon wheel');
      g.keys.TAB.isDown = false; T.run(50);
      expect(hud.wcTitle.visible, 'the wave card did not come back when the wheel closed');
      window.dispatchEvent(new Event('blur')); T.run(50);
      expect(g.paused && hud.pauseOn, 'a window blur did not pause the run');
      hud.pausePick(row('resume')); T.run(50);
      const flash = OPTS.flash; OPTS.flash = 0; hud.flashA = 0; hud.onFlash(0.3);
      expect(Math.abs(hud.flashA - 0.075) < 1e-9, `a REDUCED flash came out at ${hud.flashA}`);
      OPTS.flash = flash;
      expect(!Sfx.muted, 'fixture: a fresh profile starts muted');
      g.keys.M.isDown = true; g.keys.M._justDown = true; T.run(17); g.keys.M.isDown = false;
      expect(Sfx.muted && localStorage.getItem('slaghouse.muted') === '1', 'M did not mute and remember it');
      T.run(17);
      expect(hud.lblMute.visible, 'the HUD showed no MUTED marker');
      g.pauseGame(); T.run(50);
      expect(hud.pItems[row('music')]._text === 'MUSIC: MUTED' && hud.pItems[row('sfx')]._text === 'SFX: MUTED', `the pause menu volume rows read ${hud.pItems[row('music')]._text} / ${hud.pItems[row('sfx')]._text}`);
      hud.pSel = row('music'); hud.pStep(row('music'), -1, false);
      expect(!Sfx.muted && localStorage.getItem('slaghouse.muted') === '0', 'changing a volume while muted did not unmute');
      return [...fails, ...T.errs];
    });
  });
  await check('weapon cards and the hint strip follow the last input device', async ctx => {
    const page = await open(ctx, []);
    return page.evaluate(() => {
      const fails = [];
      window.__pad = { connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ value: 0 })) };
      navigator.getGamepads = () => [window.__pad];
      const pad = () => { window.__pad.buttons[8].value = 1; T.run(50); window.__pad.buttons[8].value = 0; T.run(50); };   // Back: no action in a run
      RUNMODE = 'campaign'; T.boot(); T.run(300);
      const g = T.g(), hud = game.scene.getScene('Hud');
      g.issueWeapons(['shotgun']); T.run(50);
      const shown = () => `card '${hud.unlockCards[0].key._text}', hints '${hud.hint1._text.slice(0, 8)}'`;
      const want = (pad, what) => {
        const card = hud.unlockCards[0].key._text, hints = hud.hint1._text;
        if (pad ? card !== 'HOLD LB FOR WHEEL' || hints !== HINT_PAD1 : card !== '2 TO EQUIP' || hints !== HINT1) fails.push(`${what}: ${shown()}`);
      };
      want(false, 'before any pad input');
      pad(); want(true, 'after pad input');
      window.dispatchEvent(new MouseEvent('mousemove')); T.run(50); want(false, 'after moving the mouse');
      pad(); want(true, 'after pad input again');
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' })); T.run(50); want(false, 'after a key press');
      return [...fails, ...T.errs];
    });
  });
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
  await check('MOON BOOTS and LIGHTS OUT last through the Slag Rain hazards', async ctx => {
    const page = await open(ctx, ['checkpoint']);
    return (await page.evaluate(() => CP.mutatorHazards())).fails;
  });
  await check('Gravity Loss Linkers descend from all three ceiling pockets', async ctx => {
    const page = await open(ctx, ['checkpoint']);
    return (await page.evaluate(() => CP.linkerRecovery())).fails;
  });
  await check('every arena lets the player reach every standing cell and get back to the start', async ctx => {
    const page = await open(ctx, []);
    return page.evaluate(() => {
      const fails = [];
      // the player's graph, long drops and wall climbs included (#125): every standing cell reaches the start and back
      const graphs = [...ARENAS.map(A => [A.name, A.grid]), ...CAMPAIGN_ARENAS.filter((A, i) => A.grid !== ARENAS[i].grid).map(A => [A.name + ' (campaign)', A.grid])];
      for (const [name, grid] of graphs) {
        const nav = buildNav(grid), N = nav.nodes.length, fwd = nav.nodes.map(() => []), back = nav.nodes.map(() => []);
        nav.nodes.forEach((n, k) => n.edges.forEach(e => { fwd[k].push(e.to); back[e.to].push(k); }));
        const s = nav.id(4, 24);
        if (s < 0) { fails.push(`${name}: no standing cell at the start (4,24)`); continue; }
        const bfs = adj => { const seen = new Uint8Array(N); seen[s] = 1; const q = [s]; while (q.length) for (const t of adj[q.shift()]) if (!seen[t]) { seen[t] = 1; q.push(t); } return seen; };
        const f = bfs(fwd), b = bfs(back), cell = k => `(${nav.nodes[k].x},${nav.nodes[k].y})`;
        const away = [...Array(N).keys()].filter(k => !f[k]), stuck = [...Array(N).keys()].filter(k => !b[k]);
        if (away.length) fails.push(`${name}: ${away.length} cells can't be reached from the start, e.g. ${away.slice(0, 4).map(cell).join(' ')}`);
        if (stuck.length) fails.push(`${name}: ${stuck.length} cells have no way back to the start, e.g. ${stuck.slice(0, 4).map(cell).join(' ')}`);
      }
      return [...fails, ...T.errs];
    });
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
  await check('spills stop at a ledge, and electric hits light spilt water', async ctx => {
    const page = await open(ctx, ['props']);
    return page.evaluate(() => PR.spills());
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
  await check('ammo crate cook-offs and scenery blasts leave accuracy alone', async ctx => {
    const page = await open(ctx, ['props']);
    return page.evaluate(() => PR.accuracy());
  });
  await check('lifetime TIME counts OVERTIME runs that end by R or quit, once each', async ctx => {
    const page = await open(ctx, []);
    return page.evaluate(() => {
      const fails = [], stored = () => JSON.parse(localStorage.getItem('slaghouse.life') || '{}').time || 0;
      const near = (got, want, what) => { if (Math.abs(got - want) > 1) fails.push(`${what}: lifetime TIME went up ${got.toFixed(1)} s, want about ${want} s`); };
      RUNMODE = 'endless'; T.boot(); T.run(300);
      const g = T.g(), t0 = stored();
      g.hurtPlayer = () => false;                                       // the stub outlives scene.restart(), so the run stays alive
      T.run(11000); g.restartRun(); T.run(300);
      near(stored() - t0, 11.3, 'R mid-run');
      T.run(10000);
      game.events.emit('hidden'); T.run(500); game.events.emit('visible');
      near(stored() - t0, 21.6, 'hiding the tab');
      g.quitToTitle(); T.run(300);                                       // QUIT TO TITLE from the pause menu
      near(stored() - t0, 21.6, 'quit after hiding the tab');
      T.boot(); T.run(300);
      const g2 = T.g(), t1 = stored();
      delete g2.hurtPlayer; T.run(4000);
      g2.hurtPlayer(9999, g2.player.x, { iframes: false }); T.run(2000);
      if (!g2.overShown) fails.push('fixture: the run did not reach its results screen');
      g2.quitToTitle(); T.run(300);
      near(stored() - t1, 5.6, 'death, then quit from the results screen');
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
