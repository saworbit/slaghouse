import sys, re
SP, p = sys.argv[1], sys.argv[2]
s = open(p, encoding='utf-8').read()
ART = open(SP + 'mayhem_art.js', encoding='utf-8').read()
SCENE = open(SP + 'mayhem_scene.js', encoding='utf-8').read()

def rep(a, b, cnt=1):
    global s
    n = s.count(a)
    assert n == cnt, (n, a[:90])
    s = s.replace(a, b)
def after(a, add): rep(a, a + add)
def before(a, add): rep(a, add + a)

# ---------------------------------------------------------------- tuning / data
after("  TILE:    { span: 3 },                                   // girders/gratings may overhang this many tiles past an anchor\n",
"""  STAKE:   { cooldown: 900, speed: 640, damage: 65, life: 1.1, carry: 2 },
  MINE:    { cooldown: 650, max: 4, speed: 230, lift: 90, arm: 0.6, trigger: 30, radius: 52, maxDamage: 85, minDamage: 25, selfDamage: 14, push: 420, maxRise: 540, tileDamage: 90 },
  JET:     { speed: 150, range: 130, height: 56, tellMs: 350, burst: 4, gap: 0.09, bulletSpeed: 400, damage: 5,
             boom: { radius: 46, maxDamage: 50, minDamage: 14, selfDamage: 16, push: 360, maxRise: 460, tileDamage: 70 } },
  SAPPER:  { plantRange: 80, plantMs: 550, fuse: 2.0, cd: 4.5,
             blast: { radius: 54, maxDamage: 40, minDamage: 10, enemyDamage: 30, selfDamage: 28, push: 380, maxRise: 500, enemy: true, tileDamage: 120 } },
  BROOD:   { speed: 26, cd: 3.8, tellMs: 700, spawn: 2, max: 5, burst: 4 },
  CANISTER: { radius: 58, maxDamage: 70, minDamage: 20, selfDamage: 18, push: 420, maxRise: 560, tileDamage: 80 },
""")
after("  Object.assign({ id: 'cluster', name: 'CLUSTER MORTAR', gun: 'cluster' }, TUNE.CLUSTER),\n",
      "  Object.assign({ id: 'stake', name: 'STAKE DRIVER', gun: 'stake' }, TUNE.STAKE),\n")
before("  boss: { key: 'boss', fw: 48, fh: 44,",
"""  jet: { key: 'jet', fw: 20, fh: 24, bw: 10, bh: 18, hp: 55, sight: 320, touch: 6, kb: 0.9, head: 'g_jhelm',
         gibs: ['g_jarmor', 'g_jarmor', 'g_flesh1', 'g_flesh2', 'g_flesh3', 'g_chunk', 'g_bone', 'g_wire', 'g_plate'], gibN: [12, 15] },
  sapper: { key: 'sapper', fw: 18, fh: 24, bw: 10, bh: 20, hp: 50, speed: 150, sight: 280, touch: 6, kb: 1, dodge: 0.45, dodgeCd: 1.5, head: 'g_smask',
            gibs: ['g_satchel', 'g_flesh1', 'g_flesh2', 'g_flesh3', 'g_chunk', 'g_bone', 'g_rib', 'g_chunk'], gibN: [11, 14] },
  brood: { key: 'brood', fw: 34, fh: 26, bw: 26, bh: 20, hp: 170, sight: 260, touch: 14, kb: 0.2,
           gibs: ['g_egg', 'g_egg', 'g_egg', 'g_flesh1', 'g_flesh2', 'g_flesh3', 'g_flesh1', 'g_flesh2', 'g_flesh3', 'g_chunk', 'g_chunk', 'g_rib', 'g_bone'], gibN: [22, 28] },
""")
rep("e.kind === 'sniper' || e.kind === 'rocketeer';\nconst isRifleman", "e.kind === 'sniper' || e.kind === 'rocketeer' || e.kind === 'sapper';\nconst isRifleman")
after("const TILE_HP = { x: 55, g: 80, '=': 30 };                        // breakable tiles: crate, girder, grating",
      "\nconst CANISTERS = [[12, 24], [50, 20], [66, 16], [83, 24]];        // gas canisters: shoot one and it rockets about")
