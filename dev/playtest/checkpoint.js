// Campaign checkpoint checks (#39). Not part of the game; see dev/playtest/README.md.
// run.mjs drives these across real page reloads. By hand: load harness.js and this into a fresh page on the title
// screen, call CP.save(), reload, load both again, call CP.resume(snap) and then CP.retry(snap). For a damaged save,
// write the payload to localStorage, reload, load both again and call CP.damaged().
// Each returns { fails: [...] }; an empty list is a pass. They write slaghouse.* keys, so use a throwaway profile.
window.CP = (() => {
  const CP = {};
  const title = () => game.scene.getScene('Title');
  const checker = () => { const fails = []; return [fails, (ok, msg) => { if (!ok) fails.push(msg); }]; };
  const loadout = g => ({ arena: g.A.id - 1, weapon: g.weapon, slots: g.weaponSlots.join(','), total: g.totalEnemies, perks: Object.keys(g.perks).filter(k => g.perks[k]).sort().join(','), diff: g.runDiff, mut: g.runMut });
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
    g.wave = CAMPAIGN_ACTS[1].first - 1;
    g.stats.kills = CAMPAIGN_TOTAL - campaignFoesFrom(g.wave + 1);
    g.descend(); T.run(2600);
    delete g.startWave;                                                 // the scene object outlives the restart; give it its own method back
    const c = campaignCheckpoint();
    expect(c && c.arena === 1, `the Furnace lift saved no valid checkpoint: ${localStorage.getItem(CAMPAIGN_KEY)}`);
    const snap = c && { arena: c.arena, weapon: c.weapon, slots: campaignWeaponSlots(c.wave).join(','), total: c.totalEnemies, perks: Object.keys(c.perks).sort().join(','), diff: c.diff, mut: c.mut };
    expect(!snap || same(snap, { arena: 1, weapon: shotgun, slots: g.weaponSlots.join(','), total: CAMPAIGN_TOTAL, perks: 'boots,hollow', diff: 2, mut: 1 }), `the checkpoint didn't take the loadout: ${JSON.stringify(snap)}`);
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
    T.run(5100);
    expect(g.weaponSlots.join(',') === String(weaponSlot('nail')), 'the opening patrol should issue only the Nailgun');
    g.setWeapon(weaponSlot('rail'));
    g.cycleWeapon(1);
    expect(g.weapon === weaponSlot('nail'), 'a hotkey or weapon cycle equipped an unissued weapon');
    const hud = game.scene.getScene('Hud');
    g.wheelOn = true; hud.drawWheel(g); g.wheelOn = false;
    expect(hud.wheelIcons.filter(icon => icon.visible).length === 1, 'the weapon wheel exposed unissued slots');

    const opening = CAMPAIGN.slice(0, 5);
    expect(opening.every((op, i) => Math.max(...op.squads.map(s => s.foes.length)) === i + 2),
      'the first five operations must grow from two to six foes per squad');
    expect(opening.slice(1).every((op, i) => op.breakMs < opening[i].breakMs && op.spawnGap < opening[i].spawnGap),
      'each of the first five operations must reduce the delay between threats');
    expect(opening.slice(1).every((op, i) => (op.damageScale ?? 1) > opening[i].damageScale),
      'incoming damage must rise through the first five operations');
    const hp = g.hp;
    g.hurtPlayer(10, g.player.x, { iframes: false, knock: false });
    expect(hp - g.hp === 8, 'Lockdown did not apply the opening damage reduction');

    const patrol = g.enemies.getChildren().filter(e => e.alive);
    expect(patrol.length === 2 && patrol.every(e => e.kind === 'grunt'), 'Lockdown skipped its two-grunt patrol');
    for (const e of patrol) g.killEnemy(e, 1, 0, 'nail');
    g.cycleWeapon(1);
    expect(g.weapon === weaponSlot('shotgun'), 'clearing the patrol did not issue the Shotgun');
    const gap = CAMPAIGN[0].breakMs;
    expect(g.activeHostiles() === 0 && g.campaignReinforceAt > g.time.now, 'the next squad skipped the break');
    T.run(gap - 400);
    expect(g.activeHostiles() === 0, 'hostiles arrived during the equipment break');
    T.run(500);
    expect(g.activeHostiles() === 1, 'the heavy did not deploy alone');

    g.time.removeAllEvents();
    g.startWave(1);
    g.time.removeAllEvents();                                           // test the dispatch timer independently of the opening spawn beams
    expect(!g.mod && g.weaponSlots.includes(weaponSlot('flare')), 'Blackout must issue the Flare Gun before cutting power');
    g.enemiesLeft = g.campaignReserve + 1;
    g.releaseCampaignSquad();
    expect(!g.mod, 'the power cut started before the opening squad fell');
    g.enemiesLeft = g.campaignReserve;
    g.releaseCampaignSquad();
    T.run(CAMPAIGN[1].breakMs - 400);
    expect(!g.mod && g.activeHostiles() === 0, 'Blackout cut power before the break ended');
    T.run(500);
    expect(g.mod === 'dark' && g.activeHostiles() === 3, 'Blackout did not deploy the smaller ambush');
    g.wave = 0; g.hp = 34;
    g.waveCleared();
    expect(g.hp === 75, 'Lockdown clear did not restore the opening health floor');
    g.mutator = 'vamp'; g.hp = 34;
    g.waveCleared();
    expect(g.hp === 34, 'Vampire gained campaign clear recovery');
    return { fails };
  };

  CP.furnacePacing = () => {
    const [fails, expect] = checker();
    Math.random = seeded(426);
    const [g] = startFromTitle(1);
    g.scene.restart({ arena: 1 }); T.run(100);
    g.time.removeAllEvents();
    const alive = () => g.enemies.getChildren().filter(e => e.alive);
    const clear = () => { for (const e of alive()) g.killEnemy(e, 1, 0, 'nail'); };
    const gunship = () => alive().find(e => e.kind === 'gunship');
    g.startWave(2); T.run(3300); clear();
    const rainBreak = CAMPAIGN[2].breakMs;
    T.run(rainBreak + 3300);
    expect(g.mod === 'slag', 'Slag Rain did not start with Salvage Crew');
    clear(); T.run(rainBreak + 4100);
    expect(g.mod === 'slag' && !gunship(), 'the rain should still be active during Furnace Guard');

    const { x, body } = g.player;
    const drop = g.slagList[0];
    drop.enableBody(true, x, 100, true, true); drop.rain = true; drop.glow.setVisible(true);
    g.slagImpact(x, body.bottom - 5, true);
    g.spawnFirePatch(x, body.bottom - 5);
    expect(g.puddles.some(p => p.rain) && g.puddles.some(p => p.fire), 'test setup did not create rain and fire puddles');
    clear();
    expect(g.mod === null && !drop.active && !drop.glow.visible && !g.puddles.some(p => p.rain),
      'the Gunship break did not clear the rain, airborne slag and rain puddles');
    expect(g.puddles.some(p => p.fire), 'ending the rain removed fire from a different source');
    T.run(rainBreak - 300);
    expect(!gunship(), 'the Gunship skipped the reinforcement break');
    T.run(2000);
    expect(gunship() && g.mod === null, 'the Gunship did not arrive in clear weather');
    if (!gunship()) return { fails };

    g.spawnFirePatch(g.player.x, g.player.body.bottom - 5);
    g.hp = 10;
    clear();
    expect(g.enemiesLeft === 0 && !g.puddles.length && g.hp === 65, 'the clear did not extinguish existing fires and restore health');
    const wreck = g.wrecks[0];
    expect(wreck, 'defeating the Gunship did not leave a wreck');
    if (wreck) {                                                     // hold the wreck above the floor until the next operation starts
      wreck.body.setAllowGravity(false); wreck.body.setVelocity(0, 0);
      wreck.t = -10;
    }
    const taken = g.stats.taken;
    g.hurtPlayer(20, g.player.x, { self: true, iframes: false });        // a blast can go off after the last kill
    g.spawnFirePatch(g.player.x, g.player.body.bottom - 5);             // a late firebomb can still hit the ground
    T.run(1800);
    expect(!g.puddles.length && g.stats.taken === taken && g.state === 'play', 'a late blast or fire patch harmed the player after the clear');
    expect(g.perkOffer, 'the safe break did not offer the next perk');
    if (!g.perkOffer) return { fails };

    g.onPerkPick(g.perkOffer[0]); T.run(750);
    expect(wreck && g.wrecks.includes(wreck), 'test setup did not carry the wreck into the next operation');
    if (wreck && g.wrecks.includes(wreck)) {
      wreck.body.reset(g.player.x, g.player.y);
      wreck.t = 5;
      T.run(50);
    }
    expect(g.wave === 3 && !g.wrecks.length && !g.puddles.length && g.stats.taken === taken,
      'the old Gunship wreck damaged the player or reignited the arena after the next operation started');
    T.run(2950);
    const hounds = () => alive().filter(e => e.kind === 'hound').length;
    expect(g.wave === 3 && g.mod === 'lowg' && g.physics.world.gravity.y === TUNE.GRAVITY * 0.5 && hounds() === 1,
      'Gravity Loss did not open in low gravity with one Hound');
    clear();
    T.run(CAMPAIGN[3].breakMs - 300);
    expect(g.activeHostiles() === 0 && hounds() === 0 && g.mod === 'lowg', 'the second Hound skipped the low-gravity break');
    T.run(2000);
    expect(hounds() === 1 && g.mod === 'lowg', 'the second Hound did not arrive with Gravity Surge');
    return { fails };
  };

  CP.legacy = () => {
    const [fails, expect] = checker();
    const [g, offered] = startFromTitle(0);
    expect(offered.checkpoint && offered.sel === 0, 'an older campaign save did not offer Continue');
    expect(g?.weapon === weaponSlot('nuke') && g.weaponSlots.includes(g.weapon), 'Continue lost the legacy equipped weapon');
    expect(g?.stats.kills === 34 && g.totalEnemies === 34 + campaignFoesFrom(2), 'Continue did not keep cleared kills and recount upcoming foes');
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
