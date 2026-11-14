// Build-to-build kind dumps (#147). Not part of the game; see dev/playtest/README.md. Needs harness.js.
// compare.mjs loads this into the working tree's page and into a git ref's page and diffs what KD.run returns.
// KD.run(kinds, states) goes through the kinds in the order given. For each one it records, as lists of short lines:
//   - spawn/<where>: every field the spawn set, the body, each attached image, any foes it brought along (wyrm
//     segments) and how many random draws it used, in the campaign, in OVERTIME and in a stationary Lab room
//   - draw/<marks>/<ai>/<variant>: syncVisuals run once for each AI state given, with the status marks off and on and
//     with plain and busy state fields: both graphics layers' command buffers, every image it holds, random draws
//   - kill/<how>: what killEnemy does straight away and over the next 2.5 s of the scene clock's timers, killed a
//     dozen ways: BUS events, timers, gib, light, blast, spawn, fx, shake and hit stop calls, random draws and the
//     state it leaves
// What makes it repeat between page loads: the loop clock is pinned before T.boot, sound is muted, Math.random is
// seeded before each spawn and each step, the scene clock is pinned after T.setup, Date.now follows the loop clock,
// and after a kill only the scene clock's timers fire (g.time.preUpdate and g.time.update), never full T.run steps.
// State still carries from one kind to the next, so both sides must get the same list in the same order.
window.KD = (() => {
  const KD = {};
  const r3 = v => typeof v === 'number' ? Math.round(v * 1000) / 1000 : v;
  const r1 = v => typeof v === 'number' ? Math.round(v * 10) / 10 : v;
  const hash = s => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; };
  const counted = seed => { const r = seeded(seed); const f = () => { f.n++; return r(); }; f.n = 0; return f; };
  const reseed = key => (Math.random = counted(hash(key)));             // seeded by the case's name, so adding a case moves no other
  const isImg = v => v && typeof v === 'object' && v.scene && (v.texture || v.commandBuffer);
  const img = o => o ? [o.texture && o.texture.key, o.frame && o.frame.name, o.x, o.y, o.rotation, o.scaleX, o.scaleY, o.alpha, o.flipX, o.flipY,
    o.visible, o.depth, o.tintTopLeft, o.originX, o.originY, o.blendMode].map(r3).join(',') : '-';
  const val = (v, depth = 0) => {
    if (v === null || v === undefined || typeof v !== 'object') return typeof v === 'function' ? 'fn' : JSON.stringify(r3(v));
    if (isImg(v)) return 'img(' + (v.commandBuffer ? 'graphics' : img(v)) + ')';
    if (v instanceof Set) return 'set' + v.size;
    if (v instanceof Map) return 'map' + v.size;
    if (Array.isArray(v)) return '[' + (depth > 1 ? v.length : v.map(x => val(x, depth + 1)).join(';')) + ']';
    if (depth > 1) return 'obj';
    return '{' + Object.keys(v).sort().map(k => k + ':' + val(v[k], depth + 1)).join(';') + '}';
  };
  const SKIP = new Set(['scene', 'body', 'def', 'displayList', 'parentContainer', 'anims', 'texture', 'frame', 'preFX', 'postFX', 'input', 'data',
    'renderNode', 'renderNodes', 'defaultRenderNodes', 'customRenderNodes', 'renderNodeData']);
  const fields = (e, tag = '') => {
    const b = e.body, out = Object.keys(e).filter(k => !SKIP.has(k) && !k.startsWith('_')).sort().map(k => `${tag}${k}=${val(e[k])}`);
    out.push(tag + 'body ' + [b.x, b.y, b.width, b.height, b.offset.x, b.offset.y, b.allowGravity, b.velocity.x, b.velocity.y, b.gravity.y,
      b.bounce.x, b.bounce.y, b.drag.x, b.immovable, b.enable].map(r3).join(','));
    out.push(tag + 'sprite ' + img(e), tag + 'def ' + (e.def === ENEMY[e.kind] ? 'its record' : val(e.def)));
    return out;
  };
  const buf = gr => { const s = JSON.stringify(gr.commandBuffer.map(r3)); return `${gr.commandBuffer.length} commands #${hash(s).toString(36)}`; };
  // wrap a method so each call is logged; the undo deletes the wrapper when the method lived on the prototype
  const wrap = (obj, name, tag, log) => {
    const f = obj[name], own = Object.prototype.hasOwnProperty.call(obj, name);
    const short = a => { try { return JSON.stringify(a.filter(x => typeof x !== 'function'), (k, v) => typeof v === 'number' ? r3(v) : v && typeof v === 'object' && v.body ? '<obj>' : v).slice(0, 160); } catch (err) { return '?'; } };
    obj[name] = function (...a) { log.push(`${tag} ${short(a)}`); return f.apply(this, a); };
    return () => { if (own) obj[name] = f; else delete obj[name]; };
  };
  const fresh = () => { game.loop.now = game.loop.time = 10000; Sfx.muted = true; };
  const stage = (mode = 'campaign') => { Math.random = seeded(7); fresh(); RUNMODE = mode; const g = T.setup(1); g.time.now = 40000; return g; };
  const guard = (fn) => { try { return fn(); } catch (err) { return ['threw ' + String(err && err.message || err).split('\n')[0]]; } };

  // every foe kind and every AI state the scene tests for, read from this build
  KD.kinds = () => Object.keys(ENEMY);
  KD.states = () => [...new Set([...String(GameScene).matchAll(/\.ai === '(\w+)'/g)].map(m => m[1]))].sort();

  const spawnCase = (kind, where) => guard(() => {
    const g = stage(where === 'endless' ? 'endless' : 'campaign');
    if (where === 'lab') g.lab = { stationary: true };
    const before = new Set(g.enemies.getChildren().filter(o => o.alive));
    reseed(`spawn ${kind} ${where}`);
    const e = g.spawnEnemy(kind, Math.floor(g.player.x / TS) + 4, Math.floor(g.player.y / TS) - 1);
    const out = [...fields(e), `random draws ${Math.random.n}`];
    let i = 0;
    for (const o of g.enemies.getChildren()) if (o !== e && o.alive && !before.has(o)) out.push(...fields(o, `${o.kind}#${i++} `));
    if (where === 'lab') g.lab = null;
    return out;
  });

  const drawCases = (kind, states, res) => {
    let g, e;
    try {
      g = stage();
      reseed(`draw ${kind}`);
      e = g.spawnEnemy(kind, g.player.x + 60, g.player.y - 10);
      g.updateEnemies(0.016, g.time.now);
      e.alive = true;
    } catch (err) { res['draw/setup'] = ['threw ' + String(err.message).split('\n')[0]]; return; }
    const base = { ai: e.ai, fr: e.fr, phase: e.phase };
    for (const marks of [0, 1]) for (const ai of ['base', ...states]) for (const variant of [0, 1]) {
      const key = `draw/${marks}/${ai}/${variant}`;
      res[key] = guard(() => {
        g.time.now = 50000; const now = g.time.now;
        e.ai = ai === 'base' ? base.ai : ai; e.aiUntil = now + 200; e.aimStart = now - 400;
        if (variant) Object.assign(e, { fr: ai === 'idle' ? 'puff' : 'crouch', phase: 3, owned: 1, healing: true, rage: true, charge: 3, lockT: 0.5, sees: true, souls: 2, slamming: true, shotT: 0.2, crash: true, chargeT: 0.5, spin: 0.5 });
        else Object.assign(e, { fr: base.fr, phase: base.phase, owned: 0, healing: false, rage: false, charge: 0, lockT: 0, sees: false, souls: 0, slamming: false, shotT: 0, crash: false, chargeT: 0, spin: 0 });
        Object.assign(e, { netT: marks, cook: marks * 0.5, cookOn: !!marks, bubbleUntil: marks ? now + 500 : 0, gravT: marks, stasisT: marks, rallyT: marks ? now + 500 : 0 });
        reseed(`${kind} ${key}`);
        g.syncVisuals();
        const out = [`arcG ${buf(g.arcG)}`, `laserG ${buf(g.laserG)}`, `sprite ${img(e)}`];
        for (const k of Object.keys(e).sort()) if (isImg(e[k]) && k !== 'scene') out.push(`${k} ${e[k].commandBuffer ? buf(e[k]) : img(e[k])}`);
        for (const o of g.enemies.getChildren()) if (o !== e && o.alive) out.push(`${o.kind} ${img(o)} glow ${img(o.glow)}`);
        out.push(`random draws ${Math.random.n}`);
        return out;
      });
    }
  };

  // how: the kill's source, plus anything set up first. hp is how far past zero the killing hit went.
  const KILLS = {
    bullet: {}, pellet: {}, rocket: {}, shatter: {}, tickboom: {}, crush: {}, kick: {}, execute: {},
    ripper: { prep: g => { g.hp = 50; } },
    overkill: { src: 'bullet', hp: -100 },
    headshot: { src: 'bullet', prep: (g, e) => { e.lastHs = true; } },
    elite: { src: 'bullet', skip: kind => NO_ELITE.has(kind) || ENEMY[kind].tiny, prep: (g, e) => g.makeElite(e, 'volatile') },
    burning: { src: 'bullet', prep: (g, e) => { e.burnT = 2; } },
    held: { src: 'bullet', prep: (g, e) => { e.grab = true; g.clawBy = e; e.carry = true; e.tankHitT = g.time.now - 100; e.ai = 'latched'; e.stolen = 0; g.locked.add(0); e.lastHs = true; } },
    oneLeft: { src: 'bullet', prep: g => { g.enemiesLeft = 2; } },
    waveClear: { src: 'bullet', prep: g => { g.enemiesLeft = 1; } },
    runWin: { src: 'bullet', prep: g => { g.enemiesLeft = 1; g.wave = Math.max(0, (g.mode.waves || 1) - 1); } },
  };
  const killCase = (kind, how) => guard(() => {
    const K = KILLS[how], log = [];
    const g = stage();
    reseed(`kill ${kind} ${how}`);
    const e = g.spawnEnemy(kind, g.player.x + 60, g.player.y - 10);
    if (K.prep) K.prep(g, e);
    g.updateEnemies(0.016, g.time.now);
    e.hp = K.hp ?? -5;
    const undo = [
      wrap(BUS, 'emit', 'bus', log), wrap(g.time, 'delayedCall', 'timer', log), wrap(g, 'spawnGib', 'gib', log), wrap(g, 'spawnLight', 'light', log),
      wrap(g, 'explode', 'blast', log), wrap(g, 'spawnEnemy', 'spawn', log), wrap(g.fx, 'emit', 'fx', log), wrap(g, 'dropOrbs', 'orbs', log),
      wrap(g, 'shake', 'shake', log), wrap(g, 'hitStop', 'hitstop', log),
    ];
    try {
      reseed(`kill ${kind} ${how} now`);
      try { g.killEnemy(e, 1, -0.5, K.src || how); } catch (err) { log.push('kill threw ' + String(err.message).split('\n')[0]); }
      log.push(`random draws ${Math.random.n}`);
      log.push('state ' + [g.state, g.zoomPunch, g.slowmoUntil, !!g.boss, g.enemiesLeft, g.totalEnemies, g.stats.kills, g.hp, g.style.pts, g.combo,
        g.clawBy === e, g.locks.length, g.souls.length, g.acids.length].map(r1).join(','));
      reseed(`kill ${kind} ${how} after`);
      try { for (let i = 0; i < 150; i++) { const t = game.loop.now += 16.667; g.time.preUpdate(t, 16.667); g.time.update(t, 16.667); } }
      catch (err) { log.push('timers threw ' + String(err.message).split('\n')[0]); }
    } finally { undo.forEach(f => f()); }
    log.push(`random draws after ${Math.random.n}`);
    log.push('after ' + [g.state, g.hp, g.enemiesLeft, g.totalEnemies, g.style.pts].map(r1).join(',') + ' alive ' +
      g.enemies.getChildren().filter(o => o.alive).map(o => `${o.kind}@${Math.round(o.x)},${Math.round(o.y)}`).join(' '));
    return log;
  });

  // kinds this build doesn't have come back as null; errors land in the case that threw, plus T.errs under 'errors'
  KD.run = (kinds = KD.kinds(), states = KD.states()) => {
    fresh(); RUNMODE = 'campaign'; T.boot();
    Date.now = () => 1.7e12 + game.loop.now;
    const out = {};
    for (const kind of kinds) {
      if (!ENEMY[kind]) { out[kind] = null; continue; }
      const res = {};
      T.errs.length = 0;
      for (const where of ['campaign', 'endless', 'lab']) res['spawn/' + where] = spawnCase(kind, where);
      drawCases(kind, states, res);
      for (const how of Object.keys(KILLS)) if (!KILLS[how].skip || !KILLS[how].skip(kind)) res['kill/' + how] = killCase(kind, how);
      if (T.errs.length) res.errors = T.errs.slice();
      out[kind] = res;
    }
    RUNMODE = 'campaign';
    return out;
  };
  return KD;
})();