rep("""  [['bulwark', 'G'], ['bulwark', 'G'], ['mender', 'A'], ['enforcer', 'G'], ['sniper', 'G'], ['stalker', 'G'], ['drone', 'A'], ['tick', 'G'], ['tick', 'G'], ['tick', 'G'],
   ['rocketeer', 'G'], ['wasp', 'A']],
  [['rammer', 'G'], ['rammer', 'G'], ['rocketeer', 'G'], ['rocketeer', 'G'], ['wasp', 'A'], ['wasp', 'A'], ['grunt', 'G'], ['grunt', 'G'], ['stalker', 'G'],
   ['tick', 'G'], ['tick', 'G'], ['tick', 'G']],""",
"""  [['bulwark', 'G'], ['bulwark', 'G'], ['mender', 'A'], ['enforcer', 'G'], ['sniper', 'G'], ['stalker', 'G'], ['drone', 'A'], ['tick', 'G'], ['tick', 'G'], ['tick', 'G'],
   ['rocketeer', 'G'], ['wasp', 'A'], ['sapper', 'G']],
  [['rammer', 'G'], ['rammer', 'G'], ['rocketeer', 'G'], ['rocketeer', 'G'], ['wasp', 'A'], ['wasp', 'A'], ['grunt', 'G'], ['grunt', 'G'], ['stalker', 'G'],
   ['tick', 'G'], ['tick', 'G'], ['jet', 'A'], ['brood', 'G']],
  [['jet', 'A'], ['jet', 'A'], ['sapper', 'G'], ['sapper', 'G'], ['brood', 'G'], ['rammer', 'G'], ['rocketeer', 'G'], ['wasp', 'A'], ['bulwark', 'G'], ['mender', 'A'],
   ['enforcer', 'G'], ['heavy', 'G'], ['tick', 'G'], ['tick', 'G']],""")

# ---------------------------------------------------------------- audio
before("  heart() { if (!this.ok('heart', 0.4)) return;",
"""  stake() { if (!this.ok('stake', 0.05)) return;                    // pneumatic thump + whoosh
    this.noise({ filter: 'lowpass', f0: 2600, f1: 300, dur: 0.18, vol: 0.5, dest: this.crunch }); this.tone({ type: 'sawtooth', f0: 180, f1: 60, dur: 0.16, vol: 0.2 });
    this.noise({ filter: 'highpass', f0: 3000, dur: 0.05, vol: 0.2 }); },
  pin() { if (!this.ok('pin', 0.05)) return;                        // stake biting into the wall
    this.tone({ type: 'square', f0: 520, f1: 140, dur: 0.1, vol: 0.12 }); this.tone({ type: 'triangle', f0: 2400, f1: 1800, dur: 0.25, vol: 0.06 }); this.noise({ filter: 'lowpass', f0: 900, dur: 0.1, vol: 0.3 }); },
  snap() { if (!this.ok('snap', 0.1)) return; this.noise({ filter: 'highpass', f0: 2800, dur: 0.06, vol: 0.3 }); this.tone({ type: 'triangle', f0: 3000, f1: 1200, dur: 0.12, vol: 0.06 }); },
  mineThrow() { if (!this.ok('mthrow', 0.05)) return; this.noise({ filter: 'bandpass', f0: 1500, q: 2, dur: 0.06, vol: 0.15 }); this.tone({ type: 'square', f0: 700, dur: 0.03, vol: 0.04 }); },
  mineArm() { if (!this.ok('marm', 0.05)) return; this.tone({ type: 'square', f0: 1200, dur: 0.04, vol: 0.05 }); this.tone({ type: 'square', f0: 1800, dur: 0.05, vol: 0.05, delay: 0.07 }); },
  mineTrig() { if (!this.ok('mtrig', 0.05)) return; this.tone({ type: 'square', f0: 2400, f1: 3000, dur: 0.12, vol: 0.07 }); },
  sputter() { if (!this.ok('sput', 0.07)) return; this.noise({ filter: 'bandpass', f0: rand(300, 900), q: 1.5, dur: 0.08, vol: 0.25 }); },
  gasHiss() { if (!this.ok('gas', 0.09)) return; this.noise({ filter: 'highpass', f0: 2500, dur: 0.12, vol: 0.16 }); },
  killcam() { if (!this.ok('kcam', 0.5)) return; this.tone({ type: 'sine', f0: 80, f1: 30, dur: 0.9, vol: 0.5 }); this.noise({ filter: 'bandpass', f0: 1800, f1: 200, q: 1, dur: 0.8, vol: 0.2 }); },
""")
rep("const HINT1 = 'A/D MOVE   SPACE/W JUMP   S+SPACE DROP   CLICK FIRE   F/RMB KICK+PARRY';",
    "const HINT1 = 'A/D MOVE  SPACE JUMP  S+SPACE DROP  CLICK FIRE  F/RMB KICK  G/MMB MINE';")
