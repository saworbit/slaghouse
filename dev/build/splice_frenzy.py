import sys, re
SP, p = sys.argv[1], sys.argv[2]
s = open(p, encoding='utf-8').read()
ART = open(SP + 'frenzy_art.js', encoding='utf-8').read()
SCENE = open(SP + 'frenzy_scene.js', encoding='utf-8').read()
fails = []

def rep(a, b, cnt=1):
    global s
    n = s.count(a)
    if n != cnt:
        fails.append((n, a[:100])); return
    s = s.replace(a, b)
def after(a, add): rep(a, a + add)
def before(a, add): rep(a, add + a)

# ---------------------------------------------------------------- tuning / data
after("  CANISTER: { radius: 58, maxDamage: 70, minDamage: 20, selfDamage: 18, push: 420, maxRise: 560, tileDamage: 80 },\n",
"""  CRYO:    { cooldown: 60, range: 110, cone: 12, chill: 0.11, damage: 1.5, thaw: 3.2 },
  SENTRY:  { recharge: 12, life: 14, range: 250, rate: 0.11, damage: 6, hp: 60, turn: 7 },
  SCREAMER: { speed: 270, windMs: 500, turn: 3.2,
              boom: { radius: 42, maxDamage: 40, minDamage: 10, enemyDamage: 25, selfDamage: 20, push: 340, maxRise: 460, enemy: true, tileDamage: 60 } },
  WARDEN:  { range: 120, links: 2, soak: 0.25 },
  JUGG:    { speed: 34, spinMs: 650, fireT: 2.0, rate: 0.075, bulletSpeed: 380, damage: 4, turn: 1.6, cd: 2.2 },
  RAMPAGE: { time: 6000, fire: 0.6, damage: 1.25 },
""")
after("  Object.assign({ id: 'stake', name: 'STAKE DRIVER', gun: 'stake' }, TUNE.STAKE),\n",
      "  Object.assign({ id: 'cryo', name: 'CRYO CANNON', gun: 'cryo' }, TUNE.CRYO),\n")
before("  boss: { key: 'boss', fw: 48, fh: 44,",
"""  screamer: { key: 'screamer', fw: 14, fh: 12, bw: 10, bh: 9, hp: 18, sight: 300, touch: 0, kb: 1.4, gibs: ['g_skull', 'g_chunk', 'g_bone'], gibN: [4, 6] },
  warden: { key: 'warden', fw: 18, fh: 16, bw: 12, bh: 12, hp: 50, sight: 280, touch: 6, kb: 1.1, gibs: ['g_dish', 'g_plate', 'g_wire', 'g_plate', 'g_shard', 'g_shard2'], gibN: [8, 11] },
  jugg: { key: 'jugg', fw: 32, fh: 30, bw: 20, bh: 26, hp: 420, sight: 320, touch: 20, kb: 0.1, head: 'g_jughelm',
          gibs: ['g_jplate', 'g_jplate', 'g_jplate', 'g_plateL', 'g_plateL', 'g_flesh1', 'g_flesh2', 'g_flesh3', 'g_flesh1', 'g_bone', 'g_rib', 'g_chunk', 'g_chunk', 'g_core'], gibN: [24, 30] },
""")
after("const CANISTERS = [[12, 24], [50, 20], [66, 16], [83, 24]];        // gas canisters: shoot one and it rockets about",
      "\nconst FLIERS = new Set(['drone', 'mender', 'wasp', 'jet', 'screamer', 'warden']);\nconst WAVE_MODS = [null, null, 'slag', 'lowg', null];                // wave 3 rains slag, wave 4 is low gravity")
rep("   ['rocketeer', 'G'], ['wasp', 'A'], ['sapper', 'G']],", "   ['rocketeer', 'G'], ['wasp', 'A'], ['sapper', 'G'], ['screamer', 'A'], ['screamer', 'A']],")
rep("   ['tick', 'G'], ['tick', 'G'], ['jet', 'A'], ['brood', 'G']],", "   ['tick', 'G'], ['tick', 'G'], ['jet', 'A'], ['brood', 'G'], ['warden', 'A'], ['screamer', 'A']],")
rep("   ['enforcer', 'G'], ['heavy', 'G'], ['tick', 'G'], ['tick', 'G']],", "   ['enforcer', 'G'], ['jugg', 'G'], ['tick', 'G'], ['tick', 'G'], ['warden', 'A']],")
rep("  A: [[20, 10], [47, 11], [72, 8], [90, 6], [30, 6]],", "  A: [[20, 10], [47, 11], [72, 8], [90, 6], [30, 6], [56, 6], [10, 16], [82, 10]],")

