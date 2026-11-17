// Play-test harness for slaghouse.html. Not part of the game; see dev/playtest/README.md.
// Load it into a running page (devtools console, or the preview tool's JS runner):
//   eval(await (await fetch('/dev/playtest/harness.js')).text());
// T.boot() starts a run with the game loop asleep; T.run(ms) steps it by hand on a virtual clock.
window.T = (() => {
  const game = window.game;
  const T = { game, errs: [], dmgLog: [] };
  let vnow = Date.now(), aim = null;
  T.start = () => { game.loop.sleep(); Date.now = () => vnow; };
  T.run = ms => {
    const n = Math.max(1, Math.round(ms / 16.667));
    const pointer = game.input.activePointer, project = pointer.positionToCamera;
    // Headless stepping can skip camera rendering. Feed the gameplay pointer world coordinates directly.
    if (aim) pointer.positionToCamera = (_camera, out) => out.set(aim.x, aim.y);
    try {
      for (let i = 0; i < n; i++) { vnow += 16.667; game.loop.now += 16.667; game.loop.time = game.loop.now; game.loop.delta = 16.667; game.step(game.loop.now, 16.667); }
    } finally { pointer.positionToCamera = project; aim = null; }
  };
  T.g = () => game.scene.getScene('Game');
  window.addEventListener('error', e => T.errs.push(String(e.message)));
  T.snap = (name) => new Promise(res => { game.renderer.snapshot(img => { fetch('http://127.0.0.1:8767/' + name, { method: 'POST', body: img.src }).then(() => res('ok')).catch(e => res('err ' + e)); }); });
  T.snapNow = async (name) => { const p = T.snap(name); T.run(17); return await p; };
  T.boot = () => { T.start(); const ts = game.scene.getScene('Title'); ts.scene.start('Game'); ts.scene.launch('Hud'); T.run(100); };
  T.setup = (arena, keepWaves) => {
    const gs = T.g(), index = arena === true ? 1 : arena || 0;
    const campaign = RUNMODE === 'campaign';
    const carry = index ? {
      hp: 100, weapon: 0, stats: { t0: 0, shots: 0, hits: 0, kills: 0, taken: 0, executes: 0, dodges: 0, wk: {} },
      style: { pts: 0, rank: 0, best: 0, lastWeapon: null }, headshots: 0, bestCombo: 0,
      totalEnemies: campaign ? CAMPAIGN_TOTAL : 50, wave: campaign ? CAMPAIGN_ACTS[index].first : 3,
      diff: OPTS.diff, mut: OPTS.mut,
    } : null;
    gs.scene.restart({ arena: index, carry });                      // explicit data keeps the previous arena and carry from leaking in
    T.run(50);
    const g = T.g(); g.pauseGame = () => {}; if (!keepWaves) g.startWave = () => {};
    const hp0 = g.hurtPlayer.bind(g); g.hurtPlayer = (d, x, o) => { const r = hp0(d, x, o); T.dmgLog.push(Math.round(d)); g.hp = 100; return r; };
    if (!keepWaves) { for (const e of g.enemies.getChildren()) if (e.alive) { e.alive = false; e.disableBody(true, true); if (e.glow) e.glow.setVisible(false); if (e.gun) e.gun.setVisible(false); } g.enemiesLeft = 99; }
    T.dmgLog = [];
    T.run(300);
    return g;
  };
  T.tp = (tx, ty) => { const g = T.g(); g.player.body.reset(tx * 16 + 8, (ty + 1) * 16 - 12); g.camX = g.player.x; g.camY = g.player.y; };
  T.aimAt = (x, y) => { T.g().aimMode = 'mouse'; aim = { x, y }; };
  T.trig = (on) => { const p = T.g().input.activePointer; p.isDown = on; p.buttons = on ? 1 : 0; };
  return T;
})();

function botFiringPosition(g, target, visited) {
  const { x: tx, y: ty } = target.body.center;
  let best = null, bestScore = Infinity;
  for (const { x, y } of NAV.nodes) {
    const key = y * MAP_W + x;
    if (visited.has(key) || g.grid[y][x] !== '.' || g.grid[y + 1][x] === '.' || g.solidAt(x * TS + 8, y * TS - 2)) continue;
    const px = x * TS + 8, py = (y + 1) * TS - 14;
    const distance = Math.hypot(tx - px, ty - py);
    if (distance < 30 || distance > 420 || !g.losHard(px, py, tx, ty)) continue;
    const sight = g.los(px, py, tx, ty);
    const front = (target.kind === 'bulwark' || target.kind === 'mirror') && Math.sign(px - tx) === target.dir;
    const score = Math.abs(distance - 95) + (sight ? 0 : 440) + (front ? 90 : 0);
    if (score < bestScore) { best = { x, y, key }; bestScore = score; }
  }
  return best;
}

