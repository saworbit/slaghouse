// Per-wave time and damage taken by the campaign controller. Needs harness.js and campaign-bot.js.
// VB.campaign() plays the campaign to the end (or maxSecs) and reports waves, kills, errors and step cost.
window.VB = (() => {
  const VB = {};
  VB.campaign = async (maxSecs = 700) => {
    const r = game.renderer, rr = r.render; r.render = function () {};
    const callouts = {}; const onC = t => { callouts[t] = (callouts[t] || 0) + 1; }; BUS.on('callout', onC);
    const describe = e => `${e.kind} (${Math.floor(e.x / TS)},${Math.floor(e.y / TS)}) ${e.ai}, ${Math.ceil(e.hp)} HP`;
    // When the player last had line of sight to each foe, so a stall can say which foes the bot couldn't see
    let sight = new Map(), sightGroup = null, frame = 0;
    const watch = g => {
      if (g.enemies !== sightGroup) { sight = new Map(); sightGroup = g.enemies; }
      const px = g.player.x, py = g.player.y - 2;
      for (const e of g.enemies.getChildren()) {
        if (!e.alive) { sight.delete(e); continue; }
        if (!sight.has(e)) sight.set(e, { since: t, seen: null });
        if (g.los(px, py, e.x, e.y)) sight.get(e).seen = t;
      }
    };
    const sighted = (g, e) => {
      if (g.los(g.player.x, g.player.y - 2, e.x, e.y)) return 'in sight';
      const s = sight.get(e);
      return s ? `hidden ${Math.round(t - (s.seen ?? s.since))}s${s.seen === null ? ' (never seen)' : ''}` : 'hidden';
    };
    const leftBehind = [];
    let lift = null, bossCleanup = [], bossFell = null, swept = false;
    const waves = [], drive = campaignBot(); let cur = null, control = null, t = 0, minHp = TUNE.PLAYER_HP; const w0 = performance.now();
    try {
      while (t < maxSecs) {
        const g = T.g();
        if (g && g.sys.isActive()) {
          if (!g.campaign || g._botGod || Object.hasOwn(g, 'hurtPlayer')) throw new Error('Start a fresh, unassisted campaign before running the controller.');
          minHp = Math.min(minHp, g.hp);
          if (!cur || cur.wave !== g.wave) { if (cur) { cur.secs = +(t - cur.t0).toFixed(0); cur.taken = Math.round(g.stats.taken - cur.taken0); waves.push(cur); } cur = { wave: g.wave, arena: g.A.id, t0: t, taken0: g.stats.taken }; }
          if (g.state === 'won' || g.state === 'dead') break;
          control = drive(g);
          if (frame++ % 10 === 0) watch(g);
          if (g.descending) lift = { arena: g.A.id, group: g.enemies, foes: g.enemies.getChildren().filter(e => e.alive) };
        }
        const boss = g?.boss;
        T.run(17); t += 1 / 60;
        if (lift && T.g().enemies !== lift.group) {
          for (const e of lift.foes) if (e.alive) leftBehind.push(`Act ${lift.arena}: ${describe(e)}`);
          lift = null;
        }
        if (boss && !boss.alive && boss.kind === 'boss') bossFell = t;
        // its death sequence pops everything it spawned within 0.7 s; a second on, none may be left
        if (bossFell !== null && !swept && t - bossFell >= 1) { swept = true; bossCleanup = T.g().enemies.getChildren().filter(e => e.alive && e.summoned).map(describe); }
      }
      const g = T.g(); if (cur) { cur.secs = +(t - cur.t0).toFixed(0); cur.taken = Math.round(g.stats.taken - cur.taken0); waves.push(cur); }
      const frames = Math.max(1, Math.round(t * 60)), ms = performance.now() - w0;
      const remaining = g.enemies.getChildren().filter(e => e.alive).map(e => `${describe(e)}, ${sighted(g, e)}`);
      const route = g.campaignRoute?.[0];
      const campaign = { operation: g.wave + 1, arena: g.A.id, reserve: g.campaignReserve, reinforceIn: g.campaignReinforceAt ? Math.round(g.campaignReinforceAt - g.time.now) : null,
        squads: (g.campaignSquads || []).map(sq => `${sq.name || 'squad'} x${sq.spawns.length}`), route: route ? `${route.label || (route.hold ? 'valve' : 'lift')} (${Math.floor(route.x / TS)},${Math.floor(route.y / TS) - 1})` : null };
      return { waves: waves.map(w => `w${w.wave + 1}/a${w.arena} ${w.secs}s dmg${w.taken}`), state: g.state, difficulty: DIFFS[g.runDiff].name, remaining, campaign, leftBehind, bossCleanup, control, hp: g.hp, minHp, killer: g.killer,
               pending: g.enemiesLeft, kills: g.stats.kills, total: g.totalEnemies, totalTaken: Math.round(g.stats.taken),
               msPerFrame: +(ms / frames).toFixed(2), simFps: Math.round(frames / (ms / 1000)), callouts, errs: T.errs.slice(0, 5) };
    } finally {
      T.trig(false);
      for (const key of ['A', 'D', 'S', 'SPACE']) if (T.g().keys?.[key]) T.g().keys[key].isDown = false;
      r.render = rr; BUS.off('callout', onC);
    }
  };
  return VB;
})();