# ---------------------------------------------------------------- audio
before("  flameSet(on) {",
"""  cryoSet(on) {                                                    // continuous freezing hiss while the cryo cannon runs
    if (!this.ctx) return;
    if (on && !this.cryoNode && !this.muted) {
      const c = this.ctx, g = c.createGain(); g.gain.value = 0.0001;
      const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
      const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2600; f.Q.value = 0.7;
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 3200; const og = c.createGain(); og.gain.value = 0.05;
      src.connect(f); f.connect(g); o.connect(og); og.connect(g); g.connect(this.out);
      src.start(); o.start(); g.gain.setTargetAtTime(0.13, c.currentTime, 0.03);
      this.cryoNode = { g, nodes: [src, o] };
    } else if (!on && this.cryoNode) {
      const a = this.cryoNode, t = this.ctx.currentTime; this.cryoNode = null;
      a.g.gain.setTargetAtTime(0.0001, t, 0.05); a.nodes.forEach(n => n.stop(t + 0.3));
    }
  },
  freeze() { if (!this.ok('freeze', 0.08)) return; [1800, 2400, 3200].forEach((f, i) => this.tone({ type: 'triangle', f0: f, f1: f * 1.2, dur: 0.18, vol: 0.05, delay: i * 0.03 })); this.noise({ filter: 'highpass', f0: 4000, dur: 0.2, vol: 0.12 }); },
  shatter() { if (!this.ok('shatter', 0.05)) return;
    this.noise({ filter: 'highpass', f0: 2500, dur: 0.35, vol: 0.45 }); this.tone({ type: 'sine', f0: 200, f1: 60, dur: 0.2, vol: 0.3 });
    for (let i = 0; i < 6; i++) this.tone({ type: 'triangle', f0: rand(2000, 4500), f1: rand(1200, 2000), dur: 0.08, vol: 0.05, delay: rand(0, 0.2) }); },
  crack() { if (!this.ok('crack', 0.1)) return; this.noise({ filter: 'bandpass', f0: 3000, q: 3, dur: 0.12, vol: 0.2 }); },
  scream() { if (!this.ok('scream', 0.15)) return;
    this.tone({ type: 'sawtooth', f0: 900, f1: 1800, dur: 0.45, vol: 0.07 }); this.tone({ type: 'square', f0: 1300, f1: 2400, dur: 0.4, vol: 0.04, detune: 30 });
    this.noise({ filter: 'bandpass', f0: 2500, q: 2, dur: 0.4, vol: 0.12 }); },
  shieldHit() { if (!this.ok('shld', 0.06)) return; this.tone({ type: 'sine', f0: 900, f1: 500, dur: 0.1, vol: 0.06 }); this.noise({ filter: 'bandpass', f0: 3500, q: 4, dur: 0.06, vol: 0.08 }); },
  rampage() { if (!this.ok('ramp', 1)) return;
    [220, 277, 330, 440].forEach((f, i) => this.tone({ type: 'sawtooth', f0: f, dur: 0.5, vol: 0.06, delay: i * 0.05 }));
    this.noise({ filter: 'lowpass', f0: 1200, f1: 200, dur: 0.6, vol: 0.4, dest: this.crunch }); },
""")
rep("const HINT2 = 'J FIRE (KEYS ONLY)   1-9 0 - =  Q/E  WHEEL SWITCH   R RESTART   M MUTE';",
    "const HINT2 = 'J FIRE (KEYS)  1-9 0 - = BKSP  Q/E WHEEL  T SENTRY  R RESTART  M MUTE';")
rep("'1-9 0 - =  Q/E  WHEEL    G / MIDDLE CLICK MINE    R RESTART'", "'1-9 0 - = BKSP  Q/E  WHEEL   G MINE   T SENTRY   R RESTART'")

