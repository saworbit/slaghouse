// Campaign checkpoint checks (#39). Not part of the game; see dev/playtest/README.md.
// run.mjs drives these across real page reloads. By hand: load harness.js and this into a fresh page on the title
// screen, call CP.save(), reload, load both again, call CP.resume(snap) and then CP.retry(snap). For a damaged save,
// write the payload to localStorage, reload, load both again and call CP.damaged().
// Each returns { fails: [...] }; an empty list is a pass. They write slaghouse.* keys, so use a throwaway profile.
window.CP = (() => {
  const CP = {};
  const title = () => game.scene.getScene('Title');
  const checker = () => { const fails = []; return [fails, (ok, msg) => { if (!ok) fails.push(msg); }]; };
  const loadout = g => ({ arena: g.A.id - 1, weapon: g.weapon, slots: g.weaponSlots.join(','), perks: Object.keys(g.perks).filter(k => g.perks[k]).sort().join(','), diff: g.runDiff, mut: g.runMut });
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const startFromTitle = (choice) => {                                  // choice 0 = Continue, 1 = New Campaign
    T.start(); T.run(200);
    const ts = title(); ts.showSub('campaign');
    const offered = { checkpoint: !!ts.checkpoint, sel: ts.subSel };
    ts.subSel = choice; ts.subKey('ok'); T.run(800);
    const g = T.g(); if (g) g.pauseGame = () => {};
    return [g, offered];
  };

  // New Campaign on BRUTAL with GLASS CANNON, change the loadout, ride the Furnace lift. Returns the snapshot.
  CP.save = () => {
    const [fails, expect] = checker();
    OPTS.diff = 2; OPTS.mut = 1;                                        // in memory only: after a reload they come back as stored
    const [g] = startFromTitle(1);
    expect(g && g.sys.isActive() && g.campaign && g.A.id === 1, 'New Campaign did not start act 1');
    if (fails.length) return { fails };
    g.issueWeapons(CAMPAIGN[0].squads[1].unlock); g.issueWeapons(CAMPAIGN[1].unlock);
    const shotgun = weaponSlot('shotgun');
    g.setWeapon(shotgun); g.perks.hollow = true; g.perks.boots = true;
    g.startWave = () => {};                                             // hold the wave timer, or it resets g.wave before the lift saves
    g.wave = CAMPAIGN_ACTS[1].first - 1; g.descend(); T.run(2600);
    delete g.startWave;                                                 // the scene object outlives the restart; give it its own method back
    const c = campaignCheckpoint();
    expect(c && c.arena === 1, `the Furnace lift saved no valid checkpoint: ${localStorage.getItem(CAMPAIGN_KEY)}`);
    const snap = c && { arena: c.arena, weapon: c.weapon, slots: campaignWeaponSlots(c.wave).join(','), perks: Object.keys(c.perks).sort().join(','), diff: c.diff, mut: c.mut };
    expect(!snap || same(snap, { arena: 1, weapon: shotgun, slots: g.weaponSlots.join(','), perks: 'boots,hollow', diff: 2, mut: 1 }), `the checkpoint didn't take the loadout: ${JSON.stringify(snap)}`);
    return { fails, snap };
  };

  // After a reload: the campaign page offers Continue, and it starts the Furnace with the saved loadout.
  CP.resume = (snap) => {
    const [fails, expect] = checker();
    const [g, offered] = startFromTitle(0);
    expect(offered.checkpoint && offered.sel === 0, `the campaign page didn't offer Continue: ${JSON.stringify(offered)}`);
    expect(g && g.sys.isActive() && g.campaign && g.chapterStart, 'Continue did not start a campaign run from the checkpoint');
    if (g) expect(same(loadout(g), snap), `Continue started ${JSON.stringify(loadout(g))}, want ${JSON.stringify(snap)}`);
    return { fails };
  };

  // Change the loadout, die, and press R on the results: the act starts over with the checkpoint's loadout.
  CP.retry = (snap) => {
    const [fails, expect] = checker();
    const g = T.g();
    g.cycleWeapon(1); g.perks.trigger = true;
    g.killPlayer(); T.run(1600);
    expect(g.overShown, 'the results never appeared after the death');
    g.restartRun(); T.run(800);
    const g2 = T.g(); g2.pauseGame = () => {};
    expect(g2.state === 'play' && g2.campaignRetried, `the retry isn't a live retried run (state ${g2.state}, retried ${g2.campaignRetried})`);
    expect(same(loadout(g2), snap), `Retry Act started ${JSON.stringify(loadout(g2))}, want ${JSON.stringify(snap)}`);
    return { fails };
  };

  CP.progression = () => {
    const [fails, expect] = checker();
    const [g] = startFromTitle(1);
    T.run(4250);
    expect(g.weaponSlots.join(',') === String(weaponSlot('nail')), 'the opening patrol should issue only the Nailgun');
    g.setWeapon(weaponSlot('rail'));
    g.cycleWeapon(1);
    expect(g.weapon === weaponSlot('nail'), 'a hotkey or weapon cycle equipped an unissued weapon');
    const hud = game.scene.getScene('Hud');
    g.wheelOn = true; hud.drawWheel(g); g.wheelOn = false;
    expect(hud.wheelIcons.filter(icon => icon.visible).length === 1, 'the weapon wheel exposed unissued slots');

    const patrol = g.enemies.getChildren().filter(e => e.alive);
    expect(patrol.length === 3 && patrol.every(e => e.kind === 'grunt'), 'Lockdown skipped its grunt patrol');
    for (const e of patrol) g.killEnemy(e, 1, 0, 'nail');
    g.cycleWeapon(1);
    expect(g.weapon === weaponSlot('shotgun'), 'clearing the patrol did not issue the Shotgun');

    g.time.removeAllEvents();
    g.startWave(1);
    expect(!g.mod && g.weaponSlots.includes(weaponSlot('flare')), 'Blackout must issue the Flare Gun before cutting power');
    g.enemiesLeft = g.campaignReserve + 1;
    g.releaseCampaignSquad();
    expect(!g.mod, 'the power cut started before the opening squad fell');
    g.enemiesLeft = g.campaignReserve;
    g.releaseCampaignSquad();
    expect(g.mod === 'dark', 'the Blackout reinforcement did not cut power');
    return { fails };
  };

  CP.legacy = () => {
    const [fails, expect] = checker();
    const [g, offered] = startFromTitle(0);
    expect(offered.checkpoint && offered.sel === 0, 'an older campaign save did not offer Continue');
    expect(g?.weapon === weaponSlot('nuke') && g.weaponSlots.includes(g.weapon), 'Continue lost the legacy equipped weapon');
    expect(g?.totalEnemies === CAMPAIGN_TOTAL + 2, 'Continue did not retain the legacy enemy count adjustment');
    return { fails };
  };

  // With a damaged save stored: no Continue, and New Campaign starts act 1 from scratch.
  CP.damaged = () => {
    const [fails, expect] = checker();
    const [g, offered] = startFromTitle(1);
    expect(!offered.checkpoint && offered.sel === 1, `a damaged save was offered as a checkpoint: ${JSON.stringify(offered)}`);
    expect(g && g.sys.isActive() && g.campaign && g.A.id === 1 && !g.chapterStart, 'New Campaign did not start a fresh act 1');
    return { fails };
  };
  return CP;
})();
