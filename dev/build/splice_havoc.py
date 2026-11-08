import sys
SP, p = sys.argv[1], sys.argv[2]
s = open(p, encoding='utf-8').read()
ART = open(SP + 'havoc_art.js', encoding='utf-8').read()
SCENE = open(SP + 'havoc_scene.js', encoding='utf-8').read()
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
after("  RAMPAGE: { time: 6000, fire: 0.6, damage: 1.25 },\n",
"""  PRISM:   { cooldown: 420, damage: 30, bounces: 4, range: 900 },
  HOOK:    { cooldown: 650, speed: 720, range: 270, pull: 480, yank: 430, zipT: 0.9 },
  CLOAKER: { strikeDmg: 20, revealMs: 350, dash: 320 },
  PYRO:    { windMs: 500, fireCd: 2.6,
             burst: { radius: 26, maxDamage: 12, minDamage: 4, enemyDamage: 10, selfDamage: 8, push: 120, maxRise: 200, enemy: true, burn: 2, tileDamage: 12 },
             tank: { radius: 48, maxDamage: 60, minDamage: 15, selfDamage: 18, push: 360, maxRise: 460, burn: 3, tileDamage: 70 } },
  GUNSHIP: { speed: 75, alt: 124, volleyCd: 4, dropCd: 9, strafeCd: 6.5,
             crash: { radius: 90, maxDamage: 120, minDamage: 30, selfDamage: 30, push: 520, maxRise: 640, tileDamage: 140 } },
""")
after("  Object.assign({ id: 'cryo', name: 'CRYO CANNON', gun: 'cryo' }, TUNE.CRYO),\n",
      "  Object.assign({ id: 'prism', name: 'PRISM LASER', gun: 'prism' }, TUNE.PRISM),\n")
before("  screamer: { key: 'screamer', fw: 14,",
"""  cloaker: { key: 'cloaker', fw: 18, fh: 24, bw: 10, bh: 20, hp: 45, speed: 190, sight: 300, touch: 0, kb: 1, dodge: 0.5, dodgeCd: 1.4, head: 'g_chood',
             gibs: ['g_blade', 'g_flesh1', 'g_flesh2', 'g_flesh3', 'g_chunk', 'g_bone', 'g_rib', 'g_chunk'], gibN: [11, 14] },
  pyro: { key: 'pyro', fw: 18, fh: 24, bw: 11, bh: 20, hp: 60, speed: 100, sight: 300, touch: 8, kb: 0.8, dodge: 0.3, dodgeCd: 2, head: 'g_pmask',
          gibs: ['g_tank', 'g_flesh1', 'g_flesh2', 'g_flesh3', 'g_chunk', 'g_bone', 'g_rib', 'g_chunk'], gibN: [12, 15] },
  gunship: { key: 'gunship', fw: 56, fh: 24, bw: 48, bh: 18, hp: 500, sight: 700, touch: 15, kb: 0.02,
             gibs: ['g_plateL', 'g_plateL', 'g_plateL', 'g_jplate', 'g_jplate', 'g_wire', 'g_wire', 'g_shard', 'g_shard2', 'g_plate', 'g_core'], gibN: [20, 26] },
""")
rep("e.kind === 'sniper' || e.kind === 'rocketeer' || e.kind === 'sapper';\nconst isRifleman", "e.kind === 'sniper' || e.kind === 'rocketeer' || e.kind === 'sapper' || e.kind === 'cloaker' || e.kind === 'pyro';\nconst isRifleman")
rep("const FLIERS = new Set(['drone', 'mender', 'wasp', 'jet', 'screamer', 'warden']);", "const FLIERS = new Set(['drone', 'mender', 'wasp', 'jet', 'screamer', 'warden', 'gunship']);")
rep("const WAVE_MODS = [null, null, 'slag', 'lowg', null];                // wave 3 rains slag, wave 4 is low gravity",
    "const WAVE_MODS = [null, 'dark', 'slag', 'lowg', null];              // wave 2 blacks out, 3 rains slag, 4 is low gravity")
