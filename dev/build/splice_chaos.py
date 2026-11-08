import sys
SP, p = sys.argv[1], sys.argv[2]
s = open(p, encoding='utf-8').read()
ART = open(SP + 'chaos_art.js', encoding='utf-8').read()
SCENE = open(SP + 'chaos_scene.js', encoding='utf-8').read()

def rep(a, b, cnt=1):
    global s
    n = s.count(a)
    assert n == cnt, (n, a[:90])
    s = s.replace(a, b)

def after(a, add): rep(a, a + add)
def before(a, add): rep(a, add + a)

# ---------------------------------------------------------------- tuning / data
rep("enemy: true, spare: 'boss', burn: 1.5 } },\n};",
"""enemy: true, spare: 'boss', burn: 1.5 } },
  MINI:    { cooldown: 45, spinUp: 0.55, speed: 600, damage: 7, spread: 4.5, life: 0.75 },
  CLUSTER: { cooldown: 1400, speed: 250, lift: 140, bomblets: 6,
             shell: { radius: 30, maxDamage: 30, minDamage: 10, selfDamage: 6, push: 220, maxRise: 360, tileDamage: 50 },
             bomb:  { radius: 34, maxDamage: 44, minDamage: 12, selfDamage: 8, push: 240, maxRise: 400, tileDamage: 70 } },
  ROCKETEER: { aimMs: 750, lockAt: 0.6, rocketSpeed: 175, fireCd: 3.0,
               blast: { radius: 44, maxDamage: 30, minDamage: 8, enemyDamage: 20, selfDamage: 22, push: 320, maxRise: 440, enemy: true, tileDamage: 70 } },
  WASP:    { speed: 115, height: 92, bombGap: 0.32, runBombs: 3, rest: 2.2,
             bomb: { radius: 40, maxDamage: 30, minDamage: 8, enemyDamage: 16, selfDamage: 20, push: 280, maxRise: 400, enemy: true, tileDamage: 60 } },
  RAMMER:  { windMs: 650, speed: 330, chargeT: 1.7, dmg: 30, stun: 1.8, cd: 2.4 },
  TILE:    { span: 3 },                                   // girders/gratings may overhang this many tiles past an anchor
};""")
after("  Object.assign({ id: 'sing', name: 'SINGULARITY', gun: 'sing' }, TUNE.SING),\n",
"""  Object.assign({ id: 'mini', name: 'RIVET MINIGUN', gun: 'mini' }, TUNE.MINI),
  Object.assign({ id: 'cluster', name: 'CLUSTER MORTAR', gun: 'cluster' }, TUNE.CLUSTER),
""")
before("  boss: { key: 'boss', fw: 48, fh: 44,",
"""  rocketeer: { key: 'rocketeer', fw: 20, fh: 24, bw: 11, bh: 20, hp: 70, speed: 95, sight: 340, touch: 8, kb: 0.6, dodge: 0.3, dodgeCd: 2, head: 'g_rhelm',
               gibs: ['g_rarmor', 'g_rarmor', 'g_flesh1', 'g_flesh2', 'g_flesh3', 'g_chunk', 'g_bone', 'g_rib', 'g_chunk'], gibN: [12, 16] },
  wasp: { key: 'wasp', fw: 22, fh: 14, bw: 16, bh: 10, hp: 45, sight: 320, touch: 8, kb: 1,
          gibs: ['g_wing', 'g_wing', 'g_plate', 'g_wire', 'g_eye', 'g_plateL', 'g_chunk'], gibN: [9, 12] },
  rammer: { key: 'rammer', fw: 30, fh: 22, bw: 22, bh: 18, hp: 170, patrol: 28, chase: 70, sight: 260, touch: 18, kb: 0.15,
            gibs: ['g_horn', 'g_plateL', 'g_plateL', 'g_plateL', 'g_flesh1', 'g_flesh2', 'g_flesh3', 'g_flesh1', 'g_bone', 'g_rib', 'g_chunk', 'g_chunk'], gibN: [18, 24] },
""")
rep("const isHumanoid = e => e.kind === 'enforcer' || e.kind === 'stalker' || e.kind === 'bulwark' || e.kind === 'sniper';\nconst isRifleman = e => e.kind === 'enforcer' || e.kind === 'sniper';",
    "const isHumanoid = e => e.kind === 'enforcer' || e.kind === 'stalker' || e.kind === 'bulwark' || e.kind === 'sniper' || e.kind === 'rocketeer';\nconst isRifleman = e => e.kind === 'enforcer' || e.kind === 'sniper' || e.kind === 'rocketeer';")
after("const BARRELS = [[20, 24], [45, 20], [58, 24], [75, 24], [88, 12], [35, 16]];",
      "\nconst TILE_HP = { x: 55, g: 80, '=': 30 };                        // breakable tiles: crate, girder, grating")

