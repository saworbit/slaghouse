  // -------------------------------------------------------------- stake driver ----
  // A heavy stake: kills that leave a body carry it (up to 2) and nail it to the next wall; tough targets
  // just eat it. Pinned bodies dangle from the wall until they're blown apart or the wall breaks.
  spawnStake(x, y, a) {
    const s = this.stakes.getFirstDead(false); if (!s) return;
    const W = TUNE.STAKE;
    s.enableBody(true, x, y, true, true); s.body.setAllowGravity(false); s.body.setSize(4, 4, true);
    s.setVelocity(Math.cos(a) * W.speed, Math.sin(a) * W.speed); s.setRotation(a);
    Object.assign(s, { life: W.life, px: x, py: y, carry: [], hits: new Set() });
  }
  updateStakes(dt) {
    const W = TUNE.STAKE;
    for (const s of this.stakeList) {
      if (!s.active) continue;
      s.life -= dt; s.body.velocity.y += 140 * dt;                       // heavy: drops a touch
      const vx = s.body.velocity.x, vy = s.body.velocity.y, a = Math.atan2(vy, vx), ca = Math.cos(a), sa = Math.sin(a);
      s.setRotation(a);
      const n = Math.max(1, Math.ceil(Math.hypot(s.x - s.px, s.y - s.py) / 3));
      let stop = false;
      for (let i = 1; i <= n && !stop; i++) {
        const x = s.px + (s.x - s.px) * i / n, y = s.py + (s.y - s.py) * i / n;
        if (this.solidAt(x, y)) { this.stakeWall(s, x - ca * 2, y - sa * 2, Math.floor(x / TS), Math.floor(y / TS), a); stop = true; break; }
        const e = this.enemyAt(x, y, 1);
        if (e && !s.hits.has(e)) {
          s.hits.add(e);
          if (this.shieldBlocks(e, ca, y)) { this.fxSparks(x, y, 8, a + Math.PI, 1.2, [80, 240]); Sfx.clang(); e.ai = 'stagger'; e.aiUntil = this.time.now + 900; s.disableBody(true, true); stop = true; break; }
          this.stats.hits++;
          const hs = (isHumanoid(e) || e.kind === 'jet') && y < e.body.top + 5;
          this.fxBlood(x, y, 10, a, 0.7, [100, 300]); this.fxBlood(x, y, 4, a + Math.PI, 1, [40, 120]);
          this.lastRag = null;
          this.damageEnemy(e, W.damage * (hs ? TUNE.HEADSHOT : 1), ca, sa, 'stake', hs);
          if (e.alive) { e.body.velocity.x += ca * 220 * e.def.kb; s.disableBody(true, true); Sfx.squish(); stop = true; break; }   // stuck in something tough
          if (this.lastRag && this.lastRag.from === e && s.carry.length < W.carry) { s.carry.push({ rd: this.lastRag, pi: 1 }); Sfx.squish(); }
          continue;
        }
        if (s.carry.length < W.carry) {
          const rh = this.ragAt(x, y, 1);
          if (rh && !s.carry.some(c => c.rd === rh.rd)) { rh.rd.pin = null; s.carry.push({ rd: rh.rd, pi: rh.pi }); this.hitRagdoll(rh.rd, x, y, 6, ca, sa, 'stake', rh.pi); }
        }
        this.propHitAt(x, y, ca, sa);
      }
      if (stop) continue;
      s.carry.forEach((c, j) => {                                         // drag the skewered along
        if (c.rd.gone) return;
        const p = c.rd.pts[c.pi]; p.x = s.x - ca * (4 + j * 7); p.y = s.y - sa * (4 + j * 7); p.vx = vx; p.vy = vy; c.rd.asleep = false; c.rd.stillT = 0;
      });
      if (Math.random() < 0.5) this.fx.emit(s.x - ca * 8, s.y - sa * 8, { n: 1, speed: [0, 0], life: [0.06, 0.1], size: [2, 1], cols: [0xffffff, 0xb8c2cc], add: true });
      if (s.life <= 0) { s.disableBody(true, true); continue; }
      s.px = s.x; s.py = s.y;
    }
  }
  stakeWall(s, x, y, tx, ty, a) {
    const d = this.stakeDecals[this.stakeCursor]; this.stakeCursor = (this.stakeCursor + 1) % this.stakeDecals.length;
    for (const rd of d.pinned) if (rd.pin && rd.pin.decal === d) { rd.pin = null; rd.asleep = false; }   // recycled: whatever hung there drops
    d.setPosition(x, y).setRotation(a).setVisible(true).setAlpha(1); d.tile = [tx, ty]; d.pinned = [];
    this.fxSparks(x, y, 8, a + Math.PI, 1.4, [60, 200]); this.fxDust(x, y, 3); this.paintHole(x + Math.cos(a) * 3, y + Math.sin(a) * 3);
    Sfx.pin(); this.shake(80, 0.004);
    const carried = s.carry.filter(c => !c.rd.gone);
    carried.forEach((c, j) => {
      c.rd.pin = { pi: c.pi, x: x - Math.cos(a) * (3 + j * 7), y: y - Math.sin(a) * (3 + j * 7), decal: d, tile: [tx, ty] };
      d.pinned.push(c.rd); this.paintSplat(x, y, 6, false);
    });
    if (carried.length) { BUS.emit('callout', carried.length > 1 ? 'SHISH KEBAB!' : 'PINNED!'); this.addStyle(90 * carried.length); this.hitStop(60); Sfx.squish(); this.addKick(Math.cos(a) * 3, Math.sin(a) * 3); }
    s.disableBody(true, true);
    this.damageTile(tx, ty, 20);
  }

  // ----------------------------------------------------------------- prox mines ----
  // G / middle click: sticky mine. Sticks to the first surface (or enemy) it touches, arms in 0.6 s, and goes
  // off when anything hostile gets close. Max 4 out; a fifth fizzles the oldest. Blasts chain them.
  throwMine(now) {
    const M = TUNE.MINE;
    this.mineReady = now + M.cooldown;
    const live = this.mineList.filter(m => m.active);
    if (live.length >= M.max) this.fizzleMine(live.sort((p, q) => p.born - q.born)[0]);
    const m = this.mines.getFirstDead(false); if (!m) return;
    const a = this.aim, ca = Math.cos(a), sa = Math.sin(a), sx = this.shoulder.x, sy = this.shoulder.y;
    m.enableBody(true, sx + ca * 6, sy + sa * 6, true, true);
    m.body.setSize(5, 4, true); m.body.setAllowGravity(true); m.body.moves = true; m.body.setBounce(0, 0);
    m.setVelocity(ca * M.speed + this.player.body.velocity.x * 0.3, sa * M.speed - M.lift); m.setRotation(0);
    Object.assign(m, { stuck: false, armT: M.arm, armed: false, trig: -1, host: null, born: now, blinkT: 0, led: false, px: m.x, py: m.y });
    Sfx.mineThrow(); this.addKick(-ca, -sa); this.recoil = 2;
    BUS.emit('mines', M.max - this.mineList.filter(q => q.active).length);
  }
  fizzleMine(m) { m.disableBody(true, true); m.glow.setVisible(false); this.fxSmoke(m.x, m.y, 3, 0.5); Sfx.clunk(0.5); }
  detonateMine(m) {
    const x = m.x, y = m.y; m.disableBody(true, true); m.glow.setVisible(false);
    this.explode(x, y, TUNE.MINE);
    BUS.emit('mines', TUNE.MINE.max - this.mineList.filter(q => q.active).length);
  }
  updateMines(dt) {
    const M = TUNE.MINE;
    for (const m of this.mineList) {
      if (!m.active) continue;
      const b = m.body;
      if (m.host) {                                                       // stuck to someone: rides along, then pops
        if (!m.host.alive) { m.host = null; m.stuck = false; b.moves = true; b.setAllowGravity(true); }
        else { b.reset(m.host.x + m.hox, m.host.y + m.hoy); m.trig -= dt; if (m.trig <= 0) { this.detonateMine(m); continue; } }
      }
      if (!m.stuck && !m.host) {
        const e = this.enemyAt(m.x, m.y, 3);
        if (e && e.kind !== 'boss') {
          m.host = e; m.hox = m.x - e.x; m.hoy = m.y - e.y; m.trig = 0.9; m.stuck = true; m.armed = true;
          b.setVelocity(0, 0); b.setAllowGravity(false); b.moves = false; Sfx.mineArm(); BUS.emit('callout', 'STUCK!'); this.addStyle(40);
          continue;
        }
        const hit = this.sweep(m.px, m.py, m.x, m.y);
        if (hit || b.blocked.down || b.blocked.left || b.blocked.right || b.blocked.up || (b.velocity.y > 0 && this.standAt(m.x, m.y + 3))) {
          if (hit) b.reset(hit.x, hit.y);
          b.setVelocity(0, 0); b.setAllowGravity(false); b.moves = false; m.stuck = true;
          m.setRotation(this.standAt(m.x, m.y + 4) ? 0 : this.solidAt(m.x, m.y - 4) ? Math.PI : this.solidAt(m.x - 4, m.y) ? Math.PI / 2 : -Math.PI / 2);
          Sfx.clunk(0.7);
        }
      }
      m.px = m.x; m.py = m.y;
      if (m.stuck && !m.host) {
        if (!m.armed) { m.armT -= dt; if (m.armT <= 0) { m.armed = true; Sfx.mineArm(); } }
        if (!this.standAt(m.x, m.y + 4) && !this.solidAt(m.x, m.y - 4) && !this.solidAt(m.x - 4, m.y) && !this.solidAt(m.x + 4, m.y)) { m.stuck = false; b.moves = true; b.setAllowGravity(true); }   // its wall got blown away
      }
      if (m.armed && m.trig < 0 && !m.host) {
        for (const e of this.enemies.getChildren()) {
          if (!e.alive) continue;
          const eb = e.body, qx = clamp(m.x, eb.left, eb.right), qy = clamp(m.y, eb.top, eb.bottom);
          if (Math.hypot(qx - m.x, qy - m.y) < M.trigger && this.los(m.x, m.y - 2, eb.center.x, eb.center.y)) { m.trig = 0.15; Sfx.mineTrig(); break; }
        }
      }
      if (m.trig >= 0 && !m.host) { m.trig -= dt; if (m.trig <= 0) { this.detonateMine(m); continue; } }
      m.blinkT -= dt;
      if (m.blinkT <= 0) { m.blinkT = m.armed ? (m.trig >= 0 ? 0.05 : 0.6) : 0.15; m.led = !m.led; }
      m.glow.setPosition(m.x, m.y - 1).setVisible(true).setAlpha(m.led ? (m.armed ? 0.9 : 0.5) : 0.08).setTint(m.armed ? 0xff2010 : 0xffc040);
    }
  }

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
  }
  jetShoot(e) {
    const T = TUNE.JET, a = e.aimA + rand(-4, 4) * DEG, mx = e.x + Math.cos(a) * 14, my = e.y + 1 + Math.sin(a) * 14;
    e.recoil = 2; Sfx.eshot(); this.spawnLight(mx, my, 'glow', 0xffe080, 0.6, 1, 0.9, 0.06);
    if (this.solidAt(mx, my) || !this.los(e.x, e.y, mx, my)) return;
    const bl = this.ebullets.getFirstDead(false); if (!bl) return;
    bl.setTexture('ebullet'); bl.enableBody(true, mx, my, true, true); bl.body.setAllowGravity(false); bl.body.setSize(3, 3, true);
    bl.setRotation(a); bl.setVelocity(Math.cos(a) * T.bulletSpeed, Math.sin(a) * T.bulletSpeed);
    Object.assign(bl, { life: 1.4, px: mx, py: my, ang: a, dmg: T.damage, snipe: false });
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
        if (!o.alive || h.hitSet.has(o) || o.kind === 'boss') continue;
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
      const ground = this.standAt(b.center.x + e.dir * (b.halfWidth + 4), b.bottom + 4);
      b.velocity.x = approach(b.velocity.x, ground && Math.abs(dx) > 30 ? e.dir * T.speed : 0, 200 * dt);
      const mine = this.enemies.getChildren().filter(o => o.alive && o.mother === e).length;
      if (onGround && e.atkCd <= 0 && mine < T.max) { e.ai = 'birth'; e.aiUntil = now + T.tellMs; Sfx.growl(true); }
    } else {
      if (onGround) { const ground = this.standAt(b.center.x + e.dir * (b.halfWidth + 4), b.bottom + 4), wall = e.dir > 0 ? b.blocked.right : b.blocked.left; if (!ground || wall) e.dir *= -1; }
      b.velocity.x = approach(b.velocity.x, e.dir * T.speed * 0.6, 200 * dt);
    }
    const moving = Math.abs(b.velocity.x) > 4; if (moving) e.animT += dt * 5;
    e.fr = 'w' + (moving ? Math.floor(e.animT) % 4 : 0);
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

  // ------------------------------------------------------------- props: lamps & gas ----
  propHitAt(x, y, ca, sa) {                                            // shots hit the scenery too; true if something took it
    for (const L of this.lamps) if (!L.falling && !L.dead && ((Math.abs(x - L.x) < 7 && Math.abs(y - L.y) < 6) || (Math.abs(x - L.x) < 2 && y > 2 * TS && y < L.y - 3))) { this.dropLamp(L); return true; }
    for (const k of this.canisterList) if (k.active && k.state === 'idle' && Math.abs(x - k.x) < 5 && Math.abs(y - k.y) < 8) {
      const h = Math.atan2(sa, ca); this.igniteCanister(k, h + (Math.cos(h) >= 0 ? -0.5 : 0.5) + rand(-0.4, 0.4)); return true;
    }
    for (const c of this.chargeList) if (c.active && Math.abs(x - c.x) < 5 && Math.abs(y - c.y) < 5) { this.detonateCharge(c); BUS.emit('callout', 'COOKED OFF'); this.addStyle(40); return true; }
    for (const m of this.mineList) if (m.active && Math.abs(x - m.x) < 4 && Math.abs(y - m.y) < 4) { this.detonateMine(m); return true; }
    return false;
  }
  propSweep(x0, y0, x1, y1, ca, sa) {
    for (let i = 1; i <= 3; i++) if (this.propHitAt(x0 + (x1 - x0) * i / 3, y0 + (y1 - y0) * i / 3, ca, sa)) return true;
    return false;
  }
  dropLamp(L) {
    if (L.falling || L.dead) return;
    L.falling = true; L.vy = -40; L.spin = rand(-6, 6); L.hitP = false; L.hits = new Set();
    this.lvlCtx.clearRect(L.x, 2 * TS, 1, Math.max(0, L.y - 3 - 2 * TS)); this.lvlDirty = true;   // the chain snaps
    for (let i = 0; i < 3; i++) this.spawnGib('g_bar', L.x, rand(2 * TS, L.y - 4), rand(-60, 60), rand(-80, 0), 'metal');
    this.fxSparks(L.x, L.y - 4, 10, -Math.PI / 2, 2, [60, 220]); Sfx.clang(); Sfx.snap();
    this.spawnLight(L.x, L.y, 'glow', 0xffe0a0, 1.5, 3, 0.9, 0.15);
  }
  updateLamp(L, dt) {
    L.vy += 900 * dt; L.y += L.vy * dt;
    L.img.setPosition(L.x, L.y).setRotation(L.img.rotation + L.spin * dt);
    const fl = Math.random() < 0.3 ? 0.2 : 1;
    L.gl.setPosition(L.x, L.y + 3).setAlpha(0.5 * fl); L.cone.setPosition(L.x, L.y + 3).setRotation(L.img.rotation).setAlpha(0.16 * fl);
    if (L.vy > 120) {
      for (const e of this.enemies.getChildren()) {
        if (!e.alive || L.hits.has(e) || e.kind === 'boss') continue;
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
  }
  spawnCanisters(fx) {
    CANISTERS.forEach(([cx, cy], i) => {
      const k = this.canisterList[i]; if (!k || k.active) return;
      if (this.tileAt(cx, cy) !== '.' || this.tileAt(cx, cy + 1) === '.') return;   // its shelf is gone
      k.enableBody(true, cx * TS + 8, (cy + 1) * TS - 7, true, true);
      k.body.setSize(7, 13, true); k.body.setAllowGravity(true); k.body.setBounce(0.15, 0.15); k.body.setDrag(200, 0);
      k.setRotation(0); k.clearTint(); Object.assign(k, { state: 'idle', t: 0, heading: 0, hits: new Set(), hitP: false, hissT: 0 });
      if (fx) this.fx.emit(k.x, k.y, { n: 10, speed: [20, 80], life: [0.3, 0.6], size: [2, 1], cols: [0xffffff, 0x80ffb0], add: true, g: -40 });
    });
  }
  igniteCanister(k, heading) {                                          // valve shears off: it becomes a very bad rocket
    if (!k.active || k.state === 'fly') return;
    k.state = 'fly'; k.t = rand(1.2, 1.8); k.heading = heading; k.hits = new Set(); k.hitP = false;
    k.body.setBounce(0.6, 0.6); k.body.setDrag(0, 0);
    Sfx.gasHiss(); Sfx.clang(0.6); this.fxSparks(k.x, k.y, 6);
  }
  updateCanisters(dt) {
    const pb = this.player.body;
    for (const k of this.canisterList) {
      if (!k.active || k.state !== 'fly') continue;
      const b = k.body;
      k.t -= dt; k.heading += rand(-5, 5) * dt;
      if (b.blocked.left || b.blocked.right) { k.heading = Math.PI - k.heading; Sfx.clunk(); this.fxSparks(k.x, k.y, 4); }
      if (b.blocked.up || b.blocked.down) { k.heading = -k.heading; Sfx.clunk(); this.fxSparks(k.x, k.y, 4); }
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
  }
