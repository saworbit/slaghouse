// red-team chaos harness: needs harness.js (window.T) loaded first. Not part of the game.
window.CH = (() => {
  const CH = {};
  const LISTS = ['fireworks', 'stars', 'splits', 'discs', 'spores', 'souls', 'horbs', 'emines', 'bubbles', 'globs', 'nukes', 'seeds', 'pspores',
    'trips', 'bwalls', 'gluePuds', 'puddles', 'clouds', 'ragdolls', 'slashFx', 'allies', 'stasisFields', 'pylonZaps', 'shrooms', 'ices', 'horns', 'tethered', 'souls'];
  const STATIC = new Set(['pylon', 'sporepod', 'turret', 'mimic', 'burrower', 'wyrmseg', 'claw', 'hive']);
  CH.kinds = () => Object.keys(ENEMY).filter(k => !['wyrmseg', 'slagmid', 'slagbit', 'boss', 'foreman', 'jugg', 'gunship', 'wyrm', 'gnat', 'turret'].includes(k));
  // check invariants; returns a list of problems
  CH.check = (g, tag) => {
    const out = [];
    const p = g.player;
    if (!isFinite(p.x) || !isFinite(p.y) || !isFinite(g.hp)) out.push(tag + ' player NaN ' + [p.x, p.y, g.hp]);
    for (const e of g.enemies.getChildren()) {
      if (!e.alive) continue;
      if (!isFinite(e.x) || !isFinite(e.y)) out.push(tag + ' NaN pos ' + e.kind);
      else if (e.x < -40 || e.x > LW + 40 || e.y < -80 || e.y > LH + 80) out.push(tag + ' out of world ' + e.kind + ' ' + Math.round(e.x) + ',' + Math.round(e.y) + ' ai ' + e.ai);
      if (!isFinite(e.hp)) out.push(tag + ' NaN hp ' + e.kind);
      if (e.hp > e.def.hp * 1.02 + 1) out.push(tag + ' overheal ' + e.kind + ' ' + Math.round(e.hp) + '/' + Math.round(e.def.hp));
      const fl = FLIERS.has(e.kind) || e.def.noClip;
      if (!fl && !e.body.allowGravity && !(e.stasisT > 0) && !(e.gravT > 0) && !e.gravSlam && e.ai !== 'cling' && !e.under && e.kind !== 'claw' && e.kind !== 'wyrm' && e.kind !== 'para') {
        e._ngT = (e._ngT || 0) + 1; if (e._ngT === 120) out.push(tag + ' gravity stuck off ' + e.kind + ' ai ' + e.ai);
      } else e._ngT = 0;
    }
    for (const k of LISTS) { const a = g[k]; if (Array.isArray(a) && a.length > 400) out.push(tag + ' list ' + k + ' = ' + a.length); }
    return out;
  };
  // throw every kind at an arena in batches while the bot cycles every gun
  CH.arenaStorm = async (arena, secs = 60, batch = 9) => {
    const g = T.setup(arena); const probs = []; const kinds = CH.kinds().sort(() => Math.random() - 0.5);
    const r = game.renderer, rr = r.render; r.render = function () {};
    const pos = new Map(); let t = 0, ki = 0;
    try {
      while (t < secs) {
        const alive = g.enemies.getChildren().filter(e => e.alive).length;
        if (alive < batch && ki < kinds.length * 3) {
          const kind = kinds[ki++ % kinds.length], pts = g.A.points[FLIERS.has(kind) ? 'A' : 'G'], pt = pts[Math.floor(Math.random() * pts.length)];
          try { const e = g.spawnEnemy(kind, pt[0], pt[1]); e.aggro = true; } catch (err) { probs.push('spawn ' + kind + ': ' + err.message); }
        }
        const res = await T.bot({ seconds: 1, wSecs: 0.5 }); t += 1;
        if (res.errs.length) { probs.push(...res.errs.map(x => 'err ' + x)); T.errs.length = 0; }
        probs.push(...CH.check(g, 'a' + arena + ' t' + t));
        for (const e of g.enemies.getChildren()) {                       // stuck: aggro, not static, hasn't moved 3 px in 25 s
          if (!e.alive || STATIC.has(e.kind)) continue;
          const q = pos.get(e) || { x: e.x, y: e.y, t }; if (Math.hypot(e.x - q.x, e.y - q.y) > 3) pos.set(e, { x: e.x, y: e.y, t }); else { pos.set(e, q); if (t - q.t === 25 && e.aggro) probs.push('a' + arena + ' stuck 25s ' + e.kind + ' ai ' + e.ai + ' @' + Math.round(e.x) + ',' + Math.round(e.y)); }
        }
        if (g.state !== 'play') { g.state = 'play'; g.hp = 100; }
      }
    } finally { r.render = rr; }
    return [...new Set(probs)];
  };
  return CH;
})();