# ---------------------------------------------------------------- art
before("  rocket: { w: 28, h: 13, py: 6, muzzle: 26, draw(ctx, arm) {",
"""  cryo: { w: 28, h: 12, py: 6, muzzle: 26, draw(ctx, arm) {
    if (arm) drawArm(ctx, 6);
    R(ctx, '#3a414b', 5, 3, 10, 6); R(ctx, '#6a7380', 5, 3, 10, 1); R(ctx, '#2a2e35', 6, 9, 2, 3);
    R(ctx, '#2a6a9a', 7, 8, 6, 4); R(ctx, '#5ab0e0', 7, 8, 6, 1); R(ctx, '#c8f0ff', 8, 9, 2, 1);                 // coolant tank
    R(ctx, '#4b535e', 15, 4, 7, 4); R(ctx, '#8a94a0', 15, 4, 7, 1);
    for (let i = 0; i < 3; i++) R(ctx, '#9adcff', 16 + i * 2, 5, 1, 2);                                          // frost coils
    R(ctx, '#2a2e35', 22, 3, 3, 6); R(ctx, '#c8f0ff', 25, 5, 1, 2); R(ctx, '#ffffff', 25, 5, 1, 1);
  } },
""")
before("// ---- ragdoll parts: cut from each walker's own drawing", ART)
before("  g_barrel: [7, 5,",
"""  g_ice1: [6, 5, c => { R(c, '#a8e0f8', 1, 1, 4, 3); R(c, '#ffffff', 1, 1, 2, 1); R(c, '#6ab0d8', 3, 3, 2, 1); }],
  g_ice2: [5, 6, c => { R(c, '#a8e0f8', 1, 1, 3, 4); R(c, '#e8fbff', 1, 1, 1, 2); }],
  g_ice3: [8, 4, c => { R(c, '#c8f0ff', 1, 1, 6, 2); R(c, '#ffffff', 2, 1, 2, 1); R(c, '#7ac0e0', 5, 2, 2, 1); }],
  g_skull: [7, 6, c => { R(c, '#d8d0b8', 1, 1, 5, 3); R(c, '#1a0a08', 2, 2, 1, 1); R(c, '#1a0a08', 4, 2, 1, 1); R(c, '#c8bea0', 2, 4, 3, 1); }],
  g_dish: [8, 4, c => { R(c, '#8a94a6', 1, 1, 6, 2); R(c, '#c0c8d4', 2, 1, 4, 1); R(c, '#40d0ff', 3, 2, 2, 1); }],
  g_jplate: [11, 7, c => { R(c, '#3a414b', 1, 1, 9, 5); R(c, '#5a636e', 1, 1, 9, 1); for (let i = 0; i < 3; i++) R(c, i % 2 ? '#15161a' : '#e8b422', 2 + i * 3, 3, 3, 2); }],
  g_jughelm: [10, 9, c => { R(c, '#3a414b', 1, 1, 8, 6); R(c, '#5a636e', 2, 1, 6, 1); R(c, '#15171a', 3, 3, 6, 2); R(c, '#ff3020', 4, 3, 4, 1); R(c, '#7a0c0c', 1, 7, 4, 1); }],
""")
after("  addSheet(scene, 'jet', [{ name: 'j0', c: makeSprite(20, 24, x => drawJet(x, 0)) }, { name: 'j1', c: makeSprite(20, 24, x => drawJet(x, 1)) }], 20, 24, true);\n",
"""  addSheet(scene, 'screamer', [{ name: 's0', c: makeSprite(14, 12, x => drawScreamer(x, 0, false)) }, { name: 's1', c: makeSprite(14, 12, x => drawScreamer(x, 1, false)) },
                               { name: 'sw', c: makeSprite(14, 12, x => drawScreamer(x, 0, true)) }], 14, 12, true);
  addSheet(scene, 'warden', [{ name: 'v0', c: makeSprite(18, 16, x => drawWarden(x, 0)) }, { name: 'v1', c: makeSprite(18, 16, x => drawWarden(x, 1)) }], 18, 16, true);
  const jgf = [];
  for (let st = 0; st < 3; st++) for (let i = 0; i < 4; i++) jgf.push({ name: 's' + st + 'w' + i, c: makeSprite(32, 30, x => drawJugg(x, i, st)) });
  addSheet(scene, 'jugg', jgf, 32, 30, true);
  addTex(scene, 'gun_jugg', makeSprite(30, 12, x => drawJuggGun(x, false)));
  addTex(scene, 'gun_jugg2', makeSprite(30, 12, x => drawJuggGun(x, true)));
  addTex(scene, 'sentry_base', makeSprite(14, 10, drawSentryBase));
  addTex(scene, 'sentry_head', makeSprite(16, 8, drawSentryHead));
""")