# ---------------------------------------------------------------- audio
before("  heart() { if (!this.ok('heart', 0.4)) return;",
"""  rivet() { if (!this.ok('rivet', 0.018)) return;
    this.noise({ filter: 'highpass', f0: 2200, dur: 0.03, vol: 0.13 }); this.tone({ type: 'square', f0: rand(700, 900), f1: 240, dur: 0.035, vol: 0.05 });
    this.tone({ type: 'sine', f0: 130, f1: 55, dur: 0.05, vol: 0.16 }); },
  smash(c) { if (!this.ok('smash', 0.05)) return;                   // crate / girder / grating giving way
    this.noise({ filter: 'lowpass', f0: c === '=' ? 3200 : 1800, f1: 180, dur: 0.3, vol: 0.5, dest: this.crunch });
    this.tone({ type: 'square', f0: rand(260, 420), f1: 90, dur: 0.12, vol: 0.08 });
    for (let i = 0; i < 3; i++) this.tone({ type: 'triangle', f0: rand(900, 2200), f1: 500, dur: 0.06, vol: 0.05, delay: rand(0.03, 0.2) }); },
  creak() { if (!this.ok('creak', 0.25)) return;                    // metal groan before a span drops
    this.tone({ type: 'sawtooth', f0: 95, f1: 48, dur: 0.7, vol: 0.14 }); this.tone({ type: 'sawtooth', f0: 140, f1: 70, dur: 0.6, vol: 0.06, detune: 25 });
    this.noise({ filter: 'bandpass', f0: 420, q: 4, dur: 0.6, vol: 0.12 }); },
  whistle() { if (!this.ok('whistle', 0.15)) return; this.tone({ type: 'sine', f0: 1700, f1: 700, dur: 0.55, vol: 0.05 }); },
  snort() { if (!this.ok('snort', 0.3)) return; this.noise({ filter: 'bandpass', f0: 500, f1: 1400, q: 1.5, dur: 0.25, vol: 0.35 }); this.tone({ type: 'sawtooth', f0: 75, f1: 50, dur: 0.4, vol: 0.2 }); },
  clusterPop() { if (!this.ok('cpop', 0.08)) return; this.tone({ type: 'sine', f0: 600, f1: 140, dur: 0.12, vol: 0.4 }); this.noise({ filter: 'bandpass', f0: 2600, q: 2, dur: 0.18, vol: 0.25 }); },
  miniSet(sp) {                                                    // motor whine that follows the minigun's barrel spin
    if (!this.ctx) return;
    if (sp > 0.02 && !this.miniNode && !this.muted) {
      const c = this.ctx, g = c.createGain(); g.gain.value = 0.0001;
      const o = c.createOscillator(); o.type = 'sawtooth'; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2.5;
      const o2 = c.createOscillator(); o2.type = 'square'; const g2 = c.createGain(); g2.gain.value = 0.3;
      o.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(this.out); o.start(); o2.start();
      this.miniNode = { g, o, o2, f };
    }
    const n = this.miniNode; if (!n) return;
    const t = this.ctx.currentTime;
    if (sp <= 0.02) { this.miniNode = null; n.g.gain.setTargetAtTime(0.0001, t, 0.05); n.o.stop(t + 0.3); n.o2.stop(t + 0.3); return; }
    n.o.frequency.setTargetAtTime(70 + 330 * sp, t, 0.03); n.o2.frequency.setTargetAtTime(35 + 160 * sp, t, 0.03);
    n.f.frequency.setTargetAtTime(400 + 1400 * sp, t, 0.03); n.g.gain.setTargetAtTime(0.06 * sp, t, 0.03);
  },
""")
rep("const HINT2 = 'J FIRE (KEYS ONLY)   1-9  Q/E  WHEEL SWITCH   R RESTART   M MUTE';",
    "const HINT2 = 'J FIRE (KEYS ONLY)   1-9 0 -  Q/E  WHEEL SWITCH   R RESTART   M MUTE';")

# ---------------------------------------------------------------- art
before("  rocket: { w: 28, h: 13, py: 6, muzzle: 26, draw(ctx, arm) {",
"""  mini: { w: 28, h: 13, py: 6, muzzle: 27, draw(ctx, arm, alt) {
    if (arm) drawArm(ctx, 6);
    R(ctx, '#3a3f47', 5, 3, 9, 7); R(ctx, '#6a7380', 5, 3, 9, 1); R(ctx, '#2a2e35', 6, 10, 3, 2); R(ctx, '#e8b422', 8, 5, 3, 2);   // housing, grip, decal
    R(ctx, '#4a525c', 14, 3, 3, 7); R(ctx, '#8a94a0', 14, 3, 3, 1);                                                                 // barrel clamp
    for (let i = 0; i < 3; i++) R(ctx, (i + (alt ? 1 : 0)) % 2 ? '#9aa4b0' : '#5a636e', 17, 4 + i * 2, 8, 1);                       // three spinning barrels
    R(ctx, '#23272d', 17, 5, 8, 1); R(ctx, '#23272d', 17, 7, 8, 1); R(ctx, '#6a7380', 25, 3, 2, 7);
  } },
  cluster: { w: 26, h: 14, py: 7, muzzle: 24, draw(ctx, arm) {
    if (arm) drawArm(ctx, 7);
    R(ctx, '#3a3f47', 5, 4, 8, 7); R(ctx, '#6a7380', 5, 4, 8, 1); R(ctx, '#2a2e35', 6, 11, 2, 3);
    R(ctx, '#5a4a2a', 7, 8, 5, 4); R(ctx, '#8a7040', 7, 8, 5, 1);                                         // shell drum
    R(ctx, '#4b535e', 13, 2, 9, 9); R(ctx, '#7c8790', 13, 2, 9, 1); R(ctx, '#2a2e35', 13, 10, 9, 1);      // fat mortar tube
    for (let i = 0; i < 4; i++) R(ctx, i % 2 ? '#15161a' : '#e8b422', 15 + i, 4, 1, 5);
    R(ctx, '#9aa4b0', 22, 1, 3, 11); R(ctx, '#15171a', 23, 3, 1, 7);
  } },
""")
before("// ---- ragdoll parts: cut from each walker's own drawing", ART)
after("  bulwark:  { up: true, hp: 55, fw: 22, fh: 24, body: x => drawBulwark(x, 0, [0, 0], [0, 0], 'walk'), clear: [[14, 0, 8, 24]], head: [5, 0, 9, 7], torso: [3, 7, 11, 8], P: BWLEG, legW: 3 },\n",
      "  rocketeer: { up: true, hp: 45, fw: 20, fh: 24, body: x => drawRocketeer(x, 0, [0, 0], [0, 0]), head: [5, 0, 10, 8], torso: [1, 8, 14, 7], P: RKLEG, legW: 3 },\n")
