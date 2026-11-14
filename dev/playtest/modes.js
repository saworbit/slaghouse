// Run mode checks (#128). Not part of the game; see dev/playtest/README.md. Needs harness.js.
// RMC.check() plays every RUN_MODES record from the title: a few seconds, one restart, a death to reach the results
// screen, then Quit to Title. For each mode it checks that the scene runs as that mode and reports its wave total,
// that lifetime runs and time played move only when the record says the mode counts toward lifetime stats, and that
// the results screen writes the record's own localStorage key and no other. The Lab goes in through SlagLab. The
// table itself is checked against SPEC below, so a record key can't move without this failing, and every record must
// carry each rule the scene asks it for.
// Returns { fails: [...] }; an empty list is a pass. It writes slaghouse.* keys, so use a throwaway profile.
window.RMC = (() => {
  const RMC = {};
  const life = () => { try { return JSON.parse(localStorage.getItem('slaghouse.life') || '{}'); } catch (err) { return {}; } };
  const records = () => Object.fromEntries(Object.values(RUN_MODES).filter(m => m.record).map(m => [m.record, localStorage.getItem(m.record)]));

  // Pinned here, apart from the game: a record key is where players' saved bests live, so it must never move.
  const SPEC = {
    campaign: { record: 'slaghouse.best', lifetime: true, waves: () => CAMPAIGN.length },
    endless: { record: 'slaghouse.bestEndless', lifetime: true, waves: () => 0 },
    daily: { record: 'slaghouse.daily', lifetime: true, waves: () => 0 },
    bossrush: { record: 'slaghouse.bestRush', lifetime: true, waves: () => RUSH.length },
    lab: { record: null, lifetime: false, waves: () => 0 },
  };

  RMC.check = () => {
    const fails = [];
    for (const id of new Set([...Object.keys(SPEC), ...Object.keys(RUN_MODES)])) {
      const want = SPEC[id], mode = RUN_MODES[id];
      if (!want || !mode) { fails.push(`${id}: ${want ? 'missing from RUN_MODES' : 'a new mode with no entry in modes.js SPEC'}`); continue; }
      if (mode.id !== id || mode.record !== want.record || mode.lifetime !== want.lifetime || mode.waves !== want.waves())
        fails.push(`${id}: RUN_MODES has ${JSON.stringify({ id: mode.id, record: mode.record, lifetime: mode.lifetime, waves: mode.waves })}, want ${JSON.stringify({ id, record: want.record, lifetime: want.lifetime, waves: want.waves() })}`);
    }
    for (const mode of Object.values(RUN_MODES)) {                     // every rule the scene asks a record for; the Lab runs no waves
      const need = ['difficulty', 'mutator', 'begin', 'restartData', 'music'];
      if (mode.id !== 'lab') need.push('startArena', 'squads', 'rng', 'modifier', 'card', 'elites');
      if (mode.id !== 'lab' && mode.id !== 'campaign') need.push('liftAfter');   // the campaign rides its route stations instead
      if (mode.openTotal) need.push('foeRng');
      for (const f of need) if (typeof mode[f] !== 'function') fails.push(`${mode.id}: RUN_MODES record has no ${f}()`);
      if (!Number.isInteger(mode.total)) fails.push(`${mode.id}: RUN_MODES record needs a whole-number total`);
      for (const f of ['openTotal', 'lifetime', 'dated', 'confirmRestart']) if (typeof mode[f] !== 'boolean') fails.push(`${mode.id}: RUN_MODES record needs ${f} true or false`);
    }
    T.start();
    for (const mode of Object.values(RUN_MODES)) {
      const say = msg => fails.push(`${mode.id}: ${msg}`);
      const l0 = life(), r0 = records();
      let waves;
      const onWave = (i, n) => { if (waves === undefined) waves = n; };
      BUS.on('wave', onWave);
      try {
        if (mode.id === 'lab') SlagLab.load('range', { invulnerable: false });
        else { RUNMODE = mode.id; T.boot(); }
        T.run(400);
        let g = T.g();
        if (g.mode !== mode) { say(`the scene ran as ${g.mode?.id}`); continue; }
        if (mode.id !== 'lab' && waves !== mode.waves) say(`the HUD was told the run has ${waves} waves, want ${mode.waves}`);
        g.hurtPlayer = () => false;                                     // stays alive until the death below; the stub outlives restarts
        T.run(3000);
        g.restartRun(); T.run(400);
        g = T.g();
        for (let t = 0; t < 8000 && !g.enemiesLeft && !g.lab; t += 200) T.run(200);   // a campaign spares you until a foe is due
        delete g.hurtPlayer; g.invulnUntil = 0;
        g.stats.kills = Math.max(g.stats.kills, 5);                    // a score above 0, so the best-score modes keep a record
        g.hp = 1; g.hurtPlayer(10, g.player.x, { iframes: false }); T.run(2500);   // a small last hit: damage taken costs score
        if (g.state !== 'dead') say(`the player didn't die (state ${g.state})`);
        if (!g.overShown) say('the results screen never came up');
        g.quitToTitle(); T.run(400);
      } catch (err) {
        say(`threw: ${String(err && err.message || err).split('\n')[0]}`);
      } finally { BUS.off('wave', onWave); }
      const l1 = life(), r1 = records();
      const runs = (l1.runs || 0) - (l0.runs || 0), time = (l1.time || 0) - (l0.time || 0);
      if (mode.lifetime ? runs !== 2 : runs !== 0) say(`lifetime runs went up ${runs}, want ${mode.lifetime ? 2 : 0} (a start and a restart)`);
      if (mode.lifetime ? !(time > 3) : time !== 0) say(`lifetime time went up ${time.toFixed(1)} s, want ${mode.lifetime ? 'over 3 s' : 'none'}`);
      for (const key of Object.keys(r0)) {
        const changed = r0[key] !== r1[key];
        if (key === mode.record && !changed) say(`the results screen didn't write ${key}`);
        if (key !== mode.record && changed) say(`the results screen wrote ${key}, another mode's record`);
      }
    }
    return { fails: [...fails, ...T.errs] };
  };
  return RMC;
})();