rep("   ['rocketeer', 'G'], ['wasp', 'A'], ['sapper', 'G'], ['screamer', 'A'], ['screamer', 'A']],",
    "   ['rocketeer', 'G'], ['wasp', 'A'], ['sapper', 'G'], ['screamer', 'A'], ['screamer', 'A'], ['cloaker', 'G'], ['cloaker', 'G']],")
rep("   ['tick', 'G'], ['tick', 'G'], ['jet', 'A'], ['brood', 'G'], ['warden', 'A'], ['screamer', 'A']],",
    "   ['tick', 'G'], ['tick', 'G'], ['jet', 'A'], ['brood', 'G'], ['warden', 'A'], ['screamer', 'A'], ['pyro', 'G'], ['gunship', 'A']],")
rep("   ['enforcer', 'G'], ['jugg', 'G'], ['tick', 'G'], ['tick', 'G'], ['warden', 'A']],",
    "   ['enforcer', 'G'], ['jugg', 'G'], ['tick', 'G'], ['tick', 'G'], ['warden', 'A'], ['pyro', 'G']],")

# ---------------------------------------------------------------- audio / hints
before("  heart() { if (!this.ok('heart', 0.4)) return;",
"""  prism() { if (!this.ok('prism', 0.05)) return;
    this.tone({ type: 'sawtooth', f0: 1800, f1: 400, dur: 0.25, vol: 0.08 }); this.tone({ type: 'sine', f0: 600, f1: 2400, dur: 0.18, vol: 0.08 }); this.noise({ filter: 'bandpass', f0: 4000, q: 2, dur: 0.12, vol: 0.15 }); },
  prismBounce() { if (!this.ok('pbnc', 0.02)) return; this.tone({ type: 'triangle', f0: rand(2400, 3600), f1: 1600, dur: 0.1, vol: 0.05 }); },
  hookFire() { if (!this.ok('hookf', 0.05)) return; this.noise({ filter: 'bandpass', f0: 1200, f1: 3000, q: 1.5, dur: 0.15, vol: 0.2 }); this.tone({ type: 'square', f0: 300, f1: 900, dur: 0.1, vol: 0.04 }); },
  hookHit() { if (!this.ok('hookh', 0.05)) return; this.tone({ type: 'square', f0: 700, f1: 200, dur: 0.08, vol: 0.1 }); this.noise({ filter: 'lowpass', f0: 1500, dur: 0.08, vol: 0.25 }); },
  decloak() { if (!this.ok('dcl', 0.2)) return; this.noise({ filter: 'bandpass', f0: 5000, f1: 800, q: 3, dur: 0.3, vol: 0.18 }); this.tone({ type: 'sine', f0: 2000, f1: 300, dur: 0.3, vol: 0.05 }); },
""")
rep("const HINT1 = 'A/D MOVE  SPACE JUMP  S+SPACE DROP  CLICK FIRE  F/RMB KICK  G/MMB MINE';",
    "const HINT1 = 'A/D MOVE  SPACE JUMP  S+SPACE DROP  CLICK FIRE  F KICK  G MINE  C HOOK';")
rep("const HINT2 = 'J FIRE (KEYS)  1-9 0 - = BKSP  Q/E WHEEL  T SENTRY  R RESTART  M MUTE';",
    "const HINT2 = 'J FIRE (KEYS)  1-9 0 - = BKSP [  Q/E WHEEL  T SENTRY  R RESTART  M MUTE';")
rep("'1-9 0 - = BKSP  Q/E  WHEEL   G MINE   T SENTRY   R RESTART'", "'1-9 0 - = BKSP [   G MINE   T SENTRY   C HOOK   R RESTART'")

