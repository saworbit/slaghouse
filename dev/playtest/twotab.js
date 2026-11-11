// Two-tab check for saved progress (#38, #51). Not part of the game; see dev/playtest/README.md.
// Load harness.js first, then this, into a page where T.boot() has run under the campaign RUNMODE:
//   eval(await (await fetch('/dev/playtest/twotab.js')).text()); TT.check()
// The other tab is played by writing straight to localStorage, which is all a second tab can do to this one.
// Every slaghouse.* key is put back afterwards. The page's in-memory copies are not, so reload before other tests.
window.TT = (() => {
  const read = k => JSON.parse(localStorage.getItem(k) || 'null');
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const check = () => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('slaghouse.'));
    const backup = keys.map(k => [k, localStorage.getItem(k)]), fails = [], expect = (ok, msg) => { if (!ok) fails.push(msg); };
    try {
      // lifetime stats and mastery: both tabs add, and the stored total is the sum
      saveLife(); saveMastery();                                     // start in step with storage
      const life0 = read('slaghouse.life'), gun = WEAPONS[0].id, m0 = read('slaghouse.mastery')[gun] || 0;
      write('slaghouse.life', { ...life0, kills: life0.kills + 50, runs: life0.runs + 1 });   // the other tab plays and saves
      write('slaghouse.mastery', { ...read('slaghouse.mastery'), [gun]: m0 + 7 });
      LIFE.kills += 20; MASTERY[gun] = (MASTERY[gun] || 0) + 3;      // this tab plays on the copy it loaded, then saves
      saveLife(); saveMastery();
      const life1 = read('slaghouse.life'), m1 = read('slaghouse.mastery')[gun];
      expect(life1.kills === life0.kills + 70, `lifetime kills ${life1.kills}, want ${life0.kills + 70}`);
      expect(life1.runs === life0.runs + 1, `lifetime runs ${life1.runs}, want ${life0.runs + 1}`);
      expect(m1 === m0 + 10, `mastery ${gun} ${m1}, want ${m0 + 10}`);
      expect(LIFE.kills === life1.kills, `in-memory kills ${LIFE.kills} missed the other tab's (${life1.kills} stored)`);
      saveLife();
      expect(read('slaghouse.life').kills === life1.kills, 'a save with nothing new changed the stored kills');

      // codex: sightings from both tabs stay
      const [ka, kb] = CODEX.slice(-2).map(c => c[0]);
      SEEN.delete(ka); SEEN.delete(kb); write('slaghouse.seen', [...SEEN]);
      write('slaghouse.seen', [...read('slaghouse.seen'), ka]);     // the other tab meets ka
      markSeen(kb);                                                  // this tab meets kb
      const seen = read('slaghouse.seen');
      expect(seen.includes(ka) && seen.includes(kb), `codex kept ${ka}: ${seen.includes(ka)}, ${kb}: ${seen.includes(kb)}`);

      // campaign: this tab's run saves its own lift ride
      localStorage.removeItem(CAMPAIGN_KEY);
      let g = T.setup(0); const runId = g.campaignRunId;
      expect(g.campaign, 'T.setup(0) did not start a campaign run; set RUNMODE = \'campaign\' first');
      g.wave = CAMPAIGN_ACTS[1].first - 1;                           // the act's opening wave, so the checkpoint is a valid one
      g.descend(); T.run(2600); g = T.g();
      let save = read(CAMPAIGN_KEY);
      expect(save?.checkpoint?.runId === runId && save.owner === runId && save.checkpoint.arena === 1,
        `own lift ride saved ${JSON.stringify({ runId: save?.checkpoint?.runId, owner: save?.owner, arena: save?.checkpoint?.arena })}, want ${runId} at arena 1`);
      expect(campaignCheckpoint(save), 'own lift ride saved a checkpoint that campaignCheckpoint() rejects');

      // a newer campaign in the other tab takes the save over; this tab's next lift ride and its win leave it alone
      const newer = { ...save, owner: 'newer-run', checkpoint: { ...save.checkpoint, runId: 'newer-run' } };
      write(CAMPAIGN_KEY, newer);
      g.descend(); T.run(2600); g = T.g();
      save = read(CAMPAIGN_KEY);
      expect(JSON.stringify(save) === JSON.stringify(newer), `stale lift ride replaced the newer save: ${JSON.stringify({ runId: save?.checkpoint?.runId, owner: save?.owner, arena: save?.checkpoint?.arena })}`);
      g.showOver(true);
      save = read(CAMPAIGN_KEY);
      expect(save?.checkpoint?.runId === 'newer-run' && save.owner === 'newer-run' && save.cleared === true,
        `stale win left ${JSON.stringify({ runId: save?.checkpoint?.runId, owner: save?.owner, cleared: save?.cleared })}, want the newer run's checkpoint, cleared`);
    } catch (err) {
      fails.push('threw: ' + (err && err.stack || err));
    } finally {
      for (const k of Object.keys(localStorage)) if (k.startsWith('slaghouse.')) localStorage.removeItem(k);
      for (const [k, v] of backup) localStorage.setItem(k, v);
    }
    return { ok: !fails.length, fails };
  };
  return { check };
})();