# ---------------------------------------------------------------- scene setup
rep("Sfx.arcSet(false); Sfx.flameSet(false); Sfx.miniSet(0); this.spin = 0; this.heat = 0;\n",
    "Sfx.arcSet(false); Sfx.flameSet(false); Sfx.miniSet(0); Sfx.cryoSet(false); this.spin = 0; this.heat = 0;\n"
    "    this.cryoActiveUntil = 0; this.sentry = null; this.sentryReadyAt = 0; this.rampageUntil = 0; this.rampageArmed = true; this.ghostT = 0; this.mod = null; this.rainT = 0;\n"
    "    this.physics.world.gravity.y = TUNE.GRAVITY;\n")
rep("flier = kind === 'drone' || kind === 'mender' || kind === 'wasp' || kind === 'jet';", "flier = FLIERS.has(kind);")
rep("jet: 'j0', sapper: 'idle', brood: 'w0' }[kind] || 'w0';", "jet: 'j0', sapper: 'idle', brood: 'w0', screamer: 's0', warden: 'v0', jugg: 's0w0' }[kind] || 'w0';")
before("    } else if (kind === 'jet') {",
"""    } else if (kind === 'screamer') {
      e.body.setAllowGravity(false);
      Object.assign(e, { ai: 'hover', head: 0, spd: 0, atkT: rand(0.6, 1.8) });
      e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xff5020).setScale(0.5).setAlpha(0.8).setDepth(18);
    } else if (kind === 'warden') {
      e.body.setAllowGravity(false);
      Object.assign(e, { links: [], linkT: 0 });
      e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0x60e0ff).setScale(0.5).setAlpha(0.8).setDepth(18);
    } else if (kind === 'jugg') {
      Object.assign(e, { ai: 'walk', stage: 0, aimA: 0, spin: 0, atkCd: 2, shotT: 0, recoil: 0, stepK: 0 });
      e.gun = this.add.image(x, y, 'gun_jugg').setOrigin(4 / 30, 6.5 / 12).setDepth(6);
      e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xff3020).setScale(0.4).setAlpha(0.85).setDepth(18);
""")
rep("e.kind !== 'mender' && e.kind !== 'wasp' && e.kind !== 'jet' && this.time.now >= (e.dropUntil || 0));", "!FLIERS.has(e.kind) && this.time.now >= (e.dropUntil || 0));")
rep("NINE,ZERO,MINUS,PLUS,G,R,M,ENTER,ESC'", "NINE,ZERO,MINUS,PLUS,BACKSPACE,G,T,R,M,ENTER,ESC'")

# ---------------------------------------------------------------- update loop / player
rep("'PLUS', 'G', 'R', 'M', 'ENTER', 'ESC']", "'PLUS', 'BACKSPACE', 'G', 'T', 'R', 'M', 'ENTER', 'ESC']")
rep("{ Sfx.arcSet(false); Sfx.flameSet(false); Sfx.miniSet(0); this.scene.restart(); return; }", "{ Sfx.arcSet(false); Sfx.flameSet(false); Sfx.miniSet(0); Sfx.cryoSet(false); this.scene.restart(); return; }")
rep("if (this.jd.ESC) { Sfx.arcSet(false); Sfx.flameSet(false); Sfx.miniSet(0);", "if (this.jd.ESC) { Sfx.arcSet(false); Sfx.flameSet(false); Sfx.miniSet(0); Sfx.cryoSet(false);")
rep("this.updateStakes(dt); this.updateMines(dt); this.updateCharges(dt); this.updateHaywires(dt); this.updateCanisters(dt);\n",
    "this.updateStakes(dt); this.updateMines(dt); this.updateCharges(dt); this.updateHaywires(dt); this.updateCanisters(dt);\n"
    "    this.updateSentry(dt, now); if (this.mod === 'slag' && this.state === 'play') this.updateSlagRain(dt);\n")