before("  g_barrel: [7, 5,",
"""  g_plank: [9, 4, c => { R(c, '#7a4a24', 1, 1, 7, 2); R(c, '#a0632e', 1, 1, 7, 1); R(c, '#c8a070', 6, 1, 1, 1); }],
  g_plank2: [6, 5, c => { R(c, '#6e4222', 1, 1, 4, 3); R(c, '#9a5e2e', 1, 1, 4, 1); }],
  g_beam: [10, 4, c => { R(c, '#8a5228', 1, 1, 8, 2); R(c, '#b0703a', 1, 1, 8, 1); R(c, '#3a200e', 4, 2, 2, 1); }],
  g_bar: [9, 3, c => { R(c, '#505a67', 1, 1, 7, 1); R(c, '#7a8695', 1, 1, 3, 1); }],
  g_casing: [4, 3, c => { R(c, '#d9a640', 1, 1, 2, 1); }],
  g_rhelm: [10, 8, c => { R(c, RK.b, 1, 1, 8, 5); R(c, RK.c, 2, 1, 4, 1); R(c, RK.k, 4, 3, 5, 2); R(c, RK.visor, 5, 3, 4, 1); R(c, '#7a0c0c', 1, 6, 4, 1); }],
  g_rarmor: [8, 6, c => { R(c, RK.b, 1, 1, 6, 4); R(c, RK.c, 1, 1, 6, 1); R(c, '#e8b422', 2, 3, 4, 1); }],
  g_wing: [8, 3, c => { R(c, WP.wing, 1, 1, 6, 1); R(c, WP.wingD, 2, 1, 2, 1); }],
  g_horn: [10, 9, c => { R(c, RM.m, 1, 1, 6, 7); R(c, RM.ml, 1, 1, 6, 1); R(c, RM.y, 2, 3, 4, 1); R(c, RM.k, 2, 5, 4, 1); R(c, RM.mh, 7, 6, 2, 1); }],
""")

# ---------------------------------------------------------------- level / nav
rep("// '#' = solid metal, '=' = one-way grating (jump up through, S+Space drops down).",
    "// '#' = solid metal, '=' = one-way grating (jump up through, S+Space drops down), 'x' = breakable crate,\n// 'g' = breakable girder. Only '#' is permanent.")
rep("  fill(14, 23, 4, 2); fill(28, 23, 2, 2); fill(38, 21, 19, 4); fill(78, 23, 2, 2);    // floor features + plateau",
    "  fill(14, 23, 4, 2, 'x'); fill(28, 23, 2, 2, 'x'); fill(38, 21, 19, 4); fill(78, 23, 2, 2, 'x');   // crate stacks + plateau\n"
    "  fill(7, 24, 2, 1, 'x'); fill(69, 24, 2, 1, 'x'); fill(92, 23, 2, 2, 'x'); fill(34, 16, 1, 1, 'x'); fill(62, 16, 1, 1, 'x'); fill(90, 20, 1, 1, 'x');")
rep("""  fill(7, 21, 6, 1, '='); fill(20, 21, 6, 1); fill(68, 21, 7, 1, '='); fill(86, 21, 7, 1);
  fill(13, 17, 7, 1, '='); fill(30, 17, 7, 1); fill(44, 17, 7, 1, '='); fill(60, 17, 7, 1); fill(77, 17, 7, 1, '='); fill(92, 17, 6, 1);
  fill(2, 13, 7, 1); fill(22, 13, 7, 1, '='); fill(38, 13, 5, 1); fill(52, 13, 5, 1); fill(70, 13, 7, 1, '='); fill(84, 13, 6, 1);
  fill(12, 9, 7, 1, '='); fill(44, 9, 7, 1); fill(60, 9, 5, 1, '='); fill(90, 9, 8, 1);""",
"""  fill(7, 21, 6, 1, '='); fill(20, 21, 6, 1, 'g'); fill(68, 21, 7, 1, '='); fill(86, 21, 7, 1, 'g');
  fill(13, 17, 7, 1, '='); fill(30, 17, 7, 1, 'g'); fill(44, 17, 7, 1, '='); fill(60, 17, 7, 1, 'g'); fill(77, 17, 7, 1, '='); fill(92, 17, 6, 1);
  fill(2, 13, 7, 1); fill(22, 13, 7, 1, '='); fill(38, 13, 5, 1, 'g'); fill(52, 13, 5, 1, 'g'); fill(70, 13, 7, 1, '='); fill(84, 13, 6, 1, 'g');
  fill(12, 9, 7, 1, '='); fill(44, 9, 7, 1, 'g'); fill(60, 9, 5, 1, '='); fill(90, 9, 8, 1);""")
rep("""  [['bulwark', 'G'], ['bulwark', 'G'], ['mender', 'A'], ['enforcer', 'G'], ['sniper', 'G'], ['stalker', 'G'], ['drone', 'A'], ['tick', 'G'], ['tick', 'G'], ['tick', 'G']],
  [['boss', 'B']],""",
"""  [['bulwark', 'G'], ['bulwark', 'G'], ['mender', 'A'], ['enforcer', 'G'], ['sniper', 'G'], ['stalker', 'G'], ['drone', 'A'], ['tick', 'G'], ['tick', 'G'], ['tick', 'G'],
   ['rocketeer', 'G'], ['wasp', 'A']],
  [['rammer', 'G'], ['rammer', 'G'], ['rocketeer', 'G'], ['rocketeer', 'G'], ['wasp', 'A'], ['wasp', 'A'], ['grunt', 'G'], ['grunt', 'G'], ['stalker', 'G'],
   ['tick', 'G'], ['tick', 'G'], ['tick', 'G']],
  [['boss', 'B']],""")
rep("const NAV = buildNav(LEVEL_GRID);", "let NAV = buildNav(LEVEL_GRID);                    // rebuilt whenever the terrain breaks")
rep("""  const solid = (x, y) => cell(x, y) === '#';
  const stand = (x, y) => { const u = cell(x, y + 1); return cell(x, y) === '.' && !solid(x, y - 1) && (u === '#' || u === '='); };""",
"""  const solid = (x, y) => { const c = cell(x, y); return c === '#' || c === 'x' || c === 'g'; };
  const stand = (x, y) => cell(x, y) === '.' && !solid(x, y - 1) && cell(x, y + 1) !== '.';""")