# ---------------------------------------------------------------- art
before("  cryo: { w: 28, h: 12, py: 6, muzzle: 26, draw(ctx, arm) {",
"""  prism: { w: 28, h: 11, py: 5, muzzle: 27, draw(ctx, arm) {
    if (arm) drawArm(ctx, 5);
    R(ctx, '#2e333b', 5, 3, 10, 5); R(ctx, '#5a636e', 5, 3, 10, 1); R(ctx, '#2a2e35', 7, 8, 2, 3);
    R(ctx, '#3a414b', 15, 2, 6, 7); R(ctx, '#ff4adc', 16, 4, 4, 3); R(ctx, '#ffd0f4', 17, 5, 2, 1);          // prism crystal
    R(ctx, '#4b535e', 21, 4, 5, 3); R(ctx, '#8a94a0', 21, 4, 5, 1); R(ctx, '#ff4adc', 26, 5, 1, 1);
  } },
""")
before("// ---- ragdoll parts: cut from each walker's own drawing", ART)
after("  sapper:   { up: true, hp: 40, fw: 18, fh: 24, body: x => drawSapper(x, 0, [0, 0], [0, 0], 'idle'), head: [4, 0, 11, 8], torso: [1, 8, 13, 7], P: SPLEG, legW: 3 },\n",
      "  cloaker:  { up: true, hp: 35, fw: 18, fh: 24, body: x => drawCloaker(x, 0, [0, 0], [0, 0], 'idle'), head: [4, 0, 10, 8], torso: [2, 8, 12, 7], P: CKLEG, legW: 2 },\n"
      "  pyro:     { up: true, hp: 45, fw: 18, fh: 24, body: x => drawPyro(x, 0, [0, 0], [0, 0], 'idle'), head: [4, 0, 11, 8], torso: [1, 8, 13, 7], P: PYLEG, legW: 3 },\n")
before("  g_ice1: [6, 5,",
"""  g_chood: [8, 6, c => { R(c, CK.a, 1, 1, 6, 4); R(c, CK.b, 2, 1, 3, 1); R(c, CK.k, 4, 3, 3, 2); R(c, CK.eye, 4, 3, 3, 1); }],
  g_pmask: [8, 7, c => { R(c, PY.a, 1, 1, 6, 3); R(c, PY.mask, 2, 3, 5, 3); R(c, PY.lens, 3, 4, 1, 1); R(c, PY.lens, 5, 4, 1, 1); R(c, '#7a0c0c', 1, 6, 3, 1); }],
  g_tank: [6, 8, c => { R(c, PY.tank, 1, 1, 4, 6); R(c, PY.tankL, 1, 1, 1, 6); R(c, '#e8b422', 1, 4, 4, 1); }],
""")
after("  addTex(scene, 'sentry_head', makeSprite(16, 8, drawSentryHead));\n",
"""  const ckf = [{ name: 'idle', c: makeSprite(18, 24, x => drawCloaker(x, 0, [1, 0], [-1, 0], 'idle')) }, { name: 'crouch', c: makeSprite(18, 24, x => drawCloaker(x, 3, [2, 0], [-2, 0], 'idle')) },
               { name: 'lunge', c: makeSprite(18, 24, x => drawCloaker(x, 1, [4, 2], [-4, 0], 'lunge')) }, { name: 'air', c: makeSprite(18, 24, x => drawCloaker(x, 0, [3, 3], [-2, 1], 'idle')) }];
  for (let i = 0; i < 6; i++) ckf.push({ name: 'run' + i, c: makeSprite(18, 24, x => drawCloaker(x, RUN_BOB[i], RUN_LEGS[i], RUN_LEGS[(i + 3) % 6], 'idle')) });
  addSheet(scene, 'cloaker', ckf, 18, 24, true);
  const pyf = [{ name: 'idle', c: makeSprite(18, 24, x => drawPyro(x, 0, [1, 0], [-1, 0], 'idle')) }, { name: 'crouch', c: makeSprite(18, 24, x => drawPyro(x, 1, [2, 0], [-2, 0], 'crouch')) },
               { name: 'lunge', c: makeSprite(18, 24, x => drawPyro(x, 0, [3, 0], [-2, 0], 'lunge')) }, { name: 'air', c: makeSprite(18, 24, x => drawPyro(x, 0, [3, 3], [-2, 1], 'idle')) }];
  for (let i = 0; i < 6; i++) pyf.push({ name: 'run' + i, c: makeSprite(18, 24, x => drawPyro(x, RUN_BOB[i], RUN_LEGS[i], RUN_LEGS[(i + 3) % 6], 'idle')) });
  addSheet(scene, 'pyro', pyf, 18, 24, true);
  addSheet(scene, 'gunship', [{ name: 'g0', c: makeSprite(56, 24, x => drawGunship(x, 0, false)) }, { name: 'g1', c: makeSprite(56, 24, x => drawGunship(x, 1, false)) },
                              { name: 'wreck', c: makeSprite(56, 24, x => drawGunship(x, 0, true)) }], 56, 24, true);
  addTex(scene, 'hook', makeSprite(8, 7, c => { R(c, '#8a94a0', 0, 3, 4, 1); R(c, '#c8d0d8', 3, 1, 2, 5); R(c, '#c8d0d8', 5, 0, 2, 2); R(c, '#c8d0d8', 5, 5, 2, 2); R(c, '#ffffff', 6, 0, 1, 1); }));
  addTex(scene, 'firebomb', makeSprite(9, 5, c => { R(c, '#7a5a30', 0, 1, 6, 3); R(c, '#a07a40', 0, 1, 6, 1); R(c, '#5a4020', 6, 2, 2, 1); R(c, '#ff8a20', 8, 1, 1, 3); R(c, '#ffe080', 8, 2, 1, 1); }));
  { const { c, ctx } = mkCanvas(1000, 600), gr = ctx.createRadialGradient(500, 300, 55, 500, 300, 175);   // blackout vision mask
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(2,2,6,0.94)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, 1000, 600); addTex(scene, 'darkmask', c); }
""")