after("    Sfx.flameSet(now < this.flameActiveUntil && this.state !== 'dead');\n", "    Sfx.cryoSet(now < this.cryoActiveUntil && this.state !== 'dead');\n")
rep("      if ((this.boss && this.boss.alive) || this.style.rank >= 4) I = 3;", "      if ((this.boss && this.boss.alive) || this.style.rank >= 4 || now < this.rampageUntil) I = 3;")
after("    if (this.jd.PLUS) this.setWeapon(11);\n", "    if (this.jd.BACKSPACE) this.setWeapon(12);\n")
after("    this.mineQueued = false;\n", "    if (this.jd.T) this.deploySentry(now);\n")
rep("    const sk = Math.min(1, dt * 12);\n    this.sqx += (1 - this.sqx) * sk; this.sqy += (1 - this.sqy) * sk;\n  }",
    "    const sk = Math.min(1, dt * 12);\n    this.sqx += (1 - this.sqx) * sk; this.sqy += (1 - this.sqy) * sk;\n"
    "    if (now < this.rampageUntil && (this.ghostT -= dt) <= 0) { this.ghostT = 0.05; this.spawnLight(this.pv.x, this.pv.y - 12, 'player', 0xff5020, 1, 1, 0.55, 0.22, this.pFrame, this.facing < 0); }   // rampage afterimages\n  }")
rep("this.arcActiveUntil = 0; this.flameActiveUntil = 0;", "this.arcActiveUntil = 0; this.flameActiveUntil = 0; this.cryoActiveUntil = 0;")
rep("    this.nextFire = now + W.cooldown;\n", "    this.nextFire = now + W.cooldown * (now < this.rampageUntil ? TUNE.RAMPAGE.fire : 1);   // rampage: faster everything\n")
rep("this.nextFire = now + 150 - (150 - W.cooldown) * this.spin;", "this.nextFire = now + (150 - (150 - W.cooldown) * this.spin) * (now < this.rampageUntil ? TUNE.RAMPAGE.fire : 1);")
before("    } else if (W.id === 'stake') {", "    } else if (W.id === 'cryo') {\n      this.fireCryo(now, ox, oy, a);\n")
rep("    if (r > s.rank) { Sfx.rankUp(); BUS.emit('rankup', r); }\n",
    "    if (r > s.rank) { Sfx.rankUp(); BUS.emit('rankup', r); }\n"
    "    if (r >= 4 && this.rampageArmed && this.state === 'play') { this.rampageArmed = false; this.startRampage(); }   // S rank: RAMPAGE\n"
    "    if (r < 3) this.rampageArmed = true;\n")
rep("    this.spawnBarrels(true); this.spawnCanisters(true);\n", "    this.spawnBarrels(true); this.spawnCanisters(true); this.applyMod(WAVE_MODS[i]);\n")
rep("      const pts = WAVE_POINTS[type].filter(p => !used.has(p))", "      const pts = (WAVE_POINTS[type].some(p => !used.has(p)) ? WAVE_POINTS[type].filter(p => !used.has(p)) : WAVE_POINTS[type])")
after("      if (big) { this.boss = e; BUS.emit('boss', 'THE SMELTER', 'FOUNDRY WARDEN'); BUS.emit('flash', 0.35); this.shake(500, 0.012); }\n",
      "      if (kind === 'jugg') { this.boss = e; BUS.emit('minibar', 'JUGGERNAUT'); BUS.emit('callout', 'JUGGERNAUT'); this.shake(400, 0.01); Sfx.roar(); }\n")
rep("    const n = phase === 3 ? 5 : 3, pb = this.player.body, G = TUNE.GRAVITY, T = 0.95;", "    const n = phase === 3 ? 5 : 3, pb = this.player.body, G = this.physics.world.gravity.y, T = 0.95;")
rep("    const G = TUNE.GRAVITY * 1.15, P = rd.pts,", "    const G = this.physics.world.gravity.y * 1.15, P = rd.pts,")
rep("    const b = e.body, G = TUNE.GRAVITY;\n", "    const b = e.body, G = this.physics.world.gravity.y;\n")
after("    for (const L of this.lamps) if (!L.falling && !L.dead && Math.hypot(L.x - x, L.y - y) < R + 6) this.dropLamp(L);\n",
      "    if (W.enemy && this.sentry && Math.hypot(this.sentry.x - x, this.sentry.y - 10 - y) < R + 6) this.sentry.hp -= (W.selfDamage || 20) * 1.5;   // they can wreck your turret\n")