rep("const HINT2 = 'J FIRE (KEYS ONLY)   1-9 0 -  Q/E  WHEEL SWITCH   R RESTART   M MUTE';",
    "const HINT2 = 'J FIRE (KEYS ONLY)   1-9 0 - =  Q/E  WHEEL SWITCH   R RESTART   M MUTE';")
rep("'1-9 0 -  Q/E  WHEEL SWITCH WEAPON    R RESTART    M MUTE'", "'1-9 0 - =  Q/E  WHEEL    G / MIDDLE CLICK MINE    R RESTART'")

# ---------------------------------------------------------------- art
before("  rocket: { w: 28, h: 13, py: 6, muzzle: 26, draw(ctx, arm) {",
"""  stake: { w: 30, h: 12, py: 6, muzzle: 29, draw(ctx, arm) {
    if (arm) drawArm(ctx, 6);
    R(ctx, '#3a3f47', 5, 3, 12, 6); R(ctx, '#6a7380', 5, 3, 12, 1); R(ctx, '#23272d', 5, 8, 12, 1); R(ctx, '#e8b422', 9, 4, 3, 1);   // body
    R(ctx, '#7a3b20', 7, 9, 5, 3); R(ctx, '#a0582e', 7, 9, 5, 1);                                                                     // pressure tank
    R(ctx, '#2a2e35', 17, 4, 11, 4); R(ctx, '#15171a', 17, 5, 11, 2);                                                                 // channel
    R(ctx, '#b8c2cc', 17, 5, 10, 1); R(ctx, '#ffffff', 27, 5, 2, 1); R(ctx, '#8a94a0', 28, 3, 2, 6);                                 // loaded stake
  } },
""")
before("// ---- ragdoll parts: cut from each walker's own drawing", ART)
after("  rocketeer: { up: true, hp: 45, fw: 20, fh: 24, body: x => drawRocketeer(x, 0, [0, 0], [0, 0]), head: [5, 0, 10, 8], torso: [1, 8, 14, 7], P: RKLEG, legW: 3 },\n",
      "  sapper:   { up: true, hp: 40, fw: 18, fh: 24, body: x => drawSapper(x, 0, [0, 0], [0, 0], 'idle'), head: [4, 0, 11, 8], torso: [1, 8, 13, 7], P: SPLEG, legW: 3 },\n")
