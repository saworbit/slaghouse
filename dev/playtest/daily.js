// Midnight check for DAILY (#49). Not part of the game; see dev/playtest/README.md.
// Load harness.js first, then this, into a page where `RUNMODE = 'daily'; T.boot()` has run:
//   eval(await (await fetch('/dev/playtest/daily.js')).text()); DY.check()
// It moves the clock past the next 00:00 UTC and checks the run keeps its day: the same waves, the same arena on a
// restart, and the record filed under the day it started. The clock and the slaghouse.daily key are put back.
window.DY = (() => {
  const check = () => {
    const fails = [], expect = (ok, msg) => { if (!ok) fails.push(msg); };
    const RealDate = Date, rec0 = localStorage.getItem('slaghouse.daily');
    try {
      const g = T.g(), day = g.day, rosters = () => [0, 1, 2, 3, 4, 5].map(i => g.endlessWave(i).map(e => e[0]).join(',')).join(' | ');
      expect(g.mode.id === 'daily' && day === dayKey(), `not a DAILY run on today's day (mode ${g.mode.id}, day ${day}, today ${dayKey()})`);
      const before = rosters(), next = RealDate.UTC(Math.floor(day / 10000), Math.floor(day / 100) % 100 - 1, day % 100 + 1, 0, 1);
      window.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(next); } };
      expect(dayKey() !== day, 'the mocked clock did not reach the next UTC day');
      expect(rosters() === before, 'the wave rosters changed after 00:00 UTC');
      g.pauseGame = () => {}; g.restartRun(); T.run(300);
      const g2 = T.g();
      expect(g2.day === day && g2.A.id === dailyArena(day) + 1, `a restart after 00:00 UTC moved to day ${g2.day}, ARENA 0${g2.A.id}`);
      localStorage.removeItem('slaghouse.daily'); g2.showOver(false);
      const rec = JSON.parse(localStorage.getItem('slaghouse.daily') || 'null');
      expect(rec?.date === day, `the record was filed under ${rec?.date}, want ${day}`);
    } catch (err) {
      fails.push('threw: ' + (err && err.stack || err));
    } finally {
      window.Date = RealDate;
      if (rec0 === null) localStorage.removeItem('slaghouse.daily'); else localStorage.setItem('slaghouse.daily', rec0);
    }
    return { ok: !fails.length, fails };
  };
  return { check };
})();