# ---------------------------------------------------------------- damage / kill hooks
before("    e.hp -= dmg; e.flashT = 0.08;",
"""    if (e.frozen > 0) {                                                 // ice statue: real hits shatter it, chip damage bites harder
      if (dmg >= 10 || ['kick', 'crush', 'rocket', 'stake', 'parry', 'rail', 'saw'].includes(src)) { BUS.emit('hitmark', true, false); Sfx.confirm(true); e.hp = 0; this.killEnemy(e, dx, dy, 'shatter'); return; }
      dmg *= 1.5;
    }
    if (e.shieldBy && e.shieldBy.alive && this.time.now < e.shieldT && src !== 'burn') { dmg *= TUNE.WARDEN.soak; e.shieldHit = this.time.now; Sfx.shieldHit(); }   // warden bubble
    if (this.time.now < this.rampageUntil && src !== 'burn') dmg *= TUNE.RAMPAGE.damage;
""")
rep("const rag = !!RAG[e.kind] && src !== 'rocket' && src !== 'tickboom' && src !== 'crush'", "const rag = !!RAG[e.kind] && src !== 'rocket' && src !== 'tickboom' && src !== 'crush' && src !== 'shatter'")
rep("const hay = e.kind === 'jet' && src !== 'rocket' && src !== 'crush'", "const hay = e.kind === 'jet' && src !== 'rocket' && src !== 'crush' && src !== 'shatter'")
rep("if (e.kind === 'tick' && src !== 'tickboom') this.time.delayedCall", "if (e.kind === 'tick' && src !== 'tickboom' && src !== 'shatter') this.time.delayedCall")
rep("      const tex = i < D.gibs.length ? D.gibs[i] : pick(D.gibs);", "      const tex = shat && i % 2 === 0 ? pick(['g_ice1', 'g_ice2', 'g_ice3']) : i < D.gibs.length ? D.gibs[i] : pick(D.gibs);")
rep("      if (charred) g.setTint(0x7a5a48);", "      if (shat) g.setTint(0xc8f0ff); else if (charred) g.setTint(0x7a5a48);")
rep("    const power = src === 'rocket' || e.kind === 'boss' ? 1.7 : src === 'pellet' ? 1.25 : 1, charred = e.burnT > 0;",
    "    const power = src === 'rocket' || e.kind === 'boss' ? 1.7 : src === 'pellet' ? 1.25 : 1, charred = e.burnT > 0, shat = src === 'shatter';\n"
    "    if (shat) {                                                       // frozen solid: it goes like glass\n"
    "      this.fx.emit(cx, cy, { n: 30, speed: [60, 260], life: [0.4, 0.9], size: [2, 1], cols: [0xffffff, 0xe0f8ff, 0x9adcff, 0x5aa8e0], g: 500, mode: 1, drag: 0.6 });\n"
    "      this.spawnLight(cx, cy, 'glow', 0xa0e0ff, 1.5, 3, 0.9, 0.25); Sfx.shatter(); BUS.emit('callout', 'SHATTERED!'); this.addStyle(60);\n"
    "    }")
after("    if (e.kind === 'brood') this.time.delayedCall(60, () => this.broodBirth(cx, cy - 4, e.dir, TUNE.BROOD.burst, null));   // and out they all come\n",
"""    if (e.kind === 'screamer' && src !== 'tickboom' && src !== 'shatter') this.time.delayedCall(40, () => this.explode(cx, cy, TUNE.SCREAMER.boom));   // shot down mid-air: still goes off
    if (e.kind === 'warden' && (e.links || []).some(o => o.alive)) { BUS.emit('callout', 'SHIELDS DOWN'); for (const o of e.links) if (o.alive) this.spawnLight(o.body.center.x, o.body.center.y, 'ring', 0x60e0ff, 0.4, 1.6, 0.9, 0.25); }
    if (e.kind === 'jugg') {
      if (this.boss === e) this.boss = null;
      this.slowmoUntil = this.time.now + 900; this.zoomPunch = 0.12; BUS.emit('flash', 0.4); BUS.emit('callout', 'JUGGERNAUT DOWN');
      for (let i = 0; i < 5; i++) this.time.delayedCall(i * 110, () => this.boomFx(cx + rand(-14, 14), cy + rand(-14, 10), rand(0.5, 0.9)));
    }
""")
before("    if (e.kind === 'tick') { if (e.armT <= 0 && e.kickedT <= 0) { e.armT = TUNE.TICK.fuse / 1000; Sfx.chirp(); } return; }   // ticks don't bite, they blow\n",
"""    if (e.frozen > 0) return;                                          // statues don't bite
    if (e.kind === 'screamer') { if (e.ai === 'dive') this.screamerBoom(e); return; }
""")