before("  g_barrel: [7, 5,",
"""  g_jhelm: [10, 8, c => { R(c, JT.b, 1, 1, 8, 5); R(c, JT.c, 2, 1, 4, 1); R(c, JT.k, 4, 3, 5, 2); R(c, JT.visor, 5, 3, 4, 1); R(c, '#7a0c0c', 1, 6, 4, 1); }],
  g_jarmor: [8, 6, c => { R(c, JT.b, 1, 1, 6, 4); R(c, JT.c, 1, 1, 6, 1); R(c, '#e8b422', 2, 3, 4, 1); }],
  g_smask: [8, 7, c => { R(c, SP.a, 1, 1, 6, 3); R(c, SP.mask, 2, 3, 5, 3); R(c, SP.lens, 3, 4, 1, 1); R(c, SP.lens, 5, 4, 1, 1); R(c, '#7a0c0c', 1, 6, 3, 1); }],
  g_satchel: [7, 5, c => { R(c, SP.bag, 1, 1, 5, 3); R(c, SP.bagL, 1, 1, 5, 1); R(c, SP.red, 2, 3, 3, 1); }],
  g_egg: [6, 6, c => { R(c, '#d8b028', 1, 1, 4, 4); R(c, '#fff8c0', 2, 1, 2, 2); R(c, '#9a7010', 1, 4, 4, 1); }],
  g_can: [7, 5, c => { R(c, '#2a6a3a', 1, 1, 5, 3); R(c, '#4aa060', 1, 1, 5, 1); R(c, '#e8b422', 3, 2, 2, 1); }],
""")
after("  addTex(scene, 'fb_=', makeSprite(16, 7, c => drawGrating(c, 0, 0, false, false), null));\n",
"""  addSheet(scene, 'jet', [{ name: 'j0', c: makeSprite(20, 24, x => drawJet(x, 0)) }, { name: 'j1', c: makeSprite(20, 24, x => drawJet(x, 1)) }], 20, 24, true);
  addTex(scene, 'gun_smg', makeSprite(18, 9, x => drawSMG(x, true)));
  addTex(scene, 'icon_smg', makeSprite(18, 9, x => drawSMG(x, false)));
  const spf = [{ name: 'idle', c: makeSprite(18, 24, x => drawSapper(x, 0, [1, 0], [-1, 0], 'idle')) }, { name: 'crouch', c: makeSprite(18, 24, x => drawSapper(x, 3, [2, 0], [-2, 0], 'crouch')) },
               { name: 'lunge', c: makeSprite(18, 24, x => drawSapper(x, 0, [4, 1], [-3, 0], 'run')) }, { name: 'air', c: makeSprite(18, 24, x => drawSapper(x, 0, [3, 3], [-2, 1], 'run')) }];
  for (let i = 0; i < 6; i++) spf.push({ name: 'run' + i, c: makeSprite(18, 24, x => drawSapper(x, RUN_BOB[i], RUN_LEGS[i], RUN_LEGS[(i + 3) % 6], 'run')) });
  addSheet(scene, 'sapper', spf, 18, 24, true);
  const brf = [];
  for (let i = 0; i < 4; i++) brf.push({ name: 'w' + i, c: makeSprite(34, 26, x => drawBrood(x, i, 0), null) });
  brf.push({ name: 'sw', c: makeSprite(34, 26, x => drawBrood(x, 0, 1), null) }, { name: 'sw2', c: makeSprite(34, 26, x => drawBrood(x, 1, 2), null) });
  addSheet(scene, 'brood', brf, 34, 26, true);
  addTex(scene, 'stake', makeSprite(16, 3, c => { R(c, '#b8c2cc', 0, 0, 12, 1); R(c, '#7c8692', 0, 1, 12, 1); R(c, '#3a3f47', 0, 2, 12, 1); R(c, '#d8e0e8', 12, 0, 2, 3); R(c, '#ffffff', 14, 1, 2, 1); R(c, '#5a3418', 0, 0, 2, 3); }, null));
  addTex(scene, 'mine', makeSprite(7, 5, c => { R(c, '#2a2e35', 0, 2, 7, 3); R(c, '#4a525c', 1, 2, 5, 1); R(c, '#e8b422', 1, 4, 5, 1); R(c, '#ff3020', 3, 1, 1, 1); }));
  addTex(scene, 'satchel', makeSprite(9, 7, c => { R(c, '#5a2a18', 1, 2, 7, 4); R(c, '#8a4a28', 1, 2, 7, 1); R(c, '#d02a1a', 2, 4, 5, 1); R(c, '#3a3f47', 3, 0, 3, 2); R(c, '#ffe040', 4, 0, 1, 1); }));
  addTex(scene, 'canister', makeSprite(9, 15, c => {
    R(c, '#2a6a3a', 1, 3, 7, 11); R(c, '#4aa060', 1, 3, 2, 11); R(c, '#1a4a26', 7, 3, 1, 11);
    for (let i = 0; i < 7; i++) R(c, (i >> 1) % 2 ? '#15161a' : '#e8b422', 1 + i, 7, 1, 2);
    R(c, '#8a94a0', 3, 1, 3, 2); R(c, '#c8d0d8', 4, 0, 1, 1); R(c, '#e0fff0', 3, 4, 1, 2);
  }));
""")

