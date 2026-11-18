// GameScene, continued: the world: terrain, props, gibs and ragdolls, and the arena hazards and machinery (#166).
// Plain methods added to the class after it, so src/join.mjs stays a concatenation: game.js must come first.
Object.assign(GameScene.prototype, {

  // ----------------------------------------------------------------- barrels ----
  damageBarrel(k, dmg, fuseCap) {
    if (!k.active) return;
    k.hp -= dmg;
    this.fxSparks(k.x, k.y - 4, 3, -Math.PI / 2, 2, [40, 140]);
    if (k.hp <= 0) k.fuse = k.fuse > 0 ? Math.min(k.fuse, fuseCap || 0.06) : (fuseCap || 0.06);
    else if (k.hp <= TUNE.BARREL.hp / 2) this.igniteBarrel(k);
  },
  igniteBarrel(k) { if (!k.burning) { k.burning = true; k.fuse = k.fuse > 0 ? Math.min(k.fuse, 1.4) : 1.4; Sfx.ignite(); } },
  explodeBarrel(k) {
    const x = k.x, y = k.y; k.disableBody(true, true);
    for (let i = 0; i < 4; i++) this.spawnGib('g_barrel', x, y, rand(-220, 220), rand(-340, -140), 'metal');
    if (k.byFoe) { k.byFoe = false; this.explode(x, y, BARREL_FOE); return; }   // a foe set it off: a hostile blast, and no style for you
    this.explode(x, y, TUNE.BARREL);
    this.addStyle(20);
  },
  updateBarrels(dt) {
    for (const k of this.barrelList) {
      if (!k.active) continue;
      const b = k.body, sp = Math.abs(b.velocity.x) + Math.abs(b.velocity.y);
      if (k.kicked && k.prevV > 150 && (b.blocked.left || b.blocked.right || b.blocked.up || b.blocked.down)) { this.explodeBarrel(k); continue; }   // punted drums go off on impact
      if (k.kicked && sp < 20 && b.blocked.down) k.kicked = false;
      k.prevV = sp;
      if (k.burning && Math.random() < 0.6) this.fx.emit(k.x + rand(-3, 3), k.y - 7, { n: 1, angle: -Math.PI / 2, spread: 0.6, speed: [20, 60], life: [0.2, 0.45], size: [4, 1], cols: [0xffffff, 0xffe46a, 0xff8a1f, 0xc03010], add: true, g: -40 });
      if (k.fuse > 0) {
        k.fuse -= dt;
        if (k.fuse < 0.6) { if (Math.floor(k.fuse * 16) % 2) k.setTint(0xffe060); else k.clearTint(); }
        if (k.fuse <= 0) this.explodeBarrel(k);
      }
    }
  },

  // ------------------------------------------------------------ boss hazards ----
  updateHazards(dt, now) {
    const pb = this.player.body, alive = this.state !== 'dead';
    for (const s of this.slagList) {
      if (!s.active) continue;
      s.glow.setPosition(s.x, s.y);
      if (Math.random() < 0.7) this.fx.emit(s.x, s.y, { n: 1, speed: [0, 15], life: [0.2, 0.4], size: [3, 1], cols: [0xffe080, 0xff8a20, 0xc03010], add: true, g: -30 });
      const hit = this.sweep(s.px, s.py, s.x, s.y);
      if (hit || (s.body.velocity.y > 0 && this.standAt(s.x, s.y + 3))) { this.slagImpact(hit ? hit.x : s.x, hit ? hit.y : s.y, s.rain); s.disableBody(true, true); s.glow.setVisible(false); continue; }
      s.px = s.x; s.py = s.y;
    }
    // A wreck or firebomb can land after the clear and leave a new patch: the fire suppression gets that one too.
    if (this.campaign && !this.enemiesLeft && this.puddles.length) this.dousePuddles();
    for (let i = this.puddles.length - 1; i >= 0; i--) {              // molten puddles: burn whoever stands in them
      const P = this.puddles[i]; P.t -= dt;
      if (P.t <= 0) { this.puddles.splice(i, 1); continue; }
      for (let k = P.tar ? 3 : 1; k > 0; k--) if (Math.random() < 0.8) this.fx.emit(P.x + rand(-P.w / 2, P.w / 2), P.y - 1, { n: 1, angle: -Math.PI / 2, spread: 0.5, speed: [20, 60], life: [0.2, 0.5], size: [4, 1], cols: [0xffffff, 0xffe46a, 0xff8a1f, 0xc03010], add: true, g: -40 });
      if (P.tar && Math.random() < 0.25) this.fx.emit(P.x + rand(-P.w / 2, P.w / 2), P.y - 6, { n: 1, angle: -Math.PI / 2, spread: 0.3, speed: [20, 50], life: [0.8, 1.6], size: [4, 10], cols: [0x2a2420, 0x1a1614, 0x0e0c0a], alpha: [0.55, 0], g: -50, drag: 1.2, jitter: 3 });   // burning tar: thick black smoke
      P.tick -= dt;
      if (P.tick <= 0) {
        P.tick = 0.35;
        for (const rd of this.ragdolls) if (Math.abs(rd.pts[2].x - P.x) < P.w / 2 && Math.abs(rd.pts[2].y - P.y) < 12) rd.burnT = Math.max(rd.burnT, 2);   // corpses catch too
        if (alive && Math.abs(pb.center.x - P.x) < P.w / 2 + 5 && Math.abs(pb.bottom - P.y) < 6) this.hurtFromHazardContact(7, P.x, { burn: true, srcY: P.y + 8 });
        for (const e of this.enemies.getChildren()) if (e.alive && !e.def.slagproof && Math.abs(e.body.center.x - P.x) < P.w / 2 + 4 && Math.abs(e.body.bottom - P.y) < 6) this.ignite(e, 1.5);
      }
    }
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {           // slam waves run along the floor: jump them
      const w = this.shockwaves[i]; w.t -= dt; w.x += w.dir * 240 * dt;
      if (w.t <= 0 || !this.standAt(w.x + w.dir * 6, w.y + 2) || this.solidAt(w.x + w.dir * 6, w.y - 6)) { this.shockwaves.splice(i, 1); continue; }
      this.fx.emit(w.x, w.y - 2, { n: 2, angle: -Math.PI / 2, spread: 0.5, speed: [60, 160], life: [0.2, 0.4], size: [4, 1], cols: [0xffffff, 0xffe46a, 0xff8a1f, 0xc03010], add: true, g: 300 });
      if (Math.random() < 0.5) this.fxDust(w.x, w.y, 1);
      for (const rd of this.ragdolls) for (const q of rd.pts) if (q.gr && Math.abs(q.x - w.x) < 7 && Math.abs(q.y + q.r - w.y) < 6) { q.vy = -rand(200, 280); q.vx += w.dir * 90; rd.asleep = false; rd.stillT = 0; }
      if (!w.hit && alive && Math.abs(pb.center.x - w.x) < 10 && pb.bottom > w.y - 18 && pb.bottom <= w.y + 4) { w.hit = true; this.hurtPlayer(20, w.x - w.dir * 10); }
    }
  },
  // The campaign's fire suppression: when an operation ends, a spray from overhead puts out every burning patch
  // and it steams out. Only the look: the patches are gone at once, as before. only: just the patches it picks.
  dousePuddles(only) {
    let n = 0;
    for (const P of this.puddles) {
      if (only && !only(P)) continue;
      n++;
      for (let x = P.x - P.w / 2 + 3; x < P.x + P.w / 2; x += 7) {
        this.cfx.emit(x, P.y - 70, { n: 2, angle: Math.PI / 2, spread: 0.12, speed: [130, 190], life: [0.35, 0.5], size: [1, 1], cols: [0xd8f4ff, 0x7ac4dc], g: 500, mode: 1, cosmetic: true });
        this.cfx.emit(x, P.y - 2, { n: 1, angle: -Math.PI / 2, spread: 0.9, speed: [15, 45], life: [0.7, 1.3], size: [3, 9], cols: [0xeef6f8, 0xb8ccd4], alpha: [0.5, 0], g: -40, cosmetic: true });
      }
    }
    if (n) { Sfx.hiss(); this.time.delayedCall(200, () => Sfx.steam()); }
    if (only) this.puddles = this.puddles.filter(P => !only(P)); else this.puddles.length = 0;
  },
  slagImpact(x, y, rain) {                                              // rain burns and shoves but leaves floors and drums alone, so a shower can't dig you into a pit
    this.explode(x, y, rain ? this.rainBlast || (this.rainBlast = { ...TUNE.BOSS.slag, tileDamage: 0, drums: false }) : TUNE.BOSS.slag);
    if (rain && this.campaign && this.mod !== 'slag') return;           // the impact itself can clear the squad and end the rain
    for (let yy = y; yy < y + 40; yy += 2) if (this.standAt(x, yy)) { const sy = Math.floor(yy / TS) * TS, [px, pw] = this.spanOn(x, sy, 34); this.puddles.push({ x: px, y: sy, w: pw, t: 2.6, tick: 0.2, rain }); this.paintScorch(x, sy + 2, 10); break; }
  },
  // ---------------------------------------------------------------- ragdolls ----
  // Walkers killed without much overkill drop as ragdolls: position-based dynamics (points + distance sticks)
  // against the tile grid. Corpses keep soaking hits, blasts, kicks and fire until they burst into gibs.
  spawnRagdoll(e, dx, dy, src, headless) {
    const D = RAG[e.kind], k = e.kind, b = e.body, dir = e.dir < 0 ? -1 : 1, up = D.up;
    const tx = n => this.textures.get(`rg_${k}_${n}`).getSourceImage();
    const T = tx('torso'), H = tx('head'), TH = tx('thigh'), SH = tx('shin'), hasArm = this.textures.exists(`rg_${k}_arm`), AR = hasArm ? tx('arm') : null;
    const torsoLen = up ? T.height - 3 : T.width - 4, thigh = TH.height - 2.5, shin = SH.height - 3;
    const headOff = up ? H.height / 2 - 0.5 : H.width / 2 - 0.5, arm = AR ? AR.height - 3.5 : 0;
    const tR = up ? Math.min(5, T.width / 2 - 1.5) : T.height / 2 - 1.5, hR = Math.max(1.5, Math.min(H.width, H.height) / 2 - 1.5);
    const P = [], add = (x, y, r) => P.push({ x, y, ox: x, oy: y, vx: 0, vy: 0, pvx: 0, pvy: 0, r, gr: false, wasGr: false, wall: 0 });
    const cx = b.center.x;
    if (up) {
      const foot = b.bottom - 1.5, pel = foot - thigh - shin, neck = pel - torsoLen;
      add(cx + dir * 0.5, neck - headOff, hR); add(cx, neck, tR); add(cx, pel, tR);
      add(cx + dir, pel + thigh, 1.5); add(cx + dir * 1.5, foot, 1.5); add(cx - dir, pel + thigh, 1.5); add(cx - dir * 1.5, foot, 1.5);
      if (AR) { add(cx + dir * 2, neck + arm, 1.5); add(cx - dir * 2, neck + arm, 1.5); }
    } else {
      const cy = b.center.y - 1, half = torsoLen / 2;
      add(cx + dir * (half + headOff), cy, hR); add(cx + dir * half, cy, tR); add(cx - dir * half, cy, tR);
      add(cx - dir * half + dir, cy + thigh, 1.5); add(cx - dir * half + dir * 1.5, cy + thigh + shin, 1.5);
      add(cx - dir * half - dir, cy + thigh, 1.5); add(cx - dir * half - dir * 1.5, cy + thigh + shin, 1.5);
    }
    const sticks = [[0, 1, headOff], [1, 2, torsoLen], [2, 3, thigh], [3, 4, shin], [2, 5, thigh], [5, 6, shin]];
    if (AR) sticks.push([1, 7, arm], [1, 8, arm]);
    const mins = [[0, 2, (headOff + torsoLen) * 0.82], [2, 4, (thigh + shin) * 0.55], [2, 6, (thigh + shin) * 0.55], [1, 3, torsoLen * 0.7], [1, 5, torsoLen * 0.7]];
    const segs = [[1, 2, tR], [2, 3, 1.8], [3, 4, 1.8], [2, 5, 1.8], [5, 6, 1.8]];
    if (!headless) segs.push([0, 0, hR + 0.5]);
    if (AR) segs.push([1, 7, 1.6], [1, 8, 1.6]);
    const spine = up ? -Math.PI / 2 : dir > 0 ? 0 : Math.PI, down = Math.PI / 2;
    const parts = [];
    const mk = (tex, a, bb, base, depth, back, at) => {
      const img = this.add.image(0, 0, `rg_${k}_${tex}`).setDepth(depth).setFlipX(dir < 0);
      parts.push({ img, tex: `rg_${k}_${tex}`, a, b: bb, base, back, at });
    };
    if (AR) mk('arm', 1, 8, down, 3.90, true);
    mk('thigh', 2, 5, down, 3.91, true); mk('shin', 5, 6, down, 3.91, true);
    mk(headless ? 'torsoX' : 'torso', 2, 1, spine, 3.95, false);
    if (!headless) mk('head', 1, 0, spine, 3.96, false, true);
    mk('thigh', 2, 3, down, 3.97, false); mk('shin', 3, 4, down, 3.97, false);
    if (AR) mk('arm', 1, 7, down, 3.98, false);
    const imp = ({ nail: 80, pellet: 130, rail: 300, saw: 120, kick: 380, parry: 240, arc: 40, flame: 25, burn: 10, stake: 320 }[src] ?? 90) * clamp(e.def.kb, 0.35, 1.2);
    const vx0 = b.velocity.x * 0.4, vy0 = Math.min(0, b.velocity.y) * 0.5;
    P.forEach((p, i) => {                                               // top-heavy shove: it topples away from the hit
      const s = i <= 1 || i >= 7 ? 1 : i === 2 ? 0.7 : 0.35;
      p.vx = vx0 + dx * imp * s + rand(-25, 25); p.vy = vy0 + dy * imp * s * 0.6 - (i <= 1 ? 30 : 10) + rand(-10, 10);
    });
    const rd = { kind: k, dir, up, pts: P, sticks, mins, segs, parts, headless, hp: D.hp, asleep: false, stillT: 0, fade: 0,
      flashT: 0, burnT: Math.max(0, e.burnT), char: e.burnT > 0 ? 0.35 : 0, bleed: 2.5, bleedT: 0, sndT: 0, twitchT: rand(0.8, 1.8), twNext: 0.25,
      pooled: false, minX: cx, maxX: cx, minY: b.top, maxY: b.bottom, gone: false, tip: Math.sign(dx) || (Math.random() < 0.5 ? -1 : 1), torsoLen };
    rd.from = e; this.lastRag = rd;
    this.ragdolls.push(rd);
    if (this.ragdolls.filter(r => !r.fade).length > 10) { const old = this.ragdolls.find(r => !r.fade); old.fade = 0.9; }
    this.tintRag(rd); this.placeRag(rd);
    if (k === 'bulwark') this.spawnGib('g_shield', cx + dir * 6, b.center.y, dir * rand(60, 140) + dx * 80, -rand(120, 220), 'metal');
    return rd;
  },
  tintRag(rd) {
    const c = rd.char, lerp = (a, b2) => Math.round(a + (b2 - a) * c);
    for (const q of rd.parts) {
      const f = q.back ? 0.66 : 1, r = lerp(255, 96) * f, g = lerp(255, 70) * f, bl = lerp(255, 58) * f;
      q.img.setTexture(q.tex).setTint((Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl));
    }
  },
  placeRag(rd) {
    const P = rd.pts;
    for (const q of rd.parts) {
      const A = P[q.a], B = P[q.b], ang = Math.atan2(B.y - A.y, B.x - A.x);
      if (q.at) q.img.setPosition(B.x, B.y); else q.img.setPosition((A.x + B.x) / 2, (A.y + B.y) / 2);
      q.img.setRotation(ang - q.base);
    }
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const p of P) { if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y; }
    rd.minX = x0; rd.maxX = x1; rd.minY = y0; rd.maxY = y1;
  },
  removeRag(rd) {
    rd.gone = true; rd.parts.forEach(q => q.img.destroy());
    const i = this.ragdolls.indexOf(rd); if (i >= 0) this.ragdolls.splice(i, 1);
  },
  ragStick(a, b, L, minOnly) {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.001;
    if (minOnly && d >= L) return;
    const k = (d - L) / d * (minOnly ? 0.25 : 0.5);
    a.x += dx * k; a.y += dy * k; b.x -= dx * k; b.y -= dy * k;
  },
  ragCollide(p) {
    const r = p.r;
    if (this.solidAt(p.x, p.y + r)) {                                  // floor: only if it came from above
      const top = Math.floor((p.y + r) / TS) * TS;
      if (p.oy + r <= top + 3) { p.y = top - r - 0.01; p.gr = true; }
    } else if (this.solidAt(p.x, p.y - r)) {                           // ceiling
      const bot = (Math.floor((p.y - r) / TS) + 1) * TS;
      if (p.oy - r >= bot - 3) p.y = bot + r + 0.01;
    } else if (p.y > p.oy) {                                           // gratings catch what falls onto them
      const tx = Math.floor(p.x / TS), ty = Math.floor((p.y + r) / TS);
      if (tx >= 0 && tx < MAP_W && ty >= 0 && ty < MAP_H && this.grid[ty][tx] === '=' && p.oy + r <= ty * TS + 0.5) { p.y = ty * TS - r - 0.01; p.gr = true; }
    }
    if (this.solidAt(p.x + r, p.y)) { const left = Math.floor((p.x + r) / TS) * TS; if (p.ox + r <= left + 3) { p.x = left - r - 0.01; p.wall = 1; } }
    else if (this.solidAt(p.x - r, p.y)) { const right = (Math.floor((p.x - r) / TS) + 1) * TS; if (p.ox - r >= right - 3) { p.x = right + r + 0.01; p.wall = -1; } }
    if (this.solidAt(p.x, p.y)) {                                      // shoved inside by a constraint: back out, or climb out
      if (!this.solidAt(p.ox, p.oy)) { p.x = p.ox; p.y = p.oy; }
      else { let n = 0; while (this.solidAt(p.x, p.y) && n++ < 3) p.y = Math.floor(p.y / TS) * TS - r - 0.01; p.oy = p.y; }
    }
  },
  stepRag(rd, dt) {
    const G = this.physics.world.gravity.y * 1.15, P = rd.pts, n = Math.max(1, Math.ceil(dt * 120)), h = dt / n;
    let fast = 0, impact = null, impV = 0, wallHit = null;
    for (let s = 0; s < n; s++) {
      for (const p of P) {
        p.pvx = p.vx; p.pvy = p.vy; p.wasGr = p.gr; p.gr = false; p.wall = 0;
        p.vy += G * h; p.vx *= 1 - 0.35 * h;
        p.ox = p.x; p.oy = p.y; p.x += p.vx * h; p.y += p.vy * h;
      }
      for (let it = 0; it < 4; it++) {
        for (const [a, b, L] of rd.sticks) this.ragStick(P[a], P[b], L, false);
        for (const [a, b, L] of rd.mins) this.ragStick(P[a], P[b], L, true);
        for (const p of P) this.ragCollide(p);
        if (rd.pin) { const q = P[rd.pin.pi]; q.x = rd.pin.x; q.y = rd.pin.y; }   // nailed to the wall
      }
      for (const p of P) {
        p.vx = clamp((p.x - p.ox) / h, -900, 900); p.vy = clamp((p.y - p.oy) / h, -900, 900);
        if (p.gr) {
          p.vx *= Math.max(0, 1 - 11 * h);
          if (!p.wasGr && p.pvy > 170) { if (p.pvy > impV) { impV = p.pvy; impact = p; } if (p.pvy > 320) p.vy = -p.pvy * 0.16; }
        }
        if (p.wall && Math.abs(p.pvx) > 210) { wallHit = p; p.vx = -p.pvx * 0.2; }
      }
      if (rd.pin) { const q = P[rd.pin.pi]; q.vx = 0; q.vy = 0; }
    }
    for (const p of P) fast = Math.max(fast, Math.abs(p.vx) + Math.abs(p.vy));
    return { fast, impact, impV, wallHit };
  },
  updateRagdolls(dt, now) {
    for (let i = this.ragdolls.length - 1; i >= 0; i--) {
      const rd = this.ragdolls[i];
      if (rd.fade > 0) {
        rd.fade -= dt; const a = Math.floor(rd.fade * 12) % 2 ? 0.3 : 0.9;
        rd.parts.forEach(q => q.img.setAlpha(a));
        if (rd.fade <= 0) { this.removeRag(rd); continue; }
      }
      rd.sndT -= dt;
      if (rd.flashT > 0) { rd.flashT -= dt; if (rd.flashT <= 0) this.tintRag(rd); }
      if (rd.burnT > 0) {                                              // smouldering corpse: chars over time
        rd.burnT -= dt; rd.char = Math.min(1, rd.char + dt * 0.35);
        const p = pick(rd.pts);
        if (Math.random() < 0.6) this.fx.emit(p.x, p.y, { n: 1, angle: -Math.PI / 2, spread: 0.6, speed: [20, 55], life: [0.2, 0.45], size: [4, 1], cols: [0xffffff, 0xffe46a, 0xff8a1f, 0xc03010], add: true, g: -40 });
        if (Math.random() < 0.15) this.fxSmoke(p.x, p.y - 2, 1, 0.6);
        if (Math.random() < dt * 4 && rd.flashT <= 0) this.tintRag(rd);
      }
      if (rd.twitchT > 0) {                                            // dying twitches
        rd.twitchT -= dt; rd.twNext -= dt;
        if (rd.twNext <= 0) { rd.twNext = rand(0.18, 0.5); const p = rd.pts[randi(3, rd.pts.length - 1)]; p.vx += rand(-70, 70); p.vy -= rand(30, 90); rd.asleep = false; rd.stillT = 0; }
      }
      if (rd.asleep) continue;
      if (rd.up) {                                                     // corpses don't balance: anything still upright tips over
        const N = rd.pts[1], Pv = rd.pts[2];
        if (N.y < Pv.y && Math.abs(N.x - Pv.x) < rd.torsoLen * 0.6 && (Pv.gr || rd.pts[4].gr || rd.pts[6].gr)) { N.vx += rd.tip * 520 * dt; rd.pts[0].vx += rd.tip * 520 * dt; }
      }
      const r = this.stepRag(rd, dt);
      if (r.impact && rd.sndT <= 0) {                                  // body slaps the floor
        const p = r.impact; rd.sndT = 0.12;
        if (rd.char < 0.9) this.paintSplat(p.x, p.y + p.r + 1, 2 + Math.min(4, r.impV / 90), true);
        this.fxDust(p.x, p.y + p.r, 2);
        Sfx.land(clamp(r.impV / 600, 0.25, 0.8)); if (r.impV > 300) Sfx.squish();
      }
      if (r.wallHit && rd.sndT <= 0) {
        const p = r.wallHit; rd.sndT = 0.12;
        this.paintSplat(p.x + p.wall * (p.r + 1), p.y, 3 + Math.min(3, Math.abs(p.pvx) / 120), false); Sfx.squish();
      }
      if (rd.bleed > 0 && r.fast > 40 && rd.char < 0.8) {             // fresh corpses leak while they tumble
        rd.bleed -= dt; rd.bleedT -= dt;
        if (rd.bleedT <= 0) { rd.bleedT = 0.05; const p = rd.pts[randi(1, 2)]; this.fxBlood(p.x, p.y, 1, 0, Math.PI * 2, [5, 40]); }
      }
      if (r.fast < 9) {
        rd.stillT += dt;
        if (rd.stillT > 0.6 && rd.twitchT <= 0) {
          rd.asleep = true;
          if (!rd.pooled && rd.char < 0.8) { rd.pooled = true; const p = rd.pts[2]; for (let yy = p.y; yy < p.y + 24; yy += 2) if (this.standAt(p.x, yy)) { this.paintSplat(p.x, Math.floor(yy / TS) * TS + 1, 7, true); break; } }
        }
      } else rd.stillT = 0;
      this.placeRag(rd);
    }
  },
  segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy, t = L2 ? clamp(((px - ax) * dx + (py - ay) * dy) / L2, 0, 1) : 0;
    return [Math.hypot(px - ax - dx * t, py - ay - dy * t), t];
  },
  ragAt(x, y, pad = 0) {                                               // corpse piece touching (x, y), if any
    let best = null, bd = 1e9;
    for (const rd of this.ragdolls) {
      if (rd.gone || (rd.fade > 0 && rd.fade < 0.4)) continue;
      if (x < rd.minX - 12 - pad || x > rd.maxX + 12 + pad || y < rd.minY - 12 - pad || y > rd.maxY + 12 + pad) continue;
      for (const [a, b, r] of rd.segs) {
        const A = rd.pts[a], B = rd.pts[b], [d, t] = this.segDist(x, y, A.x, A.y, B.x, B.y);
        if (d < r + pad && d - r < bd) { bd = d - r; best = { rd, pi: t < 0.5 ? a : b, x, y }; }
      }
    }
    return best;
  },
  ragSweep(x0, y0, x1, y1, pad = 0) {                                  // first corpse crossed by a moving shot
    if (!this.ragdolls.length) return null;
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 2));
    for (let i = 1; i <= n; i++) { const h = this.ragAt(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, pad); if (h) return h; }
    return null;
  },
  hitRagdoll(rd, x, y, dmg, ix, iy, src, pi) {
    if (rd.gone) return;
    const P = rd.pts;
    if (pi === undefined) { let bd = 1e9; P.forEach((p, i) => { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; pi = i; } }); }
    const imp = { nail: 130, pellet: 120, rail: 340, saw: 130, arc: 0, flame: 6, parry: 300, kick: 0, blast: 0 }[src] ?? 110;
    const p = P[pi];
    p.vx += ix * imp; p.vy += iy * imp - imp * 0.3;
    for (const q of P) { q.vx += ix * imp * 0.12; q.vy -= imp * 0.04; }
    if (src === 'arc') for (let i = 0; i < 3; i++) { const q = pick(P); q.vx += rand(-90, 90); q.vy -= rand(20, 110); }   // electrocuted dance
    rd.asleep = false; rd.stillT = 0;
    rd.hp -= dmg * (src === 'flame' ? 0.35 : 1);
    if (rd.pin && dmg >= 30 && src !== 'stake') rd.pin = null;                // big hits tear it off the wall
    if (src !== 'flame' && src !== 'blast') {
      this.fxBlood(x, y, src === 'arc' ? 1 : 4, Math.atan2(iy, ix), 0.9, [50, 190]);
      if (src !== 'arc') this.fxBlood(x, y, 2, Math.atan2(iy, ix) + Math.PI, 1.2, [30, 90]);
      if (rd.sndT <= 0 && src !== 'arc') { rd.sndT = 0.06; Sfx.squish(); }
      if (rd.flashT <= 0 && src !== 'arc') { rd.flashT = 0.05; rd.parts.forEach(q => q.img.setTexture(q.tex + '_w').setTint(0xffffff)); }
    }
    if (rd.hp <= 0) this.gibRagdoll(rd, ix, iy, src);
  },
  gibRagdoll(rd, dx, dy, src) {
    if (rd.gone) return;
    const D = ENEMY[rd.kind], P = rd.pts, c = P[2], n = Math.round(randi(D.gibN[0], D.gibN[1]) * 0.85), pw = src === 'blast' ? 1.5 : 1;
    const list = D.gibs.filter(t => t !== 'g_shield');
    for (let i = 0; i < n; i++) {
      const q = P[i % P.length], tex = i < list.length ? list[i] : pick(list);
      const g = this.spawnGib(tex, q.x + rand(-2, 2), q.y + rand(-2, 2), (dx * rand(60, 220) + rand(-140, 140)) * pw + q.vx * 0.3, (dy * 120 - rand(150, 320)) * pw);
      if (rd.char > 0.5) g.setTint(0x7a5a48);
    }
    if (!rd.headless && D.head) { const hp = P[0]; this.spawnGib(D.head, hp.x, hp.y, dx * 140 + rand(-80, 80), -rand(200, 340)); }
    this.fxBlood(c.x, c.y, 30, -Math.PI / 2, Math.PI * 2, [60, 280]);
    this.fxBlood(c.x, c.y, 10, Math.atan2(dy, dx), 0.8, [150, 360]);
    this.fxMist(c.x, c.y, 8);
    this.paintSplatAround(c.x, c.y, 9);
    if (Math.hypot(this.player.x - c.x, this.player.y - c.y) < 60) BUS.emit('splat', 2);
    Sfx.gib(1); this.shake(90, 0.004); this.hitStop(25);
    this.addStyle(35);
    if (Math.random() < 0.35) BUS.emit('callout', pick(['OVERKILL', 'NO REFUNDS', 'MEAT PASTE']));
    this.removeRag(rd);
  },
  pushRagdolls(x, y, R, force, lift) {                                 // radial shove (blasts); returns ragdolls touched with closest distance
    const out = [];
    for (const rd of this.ragdolls) {
      if (rd.gone) continue;
      let dmin = 1e9; for (const p of rd.pts) dmin = Math.min(dmin, Math.hypot(p.x - x, p.y - y));
      if (dmin >= R) continue;
      const c = rd.pts[2]; if (dmin > 8 && !this.los(x, y, c.x, c.y)) continue;
      for (const p of rd.pts) { const d = Math.hypot(p.x - x, p.y - y) || 1, f = clamp(1 - d / R, 0, 1); p.vx += (p.x - x) / d * force * f; p.vy += ((p.y - y) / d * force * 0.8 - lift) * f; }
      rd.asleep = false; rd.stillT = 0;
      out.push({ rd, f: 1 - dmin / R });
    }
    return out;
  },
  // ------------------------------------------------------------ destructible terrain ----
  // 'x' crates fall when nothing is under them; 'g' girders and '=' gratings hang from their anchors
  // (original ends, or anything bolted to solid metal) and anything more than TUNE.TILE.span tiles out
  // sags off. Blasts, rails, bullets, saws, kicks, the rammer and the boss all chew through them. The few that are
  // the only way up to a solid deck (reinforcedTiles) are reinforced: bolted, striped, blast-proof and never sagging,
  // so no blast can strand a deck and whatever's on it for the rest of the act. The Lab's rooms leave them all loose.
  initTerrain() {
    this.tileHp = new Map(); this.breakZones = []; this.onewayDirty = false; this.navDirtyT = 0; this.stabQ = [];
    this.anchors = new Set(); this.hardPingT = 0;
    for (let ty = 0; ty < MAP_H; ty++) for (let tx = 0; tx < MAP_W; tx++) {
      const c = this.grid[ty][tx];
      if ((c === 'g' || c === '=') && (this.grid[ty][tx - 1] !== c || this.grid[ty][tx + 1] !== c)) this.anchors.add(ty * MAP_W + tx);
    }
    this.hardTiles = this.lab ? new Set() : reinforcedTiles(this.grid, ...this.A.spawns.player);
    for (const k of this.hardTiles) this.paintReinforced(k % MAP_W, Math.floor(k / MAP_W));
    this.rebuildBreakZones();
  },
  paintReinforced(tx, ty) {                                            // steel straps and rivets on a crate, bolts and a hazard edge on a grating or girder
    const L = this.lvlCtx, x = tx * TS, y = ty * TS, c = this.grid[ty][tx], px = (col, a, b, w, h) => { L.fillStyle = col; L.fillRect(a, b, w, h); };
    if (c === 'x') {
      for (const by of [y + 3, y + 11]) { px('#5a6574', x, by, 16, 2); px('#9aa6b4', x, by, 16, 1); for (const rx of [x + 2, x + 13]) px('#d8dee6', rx, by, 1, 1); }
    } else {
      const h = c === '=' ? 6 : 16;
      for (let i = 0; i < 16; i += 2) px(((x + i) >> 1) & 1 ? '#16171a' : '#e8b422', x + i, y + h - 2, 2, 2);
      for (const rx of [x + 2, x + 12]) { px('#2a2e35', rx, y + 1, 3, 3); px('#d8dee6', rx + 1, y + 2, 1, 1); }
    }
    this.lvlMark(x + 8, y + 8, 10);
  },
  breakable(tx, ty) { return !!TILE_HP[this.tileAt(tx, ty)] && !this.hardTiles.has(ty * MAP_W + tx); },
  tileAt(tx, ty) { return tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H ? '#' : this.grid[ty][tx]; },
  rebuildBreakZones() {
    for (const z of this.breakZones) z.destroy();
    this.breakZones = [];
    for (const [ch, rows] of [['x', false], ['g', true]]) for (const r of mergeRects(this.grid, ch, rows)) {
      const z = this.add.zone(r.x * TS + r.w * TS / 2, r.y * TS + r.h * TS / 2, r.w * TS, r.h * TS);
      this.solids.add(z); this.breakZones.push(z);
    }
    this.breakDirty = false;
  },
  rebuildOneways() {
    this.oneways.clear(true, true);
    for (const r of mergeRects(this.grid, '=', true)) {
      const z = this.add.zone(r.x * TS + r.w * TS / 2, r.y * TS + 3, r.w * TS, 6);
      this.oneways.add(z);
      const cc = z.body.checkCollision; cc.down = false; cc.left = false; cc.right = false;
    }
    this.onewayDirty = false;
  },
  rebuildNav() {
    NAV = buildNav(this.grid);
    for (const e of this.enemies.getChildren()) if (e.alive && 'path' in e) { e.path = null; e.pathI = 0; e.goalNode = -1; e.repathT = 0; e.repickT = 0; e.navAir = false; }
  },
  damageTile(tx, ty, dmg) {
    const c = this.tileAt(tx, ty), max = TILE_HP[c]; if (!max || !(dmg > 0)) return false;
    const key = ty * MAP_W + tx;
    if (this.hardTiles.has(key)) {                                      // reinforced: it just rings
      const now = this.time.now;
      if (now > this.hardPingT) { this.hardPingT = now + 120; this.fx.emit(tx * TS + 8, ty * TS + (c === '=' ? 3 : 8), { n: 3, speed: [40, 120], life: [0.1, 0.25], size: [1, 1], cols: [0xffffff, 0xffe080], add: true, g: 300, cosmetic: true }); }
      return false;
    }
    const hp0 = this.tileHp.has(key) ? this.tileHp.get(key) : max, hp = hp0 - dmg;
    if (hp <= 0) { this.destroyTile(tx, ty, true); return true; }
    this.tileHp.set(key, hp);
    if (Math.floor(hp / max * 3) < Math.floor(hp0 / max * 3)) this.crackTile(tx, ty, c);
    return false;
  },
  crackTile(tx, ty, c) {
    const L = this.lvlCtx, x0 = tx * TS, y0 = ty * TS, h = c === '=' ? 6 : 16;
    L.globalCompositeOperation = 'source-atop';
    for (let k = 0; k < 2; k++) {                                       // jagged cracks with a lit lip
      let x = x0 + randi(2, 13), y = y0 + randi(1, h - 2);
      for (let i = 0; i < 9; i++) {
        L.fillStyle = '#0a0806'; L.fillRect(x, y, 1, 1); L.fillStyle = 'rgba(255,200,140,0.35)'; L.fillRect(x + 1, y, 1, 1);
        x += randi(-1, 1); y += pick([-1, 1, 1]);
        if (x < x0 || x > x0 + 15 || y < y0 || y >= y0 + h) break;
      }
    }
    L.globalCompositeOperation = 'source-over'; this.lvlMark(x0 + 8, y0 + 8, 12);
    this.fxDust(x0 + 8, y0 + h / 2, 3);
    this.fx.emit(x0 + 8, y0 + h / 2, { n: 4, speed: [30, 100], life: [0.3, 0.6], size: [2, 1], cols: c === '=' ? [0x7a8695, 0x505a67] : [0x9a5e2e, 0x6e4222], g: 500, mode: 1 });
    Sfx.clunk(0.8);
  },
  destroyTile(tx, ty, fx) {
    const c = this.tileAt(tx, ty); if (!this.breakable(tx, ty)) return;
    this.grid[ty][tx] = '.'; this.tileHp.delete(ty * MAP_W + tx);
    for (const rd of this.ragdolls) if (rd.pin && rd.pin.tile[0] === tx && rd.pin.tile[1] === ty) { rd.pin = null; rd.asleep = false; }   // pinned bodies drop with the wall
    for (const d of this.stakeDecals) if (d.visible && d.tile && d.tile[0] === tx && d.tile[1] === ty) d.setVisible(false);
    const tnow = this.time.now; this.chaosT = this.chaosT.filter(t => tnow - t < 2500); this.chaosT.push(tnow);
    if (this.chaosT.length >= 10 && tnow > this.chaosCd) { this.chaosCd = tnow + 7000; BUS.emit('callout', 'CHAOS!'); this.addStyle(80); }
    if (c === '=') this.onewayDirty = true; else this.breakDirty = true;
    this.navDirtyT = 0.3;
    const L = this.lvlCtx, x = tx * TS, y = ty * TS;
    L.clearRect(x, y, TS, TS);
    L.globalCompositeOperation = 'source-atop';                        // torn, scorched lips on whatever it was bolted to
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      if (this.tileAt(tx + dx, ty + dy) === '.') continue;
      for (let i = 0; i < 16; i++) {
        const d = randi(1, 3);
        for (let j = 0; j < d; j++) {
          const px = dx === -1 ? x - 1 - j : dx === 1 ? x + 16 + j : x + i, py = dy === -1 ? y - 1 - j : dy === 1 ? y + 16 + j : y + i;
          L.fillStyle = j === d - 1 ? '#3a2a20' : '#0b0a09'; L.fillRect(px, py, 1, 1);
        }
      }
    }
    L.globalCompositeOperation = 'source-over'; this.lvlMark(x + 8, y + 8, 14);
    const cx = x + 8, cy = y + (c === '=' ? 3 : 8);
    if (fx) {
      const gibs = c === 'x' ? ['g_plank', 'g_plank2', 'g_plank', 'g_shard'] : c === 'g' ? ['g_beam', 'g_beam', 'g_shard', 'g_shard2'] : ['g_bar', 'g_bar', 'g_shard2'];
      for (let i = 0; i < 5; i++) this.spawnGib(pick(gibs), cx + rand(-5, 5), cy + rand(-4, 4), rand(-170, 170), rand(-280, -60), 'metal');
      this.fxDust(cx, cy, 8); this.fxSmoke(cx, cy, 3, 0.8); this.fxSparks(cx, cy, 6, -Math.PI / 2, Math.PI * 2, [60, 220]);
      Sfx.smash(c); this.shake(70, 0.003);
    }
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) this.stabQ.push(tx + dx, ty + dy);
    this.addStyle(4);
  },
  blastTiles(x, y, R, dmg) {
    const x0 = Math.floor((x - R) / TS), x1 = Math.floor((x + R) / TS), y0 = Math.floor((y - R) / TS), y1 = Math.floor((y + R) / TS);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const c = this.tileAt(tx, ty); if (!TILE_HP[c]) continue;
      const d = Math.max(0, Math.hypot(tx * TS + 8 - x, ty * TS + (c === '=' ? 3 : 8) - y) - 6);
      if (d < R) this.damageTile(tx, ty, dmg * (1.15 - d / R));
    }
  },
  processStability() {
    let guard = 0;
    while (this.stabQ.length && guard++ < 600) {
      const ty = this.stabQ.pop(), tx = this.stabQ.pop(), c = this.tileAt(tx, ty);
      if (c === 'x') { if (this.tileAt(tx, ty + 1) === '.') this.collapseTile(tx, ty); }   // crates need something under them
      else if (c === 'g' || c === '=') this.checkSpan(tx, ty, c);
    }
  },
  checkSpan(tx, ty, c) {
    const D4 = [[-1, 0], [1, 0], [0, -1], [0, 1]], comp = [], seen = new Set([ty * MAP_W + tx]), q = [[tx, ty]];
    while (q.length) {
      const [x, y] = q.pop(); comp.push([x, y]);
      for (const [dx, dy] of D4) { const k = (y + dy) * MAP_W + x + dx; if (!seen.has(k) && this.tileAt(x + dx, y + dy) === c) { seen.add(k); q.push([x + dx, y + dy]); } }
    }
    const dist = new Map(), bq = [];
    for (const [x, y] of comp) {
      const k = y * MAP_W + x;
      if (this.anchors.has(k) || this.hardTiles.has(k) || D4.some(([dx, dy]) => this.tileAt(x + dx, y + dy) === '#')) { dist.set(k, 0); bq.push([x, y]); }
    }
    for (let i = 0; i < bq.length; i++) {
      const [x, y] = bq[i], d = dist.get(y * MAP_W + x);
      for (const [dx, dy] of D4) { const k = (y + dy) * MAP_W + x + dx; if (seen.has(k) && !dist.has(k)) { dist.set(k, d + 1); bq.push([x + dx, y + dy]); } }
    }
    let n = 0;
    for (const [x, y] of comp) { const d = dist.get(y * MAP_W + x); if (d === undefined || d > TUNE.TILE.span) { this.collapseTile(x, y); n++; } }
    if (n) { Sfx.creak(); this.shake(220, 0.005); if (n >= 3) BUS.emit('callout', 'COLLAPSE!'); }
  },
  collapseTile(tx, ty) {                                               // tears loose and drops as a solid block
    const c = this.tileAt(tx, ty); if (!this.breakable(tx, ty)) return;
    this.destroyTile(tx, ty, false);
    const cx = tx * TS + 8, cy = ty * TS + (c === '=' ? 3 : 8);
    this.fxDust(cx, cy, 3);
    const fb = this.fblocks.getFirstDead(false); if (!fb) return;
    fb.setTexture('fb_' + c).enableBody(true, cx, cy, true, true);
    fb.body.setSize(14, c === '=' ? 5 : 14, true); fb.body.setAllowGravity(true);
    fb.setVelocity(rand(-25, 25), rand(-40, 0)); fb.setRotation(0); fb.body.setAngularVelocity(rand(-140, 140));
    Object.assign(fb, { kind: c, t: 0, hits: new Set(), hitP: false });
  },
  updateFallingBlocks(dt) {
    for (const fb of this.fblockList) {
      if (!fb.active) continue;
      fb.t += dt;
      const vy = fb.body.velocity.y, hh = fb.kind === '=' ? 3 : 7;
      if (vy > 140) {                                                   // anything under it gets flattened
        for (const e of this.enemies.getChildren()) {
          if (!e.alive || fb.hits.has(e) || e.def.anchored) continue;
          const eb = e.body;
          if (fb.x + 7 > eb.left && fb.x - 7 < eb.right && fb.y + hh > eb.top && fb.y - hh < eb.bottom) {
            fb.hits.add(e); this.fxBlood(eb.center.x, eb.top, 10, -Math.PI / 2, 1.6, [60, 220]);
            this.damageEnemy(e, 80, 0, 1, 'crush');
            if (!e.alive) { BUS.emit('callout', pick(['CRUSHED!', 'FLATTENED!', 'PANCAKED!'])); this.addStyle(80); }
          }
        }
        const pb = this.player.body;
        if (!fb.hitP && this.state !== 'dead' && fb.x + 7 > pb.left && fb.x - 7 < pb.right && fb.y + hh > pb.top && fb.y - hh < pb.bottom) { fb.hitP = true; this.hurtPlayer(18, fb.x); }
      }
      if ((vy >= 0 && fb.t > 0.05 && this.standAt(fb.x, fb.y + hh + 1)) || fb.t > 4) this.shatterBlock(fb);
    }
  },
  shatterBlock(fb) {
    const x = fb.x, y = fb.y, c = fb.kind, hh = c === '=' ? 3 : 7;
    fb.disableBody(true, true);
    const gibs = c === 'x' ? ['g_plank', 'g_plank2', 'g_plank', 'g_shard'] : c === 'g' ? ['g_beam', 'g_beam', 'g_shard', 'g_shard2'] : ['g_bar', 'g_bar', 'g_shard2'];
    for (let i = 0; i < 6; i++) this.spawnGib(pick(gibs), x + rand(-6, 6), y + rand(-4, 4), rand(-200, 200), rand(-260, -80), 'metal');
    this.fxDust(x, y + hh, 10); this.fxSmoke(x, y, 4, 1); this.fxSparks(x, y + hh, 8, -Math.PI / 2, 2.4, [80, 240]);
    Sfx.smash(c); this.shake(110, 0.005); this.addKick(0, 2);
    this.damageTile(Math.floor(x / TS), Math.floor((y + hh + 1) / TS), 26);   // pancakes into whatever it lands on
    for (const { rd } of this.pushRagdolls(x, y, 26, 300, 160)) this.hitRagdoll(rd, x, y, 30, 0, 1, 'blast');
    for (const e of this.enemies.getChildren()) if (e.alive && Math.abs(e.body.center.x - x) < 16 && Math.abs(e.body.bottom - (y + hh)) < 10) this.damageEnemy(e, 20, Math.sign(e.x - x) || 1, -1, 'crush');
  },

  // ------------------------------------------------------------ enemy rockets & bombs ----
  // Slow enough to read: shoot them down, kick them back, or just get out of the splash.
  spawnEProj(kind, x, y, vx, vy) {
    const p = this.eprojs.getFirstDead(false); if (!p) return null;
    p.setTexture(kind === 'bomb' || kind === 'shell' ? 'ebomb' : kind === 'fire' ? 'firebomb' : kind === 'tar' ? 'tarblob' : kind === 'scrap' ? 'scrap' : kind === 'acid' ? 'acidglob' : kind === 'nade' ? 'enade' : kind === 'drum' ? 'barrel' : kind === 'frost' ? 'frostball' : 'erocket').enableBody(true, x, y, true, true);
    p.body.setSize(5, 5, true); p.body.setAllowGravity(kind !== 'rocket');
    p.setVelocity(vx, vy); p.setRotation(Math.atan2(vy, vx));
    Object.assign(p, { pk: kind, life: kind === 'rocket' ? 3.5 : 4, px: x, py: y });
    p.glow.setVisible(kind !== 'tar' && kind !== 'scrap' && kind !== 'nade' && kind !== 'drum').setPosition(x, y).setTint(kind === 'acid' ? 0x9aff4a : 0xffffff).setTint(kind === 'bomb' ? 0xff3020 : kind === 'fire' ? 0xff8a20 : kind === 'frost' ? 0x80e0ff : 0xffa040);
    return p;
  },
  popEProj(p, x = p.x, y = p.y) {
    if (p.pk === 'shell') { p.disableBody(true, true); p.glow.setVisible(false); this.explode(x, y, TUNE.HOWITZER.blast); return; }
    if (p.pk === 'nade') { p.disableBody(true, true); p.glow.setVisible(false); this.explode(x, y, TUNE.GRENADIER.blast); return; }
    if (p.pk === 'frost') {                                               // frost: shatters into a sheet of ice on the floor
      p.disableBody(true, true); p.glow.setVisible(false);
      const pb = this.player.body;
      if (this.state !== 'dead' && x > pb.left - 8 && x < pb.right + 8 && y > pb.top - 8 && y < pb.bottom + 8) { this.hurtPlayer(TUNE.CHILLER.dmg, x, { knock: false, srcY: y }); this.chillT = TUNE.CHILLER.chill; }
      this.fx.emit(x, y, { n: 14, speed: [40, 160], life: [0.3, 0.6], size: [2, 1], cols: [0xffffff, 0xc8f0ff, 0x6ab0e0], add: true, g: 400, mode: 1 });
      this.spawnIce(x, y, TUNE.CHILLER.ice); Sfx.iceForm(); return;
    }
    if (p.pk === 'drum') { p.disableBody(true, true); p.glow.setVisible(false); this.explode(x, y, TUNE.LUGGER.barrel); for (let i = 0; i < 4; i++) this.spawnGib('g_barrel', x, y, rand(-220, 220), rand(-340, -140), 'metal'); return; }
    if (p.pk === 'acid') {
      p.disableBody(true, true); p.glow.setVisible(false);
      const pb = this.player.body;
      if (this.state !== 'dead' && x > pb.left - 6 && x < pb.right + 6 && y > pb.top - 6 && y < pb.bottom + 6) { this.hurtPlayer(6, x, { knock: false, srcY: y }); this.pCorrodeT = TUNE.SLUG.corrode; }
      this.fx.emit(x, y, { n: 12, speed: [40, 140], life: [0.3, 0.6], size: [2, 1], cols: [0xe0ff90, 0x9aff4a, 0x4aa020], add: true, g: 500, mode: 1 });
      const fy = this.floorBelow(x, y - 4); if (fy !== null && fy - y < 60) { const [px, pw] = this.spanOn(x, fy, 22); this.acids.push({ x: px, y: fy, w: pw, t: TUNE.SLUG.pool }); }
      Sfx.squelch(); return;
    }
    if (p.pk === 'scrap') { p.disableBody(true, true); p.glow.setVisible(false); this.explode(x, y, TUNE.GOLEM.scrap); for (let i = 0; i < 3; i++) this.spawnGib('g_shard', x, y - 2, rand(-120, 120), rand(-220, -100), 'metal'); return; }
    p.disableBody(true, true); p.glow.setVisible(false);
    if (p.pk === 'tar') {                                               // tar: no bang, a sticky black puddle (and a slap if it lands on you)
      const pb = this.player.body;
      if (this.state !== 'dead' && x > pb.left - 5 && x < pb.right + 5 && y > pb.top - 5 && y < pb.bottom + 5) { this.hurtPlayer(6, x, { knock: false, srcY: y }); this.tarT = 1.2; BUS.emit('splat', 2); }
      this.fx.emit(x, y, { n: 12, speed: [40, 150], life: [0.3, 0.6], size: [2, 1], cols: [0x2a2018, 0x140e0a, 0x4a3c30], g: 600, mode: 1 });
      this.spawnTarPatch(x, y);
      return;
    }
    this.explode(x, y, p.pk === 'bomb' ? TUNE.WASP.bomb : p.pk === 'fire' ? TUNE.PYRO.burst : TUNE.ROCKETEER.blast);
    if (p.pk === 'fire') this.spawnFirePatch(x, y);
  },
  updateEProjs(dt) {
    const pb = this.player.body;
    for (const p of this.eprojList) {
      if (!p.active) continue;
      p.life -= dt;
      const hit = this.sweep(p.px, p.py, p.x, p.y);
      const onP = this.state !== 'dead' && p.x > pb.left - 3 && p.x < pb.right + 3 && p.y > pb.top - 3 && p.y < pb.bottom + 3;
      if (p.pk === 'nade') {                                             // a grenade bounces until its fuse runs out (or it touches you)
        const onP2 = this.state !== 'dead' && p.x > pb.left - 3 && p.x < pb.right + 3 && p.y > pb.top - 3 && p.y < pb.bottom + 3;
        if (onP2 || p.life <= 0) { this.popEProj(p); continue; }
        const h2 = this.sweep(p.px, p.py, p.x, p.y), v = p.body.velocity;
        if (h2) { p.body.reset(p.px, p.py); if (this.solidAt(p.x, p.y + 4) || Math.abs(v.y) > Math.abs(v.x)) v.y = -v.y * 0.5; else v.x = -v.x * 0.6; v.x *= 0.85; if (Math.abs(v.y) > 40) Sfx.clunk(0.4); }
        if (p.life < 0.5 && Math.floor(p.life * 16) % 2) p.glow.setVisible(true).setTint(0xff2010); else p.glow.setVisible(false);
        p.setRotation(p.rotation + v.x * 0.0005 * 16); p.px = p.x; p.py = p.y; continue;
      }
      const landed = p.pk !== 'rocket' && p.body.velocity.y > 0 && this.standAt(p.x, p.y + 3);   // gratings catch bombs too
      if (hit || onP || landed || p.life <= 0) { this.popEProj(p, hit ? hit.x : p.x, hit ? hit.y : p.y); continue; }
      let shot = null;
      for (const b of this.bulletList) if (b.active && Math.abs(b.x - p.x) < 7 && Math.abs(b.y - p.y) < 7) { shot = b; break; }
      if (shot) { shot.disableBody(true, true); this.popEProj(p); BUS.emit('callout', 'SHOT DOWN'); this.addStyle(40); continue; }
      const a = Math.atan2(p.body.velocity.y, p.body.velocity.x);
      p.setRotation(a);
      if (p.pk === 'rocket') {
        const tx = p.x - Math.cos(a) * 5, ty = p.y - Math.sin(a) * 5;
        this.fx.emit(tx, ty, { n: 1, speed: [5, 20], life: [0.4, 0.8], size: [2, 5], cols: [0x8a8580, 0x5a5652, 0x3a3836], alpha: [0.5, 0], g: -25, drag: 2, jitter: 1 });
        this.fx.emit(tx, ty, { n: 1, angle: a + Math.PI, spread: 0.6, speed: [20, 60], life: [0.08, 0.16], size: [3, 1], cols: [0xffffff, 0xffe46a, 0xff8a1f], add: true });
      } else if (p.pk === 'tar') { if (Math.random() < 0.4) this.fx.emit(p.x, p.y, { n: 1, speed: [0, 10], life: [0.3, 0.6], size: [2, 1], cols: [0x2a2018, 0x140e0a], g: 400, mode: 1 }); }
      else if (Math.random() < 0.5) this.fx.emit(p.x, p.y - 3, { n: 1, speed: [0, 8], life: [0.1, 0.2], size: [2, 1], cols: [0xffe46a, 0xff5a1a], add: true });
      p.px = p.x; p.py = p.y;
    }
  },

  // ------------------------------------------------------------- props: lamps & gas ----
  propHitAt(x, y, ca, sa, dmg, tok) {                                  // shots hit the scenery too; true if something took it
    if (this.vault && this.hitIcicleAt(x, y)) return true;               // ARENA 07: a shot snaps an icicle
    for (const L of this.lamps) if (!L.falling && !L.dead && ((Math.abs(x - L.x) < 7 && Math.abs(y - L.y) < 6) || (Math.abs(x - L.x) < 2 && y > 2 * TS && y < L.y - 3))) { this.dropLamp(L); return true; }
    for (const k of this.canisterList) if (k.active && k.state === 'idle' && Math.abs(x - k.x) < 5 && Math.abs(y - k.y) < 8) {
      const h = Math.atan2(sa, ca); this.igniteCanister(k, h + (Math.cos(h) >= 0 ? -0.9 : 0.9) + rand(-0.3, 0.3)); return true;
    }
    if (this.props && this.hitPropsAt(x, y, ca, sa, dmg, tok)) return true;
    for (const c of this.chargeList) if (c.active && Math.abs(x - c.x) < 5 && Math.abs(y - c.y) < 5) { this.detonateCharge(c); BUS.emit('callout', 'COOKED OFF'); this.addStyle(40); return true; }
    for (const m of this.mineList) if (m.active && Math.abs(x - m.x) < 4 && Math.abs(y - m.y) < 4) { this.detonateMine(m); return true; }
    return false;
  },
  propSweep(x0, y0, x1, y1, ca, sa, dmg) {
    for (let i = 1; i <= 3; i++) if (this.propHitAt(x0 + (x1 - x0) * i / 3, y0 + (y1 - y0) * i / 3, ca, sa, dmg)) return true;
    return false;
  },
  dropLamp(L) {
    if (L.falling || L.dead) return;
    L.falling = true; L.vy = -40; L.spin = rand(-6, 6); L.hitP = false; L.hits = new Set();
    this.lvlCtx.clearRect(L.x, 2 * TS, 1, Math.max(0, L.y - 3 - 2 * TS)); this.lvlMark(L.x, 2 * TS, 2, L.y);   // the chain snaps
    for (let i = 0; i < 3; i++) this.spawnGib('g_bar', L.x, rand(2 * TS, L.y - 4), rand(-60, 60), rand(-80, 0), 'metal');
    this.fxSparks(L.x, L.y - 4, 10, -Math.PI / 2, 2, [60, 220]); Sfx.clang(); Sfx.snap();
    this.spawnLight(L.x, L.y, 'glow', 0xffe0a0, 1.5, 3, 0.9, 0.15);
  },
  updateLamp(L, dt) {
    L.vy += 900 * dt; L.y += L.vy * dt;
    L.img.setPosition(L.x, L.y).setRotation(L.img.rotation + L.spin * dt);
    const fl = Math.random() < 0.3 ? 0.2 : 1;
    L.gl.setPosition(L.x, L.y + 3).setAlpha(0.5 * fl); L.cone.setPosition(L.x, L.y + 3).setRotation(L.img.rotation).setAlpha(0.16 * fl);
    if (L.vy > 120) {
      for (const e of this.enemies.getChildren()) {
        if (!e.alive || L.hits.has(e) || e.def.anchored) continue;
        const eb = e.body;
        if (L.x + 6 > eb.left && L.x - 6 < eb.right && L.y + 5 > eb.top && L.y - 5 < eb.bottom) {
          L.hits.add(e); this.damageEnemy(e, 80, 0, 1, 'crush');
          if (!e.alive) { BUS.emit('callout', 'LIGHTS OUT!'); this.addStyle(100); }
        }
      }
      const pb = this.player.body;
      if (!L.hitP && this.state !== 'dead' && L.x + 6 > pb.left && L.x - 6 < pb.right && L.y + 5 > pb.top && L.y - 5 < pb.bottom) { L.hitP = true; this.hurtPlayer(15, L.x); }
    }
    if (this.standAt(L.x, L.y + 5) || L.y > LH) {                       // smashes on whatever is below
      L.dead = true; L.falling = false; L.img.setVisible(false); L.gl.setVisible(false); L.cone.setVisible(false);
      for (let i = 0; i < 7; i++) this.spawnGib(pick(['g_shard', 'g_shard2']), L.x, L.y, rand(-200, 200), rand(-260, -60), 'metal');
      this.fxSparks(L.x, L.y, 16, -Math.PI / 2, 2.6, [80, 260]); this.fxFire(L.x, L.y, 8);
      this.spawnLight(L.x, L.y, 'glow', 0xffe0a0, 2, 4, 1, 0.25);
      Sfx.smash('='); this.shake(140, 0.006);
      this.damageTile(Math.floor(L.x / TS), Math.floor((L.y + 6) / TS), 30);
      for (const { rd } of this.pushRagdolls(L.x, L.y, 24, 260, 140)) this.hitRagdoll(rd, L.x, L.y, 25, 0, 1, 'blast');
    }
  },
  spawnCanisters(fx) {
    this.A.canisters.forEach(([cx, cy], i) => {
      const k = this.canisterList[i]; if (!k || k.active) return;
      if (this.tileAt(cx, cy) !== '.' || this.tileAt(cx, cy + 1) === '.') return;   // its shelf is gone
      k.enableBody(true, cx * TS + 8, (cy + 1) * TS - 7, true, true);
      k.body.setSize(7, 13, true); k.body.setAllowGravity(true); k.body.setBounce(0.15, 0.15); k.body.setDrag(200, 0);
      k.setRotation(0); k.clearTint(); k.body.setGravityY(0); Object.assign(k, { state: 'idle', t: 0, heading: 0, hits: new Set(), hitP: false, hissT: 0 });
      if (fx) { this.fx.emit(k.x, k.y, { n: 10, speed: [20, 80], life: [0.3, 0.6], size: [2, 1], cols: [0xffffff, 0x80ffb0], add: true, g: -40 }); this.beamIn(k.x, (cy + 1) * TS, 13, [k]); }
    });
  },
  igniteCanister(k, heading) {                                          // valve shears off: it becomes a very bad rocket
    if (!k.active || k.state === 'fly') return;
    k.state = 'fly'; k.t = rand(1.2, 1.8); k.heading = heading; k.hits = new Set(); k.hitP = false;
    k.body.setBounce(0.6, 0.6); k.body.setDrag(0, 0); k.body.setGravityY(-560);   // gas thrust mostly beats gravity
    Sfx.gasHiss(); Sfx.clang(0.6); this.fxSparks(k.x, k.y, 6);
  },
  updateCanisters(dt) {
    const pb = this.player.body;
    for (const k of this.canisterList) {
      if (!k.active || k.state !== 'fly') continue;
      const b = k.body;
      k.t -= dt; k.heading += rand(-5, 5) * dt;
      const hc = Math.cos(k.heading), hs = Math.sin(k.heading);          // ricochet only off what it's flying into
      if ((b.blocked.left && hc < 0) || (b.blocked.right && hc > 0)) { k.heading = Math.PI - k.heading; Sfx.clunk(); this.fxSparks(k.x, k.y, 4); }
      if ((b.blocked.up && hs < 0) || (b.blocked.down && hs > 0)) { k.heading = -k.heading; Sfx.clunk(); this.fxSparks(k.x, k.y, 4); }
      b.velocity.x = clamp(b.velocity.x + Math.cos(k.heading) * 1000 * dt, -380, 380); b.velocity.y = clamp(b.velocity.y + Math.sin(k.heading) * 1000 * dt, -380, 380);
      k.rotation = k.heading - Math.PI / 2;
      const nx = k.x - Math.cos(k.heading) * 7, ny = k.y - Math.sin(k.heading) * 7;
      this.fx.emit(nx, ny, { n: 2, angle: k.heading + Math.PI, spread: 0.4, speed: [80, 180], life: [0.15, 0.35], size: [3, 6], cols: [0xe0fff0, 0x90e0b0, 0x5a8a70], alpha: [0.7, 0], drag: 2 });
      k.hissT -= dt; if (k.hissT <= 0) { k.hissT = 0.12; Sfx.gasHiss(); }
      for (const e of this.enemies.getChildren()) {
        if (!e.alive || k.hits.has(e)) continue;
        const eb = e.body;
        if (k.x > eb.left - 4 && k.x < eb.right + 4 && k.y > eb.top - 6 && k.y < eb.bottom + 6) { k.hits.add(e); this.damageEnemy(e, 25, Math.sign(b.velocity.x) || 1, -0.6, 'kick'); Sfx.kickHit(); }
      }
      if (!k.hitP && this.state !== 'dead' && k.x > pb.left - 3 && k.x < pb.right + 3 && k.y > pb.top - 5 && k.y < pb.bottom + 5) { k.hitP = true; this.hurtPlayer(12, k.x); }
      if (k.t <= 0) { const x = k.x, y = k.y; k.disableBody(true, true); for (let i = 0; i < 4; i++) this.spawnGib('g_can', x, y, rand(-220, 220), rand(-320, -120), 'metal'); this.explode(x, y, TUNE.CANISTER); }
    }
  },
  // ------------------------------------------------------------- destructible props ----
  // Thirty kinds of breakable scenery (PROPS for how they play, PROP_ART for how they look), placed per arena as
  // [kind, tile x, tile y, facing]. Shots, blasts, kicks, saws and fire wear them down, each goes off its own way,
  // and every wave restocks the broken ones. Water they spill conducts: anything electrical that goes off near a
  // puddle lights the whole puddle up.
  buildProps() {
    this.props = []; this.waters = []; this.fizzes = []; this.zaps = []; this.propTick = 0;
    this.propG = this.add.graphics().setDepth(4.6);                     // chains, cables, gauge needles
    this.waterG = this.add.graphics().setDepth(4.96);                   // puddles
    this.zapG = this.add.graphics().setDepth(16).setBlendMode(ADD);    // arcs and molten pours
    for (const [kind, tx, ty, dir] of this.A.props || []) if (PROPS[kind]) this.props.push(this.makeProp(kind, tx, ty, kind === 'neon' ? 1 : dir || 1));
    this.initPropSpills();
  },
  makeProp(kind, tx, ty, dir) {
    const D = PROPS[kind], A = PROP_ART[kind], p = { kind, D, A, dir, tx, ty, hw: A.w / 2 - 1, hh: Math.max(4, A.h / 2 - 1) };
    p.bx = tx * TS + 8; p.by = D.mount === 'floor' ? (ty + 1) * TS : ty * TS + 8;
    if (D.mount === 'hang') {                                           // find what it hangs from
      p.ay = 2 * TS;
      for (let y = ty * TS; y > 0; y -= 4) if (this.standAt(p.bx, y)) { p.ay = Math.floor(y / TS) * TS + TS; break; }
      p.L = Math.max(4, p.by - A.h / 2 - p.ay);
    }
    const depth = D.mount === 'wall' ? 1.3 : 4.2;
    p.img = this.add.sprite(p.bx, p.by, 'pr_' + kind, A.fr[0]).setOrigin(0.5, D.mount === 'floor' ? 1 : D.mount === 'hang' ? 0 : 0.5).setDepth(depth).setFlipX(dir < 0);
    if (kind === 'fan') { p.blade = this.add.image(p.bx, p.by, 'pr_blade').setDepth(depth + 0.01); p.grill = this.add.image(p.bx, p.by, 'pr_grill').setDepth(depth + 0.02); }
    if (D.light) p.glow = this.add.image(0, 0, 'glow').setBlendMode(ADD).setTint(D.light[0]).setDepth(18);
    if (D.cone) p.cone = this.add.image(0, 0, 'cone').setOrigin(0.5, 0).setBlendMode(ADD).setTint(D.cone[0]).setDepth(18);
    if (D.beam) p.beam = this.add.image(0, 0, 'cone').setOrigin(0.5, 0).setBlendMode(ADD).setTint(D.beam[0]).setDepth(18);
    this.resetProp(p, false);
    return p;
  },
  resetProp(p, fx) {
    if (p.fall) p.fall.destroy();
    Object.assign(p, { hp: p.D.hp, st: 'ok', fr: p.A.fr[0], t: 0, x: p.bx, y: p.by, vy: 0, sw: 0, swv: 0, rot: 0, flash: 0, jig: 0, la: 1, burning: false, cookT: 0,
      leaks: [], jets: [], called: false, beamT: 0, tok: null, smoke: 0, steamT: 0, falling: false, fall: null, phase: '', ang: 0, angV: 0, n: 0, popT: 0, arcT: 0,
      canAcc: 0, lit: 4, flickT: 0, tick: rand(0, 0.3), tick2: 0, cool: 0, wob: rand(0, 6) });
    p.img.setTexture('pr_' + p.kind, p.fr).setVisible(true).setRotation(0);
    if (p.blade) { p.blade.setVisible(true); p.grill.setVisible(true); }
    for (const o of [p.glow, p.cone, p.beam]) if (o) o.setVisible(true);
    this.placeProp(p);
    if (fx) { this.fx.emit(p.cx, p.cy, { n: 12, speed: [20, 80], life: [0.3, 0.6], size: [2, 1], cols: [0xffffff, 0xa0e8ff], add: true, g: -40 }); this.spawnLight(p.cx, p.cy, 'glow', 0xa0e8ff, 0.6, 1.4, 0.6, 0.25); this.beamIn(p.cx, p.cy + p.A.h / 2, p.A.h, [p.img, p.blade, p.grill]); }
  },
  placeProp(p) {                                                       // centre for hit tests, then the sprites and lights
    const D = p.D, A = p.A, j = p.jig > 0 ? Math.sin(p.wob * 53) * p.jig : 0;
    if (D.mount === 'hang' && !p.falling) {
      p.x = p.bx + Math.sin(p.sw) * p.L; p.y = p.ay + Math.cos(p.sw) * p.L;
      p.cx = p.x + Math.sin(p.sw) * A.h / 2; p.cy = p.y + Math.cos(p.sw) * A.h / 2;
      p.img.setPosition(p.x + j, p.y).setRotation(-p.sw + p.rot);
    } else {
      p.cx = p.x; p.cy = D.mount === 'floor' ? p.y - A.h / 2 : D.mount === 'hang' ? p.y + A.h / 2 : p.y;
      p.img.setPosition(p.x + j, p.y).setRotation(p.rot);
    }
    if (p.blade) { p.blade.setPosition(p.x + j, p.y); p.grill.setPosition(p.x + j, p.y); }
    if (p.glow) { const L = D.light; p.glow.setPosition(p.cx + L[3] * p.dir, p.cy + L[4]).setScale(L[1], L[2]); }
    if (p.cone) p.cone.setPosition(p.cx, p.cy + 1).setRotation(-p.sw).setScale(D.cone[1], D.cone[2]);
    if (p.beam) p.beam.setPosition(p.x + 5.5 * p.dir, p.y - 18.5).setRotation(p.dir > 0 ? -Math.PI / 2 + 0.45 : Math.PI / 2 - 0.45).setScale(D.beam[1], D.beam[2]);
  },
  hideProp(p) {
    p.st = 'gone';
    for (const o of [p.img, p.blade, p.grill, p.glow, p.cone, p.beam, p.fall]) if (o) o.setVisible(false);
  },
  restockProps() {                                                     // a new wave puts back what broke, if there's still somewhere to put it
    for (const p of this.props || []) {
      if (p.st === 'ok' && p.y === p.by && !p.falling) continue;
      if (p.D.mount === 'floor' && (this.tileAt(p.tx, p.ty) !== '.' || this.tileAt(p.tx, p.ty + 1) === '.')) continue;
      if (p.D.mount === 'hang' && !this.standAt(p.bx, p.ay - 2)) continue;
      this.resetProp(p, true);
    }
  },
  // shots: propHitAt finds the prop under a point. dmg undefined = a beam or blade passing through (12 a touch, at most
  // every 110 ms per prop); tok = one shot that may test many points (a rail), which hits each prop once.
  hitPropsAt(x, y, ca, sa, dmg, tok) {
    const now = this.time.now;
    for (const p of this.props) {
      if (p.st !== 'ok') continue;
      if (p.D.mount === 'hang' && this.chainHit(p, x, y)) { this.snapProp(p, ca); return true; }
      if (Math.abs(x - p.cx) > p.hw || Math.abs(y - p.cy) > p.hh) continue;
      if (tok) { if (p.tok === tok) continue; p.tok = tok; }
      else if (dmg === undefined) { if (now < p.beamT) return true; p.beamT = now + 110; }
      this.hitProp(p, dmg ?? 12, 'shot', x, y, ca, sa);
      return true;
    }
    return false;
  },
  chainHit(p, x, y) {                                                  // a shot through the chain or cables it hangs by
    if (p.falling || y < p.ay || y > p.y - 1) return false;
    const t = (y - p.ay) / Math.max(1, p.y - p.ay), lx = p.bx + (p.x - p.bx) * t;
    return p.kind === 'tube' ? Math.abs(x - (lx - 10)) < 1.5 || Math.abs(x - (lx + 10)) < 1.5 : Math.abs(x - lx) < 2;
  },
  hitProp(p, dmg, src, hx, hy, ca, sa) {
    if (p.st !== 'ok' || !(dmg > 0)) return;
    const D = p.D, x = hx ?? p.cx, y = hy ?? p.cy;
    p.hp -= dmg; p.flash = 0.06; p.jig = Math.min(2.5, 0.8 + dmg / 20);
    if (D.mount === 'hang') p.swv = clamp(p.swv + (ca || (Math.random() < 0.5 ? -1 : 1)) * Math.min(2.5, dmg * 0.05), -4, 4);
    if (src !== 'flame') this.propChips(p, x, y, ca, sa, Math.min(8, 2 + dmg / 8));
    if (D.hit) this[D.hit](p, dmg, x, y, ca || 0, sa || 0, src);
    if (p.st !== 'ok') return;
    if (p.hp <= 0) this.breakProp(p, src, ca);
    else if (p.hp <= D.hp * 0.5 && p.fr === p.A.fr[0] && p.A.fr.includes('hit')) p.fr = 'hit';
  },
  propChips(p, x, y, ca, sa, n) {                                      // what flies off a hit, by what it's made of
    const back = ca === undefined ? -Math.PI / 2 : Math.atan2(-(sa || 0), -ca);
    if (p.D.mat === 'glass') { this.fx.emit(x, y, { n, angle: back, spread: 1.6, speed: [40, 160], life: [0.2, 0.5], size: [2, 1], cols: [0xffffff, 0xd8f4ff, 0x9ad4ec], g: 500, mode: 1 }); Sfx.tink(0.6); }
    else if (p.D.mat === 'wood') { this.fx.emit(x, y, { n, angle: back, spread: 1.4, speed: [40, 150], life: [0.25, 0.5], size: [2, 1], cols: [0xa07040, 0x6a4422, 0xc89a5a], g: 600, mode: 1 }); Sfx.clunk(); }
    else { this.fxSparks(x, y, n, back, 1.4, [60, 200]); if (Math.random() < 0.3) Sfx.clang(0.3); else Sfx.tink(0.5); }
  },
  breakProp(p, src, ca) {
    if (p.st !== 'ok') return;
    p.st = 'live'; p.t = 0; p.hp = 0; p.fdir = Math.sign(ca || 0) || (Math.random() < 0.5 ? -1 : 1);
    this.addStyle(12);
    this[p.D.brk](p, src);
  },
  wreckProp(p, smoke) {                                                // done going off: the wreck stays, dark, until the next wave
    p.st = 'x'; p.fr = 'x'; p.smoke = smoke; p.burning = false; p.leaks.length = 0; p.jets.length = 0;
    for (const o of [p.glow, p.cone, p.beam]) if (o) o.setVisible(false);
  },
  propHurt(p, e, dmg, dx, dy, src) {                                   // damage from a prop going off; its first kill gets a callout
    if (!e.alive || e.under) return;
    this.damageEnemy(e, dmg, dx, dy, src);
    if (!e.alive && !p.called) { p.called = true; BUS.emit('callout', p.D.call); this.addStyle(60); }
  },
  igniteProp(p) { if (p.st === 'ok' && p.D.cook && !p.burning) { p.burning = true; p.cookT = p.D.cook; Sfx.ignite(); } },
  blastProps(x, y, R, W) {                                             // explosions: hit everything in reach, swing what hangs
    if (this.vault) this.blastIcicles(x, y, R);                         // ARENA 07: a blast brings the icicles down
    if (!this.props) return;
    const base = W.tileDamage ?? W.maxDamage ?? 40;
    for (const p of this.props) {
      if (p.st === 'gone') continue;
      const qx = clamp(x, p.cx - p.hw, p.cx + p.hw), qy = clamp(y, p.cy - p.hh, p.cy + p.hh), d = Math.hypot(qx - x, qy - y);
      if (d >= R + 4) continue;
      const f = 1 - d / (R + 4);
      if (p.D.mount === 'hang' && !p.falling) p.swv = clamp(p.swv + (Math.sign(p.cx - x) || 1) * 3 * f, -4, 4);
      if (p.st !== 'ok' || (d > 8 && !this.los(x, y, p.cx, p.cy))) continue;
      if (W.burn) this.igniteProp(p);
      this.hitProp(p, base * (0.45 + 0.75 * f), 'blast', qx, qy, Math.sign(p.cx - x) || 1, -0.5);
    }
  },
  kickProps(inBox, f) {
    let hit = false;
    for (const p of this.props || []) {
      if (p.st !== 'ok' || !inBox(p.cx, p.cy, Math.min(p.hw, 8))) continue;
      hit = true; if (p.D.mount === 'hang') p.swv = clamp(p.swv + f * 2.2, -4, 4);
      this.hitProp(p, TUNE.KICK.damage * 0.8, 'kick', p.cx - f * p.hw, p.cy, f, -0.2);
    }
    return hit;
  },
  propsIn(inside, dmg, src, ca, sa, beam) {                            // a cone, arc or radius hits the scenery the way it hits drums
    if (!this.props) return false;
    const now = this.time.now; let hit = false;
    for (const p of this.props) {
      if (p.st !== 'ok' || !inside(p.cx, p.cy, Math.max(p.hw, p.hh))) continue;
      if (beam) { if (now < p.beamT) continue; p.beamT = now + 110; }   // a held beam or flood wears a prop down at a steady pace
      this.hitProp(p, dmg, src, p.cx, p.cy, ca, sa); hit = true;
    }
    return hit;
  },
  heatProps(inCone, dmg) {                                             // the hose: cooks off what burns, wears down the rest
    for (const p of this.props || []) if (p.st === 'ok' && inCone(p.cx, p.cy, p.hw)) { this.igniteProp(p); this.hitProp(p, dmg, 'flame'); }
  },
  douse(x, y, r) {                                                     // water and foam: fires out, burning things stop burning
    let n = 0;
    for (let j = this.puddles.length - 1; j >= 0; j--) {
      const Q = this.puddles[j]; if (!Q.fire || Math.abs(Q.y - y) > r || Math.max(0, Math.abs(Q.x - x) - Q.w / 2) > r) continue;
      this.puddles.splice(j, 1); n++;
      this.fx.emit(Q.x, Q.y - 3, { n: 8, angle: -Math.PI / 2, spread: 1, speed: [10, 50], life: [0.5, 1], size: [3, 7], cols: [0xe8f0f4, 0xb0bcc4], alpha: [0.5, 0], g: -40, drag: 2 });
    }
    for (const e of this.enemies.getChildren()) if (e.alive && e.burnT > 0 && Math.hypot(e.body.center.x - x, e.body.center.y - y) < r) { e.burnT = 0; e.panicT = 0; n++; }
    for (const rd of this.ragdolls) if (rd.burnT > 0 && Math.hypot(rd.pts[2].x - x, rd.pts[2].y - y) < r) { rd.burnT = 0; n++; }
    for (const p of this.props) if (p.burning && Math.hypot(p.cx - x, p.cy - y) < r) { p.burning = false; n++; }
    if (n) Sfx.sizzle();
    return n;
  },
  addZap(x0, y0, x1, y1, t, c0 = 0x4ab8ff, c1 = 0xe8f8ff) { this.zaps.push({ x0, y0, x1, y1, t, c0, c1 }); },
  electrifyWater(x, y, r) {
    let lit = false, fresh = false;                                    // fresh: a puddle that wasn't live yet (only that crackles, so a held beam doesn't buzz)
    for (const W of this.waters) if (Math.hypot(Math.max(0, Math.abs(W.x - x) - W.w / 2), W.y - y) < r) { if (W.zap <= 0) { this.addZap(x, y, clamp(x, W.x - W.w / 2, W.x + W.w / 2), W.y - 1, 0.15); fresh = true; } W.zap = Math.max(W.zap, 1.8); lit = true; }
    if (fresh) Sfx.zap();
    return lit;
  },
  electrifyLine(x0, y0, x1, y1, r) {                                   // a beam or bolt lights a puddle it ends in or passes through
    let lit = this.electrifyWater(x1, y1, r);
    for (const W of this.waters) if ((y0 - W.y) * (y1 - W.y) < 0) {
      const xc = x0 + (x1 - x0) * (W.y - y0) / (y1 - y0);
      if (Math.abs(xc - W.x) <= W.w / 2) lit = this.electrifyWater(xc, W.y, 4) || lit;
    }
    return lit;
  },
  spanOn(x, fy, w) {                                                   // a spill only covers the floor it lands on
    const ok = xx => this.standAt(xx, fy + 1) && !this.solidAt(xx, fy - 2);
    let l = x - w / 2, r = x + w / 2;
    for (let xx = x; xx > l; xx -= 2) if (!ok(xx)) { l = xx + 1; break; }
    for (let xx = x; xx < r; xx += 2) if (!ok(xx)) { r = xx - 1; break; }
    return [(l + r) / 2, Math.max(4, r - l)];
  },
  spawnWater(x, y, w) {
    const fy = this.floorBelow(x, y - 4); if (fy === null || fy - y > 90) return;
    [x, w] = this.spanOn(x, fy, w);
    for (const W of this.waters) if (Math.abs(W.y - fy) < 3 && Math.abs(W.x - x) < (W.w + w) / 2) {
      const l = Math.min(W.x - W.w / 2, x - w / 2), r = Math.max(W.x + W.w / 2, x + w / 2);
      [W.x, W.w] = this.spanOn((l + r) / 2, fy, Math.min(170, r - l)); W.t = Math.max(W.t, 12); return;
    }
    this.waters.push({ x, y: fy, w, t: 12, grow: 0, zap: 0, tick: 0, seed: Math.random() * 100 });
    if (this.waters.length > 14) this.waters.shift();
  },

  updateProps(dt, now) {
    if (!this.props) return;
    this.propG.clear(); this.zapG.clear();
    for (const p of this.props) {
      if (p.st === 'gone') continue;
      const D = p.D;
      p.wob += dt;
      if (p.flash > 0) p.flash -= dt;
      if (p.jig > 0) p.jig = Math.max(0, p.jig - dt * 10);
      if (D.mount === 'floor') { this.propSupport(p, dt); if (p.st === 'gone') continue; }
      if (D.mount === 'hang' && !p.falling) { p.swv += (-Math.sin(p.sw) * 30 - p.swv * 1.4) * dt; p.sw = clamp(p.sw + p.swv * dt, -1.2, 1.2); }
      if (D.mount === 'hang') this.drawHangers(p);
      if (p.st === 'ok') {
        if (p.burning) {
          p.cookT -= dt;
          if (Math.random() < 0.8) this.fx.emit(p.cx + rand(-p.hw, p.hw) * 0.7, p.cy - p.hh + 2, { n: 1, angle: -Math.PI / 2, spread: 0.6, speed: [20, 60], life: [0.2, 0.45], size: [4, 1], cols: [0xffffff, 0xffe46a, 0xff8a1f, 0xc03010], add: true, g: -40 });
          if (Math.random() < 0.1) this.fxSmoke(p.cx, p.cy - p.hh, 1, 0.7);
          if (p.cookT <= 0) this.breakProp(p, 'fire');
        }
        if (p.st === 'ok' && (p.tick -= dt) <= 0) { p.tick = 0.3; this.propEnvironment(p); }
        if (p.leaks.length) this.updateLeaks(p, dt);
        if (p.jets.length) this.updateBoilerJets(p, dt);
      } else if (p.st === 'live' && D.live) this[D.live](p, dt, now);
      if (p.st === 'x') {
        if (p.smoke > 0) { p.smoke -= dt; if (Math.random() < 0.12) this.fxSmoke(p.cx, p.cy - 2, 1, 0.7); if (D.mat !== 'wood' && Math.random() < 0.03) this.fxSparks(p.cx + rand(-4, 4), p.cy, 2, -Math.PI / 2, 1.5, [30, 120]); }
        if (p.steamT > 0) this.updatePropSteam(p, dt);
      }
      this.propAmbient(p, dt, now);
      const key = 'pr_' + p.kind + (p.flash > 0 ? '_w' : '');
      if (p.img.texture.key !== key || p.img.frame.name !== p.fr) p.img.setTexture(key, p.fr);
      this.placeProp(p);
    }
    for (const s of this.sawList) if (s.active) for (const p of this.props) {   // saw blades chew through them
      if (p.st !== 'ok' || Math.abs(s.x - p.cx) > p.hw + 4 || Math.abs(s.y - p.cy) > p.hh + 4 || (s.hitMap.get(p) || 0) > now) continue;
      s.hitMap.set(p, now + 300); this.hitProp(p, TUNE.SAW.damage, 'saw', s.x, s.y, Math.sign(s.body.velocity.x) || 1, 0);
    }
    if ((this.propTick -= dt) <= 0) {                                   // spilled toxin eats whatever stands in it
      this.propTick = 0.4;
      for (const A of this.acids) if (A.eat) for (const e of this.enemies.getChildren()) {
        if (!e.alive || e.under || FLIERS.has(e.kind) || Math.abs(e.body.center.x - A.x) > A.w / 2 + 3 || Math.abs(e.body.bottom - A.y) > 5) continue;
        this.damageEnemy(e, 5, 0, 0, 'acid'); if (e.alive) e.corrodeT = Math.max(e.corrodeT, 1.5);
      }
    }
    this.updateWaters(dt, now); this.updateFizzes(dt);
    for (let i = this.zaps.length - 1; i >= 0; i--) { const z = this.zaps[i]; z.t -= dt; if (z.t <= 0) { this.zaps.splice(i, 1); continue; } this.zapCol(this.zapG, z.x0, z.y0, z.x1, z.y1, z.c0, z.c1); }
  },
  propSupport(p, dt) {                                                 // floor props drop when what they stand on goes
    const on = y => this.standAt(p.x, y) || this.standAt(p.x - p.hw + 2, y) || this.standAt(p.x + p.hw - 2, y);
    if (p.vy === 0 && on(p.y + 1)) return;
    p.vy = Math.min(p.vy + 900 * dt, 560);
    const ny = p.y + p.vy * dt;
    if (on(ny)) {
      const hard = p.vy > 260; p.y = Math.floor(ny / TS) * TS; p.vy = 0;
      if (hard) { this.fxDust(p.x, p.y, 6); Sfx.clunk(); if (p.st === 'ok') this.hitProp(p, 25, 'crush'); }
    } else { p.y = ny; if (p.y > LH + 40) this.hideProp(p); }
  },
  drawHangers(p) {
    const G = this.propG, s = Math.sin(-p.sw + p.rot), c = Math.cos(-p.sw + p.rot);
    if (p.falling) { G.lineStyle(1, 0x2a2e35, 1); for (const ox of p.kind === 'tube' ? [-10, 10] : [0]) G.lineBetween(p.bx + ox, p.ay, p.bx + ox + Math.sin(p.wob * 3 + ox) * 2, p.ay + 9); return; }
    if (p.kind === 'tube') { G.lineStyle(1, 0x15171b, 1); for (const ox of [-10, 10]) G.lineBetween(p.bx + ox, p.ay, p.x + ox * c, p.y + ox * s); return; }
    const dx = p.x - p.bx, dy = p.y - p.ay, n = Math.max(1, Math.floor(Math.hypot(dx, dy) / 3));
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, odd = i % 2; G.fillStyle(odd ? 0x2a2e35 : 0x6a737e, 1).fillRect(Math.round(p.bx + dx * t) - (odd ? 0 : 1), Math.round(p.ay + dy * t) - 1, odd ? 1 : 2, 3); }
  },
  propEnvironment(p) {                                                 // every 0.3 s: has its anchor gone, is anything setting it alight?
    if (p.D.mount === 'hang' && !this.standAt(p.bx, p.ay - 2)) { this.dropHanging(p); return; }
    if (!p.D.cook || p.burning) return;
    let lit = false;
    for (const Q of this.puddles) if (Q.fire && Math.abs(Q.y - (p.D.mount === 'floor' ? p.y : p.cy)) < p.hh + 6 && Math.abs(Q.x - p.cx) < Q.w / 2 + p.hw) { lit = true; break; }
    if (!lit) for (const e of this.enemies.getChildren()) if (e.alive && e.burnT > 0 && Math.abs(e.body.center.x - p.cx) < p.hw + 8 && Math.abs(e.body.center.y - p.cy) < p.hh + 10) { lit = true; break; }
    if (!lit) for (const F of this.flares) if (Math.hypot(F.x - p.cx, F.y - p.cy) < TUNE.FLARE.igniteR + p.hw) { lit = true; break; }
    if (lit) this.igniteProp(p);
  },
  propAmbient(p, dt, now) {                                            // idle life: flicker, drips, vapour, spinning blades
    const D = p.D, ok = p.st === 'ok', hurt = p.hp < D.hp;
    if (ok) p.la = 1;
    switch (p.kind) {
      case 'neon':
        if (!ok) break;
        if (Math.random() < (hurt ? 0.04 : 0.004)) { p.flickT = 0.05 + Math.random() * 0.08; if (hurt) Sfx.buzz(); }
        if (p.flickT > 0) { p.flickT -= dt; p.la = 0.15; p.fr = 'n0'; } else { p.fr = 'n' + p.lit; p.la = p.lit / 4 * (0.85 + 0.15 * Math.sin(now / 90 + p.wob)); }
        break;
      case 'tube': if (ok) { const fl = Math.random() < (hurt ? 0.22 : 0.003); p.fr = fl ? 'off' : 'ok'; p.la = fl ? 0.12 : 0.92 + 0.08 * Math.sin(now / 37); } break;
      case 'flood': if (ok) p.la = 0.92 + 0.08 * Math.sin(now / 60 + p.wob); break;
      case 'fuse': if (ok) p.la = Math.floor(now / 480 + p.wob) % 2 ? 1 : 0.1; break;
      case 'capacitor': if (ok) { p.la = 0.6 + 0.4 * Math.sin(now / 160 + p.wob); if (Math.random() < dt * 1.4) this.addZap(p.x - 2, p.y - 18, p.x + 2, p.y - 18, 0.05); } break;
      case 'toxic': if (ok) { p.la = 0.7 + 0.3 * Math.sin(now / 300 + p.wob); if (Math.random() < dt * 1.2) this.fx.emit(p.x - 3, p.y - 10, { n: 1, angle: Math.PI / 2, spread: 0.2, speed: [5, 15], life: [0.5, 0.9], size: [1, 1], cols: [0x86ec4a], g: 200 }); } break;
      case 'cryo': if (ok && Math.random() < dt * 6) this.fx.emit(p.x + rand(-5, 5), p.y - rand(3, 18), { n: 1, angle: Math.PI / 2 + rand(-0.4, 0.4), spread: 0.3, speed: [4, 14], life: [0.6, 1.2], size: [2, 5], cols: [0xe8fbff, 0xb8e4f4], alpha: [0.35, 0], g: 20, drag: 1 }); break;
      case 'oil': if (ok && Math.random() < dt * 0.6) this.fx.emit(p.x + 2 * p.dir, p.y - 11, { n: 1, angle: Math.PI / 2, spread: 0.1, speed: [5, 10], life: [0.5, 0.6], size: [1, 1], cols: [0x1a1c22], g: 500, mode: 1 }); break;
      case 'boiler':
        if (ok) { p.la = 0.75 + 0.25 * Math.random(); if (Math.random() < dt * 2.5) this.fx.emit(p.x - 3.5 * p.dir, p.y - 30, { n: 1, angle: -Math.PI / 2, spread: 0.3, speed: [10, 25], life: [0.8, 1.4], size: [2, 6], cols: [0xe8eef4, 0xb8c0c8], alpha: [0.35, 0], g: -15, drag: 1 }); }
        if (p.st !== 'x') this.drawGauge(p);
        break;
      case 'fan': if (ok) p.blade.rotation += dt * (hurt ? 9 + Math.random() * 8 : 16); break;
      case 'ladle':
        if (p.st !== 'x' && Math.random() < dt * 9) this.fx.emit(p.cx + rand(-6, 6), p.cy - 4, { n: 1, angle: -Math.PI / 2, spread: 0.5, speed: [15, 45], life: [0.6, 1.3], size: [1, 1], cols: [0xffe080, 0xff8a20], add: true, g: -25, drag: 0.4 });
        if (ok) p.la = 0.85 + 0.15 * Math.random();
        if (p.st === 'x' && p.cool > 0 && p.glow) { p.cool -= dt; p.glow.setVisible(true); p.la = p.cool / 6; }
        break;
      case 'vending': if (ok) p.la = Math.random() < (hurt ? 0.08 : 0.008) ? 0.25 : 0.95; break;
      case 'terminal': if (ok) { p.fr = p.hp <= D.hp * 0.5 ? 'hit' : 'ok' + (Math.floor(now / 260 + p.wob) % 3); p.la = 0.8 + 0.2 * Math.random(); } break;
      case 'horn': if (ok) p.la = Math.max(0, Math.sin(now / 120 + p.wob)); break;
      case 'water': if (ok && Math.random() < dt * 0.8) this.fx.emit(p.x, p.y - 6, { n: 1, angle: Math.PI / 2, spread: 0.1, speed: [5, 10], life: [0.35, 0.45], size: [1, 1], cols: [0x8ce0ff], g: 600, mode: 1 }); break;
      case 'window': {
        const ph = (now / 1000 + p.wob * 3) % 7;
        if (ok && ph < 0.5) { const gx = p.x - 9 + ph / 0.5 * 24; this.propG.lineStyle(2, 0xffffff, 0.22).lineBetween(gx, p.y - 8, gx - 7, p.y + 8); }
        break;
      }
    }
    const mains = this.powerCut ? 0.25 : 1;                             // Act 05's breaker: everything on the mains drops to a glimmer
    if (p.glow && p.glow.visible) p.glow.setAlpha(clamp(D.light[5] * p.la * mains, 0, 1));
    if (p.cone && p.cone.visible) p.cone.setAlpha(clamp(D.cone[3] * p.la * mains, 0, 1));
    if (p.beam && p.beam.visible) p.beam.setAlpha(clamp(D.beam[3] * p.la * mains, 0, 1));
  },
  drawGauge(p) {                                                       // the boiler's needle climbs as it takes damage
    const k = p.st === 'live' ? 1 : 1 - p.hp / p.D.hp, a = Math.PI * (0.75 + 1.1 * k) + (p.st === 'live' ? rand(-0.2, 0.2) : 0);
    const gx = p.x + 6 * p.dir + (p.jig > 0 ? Math.sin(p.wob * 53) * p.jig : 0), gy = p.y - 15.5;
    this.propG.lineStyle(1, 0xc01010, 1).lineBetween(gx, gy, gx + Math.cos(a) * 2.2 * p.dir, gy + Math.sin(a) * 2.2);
  },
  hitLeak(p, dmg, x, y) {                                              // drums and tanks spring leaks where they're shot
    if (p.hp <= 0) return;
    p.leaks.push({ ox: clamp(x - p.x, -p.hw + 1, p.hw - 1), oy: clamp(y - p.y, -p.A.h + 3, -2), dir: x < p.x ? -1 : 1, t: 2.4, drip: 0.15 });
    if (p.leaks.length > 3) p.leaks.shift();
  },
  updateLeaks(p, dt) {
    for (let i = p.leaks.length - 1; i >= 0; i--) {
      const L = p.leaks[i]; L.t -= dt;
      if (L.t <= 0) { p.leaks.splice(i, 1); continue; }
      const x = p.x + L.ox, y = p.y + L.oy, k = Math.min(1, L.t / 0.8), sp = 50 + 90 * k, ang = L.dir > 0 ? -0.35 : Math.PI + 0.35;
      L.drip -= dt;
      if (p.kind === 'toxic') {
        this.fx.emit(x, y, { n: 1, angle: ang, spread: 0.25, speed: [sp * 0.8, sp], life: [0.3, 0.5], size: [2, 1], cols: [0xc8ff96, 0x86ec4a, 0x36961e], g: 500, mode: 1 });
        if (L.drip <= 0) { L.drip = 0.6; const fy = this.floorBelow(x + L.dir * 10, y); if (fy !== null) { const [ax, aw] = this.spanOn(x + L.dir * 12, fy, 12); this.acids.push({ x: ax, y: fy, w: aw, t: 4, eat: true }); if (this.acids.length > 60) this.acids.shift(); } }
      } else if (p.kind === 'oil') {
        this.fx.emit(x, y, { n: 1, angle: ang, spread: 0.25, speed: [sp * 0.8, sp], life: [0.3, 0.5], size: [2, 1], cols: [0x30343c, 0x0e0f12, 0x5e6470], g: 500, mode: 1 });
        if (L.drip <= 0) { L.drip = 0.7; this.spawnTarPatch(x + L.dir * 9, y, 16); }
      } else if (p.kind === 'water') {
        this.fx.emit(x, y, { n: 2, angle: ang, spread: 0.2, speed: [sp * 0.8, sp], life: [0.3, 0.5], size: [2, 1], cols: [0xd8f8ff, 0x8ce0ff, 0x4ac8f8], g: 500, mode: 1 });
        if (L.drip <= 0) { L.drip = 0.8; this.spawnWater(x + L.dir * 10, y, 18); this.douse(x + L.dir * 14, y + 8, 18); }
      } else if (p.kind === 'cryo') {                                   // a jet of frost: chills whatever stands in it
        this.fx.emit(x, y, { n: 2, angle: L.dir > 0 ? 0 : Math.PI, spread: 0.3, speed: [90, 150], life: [0.2, 0.35], size: [2, 5], cols: [0xffffff, 0xd8f4ff, 0x9adcff], alpha: [0.6, 0], drag: 2 });
        if (L.drip <= 0) {
          L.drip = 0.15; const x0 = Math.min(x, x + L.dir * 36), x1 = Math.max(x, x + L.dir * 36);
          for (const e of this.enemies.getChildren()) if (e.alive && !e.under && e.body.right > x0 && e.body.left < x1 && e.body.bottom > y - 8 && e.body.top < y + 8) this.chill(e, 0.07);
          this.douse((x0 + x1) / 2, y, 20);
        }
      }
    }
  },
  updatePropSteam(p, dt) {                                             // what's left of the boiler: a scalding fog for a couple of seconds
    p.steamT -= dt; const k = Math.min(1, p.steamT / 0.8);
    if (Math.random() < 0.9 * k) { const th = rand(0, Math.PI * 2), r = Math.sqrt(Math.random()) * 50; this.fx.emit(p.cx + Math.cos(th) * r, p.cy + Math.sin(th) * r * 0.6, { n: 1, speed: [6, 24], life: [0.7, 1.3], size: [5, 12], cols: [0xffffff, 0xe0e6ec, 0xc0c8d0], alpha: [0.45 * k, 0], drag: 1, g: -20, jitter: 3 }); }
    if ((p.tick2 -= dt) > 0) return;
    p.tick2 = 0.3;
    for (const e of this.enemies.getChildren()) if (e.alive && !e.under && Math.hypot(e.body.center.x - p.cx, e.body.center.y - p.cy) < 54) this.propHurt(p, e, 4, 0, 0, 'flame');
    this.douse(p.cx, p.cy, 54);
  },
  updateWaters(dt, now) {
    const g = this.waterG; g.clear();
    if (!this.waters.length) return;
    const pb = this.player.body, C = this.railCyc;
    for (let i = this.waters.length - 1; i >= 0; i--) {
      const W = this.waters[i]; W.t -= dt; W.grow = Math.min(1, W.grow + dt * 4);
      if (W.t <= 0) { this.waters.splice(i, 1); continue; }
      const half = W.w / 2 * W.grow, a = Math.min(1, W.t / 1.5), x0 = Math.round(W.x - half);
      for (let j = this.puddles.length - 1; j >= 0; j--) {             // it puts out fires it spreads into
        const Q = this.puddles[j]; if (!Q.fire || Math.abs(Q.y - W.y) > 6 || Math.abs(Q.x - W.x) > Q.w / 2 + half) continue;
        this.puddles.splice(j, 1); Sfx.sizzle();
        this.fx.emit(Q.x, Q.y - 3, { n: 10, angle: -Math.PI / 2, spread: 1, speed: [10, 50], life: [0.5, 1], size: [3, 7], cols: [0xe8f0f4, 0xb0bcc4], alpha: [0.5, 0], g: -40, drag: 2 });
      }
      if (this.rails.length && C.st === 'live') for (const R0 of this.rails) if (R0.g === C.g && Math.abs(R0.y - W.y) < 4 && W.x + half > R0.x0 && W.x - half < R0.x1) W.zap = Math.max(W.zap, 0.4);   // a live rail under it
      W.zap = Math.max(0, W.zap - dt);
      const live = W.zap > 0;
      g.fillStyle(live ? 0x46c8ff : 0x2a6aa8, 0.6 * a).fillRect(x0, W.y - 2, half * 2, 2);
      g.fillStyle(live ? 0xe8fbff : 0x7cc8f0, 0.8 * a).fillRect(x0 + 1, W.y - 2, Math.max(0, half * 2 - 2), 1);
      for (let k = 0; k < 2; k++) { const gx = x0 + 1 + ((now / (28 + k * 11) + W.seed * (k + 1) * 37) % Math.max(1, half * 2 - 4)); g.fillStyle(0xffffff, 0.7 * a).fillRect(gx, W.y - 2, 2, 1); }
      if (!live) continue;
      g.lineStyle(1, 0xe0f8ff, 0.9);
      for (let k = 0; k < 3; k++) { let x = W.x + rand(-half, half), y = W.y - 2; for (let s = 0; s < 3; s++) { const nx = x + rand(-5, 5), ny = W.y - 2 - rand(0, 7); g.lineBetween(x, y, nx, ny); x = nx; y = ny; } }
      if ((W.tick -= dt) > 0) continue;
      W.tick = 0.3;
      for (const e of this.enemies.getChildren()) {
        if (!e.alive || e.under || FLIERS.has(e.kind) || Math.abs(e.body.center.x - W.x) > half + 2 || Math.abs(e.body.bottom - W.y) > 5) continue;
        this.damageEnemy(e, 10, 0, -1, 'arc'); if (e.alive) e.stunT = Math.max(e.stunT, 0.35);
      }
      if (this.state !== 'dead' && Math.abs(pb.center.x - W.x) < half + 3 && Math.abs(pb.bottom - W.y) < 5) this.hurtFromHazardContact(5, W.x, { srcY: W.y, by: 'A LIVE PUDDLE' });
    }
  },
  updateFizzes(dt) {                                                   // cans out of the vending machine, fizzing about like tiny rockets
    for (let i = this.fizzes.length - 1; i >= 0; i--) {
      const F = this.fizzes[i]; F.t -= dt; F.heading += rand(-7, 7) * dt;
      F.vx = clamp(F.vx + Math.cos(F.heading) * 900 * dt, -300, 300); F.vy = clamp(F.vy + Math.sin(F.heading) * 900 * dt + 300 * dt, -300, 300);
      const nx = F.x + F.vx * dt, ny = F.y + F.vy * dt;
      if (this.solidAt(nx, F.y)) { F.vx *= -0.6; F.heading = Math.PI - F.heading; } else F.x = nx;
      if (this.solidAt(F.x, ny)) { F.vy *= -0.6; F.heading = -F.heading; } else F.y = ny;
      F.img.setPosition(F.x, F.y).setRotation(F.heading + Math.PI / 2);
      this.fx.emit(F.x - Math.cos(F.heading) * 3, F.y - Math.sin(F.heading) * 3, { n: 1, angle: F.heading + Math.PI, spread: 0.5, speed: [30, 80], life: [0.2, 0.4], size: [2, 4], cols: [0xffffff, 0xf0e0c8, 0xc8a070], alpha: [0.8, 0], drag: 2, g: 100 });
      for (const e of this.enemies.getChildren()) {
        if (!e.alive || e.under || F.hits.has(e)) continue; const b = e.body;
        if (F.x > b.left - 3 && F.x < b.right + 3 && F.y > b.top - 3 && F.y < b.bottom + 3) { F.hits.add(e); this.propHurt(F.p, e, 14, Math.sign(F.vx) || 1, -0.4, 'pellet'); F.t = 0; break; }
      }
      if (F.t > 0) continue;
      this.fx.emit(F.x, F.y, { n: 12, speed: [30, 120], life: [0.2, 0.5], size: [2, 4], cols: [0xffffff, 0xf0e0c8, 0xc8a070], alpha: [0.85, 0], drag: 2, g: 150 });
      Sfx.bubblePop(); F.img.destroy(); this.fizzes.splice(i, 1);
    }
  },

  // ---- how each one goes ----
  // NEON SIGN: every 5 damage a letter pops; the last drops the sign, which smashes on whatever is under it
  hitNeon(p) {
    const lit = clamp(Math.ceil(p.hp / 5), 0, 4);
    while (p.lit > lit) { p.lit--; this.neonPop(p, NEON_POP[3 - p.lit]); }
    p.fr = 'n' + p.lit;
  },
  neonPop(p, i) {
    const lx = p.x - 17 + 6.5 + i * 7, ly = p.y + 1;
    for (let k = 0; k < 3; k++) this.spawnGib('g_neon', lx, ly, rand(-120, 120), rand(-160, -40), 'metal');
    this.fx.emit(lx, ly, { n: 10, speed: [30, 140], life: [0.15, 0.4], size: [2, 1], cols: [0xffffff, 0xffd2ee, 0xff5ac0], add: true, g: 400, mode: 1 });
    this.spawnLight(lx, ly, 'glow', 0xff5ac0, 0.6, 1.6, 0.9, 0.18); Sfx.shatter(); Sfx.zap();
  },
  breakNeon(p) {
    p.lit = 0;
    p.fall = this.add.sprite(p.x, p.y + 1, 'pr_neon', 'dead').setDepth(4.3); p.fy = p.y + 1; p.fvy = -40; p.fspin = rand(-1.2, 1.2); p.hits = new Set();
    p.fr = 'x'; if (p.glow) p.glow.setVisible(false);
    Sfx.snap(); Sfx.clang(0.5); this.fxSparks(p.x - 9, p.y - 6, 8, -Math.PI / 2, 2); this.fxSparks(p.x + 9, p.y - 6, 8, -Math.PI / 2, 2);
  },
  liveNeon(p, dt) {
    const F = p.fall; if (!F) { this.wreckProp(p, 0); return; }
    p.fvy += 900 * dt; p.fy += p.fvy * dt; F.setPosition(p.x, p.fy).setRotation(F.rotation + p.fspin * dt);
    if (p.fvy > 100) for (const e of this.enemies.getChildren()) {
      if (!e.alive || e.under || p.hits.has(e)) continue; const b = e.body;
      if (p.x + 15 > b.left && p.x - 15 < b.right && p.fy + 6 > b.top && p.fy - 6 < b.bottom) { p.hits.add(e); this.propHurt(p, e, 40, 0, 1, 'crush'); }
    }
    if (!(this.standAt(p.x, p.fy + 7) || this.standAt(p.x - 14, p.fy + 7) || this.standAt(p.x + 14, p.fy + 7) || p.fy > LH)) return;
    const x = p.x, y = p.fy + 4; F.destroy(); p.fall = null;
    for (let k = 0; k < 8; k++) this.spawnGib(pick(['g_neon', 'g_glass', 'g_shard']), x + rand(-14, 14), y, rand(-200, 200), rand(-260, -60), 'metal');
    this.fx.emit(x, y, { n: 26, speed: [40, 220], life: [0.15, 0.5], size: [2, 1], cols: [0xffffff, 0xffd2ee, 0xff5ac0, 0x4ce4fa], add: true, g: 500, mode: 1 });
    this.spawnLight(x, y, 'glow', 0xff5ac0, 2, 4, 1, 0.25); this.fxSparks(x, y, 12, -Math.PI / 2, 2.4);
    Sfx.shatter(); Sfx.smash('='); this.shake(120, 0.005);
    for (const e of this.enemies.getChildren()) if (e.alive && !e.under && Math.abs(e.body.center.x - x) < 24 && Math.abs(e.body.bottom - y) < 14) this.propHurt(p, e, 25, Math.sign(e.body.center.x - x) || 1, -0.5, 'crush');
    this.wreckProp(p, 0);
  },
  // STRIP LIGHT: strobes, then bursts and rains glass on whatever is under it. Cut a cable and it drops
  breakTube(p) { p.t = 0.32; Sfx.buzz(); },
  liveTube(p, dt) {
    if (p.falling) { this.fallTube(p, dt); return; }
    p.t -= dt; const fl = Math.random() < 0.5; p.fr = fl ? 'off' : 'ok'; p.la = fl ? 0.1 : 1.4;
    if (p.t <= 0) this.burstTube(p, p.cx, p.cy);
  },
  burstTube(p, x, y) {
    for (let k = 0; k < 10; k++) this.spawnGib(k % 2 ? 'g_glass' : 'g_glass2', x + rand(-11, 11), y + 2, rand(-70, 70), rand(-60, 40), 'metal');
    this.fx.emit(x, y + 2, { n: 24, angle: Math.PI / 2, spread: 2.4, speed: [30, 160], life: [0.2, 0.6], size: [2, 1], cols: [0xffffff, 0xe0f5ff, 0x9ad4ec], add: true, g: 600, mode: 1 });
    this.spawnLight(x, y, 'glow', 0xe0f5ff, 1.5, 3, 1, 0.2); Sfx.shatter(); Sfx.zap();
    for (const e of this.enemies.getChildren()) {
      if (!e.alive || e.under) continue; const b = e.body;
      if (Math.abs(b.center.x - x) < 15 && b.bottom > y && b.top < y + 96 && this.los(x, y + 4, b.center.x, b.top + 2)) this.propHurt(p, e, 14, 0, 1, 'glass');
    }
    this.wreckProp(p, 0);
  },
  snapProp(p, ca) {                                                    // a shot through its chain or cables
    if (p.kind === 'ladle') { this.breakProp(p, 'chain', ca); return; }
    p.st = 'live'; p.hp = 0; p.falling = true; p.fvy = -20; p.fspin = rand(-3, 3); p.hits = new Set();
    Sfx.snap(); this.fxSparks(p.bx, p.ay + 4, 6, Math.PI / 2, 1.5); this.addStyle(12);
  },
  dropHanging(p) {                                                     // what it hung from is gone
    if (p.kind !== 'ladle') { this.snapProp(p); return; }
    p.st = 'live'; p.hp = 0; p.phase = 'drop'; p.falling = true; p.fvy = 0; p.hits = new Set(); Sfx.snap();
  },
  fallTube(p, dt) {
    p.fvy += 900 * dt; p.y += p.fvy * dt; p.rot += p.fspin * dt;
    for (const e of this.enemies.getChildren()) {
      if (!e.alive || e.under || p.hits.has(e) || p.fvy < 100) continue; const b = e.body;
      if (p.x + 11 > b.left && p.x - 11 < b.right && p.y + 6 > b.top && p.y < b.bottom) { p.hits.add(e); this.propHurt(p, e, 30, 0, 1, 'crush'); }
    }
    if (this.standAt(p.x, p.y + 6) || p.y > LH) { p.y = Math.floor((p.y + 6) / TS) * TS - 6; p.rot = rand(-0.08, 0.08); this.burstTube(p, p.x, p.y + 3); }
  },
  // FLOODLIGHT: the lens blows, then it topples the way it was hit and brings its head down on whoever is there
  breakFlood(p) {
    const lx = p.x + 4.5 * p.dir, ly = p.y - 18.5;
    for (let k = 0; k < 6; k++) this.spawnGib(k % 2 ? 'g_glass' : 'g_glass2', lx, ly, rand(-150, 150), rand(-200, -60), 'metal');
    this.fx.emit(lx, ly, { n: 18, speed: [40, 180], life: [0.15, 0.4], size: [2, 1], cols: [0xffffff, 0xfff2c4, 0xffe08a], add: true, g: 400, mode: 1 });
    this.spawnLight(lx, ly, 'glow', 0xfff4d8, 2.5, 5, 1, 0.2); Sfx.shatter(); Sfx.zap();
    p.fr = 'x'; p.topple = p.fdir; p.ang = 0; p.angV = 0.6;
    for (const o of [p.glow, p.beam]) if (o) o.setVisible(false);
  },
  liveFlood(p, dt) {
    p.angV += 9 * dt; p.ang = Math.min(Math.PI / 2, p.ang + p.angV * dt); p.rot = p.ang * p.topple;
    if (p.ang < Math.PI / 2) return;
    const hx = p.x + p.topple * 19, hy = p.y - 4;
    this.fxDust(hx, p.y, 8); this.fxSparks(hx, hy, 10, -Math.PI / 2, 2); Sfx.clang(0.8); Sfx.smash('x'); this.shake(120, 0.005);
    for (const e of this.enemies.getChildren()) { if (!e.alive || e.under) continue; const b = e.body; if (b.right > hx - 9 && b.left < hx + 9 && b.bottom > hy - 8 && b.top < hy + 6) this.propHurt(p, e, 45, p.topple, -0.6, 'crush'); }
    this.wreckProp(p, 2);
  },
  // FUSE BOX: the door blows off and it arcs at anything close for 3 s, then pops
  breakFuse(p) {
    p.fr = 'x'; p.t = 3; p.arcT = 0.1;
    this.spawnGib('g_door', p.x + p.dir * 2, p.y, p.fdir * rand(120, 200), rand(-220, -140), 'metal');
    this.fxSparks(p.x, p.y, 20, -Math.PI / 2, 2.2, [80, 280]); this.spawnLight(p.x, p.y, 'glow', 0x9adcff, 1, 2.6, 1, 0.2);
    Sfx.clang(0.7); Sfx.zap(); this.electrifyWater(p.x, p.y, 100);
  },
  liveFuse(p, dt) {
    p.t -= dt; p.la = Math.random();
    if (Math.random() < 0.6) this.fxSparks(p.x + rand(-4, 4), p.y + rand(-4, 6), 1, Math.PI / 2, 2, [40, 160]);
    if ((p.arcT -= dt) <= 0) {
      p.arcT = rand(0.14, 0.28);
      let tgt = null, bd = 96;
      for (const e of this.enemies.getChildren()) { if (!e.alive || e.under) continue; const d = Math.hypot(e.body.center.x - p.x, e.body.center.y - p.y); if (d < bd && this.los(p.x, p.y, e.body.center.x, e.body.center.y)) { bd = d; tgt = e; } }
      if (tgt) { this.addZap(p.x, p.y + 2, tgt.body.center.x, tgt.body.center.y, 0.09); this.propHurt(p, tgt, 8, Math.sign(tgt.body.center.x - p.x) || 1, -0.3, 'arc'); if (tgt.alive) tgt.stunT = Math.max(tgt.stunT, 0.35); }
      else { const a = rand(0, Math.PI * 2), r = rand(16, 40); this.addZap(p.x, p.y + 2, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 0.06); }
      if (Math.random() < 0.5) Sfx.zap();
      this.electrifyWater(p.x, p.y, 100);
      const pb = this.player.body;
      if (this.state !== 'dead' && Math.hypot(pb.center.x - p.x, pb.center.y - p.y) < 22 && Math.random() < 0.3) { this.addZap(p.x, p.y, pb.center.x, pb.center.y, 0.08); this.hurtPlayer(4, p.x, { knock: false, srcY: p.y, by: 'A FUSE BOX' }); }
    }
    if (p.t <= 0) { this.explode(p.x, p.y + 2, PROP_BLAST.small); this.wreckProp(p, 4); }
  },
  // CAPACITOR BANK: charges for 0.9 s, then chains lightning through up to five foes
  breakCap(p) { p.t = 0.9; p.fr = 'charge'; Sfx.pylonCharge(); this.spawnLight(p.cx, p.cy, 'glow', 0x80d0ff, 0.5, 1.6, 0.8, 0.9); },
  liveCap(p, dt) {
    p.t -= dt; p.la = 1 + (0.9 - p.t) * 3; p.jig = 0.8;
    if (Math.random() < 0.5) this.addZap(p.x + rand(-8, 8), p.y - rand(4, 20), p.x + rand(-8, 8), p.y - rand(4, 20), 0.05);
    if (p.t > 0) return;
    const hit = new Set(); let fx = p.x, fy = p.y - 18;
    for (let k = 0; k < 5; k++) {
      let tgt = null, bd = k ? 120 : 170;
      for (const e of this.enemies.getChildren()) { if (!e.alive || e.under || hit.has(e)) continue; const d = Math.hypot(e.body.center.x - fx, e.body.center.y - fy); if (d < bd && this.los(fx, fy, e.body.center.x, e.body.center.y)) { bd = d; tgt = e; } }
      if (!tgt) break;
      hit.add(tgt); const tx = tgt.body.center.x, ty = tgt.body.center.y;
      this.addZap(fx, fy, tx, ty, 0.3, 0x80c8ff, 0xffffff); this.addZap(fx, fy, tx, ty, 0.2);
      this.propHurt(p, tgt, 38, Math.sign(tx - fx) || 1, -0.4, 'arc'); if (tgt.alive) tgt.stunT = Math.max(tgt.stunT, 0.6);
      this.fxSparks(tx, ty, 8); fx = tx; fy = ty;
    }
    if (!hit.size) for (let k = 0; k < 4; k++) { const a = rand(-Math.PI, 0), r = rand(40, 90); this.addZap(p.x, p.y - 18, p.x + Math.cos(a) * r, p.y - 18 + Math.sin(a) * r, 0.25); }
    this.spawnLight(p.cx, p.cy, 'ring', 0x80e0ff, 0.3, 3, 0.9, 0.3); this.spawnLight(p.cx, p.cy, 'glow', 0xc8f0ff, 2, 5, 1, 0.3);
    Sfx.pylonZap(); Sfx.thunder(); this.shake(160, 0.006); BUS.emit('flash', 0.12);
    this.electrifyWater(p.cx, p.cy, 170);
    this.explode(p.cx, p.cy, PROP_BLAST.small);
    this.wreckProp(p, 5);
  },
  // PROPANE TANK: the valve shears into a blowtorch for a second, then it goes up and leaves the floor burning
  breakPropane(p) { p.t = 1; p.jd = p.fdir; p.fr = 'hit'; Sfx.gasHiss(); Sfx.clang(0.5); },
  livePropane(p, dt) {
    p.t -= dt; p.jig = 1.2;
    const vx = p.x + p.jd * 2, vy = p.y - 16, len = 50;
    for (let k = 0; k < 3; k++) this.fx.emit(vx, vy, { n: 1, angle: p.jd > 0 ? -0.05 : Math.PI + 0.05, spread: 0.18, speed: [220, 320], life: [0.12, 0.22], size: [4, 1], cols: [0xffffff, 0xbfe8ff, 0xffe46a, 0xff8a1f], add: true, drag: 1, g: -60 });
    if (Math.random() < 0.5) this.spawnLight(vx + p.jd * 24, vy, 'glow', 0xff9a40, 1.2, 1.8, 0.5, 0.08);
    if ((p.tick2 -= dt) <= 0) {
      p.tick2 = 0.12; Sfx.gasHiss();
      const x0 = Math.min(vx, vx + p.jd * len), x1 = Math.max(vx, vx + p.jd * len), pb = this.player.body;
      for (const e of this.enemies.getChildren()) { if (!e.alive || e.under) continue; const b = e.body; if (b.right > x0 && b.left < x1 && b.bottom > vy - 6 && b.top < vy + 6) { this.ignite(e, 2); this.propHurt(p, e, 5, p.jd, 0, 'flame'); } }
      for (const T of this.tars.slice()) if (Math.abs(T.y - vy) < 20 && T.x + T.w / 2 > x0 && T.x - T.w / 2 < x1) this.igniteTar(T);
      for (const k of this.barrelList) if (k.active && Math.abs(k.y - vy) < 10 && k.x > x0 - 5 && k.x < x1 + 5) this.igniteBarrel(k);
      for (const C of this.clouds.slice()) if (Math.abs(C.y - vy) < C.r && C.x + C.r > x0 && C.x - C.r < x1) this.igniteCloud(C);
      for (const q of this.props) if (q !== p && q.st === 'ok' && Math.abs(q.cy - vy) < q.hh + 6 && q.cx + q.hw > x0 && q.cx - q.hw < x1) { this.igniteProp(q); this.hitProp(q, 4, 'flame'); }
      if (this.state !== 'dead' && pb.right > x0 && pb.left < x1 && pb.bottom > vy - 6 && pb.top < vy + 6) this.hurtFromHazardContact(6, vx, { burn: true, srcY: vy, by: 'A PROPANE JET' });
    }
    if (p.t > 0) return;
    const x = p.cx, y = p.cy;
    for (let k = 0; k < 5; k++) this.spawnGib(k % 2 ? 'g_wht' : 'g_shard', x, y, rand(-240, 240), rand(-360, -140), 'metal');
    this.explode(x, y, PROP_BLAST.propane);
    for (const dx of [-26, 0, 26]) this.spawnFirePatch(x + dx, p.y - 4);
    this.wreckProp(p, 5);
  },
  // TOXIC DRUM: leaks where it's shot; bursts into a cloud (light it for a fireball) over a pool that eats feet
  breakToxic(p) {
    const x = p.cx, y = p.cy, fy = this.floorBelow(p.x, p.y - 4) ?? p.y;
    this.spawnCloud(x, y - 4);
    const [ax, aw] = this.spanOn(p.x, fy, 54); this.acids.push({ x: ax, y: fy, w: aw, t: 9, eat: true }); this.paintAcid(p.x, fy + 1, 12);
    this.fx.emit(x, y, { n: 30, speed: [60, 220], life: [0.3, 0.7], size: [3, 1], cols: [0xc8ff96, 0x86ec4a, 0x36961e, 0x14400c], g: 600, mode: 1 });
    for (let k = 0; k < 4; k++) this.spawnGib(k % 2 ? 'g_yel' : 'g_shard', x, y, rand(-200, 200), rand(-300, -120), 'metal');
    this.spawnLight(x, y, 'glow', 0x7dff4a, 1.5, 3.5, 0.9, 0.3);
    Sfx.splat(1); this.shake(80, 0.003);
    this.wreckProp(p, 2);
  },
  // CRYO TANK: a frost nova that freezes what's close, turns spilt water to ice and puts out fires
  breakCryo(p) {
    const x = p.cx, y = p.cy, R = 74;
    for (const e of this.enemies.getChildren()) if (e.alive && !e.under && Math.hypot(e.body.center.x - x, e.body.center.y - y) < R && this.los(x, y, e.body.center.x, e.body.center.y)) { this.chill(e, 1.2); this.propHurt(p, e, 10, Math.sign(e.body.center.x - x) || 1, -0.3, 'frost'); }
    this.douse(x, y, R + 10);
    for (const W of this.waters.slice()) if (Math.abs(W.y - p.y) < 40 && Math.max(0, Math.abs(W.x - x) - W.w / 2) < R) { this.spawnIce(W.x, W.y - 2, W.w); this.waters.splice(this.waters.indexOf(W), 1); }
    const fy = this.floorBelow(p.x, p.y - 6); if (fy !== null) { const [ix, iw] = this.spanOn(p.x, fy, 72); this.spawnIce(ix, fy - 2, iw); }
    this.fx.emit(x, y, { n: 40, speed: [60, 260], life: [0.3, 0.8], size: [2, 1], cols: [0xffffff, 0xe8fbff, 0x9adcff, 0x4ca4c8], add: true, drag: 2.2 });
    this.fx.emit(x, y, { n: 16, speed: [20, 90], life: [0.8, 1.6], size: [4, 10], cols: [0xf0fdff, 0xc8ecf8], alpha: [0.45, 0], drag: 1.6, g: 10, jitter: 4 });
    for (let k = 0; k < 6; k++) this.spawnGib(pick(['g_ice1', 'g_ice2', 'g_ice3']), x, y, rand(-220, 220), rand(-320, -100), 'metal');
    this.spawnLight(x, y, 'ring', 0xc8f0ff, 0.3, 3.2, 0.9, 0.3); this.spawnLight(x, y, 'glow', 0xa0e0ff, 2, 5, 1, 0.3);
    Sfx.freeze(); Sfx.shatter(); this.shake(120, 0.005);
    this.wreckProp(p, 0);
  },
  // OIL DRUM: leaks a slick where it's shot and spills a big one when it goes; already alight if it was burning
  breakOil(p) {
    const lit = p.burning;
    const fy = this.floorBelow(p.x, p.y - 4) ?? p.y, [sx, sw] = this.spanOn(p.x, fy, 92); this.spawnTarPatch(sx, p.y - 4, sw);
    this.fx.emit(p.cx, p.cy, { n: 26, speed: [60, 200], life: [0.3, 0.6], size: [2, 1], cols: [0x30343c, 0x0e0f12, 0x5e6470], g: 600, mode: 1 });
    for (let k = 0; k < 3; k++) this.spawnGib(k % 2 ? 'g_blk' : 'g_shard2', p.cx, p.cy, rand(-180, 180), rand(-260, -120), 'metal');
    Sfx.splat(1); Sfx.clunk();
    if (lit) { const T = this.tars.find(q => Math.abs(q.y - p.y) < 6 && Math.abs(q.x - p.x) < q.w / 2 + 4); if (T) this.igniteTar(T); }
    this.wreckProp(p, lit ? 4 : 0);
  },
  // BOILER: shots vent scalding steam and wind the needle up; at the top it screams for 1.3 s and bursts
  hitBoiler(p, dmg, x, y) {
    if (p.hp <= 0) return;
    p.jets.push({ oy: clamp(y - p.y, -24, -6), dir: x < p.x ? -1 : 1, t: 0.8, tick: 0 }); if (p.jets.length > 3) p.jets.shift();
    Sfx.steam();
  },
  updateBoilerJets(p, dt) {
    for (let i = p.jets.length - 1; i >= 0; i--) {
      const J = p.jets[i]; J.t -= dt; if (J.t <= 0) { p.jets.splice(i, 1); continue; }
      const x = p.x + J.dir * 10, y = p.y + J.oy, k = Math.min(1, J.t / 0.4);
      for (let n = 0; n < 2; n++) this.fx.emit(x, y + rand(-1, 1), { n: 1, angle: J.dir > 0 ? 0 : Math.PI, spread: 0.25, speed: [150, 240], life: [0.15, 0.3 * k + 0.05], size: [3, 8], cols: [0xffffff, 0xd8e0e8, 0xa0a8b0], alpha: [0.6, 0], drag: 2, g: -40, jitter: 2 });
      if ((J.tick -= dt) > 0) continue;
      J.tick = 0.25;
      const xl = Math.min(x, x + J.dir * 42), xr = Math.max(x, x + J.dir * 42), pb = this.player.body;
      for (const e of this.enemies.getChildren()) { if (!e.alive || e.under) continue; const b = e.body; if (b.right < xl || b.left > xr || b.bottom < y - 10 || b.top > y + 10) continue; this.propHurt(p, e, 6, J.dir, 0, 'flame'); if (e.alive) b.velocity.x += J.dir * 140 * e.def.kb; }
      if (this.state !== 'dead' && pb.right > xl && pb.left < xr && pb.bottom > y - 10 && pb.top < y + 10) this.hurtFromHazardContact(4, x, { burn: true, srcY: y, by: 'STEAM' });
      this.douse(x + J.dir * 20, y, 22);
    }
  },
  breakBoiler(p) { p.t = 1.3; p.fr = 'hot'; p.whT = 0; },
  liveBoiler(p, dt) {
    p.t -= dt; p.jig = 1 + (1.3 - p.t); p.la = 1.5 + Math.random();
    if ((p.whT -= dt) <= 0) { p.whT = 0.28; Sfx.whistle(); }
    if (Math.random() < 0.7) { const a = rand(0, Math.PI * 2); this.fx.emit(p.x + Math.cos(a) * 9, p.y - 15 + Math.sin(a) * 7, { n: 1, angle: a, spread: 0.3, speed: [60, 140], life: [0.2, 0.4], size: [2, 6], cols: [0xffffff, 0xd8e0e8], alpha: [0.6, 0], drag: 2, g: -40 }); }
    this.fx.emit(p.x - 3.5 * p.dir, p.y - 30, { n: 2, angle: -Math.PI / 2, spread: 0.2, speed: [120, 200], life: [0.2, 0.4], size: [2, 6], cols: [0xffffff, 0xe8eef4], alpha: [0.7, 0], drag: 1.5, g: -60 });
    if (p.t > 0) return;
    const x = p.cx, y = p.cy;
    this.spawnGib('g_lid', x, p.y - 28, rand(-60, 60), -520, 'metal');
    for (let k = 0; k < 7; k++) this.spawnGib(k % 3 ? 'g_cop' : 'g_plate', x, y, rand(-280, 280), rand(-380, -120), 'metal');
    this.explode(x, y, PROP_BLAST.boiler);
    this.fx.emit(x, y, { n: 40, speed: [40, 220], life: [0.8, 1.8], size: [5, 14], cols: [0xffffff, 0xe0e6ec, 0xb8c0c8], alpha: [0.6, 0], drag: 1.8, g: -30, jitter: 5 });
    Sfx.steam(); this.wreckProp(p, 6); p.steamT = 2.2;
  },
  // WALL FAN: the guard pops and its three blades fly off as ricocheting saw blades (yours)
  breakFan(p) {
    const a0 = p.blade.rotation;
    for (let k = 0; k < 3; k++) { const a = a0 + k * Math.PI * 2 / 3; this.spawnSaw(p.x + Math.cos(a) * 5, p.y + Math.sin(a) * 5, a); }
    p.blade.setVisible(false); p.grill.setVisible(false);
    for (let k = 0; k < 5; k++) this.spawnGib(k % 2 ? 'g_wire' : 'g_bar', p.x, p.y, rand(-200, 200), rand(-260, -60), 'metal');
    this.fxSparks(p.x, p.y, 18, 0, Math.PI * 2, [80, 260]); this.spawnLight(p.x, p.y, 'glow', 0xfff0c0, 1, 2.4, 0.9, 0.15);
    Sfx.sawLaunch(); Sfx.clang(0.8); this.shake(90, 0.004);
    this.wreckProp(p, 4);
  },
  // SLAG LADLE: tips and pours molten slag on whatever is under its spout for 2.4 s, then drops and splashes
  breakLadle(p) { p.phase = 'tip'; p.t = 0; Sfx.creak(); },
  liveLadle(p, dt, now) {
    if (p.phase === 'tip') {
      p.t += dt; p.rot = -p.dir * 1.75 * Math.min(1, p.t / 0.45) ** 2;
      if (p.t >= 0.45) { p.phase = 'pour'; p.t = 2.4; p.pudT = 0; Sfx.erupt(); }
      return;
    }
    if (p.phase === 'pour') {
      p.t -= dt; p.la = 1.3 + Math.random() * 0.3;
      const r = -p.sw + p.rot, lx = p.x - 11 * p.dir * Math.cos(r) - 6 * Math.sin(r), ly = p.y - 11 * p.dir * Math.sin(r) + 6 * Math.cos(r);
      const fy = this.floorBelow(lx, ly) ?? LH, k = Math.min(1, p.t / 0.4), wb = Math.sin(now / 45) * 0.6, G = this.zapG;
      G.fillStyle(0xc0340a, 0.9).fillRect(lx - 2 * k + wb, ly, 4 * k, fy - ly); G.fillStyle(0xff8a20, 1).fillRect(lx - 1.2 * k + wb, ly, 2.4 * k, fy - ly); G.fillStyle(0xffe68a, 1).fillRect(lx - 0.5 + wb, ly, 1, fy - ly);
      this.fx.emit(lx, fy - 1, { n: 3, angle: -Math.PI / 2, spread: 1.6, speed: [60, 180], life: [0.2, 0.5], size: [2, 1], cols: [0xffffff, 0xffe080, 0xff8a20, 0xc03010], add: true, g: 500, mode: 1 });
      if (Math.random() < 0.3) this.spawnLight(lx, fy - 4, 'glow', 0xff7a20, 1.4, 2.2, 0.6, 0.12);
      if ((p.pudT -= dt) <= 0) { p.pudT = 0.5; if (fy < LH) { const [px, pw] = this.spanOn(lx, fy, 30); this.puddles.push({ x: px, y: fy, w: pw, t: 3.2, tick: 0.1, fire: true }); } this.paintScorch(lx, fy + 2, 8); if (Math.random() < 0.5) Sfx.sizzle(); }
      if ((p.tick2 -= dt) <= 0) {
        p.tick2 = 0.15; const pb = this.player.body;
        for (const e of this.enemies.getChildren()) { if (!e.alive || e.under) continue; const b = e.body; if (b.right > lx - 5 && b.left < lx + 5 && b.bottom > ly && b.top < fy) { this.ignite(e, 2.5); this.propHurt(p, e, 8, 0, 1, 'flame'); } }
        for (const T of this.tars.slice()) if (Math.abs(T.y - fy) < 8 && Math.abs(T.x - lx) < T.w / 2 + 6) this.igniteTar(T);
        for (const k of this.barrelList) if (k.active && Math.abs(k.x - lx) < 8 && k.y > ly && k.y < fy + 4) this.igniteBarrel(k);
        for (const C of this.clouds.slice()) if (Math.abs(C.x - lx) < C.r && fy > C.y - C.r && ly < C.y + C.r) this.igniteCloud(C);
        for (const q of this.props) if (q !== p && q.st === 'ok' && Math.abs(q.cx - lx) < q.hw + 5 && q.cy + q.hh > ly && q.cy - q.hh < fy) { this.igniteProp(q); this.hitProp(q, 6, 'flame'); }
        if (this.state !== 'dead' && pb.right > lx - 5 && pb.left < lx + 5 && pb.bottom > ly && pb.top < fy) this.hurtFromHazardContact(8, lx, { burn: true, srcY: fy, by: 'MOLTEN SLAG' });
      }
      if (p.t <= 0) { p.phase = 'drop'; p.falling = true; p.fvy = 0; p.hits = new Set(); Sfx.snap(); this.fxSparks(p.bx, p.ay + 4, 6, Math.PI / 2, 1.5); }
      return;
    }
    p.fvy += 900 * dt; p.y += p.fvy * dt; p.rot += p.dir * dt * 1.2;            // dropping
    for (const e of this.enemies.getChildren()) {
      if (!e.alive || e.under || p.hits.has(e) || p.fvy < 100) continue; const b = e.body;
      if (p.x + 10 > b.left && p.x - 10 < b.right && p.y + 18 > b.top && p.y < b.bottom) { p.hits.add(e); this.propHurt(p, e, 80, 0, 1, 'crush'); }
    }
    if (!this.standAt(p.x, p.y + 18) && p.y < LH) return;
    const fy = Math.floor((p.y + 18) / TS) * TS, x = p.x;
    p.y = fy - 18; p.rot = -p.dir * 0.22;
    this.explode(x, fy - 6, PROP_BLAST.slag);
    { const [px, pw] = this.spanOn(x, fy, 40); this.puddles.push({ x: px, y: fy, w: pw, t: 4, tick: 0.1, fire: true }); } this.paintScorch(x, fy + 2, 14);
    for (let k = 0; k < 8; k++) this.spawnGib(k % 2 ? 'g_slag' : 'g_crust', x, fy - 6, rand(-220, 220), rand(-320, -100), 'slag');
    Sfx.smash('x'); this.shake(180, 0.008);
    this.wreckProp(p, 3); p.cool = 6;
  },
  // VENDING MACHINE: hits knock cans out; broken, it shorts and sprays a volley of fizzing cans and a couple of health orbs
  hitVending(p, dmg) {
    p.canAcc += dmg;
    while (p.canAcc >= 12) { p.canAcc -= 12; this.spawnGib('g_soda', p.x - p.dir, p.y - 3, rand(-150, 150), rand(-220, -90), 'shell'); Sfx.clunk(); }
  },
  breakVending(p) {
    p.fr = 'x'; p.t = 0.4;
    for (let k = 0; k < 12; k++) this.spawnGib(k % 2 ? 'g_glass' : 'g_glass2', p.x - 3 * p.dir + rand(-4, 4), p.y - 15 + rand(-8, 8), rand(-200, 200), rand(-240, -60), 'metal');
    this.fx.emit(p.cx - 3 * p.dir, p.cy, { n: 24, speed: [40, 180], life: [0.2, 0.5], size: [2, 1], cols: [0xffffff, 0xd8f4ff, 0x9ad4ec], add: true, g: 500, mode: 1 });
    this.fxSparks(p.cx, p.cy - 8, 14, -Math.PI / 2, 2.2); Sfx.shatter();
  },
  liveVending(p, dt) {
    p.t -= dt; p.la = Math.random() < 0.3 ? 1 : 0.1;
    if (Math.random() < 0.4) this.fxSparks(p.cx + rand(-6, 6), p.cy + rand(-10, 10), 1);
    if (p.t > 0) return;
    for (let k = 0; k < 8; k++) {
      const a = -Math.PI / 2 + rand(-1.2, 1.2), sp = rand(120, 220);
      this.fizzes.push({ x: p.cx, y: p.cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, heading: a, t: rand(0.7, 1.3), hits: new Set(), p, img: this.add.image(p.cx, p.cy, 'g_soda').setDepth(9) });
    }
    this.fx.emit(p.cx, p.cy, { n: 30, speed: [40, 200], life: [0.3, 0.7], size: [2, 5], cols: [0xffffff, 0xf0e0c8, 0xc8a070], alpha: [0.85, 0], drag: 2, g: 200 });
    this.dropOrbs(p.cx, p.cy - 6, 2);
    Sfx.gasPop(); this.shake(80, 0.003);
    this.wreckProp(p, 4);
  },
  // TERMINAL: the tubes implode, then an EMP pop stuns what's close (machines longest)
  breakTerminal(p) {
    p.t = 0.14; const x = p.cx, y = p.cy - 4;
    for (let k = 0; k < 16; k++) { const a = rand(0, Math.PI * 2), r = rand(12, 20); this.fx.emit(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7, { n: 1, angle: a + Math.PI, spread: 0.1, speed: [r * 4, r * 5], life: [0.18, 0.22], size: [2, 1], cols: [0xffffff, 0xa8ffd0], add: true }); }
    Sfx.crack();
  },
  liveTerminal(p, dt) {
    p.t -= dt; if (p.t > 0) return;
    const x = p.cx, y = p.cy - 4;
    for (let k = 0; k < 8; k++) this.spawnGib(k % 2 ? 'g_crt' : 'g_glass', x + rand(-8, 8), y, rand(-220, 220), rand(-280, -80), 'metal');
    this.fx.emit(x, y, { n: 30, speed: [60, 240], life: [0.15, 0.45], size: [2, 1], cols: [0xffffff, 0xa8ffd0, 0x46f088], add: true, g: 400, mode: 1 });
    this.spawnLight(x, y, 'glow', 0xe8fff0, 2, 4.5, 1, 0.2); this.spawnLight(x, y, 'ring', 0x80ffc0, 0.3, 2.4, 0.8, 0.25);
    for (const e of this.enemies.getChildren()) if (e.alive && !e.under && Math.hypot(e.body.center.x - x, e.body.center.y - y) < 64 && this.los(x, y, e.body.center.x, e.body.center.y)) { e.stunT = Math.max(e.stunT, e.def.mech ? 1.6 : 1); this.propHurt(p, e, e.def.mech ? 22 : 10, Math.sign(e.body.center.x - x) || 1, -0.3, 'arc'); }
    this.electrifyWater(x, y, 70);
    Sfx.emp(); Sfx.shatter(); this.shake(100, 0.004);
    this.wreckProp(p, 5);
  },
  // AMMO CRATE: cooks off for 2.4 s, spraying live rounds (yours) every which way, then pops
  breakAmmo(p) { p.fr = 'x'; p.t = 2.4; p.popT = 0; Sfx.crackle(); this.fxSparks(p.cx, p.cy, 10, -Math.PI / 2, 1.6); this.spawnLight(p.cx, p.cy, 'glow', 0xffc060, 1, 2, 0.8, 0.12); },
  liveAmmo(p, dt) {
    p.t -= dt; p.jig = 0.8;
    if (Math.random() < 0.5) this.fx.emit(p.cx + rand(-6, 6), p.y - 6, { n: 1, angle: -Math.PI / 2, spread: 0.5, speed: [20, 60], life: [0.2, 0.45], size: [4, 1], cols: [0xffffff, 0xffe46a, 0xff8a1f, 0xc03010], add: true, g: -40 });
    if ((p.popT -= dt) <= 0) {
      p.popT = rand(0.05, 0.14);
      const a = -Math.PI / 2 + rand(-1.35, 1.35), sx = p.cx + rand(-5, 5), sy = p.y - 7;
      const round = this.spawnBullet('nail', sx, sy, a, rand(380, 520), 9, 0.7); if (round) round.free = true;
      this.fx.emit(sx, sy, { n: 3, angle: a, spread: 0.5, speed: [40, 120], life: [0.05, 0.12], size: [2, 1], cols: [0xffffff, 0xffe46a], add: true });
      if (Math.random() < 0.6) this.spawnGib('g_casing', sx, sy, rand(-80, 80), rand(-200, -100), 'shell');
      if (Math.random() < 0.3) this.spawnLight(sx, sy, 'glow', 0xffd080, 0.4, 0.9, 0.7, 0.06);
      Sfx.rivet(); if (Math.random() < 0.2) Sfx.crackle();
    }
    if (p.t > 0) return;
    this.explode(p.cx, p.cy, PROP_BLAST.small);
    this.wreckProp(p, 4);
  },
  // FLARE CASE: lobs five signal flares that stick, burn and light up a blackout, then burns out
  breakFlares(p) { p.fr = 'x'; p.n = 5; p.popT = 0.05; p.t = 3; Sfx.ignite(); },
  liveFlares(p, dt) {
    p.t -= dt;
    if (Math.random() < 0.7) this.fx.emit(p.cx + rand(-6, 6), p.y - 5, { n: 1, angle: -Math.PI / 2, spread: 0.5, speed: [20, 70], life: [0.2, 0.5], size: [4, 1], cols: [0xffffff, 0xff9a9a, 0xff3a2a, 0xa01008], add: true, g: -40 });
    if (Math.random() < 0.15) this.spawnLight(p.cx, p.y - 6, 'glow', 0xff4a2a, 1.2, 1.6, 0.5, 0.15);
    if (p.n > 0 && (p.popT -= dt) <= 0) {
      p.n--; p.popT = 0.28;
      const a = -Math.PI / 2 + rand(-0.75, 0.75), sp = rand(240, 340), x = p.cx, y = p.y - 8;
      if (this.flares.length >= 10) this.dropFlare(this.flares[0]);
      this.flares.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: TUNE.FLARE.burn, stuck: false, e: null, ox: 0, oy: 0, tick: 0,
        img: this.add.image(x, y, 'flare').setDepth(16.3), glow: this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0xff4a2a).setScale(1.4).setAlpha(0.8).setDepth(16.4) });
      Sfx.flare(); this.fxSparks(x, y, 6, a, 0.6, [60, 160]);
    }
    if (p.t <= 0) this.wreckProp(p, 3);
  },
  // EXTINGUISHER: bursts into a cloud of foam: everything close is stunned, nothing in it can see out, fires in it die
  breakExt(p) {
    p.fr = 'x'; p.t = 3.6; p.fogX = p.x; p.fogY = p.y + 10;
    this.spawnGib('g_ext', p.x, p.y, p.fdir * rand(140, 220), rand(-260, -160), 'metal');
    const x = p.fogX, y = p.fogY;
    for (const e of this.enemies.getChildren()) if (e.alive && !e.under && Math.hypot(e.body.center.x - x, e.body.center.y - y) < 64) { e.stunT = Math.max(e.stunT, 1.4); this.chill(e, 0.35); }
    this.douse(x, y, 72);
    this.fx.emit(x, y, { n: 50, speed: [40, 240], life: [0.6, 1.4], size: [5, 14], cols: [0xffffff, 0xf0f4f8, 0xd8e0e8], alpha: [0.85, 0], drag: 2.6, g: 20, jitter: 5 });
    this.spawnLight(x, y, 'glow', 0xffffff, 1.5, 3.5, 0.6, 0.25);
    Sfx.steam(); Sfx.gasHiss(); Sfx.clang(0.5);
  },
  liveExt(p, dt) {
    p.t -= dt; const k = Math.min(1, p.t / 1.2), x = p.fogX, y = p.fogY;
    if (Math.random() < 0.9 * k) { const th = rand(0, Math.PI * 2), r = Math.sqrt(Math.random()) * 56; this.fx.emit(x + Math.cos(th) * r, y + Math.sin(th) * r * 0.6, { n: 1, speed: [4, 18], life: [0.8, 1.5], size: [6, 13], cols: [0xffffff, 0xe8eef4, 0xd0d8e0], alpha: [0.5 * k, 0], drag: 1, g: 6, jitter: 3 }); }
    if ((p.tick2 -= dt) <= 0) { p.tick2 = 0.2; this.douse(x, y, 60); for (const e of this.enemies.getChildren()) if (e.alive && Math.hypot(e.body.center.x - x, e.body.center.y - y) < 56) { e.sees = false; e.losT = 0.25; } }
    if (p.t <= 0) this.wreckProp(p, 0);
  },
  // WINDOW: cracks, then shatters into a rain of glass on whoever is below
  hitWindow(p) { p.fr = p.hp <= p.D.hp / 3 ? 'c2' : 'c1'; Sfx.crack(); },
  breakWindow(p) {
    const x = p.x, y = p.y;
    for (let k = 0; k < 16; k++) this.spawnGib(k % 2 ? 'g_glass' : 'g_glass2', x + rand(-15, 15), y + rand(-9, 9), rand(-160, 160) + p.fdir * 60, rand(-180, 40), 'metal');
    this.fx.emit(x, y, { n: 40, speed: [30, 180], life: [0.2, 0.7], size: [2, 1], cols: [0xffffff, 0xe0f5ff, 0x9ad4ec, 0x5a8a9a], add: true, g: 600, mode: 1 });
    this.spawnLight(x, y, 'glow', 0xd8f4ff, 2, 4, 0.8, 0.18); Sfx.shatter(); this.shake(60, 0.003);
    for (const e of this.enemies.getChildren()) { if (!e.alive || e.under) continue; const b = e.body; if (Math.abs(b.center.x - x) < 19 && b.bottom > y && b.top < y + 120 && this.los(x, y + 12, b.center.x, b.top + 2)) this.propHurt(p, e, 18, 0, 1, 'glass'); }
    this.wreckProp(p, 0);
  },
  // PA HORN: a feedback shriek: stuns and shoves everything nearby, and shatters any glass in earshot
  breakHorn(p) {
    const x = p.x + p.dir * 9, y = p.y;
    this.spawnLight(x, y, 'ring', 0xfff0d0, 0.2, 3.4, 0.8, 0.35); this.spawnLight(x, y, 'ring', 0xffe0a0, 0.1, 2.4, 0.7, 0.3); this.spawnLight(x, y, 'ring', 0xffd090, 0.05, 1.5, 0.6, 0.25);
    for (const e of this.enemies.getChildren()) {
      if (!e.alive || e.under) continue; const b = e.body, d = Math.hypot(b.center.x - x, b.center.y - y);
      if (d > 104 || !this.los(x, y, b.center.x, b.center.y)) continue;
      const f = 1 - d / 104, a = Math.atan2(b.center.y - y, b.center.x - x);
      e.stunT = Math.max(e.stunT, 0.6 + f); b.velocity.x += Math.cos(a) * 260 * f * e.def.kb; b.velocity.y += (Math.sin(a) * 160 - 120) * f * e.def.kb;
      this.propHurt(p, e, 8, Math.cos(a), Math.sin(a), 'blast');
    }
    for (const q of this.props) if (q !== p && q.st === 'ok' && q.D.mat === 'glass' && Math.hypot(q.cx - x, q.cy - y) < 112) this.hitProp(q, 40, 'sonic', q.cx, q.cy, Math.sign(q.cx - x) || 1, 0);
    this.pushRagdolls(x, y, 90, 300, 160);
    Sfx.sonic(); Sfx.wail(); this.shake(140, 0.006);
    this.wreckProp(p, 2);
  },
  // WATER TANK: leaks where it's shot; bursts in a wave that shoves foes, puts out fires and floods the floor
  breakWater(p) {
    const x = p.cx, y = p.cy;
    for (const e of this.enemies.getChildren()) {
      if (!e.alive || e.under) continue; const b = e.body, d = Math.hypot(b.center.x - x, b.center.y - y);
      if (d > 88 || !this.los(x, y, b.center.x, b.center.y)) continue;
      const f = 1 - d / 88, s = Math.sign(b.center.x - x) || 1; b.velocity.x += s * 320 * f * e.def.kb; b.velocity.y -= 140 * f * e.def.kb; e.stunT = Math.max(e.stunT, 0.4 * f);
    }
    this.douse(x, y, 100);
    this.spawnWater(p.x, p.y - 2, 124);
    this.fx.emit(x, y, { n: 50, angle: -Math.PI / 2, spread: 2.6, speed: [60, 260], life: [0.4, 0.9], size: [2, 1], cols: [0xffffff, 0xd8f8ff, 0x8ce0ff, 0x4ac8f8], g: 700, mode: 1 });
    this.fx.emit(x, y, { n: 14, speed: [20, 80], life: [0.5, 1.0], size: [4, 9], cols: [0xe8f8ff, 0xb8e0f0], alpha: [0.45, 0], drag: 2, g: -10 });
    for (let k = 0; k < 5; k++) this.spawnGib(k % 2 ? 'g_blu' : 'g_plate', x, y, rand(-220, 220), rand(-320, -120), 'metal');
    Sfx.splat(1); Sfx.gurgle(); this.shake(90, 0.004);
    this.wreckProp(p, 0);
  },

  // ---- expansion: props ----
  // The last ten breakables, and what they leave behind once they're wrecks: sand heaps, paint slicks and painted foes,
  // records in flight, a transformer's blackout. updatePropSpills runs all that every frame, after updateProps, along
  // with the last ten's idle life (propAmbient's job for the first twenty) and the sprinklers' heat sensors. Their arcs
  // keep a list of their own (arcsX), drawn with the rest of their effects.
  initPropSpills() {
    this.sands = []; this.slicks = []; this.vinyls = []; this.darks = []; this.arcsX = []; this.paintedT = 0; this.sprinkT = 0;
    this.spillG = this.add.graphics().setDepth(4.94);                   // sand heaps and paint slicks
  },
  arcX(x0, y0, x1, y1, t, c0 = 0x4ab8ff, c1 = 0xe8f8ff) { this.arcsX.push({ x0, y0, x1, y1, t, c0, c1 }); },
  updatePropSpills(dt, now) {
    if (!this.spillG) return;
    const G = this.spillG; G.clear();
    for (const p of this.props) if (p.st !== 'gone') this.propIdleX(p, dt, now);
    for (let i = this.arcsX.length - 1; i >= 0; i--) { const z = this.arcsX[i]; z.t -= dt; if (z.t <= 0) { this.arcsX.splice(i, 1); continue; } this.zapCol(this.zapG, z.x0, z.y0, z.x1, z.y1, z.c0, z.c1); }
    for (let i = this.sands.length - 1; i >= 0; i--) {                  // sand: a heap that bogs foes down and smothers fire
      const S = this.sands[i]; S.t -= dt;
      if (S.t <= 0) { this.sands.splice(i, 1); continue; }
      const h = S.h * Math.min(1, S.t / 2), half = S.w / 2;
      this.drawSand(G, S, h, half);
      if ((S.tick -= dt) <= 0) { S.tick = 0.3; this.douse(S.x, S.y - 2, half + 4); }
      for (const e of this.enemies.getChildren()) {
        if (!e.alive || e.under || FLIERS.has(e.kind)) continue; const b = e.body;
        if (Math.abs(b.center.x - S.x) > half || b.center.x < S.l || b.center.x > S.r || b.bottom < S.y - h - 4 || b.bottom > S.y + 3) continue;
        b.velocity.x *= 0.5; if (b.velocity.y < 0) b.velocity.y *= 0.85;
      }
    }
    for (let i = this.slicks.length - 1; i >= 0; i--) {                 // paint on the floor: slippery, and it marks what wades through
      const P = this.slicks[i]; P.t -= dt;
      if (P.t <= 0) { this.slicks.splice(i, 1); continue; }
      const a = Math.min(1, P.t / 1.5), x0 = Math.round(P.x - P.w / 2);
      G.fillStyle(P.dark, 0.9 * a).fillRect(x0, P.y - 2, P.w, 2); G.fillStyle(P.col, a).fillRect(x0 + 1, P.y - 2, P.w - 2, 1);
      G.fillStyle(0xffffff, 0.7 * a).fillRect(x0 + 1 + Math.floor((now / 45 + P.seed) % Math.max(1, P.w - 3)), P.y - 2, 1, 1);
      for (const e of this.enemies.getChildren()) {
        if (!e.alive || e.under || FLIERS.has(e.kind)) continue; const b = e.body;
        if (Math.abs(b.center.x - P.x) > P.w / 2 + 2 || Math.abs(b.bottom - P.y) > 4) continue;
        b.velocity.x *= 0.8; e.paintCol = P.col; e.paintT = Math.max(e.paintT || 0, 2); this.paintedT = Math.max(this.paintedT, 2);
      }
    }
    if (this.paintedT > 0) {                                            // painted foes show it, and drag their feet a little
      this.paintedT -= dt;
      for (const e of this.enemies.getChildren()) {
        if (!(e.paintT > 0)) continue;
        e.paintT -= dt; if (!e.alive) { e.paintT = 0; continue; }
        if (e.frozen > 0 || e.chill > 0.05) continue;
        e.body.velocity.x *= 0.9;
        if (e.tintKey !== e.paintCol) { e.tintKey = e.paintCol; e.setTint(e.paintCol); }
        if (Math.random() < 0.06) this.fx.emit(e.body.center.x + rand(-4, 4), e.body.bottom - 3, { n: 1, angle: Math.PI / 2, spread: 0.3, speed: [5, 20], life: [0.3, 0.5], size: [2, 1], cols: [e.paintCol], g: 300 });
      }
    }
    for (let i = this.vinyls.length - 1; i >= 0; i--) {                // the jukebox's records: spinning edges that ricochet, then shatter
      const V = this.vinyls[i]; V.t -= dt; V.vy += 380 * dt;
      const nx = V.x + V.vx * dt, ny = V.y + V.vy * dt;
      if (this.solidAt(nx, V.y)) { V.vx *= -0.75; V.bounce--; Sfx.tink(0.5); } else V.x = nx;
      if (this.solidAt(V.x, ny)) { V.vy *= -0.5; V.vx *= 0.8; V.bounce--; Sfx.tink(0.5); } else V.y = ny;
      V.img.setPosition(V.x, V.y).setRotation(V.img.rotation + V.spin * dt);
      for (const e of this.enemies.getChildren()) {
        if (!e.alive || e.under || V.hits.has(e)) continue; const b = e.body;
        if (V.x > b.left - 4 && V.x < b.right + 4 && V.y > b.top - 4 && V.y < b.bottom + 4) { V.hits.add(e); this.propHurt(V.p, e, 18, Math.sign(V.vx) || 1, -0.3, 'saw'); Sfx.squish(); }
      }
      if (V.t > 0 && V.bounce >= 0) continue;
      this.fx.emit(V.x, V.y, { n: 12, speed: [40, 150], life: [0.2, 0.5], size: [2, 1], cols: [0x121216, 0x34343e, 0xe0402a], g: 500, mode: 1 });
      for (let k = 0; k < 2; k++) this.spawnGib('g_blk', V.x, V.y, rand(-120, 120), rand(-200, -60), 'metal');
      Sfx.shatter(); V.img.destroy(); this.vinyls.splice(i, 1);
    }
    for (let i = this.darks.length - 1; i >= 0; i--) {                  // a blown transformer's blackout: lights out round it, stuttering back on
      const D = this.darks[i]; D.t -= dt;
      if (D.t <= 0) { D.img.destroy(); this.darks.splice(i, 1); for (const L of this.lamps) if (Math.hypot(L.x - D.x, L.y - D.y) < D.R) L.outUntil = 0; continue; }
      const k = Math.min(1, (D.T - D.t) / 0.12) * (D.t < 0.7 && Math.random() > D.t / 0.7 ? 0.2 : 1);
      D.img.setAlpha(0.95 * k);
      for (const L of this.lamps) if (Math.hypot(L.x - D.x, L.y - D.y) < D.R) L.outUntil = k > 0.5 ? now + 100 : 0;
      for (const q of this.props) if (q.glow && q.glow.visible && Math.hypot(q.cx - D.x, q.cy - D.y) < D.R) q.glow.setAlpha(q.glow.alpha * (1 - 0.92 * k));
    }
    if ((this.sprinkT -= dt) <= 0) {                                    // fire under a sprinkler bursts its bulb
      this.sprinkT = 0.3;
      for (const p of this.props) if (p.kind === 'sprinkler' && p.st === 'ok' && this.sprinklerHot(p)) this.breakProp(p, 'fire');
    }
  },
  propIdleX(p, dt, now) {
    const D = p.D, ok = p.st === 'ok', hurt = p.hp < D.hp;
    switch (p.kind) {
      case 'server':
        if (ok) {
          p.fr = p.hp <= D.hp * 0.5 ? 'hit' : 'ok' + (Math.floor(now / 230 + p.wob) % 3); p.la = p.flickT > 0 ? 0.2 : 0.85 + 0.15 * Math.sin(now / 70 + p.wob);
          if (hurt && Math.random() < dt * 2) this.fxSparks(p.x + rand(-5, 5), p.y - rand(6, 24), 2, -Math.PI / 2, 2, [30, 120]);
        } else if (p.ang) { const w2 = p.A.w / 2; p.img.setPosition(p.x + w2 * p.topple * (1 - Math.cos(p.ang)), p.y - w2 * Math.sin(p.ang)); }   // it tips over its bottom corner
        break;
      case 'jukebox':
        if (!ok) break;
        p.la = p.flickT > 0 ? 0.15 : 0.7 + 0.4 * Math.max(0, 1 - ((now / 480 + p.wob) % 1) * 3);                        // the lights pulse to the beat
        if (Math.random() < dt * 1.2) this.fx.emit(p.x + rand(-7, 7), p.y - 24, { n: 1, angle: -Math.PI / 2, spread: 0.6, speed: [12, 28], life: [0.8, 1.3], size: [2, 2], cols: [0xff5ac0, 0xffd23a, 0x4ce4fa], randCol: true, alpha: [0.9, 0], add: true });
        break;
      case 'vat':
        if (p.st === 'x' || p.st === 'live') break;
        p.la = 0.8 + 0.2 * Math.sin(now / 400 + p.wob);
        for (let k = 0; k < 4; k++) this.propG.fillStyle(0xc8ff96, 0.85).fillRect(Math.round(p.x - 5 + (k * 37 + p.wob * 13) % 10), Math.round(p.y - 7 - (now / 28 + k * 29 + p.wob * 50) % 12), 1, 1);
        break;
      case 'transformer':
        if (!ok) break;
        p.la = p.flickT > 0 ? 1.8 : 0.75 + 0.25 * Math.sin(now / 45);
        if (Math.random() < dt * (hurt ? 3 : 0.4)) this.arcX(p.x - 2, p.y - 10, p.x + 3, p.y - 10, 0.05);              // a spark between the bushings
        break;
      case 'gasline': if (ok && hurt && Math.random() < dt * 5) this.fx.emit(p.x + p.dir, p.y - 3, { n: 1, angle: -Math.PI / 2, spread: 0.8, speed: [10, 30], life: [0.5, 0.9], size: [2, 5], cols: [0xc8d0c0, 0xa0a898], alpha: [0.35, 0], g: -20, drag: 1 }); break;
      case 'hopper': if (ok && hurt && Math.random() < dt * 6) this.fx.emit(p.x - 6 * p.dir, p.y - 2, { n: 1, angle: Math.PI / 2, spread: 0.2, speed: [5, 15], life: [0.4, 0.6], size: [1, 1], cols: [0xd0aa6a, 0xb08a50], g: 500, mode: 1 }); break;
      case 'hydrant': if (ok && hurt && Math.random() < dt * 2) this.fx.emit(p.x + rand(-3, 3), p.y - 8, { n: 1, angle: Math.PI / 2, spread: 0.3, speed: [5, 20], life: [0.3, 0.5], size: [1, 1], cols: [0x8ce0ff], g: 600, mode: 1 }); break;
      case 'sprinkler': if (ok && Math.random() < dt * 0.25) this.fx.emit(p.x, p.y + 3, { n: 1, angle: Math.PI / 2, spread: 0.1, speed: [5, 10], life: [0.5, 0.7], size: [1, 1], cols: [0x8ce0ff], g: 600, mode: 1 }); break;
      case 'hoist': if (ok && Math.abs(p.swv) > 0.8 && (p.creakT = (p.creakT || 0) - dt) <= 0) { p.creakT = 0.7; Sfx.creak(); } break;
      default: return;
    }
    if (p.flickT > 0) p.flickT -= dt;
    if (p.glow && p.glow.visible) p.glow.setAlpha(clamp(D.light[5] * p.la * (this.powerCut ? 0.25 : 1), 0, 1));
  },
  // CHAIN HOIST: an engine block on a chain. Break it and the chain lets go a link at a time (creaks, sparks at the
  // anchor, its shadow darkening on the floor), then it drops; shoot the chain and it drops at once. It crushes
  // whatever it lands on (120; a hard hit to you) and stays as scrap.
  breakHoist(p) { p.phase = 'creak'; p.t = 0.6; p.slip = 0; Sfx.creak(); Sfx.clang(0.4); },
  liveHoist(p, dt) {
    const A = p.A;
    if (!p.falling) {
      p.t -= dt; p.jig = 1.4;
      if ((p.slip -= dt) <= 0) { p.slip = 0.15; p.swv += rand(-0.4, 0.4); this.fxSparks(p.bx, p.ay + 3, 4, Math.PI / 2, 1.4, [30, 110]); Sfx.tink(0.5); }
      this.hoistShadow(p, 1 - Math.max(0, p.t) / 0.6);
      if (p.t > 0) return;
      p.falling = true; p.fvy = 0; Sfx.snap();
    }
    if (p.phase !== 'drop') { p.phase = 'drop'; p.hits = new Set(); p.hitP = false; p.rot = -p.sw; }
    p.fvy = Math.min(p.fvy + 900 * dt, 640); p.y += p.fvy * dt; p.rot *= Math.exp(-dt * 6);
    const l = p.x - A.w / 2 + 2, r = p.x + A.w / 2 - 2, top = p.y + 5, btm = p.y + A.h;
    if (p.fvy > 80) {
      for (const e of this.enemies.getChildren()) { if (!e.alive || e.under || p.hits.has(e)) continue; const b = e.body; if (b.right > l && b.left < r && b.bottom > top && b.top < btm) { p.hits.add(e); this.propHurt(p, e, 120, 0, 1, 'crush'); } }
      const pb = this.player.body;
      if (!p.hitP && this.state !== 'dead' && pb.right > l && pb.left < r && pb.bottom > top && pb.top < btm) { p.hitP = true; this.hurtPlayer(30, p.x, { srcY: p.y, by: 'AN ENGINE BLOCK' }); }
    }
    this.hoistShadow(p, 1);
    if (!(this.standAt(p.x, btm) || this.standAt(l + 1, btm) || this.standAt(r - 1, btm) || p.y > LH)) return;
    const fy = Math.floor(btm / TS) * TS;
    p.y = fy - A.h; p.rot = 0;
    for (const e of this.enemies.getChildren()) if (e.alive && !e.under && !p.hits.has(e) && Math.abs(e.body.center.x - p.x) < 26 && Math.abs(e.body.bottom - fy) < 12) this.propHurt(p, e, 30, Math.sign(e.body.center.x - p.x) || 1, -0.7, 'crush');
    for (const q of this.props) if (q !== p && q.st === 'ok' && Math.abs(q.cx - p.x) < q.hw + 12 && Math.abs(q.cy - (fy - 8)) < q.hh + 10) this.hitProp(q, 30, 'crush', q.cx, q.cy, Math.sign(q.cx - p.x) || 1, -0.5);
    this.fxDust(p.x, fy, 14); this.fxSparks(p.x, fy - 3, 14, -Math.PI / 2, 2.6, [80, 260]);
    this.fx.emit(p.x, fy - 2, { n: 12, angle: -Math.PI / 2, spread: 2.4, speed: [30, 120], life: [0.3, 0.6], size: [2, 1], cols: [0x30343c, 0x0e0f12], g: 500, mode: 1 });   // oil
    for (let k = 0; k < 6; k++) this.spawnGib(k % 3 ? 'g_plate' : 'g_bar', p.x + rand(-7, 7), fy - 8, rand(-200, 200), rand(-280, -100), 'metal');
    Sfx.smash('x'); Sfx.clang(1); Sfx.stomp(); this.shake(220, 0.011);
    this.wreckProp(p, 3);
  },
  hoistShadow(p, k) {                                                  // where it'll land, darker as it comes
    const fy = this.floorBelow(p.x, p.y + p.A.h); if (fy === null) return;
    const w = Math.round(10 + 8 * k), x0 = Math.round(p.x - w / 2), G = this.propG;
    G.fillStyle(0x000000, 0.2 + 0.35 * k).fillRect(x0, fy - 2, w, 2); G.fillStyle(0x000000, 0.12 + 0.2 * k).fillRect(x0 + 2, fy - 3, w - 4, 1);
  },
  // SERVER RACK: sparks where it's hit; broken, it topples the way it was hit in a cascade of sparks, brains whoever
  // its top comes down on (35) and lies there arcing at foes close by for 1.4 s, lighting up any water it fell in
  hitServer(p, dmg, x, y) { p.flickT = 0.08; this.fxSparks(x, y, 3 + Math.min(6, dmg / 5 | 0), -Math.PI / 2, 2.2, [50, 190]); if (Math.random() < 0.35) Sfx.zap(); },
  breakServer(p) { p.fr = 'hit'; p.topple = p.fdir; p.ang = 0; p.angV = 0.5; p.phase = 'fall'; this.fxSparks(p.x, p.y - 20, 16, -Math.PI / 2, 2.4, [60, 220]); Sfx.crack(); Sfx.zap(); if (p.glow) p.glow.setVisible(false); },
  liveServer(p, dt) {
    const H = p.A.h, w2 = p.A.w / 2, t = p.topple;
    if (p.phase === 'fall') {
      p.angV += 8 * dt; p.ang = Math.min(Math.PI / 2, p.ang + p.angV * dt); p.rot = p.ang * t;
      const s = Math.sin(p.ang), c = Math.cos(p.ang), ox = p.x + w2 * t * (1 - c), oy = p.y - w2 * s;
      for (let k = 0; k < 2; k++) { const d = rand(6, H); this.fxSparks(ox + s * d * t, oy - c * d, 1, -Math.PI / 2, 2.6, [30, 160]); }
      if (p.ang < Math.PI / 2) return;
      const hx = p.x + t * (w2 + H - 5), cx = p.x + t * (w2 + H / 2);
      for (const e of this.enemies.getChildren()) { if (!e.alive || e.under) continue; const b = e.body; if (b.right > hx - 7 && b.left < hx + 7 && b.bottom > p.y - 16 && b.top < p.y) this.propHurt(p, e, 35, t, -0.6, 'crush'); }
      for (let k = 0; k < 4; k++) this.spawnGib(k % 2 ? 'g_wire' : 'g_plate', cx + rand(-10, 10), p.y - 8, rand(-160, 160), rand(-240, -80), 'metal');
      this.fxDust(cx, p.y, 10); this.fxSparks(cx, p.y - 7, 24, -Math.PI / 2, 2.8, [60, 260]); this.spawnLight(cx, p.y - 7, 'glow', 0x9adcff, 1.2, 3, 0.9, 0.2);
      Sfx.clang(0.9); Sfx.smash('x'); Sfx.zap(); this.shake(140, 0.006);
      this.electrifyWater(cx, p.y - 2, 64);
      p.fr = 'x'; p.phase = 'arc'; p.t = 1.4; p.arcT = 0.05;
      return;
    }
    p.t -= dt;
    const x0 = p.x + t * w2, cy = p.y - 7, along = d => x0 + t * d;
    if (Math.random() < 0.6) this.fxSparks(along(rand(2, H - 2)), cy + rand(-5, 4), 1, -Math.PI / 2, 2, [30, 140]);
    if ((p.arcT -= dt) <= 0) {
      p.arcT = rand(0.12, 0.24);
      const sx = along(rand(3, H - 3));
      let tgt = null, bd = 76;
      for (const e of this.enemies.getChildren()) { if (!e.alive || e.under) continue; const d = Math.hypot(e.body.center.x - sx, e.body.center.y - cy); if (d < bd && this.los(sx, cy, e.body.center.x, e.body.center.y)) { bd = d; tgt = e; } }
      if (tgt) { this.arcX(sx, cy, tgt.body.center.x, tgt.body.center.y, 0.09); this.propHurt(p, tgt, 7, Math.sign(tgt.body.center.x - sx) || 1, -0.3, 'arc'); if (tgt.alive) tgt.stunT = Math.max(tgt.stunT, 0.3); }
      else { const a = rand(-Math.PI, 0), r = rand(12, 32); this.arcX(sx, cy, sx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.06); }
      if (Math.random() < 0.5) Sfx.zap();
      this.electrifyWater(along(H / 2), p.y - 2, 60);
      const pb = this.player.body;
      if (this.state !== 'dead' && Math.hypot(pb.center.x - sx, pb.center.y - cy) < 22 && Math.random() < 0.3) { this.arcX(sx, cy, pb.center.x, pb.center.y, 0.08); this.hurtPlayer(4, sx, { knock: false, srcY: cy, by: 'A SERVER RACK' }); }
    }
    if (p.t <= 0) this.wreckProp(p, 4);
  },
  // JUKEBOX: a hit skips it onto a jaunty note; broken, it plays one last chord, its glass goes and it flings five
  // records that spin through foes (18 each) and ricochet before they shatter
  hitJukebox(p) {
    p.flickT = 0.1;
    if (Sfx.ok('jukeskip', 0.06)) { const f = [523, 587, 659, 784, 880, 1046][(Math.random() * 6) | 0]; Sfx.tone({ type: 'square', f0: f, dur: 0.08, vol: 0.045 }); Sfx.tone({ type: 'square', f0: f * 1.5, dur: 0.1, vol: 0.03, delay: 0.07 }); }
    this.fx.emit(p.x, p.y - 22, { n: 2, angle: -Math.PI / 2, spread: 1.4, speed: [20, 50], life: [0.5, 0.9], size: [2, 2], cols: [0xff5ac0, 0xffd23a, 0x4ce4fa], randCol: true, alpha: [0.9, 0], add: true, g: -30 });
  },
  breakJukebox(p) {
    p.fr = 'x'; p.t = 0.5;
    for (let k = 0; k < 10; k++) this.spawnGib(k % 2 ? 'g_glass' : 'g_glass2', p.x + rand(-7, 7), p.y - 20 + rand(-4, 4), rand(-180, 180), rand(-240, -60), 'metal');
    this.fx.emit(p.x, p.y - 20, { n: 26, speed: [40, 180], life: [0.2, 0.5], size: [2, 1], cols: [0xffffff, 0xffd2ee, 0xff5ac0, 0xffd23a], add: true, g: 500, mode: 1 });
    this.spawnLight(p.x, p.y - 18, 'glow', 0xff8a3a, 1.5, 3.5, 0.9, 0.25);
    if (Sfx.ok('jukechord')) [262, 330, 392, 523].forEach((f, i) => Sfx.tone({ type: i ? 'square' : 'sawtooth', f0: f, f1: f * 0.45, dur: 1.1, vol: 0.035, attack: 0.01 }));   // one last chord, winding down
    Sfx.shatter();
  },
  liveJukebox(p, dt) {
    p.t -= dt; p.la = Math.random() < 0.35 ? 1.4 : 0.15;
    if (Math.random() < 0.5) this.fxSparks(p.x + rand(-7, 7), p.y - rand(6, 20), 1, -Math.PI / 2, 2, [30, 120]);
    if (p.t > 0) return;
    for (let k = 0; k < 5; k++) {                                       // two skim out low either side, one goes up
      const a = [-0.2, -0.62, -Math.PI / 2, 0.62 - Math.PI, 0.2 - Math.PI][k] + rand(-0.1, 0.1), sp = rand(230, 300), x = p.x, y = p.y - 13;
      this.vinyls.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: rand(1.3, 1.8), spin: (k % 2 ? 1 : -1) * rand(18, 26), bounce: 2, hits: new Set(), p, img: this.add.image(x, y, 'pr_jukebox', 'disc').setDepth(9) });
    }
    this.fx.emit(p.x, p.y - 13, { n: 16, speed: [40, 160], life: [0.2, 0.4], size: [2, 1], cols: [0xffffff, 0xffe46a], add: true, drag: 2 });
    Sfx.sawLaunch(); Sfx.clang(0.6); this.shake(80, 0.004);
    this.wreckProp(p, 3);
  },
  // HYDRANT: shears off and a geyser roars up for 3 s: it throws foes skywards (and you: ride it like a jump pad),
  // puts out fires round it and floods the floor
  breakHydrant(p) {
    p.fr = 'x'; p.t = 3; p.tick2 = 0; p.pudT = 0;
    this.spawnGib('g_barrel', p.x, p.y - 12, rand(-60, 60), -460, 'metal');
    for (let k = 0; k < 3; k++) this.spawnGib(k % 2 ? 'g_plate' : 'g_barrel', p.x, p.y - 8, rand(-160, 160), rand(-260, -120), 'metal');
    this.fx.emit(p.x, p.y - 8, { n: 40, angle: -Math.PI / 2, spread: 1.6, speed: [80, 300], life: [0.4, 0.9], size: [2, 1], cols: [0xffffff, 0xd8f8ff, 0x8ce0ff, 0x4ac8f8], g: 600, mode: 1 });
    this.douse(p.x, p.y - 8, 72); this.spawnWater(p.x, p.y - 2, 110);
    Sfx.clang(0.7); Sfx.splat(1); Sfx.steam(); this.shake(90, 0.004);
  },
  liveHydrant(p, dt, now) {
    p.t -= dt;
    const k = Math.min(1, p.t / 0.5, (3 - p.t) / 0.15 + 0.3), x = p.x, base = p.y - 6, reach = 112 * k, hw = 2 + 2.5 * k, wb = Math.sin(now / 40) * 0.8;
    let top = base - reach;
    for (let y = base - 4; y > base - reach; y -= 4) if (this.solidAt(x, y)) { top = y + 4; break; }
    const G = this.propG;
    G.fillStyle(0x4ac8f8, 0.55).fillRect(x - hw - 1 + wb, top, hw * 2 + 2, base - top);
    G.fillStyle(0xa8e8ff, 0.8).fillRect(x - hw + wb, top, hw * 2, base - top);
    G.fillStyle(0xffffff, 0.85).fillRect(x - 1 + wb, top + 2, 2, Math.max(0, base - top - 2));
    for (let j = 0; j < 5; j++) { const yy = base - ((now / 2.5 + j * 29) % Math.max(1, base - top)); G.fillStyle(0xffffff, 0.75).fillRect(x - hw - 1 + wb, yy, hw * 2 + 2, 1); }   // foam rushing up it
    this.fx.emit(x, top, { n: 3, angle: -Math.PI / 2, spread: 2.6, speed: [40, 140], life: [0.3, 0.7], size: [2, 1], cols: [0xffffff, 0xd8f8ff, 0x8ce0ff], g: 600, mode: 1 });
    this.fx.emit(x + rand(-hw, hw), rand(top, base), { n: 1, speed: [10, 40], life: [0.3, 0.6], size: [3, 6], cols: [0xf0fbff, 0xc8ecf8], alpha: [0.4, 0], g: 40, drag: 2 });
    if ((p.tick2 -= dt) <= 0) {
      p.tick2 = 0.1;
      for (const e of this.enemies.getChildren()) {
        if (!e.alive || e.under) continue; const b = e.body;
        if (b.right < x - hw - 3 || b.left > x + hw + 3 || b.bottom < top || b.top > base + 6) continue;
        const kb = Math.max(0.35, e.def.kb);
        if (b.velocity.y > -300 * kb) { b.velocity.y = -470 * kb; b.velocity.x *= 0.4; e.stunT = Math.max(e.stunT, 0.5); this.propHurt(p, e, 3, 0, -1, 'blast'); }
        if (e.burnT > 0) { e.burnT = 0; e.panicT = 0; }
      }
      const pb = this.player.body;
      if (this.state !== 'dead' && pb.right > x - hw - 2 && pb.left < x + hw + 2 && pb.bottom > top && pb.top < base + 6 && pb.velocity.y > -380) { pb.velocity.y = -560; this.jumpCuttable = false; this.lastGround = -1e9; Sfx.boing(); }
      if ((p.pudT -= 0.1) <= 0) { p.pudT = 0.5; this.douse(x, base, 72); this.spawnWater(x, p.y - 2, 110); }
    }
    if (p.t <= 0) this.wreckProp(p, 0);
  },
  // GAS MAIN: the valve shears and the line vents a burning jet that dips to the floor and back for 4 s, lighting foes
  // (5 a tick, and burning), the scenery and the floor it licks; then what's left in the line goes up
  breakGasline(p) {
    p.fr = 'x'; p.t = 4; p.tick2 = 0; p.fireT = 0.2;
    this.spawnGib('g_barrel', p.x, p.y - 6, p.fdir * rand(80, 160), rand(-300, -200), 'metal');
    this.fxSparks(p.x, p.y - 2, 14, -Math.PI / 2, 2.2, [60, 220]); this.spawnLight(p.x + p.dir * 10, p.y, 'glow', 0xffa040, 1.2, 2.6, 0.9, 0.2);
    Sfx.clang(0.7); Sfx.gasHiss(); Sfx.ignite();
  },
  liveGasline(p, dt) {
    p.t -= dt;
    const age = 4 - p.t, dip = 0.08 + 0.62 * (0.5 - 0.5 * Math.cos(age * 2.6)), a = p.dir > 0 ? dip : Math.PI - dip, ca = Math.cos(a), sa = Math.sin(a);
    const nx = p.x + p.dir * 10, ny = p.y + 1, reach = 78 * Math.min(1, age / 0.25, p.t / 0.3 + 0.25);
    let len = 4, wall = false;
    for (; len < reach; len += 3) if (this.solidAt(nx + ca * len, ny + sa * len)) { wall = true; break; }
    const ex = nx + ca * len, ey = ny + sa * len;
    for (let k = 0; k < 4; k++) this.fx.emit(nx, ny, { n: 1, angle: a, spread: 0.18, speed: [len * 3.2, len * 4], life: [0.2, 0.27], size: [5, 1], cols: [0xffffff, 0xbfe8ff, 0xffe46a, 0xff8a1f, 0xc03010], add: true, drag: 1, g: -70 });
    if (wall) this.fx.emit(ex, ey, { n: 2, angle: a + Math.PI, spread: 2.4, speed: [30, 110], life: [0.15, 0.35], size: [4, 1], cols: [0xffe46a, 0xff8a1f, 0xc03010], add: true, g: -90 });
    if (Math.random() < 0.5) this.spawnLight(nx + ca * len * 0.5, ny + sa * len * 0.5, 'glow', 0xff9a40, 1.2, 2, 0.5, 0.08);
    if ((p.tick2 -= dt) > 0) { if (p.t <= 0) this.ventOut(p, nx, ny); return; }
    p.tick2 = 0.12; Sfx.gasHiss();
    const on = (x, y, pad) => { const u = clamp(((x - nx) * ca + (y - ny) * sa) / len, 0, 1); return Math.hypot(nx + ca * len * u - x, ny + sa * len * u - y) < pad; };
    for (const e of this.enemies.getChildren()) if (e.alive && !e.under && on(e.body.center.x, e.body.center.y, Math.max(e.body.halfWidth, e.body.halfHeight) + 3)) { this.ignite(e, 2.5); this.propHurt(p, e, 5, ca, sa, 'flame'); }
    for (const T of this.tars.slice()) if (Math.abs(T.y - ey) < 10 && ex > T.x - T.w / 2 - 4 && ex < T.x + T.w / 2 + 4) this.igniteTar(T);
    for (const k of this.barrelList) if (k.active && on(k.x, k.y, 9)) this.igniteBarrel(k);
    for (const C of this.clouds.slice()) if (on(C.x, C.y, C.r)) this.igniteCloud(C);
    for (const q of this.props) if (q !== p && q.st === 'ok' && on(q.cx, q.cy, Math.max(q.hw, q.hh) + 3)) { this.igniteProp(q); this.hitProp(q, 4, 'flame'); }
    const pb = this.player.body;
    if (this.state !== 'dead' && on(pb.center.x, pb.center.y, 9)) this.hurtFromHazardContact(6, nx, { burn: true, srcY: ny, by: 'A GAS MAIN' });
    if (wall && (p.fireT -= 0.12) <= 0) { p.fireT = 0.45; if (!this.puddles.some(Q => Q.fire && Math.abs(Q.x - ex) < Q.w / 2 && Math.abs(Q.y - ey) < 18)) this.spawnFirePatch(ex, ey - 6); this.paintScorch(ex, ey, 5); }
    if (p.t <= 0) this.ventOut(p, nx, ny);
  },
  ventOut(p, x, y) { this.explode(x, y, PROP_BLAST.gasline); this.wreckProp(p, 6); },
  // SAND HOPPER: the gate bursts and it pours for 3 s: the sand heaps up where it lands (for 18 s), bogs down foes
  // wading through it and smothers fire in it
  breakHopper(p) {
    p.fr = 'x'; p.t = 3; p.tick2 = 0; p.heap = null;
    this.spawnGib('g_plate', p.x, p.y + 10, p.fdir * rand(60, 140), rand(-160, -60), 'metal');
    this.fx.emit(p.x, p.y + 8, { n: 24, angle: Math.PI / 2, spread: 2.4, speed: [30, 140], life: [0.3, 0.7], size: [2, 1], cols: [0xf0d8a0, 0xd0aa6a, 0xb08a50], g: 600, mode: 1 });
    Sfx.clang(0.6); Sfx.clunk(); Sfx.splat(0);
  },
  liveHopper(p, dt, now) {
    p.t -= dt;
    const k = Math.min(1, p.t / 0.6), sx = p.x, sy = p.y + p.A.h / 2 - 1, fy = this.floorBelow(sx, sy + 2);
    if (fy !== null) {
      const S = p.heap && this.sands.includes(p.heap) ? p.heap : (p.heap = this.addSand(sx, fy)), u = (sx - S.x) / (S.w / 2 || 1);
      const top = Math.max(sy, fy - S.h * Math.max(0, 1 - u * u)), G = this.propG, wb = Math.sin(now / 50) * 0.5;
      G.fillStyle(0x8a6834, 0.9).fillRect(sx - 1.5 * k - 0.5 + wb, sy, 3 * k + 1, top - sy);
      G.fillStyle(0xe0c080, 1).fillRect(sx - 0.5 + wb, sy, 1, top - sy);
      S.h = Math.min(10, S.h + dt * 4.5 * k); S.w = Math.min(72, S.w + dt * 26 * k); S.t = Math.max(S.t, 18);
      if (Math.random() < 0.6) this.fx.emit(sx, top, { n: 1, angle: -Math.PI / 2, spread: 2.4, speed: [10, 50], life: [0.3, 0.6], size: [2, 4], cols: [0xd8c090, 0xb8a070], alpha: [0.5, 0], g: 60, drag: 2 });
      if ((p.tick2 -= dt) <= 0) {                                        // the stream puts out and pins down what it pours on
        p.tick2 = 0.2; this.douse(sx, (sy + fy) / 2, Math.max(20, (fy - sy) / 2));
        for (const e of this.enemies.getChildren()) if (e.alive && !e.under && Math.abs(e.body.center.x - sx) < e.body.halfWidth + 3 && e.body.bottom > sy && e.body.top < fy) e.stunT = Math.max(e.stunT, 0.25);
      }
    }
    if (p.t <= 0) this.wreckProp(p, 0);
  },
  addSand(x, fy) {
    const old = this.sands.find(S => Math.abs(S.y - fy) < 3 && Math.abs(S.x - x) < S.w / 2 + 8);
    if (old) return old;
    const [cx, w] = this.spanOn(x, fy, 240), S = { x, y: fy, w: 8, h: 1, t: 18, tick: 0, l: cx - w / 2, r: cx + w / 2, seed: Math.random() * 100 };
    this.sands.push(S); if (this.sands.length > 8) this.sands.shift();
    return S;
  },
  drawSand(G, S, h, half) {                                            // a heap: a parabola of sand lit along its crest, cut off where the floor ends
    if (h < 0.5) return;
    for (let dx = -Math.floor(half); dx < half; dx += 2) {
      const x = Math.round(S.x + dx); if (x < S.l || x + 2 > S.r) continue;
      const u = (dx + 1) / half, hh = Math.round(h * (1 - u * u)); if (hh <= 0) continue;
      G.fillStyle(dx < 0 ? 0xb08a50 : 0x8a6834, 1).fillRect(x, S.y - hh, 2, hh);
      G.fillStyle(dx < -half * 0.3 ? 0xf0d8a0 : 0xd0aa6a, 1).fillRect(x, S.y - hh, 2, 1);
      if (hh > 2 && (dx * 7 + S.seed) % 5 < 1) G.fillStyle(0x5e4422, 1).fillRect(x, S.y - hh + 2, 1, 1);
    }
  },
  // CHEM VAT: the glass gives and a wave of acid washes both ways along the floor till it runs off a ledge or into a
  // wall: whatever it rolls over is corroded (5 s of extra damage taken), takes 14 and gets shoved; it leaves pools
  breakVat(p) {
    p.fr = 'x';
    p.waves = [-1, 1].map(d => ({ x: p.x + d * 7, d, v: 180, left: 136, drop: 0, hits: new Set(), hitP: false, on: true }));
    for (let k = 0; k < 12; k++) this.spawnGib(k % 2 ? 'g_glass' : 'g_glass2', p.x + rand(-8, 8), p.y - 14 + rand(-8, 8), rand(-200, 200), rand(-260, -80), 'metal');
    this.fx.emit(p.x, p.y - 12, { n: 40, speed: [60, 220], life: [0.3, 0.7], size: [3, 1], cols: [0xe0ff90, 0x9aff4a, 0x4aa020, 0x1a4010], g: 600, mode: 1 });
    this.fx.emit(p.x, p.y - 12, { n: 12, speed: [10, 50], life: [0.6, 1.2], size: [4, 9], cols: [0xc8ff90, 0x6aa040], alpha: [0.4, 0], g: -30, drag: 1.5 });
    { const [ax, aw] = this.spanOn(p.x, p.y, 30); this.acids.push({ x: ax, y: p.y, w: aw, t: 8, eat: true }); } this.paintAcid(p.x, p.y + 1, 12);
    this.spawnLight(p.x, p.y - 12, 'glow', 0x7dff4a, 1.5, 3.5, 0.9, 0.3);
    Sfx.shatter(); Sfx.splat(1); Sfx.gurgle(); Sfx.sizzle(); this.shake(90, 0.004);
  },
  liveVat(p, dt) {
    const fy = p.y, pb = this.player.body, G = this.propG; let going = false;
    for (const W of p.waves || []) {
      if (!W.on) continue;
      const nx = W.x + W.d * W.v * dt;
      if (!(this.standAt(nx, fy + 1) && !this.solidAt(nx, fy - 3)) || (W.left -= W.v * dt) <= 0) {   // over the edge or into a wall: it splashes and is gone
        W.on = false; Sfx.splat(0);
        this.fx.emit(W.x, fy - 2, { n: 14, angle: -Math.PI / 2 + W.d * 0.4, spread: 1.4, speed: [40, 160], life: [0.3, 0.6], size: [2, 1], cols: [0xe0ff90, 0x9aff4a, 0x4aa020], g: 600, mode: 1 });
        continue;
      }
      going = true; W.x = nx; W.v = Math.max(110, W.v - 50 * dt);
      const hgt = 3 + 4 * Math.min(1, W.left / 60);
      for (let i = 0; i < 10; i++) { const h = Math.round(hgt * (1 - i / 10)); if (h > 0) G.fillStyle(i < 2 ? 0xe0ff90 : 0x7dd040, 0.9).fillRect(Math.round(W.x - W.d * i * 2), fy - h, 2, h); }   // the crest, trailing off behind
      this.fx.emit(W.x, fy - hgt, { n: 2, angle: -Math.PI / 2 + W.d * 0.6, spread: 0.9, speed: [40, 120], life: [0.2, 0.45], size: [2, 1], cols: [0xe0ff90, 0x9aff4a, 0x4aa020], g: 500, mode: 1 });
      if ((W.drop -= W.v * dt) <= 0) { W.drop = 14; const [ax, aw] = this.spanOn(W.x - W.d * 8, fy, 14); this.acids.push({ x: ax, y: fy, w: aw, t: 6, eat: true }); if (this.acids.length > 60) this.acids.shift(); this.paintAcid(W.x, fy + 1, 5); }
      for (const e of this.enemies.getChildren()) {
        if (!e.alive || e.under || FLIERS.has(e.kind) || W.hits.has(e)) continue; const b = e.body;
        if (b.left > W.x + 6 || b.right < W.x - 6 || Math.abs(b.bottom - fy) > 10) continue;
        W.hits.add(e); this.propHurt(p, e, 14, W.d, -0.5, 'acid');
        if (e.alive) { e.corrodeT = Math.max(e.corrodeT, 5); b.velocity.x += W.d * 160 * e.def.kb; b.velocity.y -= 90 * e.def.kb; }
      }
      if (!W.hitP && this.state !== 'dead' && pb.left < W.x + 6 && pb.right > W.x - 6 && Math.abs(pb.bottom - fy) < 8) { W.hitP = true; this.hurtFromHazardContact(8, W.x, { burn: true, srcY: fy, by: 'AN ACID WAVE' }); this.pCorrodeT = Math.max(this.pCorrodeT, TUNE.SLUG.corrode); }
    }
    if (!going) this.wreckProp(p, 0);
  },
  // TRANSFORMER: hits crackle and arc off it; broken, it hums up for half a second, then dumps its charge into every
  // foe in 120 px (34 and a stun, machines longer), lights up water near it and blacks out the lights round it for 4 s
  hitTransformer(p) {
    p.flickT = 0.1;
    const a = rand(0, Math.PI * 2), r = rand(10, 24); this.arcX(p.x, p.y - 4, p.x + Math.cos(a) * r, p.y - 4 + Math.sin(a) * r, 0.07);
    if (Math.random() < 0.5) Sfx.zap();
  },
  breakTransformer(p) { p.fr = 'hit'; p.t = 0.5; Sfx.pylonCharge(); Sfx.buzz(); this.fxSparks(p.x, p.y - 8, 18, -Math.PI / 2, 2.4, [60, 220]); },
  liveTransformer(p, dt) {
    p.t -= dt; p.jig = 1; p.la = 1.2 + Math.random();
    if (Math.random() < 0.6) { const a = rand(0, Math.PI * 2), r = rand(8, 30); this.arcX(p.x, p.y - 6, p.x + Math.cos(a) * r, p.y - 6 + Math.sin(a) * r, 0.05); }
    if (p.t > 0) return;
    const x = p.x, y = p.y; let n = 0;
    for (const e of this.enemies.getChildren()) {
      if (!e.alive || e.under) continue; const ex = e.body.center.x, ey = e.body.center.y;
      if (Math.hypot(ex - x, ey - y) > 120 || !this.los(x, y, ex, ey)) continue;
      this.arcX(x, y, ex, ey, 0.3, 0x80c8ff, 0xffffff); this.arcX(x, y, ex, ey, 0.2); this.fxSparks(ex, ey, 8); n++;
      this.propHurt(p, e, 34, Math.sign(ex - x) || 1, -0.4, 'arc'); if (e.alive) e.stunT = Math.max(e.stunT, e.def.mech ? 1.4 : 0.8);
    }
    for (let k = n; k < 5; k++) { const a = rand(-Math.PI, Math.PI), r = rand(40, 100); this.arcX(x, y, x + Math.cos(a) * r, y + Math.sin(a) * r, 0.25); }
    this.electrifyWater(x, y, 170);
    this.darks.push({ x, y, R: 200, t: 4, T: 4, img: this.add.image(x, y, 'glow').setTint(0x000000).setDepth(15.85).setScale(13).setAlpha(0) });
    this.spawnLight(x, y, 'ring', 0x80e0ff, 0.3, 3.4, 0.9, 0.3); this.spawnLight(x, y, 'glow', 0xc8f0ff, 2, 5, 1, 0.25);
    this.explode(x, y, PROP_BLAST.transformer);
    Sfx.pylonZap(); Sfx.thunder(); Sfx.emp(); BUS.emit('flash', 0.14);
    this.wreckProp(p, 6);
  },
  // PAINT CANS: they burst in three bright colours: paint over the floor and walls round them, over foes close by (it
  // shows for 7 s and slows them a touch), and slicks on the floor that slow whatever wades through. Cooked off, they
  // go up burning.
  breakPaint(p, src) {
    const x = p.x, y = p.y - 6, fy = p.y;
    PAINT_COLS.forEach((col, k) => {
      const dx = (k - 1) * 9;
      this.fx.emit(x + dx * 0.4, y, { n: 22, angle: -Math.PI / 2 + (k - 1) * 0.5, spread: 2.2, speed: [80, 280], life: [0.5, 1.1], size: [2, 2], cols: [col], randCol: true, g: 700, mode: 2 });
      this.paintBlot(x + dx, fy + 1, 9, col);
      const [sx, sw] = this.spanOn(x + dx * 2.2, fy, 26); this.slicks.push({ x: sx, y: fy, w: sw, t: 12, col, dark: (col >> 1) & 0x7f7f7f, seed: Math.random() * 100 });
    });
    if (this.slicks.length > 18) this.slicks.splice(0, this.slicks.length - 18);
    for (const d of [-1, 1]) for (let xx = 0; xx < 48; xx += 3) if (this.solidAt(x + d * xx, y - 4)) { this.paintBlot(x + d * xx, y - 6, 8, PAINT_COLS[d > 0 ? 2 : 0]); break; }   // and up a wall, if one is close
    for (const e of this.enemies.getChildren()) {
      if (!e.alive || e.under) continue; const ex = e.body.center.x, ey = e.body.center.y;
      if (Math.hypot(ex - x, ey - y) > 64 || !this.los(x, y, ex, ey)) continue;
      e.paintT = 7; e.paintCol = PAINT_COLS[clamp(Math.round((ex - x) / 24) + 1, 0, 2)]; this.paintedT = Math.max(this.paintedT, 7);
      e.body.velocity.x += (Math.sign(ex - x) || 1) * 120 * e.def.kb; e.body.velocity.y -= 60 * e.def.kb;
    }
    if (src === 'fire' || p.burning) for (const dx of [-14, 14]) this.spawnFirePatch(x + dx, fy - 4);
    for (let k = 0; k < 3; k++) this.spawnGib('g_wht', x + (k - 1) * 4, y, rand(-180, 180), rand(-320, -160), 'metal');
    Sfx.splat(1); Sfx.clunk(); Sfx.bubblePop(); this.shake(60, 0.003);
    this.wreckProp(p, 0);
  },
  paintBlot(x, y, r, col) {                                            // paint, not blood: one colour in a few shades, on tile pixels only
    const c = this.lvlCtx, cr = (col >> 16) & 255, cg = (col >> 8) & 255, cb = col & 255;
    c.globalCompositeOperation = 'source-atop';
    for (let i = 0, n = Math.round(r * r * 1.4); i < n; i++) {
      const a = rand(0, Math.PI * 2), d = Math.sqrt(Math.random()) * r, s = rand(0.72, 1.12);
      c.fillStyle = `rgb(${Math.min(255, cr * s) | 0},${Math.min(255, cg * s) | 0},${Math.min(255, cb * s) | 0})`;
      c.fillRect((x + Math.cos(a) * d) | 0, (y + Math.sin(a) * d * 0.7) | 0, Math.random() < 0.3 ? 2 : 1, Math.random() < 0.15 ? randi(2, 4) : 1);
    }
    c.globalCompositeOperation = 'source-over'; this.lvlMark(x, y, r + 4);
  },
  // SPRINKLER HEAD: shoot it, or let fire burn under it, and it rains on everything below for 3.5 s: fires out,
  // burning foes put out, water on the floor
  breakSprinkler(p) {
    p.fr = 'x'; p.t = 3.5; p.tick2 = 0; p.pudT = 0; p.fy = this.floorBelow(p.x, p.y + 6) ?? p.y + 160;
    this.fx.emit(p.x, p.y + 1, { n: 8, speed: [30, 120], life: [0.2, 0.4], size: [2, 1], cols: [0xffffff, 0xffb0a0, 0xff3a2a], add: true, g: 400, mode: 1 });
    Sfx.snap(); Sfx.gasHiss();
  },
  liveSprinkler(p, dt) {
    p.t -= dt;
    const k = Math.min(1, p.t / 0.6, (3.5 - p.t) / 0.2 + 0.2), hy = p.y + 3, fy = p.fy;
    for (let n = 0; n < 6 * k; n++) this.fx.emit(p.x, hy, { n: 1, angle: Math.PI / 2, spread: 2, speed: [50, 150], life: [0.5, 1], size: [1, 2], cols: [0xe8fbff, 0x8ce0ff, 0x4ac8f8], alpha: [0.9, 0.5], g: 500, mode: 1 });
    if (Math.random() < 0.5 * k) this.fx.emit(p.x + rand(-40, 40), fy - 2, { n: 2, angle: -Math.PI / 2, spread: 1.6, speed: [20, 60], life: [0.15, 0.3], size: [1, 1], cols: [0xd8f8ff, 0x8ce0ff], g: 400 });
    if ((p.tick2 -= dt) <= 0) {
      p.tick2 = 0.25;
      this.douse(p.x, fy - 4, 52); this.douse(p.x, (hy + fy) / 2, (fy - hy) / 2 + 8);
      if ((p.pudT -= 0.25) <= 0) { p.pudT = 0.75; this.spawnWater(p.x, fy - 2, 84); }
    }
    if (p.t <= 0) this.wreckProp(p, 0);
  },
  sprinklerHot(p) {                                                    // fire within a couple of tiles either side, anywhere under the head
    const x = p.x, y0 = p.y, y1 = (this.floorBelow(x, p.y + 6) ?? p.y + 160) + 4, inZone = (qx, qy, pad) => Math.abs(qx - x) < 40 + pad && qy > y0 && qy < y1;
    for (const Q of this.puddles) if (Q.fire && inZone(Q.x, Q.y - 1, Q.w / 2)) return true;
    for (const e of this.enemies.getChildren()) if (e.alive && e.burnT > 0 && inZone(e.body.center.x, e.body.center.y, 0)) return true;
    for (const q of this.props) if (q.burning && inZone(q.cx, q.cy, q.hw)) return true;
    for (const F of this.flares) if (inZone(F.x, F.y, 0)) return true;
    return false;
  },

  // ------------------------------------------------------------- slag tide ----
  // MELTDOWN (wave 5): every ~11 s the floor seams glow, then molten slag floods the ground floor 28 px deep for
  // 6 s. Wading in it burns you (5 per 0.4 s) and sets the unfireproof alight; ticks, gibs and drums go up.
  updateTide(dt, now) {
    const T = TUNE.TIDE;
    if (!this.tide) this.tide = { y: T.floor + 8, phase: 'calm', t: T.calm * 0.45, tick: 0 };
    const td = this.tide;
    if ((this.mod !== 'melt' || this.state === 'won') && td.phase !== 'drain') td.phase = 'drain';
    td.t -= dt;
    const ease = k => k * k * (3 - 2 * k), lo = T.floor + 2;
    switch (td.phase) {
      case 'calm': td.y = T.floor + 8; if (td.t <= 0 && this.state === 'play') { td.phase = 'warn'; td.t = T.warn; BUS.emit('callout', 'SLAG TIDE!'); Sfx.roar(); Sfx.rumble(1); } break;
      case 'warn': td.y = lo; this.shake(60, 0.0015); break;
      case 'rise': td.y = lo + (T.top - lo) * ease(clamp(1 - td.t / T.rise, 0, 1)); break;
      case 'hold': td.y = T.top; break;
      case 'fall': td.y = lo + (T.top - lo) * ease(clamp(td.t / T.fall, 0, 1)); break;
      case 'drain': td.y = approach(td.y, T.floor + 8, 16 * dt); if (td.y >= T.floor + 8) { this.tide = null; this.tideG.clear(); this.tideFG.clear(); this.tideGlow.setAlpha(0); return; } break;
    }
    if (td.t <= 0) {
      if (td.phase === 'warn') { td.phase = 'rise'; td.t = T.rise; Sfx.erupt(); }
      else if (td.phase === 'rise') { td.phase = 'hold'; td.t = T.hold; }
      else if (td.phase === 'hold') { td.phase = 'fall'; td.t = T.fall; }
      else if (td.phase === 'fall') { td.phase = 'calm'; td.t = T.calm * rand(0.85, 1.15); }
    }
    const lvl = td.y, deep = lvl < T.floor - 1;
    if (deep && (td.tick -= dt) <= 0) {
      td.tick = T.tick;
      const pb = this.player.body;
      if (this.state !== 'dead' && (!this.campaign || this.mod === 'melt') && pb.bottom > lvl + 2) { this.hurtPlayer(T.dmg, pb.center.x, { knock: false, iframes: false, burn: true, srcY: pb.bottom + 12 }); this.fxFire(pb.center.x, pb.bottom - 4, 6); Sfx.sizzle(); }
      for (const e of this.enemies.getChildren()) {
        if (!e.alive || e.under || FLIERS.has(e.kind) || e.def.molten || e.def.slagproof || e.kind === 'pyro' || e.kind === 'burrower' || e.body.bottom <= lvl + 2) continue;
        if (e.kind === 'tick') this.tickBoom(e); else this.ignite(e, 1.5);
      }
      for (const k of this.barrelList) if (k.active && k.y + 6 > lvl) this.damageBarrel(k, 30, 0.4);
      for (const pr of this.props || []) if (pr.st === 'ok' && pr.cy + pr.hh > lvl) this.igniteProp(pr);   // the slag cooks off what burns...
      this.propsIn((px, py, r) => py + r > lvl, 8, 'flame', 0, -1, true);                                   // ...and wears down the rest
      for (const rd of this.ragdolls) if (rd.pts[2].y > lvl) rd.burnT = Math.max(rd.burnT || 0, 1.5);
    }
    if (deep) for (const g of this.gibList) if (g.active && g.y > lvl + 1 && !(g.hot > 0)) {   // meat sizzles away
      this.fx.emit(g.x, lvl, { n: 3, angle: -Math.PI / 2, spread: 1, speed: [20, 70], life: [0.2, 0.4], size: [2, 1], cols: [0xffe080, 0xff8a20], add: true, g: -30 });
      g.disableBody(true, true);
    }
    this.drawTide(now);
  },
  drawTide(now) {
    const td = this.tide, g = this.tideG, f = this.tideFG; g.clear(); f.clear();
    if (!td) return;
    const T = TUNE.TIDE, v = this.cameras.main.worldView, base = T.floor + 4, t = now / 1000;
    const x0 = Math.max(2 * TS, Math.floor(v.x / 2) * 2), x1 = Math.min(LW - 2 * TS, v.right + 2);
    if (td.phase === 'warn') {                                            // the seams start to glow
      const a = 0.4 + 0.4 * Math.sin(now / 70);
      g.fillStyle(0xff6a10, a); g.fillRect(x0, T.floor - 1, x1 - x0, 2);
      if (Math.random() < 0.6) this.fx.emit(rand(x0, x1), T.floor - 1, { n: 1, angle: -Math.PI / 2, spread: 0.5, speed: [30, 90], life: [0.2, 0.5], size: [2, 1], cols: [0xffe080, 0xff8a20], add: true, g: 200 });
    }
    if (td.y >= base - 1) { this.tideGlow.setAlpha(0); return; }
    for (let x = x0; x < x1; x += 2) {
      const off = Math.round(Math.sin(x * 0.07 + t * 2.3) * 1.2 + Math.sin(x * 0.19 - t * 3.4) * 0.8), top = Math.round(td.y) + off;
      if (top >= base) continue;
      g.fillStyle(0x8a2006, 1); g.fillRect(x, top, 2, base - top);
      g.fillStyle(0xd84a0c, 1); g.fillRect(x, top, 2, Math.min(base - top, 6));
      f.fillStyle(0xc83a08, 0.5); f.fillRect(x, top + 2, 2, base - top - 2);                       // what wades in it shows through, tinted
      f.fillStyle(0xffa030, 0.95); f.fillRect(x, top, 2, Math.min(base - top, 2));
      if ((x / 2 + Math.floor(t * 12)) % 9 === 0) { f.fillStyle(0xfff0b0, 1); f.fillRect(x, top, 2, 1); }
      if ((x / 2 + Math.floor(t * 3)) % 23 < 3) { f.fillStyle(0x3a1a10, 0.7); f.fillRect(x, top + 2, 2, 2); }   // cooling crust rafts
    }
    this.tideGlow.setPosition(this.camX, td.y).setScale(v.width / 20, 1.8).setAlpha(clamp((base - td.y) / 20, 0, 1) * 0.35);
    if (Math.random() < 0.6) this.fx.emit(rand(x0, x1), td.y + 1, { n: 1, angle: -Math.PI / 2, spread: 0.6, speed: [20, 60], life: [0.2, 0.5], size: [2, 1], cols: [0xfff0b0, 0xffa030, 0xff5a1a], add: true, g: 200 });   // bubbles
  },

  // ---------------------------------------------------------------- tar ----
  // Tar Spitter lobs: sticky black puddles that halve your run speed and sap your jump. Any fire (the hose,
  // a blast, burning bodies, fire puddles) lights a puddle into a long burn, and it spreads to touching tar.
  spawnTarPatch(x, y, w = 40) {
    for (let yy = y - 4; yy < y + 70; yy += 2) if (this.standAt(x, yy)) {
      const sy = Math.floor(yy / TS) * TS, [sx, sw] = this.spanOn(x, sy, w);
      const P = this.tars.find(q => Math.abs(q.y - sy) < 2 && Math.abs(q.x - sx) < (q.w + sw) / 2);
      if (P) { const l = Math.min(P.x - P.w / 2, sx - sw / 2), r = Math.max(P.x + P.w / 2, sx + sw / 2); [P.x, P.w] = this.spanOn((l + r) / 2, sy, Math.min(110, r - l)); P.t = Math.max(P.t, 14); }
      else this.tars.push({ x: sx, y: sy, w: sw, t: 14, grow: 0, bub: rand(0.2, 0.8), seed: Math.random() * 1000, gone: false });
      this.fx.emit(x, sy - 1, { n: 10, angle: -Math.PI / 2, spread: 1.6, speed: [40, 140], life: [0.3, 0.6], size: [2, 1], cols: [0x2a2018, 0x140e0a, 0x4a3c30], g: 600, mode: 1 });
      Sfx.splat(1);
      return;
    }
  },
  updateTars(dt, now) {
    this.tarT = Math.max(0, this.tarT - dt);
    const pb = this.player.body, alive = this.state !== 'dead', g = this.tarG; g.clear();
    let inTar = false;
    for (let i = this.tars.length - 1; i >= 0; i--) {
      const P = this.tars[i]; if (!P || P.gone) continue;
      P.t -= dt; P.grow = Math.min(1, P.grow + dt * 5);
      if (P.t <= 0) { this.tars.splice(i, 1); continue; }
      const half = P.w / 2 * P.grow;
      if (alive && Math.abs(pb.center.x - P.x) < half + 3 && Math.abs(pb.bottom - P.y) < 4) { inTar = true; this.tarT = Math.max(this.tarT, 0.25); }
      for (const e of this.enemies.getChildren()) {
        if (!e.alive || FLIERS.has(e.kind) || e.kind === 'tarspit' || e.under) continue;
        const b = e.body; if (Math.abs(b.center.x - P.x) > half + 2 || Math.abs(b.bottom - P.y) > 4) continue;
        if (e.burnT > 0 || e.def.molten) { this.igniteTar(P); break; }
        b.velocity.x *= 0.55;                                            // they wade too
      }
      if (P.gone) continue;
      for (const Q of this.puddles) if (Q.fire && Math.abs(Q.y - P.y) < 6 && Math.abs(Q.x - P.x) < (Q.w + P.w) / 2) { this.igniteTar(P); break; }
      if (P.gone) continue;
      for (const rd of this.ragdolls) if (rd.burnT > 0 && Math.abs(rd.pts[2].x - P.x) < half && Math.abs(rd.pts[2].y - P.y) < 10) { this.igniteTar(P); break; }
      if (P.gone) continue;
      if ((P.bub -= dt) <= 0) { P.bub = rand(0.4, 1.4); this.fx.emit(P.x + rand(-half, half) * 0.8, P.y - 2, { n: 1, angle: -Math.PI / 2, spread: 0.3, speed: [5, 20], life: [0.2, 0.4], size: [2, 1], cols: [0x4a3c30, 0x2a2018], g: 200 }); }
      this.drawTar(g, P, half, now);
    }
    if (inTar && !this.inTar) Sfx.splat(0);
    this.inTar = inTar;
    if (this.tarT > 0 && alive && Math.random() < 0.35) this.fx.emit(pb.center.x + rand(-4, 4), pb.bottom - 3, { n: 1, angle: Math.PI / 2, spread: 0.4, speed: [10, 30], life: [0.3, 0.5], size: [2, 1], cols: [0x1a1410, 0x3a3028], g: 300 });   // sticky boots
  },
  drawTar(g, P, half, now) {                                           // glossy black: a dark slab with a brown sheen and crawling speculars so it reads on any floor
    const x0 = Math.round(P.x - half), w = Math.round(half * 2), y = P.y, a = Math.min(1, P.t / 1.5);
    if (w < 4) return;
    g.fillStyle(0x0c0907, 0.97 * a); g.fillRect(x0, y - 2, w, 3); g.fillRect(x0 + 2, y - 3, w - 4, 1);
    for (let k = 0; k < Math.floor(w / 12); k++) { const lx = x0 + 3 + Math.floor((P.seed * (k + 1) * 37) % Math.max(1, w - 8)); g.fillRect(lx, y - 4, 4, 1); }   // lumps
    g.fillStyle(0x6a5640, 0.85 * a); g.fillRect(x0 + 2, y - 3, w - 4, 1);                       // sheen along the top
    g.fillStyle(0x2a2018, 0.9 * a); g.fillRect(x0, y + 1, w, 1);                                 // stain where it meets the floor
    for (let k = 0; k < 2; k++) {                                                                 // speculars crawling along the surface
      const gx = x0 + 2 + Math.floor((now / (34 + k * 13) + P.seed * (k + 1)) % Math.max(1, w - 6));
      g.fillStyle(0xd8c4a0, 0.7 * a); g.fillRect(gx, y - 3, 2, 1);
    }
  },
  igniteTar(P) {
    if (!P || P.gone) return; P.gone = true;
    const i = this.tars.indexOf(P); if (i >= 0) this.tars.splice(i, 1);
    this.puddles.push({ x: P.x, y: P.y, w: P.w + 6, t: TUNE.TARSPIT.burnT, tick: 0.1, fire: true, tar: true });
    for (let xx = P.x - P.w / 2; xx <= P.x + P.w / 2; xx += 10) this.paintScorch(xx, P.y + 2, 7);
    for (let k = 0; k < P.w / 5; k++) this.fxFire(P.x + rand(-P.w / 2, P.w / 2), P.y - 2, 2);
    this.spawnLight(P.x, P.y - 6, 'glow', 0xff8a20, 2, 3 + P.w / 30, 0.8, 0.35);
    Sfx.tarIgnite(); this.shake(120, 0.004);
    let lit = 0;
    for (const e of this.enemies.getChildren()) if (e.alive && Math.abs(e.body.center.x - P.x) < P.w / 2 + 4 && Math.abs(e.body.bottom - P.y) < 8) { this.ignite(e, 3); lit++; }
    if (lit >= 2) { BUS.emit('callout', 'TAR FIRE!'); this.addStyle(50); }
    for (const Q of this.tars.slice()) if (Math.abs(Q.y - P.y) < 6 && Math.abs(Q.x - P.x) < (Q.w + P.w) / 2 + 10) this.time.delayedCall(140, () => this.igniteTar(Q));   // runs along touching tar
  },
  updateRails(dt, now) {
    if (!this.rails.length) return;
    if (this.campaign && this.campaignMachinery !== 'rails') { this.railG.clear(); return; }
    const T = TUNE.RAILS, C = this.railCyc, G = this.railG, pb = this.player.body;
    C.t -= dt;
    if (C.t <= 0) {
      if (C.st === 'idle') { C.st = 'warn'; C.t = T.warn; Sfx.railHum(); }
      else if (C.st === 'warn') { C.st = 'live'; C.t = T.live; Sfx.pylonZap(); this.shake(90, 0.003); }
      else { C.st = 'idle'; C.t = rand(T.idle[0], T.idle[1]); C.g = 1 - C.g; }
    }
    G.clear();
    for (const R0 of this.rails) {
      const on = R0.g === C.g && C.st !== 'idle', live = on && C.st === 'live', w = R0.x1 - R0.x0;
      G.fillStyle(0x6a4a2a, 0.6).fillRect(R0.x0, R0.y - 1, w, 1);
      if (!on) continue;
      if (!live) { if (Math.floor(now / 110) % 2) G.fillStyle(0xffd040, 0.8).fillRect(R0.x0, R0.y - 2, w, 2); if (Math.random() < 0.3) this.fxSparks(R0.x0 + Math.random() * w, R0.y - 1, 1, -Math.PI / 2, 1, [30, 90]); continue; }
      G.fillStyle(0x9ae8ff, 0.45 + 0.3 * Math.random()).fillRect(R0.x0, R0.y - 2, w, 2);
      for (let k = 0; k < 3; k++) {                                     // crawling arcs along it
        let x = R0.x0 + Math.random() * w, y = R0.y - 1; G.lineStyle(1, 0xe0f8ff, 0.8);
        for (let j = 0; j < 4; j++) { const nx = x + rand(-6, 6), ny = R0.y - 1 - rand(0, 9); G.lineBetween(x, y, nx, ny); x = nx; y = ny; }
      }
      if ((R0.tick -= dt) > 0) continue;
      R0.tick = T.tick;
      if (this.state !== 'dead' && pb.center.x > R0.x0 && pb.center.x < R0.x1 && Math.abs(pb.bottom - R0.y) < 3) { this.hurtPlayer(T.dmg, pb.center.x, { knock: false, iframes: false, srcY: R0.y, by: 'A LIVE RAIL' }); this.fxSparks(pb.center.x, pb.bottom - 2, 4, -Math.PI / 2, 1.4, [40, 140]); Sfx.jellyZap(); }
      for (const e of this.enemies.getChildren()) {
        if (!e.alive || e.under || FLIERS.has(e.kind)) continue;
        const b = e.body; if (b.center.x < R0.x0 || b.center.x > R0.x1 || Math.abs(b.bottom - R0.y) > 3) continue;
        this.damageEnemy(e, T.edmg, 0, -1, 'arc'); if (e.alive) { e.stunT = Math.max(e.stunT, 0.3); b.velocity.y = Math.min(b.velocity.y, -90 * Math.max(0.2, e.def.kb)); }
      }
      for (const rd of this.ragdolls) if (rd.pts[2].x > R0.x0 && rd.pts[2].x < R0.x1 && Math.abs(rd.pts[2].y - R0.y) < 14) for (const q of rd.pts) { q.vy = -rand(80, 160); rd.asleep = false; }
    }
  },

  // ================================================================== expansion: arenas ====
  // ARENAS 06-10 (OVERTIME, DAILY and the Lab, never the campaign). An arena record names its machinery (flood, vault,
  // storm, crusher, turbine) and setupArenaMachinery builds its state; any other arena leaves this.xm false, so
  // updateArenaMachinery never runs there. Every hazard telegraphs, hurts foes as well as you, and stands down while no
  // foe is left (the perk break between waves, the lift, the death beat): a cycle under way winds down and no new one
  // starts. The Lab runs it regardless, so an empty room still shows it.
  setupArenaMachinery() {
    const A = this.A, lab = !!this.lab;
    this.flood = this.vault = this.storm = this.crusher = this.turbine = null;   // the scene object outlives a restart
    this.xm = !!(A.flood || A.vault || A.storm || A.crusher || A.turbine);
    if (!this.xm) return;
    if (A.lampTint) for (const L of this.lamps) { L.cone.setTint(A.lampTint); L.gl.setTint(A.lampTint); }
    if (A.backdrop || A.storm) for (const o of this.children.list) if (o.texture && (o.texture.key === 'bgFar' || o.texture.key === 'bgMid')) o.setVisible(false);   // its own back wall (or sky)
    if (A.backdrop) { const sf = BG.mid, offX = (VIEW_W - VIEW_W / ZOOM) / 2, offY = (VIEW_H - VIEW_H / ZOOM) / 2; this.add.image(offX * (1 - sf) - BG.pad, offY * (1 - sf) - BG.pad, xaLazyTex(this, 'xa_bg_' + A.backdrop)).setOrigin(0).setScrollFactor(sf).setDepth(-20); }
    if (A.flood) {
      const F = A.flood;
      this.flood = { F, st: 'idle', t: lab ? 2.5 : F.first, k: 0, y: F.floor, live: false, zap: false, n: 0, tick: 0, cable: 0, cableK: 0, alarmT: 0, wet: false,
        g: this.add.graphics().setDepth(4.9), fg: this.add.graphics().setDepth(7.6), cg: this.add.graphics().setDepth(6.4),
        lights: [[2 * TS + 4, 18 * TS], [98 * TS - 4, 18 * TS], [44 * TS + 4, 17 * TS - 6], [56 * TS - 4, 17 * TS - 6]].map(([x, y]) => this.add.image(x, y, 'glow').setBlendMode(ADD).setAlpha(0).setScale(1.5).setDepth(18)),
        reels: F.cables.map(x => this.add.image(x, 2 * TS + 5, 'glow').setBlendMode(ADD).setTint(0xff3020).setAlpha(0).setScale(0.6).setDepth(18)) };
    }
    if (A.vault) {
      const V = A.vault;
      const sheets = V.ice.map(([x0, x1, row], i) => ({ x: (x0 + x1) / 2 * TS, y: row * TS, w: (x1 - x0) * TS, t: Infinity, grow: 1, glint: i * 1.7, perm: true, x0: (x0 + x1) / 2 * TS, w0: (x1 - x0) * TS, gone: 0 }));
      this.ices.push(...sheets);
      this.vault = { V, sheets, g: this.add.graphics().setDepth(4.97), snowT: 0,
        icicles: V.icicles.map(([tx, ty], i) => {
          const x = tx * TS + 8, y = (ty + 1) * TS;
          return { x, y, st: 'grow', k: lab ? 0.55 + 0.04 * i : rand(0, 0.7), rate: 1 / rand(V.grow[0], V.grow[1]), t: 0, fy: this.floorBelow(x, y + 2, 420) ?? LH, py: y, vy: 0,
            shot: false, hitP: false, img: this.add.sprite(x, y, 'xa_icicle', 'i0').setOrigin(0.5, 0).setDepth(4.7) };
        }),
        vents: V.vents.map(([x, y], i) => ({ x, y, st: 'idle', t: lab ? 1.2 + i * 0.9 : rand(V.vent.idle[0], V.vent.idle[1]), tick: 0 })) };
    }
    if (A.storm) {
      const S = A.storm, sf = BG.far, offX = (VIEW_W - VIEW_W / ZOOM) / 2, offY = (VIEW_H - VIEW_H / ZOOM) / 2;
      const sky = this.add.image(offX * (1 - sf) - BG.pad, offY * (1 - sf) - BG.pad, xaLazyTex(this, 'xa_sky')).setOrigin(0).setScrollFactor(sf).setDepth(-19);   // over the indoor backdrop
      this.storm = { S, sky, flash: this.add.image(sky.x, sky.y, xaLazyTex(this, 'xa_skyflash')).setOrigin(0).setScrollFactor(sf).setDepth(-18.9).setBlendMode(ADD).setAlpha(0), flashA: 0, amb: 2,
        marks: [], next: lab ? 1.5 : rand(S.every[0], S.every[1]) + 2, gust: { st: 'idle', t: lab ? 4 : S.gust.first, dir: 1, k: 0 },
        g: this.add.graphics().setDepth(16.4), rain: this.add.graphics().setDepth(16.5) };
    }
    if (A.crusher) this.crusher = { C: A.crusher, st: 'idle', t: lab ? 3 : A.crusher.first, k: 0, hit: new Map(), pHit: 0, alarmT: 0, rumbleT: 0, blink: false, g: this.add.graphics().setDepth(7.3) };
    if (A.turbine) {
      const T = A.turbine;
      this.turbine = { T, clock: 0, spin: 0, g: this.add.graphics().setDepth(4.95), bg: this.add.graphics().setDepth(16.4), gust: { st: 'idle', t: lab ? 3 : T.gust.first, dir: 1, k: 0 },
        fans: T.fans.map(([x, top]) => ({ x, top, img: this.add.sprite(x, 25 * TS, 'xa_fan', 'f0').setOrigin(0.5, 0).setDepth(4.8) })),
        rotors: T.rotors.map(([x, y, ph]) => ({ x, y, ph, ang: ph * 2, w: 0, hit: new Map(), pHit: 0, whirT: 0,
          img: this.add.image(x, y, 'xa_rotor').setDepth(7.2), hub: this.add.image(x, y, 'xa_hub').setDepth(7.25), lamp: this.add.image(x, y, 'glow').setBlendMode(ADD).setScale(0.4).setDepth(18) })),
        nac: this.add.sprite(5 * TS - 2, 7 * TS, 'xa_turbine', 't0').setDepth(1.4) };
    }
  },
  arenaCalm() { return !this.lab && (this.enemiesLeft <= 0 || this.state !== 'play'); },   // no foes left: the machinery stands down
  updateArenaMachinery(dt, now) {
    const calm = this.arenaCalm();
    if (this.flood) this.updateFlood(dt, now, calm);
    if (this.vault) this.updateVault(dt, now, calm);
    if (this.storm) this.updateStorm(dt, now, calm);
    if (this.crusher) this.updateCrusher(dt, now, calm);
    if (this.turbine) this.updateTurbine(dt, now, calm);
  },

  // ---------------------------------------------------------------- coolant flood ----
  // ARENA 06: every 10-14 s the klaxons sound and the lights spin (2.6 s), then coolant pours in from the wall inlets
  // and fills the basin to just under the first tier (3 s), holds (6 s) and drains (3.5 s). Wading slows you and foes
  // and puts out anything burning; drums, cans, gibs and corpses float. After the first flood, 45% go LIVE: the reel
  // lamp flashes red from the klaxon on, and when the water tops out a cable drops in (1.4 s) and the water carries
  // current until it has drained: 6 per 0.35 s to you in it, 14 and a jolt to foes.
  updateFlood(dt, now, calm) {
    const W = this.flood, F = W.F, pb = this.player.body, ease = k => k * k * (3 - 2 * k);
    W.t -= dt;
    if (calm && (W.st === 'warn' || W.st === 'rise' || W.st === 'hold')) { W.st = W.k > 0 ? 'drain' : 'idle'; W.t = rand(F.idle[0], F.idle[1]); }
    if (calm) W.zap = false;
    switch (W.st) {
      case 'idle':
        if (calm) W.t = Math.max(W.t, 2);
        if (W.t <= 0) {
          W.st = 'warn'; W.t = F.warn; W.alarmT = 0; W.live = W.n > 0 && Math.random() < F.live; W.cable = randi(0, F.cables.length - 1); W.n++;
          BUS.emit('callout', 'COOLANT FLOOD'); Sfx.rumble(0.6);
        }
        break;
      case 'warn': if (W.t <= 0) { W.st = 'rise'; Sfx.gurgle(); Sfx.steam(); } break;
      case 'rise':
        W.k = Math.min(1, W.k + dt / F.rise);
        if (W.k >= 1) { W.st = 'hold'; W.t = F.hold; if (W.live) { W.cableK = 0.001; BUS.emit('callout', 'LIVE CABLE!'); Sfx.pylonCharge(); } }
        break;
      case 'hold': if (W.t <= 0) W.st = 'drain'; break;
      case 'drain': W.k = Math.max(0, W.k - dt / F.drain); if (W.k <= 0) { W.st = 'idle'; W.t = rand(F.idle[0], F.idle[1]); W.live = W.zap = false; } break;
    }
    if ((W.st === 'warn' || W.st === 'rise') && (W.alarmT -= dt) <= 0) { W.alarmT = 0.55; Sfx.alarm(); }
    W.y = F.floor - (F.floor - F.top) * ease(W.k);
    const cx = F.cables[W.cable];
    if (W.live && !calm && W.cableK > 0 && W.cableK < 1 && (W.st === 'hold' || W.st === 'drain')) {   // the cable comes down, spitting sparks
      W.cableK = Math.min(1, W.cableK + dt / F.cable);
      if (W.cableK >= 1) { W.zap = true; W.tick = 0; Sfx.emp(); Sfx.zap(); this.shake(220, 0.006); BUS.emit('flash', 0.08); this.spawnLight(cx, W.y, 'ring', 0xa8f0ff, 0.4, 2.4, 1, 0.35); }
    } else if (!W.zap) W.cableK = Math.max(0, W.cableK - dt * 1.5);
    const alarm = W.st === 'warn' || W.st === 'rise' || W.st === 'hold', spinA = alarm ? 0.35 + 0.35 * Math.sin(now / 90) : 0;
    for (const L of W.lights) L.setTint(W.live ? 0xff4020 : 0x40e0ff).setAlpha(spinA);
    W.reels.forEach((L, i) => L.setAlpha(W.live && i === W.cable && W.st !== 'idle' ? (Math.floor(now / 110) % 2 ? 0.95 : 0.15) : 0));
    if (W.st === 'warn' || W.st === 'rise') for (const dir of [1, -1]) {   // the inlets pour
      const ix = dir > 0 ? 2 * TS + 2 : 98 * TS - 2, n = W.st === 'rise' ? 3 : 1;
      this.fx.emit(ix, 18 * TS + crand(-8, 8), { n, angle: dir > 0 ? 0.35 : Math.PI - 0.35, spread: 0.3, speed: [80, 160], life: [0.4, 0.8], size: [3, 2], cols: [0xd8fbff, 0x7ae0f0, 0x2a9ab0], alpha: [0.85, 0.3], g: 500, cosmetic: true });
    }
    const y = W.y, wet = W.k > 0.02;
    let zapNow = false;
    if (W.zap && !calm && (W.tick -= dt) <= 0) { W.tick = F.tick; zapNow = true; }
    if (wet) {
      if (this.state !== 'dead' && pb.bottom > y + 2) {
        if (!W.wet) { W.wet = true; this.fx.emit(pb.center.x, y, { n: 10, angle: -Math.PI / 2, spread: 1.4, speed: [40, 120], life: [0.3, 0.6], size: [2, 1], cols: [0xffffff, 0x9ae8f0], g: 500, cosmetic: true }); }
        this.chillT = Math.max(this.chillT, 0.12);                                                     // wading: x0.7, as chilled
        if (pb.velocity.y > 90) pb.velocity.y = approach(pb.velocity.y, 90, 1400 * dt);                // you sink slowly
        if (zapNow && this.hurtPlayer(F.dmg, pb.center.x, { knock: false, iframes: false, srcY: y, by: 'A LIVE FLOOD' })) { this.fxSparks(pb.center.x, pb.bottom - 4, 5, -Math.PI / 2, 1.6, [40, 140]); Sfx.jellyZap(); }
      } else W.wet = false;
      for (const e of this.enemies.getChildren()) {
        if (!e.alive || e.under || FLIERS.has(e.kind) || e.body.bottom <= y + 2) continue;
        e.burnT = 0; e.panicT = 0; if (!e.def.noFreeze) e.chill = Math.max(e.chill || 0, 0.45);
        if (zapNow) { this.damageEnemy(e, F.edmg, 0, -1, 'arc'); if (e.alive) e.stunT = Math.max(e.stunT, 0.3); }
      }
      for (let j = this.puddles.length - 1; j >= 0; j--) if (this.puddles[j].fire && this.puddles[j].y > y) { this.puddles.splice(j, 1); Sfx.sizzle(); }
      for (const k of this.barrelList) if (k.active && k.y + 4 > y) { k.body.velocity.y = approach(k.body.velocity.y, -50, 900 * dt); k.body.velocity.x *= Math.pow(0.4, dt); if (k.burning) { k.burning = false; k.fuse = -1; Sfx.sizzle(); } }
      for (const k of this.canisterList) if (k.active && k.state === 'idle' && k.y + 4 > y) k.body.velocity.y = approach(k.body.velocity.y, -40, 900 * dt);
      for (const gb of this.gibList) if (gb.active && gb.y > y && !(gb.stuckT > 0)) gb.body.velocity.y = approach(gb.body.velocity.y, -25, 900 * dt);
      for (const rd of this.ragdolls) for (const q of rd.pts) if (q.y > y) { q.vy -= 900 * dt; q.vx *= Math.pow(0.3, dt); rd.asleep = false; rd.burnT = 0; }
    } else W.wet = false;
    this.drawFlood(now, calm);
  },
  drawFlood(now, calm) {
    const W = this.flood, F = W.F, g = W.g, f = W.fg, cg = W.cg; g.clear(); f.clear(); cg.clear();
    if (W.cableK > 0) {                                                  // the cable, its sheath and the sparking clamp
      const x = W.cable !== undefined ? F.cables[W.cable] : 0, y0 = 2 * TS + 9, y1 = y0 + (W.y + 3 - y0) * W.cableK, sway = Math.sin(now / 260) * 2 * (1 - W.cableK);
      cg.lineStyle(3, 0x14161a, 1).lineBetween(x, y0, x + sway, y1); cg.lineStyle(1, 0x5a636e, 1).lineBetween(x - 1, y0, x - 1 + sway, y1);
      for (let yy = y0 + 8; yy < y1 - 6; yy += 22) cg.fillStyle(0xe8b422, 1).fillRect(x - 2 + sway * (yy - y0) / Math.max(1, y1 - y0), yy, 4, 2);
      cg.fillStyle(0x2a2e35, 1).fillRect(x - 3 + sway, y1 - 6, 6, 7); cg.fillStyle(0xd0d8e0, 1).fillRect(x - 2 + sway, y1, 1, 2); cg.fillStyle(0xd0d8e0, 1).fillRect(x + 1 + sway, y1, 1, 2);
      if (!calm && fxRandom() < 0.6) this.fx.emit(x + sway, y1 + 1, { n: 2, speed: [40, 160], life: [0.1, 0.3], size: [2, 1], cols: [0xffffff, 0xa8f0ff, 0x4ab8ff], add: true, g: 400, cosmetic: true });
    }
    if (W.k <= 0.002) return;
    const v = this.cameras.main.worldView, t = now / 1000, y = W.y, live = W.zap;
    const x0 = Math.max(2 * TS, Math.floor(v.x / 2) * 2), x1 = Math.min(98 * TS, v.right + 2);
    const ty0 = Math.floor((y - 2) / TS);
    for (let x = x0; x < x1; x += 2) {
      const off = Math.round(Math.sin(x * 0.06 + t * 2.1) * 1.3 + Math.sin(x * 0.17 - t * 3.1) * 0.7), top = Math.round(y) + off;
      for (let ty = ty0, run = -1; ty <= 25; ty++) {                     // it fills every open cell under its surface, round girders and crates
        const open = ty < 25 && !this.solidAt(x, ty * TS + 1);
        if (open && run < 0) run = Math.max(top, ty * TS);
        if (!open && run >= 0) {
          const bot = ty * TS; run = run < bot ? run : -1;
          if (run >= 0) { g.fillStyle(0x0a3440, 0.9).fillRect(x, run, 2, bot - run); f.fillStyle(live ? 0x2ab0d8 : 0x1a8498, 0.42).fillRect(x, run, 2, bot - run); }   // what wades in it shows through, tinted
          run = -1;
        }
      }
      if (this.solidAt(x, top + 1)) continue;
      g.fillStyle(0x16606e, 0.95).fillRect(x, top, 2, 5);
      f.fillStyle(live ? (fxRandom() < 0.5 ? 0xffffff : 0xa8f0ff) : 0x7ae0ec, 0.95).fillRect(x, top, 2, 1);
      if ((x / 2 + Math.floor(t * 9)) % 11 === 0) f.fillStyle(0xffffff, 0.8).fillRect(x, top, 2, 1);
    }
    if (live) {                                                           // current crawling over the surface
      f.lineStyle(1, 0xe0f8ff, 0.9);
      for (let k = 0; k < 6; k++) { let x = crand(x0, x1), yy = y; for (let s = 0; s < 4; s++) { const nx = x + crand(-7, 7), ny = y - crand(0, 6); f.lineBetween(x, yy, nx, ny); x = nx; yy = ny; } }
      if (fxRandom() < 0.15) this.spawnLight(crand(x0, x1), y, 'glow', 0x80d8ff, 1.2, 1.8, 0.5, 0.12);
    }
  },

  // ---------------------------------------------------------------- the chill vault ----
  // ARENA 07: sheet ice over the floors and shelves (the CHILLER's ice, but it lasts; fire melts a patch and it freezes
  // over again 4 s later). You and foes slide on it. Icicles grow under the roof and the solid shelves (6-9 s); grown,
  // they wait, then shake and cast a dark shadow where they'll land (1 s) and drop: 16 and a chill to you, 45 to a foe,
  // and they shatter into a slick. Shoot one (or blast it) and it drops at once. Cryo vents in the floor hiss (0.9 s)
  // and puff a frost column (1.4 s): it chills you (x0.7, 3 a tick), chills foes toward an ice statue and ices the floor.
  updateVault(dt, now, calm) {
    const W = this.vault, V = W.V, VV = V.vent, pb = this.player.body, G = W.g; G.clear();
    const live = W.sheets.filter(S => this.ices.includes(S));
    for (const S of W.sheets) {                                          // the vault's ice lasts: put back what a chiller's sheet or a fire changed
      S.t = Infinity; S.x = S.x0; S.w = S.w0;
      if (live.includes(S)) { S.gone = 0; continue; }
      if ((S.gone += dt) > 4 && !this.puddles.some(Q => Q.fire && Math.abs(Q.y - S.y) < 6 && Math.abs(Q.x - S.x) < (Q.w + S.w) / 2)) { S.gone = 0; S.grow = 0; this.ices.push(S); Sfx.iceForm(); }
    }
    for (const e of this.enemies.getChildren()) {                        // foes slide too: slow to get going, slower to stop
      if (!e.alive || e.under || FLIERS.has(e.kind)) continue;
      const b = e.body, prev = e.slideVx ?? b.velocity.x;
      if ((b.blocked.down || b.touching.down) && live.some(S => Math.abs(b.bottom - S.y) < 4 && Math.abs(b.center.x - S.x) < S.w / 2)) b.velocity.x = prev + (b.velocity.x - prev) * Math.min(1, dt * 2.5);
      e.slideVx = b.velocity.x;
    }
    for (const I of W.icicles) {
      if (I.st === 'gone') { if ((I.t -= dt) <= 0) { I.st = 'grow'; I.k = 0; I.img.setVisible(true).setPosition(I.x, I.y); } continue; }
      if (I.st === 'grow') { I.k = Math.min(1, I.k + dt * I.rate); if (I.k >= 1) { I.st = 'ripe'; I.t = rand(V.ripe[0], V.ripe[1]); } }
      else if (I.st === 'ripe') { if (!calm) I.t -= dt; if (I.t <= 0) { I.st = 'tell'; I.t = V.tell; I.fy = this.floorBelow(I.x, I.y + 2, 420) ?? LH; Sfx.crack(); } }
      else if (I.st === 'tell') {
        if (calm) { I.st = 'ripe'; I.t = 1.5; }
        else { if (fxRandom() < 0.25) this.fx.emit(I.x, I.y + 4 + 18 * I.k, { n: 1, angle: Math.PI / 2, spread: 0.1, speed: [10, 30], life: [0.3, 0.5], size: [1, 1], cols: [0xd8f4ff], g: 600, cosmetic: true }); if ((I.t -= dt) <= 0) this.dropIcicle(I, false); }
      }
      if (I.st === 'fall') {
        I.vy = Math.min(900, I.vy + 1100 * dt); I.py += I.vy * dt; I.img.setPosition(I.x, I.py);
        const tip = I.py + 4 + 18 * I.k;
        if (this.state !== 'dead' && !I.hitP && pb.right > I.x - 3 && pb.left < I.x + 3 && pb.bottom > I.py && pb.top < tip) {
          I.hitP = true;
          if (!calm && this.hurtPlayer(V.dmg, I.x, { srcY: I.py, by: 'AN ICICLE' })) this.chillT = Math.max(this.chillT, 1);
          this.shatterIcicle(I, I.x, Math.min(tip, pb.top + 4)); continue;
        }
        const hit = this.enemies.getChildren().find(e => e.alive && !e.under && e.body.right > I.x - 3 && e.body.left < I.x + 3 && e.body.bottom > I.py && e.body.top < tip);
        if (hit) {
          this.damageEnemy(hit, V.edmg, 0, 1, 'crush');
          if (!hit.alive && I.shot) { BUS.emit('callout', 'ICED!'); this.addStyle(50); }
          this.shatterIcicle(I, I.x, Math.min(tip, hit.body.top + 4)); continue;
        }
        if (tip >= I.fy || this.solidAt(I.x, tip)) this.shatterIcicle(I, I.x, Math.min(tip, I.fy));
        continue;
      }
      I.img.setFrame('i' + Math.min(4, Math.floor(I.k * 4.99)));
      I.img.setPosition(I.x + (I.st === 'tell' ? (Math.floor(now / 45) % 2 ? 1 : -1) : 0), I.y);
      if (I.st === 'ripe' || I.st === 'tell') {                           // its shadow on the floor below: darker as it's about to go
        const tell = I.st === 'tell', a = tell ? 0.7 + 0.2 * Math.sin(now / 50) : 0.3, w = tell ? 18 : 10;
        G.fillStyle(0x040a14, a).fillEllipse(I.x, I.fy - 1, w, tell ? 5 : 3);
        if (tell && Math.floor(now / 90) % 2) for (const s of [-1, 1]) G.fillStyle(0xa8e8ff, 0.95).fillRect(I.x + s * (w / 2 + 2) - 1, I.fy - 4, 2, 3);   // flashing brackets either side
      }
    }
    for (const vt of W.vents) {
      vt.t -= dt;
      if (vt.st === 'idle') { if (calm) vt.t = Math.max(vt.t, 1); if (vt.t <= 0) { vt.st = 'tell'; vt.t = VV.tell; Sfx.hiss(); } continue; }
      if (vt.st === 'tell') {
        G.fillStyle(0x6ae0ff, 0.4 + 0.4 * Math.sin(now / 60)).fillRect(vt.x - 9, vt.y - 1, 18, 2);
        if (fxRandom() < 0.5) this.fx.emit(vt.x + crand(-7, 7), vt.y - 2, { n: 1, angle: -Math.PI / 2, spread: 0.3, speed: [15, 40], life: [0.3, 0.6], size: [2, 4], cols: [0xffffff, 0xc8f0ff], alpha: [0.6, 0], g: -20, cosmetic: true });
        if (vt.t <= 0) { vt.st = 'puff'; vt.t = VV.puff; vt.tick = 0; Sfx.steam(); Sfx.freeze(); this.spawnIce(vt.x, vt.y - 2, 44); }
        continue;
      }
      this.fx.emit(vt.x + crand(-6, 6), vt.y - 2, { n: 2, angle: -Math.PI / 2, spread: 0.35, speed: [70, 140], life: [0.35, 0.6], size: [4, 10], cols: [0xffffff, 0xd8f4ff, 0x9ad0f0], alpha: [0.7, 0], g: -30, drag: 1.5, cosmetic: true });
      G.fillStyle(0xd8f4ff, 0.12).fillRect(vt.x - VV.w / 2, vt.y - VV.h, VV.w, VV.h);
      if ((vt.tick -= dt) <= 0) {
        vt.tick = VV.tick;
        const x0 = vt.x - VV.w / 2, x1 = vt.x + VV.w / 2, y0 = vt.y - VV.h, y1 = vt.y;
        if (!calm && this.state !== 'dead' && pb.right > x0 && pb.left < x1 && pb.bottom > y0 && pb.top < y1) { this.chillT = Math.max(this.chillT, 1.6); this.hurtPlayer(VV.dmg, vt.x, { knock: false, iframes: false, srcY: vt.y, by: 'A CRYO VENT' }); }
        for (const e of this.enemies.getChildren()) {
          if (!e.alive || e.under) continue;
          const b = e.body; if (b.right < x0 || b.left > x1 || b.bottom < y0 || b.top > y1) continue;
          this.chill(e, VV.chill); this.damageEnemy(e, 4, 0, -1, 'cryo');
        }
        this.douse(vt.x, vt.y - 4, 16);
      }
      if (vt.t <= 0) { vt.st = 'idle'; vt.t = rand(VV.idle[0], VV.idle[1]); }
    }
    if ((W.snowT -= dt) <= 0) {                                          // frost motes drifting down
      W.snowT = 0.09; const v = this.cameras.main.worldView;
      this.fx.emit(crand(v.x, v.right), v.y + crand(0, 40), { n: 1, angle: Math.PI / 2, spread: 0.6, speed: [8, 24], life: [3, 5], size: [1, 1], cols: [0xe8f8ff], alpha: [0.7, 0], add: true, cosmetic: true });
    }
  },
  dropIcicle(I, shot) {
    if (I.st === 'fall' || I.st === 'gone') return;
    I.st = 'fall'; I.vy = shot ? 60 : 0; I.py = I.y; I.shot = shot; I.hitP = false; I.fy = this.floorBelow(I.x, I.y + 2, 420) ?? LH;
    I.img.setFrame('i' + Math.min(4, Math.floor(I.k * 4.99))); Sfx.crack();
    this.fx.emit(I.x, I.y + 1, { n: 6, speed: [20, 70], life: [0.2, 0.4], size: [2, 1], cols: [0xffffff, 0xc8f0ff], g: 400, cosmetic: true });
  },
  shatterIcicle(I, x, y) {
    I.st = 'gone'; I.t = rand(this.vault.V.regrow[0], this.vault.V.regrow[1]); I.img.setVisible(false);
    this.fx.emit(x, y - 2, { n: 16, angle: -Math.PI / 2, spread: Math.PI * 1.4, speed: [50, 170], life: [0.3, 0.7], size: [2, 1], cols: [0xffffff, 0xd8f4ff, 0x9ad0f0, 0x5a90c0], g: 600, mode: 1, cosmetic: true });
    this.spawnLight(x, y - 4, 'glow', 0xa8e0ff, 0.6, 1.2, 0.6, 0.15); Sfx.shatter();
    this.spawnIce(x, y, 26);
    for (const p of this.props) if (p.st === 'ok' && Math.abs(p.cx - x) < p.hw + 4 && Math.abs(p.cy - y) < p.hh + 8) this.hitProp(p, 20, 'crush', x, y, 0, 1);
    for (const k of this.barrelList) if (k.active && Math.hypot(k.x - x, k.y - y) < 12) this.damageBarrel(k, 15, 1);
  },
  hitIcicleAt(x, y) {                                                    // a shot through one: grown, it drops; still small, it breaks off
    for (const I of this.vault.icicles) {
      if (I.st === 'gone' || I.st === 'fall' || I.k < 0.2 || Math.abs(x - I.x) > 4 || y < I.y - 1 || y > I.y + 5 + 18 * I.k) continue;
      if (I.k >= 0.4) this.dropIcicle(I, true); else this.shatterIcicle(I, I.x, I.y + 4);
      return true;
    }
    return false;
  },
  blastIcicles(x, y, R) {
    for (const I of this.vault.icicles) if (I.st !== 'gone' && I.st !== 'fall' && I.k >= 0.2 && Math.hypot(I.x - x, I.y + 9 * I.k - y) < R + 6) { if (I.k >= 0.4) this.dropIcicle(I, true); else this.shatterIcicle(I, I.x, I.y + 4); }
  },

  // ---------------------------------------------------------------- the storm roof ----
  // ARENA 08: rain, and the clouds flash now and then. Every 2.4-4.2 s lightning picks a spot (the highest of a few
  // tries, one near you a third of the time), marks it with a crackling ring and a faint column for 1.3 s, then
  // strikes the first surface under it: 22 to you within 16 px of the bolt, 50 and a 0.6 s jolt to foes, drums and
  // cans lit, scenery cooked and spilt water electrified. Every 7-10 s a gust: streaks blow in (1.6 s) and the wind
  // shoves you, foes and anything loose sideways at 115 px/s for 3.2 s, unless solid cover is up to 5 tiles upwind.
  updateStorm(dt, now, calm) {
    const W = this.storm, S = W.S, G = W.g; G.clear();
    if ((W.next -= dt) <= 0) {
      W.next = rand(S.every[0], S.every[1]);
      const tg = calm || W.marks.length > 1 ? null : this.stormTarget();
      if (tg) { W.marks.push({ x: tg.x, y: tg.y, t: S.warn }); Sfx.pylonCharge(); }
    }
    for (let i = W.marks.length - 1; i >= 0; i--) {
      const M = W.marks[i]; M.t -= dt;
      if (calm) { W.marks.splice(i, 1); continue; }
      const k = 1 - M.t / S.warn, flick = fxRandom() < 0.5 ? 1 : 0.6, r = S.r * (1.6 - 0.6 * k);
      G.fillStyle(0xc8e0ff, (0.05 + 0.2 * k) * flick).fillRect(M.x - 1, 0, 2, M.y);                                     // the charge gathering over it
      G.lineStyle(1, 0xe0f0ff, (0.45 + 0.45 * k) * flick).strokeEllipse(M.x, M.y - 1, r * 2, 5);
      G.lineStyle(1, 0x6aa0ff, 0.6 * flick).strokeEllipse(M.x, M.y - 1, r * 1.2, 3);
      if (fxRandom() < 0.35 + 0.4 * k) this.fx.emit(M.x + crand(-r, r), M.y - 1, { n: 1, angle: -Math.PI / 2, spread: 0.6, speed: [20, 70], life: [0.1, 0.25], size: [2, 1], cols: [0xffffff, 0xa8d0ff], add: true, g: 200, cosmetic: true });
      if (M.t <= 0) { W.marks.splice(i, 1); this.lightningStrike(M.x, M.y); }
    }
    if ((W.amb -= dt) <= 0) { W.amb = crand(3, 8); W.flashA = Math.max(W.flashA, crand(0.35, 0.7)); }   // sheet lightning far off
    W.flashA = Math.max(0, W.flashA - dt * 3.2); W.flash.setAlpha(W.flashA);
    this.updateGust(W.gust, S.gust, dt, now, calm, 0, 'GUST');
    this.drawRain(now, W);
  },
  stormTarget() {
    const pb = this.player.body; let best = null;
    for (let i = 0; i < 4; i++) {
      const x = i === 0 && Math.random() < 0.35 ? clamp(pb.center.x + rand(-40, 40), 3 * TS, 97 * TS) : rand(3 * TS, 97 * TS), y = this.floorBelow(x, 2 * TS + 2, 400);
      if (y === null) continue;
      const score = (LH - y) + rand(0, 150);                             // the higher it stands, the likelier the hit
      if (!best || score > best.score) best = { x, y, score };
    }
    return best;
  },
  lightningStrike(x, y) {
    const W = this.storm, S = W.S, pb = this.player.body, r = S.r, now = this.time.now;
    this.pylonZaps.push({ x0: x + rand(-30, 30), y0: 0, x1: x, y1: y, t: now }, { x0: x + rand(-60, 60), y0: 0, x1: x + rand(-4, 4), y1: y, t: now });
    this.spawnLight(x, y - 10, 'glow', 0xb0d0ff, 3.2, 0.8, 1, 0.3); this.spawnLight(x, y, 'ring', 0xd0e8ff, 0.3, 1.8, 0.9, 0.25); this.paintScorch(x, y + 2, 7);
    Sfx.thunder(); Sfx.pylonZap(); BUS.emit('flash', 0.12); this.shake(160, 0.007); W.flashA = 1;
    this.fxSparks(x, y - 2, 14, -Math.PI / 2, 1.6, [80, 240]);
    this.electrifyWater(x, y, 30);
    if (this.state !== 'dead' && Math.abs(pb.center.x - x) < r + pb.halfWidth && pb.bottom > y - 44 && pb.top < y + 2) this.hurtPlayer(S.dmg, x, { srcY: y - 40, by: 'LIGHTNING' });
    let kills = 0;
    for (const e of this.enemies.getChildren()) {
      if (!e.alive || e.under) continue;
      const b = e.body; if (Math.abs(b.center.x - x) > r + b.halfWidth || b.bottom < y - 44 || b.top > y + 2) continue;
      this.damageEnemy(e, S.edmg, 0, 1, 'arc'); if (e.alive) e.stunT = Math.max(e.stunT, 0.6); else kills++;
    }
    if (kills) { BUS.emit('callout', kills > 1 ? 'STORM SURGE!' : 'STRUCK DOWN'); this.addStyle(40 * kills); }
    for (const k of this.barrelList) if (k.active && Math.abs(k.x - x) < r + 6 && Math.abs(k.y - y) < 30) this.igniteBarrel(k);
    for (const k of this.canisterList) if (k.active && k.state === 'idle' && Math.abs(k.x - x) < r + 6 && Math.abs(k.y - y) < 30) this.igniteCanister(k, -Math.PI / 2 + rand(-0.5, 0.5));
    for (const p of this.props) if (p.st === 'ok' && Math.abs(p.cx - x) < r + p.hw && p.cy + p.hh > y - 44 && p.cy - p.hh < y + 2) { this.igniteProp(p); this.hitProp(p, 20, 'arc', x, p.cy, 0, 1); }
    for (const rd of this.ragdolls) if (Math.abs(rd.pts[2].x - x) < r + 8 && Math.abs(rd.pts[2].y - y) < 30) { for (const q of rd.pts) q.vy -= rand(120, 220); rd.asleep = false; rd.burnT = Math.max(rd.burnT || 0, 1.5); }
  },
  // A gust (ARENA 08's storm, ARENA 10's turbine): streaks blow in, then it shoves everything in its band that has no
  // solid cover upwind. dir 0 picks a side each time.
  updateGust(Gs, C, dt, now, calm, dir, label) {
    Gs.t -= dt;
    if (calm && Gs.st !== 'idle') { Gs.st = 'idle'; Gs.t = 2; }
    if (Gs.st === 'idle') {
      if (calm) Gs.t = Math.max(Gs.t, 1);
      if (Gs.t <= 0) { Gs.st = 'warn'; Gs.t = C.warn; Gs.dir = dir || (Math.random() < 0.5 ? -1 : 1); BUS.emit('callout', Gs.dir > 0 ? label + ' >>>' : '<<< ' + label); Sfx.whoosh(); }
    } else if (Gs.st === 'warn') { if (Gs.t <= 0) { Gs.st = 'blow'; Gs.t = C.blow; Sfx.vortexSpin(); } }
    else if (Gs.t <= 0) { Gs.st = 'idle'; Gs.t = rand(C.idle[0], C.idle[1]); }
    Gs.k = Gs.st === 'blow' ? clamp(Math.min((C.blow - Gs.t) / 0.4, Gs.t / 0.4), 0, 1) : 0;   // eases in and out
    if (Gs.k <= 0) return;
    if (fxRandom() < 0.2) Sfx.whoosh();
    const d = Gs.dir * C.push * Gs.k * dt, x0 = C.x0 ?? 0, x1 = C.x1 ?? LW, top = C.top ?? 0, bot = C.bot ?? LH;
    const inBand = (x, y) => x > x0 && x < x1 && y > top && y < bot;
    const exposed = b => { if (!inBand(b.center.x, b.center.y)) return false; for (let i = 1; i <= C.shelter; i++) { const x = b.center.x - Gs.dir * i * TS; if (this.solidAt(x, b.center.y) || this.solidAt(x, b.top + 3)) return false; } return true; };
    const pb = this.player.body;
    if (this.state !== 'dead' && now >= this.dashUntil && exposed(pb)) this.player.x += d;
    for (const e of this.enemies.getChildren()) if (e.alive && !e.under && e.def.kb > 0 && exposed(e.body)) e.x += d * Math.min(1, e.def.kb * 1.5);
    for (const k of this.barrelList) if (k.active && exposed(k.body)) k.body.velocity.x = approach(k.body.velocity.x, Gs.dir * C.push * 1.1, 500 * dt);
    for (const k of this.canisterList) if (k.active && k.state === 'idle' && exposed(k.body)) k.body.velocity.x = approach(k.body.velocity.x, Gs.dir * C.push * 1.1, 500 * dt);
    for (const gb of this.gibList) if (gb.active && !(gb.stuckT > 0) && inBand(gb.x, gb.y)) gb.body.velocity.x = approach(gb.body.velocity.x, Gs.dir * C.push * 1.6, 700 * dt);
    for (const rd of this.ragdolls) if (inBand(rd.pts[2].x, rd.pts[2].y)) { for (const q of rd.pts) q.vx += Gs.dir * C.push * 2.2 * Gs.k * dt; rd.asleep = false; }
  },
  drawStreaks(G, Gs, C, now) {                                           // the gust's wind lines, in its band and in view
    const n = Gs.st === 'warn' ? 9 : Gs.st === 'blow' ? 9 + Math.round(20 * Gs.k) : 0;
    if (!n) return;
    const v = this.cameras.main.worldView, top = Math.max(v.y, C.top ?? 0), bot = Math.min(v.bottom, C.bot ?? LH), x0 = Math.max(v.x, C.x0 ?? 0), x1 = Math.min(v.right, C.x1 ?? LW), Wd = x1 - x0 + 80;
    if (bot <= top || x1 <= x0) return;
    for (let i = 0; i < n; i++) {
      const len = 14 + (i * 7) % 26, y = top + (i * 53.7 + 17) % (bot - top), sp = 300 + (i * 41) % 200;
      const x = x0 - 40 + ((((i * 131.3 + now / 1000 * sp * Gs.dir) - x0) % Wd) + Wd) % Wd;
      G.lineStyle(1, 0xd8e8f8, Gs.st === 'warn' ? 0.25 : 0.3 + 0.25 * Gs.k).lineBetween(x, y, x - Gs.dir * len, y);
    }
  },
  drawRain(now, W) {
    const G = W.rain, v = this.cameras.main.worldView, t = now / 1000, Gs = W.gust;
    const wind = Gs.st === 'blow' ? Gs.dir * Gs.k : Gs.st === 'warn' ? Gs.dir * 0.3 : 0, slant = 0.18 + wind * 0.9, H = v.height + 40, Wd = v.width + 120;
    G.clear(); G.lineStyle(1, 0x9ab8e0, 0.32);
    for (let i = 0; i < 110; i++) {                                      // drops anchored in the world, wrapped round the view
      const sp = 420 + (i * 53) % 180, by = i * 97.31 + t * sp, y = v.y - 20 + (((by - v.y) % H) + H) % H;
      const bx = (i * 1061.7) % 2400 + by * slant + t * wind * 140, x = v.x - 60 + (((bx - v.x) % Wd) + Wd) % Wd;
      G.lineBetween(x, y, x - slant * 9, y - 9);
    }
    this.drawStreaks(G, Gs, W.S.gust, now);
    for (let i = 0; i < 2; i++) {                                        // splashes on whatever the rain finds
      const x = crand(v.x, v.right), fy = this.floorBelow(x, Math.max(2 * TS + 2, v.y), v.height);
      if (fy !== null) this.fx.emit(x, fy - 1, { n: 2, angle: -Math.PI / 2, spread: 1.6, speed: [20, 50], life: [0.15, 0.3], size: [1, 1], cols: [0xc0d8f8], alpha: [0.7, 0], g: 300, cosmetic: true });
    }
  },

  // ---------------------------------------------------------------- the crusher ----
  // ARENA 09: every 9-13 s the alarm sounds and the plates flash (2.2 s), then both end walls drive in to the crush
  // line, 28 tiles each (3.2 s), hold (1.4 s) and pull back (2.6 s). The walls shove anything in their way; caught
  // between a wall and solid ground (the anvils at the crush line) it is crushed: 45 to you and a pop up over it,
  // 400 to foes (80 to bosses), drums blown, cans lit, scenery flattened. The outer floors are gratings, so you can
  // ride the wall in along them; the middle never closes.
  updateCrusher(dt, now, calm) {
    const W = this.crusher, C = W.C;
    W.t -= dt;
    if (calm && W.st === 'warn') { W.st = 'idle'; W.t = 3; }
    if (calm && (W.st === 'close' || W.st === 'hold')) { W.st = 'open'; Sfx.steam(); }
    switch (W.st) {
      case 'idle': if (calm) W.t = Math.max(W.t, 2); if (W.t <= 0) { W.st = 'warn'; W.t = C.warn; W.alarmT = 0; BUS.emit('callout', 'WALLS CLOSING'); } break;
      case 'warn': if ((W.alarmT -= dt) <= 0) { W.alarmT = 0.55; Sfx.alarm(); } if (W.t <= 0) { W.st = 'close'; Sfx.steam(); } break;
      case 'close': W.k = Math.min(1, W.k + dt / C.close); if ((W.rumbleT -= dt) <= 0) { W.rumbleT = 0.4; Sfx.rumble(0.5); } if (W.k >= 1) { W.st = 'hold'; W.t = C.hold; Sfx.press(); this.shake(220, 0.008); } break;
      case 'hold': if (W.t <= 0) { W.st = 'open'; Sfx.steam(); } break;
      case 'open': W.k = Math.max(0, W.k - dt / C.open); if (W.k <= 0) { W.st = 'idle'; W.t = rand(C.idle[0], C.idle[1]); } break;
    }
    const reach = C.reach * W.k * W.k * (3 - 2 * W.k), L = 2 * TS + reach, Rr = 98 * TS - reach;
    this.drawCrusher(now, L, Rr);
    if (W.st === 'warn' && fxRandom() < 0.3) for (const x of [2 * TS + 4, 98 * TS - 4]) this.fx.emit(x, 25 * TS - 2, { n: 1, angle: -Math.PI / 2, spread: 0.8, speed: [20, 60], life: [0.5, 1], size: [3, 8], cols: [0xe8f0f4, 0xb0bcc4], alpha: [0.5, 0], g: -40, drag: 2, cosmetic: true });
    if (reach < 0.5) return;
    const squeeze = (b, move) => {                                       // shove a body clear of the walls; 2 (or -2) if it's pinned against solid ground
      if (b.left < L && b.center.x < 50 * TS) { move(L - b.left); const x = L + b.width - 2; return this.solidAt(x, b.top + 3) || this.solidAt(x, b.center.y) || this.solidAt(x, b.bottom - 3) ? 2 : 1; }
      if (b.right > Rr && b.center.x > 50 * TS) { move(Rr - b.right); const x = Rr - b.width + 2; return this.solidAt(x, b.top + 3) || this.solidAt(x, b.center.y) || this.solidAt(x, b.bottom - 3) ? -2 : -1; }
      return 0;
    };
    const pb = this.player.body;
    if (this.state !== 'dead') {
      const s = squeeze(pb, d => { this.player.x += d; });
      if (Math.abs(s) === 2 && now >= W.pHit) {
        W.pHit = now + 900;
        if (!calm && this.hurtPlayer(C.dmg, s > 0 ? L - 30 : Rr + 30, { knock: false, srcY: pb.center.y, by: 'THE CRUSHER' })) { BUS.emit('callout', 'SQUEEZED!'); this.fxBlood(pb.center.x, pb.center.y, 12, -Math.PI / 2, 1.4); }
        pb.velocity.y = -430; pb.velocity.x = Math.sign(s) * 170; this.jumpCuttable = false; Sfx.press();
      }
    }
    let crushed = 0;
    for (const e of this.enemies.getChildren()) {
      if (!e.alive || e.under || e.def.noClip) continue;
      const s = squeeze(e.body, d => { e.x += d; });
      if (Math.abs(s) !== 2 || (W.hit.get(e) || 0) > now) continue;
      W.hit.set(e, now + 700);
      const big = e.def.hp >= 400;
      this.paintSplatAround(e.body.center.x, e.body.center.y, 10);
      this.damageEnemy(e, big ? C.bossDmg : C.edmg, Math.sign(s), -0.5, 'crush');
      if (e.alive) { e.body.velocity.y = -380; e.stunT = Math.max(e.stunT, 0.5); } else crushed++;
    }
    if (crushed) { BUS.emit('callout', crushed > 1 ? 'COMPACTED!' : 'CRUSHED!'); this.addStyle(60 * crushed); this.impactFrame(1); Sfx.press(); }
    for (const k of this.barrelList) if (k.active && Math.abs(squeeze(k.body, d => { k.x += d; })) === 2) this.explodeBarrel(k);
    for (const k of this.canisterList) if (k.active && k.state === 'idle' && Math.abs(squeeze(k.body, d => { k.x += d; })) === 2) this.igniteCanister(k, -Math.PI / 2);
    for (const gb of this.gibList) if (gb.active) { if (gb.x < L) { gb.x = L + 2; gb.body.velocity.x = Math.max(gb.body.velocity.x, 120); } else if (gb.x > Rr) { gb.x = Rr - 2; gb.body.velocity.x = Math.min(gb.body.velocity.x, -120); } }
    for (const rd of this.ragdolls) for (const q of rd.pts) { if (q.x < L) { q.x = L + 1; q.vx = Math.max(q.vx, 100); rd.asleep = false; } else if (q.x > Rr) { q.x = Rr - 1; q.vx = Math.min(q.vx, -100); rd.asleep = false; } }
    for (const p of this.props) if (p.st === 'ok' && ((p.cx < 50 * TS && p.cx - p.hw < L) || (p.cx > 50 * TS && p.cx + p.hw > Rr))) this.hitProp(p, 999, 'crush', p.cx, p.cy, p.cx < 50 * TS ? 1 : -1, 0);
    if (this.sentry && (this.sentry.x < L || this.sentry.x > Rr)) this.killSentry();
  },
  drawCrusher(now, L, Rr) {
    const W = this.crusher, G = W.g, warn = W.st === 'warn' || W.st === 'close', blink = warn && Math.floor(now / 140) % 2 === 1;
    G.clear();
    if (blink && !W.blink) for (const x of [L - 7, Rr + 7]) for (const ly of [5, 13, 21]) this.spawnLight(x, ly * TS + 3, 'glow', 0xff3020, 0.9, 1.3, 0.8, 0.14);
    W.blink = blink;
    for (const side of [1, -1]) {
      const face = side > 0 ? L : Rr, base = side > 0 ? 2 * TS : 98 * TS, x0 = Math.min(base, face), w = Math.abs(face - base);
      if (w > 2) {                                                       // behind the plate: its rams, in shadow
        G.fillStyle(0x07080a, 0.6).fillRect(x0, 2 * TS, w, 23 * TS);
        for (let ty = 3; ty < 24; ty += 5) { const ry = ty * TS + 20; G.fillStyle(0x5a636e, 1).fillRect(x0, ry, w, 8); G.fillStyle(0xc8d0d8, 1).fillRect(x0, ry, w, 2); G.fillStyle(0x2a2e35, 1).fillRect(x0, ry + 7, w, 1); }
      }
      const px = side > 0 ? face - 14 : face;                            // the plate, hazard paint down its face
      G.fillStyle(0x15181d, 1).fillRect(px, 2 * TS, 14, 23 * TS); G.fillStyle(0x4b535e, 1).fillRect(px + 1, 2 * TS, 12, 23 * TS); G.fillStyle(0x6a7380, 1).fillRect(px + (side > 0 ? 1 : 11), 2 * TS, 2, 23 * TS);
      const ex = side > 0 ? face - 5 : face + 1;
      for (let y = 2 * TS; y < 25 * TS; y += 8) G.fillStyle((y >> 3) & 1 ? 0x15161a : 0xe8b422, 1).fillRect(ex, y, 4, 8);
      for (let y = 2 * TS + 10; y < 25 * TS; y += 28) { G.fillStyle(0x8a94a0, 1).fillRect(px + 4, y, 2, 2); G.fillStyle(0x8a94a0, 1).fillRect(px + 8, y + 14, 2, 2); }
      for (const ly of [5, 13, 21]) G.fillStyle(blink ? 0xff5040 : warn ? 0x6a1810 : 0x3a1410, 1).fillRect(px + 4, ly * TS, 6, 6);
    }
  },

  // ---------------------------------------------------------------- the turbine hall ----
  // ARENA 10: three floor fans blow updrafts (40 px wide) that lift you, foes and anything loose toward the tier above
  // (230 px/s, fading near the top). The turbine in the left wall winds up (1.5 s, streaks) and blows the upper hall
  // (rows 3-11) to the right at 130 px/s for 4 s every 6-9 s, cover upwind excepted. Two rotors over the gaps in the
  // middle tier keep a rhythm, half a cycle apart: spin 3.4 s, slow 0.8 s, stand 2.2 s (green), wind up 0.9 s
  // (flashing amber). A blade at speed hits you for 18 and knocks you off, foes for 35.
  updateTurbine(dt, now, calm) {
    const W = this.turbine, T = W.T, pb = this.player.body, G = W.g, cyc = T.spin + T.slow + T.stop + T.wind;
    G.clear(); W.bg.clear();
    if (!calm) W.clock += dt;
    for (const F of W.fans) {                                            // updrafts
      F.img.setFrame('f' + (Math.floor(now / 40) % 3));
      const x0 = F.x - T.w / 2, x1 = F.x + T.w / 2, span = 25 * TS - F.top;
      const inCol = b => b.center.x > x0 && b.center.x < x1 && b.bottom > F.top && b.top < 25 * TS, lift = b => T.lift * clamp((b.bottom - F.top) / 56, 0, 1);
      if (this.state !== 'dead' && now >= this.dashUntil && inCol(pb)) pb.velocity.y = approach(pb.velocity.y, -lift(pb), 1500 * dt);
      for (const e of this.enemies.getChildren()) if (e.alive && !e.under && !FLIERS.has(e.kind) && e.def.kb > 0 && inCol(e.body)) e.body.velocity.y = approach(e.body.velocity.y, -lift(e.body) * Math.min(1, e.def.kb * 1.3), 1300 * dt);
      for (const k of this.barrelList) if (k.active && inCol(k.body)) k.body.velocity.y = approach(k.body.velocity.y, -lift(k.body), 1300 * dt);
      for (const k of this.canisterList) if (k.active && k.state === 'idle' && inCol(k.body)) k.body.velocity.y = approach(k.body.velocity.y, -lift(k.body), 1300 * dt);
      for (const gb of this.gibList) if (gb.active && !(gb.stuckT > 0) && gb.x > x0 && gb.x < x1 && gb.y > F.top) gb.body.velocity.y = approach(gb.body.velocity.y, -T.lift * 0.8, 1200 * dt);
      for (const rd of this.ragdolls) { const c = rd.pts[2]; if (c.x > x0 && c.x < x1 && c.y > F.top) { for (const q of rd.pts) q.vy = approach(q.vy, -T.lift * 0.7, 1400 * dt); rd.asleep = false; } }
      G.fillStyle(0xc8f0ff, 0.05).fillRect(x0, F.top, T.w, span);
      for (let i = 0; i < 18; i++) {                                     // the rising air, drawn
        const yy = 25 * TS - ((i * 37.3 + now * 0.22) % span), xx = x0 + 3 + (i * 13.7) % (T.w - 6), a = 0.5 * clamp((yy - F.top) / 60, 0, 1);
        G.lineStyle(1, 0xd8f0ff, a).lineBetween(xx, yy, xx, yy + 9 + (i % 3) * 4);
      }
      if (fxRandom() < 0.3) this.fx.emit(crand(x0 + 4, x1 - 4), 25 * TS - 2, { n: 1, angle: -Math.PI / 2, spread: 0.2, speed: [140, 220], life: [0.6, 1.2], size: [1, 1], cols: [0xb0b8c0, 0x8a9098], alpha: [0.7, 0], drag: 0.6, cosmetic: true });
    }
    for (const Rt of W.rotors) {                                         // rotors
      const u = (W.clock + Rt.ph * cyc) % cyc, target = calm ? 0 : u < T.spin ? 1 : u < T.spin + T.slow ? 1 - (u - T.spin) / T.slow : u < T.spin + T.slow + T.stop ? 0 : (u - T.spin - T.slow - T.stop) / T.wind;
      Rt.w = approach(Rt.w, target * 10, 16 * dt); Rt.ang += Rt.w * dt;
      Rt.img.setRotation(Rt.ang);
      const hot = Rt.w > 4, winding = !calm && u >= T.spin + T.slow + T.stop;
      Rt.lamp.setPosition(Rt.x, Rt.y).setTint(hot ? 0xff3020 : winding ? 0xffb020 : 0x40ff70).setAlpha(winding && !hot ? (Math.floor(now / 120) % 2 ? 0.95 : 0.2) : 0.6);
      if (Rt.w > 2.5) G.fillStyle(0xc8d0d8, Math.min(0.22, Rt.w * 0.02)).fillCircle(Rt.x, Rt.y, T.r);
      if (hot && (Rt.whirT -= dt) <= 0 && Math.abs(this.player.x - Rt.x) < 320) { Rt.whirT = 0.12; Sfx.whirr(Math.min(1, Rt.w / 10)); }
      if (!hot) continue;
      for (let i = 0; i < 3; i++) {
        const a = Rt.ang + i * Math.PI * 2 / 3, ca = Math.cos(a), sa = Math.sin(a), pts = [0.35, 0.6, 0.85, 1].map(f => [Rt.x + ca * T.r * f, Rt.y + sa * T.r * f]);
        const touches = b => pts.some(([x, y]) => x > b.left - 2 && x < b.right + 2 && y > b.top - 2 && y < b.bottom + 2);
        if (this.state !== 'dead' && now >= Rt.pHit && touches(pb)) {
          Rt.pHit = now + 700;
          if (!calm && this.hurtPlayer(T.dmg, Rt.x, { srcY: Rt.y, by: 'A TURBINE ROTOR' })) { this.fxSparks(pb.center.x, pb.center.y, 8, a + Math.PI / 2, 1.2); Sfx.clang(0.8); }
        }
        for (const e of this.enemies.getChildren()) {
          if (!e.alive || e.under || (Rt.hit.get(e) || 0) > now || !touches(e.body)) continue;
          Rt.hit.set(e, now + 500);
          this.damageEnemy(e, T.edmg, -sa, ca, 'saw'); Sfx.clang(0.6); this.fxSparks(e.body.center.x, e.body.center.y, 6, a + Math.PI / 2, 1);
          if (e.alive && e.def.kb > 0) { const s = Math.sign(e.body.center.x - Rt.x) || 1; e.body.velocity.x = s * 260 * e.def.kb; e.body.velocity.y = -200 * e.def.kb; e.stunT = Math.max(e.stunT, 0.4); }
        }
      }
    }
    const Gs = W.gust;                                                   // the turbine's gust
    this.updateGust(Gs, T.gust, dt, now, calm, 1, 'TURBINE');
    W.spin += dt * (Gs.st === 'blow' ? 30 : Gs.st === 'warn' ? 14 : 3);
    W.nac.setFrame('t' + (Math.floor(W.spin) % 3));
    this.drawStreaks(W.bg, Gs, T.gust, now);
    if (Gs.st === 'blow' && fxRandom() < 0.5) this.fx.emit(T.gust.x0 + 2, crand(T.gust.top + 8, T.gust.bot - 8), { n: 1, angle: 0, spread: 0.15, speed: [200, 320], life: [0.6, 1.2], size: [1, 1], cols: [0xd8e8f8], alpha: [0.6, 0], add: true, cosmetic: true });
  },

  // ================================================================== wrecking-yard round ====
  // ---------------------------------------------------------------- the wrecking ball ----
  // ARENA 04: an iron ball on a 12-tile chain swings across the middle (+/-0.95 rad, a 5.2 s period). Anything in
  // its way at speed gets hit: foes 60 (scaled by speed) and flung, you 25 and knocked aside, crates and girders
  // smashed, drums lit and launched. Standing on the dais under it is safe; jumping into it is not.
  updateWreck(dt, now) {
    const W = this.wreck; if (!W) return;
    const active = !this.campaign || this.campaignMachinery === 'wreck';
    if (!active) { this.parkWreck(W, dt); return; }
    W.t += dt; const om = Math.PI * 2 / W.period, th = W.amp * Math.sin(W.t * om), thd = W.amp * om * Math.cos(W.t * om), R0 = TUNE.WRECK.r;
    W.th = th; W.snapT = Math.max(0, (W.snapT || 0) - dt);
    const bx = W.px + Math.sin(th) * W.len, by = W.py + Math.cos(th) * W.len, vx = Math.cos(th) * W.len * thd, vy = -Math.sin(th) * W.len * thd, sp = Math.hypot(vx, vy);
    Object.assign(W, { x: bx, y: by, vx, vy });
    W.img.setPosition(bx, by).setRotation(-th);
    const G = this.wreckG; G.clear();                                    // the chain, and a smear when it's fast
    const n = Math.floor(W.len / 5);
    for (let k = 1; k < n; k++) { const t = k / n, x = W.px + (bx - W.px) * t, y = W.py + (by - W.py) * t; G.fillStyle(k % 2 ? 0x3a3f47 : 0x8a94a0, 1).fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, k % 2 ? 2 : 3); }
    if (sp > 180) { G.fillStyle(0x5a636e, 0.22).fillCircle(bx - vx * 0.025, by - vy * 0.025, R0); G.fillStyle(0x5a636e, 0.12).fillCircle(bx - vx * 0.05, by - vy * 0.05, R0); }
    if (W.snapT > 0) { const ax = W.px + Math.sin(W.amp) * W.len, k = W.snapT / 0.5; G.lineStyle(1, 0x8a94a0, k).lineBetween(ax, 2 * TS + 10, ax + Math.sin(W.snapT * 30) * 6, 2 * TS + 10 + 40 * k); }   // the cut holdback whips up
    const side = Math.sign(th); if (side && side !== W.lastSide) { W.lastSide = side; Sfx.wreckSwing(); }   // a whoosh through the bottom
    if (Math.abs(thd) < 0.06 && now > W.creakT) { W.creakT = now + 1500; Sfx.creak(); }
    if (sp < 60) return;
    const ux = vx / sp, uy = vy / sp;
    for (const e of this.enemies.getChildren()) {
      if (!e.alive || e.under || e.kind === 'wyrmseg' || e.kind === 'eyenode') continue;   // the Overseer's nodes are yours to break
      const b = e.body, qx = clamp(bx, b.left, b.right), qy = clamp(by, b.top, b.bottom);
      if (Math.hypot(qx - bx, qy - by) > R0 || (W.hit.get(e) || 0) > now) continue;
      W.hit.set(e, now + 700);
      this.damageEnemy(e, TUNE.WRECK.dmg * clamp(sp / 300, 0.4, 1.2), ux, uy, 'crush');
      if (e.alive && e.def.kb > 0 && !e.def.anchored) { b.velocity.x = ux * 420 * e.def.kb; b.velocity.y = uy * 300 * e.def.kb - 200 * e.def.kb; e.stunT = Math.max(e.stunT, 0.8); e.kickedT = 0.6; }
      this.fxSparks(qx, qy, 8, Math.atan2(uy, ux), 1.2, [80, 260]); Sfx.wreckHit(); this.shake(120, 0.006); this.hitStop(40);
      if (!e.alive) { BUS.emit('callout', 'WRECKED'); this.addStyle(60); if ((this.ms.wrecks = (this.ms.wrecks || 0) + 1) >= 3) this.award('wrecker'); }
    }
    const pb = this.player.body;
    if (this.state !== 'dead' && now >= W.pHit) {
      const qx = clamp(bx, pb.left, pb.right), qy = clamp(by, pb.top, pb.bottom);
      if (Math.hypot(qx - bx, qy - by) < R0) { W.pHit = now + 900; if (this.hurtPlayer(TUNE.WRECK.pdmg, bx, { knock: false, srcY: by, by: 'THE WRECKING BALL' })) { pb.velocity.x = ux * 380; pb.velocity.y = -260; Sfx.wreckHit(); this.shake(200, 0.01); } }
    }
    for (let ty = Math.floor((by - R0) / TS); ty <= Math.floor((by + R0) / TS); ty++) for (let tx = Math.floor((bx - R0) / TS); tx <= Math.floor((bx + R0) / TS); tx++) {
      const c = this.tileAt(tx, ty); if (c === 'x' || c === 'g') { this.damageTile(tx, ty, 999); Sfx.wreckHit(); }
    }
    for (const k of this.barrelList) if (k.active && Math.hypot(k.x - bx, k.y - by) < R0 + 6) { k.body.velocity.x = ux * 420; k.body.velocity.y = -260; k.kicked = true; this.igniteBarrel(k); }
    for (const pr of this.props || []) if (pr.st === 'ok' && Math.hypot(pr.cx - bx, pr.cy - by) < R0 + Math.max(pr.hw, pr.hh)) { this.igniteProp(pr); this.hitProp(pr, 40, 'kick', bx, by, ux, -0.5); }
    for (const p of this.props) if (p.st === 'ok' && Math.hypot(p.cx - bx, p.cy - by) < R0 + Math.max(p.hw, p.hh)) this.hitProp(p, 80, 'crush', bx, by, ux, 0);
    for (const g2 of this.gibList) if (g2.active && Math.hypot(g2.x - bx, g2.y - by) < R0 + 3) { if (g2.stuckT > 0) { g2.stuckT = 0; g2.body.setAllowGravity(true); } g2.body.velocity.x = vx * 1.2; g2.body.velocity.y = vy * 1.2 - 120; }
    for (const rd of this.ragdolls) if (Math.hypot(rd.pts[2].x - bx, rd.pts[2].y - by) < R0 + 6) { for (const q of rd.pts) { q.vx = vx * 1.1; q.vy = vy * 1.1 - 150; } rd.asleep = false; rd.stillT = 0; }
  },

  // Out of use (the campaign, before its squad lets it go and after the operation ends) it hangs latched at the top of
  // its arc on a holdback cable from the gantry. After a swing the gantry winches it back up to the latch, harmless,
  // so the Foreman can cut it loose again.
  parkWreck(W, dt) {
    if (W.th === undefined) W.th = W.amp;
    const was = W.th; W.th = approach(W.th, W.amp, dt * 0.45);
    if (W.th !== was && (W.winchT = (W.winchT || 0) - dt) <= 0) { W.winchT = 0.9; Sfx.creak(); }   // the winch groans
    const th = W.th, bx = W.px + Math.sin(th) * W.len, by = W.py + Math.cos(th) * W.len, ax = W.px + Math.sin(W.amp) * W.len, ay = 2 * TS + 10;
    W.img.setVisible(true).setPosition(bx, by).setRotation(-th);
    const G = this.wreckG; G.clear();
    const n = Math.floor(W.len / 5);
    for (let k = 1; k < n; k++) { const t = k / n, x = W.px + (bx - W.px) * t, y = W.py + (by - W.py) * t; G.fillStyle(k % 2 ? 0x3a3f47 : 0x8a94a0, 1).fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, k % 2 ? 2 : 3); }
    const hy = by - TUNE.WRECK.r;                                          // the holdback, taut from the gantry to the hook on the ball
    G.lineStyle(1, 0x5a636e, 1).lineBetween(ax, ay, bx, hy); G.fillStyle(0xe8b422, 1).fillRect(Math.round(ax) - 2, ay - 2, 5, 3); G.fillStyle(0x8a94a0, 1).fillRect(Math.round(bx) - 1, Math.round(hy) - 2, 3, 3);
  },
  spawnIce(x, y, w) {
    const fy = this.floorBelow(x, y - 4); if (fy === null || fy - y > 70) return;
    [x, w] = this.spanOn(x, fy, w);
    for (const I of this.ices) if (Math.abs(I.y - fy) < 4 && Math.abs(I.x - x) < (I.w + w) / 2 - 10) { [I.x, I.w] = this.spanOn((I.x + x) / 2, fy, Math.min(160, Math.max(I.w, w) + 20)); I.t = TUNE.CHILLER.iceT; return; }   // joins a sheet it lands on
    this.ices.push({ x, y: fy, w, t: TUNE.CHILLER.iceT, grow: 0, glint: rand(0, 6) });
  },
  updateIces(dt, now) {
    this.chillT = Math.max(0, this.chillT - dt);
    const pb = this.player.body, g = this.iceG; g.clear(); let on = false;
    for (let i = this.ices.length - 1; i >= 0; i--) {
      const I = this.ices[i]; I.t -= dt; I.grow = Math.min(1, I.grow + dt * 6);
      let melt = I.t <= 0;
      if (!melt) for (const Q of this.puddles) if (Q.fire && Math.abs(Q.y - I.y) < 6 && Math.abs(Q.x - I.x) < (Q.w + I.w) / 2) { melt = true; break; }
      if (melt) {                                                         // fire (or time) turns it to steam
        this.fx.emit(I.x, I.y - 2, { n: 10, angle: -Math.PI / 2, spread: 0.8, speed: [10, 50], life: [0.4, 0.9], size: [3, 6], cols: [0xe8f4ff, 0xb8d0e0], alpha: [0.5, 0], g: -40, drag: 2 });
        if (I.t > 0) Sfx.sizzle();
        this.ices.splice(i, 1); continue;
      }
      const half = I.w / 2 * I.grow, a = Math.min(1, I.t / 0.6);
      if (this.state !== 'dead' && Math.abs(pb.center.x - I.x) < half + 2 && Math.abs(pb.bottom - I.y) < 4) on = true;
      g.fillStyle(0xc8f0ff, 0.55 * a).fillRect(I.x - half, I.y - 2, half * 2, 3);
      g.fillStyle(0xffffff, 0.8 * a).fillRect(I.x - half, I.y - 2, half * 2, 1);
      const gx = I.x - half + ((now / 12 + I.glint * 40) % (half * 2 + 30)) - 15;   // a glint sliding along
      if (gx > I.x - half && gx < I.x + half - 2) g.fillStyle(0xffffff, a).fillRect(gx, I.y - 3, 2, 1);
    }
    if (on && !this.onIce) Sfx.tink();
    this.onIce = on;
    if (on && Math.abs(pb.velocity.x) > 60 && Math.random() < 0.3) this.fx.emit(pb.center.x, pb.bottom - 1, { n: 1, angle: -Math.PI / 2, spread: 1.2, speed: [10, 40], life: [0.15, 0.3], size: [2, 1], cols: [0xffffff, 0xc8f0ff], add: true });
    if (this.chillT > 0 && Math.random() < 0.3) this.fx.emit(pb.center.x + rand(-4, 4), pb.center.y + rand(-8, 8), { n: 1, angle: Math.PI / 2, spread: 0.5, speed: [5, 20], life: [0.3, 0.5], size: [2, 1], cols: [0xffffff, 0x9adcff], add: true });
  },
  slugSpit(e) {
    const pb = this.player.body, G = this.physics.world.gravity.y, sx = e.x + e.dir * 8, sy = e.y - 2;
    const dx = pb.center.x - sx, dy = pb.center.y - sy, FT = clamp(Math.hypot(dx, dy) / 260, 0.35, 0.9);
    this.spawnEProj('acid', sx, sy, dx / FT, (dy - 0.5 * G * FT * FT) / FT);
  },
  updateAcids(dt, now) {
    const g = this.acidG; g.clear();
    if (this.pCorrodeT > 0) { this.pCorrodeT -= dt; if (Math.random() < 0.3 && this.state !== 'dead') this.fx.emit(this.player.x + rand(-4, 4), this.player.y + rand(-6, 6), { n: 1, angle: Math.PI / 2, spread: 0.3, speed: [5, 20], life: [0.3, 0.5], size: [2, 1], cols: [0xe0ff90, 0x9aff4a], add: true, g: 300 }); }
    if (!this.acids.length) return;
    const T = TUNE.SLUG, pb = this.player.body;
    let inAcid = false;
    for (let i = this.acids.length - 1; i >= 0; i--) {
      const A = this.acids[i]; A.t -= dt;
      if (A.t <= 0) { this.acids.splice(i, 1); continue; }
      const a = Math.min(1, A.t / 0.8);
      g.fillStyle(0x3a8a20, 0.7 * a).fillRect(Math.round(A.x - A.w / 2), A.y - 2, A.w, 2); g.fillStyle(0x9aff4a, 0.8 * a).fillRect(Math.round(A.x - A.w / 2) + 2, A.y - 2, A.w - 4, 1);
      if (Math.random() < 0.05) this.fx.emit(A.x + rand(-A.w / 2, A.w / 2), A.y - 2, { n: 1, angle: -Math.PI / 2, spread: 0.3, speed: [5, 20], life: [0.3, 0.6], size: [3, 6], cols: [0xc8ff90, 0x6aa040], alpha: [0.25, 0], g: -30 });
      if (this.state !== 'dead' && Math.abs(pb.center.x - A.x) < A.w / 2 + 3 && Math.abs(pb.bottom - A.y) < 4) inAcid = true;
    }
    if (inAcid) { this.pCorrodeT = T.corrode; if ((this.acidHurtT = (this.acidHurtT || 0) - dt) <= 0) { this.acidHurtT = 0.4; this.hurtPlayer(T.dmg, pb.center.x, { knock: false, iframes: false, burn: true, srcY: pb.bottom }); Sfx.sizzle(); } }
  },

  // ================================================================== sorting line round ====
  // ---------------------------------------------------------------- belts + presses ----
  // ARENA 03. Belts carry anything standing on them (you, foes, drums, gibs, corpses). Presses hang over three of
  // them: every few seconds a 0.6 s tell (light, dust, creak), a 0.1 s slam (40 to you and a fling, 200 to foes, 60 to
  // a boss; drums go off, corpses burst), a 0.45 s hold and a 1 s rise.
  updateBelts(dt, now) {
    const g = this.beltG; g.clear();
    if (!this.belts.length || (this.campaign && this.campaignMachinery !== 'belts' && this.campaignMachinery !== 'presses')) return;
    const pb = this.player.body, onB = (b, B) => (b.blocked.down || b.touching.down) && Math.abs(b.bottom - B.y) < 3 && b.center.x > B.x0 && b.center.x < B.x1;
    for (const B of this.belts) {
      const d = B.v * dt;
      g.fillStyle(0xc8a040, 0.55);                                        // chevrons crawling along the belt
      const ph = ((now / 1000 * B.v) % 12 + 12) % 12;
      for (let x = B.x0 + ph; x < B.x1 - 3; x += 12) { const dir = Math.sign(B.v); g.fillRect(Math.round(x), B.y + 1, 2, 1); g.fillRect(Math.round(x + dir), B.y + 2, 2, 1); g.fillRect(Math.round(x), B.y + 3, 2, 1); }
      if (this.state !== 'dead' && now >= this.dashUntil && onB(pb, B)) this.player.x += d;
      for (const e of this.enemies.getChildren()) if (e.alive && !e.under && !FLIERS.has(e.kind) && onB(e.body, B)) e.x += d;
      for (const k of this.barrelList) if (k.active && onB(k.body, B)) k.x += d;
      for (const k of this.canisterList) if (k.active && k.state === 'idle' && onB(k.body, B)) k.x += d;
      for (const gb of this.gibList) if (gb.active && onB(gb.body, B)) gb.x += d;
      for (const rd of this.ragdolls) for (const q of rd.pts) if (Math.abs(q.y - B.y) < 5 && q.x > B.x0 && q.x < B.x1) { q.x += d; if (q.px !== undefined) q.px += d; }
    }
  },
  updatePresses(dt, now) {
    const g = this.pressG; g.clear();
    if (!this.presses.length) return;
    const T = TUNE.PRESS, on = !this.campaign || this.campaignMachinery === 'presses';
    for (const Pr of this.presses) {
      if (!on) {                                                        // switched off: it parks up, and one mid-stroke pulls back without landing
        if (Pr.st === 'tell') Pr.st = 'up';
        else if (Pr.st === 'slam' || Pr.st === 'hold') { Pr.st = 'rise'; Pr.t = T.rise * Pr.k; }
      }
      if (on || Pr.st === 'rise') Pr.t -= dt;
      if (Pr.st === 'up') { if (Pr.t <= 0) { Pr.st = 'tell'; Pr.t = T.tell; if (Math.abs(this.player.x - Pr.x) < 300) Sfx.creak(); } }
      else if (Pr.st === 'tell') { if (Math.random() < 0.4) this.fx.emit(Pr.x + rand(-12, 12), Pr.top + 8, { n: 1, angle: Math.PI / 2, spread: 0.3, speed: [20, 60], life: [0.3, 0.6], size: [2, 1], cols: [0x8a8580, 0x5a5652], g: 300 }); if (Pr.t <= 0) { Pr.st = 'slam'; Pr.t = T.slam; } }
      else if (Pr.st === 'slam') { Pr.k = clamp(1 - Pr.t / T.slam, 0, 1); if (Pr.t <= 0) { Pr.st = 'hold'; Pr.t = T.hold; Pr.k = 1; this.pressImpact(Pr); } }
      else if (Pr.st === 'hold') { if (Pr.t <= 0) { Pr.st = 'rise'; Pr.t = T.rise; } }
      else { Pr.k = clamp(Pr.t / T.rise, 0, 1); if (Pr.t <= 0) { Pr.st = 'up'; Pr.k = 0; Pr.t = on ? rand(3.5, 6) : 2; } }
      const headH = 20, hy = Pr.top + 6 + (Pr.bot - Pr.top - 6 - headH) * Pr.k, shk = Pr.st === 'tell' ? rand(-1, 1) : 0;   // rod + head
      g.fillStyle(0x6a7380, 1).fillRect(Pr.x - 3 + shk, Pr.top + 6, 6, hy - Pr.top - 6); g.fillStyle(0xa0aab6, 1).fillRect(Pr.x - 2 + shk, Pr.top + 6, 1, hy - Pr.top - 6);
      g.fillStyle(0x22262c, 1).fillRect(Pr.x - 16 + shk, hy, 32, headH); g.fillStyle(0x4b535e, 1).fillRect(Pr.x - 15 + shk, hy + 1, 30, headH - 4);
      for (let i = 0; i < 8; i++) g.fillStyle(i % 2 ? 0x15161a : 0xe8b422, 1).fillRect(Pr.x - 15 + shk + i * 4, hy + headH - 4, 4, 3);
      if (Pr.st === 'tell' && Math.floor(now / 70) % 2) { g.fillStyle(0xff3020, 1).fillRect(Pr.x - 2 + shk, hy + 4, 4, 3); this.spawnLight(Pr.x, hy + 6, 'glow', 0xff3020, 0.5, 0.7, 0.6, 0.08); }
    }
  },
  pressImpact(Pr) {
    const T = TUNE.PRESS, x0 = Pr.x - 16, x1 = Pr.x + 16, y0 = Pr.top, y1 = Pr.bot, pb = this.player.body;
    this.fxDust(Pr.x - 18, y1, 6); this.fxDust(Pr.x + 18, y1, 6); this.fxSparks(Pr.x, y1 - 2, 8, -Math.PI / 2, 2.4, [60, 200]);
    const near = Math.hypot(this.player.x - Pr.x, this.player.y - y1) < 260;
    if (near) { this.shake(200, 0.01); Sfx.press(); }
    if (this.state !== 'dead' && pb.right > x0 && pb.left < x1 && pb.bottom > y0 && pb.top < y1 && this.hurtPlayer(T.dmg, Pr.x, { knock: false, by: 'A CRUSHER' })) {
      pb.velocity.x = (Math.sign(pb.center.x - Pr.x) || this.facing) * 300; pb.velocity.y = -220; this.jumpCuttable = false; BUS.emit('callout', 'FLATTENED');
    }
    let crushed = 0;
    for (const e of this.enemies.getChildren()) {
      if (!e.alive || e.under || e.def.noClip) continue;
      const b = e.body; if (b.right < x0 || b.left > x1 || b.bottom < y0 || b.top > y1) continue;
      this.paintSplatAround(b.center.x, y1 - 2, 12);
      this.damageEnemy(e, e.def.boss || e.def.miniBoss ? 60 : T.edmg, 0, 1, 'crush'); if (!e.alive) crushed++;
    }
    if (crushed) { BUS.emit('callout', crushed > 1 ? 'COMPACTED!' : 'CRUSHED!'); this.addStyle(60 * crushed); this.impactFrame(1); }
    for (const k of this.barrelList) if (k.active && k.x > x0 && k.x < x1 && k.y > y0 && k.y < y1) this.explodeBarrel(k);
    for (const p of this.props) if (p.st === 'ok' && p.cx + p.hw > x0 && p.cx - p.hw < x1 && p.cy + p.hh > y0 && p.cy - p.hh < y1) this.hitProp(p, 999, 'crush', p.cx, p.cy - p.hh, 0, 1);
    for (const rd of this.ragdolls.slice()) { const c = rd.pts[2]; if (c.x > x0 && c.x < x1 && c.y > y0 && c.y < y1) this.hitRagdoll(rd, c.x, c.y, 999, 0, 1, 'blast'); }
  },

  // ---------------------------------------------------------------- steam pipes ----
  // Valves on the walls. Shoot one (or blast it) and it bursts: a 56 px jet of scalding steam for 3.5 s that hurts and
  // shoves anything in it (foes 6 per 0.25 s, you 5 per 0.3 s). New pipes every wave.
  burstPipe(pp) {
    if (pp.broken) return;
    pp.broken = true; pp.t = TUNE.PIPE.t; pp.sp.setTexture('pipeb');
    this.fxSparks(pp.x, pp.y, 6, pp.dir > 0 ? 0 : Math.PI, 1.2); Sfx.clang(0.6); Sfx.steam(); this.addStyle(10);
  },
  repairPipe(pp) {                                                     // a new wave: the burst valve is welded back on, and keeps the clamp to show for it
    pp.broken = false; pp.sp.setTexture('pipe');
    const x = Math.round(pp.x + pp.dir * 3.5), y = pp.y, G = this.pipeG;
    G.fillStyle(0x15171b, 1).fillRect(x - 1, y - 4, 3, 8); G.fillStyle(0x5a6574, 1).fillRect(x, y - 4, 1, 8);
    G.fillStyle(0xd8dee6, 1).fillRect(x, y - 4, 1, 1).fillRect(x, y + 3, 1, 1); G.fillStyle(0xc87a30, 0.9).fillRect(x - 1, y - 1, 3, 2);
    Sfx.weld(); this.spawnLight(x, y, 'glow', 0xbfe8ff, 0.5, 1.1, 0.9, 0.7);
    this.time.addEvent({ delay: 90, repeat: 7, callback: () => this.fx.emit(x + crand(-2, 2), y + crand(-3, 3), { n: 3, speed: [40, 150], life: [0.1, 0.3], size: [1, 1], cols: [0xffffff, 0xbfe8ff, 0xffd070], add: true, g: 300, cosmetic: true }) });
  },
  updatePipes(dt, now) {
    const T = TUNE.PIPE, pb = this.player.body;
    for (const pp of this.pipes || []) {
      if (pp.t <= 0) continue;
      pp.t -= dt;
      const k = Math.min(1, pp.t / 0.8), x0 = pp.x, x1 = pp.x + pp.dir * T.len * k;
      for (let i = 0; i < 3; i++) this.fx.emit(pp.x + pp.dir * 4, pp.y + rand(-2, 2), { n: 1, angle: pp.dir > 0 ? 0 : Math.PI, spread: 0.25, speed: [160, 260] , life: [0.2, 0.35 * k + 0.05], size: [3, 9], cols: [0xffffff, 0xd8e0e8, 0xa0a8b0], alpha: [0.55, 0], drag: 2, g: -40, jitter: 2 });
      if ((pp.tick -= dt) > 0) continue;
      pp.tick = 0.25;
      const xl = Math.min(x0, x1), xr = Math.max(x0, x1), yt = pp.y - 13, yb = pp.y + 13;
      for (const e of this.enemies.getChildren()) {
        if (!e.alive || e.under) continue;
        const b = e.body; if (b.right < xl || b.left > xr || b.bottom < yt || b.top > yb) continue;
        this.damageEnemy(e, T.dmg, pp.dir, 0, 'flame'); if (e.alive) b.velocity.x += pp.dir * T.push * e.def.kb;
      }
      if (this.state !== 'dead' && (pp.ptick = (pp.ptick || 0) - 0.25) <= 0 && pb.right > xl && pb.left < xr && pb.bottom > yt && pb.top < yb) {
        pp.ptick = 0.3; if (this.hurtPlayer(T.pdmg, pp.x, { knock: false, burn: true, srcY: pp.y, by: 'STEAM' })) pb.velocity.x += pp.dir * T.push;
      }
    }
  },
  spawnCloud(x, y) {
    const T = TUNE.GASBAG;
    this.clouds.push({ x, y, r: T.cloudR, t: T.cloudT, tick: 0.2 });
    this.fx.emit(x, y, { n: 26, speed: [20, 110], life: [0.6, 1.4], size: [4, 10], cols: [0xb0d050, 0x7a9a30, 0x4a6a20], alpha: [0.6, 0], drag: 2.5, g: -10, jitter: 4 });
    Sfx.gasPop();
  },
  updateClouds(dt, now) {
    if (!this.clouds.length) return;
    const T = TUNE.GASBAG, pb = this.player.body;
    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const C = this.clouds[i]; C.t -= dt;
      if (C.t <= 0) { this.clouds.splice(i, 1); continue; }
      const k = Math.min(1, C.t / 1.5);
      if (Math.random() < 0.7 * k) { const th = rand(0, Math.PI * 2), r = Math.sqrt(Math.random()) * C.r; this.fx.emit(C.x + Math.cos(th) * r, C.y + Math.sin(th) * r * 0.7, { n: 1, speed: [4, 18], life: [0.8, 1.6], size: [5, 11], cols: [0xa8c848, 0x7a9a30, 0x4a6a20], alpha: [0.35 * k, 0], drag: 1, g: -6, jitter: 3 }); }
      for (const e of this.enemies.getChildren()) if (e.alive && e.burnT > 0 && Math.hypot(e.body.center.x - C.x, e.body.center.y - C.y) < C.r) { this.igniteCloud(C); break; }
      if (C.gone) continue;
      for (const Q of this.puddles) if (Q.fire && Math.abs(Q.x - C.x) < Q.w / 2 + C.r * 0.6 && Math.abs(Q.y - C.y) < C.r) { this.igniteCloud(C); break; }
      if (C.gone || (C.tick -= dt) > 0) continue;
      C.tick = 0.4;
      if (!C.mine && this.state !== 'dead' && Math.hypot(pb.center.x - C.x, pb.center.y - C.y) < C.r) this.hurtPlayer(T.dmg, C.x, { knock: false, iframes: false, burn: true, srcY: C.y });
      for (const e of this.enemies.getChildren()) if (e.alive && !e.under && e.kind !== 'gasbag' && (!e.def.mech || C.mine) && Math.hypot(e.body.center.x - C.x, e.body.center.y - C.y) < C.r) { this.damageEnemy(e, C.mine ? 5 : 3, 0, 0, 'gas'); if (C.mine && e.alive) e.corrodeT = Math.max(e.corrodeT, 1.5); if (C.mine && !C.counted) { C.counted = true; this.stats.hits++; } }
    }
  },
  igniteCloud(C) {
    if (!C || C.gone) return; C.gone = true;
    const i = this.clouds.indexOf(C); if (i >= 0) this.clouds.splice(i, 1);
    this.explode(C.x, C.y, TUNE.GAS_BOOM);
    for (let k = 0; k < 10; k++) this.fxFire(C.x + rand(-C.r, C.r) * 0.7, C.y + rand(-C.r, C.r) * 0.5, 3);
    this.spawnLight(C.x, C.y, 'glow', 0xff8a20, 3, 6, 0.9, 0.4);
    BUS.emit('callout', 'GAS IGNITED!'); this.addStyle(60); Sfx.gasBoom(); this.impactFrame(1);
  },

  // ---------------------------------------------------------------- fire jets ----
  // ARENA 02: three vents on the furnace top. Every ~9 s the grate flares (1.1 s tell), then they fire left to right:
  // 76 px columns that burn you (9 per 0.25 s, and a hop) and set alight anything standing up there, foe or corpse.
  updateJets(dt, now) {
    if (!this.jets || !this.jets.length || (this.campaign && this.campaignMachinery !== 'vents')) return;
    const J = this.jetCycle, T = TUNE.JETS, pb = this.player.body;
    J.t -= dt;
    if (J.st === 'idle') { if (J.t <= 0) { J.st = 'tell'; J.t = T.tell; Sfx.rumble(0.5); } return; }
    if (J.st === 'tell') {
      for (const jet of this.jets) if (Math.random() < 0.5) this.fx.emit(jet.x + rand(-5, 5), jet.y - 1, { n: 1, angle: -Math.PI / 2, spread: 0.4, speed: [20, 70], life: [0.2, 0.4], size: [2, 1], cols: [0xffe46a, 0xff8a1f, 0xc03010], add: true, g: -40 });
      if (J.t <= 0) { J.st = 'fire'; J.f = 0; J.t = T.fire + T.stagger * (this.jets.length - 1); }
      return;
    }
    J.f += dt;
    for (const jet of this.jets) {
      const st = jet.i * T.stagger, on = J.f >= st && J.f < st + T.fire;
      if (!on) { jet.lit = false; continue; }
      if (!jet.lit) { jet.lit = true; Sfx.ignite(); if (Math.hypot(pb.center.x - jet.x, pb.center.y - jet.y) < 260) this.shake(120, 0.003); }
      for (let k = 0; k < 4; k++) this.fx.emit(jet.x + rand(-4, 4), jet.y - 2, { n: 1, angle: -Math.PI / 2, spread: 0.18, speed: [180, 300], life: [0.2, 0.36], size: [6, 2], cols: [0xffffff, 0xffe46a, 0xffa030, 0xff5a1a, 0xa82010], add: true, g: -60, drag: 0.8 });
      if (Math.random() < 0.3) this.spawnLight(jet.x, jet.y - 30, 'glow', 0xff8a20, 2.5, 3, 0.5, 0.1);
      if ((jet.tick -= dt) > 0) continue;
      jet.tick = 0.25;
      const x0 = jet.x - 9, x1 = jet.x + 9, y0 = jet.y - jet.h, y1 = jet.y + 2;
      if (this.state !== 'dead' && pb.right > x0 && pb.left < x1 && pb.bottom > y0 && pb.top < y1 && this.hurtPlayer(T.dmg, jet.x, { knock: false, burn: true, srcY: jet.y })) { pb.velocity.x = (Math.sign(pb.center.x - jet.x) || this.facing) * 210; pb.velocity.y = Math.min(pb.velocity.y, -170); this.jumpCuttable = false; }   // flung out of the column
      for (const e of this.enemies.getChildren()) {
        if (!e.alive || e.under) continue;
        const b = e.body; if (b.right < x0 || b.left > x1 || b.bottom < y0 || b.top > y1) continue;
        this.ignite(e, 2.5); this.damageEnemy(e, T.dmg, 0, -1, 'flame');
      }
      for (const rd of this.ragdolls) { const c = rd.pts[2]; if (c.x > x0 && c.x < x1 && c.y > y0 && c.y < y1) rd.burnT = Math.max(rd.burnT, 2); }
      for (const k of this.barrelList) if (k.active && k.x > x0 && k.x < x1 && k.y > y0 && k.y < y1) this.igniteBarrel(k);
      for (const pr of this.props || []) if (pr.st === 'ok' && pr.cx > x0 && pr.cx < x1 && pr.cy > y0 && pr.cy < y1) this.igniteProp(pr);
      for (const P of this.tars.slice()) if (Math.abs(P.y - jet.y) < 6 && Math.abs(P.x - jet.x) < P.w / 2 + 9) this.igniteTar(P);
    }
    if (J.t <= 0) { J.st = 'idle'; J.t = T.idle * rand(0.85, 1.2); for (const jet of this.jets) jet.lit = false; }
  },

  // ------------------------------------------------------------------- gibs ----
  spawnGib(tex, x, y, vx, vy, kind) {                     // kind: undefined = meat, 'shell', 'metal', 'slag' (glowing, cools)
    const shell = kind === 'shell', metal = kind === 'metal' || kind === 'slag';
    let g = this.gibs.getFirstDead(false);
    if (!g) {                                              // recycle the oldest: where it lay, it crumbles instead of blinking out
      g = this.gibList[this.gibCursor]; this.gibCursor = (this.gibCursor + 1) % this.gibList.length;
      if (this.cameras.main.worldView.contains(g.x, g.y)) this.cfx.emit(g.x, g.y, { n: 6, speed: [15, 50], life: [0.3, 0.6], size: [2, 1], g: 180, cosmetic: true,
        cols: g.shell ? [0xd8b050, 0x8a6a2a] : g.metal ? (g.hot > 0 ? [0xff8a20, 0x6a5a50] : [0x9aa0a8, 0x5a5e66, 0x3a3c40]) : [0x9a1a1a, 0x5a0a0a, 0x4a3a30] });
    }
    g.setTexture(tex); g.clearTint();
    g.enableBody(true, x, y, true, true);
    g.body.setSize(Math.max(2, g.frame.width - 3), Math.max(2, g.frame.height - 3), true);
    g.body.setAllowGravity(true);
    g.body.setBounce(shell ? 0.45 : metal ? 0.4 : rand(0.25, 0.42));
    g.setVelocity(vx, vy); g.body.setAngularVelocity(rand(-900, 900));
    g.setRotation(rand(0, Math.PI * 2)).setAlpha(1);
    Object.assign(g, { ttl: shell ? rand(2.5, 3.5) : metal ? rand(3, 5) : rand(7, 10), bleed: shell || metal ? 0 : rand(0.4, 1.4), bleedT: 0,
      shell, metal, kickT: 0, prevV: 0, stuckT: 0, canStick: !shell && !metal, hot: kind === 'slag' ? rand(1.2, 2.6) : 0 });
    return g;
  },
  updateGibs(dt) {
    for (const g of this.gibList) {
      if (!g.active) continue;
      const b = g.body;
      g.ttl -= dt;
      if (g.ttl <= 0) { g.disableBody(true, true); continue; }
      if (g.ttl < 1) g.setAlpha(Math.floor(g.ttl * 10) % 2 ? 0.35 : 0.9);
      if (g.hot > 0) {                                       // molten chunk: smokes and dims as it cools
        g.hot -= dt;
        if (Math.random() < 0.3) this.fx.emit(g.x, g.y, { n: 1, angle: -Math.PI / 2, spread: 0.6, speed: [10, 30], life: [0.2, 0.4], size: [2, 1], cols: [0xffe080, 0xff8a20, 0xa02008], add: true, g: -40 });
        const k = clamp(g.hot / 1.5, 0, 1), c = (255 << 16) | (Math.round(110 + 145 * k) << 8) | Math.round(80 + 175 * k);
        if (g.hot <= 0) g.setTint(0x5a4034); else g.setTint(c);
      }
      if (g.stuckT > 0) {                                  // meat glued to a wall/ceiling: drips, then lets go
        g.stuckT -= dt;
        if (Math.random() < dt * 6) this.fxBlood(g.x, g.y + 2, 1, Math.PI / 2, 0.3, [5, 20]);
        if (g.stuckT <= 0) { b.setAllowGravity(true); b.setVelocity(rand(-10, 10), 0); }
        continue;
      }
      const sp = Math.abs(b.velocity.x) + Math.abs(b.velocity.y);
      if (b.blocked.down || b.touching.down) {
        b.velocity.x *= Math.pow(0.04, dt); b.angularVelocity *= Math.pow(0.002, dt);
        if (Math.abs(b.angularVelocity) < 20) b.angularVelocity = 0;
      }
      const hitSurface = b.blocked.down || b.blocked.left || b.blocked.right || b.blocked.up;
      if (hitSurface && g.prevV > 110) {
        if (g.shell || g.metal) { Sfx.tink(0.6); if (g.metal) this.fxSparks(g.x, g.y, 2, -Math.PI / 2, 2, [30, 100]); }
        else {
          const px = b.blocked.left ? b.left - 1 : b.blocked.right ? b.right + 1 : g.x;
          const py = b.blocked.down ? b.bottom + 1 : b.blocked.up ? b.top - 1 : g.y;
          this.paintSplat(px, py, 2 + Math.min(4, g.prevV / 90), b.blocked.down || b.blocked.up);
          if (g.prevV > 220) Sfx.squish();
          if (g.canStick && g.prevV > 200 && (b.blocked.up || b.blocked.left || b.blocked.right) && Math.random() < 0.6) {
            g.canStick = false; g.stuckT = rand(0.6, 2.4);
            b.setAllowGravity(false); b.setVelocity(0, 0); b.setAngularVelocity(0);
          }
        }
      }
      if (g.bleed > 0 && sp > 40) {
        g.bleed -= dt; g.bleedT -= dt;
        if (g.bleedT <= 0) { g.bleedT = 0.035; this.fxBlood(g.x, g.y, 1, 0, Math.PI * 2, [5, 30]); }
      }
      g.prevV = sp;
    }
  },

  // ----------------------------------------------------------------- ambience ----
  updateAmbient(dt, now) {
    for (const L of this.lamps) {
      if (L.dead) continue;
      if (L.falling) { this.updateLamp(L, dt); continue; }
      L.t += dt;
      let a = 0.88 + 0.12 * Math.sin(L.t * 9 + L.ph);
      if (Math.random() < 0.003) L.drop = 0.12;
      if (L.drop > 0) { L.drop -= dt; a *= 0.25; }
      a *= (1 - (this.darkA || 0)) * (L.outUntil > now ? 0.03 : 1) * (this.powerCut ? 0.3 : 1); L.gl.setAlpha(0.5 * a); L.cone.setAlpha(0.16 * a);   // lamps die in a blackout (and a blown transformer's); emergency light once the power's cut
    }
    for (const B of this.beacons) B.img.setAlpha(0.35 + 0.35 * Math.sin(now / 220 + B.ph));
    const ventsOn = !this.campaign || this.campaignMachinery === 'vents';   // switched off mid-cycle, the grate goes back to its idle glow
    const jb = !ventsOn ? 0 : this.jetCycle && this.jetCycle.st === 'tell' ? 1 - this.jetCycle.t / TUNE.JETS.tell : this.jetCycle && this.jetCycle.st === 'fire' ? 1 : 0;   // the grate flares before the vents fire
    for (const F of this.furnaceGlows) F.img.setScale(F.sc * (1 + Math.sin(now / 300 + F.ph) * 0.06 + jb * 0.35)).setAlpha((0.4 + 0.1 * Math.sin(now / 170 + F.ph) + jb * 0.4) * (this.powerCut ? 0.15 : 1));
    if (this.A.id === 2 && Math.random() < dt * 14) this.fx.emit(rand(46, 54) * TS, 19 * TS - 2, { n: 1, angle: -Math.PI / 2, spread: 0.4, speed: [30, 90], life: [0.8, 1.8], size: [2, 1], cols: [0xffe080, 0xff8a20, 0xa02008], add: true, g: -20, drag: 0.4 });   // the furnace breathes embers
    for (const v of this.vents) {
      v.t += dt;
      if (v.t % 4 < 1.6) { v.acc += dt; while (v.acc > 0.05) { v.acc -= 0.05; this.fx.emit(v.x + rand(-4, 4), v.y - 2, { n: 1, angle: -Math.PI / 2, spread: 0.4, speed: [30, 60], life: [0.8, 1.4], size: [2, 8], cols: [0x9a9590, 0x6a6560], alpha: [0.35, 0], g: -10, drag: 1 }); } }
    }
    this.moteT -= dt;
    if (this.moteT <= 0) {
      this.moteT = this.A.id === 2 ? 0.05 : 0.12; const v = this.cameras.main.worldView;
      this.fx.emit(rand(v.x, v.right), rand(v.y, v.bottom), { n: 1, speed: [2, 9], life: [2.5, 4.5], size: [1, 1], cols: [0xffb070], alpha: [0.45, 0], add: true, g: -3 });
    }
    for (const k of this.pickups) {
      if (k.taken) continue;
      if (!this.standAt(k.x, k.y + 9)) { k.vy = (k.vy || 0) + 700 * dt; k.y += k.vy * dt; k.glow.y = k.y; }   // its shelf got blown away
      else if (k.vy) { k.y = Math.floor((k.y + 9) / TS) * TS - 8; k.vy = 0; k.glow.y = k.y; }
      k.img.y = k.y + Math.round(Math.sin(now / 280 + k.ph) * 2);
      k.glow.setAlpha(0.35 + 0.15 * Math.sin(now / 200 + k.ph));
      if (this.state === 'dead' || this.hp >= TUNE.PLAYER_HP) continue;
      const pb = this.player.body;
      if (Math.abs(pb.center.x - k.x) < 13 && Math.abs(pb.center.y - k.y) < 16) {
        k.taken = true; k.img.setVisible(false); k.glow.setVisible(false);
        this.hp = Math.min(TUNE.PLAYER_HP, this.hp + TUNE.HEALTH_PACK);
        BUS.emit('hp', this.hp, 0); Sfx.pickup();
        this.fx.emit(k.x, k.y, { n: 18, speed: [30, 110], life: [0.3, 0.7], size: [2, 1], cols: [0xffffff, 0x7dff8a, 0x2ad05a], add: true, g: -60, drag: 2 });
      }
    }
  },
  updateFxSprites(dt) {
    for (const s of this.booms) {
      if (!s.on) continue;
      s.t += dt; const f = Math.floor(s.t / 0.06);
      if (f > 5) { s.on = false; s.setVisible(false); } else s.setFrame('b' + f);
    }
    for (const l of this.lights) {
      if (!l.on) continue;
      l.t += dt; const k = l.t / l.dur;
      if (k >= 1) { l.on = false; l.setVisible(false); continue; }
      l.setScale(l.s0 + (l.s1 - l.s0) * k).setAlpha(l.a0 * (1 - k));
    }
    for (const d of this.decals) {
      if (!d.visible) continue;
      d.ttl -= dt;
      if (d.ttl <= 0) d.setVisible(false); else if (d.ttl < 0.5) d.setAlpha(d.ttl * 2);
    }
    for (let i = this.dmgNums.length - 1; i >= 0; i--) {              // damage numbers: pop, rise, fade
      const n = this.dmgNums[i]; n.t += dt;
      const k = n.t / (n.big ? 0.9 : 0.7);
      if (k >= 1) { n.imgs.forEach(img => { img.setVisible(false); this.digPool.push(img); }); this.dmgNums.splice(i, 1); continue; }
      const s = k < 0.12 ? (n.big ? 2.2 : 1.7) - k * (n.big ? 10 : 6) : n.big ? 1.25 : 1, w = n.imgs.length * 6 * s;
      const x = n.x + n.vx * n.t, y = n.y - 22 * (1 - Math.pow(1 - k, 3));
      n.imgs.forEach((img, j) => img.setPosition(Math.round(x - w / 2 + (j + 0.5) * 6 * s), Math.round(y)).setScale(s).setAlpha(k > 0.65 ? (1 - k) / 0.35 : 1));
    }
    for (let i = this.fountains.length - 1; i >= 0; i--) {             // headless neck spurts
      const f = this.fountains[i]; f.t -= dt;
      if (f.t <= 0 || (f.rd && f.rd.gone)) { this.fountains.splice(i, 1); continue; }
      if (f.rd) { const N = f.rd.pts[1], Pv = f.rd.pts[2]; this.fxBlood(N.x, N.y, 2, Math.atan2(N.y - Pv.y, N.x - Pv.x), 0.5, [90, 220 * Math.min(1, f.t + 0.3)]); continue; }   // spurts from the ragdoll's neck
      this.fxBlood(f.x, f.y, 3, -Math.PI / 2, 0.7, [120, 260 * Math.min(1, f.t + 0.3)]);
    }
    for (let i = this.beams.length - 1; i >= 0; i--) { this.beams[i].t += dt; if (this.beams[i].t >= this.beams[i].dur) this.beams.splice(i, 1); }
  },
  zap(g, x0, y0, x1, y1) {                                             // jagged pixel lightning between two points
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, n = Math.max(2, Math.round(len / 7)), nx = -dy / len, ny = dx / len;
    let px = x0, py = y0;
    for (let i = 1; i <= n; i++) {
      const t = i / n, off = i === n ? 0 : crand(-3.5, 3.5), qx = x0 + dx * t + nx * off, qy = y0 + dy * t + ny * off;   // jitter is cosmetic: no Math.random
      g.lineStyle(3, 0x4ab8ff, 0.35).lineBetween(px, py, qx, qy);
      g.lineStyle(1, 0xe8f8ff, 0.95).lineBetween(px, py, qx, qy);
      px = qx; py = qy;
    }
  },

  // runs after Arcade has written body positions back to sprites
  syncVisuals() {
    const now = this.time.now;
    if (this.state !== 'dead') {
      const p = this.player, bob = this.pBob;
      this.pv.setPosition(p.x, p.y + 12).setScale(this.sqx, this.sqy);
      if (this.pv.frame.name !== this.pFrame) this.pv.setFrame(this.pFrame);
      this.pv.flipX = this.facing < 0;
      this.pv.setAlpha(now < this.invulnUntil && Math.floor(now / 60) % 2 ? 0.35 : 1);
      const ct = this.pCorrodeT > 0 ? 0xb8ff90 : 0xffffff; if (this.pvTint !== ct) { this.pvTint = ct; if (ct === 0xffffff) this.pv.clearTint(); else this.pv.setTint(ct); }   // corroded: green
      const ca = Math.cos(this.aim), sa = Math.sin(this.aim);
      const sx = p.x + (this.facing > 0 ? 0 : -1), sy = p.y - 2 + bob + Math.round(this.swapT / 0.14 * 5);
      this.gun.setPosition(Math.round(sx - ca * this.recoil), Math.round(sy - sa * this.recoil)).setRotation(this.aim).setAlpha(this.pv.alpha);
      this.gun.scaleY = ca < 0 ? -1 : 1;                              // mirror around the shoulder pivot
      const wid = WEAPONS[this.weapon].id;
      if (wid === 'mini') {                                           // spinning barrels + heat glow
        const key = this.spin > 0.05 && Math.floor(now / (70 - 50 * this.spin)) % 2 ? 'gun_mini2' : 'gun_mini';
        if (this.gun.texture.key !== key) this.gun.setTexture(key);
        this.gun.setTint((255 << 16) | (Math.round(255 - 110 * this.heat) << 8) | Math.round(255 - 170 * this.heat)); this.gunTinted = true;
      } else if (wid === 'lance' && this.lanceOn) {                     // charging: the barrel heats up, the emitter swells
        const c = this.lanceCharge, G = GUNS.lance;
        this.gun.setTint((255 << 16) | (Math.round(255 - 90 * c) << 8) | Math.round(255 - 190 * c)); this.gunTinted = true;
        this.lanceGlow.setVisible(true).setPosition(this.gun.x + ca * G.muzzle, this.gun.y + sa * G.muzzle).setScale(0.35 + 1.1 * c + (c >= 1 ? Math.random() * 0.3 : 0)).setAlpha(0.45 + 0.45 * c);
      } else if (wid === 'heatray' && this.hrHeat > 0.01) {             // heat ray: the heat shows on the gun
        this.heatGun(ca, sa, now);
      } else if (masteryStars(wid) >= 3) {                              // mastered: gold-plated, with the odd glint
        this.gun.setTint(0xffe080); this.gunTinted = true;
        if (Math.random() < 0.05) this.fx.emit(this.gun.x + ca * rand(2, 14), this.gun.y + sa * rand(2, 14) + rand(-2, 2), { n: 1, speed: [0, 8], life: [0.15, 0.3], size: [1, 1], cols: [0xffffff, 0xffe080], add: true });
      } else if (this.gunTinted) { this.gun.clearTint(); this.gunTinted = false; }
      if (!(wid === 'lance' && this.lanceOn)) this.lanceGlow.setVisible(false);
      if (wid === 'ripper') { const key = now < this.ripperUntil && Math.floor(now / 35) % 2 ? 'gun_ripper2' : 'gun_ripper'; if (this.gun.texture.key !== key) this.gun.setTexture(key); }
      else if (wid === 'glaive') { const key = this.glaive.on ? 'gun_glaive2' : 'gun_glaive'; if (this.gun.texture.key !== key) this.gun.setTexture(key); }
      if (wid === 'hammer') {                                           // raised overhead while charging, swung down on release
        let r = this.aim;
        if (this.hammerOn) r = this.facing > 0 ? -1.9 + Math.sin(now / 35) * 0.05 * this.hammerCharge : Math.PI + 1.9 - Math.sin(now / 35) * 0.05 * this.hammerCharge;
        if (this.hammerSwing > 0) { const k = this.hammerSwing / 0.14; r = this.facing > 0 ? 1.1 - 3 * k : Math.PI - 1.1 + 3 * k; }
        if (this.diving) r = this.facing > 0 ? 1.35 : Math.PI - 1.35;
        this.gun.setRotation(r); this.gun.scaleY = Math.cos(r) < 0 ? -1 : 1;
        if (this.hammerOn && this.hammerCharge >= 1) this.gun.setTint(Math.floor(now / 60) % 2 ? 0xffd0a0 : 0xffffff); else if (!this.gunTinted) this.gun.clearTint();
      }
      this.visor.setPosition(p.x + this.facing * 3, p.y - 7 + bob);
      if (this.mflash.visible) {
        if (now > this.mflashUntil) this.mflash.setVisible(false);
        else { const G = GUNS[WEAPONS[this.weapon].gun]; this.mflash.setPosition(this.gun.x + ca * G.muzzle, this.gun.y + sa * G.muzzle).setRotation(this.aim); }
      }
    }
    this.laserG.clear();
    const g = this.arcG; g.clear();
    this.drawTractor(g, now);
    for (let i = this.shockBeams.length - 1; i >= 0; i--) {             // shock beams: violet-white bolt with a jagged halo
      const B = this.shockBeams[i]; B.t += this.game.loop.delta / 1000;
      if (B.t >= B.dur) { this.shockBeams.splice(i, 1); continue; }
      const a = 1 - B.t / B.dur, len = Math.hypot(B.x1 - B.x0, B.y1 - B.y0) || 1, nx = -(B.y1 - B.y0) / len, ny = (B.x1 - B.x0) / len, n = Math.max(2, Math.round(len / 10));
      g.lineStyle(B.combo ? 7 : 5, 0x6a40ff, 0.35 * a).lineBetween(B.x0, B.y0, B.x1, B.y1);
      let px = B.x0, py = B.y0;
      for (let j = 1; j <= n; j++) { const t = j / n, w = j === n ? 0 : rand(-3, 3), qx = B.x0 + (B.x1 - B.x0) * t + nx * w, qy = B.y0 + (B.y1 - B.y0) * t + ny * w; g.lineStyle(2, 0x9ae8ff, 0.8 * a).lineBetween(px, py, qx, qy); px = qx; py = qy; }
      g.lineStyle(1, 0xffffff, a).lineBetween(B.x0, B.y0, B.x1, B.y1);
    }
    if (this.shockHeld && WEAPONS[this.weapon].id === 'shock' && this.state !== 'dead') {   // charging: a spark at the muzzle; it pops when the beam is ready
      const a = this.aim, mx = this.shoulder.x + Math.cos(a) * 25, my = this.shoulder.y + Math.sin(a) * 25, k = Math.min(1, this.shockHoldT / (TUNE.SHOCK.holdMs / 1000));
      g.fillStyle(this.shockReady ? 0xffffff : 0x9ae8ff, 0.5 + 0.5 * k).fillCircle(mx, my, 1 + 2.5 * k);
      if (this.shockReady) g.lineStyle(1, 0x9ae8ff, 0.6 + Math.random() * 0.4).strokeCircle(mx, my, 5 + Math.random() * 2);
    }
    if (WEAPONS[this.weapon].id === 'marksman' && this.state !== 'dead' && !this.wheelOn) {   // the marksman's laser sight
      const a = this.aim, sx = this.shoulder.x, sy = this.shoulder.y; let ex = sx, ey = sy;
      for (let d = 14; d < 700; d += 4) { ex = sx + Math.cos(a) * d; ey = sy + Math.sin(a) * d; if (this.solidAt(ex, ey) || this.enemyAt(ex, ey, 0)) break; }
      this.laserG.lineStyle(1, 0xff3020, 0.35).lineBetween(sx + Math.cos(a) * 14, sy + Math.sin(a) * 14, ex, ey); this.laserG.fillStyle(0xff5040, 0.9).fillRect(ex - 1, ey - 1, 2, 2);
    }
    if (WEAPONS[this.weapon].id === 'vacuum' && this.state !== 'dead') {     // the vacuum's hopper over your head
      const cx = Math.round(this.player.x), cy = Math.round(this.player.y) - 21, f = this.vac.ammo / TUNE.VACUUM.store;
      this.laserG.fillStyle(0x1a1d22, 0.85).fillRect(cx - 9, cy, 18, 4); this.laserG.fillStyle(f >= 1 ? 0xffe46a : 0xc8a040, 1).fillRect(cx - 8, cy + 1, Math.round(16 * f), 2);
    }
    if (WEAPONS[this.weapon].id === 'revolver' && this.state !== 'dead') {   // six chambers over your head; they spin while it reloads
      const cx = this.player.x, cy = this.player.y - 20, rl = this.revAmmo <= 0, sp = rl ? now / 60 : 0;
      for (let i = 0; i < 6; i++) { const th = sp + i / 6 * Math.PI * 2 - Math.PI / 2, x = cx + Math.cos(th) * 4, y = cy + Math.sin(th) * 4; this.laserG.fillStyle(!rl && i < this.revAmmo ? 0xffd060 : 0x3a3a40, rl ? 0.7 : 0.9).fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2); }
    }
    for (const L2 of this.sparkLinks) this.zapCol(g, L2[0], L2[1], L2[2], L2[3], 0x40c0ff, 0xd8f4ff);
    for (const B of this.blades) { const px = -Math.sin(B.ang) * TUNE.CUTTER.half, py = Math.cos(B.ang) * TUNE.CUTTER.half; g.lineStyle(4, 0x2a8ad0, 0.4).lineBetween(B.x - px, B.y - py, B.x + px, B.y + py); g.lineStyle(1, 0xd8f8ff, 1).lineBetween(B.x - px, B.y - py, B.x + px, B.y + py); }
    { const S = this.sky, O = TUNE.ORBITAL; if (S.st !== 'idle') {                                          // the designator: a painting laser, then the strike
      const k = S.st === 'paint' ? Math.min(1, S.t / O.paint) : 1, r = S.st === 'paint' ? 14 - 8 * k : 6, blink = Math.floor(now / 60) % 2;
      if (S.st === 'paint' && this.state !== 'dead') { const a = this.aim, mx = this.shoulder.x + Math.cos(a) * 25, my = this.shoulder.y + Math.sin(a) * 25; this.laserG.lineStyle(1, 0xff3020, 0.35 + 0.4 * k).lineBetween(mx, my, S.x, S.y); }
      if (S.st !== 'fire') { g.lineStyle(1, 0xff5040, 0.6 + 0.4 * (blink ? 1 : 0)).strokeCircle(S.x, S.y, r); g.lineStyle(1, 0xff5040, 0.8).lineBetween(S.x - r - 3, S.y, S.x - r + 2, S.y).lineBetween(S.x + r - 2, S.y, S.x + r + 3, S.y).lineBetween(S.x, S.y - r - 3, S.x, S.y - r + 2); }
      if (S.st === 'wait') g.lineStyle(1, 0x9ae8ff, 0.2 + 0.5 * (1 - S.t / O.delay) * (blink ? 1 : 0.5)).lineBetween(S.x, S.top, S.x, S.y);
      if (S.st === 'fire') { const w = O.half * (0.8 + Math.random() * 0.4); g.fillStyle(0x2a6ad0, 0.35).fillRect(S.x - w - 6, S.top, (w + 6) * 2, S.y - S.top); g.fillStyle(0x9ae8ff, 0.8).fillRect(S.x - w, S.top, w * 2, S.y - S.top); g.fillStyle(0xffffff, 1).fillRect(S.x - w * 0.4, S.top, w * 0.8, S.y - S.top); }
    } }
    { const F = this.flail; if (F.st !== 'idle' && this.state !== 'dead') {                                         // the flail's chain + ball
      const sx = this.shoulder.x, sy = this.shoulder.y, n = Math.max(2, Math.round(Math.hypot(F.x - sx, F.y - sy) / 4));
      for (let i = 1; i < n; i++) this.laserG.fillStyle(i % 2 ? 0xa0aab6 : 0x5a636e, 1).fillRect(Math.round(sx + (F.x - sx) * i / n) - 1, Math.round(sy + (F.y - sy) * i / n) - 1, 2, 2);
      if (!F.img) F.img = this.add.image(F.x, F.y, 'flailball').setDepth(8);
      F.img.setVisible(true).setPosition(F.x, F.y).setRotation(now / 60);
    } else if (F.img) F.img.setVisible(false); }
    for (const R2 of this.empRings) { const a = 1 - R2.r / TUNE.JAMMER.reach; g.lineStyle(3, 0x30c070, 0.35 * a).strokeCircle(R2.x, R2.y, R2.r); g.lineStyle(1, 0xc8ffd8, 0.9 * a).strokeCircle(R2.x, R2.y, R2.r); }
    for (const L of this.limpets) if (Math.floor(now / (L.stuck ? 260 : 120)) % 2) g.fillStyle(0xff3020, 1).fillRect(Math.round(L.x) - 1, Math.round(L.y) - 2, 2, 1);   // blinking limpet lights
    for (const L of this.spiders) L.img.setPosition(L.x, L.y - 2).setFlipX(L.dir < 0).setTexture(L.st === 'walk' && Math.floor(now / 70) % 2 ? 'spider1' : 'spider0');
    for (let i = this.shrinkFx.length - 1; i >= 0; i--) {                // shrink ray: a wobbling cyan-pink beam
      const Z = this.shrinkFx[i]; Z.t += this.game.loop.delta / 1000; const a = 1 - Z.t / 0.15; if (a <= 0) { this.shrinkFx.splice(i, 1); continue; }
      const len = Math.hypot(Z.x1 - Z.x0, Z.y1 - Z.y0) || 1, nx = -(Z.y1 - Z.y0) / len, ny = (Z.x1 - Z.x0) / len; let px = Z.x0, py = Z.y0;
      for (let k = 1; k <= 12; k++) { const t = k / 12, w = Math.sin(t * 20 + Z.t * 60) * 3 * Math.sin(t * Math.PI), qx = Z.x0 + (Z.x1 - Z.x0) * t + nx * w, qy = Z.y0 + (Z.y1 - Z.y0) * t + ny * w; g.lineStyle(2, k % 2 ? 0x60ffe0 : 0xff60d0, a).lineBetween(px, py, qx, qy); px = qx; py = qy; }
    }
    for (let i = this.sonics.length - 1; i >= 0; i--) {                  // sonic blaster: rings racing out through the cone
      const S = this.sonics[i]; S.t += this.game.loop.delta / 1000; const k = S.t / 0.22; if (k >= 1) { this.sonics.splice(i, 1); continue; }
      for (let j = 0; j < 3; j++) { const r = (k + j * 0.15) * TUNE.SONIC.range; if (r > TUNE.SONIC.range) continue; g.lineStyle(2, 0xc8e0ff, (1 - k) * 0.7); g.beginPath(); g.arc(S.x, S.y, r, S.a - TUNE.SONIC.cone, S.a + TUNE.SONIC.cone); g.strokePath(); }
    }
    for (let i = this.gravFx.length - 1; i >= 0; i--) {                  // grav pulse: a violet ring collapsing inward
      const F = this.gravFx[i]; F.t += this.game.loop.delta / 1000; const k = F.t / 0.35; if (k >= 1) { this.gravFx.splice(i, 1); continue; }
      g.lineStyle(3, 0x9a60ff, (1 - k) * 0.8); g.strokeCircle(F.x, F.y, TUNE.GRAV.radius * (1 - k));
      g.lineStyle(1, 0xe0c8ff, 1 - k); g.strokeCircle(F.x, F.y, TUNE.GRAV.radius * (1 - k) * 0.6);
    }
    for (const H of this.horns) {                                        // warhorn blast: gold rings rolling out
      const k = H.t / 0.6;
      for (let j = 0; j < 2; j++) { const r = (k + j * 0.2) * TUNE.WARHORN.radius; if (r > TUNE.WARHORN.radius) continue; g.lineStyle(3 - j, 0xffd040, (1 - k) * 0.6); g.strokeCircle(H.x, H.y, r); }
    }
    if (now < this.markedUntil && this.state !== 'dead') {              // marked by a spotter: a red reticle on you
      const pb = this.player.body, cx = pb.center.x, cy = pb.center.y, r = 12 + Math.sin(now / 90) * 1.5;
      g.lineStyle(1, 0xff3020, 0.85); g.strokeCircle(cx, cy, r);
      for (let k = 0; k < 4; k++) { const an = k * Math.PI / 2 + now / 600; g.lineBetween(cx + Math.cos(an) * (r - 3), cy + Math.sin(an) * (r - 3), cx + Math.cos(an) * (r + 4), cy + Math.sin(an) * (r + 4)); }
    }
    if (this.siphonFx && now - this.siphonFx.t < 90 && this.state !== 'dead') {   // the siphon: a wavering red drain beam
      const S = this.siphonFx, L = Math.hypot(S.x1 - S.x0, S.y1 - S.y0) || 1, nx = -(S.y1 - S.y0) / L, ny = (S.x1 - S.x0) / L, N = Math.max(3, Math.floor(L / 8));
      let qx = S.x0, qy = S.y0;
      for (let k = 1; k <= N; k++) {
        const t = k / N, w = Math.sin(t * Math.PI) * Math.sin(now / 45 + t * 9) * (S.e ? 3 : 1.5), x2 = S.x0 + (S.x1 - S.x0) * t + nx * w, y2 = S.y0 + (S.y1 - S.y0) * t + ny * w;
        g.lineStyle(3, 0x8a1020, 0.5).lineBetween(qx, qy, x2, y2); g.lineStyle(1, S.e ? 0xff6a7a : 0xc84050, 1).lineBetween(qx, qy, x2, y2); qx = x2; qy = y2;
      }
    }
    if (this.time.now < this.shieldUntil && this.state !== 'dead') {     // the riot shield: a plate of hard light in front of you
      const a = this.aim, sx = this.shoulder.x, sy = this.shoulder.y, hit = now - this.shieldBlockT < 90, A0 = TUNE.SHIELD.arc;
      g.lineStyle(hit ? 4 : 3, hit ? 0xffffff : 0x9ad8ff, hit ? 0.9 : 0.55); g.beginPath(); g.arc(sx, sy, 15, a - A0, a + A0, false); g.strokePath();
      g.lineStyle(1, 0xe0f4ff, 0.8); g.beginPath(); g.arc(sx, sy, 17, a - A0, a + A0, false); g.strokePath();
    }
    for (const S of this.seeds) { g.fillStyle(0x8ac040, 1).fillCircle(S.x, S.y, 2); g.fillStyle(0xe0ff80, 1).fillRect(Math.round(S.x), Math.round(S.y) - 1, 1, 1); }
    for (const S of this.pspores) { g.fillStyle(0xc8ff60, 0.85).fillCircle(S.x, S.y, 1.5); }
    if (this.tethered.length > 1) {                                       // the tether: a cord of light through every linked foe
      const flash = now - (this.tetherFlashT || 0) < 90;
      for (let i = 1; i < this.tethered.length; i++) { const a = this.tethered[i - 1], b = this.tethered[i]; if (!a.alive || !b.alive) continue; g.lineStyle(flash ? 2 : 1, flash ? 0xffffff : 0x80ffe0, flash ? 0.9 : 0.5 + 0.2 * Math.sin(now / 90)).lineBetween(a.body.center.x, a.body.center.y, b.body.center.x, b.body.center.y); }
    }
    for (const o of this.tethered) if (o.alive) { g.lineStyle(1, 0x80ffe0, 0.7); g.strokeCircle(o.body.center.x, o.body.center.y, 4); }
    for (const N of this.nukes) { g.fillStyle(0xd8e040, 1).fillCircle(N.x, N.y, 3); g.fillStyle(0xffffff, 1).fillRect(Math.round(N.x) - 1, Math.round(N.y) - 1, 1, 1); }
    for (const G of this.globs) { g.fillStyle(0xffd040, 0.95).fillCircle(G.x, G.y, 2); g.fillStyle(0xfff0a0, 1).fillRect(Math.round(G.x) - 1, Math.round(G.y) - 1, 1, 1); }
    for (const B of this.bubbles) { const r = 4 + Math.sin(B.w) * 0.6; g.lineStyle(1, 0xd8f8ff, 0.8).strokeCircle(B.x, B.y, r); g.fillStyle(0xffffff, 0.9).fillRect(Math.round(B.x) - 2, Math.round(B.y) - 2, 1, 1); }
    for (const O of this.horbs) { const r = 3 + O.big; g.fillStyle(0xffe080, 0.35).fillCircle(O.x, O.y, r + 2); g.fillStyle(0xfff4c0, 1).fillCircle(O.x, O.y, r * 0.6); }
    for (const S of this.souls) { g.fillStyle(0xfff0b0, 0.9).fillCircle(S.x, S.y, 2); g.fillStyle(0xffe080, 0.3).fillCircle(S.x, S.y, 4); }
    for (const M of this.emines) {                                        // enemy mines: green while arming, red and live, frantic when tripped
      const live = M.st === 'live' || M.st === 'trig', blink = M.st === 'trig' ? Math.floor(now / 60) % 2 : M.st === 'live' ? Math.floor(now / 400) % 2 : 1;
      g.fillStyle(0x3a3f47, 1).fillRect(Math.round(M.x) - 3, Math.round(M.y) - 2, 6, 3); if (blink) g.fillStyle(live ? 0xff3020 : 0x5cff7a, 1).fillRect(Math.round(M.x) - 1, Math.round(M.y) - 3, 2, 1);
    }
    for (const W of this.trips) {                                         // tripwires: the emitter, and a live beam once it's set
      g.fillStyle(0xff3020, 1).fillRect(Math.round(W.x) - 2, Math.round(W.y) - 2, 4, 4); g.fillStyle(0xffffff, 0.9).fillRect(Math.round(W.x) - 1, Math.round(W.y) - 1, 2, 2);
      if (W.st === 'set') { g.lineStyle(3, 0xff3020, 0.18).lineBetween(W.x, W.y, W.x1, W.y1); g.lineStyle(1, 0xff6050, 0.55 + 0.35 * Math.random()).lineBetween(W.x, W.y, W.x1, W.y1); }
    }
    for (const A of this.allies) {                                        // ally drones
      if (A.x === undefined) continue;
      g.fillStyle(0x8a94a0, 1).fillRect(Math.round(A.x) - 3, Math.round(A.y) - 2, 6, 4); g.fillStyle(0x46e6ff, 1).fillRect(Math.round(A.x) + (A.face > 0 ? 1 : -2), Math.round(A.y) - 1, 1, 1);
      g.lineStyle(1, 0xc8d0da, 0.4 + 0.4 * Math.random()).lineBetween(A.x - 5, A.y - 4, A.x + 5, A.y - 4);
      if (A.t < 2 && Math.floor(now / 100) % 2) g.lineStyle(1, 0xff5040, 0.6).strokeCircle(A.x, A.y, 5);
    }
    for (const W of this.bwalls) {                                        // hard-light walls
      const a = Math.min(1, W.t / 0.3), h = W.y1 - W.y0;
      g.fillStyle(0x46e6ff, 0.12 * a).fillRect(W.x - 3, W.y0, 6, h); g.lineStyle(1, 0xd0f8ff, 0.8 * a).lineBetween(W.x - 3, W.y0, W.x - 3, W.y1); g.lineStyle(1, 0xd0f8ff, 0.8 * a).lineBetween(W.x + 3, W.y0, W.x + 3, W.y1);
      for (let y = W.y0 + ((now / 30) % 6); y < W.y1; y += 6) g.lineStyle(1, 0x9af4ff, 0.35 * a).lineBetween(W.x - 3, y, W.x + 3, y);
      if (now - W.hitT < 80) g.fillStyle(0xffffff, 0.4).fillRect(W.x - 3, W.y0, 6, h);
    }
    for (const F of this.stasisFields) {                                 // stasis: a pale dome with a clock face ticking round
      const k = Math.min(1, (TUNE.STASIS.time - F.t) / 0.15), r = TUNE.STASIS.radius * k, fade = Math.min(1, F.t / 0.3);
      g.fillStyle(0x9ab8ff, 0.06 * fade).fillCircle(F.x, F.y, r); g.lineStyle(2, 0xc8e8ff, 0.6 * fade).strokeCircle(F.x, F.y, r);
      for (let j = 0; j < 12; j++) { const an = j / 12 * Math.PI * 2; g.lineStyle(1, 0xc8e8ff, 0.5 * fade).lineBetween(F.x + Math.cos(an) * (r - 5), F.y + Math.sin(an) * (r - 5), F.x + Math.cos(an) * r, F.y + Math.sin(an) * r); }
      const hand = -Math.PI / 2 + (1 - F.t / TUNE.STASIS.time) * Math.PI * 2; g.lineStyle(2, 0xffffff, 0.7 * fade).lineBetween(F.x, F.y, F.x + Math.cos(hand) * r * 0.7, F.y + Math.sin(hand) * r * 0.7);
    }
    if (this.mwFx && now - this.mwFx.t < 100 && this.state !== 'dead') {  // the microwave: rings rolling down the beam
      const M = this.mwFx, L = Math.hypot(M.x1 - M.x0, M.y1 - M.y0) || 1, ang = Math.atan2(M.y1 - M.y0, M.x1 - M.x0);
      g.lineStyle(1, 0xffa040, 0.25).lineBetween(M.x0, M.y0, M.x1, M.y1);
      for (let k = 0; k < 4; k++) { const t = (now / 160 + k / 4) % 1, x = M.x0 + (M.x1 - M.x0) * t, y = M.y0 + (M.y1 - M.y0) * t, r = 3 + 5 * t; g.lineStyle(1, 0xffb050, 0.8 * (1 - t * 0.6)); g.beginPath(); g.arc(x, y, r, ang - 1.1, ang + 1.1, false); g.strokePath(); }
    }
    for (let i = this.pylonZaps.length - 1; i >= 0; i--) { const Z = this.pylonZaps[i]; if (now - Z.t > 160) { this.pylonZaps.splice(i, 1); continue; } this.zap(g, Z.x0, Z.y0, Z.x1, Z.y1); this.zap(g, Z.x0, Z.y0, Z.x1, Z.y1); }
    for (const S of this.splits) {                                       // splitter bolts: a bright streak, bluer every split
      const c = [0xffffff, 0x9af4ff, 0x46e6ff, 0x8a7aff][S.gen];
      g.lineStyle(3, c, 0.35).lineBetween(S.px, S.py, S.x, S.y); g.lineStyle(1, 0xffffff, 1).lineBetween(S.x - S.vx * 0.012, S.y - S.vy * 0.012, S.x, S.y);
    }
    for (const D of this.discs) {                                        // spinning discs, edge-on
      const w = 9, h = 2 + Math.abs(Math.sin(D.spin)) * 5;
      g.fillStyle(D.mine ? 0xffe46a : 0xc8d0da, 0.9).fillEllipse(D.x, D.y, w, h); g.fillStyle(0xffffff, 1).fillRect(Math.round(D.x) - 1, Math.round(D.y) - 1, 2, 1);
    }
    for (const S of this.spores) { g.fillStyle(0xb8e040, 0.85).fillCircle(S.x, S.y, 2); g.fillStyle(0xf0ffc0, 1).fillRect(Math.round(S.x), Math.round(S.y) - 1, 1, 1); }
    for (const F of this.fireworks) { const fx2 = Math.round(F.x), fy2 = Math.round(F.y); g.fillStyle(F.col[0], 1).fillRect(fx2 - 1, fy2 - 1, 3, 3); g.fillStyle(0xffffff, 1).fillRect(fx2, fy2, 1, 1); }
    for (const S of this.stars) { const tw = Math.random() < 0.3; g.fillStyle(tw ? 0xffffff : S.col, Math.min(1, S.t * 3)).fillRect(Math.round(S.x) - 1, Math.round(S.y) - 1, 2, 2); }
    for (let i = this.slashFx.length - 1; i >= 0; i--) {                 // katana slashes: a crescent that sweeps, then fades
      const S = this.slashFx[i]; S.t += this.game.loop.delta / 1000; const k = S.t / 0.16; if (k >= 1) { this.slashFx.splice(i, 1); continue; }
      const half = TUNE.KATANA.arc / 2, sw = Math.min(1, k / 0.3), a0 = S.a - S.dir * half, a1 = a0 + S.dir * half * 2 * sw, fade = 1 - Math.max(0, (k - 0.3) / 0.7), lo = Math.min(a0, a1), hi = Math.max(a0, a1);
      g.lineStyle(S.dash ? 8 : 5, S.dash ? 0xffffff : 0x46e6ff, 0.35 * fade); g.beginPath(); g.arc(S.x, S.y, S.r - 6, lo, hi, false); g.strokePath();
      g.lineStyle(2, 0xe8fcff, fade); g.beginPath(); g.arc(S.x, S.y, S.r - 3, lo, hi, false); g.strokePath();
      g.lineStyle(1, 0x46e6ff, 0.6 * fade); g.beginPath(); g.arc(S.x, S.y, S.r - 10, lo, hi, false); g.strokePath();
    }
    for (const B of this.bees) { g.fillStyle(0xffe040, 1).fillRect(Math.round(B.x), Math.round(B.y), 2, 1); g.fillStyle(0xffffff, 0.8).fillRect(Math.round(B.x), Math.round(B.y) - 1, 1, 1); }
    if (this.whipFx) {                                                   // the whip's crack: a bright arc that fades fast
      const W = this.whipFx, a = 1 - W.t / 0.14;
      if (a <= 0) this.whipFx = null;
      else { W.t += this.game.loop.delta / 1000; let px = W.pts[0][0], py = W.pts[0][1]; for (const [qx, qy] of W.pts) { g.lineStyle(3, 0xff40c0, 0.4 * a).lineBetween(px, py, qx, qy); g.lineStyle(1, 0xffe0f8, a).lineBetween(px, py, qx, qy); px = qx; py = qy; } }
    }
    for (const n of this.needles) { g.lineStyle(2, 0xff60d0, 0.55).lineBetween(n.px, n.py, n.x, n.y); g.lineStyle(1, 0xffe0f8, 1).lineBetween(n.x - n.vx * 0.012, n.y - n.vy * 0.012, n.x, n.y); }
    if (now < this.arcUntil && this.state !== 'dead') {                  // arc caster bolts (re-jittered every frame)
      const G = GUNS.arc, ca = Math.cos(this.aim), sa = Math.sin(this.aim);
      const segs = this.arcSegs.slice(); segs[0] = [this.gun.x + ca * G.muzzle, this.gun.y + sa * G.muzzle, segs[0][2], segs[0][3]];
      for (const s of segs) this.zap(g, s[0], s[1], s[2], s[3]);
    }
    for (const bm of this.beams) {                                       // rail slug trails
      const a = 1 - bm.t / bm.dur;
      if (bm.col === 'lance') {                                          // magma lance: thick molten beam, narrows as it fades
        const w = bm.w * (0.55 + 0.45 * a);
        g.lineStyle(w * 2 + 4, 0xa02008, 0.35 * a).lineBetween(bm.x0, bm.y0, bm.x1, bm.y1);
        g.lineStyle(w * 2, 0xff6a10, 0.75 * a).lineBetween(bm.x0, bm.y0, bm.x1, bm.y1);
        g.lineStyle(Math.max(1, w), 0xffe080, a).lineBetween(bm.x0, bm.y0, bm.x1, bm.y1);
        g.lineStyle(1, 0xffffff, a).lineBetween(bm.x0, bm.y0, bm.x1, bm.y1);
        continue;
      }
      if (bm.col === 'rev') {                                            // revolver tracer: a hot thin streak
        g.lineStyle(3, 0xffa030, 0.3 * a).lineBetween(bm.x0, bm.y0, bm.x1, bm.y1);
        g.lineStyle(1, 0xfff4c0, a).lineBetween(bm.x0, bm.y0, bm.x1, bm.y1);
        continue;
      }
      const pr = bm.col === 'prism';
      g.lineStyle(4, pr ? 0xd02090 : 0x2a8ad0, 0.35 * a).lineBetween(bm.x0, bm.y0, bm.x1, bm.y1);
      g.lineStyle(2, pr ? 0xff60e0 : 0x6ad0ff, 0.6 * a).lineBetween(bm.x0, bm.y0, bm.x1, bm.y1);
      g.lineStyle(1, 0xffffff, a).lineBetween(bm.x0, bm.y0, bm.x1, bm.y1);
    }
    for (const e of this.enemies.getChildren()) {
      if (!e.alive) continue;
      const lit = this.darkA > 0.1 && e.flareLit > now;                   // a flare lights foes up through the blackout
      if (lit !== !!e.litShown) { e.litShown = lit; e.setDepth(lit ? 16.2 : 5); }
      if (e.elite) {                                                     // elite: an aura, a diamond over its head, a shield bubble
        const bx = e.body.center.x, by = e.body.center.y, ty = e.body.top - 9 + Math.sin(now / 200) * 1.5, hid = e.under || !e.visible || e.alpha < 0.3;
        e.eliteGlow.setVisible(!hid);
        if (!hid) {                                                      // a cloaked or blinked-out elite stays hidden
        e.eliteGlow.setPosition(bx, by).setScale(Math.max(e.body.width, e.body.height) / 20 * 0.8 * (0.9 + 0.1 * Math.sin(now / 150)));
        g.fillStyle(ELITE_COL[e.elite], 0.95); g.fillTriangle(bx - 3, ty, bx, ty - 4, bx + 3, ty); g.fillTriangle(bx - 3, ty, bx, ty + 3, bx + 3, ty);
        g.fillStyle(0xffffff, 0.8).fillRect(bx - 1, ty - 2, 1, 1);
        if (e.esh > 0) { g.lineStyle(1, 0x46e6ff, now - e.lastHitT < 80 ? 1 : 0.4 + 0.2 * Math.sin(now / 120)); g.strokeCircle(bx, by, Math.max(e.body.halfWidth, e.body.halfHeight) + 5); }
        if (e.elite === 'volatile' && e.hp < e.def.hp * 0.35 && Math.floor(now / 120) % 2) { g.lineStyle(1, 0xff6a20, 0.8); g.strokeCircle(bx, by, Math.max(e.body.halfWidth, e.body.halfHeight) + 3); }
        }
      }
      if (e.needleAngs && e.needleAngs.length) {                         // needles stuck in it, pulsing harder as it nears supercombine
        const cx = e.body.center.x, cy = e.body.center.y, r = Math.min(e.body.halfWidth, e.body.halfHeight) * 0.7, k = e.needles / TUNE.NEEDLE.stick, fl = 0.55 + 0.45 * Math.sin(now / (60 - 35 * k));
        for (const an of e.needleAngs) { const x0 = cx + Math.cos(an) * r, y0 = cy + Math.sin(an) * r; g.lineStyle(2, 0xff60d0, 0.5 * fl).lineBetween(x0, y0, x0 + Math.cos(an) * 5, y0 + Math.sin(an) * 5); g.lineStyle(1, 0xffe0f8, fl).lineBetween(x0, y0, x0 + Math.cos(an) * 4, y0 + Math.sin(an) * 4); }
      }
      if (e.rallyT > now) {                                              // rallied: a gold chevron bobbing over its head
        const tx = e.body.center.x, ty = e.body.top - 5 + Math.sin(now / 150);
        g.fillStyle(0xffd040, Math.floor(now / 90) % 4 ? 0.95 : 0.5); g.fillTriangle(tx - 3, ty - 3, tx + 3, ty - 3, tx, ty); g.fillRect(tx - 3, ty - 5, 6, 1);
      }
      const vis = e.def.visuals, marks = e.def.marks;                // its own drawing, after whichever shared marks it takes
      if (marks === 'none') { if (vis) this[vis](e, g, now); continue; }
      if (e.netT > 0) {                                                  // a net over it: a lattice of cord
        const b = e.body, l = b.left - 1, r2 = b.right + 1, t = b.top - 1, bt = b.bottom + 1;
        this.laserG.lineStyle(1, 0xc8c0a8, 0.85);
        for (let x = l; x <= r2; x += 4) this.laserG.lineBetween(x, t, x + 3, bt);
        for (let x = l + 3; x <= r2 + 3; x += 4) this.laserG.lineBetween(x, t, x - 3, bt);
      }
      if (marks === 'net') { if (vis) this[vis](e, g, now); continue; }
      if (e.cook > 0 || e.cookOn) {                                      // being microwaved: it swells and glows, then pops
        e.cookOn = e.cook > 0;
        e.setScale((e.shrunkOn ? 0.5 : 1) * (1 + 0.25 * e.cook) * (e.growS || 1));
        if (Math.random() < e.cook * 0.6) this.fx.emit(e.body.center.x + rand(-e.body.halfWidth, e.body.halfWidth), e.body.center.y + rand(-e.body.halfHeight, e.body.halfHeight), { n: 1, angle: -Math.PI / 2, spread: 0.5, speed: [10, 40], life: [0.2, 0.4], size: [2, 1], cols: [0xffa040, 0xff5a1a], add: true });
        if (e.cook <= 0) e.setScale((e.shrunkOn ? 0.5 : 1) * (e.growS || 1));
      }
      if (e.bubbleUntil > now && e.gravT > 0) {                          // bubbled: a wobbling soap bubble round it
        const bx = e.body.center.x, by = e.body.center.y, r = Math.max(e.body.halfWidth, e.body.halfHeight) + 6 + Math.sin(now / 90) * 0.8;
        g.fillStyle(0xc8f0ff, 0.08).fillCircle(bx, by, r); g.lineStyle(1, 0xd8f8ff, 0.75).strokeCircle(bx, by, r); g.fillStyle(0xffffff, 0.85).fillRect(bx - r * 0.5, by - r * 0.6, 2, 1);
      }
      if (e.stasisT > 0) { g.lineStyle(1, 0xc8e8ff, 0.8); g.strokeRect(e.body.left - 2, e.body.top - 2, e.body.width + 4, e.body.height + 4); }
      if (vis) this[vis](e, g, now);
    }
    for (const r of this.rocketList) if (r.active) r.glow.setPosition(r.x, r.y);
    if (this.locks.length || this.hornetHeld) {                           // hornet locks: corner brackets that snap in, one pip per missile
      const seen = new Map(); for (const e of this.locks) seen.set(e, (seen.get(e) || 0) + 1);
      for (const [e, n] of seen) {
        if (!e.alive) continue;
        const b = e.body, age = (now - (e.lockT || 0)) / 150, s = Math.round(Math.max(b.halfWidth, b.halfHeight) + 4 + Math.max(0, 1 - age) * 8), cx = Math.round(b.center.x), cy = Math.round(b.center.y);
        this.laserG.fillStyle(0xff5a2a, 0.95);
        for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const x = cx + sx * s, y = cy + sy * s; this.laserG.fillRect(sx > 0 ? x - 2 : x, y, 3, 1).fillRect(x, sy > 0 ? y - 2 : y, 1, 3); }
        this.laserG.fillStyle(0xffe14a, 1);
        for (let i = 0; i < n; i++) this.laserG.fillRect(cx - Math.round(n * 1.5) + i * 3, cy - s - 4, 2, 2);
      }
      if (this.hornetHeld && this.state !== 'dead') { const A = this.hornetAim(); this.laserG.lineStyle(1, 0xff5a2a, 0.2).strokeCircle(A.x, A.y, A.r); }
    }
    const hk = this.hook;                                                 // grapple chain
    if (hk && this.state !== 'dead') {
      const G = GUNS[WEAPONS[this.weapon].gun], ca = Math.cos(this.aim), sa = Math.sin(this.aim), gx = this.gun.x + ca * G.muzzle * 0.6, gy = this.gun.y + sa * G.muzzle * 0.6;
      const len = Math.hypot(hk.x - gx, hk.y - gy) || 1, n = Math.max(1, Math.floor(len / 4));
      this.laserG.lineStyle(1, 0x5a636e, 0.9).lineBetween(gx, gy, hk.x, hk.y);
      for (let i = 1; i < n; i++) this.laserG.fillStyle(i % 2 ? 0xc8d0d8 : 0x8a94a0, 1).fillRect(Math.round(gx + (hk.x - gx) * i / n) - 1, Math.round(gy + (hk.y - gy) * i / n) - 1, 2, 2);
      this.hookImg.setVisible(true).setPosition(hk.x, hk.y).setRotation(Math.atan2(hk.y - gy, hk.x - gx));
    } else this.hookImg.setVisible(false);
    const dT = this.modOn('dark') && this.state !== 'dead' ? 1 : 0;       // blackout: vision shrinks to a pool round you; gunfire strobes it wider
    this.darkA += (dT - this.darkA) * Math.min(1, Math.min(this.game.loop.delta || 16.7, 50) / 1000 * 1.5);
    if (this.darkA > 0.01) this.darkImg.setVisible(true).setAlpha(this.darkA * (0.92 + Math.random() * 0.08)).setScale(now < this.mflashUntil ? 1.3 : 1).setPosition(this.pv.x, this.pv.y - 12);
    else this.darkImg.setVisible(false);
    for (const q of this.eprojList) if (q.active && q.pk !== 'nade') q.glow.setPosition(q.x, q.y).setAlpha(q.pk === 'bomb' ? (Math.floor(now / 70) % 2 ? 0.9 : 0.3) : 0.75); else if (q.active) q.glow.setPosition(q.x, q.y);
    for (const g of this.grenadeList) if (g.active) g.glow.setPosition(g.x, g.y).setAlpha(g.blinkOn ? 0.95 : 0.15).setScale(g.blinkOn ? 0.6 : 0.4);
    this.applyCamera(Math.min(this.game.loop.delta, 50) / 1000);
  },
});