# ---------------------------------------------------------------- scene setup
after("    this.cryoActiveUntil = 0; this.sentry = null; this.sentryReadyAt = 0; this.rampageUntil = 0; this.rampageArmed = true; this.ghostT = 0; this.mod = null; this.rainT = 0;\n",
      "    this.hook = null; this.hookReady = 0; this.wrecks = []; this.darkA = 0;\n")
rep("screamer: 's0', warden: 'v0', jugg: 's0w0' }[kind] || 'w0';", "screamer: 's0', warden: 'v0', jugg: 's0w0', cloaker: 'idle', pyro: 'idle', gunship: 'g0' }[kind] || 'w0';")
before("    } else if (kind === 'screamer') {",
"""    } else if (kind === 'gunship') {
      e.body.setAllowGravity(false);
      Object.assign(e, { ai: 'cruise', side: 1, sideT: 3, volT: 2.5, dropT: 4, strT: 6, drops: 0, shots: 0, shotT: 0, strDir: 1 });
      e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xff3020).setScale(0.7).setAlpha(0.6).setDepth(18);
      e.thr = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0x6ab0ff).setScale(1.6).setAlpha(0.5).setDepth(18);
""")
rep("rocketeer: 0xff8a20, sapper: 0x7dff4a }[kind]", "rocketeer: 0xff8a20, sapper: 0x7dff4a, cloaker: 0x40f0ff, pyro: 0xffb040 }[kind]")
rep("PLUS,BACKSPACE,G,T,R,M,ENTER,ESC'", "PLUS,BACKSPACE,OPEN_BRACKET,G,T,C,R,M,ENTER,ESC'")
rep("'PLUS', 'BACKSPACE', 'G', 'T', 'R', 'M', 'ENTER', 'ESC']", "'PLUS', 'BACKSPACE', 'OPEN_BRACKET', 'G', 'T', 'C', 'R', 'M', 'ENTER', 'ESC']")
rep("    this.lamps = DECOR.lamps.map(([x, y]) => {", "    this.darkImg = this.add.image(0, 0, 'darkmask').setDepth(15.9).setVisible(false);   // blackout vision\n    this.lamps = DECOR.lamps.map(([x, y]) => {")

