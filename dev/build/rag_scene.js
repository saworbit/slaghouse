  // ---------------------------------------------------------------- ragdolls ----
  // Walkers killed without much overkill drop as ragdolls: position-based dynamics (points + distance sticks)
  // against the tile grid. Corpses keep soaking hits, blasts, kicks and fire until they burst into gibs.
  spawnRagdoll(e, dx, dy, src, headless) {
    const D = RAG[e.kind], k = e.kind, b = e.body, dir = e.dir < 0 ? -1 : 1, up = D.up;
    const tx = n => this.textures.get(`rg_${k}_${n}`).getSourceImage();
    const T = tx('torso'), H = tx('head'), TH = tx('thigh'), SH = tx('shin'), hasArm = this.textures.exists(`rg_${k}_arm`), AR = hasArm ? tx('arm') : null;
    const torsoLen = up ? T.height - 3 : T.width - 4, thigh = TH.height - 2.5, shin = SH.height - 3;
    const headOff = up ? H.height / 2 - 0.5 : H.width / 2 - 0.5, arm = AR ? AR.height - 3.5 : 0;
    const tR = up ? T.width / 2 - 1.5 : T.height / 2 - 1.5, hR = Math.max(1.5, Math.min(H.width, H.height) / 2 - 1.5);
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
    const imp = { nail: 150, pellet: 240, rail: 420, saw: 210, kick: 420, parry: 340, arc: 60, flame: 40, burn: 20 }[src] ?? 130;
    const vx0 = b.velocity.x * 0.5, vy0 = Math.min(0, b.velocity.y) * 0.5;
    P.forEach((p, i) => {                                               // top-heavy shove: it topples away from the hit
      const s = i <= 1 || i >= 7 ? 1.25 : i === 2 ? 0.85 : 0.45;
      p.vx = vx0 + dx * imp * s + rand(-25, 25); p.vy = vy0 + dy * imp * s * 0.6 - (i <= 1 ? 70 : 25) + rand(-15, 15);
    });
    const rd = { kind: k, dir, up, pts: P, sticks, mins, segs, parts, headless, hp: D.hp, asleep: false, stillT: 0, fade: 0,
      flashT: 0, burnT: Math.max(0, e.burnT), char: e.burnT > 0 ? 0.35 : 0, bleed: 2.5, bleedT: 0, sndT: 0, twitchT: rand(0.8, 1.8), twNext: 0.25,
      pooled: false, minX: cx, maxX: cx, minY: b.top, maxY: b.bottom, gone: false };
    this.ragdolls.push(rd);
    if (this.ragdolls.filter(r => !r.fade).length > 10) { const old = this.ragdolls.find(r => !r.fade); old.fade = 0.9; }
    this.tintRag(rd); this.placeRag(rd);
    if (k === 'bulwark') this.spawnGib('g_shield', cx + dir * 6, b.center.y, dir * rand(60, 140) + dx * 80, -rand(120, 220), 'metal');
    return rd;
  }
  tintRag(rd) {
    const c = rd.char, lerp = (a, b2) => Math.round(a + (b2 - a) * c);
    for (const q of rd.parts) {
      const f = q.back ? 0.66 : 1, r = lerp(255, 96) * f, g = lerp(255, 70) * f, bl = lerp(255, 58) * f;
      q.img.setTexture(q.tex).setTint((Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl));
    }
  }
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
  }
  removeRag(rd) {
    rd.gone = true; rd.parts.forEach(q => q.img.destroy());
    const i = this.ragdolls.indexOf(rd); if (i >= 0) this.ragdolls.splice(i, 1);
  }
  ragStick(a, b, L, minOnly) {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.001;
    if (minOnly && d >= L) return;
    const k = (d - L) / d * (minOnly ? 0.25 : 0.5);
    a.x += dx * k; a.y += dy * k; b.x -= dx * k; b.y -= dy * k;
  }
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
  }
  stepRag(rd, dt) {
    const G = TUNE.GRAVITY * 1.15, P = rd.pts, n = Math.max(1, Math.ceil(dt * 120)), h = dt / n;
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
      }
      for (const p of P) {
        p.vx = clamp((p.x - p.ox) / h, -900, 900); p.vy = clamp((p.y - p.oy) / h, -900, 900);
        if (p.gr) {
          p.vx *= Math.max(0, 1 - 11 * h);
          if (!p.wasGr && p.pvy > 170) { if (p.pvy > impV) { impV = p.pvy; impact = p; } if (p.pvy > 320) p.vy = -p.pvy * 0.16; }
        }
        if (p.wall && Math.abs(p.pvx) > 210) { wallHit = p; p.vx = -p.pvx * 0.2; }
      }
    }
    for (const p of P) fast = Math.max(fast, Math.abs(p.vx) + Math.abs(p.vy));
    return { fast, impact, impV, wallHit };
  }
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
  }
  segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy, t = L2 ? clamp(((px - ax) * dx + (py - ay) * dy) / L2, 0, 1) : 0;
    return [Math.hypot(px - ax - dx * t, py - ay - dy * t), t];
  }
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
  }
  ragSweep(x0, y0, x1, y1, pad = 0) {                                  // first corpse crossed by a moving shot
    if (!this.ragdolls.length) return null;
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 2));
    for (let i = 1; i <= n; i++) { const h = this.ragAt(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, pad); if (h) return h; }
    return null;
  }
  hitRagdoll(rd, x, y, dmg, ix, iy, src, pi) {
    if (rd.gone) return;
    const P = rd.pts;
    if (pi === undefined) { let bd = 1e9; P.forEach((p, i) => { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; pi = i; } }); }
    const imp = { nail: 170, pellet: 150, rail: 380, saw: 150, arc: 0, flame: 6, parry: 320, kick: 0, blast: 0 }[src] ?? 120;
    const p = P[pi];
    p.vx += ix * imp; p.vy += iy * imp - imp * 0.3;
    for (const q of P) { q.vx += ix * imp * 0.12; q.vy -= imp * 0.04; }
    if (src === 'arc') for (let i = 0; i < 3; i++) { const q = pick(P); q.vx += rand(-90, 90); q.vy -= rand(20, 110); }   // electrocuted dance
    rd.asleep = false; rd.stillT = 0;
    rd.hp -= dmg * (src === 'flame' ? 0.35 : 1);
    if (src !== 'flame' && src !== 'blast') {
      this.fxBlood(x, y, src === 'arc' ? 1 : 4, Math.atan2(iy, ix), 0.9, [50, 190]);
      if (src !== 'arc') this.fxBlood(x, y, 2, Math.atan2(iy, ix) + Math.PI, 1.2, [30, 90]);
      if (rd.sndT <= 0 && src !== 'arc') { rd.sndT = 0.06; Sfx.squish(); }
      if (rd.flashT <= 0 && src !== 'arc') { rd.flashT = 0.05; rd.parts.forEach(q => q.img.setTexture(q.tex + '_w').setTint(0xffffff)); }
    }
    if (rd.hp <= 0) this.gibRagdoll(rd, ix, iy, src);
  }
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
  }
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
  }
