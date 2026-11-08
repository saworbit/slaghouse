  // ---------------------------------------------------------------- cryo cannon ----
  // A freezing spray: chill slows enemies, full chill turns them into ice statues for a few seconds. A statue
  // takes 1.5x from chip damage, and any real hit (10+, kicks, blasts, a hard landing) shatters it outright.
  fireCryo(now, ox, oy, a) {
    const W = TUNE.CRYO, sx = this.shoulder.x, sy = this.shoulder.y;
    this.cryoActiveUntil = now + 110; this.stats.shots++; this.recoil = 1;
    for (let i = 0; i < 3; i++) this.fx.emit(ox, oy, { n: 1, angle: a, spread: W.cone * 2 * DEG, speed: [150, 230], life: [0.25, 0.45], size: [2, 6], cols: [0xffffff, 0xe0f8ff, 0x9adcff, 0x5aa8e0], add: true, drag: 1.6, g: 20 });
    this.fx.emit(ox, oy, { n: 1, angle: a, spread: 0.4, speed: [60, 120], life: [0.6, 1], size: [3, 8], cols: [0xd8f0ff, 0xa0c8e0], alpha: [0.3, 0], g: 10, drag: 1.2 });
    if (Math.random() < 0.4) this.spawnLight(ox + Math.cos(a) * 30, oy + Math.sin(a) * 30, 'glow', 0x80d0ff, 1.8, 2.4, 0.35, 0.1);
    const inCone = (x, y, extra) => {
      const d = Math.hypot(x - sx, y - sy); if (d > W.range + extra) return false;
      let da = Math.abs(Math.atan2(y - sy, x - sx) - a) % (Math.PI * 2); if (da > Math.PI) da = Math.PI * 2 - da;
      return (da <= (W.cone + 8) * DEG || d < 14) && this.los(sx, sy, x, y);
    };
    let hitAny = false;
    for (const e of this.enemies.getChildren()) {
      if (!e.alive || !inCone(e.body.center.x, e.body.center.y, e.body.halfWidth)) continue;
      hitAny = true; this.chill(e, W.chill);
      if (e.alive) this.damageEnemy(e, W.damage, Math.cos(a), Math.sin(a), 'cryo');
    }
    for (const rd of this.ragdolls) if (rd.burnT > 0 && inCone(rd.pts[2].x, rd.pts[2].y, 4)) rd.burnT = 0;   // puts out corpses
    if (hitAny) this.stats.hits++;
    this.shake(25, 0.0006);
  }
  chill(e, amt) {
    if (e.frozen > 0) { e.frozen = Math.max(e.frozen, TUNE.CRYO.thaw * 0.6); return; }
    e.burnT = 0; e.panicT = 0;
    e.chill = Math.min(1, (e.chill || 0) + amt * (e.kind === 'boss' ? 0.25 : e.kind === 'jugg' ? 0.45 : 1));
    if (e.chill >= 1 && e.kind !== 'boss') this.freeze(e);
  }
  freeze(e) {
    e.frozen = TUNE.CRYO.thaw; e.chill = 1; e.fallV = 0; e.body.setAllowGravity(true); e.body.velocity.x *= 0.3;
    Sfx.freeze(); this.spawnLight(e.x, e.y, 'glow', 0xa0e0ff, 1, 2.2, 0.9, 0.2);
    this.fx.emit(e.x, e.y, { n: 14, speed: [30, 120], life: [0.3, 0.6], size: [2, 1], cols: [0xffffff, 0xc8f0ff, 0x80c8f0], add: true, drag: 2 });
    this.addStyle(20);
  }
  thaw(e) {
    e.frozen = 0; e.chill = 0.4;
    if (FLIERS.has(e.kind)) e.body.setAllowGravity(false);
    Sfx.crack(); this.fx.emit(e.x, e.y, { n: 8, speed: [20, 90], life: [0.3, 0.6], size: [2, 1], cols: [0xffffff, 0xc8f0ff], g: 300, mode: 1 });
  }
  updateFrozen(e, dt) {                                                 // ice statue: no brain, slides, shatters on a hard landing
    const b = e.body;
    e.frozen -= dt;
    if (b.blocked.down || b.touching.down) {
      if ((e.fallV || 0) > 300) { this.damageEnemy(e, 999, 0, -1, 'crush'); return; }
      b.velocity.x *= Math.pow(0.12, dt);
    }
    e.fallV = b.velocity.y;
    if (Math.random() < 0.2) this.fx.emit(b.center.x + rand(-b.halfWidth, b.halfWidth), b.top + rand(0, b.height), { n: 1, speed: [0, 8], life: [0.4, 0.8], size: [1, 1], cols: [0xffffff, 0xc8f0ff], add: true, g: 15 });
    if (e.frozen <= 0) this.thaw(e);
  }

  // --------------------------------------------------------------------- sentry ----
  // T: drops an auto-turret at your feet. It hunts the nearest visible enemy with rivets for 14 s (enemy blasts
  // can wreck it early), then pops. 12 s recharge after it's gone.
  deploySentry(now) {
    if (this.sentry || now < this.sentryReadyAt || this.state === 'dead') return;
    const T = TUNE.SENTRY, p = this.player, x = p.x + this.facing * 10;
    let fy = p.body.bottom; for (let i = 0; i < 60 && !this.standAt(x, fy + 1); i++) fy += 2;
    const base = this.add.image(x, fy - 5, 'sentry_base').setDepth(5.6), head = this.add.image(x, fy - 12, 'sentry_head').setOrigin(5 / 16, 0.5).setDepth(5.7);
    const glow = this.add.image(x, fy - 12, 'glow').setBlendMode(ADD).setTint(0x46e6ff).setScale(0.4).setAlpha(0.7).setDepth(18);
    this.sentry = { x, y: fy, base, head, glow, t: T.life, hp: T.hp, cd: 0.4, aim: this.facing > 0 ? 0 : Math.PI, target: null, vy: 0, beepT: 0, retarget: 0, recoil: 0 };
    Sfx.clunk(); Sfx.mineArm(); this.fxDust(x, fy, 6); BUS.emit('callout', 'SENTRY UP');
  }
  updateSentry(dt, now) {
    const S = this.sentry, T = TUNE.SENTRY; if (!S) return;
    S.t -= dt;
    if (!this.standAt(S.x, S.y + 1)) { S.vy += this.physics.world.gravity.y * dt; S.y += S.vy * dt; if (S.y > LH) S.t = 0; }   // its floor got blown away
    else if (S.vy) { S.y = Math.floor((S.y + 1) / TS) * TS; S.vy = 0; Sfx.clunk(); }
    const hx = S.x, hy = S.y - 12;
    S.retarget -= dt;
    if (S.retarget <= 0 || !S.target || !S.target.alive) {
      S.retarget = 0.25; S.target = null; let bd = T.range;
      for (const e of this.enemies.getChildren()) {
        if (!e.alive) continue;
        const d = Math.hypot(e.body.center.x - hx, e.body.center.y - hy);
        if (d < bd && this.los(hx, hy, e.body.center.x, e.body.center.y)) { bd = d; S.target = e; }
      }
    }
    const want = S.target ? Math.atan2(S.target.body.center.y - hy, S.target.body.center.x - hx) : S.aim + Math.sin(now / 500) * 0.03;
    let da = want - S.aim; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
    S.aim += clamp(da, -T.turn * dt, T.turn * dt);
    S.cd -= dt;
    if (S.target && Math.abs(da) < 0.15 && S.cd <= 0) {
      S.cd = T.rate * (now < this.rampageUntil ? TUNE.RAMPAGE.fire : 1);
      const ca = Math.cos(S.aim), sa = Math.sin(S.aim), mx = hx + ca * 11, my = hy + sa * 11;
      this.spawnBullet('rivet', mx, my, S.aim + rand(-2, 2) * DEG, 560, T.damage, 0.6);
      this.spawnLight(mx, my, 'glow', 0xffd080, 0.6, 1, 0.9, 0.05); Sfx.rivet(); S.recoil = 2;
      if (Math.random() < 0.5) this.spawnGib('g_casing', hx, hy - 1, rand(-60, 60), rand(-160, -100), 'shell');
    }
    S.recoil = Math.max(0, S.recoil - 30 * dt);
    S.base.setPosition(S.x, S.y - 5);
    S.head.setPosition(hx - Math.cos(S.aim) * S.recoil, hy - Math.sin(S.aim) * S.recoil).setRotation(S.aim); S.head.scaleY = Math.cos(S.aim) < 0 ? -1 : 1;
    const low = S.t < 2.5 && Math.floor(now / 120) % 2;
    S.glow.setPosition(hx + Math.cos(S.aim) * 2, hy - 1).setTint(S.target ? 0xff4020 : 0x46e6ff).setAlpha(low ? 0.15 : 0.7);
    if (S.t < 2.5) { S.beepT -= dt; if (S.beepT <= 0) { S.beepT = 0.25; Sfx.beep(); } }
    if (S.t <= 0 || S.hp <= 0) this.killSentry();
  }
  killSentry() {
    const S = this.sentry; if (!S) return;
    this.sentry = null; this.sentryReadyAt = this.time.now + TUNE.SENTRY.recharge * 1000;
    const x = S.x, y = S.y - 8;
    S.base.destroy(); S.head.destroy(); S.glow.destroy();
    for (let i = 0; i < 6; i++) this.spawnGib(pick(['g_shard', 'g_shard2', 'g_plate', 'g_wire']), x, y, rand(-200, 200), rand(-300, -100), 'metal');
    this.boomFx(x, y, 0.55);                                              // just a pop: it's ours, no damage
  }

  // ------------------------------------------------------------------- screamer ----
  // Flaming kamikaze skulls: hover off to one side, shriek (0.5 s), then dive at you and blow. Killing one in
  // the air still sets it off; frozen ones just shatter.
  updateScreamer(e, dt, now, dx, dy, dist, alive) {
    const b = e.body, T = TUNE.SCREAMER, pb = this.player.body;
    if (alive && !e.aggro && (e.sees || dist < 150) && dist < e.def.sight) { e.aggro = true; e.aggroT = 6; this.popAlert(e); }
    if (e.ai === 'dive') {
      const want = Math.atan2(pb.center.y - e.y, pb.center.x - e.x);
      let da = want - e.head; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      e.head += clamp(da, -T.turn * dt, T.turn * dt);
      e.spd = Math.min(T.speed * 1.2, e.spd + 220 * dt);
      b.velocity.x = Math.cos(e.head) * e.spd; b.velocity.y = Math.sin(e.head) * e.spd;
      e.dir = b.velocity.x >= 0 ? 1 : -1; e.rotation = e.dir > 0 ? e.head : e.head - Math.PI;
      this.fx.emit(e.x - Math.cos(e.head) * 6, e.y - Math.sin(e.head) * 6, { n: 2, angle: e.head + Math.PI, spread: 0.5, speed: [30, 90], life: [0.12, 0.3], size: [4, 1], cols: [0xffffff, 0xffe46a, 0xff8a1f, 0xc03010], add: true });
      if ((alive && dist < 12) || b.blocked.left || b.blocked.right || b.blocked.up || b.blocked.down || now > e.aiUntil) { this.screamerBoom(e); return; }
      e.fr = 'sw';
      return;
    }
    if (e.ai === 'wind') {
      b.velocity.x *= Math.pow(0.02, dt); b.velocity.y *= Math.pow(0.02, dt);
      e.rotation = rand(-0.15, 0.15); e.fr = 'sw';
      if (now >= e.aiUntil) { e.ai = 'dive'; e.head = Math.atan2(pb.center.y - e.y, pb.center.x - e.x); e.spd = T.speed * 0.7; e.aiUntil = now + 2600; }
      return;
    }
    let tx = e.homeX + Math.sin(e.t * 0.8) * 30, ty = e.homeY + Math.sin(e.t * 1.9) * 8;
    if (e.aggro && alive) {
      tx = pb.center.x + (e.x < pb.center.x ? -110 : 110) + Math.sin(e.t * 2.3) * 20; ty = pb.top - 50 + Math.sin(e.t * 3) * 10; e.dir = dx >= 0 ? 1 : -1;
      if (this.solidAt(tx, ty)) ty += 20;
      e.atkT -= dt;
      if (e.atkT <= 0 && e.sees && dist < 260) { e.ai = 'wind'; e.aiUntil = now + T.windMs; Sfx.scream(); return; }
    }
    const k = Math.min(1, dt * 2.5);
    b.velocity.x += (clamp((tx - b.center.x) * 2, -150, 150) - b.velocity.x) * k;
    b.velocity.y += (clamp((ty - b.center.y) * 2, -120, 120) - b.velocity.y) * k;
    e.fr = Math.floor(e.t * 10) % 2 ? 's1' : 's0';
  }
  screamerBoom(e) { const x = e.x, y = e.y; e.hp = 0; this.killEnemy(e, 0, 0, 'tickboom'); this.explode(x, y, TUNE.SCREAMER.boom); }

  // --------------------------------------------------------------------- warden ----
  // Shield drone: links to the 2 nearest allies and soaks 75% of what hits them (bubble + tether). Kill it first.
  updateWarden(e, dt, now, dx, dy, dist, alive) {
    const b = e.body, T = TUNE.WARDEN, pb = this.player.body;
    if (alive && !e.aggro && (e.sees || dist < 150) && dist < e.def.sight) this.alertEnemy(e, now);
    e.linkT -= dt;
    if (e.linkT <= 0) {
      e.linkT = 0.4;
      e.links = this.enemies.getChildren().filter(o => o.alive && o !== e && !['warden', 'boss', 'tick', 'screamer'].includes(o.kind) && Math.hypot(o.x - e.x, o.y - e.y) < T.range * 1.6)
        .sort((p, q) => Math.hypot(p.x - e.x, p.y - e.y) - Math.hypot(q.x - e.x, q.y - e.y)).slice(0, T.links);
    }
    const L = e.links.filter(o => o.alive);
    for (const o of L) if (Math.hypot(o.x - e.x, o.y - e.y) < T.range) { o.shieldBy = e; o.shieldT = now + 200; }
    let tx = e.homeX, ty = e.homeY;
    if (L.length) { tx = L.reduce((s, o) => s + o.x, 0) / L.length; ty = L.reduce((s, o) => s + o.y, 0) / L.length - 36; tx += tx < pb.center.x ? -24 : 24; }
    else if (e.aggro && alive) { tx = pb.center.x + (e.x < pb.center.x ? -140 : 140); ty = pb.top - 60; }
    if (this.solidAt(tx, ty)) ty += 16;
    if (e.stunT <= 0) { const k = Math.min(1, dt * 2.2); b.velocity.x += (clamp((tx - b.center.x) * 2, -90, 90) - b.velocity.x) * k; b.velocity.y += (clamp((ty - b.center.y) * 2, -80, 80) - b.velocity.y) * k; }
    else { const f = Math.pow(0.05, dt); b.velocity.x *= f; b.velocity.y *= f; }
    if (Math.abs(b.velocity.x) > 6) e.dir = b.velocity.x > 0 ? 1 : -1;
    e.fr = Math.floor(e.t * 6) % 2 ? 'v1' : 'v0';
  }

  // ------------------------------------------------------------------ juggernaut ----
  // Mini-boss: 0.65 s spin-up (laser tell) then a 2 s minigun sweep that lags behind you - keep moving.
  // Armour cracks off at 66% and 33%; each stage makes it faster and angrier.
  updateJugg(e, dt, now, dx, dy, dist, alive) {
    const b = e.body, D = e.def, T = TUNE.JUGG, onGround = b.blocked.down || b.touching.down, pb = this.player.body;
    if (alive && !e.aggro && (e.sees || dist < 200) && dist < D.sight) this.alertEnemy(e, now);
    if (e.aggro && e.sees) e.aggroT = Math.max(e.aggroT, 5);
    const stage = e.hp > D.hp * 0.66 ? 0 : e.hp > D.hp * 0.33 ? 1 : 2;
    if (stage !== e.stage) { e.stage = stage; this.juggCrack(e); }
    e.atkCd -= dt;
    const want = Math.atan2(pb.center.y - (e.y - 1), pb.center.x - e.x);
    let da = want - e.aimA; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
    if (e.ai === 'spin') {
      b.velocity.x = approach(b.velocity.x, 0, 400 * dt);
      e.aimA += clamp(da, -3 * dt, 3 * dt); e.spin = Math.min(1, e.spin + dt / (T.spinMs / 1000));
      if (now >= e.aiUntil) { e.ai = 'fire'; e.aiUntil = now + T.fireT * 1000; e.shotT = 0; }
    } else if (e.ai === 'fire') {
      b.velocity.x = approach(b.velocity.x, 0, 400 * dt);
      e.aimA += clamp(da, -T.turn * (1 + stage * 0.3) * dt, T.turn * (1 + stage * 0.3) * dt);   // the sweep lags behind you
      e.shotT -= dt;
      while (e.shotT <= 0) { e.shotT += T.rate; this.juggShoot(e); }
      if (now >= e.aiUntil) { e.ai = 'walk'; e.atkCd = T.cd; }
    } else {
      e.spin = Math.max(0, e.spin - dt * 1.5);
      if (e.aggro && alive) {
        e.aimA += clamp(da, -2 * dt, 2 * dt);
        const dir = dx > 0 ? 1 : -1, ground = this.standAt(b.center.x + dir * (b.halfWidth + 4), b.bottom + 4);
        b.velocity.x = approach(b.velocity.x, (ground || dy > 20) && Math.abs(dx) > 60 ? dir * T.speed * (1 + stage * 0.35) : 0, 300 * dt);
        if (onGround && (dir > 0 ? b.blocked.right : b.blocked.left)) b.velocity.y = -300;   // clambers over junk
        if (e.atkCd <= 0 && e.sees && dist < 320) { e.ai = 'spin'; e.aiUntil = now + T.spinMs; Sfx.charge(0.8); Sfx.growl(true); }
      } else {
        if (onGround) { const ground = this.standAt(b.center.x + e.dir * (b.halfWidth + 4), b.bottom + 4), wall = e.dir > 0 ? b.blocked.right : b.blocked.left; if (!ground || wall) e.dir *= -1; }
        b.velocity.x = approach(b.velocity.x, e.dir * T.speed * 0.6, 200 * dt); e.aimA = e.dir > 0 ? 0.2 : Math.PI - 0.2;
      }
    }
    e.dir = Math.cos(e.aimA) >= 0 ? 1 : -1;
    const moving = Math.abs(b.velocity.x) > 5 && onGround;
    if (moving) { e.animT += dt * Math.abs(b.velocity.x) / 14; const st = Math.floor(e.animT); if (st !== e.stepK) { e.stepK = st; if (st % 2 === 0) { this.shake(70, 0.003); Sfx.land(0.7); } } }
    e.fr = 's' + stage + 'w' + (moving ? Math.floor(e.animT) % 4 : 0);
    e.recoil = Math.max(0, e.recoil - 30 * dt);
  }
  juggShoot(e) {
    const T = TUNE.JUGG, a = e.aimA + rand(-5, 5) * DEG, sx = e.x + e.dir * 2, sy = e.y - 1, mx = sx + Math.cos(a) * 28, my = sy + Math.sin(a) * 28;
    e.recoil = 2; Sfx.eshot(); this.spawnLight(mx, my, 'glow', 0xffd080, 0.8, 1.2, 0.9, 0.05);
    if (Math.random() < 0.5) this.spawnGib('g_casing', sx, sy, -e.dir * rand(40, 100), rand(-200, -120), 'shell');
    this.shake(30, 0.0015);
    if (this.solidAt(mx, my) || !this.los(sx, sy, mx, my)) return;
    const bl = this.ebullets.getFirstDead(false); if (!bl) return;
    bl.setTexture('ebullet'); bl.enableBody(true, mx, my, true, true); bl.body.setAllowGravity(false); bl.body.setSize(3, 3, true);
    bl.setRotation(a); bl.setVelocity(Math.cos(a) * T.bulletSpeed, Math.sin(a) * T.bulletSpeed);
    Object.assign(bl, { life: 1.4, px: mx, py: my, ang: a, dmg: T.damage, snipe: false });
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
    this.rampageUntil = this.time.now + TUNE.RAMPAGE.time;
    BUS.emit('callout', 'RAMPAGE!'); BUS.emit('flash', 0.35); Sfx.rampage();
    this.zoomPunch = Math.max(this.zoomPunch, 0.08); this.shake(300, 0.008);
  }
  applyMod(m) {                                                         // wave modifiers: chaos with rules
    this.mod = m; this.rainT = 1.5;
    this.physics.world.gravity.y = m === 'lowg' ? TUNE.GRAVITY * 0.5 : TUNE.GRAVITY;
    if (m) this.time.delayedCall(1300, () => { if (this.state === 'play' && this.mod === m) { BUS.emit('callout', m === 'slag' ? 'SLAG RAIN!' : 'LOW GRAVITY!'); Sfx.roar(); this.shake(400, 0.006); } });
  }
  updateSlagRain(dt) {                                                  // molten drips from the ceiling, marked where they'll land
    this.rainT -= dt; if (this.rainT > 0) return;
    this.rainT = rand(0.28, 0.55);
    const x = clamp(this.player.x + rand(-280, 280), 40, LW - 40), y = 2 * TS + 4;
    if (this.solidAt(x, y)) return;
    const s = this.slags.getFirstDead(false); if (!s) return;
    s.enableBody(true, x, y, true, true); s.body.setAllowGravity(true); s.body.setSize(5, 5, true); s.setVelocity(rand(-10, 10), 30);
    Object.assign(s, { px: x, py: y }); s.glow.setVisible(true);
    let gy = y; while (gy < LH - TS && !this.standAt(x, gy)) gy += 4;
    this.spawnLight(x, Math.floor(gy / TS) * TS - 2, 'ring', 0xff4020, 0.9, 0.4, 0.8, 0.6);
    if (Math.random() < 0.3) Sfx.whistle();
  }
