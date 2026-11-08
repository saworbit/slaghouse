  // ---------------------------------------------------------------- prism laser ----
  // Instant beam that ricochets off walls (4 bounces), piercing everything; each enemy can be hit twice.
  firePrism(now, ox, oy, a, mx, my) {
    const W = TUNE.PRISM; this.stats.shots++;
    let x = this.shoulder.x, y = this.shoulder.y, dx = Math.cos(a), dy = Math.sin(a), left = W.range, bounces = W.bounces, sx = ox, sy = oy, step = 0, hitAny = false;
    const segs = [], hitStep = new Map(), hitCount = new Map(), rhit = new Set(), kh = new Set();
    while (left > 0) {
      const nx = x + dx * 2, ny = y + dy * 2; left -= 2; step++;
      if (this.solidAt(nx, ny)) {
        segs.push([sx, sy, x, y]);
        const tx = Math.floor(nx / TS), ty = Math.floor(ny / TS); if (TILE_HP[this.tileAt(tx, ty)]) this.damageTile(tx, ty, 18);
        if (bounces-- <= 0) break;
        const hx = this.solidAt(x + Math.sign(dx) * 2, y), hy = this.solidAt(x, y + Math.sign(dy) * 2), corner = !hx && !hy;
        if (hx || corner) dx = -dx; if (hy || corner) dy = -dy;
        this.fxSparks(x, y, 6, Math.atan2(dy, dx), 1.2, [80, 240]); this.spawnLight(x, y, 'glow', 0xff60e0, 0.8, 1.6, 0.9, 0.12);
        this.paintScorch(x, y, 3); Sfx.prismBounce();
        sx = x; sy = y; continue;
      }
      x = nx; y = ny;
      const e = this.enemyAt(x, y, 1);
      if (e) {
        const last = hitStep.get(e), cnt = hitCount.get(e) || 0;
        if ((last === undefined || step - last > 14) && cnt < 2) {
          hitStep.set(e, step); hitCount.set(e, cnt + 1); hitAny = true;
          const hs = isHumanoid(e) && y < e.body.top + 5;
          this.fxBlood(x, y, 6, Math.atan2(dy, dx), 0.6, [100, 260]);
          this.damageEnemy(e, W.damage * (hs ? TUNE.HEADSHOT : 1), dx, dy, 'prism', hs);
        }
      }
      if (step % 3 === 0) {
        const rh = this.ragdolls.length ? this.ragAt(x, y, 1) : null;
        if (rh && !rhit.has(rh.rd)) { rhit.add(rh.rd); this.hitRagdoll(rh.rd, x, y, W.damage, dx, dy, 'rail', rh.pi); }
        this.propHitAt(x, y, dx, dy);
        for (const k of this.barrelList) if (k.active && !kh.has(k) && Math.abs(k.x - x) < 6 && Math.abs(k.y - y) < 8) { kh.add(k); this.damageBarrel(k, W.damage); }
      }
    }
    if (left <= 0) segs.push([sx, sy, x, y]);
    for (const s of segs) this.beams.push({ x0: s[0], y0: s[1], x1: s[2], y1: s[3], t: 0, dur: 0.3, col: 'prism' });
    if (hitAny) this.stats.hits++;
    this.recoil = 4; Sfx.prism(); this.spawnLight(mx, my, 'glow', 0xff60e0, 1.2, 2.2, 1, 0.15);
    this.shake(80, 0.004); this.addKick(-Math.cos(a) * 4, -Math.sin(a) * 4);
  }

  // --------------------------------------------------------------- grapple hook ----
  // C: chain hook. Light enemies (and corpses, and gas cans) get reeled in to point-blank; walls and anything
  // too big to move reel YOU in instead. Press C again to let go mid-haul.
  fireHook(now) {
    if (this.hook || now < this.hookReady || this.state === 'dead') return;
    const H = TUNE.HOOK, a = this.aim;
    this.hook = { x: this.shoulder.x, y: this.shoulder.y, vx: Math.cos(a) * H.speed, vy: Math.sin(a) * H.speed, state: 'fly', t: 0 };
    Sfx.hookFire(); this.recoil = 2;
  }
  endHook() { this.hook = null; this.hookReady = this.time.now + TUNE.HOOK.cooldown; }
  updateHook(dt) {
    const k = this.hook, H = TUNE.HOOK; if (!k) return;
    const pb = this.player.body, sx = this.shoulder.x, sy = this.shoulder.y;
    k.t += dt;
    if (k.state === 'fly') {
      const n = Math.max(1, Math.ceil(Math.hypot(k.vx, k.vy) * dt / 3));
      for (let i = 0; i < n && k.state === 'fly'; i++) {
        const nx = k.x + k.vx * dt / n, ny = k.y + k.vy * dt / n;
        if (this.solidAt(nx, ny)) { k.state = 'zip'; k.t = 0; Sfx.clang(0.6); this.fxSparks(k.x, k.y, 6); break; }
        k.x = nx; k.y = ny;
        const e = this.enemyAt(k.x, k.y, 2);
        if (e) {
          Sfx.hookHit(); this.fxBlood(k.x, k.y, 6);
          if (e.def.kb < 0.45 || ['boss', 'jugg', 'gunship', 'brood'].includes(e.kind)) { k.state = 'zip'; k.t = 0; k.follow = e; }   // too big: you go to it
          else {
            k.state = 'yank'; k.t = 0; k.target = e;
            this.damageEnemy(e, 8, Math.sign(sx - e.x) || 1, -0.5, 'kick');
            if (e.alive) { e.stunT = Math.max(e.stunT, 0.7); BUS.emit('callout', 'YANK!'); this.addStyle(30); }
          }
          break;
        }
        const rh = this.ragdolls.length ? this.ragAt(k.x, k.y, 2) : null;
        if (rh) { k.state = 'yankRag'; k.rd = rh.rd; k.pi = rh.pi; k.t = 0; rh.rd.pin = null; Sfx.hookHit(); break; }
        for (const c of this.canisterList) if (c.active && Math.abs(c.x - k.x) < 6 && Math.abs(c.y - k.y) < 9) { k.state = 'yankProp'; k.prop = c; k.t = 0; Sfx.hookHit(); break; }
      }
      if (k.state === 'fly' && Math.hypot(k.x - sx, k.y - sy) > H.range) k.state = 'back';
    }
    if (k.state === 'zip') {
      if (k.follow) { if (!k.follow.alive) { this.endHook(); return; } k.x = k.follow.body.center.x; k.y = k.follow.body.center.y; }
      const dx = k.x - pb.center.x, dy = k.y - pb.center.y, d = Math.hypot(dx, dy) || 1;
      if (d < 14 || k.t > H.zipT) { if (d < 20) pb.velocity.y = Math.min(pb.velocity.y, -220); this.endHook(); return; }   // pop up onto the ledge
      pb.velocity.x = dx / d * H.pull; pb.velocity.y = dy / d * H.pull; this.jumpCuttable = false; this.lastGround = -1e9;
      if (Math.random() < 0.5) this.fx.emit(pb.center.x, pb.center.y, { n: 1, speed: [0, 10], life: [0.1, 0.2], size: [2, 1], cols: [0xffffff, 0x9adcff], add: true });
    } else if (k.state === 'yank') {
      const e = k.target; if (!e.alive) { this.endHook(); return; }
      const dx = sx - e.body.center.x, dy = sy - e.body.center.y, d = Math.hypot(dx, dy) || 1;
      k.x = e.body.center.x; k.y = e.body.center.y;
      if (d < 22 || k.t > 0.6) { e.body.velocity.x *= 0.2; e.body.velocity.y = -60; this.endHook(); return; }
      e.body.velocity.x = dx / d * H.yank; e.body.velocity.y = dy / d * H.yank - 40; e.stunT = Math.max(e.stunT, 0.5); e.kickedT = 0.3;
    } else if (k.state === 'yankRag') {
      const rd = k.rd; if (rd.gone) { this.endHook(); return; }
      const q = rd.pts[k.pi], dx = sx - q.x, dy = sy - q.y, d = Math.hypot(dx, dy) || 1;
      k.x = q.x; k.y = q.y;
      if (d < 18 || k.t > 0.6) { this.endHook(); return; }
      q.vx = dx / d * H.yank; q.vy = dy / d * H.yank - 40; rd.asleep = false; rd.stillT = 0;
    } else if (k.state === 'yankProp') {
      const c = k.prop; if (!c.active) { this.endHook(); return; }
      const dx = sx - c.x, dy = sy - c.y, d = Math.hypot(dx, dy) || 1; k.x = c.x; k.y = c.y;
      if (d < 18 || k.t > 0.6) { this.endHook(); return; }
      c.body.velocity.x = dx / d * 380; c.body.velocity.y = dy / d * 380 - 60;
    } else if (k.state === 'back') {
      const dx = sx - k.x, dy = sy - k.y, d = Math.hypot(dx, dy) || 1;
      if (d < 12) { this.endHook(); return; }
      k.x += dx / d * H.speed * 1.4 * dt; k.y += dy / d * H.speed * 1.4 * dt;
    }
  }

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
  }

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
        if (now >= e.aiUntil) { this.throwFirebomb(e); e.ai = 'throw'; e.aiUntil = now + 250; e.fireCd = T.fireCd * rand(0.85, 1.15); }
        return 'hold';
      case 'throw': if (now >= e.aiUntil) { e.ai = 'engage'; e.repickT = Math.random() < 0.5 ? 0 : 1; } return 'hold';
      default: {
        if (!c.alive || now - e.lkT > 6000) { e.ai = 'idle'; e.aggro = false; return 'hold'; }
        if (c.onGround && !e.navAir && e.repickT <= 0) { e.repickT = rand(2.5, 4); if (!this.pickPosition(e, 'attack')) this.pathTo(e, navBelow(e.lkx, e.lky - 4), 140); }
        if (c.canSee && c.onGround && !e.navAir && e.fireCd <= 0 && c.dist > 50 && c.dist < 260) { e.ai = 'windup'; e.aiUntil = now + T.windMs; Sfx.ignite(); return 'hold'; }
        return 'path';
      }
    }
  }
  throwFirebomb(e) {
    const pb = this.player.body, sx = e.x + e.dir * 4, sy = e.y - 8, G = this.physics.world.gravity.y;
    const dx = pb.center.x + pb.velocity.x * 0.3 - sx, dy = pb.bottom - 2 - sy, T = clamp(Math.hypot(dx, dy) / 230, 0.45, 1.1);
    this.spawnEProj('fire', sx, sy, dx / T, (dy - 0.5 * G * T * T) / T);
    Sfx.whoosh();
  }
  spawnFirePatch(x, y) {
    for (let yy = y - 4; yy < y + 70; yy += 2) if (this.standAt(x, yy)) {
      const sy = Math.floor(yy / TS) * TS;
      this.puddles.push({ x, y: sy, w: 38, t: 4, tick: 0.15, fire: true }); this.paintScorch(x, sy + 2, 12); Sfx.ignite();
      return;
    }
  }

  // -------------------------------------------------------------------- gunship ----
  // Flying mini-boss that hangs under the ceiling: rocket volleys (0.6 s pod glow), chain-gun strafing runs,
  // and it drops troops. Kill it and it spirals down in flames and craters whatever it lands on.
  updateGunship(e, dt, now, dx, dy, dist, alive) {
    const b = e.body, T = TUNE.GUNSHIP, pb = this.player.body, hpF = e.hp / e.def.hp;
    if (alive) e.aggro = true;
    e.volT -= dt; e.dropT -= dt; e.strT -= dt; e.sideT -= dt;
    if (e.sideT <= 0) { e.sideT = rand(4, 6); e.side *= -1; }
    let tx = clamp(pb.center.x + e.side * 110, 80, LW - 80), spd = T.speed;
    const ty = T.alt + Math.sin(e.t * 1.3) * 5;
    if (e.ai === 'tell') { if (now >= e.aiUntil) { e.ai = 'volley'; e.shots = 3; e.aiUntil = now; } }
    else if (e.ai === 'volley') {
      if (now >= e.aiUntil && e.shots > 0) { e.shots--; e.aiUntil = now + 220; this.gunshipRocket(e); if (e.shots <= 0) { e.ai = 'cruise'; e.volT = T.volleyCd * (hpF < 0.5 ? 0.7 : 1); } }
    } else if (e.ai === 'strafe') {
      e.shotT -= dt;
      while (e.shotT <= 0 && e.shots > 0) { e.shotT += 0.08; e.shots--; this.gunshipGun(e); }
      tx = e.x + e.strDir * 200; spd *= 1.6;
      if (e.shots <= 0) { e.ai = 'cruise'; e.strT = T.strafeCd; }
    } else {
      e.ai = 'cruise';
      if (alive && e.volT <= 0 && dist < 520) { e.ai = 'tell'; e.aiUntil = now + 600; Sfx.charge(0.9); }
      else if (alive && e.dropT <= 0 && e.drops < 3) { e.dropT = T.dropCd; e.drops++; this.gunshipDrop(e); }
      else if (alive && e.strT <= 0 && Math.abs(dx) < 220) { e.ai = 'strafe'; e.shots = 18; e.shotT = 0; e.strDir = dx >= 0 ? 1 : -1; Sfx.charge(0.5); }
    }
    const k = Math.min(1, dt * 1.6);
    b.velocity.x += (clamp((tx - b.center.x) * 1.5, -spd, spd) - b.velocity.x) * k;
    b.velocity.y += (clamp((ty - b.center.y) * 2, -60, 60) - b.velocity.y) * k;
    e.dir = dx >= 0 ? 1 : -1;
    if (hpF < 0.5 && Math.random() < 0.5) this.fxSmoke(e.x - e.dir * 10, e.y - 6, 1, 1);
    if (hpF < 0.25 && Math.random() < 0.3) { this.fxSparks(e.x + rand(-20, 20), e.y, 3); this.fxFire(e.x - e.dir * 10, e.y - 4, 2); }
    if (Math.random() < 0.6) this.fx.emit(e.x + rand(-14, 14), b.bottom + 2, { n: 1, angle: Math.PI / 2, spread: 0.3, speed: [60, 120], life: [0.1, 0.25], size: [3, 1], cols: [0xffffff, 0x9adcff, 0x4a8aff], add: true });
    e.fr = Math.floor(e.t * 12) % 2 ? 'g1' : 'g0';
  }
  gunshipRocket(e) {
    const pb = this.player.body, sx = e.x + e.dir * 6, sy = e.body.bottom + 2, a = Math.atan2(pb.center.y - sy, pb.center.x - sx) + rand(-0.12, 0.12), S = TUNE.ROCKETEER.rocketSpeed * 1.1;
    this.spawnEProj('rocket', sx, sy, Math.cos(a) * S, Math.sin(a) * S); Sfx.rocket(); this.fxSmoke(sx, sy, 3);
  }
  gunshipGun(e) {
    const pb = this.player.body, sx = e.x + e.dir * 22, sy = e.body.bottom - 2, a = Math.atan2(pb.center.y - sy, pb.center.x - sx) + rand(-8, 8) * DEG;
    Sfx.eshot(); this.spawnLight(sx, sy, 'glow', 0xffd080, 0.6, 1, 0.9, 0.05);
    if (this.solidAt(sx, sy)) return;
    const bl = this.ebullets.getFirstDead(false); if (!bl) return;
    bl.setTexture('ebullet'); bl.enableBody(true, sx, sy, true, true); bl.body.setAllowGravity(false); bl.body.setSize(3, 3, true);
    bl.setRotation(a); bl.setVelocity(Math.cos(a) * 380, Math.sin(a) * 380);
    Object.assign(bl, { life: 1.4, px: sx, py: sy, ang: a, dmg: 4, snipe: false });
  }
  gunshipDrop(e) {
    const kind = Math.random() < 0.5 ? 'grunt' : 'tick';
    for (let i = 0; i < 2; i++) {
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
        if (!e.alive || w.hits.has(e) || e.kind === 'boss') continue;
        const eb = e.body; if (Math.abs(eb.center.x - w.x) < 26 && Math.abs(eb.center.y - w.y) < 14) { w.hits.add(e); this.damageEnemy(e, 90, 0, 1, 'crush'); }
      }
      if ((w.t > 0.25 && (b.blocked.down || b.blocked.left || b.blocked.right)) || w.t > 5) {
        const x = w.x, y = w.y, D = ENEMY.gunship; w.col.destroy(); w.destroy(); this.wrecks.splice(i, 1);
        for (let j = 0; j < 24; j++) this.spawnGib(pick(D.gibs), x + rand(-18, 18), y + rand(-6, 6), rand(-300, 300), rand(-420, -120), 'metal');
        this.explode(x, y, TUNE.GUNSHIP.crash);
        for (let j = 0; j < 6; j++) this.time.delayedCall(80 + j * 90, () => this.boomFx(x + rand(-40, 40), y + rand(-20, 10), rand(0.6, 1.1)));
        for (let j = 0; j < 4; j++) this.spawnFirePatch(x + rand(-40, 40), y);
        this.zoomPunch = 0.15; BUS.emit('flash', 0.5);
      }
    }
  }
