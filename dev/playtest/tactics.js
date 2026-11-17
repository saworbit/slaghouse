// Squad-tactics checks for slaghouse.html (the GameScene tactics section). Load harness.js first.
// AT.check() sets up small fights in ARENA 01 and checks that the foes do the clever things they should:
//   - the shared prediction lands a jump on the floor below it and stops a run at a wall, and shots lead a runner;
//   - a grunt climbs to you on a raised deck by the nav graph instead of pacing under it;
//   - drones take hover spots apart from each other, each with a line of sight to you;
//   - an enforcer lights the drum by your feet, a hard-hit one ducks into cover while a squadmate covers it,
//     and two that lose you split up: one checks where you went, the other watches the spot;
//   - barks show over their heads.
// It returns { fails, notes }: fails names each behaviour that didn't happen, notes says how each one went.
window.AT = (() => {
  const AT = {};
  const fresh = () => {
    const g = T.setup(0);
    g.runDiff = 1;                                                       // Normal: the drum trick needs Normal or Brutal
    return g;
  };
  const stand = (g, tx, ty) => { T.tp(tx, ty); g.player.body.setVelocity(0, 0); T.run(200); };
  const alert = (g, e) => { const pb = g.player.body; e.lkx = pb.center.x; e.lky = pb.center.y; e.lkT = g.time.now; e.lastSeenT = g.time.now; g.alertHumanoid(e, g.time.now, false); };
  let shown = 0;                                                         // barks that made it onto the screen
  const barks = g => {
    const seen = [], b0 = g.bark.bind(g);
    g.bark = (e, text, col) => { seen.push(text); const r = b0(e, text, col); if ((g.barkPool || []).some(o => o.on && o.who === e && o.t0 === g.time.now)) shown++; return r; };
    return seen;
  };

  AT.prediction = (fails, notes) => {
    const g = fresh(), pb = g.player.body;
    stand(g, 8, 24);
    g.player.body.reset(26 * 16, 19 * 16 + 8); pb.setVelocity(0, -120);   // in the air over the floor, heading right
    T.run(17); g.pvx = 100;
    const P = g.predictPlayer(1.2), floor = 25 * 16;
    if (Math.abs(P.y + pb.halfHeight - floor) > 3) fails.push(`a jump predicted 1.2 s on ends at feet y ${Math.round(P.y + pb.halfHeight)}, not on the floor at ${floor}`);
    if (!(P.x > pb.center.x + 60)) fails.push(`a jump heading right is predicted at x ${Math.round(P.x)} from ${Math.round(pb.center.x)}`);
    stand(g, 95, 24); g.pvx = 300;
    const W = g.predictPlayer(1);
    if (W.x > 98 * 16) fails.push(`a run into the right wall is predicted through it at x ${Math.round(W.x)}`);
    stand(g, 30, 24); g.pvx = 150;                                        // a runner below and to the right of a gunman, heading away
    const sx = 20 * 16, sy = 12 * 16, a = g.aimLead(sx, sy, 380), aimX = sx + (pb.center.y - sy) / Math.tan(a);
    if (!(aimX > pb.center.x + 4)) fails.push(`a shot at a runner heading away aims at x ${Math.round(aimX)}, not ahead of ${Math.round(pb.center.x)}`);
    notes.push(`jump lands at feet ${Math.round(P.y + pb.halfHeight)} (floor ${floor}); runner lead ${Math.round(aimX - pb.center.x)} px`);
  };

  AT.climb = (fails, notes) => {                                         // you on the girder deck over the floor; a grunt on the floor below
    const g = fresh(), pb = g.player.body;
    stand(g, 32, 16);
    const e = g.spawnEnemy('grunt', 24, 24); e.aggro = true; e.aggroT = 99;
    let reached = 0, routed = false;
    for (let i = 0; i < 720 && !reached; i++) {                          // 12 s
      e.aggroT = 99; routed = routed || !!e.walkNav;
      T.run(17);
      if (Math.abs(e.body.bottom - pb.bottom) < 6 && Math.abs(e.body.center.x - pb.center.x) < 48) reached = i;
    }
    if (!routed) fails.push('the grunt never took a route over the nav graph');
    if (!reached) fails.push(`the grunt never reached your deck (it ended at tile ${Math.floor(e.x / 16)},${Math.floor(e.body.bottom / 16)})`);
    else notes.push(`grunt climbed to you in ${(reached * 17 / 1000).toFixed(1)} s`);
  };

  AT.drones = (fails, notes) => {
    const g = fresh();
    stand(g, 47, 20);
    const ds = [[30, 10], [47, 6], [64, 10]].map(([x, y]) => { const d = g.spawnEnemy('drone', x, y); d.aggro = true; d.aggroT = 99; return d; });
    for (let i = 0; i < 240; i++) { for (const d of ds) d.aggroT = 99; T.run(17); }
    const p = g.player, pts = ds.map(d => ({ x: p.x + d.slotX, y: p.y + d.slotY }));
    if (ds.some(d => d.slotX === undefined)) { fails.push('a drone never picked a hover spot'); return; }
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) if (Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y) < 40) fails.push(`drones ${i} and ${j} share a hover spot`);
    for (const [i, q] of pts.entries()) if (!g.los(q.x, q.y, p.body.center.x, p.body.center.y - 4)) fails.push(`drone ${i}'s hover spot can't see you`);
    notes.push('drone spots ' + ds.map(d => `${d.slotX},${d.slotY}`).join(' '));
  };

  AT.drum = (fails, notes) => {                                          // you by the drum on the block, an enforcer further along: the drum between you
    const g = fresh(), seen = barks(g);
    g.kegT = 0;
    stand(g, 44, 20);
    const k = g.barrelList.find(o => o.active && Math.abs(o.x - (45 * 16 + 8)) < 4);
    if (!k) { fails.push('no drum at 45,20 in ARENA 01'); return; }
    const e = g.spawnEnemy('enforcer', 54, 20); T.run(50); alert(g, e);
    let lit = false;
    for (let i = 0; i < 40 && !lit; i++) { stand(g, 44, 20); lit = k.fuse > 0 || k.burning || !k.active; }   // 8 s
    if (!lit) fails.push(`the enforcer never lit the drum by your feet (its state ${e.ai}, drum hp ${k.hp})`);
    else if (!seen.includes('BARREL!')) fails.push('the drum went up but the enforcer never called it');
    notes.push(`drum ${lit ? 'lit' : 'untouched'}; barks ${[...new Set(seen)].join(', ') || 'none'}`);
  };

  AT.squad = (fails, notes) => {
    let g = fresh(), seen = barks(g);
    g.kegT = 1e12;                                                         // no drum tricks in this one
    stand(g, 60, 24);
    const a = g.spawnEnemy('enforcer', 66, 24), b = g.spawnEnemy('enforcer', 68, 24); T.run(50);
    alert(g, a); alert(g, b); T.run(400);
    for (let i = 0; i < 60 && !(a.ai === 'engage' && b.ai === 'engage' && b.sees); i++) { a.fireCd = b.fireCd = 9; T.run(17); }
    a.fireCd = 9; b.fireCd = 9; a.suppCd = 0;
    g.damageEnemy(a, 25, -1, 0, 'nail');
    let ducked = false, opened = false;
    for (let i = 0; i < 50; i++) { T.run(17); ducked = ducked || a.ai === 'cover'; opened = opened || b.ai === 'aim' || b.ai === 'burst'; }
    if (a.alive && !ducked) fails.push(`a hard-hit enforcer didn't duck into cover (its state ${a.ai})`);
    if (!seen.includes('COVER ME!')) fails.push('the hard-hit enforcer never asked its squadmate for cover');
    if (!opened) fails.push(`its squadmate didn't open up (state ${b.ai}, fire cooldown ${b.fireCd.toFixed(2)})`);
    g = fresh(); const heard = barks(g);
    stand(g, 47, 20);
    const c = g.spawnEnemy('enforcer', 34, 24), d = g.spawnEnemy('enforcer', 32, 24); T.run(50);   // open floor: 28-29 hold crates
    for (const o of [c, d]) { alert(g, o); o.ai = 'engage'; o.lkx = 47 * 16 + 8; o.lky = 20 * 16; o.lkT = g.time.now - 4000; o.lastSeenT = o.lkT; o.lvx = 120; o.fireCd = 9; }
    stand(g, 87, 12);                                                      // gone: out of their sight
    for (let i = 0; i < 30 && !(c.ai === 'search' && d.ai === 'search'); i++) T.run(17);
    const watching = [c, d].filter(o => o.watching).length;
    if (c.ai !== 'search' || d.ai !== 'search') fails.push(`two enforcers that lost you didn't both search (${c.ai}, ${d.ai})`);
    else if (watching !== 1) fails.push(`of two searching enforcers ${watching} watch the spot, not one`);
    notes.push(`squad barks ${[...new Set([...seen, ...heard])].join(', ') || 'none'}`);
  };

  AT.check = () => {
    const fails = [], notes = [];
    Math.random = seeded(7);                                               // the same fights every run
    RUNMODE = 'overtime'; T.boot(); T.run(300);
    for (const name of ['prediction', 'climb', 'drones', 'drum', 'squad']) {
      try { AT[name](fails, notes); } catch (err) { fails.push(`${name} threw: ${String(err && err.stack || err).split('\n').slice(0, 2).join(' | ')}`); }
    }
    if (!shown) fails.push('no bark was ever shown');
    notes.push(`${shown} barks shown`);
    return { fails: [...fails, ...T.errs], notes };
  };
  return AT;
})();