// ---- simple bot: aims at the nearest foe, cycles all weapons, moves, jumps, kicks, dashes ----
T.bot = async (opts = {}) => {
  const maxS = opts.seconds || 600, log = [], seenKinds = new Set(), wUse = {};
  let t = 0, wT = 0, moveDir = 1, moveT = 0, lastArena = 0, lastWave = -1;
  const K = () => T.g().keys;
  while (t < maxS) {
    let g = T.g();
    if (!g || !g.sys.isActive()) { T.run(100); t += 0.1; continue; }
    if (!g._botGod) { g._botGod = true; g.pauseGame = () => {}; const hp0 = g.hurtPlayer.bind(g); g.hurtPlayer = (d, x, o) => { const r = hp0(d, x, o); if (g.hp < 40) g.hp = 100; return r; }; }
    if (g.A.id !== lastArena) { lastArena = g.A.id; log.push('arena ' + g.A.id + ' @' + t.toFixed(0) + 's'); }
    if (g.wave !== lastWave) { lastWave = g.wave; log.push('wave ' + (g.wave + 1) + ' @' + t.toFixed(0) + 's'); }
    if (g.state !== 'play') { log.push('state ' + g.state + ' @' + t.toFixed(0)); break; }
    if (g.perkOffer) { const id = g.perkOffer[Math.floor(Math.random() * g.perkOffer.length)]; log.push('perk ' + id); g.onPerkPick(id); }
    const st = g.routeGoal ? g.routeGoal() : g.campaign && g.campaignRoute && g.campaignRoute[0];
    if (st) {                                                        // the route's lift, valve or breaker: stand on it until it fires
      if (Math.abs(g.player.x - st.x) > 8 || Math.abs(g.player.body.bottom - st.y) > 6) { T.tp(Math.floor(st.x / 16), st.y / 16 - 1); log.push('route ' + st.label + ' @' + t.toFixed(0)); }
      const k = K(); k.A.isDown = k.D.isDown = false; T.trig(false);
      T.run(50); t += 0.05; continue;
    }
    const p = g.player;
    const hunt = g._botHunt?.player === p ? g._botHunt : (g._botHunt = { player: p, target: null, visited: new Set() });
    let best = null, bestScore = Infinity;
    for (const e of g.enemies.getChildren()) {
      if (!e.alive || e.under) continue;
      seenKinds.add(e.kind);
      const { x, y } = e.body.center;
      const score = Math.hypot(x - p.x, y - p.y) + (g.los(p.x, p.y - 2, x, y) ? 0 : 350) + (e.summoned ? 250 : 0);
      if (score < bestScore) { bestScore = score; best = e; }
    }
    if (hunt.position && hunt.target?.alive && !hunt.target.under) best = hunt.target;
    if (hunt.target !== best) {
      hunt.target = best; hunt.hp = best?.hp; hunt.since = g.time.now; hunt.position = null; hunt.visited.clear();
    }
    if (best && best.hp < hunt.hp) { hunt.hp = best.hp; hunt.since = g.time.now; }
    if (best && g.time.now - hunt.since >= 5000) {
      const spot = botFiringPosition(g, best, hunt.visited);
      hunt.since = g.time.now;
      if (spot) {
        T.tp(spot.x, spot.y); hunt.visited.add(spot.key); hunt.position = spot;
        log.push(`tp ${spot.x},${spot.y} for ${best.kind} @${t.toFixed(0)}`);
      } else { hunt.position = null; hunt.visited.clear(); }
    }
    if (hunt.position) {
      const preference = best.kind === 'sponge' ? ['arc', 'acid', 'rail'] : ['rail', 'nail'];
      const slot = preference.map(weaponSlot).find(i => g.weaponSlots.includes(i) && !g.locked.has(i));
      if (slot !== undefined) g.setWeapon(slot);
    } else if ((wT -= 0.05) <= 0) { wT = opts.wSecs || 3; g.cycleWeapon(1); }
    wUse[WEAPONS[g.weapon].id] = (wUse[WEAPONS[g.weapon].id] || 0) + 1;
    const k = K();
    const bd = best ? Math.hypot(best.body.center.x - p.x, best.body.center.y - p.y) : Infinity;
    if ((moveT -= 0.05) <= 0) { moveT = 0.6 + Math.random() * 1.2; moveDir = best ? (Math.sign(best.x - p.x) * (bd < 70 ? -1 : 1)) || 1 : (Math.random() < 0.5 ? -1 : 1); if (Math.random() < 0.25) moveDir = 0; }
    k.A.isDown = !hunt.position && moveDir < 0; k.D.isDown = !hunt.position && moveDir > 0;
    k.SPACE.isDown = !hunt.position && (Math.random() < 0.08 || p.body.blocked.left || p.body.blocked.right);
    if (best) {
      const b = best.body, shield = best.shieldUp && (best.kind === 'bulwark' || best.kind === 'mirror');
      T.aimAt(b.center.x, shield ? b.top + 2 : b.center.y);
      T.trig(!!hunt.position || Math.random() < 0.85);
      if (bd < 26 && Math.random() < 0.3) g.kickQueued = true;
    }
    else T.trig(false);
    T.run(50); t += 0.05;
    k.SPACE.isDown = false;
  }
  T.trig(false); const k = K(); k.A.isDown = k.D.isDown = false;
  return { log, seen: [...seenKinds].sort().join(','), wUse, errs: T.errs.slice(0, 5), t: +t.toFixed(0) };
};
