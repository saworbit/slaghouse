import sys
SP = sys.argv[1]
p = sys.argv[2]
s = open(p, encoding='utf-8').read()
parts = open(SP + 'rag_parts.js', encoding='utf-8').read()
scene = open(SP + 'rag_scene.js', encoding='utf-8').read()

def rep(a, b, cnt=1):
    global s
    assert s.count(a) == cnt, (s.count(a), a[:80])
    s = s.replace(a, b)

rep("function drawRifle(ctx, arm) {", parts + "function drawRifle(ctx, arm) {")
rep("  addSheet(scene, 'bulwark', bwf, 22, 24, true);\n", "  addSheet(scene, 'bulwark', bwf, 22, 24, true);\n  buildRagParts(scene);\n")
rep("  // ------------------------------------------------------------------ waves ----\n", scene + "  // ------------------------------------------------------------------ waves ----\n")
rep("this.boss = null; this.camFocus = null; this.puddles = []; this.shockwaves = [];",
    "this.boss = null; this.camFocus = null; this.puddles = []; this.shockwaves = []; this.ragdolls = [];")
rep("    this.updateGibs(dt, now);\n", "    this.updateGibs(dt, now);\n    this.updateRagdolls(dt, now);\n")

# --- killEnemy
rep("""    this.style.lastWeapon = wid;
    if (D.head) {                                                     // heads: popped clean off on a headshot kill
      if (e.lastHs) {
        this.spawnGib(D.head, cx, b.top, dx * 80 + rand(-40, 40), -rand(380, 470));
        this.fountains.push({ x: cx, y: b.top + 3, t: 0.75 });""",
"""    this.style.lastWeapon = wid;
    // little overkill and no blast: it drops as a ragdoll you can keep shooting; otherwise it bursts now
    const rag = !!RAG[e.kind] && src !== 'rocket' && src !== 'tickboom' && -e.hp <= (e.kind === 'heavy' ? 45 : 26);
    const rd = rag ? this.spawnRagdoll(e, dx, dy, src, !!(D.head && e.lastHs)) : null;
    if (D.head) {                                                     // heads: popped clean off on a headshot kill
      if (e.lastHs) {
        this.spawnGib(D.head, cx, b.top, dx * 80 + rand(-40, 40), -rand(380, 470));
        this.fountains.push(rd ? { rd, t: 1.4 } : { x: cx, y: b.top + 3, t: 0.75 });""")
rep("      } else this.spawnGib(D.head, cx, cy - 4, dx * 120 + rand(-80, 80), -rand(160, 300));",
    "      } else if (!rag) this.spawnGib(D.head, cx, cy - 4, dx * 120 + rand(-80, 80), -rand(160, 300));")
rep("    if (Math.hypot(this.player.x - cx, this.player.y - cy) < 70) BUS.emit('splat', src === 'rocket' ? 6 : 3);",
    "    if (!rag && Math.hypot(this.player.x - cx, this.player.y - cy) < 70) BUS.emit('splat', src === 'rocket' ? 6 : 3);")
rep("    const n = randi(D.gibN[0], D.gibN[1]) + (src === 'rocket' ? 4 : 0), spread",
    "    const n = rag ? 0 : randi(D.gibN[0], D.gibN[1]) + (src === 'rocket' ? 4 : 0), spread")
rep("    this.fxBlood(cx, cy, Math.round(38 * power), -Math.PI / 2, Math.PI * 2, [60, 300]);",
    "    this.fxBlood(cx, cy, Math.round((rag ? 10 : 38) * power), -Math.PI / 2, Math.PI * 2, [60, 300]);")
rep("    this.paintSplatAround(cx, b.bottom - 2, 10 + 6 * power);\n    Sfx.gib(power);",
    "    this.paintSplatAround(cx, b.bottom - 2, rag ? 4 : 10 + 6 * power);\n    if (rag) { Sfx.squish(); Sfx.land(0.5); } else Sfx.gib(power);")
