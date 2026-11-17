// Enemy kind checks (#52). Not part of the game; see dev/playtest/README.md. Needs harness.js.
// KC.check() goes through every kind in ENEMY. Each one is warped in on its own, in a fresh ARENA 01 stage, the way
// a wave brings it in. It must:
//   - have a CODEX row (body parts of another foe aside) and a texture holding its start frame and codex frame
//   - name an update method the scene has (its per-frame brain), and if it names setup, visuals, death, armour or
//     contact, a method the scene has too, with marks left out, 'net' or 'none'
//   - carry the right type for each value killEnemy reads off the record, and ragdoll: true exactly when RAG has
//     ragdoll art for it
//   - spawn on its start frame
//   - run for a while beside the player, take a hit, die and clear away without an error
// KC.check(['wasp', 'tick']) checks only those. Returns { fails: [...], kinds: n }; an empty list is a pass.
window.KC = (() => {
  const KC = {};
  const PARTS = { wyrmseg: 'wyrm', slagmid: 'slagling', slagbit: 'slagling' };   // pieces of another foe: the codex row is the parent's
  const RUN_MS = 1500, DEAD_MS = 1200;

  KC.check = (only) => {
    const fails = [], kinds = only || Object.keys(ENEMY), codex = new Map(CODEX.map(r => [r[0], r]));
    for (const kind of kinds) {
      const D = ENEMY[kind], say = msg => fails.push(`${kind}: ${msg}`);
      if (!D) { say('not in ENEMY'); continue; }
      const row = codex.get(kind);
      if (!row && !PARTS[kind]) say('no CODEX row');
      if (!game.textures.exists(D.key)) { say(`no texture '${D.key}'`); continue; }
      const tex = game.textures.get(D.key);
      if (!tex.has(D.frame0)) say(`start frame '${D.frame0}' isn't in texture '${D.key}'`);
      if (row && !tex.has(row[2])) say(`codex frame '${row[2]}' isn't in texture '${D.key}'`);

      const g = T.setup(1);
      if (typeof g[D.update] !== 'function') { say(`update '${D.update}' isn't a GameScene method`); continue; }
      const missing = ['setup', 'visuals', 'death', 'armour', 'contact'].filter(f => D[f] !== undefined && typeof g[D[f]] !== 'function');
      if (missing.length) { for (const f of missing) say(`${f} '${D[f]}' isn't a GameScene method`); continue; }
      if (D.marks !== undefined && D.marks !== 'net' && D.marks !== 'none') say(`marks '${D.marks}' should be left out, 'net' or 'none'`);
      // the values killEnemy reads off the record (#145)
      const show = v => JSON.stringify(v);
      for (const f of ['ragdoll', 'haywire', 'noAirStyle', 'noGibs', 'burstSparks', 'burstFire', 'skipOneLeft']) if (D[f] !== undefined && D[f] !== true) say(`${f} should be true or left out, got ${show(D[f])}`);
      for (const f of ['killZoom', 'killStop', 'gibPower', 'gibSpread', 'winDelay']) if (D[f] !== undefined && !(typeof D[f] === 'number' && D[f] > 0)) say(`${f} should be a number above 0, got ${show(D[f])}`);
      if (D.killShake !== undefined && !(Array.isArray(D.killShake) && D.killShake.length === 2 && D.killShake.every(v => typeof v === 'number' && v > 0))) say(`killShake should be [ms, intensity], got ${show(D.killShake)}`);
      if (D.deathFlash !== undefined && !(Array.isArray(D.deathFlash) && D.deathFlash.length && D.deathFlash.every(c => Number.isInteger(c) && c >= 0 && c <= 0xffffff))) say(`deathFlash should be a list of colours, got ${show(D.deathFlash)}`);
      if (D.dropGun !== undefined && !(typeof D.dropGun === 'string' && game.textures.exists(D.dropGun))) say(`dropGun ${show(D.dropGun)} isn't a texture`);
      if (!!D.ragdoll !== !!RAG[kind]) say(D.ragdoll ? 'ragdoll is set but RAG has no ragdoll art for it' : 'RAG has ragdoll art for it but its record has no ragdoll: true');
      T.errs.length = 0;
      const air = FLIERS.has(kind), px = g.player.x, py = g.player.y;
      // the nearest spawn point of its type that isn't on top of the player, so it meets the player straight away
      const near = (g.A.points[air ? 'A' : 'G'] || []).map(p => ({ p, d: Math.hypot(p[0] * TS + 8 - px, p[1] * TS - py) }))
        .filter(o => o.d > 64).sort((a, b) => a.d - b.d)[0];
      if (!near) { say(`ARENA 01 has no ${air ? 'air' : 'ground'} spawn point to warp it in at`); continue; }
      const pt = near.p;
      let e = null, frame = null;
      const spawn = g.spawnEnemy;
      g.spawnEnemy = function (k, cx, cy) { const o = spawn.call(this, k, cx, cy); if (k === kind && !e) { e = o; frame = o.frame.name; } return o; };
      const step = (ms, what) => { try { T.run(ms); return true; } catch (err) { say(`threw ${what}: ${String(err && err.message || err).split('\n')[0]}`); return false; } };
      try {
        try { g.warpIn(kind, pt, air); } catch (err) { say('warpIn threw: ' + err.message); continue; }
        if (!step(kind === 'boss' ? 1700 : 1100, 'while warping in')) continue;
      } finally { delete g.spawnEnemy; }                                // the scene object outlives the restart; give it its own method back
      if (!e) { say('never spawned'); continue; }
      if (frame !== D.frame0) say(`spawned on frame '${frame}', its start frame is '${D.frame0}'`);
      if (!step(RUN_MS, 'while running')) continue;
      if (e.alive) {
        try { g.damageEnemy(e, 1, 0, 0, 'harness'); } catch (err) { say('damageEnemy threw: ' + err.message); }
        if (!step(100, 'after a hit')) continue;
      }
      if (e.alive) {
        try { g.killEnemy(e, 0, -1, 'harness'); } catch (err) { say('killEnemy threw: ' + err.message); }
        if (!step(DEAD_MS, 'after dying')) continue;
        if (e.alive) say('still alive after killEnemy');
      }
      for (const m of T.errs) say('error: ' + m);
    }
    return { fails, kinds: kinds.length };
  };
  return KC;
})();
