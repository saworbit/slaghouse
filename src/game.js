// -----------------------------------------------------------------------------
class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create(data) {
    const T = TUNE;
    if (this.gt === undefined) {                       // gameplay clock: this scene's time only runs while the scene does, so the pause menu stops every timer
      this.gt = this.game.loop.time; const step = this.sys.step;
      this.sys.step = (time, delta) => step.call(this.sys, (this.gt += delta), delta);
    }
    this.time.now = this.gt;
    this.lab = data?.lab ?? null;
    this.labTransition = false;
    this.labRoster = this.lab ? data.spawns ?? labSpawns(this.lab) : null;
    this.labPending = 0;
    this.A = this.lab ? LAB_ROOMS[this.lab.room].arena : ARENAS[data?.arena ?? 0];
    this.carry = data?.carry ?? null; this.descending = false; this.arrivedRetry = !!data?.retry;
    this.mode = this.lab ? RUN_MODES.lab : (RUNMODE !== 'lab' && RUN_MODES[RUNMODE]) || RUN_MODES.campaign;   // any other RUNMODE plays the campaign, as before
    this.campaign = this.mode.id === 'campaign';                        // for the campaign's own systems: squads, routes, checkpoints
    if (this.campaign) this.A = CAMPAIGN_ARENAS[this.A.id - 1];
    this.day = this.mode.dated ? data?.day ?? dayKey() : null;         // the DAILY's day, fixed for the run (and its restarts) even across 00:00 UTC
    this.runDiff = this.mode.difficulty(this);
    this.runMut = this.mode.mutator(this);
    this.mutator = MUTATORS[this.runMut].id;
    this.chapterStart = this.campaign ? this.carry : null;
    this.testRun = !!this.chapterStart?.test;                           // ?act=N (#173): the run's own rules, but nothing lifetime counts
    if (this.testRun) this.mode = Object.create(this.mode, { lifetime: { value: false } });
    this.campaignElapsed = this.chapterStart?.elapsed ?? 0;
    this.campaignRetried = !!(data?.retry || this.chapterStart?.retried);
    this.campaignRunId = this.chapterStart?.runId ?? (this.campaign ? data?.runId ?? newRunId() : null);
    this.campaignSquads = []; this.campaignReserve = 0; this.campaignReinforceAt = 0; this.campaignRoute = []; this.campaignMachinery = null;
    this.legacyWeapon = this.chapterStart?.legacyWeapon;
    this.weaponSlots = this.campaign ? campaignWeaponSlots(this.chapterStart?.wave ?? 0, this.legacyWeapon) : ALL_WEAPON_SLOTS;
    this.unlockSlots = []; this.unlockUntil = 0;
    this.routeHold = 0; this.routeG = null; this.perkPicked = false;
    this.ride = null; this.liftIn = this.liftOut = null; this.liftG = this.liftCoverG = this.fixG = null; this.fixtures = []; this.coolant = 0; this.powerCut = false;   // the lift, Act 03's valves, Act 05's breaker
    this.physics.world.timeScale = 1;
    this.physics.world.setBounds(0, 0, LW, LH);       // default bounds = canvas size, far too small
    this.state = 'play'; this.overShown = false; this.needReset = true;
    this.stats = { t0: this.time.now, shots: 0, hits: 0, kills: 0, taken: 0, executes: 0, dodges: 0, wk: {} };
    this.playSaved = 0;                                                 // ms of this.stats.t0's span already added to LIFE.time
    this.weapon = this.lab ? weaponSlot(this.lab.weapon) : 0; this.nextFire = 0; this.wNext = []; this.aim = 0; this.aimMode = 'keys'; this.lastAimMode = null; this.facing = 1; this.aimPt = null;
    this.hp = T.PLAYER_HP; this.invulnUntil = 0; this.dropUntil = 0;
    this.lastGround = -1e9; this.jumpBuffer = -1e9; this.jumpCuttable = false; this.wasGround = false; this.lastVy = 0;
    this.runT = 0; this.idleT = 0; this.stepIdx = 0; this.recoil = 0; this.look = { x: 0, y: 0 }; this.sqx = 1; this.sqy = 1;
    this.pFrame = 'idle0'; this.pBob = 0; this.shoulder = { x: 0, y: 0 };
    this.hitStopUntil = 0; this.slowmoUntil = 0; this.shakeUntil = 0; this.shakeInt = 0; this.wheelT = 0; this.mflashUntil = 0;
    this.lvlDirty = false; this.lvlRefreshAt = 0; this.moteT = 0; this.lvlTiles = [];
    this.kick = { x: 0, y: 0 }; this.combo = 0; this.bestCombo = 0; this.lastKillT = -1e9; this.swapT = 0; this.heartT = 0; this.lastShotT = -1e9;
    this.zoomPunch = 0; this.arcActiveUntil = 0; this.arcUntil = 0; this.arcSegs = []; this.beams = []; this.fountains = []; this.dmgNums = [];
    this.style = { pts: 0, rank: 0, best: 0, lastWeapon: null }; this.headshots = 0; this.wave = 0; this.noiseT = 0;
    this.totalEnemies = this.mode.total;
    this.kickReady = 0; this.kickUntil = 0; this.kickQueued = false; this.flameActiveUntil = 0; this.scorchT = 0;
    this.hazardContactUntil = 0;
    this.boss = null; this.camFocus = null; this.puddles = []; this.shockwaves = []; this.ragdolls = [];
    this.xb = null;                                                     // the expansion bosses' hazards: made by the first of them to spawn (xbFx)
    Sfx.stopLoops(); this.spin = 0; this.heat = 0;
    this.restartArmUntil = 0;
    this.cryoActiveUntil = 0; this.sentry = null; this.sentryReadyAt = 0; this.rampageUntil = 0; this.rampageArmed = true; this.ghostT = 0; this.mod = null; this.rainT = 0;
    this.hook = null; this.hookReady = 0; this.wrecks = []; this.darkA = 0;
    this.physics.world.gravity.y = this.gravTo = TUNE.GRAVITY; this.gravAt = 0;   // gravTo: where low gravity is easing to, from gravAt
    this.mineReady = 0; this.mineQueued = false; this.killTimes = []; this.killCamUntil = 0; this.chaosT = []; this.chaosCd = 0; this.lastRag = null;
    this.jd = {}; this._v = new Phaser.Math.Vector2();
    // overdrive round: dash, the four new guns, harpoons, slag tide, pause
    this.dashUntil = 0; this.dashReady = 0; this.dashAir = true; this.dashIUntil = 0; this.dashVx = 0; this.dashVy = 0; this.dashing = false; this.dashGhostT = 0; this.dashDodged = false;
    this.ripperUntil = 0; this.ripperBiteUntil = 0; this.ripN = 0;
    this.locks = []; this.lockT = 0; this.hornetHeld = false;
    this.lanceCharge = 0; this.lanceOn = false; this.lanceFullT = 0; this.lanceFxT = 0;
    this.glaive = { on: false, x: 0, y: 0, vx: 0, vy: 0, state: 'out', dist: 0, spin: 0, hits: new Map(), bsp: 0, hoverT: 0, trailT: 0, whirT: 0 }; this.glaiveHold = false;
    this.reeledBy = null; this.tide = null; this.paused = false; this.linkerSeq = 0;
    // crucible round: hammer, coils, flak shards, health orbs, weapon wheel
    this.coils = []; this.pwaves = []; this.hammerOn = false; this.hammerCharge = 0; this.hammerSwing = 0; this.diving = false; this.diveCharge = 0;
    this.coilHeld = false; this.coilHeldT = 0; this.coilOverloaded = false; this.fenceT = 0; this.wheelOn = false; this.wheelSel = 0;
    this.orbChain = 0; this.orbChainT = 0; this.swarmLvl = 0; this.gnatCache = [];
    Music.paused = false;
    // furnace round: tractor grip, thrown things, tar, corroder, magnet fields
    this.tb = null; this.tbOn = false; this.thrown = []; this.tars = []; this.tarT = 0; this.inTar = false; this.acidActiveUntil = 0; this.acidPaintT = 0; this.magnets = [];
    this.tarG = this.add.graphics().setDepth(4.95);
    // shockworks round: shock orbs + beams, needles, fire jets, impact frames
    this.shockOrbs = []; this.shockBeams = []; this.shockHeld = false; this.shockHoldT = 0; this.shockReady = false; this.needles = []; this.impactN = 0;
    // slagforge round: perks, wall jumps, drills, revolver, gas clouds
    this.perks = {}; this.perkOffer = null; this.perkNext = null; this.djUsed = false; this.wallT = -1e9; this.wallSide = 0; this.wallLockUntil = 0; this.sliding = false; this.slideFxT = 0;
    this.drills = []; this.revAmmo = TUNE.REVOLVER.rounds; this.revReloadUntil = 0; this.revLastT = -1e9; this.trigPrev = false; this.clouds = [];
    // ironclad round: medals, flares, limpets, jamming, steam pipes
    this.medals = new Set(); this.ms = { trick: 0, combos: 0, supers: 0, splats: 0, burnKills: 0, crushKills: 0, rampages: 0 }; this.waveTaken = 0;
    this.flares = []; this.limpets = []; this.limpetHeld = false; this.limpetHoldT = 0; this.limpetBlown = false; this.jamUntil = 0; this.empRings = [];
    // sorting line round: nets, the flail, belts, presses, sparker links
    this.nets = []; this.flail = { st: 'idle', ang: 0, w: 0, x: 0, y: 0, vx: 0, vy: 0, t: 0, hits: new Map(), pierce: 0 }; this.sparkHitT = 0; this.sparkLinks = [];
    this.beltG = this.add.graphics().setDepth(4.96); this.pressG = this.add.graphics().setDepth(6.5);
    // overtime round: orbital strikes, cutter blades, the echo's memory, stolen guns
    this.sky = { st: 'idle', t: 0, x: 0, y: 0, top: 0, tick: 0 }; this.blades = []; this.hist = []; this.locked = new Set();
    // codex round: spider mines, napalm, acid pools, corrosion on you, leeches
    this.spiders = []; this.napalms = []; this.acids = []; this.pCorrodeT = 0; this.acidG = this.add.graphics().setDepth(4.97);
    this.leechN = 0; this.beaconWarned = false; this.clawBy = null; this.pvTint = 0xffffff;   // scene props survive a restart: reset them
    // supply round: crates, capsules, power-ups, bees
    this.supplies = []; this.supplyT = TUNE.SUPPLY.first; this.dmgUntil = 0; this.hasteUntil = 0; this.aegis = 0; this.bees = []; this.whipFx = null;
    this.supplyG = this.add.graphics().setDepth(6.6); this.auraImg = this.add.image(0, 0, 'glow').setBlendMode(ADD).setDepth(18).setVisible(false);
    if (this.lab) this.supplyT = Infinity;
    // mastery round: the shrink ray's zaps, sonic waves
    this.shrinkFx = []; this.sonics = [];                                // the shrink ray's beams (the props' arcs live in this.zaps, from buildProps)
    // finale round: ice sheets, horn blasts, grav pulses, the multikill chain
    this.ices = []; this.horns = []; this.gravFx = []; this.onIce = false; this.chillT = 0; this.mkN = 0; this.mkLast = -1e9;
    this.iceG = this.add.graphics().setDepth(4.96);
    // arsenal round: fireworks and their stars, katana slashes
    this.fireworks = []; this.stars = []; this.slashFx = []; this.kSwing = 1;
    // elite round: the vacuum's hopper, the siphon, grapplers, spotters, hounds
    this.vac = { on: false, ammo: 0, humT: 0 }; this.siphonUntil = 0; this.siphonFx = null; this.sipAcc = 0; this.sipShown = 0; this.sipShowAt = 0;
    this.grabbedBy = null; this.thrownUntil = 0; this.markedUntil = 0; this.eliteSeen = false; this.houndN = 0;
    // wrecking-yard round: splitter bolts, the decoy, discs, spores
    this.splits = []; this.decoy = null; this.discs = []; this.spores = [];
    // armory round: stasis fields, the microwave, pylon bolts
    this.stasisFields = []; this.mwFx = null; this.pylonZaps = [];
    // foreman round: the rocket punch
    this.punchUntil = 0; this.punchHit = false; this.punchDir = [1, 0];
    // mutator round: tripwires, ally drones, hard-light walls
    this.trips = []; this.allies = []; this.bwalls = [];
    // debrief round: bubbles, holy orbs, souls, mines, and who killed you
    this.shieldUntil = 0; this.shieldBlockT = 0; this.shieldHeld = false; this.hustleT = 0; this.barkPool = []; this.barkAt = 0; this.kegT = 0; this.tacT = 0; this.pvx = 0; this.threat = 'mid'; this.lastMod = null; this.globs = []; this.gluePuds = []; this.leapMarks = [];
    this.nukes = [];                                                     // powerhouse round: mini-nuke shells
    this.initExpansionWeapons();                                          // expansion: weapons (cannonballs, quakes, tornadoes, caltrops...)
    this.seeds = []; this.shrooms = []; this.pspores = []; this.tethered = []; this.sharing = false; this.linkCalled = false;   // gold round
    this.bubbles = []; this.horbs = []; this.souls = []; this.emines = []; this.killer = null; this.bubbled = false; this.empowerSeen = false;
    this.xfoes = { fakes: [], bundles: [], soakUntil: 0, told: {}, g: this.add.graphics().setDepth(5.5) };   // expansion foes: decoy bolts, dropped dynamite, chains and jets
    { const onPick = id => this.onPerkPick(id); BUS.on('perkpick', onPick); this.events.once('shutdown', () => BUS.off('perkpick', onPick)); }
    this.grid = this.A.grid.map(r => r.slice()); NAV = buildNav(this.grid);   // a fresh breakable copy every run

    this.buildWorld();
    this.buildPools();
    this.buildActors();
    this.buildColliders();
    this.buildInput();
    if (this.carry) this.applyCarry(this.carry);
    if (!this.lab) { this.routeG = this.add.graphics().setDepth(6.7); this.setupLifts(); }   // the Lab has no lift and no route

    const cam = this.cameras.main;
    cam.setBounds(0, 0, LW, LH);
    cam.setZoom(ZOOM);
    cam.setBackgroundColor('#07080a');
    cam.fadeIn(300, 0, 0, 0);
    // Hand-rolled follow (deadzone + smoothing + look-ahead) so shots and blasts can kick the view instantly;
    // Phaser's startFollow lerps any offset you add, which smears the kick into a drift.
    this.camX = this.player.x; this.camY = this.player.y;
    this.applyCamera(0);
    this.initPostFx();
    this.polInit();                                                      // expansion: polish (cosmetic only)
    const onResume = () => {                                           // back from the pause menu: no stale presses, no stray shot
      this.paused = false; Music.paused = false; this.input.keyboard.resetKeys();
      this.input.setDefaultCursor('none'); this.nextFire = Math.max(this.nextFire, this.time.now + 220); this.kickQueued = false; this.mineQueued = false;
      this.lanceOn = false; this.lanceCharge = 0; this.hornetHeld = false; this.locks = [];
    };
    this.events.on('resume', onResume);
    this.events.once('shutdown', () => this.events.off('resume', onResume));

    // Visuals are synced after Arcade's post-update so camera, sprite and gun never disagree by a frame.
    this.events.on('postupdate', this.syncVisuals, this);
    this.events.once('shutdown', () => this.events.off('postupdate', this.syncVisuals, this));
    if (this.lab) {
      LAB_PANEL.dock.hidden = false;
      this.events.once('shutdown', () => { LAB_PANEL.dock.hidden = true; });
    }
  }

  // ---------------------------------------------------------------- world ----
  buildWorld() {
    const offX = (VIEW_W - VIEW_W / ZOOM) / 2, offY = (VIEW_H - VIEW_H / ZOOM) / 2;   // zoom pivots on camera centre
    for (const [key, sf, depth] of [['bgFar', BG.far, -30], ['bgMid', BG.mid, -20]]) {
      this.add.image(offX * (1 - sf) - BG.pad, offY * (1 - sf) - BG.pad, key).setOrigin(0).setScrollFactor(sf).setDepth(depth).setTint(this.A.bgTint || 0xffffff);
    }
    // Level art lives in a CanvasTexture so blood, bullet holes and scorch marks can be painted onto it permanently.
    const tex = this.textures.exists('level') ? this.textures.get('level') : this.textures.createCanvas('level', LW, LH);
    const ctx = tex.context || tex.getContext();
    ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, LW, LH); ctx.drawImage(this.A.art, 0, 0);
    tex.refresh();
    this.lvlTex = tex; this.lvlCtx = ctx;
    // shown as 8 x 2 tiles: paint marks its tiles dirty and only those get re-uploaded (a fraction of the texture)
    this.lvlTiles = [];
    for (let j = 0; j < 2; j++) for (let i = 0; i < 8; i++) {
      const key = 'lvlt' + (j * 8 + i), tw = LW / 8, th = LH / 2;
      const tt = this.textures.exists(key) ? this.textures.get(key) : this.textures.createCanvas(key, tw, th), tc = tt.context || tt.getContext();
      tc.clearRect(0, 0, tw, th); tc.drawImage(tex.canvas || tex.getSourceImage(), i * tw, j * th, tw, th, 0, 0, tw, th); tt.refresh();
      this.add.image(i * tw, j * th, key).setOrigin(0).setDepth(0);
      this.lvlTiles.push({ tt, tc, x: i * tw, y: j * th, w: tw, h: th, dirty: false });
    }

    this.solids = this.physics.add.staticGroup();
    this.oneways = this.physics.add.staticGroup();
    for (const r of mergeRects(this.grid, '#')) this.solids.add(this.add.zone(r.x * TS + r.w * TS / 2, r.y * TS + r.h * TS / 2, r.w * TS, r.h * TS));
    for (const r of mergeRects(this.grid, '=', true)) {
      const z = this.add.zone(r.x * TS + r.w * TS / 2, r.y * TS + 3, r.w * TS, 6);
      this.oneways.add(z);
      const cc = z.body.checkCollision; cc.down = false; cc.left = false; cc.right = false;   // standard Arcade one-way pattern
    }
    this.initTerrain();
    // lights & ambience
    this.darkImg = this.add.image(0, 0, 'darkmask').setDepth(15.9).setVisible(false);   // blackout vision
    this.lamps = this.A.decor.lamps.map(([x, y]) => {
      const img = this.add.image(x, y, 'lamp').setDepth(2);
      return { cone: this.add.image(x, y + 3, 'cone').setOrigin(0.5, 0).setBlendMode(ADD).setTint(0xffc070).setAlpha(0.16).setScale(1.4, 1.6).setDepth(18),
               gl: this.add.image(x, y + 3, 'glow').setBlendMode(ADD).setTint(0xffb050).setScale(2.2).setAlpha(0.5).setDepth(18),
               t: Math.random() * 10, ph: Math.random() * 6, drop: 0, img, x, y, falling: false, dead: false, vy: 0, hits: new Set() };
    });
    this.beacons = this.A.decor.beacons.map(([x, y], i) => ({ img: this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xff2a14).setScale(1.2).setDepth(18), ph: i * 1.7 }));
    this.vents = this.A.decor.vents.map(([x, y], i) => ({ x, y, t: i * 1.9, acc: 0 }));
    this.pipeGroup = this.physics.add.staticGroup(); this.pipeG = this.add.graphics().setDepth(4.85);   // pipeG: the clamps on welded valves
    this.pipes = (this.A.pipes || []).map(([x, y, dir]) => {
      const sp = this.pipeGroup.create(x + dir * 3, y, 'pipe').setFlipX(dir < 0).setDepth(4.8);
      sp.body.setSize(8, 10); sp.refreshBody();
      return { x, y, dir, sp, t: 0, broken: false, tick: 0 };
    });
    this.wreck = this.A.wrecker ? Object.assign({ t: rand(0, 5), hit: new Map(), lastSide: 0, pHit: 0, creakT: 0, x: 0, y: 0, vx: 0, vy: 0 }, this.A.wrecker) : null;   // ARENA 04's wrecking ball
    if (this.wreck) { this.wreck.img = this.add.image(0, 0, 'wball').setOrigin(0.5, 0.56).setDepth(6.5); this.wreckG = this.add.graphics().setDepth(6.4); }
    this.rails = (this.A.rails || []).map(r => Object.assign({ tick: 0 }, r)); this.railCyc = { st: 'idle', t: 3.5, g: 0 };   // ARENA 05's live rails
    if (this.rails.length) this.railG = this.add.graphics().setDepth(4.97).setBlendMode(ADD);
    this.belts = this.A.belts || [];
    this.presses = (this.A.presses || []).map((p, i) => Object.assign({ st: 'up', t: 2 + i * 1.3, k: 0 }, p));
    this.jets = (this.A.decor.jets || []).map(([x, y], i) => ({ x, y, i, h: 76, tick: 0 })); this.jetCycle = { st: 'idle', t: rand(5, 7), f: 0 };
    this.setupArenaMachinery();                                          // ARENAS 06-10: the flood, the vault, the storm, the crusher, the turbines
    this.furnaceGlows = (this.A.decor.glows || []).map(([x, y, sc, tint], i) => ({ img: this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(tint).setScale(sc).setAlpha(0.45).setDepth(18), sc, ph: i * 2 }));
    this.fx = new FX(this, 1500, 12);
    this.fx.solid = (x, y) => this.solidAt(x, y);
    this.fx.paint = (x, y, p, wall) => this.paintDrop(x, y, p.fixed, wall);
    this.buildProps();
  }

  buildPools() {
    const mk = (n, key, gravity) => {
      const grp = this.physics.add.group({ allowGravity: false }), list = [];
      for (let i = 0; i < n; i++) { const o = grp.create(-500, -500, key); o.body.setAllowGravity(gravity); o.disableBody(true, true); list.push(o); }
      return [grp, list];
    };
    [this.bullets, this.bulletList] = mk(90, 'nail', false);
    [this.rockets, this.rocketList] = mk(10, 'rocket', false);
    [this.balls, this.ballList] = mk(3, 'pinball', true);
    this.ballList.forEach(o => o.setDepth(9));
    [this.grenades, this.grenadeList] = mk(40, 'grenade', true);
    [this.ebullets, this.ebulletList] = mk(40, 'ebullet', false);
    this.ebulletList.forEach(b => b.setDepth(9).setBlendMode(ADD));
    this.laserG = this.add.graphics().setDepth(17).setBlendMode(ADD);   // enforcer laser sights
    [this.bolts, this.boltList] = mk(30, 'bolt', false);
    [this.gibs, this.gibList] = mk(180, 'g_chunk', true);
    this.gibCursor = 0;
    this.bulletList.forEach(b => b.setDepth(9).setBlendMode(ADD));
    this.boltList.forEach(b => b.setDepth(9).setBlendMode(ADD));
    this.gibList.forEach(g => g.setDepth(6));
    this.rocketList.forEach(r => { r.setDepth(9); r.glow = this.add.image(0, 0, 'glow').setBlendMode(ADD).setTint(0xffa040).setScale(0.9).setAlpha(0.7).setDepth(18).setVisible(false); });
    this.grenadeList.forEach(g => { g.setDepth(9); g.glow = this.add.image(0, 0, 'glow').setBlendMode(ADD).setTint(0xff3020).setScale(0.5).setAlpha(0.8).setDepth(18).setVisible(false); });
    this.decals = []; this.decalCursor = 0;
    for (let i = 0; i < 50; i++) { const d = this.add.image(-50, -50, 'nailStuck').setOrigin(1, 0.5).setVisible(false).setDepth(1); d.ttl = 0; this.decals.push(d); }
    this.booms = [];
    for (let i = 0; i < 8; i++) { const b = this.add.sprite(-99, -99, 'boom', 'b0').setVisible(false).setDepth(15); b.t = 0; b.on = false; this.booms.push(b); }
    this.lights = [];
    for (let i = 0; i < 32; i++) { const l = this.add.image(0, 0, 'glow').setBlendMode(ADD).setVisible(false).setDepth(18); l.t = 0; l.on = false; this.lights.push(l); }
    this.hookImg = this.add.image(0, 0, 'hook').setDepth(9).setVisible(false);
    this.mflash = this.add.image(0, 0, 'mf0').setOrigin(0, 0.5).setBlendMode(ADD).setDepth(14).setVisible(false);
    [this.saws, this.sawList] = mk(8, 'saw', false);
    this.sawList.forEach(s => s.setDepth(9));
    this.arcG = this.add.graphics().setDepth(16).setBlendMode(ADD);     // lightning, rail beams, heal tethers
    this.digPool = [];
    for (let i = 0; i < 80; i++) this.digPool.push(this.add.image(-99, -99, 'digW', '0').setDepth(30).setVisible(false));
    [this.orbs, this.orbList] = mk(4, 'orb', false);
    this.orbList.forEach(o => { o.setDepth(9).setBlendMode(ADD); o.core = this.add.image(0, 0, 'voidcore').setDepth(8).setVisible(false); o.glow = this.add.image(0, 0, 'glow').setBlendMode(ADD).setTint(0xa050ff).setDepth(18).setVisible(false); });
    [this.slags, this.slagList] = mk(16, 'slag', true);
    this.slagList.forEach(s => { s.setDepth(9); s.glow = this.add.image(0, 0, 'glow').setBlendMode(ADD).setTint(0xff7020).setScale(0.6).setAlpha(0.8).setDepth(18).setVisible(false); });
    [this.barrels, this.barrelList] = mk(8, 'barrel', true);
    this.barrelList.forEach(k => k.setDepth(4));
    [this.eprojs, this.eprojList] = mk(14, 'erocket', false);
    this.eprojList.forEach(q => { q.setDepth(9); q.glow = this.add.image(0, 0, 'glow').setBlendMode(ADD).setScale(0.8).setAlpha(0.75).setDepth(18).setVisible(false); });
    [this.fblocks, this.fblockList] = mk(24, 'fb_x', true);
    this.fblockList.forEach(f => f.setDepth(1.5));
    [this.stakes, this.stakeList] = mk(8, 'stake', false);
    this.stakeList.forEach(q => q.setDepth(9));
    this.stakeDecals = []; this.stakeCursor = 0;
    for (let i = 0; i < 18; i++) { const d = this.add.image(-50, -50, 'stake').setOrigin(0.85, 0.5).setVisible(false).setDepth(4.5); d.tile = null; d.pinned = []; this.stakeDecals.push(d); }
    [this.mines, this.mineList] = mk(6, 'mine', true);
    this.mineList.forEach(m => { m.setDepth(6); m.glow = this.add.image(0, 0, 'glow').setBlendMode(ADD).setScale(0.35).setDepth(18).setVisible(false); });
    [this.charges, this.chargeList] = mk(6, 'satchel', true);
    this.chargeList.forEach(c => c.setDepth(6));
    [this.haywires, this.haywireList] = mk(4, 'jet', true);
    this.haywireList.forEach(h => { h.setDepth(6); h.glow = this.add.image(0, 0, 'glow').setBlendMode(ADD).setTint(0xffa040).setScale(0.8).setDepth(18).setVisible(false); });
    [this.canisters, this.canisterList] = mk(6, 'canister', true);
    this.canisterList.forEach(k => k.setDepth(4));
    // overdrive round
    for (let i = 0; i < 16; i++) { const l = this.add.image(0, 0, 'glow').setBlendMode(ADD).setVisible(false).setDepth(18); l.t = 0; l.on = false; this.lights.push(l); }   // dash ghosts need more lights
    this.hornetList = [];
    for (let i = 0; i < 16; i++) {
      const h = this.add.image(-99, -99, 'hornet').setDepth(9).setVisible(false); h.on = false;
      h.glow = this.add.image(0, 0, 'glow').setBlendMode(ADD).setTint(0xffa040).setScale(0.45).setAlpha(0.7).setDepth(18).setVisible(false);
      this.hornetList.push(h);
    }
    this.glaiveImg = this.add.image(-99, -99, 'glaive').setDepth(9).setVisible(false);
    this.glaiveGlow = this.add.image(-99, -99, 'glow').setBlendMode(ADD).setTint(0x46e6ff).setScale(0.8).setAlpha(0.55).setDepth(18).setVisible(false);
    this.lanceGlow = this.add.image(-99, -99, 'glow').setBlendMode(ADD).setTint(0xff8a20).setDepth(18).setVisible(false);
    this.tideG = this.add.graphics().setDepth(4.9);                    // slag tide: opaque behind the actors...
    this.tideFG = this.add.graphics().setDepth(7.6);                   // ...and a see-through front with the bright surface
    this.tideGlow = this.add.image(0, 0, 'glow').setBlendMode(ADD).setTint(0xff6a10).setAlpha(0).setDepth(18);
    this.orbImgs = [];                                                  // health orbs from executions
    for (let i = 0; i < 24; i++) {
      const o = this.add.image(-99, -99, 'hporb').setDepth(8.5).setVisible(false); o.on = false;
      o.glow = this.add.image(0, 0, 'glow').setBlendMode(ADD).setTint(0x40ff70).setScale(0.45).setAlpha(0.6).setDepth(18).setVisible(false);
      this.orbImgs.push(o);
    }
    this.coilG = this.add.graphics().setDepth(16).setBlendMode(ADD);
  }
  spawnBarrels(fx) {                                                   // explosive drums; restocked every wave
    this.A.barrels.forEach(([cx, cy], i) => {
      const k = this.barrelList[i]; if (!k || k.active) return;
      k.enableBody(true, cx * TS + 8, (cy + 1) * TS - 7, true, true);
      k.body.setSize(10, 13, true); k.body.setAllowGravity(true); k.body.setBounce(0.2); k.body.setDrag(200, 0);
      k.clearTint(); Object.assign(k, { hp: TUNE.BARREL.hp, fuse: -1, burning: false, kicked: false, prevV: 0, byFoe: false });
      if (fx) { this.fx.emit(k.x, k.y, { n: 10, speed: [20, 80], life: [0.3, 0.6], size: [2, 1], cols: [0xffffff, 0xffc060], add: true, g: -40 }); this.beamIn(k.x, (cy + 1) * TS, 13, [k]); }
    });
  }
  // Restocking: the supply teleporter beams it back in, a short green column (the foes' warp beam is magenta) it fades
  // in inside. Only the look: the body is there from the same frame as before, so nothing plays differently.
  beamIn(x, bottom, h, objs) {
    const beam = this.add.image(x, bottom, 'beam').setOrigin(0.5, 1).setBlendMode(ADD).setTint(0x7dffb0).setAlpha(0).setScale(1, Math.max(0.5, (h + 20) / 64)).setDepth(17);
    this.tweens.add({ targets: beam, alpha: 0.85, scaleX: 0.35, duration: 260, yoyo: true, hold: 140, onComplete: () => beam.destroy() });
    this.spawnLight(x, bottom - h / 2, 'glow', 0x7dffb0, 0.4, 1.2, 0.7, 0.4);
    for (const o of objs) if (o) { const a = o.alpha || 1; o.setAlpha(0); this.tweens.add({ targets: o, alpha: a, duration: 380, delay: 150 }); }
  }

  buildActors() {
    const px = this.A.spawns.player[0] * TS + 8, py = (this.A.spawns.player[1] + 1) * TS;
    this.player = this.physics.add.sprite(px, py - 12, 'player', 'idle0').setVisible(false);   // invisible physics body
    this.player.body.setSize(10, 20).setOffset(4, 4);
    this.player.setCollideWorldBounds(true);
    this.pv = this.add.sprite(px, py, 'player', 'idle0').setOrigin(0.5, 1).setDepth(7);       // visual (squash & stretch safe)
    this.gun = this.add.image(px, py, 'gun_nail').setDepth(8);
    this.applyGunTexture();
    this.visor = this.add.image(px, py, 'glow').setBlendMode(ADD).setTint(0x46e6ff).setScale(0.35).setAlpha(0.55).setDepth(18);
    this.enemies = this.physics.add.group();
    if (!this.carry && this.mode.lifetime) LIFE.runs++;                  // a fresh scored run (not a trip down the lift)
    this.enemiesLeft = 0;
    this.spawnBarrels(false); this.spawnCanisters(false);
    this.pickups = this.A.spawns.health.map(([cx, cy]) => {
      const x = cx * TS + 8, y = (cy + 1) * TS - 8;
      return { x, y, ph: Math.random() * 6, taken: false, img: this.add.image(x, y, 'medkit').setDepth(4),
               glow: this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0x40ff70).setScale(1.3).setAlpha(0.4).setDepth(17) };
    });
    if (this.mutator === 'vamp') for (const k of this.pickups) { k.taken = true; k.img.setVisible(false); k.glow.setVisible(false); }   // VAMPIRE: no medkits
  }

  spawnEnemy(kind, cx, cy) {
    const D = ENEMY[kind], x = cx * TS + 8, flier = !!D.flier;
    const y = flier ? cy * TS + 8 : (cy + 1) * TS - D.fh / 2;
    if (this.mode.lifetime) markSeen(kind);
    const e = this.enemies.create(x, y, D.key, D.frame0);
    e.body.setSize(D.bw, D.bh).setOffset((D.fw - D.bw) / 2, flier ? (D.fh - D.bh) / 2 : D.fh - D.bh);
    e.setDepth(5).setCollideWorldBounds(true);
    // NB: custom fields avoid Phaser-reserved names such as `type` and `state`
    Object.assign(e, { kind, def: D, hp: D.hp, alive: true, dir: Math.random() < 0.5 ? -1 : 1, ai: 'patrol', aiUntil: 0, aggro: false, aggroT: 0,
      stunT: 0, flashT: 0, jumpCd: 0, leapCd: 1.5, fireCd: rand(0.8, 1.6), t: Math.random() * 10, homeX: x, homeY: y, animT: 0,
      idleT: rand(1.5, 3.5), losT: Math.random() * 0.15, sees: false, wasGround: true, airT: 0, fr: D.frame0,
      dmgAcc: 0, dmgHead: false, dmgFlushAt: 0, healAcc: 0, healFlushAt: 0, lastHs: false,
      burnT: 0, burnTick: 0, spreadT: 0, panicT: 0, panicDir: 1, kickedT: 0, lastVx: 0, summoned: false, corrodeT: 0, tbHeld: false });
    if (D.setup) this[D.setup](e, x, y, cx, cy);                      // its own fields and parts: glows, guns, timers, segments
    if (this.lab?.stationary) {
      e.body.setAllowGravity(false); e.body.setVelocity(0, 0);
      // Ceiling climbers and paratroopers normally relocate on spawn. Keep their test position.
      if (kind === 'para' || kind === 'claw') e.body.reset(x, y);
    }
    return e;
  }

  buildColliders() {
    const P = this.physics;
    P.add.collider(this.player, this.solids);
    P.add.collider(this.player, this.oneways, null, () => this.time.now >= this.dropUntil);
    P.add.collider(this.enemies, this.solids, null, e => !e.def.noClip);
    P.add.collider(this.enemies, this.oneways, null, e => e.kind !== 'drone' && !FLIERS.has(e.kind) && this.time.now >= (e.dropUntil || 0));
    P.add.overlap(this.saws, this.enemies, this.onSawHit, null, this);
    P.add.collider(this.barrels, this.solids);
    P.add.collider(this.barrels, this.oneways);
    P.add.overlap(this.bullets, this.barrels, (b, k) => { if (b.active && k.active) { const x = b.x, y = b.y; b.disableBody(true, true); this.fxSparks(x, y, 4, b.ang + Math.PI, 1.4); this.damageBarrel(k, b.dmg); } });
    P.add.overlap(this.saws, this.barrels, (s, k) => { if (s.active && k.active && !(s.hitMap.get(k) > this.time.now)) { s.hitMap.set(k, this.time.now + 300); this.damageBarrel(k, TUNE.SAW.damage); } });
    P.add.overlap(this.player, this.ebullets, this.onEBulletHit, null, this);
    P.add.collider(this.gibs, this.solids);
    P.add.collider(this.gibs, this.oneways);
    P.add.overlap(this.bullets, this.enemies, this.onBulletHit, null, this);
    P.add.overlap(this.bullets, this.pipeGroup, (b, sp) => { if (!b.active) return; const pp = this.pipes.find(q => q.sp === sp); if (pp && !pp.broken) { b.disableBody(true, true); this.burstPipe(pp); } });
    P.add.overlap(this.rockets, this.enemies, this.onRocketHit, null, this);
    P.add.collider(this.grenades, this.solids);
    P.add.collider(this.grenades, this.oneways);
    P.add.overlap(this.grenades, this.enemies, this.onGrenadeHit, null, this);
    P.add.collider(this.balls, this.solids); P.add.collider(this.balls, this.oneways);
    P.add.overlap(this.balls, this.enemies, this.onBallHit, null, this);
    // single sprite first: Arcade then always passes (sprite, groupChild) to the callback
    P.add.overlap(this.player, this.bolts, this.onBoltHit, null, this);
    P.add.overlap(this.player, this.enemies, this.onTouchEnemy, null, this);
    P.add.overlap(this.player, this.gibs, this.onKickGib, null, this);
    P.add.collider(this.mines, this.solids); P.add.collider(this.mines, this.oneways);
    P.add.collider(this.charges, this.solids); P.add.collider(this.charges, this.oneways);
    P.add.collider(this.haywires, this.solids);
    P.add.collider(this.canisters, this.solids); P.add.collider(this.canisters, this.oneways);
  }

  buildInput() {
    this.keys = this.bindKeys();
    this.input.on('pointermove', () => { this.aimMode = 'mouse'; });
    this.input.on('pointerdown', ptr => { this.aimMode = 'mouse'; Sfx.init(); if (ptr.rightButtonDown()) this.kickQueued = true; if (ptr.middleButtonDown()) this.mineQueued = true; });
    this.input.on('wheel', (ptr, over, dx, dy) => {
      if (this.time.now - this.wheelT < 110) return;
      this.wheelT = this.time.now; this.cycleWeapon(dy > 0 ? 1 : -1);
    });
    if (this.input.mouse) this.input.mouse.disableContextMenu();
    this.input.setDefaultCursor('none');
  }

  // -------------------------------------------------------------- helpers ----
  solidAt(x, y) {
    const tx = Math.floor(x / TS), ty = Math.floor(y / TS);
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return true;
    const c = this.grid[ty][tx]; return c === '#' || c === 'x' || c === 'g';
  }
  stepOk(x, feet) { for (let d = 4; d <= 52; d += 16) if (this.standAt(x, feet + d)) return true; return false; }   // ground ahead, or a drop of 3 tiles at most
  standAt(x, y) {
    const tx = Math.floor(x / TS), ty = Math.floor(y / TS);
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return true;
    return this.grid[ty][tx] !== '.';
  }
  losHard(x0, y0, x1, y1) {                                           // line of sight that ignores breakables (but not reinforced ones)
    const dx = x1 - x0, dy = y1 - y0, n = Math.ceil(Math.hypot(dx, dy) / 6);
    for (let i = 1; i < n; i++) {
      const tx = Math.floor((x0 + dx * i / n) / TS), ty = Math.floor((y0 + dy * i / n) / TS);
      if (this.tileAt(tx, ty) === '#' || this.hardTiles?.has(ty * MAP_W + tx)) return false;
    }
    return true;
  }
  los(x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0, n = Math.ceil(Math.hypot(dx, dy) / 6);
    for (let i = 1; i < n; i++) if (this.solidAt(x0 + dx * i / n, y0 + dy * i / n)) return false;
    return true;
  }
  sweep(x0, y0, x1, y1) {          // grid ray between frames: no tunnelling through walls
    const dx = x1 - x0, dy = y1 - y0, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 3));
    let lx = x0, ly = y0;
    for (let i = 1; i <= n; i++) {
      const x = x0 + dx * i / n, y = y0 + dy * i / n;
      if (this.solidAt(x, y)) return { x: lx, y: ly };
      lx = x; ly = y;
    }
    return null;
  }
  shake(dur, intensity) {
    PAD.rumble(dur, intensity * 90);
    intensity *= OPTS.shake; if (intensity <= 0) return;                 // pause menu: screen shake 100 / 50 / 0 %
    const now = this.time.now;
    if (now < this.shakeUntil && intensity <= this.shakeInt) return;
    this.cameras.main.shake(dur, intensity, true);
    this.shakeUntil = now + dur; this.shakeInt = intensity;
  }
  hitStop(ms) { this.hitStopUntil = Math.max(this.hitStopUntil, this.time.now + ms); }
  squash(sx, sy) { this.sqx = sx; this.sqy = sy; }

  lvlMark(x, y, r, y1) {                                                 // flag the level tiles a paint touched (y1: a tall strip)
    const tw = LW / 8, th = LH / 2, i0 = clamp(Math.floor((x - r) / tw), 0, 7), i1 = clamp(Math.floor((x + r) / tw), 0, 7);
    const j0 = clamp(Math.floor((y - r) / th), 0, 1), j1 = clamp(Math.floor(((y1 !== undefined ? y1 : y) + r) / th), 0, 1);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const T = this.lvlTiles[j * 8 + i]; if (T) T.dirty = true; }
    this.lvlDirty = true;
  }
  flushLevel() {                                                         // copy each dirty tile out of the big canvas and upload just that
    const src = this.lvlTex.canvas || this.lvlTex.getSourceImage();
    for (const T of this.lvlTiles) if (T.dirty) { T.dirty = false; T.tc.clearRect(0, 0, T.w, T.h); T.tc.drawImage(src, T.x, T.y, T.w, T.h, 0, 0, T.w, T.h); T.tt.refresh(); }
  }
  // persistent gore: paint straight into the level canvas. 'source-atop' keeps paint on tile pixels only.
  paintDrop(x, y, col, wall) {
    const c = this.lvlCtx, ix = x | 0, iy = y | 0;
    c.globalCompositeOperation = 'source-atop'; c.fillStyle = numCss(col);
    c.fillRect(ix, iy, 1, 1);
    if (Math.random() < 0.5) c.fillRect(ix + randi(-1, 1), iy + randi(-1, 1), 1, 1);
    if (wall && Math.random() < 0.3) c.fillRect(ix, iy, 1, randi(2, 7));   // drip streak
    c.globalCompositeOperation = 'source-over'; this.lvlMark(ix, iy, 8);
  }
  paintSplat(x, y, r, horiz) {
    const c = this.lvlCtx; c.globalCompositeOperation = 'source-atop';
    for (let i = 0, n = Math.round(r * 4); i < n; i++) {
      c.fillStyle = BLOOD_CSS[(Math.random() * BLOOD_CSS.length) | 0];
      const ox = horiz ? rand(-r, r) : rand(-2.5, 2.5), oy = horiz ? rand(-2.5, 2.5) : rand(-r, r), s = Math.random() < 0.25 ? 2 : 1;
      c.fillRect((x + ox) | 0, (y + oy) | 0, s, s);
    }
    c.globalCompositeOperation = 'source-over'; this.lvlMark(x, y, r + 4);
  }
  paintSplatAround(x, y, r) {
    for (let yy = y; yy < y + 60; yy += 2) if (this.solidAt(x, yy)) { this.paintSplat(x, yy + 1, r, true); break; }
    for (const d of [-1, 1]) for (let xx = 0; xx < 30; xx += 2) if (this.solidAt(x + d * xx, y - 6)) { this.paintSplat(x + d * xx + d, y - 6, r * 0.6, false); break; }
  }
  paintScorch(x, y, r) {
    const c = this.lvlCtx, x0 = Math.floor(x - r), y0 = Math.floor(y - r);
    c.globalCompositeOperation = 'source-atop';
    for (let j = 0; j <= r * 2; j++) for (let i = 0; i <= r * 2; i++) {
      const dx = x0 + i - x, dy = y0 + j - y, d = Math.sqrt(dx * dx + dy * dy) / r;
      if (d >= 1 || Math.random() > (1 - d) * 0.9) continue;
      c.fillStyle = d < 0.45 ? 'rgba(6,5,5,0.7)' : 'rgba(14,10,9,0.45)';
      c.fillRect(x0 + i, y0 + j, 1, 1);
    }
    c.globalCompositeOperation = 'source-over'; this.lvlMark(x, y, r + 2);
  }
  paintHole(x, y) {
    const c = this.lvlCtx; c.globalCompositeOperation = 'source-atop';
    c.fillStyle = '#08090b'; c.fillRect(x | 0, y | 0, 1, 1);
    c.fillStyle = 'rgba(140,150,165,0.6)'; c.fillRect((x | 0) + randi(-1, 1), (y | 0) + randi(-1, 1), 1, 1);
    c.globalCompositeOperation = 'source-over'; this.lvlMark(x, y, 3);
  }

  // particle presets
  fxSparks(x, y, n, ang = 0, spread = Math.PI * 2, spd = [60, 220]) {
    this.fx.emit(x, y, { n, angle: ang, spread, speed: spd, life: [0.12, 0.38], size: [2, 1], cols: [0xffffff, 0xffe46a, 0xffa030, 0xff5a1a], g: 520, add: true, mode: 1 });
  }
  fxBlood(x, y, n, ang = 0, spread = Math.PI * 2, spd = [40, 220]) {
    this.fx.emit(x, y, { n, angle: ang, spread, speed: spd, life: [0.7, 1.6], size: [2, 2], cols: BLOOD_NUM, randCol: true, g: 760, drag: 0.4, mode: 2 });
  }
  fxMist(x, y, n) { this.fx.emit(x, y, { n, speed: [10, 70], life: [0.3, 0.7], size: [3, 7], cols: [0x8a1010, 0x5a0808], alpha: [0.55, 0], g: 30, drag: 2.5, jitter: 4 }); }
  fxSmoke(x, y, n, big = 1) { this.fx.emit(x, y, { n, speed: [6, 40 * big], life: [0.6, 1.3 * big], size: [3, Math.round(9 * big)], cols: [0x77706a, 0x55504c, 0x34312f], alpha: [0.5, 0], g: -35, drag: 1.6, jitter: 3 * big }); }
  fxFire(x, y, n) { this.fx.emit(x, y, { n, speed: [30, 170], life: [0.2, 0.55], size: [5, 1], cols: [0xffffff, 0xffe46a, 0xffa030, 0xff5a1a, 0xa82010], add: true, g: -70, drag: 3.2, jitter: 3 }); }
  fxDust(x, y, n) { this.fx.emit(x, y, { n, angle: -Math.PI / 2, spread: Math.PI * 0.9, speed: [10, 55], life: [0.25, 0.5], size: [2, 3], cols: [0x6a6f78, 0x4a4e56], alpha: [0.7, 0], g: -10, drag: 4, jitter: 3 }); }

  spawnLight(x, y, key, tint, s0, s1, a0, dur, frame, flip) {
    const l = this.lights.find(o => !o.on) || this.lights[0];
    l.setTexture(key, frame).setFlipX(!!flip).setPosition(x, y).setTint(tint).setScale(s0).setAlpha(a0).setVisible(true);
    Object.assign(l, { t: 0, dur, s0, s1, a0, on: true });
  }

  // ---------------------------------------------------------------- update ----
  update(time, delta) {
    const now = time;
    const ts = now < this.hitStopUntil ? 14 : this.wheelOn ? 6 : now < this.slowmoUntil ? 2.6 : 1;   // hit-stop / weapon wheel / slow-mo via Arcade timeScale
    this.physics.world.timeScale = ts;
    const dt = Math.min(delta, 50) / 1000 / ts;
    const K = this.keys, JD = Phaser.Input.Keyboard.JustDown;
    for (const k of ['SPACE', 'W', 'UP', 'J', 'Q', 'E', 'F', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'ZERO', 'MINUS', 'PLUS', 'BACKSPACE', 'OPEN_BRACKET',
      'CLOSED_BRACKET', 'BACK_SLASH', 'SEMICOLON', 'QUOTES', 'COMMA', 'PERIOD', 'FORWARD_SLASH', 'Z', 'X', 'K', 'L', 'U', 'I', 'O', 'Y', 'H', 'SHIFT', 'G', 'T', 'C', 'R', 'M', 'N', 'B', 'P', 'V', 'ENTER', 'ESC']) this.jd[k] = JD(K[k]);
    if (this.perkPicked) {
      // The perk hotkeys double as weapon slots. Consume the selection before checking for a swap.
      this.jd.ONE = this.jd.TWO = this.jd.THREE = false;
      this.perkPicked = false;
    }
    if (this.needReset) {
      this.needReset = false;
      const c = this.carry;
      BUS.emit('reset', { hp: this.hp, weapon: this.weapon, enemies: this.enemiesLeft, carry: !!c });
      BUS.emit('mines', TUNE.MINE.max); BUS.emit('perklist', Object.keys(this.perks));
      this.mode.begin(this, c, now);                                    // the mode's own start: its card, music and first wave
      this.musicAhead(c?.wave ?? 0);
    }
    if (this.jd.M) BUS.emit('callout', Sfx.toggleMute() ? 'MUTED' : 'SOUND ON');
    if (this.jd.B && window.SLAG_MUSIC) BUS.emit('callout', !Music.toggle() ? 'SYNTH MUSIC' : Music.sampled() ? 'SAMPLED MUSIC' : 'MUSIC TRACK UNAVAILABLE');
    if (this.jd.N && window.SLAG_SFX) { Sfx.useBank = !Sfx.useBank; Sfx.stopLoops(); Sfx.swapHum(); BUS.emit('callout', !Sfx.useBank ? 'SYNTH SFX' : Sfx.bankOk() ? 'SAMPLED SFX' : 'SFX BANK UNAVAILABLE'); }
    if (this.jd.V) { this.togglePostFx(); BUS.emit('callout', POSTFX.on ? 'POST FX ON' : 'POST FX OFF'); }
    if (this.jd.R && this.mode.confirmRestart && this.state === 'play' && this.time.now >= this.restartArmUntil) {   // R sits among the combat keys: mid-run, the first press only asks
      this.restartArmUntil = this.time.now + RESTART_CONFIRM_MS; Sfx.ui();
    } else if ((this.jd.R && (!this.mode.confirmRestart || this.state === 'play' || this.overShown)) || (this.overShown && (this.jd.ENTER || PAD.jd(0) || PAD.jd(9)))) { this.restartRun(); return; }   // not during the death/win beat: the records land with the results
    if ((this.jd.ESC || this.jd.P || PAD.hit('pause')) && this.state === 'play') { this.pauseGame(); return; }        // Esc / P / Start: pause menu (resume, restart, quit)
    else if (this.overShown && (this.jd.ESC || PAD.jd(1))) { this.quitToTitle(); return; }
    if (this.jd.J) this.aimMode = 'keys';

    if (this.state !== 'dead') { if (this.ride) this.updateRide(dt, now); else { this.updatePlayer(dt, now); this.updateHook(dt); } } else if (this.hook) this.hook = null;   // in a lift car you're along for the ride
    this.updateEnemies(dt, now); this.updateGravity(dt);
    this.updateTractor(dt, now); this.updateTars(dt, now); this.updateMagnetField(dt);
    this.updateShockOrbs(dt); this.updateNeedles(dt); this.updateJets(dt, now); this.updateDrills(dt, now); this.updateClouds(dt, now);
    this.updateFlares(dt, now); this.updateLimpets(dt, now); this.updatePipes(dt, now); this.updateEmpRings(dt, now);
    this.updateNets(dt, now); this.updateFlail(dt, now); this.updateBelts(dt, now); this.updatePresses(dt, now); this.updateSparkLinks(dt, now);
    this.updateSky(dt, now); this.updateBlades(dt, now);
    this.updateSpiders(dt, now); this.updateNapalms(dt, now); this.updateAcids(dt, now);
    this.updateSupplies(dt, now); this.updateBees(dt, now); this.updateStomps(dt, now); this.updateIces(dt, now); this.updateBalls(dt, now); this.updateHorns(dt); this.updateFireworks(dt, now); this.updateHunt(dt, now); this.updateWreck(dt, now); this.updateSplits(dt); this.updateDecoy(dt, now); this.updateDiscs(dt, now); this.updateSpores(dt, now); this.updateStasisFields(dt, now); this.updatePunch(dt, now); this.updateTrips(dt, now); this.updateAllies(dt, now); this.updateWalls(dt, now); this.updateBubbles(dt, now); this.updateHorbs(dt, now); this.updateEMines(dt, now); this.updateGlobs(dt, now); this.updateRails(dt, now); this.updateNukes(dt, now); this.updateSeeds(dt, now); this.updateTethers(dt, now);
    this.updateExpansionWeapons(dt, now);                                // expansion: weapons
    if (this.state !== 'dead') { this.hist.push({ t: now, x: this.player.x, y: this.player.y, fire: now - this.lastShotT < 140, fr: this.pFrame, face: this.facing }); while (this.hist.length && now - this.hist[0].t > 3000) this.hist.shift(); }
    if (this.revAmmo <= 0 && now >= this.revReloadUntil) { this.revAmmo = TUNE.REVOLVER.rounds; Sfx.revClick(); }
    this.updateHarpoons(dt, now); this.updateLinkBeams(dt, now);
    this.updateXFoes(dt, now);
    this.updateHornets(dt); this.updateGlaive(dt, now);
    this.updateHpOrbs(dt, now); this.updateCoils(dt, now); this.updatePWaves(dt);
    if (this.mod === 'melt' || this.tide) this.updateTide(dt, now);
    this.updatePostFx(dt, now);
    this.updateProjectiles(dt);
    this.updateStakes(dt); this.updateMines(dt); this.updateCharges(dt); this.updateHaywires(dt); this.updateCanisters(dt);
    this.updateSentry(dt, now); this.updateWrecks(dt); if (this.mod === 'slag' && this.state === 'play') this.updateSlagRain(dt);
    this.updateOrbs(dt, now);
    this.updateBarrels(dt); this.updateProps(dt, now);
    this.updatePropSpills(dt, now);
    this.updateHazards(dt, now);
    if (this.xm) this.updateArenaMachinery(dt, now);
    if (this.xb) this.updateXb(dt, now);
    if (this.routeG) { this.updateCampaignRoute(dt, now); this.updateLifts(dt, now); }
    this.updateEProjs(dt);
    this.updateFallingBlocks(dt);
    if (this.stabQ.length) this.processStability();
    if (this.breakDirty) this.rebuildBreakZones();
    if (this.onewayDirty) this.rebuildOneways();
    if (this.navDirtyT > 0 && (this.navDirtyT -= dt) <= 0) this.rebuildNav();
    this.updateGibs(dt, now);
    this.updateRagdolls(dt, now);
    this.updateAmbient(dt, now);
    this.updateFxSprites(dt);
    this.updateStyle(dt);
    this.fx.update(dt); this.fx.draw();
    this.polUpdate(dt, now);                                             // expansion: polish (cosmetic only)
    Sfx.arcSet(now < this.arcActiveUntil && this.state !== 'dead');
    Sfx.flameSet(now < this.flameActiveUntil && this.state !== 'dead');
    Sfx.cryoSet(now < this.cryoActiveUntil && this.state !== 'dead');
    Sfx.miniSet(this.state !== 'dead' ? this.spin : 0);
    Sfx.ripperSet(this.state !== 'dead' && now < this.ripperUntil ? (now < this.ripperBiteUntil ? 1 : 0.55) : 0);
    Sfx.lanceSet(this.state !== 'dead' && this.lanceOn ? this.lanceCharge : 0);
    Sfx.swarmSet(this.state !== 'dead' ? this.swarmLvl : 0);
    Sfx.acidSet(now < this.acidActiveUntil && this.state !== 'dead');
    Sfx.tractorSet(this.state !== 'dead' && this.tbOn ? (this.tb ? 1 : 0.45) : 0);
    // music follows the fight: noticed -> fighting -> boss / high style
    let I = 0;
    if (this.state === 'play') {
      let aware = 0; for (const e of this.enemies.getChildren()) if (e.alive && e.aggro) aware++;
      if (aware > 0) I = 1;
      if (aware >= 3 || this.style.rank >= 2) I = 2;
      if ((this.boss && this.boss.alive) || this.style.rank >= 4 || now < this.rampageUntil) I = 3;
    }
    Music.intensity = I;

    const mode = this.state === 'dead' ? 'none' : this.aimMode;
    if (mode !== this.lastAimMode) { this.lastAimMode = mode; BUS.emit('aim', mode); }
    if (this.state !== 'dead' && this.hp <= 30) {                     // low-health heartbeat, faster as HP drops
      this.heartT -= delta / 1000;
      if (this.heartT <= 0) { this.heartT = 0.55 + this.hp / 60; Sfx.heart(); }
    }
    if (this.lvlDirty && now - this.lvlRefreshAt > 90) { this.flushLevel(); this.lvlDirty = false; this.lvlRefreshAt = now; }   // throttled GPU upload, dirty tiles only
  }

  updatePlayer(dt, now) {
    const T = TUNE, p = this.player, b = p.body, K = this.keys;
    const left = K.A.isDown || K.LEFT.isDown || PAD.ax[0] < -0.35 || PAD.down(14), right = K.D.isDown || K.RIGHT.isDown || PAD.ax[0] > 0.35 || PAD.down(15), down = K.S.isDown || K.DOWN.isDown || PAD.ax[1] > 0.6;
    const jumpHeld = K.SPACE.isDown || K.W.isDown || K.UP.isDown || PAD.held('jump');
    const jumpPressed = this.jd.SPACE || this.jd.W || this.jd.UP || PAD.hit('jump');
    const onGround = b.blocked.down || b.touching.down;
    if (onGround) { this.lastGround = now; this.wallT = -1e9; this.wallLockUntil = 0; }
    if (jumpPressed) this.jumpBuffer = now;

    // horizontal: snappy accel on ground, softer in air, rocket-jump momentum decays slowly
    const tarK = (this.tarT > 0 ? T.TARSPIT.slow : 1) * (this.leechN > 0 ? T.LEECH.slow : 1) * (now < this.hasteUntil ? 1.25 : 1) * (this.chillT > 0 ? 0.7 : 1) * (this.time.now < this.siphonUntil ? TUNE.SIPHON.slow : 1) * (this.time.now < this.shieldUntil ? TUNE.SHIELD.slow : 1);   // wading through tar; leeches drag on you; HASTE; chilled; siphoning
    const dir = (right ? 1 : 0) - (left ? 1 : 0), target = dir * T.RUN_SPEED * (1 - 0.4 * this.spin) * tarK;   // a spun-up minigun slows you
    let vx = b.velocity.x;
    const speedUp = dir !== 0 && Math.sign(vx) !== -dir;
    if (onGround) vx = approach(vx, target, (speedUp ? T.GROUND_ACCEL : T.GROUND_DECEL) * dt * (this.onIce ? (speedUp ? T.CHILLER.grip : T.CHILLER.slide) : 1));   // ice: slow to get going, slower to stop or turn
    else if (Math.abs(vx) > T.RUN_SPEED && (dir === 0 || dir === Math.sign(vx))) vx = approach(vx, Math.sign(vx) * T.RUN_SPEED, T.AIR_MOMENTUM_DECAY * dt);
    else vx = approach(vx, target, (dir ? T.AIR_ACCEL : T.AIR_DECEL) * dt);
    if (now >= this.wallLockUntil || dir * this.wallSide < 0) b.setVelocityX(vx);  // briefly resist steering back into the launch wall

    // jump: buffered + coyote time; S/Down + jump drops through gratings
    let jumped = false;
    if (jumpPressed && down && onGround && this.onOneWay()) {
      this.dropUntil = now + 260; this.jumpBuffer = -1e9; b.setVelocityY(60);
    } else if (now - this.jumpBuffer <= T.JUMP_BUFFER_MS && now - this.lastGround <= T.COYOTE_MS) {
      b.setVelocityY(-T.JUMP_VELOCITY * (this.tarT > 0 ? T.TARSPIT.jump : 1)); this.jumpBuffer = -1e9; this.lastGround = -1e9; this.jumpCuttable = true; jumped = true;
      Sfx.jump(); this.fxDust(p.x, b.bottom, 5); this.squash(0.72, 1.3);
    }
    const W2 = T.WALL;
    let wall = 0;
    if (!onGround && now >= this.wallLockUntil) {
      const nearWall = x => this.solidAt(x, b.top + 4) || this.solidAt(x, b.center.y) || this.solidAt(x, b.bottom - 5);
      const leftWall = nearWall(b.left - W2.reach), rightWall = nearWall(b.right + W2.reach);
      wall = leftWall && rightWall ? dir || this.wallSide : leftWall ? -1 : rightWall ? 1 : 0;
      if (wall) { this.wallSide = wall; this.wallT = now; }
    }
    this.sliding = wall !== 0 && wall === dir && b.velocity.y > 0;
    if (this.sliding) {
      if (b.velocity.y > W2.slide) b.setVelocityY(W2.slide);
      if ((this.slideFxT -= dt) <= 0) { this.slideFxT = 0.06; this.fx.emit(p.x + this.wallSide * 5, b.bottom - 4, { n: 1, angle: -Math.PI / 2, spread: 0.8, speed: [10, 40], life: [0.2, 0.4], size: [2, 1], cols: [0x8a8580, 0x5a5652], alpha: [0.6, 0], g: -20 }); }
    }
    if (now - this.jumpBuffer <= T.JUMP_BUFFER_MS && !jumped && !onGround && now - this.lastGround > T.COYOTE_MS) {
      if (now - this.wallT < W2.grace && this.wallSide) {                 // wall jump
        const steer = dir * this.wallSide;
        const push = steer > 0 ? W2.climbX : steer < 0 ? W2.crossX : W2.jumpX;
        b.setVelocity(-this.wallSide * push, -T.JUMP_VELOCITY * W2.jumpK);
        this.wallLockUntil = now + W2.lock;
        this.jumpBuffer = -1e9; this.wallT = -1e9; this.jumpCuttable = true; this.djUsed = false; jumped = true;
        Sfx.jump(); this.squash(0.75, 1.3); this.fxDust(p.x + this.wallSide * 5, p.y + 4, 5); this.addStyle(8);
      } else if (jumpPressed && this.perks.djump && !this.djUsed) {                      // double jump (perk)
        b.setVelocityY(-T.JUMP_VELOCITY * 0.88); this.djUsed = true; this.jumpBuffer = -1e9; this.jumpCuttable = true; jumped = true;
        Sfx.jump(); this.squash(0.8, 1.25); this.spawnLight(p.x, b.bottom, 'ring', 0xc8a0ff, 0.2, 0.9, 0.8, 0.18);
        this.fx.emit(p.x, b.bottom, { n: 8, angle: Math.PI / 2, spread: 1.4, speed: [30, 90], life: [0.2, 0.4], size: [2, 1], cols: [0xffffff, 0xd0b8ff, 0x8a60ff], add: true });
      }
    }
    if (onGround) this.djUsed = false;
    if (this.jumpCuttable && !jumpHeld && now >= this.wallLockUntil && b.velocity.y < -80) { b.setVelocityY(b.velocity.y * T.JUMP_CUT); this.jumpCuttable = false; }
    if (b.velocity.y >= 0) this.jumpCuttable = false;
    b.setGravityY(b.velocity.y > 0 ? T.FALL_EXTRA : 0);
    if (b.velocity.y > T.MAX_FALL) b.setVelocityY(T.MAX_FALL);
    if (onGround && !this.wasGround && this.lastVy > 160) {
      this.squash(1.3, 0.72); this.fxDust(p.x, b.bottom, Math.min(10, (this.lastVy / 50) | 0)); Sfx.land(Math.min(1, this.lastVy / 500));
      if (this.lastVy > 420) { this.shake(90, 0.003); this.addKick(0, 3); }
    }
    this.wasGround = onGround; this.lastVy = b.velocity.y;

    // dash (Shift): a short burst in the held direction with i-frames; one in the air until you land
    if (onGround) this.dashAir = true;
    const up = K.W.isDown || K.UP.isDown || PAD.ax[1] < -0.6;
    if ((this.jd.SHIFT || PAD.hit('dash')) && now >= this.dashReady && (onGround || this.dashAir)) this.startDash(now, dir, (down ? 1 : 0) - (up ? 1 : 0), onGround);
    if (now < this.dashUntil) {
      b.setVelocity(this.dashVx, this.dashVy);
      if ((this.dashGhostT -= dt) <= 0) { this.dashGhostT = 0.022; this.spawnLight(this.pv.x, this.pv.y - 12, 'player', 0x46e6ff, 1, 1, 0.55, 0.2, this.pFrame, this.facing < 0); }
      this.fx.emit(p.x, p.y + rand(-7, 7), { n: 1, angle: Math.atan2(-this.dashVy, -this.dashVx), spread: 0.3, speed: [40, 120], life: [0.1, 0.22], size: [2, 1], cols: [0xffffff, 0x9af0ff, 0x46b8f0], add: true });
      if (this.perks.burner) {                                          // afterburner: the dash trails fire and lights what it passes
        this.fxFire(p.x, p.y + 4, 1);
        for (const e of this.enemies.getChildren()) if (e.alive && !e.under && Math.abs(e.body.center.x - p.x) < 14 && Math.abs(e.body.center.y - p.y) < 18) this.ignite(e, 3);
      }
    } else if (this.dashing) {
      this.dashing = false; b.setAllowGravity(true);
      b.setVelocity(this.dashVx * TUNE.DASH.keep, this.dashVy * TUNE.DASH.keep);
    }
    if (this.diving) {                                                  // hammer ground-pound: straight down, slam on landing
      b.setVelocityY(TUNE.HAMMER.dive); b.velocity.x *= Math.pow(0.02, dt);
      if ((this.diveFxT = (this.diveFxT || 0) - dt) <= 0) { this.diveFxT = 0.02; this.spawnLight(this.pv.x, this.pv.y - 12, 'player', 0xffa040, 1, 1, 0.5, 0.18, this.pFrame, this.facing < 0); }
      if (onGround) { this.diving = false; this.hammerSlam(now, this.diveCharge, true); }
    }
    this.hammerSwing = Math.max(0, this.hammerSwing - dt);

    // aim
    const sx = p.x + (this.facing > 0 ? 0 : -1), sy = p.y - 2;
    this.shoulder.x = sx; this.shoulder.y = sy;
    if (Math.hypot(PAD.ax[2], PAD.ax[3]) > 0.3) this.aimMode = 'pad';
    if (this.aimMode === 'mouse') {
      const wp = this.input.activePointer.positionToCamera(this.cameras.main, this._v);
      this.aimPt = wp; this.aim = Math.atan2(wp.y - sy, wp.x - sx);
      this.facing = Math.cos(this.aim) >= 0 ? 1 : -1;
    } else if (this.aimMode === 'pad') {                                  // right stick aims; let go and the aim holds
      if (Math.hypot(PAD.ax[2], PAD.ax[3]) > 0.3) {
        let a = Math.atan2(PAD.ax[3], PAD.ax[2]), best = null, bd = TUNE.AIMASSIST.cone;   // aim assist: lean toward a foe close to the stick's line
        for (const e of this.enemies.getChildren()) {
          if (!e.alive || e.under) continue;
          const ex = e.body.center.x - sx, ey = e.body.center.y - sy, d = Math.hypot(ex, ey); if (d > TUNE.AIMASSIST.range || d < 8) continue;
          let df = Math.atan2(ey, ex) - a; df = Math.atan2(Math.sin(df), Math.cos(df));
          if (Math.abs(df) < bd && this.los(sx, sy, e.body.center.x, e.body.center.y)) { bd = Math.abs(df); best = df; }
        }
        if (best !== null) a += best * TUNE.AIMASSIST.pull;
        this.aim = a;
      }
      this.facing = Math.cos(this.aim) >= 0 ? 1 : -1;
      this.aimPt = { x: sx + Math.cos(this.aim) * 70, y: sy + Math.sin(this.aim) * 70 };
    } else {
      if (dir) this.facing = dir;
      this.aim = down ? Math.PI / 2 : this.facing > 0 ? 0 : Math.PI;
    }
    // camera look-ahead toward the cursor / facing
    let lx = this.facing * 24, ly = 0;
    if (this.aimMode === 'mouse' && this.aimPt) { lx = clamp((this.aimPt.x - p.x) * 0.22, -56, 56); ly = clamp((this.aimPt.y - p.y) * 0.22, -36, 36); }
    else if (this.aimMode === 'pad') { lx = Math.cos(this.aim) * 44; ly = Math.sin(this.aim) * 26; }
    const k = Math.min(1, dt * 4);
    this.look.x += (lx - this.look.x) * k; this.look.y += (ly - this.look.y) * k;

    // weapons
    if (this.jd.ONE && !this.perkOffer) this.setWeapon(0);
    if (this.jd.TWO && !this.perkOffer) this.setWeapon(1);
    if (this.jd.THREE && !this.perkOffer) this.setWeapon(2);
    if (this.jd.FOUR) this.setWeapon(3);
    if (this.jd.FIVE) this.setWeapon(4);
    if (this.jd.SIX) this.setWeapon(5);
    if (this.jd.SEVEN) this.setWeapon(6);
    if (this.jd.EIGHT) this.setWeapon(7);
    if (this.jd.NINE) this.setWeapon(8);
    if (this.jd.ZERO) this.setWeapon(9);
    if (this.jd.MINUS) this.setWeapon(10);
    if (this.jd.PLUS) this.setWeapon(11);
    if (this.jd.BACKSPACE) this.setWeapon(12);
    if (this.jd.OPEN_BRACKET) this.setWeapon(13);
    if (this.jd.CLOSED_BRACKET) this.setWeapon(14);
    if (this.jd.BACK_SLASH) this.setWeapon(15);
    if (this.jd.SEMICOLON) this.setWeapon(16);
    if (this.jd.QUOTES) this.setWeapon(17);
    if (this.jd.COMMA) this.setWeapon(18);
    if (this.jd.PERIOD) this.setWeapon(19);
    if (this.jd.FORWARD_SLASH) this.setWeapon(20);
    if (this.jd.Z) this.setWeapon(21);
    if (this.jd.X) this.setWeapon(22);
    if (this.jd.K) this.setWeapon(23);
    if (this.jd.L) this.setWeapon(24);
    if (this.jd.U) this.setWeapon(25);
    if (this.jd.I) this.setWeapon(26);
    if (this.jd.O) this.setWeapon(27);
    if (this.jd.Y) this.setWeapon(28);
    if (this.jd.H) this.setWeapon(29);
    if (PAD.hit('prev')) this.cycleWeapon(-1);
    if (PAD.hit('next')) this.cycleWeapon(1);
    if (this.jd.C || PAD.hit('hook')) { if (this.hook && this.hook.state === 'zip') this.endHook(); else this.fireHook(now); }
    if (PAD.hit('kick')) this.kickQueued = true;
    if (PAD.hit('mine')) this.mineQueued = true;
    if ((this.jd.F || this.kickQueued) && now >= this.kickReady) this.bootKick(now);
    this.kickQueued = false;
    if ((this.jd.G || this.mineQueued) && now >= this.mineReady) this.throwMine(now);
    this.mineQueued = false;
    if (this.jd.T || PAD.hit('sentry')) this.deploySentry(now);
    const tab = (K.TAB.isDown || PAD.held('wheel')) && this.state === 'play';   // hold Tab (or LB): weapon wheel, time crawls
    if (tab && !this.wheelOn) { this.wheelOn = true; this.wheelSel = this.weapon; Sfx.ui(); }
    if (this.wheelOn) {
      const wp = this.input.activePointer, wx = wp.x - VIEW_W / 2, wy = wp.y - (VIEW_H / 2 + 10);
      const slots = this.weaponSlots, N = slots.length;
      if (this.aimMode === 'mouse' && Math.hypot(wx, wy) > 46) {
        let a = Math.atan2(wy, wx) + Math.PI / 2; if (a < 0) a += Math.PI * 2;
        const sel = slots[Math.round(a / (Math.PI * 2 / N)) % N];
        if (sel !== this.wheelSel) { this.wheelSel = sel; Sfx.tink(0.4); }
      }
      if (Math.hypot(PAD.ax[2], PAD.ax[3]) > 0.55) {                    // right stick points at a slot
        let a = Math.atan2(PAD.ax[3], PAD.ax[2]) + Math.PI / 2; if (a < 0) a += Math.PI * 2;
        const sel = slots[Math.round(a / (Math.PI * 2 / N)) % N];
        if (sel !== this.wheelSel) { this.wheelSel = sel; Sfx.tink(0.4); }
      }
      if (this.jd.Q) { this.wheelSel = this.stepWeaponSlot(this.wheelSel, -1); Sfx.tink(0.4); }
      if (this.jd.E) { this.wheelSel = this.stepWeaponSlot(this.wheelSel, 1); Sfx.tink(0.4); }
      if (!tab) { this.wheelOn = false; if (this.wheelSel !== this.weapon) this.setWeapon(this.wheelSel); else Sfx.ui(); }
    } else {
      if (this.jd.Q) this.cycleWeapon(-1);
      if (this.jd.E) this.cycleWeapon(1);
    }
    const jammed = now < this.jamUntil;
    const ptr = this.input.activePointer, trig = !this.wheelOn && !jammed && ((ptr.isDown && ptr.leftButtonDown()) || K.J.isDown || PAD.pull('fire') > 0.3), mini = WEAPONS[this.weapon].id === 'mini';
    if (jammed && Math.random() < 0.3) this.fxSparks(this.shoulder.x + Math.cos(this.aim) * 14, this.shoulder.y + Math.sin(this.aim) * 14, 1, 0, Math.PI * 2, [30, 90]);
    this.spin = clamp(this.spin + (mini && trig ? dt / TUNE.MINI.spinUp : -dt / 0.7), 0, 1);   // minigun barrels spin up before they bite
    const wid = WEAPONS[this.weapon].id;
    if (wid === 'hornet') this.hornetTrigger(trig, now);                // hold to paint locks, release to launch
    else if (wid === 'lance') this.lanceTrigger(trig, now, dt);         // hold to charge, release to fire
    else if (wid === 'hammer') this.hammerTrigger(trig, now, dt);       // tap: swing; hold: slam / ground-pound
    else if (wid === 'coil') this.coilTrigger(trig, now, dt);           // tap: throw a coil; hold: overload them all
    else if (wid === 'tractor') this.tractorTrigger(trig, now, dt);     // hold: grab and carry; release: throw
    else if (wid === 'shock') this.shockTrigger(trig, now, dt);
    else if (wid === 'limpet') this.limpetTrigger(trig, now, dt);       // tap: stick a limpet; hold: set them all off
    else if (wid === 'flail') this.flailTrigger(trig, now, dt);         // hold: whirl it round you; release: hurl it
    else if (wid === 'vacuum') this.vacuumTrigger(trig, now, dt);       // hold: suck up scrap; release: blast it out
    else if (wid === 'shield') this.shieldTrigger(trig, now, dt);       // hold: block and reflect; release: bash
    else if (wid === 'orbital') this.orbitalTrigger(trig, now, dt);     // hold to paint a target; the strike follows         // tap: slow orb; hold + release: beam (hit an orb: COMBO)
    else if (wid === 'glaive') { if (trig && now >= this.nextFire && !this.glaive.on) this.throwGlaive(now); }
    else if (trig && now >= this.nextFire && (!mini || this.spin > 0.3)) this.fire(now);
    this.glaiveHold = wid === 'glaive' && trig;                         // holding keeps a thrown glaive grinding in place
    this.trigPrev = trig;
    this.heat = Math.max(0, this.heat - dt * (trig && mini ? 0.12 : 0.5));
    this.recoil = Math.max(0, this.recoil - 40 * dt);
    this.swapT = Math.max(0, this.swapT - dt);

    // animation
    let frame, bob = 0;
    if (!onGround) frame = this.sliding ? 'fall' : b.velocity.y < 0 ? 'jump' : 'fall';
    else if (Math.abs(b.velocity.x) > 25) {
      this.runT += dt * (Math.abs(b.velocity.x) / T.RUN_SPEED) * 13;
      let i = Math.floor(this.runT) % 6;
      if (Math.sign(b.velocity.x) !== this.facing) i = 5 - i;       // backpedal
      frame = 'run' + i; bob = RUN_BOB[i];
      const step = Math.floor(this.runT / 3);
      if (step !== this.stepIdx) { this.stepIdx = step; this.fxDust(p.x - this.facing * 2, b.bottom, 1); Sfx.step(); }
    } else { this.idleT += dt; const i = Math.floor(this.idleT * 1.6) % 2; frame = 'idle' + i; bob = i; }
    if (now < this.kickUntil) { frame = 'kick'; bob = 0; }
    this.pFrame = frame; this.pBob = bob;
    const sk = Math.min(1, dt * 12);
    this.sqx += (1 - this.sqx) * sk; this.sqy += (1 - this.sqy) * sk;
    if (now < this.rampageUntil && (this.ghostT -= dt) <= 0) { this.ghostT = 0.05; this.spawnLight(this.pv.x, this.pv.y - 12, 'player', 0xff5020, 1, 1, 0.55, 0.22, this.pFrame, this.facing < 0); }   // rampage afterimages
  }
  onOneWay() {
    const b = this.player.body, y = b.bottom + 2;
    const a = this.grid[Math.floor(y / TS)], l = a && a[Math.floor((b.left + 1) / TS)], r = a && a[Math.floor((b.right - 1) / TS)];
    const hard = c => c === '#' || c === 'x' || c === 'g';
    return (l === '=' || r === '=') && !hard(l) && !hard(r);
  }
  applyGunTexture() {
    const G = GUNS[WEAPONS[this.weapon].gun];
    this.gun.setTexture('gun_' + WEAPONS[this.weapon].gun).setOrigin(2 / G.w, (G.py + 0.5) / G.h);
  }
  setWeapon(i) {
    if (i === this.weapon || this.state === 'dead') return;
    if (!this.weaponSlots.includes(i)) {
      if (this.campaign) { Sfx.tink(0.6); BUS.emit('callout', 'NOT ISSUED'); }
      return;
    }
    if (this.locked && this.locked.has(i)) { Sfx.tink(0.6); BUS.emit('callout', 'STOLEN!'); return; }   // a pilferer has it
    this.wNext[this.weapon] = this.nextFire;                          // each gun keeps its own cooldown: swapping off a slow gun
    this.weapon = i; this.shieldHeld = false; this.applyGunTexture(); this.swapT = 0.14; this.arcActiveUntil = 0; this.flameActiveUntil = 0; this.cryoActiveUntil = 0;   // gun dips and comes back up
    this.locks = []; this.hornetHeld = false; this.lanceOn = false; this.lanceCharge = 0; this.lanceFullT = 0; this.ripperUntil = 0; this.hammerOn = false; this.hammerCharge = 0; this.coilHeld = false;   // swapping drops locks and charge
    if (this.tb) this.tractorDrop(); this.tbOn = false; this.acidActiveUntil = 0; this.shockHeld = false; this.shockReady = false; this.limpetHeld = false;
    if (this.sky.st === 'paint') this.sky.st = 'idle';
    if (this.flail.st === 'spin') this.flail.st = 'idle';
    this.xwDrop();                                                      // the heat ray's lock, the jet, a spear out on its cable
    this.nextFire = Math.max(this.wNext[i] || 0, this.time.now + 120);   // never locks the next one out
    Sfx.swap(); BUS.emit('weapon', i);
  }
  stepWeaponSlot(current, direction) {
    const slots = this.weaponSlots, n = slots.length;
    let i = slots.indexOf(current);
    for (let k = 0; k < n; k++) {
      i = (i + direction + n) % n;
      if (!this.locked.has(slots[i])) return slots[i];
    }
    return current;
  }
  cycleWeapon(d) { this.setWeapon(this.stepWeaponSlot(this.weapon, d)); }
  issueWeapons(ids) {
    if (!ids) return;
    const issued = ids.map(weaponSlot).filter(i => !this.weaponSlots.includes(i));
    if (!issued.length) return;
    this.weaponSlots.push(...issued);
    this.unlockSlots = issued;
    this.unlockUntil = this.time.now + 6200;
    Sfx.pickup();
    const pb = this.player.body; this.beamIn(pb.center.x, pb.bottom, 26, []);   // the supply teleporter delivers it to you
  }
  tickBoom(e) {
    if (!e.alive) return;
    const x = e.body.center.x, y = e.body.center.y;
    this.killEnemy(e, 0, -1, 'tickboom');
    this.explode(x, y, TUNE.TICK);
  }
  sniperShoot(e) {
    const T = TUNE.SNIPER, sx = e.x + (e.dir > 0 ? 0 : -1), sy = e.y - 2, a = e.aimA + rand(-0.6, 0.6) * DEG;
    const mx = sx + Math.cos(e.aimA) * 31, my = sy + Math.sin(e.aimA) * 31;
    e.recoil = 4;
    this.spawnLight(mx, my, 'glow', 0x9adcff, 1, 2, 1, 0.12); this.fxSparks(mx, my, 6, e.aimA, 0.5, [80, 220]); this.fxSmoke(mx, my, 3);
    Sfx.snipe();
    if (this.solidAt(mx, my) || !this.los(sx, sy, mx, my)) return;
    this.spawnEBullet(mx, my, a, T.bulletSpeed, T.damage, { tex: 'sbullet', size: 4, life: 1.2, snipe: true });
  }
  bossMortar(e, phase) {
    const n = phase >= 3 ? 5 : 3, pb = this.player.body, G = this.physics.world.gravity.y, T = 0.95;
    const x0 = e.x + e.dir * 18, y0 = e.body.top - 2;
    Sfx.mortar();
    for (let i = 0; i < n; i++) {
      const s = this.slags.getFirstDead(false); if (!s) break;
      const tx = clamp(pb.center.x + (i - (n - 1) / 2) * 42 + rand(-10, 10), 40, LW - 40);
      let ty = pb.bottom;
      for (let yy = pb.bottom - 4; yy < pb.bottom + 120; yy += 4) if (this.standAt(tx, yy)) { ty = Math.floor(yy / TS) * TS; break; }
      s.enableBody(true, x0, y0, true, true); s.body.setAllowGravity(true); s.body.setSize(5, 5, true);
      s.setVelocity((tx - x0) / T, (ty - 4 - y0 - 0.5 * G * T * T) / T);
      Object.assign(s, { px: x0, py: y0, rain: false });
      s.glow.setVisible(true);
      this.spawnLight(tx, ty - 2, 'ring', 0xff4020, 1.2, 0.5, 0.9, T);   // landing markers
      this.spawnLight(tx, ty - 2, 'glow', 0xff3010, 1.4, 1.0, 0.6, T);
    }
    this.fxSmoke(x0, y0, 6); this.shake(120, 0.004);
  }
  bossRing(e) {                                                        // OVERHEAT: ten slag shells fanned up and out
    const x0 = e.x, y0 = e.body.top + 4;
    Sfx.mortar(); Sfx.roar(); this.shake(240, 0.008); this.spawnLight(x0, y0, 'ring', 0xff6a20, 0.3, 3, 0.9, 0.3);
    for (let k = 0; k < 10; k++) {
      const s2 = this.slags.getFirstDead(false); if (!s2) break;
      const a = -Math.PI + (k + 0.5) / 10 * Math.PI, sp = rand(170, 240);
      s2.enableBody(true, x0, y0, true, true); s2.body.setAllowGravity(true); s2.body.setSize(5, 5, true);
      s2.setVelocity(Math.cos(a) * sp, Math.sin(a) * sp * 1.3 - 60); Object.assign(s2, { px: x0, py: y0, rain: false }); s2.glow.setVisible(true);
    }
  }
  bossSlam(e) {
    const b = e.body, y = b.bottom, pb = this.player.body;
    this.shake(380, 0.014); Sfx.stomp(); Sfx.explosion(0.6); this.zoomPunch = Math.max(this.zoomPunch, 0.05);
    this.fxDust(b.center.x, y, 16);
    this.blastTiles(b.center.x, y + 4, 44, 70);                         // slams cave in gratings and girders
    for (const dir of [-1, 1]) this.shockwaves.push({ x: b.center.x + dir * (b.halfWidth + 2), y, dir, t: 1.6, hit: false });
    if (this.state !== 'dead' && Math.abs(pb.center.x - b.center.x) < b.halfWidth + 12 && Math.abs(pb.bottom - y) < 30) this.hurtPlayer(25, b.center.x);
  }
  bossSummon(e) {
    Sfx.roar();
    for (let i = 0; i < 3; i++) {
      const t = this.spawnEnemy('tick', Math.floor(e.x / TS), Math.floor((e.body.bottom - 1) / TS));
      t.body.reset(e.x - e.dir * 8, e.body.top + 6); t.body.setVelocity(rand(-160, 160), rand(-320, -220));
      t.summoned = true; t.aggro = true;
      this.fx.emit(t.x, t.y, { n: 8, speed: [40, 120], life: [0.2, 0.4], size: [3, 1], cols: [0xffe080, 0xff8a20], add: true });
    }
  }
  spawnGrenade(x, y, a, kind = 'grenade') {                        // kind: grenade | cluster (mortar shell) | bomb (bomblet)
    const g = this.grenades.getFirstDead(false); if (!g) return null;
    const W = TUNE.GRENADE, C = TUNE.CLUSTER, cl = kind === 'cluster', fk = kind === 'flak', gv = kind === 'grav', dc = kind === 'decoy', ss = kind === 'stasis', gc = kind === 'gascan', sp = cl ? C.speed : fk ? TUNE.FLAK.speed : gv ? TUNE.GRAV.speed : dc ? TUNE.DECOY.speed : ss ? TUNE.STASIS.speed : gc ? TUNE.GASLAUNCH.speed : W.speed;
    g.setTexture(cl ? 'cshell' : kind === 'bomb' ? 'bomblet' : fk ? 'slag' : gv ? 'gravbomb' : dc ? 'decoycan' : ss ? 'stasiscan' : gc ? 'gasshell' : 'grenade');
    g.enableBody(true, x, y, true, true);
    g.body.setSize(6, 6, true); g.body.setAllowGravity(true); g.body.setBounce(cl ? 0.2 : W.bounce, cl ? 0.2 : W.bounce);
    g.setVelocity(Math.cos(a) * sp + this.player.body.velocity.x * 0.3, Math.sin(a) * sp - (cl ? C.lift : fk ? 0 : gv ? TUNE.GRAV.lift : dc ? TUNE.DECOY.lift : ss ? TUNE.STASIS.lift : gc ? TUNE.GASLAUNCH.lift : W.lift));   // lobbed, inherits some run speed
    g.body.setAngularVelocity(rand(500, 900) * (Math.cos(a) >= 0 ? 1 : -1));
    Object.assign(g, { fuse: cl ? 4 : kind === 'bomb' ? rand(0.35, 0.8) : fk ? TUNE.FLAK.fuse : gv ? TUNE.GRAV.fuse : dc ? TUNE.DECOY.fuse : ss ? TUNE.STASIS.fuse : gc ? TUNE.GASLAUNCH.fuse : W.fuse, blinkT: 0, blinkOn: false, prevV: 0, gk: kind, age: 0 });
    g.glow.setVisible(true).setPosition(x, y).setTint(cl ? 0xffc040 : fk ? 0xff8a20 : gv ? 0x9a60ff : dc ? 0x46e6ff : ss ? 0xc8e8ff : gc ? 0xa0e040 : 0xff3020);
    return g;
  }
  detonate(g) {
    const x = g.x, y = g.y, k = g.gk, vx = g.body.velocity.x, vy = g.body.velocity.y;
    g.disableBody(true, true); g.glow.setVisible(false);
    if (k === 'cluster') { this.clusterBurst(x, y, vx, vy); return; }
    if (k === 'flak') { this.flakBurst(x, y, vx, vy); return; }
    if (k === 'grav') { this.gravPulse(x, y); return; }
    if (k === 'decoy') { this.deployDecoy(x, y); return; }
    if (k === 'stasis') { this.openStasis(x, y); return; }
    if (k === 'gascan') { this.spawnCloud(x, y); const C = this.clouds[this.clouds.length - 1]; C.mine = true; C.r *= TUNE.GASLAUNCH.r; Sfx.gasPop(); return; }   // your gas: spares you, eats metal too
    this.explode(x, y, k === 'bomb' ? TUNE.CLUSTER.bomb : TUNE.GRENADE);
  }
  onGrenadeHit(g, e) {                                                 // contact with meat = instant pop (a flak shell hits hard first)
    if (!g.active || !e.alive || e.under) return;
    if (g.gk === 'flak') this.damageEnemy(e, TUNE.FLAK.direct, Math.sign(g.body.velocity.x) || 1, 0, 'pellet');
    this.detonate(g);
  }
  addKick(x, y) { x *= OPTS.shake; y *= OPTS.shake; this.kick.x = clamp(this.kick.x + x, -12, 12); this.kick.y = clamp(this.kick.y + y, -12, 12); }
  applyCamera(rdt) {
    const cam = this.cameras.main;
    if (this.state !== 'dead') {
      const focus = this.camFocus && this.time.now < this.camFocus.until ? this.camFocus : null;   // boss intro pans the camera
      const tx = focus ? focus.x : this.pv.x + this.look.x, ty = focus ? focus.y : this.pv.y - 14 + this.look.y, dzx = focus ? 0 : 18, dzy = focus ? 0 : 16;
      let gx = this.camX, gy = this.camY;
      if (tx > gx + dzx) gx = tx - dzx; else if (tx < gx - dzx) gx = tx + dzx;
      if (ty > gy + dzy) gy = ty - dzy; else if (ty < gy - dzy) gy = ty + dzy;
      const k = rdt ? 1 - Math.exp(-rdt * (focus ? 3 : 9)) : 1;
      this.camX += (gx - this.camX) * k; this.camY += (gy - this.camY) * k;
    }
    const hw = VIEW_W / ZOOM / 2, hh = VIEW_H / ZOOM / 2;
    this.camX = clamp(this.camX, hw, LW - hw); this.camY = clamp(this.camY, hh, LH - hh);
    const f = Math.exp(-rdt * 16); this.kick.x *= f; this.kick.y *= f;    // kick snaps in, springs back out
    this.zoomPunch = Math.min(0.15, this.zoomPunch) * Math.exp(-rdt * 7);   // zoom-in punch on big hits (never zooms out past the art)
    const z = ZOOM * (1 + this.zoomPunch); if (Math.abs(cam.zoom - z) > 0.0005) cam.setZoom(z);
    cam.setScroll(Math.round((this.camX + this.kick.x) * ZOOM) / ZOOM - VIEW_W / 2, Math.round((this.camY + this.kick.y) * ZOOM) / ZOOM - VIEW_H / 2);
  }

  updateProjectiles(dt) {
    for (const b of this.bulletList) {
      if (!b.active) continue;
      b.life -= dt;
      if (b.life <= 0) { b.disableBody(true, true); continue; }
      const hit = this.sweep(b.px, b.py, b.x, b.y);
      if (hit && b.kind === 'shard' && b.bounces > 0) {                // flak shrapnel ricochets
        b.bounces--;
        const vx = b.body.velocity.x, vy = b.body.velocity.y, fx = this.solidAt(hit.x + Math.sign(vx) * 2, hit.y), fy = this.solidAt(hit.x, hit.y + Math.sign(vy) * 2);
        b.body.reset(hit.x, hit.y); b.body.setVelocity((fx || !fy ? -vx : vx) * 0.75, (fy || !fx ? -vy : vy) * 0.75);
        b.ang = Math.atan2(b.body.velocity.y, b.body.velocity.x); b.setRotation(b.ang); b.px = hit.x; b.py = hit.y;
        this.fxSparks(hit.x, hit.y, 2, b.ang, 1, [40, 140]); if (Math.random() < 0.4) Sfx.tink(0.5);
        continue;
      }
      if (hit) { this.bulletImpact(b, hit); b.disableBody(true, true); continue; }
      if (b.kind === 'shard') { b.ang = Math.atan2(b.body.velocity.y, b.body.velocity.x); b.setRotation(b.ang); }
      const rh = this.ragSweep(b.px, b.py, b.x, b.y, 1.5);
      if (rh) { this.hitRagdoll(rh.rd, rh.x, rh.y, b.dmg, Math.cos(b.ang), Math.sin(b.ang), b.kind, rh.pi); b.disableBody(true, true); continue; }
      if (this.propSweep(b.px, b.py, b.x, b.y, Math.cos(b.ang), Math.sin(b.ang), b.dmg)) { b.disableBody(true, true); continue; }   // lamps, gas, props, charges, mines
      const tc = b.kind === 'nail' ? TRACE_NAIL : b.kind === 'parry' ? TRACE_PARRY : TRACE_PELLET;   // short additive tracer tail
      this.fx.emit((b.px + b.x) / 2, (b.py + b.y) / 2, { n: 1, speed: [0, 0], life: [0.06, 0.1], size: [2, 1], cols: tc, add: true });
      this.fx.emit(b.px, b.py, { n: 1, speed: [0, 0], life: [0.05, 0.08], size: [1, 1], cols: tc, alpha: [0.8, 0], add: true });
      b.px = b.x; b.py = b.y;
    }
    for (const r of this.rocketList) {
      if (!r.active) continue;
      r.life -= dt;
      const hit = this.sweep(r.px, r.py, r.x, r.y);
      if (hit || r.life <= 0) { const x = hit ? hit.x : r.x, y = hit ? hit.y : r.y; this.killRocket(r); this.explode(x, y); continue; }
      const tx = r.x - Math.cos(r.ang) * 6, ty = r.y - Math.sin(r.ang) * 6;
      this.fx.emit(tx, ty, { n: 1, speed: [5, 20], life: [0.4, 0.8], size: [2, 6], cols: [0x8a8580, 0x5a5652, 0x3a3836], alpha: [0.5, 0], g: -25, drag: 2, jitter: 1 });
      this.fx.emit(tx, ty, { n: 1, angle: r.ang + Math.PI, spread: 0.6, speed: [20, 60], life: [0.08, 0.18], size: [3, 1], cols: [0xffffff, 0xffe46a, 0xff8a1f], add: true });
      r.px = r.x; r.py = r.y;
    }
    for (const b of this.boltList) {
      if (!b.active) continue;
      b.life -= dt;
      const hit = this.sweep(b.px, b.py, b.x, b.y);
      if (hit || b.life <= 0) { this.boltPop(b.x, b.y); b.disableBody(true, true); continue; }
      b.setScale(1 + Math.sin(b.life * 30) * 0.18);
      if (Math.random() < 0.7) this.fx.emit(b.x, b.y, { n: 1, speed: [0, 12], life: [0.15, 0.3], size: [3, 1], cols: [0xffffff, 0xff7ad0, 0xc02080], add: true });
      b.px = b.x; b.py = b.y;
    }
    for (const s of this.sawList) {
      if (!s.active) continue;
      s.life -= dt; s.rotation += 30 * dt;
      if (s.life <= 0) { this.sawShatter(s); continue; }
      const hit = this.sweep(s.px, s.py, s.x, s.y);
      if (hit) {                                                        // ricochet: flip the axis we hit
        const vx = s.body.velocity.x, vy = s.body.velocity.y;
        const hx = this.solidAt(hit.x + Math.sign(vx) * 4, hit.y), hy = this.solidAt(hit.x, hit.y + Math.sign(vy) * 4), corner = !hx && !hy;
        const nvx = hx || corner ? -vx : vx, nvy = hy || corner ? -vy : vy;
        s.body.reset(hit.x, hit.y); s.body.setVelocity(nvx * 0.94, nvy * 0.94);
        s.bounces--; s.px = hit.x; s.py = hit.y;
        const tt = hx ? [hit.x + Math.sign(vx) * 4, hit.y] : [hit.x, hit.y + Math.sign(vy) * 4]; this.damageTile(Math.floor(tt[0] / TS), Math.floor(tt[1] / TS), 14);
        this.fxSparks(hit.x, hit.y, 6, Math.atan2(nvy, nvx), 1.2, [60, 200]); this.paintHole(hit.x + Math.sign(vx) * 2, hit.y + Math.sign(vy) * 2);
        Sfx.clang(0.5);
        if (s.bounces < 0) this.sawShatter(s);
        continue;
      }
      const sh = this.ragdolls.length ? this.ragAt(s.x, s.y, 4) : null;
      if (sh && !((s.hitMap.get(sh.rd) || 0) > this.time.now)) {          // saws carve corpses too
        s.hitMap.set(sh.rd, this.time.now + 220);
        const vx = s.body.velocity.x, vy = s.body.velocity.y, sp = Math.hypot(vx, vy) || 1;
        this.fxBlood(s.x, s.y, 8, Math.atan2(vy, vx), 1.4, [80, 260]); s.bloody = 1;
        this.hitRagdoll(sh.rd, s.x, s.y, TUNE.SAW.damage, vx / sp, vy / sp, 'saw', sh.pi);
      }
      if (s.bloody > 0) { s.bloody -= dt; if (Math.random() < 0.5) this.fxBlood(s.x, s.y, 1, 0, Math.PI * 2, [10, 60]); }
      if (Math.random() < 0.5) this.fx.emit(s.x, s.y, { n: 1, speed: [0, 0], life: [0.05, 0.1], size: [2, 1], cols: [0xe8eef4, 0x9aa4b0], add: true });
      s.px = s.x; s.py = s.y;
    }
    for (const b of this.ebulletList) {
      if (!b.active) continue;
      b.life -= dt;
      const hit = this.sweep(b.px, b.py, b.x, b.y);
      if (hit || b.life <= 0) { if (hit) this.fxSparks(hit.x, hit.y, 3, b.ang + Math.PI, 1.6, [40, 140]); b.disableBody(true, true); continue; }
      if (b.keg) {                                                      // a burst aimed at a drum (thinkEnforcer) holes it
        const k = this.barrelList.find(o => o.active && Math.abs(o.x - b.x) < 7 && Math.abs(o.y - 1 - b.y) < 9);
        if (k) { k.byFoe = true; this.damageBarrel(k, b.dmg || 5); b.disableBody(true, true); continue; }
      }
      if (b.snipe && this.state !== 'dead') {                           // 900 px/s can skip a 10 px body between frames: sweep it
        const pb = this.player.body, n = Math.ceil(Math.hypot(b.x - b.px, b.y - b.py) / 3) || 1;
        let struck = false;
        for (let i = 1; i <= n && !struck; i++) { const x = b.px + (b.x - b.px) * i / n, y = b.py + (b.y - b.py) * i / n; struck = x > pb.left - 2 && x < pb.right + 2 && y > pb.top - 2 && y < pb.bottom + 2; }
        if (struck) { this.onEBulletHit(this.player, b); continue; }
      }
      this.fx.emit((b.px + b.x) / 2, (b.py + b.y) / 2, { n: 1, speed: [0, 0], life: [b.snipe ? 0.12 : 0.05, b.snipe ? 0.2 : 0.09], size: [2, 1], cols: b.snipe ? TRACE_SNIPE : TRACE_ENEMY, add: true });
      b.px = b.x; b.py = b.y;
    }
    for (const g of this.grenadeList) {
      if (!g.active) continue;
      const b = g.body;
      g.fuse -= dt;
      if (g.fuse <= 0) { this.detonate(g); continue; }
      g.age += dt;
      if (g.gk === 'cluster' && g.age > 0.3 && (b.velocity.y > 30 || b.blocked.down || b.blocked.left || b.blocked.right || b.blocked.up)) { this.detonate(g); continue; }   // airburst at the top of the arc
      if (g.gk === 'flak' && (b.blocked.down || b.blocked.left || b.blocked.right || b.blocked.up)) { this.detonate(g); continue; }
      if (b.blocked.down || b.touching.down) { b.velocity.x *= Math.pow(0.2, dt); b.angularVelocity *= Math.pow(0.05, dt); }
      if ((b.blocked.down || b.blocked.left || b.blocked.right || b.blocked.up) && g.prevV > 70) {
        Sfx.clunk(Math.min(1, g.prevV / 300)); this.fxSparks(g.x, g.y, 2, -Math.PI / 2, 2, [30, 90]);
      }
      g.prevV = Math.abs(b.velocity.x) + Math.abs(b.velocity.y);
      g.blinkT -= dt;
      if (g.blinkT <= 0) { g.blinkT = Math.max(0.06, g.fuse * 0.2); g.blinkOn = !g.blinkOn; if (g.blinkOn && g.gk === 'grenade') Sfx.beep(); }   // blinks faster as the fuse burns
      if (Math.random() < 0.5) this.fx.emit(g.x, g.y, { n: 1, speed: [2, 10], life: [0.3, 0.6], size: [2, 4], cols: [0x8a8580, 0x5a5652], alpha: [0.35, 0], g: -20, drag: 2 });
    }
  }
  bulletImpact(b, hit) {
    let { x, y } = hit; const ca = Math.cos(b.ang), sa = Math.sin(b.ang);
    for (let i = 0; i < 4 && !this.solidAt(x + ca, y + sa); i++) { x += ca; y += sa; }   // refine to the surface
    const wallX = this.solidAt(x + Math.sign(ca) * 2, y);
    const nAng = wallX ? (ca > 0 ? Math.PI : 0) : (sa > 0 ? -Math.PI / 2 : Math.PI / 2);
    this.fxSparks(x, y, b.kind === 'nail' ? 4 : 3, nAng, 1.7, [40, 170]);
    this.fxDust(x, y, 1);
    this.paintHole(x + ca * 1.5, y + sa * 1.5);
    if (b.kind === 'ember' && Math.random() < TUNE.DRAGON.patch) this.spawnFirePatch(x, y - 4);   // embers light the floor
    this.damageTile(Math.floor((x + ca * 1.5) / TS), Math.floor((y + sa * 1.5) / TS), b.kind === 'pellet' ? 4 : b.kind === 'parry' ? 40 : b.kind === 'rivet' ? 3 : 5);
    if (b.kind === 'nail') {
      const d = this.decals[this.decalCursor]; this.decalCursor = (this.decalCursor + 1) % this.decals.length;
      d.setPosition(x + ca, y + sa).setRotation(b.ang).setAlpha(1).setVisible(true); d.ttl = 4;
      Sfx.tink();
    }
  }
  boltPop(x, y) {
    this.fx.emit(x, y, { n: 10, speed: [30, 120], life: [0.15, 0.35], size: [2, 1], cols: [0xffffff, 0xff7ad0, 0xc02080], add: true, g: 200, mode: 1 });
    this.spawnLight(x, y, 'glow', 0xff40b0, 0.8, 1.4, 0.7, 0.15);
  }

  // One Phaser Key per name in BIND_DEFAULTS, pressed by whichever physical keys BINDS puts it on (by event.code, so
  // the layout doesn't move it). The rest of the scene reads them exactly as it read addKeys' keys.
  bindKeys() {
    const KB = this.input.keyboard, keys = {}, byCode = new Map();
    for (const name of Object.keys(BIND_DEFAULTS)) {
      keys[name] = new Phaser.Input.Keyboard.Key(KB, Phaser.Input.Keyboard.KeyCodes[name]);
      for (const code of BINDS[name]) { if (!byCode.has(code)) byCode.set(code, []); byCode.get(code).push(keys[name]); }
    }
    KB.addCapture(Object.keys(BIND_DEFAULTS).join(','));             // the page doesn't scroll or tab on game keys, as before
    const down = ev => { for (const k of byCode.get(ev.code) || []) k.onDown(ev); };
    const up = ev => { for (const k of byCode.get(ev.code) || []) k.onUp(ev); };
    const clear = () => { for (const k of Object.values(keys)) k.reset(); };   // no key stuck down after the window loses focus
    KB.on('keydown', down); KB.on('keyup', up); this.game.events.on('blur', clear);
    this.events.once('shutdown', () => { KB.off('keydown', down); KB.off('keyup', up); this.game.events.off('blur', clear); });
    return keys;
  }

  onBulletHit(b, e) {
    if (!b.active || !e.alive) return;
    const bx = b.x, by = b.y, ang = b.ang;
    b.disableBody(true, true);
    if (this.shieldBlocks(e, Math.cos(ang), by)) {                     // riot shield: sparks and a clang, no damage
      if (e.kind === 'mirror') { this.mirrorReflect(e, bx, by, ang, b.dmg); return; }   // ...or, off a mirror, it comes straight back
      this.fxSparks(bx, by, 5, ang + Math.PI + rand(-0.5, 0.5), 1.2, [80, 220]); Sfx.clang(0.6);
      this.spawnLight(bx, by, 'glow', 0xfff0c0, 0.5, 0.9, 0.8, 0.06);
      return;
    }
    if (!b.free) this.stats.hits++;
    const hs = (isHumanoid(e) || e.kind === 'jet') && by < e.body.top + 5;                    // top quarter of a humanoid = head
    if (e.def.headCrit && by < e.body.top + 12) { e.dmgHead = true; b.dmg *= 1.5; }   // boss head / furnace crit
    if (e.def.molten) this.fx.emit(bx, by, { n: 5, angle: ang + Math.PI, spread: 1.6, speed: [40, 160], life: [0.2, 0.45], size: [2, 1], cols: [0xffffff, 0xffe080, 0xff8a20], add: true, g: 400, mode: 1 });   // slag spits sparks, not blood
    else if (e.def.mech) this.fxSparks(bx, by, 5, ang + Math.PI, 1.8);
    else {
      this.fxBlood(bx, by, b.kind === 'pellet' ? 5 : 4, ang, 0.9, [60, 200]);       // exit spray
      this.fxBlood(bx, by, hs ? 6 : 2, hs ? -Math.PI / 2 : ang + Math.PI, 1.2, [30, hs ? 160 : 90]);
    }
    if (e.kind === 'drone' || e.kind === 'mender') this.fxSparks(bx, by, 4, ang + Math.PI, 1.8);
    this.damageEnemy(e, b.dmg * (hs ? TUNE.HEADSHOT : 1), Math.cos(ang), Math.sin(ang), b.kind, hs);
  }
  onRocketHit(r, e) {
    if (!r.active || !e.alive) return;
    const x = r.x, y = r.y;
    this.killRocket(r); this.explode(x, y);
  }

  explode(x, y, W = TUNE.ROCKET, countHit = true) {                      // countHit false: the shot behind it already counted its hit
    const R = W.radius, killsBefore = this.stats.kills, byPlayer = !W.enemy, now = this.time.now;
    let damaged = false;
    for (const e of this.enemies.getChildren()) {
      if (!e.alive || (W.spare && e.kind === W.spare)) continue;
      const b = e.body, qx = clamp(x, b.left, b.right), qy = clamp(y, b.top, b.bottom), d = Math.hypot(qx - x, qy - y);
      if (d >= R || (d > 8 && !this.los(x, y, b.center.x, b.center.y))) continue;      // walls block splash
      const f = 1 - d / R, ang = Math.atan2(b.center.y - y, b.center.x - x), kb = e.def.kb;
      b.velocity.x += Math.cos(ang) * 280 * f * kb;
      b.velocity.y += (Math.sin(ang) * 220 - 170) * f * kb;
      e.stunT = Math.max(e.stunT, 0.4 * f + 0.1);
      damaged = true;
      let dmg = W.enemyDamage !== undefined ? W.enemyDamage * (0.4 + 0.6 * f) : W.minDamage + (W.maxDamage - W.minDamage) * f;
      if (W.style === 'arc' && e.soakUntil > now) dmg *= TUNE.HYDRO.zap;  // a soaked foe conducts
      if ((e.kind === 'bulwark' || e.kind === 'mirror') && e.shieldUp && Math.sign(x - b.center.x) === e.dir) { dmg *= 0.5; e.ai = 'stagger'; e.aiUntil = now + 900; this.mirrorDamage(e, dmg); }   // shield eats half, but it rocks them
      if (W.burn) this.ignite(e, W.burn);
      this.damageEnemy(e, dmg, Math.cos(ang), Math.sin(ang), 'rocket');
    }
    if (damaged && byPlayer && !W.scenery && countHit) this.stats.hits++;   // a drum, prop or dead foe's wreck going off isn't a shot that hit
    for (const { rd, f } of this.pushRagdolls(x, y, R + 10, 620, 400)) { // corpses fly; close ones burst
      const c = rd.pts[2];
      if (W.burn) rd.burnT = Math.max(rd.burnT, W.burn);
      this.hitRagdoll(rd, c.x, c.y, (W.enemyDamage ?? W.maxDamage) * (0.05 + 1.2 * f * f), Math.sign(c.x - x) || 1, -0.6, 'blast');   // edge of a blast just throws them
    }
    if (W.drums !== false) for (const k of this.barrelList) if (k.active && Math.hypot(k.x - x, k.y - y) < R + 6) {   // chain into drums
      this.damageBarrel(k, 50, 0.12); k.body.velocity.x += Math.sign(k.x - x || 1) * 140; k.body.velocity.y -= 120;
    }
    this.blastTiles(x, y, R, W.tileDamage ?? W.maxDamage ?? 40);       // and the scenery
    for (const T of this.tars.slice()) if (Math.abs(T.y - y) < R && Math.max(0, Math.abs(T.x - x) - T.w / 2) < R) this.igniteTar(T);   // and any tar
    for (const C of this.clouds.slice()) if (Math.hypot(C.x - x, C.y - y) < R + C.r * 0.8) this.time.delayedCall(60, () => this.igniteCloud(C));   // and gas
    for (const pp of this.pipes || []) if (!pp.broken && Math.hypot(pp.x - x, pp.y - y) < R + 6) this.burstPipe(pp);                          // and pipes
    for (const m of this.mineList) if (m.active && !m.host && m.trig < 0 && Math.hypot(m.x - x, m.y - y) < R + 8) m.trig = 0.08 + Math.random() * 0.08;   // sympathetic detonations
    for (const c of this.chargeList) if (c.active && Math.hypot(c.x - x, c.y - y) < R + 6) c.fuse = Math.min(c.fuse, 0.1 + Math.random() * 0.08);
    for (const k of this.canisterList) if (k.active && k.state === 'idle' && Math.hypot(k.x - x, k.y - y) < R + 6) this.igniteCanister(k, Math.atan2(k.y - y, k.x - x) - 0.7);
    for (const L of this.lamps) if (!L.falling && !L.dead && Math.hypot(L.x - x, L.y - y) < R + 6) this.dropLamp(L);
    this.blastProps(x, y, R, W);
    if (W.enemy && this.sentry && Math.hypot(this.sentry.x - x, this.sentry.y - 10 - y) < R + 6) this.sentry.hp -= (W.selfDamage || 20) * 1.5;   // they can wreck your turret
    if (this.state !== 'dead') {                                          // self-damage + rocket-jump push, or a real hit if hostile
      const pb = this.player.body, qx = clamp(x, pb.left, pb.right), qy = clamp(y, pb.top, pb.bottom), d = Math.hypot(qx - x, qy - y);
      if (d < R && (d < 8 || this.los(x, y, pb.center.x, pb.center.y))) {
        const f = 1 - d / R, ang = Math.atan2(pb.center.y - y, pb.center.x - x), push = W.push * f;
        pb.velocity.x += Math.cos(ang) * push;
        pb.velocity.y = Math.max(-W.maxRise, Math.min(pb.velocity.y, 0) + Math.sin(ang) * push);
        this.jumpCuttable = false; this.lastGround = -1e9;
        const sd = Math.round(W.selfDamage * f * (this.perks.blast && !W.enemy ? 0.25 : 1));
        if (sd > 0) this.hurtPlayer(sd, x, W.enemy ? { knock: false, srcY: y } : { knock: false, iframes: false, self: true });
      }
    }
    for (const g of this.gibList) {
      if (!g.active) continue;
      const dx = g.x - x, dy = g.y - y, d = Math.hypot(dx, dy) || 1;
      if (d < R * 1.6) {
        if (g.stuckT > 0) { g.stuckT = 0; g.body.setAllowGravity(true); }
        const f = 1 - d / (R * 1.6);
        g.body.velocity.x += dx / d * 380 * f; g.body.velocity.y += dy / d * 380 * f - 160 * f; g.body.angularVelocity += rand(-900, 900) * f;
      }
    }
    this.boomFx(x, y, R / 60, W.style);
    this.paintScorch(x, y, Math.round(26 * R / 60));
    this.makeNoise(x, y, 300, false);
    this.hitStop(byPlayer ? 35 : 20);
    if (byPlayer) {
      const k = this.stats.kills - killsBefore;
      if (k >= 2) BUS.emit('callout', k === 2 ? 'DOUBLE GIB!' : k === 3 ? 'TRIPLE GIB!' : 'MEAT STORM!');
    }
  }
  // Explosion visuals + feel, scaled by size; 'void' = the singularity's purple implosion.
  boomFx(x, y, s = 1, style) {
    const v = style === 'void', ar = style === 'arc', dp = Math.hypot(this.player.x - x, this.player.y - y), sm = Math.max(0.6, s);
    if (!v && !ar) { const bm = this.booms.find(o => !o.on) || this.booms[0]; bm.setPosition(x, y).setFrame('b0').setScale(sm).setRotation(randi(0, 3) * Math.PI / 2).setVisible(true); bm.t = 0; bm.on = true; }
    this.spawnLight(x, y, 'glow', v ? 0xb060ff : ar ? 0x6ad0ff : 0xffa040, 3 * s, 6 * s, 0.95, 0.32);
    this.spawnLight(x, y, 'ring', v ? 0xe0b0ff : ar ? 0xd8f4ff : 0xffe0b0, 0.3 * s, 1.6 * s, 0.9, 0.24);
    this.fx.emit(x, y, { n: Math.round(26 * s), speed: [30, 170 * s], life: [0.2, 0.55], size: [5, 1], cols: v ? [0xffffff, 0xe0b0ff, 0xb060ff, 0x6020c0, 0x200040] : ar ? [0xffffff, 0xc8f0ff, 0x6ad0ff, 0x2a86c8, 0x103050] : [0xffffff, 0xffe46a, 0xffa030, 0xff5a1a, 0xa82010], add: true, g: -70, drag: 3.2, jitter: 3 });
    this.fxSmoke(x, y, Math.round(12 * s), 1.4 * sm);
    this.fxSparks(x, y, Math.round(22 * s), 0, Math.PI * 2, [100, 340 * sm]);
    this.fx.emit(x, y, { n: Math.round(10 * s), speed: [60, 200], life: [0.8, 1.6], size: [2, 1], cols: v ? [0xffffff, 0xd0a0ff, 0x8040e0] : ar ? [0xffffff, 0x9adcff, 0x4ab8ff] : [0xffe46a, 0xff8a1f, 0xd04010, 0x802010], add: true, g: 420, mode: 1, drag: 0.6 });
    let nearWall = false;
    for (let i = 0; i < 8 && !nearWall; i++) { const a = i / 8 * Math.PI * 2; if (this.solidAt(x + Math.cos(a) * 14, y + Math.sin(a) * 14)) nearWall = true; }
    if (nearWall && s > 0.7) for (let i = 0; i < 5; i++) this.spawnGib(pick(['g_shard', 'g_shard2']), x + rand(-4, 4), y + rand(-4, 4), rand(-200, 200), rand(-320, -120), 'metal');
    this.shake(260, clamp(0.016 * s * (1 - dp / 380), 0.003, 0.016));
    const cdx = this.camX - x, cdy = this.camY - y, cd = Math.hypot(cdx, cdy) || 1, cf = clamp(1 - cd / 320, 0, 1) * s;
    this.addKick(cdx / cd * 9 * cf, cdy / cd * 9 * cf);
    if (dp < 220) BUS.emit('flash', 0.28 * s * (1 - dp / 220));
    if (dp < 150) this.zoomPunch = Math.max(this.zoomPunch, 0.04 * s);
    if (dp < 260 && s > 0.5) this.warpPulse(0.07 * Math.min(1.5, s) * (1 - dp / 260));   // shockwave warp (post FX)
    Sfx.explosion(clamp((1 - dp / 600) * Math.min(1, s + 0.2), 0.3, 1));
  }

  // ---------------------------------------------------------------- damage ----
  damageEnemy(e, dmg, dx, dy, src, hs) {
    if (!e.alive || e.under) return;                                     // a burrowed worm can't be touched
    const dmg0 = dmg;                                                    // the raw hit: what a tether passes on (the linked foe runs its own modifiers)
    if (e.kind === 'wyrmseg') {                                          // wyrm body: its armour passes 60% on to the head
      e.flashT = 0.08;
      if (e.head && e.head.alive) this.damageEnemy(e.head, dmg * TUNE.WYRM.segTake, dx, dy, src, false);
      return;
    }
    if (e.def.bossArmour) { dmg = this[e.def.bossArmour](e, dmg, dx, dy, src); if (dmg <= 0) return; }   // an expansion boss's shield, plating or open core
    if (e.kind === 'orbiter' && (dx || dy) && !['burn', 'gas', 'rocket', 'crush'].includes(src)) {   // a plate between it and the shot eats it
      const ia = Math.atan2(-dy, -dx), np = e.plates.length;
      for (let k = 0; k < np; k++) { if (e.plates[k] <= 0) continue; const da = Math.atan2(Math.sin(e.spin + k * Math.PI * 2 / np - ia), Math.cos(e.spin + k * Math.PI * 2 / np - ia)); if (Math.abs(da) < 0.55) { this.orbiterPlateHit(e, k, dmg); return; } }
    }
    if (e.kind === 'scorcher' && e.ai === 'rest') dmg *= TUNE.SCORCHER.take;   // winded: wide open
    if (e.kind === 'torcher' && dx && Math.sign(dx) === e.dir && src !== 'burn') {   // a shot in the back: the fuel tank
      dmg *= TUNE.TORCHER.back; e.tankHitT = this.time.now;
      if (Math.random() < 0.5) { this.fxSparks(e.body.center.x - e.dir * 8, e.body.center.y - 2, 4, e.dir > 0 ? Math.PI : 0, 1.2, [60, 180]); Sfx.clang(0.4); }
    }
    if (e.kind === 'grappler' && e.ai === 'hold' && src !== 'burn' && (e.holdDmg += dmg) >= TUNE.GRAPPLER.breakDmg) this.grappleBreak(e, 'BROKE FREE');
    if (e.elite) {
      e.lastHitT = this.time.now;
      if (e.esh > 0 && src !== 'burn' && src !== 'gas') {                // a shielded elite: the bubble takes it first
        const ab = Math.min(e.esh, dmg); e.esh -= ab; dmg -= ab;
        if (e.esh <= 0) { this.spawnLight(e.body.center.x, e.body.center.y, 'ring', 0x46e6ff, 0.4, 1.6, 0.9, 0.25); this.fxSparks(e.body.center.x, e.body.center.y, 10, 0, Math.PI * 2, [60, 200]); Sfx.shieldPop(); }
        else if (Math.random() < 0.4) Sfx.shieldHit();
        if (dmg <= 0) { e.flashT = 0.05; return; }
      }
    }
    if (e.kind === 'swapper' && e.ai === 'tell' && src !== 'burn' && (e.tellDmg += dmg) >= TUNE.SWAPPER.breakDmg) { e.ai = 'walk'; e.cd = 2.5; BUS.emit('callout', 'SWAP BROKEN'); this.addStyle(40); Sfx.clang(0.5); }
    if (e.bubbleUntil > this.time.now && e.gravT > 0 && src !== 'crush' && src !== 'net' && src !== 'burn') { e.gravT = 0.01; e.bubbleUntil = 0; this.popBubbleFx(e.body.center.x, e.body.center.y, Math.max(e.body.halfWidth, e.body.halfHeight) + 6); }   // pop the bubble: down it goes
    if (e.kind === 'sponge' && SPONGE_EATS.has(src)) {                     // a sponge drinks bullets, then spits them back
      e.charge = (e.charge || 0) + 1; e.flashT = 0.04; if (Math.random() < 0.4) Sfx.squish && Sfx.squish();
      if (e.charge >= TUNE.SPONGE.cap) this.spongeRelease(e);
      return;
    }
    if (e.stasisT > 0 && src !== 'stasis') { e.stasisDmg += dmg * TUNE.STASIS.bonus; e.flashT = 0.05; if (Math.random() < 0.25) Sfx.tink(0.3); return; }   // time-stopped: it all lands later
    if (e.kind === 'vortex' && e.ai === 'spin') dmg *= TUNE.VORTEX.take;
    if (e.kind === 'scavenger' && e.ai === 'eat') dmg *= TUNE.SCAVENGER.take;
    if (e.kind === 'shellback') {                                         // the shell eats frontal fire; a kick or a blast flips it
      if (e.ai === 'flip') dmg *= 2;
      else if (dx && Math.sign(dx) === -e.dir && !['burn', 'gas', 'crush', 'rocket', 'kick'].includes(src)) { dmg *= TUNE.SHELLBACK.front; if (Math.random() < 0.4) { this.fxSparks(e.body.center.x + e.dir * 8, e.body.center.y, 3, e.dir > 0 ? 0 : Math.PI, 1.2, [60, 180]); Sfx.clang(0.35); } }
      if (e.ai !== 'flip' && ['kick', 'rocket', 'crush'].includes(src)) this.flipShell(e);
    }
    if (e.kind === 'foreman' && e.phase === 3) dmg *= TUNE.FOREMAN.core;
    if (src === 'ember') this.ignite(e, TUNE.DRAGON.burn);
    if (src === 'tetherdart') this.tetherTag(e);
    if (e.kind === 'gatling' && e.ai !== 'hot' && dx && Math.sign(dx) === -e.dir && !['burn', 'gas', 'rocket', 'crush'].includes(src)) dmg *= TUNE.GATLING.front;
    if (e.kind === 'gatling' && e.ai === 'hot') dmg *= TUNE.GATLING.hot;
    if (e.kind === 'cinder' && src === 'kick') { e.owned = TUNE.CINDER.owned; e.dir = Math.sign(dx) || e.dir; e.hitMap = new Map(); BUS.emit('callout', 'RETURNED!'); this.addStyle(40); }
    if (e.def.armour) { dmg = this[e.def.armour](e, dmg, dx, dy, src); if (!e.alive || dmg <= 0) return; }   // its own plate, weak spot or fuse
    if (e.kind === 'bulldozer' && dx && src !== 'burn' && src !== 'gas') { if (Math.sign(dx) === -e.dir && !['rocket', 'crush'].includes(src)) { dmg *= TUNE.DOZER.front; if (Math.random() < 0.4) { this.fxSparks(e.body.center.x + e.dir * 12, e.body.center.y, 3, e.dir > 0 ? 0 : Math.PI, 1.2, [60, 180]); Sfx.clang(0.35); } } else if (Math.sign(dx) === e.dir) dmg *= TUNE.DOZER.rear; }
    if (e.kind === 'porcupine' && src !== 'burn' && src !== 'gas' && (e.quillAcc = (e.quillAcc || 0) + dmg) >= TUNE.PORCUPINE.per) { e.quillAcc -= TUNE.PORCUPINE.per; this.time.delayedCall(30, () => { if (e.alive) this.quillBurst(e); }); }
    if (e.slipUntil && this.time.now < e.slipUntil && src !== 'burn' && src !== 'gas' && src !== 'rocket') { if (Math.random() < 0.3) this.fxSparks(e.body.center.x, e.body.center.y, 2, 0, Math.PI * 2, [40, 120]); return; }   // a duelist mid-sidestep: shots slip past
    dmg /= DIFFS[this.runDiff].hp;                                          // difficulty: enemies act tougher or softer
    if (e.kind === 'stitcher' && e.ai === 'channel' && src !== 'burn' && (e.chanDmg += dmg) >= TUNE.STITCH.breakDmg) this.stitchFail(e, true);
    if (e.kind === 'mirror' && e.shieldUp && dx && Math.sign(dx) === -e.dir && ['rail', 'lance', 'stake'].includes(src)) this.mirrorDamage(e, dmg);
    if (e.def.molten && src === 'burn') return;                          // slag doesn't burn
    if (e.kind === 'harpooner' && e.hk && e.hk.state === 'hooked' && src !== 'burn' && (e.reelDmg += dmg) >= TUNE.HARPOON.breakDmg) { this.reeledBy = e; this.breakHarpoon('CUT LOOSE'); }
    if (e.kind === 'rammer') {                                          // ram plate soaks frontal fire; dizzy = wide open
      if (e.ai === 'dizzy') dmg *= 2;
      else if (dx && Math.sign(dx) === -e.dir && !['rocket', 'burn', 'flame', 'crush'].includes(src)) {
        dmg *= 0.4;
        if (Math.random() < 0.5) { this.fxSparks(e.body.center.x + e.dir * 12, e.body.center.y - 2, 3, e.dir > 0 ? 0 : Math.PI, 1.4, [60, 180]); Sfx.clang(0.4); }
      }
    }
    if (e.kind === 'claw' && e.grab && src !== 'net' && (e.grabDmg += dmg) >= TUNE.CLAW.breakDmg) this.clawRelease(e, true);   // hurt it enough and it lets go
    if (e.netT > 0 && src !== 'net' && src !== 'burn') dmg *= 1.25;      // tangled up: easier to hurt
    if (e.kind === 'roller') {                                           // curled up it's a ball of armour; dizzy it's wide open
      if (e.ai === 'roll' && src !== 'burn' && src !== 'gas' && src !== 'acid') { dmg *= TUNE.ROLLER.armour; if (Math.random() < 0.4) { this.fxSparks(e.body.center.x, e.body.center.y, 3, 0, Math.PI * 2, [60, 180]); Sfx.clang(0.35); } }
      else if (e.ai === 'dizzy') dmg *= 2;
    }
    if (e.frozen > 0) {                                                 // ice statue: real hits shatter it, chip damage bites harder
      if (dmg >= 10 || ['kick', 'crush', 'rocket', 'stake', 'parry', 'rail', 'saw'].includes(src)) { BUS.emit('hitmark', true, false); Sfx.confirm(true); e.hp = 0; this.killEnemy(e, dx, dy, 'shatter'); return; }
      dmg *= 1.5;
    }
    if (e.shieldBy && e.shieldBy.alive && this.time.now < e.shieldT && src !== 'burn') { dmg *= TUNE.WARDEN.soak; e.shieldHit = this.time.now; Sfx.shieldHit(); }   // warden bubble
    if (this.time.now < this.rampageUntil && src !== 'burn') dmg *= TUNE.RAMPAGE.damage;
    if (e.corrodeT > 0 && src !== 'acid' && src !== 'burn') dmg *= TUNE.ACID.bonus;   // corroded metal and flesh give way
    if (e.juggleUntil || e.soakUntil) dmg *= this.xwBonus(e, src);        // quake-launched and still airborne; soaked and zapped
    if (src !== 'burn' && src !== 'gas') { if (this.perks.hollow) dmg *= 1.2; if (this.perks.adren && this.hp <= 35) dmg *= 1.5; if (this.time.now < this.dmgUntil) dmg *= 2; if (!this.lab) dmg *= 1 + 0.05 * masteryStars(WEAPONS[this.weapon].id); }   // perks + OVERDRIVE + mastery
    if (e.shrunkT > 0 && src !== 'burn') dmg *= TUNE.SHRINK.take;        // shrunk: a soft target
    if (this.mutator === 'glass') dmg *= 2;                                      // GLASS CANNON
    if (e.kind === 'berserker' && e.rage) dmg *= TUNE.BERSERKER.take;
    if (e.kind === 'headsman' && e.ai === 'stuck') dmg *= TUNE.HEADSMAN.take;
    if (e.rallyT > this.time.now) dmg *= TUNE.WARHORN.take;               // rallied by a warhorn: half damage
    if (e.kind === 'cloaker') e.revealT = 1.5;                           // getting hit lights a cloaker up
    if (e.kind === 'mimic' && e.ai === 'hide') this.mimicReveal(e, this.time.now);   // shoot the "drum" and it bares its teeth
    if (e.tetherT > this.time.now && !this.sharing && src !== 'tether') {   // tethered: the others take a share
      this.sharing = true;
      for (const o of this.tethered) if (o !== e && o.alive && o.tetherT > this.time.now) { this.damageEnemy(o, dmg0 * TUNE.TETHER.share, 0, 0, 'tether'); this.tetherFlashT = this.time.now; }
      this.sharing = false;
      if (!e.alive) return;                                              // a shared hit set off something (a jelly nova) that finished it
    }
    if (dmg0 < 999 && dmg > (this.stats.big || 0)) this.stats.big = dmg;   // (scripted 999 kills don't count)                 // the biggest single hit of the run
    e.hp -= dmg; e.flashT = 0.08; e.aggro = true; e.aggroT = 5; e.lastHs = !!hs;
    { const now = this.time.now; e.hurtWin = (e.hurtWin || 0) * Math.exp(-(now - (e.hurtAt || 0)) / 1000) + dmg; e.hurtAt = now; }   // how hard it's being hit lately (underFire)
    e.dmgAcc += dmg; if (hs) e.dmgHead = true; if (!e.dmgFlushAt) e.dmgFlushAt = this.time.now + (src === 'burn' || src === 'flame' || src === 'acid' || src === 'crush' || src === 'needle' || src === 'drill' || src === 'gas' || src === 'siphon' || src === 'microwave' ? 420 : 90);   // batched damage numbers (streams batch longer)
    this.addStyle(dmg * 0.25);
    const quiet = src === 'burn' || src === 'gas' || src === 'net', rapid = src === 'arc' || src === 'flame' || src === 'ripper' || src === 'acid' || src === 'needle' || src === 'siphon' || src === 'microwave';
    if (src !== 'rocket' && !quiet) {
      const kb = ({ pellet: 85, arc: 8, rail: TUNE.RAIL.knock, saw: 60, flame: 4, kick: 0, parry: 120, stake: 240, ripper: 0, lance: 220, glaive: 70, acid: 3, crush: 0, shock: 150, needle: 10, drill: 0, gas: 0, revolver: 90, whip: 0, siphon: 0, microwave: 0 }[src] ?? 45) * e.def.kb;
      e.body.velocity.x += dx * kb;
      if (e.kind === 'drone' || e.kind === 'mender' || e.kind === 'linker') e.body.velocity.y += dy * kb;
      else if (e.body.blocked.down && kb > 0) e.body.velocity.y = Math.min(e.body.velocity.y, -50 * e.def.kb);
      e.stunT = Math.max(e.stunT, ({ pellet: 0.2, arc: 0.05, rail: 0.3, flame: 0.02, kick: 0, parry: 0.3, stake: 0.4, ripper: 0.16, lance: 0.4, glaive: 0.15, acid: 0.02, shock: 0.3, needle: 0.03, drill: 0.2, gas: 0, revolver: 0.2, siphon: 0.02, microwave: 0.02 }[src] ?? 0.07));
    }
    if (isRifleman(e) && e.ai === 'aim' && !rapid && src !== 'nail' && !quiet) { e.ai = 'engage'; e.fireCd = 0.5; }   // heavy hits spoil the aim
    if (!e.def.anchored && !quiet) e.rotation = clamp(e.rotation + (dx >= 0 ? 1 : -1) * (src === 'nail' || rapid ? 0.12 : 0.3), -0.5, 0.5);   // visual wobble
    if (hs && src === 'ripper' && Math.random() > 0.15) hs = false;          // the blade doesn't ding every bite
    if (hs) { this.headshots++; Sfx.ding(); this.fxBlood(e.body.center.x, e.body.top, 8, -Math.PI / 2, 1.0, [60, 200]); }
    if (!quiet) BUS.emit('hitmark', e.hp <= 0, !!hs);
    if (!quiet) this.polHit(e, dx, dy, src, dmg);                       // expansion: polish (cosmetic only)
    if (!quiet && (!rapid || Math.random() < 0.25)) Sfx.confirm(e.hp <= 0);
    if (e.hp <= 0) { this.killEnemy(e, dx, dy, src); return; }
    if (!rapid && !quiet) Sfx.hit();
  }
  flushDmg(e, col) {
    if (e.dmgAcc > 0.5) this.dmgNumber(e.x, e.body.top - 5, Math.round(e.dmgAcc) + (e.dmgHead ? '!' : ''), col || (e.dmgHead ? 'Y' : 'W'));
    e.dmgAcc = 0; e.dmgHead = false; e.dmgFlushAt = 0;
  }
  // Pixel damage numbers: pooled digit sprites that pop, rise and fade.
  dmgNumber(x, y, str, col) {
    str = String(str); const imgs = [];
    for (const ch of str) {
      const img = this.digPool.pop(); if (!img) break;
      img.setTexture('dig' + col, ch === '!' ? 'x' : ch === '+' ? 'p' : ch).setVisible(true).setAlpha(1);
      imgs.push(img);
    }
    let nx = x + rand(-4, 4), ny = y;                                   // shove it clear of numbers still rising nearby
    for (let k = 0; k < 6; k++) {
      const clash = this.dmgNums.some(d => {
        const q = d.t / (d.big ? 0.9 : 0.7), dy = d.y - 22 * (1 - Math.pow(1 - q, 3));
        return q < 0.8 && Math.abs(dy - ny) < 9 && Math.abs(d.x + d.vx * d.t - nx) < (d.imgs.length + str.length) * 3.5 + 3;
      });
      if (!clash) break;
      ny -= 9; nx += k % 2 ? 6 : -6;
    }
    this.dmgNums.push({ imgs, x: nx, y: ny, t: 0, vx: rand(-8, 8), big: col === 'R' || col === 'Y' });
  }
  // ---- expansion: polish ----
  // Cosmetic juice over the fight: a white pop and an impact star on every hit, a shock ring and hot flecks on every
  // kill, smoke curling off a hot barrel, dust kicked along the floor by a hard landing, sparks off a wall slide,
  // streaks behind a dash and glints on medkits. None of it changes play. It draws only from fxRandom; its particles
  // have their own pool (this.cfx), since a seeded this.fx.emit stops drawing when that pool runs dry; it never moves
  // the camera, which the play-test bot's idle aim reads the pointer through; and it only reads the scene. So the
  // seeded campaigns play out the same with or without it.
  polInit() {
    this.cfx = new FX(this, 900, 12); this.cfx.solid = (x, y) => this.solidAt(x, y);   // flecks and sparks bounce off tiles (mode 1); nothing here paints (mode 2)
    this.fx.twin = this.cfx;                                             // every cosmetic emit in the scene lands here too, out of the seeded list
    this.polG = this.add.graphics().setDepth(16.5).setBlendMode(ADD);   // impact stars, shock rings, dash streaks, twinkles
    this.polPops = []; this.polPopI = 0; this.polMarks = []; this.polFree = []; this.polDrawn = false;
    for (let i = 0; i < 20; i++) { const p = this.add.image(-99, -99, 'glow').setVisible(false).setDepth(5.05); p.on = false; p.t = 0; this.polPops.push(p); }   // white copies just over the foes
    this.polShotT = this.lastShotT; this.polHeat = 0; this.polSmokeT = 0; this.polGround = true; this.polVy = 0; this.polDash = false; this.polSlideT = 0; this.polGlintT = 0;
    this.polCol = { star: [0xffb878, 0xfff090, 0xff9a40], ring: [0xff6a4a, 0xffd860, 0xff8a28],   // by material: meat, metal, slag
      fleck: [[0xffffff, 0xffd0b0, 0xff7050], [0xffffff, 0xffe46a, 0xffa030], [0xffffff, 0xffe080, 0xff8a20, 0xa02008]] };
    this.polCool = new Set(['arc', 'cryo', 'acid', 'microwave', 'siphon', 'tractor', 'ripper', 'prism', 'sonic', 'whip', 'katana', 'gauntlet', 'shield', 'vacuum', 'hammer',
      'bubble', 'glue', 'stasis', 'decoy', 'tripwire', 'shrink', 'coil', 'limpet', 'glaive', 'orbital', 'dronepod', 'flail', 'net', 'seed', 'shock', 'heatray', 'hydro', 'caltrop']);   // beams, blades and throwers: no barrel to smoke
  }
  polMat(D) { return D.molten ? 2 : D.mech ? 1 : 0; }
  polMark(k, x, y, a, col, s, dur, delay = 0) {                         // k: 0 impact star, 1 shock ring, 2 dash streak, 3 floor ring, 4 twinkle
    if (this.polMarks.length >= 64) return;
    const m = this.polFree.pop() || {};
    m.k = k; m.x = x; m.y = y; m.a = a; m.col = col; m.s = s; m.dur = dur; m.t = -delay; this.polMarks.push(m);
  }
  polHit(e, dx, dy, src, dmg) {                                          // damageEnemy: a hit that lands (no burn, gas or net ticks)
    const now = this.time.now; if (now - (e.polT || -1e9) < 70) return; e.polT = now;   // rapid fire and pellet volleys: one per foe per 70 ms
    const D = e.def, b = e.body, m = this.polMat(D), big = dmg >= 18 || src === 'rail' || src === 'stake' || src === 'lance' || src === 'kick' || src === 'parry';
    const L = Math.hypot(dx, dy), ux = L ? dx / L : 0, uy = L ? dy / L : 0, fl = OPTS.flash ? 1 : 0.45;
    const hx = b.center.x - ux * (b.halfWidth + 1), hy = b.center.y - uy * (b.halfHeight * 0.6 + 1);   // on the skin, the side the hit came from
    if (e.hp > 0 && e.visible && e.alpha > 0.3) {                        // the flashed body punches up and settles back (a white copy over it; the body's own scale is its hitbox)
      const p = this.polPops[this.polPopI = (this.polPopI + 1) % this.polPops.length], sc = Math.abs(e.scaleX) || 1, grow = Math.min(big ? 0.32 : 0.22, (big ? 9 : 6) / Math.max(D.fw, D.fh));
      p.setTexture(D.key + '_w', e.fr).setFlipX(e.flipX).setRotation(e.rotation).setPosition(e.x, e.y).setScale(sc * (1 + grow)).setAlpha(1).setVisible(true);
      p.on = true; p.t = 0; p.dur = big ? 0.1 : 0.075; p.s0 = sc * (1 + grow); p.s1 = sc; p.e = e;
    }
    this.polMark(0, hx, hy, Math.atan2(uy, ux), this.polCol.star[m], big ? 1.8 : 1.1, big ? 0.13 : 0.09);
    if (big) this.polMark(1, hx, hy, 0, this.polCol.ring[m], 9, 0.16);
    if (m || big) this.cfx.emit(hx, hy, { n: big ? 5 : 2, angle: Math.atan2(-uy, -ux), spread: 1.4, speed: [60, 190], life: [0.1, 0.28], size: [2, 1], cols: this.polCol.fleck[m], add: true, g: 500, mode: 1, cosmetic: true });
  }
  polKill(e, cx, cy, dx, dy) {                                           // killEnemy, after its own pop: a shock ring and a spray of hot flecks
    const D = e.def, m = this.polMat(D), sz = Math.max(D.fw, D.fh), boss = sz >= 40 || D.hp >= 400;
    this.polMark(1, cx, cy, 0, this.polCol.ring[m], sz * 0.7 + 5, 0.26);
    this.polMark(0, cx, cy, Math.atan2(dy || 0, dx || 0), 0xffffff, 2.2, 0.1);
    if (boss) { this.polMark(1, cx, cy, 0, 0xffffff, sz * 1.3 + 10, 0.4, 0.06); this.polMark(1, cx, cy, 0, this.polCol.ring[m], sz * 1.9 + 16, 0.55, 0.14); }   // a big one rings three times
    this.cfx.emit(cx, cy, { n: boss ? 22 : 9, speed: [80, boss ? 300 : 220], life: [0.2, 0.5], size: [2, 1], cols: this.polCol.fleck[m], add: true, g: 420, drag: 1, mode: 1, cosmetic: true });
    if (dx || dy) this.cfx.emit(cx, cy, { n: 4, angle: Math.atan2(dy || 0, dx || 0), spread: 0.35, speed: [220, 360], life: [0.08, 0.16], size: [2, 1], cols: [0xffffff, this.polCol.ring[m]], add: true, drag: 3, cosmetic: true });   // carried on by the killing blow
  }
  polLand(x, y, vy) {                                                    // a hard landing kicks dust out along the floor; the longer the drop, the harder the squash
    const k = clamp((vy - 160) / 360, 0, 1);
    for (let s = -1; s <= 1; s += 2) this.cfx.emit(x + s * 3, y - 1, { n: 2 + Math.round(5 * k), angle: s > 0 ? -0.12 : Math.PI + 0.12, spread: 0.3, speed: [25, 60 + 110 * k], life: [0.25, 0.5], size: [3, 1], cols: [0x8a8f98, 0x5e626a], alpha: [0.65, 0], g: -12, drag: 4.5, cosmetic: true });
    if (k > 0.3) this.polMark(3, x, y, 0, 0x7c828c, 10 + 14 * k, 0.2 + 0.1 * k);
    this.squash(1.14 + 0.26 * k, 0.86 - 0.22 * k);
  }
  polUpdate(dt, now) {                                                   // update(), every frame; dt crawls in a hit-stop, so the juice freezes with it
    const M = this.polMarks;
    for (let i = M.length - 1; i >= 0; i--) { const m = M[i]; if ((m.t += dt) >= m.dur) { M[i] = M[M.length - 1]; M.pop(); this.polFree.push(m); } }
    for (const p of this.polPops) {
      if (!p.on) continue;
      const k = (p.t += dt) / p.dur;
      if (k >= 1) { p.on = false; p.e = null; p.setVisible(false); continue; }
      const e = p.e; if (e.active) p.setPosition(e.x, e.y).setRotation(e.rotation).setFlipX(e.flipX);
      p.setScale(p.s0 + (p.s1 - p.s0) * (1 - (1 - k) * (1 - k))).setAlpha(k > 0.7 ? (1 - k) / 0.3 : 1);
    }
    if (this.state !== 'dead') {
      const p = this.player, b = p.body, ground = b.blocked.down || b.touching.down;
      if (ground && !this.polGround && this.polVy > 160) this.polLand(p.x, b.bottom, this.polVy);
      this.polGround = ground; this.polVy = b.velocity.y;
      if (this.sliding && b.velocity.y > 30 && (this.polSlideT -= dt) <= 0) {   // a wall slide grinds sparks off the boots
        this.polSlideT = 0.045;
        this.cfx.emit(p.x + this.wallSide * 5, b.bottom - 3, { n: 2, angle: -Math.PI / 2 - this.wallSide * 0.9, spread: 0.8, speed: [40, 130], life: [0.12, 0.32], size: [2, 1], cols: [0xffffff, 0xffe46a, 0xff9a30], add: true, g: 520, mode: 1, cosmetic: true });
      }
      const dashing = now < this.dashUntil;
      if (dashing && !this.polDash) {                                   // a dash leaves speed streaks where it set off
        const a = Math.atan2(this.dashVy, this.dashVx), ca = Math.cos(a), sa = Math.sin(a);
        for (let i = -1; i <= 1; i++) this.polMark(2, p.x - ca * 4 - sa * i * 6, p.y - 2 - sa * 4 + ca * i * 6, a + Math.PI, 0x9af0ff, 24 - Math.abs(i) * 9, 0.2);
      }
      this.polDash = dashing;
      if (this.lastShotT !== this.polShotT) {                            // a shot went off (fire() and the charge weapons stamp lastShotT): the barrel heats up
        this.polShotT = this.lastShotT;
        const W = WEAPONS[this.weapon]; if (!this.polCool.has(W.id)) this.polHeat = Math.min(1, this.polHeat + clamp((W.cooldown || 200) / 700, 0.1, 0.7));
      }
      if (this.polHeat > 0) {                                            // barrel smoke: a thin wisp curls off the muzzle once the shooting stops
        this.polHeat = Math.max(0, this.polHeat - dt * 0.55);
        if (now - this.lastShotT > 110 && (this.polSmokeT -= dt) <= 0) {
          this.polSmokeT = 0.03 + 0.08 * (1 - this.polHeat);
          const G = GUNS[WEAPONS[this.weapon].gun], a = this.aim, r = (G && G.muzzle || 12) - 1, mx = this.shoulder.x + Math.cos(a) * r, my = this.shoulder.y + Math.sin(a) * r;
          if (!this.solidAt(mx, my)) this.cfx.emit(mx, my, { n: 1, angle: -Math.PI / 2, spread: 0.7, speed: [8, 22], vx: b.velocity.x * 0.15, life: [0.5, 1], size: [2, 5], cols: [0xb8b2ac, 0x8a847e, 0x5a5652], alpha: [0.22 + 0.4 * this.polHeat, 0], g: -36, drag: 1.4, cosmetic: true });
        }
      }
    }
    if ((this.polGlintT -= dt) <= 0) {                                   // medkits catch the light now and then
      this.polGlintT = 0.25;
      for (const k of this.pickups || []) if (!k.taken && fxRandom() < 0.5) this.polMark(4, k.x + (fxRandom() < 0.5 ? -1 : 1) * crand(5, 9), k.img.y + crand(-9, 1), 0, fxRandom() < 0.5 ? 0xffffff : 0x9affb0, 3, 0.4);   // round its edges, clear of the white case
    }
    this.cfx.update(dt); this.cfx.draw();
    this.polDraw();
  }
  polDraw() {
    const g = this.polG, M = this.polMarks;
    if (!M.length) { if (this.polDrawn) { g.clear(); this.polDrawn = false; } return; }
    g.clear(); this.polDrawn = true;
    const fl = OPTS.flash ? 1 : 0.45;                                    // reduced flashes: the stars and rings go dim
    for (const m of M) {
      if (m.t < 0) continue;
      const k = m.t / m.dur, e = 1 - k, x = Math.round(m.x), y = Math.round(m.y);
      if (m.k === 0) {                                                   // impact star: a hot core, a long arm back along the shot, a short cross arm
        const L = (4 + 5 * m.s) * (0.45 + 0.55 * e), ca = Math.cos(m.a), sa = Math.sin(m.a), al = Math.sqrt(e) * fl;
        g.lineStyle(3, m.col, 0.45 * al).lineBetween(x - ca * L * 1.1, y - sa * L * 1.1, x, y);
        g.lineStyle(1, 0xffffff, al).lineBetween(x - ca * L * 1.3, y - sa * L * 1.3, x + ca * L * 0.3, y + sa * L * 0.3);
        g.lineStyle(1, m.col, 0.9 * al).lineBetween(x - sa * L * 0.6, y + ca * L * 0.6, x + sa * L * 0.6, y - ca * L * 0.6);
        g.fillStyle(0xffffff, al).fillRect(x - 1, y - 1, 3, 3);
      } else if (m.k === 1 || m.k === 3) {                               // a shock ring, or a flat one along the floor
        const r = Math.max(1, m.s * (0.3 + 0.7 * (1 - e * e * e)));
        g.lineStyle(k < 0.45 ? 2 : 1, m.col, 0.85 * e * fl);
        if (m.k === 1) g.strokeCircle(x, y, r); else g.strokeEllipse(x, y - 1, r * 2, Math.max(2, r * 0.45));
      } else if (m.k === 2) {                                            // dash streak: the near end draws in toward the far one
        const ca = Math.cos(m.a), sa = Math.sin(m.a);
        g.lineStyle(1, m.col, 0.7 * e).lineBetween(m.x + ca * m.s * k, m.y + sa * m.s * k, m.x + ca * m.s, m.y + sa * m.s);
      } else {                                                           // twinkle: a plus that flares and shrinks away
        const r = Math.round(m.s * Math.sin(Math.PI * k));
        g.fillStyle(m.col, 0.9 * fl).fillRect(x - r, y, r * 2 + 1, 1).fillRect(x, y - r, 1, r * 2 + 1);
      }
    }
  }
  addStyle(p) { this.style.pts = Math.min(1600, this.style.pts + p * (this.perks && this.perks.style ? 1.5 : 1)); }
  updateStyle(dt) {
    const s = this.style;
    s.pts = Math.max(0, s.pts - (12 + s.pts * 0.07) * dt);
    let r = 0; while (r + 1 < STYLE_RANKS.length && s.pts >= STYLE_RANKS[r + 1].t) r++;
    if (r > s.rank) { Sfx.rankUp(); BUS.emit('rankup', r); }
    if (r >= 4 && this.rampageArmed && this.state === 'play') { this.rampageArmed = false; this.startRampage(); }   // S rank: RAMPAGE
    if (r < 3) this.rampageArmed = true;
    s.rank = r; s.best = Math.max(s.best, r);
  }
  killEnemy(e, dx, dy, src) {
    if (!e.alive) return;                                               // already dead (a chain reaction got there first)
    e.alive = false; e.deadAt = this.time.now;
    const b = e.body, cx = b.center.x, cy = b.center.y, D = e.def, now0 = this.time.now;
    if (D.tiny) {                                                       // swarm gnats: a little pop, none of the heavy kill feedback
      if (e.kind === 'ratbot' && (this.ms.rats = (this.ms.rats || 0) + 1) >= 15) this.award('pest');
      this.fx.emit(cx, cy, { n: 6, speed: [30, 120], life: [0.15, 0.35], size: [2, 1], cols: [0xffe080, 0xff8a20, 0x9a1414], g: 300, mode: 1 });
      if (Math.random() < 0.5) this.fxBlood(cx, cy, 2, 0, Math.PI * 2, [20, 80]);
      Sfx.gnatPop(); this.addStyle(6);
      if (e.glow) e.glow.setVisible(false);
      if (this.locks.length) this.locks = this.locks.filter(o => o !== e);
      e.disableBody(true, true);
      if (this.lab && !e.summoned) this.labKill();
      return;
    }
    this.flushDmg(e, e.lastHs ? 'Y' : 'R');
    if (!e.summoned && e.kind !== 'wyrmseg') this.multiKill(now0);
    if (isHumanoid(e) && !this.lab?.stationary) this.allyDown(e, now0);
    const grounded = b.blocked.down || b.touching.down, playerAir = !(this.player.body.blocked.down || this.player.body.touching.down);
    if (e.juggleUntil > now0 && !grounded) this.juggleKill(e);           // finished in the air after a quake threw it up
    let style = 60 + (e.lastHs ? 50 : 0) + (!grounded && !D.noAirStyle ? 40 : 0) + (playerAir ? 25 : 0);
    const wid = this.creditW || WEAPONS[this.weapon].id;                // a ball, quake, tornado or barrage still out credits the gun that made it
    if (this.style.lastWeapon && this.style.lastWeapon !== wid) style += 30;      // reward mixing weapons
    this.style.lastWeapon = wid;
    if (!e.summoned) { this.stats.wk[wid] = (this.stats.wk[wid] || 0) + 1; if (this.mode.lifetime) LIFE.kills++; }
    if (this.mode.lifetime && !e.summoned && wid) {                                // lifetime mastery for the gun in hand
      const before = masteryStars(wid); MASTERY[wid] = (MASTERY[wid] || 0) + 1; const after = masteryStars(wid);
      if (after > before) { BUS.emit('callout', (WEAPONS.find(w => w.id === wid) || {}).name + ' ' + '*'.repeat(after)); Sfx.rankUp(); saveMastery(); if (after >= 3) { this.award('goldsmith'); this.time.delayedCall(900, () => BUS.emit('callout', 'GOLD-PLATED')); } }
    }
    // little overkill and no blast: it drops as a ragdoll you can keep shooting; otherwise it bursts now
    const rag = !!D.ragdoll && src !== 'rocket' && src !== 'tickboom' && src !== 'crush' && src !== 'shatter' && src !== 'execute' && -e.hp <= 26;   // (the heavy always bursts)
    const rd = rag ? this.spawnRagdoll(e, dx, dy, src, !!(D.head && e.lastHs)) : null;
    const hay = !!D.haywire && src !== 'rocket' && src !== 'crush' && src !== 'shatter' && -e.hp <= 40 && this.spawnHaywire(e, dx);   // clean kill: the jetpack goes haywire
    if (D.head) {                                                     // heads: popped clean off on a headshot kill
      if (e.lastHs) {
        this.spawnGib(D.head, cx, b.top, dx * 80 + rand(-40, 40), -rand(380, 470));
        this.fountains.push(rd ? { rd, t: 1.4 } : { x: cx, y: b.top + 3, t: 0.75 });
        this.zoomPunch = Math.max(this.zoomPunch, 0.06);
        BUS.emit('callout', 'HEADSHOT!');
      } else if (!rag && !hay) this.spawnGib(D.head, cx, cy - 4, dx * 120 + rand(-80, 80), -rand(160, 300));
    }
    if (D.deathFlash) { this.fx.emit(cx, cy, { n: 22, speed: [40, 180], life: [0.3, 0.7], size: [3, 1], cols: D.deathFlash, add: true, drag: 2 }); this.spawnLight(cx, cy, 'glow', D.deathFlash.at(-1), 2, 3.5, 0.9, 0.3); }
    if (D.killZoom) this.zoomPunch = Math.max(this.zoomPunch, D.killZoom);
    if (!rag && !D.molten && !D.mech && Math.hypot(this.player.x - cx, this.player.y - cy) < 70) BUS.emit('splat', src === 'rocket' || src === 'ripper' ? 6 : 3);   // too close: it gets on the lens
    const power = Math.max(D.gibPower || 1, src === 'rocket' || src === 'execute' ? 1.7 : src === 'pellet' ? 1.25 : 1), charred = e.burnT > 0, shat = src === 'shatter';
    if (shat) {                                                       // frozen solid: it goes like glass
      this.fx.emit(cx, cy, { n: 30, speed: [60, 260], life: [0.4, 0.9], size: [2, 1], cols: [0xffffff, 0xe0f8ff, 0x9adcff, 0x5aa8e0], g: 500, mode: 1, drag: 0.6 });
      this.spawnLight(cx, cy, 'glow', 0xa0e0ff, 1.5, 3, 0.9, 0.25); Sfx.shatter(); BUS.emit('callout', 'SHATTERED!'); this.addStyle(60);
    }
    const n = rag || hay || D.noGibs ? 0 : randi(D.gibN[0], D.gibN[1]) + (src === 'rocket' ? 4 : 0), spread = D.gibSpread || 5;
    for (let i = 0; i < n; i++) {
      const tex = shat && i % 2 === 0 ? pick(['g_ice1', 'g_ice2', 'g_ice3']) : i < D.gibs.length ? D.gibs[i] : pick(D.gibs);
      const g = this.spawnGib(tex, cx + rand(-spread, spread), cy + rand(-spread, spread), dx * rand(60, 220) * power + rand(-130, 130) * power, (dy * 120 - rand(140, 330)) * power, shat ? 'metal' : D.molten ? 'slag' : D.mech ? 'metal' : undefined);
      if (shat) g.setTint(0xc8f0ff); else if (charred && !D.molten) g.setTint(0x7a5a48);                  // burnt to a crisp
    }
    if (e.elite) this.eliteDeath(e, cx, cy);
    if (D.death) this[D.death](e, cx, cy, dx, src, charred);           // its own death: blasts, spills, loose parts, a boss's fall
    if (e.kind !== 'zealot' && !e.summoned) this.zealotSouls(cx, cy);                // zealots nearby drink the soul
    if (this.grabbedBy === e) this.grabbedBy = null;
    if (e.gravT > 0 || e.gravSlam) { e.gravT = 0; e.gravSlam = false; b.setAllowGravity(true); e.rotation = 0; }
    for (const L of this.limpets) if (L.e === e) { L.e = null; L.vx = rand(-60, 60); L.vy = -120; L.stuck = false; }   // limpets fall off the body
    if (this.tb && this.tb.o === e) this.tb = null;
    if (src === 'kick' && Math.random() < TUNE.EXECUTE.dropChance) this.dropOrbs(cx, cy, 1);
    if (D.child && src !== 'shatter') {
      this.enemiesLeft += 2; this.totalEnemies += 2;
      if (this.lab) this.labPending += 2;
      this.time.delayedCall(16, () => { this.slagSplit(cx, cy, D.child, dx); if (this.lab) this.labPending -= 2; });
    }
    if (e.kind === 'harpooner' || this.reeledBy === e) this.dropHarpoon(e);
    if (src === 'ripper' && this.state !== 'dead' && this.hp < TUNE.PLAYER_HP) {   // ripper kills feed you
      const h = Math.min(TUNE.RIPPER.heal, TUNE.PLAYER_HP - this.hp);
      this.hp += h; BUS.emit('hp', this.hp, 0); this.dmgNumber(this.player.x, this.player.y - 18, '+' + Math.round(h), 'G');
      this.fx.emit(this.player.x, this.player.y, { n: 8, speed: [20, 70], life: [0.3, 0.6], size: [2, 1], cols: [0xffffff, 0x7dff8a], add: true, g: -60 });
    }
    if (this.locks.length) this.locks = this.locks.filter(o => o !== e);
    if (D.molten) {                                                   // slag bursts: molten spatter, scorch, no blood
      const t = D.tier + 1;
      this.fx.emit(cx, cy, { n: 10 + 10 * t, speed: [50, 160 + 50 * t], life: [0.4, 0.9], size: [3, 1], cols: [0xffffff, 0xffe080, 0xffa030, 0xff5a1a, 0xa02008], add: true, g: 420, mode: 1, drag: 0.6 });
      this.fxFire(cx, cy, 4 + 4 * t); this.fxSmoke(cx, cy, 2 + t);
      this.spawnLight(cx, cy, 'glow', 0xff7020, 1 + 0.6 * t, 2 + t, 0.9, 0.3);
      this.paintScorch(cx, b.bottom, 4 + 3 * t); Sfx.splat(D.tier);
    } else if (D.mech) {
      this.fxSparks(cx, cy, 18, 0, Math.PI * 2, [80, 280]); this.fxSmoke(cx, cy, 6); Sfx.clang(0.6); Sfx.gib(0.5);
    } else {
      this.fxBlood(cx, cy, Math.round((rag ? 10 : 38) * power), -Math.PI / 2, Math.PI * 2, [60, 300]);
      this.fxBlood(cx, cy, 14, Math.atan2(dy, dx), 0.8, [150, 380]);
      this.fxMist(cx, cy, 10);
      if (D.burstSparks) { this.fxSparks(cx, cy, 16, 0, Math.PI * 2, [80, 260]); this.fxSmoke(cx, cy, 6); }
      if (D.burstFire) { this.fxFire(cx, cy, 16); this.spawnLight(cx, cy, 'glow', 0xff7a1a, 2, 4, 0.9, 0.4); }
      this.paintSplatAround(cx, b.bottom - 2, rag ? 4 : 10 + 6 * power);
      if (rag) { Sfx.squish(); Sfx.land(0.5); } else Sfx.gib(power);
    }
    this.shake(...(D.killShake || [120, 0.005 * power]));
    this.hitStop(D.killStop || 45);
    if (e.glow) e.glow.setVisible(false);
    if (e.thr) e.thr.setVisible(false);
    if (e.gun) { e.gun.setVisible(false); this.spawnGib(D.dropGun || 'icon_rifle', cx, cy, dx * 150 + rand(-60, 60), -rand(200, 300), 'metal'); }
    e.setScale(1);
    if (!rag && !hay) this.spawnLight(e.x, e.y, e.def.key + '_w', 0xffffff, 1, 1.8, 0.9, 0.14, e.fr, e.flipX);   // white silhouette "pop"
    this.polKill(e, cx, cy, dx, dy);                                    // expansion: polish (cosmetic only)
    e.disableBody(true, true);
    const now = this.time.now;                                       // kill chain: next kill within 2.6 s keeps it going
    this.combo = now - this.lastKillT < 2600 ? this.combo + 1 : 1;
    this.lastKillT = now; this.bestCombo = Math.max(this.bestCombo, this.combo);
    if (this.combo >= 2) BUS.emit('combo', this.combo);
    this.killTimes = this.killTimes.filter(t => now - t < 350); this.killTimes.push(now);   // kill-cam: 3+ kills in a blink
    if (this.killTimes.length >= 3 && now > this.killCamUntil) {
      this.killCamUntil = now + 2500; this.slowmoUntil = Math.max(this.slowmoUntil, now + 700);
      this.zoomPunch = Math.max(this.zoomPunch, 0.1); BUS.emit('flash', 0.3); Sfx.killcam(); this.impactFrame(2);
      BUS.emit('callout', this.killTimes.length >= 5 ? 'MASSACRE!' : 'CARNAGE!');
    }
    this.addStyle(style + (this.combo - 1) * 15);
    if (e.burnT > 0 && ++this.ms.burnKills >= 15) this.award('pyro');
    if (src === 'crush' && ++this.ms.crushKills >= 5) this.award('bully');
    if (this.combo >= 20) this.award('chain');
    if (Object.keys(this.stats.wk).length >= 15) this.award('arsenal');
    if (this.mutator === 'vamp' && !D.tiny && this.state !== 'dead' && this.hp < TUNE.PLAYER_HP) { this.hp = Math.min(TUNE.PLAYER_HP, this.hp + 4); BUS.emit('hp', this.hp, 0); }   // VAMPIRE
    if (this.perks.vampire && this.state !== 'dead' && this.hp < TUNE.PLAYER_HP) { this.hp = Math.min(TUNE.PLAYER_HP, this.hp + 3); BUS.emit('hp', this.hp, 0); }
    if (this.perks.scav && Math.random() < 0.15) this.dropOrbs(e.body.center.x, e.body.center.y, 1);
    if (e.def.hp >= TUNE.SUPPLY.eliteHp && !e.summoned && !e.def.winDelay && Math.random() < TUNE.SUPPLY.eliteChance) this.dropCapsule(e.body.center.x, e.body.center.y);   // elites sometimes drop a power-up
    if (this.perks.volatile && src !== 'volatile' && Math.random() < 0.25) { const vx = e.body.center.x, vy = e.body.center.y; this.time.delayedCall(90, () => { if (this.state !== 'dead') this.explode(vx, vy, TUNE.VOLATILE); }); }
    if (e.summoned) return;                                            // boss spawn: doesn't count toward the wave
    if (this.lab) { this.labKill(); return; }
    this.stats.kills++; this.enemiesLeft--;
    if (this.campaign && this.state === 'play') this.releaseCampaignSquad();
    BUS.emit('enemies', this.activeHostiles());
    if (this.enemiesLeft === 0) {
      if (this.campaignRoute.length) BUS.emit('callout', 'AREA CLEAR');   // a valve crew: the route carries on
      else if (!this.mode.waves || this.wave < this.mode.waves - 1) this.waveCleared(e.body.center.x, e.body.center.y);
      else if (D.winDelay) this.time.delayedCall(D.winDelay, () => this.win());
      else this.win();
    } else if (this.enemiesLeft === 1 && !D.skipOneLeft) BUS.emit('callout', 'ONE LEFT');
  }
  // ================================================================== expansion: bosses ====
  // Five bosses for BOSS RUSH, OVERTIME's boss slot and the Lab's Boss Chamber, never the campaign: THE CRUCIBLE,
  // THE GRINDER, THE HIVE QUEEN, THE OVERSEER and THE CONDUCTOR. Each breaks into phase two at 66% and phase three at
  // 33% (the boss bar's notches) with a stagger, a callout and flying debris, telegraphs every attack (an outline, a
  // mark on the floor, a line to where it strikes), gets the letterbox intro from warpIn (xbIntro) and goes down in
  // rolling blasts that take whatever it summoned with it (xbDeath). Their floor hazards (slag waves and pools, ruts,
  // live floor, saw blades, ball lightning) live in this.xb, made by the first of them to spawn and run by updateXb;
  // each hazard keeps its boss and goes harmless when that boss falls.
  xbFx() {
    return this.xb || (this.xb = { waves: [], pools: [], blades: [], orbs: [],
      g: this.add.graphics().setDepth(4.98), ga: this.add.graphics().setDepth(16.4).setBlendMode(ADD), gt: this.add.graphics().setDepth(5.3) });
  }
  xbPhase(e) { const f = e.hp / e.def.hp; return f > 0.66 ? 1 : f > 0.33 ? 2 : 3; }
  xbFloor() { const pb = this.player.body, fy = this.floorBelow(pb.center.x, pb.bottom - 4, 240); return fy === null ? pb.bottom : fy; }   // the floor you're over
  xbSafeX(x, from = x) {                                                // ARENA 04: beside the wrecking ball's swing, on the side `from` is on
    const W = this.A.wrecker, r = W ? W.len * Math.sin(W.amp) + 36 : 0;
    return !W ? x : from < W.px ? Math.min(x, W.px - r) : Math.max(x, W.px + r);
  }
  // ARENA 04: a flier of radius s keeps out of the ball's reach anywhere along its arc. It can hover over the arc, above
  // the dais, and it crosses over the top of the swing rather than through it.
  xbReach(e) { const b = e.body; return Math.hypot(b.halfWidth, b.halfHeight) + (e.nodes && e.phase === 1 ? TUNE.OVERSEER.orbit + 8 : 0); }   // the Overseer's nodes too
  xbBallGap(x, y, s) {                                                  // > 0: (x, y) is that far inside the ball's reach
    const W = this.A.wrecker; if (!W) return -1;
    const a = clamp(Math.atan2(x - W.px, y - W.py), -W.amp, W.amp);
    return TUNE.WRECK.r + s + 4 - Math.hypot(x - W.px - Math.sin(a) * W.len, y - W.py - Math.cos(a) * W.len);
  }
  xbClear(x, y, s, inside) {                                            // the nearest point out of the ball's reach, over the arc (inside) or under and beside it
    const W = this.A.wrecker; if (!W || this.xbBallGap(x, y, s) <= 0) return [x, y];
    if (inside === undefined) inside = Math.hypot(x - W.px, y - W.py) < W.len;
    const a = clamp(Math.atan2(x - W.px, y - W.py), -W.amp, W.amp), r = (TUNE.WRECK.r + s + 14) * (inside ? -1 : 1);   // 10 px spare for its drift
    const nx = W.px + Math.sin(a) * (W.len + r), ny = W.py + Math.cos(a) * (W.len + r);
    return ny >= 56 && this.xbBallGap(nx, ny, s) <= 0 ? [nx, ny] : [this.xbSafeX(x), y];
  }
  xbHover(e, dt, tx, ty, sp, k = 1.6) {                                 // a flier eases toward a point, kept inside the room and out of the ball's way
    const b = e.body, s = this.xbReach(e);
    if (this.xbBallGap(b.center.x, b.center.y, s) > 0) sp = Math.max(sp, 90);   // caught in the ball's reach: hurry out
    [tx, ty] = this.xbRoute(b.center.x, b.center.y, clamp(tx, 72, LW - 72), clamp(ty, 56, LH - 96), s);
    b.velocity.x += (clamp((tx - b.center.x) * 1.4, -sp, sp) - b.velocity.x) * Math.min(1, dt * k);
    b.velocity.y += (clamp((ty - b.center.y) * 1.6, -sp, sp) - b.velocity.y) * Math.min(1, dt * k);
  }
  xbOwn(e, kind) { let n = 0; for (const o of this.enemies.getChildren()) if (o.alive && o.owner === e && o.kind === kind) n++; return n; }
  xbAdd(kind, x, y, owner) {                                            // a summoned add at an exact spot; it dies with its boss
    const o = this.spawnEnemy(kind, clamp(Math.floor(x / TS), 2, MAP_W - 3), clamp(Math.floor(y / TS), 2, MAP_H - 3));
    o.body.reset(x, y); Object.assign(o, { summoned: true, aggro: true, aggroT: 99, owner });
    return o;
  }
  xbIntro(e) {                                                          // warpIn: the title card and the camera held on it
    this.boss = e; BUS.emit('boss', ...e.def.title); BUS.emit('flash', 0.35); this.shake(500, 0.012); Sfx.roar();
    this.camFocus = { x: e.x, y: e.y - 20, until: this.time.now + 2400 };
  }
  xbBreak(e, now, call, gibs, col, meat) {                              // a phase break: it staggers, sheds parts and roars
    const b = e.body, cx = b.center.x, cy = b.center.y;
    e.ai = 'stagger'; e.aiUntil = now + 1100; e.atkN = 0; this.xbCancel(e);
    for (let i = 0; i < 9; i++) this.spawnGib(pick(gibs), cx + rand(-14, 14), cy + rand(-12, 8), rand(-260, 260), rand(-420, -160), meat ? undefined : 'metal');
    BUS.emit('callout', call); BUS.emit('flash', 0.25); this.shake(450, 0.012); this.impactFrame(2); this.slowmoUntil = Math.max(this.slowmoUntil, now + 350);
    Sfx.roar(); Sfx.wreckHit(); this.boomFx(cx + rand(-10, 10), cy + rand(-8, 8), 0.6); this.spawnLight(cx, cy, 'ring', col, 0.4, 3, 0.9, 0.35);
  }
  xbCancel(e) { const X = this.xb; if (X) X.pools = X.pools.filter(P => P.src !== e || !(P.tell > 0)); }   // a warning that hadn't gone live is called off
  xbSpent(e) {                                                          // a fallen boss's hazards fizzle out harmlessly
    const X = this.xb; if (!X) return;
    this.xbCancel(e);
    for (const H of [...X.waves, ...X.pools, ...X.blades, ...X.orbs]) if (H.src === e) { H.dead = true; H.t = Math.min(H.t, 0.45); }
  }
  xbDeath(e, cx, cy, call, bit, style) {                                // the fall: slow-mo, rolling blasts, and whatever it summoned goes with it
    const now = this.time.now;
    if (this.boss === e) this.boss = null;
    this.slowmoUntil = now + 1500; this.zoomPunch = 0.15; BUS.emit('flash', 0.5); BUS.emit('callout', call); this.impactFrame(4); this.shake(1500, 0.012);
    this.camFocus = { x: cx, y: cy, until: now + 2200 };
    for (let i = 0; i < 9; i++) this.time.delayedCall(i * 120, () => this.boomFx(cx + rand(-24, 24), cy + rand(-20, 16), rand(0.6, 1.1), style));
    for (let i = 0; i < 5; i++) this.time.delayedCall(1000 + i * 120, () => this.boomFx(cx + rand(-30, 30), cy + rand(-24, 20), rand(0.8, 1.3), style));
    for (const o of this.enemies.getChildren()) if (o.alive && o.owner === e) this.time.delayedCall(rand(100, 700), () => {
      if (!o.alive) return;
      if (o.kind === 'gnat') o.panicDie = rand(0.1, 1.2);
      else if (o.kind === 'tick') { o.hp = 0; this.killEnemy(o, 0, -1, 'tickboom'); }   // its ticks fizzle rather than blow up in your face
      else this.damageEnemy(o, 999, 0, -1, 'crush');
    });
    this.xbSpent(e); this.dropOrbs(cx, cy, 4);
    if ((this.ms.xboss = (this.ms.xboss | 0) | bit) === 31) this.award('management');   // all five in one run
    if (this.mode.smelterCard && this.mode.waves && this.wave >= this.mode.waves - 1 && this.enemiesLeft <= 1) this.time.delayedCall(700, () => BUS.emit('wavecard', 'VICTORY', e.def.title[0] + ' FALLS'));
  }
  updateXb(dt, now) {                                                   // the bosses' floor hazards: move them, draw them, hurt what's on them
    const X = this.xb, pb = this.player.body, alive = this.state === 'play', g = X.g, ga = X.ga;
    g.clear(); ga.clear(); X.gt.clear();
    for (let i = X.waves.length - 1; i >= 0; i--) {                     // slag waves run along the floor: jump them
      const w = X.waves[i]; w.t -= dt; w.x += w.dir * w.spd * dt;
      if (w.t <= 0 || !this.standAt(w.x + w.dir * 6, w.y + 2) || this.solidAt(w.x + w.dir * 6, w.y - 6)) {
        this.fx.emit(w.x, w.y - 3, { n: 10, angle: -Math.PI / 2, spread: 1.2, speed: [40, 140], life: [0.3, 0.6], size: [3, 1], cols: [0xffe080, 0xffa030, 0xff5a1a], add: true, g: 500, mode: 1 });
        X.waves.splice(i, 1); continue;
      }
      const h = w.dead ? w.h * w.t / 0.45 : w.h, x = Math.round(w.x);
      for (let k = -10; k <= 10; k++) {
        const f = 1 - (k / 10) * (k / 10), hh = Math.round(h * f * (k * w.dir >= 0 ? 1 : 0.7) * (0.85 + 0.15 * Math.sin(now / 50 + k))); if (hh <= 0) continue;
        g.fillStyle(0x7a1806, 1).fillRect(x + k, w.y - hh, 1, hh); g.fillStyle(0xf05a12, 1).fillRect(x + k, w.y - hh, 1, Math.max(1, hh - 2)); g.fillStyle(hh > h * 0.6 ? 0xffe68a : 0xffa030, 1).fillRect(x + k, w.y - hh, 1, 1);
      }
      ga.fillStyle(0xff6a20, 0.22).fillRect(x - 13, w.y - h - 5, 26, h + 5);
      if (Math.random() < 0.7) this.fx.emit(w.x + rand(-6, 6), w.y - h * 0.7, { n: 1, angle: -Math.PI / 2 - w.dir * 0.5, spread: 0.6, speed: [40, 120], life: [0.25, 0.5], size: [2, 1], cols: [0xffe080, 0xff8a20, 0xc03010], add: true, g: 500, mode: 1 });
      if (!w.hit && !w.dead && alive && Math.abs(pb.center.x - w.x) < 9 && pb.bottom > w.y - w.h - 2 && pb.bottom <= w.y + 4) { w.hit = true; this.hurtPlayer(w.dmg, w.x - w.dir * 10, { srcY: w.y, by: w.src.def.title[0] }); }
      if (!w.dead) for (const o of this.enemies.getChildren()) if (o.alive && !o.def.boss && !FLIERS.has(o.kind) && Math.abs(o.body.center.x - w.x) < 8 && Math.abs(o.body.bottom - w.y) < 8) this.ignite(o, 1.5);
    }
    for (let i = X.pools.length - 1; i >= 0; i--) {                     // floor strips: a warning first, then live
      const P = X.pools[i], x0 = Math.round(P.x - P.w / 2), x1 = Math.round(P.x + P.w / 2), y = P.y, k = P.kind;
      if (P.tell > 0) {
        P.tell -= dt;
        const on = Math.floor(now / 110) % 2;
        if (k === 'slag') {
          ga.fillStyle(0xff4010, on ? 0.35 : 0.15).fillRect(x0, y - 3, P.w, 3); ga.fillStyle(0xff6020, 0.9).fillRect(x0, y - 14, 1, 14).fillRect(x1 - 1, y - 14, 1, 14);
          for (let x = x0 + 4; x < x1 - 8; x += 12) ga.lineStyle(1, 0xff8a30, on ? 0.9 : 0.5).lineBetween(x, y - 10, x + 4, y - 6).lineBetween(x + 4, y - 6, x + 8, y - 10);
        } else if (k === 'live') {
          ga.fillStyle(0xffe040, Math.random() < 0.7 ? 0.5 : 0.2).fillRect(x0 + 1, y - 2, P.w - 2, 2);
          for (let x = x0 + 3; x < x1 - 3; x += 8) ga.fillStyle(0xffe040, on ? 0.8 : 0.4).fillRect(x, y - 6, 3, 1);
        } else if (k === 'safe') {
          ga.fillStyle(0x5cff7a, 0.3 + 0.15 * Math.sin(now / 80)).fillRect(x0 + 2, y - 2, P.w - 4, 2);
          ga.fillStyle(0x5cff7a, 0.95).fillRect(x0 + 1, y - 10, 1, 8).fillRect(x0 + 1, y - 10, 4, 1).fillRect(x1 - 2, y - 10, 1, 8).fillRect(x1 - 5, y - 10, 4, 1);
        }
        if (P.tell <= 0 && k === 'slag' && !P.dead) { Sfx.sizzle(); this.paintScorch(P.x, y + 2, 10); }
        continue;
      }
      P.t -= dt; if (P.t <= 0) { X.pools.splice(i, 1); continue; }
      P.fill = Math.min(1, P.fill + dt / 0.35);
      const a = Math.min(1, P.t / 0.45), wf = P.w * P.fill;
      const cl = P.ox <= x0 ? x0 : P.ox >= x1 ? x1 - wf : P.x - wf / 2, cr = cl + wf;   // a flood spreads out from where it pours in
      if (k === 'slag') {
        g.fillStyle(0x3a0a04, a).fillRect(cl, y - 5, wf, 5); g.fillStyle(0xc0340a, a).fillRect(cl, y - 4, wf, 3); g.fillStyle(0xf06a14, a).fillRect(cl + 1, y - 4, Math.max(0, wf - 2), 1);
        for (let x = Math.ceil(cl); x < cr; x += 3) if ((x * 7 + Math.floor(now / 90)) % 11 < 2) g.fillStyle(0xffe68a, a).fillRect(x, y - 5, 2, 1);
        ga.fillStyle(0xff6020, 0.28 * a).fillRect(cl, y - 11, wf, 11);
        if (Math.random() < 0.9) this.fx.emit(rand(cl, cr), y - 3, { n: 1, angle: -Math.PI / 2, spread: 0.5, speed: [20, 60], life: [0.2, 0.5], size: [4, 1], cols: [0xffffff, 0xffe46a, 0xff8a1f, 0xc03010], add: true, g: -40 });
      } else if (k === 'rut') {
        g.fillStyle(0x140a06, 0.9 * a).fillRect(x0, y - 1, P.w, 2); ga.fillStyle(0xff8a30, 0.55 * a).fillRect(x0 + 2, y - 1, P.w - 4, 1);
        if (Math.random() < 0.25 * a) this.fxSparks(rand(x0, x1), y - 1, 1, -Math.PI / 2, 1.2, [30, 110]);
      } else if (k === 'live') {
        ga.fillStyle(0x60c8ff, 0.18 * a).fillRect(x0, y - 12, P.w, 12); ga.fillStyle(0x60c8ff, 0.5 * a).fillRect(x0, y - 4, P.w, 4); ga.fillStyle(0xe8f8ff, 0.85 * a).fillRect(x0, y - 1, P.w, 1);
        for (let n = 0; n < Math.ceil(P.w / 22); n++) { const xa = rand(x0, x1 - 6); this.zap(ga, xa, y - 1, Math.min(x1, xa + rand(8, 20)), y - rand(3, 14)); }
      } else if (k === 'safe') ga.fillStyle(0x5cff7a, 0.18 * a).fillRect(x0 + 2, y - 2, P.w - 4, 2);
      if (P.dead || !P.dmg || (P.tick -= dt) > 0) continue;
      P.tick = P.gap;
      if (alive && pb.center.x > cl - 4 && pb.center.x < cr + 4 && Math.abs(pb.bottom - y) < 6) this.hurtPlayer(P.dmg, P.x, { burn: true, knock: false, iframes: false, srcY: y + 6, by: P.src.def.title[0] });
      for (const o of this.enemies.getChildren()) if (o.alive && !o.def.boss && o.owner !== P.src && Math.abs(o.body.bottom - y) < 6 && o.body.center.x > cl && o.body.center.x < cr) { if (k === 'slag') this.ignite(o, 1.5); else if (k === 'live') this.damageEnemy(o, 10, 0, -1, 'arc'); }
    }
    for (let i = X.blades.length - 1; i >= 0; i--) {                    // saw blades bounce about until they wear out
      const B = X.blades[i]; B.t -= dt;
      if (B.t <= 0) { B.img.destroy(); this.fxSparks(B.x, B.y, 6); X.blades.splice(i, 1); continue; }
      B.vy = Math.min(B.vy + this.physics.world.gravity.y * 0.7 * dt, 520);
      let nx = B.x + B.vx * dt, ny = B.y + B.vy * dt;
      if (this.solidAt(nx + Math.sign(B.vx) * B.r, ny)) { B.vx = -B.vx * 0.85; nx = B.x; this.fxSparks(B.x + Math.sign(-B.vx) * B.r, B.y, 4); Sfx.tink(0.4); }
      if (B.vy > 0 && this.standAt(nx, ny + B.r)) {
        ny = Math.floor((ny + B.r) / TS) * TS - B.r;
        if (B.vy > 90) {
          if (B.split && !B.dead) { B.split = false; for (const s of [-1, 1]) this.xbBlade(B.src, nx, ny - 2, B.vx * 0.5 + s * 110, -240, true, false); B.t = 0; this.fxSparks(nx, ny + B.r, 8, -Math.PI / 2, 1.4); Sfx.clang(0.5); }
          else { this.fxSparks(nx, ny + B.r, 3, -Math.PI / 2, 1.2, [40, 140]); Sfx.tink(0.3); }
        }
        B.vy = B.vy > 90 ? -B.vy * 0.6 : 0; B.vx *= 0.995;
      } else if (B.vy < 0 && this.solidAt(nx, ny - B.r)) { B.vy = -B.vy * 0.4; ny = B.y; }
      B.x = nx; B.y = ny; B.img.setPosition(nx, ny).setRotation(B.img.rotation + B.vx * dt * 0.15).setAlpha(Math.min(1, B.t / 0.3));
      if (!B.dead && alive && now > B.hitT && Math.abs(pb.center.x - B.x) < pb.halfWidth + B.r && Math.abs(pb.center.y - B.y) < pb.halfHeight + B.r) {
        B.hitT = now + 800; if (this.hurtPlayer(B.dmg, B.x, { srcY: B.y, by: 'A SAW BLADE' })) { this.fxBlood(pb.center.x, pb.center.y, 8, Math.atan2(B.vy, B.vx), 1.2); Sfx.squish(); }
      }
    }
    for (let i = X.orbs.length - 1; i >= 0; i--) {                      // ball lightning drifts after you; a bullet pops it
      const O = X.orbs[i]; O.t -= dt;
      let pop = O.t <= 0, hit = false;
      if (!pop) for (const bl of this.bulletList) if (bl.active && Math.abs(bl.x - O.x) < 7 && Math.abs(bl.y - O.y) < 7) { bl.disableBody(true, true); pop = true; this.addStyle(15); break; }
      if (!pop) {
        const ax = pb.center.x - O.x, ay = pb.center.y - O.y, d = Math.hypot(ax, ay) || 1;
        let sx = 0, sy = 0; for (const Q of X.orbs) if (Q !== O) { const qx = O.x - Q.x, qy = O.y - Q.y, q = Math.hypot(qx, qy); if (q < 24 && q > 0) { sx += qx / q; sy += qy / q; } }
        O.vx += ((ax / d + sx * 0.8) * O.spd - O.vx) * Math.min(1, dt * 1.3); O.vy += ((ay / d + sy * 0.8) * O.spd - O.vy) * Math.min(1, dt * 1.3);
        O.x += O.vx * dt + Math.sin(now / 200 + O.ph) * 0.5; O.y += O.vy * dt + Math.cos(now / 170 + O.ph) * 0.5;
        if (!O.dead && alive && d < 9) { pop = true; hit = true; }
      }
      if (pop) {
        X.orbs.splice(i, 1); this.spawnLight(O.x, O.y, 'ring', 0x80d8ff, 0.2, 1.4, 0.9, 0.2); this.fx.emit(O.x, O.y, { n: 12, speed: [40, 160], life: [0.2, 0.4], size: [2, 1], cols: [0xffffff, 0xc8f0ff, 0x60c8ff], add: true }); Sfx.jellyZap();
        if (hit) this.hurtPlayer(O.dmg, O.x, { srcY: O.y, by: 'BALL LIGHTNING' });
        continue;
      }
      const fl = 0.8 + 0.2 * Math.sin(now / 40 + O.ph), a = Math.min(1, O.t / 0.4);
      ga.fillStyle(0x4ab8ff, 0.18 * a).fillCircle(O.x, O.y, 9 * fl); ga.fillStyle(0x9adcff, 0.5 * a).fillCircle(O.x, O.y, 5); ga.fillStyle(0xffffff, 0.95 * a).fillCircle(O.x, O.y, 2.5);
      if (Math.random() < 0.5) { const t = rand(0, Math.PI * 2); this.zap(ga, O.x, O.y, O.x + Math.cos(t) * 9, O.y + Math.sin(t) * 9); }
    }
  }
  cruciblePour(e, ph, sx, sy) {                                          // the wave: it lands under the spout and runs off along the floor
    const T = TUNE.CRUCIBLE, fy = this.floorBelow(sx, e.body.bottom + 2, 320);
    e.pourY = fy; if (fy === null) return;
    for (const dir of ph >= 2 ? [-1, 1] : [e.pourDir]) this.xb.waves.push({ src: e, x: sx + dir * 8, y: fy, dir, spd: T.wave.speed * (ph === 3 ? 1.15 : 1), h: T.wave.h, dmg: T.wave.dmg, t: 4, hit: false });
    Sfx.erupt(); Sfx.sizzle(); this.shake(220, 0.008); this.paintScorch(sx, fy + 2, 10);
    this.fx.emit(sx, fy - 2, { n: 20, angle: -Math.PI / 2, spread: 1.3, speed: [60, 200], life: [0.3, 0.7], size: [3, 1], cols: [0xffffff, 0xffe080, 0xffa030, 0xff5a1a], add: true, g: 500, mode: 1 });
    this.spawnLight(sx, fy - 4, 'glow', 0xff7020, 2, 3, 0.9, 0.4);
  }
  crucibleBombs(e, n, rain) {                                            // molten shells lobbed round you, each with a mark where it lands
    const pb = this.player.body, G = this.physics.world.gravity.y, T = rain ? 1.1 : 0.95, x0 = e.body.center.x, y0 = e.body.top + 4;
    for (let i = 0; i < n; i++) {
      const s = this.slags.getFirstDead(false); if (!s) break;
      const tx = clamp(pb.center.x + (rain ? rand(-120, 120) : (i - (n - 1) / 2) * 46 + rand(-10, 10)), 40, LW - 40);
      let ty = pb.bottom; for (let yy = pb.bottom - 4; yy < pb.bottom + 160; yy += 4) if (this.standAt(tx, yy)) { ty = Math.floor(yy / TS) * TS; break; }
      s.enableBody(true, x0, y0, true, true); s.body.setAllowGravity(true); s.body.setSize(5, 5, true);
      s.setVelocity((tx - x0) / T, (ty - 4 - y0 - 0.5 * G * T * T) / T); Object.assign(s, { px: x0, py: y0, rain }); s.glow.setVisible(true);
      this.spawnLight(tx, ty - 2, 'ring', 0xff4020, 1.2, 0.5, 0.9, T); this.spawnLight(tx, ty - 2, 'glow', 0xff3010, 1.4, 1, 0.6, T);
    }
    if (rain) { if (Math.random() < 0.4) Sfx.whistle(); } else { Sfx.mortar(); this.shake(120, 0.004); }
    this.fxSmoke(x0, y0, rain ? 2 : 5);
  }
  crucibleFlood(e, side, tell) {                                         // marks the floor on your side of it; the slag comes when the warning runs out
    const T = TUNE.CRUCIBLE, b = e.body, fy = this.floorBelow(b.center.x + side * 30, b.bottom, 320);
    e.floodDir = side; Sfx.magTell();
    const ok = x => this.standAt(x, fy + 1) && !this.solidAt(x, fy - 2), x0 = b.center.x + side * 30;
    if (fy === null || !ok(x0)) return;
    let near = x0, far = x0;                                            // the floor under it, out to 230 px on your side
    while (ok(near - side * 2) && Math.abs(near - x0) < 40) near -= side * 2;
    while (ok(far + side * 2) && Math.abs(far - x0) < T.floodW - 40) far += side * 2;
    const l = Math.min(near, far), r = Math.max(near, far);
    this.xb.pools.push({ src: e, kind: 'slag', x: (l + r) / 2, w: r - l, y: fy, ox: near, tell, t: T.flood * (e.phase === 3 ? 1.15 : 1), gap: 0.35, tick: 0, dmg: T.floodDmg, fill: 0 });
  }
  grinderGrind(e) {                                                      // what's in front of the teeth: crates, props, drums and foes
    const b = e.body, fx = b.center.x + e.rollDir * (b.halfWidth + 4), fy = b.center.y + 6;
    this.blastTiles(fx, fy, 14, 40);
    if (this.props) this.hitPropsAt(fx, fy, e.rollDir, 0, 30, 'grind' + Math.floor(this.time.now / 400));
    for (const k of this.barrelList) if (k.active && Math.abs(k.x - fx) < 12 && Math.abs(k.y - fy) < 20) { k.body.velocity.x = e.rollDir * 420; k.body.velocity.y = -160; k.kicked = true; }   // drums get bowled ahead of it
    for (const o of this.enemies.getChildren()) if (o.alive && o !== e && !o.def.boss && Math.abs(o.body.center.x - fx) < o.body.halfWidth + 8 && Math.abs(o.body.center.y - b.center.y) < o.body.halfHeight + 14) this.damageEnemy(o, 30, e.rollDir, -0.5, 'saw');
  }
  grinderBounce(e, wx) {                                                 // off a wall: a clang, a shower of sparks, and back the other way
    const b = e.body; e.rollDir = -e.rollDir; b.velocity.x = e.rollDir * 90; if (b.blocked.down) b.velocity.y = -120;
    this.fxSparks(wx, b.center.y, 14, e.rollDir > 0 ? 0 : Math.PI, 1.4, [80, 260]); this.shake(220, 0.01); Sfx.clang(1); Sfx.wreckHit(); this.zoomPunch = Math.max(this.zoomPunch, 0.03);
  }
  grinderSlam(e) {                                                       // the drop lands: a slam and shockwaves each way along the floor
    const b = e.body, y = b.bottom, pb = this.player.body;
    this.shake(420, 0.014); Sfx.stomp(); Sfx.explosion(0.7); this.zoomPunch = Math.max(this.zoomPunch, 0.06); this.fxDust(b.center.x, y, 18);
    this.fxSparks(b.center.x, y - 2, 16, -Math.PI / 2, 1.6, [80, 260]); this.blastTiles(b.center.x, y + 4, 40, 60);
    for (const dir of [-1, 1]) this.shockwaves.push({ x: b.center.x + dir * (b.halfWidth + 2), y, dir, t: 1.6, hit: false });
    if (this.state === 'play' && Math.abs(pb.center.x - b.center.x) < b.halfWidth + 12 && Math.abs(pb.bottom - y) < 30) this.hurtPlayer(TUNE.GRINDER.slam, b.center.x);
  }
  grinderBlades(e, ph) {                                                 // a fan of blades off the ring; from phase two they split when they land
    const T = TUNE.GRINDER, b = e.body, n = T.blades[ph - 1], d = e.dir;
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + d * (0.45 + i * 0.7 / Math.max(1, n - 1)), sp = T.bladeSpeed * rand(0.9, 1.1); this.xbBlade(e, b.center.x + d * 10, b.top + 6, Math.cos(a) * sp, Math.sin(a) * sp, false, ph >= 2); }
    Sfx.sawLaunch(); this.shake(140, 0.006); this.fxSparks(b.center.x, b.top + 4, 10, -Math.PI / 2, 1.4, [80, 240]);
  }
  xbBlade(src, x, y, vx, vy, small, split) {
    this.xb.blades.push({ src, x, y, vx, vy, r: small ? 3 : 5, t: small ? 2.2 : 3, split, hitT: 0, dmg: small ? 9 : TUNE.GRINDER.bladeDmg, img: this.add.image(x, y, small ? 'xbladeS' : 'xblade').setDepth(6) });
  }
  queenEggs(e, n) {                                                      // egg sacs out of her abdomen: they hatch unless you shoot them
    const b = e.body;
    for (let i = 0; i < n; i++) {
      const o = this.xbAdd('eggsac', b.center.x - e.dir * 12 + (i - (n - 1) / 2) * 14, b.center.y + 10, e);
      o.body.setVelocity(rand(-50, 50) + b.velocity.x * 0.3, rand(-40, 20)); o.hatchT = TUNE.QUEEN.hatch * (e.phase === 3 ? 0.8 : 1);
    }
    Sfx.squelch(); this.fx.emit(b.center.x - e.dir * 12, b.center.y + 8, { n: 10, speed: [20, 80], life: [0.3, 0.6], size: [2, 1], cols: [0xffd040, 0xc87a26, 0x7a3814], g: 300, mode: 1 });
  }
  queenSpit(e) {                                                         // a fan of acid globs lobbed at you; each leaves a pool
    const pb = this.player.body, G = this.physics.world.gravity.y, Tf = 0.8, x0 = e.body.center.x + e.dir * 18, y0 = e.body.center.y + 2, n = TUNE.QUEEN.globs;
    for (let i = 0; i < n; i++) { const tx = pb.center.x + (i - (n - 1) / 2) * 26, ty = pb.bottom - 4; this.spawnEProj('acid', x0, y0, (tx - x0) / Tf, (ty - y0 - 0.5 * G * Tf * Tf) / Tf); }
    Sfx.spit(); this.fx.emit(x0, y0, { n: 10, speed: [30, 120], life: [0.2, 0.4], size: [2, 1], cols: [0xe0ff90, 0x9aff4a], add: true });
  }
  queenEscort(e) {                                                       // the frenzy's escort: gnats round her, topped back up to six
    const T = TUNE.QUEEN, have = this.xbOwn(e, 'gnat'), b = e.body;
    for (let i = have; i < T.escort; i++) { const a = i / T.escort * Math.PI * 2, o = this.xbAdd('gnat', b.center.x + Math.cos(a) * 18, b.center.y + Math.sin(a) * 12, e); o.body.setVelocity(Math.cos(a) * 80, Math.sin(a) * 80); }
    if (have < T.escort) { Sfx.buzz(); this.fx.emit(b.center.x, b.center.y, { n: 12, speed: [30, 100], life: [0.3, 0.6], size: [2, 1], cols: [0xffd040, 0x843830], g: 100 }); }
  }
  eggHatch(e) {                                                          // out comes the brood: no kill, no reward, just gnats (and a tick once she's hurt)
    const b = e.body, x = b.center.x, y = b.center.y, q = e.owner && e.owner.alive ? e.owner : null;
    e.alive = false; e.deadAt = this.time.now; e.disableBody(true, true);
    if (this.locks.length) this.locks = this.locks.filter(o => o !== e);
    for (const L of this.limpets) if (L.e === e) { L.e = null; L.vx = rand(-60, 60); L.vy = -120; L.stuck = false; }
    if (this.tb && this.tb.o === e) this.tb = null;
    if (!e.summoned && this.lab) this.labKill();
    for (let i = 0; i < 3; i++) { const o = this.xbAdd('gnat', x + rand(-4, 4), y - 4, q); o.body.setVelocity(rand(-90, 90), rand(-120, -40)); }
    if (q && q.phase >= 2) { const t = this.xbAdd('tick', x, y - 2, q); t.body.setVelocity(rand(-120, 120), -200); }
    this.fx.emit(x, y, { n: 18, speed: [40, 160], life: [0.3, 0.6], size: [2, 1], cols: [0xfff0a0, 0xffd040, 0xc87a26, 0x4e200e], g: 500, mode: 1 });
    for (let i = 0; i < 3; i++) this.spawnGib('g_egg', x, y, rand(-120, 120), rand(-220, -100));
    Sfx.squelch(); Sfx.chirp();
  }
  overseerNodes(e) {                                                     // its four shield nodes, made on its first frame so OVERTIME's HP scaling reaches them
    const k = e.def.hp / ENEMY.overseer.hp; e.nodes = [];
    for (let i = 0; i < 4; i++) {
      const n = this.xbAdd('eyenode', e.x, e.y, e); n.idx = i;
      if (k !== 1) { n.def = Object.assign({}, n.def, { hp: n.def.hp * k }); n.hp = n.def.hp; }
      e.nodes.push(n);
    }
    this.overseerPlace(e); this.spawnLight(e.x, e.y, 'ring', 0x46e6ff, 0.3, 2.4, 0.9, 0.4); Sfx.shieldHit();
  }
  overseerPlace(e) { const b = e.body; e.nodes.forEach((n, i) => { if (n.alive) { const a = e.spin + i * Math.PI / 2; n.body.reset(b.center.x + Math.cos(a) * TUNE.OVERSEER.orbit, b.center.y - 2 + Math.sin(a) * TUNE.OVERSEER.orbit * 0.8); } }); }
  overseerRay(e, th) {                                                   // the eye along angle th (0 straight down): to the first wall
    const b = e.body, ox = b.center.x, oy = b.center.y - 2, ux = Math.sin(th), uy = Math.cos(th);
    let x = ox, y = oy; for (let d = 6; d < 560; d += 3) { const qx = ox + ux * d, qy = oy + uy * d; if (this.solidAt(qx, qy)) break; x = qx; y = qy; }
    return { x0: ox + ux * 8, y0: oy + uy * 8, x1: x, y1: y, ux, uy };
  }
  overseerBeam(e, th, dt) {                                              // the death laser: 16 to you, and it burns its line across the floor
    const R = e.beam = this.overseerRay(e, th), pb = this.player.body;
    if (this.state === 'play') {
      const t = clamp((pb.center.x - R.x0) * R.ux + (pb.center.y - R.y0) * R.uy, 0, Math.hypot(R.x1 - R.x0, R.y1 - R.y0)), px = R.x0 + R.ux * t, py = R.y0 + R.uy * t;
      if (Math.abs(pb.center.x - px) < pb.halfWidth + 2 && Math.abs(pb.center.y - py) < pb.halfHeight + 2) this.hurtPlayer(TUNE.OVERSEER.beamDmg, px, { srcY: py, by: 'THE OVERSEER' });
    }
    if (Math.random() < 0.7) this.fxSparks(R.x1, R.y1, 2, Math.atan2(-R.uy, -R.ux), 1.2, [40, 160]);
    if ((e.scorchT = (e.scorchT || 0) - dt) <= 0) {
      e.scorchT = 0.06; this.paintScorch(R.x1, R.y1, 3);
      for (const o of this.enemies.getChildren()) if (o.alive && o !== e && o.owner !== e && !o.def.boss && Math.abs(o.body.center.x - R.x1) < o.body.halfWidth + 3 && Math.abs(o.body.center.y - R.y1) < o.body.halfHeight + 3) this.damageEnemy(o, 4, R.ux, R.uy, 'arc');
    }
    if (Math.random() < 0.12) Sfx.shockBeam();
  }
  overseerGridSet(e) {                                                   // a curtain of laser columns round you with two gaps to stand in
    const T = TUNE.OVERSEER, pb = this.player.body, w = T.slot, n = 13, me = 6, c0 = Math.round(pb.center.x / w) * w - me * w - w / 2, top = e.body.center.y;
    const s1 = clamp(me + pick([-2, -1, 1, 2]), 0, n - 1); let s2 = randi(0, n - 1); for (let k = 0; k < 20 && Math.abs(s2 - s1) < 3; k++) s2 = randi(0, n - 1);
    const cols = [];
    for (let i = 0; i < n; i++) {
      const x0 = c0 + i * w, xc = x0 + w / 2; if (xc < 40 || xc > LW - 40) continue;
      let y1 = top; for (let yy = top; yy < LH; yy += 4) { if (this.solidAt(xc, yy)) break; y1 = yy; }
      cols.push({ x0, w, y0: top, y1: y1 + 3, safe: i === s1 || i === s2 });
    }
    e.grid.cols = cols; e.grid.live = false;
  }
  overseerGrid(e) {                                                      // live columns: 18 to anything standing in one
    const pb = this.player.body;
    if (this.state !== 'play') return;
    for (const C of e.grid.cols) if (!C.safe && pb.center.x > C.x0 && pb.center.x < C.x0 + C.w && pb.bottom > C.y0 && pb.top < C.y1) { this.hurtPlayer(TUNE.OVERSEER.gridDmg, C.x0 + C.w / 2, { srcY: pb.center.y, by: 'THE OVERSEER' }); break; }
  }
  overseerDrones(e) {
    const T = TUNE.OVERSEER, b = e.body, n = Math.min(T.drones, T.maxDrones - this.xbOwn(e, 'drone'));
    for (let i = 0; i < n; i++) { const x = b.center.x + (i ? 26 : -26), y = b.center.y + 8; this.xbAdd('drone', x, y, e); this.spawnLight(x, y, 'ring', 0x46e6ff, 0.3, 1.4, 0.9, 0.3); }
    BUS.emit('callout', 'DRONES'); Sfx.warp();
  }
  conductorSpot(e) {                                                     // somewhere to blink to: in the air off to one side of you, clear of walls
    const pb = this.player.body, fy = this.xbFloor(), side = Math.sign(e.body.center.x - pb.center.x) || 1;
    for (let k = 0; k < 8; k++) {
      const [x, y] = this.xbClear(clamp(pb.center.x + (k < 4 ? -side : side) * rand(110, 220), 72, LW - 72), clamp(fy - TUNE.CONDUCTOR.alt + rand(-16, 16), 56, LH - 96), this.xbReach(e));
      if (Math.abs(x - e.body.center.x) > 60 && !this.solidAt(x, y) && !this.solidAt(x, y - 18) && !this.solidAt(x, y + 18)) return { x, y };
    }
    return null;
  }
  conductorBlink(e) {                                                    // gone in a flash, there in another
    const b = e.body, { x, y } = e.to, pb = this.player.body;
    this.spawnLight(b.center.x, b.center.y, 'ring', 0x80d8ff, 0.3, 2.2, 0.9, 0.3); this.spawnLight(b.center.x, b.center.y, 'conductor_w', 0x80d8ff, 1, 1.4, 0.8, 0.25, e.fr, e.flipX);
    this.fx.emit(b.center.x, b.center.y, { n: 20, speed: [40, 180], life: [0.2, 0.5], size: [2, 1], cols: [0xffffff, 0xc8f0ff, 0x60c8ff], add: true });
    this.pylonZaps.push({ x0: b.center.x, y0: b.center.y, x1: x, y1: y, t: this.time.now });
    b.reset(x, y); e.hx = x; e.hy = y; e.ai = 'hover'; e.cd = 0.45; e.to = null;
    this.spawnLight(x, y, 'ring', 0xffffff, 0.2, 2.4, 1, 0.3); this.spawnLight(x, y, 'glow', 0x60c8ff, 2, 3, 0.9, 0.3); Sfx.blink(); Sfx.zap(); this.shake(160, 0.006);
    if (this.state === 'play' && Math.hypot(pb.center.x - x, pb.center.y - y) < 28) this.hurtPlayer(TUNE.CONDUCTOR.blinkDmg, x, { srcY: y });
  }
  conductorTip(e) { const b = e.body, c = e.ai === 'cast'; return [b.center.x + e.dir * (c ? 16 : 19), b.center.y + (c ? -24 : -4)]; }   // the baton's live end
  conductorChain(e, tx, ty, fork) {                                      // the bolt: to where it locked, then hops to drums and to you
    const T = TUNE.CONDUCTOR, [sx, sy] = this.conductorTip(e), now = this.time.now, pb = this.player.body;
    const hit = this.sweep(sx, sy, tx, ty), x1 = hit ? hit.x : tx, y1 = hit ? hit.y : ty;
    this.pylonZaps.push({ x0: sx, y0: sy, x1, y1, t: now }); this.electrifyLine(sx, sy, x1, y1, 28);
    Sfx.thunder(); Sfx.pylonZap(); BUS.emit('flash', fork ? 0.04 : 0.08); this.spawnLight(x1, y1, 'glow', 0x80c8ff, 1.4, 0.4, 0.9, 0.2); this.fxSparks(x1, y1, 10); this.paintScorch(x1, y1, 4);
    const onP = (x, y, r) => this.state === 'play' && Math.abs(pb.center.x - x) < pb.halfWidth + r && Math.abs(pb.center.y - y) < pb.halfHeight + r;
    let you = false, hx = x1, hy = y1;
    if (onP(x1, y1, 6)) { you = true; this.hurtPlayer(T.chainDmg, x1, { srcY: y1, by: 'THE CONDUCTOR' }); }
    for (let k = 0; k < 2; k++) {                                        // two hops: the nearest drum, or you if it missed
      let to = null, bd = T.chainHop;
      for (const kk of this.barrelList) { const d = kk.active && !kk.zapped ? Math.hypot(kk.x - hx, kk.y - hy) : 1e9; if (d < bd) { bd = d; to = kk; } }
      const dp = Math.hypot(pb.center.x - hx, pb.center.y - hy); if (!you && this.state === 'play' && dp < bd) to = 'you';
      if (!to) break;
      const nx = to === 'you' ? pb.center.x : to.x, ny = to === 'you' ? pb.center.y : to.y - 4;
      this.pylonZaps.push({ x0: hx, y0: hy, x1: nx, y1: ny, t: now });
      if (to === 'you') { you = true; this.hurtPlayer(Math.round(T.chainDmg * 0.6), hx, { srcY: hy, by: 'THE CONDUCTOR' }); }
      else { to.zapped = true; this.igniteBarrel(to); this.time.delayedCall(400, () => { to.zapped = false; }); }
      hx = nx; hy = ny;
    }
  }
  conductorFloor(e, ph, tell) {                                          // your floor in 32 px strips: the safe ones show first, then the rest go live
    const T = TUNE.CONDUCTOR, pb = this.player.body, fy = this.xbFloor(), w = 32, n = 18, me = 9, x0 = Math.floor(pb.center.x / w) * w - me * w;
    const s1 = me + pick([-3, -2, 2, 3]); let s2 = randi(1, n - 3); for (let k = 0; k < 20 && Math.abs(s2 - s1) < 4; k++) s2 = randi(1, n - 3);
    const safe = i => ph === 1 ? i % 3 === 0 : i === s1 || i === s1 + 1 || i === s2 || i === s2 + 1;
    for (let i = 0; i < n;) {                                             // runs of the same kind become one strip each, cut to the floor they're on
      const on = !safe(i); let j = i; while (j < n && !safe(j) === on) j++;
      const xa = clamp(x0 + i * w, 32, LW - 32), xb = clamp(x0 + j * w, 32, LW - 32);
      for (let x = xa, s0 = null; x <= xb; x += 2) {                     // only where there's floor to stand on
        const ok = x < xb && this.standAt(x, fy + 1) && !this.solidAt(x, fy - 2);
        if (ok && s0 === null) s0 = x;
        else if (!ok && s0 !== null) { if (x - s0 >= 8) this.xb.pools.push({ src: e, kind: on ? 'live' : 'safe', x: (s0 + x) / 2, w: x - s0, y: fy, tell, t: T.floorLive, gap: 0.3, tick: 0, dmg: on ? T.floorDmg : 0, fill: 1, ox: (s0 + x) / 2 }); s0 = null; }
      }
      i = j;
    }
  }
  conductorOrbs(e, n) {
    const T = TUNE.CONDUCTOR, b = e.body;
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.8; this.xb.orbs.push({ src: e, x: b.center.x, y: b.center.y, vx: Math.cos(a) * 100, vy: Math.sin(a) * 100, t: T.orbLife, ph: rand(0, 6), spd: T.orbSpeed * (e.phase === 3 ? 1.25 : 1), dmg: T.orbDmg }); }
    Sfx.shockOrb(); this.spawnLight(b.center.x, b.center.y, 'ring', 0x80d8ff, 0.3, 2, 0.9, 0.3);
  }
  conductorArcs(e, dt, now) {                                            // overcharged: arcs crawl round it and bite anything close
    const T = TUNE.CONDUCTOR, b = e.body, pb = this.player.body;
    if ((e.arcT -= dt) > 0) return;
    e.arcT = 0.08; const a = rand(0, Math.PI * 2);
    this.pylonZaps.push({ x0: b.center.x, y0: b.center.y, x1: b.center.x + Math.cos(a) * T.arcR, y1: b.center.y + Math.sin(a) * T.arcR, t: now });
    if (this.state === 'play' && Math.hypot(pb.center.x - b.center.x, pb.center.y - b.center.y) < T.arcR + 4 && now > e.arcHitT) { e.arcHitT = now + 400; this.hurtPlayer(T.arcDmg, b.center.x, { srcY: b.center.y, knock: false }); }
  }
  labKill() {
    this.stats.kills++; this.enemiesLeft--;
    BUS.emit('enemies', this.activeHostiles());
    if (this.enemiesLeft === 0 && this.state === 'play') BUS.emit('callout', 'ROOM CLEAR');
  }
  rocketAim(e) {                                                       // aims at your feet, where they'll land, so near misses still splash
    return this.aimLead(e.x, e.y - 2, TUNE.ROCKETEER.rocketSpeed, { k: 0.7, maxT: 0.9, oy: this.player.body.halfHeight - 3 });
  }
  rocketeerShoot(e) {
    const T = TUNE.ROCKETEER, sx = e.x + (e.dir > 0 ? 0 : -1), sy = e.y - 2, a = e.aimA + rand(-2, 2) * DEG;
    const mx = sx + Math.cos(a) * 22, my = sy + Math.sin(a) * 22;
    e.recoil = 5; e.body.velocity.x -= Math.cos(a) * 60;
    Sfx.rocket(); this.spawnLight(mx, my, 'glow', 0xffa040, 1, 1.8, 0.9, 0.12);
    this.fxSmoke(sx - Math.cos(a) * 8, sy - Math.sin(a) * 8, 6); this.fxFire(mx, my, 4);
    if (this.solidAt(mx, my) || !this.los(sx, sy, mx, my)) return;
    this.spawnEProj('rocket', mx, my, Math.cos(a) * T.rocketSpeed, Math.sin(a) * T.rocketSpeed);
  }
  waspAlt(pb, x) {                                                     // highest clear flight lane 45-95 px over your head
    for (const off of [92, 80, 68, 56, 44]) {
      const y = pb.top - off; let clear = true;
      for (let xx = x - 150; xx <= x + 150 && clear; xx += 10) if (this.solidAt(xx, y - 7) || this.solidAt(xx, y + 7)) clear = false;
      if (clear) return y;
    }
    return pb.top - 36;
  }
  waspDrop(e) {
    const b = e.body;
    this.spawnEProj('bomb', e.x, b.bottom + 3, b.velocity.x * 0.6, 30);
    Sfx.whistle(); Sfx.clunk(0.6);
  }
  plantCharge(x, y, fuse) {
    const c = this.charges.getFirstDead(false); if (!c) return;
    c.enableBody(true, x, y, true, true);
    c.body.setSize(7, 5, true); c.body.setAllowGravity(true); c.body.setBounce(0.2, 0.2); c.body.setDrag(300, 0);
    c.setVelocity(0, 0);
    Object.assign(c, { fuse, max: fuse, kicked: false, prevV: 0, beepT: 0 });
    Sfx.clunk(0.8);
  }
  detonateCharge(c) { const x = c.x, y = c.y; c.disableBody(true, true); c.clearTint(); this.explode(x, y, TUNE.SAPPER.blast); }
  updateCharges(dt) {
    for (const c of this.chargeList) {
      if (!c.active) continue;
      const b = c.body, sp = Math.abs(b.velocity.x) + Math.abs(b.velocity.y);
      if (c.kicked && c.prevV > 150 && (b.blocked.left || b.blocked.right || b.blocked.up || b.blocked.down)) { this.detonateCharge(c); continue; }   // punted charges go off on impact
      c.prevV = sp;
      c.fuse -= dt; c.beepT -= dt;
      const k = c.fuse / c.max;
      if (c.beepT <= 0) { c.beepT = Math.max(0.07, 0.45 * k); Sfx.beep(); this.spawnLight(c.x, c.y - 2, 'glow', 0xff2010, 0.5, 0.9, 0.9, 0.08); }
      if (Math.floor(c.fuse * (k < 0.3 ? 20 : 6)) % 2) c.setTint(0xff8070); else c.clearTint();
      if (c.fuse <= 0) this.detonateCharge(c);
    }
  }
  jetShoot(e) {
    const T = TUNE.JET, a = e.aimA + rand(-4, 4) * DEG, mx = e.x + Math.cos(a) * 14, my = e.y + 1 + Math.sin(a) * 14;
    e.recoil = 2; Sfx.eshot(); this.spawnLight(mx, my, 'glow', 0xffe080, 0.6, 1, 0.9, 0.06);
    if (this.solidAt(mx, my) || !this.los(e.x, e.y, mx, my)) return;
    this.spawnEBullet(mx, my, a, T.bulletSpeed, T.damage, { life: 1.4 });
  }
  spawnHaywire(e, dx) {
    const h = this.haywires.getFirstDead(false); if (!h) return false;
    h.setTexture('jet', 'j0').enableBody(true, e.x, e.y, true, true);
    h.body.setSize(10, 14, true); h.body.setAllowGravity(true); h.body.setBounce(0.55, 0.55);
    h.setVelocity(e.body.velocity.x + dx * 120, e.body.velocity.y - 120); h.setTint(0xb0b0b0); h.setFlipX(e.dir < 0);
    Object.assign(h, { t: rand(1.1, 1.7), heading: -Math.PI / 2 + rand(-1.2, 1.2), turnT: 0, hitSet: new Set(), spin: rand(-12, 12), hitP: false });
    h.glow.setVisible(true);
    Sfx.sputter();
    return true;
  }
  updateHaywires(dt) {
    const pb = this.player.body;
    for (const h of this.haywireList) {
      if (!h.active) continue;
      h.t -= dt; h.turnT -= dt;
      if (h.turnT <= 0) { h.turnT = rand(0.08, 0.22); h.heading += rand(-1.6, 1.6); Sfx.sputter(); }
      const bv = h.body.velocity;
      bv.x = clamp(bv.x + Math.cos(h.heading) * 1100 * dt, -360, 360); bv.y = clamp(bv.y + Math.sin(h.heading) * 1100 * dt, -360, 360);
      h.rotation += h.spin * dt;
      const ex = h.x - Math.cos(h.heading) * 6, ey = h.y - Math.sin(h.heading) * 6;
      this.fx.emit(ex, ey, { n: 2, angle: h.heading + Math.PI, spread: 0.5, speed: [60, 160], life: [0.1, 0.25], size: [3, 1], cols: [0xffffff, 0xffe46a, 0xff8a1f, 0x9adcff], add: true });
      if (Math.random() < 0.4) this.fxSmoke(ex, ey, 1, 0.6);
      if (Math.random() < 0.25) this.fxSparks(h.x, h.y, 2);
      if (Math.random() < 0.3) this.fxBlood(h.x, h.y, 1);
      h.glow.setPosition(ex, ey).setScale(0.6 + Math.random() * 0.4);
      for (const o of this.enemies.getChildren()) {                       // smashes into its old squad
        if (!o.alive || h.hitSet.has(o) || o.def.anchored) continue;
        const ob = o.body;
        if (h.x > ob.left - 4 && h.x < ob.right + 4 && h.y > ob.top - 4 && h.y < ob.bottom + 4) { h.hitSet.add(o); this.damageEnemy(o, 20, Math.sign(bv.x) || 1, -0.5, 'kick'); Sfx.kickHit(); }
      }
      if (!h.hitP && this.state !== 'dead' && h.x > pb.left - 3 && h.x < pb.right + 3 && h.y > pb.top - 3 && h.y < pb.bottom + 3) { h.hitP = true; this.hurtPlayer(10, h.x); }
      if (h.t <= 0) this.haywireBoom(h);
    }
  }
  haywireBoom(h) {
    const x = h.x, y = h.y, D = ENEMY.jet; h.disableBody(true, true); h.glow.setVisible(false); h.clearTint();
    for (let i = 0; i < 12; i++) this.spawnGib(i < D.gibs.length ? D.gibs[i] : pick(D.gibs), x + rand(-4, 4), y + rand(-4, 4), rand(-220, 220), rand(-320, -100));
    this.fxBlood(x, y, 26, -Math.PI / 2, Math.PI * 2, [60, 280]);
    this.explode(x, y, TUNE.JET.boom);
  }
  broodBirth(x, y, dir, n, mother) {
    for (let i = 0; i < n; i++) {
      const t = this.spawnEnemy('tick', clamp(Math.floor(x / TS), 2, MAP_W - 3), clamp(Math.floor(y / TS), 2, MAP_H - 3));
      t.body.reset(x + dir * 8 + rand(-5, 5), y); t.body.setVelocity(dir * rand(60, 200) + rand(-60, 60), rand(-300, -200));
      t.summoned = true; t.aggro = true; t.mother = mother;
    }
    this.fxBlood(x + dir * 10, y, 18, -Math.PI / 2, 1.6, [60, 220]); this.fxMist(x, y, 6); Sfx.gib(0.6); Sfx.squish();
    this.paintSplatAround(x, y + 10, 6);
  }
  screamerBoom(e) { const x = e.x, y = e.y; e.hp = 0; this.killEnemy(e, 0, 0, 'tickboom'); this.explode(x, y, TUNE.SCREAMER.boom); }
  juggShoot(e) {
    const T = TUNE.JUGG, a = e.aimA + rand(-5, 5) * DEG, sx = e.x + e.dir * 2, sy = e.y - 1, mx = sx + Math.cos(a) * 28, my = sy + Math.sin(a) * 28;
    e.recoil = 2; Sfx.eshot(); this.spawnLight(mx, my, 'glow', 0xffd080, 0.8, 1.2, 0.9, 0.05);
    if (Math.random() < 0.5) this.spawnGib('g_casing', sx, sy, -e.dir * rand(40, 100), rand(-200, -120), 'shell');
    this.shake(30, 0.0015);
    if (this.solidAt(mx, my) || !this.los(sx, sy, mx, my)) return;
    this.spawnEBullet(mx, my, a, T.bulletSpeed, T.damage, { life: 1.4 });
  }
  juggCrack(e) {
    const b = e.body;
    for (let i = 0; i < 4; i++) this.spawnGib(pick(['g_jplate', 'g_plateL', 'g_shard']), b.center.x + rand(-8, 8), b.top + rand(4, 14), rand(-220, 220), rand(-320, -160), 'metal');
    this.fxSparks(b.center.x, b.center.y - 4, 16, -Math.PI / 2, 2.6, [80, 260]); this.fxBlood(b.center.x, b.center.y, 8);
    this.shake(200, 0.008); Sfx.clang(); Sfx.splatWall();
    BUS.emit('callout', e.stage === 2 ? 'ARMOR STRIPPED' : 'ARMOR CRACKED'); this.addStyle(60);
    if (e.ai === 'fire') { e.ai = 'walk'; e.atkCd = 0.8; }
  }

  // ------------------------------------------------------------ rampage & modifiers ----
  startRampage() {
    this.rampageUntil = this.time.now + TUNE.RAMPAGE.time; if (++this.ms.rampages >= 3) this.award('rampager');
    BUS.emit('callout', 'RAMPAGE!'); BUS.emit('flash', 0.35); Sfx.rampage();
    this.zoomPunch = Math.max(this.zoomPunch, 0.08); this.shake(300, 0.008);
  }
  modOn(m) { return this.mod === m || this.mutator === m; }             // a scripted hazard, or MOON BOOTS / LIGHTS OUT for the whole run
  applyMod(m, restoreLead = 0) {                                        // wave modifiers: chaos with rules (restoreLead: ms before GRAVITY RESTORED)
    if (this.campaign && this.mod === 'slag' && m !== 'slag') {
      for (const s of this.slagList) if (s.active && s.rain) {           // drops still falling cool to cinders and crumble
        this.cfx.emit(s.x, s.y, { n: 5, speed: [10, 50], life: [0.4, 0.8], size: [2, 1], cols: [0x6a5a50, 0x3a2a20, 0xff8a20], g: 300, cosmetic: true });
        s.disableBody(true, true);
        s.glow.setVisible(false);
      }
      this.dousePuddles(p => p.rain);
    }
    const rainLead = this.campaign ? 3 : 1.5;
    this.mod = m; this.rainT = rainLead; this.rainOn = true; this.rainTold = false;
    this.rainPhaseT = rainLead + rand(...TUNE.RAIN.shower);                   // the first shower starts with the modifier
    const gTo = this.modOn('lowg') ? TUNE.GRAVITY * 0.5 : TUNE.GRAVITY;   // a hazard starting or clearing keeps the mutator's
    if (this.mutator === 'lowg' || this.lab) this.physics.world.gravity.y = this.gravTo = gTo;   // MOON BOOTS or a Lab room's modifier was picked from a menu
    else if (gTo !== this.gravTo) {
      this.gravTo = gTo;
      if (gTo < TUNE.GRAVITY) this.gravAt = Infinity;                  // low gravity waits for its callout below
      else if (this.physics.world.gravity.y === gTo) this.gravAt = 0;   // it never took hold
      else {                                                           // full gravity comes back once it's called
        this.gravAt = Infinity;
        const restore = () => { if (this.gravTo !== gTo || this.gravAt !== Infinity) return; this.gravAt = 0; if (this.state === 'play') BUS.emit('callout', 'GRAVITY RESTORED'); };
        if (restoreLead) this.time.delayedCall(restoreLead, restore); else restore();
      }
    }
    if (m) this.time.delayedCall(1300, () => { if (this.state === 'play' && this.mod === m) { BUS.emit('callout', m === 'slag' ? 'SLAG RAIN!' : m === 'dark' ? 'BLACKOUT!' : m === 'melt' ? 'MELTDOWN!' : 'LOW GRAVITY!'); Sfx.roar(); this.shake(400, 0.006); if (m === 'lowg') this.gravAt = 0; } });
  }
  updateGravity(dt) {                                                   // low gravity eases in over a second once called, and back in half that
    const G = this.physics.world.gravity, half = TUNE.GRAVITY * 0.5;
    if (G.y === this.gravTo || this.time.now < this.gravAt) return;
    G.y = G.y > this.gravTo ? Math.max(this.gravTo, G.y - half * dt) : Math.min(this.gravTo, G.y + half * 2 * dt);
  }
  updateSlagRain(dt) {                                                  // molten drips from the ceiling in showers, marked where they'll land
    const R = TUNE.RAIN;
    if ((this.rainPhaseT -= dt) <= 0) { this.rainOn = !this.rainOn; this.rainPhaseT = rand(...(this.rainOn ? R.shower : R.clear)); this.rainTold = false; this.rainT = 0.4; }
    if (!this.rainOn) {                                                 // a clear spell: warn a beat before the next shower
      if (!this.rainTold && this.rainPhaseT <= R.tell) { this.rainTold = true; BUS.emit('callout', 'SLAG INCOMING'); Sfx.rumble(0.7); this.shake(500, 0.004); }
      return;
    }
    this.rainT -= dt; if (this.rainT > 0) return;
    this.rainT = rand(...R.gap);
    const x = clamp(this.player.x + rand(-280, 280), 40, LW - 40), y = 2 * TS + 4;
    if (this.solidAt(x, y)) return;
    const s = this.slags.getFirstDead(false); if (!s) return;
    s.enableBody(true, x, y, true, true); s.body.setAllowGravity(true); s.body.setSize(5, 5, true); s.setVelocity(rand(-10, 10), 30);
    Object.assign(s, { px: x, py: y, rain: true }); s.glow.setVisible(true);
    let gy = y; while (gy < LH - TS && !this.standAt(x, gy)) gy += 4;
    this.spawnLight(x, Math.floor(gy / TS) * TS - 2, 'ring', 0xff4020, 0.9, 0.4, 0.8, 0.6);
    if (Math.random() < 0.3) Sfx.whistle();
  }
  throwFirebomb(e) {
    const pb = this.player.body, sx = e.x + e.dir * 4, sy = e.y - 8, G = this.physics.world.gravity.y;
    const dx = pb.center.x + pb.velocity.x * 0.3 - sx, dy = pb.bottom - 2 - sy, T = e.kind === 'tarspit' ? clamp(Math.hypot(dx, dy) / 330, 0.32, 0.85) : clamp(Math.hypot(dx, dy) / 230, 0.45, 1.1);   // tar goes on a flatter lob (clears low girders)
    this.spawnEProj(e.kind === 'tarspit' ? 'tar' : 'fire', sx, sy, dx / T, (dy - 0.5 * G * T * T) / T);
    Sfx.whoosh();
  }
  spawnFirePatch(x, y) {
    for (let yy = y - 4; yy < y + 70; yy += 2) if (this.standAt(x, yy)) {
      const sy = Math.floor(yy / TS) * TS;
      const [px, pw] = this.spanOn(x, sy, 38);
      this.puddles.push({ x: px, y: sy, w: pw, t: 4, tick: 0.15, fire: true }); this.paintScorch(x, sy + 2, 12); Sfx.ignite();
      return;
    }
  }
  gunshipRocket(e) {
    const pb = this.player.body, sx = e.x + e.dir * 6, sy = e.body.bottom + 2, a = Math.atan2(pb.center.y - sy, pb.center.x - sx) + rand(-0.12, 0.12), S = TUNE.ROCKETEER.rocketSpeed * 1.1;
    this.spawnEProj('rocket', sx, sy, Math.cos(a) * S, Math.sin(a) * S); Sfx.rocket(); this.fxSmoke(sx, sy, 3);
  }
  gunshipGun(e) {
    const pb = this.player.body, sx = e.x + e.dir * 22, sy = e.body.bottom - 2, a = Math.atan2(pb.center.y - sy, pb.center.x - sx) + rand(-8, 8) * DEG;
    Sfx.eshot(); this.spawnLight(sx, sy, 'glow', 0xffd080, 0.6, 1, 0.9, 0.05);
    if (this.solidAt(sx, sy)) return;
    this.spawnEBullet(sx, sy, a, 380, this.campaign ? 3 : 4, { life: 1.4 });
  }
  gunshipDrop(e) {
    const kind = this.campaign || Math.random() < 0.5 ? 'grunt' : 'tick';
    const count = this.campaign ? 1 : 2;
    for (let i = 0; i < count; i++) {
      const t = this.spawnEnemy(kind, clamp(Math.floor(e.x / TS), 2, MAP_W - 3), clamp(Math.floor((e.body.bottom + 4) / TS), 2, MAP_H - 3));
      t.body.reset(e.x + (i ? 8 : -8), e.body.bottom + 8); t.body.setVelocity(rand(-60, 60), 40);
      t.summoned = true; t.aggro = true; t.aggroT = 6;
    }
    Sfx.clunk(); this.fxSmoke(e.x, e.body.bottom, 4); BUS.emit('callout', 'TROOPS INBOUND');
  }
  spawnWreck(e, dx) {
    const w = this.physics.add.sprite(e.x, e.y, 'gunship', 'wreck').setDepth(6).setFlipX(e.dir < 0);
    w.body.setSize(44, 14); w.body.setAllowGravity(true); w.body.setVelocity(e.body.velocity.x + dx * 60, -60);
    Object.assign(w, { spin: (dx >= 0 ? 1 : -1) * rand(1.5, 2.5), t: 0, hits: new Set(), col: this.physics.add.collider(w, this.solids) });
    this.wrecks.push(w);
    BUS.emit('callout', 'GUNSHIP DOWN'); this.slowmoUntil = this.time.now + 700; Sfx.roar(); this.shake(400, 0.008);
  }
  updateWrecks(dt) {
    for (let i = this.wrecks.length - 1; i >= 0; i--) {
      const w = this.wrecks[i], b = w.body; w.t += dt; w.rotation += w.spin * dt;
      this.fxFire(w.x + rand(-12, 12), w.y + rand(-4, 4), 2); this.fxSmoke(w.x, w.y - 4, 2, 1.4);
      if (Math.random() < 0.15) this.boomFx(w.x + rand(-18, 18), w.y + rand(-6, 6), 0.35);
      for (const e of this.enemies.getChildren()) {                      // flattens whatever it comes down on
        if (w.cosmetic || !e.alive || w.hits.has(e) || e.def.anchored) continue;
        const eb = e.body; if (Math.abs(eb.center.x - w.x) < 26 && Math.abs(eb.center.y - w.y) < 14) { w.hits.add(e); this.damageEnemy(e, 90, 0, 1, 'crush'); }
      }
      if ((w.t > 0.25 && (b.blocked.down || b.blocked.left || b.blocked.right)) || w.t > 5) {
        const x = w.x, y = w.y, D = ENEMY.gunship; w.col.destroy(); w.destroy(); this.wrecks.splice(i, 1);
        for (let j = 0; j < 24; j++) this.spawnGib(pick(D.gibs), x + rand(-18, 18), y + rand(-6, 6), rand(-300, 300), rand(-420, -120), 'metal');
        if (w.cosmetic) this.boomFx(x, y, TUNE.GUNSHIP.crash.radius / 60);
        else {
          this.explode(x, y, TUNE.GUNSHIP.crash);
          for (let j = 0; j < 4; j++) this.spawnFirePatch(x + rand(-40, 40), y);
        }
        for (let j = 0; j < 6; j++) this.time.delayedCall(80 + j * 90, () => this.boomFx(x + rand(-40, 40), y + rand(-20, 10), rand(0.6, 1.1)));
        this.zoomPunch = 0.15; BUS.emit('flash', 0.5);
      }
    }
  }

  // ------------------------------------------------------------- run control ----
  restartRun() {
    this.savePlayTime();
    const checkpoint = this.state === 'won' ? null : this.chapterStart;
    Sfx.stopLoops(); Music.paused = false;
    if (this.lab) this.labTransition = true;                            // the Lab redeploys in place
    this.scene.restart(this.mode.restartData(this, checkpoint));
  }
  quitToTitle() {
    this.savePlayTime();
    Sfx.stopLoops(); Music.paused = false; Music.intensity = 0;
    this.scene.stop('Hud'); this.scene.start('Title');
  }
  savePlayTime() {                                                      // the scene clock holds still in the pause menu, so this.time.now is right either way
    if (!this.mode.lifetime || this.overShown || this.needReset) return;   // after the results screen the run's time is already in
    const ms = Math.max(0, this.time.now - this.stats.t0 - this.playSaved);
    LIFE.time += ms / 1000; this.playSaved += ms;
    saveLife(); saveMastery();
  }
  runTime() {
    return (this.time.now - this.stats.t0 + this.campaignElapsed) / 1000;
  }
  pauseGame() {
    if (this.paused || this.state !== 'play') return;
    this.paused = true; this.restartArmUntil = 0; Sfx.stopLoops(); Music.paused = true;
    Music.need(this.restartTrack()); Music.need('title');               // RESTART and QUIT TO TITLE start without a gap; the next wave's keep() drops them again
    if (this.pfx && POSTFX.on) { const m = this.pfx.cm.colorMatrix; m.reset(); m.saturate(-0.75); m.brightness(0.55, true); this.pfx.key = 'pause'; }
    this.input.setDefaultCursor('default');
    BUS.emit('pause', true);
    this.scene.pause();
  }

  // ---------------------------------------------------------------- post FX ----
  // Phaser 4 camera filters on the world camera only (the HUD stays crisp): bloom, a barrel-warp pulse on big
  // blasts, and colour grading (rampage saturation, low-health desaturation, grey when you die). V toggles.
  initPostFx() {
    this.pfx = null;
    const cam = this.cameras.main;
    if (!cam.filters || this.game.renderer.type !== Phaser.WEBGL) return;
    try {
      const ext = cam.filters.external;
      const bloom = ext.addParallelFilters();
      bloom.top.addThreshold(0.5, 0.85);
      bloom.top.addBlur(1, 2, 2, 1.2);
      bloom.blend.blendMode = Phaser.BlendModes.ADD; bloom.blend.amount = 0.55;
      const barrel = ext.addBarrel(1);
      const cm = ext.addColorMatrix();
      this.pfx = { bloom, barrel, cm, warp: 0, key: '' };
      this.applyPostFxEnabled();
    } catch (err) { this.pfx = null; }
  }
  applyPostFxEnabled() { const P = this.pfx; if (P) for (const f of [P.bloom, P.barrel, P.cm]) f.active = POSTFX.on; }
  togglePostFx() { POSTFX.on = !POSTFX.on; try { localStorage.setItem('slaghouse.postfx', POSTFX.on ? '1' : '0'); } catch (err) { /* private mode */ } this.applyPostFxEnabled(); }
  warpPulse(v) { if (this.pfx) this.pfx.warp = Math.max(this.pfx.warp, v); }
  impactFrame(n) {                                                     // a couple of stark black-and-white frames on the biggest hits
    if (!OPTS.flash) return;                                            // reduced flashes: none of these
    if (this.pfx && POSTFX.on) this.impactN = Math.max(this.impactN || 0, n);
    else BUS.emit('flash', 0.2);
  }
  updatePostFx(dt, now) {
    const P = this.pfx; if (!P || !POSTFX.on) return;
    P.warp *= Math.exp(-dt * 10); if (P.warp < 0.001) P.warp = 0;
    P.barrel.amount = 1 + P.warp;
    if (this.impactN > 0) {
      this.impactN--; P.key = 'impact';
      const m = P.cm.colorMatrix; m.reset();
      try { m.blackWhite(); m.contrast(0.6, true); } catch (err) { m.saturate(-1); }
      return;
    }
    const ramp = now < this.rampageUntil, low = this.state !== 'dead' && this.hp <= 30 ? 1 - this.hp / 30 : 0;
    P.bloom.blend.amount = ramp ? 0.85 : 0.55;
    const key = this.state === 'dead' ? 'dead' : ramp ? 'ramp' : low > 0 ? 'low' + Math.round((0.3 + 0.5 * low + Math.sin(now / 160) * 0.08) * 20) : 'none';
    if (key === P.key) return;
    P.key = key;
    const m = P.cm.colorMatrix; m.reset();
    if (key === 'dead') m.saturate(-0.85);
    else if (ramp) { m.saturate(0.45); m.contrast(0.12, true); }
    else if (low > 0) m.saturate(-(0.3 + 0.5 * low + Math.sin(now / 160) * 0.08));
  }
  slagSplit(x, y, kind, dx) {
    for (let i = 0; i < 2; i++) {
      const s = this.spawnEnemy(kind, clamp(Math.floor(x / TS), 2, MAP_W - 3), clamp(Math.floor(y / TS), 2, MAP_H - 3)), side = i ? 1 : -1;
      s.body.reset(x + side * 4, y - 2); s.body.setVelocity(side * rand(80, 150) + dx * 40, -rand(200, 280));
      Object.assign(s, { aggro: true, aggroT: 6, hopT: rand(0.35, 0.7), wasGround: false, airT: 0.2 });
      this.spawnLight(s.x, s.y, s.def.key + '_w', 0xffffff, 1.4, 1, 0.9, 0.18, 'a');
    }
    this.fx.emit(x, y, { n: 18, speed: [40, 200], life: [0.3, 0.7], size: [3, 1], cols: [0xffffff, 0xffe080, 0xffa030, 0xff5a1a], add: true, g: 300, mode: 1, drag: 1 });
    this.spawnLight(x, y, 'glow', 0xff7020, 1.5, 3, 0.9, 0.25);
    Sfx.splat(2);
  }
  burrowerErupt(e) {
    const T = TUNE.BURROWER, pb = this.player.body, D = e.def;
    Object.assign(e, { ai: 'erupt', under: false, hitP: false, airT: 0, fr: 'up' });
    e.body.enable = true; e.body.setAllowGravity(true);
    e.body.reset(e.ux, e.floorY - 1 - D.fh / 2);
    e.body.setVelocity(clamp(pb.center.x - e.ux, -50, 50), -T.rise);
    e.setVisible(true); e.glow.setVisible(true);
    for (let i = 0; i < 8; i++) this.spawnGib(pick(['g_shard', 'g_shard2', 'g_plate']), e.ux + rand(-6, 6), e.floorY - 3, rand(-160, 160), rand(-380, -180), 'metal');
    this.fx.emit(e.ux, e.floorY - 2, { n: 24, angle: -Math.PI / 2, spread: 1.4, speed: [80, 300], life: [0.3, 0.8], size: [3, 1], cols: [0xffffff, 0xffe080, 0xffa030, 0xff5a1a, 0x7a6a58], add: true, g: 500, mode: 1 });
    this.fxDust(e.ux, e.floorY, 10); this.fxSmoke(e.ux, e.floorY - 4, 6);
    this.spawnLight(e.ux, e.floorY - 4, 'glow', 0xff6a10, 2, 4, 0.95, 0.3); this.spawnLight(e.ux, e.floorY - 4, 'ring', 0xffc080, 0.3, 1.4, 0.8, 0.22);
    this.paintScorch(e.ux, e.floorY + 3, 9);
    this.shake(200, 0.009); this.warpPulse(0.05); Sfx.erupt();
    this.makeNoise(e.ux, e.floorY, 260, false);
  }
  burrowerDig(e) {
    const b = e.body;
    Object.assign(e, { ai: 'under', under: true, ux: b.center.x, floorY: Math.round(b.bottom / TS) * TS, cd: rand(...TUNE.BURROWER.cd), trailT: 0, rumT: 0.2, burnT: 0, chill: 0, frozen: 0, panicT: 0 });
    this.fx.emit(e.ux, e.floorY - 2, { n: 14, angle: -Math.PI / 2, spread: 1.6, speed: [40, 160], life: [0.3, 0.6], size: [2, 1], cols: [0x7a6a58, 0x4a3e32, 0xffa030], g: 500, mode: 1 });
    this.fxDust(e.ux, e.floorY, 8); Sfx.dig();
    b.setVelocity(0, 0); b.setAllowGravity(false); b.enable = false;
    b.reset(e.ux, LH + 300);                                              // parked below the map: nothing can find or hit it
    e.setVisible(false); e.glow.setVisible(false);
  }
  throwHarpoon(e) {
    const T = TUNE.HARPOON, sx = e.x + e.dir * 4, sy = e.y - 8;
    e.hk = { x: sx, y: sy, vx: Math.cos(e.aimA) * T.speed, vy: Math.sin(e.aimA) * T.speed, state: 'fly', t: 0, dist: 0, rattle: 0 };
    e.reelDmg = 0; e.hkImg.setVisible(true).setPosition(sx, sy).setRotation(e.aimA);
    Sfx.whoosh(); Sfx.chain();
  }
  updateHarpoons(dt, now) {
    const T = TUNE.HARPOON, pb = this.player.body;
    for (const e of this.enemies.getChildren()) {
      const hk = e.hk; if (!hk) continue;
      if (!e.alive) { this.dropHarpoon(e); continue; }
      const hx = e.x + e.dir * 4, hy = e.y - 6;
      if (hk.state === 'fly') {
        const nx = hk.x + hk.vx * dt, ny = hk.y + hk.vy * dt;
        hk.dist += Math.hypot(nx - hk.x, ny - hk.y);
        const wall = this.sweep(hk.x, hk.y, nx, ny);
        if (wall) { hk.x = wall.x; hk.y = wall.y; hk.state = 'stuck'; hk.t = 0.3; this.fxSparks(hk.x, hk.y, 6, Math.atan2(-hk.vy, -hk.vx), 1.4); Sfx.clang(0.5); this.paintHole(hk.x, hk.y); }
        else {
          hk.x = nx; hk.y = ny;
          if (this.state !== 'dead' && !this.reeledBy && hk.x > pb.left - 3 && hk.x < pb.right + 3 && hk.y > pb.top - 3 && hk.y < pb.bottom + 3) {
            if (now < this.dashIUntil) this.dashDodge();                 // dashed clean through it
            else {
              hk.state = 'hooked'; hk.t = T.reelT; this.reeledBy = e; e.reelDmg = 0;
              this.hurtPlayer(T.hookDmg, hk.x, { knock: false, srcY: hk.y });
              BUS.emit('callout', 'HOOKED!'); Sfx.hookHit(); this.shake(120, 0.006); this.fxBlood(hk.x, hk.y, 6);
            }
          }
          if (hk.state === 'fly' && hk.dist > T.range) hk.state = 'back';
        }
      } else if (hk.state === 'hooked') {
        if (this.state === 'dead' || this.reeledBy !== e) { hk.state = 'back'; continue; }
        hk.x = pb.center.x; hk.y = pb.center.y; hk.t -= dt;
        const ddx = hx - pb.center.x, ddy = hy - pb.center.y, d = Math.hypot(ddx, ddy) || 1;
        if (d < 22 || hk.t <= 0) {                                       // reeled all the way in: the slash
          this.releaseHarpoon(e);
          if (d < 30) {
            e.ai = 'strike'; e.aiUntil = now + 380;
            if (this.hurtPlayer(T.slashDmg, e.x, { knock: false, srcY: e.y - 4 })) {
              pb.velocity.x = e.dir * 300; pb.velocity.y = -210; this.shake(150, 0.008); this.addKick(e.dir * 5, -2); Sfx.kickHit();
              this.fxBlood(pb.center.x, pb.center.y, 10, e.dir > 0 ? 0 : Math.PI, 1.2);
            }
          }
          continue;
        }
        pb.velocity.x = ddx / d * T.reel; pb.velocity.y = ddy / d * T.reel - 50;
        this.jumpCuttable = false; this.lastGround = -1e9;
        if ((hk.rattle -= dt) <= 0) { hk.rattle = 0.12; Sfx.chain(); }
      } else if (hk.state === 'stuck') { if ((hk.t -= dt) <= 0) hk.state = 'back'; }
      else {                                                              // winding back in
        const ddx = hx - hk.x, ddy = hy - hk.y, d = Math.hypot(ddx, ddy) || 1, step = Math.min(d, 560 * dt);
        hk.x += ddx / d * step; hk.y += ddy / d * step;
        if (d < 6) { this.dropHarpoon(e); continue; }
      }
      const rot = hk.state === 'fly' ? Math.atan2(hk.vy, hk.vx) : Math.atan2(hk.y - hy, hk.x - hx);
      e.hkImg.setPosition(Math.round(hk.x), Math.round(hk.y)).setRotation(rot);
    }
  }
  releaseHarpoon(e) { if (e.hk) e.hk.state = 'back'; if (this.reeledBy === e) this.reeledBy = null; }
  dropHarpoon(e) { e.hk = null; if (e.hkImg) e.hkImg.setVisible(false); if (this.reeledBy === e) this.reeledBy = null; }
  breakHarpoon(msg) {                                                   // the chain snaps: you're free, it staggers
    const e = this.reeledBy; if (!e) return;
    if (e.hk) {
      const mx = (e.hk.x + e.x) / 2, my = (e.hk.y + e.y - 6) / 2;
      for (let i = 0; i < 3; i++) this.spawnGib('g_chain', mx + rand(-6, 6), my, rand(-120, 120), rand(-200, -80), 'metal');
      this.fxSparks(mx, my, 8);
    }
    this.dropHarpoon(e);
    if (e.alive) { e.stunT = Math.max(e.stunT, 1.1); e.ai = 'engage'; e.fireCd = Math.max(e.fireCd, 1.5); }
    BUS.emit('callout', msg); Sfx.snap(); this.addStyle(40); this.shake(80, 0.004);
  }
  updateLinkBeams(dt, now) {
    const T = TUNE.LINKER, pb = this.player.body;
    for (const e of this.enemies.getChildren()) {
      if (e.kind !== 'linker') continue;
      e.beam = null;
      const P = e.partner;
      if (!e.alive || !P || !P.alive || e.lid > P.lid || e.phase === 'off' || e.frozen > 0 || P.frozen > 0) continue;
      const x0 = e.x + e.dir * 7, y0 = e.y, x1 = P.x + P.dir * 7, y1 = P.y, blk = this.sweep(x0, y0, x1, y1), ex = blk ? blk.x : x1, ey = blk ? blk.y : y1;
      e.beam = { x0, y0, x1: ex, y1: ey, blocked: !!blk, live: e.phase === 'live' };
      if (e.phase !== 'live') continue;
      if (blk && Math.random() < 0.5) this.fxSparks(ex, ey, 1, Math.atan2(y0 - ey, x0 - ex), 1.4, [40, 140]);
      if (Math.random() < dt * 8) Sfx.buzz();
      if ((e.zapT -= dt) <= 0) {                                         // anything else caught in it fries
        e.zapT = 0.1;
        for (const o of this.enemies.getChildren()) {
          if (!o.alive || o.kind === 'linker' || o.under) continue;
          const c = o.body.center;
          if (this.segDist(c.x, c.y, x0, y0, ex, ey)[0] < Math.max(o.body.halfWidth, o.body.halfHeight)) this.damageEnemy(o, T.enemyDps * 0.1, 0, -1, 'arc');
        }
        for (const rd of this.ragdolls) { const c = rd.pts[2]; if (this.segDist(c.x, c.y, x0, y0, ex, ey)[0] < 8) this.hitRagdoll(rd, c.x, c.y, 2, 0, -1, 'arc'); }
      }
      if (this.state === 'dead') continue;
      let best = 1e9, qx = 0, qy = 0;
      for (const py of [pb.top + 3, pb.center.y, pb.bottom - 3]) { const [d, t] = this.segDist(pb.center.x, py, x0, y0, ex, ey); if (d < best) { best = d; qx = x0 + (ex - x0) * t; qy = y0 + (ey - y0) * t; } }
      if (best < 6 && this.hurtPlayer(T.dmg, qx, { knock: false, srcY: qy })) {
        pb.velocity.y = pb.center.y < qy ? -260 : 180; pb.velocity.x += Math.sign(pb.center.x - (x0 + ex) / 2) * 60;
        Sfx.zap(); this.shake(120, 0.006);
        this.fx.emit(qx, qy, { n: 14, speed: [60, 200], life: [0.15, 0.35], size: [2, 1], cols: [0xffffff, 0x9af8ff, 0x40c0ff], add: true });
      }
    }
  }

  // ================================================================= crucible round ====
  zapCol(g, x0, y0, x1, y1, c0, c1) {                                  // zap() in any colour
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, n = Math.max(2, Math.round(len / 7)), nx = -dy / len, ny = dx / len;
    let px = x0, py = y0;
    for (let i = 1; i <= n; i++) {
      const t = i / n, off = i === n ? 0 : crand(-3, 3), qx = x0 + dx * t + nx * off, qy = y0 + dy * t + ny * off;
      g.lineStyle(3, c0, 0.35).lineBetween(px, py, qx, qy); g.lineStyle(1, c1, 0.95).lineBetween(px, py, qx, qy);
      px = qx; py = qy;
    }
  }
  // Every enemy bullet comes from here (#203): a pooled bullet gets every per-shot field reset to its default, then
  // the shot's own. tex and size are its look and body, life its seconds aloft, snipe a sniper round (swept between
  // frames, a heavier hit) and keg the drum a burst is aimed at (thinkEnforcer), which it sets burning on the way.
  spawnEBullet(x, y, a, speed, dmg, { tex = 'ebullet', size = 3, life = 1.6, snipe = false, keg = null } = {}) {
    const b = this.ebullets.getFirstDead(false); if (!b) return null;
    b.setTexture(tex); b.enableBody(true, x, y, true, true); b.body.setAllowGravity(false); b.body.setSize(size, size, true);
    b.setRotation(a); b.setVelocity(Math.cos(a) * speed, Math.sin(a) * speed);
    Object.assign(b, { life, px: x, py: y, ang: a, dmg, snipe, keg });
    return b;
  }

  // ---------------------------------------------------------- executions + orbs ----
  // An enemy under 20% health (30+ max HP, no bosses) pulses orange: kick it and it bursts, with slow-mo, and
  // pays out 2-3 health orbs (+5 each) that home in on you. Kick kills drop an orb 20% of the time.
  canExecute(e) {
    const D = e.def;
    return e.alive && !e.under && !D.tiny && D.hp >= TUNE.EXECUTE.minHp && D.hp < 400 && e.hp > 0 && e.hp <= D.hp * TUNE.EXECUTE.frac;
  }
  execute(e, f) {
    const b = e.body, cx = b.center.x, cy = b.center.y, now = this.time.now;
    this.stats.executes++;
    this.slowmoUntil = Math.max(this.slowmoUntil, now + 260); this.hitStop(70); this.zoomPunch = Math.max(this.zoomPunch, 0.09);
    this.shake(200, 0.01); BUS.emit('flash', 0.18); this.impactFrame(2);
    this.spawnLight(cx, cy, 'glow', 0xffb050, 2, 4, 1, 0.3); this.spawnLight(cx, cy, 'ring', 0xffe0b0, 0.3, 1.8, 0.9, 0.25);
    if (!e.def.molten && !e.def.mech) { this.fxBlood(cx, cy, 30, Math.atan2(-0.3, f), 1.4, [120, 380]); this.paintSplatAround(cx, b.bottom - 2, 14); }
    Sfx.execute(); BUS.emit('callout', pick(['EXECUTED!', 'BRUTAL!', 'FINISHED!'])); this.addStyle(90); if (this.stats.executes >= 5) this.award('exec');
    e.hp = 0; this.killEnemy(e, f, -0.4, 'execute');
    this.dropOrbs(cx, cy, randi(TUNE.EXECUTE.orbs[0], TUNE.EXECUTE.orbs[1]));
  }
  dropOrbs(x, y, n) {
    for (let i = 0; i < n; i++) {
      const o = this.orbImgs.find(q => !q.on); if (!o) return;
      Object.assign(o, { on: true, x, y, vx: rand(-90, 90), vy: rand(-240, -140), t: 0, ttl: 10 });
      o.setVisible(true).setPosition(x, y); o.glow.setVisible(true);
    }
  }
  updateHpOrbs(dt, now) {
    const pb = this.player.body, alive = this.state !== 'dead';
    if (this.orbChainT > 0 && (this.orbChainT -= dt) <= 0) this.orbChain = 0;
    for (const o of this.orbImgs) {
      if (!o.on) continue;
      o.t += dt; o.ttl -= dt;
      if (o.ttl <= 0) { o.on = false; o.setVisible(false); o.glow.setVisible(false); continue; }
      const dx = pb.center.x - o.x, dy = pb.center.y - o.y, d = Math.hypot(dx, dy) || 1;
      if (alive && o.t > 0.35 && (d < 130 || o.t > 1.2)) {              // magnetised: homes in faster and faster
        const sp = Math.min(520, 160 + o.t * 260), k = Math.min(1, dt * 8);
        o.vx += (dx / d * sp - o.vx) * k; o.vy += (dy / d * sp - o.vy) * k;
      } else {
        o.vy += 600 * dt;
        if (o.vy > 0 && this.solidAt(o.x, o.y + 4)) { o.vy *= -0.45; o.vx *= 0.7; o.y = Math.floor((o.y + 4) / TS) * TS - 4; }
        if (this.solidAt(o.x + Math.sign(o.vx) * 4, o.y)) o.vx *= -0.6;
      }
      o.x += o.vx * dt; o.y += o.vy * dt;
      if (alive && d < 11) {
        o.on = false; o.setVisible(false); o.glow.setVisible(false);
        if (this.hp < TUNE.PLAYER_HP) { this.hp = Math.min(TUNE.PLAYER_HP, this.hp + TUNE.EXECUTE.orbHeal); BUS.emit('hp', this.hp, 0); }
        this.orbChain++; this.orbChainT = 0.5; Sfx.orb(this.orbChain);
        this.fx.emit(pb.center.x, pb.center.y, { n: 6, speed: [20, 70], life: [0.2, 0.5], size: [2, 1], cols: [0xffffff, 0x9dff9a, 0x2ad05a], add: true, g: -60 });
        continue;
      }
      const blink = o.ttl < 2 && Math.floor(now / 80) % 2;
      o.setPosition(Math.round(o.x), Math.round(o.y)).setAlpha(blink ? 0.3 : 1);
      o.glow.setPosition(o.x, o.y).setAlpha(blink ? 0.2 : 0.5 + Math.sin(now / 90 + o.x) * 0.15);
    }
  }

  // --------------------------------------------------------------- mirror knight ----
  // Bulwark brain with a prism shield: frontal shots come straight back at you as enemy rounds. 80 shield HP
  // (blocked shots chip it at 35%; rails, lances, stakes, blasts, hammers bite fully); then it breaks for good.
  mirrorReflect(e, x, y, ang, dmg) {
    const T = TUNE.MIRROR, pb = this.player.body, a = Math.atan2(pb.center.y - y, pb.center.x - x) + rand(-0.12, 0.12);
    this.spawnEBullet(x - Math.cos(ang) * 4, y - Math.sin(ang) * 4, a, T.reflectSpeed, Math.min(T.reflectDmg, Math.ceil(dmg * 0.7)));
    this.fxSparks(x, y, 4, ang + Math.PI, 1, [60, 180]);
    this.spawnLight(x, y, 'glow', 0xc080ff, 0.6, 1.2, 0.9, 0.08);
    Sfx.prismBounce();
    this.mirrorDamage(e, dmg * 0.35);
  }
  mirrorDamage(e, d) {
    if (e.kind !== 'mirror' || e.mirrorBroken) return;
    e.mirrorHp = (e.mirrorHp ?? TUNE.MIRROR.shieldHp) - d;
    if (e.mirrorHp > 0) return;
    e.mirrorBroken = true; e.shieldUp = false; e.def = Object.assign({}, e.def, { key: 'mirrorb' });   // the empty-frame sprites from now on
    const sx = e.x + e.dir * 6, sy = e.y - 2;
    for (let i = 0; i < 8; i++) this.spawnGib('g_glass', sx + rand(-3, 3), sy + rand(-6, 6), e.dir * rand(40, 200) + rand(-60, 60), -rand(80, 260), 'metal');
    this.fx.emit(sx, sy, { n: 24, speed: [60, 240], life: [0.3, 0.7], size: [2, 1], cols: [0xffffff, 0xc0a8ff, 0x7a5ad0], g: 400, mode: 1 });
    this.spawnLight(sx, sy, 'glow', 0xc080ff, 1.4, 2.8, 0.9, 0.25);
    Sfx.shatter(); BUS.emit('callout', 'MIRROR BROKEN'); this.addStyle(60);
    e.ai = 'stagger'; e.aiUntil = this.time.now + 900;
  }
  hiveBirth(h) {
    const x = h.body.center.x + rand(-5, 5), y = h.body.center.y + rand(-3, 5);
    const g = this.spawnEnemy('gnat', clamp(Math.floor(x / TS), 2, MAP_W - 3), clamp(Math.floor(y / TS), 2, MAP_H - 3));
    g.body.reset(x, y); g.body.setVelocity(rand(-80, 80), rand(-60, 40));
    Object.assign(g, { hive: h, summoned: true, aggro: true, aggroT: 99 });
    if (Math.random() < 0.3) { this.fx.emit(x, y, { n: 3, speed: [20, 60], life: [0.2, 0.4], size: [2, 1], cols: [0x843830, 0x622626], g: 200 }); Sfx.squish(); }
  }
  stitchFail(e, hurt) {
    if (e.corpse) e.corpse.claimed = null;
    e.corpse = null; e.ai = 'seek'; e.cd = hurt ? 2.5 : 1;
    if (hurt) { BUS.emit('callout', 'STITCH BROKEN'); this.addStyle(30); this.fxSparks(e.x, e.y, 8); Sfx.snap(); }
  }
  stitchRaise(e) {
    const rd = e.corpse, T = TUNE.STITCH, x = rd.pts[2].x, feet = Math.max(...rd.pts.map(q => q.y + q.r)), kind = rd.kind;
    this.removeRag(rd);
    const r = this.spawnEnemy(kind, clamp(Math.floor(x / TS), 2, MAP_W - 3), clamp(Math.floor((feet - 2) / TS), 2, MAP_H - 3));
    r.body.reset(x, r.y);
    Object.assign(r, { revenant: true, summoned: true, aggro: true, aggroT: 9, hp: Math.ceil(r.def.hp * T.hpFrac) });
    if (isHumanoid(r)) { r.lkx = this.player.x; r.lky = this.player.y; r.lkT = this.time.now; this.alertHumanoid(r, this.time.now, false); }
    if (r.glow) r.glow.setTint(0x60ff70);
    this.spawnLight(x, r.y, 'glow', 0x60ff70, 1.5, 3.5, 0.9, 0.35); this.spawnLight(r.x, r.y, r.def.key + '_w', 0x9affb0, 1.4, 1, 0.9, 0.3, r.fr, r.flipX);
    this.fx.emit(x, r.y, { n: 20, speed: [30, 140], life: [0.3, 0.7], size: [3, 1], cols: [0xffffff, 0xd0ffd0, 0x60ff70], add: true, drag: 2 });
    Sfx.revive(); BUS.emit('callout', 'RISEN!');
    e.corpse = null; e.ai = 'seek'; e.cd = T.cd;
  }
  wyrmPlace(e) {                                                        // head on the newest trail point, segment i ~13 px further back per step
    const T = TUNE.WYRM, H = e.hist, under = e.ai === 'under';
    this.wyrmPart(e, !under && H.length ? H[H.length - 1] : null);
    let acc = 0, j = H.length - 1;
    for (let i = 0; i < e.segs.length; i++) {
      const sg = e.segs[i]; if (!sg.alive) continue;
      const want = (i + 1) * T.gap;
      while (j > 0 && acc < want) { acc += Math.hypot(H[j].x - H[j - 1].x, H[j].y - H[j - 1].y); j--; }
      const pt = !under && acc >= want ? H[j] : null;                    // trail not that long yet: still underground
      if (pt) { const nx = H[Math.min(H.length - 1, j + 1)]; if (nx !== pt) sg.wyrmAng = Math.atan2(nx.y - pt.y, nx.x - pt.x); }
      this.wyrmPart(sg, pt);
    }
  }
  wyrmPart(p, pt) {                                                      // out in the air: shown + hittable; in the ground: hidden + immune
    if (pt && pt.air) {
      if (!p.body.enable) { p.body.enable = true; p.setVisible(true); if (p.glow) p.glow.setVisible(true); }
      p.under = false; p.body.reset(pt.x, pt.y);
      p.fr = p.kind === 'wyrmseg' ? (Math.floor(this.time.now / 120 + p.idx) % 2 ? 'b' : 'a') : p.ai === 'leap' && p.vy < 120 ? 'o' : 'c';
    } else if (!p.under) {
      p.under = true; p.body.enable = false; p.setVisible(false); if (p.glow) p.glow.setVisible(false);
      if (pt) this.fx.emit(pt.x, pt.y - 4, { n: 4, angle: -Math.PI / 2, spread: 1.4, speed: [40, 140], life: [0.2, 0.5], size: [2, 1], cols: [0x7a6a58, 0xffa030], g: 500, mode: 1 });
      p.body.reset(pt ? pt.x : p.x, LH + 300);
    }
  }
  wyrmTell(e, now) {
    const T = TUNE.WYRM, pb = this.player.body, right = pb.center.x > LW / 2;
    e.pattern = Math.random() < 0.45 ? 'breach' : 'skim';
    if (e.pattern === 'breach') { e.ex = pb.center.x; e.lx = e.ex + rand(-24, 24); }
    else { e.ex = clamp(pb.center.x + (right ? -170 : 170), 56, LW - 56); e.lx = clamp(pb.center.x + (right ? 170 : -170), 56, LW - 56); }
    if (!this.standAt(e.ex, e.floorY + 2)) { e.cd = 0.3; return; }       // no floor to burst from there: try again shortly
    e.ai = 'tell'; e.aiUntil = now + T.tellMs; Sfx.rumble(1);
    if (e.pattern === 'skim') this.spawnLight(e.lx, e.floorY - 3, 'ring', 0xff6a10, 1.3, 0.5, 0.9, T.tellMs / 1000 + 0.4);   // marks where it comes down
  }
  wyrmLeap(e) {
    const T = TUNE.WYRM, skim = e.pattern === 'skim', H = skim ? T.skim : T.high + rand(-15, 15), g = skim ? T.skimGravity : T.gravity, depth = 12;
    const vy = -Math.sqrt(2 * g * (H + depth)), ft = 2 * Math.sqrt(2 * (H + depth) / g);
    Object.assign(e, { ai: 'leap', hx: e.ex, hy: e.floorY + depth, vx: (e.lx - e.ex) / ft, vy, grav: g, hist: [], spitT: 0.25, leapT: 0, wasAir: false });
    this.fx.emit(e.ex, e.floorY - 2, { n: 30, angle: -Math.PI / 2, spread: 1.4, speed: [80, 320], life: [0.3, 0.8], size: [3, 1], cols: [0xffffff, 0xffe080, 0xffa030, 0xff5a1a, 0x7a6a58], add: true, g: 500, mode: 1 });
    for (let i = 0; i < 8; i++) this.spawnGib(pick(['g_shard', 'g_shard2', 'g_plate']), e.ex + rand(-8, 8), e.floorY - 3, rand(-180, 180), rand(-420, -180), 'metal');
    this.fxDust(e.ex, e.floorY, 12); this.fxSmoke(e.ex, e.floorY - 4, 8, 1.2);
    this.spawnLight(e.ex, e.floorY - 4, 'glow', 0xff6a10, 2.5, 5, 0.95, 0.35); this.paintScorch(e.ex, e.floorY + 3, 12);
    this.shake(260, 0.012); this.warpPulse(0.07); Sfx.erupt(); if (Math.random() < 0.5) Sfx.roar();
    this.makeNoise(e.ex, e.floorY, 300, false);
  }
  wyrmSpit(e) {                                                          // phase 2: molten globs rain off it as it flies
    const s = this.slags.getFirstDead(false); if (!s) return;
    s.enableBody(true, e.hx, e.hy, true, true); s.body.setAllowGravity(true); s.body.setSize(5, 5, true);
    s.setVelocity(e.vx * 0.3 + rand(-60, 60), rand(-120, 20)); Object.assign(s, { px: e.hx, py: e.hy, rain: false }); s.glow.setVisible(true);
    Sfx.ignite();
  }
  wyrmTouch(part) {
    const h = part.kind === 'wyrm' ? part : part.head;
    if (!h || !h.alive || part.under || (h.ai !== 'leap' && h.ai !== 'sink')) return;
    const now = this.time.now; if (now < (h.touchCd || 0)) return;
    const T = TUNE.WYRM, pb = this.player.body;
    if (this.hurtPlayer(part === h ? T.headDmg : T.segDmg, part.x, { knock: false, srcY: part.y })) {
      h.touchCd = now + 600;
      pb.velocity.x = (Math.sign(pb.center.x - part.x) || 1) * 260; pb.velocity.y = -300; this.jumpCuttable = false; this.lastGround = -1e9;
      this.shake(180, 0.01); Sfx.kickHit(); this.fxBlood(pb.center.x, pb.center.y, 10);
    }
  }
  wyrmDeath(e) {                                                         // the body blows apart, head to tail
    if (this.boss === e) this.boss = null;
    this.slowmoUntil = this.time.now + 1000; this.zoomPunch = 0.12; BUS.emit('flash', 0.4); BUS.emit('callout', 'WYRM SLAIN'); Sfx.roar();
    e.segs.forEach((sg, i) => this.time.delayedCall(90 + i * 90, () => {
      if (!sg.alive) return;
      if (!sg.under) {
        this.boomFx(sg.x, sg.y, 0.55);
        for (let k = 0; k < 4; k++) this.spawnGib(pick(['g_wyrmplate', 'g_wormseg', 'g_flesh1', 'g_chunk']), sg.x, sg.y, rand(-200, 200), rand(-320, -120));
        this.fxBlood(sg.x, sg.y, 10);
      }
      sg.alive = false; sg.disableBody(true, true);
    }));
  }
  drawValve(g, f) {                                                     // a riser down from the main with a handwheel over your head
    const { x, y } = f, wy = y - 32, a = (f.done ? 1 : f.k) * Math.PI * 3;
    g.fillStyle(0x15171b, 1).fillRect(x - 3, y - 46, 6, 46);
    g.fillStyle(0x4b535e, 1).fillRect(x - 2, y - 46, 4, 46);
    g.fillStyle(0x6a7380, 1).fillRect(x - 2, y - 46, 1, 46);
    g.fillStyle(0x2a2e35, 1).fillRect(x - 6, y - 3, 12, 3).fillRect(x - 4, wy - 4, 8, 8);
    g.lineStyle(2, f.done ? 0x3ab0d0 : 0xc8402a, 1).strokeCircle(x, wy, 6);
    g.lineStyle(1, 0xe8b422, 1);
    for (let i = 0; i < 3; i++) { const t = a + i * Math.PI / 3, c = Math.cos(t) * 6, s = Math.sin(t) * 6; g.lineBetween(x - c, wy - s, x + c, wy + s); }
    g.fillStyle(0xe8b422, 1).fillRect(x - 1, wy - 1, 2, 2);
    g.fillStyle(f.done ? 0x5cf0ff : 0xff3020, 1).fillRect(x + 3, y - 16, 2, 2);   // its lamp: red shut, cyan open
  }
  drawBreaker(g, f, now) {                                              // a cabinet with a big lever, its conduit running up out of sight
    const { x, y } = f, top = y - 30;
    for (let yy = top - 2; yy > 2 * TS && !this.solidAt(x, yy); yy -= 2) g.fillStyle(0x22262c, 1).fillRect(x - 1, yy, 3, 2);
    g.fillStyle(0x15171b, 1).fillRect(x - 8, top - 1, 16, 22);
    g.fillStyle(0x3a414a, 1).fillRect(x - 7, top, 14, 20);
    g.fillStyle(0x5a6574, 1).fillRect(x - 7, top, 14, 1);
    g.fillStyle(0xe8b422, 1).fillTriangle(x - 5, top + 3, x - 2, top + 3, x - 5, top + 8);
    g.fillStyle(0x0b0d10, 1).fillRect(x - 1, top + 4, 2, 14);
    g.fillStyle(0xc8402a, 1).fillRect(x - 4, top + 4 + Math.round((f.done ? 1 : f.k) * 11), 8, 3);
    g.fillStyle(f.done ? 0xff3020 : Math.floor(now / 400) % 2 ? 0x5cff7a : 0x2a8a3a, 1).fillRect(x + 3, top + 2, 2, 2);
  }
  buzzBounce(e, L, Rt, U, D) {
    const b = e.body, x = L ? b.left - 1 : Rt ? b.right + 1 : b.center.x, y = U ? b.top - 1 : D ? b.bottom + 1 : b.center.y;
    this.fxSparks(x, y, 7, Math.atan2(b.center.y - y, b.center.x - x), 1.4, [80, 260]);
    this.paintHole(x, y); this.paintHole(x + rand(-2, 2), y + rand(-2, 2));
    const tx = Math.floor(x / TS), ty = Math.floor(y / TS), c = this.tileAt(tx, ty);
    if (c === 'x' || c === 'g') this.damageTile(tx, ty, 8);
    const d = Math.hypot(this.player.x - x, this.player.y - y);
    if (d < 280) Sfx.ricochet(1 - d / 320);
  }
  magnetPulse(e, dist) {
    const T = TUNE.MAGNET, cx = e.body.center.x, cy = e.body.center.y, R = T.field * 2.8;
    this.spawnLight(cx, cy, 'ring', 0x7aa0ff, 3.4, 0.2, 0.9, 0.3); this.spawnLight(cx, cy, 'glow', 0x7aa0ff, 1, 3, 0.8, 0.2);
    Sfx.magPulse(); this.shake(100, 0.004);
    const pb = this.player.body;
    if (this.state !== 'dead' && dist < R && this.los(cx, cy, pb.center.x, pb.center.y)) {
      const ax = cx - pb.center.x, ay = cy - pb.center.y, l = Math.hypot(ax, ay) || 1, f = 1 - 0.5 * l / R;
      pb.velocity.x += ax / l * T.pull * f; pb.velocity.y += ay / l * T.pull * f - 60; this.jumpCuttable = false;
      if (l < 34 && this.hurtPlayer(T.zap, cx, { knock: false, srcY: cy })) { for (let i = 0; i < 6; i++) this.fxSparks(cx - ax * i / 6, cy - ay * i / 6, 2, 0, Math.PI * 2, [20, 80]); BUS.emit('callout', 'ZAPPED'); }
    }
    for (const g of this.gibList) if (g.active && Math.hypot(g.x - cx, g.y - cy) < R) {   // scrap leaps at it
      if (g.stuckT > 0) { g.stuckT = 0; g.body.setAllowGravity(true); }
      const ax = cx - g.x, ay = cy - g.y, l = Math.hypot(ax, ay) || 1; g.body.velocity.x += ax / l * 260; g.body.velocity.y += ay / l * 260;
    }
  }
  updateMagnetField(dt) {
    const mags = [];
    for (const e of this.enemies.getChildren()) if (e.alive && e.kind === 'magnet' && !(e.frozen > 0)) mags.push(e);
    this.magnets = mags; if (!mags.length) return;
    const R = TUNE.MAGNET.field, W = TUNE.MAGNET.bend;
    const bend = (o, k) => {                                              // turn the heading away from each field centre, speed kept
      const v = o.body.velocity, sp = Math.hypot(v.x, v.y); if (sp < 1) return false;
      let h = Math.atan2(v.y, v.x), bent = false;
      for (const m of mags) {
        const rx = m.body.center.x - o.x, ry = m.body.center.y - o.y, d = Math.hypot(rx, ry);
        if (d > R) continue;
        let df = Math.atan2(ry, rx) - h; df = Math.atan2(Math.sin(df), Math.cos(df));
        if (o.magSide === undefined || Math.abs(df) > 0.05) o.magSide = Math.sign(df) || (Math.random() < 0.5 ? -1 : 1);
        h -= o.magSide * W * k * (1 - d / R) * dt * (Math.abs(df) < Math.PI / 2 ? 1 : 0.3);
        bent = true;
      }
      if (bent) { v.x = Math.cos(h) * sp; v.y = Math.sin(h) * sp; }
      return bent;
    };
    for (const b of this.bulletList) if (b.active && bend(b, 1)) { b.ang = Math.atan2(b.body.velocity.y, b.body.velocity.x); b.setRotation(b.ang); if (!this.magHint) { this.magHint = true; BUS.emit('callout', 'SHOTS DEFLECTED'); } if (Math.random() < 0.25) this.fx.emit(b.x, b.y, { n: 1, speed: [0, 10], life: [0.1, 0.2], size: [1, 1], cols: [0xc8d8ff, 0x7aa0ff], add: true }); }
    for (const r of this.rocketList) if (r.active && bend(r, 0.6)) { r.ang = Math.atan2(r.body.velocity.y, r.body.velocity.x); r.setRotation(r.ang); }
    for (const s of this.sawList) if (s.active) bend(s, 0.8);
  }
  jellyNova(x, y) {
    const T = TUNE.JELLY, pb = this.player.body;
    this.spawnLight(x, y, 'ring', 0xff90e8, 0.2, T.nova / 16, 0.9, 0.3); this.spawnLight(x, y, 'glow', 0xffb0f0, 1.5, 2.5, 0.8, 0.3); this.fxSparks(x, y, 14, 0, Math.PI * 2, [60, 200]); Sfx.pylonZap();
    if (this.state !== 'dead' && Math.hypot(pb.center.x - x, pb.center.y - y) < T.nova) this.hurtPlayer(T.novaDmg, x, { srcY: y });
    for (const o of this.enemies.getChildren()) if (o.alive && !o.under && Math.hypot(o.body.center.x - x, o.body.center.y - y) < T.nova) this.damageEnemy(o, T.novaDmg, Math.sign(o.body.center.x - x) || 1, -0.4, 'arc');
  }
  quillBurst(e) {
    const T = TUNE.PORCUPINE, x = e.body.center.x, y = e.body.top + 4;
    for (let k = 0; k < T.n; k++) { const a = -Math.PI + (k + 0.5) / T.n * Math.PI * 2 + rand(-0.08, 0.08); this.spawnEBullet(x + Math.cos(a) * 6, y + Math.sin(a) * 4, a, T.spd, T.dmg); }
    this.fxSparks(x, y, 6, -Math.PI / 2, 2, [40, 120]); Sfx.quills();
  }
  spongeRelease(e) {
    const T = TUNE.SPONGE, pb = this.player.body, x = e.body.center.x, y = e.body.center.y, n = e.charge, a0 = Math.atan2(pb.center.y - y, pb.center.x - x);
    e.charge = 0; e.setScale(e.growS || 1);
    for (let k = 0; k < n; k++) this.spawnEBullet(x + Math.cos(a0) * 8, y + Math.sin(a0) * 8, a0 + (k - (n - 1) / 2) * 0.09 + rand(-0.03, 0.03), T.spd * rand(0.9, 1.1), T.dmg);
    this.fx.emit(x, y, { n: 14, speed: [40, 140], life: [0.2, 0.5], size: [3, 1], cols: [0xffe46a, 0xc8a040], add: true }); Sfx.spit(); this.shake(80, 0.004);
    if (Math.hypot(pb.center.x - x, pb.center.y - y) < 500) BUS.emit('callout', 'SPAT BACK');
  }

  // ================================================================== debrief round ====
  culprit(x, opts) {                                                      // who (or what) landed the killing blow, for the results
    if (opts.self) return 'YOURSELF';
    if (opts.by) return opts.by;                                         // a hazard, not a foe
    const y = opts.srcY !== undefined ? opts.srcY : this.player.y, name = k => (CODEX.find(c => c[0] === k) || [0, k.toUpperCase()])[1];
    let best = null, bd = 1e9;
    for (const e of this.enemies.getChildren()) { if (!e.alive) continue; const d = Math.abs(e.x - x) * 2 + Math.abs(e.y - y) * 0.5; if (d < bd) { bd = d; best = e; } }
    if (best && bd < 40) return name(best.kind);
    if (opts.burn) return 'FIRE';
    return best ? name(best.kind) : 'THE FOUNDRY';
  }
  zealotSouls(x, y) {
    for (const z of this.enemies.getChildren()) if (z.alive && z.kind === 'zealot' && z.souls < TUNE.ZEALOT.maxSouls && Math.hypot(z.x - x, z.y - y) < TUNE.ZEALOT.soulR) this.souls.push({ x, y, tgt: z });
  }
  updateHorbs(dt, now) {
    const T = TUNE.ZEALOT, pb = this.player.body;
    for (let i = this.souls.length - 1; i >= 0; i--) {                    // souls drift to their zealot
      const S = this.souls[i], z = S.tgt;
      if (!z.alive) { this.fx.emit(S.x, S.y, { n: 4, speed: [10, 40], life: [0.2, 0.4], size: [2, 1], cols: [0xfff0b0], add: true }); this.souls.splice(i, 1); continue; }
      const ddx = z.x - S.x, ddy = z.body.top - S.y, l = Math.hypot(ddx, ddy) || 1;
      if (l < 8) {
        if (z.souls >= T.maxSouls) { this.souls.splice(i, 1); continue; }   // full: the extra souls just fade
        z.souls++; z.def = Object.assign({}, z.def, { hp: z.def.hp + T.soulHp }); z.hp += T.soulHp;
        this.spawnLight(z.x, z.y, 'ring', 0xffe080, 0.2, 1.2, 0.9, 0.25); this.dmgNumber(z.x, z.body.top - 5, '+' + T.soulHp, 'G'); Sfx.soul();
        if (z.souls === 1 && !this.empowerSeen) { this.empowerSeen = true; BUS.emit('callout', 'EMPOWERED'); }
        this.souls.splice(i, 1); continue;
      }
      S.x += ddx / l * 220 * dt; S.y += ddy / l * 220 * dt + Math.sin(now / 80 + i) * 0.6;
    }
    for (let i = this.horbs.length - 1; i >= 0; i--) {                    // holy orbs home in on you; shots pop them
      const O = this.horbs[i]; O.t -= dt;
      const sp = T.orb + 20 * O.big, ddx = pb.center.x - O.x, ddy = pb.center.y - O.y, l = Math.hypot(ddx, ddy) || 1, k = Math.min(1, dt * 1.6);
      O.vx += (ddx / l * sp - O.vx) * k; O.vy += (ddy / l * sp - O.vy) * k; O.x += O.vx * dt; O.y += O.vy * dt;
      let pop = O.t <= 0 || this.solidAt(O.x, O.y);
      if (!pop) for (const bl of this.bulletList) if (bl.active && Math.abs(bl.x - O.x) < 6 && Math.abs(bl.y - O.y) < 6) { pop = true; bl.disableBody(true, true); break; }
      if (!pop && this.state !== 'dead' && Math.abs(O.x - pb.center.x) < pb.halfWidth + 3 && Math.abs(O.y - pb.center.y) < pb.halfHeight + 3) { this.hurtPlayer(T.orbDmg + 3 * O.big, O.x, { srcY: O.y }); pop = true; }
      if (pop) { this.fx.emit(O.x, O.y, { n: 8, speed: [30, 100], life: [0.2, 0.4], size: [2, 1], cols: [0xffffff, 0xffe080], add: true }); this.horbs.splice(i, 1); continue; }
      if (Math.random() < 0.4) this.fx.emit(O.x, O.y, { n: 1, speed: [0, 10], life: [0.2, 0.4], size: [2, 1], cols: [0xfff0b0, 0xffe080], add: true });
    }
  }
  updateEMines(dt, now) {
    const T = TUNE.MINELAYER, pb = this.player.body;
    for (let i = this.emines.length - 1; i >= 0; i--) {
      const M = this.emines[i]; M.t += dt;
      if (M.st === 'fall') {
        M.vy = Math.min(420, M.vy + 700 * dt); const ny = M.y + M.vy * dt;
        if (this.standAt(M.x, ny + 2)) { M.y = Math.floor((ny + 2) / TS) * TS - 1; M.st = 'arm'; M.t = 0; Sfx.tink(0.35); }
        else if (ny > LH) { this.emines.splice(i, 1); continue; } else M.y = ny;
        continue;
      }
      let boom = false;
      for (const bl of this.bulletList) if (bl.active && Math.abs(bl.x - M.x) < 6 && Math.abs(bl.y - M.y) < 6) { boom = true; bl.disableBody(true, true); break; }   // shot: it goes off now
      if (M.st === 'arm' && M.t >= T.arm) M.st = 'live';
      if (M.st === 'live' && this.state !== 'dead' && Math.hypot(pb.center.x - M.x, pb.bottom - M.y) < T.trig) { M.st = 'trig'; M.t = 0; Sfx.beep(); }
      if (M.st === 'trig' && M.t >= T.fuse) boom = true;
      if (boom) { this.explode(M.x, M.y - 3, T.boom); this.emines.splice(i, 1); }
    }
  }
  updateWalls(dt, now) {
    for (let i = this.bwalls.length - 1; i >= 0; i--) {
      const W = this.bwalls[i]; W.t -= dt;
      if (W.t <= 0 || W.hp <= 0 || !W.owner.alive) {
        if (W.hp <= 0) { this.fx.emit(W.x, (W.y0 + W.y1) / 2, { n: 16, speed: [40, 160], life: [0.2, 0.5], size: [2, 1], cols: [0xffffff, 0x9af4ff, 0x46e6ff], add: true }); Sfx.shieldPop(); }
        this.bwalls.splice(i, 1); continue;
      }
      for (const bl of this.bulletList) if (bl.active && Math.abs(bl.x - W.x) < 5 && bl.y > W.y0 && bl.y < W.y1) {   // your bullets stop dead
        W.hp -= bl.dmg || 8; W.hitT = now; this.fxSparks(bl.x, bl.y, 3, bl.body.velocity.x > 0 ? Math.PI : 0, 1.2, [40, 140]); bl.disableBody(true, true);
      }
    }
  }
  flipShell(e) {
    e.ai = 'flip'; e.aiUntil = this.time.now + TUNE.SHELLBACK.flipT * 1000; e.body.velocity.y = -180; e.fr = 'flip';
    Sfx.clang(0.7); this.fxSparks(e.body.center.x, e.body.center.y, 6, -Math.PI / 2, 1.4, [60, 180]);
    if (!e.flipped) { e.flipped = true; BUS.emit('callout', 'FLIPPED'); this.addStyle(30); }
  }
  foremanHounds(e) {
    const room = TUNE.FOREMAN.maxHounds - this.enemies.getChildren().filter(o => o.alive && o.owner === e).length - (e.houndPend || 0);
    if (room <= 0) return;
    const pts = this.A.points.G.slice().sort((p, q) => Math.abs(q[0] * TS - this.player.x) - Math.abs(p[0] * TS - this.player.x)).slice(0, 4);
    for (let k = 0; k < Math.min(2, room); k++) {
      e.houndPend = (e.houndPend || 0) + 1;
      const pt = pts[randi(0, pts.length - 1)];
      this.spawnLight(pt[0] * TS + 8, (pt[1] + 1) * TS - 10, 'ring', 0xff80e0, 1.4, 0.2, 0.8, 0.6);
      this.time.delayedCall(600, () => { e.houndPend--; if (this.state === 'dead' || !e.alive) return; const o = this.spawnEnemy('hound', pt[0], pt[1]); Object.assign(o, { summoned: true, aggro: true, aggroT: 9, owner: e }); });
    }
    BUS.emit('callout', 'HOUNDS'); Sfx.warp();
  }

  // ================================================================== elite round ====
  // ---------------------------------------------------------------- elites ----
  // Later campaign squads and OVERTIME include elite foes: +30% HP,
  // a coloured aura and a diamond over the head, and one trait. ARMORED: double HP. SHIELDED: a bubble worth 40% of
  // its HP that soaks hits and comes back 3.5 s after the last one. VOLATILE: blows up 0.4 s after it dies. REGEN:
  // heals 6% a second once it's gone 2 s unhurt. Each pays out two health orbs.
  makeElite(e, aff) {
    const T = TUNE.ELITE;
    e.elite = aff; e.def = Object.assign({}, e.def, { hp: e.def.hp * (aff === 'armored' ? T.armorHp : T.hp) }); e.hp = e.def.hp; e.lastHitT = 0;
    if (aff === 'shielded') { e.eshMax = e.def.hp * T.shield; e.esh = e.eshMax; }
    e.eliteGlow = this.add.image(e.x, e.y, 'glow').setBlendMode(ADD).setTint(ELITE_COL[aff]).setScale(0.8).setAlpha(0.45).setDepth(4.9);
    this.spawnLight(e.x, e.y, 'ring', ELITE_COL[aff], 0.3, 1.8, 0.9, 0.35);
    if (!this.eliteSeen) { this.eliteSeen = true; BUS.emit('callout', 'ELITE: ' + aff.toUpperCase()); }
  }
  updateElite(e, dt, now) {
    const T = TUNE.ELITE, b = e.body;
    if (e.elite === 'regen' && now - e.lastHitT > 2000 && e.hp < e.def.hp) {
      e.hp = Math.min(e.def.hp, e.hp + e.def.hp * T.regen * dt);
      if (Math.random() < 0.25) this.fx.emit(b.center.x + rand(-b.halfWidth, b.halfWidth), b.center.y + rand(-4, 4), { n: 1, angle: -Math.PI / 2, spread: 0.3, speed: [10, 30], life: [0.3, 0.6], size: [2, 1], cols: [0x5cff7a, 0xd0ffd8], add: true });
    }
    if (e.elite === 'shielded' && e.esh < e.eshMax && now - e.lastHitT > T.shieldDelay) {
      if (e.esh <= 0) { this.spawnLight(b.center.x, b.center.y, 'ring', 0x46e6ff, 1.6, 0.4, 0.8, 0.3); Sfx.shieldHit(); }
      e.esh = Math.min(e.eshMax, e.esh + e.eshMax * dt);
    }
  }
  eliteDeath(e, cx, cy) {
    if (e.eliteGlow) { e.eliteGlow.destroy(); e.eliteGlow = null; }
    this.dropOrbs(cx, cy, 2); this.addStyle(60);
    if ((this.ms.elites = (this.ms.elites || 0) + 1) >= 6) this.award('elitehunter');
    if (e.elite === 'volatile') {                                         // the core goes critical
      this.spawnLight(cx, cy, 'ring', 0xff6a20, 0.3, 1.8, 0.9, 0.4); this.spawnLight(cx, cy, 'glow', 0xff6a20, 0.6, 1.6, 0.9, 0.4); Sfx.charge(0.3);
      this.time.delayedCall(400, () => { if (this.state !== 'dead') this.explode(cx, cy, TUNE.ELITE.boom); });
    }
  }
  updateHunt(dt, now) {                                                   // per-frame odds and ends for this round
    if (this.vac.on && WEAPONS[this.weapon].id !== 'vacuum') this.vac.on = false;
    if (this.sipShown > 0 && now >= this.sipShowAt) { this.dmgNumber(this.player.x, this.player.y - 18, '+' + this.sipShown, 'G'); this.sipShown = 0; this.sipShowAt = now + 600; }
    if (now < this.thrownUntil && this.state !== 'dead') {               // thrown by a grappler: a wall at speed hurts
      const pb = this.player.body;
      if (pb.blocked.left || pb.blocked.right) {
        this.thrownUntil = 0; this.hurtPlayer(8, pb.center.x + (pb.blocked.left ? -10 : 10), { knock: false, iframes: false });
        this.fxDust(pb.center.x, pb.center.y, 6); this.shake(140, 0.008); BUS.emit('callout', 'SLAMMED'); Sfx.stomp();
      } else if (pb.blocked.down) this.thrownUntil = 0;
    }
  }
  grappleThrow(e) {
    const T = TUNE.GRAPPLER, pb = this.player.body, now = this.time.now;
    this.grabbedBy = null;
    pb.velocity.x = e.dir * T.throwX; pb.velocity.y = -T.throwY; this.thrownUntil = now + 900;
    this.hurtPlayer(T.throwDmg, e.x, { knock: false });
    e.ai = 'recover'; e.aiUntil = now + 900; e.fr = 'grab';
    BUS.emit('callout', 'THROWN'); Sfx.whoosh(); this.shake(160, 0.008); this.hitStop(60);
  }
  grappleBreak(e, txt) {
    if (this.grabbedBy !== e) return;
    this.grabbedBy = null; const now = this.time.now, pb = this.player.body;
    e.ai = 'recover'; e.aiUntil = now + 1000; e.stunT = Math.max(e.stunT, 0.8);
    pb.velocity.x = (Math.sign(pb.center.x - e.x) || 1) * 220; pb.velocity.y = -160;
    this.invulnUntil = Math.max(this.invulnUntil, now + 400);
    BUS.emit('callout', txt); Sfx.clang(0.5); this.addStyle(40); this.hitStop(40);
  }
  markPlayer(now) {
    BUS.emit('callout', 'SPOTTED'); Sfx.spotted();
    for (const o of this.enemies.getChildren()) {
      if (!o.alive || o.def.tiny) continue;
      if (isHumanoid(o)) { o.lkx = this.player.x; o.lky = this.player.y; o.lkT = now; }
      if (!o.aggro) this.alertEnemy(o, now);
    }
  }
  swapWith(e) {
    const p = this.player, pb = p.body, b = e.body, pcx = pb.center.x, pbt = pb.bottom, ecx = b.center.x, ebt = b.bottom;
    if (this.reeledBy) this.breakHarpoon('SNAPPED!');
    if (this.clawBy) this.clawRelease(this.clawBy, true);
    if (this.grabbedBy) this.grappleBreak(this.grabbedBy, 'SWAPPED');
    if (this.hook) this.endHook();                                         // a hook line can't follow you through the swap
    for (const [x, y] of [[pcx, pb.center.y], [ecx, b.center.y]]) {     // a violet pop where each of you was
      this.fx.emit(x, y, { n: 16, speed: [40, 160], life: [0.2, 0.5], size: [2, 1], cols: [0xffffff, 0xf0d8ff, 0xb070ff], add: true });
      this.spawnLight(x, y, 'ring', 0xc890ff, 0.2, 1.3, 0.9, 0.25);
    }
    p.body.reset(ecx + (p.x - pcx), ebt + (p.y - pbt)); pb.velocity.set(0, 0);
    b.reset(pcx + (e.x - ecx), pbt + (e.y - ebt)); b.velocity.set(0, 0);
    e.burst = 3; e.burstT = 0.35;
    BUS.emit('callout', 'SWAPPED'); BUS.emit('flash', 0.12); Sfx.swapZap(); this.warpPulse(0.6); this.shake(120, 0.004);
  }

  // ================================================================== finale round ====
  // ---------------------------------------------------------------- multikills ----
  // Kills less than 650 ms apart chain: DOUBLE KILL, TRIPLE, QUAD, PENTA, then MASSACRE. Style for each, a little
  // hit-stop from three up, and the MASSACRE medal for six.
  multiKill(now) {
    this.mkN = now - this.mkLast < TUNE.MULTI.window ? this.mkN + 1 : 1; this.mkLast = now;
    const n = this.mkN; if (n < 2) return;
    BUS.emit('multikill', ['', '', 'DOUBLE KILL', 'TRIPLE KILL', 'QUAD KILL', 'PENTA KILL'][n] || 'MASSACRE', n);
    this.addStyle(25 * n); Sfx.multi(n);
    if (n >= 3) this.hitStop(20 + n * 8);
    if (n >= 6) this.award('massacre');
  }
  hornBlast(e) {
    const T = TUNE.WARHORN, now = this.time.now, cx = e.body.center.x, cy = e.body.center.y; let n = 0;
    for (const o of this.enemies.getChildren()) {
      if (!o.alive || o === e || o.kind === 'warhorn' || o.def.tiny || Math.hypot(o.body.center.x - cx, o.body.center.y - cy) > T.radius) continue;
      if (!(o.rallyT > now)) n++;
      o.rallyT = now + T.time * 1000;
      this.spawnLight(o.body.center.x, o.body.center.y, 'ring', 0xffd040, 0.2, 0.9, 0.8, 0.2);
    }
    this.horns.push({ x: cx + e.dir * 8, y: cy - 4, t: 0 });
    Sfx.warhorn(); this.shake(160, 0.004);
    if (n >= 2 && Math.hypot(this.player.body.center.x - cx, this.player.body.center.y - cy) < 500) BUS.emit('callout', 'RALLIED');
  }
  updateHorns(dt) { for (let i = this.horns.length - 1; i >= 0; i--) if ((this.horns[i].t += dt) > 0.6) this.horns.splice(i, 1); }
  blimpCrash(e, cx, cy) {
    BUS.emit('callout', 'BLIMP DOWN');
    for (let i = 0; i < 4; i++) this.time.delayedCall(i * 150, () => this.boomFx(cx + rand(-14, 14), cy + rand(-8, 8), 0.6));
    const fy = this.floorBelow(cx, cy); if (fy === null) return;
    const t = clamp((fy - cy) / 220, 0.3, 1.4);
    this.time.delayedCall(t * 1000, () => { if (this.state !== 'dead') { this.explode(cx, fy - 6, TUNE.GUNSHIP.crash || TUNE.BARREL); this.spawnFirePatch(cx, fy - 6); this.shake(300, 0.012); } });
  }

  // ================================================================== supply round ====
  // ---------------------------------------------------------------- supply drops + power-ups ----
  // ~22 s into a wave, and every 40 s after, a supply crate floats down on a chute somewhere near you; touch it for a
  // power-up. Elites (150+ HP) drop a capsule 30% of the time. OVERDRIVE x2 damage and HASTE (x1.5 fire, +25% speed)
  // last 10 s; AEGIS soaks the next 60 damage; MEDPACK heals 40.
  dropCrate() {
    const pb = this.player.body;
    for (let k = 0; k < 8; k++) {
      const x = clamp(pb.center.x + rand(-220, 220), 40, LW - 40), fy = this.floorBelow(x, Math.max(40, pb.bottom - 120));   // a floor near your height
      if (fy === null || Math.abs(fy - pb.bottom) > 160) continue;
      let y0 = fy - 8; while (y0 > fy - 200 && y0 > 36 && !this.solidAt(x, y0 - 4)) y0 -= 4;                       // as high as the open air above it goes
      if (fy - y0 < 40) continue;
      this.supplies.push({ x, y: y0, fy, st: 'fall', crate: true, kind: pick(['dmg', 'haste', 'aegis', 'med']), t: 0, img: this.add.image(x, y0, 'supply').setDepth(6.7).setAlpha(0) });
      BUS.emit('callout', 'SUPPLY DROP'); Sfx.whoosh();
      this.spawnLight(x, y0, 'ring', 0x7dffb0, 0.3, 1.5, 0.9, 0.35); this.spawnLight(x, y0, 'glow', 0x7dffb0, 1.2, 0.4, 0.8, 0.35);   // the supply teleporter puts it in the air
      return;
    }
  }
  dropCapsule(x, y) {
    const kind = pick(['dmg', 'haste', 'aegis', 'med']);
    this.supplies.push({ x, y, vy: -160, st: 'cap', crate: false, kind, t: 0, img: this.add.image(x, y, 'capsule').setTint(POWERS[kind].col).setDepth(6.7) });
  }
  updateSupplies(dt, now) {
    const T = TUNE.SUPPLY, g = this.supplyG; g.clear();
    if (this.state === 'play' && this.enemiesLeft > 0 && !this.descending && (this.supplyT -= dt) <= 0) { this.supplyT = T.every; this.dropCrate(); }
    const pb = this.player.body, alive = this.state !== 'dead';
    for (let i = this.supplies.length - 1; i >= 0; i--) {
      const S = this.supplies[i]; S.t += dt;
      if (S.st === 'fall') {                                             // floating down under its chute
        S.y += T.fall * dt; const sw = Math.sin(S.t * 2.5) * 3;
        if (S.y >= S.fy - 6) { S.y = S.fy - 6; S.st = 'land'; this.fxDust(S.x, S.fy, 6); Sfx.clunk(0.7); }
        else {
          const fa = Math.min(1, S.t / 0.3); S.img.setAlpha(fa);          // it fades in, then its chute opens
          g.lineStyle(1, 0xc8c0a8, 0.8 * fa).lineBetween(S.x - 6, S.y - 6, S.x - 12 + sw, S.y - 26).lineBetween(S.x + 6, S.y - 6, S.x + 12 + sw, S.y - 26);
          g.fillStyle(0xd8d0b8, fa).fillRect(Math.round(S.x - 14 + sw), Math.round(S.y - 30), 28, 4); g.fillStyle(0xc83020, fa).fillRect(Math.round(S.x - 4 + sw), Math.round(S.y - 30), 8, 4);
        }
      } else if (S.st === 'cap') {                                       // a capsule pops up, falls and bobs; it drifts to you when close
        const d = Math.hypot(pb.center.x - S.x, pb.center.y - S.y);
        if (d < 70 && alive && S.t > 0.4) { S.x += (pb.center.x - S.x) * Math.min(1, dt * 6); S.y += (pb.center.y - S.y) * Math.min(1, dt * 6); }
        else { S.vy += 600 * dt; S.y += S.vy * dt; if (S.vy > 0 && this.solidAt(S.x, S.y + 5)) { S.y = Math.floor((S.y + 5) / TS) * TS - 5; S.vy = 0; } }
        if (S.t > 14) { S.img.destroy(); this.supplies.splice(i, 1); continue; }
      }
      const bob = S.st === 'cap' && S.vy === 0 ? Math.sin(S.t * 5) * 1.5 : 0;
      S.img.setPosition(S.x, S.y + bob);
      if (S.st !== 'fall' || S.y > S.fy - 40) if (alive && Math.abs(pb.center.x - S.x) < 12 && Math.abs(pb.center.y - S.y) < 16) { this.grantPower(S.kind); S.img.destroy(); this.supplies.splice(i, 1); continue; }
      if (Math.random() < 0.08) this.fx.emit(S.x, S.y, { n: 1, speed: [5, 20], life: [0.3, 0.6], size: [2, 1], cols: [0xffffff, POWERS[S.kind].col], add: true, g: -30 });
    }
    const aura = now < this.dmgUntil ? 0xff3040 : now < this.hasteUntil ? 0xffe040 : this.aegis > 0 ? 0x40b0ff : 0;   // a coloured aura while one runs
    if (aura && alive) this.auraImg.setVisible(true).setPosition(this.player.x, this.player.y).setTint(aura).setScale(1.3 + Math.sin(now / 90) * 0.1).setAlpha(0.35);
    else this.auraImg.setVisible(false);
    if (this.aegis > 0 && alive) g.lineStyle(1, 0x60c0ff, 0.5 + 0.2 * Math.sin(now / 80)).strokeCircle(this.player.x, this.player.y, 14);
  }
  grantPower(kind) {
    const T = TUNE.SUPPLY, now = this.time.now, P2 = POWERS[kind];
    if (kind === 'dmg') this.dmgUntil = now + T.time * 1000;
    else if (kind === 'haste') this.hasteUntil = now + T.time * 1000;
    else if (kind === 'aegis') this.aegis = T.aegis;
    else { this.hp = Math.min(TUNE.PLAYER_HP, this.hp + T.med); BUS.emit('hp', this.hp, 0); }
    BUS.emit('callout', P2.name); Sfx.powerup(); BUS.emit('flash', 0.15);
    this.spawnLight(this.player.x, this.player.y, 'ring', P2.col, 0.2, 2, 0.9, 0.3);
    this.fx.emit(this.player.x, this.player.y, { n: 16, speed: [40, 150], life: [0.3, 0.6], size: [2, 1], cols: [0xffffff, P2.col], add: true, g: -60 });
  }

  // ---------------------------------------------------------------- grenadier ----
  throwGrenade(e) {                                                     // a lobbed grenade that bounces on a 1.6 s fuse; kick it back
    const pb = this.player.body, sx = e.x + e.dir * 4, sy = e.y - 8, G = this.physics.world.gravity.y;
    const dx = pb.center.x + pb.velocity.x * 0.3 - sx, dy = pb.bottom - 6 - sy, FT = clamp(Math.hypot(dx, dy) / 240, 0.45, 1.0);
    const p = this.spawnEProj('nade', sx, sy, dx / FT, (dy - 0.5 * G * FT * FT) / FT);
    if (p) p.life = TUNE.GRENADIER.fuse;
    Sfx.whoosh();
  }
  latchLeech(e) {
    if (e.ai !== 'seek' || this.state === 'dead') return;
    e.ai = 'latched'; e.ox = rand(-5, 5); e.oy = rand(-8, 4); e.drainT = 0.3; this.leechN = (this.leechN || 0) + 1;
    Sfx.squelch(); if (this.leechN === 1) BUS.emit('callout', 'LEECHED! DASH OR KICK');
  }
  shakeLeeches() {
    for (const e of this.enemies.getChildren()) {
      if (!e.alive || e.kind !== 'leech' || e.ai !== 'latched') continue;
      e.ai = 'off'; e.offT = 1; e.stunT = 1; const a = rand(-Math.PI, 0); e.body.setVelocity(Math.cos(a) * 200, Math.sin(a) * 200);
      this.fxBlood(e.x, e.y, 4, a, 1);
    }
    this.leechN = 0;
  }

  // ================================================================== overtime round ====
  // ---------------------------------------------------------------- endless (OVERTIME) waves ----
  // 8 foes, +2 a wave (22 max), tougher kinds coming in as it goes, a mini-boss every 3rd wave of 6 and the Smelter
  // every 6th. Enemy HP +7% a wave. A random modifier 45% of the time. A new arena every 3 waves.
  endlessWave(i) {
    const E = TUNE.ENDLESS, n = Math.min(E.base + i * E.per, E.max), t2 = Math.min(0.7, 0.15 + i * 0.06), out = [];
    const rnd = this.mode.foeRng(this, i), pk = a => a[Math.floor(rnd() * a.length)];
    const T1 = ['grunt', 'drone', 'stalker', 'enforcer', 'tick', 'heavy', 'sniper', 'mender', 'slagling', 'gasbag', 'sparker', 'mimic', 'creeper', 'pogo', 'grenadier', 'spikeball', 'slug', 'hoser', 'demo', 'gull', 'clinger'];
    const T2 = ['bulwark', 'rocketeer', 'wasp', 'sapper', 'screamer', 'cloaker', 'pyro', 'harpooner', 'tarspit', 'buzzsaw', 'roller', 'duelist', 'blinker', 'magnet',
                'welder', 'jammer', 'howitzer', 'hive', 'brood', 'mirror', 'stitcher', 'rammer', 'jet', 'warden', 'golem', 'echo', 'pilferer', 'linker',
                'para', 'lugger', 'blimp', 'strider', 'beacon', 'leech', 'wraith', 'chiller', 'warhorn',
                'orbiter', 'swapper', 'scorcher', 'grappler', 'spotter', 'hound', 'torcher', 'discus', 'sporepod', 'vortex', 'pylon', 'scavenger', 'shellback', 'shinobi', 'thundercloud', 'headsman', 'berserker', 'bastion', 'zealot', 'minelayer', 'ratking', 'porcupine', 'sponge', 'leaper', 'bulldozer', 'copycat', 'jelly', 'cinder', 'gatling', 'banner', 'flailer', 'panzer', 'reaper', 'overclock', 'refractor', 'mirage'];
    while (out.length < n) {
      const kind = pk(rnd() < t2 ? T2 : T1);
      if (kind === 'linker') { out.push(['linker', 'A'], ['linker', 'A']); continue; }
      out.push([kind, FLIERS.has(kind) ? 'A' : 'G']);
    }
    if (i % 6 === 2) { const mb = ['gunship', 'jugg', 'wyrm'][Math.floor(i / 6) % 3]; out.push([mb, mb === 'gunship' ? 'A' : 'G']); }
    if (i % 6 === 5) out.push([OT_BOSSES[Math.floor(i / 6) % OT_BOSSES.length][0], 'B']);   // the seven bosses take turns, the Smelter first
    return out;
  }
  pilfer(e) {
    if (e.ai !== 'seek' || this.state === 'dead') return;
    const i = this.weapon; e.ai = 'flee';
    if (this.locked.size >= this.weaponSlots.length - 1) return;
    e.stolen = i; this.locked.add(i); this.cycleWeapon(-1); BUS.emit('locked', [...this.locked]);
    e.gunImg = this.add.image(e.x, e.y + 7, 'icon_' + WEAPONS[i].gun).setDepth(6);
    BUS.emit('callout', 'GUN STOLEN!'); Sfx.snatch(); this.shake(80, 0.003);
    this.fx.emit(this.player.x, this.player.y, { n: 8, speed: [40, 120], life: [0.2, 0.4], size: [2, 1], cols: [0xffffff, 0xff8090], add: true });
  }
  clawRelease(e, broke) {
    if (!e.grab) return;
    e.grab = false; e.ai = 'rise';
    if (this.clawBy === e) {
      this.clawBy = null;
      const pb = this.player.body;
      if (broke) { pb.velocity.set(0, -120); BUS.emit('callout', 'BROKE FREE'); this.addStyle(30); }
      else { pb.velocity.x = (Math.random() < 0.5 ? -1 : 1) * TUNE.CLAW.throwV; pb.velocity.y = 160; this.jumpCuttable = false; }   // flung down and away
      Sfx.clank();
    }
  }
  updateSparkLinks(dt, now) {
    this.sparkLinks = [];
    const sp = this.enemies.getChildren().filter(e => e.alive && e.kind === 'sparker' && !(e.netT > 0) && !(e.frozen > 0));
    if (sp.length < 2) return;
    const T = TUNE.SPARKER, pb = this.player.body;
    for (let i = 0; i < sp.length; i++) for (let j = i + 1; j < sp.length; j++) {
      const a = sp[i], c = sp[j], ax = a.x, ay = a.y - 3, cx = c.x, cy = c.y - 3;
      if (Math.hypot(cx - ax, cy - ay) > T.link || !this.los(ax, ay, cx, cy)) continue;
      this.sparkLinks.push([ax, ay, cx, cy]);
      if (this.waters.length) { const n = Math.ceil(Math.hypot(cx - ax, cy - ay) / 12); for (let k = 0; k <= n; k++) this.electrifyWater(ax + (cx - ax) * k / n, ay + (cy - ay) * k / n, 10); }
      if (this.state !== 'dead' && now > this.sparkHitT && this.segDist(pb.center.x, pb.center.y, ax, ay, cx, cy)[0] < 8) {
        this.sparkHitT = now + 500; this.hurtPlayer(T.dmg, pb.center.x, { knock: false }); Sfx.zap(); this.fxSparks(pb.center.x, pb.center.y, 6, 0, Math.PI * 2, [60, 160]);
      }
      for (const o of this.enemies.getChildren()) if (o.alive && o.kind !== 'sparker' && !o.under && (o.sparkT || 0) < now && this.segDist(o.body.center.x, o.body.center.y, ax, ay, cx, cy)[0] < 7) { o.sparkT = now + 500; this.damageEnemy(o, 8, 0, 0, 'arc'); }
    }
    if (this.sparkLinks.length && Math.random() < dt * 4) Sfx.buzz();
  }
  golemThrow(e) {
    const pb = this.player.body, G = this.physics.world.gravity.y, sx = e.x + e.dir * 10, sy = e.body.top - 2;
    const dx = pb.center.x + pb.velocity.x * 0.3 - sx, dy = pb.bottom - 4 - sy, FT = clamp(Math.hypot(dx, dy) / 260, 0.5, 1.1);
    const p = this.spawnEProj('scrap', sx, sy, dx / FT, (dy - 0.5 * G * FT * FT) / FT);
    if (p) p.life = FT + 0.8;
    Sfx.whoosh(); this.fxDust(sx, sy, 3);
  }

  // ================================================================== ironclad round ====
  // ---------------------------------------------------------------- medals ----
  award(id) {
    if (!this.mode.lifetime || this.medals.has(id)) return;
    this.medals.add(id);
    const m = MEDALS.find(q => q.id === id); if (!m) return;
    BUS.emit('medal', m);
    try { const all = loadMedals(); if (!all.includes(id)) { all.push(id); localStorage.setItem('slaghouse.medals', JSON.stringify(all)); } } catch (err) { /* private mode */ }
  }
  updateEmpRings(dt, now) {
    const T = TUNE.JAMMER, pb = this.player.body;
    for (let i = this.empRings.length - 1; i >= 0; i--) {
      const R2 = this.empRings[i]; R2.r += T.ring * dt;
      if (R2.r >= T.reach) { this.empRings.splice(i, 1); continue; }
      if (this.waters.length) this.electrifyWater(R2.x, R2.y, R2.r);
      if (!R2.hitP && this.state !== 'dead' && Math.abs(Math.hypot(pb.center.x - R2.x, pb.center.y - R2.y) - R2.r) < 10) {
        R2.hitP = true;
        if (now < this.dashIUntil) { this.dashDodge(); continue; }              // dashed through the ring
        this.jamUntil = now + T.jam * 1000; BUS.emit('jam', T.jam); Sfx.jammed(); BUS.emit('callout', 'JAMMED!');
        if (this.sentry) this.sentry.offUntil = now + 3000;
        this.fxSparks(pb.center.x, pb.center.y, 10, 0, Math.PI * 2, [60, 180]);
      }
      if (this.sentry && !R2.sHit && Math.abs(Math.hypot(this.sentry.x - R2.x, this.sentry.y - 10 - R2.y) - R2.r) < 10) { R2.sHit = true; this.sentry.offUntil = now + 3000; }
    }
  }

  // ================================================================== slagforge round ====
  // ---------------------------------------------------------------- perks ----
  offerPerks(next) {
    const opening = this.campaign && this.wave === 0 ? OPENING_PERKS : null;
    const pool = PERKS.filter(q => !this.perks[q.id] && (!opening || opening.includes(q.id)));
    if (!pool.length || this.state !== 'play') { next(); return; }
    const ids = [];
    while (ids.length < 3 && pool.length) ids.push(pool.splice(opening ? 0 : randi(0, pool.length - 1), 1)[0].id);
    this.perkOffer = ids; this.perkNext = next;
    BUS.emit('perks', ids); Sfx.ui();
  }
  onPerkPick(id) {
    if (this.state !== 'play' || !this.perkOffer || !this.perkOffer.includes(id)) return;
    this.perks[id] = true;
    this.perkPicked = this.campaign;
    const P = PERKS.find(q => q.id === id), next = this.perkNext, pl = this.player;
    this.perkOffer = null; this.perkNext = null;
    BUS.emit('perkdone'); BUS.emit('callout', P.name); BUS.emit('perklist', Object.keys(this.perks));
    Sfx.pickup(); this.spawnLight(pl.x, pl.y, 'ring', 0xc8a0ff, 0.2, 2, 0.9, 0.3); this.spawnLight(pl.x, pl.y, 'glow', 0xa070ff, 1.5, 2.5, 0.7, 0.25);
    this.fx.emit(pl.x, pl.y, { n: 16, speed: [40, 140], life: [0.3, 0.6], size: [2, 1], cols: [0xffffff, 0xd0b8ff, 0x8a60ff], add: true, g: -60 });
    this.time.delayedCall(700, () => { if (this.state === 'play' && next) next(); });
  }
  duelistAfterHit(e) {                                                   // a cut landed: keep the combo going if there's one left
    const b = e.body;
    if ((e.combo || 0) < 2) { e.combo = (e.combo || 0) + 1; e.ai = 'windup'; e.aiUntil = this.time.now + TUNE.DUELIST.comboMs; b.velocity.x = 0; }
    else { e.combo = 0; e.ai = 'recover'; e.aiUntil = this.time.now; e.attackCd = rand(0.8, 1.2); b.velocity.x = -e.dir * 150; b.velocity.y = -200; }
  }

  // ---------------------------------------------------------------- mimic ----
  // Sits among the drums looking exactly like one. Get within 46 px (or shoot, burn or grab it) and it bares its teeth,
  // then scuttles after you and leaps to bite (15). It's still a drum inside: it blows when it dies.
  mimicReveal(e, now) {
    if (e.ai !== 'hide') return;
    e.ai = 'reveal'; e.aiUntil = now + 450; e.aggro = true; e.aggroT = 6; e.dir = this.player.x >= e.x ? 1 : -1;
    e.body.velocity.y = -160; Sfx.growl(false); Sfx.chomp(); Sfx.clang(0.6);
    this.popAlert(e); BUS.emit('callout', 'MIMIC!'); this.shake(120, 0.004);
    this.fxSparks(e.x, e.y - 6, 6, -Math.PI / 2, 1.2);
  }
  howitzerShell(e, i) {
    const T = TUNE.HOWITZER, pb = this.player.body, G = this.physics.world.gravity.y, FT = T.flight;
    const x0 = e.x + e.dir * 10, y0 = e.body.top - 4;
    const tx = clamp(pb.center.x + pb.velocity.x * 0.5 + (i - 1) * 34 + rand(-8, 8), 30, LW - 30);
    let ty = pb.bottom;
    for (let yy = pb.bottom - 4; yy < pb.bottom + 140; yy += 4) if (this.standAt(tx, yy)) { ty = Math.floor(yy / TS) * TS; break; }
    const p = this.spawnEProj('shell', x0, y0, (tx - x0) / FT, (ty - 3 - y0 - 0.5 * G * FT * FT) / FT); if (!p) return;
    p.life = FT + 0.6;
    this.spawnLight(tx, ty - 2, 'ring', 0xff4020, 1.4, 0.4, 0.9, FT); this.spawnLight(tx, ty - 2, 'glow', 0xff3010, 1.4, 1.0, 0.6, FT);   // landing marker
    this.fxSmoke(x0, y0, 5);
    this.fx.emit(x0, y0, { n: 6, angle: e.dir > 0 ? -1.1 : -Math.PI + 1.1, spread: 0.6, speed: [60, 160], life: [0.1, 0.25], size: [3, 1], cols: [0xffffff, 0xffe46a, 0xff8a1f], add: true });
    Sfx.mortar(); if (Math.hypot(this.player.x - e.x, this.player.y - e.y) < 320) this.shake(70, 0.0025);
  }

  // ---------------------------------------------------------------- blinker ----
  // Teleporting striker. It vanishes, a violet shimmer marks where it'll appear (0.45 s, just behind you), it
  // materialises with its blade up (0.32 s) and dashes straight through you (16), then hangs exposed for 0.9 s
  // before it blinks away. Untouchable while it's gone.
  blinkOut(e, why) {
    const T = TUNE.BLINKER, pb = this.player.body, now = this.time.now;
    this.spawnLight(e.x, e.y, 'ring', 0xc080ff, 1.2, 0.1, 0.9, 0.2);
    this.fx.emit(e.x, e.y, { n: 12, speed: [30, 120], life: [0.2, 0.4], size: [2, 1], cols: [0xffffff, 0xd0a0ff, 0x8040e0], add: true });
    Sfx.blink();
    e.under = true; e.setVisible(false); e.body.setVelocity(0, 0);
    let tx = e.x, ty = e.y;
    for (let k = 0; k < 10; k++) {                                       // find open air for the destination
      if (why === 'strike') { const side = Math.abs(pb.velocity.x) > 20 ? -Math.sign(pb.velocity.x) : (Math.random() < 0.5 ? -1 : 1); tx = pb.center.x + side * rand(46, 70); ty = pb.center.y - rand(6, 26); }
      else { const a = rand(0, Math.PI * 2); tx = pb.center.x + Math.cos(a) * rand(120, 170); ty = pb.center.y - Math.abs(Math.sin(a)) * 90; }
      tx = clamp(tx, 40, LW - 40); ty = clamp(ty, 40, LH - 40);
      if (!this.solidAt(tx, ty) && !this.solidAt(tx, ty - 9) && !this.solidAt(tx, ty + 9) && !this.solidAt(tx - 6, ty) && !this.solidAt(tx + 6, ty)) break;
      tx = e.x; ty = e.y;
    }
    const ms = why === 'strike' ? T.tellMs : 500;
    Object.assign(e, { tx, ty, ai: 'out', aiUntil: now + ms, next: why });
    this.spawnLight(tx, ty, 'ring', 0xc080ff, 0.1, 1.3, 0.9, ms / 1000);   // the shimmer where it'll appear
  }
  blinkIn(e) {
    const T = TUNE.BLINKER, now = this.time.now;
    e.body.reset(e.tx, e.ty); e.setVisible(true); e.under = false;
    this.spawnLight(e.tx, e.ty, 'glow', 0xc080ff, 1.0, 0.4, 0.7, 0.18);
    this.fx.emit(e.tx, e.ty, { n: 10, speed: [20, 90], life: [0.2, 0.35], size: [2, 1], cols: [0xffffff, 0xd0a0ff, 0x8040e0], add: true });
    Sfx.blink();
    if (e.next === 'strike') { e.ai = 'tell'; e.aiUntil = now + T.windMs; }
    else { e.ai = 'float'; e.homeX = e.tx; e.homeY = e.ty; e.cd = T.cd * rand(0.8, 1.2); }
  }

  // ================================================================== expansion: enemies ====
  // Ten foes for OVERTIME, the DAILY and the Lab (the campaign never sees them). The hooks they share: a record's
  // armour method adjusts each hit in damageEnemy, its contact method runs in onTouchEnemy instead of the plain bite,
  // a foe an overclocker links thinks and moves fast (hasteK in updateEnemies), and updateXFoes steps what outlives
  // its foe (a decoy's bolts, a dropped bundle) and wipes the layer their chains and jets are drawn on.
  updateXFoes(dt, now) {
    const X = this.xfoes, pb = this.player.body; X.g.clear();
    if (X.soakUntil > now && this.state !== 'dead' && Math.random() < 0.5) this.fx.emit(pb.center.x + rand(-5, 5), pb.center.y + rand(-9, 6), { n: 1, angle: Math.PI / 2, spread: 0.3, speed: [10, 40], life: [0.3, 0.5], size: [2, 1], cols: [0xe8f8ff, 0x7cc8f0], add: true, g: 300 });   // soaked: dripping
    for (let i = X.fakes.length - 1; i >= 0; i--) {                    // a decoy's bolts: they look the part and do nothing
      const F = X.fakes[i]; F.t -= dt; F.x += F.vx * dt; F.y += F.vy * dt;
      const onP = this.state !== 'dead' && F.x > pb.left - 2 && F.x < pb.right + 2 && F.y > pb.top - 2 && F.y < pb.bottom + 2;
      if (F.t <= 0 || onP || this.solidAt(F.x, F.y)) { if (onP) this.xGlitch(F.x, F.y, 4); F.img.destroy(); X.fakes.splice(i, 1); continue; }
      F.img.setPosition(F.x, F.y);
    }
    const kick = X.bundles.length ? this.xKick(now) : null, G = this.physics.world.gravity.y;
    for (let i = X.bundles.length - 1; i >= 0; i--) {                  // dynamite a dead runner dropped: it still goes off (shoot it or kick it away)
      const B = X.bundles[i]; B.t -= dt;
      if (kick && B.x > kick.l - 6 && B.x < kick.r + 6 && B.y > kick.t - 6 && B.y < kick.b + 6) { B.vx = kick.f * 320; B.vy = -220; BUS.emit('callout', 'PUNTED'); }
      B.vy += G * dt;
      const nx = B.x + B.vx * dt, ny = B.y + B.vy * dt;
      if (this.solidAt(nx, B.y)) B.vx *= -0.4; else B.x = nx;
      if (B.vy > 0 && this.standAt(B.x, ny + 3)) { B.vy = Math.abs(B.vy) > 60 ? -B.vy * 0.3 : 0; B.vx *= 0.7; } else if (this.solidAt(B.x, ny - 3)) B.vy = Math.max(0, B.vy); else B.y = ny;
      let shot = null;
      for (const bl of this.bulletList) if (bl.active && Math.abs(bl.x - B.x) < 6 && Math.abs(bl.y - B.y) < 6) { shot = bl; break; }
      if (shot) shot.disableBody(true, true);
      if (Math.random() < 0.6) this.fx.emit(B.x, B.y - 4, { n: 1, angle: -Math.PI / 2, spread: 1.4, speed: [20, 70], life: [0.1, 0.25], size: [2, 1], cols: [0xffffff, 0xffe46a, 0xff8a1f], add: true });
      B.rot += B.vx * dt * 0.05; B.img.setPosition(Math.round(B.x), Math.round(B.y)).setRotation(B.rot);
      if (B.t > 0 && !shot) continue;
      B.img.destroy(); X.bundles.splice(i, 1);
      this.explode(B.x, B.y, shot ? TUNE.DEMO.shot : TUNE.DEMO.boom); this.paintScorch(B.x, B.y + 3, 12);
      if (shot) { BUS.emit('callout', 'BUNDLE SHOT'); this.addStyle(50); }
    }
  }
  hasteK(e, now) {                                                      // an overclocked foe: undo last frame's boost, then say how fast it runs now (1 for the rest)
    if (e.hasteV) { e.body.velocity.x /= e.hasteV; if (FLIERS.has(e.kind)) e.body.velocity.y /= e.hasteV; e.hasteV = 0; }
    return e.hasteT > now ? TUNE.OVERCLOCK.haste : 1;
  }
  hasteOut(e, k) { e.hasteV = k; e.body.velocity.x *= k; if (FLIERS.has(e.kind)) e.body.velocity.y *= k; }
  xKick(now) {                                                          // the boot's reach on the frame a kick lands (bootKick sets kickUntil 180 ms on), null on any other
    if (this.kickUntil !== now + 180 || this.state === 'dead') return null;
    const p = this.player, f = this.facing, xa = p.x + f * 2, xb = p.x + f * (TUNE.KICK.range + 2);
    return { l: Math.min(xa, xb), r: Math.max(xa, xb), t: p.y - 14, b: p.y + 12, f };
  }
  xGlitch(x, y, n) { this.fx.emit(x, y, { n, speed: [20, 90], life: [0.15, 0.35], size: [3, 1], cols: [0xffffff, 0x46e6ff, 0xff60e0], add: true, drag: 3 }); }
  xSteam(x, y) { this.fx.emit(x, y, { n: 8, angle: -Math.PI / 2, spread: 1, speed: [10, 50], life: [0.4, 0.9], size: [3, 7], cols: [0xe8f0f4, 0xb0bcc4], alpha: [0.5, 0], g: -40, drag: 2 }); }
  xAlert(e, now, dist, near, alive) {                                   // a ground foe wakes when it sees you or you come close
    if (alive && !e.aggro && (e.sees || dist < near) && dist < e.def.sight) this.alertEnemy(e, now);
    if (e.ai === 'alert' || e.ai === 'patrol') e.ai = 'walk';
  }
  xKeep(e, T, dx, onG, keep) {                                          // hold [near, far] px off you along the floor, hopping a step
    const b = e.body, ax = Math.abs(dx); e.dir = dx >= 0 ? 1 : -1;
    let mv = ax > keep[1] ? e.dir : ax < keep[0] ? -e.dir : 0;
    if (mv && !this.stepOk(b.center.x + mv * 10, b.bottom)) mv = 0;
    b.velocity.x = mv * T.speed;
    if (mv && onG && (b.blocked.left || b.blocked.right)) b.velocity.y = -KEEPER_HOP;
  }
  xStep(e, dt, rate) { if (Math.abs(e.body.velocity.x) > 3) { e.stepK += dt * rate; e.fr = Math.floor(e.stepK) % 2 ? 'w1' : 'w0'; } else e.fr = 'w0'; }
  xTurn(a, b, d) { return a + clamp(Math.atan2(Math.sin(b - a), Math.cos(b - a)), -d, d); }
  flailHand(e, fr = e.fr) { const o = fr === 'wind' ? [-3, -8] : fr === 'throw' ? [9, -2] : fr === 'w1' ? [4, -3] : [4, -2]; return [e.x + o[0] * e.dir, e.y + o[1]]; }
  flailThrow(e) {                                                       // the hurl: straight at you, the chain paying out behind
    const T = TUNE.FLAILER, pb = this.player.body;
    e.dir = pb.center.x >= e.x ? 1 : -1;
    const a = Math.atan2(pb.center.y - e.by, pb.center.x - e.bx);
    Object.assign(e, { ai: 'throw', fr: 'throw', bvx: Math.cos(a) * T.throwSpeed, bvy: Math.sin(a) * T.throwSpeed, pHitT: 0 });
    e.hitMap.clear(); Sfx.whoosh(); this.shake(60, 0.002);
  }
  flailHits(e, now, pdmg, edmg, ux, uy) {                              // the ball bites you and any other foe it swings through
    const pb = this.player.body, x = e.bx, y = e.by, R0 = 6;
    if (this.state !== 'dead' && now >= e.pHitT && x > pb.left - R0 && x < pb.right + R0 && y > pb.top - R0 && y < pb.bottom + R0) {
      e.pHitT = now + 500;
      if (this.hurtPlayer(pdmg, x - ux * 10, { srcY: y })) { this.fxBlood(pb.center.x, pb.center.y, 8, Math.atan2(uy, ux), 1); Sfx.kickHit(); }
    }
    for (const o of this.enemies.getChildren()) {
      if (!o.alive || o === e || o.under || (e.hitMap.get(o) || 0) > now) continue;
      const ob = o.body; if (x < ob.left - R0 || x > ob.right + R0 || y < ob.top - R0 || y > ob.bottom + R0) continue;
      e.hitMap.set(o, now + 500); this.damageEnemy(o, edmg, ux, uy, 'saw');
      if (o.def.mech) this.fxSparks(x, y, 4); else this.fxBlood(x, y, 5, Math.atan2(uy, ux), 1);
    }
  }
  hoseNozzle(e) { return [e.x + 6 * e.dir, e.y - (e.fr === 'brace' || e.fr === 'spray' ? 1 : 0)]; }
  hoseAim(e) { return e.dir > 0 ? e.el : Math.PI - e.el; }
  hoseTrack(e, dt, rate) {                                              // swing the nozzle toward you (never round behind its back)
    const pb = this.player.body, [nx, ny] = this.hoseNozzle(e);
    e.el = approach(e.el, clamp(Math.atan2(pb.center.y - ny, Math.abs(pb.center.x - nx)), -1.1, 1.1), rate * dt);
  }
  hoseSpray(e, dt, now) {                                               // the jet: shove, sting and soak what it hits; douse what burns
    const T = TUNE.HOSER, pb = this.player.body, [x0, y0] = this.hoseNozzle(e), a = this.hoseAim(e), ca = Math.cos(a), sa = Math.sin(a);
    let x1 = x0, y1 = y0;
    for (let d = 4; d <= T.range; d += 4) { const qx = x0 + ca * d, qy = y0 + sa * d; if (this.solidAt(qx, qy)) break; x1 = qx; y1 = qy; }
    e.jx = x1; e.jy = y1;
    const near = (x, y) => this.segDist(x, y, x0, y0, x1, y1)[0];
    if (this.state !== 'dead' && now >= this.dashUntil && near(pb.center.x, pb.center.y) < 9) {
      pb.velocity.x = approach(pb.velocity.x, ca * T.blast, T.push * dt);
      pb.velocity.y = approach(pb.velocity.y, sa * T.blast * 0.7, T.push * dt * 0.5);
      if (pb.blocked.down || pb.touching.down) { pb.velocity.y = Math.min(pb.velocity.y, -110); this.lastGround = -1e9; this.jumpCuttable = false; }
      this.siphonUntil = Math.max(this.siphonUntil, now + T.soak * 1000);   // soaked: the drag the siphon puts on your legs
      this.xfoes.soakUntil = now + T.soak * 1000;
      if ((e.hitT -= dt) <= 0) { e.hitT = T.tick; this.hurtPlayer(T.dmg, x0, { knock: false, iframes: false, srcY: y0 }); }
    }
    for (const o of this.enemies.getChildren()) {                       // foes get washed back, and put out
      if (!o.alive || o === e || o.under) continue;
      const ob = o.body; if (near(ob.center.x, ob.center.y) > ob.halfWidth + 5) continue;
      if (o.burnT > 0) { o.burnT = 0; o.panicT = 0; this.xSteam(ob.center.x, ob.center.y); Sfx.sizzle(); }
      if (o.def.kb > 0.15 && !o.tbHeld) { o.stunT = Math.max(o.stunT, 0.15); ob.velocity.x = approach(ob.velocity.x, ca * 240 * o.def.kb, 1600 * dt); }
    }
    for (let j = this.puddles.length - 1; j >= 0; j--) {                // fire on the floor goes out in a hiss
      const Q = this.puddles[j]; if (!Q.fire || near(Q.x, Q.y - 3) > Q.w / 2 + 4) continue;
      this.puddles.splice(j, 1); this.xSteam(Q.x, Q.y - 3); Sfx.sizzle();
    }
    for (const rd of this.ragdolls) if (rd.burnT > 0 && near(rd.pts[2].x, rd.pts[2].y) < 10) rd.burnT = 0;
    if ((e.pudT -= dt) <= 0) { e.pudT = 0.35; this.spawnWater(x1, y1, 14); }
    for (let k = 0; k < 3; k++) { const t = Math.random(); this.fx.emit(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, { n: 1, angle: a, spread: 0.6, speed: [40, 140], life: [0.15, 0.35], size: [2, 1], cols: [0xffffff, 0xbfe4ff, 0x4a90d0], g: 300 }); }
    this.fx.emit(x1, y1, { n: 3, angle: a + Math.PI, spread: 2.4, speed: [40, 160], life: [0.2, 0.5], size: [3, 1], cols: [0xffffff, 0xbfe4ff, 0x4a90d0], g: 500, mode: 1 });
  }
  demoBoom(e, shot) {
    if (!e.alive) return;
    const b = e.body, x = b.center.x + e.dir * 5, y = b.center.y, fy = b.bottom;
    e.blown = true; this.killEnemy(e, 0, -1, 'tickboom');
    this.explode(x, y, shot ? TUNE.DEMO.shot : TUNE.DEMO.boom); this.paintScorch(x, fy, 14);
    if (shot) { BUS.emit('callout', 'BUNDLE SHOT'); this.addStyle(60); }
  }
  panzerAim(e, now) {                                                   // pick the landing spot, mark it and raise the gun
    const T = TUNE.PANZER, pb = this.player.body, G = this.physics.world.gravity.y, FT = T.flight;
    const tx = clamp(pb.center.x + pb.velocity.x * 0.35, 30, LW - 30);
    let ty = pb.bottom;
    for (let yy = pb.bottom - 4; yy < pb.bottom + 160; yy += 4) if (this.standAt(tx, yy)) { ty = Math.floor(yy / TS) * TS; break; }
    const vx = (tx - e.x) / FT, vy = (ty - 3 - (e.y - 4) - 0.5 * G * FT * FT) / FT;
    e.lob = { tx, ty, a: Math.atan2(vy, vx) }; e.ai = 'aim'; e.aiUntil = now + T.aimMs;
    const mark = T.aimMs / 1000 + FT;
    this.spawnLight(tx, ty - 2, 'ring', 0xff4020, 1.4, 0.4, 0.9, mark); this.spawnLight(tx, ty - 2, 'glow', 0xff3010, 1.4, 1.0, 0.6, mark);
    Sfx.creak();
  }
  panzerFire(e) {
    const T = TUNE.PANZER, L = e.lob, G = this.physics.world.gravity.y, FT = T.flight, mx = e.x + Math.cos(e.aimA) * 13, my = e.y - 4 + Math.sin(e.aimA) * 13;
    const p = this.spawnEProj('shell', mx, my, (L.tx - mx) / FT, (L.ty - 3 - my - 0.5 * G * FT * FT) / FT);
    if (p) p.life = FT + 0.6;
    e.ai = 'walk'; e.cd = rand(T.cd[0], T.cd[1]); e.recoil = 3;
    this.fxSmoke(mx, my, 5); this.fx.emit(mx, my, { n: 6, angle: e.aimA, spread: 0.6, speed: [60, 160], life: [0.1, 0.25], size: [3, 1], cols: [0xffffff, 0xffe46a, 0xff8a1f], add: true });
    Sfx.mortar(); if (Math.hypot(this.player.x - e.x, this.player.y - e.y) < 320) this.shake(70, 0.0025);
  }
  reaperCut(e, now) {                                                   // the whirl: steel all round it
    const T = TUNE.REAPER, pb = this.player.body, cx = e.body.center.x, cy = e.body.center.y - 2, R0 = T.r;
    if (this.state !== 'dead' && now >= e.pHitT && pb.right > cx - R0 && pb.left < cx + R0 && pb.bottom > cy - R0 && pb.top < cy + R0) {
      e.pHitT = now + T.tick * 1000;
      if (this.hurtPlayer(T.dmg, cx, { srcY: cy })) { this.fxBlood(pb.center.x, pb.center.y, 8, 0, Math.PI * 2, [60, 200]); Sfx.slash(); }
    }
    for (const o of this.enemies.getChildren()) {
      if (!o.alive || o === e || o.under || (e.hitMap.get(o) || 0) > now) continue;
      const ob = o.body; if (ob.right < cx - R0 || ob.left > cx + R0 || ob.bottom < cy - R0 || ob.top > cy + R0) continue;
      e.hitMap.set(o, now + T.tick * 1000); this.damageEnemy(o, T.edmg, Math.sign(ob.center.x - cx) || 1, -0.3, 'saw');
      if (o.def.mech) this.fxSparks(ob.center.x, ob.center.y, 4); else this.fxBlood(ob.center.x, ob.center.y, 5, 0, Math.PI * 2);
    }
  }
  gullDive(e) {                                                         // an arc that bottoms out where you'll be, then climbs out the far side
    const T = TUNE.GULL, b = e.body, pb = this.player.body, x0 = b.center.x, y0 = b.center.y;
    const px = pb.center.x + pb.velocity.x * 0.3, py = pb.center.y + 2, t1 = clamp(Math.hypot(px - x0, py - y0) / 300, T.dive[0], T.dive[1]), vy0 = 2 * (py - y0) / t1;
    const vx = (px - x0) / t1;
    Object.assign(e, { ai: 'dive', diveT: 0, dT: t1, ga: -vy0 / t1, diveY: y0, hitP: false });
    b.setVelocity(vx, vy0); e.dir = vx >= 0 ? 1 : -1;
    Sfx.whoosh();
  }
  overclockable(o) { return o.alive && !o.under && !o.def.tiny && o.kind !== 'overclock' && !o.def.boss && !o.def.miniBoss; }
  refractorTrace(x, y, a, bounces, range) {                             // a ray that banks off solid tiles: its corner points
    const pts = [[x, y]]; let ca = Math.cos(a), sa = Math.sin(a), n = 0;
    for (let left = range; left > 0; left -= 2) {
      const nx = x + ca * 2, ny = y + sa * 2;
      if (!this.solidAt(nx, ny)) { x = nx; y = ny; continue; }
      pts.push([x, y]); if (n++ >= bounces) return pts;
      const hx = this.solidAt(nx, y), hy = this.solidAt(x, ny);
      if (hx && !hy) ca = -ca; else if (hy && !hx) sa = -sa; else { ca = -ca; sa = -sa; }
    }
    pts.push([x, y]); return pts;
  }
  refractorAim(e) {                                                     // a line to you: straight, or banked off a wall or two
    const T = TUNE.REFRACTOR, pb = this.player.body, ox = e.x, oy = e.y - 3, px = pb.center.x, py = pb.center.y;
    const hit = pts => { for (let i = 1; i < pts.length; i++) if (this.segDist(px, py, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1])[0] < 7) return i; return 0; };
    const direct = this.refractorTrace(ox, oy, Math.atan2(py - oy, px - ox), T.bounces, T.range), straight = hit(direct) === 1;
    if (straight && Math.random() >= T.bank) return direct;
    let best = null, bi = 9; const k0 = randi(0, 119);
    for (let k = 0; k < 120; k++) { const q = this.refractorTrace(ox, oy, (k0 + k) / 120 * Math.PI * 2, T.bounces, T.range), h = hit(q); if (h > 1 && h < bi) { bi = h; best = q; } }
    return best || (straight ? direct : null);
  }
  refractorBurn(e) {                                                    // the beam: everything on its path
    const T = TUNE.REFRACTOR, pb = this.player.body, P = e.beam;
    for (let i = 1; i < P.length; i++) {
      const [x0, y0] = P[i - 1], [x1, y1] = P[i], L = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / L, uy = (y1 - y0) / L;
      if (!e.hitP && this.state !== 'dead' && this.segDist(pb.center.x, pb.center.y, x0, y0, x1, y1)[0] < T.near + 3) {
        e.hitP = true;
        if (this.hurtPlayer(T.dmg, x0, { srcY: y0 })) this.fxSparks(pb.center.x, pb.center.y, 8, Math.atan2(uy, ux), 1.2);
      }
      for (const o of this.enemies.getChildren()) {
        if (!o.alive || o === e || o.under || e.eHit.has(o)) continue;
        const ob = o.body; if (this.segDist(ob.center.x, ob.center.y, x0, y0, x1, y1)[0] > Math.max(ob.halfWidth, ob.halfHeight) + 2) continue;
        e.eHit.add(o); this.damageEnemy(o, T.edmg, ux, uy, 'rail');
      }
    }
  }
  mirageShot(o, fake) {                                                 // a bolt at you; a decoy's is only light
    const T = TUNE.MIRAGE, pb = this.player.body, x = o.x + 7 * o.dir, y = o.y - 2, a = Math.atan2(pb.center.y - y, pb.center.x - x) + rand(-0.08, 0.08);
    if (fake) this.xfoes.fakes.push({ img: this.add.image(x, y, 'ebullet').setBlendMode(ADD).setDepth(9).setRotation(a), x, y, vx: Math.cos(a) * T.boltSpeed, vy: Math.sin(a) * T.boltSpeed, t: 1.6 });
    else this.spawnEBullet(x, y, a, T.boltSpeed, T.dmg);
    Sfx.eshot(); this.spawnLight(x, y, 'glow', 0xff60e0, 0.3, 0.7, 0.7, 0.06);
  }
  mirageCast(e) {                                                       // three of it: it takes one spot, holograms the other two
    const T = TUNE.MIRAGE, b = e.body, y = e.y, feet = b.bottom, spots = [];
    for (const off of [-T.spread, 0, T.spread]) {
      let x = clamp(e.x + off, 20, LW - 20);
      for (let k = 0; k < 7 && off && !(this.standAt(x, feet + 2) && !this.solidAt(x, feet - 10)); k++) x -= Math.sign(off) * 8;   // back toward it until there's floor
      spots.push(x);
    }
    const mine = randi(0, 2);
    e.ai = 'walk'; e.castCd = rand(T.castCd[0], T.castCd[1]); e.fireCd = Math.min(e.fireCd, rand(0.5, 1.2));
    for (const D of e.decoys) D.img.destroy();
    e.decoys = [];
    spots.forEach((x, i) => {
      this.xGlitch(x, y, 10); this.spawnLight(x, y, 'glow', 0xb070ff, 1, 2.2, 0.8, 0.25);
      if (i === mine) { b.reset(x, y); return; }
      e.decoys.push({ img: this.add.sprite(x, y, 'mirage', 'w0').setDepth(5), x, y, feet, off: x - spots[mine], dir: e.dir, fr: 'w0', fireCd: rand(0.6, 1.6), volley: 0, shotT: 0, t: T.life, stepK: rand(0, 2), glitchT: rand(1, 3) });
    });
    Sfx.blink(); Sfx.decloak();
  }
  mirageDecoys(e, dt, now, alive) {                                     // the holograms: act the part, pop when touched
    const T = TUNE.MIRAGE, pb = this.player.body, kick = e.decoys.length ? this.xKick(now) : null;
    for (let i = e.decoys.length - 1; i >= 0; i--) {
      const D = e.decoys[i], l = D.x - 5, r = D.x + 5, t = D.y - 10, bt = D.feet;
      let pop = (D.t -= dt) <= 0;
      for (const bl of this.bulletList) if (bl.active && bl.x > l - 2 && bl.x < r + 2 && bl.y > t - 2 && bl.y < bt) { bl.disableBody(true, true); pop = true; break; }
      if (this.state !== 'dead' && pb.right > l && pb.left < r && pb.bottom > t && pb.top < bt) pop = true;
      if (kick && kick.r > l && kick.l < r && kick.b > t && kick.t < bt) pop = true;
      if (pop) { this.xGlitch(D.x, D.y, 14); Sfx.splitPop(); D.img.destroy(); e.decoys.splice(i, 1); continue; }
      const ddx = pb.center.x - D.x;
      if (alive) D.dir = ddx >= 0 ? 1 : -1;
      D.fireCd -= dt;
      if (D.volley > 0) { D.fr = 'fire'; if ((D.shotT -= dt) <= 0) { D.volley--; D.shotT = T.gap; this.mirageShot(D, true); } }
      else {
        const want = e.x + D.off, mv = Math.abs(want - D.x) > 2 ? Math.sign(want - D.x) : 0, nx = D.x + mv * Math.min(T.speed * 1.2 * dt, Math.abs(want - D.x));   // it keeps its place beside the real one
        if (mv && this.standAt(nx + mv * 5, D.feet + 2) && !this.solidAt(nx + mv * 5, D.feet - 10)) { D.x = nx; D.stepK += dt * 5; D.fr = Math.floor(D.stepK) % 2 ? 'w1' : 'w0'; } else D.fr = 'w0';
        if (D.fireCd <= 0 && alive && this.los(D.x, D.y - 3, pb.center.x, pb.center.y)) { D.volley = T.volley; D.shotT = 0.12; D.fireCd = rand(T.fireCd[0], T.fireCd[1]); }
      }
      const gl = (D.glitchT -= dt) < 0.07;                               // a tell for sharp eyes: now and then it stutters
      if (D.glitchT < 0) D.glitchT = rand(1.2, 3);
      D.img.setPosition(Math.round(D.x) + (gl ? D.dir : 0), D.y).setFrame(D.fr).setFlipX(D.dir < 0);
      if (gl) D.img.setTint(0xffa0f4); else D.img.clearTint();
    }
  }
  clingerThrow(e, kick) {                                               // shaken off: a kick sends it where you aim, a dash flings it back the way you came
    const T = TUNE.CLINGER, b = e.body, pb = this.player.body, f = this.facing;
    const a = kick ? (this.aimMode === 'mouse' && this.aimPt ? Math.atan2(this.aimPt.y - b.center.y, this.aimPt.x - b.center.x) : f > 0 ? -0.2 : Math.PI + 0.2) : Math.atan2(-this.dashVy, -this.dashVx || -f);
    if (e.ai === 'clamp') b.reset(pb.center.x + Math.cos(a) * 12, pb.center.y + Math.sin(a) * 10);
    b.setVelocity(Math.cos(a) * T.throwSpeed, Math.sin(a) * T.throwSpeed);
    Object.assign(e, { ai: 'thrown', thrownT: T.flight, kickedT: 0, stunT: 0 });
    BUS.emit('callout', 'RETURN TO SENDER'); this.addStyle(60); Sfx.clang(); this.hitStop(50);
    this.spawnLight(b.center.x, b.center.y, 'ring', 0x46e6ff, 0.2, 1.2, 0.9, 0.2);
  }
  clingerBoom(e, thrown) {
    if (!e.alive) return;
    const x = e.body.center.x, y = e.body.center.y;
    e.blown = true; this.killEnemy(e, 0, -1, 'tickboom');
    this.explode(x, y, thrown ? TUNE.CLINGER.thrown : TUNE.CLINGER.boom);
  }

  waveCleared(x, y) {
    if (this.campaign) {
      this.campaignMachinery = null;
      const recovery = CAMPAIGN[this.wave].recovery, patch = this.mutator !== 'vamp' && this.state === 'play' && this.hp < recovery;
      this.applyMod(null, patch ? 2300 : 1100);                        // GRAVITY RESTORED waits for WAVE CLEARED (and SUIT PATCHED)
      this.dousePuddles();
      for (const w of this.wrecks) w.cosmetic = true;                  // a wreck still in the air cannot reignite the arena
      if (patch) {
        const gain = Math.round(recovery - this.hp), pb = this.player.body;
        this.hp = recovery;
        BUS.emit('hp', this.hp, 0);
        Sfx.pickup();
        this.spawnLight(pb.center.x, pb.center.y, 'ring', 0x7dff8a, 0.4, 2, 0.9, 0.5);   // the suit patches itself up between operations
        this.fx.emit(pb.center.x, pb.center.y, { n: 16, speed: [20, 70], life: [0.5, 0.9], size: [2, 1], cols: [0xffffff, 0x7dff8a, 0x2ad05a], add: true, g: -60, drag: 2, cosmetic: true });
        this.time.delayedCall(1100, () => { if (this.state === 'play') BUS.emit('callout', 'SUIT PATCHED +' + gain); });
      }
    }
    BUS.emit('callout', 'WAVE CLEARED');
    if (this.stats.taken <= this.waveTaken) this.time.delayedCall(900, () => this.award('untouched'));
    if (this.locked.size) { this.locked.clear(); BUS.emit('locked', []); BUS.emit('callout', 'GUNS RECOVERED'); }   // anything a pilferer got away with comes back
    const now = this.time.now;                                           // the last kill of a wave: slow-mo, zoom and the camera on the body
    this.slowmoUntil = now + 900; this.zoomPunch = Math.max(this.zoomPunch, 0.14); this.impactFrame(2); Sfx.killcam();
    if (x !== undefined) this.camFocus = { x, y, until: now + 900 };
    this.time.delayedCall(1700, () => {                                 // pick a perk, then on to the next wave (or down the lift)
      if (this.state !== 'play') return;
      if (this.campaign) {
        this.offerPerks(() => {
          const route = CAMPAIGN[this.wave].route;
          if (route) this.openCampaignRoute(route);
          else this.startWave(this.wave + 1);
        });
      } else {
        this.offerPerks(() => { if (this.mode.liftAfter(this)) this.openLiftRoute(); else this.startWave(this.wave + 1); });
      }
    });
  }
  activeHostiles() { return this.enemiesLeft - this.campaignReserve; }
  waveTrack(i) { return this.mode.music(this, i); }                    // campaign: one track per wave; OVERTIME and DAILY go round the six-wave cycle
  restartTrack() { return this.waveTrack(this.chapterStart ? CAMPAIGN_ACTS[this.chapterStart.arena].first : 0); }   // the first track R or RESTART plays
  musicAhead(i) { Music.keep([this.waveTrack(i), this.waveTrack(i + 1), 'win', 'lose']); }   // decode this wave's track, the next one and the jingles; drop the rest
  startWave(i) {
    this.wave = i;
    const M = this.mode, op = this.campaign ? CAMPAIGN[i] : null;     // op: the campaign operation, for its machinery, weapons and squad timing
    const authored = M.squads(this, i);
    const squads = authored.map(squad => {
      const foes = squad.foes;
      const extras = this.mutator === 'swarm' ? foes.filter(([k]) => !SWARM_SKIP.has(k) && Math.random() < 0.5) : [];
      return { ...squad, spawns: foes.concat(extras).map(foe => ({ foe })) };
    });
    const entries = squads.flatMap(squad => squad.spawns);
    const mr = M.rng(this, i), mod = M.modifier(this, i, mr);
    this.lastMod = mod;
    this.enemiesLeft = entries.length;
    if (M.openTotal) this.totalEnemies += entries.length;
    if (op) this.totalEnemies += entries.length - authored.reduce((n, squad) => n + squad.foes.length, 0);
    BUS.emit('wave', i + 1, M.waves);
    BUS.emit('wavecard', ...M.card(this, i, mod));
    if (op) { this.setCampaignMachinery(op.machinery); this.issueWeapons(op.unlock); }
    this.spawnBarrels(true); this.spawnCanisters(true); this.restockProps();
    this.applyMod(mod || (this.mutator === 'lowg' ? 'lowg' : this.mutator === 'dark' ? 'dark' : null));
    for (const pp of this.pipes) if (pp.broken && pp.t <= 0) this.repairPipe(pp);
    this.waveTaken = this.stats.taken; this.supplyT = TUNE.SUPPLY.first; saveMastery(); saveLife();
    Sfx.warp(); Music.track(this.waveTrack(i)); this.musicAhead(i);
    for (const k of this.pickups) if (k.taken && this.mutator !== 'vamp') {   // restock medkits between waves
      k.taken = false; k.img.setVisible(true); k.glow.setVisible(true);
      this.fx.emit(k.x, k.y, { n: 12, speed: [20, 80], life: [0.3, 0.6], size: [2, 1], cols: [0xffffff, 0x7dff8a], add: true, g: -40 });
      this.beamIn(k.x, k.y + 9, 12, [k.img]);
    }
    const nE = M.elites(this, i);
    const eliteEntries = op && squads.length > 1 ? squads.slice(1).flatMap(squad => squad.spawns) : entries;
    const pool = eliteEntries.filter(({ foe: [kind] }) => ENEMY[kind].hp >= 40 && !NO_ELITE.has(kind));
    for (let n = 0; n < nE && pool.length; n++) {
      const [entry] = pool.splice(Math.floor(mr() * pool.length), 1);
      entry.elite = ELITE_KINDS[Math.floor(mr() * ELITE_KINDS.length)];
    }
    if (op) {
      this.campaignSquads = squads;
      this.campaignReserve = entries.length;
      this.campaignReinforceAt = 0;
      this.releaseCampaignSquad(true);
    } else this.queueWaveSpawns(entries);
    BUS.emit('enemies', this.activeHostiles());
  }
  queueWaveSpawns(entries, gap = 380, lead = 700) {
    const used = new Set();
    entries.forEach(({ foe: [kind, type, row], elite }, i) => {
      let choice, air;
      if (row !== undefined) {
        choice = [type, row]; air = FLIERS.has(kind);
      } else {
        const points = this.A.points[type], available = points.filter(p => !used.has(p));
        const pts = (available.length ? available : points)
          .map(p => ({ p, d: Math.hypot(p[0] * TS + 8 - this.player.x, p[1] * TS - this.player.y) }))
          .sort((a, b) => b.d - a.d);
        choice = pts[randi(0, Math.min(2, pts.length - 1))].p;
        air = type === 'A';
        used.add(choice);
      }
      this.time.delayedCall(lead + i * gap, () => this.warpIn(kind, choice, air, elite));
    });
  }
  warpIn(kind, [cx, cy], air, elite) {
    if (this.state === 'dead') return;
    const x = cx * TS + 8, y = air ? cy * TS + 16 : (cy + 1) * TS;
    const big = kind === 'boss';
    const beam = this.add.image(x, y, 'beam').setOrigin(0.5, 1).setBlendMode(ADD).setTint(big ? 0xff8a20 : 0xff50d0).setAlpha(0).setScale(big ? 5 : 1.2, big ? 2 : 1.4).setDepth(17);
    this.tweens.add({ targets: beam, alpha: 0.9, scaleX: big ? 3 : 0.6, duration: big ? 1300 : 700, ease: 'Quad.easeIn' });
    this.spawnLight(x, y - 16, 'ring', big ? 0xffa040 : 0xff80e0, big ? 4 : 1.4, 0.2, 0.8, big ? 1.3 : 0.7);
    Sfx.warp();
    if (big) { this.camFocus = { x, y: y - 40, until: this.time.now + 3800 }; this.shake(1400, 0.004); }
    this.time.delayedCall(big ? 1400 : 800, () => {
      beam.destroy();
      if (this.lab) this.labPending--;
      if (this.state === 'dead') {
        if (this.lab) { this.enemiesLeft--; this.totalEnemies--; BUS.emit('enemies', this.enemiesLeft); }
        return;
      }
      const e = this.spawnEnemy(kind, cx, cy), now = this.time.now;
      e.aggro = true; e.aggroT = 6;
      const hpK = this.mode.hpScale ? this.mode.hpScale(this) : 1;
      if (hpK !== 1) { e.def = Object.assign({}, e.def, { hp: e.def.hp * hpK }); e.hp = e.def.hp; }   // OVERTIME: tougher every wave
      if (this.mutator === 'swarm' && !SWARM_SKIP.has(kind)) { e.def = Object.assign({}, e.def, { hp: e.def.hp * 0.67 }); e.hp = e.def.hp; }
      if (elite) this.makeElite(e, elite);
      if (isHumanoid(e)) { e.lkx = this.player.x; e.lky = this.player.y; e.lkT = now; this.alertHumanoid(e, now, false); }
      if (big) { this.boss = e; BUS.emit('boss', 'THE SMELTER', 'FOUNDRY WARDEN'); BUS.emit('flash', 0.35); this.shake(500, 0.012); }
      if (kind === 'jugg') { this.boss = e; BUS.emit('minibar', 'JUGGERNAUT'); BUS.emit('callout', 'JUGGERNAUT'); this.shake(400, 0.01); Sfx.roar(); }
      if (kind === 'foreman') { this.boss = e; BUS.emit('boss', 'THE FOREMAN', 'YARD BOSS'); BUS.emit('flash', 0.35); this.shake(500, 0.012); Sfx.roar(); this.camFocus = { x: e.x, y: e.y - 30, until: this.time.now + 2400 }; }
      if (kind === 'wyrm') { this.boss = e; BUS.emit('minibar', 'SLAG WYRM'); BUS.emit('callout', 'SLAG WYRM'); this.shake(400, 0.01); Sfx.roar(); }
      if (kind === 'gunship') { this.boss = e; BUS.emit('minibar', 'GUNSHIP'); BUS.emit('callout', 'GUNSHIP INBOUND'); this.shake(400, 0.008); Sfx.roar(); }
      if (e.def.title) this.xbIntro(e);                                   // the expansion bosses: title card, boss bar, camera
      this.spawnLight(x, e.y, 'glow', 0xff60e0, 1.5, 3.5, 1, 0.3);
      this.spawnLight(e.x, e.y, e.def.key + '_w', 0xffffff, 1.6, 1, 1, 0.25, e.fr, e.flipX);
      this.fx.emit(x, e.y, { n: 24, speed: [40, 180], life: [0.3, 0.7], size: [3, 1], cols: [0xffffff, 0xffa0f0, 0xff40c0], add: true, drag: 2 });
      this.shake(80, 0.003);
    });
  }
  // Sustained hazards share a player damage interval during the early campaign.
  // A ladle stream and the fire beneath it should deal one contact hit at a time.
  hurtFromHazardContact(dmg, srcX, opts) {
    const interval = this.campaign ? CAMPAIGN[this.wave]?.hazardContactMs : 0;
    const now = this.time.now;
    if (interval && now < this.hazardContactUntil) return;
    const aegis = this.aegis;
    const hit = this.hurtPlayer(dmg, srcX, { ...opts, knock: false, iframes: false });
    if (interval && (hit || this.aegis < aegis)) this.hazardContactUntil = now + interval;
  }
  hurtPlayer(dmg, srcX, opts = {}) {
    if (this.state !== 'play' || this.lab?.invulnerable || this.ride) return false;   // nothing reaches you in a lift car
    if (this.campaign && (this.descending || !this.enemiesLeft)) return false;
    const now = this.time.now, soft = opts.self || opts.burn;
    if (!opts.self) {
      const campaignScale = this.campaign ? (CAMPAIGN[this.wave]?.damageScale ?? 1) : 1;
      dmg *= campaignScale * DIFFS[this.runDiff].dmg * (this.mutator === 'glass' ? 2 : 1);
    }
    if (!opts.self && this.pCorrodeT > 0) dmg *= 1.25;                  // slug acid: corroded, you give way
    if (!opts.self && now < this.markedUntil) dmg *= TUNE.SPOTTER.take;   // a spotter has you marked
    if (!opts.self && this.aegis > 0 && !(opts.iframes !== false && now < this.invulnUntil)) {   // AEGIS soaks hits first
      const ab = Math.min(this.aegis, dmg); this.aegis -= ab; dmg -= ab;
      const b0 = this.player.body; this.spawnLight(b0.center.x, b0.center.y, 'ring', 0x40b0ff, 0.6, 1.4, 0.9, 0.18); Sfx.shieldHit();
      if (this.aegis <= 0) { BUS.emit('callout', 'AEGIS BROKEN'); this.fxSparks(b0.center.x, b0.center.y, 10, 0, Math.PI * 2, [60, 200]); }
      if (dmg <= 0) { this.invulnUntil = Math.max(this.invulnUntil, now + 250); return false; }
    }
    if (!soft && now < this.dashIUntil) { this.dashDodge(); return false; }   // dash i-frames: it went straight through you
    if (opts.iframes !== false && now < this.invulnUntil) return false;
    this.hp = Math.max(0, this.hp - dmg); this.stats.taken += dmg;
    if (this.hp <= 0 && !this.killer) this.killer = this.culprit(srcX, opts);
    if (opts.iframes !== false) this.invulnUntil = now + TUNE.IFRAMES_MS;
    const b = this.player.body;
    if (opts.knock !== false) { const dir = Math.sign(this.player.x - srcX) || -this.facing; b.velocity.x = dir * 230; b.velocity.y = -190; this.jumpCuttable = false; }
    this.fxBlood(b.center.x, b.center.y, soft ? 4 : 9, -Math.PI / 2, Math.PI * 1.6, [40, 180]);
    Sfx.hurt(); this.shake(130, soft ? 0.004 : 0.007);
    this.style.pts = Math.max(0, this.style.pts - dmg * (soft ? 2 : 5));          // getting hit costs style
    BUS.emit('hp', this.hp, dmg);
    if (!opts.self) BUS.emit('dmgdir', Math.atan2((opts.srcY ?? b.center.y) - b.center.y, srcX - b.center.x), dmg);   // HUD: which way it came from
    if (this.hp <= 0) this.killPlayer();
    return true;
  }
  killPlayer() {
    this.state = 'dead'; if (this.mode.lifetime) LIFE.deaths++; this.wheelOn = false;
    if (this.campaign) BUS.emit('perkdone');
    const p = this.player, b = p.body, cx = b.center.x, cy = b.center.y;
    for (const t of ['g_helm', 'g_armor', 'g_armor', 'g_plate', 'g_flesh1', 'g_flesh2', 'g_flesh3', 'g_chunk', 'g_chunk', 'g_bone', 'g_rib', 'g_chunk', 'g_flesh1', 'g_armor'])
      this.spawnGib(t, cx + rand(-4, 4), cy + rand(-6, 6), b.velocity.x * 0.4 + rand(-180, 180), rand(-380, -150));
    this.fxBlood(cx, cy, 70, -Math.PI / 2, Math.PI * 2, [60, 340]); this.fxMist(cx, cy, 14);
    this.paintSplatAround(cx, b.bottom - 2, 16);
    p.disableBody(true, true);
    this.pv.setVisible(false); this.gun.setVisible(false); this.visor.setVisible(false); this.mflash.setVisible(false);
    this.lanceGlow.setVisible(false); this.lanceOn = false; this.locks = []; this.hornetHeld = false; this.reeledBy = null; Sfx.stopLoops();
    Sfx.gib(1.6); if (!Music.jingle('lose', 'title')) Sfx.lose(); Music.need(this.restartTrack()); BUS.emit('splat', 9);
    this.shake(320, 0.014); this.slowmoUntil = this.time.now + 900;
    this.time.delayedCall(1300, () => this.showOver(false));
  }
  win() {
    if (this.state !== 'play') return;
    this.state = 'won'; this.wheelOn = false;
    this.slowmoUntil = this.time.now + 700;
    this.award('slayer');
    this.mode.onWin?.(this);
    BUS.emit('callout', this.mode.winCallout);
    if (!Music.jingle('win', 'title')) Sfx.win();
    Music.need(this.waveTrack(0));                                       // ready for R on the results screen
    this.time.delayedCall(1500, () => this.showOver(true));
  }
  showOver(won) {
    this.savePlayTime();
    this.overShown = true;
    if (this.mode.endCard) { BUS.emit('wavecard', ...this.mode.endCard); return; }
    const s = this.stats, time = this.runTime(), acc = s.shots ? Math.round(Math.min(1, s.hits / s.shots) * 100) : 0;
    const comp = this.totalEnemies ? s.kills / this.totalEnemies : 0;   // grade: completion, accuracy, style, damage taken
    const idx = clamp(comp * 0.4 + Math.min(1, acc / 55) * 0.15 + this.style.best / 6 * 0.25 + Math.max(0, 1 - s.taken / 500) * 0.2, 0, 1) * (won ? 1 : 0.85);
    const grade = idx >= 0.85 ? 'S' : idx >= 0.7 ? 'A' : idx >= 0.55 ? 'B' : idx >= 0.4 ? 'C' : 'D';
    const score = Math.max(0, Math.round(s.kills * 100 + this.headshots * 50 + s.executes * 150 + this.bestCombo * 60 + s.dodges * 25 + this.style.best * 500 + this.mode.waveScore * this.wave
                                         + (won ? Math.max(0, 900 - time) * 10 : 0) - s.taken * 4) * DIFFS[this.runDiff].score);
    const favId = Object.keys(s.wk).sort((a, b) => s.wk[b] - s.wk[a])[0], fav = favId ? WEAPONS.find(w => w.id === favId).name : '-';
    saveLife();                                        // lifetime stats (savePlayTime above added the time played)
    const topGuns = Object.keys(s.wk).sort((a, b) => s.wk[b] - s.wk[a]).slice(0, 3).map(id => [WEAPONS.find(w => w.id === id).name, s.wk[id]]);
    saveMastery();
    const rec = this.mode.writeRecord(this, { score, grade, time, won });   // each mode files its own record
    BUS.emit('over', { ...rec, time, kills: s.kills, total: this.totalEnemies, shots: s.shots, acc, combo: this.bestCombo, headshots: this.headshots,
                       style: STYLE_RANKS[this.style.best].n, taken: Math.round(s.taken), executes: s.executes, dodges: s.dodges, fav, top: topGuns, big: Math.round(s.big || 0), killer: won ? null : this.killer || null, score, grade,
                       diff: DIFFS[this.runDiff].name, medals: [...this.medals].map(id => MEDALS.find(m => m.id === id).name) });
  }

  onBoltHit(p, b) {
    if (!b.active || this.state === 'dead') return;
    this.boltPop(b.x, b.y); b.disableBody(true, true);
    this.hurtPlayer(TUNE.DRONE_BOLT.damage, b.x);
  }
  onTouchEnemy(p, e) {
    if (!e.alive || this.state === 'dead' || this.lab?.stationary) return;
    if (e.frozen > 0) return;                                          // statues don't bite
    if (e.def.bossContact) { this[e.def.bossContact](p, e); return; }   // an expansion boss or its parts: its own contact rules
    if (e.kind === 'screamer') { if (e.ai === 'dive') this.screamerBoom(e); return; }
    if (e.kind === 'cloaker') return;                                  // it only hurts when it means to (the strike)
    if (e.kind === 'gnat') { if (this.hurtPlayer(TUNE.GNAT.sting, e.x, { knock: false, srcY: e.y })) { e.hp = 0; this.killEnemy(e, 0, 0, 'sting'); } return; }   // stings and dies
    if (e.kind === 'wyrm' || e.kind === 'wyrmseg') { this.wyrmTouch(e); return; }
    if (e.tbHeld || e.netT > 0 || e.kind === 'claw' || e.kind === 'echo') return;   // held in a beam or a net, it bites nobody; the claw hurts by grabbing; the echo only shoots
    if (e.def.contact && this[e.def.contact](e, p)) return;            // its own touch (a blast, a clamp, a rake) instead of the bite
    if (e.kind === 'pilferer') { if (e.ai === 'seek') this.pilfer(e); return; }
    if (e.kind === 'leech') { if (e.ai === 'seek') this.latchLeech(e); return; }
    if (e.kind === 'blimp' || (e.kind === 'shellback' && e.ai === 'flip')) return;
    if (e.kind === 'wraith') { if (e.ai === 'lunge' && this.hurtPlayer(TUNE.WRAITH.dmg, e.x, { srcY: e.y })) { e.ai = 'fade'; e.aiUntil = this.time.now + TUNE.WRAITH.fadeMs; Sfx.slash(); } return; }   // it only hurts on the lunge
    if (e.shrunkT > 0) { if (this.hurtPlayer(Math.round(e.def.touch * 0.5), e.body.center.x)) { e.stunT = 0.5; } return; }   // shrunk: half a bite
    if (e.kind === 'spikeball') { if (this.hurtPlayer(TUNE.SPIKEBALL.dmg, e.x, { srcY: e.y })) { this.fxBlood(p.body.center.x, p.body.center.y, 8, 0, Math.PI * 2); Sfx.squish(); } return; }
    if (e.kind === 'beacon') return;
    if (e.kind === 'blinker' || (e.kind === 'mimic' && e.ai === 'hide')) return;   // the blinker only cuts on its dash; a hidden mimic is just a drum
    if (e.kind === 'buzzsaw') {                                         // the blade: one bite, then it caroms off you
      const now = this.time.now;
      if (e.owned > 0 || now < e.pHitT) return;
      if (this.hurtPlayer(TUNE.BUZZSAW.dmg, e.x, { srcY: e.y })) {
        e.pHitT = now + 1200; e.dazeT = 0.8;                            // it reels off you: a window to kick it back
        const ax = e.x - p.x, ay = e.y - p.y, l = Math.hypot(ax, ay) || 1;
        e.body.setVelocity(ax / l * 200, ay / l * 200);
        this.fxBlood(p.body.center.x, p.body.center.y, 10, Math.atan2(-ay, -ax), 1.2); Sfx.squish();
      }
      return;
    }
    if (e.kind === 'burrower') {                                       // only the eruption bites, and it throws you
      if (e.ai === 'erupt' && !e.hitP && e.body.velocity.y < 120) {
        e.hitP = true;
        if (this.hurtPlayer(TUNE.BURROWER.dmg, e.body.center.x, { knock: false, srcY: e.body.bottom })) {
          p.body.velocity.y = -380; p.body.velocity.x = Math.sign(p.x - e.x || 1) * 160; this.jumpCuttable = false; this.lastGround = -1e9;
          this.shake(180, 0.01); Sfx.kickHit(); this.fxBlood(p.body.center.x, p.body.bottom, 10, -Math.PI / 2, 1.2);
        }
      }
      return;
    }
    if (e.kind === 'tick') { if (e.armT <= 0 && e.kickedT <= 0) { e.armT = TUNE.TICK.fuse / 1000; Sfx.chirp(); } return; }   // ticks don't bite, they blow
    if (e.kind === 'rammer' && e.ai === 'charge') return;               // the charge deals its own hits
    if (e.kind === 'duelist' && e.ai !== 'lunge') return;               // the duelist only cuts on a lunge
    if (e.kind === 'gasbag' || e.kind === 'turret') return;
    if (e.kind === 'creeper') { if ((e.ai === 'drop' || e.ai === 'ground') && !e.hitP && this.hurtPlayer(TUNE.CREEPER.bite, e.x, { srcY: e.y })) { e.hitP = true; this.fxBlood(p.body.center.x, p.body.top, 8, -Math.PI / 2, 1.2); Sfx.chomp(); } return; }
    if (e.kind === 'roller' && e.ai === 'roll') {                       // bowled over
      if (!e.hitP && this.hurtPlayer(TUNE.ROLLER.dmg, e.x, { knock: false })) { e.hitP = true; p.body.velocity.x = e.rollDir * 300; p.body.velocity.y = -240; this.jumpCuttable = false; this.shake(160, 0.008); Sfx.kickHit(); }
      return;
    }
    const lunging = (e.kind === 'stalker' || e.kind === 'duelist') && e.ai === 'lunge', bashing = e.kind === 'bulwark' && e.ai === 'charge';
    if (this.hurtPlayer(lunging ? e.def.lungeDmg : bashing ? TUNE.BULWARK.bashDmg : e.def.touch, e.body.center.x)) {
      if (this.perks.thorns && e.alive) { this.damageEnemy(e, 20, Math.sign(e.x - p.x) || 1, -0.3, 'kick'); this.fxSparks(e.body.center.x, e.body.center.y, 5); if (!e.alive) return; }   // barbed plate
      if (e.kind === 'stalker') { this.stalkerRecover(e); return; }
      if (e.kind === 'duelist') { this.duelistAfterHit(e); return; }
      if (bashing) {                                                    // shield bash: launches you
        p.body.velocity.x = e.dir * 340; p.body.velocity.y = -230;
        e.ai = 'recover'; e.aiUntil = this.time.now + 550; e.body.velocity.x = 0;
        this.shake(160, 0.009); this.addKick(e.dir * 6, -2); Sfx.clang(); return;
      }
      e.stunT = 0.5;                                                  // bounce off after a hit so contact damage isn't a blender
      e.body.velocity.x = -Math.sign(p.x - e.body.center.x || 1) * 160 * Math.min(1, e.def.kb + 0.4);
      if (e.kind !== 'drone' && e.body.blocked.down) e.body.velocity.y = -90;
      this.fxSparks((p.x + e.x) / 2, (p.y + e.y) / 2, 5);
    }
  }
  onKickGib(p, g) {
    const now = this.time.now, pv = p.body.velocity.x;
    if (g.kickT > now || Math.abs(pv) < 70 || !g.body.blocked.down) return;
    g.kickT = now + 250;
    g.body.velocity.x = pv * rand(0.9, 1.5); g.body.velocity.y = -rand(80, 170); g.body.angularVelocity = rand(-700, 700);
  }

  // ----------------------------------------------------------------- enemies ----
  unstrand(e) {                                                         // a walker walled off from you (ARENA 02's side pockets): it warps to the ground point nearest you
    const p = this.player, to = this.A.points.G.map(q => ({ x: q[0] * TS + 8, y: (q[1] + 1) * TS - e.def.fh / 2 }))
      .map(o => Object.assign(o, { d: Math.hypot(o.x - p.x, o.y - p.y) }))
      .filter(o => o.d > 150 && Math.hypot(o.x - e.x, o.y - e.y) > 96).sort((a, c) => a.d - c.d)[0];
    if (!to) return;
    this.spawnLight(e.x, e.y, 'ring', 0xff80e0, 1.4, 0.2, 0.8, 0.5);
    this.fx.emit(e.x, e.y, { n: 18, speed: [40, 160], life: [0.3, 0.6], size: [3, 1], cols: [0xffffff, 0xffa0f0, 0xff40c0], add: true, drag: 2 });
    e.body.reset(to.x, to.y); e.homeX = to.x; e.homeY = to.y; e.blindT = 0; e.stunT = Math.max(e.stunT, 0.6);
    const beam = this.add.image(to.x, to.y + e.def.fh / 2, 'beam').setOrigin(0.5, 1).setBlendMode(ADD).setTint(0xff50d0).setAlpha(0.9).setScale(0.6, 1.4).setDepth(17);
    this.tweens.add({ targets: beam, alpha: 0, duration: 500, onComplete: () => beam.destroy() });
    this.spawnLight(to.x, to.y, 'glow', 0xff60e0, 1.5, 3.5, 1, 0.3); Sfx.warp();
  }
  updateEnemies(dt, now) {
    const p = this.player, alive = this.state !== 'dead';
    if ((this.sweepT = (this.sweepT || 0) - dt) <= 0) {                 // dead foes leave the group 3 s on, so the per-frame loops stop walking them;
      this.sweepT = 1;                                                    // the sprite isn't destroyed (other lists may still point at it) and goes with the arena
      for (const e of this.enemies.getChildren().filter(o => !o.alive && now - (o.deadAt || 0) > 3000)) this.enemies.remove(e);
    }
    const pcx = p.body.center.x, pcy = p.body.center.y;
    this.updateTactics(dt, now);
    this.gnatCache = this.enemies.getChildren().filter(o => o.alive && o.kind === 'gnat');   // boids look at each other
    let near = 0; for (const o of this.gnatCache) if (Math.abs(o.x - pcx) < 170 && Math.abs(o.y - pcy) < 120) near++;
    this.swarmLvl = this.gnatCache.length ? clamp(0.25 + near / 8, 0, 1) : 0;
    if (!this.lab?.stationary && alive && this.state === 'play' && this.activeHostiles() <= 5 && now >= this.hustleT) {   // the last few stop lurking and come looking for you
      this.hustleT = now + 4000;
      for (const o of this.enemies.getChildren()) {
        if (!o.alive || o.under) continue;
        if (isHumanoid(o)) { if (o.ai === 'idle') { o.lkx = pcx; o.lky = pcy; o.lkT = now; this.alertHumanoid(o, now, false); } }
        else if (!o.aggro) { o.aggro = true; o.aggroT = 8; }
      }
    }
    const hustle = !this.lab?.stationary && alive && this.state === 'play' && this.activeHostiles() <= 5;   // reserve squads still to deploy don't count
    for (const e of this.enemies.getChildren()) {
      if (!e.alive) continue;
      e.flashT -= dt; e.stunT -= dt; e.t += dt; e.losT -= dt; e.aggroT -= dt;
      const b = e.body, D0 = this.decoy, lure = !!D0 && Math.hypot(D0.x - b.center.x, D0.y - b.center.y) < Math.min(TUNE.DECOY.pull, Math.hypot(pcx - b.center.x, pcy - b.center.y) + 40);
      const dx = (lure ? D0.x : pcx) - b.center.x, dy = (lure ? D0.y : pcy) - b.center.y, dist = Math.hypot(dx, dy);   // a decoy close by pulls it off you
      if (lure) e.aggro = true;
      if (e.losT <= 0) { e.losT = 0.15; e.sees = alive && dist < e.def.sight * 1.4 && this.los(b.center.x, b.center.y - 3, pcx, pcy - 4); }
      e.blindT = e.sees ? 0 : (e.blindT || 0) + dt;                      // how long it's gone without sight of you
      if (hustle && !e.under && this.boss !== e && !FLIERS.has(e.kind) && !isHumanoid(e) && !e.tbHeld && !(e.netT > 0) && !(e.gravT > 0) && !(e.stasisT > 0)) {
        const walled = e.blindT > 3 && Math.abs(dx) > 120 && (dx > 0 ? b.blocked.right : b.blocked.left);   // the last few: a walker pressed against a wall it can't climb
        e.strandT = walled ? (e.strandT || 0) + dt : Math.max(0, (e.strandT || 0) - dt);
        if (e.strandT > 4) { e.strandT = 0; this.unstrand(e); }
      }
      if (e.burnT > 0) {                                               // on fire: damage over time, flames, spreads to neighbours
        e.burnT -= dt; e.burnTick -= dt; e.spreadT -= dt;
        if (Math.random() < 0.7) this.fx.emit(b.center.x + rand(-b.halfWidth, b.halfWidth), b.center.y + rand(-b.halfHeight, b.halfHeight * 0.5), { n: 1, angle: -Math.PI / 2, spread: 0.6, speed: [20, 60], life: [0.2, 0.45], size: [4, 1], cols: [0xffffff, 0xffe46a, 0xff8a1f, 0xc03010], add: true, g: -40 });
        if (e.burnTick <= 0) { e.burnTick = 0.25; this.damageEnemy(e, TUNE.FLAME.burnDps * 0.25, 0, 0, 'burn'); if (!e.alive) continue; }
        if (e.spreadT <= 0) { e.spreadT = 0.5; for (const o of this.enemies.getChildren()) if (o.alive && o !== e && o.burnT <= 0 && Math.abs(o.x - e.x) < 20 && Math.abs(o.y - e.y) < 20) this.ignite(o, 1.5); }
      }
      if (e.shrunkT > 0) {                                             // shrunk: half size until it wears off
        e.shrunkT -= dt; if (!e.shrunkOn) { e.shrunkOn = true; e.setScale(0.5); }
        if (e.shrunkT <= 0) { e.shrunkOn = false; e.setScale(1); this.spawnLight(e.x, e.y, 'ring', 0x60ffe0, 0.2, 1, 0.8, 0.18); }
      }
      if (e.needles > 0 && (e.needleT -= dt) <= 0) { e.needles = 0; e.needleAngs = []; this.fx.emit(b.center.x, b.center.y, { n: 6, speed: [20, 70], life: [0.2, 0.4], size: [2, 1], cols: [0xffd0f4, 0xff60d0], add: true }); }   // unstuck needles fizzle out
      if (e.corrodeT > 0) {                                            // corroded: green drips, takes extra damage (damageEnemy)
        e.corrodeT -= dt;
        if (Math.random() < 0.3) this.fx.emit(b.center.x + rand(-b.halfWidth, b.halfWidth), b.center.y + rand(-b.halfHeight, b.halfHeight * 0.6), { n: 1, angle: Math.PI / 2, spread: 0.3, speed: [5, 25], life: [0.3, 0.6], size: [2, 1], cols: [0xe0ff90, 0x9aff4a, 0x4aa020], add: true, g: 300, mode: 1 });
      }
      if (e.cook > 0 && now - e.cookT > 150) e.cook = Math.max(0, e.cook - dt * 0.6);   // microwave heat bleeds off
      if (e.elite) this.updateElite(e, dt, now);
      if (this.grabbedBy === e && (e.stasisT > 0 || e.frozen > 0 || e.netT > 0 || e.gravT > 0 || e.gravSlam)) this.grappleBreak(e, 'BROKE FREE');
      if (e.stasisT > 0) this.updateStasisFoe(e, dt);
      else if (e.frozen > 0) this.updateFrozen(e, dt);
      else if (e.netT > 0) this.updateNetted(e, dt, now);
      else if (e.gravT > 0 || e.gravSlam) this.updateGravved(e, dt, now);
      else if (!this.lab?.stationary) { const hk = this.hasteK(e, now); this[e.def.update](e, dt * hk, now, dx, dy, dist, alive); if (hk > 1 && e.alive) this.hasteOut(e, hk); }   // an overclocker's link runs it fast
      if (!e.alive) continue;
      if (e.glueT > 0) {                                                 // gummed up: it crawls
        e.glueT -= dt; b.velocity.x *= TUNE.GLUE.slow; if (b.velocity.y < 0 && !FLIERS.has(e.kind)) b.velocity.y *= 0.6; else if (FLIERS.has(e.kind)) b.velocity.y *= TUNE.GLUE.slow;
        if (Math.random() < 0.15) this.fx.emit(b.center.x + rand(-b.halfWidth, b.halfWidth), b.bottom - 2, { n: 1, angle: Math.PI / 2, spread: 0.2, speed: [5, 20], life: [0.3, 0.5], size: [2, 1], cols: [0xffd040, 0xc89a20], alpha: [0.8, 0] });
      }
      if (e.panicT > 0 && !(e.stasisT > 0) && !(e.frozen > 0) && !(e.netT > 0) && !(e.gravT > 0) && !e.gravSlam) {   // burning and panicking: runs about blindly
        e.panicT -= dt;
        if (Math.random() < dt * 1.5) e.panicDir *= -1;
        if (b.blocked.left) e.panicDir = 1; else if (b.blocked.right) e.panicDir = -1;
        b.velocity.x = e.panicDir * (e.def.chase || e.def.speed || 120) * 0.9; e.dir = e.panicDir;
      }
      if (e.kickedT > 0) { e.kickedT -= dt; if ((b.blocked.left || b.blocked.right) && Math.abs(e.lastVx) > 170) this.wallSplat(e); if (!e.alive) continue; }
      e.lastVx = b.velocity.x;
      if (e.dmgFlushAt && now >= e.dmgFlushAt) this.flushDmg(e);
      if (e.healFlushAt && now >= e.healFlushAt) { if (e.healAcc >= 1) this.dmgNumber(e.x, e.body.top - 5, '+' + Math.round(e.healAcc), 'G'); e.healAcc = 0; e.healFlushAt = 0; }
      const key = e.def.key + (e.flashT > 0 ? '_w' : '');
      if (e.texture.key !== key || e.frame.name !== e.fr) e.setTexture(key, e.fr);
      e.flipX = e.dir < 0;
      if (e.rotation) e.rotation = Math.abs(e.rotation) < 0.01 ? 0 : e.rotation * Math.exp(-dt * 12);
      if (e.chill > 0 && !(e.frozen > 0)) {                            // chilled: sluggish, thaws out over time
        b.velocity.x *= 1 - 0.5 * e.chill; if (FLIERS.has(e.kind)) b.velocity.y *= 1 - 0.4 * e.chill;
        e.chill = Math.max(0, e.chill - dt * 0.35);
      }
      const base = e.kind === 'echo' ? 0x70e8ff : this.canExecute(e) && Math.floor(now / 110) % 2 ? 0xffb050 : e.tbHeld ? 0xd8c8ff : e.corrodeT > 0 ? 0xc4ff9a : e.revenant ? 0xa8ffb8 : 0xffffff;   // executable: pulses orange
      const tint = e.frozen > 0 ? 0xb8ecff : e.chill > 0.05 ? ((Math.round(255 - 90 * e.chill) << 16) | (Math.round(255 - 30 * e.chill) << 8) | 255) : base;
      if (e.tintKey !== tint) { e.tintKey = tint; if (tint === 0xffffff) e.clearTint(); else e.setTint(tint); }
      if (e.kind === 'cloaker') {                                        // phase cloak: a shimmer until it strikes or gets hit
        e.revealT = Math.max(0, (e.revealT || 0) - dt);
        const vis = e.ai === 'reveal' || e.ai === 'strike' || e.revealT > 0 || e.frozen > 0 || e.burnT > 0 ? 1 : 0.06 + (Math.random() < 0.08 ? 0.14 : 0);
        e.cloakA = (e.cloakA ?? 0.06) + (vis - (e.cloakA ?? 0.06)) * Math.min(1, dt * 10);
        e.setAlpha(e.cloakA);
      }
    }
  }
  alertEnemy(e, now) {
    if (this.lab?.stationary || (e.kind === 'mimic' && e.ai === 'hide')) return;
    const heavy = e.kind === 'heavy';
    e.aggro = true; e.aggroT = 4;
    if (!FLIERS.has(e.kind)) { e.ai = 'alert'; e.aiUntil = now + (heavy ? 420 : 300); if (e.body.blocked.down) e.body.velocity.y = -110; }
    Sfx.growl(heavy);
    this.popAlert(e);
  }
  walkerNav(e, dt, now, onGround, speed = e.def.chase) {                // true while it's taking a route to you rather than a straight run
    const b = e.body;
    if (e.navAir) { this.followPath(e, now, onGround, speed, dt); if (Math.abs(b.velocity.x) > 10) e.dir = b.velocity.x > 0 ? 1 : -1; return true; }
    if (!onGround || e.stunT > 0) return false;
    if ((e.repathT = (e.repathT || 0) - dt) <= 0) { e.repathT = e.walkNav ? 0.5 : 0.35; this.walkerPlan(e); }
    if (!e.walkNav) return false;
    if (!this.followPath(e, now, onGround, speed, dt)) { e.walkNav = false; return false; }
    if (!e.navAir && Math.abs(b.velocity.x) < 8) { if ((e.stuckT = (e.stuckT || 0) + dt) > 0.9) { e.walkNav = false; e.path = null; e.stuckT = 0; e.repathT = 1.2; return false; } }
    else e.stuckT = 0;
    if (Math.abs(b.velocity.x) > 10) e.dir = b.velocity.x > 0 ? 1 : -1;
    return true;
  }
  // The ground kinds that hold ground and shoot (the Gatling, Swapper, Strider and Warhorn, #204): while one sees you
  // it keeps its own range along the floor. When it can't, it takes a spot that does from pickPosition, which weighs
  // your weapon, and walks the nav graph there, jumps and drops included. True while it's on that route.
  standoff(e, dt, now, onGround, speed) {
    const b = e.body, pb = this.player.body;
    e.lkx = pb.center.x; e.lky = pb.center.y;                           // a roused one always knows where you are
    if (e.navAir) { this.followPath(e, now, onGround, speed, dt); return true; }
    if (!onGround || e.stunT > 0) return false;
    if (e.sees) { e.path = null; e.goalNode = -1; return false; }        // in sight: its own range and its shots
    if (!e.path && (e.repickT = (e.repickT || 0) - dt) <= 0) {
      e.repickT = 1.5;
      if (!this.pickPosition(e, 'attack')) this.pathTo(e, navBelow(e.lkx, e.lky - 4), 140);
    }
    if (!e.path) return false;
    if (!this.followPath(e, now, onGround, speed, dt)) { e.path = null; e.goalNode = -1; return false; }
    if (!e.navAir && Math.abs(b.velocity.x) < 8) { if ((e.stuckT = (e.stuckT || 0) + dt) > 0.9) { e.path = null; e.goalNode = -1; e.stuckT = 0; e.repickT = 1.2; return false; } }
    else e.stuckT = 0;
    return true;
  }
  heavyStomp(e) {
    const b = e.body; e.ai = 'chase';
    this.shake(220, 0.01); Sfx.stomp();
    this.blastTiles(b.center.x, b.bottom + 4, 22, 22);
    for (const a of [0, Math.PI]) this.fx.emit(b.center.x, b.bottom - 1, { n: 10, speed: [60, 200], angle: a, spread: 0.5, life: [0.3, 0.6], size: [4, 2], cols: [0x6a6e76, 0x4a4e56], alpha: [0.7, 0], g: -40, drag: 3 });
    const pb = this.player.body;
    if (this.state !== 'dead' && (pb.blocked.down || pb.touching.down) && Math.abs(pb.center.x - b.center.x) < 80 && Math.abs(pb.bottom - b.bottom) < 20) this.hurtPlayer(TUNE.HEAVY_STOMP, b.center.x);
  }
  fireBolt(e) {
    const b = this.bolts.getFirstDead(false); if (!b) return;
    const sx = e.x + e.dir * 5, sy = e.y, S = TUNE.DRONE_BOLT.speed;
    const ang = this.aimLead(sx, sy, S, { k: 0.8, maxT: 0.7 });          // a slow bolt: it leads you, but not all the way
    b.enableBody(true, sx, sy, true, true); b.body.setAllowGravity(false); b.body.setSize(5, 5, true);
    b.setVelocity(Math.cos(ang) * S, Math.sin(ang) * S);
    Object.assign(b, { life: 4, px: sx, py: sy });
    Sfx.zap(); this.spawnLight(sx, sy, 'glow', 0xff40b0, 0.8, 1.6, 0.8, 0.15);
  }

  // ----------------------------------------------------------------- tactics ----
  // What makes the foes smart beyond their own kind's moves, shared by all of them:
  //  - they read where you're going (your run speed smoothed, so a jink isn't a heading, the arc of a jump down to the
  //    floor it lands on, the wall that stops you) and lead their shots by a share of it that rises with the difficulty;
  //  - they read your gun: a short reach keeps gunmen at a distance, splash spreads them out, and against a long-range
  //    gun they close in and hold spots with cover a step away;
  //  - walkers path to you over the nav graph and steer clear of the routes their packmates already took, so a pack
  //    comes at your deck from both ends;
  //  - squads cover each other, fan out to search, watch the corner you went round, shoot the drum by your feet, and
  //    call it all out. Barks are only shown: they draw no random numbers and change nothing in play.
  updateTactics(dt, now) {
    const pb = this.player.body;
    this.pvx = (this.pvx || 0) + (pb.velocity.x - (this.pvx || 0)) * Math.min(1, dt * 7);
    this.updateBarks(now);
    if ((this.tacT = (this.tacT || 0) - dt) > 0) return;
    this.tacT = 0.25;
    this.threat = this.weaponThreat(WEAPONS[this.weapon]);
    const claim = this.navClaim || (this.navClaim = new Map());          // the nav cells walkers' routes already use, and how many
    claim.clear();
    for (const o of this.enemies.getChildren()) {
      if (!o.alive || !o.walkNav || !o.path) continue;
      for (let i = o.pathI; i < o.path.length; i++) { const id = o.path[i].to; claim.set(id, (claim.get(id) || 0) + 1); }
    }
  }
  weaponThreat(W) {                                                     // 'close', 'blast', 'far' or 'mid': how far your gun reaches and how it hurts
    if (!W) return 'mid';
    if (W.radius >= 40) return 'blast';
    const reach = W.range || W.reach || (W.speed && W.life ? W.speed * W.life : 0) || 400;
    return reach < 180 ? 'close' : reach >= 600 && (W.cooldown || 0) >= 400 ? 'far' : 'mid';
  }
  predictPlayer(t) {                                                    // where you'll be in t seconds, as far as a foe can tell
    const pb = this.player.body, hw = pb.halfWidth, hh = pb.halfHeight, x0 = pb.center.x, y0 = pb.center.y;
    let x = clamp(x0 + this.pvx * t, 8, LW - 8);
    const s = Math.sign(x - x0);
    if (s) for (let xx = x0 + s * 6; (xx - x) * s < 0; xx += s * 6) if (this.solidAt(xx + s * hw, y0)) { x = xx; break; }   // you'd stop at the wall
    let y = y0;
    if (!(pb.blocked.down || pb.touching.down)) {                       // in the air: the arc, down to the floor under where you'll be
      y = Math.min(y0 + pb.velocity.y * t + 0.5 * this.physics.world.gravity.y * t * t, LH - hh);
      for (let yy = y0 + 2; yy < y; yy += 8) if (this.standAt(x, yy + hh)) { y = Math.min(y, Math.floor((yy + hh) / TS) * TS - hh); break; }
    }
    return { x, y };
  }
  aimLead(sx, sy, speed, opts = {}) {                                   // the angle a shot at that speed takes from (sx, sy) to meet you
    const pb = this.player.body, k = (opts.k ?? 1) * TUNE.AI.lead[this.runDiff] * (this.lab?.stationary ? 0 : 1), maxT = opts.maxT ?? 1, oy = opts.oy || 0;
    let t = Math.hypot(pb.center.x - sx, pb.center.y + oy - sy) / speed, P = null;
    for (let i = 0; i < 3; i++) { P = this.predictPlayer(Math.min(t, maxT)); t = Math.hypot(P.x - sx, P.y + oy - sy) / speed; }
    return Math.atan2(pb.center.y + (P.y - pb.center.y) * k + oy - sy, pb.center.x + (P.x - pb.center.x) * k - sx);
  }
  // Barks: a few words over a foe's head when it does something clever. One at a time across the arena, and each foe
  // waits a while before it speaks again, so they stay readable.
  bark(e, text, col = '#ffe46a') {
    if (!e?.alive || this.lab?.stationary || this.state !== 'play') return;
    const now = this.time.now, T = TUNE.AI;
    if (now < (this.barkAt || 0) || now < (e.barkAt || 0) || !this.cameras.main.worldView.contains(e.x, e.y)) return;
    this.barkAt = now + T.barkGap; e.barkAt = now + T.barkEach;
    const key = 'bark_' + text.replace(/[^A-Z]/g, '') + col.slice(1);
    if (!this.textures.exists(key)) {
      const w = text.length * 6 + 3, tex = this.textures.createCanvas(key, w, 10), ctx = tex.getContext();
      for (const [ox, oy] of [[0, 1], [2, 1], [1, 0], [1, 2], [2, 2]]) drawGlyphs(ctx, text, ox, oy, '#1a0c08');
      drawGlyphs(ctx, text, 1, 1, col);
      tex.refresh();
    }
    const pool = this.barkPool || (this.barkPool = []);
    let img = pool.find(o => !o.on);
    if (!img && pool.length < 6) { img = this.add.image(0, 0, key).setDepth(17).setOrigin(0.5, 1); pool.push(img); }
    if (!img) img = pool.reduce((a, o) => (o.t0 < a.t0 ? o : a));
    img.setTexture(key).setVisible(true).setAlpha(1);
    Object.assign(img, { on: true, t0: now, who: e });
    img.setPosition(Math.round(e.x), Math.round(e.body.top - 4));
  }
  updateBarks(now) {
    for (const img of this.barkPool || []) {
      if (!img.on) continue;
      const k = (now - img.t0) / TUNE.AI.barkMs, e = img.who;
      if (k >= 1 || img.t0 > now) { img.on = false; img.setVisible(false); img.who = null; continue; }
      if (e?.active) img.setPosition(Math.round(e.x), Math.round(e.body.top - 4 - Math.min(1, k * 6) * 3));
      img.setAlpha(k > 0.75 ? (1 - k) * 4 : 1);
    }
  }
  // Walkers (grunts, heavies): straight at you on your own floor; otherwise over the nav graph, steering off the cells
  // their packmates' routes already use, so a second one takes the stairs at the other end if there are any.
  walkerPlan(e) {
    const b = e.body, pb = this.player.body, me = navAt(b.center.x, b.bottom), you = navBelow(pb.center.x, pb.bottom - 2);
    e.walkNav = false;
    if (me < 0 || you < 0) return;
    const A = NAV.nodes[me], B = NAV.nodes[you];
    if (A.y === B.y && this.walkSpan(A.x, B.x, A.y)) { e.path = null; return; }   // the same floor with nothing between: charge
    const claim = this.navClaim, mine = new Set(e.path ? e.path.map(st => st.to) : []), F = TUNE.AI.flankCost;
    let flanked = false;
    const res = navDijkstra(me, you, 160, (u, ed) => {
      const c = claim ? (claim.get(ed.to) || 0) - (mine.has(ed.to) ? 1 : 0) : 0;
      return ed.cost + (c > 0 ? c * F : 0);
    });
    let goal = you;
    if (!isFinite(res.dist[you])) {                                      // out of reach: wait at the reachable cell nearest you
      const far = n => Math.abs(n.x - B.x) + 2 * Math.abs(n.y - B.y);
      let bd = far(A) - 3; goal = -1;
      for (const u of res.reached) { const d = far(NAV.nodes[u]); if (d < bd) { bd = d; goal = u; } }
      if (goal < 0) return;
    }
    const path = navPath(res, goal); if (!path.length) return;
    for (let i = 0; i < Math.min(path.length, 6); i++) if ((claim?.get(path[i].to) || 0) > (mine.has(path[i].to) ? 1 : 0)) flanked = true;
    const lead = NAV.nodes[path[Math.min(3, path.length - 1)].to];
    if (claim?.size && !flanked && Math.abs(B.x - A.x) > 4 && Math.sign(lead.x - A.x) === -Math.sign(B.x - A.x)) this.bark(e, 'FLANKING!', '#ff9a6a');   // it set off away from you, round the other way
    Object.assign(e, { path, pathI: 0, goalNode: goal, walkNav: true, navAir: false, stuckT: 0 });
  }
  walkSpan(x0, x1, y) { const s = Math.sign(x1 - x0); for (let x = x0; x !== x1; x += s) if (NAV.id(x, y) < 0) return false; return true; }
  rocketHop(e, now, onGround) {                                         // a grunt that sees your rocket coming hops it
    if (!onGround || now < (e.hopAt || 0) || e.stunT > 0) return;
    const b = e.body, cx = b.center.x, cy = b.center.y;
    for (const r of this.rocketList) {
      if (!r.active) continue;
      const vx = r.body.velocity.x, vy = r.body.velocity.y, vv = vx * vx + vy * vy; if (!vv) continue;
      const rx = cx - r.x, ry = cy - r.y, t = (rx * vx + ry * vy) / vv;
      if (t <= 0.12 || t > 0.4 || Math.hypot(rx - vx * t, ry - vy * t) > 22 || Math.abs(vy) > Math.abs(vx)) continue;
      e.hopAt = now + 1500;
      if (Math.random() < TUNE.AI.rocketHop) { b.velocity.y = -e.def.jumpV; this.fxDust(cx, b.bottom, 3); }
      return;
    }
  }
  // Drones: a hover spot that can see you, clear of the other fliers' spots and off the line you're aiming down.
  droneSlot(e) {
    const p = this.player, b = e.body, pcx = p.body.center.x, pcy = p.body.center.y, far = e.hp < e.def.hp * 0.4 ? 1.35 : 1;
    const mates = this.enemies.getChildren().filter(o => o !== e && o.alive && FLIERS.has(o.kind) && Math.abs(o.x - e.x) < 260);
    let best = null, bs = -1e9;
    for (const [ox0, oy0] of DRONE_SLOTS) {
      const ox = ox0 * far, oy = oy0 * far, x = p.x + ox, y = p.y + oy;
      if (x < 16 || x > LW - 16 || y < 16 || this.solidAt(x, y)) continue;
      let s = -Math.hypot(x - b.center.x, y - b.center.y) * 0.35;
      if (!this.los(x, y, pcx, pcy - 4)) s -= 260;                        // somewhere it can actually shoot from
      if (!this.los(b.center.x, b.center.y, x, y)) s -= 80;               // without flying through a wall to get there
      for (const o of mates) { const mx = o.slotX !== undefined ? p.x + o.slotX : o.x, my = o.slotY !== undefined ? p.y + o.slotY : o.y; if (Math.hypot(mx - x, my - y) < 56) s -= 120; }
      let da = Math.abs(Math.atan2(y - this.shoulder.y, x - this.shoulder.x) - this.aim) % (Math.PI * 2); if (da > Math.PI) da = Math.PI * 2 - da;
      if (da < 0.5) s -= 70;                                              // out of your sights
      if (s > bs) { bs = s; best = [ox, oy]; }
    }
    if (best) { e.slotX = best[0]; e.slotY = best[1]; }
  }
  // Humanoid squads.
  underFire(e, now) { return now > (e.suppCd || 0) && (e.hurtWin || 0) * Math.exp(-(now - (e.hurtAt || 0)) / 1000) > e.def.hp * TUNE.AI.suppress; }
  coverMe(e, idle) {                                                    // the nearest gunman who can see you opens up while this one ducks
    let best = null, bd = 320;
    for (const o of this.enemies.getChildren()) {
      if (o === e || !o.alive || !isRifleman(o) || o.ai !== 'engage' || !o.sees) continue;
      const d = Math.hypot(o.x - e.x, o.y - e.y); if (d < bd) { bd = d; best = o; }
    }
    if (best) { best.fireCd = Math.min(best.fireCd, 0.05); best.snapAim = true; this.bark(e, 'COVER ME!'); }
    else this.bark(e, idle ? 'RELOADING' : 'TAKING FIRE!');
  }
  startSearch(e, now) {                                                 // lost you: the first goes where you were heading, the next watches the corner, the rest check behind
    e.ai = 'search'; e.searchUntil = now + 6000; e.watching = false;
    let mates = 0;
    for (const o of this.enemies.getChildren()) if (o !== e && o.alive && isHumanoid(o) && o.ai === 'search' && Math.hypot(o.x - e.x, o.y - e.y) < 420) mates++;
    const head = clamp((e.lvx || 0) * TUNE.AI.searchLead, -120, 120);
    if (mates === 1 && isRifleman(e) && this.pickPosition(e, 'watch')) { e.watching = true; e.searchUntil = now + 7000; this.bark(e, 'WATCHING'); return; }
    const gx = clamp(mates ? e.lkx - Math.sign(head) * 72 : e.lkx + head, 24, LW - 24);
    if (!this.pathTo(e, navBelow(gx, e.lky - 4), 160)) this.pathTo(e, navBelow(e.lkx, e.lky - 4), 160);
    this.bark(e, mates ? 'FAN OUT!' : 'LOST VISUAL');
  }
  searchStep(e, dt, now, c) {                                           // the search state the gunmen share; 'engage' once it has you again
    if (c.canSee || now - e.lkT < 300) {
      e.ai = 'engage'; e.repickT = e.watching ? 1.5 : 0;
      if (c.canSee) { e.fireCd = Math.min(e.fireCd, e.watching ? 0 : 0.3); e.snapAim = true; this.bark(e, 'THERE!'); }
      e.watching = false;
      return 'path';
    }
    if (now > e.searchUntil || !c.alive) { e.ai = 'idle'; e.aggro = false; e.watching = false; return 'hold'; }
    if (!e.path || e.pathI >= e.path.length) { if (e.watching) e.dir = Math.sign(e.lkx - e.x) || e.dir; else this.lookAround(e, dt, 2.5); return 'hold'; }
    return 'path';
  }
  aimStart(e, now, ms) {                                                // a snap aim (covering fire, a target found) starts part way into the track
    e.ai = 'aim'; e.aimStart = now - (e.snapAim ? ms * 0.4 : 0); e.aiUntil = e.aimStart + ms; e.snapAim = false;
  }
  sideStep(e, c) {                                                      // which way to hop out of your line: away if there's floor that way
    const b = e.body, away = -Math.sign(c.dx) || 1;
    return this.standAt(b.center.x + away * 30, b.bottom + 4) ? away : -away;
  }
  barrelNearYou(e) {                                                    // a drum by your feet, clear of its own side: worth a burst
    const pb = this.player.body, sx = e.x, sy = e.y - 2;
    let best = null, bd = TUNE.AI.kegReach;
    for (const k of this.barrelList) {
      if (!k.active || k.fuse > 0 || k.burning) continue;
      const d = Math.hypot(k.x - pb.center.x, k.y - pb.center.y);
      if (d >= bd || Math.hypot(k.x - sx, k.y - sy) < 110 || !this.los(sx, sy, k.x, k.y - 4)) continue;
      if (this.segDist(pb.center.x, pb.center.y, sx, sy, k.x, k.y - 1)[0] < 12) continue;   // you're in the line: it'd only hit you, so it shoots you instead
      if (this.enemies.getChildren().some(o => o.alive && o !== e && Math.abs(o.x - k.x) < 72 && Math.abs(o.y - k.y) < 48)) continue;
      bd = d; best = k;
    }
    return best;
  }
  allyDown(e, now) {                                                    // a squadmate drops: those that see it go down know where you are
    const pb = this.player.body; let told = null;
    for (const o of this.enemies.getChildren()) {
      if (!o.alive || !isHumanoid(o) || Math.hypot(o.x - e.x, o.y - e.y) > TUNE.AI.downR || !this.los(o.x, o.y - 6, e.x, e.y - 6)) continue;
      o.lkx = pb.center.x; o.lky = pb.center.y; o.lkT = now;
      if (o.ai === 'idle') this.alertHumanoid(o, now, false);
      told = told || o;
    }
    if (told) this.bark(told, 'MAN DOWN!');
  }
  lookAround(e, dt, rate = 1) { e.lookT -= dt * rate; if (e.lookT <= 0) { e.dir *= -1; e.lookT = rand(1.4, 3.2); } }
  // Hurt humanoids detour to a nearby medkit, which also denies it to you.
  seekPack(e, now) {
    if (e.hp >= e.def.hp * 0.5 || now < e.healCheckT) return false;
    e.healCheckT = now + 2500;
    const start = navAt(e.body.center.x, e.body.bottom); if (start < 0) return false;
    const r = navDijkstra(start, -1, 40);
    let best = null, bestC = 40;
    for (const k of this.pickups) {
      if (k.taken) continue;
      const n = navBelow(k.x, k.y);
      if (n >= 0 && r.dist[n] < bestC) { bestC = r.dist[n]; best = n; e.pack = k; }
    }
    if (best === null) return false;
    e.ai = 'getpack'; e.goalNode = best; e.path = navPath(r, best); e.pathI = 0; e.navAir = false;
    Sfx.radio(); this.bark(e, 'MEDKIT!', '#7dff8a');
    return true;
  }
  packStep(e) {                                                       // false once the medkit trip is over
    const k = e.pack;
    if (!k || k.taken) { e.pack = null; return false; }
    if (Math.abs(e.body.center.x - k.x) < 12 && Math.abs(e.body.center.y - k.y) < 18) {
      k.taken = true; k.img.setVisible(false); k.glow.setVisible(false);
      const amt = Math.min(e.def.hp - e.hp, 40); e.hp += amt; e.healAcc += amt; e.healFlushAt = this.time.now + 50;
      this.fx.emit(k.x, k.y, { n: 14, speed: [30, 100], life: [0.3, 0.6], size: [2, 1], cols: [0xffffff, 0x7dff8a, 0x2ad05a], add: true, g: -60, drag: 2 });
      Sfx.pickup(); BUS.emit('callout', 'MEDKIT STOLEN'); e.pack = null;
      return false;
    }
    if (!e.path || e.pathI >= e.path.length) { e.pack = null; return false; }
    return true;
  }
  stalkerRecover(e) {
    const b = e.body;
    e.ai = 'recover'; e.aiUntil = this.time.now; e.attackCd = rand(1.0, 1.5); e.path = null; e.navAir = false;
    b.velocity.x = -e.dir * 170; b.velocity.y = -230;                // backflip out of reach
  }

  // Score every reachable node for the job at hand (line of sight, range, height, travel, squad spacing, grenades).
  // The range it wants depends on your gun (weaponThreat): out of a short reach, spread out against splash, and in
  // close with cover a step away against a long-range one. 'watch' covers the spot it last saw you from a distance.
  pickPosition(e, mode) {
    const start = navAt(e.body.center.x, e.body.bottom); if (start < 0) return false;
    const snipe = mode === 'snipe', watch = mode === 'watch', res = navDijkstra(start, -1, snipe ? 60 : 36), tx = e.lkx, ty = e.lky;
    const th = this.threat || 'mid', ideal = th === 'close' ? TUNE.AI.closeIdeal : th === 'far' ? TUNE.AI.farIdeal : 165, near = th === 'close' ? 150 : 80;
    const gap = th === 'blast' ? 6 : 4, crowd = th === 'blast' ? 110 : 70, here = NAV.nodes[start];
    let best = -1, bestS = -1e9;
    for (const id of res.reached) {
      const n = NAV.nodes[id], nx = n.x * TS + 8, ny = (n.y + 1) * TS - 14, d = Math.hypot(nx - tx, ny - ty);
      if (d > (snipe ? 480 : 360)) continue;
      const los = this.los(nx, ny, tx, ty);
      let s = -res.dist[id] * (mode === 'cover' ? 3 : snipe ? 0.6 : 1.2);
      if (mode === 'attack') {
        if (!los) continue;
        s -= Math.abs(d - ideal) * 0.5 + (d < near ? 150 : 0); s += clamp(ty - ny, -40, 60) * 0.6;
        if (th === 'far' && (!this.los(nx - 32, ny, tx, ty) || !this.los(nx + 32, ny, tx, ty))) s += 45;   // cover a step away: duck between your shots
      }
      else if (mode === 'cover') s -= (los ? 400 : 0) + (d < 90 ? 120 : 0) + Math.abs(d - 170) * 0.15;
      else if (snipe) { if (!los) continue; s -= Math.abs(d - 320) * 0.35 + (d < 180 ? 200 : 0); s += clamp(ty - ny, -40, 140); if (e.scoot && Math.abs(n.x - here.x) < 6) s -= 220; }   // high and far, and somewhere new after a shot
      else if (watch) { if (!los) continue; s -= Math.abs(d - 190) * 0.4 + (d < 100 ? 200 : 0); }
      else s += (los ? -250 : 0) + Math.min(d, 320) * 0.6;
      for (const o of this.enemies.getChildren()) {
        if (o !== e && o.alive && o.goalNode >= 0) { const g = NAV.nodes[o.goalNode]; if (Math.abs(g.x - n.x) + Math.abs(g.y - n.y) < gap) s -= crowd; }
      }
      for (const g of this.grenadeList) if (g.active && Math.hypot(g.x - nx, g.y - ny) < 70) s -= 300;
      if (mode === 'attack') for (const o of this.enemies.getChildren()) {   // pincer: prefer the opposite side of you from squadmates
        if (o === e || !o.alive || !isHumanoid(o) || o.goalNode < 0 || !o.aggro) continue;
        const side = Math.sign(NAV.nodes[o.goalNode].x * TS + 8 - tx);
        if (side) s += Math.sign(nx - tx) === side ? -20 : 25;
      }
      if (s > bestS) { bestS = s; best = id; }
    }
    if (best < 0) return false;
    e.goalNode = best; e.path = navPath(res, best); e.pathI = 0; e.navAir = false;
    return true;
  }
  pathTo(e, goal, maxCost) {
    if (goal < 0) return false;
    const start = navAt(e.body.center.x, e.body.bottom); if (start < 0) return false;
    const res = navDijkstra(start, goal, maxCost);
    if (!isFinite(res.dist[goal])) {                                     // out of planning range: head for the reachable cell nearest the goal
      const G = NAV.nodes[goal], S = NAV.nodes[start], far = n => Math.abs(n.x - G.x) + 2 * Math.abs(n.y - G.y);
      let best = -1, bd = far(S) - 4;
      for (const u of res.reached) { const d = far(NAV.nodes[u]); if (d < bd) { bd = d; best = u; } }
      if (best < 0) return false;
      goal = best;
    }
    e.goalNode = goal; e.path = navPath(res, goal); e.pathI = 0; e.navAir = false;
    return true;
  }
  // Steering along a nav path. Jumps line up on the take-off cell, launch with just enough height,
  // then steer in the air so the feet land on the target cell (solves the remaining fall time each frame).
  followPath(e, now, onGround, speed, dt) {
    const b = e.body, G = this.physics.world.gravity.y;
    if (!e.path || e.pathI >= e.path.length) return false;
    let step = e.path[e.pathI], n = NAV.nodes[step.to];
    if (e.navAir || !onGround) {
      if (onGround && now > e.navAirT + 80) e.navAir = false;
      else {
        if (!e.navAir) {
          if (step.type !== 'drop' && step.type !== 'fall') return true;
          e.navAir = true; e.navAirT = now;
        }
        const tx = n.x * TS + 8, surf = (n.y + 1) * TS, vy = b.velocity.y, disc = vy * vy + 2 * G * (surf - b.bottom);
        if (step.up && b.bottom > surf - 2 && vy < 0) b.velocity.x = approach(b.velocity.x, 0, 1500 * dt);   // rise straight first
        else if (disc >= 0) b.velocity.x = clamp((tx - b.center.x) / Math.max((-vy + Math.sqrt(disc)) / G, 0.06), -260, 260);
        return true;
      }
    }
    const cur = navAt(b.center.x, b.bottom);
    for (let guard = 0; cur === step.to && guard < 4; guard++) {
      e.pathI++;
      if (e.pathI >= e.path.length) return false;
      step = e.path[e.pathI]; n = NAV.nodes[step.to];
    }
    const f = NAV.nodes[step.from];
    if (cur >= 0 && NAV.nodes[cur].y !== f.y) { e.path = null; e.repickT = 0; e.repathT = 0; return false; }   // knocked off course
    if (step.type === 'jump' || step.type === 'fall') {
      const fx = f.x * TS + 8 + (step.type === 'jump' && n.y < f.y && n.x !== f.x ? Math.sign(f.x - n.x) * Math.max(0, b.halfWidth - 4) : 0);   // a wide body takes off a hair back from the ledge it's jumping up to, or it bonks its underside
      if (Math.abs(fx - b.center.x) > 3) {                            // line up on the take-off cell
        b.velocity.x = approach(b.velocity.x, Math.sign(fx - b.center.x) * Math.min(speed, Math.abs(fx - b.center.x) * 9 + 20), 2400 * dt);
        return true;
      }
      b.velocity.x = 0; e.navAir = true; e.navAirT = now;
      if (step.type === 'fall') { e.dropUntil = now + 320; b.velocity.y = 60; return true; }
      step.up = n.y < f.y;
      b.velocity.y = -Math.sqrt(2 * G * (step.up ? (f.y - n.y) * TS + 24 : 22));
      this.fxDust(b.center.x, b.bottom, 3);
      return true;
    }
    b.velocity.x = approach(b.velocity.x, (Math.sign(n.x * TS + 8 - b.center.x) || e.dir) * speed, 1800 * dt);
    return true;
  }

  // Threat evasion: hop over / sidestep incoming rockets, run from grenades that are about to pop.
  evade(e, now, onGround) {
    const b = e.body, cx = b.center.x, cy = b.center.y, D = e.def;
    if (onGround && e.dodgeCd <= 0) for (const r of this.rocketList) {
      if (!r.active) continue;
      const vx = r.body.velocity.x, vy = r.body.velocity.y, vv = vx * vx + vy * vy; if (!vv) continue;
      const rx = cx - r.x, ry = cy - r.y, t = (rx * vx + ry * vy) / vv;
      if (t <= 0.12 || t > 0.45 || Math.hypot(rx - vx * t, ry - vy * t) > 26) continue;   // < 0.12 s out: too late to react
      e.dodgeCd = D.dodgeCd;
      if (Math.random() > D.dodge) return;                            // not every time - they're good, not psychic
      if (Math.abs(vx) > Math.abs(vy) * 1.5) this.humanoidDodge(e, now, Math.sign(vx) * 50, -360);
      else this.humanoidDodge(e, now, (Math.sign(rx) || 1) * 230, -200);
      return;
    }
    for (const g of this.grenadeList) {
      if (!g.active) continue;
      const gx = g.x - cx, gy = g.y - cy, d = Math.hypot(gx, gy);
      if (d > 78 || g.fuse > 1.15) continue;
      if (e.fleeT <= 0) this.bark(e, 'GRENADE!');
      e.fleeT = 0.5; e.fleeDir = gx > 0 ? -1 : 1;
      if (onGround && e.dodgeCd <= 0 && d < 44) { e.dodgeCd = D.dodgeCd; if (Math.random() < D.dodge) this.humanoidDodge(e, now, e.fleeDir * 240, -270); }
      return;
    }
  }
  humanoidDodge(e, now, vx, vy) {
    const b = e.body;
    b.velocity.x = vx; b.velocity.y = vy;
    e.ai = 'dodge'; e.aiUntil = now; e.path = null; e.navAir = false;
    this.fxDust(b.center.x, b.bottom, 4); Sfx.whoosh();
  }
  playerAimingAt(e) {
    if (this.state === 'dead' || this.time.now - this.lastShotT > 350) return false;
    const a = Math.atan2(e.body.center.y - this.shoulder.y, e.body.center.x - this.shoulder.x);
    let d = Math.abs(a - this.aim) % (Math.PI * 2); if (d > Math.PI) d = Math.PI * 2 - d;
    return d < 0.3;
  }
  leadAngle(e, speed = TUNE.ENFORCER.bulletSpeed) { return this.aimLead(e.x, e.y - 2, speed); }   // where you'll be, the arc of a jump included
  enforcerShoot(e) {
    const T = TUNE.ENFORCER, sx = e.x + (e.dir > 0 ? 0 : -1), sy = e.y - 2, a = e.aimA + rand(-2.5, 2.5) * (e.keg ? 0.4 : 1) * DEG;   // a drum holds still: a tight group
    const mx = sx + Math.cos(e.aimA) * 21, my = sy + Math.sin(e.aimA) * 21;
    e.recoil = 2;
    this.spawnLight(mx, my, 'glow', 0xffa040, 0.7, 1.1, 0.9, 0.08);
    this.fxSparks(mx, my, 2, e.aimA, 0.6, [60, 140]);
    Sfx.eshot();
    if (this.solidAt(mx, my) || !this.los(sx, sy, mx, my)) return;
    this.spawnEBullet(mx, my, a, T.bulletSpeed, T.damage, { life: 1.4, keg: e.keg || null });
  }
  onEBulletHit(p, b) {
    if (!b.active || this.state === 'dead') return;
    const x = b.x, y = b.y, a = b.ang;
    b.disableBody(true, true);
    this.fxSparks(x, y, 3, a + Math.PI, 1.4, [40, 120]);
    p.body.velocity.x += Math.cos(a) * 60;
    this.hurtPlayer(b.dmg || TUNE.ENFORCER.damage, x - Math.cos(a) * 40, { knock: false, iframes: false, srcY: y - Math.sin(a) * 40 });
    if (b.snipe) { this.shake(120, 0.006); BUS.emit('splat', 1); }
  }
  alertHumanoid(e, now, shout) {
    if (this.lab?.stationary || e.ai !== 'idle') return;
    e.aggro = true; e.ai = { enforcer: 'engage', stalker: 'hunt', bulwark: 'advance', sniper: 'engage', rocketeer: 'engage', sapper: 'hunt', cloaker: 'hunt', pyro: 'engage', harpooner: 'engage', mirror: 'advance', duelist: 'hunt', grenadier: 'engage' }[e.kind] || 'engage'; e.repickT = 0; e.repathT = 0;
    this.popAlert(e);
    if (!shout) return;
    if (e.kind === 'stalker') Sfx.hiss(); else Sfx.radio();
    for (const o of this.enemies.getChildren()) {                     // radio it in: nearby humanoids join
      if (o === e || !o.alive || !isHumanoid(o) || o.ai !== 'idle' || Math.hypot(o.x - e.x, o.y - e.y) > 420) continue;
      o.lkx = e.lkx; o.lky = e.lky; o.lkT = now;
      this.time.delayedCall(rand(200, 500), () => { if (o.alive) this.alertHumanoid(o, this.time.now, false); });
    }
  }
  // Sound: gunfire reveals your position, explosions draw attention to the blast.
  makeNoise(x, y, r, fromPlayer) {
    if (this.state === 'dead' || this.lab?.stationary) return;
    const now = this.time.now, pb = this.player.body;
    for (const e of this.enemies.getChildren()) {
      if (!e.alive || Math.hypot(e.x - x, e.y - y) > r) continue;
      if (isHumanoid(e)) {
        if (now - e.lastSeenT < 600) continue;
        e.lkx = fromPlayer ? pb.center.x : x; e.lky = fromPlayer ? pb.center.y : y; e.lkT = now;
        if (e.ai === 'idle') this.alertHumanoid(e, now, true);
      } else if (!e.aggro) this.alertEnemy(e, now);
    }
  }
  popAlert(e) {
    const a = this.add.image(e.x, e.body.top - 8, 'alert').setDepth(16);
    this.tweens.add({ targets: a, y: a.y - 10, alpha: 0, duration: 650, ease: 'Quad.easeOut', onComplete: () => a.destroy() });
  }
}