rep("    this.spawnLight(e.x, e.y, e.def.key + '_w', 0xffffff, 1, 1.8, 0.9, 0.14, e.fr, e.flipX);",
    "    if (!rag) this.spawnLight(e.x, e.y, e.def.key + '_w', 0xffffff, 1, 1.8, 0.9, 0.14, e.fr, e.flipX);")

# --- fountains follow the ragdoll's neck
rep("""      const f = this.fountains[i]; f.t -= dt;
      if (f.t <= 0) { this.fountains.splice(i, 1); continue; }
      this.fxBlood(f.x, f.y, 3, -Math.PI / 2, 0.7, [120, 260 * Math.min(1, f.t + 0.3)]);""",
"""      const f = this.fountains[i]; f.t -= dt;
      if (f.t <= 0 || (f.rd && f.rd.gone)) { this.fountains.splice(i, 1); continue; }
      if (f.rd) { const N = f.rd.pts[1], Pv = f.rd.pts[2]; this.fxBlood(N.x, N.y, 2, Math.atan2(N.y - Pv.y, N.x - Pv.x), 0.5, [90, 220 * Math.min(1, f.t + 0.3)]); continue; }   // spurts from the ragdoll's neck
      this.fxBlood(f.x, f.y, 3, -Math.PI / 2, 0.7, [120, 260 * Math.min(1, f.t + 0.3)]);""")

# --- bullets & saws
rep("""      if (hit) { this.bulletImpact(b, hit); b.disableBody(true, true); continue; }
      const tc = b.kind === 'nail'""",
"""      if (hit) { this.bulletImpact(b, hit); b.disableBody(true, true); continue; }
      const rh = this.ragSweep(b.px, b.py, b.x, b.y, 0.5);
      if (rh) { this.hitRagdoll(rh.rd, rh.x, rh.y, b.dmg, Math.cos(b.ang), Math.sin(b.ang), b.kind, rh.pi); b.disableBody(true, true); continue; }
      const tc = b.kind === 'nail'""")
rep("""      if (s.bloody > 0) { s.bloody -= dt;""",
"""      const sh = this.ragdolls.length ? this.ragAt(s.x, s.y, 4) : null;
      if (sh && !((s.hitMap.get(sh.rd) || 0) > this.time.now)) {          // saws carve corpses too
        s.hitMap.set(sh.rd, this.time.now + 220);
        const vx = s.body.velocity.x, vy = s.body.velocity.y, sp = Math.hypot(vx, vy) || 1;
        this.fxBlood(s.x, s.y, 8, Math.atan2(vy, vx), 1.4, [80, 260]); s.bloody = 1;
        this.hitRagdoll(sh.rd, s.x, s.y, TUNE.SAW.damage, vx / sp, vy / sp, 'saw', sh.pi);
      }
      if (s.bloody > 0) { s.bloody -= dt;""")

# --- rail
rep("    const W = TUNE.RAIL, ca = Math.cos(a), sa = Math.sin(a), hits = [], kegs = [];",
    "    const W = TUNE.RAIL, ca = Math.cos(a), sa = Math.sin(a), hits = [], kegs = [], rhits = [];")
rep("""      for (const k of this.barrelList) if (k.active && !kegs.includes(k) && Math.abs(k.x - x) < 6 && Math.abs(k.y - y) < 8) kegs.push(k);
    }
    kegs.forEach(k => this.damageBarrel(k, W.damage));""",
"""      for (const k of this.barrelList) if (k.active && !kegs.includes(k) && Math.abs(k.x - x) < 6 && Math.abs(k.y - y) < 8) kegs.push(k);
      const rh = this.ragdolls.length ? this.ragAt(x, y, 1) : null;
      if (rh && !rhits.some(h => h.rd === rh.rd)) rhits.push(rh);
    }
    kegs.forEach(k => this.damageBarrel(k, W.damage));
    for (const h of rhits) { this.fxBlood(h.x, h.y, 8, a, 0.6, [120, 320]); this.hitRagdoll(h.rd, h.x, h.y, W.damage, ca, sa, 'rail', h.pi); }""")