# ---------------------------------------------------------------- update loop / player / weapons
rep("    if (this.state !== 'dead') this.updatePlayer(dt, now);\n", "    if (this.state !== 'dead') { this.updatePlayer(dt, now); this.updateHook(dt); } else if (this.hook) this.hook = null;\n")
rep("    this.updateSentry(dt, now); if (this.mod === 'slag'", "    this.updateSentry(dt, now); this.updateWrecks(dt); if (this.mod === 'slag'")
after("    if (this.jd.BACKSPACE) this.setWeapon(12);\n",
      "    if (this.jd.OPEN_BRACKET) this.setWeapon(13);\n    if (this.jd.C) { if (this.hook && this.hook.state === 'zip') this.endHook(); else this.fireHook(now); }\n")
before("    } else if (W.id === 'cryo') {", "    } else if (W.id === 'prism') {\n      this.firePrism(now, ox, oy, a, mx, my);\n")
rep("    p.setTexture(kind === 'bomb' ? 'ebomb' : 'erocket').enableBody(true, x, y, true, true);\n    p.body.setSize(5, 5, true); p.body.setAllowGravity(kind === 'bomb');",
    "    p.setTexture(kind === 'bomb' ? 'ebomb' : kind === 'fire' ? 'firebomb' : 'erocket').enableBody(true, x, y, true, true);\n    p.body.setSize(5, 5, true); p.body.setAllowGravity(kind !== 'rocket');")
rep("    Object.assign(p, { pk: kind, life: kind === 'bomb' ? 4 : 3.5, px: x, py: y });\n    p.glow.setVisible(true).setPosition(x, y).setTint(kind === 'bomb' ? 0xff3020 : 0xffa040);",
    "    Object.assign(p, { pk: kind, life: kind === 'rocket' ? 3.5 : 4, px: x, py: y });\n    p.glow.setVisible(true).setPosition(x, y).setTint(kind === 'bomb' ? 0xff3020 : kind === 'fire' ? 0xff8a20 : 0xffa040);")
rep("    this.explode(x, y, p.pk === 'bomb' ? TUNE.WASP.bomb : TUNE.ROCKETEER.blast);\n",
    "    this.explode(x, y, p.pk === 'bomb' ? TUNE.WASP.bomb : p.pk === 'fire' ? TUNE.PYRO.burst : TUNE.ROCKETEER.blast);\n    if (p.pk === 'fire') this.spawnFirePatch(x, y);\n")
rep("      const landed = p.pk === 'bomb' && p.body.velocity.y > 0", "      const landed = p.pk !== 'rocket' && p.body.velocity.y > 0")
rep("      if (P.tick <= 0) {\n        P.tick = 0.35;\n",
    "      if (P.tick <= 0) {\n        P.tick = 0.35;\n        for (const rd of this.ragdolls) if (Math.abs(rd.pts[2].x - P.x) < P.w / 2 && Math.abs(rd.pts[2].y - P.y) < 12) rd.burnT = Math.max(rd.burnT, 2);   // corpses catch too\n")
rep("  ignite(e, t) {\n    if (e.kind === 'boss') t *= 0.5;", "  ignite(e, t) {\n    if (e.kind === 'pyro') return;                                       // fireproof\n    if (e.kind === 'boss') t *= 0.5;")
rep("    if (e.chill >= 1 && e.kind !== 'boss') this.freeze(e);", "    if (e.chill >= 1 && e.kind !== 'boss' && e.kind !== 'gunship') this.freeze(e);")
rep("m === 'slag' ? 'SLAG RAIN!' : 'LOW GRAVITY!'", "m === 'slag' ? 'SLAG RAIN!' : m === 'dark' ? 'BLACKOUT!' : 'LOW GRAVITY!'")
after("      if (kind === 'jugg') { this.boss = e; BUS.emit('minibar', 'JUGGERNAUT'); BUS.emit('callout', 'JUGGERNAUT'); this.shake(400, 0.01); Sfx.roar(); }\n",
      "      if (kind === 'gunship') { this.boss = e; BUS.emit('minibar', 'GUNSHIP'); BUS.emit('callout', 'GUNSHIP INBOUND'); this.shake(400, 0.008); Sfx.roar(); }\n")