# ---------------------------------------------------------------- scene setup
rep("Sfx.miniSet(0); this.spin = 0; this.heat = 0;\n", "Sfx.miniSet(0); this.spin = 0; this.heat = 0;\n    this.mineReady = 0; this.mineQueued = false; this.killTimes = []; this.killCamUntil = 0; this.chaosT = []; this.chaosCd = 0; this.lastRag = null;\n")
rep("      this.add.image(x, y, 'lamp').setDepth(2);\n", "      const img = this.add.image(x, y, 'lamp').setDepth(2);\n")
rep("               t: Math.random() * 10, ph: Math.random() * 6, drop: 0 };", "               t: Math.random() * 10, ph: Math.random() * 6, drop: 0, img, x, y, falling: false, dead: false, vy: 0, hits: new Set() };")
after("    this.fblockList.forEach(f => f.setDepth(1.5));\n",
"""    [this.stakes, this.stakeList] = mk(8, 'stake', false);
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
""")
rep("    this.spawnBarrels(false);\n", "    this.spawnBarrels(false); this.spawnCanisters(false);\n")
rep("    this.spawnBarrels(true);\n", "    this.spawnBarrels(true); this.spawnCanisters(true);\n")
rep("flier = kind === 'drone' || kind === 'mender' || kind === 'wasp';", "flier = kind === 'drone' || kind === 'mender' || kind === 'wasp' || kind === 'jet';")
rep("boss: 'w0', wasp: 'p0' }[kind] || 'w0';", "boss: 'w0', wasp: 'p0', jet: 'j0', sapper: 'idle', brood: 'w0' }[kind] || 'w0';")
before("    } else if (kind === 'wasp') {",
"""    } else if (kind === 'jet') {
      e.body.setAllowGravity(false);
      Object.assign(e, { ai: 'fly', side: Math.random() < 0.5 ? -1 : 1, sideT: rand(2, 4), aimA: 0, recoil: 0, shotsLeft: 0, shotT: 0, fireCd: rand(1, 2) });
      e.gun = this.add.image(x, y, 'gun_smg').setOrigin(2 / 18, 4.5 / 9).setDepth(6);
      e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xffe040).setScale(0.3).setAlpha(0.85).setDepth(18);
      e.thr = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0x6ab0ff).setScale(0.7).setAlpha(0.6).setDepth(18);
    } else if (kind === 'brood') {
      Object.assign(e, { ai: 'crawl', atkCd: 2 });
      e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xe8d040).setScale(1.3).setAlpha(0.3).setDepth(4.8);
""")
rep("sniper: 0x60c0ff, rocketeer: 0xff8a20 }[kind]", "sniper: 0x60c0ff, rocketeer: 0xff8a20, sapper: 0x7dff4a }[kind]")
after("      if (kind === 'rocketeer') { e.gun = this.add.image(x, y, 'gun_rlaunch').setOrigin(2 / 26, 5.5 / 11).setDepth(6); e.fireCd = 1.5; }\n",
      "      if (kind === 'sapper') e.plantCd = rand(1, 2.5);\n")
rep("e.kind !== 'mender' && e.kind !== 'wasp' && this.time.now >= (e.dropUntil || 0));", "e.kind !== 'mender' && e.kind !== 'wasp' && e.kind !== 'jet' && this.time.now >= (e.dropUntil || 0));")
after("    P.add.overlap(this.player, this.gibs, this.onKickGib, null, this);\n",
"""    P.add.collider(this.mines, this.solids); P.add.collider(this.mines, this.oneways);
    P.add.collider(this.charges, this.solids); P.add.collider(this.charges, this.oneways);
    P.add.collider(this.haywires, this.solids);
    P.add.collider(this.canisters, this.solids); P.add.collider(this.canisters, this.oneways);
""")
rep("NINE,ZERO,MINUS,R,M,ENTER,ESC'", "NINE,ZERO,MINUS,PLUS,G,R,M,ENTER,ESC'")
rep("if (ptr.rightButtonDown()) this.kickQueued = true; });", "if (ptr.rightButtonDown()) this.kickQueued = true; if (ptr.middleButtonDown()) this.mineQueued = true; });")