# --- arc: the beam grounds out in a corpse
rep("""      if (keg) { this.damageBarrel(keg, W.damage); break; }
      if (hitE) break;""",
"""      if (keg) { this.damageBarrel(keg, W.damage); break; }
      if (hitE) break;
      const rh = this.ragdolls.length ? this.ragAt(x, y, 1) : null;
      if (rh) { this.hitRagdoll(rh.rd, x, y, W.damage, ca, sa, 'arc', rh.pi); break; }""")

# --- flame
rep("""    for (const k of this.barrelList) if (k.active && inCone(k.x, k.y, 6)) this.igniteBarrel(k);
    if (hitAny) this.stats.hits++;""",
"""    for (const k of this.barrelList) if (k.active && inCone(k.x, k.y, 6)) this.igniteBarrel(k);
    for (const rd of this.ragdolls.slice()) { const c = rd.pts[2]; if (inCone(c.x, c.y, 6)) { rd.burnT = Math.max(rd.burnT, W.burn); this.hitRagdoll(rd, c.x, c.y, W.damage, Math.cos(a), Math.sin(a), 'flame', 2); } }
    if (hitAny) this.stats.hits++;""")

# --- explosions
rep("""    if (damaged && byPlayer) this.stats.hits++;
    for (const k of this.barrelList)""",
"""    if (damaged && byPlayer) this.stats.hits++;
    for (const { rd, f } of this.pushRagdolls(x, y, R + 6, 470, 300)) {  // corpses fly, and mostly burst
      const c = rd.pts[2];
      if (W.burn) rd.burnT = Math.max(rd.burnT, W.burn);
      this.hitRagdoll(rd, c.x, c.y, (W.enemyDamage ?? W.maxDamage) * (0.35 + 0.9 * f), Math.sign(c.x - x) || 1, -0.6, 'blast');
    }
    for (const k of this.barrelList)""")

# --- singularity pull
rep("""      if (this.state !== 'dead') pull(this.player.body, 500, 200);""",
"""      if (this.state !== 'dead') pull(this.player.body, 500, 200);
      for (const rd of this.ragdolls) for (const p of rd.pts) {             // corpses get dragged in by the limbs
        const dx = cx - p.x, dy = cy - p.y, d = Math.hypot(dx, dy);
        if (d > R || d < 3) continue;
        const f = (1 - d / R) * 2400 * dt; p.vx = clamp(p.vx + dx / d * f, -420, 420); p.vy = clamp(p.vy + dy / d * f, -420, 420); rd.asleep = false; rd.stillT = 0;
      }""")

# --- kick
rep("""    for (const k of this.barrelList) if (k.active && inBox(k.x, k.y, 6)) { k.body.velocity.x = f * 380; k.body.velocity.y = -220; k.kicked = true; hit = true; }""",
"""    for (const k of this.barrelList) if (k.active && inBox(k.x, k.y, 6)) { k.body.velocity.x = f * 380; k.body.velocity.y = -220; k.kicked = true; hit = true; }
    for (const rd of this.ragdolls.slice()) {                          // punt corpses across the room
      if (!rd.pts.some(q => inBox(q.x, q.y, 3))) continue;
      for (const q of rd.pts) { q.vx = f * K.push * rand(0.85, 1.15); q.vy = -rand(190, 290); }
      const c = rd.pts[2]; hit = true;
      this.hitRagdoll(rd, c.x, c.y, 12, f, -0.3, 'kick', 2);
    }""")

# --- boss shockwaves toss corpses
rep("""      if (Math.random() < 0.5) this.fxDust(w.x, w.y, 1);
      if (!w.hit && alive""",
"""      if (Math.random() < 0.5) this.fxDust(w.x, w.y, 1);
      for (const rd of this.ragdolls) for (const q of rd.pts) if (q.gr && Math.abs(q.x - w.x) < 7 && Math.abs(q.y + q.r - w.y) < 6) { q.vy = -rand(200, 280); q.vx += w.dir * 90; rd.asleep = false; rd.stillT = 0; }
      if (!w.hit && alive""")

open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok', len(s))
