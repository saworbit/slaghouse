// Breakable scenery checks. Not part of the game; see dev/playtest/README.md. Needs harness.js.
// PR.check() goes through every arena's PROP_SPOTS. Each prop must:
//   - be a kind in PROPS with art in PROP_ART, a texture holding every frame the art names, and the scene methods
//     its row names (hit, brk, live)
//   - sit where it can: a floor prop in an empty cell over something to stand on, a wall prop clear of solid tiles,
//     a hanging one with something overhead to hang from
//   - break with a few grunts about and run its whole effect to a wreck without an error, come back when the
//     wave restocks, and break again to a blast
// Each arena is checked the way the current RUNMODE stages it, and again in the other mode where the campaign builds it
// differently (ARENA 04 and 05 get extra steps in the campaign).
// PR.check([0]) checks only those arenas (0 = ARENA 01). Returns { fails: [...], props: n }; an empty list is a pass.
window.PR = (() => {
  const PR = {};
  const EFFECT_MS = 6000;

  PR.check = (only) => {
    const fails = [], arenas = only || ARENAS.map((_, i) => i), mode = RUNMODE, other = mode === 'campaign' ? 'endless' : 'campaign';
    const stages = arenas.flatMap(a => CAMPAIGN_ARENAS[a].grid === ARENAS[a].grid ? [[a, mode]] : [[a, mode], [a, other]]);
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
      RUNMODE = m;
      let g; try { g = T.setup(a); } finally { RUNMODE = mode; }
      const name = ARENAS[a].name + (m === 'campaign' ? ' (campaign)' : '');
      const step = (ms, what) => { try { T.run(ms); return true; } catch (err) { fails.push(`${name}: threw ${what}: ${String(err && err.message || err).split('\n')[0]}`); return false; } };
      T.errs.length = 0;
      if (g.props.length !== (PROP_SPOTS[a] || []).length) fails.push(`${name}: ${g.props.length} props built for ${(PROP_SPOTS[a] || []).length} spots`);
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
      const foes = (g.A.points.G || []).slice(0, 6).map(([x, y]) => g.spawnEnemy('grunt', x, y));
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
  return PR;
})();