# ---------------------------------------------------------------- damage / kill hooks
before("    e.hp -= dmg; e.flashT = 0.08;", "    if (e.kind === 'cloaker') e.revealT = 1.5;                           // getting hit lights a cloaker up\n")
rep("    const n = rag || hay ? 0 : randi(D.gibN[0], D.gibN[1])", "    const n = rag || hay || e.kind === 'gunship' ? 0 : randi(D.gibN[0], D.gibN[1])")
after("    if (e.kind === 'warden' && (e.links || []).some(o => o.alive)) { BUS.emit('callout', 'SHIELDS DOWN'); for (const o of e.links) if (o.alive) this.spawnLight(o.body.center.x, o.body.center.y, 'ring', 0x60e0ff, 0.4, 1.6, 0.9, 0.25); }\n",
"""    if (e.kind === 'pyro') this.time.delayedCall(50, () => { this.explode(cx, cy, TUNE.PYRO.tank); this.spawnFirePatch(cx, cy); BUS.emit('callout', 'TANK BREACH'); });   // its fuel goes up
    if (e.kind === 'gunship') { if (this.boss === e) this.boss = null; this.spawnWreck(e, dx); }
""")

# ---------------------------------------------------------------- AI dispatch / visuals
after("      else if (e.kind === 'jugg') this.updateJugg(e, dt, now, dx, dy, dist, alive);\n", "      else if (e.kind === 'gunship') this.updateGunship(e, dt, now, dx, dy, dist, alive);\n")
rep("      move = e.kind === 'sapper' ? this.thinkSapper(e, dt, now, c) :", "      move = e.kind === 'cloaker' ? this.thinkCloaker(e, dt, now, c) : e.kind === 'pyro' ? this.thinkPyro(e, dt, now, c) : e.kind === 'sapper' ? this.thinkSapper(e, dt, now, c) :")
rep("    else e.fr = e.ai === 'windup' || e.ai === 'plant' ? 'crouch' : e.ai === 'lunge' ? 'lunge' : !onGround ? 'air' : moving ? 'run' + run : e.aggro && e.kind !== 'sapper' ? 'crouch' : 'idle';",
    "    else e.fr = e.ai === 'windup' || e.ai === 'plant' || e.ai === 'reveal' ? 'crouch' : e.ai === 'lunge' || e.ai === 'strike' || e.ai === 'throw' ? 'lunge' : !onGround ? 'air' : moving ? 'run' + run : e.aggro && e.kind === 'stalker' ? 'crouch' : 'idle';")
rep("rocketeer: 'engage', sapper: 'hunt' }[e.kind];", "rocketeer: 'engage', sapper: 'hunt', cloaker: 'hunt', pyro: 'engage' }[e.kind];")
after("      if (e.tintKey !== tint) { e.tintKey = tint; if (tint === 0xffffff) e.clearTint(); else e.setTint(tint); }\n",
"""      if (e.kind === 'cloaker') {                                        // phase cloak: a shimmer until it strikes or gets hit
        e.revealT = Math.max(0, (e.revealT || 0) - dt);
        const vis = e.ai === 'reveal' || e.ai === 'strike' || e.revealT > 0 || e.frozen > 0 || e.burnT > 0 ? 1 : 0.06 + (Math.random() < 0.08 ? 0.14 : 0);
        e.cloakA = (e.cloakA ?? 0.06) + (vis - (e.cloakA ?? 0.06)) * Math.min(1, dt * 10);
        e.setAlpha(e.cloakA);
      }
""")
before("      if (e.kind === 'screamer') { e.glow.setPosition(",
"""      if (e.kind === 'cloaker') { e.glow.setPosition(e.x + e.dir * 5, e.y - 8 + (e.fr === 'crouch' ? 3 : 0)).setScale(e.ai === 'reveal' ? 0.7 : 0.3).setAlpha(0.3 + 0.6 * (e.cloakA ?? 0)); continue; }
      if (e.kind === 'pyro') { const w = e.ai === 'windup'; e.glow.setPosition(e.x + e.dir * (w ? 8 : 6), e.y + (w ? -12 : -1)).setScale(w ? 0.7 + Math.random() * 0.2 : 0.3).setTint(w ? 0xff8a20 : 0xffb040); continue; }
      if (e.kind === 'gunship') {
        const tell = e.ai === 'tell' || e.ai === 'volley';
        e.glow.setPosition(e.x + e.dir * 2, e.body.bottom + 1).setScale(tell ? 1 + Math.sin(now / 40) * 0.25 : 0.5).setAlpha(tell ? 0.9 : 0.4);
        e.thr.setPosition(e.x, e.body.bottom + 4).setScale(1.4 + Math.random() * 0.4, 0.8).setAlpha(0.45);
        continue;
      }
""")
rep("""      g.lineStyle(4, 0x2a8ad0, 0.35 * a).lineBetween(bm.x0, bm.y0, bm.x1, bm.y1);
      g.lineStyle(2, 0x6ad0ff, 0.6 * a).lineBetween(bm.x0, bm.y0, bm.x1, bm.y1);""",
"""      const pr = bm.col === 'prism';
      g.lineStyle(4, pr ? 0xd02090 : 0x2a8ad0, 0.35 * a).lineBetween(bm.x0, bm.y0, bm.x1, bm.y1);
      g.lineStyle(2, pr ? 0xff60e0 : 0x6ad0ff, 0.6 * a).lineBetween(bm.x0, bm.y0, bm.x1, bm.y1);""")