# ---------------------------------------------------------------- update loop / player
rep("'ZERO', 'MINUS', 'R', 'M', 'ENTER', 'ESC']", "'ZERO', 'MINUS', 'PLUS', 'G', 'R', 'M', 'ENTER', 'ESC']")
after("      BUS.emit('wave', 1, WAVES.length);\n", "      BUS.emit('mines', TUNE.MINE.max);\n")
after("    this.updateProjectiles(dt);\n", "    this.updateStakes(dt); this.updateMines(dt); this.updateCharges(dt); this.updateHaywires(dt); this.updateCanisters(dt);\n")
after("    if (this.jd.MINUS) this.setWeapon(10);\n", "    if (this.jd.PLUS) this.setWeapon(11);\n")
after("    this.kickQueued = false;\n", "    if ((this.jd.G || this.mineQueued) && now >= this.mineReady) this.throwMine(now);\n    this.mineQueued = false;\n")
before("    } else if (W.id === 'mini') {",
"""    } else if (W.id === 'stake') {
      this.stats.shots++;
      this.spawnStake(ox, oy, a);
      this.recoil = 7; Sfx.stake();
      this.muzzle(mx, my, a, 1.1, 60); this.fxSmoke(mx, my, 5); this.fxSmoke(this.shoulder.x - ca * 6, this.shoulder.y + 3, 3, 0.6);
      this.shake(110, 0.006); this.addKick(-ca * 6, -sa * 6);
      pb.velocity.x -= ca * 90;
""")
after("      if (rh) { this.hitRagdoll(rh.rd, rh.x, rh.y, b.dmg, Math.cos(b.ang), Math.sin(b.ang), b.kind, rh.pi); b.disableBody(true, true); continue; }\n",
      "      if (this.propSweep(b.px, b.py, b.x, b.y, Math.cos(b.ang), Math.sin(b.ang))) { b.disableBody(true, true); continue; }   // lamps, gas, charges, mines\n")
after("      if (rh && !rhits.some(h => h.rd === rh.rd)) rhits.push(rh);\n", "      this.propHitAt(x, y, ca, sa);\n")
before("    for (const q of this.eprojList) {                                  // rockets and bombs go back where they came from",
"""    for (const c of this.chargeList) if (c.active && inBox(c.x, c.y, 6)) { c.body.velocity.x = f * 380; c.body.velocity.y = -230; c.kicked = true; hit = true; BUS.emit('callout', 'PUNTED'); }
    for (const k of this.canisterList) if (k.active && k.state === 'idle' && inBox(k.x, k.y, 6)) { this.igniteCanister(k, f > 0 ? -0.35 : Math.PI + 0.35); hit = true; }
""")
after("    this.blastTiles(x, y, R, W.tileDamage ?? W.maxDamage ?? 40);       // and the scenery\n",
"""    for (const m of this.mineList) if (m.active && !m.host && m.trig < 0 && Math.hypot(m.x - x, m.y - y) < R + 8) m.trig = 0.08 + Math.random() * 0.08;   // sympathetic detonations
    for (const c of this.chargeList) if (c.active && Math.hypot(c.x - x, c.y - y) < R + 6) c.fuse = Math.min(c.fuse, 0.1 + Math.random() * 0.08);
    for (const k of this.canisterList) if (k.active && k.state === 'idle' && Math.hypot(k.x - x, k.y - y) < R + 6) this.igniteCanister(k, Math.atan2(k.y - y, k.x - x) - 0.3);
    for (const L of this.lamps) if (!L.falling && !L.dead && Math.hypot(L.x - x, L.y - y) < R + 6) this.dropLamp(L);
""")

# ---------------------------------------------------------------- damage / ragdoll hooks
rep("saw: 60, flame: 4, kick: 0, parry: 120 }[src]", "saw: 60, flame: 4, kick: 0, parry: 120, stake: 240 }[src]")
rep("flame: 0.02, kick: 0, parry: 0.3 }[src]", "flame: 0.02, kick: 0, parry: 0.3, stake: 0.4 }[src]")
rep("    const hs = isHumanoid(e) && by < e.body.top + 5;", "    const hs = (isHumanoid(e) || e.kind === 'jet') && by < e.body.top + 5;")
rep("arc: 40, flame: 25, burn: 10 }[src] ?? 90)", "arc: 40, flame: 25, burn: 10, stake: 320 }[src] ?? 90)")
rep("    this.ragdolls.push(rd);\n", "    rd.from = e; this.lastRag = rd;\n    this.ragdolls.push(rd);\n")
rep("        for (const p of P) this.ragCollide(p);\n      }",
    "        for (const p of P) this.ragCollide(p);\n        if (rd.pin) { const q = P[rd.pin.pi]; q.x = rd.pin.x; q.y = rd.pin.y; }   // nailed to the wall\n      }")