rep("  return { nodes, id };\n}", "  return { nodes, id, solid };\n}")
rep("    if (ty >= 0 && ty < MAP_H && LEVEL_GRID[ty][tx] === '#') break;", "    if (NAV.solid(tx, ty)) break;")
rep("""    } else if (ch === '=') {
      R(ctx, '#7a8695', x, y, 16, 1); R(ctx, '#505a67', x, y + 1, 16, 1);
      for (let i = 0; i < 16; i++) { if (i % 4 === 0) R(ctx, '#3a424c', x + i, y + 2, 1, 3); else if ((i + 2) % 4 === 0) R(ctx, '#2c323a', x + i, y + 3); }
      R(ctx, '#2a3038', x, y + 5, 16, 1);
      if (grid[ty][tx - 1] !== '=') { R(ctx, '#3a424c', x, y + 6, 3, 1); R(ctx, '#3a424c', x, y + 7, 2, 1); R(ctx, '#3a424c', x, y + 8); }
      if (grid[ty][tx + 1] !== '=') { R(ctx, '#3a424c', x + 13, y + 6, 3, 1); R(ctx, '#3a424c', x + 14, y + 7, 2, 1); R(ctx, '#3a424c', x + 15, y + 8); }
    }""",
"""    } else if (ch === '=') drawGrating(ctx, x, y, grid[ty][tx - 1] !== '=', grid[ty][tx + 1] !== '=');
    else if (ch === 'g') drawGirder(ctx, x, y, grid[ty][tx - 1] !== 'g', grid[ty][tx + 1] !== 'g');
    else if (ch === 'x') drawCrate(ctx, x, y, h);""")

# ---------------------------------------------------------------- boot textures
after("  buildRagParts(scene);\n",
"""  const rkf = [
    { name: 'idle0', c: makeSprite(20, 24, x => drawRocketeer(x, 0, [1, 0], [-1, 0])) }, { name: 'idle1', c: makeSprite(20, 24, x => drawRocketeer(x, 1, [1, 0], [-1, 0])) },
    { name: 'jump', c: makeSprite(20, 24, x => drawRocketeer(x, 0, [3, 3], [-2, 1])) }, { name: 'fall', c: makeSprite(20, 24, x => drawRocketeer(x, 0, [2, 1], [-3, 0])) },
  ];
  for (let i = 0; i < 6; i++) rkf.push({ name: 'run' + i, c: makeSprite(20, 24, x => drawRocketeer(x, RUN_BOB[i], RUN_LEGS[i], RUN_LEGS[(i + 3) % 6])) });
  addSheet(scene, 'rocketeer', rkf, 20, 24, true);
  addTex(scene, 'gun_rlaunch', makeSprite(26, 11, x => drawRLauncher(x, true)));
  addTex(scene, 'icon_rlaunch', makeSprite(26, 11, x => drawRLauncher(x, false)));
  addSheet(scene, 'wasp', [{ name: 'p0', c: makeSprite(22, 14, x => drawWasp(x, 0, false)) }, { name: 'p1', c: makeSprite(22, 14, x => drawWasp(x, 1, false)) },
                           { name: 'pb', c: makeSprite(22, 14, x => drawWasp(x, 0, true)) }], 22, 14, true);
  const rmf = [];
  for (let i = 0; i < 4; i++) rmf.push({ name: 'w' + i, c: makeSprite(30, 22, x => drawRammer(x, i, 'walk')) });
  rmf.push({ name: 'wind', c: makeSprite(30, 22, x => drawRammer(x, 0, 'wind')) }, { name: 'c0', c: makeSprite(30, 22, x => drawRammer(x, 0, 'charge')) },
           { name: 'c1', c: makeSprite(30, 22, x => drawRammer(x, 1, 'charge')) }, { name: 'dz', c: makeSprite(30, 22, x => drawRammer(x, 0, 'dizzy')) });
  addSheet(scene, 'rammer', rmf, 30, 22, true);
  addTex(scene, 'erocket', makeSprite(10, 5, c => { R(c, '#8a8f98', 2, 1, 6, 3); R(c, '#c4ccd4', 2, 1, 6, 1); R(c, '#e02a1a', 8, 1, 1, 3); R(c, '#e8b422', 4, 1, 1, 3); R(c, '#4a525c', 0, 0, 2, 1); R(c, '#4a525c', 0, 4, 2, 1); }));
  addTex(scene, 'ebomb', makeSprite(8, 6, c => { R(c, '#a02018', 2, 1, 5, 4); R(c, '#d04030', 2, 1, 5, 1); R(c, '#e8b422', 4, 1, 1, 4); R(c, '#3a3f47', 0, 1, 2, 1); R(c, '#3a3f47', 0, 4, 2, 1); R(c, '#3a3f47', 1, 2, 1, 2); }));
  addTex(scene, 'cshell', makeSprite(9, 7, c => { R(c, '#5a4a2a', 1, 1, 7, 5); R(c, '#8a7040', 2, 1, 5, 1); R(c, '#e8b422', 3, 3, 3, 1); R(c, '#2a2216', 1, 5, 7, 1); }));
  addTex(scene, 'bomblet', makeSprite(5, 5, c => { R(c, '#c03010', 1, 1, 3, 3); R(c, '#ffb040', 2, 1, 1, 1); }));
  addTex(scene, 'rivet', makeSprite(6, 3, c => { R(c, '#b07030', 0, 1, 2, 1); R(c, '#ffd27a', 2, 1, 3, 1); R(c, '#ffffff', 5, 1); R(c, '#ff9a3a', 2, 0, 3, 1); R(c, '#ff9a3a', 2, 2, 3, 1); }, null));
  addTex(scene, 'gun_mini2', makeSprite(GUNS.mini.w, GUNS.mini.h, x => GUNS.mini.draw(x, true, true)));
  addTex(scene, 'fb_x', makeSprite(16, 16, c => drawCrate(c, 0, 0, 1), null));          // falling-block versions of the tiles
  addTex(scene, 'fb_g', makeSprite(16, 16, c => drawGirder(c, 0, 0, false, false), null));
  addTex(scene, 'fb_=', makeSprite(16, 7, c => drawGrating(c, 0, 0, false, false), null));
""")
rep("'1-9  Q/E  WHEEL SWITCH WEAPON    R RESTART    M MUTE'", "'1-9 0 -  Q/E  WHEEL SWITCH WEAPON    R RESTART    M MUTE'")