after("    for (const r of this.rocketList) if (r.active) r.glow.setPosition(r.x, r.y);\n",
"""    const hk = this.hook;                                                 // grapple chain
    if (hk && this.state !== 'dead') {
      const G = GUNS[WEAPONS[this.weapon].gun], ca = Math.cos(this.aim), sa = Math.sin(this.aim), gx = this.gun.x + ca * G.muzzle * 0.6, gy = this.gun.y + sa * G.muzzle * 0.6;
      const len = Math.hypot(hk.x - gx, hk.y - gy) || 1, n = Math.max(1, Math.floor(len / 4));
      this.laserG.lineStyle(1, 0x5a636e, 0.9).lineBetween(gx, gy, hk.x, hk.y);
      for (let i = 1; i < n; i++) this.laserG.fillStyle(i % 2 ? 0xc8d0d8 : 0x8a94a0, 1).fillRect(Math.round(gx + (hk.x - gx) * i / n) - 1, Math.round(gy + (hk.y - gy) * i / n) - 1, 2, 2);
      this.hookImg.setVisible(true).setPosition(hk.x, hk.y).setRotation(Math.atan2(hk.y - gy, hk.x - gx));
    } else this.hookImg.setVisible(false);
    const dT = this.mod === 'dark' && this.state !== 'dead' ? 1 : 0;      // blackout: vision shrinks to a pool round you; gunfire strobes it wider
    this.darkA += (dT - this.darkA) * Math.min(1, Math.min(this.game.loop.delta, 50) / 1000 * 1.5);
    if (this.darkA > 0.01) this.darkImg.setVisible(true).setAlpha(this.darkA * (0.92 + Math.random() * 0.08)).setScale(now < this.mflashUntil ? 1.3 : 1).setPosition(this.pv.x, this.pv.y - 12);
    else this.darkImg.setVisible(false);
""")
rep("      L.gl.setAlpha(0.5 * a); L.cone.setAlpha(0.16 * a);", "      a *= 1 - (this.darkA || 0); L.gl.setAlpha(0.5 * a); L.cone.setAlpha(0.16 * a);   // lamps die in a blackout")
rep("    this.mflash = this.add.image(0, 0, 'mf0')", "    this.hookImg = this.add.image(0, 0, 'hook').setDepth(9).setVisible(false);\n    this.mflash = this.add.image(0, 0, 'mf0')")

# ---------------------------------------------------------------- HUD
rep("['0', '-', '=', '<'][i - 9]", "['0', '-', '=', '<', '['][i - 9]")

# ---------------------------------------------------------------- new methods
before("  // ------------------------------------------------------------------ waves ----\n", SCENE)

if fails:
    for f in fails: print('FAIL', f)
    sys.exit(1)
open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok', len(s))