rep("        if (p.wall && Math.abs(p.pvx) > 210) { wallHit = p; p.vx = -p.pvx * 0.2; }\n      }",
    "        if (p.wall && Math.abs(p.pvx) > 210) { wallHit = p; p.vx = -p.pvx * 0.2; }\n      }\n      if (rd.pin) { const q = P[rd.pin.pi]; q.vx = 0; q.vy = 0; }")
rep("    rd.hp -= dmg * (src === 'flame' ? 0.35 : 1);\n", "    rd.hp -= dmg * (src === 'flame' ? 0.35 : 1);\n    if (rd.pin && dmg >= 30 && src !== 'stake') rd.pin = null;                // big hits tear it off the wall\n")
after("    this.grid[ty][tx] = '.'; this.tileHp.delete(ty * MAP_W + tx);\n",
"""    for (const rd of this.ragdolls) if (rd.pin && rd.pin.tile[0] === tx && rd.pin.tile[1] === ty) { rd.pin = null; rd.asleep = false; }   // pinned bodies drop with the wall
    for (const d of this.stakeDecals) if (d.visible && d.tile && d.tile[0] === tx && d.tile[1] === ty) d.setVisible(false);
    const tnow = this.time.now; this.chaosT = this.chaosT.filter(t => tnow - t < 2500); this.chaosT.push(tnow);
    if (this.chaosT.length >= 10 && tnow > this.chaosCd) { this.chaosCd = tnow + 7000; BUS.emit('callout', 'CHAOS!'); this.addStyle(80); }
""")
after("    const rd = rag ? this.spawnRagdoll(e, dx, dy, src, !!(D.head && e.lastHs)) : null;\n",
      "    const hay = e.kind === 'jet' && src !== 'rocket' && src !== 'crush' && -e.hp <= 40 && this.spawnHaywire(e, dx);   // clean kill: the jetpack goes haywire\n")
rep("      } else if (!rag) this.spawnGib(D.head, cx, cy - 4,", "      } else if (!rag && !hay) this.spawnGib(D.head, cx, cy - 4,")
rep("    const n = rag ? 0 : randi(D.gibN[0], D.gibN[1])", "    const n = rag || hay ? 0 : randi(D.gibN[0], D.gibN[1])")
rep("    if (!rag) this.spawnLight(e.x, e.y, e.def.key + '_w',", "    if (!rag && !hay) this.spawnLight(e.x, e.y, e.def.key + '_w',")
after("    if (e.kind === 'tick' && src !== 'tickboom') this.time.delayedCall(70, () => this.explode(cx, cy, TUNE.TICK));   // dead ticks still go off (chains!)\n",
"""    if (e.kind === 'brood') this.time.delayedCall(60, () => this.broodBirth(cx, cy - 4, e.dir, TUNE.BROOD.burst, null));   // and out they all come
    if (e.kind === 'sapper' && Math.random() < 0.35) { this.plantCharge(cx, cy, 1.4); BUS.emit('callout', 'DROPPED A CHARGE'); }
""")
rep("e.kind === 'rocketeer' ? 'icon_rlaunch' : 'icon_rifle',", "e.kind === 'rocketeer' ? 'icon_rlaunch' : e.kind === 'jet' ? 'icon_smg' : 'icon_rifle',")
after("    if (this.combo >= 2) BUS.emit('combo', this.combo);\n",
"""    this.killTimes = this.killTimes.filter(t => now - t < 350); this.killTimes.push(now);   // kill-cam: 3+ kills in a blink
    if (this.killTimes.length >= 3 && now > this.killCamUntil) {
      this.killCamUntil = now + 2500; this.slowmoUntil = Math.max(this.slowmoUntil, now + 700);
      this.zoomPunch = Math.max(this.zoomPunch, 0.1); BUS.emit('flash', 0.3); Sfx.killcam();
      BUS.emit('callout', this.killTimes.length >= 5 ? 'MASSACRE!' : 'CARNAGE!');
    }
""")

# ---------------------------------------------------------------- AI dispatch
after("      else if (e.kind === 'rammer') this.updateRammer(e, dt, now, dx, dy, dist, alive);\n",
      "      else if (e.kind === 'jet') this.updateJet(e, dt, now, dx, dy, dist, alive);\n      else if (e.kind === 'brood') this.updateBrood(e, dt, now, dx, dy, dist, alive);\n")
