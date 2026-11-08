  explode(x, y, W = TUNE.ROCKET) {
    const R = W.radius, killsBefore = this.stats.kills, byPlayer = !W.enemy, now = this.time.now;
    let damaged = false;
    for (const e of this.enemies.getChildren()) {
      if (!e.alive || (W.spare && e.kind === W.spare)) continue;
      const b = e.body, qx = clamp(x, b.left, b.right), qy = clamp(y, b.top, b.bottom), d = Math.hypot(qx - x, qy - y);
      if (d >= R || (d > 8 && !this.los(x, y, b.center.x, b.center.y))) continue;      // walls block splash
      const f = 1 - d / R, ang = Math.atan2(b.center.y - y, b.center.x - x), kb = e.def.kb;
      b.velocity.x += Math.cos(ang) * 280 * f * kb;
      b.velocity.y += (Math.sin(ang) * 220 - 170) * f * kb;
      e.stunT = Math.max(e.stunT, 0.4 * f + 0.1);
      damaged = true;
      let dmg = W.enemyDamage !== undefined ? W.enemyDamage * (0.4 + 0.6 * f) : W.minDamage + (W.maxDamage - W.minDamage) * f;
      if (e.kind === 'bulwark' && e.shieldUp && Math.sign(x - b.center.x) === e.dir) { dmg *= 0.5; e.ai = 'stagger'; e.aiUntil = now + 900; }   // shield eats half, but it rocks them
      if (W.burn) this.ignite(e, W.burn);
      this.damageEnemy(e, dmg, Math.cos(ang), Math.sin(ang), 'rocket');
    }
    if (damaged && byPlayer) this.stats.hits++;
    for (const k of this.barrelList) if (k.active && Math.hypot(k.x - x, k.y - y) < R + 6) {   // chain into drums
      this.damageBarrel(k, 50, 0.12); k.body.velocity.x += Math.sign(k.x - x || 1) * 140; k.body.velocity.y -= 120;
    }
    if (this.state !== 'dead') {                                          // self-damage + rocket-jump push, or a real hit if hostile
      const pb = this.player.body, qx = clamp(x, pb.left, pb.right), qy = clamp(y, pb.top, pb.bottom), d = Math.hypot(qx - x, qy - y);
      if (d < R && (d < 8 || this.los(x, y, pb.center.x, pb.center.y))) {
        const f = 1 - d / R, ang = Math.atan2(pb.center.y - y, pb.center.x - x), push = W.push * f;
        pb.velocity.x += Math.cos(ang) * push;
        pb.velocity.y = Math.max(-W.maxRise, Math.min(pb.velocity.y, 0) + Math.sin(ang) * push);
        this.jumpCuttable = false; this.lastGround = -1e9;
        const sd = Math.round(W.selfDamage * f);
        if (sd > 0) this.hurtPlayer(sd, x, W.enemy ? { knock: false } : { knock: false, iframes: false, self: true });
      }
    }
    for (const g of this.gibList) {
      if (!g.active) continue;
      const dx = g.x - x, dy = g.y - y, d = Math.hypot(dx, dy) || 1;
      if (d < R * 1.6) {
        if (g.stuckT > 0) { g.stuckT = 0; g.body.setAllowGravity(true); }
        const f = 1 - d / (R * 1.6);
        g.body.velocity.x += dx / d * 380 * f; g.body.velocity.y += dy / d * 380 * f - 160 * f; g.body.angularVelocity += rand(-900, 900) * f;
      }
    }
    this.boomFx(x, y, R / 60, W.style);
    this.paintScorch(x, y, Math.round(26 * R / 60));
    this.makeNoise(x, y, 300, false);
    this.hitStop(byPlayer ? 35 : 20);
    if (byPlayer) {
      const k = this.stats.kills - killsBefore;
      if (k >= 2) BUS.emit('callout', k === 2 ? 'DOUBLE GIB!' : k === 3 ? 'TRIPLE GIB!' : 'MEAT STORM!');
    }
  }
  // Explosion visuals + feel, scaled by size; 'void' = the singularity's purple implosion.
  boomFx(x, y, s = 1, style) {
    const v = style === 'void', dp = Math.hypot(this.player.x - x, this.player.y - y), sm = Math.max(0.6, s);
    if (!v) { const bm = this.booms.find(o => !o.on) || this.booms[0]; bm.setPosition(x, y).setFrame('b0').setScale(sm).setRotation(randi(0, 3) * Math.PI / 2).setVisible(true); bm.t = 0; bm.on = true; }
    this.spawnLight(x, y, 'glow', v ? 0xb060ff : 0xffa040, 3 * s, 6 * s, 0.95, 0.32);
    this.spawnLight(x, y, 'ring', v ? 0xe0b0ff : 0xffe0b0, 0.3 * s, 1.6 * s, 0.9, 0.24);
    this.fx.emit(x, y, { n: Math.round(26 * s), speed: [30, 170 * s], life: [0.2, 0.55], size: [5, 1], cols: v ? [0xffffff, 0xe0b0ff, 0xb060ff, 0x6020c0, 0x200040] : [0xffffff, 0xffe46a, 0xffa030, 0xff5a1a, 0xa82010], add: true, g: -70, drag: 3.2, jitter: 3 });
    this.fxSmoke(x, y, Math.round(12 * s), 1.4 * sm);
    this.fxSparks(x, y, Math.round(22 * s), 0, Math.PI * 2, [100, 340 * sm]);
    this.fx.emit(x, y, { n: Math.round(10 * s), speed: [60, 200], life: [0.8, 1.6], size: [2, 1], cols: v ? [0xffffff, 0xd0a0ff, 0x8040e0] : [0xffe46a, 0xff8a1f, 0xd04010, 0x802010], add: true, g: 420, mode: 1, drag: 0.6 });
    let nearWall = false;
    for (let i = 0; i < 8 && !nearWall; i++) { const a = i / 8 * Math.PI * 2; if (this.solidAt(x + Math.cos(a) * 14, y + Math.sin(a) * 14)) nearWall = true; }
    if (nearWall && s > 0.7) for (let i = 0; i < 5; i++) this.spawnGib(pick(['g_shard', 'g_shard2']), x + rand(-4, 4), y + rand(-4, 4), rand(-200, 200), rand(-320, -120), 'metal');
    this.shake(260, clamp(0.016 * s * (1 - dp / 380), 0.003, 0.016));
    const cdx = this.camX - x, cdy = this.camY - y, cd = Math.hypot(cdx, cdy) || 1, cf = clamp(1 - cd / 320, 0, 1) * s;
    this.addKick(cdx / cd * 9 * cf, cdy / cd * 9 * cf);
    if (dp < 220) BUS.emit('flash', 0.28 * s * (1 - dp / 220));
    if (dp < 150) this.zoomPunch = Math.max(this.zoomPunch, 0.04 * s);
    Sfx.explosion(clamp((1 - dp / 600) * Math.min(1, s + 0.2), 0.3, 1));
  }