# ---------------------------------------------------------------- AI dispatch / visuals
rep("      if (e.kind === 'drone') this.updateDrone(e, dt, now, dx, dy, dist, alive);",
    "      if (e.frozen > 0) this.updateFrozen(e, dt);\n      else if (e.kind === 'drone') this.updateDrone(e, dt, now, dx, dy, dist, alive);")
after("      else if (e.kind === 'brood') this.updateBrood(e, dt, now, dx, dy, dist, alive);\n",
      "      else if (e.kind === 'screamer') this.updateScreamer(e, dt, now, dx, dy, dist, alive);\n"
      "      else if (e.kind === 'warden') this.updateWarden(e, dt, now, dx, dy, dist, alive);\n"
      "      else if (e.kind === 'jugg') this.updateJugg(e, dt, now, dx, dy, dist, alive);\n")
rep("      if (e.rotation) e.rotation = Math.abs(e.rotation) < 0.01 ? 0 : e.rotation * Math.exp(-dt * 12);\n",
    "      if (e.rotation) e.rotation = Math.abs(e.rotation) < 0.01 ? 0 : e.rotation * Math.exp(-dt * 12);\n"
    "      if (e.chill > 0 && !(e.frozen > 0)) {                            // chilled: sluggish, thaws out over time\n"
    "        b.velocity.x *= 1 - 0.5 * e.chill; if (FLIERS.has(e.kind)) b.velocity.y *= 1 - 0.4 * e.chill;\n"
    "        e.chill = Math.max(0, e.chill - dt * 0.35);\n"
    "      }\n"
    "      const tint = e.frozen > 0 ? 0xb8ecff : e.chill > 0.05 ? ((Math.round(255 - 90 * e.chill) << 16) | (Math.round(255 - 30 * e.chill) << 8) | 255) : 0xffffff;\n"
    "      if (e.tintKey !== tint) { e.tintKey = tint; if (tint === 0xffffff) e.clearTint(); else e.setTint(tint); }\n")
rep("if (e.kind !== 'drone' && e.kind !== 'wasp' && e.kind !== 'jet') { e.ai = 'alert';", "if (!FLIERS.has(e.kind)) { e.ai = 'alert';")
rep("'bulwark', 'rammer', 'wasp', 'jet', 'brood'].includes(e.kind))", "'bulwark', 'rammer', 'wasp', 'jet', 'brood', 'screamer', 'warden', 'jugg'].includes(e.kind))")
before("      if (e.kind === 'jet') {\n        const ca = Math.cos(e.aimA)",
"""      if (e.kind === 'screamer') { e.glow.setPosition(e.x + e.dir * 3, e.y - 2).setScale(e.ai === 'wind' ? 0.9 + Math.random() * 0.3 : e.ai === 'dive' ? 0.8 : 0.5); continue; }
      if (e.kind === 'warden') {
        e.glow.setPosition(e.x, e.y + 1).setScale(0.5 + Math.sin(now / 90) * 0.06);
        for (const o of e.links) {                                       // tethers + bubbles on its wards
          if (!o.alive || o.shieldBy !== e || now > o.shieldT) continue;
          const hit = now - (o.shieldHit || -1e9) < 120, r = Math.max(o.body.halfWidth, o.body.halfHeight) + 6, ox = o.body.center.x, oy = o.body.center.y;
          g.lineStyle(1, 0x60e0ff, 0.55).lineBetween(e.x, e.y + 2, ox, oy);
          g.lineStyle(hit ? 2 : 1, hit ? 0xffffff : 0x60e0ff, hit ? 0.9 : 0.35 + Math.sin(now / 120) * 0.1).strokeCircle(ox, oy, r);
          if (hit) g.fillStyle(0x60e0ff, 0.15).fillCircle(ox, oy, r);
        }
        continue;
      }
      if (e.kind === 'jugg') {
        const ca = Math.cos(e.aimA), sa = Math.sin(e.aimA), sx = e.x + e.dir * 2, sy = e.y - 1;
        const key = e.spin > 0.05 && Math.floor(now / (70 - 45 * e.spin)) % 2 ? 'gun_jugg2' : 'gun_jugg';
        if (e.gun.texture.key !== key) e.gun.setTexture(key);
        e.gun.setPosition(Math.round(sx - ca * e.recoil), Math.round(sy - sa * e.recoil)).setRotation(e.aimA); e.gun.scaleY = ca < 0 ? -1 : 1;
        e.glow.setPosition(e.x + e.dir * 3, e.body.top + 4).setScale(e.ai === 'spin' ? 0.8 : 0.4);
        if (e.ai === 'spin') {                                           // laser tell while the barrels wind up
          let ex = sx + ca * 28, ey = sy + sa * 28;
          for (let i = 0; i < 80 && !this.solidAt(ex + ca * 4, ey + sa * 4); i++) { ex += ca * 4; ey += sa * 4; }
          this.laserG.lineStyle(1, 0xff3020, 0.25 + 0.5 * e.spin).lineBetween(sx + ca * 28, sy + sa * 28, ex, ey);
        }
        continue;
      }
""")

