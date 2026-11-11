// Play-test harness for slaghouse.html. Not part of the game; see dev/playtest/README.md.
// Load it into a running page (devtools console, or the preview tool's JS runner):
//   eval(await (await fetch('/dev/playtest/harness.js')).text());
// T.boot() starts a run with the game loop asleep; T.run(ms) steps it by hand on a virtual clock.
window.T = (() => {
  const game = window.game;
  const T = { game, errs: [], dmgLog: [] };
  let vnow = Date.now();
  T.start = () => { game.loop.sleep(); Date.now = () => vnow; };
  T.run = (ms) => { const n = Math.max(1, Math.round(ms / 16.667)); for (let i = 0; i < n; i++) { vnow += 16.667; game.loop.now += 16.667; game.loop.time = game.loop.now; game.loop.delta = 16.667; game.step(game.loop.now, 16.667); } };
  T.g = () => game.scene.getScene('Game');
  window.addEventListener('error', e => T.errs.push(String(e.message)));
  T.snap = (name) => new Promise(res => { game.renderer.snapshot(img => { fetch('http://127.0.0.1:8767/' + name, { method: 'POST', body: img.src }).then(() => res('ok')).catch(e => res('err ' + e)); }); });
  T.snapNow = async (name) => { const p = T.snap(name); T.run(17); return await p; };
  T.boot = () => { T.start(); const ts = game.scene.getScene('Title'); ts.scene.start('Game'); ts.scene.launch('Hud'); T.run(100); };
  T.setup = (arena, keepWaves) => {
    const gs = T.g();
    // explicit data every time: a bare restart reuses the last run's arena and carry (arena 0 used to land there)
    gs.scene.restart(arena ? { arena: arena === true ? 1 : arena, carry: { hp: 100, weapon: 0, stats: { t0: 0, shots: 0, hits: 0, kills: 0, taken: 0, executes: 0, dodges: 0, wk: {} }, style: { pts: 0, rank: 0, best: 0, lastWeapon: null }, headshots: 0, bestCombo: 0, totalEnemies: 50, wave: 3 } } : { arena: 0, carry: null });
    T.run(50);
    const g = T.g(); g.pauseGame = () => {}; if (!keepWaves) g.startWave = () => {};
    const hp0 = g.hurtPlayer.bind(g); g.hurtPlayer = (d, x, o) => { const r = hp0(d, x, o); T.dmgLog.push(Math.round(d)); g.hp = 100; return r; };
    if (!keepWaves) { for (const e of g.enemies.getChildren()) if (e.alive) { e.alive = false; e.disableBody(true, true); if (e.glow) e.glow.setVisible(false); if (e.gun) e.gun.setVisible(false); } g.enemiesLeft = 99; }
    T.dmgLog = [];
    T.run(300);
    return g;
  };
  T.tp = (tx, ty) => { const g = T.g(); g.player.body.reset(tx * 16 + 8, (ty + 1) * 16 - 12); g.camX = g.player.x; g.camY = g.player.y; };
  T.aimAt = (x, y) => { const g = T.g(); g.aimMode = 'mouse'; const p = g.input.activePointer, cam = g.cameras.main; const v = cam.getWorldPoint ? null : null; p.x = (x - cam.worldView.x) * cam.zoom; p.y = (y - cam.worldView.y) * cam.zoom; p.worldX = x; p.worldY = y; };
  T.trig = (on) => { const p = T.g().input.activePointer; p.isDown = on; p.buttons = on ? 1 : 0; };
  return T;
})();
// ---- simple bot: aims at the nearest foe, cycles all weapons, moves, jumps, kicks, dashes ----
T.bot = async (opts = {}) => {
  const maxS = opts.seconds || 600, log = [], seenKinds = new Set(), wUse = {};
  let t = 0, wT = 0, wi = 0, moveDir = 1, moveT = 0, lastArena = 0, lastWave = -1;
  const K = () => T.g().keys;
  while (t < maxS) {
    let g = T.g();
    if (!g || !g.sys.isActive()) { T.run(100); t += 0.1; continue; }
    if (!g._botGod) { g._botGod = true; g.pauseGame = () => {}; const hp0 = g.hurtPlayer.bind(g); g.hurtPlayer = (d, x, o) => { const r = hp0(d, x, o); if (g.hp < 40) g.hp = 100; return r; }; }
    if (g.A.id !== lastArena) { lastArena = g.A.id; log.push('arena ' + g.A.id + ' @' + t.toFixed(0) + 's'); }
    if (g.wave !== lastWave) { lastWave = g.wave; log.push('wave ' + (g.wave + 1) + ' @' + t.toFixed(0) + 's'); }
    if (g.state !== 'play') { log.push('state ' + g.state + ' @' + t.toFixed(0)); break; }
    if (g.perkOffer) { const id = g.perkOffer[Math.floor(Math.random() * g.perkOffer.length)]; log.push('perk ' + id); g.onPerkPick(id); }
    const p = g.player; let best = null, bd = 1e9;
    for (const e of g.enemies.getChildren()) { if (!e.alive || e.under) continue; seenKinds.add(e.kind); const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < bd) { bd = d; best = e; } }
    if ((wT -= 0.05) <= 0) { wT = opts.wSecs || 3; wi = (wi + 1) % WEAPONS.length; g.setWeapon(wi); }
    wUse[WEAPONS[g.weapon].id] = (wUse[WEAPONS[g.weapon].id] || 0) + 1;
    const k = K();
    if ((moveT -= 0.05) <= 0) { moveT = 0.6 + Math.random() * 1.2; moveDir = best ? (Math.sign(best.x - p.x) * (bd < 70 ? -1 : 1)) || 1 : (Math.random() < 0.5 ? -1 : 1); if (Math.random() < 0.25) moveDir = 0; }
    k.A.isDown = moveDir < 0; k.D.isDown = moveDir > 0;
    k.SPACE.isDown = Math.random() < 0.08 || (p.body.blocked.left || p.body.blocked.right);
    g._farT = (best && (bd > 170 || !g.los(p.x, p.y - 4, best.body.center.x, best.body.center.y)) ? (g._farT || 0) + 0.05 : 0);
    if (best && g._farT > 5) {                                       // stuck far away: hop next to the nearest foe (open tile with floor)
      g._farT = 0; const bx = Math.floor(best.x / 16), by = Math.floor(best.y / 16);
      outer: for (let r = 3; r < 14; r++) for (const dx of [-r, r]) for (let dy = -4; dy <= 6; dy++) {
        const tx = bx + dx, ty = by + dy; if (tx < 2 || tx > 97 || ty < 2 || ty > 24) continue;
        if (g.grid[ty][tx] === '.' && g.grid[ty - 1][tx] === '.' && g.grid[ty + 1] && g.grid[ty + 1][tx] !== '.') { T.tp(tx, ty); log.push('tp ' + tx + ',' + ty + ' @' + t.toFixed(0)); break outer; }
      }
    }
    if (best) { T.aimAt(best.body.center.x, best.body.center.y); T.trig(Math.random() < 0.85); if (bd < 26 && Math.random() < 0.3) g.kickQueued = true; }
    else T.trig(false);
    T.run(50); t += 0.05;
    k.SPACE.isDown = false;
  }
  T.trig(false); const k = K(); k.A.isDown = k.D.isDown = false;
  return { log, seen: [...seenKinds].sort().join(','), wUse, errs: T.errs.slice(0, 5), t: +t.toFixed(0) };
};