# ---------------------------------------------------------------- scene setup
rep("    this.grid = LEVEL_GRID;\n", "    this.grid = LEVEL_GRID.map(r => r.slice()); NAV = buildNav(this.grid);   // a fresh breakable copy every run\n")
rep("    Sfx.arcSet(false); Sfx.flameSet(false);\n    this.jd = {};", "    Sfx.arcSet(false); Sfx.flameSet(false); Sfx.miniSet(0); this.spin = 0; this.heat = 0;\n    this.jd = {};")
before("    // lights & ambience\n", "    this.initTerrain();\n")
rep("    [this.grenades, this.grenadeList] = mk(16, 'grenade', true);", "    [this.grenades, this.grenadeList] = mk(40, 'grenade', true);")
after("    this.barrelList.forEach(k => k.setDepth(4));\n",
"""    [this.eprojs, this.eprojList] = mk(14, 'erocket', false);
    this.eprojList.forEach(q => { q.setDepth(9); q.glow = this.add.image(0, 0, 'glow').setBlendMode(ADD).setScale(0.8).setAlpha(0.75).setDepth(18).setVisible(false); });
    [this.fblocks, this.fblockList] = mk(24, 'fb_x', true);
    this.fblockList.forEach(f => f.setDepth(1.5));
""")
rep("    const D = ENEMY[kind], x = cx * TS + 8, flier = kind === 'drone' || kind === 'mender';",
    "    const D = ENEMY[kind], x = cx * TS + 8, flier = kind === 'drone' || kind === 'mender' || kind === 'wasp';")
rep("const f0 = { drone: 'd0', mender: 'm0', enforcer: 'idle0', bulwark: 'idle0', sniper: 'idle0', stalker: 'idle', tick: 'k0', boss: 'w0' }[kind] || 'w0';",
    "const f0 = { drone: 'd0', mender: 'm0', enforcer: 'idle0', bulwark: 'idle0', sniper: 'idle0', rocketeer: 'idle0', stalker: 'idle', tick: 'k0', boss: 'w0', wasp: 'p0' }[kind] || 'w0';")
before("    } else if (kind === 'heavy') {",
"""    } else if (kind === 'wasp') {
      e.body.setAllowGravity(false);
      Object.assign(e, { ai: 'patrol', runDir: 1, runY: y, bombs: 0, bombT: 0 });
      e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xff3020).setScale(0.45).setAlpha(0.8).setDepth(18);
      e.thr = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xc0e0ff).setScale(0.6).setAlpha(0.3).setDepth(18);
    } else if (kind === 'rammer') {
      Object.assign(e, { ai: 'patrol', atkCd: 1.5, hitSet: new Set(), hitP: false, stepK: 0 });
      e.glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xff3b1f).setScale(0.4).setAlpha(0.8).setDepth(18);
""")
rep("{ enforcer: 0xff3020, stalker: 0x7dff4a, bulwark: 0xff9a2a, sniper: 0x60c0ff }[kind]", "{ enforcer: 0xff3020, stalker: 0x7dff4a, bulwark: 0xff9a2a, sniper: 0x60c0ff, rocketeer: 0xff8a20 }[kind]")
after("      if (kind === 'sniper') { e.gun = this.add.image(x, y, 'gun_sniper').setOrigin(2 / 34, 4.5 / 9).setDepth(6); e.fireCd = 1; }\n",
      "      if (kind === 'rocketeer') { e.gun = this.add.image(x, y, 'gun_rlaunch').setOrigin(2 / 26, 5.5 / 11).setDepth(6); e.fireCd = 1.5; }\n")
rep("e => e.kind !== 'drone' && e.kind !== 'mender' && this.time.now >= (e.dropUntil || 0));",
    "e => e.kind !== 'drone' && e.kind !== 'mender' && e.kind !== 'wasp' && this.time.now >= (e.dropUntil || 0));")
rep("'W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,J,Q,E,F,ONE,TWO,THREE,FOUR,FIVE,SIX,SEVEN,EIGHT,NINE,R,M,ENTER,ESC'",
    "'W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,J,Q,E,F,ONE,TWO,THREE,FOUR,FIVE,SIX,SEVEN,EIGHT,NINE,ZERO,MINUS,R,M,ENTER,ESC'")

# ---------------------------------------------------------------- update loop
rep("'SEVEN', 'EIGHT', 'NINE', 'R', 'M', 'ENTER', 'ESC']", "'SEVEN', 'EIGHT', 'NINE', 'ZERO', 'MINUS', 'R', 'M', 'ENTER', 'ESC']")
rep("{ Sfx.arcSet(false); Sfx.flameSet(false); this.scene.restart(); return; }", "{ Sfx.arcSet(false); Sfx.flameSet(false); Sfx.miniSet(0); this.scene.restart(); return; }")
rep("if (this.jd.ESC) { Sfx.arcSet(false); Sfx.flameSet(false);", "if (this.jd.ESC) { Sfx.arcSet(false); Sfx.flameSet(false); Sfx.miniSet(0);")
after("    this.updateHazards(dt, now);\n",
"""    this.updateEProjs(dt);
    this.updateFallingBlocks(dt);
    if (this.stabQ.length) this.processStability();
    if (this.breakDirty) this.rebuildBreakZones();
    if (this.onewayDirty) this.rebuildOneways();
    if (this.navDirtyT > 0 && (this.navDirtyT -= dt) <= 0) this.rebuildNav();
""")
after("    Sfx.flameSet(now < this.flameActiveUntil && this.state !== 'dead');\n", "    Sfx.miniSet(this.state !== 'dead' ? this.spin : 0);\n")
rep("    const dir = (right ? 1 : 0) - (left ? 1 : 0), target = dir * T.RUN_SPEED;",
    "    const dir = (right ? 1 : 0) - (left ? 1 : 0), target = dir * T.RUN_SPEED * (1 - 0.4 * this.spin);   // a spun-up minigun slows you")
after("    if (this.jd.NINE) this.setWeapon(8);\n", "    if (this.jd.ZERO) this.setWeapon(9);\n    if (this.jd.MINUS) this.setWeapon(10);\n")
rep("""    const ptr = this.input.activePointer;
    if (((ptr.isDown && ptr.leftButtonDown()) || K.J.isDown) && now >= this.nextFire) this.fire(now);""",
"""    const ptr = this.input.activePointer, trig = (ptr.isDown && ptr.leftButtonDown()) || K.J.isDown, mini = WEAPONS[this.weapon].id === 'mini';
    this.spin = clamp(this.spin + (mini && trig ? dt / TUNE.MINI.spinUp : -dt / 0.7), 0, 1);   // minigun barrels spin up before they bite
    if (trig && now >= this.nextFire && (!mini || this.spin > 0.3)) this.fire(now);
    this.heat = Math.max(0, this.heat - dt * (trig && mini ? 0.12 : 0.5));""")