# ---------------------------------------------------------------- HUD
rep("['0', '-', '='][i - 9]", "['0', '-', '=', '<'][i - 9]")
m = re.search(r"    this\.lblMines = new PixelLabel\([^\n]*\n", s)
if not m: fails.append((0, 'lblMines line'))
else:
    s = s[:m.end()] + ("    this.lblSentry = new PixelLabel(this, 26, 182, 'hud_sentry', { maxChars: 16, text: 'T SENTRY READY', align: 'left', scale: 2, color: '#5cff7a', shadow }).setDepth(3); this.sentTxt = '';\n"
                       "    this.lblRamp = new PixelLabel(this, 944, 214, 'hud_ramp', { maxChars: 8, text: 'RAMPAGE', align: 'right', scale: 2, color: '#ff7a2a', shadow }).setDepth(3).setVisible(false); this.rampA = 0;\n") + s[m.end():]
rep("on('wave', this.onWave); on('mines', this.onMines);", "on('wave', this.onWave); on('mines', this.onMines); on('minibar', this.onMinibar);")
rep("  onMines(n) { this.lblMines.setText('G MINES ' + n); }", "  onMines(n) { this.lblMines.setText('G MINES ' + n); }\n  onMinibar(name) { this.bossName.setText(name); this.bossDisp = 1; }")
rep("    const dt = Math.min(delta, 50) / 1000;\n    this.dispHp",
"""    const dt = Math.min(delta, 50) / 1000;
    const gsr = this.scene.get('Game');
    if (gsr && gsr.sys.isActive()) {                                     // sentry status + rampage timer, read from the game
      const st = gsr.sentry ? 'T SENTRY ' + Math.ceil(gsr.sentry.t) + 'S' : gsr.time.now >= gsr.sentryReadyAt ? 'T SENTRY READY' : 'T SENTRY ' + Math.ceil((gsr.sentryReadyAt - gsr.time.now) / 1000);
      if (st !== this.sentTxt) { this.sentTxt = st; this.lblSentry.setStyle({ color: gsr.sentry ? '#46e6ff' : st.endsWith('READY') ? '#5cff7a' : '#7d8896' }).setText(st); }
      this.rampA = Math.max(0, (gsr.rampageUntil || 0) - gsr.time.now);
    } else this.rampA = 0;
    this.lblRamp.setVisible(this.rampA > 0).setAlpha(Math.floor(time / 150) % 2 ? 1 : 0.55);
    this.dispHp""")
after("    if (this.healA > 0.01) edge(0x30ff60, this.healA * 0.5);\n", "    if (this.rampA > 0) edge(0xff6a10, 0.22 + 0.1 * Math.sin(time / 90));\n")
before("    g.fillStyle(0x000000, 0.55 * this.hint1.alpha);",
       "    if (this.rampA > 0) { g.fillStyle(0x06070a, 0.7); g.fillRect(850, 226, 94, 6); g.fillStyle(0xff7a2a, 1); g.fillRect(851, 227, Math.round(92 * this.rampA / TUNE.RAMPAGE.time), 4); }\n")

# ---------------------------------------------------------------- new methods
before("  // ------------------------------------------------------------------ waves ----\n", SCENE)

if fails:
    for f in fails: print('FAIL', f)
    sys.exit(1)
open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok', len(s))
