// GameScene, continued: the foes: each ENEMY record's setup, update, visuals, death, armour and contact methods (#166).
// Plain methods added to the class after it, so src/join.mjs stays a concatenation: game.js must come first.
Object.assign(GameScene.prototype, {

  // Each foe kind's own set-up when it spawns: the fields its update reads, the glow, gun or thruster images it
  // carries, and where it really starts (a ceiling, the air, under the floor). Its ENEMY record names the method
  // as setup (setupHumanoid for the humanoids without their own, setupMolten for the slag), and spawnEnemy calls
  // it after the fields every foe shares. x and y are the spawn point, cx and cy its tile.
  setupTick(e, x, y, cx, cy) {
    Object.assign(e, { path: null, pathI: 0, navAir: false, navAirT: 0, goalNode: -1, stuckT: 0, repathT: 0, armT: 0, ai: 'idle' });
  },
  setupBoss(e, x, y, cx, cy) {
    e.body.setAllowGravity(true);
    Object.assign(e, { ai: 'walk', phase: 1, atkCd: 2.5, leapCd: 2, introT: 2.4, breathA: 0, mortarN: 0, summonCycle: 0 });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xff8a20).setScale(1.5).setAlpha(0.45).setDepth(4.6);     // heat halo behind the hull
  },
  setupMender(e, x, y, cx, cy) {
    e.body.setAllowGravity(false);
    Object.assign(e, { patient: null, retargetT: 0, dodgeCd: 0, healing: false });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0x40ff90).setScale(0.7).setAlpha(0.7).setDepth(18);
  },
  setupDrone(e, x, y, cx, cy) {
    e.body.setAllowGravity(false);
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xff3020).setScale(0.55).setAlpha(0.8).setDepth(18);
    e.thr = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0x50b0ff).setScale(0.4).setAlpha(0.6).setDepth(18);
  },
  setupGunship(e, x, y, cx, cy) {
    const D = e.def;
    e.body.setAllowGravity(false);
    const profile = this.campaign ? TUNE.CAMPAIGN_GUNSHIP : null;
    if (profile) { e.def = { ...D, hp: profile.hp }; e.hp = profile.hp; }
    Object.assign(e, { ai: 'cruise', side: 1, sideT: 3, volT: profile?.firstVolley ?? 2.5, dropT: profile?.firstDrop ?? 4,
      strT: profile?.firstStrafe ?? 6, drops: 0, shots: 0, shotT: 0, strDir: 1, attackRest: 0 });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xff3020).setScale(0.7).setAlpha(0.6).setDepth(18);
    e.thr = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0x6ab0ff).setScale(1.6).setAlpha(0.5).setDepth(18);
  },
  setupScreamer(e, x, y, cx, cy) {
    e.body.setAllowGravity(false);
    Object.assign(e, { ai: 'hover', head: 0, spd: 0, atkT: rand(0.6, 1.8) });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xff5020).setScale(0.5).setAlpha(0.8).setDepth(18);
  },
  setupWarden(e, x, y, cx, cy) {
    e.body.setAllowGravity(false);
    Object.assign(e, { links: [], linkT: 0 });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0x60e0ff).setScale(0.5).setAlpha(0.8).setDepth(18);
  },
  setupJugg(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'walk', stage: 0, aimA: 0, spin: 0, atkCd: 2, shotT: 0, recoil: 0, stepK: 0 });
    e.gun = this.add.image(x, y, 'gun_jugg').setOrigin(4 / 30, 6.5 / 12).setDepth(6);
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xff3020).setScale(0.4).setAlpha(0.85).setDepth(18);
  },
  setupJet(e, x, y, cx, cy) {
    e.body.setAllowGravity(false);
    Object.assign(e, { ai: 'fly', side: Math.random() < 0.5 ? -1 : 1, sideT: rand(2, 4), aimA: 0, recoil: 0, shotsLeft: 0, shotT: 0, fireCd: rand(1, 2) });
    e.gun = this.add.image(x, y, 'gun_smg').setOrigin(2 / 18, 4.5 / 9).setDepth(6);
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xffe040).setScale(0.3).setAlpha(0.85).setDepth(18);
    e.thr = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0x6ab0ff).setScale(0.7).setAlpha(0.6).setDepth(18);
  },
  setupBrood(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'crawl', atkCd: 2 });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xe8d040).setScale(1.3).setAlpha(0.3).setDepth(4.8);
  },
  setupWasp(e, x, y, cx, cy) {
    e.body.setAllowGravity(false);
    Object.assign(e, { ai: 'patrol', runDir: 1, runY: y, bombs: 0, bombT: 0 });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xff3020).setScale(0.45).setAlpha(0.8).setDepth(18);
    e.thr = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xc0e0ff).setScale(0.6).setAlpha(0.3).setDepth(18);
  },
  setupRammer(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'patrol', atkCd: 1.5, hitSet: new Set(), hitP: false, stepK: 0 });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xff3b1f).setScale(0.4).setAlpha(0.8).setDepth(18);
  },
  setupHeavy(e, x, y, cx, cy) {
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xff7a1a).setScale(0.8).setAlpha(0.55).setDepth(18);
  },
  setupMolten(e, x, y, cx, cy) {
    const D = e.def;
    Object.assign(e, { ai: 'hop', hopT: rand(0.4, 1.2), landT: 0 });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xff7020).setScale(0.5 + D.tier * 0.35).setAlpha(0.55).setDepth(18);
  },
  setupBurrower(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'exposed', aiUntil: this.time.now + 700, under: false, ux: x, floorY: (cy + 1) * TS, cd: 1.5, trailT: 0, rumT: 0, glowT: 0, hitP: false });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xff6a10).setScale(0.6).setAlpha(0.7).setDepth(18);
  },
  setupHive(e, x, y, cx, cy) {
    e.body.setAllowGravity(false);
    Object.assign(e, { spawnT: 0.8 });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xe8d040).setScale(1).setAlpha(0.35).setDepth(18);
  },
  setupGnat(e, x, y, cx, cy) {
    e.body.setAllowGravity(false);
    Object.assign(e, { hive: null, ph: rand(0, 6), panicDie: 0 });
  },
  setupStitcher(e, x, y, cx, cy) {
    e.body.setAllowGravity(false);
    Object.assign(e, { ai: 'seek', corpse: null, chanT: 0, chanDmg: 0, cd: 1.5, retargetT: 0, humT: 0 });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0x60ff70).setScale(0.5).setAlpha(0.7).setDepth(18);
  },
  setupWyrm(e, x, y, cx, cy) {
    e.body.setAllowGravity(false);
    const fy = (cy + 1) * TS;
    Object.assign(e, { ai: 'sink', under: false, ux: x, floorY: fy, cd: 1.2, hist: [], hx: x, hy: fy - 13, vx: 0, vy: 260, sinkT: 0.35, trailT: 0, rumT: 0, spitT: 0, segs: [], pattern: 'breach', wyrmAng: Math.PI / 2, touchCd: 0 });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xff6a10).setScale(1.2).setAlpha(0.6).setDepth(18);
    for (let i = 0; i < TUNE.WYRM.segs; i++) {
      const sg = this.spawnEnemy('wyrmseg', cx, cy);
      Object.assign(sg, { head: e, idx: i, summoned: true, under: true, dir: 1 });
      sg.body.enable = false; sg.setVisible(false); sg.body.reset(x, LH + 300);
      if (i >= TUNE.WYRM.segs - 2) sg.setScale(0.75);
      e.segs.push(sg);
    }
  },
  setupWyrmseg(e, x, y, cx, cy) {
    e.body.setAllowGravity(false);
  },
  setupLinker(e, x, y, cx, cy) {
    e.body.setAllowGravity(false);
    Object.assign(e, { lid: ++this.linkerSeq, partner: null, linkT: 0, phase: 'off', beamT: rand(1, 2), trackY: y, beam: null, zapT: 0, fireCd: 1.5 });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0x40f0ff).setScale(0.45).setAlpha(0.8).setDepth(18);
  },
  setupBuzzsaw(e, x, y, cx, cy) {                                      // ricochets at a constant clip; steers at you off every wall
    e.body.setAllowGravity(false); e.body.setBounce(1, 1);
    const a = rand(0, Math.PI * 2), v = TUNE.BUZZSAW.speed * 0.55;
    e.body.setVelocity(Math.cos(a) * v, Math.sin(a) * v);
    Object.assign(e, { ai: 'saw', owned: 0, ownHit: false, hitMap: new Map(), bounceT: 0, pHitT: 0, whirT: 0 });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xff8a20).setScale(0.55).setAlpha(0.6).setDepth(18);
  },
  setupLugger(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'seek', carry: false, tgtBarrel: null, stepK: 0, carryImg: null, rockCd: 2 });
  },
  setupBlimp(e, x, y, cx, cy) {
    e.body.setAllowGravity(false);
    Object.assign(e, { ai: 'drift', bombT: 1.5, side: Math.random() < 0.5 ? -1 : 1, crash: false });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xff3020).setScale(0.3).setAlpha(0.8).setDepth(18);
  },
  setupStrider(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'walk', cd: rand(2, 3.5), stepK: 0, a0: 0, beamA: 0, hitT: 0, lastStep: 0 });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xff3020).setScale(0.35).setAlpha(0.85).setDepth(18);
  },
  setupCinder(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'roll', owned: 0, lastTrailX: x, hitMap: new Map(), spinA: 0 });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xff8a20).setScale(0.6).setAlpha(0.7).setDepth(4.9);
  },
  setupGatling(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'walk', stepK: 0, cd: rand(1, 2), aimA: 0, shotT: 0 });
  },
  setupBanner(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'walk', stepK: 0, plantT: rand(1, 2), healT: 0 });
  },
  setupBulldozer(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'drive', stepK: 0, crushT: 0, stuckT: 0 });
  },
  setupCopycat(e, x, y, cx, cy) {
    e.body.setAllowGravity(false);
    Object.assign(e, { ai: 'drift', cd: rand(1.2, 2), burst: 0, burstT: 0, mode: 'rapid', icon: this.add.image(x, y, 'icon_nail').setDepth(5.1).setScale(0.8).setAlpha(0.85) });
  },
  setupJelly(e, x, y, cx, cy) {
    e.body.setAllowGravity(false);
    Object.assign(e, { ai: 'drift', zapT: 0 });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xff80e0).setScale(0.5).setAlpha(0.6).setDepth(4.9);
  },
  setupPorcupine(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'walk', stepK: 0, cd: rand(2, 3.5), quillAcc: 0 });
  },
  setupSponge(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'walk', stepK: 0, charge: 0 });
  },
  setupLeaper(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'walk', stepK: 0, cd: rand(1.5, 2.5), tx: 0, ty: 0 });
  },
  setupZealot(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'walk', stepK: 0, cd: rand(1.5, 2.5), souls: 0 });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xffe080).setScale(0.3).setAlpha(0.6).setDepth(4.9);
  },
  setupMinelayer(e, x, y, cx, cy) {
    e.body.setAllowGravity(false);
    Object.assign(e, { ai: 'drift', cd: rand(1, 2) });
  },
  setupRatking(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'walk', stepK: 0, shedT: rand(2, 3.5) });
  },
  setupRatbot(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'run', hopT: rand(0.5, 1.5), jit: rand(-30, 30) });
  },
  setupHeadsman(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'walk', stepK: 0, chopOk: 0 });
  },
  setupBerserker(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'walk', stepK: 0, rage: false, swingCd: 0 });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xff2020).setScale(0.6).setAlpha(0).setDepth(4.9);
  },
  setupBastion(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'walk', stepK: 0, cd: rand(1, 2), wall: null });
  },
  setupShellback(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'walk', stepK: 0, bashOk: 0, flipped: false });
  },
  setupShinobi(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'ground', aiUntil: 0, threw: false, leapT: 0, clingOk: 0, clingSide: 0 });
  },
  setupThundercloud(e, x, y, cx, cy) {
    e.body.setAllowGravity(false);
    Object.assign(e, { ai: 'drift', cd: rand(1.5, 2.5), strikeY: LH });
  },
  setupForeman(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'walk', phase: 1, atkCd: 2.5, atkN: 0, shots: 0, shotT: 0, stepK: 0 });
  },
  setupVortex(e, x, y, cx, cy) {
    e.body.setAllowGravity(false);
    Object.assign(e, { ai: 'drift', cd: rand(2.5, 4), shredT: 0 });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0x9ad8ff).setScale(0.35).setAlpha(0.7).setDepth(18);
  },
  setupPylon(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'idle', cd: rand(1, 2), chargeT: 0 });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0x80c8ff).setScale(0.3).setAlpha(0.8).setDepth(18);
  },
  setupScavenger(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'run', stepK: 0, growN: 0, meal: null, leapOk: 0 });
  },
  setupTorcher(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'walk', stepK: 0, sprayOk: 0, baseA: 0, flameA: 0, tick: 0, tankHitT: -1e9 });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xff8a20).setScale(0.3).setAlpha(0.7).setDepth(18);
  },
  setupDiscus(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'walk', stepK: 0, cd: rand(1.2, 2.2), disc: null });
  },
  setupSporepod(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'idle', cd: rand(1, 2.5), puffT: 0 });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xb8e040).setScale(0.6).setAlpha(0.5).setDepth(4.9);
  },
  setupGrappler(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'walk', stepK: 0, grabOk: 0, holdDmg: 0 });
  },
  setupSpotter(e, x, y, cx, cy) {
    e.body.setAllowGravity(false);
    Object.assign(e, { lockT: 0 });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xff2020).setScale(0.3).setAlpha(0.8).setDepth(18);
  },
  setupHound(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'run', stepK: 0, leapOk: 0, side: (this.houndN = (this.houndN || 0) + 1) % 2 ? 1 : -1 });
  },
  setupOrbiter(e, x, y, cx, cy) {
    e.body.setAllowGravity(false);
    Object.assign(e, { plates: [1, 1, 1].map(() => TUNE.ORBITER.plateHp), plateHit: [0, 0, 0], spin: rand(0, 6), fireFr: 0, fireCd: rand(1.5, 2.5) });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0x46e6ff).setScale(0.35).setAlpha(0.8).setDepth(18);
  },
  setupSwapper(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'walk', cd: rand(3, 4.5), stepK: 0, tellDmg: 0, burst: 0, burstT: 0, fireCd: rand(1, 2) });
  },
  setupScorcher(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'rest', stepK: 0, lastTrailX: x, turned: false });
  },
  setupWraith(e, x, y, cx, cy) {
    e.body.setAllowGravity(false);
    Object.assign(e, { ai: 'drift', inWall: false, strikeOk: 0 });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0x9a70ff).setScale(0.4).setAlpha(0.7).setDepth(18);
  },
  setupChiller(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'walk', cd: rand(1.5, 2.5), stepK: 0 });
  },
  setupWarhorn(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'roll', cd: rand(2.5, 4), stepK: 0 });
  },
  setupSpikeball(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'roll', spinA: 0, rage: false });
  },
  setupPara(e, x, y, cx, cy) {                                         // starts high above the floor under its chute
    const fy = this.floorBelow(x, y) ?? (cy + 6) * TS;
    e.body.reset(x, Math.max(40, fy - 260)); e.body.setAllowGravity(false);
    Object.assign(e, { ai: 'drop', burstT: rand(0.6, 1.2), shots: 0, shotT: 0, chute: true, stepK: 0 });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xff6a20).setScale(0.25).setAlpha(0.8).setDepth(18);
  },
  setupBeacon(e, x, y, cx, cy) {
    e.body.setAllowGravity(false);
    Object.assign(e, { ai: 'hover', cd: rand(1, 2), callT: 0 });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xff3020).setScale(0.35).setAlpha(0.85).setDepth(18);
  },
  setupSlug(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'crawl', trailT: 0, spitCd: rand(1.5, 3), stepK: 0 });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0x9aff4a).setScale(0.4).setAlpha(0.45).setDepth(18);
  },
  setupLeech(e, x, y, cx, cy) {
    e.body.setAllowGravity(false);
    Object.assign(e, { ai: 'seek', ox: 0, oy: 0, drainT: 0, offT: 0 });
  },
  setupEcho(e, x, y, cx, cy) {                                         // a hologram replaying where you were 1.5 s ago
    e.body.setAllowGravity(false); e.setAlpha(0.6);
    Object.assign(e, { ai: 'replay', fireCd: 1 });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0x60e0ff).setScale(0.8).setAlpha(0.35).setDepth(18);
  },
  setupPilferer(e, x, y, cx, cy) {
    e.body.setAllowGravity(false);
    Object.assign(e, { ai: 'seek', stolen: -1, escapeT: TUNE.PILFER.escape, gunImg: null });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xff4060).setScale(0.3).setAlpha(0.8).setDepth(18);
  },
  setupPogo(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'crouch', crouchT: 0.4, slamming: false });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0x60ff9a).setScale(0.3).setAlpha(0.8).setDepth(18);
  },
  setupClaw(e, x, y, cx, cy) {                                         // a crane claw on a trolley under the roof
    e.body.setAllowGravity(false);
    let ty = y; for (let yy = y; yy > 24; yy -= 8) { if (this.solidAt(x, yy - 10)) { ty = yy; break; } ty = yy; }
    e.body.reset(x, ty); Object.assign(e, { ai: 'track', homeY: ty, cd: rand(1.5, 2.5), grab: false, grabDmg: 0, liftT: 0 });
    e.glow = this.add.image(x, ty, 'glow').setBlendMode(ADD).setTint(0xffb040).setScale(0.3).setAlpha(0.8).setDepth(18);
  },
  setupSparker(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'hop', hopT: rand(0.3, 0.9) });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0x60e0ff).setScale(0.35).setAlpha(0.8).setDepth(18);
  },
  setupGolem(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'walk', throwCd: rand(1.5, 2.5), slamCd: 1, stepK: 0, lastStep: 0, shed: 0 });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xff7a20).setScale(0.7).setAlpha(0.6).setDepth(18);
  },
  setupCreeper(e, x, y, cx, cy) {                                      // climbs to the nearest ceiling first
    e.body.setAllowGravity(false); e.body.setVelocity(0, -300);
    Object.assign(e, { ai: 'climb', climbT: 1.2, groundT: 0, stepK: 0, hitP: false });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xb0ff40).setScale(0.3).setAlpha(0.8).setDepth(18);
  },
  setupRoller(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'walk', cd: rand(1.5, 2.5), stepK: 0, rollDir: 1, rollT: 0, bounces: 0, spinA: 0, hitP: false });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xffa040).setScale(0.3).setAlpha(0.7).setDepth(18);
  },
  setupJammer(e, x, y, cx, cy) {
    e.body.setAllowGravity(false);
    Object.assign(e, { ai: 'hover', cd: rand(2, 3.5), side: Math.random() < 0.5 ? -1 : 1, sideT: rand(3, 5) });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0x60ff9a).setScale(0.4).setAlpha(0.7).setDepth(18);
  },
  setupGasbag(e, x, y, cx, cy) {
    e.body.setAllowGravity(false);
    Object.assign(e, { ai: 'drift', ph: rand(0, 6) });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0x9aff4a).setScale(0.6).setAlpha(0.35).setDepth(18);
  },
  setupWelder(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'walk', buildCd: rand(3, 6), patient: null, scanT: 0, stepK: 0, turrets: [] });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xffd040).setScale(0.3).setAlpha(0.85).setDepth(18);
  },
  setupTurret(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'watch', fireCd: rand(0.8, 1.4), aimA: -Math.PI / 2, owner: null });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xff3020).setScale(0.25).setAlpha(0.85).setDepth(18);
  },
  setupMimic(e, x, y, cx, cy) {                                        // sits among the drums as one of them
    Object.assign(e, { ai: 'hide', stepK: 0, lonelyT: 0.5, dir: 1 });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xffe040).setScale(0.3).setAlpha(0).setDepth(18);
  },
  setupHowitzer(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'walk', cd: rand(2, 3.5), shells: 0, shotT: 0, stepK: 0, lastStep: 0, recoilT: 0 });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xff3020).setScale(0.35).setAlpha(0.85).setDepth(18);
  },
  setupBlinker(e, x, y, cx, cy) {
    e.body.setAllowGravity(false);
    Object.assign(e, { ai: 'float', cd: rand(1, 2), tx: x, ty: y, dvx: 0, dvy: 0, hitP: false, next: 'strike' });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0x60f0ff).setScale(0.3).setAlpha(0.85).setDepth(18);
  },
  setupMagnet(e, x, y, cx, cy) {
    e.body.setAllowGravity(false);
    Object.assign(e, { ai: 'hover', pulseT: rand(1.5, 2.5), side: Math.random() < 0.5 ? -1 : 1, sideT: rand(3, 5) });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0x6a8aff).setScale(0.6).setAlpha(0.6).setDepth(18);
  },
  setupHumanoid(e, x, y, cx, cy) {
    const D = e.def, kind = e.kind;
    Object.assign(e, { ai: 'idle', path: null, pathI: 0, navAir: false, navAirT: 0, lkx: x, lky: y, lkT: -1e9, lastSeenT: -1e9,
      dodgeCd: 0, fleeT: 0, fleeDir: 1, attackCd: 0, repickT: 0, repathT: 0, retreated: false, bursts: 0, shotsLeft: 0, shotT: 0,
      reloadT: 0, aimA: e.dir > 0 ? 0.25 : Math.PI - 0.25, aimStart: 0, stuckT: 0, lookT: rand(1, 3), goalNode: -1, recoil: 0, searchUntil: 0,
      fr: D.frame0, face: e.dir, shieldUp: kind === 'bulwark' || kind === 'mirror', healCheckT: 0, pack: null });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint({ enforcer: 0xff3020, stalker: 0x7dff4a, bulwark: 0xff9a2a, sniper: 0x60c0ff, rocketeer: 0xff8a20, sapper: 0x7dff4a, cloaker: 0x40f0ff, pyro: 0xffb040, harpooner: 0xffe040, mirror: 0xe080ff, tarspit: 0xffa040, duelist: 0xff2a5a, grenadier: 0xff8a20 }[kind]).setScale(0.3).setAlpha(0.85).setDepth(18);
    if (kind === 'harpooner') { e.hk = null; e.reelDmg = 0; e.fireCd = rand(1, 2); e.hkImg = this.add.image(x, y, 'harpoon').setDepth(9).setVisible(false); }
    if (kind === 'enforcer') e.gun = this.add.image(x, y, 'gun_rifle').setOrigin(2 / 24, 5.5 / 11).setDepth(6);
    if (kind === 'sniper') { e.gun = this.add.image(x, y, 'gun_sniper').setOrigin(2 / 34, 4.5 / 9).setDepth(6); e.fireCd = 1; }
    if (kind === 'rocketeer') { e.gun = this.add.image(x, y, 'gun_rlaunch').setOrigin(2 / 26, 5.5 / 11).setDepth(6); e.fireCd = 1.5; }
    if (kind === 'sapper') e.plantCd = rand(1, 2.5);
  },

  // ------------------------------------------------------------------- ticks ----
  // Little bomb-crawlers: path to you, leap the last bit, arm (beeping, swelling) and pop. Shoot them near
  // their friends: a dead tick still blows, and blasts chain.
  updateTick(e, dt, now, dx, dy, dist, alive) {
    const b = e.body, T = TUNE.TICK, onGround = b.blocked.down || b.touching.down, pb = this.player.body;
    e.jumpCd -= dt; e.repathT -= dt;
    if (e.navAir && onGround && now > e.navAirT + 80) e.navAir = false;
    if (e.armT > 0) {
      e.armT -= dt; if (onGround) b.velocity.x *= Math.pow(0.01, dt);
      e.fr = Math.floor(now / 50) % 2 ? 'ka' : 'k0'; e.setScale(1 + (1 - e.armT / (T.fuse / 1000)) * 0.4);
      if (Math.floor(now / 90) % 2 === 0) Sfx.beep();
      if (e.armT <= 0) this.tickBoom(e);
      return;
    }
    if (!e.aggro && alive && (e.sees || dist < 110)) { e.aggro = true; Sfx.chirp(); this.popAlert(e); }
    if (e.aggro && alive && e.stunT <= 0) {
      if (dist < T.armRange) { e.armT = T.fuse / 1000; Sfx.chirp(); return; }
      if (onGround && e.sees && dist < 95 && e.jumpCd <= 0) {
        b.velocity.x = Math.sign(dx) * T.leap; b.velocity.y = -190 - Math.max(0, -dy) * 2.2; e.jumpCd = 1.1; e.path = null; e.navAir = false; Sfx.chirp();
      } else if (onGround && !e.navAir) {
        if (e.repathT <= 0) { e.repathT = 0.4; this.pathTo(e, navBelow(pb.center.x, pb.bottom - 2), 140); }
        if (!this.followPath(e, now, onGround, T.speed, dt)) b.velocity.x = approach(b.velocity.x, Math.sign(dx) * T.speed, 1600 * dt);
      } else if (e.navAir) this.followPath(e, now, onGround, T.speed, dt);
    } else if (onGround && e.stunT <= 0) b.velocity.x = approach(b.velocity.x, 0, 600 * dt);
    if (Math.abs(b.velocity.x) > 5) e.dir = b.velocity.x > 0 ? 1 : -1;
    e.animT += dt * Math.abs(b.velocity.x) / 12;
    e.fr = Math.floor(e.animT) % 2 ? 'k1' : 'k0';
  },

  // ------------------------------------------------------------------ sniper ----
  // Picks high, far perches with a view of you, holds still to take a long tracked shot (blue laser, locks
  // for the last quarter), then relocates. Runs if you get close.
  thinkSniper(e, dt, now, c) {
    const T = TUNE.SNIPER;
    e.fireCd -= dt; e.repickT -= dt;
    switch (e.ai) {
      case 'idle': this.lookAround(e, dt); return 'hold';
      case 'dodge': if (c.onGround && now > e.aiUntil + 120) { e.ai = 'engage'; e.repickT = 0; } return 'free';
      case 'aim': {
        const k = (now - e.aimStart) / T.aimMs;
        if (k < T.lockAt) e.aimA = this.leadAngle(e, T.bulletSpeed);
        if ((!c.canSee && k < 0.6) || c.dist < 100) { e.ai = 'engage'; e.fireCd = 0.6; e.repickT = 0; return 'hold'; }
        if (now >= e.aiUntil) {                                // fire, and often move before you can answer
          this.sniperShoot(e); e.fireCd = T.fireCd; e.ai = 'engage'; e.repickT = 0.4;
          if (Math.random() < TUNE.AI.scoot) { e.scoot = true; e.repickT = 0.15; }
        }
        return 'hold';
      }
      default: {
        if (!c.alive || now - e.lkT > 9000) { e.ai = 'idle'; e.aggro = false; return 'hold'; }
        if (c.onGround && !e.navAir && e.repickT <= 0) {
          if (c.dist < 130) { e.repickT = 1.2; this.pickPosition(e, 'retreat'); }
          else {
            e.repickT = rand(4, 6);
            if (!this.pickPosition(e, 'snipe')) this.pickPosition(e, 'attack');
            if (e.scoot && e.path?.length > 2) this.bark(e, 'MOVING!', '#9adcff');
            e.scoot = false;
          }
        }
        const settled = !e.path || e.pathI >= e.path.length;
        if (c.canSee && c.onGround && !e.navAir && settled && e.fireCd <= 0 && c.dist > 100) {
          this.aimStart(e, now, T.aimMs); Sfx.laser(); return 'hold';
        }
        return 'path';
      }
    }
  },

  // -------------------------------------------------------------------- boss ----
  // THE SMELTER: walks its level, leaps between levels (each landing sends slam waves along the floor),
  // lobs slag mortars at marked spots, breathes fire from phase 2, spits ticks in phase 3.
  // Hits to the head / furnace (top of the body) crit for x1.5.
  updateBoss(e, dt, now, dx, dy, dist, alive) {
    const b = e.body, onGround = b.blocked.down || b.touching.down, pb = this.player.body;
    const hpF = e.hp / e.def.hp, phase = hpF > 0.66 ? 1 : hpF > 0.33 ? 2 : hpF > 0.15 ? 3 : 4, rage = phase === 4 ? 1.8 : phase === 3 ? 1.5 : phase === 2 ? 1.25 : 1;
    e.stunT = 0;
    if (phase !== e.phase) {
      const chargeRails = this.campaign && alive && phase >= 2 && this.campaignMachinery !== 'rails';
      if (chargeRails) this.setCampaignMachinery('rails');
      e.phase = phase; BUS.emit('callout', chargeRails ? (this.powerCut ? 'RAILS HOTWIRED' : 'RAILS CHARGING') : phase === 2 ? 'IT GETS HOTTER' : phase === 3 ? 'MELTDOWN!' : 'OVERHEAT!'); Sfx.roar(); this.shake(500, 0.012); e.atkCd = 1.2;   // with the power cut, it feeds the rails itself
      if (phase === 4) { this.impactFrame(2); BUS.emit('flash', 0.35); this.slowmoUntil = Math.max(this.slowmoUntil, now + 500); e.ringCd = 1; for (let i = 0; i < 6; i++) this.spawnGib('g_plate', e.x + rand(-14, 14), e.y - 10, rand(-200, 200), rand(-320, -160), 'metal'); }   // its armour blows off
    }
    if (phase === 4 && alive && e.introT <= 0) {                        // OVERHEAT: a ring of slag every 4 s, and it sheds sparks
      if (Math.random() < 0.6) this.fxSparks(e.x + rand(-16, 16), e.y + rand(-16, 10), 1, -Math.PI / 2, 2, [40, 160]);
      if ((e.ringCd -= dt) <= 0 && onGround) { e.ringCd = 4; this.bossRing(e); }
    }
    if (onGround && !e.wasGround && e.airT > 0.25) this.bossSlam(e);
    e.airT = onGround ? 0 : e.airT + dt; e.wasGround = onGround;
    if (Math.random() < 0.35) this.fx.emit(e.x - e.dir * 13 + rand(-3, 3), b.top - 6, { n: 1, angle: -Math.PI / 2, spread: 0.4, speed: [20, 50], life: [0.6, 1.2], size: [3, 9], cols: [0x6a5a50, 0x403530, 0x2a2420], alpha: [0.5, 0], g: -20, drag: 1 });
    if (e.introT > 0) { e.introT -= dt; b.velocity.x = 0; e.fr = 'w0'; if (e.introT < 1.3 && !e.roared) { e.roared = true; Sfx.roar(); this.shake(700, 0.012); } return; }
    if (!alive) { b.velocity.x = approach(b.velocity.x, 0, 400 * dt); e.fr = 'w0'; return; }
    e.atkCd -= dt * rage; e.leapCd -= dt;
    switch (e.ai) {
      case 'mortarWind':
        b.velocity.x = 0; e.fr = 'wind';
        if (now >= e.aiUntil) { this.bossMortar(e, phase); e.ai = 'walk'; e.atkCd = 2.4 / rage; }
        return;
      case 'breathWind':
        b.velocity.x = 0; e.fr = 'breath';
        if (now >= e.aiUntil) { e.ai = 'breath'; e.aiUntil = now + 1500; e.breathA = Math.atan2(pb.center.y - (b.top + 10), pb.center.x - e.x); Sfx.roar(); }
        return;
      case 'breath': {
        b.velocity.x = 0; e.fr = 'breath';
        const mx = e.x + e.dir * 18, my = b.top + 10, want = Math.atan2(pb.center.y - my, pb.center.x - mx);
        let da = want - e.breathA; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
        e.breathA += clamp(da, -1.1 * dt, 1.1 * dt);                   // sweeps after you, but slowly
        e.dir = Math.cos(e.breathA) >= 0 ? 1 : -1;
        for (let i = 0; i < 3; i++) this.fx.emit(mx, my, { n: 1, angle: e.breathA, spread: 0.45, speed: [200, 280], life: [0.35, 0.55], size: [3, 9], cols: [0xffffff, 0xfff0a0, 0xffb040, 0xff6a1a, 0xc03010, 0x502820], add: true, drag: 1.2, g: -50 });
        if (Math.random() < 0.5) this.spawnLight(mx + Math.cos(e.breathA) * 50, my + Math.sin(e.breathA) * 50, 'glow', 0xff8a30, 3, 3.6, 0.5, 0.1);
        e.breathTick = (e.breathTick || 0) - dt;
        if (e.breathTick <= 0) {
          e.breathTick = 0.2;
          const d = Math.hypot(pb.center.x - mx, pb.center.y - my);
          let a2 = Math.abs(Math.atan2(pb.center.y - my, pb.center.x - mx) - e.breathA) % (Math.PI * 2); if (a2 > Math.PI) a2 = Math.PI * 2 - a2;
          if (this.state !== 'dead' && d < 140 && a2 < 0.4 && this.los(mx, my, pb.center.x, pb.center.y)) this.hurtPlayer(6, mx, { knock: false, iframes: false });
          for (const o of this.enemies.getChildren()) if (o.alive && o !== e && Math.hypot(o.x - mx, o.y - my) < 120) this.ignite(o, 1);
        }
        if (now >= e.aiUntil) { e.ai = 'walk'; e.atkCd = 2.0 / rage; }
        return;
      }
      case 'slamWind':
        b.velocity.x = 0; e.fr = 'crouch';
        if (now >= e.aiUntil) {
          e.ai = 'air'; b.velocity.y = -430; b.velocity.x = clamp(dx * 1.1, -220, 220); Sfx.whoosh();
          if (dy > 24 && Math.abs(b.velocity.x) < 130) b.velocity.x = (dx >= 0 ? 1 : -1) * 130;   // you're below: leap clear of the ledge
          if (Math.abs(b.velocity.x) < 90) b.velocity.x = (dx >= 0 ? 1 : -1) * 90;
          e.leapVx = b.velocity.x;
        }
        return;
      case 'air':
        e.fr = 'wind';
        if (!onGround) b.velocity.x = e.leapVx;                          // keep the push while scraping up a crate face
        if (onGround && e.airT === 0 && now > e.aiUntil + 200) { e.ai = 'walk'; e.atkCd = 1.8 / rage; }
        return;
      default: {
        e.dir = dx >= 0 ? 1 : -1;
        const ledge = !this.standAt(b.center.x + e.dir * (b.halfWidth + 6), b.bottom + 4), below = dy > 24;
        // drops off ledges after you (the landing slams); only a ledge with you above it stops the walk
        const go = (Math.abs(dx) > 50 || (below && ledge)) && (!ledge || below);
        b.velocity.x = approach(b.velocity.x, go ? e.dir * TUNE.BOSS.speed * rage * (ledge ? 1.6 : 1) : 0, 400 * dt);
        if (onGround && e.atkCd <= 0) {
          e.summonCycle++;
          if (phase >= 3 && e.summonCycle % 3 === 0) { this.bossSummon(e); e.atkCd = 1.6; }
          else if (dist < 130 && phase >= 2 && Math.random() < 0.5) { e.ai = 'breathWind'; e.aiUntil = now + 600; }
          else if (dist < 150 || (Math.abs(dy) > 50 && e.leapCd <= 0)) { e.ai = 'slamWind'; e.aiUntil = now + 450; e.leapCd = 3; }
          else { e.ai = 'mortarWind'; e.aiUntil = now + 550; Sfx.charge(0.7); }
        } else if (onGround && e.leapCd <= 0 && ((ledge && !below && Math.abs(dx) > 90) || (go && (e.dir > 0 ? b.blocked.right : b.blocked.left)))) {
          e.ai = 'slamWind'; e.aiUntil = now + 450; e.leapCd = 3;                                     // leap up ledges and over crates
        }
        const moving = Math.abs(b.velocity.x) > 5, prevStep = Math.floor(e.animT);
        if (moving) e.animT += dt * Math.abs(b.velocity.x) / 14;
        e.fr = !onGround ? 'wind' : 'w' + (moving ? Math.floor(e.animT) % 4 : 0);
        if (moving && Math.floor(e.animT) !== prevStep && Math.floor(e.animT) % 2 === 0) { this.shake(60, 0.002); Sfx.land(0.6); }
      }
    }
  },

  // Each foe kind's own death: its blasts, spills, loose parts and a boss's fall. Its ENEMY record names the
  // method as death, and killEnemy calls it once the gibs fly and an elite has burst, before the shared steps
  // after it (the souls a zealot drinks, limpets dropping off, a kick's orb, a ripper kill's heal).
  deathTick(e, cx, cy, dx, src, charred) {
    if (src !== 'tickboom' && src !== 'shatter') this.time.delayedCall(70, () => this.explode(cx, cy, TUNE.TICK));   // dead ticks still go off (chains!)
  },
  deathBrood(e, cx, cy, dx, src, charred) {
    this.time.delayedCall(60, () => this.broodBirth(cx, cy - 4, e.dir, TUNE.BROOD.burst, null));   // and out they all come
  },
  deathScreamer(e, cx, cy, dx, src, charred) {
    if (src !== 'tickboom' && src !== 'shatter') this.time.delayedCall(40, () => this.explode(cx, cy, TUNE.SCREAMER.boom));   // shot down mid-air: still goes off
  },
  deathWarden(e, cx, cy, dx, src, charred) {
    if ((e.links || []).some(o => o.alive)) { BUS.emit('callout', 'SHIELDS DOWN'); for (const o of e.links) if (o.alive) this.spawnLight(o.body.center.x, o.body.center.y, 'ring', 0x60e0ff, 0.4, 1.6, 0.9, 0.25); }
  },
  deathPyro(e, cx, cy, dx, src, charred) {
    this.time.delayedCall(50, () => { this.explode(cx, cy, TUNE.PYRO.tank); this.spawnFirePatch(cx, cy); BUS.emit('callout', 'TANK BREACH'); });   // its fuel goes up
  },
  deathGunship(e, cx, cy, dx, src, charred) { if (this.boss === e) this.boss = null; this.spawnWreck(e, dx); },
  deathTarspit(e, cx, cy, dx, src, charred) {
    this.time.delayedCall(40, () => {                                  // the tank splits: a big puddle, already alight if it died burning
      this.spawnTarPatch(cx, cy, 64); BUS.emit('callout', 'TANK RUPTURED');
      if (charred) { const T = this.tars.find(q => Math.abs(q.x - cx) < q.w / 2 + 6); if (T) this.igniteTar(T); }
    });
  },
  deathBuzzsaw(e, cx, cy, dx, src, charred) {
    this.time.delayedCall(30, () => this.spawnSaw(cx, cy, rand(-Math.PI * 0.85, -Math.PI * 0.15))); BUS.emit('callout', 'BLADE LOOSE');   // the blade spins free: yours now
  },
  deathMimic(e, cx, cy, dx, src, charred) {
    this.time.delayedCall(60, () => this.explode(cx, cy, TUNE.BARREL));   // it was a drum all along
  },
  deathGasbag(e, cx, cy, dx, src, charred) {
    this.time.delayedCall(30, () => this.spawnCloud(cx, cy));               // pops into a toxic cloud
  },
  deathClaw(e, cx, cy, dx, src, charred) { if (e.grab) this.clawRelease(e, false); },
  deathLugger(e, cx, cy, dx, src, charred) {
    if (e.carry) { if (e.carryImg) e.carryImg.destroy(); this.time.delayedCall(40, () => this.explode(cx, cy - 16, TUNE.LUGGER.barrel)); }   // the drum it held goes up
  },
  deathBlimp(e, cx, cy, dx, src, charred) { this.blimpCrash(e, cx, cy); },
  deathChiller(e, cx, cy, dx, src, charred) {
    const b = e.body;
    this.spawnIce(cx, b.bottom - 2, 96); this.fx.emit(cx, cy, { n: 22, speed: [40, 180], life: [0.3, 0.7], size: [2, 1], cols: [0xffffff, 0xc8f0ff, 0x6ab0e0], add: true, g: 300 }); Sfx.iceForm();   // the tank bursts: frost everywhere
  },
  deathCopycat(e, cx, cy, dx, src, charred) { if (e.icon) { e.icon.destroy(); e.icon = null; } },
  deathCinder(e, cx, cy, dx, src, charred) {
    const b = e.body;
    this.spawnFirePatch(cx, b.bottom - 4); this.fxFire(cx, cy, 14);
  },
  deathJelly(e, cx, cy, dx, src, charred) { this.jellyNova(cx, cy); },
  deathRatking(e, cx, cy, dx, src, charred) {
    const b = e.body;
    for (let k = 0; k < TUNE.RATKING.burst; k++) this.time.delayedCall(40 * k, () => { if (this.state === 'dead') return; const o = this.spawnEnemy('ratbot', Math.floor(cx / TS), Math.floor((b.bottom - 2) / TS)); Object.assign(o, { summoned: true, aggro: true, aggroT: 9 }); o.body.setVelocity(rand(-170, 170), rand(-240, -120)); });
  },
  deathTorcher(e, cx, cy, dx, src, charred) {                          // the tank: burst into flame, or blow if it was shot through the back
    const b = e.body;
    if (this.time.now - e.tankHitT < 300) { BUS.emit('callout', 'TANK BLOWN'); this.addStyle(60); this.time.delayedCall(60, () => { if (this.state !== 'dead') this.explode(cx - e.dir * 6, cy, TUNE.TORCHER.boom); }); }
    else { this.spawnFirePatch(cx, b.bottom - 4); this.fxFire(cx, cy, 14); }
  },
  deathSporepod(e, cx, cy, dx, src, charred) {
    this.spawnCloud(cx, cy - 4); Sfx.gasPop();   // it bursts into a toxic cloud
  },
  deathDiscus(e, cx, cy, dx, src, charred) { if (e.disc) e.disc.owner = null; },
  deathScorcher(e, cx, cy, dx, src, charred) {
    const b = e.body;
    this.spawnFirePatch(cx, b.bottom - 4); this.fxFire(cx, cy, 18); this.spawnLight(cx, cy, 'glow', 0xff8a20, 1.4, 0.4, 0.9, 0.4);   // the fuel pack goes up
  },
  deathOrbiter(e, cx, cy, dx, src, charred) {
    e.plates.forEach((h, k) => { if (h > 0) { const a = e.spin + k * Math.PI * 2 / e.plates.length; this.spawnGib('g_plate', cx + Math.cos(a) * 20, cy + Math.sin(a) * 20, Math.cos(a) * rand(120, 220), Math.sin(a) * rand(120, 220) - 120, 'metal'); } });   // its plates fly off
  },
  deathWraith(e, cx, cy, dx, src, charred) {
    this.fx.emit(cx, cy, { n: 26, speed: [30, 140], life: [0.4, 0.9], size: [3, 1], cols: [0xffffff, 0xd8c8ff, 0x8a6ad0], add: true, g: -80 }); this.spawnLight(cx, cy, 'glow', 0xb090ff, 1.2, 0.3, 0.8, 0.3); Sfx.wail(0.6);
  },
  deathLeech(e, cx, cy, dx, src, charred) { if (e.ai === 'latched') this.leechN = Math.max(0, (this.leechN || 0) - 1); },
  deathSlug(e, cx, cy, dx, src, charred) {
    for (let i = 0; i < 3; i++) {
      const ax = cx + rand(-12, 12), fy = this.floorBelow(ax, e.body.bottom - 6, 40);
      if (fy !== null) { const [px, pw] = this.spanOn(ax, fy, 18); this.acids.push({ x: px, y: fy, w: pw, t: TUNE.SLUG.pool * 1.5 }); }
    }
  },
  deathEcho(e, cx, cy, dx, src, charred) {
    this.fx.emit(cx, cy, { n: 30, speed: [30, 160], life: [0.3, 0.7], size: [2, 1], cols: [0xffffff, 0x9af0ff, 0x46b8f0], add: true }); this.spawnLight(cx, cy, 'player', 0x60e0ff, 1, 1.4, 0.6, 0.3, e.fr, e.dir < 0);
  },
  deathPilferer(e, cx, cy, dx, src, charred) {
    if (e.gunImg) {                                                     // the gun it was carrying spins back to you
      const img = e.gunImg, sx = img.x, sy = img.y;
      this.tweens.addCounter({ from: 0, to: 1, duration: 380, ease: 'Quad.easeIn',
        onUpdate: tw => { const k = tw.getValue(); img.setPosition(sx + (this.player.x - sx) * k, sy + (this.player.y - 4 - sy) * k - Math.sin(k * Math.PI) * 24).setRotation(k * 9); },
        onComplete: () => { img.destroy(); if (this.state !== 'dead') this.spawnLight(this.player.x, this.player.y - 4, 'ring', 0xffffff, 0.2, 1, 0.8, 0.2); } });
    }
    if (e.stolen >= 0) { this.locked.delete(e.stolen); BUS.emit('locked', [...this.locked]); BUS.emit('callout', 'GUN RECOVERED'); this.addStyle(40); } },
  deathGolem(e, cx, cy, dx, src, charred) {
    this.zoomPunch = Math.max(this.zoomPunch, 0.08); this.time.delayedCall(60, () => { this.explode(cx, cy, TUNE.GOLEM.scrap); for (let i = 0; i < 10; i++) { const b = this.spawnBullet('shard', cx, cy - 6, i / 10 * Math.PI * 2 + rand(-0.2, 0.2), rand(220, 340), 9, 0.5); if (b) { b.bounces = 1; b.free = true; } } BUS.emit('callout', 'SCRAPPED'); });
  },
  deathJammer(e, cx, cy, dx, src, charred) { this.spawnLight(cx, cy, 'ring', 0x60ff9a, 0.3, 1.8, 0.9, 0.25); this.fxSparks(cx, cy, 12, 0, Math.PI * 2, [60, 220]); },
  deathTurret(e, cx, cy, dx, src, charred) { this.boomFx(cx, cy, 0.4); },
  deathWelder(e, cx, cy, dx, src, charred) { for (const t of e.turrets || []) if (t.alive) t.owner = null; },
  deathHowitzer(e, cx, cy, dx, src, charred) { this.zoomPunch = Math.max(this.zoomPunch, 0.06); this.time.delayedCall(80, () => this.boomFx(cx, cy - 4, 0.7)); },
  deathBlinker(e, cx, cy, dx, src, charred) { this.spawnLight(cx, cy, 'ring', 0xc080ff, 0.2, 2, 0.9, 0.3); this.fx.emit(cx, cy, { n: 18, speed: [40, 200], life: [0.3, 0.6], size: [2, 1], cols: [0xffffff, 0xd0a0ff, 0x8040e0], add: true }); },
  deathMagnet(e, cx, cy, dx, src, charred) { this.spawnLight(cx, cy, 'ring', 0x7aa0ff, 0.3, 2.2, 0.9, 0.3); this.spawnLight(cx, cy, 'glow', 0x7aa0ff, 1.5, 3, 0.9, 0.25); this.fxSparks(cx, cy, 14, 0, Math.PI * 2, [80, 260]); },
  deathWyrm(e, cx, cy, dx, src, charred) { this.wyrmDeath(e); },
  deathHive(e, cx, cy, dx, src, charred) {
    for (const o of this.enemies.getChildren()) if (o.alive && o.hive === e) o.panicDie = rand(0.4, 2.6);   // the swarm goes mad and dies off
  },
  deathStitcher(e, cx, cy, dx, src, charred) { if (e.corpse) e.corpse.claimed = null; },
  deathForeman(e, cx, cy, dx, src, charred) {                          // the yard boss goes down in a string of blasts
    if (this.boss === e) this.boss = null;
    this.slowmoUntil = this.time.now + 1200; this.zoomPunch = 0.14; BUS.emit('flash', 0.45); BUS.emit('callout', 'FOREMAN DOWN'); this.impactFrame(3); this.shake(1200, 0.01);
    for (let i = 0; i < 8; i++) this.time.delayedCall(i * 120, () => this.boomFx(cx + rand(-24, 24), cy + rand(-18, 14), rand(0.6, 1.1)));
    for (let i = 0; i < 10; i++) this.spawnGib(pick(['g_plate', 'g_shard', 'g_shard2', 'g_wire']), cx + rand(-16, 16), cy + rand(-14, 8), rand(-300, 300), rand(-420, -180), 'metal');
    for (const o of this.enemies.getChildren()) if (o.alive && o.owner === e) this.time.delayedCall(rand(100, 600), () => { if (o.alive) this.damageEnemy(o, 999, 0, -1, 'crush'); });
    this.dropOrbs(cx, cy, 4); this.award('unionbuster');
  },
  deathJugg(e, cx, cy, dx, src, charred) {
    if (this.boss === e) this.boss = null;
    this.slowmoUntil = this.time.now + 900; this.zoomPunch = 0.12; BUS.emit('flash', 0.4); BUS.emit('callout', 'JUGGERNAUT DOWN'); this.impactFrame(3);
    for (let i = 0; i < 5; i++) this.time.delayedCall(i * 110, () => this.boomFx(cx + rand(-14, 14), cy + rand(-14, 10), rand(0.5, 0.9)));
  },
  deathSapper(e, cx, cy, dx, src, charred) { if (Math.random() < 0.35) { this.plantCharge(cx, cy, 1.4); BUS.emit('callout', 'DROPPED A CHARGE'); } },
  deathLinker(e, cx, cy, dx, src, charred) { this.fxSparks(cx, cy, 16, 0, Math.PI * 2, [80, 260]); this.spawnLight(cx, cy, 'glow', 0x40f0ff, 1.5, 3, 0.9, 0.25); if (e.partner && e.partner.partner === e) e.partner.partner = null; },
  deathBurrower(e, cx, cy, dx, src, charred) { this.zoomPunch = Math.max(this.zoomPunch, 0.08); BUS.emit('callout', 'WORM SLAIN'); },
  deathBoss(e, cx, cy, dx, src, charred) {                             // the big finish: rolling blasts, then everything it spawned pops
    this.slowmoUntil = this.time.now + 1600; BUS.emit('flash', 0.5); this.zoomPunch = 0.15; this.boss = null;
    for (let i = 0; i < 9; i++) this.time.delayedCall(i * 120, () => this.boomFx(cx + rand(-22, 22), cy + rand(-22, 18), rand(0.6, 1.1)));
    for (const o of this.enemies.getChildren()) if (o.alive && o.summoned) this.time.delayedCall(rand(100, 700), () => { if (o.alive) this.tickBoom(o); });
    if (this.campaign) this.setCampaignMachinery(null);                // its rails die with it, so they can't take the win in the wait for VICTORY
    BUS.emit('callout', 'SMELTER SLAIN');
    this.camFocus = { x: cx, y: cy, until: this.time.now + 2200 }; this.impactFrame(4); this.shake(1600, 0.01);     // the fall: the camera holds on it
    for (let i = 0; i < 6; i++) this.time.delayedCall(1100 + i * 110, () => this.boomFx(cx + rand(-30, 30), cy + rand(-26, 20), rand(0.8, 1.3)));
    for (let i = 0; i < 12; i++) this.spawnGib(pick(['g_plate', 'g_shard', 'g_shard2', 'g_wire']), cx + rand(-16, 16), cy + rand(-16, 10), rand(-320, 320), rand(-460, -200), 'metal');
    if (this.mode.smelterCard) this.time.delayedCall(700, () => BUS.emit('wavecard', 'VICTORY', 'THE SMELTER FALLS'));
  },
  xbArmour(e, dmg, dx, dy, src) {                                       // damageEnemy, before the shared modifiers: shields, a vent's open core, bare plating
    if (e.kind === 'overseer' && e.phase === 1) {                       // the nodes are up: the shield turns everything
      const now = this.time.now, b = e.body;
      if (now - (e.deflT || 0) > 90) { e.deflT = now; this.fxSparks(b.center.x - (dx || 0) * 18, b.center.y - 2 - (dy || 0) * 18, 4, Math.atan2(-(dy || 0), -(dx || 1)), 1.4, [60, 180]); Sfx.shieldHit(); }
      e.shieldHitT = now; return 0;
    }
    if (e.kind === 'crucible') { if (src === 'burn') return 0; if (e.ai === 'vent') { e.coreHitT = this.time.now; return dmg * TUNE.CRUCIBLE.core; } }
    if (e.kind === 'grinder' && e.phase === 3) return dmg * TUNE.GRINDER.bare;
    return dmg;
  },
  xbTouch(p, e) {                                                       // onTouchEnemy: what touching each of them costs you
    const now = this.time.now, b = e.body;
    if (e.kind === 'eggsac' || e.kind === 'eyenode' || now < (e.touchT || 0)) return;
    const roll = e.kind === 'grinder' && e.ai === 'roll', dive = e.kind === 'queen' && e.ai === 'dive';
    if (!this.hurtPlayer(roll ? TUNE.GRINDER.touch : dive ? TUNE.QUEEN.diveDmg : e.def.touch, b.center.x, { srcY: b.center.y })) return;
    e.touchT = now + 600;
    if (roll || dive) { const d = Math.sign(p.x - b.center.x) || e.dir; p.body.velocity.x = d * 320; p.body.velocity.y = -280; this.jumpCuttable = false; this.shake(220, 0.01); Sfx.kickHit(); this.fxSparks(p.x, p.y, 8); }
    if (this.perks.thorns && e.alive) this.damageEnemy(e, 20, Math.sign(e.x - p.x) || 1, -0.3, 'kick');
  },

  // ---------------------------------------------------------------- the crucible ----
  // A slag cauldron on thrusters (1300 HP) that hangs ~92 px over your floor and drifts from side to side of you. POUR:
  // it tips its spout your way (0.85 s, slag drips and the floor under it is marked) and pours a slag wave along the
  // floor (18, jump it; both ways from phase two). BOMBS: 3-5 molten shells lobbed round you with landing marks. From
  // phase two it FLOODS: it marks the floor on your side of it (1.4 s), tips and fills it with slag for 3.5 s (7 per
  // 0.35 s). Phase three it overheats: it VENTS (0.7 s tell, then 2.6 s low with its core open, taking double) and
  // rains slag round you between attacks. Fire doesn't hurt it.
  setupCrucible(e, x, y, cx, cy) {
    e.body.setAllowGravity(false); this.xbFx(); this.xbLift(e, x, y, TUNE.CRUCIBLE.alt);
    Object.assign(e, { ai: 'intro', aiUntil: this.time.now + 1800, phase: 1, atkN: 0, cd: 0.6, side: e.x > this.player.x ? 1 : -1, sideT: 5, tilt: 0, rainT: 1, pourDir: 1, floodDir: 1, holdX: e.x, tellMs: 1 });
    e.glow = this.add.image(e.x, e.y, 'glow').setBlendMode(ADD).setTint(0xff7a20).setScale(1.7).setAlpha(0.45).setDepth(4.6);
  },
  updateCrucible(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.CRUCIBLE, b = e.body, pb = this.player.body, ph = this.xbPhase(e), quick = ph === 3 ? 0.75 : 1;
    e.aggro = true; e.stunT = 0;
    if (ph !== e.phase) {
      e.phase = ph; this.xbBreak(e, now, ph === 2 ? 'BOILING OVER' : 'OVERHEATING', ['g_plate', 'g_plateL', 'g_shard', 'g_crust'], 0xff7a20);
      for (let i = 0; i < 6; i++) this.spawnGib('g_slag', b.center.x + rand(-12, 12), b.top + 4, rand(-200, 200), rand(-380, -200), 'slag');
    }
    const hold = e.ai === 'pourTell' || e.ai === 'pour' || e.ai === 'floodTell' || e.ai === 'flood' || e.ai === 'ventTell';
    if ((e.sideT -= dt) <= 0) { e.sideT = rand(4, 6); e.side = -e.side; }
    const ty = this.xbFloor() - T.alt + (e.ai === 'vent' ? 26 : e.ai === 'floodTell' || e.ai === 'flood' ? -14 : 0) + Math.sin(e.t * 2.2) * 4;
    this.xbHover(e, dt, hold ? e.holdX : pb.center.x + e.side * 120, ty, e.ai === 'vent' ? 35 : e.ai === 'stagger' ? 10 : T.speed * (ph === 3 ? 1.3 : 1));
    e.dir = e.ai === 'pourTell' || e.ai === 'pour' ? e.pourDir : e.ai === 'floodTell' || e.ai === 'flood' ? e.floodDir : dx >= 0 ? 1 : -1;
    const want = e.ai === 'pourTell' || e.ai === 'pour' ? 0.24 : e.ai === 'floodTell' ? 0.6 * clamp(1 - (e.aiUntil - now) / e.tellMs, 0, 1) : e.ai === 'flood' && now < e.aiUntil - 350 ? 0.62 : 0;
    e.tilt += (want - e.tilt) * Math.min(1, dt * 7);
    const sx = b.center.x + e.dir * 27, sy = b.center.y - 10 + e.tilt * 14;  // the spout's lip
    switch (e.ai) {
      case 'intro': if (now >= e.aiUntil) e.ai = 'hover'; break;
      case 'stagger': if (Math.random() < 0.4) this.fxSparks(b.center.x + rand(-18, 18), b.center.y + rand(-12, 10), 2); if (now >= e.aiUntil) { e.ai = 'hover'; e.cd = 0.8; } break;
      case 'pourTell':
        if (Math.random() < 0.5) this.fx.emit(sx, sy + 4, { n: 1, angle: Math.PI / 2, spread: 0.2, speed: [20, 60], life: [0.3, 0.5], size: [2, 1], cols: [0xffe080, 0xff8a20], add: true, g: 400 });
        if (now >= e.aiUntil) { e.ai = 'pour'; e.aiUntil = now + T.pour * 1000; this.cruciblePour(e, ph, sx, sy); }
        break;
      case 'pour': if (now >= e.aiUntil) { e.ai = 'hover'; e.cd = T.cd * quick; } break;
      case 'bombTell':
        if (Math.random() < 0.6) this.fx.emit(b.center.x + rand(-16, 16), b.top + 2, { n: 1, angle: -Math.PI / 2, spread: 0.5, speed: [30, 90], life: [0.2, 0.4], size: [2, 1], cols: [0xffe080, 0xff8a20], add: true, g: 300 });
        if (now >= e.aiUntil) { this.crucibleBombs(e, T.bombs[ph - 1], false); e.ai = 'hover'; e.cd = T.cd * quick; }
        break;
      case 'floodTell':
        if (Math.random() < 0.6) this.fx.emit(b.center.x + e.dir * rand(8, 22), b.top + 2, { n: 1, angle: -Math.PI / 2 + e.dir * 0.6, spread: 0.4, speed: [30, 90], life: [0.3, 0.5], size: [2, 1], cols: [0xffe080, 0xff8a20], add: true, g: 500, mode: 1 });
        if (now >= e.aiUntil) { e.ai = 'flood'; e.aiUntil = now + 900; Sfx.erupt(); Sfx.splat(2); this.shake(400, 0.01); }
        break;
      case 'flood': if (now >= e.aiUntil) { e.ai = 'hover'; e.cd = T.cd * quick; } break;
      case 'ventTell':
        if (Math.random() < 0.5) this.fx.emit(b.center.x + rand(-18, 18), b.top, { n: 1, angle: -Math.PI / 2, spread: 0.3, speed: [40, 100], life: [0.4, 0.8], size: [3, 8], cols: [0xe0e0e0, 0xa0a0a0], alpha: [0.5, 0], g: -40, drag: 1 });
        if (now >= e.aiUntil) { e.ai = 'vent'; e.aiUntil = now + T.vent * 1000; Sfx.steam(); BUS.emit('callout', 'CORE EXPOSED'); this.shake(260, 0.008); }
        break;
      case 'vent':
        if (Math.random() < 0.7) this.fx.emit(b.center.x + rand(-20, 20), b.top - 2, { n: 1, angle: -Math.PI / 2, spread: 0.25, speed: [60, 140], life: [0.5, 1], size: [3, 10], cols: [0xf0f0f0, 0xb0b0b0, 0x808080], alpha: [0.6, 0], g: -60, drag: 1.2 });
        if (Math.random() < 0.12) Sfx.sizzle();
        if (now >= e.aiUntil) { e.ai = 'hover'; e.cd = T.cd * 0.6; }
        break;
      default:
        if (ph === 3 && alive && (e.rainT -= dt) <= 0) { e.rainT = T.rain; this.crucibleBombs(e, 1, true); }
        if (alive && (e.cd -= dt) <= 0) {
          const cyc = ph === 1 ? ['pour', 'bombs'] : ph === 2 ? ['pour', 'flood', 'bombs', 'pour', 'bombs'] : ['vent', 'pour', 'flood', 'bombs', 'vent', 'bombs'];
          const a = cyc[e.atkN++ % cyc.length];
          e.holdX = b.center.x;
          if (a === 'pour') { e.ai = 'pourTell'; e.pourDir = dx >= 0 ? 1 : -1; e.tellMs = T.pourTell * 1000 * quick; Sfx.gurgle(); Sfx.charge(0.6); }
          else if (a === 'bombs') { e.ai = 'bombTell'; e.tellMs = T.bombTell * 1000; Sfx.charge(0.7); }
          else if (a === 'flood') { e.ai = 'floodTell'; e.tellMs = T.floodTell * 1000 * quick; this.crucibleFlood(e, dx >= 0 ? 1 : -1, e.tellMs / 1000); }
          else { e.ai = 'ventTell'; e.tellMs = T.ventTell * 1000; Sfx.hiss(); }
          e.aiUntil = now + e.tellMs;
        }
    }
    e.fr = ph + (e.ai === 'vent' ? 'v' : e.tilt > 0.12 || e.ai === 'pourTell' || e.ai === 'pour' ? 't' : 'i');
  },
  visCrucible(e, g, now) {
    const b = e.body, L = this.laserG, hot = e.ai === 'vent' || e.phase === 3;
    e.setRotation(e.dir * e.tilt + (e.ai === 'ventTell' ? Math.sin(now / 25) * 0.05 : 0));
    e.glow.setPosition(b.center.x, b.center.y + 4).setScale(e.ai === 'vent' ? 2.4 + Math.sin(now / 40) * 0.2 : 1.7 + Math.sin(now / 300) * 0.1).setAlpha(e.ai === 'vent' ? 0.75 : hot ? 0.6 : 0.42).setTint(e.ai === 'vent' ? 0xffd080 : hot ? 0xff5a20 : 0xff7a20);
    for (const ox of [-11, 11]) if (Math.random() < 0.7) this.fx.emit(b.center.x + ox, b.bottom + 7, { n: 1, angle: Math.PI / 2, spread: 0.25, speed: [60, 130], life: [0.1, 0.22], size: [3, 1], cols: e.ai === 'vent' ? [0xffffff, 0xffe080, 0xff8a20] : [0xffffff, 0x9adcff, 0x4a8aff], add: true });
    if (Math.random() < (hot ? 0.5 : 0.15)) this.fx.emit(b.center.x + rand(-14, 14), b.top, { n: 1, angle: -Math.PI / 2, spread: 0.4, speed: [10, 40], life: [0.6, 1.2], size: [3, 8], cols: [0x6a5a50, 0x403530], alpha: [0.45, 0], g: -20, drag: 1 });
    const sx = b.center.x + e.dir * 27, sy = b.center.y - 10 + e.tilt * 14;
    if (e.ai === 'pourTell' || e.ai === 'pour') {
      const fy = this.floorBelow(sx, b.bottom + 2, 320);
      if (fy !== null && e.ai === 'pourTell') {                          // where it lands, and which way the wave will run
        const on = Math.floor(now / 90) % 2; L.fillStyle(0xff6020, on ? 0.9 : 0.4).fillRect(sx - 7, fy - 2, 14, 2);
        for (const d of e.phase >= 2 ? [-1, 1] : [e.dir]) for (let j = 0; j < 3; j++) { const ax = sx + d * (12 + j * 12 + (now / 40) % 12); L.lineStyle(1, 0xff8a30, 0.8 - j * 0.2).lineBetween(ax, fy - 8, ax + d * 4, fy - 4).lineBetween(ax + d * 4, fy - 4, ax, fy); }
      } else if (fy !== null) { L.fillStyle(0xff8a20, 0.9).fillRect(sx - 2, sy, 4, fy - sy); L.fillStyle(0xffffff, 0.8).fillRect(sx - 0.5, sy, 1, fy - sy); }
    }
    if (e.ai === 'flood' && now < e.aiUntil - 250) {                     // the slag going over the rim
      const rx = b.center.x + e.dir * 22, ry = b.top + 2, fy = this.floorBelow(rx + e.dir * 6, b.bottom, 320);
      if (fy !== null) { L.fillStyle(0xff7020, 0.9).fillRect(rx + e.dir * 3 - 3, ry, 7, fy - ry); L.fillStyle(0xffe080, 0.9).fillRect(rx + e.dir * 3 - 1, ry, 2, fy - ry); }
    }
    if (e.ai === 'vent' && Math.floor(now / 120) % 2) L.lineStyle(1, 0xffe080, 0.8).strokeCircle(b.center.x, b.center.y + 1, 10);   // the open core: hit it
  },
  deathCrucible(e, cx, cy, dx, src, charred) {                           // it cracks and spills, and goes over in blasts
    this.xbDeath(e, cx, cy, 'CRUCIBLE CRACKED', 1);
    for (let i = 0; i < 14; i++) this.spawnGib('g_slag', cx + rand(-16, 16), cy - 8, rand(-260, 260), rand(-460, -200), 'slag');
    this.fx.emit(cx, cy - 6, { n: 40, angle: -Math.PI / 2, spread: 1.6, speed: [80, 300], life: [0.4, 1], size: [3, 1], cols: [0xffffff, 0xffe080, 0xffa030, 0xff5a1a], add: true, g: 500, mode: 1 });
    const fy = this.floorBelow(cx, cy, 320); if (fy !== null) this.paintScorch(cx, fy + 2, 18);
  },

  // ---------------------------------------------------------------- the grinder ----
  // A saw-toothed drum round an armoured hub (1250 HP). It revs (0.75 s: sparks fly, a red ring, a trail of chevrons)
  // and ROLLS at you (150 px/s; 26 and a fling on contact), smashing crates, props and drums and caroming off walls;
  // low steps it climbs over. It LAUNCHES a fan of 2-4 saw blades that bounce about (14 each). CLIMB: it rolls into
  // a wall, climbs it, hangs (0.55 s, a mark where it'll land) and drops on you: a slam with shockwaves each way.
  // Phase two: faster rolls and blades that split in two when they land. Phase three: its plating is gone (it takes
  // x1.35) and it gouges sparking ruts behind it as it rolls (5 per 0.35 s on them).
  setupGrinder(e, x, y, cx, cy) {
    this.xbFx();
    Object.assign(e, { ai: 'intro', aiUntil: this.time.now + 1600, phase: 1, atkN: 0, cd: 0.6, spin: 0, spinV: 4, rollDir: 1, bounces: 0, rollT: 0, rutX: x, stuckT: 0, climbY: 0, climbAtk: false, crushT: 0, wasG: true });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xff3020).setScale(0.7).setAlpha(0).setDepth(18);
  },
  updateGrinder(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.GRINDER, b = e.body, onG = b.blocked.down || b.touching.down, ph = this.xbPhase(e), i3 = ph - 1;
    e.aggro = true; e.stunT = 0;
    if (ph !== e.phase) { e.phase = ph; e.climbAtk = false; b.setAllowGravity(true); b.velocity.x = 0; this.xbBreak(e, now, ph === 2 ? 'TEETH OUT' : 'PLATING SHED', ['g_plate', 'g_plateL', 'g_xtooth', 'g_xtooth', 'g_shard', 'g_wire'], 0xffc040); }
    if (onG && !e.wasG && e.airT > 0.3 && e.ai !== 'drop') { this.shake(160, 0.006); this.fxDust(b.center.x, b.bottom, 8); Sfx.stomp(); }
    e.airT = onG ? 0 : e.airT + dt; e.wasG = onG;
    const wx = (e.rollDir > 0 ? b.right : b.left) + e.rollDir * 3;
    switch (e.ai) {
      case 'intro': b.velocity.x = 0; e.spinV = 4 + 26 * clamp(1 - (e.aiUntil - now) / 1600, 0, 1); if (now >= e.aiUntil) { e.ai = 'idle'; e.cd = 0.3; } break;
      case 'stagger': b.velocity.x *= Math.pow(0.02, dt); e.spinV = 2; if (Math.random() < 0.4) this.fxSparks(b.center.x + rand(-16, 16), b.center.y + rand(-14, 14), 2); if (now >= e.aiUntil) { e.ai = 'idle'; e.cd = 0.5; } break;
      case 'rev':
        b.velocity.x = 0; e.spinV = 34; e.dir = e.rollDir;
        if (onG) { this.fxSparks(b.center.x - e.rollDir * 12, b.bottom - 2, 2, e.rollDir > 0 ? Math.PI + 0.5 : -0.5, 0.5, [80, 240]); if (Math.random() < 0.4) this.fxDust(b.center.x - e.rollDir * 12, b.bottom, 1); }
        if (Math.random() < 0.25) Sfx.whirr(0.9);
        if (now >= e.aiUntil) { e.ai = 'roll'; e.rollT = 0; e.bounces = 0; e.stuckT = 0; Sfx.whoosh(); this.shake(150, 0.006); }
        break;
      case 'roll': {
        e.rollT += dt; e.dir = e.rollDir;
        if (onG) b.velocity.x = approach(b.velocity.x, e.rollDir * T.roll[i3] * (e.climbAtk ? 1.1 : 1), 1400 * dt);
        e.spinV = Math.abs(b.velocity.x) / 6;
        if ((e.crushT -= dt) <= 0) { e.crushT = 0.12; this.grinderGrind(e); }
        if (ph === 3 && onG && Math.abs(b.center.x - e.rutX) > 22) { e.rutX = b.center.x; this.xb.pools.push({ src: e, kind: 'rut', x: b.center.x - e.rollDir * 12, w: 26, y: b.bottom, tell: 0, t: T.rut, gap: 0.35, tick: 0, dmg: T.rutDmg, fill: 1, ox: b.center.x }); }
        if (onG && Math.random() < 0.5) this.fxSparks(b.center.x - e.rollDir * 8, b.bottom - 1, 1, e.rollDir > 0 ? Math.PI + 0.4 : -0.4, 0.4, [60, 200]);
        if (e.rollDir > 0 ? b.blocked.right : b.blocked.left) {
          if (!this.solidAt(wx, b.bottom - 44) || e.climbAtk) { e.ai = 'climb'; e.climbY = b.bottom; b.setAllowGravity(false); b.velocity.y = -T.climb; Sfx.clang(0.7); }
          else { this.grinderBounce(e, wx); if (++e.bounces > T.bounces[i3]) e.ai = 'brake'; }
          break;
        }
        if (onG && Math.abs(b.velocity.x) < 25 && e.rollT > 0.4) { if ((e.stuckT += dt) > 0.5) { e.rollDir = -e.rollDir; e.stuckT = 0; } } else e.stuckT = 0;
        if (e.rollT > (e.climbAtk ? 6 : 4) || (!e.climbAtk && e.rollDir * dx < -200)) e.ai = 'brake';
        break;
      }
      case 'brake':
        e.climbAtk = false; b.velocity.x = approach(b.velocity.x, 0, 600 * dt); e.spinV = Math.abs(b.velocity.x) / 6;
        if (onG && Math.random() < 0.6) this.fxSparks(b.center.x + e.rollDir * 10, b.bottom - 1, 2, e.rollDir > 0 ? -0.3 : Math.PI + 0.3, 0.5, [80, 220]);
        if (Math.abs(b.velocity.x) < 10) { e.ai = 'idle'; e.cd = 0.7 * (ph === 3 ? 0.7 : 1); }
        break;
      case 'climb': {
        b.setAllowGravity(false); b.velocity.x = e.rollDir * 40; b.velocity.y = -T.climb; e.spinV = 26;
        if (Math.random() < 0.6) this.fxSparks(wx, b.center.y + rand(-8, 8), 2, e.rollDir > 0 ? Math.PI : 0, 1, [60, 200]);
        if (Math.random() < 0.15) Sfx.whirr(0.7);
        if (!this.solidAt(wx, b.bottom - 3)) { b.setAllowGravity(true); b.velocity.y = -140; b.velocity.x = e.rollDir * 140; e.ai = 'roll'; e.climbAtk = false; break; }   // over the top: carry on rolling
        const up = e.climbY - b.bottom;
        if (e.climbAtk && (up > T.climbH || b.blocked.up)) { e.ai = 'hang'; e.aiUntil = now + T.hang * 1000 * (ph === 3 ? 0.8 : 1); b.setVelocity(0, 0); Sfx.charge(0.8); break; }
        if (!e.climbAtk && (up > 52 || b.blocked.up)) { b.setAllowGravity(true); b.velocity.y = 0; this.grinderBounce(e, wx); e.ai = ++e.bounces > T.bounces[i3] ? 'brake' : 'roll'; }   // a real wall after all
        break;
      }
      case 'hang':
        b.setVelocity(0, 0); b.setAllowGravity(false); e.spinV = 30;
        if (Math.random() < 0.7) this.fxSparks(wx, b.center.y, 2, Math.PI / 2 + (e.rollDir > 0 ? 0.3 : -0.3), 0.6, [40, 160]);
        if (now >= e.aiUntil) { e.ai = 'drop'; e.aiUntil = now; b.setAllowGravity(true); b.setVelocity(clamp((this.player.body.center.x - b.center.x) * 1.2, -280, 280), -90); e.dir = Math.sign(b.velocity.x) || -e.rollDir; Sfx.whoosh(); }
        break;
      case 'drop': e.spinV = 20; if (onG && now > e.aiUntil + 150) { this.grinderSlam(e); e.ai = 'idle'; e.cd = 0.9 * (ph === 3 ? 0.7 : 1); e.climbAtk = false; } break;
      case 'bladeTell':
        b.velocity.x = approach(b.velocity.x, 0, 900 * dt); e.spinV = 16;
        if (Math.random() < 0.5) this.fxSparks(b.center.x + rand(-18, 18), b.top + 4, 1, -Math.PI / 2, 1, [40, 140]);
        if (now >= e.aiUntil) { this.grinderBlades(e, ph); e.ai = 'idle'; e.cd = 1.1 * (ph === 3 ? 0.7 : 1); }
        break;
      default:
        b.velocity.x = approach(b.velocity.x, 0, 800 * dt); e.spinV = Math.max(3, Math.abs(b.velocity.x) / 6); e.dir = dx >= 0 ? 1 : -1;
        if (alive && onG && (e.cd -= dt) <= 0) {
          const cyc = ph === 1 ? ['roll', 'blades', 'roll', 'climb'] : ph === 2 ? ['roll', 'blades', 'climb', 'roll', 'blades'] : ['roll', 'climb', 'blades', 'roll'];
          const a = cyc[e.atkN++ % cyc.length];
          if (a === 'blades') { e.ai = 'bladeTell'; e.aiUntil = now + T.bladeTell * 1000; Sfx.charge(0.6); }
          else { e.ai = 'rev'; e.rollDir = dx >= 0 ? 1 : -1; e.climbAtk = a === 'climb'; e.aiUntil = now + T.rev[i3] * 1000; Sfx.charge(0.4); }
        }
    }
    e.spin += e.spinV * dt; e.fr = ph + 'abcd'[Math.floor(e.spin) % 4];
  },
  visGrinder(e, g, now) {
    const b = e.body, L = this.laserG, tell = e.ai === 'rev' || e.ai === 'hang' || e.ai === 'bladeTell';
    e.glow.setPosition(b.center.x + e.dir * 10, b.center.y - 6).setAlpha(tell ? 0.6 + Math.sin(now / 30) * 0.2 : e.phase === 3 ? 0.35 : 0).setScale(tell ? 0.9 : 0.6).setTint(e.phase === 3 && !tell ? 0xffa040 : 0xff3020);
    if (tell && Math.floor(now / 80) % 2) L.lineStyle(1, 0xff3020, 0.8).strokeCircle(b.center.x, b.center.y + 2, 24);
    if (e.ai === 'rev') for (let j = 0; j < 4; j++) { const ax = b.center.x + e.rollDir * (30 + j * 14 + (now / 30) % 14), y = b.bottom; L.lineStyle(1, 0xff5030, 0.8 - j * 0.18).lineBetween(ax, y - 8, ax + e.rollDir * 5, y - 4).lineBetween(ax + e.rollDir * 5, y - 4, ax, y); }
    if (e.ai === 'hang') {                                               // where it'll come down
      const tx = clamp(this.player.body.center.x, b.center.x - 160, b.center.x + 160), fy = this.xbFloor(), on = Math.floor(now / 90) % 2;
      L.lineStyle(1, 0xff3020, on ? 0.9 : 0.4).strokeRect(tx - 18, fy - 3, 36, 3); L.fillStyle(0xff3020, 0.25).fillRect(tx - 18, fy - 3, 36, 3);
    }
    if (e.phase === 3 && Math.random() < 0.25) this.fxSparks(b.center.x + rand(-10, 10), b.center.y + rand(-10, 10), 1, 0, Math.PI * 2, [30, 120]);
  },
  deathGrinder(e, cx, cy, dx, src, charred) {                            // the ring flies apart in teeth and plate
    this.xbDeath(e, cx, cy, 'GRINDER SCRAPPED', 2);
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; this.spawnGib(i % 2 ? 'g_xtooth' : 'g_plate', cx + Math.cos(a) * 18, cy + Math.sin(a) * 18, Math.cos(a) * rand(220, 360), Math.sin(a) * rand(220, 360) - 140, 'metal'); }
    this.fxSparks(cx, cy, 30, 0, Math.PI * 2, [100, 320]);
  },

  // ---------------------------------------------------------------- the hive queen ----
  // A flying brood mother (1150 HP) circling ~120 px over you. EGGS: she drops 2-3 egg sacs (30 HP) that hatch in
  // 4.5 s into three gnats (and a tick from phase two) unless you shoot them. DIVE: she rears and screeches (0.7 s, a
  // red line to where she'll strike that locks white for the last 0.25 s) and dives along it (22 and a fling), then
  // hangs low for a moment. From phase two she SPRAYS acid: five globs lobbed at you that leave pools. Phase three
  // is a frenzy: everything a third faster and a six-gnat escort she tops up every 5 s.
  setupQueen(e, x, y, cx, cy) {
    e.body.setAllowGravity(false); this.xbFx(); this.xbLift(e, x, y, TUNE.QUEEN.alt);
    Object.assign(e, { ai: 'intro', aiUntil: this.time.now + 1700, phase: 1, atkN: 0, cd: 0.6, side: e.x > this.player.x ? 1 : -1, sideT: 4, escortT: 0, tx: x, ty: y, diveA: 0 });
  },
  updateQueen(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.QUEEN, b = e.body, pb = this.player.body, ph = this.xbPhase(e), fz = ph === 3 ? T.frenzy : 1;
    e.aggro = true; e.stunT = 0;
    if (ph !== e.phase) { e.phase = ph; this.xbBreak(e, now, ph === 2 ? 'THE BROOD STIRS' : 'FRENZY', ['g_wing', 'g_egg', 'g_flesh1', 'g_flesh2', 'g_chunk'], 0xffd040, true); Sfx.scream(); e.escortT = 0; }
    if ((e.sideT -= dt) <= 0) { e.sideT = rand(3.5, 5); e.side = -e.side; }
    const fy = this.xbFloor(), still = e.ai === 'screech' || e.ai === 'layTell' || e.ai === 'spitTell' || e.ai === 'stagger', low = e.ai === 'recover';
    if (e.ai !== 'dive') this.xbHover(e, dt, still ? b.center.x : pb.center.x + e.side * 90 + Math.sin(e.t * 0.9) * 30, (low ? fy - 46 : fy - T.alt) + Math.sin(e.t * 1.7) * 8, still ? 20 : T.speed * fz * (low ? 0.5 : 1));
    if (e.ai !== 'dive' && e.ai !== 'recover') e.dir = dx >= 0 ? 1 : -1;
    if (ph === 3 && alive && (e.escortT -= dt) <= 0) { e.escortT = 5; this.queenEscort(e); }
    switch (e.ai) {
      case 'intro': if (now >= e.aiUntil) e.ai = 'hover'; break;
      case 'stagger': if (now >= e.aiUntil) { e.ai = 'hover'; e.cd = 0.6; } break;
      case 'layTell': if (now >= e.aiUntil) { this.queenEggs(e, T.eggs[ph - 1]); e.ai = 'hover'; e.cd = T.cd / fz; } break;
      case 'spitTell': if (now >= e.aiUntil) { this.queenSpit(e); e.ai = 'hover'; e.cd = T.cd / fz; } break;
      case 'screech':
        if (now < e.aiUntil - T.lock * 1000) { e.tx = pb.center.x; e.ty = Math.min(pb.center.y, fy - 22); }   // she tracks you, then locks on
        if (now >= e.aiUntil) { e.ai = 'dive'; e.aiUntil = now + 1400; e.diveA = Math.atan2(e.ty - b.center.y, e.tx - b.center.x); e.dir = Math.cos(e.diveA) >= 0 ? 1 : -1; Sfx.whoosh(); }
        break;
      case 'dive': {
        const v = T.dive * fz, ux = Math.cos(e.diveA), uy = Math.sin(e.diveA);
        b.setVelocity(ux * v, uy * v);
        if (Math.random() < 0.6) this.fx.emit(b.center.x - ux * 16, b.center.y - uy * 10, { n: 1, speed: [10, 40], life: [0.2, 0.4], size: [2, 1], cols: [0xffd040, 0xc87a26], add: true });
        if ((e.tx - b.center.x) * ux + (e.ty - b.center.y) * uy < 4 || now >= e.aiUntil) { e.ai = 'recover'; e.aiUntil = now + 650 / fz; this.shake(160, 0.006); b.velocity.y = 0; }   // past the mark
        break;
      }
      case 'recover': b.velocity.x *= Math.pow(0.05, dt); if (now >= e.aiUntil) { e.ai = 'hover'; e.cd = T.cd / fz * 0.8; } break;
      default:
        if (alive && (e.cd -= dt) <= 0) {
          const cyc = ph === 1 ? ['dive', 'eggs'] : ph === 2 ? ['eggs', 'dive', 'acid', 'dive'] : ['dive', 'acid', 'eggs', 'dive', 'acid'];
          let a = cyc[e.atkN++ % cyc.length]; if (a === 'eggs' && this.xbOwn(e, 'eggsac') >= T.eggMax) a = 'dive';
          if (a === 'eggs') { e.ai = 'layTell'; e.aiUntil = now + T.layTell * 1000 / fz; Sfx.squelch(); }
          else if (a === 'acid') { e.ai = 'spitTell'; e.aiUntil = now + T.spitTell * 1000 / fz; Sfx.gurgle(); }
          else { e.ai = 'screech'; e.aiUntil = now + T.screech * 1000 / fz; e.tx = pb.center.x; e.ty = pb.center.y; Sfx.scream(); Sfx.wail(0.7); this.shake(200, 0.004); }
        }
    }
    e.fr = ph + (e.ai === 'screech' || e.ai === 'dive' ? 's' : Math.floor(now / (ph === 3 ? 40 : 60)) % 2 ? 'a' : 'b');
  },
  visQueen(e, g, now) {
    const b = e.body, L = this.laserG;
    e.setRotation(e.ai === 'dive' ? clamp(Math.sin(e.diveA) * e.dir * 0.5, -0.5, 0.5) : 0);
    if (e.ai === 'screech') {                                            // the line she'll dive along, locking white at the end
      const lock = now >= e.aiUntil - TUNE.QUEEN.lock * 1000, hx = b.center.x + e.dir * 14, hy = b.center.y - 4, n = 14;
      for (let i = 0; i < n; i += 2) L.lineStyle(1, lock ? 0xffffff : 0xff3020, lock ? 0.9 : 0.35 + 0.3 * Math.random()).lineBetween(hx + (e.tx - hx) * i / n, hy + (e.ty - hy) * i / n, hx + (e.tx - hx) * (i + 1) / n, hy + (e.ty - hy) * (i + 1) / n);
      L.lineStyle(1, lock ? 0xffffff : 0xff3020, 0.8).strokeCircle(e.tx, e.ty, lock ? 6 : 6 + (now / 20) % 8);
      for (let k = 0; k < 2; k++) L.lineStyle(1, 0xffd0d0, 0.5 - k * 0.2).strokeCircle(hx, hy, 6 + ((now / 4 + k * 9) % 18));   // the screech
    }
    if (e.ai === 'layTell') L.fillStyle(0xffd040, 0.25 + 0.25 * Math.sin(now / 40)).fillCircle(b.center.x - e.dir * 12, b.center.y + 4, 10);
    if (e.ai === 'spitTell') L.fillStyle(0x9aff4a, 0.3 + 0.3 * Math.sin(now / 30)).fillCircle(b.center.x + e.dir * 16, b.center.y - 2, 5);
    if (e.ai === 'dive' && Math.floor(now / 50) % 2) this.spawnLight(e.x, e.y, 'queen_w', 0xff9080, 1, 1, 0.45, 0.18, e.fr, e.flipX);   // afterimages
    if (e.phase === 3 && Math.random() < 0.25) this.fx.emit(b.center.x - e.dir * 8, b.bottom - 2, { n: 1, angle: Math.PI / 2, spread: 0.2, speed: [10, 30], life: [0.4, 0.7], size: [2, 1], cols: [0xffd060, 0xc87a26], g: 400, mode: 1 });
  },
  deathQueen(e, cx, cy, dx, src, charred) {                              // she bursts, and her brood dies with her
    this.xbDeath(e, cx, cy, 'QUEEN SLAIN', 4); Sfx.scream(); Sfx.wail(1);
    this.fx.emit(cx, cy, { n: 40, speed: [60, 260], life: [0.5, 1], size: [3, 1], cols: [0xfff0a0, 0xffd040, 0xc87a26, 0x7a3814], g: 500, mode: 1, drag: 0.5 });
    for (let i = 0; i < 6; i++) this.spawnGib(pick(['g_egg', 'g_wing', 'g_flesh1']), cx + rand(-10, 10), cy, rand(-240, 240), rand(-380, -160));
  },
  setupEggsac(e, x, y, cx, cy) { Object.assign(e, { hatchT: TUNE.QUEEN.hatch, owner: null }); },
  updateEggsac(e, dt, now, dx, dy, dist, alive) {                        // it sits and swells; at zero it hatches
    const b = e.body; e.stunT = 0; e.dir = 1;
    if (b.blocked.down || b.touching.down) b.velocity.x *= Math.pow(0.01, dt);
    e.hatchT -= dt;
    e.fr = e.hatchT < 1 ? (Math.floor(now / 70) % 2 ? 'e2' : 'e1') : Math.floor(now / (e.hatchT < 2.5 ? 180 : 420)) % 2 ? 'e1' : 'e0';
    if (e.hatchT < 1 && Math.random() < 0.2) this.fx.emit(b.center.x, b.top + 2, { n: 1, angle: -Math.PI / 2, spread: 1, speed: [10, 40], life: [0.2, 0.4], size: [2, 1], cols: [0xffd060, 0xc87a26], g: 200 });
    if (e.hatchT <= 0) this.eggHatch(e);
  },
  deathEggsac(e, cx, cy, dx, src, charred) { this.fx.emit(cx, cy, { n: 14, speed: [30, 140], life: [0.3, 0.6], size: [2, 1], cols: [0xffd060, 0xc87a26, 0x7a3814], g: 500, mode: 1 }); Sfx.squelch(); },

  // ---------------------------------------------------------------- the overseer ----
  // A floating eye (1300 HP) ~115 px over you. Phase one it's sealed behind four orbiting shield nodes (110 HP each):
  // shots off the eye only spark, and its health is what the nodes have left. Shoot the nodes off. The LASER: 1.1 s to
  // charge (a red line where it starts and a fan where it'll go), then a beam sweeps under it in 2.2 s, 16 a touch; it
  // stops at walls, crates and girders, so get under cover or dash through it. Phase two the eye is open: it calls
  // drones (two at a time, three at most) and sweeps there and back. Phase three it rages: faster sweeps and a GRID of
  // laser columns round you with two gaps (1.3 s to find one, then 0.9 s live, 18 in a column), twice running.
  setupOverseer(e, x, y, cx, cy) {
    e.body.setAllowGravity(false); this.xbFx(); this.xbLift(e, x, y, TUNE.OVERSEER.alt);
    Object.assign(e, { ai: 'intro', aiUntil: this.time.now + 1800, phase: 1, atkN: 0, cd: 1, side: e.x > this.player.x ? 1 : -1, sideT: 5, spin: 0, nodes: null, look: 0, sw: null, beam: null, grid: null });
    e.glow = this.add.image(e.x, e.y, 'glow').setBlendMode(ADD).setTint(0x46e6ff).setScale(1.3).setAlpha(0.3).setDepth(4.6);
  },
  updateOverseer(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.OVERSEER, b = e.body, pb = this.player.body;
    e.aggro = true; e.stunT = 0;
    if (!e.nodes) this.overseerNodes(e);
    if (e.phase === 1) { let s = 0, m = 0; for (const n of e.nodes) { m += n.def.hp; if (n.alive) s += Math.max(0, n.hp); } e.hp = e.def.hp * (0.66 + 0.34 * s / m); }   // sealed: it has what its nodes have
    const ph = this.xbPhase(e), rage = ph === 3 ? 1.3 : 1;
    if (ph !== e.phase) {
      e.phase = ph; e.sw = null; e.beam = null; e.grid = null;
      this.xbBreak(e, now, ph === 2 ? 'EYE EXPOSED' : 'OVERSEER ENRAGED', ph === 2 ? ['g_plate', 'g_emitter', 'g_shard', 'g_wire'] : ['g_plate', 'g_xlens', 'g_shard', 'g_wire'], ph === 2 ? 0x46e6ff : 0xff3020);
      if (ph === 2) { e.hp = Math.min(e.hp, e.def.hp * 0.66); Sfx.shieldPop(); }
    }
    if ((e.sideT -= dt) <= 0) { e.sideT = rand(4, 6); e.side = -e.side; }
    const firing = e.ai === 'sweep' || e.ai === 'sweepTell' || e.ai === 'grid' || e.ai === 'gridTell';
    this.xbHover(e, dt, firing ? b.center.x : pb.center.x + e.side * 100, this.xbFloor() - T.alt + Math.sin(e.t * 1.8) * 5, firing || e.ai === 'stagger' ? 12 : T.speed * rage);
    e.spin += dt * T.spin * (e.ai === 'sweep' ? 2.2 : 1); if (e.phase === 1) this.overseerPlace(e);
    e.dir = dx >= 0 ? 1 : -1; e.look = Math.atan2(dy, dx);
    switch (e.ai) {
      case 'intro': if (now >= e.aiUntil) e.ai = 'hover'; break;
      case 'stagger': if (Math.random() < 0.4) this.fxSparks(b.center.x + rand(-16, 16), b.center.y + rand(-14, 14), 2); if (now >= e.aiUntil) { e.ai = 'hover'; e.cd = 0.8; } break;
      case 'sweepTell': if (now >= e.aiUntil) { e.ai = 'sweep'; e.sw.t = 0; Sfx.lanceFire(1); this.shake(200, 0.006); } break;
      case 'sweep': {
        const S = e.sw; S.t += dt;
        if (S.t >= S.dur) { if (S.back) { S.back = false; S.t = 0; [S.a0, S.a1] = [S.a1, S.a0]; } else { e.ai = 'hover'; e.cd = T.cd / rage; e.beam = null; break; } }
        this.overseerBeam(e, S.a0 + (S.a1 - S.a0) * S.t / S.dur, dt);
        break;
      }
      case 'gridTell': if (now >= e.aiUntil) { e.ai = 'grid'; e.aiUntil = now + T.grid * 1000; e.grid.live = true; Sfx.lanceFire(1); Sfx.thunder(); this.shake(260, 0.008); } break;
      case 'grid':
        this.overseerGrid(e);
        if (now >= e.aiUntil) { if (--e.grid.left > 0) { this.overseerGridSet(e); e.ai = 'gridTell'; e.aiUntil = now + T.gridTell * 800; Sfx.alarm(); } else { e.grid = null; e.ai = 'hover'; e.cd = T.cd / rage; } }
        break;
      case 'callTell': if (now >= e.aiUntil) { this.overseerDrones(e); e.ai = 'hover'; e.cd = 1.2; } break;
      default:
        if (alive && (e.cd -= dt) <= 0) {
          const cyc = ph === 1 ? ['sweep'] : ph === 2 ? ['drones', 'sweep', 'sweep'] : ['grid', 'sweep', 'drones', 'grid', 'sweep'];
          let a = cyc[e.atkN++ % cyc.length]; if (a === 'drones' && this.xbOwn(e, 'drone') >= T.maxDrones) a = 'sweep';
          if (a === 'sweep') { const s = dx >= 0 ? 1 : -1; e.sw = { a0: -s * T.arc, a1: s * T.arc, t: 0, dur: T.sweep / rage, back: ph >= 2 }; e.ai = 'sweepTell'; e.aiUntil = now + T.sweepTell * 1000 / rage; Sfx.charge(0.9); Sfx.magTell(); }
          else if (a === 'grid') { e.grid = { left: 2 }; this.overseerGridSet(e); e.ai = 'gridTell'; e.aiUntil = now + T.gridTell * 1000; Sfx.alarm(); BUS.emit('callout', 'FIND THE GAP'); }
          else { e.ai = 'callTell'; e.aiUntil = now + 500; Sfx.radio(); }
        }
    }
    e.fr = ph + (firing ? 'c' : 'i');
  },
  visOverseer(e, g, now) {
    const T = TUNE.OVERSEER, b = e.body, cx = b.center.x, cy = b.center.y - 2, L = this.laserG, G = this.xb.gt, A = this.xb.ga;
    const charge = e.ai === 'sweepTell' || e.ai === 'gridTell' || e.ai === 'sweep' || e.ai === 'grid', lx = Math.cos(e.look) * 3, ly = Math.sin(e.look) * (charge ? 1 : 2.5), ir = charge ? 3.5 : 4.5;
    e.glow.setPosition(cx, cy).setAlpha(e.phase === 1 ? 0.35 : 0.25).setTint(e.phase === 3 ? 0xff3020 : 0x46e6ff);
    G.fillStyle(0x0a1a22, 1).fillCircle(cx + lx, cy + ly, ir + 1); G.fillStyle(e.phase === 3 ? 0xff3020 : charge ? 0xffffff : 0x46e6ff, 1).fillCircle(cx + lx, cy + ly, ir);   // the iris follows you
    G.fillStyle(0x07080b, 1).fillCircle(cx + lx * 1.2, cy + ly * 1.2, charge ? 1.2 : 2.2); G.fillStyle(0xffffff, 0.9).fillRect(cx + lx - 2, cy + ly - 3, 2, 1);
    if (e.phase === 1) {                                                 // the shield, and the nodes holding it up
      const hit = now - (e.shieldHitT || 0) < 120, pulse = 0.35 + 0.15 * Math.sin(now / 160);
      A.lineStyle(1, 0x46e6ff, hit ? 0.9 : pulse).strokeCircle(cx, cy, 20); if (hit) A.fillStyle(0x46e6ff, 0.18).fillCircle(cx, cy, 20);
      for (let k = 0; k < 6; k++) { const a = now / 900 + k * Math.PI / 3; A.lineStyle(1, 0x9af4ff, pulse * 0.6).lineBetween(cx + Math.cos(a) * 20, cy + Math.sin(a) * 20, cx + Math.cos(a + 0.5) * 20, cy + Math.sin(a + 0.5) * 20); }
      for (const n of e.nodes || []) if (n.alive && Math.random() < 0.8) A.lineStyle(1, 0x46e6ff, 0.3 + 0.3 * Math.random()).lineBetween(n.x, n.y, cx + (n.x - cx) * 0.55, cy + (n.y - cy) * 0.55);
    }
    if (e.ai === 'sweepTell' && e.sw) {                                  // where the beam starts, and the fan it'll cross
      const R = this.overseerRay(e, e.sw.a0), on = Math.random() < 0.75;
      L.lineStyle(1, 0xff2010, on ? 0.85 : 0.3).lineBetween(R.x0, R.y0, R.x1, R.y1);
      for (let k = 1; k <= 6; k++) { const Q = this.overseerRay(e, e.sw.a0 + (e.sw.a1 - e.sw.a0) * k / 6); L.lineStyle(1, 0xff4020, 0.1).lineBetween(Q.x0, Q.y0, Q.x1, Q.y1); }
      const s = Math.sign(e.sw.a1 - e.sw.a0); for (let j = 0; j < 3; j++) { const a = Math.PI / 2 - e.sw.a0 - s * (0.3 + j * 0.25 + (now / 300) % 0.25); L.lineStyle(1, 0xff6040, 0.7 - j * 0.2).strokeCircle(cx + Math.cos(a) * 24, cy + Math.sin(a) * 24, 1.5); }
    }
    if (e.ai === 'sweep' && e.beam) {
      const R = e.beam; L.lineStyle(7, 0xff2010, 0.22).lineBetween(R.x0, R.y0, R.x1, R.y1); L.lineStyle(3, 0xff5030, 0.85).lineBetween(R.x0, R.y0, R.x1, R.y1); L.lineStyle(1, 0xffffff, 1).lineBetween(R.x0, R.y0, R.x1, R.y1);
      L.fillStyle(0xffd0c0, 0.9).fillCircle(R.x1, R.y1, 3); L.fillStyle(0xff3020, 0.4).fillCircle(R.x1, R.y1, 7);
    }
    if (e.grid && e.grid.cols) for (const C of e.grid.cols) {
      const xc = C.x0 + C.w / 2;
      if (C.safe) { A.fillStyle(0x5cff7a, 0.9).fillRect(C.x0 + 3, C.y1 - 10, 1, 8).fillRect(C.x0 + 3, C.y1 - 10, 4, 1).fillRect(C.x0 + C.w - 4, C.y1 - 10, 1, 8).fillRect(C.x0 + C.w - 7, C.y1 - 10, 4, 1); A.fillStyle(0x5cff7a, 0.07).fillRect(C.x0 + 3, C.y0, C.w - 6, C.y1 - C.y0); continue; }
      if (!e.grid.live) { L.lineStyle(1, 0xff2010, Math.random() < 0.7 ? 0.7 : 0.25).lineBetween(xc, C.y0, xc, C.y1); L.fillStyle(0xff4020, 0.9).fillRect(xc - 1, C.y0 - 1, 3, 3); }
      else { L.fillStyle(0xff2010, 0.28).fillRect(C.x0 + 1, C.y0, C.w - 2, C.y1 - C.y0); L.fillStyle(0xff8060, 0.5).fillRect(xc - 3, C.y0, 6, C.y1 - C.y0); L.fillStyle(0xffffff, 0.9).fillRect(xc - 0.5, C.y0, 1, C.y1 - C.y0); }
    }
    if (e.grid && e.grid.cols && !e.grid.live) for (const C of e.grid.cols) if (!C.safe && Math.random() < 0.3) L.lineStyle(1, 0xff6040, 0.3).lineBetween(cx, cy, C.x0 + C.w / 2, C.y0);
    if (e.phase === 3 && Math.random() < 0.25) this.fxSparks(cx + rand(-14, 14), cy + rand(-12, 12), 2);
  },
  deathOverseer(e, cx, cy, dx, src, charred) {                           // the eye bursts: a white flash and lens shards
    this.xbDeath(e, cx, cy, 'OVERSEER BLINDED', 8, 'arc');
    this.spawnLight(cx, cy, 'glow', 0xffffff, 3, 6, 1, 0.4); BUS.emit('flash', 0.6);
    for (let i = 0; i < 10; i++) this.spawnGib(i % 2 ? 'g_xlens' : 'g_glass2', cx + rand(-6, 6), cy + rand(-6, 6), rand(-280, 280), rand(-380, -120), 'metal');
  },
  setupEyenode(e, x, y, cx, cy) { e.body.setAllowGravity(false); Object.assign(e, { owner: null, idx: 0 }); },
  updateEyenode(e, dt, now) {                                            // its overseer moves it round; alone it just hangs there
    e.stunT = 0; e.fr = Math.floor(now / 150 + e.idx) % 2 ? 'n1' : 'n0';
    if (!e.owner || !e.owner.alive) { e.body.velocity.x *= Math.pow(0.05, dt); e.body.velocity.y = Math.sin(e.t * 2) * 8; }
  },
  deathEyenode(e, cx, cy, dx, src, charred) {
    this.spawnLight(cx, cy, 'ring', 0x46e6ff, 0.3, 2, 0.9, 0.3); this.fxSparks(cx, cy, 14, 0, Math.PI * 2, [80, 240]); Sfx.shieldPop();
    const o = e.owner; if (o && o.alive && o.nodes && o.nodes.some(n => n.alive)) BUS.emit('callout', 'NODE DOWN');
  },

  // ---------------------------------------------------------------- the conductor ----
  // A floating live wire in a tailcoat (1200 HP). It BLINKS: it shimmers where it is and a column of sparks marks
  // where it's going (0.7 s), then it's there (10 to anything on the mark). CHAIN: baton up (0.65 s, a line that
  // tracks you and locks white for the last 0.25 s), then a bolt to the lock (12) that hops on to drums and to you
  // within 90 px; it lights puddles. FLOOR: your floor is cut in strips and the safe ones show first (1.2 s, green),
  // then the rest goes live for 1.3 s (7 per 0.3 s). ORBS: 2-4 slow ball lightning that drift after you for 6.5 s
  // (14 a touch; a bullet pops one). Phase two forks the bolt and narrows the floor's safe ground to two gaps; phase
  // three OVERCHARGES: everything a third quicker and a ring of arcs round it (6 within 34 px).
  setupConductor(e, x, y, cx, cy) {
    e.body.setAllowGravity(false); this.xbFx(); this.xbLift(e, x, y, TUNE.CONDUCTOR.alt);
    Object.assign(e, { ai: 'intro', aiUntil: this.time.now + 1800, phase: 1, atkN: 0, cd: 0.6, hx: e.x, hy: e.y, to: null, lockX: e.x, lockY: e.y, arcT: 0, arcHitT: 0 });
    e.glow = this.add.image(e.x, e.y, 'glow').setBlendMode(ADD).setTint(0x60c8ff).setScale(1).setAlpha(0.5).setDepth(4.6);
  },
  updateConductor(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.CONDUCTOR, b = e.body, pb = this.player.body, ph = this.xbPhase(e), q = ph === 3 ? T.over : 1;
    e.aggro = true; e.stunT = 0;
    if (ph !== e.phase) { e.phase = ph; e.to = null; this.xbBreak(e, now, ph === 2 ? 'HIGH VOLTAGE' : 'OVERCHARGE', ['g_glass', 'g_glass2', 'g_xcoil', 'g_xcoil', 'g_wire', 'g_shard'], 0x60c8ff); Sfx.thunder(); }
    if (Math.abs(e.hy - (this.xbFloor() - T.alt)) > 90) e.hy = this.xbFloor() - T.alt;   // you've gone up or down a level: it follows
    this.xbHover(e, dt, e.hx + Math.sin(e.t * 0.8) * 16, e.hy + Math.sin(e.t * 1.6) * 6, 60);
    e.dir = dx >= 0 ? 1 : -1;
    if (ph === 3 && alive) this.conductorArcs(e, dt, now);
    switch (e.ai) {
      case 'intro': if (now >= e.aiUntil) e.ai = 'hover'; break;
      case 'stagger': if (Math.random() < 0.3) this.pylonZaps.push({ x0: b.center.x, y0: b.center.y, x1: b.center.x + rand(-24, 24), y1: b.center.y + rand(-24, 24), t: now }); if (now >= e.aiUntil) { e.ai = 'hover'; e.cd = 0.5; } break;
      case 'blink': if (Math.random() < 0.6) this.fx.emit(e.to.x + rand(-8, 8), e.to.y + rand(-18, 18), { n: 1, angle: -Math.PI / 2, spread: 0.3, speed: [20, 60], life: [0.2, 0.4], size: [2, 1], cols: [0xffffff, 0xc8f0ff, 0x60c8ff], add: true }); if (now >= e.aiUntil) this.conductorBlink(e); break;
      case 'cast':
        if (now < e.aiUntil - T.lock * 1000) { e.lockX = pb.center.x; e.lockY = pb.center.y; }   // it tracks you, then locks on
        if (Math.random() < 0.4) Sfx.crackle();
        if (now >= e.aiUntil) { this.conductorChain(e, e.lockX, e.lockY); if (ph >= 2) this.conductorChain(e, e.lockX + pb.velocity.x * 0.4 + e.dir * 30, e.lockY, true); e.ai = 'hover'; e.cd = T.cd * q; }
        break;
      case 'floorTell': if (now >= e.aiUntil) { e.ai = 'floorLive'; e.aiUntil = now + T.floorLive * 1000; Sfx.thunder(); this.shake(240, 0.006); } break;
      case 'floorLive': if (now >= e.aiUntil) { e.ai = 'hover'; e.cd = T.cd * q; } break;
      case 'orbTell': if (now >= e.aiUntil) { this.conductorOrbs(e, T.orbs[ph - 1]); e.ai = 'hover'; e.cd = T.cd * q; } break;
      default:
        if (alive && (e.cd -= dt) <= 0) {
          const cyc = ph === 1 ? ['chain', 'blink', 'floor', 'chain', 'orbs', 'blink'] : ph === 2 ? ['floor', 'chain', 'blink', 'orbs', 'chain', 'blink'] : ['blink', 'chain', 'floor', 'orbs', 'chain', 'blink'];
          let a = cyc[e.atkN++ % cyc.length];
          if (a === 'orbs' && this.xb.orbs.filter(o => o.src === e).length >= 5) a = 'chain';
          if (a === 'blink') { e.to = this.conductorSpot(e); if (e.to) { e.ai = 'blink'; e.aiUntil = now + T.blinkTell * 1000 * q; Sfx.decloak(); Sfx.pylonCharge(); } else a = 'chain'; }
          if (a === 'chain') { e.ai = 'cast'; e.aiUntil = now + T.castTell * 1000 * q; e.lockX = pb.center.x; e.lockY = pb.center.y; Sfx.shockCharge(); Sfx.charge(0.8); }
          else if (a === 'floor') { e.ai = 'floorTell'; e.aiUntil = now + T.floorTell * 1000 * q; this.conductorFloor(e, ph, T.floorTell * q); Sfx.railHum(); }
          else if (a === 'orbs') { e.ai = 'orbTell'; e.aiUntil = now + 500 * q; Sfx.shockOrb(); }
        }
    }
    e.fr = ph + (e.ai === 'cast' || e.ai === 'orbTell' || e.ai === 'floorTell' ? 'c' : 'i');
  },
  visConductor(e, g, now) {
    const b = e.body, cx = b.center.x, A = this.xb.ga, L = this.laserG, [tx, ty] = this.conductorTip(e);
    e.glow.setPosition(cx, b.center.y).setScale(e.phase === 3 ? 1.4 + Math.random() * 0.2 : 1).setAlpha(e.ai === 'cast' ? 0.8 : 0.5);
    if (Math.random() < 0.8) this.fx.emit(cx - e.dir * 3 + rand(-3, 3), b.bottom + 4, { n: 1, angle: Math.PI / 2, spread: 0.6, speed: [20, 60], life: [0.15, 0.35], size: [2, 1], cols: [0xffffff, 0xc8f0ff, 0x60c8ff], add: true, g: -40 });   // the spark it floats on
    if (Math.random() < 0.15) this.zap(g, cx + rand(-6, 6), b.bottom, cx + rand(-10, 10), b.bottom + rand(6, 14));
    if (e.ai === 'blink' && e.to) {                                      // a shimmer here, a column of sparks there
      e.setAlpha(0.35 + 0.65 * Math.random());
      A.lineStyle(1, 0x80d8ff, 0.7).strokeCircle(e.to.x, e.to.y, 4 + (now / 25) % 14);
      for (let k = 0; k < 5; k++) A.fillStyle(0xc8f0ff, Math.random() * 0.6).fillRect(e.to.x - 10 + k * 5, e.to.y - 22, 1, 44);
    } else e.setAlpha(1);
    if (e.ai === 'cast') {                                               // the line it'll throw along, white once it's locked
      const lock = now >= e.aiUntil - TUNE.CONDUCTOR.lock * 1000;
      L.lineStyle(1, lock ? 0xffffff : 0x80d8ff, lock ? 0.9 : 0.25 + 0.25 * Math.random()).lineBetween(tx, ty, e.lockX, e.lockY);
      if (lock) L.lineStyle(1, 0xffffff, 0.8).strokeCircle(e.lockX, e.lockY, 5);
      this.zap(g, tx, ty, tx + rand(-7, 7), ty + rand(-7, 7));
    }
    if (e.ai === 'orbTell' || e.ai === 'floorTell') this.zap(g, tx, ty, tx + rand(-8, 8), ty + rand(-8, 8));
  },
  deathConductor(e, cx, cy, dx, src, charred) {                          // it shorts out: one last discharge to the floor and walls
    this.xbDeath(e, cx, cy, 'CIRCUIT BROKEN', 16, 'arc'); Sfx.thunder();
    const now = this.time.now;
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, R = this.sweep(cx, cy, cx + Math.cos(a) * 140, cy + Math.sin(a) * 140); this.pylonZaps.push({ x0: cx, y0: cy, x1: R ? R.x : cx + Math.cos(a) * 140, y1: R ? R.y : cy + Math.sin(a) * 140, t: now }); }
    for (let i = 0; i < 8; i++) this.spawnGib(pick(['g_glass', 'g_glass2', 'g_xcoil']), cx + rand(-6, 6), cy + rand(-10, 4), rand(-260, 260), rand(-380, -140), 'metal');
  },

  // ------------------------------------------------------------------ rocketeer ----
  // Humanoid with a launcher: keeps its distance, 0.75 s orange laser tell, slow rocket aimed at your feet.
  thinkRocketeer(e, dt, now, c) {
    const T = TUNE.ROCKETEER;
    e.fireCd -= dt; e.repickT -= dt;
    switch (e.ai) {
      case 'idle': this.lookAround(e, dt); return 'hold';
      case 'dodge': if (c.onGround && now > e.aiUntil + 120) { e.ai = 'engage'; e.repickT = 0; } return 'free';
      case 'aim': {
        const k = (now - e.aimStart) / T.aimMs;
        if (k < T.lockAt) e.aimA = this.rocketAim(e);
        if (!c.canSee && k < 0.4) { e.ai = 'engage'; e.fireCd = 0.6; return 'hold'; }
        if (k < T.lockAt && c.onGround && this.underFire(e, now)) {   // shot up while lining up: it gives up the shot and ducks
          e.suppCd = now + TUNE.AI.suppressCd; e.ai = 'retreat'; e.aiUntil = now + 1600; e.fireCd = 0.6; this.pickPosition(e, 'cover'); this.coverMe(e); return 'path';
        }
        if (now >= e.aiUntil) { this.rocketeerShoot(e); e.fireCd = T.fireCd * rand(0.85, 1.15); e.ai = 'engage'; e.repickT = Math.random() < 0.5 ? 0 : 1.2; }
        return 'hold';
      }
      case 'retreat': if (now > e.aiUntil) { e.ai = 'engage'; e.repickT = 0; } return 'path';
      case 'search': return this.searchStep(e, dt, now, c);
      default: {
        if (!c.alive) { e.ai = 'idle'; e.aggro = false; return 'hold'; }
        if (now - e.lkT > 1800) { this.startSearch(e, now); return 'path'; }
        if (c.dist < 80 && c.onGround && !e.navAir && e.repickT < 1.5) { e.repickT = 2; e.ai = 'retreat'; e.aiUntil = now + 1400; this.pickPosition(e, 'retreat'); this.bark(e, 'BACK OFF!'); return 'path'; }
        if (c.onGround && !e.navAir && this.underFire(e, now)) {   // pinned down: duck out of sight while a squadmate covers
          e.suppCd = now + TUNE.AI.suppressCd; e.ai = 'retreat'; e.aiUntil = now + 1600; this.pickPosition(e, 'cover'); this.coverMe(e); return 'path';
        }
        if (c.onGround && !e.navAir && e.repickT <= 0) { e.repickT = rand(3, 4.5); if (!this.pickPosition(e, 'attack')) this.pathTo(e, navBelow(e.lkx, e.lky - 4), 160); }
        if (c.canSee && c.onGround && !e.navAir && e.fireCd <= 0 && c.dist < 340 && c.dist > 60) {
          this.aimStart(e, now, T.aimMs); e.aimA = this.rocketAim(e); Sfx.charge(0.6); return 'hold';
        }
        return 'path';
      }
    }
  },

  // ---------------------------------------------------------------------- wasp ----
  // Bomber drone: climbs to a perch well above your head, then makes straight bomb runs over you
  // (blinking bomb sight, 3 bombs) and peels away to line up the next one.
  updateWasp(e, dt, now, dx, dy, dist, alive) {
    const b = e.body, T = TUNE.WASP, pb = this.player.body;
    if (alive && !e.aggro && (e.sees || dist < 140) && dist < e.def.sight) { this.alertEnemy(e, now); Sfx.chirp(); }
    if (e.aggro && e.sees) e.aggroT = Math.max(e.aggroT, 4);
    if (e.aggro && (e.aggroT <= 0 || !alive)) { e.aggro = false; e.ai = 'patrol'; }
    let tx, ty, spd = T.speed;
    if (e.ai === 'run' && alive) {
      tx = e.x + e.runDir * 200; ty = e.runY; spd = T.speed * 1.5;
      e.bombT -= dt;
      if (e.bombT <= 0 && e.bombs > 0 && Math.abs(e.x - pb.center.x) < 64) { e.bombT = T.bombGap; e.bombs--; this.waspDrop(e); }
      const passed = e.runDir > 0 ? e.x > pb.center.x + 110 : e.x < pb.center.x - 110, walled = e.runDir > 0 ? b.blocked.right : b.blocked.left;
      if (now > e.aiUntil || walled || (passed && e.bombs < T.runBombs)) { e.ai = 'rest'; e.aiUntil = now + T.rest * 1000; e.runEnd = now; }
    } else if (e.aggro && alive) {
      const side = e.x < pb.center.x ? -1 : 1, rest = e.ai === 'rest' && now < e.aiUntil;
      tx = pb.center.x + side * (rest ? 140 : 95);
      for (const o of this.enemies.getChildren()) if (o !== e && o.alive && o.kind === 'wasp' && Math.abs(o.x - e.x) < 30 && Math.abs(o.y - e.y) < 24) tx += e.x <= o.x ? -45 : 45;   // don't stack up
      if ((e.altT = (e.altT || 0) - dt) <= 0) { e.altT = 0.3; e.alt = this.waspAlt(pb, pb.center.x); }
      ty = e.alt + Math.sin(e.t * 2) * 6;
      if (!rest) {
        e.ai = 'stalk';
        if (Math.abs(e.y - ty) < 20 && Math.abs(e.x - tx) < 40 && now - (e.runEnd || 0) > 600) { e.ai = 'run'; e.runDir = -side; e.runY = e.alt; e.bombs = T.runBombs; e.bombT = 0.1; e.aiUntil = now + 3200; Sfx.chirp(); }
      }
    } else { tx = e.homeX + Math.sin(e.t * 0.5) * 60; ty = e.homeY + Math.sin(e.t * 1.3) * 10; }
    if (e.stunT <= 0) {
      const k = Math.min(1, dt * 3);
      b.velocity.x += (clamp((tx - b.center.x) * 2.2, -spd, spd) - b.velocity.x) * k;
      b.velocity.y += (clamp((ty - b.center.y) * 2.2, -spd * 0.8, spd * 0.8) - b.velocity.y) * k;
    } else { const f = Math.pow(0.05, dt); b.velocity.x *= f; b.velocity.y *= f; }
    if (Math.abs(b.velocity.x) > 8) e.dir = b.velocity.x > 0 ? 1 : -1;
    e.fr = e.ai === 'run' && e.bombs > 0 ? 'pb' : Math.floor(e.t * 18) % 2 ? 'p1' : 'p0';
  },

  // -------------------------------------------------------------------- rammer ----
  // Armoured charger: snorts and scrapes (0.65 s), then bulldozes in a straight line, smashing crates and
  // girders and trampling its own side. Its ram plate shrugs off frontal fire; slam it into solid metal
  // and it's dizzy - and takes double damage - for a moment.
  updateRammer(e, dt, now, dx, dy, dist, alive) {
    const b = e.body, D = e.def, T = TUNE.RAMMER, onGround = b.blocked.down || b.touching.down, adx = Math.abs(dx), pb = this.player.body;
    const sees = e.sees || (alive && adx < D.sight && Math.abs(dy) < 40 && this.losHard(b.center.x, b.center.y - 3, pb.center.x, pb.center.y - 4));   // crates don't hide you from it
    if (alive && !e.aggro && sees && adx < D.sight && Math.abs(dy) < 80) this.alertEnemy(e, now);
    if (e.aggro && sees) e.aggroT = Math.max(e.aggroT, 4);
    if (e.aggro && (e.aggroT <= 0 || !alive) && e.ai !== 'charge') { e.aggro = false; e.ai = 'patrol'; }
    e.atkCd -= dt;
    let fr = null;
    if (e.ai === 'wind') {
      b.velocity.x = 0; fr = 'wind';
      if (Math.random() < 0.4) this.fxDust(b.center.x - e.dir * 8, b.bottom, 1);
      if (now >= e.aiUntil) { e.ai = 'charge'; e.aiUntil = now + T.chargeT * 1000; e.hitSet = new Set(); Sfx.growl(true); this.shake(120, 0.004); }
    } else if (e.ai === 'charge') {
      b.velocity.x = e.dir * T.speed; fr = Math.floor(now / 70) % 2 ? 'c0' : 'c1';
      if (Math.random() < 0.6) this.fxDust(b.center.x - e.dir * 10, b.bottom, 1);
      if (Math.floor(now / 140) !== e.stepK) { e.stepK = Math.floor(now / 140); Sfx.land(0.5); this.shake(50, 0.002); }
      const fx = e.dir > 0 ? b.right + 2 : b.left - 2;
      for (let yy = b.top + 2; yy < b.bottom - 1; yy += 6) {                // bulldozes breakables
        const tx = Math.floor(fx / TS), ty = Math.floor(yy / TS), ch = this.tileAt(tx, ty);
        if (ch === 'x' || ch === 'g') { this.destroyTile(tx, ty, true); this.addKick(e.dir * 2, 0); }
      }
      for (const o of this.enemies.getChildren()) {                       // ...and its own side
        if (o === e || !o.alive || e.hitSet.has(o) || o.def.anchored) continue;
        const ob = o.body; if (ob.right < b.left - 2 || ob.left > b.right + 2 || ob.bottom < b.top || ob.top > b.bottom) continue;
        e.hitSet.add(o); const k = Math.max(0.3, o.def.kb);
        o.body.velocity.x = e.dir * 380 * k; o.body.velocity.y = -260 * k; o.kickedT = 0.6;
        this.damageEnemy(o, 40, e.dir, -0.5, 'kick'); Sfx.kickHit();
      }
      if (alive && !e.hitP && pb.right > b.left - 2 && pb.left < b.right + 2 && pb.bottom > b.top && pb.top < b.bottom) {
        e.hitP = true;
        if (this.hurtPlayer(T.dmg, b.center.x)) { pb.velocity.x = e.dir * 420; pb.velocity.y = -260; this.shake(200, 0.012); this.addKick(e.dir * 8, -3); Sfx.kickHit(); }
      }
      if ((e.dir > 0 ? b.blocked.right : b.blocked.left) && (this.solidAt(fx, b.center.y) || this.solidAt(fx, b.bottom - 4))) {   // hit solid metal: seeing stars
        e.ai = 'dizzy'; e.aiUntil = now + T.stun * 1000; b.velocity.x = -e.dir * 120; b.velocity.y = -150;
        this.shake(300, 0.012); Sfx.stomp(); Sfx.clang(); this.fxSparks(fx, b.center.y, 14, e.dir > 0 ? Math.PI : 0, 1.4, [80, 260]);
        this.blastTiles(fx + e.dir * 6, b.center.y, 20, 60);
        if (Math.hypot(this.player.x - e.x, this.player.y - e.y) < 320) BUS.emit('callout', 'BONK!');
      } else if (now >= e.aiUntil) { e.ai = 'skid'; e.aiUntil = now + 450; }
    } else if (e.ai === 'skid') {
      b.velocity.x = approach(b.velocity.x, 0, 900 * dt); fr = 'w0';
      if (Math.random() < 0.8) this.fxDust(b.center.x + e.dir * 8, b.bottom, 1);
      if (now >= e.aiUntil) { e.ai = 'chase'; e.atkCd = T.cd; }
    } else if (e.ai === 'dizzy') {
      if (onGround) b.velocity.x = approach(b.velocity.x, 0, 600 * dt); fr = 'dz';
      if (Math.random() < 0.6) this.fx.emit(b.center.x + Math.cos(now / 110) * 9, b.top - 3 + Math.sin(now / 110) * 2, { n: 1, speed: [0, 5], life: [0.2, 0.3], size: [2, 1], cols: [0xffe14a, 0xffffff], add: true });
      if (now >= e.aiUntil) { e.ai = 'chase'; e.atkCd = T.cd * 0.6; }
    } else if (e.aggro && alive) {
      e.ai = 'chase'; e.dir = dx > 0 ? 1 : -1;
      const ground = this.standAt(b.center.x + e.dir * (b.halfWidth + 4), b.bottom + 4);
      b.velocity.x = approach(b.velocity.x, (ground || dy > 20) && adx > 10 ? e.dir * D.chase : 0, 500 * dt);
      if (onGround && e.atkCd <= 0 && sees && adx < 300 && adx > 40 && Math.abs(dy) < 36) { e.ai = 'wind'; e.aiUntil = now + T.windMs; e.hitP = false; Sfx.snort(); this.popAlert(e); }
    } else {
      if (onGround) { const ground = this.standAt(b.center.x + e.dir * (b.halfWidth + 4), b.bottom + 4), wall = e.dir > 0 ? b.blocked.right : b.blocked.left; if (!ground || wall) e.dir *= -1; }
      b.velocity.x = approach(b.velocity.x, e.dir * D.patrol, 400 * dt);
    }
    if (!fr) { const moving = Math.abs(b.velocity.x) > 6 && onGround; if (moving) e.animT += dt * Math.abs(b.velocity.x) / 16; fr = 'w' + (moving ? Math.floor(e.animT) % 4 : 0); }
    e.fr = fr;
  },

  // ------------------------------------------------------------------- sapper ----
  // Runs in under your feet, kneels, drops a 2 s satchel charge and legs it. The charge wrecks the floor.
  // Shoot the charge to cook it off early, or kick it back at them.
  thinkSapper(e, dt, now, c) {
    const T = TUNE.SAPPER;
    e.repathT -= dt; e.plantCd -= dt;
    switch (e.ai) {
      case 'idle': this.lookAround(e, dt); return 'hold';
      case 'dodge': if (c.onGround && now > e.aiUntil + 120) { e.ai = 'hunt'; e.repathT = 0; } return 'free';
      case 'plant':
        if (now >= e.aiUntil) { this.plantCharge(e.x + e.dir * 6, e.body.bottom - 4, T.fuse); e.ai = 'flee'; e.aiUntil = now + 2600; e.plantCd = T.cd; this.pickPosition(e, 'retreat'); Sfx.radio(); }
        return 'hold';
      case 'flee': if (now > e.aiUntil) { e.ai = 'hunt'; e.repathT = 0; } return 'path';
      default: {
        if (!c.alive || now - e.lkT > 6000) { e.ai = 'idle'; e.aggro = false; return 'hold'; }
        if (c.onGround && !e.navAir && e.plantCd <= 0 && c.dist < T.plantRange && Math.abs(c.dy) < 40) { e.ai = 'plant'; e.aiUntil = now + T.plantMs; e.body.velocity.x = 0; Sfx.beep(); return 'hold'; }
        if (c.onGround && !e.navAir && e.repathT <= 0) { e.repathT = 0.7; this.pathTo(e, navBelow(e.lkx, e.lky - 4), 120); }
        return 'path';
      }
    }
  },

  // ----------------------------------------------------------------- jet trooper ----
  // Hovers off your shoulder on a jetpack, swaps sides every few seconds, 0.35 s glint then a 4-round burst.
  // Kill it cleanly and the pack goes haywire: it careens round the room, smashing its squad, then blows.
  updateJet(e, dt, now, dx, dy, dist, alive) {
    const b = e.body, T = TUNE.JET, pb = this.player.body;
    if (alive && !e.aggro && (e.sees || dist < 120) && dist < e.def.sight) { this.alertEnemy(e, now); Sfx.chirp(); }
    if (e.aggro && e.sees) e.aggroT = Math.max(e.aggroT, 4);
    if (e.aggro && (e.aggroT <= 0 || !alive)) e.aggro = false;
    let tx, ty;
    if (e.aggro && alive) {
      e.sideT -= dt; if (e.sideT <= 0) { e.sideT = rand(2.5, 4.5); e.side *= -1; }
      tx = pb.center.x + e.side * T.range + Math.sin(e.t * 1.7) * 30;
      ty = pb.top - T.height + Math.sin(e.t * 2.3) * 14;
      for (let i = 0; i < 5 && this.solidAt(tx, ty); i++) { tx += (pb.center.x - tx) * 0.3; ty += 10; }
      if (e.ai !== 'burst') e.aimA = Math.atan2(pb.center.y - e.y, pb.center.x - e.x);
      e.dir = dx >= 0 ? 1 : -1;
    } else {
      tx = e.homeX + Math.sin(e.t * 0.4) * 50; ty = e.homeY + Math.sin(e.t * 1.1) * 10;
      if (Math.abs(b.velocity.x) > 8) e.dir = b.velocity.x > 0 ? 1 : -1;
      e.aimA = e.dir > 0 ? 0.3 : Math.PI - 0.3;
    }
    if (e.stunT <= 0) {
      const k = Math.min(1, dt * 2.4);
      b.velocity.x += (clamp((tx - b.center.x) * 2, -T.speed, T.speed) - b.velocity.x) * k;
      b.velocity.y += (clamp((ty - b.center.y) * 2, -T.speed * 0.8, T.speed * 0.8) - b.velocity.y) * k;
    } else b.velocity.y += 300 * dt;                                      // stunned: loses thrust and drops
    e.fireCd -= dt;
    if (e.ai === 'tell') { if (now >= e.aiUntil) { e.ai = 'burst'; e.shotsLeft = T.burst; e.shotT = 0; } }
    else if (e.ai === 'burst') {
      e.shotT -= dt;
      if (e.shotT <= 0 && e.shotsLeft > 0) { this.jetShoot(e); e.shotsLeft--; e.shotT = T.gap; }
      if (e.shotsLeft <= 0) { e.ai = 'fly'; e.fireCd = rand(1.3, 2); }
    } else if (e.aggro && alive && e.fireCd <= 0 && e.sees && dist < 300) { e.ai = 'tell'; e.aiUntil = now + T.tellMs; e.aimA = this.leadAngle(e, T.bulletSpeed); Sfx.charge(0.4); }
    if (Math.random() < 0.8) this.fx.emit(e.x - e.dir * 4, e.y + 9, { n: 1, angle: Math.PI / 2, spread: 0.4, speed: [60, 130], life: [0.08, 0.18], size: [3, 1], cols: [0xffffff, 0x9adcff, 0x4a8aff], add: true });
    if (Math.random() < 0.12) this.fxSmoke(e.x - e.dir * 4, e.y + 11, 1, 0.5);
    e.recoil = Math.max(0, e.recoil - 30 * dt);
    e.fr = Math.floor(e.t * 6) % 2 ? 'j1' : 'j0';
  },

  // ---------------------------------------------------------------- brood mother ----
  // Slow, fat, and full of ticks: swells up (0.7 s) and births a pair every few seconds; bursts into more.
  updateBrood(e, dt, now, dx, dy, dist, alive) {
    const b = e.body, D = e.def, T = TUNE.BROOD, onGround = b.blocked.down || b.touching.down;
    if (alive && !e.aggro && (e.sees || dist < 160) && dist < D.sight) this.alertEnemy(e, now);
    if (e.aggro && e.sees) e.aggroT = Math.max(e.aggroT, 5);
    if (e.aggro && (e.aggroT <= 0 || !alive)) e.aggro = false;
    e.atkCd -= dt;
    if (e.ai === 'birth') {
      b.velocity.x = approach(b.velocity.x, 0, 300 * dt);
      e.fr = 1 - (e.aiUntil - now) / T.tellMs > 0.55 ? 'sw2' : 'sw';
      if (Math.random() < 0.3) this.fxBlood(e.x + rand(-8, 8), b.top + 4, 1, -Math.PI / 2, 1, [20, 60]);
      if (now >= e.aiUntil) { this.broodBirth(e.x, e.body.top + 8, e.dir, T.spawn, e); e.ai = 'crawl'; e.atkCd = T.cd; }
      return;
    }
    if (e.aggro && alive) {
      e.dir = dx > 0 ? 1 : -1; e.ai = 'crawl';
      const ground = this.stepOk(b.center.x + e.dir * (b.halfWidth + 4), b.bottom) || (e.blindT > 3 && dy > 40);   // short drops are fine; a big one only to find you
      b.velocity.x = approach(b.velocity.x, ground && Math.abs(dx) > 30 ? e.dir * T.speed : 0, 200 * dt);
      const mine = this.enemies.getChildren().filter(o => o.alive && o.mother === e).length;
      if (onGround && e.atkCd <= 0 && mine < T.max) { e.ai = 'birth'; e.aiUntil = now + T.tellMs; Sfx.growl(true); }
    } else {
      if (onGround) { const ground = this.standAt(b.center.x + e.dir * (b.halfWidth + 4), b.bottom + 4), wall = e.dir > 0 ? b.blocked.right : b.blocked.left; if (!ground || wall) e.dir *= -1; }
      b.velocity.x = approach(b.velocity.x, e.dir * T.speed * 0.6, 200 * dt);
    }
    const moving = Math.abs(b.velocity.x) > 4; if (moving) e.animT += dt * 5;
    e.fr = 'w' + (moving ? Math.floor(e.animT) % 4 : 0);
  },

  // ------------------------------------------------------------------- screamer ----
  // Flaming kamikaze skulls: hover off to one side, shriek (0.5 s), then dive at you and blow. Killing one in
  // the air still sets it off; frozen ones just shatter.
  updateScreamer(e, dt, now, dx, dy, dist, alive) {
    const b = e.body, T = TUNE.SCREAMER, pb = this.player.body;
    if (alive && !e.aggro && (e.sees || dist < 150) && dist < e.def.sight) { e.aggro = true; e.aggroT = 6; this.popAlert(e); }
    if (e.ai === 'dive') {
      const want = Math.atan2(pb.center.y - e.y, pb.center.x - e.x);
      let da = want - e.head; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      e.head += clamp(da, -T.turn * dt, T.turn * dt);
      e.spd = Math.min(T.speed * 1.2, e.spd + 220 * dt);
      b.velocity.x = Math.cos(e.head) * e.spd; b.velocity.y = Math.sin(e.head) * e.spd;
      e.dir = b.velocity.x >= 0 ? 1 : -1; e.rotation = e.dir > 0 ? e.head : e.head - Math.PI;
      this.fx.emit(e.x - Math.cos(e.head) * 6, e.y - Math.sin(e.head) * 6, { n: 2, angle: e.head + Math.PI, spread: 0.5, speed: [30, 90], life: [0.12, 0.3], size: [4, 1], cols: [0xffffff, 0xffe46a, 0xff8a1f, 0xc03010], add: true });
      if ((alive && dist < 12) || b.blocked.left || b.blocked.right || b.blocked.up || b.blocked.down || now > e.aiUntil) { this.screamerBoom(e); return; }
      e.fr = 'sw';
      return;
    }
    if (e.ai === 'wind') {
      b.velocity.x *= Math.pow(0.02, dt); b.velocity.y *= Math.pow(0.02, dt);
      e.rotation = rand(-0.15, 0.15); e.fr = 'sw';
      if (now >= e.aiUntil) { e.ai = 'dive'; e.head = Math.atan2(pb.center.y - e.y, pb.center.x - e.x); e.spd = T.speed * 0.7; e.aiUntil = now + 2600; }
      return;
    }
    let tx = e.homeX + Math.sin(e.t * 0.8) * 30, ty = e.homeY + Math.sin(e.t * 1.9) * 8;
    if (e.aggro && alive) {
      tx = pb.center.x + (e.x < pb.center.x ? -110 : 110) + Math.sin(e.t * 2.3) * 20; ty = pb.top - 50 + Math.sin(e.t * 3) * 10; e.dir = dx >= 0 ? 1 : -1;
      if (this.solidAt(tx, ty)) ty += 20;
      e.atkT -= dt;
      if (e.atkT <= 0 && e.sees && dist < 260) { e.ai = 'wind'; e.aiUntil = now + T.windMs; Sfx.scream(); return; }
    }
    const k = Math.min(1, dt * 2.5);
    b.velocity.x += (clamp((tx - b.center.x) * 2, -150, 150) - b.velocity.x) * k;
    b.velocity.y += (clamp((ty - b.center.y) * 2, -120, 120) - b.velocity.y) * k;
    e.fr = Math.floor(e.t * 10) % 2 ? 's1' : 's0';
  },

  // --------------------------------------------------------------------- warden ----
  // Shield drone: links to the 2 nearest allies and soaks 75% of what hits them (bubble + tether). Kill it first.
  updateWarden(e, dt, now, dx, dy, dist, alive) {
    const b = e.body, T = TUNE.WARDEN, pb = this.player.body;
    if (alive && !e.aggro && (e.sees || dist < 150) && dist < e.def.sight) this.alertEnemy(e, now);
    e.linkT -= dt;
    if (e.linkT <= 0) {
      e.linkT = 0.4;
      e.links = this.enemies.getChildren().filter(o => o.alive && o !== e && !o.def.boss && !o.def.noClip && !['warden', 'tick', 'screamer', 'gnat'].includes(o.kind) && Math.hypot(o.x - e.x, o.y - e.y) < T.range * 1.6)
        .sort((p, q) => Math.hypot(p.x - e.x, p.y - e.y) - Math.hypot(q.x - e.x, q.y - e.y)).slice(0, T.links);
    }
    const L = e.links.filter(o => o.alive);
    for (const o of L) if (Math.hypot(o.x - e.x, o.y - e.y) < T.range) { o.shieldBy = e; o.shieldT = now + 200; }
    let tx = e.homeX, ty = e.homeY;
    if (L.length) { tx = L.reduce((s, o) => s + o.x, 0) / L.length; ty = L.reduce((s, o) => s + o.y, 0) / L.length - 36; tx += tx < pb.center.x ? -24 : 24; }
    else if (e.aggro && alive) { tx = pb.center.x + (e.x < pb.center.x ? -140 : 140); ty = pb.top - 60; }
    if (this.solidAt(tx, ty)) ty += 16;
    if (e.stunT <= 0) { const k = Math.min(1, dt * 2.2); b.velocity.x += (clamp((tx - b.center.x) * 2, -90, 90) - b.velocity.x) * k; b.velocity.y += (clamp((ty - b.center.y) * 2, -80, 80) - b.velocity.y) * k; }
    else { const f = Math.pow(0.05, dt); b.velocity.x *= f; b.velocity.y *= f; }
    if (Math.abs(b.velocity.x) > 6) e.dir = b.velocity.x > 0 ? 1 : -1;
    e.fr = Math.floor(e.t * 6) % 2 ? 'v1' : 'v0';
  },

  // ------------------------------------------------------------------ juggernaut ----
  // Mini-boss: 0.65 s spin-up (laser tell) then a 2 s minigun sweep that lags behind you - keep moving.
  // Armour cracks off at 66% and 33%; each stage makes it faster and angrier.
  updateJugg(e, dt, now, dx, dy, dist, alive) {
    const b = e.body, D = e.def, onGround = b.blocked.down || b.touching.down, pb = this.player.body;
    const T = TUNE.JUGG, attack = this.campaign ? TUNE.CAMPAIGN_JUGG : T;
    if (alive && !e.aggro && (e.sees || dist < 200) && dist < D.sight) this.alertEnemy(e, now);
    if (e.aggro && e.sees) e.aggroT = Math.max(e.aggroT, 5);
    const stage = e.hp > D.hp * 0.66 ? 0 : e.hp > D.hp * 0.33 ? 1 : 2;
    if (stage !== e.stage) { e.stage = stage; this.juggCrack(e); }
    e.atkCd -= dt;
    const want = Math.atan2(pb.center.y - (e.y - 1), pb.center.x - e.x);
    let da = want - e.aimA; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
    if (e.ai === 'spin') {
      b.velocity.x = approach(b.velocity.x, 0, 400 * dt);
      e.aimA += clamp(da, -3 * dt, 3 * dt); e.spin = Math.min(1, e.spin + dt / (attack.spinMs / 1000));
      if (now >= e.aiUntil) { e.ai = 'fire'; e.aiUntil = now + attack.fireT * 1000; e.shotT = 0; }
    } else if (e.ai === 'fire') {
      b.velocity.x = approach(b.velocity.x, 0, 400 * dt);
      const turn = attack.turn * (1 + stage * 0.3) * dt;
      e.aimA += clamp(da, -turn, turn);                                    // the sweep lags behind you
      e.shotT -= dt;
      while (e.shotT <= 0) { e.shotT += attack.rate; this.juggShoot(e); }
      if (now >= e.aiUntil) { e.ai = 'walk'; e.atkCd = attack.cd; }
    } else {
      e.spin = Math.max(0, e.spin - dt * 1.5);
      if (e.aggro && alive) {
        e.aimA += clamp(da, -2 * dt, 2 * dt);
        const dir = dx > 0 ? 1 : -1, ground = this.standAt(b.center.x + dir * (b.halfWidth + 4), b.bottom + 4);
        b.velocity.x = approach(b.velocity.x, (ground || dy > 20) && Math.abs(dx) > 60 ? dir * T.speed * (1 + stage * 0.35) : 0, 300 * dt);
        if (onGround && (dir > 0 ? b.blocked.right : b.blocked.left)) b.velocity.y = -300;   // clambers over junk
        if (e.atkCd <= 0 && e.sees && dist < 320) { e.ai = 'spin'; e.aiUntil = now + attack.spinMs; Sfx.charge(0.8); Sfx.growl(true); }
      } else {
        if (onGround) { const ground = this.standAt(b.center.x + e.dir * (b.halfWidth + 4), b.bottom + 4), wall = e.dir > 0 ? b.blocked.right : b.blocked.left; if (!ground || wall) e.dir *= -1; }
        b.velocity.x = approach(b.velocity.x, e.dir * T.speed * 0.6, 200 * dt); e.aimA = e.dir > 0 ? 0.2 : Math.PI - 0.2;
      }
    }
    e.dir = Math.cos(e.aimA) >= 0 ? 1 : -1;
    const moving = Math.abs(b.velocity.x) > 5 && onGround;
    if (moving) { e.animT += dt * Math.abs(b.velocity.x) / 14; const st = Math.floor(e.animT); if (st !== e.stepK) { e.stepK = st; if (st % 2 === 0) { this.shake(70, 0.003); Sfx.land(0.7); } } }
    e.fr = 's' + stage + 'w' + (moving ? Math.floor(e.animT) % 4 : 0);
    e.recoil = Math.max(0, e.recoil - 30 * dt);
  },

  // -------------------------------------------------------------------- cloaker ----
  // Phase-cloaked assassin: a shimmer and two cyan eyes until it's close, then it flickers in (0.35 s),
  // lunges with a wrist blade and fades back out. Any hit lights it up for a moment.
  thinkCloaker(e, dt, now, c) {
    const T = TUNE.CLOAKER, b = e.body, pb = this.player.body;
    e.repathT -= dt; e.attackCd -= dt;
    switch (e.ai) {
      case 'idle': this.lookAround(e, dt, 0.6); return 'hold';
      case 'dodge': if (c.onGround && now > e.aiUntil + 120) { e.ai = 'hunt'; e.repathT = 0; } return 'free';
      case 'reveal':
        e.dir = c.dx >= 0 ? 1 : -1;
        if (now >= e.aiUntil) { e.ai = 'strike'; e.aiUntil = now + 220; b.velocity.x = e.dir * T.dash; b.velocity.y = -60; e.struck = false; Sfx.whoosh(); }
        return 'hold';
      case 'strike':
        if (!e.struck && this.state !== 'dead' && Math.abs(pb.center.x - b.center.x) < 16 && Math.abs(pb.center.y - b.center.y) < 18) {
          e.struck = true;
          if (this.hurtPlayer(T.strikeDmg, b.center.x)) { this.shake(150, 0.008); Sfx.kickHit(); this.fxBlood(pb.center.x, pb.center.y, 8); }
        }
        if (now >= e.aiUntil) { e.ai = 'fade'; e.aiUntil = now + 1200; e.attackCd = 2.2; this.pickPosition(e, 'retreat'); }
        return 'free';
      case 'fade': if (now > e.aiUntil) { e.ai = 'hunt'; e.repathT = 0; } return 'path';
      default: {
        if (!c.alive || now - e.lkT > 7000) { e.ai = 'idle'; e.aggro = false; return 'hold'; }
        if (c.onGround && !e.navAir && e.attackCd <= 0 && c.dist < 64 && Math.abs(c.dy) < 30) { e.ai = 'reveal'; e.aiUntil = now + T.revealMs; Sfx.decloak(); return 'hold'; }
        if (c.onGround && !e.navAir && e.repathT <= 0) { e.repathT = 0.6; this.pathTo(e, navBelow(e.lkx, e.lky - 4), 140); }
        return 'path';
      }
    }
  },

  // ----------------------------------------------------------------------- pyro ----
  // Keeps mid range and lobs firebombs that leave burning patches. Fireproof itself - but the tank on its back
  // goes up when it dies.
  thinkPyro(e, dt, now, c) {
    const T = TUNE.PYRO;
    e.fireCd -= dt; e.repickT -= dt;
    switch (e.ai) {
      case 'idle': this.lookAround(e, dt); return 'hold';
      case 'dodge': if (c.onGround && now > e.aiUntil + 120) { e.ai = 'engage'; e.repickT = 0; } return 'free';
      case 'windup':
        if (now >= e.aiUntil) { if (e.kind === 'grenadier') this.throwGrenade(e); else this.throwFirebomb(e); e.ai = 'throw'; e.aiUntil = now + 250; e.fireCd = (e.kind === 'grenadier' ? TUNE.GRENADIER.fireCd : T.fireCd) * rand(0.85, 1.15); }
        return 'hold';
      case 'throw': if (now >= e.aiUntil) { e.ai = 'engage'; e.repickT = Math.random() < 0.5 ? 0 : 1; } return 'hold';
      default: {
        if (!c.alive || now - e.lkT > 6000) { e.ai = 'idle'; e.aggro = false; return 'hold'; }
        if (c.onGround && !e.navAir && e.repickT <= 0) { e.repickT = rand(2.5, 4); if (!this.pickPosition(e, 'attack')) this.pathTo(e, navBelow(e.lkx, e.lky - 4), 140); }
        if (c.canSee && c.onGround && !e.navAir && e.fireCd <= 0 && c.dist > 50 && c.dist < 260) { e.ai = 'windup'; e.aiUntil = now + (e.kind === 'grenadier' ? TUNE.GRENADIER.windMs : T.windMs); if (e.kind === 'tarspit') Sfx.gurgle(); else if (e.kind === 'grenadier') Sfx.clunk(0.5); else Sfx.ignite(); return 'hold'; }
        return 'path';
      }
    }
  },

  // -------------------------------------------------------------------- gunship ----
  // Flying mini-boss that hangs under the ceiling: rocket volleys (0.6 s pod glow), chain-gun strafing runs,
  // and it drops troops. Kill it and it spirals down in flames and craters whatever it lands on.
  updateGunship(e, dt, now, dx, dy, dist, alive) {
    const b = e.body, T = TUNE.GUNSHIP, pb = this.player.body, hpF = e.hp / e.def.hp;
    if (alive) e.aggro = true;
    const profile = this.campaign ? TUNE.CAMPAIGN_GUNSHIP : null;
    e.volT -= dt; e.dropT -= dt; e.strT -= dt; e.sideT -= dt; e.attackRest -= dt;
    if (e.sideT <= 0) { e.sideT = rand(4, 6); e.side *= -1; }
    let tx = clamp(pb.center.x + e.side * 110, 80, LW - 80), spd = T.speed;
    const ty = T.alt + Math.sin(e.t * 1.3) * 5;
    if (e.ai === 'tell') {
      if (now >= e.aiUntil) { e.ai = 'volley'; e.shots = profile?.rockets ?? 3; e.aiUntil = now; }
    } else if (e.ai === 'volley') {
      if (now >= e.aiUntil && e.shots > 0) {
        e.shots--; e.aiUntil = now + (profile?.rocketGapMs ?? 220); this.gunshipRocket(e);
        if (e.shots === 0) {
          e.ai = 'cruise'; e.volT = profile?.volleyCd ?? T.volleyCd * (hpF < 0.5 ? 0.7 : 1);
          e.attackRest = profile?.recovery ?? 0;
        }
      }
    } else if (e.ai === 'strafeTell') {
      if (now >= e.aiUntil) { e.ai = 'strafe'; e.shots = profile.rounds; e.shotT = 0; }
    } else if (e.ai === 'strafe') {
      e.shotT -= dt;
      while (e.shotT <= 0 && e.shots > 0) { e.shotT += profile?.shotGap ?? 0.08; e.shots--; this.gunshipGun(e); }
      tx = e.x + e.strDir * 200; spd *= 1.6;
      if (e.shots === 0) { e.ai = 'cruise'; e.strT = profile?.strafeCd ?? T.strafeCd; e.attackRest = profile?.recovery ?? 0; }
    } else if (alive && e.attackRest <= 0) {
      e.ai = 'cruise';
      if (e.volT <= 0 && dist < 520) {
        e.ai = 'tell'; e.aiUntil = now + (profile?.rocketTellMs ?? 600); Sfx.charge(0.9);
      } else if (e.dropT <= 0 && e.drops < (profile ? 1 : 3)) {
        e.dropT = T.dropCd; e.drops++; this.gunshipDrop(e); e.attackRest = profile?.recovery ?? 0;
      } else if (e.strT <= 0 && Math.abs(dx) < 220) {
        e.strDir = dx >= 0 ? 1 : -1; Sfx.charge(0.5);
        if (profile) { e.ai = 'strafeTell'; e.aiUntil = now + profile.strafeTellMs; }
        else { e.ai = 'strafe'; e.shots = 18; e.shotT = 0; }
      }
    }
    const k = Math.min(1, dt * 1.6);
    b.velocity.x += (clamp((tx - b.center.x) * 1.5, -spd, spd) - b.velocity.x) * k;
    b.velocity.y += (clamp((ty - b.center.y) * 2, -60, 60) - b.velocity.y) * k;
    e.dir = dx >= 0 ? 1 : -1;
    if (hpF < 0.5 && Math.random() < 0.5) this.fxSmoke(e.x - e.dir * 10, e.y - 6, 1, 1);
    if (hpF < 0.25 && Math.random() < 0.3) { this.fxSparks(e.x + rand(-20, 20), e.y, 3); this.fxFire(e.x - e.dir * 10, e.y - 4, 2); }
    if (Math.random() < 0.6) this.fx.emit(e.x + rand(-14, 14), b.bottom + 2, { n: 1, angle: Math.PI / 2, spread: 0.3, speed: [60, 120], life: [0.1, 0.25], size: [3, 1], cols: [0xffffff, 0x9adcff, 0x4a8aff], add: true });
    e.fr = Math.floor(e.t * 12) % 2 ? 'g1' : 'g0';
  },

  // --------------------------------------------------------------- slagling ----
  // Hopping molten blob: big ones split into two mid ones, mids into two small ones (7 kills per big slagling).
  // Fireproof; frozen ones shatter without splitting.
  updateSlagling(e, dt, now, dx, dy, dist, alive) {
    const b = e.body, D = e.def, T = TUNE.SLAGLING, onGround = b.blocked.down || b.touching.down;
    if (alive && !e.aggro && (e.sees || dist < 140) && dist < D.sight) { e.aggro = true; e.aggroT = 6; this.popAlert(e); Sfx.sizzle(); }
    if (e.aggro && e.sees) e.aggroT = Math.max(e.aggroT, 4);
    if (e.aggro && (e.aggroT <= 0 || !alive)) e.aggro = false;
    e.hopT -= dt; e.landT -= dt;
    if (onGround) {
      if (!e.wasGround && e.airT > 0.12) {                               // splat down
        e.landT = 0.16;
        this.fx.emit(b.center.x, b.bottom - 1, { n: 3 + D.tier * 3, angle: -Math.PI / 2, spread: 2.6, speed: [30, 120], life: [0.2, 0.5], size: [2, 1], cols: [0xffffff, 0xffe080, 0xffa030, 0xff5a1a], add: true, g: 420, mode: 1 });
        if (D.tier >= 1) this.paintScorch(b.center.x, b.bottom + 2, 3 + D.tier * 2);
        Sfx.splat(D.tier);
      }
      if (e.stunT <= 0) b.velocity.x = approach(b.velocity.x, 0, 900 * dt);
      if (e.stunT <= 0 && e.hopT <= 0) {
        const chase = e.aggro && alive, dir = chase ? (Math.sign(dx) || e.dir) : (Math.random() < 0.5 ? -1 : 1);
        e.dir = dir;
        b.velocity.x = dir * T.vx * [1.15, 1, 0.82][D.tier] * (chase ? rand(0.85, 1.35) : 0.45);
        b.velocity.y = -rand(T.vy[0], T.vy[1]) * (chase ? 1 : 0.55) * (chase && dy < -40 ? 1.25 : 1);   // hops higher to reach you on a ledge
        e.hopT = rand(T.hop[0], T.hop[1]) * (chase ? 1 : 2.4);
      }
      e.fr = e.hopT < 0.16 || e.landT > 0 ? 'q' : 'a';
    } else e.fr = b.velocity.y < -40 ? 's' : 'a';
    e.airT = onGround ? 0 : e.airT + dt; e.wasGround = onGround;
    if (Math.random() < dt * (1.5 + D.tier * 2)) this.fx.emit(b.center.x + rand(-b.halfWidth, b.halfWidth), b.bottom - 1, { n: 1, angle: Math.PI / 2, spread: 0.3, speed: [5, 20], life: [0.3, 0.6], size: [2, 1], cols: [0xffe080, 0xff8a20, 0xa02008], add: true, g: 300, mode: 1 });
  },

  // --------------------------------------------------------------- burrower ----
  // Slag worm that swims under whatever floor you stand on (a trail of grit gives it away), rumbles for 0.7 s
  // under your feet, then erupts through you (22 dmg + launch). Only hittable once it's out: it hangs in the air,
  // writhes on the floor for a second, then digs back in.
  updateBurrower(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.BURROWER, b = e.body, pb = this.player.body, onGround = b.blocked.down || b.touching.down;
    e.aggro = true; e.aggroT = 99;
    if (e.ai === 'under') {
      e.cd -= dt;
      if (alive) { const fy = this.floorBelow(pb.center.x, pb.bottom - 4); if (fy !== null) e.floorY = fy; }
      const du = (alive ? pb.center.x : e.ux) - e.ux, sp = T.speed * (Math.abs(du) > 160 ? 1.7 : 1);
      e.ux = clamp(e.ux + clamp(du, -sp * dt, sp * dt), 40, LW - 40);
      const surf = this.standAt(e.ux, e.floorY + 2);
      if (surf && (e.trailT -= dt) <= 0) {                               // grit thrown up along its path
        e.trailT = 0.045;
        this.fx.emit(e.ux + rand(-3, 3), e.floorY - 1, { n: 1, angle: -Math.PI / 2, spread: 1.3, speed: [30, 90], life: [0.2, 0.45], size: [2, 1], cols: [0x7a6a58, 0x4a3e32, 0xff8a20], g: 420, mode: 1 });
        if (Math.random() < 0.25) this.fxDust(e.ux, e.floorY, 1);
      }
      if ((e.rumT -= dt) <= 0) { e.rumT = 0.32; Sfx.rumble(clamp(1 - Math.abs(e.ux - pb.center.x) / 320, 0.1, 0.8)); }
      if (alive && this.state === 'play' && e.cd <= 0 && Math.abs(du) < 10 && surf && Math.abs(pb.bottom - e.floorY) < 26) { e.ai = 'tell'; e.aiUntil = now + T.tellMs; Sfx.rumble(1); }
    } else if (e.ai === 'tell') {
      if (Math.random() < 0.7) this.fx.emit(e.ux + rand(-7, 7), e.floorY - 1, { n: 1, angle: -Math.PI / 2, spread: 0.7, speed: [60, 170], life: [0.25, 0.5], size: [2, 1], cols: [0xffe080, 0xffa030, 0x7a6a58], g: 520, mode: 1 });
      if ((e.glowT -= dt) <= 0) { e.glowT = 0.1; this.spawnLight(e.ux, e.floorY - 2, 'glow', 0xff4a10, 1.2, 2.2, 0.65, 0.16); }
      this.shake(80, 0.002 + 0.004 * (1 - (e.aiUntil - now) / T.tellMs));
      if (now >= e.aiUntil) this.burrowerErupt(e);
    } else if (e.ai === 'erupt') {
      e.fr = b.velocity.y < 60 ? 'up' : 'shut';
      if (Math.random() < 0.5) this.fx.emit(b.center.x, b.bottom, { n: 1, speed: [10, 40], life: [0.3, 0.6], size: [2, 1], cols: [0xffa030, 0xff5a1a], add: true, g: 300 });
      if (onGround && b.velocity.y >= 0 && e.airT > 0.12) { e.ai = 'exposed'; e.aiUntil = now + T.exposed * 1000; this.fxDust(b.center.x, b.bottom, 6); Sfx.land(0.8); this.shake(90, 0.004); }
    } else {                                                              // exposed: writhing on the floor
      if (onGround && e.stunT <= 0) b.velocity.x = approach(b.velocity.x, 0, 600 * dt);
      e.fr = Math.floor(e.t * 7) % 2 ? 'sw0' : 'sw1';
      if (now >= e.aiUntil && onGround) this.burrowerDig(e);
    }
    e.airT = onGround ? 0 : e.airT + dt;
  },

  // -------------------------------------------------------------- harpooner ----
  // Dock brute with a chain harpoon: 0.6 s windup (yellow sight line, locks for the last 30%), then a 430 px/s
  // throw. Hooked, you get reeled in for a 16-dmg slash. Kick or dash to snap the chain, or hurt it for 25 to
  // make it let go.
  thinkHarpooner(e, dt, now, c) {
    const T = TUNE.HARPOON, pb = this.player.body;
    e.fireCd -= dt; e.repickT -= dt;
    if (e.hk) { if (c.onGround) e.body.velocity.x = approach(e.body.velocity.x, 0, 1600 * dt); return 'hold'; }   // plants its feet while the line is out
    switch (e.ai) {
      case 'idle': this.lookAround(e, dt); return 'hold';
      case 'dodge': if (c.onGround && now > e.aiUntil + 120) { e.ai = 'engage'; e.repickT = 0; } return 'free';
      case 'windup':
        e.dir = c.dx >= 0 ? 1 : -1;
        if (now < e.aiUntil - T.windMs * 0.3) e.aimA = Math.atan2(pb.center.y - (e.y - 8), pb.center.x + pb.velocity.x * 0.15 - e.x);
        if (now >= e.aiUntil) { this.throwHarpoon(e); e.ai = 'throw'; e.aiUntil = now + 300; e.fireCd = T.cd * rand(0.9, 1.15); }
        return 'hold';
      case 'throw': case 'strike': if (now >= e.aiUntil) { e.ai = 'engage'; e.repickT = 0.5; } return 'hold';
      default: {
        if (!c.alive || now - e.lkT > 6000) { e.ai = 'idle'; e.aggro = false; return 'hold'; }
        if (c.onGround && !e.navAir && e.repickT <= 0) { e.repickT = rand(2, 3.5); if (!this.pickPosition(e, 'attack')) this.pathTo(e, navBelow(e.lkx, e.lky - 4), 140); }
        if (c.canSee && c.onGround && !e.navAir && e.fireCd <= 0 && c.dist > 40 && c.dist < T.range * 0.95 && this.state === 'play') { e.ai = 'windup'; e.aiUntil = now + T.windMs; Sfx.chain(); return 'hold'; }
        return 'path';
      }
    }
  },

  // ------------------------------------------------------------------ linker ----
  // Fence drones that fly in pairs either side of you and throw a beam between them at chest height: 0.8 s
  // flickering charge, 2.3 s live (14 dmg, it fries their friends too), 1.7 s off. Jump it, dash through it,
  // get out from between them, or kill one. A linker with no partner just shoots.
  updateLinker(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.LINKER, b = e.body, pb = this.player.body;
    if (alive && !e.aggro && (e.sees || dist < 170) && dist < e.def.sight) this.alertEnemy(e, now);
    if (e.aggro && e.sees) e.aggroT = Math.max(e.aggroT, 5);
    e.linkT -= dt;
    if (e.partner && !e.partner.alive) { e.partner = null; e.phase = 'off'; }
    if (!e.partner && e.linkT <= 0) {
      e.linkT = 0.5;
      let best = null, bd = T.pair;
      for (const o of this.enemies.getChildren()) if (o !== e && o.alive && o.kind === 'linker' && !(o.partner && o.partner.alive)) { const d = Math.hypot(o.x - e.x, o.y - e.y); if (d < bd) { bd = d; best = o; } }
      if (best) { e.partner = best; best.partner = e; e.phase = best.phase = 'off'; e.beamT = best.beamT = 1.2; }
    }
    const P = e.partner, lead = P && e.lid < P.lid;
    if (lead) {
      e.beamT -= dt;
      if (e.beamT <= 0) {
        if (e.phase === 'off') { if (e.aggro && alive) { e.phase = 'charge'; e.beamT = T.chargeMs / 1000; Sfx.charge(0.4); } else e.beamT = 0.5; }
        else if (e.phase === 'charge') { e.phase = 'live'; e.beamT = T.liveMs / 1000; Sfx.linkOn(); }
        else { e.phase = 'off'; e.beamT = T.offMs / 1000 * rand(0.85, 1.2); }
      }
      if (!alive) e.phase = 'off';
      e.trackY += (pb.center.y - 1 - e.trackY) * Math.min(1, dt * 1.5);   // the fence trails your height
      P.phase = e.phase; P.trackY = e.trackY;
    } else if (!P) { e.phase = 'off'; e.trackY += (pb.center.y - 1 - e.trackY) * Math.min(1, dt * 1.5); }
    let tx, ty;
    if (e.aggro && alive) {
      const side = P ? (e.x <= P.x ? -1 : 1) : (e.x < pb.center.x ? -1 : 1);
      tx = pb.center.x + side * (P ? T.gap / 2 : 120) + Math.sin(e.t * 0.9 + e.lid) * 12;
      ty = P ? e.trackY + (e.phase === 'live' ? Math.sin(now / 520) * 12 : -4) : pb.top - 40 + Math.sin(e.t * 2) * 8;
      if (this.solidAt(tx, ty)) ty -= 18;
    } else { tx = e.homeX + Math.sin(e.t * 0.7) * 24; ty = e.homeY + Math.sin(e.t * 1.7) * 6; }
    if (this.campaign && this.A.id === 2 && this.wave === 3) {
      const catwalkY = 10 * TS;
      ty = Math.max(ty, catwalkY + TS + b.halfHeight + 3);
      // Commit to the opening in this bay until the entire Linker clears the underside.
      if (b.top >= catwalkY + TS) e.catwalkExit = null;
      else if (b.center.y < catwalkY && e.catwalkExit == null) {
        const exit = b.center.x < 42 * TS ? 35 : b.center.x < 57 * TS ? 50 : 61;
        e.catwalkExit = (exit + 0.5) * TS;
      }
      tx = e.catwalkExit ?? tx;
    }
    if (e.stunT <= 0) { const k = Math.min(1, dt * 2.4), sp = T.speed; b.velocity.x += (clamp((tx - b.center.x) * 2, -sp, sp) - b.velocity.x) * k; b.velocity.y += (clamp((ty - b.center.y) * 2, -sp, sp) - b.velocity.y) * k; }
    else { const f = Math.pow(0.05, dt); b.velocity.x *= f; b.velocity.y *= f; }
    e.dir = P ? (P.x >= e.x ? 1 : -1) : (dx >= 0 ? 1 : -1);             // prongs face the partner
    if (!P && e.aggro && alive && e.sees) { e.fireCd -= dt; if (e.fireCd <= 0) { e.fireCd = 1.7; this.fireBolt(e); } }
    e.fr = e.phase === 'charge' ? (Math.floor(now / 60) % 2 ? 'lc' : 'l0') : e.phase === 'live' ? 'lc' : Math.floor(e.t * 8) % 2 ? 'l1' : 'l0';
  },

  // ----------------------------------------------------------------- hive + gnats ----
  // A floating sac that keeps a swarm of up to 12 gnats going. Gnats flock (keep apart, stick together, chase you),
  // sting for 4 and die doing it. Kill the hive and the swarm goes frantic and dies off.
  updateHive(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.HIVE, b = e.body, pb = this.player.body;
    if (alive && !e.aggro && (e.sees || dist < 170) && dist < e.def.sight) this.alertEnemy(e, now);
    if (e.aggro && e.sees) e.aggroT = Math.max(e.aggroT, 5);
    let tx = e.homeX + Math.sin(e.t * 0.5) * 30, ty = e.homeY + Math.sin(e.t * 1.3) * 8;
    if (e.aggro && alive) { tx = pb.center.x + (e.x < pb.center.x ? -T.keep : T.keep); ty = pb.top - 70 + Math.sin(e.t * 1.1) * 12; if (this.solidAt(tx, ty)) ty += 20; }
    if (e.stunT <= 0) { const k = Math.min(1, dt * 1.2); b.velocity.x += (clamp(tx - b.center.x, -T.speed, T.speed) - b.velocity.x) * k; b.velocity.y += (clamp(ty - b.center.y, -T.speed, T.speed) - b.velocity.y) * k; }
    else { const f = Math.pow(0.1, dt); b.velocity.x *= f; b.velocity.y *= f; }
    if (e.aggro && alive && (e.spawnT -= dt) <= 0) {
      e.spawnT = T.rate;
      let n = 0; for (const o of this.gnatCache) if (o.hive === e) n++;
      if (n < T.max) this.hiveBirth(e);
    }
    if (Math.abs(b.velocity.x) > 4) e.dir = b.velocity.x > 0 ? 1 : -1;
    e.fr = Math.floor(e.t * 3) % 2 ? 'h1' : 'h0';
  },
  updateGnat(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.GNAT, b = e.body;
    if (e.panicDie > 0 && (e.panicDie -= dt) <= 0) { e.hp = 0; this.killEnemy(e, 0, 0, 'burn'); return; }
    let sx = 0, sy = 0, cx = 0, cy = 0, n = 0;
    for (const o of this.gnatCache) {
      if (o === e) continue;
      const ox = o.x - e.x, oy = o.y - e.y, d2 = ox * ox + oy * oy;
      if (d2 < 3600) { cx += o.x; cy += o.y; n++; if (d2 < T.sep * T.sep) { const d = Math.sqrt(d2) || 1; sx -= ox / d; sy -= oy / d; } }
    }
    let ax = 0, ay = 0;
    if (alive && e.panicDie <= 0) { const d = dist || 1; ax += dx / d; ay += dy / d; }          // chase
    else { ax += Math.sin(e.t * 9 + e.ph); ay += Math.cos(e.t * 7 + e.ph); }                  // frantic
    if (n) { ax += (cx / n - e.x) / 60 * 0.6; ay += (cy / n - e.y) / 60 * 0.6; }               // cohesion
    ax += sx * 1.4 + Math.sin(e.t * 13 + e.ph) * 0.5; ay += sy * 1.4 + Math.cos(e.t * 11 + e.ph) * 0.5;   // separation + buzz
    const L = Math.hypot(ax, ay) || 1, sp = T.speed * (e.panicDie > 0 ? 1.4 : 1);
    if (e.stunT <= 0) { const k = Math.min(1, dt * 5); b.velocity.x += (ax / L * sp - b.velocity.x) * k; b.velocity.y += (ay / L * sp - b.velocity.y) * k; }
    e.dir = b.velocity.x >= 0 ? 1 : -1;
    e.fr = Math.floor(now / 40 + e.ph * 10) % 2 ? 'n1' : 'n0';
  },

  // -------------------------------------------------------------------- stitcher ----
  // Reanimator drone: claims a corpse, hangs over it and channels for 1.3 s (green tether, the body twitches),
  // then stands it back up as a revenant at half health. Gib the bodies first, or hit it for 15 mid-channel.
  updateStitcher(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.STITCH, b = e.body, pb = this.player.body;
    if (alive && !e.aggro && (e.sees || dist < 150) && dist < e.def.sight) this.alertEnemy(e, now);
    e.cd -= dt; e.retargetT -= dt;
    if (e.corpse && (e.corpse.gone || e.corpse.pin)) this.stitchFail(e, false);
    if (e.ai === 'channel') {
      const c = e.corpse, q = c.pts[2];
      e.chanT -= dt; b.velocity.x *= Math.pow(0.02, dt); b.velocity.y *= Math.pow(0.02, dt);
      if (Math.random() < 0.5) { const pt = pick(c.pts); pt.vx += rand(-60, 60); pt.vy -= rand(10, 70); c.asleep = false; }   // the body twitches
      if (Math.random() < 0.4) this.fx.emit(q.x + rand(-6, 6), q.y + rand(-3, 3), { n: 1, angle: -Math.PI / 2, spread: 0.6, speed: [10, 40], life: [0.3, 0.6], size: [2, 1], cols: [0xd0ffd0, 0x60ff70, 0x208030], add: true, g: -30 });
      if ((e.humT -= dt) <= 0) { e.humT = 0.3; Sfx.stitch(); }
      if (e.chanT <= 0) this.stitchRaise(e);
      e.fr = 'sc';
      return;
    }
    if (e.retargetT <= 0 && !e.corpse && e.cd <= 0) {
      e.retargetT = 0.5;
      let best = null, bd = T.range;
      for (const rd of this.ragdolls) {
        if (rd.gone || rd.pin || rd.fade > 0 || !RAG[rd.kind] || rd.claimed) continue;
        const q = rd.pts[2], d = Math.hypot(q.x - e.x, q.y - e.y); if (d < bd) { bd = d; best = rd; }
      }
      if (best) { e.corpse = best; best.claimed = e; }
    }
    let tx, ty;
    if (e.corpse) {
      const q = e.corpse.pts[2]; tx = q.x; ty = q.y - 34;
      if (Math.hypot(tx - b.center.x, ty - b.center.y) < 12) { e.ai = 'channel'; e.chanT = T.channel; e.chanDmg = 0; Sfx.charge(0.3); }
    } else if (e.aggro && alive) { tx = pb.center.x + (e.x < pb.center.x ? -150 : 150); ty = pb.top - 70 + Math.sin(e.t * 1.7) * 10; }
    else { tx = e.homeX + Math.sin(e.t * 0.6) * 30; ty = e.homeY; }
    if (this.solidAt(tx, ty)) ty += 18;
    if (e.stunT <= 0) { const k = Math.min(1, dt * 2.5); b.velocity.x += (clamp((tx - b.center.x) * 2.2, -130, 130) - b.velocity.x) * k; b.velocity.y += (clamp((ty - b.center.y) * 2.2, -110, 110) - b.velocity.y) * k; }
    else { const f = Math.pow(0.05, dt); b.velocity.x *= f; b.velocity.y *= f; }
    if (Math.abs(b.velocity.x) > 6) e.dir = b.velocity.x > 0 ? 1 : -1;
    e.fr = Math.floor(e.t * 6) % 2 ? 's1' : 's0';
  },

  // ------------------------------------------------------------------- slag wyrm ----
  // Mini-boss: a 9-segment worm that swims under your floor and bursts out in arcs: a BREACH straight up under
  // you, or a long low SKIM across the room through where you stand (a ring marks where it comes down). The
  // head takes full damage, the body 60%; it can only be hit while it's out. Below half health it spits slag.
  updateWyrm(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.WYRM, pb = this.player.body;
    e.aggro = true; e.aggroT = 99;
    if (e.ai === 'under') {
      e.cd -= dt;
      if (alive) { const fy = this.floorBelow(pb.center.x, pb.bottom - 4); if (fy !== null) e.floorY = fy; }
      const du = (alive ? pb.center.x : e.ux) - e.ux, sp = 170 * (Math.abs(du) > 180 ? 1.8 : 1);
      e.ux = clamp(e.ux + clamp(du, -sp * dt, sp * dt), 56, LW - 56);
      if (this.standAt(e.ux, e.floorY + 2) && (e.trailT -= dt) <= 0) { e.trailT = 0.03; this.fx.emit(e.ux + rand(-7, 7), e.floorY - 1, { n: 2, angle: -Math.PI / 2, spread: 1.3, speed: [40, 130], life: [0.25, 0.5], size: [2, 1], cols: [0x7a6a58, 0x4a3e32, 0xff8a20], g: 420, mode: 1 }); }
      if ((e.rumT -= dt) <= 0) { e.rumT = 0.3; Sfx.rumble(0.9); this.shake(80, 0.0025); }
      if (alive && this.state === 'play' && e.cd <= 0 && Math.abs(du) < 24) this.wyrmTell(e, now);
      return;
    }
    if (e.ai === 'tell') {
      const k = 1 - (e.aiUntil - now) / T.tellMs;
      if (Math.random() < 0.8) this.fx.emit(e.ex + rand(-10, 10), e.floorY - 1, { n: 1, angle: -Math.PI / 2, spread: 0.7, speed: [60, 200], life: [0.25, 0.5], size: [2, 1], cols: [0xffe080, 0xffa030, 0x7a6a58], g: 520, mode: 1 });
      if ((e.glowT = (e.glowT || 0) - dt) <= 0) { e.glowT = 0.09; this.spawnLight(e.ex, e.floorY - 2, 'glow', 0xff4a10, 1.6, 3, 0.7, 0.16); }
      this.shake(80, 0.002 + 0.006 * k);
      if (now >= e.aiUntil) this.wyrmLeap(e);
      return;
    }
    if (e.ai === 'leap') e.vy += e.grav * dt;                            // airborne or diving: move the head, record its trail
    e.hx += e.vx * dt; e.hy += e.vy * dt;
    if (e.hx < 40 || e.hx > LW - 40) { e.vx = -e.vx * 0.5; e.hx = clamp(e.hx, 40, LW - 40); }
    if (e.hy < 2 * TS + 10 && e.vy < 0) e.vy = -e.vy * 0.3;
    const air = !this.standAt(e.hx, e.hy);
    e.hist.push({ x: e.hx, y: e.hy, air }); if (e.hist.length > 600) e.hist.shift();
    e.wyrmAng = Math.atan2(e.vy, e.vx);
    if (e.ai === 'leap') {
      e.leapT += dt; if (air) e.wasAir = true;
      if (air && e.hp < e.def.hp * T.spit && (e.spitT -= dt) <= 0) { e.spitT = 0.3; this.wyrmSpit(e); }
      if ((e.wasAir && !air && e.vy > 0) || e.leapT > 3.5) {             // back into the ground; the body follows it down
        const sp = Math.max(240, Math.hypot(e.vx, e.vy)), a = Math.atan2(Math.max(e.vy, 80), e.vx);
        e.vx = Math.cos(a) * sp; e.vy = Math.sin(a) * sp; e.ai = 'sink'; e.sinkT = (T.segs * T.gap + 30) / sp;
        this.fx.emit(e.hx, e.hy, { n: 20, angle: -Math.PI / 2, spread: 1.6, speed: [60, 220], life: [0.3, 0.6], size: [3, 1], cols: [0x7a6a58, 0x4a3e32, 0xffa030, 0xffe080], g: 520, mode: 1 });
        this.fxDust(e.hx, e.hy, 8); this.shake(120, 0.006); Sfx.dig();
      }
    } else if ((e.sinkT -= dt) <= 0) { e.ai = 'under'; e.ux = clamp(e.hx, 56, LW - 56); e.cd = rand(T.cd[0], T.cd[1]); e.hist = []; }
    this.wyrmPlace(e);
  },

  // ---------------------------------------------------------------- buzzsaw ----
  // A saw-blade drone that never stops: ricochets round the room at a constant clip, steering at you off every
  // wall and carving whoever it passes, friend or foe. Kick it and it's yours for 2 s (and hits far harder).
  updateBuzzsaw(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.BUZZSAW, b = e.body;
    if (alive && !e.aggro && (e.sees || dist < 150)) { e.aggro = true; e.aggroT = 5; this.popAlert(e); }
    if (e.aggro && e.sees) e.aggroT = Math.max(e.aggroT, 4);
    e.owned = Math.max(0, e.owned - dt); e.dazeT = Math.max(0, (e.dazeT || 0) - dt);
    const vx = b.velocity.x, vy = b.velocity.y, sp = Math.hypot(vx, vy);
    const want = e.owned > 0 ? T.speed * 1.9 : e.dazeT > 0 ? T.speed * 0.35 : e.aggro && alive ? T.speed : T.speed * 0.55;
    let nx = sp > 1 ? vx / sp : Math.cos(e.t), ny = sp > 1 ? vy / sp : Math.sin(e.t);
    const L = b.blocked.left, Rt = b.blocked.right, U = b.blocked.up, D = b.blocked.down;
    if ((L || Rt || U || D) && now > e.bounceT) {
      e.bounceT = now + 60;
      if (e.aggro && alive && e.owned <= 0 && e.dazeT <= 0) { const pl = dist || 1; nx += dx / pl * T.steer * 2; ny += dy / pl * T.steer * 2; }   // homes in a little off each wall
      const j = rand(-0.14, 0.14), jx = nx * Math.cos(j) - ny * Math.sin(j); ny = nx * Math.sin(j) + ny * Math.cos(j); nx = jx;   // a little chaos per bounce
      if (L) nx = Math.abs(nx) + 0.1; if (Rt) nx = -Math.abs(nx) - 0.1; if (U) ny = Math.abs(ny) + 0.1; if (D) ny = -Math.abs(ny) - 0.1;
      if (Math.abs(ny) < 0.2 * Math.abs(nx)) ny = (ny >= 0 ? 1 : -1) * 0.2 * Math.abs(nx);   // never settles into a flat shuttle...
      if (Math.abs(nx) < 0.2 * Math.abs(ny)) nx = (nx >= 0 ? 1 : -1) * 0.2 * Math.abs(ny);   // ...or a vertical one
      this.buzzBounce(e, L, Rt, U, D);
    }
    else if (e.aggro && alive && dist > 1 && e.dazeT <= 0) { nx += dx / dist * dt * 0.9; ny += dy / dist * dt * 0.9; }   // hostile: its flight curves gently toward you
    if (e.owned > 0) {                                                   // yours: it seeks the nearest foe
      if ((e.seekT = (e.seekT || 0) - dt) <= 0) {
        e.seekT = 0.15; e.seek = null; let bd = 230;
        for (const o of this.enemies.getChildren()) { if (!o.alive || o === e || o.under || o.kind === 'buzzsaw' || e.hitMap.get(o) > now) continue; const d = Math.hypot(o.body.center.x - b.center.x, o.body.center.y - b.center.y); if (d < bd && this.los(b.center.x, b.center.y, o.body.center.x, o.body.center.y)) { bd = d; e.seek = o; } }
      }
      if (e.seek && e.seek.alive) { const tx = e.seek.body.center.x - b.center.x, ty = e.seek.body.center.y - b.center.y, tl = Math.hypot(tx, ty) || 1; nx += tx / tl * dt * 7; ny += ty / tl * dt * 7; }
    }
    const l = Math.hypot(nx, ny) || 1, v = sp + (want - sp) * Math.min(1, dt * 3);
    b.setVelocity(nx / l * v, ny / l * v);
    e.dir = nx >= 0 ? 1 : -1;
    for (const o of this.enemies.getChildren()) {                        // carve through anything in the way
      if (!o.alive || o === e || o.under || (o.kind === 'buzzsaw' && e.owned <= 0)) continue;
      const ob = o.body; if (ob.right < b.left || ob.left > b.right || ob.bottom < b.top || ob.top > b.bottom) continue;
      if ((e.hitMap.get(o) || 0) > now) continue;
      e.hitMap.set(o, now + 400);
      if (o.def.mech) this.fxSparks(b.center.x, b.center.y, 8, Math.atan2(ny, nx), 1.4); else this.fxBlood(b.center.x, b.center.y, 10, Math.atan2(ny, nx), 1.4, [80, 260]);
      this.damageEnemy(o, e.owned > 0 ? T.owned : T.friendly, nx / l, ny / l, 'saw'); Sfx.squish();
      if (e.owned > 0) { this.addStyle(30); if (!e.ownHit) { e.ownHit = true; BUS.emit('callout', 'SAW RETURNED'); } }
    }
    if (e.owned > 0 && Math.random() < 0.7) this.fx.emit(b.center.x, b.center.y, { n: 1, speed: [0, 20], life: [0.15, 0.3], size: [2, 1], cols: [0xffffff, 0x9af0ff, 0x46b8f0], add: true });
    if ((e.whirT -= dt) <= 0 && dist < 220) { e.whirT = 0.55; Sfx.whirr(0.35 * (1 - dist / 220)); }
  },

  // ---------------------------------------------------------------- magnetron ----
  // Hovers off your shoulder inside an 80 px field that turns your shots away (beams, blasts and boots don't care).
  // Every 3.5 s: a 0.5 s tell, then a pulse that yanks you toward it and zaps you if you're close.
  updateMagnet(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.MAGNET, b = e.body, pb = this.player.body;
    if (alive && !e.aggro && (e.sees || dist < 150) && dist < e.def.sight) this.alertEnemy(e, now);
    if (e.aggro && e.sees) e.aggroT = Math.max(e.aggroT, 4);
    if ((e.sideT -= dt) <= 0) { e.sideT = rand(3, 5); e.side *= -1; }
    let tx = e.homeX + Math.sin(e.t * 0.6) * 30, ty = e.homeY + Math.sin(e.t * 1.4) * 6;
    if (e.aggro && alive) { tx = clamp(pb.center.x + e.side * 80, 30, LW - 30); ty = pb.center.y - 46 + Math.sin(e.t * 1.7) * 8; }
    if (e.ai === 'tell') { tx = b.center.x; ty = b.center.y; }               // hangs still while it charges
    if (e.stunT <= 0) {
      const k = Math.min(1, dt * 2.5);
      b.velocity.x += (clamp((tx - b.center.x) * 2, -95, 95) - b.velocity.x) * k;
      b.velocity.y += (clamp((ty - b.center.y) * 2, -95, 95) - b.velocity.y) * k;
    } else { b.velocity.x *= Math.pow(0.1, dt); b.velocity.y *= Math.pow(0.1, dt); }
    if (e.aggro && alive) {
      if (e.ai === 'tell') { if (now >= e.aiUntil) { this.magnetPulse(e, dist); e.ai = 'hover'; e.pulseT = T.pulseCd * rand(0.85, 1.15); } }
      else if ((e.pulseT -= dt) <= 0 && dist < T.field * 2.8 && e.sees) { e.ai = 'tell'; e.aiUntil = now + T.tellMs; Sfx.magTell(); }
    } else if (e.ai === 'tell') e.ai = 'hover';
    e.fr = e.ai === 'tell' && Math.floor(now / 60) % 2 ? 'mh' : 'm0';
    e.dir = dx >= 0 ? 1 : -1;
  },

  // ---------------------------------------------------------------- cinder wheel ----
  // A burning iron wheel (60 HP, fireproof) that rolls at you along the floor (150 px/s), bouncing off walls and hopping
  // at you when you're above it, leaving a trail of fire. Kick it and it's yours for 1.5 s: it rolls back the other
  // way at 260 px/s, slamming into foes (40 each).
  updateCinder(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.CINDER, b = e.body, onG = b.blocked.down || b.touching.down;
    if (alive && !e.aggro && (e.sees || dist < 260) && dist < e.def.sight) this.alertEnemy(e, now);
    e.fr = Math.floor(now / 80) % 2 ? 'w1' : 'w0';
    if (e.owned > 0) {                                                    // kicked: it's yours, rolling back at them
      e.owned -= dt; b.velocity.x = e.dir * T.ownSpeed;
      if (b.blocked.left || b.blocked.right) { e.dir = -e.dir; this.fxSparks(b.center.x, b.center.y, 4); }
      for (const o of this.enemies.getChildren()) { if (!o.alive || o === e || o.under || (e.hitMap.get(o) || 0) > now) continue; const ob = o.body; if (ob.right > b.left && ob.left < b.right && ob.bottom > b.top && ob.top < b.bottom) { e.hitMap.set(o, now + 500); this.damageEnemy(o, T.ownDmg, e.dir, -0.5, 'saw'); this.ignite(o, 2); Sfx.clang(0.5); this.hitStop(30); } }
    } else if (e.stunT <= 0 && e.aggro && alive) {
      e.hopT = (e.hopT || 0) - dt; e.bounceT = (e.bounceT || 0) - dt;
      if (Math.abs(dx) > 30 && e.bounceT <= 0) e.dir = dx >= 0 ? 1 : -1;
      if ((b.blocked.left && e.dir < 0) || (b.blocked.right && e.dir > 0)) {
        if (onG && e.hopT <= 0) { b.velocity.y = -T.hop; e.hopT = 1; }  // a step in the way: hop it
        else if (e.hopT < 0.6) { e.dir = -e.dir; e.bounceT = 0.8; this.fxSparks(b.center.x + e.dir * -6, b.center.y, 3); }   // a real wall: bounce off it
      }
      b.velocity.x = e.dir * T.speed;
      if (onG && dy < -30 && Math.abs(dx) < 90 && Math.random() < dt * 3) b.velocity.y = -T.hop;
    } else if (!e.aggro) b.velocity.x *= 0.9;
    e.spinA += b.velocity.x * dt * 0.12;
    if (onG && Math.abs(e.x - e.lastTrailX) >= 18) {                      // the fire trail
      e.lastTrailX = e.x; const fy = Math.floor((b.bottom + 2) / TS) * TS;
      if (this.standAt(e.x, fy + 2)) { const [px, pw] = this.spanOn(e.x, fy, 14); this.puddles.push({ x: px, y: fy, w: pw, t: T.trail, tick: 0.2, fire: true }); }
    }
  },

  // ---------------------------------------------------------------- gatling ----
  // A heavy (150 HP) with a six-barrel gun that keeps 140-260 px off. It spins up (0.9 s, a red sight), then hoses a
  // stream at you for 2.2 s (5 a round, ~14 a second) that tracks you at only 1.2 rad/s: outrun it. Then it overheats
  // for 1.5 s, venting, and takes x1.5; otherwise its gun shields the front (x0.6).
  updateGatling(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.GATLING, b = e.body, onG = b.blocked.down || b.touching.down, want = Math.atan2(dy - 4, dx);
    if (alive && !e.aggro && (e.sees || dist < 220) && dist < e.def.sight) this.alertEnemy(e, now);
    if (e.ai === 'alert' || e.ai === 'patrol') e.ai = 'walk';
    const track = r => { let d = Math.atan2(Math.sin(want - e.aimA), Math.cos(want - e.aimA)); e.aimA += clamp(d, -r * dt, r * dt); };
    if (e.ai === 'spin') { b.velocity.x = 0; track(T.turn * 2); e.fr = Math.floor(now / 50) % 2 ? 'fire2' : 'w0'; if (now >= e.aiUntil) { e.ai = 'fire'; e.aiUntil = now + T.burst * 1000; } return; }
    if (e.ai === 'fire') {
      b.velocity.x = 0; track(T.turn); e.fr = Math.floor(now / 40) % 2 ? 'fire2' : 'fire';
      if ((e.shotT -= dt) <= 0 && alive) { e.shotT = T.rate; const a = e.aimA + rand(-0.04, 0.04); this.spawnEBullet(e.x + Math.cos(a) * 16, e.y - 4 + Math.sin(a) * 16, a, 300, T.dmg); Sfx.gatlingFire(); this.spawnLight(e.x + Math.cos(a) * 16, e.y - 4 + Math.sin(a) * 16, 'glow', 0xffc060, 0.4, 0.8, 0.7, 0.05); }
      if (now >= e.aiUntil) { e.ai = 'hot'; e.aiUntil = now + T.cool * 1000; }
      return;
    }
    if (e.ai === 'hot') { b.velocity.x = 0; e.fr = 'w0'; if (now >= e.aiUntil) { e.ai = 'walk'; e.cd = rand(1, 1.8); } return; }
    if (e.stunT > 0) return;
    e.cd -= dt;
    if (e.aggro && alive) {
      e.dir = dx >= 0 ? 1 : -1; const ax = Math.abs(dx);
      if (!this.standoff(e, dt, now, onG, T.speed)) {                   // out of sight: round by the nav graph to a spot that sees you
        let mv = ax > T.keep[1] ? e.dir : ax < T.keep[0] ? -e.dir : 0;
        if (mv && !this.standAt(b.center.x + mv * 10, b.bottom + 4)) mv = 0;
        b.velocity.x = mv * T.speed;
        if (mv && onG && (b.blocked.left || b.blocked.right)) b.velocity.y = -240;
      }
      if (e.cd <= 0 && e.sees && !e.navAir) { e.ai = 'spin'; e.aiUntil = now + T.spin * 1000; e.aimA = want; Sfx.gatlingSpin(); return; }
    } else b.velocity.x = 0;
    if (Math.abs(b.velocity.x) > 3) { e.stepK += dt * 4; e.fr = Math.floor(e.stepK) % 2 ? 'w1' : 'w0'; } else e.fr = 'w0';
  },

  // ---------------------------------------------------------------- banner ----
  // A robed standard-bearer (80 HP) that hangs back 200-300 px and every ~6 s plants its banner: every other foe within
  // 150 px regenerates 5 HP a second while it stands (a green ring), and so does it at half that. It moves on when
  // you close in. Take it down first.
  updateBanner(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.BANNER, b = e.body, onG = b.blocked.down || b.touching.down;
    if (alive && !e.aggro && (e.sees || dist < 240) && dist < e.def.sight) this.alertEnemy(e, now);
    if (e.ai === 'alert' || e.ai === 'patrol') e.ai = 'walk';
    if (e.ai === 'plant') {
      b.velocity.x = 0; e.fr = 'plant';
      if ((e.healT -= dt) <= 0) {
        e.healT = 0.5;
        for (const o of this.enemies.getChildren()) {
          if (!o.alive || o.under || o.def.tiny || o.def.boss || o.def.miniBoss || o.hp >= o.def.hp) continue;
          const self = o === e; if (!self && Math.hypot(o.body.center.x - e.x, o.body.center.y - e.y) > T.radius) continue;
          o.hp = Math.min(o.def.hp, o.hp + T.heal * 0.5 * (self ? 0.5 : 1));
          if (Math.random() < 0.5) this.fx.emit(o.body.center.x + rand(-4, 4), o.body.top, { n: 1, angle: -Math.PI / 2, spread: 0.3, speed: [10, 30], life: [0.3, 0.6], size: [2, 1], cols: [0x5cff7a, 0xd0ffd8], add: true });
        }
      }
      if (now >= e.aiUntil || (alive && dist < 120)) { e.ai = 'walk'; e.plantT = rand(1.5, 2.5); }
      return;
    }
    if (e.stunT > 0) return;
    if (e.aggro && alive) {
      e.dir = dx >= 0 ? 1 : -1; const ax = Math.abs(dx);
      let mv = ax < T.keep[0] ? -e.dir : ax > T.keep[1] ? e.dir : 0;
      if (mv && !this.standAt(b.center.x + mv * 10, b.bottom + 4)) mv = 0;
      b.velocity.x = mv * T.speed;
      if (mv && onG && (b.blocked.left || b.blocked.right)) b.velocity.y = -240;
      if ((e.plantT -= dt) <= 0 && onG && dist > 120) { e.ai = 'plant'; e.aiUntil = now + T.plant * 1000; e.healT = 0.3; Sfx.bannerPlant(); this.fxDust(e.x + 6, b.bottom, 4); return; }
    } else b.velocity.x = 0;
    if (Math.abs(b.velocity.x) > 3) { e.stepK += dt * 5; e.fr = Math.floor(e.stepK) % 2 ? 'w1' : 'w0'; } else e.fr = 'w0';
  },

  // ---------------------------------------------------------------- bulldozer ----
  // A tracked dozer (180 HP) behind a plow blade: it grinds at you (50 px/s), shoving drums, gibs, corpses and lighter
  // foes ahead of it and you too; pin you against a wall and it crushes (20 every 0.5 s). The plow takes 30% from the
  // front; its engine takes x1.5 from behind. It backs off and turns if it jams.
  updateBulldozer(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.DOZER, b = e.body, onG = b.blocked.down || b.touching.down, p = this.player, pb = p.body;
    if (alive && !e.aggro && (e.sees || dist < 240) && dist < e.def.sight) this.alertEnemy(e, now);
    e.stepK += dt * 4; e.fr = Math.floor(e.stepK) % 2 ? 'w1' : 'w0';
    if (e.stunT > 0) return;
    if (!e.aggro || !alive) { b.velocity.x = 0; return; }
    if (e.ai === 'back') { b.velocity.x = -e.dir * T.speed * 0.6; if (now >= e.aiUntil) { e.ai = 'drive'; e.dir = dx >= 0 ? 1 : -1; } return; }
    if (Math.abs(dx) > 40) e.dir = dx >= 0 ? 1 : -1;
    b.velocity.x = e.dir * T.speed;
    if ((e.dir < 0 ? b.blocked.left : b.blocked.right) && onG) {         // a crate in the way gets plowed; a step gets climbed; a wall turns it
      const tx = Math.floor((b.center.x + e.dir * (b.halfWidth + 4)) / TS), ty = Math.floor((b.bottom - 6) / TS), c = this.tileAt(tx, ty);
      if (c === 'x' || c === 'g') { if ((e.plowT = (e.plowT || 0) - dt) <= 0) { e.plowT = 0.25; this.damageTile(tx, ty, 40); this.fxSparks(b.center.x + e.dir * b.halfWidth, b.bottom - 6, 4); Sfx.clang(0.4); } }
      else if (!this.solidAt(b.center.x + e.dir * (b.halfWidth + 4), b.bottom - TS - 6)) b.velocity.y = -220;
      else if ((e.stuckT += dt) > 0.8) { e.stuckT = 0; e.ai = 'back'; e.aiUntil = now + 900; }
    } else e.stuckT = 0;
    if ((e.dozeT = (e.dozeT || 0) - dt) <= 0) { e.dozeT = 0.6; Sfx.dozer(); }
    const x0 = e.dir > 0 ? b.right : b.left - 14, x1 = x0 + 14, y0 = b.top - 2, y1 = b.bottom;   // the plow's push zone
    for (const k of this.barrelList) if (k.active && k.x > x0 - 2 && k.x < x1 + 2 && k.y > y0 && k.y < y1 + 4) k.body.velocity.x = e.dir * T.speed * 1.3;
    this.propsIn((px, py, r) => px + r > x0 && px - r < x1 && py + r > y0 && py - r < y1 + 4, 10, 'kick', e.dir, 0, true);   // the plow grinds through scenery
    for (const gb of this.gibList) if (gb.active && gb.x > x0 && gb.x < x1 && gb.y > y0 && gb.y < y1 + 4) { gb.body.velocity.x = e.dir * T.speed * 1.5; if (gb.stuckT > 0) { gb.stuckT = 0; gb.body.setAllowGravity(true); } }
    for (const rd of this.ragdolls) { const c = rd.pts[2]; if (c.x > x0 - 4 && c.x < x1 + 4 && c.y > y0 - 6 && c.y < y1 + 6) { for (const q of rd.pts) q.vx = e.dir * T.speed * 1.4; rd.asleep = false; } }
    for (const o of this.enemies.getChildren()) { if (!o.alive || o === e || o.under || FLIERS.has(o.kind) || o.def.kb < 0.3) continue; const ob = o.body; if (ob.right > x0 && ob.left < x1 && ob.bottom > y0 && ob.top < y1) ob.velocity.x = e.dir * T.speed * 1.4; }
    if (this.state !== 'dead' && pb.right > x0 && pb.left < x1 && pb.bottom > y0 && pb.top < y1) {   // it shoves you; against a wall it crushes
      p.x += e.dir * T.speed * 1.05 * dt;
      if ((e.dir < 0 ? pb.blocked.left : pb.blocked.right) && (e.crushT -= dt) <= 0) { e.crushT = 0.5; this.hurtPlayer(T.crush, e.x, { knock: false, iframes: false, srcY: e.y }); this.shake(120, 0.008); Sfx.clang(0.6); }
    }
  },

  // ---------------------------------------------------------------- copycat ----
  // A mirror-plated drone (70 HP) that hangs 140 px off and copies the gun in your hand (it carries a copy under it):
  // a lobbing gun gets you a grenade, a spread gun a five-shot fan, a beam gun a sighted bolt (0.7 s tell, 12), and
  // anything else a four-round burst. Every ~2.4 s.
  updateCopycat(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.COPYCAT, b = e.body, pb = this.player.body, wid = WEAPONS[this.weapon].id;
    if (alive && !e.aggro && (e.sees || dist < 280) && dist < e.def.sight) this.alertEnemy(e, now);
    e.fr = Math.floor(now / 80) % 2 ? 'c1' : 'c0';
    if (e.gunId !== wid) { e.gunId = wid; e.icon.setTexture('icon_' + WEAPONS[this.weapon].gun); e.mode = CAT_LOB.has(wid) ? 'lob' : CAT_SPREAD.has(wid) ? 'spread' : CAT_BEAM.has(wid) ? 'beam' : 'rapid'; }
    if (e.burst > 0 && (e.burstT -= dt) <= 0 && alive) { e.burst--; e.burstT = 0.1; const a = Math.atan2(dy, dx) + rand(-0.05, 0.05); this.spawnEBullet(e.x + Math.cos(a) * 8, e.y + Math.sin(a) * 8, a, 270, 6); Sfx.eshot(); }
    if (e.ai === 'aim') {                                                 // the beam copy: a sight line, then a bolt
      b.setVelocity(b.velocity.x * 0.9, b.velocity.y * 0.9);
      if (now >= e.aiUntil) {
        e.ai = 'drift'; const ok = alive && this.state !== 'dead' && this.los(e.x, e.y, pb.center.x, pb.center.y);
        this.pylonZaps.push({ x0: e.x, y0: e.y, x1: ok ? pb.center.x : e.x + dx * 0.6, y1: ok ? pb.center.y : e.y + dy * 0.6, t: now }); Sfx.pylonZap();
        if (ok) this.hurtPlayer(12, e.x, { srcY: e.y });
      }
      return;
    }
    if (e.stunT > 0) { b.setVelocity(b.velocity.x * 0.9, b.velocity.y * 0.9); return; }
    let tx = e.homeX, ty = e.homeY;
    if (e.aggro && alive) { const side = Math.sign(e.x - pb.center.x) || 1; tx = pb.center.x + side * 140; ty = pb.center.y - 50 + Math.sin(e.t * 1.4) * 14; }
    tx = clamp(tx, 30, LW - 30); ty = clamp(ty, 40, LH - 50);
    b.velocity.x += (clamp((tx - e.x) * 2, -T.speed, T.speed) - b.velocity.x) * Math.min(1, dt * 3);
    b.velocity.y += (clamp((ty - e.y) * 2, -T.speed, T.speed) - b.velocity.y) * Math.min(1, dt * 3);
    e.dir = dx >= 0 ? 1 : -1;
    if (e.aggro && alive && e.sees && (e.cd -= dt) <= 0) {
      e.cd = T.cd * rand(0.9, 1.1); const a = Math.atan2(dy, dx);
      if (e.mode === 'lob') { const G = this.physics.world.gravity.y, FT = clamp(dist / 240, 0.5, 1.1), q = this.spawnEProj('nade', e.x, e.y + 4, dx / FT, (dy - 0.5 * G * FT * FT) / FT); if (q) q.life = 1.4; Sfx.whoosh(); }
      else if (e.mode === 'spread') { for (let k = -2; k <= 2; k++) this.spawnEBullet(e.x + Math.cos(a) * 8, e.y + Math.sin(a) * 8, a + k * 0.14, 230, 6); Sfx.shotgun(); }
      else if (e.mode === 'beam') { e.ai = 'aim'; e.aiUntil = now + 700; Sfx.charge(0.3); }
      else { e.burst = 4; e.burstT = 0; }
    }
  },

  // ---------------------------------------------------------------- jellyfish ----
  // A shock jelly (50 HP) that drifts toward a spot just above you (30 px/s), bobbing, trailing 36 px of tendrils that
  // zap anything under it (6 every 0.3 s). Pop it and it discharges a shock nova (18 to anything within 50 px, you too).
  updateJelly(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.JELLY, b = e.body, pb = this.player.body;
    if (alive && !e.aggro && (e.sees || dist < 260) && dist < e.def.sight) this.alertEnemy(e, now);
    e.fr = Math.floor(now / 300) % 2 ? 'j1' : 'j0';
    let tx = e.homeX, ty = e.homeY;
    if (e.aggro && alive) { tx = pb.center.x; ty = pb.top - 26; }
    tx = clamp(tx, 30, LW - 30); ty = clamp(ty, 40, LH - 60);
    const pulse = 0.6 + 0.4 * Math.max(0, Math.sin(now / 300 * Math.PI));   // it swims in pulses
    b.velocity.x += (clamp((tx - e.x), -T.speed, T.speed) * pulse - b.velocity.x) * Math.min(1, dt * 2);
    b.velocity.y += (clamp((ty - e.y), -T.speed, T.speed) * pulse - b.velocity.y) * Math.min(1, dt * 2);
    e.zapping = false;
    if (alive && this.state !== 'dead' && Math.abs(pb.center.x - e.x) < 10 && pb.top < b.bottom + T.drop && pb.bottom > b.bottom) {
      e.zapping = true;
      if ((e.zapT -= dt) <= 0) { e.zapT = T.tick; this.hurtPlayer(T.dmg, e.x, { knock: false, iframes: false, srcY: b.bottom }); Sfx.jellyZap(); this.fxSparks(pb.center.x, pb.top + 4, 3, -Math.PI / 2, 1.4, [30, 100]); }
    }
  },

  // ---------------------------------------------------------------- porcupine ----
  // A squat beast (90 HP) under steel quills that plods at you. Every 40 damage it takes it fires ten quills every
  // which way (6 each); and every ~5 s you're within 140 px it bristles (0.5 s) and fires a volley anyway.
  updatePorcupine(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.PORCUPINE, b = e.body, onG = b.blocked.down || b.touching.down;
    if (alive && !e.aggro && (e.sees || dist < 200) && dist < e.def.sight) this.alertEnemy(e, now);
    if (e.ai === 'alert' || e.ai === 'patrol') e.ai = 'walk';
    if (e.ai === 'bristle') { b.velocity.x = 0; e.fr = 'bristle'; if (now >= e.aiUntil) { e.ai = 'walk'; if (e.alive) this.quillBurst(e); } return; }
    if (e.stunT > 0) return;
    e.cd -= dt;
    if (e.aggro && alive) {
      e.dir = dx >= 0 ? 1 : -1; b.velocity.x = Math.abs(dx) > 20 ? e.dir * T.speed : 0;
      if ((e.dir < 0 ? b.blocked.left : b.blocked.right) && onG) b.velocity.y = -240;
      if (e.cd <= 0 && dist < 140) { e.cd = T.cd * rand(0.9, 1.1); e.ai = 'bristle'; e.aiUntil = now + T.tellMs; return; }
    } else b.velocity.x = 0;
    if (Math.abs(b.velocity.x) > 3) { e.stepK += dt * 5; e.fr = Math.floor(e.stepK) % 2 ? 'w1' : 'w0'; } else e.fr = 'w0';
  },

  // ---------------------------------------------------------------- sponge ----
  // A pocked yellow blob (100 HP) that walks at you and drinks bullets: nails, pellets, rivets, shards, needles and
  // the like do nothing but swell it, and at 12 it spits them all back at you in a spray. Blasts, fire, acid, beams,
  // blades and boots hurt it as normal.
  updateSponge(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.SPONGE, b = e.body, onG = b.blocked.down || b.touching.down;
    if (alive && !e.aggro && (e.sees || dist < 200) && dist < e.def.sight) this.alertEnemy(e, now);
    if (e.ai === 'alert' || e.ai === 'patrol') e.ai = 'walk';
    if (e.stunT > 0) return;
    if (e.aggro && alive) { e.dir = dx >= 0 ? 1 : -1; b.velocity.x = Math.abs(dx) > 30 ? e.dir * T.speed : 0; if ((e.dir < 0 ? b.blocked.left : b.blocked.right) && onG) b.velocity.y = -230; }
    else b.velocity.x = 0;
    e.fr = Math.abs(b.velocity.x) > 3 && Math.floor(now / 200) % 2 ? 'w1' : 'w0';
  },

  // ---------------------------------------------------------------- leaper ----
  // A frog-legged hopper bot (70 HP). Every ~3.5 s it marks where you're standing (a red ring), crouches (0.7 s), then
  // leaps onto the mark (0.8 s in the air) and lands with a slam: 18 if you're still there, and a shockwave each way
  // along the floor (jump it). 0.8 s to recover.
  updateLeaper(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.LEAPER, b = e.body, onG = b.blocked.down || b.touching.down, pb = this.player.body;
    if (alive && !e.aggro && (e.sees || dist < 240) && dist < e.def.sight) this.alertEnemy(e, now);
    if (e.ai === 'alert' || e.ai === 'patrol') e.ai = 'walk';
    if (e.ai === 'crouch') {
      b.velocity.x = 0; e.fr = 'crouch';
      if (now >= e.aiUntil) {
        const G = this.physics.world.gravity.y, t = T.air;
        b.setVelocity((e.tx - b.center.x) / t, (e.ty - b.bottom - 0.5 * G * t * t) / t); e.ai = 'air'; e.leapT = now; Sfx.leap();
      }
      return;
    }
    if (e.ai === 'air') {
      e.fr = 'air';
      if (onG && now - e.leapT > 200) {                                    // the slam
        e.ai = 'recover'; e.aiUntil = now + T.recoverMs;
        this.shockwaves.push({ x: e.x - 14, y: b.bottom, dir: -1, t: 0.7, hit: false }, { x: e.x + 14, y: b.bottom, dir: 1, t: 0.7, hit: false });
        this.fxDust(e.x, b.bottom, 10); this.shake(150, 0.008); Sfx.stomp();
        if (alive && this.state !== 'dead' && Math.abs(pb.center.x - e.x) < 26 && Math.abs(pb.bottom - b.bottom) < 24) this.hurtPlayer(T.dmg, e.x, { srcY: e.y });
      }
      return;
    }
    if (e.ai === 'recover') { b.velocity.x *= Math.pow(0.01, dt); e.fr = 'crouch'; if (now >= e.aiUntil) e.ai = 'walk'; return; }
    if (e.stunT > 0) return;
    e.cd -= dt;
    if (e.aggro && alive) {
      e.dir = dx >= 0 ? 1 : -1; b.velocity.x = Math.abs(dx) > 60 ? e.dir * T.speed : 0;
      if ((e.dir < 0 ? b.blocked.left : b.blocked.right) && onG) b.velocity.y = -250;
      if (e.cd <= 0 && onG && e.sees && dist < 320 && (pb.blocked.down || pb.touching.down)) { e.cd = T.cd * rand(0.9, 1.1); e.ai = 'crouch'; e.aiUntil = now + T.tellMs; e.tx = pb.center.x; e.ty = pb.bottom; return; }
    } else b.velocity.x = 0;
    e.fr = 'w0';
  },

  // ---------------------------------------------------------------- zealot ----
  // A robed fanatic (80 HP) that keeps 150-260 px off and casts a slow homing orb of light every ~3 s (10 a hit; shoot
  // it down). Whenever a foe dies within 180 px of it, the soul flies to it: +20 HP, a brighter halo, bigger and
  // quicker orbs, three times at most.
  updateZealot(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.ZEALOT, b = e.body, onG = b.blocked.down || b.touching.down;
    if (alive && !e.aggro && (e.sees || dist < 220) && dist < e.def.sight) this.alertEnemy(e, now);
    if (e.ai === 'alert' || e.ai === 'patrol') e.ai = 'walk';
    if (e.ai === 'cast') { b.velocity.x = 0; e.fr = 'cast'; if (now >= e.aiUntil) e.ai = 'walk'; return; }
    if (e.stunT > 0) return;
    e.cd -= dt;
    if (e.aggro && alive) {
      e.dir = dx >= 0 ? 1 : -1; const ax = Math.abs(dx);
      let want = ax > 260 ? e.dir : ax < 150 ? -e.dir : 0;
      if (want && !this.standAt(b.center.x + want * 10, b.bottom + 4)) want = 0;
      b.velocity.x = want * T.speed;
      if (want && onG && (b.blocked.left || b.blocked.right)) b.velocity.y = -240;
      if (e.cd <= 0 && e.sees) { e.cd = T.cd * rand(0.9, 1.1) * (1 - 0.15 * e.souls); e.ai = 'cast'; e.aiUntil = now + 450; this.horbs.push({ x: e.x + e.dir * 6, y: b.top - 4, vx: e.dir * 40, vy: -60, t: 5, big: e.souls }); Sfx.zealotCast(); return; }
    } else b.velocity.x = 0;
    if (Math.abs(b.velocity.x) > 3) { e.stepK += dt * 5; e.fr = Math.floor(e.stepK) % 2 ? 'w1' : 'w0'; } else e.fr = 'w0';
  },

  // ---------------------------------------------------------------- mine layer ----
  // A flat drone that sweeps back and forth 110 px over you and drops a proximity mine every ~2.5 s (five out at most).
  // Mines arm in 0.6 s (green, then red); come within 26 px and they beep (0.35 s) and blow. Shoot them first: they
  // hurt whoever's near.
  updateMinelayer(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.MINELAYER, b = e.body, pb = this.player.body;
    if (alive && !e.aggro && (e.sees || dist < 300) && dist < e.def.sight) this.alertEnemy(e, now);
    e.fr = Math.floor(now / 70) % 2 ? 'm1' : 'm0';
    let tx = e.homeX, ty = e.homeY;
    if (e.aggro && alive) { tx = pb.center.x + Math.sin(e.t * 0.6) * 160; ty = Math.max(50, pb.center.y - 110); for (let yy = pb.center.y - 20; yy > ty; yy -= 8) if (this.solidAt(clamp(tx, 30, LW - 30), yy)) { ty = yy + 14; break; } }
    tx = clamp(tx, 30, LW - 30); ty = clamp(ty, 40, LH - 60);
    b.velocity.x += (clamp((tx - e.x) * 1.5, -T.speed, T.speed) - b.velocity.x) * Math.min(1, dt * 2);
    b.velocity.y += (clamp((ty - e.y) * 1.5, -T.speed, T.speed) - b.velocity.y) * Math.min(1, dt * 2);
    e.dir = b.velocity.x >= 0 ? 1 : -1;
    if (e.aggro && alive && (e.cd -= dt) <= 0) { e.cd = T.cd * rand(0.9, 1.1); if (this.emines.filter(m => m.owner === e).length < T.max) { this.emines.push({ x: e.x, y: b.bottom + 2, vy: 0, st: 'fall', t: 0, owner: e }); Sfx.mineThrow(); } }
  },

  // ---------------------------------------------------------------- rat king ----
  // A knot of ratbots (90 HP) that shambles at you, shedding two ratbots every ~5 s (six out at most) and bursting into
  // four more when it dies. Ratbots (8 HP) skitter at you at 130 px/s, hopping, and nibble (4).
  updateRatking(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.RATKING, b = e.body, onG = b.blocked.down || b.touching.down;
    if (alive && !e.aggro && (e.sees || dist < 220) && dist < e.def.sight) this.alertEnemy(e, now);
    if (e.ai === 'alert' || e.ai === 'patrol') e.ai = 'walk';
    if (e.stunT > 0) return;
    if (e.aggro && alive) {
      e.dir = dx >= 0 ? 1 : -1; b.velocity.x = Math.abs(dx) > 16 ? e.dir * T.speed : 0;
      if ((e.dir < 0 ? b.blocked.left : b.blocked.right) && onG) b.velocity.y = -240;
      if ((e.shedT -= dt) <= 0) {
        e.shedT = T.shed * rand(0.9, 1.1);
        const n = this.enemies.getChildren().filter(o => o.alive && o.kind === 'ratbot' && o.owner === e).length;
        for (let k = 0; k < Math.min(2, T.maxRats - n); k++) { const o = this.spawnEnemy('ratbot', Math.floor(e.x / TS), Math.floor((b.bottom - 2) / TS)); Object.assign(o, { summoned: true, aggro: true, aggroT: 9, owner: e }); o.body.setVelocity(rand(-140, 140), rand(-200, -120)); }
        Sfx.squeak();
      }
    } else b.velocity.x = 0;
    if (Math.abs(b.velocity.x) > 3) { e.stepK = (e.stepK || 0) + dt * 6; e.fr = Math.floor(e.stepK) % 2 ? 'w1' : 'w0'; } else e.fr = 'w0';
  },
  updateRatbot(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.RATKING, b = e.body, onG = b.blocked.down || b.touching.down;
    e.aggro = true;
    if (e.stunT > 0 && !onG) return;
    e.dir = dx + e.jit >= 0 ? 1 : -1;
    if (onG) b.velocity.x = e.dir * T.ratSpeed * (alive ? 1 : -0.5);
    if (onG && ((e.dir < 0 ? b.blocked.left : b.blocked.right) || (e.hopT -= dt) <= 0)) { e.hopT = rand(0.8, 2); b.velocity.y = -rand(140, 220); if (Math.random() < 0.3) Sfx.squeak(); }
    e.fr = Math.floor(now / 70) % 2 ? 'r1' : 'r0';
  },

  // ---------------------------------------------------------------- headsman ----
  // A hooded executioner (200 HP) with a great axe. In reach (44 px) it raises it (0.8 s, a red box marks where it'll
  // land), then chops: 30 to you and 40 to any foe in the box, and a crack runs along the floor ahead of it (jump
  // it). The axe sticks for 0.9 s: hit it then (x1.5).
  updateHeadsman(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.HEADSMAN, b = e.body, onG = b.blocked.down || b.touching.down, pb = this.player.body;
    if (alive && !e.aggro && (e.sees || dist < 200) && dist < e.def.sight) this.alertEnemy(e, now);
    if (e.ai === 'alert' || e.ai === 'patrol') e.ai = 'walk';
    if (e.ai === 'raise') {
      b.velocity.x = 0; e.fr = 'raise';
      if (now >= e.aiUntil) {                                             // the chop
        const x0 = e.x + e.dir * 20 - 22, x1 = x0 + 44, y0 = b.top - 4, y1 = b.bottom + 4;
        if (alive && this.state !== 'dead' && pb.right > x0 && pb.left < x1 && pb.bottom > y0 && pb.top < y1) this.hurtPlayer(T.dmg, e.x, { srcY: e.y });
        for (const o of this.enemies.getChildren()) if (o.alive && o !== e && o.body.right > x0 && o.body.left < x1 && o.body.bottom > y0 && o.body.top < y1) this.damageEnemy(o, T.edmg, e.dir, -0.5, 'crush');
        this.shockwaves.push({ x: e.x + e.dir * 30, y: b.bottom, dir: e.dir, t: T.crackT, hit: false });
        this.shake(220, 0.01); this.fxDust(e.x + e.dir * 22, b.bottom, 10); this.fxSparks(e.x + e.dir * 22, b.bottom - 2, 8, -Math.PI / 2, 1.2, [60, 200]); Sfx.axeChop(); this.paintSplatAround(e.x + e.dir * 22, b.bottom - 1, 3);
        e.ai = 'stuck'; e.aiUntil = now + T.recoverMs;
      }
      return;
    }
    if (e.ai === 'stuck') { b.velocity.x = 0; e.fr = 'stuck'; if (now >= e.aiUntil) { e.ai = 'walk'; e.chopOk = now + 600; } return; }
    if (e.stunT > 0) return;
    if (e.aggro && alive) {
      e.dir = dx >= 0 ? 1 : -1;
      b.velocity.x = Math.abs(dx) > 26 ? e.dir * T.speed : 0;
      if ((e.dir < 0 ? b.blocked.left : b.blocked.right) && onG) b.velocity.y = -260;
      if (onG && Math.abs(dx) < T.reach && Math.abs(dy) < 34 && now >= e.chopOk) { e.ai = 'raise'; e.aiUntil = now + T.tellMs; Sfx.charge(0.3); return; }
    } else b.velocity.x = 0;
    if (Math.abs(b.velocity.x) > 3) { e.stepK += dt * 4; e.fr = Math.floor(e.stepK) % 2 ? 'w1' : 'w0'; } else e.fr = 'w0';
  },

  // ---------------------------------------------------------------- berserker ----
  // A wiry brute (100 HP) with a saw-blade arm: walks at you (70 px/s) and swings in close (12, every 0.9 s). Below
  // half health it goes BERSERK for good: 150 px/s, a swing every 0.45 s, a red haze, but it takes x1.25.
  updateBerserker(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.BERSERKER, b = e.body, onG = b.blocked.down || b.touching.down, pb = this.player.body;
    if (alive && !e.aggro && (e.sees || dist < 200) && dist < e.def.sight) this.alertEnemy(e, now);
    if (e.ai === 'alert' || e.ai === 'patrol') e.ai = 'walk';
    if (!e.rage && e.hp < e.def.hp * 0.5 && e.alive) { e.rage = true; Sfx.berserk(); this.spawnLight(e.x, e.y, 'ring', 0xff3030, 0.3, 1.6, 0.9, 0.3); if (dist < 400) BUS.emit('callout', 'BERSERK'); }
    if (e.ai === 'swing') { b.velocity.x *= 0.8; e.fr = 'swing'; if (now >= e.aiUntil) e.ai = 'walk'; return; }
    if (e.stunT > 0 && !e.rage) return;
    e.swingCd -= dt;
    if (e.aggro && alive) {
      e.dir = dx >= 0 ? 1 : -1;
      b.velocity.x = Math.abs(dx) > 14 ? e.dir * (e.rage ? T.rageSpeed : T.speed) : 0;
      if ((e.dir < 0 ? b.blocked.left : b.blocked.right) && onG) b.velocity.y = -270;
      if (Math.abs(dx) < T.swingAt && Math.abs(dy) < 24 && e.swingCd <= 0 && this.state !== 'dead') {
        e.swingCd = e.rage ? T.rageCd : T.swingCd; e.ai = 'swing'; e.aiUntil = now + 200; Sfx.katana();
        this.time.delayedCall(90, () => { if (e.alive && this.state !== 'dead' && Math.abs(pb.center.x - (e.x + e.dir * 10)) < 18 && Math.abs(pb.center.y - e.y) < 24) { this.hurtPlayer(T.dmg, e.x, { srcY: e.y }); this.fxBlood(pb.center.x, pb.center.y, 5); } });
        return;
      }
    } else b.velocity.x = 0;
    if (Math.abs(b.velocity.x) > 3) { e.stepK += dt * (e.rage ? 12 : 6); e.fr = Math.floor(e.stepK) % 2 ? 'w1' : 'w0'; } else e.fr = 'w0';
  },

  // ---------------------------------------------------------------- bastion ----
  // A squat bot (120 HP) that keeps 120-220 px off and plinks at you. Every ~6 s it throws up a hard-light wall 26 px
  // in front of it (40 px tall, 4 s, 60 HP) that stops your bullets (beams, blasts and blades get through). Shoot the
  // wall down or go round it.
  updateBastion(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.BASTION, b = e.body, onG = b.blocked.down || b.touching.down;
    if (alive && !e.aggro && (e.sees || dist < 220) && dist < e.def.sight) this.alertEnemy(e, now);
    if (e.ai === 'alert' || e.ai === 'patrol') e.ai = 'walk';
    if (e.ai === 'cast') { b.velocity.x = 0; e.fr = 'cast'; if (now >= e.aiUntil) e.ai = 'walk'; return; }
    if (e.stunT > 0) return;
    e.cd -= dt; e.fireCd = (e.fireCd || 1) - dt;
    if (e.aggro && alive) {
      e.dir = dx >= 0 ? 1 : -1; const ax = Math.abs(dx);
      let want = ax > T.keep[1] ? e.dir : ax < T.keep[0] ? -e.dir : 0;
      const hunt = e.blindT > 3 && dy > 40;                              // lost you somewhere below: it'll drop off its ledge to look
      if (hunt && !want) want = e.dir;
      if (want && !(hunt && want === e.dir) && !this.stepOk(b.center.x + want * 10, b.bottom)) want = 0;   // backing away, it still minds the edge
      b.velocity.x = want * T.speed;
      if (want && onG && (b.blocked.left || b.blocked.right)) b.velocity.y = -KEEPER_HOP;
      if (e.cd <= 0 && onG && (!e.wall || !this.bwalls.includes(e.wall))) {
        e.cd = T.cd * rand(0.9, 1.1); e.ai = 'cast'; e.aiUntil = now + 400;
        const wx = e.x + e.dir * 26; if (!this.solidAt(wx, b.bottom - 8)) { e.wall = { x: wx, y0: b.bottom - T.wallH, y1: b.bottom, hp: T.wallHp, t: T.wallT, hitT: 0, owner: e }; this.bwalls.push(e.wall); Sfx.hardlight(); this.spawnLight(wx, b.bottom - 20, 'glow', 0x46e6ff, 0.6, 1.4, 0.8, 0.2); }
        return;
      }
      if (e.sees && e.fireCd <= 0) { e.fireCd = T.fireCd * rand(0.9, 1.1); const a = this.aimLead(e.x, e.y - 4, 240); this.spawnEBullet(e.x + Math.cos(a) * 8, e.y - 4 + Math.sin(a) * 8, a, 240, 7); Sfx.eshot(); }
    } else b.velocity.x = 0;
    if (Math.abs(b.velocity.x) > 3) { e.stepK += dt * 5; e.fr = Math.floor(e.stepK) % 2 ? 'w1' : 'w0'; } else e.fr = 'w0';
  },

  // ---------------------------------------------------------------- shellback ----
  // A crab-tortoise (110 HP) under a riveted shell that faces you: shots from the front do a fifth. It plods at you and
  // bashes from 60 px (0.4 s tell, a 230 px/s lunge). A kick, a blast or a crushing blow flips it: belly up for 3 s,
  // harmless and taking double.
  updateShellback(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.SHELLBACK, b = e.body, onG = b.blocked.down || b.touching.down;
    if (alive && !e.aggro && (e.sees || dist < 200) && dist < e.def.sight) this.alertEnemy(e, now);
    if (e.ai === 'alert' || e.ai === 'patrol') e.ai = 'walk';
    if (e.ai === 'flip') { b.velocity.x *= Math.pow(0.05, dt); e.fr = Math.floor(now / 120) % 2 ? 'flip2' : 'flip'; if (now >= e.aiUntil && onG) { e.ai = 'walk'; b.velocity.y = -160; this.fxDust(e.x, b.bottom, 4); } return; }
    if (e.ai === 'tell') { b.velocity.x = 0; e.fr = 'tell'; if (now >= e.aiUntil) { e.ai = 'bash'; e.aiUntil = now + T.bashMs; b.velocity.x = e.dir * T.bash; Sfx.whoosh(); } return; }
    if (e.ai === 'bash') { b.velocity.x = e.dir * T.bash; e.fr = 'w1'; if (now >= e.aiUntil || b.blocked.left || b.blocked.right) { e.ai = 'walk'; e.bashOk = now + 1800; } return; }
    if (e.stunT > 0) return;
    if (e.aggro && alive) {
      e.dir = dx >= 0 ? 1 : -1;
      b.velocity.x = Math.abs(dx) > 20 ? e.dir * T.speed : 0;
      if ((e.dir < 0 ? b.blocked.left : b.blocked.right) && onG) b.velocity.y = -240;
      if (onG && Math.abs(dx) < T.bashAt && Math.abs(dy) < 30 && now >= e.bashOk) { e.ai = 'tell'; e.aiUntil = now + T.tellMs; return; }
    } else b.velocity.x = 0;
    if (Math.abs(b.velocity.x) > 3) { e.stepK += dt * 5; e.fr = Math.floor(e.stepK) % 2 ? 'w1' : 'w0'; } else e.fr = 'w0';
  },

  // ---------------------------------------------------------------- shinobi ----
  // A masked runner (55 HP) that leaps (380 px/s up) to a spot near you every ~1.6 s, throwing a fan of three stars
  // (7 each) at the top of the jump. It clings to any wall it hits for 0.5 s, then kicks off toward you.
  updateShinobi(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.SHINOBI, b = e.body, onG = b.blocked.down || b.touching.down;
    if (alive && !e.aggro && (e.sees || dist < 240) && dist < e.def.sight) this.alertEnemy(e, now);
    if (e.ai === 'cling') {
      b.setVelocity(0, 0); e.fr = 'cling';
      if (now >= e.aiUntil) { b.setAllowGravity(true); const away = -e.clingSide; b.setVelocity(away * T.leapX, -T.leapY * 0.8); e.ai = 'air'; e.threw = false; e.leapT = now; e.dir = away; Sfx.whoosh(); }
      return;
    }
    if (e.ai === 'air') {
      e.fr = 'air';
      if (!e.threw && b.velocity.y > -20 && alive && e.sees && this.state !== 'dead') {   // the top of the jump: stars
        e.threw = true; const a0 = Math.atan2(dy, dx);
        for (let k = -1; k <= 1; k++) this.spawnEBullet(e.x + Math.cos(a0) * 6, e.y - 4 + Math.sin(a0) * 6, a0 + k * 0.15, T.starSpeed, T.starDmg);
        Sfx.shuriken(); e.dir = dx >= 0 ? 1 : -1;
      }
      if ((b.blocked.left || b.blocked.right) && !onG && now > e.clingOk) { e.ai = 'cling'; e.clingSide = b.blocked.left ? -1 : 1; e.aiUntil = now + T.cling * 1000; b.setAllowGravity(false); b.setVelocity(0, 0); e.clingOk = now + 1200; return; }
      if (onG && now - e.leapT > 150) { e.ai = 'ground'; e.aiUntil = now + T.leapCd * 1000 * rand(0.7, 1.1); }
      return;
    }
    if (e.stunT > 0) return;
    e.fr = Math.abs(b.velocity.x) > 3 && Math.floor(now / 100) % 2 ? 'w1' : 'w0';
    if (e.aggro && alive) {
      e.dir = dx >= 0 ? 1 : -1;
      b.velocity.x = Math.abs(dx) > 140 ? e.dir * T.run : 0;
      if (now >= e.aiUntil && onG) {
        const tx = this.player.body.center.x + rand(-120, 120) - e.x;
        b.setVelocity(clamp(tx * 1.6, -T.leapX, T.leapX), -T.leapY * rand(0.8, 1.05)); e.ai = 'air'; e.threw = false; e.leapT = now; Sfx.whoosh();
      }
    } else b.velocity.x = 0;
  },

  // ---------------------------------------------------------------- thundercloud ----
  // A storm drone that hangs 120 px over you and drifts after you (60 px/s). Every ~3.2 s, once it's roughly over you,
  // it charges (0.8 s, a flickering line marks the strike) and drops a bolt straight down: 16 to you, 20 to any foe
  // in the column, drums lit. Keep moving and it misses.
  updateThunder(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.THUNDER, b = e.body, pb = this.player.body;
    if (alive && !e.aggro && (e.sees || dist < 300) && dist < e.def.sight) this.alertEnemy(e, now);
    let tx = e.homeX, ty = e.homeY;
    if (e.aggro && alive) { tx = pb.center.x; ty = Math.max(40, pb.center.y - T.alt); for (let yy = pb.center.y - 20; yy > ty; yy -= 8) if (this.solidAt(tx, yy)) { ty = yy + 14; break; } }
    const sp = e.ai === 'charge' ? T.speed * 0.25 : T.speed;
    b.velocity.x += (clamp((tx - e.x) * 1.5, -sp, sp) - b.velocity.x) * Math.min(1, dt * 2);
    b.velocity.y += (clamp((ty - e.y) * 1.5, -sp, sp) - b.velocity.y) * Math.min(1, dt * 2);
    e.fr = e.ai === 'charge' && Math.floor(now / 60) % 2 ? 'c1' : 'c0';
    if (e.ai === 'charge') {
      e.strikeY = this.floorBelow(e.x, b.bottom + 2) || LH;
      if (now >= e.aiUntil) {
        const y0 = b.bottom, y1 = e.strikeY, hw = T.w / 2;
        this.pylonZaps.push({ x0: e.x, y0, x1: e.x + rand(-3, 3), y1, t: now }); this.spawnLight(e.x, y1, 'glow', 0xa0c8ff, 1.6, 0.4, 0.9, 0.25); this.paintScorch(e.x, y1 + 2, 7);
        Sfx.thunder(); BUS.emit('flash', 0.12); this.shake(140, 0.006); this.fxSparks(e.x, y1 - 2, 10, -Math.PI / 2, 1.4, [60, 200]);
        this.electrifyLine(e.x, y0, e.x, y1, 28);                        // a strike on a puddle lights it, under the player too
        if (alive && this.state !== 'dead' && Math.abs(pb.center.x - e.x) < hw + pb.halfWidth && pb.bottom > y0 && pb.top < y1) this.hurtPlayer(T.dmg, e.x, { srcY: y0 });
        for (const o of this.enemies.getChildren()) if (o.alive && o !== e && Math.abs(o.body.center.x - e.x) < hw + o.body.halfWidth && o.body.bottom > y0 && o.body.top < y1) this.damageEnemy(o, T.edmg, 0, 1, 'arc');
        for (const k of this.barrelList) if (k.active && Math.abs(k.x - e.x) < hw + 4 && k.y > y0 && k.y < y1 + 4) this.igniteBarrel(k);
        for (const pr of this.props || []) if (pr.st === 'ok' && Math.abs(pr.cx - e.x) < hw + pr.hw && pr.cy + pr.hh > y0 && pr.cy - pr.hh < y1) { this.igniteProp(pr); this.hitProp(pr, T.edmg, 'arc', e.x, pr.cy, 0, 1); }
        e.ai = 'drift'; e.cd = T.cd * rand(0.9, 1.1);
      }
      return;
    }
    if (e.aggro && alive && (e.cd -= dt) <= 0 && Math.abs(dx) < 60) { e.ai = 'charge'; e.aiUntil = now + T.charge * 1000; Sfx.pylonCharge(); }
  },

  // ---------------------------------------------------------------- the foreman ----
  // OVERTIME's second boss (1400 HP), every other sixth wave in place of the Smelter: a four-legged crane walker. It
  // stomps after you and cycles its attacks every ~2.2 s: a SLAM (0.7 s tell; 22 up close and a shockwave each way
  // along the floor, jump it) and a RIVET SPRAY (bursts of five). Below 60% its armour comes off and it adds a
  // MAGNET (1.6 s, drags you in) and calls HOUNDS (two at a time, four at most). Below 25% its core is exposed (x1.3)
  // and it rages: faster, quicker to attack.
  updateForeman(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.FOREMAN, b = e.body, onG = b.blocked.down || b.touching.down, p = this.player, pb = p.body, f = e.hp / e.def.hp, ph = f > 0.6 ? 1 : f > 0.25 ? 2 : 3;
    e.aggro = true;
    if (ph !== e.phase) {                                                 // a phase break: plates fly off, it staggers
      const releaseBall = this.campaign && alive && ph >= 2 && this.campaignMachinery !== 'wreck';
      if (releaseBall) this.setCampaignMachinery('wreck');
      e.phase = ph; e.ai = 'stagger'; e.aiUntil = now + 1000;
      for (let i = 0; i < 6; i++) this.spawnGib(pick(['g_plate', 'g_shard', 'g_wire']), e.x + rand(-14, 14), b.top + rand(0, 10), rand(-260, 260), rand(-380, -160), 'metal');
      BUS.emit('callout', releaseBall ? 'BALL RELEASED' : ph === 2 ? 'ARMOR BREACHED' : 'CORE EXPOSED'); this.shake(400, 0.01); Sfx.wreckHit(); this.impactFrame(2);
      return;
    }
    if (e.ai === 'stagger') { b.velocity.x = 0; e.fr = 'slam'; if (Math.random() < 0.4) this.fxSparks(e.x + rand(-14, 14), e.y + rand(-10, 6), 2); if (now >= e.aiUntil) e.ai = 'walk'; return; }
    if (e.ai === 'slamTell') {
      b.velocity.x = 0; e.fr = 'slam';
      if (now >= e.aiUntil) {                                             // SLAM: shockwaves both ways along the floor
        const fy = b.bottom; e.ai = 'walk';
        this.shockwaves.push({ x: e.x - 20, y: fy, dir: -1, t: 1.6, hit: false }, { x: e.x + 20, y: fy, dir: 1, t: 1.6, hit: false });
        this.shake(300, 0.012); this.fxDust(e.x, fy, 14); Sfx.stomp(); Sfx.wreckHit(); this.paintSplatAround(e.x, fy - 1, 4);
        if (alive && Math.abs(pb.center.x - e.x) < 50 && Math.abs(pb.bottom - fy) < 30) this.hurtPlayer(T.slamDmg, e.x);
      }
      return;
    }
    if (e.ai === 'spray') {
      b.velocity.x = 0; e.fr = 'w0';
      if ((e.shotT -= dt) <= 0 && e.shots > 0 && alive) { e.shots--; e.shotT = 0.28; const a0 = Math.atan2(dy, dx); for (let k = -2; k <= 2; k++) this.spawnEBullet(e.x + e.dir * 18, e.y - 8, a0 + k * 0.12, 240, 8); Sfx.eshot(); this.spawnLight(e.x + e.dir * 18, e.y - 8, 'glow', 0xffc060, 0.6, 1.2, 0.8, 0.08); }
      if (e.shots <= 0 && e.shotT <= 0) e.ai = 'walk';
      return;
    }
    if (e.ai === 'magnet') {
      b.velocity.x = 0; e.fr = 'magnet';
      if (alive && dist < 300 && this.state !== 'dead') { const ux = -dx / (dist || 1), uy = -dy / (dist || 1); p.x += ux * T.pull * dt; if (!pb.blocked.down) pb.velocity.y += uy * 220 * dt; }
      for (const k of this.barrelList) if (k.active && Math.abs(k.x - e.x) < 300) k.body.velocity.x += Math.sign(e.x - k.x) * 220 * dt;   // props are bolted down: the magnet can't drag them
      if (now >= e.aiUntil) e.ai = 'walk';
      return;
    }
    e.dir = dx >= 0 ? 1 : -1;
    b.velocity.x = Math.abs(dx) > 40 ? e.dir * (ph === 3 ? T.rage : T.speed) : 0;
    if ((e.dir < 0 ? b.blocked.left : b.blocked.right) && onG) b.velocity.y = -300;
    if (Math.abs(b.velocity.x) > 3) { const k0 = Math.floor(e.stepK); e.stepK += dt * 3; if (Math.floor(e.stepK) !== k0 && onG) { this.shake(60, 0.003); Sfx.stomp(); this.fxDust(e.x + rand(-14, 14), b.bottom, 2); } e.fr = Math.floor(e.stepK) % 2 ? 'w1' : 'w0'; } else e.fr = 'w0';
    if ((e.atkCd -= dt) <= 0 && alive) {
      e.atkCd = T.cd * (ph === 3 ? 0.65 : 1) * rand(0.9, 1.1);
      const opts = ph >= 2 ? ['slam', 'spray', 'magnet', 'hounds'] : ['slam', 'spray'], pickA = opts[e.atkN++ % opts.length];
      if (pickA === 'slam') { e.ai = 'slamTell'; e.aiUntil = now + T.slamTell; Sfx.charge(0.5); }
      else if (pickA === 'spray') { e.ai = 'spray'; e.shots = T.spray + ph - 1; e.shotT = 0.3; }
      else if (pickA === 'magnet') { e.ai = 'magnet'; e.aiUntil = now + T.magnet * 1000; Sfx.vortexSpin(); BUS.emit('callout', 'MAGNET'); }
      else this.foremanHounds(e);
    }
  },

  // ---------------------------------------------------------------- vortex ----
  // A turbine drone that hovers 150 px off. Every ~6 s it winds up (0.6 s) and spins for 2.5 s: within 190 px it
  // drags you in (and loose gibs), and if you're within 26 px it shreds you (6 every 0.3 s). Spinning, it takes x1.25.
  updateVortex(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.VORTEX, b = e.body, p = this.player, pb = p.body;
    if (alive && !e.aggro && (e.sees || dist < 280) && dist < e.def.sight) this.alertEnemy(e, now);
    if (e.ai === 'tell') { b.setVelocity(b.velocity.x * 0.9, b.velocity.y * 0.9); e.fr = Math.floor(now / 60) % 2 ? 'v1' : 'spin'; if (now >= e.aiUntil) { e.ai = 'spin'; e.aiUntil = now + T.spin * 1000; Sfx.vortexSpin(); } return; }
    if (e.ai === 'spin') {
      b.setVelocity(b.velocity.x * 0.9, b.velocity.y * 0.9); e.fr = 'spin';
      if (alive && dist < T.range && this.state !== 'dead' && this.los(b.center.x, b.center.y, pb.center.x, pb.center.y)) {
        const ux = -dx / (dist || 1), uy = -dy / (dist || 1), f = 1 - dist / T.range * 0.5;
        p.x += ux * T.pull * f * dt; if (!pb.blocked.down) pb.velocity.y += uy * 260 * dt;
        if (dist < 26 && (e.shredT -= dt) <= 0) { e.shredT = 0.3; this.hurtPlayer(T.shred, e.x, { knock: false, iframes: false, srcY: e.y }); this.fxBlood(pb.center.x, pb.center.y, 4); }
      }
      for (const gb of this.gibList) if (gb.active) { const ddx = e.x - gb.x, ddy = e.y - gb.y, l = Math.hypot(ddx, ddy); if (l < T.range && l > 4) { gb.body.velocity.x += ddx / l * 300 * dt; gb.body.velocity.y += ddy / l * 300 * dt - 200 * dt; } }
      if (Math.random() < 0.7) { const an = rand(0, Math.PI * 2), r = rand(60, T.range); this.fx.emit(e.x + Math.cos(an) * r, e.y + Math.sin(an) * r, { n: 1, angle: an + Math.PI + 0.6, spread: 0.1, speed: [r * 1.6, r * 2], life: [0.3, 0.5], size: [1, 1], cols: [0xd0f0ff, 0x9ad8ff], alpha: [0.6, 0], add: true }); }
      if (now >= e.aiUntil) { e.ai = 'drift'; e.cd = T.cd * rand(0.9, 1.1); }
      return;
    }
    e.fr = Math.floor(now / 90) % 2 ? 'v1' : 'v0';
    if (e.stunT > 0) { b.setVelocity(b.velocity.x * 0.9, b.velocity.y * 0.9); return; }
    let tx = e.homeX, ty = e.homeY;
    if (e.aggro && alive) { const side = Math.sign(e.x - pb.center.x) || 1; tx = pb.center.x + side * 150; ty = pb.center.y - 40 + Math.sin(e.t * 1.2) * 16; }
    tx = clamp(tx, 30, LW - 30); ty = clamp(ty, 40, LH - 50);
    b.velocity.x += (clamp((tx - e.x) * 2, -T.speed, T.speed) - b.velocity.x) * Math.min(1, dt * 3);
    b.velocity.y += (clamp((ty - e.y) * 2, -T.speed, T.speed) - b.velocity.y) * Math.min(1, dt * 3);
    e.dir = dx >= 0 ? 1 : -1;
    if (e.aggro && alive && (e.cd -= dt) <= 0 && dist < T.range + 40) { e.ai = 'tell'; e.aiUntil = now + T.tellMs; }
  },

  // ---------------------------------------------------------------- arc pylon ----
  // A rooted tesla tower. While you're within 160 px it charges (1.4 s, its orb swelling and a dotted ring showing
  // its reach), then arcs a bolt at you: 14 if it can see you, the bolt jumping on to any foe near you (10). It
  // misses into the floor if you've broken its line of sight or got out of reach. Dash through the bolt to dodge it.
  updatePylon(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.PYLON, b = e.body, top = b.top + 2;
    if (alive && !e.aggro && (e.sees || dist < 240) && dist < e.def.sight) this.alertEnemy(e, now);
    b.velocity.x = 0; e.fr = e.chargeT > 0 && Math.floor(now / 70) % 2 ? 'p1' : 'p0';
    if (e.chargeT > 0) {
      e.chargeT += dt;
      if (e.chargeT >= T.charge) {
        e.chargeT = 0; e.cd = T.cd * rand(0.9, 1.1);
        const pb = this.player.body, ok = alive && this.state !== 'dead' && Math.hypot(pb.center.x - e.x, pb.center.y - top) < T.range && this.los(e.x, top, pb.center.x, pb.center.y);
        const x1 = ok ? pb.center.x : e.x + clamp(dx, -T.range, T.range) * 0.7, y1 = ok ? pb.center.y : (this.floorBelow(x1, b.top) || b.bottom);
        this.pylonZaps.push({ x0: e.x, y0: top, x1, y1, t: now }); Sfx.pylonZap(); this.shake(90, 0.005); this.spawnLight(x1, y1, 'glow', 0x80c8ff, 1.2, 0.3, 0.9, 0.2);
        this.electrifyLine(e.x, top, x1, y1, 28);
        if (ok) this.hurtPlayer(T.dmg, e.x, { srcY: top });
        for (const o of this.enemies.getChildren()) if (o.alive && o !== e && Math.hypot(o.body.center.x - x1, o.body.center.y - y1) < 40) { this.pylonZaps.push({ x0: x1, y0: y1, x1: o.body.center.x, y1: o.body.center.y, t: now }); this.damageEnemy(o, T.chain, 0, -1, 'arc'); }
      }
      return;
    }
    if (e.aggro && alive && (e.cd -= dt) <= 0 && dist < T.range * 1.3) { e.chargeT = 0.001; Sfx.pylonCharge(); }
  },

  // ---------------------------------------------------------------- scavenger ----
  // A hunched ghoul (60 HP). If there's a corpse within 320 px it goes and eats it (1.5 s, taking x1.5 the while):
  // the corpse is gone, it heals 30, and it grows (+15% size and +20 max HP, three times at most). No corpses: it runs
  // at you (110 px/s) and lunges from 70 px.
  updateScavenger(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.SCAVENGER, b = e.body, onG = b.blocked.down || b.touching.down;
    if (alive && !e.aggro && (e.sees || dist < 220) && dist < e.def.sight) this.alertEnemy(e, now);
    if (e.ai === 'alert' || e.ai === 'patrol') e.ai = 'run';
    if (e.ai === 'eat') {
      b.velocity.x = 0; e.fr = 'eat';
      const rd = e.meal; if (!rd || !this.ragdolls.includes(rd)) { e.ai = 'run'; e.meal = null; return; }
      if (Math.random() < 0.4) this.fxBlood(e.x + e.dir * 8, b.bottom - 3, 2, -Math.PI / 2, 1.2, [30, 90]);
      if ((e.chompT = (e.chompT || 0) - dt) <= 0) { e.chompT = 0.35; Sfx.chomp(); }
      if (now >= e.aiUntil) {
        this.gibRagdoll(rd, e.dir, -0.5, 'kick'); e.meal = null; e.ai = 'run';
        e.growN = Math.min(T.maxGrow, e.growN + 1); e.growS = 1 + T.grow * e.growN; e.setScale(e.growS);
        e.def = Object.assign({}, e.def, { hp: e.def.hp + 20 }); e.hp = Math.min(e.def.hp, e.hp + T.heal);
        this.dmgNumber(e.x, b.top - 5, '+' + T.heal, 'G'); if (e.growN === 1 && alive) BUS.emit('callout', 'IT FED');
      }
      return;
    }
    if (e.ai === 'leap') { e.fr = 'w1'; if (onG && now - e.leapT > 150) { e.ai = 'run'; e.leapOk = now + 1400; } return; }
    if (e.stunT > 0) return;
    let goal = null;
    if (e.growN < T.maxGrow && (e.mealScan = (e.mealScan || 0) - dt) <= 0) {   // look for something to eat
      e.mealScan = 0.5; let bd = 320;
      for (const rd of this.ragdolls) { const d = Math.hypot(rd.pts[2].x - e.x, rd.pts[2].y - e.y); if (d < bd && Math.abs(rd.pts[2].y - e.y) < 60) { bd = d; goal = rd; } }
      e.goal = goal;
    }
    goal = e.goal && this.ragdolls.includes(e.goal) ? e.goal : null;
    if (goal) {
      const gx = goal.pts[2].x - e.x; e.dir = Math.sign(gx) || e.dir;
      if (Math.abs(gx) < 10 && onG) { e.ai = 'eat'; e.meal = goal; e.aiUntil = now + T.eatMs; e.goal = null; return; }
      b.velocity.x = e.dir * T.speed;
    } else if (e.aggro && alive) {
      e.dir = dx >= 0 ? 1 : -1; b.velocity.x = Math.abs(dx) > 8 ? e.dir * T.speed : 0;
      if (onG && Math.abs(dx) < T.leapAt && Math.abs(dy) < 40 && now >= e.leapOk && e.sees) { e.ai = 'leap'; e.leapT = now; b.velocity.x = e.dir * 260; b.velocity.y = -200; Sfx.chomp(); return; }
    } else b.velocity.x = 0;
    if ((e.dir < 0 ? b.blocked.left : b.blocked.right) && onG) b.velocity.y = -270;
    if (Math.abs(b.velocity.x) > 3) { e.stepK += dt * 10; e.fr = Math.floor(e.stepK) % 2 ? 'w1' : 'w0'; } else e.fr = 'w0';
  },

  // ---------------------------------------------------------------- torcher ----
  // A heavy (140 HP) with a flamethrower. Within 96 px it plants and sprays for 1.4 s, one sweep up and back across
  // +/-0.55 rad (7 a tick, setting things alight), then vents for 1.1 s. Fireproof from the front; its fuel tank
  // takes x1.6 from behind, and a kill through the back blows it up.
  updateTorcher(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.TORCHER, b = e.body, onG = b.blocked.down || b.touching.down, pb = this.player.body;
    if (alive && !e.aggro && (e.sees || dist < 200) && dist < e.def.sight) this.alertEnemy(e, now);
    if (e.ai === 'alert' || e.ai === 'patrol') e.ai = 'walk';
    if (e.ai === 'spray') {
      b.velocity.x = 0; e.fr = 'spray';
      const k = 1 - (e.aiUntil - now) / T.sprayMs, ang = e.baseA + Math.sin(k * Math.PI * 2) * T.sweep, fx0 = e.x + e.dir * 11, fy0 = e.y - 2;
      e.flameA = ang;
      for (let q = 0; q < 2; q++) this.fx.emit(fx0, fy0, { n: 1, angle: ang + rand(-0.12, 0.12), spread: 0.05, speed: [200, 300], life: [0.25, 0.4], size: [5, 1], cols: [0xffffff, 0xffe46a, 0xffa030, 0xff5a1a, 0xa82010], add: true, g: -60, drag: 2.5, jitter: 2 });
      if ((e.tick -= dt) <= 0) {
        e.tick = 0.2;
        const inCone = (x, y) => { const ddx = x - fx0, ddy = y - fy0; if (Math.hypot(ddx, ddy) > T.reach) return false; const an = Math.atan2(ddy, ddx) - ang; return Math.abs(Math.atan2(Math.sin(an), Math.cos(an))) < 0.28; };
        if (alive && inCone(pb.center.x, pb.center.y) && this.los(fx0, fy0, pb.center.x, pb.center.y)) this.hurtPlayer(T.dmg, e.x, { knock: false, burn: true, iframes: false, srcY: e.y });
        for (const o of this.enemies.getChildren()) if (o.alive && o !== e && inCone(o.body.center.x, o.body.center.y)) this.ignite(o, 1.5);
        for (const k2 of this.barrelList) if (k2.active && inCone(k2.x, k2.y)) this.igniteBarrel(k2);
        for (const pr of this.props || []) if (pr.st === 'ok' && inCone(pr.cx, pr.cy)) this.igniteProp(pr);
        for (const rd of this.ragdolls) if (inCone(rd.pts[2].x, rd.pts[2].y)) rd.burnT = Math.max(rd.burnT, 2);
        if (Math.random() < 0.5) Sfx.ignite();
      }
      if (now >= e.aiUntil) { e.ai = 'cool'; e.aiUntil = now + T.coolMs; }
      return;
    }
    if (e.ai === 'cool') {
      b.velocity.x = 0; e.fr = 'w0';
      if (Math.random() < 0.4) this.fx.emit(e.x - e.dir * 8, e.y - 6, { n: 1, angle: -Math.PI / 2, spread: 0.4, speed: [10, 30], life: [0.4, 0.8], size: [3, 6], cols: [0xe8e8e8, 0xb8b8b8], alpha: [0.4, 0], g: -30 });
      if (now >= e.aiUntil) e.ai = 'walk';
      return;
    }
    if (e.stunT > 0) return;
    if (e.aggro && alive) {
      e.dir = dx >= 0 ? 1 : -1;
      const want = Math.abs(dx) > 70 ? e.dir : 0; b.velocity.x = want * T.speed;
      if (want && onG && (b.blocked.left || b.blocked.right)) b.velocity.y = -260;
      if (Math.abs(dx) < T.reach && Math.abs(dy) < 50 && e.sees && now >= e.sprayOk) { e.ai = 'spray'; e.aiUntil = now + T.sprayMs; e.baseA = Math.atan2(dy, dx); e.tick = 0; e.sprayOk = now + T.sprayMs + T.coolMs + 300; Sfx.scorch(); return; }
    } else b.velocity.x = 0;
    if (Math.abs(b.velocity.x) > 3) { e.stepK += dt * 5; e.fr = Math.floor(e.stepK) % 2 ? 'w1' : 'w0'; } else e.fr = 'w0';
  },

  // ---------------------------------------------------------------- discus ----
  // A lean thrower that keeps 150-250 px off. Every ~3.2 s it skims a steel disc at you (280 px/s, 260 px out) that
  // turns and comes back to its hand, cutting you both ways (10). Kick or slash the disc and it goes back as yours
  // (45 to whatever it hits, its thrower above all).
  updateDiscus(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.DISCUS, b = e.body, onG = b.blocked.down || b.touching.down;
    if (alive && !e.aggro && (e.sees || dist < 220) && dist < e.def.sight) this.alertEnemy(e, now);
    if (e.ai === 'alert' || e.ai === 'patrol') e.ai = 'walk';
    if (e.ai === 'throw') { b.velocity.x = 0; e.fr = 'throw'; if (now >= e.aiUntil) e.ai = 'walk'; return; }
    if (e.stunT > 0) return;
    e.cd -= dt;
    if (e.aggro && alive) {
      e.dir = dx >= 0 ? 1 : -1; const ax = Math.abs(dx);
      let want = ax > T.keep[1] ? e.dir : ax < T.keep[0] ? -e.dir : 0;
      const hunt = e.blindT > 3 && dy > 40;                              // lost you somewhere below: it'll drop off its ledge to look
      if (hunt && !want) want = e.dir;
      if (want && !(hunt && want === e.dir) && !this.stepOk(b.center.x + want * 10, b.bottom)) want = 0;   // backing away, it still minds the edge
      b.velocity.x = want * T.speed;
      if (want && onG && (b.blocked.left || b.blocked.right)) b.velocity.y = -KEEPER_HOP;
      if (e.cd <= 0 && !e.disc && e.sees && dist < 320) {
        e.cd = T.cd * rand(0.85, 1.15); e.ai = 'throw'; e.aiUntil = now + 350;
        const a = Math.atan2(dy, dx), D = { x: e.x + e.dir * 6, y: e.y - 4, vx: Math.cos(a) * T.disc, vy: Math.sin(a) * T.disc, owner: e, st: 'out', dist: 0, hitP: 0, mine: false, spin: 0, hits: new Set() };
        this.discs.push(D); e.disc = D; Sfx.discThrow(); return;
      }
    } else b.velocity.x = 0;
    if (Math.abs(b.velocity.x) > 3) { e.stepK += dt * 6; e.fr = Math.floor(e.stepK) % 2 ? 'w1' : 'w0'; } else e.fr = 'w0';
  },

  // ---------------------------------------------------------------- spore pod ----
  // A rooted fungus (90 HP, it never moves). While it knows you're near it swells (0.4 s) and puffs three homing
  // spores every ~3.2 s (70 px/s, 6 a hit, 4.5 s). Shots, slashes and walls pop spores. Dead, it bursts into a
  // toxic cloud.
  updateSporepod(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.SPOREPOD, b = e.body;
    if (alive && !e.aggro && (e.sees || dist < 260) && dist < e.def.sight) this.alertEnemy(e, now);
    b.velocity.x = 0;
    if (e.puffT > 0) { e.puffT -= dt; e.fr = 'puff'; if (e.puffT <= 0) { for (let k = 0; k < T.n; k++) this.spores.push({ x: e.x + rand(-3, 3), y: b.top - 2, vx: rand(-50, 50), vy: rand(-110, -70), t: T.life }); Sfx.sporePuff(); this.fx.emit(e.x, b.top, { n: 10, angle: -Math.PI / 2, spread: 0.8, speed: [20, 80], life: [0.4, 0.8], size: [3, 6], cols: [0xb8e040, 0x7a9a30], alpha: [0.6, 0], g: -20 }); } return; }
    e.fr = Math.floor(now / 400) % 2 ? 'p1' : 'p0';
    if (e.aggro && alive && dist < 340 && (e.cd -= dt) <= 0) { e.cd = T.cd * rand(0.9, 1.1); e.puffT = 0.4; }
  },

  // ---------------------------------------------------------------- grappler ----
  // A hulking brute (160 HP). Close in, it throws its arms wide (0.42 s), then lunges: catch you and it holds you up
  // (8) for 0.65 s and hurls you across the room (14, and 8 more if you hit a wall). Kick, dash or deal 35 damage to
  // it while you're held and you break free (it staggers).
  updateGrappler(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.GRAPPLER, b = e.body, onG = b.blocked.down || b.touching.down, p = this.player, pb = p.body;
    if (alive && !e.aggro && (e.sees || dist < 200) && dist < e.def.sight) this.alertEnemy(e, now);
    if (e.ai === 'alert' || e.ai === 'patrol') e.ai = 'walk';
    if (e.ai === 'hold') {
      b.velocity.x = 0; e.fr = 'hold';
      if (this.grabbedBy !== e || !alive) { if (this.grabbedBy === e) this.grabbedBy = null; e.ai = 'recover'; e.aiUntil = now + 800; return; }
      p.x = e.x + e.dir * 13 + (p.x - pb.center.x); p.y = b.bottom - 8 + (p.y - pb.bottom); pb.velocity.set(0, 0);
      if (now >= e.aiUntil) this.grappleThrow(e);
      return;
    }
    if (e.ai === 'tell') { b.velocity.x = 0; e.fr = 'tell'; if (now >= e.aiUntil) { e.ai = 'grab'; e.aiUntil = now + 260; Sfx.whoosh(); } return; }
    if (e.ai === 'grab') {
      e.fr = 'grab'; b.velocity.x = e.dir * T.lunge;
      const rx = e.x + e.dir * 12;
      if (alive && !this.grabbedBy && now >= this.dashIUntil && Math.abs(pb.center.x - rx) < 12 && pb.bottom > b.top && pb.top < b.bottom) {
        this.grabbedBy = e; e.ai = 'hold'; e.aiUntil = now + T.holdMs; e.holdDmg = 0;
        this.hurtPlayer(T.dmg, e.x, { knock: false }); BUS.emit('callout', 'GRABBED'); Sfx.grab(); this.shake(100, 0.006);
        return;
      }
      if (now >= e.aiUntil) { e.ai = 'recover'; e.aiUntil = now + 700; }
      return;
    }
    if (e.ai === 'recover') { b.velocity.x *= Math.pow(0.02, dt); e.fr = 'w0'; if (now >= e.aiUntil) e.ai = 'walk'; return; }
    if (e.stunT > 0) return;
    if (e.aggro && alive) {
      e.dir = dx >= 0 ? 1 : -1;
      const want = Math.abs(dx) > 16 ? e.dir : 0;
      b.velocity.x = want * T.speed;
      if (want && onG && (b.blocked.left || b.blocked.right)) b.velocity.y = -270;
      if (onG && Math.abs(dx) < T.reach + 12 && Math.abs(dy) < 30 && now >= e.grabOk && this.state !== 'dead') { e.ai = 'tell'; e.aiUntil = now + T.tellMs; e.grabOk = now + 2200; Sfx.charge(0.25); return; }
    } else b.velocity.x = 0;
    if (Math.abs(b.velocity.x) > 3) { e.stepK += dt * 5; e.fr = Math.floor(e.stepK) % 2 ? 'w1' : 'w0'; } else e.fr = 'w0';
  },

  // ---------------------------------------------------------------- spotter ----
  // A floating eye that hangs high, 180-300 px off (it backs away fast if you close in). Keep it looking at you for a
  // second and you're MARKED (a red reticle) while it can see you and 1.5 s after: every foe on the map comes for you
  // and hits do +25%.
  updateSpotter(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.SPOTTER, b = e.body, pb = this.player.body;
    if (alive && !e.aggro && (e.sees || dist < 300) && dist < e.def.sight) this.alertEnemy(e, now);
    e.fr = Math.floor(now / 120) % 2 ? 's1' : 's0';
    if (e.stunT > 0) { b.velocity.x *= 0.9; b.velocity.y *= 0.9; e.lockT = 0; return; }
    let tx = e.homeX, ty = e.homeY;
    const ax = Math.abs(dx), close = ax < 140;
    if (e.aggro && alive) { const side = Math.sign(e.x - pb.center.x) || 1; tx = pb.center.x + side * (close ? T.keep[1] + 40 : clamp(ax, T.keep[0], T.keep[1])); ty = pb.center.y - 110 + Math.sin(e.t * 1.1) * 14; }
    tx = clamp(tx, 30, LW - 30); ty = clamp(ty, 40, LH - 60);
    const sp = T.speed * (close ? 1.6 : 1);
    b.velocity.x += (clamp((tx - e.x) * 2, -sp, sp) - b.velocity.x) * Math.min(1, dt * 3);
    b.velocity.y += (clamp((ty - e.y) * 2, -sp, sp) - b.velocity.y) * Math.min(1, dt * 3);
    e.dir = dx >= 0 ? 1 : -1;
    if (alive && e.aggro && e.sees) {
      e.lockT = Math.min(T.lock, e.lockT + dt);
      if (e.lockT >= T.lock) { if (now >= this.markedUntil) this.markPlayer(now); this.markedUntil = now + T.markMs; }
    } else e.lockT = Math.max(0, e.lockT - dt * 0.5);
  },

  // ---------------------------------------------------------------- hound ----
  // A lean robot dog (45 HP) that runs at 190 px/s, usually in pairs: each flanks out to one side of you, then closes
  // in. Within 110 px it crouches (0.26 s) and pounces (300 px/s); it lands and recovers for 0.6 s.
  updateHound(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.HOUND, b = e.body, onG = b.blocked.down || b.touching.down;
    if (alive && !e.aggro && (e.sees || dist < 240) && dist < e.def.sight) this.alertEnemy(e, now);
    if (e.ai === 'alert' || e.ai === 'patrol') e.ai = 'run';
    if (e.ai === 'tell') { b.velocity.x *= Math.pow(0.001, dt); e.fr = 'crouch'; if (now >= e.aiUntil) { e.ai = 'leap'; b.velocity.x = e.dir * T.leapX; b.velocity.y = -T.leapY; e.leapT = now; Sfx.bark(); } return; }
    if (e.ai === 'leap') { e.fr = 'leap'; if (onG && now - e.leapT > 150) { e.ai = 'recover'; e.aiUntil = now + T.recover * 1000; this.fxDust(e.x, b.bottom, 3); } return; }
    if (e.ai === 'recover') { b.velocity.x *= Math.pow(0.01, dt); e.fr = 'r0'; if (now >= e.aiUntil) e.ai = 'run'; return; }
    if (e.stunT > 0) return;
    if (e.aggro && alive) {
      const tx = this.player.body.center.x + e.side * (Math.abs(dx) > 150 ? T.flank : 0), ddx = tx - e.x;   // flank wide, then straight in
      if (Math.abs(ddx) > 6) e.dir = Math.sign(ddx);
      b.velocity.x = Math.abs(ddx) > 6 ? e.dir * T.speed : 0;
      if ((e.dir < 0 ? b.blocked.left : b.blocked.right) && onG) b.velocity.y = -280;
      if (onG && Math.abs(dx) < T.leapAt && Math.abs(dy) < 50 && now >= e.leapOk && e.sees) { e.dir = dx >= 0 ? 1 : -1; e.ai = 'tell'; e.aiUntil = now + T.tellMs; e.leapOk = now + 1600; return; }
    } else b.velocity.x = 0;
    if (Math.abs(b.velocity.x) > 3) { e.stepK += dt * 14; e.fr = Math.floor(e.stepK) % 2 ? 'r1' : 'r0'; } else e.fr = 'r0';
  },

  // ---------------------------------------------------------------- orbiter ----
  // A flying core with three steel plates (40 HP each) spinning round it. A plate between you and the core eats the
  // shot (explosions and fire get round them): fire through the gaps or strip the plates. It hangs 120 px off your
  // shoulder and fires a 3-shot fan every ~2.2 s; bare, it spins and fires faster.
  updateOrbiter(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.ORBITER, b = e.body, pb = this.player.body, bare = e.plates.every(h => h <= 0);
    if (alive && !e.aggro && (e.sees || dist < 260) && dist < e.def.sight) this.alertEnemy(e, now);
    e.spin += dt * T.spin * (bare ? 2.2 : 1);
    if (e.stunT > 0) { b.velocity.x *= 0.9; b.velocity.y *= 0.9; return; }
    let tx = e.homeX, ty = e.homeY;
    if (e.aggro && alive) { const side = Math.sign(e.x - pb.center.x) || 1; tx = pb.center.x + side * 120 + Math.sin(e.t * 0.8) * 40; ty = pb.center.y - 70 + Math.sin(e.t * 1.3) * 18; }
    tx = clamp(tx, 30, LW - 30); ty = clamp(ty, 40, LH - 40);
    const sp = T.speed * (bare ? 1.6 : 1);
    b.velocity.x += (clamp((tx - e.x) * 2, -sp, sp) - b.velocity.x) * Math.min(1, dt * 3);
    b.velocity.y += (clamp((ty - e.y) * 2, -sp, sp) - b.velocity.y) * Math.min(1, dt * 3);
    e.dir = dx >= 0 ? 1 : -1;
    e.fr = now < e.fireFr ? 'fire' : Math.floor(now / 300) % 2 ? 'o1' : 'o0';
    if (e.aggro && alive && e.sees && (e.fireCd -= dt) <= 0) {
      e.fireCd = T.cd * rand(0.85, 1.15) * (bare ? 0.6 : 1); e.fireFr = now + 250;
      const a = Math.atan2(dy, dx);
      for (let k = -1; k <= 1; k++) this.spawnEBullet(e.x + Math.cos(a) * 9, e.y + Math.sin(a) * 9, a + k * 0.18, 210, 8);
      Sfx.eshot(); this.spawnLight(e.x + Math.cos(a) * 8, e.y + Math.sin(a) * 8, 'glow', 0x46e6ff, 0.5, 1, 0.8, 0.1);
    }
  },

  // ---------------------------------------------------------------- swapper ----
  // A phase bot that keeps 140-260 px off, plinking at you. Every ~6.5 s it locks on (a 0.9 s violet tether) and
  // trades places with you, then fires a 3-shot burst. 20 damage during the tell breaks it.
  updateSwapper(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.SWAPPER, b = e.body, onG = b.blocked.down || b.touching.down, pb = this.player.body;
    if (alive && !e.aggro && (e.sees || dist < 240) && dist < e.def.sight) this.alertEnemy(e, now);
    if (e.ai === 'alert' || e.ai === 'patrol') e.ai = 'walk';
    if (e.burst > 0 && (e.burstT -= dt) <= 0 && alive) { e.burst--; e.burstT = 0.14; const a = this.aimLead(e.x, e.y - 4, 260) + rand(-0.05, 0.05); this.spawnEBullet(e.x + Math.cos(a) * 8, e.y - 4 + Math.sin(a) * 8, a, 260, 7); Sfx.eshot(); }
    if (e.ai === 'tell') {
      b.velocity.x = 0; e.fr = 'tell';
      if (Math.random() < 0.6) this.fx.emit(pb.center.x + rand(-6, 6), pb.center.y + rand(-10, 10), { n: 1, speed: [10, 40], life: [0.2, 0.4], size: [2, 1], cols: [0xf0d8ff, 0xb070ff], add: true });
      if (now >= e.aiUntil) { e.ai = 'walk'; e.cd = T.cd * rand(0.9, 1.1); if (alive && this.state === 'play') this.swapWith(e); }
      return;
    }
    if (e.stunT > 0) return;
    e.cd -= dt;
    if (e.aggro && alive) {
      e.dir = dx >= 0 ? 1 : -1; const ax = Math.abs(dx);
      if (!this.standoff(e, dt, now, onG, T.speed)) {                   // out of sight: round by the nav graph to a spot that sees you
        let want = ax > 260 ? e.dir : ax < 140 ? -e.dir : 0;
        if (want && !this.standAt(b.center.x + want * 10, b.bottom + 4)) want = 0;
        b.velocity.x = want * T.speed;
        if (want && onG && (b.blocked.left || b.blocked.right)) b.velocity.y = -240;
      }
      if (e.cd <= 0 && e.sees && dist < T.range && onG && !e.navAir) { e.ai = 'tell'; e.aiUntil = now + T.tellMs; e.tellDmg = 0; Sfx.swapTell(); return; }
      if (e.sees && (e.fireCd -= dt) <= 0) { e.fireCd = rand(1.6, 2.2); const a = this.aimLead(e.x, e.y - 4, 240); this.spawnEBullet(e.x + Math.cos(a) * 8, e.y - 4 + Math.sin(a) * 8, a, 240, 7); Sfx.eshot(); }
    } else b.velocity.x = 0;
    if (Math.abs(b.velocity.x) > 3) { e.stepK += dt * 6; e.fr = Math.floor(e.stepK) % 2 ? 'w1' : 'w0'; } else e.fr = 'w0';
  },

  // ---------------------------------------------------------------- scorcher ----
  // A fireproof sprinter: dashes 150 px/s for 1.6 s, overshooting you once before it turns, and leaves a trail of fire
  // on the floor (2.4 s). Then it stands winded for 1.2 s and takes x1.5. Its fuel pack bursts into flame.
  updateScorcher(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.SCORCHER, b = e.body, onG = b.blocked.down || b.touching.down;
    if (alive && !e.aggro && (e.sees || dist < 220) && dist < e.def.sight) this.alertEnemy(e, now);
    if (e.ai === 'alert' || e.ai === 'patrol') { e.ai = 'rest'; e.aiUntil = now + 500; }
    if (e.stunT > 0) return;
    if (e.ai === 'rest') {
      b.velocity.x *= Math.pow(0.01, dt); e.fr = 'pant';
      if (e.aggro && alive && now >= e.aiUntil) { e.ai = 'run'; e.aiUntil = now + T.run * 1000; e.dir = dx >= 0 ? 1 : -1; e.turned = false; e.lastTrailX = e.x; Sfx.scorch(); }
      return;
    }
    if (!e.turned && Math.sign(dx) === -e.dir && Math.abs(dx) > 70) { e.dir = -e.dir; e.turned = true; }   // runs past you, then wheels round
    const blk = e.dir < 0 ? b.blocked.left : b.blocked.right;           // a step: hop it; a wall: wheel round
    if (blk) { if (onG) b.velocity.y = -280; else if ((e.blkT = (e.blkT || 0) + dt) > 0.35) { e.dir = -e.dir; e.blkT = 0; } } else e.blkT = 0;
    b.velocity.x = e.dir * T.speed;
    e.stepK += dt * 12; e.fr = Math.floor(e.stepK) % 2 ? 'r1' : 'r0';
    if (onG && Math.abs(e.x - e.lastTrailX) >= 14) {                    // a trail of fire behind it
      e.lastTrailX = e.x;
      const fy = Math.floor((b.bottom + 2) / TS) * TS;
      if (this.standAt(e.x, fy + 2)) { const [px, pw] = this.spanOn(e.x, fy, 16); this.puddles.push({ x: px, y: fy, w: pw, t: T.trail, tick: 0.2, fire: true }); this.paintScorch(e.x, fy + 2, 6); }
    }
    if (now >= e.aiUntil || !alive) { e.ai = 'rest'; e.aiUntil = now + T.rest * 1000; }
  },

  // ---------------------------------------------------------------- wraith ----
  // A shroud that drifts straight at you through walls and floors (50 px/s), faint while it's inside them. In the
  // open and within 85 px it shrieks (0.45 s), then lunges (300 px/s, 14 on a touch) and fades back for 1.4 s.
  updateWraith(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.WRAITH, b = e.body;
    e.aggro = true; e.inWall = this.solidAt(b.center.x, b.center.y);
    if (e.ai === 'tell') {
      b.setVelocity(b.velocity.x * 0.8, b.velocity.y * 0.8); e.fr = 'tell';
      if (now >= e.aiUntil) { const a = Math.atan2(dy, dx); b.setVelocity(Math.cos(a) * T.lunge, Math.sin(a) * T.lunge); e.ai = 'lunge'; e.aiUntil = now + T.lungeMs; }
      return;
    }
    if (e.ai === 'lunge') { e.fr = 'tell'; if (now >= e.aiUntil) { e.ai = 'fade'; e.aiUntil = now + T.fadeMs; } return; }
    e.fr = Math.floor(now / 160) % 2 ? 'f1' : 'f0';
    if (e.stunT > 0) { b.setVelocity(b.velocity.x * 0.9, b.velocity.y * 0.9); return; }
    const away = e.ai === 'fade', a = Math.atan2(dy, dx) + Math.sin(e.t * 1.7) * 0.5, sp = away ? -T.speed * 1.3 : alive ? T.speed : -T.speed * 0.5;
    b.velocity.x += (Math.cos(a) * sp - b.velocity.x) * Math.min(1, dt * 2); b.velocity.y += (Math.sin(a) * sp + Math.sin(e.t * 3) * 14 - b.velocity.y) * Math.min(1, dt * 2);
    e.dir = dx >= 0 ? 1 : -1;
    if ((b.center.x < 16 && b.velocity.x < 0) || (b.center.x > LW - 16 && b.velocity.x > 0)) b.velocity.x = 0;   // it stays in the arena
    if ((b.center.y < 24 && b.velocity.y < 0) || (b.center.y > LH - 24 && b.velocity.y > 0)) b.velocity.y = 0;
    if (away) { if (now >= e.aiUntil) e.ai = 'drift'; return; }
    if (alive && !e.inWall && dist < T.strikeAt && now >= e.strikeOk) { e.ai = 'tell'; e.aiUntil = now + T.tellMs; e.strikeOk = now + 2500; Sfx.wail(); }
  },

  // ---------------------------------------------------------------- chiller + ice ----
  // A cryo trooper. It keeps 140-240 px off, and every ~2.8 s lobs a frost ball at your feet: it shatters into a
  // 74 px sheet of ice for 8 s (6 and a 1.5 s chill if it lands on you). On ice you slide (a tenth of the grip);
  // fire melts it. When it dies its tank bursts and ices the floor round it.
  updateChiller(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.CHILLER, b = e.body, onG = b.blocked.down || b.touching.down, pb = this.player.body;
    if (alive && !e.aggro && (e.sees || dist < 220) && dist < e.def.sight) this.alertEnemy(e, now);
    if (e.ai === 'alert' || e.ai === 'patrol') e.ai = 'walk';
    if (e.ai === 'throw') { b.velocity.x = 0; e.fr = 'throw'; if (now >= e.aiUntil) e.ai = 'walk'; return; }
    if (e.stunT > 0) return;
    e.cd -= dt;
    if (e.aggro && alive) {
      e.dir = dx >= 0 ? 1 : -1; const ax = Math.abs(dx);
      let want = ax > T.keep[1] ? e.dir : ax < T.keep[0] ? -e.dir : 0;
      const hunt = e.blindT > 3 && dy > 40;                              // lost you somewhere below: it'll drop off its ledge to look
      if (hunt && !want) want = e.dir;
      if (want && !(hunt && want === e.dir) && !this.stepOk(b.center.x + want * 10, b.bottom)) want = 0;   // backing away, it still minds the edge
      b.velocity.x = want * T.speed;
      if (want && onG && (b.blocked.left || b.blocked.right)) b.velocity.y = -KEEPER_HOP;
      if (e.cd <= 0 && (e.sees || dist < 260) && dist < 320) {           // a lob: it doesn't need a clear line
        e.cd = T.cd * rand(0.85, 1.15); e.ai = 'throw'; e.aiUntil = now + 420;
        this.time.delayedCall(180, () => {
          if (!e.alive || this.state === 'dead') return;
          const sx = e.x + e.dir * 6, sy = b.top - 2, G = this.physics.world.gravity.y, ddx = pb.center.x - sx, ddy = pb.bottom - 4 - sy, FT = clamp(Math.hypot(ddx, ddy) / 240, 0.5, 1.1);
          this.spawnEProj('frost', sx, sy, ddx / FT, (ddy - 0.5 * G * FT * FT) / FT); Sfx.whoosh();
        });
        return;
      }
    } else { b.velocity.x = e.dir * T.speed * 0.6; if (b.blocked.left || b.blocked.right || !this.standAt(b.center.x + e.dir * 10, b.bottom + 4)) e.dir *= -1; }
    if (Math.abs(b.velocity.x) > 3) { e.stepK += dt * 5; e.fr = Math.floor(e.stepK) % 2 ? 'w1' : 'w0'; } else e.fr = 'w0';
  },

  // ---------------------------------------------------------------- warhorn ----
  // A squat tracked bot with a brass horn. It hangs back (170-320 px), and every ~7 s winds up (0.7 s) and blasts:
  // every other foe within 230 px is rallied for 6 s, taking half damage (gold chevrons over them). Kill it first.
  updateWarhorn(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.WARHORN, b = e.body, onG = b.blocked.down || b.touching.down;
    if (alive && !e.aggro && (e.sees || dist < 260) && dist < e.def.sight) this.alertEnemy(e, now);
    if (e.ai === 'alert' || e.ai === 'patrol') e.ai = 'roll';
    if (e.ai === 'tell') { b.velocity.x = 0; e.fr = 'blow'; if (now >= e.aiUntil) { e.ai = 'roll'; this.hornBlast(e); } return; }
    if (e.stunT > 0) return;
    e.cd -= dt;
    if (e.aggro) {
      if (e.cd <= 0 && !e.navAir) { e.ai = 'tell'; e.aiUntil = now + T.tellMs; e.cd = T.cd * rand(0.9, 1.1); Sfx.charge(0.4); return; }
      e.dir = dx >= 0 ? 1 : -1; const ax = Math.abs(dx);
      if (!this.standoff(e, dt, now, onG, T.speed)) {                   // out of sight: round by the nav graph to a spot that sees you
        let want = ax < 170 ? -e.dir : ax > 320 ? e.dir : 0;               // it backs off facing you
        if (want && !this.standAt(b.center.x + want * 12, b.bottom + 4)) want = 0;
        b.velocity.x = want * T.speed;
        if (want && onG && (b.blocked.left || b.blocked.right)) b.velocity.y = -220;
      }
    } else b.velocity.x = 0;
    if (Math.abs(b.velocity.x) > 3) { e.stepK += dt * 6; e.fr = Math.floor(e.stepK) % 2 ? 'w1' : 'w0'; } else e.fr = 'w0';
  },

  // ---------------------------------------------------------------- lugger ----
  // A brute that hauls the arena's drums: it walks to the nearest one, lifts it overhead and throws it at you from
  // 220 px (it blows on impact). Shoot the drum it carries and it goes off in its hands. No drums: it throws scrap.
  updateLugger(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.LUGGER, b = e.body, onG = b.blocked.down || b.touching.down, pb = this.player.body;
    if (alive && !e.aggro && (e.sees || dist < 220) && dist < e.def.sight) this.alertEnemy(e, now);
    if (e.ai === 'alert' || e.ai === 'patrol') e.ai = 'seek';
    if (e.carry) {                                                         // shot while carrying: the drum goes up overhead
      for (const bl of this.bulletList) if (bl.active && Math.abs(bl.x - e.x) < 8 && Math.abs(bl.y - (b.top - 8)) < 7) {
        bl.disableBody(true, true); e.carry = false; if (e.carryImg) { e.carryImg.destroy(); e.carryImg = null; }
        BUS.emit('callout', 'BUTTERFINGERS'); this.addStyle(50); this.explode(e.x, b.top - 8, TUNE.BARREL); return;
      }
    }
    if (e.ai === 'throw') { b.velocity.x = 0; e.fr = 'throw'; if (now >= e.aiUntil) { e.ai = 'seek'; } return; }
    if (e.stunT > 0) return;
    e.rockCd -= dt;
    let tx = null;
    if (!e.carry && e.aggro) {
      if (e.tgtBarrel && e.tgtBarrel.active && now - (e.tgtSince || now) > 4500) { e.skipB = e.tgtBarrel; e.tgtBarrel = null; }   // can't get at it: give it up
      if (!e.tgtBarrel || !e.tgtBarrel.active) { e.tgtBarrel = null; let bd = T.reach; for (const k of this.barrelList) { if (!k.active || k.burning || k === e.skipB || Math.abs(k.y - e.y) > 50) continue; const d = Math.abs(k.x - e.x); if (d < bd) { bd = d; e.tgtBarrel = k; } } if (e.tgtBarrel) e.tgtSince = now; }
      if (e.tgtBarrel) {
        tx = e.tgtBarrel.x;
        if (Math.abs(tx - e.x) < 10 && Math.abs(e.tgtBarrel.y - e.y) < 30) {   // pick it up
          e.tgtBarrel.disableBody(true, true); e.tgtBarrel = null; e.carry = true; e.carryImg = this.add.image(e.x, b.top - 8, 'barrel').setDepth(6); Sfx.clunk(0.8);
        }
      } else if (alive && e.rockCd <= 0 && dist < 260) { e.rockCd = 3; e.ai = 'throw'; e.aiUntil = now + 400; this.golemThrow(e); return; }
    }
    if (e.carry && alive && dist < T.throwAt && e.sees) {                  // hurl it
      e.carry = false; if (e.carryImg) { e.carryImg.destroy(); e.carryImg = null; }
      const sx = e.x, sy = b.top - 8, G = this.physics.world.gravity.y, ddx = pb.center.x - sx, ddy = pb.bottom - 6 - sy, FT = clamp(Math.hypot(ddx, ddy) / 230, 0.5, 1.1);
      const p = this.spawnEProj('drum', sx, sy, ddx / FT, (ddy - 0.5 * G * FT * FT) / FT); if (p) p.life = FT + 1;
      e.ai = 'throw'; e.aiUntil = now + 450; Sfx.whoosh(); return;
    }
    if (tx === null && e.aggro && alive && !(e.carry && dist < 120) && this.walkerNav(e, dt, now, onG, T.speed)) {   // on another level: by the nav graph (#204)
      e.stepK += dt * 5; e.fr = e.carry ? 'carry' : Math.abs(b.velocity.x) > 5 ? (Math.floor(e.stepK) % 2 ? 'w1' : 'w0') : 'w0';
      return;
    }
    if (tx === null && e.aggro && alive) tx = pb.center.x;
    let want = tx === null ? 0 : Math.sign(tx - e.x);
    if (want && Math.abs(tx - e.x) < 6) want = 0;
    if (e.carry && dist < 120) want = -Math.sign(dx);                      // too close to throw: back off
    b.velocity.x = want * T.speed; if (want) e.dir = want;
    if (want && onG && (b.blocked.left || b.blocked.right)) b.velocity.y = -260;
    e.stepK += dt * 5; e.fr = e.carry ? 'carry' : Math.abs(b.velocity.x) > 5 ? (Math.floor(e.stepK) % 2 ? 'w1' : 'w0') : 'w0';
  },

  // ---------------------------------------------------------------- blimp ----
  // A bomber airship cruising 120 px over you (70 once it's the last foe, so it can always be reached) at 40 px/s,
  // swapping sides; it drops a bomb whenever you're roughly below it. Brought down, it falls burning and blows where it lands.
  updateBlimp(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.BLIMP, b = e.body, pb = this.player.body;
    e.fr = Math.floor(now / 80) % 2 ? 'b1' : 'b0'; e.aggro = true;
    if (e.crash) return;
    let ty = clamp(pb.center.y - (this.enemiesLeft <= 1 ? 70 : 120), 50, LH - 80);   // it keeps a height over you (lower when it's the last one) so it can be shot
    for (let yy = ty; yy > 40; yy -= 8) if (!this.solidAt(e.x, yy) && !this.solidAt(e.x, yy + 8)) { ty = yy; break; }   // in open air, not inside a block
    const tx = clamp(pb.center.x + e.side * 90, 50, LW - 50);
    if (Math.abs(tx - e.x) < 16) e.side *= -1;
    b.velocity.x += (clamp((tx - e.x), -1, 1) * T.speed - b.velocity.x) * Math.min(1, dt * 1.5); b.velocity.y += ((ty - e.y) * 1.2 - b.velocity.y) * Math.min(1, dt * 2);
    e.dir = b.velocity.x >= 0 ? 1 : -1;
    if ((e.bombT -= dt) <= 0 && alive && Math.abs(dx) < 60 && dy > 0) { e.bombT = T.bombCd; this.spawnEProj('bomb', e.x, b.bottom + 2, b.velocity.x * 0.5, 40); Sfx.whistle(); }
  },

  // ---------------------------------------------------------------- strider ----
  // A long-legged walker. Every ~4 s it plants, aims a red sight at you for 0.8 s, then sweeps a laser across +/-0.5 rad
  // over 1.2 s at its head height (12 a touch, 4 a second at most). Duck under it, jump it or dash through.
  updateStrider(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.STRIDER, b = e.body, pb = this.player.body, ex = e.x + e.dir * 4, ey = b.top + 5;
    if (alive && !e.aggro && (e.sees || dist < 240) && dist < e.def.sight) this.alertEnemy(e, now);
    if (e.ai === 'alert' || e.ai === 'patrol') e.ai = 'walk';
    e.cd -= dt;
    if (e.ai === 'tell') {
      b.velocity.x = 0; e.fr = 'fire'; e.a0 = Math.atan2(pb.center.y - ey, pb.center.x - ex); e.beamA = e.a0; e.dir = Math.cos(e.a0) >= 0 ? 1 : -1;
      if (now >= e.aiUntil) { e.ai = 'sweep'; e.aiUntil = now + T.sweep * 1000; e.sweepDir = Math.random() < 0.5 ? -1 : 1; Sfx.laser(); }
      return;
    }
    if (e.ai === 'sweep') {
      b.velocity.x = 0; e.fr = 'fire';
      const k = 1 - (e.aiUntil - now) / (T.sweep * 1000); e.beamA = e.a0 + e.sweepDir * T.arc * (k * 2 - 1);
      const ca = Math.cos(e.beamA), sa = Math.sin(e.beamA); let lx = ex, ly = ey;
      for (let i = 0; i < 120 && !this.solidAt(lx + ca * 4, ly + sa * 4); i++) { lx += ca * 4; ly += sa * 4; }
      if (this.state !== 'dead' && now > e.hitT && this.segDist(pb.center.x, pb.center.y, ex, ey, lx, ly)[0] < 7) { e.hitT = now + 250; this.hurtPlayer(T.dmg, ex, { knock: false, srcY: ey }); }
      for (const o of this.enemies.getChildren()) if (o.alive && o !== e && !o.under && (o.laserT || 0) < now && this.segDist(o.body.center.x, o.body.center.y, ex, ey, lx, ly)[0] < 6) { o.laserT = now + 300; this.damageEnemy(o, 8, ca, sa, 'arc'); }
      if (now >= e.aiUntil) { e.ai = 'walk'; e.cd = T.cd * rand(0.85, 1.15); }
      return;
    }
    if (e.stunT > 0) return;
    let routed = false;
    if (e.aggro && alive) {
      e.dir = dx >= 0 ? 1 : -1; const ax = Math.abs(dx);
      routed = this.standoff(e, dt, now, b.blocked.down || b.touching.down, T.speed);   // out of sight: round by the nav graph to a spot that sees you
      if (!routed) b.velocity.x = ax > 200 ? e.dir * T.speed : ax < 90 ? -e.dir * T.speed : 0;
      if (e.cd <= 0 && !e.navAir && dist < 380 && this.los(ex, ey, pb.center.x, pb.center.y)) { e.ai = 'tell'; e.aiUntil = now + T.tellMs; Sfx.charge(0.5); return; }   // it sees from its eye, up high
    } else { b.velocity.x = e.dir * T.speed * 0.6; if (b.blocked.left || b.blocked.right) e.dir *= -1; }
    if (!routed && b.velocity.x && !this.standAt(b.center.x + Math.sign(b.velocity.x) * 10, b.bottom + 4)) b.velocity.x = 0;
    if (Math.abs(b.velocity.x) > 3) { e.stepK += dt * 3; e.fr = Math.floor(e.stepK) % 2 ? 'w1' : 'w0'; if (Math.floor(e.stepK) !== e.lastStep) { e.lastStep = Math.floor(e.stepK); if (dist < 300) Sfx.clunk(0.4); } } else e.fr = 'w0';
  },

  // ---------------------------------------------------------------- spikeball ----
  // A spiked iron ball that rolls its platform end to end (90 px/s), turning at walls and edges; contact hurts (14).
  // Hurt it and it gets angry: 150 px/s and it chases you along the floor. Immune to knockback.
  updateSpikeball(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.SPIKEBALL, b = e.body, onG = b.blocked.down || b.touching.down;
    if (!e.rage && e.hp < e.def.hp) { e.rage = true; Sfx.clang(0.6); }
    if (e.stunT > 0 && !onG) return;
    if (e.rage && alive && Math.abs(dy) < 30) e.dir = dx >= 0 ? 1 : -1;
    if (b.blocked.left) e.dir = 1; else if (b.blocked.right) e.dir = -1;
    if (onG && !this.standAt(b.center.x + e.dir * 9, b.bottom + 3)) e.dir *= -1;
    const v = e.rage ? T.rage : T.speed;
    b.velocity.x = e.dir * v; e.spinA += e.dir * v / 7 * dt;
    e.fr = Math.floor(now / 80) % 2 ? 'k1' : 'k0';
    if (Math.random() < dt * 4 && onG) this.fxSparks(b.center.x - e.dir * 6, b.bottom, 1, -Math.PI / 2 - e.dir * 0.6, 0.8, [30, 90]);
  },

  // ---------------------------------------------------------------- paratrooper ----
  // Drops in from high above under a chute (50 px/s), firing 3-round bursts on the way down. Shoot the canopy and
  // it plummets and splats. Landed, it walks at you and keeps firing bursts.
  updatePara(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.PARA, b = e.body, pb = this.player.body;
    e.aggro = true; e.dir = dx >= 0 ? 1 : -1;
    e.burstT -= dt;
    if (e.shots > 0 && (e.shotT -= dt) <= 0 && alive) { e.shots--; e.shotT = e.shots ? 0.12 : 0; const a = this.aimLead(e.x, e.y - 2, T.speed) + rand(-0.06, 0.06); this.spawnEBullet(e.x + Math.cos(a) * 8, e.y - 2 + Math.sin(a) * 8, a, T.speed, T.dmg); Sfx.eshot(); }
    if (e.burstT <= 0 && alive && e.shots === 0 && (e.sees || e.ai === 'drop')) { e.burstT = T.burstCd * rand(0.85, 1.2); e.shots = 3; e.shotT = 0; }
    if (e.ai === 'drop') {
      e.fr = 'drop';
      if (e.chute) {
        b.velocity.y = T.fall; b.velocity.x = Math.sin(e.t * 1.3) * 12;
        for (const bl of this.bulletList) if (bl.active && Math.abs(bl.x - e.x) < 13 && bl.y > b.top - 26 && bl.y < b.top - 14) {   // the canopy got shot
          bl.disableBody(true, true); e.chute = false; b.setAllowGravity(true); BUS.emit('callout', 'CHUTE CUT'); Sfx.tink(1); this.addStyle(30);
          this.fx.emit(e.x, b.top - 20, { n: 10, speed: [30, 100], life: [0.4, 0.8], size: [2, 1], cols: [0xd8d0b8, 0x6a7a40] }); break;
        }
      }
      if (b.blocked.down || b.touching.down) {
        if (!e.chute && e.alive) { this.paintSplatAround(b.center.x, b.bottom - 2, 10); this.damageEnemy(e, 999, 0, 1, 'crush'); return; }   // no chute: splat
        e.ai = 'walk'; b.setAllowGravity(true); this.fxDust(b.center.x, b.bottom, 5);
      }
      return;
    }
    if (e.ai === 'alert' || e.ai === 'patrol') e.ai = 'walk';
    if (e.stunT > 0) return;
    const firing = e.shots > 0;
    b.velocity.x = firing || Math.abs(dx) < 70 ? 0 : e.dir * T.walk;
    if ((b.blocked.left || b.blocked.right) && (b.blocked.down || b.touching.down)) b.velocity.y = -240;
    e.stepK += dt * 6; e.fr = Math.abs(b.velocity.x) > 5 ? (Math.floor(e.stepK) % 2 ? 'w1' : 'w0') : 'w0';
  },

  // ---------------------------------------------------------------- beacon ----
  // A hovering pylon. When it spots you it calls for 3 s (red beam climbing, lamp blinking faster); if it finishes, two
  // reinforcements warp in beside it (they don't count toward the wave). Then 8 s to recharge.
  updateBeacon(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.BEACON, b = e.body;
    if (alive && !e.aggro && (e.sees || dist < 220) && dist < e.def.sight) { e.aggro = true; this.popAlert(e); }
    b.velocity.x += ((e.homeX - e.x) * 1.5 - b.velocity.x) * Math.min(1, dt * 3); b.velocity.y += ((e.homeY + Math.sin(e.t * 2) * 4 - e.y) * 1.5 - b.velocity.y) * Math.min(1, dt * 3);
    e.fr = e.ai === 'call' && Math.floor(now / 120) % 2 ? 'b1' : 'b0';
    if (e.ai === 'call') {
      if (now >= e.aiUntil) { e.ai = 'hover'; e.cd = T.cd; this.beaconCall(e); }
      return;
    }
    if (e.aggro && alive && (e.cd -= dt) <= 0 && (e.sees || dist < 260)) {   // it radios in what it knows; no clean line needed
      e.ai = 'call'; e.aiUntil = now + T.callMs; Sfx.alarm();
      if (!this.beaconWarned) { this.beaconWarned = true; BUS.emit('callout', 'BEACON CALLING!'); }
    }
  },

  // ---------------------------------------------------------------- slug + acid ----
  // A slow acid grub. It leaves a trail of acid pools (3 s each) and spits a glob every ~3 s. Acid hurts (3 per
  // 0.4 s) and corrodes you for 4 s: you take +25% from everything.
  updateSlug(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.SLUG, b = e.body, onG = b.blocked.down || b.touching.down;
    if (alive && !e.aggro && (e.sees || dist < 180) && dist < e.def.sight) this.alertEnemy(e, now);
    if (e.ai === 'alert' || e.ai === 'patrol') e.ai = 'crawl';
    e.spitCd -= dt;
    if (onG && (e.trailT -= dt) <= 0) {
      e.trailT = T.trail;
      const tx = b.center.x - e.dir * 4, fy = this.floorBelow(tx, b.bottom - 4, 12);
      if (fy !== null) { const [px, pw] = this.spanOn(tx, fy, 14); this.acids.push({ x: px, y: fy, w: pw, t: T.pool }); }
      if (this.acids.length > 60) this.acids.shift();
    }
    if (e.ai === 'spit') { b.velocity.x = 0; e.fr = 'spit'; if (now >= e.aiUntil) { this.slugSpit(e); e.ai = 'crawl'; e.spitCd = T.spitCd * rand(0.8, 1.2); } return; }
    if (e.stunT > 0) return;
    if (e.aggro && alive) {
      e.dir = dx >= 0 ? 1 : -1; b.velocity.x = e.dir * T.speed;
      if (onG && (b.blocked.left || b.blocked.right)) b.velocity.y = -210;   // humps up over a step
      if (e.spitCd <= 0 && dist < 220 && e.sees) { e.ai = 'spit'; e.aiUntil = now + 350; Sfx.squelch(); return; }
    } else { b.velocity.x = e.dir * T.speed * 0.6; if (b.blocked.left || b.blocked.right) e.dir *= -1; }
    e.stepK += dt * 3; e.fr = Math.floor(e.stepK) % 2 ? 's1' : 's0';
  },

  // ---------------------------------------------------------------- leech ----
  // Homes in and latches onto you: drains 3 HP/s and drags your run speed to 80%. Dash or kick to shake them all off
  // (stunned for a second, easy pickings). Up to as many as reach you.
  updateLeech(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.LEECH, b = e.body, pb = this.player.body;
    e.fr = Math.floor(now / 120) % 2 ? 'l1' : 'l0';
    if (alive && !e.aggro && dist < e.def.sight) e.aggro = true;
    if (e.ai === 'latched') {
      if (!alive) { e.ai = 'seek'; this.leechN = Math.max(0, (this.leechN || 0) - 1); return; }
      b.reset(pb.center.x + e.ox, pb.center.y + e.oy); e.dir = e.ox >= 0 ? -1 : 1;
      if ((e.drainT -= dt) <= 0) { e.drainT = 1 / T.drain; this.hurtPlayer(1, e.x, { knock: false, iframes: false, burn: true, srcY: e.y }); if (Math.random() < 0.3) Sfx.suck(); }
      return;
    }
    if (e.ai === 'off') { b.velocity.x *= Math.pow(0.1, dt); b.velocity.y *= Math.pow(0.1, dt); if ((e.offT -= dt) <= 0) e.ai = 'seek'; return; }
    if (e.stunT > 0 || !e.aggro || !alive) { b.velocity.x *= Math.pow(0.1, dt); b.velocity.y *= Math.pow(0.1, dt); return; }
    const l = dist || 1, k = Math.min(1, dt * 3);
    b.velocity.x += (dx / l * T.speed - b.velocity.x) * k; b.velocity.y += (dy / l * T.speed + Math.sin(e.t * 6) * 30 - b.velocity.y) * k; e.dir = dx >= 0 ? 1 : -1;
    if (dist < 10) this.latchLeech(e);
  },

  // ---------------------------------------------------------------- echo ----
  // A hologram that walks your path 1.5 s behind you, wearing your frames. Whenever you were shooting back then, it
  // shoots at you now (8 a bolt). Kill it and it scatters into light.
  updateEcho(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.ECHO, H = this.hist, tt = now - T.lag * 1000;
    e.fireCd -= dt; e.aggro = true;
    let smp = null; for (let i = H.length - 1; i >= 0; i--) if (H[i].t <= tt) { smp = H[i]; break; }
    if (!smp) return;
    e.body.reset(smp.x, smp.y); e.fr = smp.fr; e.dir = smp.face;
    if (smp.fire && alive && e.fireCd <= 0) {
      e.fireCd = T.fireCd; const a = Math.atan2(this.player.body.center.y - (e.y - 2), this.player.body.center.x - e.x);
      this.spawnEBullet(e.x + Math.cos(a) * 8, e.y - 2 + Math.sin(a) * 8, a, T.speed, T.dmg); Sfx.eshot();
    }
  },

  // ---------------------------------------------------------------- pilferer ----
  // A thief drone: it zips at you and snatches the gun in your hands (you drop to the next one, and that slot locks),
  // then flees. Kill it to get the gun back; if it escapes, the gun comes back when the wave ends.
  updatePilferer(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.PILFER, b = e.body, pb = this.player.body;
    e.fr = Math.floor(now / 60) % 2 ? 'p1' : 'p0';
    if (alive && !e.aggro && dist < e.def.sight) { e.aggro = true; this.popAlert(e); }
    if (e.stunT > 0) { b.velocity.x *= Math.pow(0.1, dt); b.velocity.y *= Math.pow(0.1, dt); return; }
    if (e.ai === 'seek') {
      const l = dist || 1, k = Math.min(1, dt * 4);
      b.velocity.x += (dx / l * T.speed - b.velocity.x) * k; b.velocity.y += (dy / l * T.speed + Math.sin(e.t * 8) * 40 - b.velocity.y) * k;
      e.dir = dx >= 0 ? 1 : -1;
      if (alive && dist < 12) this.pilfer(e);
      return;
    }
    const fx = pb.center.x < LW / 2 ? LW - 60 : 60, fy = 70 + Math.sin(e.t * 2) * 20, l = Math.hypot(fx - e.x, fy - e.y) || 1, k = Math.min(1, dt * 3);   // flee to the far top corner
    b.velocity.x += ((fx - e.x) / l * T.flee - b.velocity.x) * k; b.velocity.y += ((fy - e.y) / l * T.flee - b.velocity.y) * k; e.dir = b.velocity.x >= 0 ? 1 : -1;
  },

  // ---------------------------------------------------------------- pogo ----
  // A spring bot that never stops bouncing: big arcs that land near you, and once it's over your head it slams
  // straight down (16 + a knock, shockwaves both ways).
  updatePogo(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.POGO, b = e.body, onG = b.blocked.down || b.touching.down, pb = this.player.body;
    if (alive && !e.aggro && (e.sees || dist < 200) && dist < e.def.sight) this.alertEnemy(e, now);
    if (e.ai === 'alert' || e.ai === 'patrol' || e.ai === 'walk') e.ai = onG ? 'crouch' : 'air';
    if (e.ai === 'crouch') {
      b.velocity.x *= Math.pow(0.001, dt); e.fr = 'c';
      if (onG && (e.crouchT -= dt) <= 0 && e.stunT <= 0) {
        const tx = e.aggro && alive ? pb.center.x + rand(-30, 30) : e.x + rand(-80, 80);
        b.velocity.y = -rand(T.jump[0], T.jump[1]); b.velocity.x = clamp((tx - e.x) / 0.9, -220, 220); e.ai = 'air'; e.slamming = false; Sfx.boing();
      }
      return;
    }
    e.fr = e.slamming ? 'slam' : 'up'; e.dir = b.velocity.x >= 0 ? 1 : -1;
    if (!e.slamming && e.aggro && alive && Math.abs(pb.center.x - e.x) < 20 && pb.center.y - e.y > 30 && b.velocity.y > -150) { e.slamming = true; b.velocity.x = 0; b.velocity.y = T.slam; }   // over your head: down it comes
    if (onG && b.velocity.y >= 0) {
      e.ai = 'crouch'; e.crouchT = T.crouch;
      if (e.slamming) {
        e.slamming = false; this.shake(160, 0.008); Sfx.stomp(); this.fxDust(e.x, b.bottom, 10);
        for (const d of [-1, 1]) this.shockwaves.push({ x: e.x + d * 8, y: b.bottom, dir: d, t: 0.6, hit: false });
        if (this.state !== 'dead' && Math.abs(pb.center.x - e.x) < 22 && Math.abs(pb.bottom - b.bottom) < 22 && this.hurtPlayer(T.dmg, e.x)) BUS.emit('callout', 'POGOED');
      } else this.fxDust(e.x, b.bottom, 3);
    }
  },

  // ---------------------------------------------------------------- claw ----
  // A crane claw on a trolley under the roof. It tracks you; when the drop below is clear it plunges (420 px/s), and if
  // it closes on you it hauls you up for 0.8 s (8 dmg) and flings you. Kick, dash or do 30 to it to break free.
  updateClaw(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.CLAW, b = e.body, pb = this.player.body;
    if (alive && !e.aggro && dist < e.def.sight) { e.aggro = true; e.aggroT = 6; this.popAlert(e); }
    e.cd -= dt;
    if (e.ai === 'track') {
      b.velocity.y = (e.homeY - e.y) * 6; e.fr = 'open';
      const want = e.aggro && alive ? clamp(pb.center.x - e.x, -1, 1) * Math.min(1, Math.abs(pb.center.x - e.x) / 20) : 0;
      b.velocity.x = want * T.track; e.dir = 1;
      if (e.aggro && alive && e.cd <= 0 && Math.abs(pb.center.x - e.x) < 12 && pb.center.y > e.y && this.los(e.x, e.homeY, e.x, pb.center.y)) { e.ai = 'drop'; Sfx.clank(); }
      return;
    }
    if (e.ai === 'drop') {
      b.velocity.x = 0; b.velocity.y = T.drop; e.fr = 'open';
      if (alive && !e.grab && pb.right > b.left && pb.left < b.right && pb.top < b.bottom + 2 && pb.bottom > b.top) {   // got you
        e.grab = true; e.grabDmg = 0; e.ai = 'lift'; e.liftT = T.liftT; this.clawBy = e; e.fr = 'closed';
        this.hurtPlayer(T.dmg, e.x, { knock: false }); Sfx.clank(); BUS.emit('callout', 'GRABBED!'); this.shake(120, 0.006);
        return;
      }
      if (this.solidAt(e.x, b.bottom + 3) || e.y > LH - 40 || e.y - e.homeY > 420) { e.ai = 'rise'; Sfx.clang(0.5); this.fxDust(e.x, b.bottom, 3); }
      return;
    }
    if (e.ai === 'lift') {
      b.velocity.x = 0; b.velocity.y = -T.lift; e.fr = 'closed'; e.liftT -= dt;
      if (this.clawBy === e && this.state !== 'dead') { this.player.x = e.x; this.player.y = b.bottom + pb.halfHeight - 2; pb.velocity.set(0, 0); }
      if (e.liftT <= 0 || e.y <= e.homeY + 4) this.clawRelease(e, false);
      return;
    }
    b.velocity.x = 0; b.velocity.y = -T.lift * 1.5; e.fr = 'open';       // rise back to the trolley
    if (e.y <= e.homeY + 2) { e.ai = 'track'; e.cd = T.cd * rand(0.8, 1.2); }
  },

  // ---------------------------------------------------------------- sparker ----
  // Little hopping capacitors. Any two within 110 px with a clear line link up with a live arc: crossing one costs
  // you 10 (twice a second at most). Alone, a sparker just hops at you and nips.
  updateSparker(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.SPARKER, b = e.body, onG = b.blocked.down || b.touching.down;
    if (alive && !e.aggro && (e.sees || dist < 180) && dist < e.def.sight) this.alertEnemy(e, now);
    if (e.ai === 'alert' || e.ai === 'patrol') e.ai = 'hop';
    e.fr = onG ? 's0' : 's1';
    if (onG) { b.velocity.x *= Math.pow(0.02, dt); if ((e.hopT -= dt) <= 0 && e.stunT <= 0) { e.hopT = rand(0.5, 1.1); const d = e.aggro && alive ? Math.sign(dx) || 1 : (Math.random() < 0.5 ? -1 : 1); e.dir = d; b.velocity.x = d * rand(80, 140); b.velocity.y = -T.hop * rand(0.7, 1); } }
  },

  // ---------------------------------------------------------------- scrap golem ----
  // A 260 HP heap of junk with a furnace heart. Every 3 s at range it lobs a scrap chunk (radius 26, 14); up close it
  // slams the floor (shockwaves both ways). It sheds plates as it's hurt, and dies in a scrap blast that throws
  // shrapnel through its own side.
  updateGolem(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.GOLEM, b = e.body, onG = b.blocked.down || b.touching.down;
    if (alive && !e.aggro && (e.sees || dist < 200) && dist < e.def.sight) { this.alertEnemy(e, now); Sfx.golem(); }
    if (e.ai === 'alert' || e.ai === 'patrol') e.ai = 'walk';
    e.throwCd -= dt; e.slamCd -= dt;
    const shed = Math.floor((1 - e.hp / e.def.hp) * 4);                  // plates come off at 25 / 50 / 75%
    if (shed > e.shed) { e.shed = shed; for (let i = 0; i < 3; i++) this.spawnGib('g_plate', e.x + rand(-8, 8), e.y - 6, rand(-140, 140), rand(-260, -140), 'metal'); this.fxSparks(e.x, e.y - 4, 10); Sfx.clang(0.7); }
    if (e.ai === 'throw') { b.velocity.x = 0; e.fr = 'throw'; if (now >= e.aiUntil) { this.golemThrow(e); e.ai = 'walk'; e.throwCd = T.throwCd * rand(0.85, 1.15); } return; }
    if (e.ai === 'slam') {
      b.velocity.x = 0; e.fr = 'slam';
      if (now >= e.aiUntil && !e.slammed) {
        e.slammed = true; this.shake(260, 0.012); Sfx.stomp(); this.fxDust(b.center.x, b.bottom, 14); this.blastTiles(b.center.x, b.bottom + 4, 30, 50);
        for (const d of [-1, 1]) this.shockwaves.push({ x: b.center.x + d * (b.halfWidth + 2), y: b.bottom, dir: d, t: 1.2, hit: false });
        const pb = this.player.body; if (this.state !== 'dead' && Math.abs(pb.center.x - b.center.x) < b.halfWidth + 10 && Math.abs(pb.bottom - b.bottom) < 20) this.hurtPlayer(20, b.center.x);
      }
      if (now >= e.aiUntil + 400) { e.ai = 'walk'; e.slamCd = T.slamCd; }
      return;
    }
    if (e.stunT > 0) return;
    if (e.aggro && alive) {
      e.dir = dx >= 0 ? 1 : -1;
      if (onG && e.slamCd <= 0 && Math.abs(dx) < 44 && Math.abs(dy) < 30) { e.ai = 'slam'; e.aiUntil = now + 500; e.slammed = false; Sfx.golem(); return; }
      if (onG && e.throwCd <= 0 && dist > 90 && dist < 320) { e.ai = 'throw'; e.aiUntil = now + 450; return; }   // a lob: cover doesn't stop it
      b.velocity.x = Math.abs(dx) > 30 ? e.dir * T.speed : 0;
      if (onG && (b.blocked.left || b.blocked.right)) b.velocity.y = -260;
    } else { b.velocity.x = e.dir * T.speed * 0.5; if (b.blocked.left || b.blocked.right) e.dir *= -1; }
    if (Math.abs(b.velocity.x) > 5) { e.stepK += dt * 4; e.fr = Math.floor(e.stepK) % 2 ? 'g1' : 'g0'; if (Math.floor(e.stepK) !== e.lastStep) { e.lastStep = Math.floor(e.stepK); if (dist < 320) { Sfx.stomp(); this.shake(60, 0.002); } } } else e.fr = 'g0';
  },

  // ---------------------------------------------------------------- creeper ----
  // Ceiling spider: climbs to the nearest ceiling, scuttles along it after you and drops when you pass under (14 on
  // landing). On the floor it chases for 4 s, then leaps back up if there's a ceiling within reach.
  updateCreeper(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.CREEPER, b = e.body, pb = this.player.body;
    if (alive && !e.aggro && (e.sees || dist < 200) && dist < e.def.sight) { e.aggro = true; e.aggroT = 5; this.popAlert(e); }
    if (e.aggro && e.sees) e.aggroT = Math.max(e.aggroT, 4);
    e.stepK += dt * 10; const step = Math.floor(e.stepK) % 2 ? 'c1' : 'c0';
    if (e.ai === 'climb') {                                               // going up until something's overhead
      b.setAllowGravity(false); b.velocity.y = -300; b.velocity.x *= 0.9; e.fr = 'drop';
      if (b.blocked.up || b.touching.up) { e.ai = 'ceil'; Sfx.skitter(); }
      else if ((e.climbT -= dt) <= 0) { e.ai = 'ground'; e.groundT = 0; b.setAllowGravity(true); }
      return;
    }
    if (e.ai === 'ceil') {
      b.setAllowGravity(false); b.velocity.y = -40; e.fr = step;
      let want = e.aggro && alive ? Math.sign(dx) : e.dir;
      if (!this.solidAt(b.center.x + want * 10, b.top - 3)) { want = e.aggro ? 0 : -want; }   // the ceiling ends: stop (or turn)
      if (e.aggro && alive && !want && Math.abs(dx) > 40) { if ((e.ceilWaitT = (e.ceilWaitT || 0) + dt) > 4) { e.ceilWaitT = 0; e.ai = 'drop'; e.hitP = false; b.setAllowGravity(true); b.velocity.set(0, 60); return; } } else e.ceilWaitT = 0;   // stuck at the edge with you out of reach: drop and give chase
      if (want) e.dir = want;
      b.velocity.x = want * T.speed;
      if (want && Math.random() < dt * 3 && dist < 260) Sfx.skitter();
      if (!(b.blocked.up || b.touching.up) && !this.solidAt(b.center.x, b.top - 3)) { e.ai = 'ground'; e.groundT = 0; b.setAllowGravity(true); }   // its ceiling was blown away
      if (e.aggro && alive && Math.abs(dx) < 14 && dy > 20 && e.stunT <= 0 && this.los(b.center.x, b.bottom + 2, pb.center.x, pb.center.y)) {
        e.ai = 'drop'; e.hitP = false; b.setAllowGravity(true); b.velocity.set(0, T.drop); Sfx.hiss();
      }
      return;
    }
    if (e.ai === 'drop') {
      e.fr = 'drop';
      if (b.blocked.down || b.touching.down) { e.ai = 'ground'; e.groundT = 0; this.fxDust(b.center.x, b.bottom, 4); Sfx.land(0.3); }
      return;
    }
    e.groundT += dt; e.fr = step;                                         // on the floor: a fast scuttling chase
    if (e.stunT > 0) return;
    if (e.aggro && alive) { e.dir = dx >= 0 ? 1 : -1; b.velocity.x = e.dir * T.ground; if (Math.abs(dx) < 30 && (b.blocked.down || b.touching.down) && Math.random() < dt * 2) { b.velocity.y = -180; e.hitP = false; } }
    else { b.velocity.x = e.dir * T.ground * 0.5; if (b.blocked.left || b.blocked.right) e.dir *= -1; }
    if (e.hitP && e.groundT > 1) e.hitP = false;
    if (e.groundT > T.climbAfter && (b.blocked.down || b.touching.down)) {   // back up to the ceiling if there's one within 130 px
      for (let yy = b.top - 4; yy > b.top - 130; yy -= 4) if (this.solidAt(b.center.x, yy)) { e.ai = 'climb'; e.climbT = 0.8; b.setAllowGravity(false); Sfx.skitter(); break; }
      e.groundT = 0;
    }
  },

  // ---------------------------------------------------------------- roller ----
  // An armoured grub. Unrolled it plods along and takes full damage; every ~2 s it curls up (0.4 s tell) and bowls
  // at you at 260 px/s, armour taking 75% of every hit, bouncing off walls twice (18 dmg + a launch). The last wall
  // it hits leaves it dizzy for 1.2 s (double damage).
  updateRoller(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.ROLLER, b = e.body, onG = b.blocked.down || b.touching.down;
    if (alive && !e.aggro && (e.sees || dist < 180) && dist < e.def.sight) this.alertEnemy(e, now);
    if (e.aggro && e.sees) e.aggroT = Math.max(e.aggroT, 5);
    if (e.ai === 'alert' || e.ai === 'patrol') e.ai = 'walk';
    if (e.ai === 'curl') {
      b.velocity.x = 0; e.fr = 'ball'; e.spinA += dt * 6 * e.rollDir;
      if (now >= e.aiUntil) { e.ai = 'roll'; e.rollT = T.rollT; e.bounces = 0; e.hitP = false; Sfx.roll(); }
      return;
    }
    if (e.ai === 'roll') {
      e.fr = 'ball'; e.rollT -= dt;
      b.velocity.x = e.rollDir * T.roll; e.spinA += e.rollDir * T.roll / 7 * dt;
      if (Math.random() < 0.5 && onG) this.fxDust(b.center.x - e.rollDir * 6, b.bottom, 1);
      if (Math.random() < dt * 3) Sfx.roll();
      if (b.blocked.left || b.blocked.right) {
        this.shake(120, 0.005); this.fxSparks(e.rollDir > 0 ? b.right : b.left, b.center.y, 6, e.rollDir > 0 ? Math.PI : 0, 1.2); Sfx.clang(0.6);
        const tx = Math.floor((e.rollDir > 0 ? b.right + 2 : b.left - 2) / TS), ty = Math.floor(b.center.y / TS), c = this.tileAt(tx, ty); if (c === 'x' || c === 'g') this.damageTile(tx, ty, 40);
        if (++e.bounces > T.bounces) { e.ai = 'dizzy'; e.aiUntil = now + T.dizzy * 1000; b.velocity.x = -e.rollDir * 60; b.velocity.y = -140; BUS.emit('callout', 'DIZZY'); return; }
        e.rollDir *= -1; e.hitP = false; b.velocity.y = -120;
      }
      for (const o of this.enemies.getChildren()) {                      // bowls through its own side too
        if (!o.alive || o === e || o.under || FLIERS.has(o.kind)) continue;
        const ob = o.body; if (ob.right < b.left || ob.left > b.right || ob.bottom < b.top || ob.top > b.bottom) continue;
        if ((o.rollHitT || 0) > now) continue; o.rollHitT = now + 500;
        this.damageEnemy(o, 20, e.rollDir, -0.5, 'crush'); if (o.alive) { ob.velocity.x = e.rollDir * 220 * o.def.kb; ob.velocity.y = -200 * o.def.kb; }
      }
      if (e.rollT <= 0) { e.ai = 'walk'; e.cd = rand(1.6, 2.4); e.spinA = 0; }
      return;
    }
    if (e.ai === 'dizzy') { b.velocity.x *= Math.pow(0.1, dt); e.fr = 'r0'; e.rotation = Math.sin(now / 90) * 0.3; if (now >= e.aiUntil) { e.ai = 'walk'; e.cd = rand(1.5, 2.2); } return; }
    e.cd -= dt;
    if (e.stunT > 0) return;
    if (e.aggro && alive) {
      if (!this.walkerNav(e, dt, now, onG, T.walk)) { e.dir = dx >= 0 ? 1 : -1; b.velocity.x = e.dir * T.walk; }   // on another level: up or down to you by the nav graph (#204)
      if (e.cd <= 0 && onG && !e.navAir && Math.abs(dy) < 40) { e.ai = 'curl'; e.aiUntil = now + T.curlMs; e.rollDir = e.dir; Sfx.creak(); }
    } else { b.velocity.x = e.dir * T.walk * 0.6; if (b.blocked.left || b.blocked.right) e.dir *= -1; }
    e.stepK += dt * 6; e.fr = Math.abs(b.velocity.x) > 5 ? (Math.floor(e.stepK) % 2 ? 'r1' : 'r0') : 'r0';
  },

  // ---------------------------------------------------------------- jammer ----
  // EMP drone hanging 140 px off your shoulder. Every ~5 s: a 0.8 s charge (rings), then a ring that spreads to 160 px;
  // if it reaches you your gun jams for 1.6 s (dash through it to dodge) and your sentry shorts out.
  updateJammer(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.JAMMER, b = e.body, pb = this.player.body;
    if (alive && !e.aggro && (e.sees || dist < 180) && dist < e.def.sight) this.alertEnemy(e, now);
    if (e.aggro && e.sees) e.aggroT = Math.max(e.aggroT, 5);
    if ((e.sideT -= dt) <= 0) { e.sideT = rand(3, 5); e.side *= -1; }
    let tx = e.homeX + Math.sin(e.t * 0.7) * 30, ty = e.homeY + Math.sin(e.t * 1.6) * 6;
    if (e.aggro && alive) { tx = clamp(pb.center.x + e.side * 140, 30, LW - 30); ty = pb.center.y - 60 + Math.sin(e.t * 1.9) * 10; }
    if (e.ai === 'tell') { tx = b.center.x; ty = b.center.y; }
    if (e.stunT <= 0) { const k = Math.min(1, dt * 2.5); b.velocity.x += (clamp((tx - b.center.x) * 2, -110, 110) - b.velocity.x) * k; b.velocity.y += (clamp((ty - b.center.y) * 2, -110, 110) - b.velocity.y) * k; }
    else { b.velocity.x *= Math.pow(0.1, dt); b.velocity.y *= Math.pow(0.1, dt); }
    e.dir = dx >= 0 ? 1 : -1;
    if (e.aggro && alive) {
      if (e.ai === 'tell') { if (now >= e.aiUntil) { e.ai = 'hover'; e.cd = T.cd * rand(0.85, 1.15); this.empRings.push({ x: b.center.x, y: b.center.y, r: 4, hitP: false }); Sfx.emp(); this.shake(80, 0.003); } }
      else if ((e.cd -= dt) <= 0 && dist < T.reach + 40 && e.sees) { e.ai = 'tell'; e.aiUntil = now + T.tellMs; Sfx.charge ? Sfx.charge() : Sfx.magTell(); }
    } else if (e.ai === 'tell') e.ai = 'hover';
    e.fr = e.ai === 'tell' && Math.floor(now / 70) % 2 ? 'jh' : 'j0';
  },

  // ---------------------------------------------------------------- gasbag + gas ----
  // A drifting sac that homes in on you; within 34 px it swells (0.6 s) and bursts. However it pops, it leaves a
  // toxic cloud (46 px, 6 s: 4 per 0.4 s to anyone inside, foes too). Fire or a blast lights the cloud: a fireball.
  updateGasbag(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.GASBAG, b = e.body;
    if (alive && !e.aggro && (e.sees || dist < 160) && dist < e.def.sight) this.alertEnemy(e, now);
    if (e.aggro && e.sees) e.aggroT = Math.max(e.aggroT, 5);
    if (e.ai === 'swell') {
      b.velocity.x *= Math.pow(0.05, dt); b.velocity.y *= Math.pow(0.05, dt); e.fr = 'swell';
      if (now >= e.aiUntil) { e.hp = 0; this.killEnemy(e, 0, 0, 'burst'); }
      return;
    }
    e.fr = Math.floor(e.t * 3 + e.ph) % 2 ? 'g1' : 'g0';
    let tx = e.homeX + Math.sin(e.t * 0.5 + e.ph) * 24, ty = e.homeY + Math.sin(e.t * 1.2 + e.ph) * 6;
    if (e.aggro && alive) { tx = this.player.body.center.x; ty = this.player.body.center.y - 6 + Math.sin(e.t * 2) * 8; }
    if (e.stunT <= 0) {
      const l = Math.hypot(tx - b.center.x, ty - b.center.y) || 1, k = Math.min(1, dt * 1.5);
      b.velocity.x += (clamp((tx - b.center.x) / l * T.speed, -T.speed, T.speed) - b.velocity.x) * k; b.velocity.y += (clamp((ty - b.center.y) / l * T.speed, -T.speed, T.speed) - b.velocity.y) * k;
    }
    e.dir = dx >= 0 ? 1 : -1;
    if (e.aggro && alive && dist < T.burstR) { e.ai = 'swell'; e.aiUntil = now + T.swellMs; Sfx.hiss(); }
  },

  // ---------------------------------------------------------------- welder + turret ----
  // Support bot: walks to the most damaged mech ally in 250 px and welds it back up (20 HP/s) from 90 px. With no
  // patient it builds a mini turret (1.2 s, up to 2 alive, every 12 s). Keeps out of your reach.
  updateWelder(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.WELDER, b = e.body;
    if (alive && !e.aggro && (e.sees || dist < 180) && dist < e.def.sight) this.alertEnemy(e, now);
    if (e.ai === 'alert' || e.ai === 'patrol') e.ai = 'walk';
    e.buildCd -= dt; e.turrets = e.turrets.filter(t => t.alive);
    if ((e.scanT -= dt) <= 0) {
      e.scanT = 0.5; e.patient = null; let worst = 0.98;
      for (const o of this.enemies.getChildren()) {
        if (!o.alive || o === e || !o.def.mech || o.under || o.def.boss || o.def.miniBoss) continue;   // Welders, Menders and Banners heal no boss (#177)
        const f = o.hp / o.def.hp, d = Math.hypot(o.body.center.x - e.x, o.body.center.y - e.y);
        if (f < worst && d < 250) { worst = f; e.patient = o; }
      }
    }
    const pt = e.patient && e.patient.alive ? e.patient : null;
    if (e.ai === 'build') {
      b.velocity.x = 0; e.fr = 'weld';
      if (Math.random() < 0.5) this.fxSparks(e.x + e.dir * 9, b.bottom - 3, 1, -Math.PI / 2, 1.6, [40, 120]);
      if (Math.random() < 0.2) Sfx.weld();
      if (now >= e.aiUntil) {
        const bx = this.solidAt(e.x + e.dir * 14, b.bottom - 6) || !this.standAt(e.x + e.dir * 14, b.bottom + 4) ? e.x : e.x + e.dir * 14;   // never inside a wall or off a ledge
        const t = this.spawnEnemy('turret', Math.floor(bx / TS), Math.floor((b.bottom - 2) / TS));
        Object.assign(t, { summoned: true, owner: e, aggro: true });
        e.turrets.push(t); e.ai = 'walk'; e.buildCd = T.buildCd; this.spawnLight(t.x, t.y, 'ring', 0xffd040, 0.2, 1, 0.8, 0.2); Sfx.clang(0.5);
      }
      return;
    }
    if (e.stunT > 0) return;
    let want = 0;
    if (pt) {
      const px = pt.body.center.x - e.x, d = Math.hypot(px, pt.body.center.y - e.y);
      e.dir = px >= 0 ? 1 : -1;
      if (d > T.range * 0.8) want = Math.sign(px);
      if (d < T.range) {                                                  // weld: heal it, sparks fly
        e.ai = 'weld'; pt.hp = Math.min(pt.def.hp, pt.hp + T.heal * dt); pt.healAcc = (pt.healAcc || 0) + T.heal * dt; if (!pt.healFlushAt) pt.healFlushAt = now + 500;
        if (Math.random() < 0.4) this.fxSparks(pt.body.center.x, pt.body.center.y, 1, 0, Math.PI * 2, [40, 120]);
        if (Math.random() < 0.15) Sfx.weld();
      } else e.ai = 'walk';
    } else {
      e.ai = 'walk';
      if (e.aggro && alive) {
        const ax = Math.abs(dx); e.dir = dx >= 0 ? 1 : -1;
        want = ax < 110 ? -Math.sign(dx) : ax > 220 ? Math.sign(dx) : 0;      // keeps out of reach
        if (e.buildCd <= 0 && e.turrets.length < T.maxTurrets && (b.blocked.down || b.touching.down) && ax > 70) { e.ai = 'build'; e.aiUntil = now + T.buildMs; b.velocity.x = 0; return; }
      }
    }
    if (want && !this.standAt(b.center.x + want * 10, b.bottom + 4)) want = 0;
    b.velocity.x = want * T.speed;
    if (want && (b.blocked.left || b.blocked.right) && (b.blocked.down || b.touching.down)) b.velocity.y = -240;   // hop small steps
    if (want) { e.stepK += dt * 8; e.fr = Math.floor(e.stepK) % 2 ? 'w1' : 'w0'; } else if (e.ai !== 'weld') e.fr = 'w0'; else e.fr = 'weld';
  },
  updateTurret(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.TURRET;
    e.body.velocity.x = 0;
    const want = this.aimLead(e.x, e.y - 2, T.speed);                    // tracks where you're going
    if (e.ai === 'aim') { if (now >= e.aiUntil) { this.spawnEBullet(e.x + Math.cos(e.aimA) * 8, e.y - 2 + Math.sin(e.aimA) * 8, e.aimA, T.speed, T.dmg); Sfx.eshot(); e.ai = 'watch'; e.fireCd = T.fireCd * rand(0.85, 1.15); } return; }
    if (alive && e.sees && dist < e.def.sight) {
      let d = want - e.aimA; d = Math.atan2(Math.sin(d), Math.cos(d)); e.aimA += clamp(d, -4 * dt, 4 * dt);
      if ((e.fireCd -= dt) <= 0 && Math.abs(d) < 0.15) { e.ai = 'aim'; e.aiUntil = now + T.tellMs; }
    }
  },

  // ---------------------------------------------------------------- duelist ----
  // A fencer that reads your aim: shoot at it and it sidesteps (75%, every 0.9 s) and comes straight back at you.
  // 0.3 s guard, then a lunge; if you're still in reach it chains up to two more quick cuts (12 each).
  thinkDuelist(e, dt, now, c) {
    const T = TUNE.DUELIST, b = e.body, p = this.player;
    e.attackCd -= dt; e.repathT -= dt;
    switch (e.ai) {
      case 'idle': this.lookAround(e, dt, 0.7); return 'hold';
      case 'dodge': if (c.onGround && now > e.aiUntil + 80) { e.ai = 'hunt'; e.repathT = 0; e.attackCd = Math.min(e.attackCd, 0.15); } return 'free';   // dodge, then straight back in
      case 'windup':
        e.dir = c.dx >= 0 ? 1 : -1;
        if (c.onGround && e.dodgeCd <= 0 && this.playerAimingAt(e)) {    // even on guard it slips your shots half the time
          e.dodgeCd = e.def.dodgeCd;
          if (Math.random() < 0.5) { this.humanoidDodge(e, now, -e.dir * 220, -150); e.slipUntil = now + 250; this.spawnLight(e.x, e.y, 'duelist', 0xff2a5a, 1, 1, 0.5, 0.2, e.fr, e.dir < 0); return 'free'; }
        }
        if (now >= e.aiUntil) { e.ai = 'lunge'; e.aiUntil = now; b.velocity.x = e.dir * T.lunge; b.velocity.y = -120; Sfx.slash(); }
        return 'hold';
      case 'lunge':
        if (c.onGround && now > e.aiUntil + 140) {
          if ((e.combo || 0) < 2 && c.alive && Math.abs(c.dx) < 46 && Math.abs(c.dy) < 24) { e.combo = (e.combo || 0) + 1; e.ai = 'windup'; e.aiUntil = now + T.comboMs; }   // chain the next cut
          else { e.combo = 0; e.ai = 'hunt'; e.attackCd = rand(0.6, 0.9); e.repathT = 0; }
        }
        return 'free';
      case 'recover':
        if (c.onGround && now > e.aiUntil + 120) { e.ai = 'hunt'; e.repathT = 0; }
        return 'free';
      case 'hunt': {
        if (!c.alive || now - e.lkT > 6000) { e.ai = 'idle'; e.aggro = false; e.path = null; return 'hold'; }
        if (c.onGround && e.dodgeCd <= 0 && c.dist < 260 && this.playerAimingAt(e)) {   // it reads your aim (a failed read retries fast)
          e.dodgeCd = 0.25;
          if (Math.random() < e.def.dodge) e.dodgeCd = e.def.dodgeCd;
          if (e.dodgeCd > 0.3) { this.humanoidDodge(e, now, (Math.random() < 0.5 ? -1 : 1) * 250, -150); e.slipUntil = now + 250; this.spawnLight(e.x, e.y, 'duelist', 0xff2a5a, 1, 1, 0.5, 0.2, e.fr, e.dir < 0); return 'free'; }
        }
        if (c.onGround && c.canSee && Math.abs(c.dx) < 70 && Math.abs(c.dy) < 26 && e.attackCd <= 0) { e.ai = 'windup'; e.aiUntil = now + T.windupMs; e.path = null; e.combo = 0; return 'hold'; }
        if (c.onGround && !e.navAir && e.repathT <= 0) {
          e.repathT = 0.35;
          const fresh = now - e.lastSeenT < 1200, pb = p.body;
          if (!this.pathTo(e, navBelow(fresh ? pb.center.x : e.lkx, fresh ? pb.bottom - 2 : e.lky), 160)) this.pathTo(e, navBelow(e.lkx, e.lky), 160);
        }
        return 'path';
      }
    }
    return 'hold';
  },
  updateMimic(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.MIMIC, b = e.body, onG = b.blocked.down || b.touching.down;
    if (e.ai === 'hide') {
      b.velocity.x = 0; e.fr = 'h'; e.dir = 1; e.aggro = false;
      if ((e.lonelyT -= dt) <= 0) {                                     // the last ones left give themselves up
        e.lonelyT = 0.5;
        if (e.t > 6 && !this.enemies.getChildren().some(o => o.alive && o.kind !== 'mimic' && !o.summoned)) this.mimicReveal(e, now);
      }
      if ((alive && dist < T.trigger && Math.abs(dy) < 30) || e.burnT > 0) this.mimicReveal(e, now);
      return;
    }
    e.leapCd -= dt;
    if (e.ai === 'reveal') { b.velocity.x = 0; e.fr = 'bite'; if (now >= e.aiUntil) e.ai = 'chase'; return; }
    if (e.stunT > 0 || e.panicT > 0) return;
    if (e.ai === 'leap') { e.fr = 'bite'; if (onG && b.velocity.y >= 0) e.ai = 'chase'; return; }
    e.dir = dx >= 0 ? 1 : -1;
    b.velocity.x = e.dir * T.speed;
    e.stepK += dt * 12; e.fr = Math.floor(e.stepK) % 2 ? 'o1' : 'o0';
    if (onG && (b.blocked.left || b.blocked.right)) b.velocity.y = -260;   // hops over what's in the way
    if (alive && onG && dist < 64 && Math.abs(dy) < 24 && e.leapCd <= 0) { e.ai = 'leap'; b.velocity.y = -200; b.velocity.x = e.dir * T.leap; e.leapCd = 1.4; Sfx.chomp(); }
  },

  // ---------------------------------------------------------------- howitzer ----
  // Slow artillery tripod that keeps 150-260 px off you. Every ~4.5 s it plants its legs (0.55 s) and lobs 3 shells at
  // where you're heading, each with a red ring on the ground for the 1.15 s it's in the air (radius 40, 18).
  updateHowitzer(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.HOWITZER, b = e.body, onG = b.blocked.down || b.touching.down;
    if (alive && !e.aggro && (e.sees || dist < 200) && dist < e.def.sight) this.alertEnemy(e, now);
    if (e.aggro && e.sees) e.aggroT = Math.max(e.aggroT, 5);
    e.cd -= dt;
    if (e.ai === 'walk' || e.ai === 'alert' || e.ai === 'patrol') {
      e.ai = 'walk';
      if (e.stunT > 0) return;
      let want = 0;
      if (e.aggro && alive) { const ax = Math.abs(dx); want = ax < 150 ? -Math.sign(dx) : ax > 260 ? Math.sign(dx) : 0; e.dir = dx >= 0 ? 1 : -1; }
      else { want = e.dir; if (b.blocked.left || b.blocked.right) { e.dir *= -1; want = e.dir; } }
      const hunt = e.aggro && alive && e.blindT > 3 && dy > 40 && dist > T.range;   // lost you below and out of lob range: go and look
      if (hunt && !want) want = e.dir;
      if (want && !(hunt && want === e.dir) && !this.stepOk(b.center.x + want * 12, b.bottom)) { want = 0; if (!e.aggro) e.dir *= -1; }   // won't walk off a big drop, unless it's hunting you
      b.velocity.x = want * T.speed;
      if (want && onG && (b.blocked.left || b.blocked.right)) b.velocity.y = -KEEPER_HOP;
      if (want) { e.stepK += dt * 6; e.fr = Math.floor(e.stepK) % 2 ? 'w1' : 'w0'; if (Math.floor(e.stepK) !== e.lastStep) { e.lastStep = Math.floor(e.stepK); if (dist < 300) Sfx.clunk(0.35); } }
      else e.fr = 'w0';
      if (e.aggro && alive && e.cd <= 0 && onG && dist < T.range) { e.ai = 'plant'; e.aiUntil = now + T.plantMs; b.velocity.x = 0; Sfx.creak(); this.fxDust(b.center.x, b.bottom, 4); }
    } else if (e.ai === 'plant') {
      b.velocity.x = 0; e.fr = 'plant';
      if (now >= e.aiUntil) { e.ai = 'fire'; e.shells = T.shells; e.shotT = 0; }
    } else if (e.ai === 'fire') {
      b.velocity.x = 0;
      if ((e.shotT -= dt) <= 0 && e.shells > 0) { e.shotT = T.gap; e.shells--; this.howitzerShell(e, T.shells - e.shells - 1); e.fr = 'fire'; e.recoilT = 0.12; }
      else if ((e.recoilT -= dt) <= 0) e.fr = 'plant';
      if (e.shells <= 0 && e.shotT <= 0) { e.ai = 'walk'; e.cd = T.cd * rand(0.85, 1.15); }
    }
  },
  updateBlinker(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.BLINKER, b = e.body, pb = this.player.body;
    if (alive && !e.aggro && (e.sees || dist < 160) && dist < e.def.sight) this.alertEnemy(e, now);
    if (e.aggro && e.sees) e.aggroT = Math.max(e.aggroT, 5);
    if (e.ai === 'out') {
      b.setVelocity(0, 0);
      if (Math.random() < 0.7) this.fx.emit(e.tx + rand(-6, 6), e.ty + rand(-8, 8), { n: 1, speed: [0, 20], life: [0.2, 0.4], size: [2, 1], cols: [0xffffff, 0xd0a0ff, 0x8040e0], add: true });
      if (now >= e.aiUntil) this.blinkIn(e);
      return;
    }
    if (e.ai === 'tell') {
      b.setVelocity(0, 0); e.fr = 'b0'; e.dir = dx >= 0 ? 1 : -1;
      if (now >= e.aiUntil) { const l = dist || 1; e.dvx = dx / l * T.dash; e.dvy = dy / l * T.dash; e.ai = 'dash'; e.aiUntil = now + T.dashMs; e.hitP = false; Sfx.whoosh(); }
      return;
    }
    if (e.ai === 'dash') {
      e.fr = 'dash'; b.setVelocity(e.dvx, e.dvy); e.dir = e.dvx >= 0 ? 1 : -1;
      if (Math.random() < 0.6) this.spawnLight(e.x, e.y, 'blinker', 0xa070ff, 1, 1, 0.45, 0.15, 'dash', e.dir < 0);
      if (!e.hitP && alive && Math.abs(pb.center.x - e.x) < 11 && Math.abs(pb.center.y - e.y) < 15) {
        e.hitP = true;
        if (this.hurtPlayer(T.dmg, e.x, { srcY: e.y })) { this.fxBlood(pb.center.x, pb.center.y, 10, Math.atan2(e.dvy, e.dvx), 1.2); Sfx.squish(); }
      }
      if (now >= e.aiUntil || b.blocked.left || b.blocked.right || b.blocked.up || b.blocked.down) { e.ai = 'linger'; e.aiUntil = now + T.lingerMs; b.setVelocity(e.dvx * 0.1, e.dvy * 0.1); }
      return;
    }
    if (e.ai === 'linger') {
      b.velocity.x *= Math.pow(0.05, dt); b.velocity.y *= Math.pow(0.05, dt); e.fr = 'b1';
      if (now >= e.aiUntil && e.stunT <= 0) this.blinkOut(e, 'away');
      return;
    }
    e.ai = 'float';                                                      // drifting, bobbing, until the next blink
    e.fr = Math.floor(e.t * 4) % 2 ? 'b1' : 'b0';
    const k = Math.min(1, dt * 2);
    b.velocity.x += ((e.homeX - e.x) * 0.6 + Math.sin(e.t) * 20 - b.velocity.x) * k; b.velocity.y += ((e.homeY + Math.sin(e.t * 2) * 6 - e.y) - b.velocity.y) * k;
    if (e.aggro && alive) { e.dir = dx >= 0 ? 1 : -1; if ((e.cd -= dt) <= 0 && e.stunT <= 0) this.blinkOut(e, 'strike'); }
  },
  contactNone() { return true; },                                        // it never bites: what hurts is what it swings or casts

  // ---------------------------------------------------------------- flailer ----
  // A mail-clad brute (130 HP) whirling a spiked ball round its fist on a 32 px chain: 12 to you if the ball swings
  // through you, 10 to any other foe, and it swats your bullets out of the air. It closes to put you on the end of the
  // chain and backs off if you get inside (where it can't touch you). Every ~3 s, with you 40-165 px off, it winds up
  // (0.55 s: the ball spins faster and glows, a red ring shows its swing) and hurls the ball at you down the chain
  // (22), then reels it in: that's the moment to step inside.
  setupFlailer(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'walk', stepK: 0, cd: rand(1.5, 2.5), ang: rand(0, Math.PI * 2), spin: TUNE.FLAILER.spin, bx: x, by: y, bvx: 0, bvy: 0, hitMap: new Map(), pHitT: 0, whT: 0 });
    e.ball = this.add.image(x, y, 'flailer_ball').setDepth(6);
  },
  updateFlailer(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.FLAILER, b = e.body, onG = b.blocked.down || b.touching.down;
    this.xAlert(e, now, dist, 200, alive);
    if (e.ai === 'throw' || e.ai === 'reel') {                          // the ball out on its chain
      b.velocity.x = 0; e.fr = 'throw';
      const [hx, hy] = this.flailHand(e), px = e.bx, py = e.by;
      if (e.ai === 'throw') {
        e.bx += e.bvx * dt; e.by += e.bvy * dt;
        const tx = Math.floor(e.bx / TS), ty = Math.floor(e.by / TS), c = this.tileAt(tx, ty);
        if (c === 'x' || c === 'g' || c === '=') this.damageTile(tx, ty, 40);
        const wall = this.sweep(px, py, e.bx, e.by);
        if (wall) { e.bx = wall.x; e.by = wall.y; this.fxSparks(e.bx, e.by, 6); Sfx.clang(0.6); this.shake(70, 0.003); }
        if (wall || Math.hypot(e.bx - hx, e.by - hy) >= T.reach) e.ai = 'reel';
      } else {
        const ddx = hx - e.bx, ddy = hy - e.by, d = Math.hypot(ddx, ddy);
        if (d < 8) { e.ai = 'walk'; e.cd = rand(T.cd[0], T.cd[1]); e.ang = Math.atan2(e.by - e.y + 2, e.bx - e.x); }
        else { const v = Math.min(d / Math.max(dt, 0.001), T.reel); e.bx += ddx / d * v * dt; e.by += ddy / d * v * dt; }
      }
      const out = e.ai === 'throw';
      this.flailHits(e, now, out ? T.throwDmg : T.hit * 0.6, out ? T.ethrowDmg : T.ehit * 0.6, Math.sign(e.bvx) || e.dir, 0);
      return;
    }
    e.spin = approach(e.spin, e.ai === 'wind' ? T.windSpin : T.spin, dt * 14);
    e.ang += e.spin * dt;
    e.bx = e.x + Math.cos(e.ang) * T.r; e.by = e.y - 2 + Math.sin(e.ang) * T.r;   // round its middle, wide enough that hugging it is safe
    if (dist < 300 && (e.whT -= dt) <= 0) { e.whT = Math.PI / e.spin; Sfx.whoosh(); }
    for (const bl of this.bulletList) if (bl.active && Math.abs(bl.x - e.bx) < 6 && Math.abs(bl.y - e.by) < 6) { const x = bl.x, y = bl.y; bl.disableBody(true, true); this.fxSparks(x, y, 5, bl.ang + Math.PI, 1.4); Sfx.clang(0.4); }
    this.flailHits(e, now, T.hit, T.ehit, -Math.sin(e.ang), Math.cos(e.ang));
    if (e.ai === 'wind') { b.velocity.x = 0; e.fr = 'wind'; if (now >= e.aiUntil) this.flailThrow(e); return; }
    if (e.stunT > 0) return;
    e.cd -= dt;
    if (e.aggro && alive) {
      e.dir = dx >= 0 ? 1 : -1; const ax = Math.abs(dx);
      let mv = ax < T.close ? -e.dir : ax > T.keep ? e.dir : 0;           // inside its circle you're safe: it backs off to put you back on the chain
      if (mv && !this.stepOk(b.center.x + mv * 10, b.bottom)) mv = 0;
      b.velocity.x = mv * T.speed * (mv === -e.dir ? 1.4 : 1);
      if (mv && onG && (b.blocked.left || b.blocked.right)) b.velocity.y = -KEEPER_HOP;
      if (e.cd <= 0 && e.sees && ax > T.r + 8 && dist < T.reach && onG) { e.ai = 'wind'; e.aiUntil = now + T.windMs; Sfx.chain(); return; }
    } else b.velocity.x = 0;
    this.xStep(e, dt, 4);
  },
  deathFlailer(e, cx, cy, dx, src, charred) {                           // the ball drops off its chain
    this.spawnGib('flailer_ball', e.bx, e.by, dx * 60 + rand(-80, 80), -rand(80, 200), 'metal'); e.ball.destroy();
  },
  visFlailer(e, g, now) {                                               // the chain from its fist to the ball, a blur behind the whirl
    const T = TUNE.FLAILER, [hx, hy] = this.flailHand(e), G = this.xfoes.g, n = Math.max(2, Math.round(Math.hypot(e.bx - hx, e.by - hy) / 3));
    for (let i = 1; i < n; i++) {
      const t = i / n, x = Math.round(hx + (e.bx - hx) * t), y = Math.round(hy + (e.by - hy) * t);
      G.fillStyle(0x0c0e12, 1).fillRect(x - 1, y - 1, 3, 3); G.fillStyle(i % 2 ? 0xc8d0da : 0x7f8a99, 1).fillRect(x - 1, y - 1, 2, 2);
    }
    e.ball.setPosition(Math.round(e.bx), Math.round(e.by)).setRotation(e.ang * 1.5);
    const wind = e.ai === 'wind';
    if (wind && Math.floor(now / 60) % 2) e.ball.setTint(0xffa080); else e.ball.clearTint();
    if (e.ai === 'walk' || wind) { g.lineStyle(2, wind ? 0xffc0a0 : 0xc8d0da, wind ? 0.45 : 0.18); g.beginPath(); g.arc(e.x, e.y - 2, T.r, e.ang - (wind ? 1.4 : 0.8), e.ang - 0.15, false); g.strokePath(); }
    if (wind) { g.lineStyle(1, 0xff3020, 0.3 + 0.25 * Math.sin(now / 40)); g.strokeCircle(e.x, e.y - 2, T.r + 6); }
  },

  // ---------------------------------------------------------------- hoser ----
  // A trooper (75 HP) with a fire hose and a water tank, 80-160 px off. Every ~3 s it braces (0.45 s, the nozzle
  // gurgles and drips) and opens up: a 190 px jet for 1.1 s that tracks you slowly. Caught in it you're blasted back
  // hard (off ledges), stung (3 every 0.3 s) and soaked: three-quarter speed for 1.6 s. A dash goes straight through.
  // The jet washes foes back too, puts out anything burning it crosses (fire on the floor included) and leaves water
  // where it lands. It hoses itself down if it catches fire, and its tank bursts into a big puddle (live water
  // conducts) when it dies.
  setupHoser(e, x, y, cx, cy) { Object.assign(e, { ai: 'walk', stepK: 0, cd: rand(1.2, 2.2), el: 0, jx: x, jy: y, hitT: 0, pudT: 0 }); },
  updateHoser(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.HOSER, b = e.body, onG = b.blocked.down || b.touching.down;
    if (e.burnT > 0.3) { e.burnT = 0.3; this.xSteam(e.x, e.y - 4); }    // it hoses itself down
    if (e.burnT > 0) e.panicT = 0;
    this.xAlert(e, now, dist, 220, alive);
    if (e.ai === 'brace') {
      b.velocity.x = 0; e.fr = 'brace'; if (alive) e.dir = dx >= 0 ? 1 : -1;
      this.hoseTrack(e, dt, T.turn * 2);
      if (now >= e.aiUntil) { e.ai = 'spray'; e.aiUntil = now + T.spray * 1000; e.hitT = 0; Sfx.steam(); }
      return;
    }
    if (e.ai === 'spray') {
      b.velocity.x = 0; e.fr = 'spray';
      if (alive) this.hoseTrack(e, dt, T.turn);
      this.hoseSpray(e, dt, now);
      if (now >= e.aiUntil) { e.ai = 'walk'; e.cd = rand(T.cd[0], T.cd[1]); }
      return;
    }
    if (e.stunT > 0) return;
    e.cd -= dt;
    if (e.aggro && alive) {
      this.xKeep(e, T, dx, onG, T.keep);
      if (e.cd <= 0 && e.sees && dist < T.range && onG) { e.ai = 'brace'; e.aiUntil = now + T.braceMs; e.el = clamp(Math.atan2(dy, Math.abs(dx)), -1.1, 1.1); Sfx.gurgle(); return; }
    } else b.velocity.x = 0;
    this.xStep(e, dt, 5);
  },
  deathHoser(e, cx, cy, dx, src, charred) {                             // the tank bursts: a big puddle
    this.spawnWater(cx, e.body.bottom - 2, TUNE.HOSER.tank);
    this.fx.emit(cx - e.dir * 5, cy, { n: 26, angle: -Math.PI / 2, spread: 2.4, speed: [60, 220], life: [0.3, 0.7], size: [3, 1], cols: [0xffffff, 0xa8e0ff, 0x4a90d0], add: true, g: 500, mode: 1 });
    Sfx.gurgle();
  },
  visHoser(e, g, now) {                                                 // the jet, widening as it goes; drips while it braces
    const [x0, y0] = this.hoseNozzle(e);
    if (e.ai === 'brace' && Math.random() < 0.5) this.fx.emit(x0, y0 + 1, { n: 1, angle: Math.PI / 2, spread: 0.3, speed: [10, 30], life: [0.2, 0.4], size: [2, 1], cols: [0xe8f8ff, 0x7cc8f0], add: true, g: 300 });
    if (e.ai !== 'spray') return;
    const G = this.xfoes.g, x1 = e.jx, y1 = e.jy, L = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / L, ny = (x1 - x0) / L, n = Math.max(2, Math.round(L / 8));
    let pax = x0, pay = y0;
    for (let j = 1; j <= n; j++) {                                      // a rope of water, swelling and wobbling as it goes
      const t = j / n, w = 3 + 4 * t + Math.sin(now / 18 + j * 2.1) * 1.2, wob = Math.sin(now / 25 + j * 1.3) * t * 2;
      const bx = x0 + (x1 - x0) * t + nx * wob, by = y0 + (y1 - y0) * t + ny * wob;
      G.lineStyle(w + 2, 0x1e4f8a, 0.55).lineBetween(pax, pay, bx, by); G.lineStyle(w, 0x4a90d0, 0.9).lineBetween(pax, pay, bx, by);
      G.lineStyle(Math.max(1, w - 3), 0x9ad4f4, 0.9).lineBetween(pax, pay, bx, by);
      if ((j + Math.floor(now / 40)) % 3 === 0) G.lineStyle(1, 0xffffff, 0.95).lineBetween(pax - nx, pay - ny, bx - nx, by - ny);   // foam streaks running down it
      pax = bx; pay = by;
    }
    G.fillStyle(0xd8f0ff, 0.9).fillCircle(x1, y1, 4 + Math.sin(now / 30)); G.fillStyle(0xffffff, 0.9).fillCircle(x1 + Math.sin(now / 20) * 2, y1 - 1, 2);
  },

  // ---------------------------------------------------------------- demo runner ----
  // A wiry sprinter (35 HP) holding a bundle of dynamite out front. The moment it knows you're there it stops to light
  // the fuse (0.7 s, a flare at the bundle), then sprints at you (175 px/s), hopping steps and gaps; the fuse burns 3 s
  // (fire burns it down twice as fast). It blows when it
  // touches you or the fuse runs out (radius 52: 30 to you, 40 to foes). A shot into the bundle from the front, or any
  // blast, sets it off early and hits the foes round it harder (70). Killed any other way it drops the bundle, which
  // goes off 0.7 s later where it lands (shoot it, or kick it at them). Frozen or time-stopped, the fuse waits.
  setupDemo(e, x, y, cx, cy) { Object.assign(e, { ai: 'idle', fuse: TUNE.DEMO.fuse, lit: false, hopT: 0, beepT: 0, blown: false }); },
  updateDemo(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.DEMO, b = e.body, onG = b.blocked.down || b.touching.down;
    if (e.ai === 'idle' && (e.aggro || (alive && (e.sees || dist < 200) && dist < e.def.sight))) { e.ai = 'light'; e.aiUntil = now + T.lightMs; e.aggro = true; e.aggroT = 6; Sfx.sputter(); this.popAlert(e); }
    if (e.ai === 'light') {                                             // the tell: it stops dead and puts a match to the fuse
      if (b.blocked.down || b.touching.down) b.velocity.x *= Math.pow(0.01, dt);
      e.fr = 'light'; if (alive) e.dir = dx >= 0 ? 1 : -1;
      if (now < e.aiUntil) return;
      e.ai = 'run'; e.lit = true; Sfx.ignite();
    }
    if (e.lit) {
      e.fuse -= dt * (e.burnT > 0 ? 2 : 1); e.panicT = 0;                 // alight, it doesn't panic: it just burns down faster
      if ((e.beepT -= dt) <= 0) { e.beepT = 0.07 + 0.28 * Math.max(0, e.fuse / T.fuse); Sfx.sputter(); }
      if (e.fuse <= 0) { this.demoBoom(e, false); return; }
    }
    if (!e.lit || e.stunT > 0) { if (onG && e.stunT <= 0) b.velocity.x *= Math.pow(0.01, dt); e.fr = onG ? 'r0' : 'air'; return; }
    if (alive && Math.abs(dx) > 4) e.dir = dx >= 0 ? 1 : -1;
    b.velocity.x = approach(b.velocity.x, e.dir * T.speed, 900 * dt);
    const ahead = e.dir < 0 ? b.blocked.left : b.blocked.right, gap = dy < 24 && !this.stepOk(b.center.x + e.dir * 14, b.bottom);
    if (onG && (e.hopT -= dt) <= 0 && (ahead || gap || (dy < -40 && Math.abs(dx) < 110))) { b.velocity.y = -T.hop; e.hopT = 0.45; }
    e.fr = !onG ? 'air' : Math.floor(now / 70) % 2 ? 'r1' : 'r0';
  },
  armourDemo(e, dmg, dx, dy, src) {                                     // a hit on the bundle it holds out, or any blast, sets it off
    if (src === 'rocket' || (dx && Math.sign(dx) === -e.dir && !['burn', 'gas', 'net', 'kick', 'crush'].includes(src))) { this.demoBoom(e, src !== 'rocket'); return 0; }
    return dmg;
  },
  contactDemo(e, p) { this.demoBoom(e, false); return true; },
  deathDemo(e, cx, cy, dx, src, charred) {                              // killed some other way: the bundle drops, still lit
    if (e.blown) return;
    const x = cx + e.dir * 6;
    this.xfoes.bundles.push({ img: this.add.image(x, cy, 'demo_tnt').setDepth(6), x, y: cy, vx: e.body.velocity.x * 0.3 + dx * 50, vy: -140, rot: 0, t: TUNE.DEMO.drop });
  },
  visDemo(e, g, now) {                                                  // the fuse spits sparks, faster and redder as it burns down
    if (e.ai === 'light') { const k = clamp(1 - (e.aiUntil - now) / TUNE.DEMO.lightMs, 0, 1); g.fillStyle(0xfff4c0, 0.5 + 0.5 * k).fillCircle(e.x + 6 * e.dir, e.y - 5, 1 + 2 * k); if (Math.random() < 0.5) this.fx.emit(e.x + 6 * e.dir, e.y - 5, { n: 1, angle: -Math.PI / 2, spread: 2, speed: [20, 60], life: [0.1, 0.2], size: [2, 1], cols: [0xffffff, 0xffe46a], add: true }); return; }
    if (!e.lit) return;
    const fx0 = e.x + 6 * e.dir, fy0 = e.y - 4, k = 1 - Math.max(0, e.fuse) / TUNE.DEMO.fuse;
    if (Math.random() < 0.8) this.fx.emit(fx0, fy0, { n: 1, angle: -Math.PI / 2, spread: 1.6, speed: [20, 80], life: [0.1, 0.25], size: [2, 1], cols: [0xffffff, 0xffe46a, 0xff8a1f], add: true });
    g.fillStyle(k > 0.6 ? 0xff5030 : 0xffe46a, 0.6 + 0.4 * Math.sin(now / (60 - 40 * k))).fillCircle(fx0, fy0, 1 + k * 1.5);
    if (k > 0.6 && Math.floor(now / 80) % 2) { g.lineStyle(1, 0xff3020, 0.6); g.strokeCircle(e.x + e.dir * 5, e.y, 10 + 4 * k); }
  },

  // ---------------------------------------------------------------- panzer ----
  // A treaded mini-tank (200 HP) that holds 150-260 px off. Its turret tracks you; every ~4 s it raises the gun
  // (0.65 s, a red ring marks where the shell will land) and lobs a shell (1.1 s flight, a howitzer's blast: shoot it
  // down or kick it back). Up close and in front it fires a four-round coax burst (5 each). The glacis plate takes
  // shots from the front at 35%; the engine deck behind and on top takes x1.5. The hull takes 0.9 s to turn round,
  // so get behind it. It blows up when it dies.
  setupPanzer(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'walk', stepK: 0, cd: rand(1.5, 2.5), coaxCd: 1, aimA: e.dir > 0 ? -0.2 : Math.PI + 0.2, turnT: 0, burst: 0, shotT: 0, recoil: 0, lob: null, rumT: 0 });
    e.turret = this.add.image(x, y, 'panzer_gun').setOrigin(5 / 18, 4.5 / 9).setDepth(5.1);
  },
  updatePanzer(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.PANZER, b = e.body, onG = b.blocked.down || b.touching.down, pb = this.player.body;
    this.xAlert(e, now, dist, 220, alive);
    e.coaxCd -= dt; e.recoil = Math.max(0, e.recoil - dt * 10);
    if (e.burst > 0 && (e.shotT -= dt) <= 0) {                          // the coax gun in the hull, firing only forward
      e.burst--; e.shotT = T.gap;
      const mx = e.x + 14 * e.dir, my = e.y + 1, a = Math.atan2(pb.center.y - my, pb.center.x - mx), fa = e.dir > 0 ? clamp(a, -0.5, 0.5) : a > 0 ? Math.max(a, Math.PI - 0.5) : Math.min(a, -Math.PI + 0.5);
      this.spawnEBullet(mx, my, fa + rand(-0.06, 0.06), 380, T.coaxDmg); Sfx.rivet(); this.spawnLight(mx, my, 'glow', 0xffc060, 0.4, 0.8, 0.7, 0.05);
    }
    if (e.ai === 'aim') {
      b.velocity.x = 0; e.aimA = this.xTurn(e.aimA, e.lob.a, T.gunTurn * 3 * dt);
      if (now >= e.aiUntil) this.panzerFire(e);
      return;
    }
    e.aimA = this.xTurn(e.aimA, Math.atan2(pb.center.y - (e.y - 4), pb.center.x - e.x), T.gunTurn * dt);
    if (e.stunT > 0) return;
    e.cd -= dt;
    if (e.aggro && alive) {
      const ax = Math.abs(dx), front = Math.sign(dx) === e.dir || ax < 6;
      if (!front && (e.turnT += dt) * 1000 >= T.turnMs) { e.dir = -e.dir; e.turnT = 0; this.fxDust(e.x, b.bottom, 6); Sfx.clunk(0.6); }   // the hull swings round, slowly
      else if (front) e.turnT = 0;
      let mv = !front ? 0 : ax > T.keep[1] ? e.dir : ax < T.keep[0] ? -e.dir : 0;
      if (mv && !this.stepOk(b.center.x + mv * 16, b.bottom)) mv = 0;
      b.velocity.x = mv * T.speed * (mv === -e.dir ? 0.7 : 1);
      if (mv && onG && (b.blocked.left || b.blocked.right)) b.velocity.y = -KEEPER_HOP;
      if (front && e.coaxCd <= 0 && ax < T.coaxAt && Math.abs(dy) < 40 && e.sees) { e.burst = T.burst; e.shotT = 0.05; e.coaxCd = T.coaxCd; }
      else if (e.cd <= 0 && e.sees && ax > 80 && onG) this.panzerAim(e, now);
    } else b.velocity.x = 0;
    if (Math.abs(b.velocity.x) > 3) { e.stepK += dt * 7; e.fr = Math.floor(e.stepK) % 2 ? 'w1' : 'w0'; if (dist < 320 && (e.rumT -= dt) <= 0) { e.rumT = 0.7; Sfx.dozer(); } }
  },
  armourPanzer(e, dmg, dx, dy, src) {                                   // the glacis eats frontal fire; the engine deck behind and on top gives
    const T = TUNE.PANZER;
    if (['burn', 'gas', 'crush', 'net', 'rocket'].includes(src)) return dmg;
    if (dy > 0.6) return dmg * T.top;                                   // plunging fire through the deck
    if (dx && Math.sign(dx) === e.dir) return dmg * T.rear;
    if (dx && Math.sign(dx) === -e.dir) {
      if (Math.random() < 0.4) { this.fxSparks(e.body.center.x + e.dir * 12, e.body.center.y - 2, 3, e.dir > 0 ? 0 : Math.PI, 1.2, [60, 180]); Sfx.clang(0.35); }
      return dmg * T.front;
    }
    return dmg;
  },
  deathPanzer(e, cx, cy, dx, src, charred) {                            // the turret pops off and the hull goes up
    this.spawnGib('panzer_gun', e.x, e.y - 6, dx * 80 + rand(-60, 60), -rand(260, 360), 'metal'); e.turret.destroy();
    this.fxFire(cx, cy, 12); this.fxSmoke(cx, cy, 10, 1.4);
    this.time.delayedCall(60, () => { if (this.state !== 'dead') this.explode(cx, cy, TUNE.PANZER.boom); });
  },
  visPanzer(e, g, now) {                                                // the turret on its ring, kicked back when it fires, glowing while it aims
    const a = e.aimA, r = e.recoil;
    e.turret.setPosition(Math.round(e.x - Math.cos(a) * r), Math.round(e.y - 4 - Math.sin(a) * r)).setRotation(a).setFlipY(Math.cos(a) < 0);
    const key = e.flashT > 0 ? 'panzer_gun_w' : 'panzer_gun'; if (e.turret.texture.key !== key) e.turret.setTexture(key);   // it flashes with the hull
    if (e.ai === 'aim' && Math.floor(now / 70) % 2) e.turret.setTint(0xffb080); else e.turret.clearTint();
    if (Math.abs(e.body.velocity.x) > 3 && Math.random() < 0.15) this.fxSmoke(e.x - e.dir * 14, e.y - 6, 1, 0.5);
  },

  // ---------------------------------------------------------------- reaper ----
  // A gaunt robot (140 HP) on stilt legs with two scythe arms that stalks you (70 px/s, 110 from afar). Within 120 px
  // it raises both blades (0.7 s: its eye flares and a red ring closes in), then whirls: 1.2 s of spinning steel that
  // drives at you (185 px/s, slow to turn), 9 to you if it catches you and 10 to any foe in the way. Then it stands
  // dizzy for 1.6 s, taking x1.75. Jump it, or get clear and hit it after.
  setupReaper(e, x, y, cx, cy) { Object.assign(e, { ai: 'walk', stepK: 0, cd: rand(1, 2), pHitT: 0, hitMap: new Map(), whT: 0 }); },
  updateReaper(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.REAPER, b = e.body, onG = b.blocked.down || b.touching.down;
    this.xAlert(e, now, dist, 220, alive);
    if (e.ai === 'tell') {
      b.velocity.x = 0; e.fr = 'tell'; if (alive) e.dir = dx >= 0 ? 1 : -1;
      if (now >= e.aiUntil) { e.ai = 'whirl'; e.aiUntil = now + T.whirl * 1000; e.hitMap.clear(); e.pHitT = 0; }
      return;
    }
    if (e.ai === 'whirl') {
      e.fr = Math.floor(now / 45) % 2 ? 'spin1' : 'spin0';
      if (e.stunT <= 0) {
        e.dir = alive && Math.abs(dx) > 6 ? Math.sign(dx) : e.dir;
        b.velocity.x = approach(b.velocity.x, e.dir * T.drive, 700 * dt);
        if (onG && (b.blocked.left || b.blocked.right)) b.velocity.y = -240;
      }
      if ((e.whT -= dt) <= 0) { e.whT = 0.12; Sfx.whirr(1); }
      this.reaperCut(e, now);
      if (now >= e.aiUntil) { e.ai = 'dizzy'; e.aiUntil = now + T.dizzy * 1000; b.velocity.x *= 0.3; Sfx.clunk(0.5); }
      return;
    }
    if (e.ai === 'dizzy') { b.velocity.x *= Math.pow(0.02, dt); e.fr = 'dizzy'; if (now >= e.aiUntil) { e.ai = 'walk'; e.cd = rand(T.cd[0], T.cd[1]); } return; }
    if (e.stunT > 0) return;
    e.cd -= dt;
    if (e.aggro && alive) {
      e.dir = dx >= 0 ? 1 : -1; const ax = Math.abs(dx);
      let mv = ax > 20 ? e.dir : 0;
      if (mv && dy < 30 && !this.stepOk(b.center.x + mv * 10, b.bottom)) mv = 0;
      b.velocity.x = mv * (ax > 200 ? T.rush : T.speed);
      if (mv && onG && (b.blocked.left || b.blocked.right)) b.velocity.y = -KEEPER_HOP;
      if (e.cd <= 0 && e.sees && ax < T.at && Math.abs(dy) < 50 && onG) { e.ai = 'tell'; e.aiUntil = now + T.tellMs; Sfx.swapTell(); return; }
    } else b.velocity.x = 0;
    this.xStep(e, dt, 4);
  },
  armourReaper(e, dmg) { return e.ai === 'dizzy' ? dmg * TUNE.REAPER.take : dmg; },
  contactReaper(e, p) { return e.ai === 'whirl' || e.ai === 'dizzy'; },   // the whirl does its own cutting; dizzy, it can't bite
  visReaper(e, g, now) {
    const T = TUNE.REAPER, cx = e.body.center.x, cy = e.body.center.y - 2;
    if (e.ai === 'tell') {                                              // the eye flares and a red ring closes to its reach
      const k = clamp(1 - (e.aiUntil - now) / T.tellMs, 0, 1);
      g.lineStyle(1, 0xff3020, 0.3 + 0.5 * k); g.strokeCircle(cx, cy, T.r + 10 * (1 - k));
      g.fillStyle(0xff5040, 0.9).fillCircle(e.x + 2 * e.dir, e.y - 9, 1 + k * 1.5);
    } else if (e.ai === 'whirl') {                                      // a blur of blades
      for (let k = 0; k < 2; k++) { const a0 = now / 40 + k * Math.PI; g.lineStyle(2, 0xd8e0e8, 0.55); g.beginPath(); g.arc(cx, cy, T.r - 3, a0, a0 + 1.6, false); g.strokePath(); }
      g.lineStyle(1, 0xffffff, 0.2).strokeCircle(cx, cy, T.r - 1);
    } else if (e.ai === 'dizzy') {                                      // stars round its head
      for (let k = 0; k < 3; k++) { const a = now / 180 + k * 2.1; g.fillStyle(0xffe14a, 0.9).fillRect(Math.round(e.x + Math.cos(a) * 7) - 1, Math.round(e.body.top - 4 + Math.sin(a) * 2), 2, 2); }
    }
  },

  // ---------------------------------------------------------------- gull ----
  // A carrion drone in scrap feathers (40 HP) that circles 105 px over you. Every ~3 s, with a clear line to you, it
  // screeches (0.52 s, beak agape) and swoops down an arc that bottoms out where you'll be and climbs out the far
  // side, raking you on the way (14). It can't turn in a dive: a wall or the floor in the way stuns it for 0.8 s.
  setupGull(e, x, y, cx, cy) {
    e.body.setAllowGravity(false);
    Object.assign(e, { ai: 'circle', cd: rand(1.5, 2.5), orb: rand(0, Math.PI * 2), side: Math.random() < 0.5 ? -1 : 1, hitP: false, diveT: 0, dT: 0, ga: 0, diveY: y });
  },
  updateGull(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.GULL, b = e.body, pb = this.player.body;
    if (alive && !e.aggro && dist < e.def.sight) { e.aggro = true; e.aggroT = 6; this.popAlert(e); }
    e.cd -= dt;
    if (e.ai === 'scream') {
      b.velocity.x *= Math.pow(0.02, dt); b.velocity.y *= Math.pow(0.02, dt); e.fr = 'scream'; e.dir = dx >= 0 ? 1 : -1;
      if (now >= e.aiUntil) this.gullDive(e);
      return;
    }
    if (e.ai === 'dive') {
      e.fr = 'dive'; e.diveT += dt; b.velocity.y += e.ga * dt;
      if (e.diveT > 0.05 && (b.blocked.left || b.blocked.right || b.blocked.down || b.blocked.up)) {   // it can't pull out: a bonk
        e.ai = 'circle'; e.cd = rand(T.cd[0], T.cd[1]); e.stunT = T.bonk; b.setVelocity(-b.velocity.x * 0.3, -60);
        this.fxSparks(b.center.x, b.center.y, 6); Sfx.clang(0.5);
        this.fx.emit(b.center.x, b.center.y, { n: 5, speed: [20, 80], life: [0.5, 1], size: [2, 2], cols: [0xb0b8c2, 0x7a808a], g: 60, drag: 2 });
        return;
      }
      if (e.diveT >= e.dT * 2 || (e.diveT > e.dT && b.center.y < e.diveY)) { e.ai = 'circle'; e.cd = rand(T.cd[0], T.cd[1]); }
      return;
    }
    e.fr = Math.floor(now / 110) % 2 ? 'f1' : 'f0';                      // circling, high over you
    if (e.stunT > 0) { b.velocity.x *= Math.pow(0.1, dt); b.velocity.y = Math.min(b.velocity.y + 200 * dt, 120); return; }
    e.orb += dt * 1.5 * e.side;
    const hx = e.aggro && alive ? pb.center.x : e.homeX, hy = e.aggro && alive ? pb.center.y : e.homeY + T.alt;
    const tx = clamp(hx + Math.cos(e.orb) * T.orbit, 24, LW - 24);
    let ty = hy - T.alt + Math.sin(e.orb * 2) * 10;
    for (let k = 0; k < 6 && this.solidAt(tx, ty); k++) ty += 16;       // under the roof
    const k = Math.min(1, dt * 2.5), vmax = T.speed * 1.6;
    b.velocity.x = clamp(b.velocity.x + ((tx - b.center.x) * 2.2 - b.velocity.x) * k, -vmax, vmax);
    b.velocity.y = clamp(b.velocity.y + ((ty - b.center.y) * 2.2 - b.velocity.y) * k, -vmax, vmax);
    if (Math.abs(b.velocity.x) > 10) e.dir = b.velocity.x > 0 ? 1 : -1;
    if (e.aggro && alive && e.cd <= 0 && e.sees && b.center.y < pb.center.y - 40 && Math.abs(dx) > 40 && dist < 280) { e.ai = 'scream'; e.aiUntil = now + T.screamMs; Sfx.wail(); }
  },
  contactGull(e, p) {                                                   // only the dive rakes
    if (e.ai === 'dive' && !e.hitP) {
      e.hitP = true;
      if (this.hurtPlayer(TUNE.GULL.rake, e.body.center.x, { srcY: e.body.center.y })) { this.fxBlood(p.body.center.x, p.body.center.y, 8, Math.atan2(e.body.velocity.y, e.body.velocity.x), 1); Sfx.slash(); }
    }
    return true;
  },
  visGull(e, g, now) {
    if (e.ai === 'dive') { const v = e.body.velocity; e.rotation = clamp(Math.atan2(v.y, Math.abs(v.x) + 1), -1.1, 1.1) * e.dir; }   // nose along the swoop
    if (e.ai === 'scream') {                                            // the screech: rings off its beak
      const bx = e.x + 10 * e.dir, by = e.y - 2, t = (now / 300) % 1;
      for (let k = 0; k < 2; k++) { const r = 3 + ((t + k * 0.5) % 1) * 9; g.lineStyle(1, 0xffe080, 0.7 * (1 - r / 12)); g.beginPath(); g.arc(bx, by, r, e.dir > 0 ? -0.7 : Math.PI - 0.7, e.dir > 0 ? 0.7 : Math.PI + 0.7, false); g.strokePath(); }
    }
  },

  // ---------------------------------------------------------------- overclocker ----
  // A capacitor drone (45 HP) that hangs back 160-260 px off, behind its friends, and links yellow beams to up to three
  // foes within 150 px. A link charges for 0.5 s, then the foe on the end runs hot (yellow chevrons, an afterimage):
  // it moves x1.35 as fast and its cooldowns tick x1.35 as fast. Kill it and the links snap, jolting every foe on them.
  setupOverclock(e, x, y, cx, cy) {
    e.body.setAllowGravity(false);
    Object.assign(e, { ai: 'drift', links: [], scanT: 0 });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xffd040).setScale(0.45).setAlpha(0.75).setDepth(18);
  },
  updateOverclock(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.OVERCLOCK, b = e.body, pb = this.player.body, far = o => Math.hypot(o.body.center.x - b.center.x, o.body.center.y - b.center.y);
    if (alive && !e.aggro && dist < e.def.sight) { e.aggro = true; e.aggroT = 6; this.popAlert(e); }
    e.fr = Math.floor(now / 90) % 2 ? 'o1' : 'o0';
    if ((e.scanT -= dt) <= 0) {                                         // drop links that went out of reach; pick up the nearest foes free of another clocker
      e.scanT = 0.4;
      e.links = e.links.filter(L => this.overclockable(L.o) && far(L.o) < T.range * 1.3);
      if (e.links.length < T.links) {
        const c = this.enemies.getChildren().filter(o => this.overclockable(o) && !e.links.some(L => L.o === o) && !(o.hasteT > now && o.hasteBy !== e) && far(o) < T.range && this.los(b.center.x, b.center.y, o.body.center.x, o.body.center.y));
        c.sort((p, q) => far(p) - far(q));
        for (const o of c.slice(0, T.links - e.links.length)) { e.links.push({ o, k: 0, gT: 0 }); Sfx.linkOn(); }
      }
    }
    for (const L of e.links) {
      L.k = Math.min(1, L.k + dt / T.charge);
      if (L.k < 1) continue;
      L.o.hasteT = now + 300; L.o.hasteBy = e;
      if ((L.gT -= dt) <= 0 && Math.hypot(L.o.body.velocity.x, L.o.body.velocity.y) > 30) { L.gT = 0.08; this.spawnLight(L.o.x, L.o.y, L.o.def.key + '_w', 0xffd040, 1, 1, 0.2, 0.18, L.o.fr, L.o.flipX); }   // the afterimage it leaves running hot
    }
    if (e.stunT > 0) { b.velocity.x *= Math.pow(0.1, dt); b.velocity.y *= Math.pow(0.1, dt); return; }
    let ax = b.center.x, ay = pb.center.y - 70;                         // drift high behind the ones it feeds, away from you
    if (e.links.length) { ax = 0; ay = 0; for (const L of e.links) { ax += L.o.body.center.x; ay += L.o.body.center.y; } ax /= e.links.length; ay = ay / e.links.length - 50; }
    const side = Math.sign(ax - pb.center.x) || -e.dir;
    let tx = ax + side * 30;
    if (e.aggro && alive && Math.abs(tx - pb.center.x) < T.keep[0]) tx = pb.center.x + side * T.keep[0];
    if (!e.links.length && e.aggro && alive && Math.abs(tx - pb.center.x) > T.keep[1]) tx = pb.center.x + side * T.keep[1];
    tx = clamp(tx, 24, LW - 24);
    let ty = ay; for (let k = 0; k < 6 && this.solidAt(tx, ty); k++) ty += 16;
    const k = Math.min(1, dt * 2), vmax = T.speed * 1.6;
    b.velocity.x = clamp(b.velocity.x + ((tx - b.center.x) * 1.5 - b.velocity.x) * k, -vmax, vmax);
    b.velocity.y = clamp(b.velocity.y + ((ty - b.center.y) * 1.5 + Math.sin(e.t * 3) * 12 - b.velocity.y) * k, -vmax, vmax);
    e.dir = dx >= 0 ? 1 : -1;
  },
  deathOverclock(e, cx, cy, dx, src, charred) {                         // the links snap: a jolt down every live beam
    let n = 0;
    for (const L of e.links) {
      const o = L.o; if (!o.alive || L.k < 1) continue;
      n++; o.hasteT = 0; o.stunT = Math.max(o.stunT, 0.4);
      this.addZap(cx, cy, o.body.center.x, o.body.center.y, 0.15, 0xffc830, 0xfff4b0); this.fxSparks(o.body.center.x, o.body.center.y, 6);
    }
    if (n) { BUS.emit('callout', 'LINKS SNAPPED'); this.addStyle(30 * n); Sfx.zap(); }
  },
  visOverclock(e, g, now) {                                             // a crackling beam to each link; chevrons over the ones running hot
    e.glow.setPosition(e.x, e.y + 1).setScale(0.4 + 0.08 * Math.sin(now / 70));
    for (const L of e.links) {
      const o = L.o; if (!o.alive) continue;
      const x0 = e.x, y0 = e.y + 7, x1 = o.body.center.x, y1 = o.body.center.y, ex = x0 + (x1 - x0) * L.k, ey = y0 + (y1 - y0) * L.k;
      const len = Math.hypot(ex - x0, ey - y0) || 1, nx = -(ey - y0) / len, ny = (ex - x0) / len, n = Math.max(2, Math.round(len / 10));
      g.lineStyle(3, 0xffb020, 0.25).lineBetween(x0, y0, ex, ey);
      let px = x0, py = y0;
      for (let j = 1; j <= n; j++) { const t = j / n, w = j === n ? 0 : Math.sin(now / 30 + j * 1.7) * 2.5, qx = x0 + (ex - x0) * t + nx * w, qy = y0 + (ey - y0) * t + ny * w; g.lineStyle(1, 0xfff0a0, L.k < 1 ? 0.5 : 0.9).lineBetween(px, py, qx, qy); px = qx; py = qy; }
      if (L.k < 1) continue;
      const tx = o.body.center.x, ty = o.body.top - 5 + Math.sin(now / 120);
      g.lineStyle(1, 0xfff060, 0.95); for (let c = 0; c < 2; c++) { g.lineBetween(tx - 3, ty - c * 3, tx, ty - 3 - c * 3); g.lineBetween(tx, ty - 3 - c * 3, tx + 3, ty - c * 3); }
    }
  },

  // ---------------------------------------------------------------- refractor ----
  // A rooted prism turret (90 HP). Every ~3 s it works out a laser path to you that banks off up to two walls (it
  // likes a bank shot when it has one, and needs one when it can't see you), shows the whole path as a thin
  // flickering line (0.9 s), then fires down it for 0.25 s: 20 to you, 15 to any foe on the line. Dash through it.
  setupRefractor(e, x, y, cx, cy) {
    Object.assign(e, { ai: 'idle', cd: rand(1.2, 2.2), beam: null, hitP: false, eHit: new Set() });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0x60e8ff).setScale(0.35).setAlpha(0.7).setDepth(18);
  },
  updateRefractor(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.REFRACTOR, b = e.body;
    b.velocity.x *= Math.pow(0.001, dt);
    if (alive && !e.aggro && (e.sees || dist < 200) && dist < e.def.sight) { e.aggro = true; e.aggroT = 6; this.popAlert(e); }
    if (e.ai === 'tell') {
      e.fr = Math.floor(now / 70) % 2 ? 'charge' : 'p1';
      if (now >= e.aiUntil) { e.ai = 'fire'; e.aiUntil = now + T.fireMs; e.hitP = false; e.eHit.clear(); Sfx.prism(); this.shake(60, 0.003); for (const [x, y] of e.beam.slice(1)) this.spawnLight(x, y, 'glow', 0x60e8ff, 0.6, 1.4, 0.9, 0.2); }
      return;
    }
    if (e.ai === 'fire') { e.fr = 'charge'; this.refractorBurn(e); if (now >= e.aiUntil) { e.ai = 'idle'; e.cd = rand(T.cd[0], T.cd[1]); e.beam = null; } return; }
    e.fr = Math.floor(now / 400) % 2 ? 'p1' : 'p0';
    if (e.aggro && alive) e.dir = dx >= 0 ? 1 : -1;
    if (e.stunT > 0) return;
    e.cd -= dt;
    if (e.aggro && alive && e.cd <= 0 && dist < T.range) {
      const path = this.refractorAim(e);
      if (path) { e.beam = path; e.ai = 'tell'; e.aiUntil = now + T.tellMs; Sfx.laser(); } else e.cd = 0.6;
    }
  },
  visRefractor(e, g, now) {
    const T = TUNE.REFRACTOR, P = e.beam;
    e.glow.setPosition(e.x, e.y - 3).setScale(e.ai === 'fire' ? 0.9 : e.ai === 'tell' ? 0.4 + 0.3 * clamp(1 - (e.aiUntil - now) / T.tellMs, 0, 1) : 0.3);
    if (!P) return;
    if (e.ai === 'tell') {                                              // the whole path, thin and flickering, brighter as it charges
      const k = clamp(1 - (e.aiUntil - now) / T.tellMs, 0, 1), L = this.laserG;
      for (let i = 1; i < P.length; i++) L.lineStyle(1, 0x60e8ff, 0.15 + 0.55 * k + (Math.random() < 0.15 ? 0.2 : 0)).lineBetween(P[i - 1][0], P[i - 1][1], P[i][0], P[i][1]);
      for (let i = 1; i < P.length - 1; i++) L.lineStyle(1, 0xffffff, 0.4 + 0.4 * k).strokeCircle(P[i][0], P[i][1], 4 - 2 * k);
    } else if (e.ai === 'fire') {
      const a = clamp((e.aiUntil - now) / T.fireMs, 0, 1);
      for (let i = 1; i < P.length; i++) { const [x0, y0] = P[i - 1], [x1, y1] = P[i]; g.lineStyle(6, 0x1a8ac0, 0.1 + 0.35 * a).lineBetween(x0, y0, x1, y1); g.lineStyle(3, 0x60e8ff, 0.2 + 0.8 * a).lineBetween(x0, y0, x1, y1); g.lineStyle(1, 0xffffff, 1).lineBetween(x0, y0, x1, y1); }
    }
  },

  // ---------------------------------------------------------------- mirage ----
  // A hooded illusionist (70 HP) that keeps 140-240 px off and fires three slow bolts every ~2.3 s (6 each). With no
  // decoys out it casts (0.6 s of glitching), and then there are three of it along the floor: it slips into one of the
  // spots at random and two holograms take the others. They walk and shoot like it does, but their bolts do nothing
  // and they never flinch; a shot, a kick or your touch pops one in a glitch, they stutter now and then, and they all
  // go when it dies. Every ~7 s, once they're gone, it casts again.
  setupMirage(e, x, y, cx, cy) { Object.assign(e, { ai: 'walk', stepK: 0, fireCd: rand(1.2, 2), castCd: rand(0.8, 1.6), volley: 0, shotT: 0, decoys: [] }); },
  updateMirage(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.MIRAGE, b = e.body, onG = b.blocked.down || b.touching.down;
    this.xAlert(e, now, dist, 220, alive);
    this.mirageDecoys(e, dt, now, alive);
    if (e.ai === 'cast') { b.velocity.x = 0; e.fr = 'cast'; if (now >= e.aiUntil) this.mirageCast(e); return; }
    if (e.stunT > 0) return;
    e.fireCd -= dt; if (!e.decoys.length) e.castCd -= dt;
    if (e.volley > 0) { b.velocity.x = 0; e.fr = 'fire'; if ((e.shotT -= dt) <= 0) { e.volley--; e.shotT = T.gap; this.mirageShot(e, false); } return; }
    if (e.aggro && alive) {
      this.xKeep(e, T, dx, onG, T.keep);
      if (e.castCd <= 0 && onG) { e.ai = 'cast'; e.aiUntil = now + T.castMs; Sfx.swapTell(); return; }
      if (e.fireCd <= 0 && e.sees) { e.volley = T.volley; e.shotT = 0.12; e.fireCd = rand(T.fireCd[0], T.fireCd[1]); }
    } else b.velocity.x = 0;
    this.xStep(e, dt, 5);
  },
  deathMirage(e, cx, cy, dx, src, charred) {                            // the holograms go with it
    if (e.decoys.length) BUS.emit('callout', 'ILLUSION BROKEN');
    for (const D of e.decoys) { this.xGlitch(D.x, D.y, 14); D.img.destroy(); }
    e.decoys = [];
  },
  visMirage(e, g, now) {
    if (e.ai !== 'cast') return;                                        // casting: it tears into scanlines
    const k = clamp(1 - (e.aiUntil - now) / TUNE.MIRAGE.castMs, 0, 1);
    for (let j = 0; j < 4; j++) { const yy = e.body.top + Math.random() * e.body.height; g.lineStyle(1, Math.random() < 0.5 ? 0x46e6ff : 0xff60e0, 0.5 + 0.4 * k).lineBetween(e.x - 8 - 6 * k, yy, e.x + 8 + 6 * k, yy); }
  },

  // ---------------------------------------------------------------- clinger ----
  // A magnetic bomb drone (20 HP) that flies at you and clamps on: it beeps faster and faster for 2 s, then blows
  // (radius 40: 28 to you, 30 to foes). Kick or dash while it's on you to throw it: a kick sends it where you aim, a
  // dash flings it back the way you came, and a thrown clinger blows on the first wall or foe it meets, a blast that's
  // yours (60). Kick one out of the air and it's thrown too; dash through one and it can't get a grip. Shot down, it pops.
  setupClinger(e, x, y, cx, cy) {
    e.body.setAllowGravity(false);
    Object.assign(e, { ai: 'seek', holdT: 0, beepT: 0, blinkT: 0, ox: 0, oy: 0, kickSeen: 0, dashSeen: 0, thrownT: 0, blown: false });
    e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xff3020).setScale(0.3).setAlpha(0.6).setDepth(18);
  },
  updateClinger(e, dt, now, dx, dy, dist, alive) {
    const T = TUNE.CLINGER, b = e.body, pb = this.player.body;
    if (e.ai === 'clamp') {
      e.fr = 'clamp';
      if (!alive || e.tbHeld) { e.ai = 'seek'; e.stunT = 0.6; return; }  // pulled off (or there's no one left to hold)
      b.reset(pb.center.x + e.ox, pb.center.y + e.oy); b.setVelocity(0, 0); e.dir = e.ox >= 0 ? -1 : 1;
      e.holdT -= dt;
      if ((e.beepT -= dt) <= 0) { e.beepT = 0.05 + 0.3 * Math.max(0, e.holdT / T.hold); Sfx.beep(); e.blinkT = now; }
      const kick = e.kickSeen !== this.kickUntil && now < this.kickUntil, dash = e.dashSeen !== this.dashUntil && now < this.dashUntil;
      if (kick || dash) { this.clingerThrow(e, kick); return; }
      if (e.holdT <= 0) this.clingerBoom(e, false);
      return;
    }
    if (e.ai === 'thrown') {                                            // yours now: it blows on the first thing it meets
      e.fr = 'c1'; e.thrownT -= dt; b.velocity.y += 300 * dt;
      let hit = e.thrownT <= 0 || (T.flight - e.thrownT > 0.05 && (b.blocked.left || b.blocked.right || b.blocked.up || b.blocked.down));
      if (!hit) for (const o of this.enemies.getChildren()) { if (!o.alive || o === e || o.under) continue; const ob = o.body; if (ob.right > b.left && ob.left < b.right && ob.bottom > b.top && ob.top < b.bottom) { hit = true; break; } }
      if (hit) this.clingerBoom(e, true);
      return;
    }
    e.fr = Math.floor(now / 100) % 2 ? 'c1' : 'c0';
    if (e.kickedT > 0 && !e.tbHeld) { e.ai = 'thrown'; e.thrownT = T.flight; return; }   // a beam flung it: now it's yours
    if (alive && !e.aggro && dist < e.def.sight) { e.aggro = true; e.aggroT = 6; this.popAlert(e); }
    if (e.tbHeld) return;
    if (e.stunT > 0 || !e.aggro || !alive) { b.velocity.x *= Math.pow(0.1, dt); b.velocity.y *= Math.pow(0.1, dt); return; }
    const l = dist || 1, k = Math.min(1, dt * 2.5);
    b.velocity.x += (dx / l * T.speed - b.velocity.x) * k; b.velocity.y += (dy / l * T.speed + Math.sin(e.t * 7) * 25 - b.velocity.y) * k;
    e.dir = dx >= 0 ? 1 : -1;
  },
  armourClinger(e, dmg, dx, dy, src) {                                  // a boot doesn't break it, it sends it back
    if (src !== 'kick') return dmg;
    if (e.ai !== 'thrown') this.clingerThrow(e, true);
    return 0;
  },
  contactClinger(e, p) {
    if (e.ai !== 'seek' || e.stunT > 0 || this.state === 'dead') return true;
    if (this.time.now < this.dashIUntil) { this.dashDodge(); return true; }   // dashing through: it can't get a grip
    const pb = p.body;
    Object.assign(e, { ai: 'clamp', holdT: TUNE.CLINGER.hold, beepT: 0, ox: clamp(e.body.center.x - pb.center.x, -6, 6), oy: clamp(e.body.center.y - pb.center.y, -8, 6), kickSeen: this.kickUntil, dashSeen: this.dashUntil });
    Sfx.stick(); Sfx.clang(0.3);
    if (!this.xfoes.told.clinger) { this.xfoes.told.clinger = true; BUS.emit('callout', 'CLAMPED! KICK OR DASH'); }
    return true;
  },
  deathClinger(e, cx, cy, dx, src, charred) {                           // shot down, it still pops
    if (!e.blown) this.time.delayedCall(40, () => { if (this.state !== 'dead') this.explode(cx, cy, TUNE.CLINGER.pop); });
  },
  visClinger(e, g, now) {
    const cl = e.ai === 'clamp', blink = cl ? now - e.blinkT < 60 : Math.floor(now / 300) % 2 === 0;
    e.setDepth(cl ? 7.5 : e.litShown ? 16.2 : 5);                       // on you, it sits over your sprite
    e.glow.setPosition(e.x, e.y).setScale(cl ? 0.4 + (blink ? 0.3 : 0) : 0.3).setAlpha(blink ? 0.95 : 0.35);
    if (cl) { const k = 1 - Math.max(0, e.holdT) / TUNE.CLINGER.hold; g.lineStyle(1, 0xff3020, 0.3 + 0.6 * k); g.strokeCircle(e.x, e.y, 6 + 7 * (1 - k)); }   // a closing ring: how long you've got
    if (e.ai === 'thrown') { g.lineStyle(1, 0x46e6ff, 0.6).strokeCircle(e.x, e.y, 7); if (Math.random() < 0.6) this.fx.emit(e.x, e.y, { n: 1, speed: [5, 20], life: [0.15, 0.3], size: [2, 1], cols: [0xffffff, 0x9af0ff], add: true }); }
  },
  updateWyrmseg() {},                                                    // a wyrm segment: its head places it (updateWyrm)
  updateWalker(e, dt, now, dx, dy, dist, alive) {
    const b = e.body, D = e.def, heavy = e.kind === 'heavy', adx = Math.abs(dx);
    const onGround = b.blocked.down || b.touching.down;
    if (alive && !e.aggro && e.sees && adx < D.sight && Math.abs(dy) < 70 && (Math.sign(dx) === e.dir || adx < 60)) this.alertEnemy(e, now);
    if (e.aggro && e.sees) e.aggroT = Math.max(e.aggroT, 3);
    if (e.aggro && (e.aggroT <= 0 || !alive)) { e.aggro = false; e.ai = 'patrol'; e.walkNav = false; e.path = null; }
    if (onGround && !e.wasGround) { if (e.ai === 'leap') this.heavyStomp(e); else if (e.airT > 0.25) this.fxDust(b.center.x, b.bottom, 3); }
    e.airT = onGround ? 0 : e.airT + dt; e.wasGround = onGround;
    if (e.navAir && onGround && now > e.navAirT + 80) e.navAir = false;
    if (!heavy && e.aggro && alive) this.rocketHop(e, now, onGround);

    let fr = 'w';
    if (e.stunT > 0) { if (onGround) b.velocity.x *= Math.pow(0.0005, dt); }
    else if (e.ai === 'alert') { if (onGround) b.velocity.x = 0; fr = 'c'; if (now >= e.aiUntil) e.ai = 'chase'; }
    else if (e.ai === 'windup') {
      b.velocity.x = 0; fr = 'wind'; e.dir = dx > 0 ? 1 : -1;
      if (now >= e.aiUntil) {                                         // leaps at where you'll be when it comes down
        const P = this.predictPlayer(0.8), lx = b.center.x + dx + (P.x - this.player.body.center.x) * TUNE.AI.lead[this.runDiff];
        e.ai = 'leap'; e.aiUntil = now; b.velocity.y = -D.leapV; b.velocity.x = clamp((lx - b.center.x) * 1.6, -210, 210); Sfx.growl(true);
      }
    } else if (e.ai === 'leap') { fr = 'wind'; if (onGround && now > e.aiUntil + 300) e.ai = 'chase'; }
    else if (e.aggro && alive && this.walkerNav(e, dt, now, onGround)) { e.ai = 'chase'; fr = heavy ? 'w' : 'c'; }   // round by the nav graph
    else if (e.aggro && alive) {
      e.ai = 'chase'; fr = heavy ? 'w' : 'c'; e.dir = dx > 0 ? 1 : -1;
      let speed = D.chase;
      if (onGround) {
        const ground = this.standAt(b.center.x + e.dir * (b.halfWidth + 4), b.bottom + 4);
        const wall = e.dir > 0 ? b.blocked.right : b.blocked.left;
        if (!ground && dy < 20) speed = 0;                              // hold the ledge unless the player is below
        if (adx < 8) speed = 0;
        e.jumpCd -= dt;
        if (e.jumpCd <= 0 && (wall || (dy < -36 && adx < 120))) { b.velocity.y = -D.jumpV; e.jumpCd = rand(1.1, 1.8); speed = D.chase; }
        if (heavy) {
          e.leapCd -= dt;
          if (e.leapCd <= 0 && adx < 150 && adx > 30 && Math.abs(dy) < 50 && e.sees) { e.ai = 'windup'; e.aiUntil = now + 480; e.leapCd = rand(2.6, 3.4); Sfx.charge(0.7); }
        }
      }
      b.velocity.x = approach(b.velocity.x, e.dir * speed, (onGround ? 900 : 300) * dt);
    } else {
      e.idleT -= dt;
      if (e.idleT <= 0) { if (e.ai === 'idle') { e.ai = 'patrol'; e.idleT = rand(2, 4); } else { e.ai = 'idle'; e.idleT = rand(0.5, 1.3); } }
      if (e.ai !== 'idle') e.ai = 'patrol';
      if (onGround) {
        const ground = this.standAt(b.center.x + e.dir * (b.halfWidth + 4), b.bottom + 4);
        const wall = e.dir > 0 ? b.blocked.right : b.blocked.left;
        const far = Math.abs(b.center.x - e.homeX) > D.range && Math.sign(b.center.x - e.homeX) === e.dir;
        if (!ground || wall || far) e.dir *= -1;
      }
      b.velocity.x = approach(b.velocity.x, e.ai === 'idle' ? 0 : e.dir * D.patrol, 600 * dt);
    }
    const moving = Math.abs(b.velocity.x) > 8 && onGround;
    if (moving) e.animT += dt * Math.abs(b.velocity.x) / 18;
    const legs = moving ? Math.floor(e.animT) % 4 : 0;
    if (heavy) e.fr = fr === 'wind' ? 'wind' : 'w' + legs;
    else e.fr = !onGround ? 'c1' : (fr === 'c' ? 'c' : 'w') + legs;
  },
  updateDrone(e, dt, now, dx, dy, dist, alive) {
    const b = e.body, D = e.def, p = this.player;
    if (alive && !e.aggro && e.sees && dist < D.sight) { this.alertEnemy(e, now); Sfx.charge(0.3); }
    if (e.aggro && e.sees) e.aggroT = Math.max(e.aggroT, 3);
    if (e.aggro && (e.aggroT <= 0 || !alive)) e.aggro = false;
    let tx, ty;
    if (e.aggro && alive) {                                             // hover where it can see you, apart from the other fliers and off your aim
      if ((e.slotT = (e.slotT || 0) - dt) <= 0) { e.slotT = 0.6; this.droneSlot(e); }
      const side = b.center.x < p.x ? -1 : 1;
      tx = p.x + (e.slotX ?? side * 95); ty = p.y + (e.slotY ?? -60) + Math.sin(e.t * 2.1) * 12;
      if (this.solidAt(tx, ty)) tx = p.x + side * 40;
      if (this.solidAt(tx, ty)) ty = p.y - 30;
      e.dir = dx > 0 ? 1 : -1;
    } else {
      tx = e.homeX + Math.sin(e.t * 0.6) * 50; ty = e.homeY + Math.sin(e.t * 1.7) * 8;
      if (Math.abs(b.velocity.x) > 5) e.dir = b.velocity.x > 0 ? 1 : -1;
    }
    if (e.stunT <= 0) {
      const k = Math.min(1, dt * 2.6);
      b.velocity.x += (clamp((tx - b.center.x) * 2, -100, 100) - b.velocity.x) * k;
      b.velocity.y += (clamp((ty - b.center.y) * 2, -85, 85) - b.velocity.y) * k;
    } else { const f = Math.pow(0.05, dt); b.velocity.x *= f; b.velocity.y *= f; }
    e.dodgeCd = (e.dodgeCd || 0) - dt;
    if (alive && e.aggro && e.stunT <= 0 && e.dodgeCd <= 0 && e.ai !== 'charge' && this.playerAimingAt(e)) {   // you're lining it up: it jinks and finds another spot
      e.dodgeCd = TUNE.AI.droneJink; e.slotT = 0;
      const perp = Math.atan2(dy, dx) + (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2;
      b.velocity.x += Math.cos(perp) * 190; b.velocity.y += Math.sin(perp) * 190;
    }
    e.fireCd -= dt;
    if (e.ai === 'charge') { if (now >= e.aiUntil) { e.ai = 'hover'; if (alive) this.fireBolt(e); e.fireCd = rand(1.4, 2.1); } }
    else if (e.aggro && alive && e.fireCd <= 0 && e.sees && dist < 260 && e.stunT <= 0) { e.ai = 'charge'; e.aiUntil = now + 420; Sfx.charge(0.5); }
    e.fr = e.ai === 'charge' ? 'dc' : Math.floor(e.t * 4) % 2 ? 'd1' : 'd0';
  },

  // ------------------------------------------------------------- humanoid AI ----
  // Shared by Enforcers and Stalkers: vision cone + line of sight, memory of the last known player
  // position (from sight or sound), squad radio alerts, threat evasion and pathfinding over NAV.
  updateHumanoid(e, dt, now, dx, dy, dist, alive) {
    const b = e.body, D = e.def, onGround = b.blocked.down || b.touching.down, pb = this.player.body;
    e.dodgeCd -= dt; e.fleeT -= dt; e.recoil = Math.max(0, e.recoil - 30 * dt);
    if (e.navAir && onGround && now > e.navAirT + 80) e.navAir = false;   // never leave a stale "airborne" flag behind
    const inCone = Math.sign(dx) === e.dir || Math.abs(dx) < 48 || (e.aggro && now - e.lastSeenT < 1500);
    const canSee = alive && e.sees && dist < D.sight && inCone;
    if (canSee) { e.lkx = pb.center.x; e.lky = pb.center.y; e.lkT = now; e.lastSeenT = now; e.lvx = this.pvx; }   // and which way you were heading
    else if (alive && e.flashT > 0) { e.lkx = pb.center.x; e.lky = pb.center.y; e.lkT = now; }   // getting shot gives you away
    if (alive && e.ai === 'idle' && (canSee || e.aggro)) this.alertHumanoid(e, now, true);
    if (onGround && e.airT > 0.25) this.fxDust(b.center.x, b.bottom, 3);
    e.airT = onGround ? 0 : e.airT + dt;
    const c = { onGround, dx, dy, dist, alive, canSee };
    let move = 'free';
    if (e.stunT > 0) { if (onGround) b.velocity.x *= Math.pow(0.002, dt); }
    else {
      if (alive && e.ai !== 'lunge' && e.ai !== 'dodge') this.evade(e, now, onGround);
      move = e.kind === 'harpooner' ? this.thinkHarpooner(e, dt, now, c) : e.kind === 'cloaker' ? this.thinkCloaker(e, dt, now, c) : e.kind === 'pyro' || e.kind === 'tarspit' || e.kind === 'grenadier' ? this.thinkPyro(e, dt, now, c) : e.kind === 'duelist' ? this.thinkDuelist(e, dt, now, c) : e.kind === 'sapper' ? this.thinkSapper(e, dt, now, c) : e.kind === 'rocketeer' ? this.thinkRocketeer(e, dt, now, c) : e.kind === 'enforcer' ? this.thinkEnforcer(e, dt, now, c) : (e.kind === 'bulwark' || e.kind === 'mirror') ? this.thinkBulwark(e, dt, now, c) : e.kind === 'sniper' ? this.thinkSniper(e, dt, now, c) : this.thinkStalker(e, dt, now, c);
    }
    if (move !== 'free' && e.fleeT > 0 && onGround) {                 // live grenade close by: clear the blast
      b.velocity.x = approach(b.velocity.x, e.fleeDir * D.speed * 1.15, 2400 * dt); e.path = null; e.navAir = false;
    } else if (move === 'path') {
      const going = this.followPath(e, now, onGround, D.speed, dt);
      if (!going && onGround) b.velocity.x = e.kind === 'stalker' && canSee && Math.abs(dx) > 10 ? approach(b.velocity.x, Math.sign(dx) * D.speed, 1800 * dt) : approach(b.velocity.x, 0, 1600 * dt);
      if (going && onGround && !e.navAir && Math.abs(b.velocity.x) < 8) {
        e.stuckT += dt; if (e.stuckT > 0.8) { e.path = null; e.stuckT = 0; e.repickT = 0; e.repathT = 0; }
      } else e.stuckT = 0;
    } else if (move === 'hold' && onGround) b.velocity.x = approach(b.velocity.x, 0, 1600 * dt);
    // facing + aim
    if (isRifleman(e)) {
      if (e.ai === 'aim' || e.ai === 'burst') e.dir = Math.cos(e.aimA) >= 0 ? 1 : -1;
      else if (canSee) { e.aimA = Math.atan2(pb.center.y - (e.y - 2), pb.center.x - e.x); e.dir = dx >= 0 ? 1 : -1; }
      else { if (Math.abs(b.velocity.x) > 10) e.dir = b.velocity.x > 0 ? 1 : -1; e.aimA = e.dir > 0 ? 0.25 : Math.PI - 0.25; }
    } else if (e.kind === 'bulwark' || e.kind === 'mirror') {
      e.dir = e.face >= 0 ? 1 : -1;                                     // turns slowly: jump over it to hit its back
    } else if (e.ai !== 'recover' && e.ai !== 'lunge') {
      if (Math.abs(b.velocity.x) > 10) e.dir = b.velocity.x > 0 ? 1 : -1; else if (canSee) e.dir = dx >= 0 ? 1 : -1;
    }
    // animation
    const vx = b.velocity.x, moving = onGround && Math.abs(vx) > 15;
    if (moving) e.animT += dt * Math.abs(vx) / 200 * 13;
    let run = Math.floor(e.animT) % 6; if (Math.sign(vx) !== e.dir) run = 5 - run;
    if (isRifleman(e)) e.fr = !onGround ? (b.velocity.y < 0 ? 'jump' : 'fall') : moving ? 'run' + run : Math.floor(e.t * 1.6) % 2 ? 'idle1' : 'idle0';
    else if (e.kind === 'bulwark' || e.kind === 'mirror') e.fr = e.ai === 'windup' || e.ai === 'charge' ? 'bash' : e.ai === 'stagger' ? 'stagger' : moving ? 'run' + run : Math.floor(e.t * 1.2) % 2 ? 'idle1' : 'idle0';
    else e.fr = e.ai === 'windup' || e.ai === 'plant' || e.ai === 'reveal' ? 'crouch' : e.ai === 'lunge' || e.ai === 'strike' || e.ai === 'throw' ? 'lunge' : !onGround ? 'air' : moving ? 'run' + run : e.aggro && e.kind === 'stalker' ? 'crouch' : 'idle';
  },

  thinkEnforcer(e, dt, now, c) {
    const T = TUNE.ENFORCER;
    e.fireCd -= dt; e.repickT -= dt;
    switch (e.ai) {
      case 'idle': this.lookAround(e, dt); return 'hold';
      case 'dodge': if (c.onGround && now > e.aiUntil + 120) { e.ai = 'engage'; e.repickT = 0; } return 'free';
      case 'engage': {
        if (!c.alive) { e.ai = 'idle'; e.aggro = false; return 'hold'; }
        if (now - e.lkT > 1500) { this.startSearch(e, now); return 'path'; }   // lost you: go and look, as a squad
        if (this.seekPack(e, now)) return 'path';               // hurt and a medkit is close: go take it (denies it to you)
        if (!e.retreated && e.hp < e.def.hp * 0.35) {          // badly hurt: fall back out of sight, once
          e.retreated = true; e.ai = 'retreat'; e.aiUntil = now + 3000; this.pickPosition(e, 'retreat'); Sfx.radio(); this.bark(e, 'FALL BACK!'); return 'path';
        }
        if (c.onGround && !e.navAir && this.underFire(e, now)) {   // pinned down: break line of sight and let a squadmate cover
          e.suppCd = now + TUNE.AI.suppressCd; e.ai = 'cover'; e.reloadT = 0.7; e.aiUntil = now + 1800; this.pickPosition(e, 'cover'); this.coverMe(e); return 'path';
        }
        if (c.onGround && !e.navAir && e.dodgeCd <= 0 && c.dist < 260 && this.playerAimingAt(e)) {   // you're lining it up: hop out of the line
          e.dodgeCd = e.def.dodgeCd * 1.6;
          if (Math.random() < e.def.dodge * TUNE.AI.sidestep) { this.humanoidDodge(e, now, this.sideStep(e, c) * 170, -250); return 'free'; }
        }
        if (c.onGround && !e.navAir && (e.repickT <= 0 || (c.dist < 64 && e.repickT < 1.5))) {   // reposition; kite if you get close
          e.repickT = rand(2.4, 3.6);
          if (!this.pickPosition(e, 'attack')) this.pathTo(e, navBelow(e.lkx, e.lky - 4), 160);
        }
        if (c.canSee && c.onGround && !e.navAir && e.fireCd <= 0 && this.runDiff > 0 && now > this.kegT) {   // a drum by your feet: light it
          const k = this.barrelNearYou(e);
          if (k) { this.kegT = now + TUNE.AI.kegCd; e.keg = k; this.aimStart(e, now, T.aimMs); e.aimA = Math.atan2(k.y - 1 - (e.y - 2), k.x - e.x); this.bark(e, 'BARREL!'); Sfx.laser(); return 'hold'; }
        }
        if (c.canSee && c.onGround && !e.navAir && e.fireCd <= 0 && c.dist < 300) {
          this.aimStart(e, now, T.aimMs); e.aimA = this.leadAngle(e); Sfx.laser(); return 'hold';
        }
        return 'path';
      }
      case 'aim': {
        const k = (now - e.aimStart) / T.aimMs, keg = e.keg;
        if (keg) {                                             // on the drum: it doesn't need to see you, only the drum
          if (!keg.active || keg.burning || keg.fuse > 0 || !this.los(e.x, e.y - 2, keg.x, keg.y - 4)) { e.keg = null; e.ai = 'engage'; e.fireCd = 0.3; return 'hold'; }
          e.aimA = Math.atan2(keg.y - 1 - (e.y - 2), keg.x - e.x);
        } else if (k < 0.7) e.aimA = this.leadAngle(e);       // tracks, then locks: the last 30% is your dodge window
        if (!keg && !c.canSee && k < 0.5) { e.ai = 'engage'; e.fireCd = 0.35; return 'hold'; }
        if (k < 0.7 && c.onGround && this.underFire(e, now)) {   // shot up while lining up: it gives up the shot and ducks
          e.keg = null; e.suppCd = now + TUNE.AI.suppressCd; e.ai = 'cover'; e.reloadT = 0.7; e.aiUntil = now + 1800; e.fireCd = 0.3; this.pickPosition(e, 'cover'); this.coverMe(e); return 'path';
        }
        if (now >= e.aiUntil) { e.ai = 'burst'; e.shotsLeft = T.burst; e.shotT = 0; }
        return 'hold';
      }
      case 'burst': {
        e.shotT -= dt;
        if (e.shotT <= 0 && e.shotsLeft > 0) { this.enforcerShoot(e); e.shotsLeft--; e.shotT = T.burstGap / 1000; }
        if (e.shotsLeft <= 0 && e.shotT <= 0) {
          if (e.keg && e.keg.active && !e.keg.burning && !(e.keg.fuse > 0)) this.kegT = now + 1200;   // the drum's still cold: it, or another, can try again soon
          e.bursts++; e.fireCd = rand(0.7, 1.1); e.keg = null;
          if (e.bursts >= 2) { e.bursts = 0; e.ai = 'cover'; e.reloadT = 1.4; e.aiUntil = now + 2600; this.pickPosition(e, 'cover'); this.coverMe(e, true); }
          else e.ai = 'engage';
        }
        return 'hold';
      }
      case 'cover':                                            // duck out of sight to reload
        if (!e.path || e.pathI >= e.path.length) e.reloadT -= dt;
        if (e.reloadT <= 0 || now > e.aiUntil + 1500) { e.ai = 'engage'; e.repickT = 0; e.fireCd = 0.2; }
        return 'path';
      case 'retreat': if (now > e.aiUntil) { e.ai = 'engage'; e.repickT = 0; } return 'path';
      case 'getpack': if (!this.packStep(e)) { e.ai = 'engage'; e.repickT = 0; } return 'path';
      case 'search': return this.searchStep(e, dt, now, c);
    }
    return 'hold';
  },

  thinkStalker(e, dt, now, c) {
    const T = TUNE.STALKER, b = e.body, p = this.player;
    e.attackCd -= dt; e.repathT -= dt;
    switch (e.ai) {
      case 'idle': this.lookAround(e, dt, 0.7); return 'hold';
      case 'dodge': if (c.onGround && now > e.aiUntil + 120) { e.ai = 'hunt'; e.repathT = 0; } return 'free';
      case 'windup':
        e.dir = c.dx >= 0 ? 1 : -1;
        if (now >= e.aiUntil) { e.ai = 'lunge'; e.aiUntil = now; b.velocity.x = e.dir * T.lunge; b.velocity.y = -170; Sfx.whoosh(); }
        return 'hold';
      case 'lunge':
        if (c.onGround && now > e.aiUntil + 150) { e.ai = 'hunt'; e.attackCd = rand(0.7, 1.0); e.repathT = 0; }
        return 'free';
      case 'recover':
        if (c.onGround && now > e.aiUntil + 150) { e.ai = 'hunt'; e.repathT = 0; }
        return 'free';
      case 'hunt': {
        if (!c.alive || now - e.lkT > 6000) { e.ai = 'idle'; e.aggro = false; e.path = null; return 'hold'; }
        if (c.onGround && c.canSee && Math.abs(c.dx) < 76 && Math.abs(c.dy) < 26 && e.attackCd <= 0) {
          e.ai = 'windup'; e.aiUntil = now + T.windupMs; e.path = null; Sfx.hiss(); return 'hold';
        }
        if (c.onGround && e.dodgeCd <= 0 && c.dist < 240 && this.playerAimingAt(e)) {   // you're shooting at it: leap
          e.dodgeCd = e.def.dodgeCd;
          if (Math.random() < e.def.dodge) { this.humanoidDodge(e, now, (c.dist > 80 ? Math.sign(c.dx) : -Math.sign(c.dx)) * 230, -330); return 'free'; }
        }
        if (c.onGround && !e.navAir && e.repathT <= 0) {
          e.repathT = 0.35;
          const fresh = now - e.lastSeenT < 1200, pb = p.body;
          let gx = fresh ? pb.center.x : e.lkx;
          const gy = fresh ? pb.bottom - 2 : e.lky;
          if (fresh && Math.sign(e.x - p.x) === this.facing && c.dist > 110) gx = clamp(p.x - this.facing * 56, 40, LW - 40);   // circle round behind you
          if (!this.pathTo(e, navBelow(gx, gy), 160)) this.pathTo(e, navBelow(fresh ? pb.center.x : e.lkx, gy), 160);
        }
        return 'path';
      }
    }
    return 'hold';
  },
  // Bulwark: advances behind a riot shield that stops nails, pellets and saws from the front.
  // It turns slowly, so getting over or behind it is the answer (or rails, lightning and explosives).
  thinkBulwark(e, dt, now, c) {
    const T = TUNE.BULWARK, b = e.body;
    e.attackCd -= dt; e.repathT -= dt;
    if (e.aggro && c.alive && e.ai !== 'charge' && e.ai !== 'stagger' && e.ai !== 'idle') e.face = approach(e.face, c.dx >= 0 ? 1 : -1, T.turnRate * dt);
    e.shieldUp = e.ai !== 'stagger' && !e.mirrorBroken;
    switch (e.ai) {
      case 'idle': this.lookAround(e, dt); e.face = e.dir; return 'hold';
      case 'stagger': if (now > e.aiUntil) e.ai = 'advance'; return 'hold';
      case 'windup':
        if (now >= e.aiUntil) { e.ai = 'charge'; e.aiUntil = now + 280; b.velocity.x = e.dir * T.bashSpeed; Sfx.whoosh(); }
        return 'hold';
      case 'charge':
        if (now > e.aiUntil) { e.ai = 'recover'; e.aiUntil = now + 450; } else b.velocity.x = e.dir * T.bashSpeed;
        return 'free';
      case 'recover': if (now > e.aiUntil) e.ai = 'advance'; return 'hold';
      case 'getpack': if (!this.packStep(e)) { e.ai = 'advance'; e.repathT = 0; } return 'path';
      default: {
        if (!c.alive || now - e.lkT > 7000) { e.ai = 'idle'; e.aggro = false; e.path = null; return 'hold'; }
        if (this.seekPack(e, now)) return 'path';
        const facingYou = Math.sign(c.dx) === e.dir && Math.abs(e.face) > 0.6;
        if (c.onGround && c.canSee && Math.abs(c.dx) < 76 && Math.abs(c.dy) < 22 && e.attackCd <= 0 && facingYou) {
          e.ai = 'windup'; e.aiUntil = now + T.bashMs; e.attackCd = rand(1.6, 2.2); e.path = null; Sfx.growl(true); return 'hold';
        }
        if (Math.abs(c.dx) < 40 && Math.abs(c.dy) < 20) { e.path = null; return 'hold'; }   // in your face: hold the shield line
        if (c.onGround && !e.navAir && e.repathT <= 0) {
          e.repathT = 0.5;
          const fresh = now - e.lastSeenT < 1500, pb = this.player.body;
          this.pathTo(e, navBelow(fresh ? pb.center.x : e.lkx, fresh ? pb.bottom - 2 : e.lky), 160);
        }
        return 'path';
      }
    }
  },
  // Mender: floating medic. Tethers to the most hurt ally, hovers on the far side of it out of your sight,
  // backs off when you close in and jinks sideways when you shoot at it. Kill it first.
  updateMender(e, dt, now, dx, dy, dist, alive) {
    const b = e.body, T = TUNE.MENDER, p = this.player;
    e.retargetT -= dt; e.dodgeCd -= dt;
    if (alive && !e.aggro && e.sees && dist < e.def.sight) { e.aggro = true; this.popAlert(e); Sfx.charge(0.3); }
    if (e.retargetT <= 0) {
      e.retargetT = 0.4;
      let best = null, bestS = 1e9;
      for (const o of this.enemies.getChildren()) {
        if (!o.alive || o === e || o.kind === 'mender' || o.def.boss || o.def.miniBoss) continue;
        const d = Math.hypot(o.x - e.x, o.y - e.y); if (d > 380) continue;
        const s = (o.hp / o.def.hp) * 300 + d * 0.5 - (isHumanoid(o) ? 40 : 0);
        if (s < bestS) { bestS = s; best = o; }
      }
      e.patient = best;
    }
    const pt = e.patient && e.patient.alive ? e.patient : null, pcx = p.body.center.x, pcy = p.body.center.y;
    let tx = e.homeX + Math.sin(e.t * 0.6) * 30, ty = e.homeY + Math.sin(e.t * 1.7) * 6;
    if (pt) {
      const away = Math.sign(pt.x - p.x) || 1;
      let bestS = -1e9;
      for (const [ox, oy] of [[away * 46, -34], [away * 30, -54], [away * 64, -12], [away * 18, -30], [0, -62]]) {
        const cx = pt.x + ox, cy = pt.y + oy;
        if (this.solidAt(cx, cy)) continue;
        let s = -Math.hypot(cx - b.center.x, cy - b.center.y) * 0.2;
        if (!this.los(cx, cy, pcx, pcy)) s += 100;                                  // hidden from you
        if (this.los(cx, cy, pt.body.center.x, pt.body.center.y)) s += 50;          // beam can still reach
        if (s > bestS) { bestS = s; tx = cx; ty = cy; }
      }
    }
    if (alive && e.aggro && dist < 110) { tx = b.center.x - Math.sign(dx) * 120; ty = b.center.y - 30; }   // too close: back off
    if (alive && e.dodgeCd <= 0 && this.playerAimingAt(e)) {
      e.dodgeCd = 1.0;
      const perp = Math.atan2(dy, dx) + (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2;
      b.velocity.x += Math.cos(perp) * 220; b.velocity.y += Math.sin(perp) * 220; Sfx.whoosh();
    }
    if (e.stunT <= 0) {
      const k = Math.min(1, dt * 3);
      b.velocity.x += (clamp((tx - b.center.x) * 2.2, -110, 110) - b.velocity.x) * k;
      b.velocity.y += (clamp((ty - b.center.y) * 2.2, -90, 90) - b.velocity.y) * k;
    } else { const f = Math.pow(0.05, dt); b.velocity.x *= f; b.velocity.y *= f; }
    e.healing = false;
    if (pt && pt.hp < pt.def.hp && Math.hypot(pt.x - e.x, pt.y - e.y) < T.range && this.los(e.x, e.y, pt.body.center.x, pt.body.center.y)) {
      e.healing = true;
      const amt = Math.min(pt.def.hp - pt.hp, T.heal * dt);
      pt.hp += amt; pt.healAcc += amt; if (!pt.healFlushAt) pt.healFlushAt = now + 450;
      if (Math.random() < 0.3) this.fx.emit(pt.body.center.x + rand(-5, 5), pt.body.center.y + rand(-6, 6), { n: 1, speed: [10, 30], angle: -Math.PI / 2, spread: 0.6, life: [0.3, 0.6], size: [2, 1], cols: [0xffffff, 0x7dff8a], add: true });
    }
    e.dir = (pt ? pt.x - e.x : dx) >= 0 ? 1 : -1;
    e.fr = e.healing ? 'mh' : Math.floor(e.t * 8) % 2 ? 'm1' : 'm0';
  },

  // Each foe kind's own drawing: glows, beams, tells and the parts it carries. Its ENEMY record names the method as
  // visuals, and syncVisuals calls it every frame after the shared marks. g is the arc layer (this.laserG is the
  // other) and now the scene clock.
  visMolten(e, g, now) { e.glow.setPosition(e.x, e.y + 2).setScale((0.5 + e.def.tier * 0.35) * (0.9 + Math.sin(now / 120 + e.x) * 0.1)); },
  visBurrower(e, g, now) {
    if (e.under) return;
    e.rotation = e.ai === 'erupt' ? Math.atan2(e.body.velocity.y, e.body.velocity.x) + Math.PI / 2 : Math.sin(e.t * 6) * 0.12;       // nose-first through the air
    e.glow.setPosition(e.x + Math.sin(e.rotation) * 10, e.y - Math.cos(e.rotation) * 10).setScale(e.ai === 'erupt' ? 0.9 : 0.6);
  },
  visLinker(e, g, now) {
    e.glow.setPosition(e.x + e.dir * 2, e.y).setScale(e.phase !== 'off' ? 0.6 + Math.random() * 0.15 : 0.4);
    const B = e.beam;
    if (B && B.live) {                                                   // live fence: hot core, wobbling halo, the odd arc
      g.lineStyle(6, 0x1a8ad0, 0.3).lineBetween(B.x0, B.y0, B.x1, B.y1);
      g.lineStyle(3, 0x60e0ff, 0.75).lineBetween(B.x0, B.y0 + rand(-1, 1), B.x1, B.y1 + rand(-1, 1));
      g.lineStyle(1, 0xffffff, 1).lineBetween(B.x0, B.y0, B.x1, B.y1);
      if (Math.random() < 0.25) this.zap(g, B.x0, B.y0, B.x1, B.y1);
    } else if (B && Math.random() < 0.75) {                              // charging: thin dashed flicker
      const len = Math.hypot(B.x1 - B.x0, B.y1 - B.y0) || 1, ux = (B.x1 - B.x0) / len, uy = (B.y1 - B.y0) / len, ph = (now / 25) % 8;
      this.laserG.lineStyle(1, 0x60e0ff, 0.3 + Math.random() * 0.4);
      for (let d = ph; d < len; d += 8) this.laserG.lineBetween(B.x0 + ux * d, B.y0 + uy * d, B.x0 + ux * Math.min(len, d + 4), B.y0 + uy * Math.min(len, d + 4));
    }
  },
  visHarpooner(e, g, now) {
    e.glow.setPosition(e.x + e.dir * 5, e.y - 9 + (e.fr === 'crouch' ? 1 : 0)).setScale(e.ai === 'windup' ? 0.7 : 0.3);
    const hx = e.x + e.dir * 4, hy = e.y - 6;
    if (e.hk) {                                                          // the chain
      const hk = e.hk, n = Math.max(1, Math.floor(Math.hypot(hk.x - hx, hk.y - hy) / 3));
      this.laserG.lineStyle(1, 0x4a525c, 0.9).lineBetween(hx, hy, hk.x, hk.y);
      for (let i = 1; i < n; i++) this.laserG.fillStyle(i % 2 ? 0xa0aab6 : 0x5a636e, 1).fillRect(Math.round(hx + (hk.x - hx) * i / n) - 1, Math.round(hy + (hk.y - hy) * i / n) - 1, 2, 2);
    } else if (e.ai === 'windup') {                                      // dotted sight line, blinks once it locks
      const k = clamp(1 - (e.aiUntil - now) / TUNE.HARPOON.windMs, 0, 1), locked = k > 0.7, ca = Math.cos(e.aimA), sa = Math.sin(e.aimA);
      const col = locked ? 0xffffa0 : 0xffd040, a = locked ? (Math.floor(now / 40) % 2 ? 0.9 : 0.4) : 0.25 + 0.4 * k;
      for (let d = 6; d < 30 + 70 * k; d += 5) this.laserG.fillStyle(col, a).fillRect(Math.round(hx + ca * d), Math.round(hy + sa * d), 2, 1);
    }
  },
  visMender(e, g, now) {
    e.glow.setPosition(e.x, e.y + 2).setScale(e.healing ? 0.9 + Math.sin(now / 50) * 0.15 : 0.6);
    const pt = e.patient;
    if (e.healing && pt && pt.alive) {                                   // healing tether: wavy green line
      const x0 = e.x, y0 = e.y + 5, x1 = pt.body.center.x, y1 = pt.body.center.y, len = Math.hypot(x1 - x0, y1 - y0) || 1;
      const nx = -(y1 - y0) / len, ny = (x1 - x0) / len, n = Math.max(3, Math.round(len / 6));
      let px = x0, py = y0;
      for (let i = 1; i <= n; i++) {
        const t = i / n, w = Math.sin(t * 9 - now / 60) * 2.5 * Math.sin(t * Math.PI), qx = x0 + (x1 - x0) * t + nx * w, qy = y0 + (y1 - y0) * t + ny * w;
        g.lineStyle(3, 0x30ff80, 0.25).lineBetween(px, py, qx, qy); g.lineStyle(1, 0xc8ffe0, 0.85).lineBetween(px, py, qx, qy);
        px = qx; py = qy;
      }
    }
  },
  visBuzzsaw(e, g, now) {                                              // spins (set here, after updateEnemies' wobble decay); cyan while it's yours
    e.rotation = (now / (e.owned > 0 ? 20 : 34)) % (Math.PI * 2);
    e.glow.setPosition(e.x, e.y).setTint(e.owned > 0 ? 0x46e6ff : 0xff8a20).setScale(0.5 + Math.random() * 0.12);
  },
  visMagnet(e, g, now) {                                               // the field: a slow ring of red/blue ticks; it tightens and flares on the tell
    const tell = e.ai === 'tell', k = tell ? clamp(1 - (e.aiUntil - now) / TUNE.MAGNET.tellMs, 0, 1) : 0, R = TUNE.MAGNET.field * (1 - 0.35 * k), cx = e.body.center.x, cy = e.body.center.y;
    e.glow.setPosition(cx, cy).setScale(tell ? 0.8 + k * 0.6 : 0.55 + Math.sin(now / 200) * 0.05).setAlpha(tell ? 0.9 : 0.55);
    const n = 20, ph = now / 900;
    for (let i = 0; i < n; i++) {
      const th = ph + i / n * Math.PI * 2, x0 = cx + Math.cos(th) * R, y0 = cy + Math.sin(th) * R;
      g.lineStyle(1, i % 2 ? 0xff4a3a : 0x4a7aff, tell ? 0.45 + 0.5 * k : 0.34).lineBetween(x0, y0, cx + Math.cos(th + 0.12) * R, cy + Math.sin(th + 0.12) * R);
    }
    if (tell) g.lineStyle(1, 0xc8d8ff, 0.3 + 0.5 * k).strokeCircle(cx, cy, R * 0.45);
  },
  visClaw(e, g, now) {                                                 // trolley, cable and the claw on the end
    this.laserG.fillStyle(0x3a3f47, 1).fillRect(Math.round(e.x) - 7, Math.round(e.homeY) - 14, 14, 6); this.laserG.fillStyle(0xe8b422, 1).fillRect(Math.round(e.x) - 7, Math.round(e.homeY) - 9, 14, 1);
    this.laserG.lineStyle(1, 0x8a94a0, 1).lineBetween(e.x, e.homeY - 8, e.x, e.body.top);
    e.glow.setPosition(e.x, e.homeY - 11).setScale(e.ai === 'drop' ? 0.5 : 0.3).setTint(e.ai === 'drop' ? 0xff3020 : 0xffb040);
  },
  visEcho(e, g, now) { e.setAlpha(0.45 + Math.random() * 0.25); e.glow.setPosition(e.x, e.y); },
  visGrenadier(e, g, now) { const w = e.ai === 'windup'; e.glow.setPosition(e.x + e.dir * (w ? 5 : 2), e.y - 8).setScale(w ? 0.5 : 0.25); },
  visCinder(e, g, now) { e.rotation = e.spinA; e.glow.setPosition(e.x, e.y).setScale(e.owned > 0 ? 0.8 : 0.55); if (Math.random() < 0.6) this.fxFire(e.x + rand(-4, 4), e.y - 2, 1); },
  visBanner(e, g, now) {                                               // the banner's healing ring
    if (e.ai === 'plant') {
      const R0 = TUNE.BANNER.radius; g.lineStyle(1, 0x5cff7a, 0.35 + 0.15 * Math.sin(now / 200));
      for (let j = 0; j < 24; j += 2) { const a0 = j / 24 * Math.PI * 2 + now / 1500; g.beginPath(); g.arc(e.x, e.y, R0, a0, a0 + Math.PI / 24, false); g.strokePath(); }
    }
  },
  visGatling(e, g, now) {
    if (e.ai === 'spin' || e.ai === 'fire') { const a = e.aimA, mx = e.x + Math.cos(a) * 14, my = e.y - 4 + Math.sin(a) * 14; if (e.ai === 'spin') this.laserG.lineStyle(1, 0xff3020, 0.15 + 0.3 * Math.random()).lineBetween(mx, my, mx + Math.cos(a) * 200, my + Math.sin(a) * 200); }
    if (e.ai === 'hot' && Math.random() < 0.4) this.fx.emit(e.x + e.dir * 12, e.y - 4, { n: 1, angle: -Math.PI / 2, spread: 0.4, speed: [10, 30], life: [0.4, 0.8], size: [3, 6], cols: [0xe8e8e8, 0xb8b8b8], alpha: [0.4, 0], g: -30 });
  },
  visJelly(e, g, now) {                                                // tendrils trailing beneath it
    e.glow.setPosition(e.x, e.y - 2).setScale(0.45 + 0.08 * Math.sin(now / 160));
    for (let k = -1; k <= 1; k++) { let px = e.x + k * 4, py = e.body.bottom; for (let j = 1; j <= 6; j++) { const qx = e.x + k * 4 + Math.sin(now / 140 + j * 0.9 + k) * 2.5, qy = e.body.bottom + j * TUNE.JELLY.drop / 6; g.lineStyle(1, e.zapping ? 0xffffff : 0xff90e8, e.zapping ? 0.9 : 0.5).lineBetween(px, py, qx, qy); px = qx; py = qy; } }
  },
  visCopycat(e, g, now) {                                              // it carries a copy of your gun under it
    e.icon.setPosition(e.x, e.body.bottom + 4).setFlipX(e.dir < 0);
    if (e.ai === 'aim') { const pb = this.player.body; this.laserG.lineStyle(1, 0xff3020, 0.3 + 0.5 * Math.random()).lineBetween(e.x, e.y, pb.center.x, pb.center.y); }
  },
  visBulldozer(e, g, now) { if (Math.abs(e.body.velocity.x) > 5 && Math.random() < 0.3) this.fxSmoke(e.x - e.dir * 10, e.body.top + 2, 1, 0.5); },
  visSponge(e, g, now) {
    if (e.charge > 0) { const k = e.charge / TUNE.SPONGE.cap; e.setScale((e.growS || 1) * (1 + 0.25 * k)); if (Math.random() < k * 0.5) this.fx.emit(e.body.center.x + rand(-6, 6), e.body.center.y + rand(-6, 6), { n: 1, speed: [5, 20], life: [0.2, 0.4], size: [2, 1], cols: [0xffe46a, 0xffa030], add: true }); }
  },
  visLeaper(e, g, now) {                                               // the target ring on the floor where it'll land
    if (e.ai === 'crouch' || e.ai === 'air') {
      const k = e.ai === 'crouch' ? 1 - (e.aiUntil - now) / TUNE.LEAPER.tellMs : 1, r = 18 - 8 * k;
      g.lineStyle(1, 0xff3020, 0.5 + 0.4 * Math.sin(now / 50)); g.strokeEllipse(e.tx, e.ty - 1, r * 2, r * 0.6); g.lineBetween(e.tx - 3, e.ty - 1, e.tx + 3, e.ty - 1);
    }
  },
  visPorcupine(e, g, now) { if (e.ai === 'bristle' && Math.random() < 0.5) this.fxSparks(e.x + rand(-8, 8), e.body.top + rand(0, 4), 1, -Math.PI / 2, 1.2, [20, 60]); },
  visZealot(e, g, now) {                                               // its halo brightens with every soul it drinks
    e.glow.setPosition(e.x, e.body.top - 3).setScale(0.3 + e.souls * 0.12).setAlpha(0.5 + e.souls * 0.12);
    g.lineStyle(1, 0xffe080, 0.6 + e.souls * 0.12); g.strokeEllipse(e.x + e.dir, e.body.top - 3, 10 + e.souls * 2, 3);
  },
  visBerserker(e, g, now) {
    e.glow.setPosition(e.x, e.y).setAlpha(e.rage ? 0.55 + 0.2 * Math.sin(now / 80) : 0); if (e.rage && Math.random() < 0.3) this.fx.emit(e.x + rand(-4, 4), e.body.top, { n: 1, angle: -Math.PI / 2, spread: 0.4, speed: [10, 30], life: [0.3, 0.6], size: [2, 4], cols: [0xff6060, 0xc02020], alpha: [0.5, 0], g: -20 });
  },
  visHeadsman(e, g, now) { if (e.ai === 'raise' && Math.floor(now / 90) % 2) { g.lineStyle(1, 0xff3020, 0.7); g.strokeRect(e.x + e.dir * 20 - 22, e.body.top - 4, 44, e.body.height + 8); } },
  visThundercloud(e, g, now) {                                         // while it charges, a flickering line to the floor where it'll strike
    if (e.ai === 'charge') for (let y = e.body.bottom; y < e.strikeY; y += 8) this.laserG.lineStyle(1, 0xa0c8ff, 0.2 + 0.4 * Math.random()).lineBetween(e.x, y, e.x, y + 4);
    if (Math.random() < 0.12) this.fx.emit(e.x + rand(-10, 10), e.body.bottom, { n: 1, angle: Math.PI / 2, spread: 0.1, speed: [80, 120], life: [0.3, 0.5], size: [1, 1], cols: [0x80a8d0], alpha: [0.6, 0] });
  },
  visForeman(e, g, now) {
    if (e.phase >= 2 && Math.random() < 0.3) this.fxSmoke(e.x + rand(-12, 12), e.body.top + 4, 1, 0.6);
    if (e.phase === 3 && Math.random() < 0.25) this.fxSparks(e.x + rand(-14, 14), e.body.center.y + rand(-8, 8), 2, 0, Math.PI * 2, [40, 140]);
    if (e.ai === 'magnet' && this.state !== 'dead') { const pb = this.player.body, mx = e.x + e.dir * 22, my = e.y - 2; for (let k = 0; k < 3; k++) { const t = (now / 300 + k / 3) % 1; g.lineStyle(1, 0x80c8ff, 0.6 * (1 - t)).lineBetween(mx + (pb.center.x - mx) * t, my + (pb.center.y - my) * t - 4, mx + (pb.center.x - mx) * t, my + (pb.center.y - my) * t + 4); } }
    if (e.ai === 'slamTell' && Math.floor(now / 80) % 2) { g.lineStyle(1, 0xff3020, 0.7); g.strokeRect(e.body.left - 3, e.body.top - 3, e.body.width + 6, e.body.height + 6); }
  },
  visVortex(e, g, now) {
    e.glow.setPosition(e.x, e.y).setScale(e.ai === 'spin' ? 0.8 + Math.random() * 0.2 : e.ai === 'tell' ? 0.5 + 0.3 * Math.random() : 0.35);
    if (e.ai === 'spin') { const R0 = TUNE.VORTEX.range; for (let k = 0; k < 3; k++) { const r = R0 * (1 - ((now / 700 + k / 3) % 1)), a0 = now / 180 + k * 2; g.lineStyle(1, 0x9ad8ff, 0.45 * (1 - r / R0) + 0.1); g.beginPath(); g.arc(e.x, e.y, r, a0, a0 + 1.6, false); g.strokePath(); } }
  },
  visPylon(e, g, now) {
    const k = e.chargeT / TUNE.PYLON.charge;
    e.glow.setPosition(e.x, e.body.top + 2).setScale(0.3 + 0.7 * k + (k > 0 ? Math.random() * 0.15 : 0));
    if (k > 0.4) { g.lineStyle(1, 0x80c8ff, 0.25 + 0.35 * k); const R0 = TUNE.PYLON.range; for (let j = 0; j < 24; j += 2) { const a0 = j / 24 * Math.PI * 2 + now / 900; g.beginPath(); g.arc(e.x, e.body.top + 2, R0, a0, a0 + Math.PI / 24, false); g.strokePath(); } }
    if (k > 0 && Math.random() < k) this.zap(g, e.x, e.body.top + 2, e.x + rand(-10, 10), e.body.top + rand(-8, 6));
  },
  visTorcher(e, g, now) {                                              // the pilot light, and the flame when it sprays
    e.glow.setPosition(e.x + e.dir * 10, e.y - 2).setScale(e.ai === 'spray' ? 0.7 + Math.random() * 0.2 : 0.25).setAlpha(e.ai === 'cool' ? 0.3 : 0.8);
  },
  visSporepod(e, g, now) { e.glow.setPosition(e.x, e.y).setScale(0.5 + 0.15 * Math.sin(now / 300) + (e.fr === 'puff' ? 0.3 : 0)); },
  visSpotter(e, g, now) {                                              // the red eye, and its searchlight on you
    e.glow.setPosition(e.x + e.dir * 2, e.y + 1).setScale(0.25 + 0.35 * (e.lockT / TUNE.SPOTTER.lock));
    if (e.lockT > 0 && e.sees && this.state !== 'dead') {
      const pb = this.player.body, ang = Math.atan2(pb.center.y - e.y, pb.center.x - e.x), L = Math.hypot(pb.center.x - e.x, pb.center.y - e.y) + 10, px = -Math.sin(ang) * 13, py = Math.cos(ang) * 13, ex2 = e.x + Math.cos(ang) * L, ey2 = e.y + Math.sin(ang) * L;
      this.laserG.fillStyle(0xff2020, 0.05 + 0.12 * e.lockT / TUNE.SPOTTER.lock).fillTriangle(e.x, e.y, ex2 + px, ey2 + py, ex2 - px, ey2 - py);
    }
  },
  visHound(e, g, now) { if (e.ai === 'leap' && Math.random() < 0.6) this.fx.emit(e.x + e.dir * 8, e.y - 3, { n: 1, speed: [0, 5], life: [0.1, 0.2], size: [2, 1], cols: [0xff3020, 0xff8a60], add: true }); },
  visOrbiter(e, g, now) {                                              // its plates, spinning round the core
    const R0 = TUNE.ORBITER.radius, np = e.plates.length;
    e.glow.setPosition(e.x + e.dir * 1, e.y).setScale(e.fr === 'fire' ? 0.6 : 0.35);
    for (let k = 0; k < np; k++) {
      if (e.plates[k] <= 0) continue;
      const a = e.spin + k * Math.PI * 2 / np, hit = now < e.plateHit[k], ax = e.x + Math.cos(a - 0.34) * R0, ay = e.y + Math.sin(a - 0.34) * R0, bx = e.x + Math.cos(a + 0.34) * R0, by = e.y + Math.sin(a + 0.34) * R0;
      g.lineStyle(5, hit ? 0xffffff : 0x2a2e35, 1).lineBetween(ax, ay, bx, by);
      g.lineStyle(2, hit ? 0xffffff : e.plates[k] < TUNE.ORBITER.plateHp * 0.5 ? 0xff8a40 : 0x9aa4b0, 1).lineBetween(ax, ay, bx, by);
    }
  },
  visSwapper(e, g, now) {
    if (e.ai === 'tell') {                                               // the tether: violet dashes crawling from it to you
      const pb = this.player.body, x0 = e.body.center.x, y0 = e.body.center.y, x1 = pb.center.x, y1 = pb.center.y, L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.floor(L / 6)), off = Math.floor(now / 50) % 2;
      g.lineStyle(1, 0xc890ff, 0.85);
      for (let j = off; j < n; j += 2) { const t0 = j / n, t1 = Math.min(1, (j + 1) / n); g.lineBetween(x0 + (x1 - x0) * t0, y0 + (y1 - y0) * t0, x0 + (x1 - x0) * t1, y0 + (y1 - y0) * t1); }
      const k = clamp((e.aiUntil - now) / TUNE.SWAPPER.tellMs, 0, 1);
      g.lineStyle(1, 0xf0d8ff, 0.9); g.strokeCircle(x1, y1, 6 + 14 * k); g.strokeCircle(x0, y0, 6 + 14 * k);
    }
  },
  visScorcher(e, g, now) { if (e.ai === 'run' || Math.random() < 0.3) this.fxFire(e.x + e.dir * 3, e.body.top - 1, 1); },
  visSpikeball(e, g, now) { e.rotation = e.spinA; },
  visWraith(e, g, now) {
    const st = e.ai === 'tell' || e.ai === 'lunge';
    e.setAlpha(e.inWall ? 0.22 : e.ai === 'fade' ? 0.45 : st ? 1 : 0.72 + Math.sin(now / 200) * 0.1);
    e.glow.setPosition(e.x, e.y - 2).setScale(st ? 0.8 + Math.random() * 0.2 : 0.4).setAlpha(e.inWall ? 0.3 : 0.75);
    if (e.ai === 'lunge' || Math.random() < 0.15) this.fx.emit(e.x + rand(-4, 4), e.body.bottom, { n: 1, angle: Math.PI / 2, spread: 0.6, speed: [5, 25], life: [0.3, 0.6], size: [2, 1], cols: [0xd8c8ff, 0x8a6ad0], alpha: [0.6, 0], add: true });
  },
  visChiller(e, g, now) {
    if (Math.random() < 0.12) this.fx.emit(e.x - e.dir * 6, e.y - 4, { n: 1, angle: -Math.PI / 2, spread: 0.5, speed: [5, 20], life: [0.3, 0.6], size: [2, 3], cols: [0xe8f8ff, 0xb8e0f0], alpha: [0.5, 0], g: -10 });
  },
  visLugger(e, g, now) { if (e.carryImg) e.carryImg.setPosition(e.x + e.dir * 2, e.body.top - 8); },
  visBlimp(e, g, now) { e.glow.setPosition(e.x + e.dir * 4, e.body.bottom + 3).setScale(e.bombT < 0.3 ? 0.6 : 0.3); if (e.crash) e.rotation = Math.min(0.8, (e.rotation || 0) + 0.02); },
  visStrider(e, g, now) {
    const ex2 = e.x + e.dir * 4, ey2 = e.body.top + 5;
    e.glow.setPosition(ex2, ey2).setScale(e.ai === 'tell' ? 0.5 + Math.random() * 0.2 : e.ai === 'sweep' ? 0.8 : 0.35);
    if (e.ai === 'tell' || e.ai === 'sweep') {
      const ca = Math.cos(e.beamA), sa = Math.sin(e.beamA); let lx = ex2, ly = ey2;
      for (let k = 0; k < 120 && !this.solidAt(lx + ca * 4, ly + sa * 4); k++) { lx += ca * 4; ly += sa * 4; }
      if (e.ai === 'tell') this.laserG.lineStyle(1, 0xff3020, Math.floor(now / 60) % 2 ? 0.7 : 0.3).lineBetween(ex2, ey2, lx, ly);
      else { g.lineStyle(5, 0xff2010, 0.35).lineBetween(ex2, ey2, lx, ly); g.lineStyle(2, 0xff8060, 0.9).lineBetween(ex2, ey2, lx, ly); g.lineStyle(1, 0xffffff, 1).lineBetween(ex2, ey2, lx, ly); if (Math.random() < 0.5) this.fxSparks(lx, ly, 2, e.beamA + Math.PI, 1.2, [40, 140]); }
    }
  },
  visPara(e, g, now) {
    e.glow.setPosition(e.x + e.dir * 5, e.y - 6).setScale(e.shotT > 0 ? 0.5 : 0.25);
    if (e.ai === 'drop' && e.chute) {                                    // the canopy and its lines
      const cx = e.x, cy = e.body.top - 22, sw = Math.sin(now / 400 + e.t) * 2;
      this.laserG.lineStyle(1, 0xc8c0a8, 0.8).lineBetween(e.x - 4, e.body.top + 2, cx - 11 + sw, cy + 4).lineBetween(e.x + 4, e.body.top + 2, cx + 11 + sw, cy + 4);
      this.laserG.fillStyle(0x6a7a40, 1).fillRect(Math.round(cx - 13 + sw), Math.round(cy), 26, 4); this.laserG.fillStyle(0x8a9a58, 1).fillRect(Math.round(cx - 11 + sw), Math.round(cy - 2), 22, 2);
      this.laserG.fillStyle(0x4a5a2a, 1).fillRect(Math.round(cx - 13 + sw), Math.round(cy + 4), 4, 1).fillRect(Math.round(cx + 9 + sw), Math.round(cy + 4), 4, 1);
    }
  },
  visBeacon(e, g, now) {
    const call = e.ai === 'call', k = call ? clamp(1 - (e.aiUntil - now) / TUNE.BEACON.callMs, 0, 1) : 0;
    e.glow.setPosition(e.x, e.y - 3).setScale(call ? 0.4 + k * 0.8 : 0.35).setAlpha(call && Math.floor(now / (200 - 150 * k)) % 2 ? 1 : 0.6);
    if (call) { g.lineStyle(2, 0xff3020, 0.25 + 0.5 * k).lineBetween(e.x, e.y - 8, e.x, e.y - 40 - 200 * k); g.lineStyle(1, 0xffb0a0, 0.6 * k).strokeCircle(e.x, e.y, 10 + 30 * (1 - ((now / 400) % 1))); }
  },
  visSlug(e, g, now) { e.glow.setPosition(e.x + e.dir * 6, e.y - 1).setScale(e.ai === 'spit' ? 0.7 : 0.4); },
  visPilferer(e, g, now) { e.glow.setPosition(e.x + e.dir * 4, e.y); if (e.gunImg) e.gunImg.setPosition(e.x, e.y + 7).setFlipX(e.dir < 0); },
  visPogo(e, g, now) { e.glow.setPosition(e.x, e.y - 4).setScale(e.slamming ? 0.6 : 0.3); },
  visSparker(e, g, now) { e.glow.setPosition(e.x, e.y - 2).setScale(0.3 + Math.random() * 0.1); },
  visGolem(e, g, now) { const c = e.ai === 'slam' || e.ai === 'throw'; e.glow.setPosition(e.x + e.dir * 2, e.y - 2).setScale(c ? 0.9 + Math.random() * 0.2 : 0.7); },
  visCreeper(e, g, now) { e.flipY = e.ai === 'ceil'; e.glow.setPosition(e.x + e.dir * 4, e.y + (e.ai === 'ceil' ? 1 : -1)).setScale(e.ai === 'drop' ? 0.5 : 0.3); },
  visRoller(e, g, now) {
    if (e.ai === 'roll' || e.ai === 'curl') e.rotation = e.spinA; else if (e.ai !== 'dizzy') e.rotation = 0;
    e.glow.setPosition(e.x, e.y).setScale(e.ai === 'curl' ? 0.6 + Math.random() * 0.2 : 0.3).setVisible(e.ai !== 'roll');
    if (e.ai === 'dizzy') for (let i = 0; i < 3; i++) { const th = now / 150 + i * 2.1; this.laserG.fillStyle(0xffe46a, 0.9).fillRect(Math.round(e.x + Math.cos(th) * 8), Math.round(e.body.top - 4 + Math.sin(th) * 2), 2, 2); }
  },
  visJammer(e, g, now) {
    const tell = e.ai === 'tell', k = tell ? clamp(1 - (e.aiUntil - now) / TUNE.JAMMER.tellMs, 0, 1) : 0;
    e.glow.setPosition(e.x, e.y).setScale(0.4 + k * 0.6).setAlpha(0.6 + k * 0.3);
    if (tell) for (let i = 0; i < 2; i++) g.lineStyle(1, 0x60ff9a, 0.3 + 0.5 * k).strokeCircle(e.x, e.y, 6 + (1 - ((now / 120 + i * 0.5) % 1)) * 16 * (1 - k * 0.5));
  },
  visGasbag(e, g, now) {
    const sw = e.ai === 'swell', k = sw ? clamp(1 - (e.aiUntil - now) / TUNE.GASBAG.swellMs, 0, 1) : 0;
    e.setScale(1 + k * 0.35 + (sw ? Math.sin(now / 30) * 0.05 : 0));
    e.glow.setPosition(e.x, e.y).setScale(0.6 + k * 0.6).setAlpha(0.3 + k * 0.4);
  },
  visWelder(e, g, now) {
    e.glow.setPosition(e.x + e.dir * 3, e.y - 5).setScale(e.ai === 'weld' || e.ai === 'build' ? 0.5 + Math.random() * 0.2 : 0.3);
    const pt = e.patient;
    if (e.ai === 'weld' && pt && pt.alive) this.zapCol(g, e.x + e.dir * 7, e.y - 1, pt.body.center.x, pt.body.center.y, 0xffc040, 0xffffff);
  },
  visTurret(e, g, now) {
    const ca = Math.cos(e.aimA), sa = Math.sin(e.aimA), tx = e.x, ty = e.y - 2;
    this.laserG.lineStyle(3, 0x22262c, 1).lineBetween(tx, ty, tx + ca * 7, ty + sa * 7); this.laserG.lineStyle(1, 0x8a94a0, 1).lineBetween(tx, ty - 1, tx + ca * 7, ty + sa * 7 - 1);
    e.glow.setPosition(tx, ty).setScale(e.ai === 'aim' ? 0.45 : 0.25);
    if (e.ai === 'aim') { let ex = tx + ca * 8, ey = ty + sa * 8; for (let i = 0; i < 60 && !this.solidAt(ex + ca * 4, ey + sa * 4); i++) { ex += ca * 4; ey += sa * 4; } this.laserG.lineStyle(1, 0xff3020, Math.floor(now / 50) % 2 ? 0.7 : 0.3).lineBetween(tx + ca * 8, ty + sa * 8, ex, ey); }
  },
  visDuelist(e, g, now) {
    e.glow.setPosition(e.x + e.dir * 3, e.y - 8 + (e.fr === 'crouch' ? 2 : 0)).setScale(e.ai === 'windup' ? 0.7 : 0.3);
    if (e.ai === 'lunge') {                                             // the cut: a pale crescent ahead of the blade
      const cx = e.x + e.dir * 9, cy = e.y - 2;
      for (let j = 0; j < 7; j++) { const th = -1.1 + j * 0.37, r = 11; g.fillStyle(0xffd0e0, 0.75 - j * 0.06).fillRect(Math.round(cx + e.dir * Math.cos(th) * r * 0.6), Math.round(cy + Math.sin(th) * r), 2, 2); }
    }
  },
  visMimic(e, g, now) { e.glow.setPosition(e.x + e.dir * 2, e.y - 1).setAlpha(e.ai === 'hide' ? 0 : 0.7 + Math.random() * 0.2); },
  visHowitzer(e, g, now) {
    const pl = e.ai === 'plant' || e.ai === 'fire';
    e.glow.setPosition(e.x - e.dir * 3, e.y - 1 + (pl ? 2 : 0)).setScale(pl ? 0.6 + Math.random() * 0.1 : 0.35);
  },
  visBlinker(e, g, now) { e.glow.setVisible(!e.under).setPosition(e.x + e.dir * 1.5, e.y - 4).setScale(e.ai === 'tell' ? 0.45 + Math.random() * 0.1 : 0.25); },
  visTarspit(e, g, now) {
    const w = e.ai === 'windup';
    e.glow.setPosition(e.x + e.dir * (w ? 6 : 1), e.y - 7).setScale(w ? 0.55 + Math.random() * 0.15 : 0.25).setTint(w ? 0xff7a20 : 0xffa040);
  },
  visHive(e, g, now) { e.glow.setPosition(e.x, e.y).setScale(1 + Math.sin(now / 150) * 0.1); },
  visStitcher(e, g, now) {
    e.glow.setPosition(e.x, e.y + 5).setScale(e.ai === 'channel' ? 0.8 + Math.random() * 0.2 : 0.45);
    if (e.ai === 'channel' && e.corpse && !e.corpse.gone) { const q = e.corpse.pts[2]; this.zapCol(g, e.x, e.y + 6, q.x, q.y, 0x30ff60, 0xd8ffd8); }
  },
  visWyrm(e, g, now) {                                                 // rotation along the path (set here, after updateEnemies' wobble decay)
    const th = e.wyrmAng || 0, left = Math.cos(th) < 0;
    e.flipX = left; e.rotation = left ? th - Math.PI : th;
    if (e.kind === 'wyrm') e.glow.setVisible(!e.under).setPosition(e.x + Math.cos(th) * 10, e.y + Math.sin(th) * 10).setScale(e.ai === 'leap' ? 1.3 : 0.9);
  },
  visBulwark(e, g, now) {
    const wind = e.ai === 'windup' || e.ai === 'charge';
    e.glow.setPosition(e.x + e.dir * 4, e.y - 8).setScale(wind ? 0.8 + Math.sin(now / 30) * 0.2 : 0.35).setTint(wind ? 0xffe060 : e.kind === 'mirror' ? 0xe080ff : 0xff9a2a);
  },
  visRifleman(e, g, now) {
    const sn = e.kind === 'sniper', rk = e.kind === 'rocketeer', sx = e.x + (e.dir > 0 ? 0 : -1), sy = e.y - 2, ca = Math.cos(e.aimA), sa = Math.sin(e.aimA);
    e.gun.setPosition(Math.round(sx - ca * e.recoil), Math.round(sy - sa * e.recoil)).setRotation(e.aimA);
    e.gun.scaleY = ca < 0 ? -1 : 1;
    e.glow.setPosition(e.x + e.dir * 4, e.y - 7).setScale((sn || rk) && e.ai === 'aim' ? 0.6 : 0.3);
    if (e.ai === 'aim') {                                              // laser sight: tracks, then blinks when locked
      const ms = sn ? TUNE.SNIPER.aimMs : rk ? TUNE.ROCKETEER.aimMs : TUNE.ENFORCER.aimMs, lock = sn ? TUNE.SNIPER.lockAt : rk ? TUNE.ROCKETEER.lockAt : 0.7, len = sn ? 31 : rk ? 22 : 21;
      const k = clamp((now - e.aimStart) / ms, 0, 1), mx = sx + ca * len, my = sy + sa * len;
      let ex = mx, ey = my;
      for (let i = 0; i < (sn ? 150 : 90) && !this.solidAt(ex + ca * 4, ey + sa * 4); i++) { ex += ca * 4; ey += sa * 4; }
      const locked = k >= lock, a = locked ? (Math.floor(now / 40) % 2 ? 0.95 : 0.45) : 0.2 + 0.45 * k;
      const col = sn ? (locked ? 0xd0f4ff : 0x40a0ff) : rk ? (locked ? 0xffe080 : 0xff8a20) : (locked ? 0xff9090 : 0xff2020);
      this.laserG.lineStyle(sn && locked ? 2 : 1, col, a).lineBetween(mx, my, ex, ey);
      this.laserG.fillStyle(col, a).fillRect(Math.round(ex) - 1, Math.round(ey) - 1, 2, 2);
    }
  },
  visCloaker(e, g, now) { e.glow.setPosition(e.x + e.dir * 5, e.y - 8 + (e.fr === 'crouch' ? 3 : 0)).setScale(e.ai === 'reveal' ? 0.7 : 0.3).setAlpha(0.3 + 0.6 * (e.cloakA ?? 0)); },
  visPyro(e, g, now) { const w = e.ai === 'windup'; e.glow.setPosition(e.x + e.dir * (w ? 8 : 6), e.y + (w ? -12 : -1)).setScale(w ? 0.7 + Math.random() * 0.2 : 0.3).setTint(w ? 0xff8a20 : 0xffb040); },
  visGunship(e, g, now) {
    const strafe = e.ai === 'strafeTell' || e.ai === 'strafe';
    const tell = strafe || e.ai === 'tell' || e.ai === 'volley';
    e.glow.setPosition(e.x + e.dir * (strafe ? 22 : 2), e.body.bottom + 1)
      .setTint(strafe ? 0xffd080 : 0xff3020).setScale(tell ? 1 + Math.sin(now / 40) * 0.25 : 0.5).setAlpha(tell ? 0.9 : 0.4);
    e.thr.setPosition(e.x, e.body.bottom + 4).setScale(1.4 + Math.random() * 0.4, 0.8).setAlpha(0.45);
  },
  visScreamer(e, g, now) { e.glow.setPosition(e.x + e.dir * 3, e.y - 2).setScale(e.ai === 'wind' ? 0.9 + Math.random() * 0.3 : e.ai === 'dive' ? 0.8 : 0.5); },
  visWarden(e, g, now) {
    e.glow.setPosition(e.x, e.y + 1).setScale(0.5 + Math.sin(now / 90) * 0.06);
    for (const o of e.links) {                                           // tethers + bubbles on its wards
      if (!o.alive || o.shieldBy !== e || now > o.shieldT) continue;
      const hit = now - (o.shieldHit || -1e9) < 120, r = Math.max(o.body.halfWidth, o.body.halfHeight) + 6, ox = o.body.center.x, oy = o.body.center.y;
      g.lineStyle(1, 0x60e0ff, 0.55).lineBetween(e.x, e.y + 2, ox, oy);
      g.lineStyle(hit ? 2 : 1, hit ? 0xffffff : 0x60e0ff, hit ? 0.9 : 0.35 + Math.sin(now / 120) * 0.1).strokeCircle(ox, oy, r);
      if (hit) g.fillStyle(0x60e0ff, 0.15).fillCircle(ox, oy, r);
    }
  },
  visJugg(e, g, now) {
    const ca = Math.cos(e.aimA), sa = Math.sin(e.aimA), sx = e.x + e.dir * 2, sy = e.y - 1;
    const key = e.spin > 0.05 && Math.floor(now / (70 - 45 * e.spin)) % 2 ? 'gun_jugg2' : 'gun_jugg';
    if (e.gun.texture.key !== key) e.gun.setTexture(key);
    e.gun.setPosition(Math.round(sx - ca * e.recoil), Math.round(sy - sa * e.recoil)).setRotation(e.aimA); e.gun.scaleY = ca < 0 ? -1 : 1;
    e.glow.setPosition(e.x + e.dir * 3, e.body.top + 4).setScale(e.ai === 'spin' ? 0.8 : 0.4);
    if (e.ai === 'spin') {                                               // laser tell while the barrels wind up
      let ex = sx + ca * 28, ey = sy + sa * 28;
      for (let i = 0; i < 80 && !this.solidAt(ex + ca * 4, ey + sa * 4); i++) { ex += ca * 4; ey += sa * 4; }
      this.laserG.lineStyle(1, 0xff3020, 0.25 + 0.5 * e.spin).lineBetween(sx + ca * 28, sy + sa * 28, ex, ey);
    }
  },
  visJet(e, g, now) {
    const ca = Math.cos(e.aimA), sa = Math.sin(e.aimA);
    e.gun.setPosition(Math.round(e.x - ca * e.recoil), Math.round(e.y + 1 - sa * e.recoil)).setRotation(e.aimA); e.gun.scaleY = ca < 0 ? -1 : 1;
    e.glow.setPosition(e.x + e.dir * 4, e.y - 8).setScale(e.ai === 'tell' ? 0.8 + Math.sin(now / 30) * 0.2 : 0.3);
    e.thr.setPosition(e.x - e.dir * 4, e.y + 10).setScale(0.6 + Math.random() * 0.35);
  },
  visSapper(e, g, now) { e.glow.setPosition(e.x + e.dir * 5, e.y - 7 + (e.fr === 'crouch' ? 3 : 0)).setScale(e.ai === 'plant' ? 0.6 : 0.3); },
  visBrood(e, g, now) { const sw = e.ai === 'birth'; e.glow.setPosition(e.x - e.dir * 2, e.y - 4).setScale(sw ? 1.8 + Math.sin(now / 40) * 0.2 : 1.3 + Math.sin(now / 300) * 0.1).setAlpha(sw ? 0.55 : 0.3); },
  visWasp(e, g, now) {
    e.glow.setPosition(e.x + e.dir * 8, e.y).setScale(e.ai === 'run' ? 0.7 : 0.45);
    e.thr.setPosition(e.x - e.dir * 2, e.y - 6).setAlpha(0.2 + Math.random() * 0.25);       // wing shimmer
    if (e.ai === 'run' && e.bombs > 0) {                                // bomb sight: blinking line to the ground
      let ey = e.body.bottom + 2; while (ey < e.y + 260 && !this.standAt(e.x, ey)) ey += 4;
      const a = Math.floor(now / 60) % 2 ? 0.75 : 0.3;
      this.laserG.lineStyle(1, 0xff3020, a).lineBetween(e.x, e.body.bottom + 2, e.x, ey);
      this.laserG.fillStyle(0xff3020, a).fillRect(e.x - 3, ey - 1, 7, 2);
    }
  },
  visRammer(e, g, now) {
    const hot = e.ai === 'wind' || e.ai === 'charge';
    e.glow.setPosition(e.x + e.dir * 8, e.y - 2).setScale(hot ? 0.8 + Math.sin(now / 30) * 0.15 : 0.4).setTint(e.ai === 'dizzy' ? 0xffe14a : 0xff3b1f);
  },
  visBoss(e, g, now) {
    const hot = e.ai === 'mortarWind' || e.ai === 'breathWind' || e.ai === 'breath';
    e.glow.setPosition(e.x + e.dir, e.y - 1).setScale(hot ? 2.3 + Math.sin(now / 30) * 0.25 : 1.6 + Math.sin(now / 200) * 0.12).setAlpha(e.phase >= 3 ? 0.7 : hot ? 0.6 : 0.42).setTint(e.phase === 4 ? (Math.floor(now / 90) % 2 ? 0xffffff : 0xff3010) : e.phase === 3 ? 0xff4a20 : 0xff8a20);
  },
  visStalker(e, g, now) { e.glow.setPosition(e.x + e.dir * 4, e.y - 6 + (e.fr === 'crouch' ? 3 : 0)).setScale(e.ai === 'windup' ? 0.75 : 0.3); },
  visDrone(e, g, now) {
    const charge = e.ai === 'charge';
    e.glow.setPosition(e.x + e.dir * 3, e.y).setScale(charge ? 0.9 + Math.sin(now / 30) * 0.2 : 0.55).setTint(charge ? 0xffc040 : 0xff3020);
    e.thr.setPosition(e.x, e.y + 8).setAlpha(0.4 + Math.random() * 0.3);
  },
  visHeavy(e, g, now) {
    const wind = e.ai === 'windup' || e.ai === 'leap';
    e.glow.setPosition(e.x + e.dir, e.y - 1).setScale(wind ? 1.4 + Math.sin(now / 40) * 0.2 : 0.8 + Math.sin(now / 300) * 0.08);
  },
});