# ---------------------------------------------------------------- weapons
before("    } else if (W.id === 'saw') {",
"""    } else if (W.id === 'mini') {
      this.stats.shots++;
      this.nextFire = now + 150 - (150 - W.cooldown) * this.spin;       // fire rate climbs with barrel spin
      const sp = W.spread * (1.6 - 0.6 * this.spin);
      this.spawnBullet('rivet', ox, oy, a + rand(-1, 1) * sp * DEG, W.speed * rand(0.95, 1.05), W.damage, W.life);
      this.recoil = 2.5; Sfx.rivet();
      this.muzzle(mx, my, a, 0.9, 35);
      this.fxSparks(mx, my, 2, a, 0.7, [80, 200]);
      this.shake(40, 0.0018 + 0.0012 * this.spin); this.addKick(-ca * 1.4, -sa * 1.4);
      pb.velocity.x -= ca * 14;
      this.heat = Math.min(1, this.heat + 0.018);
      if ((this.miniN = (this.miniN || 0) + 1) % 2 === 0) this.spawnGib('g_casing', this.shoulder.x - ca * 3, this.shoulder.y - 2, -this.facing * rand(30, 110), rand(-230, -130), 'shell');
    } else if (W.id === 'cluster') {
      this.stats.shots++;
      this.spawnGrenade(ox, oy, a, 'cluster');
      this.recoil = 5; Sfx.grenade(); Sfx.mortar();
      this.muzzle(mx, my, a, 1.2, 70);
      this.fxSmoke(mx, my, 7); this.fxSparks(mx, my, 4, a, 0.7, [60, 160]);
      this.shake(90, 0.004); this.addKick(-ca * 4, -sa * 4);
""")
rep("    b.setTexture(kind === 'nail' ? 'nail' : kind === 'pellet' ? 'pellet' : 'parry');",
    "    b.setTexture(kind === 'nail' ? 'nail' : kind === 'pellet' ? 'pellet' : kind === 'rivet' ? 'rivet' : 'parry');")
rep("""      g.fuse -= dt;
      if (g.fuse <= 0) { this.detonate(g); continue; }
""", """      g.fuse -= dt;
      if (g.fuse <= 0) { this.detonate(g); continue; }
      g.age += dt;
      if (g.gk === 'cluster' && g.age > 0.3 && (b.velocity.y > 30 || b.blocked.down || b.blocked.left || b.blocked.right || b.blocked.up)) { this.detonate(g); continue; }   // airburst at the top of the arc
""")
rep("g.blinkOn = !g.blinkOn; if (g.blinkOn) Sfx.beep(); }", "g.blinkOn = !g.blinkOn; if (g.blinkOn && g.gk === 'grenade') Sfx.beep(); }")
after("    this.paintHole(x + ca * 1.5, y + sa * 1.5);\n",
      "    this.damageTile(Math.floor((x + ca * 1.5) / TS), Math.floor((y + sa * 1.5) / TS), b.kind === 'pellet' ? 4 : b.kind === 'parry' ? 40 : b.kind === 'rivet' ? 3 : 5);\n")
rep("        s.bounces--; s.px = hit.x; s.py = hit.y;",
    "        s.bounces--; s.px = hit.x; s.py = hit.y;\n        const tt = hx ? [hit.x + Math.sign(vx) * 4, hit.y] : [hit.x, hit.y + Math.sign(vy) * 4]; this.damageTile(Math.floor(tt[0] / TS), Math.floor(tt[1] / TS), 14);")
rep("""    for (let d = 0; d < W.range; d += 3) {
      const x = this.shoulder.x + ca * d, y = this.shoulder.y + sa * d;
      if (this.solidAt(x, y)) break;
      ex = x; ey = y;
      for (const e of this.enemies.getChildren()) {""",
"""    let pierced = 0;
    for (let d = 0; d < W.range; d += 3) {
      const x = this.shoulder.x + ca * d, y = this.shoulder.y + sa * d;
      if (this.solidAt(x, y)) {                                         // punches through up to 3 breakable tiles
        const tx = Math.floor(x / TS), ty = Math.floor(y / TS);
        if (pierced < 3 && TILE_HP[this.tileAt(tx, ty)]) { pierced++; this.destroyTile(tx, ty, true); } else break;
      }
      ex = x; ey = y;
      for (const e of this.enemies.getChildren()) {""")