rep("if (e.kind !== 'drone' && e.kind !== 'wasp') { e.ai = 'alert';", "if (e.kind !== 'drone' && e.kind !== 'wasp' && e.kind !== 'jet') { e.ai = 'alert';")
rep("      move = e.kind === 'rocketeer' ? this.thinkRocketeer(e, dt, now, c) :", "      move = e.kind === 'sapper' ? this.thinkSapper(e, dt, now, c) : e.kind === 'rocketeer' ? this.thinkRocketeer(e, dt, now, c) :")
rep("    else e.fr = e.ai === 'windup' ? 'crouch' : e.ai === 'lunge' ? 'lunge' : !onGround ? 'air' : moving ? 'run' + run : e.aggro ? 'crouch' : 'idle';",
    "    else e.fr = e.ai === 'windup' || e.ai === 'plant' ? 'crouch' : e.ai === 'lunge' ? 'lunge' : !onGround ? 'air' : moving ? 'run' + run : e.aggro && e.kind !== 'sapper' ? 'crouch' : 'idle';")
rep("sniper: 'engage', rocketeer: 'engage' }[e.kind];", "sniper: 'engage', rocketeer: 'engage', sapper: 'hunt' }[e.kind];")
rep("'bulwark', 'rammer', 'wasp'].includes(e.kind))", "'bulwark', 'rammer', 'wasp', 'jet', 'brood'].includes(e.kind))")

# ---------------------------------------------------------------- visuals
before("      if (e.kind === 'wasp') {\n        e.glow.setPosition(e.x + e.dir * 8",
"""      if (e.kind === 'jet') {
        const ca = Math.cos(e.aimA), sa = Math.sin(e.aimA);
        e.gun.setPosition(Math.round(e.x - ca * e.recoil), Math.round(e.y + 1 - sa * e.recoil)).setRotation(e.aimA); e.gun.scaleY = ca < 0 ? -1 : 1;
        e.glow.setPosition(e.x + e.dir * 4, e.y - 8).setScale(e.ai === 'tell' ? 0.8 + Math.sin(now / 30) * 0.2 : 0.3);
        e.thr.setPosition(e.x - e.dir * 4, e.y + 10).setScale(0.6 + Math.random() * 0.35);
        continue;
      }
      if (e.kind === 'sapper') { e.glow.setPosition(e.x + e.dir * 5, e.y - 7 + (e.fr === 'crouch' ? 3 : 0)).setScale(e.ai === 'plant' ? 0.6 : 0.3); continue; }
      if (e.kind === 'brood') { const sw = e.ai === 'birth'; e.glow.setPosition(e.x - e.dir * 2, e.y - 4).setScale(sw ? 1.8 + Math.sin(now / 40) * 0.2 : 1.3 + Math.sin(now / 300) * 0.1).setAlpha(sw ? 0.55 : 0.3); continue; }
""")
rep("""    for (const L of this.lamps) {
      L.t += dt;""", """    for (const L of this.lamps) {
      if (L.dead) continue;
      if (L.falling) { this.updateLamp(L, dt); continue; }
      L.t += dt;""")

# ---------------------------------------------------------------- HUD
rep("{ text: i < 9 ? String(i + 1) : i === 9 ? '0' : '-', align:", "{ text: i < 9 ? String(i + 1) : ['0', '-', '='][i - 9], align:")
m = re.search(r"    this\.lblWeapon = new PixelLabel\(this, 26, 142, 'hud_wname'[^\n]*\n", s)
assert m
s = s[:m.end()] + "    this.lblMines = new PixelLabel(this, 26, 162, 'hud_mines', { maxChars: 12, text: 'G MINES ' + TUNE.MINE.max, align: 'left', scale: 2, color: '#ff6a4a', shadow }).setDepth(3);\n" + s[m.end():]
rep("on('wave', this.onWave);", "on('wave', this.onWave); on('mines', this.onMines);")
rep("  onWave(n, total) { this.lblWave.setText('WAVE ' + n + '/' + total); }", "  onWave(n, total) { this.lblWave.setText('WAVE ' + n + '/' + total); }\n  onMines(n) { this.lblMines.setText('G MINES ' + n); }")

# ---------------------------------------------------------------- new methods
before("  // ------------------------------------------------------------------ waves ----\n", SCENE)

open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok', len(s))
