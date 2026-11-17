// Breakable scenery checks. Not part of the game; see dev/playtest/README.md. Needs harness.js.
// PR.check() goes through every arena's PROP_SPOTS and the Lab's Breakables Bay. Each prop must:
//   - be a kind in PROPS with art in PROP_ART, a texture holding every frame the art names, and the scene methods
//     its row names (hit, brk, live)
//   - sit where it can: a floor prop in an empty cell over something to stand on, a wall prop clear of solid tiles,
//     a hanging one with something overhead to hang from
//   - break with a few grunts about and run its whole effect to a wreck without an error, come back when the
//     wave restocks, and break again to a blast
// Each arena is checked the way the current RUNMODE stages it, and again in the other mode where the campaign builds it
// differently (ARENA 04 and 05 get extra steps in the campaign). The Lab's Breakables Bay, which has one of every kind,
// is checked last, with a grunt beside each of its floor props as well.
// PR.check([0]) checks only those arenas (0 = ARENA 01), PR.check(['lab']) only the Breakables Bay. Returns
// { fails: [...], props: n }; an empty list is a pass.
window.PR = (() => {
  const PR = {};
  const EFFECT_MS = 6000;
  const labRoom = room => {                                            // deploy a Lab room over whatever runs now, as SlagLab.load does from a live Lab
    T.g().scene.restart({ lab: labConfig(room), spawns: [] }); T.run(50);
    const g = T.g(); g.pauseGame = () => {};
    for (let t = 0; t < 3000 && (g.labTransition || g.needReset || g.labPending); t += 100) T.run(100);
    g.enemiesLeft = 99; T.run(300);
    return g;
  };

  PR.check = (only) => {
    const fails = [], arenas = only || [...ARENAS.map((_, i) => i), 'lab'], mode = RUNMODE, other = mode === 'campaign' ? 'endless' : 'campaign';
    const stages = arenas.flatMap(a => a === 'lab' ? [[a]] : CAMPAIGN_ARENAS[a].grid === ARENAS[a].grid ? [[a, mode]] : [[a, mode], [a, other]]);
    let count = 0;
    for (const kind of Object.keys(PROPS)) {
      const D = PROPS[kind], A = PROP_ART[kind], say = msg => fails.push(`${kind}: ${msg}`);
      if (!A) { say('no PROP_ART row'); continue; }
      if (!game.textures.exists('pr_' + kind)) { say(`no texture 'pr_${kind}'`); continue; }
      const tex = game.textures.get('pr_' + kind);
      for (const f of A.fr) if (!tex.has(f)) say(`frame '${f}' isn't in texture 'pr_${kind}'`);
      if (!A.fr.includes('x')) say('no wreck frame');
    }
    for (const [a, m] of stages) {
      const lab = a === 'lab';
      let g;
      if (lab) g = labRoom('breakables');
      else { RUNMODE = m; try { g = T.setup(a); } finally { RUNMODE = mode; } }
      const name = lab ? 'Lab ' + LAB_ROOMS.breakables.name : ARENAS[a].name + (m === 'campaign' ? ' (campaign)' : '');
      const spots = lab ? LAB_ROOMS.breakables.arena.props : PROP_SPOTS[a] || [];
      const step = (ms, what) => { try { T.run(ms); return true; } catch (err) { fails.push(`${name}: threw ${what}: ${String(err && err.message || err).split('\n')[0]}`); return false; } };
      T.errs.length = 0;
      if (g.props.length !== spots.length) fails.push(`${name}: ${g.props.length} props built for ${spots.length} spots`);
      for (const p of g.props) {
        const D = p.D, say = msg => fails.push(`${name} ${p.kind} at ${p.tx},${p.ty}: ${msg}`);
        count++;
        for (const m of [D.hit, D.brk, D.live]) if (m && typeof g[m] !== 'function') say(`'${m}' isn't a GameScene method`);
        if (D.mount === 'floor') {
          if (g.tileAt(p.tx, p.ty) !== '.') say('its cell is not empty');
          if (g.tileAt(p.tx, p.ty + 1) === '.') say('nothing under it');
        } else if (D.mount === 'wall') {
          for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]]) if (g.solidAt(p.cx + dx * p.hw, p.cy + dy * p.hh)) { say('overlaps a solid tile'); break; }
        } else if (!g.standAt(p.bx, p.ay - 2)) say('nothing overhead to hang from');
        if (p.st !== 'ok') say(`starts '${p.st}'`);
      }
      const beside = lab ? g.props.filter(p => p.D.mount === 'floor' && g.tileAt(p.tx + 1, p.ty) === '.' && g.tileAt(p.tx + 1, p.ty + 1) !== '.').map(p => [p.tx + 1, p.ty]) : [];
      const foes = [...(g.A.points.G || []).slice(0, 6), ...beside].map(([x, y]) => g.spawnEnemy('grunt', x, y));
      for (const e of foes) e.aggro = false;
      if (!step(300, 'settling')) continue;
      for (const p of g.props) { try { g.hitProp(p, 999, 'harness', p.cx, p.cy, 1, 0); } catch (err) { fails.push(`${name} ${p.kind}: hitProp threw: ${err.message}`); } }
      if (!step(EFFECT_MS, 'while props went off')) continue;
      for (const p of g.props) if (p.st !== 'x' && p.st !== 'gone') fails.push(`${name} ${p.kind}: still '${p.st}' ${EFFECT_MS} ms after breaking`);
      try { g.restockProps(); } catch (err) { fails.push(`${name}: restockProps threw: ${err.message}`); continue; }
      if (!step(200, 'after restocking')) continue;
      const back = g.props.filter(p => p.st === 'ok');
      for (const p of back) { try { g.explode(p.cx, p.cy + 2, TUNE.ROCKET); } catch (err) { fails.push(`${name} ${p.kind}: a blast on it threw: ${err.message}`); } if (!step(50, 'between blasts')) break; }
      if (!step(EFFECT_MS, 'while blasted props went off')) continue;
      for (const p of back) if (p.st === 'live') fails.push(`${name} ${p.kind}: still going off ${EFFECT_MS} ms after a blast`);
      for (const m of T.errs) fails.push(`${name}: error: ${m}`);
    }
    return { fails, props: count };
  };
  // Rounds the player never fired and scenery blasts must not count as hits: they'd lift run accuracy (#88).
  // Seeded so the cook-off plays out the same every run. On seed 158 a cook-off round used to send a gas canister
  // into the grunts, and its blast counted.
  PR.accuracy = () => {
    const fails = [];
    Math.random = seeded(158); Sfx.muted = true; game.loop.now = game.loop.time = 10000;
    RUNMODE = 'endless'; T.boot();
    const g = T.setup(0), crate = g.props.find(p => p.kind === 'ammo');
    g.props = [crate];
    const grunts = [-1, 0, 1, 2].map(dx => g.spawnEnemy('grunt', crate.tx + dx, crate.ty));
    for (const e of grunts) { e.aggro = false; e.hp = 5000; }
    T.run(200);
    const hp0 = grunts.reduce((n, e) => n + e.hp, 0), hits0 = g.stats.hits, shots0 = g.stats.shots;
    g.hitProp(crate, 999, 'kick', crate.cx, crate.cy, 1, 0);
    T.run(4000);
    if (crate.st === 'live' || crate.st === 'ok') fails.push(`the ammo crate is still '${crate.st}' 4 s after breaking`);
    if (grunts.reduce((n, e) => n + e.hp, 0) >= hp0) fails.push('fixture: the cook-off and its blast hurt none of the grunts beside the crate');
    if (g.stats.hits !== hits0 || g.stats.shots !== shots0) fails.push(`an ammo crate cooking off among foes added ${g.stats.hits - hits0} hits and ${g.stats.shots - shots0} shots`);
    const e = grunts[0], at = () => [e.body.center.x, e.body.center.y];
    g.explode(...at(), TUNE.BARREL);
    if (g.stats.hits !== hits0) fails.push('a drum blast counted as a hit');
    g.explode(...at(), TUNE.CANISTER);
    if (g.stats.hits !== hits0) fails.push('a gas canister blast counted as a hit');
    // a dead foe's wreck or tank going off isn't a shot either; the shot that killed it already counted (#144)
    for (const [what, W] of [['gunship wreck', TUNE.GUNSHIP.crash], ['torcher tank', TUNE.TORCHER.boom], ['pyro tank', TUNE.PYRO.tank], ['haywire jetpack', TUNE.JET.boom]]) {
      const h = g.stats.hits;
      g.explode(...at(), W);
      if (g.stats.hits !== h) fails.push(`a ${what} blast counted as a hit`);
    }
    const round = g.spawnBullet('nail', ...at(), 0, 400, 1, 1); round.free = true;
    g.onBulletHit(round, e);
    if (g.stats.hits !== hits0) fails.push('a free round counted as a hit');
    const shot = g.spawnBullet('nail', ...at(), 0, 400, 1, 1);           // the pool hands back the same bullet; it must be the player's again
    if (shot.free) fails.push('a reused bullet kept its free tag');
    g.onBulletHit(shot, e);
    g.explode(...at(), TUNE.ROCKET);
    if (g.stats.hits !== hits0 + 2) fails.push(`a player's bullet and rocket added ${g.stats.hits - hits0} hits, want 2`);
    return [...fails, ...T.errs];
  };
  // Spills stop at the end of the floor they land on (#89); electric shots and strikes light spilt water (#87).
  PR.spills = () => {
    const fails = [];
    RUNMODE = 'endless'; T.boot();
    const g = T.setup(0);
    g.props = [];
    const rows = g.grid.length, cols = g.grid[0].length;
    let edge = null;                                                    // the right end of a floor with a long drop beside it
    for (let ty = 3; ty < rows - 1 && !edge; ty++) for (let tx = 3; tx < cols - 3 && !edge; tx++) {
      const fy = ty * TS, ex = (tx + 1) * TS;
      if (g.standAt(ex - 3, fy + 1) && !g.solidAt(ex - 3, fy - 2) && !g.standAt(ex + 3, fy + 1) && !g.solidAt(ex + 3, fy - 2) &&
          !g.solidAt(ex + 3, fy - 24) && (g.floorBelow(ex + 3, fy + 2) ?? LH) > fy + 4 * TS) edge = { x: ex, fy };
    }
    if (!edge) return ['fixture: no ledge with a long drop in ARENA 01'];
    const cx = edge.x - 6;
    const stops = (P, what) => {
      if (!P) fails.push(`fixture: no ${what} was made`);
      else if (P.y === edge.fy && P.x + P.w / 2 > edge.x + 1) fails.push(`${what} reaches ${Math.round(P.x + P.w / 2 - edge.x)} px past the ledge at (${edge.x},${edge.fy})`);
    };
    g.spawnFirePatch(cx, edge.fy - 4); stops(g.puddles.at(-1), 'a fire patch');
    g.spawnTarPatch(cx, edge.fy - 4, 40); stops(g.tars.at(-1), 'a tar patch');
    g.spawnTarPatch(cx - 20, edge.fy - 4, 40); stops(g.tars.at(-1), 'a merged tar patch');
    g.spawnIce(cx, edge.fy - 4, 40); stops(g.ices.at(-1), 'an ice sheet');
    g.spawnIce(cx - 16, edge.fy - 4, 40); stops(g.ices.at(-1), 'a merged ice sheet');
    g.slagImpact(cx, edge.fy - 4, true); stops(g.puddles.at(-1), 'a slag puddle');
    const slug = g.spawnEnemy('slug', Math.floor(edge.x / TS) - 1, edge.fy / TS - 1); T.run(100);
    slug.body.reset(edge.x - 6, edge.fy - slug.body.halfHeight); g.killEnemy(slug, 1, 0, 'nail');
    const pools = g.acids.filter(A => A.y === edge.fy);
    if (!pools.length) fails.push('fixture: the slug left no pool on the ledge');
    for (const A of pools) stops(A, 'a slug acid pool');
    // electrified water: an Arc Caster beam into it, a shock orb popping on it, a Thundercloud strike over it
    g.puddles.length = 0; g.tars.length = 0; g.ices.length = 0; g.acids.length = 0;
    const fx = edge.x - 40;
    g.spawnWater(fx, edge.fy - 4, 50);
    const W = g.waters.at(-1);
    if (!W) return [...fails, 'fixture: no puddle'];
    const reset = () => { W.zap = 0; T.run(17); };
    g.player.body.reset(W.x, W.y - 13); T.run(50);
    reset(); g.fireArc(g.time.now, g.shoulder.x, g.shoulder.y, Math.PI / 2, false);
    if (!(W.zap > 0)) fails.push('an Arc Caster beam into a puddle did not electrify it');
    reset(); g.shockPop({ img: { destroy() {} }, glow: { destroy() {} } }, W.x, W.y - 4);
    if (!(W.zap > 0)) fails.push('a shock orb popping on a puddle did not electrify it');
    reset(); g.shockPop({ img: { destroy() {} }, glow: { destroy() {} } }, W.x, W.y - 90);
    if (W.zap > 0) fails.push('a shock orb popping 90 px above a puddle electrified it');
    reset();
    const cloud = g.spawnEnemy('thundercloud', Math.floor(W.x / TS), edge.fy / TS - 6); T.run(17);
    cloud.body.reset(W.x, W.y - 70); cloud.ai = 'charge'; cloud.aiUntil = g.time.now; T.run(17);
    if (!(W.zap > 0)) fails.push('a Thundercloud strike on a puddle did not electrify it');
    return [...fails, ...T.errs];
  };
  // Every weapon that hits drums hits props too (#86): each fires at a vending machine on its own and must hurt it.
  // The tractor beam and the scrap vacuum only move loose things, so they leave props alone on purpose. A prop hit
  // never counts toward accuracy.
  PR.weapons = () => {
    const fails = [];
    RUNMODE = 'endless'; T.boot();
    const range = { arc: 60, acid: 50, katana: 20, whip: 40, sonic: 50, pinball: 70, firework: 60, gauntlet: 34, hammer: 18, grav: 60 };
    const hold = { arc: 450, acid: 450, hammer: 850 };
    for (const [id, dist] of Object.entries(range)) {
      const g = T.setup(0), p = g.props.find(q => q.kind === 'vending');
      g.props = [p]; p.hp = 999;
      for (const k of [...g.barrelList, ...g.canisterList]) if (k.active) k.disableBody(true, true);   // no drum blast standing in for the weapon
      g.player.body.reset(p.cx - dist, (p.ty + 1) * TS - 12); g.facing = 1;
      g.setWeapon(weaponSlot(id)); T.run(250);
      const hits0 = g.stats.hits;
      const pointer = g.input.activePointer, original = pointer.positionToCamera;
      pointer.positionToCamera = (_camera, out) => out.set(p.cx, p.cy);
      g.aimMode = 'mouse';
      try {
        g.keys.J.isDown = true; T.run(hold[id] || 250); g.keys.J.isDown = false;
        for (let t = 0; t < 2500 && p.hp >= 999 && p.st === 'ok'; t += 50) T.run(50);
      } finally { g.keys.J.isDown = false; pointer.positionToCamera = original; }
      if (p.hp >= 999 && p.st === 'ok') fails.push(`${WEAPONS[weaponSlot(id)].name} fired at a vending machine ${dist} px away did nothing to it`);
      if (g.stats.hits !== hits0) fails.push(`${WEAPONS[weaponSlot(id)].name} hitting a vending machine counted ${g.stats.hits - hits0} hits; props aren't foes (#126)`);
    }
    return [...fails, ...T.errs];
  };
  PR.campaignContactDamage = () => {
    const fails = [];
    OPTS.diff = 1;
    RUNMODE = 'campaign';
    T.boot();

    const setup = (arena, wave) => {
      const g = T.setup(arena);
      delete g.hurtPlayer;
      g.wave = wave;
      g.applyMod(CAMPAIGN[wave].mod);
      g.hp = 100;
      return g;
    };

    const blackout = setup(0, 1);
    const tank = blackout.props.find(p => p.kind === 'water');
    blackout.hitProp(tank, 999, 'shot', tank.cx, tank.cy, 1, 0);
    const water = blackout.waters[0];
    blackout.player.body.reset(water.x, water.y - 12);
    blackout.electrifyWater(water.x, water.y, 20);
    T.run(1700);
    const waterDamage = 100 - blackout.hp;
    if (waterDamage <= 0 || waterDamage > 13) fails.push(`Blackout: took ${waterDamage.toFixed(1)} HP from 1.7 s in electrified water (expected up to three hits)`);

    const slagRain = setup(1, 2);
    const drum = slagRain.props.find(p => p.kind === 'oil');
    slagRain.props = [drum];
    slagRain.hitProp(drum, 999, 'shot', drum.cx, drum.cy, 1, 0);
    const oil = slagRain.tars[0];
    slagRain.igniteTar(oil);
    slagRain.spawnFirePatch(oil.x, oil.y - 4);
    slagRain.player.body.reset(oil.x, oil.y - 12);
    const beforeFire = slagRain.hp;
    T.run(1200);
    const oilDamage = beforeFire - slagRain.hp;
    if (oilDamage <= 0 || oilDamage > 19) fails.push(`Slag Rain: took ${oilDamage.toFixed(1)} HP from 1.2 s in overlapping oil and floor fire (expected up to three hits)`);

    const gravityLoss = setup(1, 3);
    const ladle = gravityLoss.props.find(p => p.kind === 'ladle');
    gravityLoss.props = [ladle];
    gravityLoss.hitProp(ladle, 999, 'shot', ladle.cx, ladle.cy, 1, 0);
    T.run(1950);
    const pool = gravityLoss.puddles.at(-1);
    const overlapping = gravityLoss.puddles.filter(p => Math.abs(p.x - pool.x) < p.w / 2 && p.y === pool.y);
    if (ladle.phase !== 'pour' || overlapping.length < 2) fails.push('Gravity Loss: fixture needs overlapping pools under an active ladle');
    gravityLoss.player.body.reset(pool.x, pool.y - 12);
    const before = gravityLoss.hp;
    T.run(900);
    const ladleDamage = before - gravityLoss.hp;
    if (ladleDamage <= 0 || ladleDamage > 23) fails.push(`Gravity Loss: took ${ladleDamage.toFixed(1)} HP from 0.9 s under a pouring ladle (expected up to three hits)`);
    return fails;
  };
  return PR;
})();