before("    for (const rd of this.ragdolls.slice()) {                          // punt corpses across the room",
"""    for (const q of this.eprojList) {                                  // rockets and bombs go back where they came from
      if (!q.active || !inBox(q.x, q.y, 10)) continue;
      const x = q.x, y = q.y; q.disableBody(true, true); q.glow.setVisible(false); hit = true;
      let target = null, bd = 520;
      for (const e of this.enemies.getChildren()) { if (!e.alive) continue; const d = Math.hypot(e.body.center.x - x, e.body.center.y - y); if (d < bd && this.los(x, y, e.body.center.x, e.body.center.y)) { bd = d; target = e; } }
      this.spawnRocket(x, y, target ? Math.atan2(target.body.center.y - y, target.body.center.x - x) : (f > 0 ? 0 : Math.PI));
      BUS.emit('callout', 'RETURN TO SENDER'); BUS.emit('flash', 0.22);
      this.slowmoUntil = Math.max(this.slowmoUntil, now + 350); this.hitStop(90); Sfx.clang(); Sfx.ding(); this.addStyle(120);
    }
    for (let ty = Math.floor(yt / TS); ty <= Math.floor((p.y + 6) / TS); ty++) for (let tx = Math.floor(xl / TS); tx <= Math.floor(xr / TS); tx++) {
      const c = this.tileAt(tx, ty); if (c === 'x' || c === 'g') { this.damageTile(tx, ty, 18); hit = true; }   // boots dent crates
    }
""")
rep("if (!['boss', 'drone', 'mender', 'bulwark'].includes(e.kind))", "if (!['boss', 'drone', 'mender', 'bulwark', 'rammer', 'wasp'].includes(e.kind))")
rep("""      this.damageBarrel(k, 50, 0.12); k.body.velocity.x += Math.sign(k.x - x || 1) * 140; k.body.velocity.y -= 120;
    }
""", """      this.damageBarrel(k, 50, 0.12); k.body.velocity.x += Math.sign(k.x - x || 1) * 140; k.body.velocity.y -= 120;
    }
    this.blastTiles(x, y, R, W.tileDamage ?? W.maxDamage ?? 40);       // and the scenery
""")
rep("""  spawnGrenade(x, y, a) {
    const g = this.grenades.getFirstDead(false); if (!g) return;
    const W = TUNE.GRENADE;
    g.enableBody(true, x, y, true, true);
    g.body.setSize(6, 6, true); g.body.setAllowGravity(true); g.body.setBounce(W.bounce, W.bounce);
    g.setVelocity(Math.cos(a) * W.speed + this.player.body.velocity.x * 0.3, Math.sin(a) * W.speed - W.lift);   // lobbed, inherits some run speed
    g.body.setAngularVelocity(rand(500, 900) * (Math.cos(a) >= 0 ? 1 : -1));
    Object.assign(g, { fuse: W.fuse, blinkT: 0, blinkOn: false, prevV: 0 });
    g.glow.setVisible(true).setPosition(x, y);
  }""", """  spawnGrenade(x, y, a, kind = 'grenade') {                        // kind: grenade | cluster (mortar shell) | bomb (bomblet)
    const g = this.grenades.getFirstDead(false); if (!g) return null;
    const W = TUNE.GRENADE, C = TUNE.CLUSTER, cl = kind === 'cluster', sp = cl ? C.speed : W.speed;
    g.setTexture(cl ? 'cshell' : kind === 'bomb' ? 'bomblet' : 'grenade');
    g.enableBody(true, x, y, true, true);
    g.body.setSize(6, 6, true); g.body.setAllowGravity(true); g.body.setBounce(cl ? 0.2 : W.bounce, cl ? 0.2 : W.bounce);
    g.setVelocity(Math.cos(a) * sp + this.player.body.velocity.x * 0.3, Math.sin(a) * sp - (cl ? C.lift : W.lift));   // lobbed, inherits some run speed
    g.body.setAngularVelocity(rand(500, 900) * (Math.cos(a) >= 0 ? 1 : -1));
    Object.assign(g, { fuse: cl ? 4 : kind === 'bomb' ? rand(0.35, 0.8) : W.fuse, blinkT: 0, blinkOn: false, prevV: 0, gk: kind, age: 0 });
    g.glow.setVisible(true).setPosition(x, y).setTint(cl ? 0xffc040 : 0xff3020);
    return g;
  }""")
rep("""  detonate(g) {
    const x = g.x, y = g.y;
    g.disableBody(true, true); g.glow.setVisible(false);
    this.explode(x, y, TUNE.GRENADE);
  }""", """  detonate(g) {
    const x = g.x, y = g.y, k = g.gk, vx = g.body.velocity.x, vy = g.body.velocity.y;
    g.disableBody(true, true); g.glow.setVisible(false);
    if (k === 'cluster') { this.clusterBurst(x, y, vx, vy); return; }
    this.explode(x, y, k === 'bomb' ? TUNE.CLUSTER.bomb : TUNE.GRENADE);
  }""")
after("    this.fxDust(b.center.x, y, 16);\n", "    this.blastTiles(b.center.x, y + 4, 44, 70);                         // slams cave in gratings and girders\n")
after("    this.shake(220, 0.01); Sfx.stomp();\n", "    this.blastTiles(b.center.x, b.bottom + 4, 22, 22);\n")

# ---------------------------------------------------------------- damage / AI hooks
rep("  damageEnemy(e, dmg, dx, dy, src, hs) {\n    if (!e.alive) return;\n",
"""  damageEnemy(e, dmg, dx, dy, src, hs) {
    if (!e.alive) return;
    if (e.kind === 'rammer') {                                          // ram plate soaks frontal fire; dizzy = wide open
      if (e.ai === 'dizzy') dmg *= 2;
      else if (dx && Math.sign(dx) === -e.dir && !['rocket', 'burn', 'flame', 'crush'].includes(src)) {
        dmg *= 0.4;
        if (Math.random() < 0.5) { this.fxSparks(e.body.center.x + e.dir * 12, e.body.center.y - 2, 3, e.dir > 0 ? 0 : Math.PI, 1.4, [60, 180]); Sfx.clang(0.4); }
      }
    }
""")
rep("src !== 'rocket' && src !== 'tickboom' && -e.hp <= 26;", "src !== 'rocket' && src !== 'tickboom' && src !== 'crush' && -e.hp <= 26;")
rep("this.spawnGib(e.kind === 'sniper' ? 'icon_sniper' : 'icon_rifle',", "this.spawnGib(e.kind === 'sniper' ? 'icon_sniper' : e.kind === 'rocketeer' ? 'icon_rlaunch' : 'icon_rifle',")
after("    if (e.kind === 'tick') { if (e.armT <= 0 && e.kickedT <= 0) { e.armT = TUNE.TICK.fuse / 1000; Sfx.chirp(); } return; }   // ticks don't bite, they blow\n",
      "    if (e.kind === 'rammer' && e.ai === 'charge') return;               // the charge deals its own hits\n")
after("      else if (e.kind === 'boss') this.updateBoss(e, dt, now, dx, dy, dist, alive);\n",
      "      else if (e.kind === 'wasp') this.updateWasp(e, dt, now, dx, dy, dist, alive);\n      else if (e.kind === 'rammer') this.updateRammer(e, dt, now, dx, dy, dist, alive);\n")
