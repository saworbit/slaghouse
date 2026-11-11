// vibe metrics: per-wave time and damage taken by the (god-mode) bot, plus callout counts. Needs harness.js.
// VB.campaign() plays the campaign to the end (or maxSecs) and reports waves, kills, errors and step cost.
// With five or fewer foes left, one the bot can't see for 30 s straight (summoned helpers aside) is removed and
// counted in `removed`, so a stuck bot shows up as a number instead of a time-out.
window.VB = (() => {
  const VB = {};
  VB.campaign = async (maxSecs = 700) => {
    const r = game.renderer, rr = r.render; r.render = function () {};
    const callouts = {}; const onC = t => { callouts[t] = (callouts[t] || 0) + 1; }; BUS.on('callout', onC);
    const waves = [], removed = []; let cur = null, t = 0; const w0 = performance.now(), f0 = game.loop.frame;
    try {
      while (t < maxSecs) {
        const g = T.g();
        if (g && g.sys.isActive()) {
          if (!cur || cur.wave !== g.wave) { if (cur) { cur.secs = +(t - cur.t0).toFixed(0); cur.taken = Math.round(g.stats.taken - cur.taken0); waves.push(cur); } cur = { wave: g.wave, arena: g.A.id, t0: t, taken0: g.stats.taken }; }
          if (g.state === 'won' || g.state === 'dead') break;
        }
        await T.bot({ seconds: 5, wSecs: 2.5 }); t += 5;
        const h = T.g();
        if (h && h.sys.isActive() && h.state === 'play' && h.activeHostiles() <= 5) for (const e of h.enemies.getChildren()) {   // backstop: drop a foe hidden from the bot for 30 s
          if (!e.alive || e.under || e.summoned) { e._hidT = 0; continue; }   // summoned helpers (gnats, turrets) never hold up a squad
          e._hidT = h.los(h.player.x, h.player.y - 4, e.body.center.x, e.body.center.y) ? 0 : (e._hidT || 0) + 5;
          if (e._hidT > 30) { removed.push(`${e.kind} (${Math.floor(e.x / 16)},${Math.floor(e.y / 16)}) a${h.A.id} @${t}s`); h.killEnemy(e, 0, -1, 'harness'); }
        }
      }
      const g = T.g(); if (cur) { cur.secs = +(t - cur.t0).toFixed(0); cur.taken = Math.round(g.stats.taken - cur.taken0); waves.push(cur); }
      const frames = Math.max(1, Math.round(t * 60)), ms = performance.now() - w0;
      return { waves: waves.map(w => `w${w.wave + 1}/a${w.arena} ${w.secs}s dmg${w.taken}`), state: T.g().state, removed, kills: g.stats.kills, total: g.totalEnemies, totalTaken: Math.round(g.stats.taken),
               msPerFrame: +(ms / frames).toFixed(2), simFps: Math.round(frames / (ms / 1000)), callouts, errs: T.errs.slice(0, 5) };
    } finally { r.render = rr; BUS.off('callout', onC); }
  };
  return VB;
})();
