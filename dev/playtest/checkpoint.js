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
    const squadCaps = [2, 3, 3, 3, 6];
    expect(opening.every((op, i) => Math.max(...op.squads.map(s => s.foes.length)) <= squadCaps[i]),
      'an early operation exceeded its squad size limit');
    expect(opening.slice(1).every((op, i) => op.breakMs <= opening[i].breakMs && op.spawnGap <= opening[i].spawnGap),
      'early operation breaks and spawn gaps must hold or shorten');
    expect(opening.slice(1).every((op, i) => (op.damageScale ?? 1) > opening[i].damageScale),
      'incoming damage must rise through the first five operations');
    const hp = g.hp;
    g.hurtPlayer(10, g.player.x, { iframes: false, knock: false });
    expect(hp - g.hp === 8, 'Lockdown did not apply the opening damage reduction');

    const patrol = g.enemies.getChildren().filter(e => e.alive);
    expect(patrol.length === 2 && patrol.every(e => e.kind === 'grunt'), 'Lockdown skipped its two-grunt patrol');
    for (const e of patrol) g.killEnemy(e, 1, 0, 'nail');
    hud.drawIndicators(g, g.time.now);
    expect(hud.unlockCards[0].name._text === 'SHOTGUN' && hud.unlockCards[0].key._text === '2 TO EQUIP',
      'the Shotgun notice did not show its equip key');
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
    T.seed(426);
    const [g] = startFromTitle(1);
    g.scene.restart({ arena: 1 }); T.run(100);
    g.time.removeAllEvents();
    const alive = () => g.enemies.getChildren().filter(e => e.alive);
    const clear = () => { for (const e of alive()) g.killEnemy(e, 1, 0, 'nail'); };
    const gunship = () => alive().find(e => e.kind === 'gunship');
    g.startWave(2); T.run(4200); clear();
    const rainBreak = CAMPAIGN[2].breakMs;
    T.run(rainBreak + 2700);
    expect(g.mod === 'slag' && alive().length === 2, 'Slag Rain did not start with the Salvage Crew pair');
    clear(); T.run(rainBreak + 2700);
    expect(g.mod === 'slag' && !gunship(), 'the rain should still be active during Furnace Guard');

    const { x, body } = g.player;
    const drop = g.slagList[0];
    drop.enableBody(true, x, 100, true, true); drop.rain = true; drop.glow.setVisible(true);
    g.slagImpact(x, body.bottom - 5, true);
    g.spawnFirePatch(x, body.bottom - 5);
    expect(g.puddles.some(p => p.rain) && g.puddles.some(p => p.fire), 'test setup did not create rain and fire puddles');
    clear();
    expect(g.mod === null && !drop.active && !drop.glow.visible && !g.puddles.some(p => p.rain),
      'the Demolition Team break did not clear the rain, airborne slag and rain puddles');
    expect(g.puddles.some(p => p.fire), 'ending the rain removed fire from a different source');
    expect(g.campaignMachinery === null, 'the Furnace vents stayed active for the Demolition Team');
    T.run(rainBreak + 2700);
    expect(alive().map(e => e.kind).sort().join() === 'pyro,rocketeer', 'the Demolition Team did not arrive as a pair');
    clear();
    const bossBreak = CAMPAIGN[2].squads.at(-1).breakMs;
    T.run(5600);
    expect(!gunship() && g.activeHostiles() === 0 && g.campaignReinforceAt > g.time.now,
      'the Gunship skipped the extra time to reposition after the Demolition Team');
    T.run(bossBreak - 5600 - 300);
    T.run(2000);
    expect(gunship() && g.mod === null && alive().length === 1, 'the Gunship did not arrive alone in clear weather');
    if (!gunship()) return { fails };

    const ship = gunship(), rockets = [];
    const launch = g.gunshipRocket;
    g.gunshipRocket = () => rockets.push(g.time.now);
    ship.volT = 0;
    ship.dropT = 0;
    const fired = g.time.now;
    g.updateGunship(ship, 0, fired, 0, 0, 200, true);
    T.run(800);
    expect(!rockets.length && ship.ai === 'tell', 'the Gunship launched before its warning was readable');
    T.run(900);
    expect(rockets.length === 2 && rockets[1] - rockets[0] >= 500, 'the Gunship did not space its two rockets');
    expect(!ship.drops, 'the Gunship dropped troops during the volley recovery');
    g.gunshipRocket = launch;

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
    T.run(4350);
    const hounds = () => alive().filter(e => e.kind === 'hound').length;
    expect(g.wave === 3 && g.mod === 'lowg' && g.physics.world.gravity.y === TUNE.GRAVITY * 0.5 && hounds() === 1 && alive().length === 3,
      'Gravity Loss did not open in low gravity with one Hound');
    clear();
    T.run(CAMPAIGN[3].breakMs - 300);
    expect(g.activeHostiles() === 0 && hounds() === 0 && g.mod === 'lowg', 'the second Hound skipped the low-gravity break');
    T.run(2800);
    expect(hounds() === 1 && g.mod === 'lowg' && alive().length === 2, 'the second Hound and Pogo did not arrive with Gravity Surge');
    const advance = () => { clear(); const due = g.campaignReinforceAt; T.run(CAMPAIGN[3].breakMs + 2700); return due; };
    const linkersDue = advance(), linkers = alive();
    const foe = e => `${e.kind} (${Math.floor(e.x / TS)},${Math.floor(e.y / TS)}) homeY ${Math.round(e.homeY)}${e.under ? ' under' : ''}${e.summoned ? ' summoned' : ''}`;
    expect(linkers.length === 2 && linkers.every(e => e.kind === 'linker' && e.homeY > 10 * TS),
      `the Linkers should enter together below the catwalk (homeY > ${10 * TS}) after the second Hound is gone: ` +
      `${linkers.length} alive [${linkers.map(foe).join('; ')}], ${g.campaignSquads.length} squads and ${g.campaignReserve} reserve left, ` +
      (linkersDue ? `${Math.round(g.time.now - linkersDue)} ms after the break ended` : 'no break was pending after the clear'));
    advance();
    expect(alive().map(e => e.kind).sort().join() === 'howitzer,welder', 'Heavy Support should arrive in its own pair');
    advance();
    expect(alive().map(e => e.kind).sort().join() === 'chiller,slug', 'the Containment Crew should arrive after Heavy Support');
    clear();
    expect(g.campaignMachinery === null, 'the Furnace vents did not shut down for the Juggernaut');
    return { fails };
  };

  // MOON BOOTS and LIGHTS OUT promise every wave: Slag Rain's scripted rain starting and clearing must not drop them.
  CP.mutatorHazards = () => {
    const [fails, expect] = checker();
    for (const id of ['lowg', 'dark']) {
      T.seed(426);
      OPTS.mut = MUTATORS.findIndex(m => m.id === id);
      const [g] = startFromTitle(1);
      g.scene.restart({ arena: 1 }); T.run(100);
      g.time.removeAllEvents();
      const alive = () => g.enemies.getChildren().filter(e => e.alive);
      const clear = () => { for (const e of alive()) g.killEnemy(e, 1, 0, 'nail'); };
      const on = () => (id === 'lowg' ? g.physics.world.gravity.y === TUNE.GRAVITY * 0.5 : g.darkA > 0.5);
      const name = MUTATORS[OPTS.mut].name, rainBreak = CAMPAIGN[2].breakMs;
      g.startWave(2); T.run(4200);
      expect(on(), `${name} was off in the Slag Rain opener (mod ${g.mod})`);
      clear(); T.run(rainBreak + 2700);
      expect(g.mod === 'slag' && on(), `${name} was off once the Salvage Crew brought the rain (mod ${g.mod})`);
      clear(); T.run(rainBreak + 2700);
      clear(); T.run(1500);
      expect(g.mod === null && on(), `${name} was off after the rain cleared for the Demolition Team (mod ${g.mod})`);
      T.run(rainBreak + 1200); clear(); T.run(5600);
      expect(on(), `${name} was off in the break before the Gunship (mod ${g.mod})`);
      g.quitToTitle(); T.run(300);
    }
    OPTS.mut = 0;
    return { fails };
  };

  // Gravity Loss tells you before gravity drops and before it comes back (#190), and the Furnace vents come back on
  // from idle, so every burst follows a grate tell (#185).
  CP.modifierCues = () => {
    const [fails, expect] = checker();
    RUNMODE = 'campaign'; OPTS.diff = 1; OPTS.mut = 0;
    T.boot();
    const g = T.setup(1), full = TUNE.GRAVITY, G = () => g.physics.world.gravity.y;
    const said = [], hear = txt => said.push({ txt, t: g.time.now });
    BUS.on('callout', hear);
    const callAt = txt => (said.find(c => c.txt === txt) || {}).t;
    // Step frame by frame and note the first frame gravity moved off `from`.
    const watch = (ms, from) => { let moved = null; for (let t = 0; t < ms; t += 17) { T.run(17); if (moved === null && G() !== from) moved = g.time.now; } return moved; };
    try {
      g.applyMod('lowg');
      expect(G() === full, `gravity changed the moment Low Gravity applied (${G()})`);
      let moved = watch(3000, full);
      const lowCall = callAt('LOW GRAVITY!');
      expect(lowCall !== undefined, 'Low Gravity never called LOW GRAVITY!');
      expect(moved !== null && lowCall !== undefined && moved >= lowCall, `gravity dropped ${lowCall === undefined ? 'with no callout' : Math.round(lowCall - moved) + ' ms before LOW GRAVITY!'}`);
      expect(G() === full * 0.5, `gravity did not settle at half within 3 s (${G()})`);
      said.length = 0;
      g.applyMod(null);
      moved = watch(1000, full * 0.5);
      const back = callAt('GRAVITY RESTORED');
      expect(back !== undefined && moved !== null && moved >= back, `full gravity came back ${back === undefined ? 'with no GRAVITY RESTORED' : 'before GRAVITY RESTORED'}`);
      expect(G() === full, `gravity did not settle back at full within 1 s (${G()})`);
      // At the end of an operation WAVE CLEARED goes up in the same frame, so the cue waits for it.
      g.applyMod('lowg'); T.run(3000); said.length = 0;
      g.wave = 3;                                                       // Gravity Loss: no suit patch, so the cue comes 1.1 s in
      g.waveCleared();
      moved = watch(2000, full * 0.5);
      const order = said.map(c => c.txt), after = callAt('GRAVITY RESTORED');
      expect(order.indexOf('WAVE CLEARED') >= 0 && order.indexOf('GRAVITY RESTORED') > order.indexOf('WAVE CLEARED'), `GRAVITY RESTORED did not follow WAVE CLEARED: ${order.join(', ')}`);
      expect(after !== undefined && moved !== null && moved >= after, 'gravity came back at the clear before GRAVITY RESTORED was called');
      // MOON BOOTS is picked from the menu: low gravity from the first frame, and Slag Rain clearing keeps it.
      g.mutator = 'lowg'; g.applyMod(null);
      expect(G() === full * 0.5, `MOON BOOTS did not hold gravity at half (${G()})`);
      g.mutator = null; g.applyMod(null); T.run(1000);

      // The vents switch off mid-burst and come back on: they start from idle and flare the grate before firing.
      g.setCampaignMachinery('vents'); T.run(50);
      g.jetCycle.st = 'fire'; g.jetCycle.t = 1.5; g.jetCycle.f = 0.2;
      g.setCampaignMachinery(null); T.run(500);
      g.setCampaignMachinery('vents');
      expect(g.jetCycle.st === 'idle' && g.jetCycle.t > 1, `the vents came back on in '${g.jetCycle.st}' with ${g.jetCycle.t.toFixed(2)} s left`);
      let told = false, firedFirst = false;
      for (let t = 0; t < 10000 && !(told && g.jetCycle.st === 'fire'); t += 17) {
        T.run(17);
        if (g.jetCycle.st === 'tell') told = true;
        if (g.jetCycle.st === 'fire' && !told) firedFirst = true;
      }
      expect(!firedFirst, 'the vents fired before the grate flared');
      expect(told && g.jetCycle.st === 'fire', `the vents never went through a tell and a burst after restarting ('${g.jetCycle.st}')`);
    } finally { BUS.off('callout', hear); }
    return { fails: [...fails, ...T.errs] };
  };

  // A run reset clears a DOUBLE KILL ... MASSACRE still on screen (#180).
  CP.hudReset = () => {
    const [fails, expect] = checker();
    RUNMODE = 'campaign'; OPTS.diff = 1; OPTS.mut = 0;
    T.boot();
    const g = T.setup(0), hud = game.scene.getScene('Hud');
    hud.showMulti('TRIPLE KILL', 3); T.run(100);
    expect(hud.mkLbl.alpha === 1, 'test setup: the multi-kill label did not show');
    g.restartRun(); T.run(100);
    expect(hud.mkLbl.alpha === 0, `the multi-kill label was still up after a restart (alpha ${hud.mkLbl.alpha})`);
    return { fails: [...fails, ...T.errs] };
  };

  // The route as world objects (#182, #189). Step frame by frame until done(), up to ms; true if it got there.
  const until = (done, ms) => { for (let t = 0; t < ms; t += 17) { if (done()) return true; T.run(17); } return done(); };
  const crewOf = g => g.enemies.getChildren().filter(e => e.alive && !e.summoned);

  // The far lift waits for a clear area, then comes, opens and takes you down. Nothing reaches you in the car, and the
  // next act opens on the car arriving with no control until its doors open. A start without the lift has control.
  CP.liftRoute = () => {
    const [fails, expect] = checker();
    RUNMODE = 'campaign'; OPTS.diff = 1; OPTS.mut = 0;
    T.boot();
    const g = T.setup(0), L = g.liftOut;
    g.wave = 1; g.enemiesLeft = 1;
    const foe = g.spawnEnemy('grunt', 20, 24);
    g.openCampaignRoute(CAMPAIGN[1].route);
    T.tp(95, 24); T.run(3000);
    expect(g.routeGoal() === null, 'routeGoal() named the lift with a foe alive');
    expect(L.st === 'shut' && !g.ride, `the far lift ${L.st === 'shut' ? 'took you in' : "didn't stay shut"} with a foe alive (${L.st})`);
    g.killEnemy(foe, 1, 0, 'nail');
    expect(g.routeGoal() === g.campaignRoute[0], 'routeGoal() did not name the lift once the area was clear');
    expect(until(() => g.ride, 4000), `the lift never came, opened and took you in once the area was clear (lift ${L.st})`);
    expect(until(() => g.A.id === 2, 5000), `the ride never reached the Furnace (arena ${g.A.id})`);
    const R = g.ride, x0 = g.player.x;
    expect(R?.st === 'arrive' && g.liftIn.cover, `the Furnace did not open on the car arriving (ride ${R?.st})`);
    g.keys.D.isDown = true;
    T.run(400);
    expect(Math.abs(g.player.x - x0) < 1, `you moved ${Math.round(g.player.x - x0)} px before the doors opened`);
    expect(until(() => !g.ride, 3000) && g.liftIn.st === 'open', `the car never let you out (ride ${g.ride?.st}, doors ${g.liftIn.st})`);
    T.run(400);
    expect(g.player.x - x0 > 20, 'no control once the doors opened');
    g.keys.D.isDown = false;
    const g2 = T.setup(1);
    expect(!g2.ride, `a carry without the lift started in a car (${g2.ride?.st})`);
    return { fails: [...fails, ...T.errs] };
  };

  // Meltdown's route: each valve brings its crew, who count toward the act and end nothing when they fall. A knock off
  // the wheel sets it back at half speed, and the heat-locked lift only comes once both valves have cooled the shaft.
  CP.valveRoute = () => {
    const [fails, expect] = checker();
    RUNMODE = 'campaign'; OPTS.diff = 1; OPTS.mut = 0;
    T.boot();
    const g = T.setup(2), L = g.liftOut, route = CAMPAIGN[5].route, calls = [], said = [];
    const hear = txt => said.push(txt);
    BUS.on('callout', hear);
    g.waveCleared = () => calls.push('waveCleared'); g.win = () => calls.push('win');
    try {
      g.wave = 5; g.enemiesLeft = 0; L.heat = 1;                        // the Wyrm is down after a long Meltdown
      const kills0 = g.stats.kills;
      let crews = 0;
      g.openCampaignRoute(route);
      for (const [i, st] of route.filter(s => s.valve).entries()) {
        expect(g.enemiesLeft === st.guard.length, `valve ${i + 1}: enemiesLeft ${g.enemiesLeft} when its crew of ${st.guard.length} was sent`);
        until(() => crewOf(g).length >= st.guard.length, 5000);
        const crew = crewOf(g);
        expect(crew.map(e => e.kind).sort().join() === st.guard.map(([k]) => k).sort().join(), `valve ${i + 1}: crew ${crew.map(e => e.kind).join(', ')}, want ${st.guard.map(([k]) => k).join(', ')}`);
        expect(g.routeGoal() === g.campaignRoute[0], `valve ${i + 1}: routeGoal() didn't name the wheel with its crew alive`);
        crews += crew.length; said.length = 0;
        for (const e of crew) g.killEnemy(e, 1, 0, 'nail');
        expect(!calls.length, `valve ${i + 1}: killing its crew called ${calls.join(', ')}`);
        expect(said.includes('AREA CLEAR'), `valve ${i + 1}: no AREA CLEAR once its crew was down`);
        T.run(1500);                                                    // the kill cam's slow motion runs out
        T.tp(st.cell[0], st.cell[1]); T.run(300);
        if (!i) {                                                       // knocked off the wheel, it creeps back
          const on = g.routeHold; T.run(1000); const held = g.routeHold;
          T.tp(st.cell[0] + 8, st.cell[1]); T.run(400);
          const lost = held - g.routeHold;
          expect(held - on > 0.9, `valve 1 gained ${(held - on).toFixed(2)} s in 1 s on the wheel`);
          expect(Math.abs(lost - 0.2) < 0.04, `0.4 s off the wheel took ${lost.toFixed(2)} s off it, want 0.2`);
          T.tp(st.cell[0], st.cell[1]);
        }
        expect(until(() => g.coolant === i + 1, 3000), `valve ${i + 1} never turned (coolant ${g.coolant})`);
      }
      expect(g.coolant === 2 && L.heat > 0.3, `test setup: coolant ${g.coolant}, lift heat ${L.heat.toFixed(2)}`);
      T.tp(95, 24);
      let heatAtCall = null;
      for (let t = 0; t < 6000 && heatAtCall === null; t += 17) { T.run(17); if (L.st !== 'shut') heatAtCall = L.heat; }
      expect(heatAtCall !== null && heatAtCall < 0.08, heatAtCall === null ? 'the lift never came after both valves' : `the lift came with the shaft at heat ${heatAtCall.toFixed(2)}`);
      expect(g.stats.kills - kills0 === crews && crews === 6, `the crews gave ${g.stats.kills - kills0} kills from ${crews} foes, want 6`);
      const squads = CAMPAIGN[5].squads.reduce((n, s) => n + s.foes.length, 0);
      expect(campaignFoesFrom(5) - campaignFoesFrom(6) === squads + crews, `Meltdown counts ${campaignFoesFrom(5) - campaignFoesFrom(6)} foes, but sends ${squads} plus ${crews} on its route`);
      expect(campaignFoesFrom(0) === CAMPAIGN_TOTAL, `CAMPAIGN_TOTAL ${CAMPAIGN_TOTAL} isn't campaignFoesFrom(0) (${campaignFoesFrom(0)})`);
    } finally { BUS.off('callout', hear); delete g.waveCleared; delete g.win; }
    return { fails: [...fails, ...T.errs] };
  };

  // Act 05's breaker: pulling it cuts the power and starts the Smelter in the same arena about 1.6 s later.
  CP.breakerRoute = () => {
    const [fails, expect] = checker();
    RUNMODE = 'campaign'; OPTS.diff = 1; OPTS.mut = 0;
    T.boot();
    const g = T.setup(4), started = [], [cx, cy] = CAMPAIGN[8].route[0].cell;
    g.time.removeAllEvents();                                           // the act's own opening wave
    g.startWave = i => started.push({ i, t: g.time.now });
    g.wave = 8; g.enemiesLeft = 0;
    g.openCampaignRoute(CAMPAIGN[8].route);
    T.tp(cx, cy);
    expect(until(() => g.powerCut, 3000), 'standing at the breaker never cut the power');
    const cut = g.time.now;
    expect(!started.length, 'the Smelter started with the breaker');
    until(() => started.length, 2500);
    const s = started[0];
    expect(s && s.i === 9 && Math.abs(s.t - cut - 1600) < 60, s ? `the next operation (${s.i}) started ${Math.round(s.t - cut)} ms after the power cut, want 9 at 1600` : 'the Smelter never started after the breaker');
    expect(g.A.id === 5 && !g.descending, `the breaker left the Powerhouse (arena ${g.A.id})`);
    return { fails: [...fails, ...T.errs] };
  };

  // OVERTIME rides on after an arena's last wave and its perk, but only once you walk into the car. BOSS RUSH's last
  // arena has no way out.
  CP.modeLifts = () => {
    const [fails, expect] = checker();
    RUNMODE = 'endless'; OPTS.diff = 1; OPTS.mut = 0;
    T.boot();
    const g = T.setup(0), hud = game.scene.getScene('Hud');
    g.wave = TUNE.ENDLESS.cycle - 1; g.enemiesLeft = 0;
    g.waveCleared();
    expect(until(() => g.perkOffer, 3000), 'no perk offer after the arena\'s last wave');
    T.run(800);                                                         // the cards deal in before a key picks one
    hud.onPerkKey({ keyCode: 49 });
    until(() => g.campaignRoute.length, 2000);
    const st = g.campaignRoute[0] || {};
    expect(g.campaignRoute.length === 1 && st.label === 'TAKE THE LIFT', `after the perk the route is ${JSON.stringify(g.campaignRoute.map(s => s.label))}`);
    T.run(6000);
    expect(g.A.id === 1 && !g.descending && g.liftOut.st === 'open', `with you away from it the lift ${g.descending ? 'left' : 'is ' + g.liftOut.st} (arena ${g.A.id})`);
    T.tp(Math.floor(st.x / TS), Math.floor(st.y / TS) - 1);
    expect(until(() => g.ride, 1000), 'walking into the open car did not board it');
    // In the campaign the car only comes once the area is clear, which shields you too; here only the ride does.
    expect(g.hurtPlayer(20, g.player.x, { iframes: false }) === false, 'hurtPlayer reached you in the lift car');
    expect(until(() => g.A.id === 2, 5000), `walking into the car never took you to ARENA 02 (arena ${g.A.id})`);
    RUNMODE = 'bossrush'; T.boot();
    for (let i = 0; i < 5; i++) {
      const b = T.setup(i), last = i === 4;
      expect(!b.liftOut === last, `BOSS RUSH arena ${i + 1} ${last ? 'has a way out' : 'has no lift'}`);
    }
    return { fails: [...fails, ...T.errs] };
  };

  CP.linkerRecovery = () => {
    const [fails, expect] = checker();
    RUNMODE = 'campaign'; OPTS.diff = 1;
    T.boot();
    // Reproduce the three pockets above the catwalk with a lone Linker and the player on the upper deck.
    for (const [bay, playerX, linkerX, firingX] of [['left', 667, 647, 615], ['center', 667, 774, 806], ['right', 963, 972, 982]]) {
      const g = T.setup(1);
      g.wave = 3;
      g.applyMod('lowg');
      g.setCampaignMachinery(null);
      const player = g.player.body;
      player.reset(playerX, 56);
      player.setAllowGravity(false);
      const linker = g.spawnEnemy('linker', 33, 17);
      linker.aggro = true;
      linker.body.reset(linkerX, 38);

      T.run(2800);
      expect(linker.body.top > 11 * TS, `the Linker failed to descend from the ${bay} ceiling pocket`);

      player.reset(firingX, 187);
      T.run(150);
      T.trig(true);
      for (let shot = 0; shot < 70 && linker.alive; shot++) {
        // Keep the test in its firing lane when return fire knocks the gravity-free player away.
        player.reset(firingX, 187);
        T.aimAt(linker.body.center.x, linker.body.center.y);
        T.run(50);
      }
      T.trig(false);
      const target = `(${Math.round(linker.body.center.x)}, ${Math.round(linker.body.center.y)})`;
      expect(!linker.alive && g.stats.kills === 1,
        `the player could not clear the Linker from the ${bay} lane with normal fire: ${g.stats.hits}/${g.stats.shots} shots hit, ${linker.hp} HP at ${target}`);
    }
    return { fails };
  };

  CP.traversal = () => {
    const [fails, expect] = checker();
    RUNMODE = 'campaign'; OPTS.diff = 1;
    T.boot();
    const pressJump = g => { g.keys.SPACE.isDown = true; g.keys.SPACE._justDown = true; };

    // Real jumps through one-way platforms in the former sealed center pockets.
    for (const [arena, x, y, hops, top] of [[1, 50, 18, 3, 10], [2, 45, 20, 2, 13]]) {
      const g = T.setup(arena);
      g.setCampaignMachinery(null);
      g.applyMod(null);
      T.tp(x, y); T.run(200);
      for (let i = 0; i < hops; i++) {
        pressJump(g); T.run(650);
        g.keys.SPACE.isDown = false; T.run(50);
      }
      expect(g.player.body.blocked.down && Math.abs(g.player.body.bottom - top * TS) < 1,
        `${g.A.sub} upper catwalk cannot be reached with normal jumps`);
    }

    const g = T.setup(0), b = g.player.body;
    b.reset(38, 160); b.setVelocityY(-80);
    g.lastGround = -Infinity;
    pressJump(g); T.run(17);
    expect(b.velocity.x > 0 && b.velocity.y < -TUNE.JUMP_VELOCITY,
      'a jump while rising next to a wall did not kick away without directional input');

    g.keys.SPACE.isDown = false;
    b.reset(51, 160); b.setVelocity(-165, 20);
    g.wallLockUntil = 0;
    g.keys.A.isDown = true;
    pressJump(g); T.run(17);
    expect(b.velocity.x < 0, 'the jump fired before reaching the wall');
    T.run(60);
    expect(b.velocity.y < -200, 'a jump pressed just before contact did not launch away from the wall');

    // Hold into one wall and repeat the jump without reversing or needing a second wall.
    b.reset(38, 183); b.setVelocityY(30);
    g.wallLockUntil = 0;
    g.lastGround = -Infinity;
    let farthest = b.left;
    for (let jump = 0; jump < 3; jump++) {
      pressJump(g); T.run(17);
      expect(b.velocity.y < -TUNE.JUMP_VELOCITY, 'a repeated jump failed to kick off the same wall');
      for (let frame = 0; frame < 8; frame++) {
        T.run(17);
        farthest = Math.max(farthest, b.left);
      }
      g.keys.SPACE.isDown = false;
      T.run(17);
    }
    expect(b.bottom < 80 && farthest < 43,
      'holding toward the same wall did not climb three jumps without drifting away');
    return { fails };
  };

  CP.latePacing = () => {
    const [fails, expect] = checker();
    T.seed(628);
    const [g] = startFromTitle(1);
    const hud = game.scene.getScene('Hud');
    const begin = (arena, wave) => {
      g.scene.restart({ arena }); T.run(100);
      g.time.removeAllEvents(); g.startWave(wave);
    };
    const alive = () => g.enemies.getChildren().filter(e => e.alive);
    const clear = () => { for (const e of alive()) g.killEnemy(e, 1, 0, 'nail'); };
    const has = id => g.weaponSlots.includes(weaponSlot(id));

    begin(2, 5); T.run(2400);
    expect(g.campaignMachinery === 'presses' && g.mod === null && has('katana') && !has('rocket'),
      'Meltdown did not introduce the presses and Katana first');
    clear(); T.run(100);
    expect(g.activeHostiles() === 2 && !g.campaignReinforceAt, 'the slagling halves did not count toward the opening squad');
    clear(); T.run(100);
    expect(g.activeHostiles() === 4 && !g.campaignReinforceAt, 'the final slag fragments did not count toward the opening squad');
    clear(); T.run(4300);
    expect(g.campaignMachinery === 'presses' && !g.mod && g.activeHostiles() === 3, 'the press crew skipped its own fight');
    clear(); hud.drawIndicators(g, g.time.now);
    expect(!g.campaignMachinery && !g.mod && has('rocket') && !has('siphon') && g.activeHostiles() === 0 &&
      hud.routeDetail.visible && hud.routeDetail._text === 'CLIMB TO THE WALKWAYS', 'Meltdown did not give a safe, readable climb break');
    T.run(3100);
    expect(!g.mod && !g.activeHostiles(), 'the tide arrived during the climb break');
    T.run(3800);
    expect(g.mod === 'melt' && !g.campaignMachinery && g.activeHostiles() > 0, 'the presses ran during the slag-tide fight');
    clear(); T.run(5250);
    expect(g.mod === null && has('siphon'), 'the control guard arrived before the slag tide stopped');
    clear(); T.run(3100);
    expect(!g.boss && !g.mod && !g.campaignMachinery, 'the Wyrm skipped its clear-floor break');
    T.run(1800);
    expect(g.boss?.kind === 'wyrm' && !g.mod && !g.tide, 'the Wyrm arrived before the arena drained');

    begin(3, 6); T.run(3200);
    expect(has('drill') && !has('tractor') && !g.campaignMachinery, 'Demolition did not introduce the Drill with the ball parked');
    clear(); T.run(2500);
    expect(has('tractor') && !g.campaignMachinery && !g.activeHostiles(), 'the wrecking ball skipped the preparation break');
    T.run(200);
    expect(g.campaignMachinery === 'wreck' && !has('flak'), 'the wrecking ball did not start with its squad');

    begin(3, 7); T.run(2400);
    expect(!g.boss && !g.campaignMachinery, 'the Foreman arrived during the loadout briefing');
    T.run(400);
    expect(g.boss?.kind === 'foreman' && !g.campaignMachinery, 'the ball was active at the start of the Foreman fight');
    if (g.boss) { g.boss.hp = g.boss.def.hp * 0.55; T.run(100); }
    expect(g.campaignMachinery === 'wreck', 'the Foreman phase change did not release the ball');

    begin(4, 8); T.run(3100);
    const last = alive().pop();
    for (const e of alive()) if (e !== last) g.killEnemy(e, 1, 0, 'nail');
    expect(g.activeHostiles() === 1 && !g.campaignReinforceAt && !g.campaignMachinery && !has('prism'),
      'the Powerhouse queued reinforcements before the current squad was defeated');
    clear(); T.run(2500);
    expect(has('prism') && !g.campaignMachinery && !g.activeHostiles(), 'the rail crew skipped the walkway break');
    T.run(200);
    expect(g.campaignMachinery === 'rails' && g.railCyc.st === 'idle', 'the rails did not start with a charge-up');

    begin(4, 9); T.run(3400);
    expect(g.boss?.kind === 'boss' && !g.campaignMachinery, 'the rails were active at the start of the Smelter fight');
    if (g.boss) { g.boss.hp = g.boss.def.hp * 0.60; T.run(100); }
    expect(g.campaignMachinery === 'rails' && g.railCyc.st === 'idle', 'the Smelter phase change did not begin the rail charge');
    if (g.boss) { g.killEnemy(g.boss, 1, 0, 'nail'); T.run(100); }
    expect(!g.campaignMachinery, 'the rails kept running after the Smelter fell, so they could still kill the player before VICTORY');
    expect(campaignWeaponSlots(CAMPAIGN.length).length === 27, 'the new issue order changed the campaign arsenal size');
    return { fails };
  };

  // A test start (#173). Every act's test checkpoint passes campaignCheckpoint(); after loading slaghouse.html?act=N the
  // campaign page offers CONTINUE on act N's checkpoint. With play set, Continue starts act N's first operation, and
  // nothing it does counts toward lifetime stats, medals, the best run or the cleared flag.
  CP.actStart = (act, play = false) => {
    const [fails, expect] = checker();
    for (let n = 2; n <= CAMPAIGN_ACTS.length; n++) {
      const c = testCheckpoint(n), ok = campaignCheckpoint({ checkpoint: c, cleared: false });
      expect(ok && ok.arena === n - 1 && ok.wave === CAMPAIGN_ACTS[n - 1].first && ok.test, `campaignCheckpoint() turned down the act ${n} test start: ${JSON.stringify(c)}`);
      expect(ok && Object.keys(ok.perks).length === CAMPAIGN_ACTS[n - 1].first && OPENING_PERKS.some(id => ok.perks[id]), `the act ${n} test start has perks ${ok && Object.keys(ok.perks)}, want one per cleared operation, the first from the opening offer`);
      expect(ok && ok.stats.kills + campaignFoesFrom(ok.wave) === CAMPAIGN_TOTAL, `the act ${n} test start counts ${ok?.stats.kills} kills before it`);
    }
    const ts = title(), c = campaignCheckpoint();
    expect(ts.sub === 'campaign' && ts.subSel === 0, `?act=${act} did not open the campaign page on CONTINUE (page ${ts.sub}, pick ${ts.subSel})`);
    expect(c && c.test && c.arena === act - 1 && c.diff === OPTS.diff && c.mut === OPTS.mut, `?act=${act} saved ${JSON.stringify(c && { arena: c.arena, test: c.test, diff: c.diff, mut: c.mut })}`);
    expect(c && campaignWeaponSlots(c.wave).includes(c.weapon), 'the test start holds a weapon not earned by its act');
    if (!play || fails.length) return { fails };
    const life = JSON.stringify(LIFE), seen = SEEN.size;
    const [g] = startFromTitle(0);
    expect(g && g.campaign && g.A.id === act && g.testRun && !g.mode.lifetime, `Continue did not start a test run in act ${act} (arena ${g?.A.id}, test ${g?.testRun})`);
    if (fails.length) return { fails };
    T.run(4500);                                                        // the car arrives, the act's card, then its first operation
    expect(g.wave === CAMPAIGN_ACTS[act - 1].first, `the test start opened on operation ${g.wave + 1}, want ${CAMPAIGN_ACTS[act - 1].first + 1}`);
    const foe = g.enemies.getChildren().find(e => e.alive && !e.summoned);
    if (foe) g.killEnemy(foe, 1, 0, 'nail');
    g.award('speed');
    expect(!g.medals.has('speed'), 'a test run earned a medal');
    if (act < CAMPAIGN_ACTS.length) {                                    // down the lift: the next act is still a test run
      g.startWave = () => {};                                           // the act is done: its last operation rides the lift
      g.wave = CAMPAIGN_ACTS[act - 1].last;
      g.descend(); T.run(2600);
      delete g.startWave;
      const next = campaignCheckpoint();
      expect(g.A.id === act + 1 && g.testRun && next?.test && next.arena === act, `the lift from a test start saved ${JSON.stringify(next && { arena: next.arena, test: next.test })} (arena ${g.A.id}, test ${g.testRun})`);
    }
    g.win(); T.run(2500);
    const save = loadCampaign();
    expect(JSON.stringify(LIFE) === life && SEEN.size === seen, `a test run counted toward lifetime stats or the codex: ${life} -> ${JSON.stringify(LIFE)}`);
    expect(save && !save.cleared && !save.checkpoint, `a won test run left the save ${JSON.stringify(save && { cleared: save.cleared, checkpoint: !!save.checkpoint })}, want it uncleared with the test checkpoint gone`);
    expect(localStorage.getItem(RUN_MODES.campaign.record) === null, 'a test run filed a best run');
    return { fails: [...fails, ...T.errs] };
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