rep("if (e.kind !== 'drone') { e.ai = 'alert';", "if (e.kind !== 'drone' && e.kind !== 'wasp') { e.ai = 'alert';")
rep("      move = e.kind === 'enforcer' ? this.thinkEnforcer(e, dt, now, c)", "      move = e.kind === 'rocketeer' ? this.thinkRocketeer(e, dt, now, c) : e.kind === 'enforcer' ? this.thinkEnforcer(e, dt, now, c)")
rep("e.ai = { enforcer: 'engage', stalker: 'hunt', bulwark: 'advance', sniper: 'engage' }[e.kind];", "e.ai = { enforcer: 'engage', stalker: 'hunt', bulwark: 'advance', sniper: 'engage', rocketeer: 'engage' }[e.kind];")

# ---------------------------------------------------------------- visuals
rep("        const sn = e.kind === 'sniper', sx = e.x + (e.dir > 0 ? 0 : -1), sy = e.y - 2, ca = Math.cos(e.aimA), sa = Math.sin(e.aimA);",
    "        const sn = e.kind === 'sniper', rk = e.kind === 'rocketeer', sx = e.x + (e.dir > 0 ? 0 : -1), sy = e.y - 2, ca = Math.cos(e.aimA), sa = Math.sin(e.aimA);")
rep("        e.glow.setPosition(e.x + e.dir * 4, e.y - 7).setScale(sn && e.ai === 'aim' ? 0.6 : 0.3);",
    "        e.glow.setPosition(e.x + e.dir * 4, e.y - 7).setScale((sn || rk) && e.ai === 'aim' ? 0.6 : 0.3);")
rep("          const ms = sn ? TUNE.SNIPER.aimMs : TUNE.ENFORCER.aimMs, lock = sn ? TUNE.SNIPER.lockAt : 0.7, len = sn ? 31 : 21;",
    "          const ms = sn ? TUNE.SNIPER.aimMs : rk ? TUNE.ROCKETEER.aimMs : TUNE.ENFORCER.aimMs, lock = sn ? TUNE.SNIPER.lockAt : rk ? TUNE.ROCKETEER.lockAt : 0.7, len = sn ? 31 : rk ? 22 : 21;")
rep("          const col = sn ? (locked ? 0xd0f4ff : 0x40a0ff) : (locked ? 0xff9090 : 0xff2020);",
    "          const col = sn ? (locked ? 0xd0f4ff : 0x40a0ff) : rk ? (locked ? 0xffe080 : 0xff8a20) : (locked ? 0xff9090 : 0xff2020);")
before("      if (e.kind === 'boss') {\n        const hot = e.ai === 'mortarWind'",
"""      if (e.kind === 'wasp') {
        e.glow.setPosition(e.x + e.dir * 8, e.y).setScale(e.ai === 'run' ? 0.7 : 0.45);
        e.thr.setPosition(e.x - e.dir * 2, e.y - 6).setAlpha(0.2 + Math.random() * 0.25);   // wing shimmer
        if (e.ai === 'run' && e.bombs > 0) {                            // bomb sight: blinking line to the ground
          let ey = e.body.bottom + 2; while (ey < e.y + 260 && !this.standAt(e.x, ey)) ey += 4;
          const a = Math.floor(now / 60) % 2 ? 0.75 : 0.3;
          this.laserG.lineStyle(1, 0xff3020, a).lineBetween(e.x, e.body.bottom + 2, e.x, ey);
          this.laserG.fillStyle(0xff3020, a).fillRect(e.x - 3, ey - 1, 7, 2);
        }
        continue;
      }
      if (e.kind === 'rammer') {
        const hot = e.ai === 'wind' || e.ai === 'charge';
        e.glow.setPosition(e.x + e.dir * 8, e.y - 2).setScale(hot ? 0.8 + Math.sin(now / 30) * 0.15 : 0.4).setTint(e.ai === 'dizzy' ? 0xffe14a : 0xff3b1f);
        continue;
      }
""")
after("    for (const r of this.rocketList) if (r.active) r.glow.setPosition(r.x, r.y);\n",
      "    for (const q of this.eprojList) if (q.active) q.glow.setPosition(q.x, q.y).setAlpha(q.pk === 'bomb' ? (Math.floor(now / 70) % 2 ? 0.9 : 0.3) : 0.75);\n")
after("      this.gun.scaleY = ca < 0 ? -1 : 1;                              // mirror around the shoulder pivot\n",
"""      if (WEAPONS[this.weapon].id === 'mini') {                       // spinning barrels + heat glow
        const key = this.spin > 0.05 && Math.floor(now / (70 - 50 * this.spin)) % 2 ? 'gun_mini2' : 'gun_mini';
        if (this.gun.texture.key !== key) this.gun.setTexture(key);
        this.gun.setTint((255 << 16) | (Math.round(255 - 110 * this.heat) << 8) | Math.round(255 - 170 * this.heat)); this.gunTinted = true;
      } else if (this.gunTinted) { this.gun.clearTint(); this.gunTinted = false; }
""")
rep("""      if (k.taken) continue;
      k.img.y = k.y + Math.round(Math.sin(now / 280 + k.ph) * 2);""",
"""      if (k.taken) continue;
      if (!this.standAt(k.x, k.y + 9)) { k.vy = (k.vy || 0) + 700 * dt; k.y += k.vy * dt; k.glow.y = k.y; }   // its shelf got blown away
      else if (k.vy) { k.y = Math.floor((k.y + 9) / TS) * TS - 8; k.vy = 0; k.glow.y = k.y; }
      k.img.y = k.y + Math.round(Math.sin(now / 280 + k.ph) * 2);""")

# ---------------------------------------------------------------- HUD
rep("{ text: String(i + 1), align: 'left', scale: 2, color: '#ffffff', shadow }", "{ text: i < 9 ? String(i + 1) : i === 9 ? '0' : '-', align: 'left', scale: 2, color: '#ffffff', shadow }")
rep("this.lblWeapon = new PixelLabel(this, 26, 142, 'hud_wname', { maxChars: 12,", "this.lblWeapon = new PixelLabel(this, 26, 142, 'hud_wname', { maxChars: 16,")

# ---------------------------------------------------------------- new methods
before("  // ------------------------------------------------------------------ waves ----\n", SCENE)

open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok', len(s))
