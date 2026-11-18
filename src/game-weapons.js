// GameScene, continued: the weapons: firing, projectiles and each gun's own effects (#166).
// Plain methods added to the class after it, so src/join.mjs stays a concatenation: game.js must come first.
Object.assign(GameScene.prototype, {

  // ---------------------------------------------------------------- weapons ----
  fire(now) {
    const W = WEAPONS[this.weapon], G = GUNS[W.gun];
    this.nextFire = now + W.cooldown * (now < this.rampageUntil ? TUNE.RAMPAGE.fire : 1) * (this.perks.trigger ? 0.8 : 1) * (now < this.hasteUntil ? 0.67 : 1);   // rampage / perk / HASTE: faster
    this.lastShotT = now;
    if (now > this.noiseT) { this.noiseT = now + 250; this.makeNoise(this.player.x, this.player.y, W.id === 'nail' || W.id === 'arc' ? 210 : 270, true); }   // gunfire gives your position away
    const a = this.aim, ca = Math.cos(a), sa = Math.sin(a);
    const mx = this.shoulder.x + ca * G.muzzle, my = this.shoulder.y + sa * G.muzzle;
    const blocked = this.solidAt(mx, my) || !this.los(this.shoulder.x, this.shoulder.y, mx, my);
    const ox = blocked ? this.shoulder.x : mx, oy = blocked ? this.shoulder.y : my;   // never spawn shots inside walls
    const pb = this.player.body;
    if (W.id === 'nail') {
      this.stats.shots++;
      this.spawnBullet('nail', ox, oy, a + rand(-1, 1) * W.spread * DEG, W.speed, W.damage, W.life);
      this.recoil = 2; Sfx.nail();
      this.muzzle(mx, my, a, 0.75, 45);
      this.fxSparks(mx, my, 2, a, 0.6, [60, 160]);
      this.shake(40, 0.0012); this.addKick(-ca * 1.2, -sa * 1.2);
    } else if (W.id === 'shotgun') {
      for (let i = 0; i < W.pellets; i++) {
        this.stats.shots++;
        const off = (i - (W.pellets - 1) / 2) / ((W.pellets - 1) / 2) * W.spread;
        this.spawnBullet('pellet', ox, oy, a + (off + rand(-2, 2)) * DEG, W.speed * rand(0.9, 1.08), W.damage, W.life * rand(0.9, 1.1));
      }
      this.recoil = 5; Sfx.shotgun();
      pb.velocity.x -= ca * W.knock;
      if (!pb.blocked.down) pb.velocity.y -= sa * W.knock * 0.6;
      this.muzzle(mx, my, a, 1.5, 70);
      this.fxSparks(mx, my, 6, a, 0.9, [80, 260]); this.fxSmoke(mx, my, 4);
      this.shake(90, 0.0055); this.addKick(-ca * 5, -sa * 5);
      this.time.delayedCall(240, () => { if (this.state !== 'dead') this.spawnShell(); });
    } else if (W.id === 'grenade') {
      this.stats.shots++;
      this.spawnGrenade(ox, oy, a);
      this.recoil = 4; Sfx.grenade();
      this.muzzle(mx, my, a, 0.9, 55);
      this.fxSmoke(mx, my, 5); this.fxSparks(mx, my, 3, a, 0.7, [60, 150]);
      this.shake(60, 0.0025); this.addKick(-ca * 3, -sa * 3);
    } else if (W.id === 'arc') {
      this.fireArc(now, ox, oy, a, blocked);
    } else if (W.id === 'rail') {
      this.fireRail(now, ox, oy, a, mx, my);
    } else if (W.id === 'flame') {
      this.fireFlame(now, ox, oy, a);
    } else if (W.id === 'sing') {
      this.stats.shots++;
      this.spawnOrb(ox, oy, a);
      this.recoil = 4; Sfx.grenade();
      this.spawnLight(mx, my, 'glow', 0xb060ff, 1, 1.8, 0.9, 0.15);
      this.fx.emit(mx, my, { n: 8, angle: a, spread: 1, speed: [40, 140], life: [0.2, 0.4], size: [2, 1], cols: [0xffffff, 0xd0a0ff, 0x7030d0], add: true });
      this.shake(70, 0.003); this.addKick(-ca * 3, -sa * 3);
    } else if (W.id === 'prism') {
      this.firePrism(now, ox, oy, a, mx, my);
    } else if (W.id === 'cryo') {
      this.fireCryo(now, ox, oy, a);
    } else if (W.id === 'stake') {
      this.stats.shots++;
      this.spawnStake(ox, oy, a);
      this.recoil = 7; Sfx.stake();
      this.muzzle(mx, my, a, 1.1, 60); this.fxSmoke(mx, my, 5); this.fxSmoke(this.shoulder.x - ca * 6, this.shoulder.y + 3, 3, 0.6);
      this.shake(110, 0.006); this.addKick(-ca * 6, -sa * 6);
      pb.velocity.x -= ca * 90;
    } else if (W.id === 'mini') {
      this.stats.shots++;
      this.nextFire = now + (150 - (150 - W.cooldown) * this.spin) * (now < this.rampageUntil ? TUNE.RAMPAGE.fire : 1);       // fire rate climbs with barrel spin
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
    } else if (W.id === 'flak') {
      this.stats.shots++;
      this.spawnGrenade(ox, oy, a, 'flak');
      this.recoil = 7; Sfx.flak();
      this.muzzle(mx, my, a, 1.4, 70); this.fxSmoke(mx, my, 6); this.fxSparks(mx, my, 6, a, 0.8, [80, 240]);
      this.shake(100, 0.006); this.addKick(-ca * 5, -sa * 5);
      pb.velocity.x -= ca * 110; if (!pb.blocked.down) pb.velocity.y -= sa * 70;
      this.time.delayedCall(200, () => { if (this.state !== 'dead') this.spawnShell(); });
    } else if (W.id === 'acid') {
      this.fireAcid(now, ox, oy, a);
    } else if (W.id === 'needler') {
      this.fireNeedle(now, ox, oy, a, mx, my);
    } else if (W.id === 'drill') {
      this.fireDrill(now, ox, oy, a, mx, my);
    } else if (W.id === 'flare') {
      this.fireFlare(now, ox, oy, a, mx, my);
    } else if (W.id === 'net') {
      this.fireNet(now, ox, oy, a, mx, my);
    } else if (W.id === 'cutter') {
      this.fireCutter(now, ox, oy, a, mx, my);
    } else if (W.id === 'spider') {
      this.fireSpider(now, ox, oy, a, mx, my);
    } else if (W.id === 'bees') {
      this.fireBees(now, ox, oy, a, mx, my);
    } else if (W.id === 'shrink') {
      this.fireShrink(now, ox, oy, a, mx, my);
    } else if (W.id === 'sonic') {
      this.fireSonic(now, a, mx, my);
    } else if (W.id === 'grav') {
      this.stats.shots++; this.spawnGrenade(ox, oy, a, 'grav');
      this.recoil = 4; Sfx.mineThrow(); this.muzzle(mx, my, a, 0.8, 50); this.spawnLight(mx, my, 'glow', 0x9a60ff, 0.6, 1.2, 0.8, 0.1); this.addKick(-ca * 2, -sa * 2);
    } else if (W.id === 'pinball') {
      this.firePinball(now, ox, oy, a, mx, my);
    } else if (W.id === 'firework') {
      this.fireFirework(now, ox, oy, a, mx, my);
    } else if (W.id === 'katana') {
      this.slashKatana(now, a, mx, my);
    } else if (W.id === 'siphon') {
      this.fireSiphon(now, ox, oy, a);
    } else if (W.id === 'splitter') {
      this.stats.shots++; this.splits.push({ x: ox, y: oy, px: ox, py: oy, vx: Math.cos(a) * TUNE.SPLITTER.speed, vy: Math.sin(a) * TUNE.SPLITTER.speed, gen: 0, t: TUNE.SPLITTER.life, hit: new Set() });
      this.recoil = 4; Sfx.split(); this.muzzle(mx, my, a, 0.8, 45); this.spawnLight(mx, my, 'glow', 0x9af4ff, 0.8, 1.6, 0.8, 0.1); this.addKick(-ca * 2.5, -sa * 2.5); this.shake(50, 0.0025);
    } else if (W.id === 'seed') {
      this.stats.shots++; this.seeds.push({ x: ox, y: oy, vx: Math.cos(a) * TUNE.SEED.speed, vy: Math.sin(a) * TUNE.SEED.speed - 50, t: 3 });
      this.recoil = 3; Sfx.mineThrow(); this.addKick(-ca * 1.5, -sa * 1.5);
    } else if (W.id === 'tether') {
      this.stats.shots++; this.spawnBullet('tetherdart', ox, oy, a, TUNE.TETHER.speed, TUNE.TETHER.dmg, 0.8);
      this.recoil = 2; Sfx.tether(); this.muzzle(mx, my, a, 0.5, 35); this.addKick(-ca, -sa);
    } else if (W.id === 'nuke') {
      this.stats.shots++; this.nukes.push({ x: ox, y: oy, vx: Math.cos(a) * TUNE.NUKE.speed, vy: Math.sin(a) * TUNE.NUKE.speed - TUNE.NUKE.lift, t: 5 });
      this.recoil = 9; Sfx.mortar(); this.muzzle(mx, my, a, 1.6, 90); this.fxSmoke(mx, my, 10); this.shake(160, 0.008); this.addKick(-ca * 7, -sa * 7);
      pb.velocity.x -= ca * 160; if (!pb.blocked.down) pb.velocity.y -= sa * 100;
    } else if (W.id === 'dragon') {
      for (let i = 0; i < TUNE.DRAGON.pellets; i++) { this.stats.shots++; const off = (i - (TUNE.DRAGON.pellets - 1) / 2) / ((TUNE.DRAGON.pellets - 1) / 2) * TUNE.DRAGON.spread; this.spawnBullet('ember', ox, oy, a + (off + rand(-2, 2)) * DEG, TUNE.DRAGON.speed * rand(0.9, 1.08), TUNE.DRAGON.dmg, 0.4 * rand(0.9, 1.1)); }
      this.recoil = 5; Sfx.dragon(); pb.velocity.x -= ca * TUNE.DRAGON.knock; if (!pb.blocked.down) pb.velocity.y -= sa * TUNE.DRAGON.knock * 0.6;
      this.muzzle(mx, my, a, 1.6, 80); this.fxFire(mx, my, 10); this.fxSmoke(mx, my, 4); this.shake(90, 0.0055); this.addKick(-ca * 5, -sa * 5);
      this.time.delayedCall(240, () => { if (this.state !== 'dead') this.spawnShell(); });
    } else if (W.id === 'glue') {
      this.stats.shots++; this.globs.push({ x: ox, y: oy, vx: Math.cos(a) * TUNE.GLUE.speed, vy: Math.sin(a) * TUNE.GLUE.speed - 40, t: 1.4 });
      this.recoil = 2; Sfx.glue(); this.addKick(-ca, -sa);
    } else if (W.id === 'gaslaunch') {
      this.stats.shots++; this.spawnGrenade(ox, oy, a, 'gascan');
      this.recoil = 4; Sfx.grenade(); this.muzzle(mx, my, a, 0.8, 50); this.fxSmoke(mx, my, 4); this.addKick(-ca * 3, -sa * 3);
    } else if (W.id === 'bubble') {
      this.stats.shots++; this.bubbles.push({ x: ox, y: oy, vx: Math.cos(a) * TUNE.BUBBLE.speed, vy: Math.sin(a) * TUNE.BUBBLE.speed, t: TUNE.BUBBLE.life, w: rand(0, 6) });
      this.recoil = 1.5; Sfx.bubble(); this.addKick(-ca, -sa);
    } else if (W.id === 'tripwire') {
      this.stats.shots++; this.trips.push({ x: ox, y: oy, vx: Math.cos(a) * TUNE.TRIPWIRE.speed, vy: Math.sin(a) * TUNE.TRIPWIRE.speed - 60, st: 'fly', n: 0, hitT: new Map(), t: 0 });
      while (this.trips.length > TUNE.TRIPWIRE.max) { const old = this.trips.find(q => q.st === 'set') || this.trips[0]; this.explode(old.x, old.y, TUNE.TRIPWIRE.boom); this.trips.splice(this.trips.indexOf(old), 1); }   // two at most: the oldest goes off
      this.recoil = 3; Sfx.mineThrow(); this.addKick(-ca * 1.5, -sa * 1.5);
    } else if (W.id === 'dronepod') {
      this.fireDronePod(now, mx, my);
    } else if (W.id === 'gauntlet') {
      this.rocketPunch(now, a, ca, sa);
    } else if (W.id === 'marksman') {
      this.fireMarksman(now, ox, oy, a, mx, my);
    } else if (W.id === 'stasis') {
      this.stats.shots++; this.spawnGrenade(ox, oy, a, 'stasis');
      this.recoil = 4; Sfx.mineThrow(); this.muzzle(mx, my, a, 0.7, 40); this.spawnLight(mx, my, 'glow', 0xc8e8ff, 0.6, 1.2, 0.8, 0.1); this.addKick(-ca * 2, -sa * 2);
    } else if (W.id === 'microwave') {
      this.fireMicrowave(now, ox, oy, a);
    } else if (W.id === 'decoy') {
      this.stats.shots++; this.spawnGrenade(ox, oy, a, 'decoy');
      this.recoil = 4; Sfx.mineThrow(); this.muzzle(mx, my, a, 0.7, 40); this.spawnLight(mx, my, 'glow', 0x46e6ff, 0.6, 1.2, 0.8, 0.1); this.addKick(-ca * 2, -sa * 2);
    } else if (W.id === 'whip') {
      this.crackWhip(now, a, mx, my);
    } else if (W.id === 'napalm') {
      this.fireNapalm(now, ox, oy, a, mx, my);
    } else if (W.id === 'revolver') {
      this.fireRevolver(now, ox, oy, a, mx, my);
    } else if (W.id === 'ripper') {
      this.fireRipper(now, a, ca, sa);
    } else if (W.id === 'cannon') {                                     // ---- expansion: weapons ----
      this.fireCannon(now, ox, oy, a, mx, my);
    } else if (W.id === 'quake') {
      this.fireQuake(now, a, mx, my);
    } else if (W.id === 'phase') {
      this.firePhase(now, a, mx, my);
    } else if (W.id === 'balllight') {
      this.fireBallLight(now, ox, oy, a, mx, my);
    } else if (W.id === 'cyclone') {
      this.fireCyclone(now, ox, oy, a, mx, my);
    } else if (W.id === 'caltrop') {
      this.fireCaltrops(now, ox, oy, a, mx, my);
    } else if (W.id === 'spear') {
      this.fireSpear(now, ox, oy, a, mx, my);
    } else if (W.id === 'heatray') {
      this.fireHeatRay(now, ox, oy, a);
    } else if (W.id === 'barrage') {
      this.fireBarrage(now, ox, oy, a, mx, my);
    } else if (W.id === 'hydro') {
      this.fireHydro(now, ox, oy, a);
    } else if (W.id === 'saw') {
      this.stats.shots++;
      this.spawnSaw(ox, oy, a);
      this.recoil = 3; Sfx.sawLaunch();
      this.spawnLight(mx, my, 'glow', 0xffe0a0, 0.8, 1.4, 0.7, 0.08);
      this.fxSparks(mx, my, 5, a, 0.8, [80, 220]);
      this.shake(50, 0.002); this.addKick(-ca * 2, -sa * 2);
    } else {
      this.stats.shots++;
      this.spawnRocket(ox, oy, a);
      this.recoil = 4; Sfx.rocket();
      this.muzzle(mx, my, a, 1.2, 70);
      this.fxSmoke(this.shoulder.x - ca * 8, this.shoulder.y - sa * 8, 6); this.fxFire(mx, my, 4);
      this.shake(70, 0.003); this.addKick(-ca * 4, -sa * 4);
    }
  },
  muzzle(x, y, a, s, ms) {
    this.mflash.setTexture('mf' + randi(0, 2)).setPosition(x, y).setRotation(a).setScale(s * rand(0.85, 1.15), s * (Math.random() < 0.5 ? -1 : 1)).setVisible(true);
    this.mflashUntil = this.time.now + ms;
    this.spawnLight(x, y, 'glow', 0xffc060, 1.5 * s, 2.2 * s, 0.9, ms / 1000 * 1.8);
  },
  spawnBullet(kind, x, y, ang, speed, dmg, life) {
    const b = this.bullets.getFirstDead(false); if (!b) return;
    b.setTexture(kind === 'nail' || kind === 'tetherdart' ? 'nail' : kind === 'pellet' || kind === 'ember' ? 'pellet' : kind === 'rivet' ? 'rivet' : kind === 'shard' ? 'shard' : 'parry');
    b.enableBody(true, x, y, true, true);
    b.body.setSize(4, 4, true); b.body.setAllowGravity(false);
    b.setRotation(ang); b.setVelocity(Math.cos(ang) * speed, Math.sin(ang) * speed);
    Object.assign(b, { kind, dmg, life, ang, px: x, py: y, bounces: 0, free: false });   // free: not fired by the player, so its hits don't count toward accuracy
    if (kind === 'ember') b.setTint(0xff9a30); else if (kind === 'tetherdart') b.setTint(0x80ffe0); else b.clearTint();
    return b;
  },
  spawnRocket(x, y, a) {
    const r = this.rockets.getFirstDead(false); if (!r) return;
    const W = TUNE.ROCKET;
    r.enableBody(true, x, y, true, true);
    r.body.setSize(6, 6, true); r.body.setAllowGravity(false);
    r.setRotation(a); r.setVelocity(Math.cos(a) * W.speed, Math.sin(a) * W.speed);
    Object.assign(r, { life: 3, px: x, py: y, ang: a });
    r.glow.setVisible(true).setPosition(x, y);
  },
  spawnShell() {
    const ca = Math.cos(this.aim);
    this.spawnGib('g_shell', this.shoulder.x - ca * 4, this.shoulder.y - 2, -this.facing * rand(40, 90), rand(-200, -140), 'shell');
  },
  killRocket(r) { r.disableBody(true, true); r.glow.setVisible(false); },
  enemyAt(x, y, pad = 0) {
    for (const e of this.enemies.getChildren()) {
      if (!e.alive) continue;
      const b = e.body;
      if (x >= b.left - pad && x <= b.right + pad && y >= b.top - pad && y <= b.bottom + pad) return e;
    }
    return null;
  },
  // Arc caster: continuous short-range beam that chains to nearby enemies (ignores riot shields).
  fireArc(now, ox, oy, a, blocked) {
    const W = TUNE.ARC, ca = Math.cos(a), sa = Math.sin(a);
    this.stats.shots++; this.arcActiveUntil = now + 120; this.recoil = 1;
    const sx = this.shoulder.x, sy = this.shoulder.y;                  // trace from the shoulder so huggers still get hit
    let ex = ox, ey = oy, hitE = null;
    for (let d = 0; d < W.range + 20; d += 3) {
      const x = sx + ca * d, y = sy + sa * d;
      if (this.solidAt(x, y)) break;
      ex = x; ey = y; hitE = this.enemyAt(x, y, 2);
      const keg = this.barrelList.find(k => k.active && Math.abs(k.x - x) < 6 && Math.abs(k.y - y) < 8);
      if (keg) { this.damageBarrel(keg, W.damage); break; }
      if (this.props && this.hitPropsAt(x, y, ca, sa)) break;
      if (hitE) break;
      const rh = this.ragdolls.length ? this.ragAt(x, y, 1) : null;
      if (rh) { this.hitRagdoll(rh.rd, x, y, W.damage, ca, sa, 'arc', rh.pi); break; }
    }
    const segs = [[ox, oy, ex, ey]];
    if (hitE) {
      this.stats.hits++;
      this.damageEnemy(hitE, W.damage, ca, sa, 'arc');
      const chained = [hitE]; let from = hitE;
      for (let c = 0; c < W.chain; c++) {
        let best = null, bd = W.chainRange;
        const fx = from.body.center.x, fy = from.body.center.y;
        for (const o of this.enemies.getChildren()) {
          if (!o.alive || chained.includes(o)) continue;
          const d = Math.hypot(o.body.center.x - fx, o.body.center.y - fy);
          if (d < bd && this.los(fx, fy, o.body.center.x, o.body.center.y)) { bd = d; best = o; }
        }
        if (!best) break;
        segs.push([fx, fy, best.body.center.x, best.body.center.y]);
        this.damageEnemy(best, W.damage * W.chainFactor, Math.sign(best.x - from.x) || 1, 0, 'arc');
        chained.push(best); from = best;
      }
    }
    if (Math.random() < 0.5) this.fxSparks(ex, ey, 2, a + Math.PI, 2, [40, 140]);
    if (Math.random() < 0.3) this.spawnLight(ex, ey, 'glow', 0x6ad0ff, 0.8, 1.3, 0.8, 0.08);
    if (this.waters.length) for (const [x0, y0, x1, y1] of segs) this.electrifyLine(x0, y0, x1, y1, 24);   // an arc that reaches a puddle lights it
    this.arcSegs = segs; this.arcUntil = now + 70;
    this.shake(30, 0.0008);
  },
  // Railgun: instant piercing slug. Everything on the line takes it; heads take double; shields don't help.
  fireRail(now, ox, oy, a, mx, my) {
    const W = TUNE.RAIL, ca = Math.cos(a), sa = Math.sin(a), hits = [], kegs = [], rhits = [], ptok = {};
    this.stats.shots++;
    let ex = ox, ey = oy;
    let pierced = 0;
    for (let d = 0; d < W.range; d += 3) {
      const x = this.shoulder.x + ca * d, y = this.shoulder.y + sa * d;
      if (this.solidAt(x, y)) {                                         // punches through up to 3 breakable tiles
        const tx = Math.floor(x / TS), ty = Math.floor(y / TS);
        if (pierced < 3 && this.breakable(tx, ty)) { pierced++; this.destroyTile(tx, ty, true); } else break;
      }
      ex = x; ey = y;
      for (const e of this.enemies.getChildren()) {
        if (!e.alive || hits.some(h => h.e === e)) continue;
        const b = e.body;
        if (x >= b.left - 1 && x <= b.right + 1 && y >= b.top - 1 && y <= b.bottom + 1) hits.push({ e, x, y });
      }
      for (const k of this.barrelList) if (k.active && !kegs.includes(k) && Math.abs(k.x - x) < 6 && Math.abs(k.y - y) < 8) kegs.push(k);
      const rh = this.ragdolls.length ? this.ragAt(x, y, 1) : null;
      if (rh && !rhits.some(h => h.rd === rh.rd)) rhits.push(rh);
      this.propHitAt(x, y, ca, sa, W.damage, ptok);
    }
    kegs.forEach(k => this.damageBarrel(k, W.damage));
    for (const h of rhits) { this.fxBlood(h.x, h.y, 8, a, 0.6, [120, 320]); this.hitRagdoll(h.rd, h.x, h.y, W.damage, ca, sa, 'rail', h.pi); }
    const killsBefore = this.stats.kills;
    if (hits.length) this.stats.hits++;
    for (const h of hits) {
      const hs = isHumanoid(h.e) && h.y < h.e.body.top + 5;
      if (h.e.def.headCrit && h.y < h.e.body.top + 12) h.e.dmgHead = true;
      this.fxBlood(h.x, h.y, 10, a, 0.6, [120, 320]);
      if (h.e.kind === 'bulwark' || h.e.kind === 'mirror') { h.e.ai = 'stagger'; h.e.aiUntil = now + 900; this.mirrorDamage(h.e, 50); }
      this.damageEnemy(h.e, W.damage * (hs ? TUNE.HEADSHOT : 1), ca, sa, 'rail', hs);
    }
    this.beams.push({ x0: ox, y0: oy, x1: ex, y1: ey, t: 0, dur: 0.4 });
    const len = Math.hypot(ex - ox, ey - oy);
    for (let d = 0; d < len; d += 4) {                              // spiral of motes along the beam
      const off = Math.sin(d * 0.3) * 4;
      this.fx.emit(ox + ca * d - sa * off, oy + sa * d + ca * off, { n: 1, speed: [2, 12], life: [0.35, 0.8], size: [2, 1], cols: [0xffffff, 0x9af0ff, 0x46b8f0, 0x2a6ad0], add: true, g: -8, drag: 1 });
    }
    this.fxSparks(ex, ey, 10, a + Math.PI, 1.8, [80, 260]);
    this.spawnLight(ex, ey, 'glow', 0x6ad0ff, 1.2, 2.4, 0.9, 0.2);
    this.spawnLight(mx, my, 'glow', 0x9af0ff, 1.6, 2.6, 1, 0.15);
    this.paintHole(ex + ca * 2, ey + sa * 2); this.paintScorch(ex + ca * 3, ey + sa * 3, 5);
    this.recoil = 6; Sfx.rail();
    this.player.body.velocity.x -= ca * 120;
    this.shake(140, 0.008); this.addKick(-ca * 8, -sa * 8); this.zoomPunch = Math.max(this.zoomPunch, 0.05);
    const k = this.stats.kills - killsBefore;
    if (k >= 2) BUS.emit('callout', k === 2 ? 'SKEWERED TWO!' : 'SHISH KEBAB!');
  },
  // Saw launcher: ricocheting blade that slices through everything it touches.
  spawnSaw(x, y, a) {
    const s = this.saws.getFirstDead(false); if (!s) return;
    const W = TUNE.SAW;
    s.enableBody(true, x, y, true, true); s.body.setAllowGravity(false); s.body.setSize(9, 9, true);
    s.setVelocity(Math.cos(a) * W.speed, Math.sin(a) * W.speed);
    Object.assign(s, { life: W.life, bounces: W.bounces, px: x, py: y, bloody: 0, hitMap: new Map() });
  },
  shieldBlocks(e, vx, y) { return (e.kind === 'bulwark' || e.kind === 'mirror') && e.shieldUp && Math.sign(vx) === -e.dir && y > e.body.top + 4; },
  onSawHit(s, e) {
    if (!s.active || !e.alive) return;
    const now = this.time.now;
    if ((s.hitMap.get(e) || 0) > now) return;
    s.hitMap.set(e, now + 250);
    const vx = s.body.velocity.x, vy = s.body.velocity.y, sp = Math.hypot(vx, vy) || 1;
    if (this.shieldBlocks(e, vx, s.y)) {                              // glances off the riot shield
      s.body.setVelocity(-vx * 0.9, vy - 80); this.fxSparks(s.x, s.y, 8, Math.atan2(-vy, -vx), 1.4, [80, 240]); Sfx.clang(); return;
    }
    const hs = isHumanoid(e) && s.y < e.body.top + 5;
    this.stats.hits++;
    this.fxBlood(s.x, s.y, 12, Math.atan2(vy, vx), 1.4, [80, 280]);
    this.damageEnemy(e, TUNE.SAW.damage * (hs ? TUNE.HEADSHOT : 1), vx / sp, vy / sp, 'saw', hs);
    s.body.setVelocity(vx * 0.88, vy * 0.88); s.bloody = 1;
    Sfx.squish();
  },
  sawShatter(s) {
    this.fxSparks(s.x, s.y, 10, 0, Math.PI * 2, [60, 200]);
    for (let i = 0; i < 3; i++) this.spawnGib(pick(['g_shard', 'g_shard2']), s.x, s.y, rand(-120, 120), rand(-200, -60), 'metal');
    Sfx.clang(0.7); s.disableBody(true, true);
  },

  // ------------------------------------------------------------ kick + parry ----
  // F / right-click: a short boot that launches enemies (into walls for a splat), breaks shield guard,
  // punts grenades, gibs and barrels, and parries enemy shots back as heavy golden slugs.
  bootKick(now) {
    const K = TUNE.KICK, p = this.player, f = this.facing;
    this.kickReady = now + K.cooldown * (this.perks.boots ? 0.7 : 1); this.kickUntil = now + 180;
    Sfx.whoosh(); this.addKick(f * 2, 0);
    if (this.reeledBy) this.breakHarpoon('SNAPPED!');                  // kick the chain to break free
    if (this.clawBy) this.clawRelease(this.clawBy, true);
    if (this.grabbedBy) this.grappleBreak(this.grabbedBy, 'BROKE FREE');
    this.shakeLeeches();
    const drop = now < this.dashUntil + 150, dk = (drop ? 1.7 : 1) * (this.perks.boots ? 2 : 1);   // kick out of a dash: DROPKICK
    const xa = p.x + f * 2, xb = p.x + f * (K.range + 2), xl = Math.min(xa, xb), xr = Math.max(xa, xb), yt = p.y - 14, yb = p.y + 12;
    const inBox = (x, y, pad) => x >= xl - pad && x <= xr + pad && y >= yt - pad && y <= yb + pad;
    let hit = false, hitE = false;
    for (const list of [this.ebulletList, this.boltList]) for (const b of list) {
      if (!b.active || !inBox(b.x, b.y, 10)) continue;
      const x = b.x, y = b.y; b.disableBody(true, true); this.parry(x, y); hit = true;
    }
    for (const e of this.enemies.getChildren()) {
      if (!e.alive || e.under) continue;
      const b = e.body;
      if (b.right < xl || b.left > xr || b.bottom < yt || b.top > yb) continue;
      hit = hitE = true;
      if (e.kind === 'buzzsaw') {                                       // boot the blade back: it's yours for a couple of seconds
        const a = this.aimMode === 'mouse' && this.aimPt ? Math.atan2(this.aimPt.y - b.center.y, this.aimPt.x - b.center.x) : (f > 0 ? -0.15 : Math.PI + 0.15), v = TUNE.BUZZSAW.speed * 1.9;   // from the blade toward the cursor
        b.setVelocity(Math.cos(a) * v, Math.sin(a) * v); e.owned = 2.2; e.ownHit = false; e.hitMap.clear();
        BUS.emit('callout', 'RETURNED!'); this.addStyle(50); Sfx.clang(); this.hitStop(70);
        this.spawnLight(b.center.x, b.center.y, 'ring', 0x46e6ff, 0.2, 1.2, 0.9, 0.2);
        continue;
      }
      if (this.canExecute(e)) { this.execute(e, f); continue; }        // glowing and nearly dead: the boot finishes it
      if (!e.def.anchored) {
        const kb = Math.max(0.3, e.def.kb);
        b.velocity.x = f * K.push * kb * (drop ? 1.3 : 1); b.velocity.y = -200 * kb; e.kickedT = 0.6; e.stunT = Math.max(e.stunT, 0.5);
        if (e.kind === 'bulwark' || e.kind === 'mirror') { e.ai = 'stagger'; e.aiUntil = now + 1100; e.shieldUp = false; }   // the boot breaks the guard
        if (e.kind === 'tick') e.armT = 0;                                                           // punt it at its friends instead
      }
      this.fxBlood(b.center.x, b.center.y, 6, f > 0 ? 0 : Math.PI, 1, [80, 220]);
      this.damageEnemy(e, K.damage * dk, f, -0.3, 'kick');
    }
    if (drop && hitE) { BUS.emit('callout', 'DROPKICK!'); this.addStyle(60); this.zoomPunch = Math.max(this.zoomPunch, 0.05); this.slowmoUntil = Math.max(this.slowmoUntil, now + 160); }
    for (const g of this.gibList) if (g.active && inBox(g.x, g.y, 4)) {
      g.body.velocity.x = f * rand(300, 480); g.body.velocity.y = -rand(150, 300); g.body.angularVelocity = rand(-900, 900);
      if (g.stuckT > 0) { g.stuckT = 0; g.body.setAllowGravity(true); }
    }
    for (const g of this.grenadeList) if (g.active && inBox(g.x, g.y, 6)) { g.body.velocity.x = f * 420; g.body.velocity.y = -180; hit = true; }
    for (const k of this.barrelList) if (k.active && inBox(k.x, k.y, 6)) { k.body.velocity.x = f * 380; k.body.velocity.y = -220; k.kicked = true; hit = true; }
    for (const c of this.chargeList) if (c.active && inBox(c.x, c.y, 6)) { c.body.velocity.x = f * 380; c.body.velocity.y = -230; c.kicked = true; hit = true; BUS.emit('callout', 'PUNTED'); }
    for (const k of this.canisterList) if (k.active && k.state === 'idle' && inBox(k.x, k.y, 6)) { this.igniteCanister(k, f > 0 ? -0.6 : Math.PI + 0.6); hit = true; }
    if (this.kickProps(inBox, f)) hit = true;
    for (const D of this.discs) if (!D.mine && inBox(D.x, D.y, 8)) { D.mine = true; D.st = 'back'; hit = true; BUS.emit('callout', 'RETURNED!'); this.addStyle(50); Sfx.clang(); this.hitStop(60); }
    for (const q of this.eprojList) {                                  // rockets and bombs go back where they came from
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
    for (const rd of this.ragdolls.slice()) {                          // punt corpses across the room
      if (!rd.pts.some(q => inBox(q.x, q.y, 3))) continue;
      for (const q of rd.pts) { q.vx = f * K.push * rand(0.55, 0.75); q.vy = -rand(170, 250); }
      const c = rd.pts[2]; hit = true;
      this.hitRagdoll(rd, c.x, c.y, 12, f, -0.3, 'kick', 2);
    }
    if (hit) { Sfx.kickHit(); this.hitStop(60); this.shake(100, 0.006); this.addStyle(15); }
  },
  parry(x, y) {
    const K = TUNE.KICK, now = this.time.now;
    let target = null, bd = 520;
    for (const e of this.enemies.getChildren()) {
      if (!e.alive) continue;
      const d = Math.hypot(e.body.center.x - x, e.body.center.y - y);
      if (d < bd && this.los(x, y, e.body.center.x, e.body.center.y)) { bd = d; target = e; }
    }
    const ang = target ? Math.atan2(target.body.center.y - y, target.body.center.x - x) : (this.facing > 0 ? 0 : Math.PI);
    this.spawnBullet('parry', x, y, ang, K.parrySpeed, K.parryDamage, 1.2);
    BUS.emit('callout', 'PARRY!'); BUS.emit('flash', 0.22);
    this.slowmoUntil = Math.max(this.slowmoUntil, now + 350); this.hitStop(90);
    this.spawnLight(x, y, 'glow', 0xffe14a, 1, 2.4, 1, 0.2); this.spawnLight(x, y, 'ring', 0xfff0a0, 0.2, 1, 0.9, 0.2);
    this.fxSparks(x, y, 12, ang, 1.2, [100, 300]);
    Sfx.clang(); Sfx.ding(); this.addStyle(90);
  },
  wallSplat(e) {
    const b = e.body, side = b.blocked.left ? -1 : 1, wx = side < 0 ? b.left - 1 : b.right + 1;
    e.kickedT = 0;
    this.paintSplat(wx, b.center.y, 9, false); this.paintSplat(wx, b.center.y - 4, 6, false);
    this.fxBlood(wx, b.center.y, 16, side < 0 ? 0 : Math.PI, 1.6, [60, 240]);
    Sfx.splatWall(); this.shake(140, 0.007); this.hitStop(50); this.addStyle(35);
    BUS.emit('callout', 'WALL SPLAT!'); if (++this.ms.splats >= 5) this.award('decor');
    this.damageEnemy(e, TUNE.KICK.wallSplat, -side, 0, 'kick');
  },

  // --------------------------------------------------------------- slag hose ----
  // Short cone of fire: sets enemies alight (damage over time, panicked running, spreads on contact).
  fireFlame(now, ox, oy, a) {
    const W = TUNE.FLAME, sx = this.shoulder.x, sy = this.shoulder.y, pvx = this.player.body.velocity.x * 0.5;
    this.flameActiveUntil = now + 100; this.stats.shots++; this.recoil = 1;
    for (let i = 0; i < 3; i++) this.fx.emit(ox, oy, { n: 1, angle: a, spread: W.cone * 2 * DEG, speed: [170, 240], life: [0.25, 0.42], size: [2, 7], cols: [0xffffff, 0xfff0a0, 0xffb040, 0xff6a1a, 0xc03010, 0x502820], add: true, drag: 1.5, g: -60, vx: pvx });
    this.fx.emit(ox, oy, { n: 1, angle: a, spread: 0.5, speed: [80, 140], life: [0.5, 0.9], size: [3, 9], cols: [0x6a5a50, 0x403530, 0x2a2420], alpha: [0.35, 0], g: -40, drag: 1.2 });
    if (Math.random() < 0.5) this.spawnLight(ox + Math.cos(a) * 30, oy + Math.sin(a) * 30, 'glow', 0xff8a30, 2.2, 2.8, 0.45, 0.1);
    const inCone = (x, y, extra) => {
      const d = Math.hypot(x - sx, y - sy); if (d > W.range + extra) return false;
      let da = Math.abs(Math.atan2(y - sy, x - sx) - a) % (Math.PI * 2); if (da > Math.PI) da = Math.PI * 2 - da;
      return (da <= (W.cone + 8) * DEG || d < 14) && this.los(sx, sy, x, y);
    };
    let hitAny = false;
    for (const e of this.enemies.getChildren()) {
      if (!e.alive || !inCone(e.body.center.x, e.body.center.y, e.body.halfWidth)) continue;
      hitAny = true; this.ignite(e, W.burn);
      this.damageEnemy(e, W.damage, Math.cos(a), Math.sin(a), 'flame');
    }
    for (const k of this.barrelList) if (k.active && inCone(k.x, k.y, 6)) this.igniteBarrel(k);
    this.heatProps(inCone, 1);
    for (const T of this.tars.slice()) if (inCone(T.x, T.y - 2, 4) || inCone(T.x - T.w / 2 + 3, T.y - 2, 4) || inCone(T.x + T.w / 2 - 3, T.y - 2, 4)) this.igniteTar(T);   // the hose lights tar
    for (const C of this.clouds.slice()) if (inCone(C.x, C.y, C.r * 0.7)) this.igniteCloud(C);                                     // ...and gas
    for (const rd of this.ragdolls.slice()) { const c = rd.pts[2]; if (inCone(c.x, c.y, 6)) { rd.burnT = Math.max(rd.burnT, W.burn); this.hitRagdoll(rd, c.x, c.y, W.damage, Math.cos(a), Math.sin(a), 'flame', 2); } }
    if (hitAny) this.stats.hits++;
    if (now > this.scorchT) {
      this.scorchT = now + 150;
      const h = this.sweep(sx, sy, sx + Math.cos(a) * W.range, sy + Math.sin(a) * W.range);
      if (h) this.paintScorch(h.x + Math.cos(a) * 3, h.y + Math.sin(a) * 3, 6);
    }
    this.shake(30, 0.0008);
  },
  ignite(e, t) {
    if (e.kind === 'pyro' || e.kind === 'scorcher' || e.kind === 'torcher' || e.kind === 'cinder' || e.def.molten || e.under) return;            // fireproof
    t *= e.def.burn ?? 1;
    if (e.burnT <= 0) {
      Sfx.ignite();
      if (!e.def.boss && !e.def.miniBoss && !['bulwark', 'rammer', 'brood', 'burrower', 'turret', 'mimic'].includes(e.kind) && !FLIERS.has(e.kind) && e.def.speed !== 0 && e.def.kb > 0) { e.panicT = 1.2; e.panicDir = Math.random() < 0.5 ? -1 : 1; }
    }
    e.burnT = Math.max(e.burnT, t);
  },

  // ------------------------------------------------------------- singularity ----
  // Slow orb that anchors on contact into a well: drags enemies, gibs (and a little of you) in, then implodes.
  spawnOrb(x, y, a) {
    const o = this.orbs.getFirstDead(false); if (!o) return;
    const W = TUNE.SING;
    o.enableBody(true, x, y, true, true); o.body.setAllowGravity(false); o.body.setSize(6, 6, true);
    o.setVelocity(Math.cos(a) * W.speed, Math.sin(a) * W.speed);
    Object.assign(o, { mode: 'fly', t: W.travel, px: x, py: y });
    o.glow.setVisible(true).setPosition(x, y).setScale(1).setAlpha(0.8); o.core.setVisible(false);
  },
  updateOrbs(dt, now) {
    const W = TUNE.SING;
    for (const o of this.orbList) {
      if (!o.active) continue;
      o.t -= dt;
      if (o.mode === 'fly') {
        const hit = this.sweep(o.px, o.py, o.x, o.y), hitE = this.enemyAt(o.x, o.y, 3);
        if (hit || hitE || o.t <= 0) {
          if (hit) o.body.reset(hit.x, hit.y);
          o.body.setVelocity(0, 0); o.mode = 'well'; o.t = W.well;
          o.core.setVisible(true).setPosition(o.x, o.y).setScale(0.3);
          Sfx.singOpen(); this.shake(120, 0.004);
        } else {
          this.fx.emit(o.x, o.y, { n: 1, speed: [0, 10], life: [0.2, 0.4], size: [3, 1], cols: [0xffffff, 0xd0a0ff, 0x7030d0], add: true });
          o.px = o.x; o.py = o.y;
        }
        o.glow.setPosition(o.x, o.y);
        continue;
      }
      const cx = o.x, cy = o.y, R = W.pull, k = 1 - o.t / W.well;
      o.core.setPosition(cx, cy).setScale(0.6 + k * 0.6 + Math.sin(now / 40) * 0.05).setRotation(now / 200);
      o.glow.setPosition(cx, cy).setScale(2.5 + Math.sin(now / 60) * 0.4).setAlpha(0.7);
      const pull = (b, str, cap) => {
        const dx = cx - b.center.x, dy = cy - b.center.y, d = Math.hypot(dx, dy);
        if (d > R || d < 3) return false;
        const f = (1 - d / R) * str * dt;
        b.velocity.x = clamp(b.velocity.x + dx / d * f, -cap, cap); b.velocity.y = clamp(b.velocity.y + dy / d * f, -cap, cap);
        return true;
      };
      for (const e of this.enemies.getChildren()) if (e.alive && pull(e.body, 1600 * Math.min(1, e.def.kb * 1.2), 280)) e.stunT = Math.max(e.stunT, 0.12);
      for (const g of this.gibList) if (g.active) {
        if (g.stuckT > 0 && Math.hypot(g.x - cx, g.y - cy) < R) { g.stuckT = 0; g.body.setAllowGravity(true); }
        pull(g.body, 2600, 420);
      }
      if (this.state !== 'dead') pull(this.player.body, 500, 200);
      for (const rd of this.ragdolls) for (const p of rd.pts) {             // corpses get dragged in by the limbs
        const dx = cx - p.x, dy = cy - p.y, d = Math.hypot(dx, dy);
        if (d > R || d < 3) continue;
        const f = (1 - d / R) * 2400 * dt; p.vx = clamp(p.vx + dx / d * f, -420, 420); p.vy = clamp(p.vy + dy / d * f, -420, 420); rd.asleep = false; rd.stillT = 0;
      }
      for (let i = 0; i < 3; i++) {                                      // spiral motes falling inward
        const th = rand(0, Math.PI * 2), r = rand(0.5, 1) * R * 0.8;
        this.fx.emit(cx + Math.cos(th) * r, cy + Math.sin(th) * r, { n: 1, speed: [0, 0], vx: -Math.sin(th) * 90 - Math.cos(th) * 70, vy: Math.cos(th) * 90 - Math.sin(th) * 70, life: [0.4, 0.7], size: [2, 1], cols: [0xffffff, 0xd0a0ff, 0x8040e0], add: true, drag: 0.5 });
      }
      if (o.t <= 0) {
        o.disableBody(true, true); o.core.setVisible(false); o.glow.setVisible(false);
        this.explode(cx, cy, TUNE.SING_BLAST);
        BUS.emit('flash', 0.2); this.zoomPunch = Math.max(this.zoomPunch, 0.07);
      }
    }
  },

  // ------------------------------------------------------------- cluster mortar ----
  clusterBurst(x, y, vx, vy) {                                          // airburst: scatters bomblets over everything below
    const C = TUNE.CLUSTER;
    this.explode(x, y, C.shell); Sfx.clusterPop();
    for (let i = 0; i < C.bomblets; i++) {
      const b = this.spawnGrenade(x, y, 0, 'bomb'); if (!b) break;
      b.setVelocity(vx * 0.6 + Math.sign(vx || 1) * rand(-50, 170), Math.min(vy * 0.3, 60) + rand(-200, -40));   // mostly forward, not back on you
    }
  },
  // -------------------------------------------------------------- stake driver ----
  // A heavy stake: kills that leave a body carry it (up to 2) and nail it to the next wall; tough targets
  // just eat it. Pinned bodies dangle from the wall until they're blown apart or the wall breaks.
  spawnStake(x, y, a) {
    const s = this.stakes.getFirstDead(false); if (!s) return;
    const W = TUNE.STAKE;
    s.enableBody(true, x, y, true, true); s.body.setAllowGravity(false); s.body.setSize(4, 4, true);
    s.setVelocity(Math.cos(a) * W.speed, Math.sin(a) * W.speed); s.setRotation(a);
    Object.assign(s, { life: W.life, px: x, py: y, carry: [], hits: new Set() });
  },
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
  },
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
  },

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
  },
  fizzleMine(m) { m.disableBody(true, true); m.glow.setVisible(false); this.fxSmoke(m.x, m.y, 3, 0.5); Sfx.clunk(0.5); },
  detonateMine(m) {
    const x = m.x, y = m.y; m.disableBody(true, true); m.glow.setVisible(false);
    this.explode(x, y, TUNE.MINE);
    BUS.emit('mines', TUNE.MINE.max - this.mineList.filter(q => q.active).length);
  },
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
        if (e && !e.def.anchored) {
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
  },

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
  },
  chill(e, amt) {
    if (e.frozen > 0) { e.frozen = Math.max(e.frozen, TUNE.CRYO.thaw * 0.6); return; }
    e.burnT = 0; e.panicT = 0;
    if (e.def.noFreeze) return;                                          // the wyrm runs too hot to freeze
    e.chill = Math.min(1, (e.chill || 0) + amt * (e.def.chill ?? 1) * (e.soakUntil > this.time.now ? TUNE.HYDRO.chill : 1));   // soaked: it freezes faster
    if (e.chill >= 1 && !e.def.chillOnly) this.freeze(e);
  },
  freeze(e) {
    e.frozen = TUNE.CRYO.thaw; e.chill = 1; e.fallV = 0; e.body.setAllowGravity(true); e.body.velocity.x *= 0.3;
    Sfx.freeze(); this.spawnLight(e.x, e.y, 'glow', 0xa0e0ff, 1, 2.2, 0.9, 0.2);
    this.fx.emit(e.x, e.y, { n: 14, speed: [30, 120], life: [0.3, 0.6], size: [2, 1], cols: [0xffffff, 0xc8f0ff, 0x80c8f0], add: true, drag: 2 });
    this.addStyle(20);
  },
  thaw(e) {
    e.frozen = 0; e.chill = 0.4;
    if (FLIERS.has(e.kind)) e.body.setAllowGravity(false);
    Sfx.crack(); this.fx.emit(e.x, e.y, { n: 8, speed: [20, 90], life: [0.3, 0.6], size: [2, 1], cols: [0xffffff, 0xc8f0ff], g: 300, mode: 1 });
  },
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
  },

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
  },
  updateSentry(dt, now) {
    const S = this.sentry, T = TUNE.SENTRY; if (!S) return;
    S.t -= dt;
    if (S.offUntil > now) { if (Math.random() < 0.3) this.fxSparks(S.x, S.y - 12, 1, 0, Math.PI * 2, [30, 90]); return; }   // shorted out by a jammer
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
  },
  killSentry() {
    const S = this.sentry; if (!S) return;
    this.sentry = null; this.sentryReadyAt = this.time.now + TUNE.SENTRY.recharge * 1000;
    const x = S.x, y = S.y - 8;
    S.base.destroy(); S.head.destroy(); S.glow.destroy();
    for (let i = 0; i < 6; i++) this.spawnGib(pick(['g_shard', 'g_shard2', 'g_plate', 'g_wire']), x, y, rand(-200, 200), rand(-300, -100), 'metal');
    this.boomFx(x, y, 0.55);                                              // just a pop: it's ours, no damage
  },
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
  },

  // --------------------------------------------------------------- grapple hook ----
  // C: chain hook. Light enemies (and corpses, and gas cans) get reeled in to point-blank; walls and anything
  // too big to move reel YOU in instead. Press C again to let go mid-haul.
  fireHook(now) {
    if (this.hook || now < this.hookReady || this.state === 'dead') return;
    const H = TUNE.HOOK, a = this.aim;
    this.hook = { x: this.shoulder.x, y: this.shoulder.y, vx: Math.cos(a) * H.speed, vy: Math.sin(a) * H.speed, state: 'fly', t: 0 };
    Sfx.hookFire(); this.recoil = 2;
  },
  endHook() { this.hook = null; this.hookReady = this.time.now + TUNE.HOOK.cooldown; },
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
          if (e.def.kb < 0.45 || e.def.boss || e.def.miniBoss || e.kind === 'brood') { k.state = 'zip'; k.t = 0; k.follow = e; }   // too big: you go to it
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
  },
  // ------------------------------------------------------------------ waves ----
  // =============================================================== overdrive round ====
  // ----------------------------------------------------------------------- dash ----
  startDash(now, dx, dy, onGround) {
    const T = TUNE.DASH, p = this.player, b = p.body;
    let ax = dx, ay = onGround && dy > 0 ? 0 : dy;
    if (!ax && !ay) ax = this.facing;
    const L = Math.hypot(ax, ay) || 1; ax /= L; ay /= L;
    this.dashVx = ax * T.speed; this.dashVy = ay * T.speed * 0.85;
    this.dashUntil = now + T.time * 1000; this.dashReady = now + T.cd * 1000 * (this.perks.burner ? 0.6 : 1); this.dashIUntil = now + T.iframes * 1000;
    this.dashing = true; this.dashDodged = false; this.dashGhostT = 0; if (!onGround) this.dashAir = false;
    b.setAllowGravity(false); this.jumpCuttable = false; this.jumpBuffer = -1e9;
    this.squash(ax ? 1.35 : 0.75, ax ? 0.75 : 1.35);
    if (onGround) this.fxDust(p.x, b.bottom, 6);
    this.spawnLight(p.x, p.y, 'ring', 0x46e6ff, 0.15, 0.8, 0.8, 0.16);
    this.addKick(-ax * 3, -ay * 3); this.shake(50, 0.0015);
    Sfx.dash();
    if (this.reeledBy) this.breakHarpoon('BROKE FREE');
    if (this.clawBy) this.clawRelease(this.clawBy, true);
    if (this.grabbedBy) this.grappleBreak(this.grabbedBy, 'BROKE FREE');
    this.shakeLeeches();
  },
  dashDodge() {                                                         // something hostile went through you mid-dash
    if (this.dashDodged) return;
    this.dashDodged = true; this.addStyle(30); Sfx.dodge(); this.stats.dodges++; if (this.stats.dodges >= 10) this.award('ghost');
    this.spawnLight(this.player.x, this.player.y, 'ring', 0x9af0ff, 0.3, 1.2, 0.9, 0.2);
  },

  // ----------------------------------------------------------------- ripper ----
  // Held chain blade: 18 bites/s at arm's length. Pins what it chews, shreds corpses, cuts crates, eats enemy
  // shots and grinds through riot shields. Kills with it heal you.
  fireRipper(now, a, ca, sa) {
    const W = TUNE.RIPPER, sx = this.shoulder.x, sy = this.shoulder.y;
    const x0 = sx + ca * 12, y0 = sy + sa * 12, x1 = sx + ca * (12 + W.reach), y1 = sy + sa * (12 + W.reach);
    this.ripperUntil = now + 120;
    let bit = false, meat = false;
    for (const e of this.enemies.getChildren()) {
      if (!e.alive || e.under) continue;
      const bb = e.body, [d, t] = this.segDist(bb.center.x, bb.center.y, x0, y0, x1, y1);
      if (d > W.half + Math.min(bb.halfWidth, bb.halfHeight)) continue;
      const hx = x0 + (x1 - x0) * t, hy = y0 + (y1 - y0) * t;
      bit = true;
      if (this.shieldBlocks(e, ca, hy)) {                                 // grinds through a riot shield in about half a second
        this.fxSparks(hx, hy, 4, a + Math.PI, 1.4, [80, 220]); Sfx.clang(0.35);
        if ((e.grind = (e.grind || 0) + 1) >= 10) { e.grind = 0; e.shieldUp = false; e.ai = 'stagger'; e.aiUntil = now + 1100; BUS.emit('callout', 'GUARD SHREDDED'); this.addStyle(40); }
        continue;
      }
      meat = true;
      const hs = isHumanoid(e) && hy < bb.top + 5;
      e.stunT = Math.max(e.stunT, 0.16); bb.velocity.x *= 0.25; bb.velocity.y = FLIERS.has(e.kind) ? bb.velocity.y * 0.3 : Math.min(bb.velocity.y, 20);   // it holds them on the blade
      if (e.def.molten) this.fx.emit(hx, hy, { n: 3, angle: a + rand(-0.7, 0.7), spread: 0.6, speed: [80, 220], life: [0.2, 0.5], size: [2, 1], cols: [0xffffff, 0xffe080, 0xff8a20], add: true, g: 500, mode: 1 });
      else {
        this.fxBlood(hx, hy, 4, a + rand(-0.7, 0.7), 0.7, [120, 300]); this.fxBlood(hx, hy, 2, a + Math.PI + rand(-0.9, 0.9), 0.9, [60, 170]);
        if (Math.random() < 0.25) this.paintSplatAround(hx, hy, 3);
      }
      this.stats.shots++; this.stats.hits++;                             // only bites count, so it never drags accuracy down
      this.damageEnemy(e, W.damage * (hs ? 1.5 : 1), ca, sa, 'ripper', hs);
    }
    for (const [qx, qy] of [[x1 - ca * 7, y1 - sa * 7], [x1, y1]]) {    // corpses get shredded where they lie
      const h = this.ragdolls.length ? this.ragAt(qx, qy, 3) : null;
      if (!h) continue;
      meat = bit = true;
      for (const pt of h.rd.pts) { pt.vx *= 0.5; pt.vy = Math.min(pt.vy, 30); }
      this.hitRagdoll(h.rd, h.x, h.y, 7, ca, sa, 'kick', h.pi); this.fxBlood(h.x, h.y, 3, a + rand(-0.6, 0.6), 0.8, [100, 260]);
    }
    for (const g of this.gibList) if (g.active && Math.abs(g.x - x1) < 8 && Math.abs(g.y - y1) < 8) {
      g.body.velocity.x = ca * rand(200, 360) + rand(-60, 60); g.body.velocity.y = sa * 200 - rand(120, 260); g.body.angularVelocity = rand(-1200, 1200);
      if (g.stuckT > 0) { g.stuckT = 0; g.body.setAllowGravity(true); }
    }
    const tx = Math.floor(x1 / TS), ty = Math.floor(y1 / TS);
    if (TILE_HP[this.tileAt(tx, ty)]) { this.damageTile(tx, ty, W.tile); bit = true; this.fxSparks(x1, y1, 3, a + Math.PI, 1.6, [60, 200]); this.fx.emit(x1, y1, { n: 2, speed: [40, 120], life: [0.3, 0.6], size: [2, 1], cols: [0x9a5e2e, 0x6e4222], g: 500, mode: 1 }); }
    else if (this.solidAt(x1, y1)) { bit = true; this.fxSparks(x1, y1, 5, a + Math.PI, 1.6, [80, 260]); if (Math.random() < 0.4) Sfx.clang(0.25); }
    for (const list of [this.ebulletList, this.boltList]) for (const b of list) {     // the blade eats incoming fire
      if (!b.active || this.segDist(b.x, b.y, x0, y0, x1, y1)[0] > W.half + 3) continue;
      const x = b.x, y = b.y; b.disableBody(true, true); this.fxSparks(x, y, 6, a, 1.4, [80, 240]); Sfx.tink(0.8); this.addStyle(8);
    }
    this.propHitAt(x1, y1, ca, sa);
    if (meat) { this.ripperBiteUntil = now + 120; if (++this.ripN % 3 === 0) this.hitStop(16); this.shake(70, 0.004); this.addKick(rand(-1.2, 1.2), rand(-1.2, 1.2)); this.recoil = rand(1.5, 3.5); }
    else if (bit) { this.ripperBiteUntil = now + 80; this.shake(50, 0.002); this.recoil = rand(1, 2.5); }
    else this.recoil = rand(0, 1);
    if (Math.random() < 0.5) this.fx.emit(x1, y1, { n: 1, angle: a + (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2, spread: 0.6, speed: [60, 160], life: [0.08, 0.2], size: [2, 1], cols: [0xffffff, 0xffe46a, 0xff8a1f], add: true, g: 300 });
  },

  // ------------------------------------------------------------- hornet pod ----
  // Hold to paint up to 6 locks (up to 3 on one target) near the crosshair, release to launch one seeker per
  // lock. A tap with nothing locked dumb-fires two.
  hornetTrigger(trig, now) {
    const T = TUNE.HORNET;
    this.locks = this.locks.filter(e => e.alive && !e.under);
    if (trig && now >= this.nextFire) {
      if (!this.hornetHeld) { this.hornetHeld = true; this.lockT = now + 60; }
      if (this.locks.length < T.maxLocks && now >= this.lockT) {
        const t = this.pickLockTarget();
        if (t) { this.locks.push(t); t.lockT = now; this.lockT = now + T.lockMs; Sfx.lockOn(this.locks.length); }
        else this.lockT = now + 50;
      }
    } else if (this.hornetHeld) { this.hornetHeld = false; this.launchHornets(now); }
  },
  hornetAim() {
    const mouse = this.aimMode === 'mouse' && this.aimPt;
    return mouse ? { x: this.aimPt.x, y: this.aimPt.y, r: TUNE.HORNET.lockRadius } : { x: this.shoulder.x + Math.cos(this.aim) * 150, y: this.shoulder.y + Math.sin(this.aim) * 150, r: 150 };
  },
  pickLockTarget() {
    const T = TUNE.HORNET, sx = this.shoulder.x, sy = this.shoulder.y, A = this.hornetAim();
    let best = null, bs = 1e9;
    for (const e of this.enemies.getChildren()) {
      if (!e.alive || e.under) continue;
      const c = e.body.center, n = this.locks.filter(o => o === e).length;
      if (n >= T.perTarget || Math.hypot(c.x - sx, c.y - sy) > T.lockRange) continue;
      const d = Math.hypot(c.x - A.x, c.y - A.y);
      if (d > A.r + Math.max(e.body.halfWidth, e.body.halfHeight) || !this.los(sx, sy, c.x, c.y)) continue;
      const s = d + n * 45; if (s < bs) { bs = s; best = e; }
    }
    return best;
  },
  launchHornets(now) {
    const T = TUNE.HORNET, targets = this.locks.length ? this.locks.slice() : [null, null];
    this.locks = [];
    this.nextFire = now + T.cooldown * (now < this.rampageUntil ? TUNE.RAMPAGE.fire : 1); this.lastShotT = now;
    this.makeNoise(this.player.x, this.player.y, 270, true);
    targets.forEach((tg, i) => this.time.delayedCall(i * 60, () => { if (this.state !== 'dead') this.spawnHornet(tg, i); }));
  },
  spawnHornet(tg, i) {
    const h = this.hornetList.find(o => !o.on); if (!h) return;
    const T = TUNE.HORNET, G = GUNS.hornet, a = this.aim, ca = Math.cos(a), sa = Math.sin(a);
    let x = this.shoulder.x + ca * G.muzzle, y = this.shoulder.y + sa * G.muzzle;
    if (this.solidAt(x, y) || !this.los(this.shoulder.x, this.shoulder.y, x, y)) { x = this.shoulder.x; y = this.shoulder.y; }
    const fan = (i % 2 ? 1 : -1) * (0.12 + 0.1 * (i >> 1)), lift = tg ? (ca >= 0 ? -0.45 : 0.45) : 0;   // pop up and fan out, then curl onto their marks
    Object.assign(h, { on: true, x, y, ang: a + lift + fan + rand(-0.06, 0.06), spd: T.speed, target: tg, life: T.life, age: 0, seed: rand(0, 6) });
    h.setVisible(true).setPosition(x, y).setRotation(h.ang); h.glow.setVisible(true).setPosition(x, y);
    this.stats.shots++;
    this.recoil = 3; Sfx.hornet();
    this.muzzle(x, y, a, 0.7, 40); this.fxSmoke(x, y, 2, 0.6);
    this.shake(40, 0.0018); this.addKick(-ca * 1.5, -sa * 1.5);
  },
  updateHornets(dt) {
    const T = TUNE.HORNET;
    for (const h of this.hornetList) {
      if (!h.on) continue;
      h.life -= dt; h.age += dt;
      const tg = h.target && h.target.alive && !h.target.under ? h.target : null;
      if (tg && h.age > 0.1) {
        let da = Math.atan2(tg.body.center.y - h.y, tg.body.center.x - h.x) - h.ang;
        while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
        h.ang += clamp(da, -T.turn * dt, T.turn * dt);
      } else h.ang += Math.sin(h.age * 13 + h.seed) * dt * 1.4;             // dumb-fire wobble
      h.spd = Math.min(T.top, h.spd + T.accel * dt);
      const ca = Math.cos(h.ang), sa = Math.sin(h.ang), nx = h.x + ca * h.spd * dt, ny = h.y + sa * h.spd * dt;
      const hit = this.sweep(h.x, h.y, nx, ny);
      if (hit || h.life <= 0) { this.hornetBoom(h, hit ? hit.x : nx, hit ? hit.y : ny); continue; }
      h.x = nx; h.y = ny;
      if (this.enemyAt(h.x, h.y, 2) || this.propHitAt(h.x, h.y, ca, sa) || (this.ragdolls.length && this.ragAt(h.x, h.y, 1))) { this.hornetBoom(h, h.x, h.y); continue; }
      h.setPosition(Math.round(h.x), Math.round(h.y)).setRotation(h.ang); h.glow.setPosition(h.x - ca * 4, h.y - sa * 4).setAlpha(0.5 + Math.random() * 0.3);
      this.fx.emit(h.x - ca * 4, h.y - sa * 4, { n: 1, speed: [4, 14], life: [0.25, 0.5], size: [2, 4], cols: [0x9a9590, 0x6a6560, 0x4a4846], alpha: [0.45, 0], g: -20, drag: 2 });
      this.fx.emit(h.x - ca * 4, h.y - sa * 4, { n: 1, angle: h.ang + Math.PI, spread: 0.5, speed: [20, 60], life: [0.05, 0.12], size: [2, 1], cols: [0xffffff, 0xffe46a, 0xff8a1f], add: true });
    }
  },
  hornetBoom(h, x, y) { h.on = false; h.setVisible(false); h.glow.setVisible(false); this.explode(x, y, TUNE.HORNET.blast); },

  // ------------------------------------------------------------- magma lance ----
  // Hold to charge (1 s), release: a molten beam that pierces everything, bores through up to 5 breakable tiles,
  // sets things alight and kicks you back hard (aim down to lance-jump). A full charge bursts where it lands;
  // hold a full charge past 2.2 s and it vents on its own and scalds you.
  lanceTrigger(trig, now, dt) {
    const T = TUNE.LANCE;
    if (trig && now >= this.nextFire) {
      if (!this.lanceOn) { this.lanceOn = true; this.lanceCharge = 0; this.lanceFullT = 0; }
      this.lanceCharge = Math.min(1, this.lanceCharge + dt / (T.charge * (now < this.rampageUntil ? TUNE.RAMPAGE.fire : 1)));
      const G = GUNS.lance, ca = Math.cos(this.aim), sa = Math.sin(this.aim), mx = this.shoulder.x + ca * G.muzzle, my = this.shoulder.y + sa * G.muzzle;
      if ((this.lanceFxT -= dt) <= 0) {                                 // heat pulls in to the emitter
        this.lanceFxT = 0.03;
        const th = rand(0, Math.PI * 2), r = rand(10, 18);
        this.fx.emit(mx + Math.cos(th) * r, my + Math.sin(th) * r, { n: 1, angle: th + Math.PI, spread: 0.1, speed: [r * 5, r * 6], life: [0.14, 0.18], size: [2, 1], cols: [0xffe080, 0xffa030, 0xff5a1a], add: true });
      }
      if (this.lanceCharge >= 1) {
        this.lanceFullT += dt; this.recoil = rand(0, 1.5);
        if (Math.random() < 0.3) this.fx.emit(mx, my, { n: 1, angle: -Math.PI / 2, spread: 1.2, speed: [20, 60], life: [0.3, 0.6], size: [3, 1], cols: [0xffffff, 0xffe080, 0xff8a20], add: true, g: -60 });
        if (this.lanceFullT > T.vent) this.fireLance(now, 1, true);
      }
    } else if (this.lanceOn) this.fireLance(now, this.lanceCharge, false);
  },
  fireLance(now, c, vented) {
    const T = TUNE.LANCE, G = GUNS.lance, a = this.aim, ca = Math.cos(a), sa = Math.sin(a);
    this.lanceOn = false; this.lanceCharge = 0; this.lanceFullT = 0;
    this.nextFire = now + T.cooldown; this.lastShotT = now; this.stats.shots++;
    this.makeNoise(this.player.x, this.player.y, 300, true);
    const pw = Math.pow(c, 1.25), dmg = T.minDamage + (T.maxDamage - T.minDamage) * pw, half = 2 + 5 * c, bore = Math.round(T.bore * c);
    const sx = this.shoulder.x, sy = this.shoulder.y, mx = sx + ca * G.muzzle, my = sy + sa * G.muzzle;
    const hits = new Map(), rhits = [], kegs = new Set();
    let ex = sx, ey = sy, bored = 0;
    for (let d = 0; d < T.range; d += 3) {
      const x = sx + ca * d, y = sy + sa * d;
      if (this.solidAt(x, y)) {
        const tx = Math.floor(x / TS), ty = Math.floor(y / TS);
        if (bored < bore && this.breakable(tx, ty)) { bored++; this.destroyTile(tx, ty, true); } else break;
      }
      ex = x; ey = y;
      if (d < 8) continue;
      for (const e of this.enemies.getChildren()) {
        if (!e.alive || e.under || hits.has(e)) continue;
        const b = e.body;
        if (x >= b.left - half && x <= b.right + half && y >= b.top - half && y <= b.bottom + half) hits.set(e, { x, y });
      }
      for (const k of this.barrelList) if (k.active && Math.abs(k.x - x) < 5 + half && Math.abs(k.y - y) < 7 + half) kegs.add(k);
      const rh = this.ragdolls.length ? this.ragAt(x, y, half) : null;
      if (rh && !rhits.some(q => q.rd === rh.rd)) rhits.push(rh);
      this.propHitAt(x, y, ca, sa);
    }
    const killsBefore = this.stats.kills;
    if (hits.size) this.stats.hits++;
    for (const [e, h] of hits) {
      const hs = isHumanoid(e) && h.y < e.body.top + 5;
      if (e.def.headCrit && h.y < e.body.top + 12) e.dmgHead = true;
      if (e.kind === 'bulwark' || e.kind === 'mirror') { e.ai = 'stagger'; e.aiUntil = now + 900; this.mirrorDamage(e, dmg * 0.6); }
      this.ignite(e, T.burn * Math.max(0.4, c));
      this.fx.emit(h.x, h.y, { n: 8, angle: a, spread: 0.8, speed: [80, 260], life: [0.3, 0.6], size: [2, 1], cols: [0xffffff, 0xffe080, 0xff8a20], add: true, g: 300, mode: 1 });
      if (!e.def.molten) this.fxBlood(h.x, h.y, 8, a, 0.6, [120, 320]);
      this.damageEnemy(e, dmg * (hs ? 1.5 : 1), ca, sa, 'lance', hs);
    }
    kegs.forEach(k => this.damageBarrel(k, dmg));
    for (const h of rhits) { h.rd.burnT = Math.max(h.rd.burnT || 0, 2); this.hitRagdoll(h.rd, h.x, h.y, dmg, ca, sa, 'rail', h.pi); }
    this.beams.push({ x0: mx, y0: my, x1: ex, y1: ey, t: 0, dur: 0.22 + 0.3 * c, col: 'lance', w: half });
    const len = Math.hypot(ex - mx, ey - my), stepD = 7 - 3 * c;
    for (let d = 0; d < len; d += stepD) this.fx.emit(mx + ca * d + rand(-half, half) * 0.5, my + sa * d + rand(-half, half) * 0.5, { n: 1, speed: [5, 30], life: [0.4, 0.9], size: [2, 1], cols: [0xffe080, 0xffa030, 0xff5a1a, 0xa02008], add: true, g: 380, mode: 1, drag: 0.5 });   // dripping slag
    this.fxSparks(ex, ey, Math.round(6 + 10 * c), a + Math.PI, 1.8, [80, 280]);
    this.spawnLight(ex, ey, 'glow', 0xff8a20, 1 + c, 2.4 + 2 * c, 0.9, 0.25);
    this.spawnLight(mx, my, 'glow', 0xffd070, 1.4 + c, 3 + 2 * c, 1, 0.18);
    this.paintScorch(ex + ca * 3, ey + sa * 3, Math.round(4 + 6 * c));
    if (c > 0.85) this.time.delayedCall(30, () => this.explode(ex, ey, T.burst));        // a full charge bursts where it lands
    const pb = this.player.body, rec = T.recoil * (0.25 + 0.75 * c);
    pb.velocity.x -= ca * rec;
    if (!pb.blocked.down || sa > 0.3) { pb.velocity.y = Math.max(-T.recoil, pb.velocity.y - sa * rec * 0.8); this.lastGround = -1e9; this.jumpCuttable = false; }
    this.recoil = 4 + 6 * c; Sfx.lanceFire(c);
    this.shake(120 + 160 * c, 0.004 + 0.01 * c); this.addKick(-ca * (4 + 8 * c), -sa * (4 + 8 * c));
    this.zoomPunch = Math.max(this.zoomPunch, 0.03 + 0.06 * c); this.hitStop(20 + 50 * c); this.warpPulse(0.03 + 0.09 * c);
    if (c > 0.6) BUS.emit('flash', 0.1 + 0.18 * c);
    if (vented) { this.hurtPlayer(T.ventDmg, this.player.x, { knock: false, iframes: false, self: true }); BUS.emit('callout', 'LANCE VENTED'); }
    const k = this.stats.kills - killsBefore;
    if (k >= 2) BUS.emit('callout', k === 2 ? 'MELTED TWO!' : 'SLAG KEBAB!');
  },

  // ----------------------------------------------------------------- glaive ----
  // Thrown hooked ring: cuts on the way out and on the way back, and you catch it to throw again at once.
  // Hold fire and it stops at the end of its throw and grinds in place (steer it with the mouse) for up to 2.4 s.
  throwGlaive(now) {
    const T = TUNE.GLAIVE, G = GUNS.glaive, g = this.glaive, a = this.aim, ca = Math.cos(a), sa = Math.sin(a);
    let x = this.shoulder.x + ca * G.muzzle, y = this.shoulder.y + sa * G.muzzle;
    if (this.solidAt(x, y) || !this.los(this.shoulder.x, this.shoulder.y, x, y)) { x = this.shoulder.x; y = this.shoulder.y; }
    Object.assign(g, { on: true, x, y, vx: ca * T.speed, vy: sa * T.speed, state: 'out', dist: 0, bsp: 0, hoverT: T.hover, trailT: 0, whirT: 0 });
    g.hits.clear();
    this.nextFire = now + T.cooldown; this.lastShotT = now; this.stats.shots++;
    this.makeNoise(this.player.x, this.player.y, 210, true);
    this.recoil = 3; Sfx.glaive();
    this.fxSparks(x, y, 4, a, 0.8, [60, 180]); this.spawnLight(x, y, 'glow', 0x46e6ff, 0.8, 1.6, 0.8, 0.12);
    this.shake(40, 0.0015); this.addKick(-ca * 1.5, -sa * 1.5);
    this.glaiveImg.setVisible(true).setPosition(x, y); this.glaiveGlow.setVisible(true);
  },
  updateGlaive(dt, now) {
    const g = this.glaive, T = TUNE.GLAIVE;
    if (!g.on) return;
    if (this.state === 'dead') { g.on = false; this.glaiveImg.setVisible(false); this.glaiveGlow.setVisible(false); return; }
    const pb = this.player.body, px = pb.center.x, py = pb.center.y - 2;
    g.spin += dt * (g.state === 'hover' ? 40 : 26);
    if (g.state === 'out') {
      const f = Math.max(0.12, 1 - Math.pow(g.dist / T.range, 2)), nx = g.x + g.vx * f * dt, ny = g.y + g.vy * f * dt;
      g.dist += Math.hypot(nx - g.x, ny - g.y);
      const hit = this.sweep(g.x, g.y, nx, ny);
      if (hit) {
        g.x = hit.x; g.y = hit.y;
        const tx = Math.floor(nx / TS), ty = Math.floor(ny / TS);
        if (TILE_HP[this.tileAt(tx, ty)]) this.damageTile(tx, ty, 20);
        this.fxSparks(g.x, g.y, 8, Math.atan2(-g.vy, -g.vx), 1.6, [80, 240]); Sfx.clang(0.5); this.shake(40, 0.002);
        g.state = this.glaiveHold ? 'hover' : 'back'; g.hoverT = T.hover;  // bites into the wall if you're still holding
      } else { g.x = nx; g.y = ny; }
      if (g.state === 'out' && g.dist >= T.range) { g.state = this.glaiveHold ? 'hover' : 'back'; g.hoverT = T.hover; }
    } else if (g.state === 'hover') {
      g.hoverT -= dt;
      if (!this.glaiveHold || g.hoverT <= 0) g.state = 'back';
      if ((g.tileT = (g.tileT || 0) - dt) <= 0) {                        // chews through crates and girders it's pressed against
        g.tileT = T.grindMs / 1000;
        for (const [ox, oy] of [[(Math.sign(g.vx) || 1) * 7, 0], [0, 7], [0, -7]]) {
          const tx = Math.floor((g.x + ox) / TS), ty = Math.floor((g.y + oy) / TS);
          if (TILE_HP[this.tileAt(tx, ty)]) { this.damageTile(tx, ty, 8); this.fxSparks(g.x + ox, g.y + oy, 2, Math.atan2(-oy, -ox), 1.2, [40, 140]); break; }
        }
      }
      else if (this.aimMode === 'mouse' && this.aimPt) {                 // steer it toward the cursor while it grinds
        const dx = clamp(this.aimPt.x - g.x, -70 * dt, 70 * dt), dy = clamp(this.aimPt.y - g.y, -70 * dt, 70 * dt);
        if (!this.solidAt(g.x + dx, g.y + dy)) { g.x += dx; g.y += dy; }
      }
    } else {
      const dx = px - g.x, dy = py - g.y, d = Math.hypot(dx, dy) || 1;
      g.bsp = Math.min(T.back, g.bsp + 1100 * dt);
      const step = Math.min(d, g.bsp * dt);
      g.x += dx / d * step; g.y += dy / d * step; g.vx = dx / d * g.bsp; g.vy = dy / d * g.bsp;
      if (this.solidAt(g.x, g.y) && Math.random() < 0.4) this.fxSparks(g.x, g.y, 1, Math.atan2(dy, dx) + Math.PI, 1, [40, 120]);   // recalled straight through walls
      if (d < 12) {                                                      // caught: ready to throw again at once
        g.on = false; this.glaiveImg.setVisible(false); this.glaiveGlow.setVisible(false);
        this.nextFire = Math.min(this.nextFire, now + 60);
        this.recoil = 3; Sfx.glaiveCatch(); this.shake(40, 0.0015);
        this.spawnLight(px, py - 2, 'ring', 0x46e6ff, 0.15, 0.6, 0.7, 0.14);
        return;
      }
    }
    const grind = g.state === 'hover', rr = 8, sp = Math.hypot(g.vx, g.vy) || 1;
    for (const e of this.enemies.getChildren()) {
      if (!e.alive || e.under) continue;
      const b = e.body;
      if (g.x < b.left - rr || g.x > b.right + rr || g.y < b.top - rr || g.y > b.bottom + rr || (g.hits.get(e) || 0) > now) continue;
      g.hits.set(e, now + (grind ? T.grindMs : 280));
      const ix = g.state === 'back' ? Math.sign(px - g.x) || 1 : Math.sign(g.vx) || 1, hs = isHumanoid(e) && g.y < b.top + 5;
      if (!grind && this.shieldBlocks(e, ix, g.y)) { this.fxSparks(g.x, g.y, 6, ix > 0 ? Math.PI : 0, 1.2); Sfx.clang(0.5); if (g.state === 'out') g.state = 'back'; continue; }
      this.stats.hits++;
      if (e.def.molten) this.fxSparks(g.x, g.y, 4); else this.fxBlood(g.x, g.y, grind ? 3 : 8, Math.atan2(g.vy, g.vx), 1.6, [60, 240]);
      this.damageEnemy(e, (grind ? T.grind : T.damage) * (hs ? TUNE.HEADSHOT : 1), ix, 0, 'glaive', hs);
      if (g.state === 'out') { g.vx *= 0.85; g.vy *= 0.85; }
      Sfx.squish();
    }
    const rh = this.ragdolls.length ? this.ragAt(g.x, g.y, 4) : null;
    if (rh && (g.hits.get(rh.rd) || 0) <= now) { g.hits.set(rh.rd, now + (grind ? T.grindMs : 250)); this.hitRagdoll(rh.rd, g.x, g.y, grind ? T.grind : T.damage, g.vx / sp, -0.2, 'saw', rh.pi); }
    for (const list of [this.ebulletList, this.boltList]) for (const b of list) if (b.active && Math.abs(b.x - g.x) < 8 && Math.abs(b.y - g.y) < 8) { const x = b.x, y = b.y; b.disableBody(true, true); this.fxSparks(x, y, 5); Sfx.tink(0.7); this.addStyle(8); }
    this.propHitAt(g.x, g.y, g.vx / sp, g.vy / sp);
    for (const gb of this.gibList) if (gb.active && Math.abs(gb.x - g.x) < 7 && Math.abs(gb.y - g.y) < 7) { gb.body.velocity.x = g.vx * 0.5 + rand(-80, 80); gb.body.velocity.y = -rand(100, 220); gb.body.angularVelocity = rand(-1200, 1200); }
    this.glaiveImg.setPosition(Math.round(g.x), Math.round(g.y)).setRotation(g.spin);
    this.glaiveGlow.setPosition(g.x, g.y).setScale(grind ? 1.1 + Math.random() * 0.2 : 0.8);
    if ((g.trailT -= dt) <= 0) { g.trailT = 0.03; this.spawnLight(g.x, g.y, 'glaive', 0x46e6ff, 1, 0.9, 0.45, 0.12); }
    if (grind && Math.random() < 0.5) this.fxSparks(g.x, g.y + 4, 1, Math.PI / 2, 2, [40, 140]);
    if ((g.whirT -= dt) <= 0) { g.whirT = grind ? 0.09 : 0.14; Sfx.whirr(clamp(1 - Math.hypot(g.x - px, g.y - py) / 400, 0.2, 1)); }
  },

  floorBelow(x, y, max = 320) {                                         // top of the first standable tile at or below (x, y)
    for (let yy = Math.max(0, y); yy < y + max && yy < LH; yy += 4) if (this.standAt(x, yy)) return Math.floor(yy / TS) * TS;
    return null;
  },

  // --------------------------------------------------------------- forge hammer ----
  // Tap: one heavy swing in front of you. Hold 0.5 s and release on the ground: SLAM, and shockwaves run both
  // ways along the floor, launching whatever stands on it. Release in the air: dive straight down and slam on
  // landing (METEOR, +30%).
  hammerTrigger(trig, now, dt) {
    const T = TUNE.HAMMER;
    if (trig && now >= this.nextFire && !this.diving) {
      if (!this.hammerOn) { this.hammerOn = true; this.hammerCharge = 0; }
      this.hammerCharge = Math.min(1, this.hammerCharge + dt / T.charge);
      if (this.hammerCharge > 0.15 && (this.hamSndT = (this.hamSndT || 0) - dt) <= 0) { this.hamSndT = 0.25; Sfx.charge(0.25 + 0.4 * this.hammerCharge); }
      if (this.hammerCharge >= 1 && Math.random() < 0.4) {
        const r = this.gun.rotation, G = GUNS.hammer;
        this.fx.emit(this.gun.x + Math.cos(r) * G.muzzle, this.gun.y + Math.sin(r) * G.muzzle, { n: 1, speed: [10, 50], life: [0.2, 0.4], size: [2, 1], cols: [0xffe080, 0xff8a20], add: true, g: -40 });
      }
    } else if (this.hammerOn) {
      const c = this.hammerCharge, pb = this.player.body, ground = pb.blocked.down || pb.touching.down;
      this.hammerOn = false; this.hammerCharge = 0;
      this.nextFire = now + T.cooldown * (now < this.rampageUntil ? TUNE.RAMPAGE.fire : 1); this.lastShotT = now; this.stats.shots++;
      if (c < 0.35) this.hammerSwingHit(now);
      else if (ground) this.hammerSlam(now, c, false);
      else { this.diving = true; this.diveCharge = c; Sfx.whoosh(); }
    }
  },
  hammerSwingHit(now) {
    const T = TUNE.HAMMER, f = this.facing, p = this.player;
    this.hammerSwing = 0.14; this.recoil = 5; Sfx.whoosh();
    const x0 = p.x + f * 4, x1 = p.x + f * (T.reach + 6), xl = Math.min(x0, x1), xr = Math.max(x0, x1), yt = p.y - 16, yb = p.y + 12;
    let hit = false;
    for (const e of this.enemies.getChildren()) {
      if (!e.alive || e.under) continue;
      const b = e.body; if (b.right < xl || b.left > xr || b.bottom < yt || b.top > yb) continue;
      hit = true; this.stats.hits++;
      if (this.canExecute(e)) { this.execute(e, f); continue; }
      if (!e.def.anchored && !e.def.noClip) { const kb = Math.max(0.3, e.def.kb); b.velocity.x = f * T.swingKnock * kb; b.velocity.y = -220 * kb; e.kickedT = 0.6; e.stunT = Math.max(e.stunT, 0.5); }
      if (e.kind === 'bulwark' || e.kind === 'mirror') { e.ai = 'stagger'; e.aiUntil = now + 1000; e.shieldUp = false; this.mirrorDamage(e, 30); }
      if (!e.def.molten && !e.def.mech) this.fxBlood(b.center.x, b.center.y, 8, f > 0 ? 0 : Math.PI, 1, [100, 260]);
      this.damageEnemy(e, T.swingDmg, f, -0.4, 'kick');
    }
    for (const rd of this.ragdolls.slice()) {
      if (!rd.pts.some(q => q.x >= xl - 3 && q.x <= xr + 3 && q.y >= yt && q.y <= yb)) continue;
      for (const q of rd.pts) { q.vx = f * rand(300, 420); q.vy = -rand(200, 300); }
      this.hitRagdoll(rd, rd.pts[2].x, rd.pts[2].y, 20, f, -0.4, 'kick', 2); hit = true;
    }
    for (let ty = Math.floor(yt / TS); ty <= Math.floor(yb / TS); ty++) for (let tx = Math.floor(xl / TS); tx <= Math.floor(xr / TS); tx++) if (TILE_HP[this.tileAt(tx, ty)]) { this.damageTile(tx, ty, T.tile); hit = true; }
    if (hit) { Sfx.kickHit(); this.hitStop(70); this.shake(120, 0.008); this.addKick(f * 4, 1); }
  },
  hammerSlam(now, c, dive) {
    const T = TUNE.HAMMER, p = this.player, pb = p.body, x = p.x + this.facing * 10, fy = pb.bottom;
    const k = Math.min(1, c * (dive ? 1.3 : 1)), dmg = (T.slamMin + (T.slamMax - T.slamMin) * k) * (dive ? 1.3 : 1), range = T.waveMin + (T.waveMax - T.waveMin) * k;
    this.hammerSwing = 0.14; this.recoil = 6;
    for (const e of this.enemies.getChildren()) {                       // right under the hammer head: the full blow
      if (!e.alive || e.under) continue;
      const b = e.body;
      if (Math.abs(b.center.x - x) >= 16 + b.halfWidth || b.bottom < fy - 30 || b.top > fy + 4) continue;
      this.stats.hits++;
      if (this.canExecute(e)) { this.execute(e, Math.sign(b.center.x - p.x) || this.facing); continue; }
      this.damageEnemy(e, dmg * 1.4, Math.sign(b.center.x - p.x) || this.facing, -1, 'kick');
      if (e.alive && !e.def.noClip && !e.def.anchored) { b.velocity.y = -T.launch * Math.max(0.3, e.def.kb); e.stunT = Math.max(e.stunT, 0.8); }
    }
    for (const dir of [-1, 1]) this.pwaves.push({ x, y: fy, dir, dist: 0, max: range, dmg, speed: T.waveSpeed, hit: new Set(), fxT: 0 });
    const ty = Math.floor((fy + 2) / TS);
    for (let tx = Math.floor((x - 20) / TS); tx <= Math.floor((x + 20) / TS); tx++) if (TILE_HP[this.tileAt(tx, ty)]) this.damageTile(tx, ty, T.tile * 1.5);   // cracks breakable floor
    this.fx.emit(x, fy - 2, { n: 30, angle: -Math.PI / 2, spread: 2.6, speed: [60, 260], life: [0.3, 0.7], size: [3, 1], cols: [0xffffff, 0xffe080, 0xffa030, 0x8a8580], g: 600, mode: 1 });
    this.fxDust(x, fy, 14); this.fxSmoke(x, fy - 4, 6, 1.2);
    this.spawnLight(x, fy - 6, 'glow', 0xffa040, 2, 4.5, 0.9, 0.3); this.spawnLight(x, fy - 4, 'ring', 0xffe0b0, 0.3, 2.2, 0.9, 0.25);
    this.paintScorch(x, fy + 2, 10 + 6 * k);
    for (const g of this.gibList) if (g.active && Math.abs(g.x - x) < range && Math.abs(g.y - fy) < 30) { if (g.stuckT > 0) { g.stuckT = 0; g.body.setAllowGravity(true); } g.body.velocity.y = -rand(200, 380); g.body.velocity.x += Math.sign(g.x - x) * rand(40, 140); g.body.angularVelocity = rand(-900, 900); }
    for (const rd of this.ragdolls) if (Math.abs(rd.pts[2].x - x) < range && Math.abs(rd.pts[2].y - fy) < 40) { for (const q of rd.pts) { q.vy = -rand(220, 360); q.vx += Math.sign(q.x - x) * rand(40, 120); } rd.asleep = false; }
    for (const kg of this.barrelList) if (kg.active && Math.abs(kg.x - x) < range && Math.abs(kg.y - fy) < 20) { kg.body.velocity.y = -300; this.damageBarrel(kg, 12); }
    this.propsIn((px, py, r) => Math.abs(px - x) < range + r && Math.abs(py - fy) < 20 + r, 12, 'kick', this.facing, -1);
    Sfx.hammerSlam(k); this.makeNoise(x, fy, 300, true);
    this.shake(260, 0.01 + 0.008 * k); this.addKick(0, 6); this.hitStop(60 + 40 * k); this.zoomPunch = Math.max(this.zoomPunch, 0.06 + 0.04 * k); this.warpPulse(0.06 + 0.05 * k);
    if (dive) { BUS.emit('callout', 'METEOR!'); this.addStyle(70); }
    pb.velocity.y = Math.min(pb.velocity.y, -90);                         // a little hop off the recoil
  },
  updatePWaves(dt) {                                                    // slam shockwaves: run along the floor, launch what stands on it
    const T = TUNE.HAMMER;
    for (let i = this.pwaves.length - 1; i >= 0; i--) {
      const w = this.pwaves[i], step = w.speed * dt, nx = w.x + w.dir * step;
      w.dist += step;
      if (w.dist > w.max || this.solidAt(nx, w.y - 6) || !this.standAt(nx, w.y + 2)) { this.pwaves.splice(i, 1); continue; }   // walls and gaps stop it
      w.x = nx;
      const f = 1 - w.dist / w.max;
      if ((w.fxT -= dt) <= 0) {
        w.fxT = 0.02;
        this.fx.emit(w.x, w.y - 1, { n: 2, angle: -Math.PI / 2 + w.dir * 0.4, spread: 0.8, speed: [40, 40 + 140 * f], life: [0.2, 0.4], size: [2, 1], cols: [0xffe080, 0xffa030, 0x8a8580], g: 500, mode: 1 });
        if (Math.random() < 0.5) this.fxDust(w.x, w.y, 1);
      }
      for (const e of this.enemies.getChildren()) {
        if (!e.alive || e.under || w.hit.has(e) || FLIERS.has(e.kind)) continue;
        const b = e.body;
        if (Math.abs(b.center.x - w.x) > b.halfWidth + 6 || Math.abs(b.bottom - w.y) > 10) continue;
        w.hit.add(e); this.stats.hits++;
        if (!e.def.anchored) { const kb = Math.max(0.35, e.def.kb); b.velocity.y = -T.launch * kb * (0.5 + 0.5 * f); b.velocity.x = w.dir * 160 * kb; e.stunT = Math.max(e.stunT, 0.7); e.kickedT = 0.4; }
        this.damageEnemy(e, w.dmg * (0.55 + 0.45 * f), w.dir, -1, 'kick');
      }
      for (const kg of this.barrelList) if (kg.active && !w.hit.has(kg) && Math.abs(kg.x - w.x) < 8 && Math.abs(kg.y + 7 - w.y) < 10) { w.hit.add(kg); kg.body.velocity.y = -320; }
    }
  },

  // ----------------------------------------------------------------- storm coil ----
  // Throws a tesla coil that sticks where it lands (3 out at once; a 4th recycles the oldest). Each coil zaps the
  // nearest enemy in reach, and coils within 200 px link into a lightning fence. Hold fire 0.45 s: OVERLOAD.
  coilTrigger(trig, now, dt) {
    if (trig) {
      if (!this.coilHeld) { this.coilHeld = true; this.coilHeldT = 0; if (now >= this.nextFire) this.throwCoil(now); }
      this.coilHeldT += dt;
      if (this.coilHeldT >= TUNE.COIL.overload && this.coils.length && !this.coilOverloaded) { this.coilOverloaded = true; this.overloadCoils(); }
    } else { this.coilHeld = false; this.coilOverloaded = false; }
  },
  throwCoil(now) {
    const T = TUNE.COIL, G = GUNS.coil, a = this.aim, ca = Math.cos(a), sa = Math.sin(a);
    let x = this.shoulder.x + ca * G.muzzle, y = this.shoulder.y + sa * G.muzzle;
    if (this.solidAt(x, y) || !this.los(this.shoulder.x, this.shoulder.y, x, y)) { x = this.shoulder.x; y = this.shoulder.y; }
    if (this.coils.length >= T.max) this.removeCoil(this.coils[0], true);
    const img = this.add.image(x, y, 'coil').setDepth(6), glow = this.add.image(x, y, 'glow').setBlendMode(ADD).setTint(0x6ad0ff).setScale(0.5).setAlpha(0.7).setDepth(18);
    this.coils.push({ img, glow, x, y, tx: x, ty: y, vx: ca * T.speed + this.player.body.velocity.x * 0.3, vy: sa * T.speed - T.lift, stuck: false, t: T.life, zapT: 0.2, ang: 0, zapTo: null });
    this.nextFire = now + T.cooldown; this.lastShotT = now; this.stats.shots++;
    this.recoil = 3; Sfx.mineThrow(); this.addKick(-ca * 1.5, -sa * 1.5);
  },
  removeCoil(c, fizzle) {
    const i = this.coils.indexOf(c); if (i >= 0) this.coils.splice(i, 1);
    if (fizzle) { this.fxSparks(c.x, c.y, 8); this.spawnLight(c.x, c.y, 'glow', 0x6ad0ff, 0.8, 1.6, 0.8, 0.15); Sfx.snap(); }
    c.img.destroy(); c.glow.destroy();
  },
  coilHit(c) { if (!c.hit) { c.hit = true; this.stats.hits++; } },       // a coil is one shot: its first zap or fence hit counts
  overloadCoils() {
    const T = TUNE.COIL; BUS.emit('callout', 'OVERLOAD!');
    this.coils.slice().forEach((c, i) => this.time.delayedCall(i * 70, () => {
      if (!this.coils.includes(c)) return;
      this.removeCoil(c, false); this.explode(c.tx, c.ty, T.burst, !c.hit); Sfx.coilBoom();
      for (const e of this.enemies.getChildren()) if (e.alive && !e.under && Math.hypot(e.body.center.x - c.tx, e.body.center.y - c.ty) < T.burst.radius) e.stunT = Math.max(e.stunT, 1.5);
    }));
  },
  updateCoils(dt, now) {
    const T = TUNE.COIL, g = this.coilG; g.clear();
    for (const c of this.coils.slice()) {
      c.t -= dt;
      if (c.t <= 0) { this.removeCoil(c, true); continue; }
      if (!c.stuck) {
        c.vy += 700 * dt;
        const nx = c.x + c.vx * dt, ny = c.y + c.vy * dt, hit = this.sweep(c.x, c.y, nx, ny);
        if (hit) {                                                       // stands up on floors, sideways on walls, hangs from ceilings
          c.x = hit.x; c.y = hit.y; c.stuck = true;
          c.ang = this.solidAt(c.x, c.y + 3) ? 0 : this.solidAt(c.x, c.y - 3) ? Math.PI : this.solidAt(c.x + 3, c.y) ? -Math.PI / 2 : Math.PI / 2;
          Sfx.clunk(0.7); this.fxSparks(c.x, c.y, 5); this.spawnLight(c.x, c.y, 'ring', 0x9adcff, 0.2, 0.8, 0.8, 0.18);
        } else { c.x = nx; c.y = ny; c.ang += dt * 12; }
      }
      const ox = c.stuck ? Math.sin(c.ang) * 5 : 0, oy = c.stuck ? -Math.cos(c.ang) * 5 : 0;
      c.img.setPosition(Math.round(c.x + ox), Math.round(c.y + oy)).setRotation(c.ang);
      c.tx = c.x + (c.stuck ? Math.sin(c.ang) * 10 : 0); c.ty = c.y - (c.stuck ? Math.cos(c.ang) * 10 : 0);   // emitter tip
      c.glow.setPosition(c.tx, c.ty).setScale(0.45 + Math.random() * 0.15).setAlpha(c.t < 2 && Math.floor(now / 90) % 2 ? 0.25 : 0.7);
      if (!c.stuck) continue;
      if ((c.zapT -= dt) <= 0) {                                         // zap the nearest enemy in reach
        c.zapT = T.zapCd;
        let best = null, bd = T.zapR;
        for (const e of this.enemies.getChildren()) {
          if (!e.alive || e.under) continue;
          const d = Math.hypot(e.body.center.x - c.tx, e.body.center.y - c.ty);
          if (d < bd && this.los(c.tx, c.ty, e.body.center.x, e.body.center.y)) { bd = d; best = e; }
        }
        if (best) { c.zapTo = { x: best.body.center.x, y: best.body.center.y, t: 0.12 }; this.damageEnemy(best, T.zapDmg, Math.sign(best.x - c.tx) || 1, 0, 'arc'); this.coilHit(c); Sfx.zap(); }
      }
      if (c.zapTo && (c.zapTo.t -= dt) > 0) this.zap(g, c.tx, c.ty, c.zapTo.x, c.zapTo.y);
    }
    const st = this.coils.filter(c => c.stuck), links = [];
    for (let i = 0; i < st.length; i++) for (let j = i + 1; j < st.length; j++) {
      const a = st[i], b = st[j];
      if (Math.hypot(a.tx - b.tx, a.ty - b.ty) <= T.link && this.los(a.tx, a.ty, b.tx, b.ty)) links.push([a, b]);
    }
    for (const [a, b] of links) { this.zap(g, a.tx, a.ty, b.tx, b.ty); if (Math.random() < 0.5) this.zap(g, a.tx, a.ty, b.tx, b.ty); }
    if (links.length && Math.random() < dt * 6) Sfx.buzz();
    if ((this.fenceT -= dt) <= 0 && links.length) {                      // the fence fries whatever crosses it
      this.fenceT = 0.1;
      const crosses = (x, y, r) => links.some(([a, b]) => this.segDist(x, y, a.tx, a.ty, b.tx, b.ty)[0] < r);
      for (const e of this.enemies.getChildren()) {
        if (!e.alive || e.under) continue;
        const r = Math.max(e.body.halfWidth, e.body.halfHeight), on = links.filter(([a, b]) => this.segDist(e.body.center.x, e.body.center.y, a.tx, a.ty, b.tx, b.ty)[0] < r);
        if (!on.length) continue;
        this.damageEnemy(e, T.fenceDps * 0.1, 0, -1, 'arc');
        for (const [a, b] of on) { this.coilHit(a); this.coilHit(b); }   // both coils it runs between connected
      }
      for (const rd of this.ragdolls) { const q = rd.pts[2]; if (crosses(q.x, q.y, 8)) this.hitRagdoll(rd, q.x, q.y, 2, 0, -1, 'arc'); }
    }
  },

  // ---------------------------------------------------------------- flak cannon ----
  // A glowing slag shell that bursts after 0.22 s (or on whatever it hits) into 9 shards that ricochet twice.
  flakBurst(x, y, vx, vy) {
    const T = TUNE.FLAK, a = Math.atan2(vy, vx);
    for (let i = 0; i < T.shards; i++) {
      const ang = a + (i - (T.shards - 1) / 2) / ((T.shards - 1) / 2) * T.spread * DEG + rand(-4, 4) * DEG;
      const b = this.spawnBullet('shard', x - Math.cos(a) * 3, y - Math.sin(a) * 3, ang, T.shardSpeed * rand(0.85, 1.1), T.shardDmg, rand(0.55, 0.8));
      if (b) { b.body.setAllowGravity(true); b.body.setGravityY(-500); b.bounces = T.bounces; }
    }
    this.fxSparks(x, y, 14, a, 1.2, [80, 300]); this.fxSmoke(x, y, 4);
    this.spawnLight(x, y, 'glow', 0xffa040, 1.2, 2.6, 0.9, 0.18);
    this.fx.emit(x, y, { n: 10, angle: a, spread: 1.2, speed: [60, 200], life: [0.15, 0.35], size: [4, 1], cols: [0xffffff, 0xffe46a, 0xffa030], add: true, drag: 3 });
    Sfx.flakBurst(); this.shake(80, 0.004);
  },

  // ---------------------------------------------------------------- tractor ----
  // Hold to catch the nearest loose thing in the aim cone (drums, satchels, gas cans, gibs, corpses, light enemies)
  // and carry it at the muzzle; release to hurl it. Drums and satchels go off on impact, gas cans become rockets,
  // corpses and enemies bowl over whatever they hit. Held enemies get crushed slowly.
  tractorable(e) { return e.def.kb >= 0.5 && e.hp <= 130 && !e.def.noClip && !e.def.boss && !e.def.miniBoss && !['burrower', 'hive', 'buzzsaw'].includes(e.kind); },
  tractorFind() {
    const T = TUNE.TRACTOR, sx = this.shoulder.x, sy = this.shoulder.y, a = this.aim;
    let best = null, bs = 1e9;
    const consider = (kind, o, x, y) => {
      const d = Math.hypot(x - sx, y - sy); if (d > T.range) return;
      let da = Math.abs(Math.atan2(y - sy, x - sx) - a) % (Math.PI * 2); if (da > Math.PI) da = Math.PI * 2 - da;
      if (da > T.cone && d > 14) return;
      const sc = d + da * 90 + (kind === 'gib' ? 30 : 0);              // whatever's under the crosshair; scraps only if nothing better
      if (sc < bs && this.los(sx, sy, x, y)) { bs = sc; best = { kind, o }; }
    };
    for (const e of this.enemies.getChildren()) if (e.alive && !e.under && this.tractorable(e)) consider('enemy', e, e.body.center.x, e.body.center.y);
    for (const k of this.barrelList) if (k.active) consider('barrel', k, k.x, k.y);   // props are bolted down: the beam can't lift them, so it skips them
    for (const c of this.chargeList) if (c.active) consider('charge', c, c.x, c.y);
    for (const k of this.canisterList) if (k.active && k.state === 'idle') consider('canister', k, k.x, k.y);
    for (const rd of this.ragdolls) if (!rd.gone && !rd.pin && !rd.claimed) consider('rag', rd, rd.pts[2].x, rd.pts[2].y);
    for (const g of this.gibList) if (g.active) consider('gib', g, g.x, g.y);
    return best;
  },
  tbPos(H) {
    if (H.kind === 'rag') return H.o.gone ? null : H.o.pts[2];
    if (H.kind === 'enemy') return H.o.alive ? H.o.body.center : null;
    return H.o.active ? H.o : null;
  },
  tbRelease(H) {
    if (H.kind === 'enemy' && H.o.stasisT > 0) H.o.stasisGrav = H.grav;  // let go inside a time-stop: the field gives it back when it ends
    else if (H.kind === 'enemy' && H.o.gravT > 0) { /* still floating: the grav bomb turns it back on when it lands */ }
    else if (H.kind !== 'rag' && H.o.body) H.o.body.setAllowGravity(H.grav);
    if (H.kind === 'enemy') H.o.tbHeld = false;
  },
  tractorTrigger(trig, now, dt) {
    this.tbOn = trig && this.state !== 'dead';
    if (trig) {
      if (!this.tb && now >= this.nextFire) {
        const got = this.tractorFind();
        if (got) {
          if (got.kind !== 'rag') { const o = got.o; got.grav = got.kind === 'enemy' && (o.gravT > 0 || o.gravSlam) ? true : got.kind === 'enemy' && o.stasisT > 0 ? o.stasisGrav !== false : o.body.allowGravity; o.body.setAllowGravity(false); }   // its real gravity, not one a time-stop or a grav bomb switched off
          if (got.kind === 'enemy' && got.o.kind === 'mimic' && got.o.ai === 'hide') this.mimicReveal(got.o, now);
          if (got.kind === 'enemy') { got.o.tbHeld = true; got.o.stunT = Math.max(got.o.stunT, 0.3); got.o.kickedT = 0; }
          if (got.kind === 'gib' && got.o.stuckT > 0) got.o.stuckT = 0;
          got.crushT = 0.25; got.blindT = 0; this.tb = got;
          const p = this.tbPos(got); Sfx.tractorGrab(); this.spawnLight(p.x, p.y, 'ring', 0xb090ff, 0.1, 0.9, 0.9, 0.15);
        }
      }
      if (this.tb) this.tractorHold(dt);
    } else if (this.tb) this.tractorThrow(now);
  },
  tractorHold(dt) {
    dt = Math.min(dt, 0.05);
    const T = TUNE.TRACTOR, H = this.tb, a = this.aim, pos = this.tbPos(H);
    if (!pos) { this.tb = null; return; }
    const sx = this.shoulder.x, sy = this.shoulder.y, reach = 26 + (H.kind === 'enemy' ? H.o.body.halfWidth : H.kind === 'rag' ? 6 : 3);
    const hx = sx + Math.cos(a) * reach, hy = sy + Math.sin(a) * reach;
    if (Math.hypot(pos.x - sx, pos.y - sy) > T.range * 1.7) { this.tractorDrop(); return; }
    if (!this.los(sx, sy, pos.x, pos.y)) { if ((H.blindT += dt) > 0.35) { this.tractorDrop(); return; } } else H.blindT = 0;
    const k = Math.min(1, dt * 14);
    if (H.kind === 'rag') {                                              // haul the torso; the limbs dangle
      const rd = H.o; rd.asleep = false; rd.stillT = 0;
      rd.pts.forEach((q, i) => { const w = i === 2 ? 1 : 0.18; q.vx += (clamp((hx - q.x) * 14, -700, 700) - q.vx) * k * w; q.vy += (clamp((hy - q.y) * 14, -700, 700) - q.vy) * k * w; });
    } else {
      const b = H.o.body;
      b.velocity.x += (clamp((hx - pos.x) * 14, -700, 700) - b.velocity.x) * k;
      b.velocity.y += (clamp((hy - pos.y) * 14, -700, 700) - b.velocity.y) * k;
      if (H.kind === 'enemy') {
        const e = H.o; e.stunT = Math.max(e.stunT, 0.25); e.kickedT = 0;
        if ((H.crushT -= dt) <= 0) {                                      // the grip crushes
          H.crushT = 0.25; this.damageEnemy(e, T.crush * 0.25, 0, 0, 'crush');
          if (e.def.mech) this.fxSparks(pos.x, pos.y, 2, 0, Math.PI * 2, [30, 90]); else this.fxBlood(pos.x, pos.y, 2, 0, Math.PI * 2, [20, 80]);
          if (!e.alive) { this.tb = null; return; }
        }
      }
    }
    if (Math.random() < 0.5) {                                           // motes spiralling round the catch
      const th = rand(0, Math.PI * 2), r = rand(6, 12);
      this.fx.emit(pos.x + Math.cos(th) * r, pos.y + Math.sin(th) * r, { n: 1, speed: [0, 0], vx: -Math.sin(th) * 60 - Math.cos(th) * 30, vy: Math.cos(th) * 60 - Math.sin(th) * 30, life: [0.2, 0.4], size: [2, 1], cols: [0xffffff, 0xd0b8ff, 0x8a60ff], add: true });
    }
  },
  tractorThrow(now) {
    const T = TUNE.TRACTOR, H = this.tb; this.tb = null;
    const pos = this.tbPos(H); if (!pos) return;
    const a = this.aim, ca = Math.cos(a), sa = Math.sin(a), pb = this.player.body;
    const vx = ca * T.throw + pb.velocity.x * 0.3, vy = sa * T.throw + pb.velocity.y * 0.2 - 40;
    this.nextFire = now + T.cooldown; this.stats.shots++;
    this.tbRelease(H);
    const q = { kind: H.kind, o: H.o, t: 1.2, hits: new Set(), counted: H.kind === 'enemy' };   // a foe in the beam has already been hit
    if (q.counted) this.stats.hits++;
    if (H.kind === 'rag') { for (const p of H.o.pts) { p.vx = vx * rand(0.92, 1.05); p.vy = vy * rand(0.92, 1.05); } this.thrown.push(q); }
    else {
      const o = H.o; o.body.setVelocity(vx, vy);
      if (H.kind === 'barrel' || H.kind === 'charge') { o.kicked = true; o.prevV = T.throw; }
      if (H.kind === 'gib') o.body.angularVelocity = rand(-900, 900);
      if (H.kind === 'enemy') { o.kickedT = 0.9; o.stunT = Math.max(o.stunT, 0.9); o.lastVx = vx; BUS.emit('callout', 'YEET'); }
      if (H.kind === 'canister') this.igniteCanister(o, a); else this.thrown.push(q);
    }
    const mx = this.shoulder.x + ca * 25, my = this.shoulder.y + sa * 25;
    Sfx.tractorThrow(); this.recoil = 6; this.addKick(-ca * 5, -sa * 5); this.shake(90, 0.004);
    pb.velocity.x -= ca * 60;
    this.spawnLight(mx, my, 'ring', 0xb090ff, 0.2, 1.4, 0.9, 0.18); this.spawnLight(mx, my, 'glow', 0x9a70ff, 1, 2.2, 0.8, 0.12);
    this.fx.emit(mx, my, { n: 10, angle: a, spread: 0.8, speed: [80, 240], life: [0.15, 0.35], size: [2, 1], cols: [0xffffff, 0xd0b8ff, 0x8a60ff], add: true });
    this.addStyle(H.kind === 'enemy' ? 30 : 10);
  },
  tractorDrop() {
    const H = this.tb; this.tb = null; if (!H) return;
    if (this.tbPos(H)) this.tbRelease(H);
    this.nextFire = Math.max(this.nextFire, this.time.now + 150);
  },
  updateTractor(dt, now) {
    if (this.tb && (WEAPONS[this.weapon].id !== 'tractor' || this.state === 'dead')) this.tractorDrop();
    for (let i = this.thrown.length - 1; i >= 0; i--) {                  // things in flight bowl over whatever they meet
      const q = this.thrown[i]; q.t -= dt;
      const pos = this.tbPos(q);
      if (!pos || q.t <= 0) { this.thrown.splice(i, 1); continue; }
      const v = q.kind === 'rag' ? { x: pos.vx, y: pos.vy } : q.o.body.velocity, sp = Math.hypot(v.x, v.y);
      if (sp < 160) { if (q.kind !== 'enemy') this.thrown.splice(i, 1); continue; }
      for (const e of this.enemies.getChildren()) {
        if (!e.alive || e === q.o || e.under || q.hits.has(e)) continue;
        const b = e.body; if (pos.x < b.left - 5 || pos.x > b.right + 5 || pos.y < b.top - 5 || pos.y > b.bottom + 5) continue;
        q.hits.add(e);
        if (!q.counted) { q.counted = true; this.stats.hits++; }         // the throw connected
        if (q.kind === 'barrel') { this.explodeBarrel(q.o); break; }
        if (q.kind === 'charge') { this.detonateCharge(q.o); break; }
        const dmg = q.kind === 'gib' ? 10 : TUNE.TRACTOR.impact, ux = v.x / sp, uy = v.y / sp;
        this.damageEnemy(e, dmg, ux, uy, 'crush');
        if (e.alive) { b.velocity.x += v.x * 0.5 * e.def.kb; b.velocity.y -= 120 * e.def.kb; e.stunT = Math.max(e.stunT, 0.5); }
        if (q.kind === 'enemy') this.damageEnemy(q.o, dmg * 0.6, -ux, 0, 'crush');
        if (e.def.mech) this.fxSparks(pos.x, pos.y, 8, Math.atan2(uy, ux), 1.4); else this.fxBlood(pos.x, pos.y, 10, Math.atan2(uy, ux), 1.2, [60, 240]);
        Sfx.kickHit(); this.hitStop(45); this.shake(110, 0.005); this.addStyle(25);
        if (q.hits.size === 2) { BUS.emit('callout', 'BOWLED OVER'); this.addStyle(60); }
        if (q.kind === 'gib') { this.thrown.splice(i, 1); break; }
      }
    }
  },
  drawTractor(g, now) {
    if (!this.tbOn || this.state === 'dead' || WEAPONS[this.weapon].id !== 'tractor') return;
    const a = this.aim, ca = Math.cos(a), sa = Math.sin(a), mx = this.shoulder.x + ca * 25, my = this.shoulder.y + sa * 25, T = TUNE.TRACTOR;
    const pos = this.tb && this.tbPos(this.tb);
    if (!pos) {                                                          // searching: a faint cone that flickers
      const al = 0.1 + Math.random() * 0.08;
      for (const s of [-1, 1]) g.lineStyle(1, 0x9a70ff, al).lineBetween(mx, my, mx + Math.cos(a + s * T.cone) * T.range * 0.8, my + Math.sin(a + s * T.cone) * T.range * 0.8);
      g.lineStyle(1, 0xd0b8ff, al * 1.6).lineBetween(mx, my, mx + ca * 18, my + sa * 18);
      return;
    }
    const x1 = pos.x, y1 = pos.y, len = Math.hypot(x1 - mx, y1 - my) || 1, nx = -(y1 - my) / len, ny = (x1 - mx) / len, n = Math.max(3, Math.round(len / 5));
    for (const [ph, col, w, al] of [[0, 0x6a40d0, 3, 0.35], [2.1, 0x9a70ff, 1, 0.8], [4.2, 0xe8dcff, 1, 0.9]]) {
      let px = mx, py = my;
      for (let i = 1; i <= n; i++) {
        const t = i / n, wob = Math.sin(t * 8 - now / 45 + ph) * 2.5 * Math.sin(t * Math.PI), qx = mx + (x1 - mx) * t + nx * wob, qy = my + (y1 - my) * t + ny * wob;
        g.lineStyle(w, col, al).lineBetween(px, py, qx, qy); px = qx; py = qy;
      }
    }
    const rt = (now / 260) % 1;                                          // rings riding the beam back to the gun
    g.lineStyle(1, 0xd0b8ff, 0.6 * (1 - rt)).strokeCircle(x1 + (mx - x1) * rt, y1 + (my - y1) * rt, 4 + 3 * (1 - rt));
  },

  // ---------------------------------------------------------------- corroder ----
  // A cone of acid. Light damage, but it corrodes: corroded enemies take +40% from everything else for 5 s,
  // a riot shield melts away under 1.6 s of spray, and crates fizz apart.
  fireAcid(now, ox, oy, a) {
    const W = TUNE.ACID, sx = this.shoulder.x, sy = this.shoulder.y, pvx = this.player.body.velocity.x * 0.5, ca = Math.cos(a), sa = Math.sin(a);
    this.acidActiveUntil = now + 100; this.stats.shots++; this.recoil = 1;
    for (let i = 0; i < 3; i++) this.fx.emit(ox, oy, { n: 1, angle: a, spread: W.cone * 1.6 * DEG, speed: [190, 280], life: [0.3, 0.5], size: [3, 1], cols: [0xf0ffd0, 0xc8ff60, 0x7dff4a, 0x3aa020], add: true, g: 380, drag: 0.6, vx: pvx, mode: 1 });
    this.fx.emit(ox, oy, { n: 1, angle: a, spread: 0.4, speed: [50, 110], life: [0.4, 0.8], size: [3, 8], cols: [0x8aff60, 0x4a9a30, 0x2a5020], alpha: [0.22, 0], g: -30, drag: 1.4 });   // fumes
    if (Math.random() < 0.4) this.spawnLight(ox + ca * 24, oy + sa * 24, 'glow', 0x7dff4a, 1.6, 2.2, 0.32, 0.1);
    const inCone = (x, y, extra) => {
      const d = Math.hypot(x - sx, y - sy); if (d > W.range + extra) return false;
      let da = Math.abs(Math.atan2(y - sy, x - sx) - a) % (Math.PI * 2); if (da > Math.PI) da = Math.PI * 2 - da;
      return (da <= (W.cone + 8) * DEG || d < 14) && this.los(sx, sy, x, y);
    };
    let hitAny = false;
    for (const e of this.enemies.getChildren()) {
      if (!e.alive || e.under || !inCone(e.body.center.x, e.body.center.y, e.body.halfWidth)) continue;
      hitAny = true; e.corrodeT = W.corrode;
      if ((e.kind === 'bulwark' || e.kind === 'mirror') && !e.mirrorBroken && (e.acidSh = (e.acidSh || 0) + W.cooldown / 1000) >= W.shield) this.meltShield(e);
      this.damageEnemy(e, W.damage * (e.def.mech ? 1.25 : 1), ca, sa, 'acid');
    }
    for (const k of this.barrelList) if (k.active && inCone(k.x, k.y, 6)) this.damageBarrel(k, 0.5);
    this.propsIn(inCone, W.damage, 'acid', ca, sa, true);
    for (const rd of this.ragdolls.slice()) { const c = rd.pts[2]; if (inCone(c.x, c.y, 6)) this.hitRagdoll(rd, c.x, c.y, W.damage, ca, sa, 'flame', 2); }
    if (hitAny) this.stats.hits++;
    if (now > this.acidPaintT) {                                         // the spray eats what it lands on
      this.acidPaintT = now + 140;
      const h = this.sweep(sx, sy, sx + ca * W.range, sy + sa * W.range);
      if (h) {
        this.paintAcid(h.x + ca * 2, h.y + sa * 2, 4);
        const tx = Math.floor((h.x + ca * 3) / TS), ty = Math.floor((h.y + sa * 3) / TS), c = this.tileAt(tx, ty);
        if (c === 'x' || c === 'g') this.damageTile(tx, ty, 5);
        if (Math.random() < 0.5) this.fx.emit(h.x, h.y, { n: 2, angle: -Math.PI / 2, spread: 0.8, speed: [10, 40], life: [0.4, 0.8], size: [3, 6], cols: [0xc8ff90, 0x6aa040], alpha: [0.3, 0], g: -40, drag: 1.5 });
        if (Math.random() < 0.15) Sfx.sizzle();
      }
    }
    this.shake(25, 0.0006);
  },
  paintAcid(x, y, r) {
    const c = this.lvlCtx; c.globalCompositeOperation = 'source-atop';
    const cols = ['#4a9a20', '#2a6a18', '#7dd040', '#1a4010', '#5ab030'];
    for (let i = 0, n = Math.round(r * 3); i < n; i++) {
      c.fillStyle = cols[(Math.random() * cols.length) | 0];
      const px = (x + rand(-r, r)) | 0, py = (y + rand(-r, r)) | 0;
      c.fillRect(px, py, 1, Math.random() < 0.3 ? randi(2, 5) : 1);   // the odd drip runs down
    }
    c.globalCompositeOperation = 'source-over'; this.lvlMark(x, y, r + 6);
  },
  meltShield(e) {
    if (e.mirrorBroken) return;
    const now = this.time.now, sx = e.x + e.dir * 6, sy = e.y - 2;
    if (e.kind === 'mirror') this.mirrorDamage(e, 9999);
    else { e.mirrorBroken = true; e.shieldUp = false; e.def = Object.assign({}, e.def, { key: 'bulwarkm' }); e.ai = 'stagger'; e.aiUntil = now + 900; }
    this.fx.emit(sx, sy, { n: 22, speed: [20, 140], life: [0.4, 0.9], size: [2, 1], cols: [0xe0ff90, 0x9aff4a, 0x4aa020], add: true, g: 400, mode: 1 });
    this.fxSmoke(sx, sy, 6); this.spawnLight(sx, sy, 'glow', 0x7dff4a, 1.4, 2.6, 0.8, 0.25);
    Sfx.sizzle(); BUS.emit('callout', 'SHIELD MELTED'); this.addStyle(60);
  },

  // ================================================================== gold round ====
  // ---------------------------------------------------------------- seed launcher ----
  // A lobbed seed that roots where it lands and sprouts (1 s) into a fungus turret for 9 s: every 1.6 s it puffs two
  // homing spores (150 px/s, 8 each) at the nearest foe it can see within 220 px. Two can grow at once.
  updateSeeds(dt, now) {
    const T = TUNE.SEED, G = this.iceG;
    for (let i = this.seeds.length - 1; i >= 0; i--) {
      const S = this.seeds[i]; S.t -= dt; S.vy += 520 * dt;
      const nx = S.x + S.vx * dt, ny = S.y + S.vy * dt;
      if (S.t <= 0 || ny > LH) { this.seeds.splice(i, 1); continue; }
      if (this.solidAt(nx, ny)) {
        this.seeds.splice(i, 1);
        const fy = this.floorBelow(S.x, S.y - 4); if (fy === null || fy - S.y > 40) { this.fx.emit(S.x, S.y, { n: 5, speed: [20, 60], life: [0.2, 0.4], size: [2, 1], cols: [0x8ac040] }); continue; }
        if (this.shrooms.length >= T.max) this.shrooms.shift();
        this.shrooms.push({ x: S.x, y: fy, t: T.life, grow: 0, cd: 0.6 }); Sfx.sprout();
        continue;
      }
      S.x = nx; S.y = ny;
    }
    for (let i = this.shrooms.length - 1; i >= 0; i--) {                  // the fungus turrets
      const M = this.shrooms[i]; M.t -= dt; M.grow = Math.min(1, M.grow + dt / T.grow);
      if (M.t <= 0) { this.fx.emit(M.x, M.y - 4, { n: 10, angle: -Math.PI / 2, spread: 1, speed: [10, 50], life: [0.4, 0.8], size: [2, 4], cols: [0x8ac040, 0x5a7a20], alpha: [0.6, 0], g: -10 }); this.shrooms.splice(i, 1); continue; }
      const h = 4 + 6 * M.grow, w = 4 + 8 * M.grow, fade = Math.min(1, M.t / 0.5);
      G.fillStyle(0x6a5a3a, fade).fillRect(M.x - 1, M.y - h, 3, h); G.fillStyle(0x8ac040, fade).fillRect(M.x - w / 2, M.y - h - 3, w, 4); G.fillStyle(0xe0ff80, fade).fillRect(M.x - w / 2 + 2, M.y - h - 3, 2, 1); G.fillStyle(0xe0ff80, fade).fillRect(M.x + 1, M.y - h - 2, 1, 1);
      if (M.grow < 1 || (M.cd -= dt) > 0) continue;
      let tgt = null, bd = T.range;
      for (const e of this.enemies.getChildren()) { if (!e.alive || e.under) continue; const d = Math.hypot(e.body.center.x - M.x, e.body.center.y - (M.y - h)); if (d < bd && this.los(M.x, M.y - h - 2, e.body.center.x, e.body.center.y)) { bd = d; tgt = e; } }
      if (!tgt) { M.cd = 0.3; continue; }
      M.cd = T.cd; for (let k = 0; k < 2; k++) this.pspores.push({ x: M.x, y: M.y - h - 3, vx: rand(-40, 40), vy: rand(-90, -60), t: 3, tgt });
      this.fx.emit(M.x, M.y - h - 3, { n: 6, angle: -Math.PI / 2, spread: 0.8, speed: [20, 60], life: [0.3, 0.6], size: [2, 4], cols: [0xc8ff60, 0x8ac040], alpha: [0.6, 0], g: -20 }); Sfx.sporePuff();
    }
    for (let i = this.pspores.length - 1; i >= 0; i--) {                  // your spores home in on their foe
      const S = this.pspores[i]; S.t -= dt;
      if (S.t <= 0 || this.solidAt(S.x, S.y)) { this.pspores.splice(i, 1); continue; }
      const e = S.tgt && S.tgt.alive ? S.tgt : null;
      if (e) { const ddx = e.body.center.x - S.x, ddy = e.body.center.y - S.y, l = Math.hypot(ddx, ddy) || 1, k = Math.min(1, dt * 3); S.vx += (ddx / l * T.spore - S.vx) * k; S.vy += (ddy / l * T.spore - S.vy) * k; if (l < e.body.halfWidth + 3) { this.damageEnemy(e, T.dmg, Math.sign(S.vx) || 1, 0, 'needle'); this.stats.hits++; this.fx.emit(S.x, S.y, { n: 4, speed: [20, 60], life: [0.2, 0.4], size: [2, 1], cols: [0xc8ff60], add: true }); this.pspores.splice(i, 1); continue; } }
      else S.vy += 100 * dt;
      S.x += S.vx * dt; S.y += S.vy * dt;
    }
  },

  // ---------------------------------------------------------------- tether gun ----
  // A fast dart (6) that links whatever it hits: up to three foes at once, for 8 s each (a fourth link drops the
  // oldest). Damage to any linked foe is shared with the others at 60%: link a pack, then blow one of them up.
  tetherTag(e) {
    const T = TUNE.TETHER;
    if (!e.alive || e.under) return;
    if (!this.tethered.includes(e)) { this.tethered.push(e); if (this.tethered.length > T.max) { const old = this.tethered.shift(); old.tetherT = 0; } }
    e.tetherT = this.time.now + T.life * 1000;
    this.spawnLight(e.body.center.x, e.body.center.y, 'ring', 0x80ffe0, 0.2, 1, 0.8, 0.2);
    if (this.tethered.length >= T.max && !this.linkCalled) { this.linkCalled = true; BUS.emit('callout', 'LINKED'); this.addStyle(30); }
  },
  updateTethers(dt, now) {
    if (!this.tethered.length) return;
    this.tethered = this.tethered.filter(o => o.alive && o.tetherT > now);
    if (this.tethered.length < TUNE.TETHER.max) this.linkCalled = false;
  },

  // ---------------------------------------------------------------- mini-nuke ----
  // A slow lobbed shell (240 px/s) that goes off on whatever it touches: radius 120, 220 at the centre falling to 40,
  // 45 to you if you're caught in it, crates and girders torn up. A blinding flash and a mushroom of smoke. 3.5 s.
  updateNukes(dt, now) {
    for (let i = this.nukes.length - 1; i >= 0; i--) {
      const N = this.nukes[i]; N.t -= dt; N.vy += 420 * dt;
      const nx = N.x + N.vx * dt, ny = N.y + N.vy * dt, e = this.enemyAt(nx, ny, 3);
      if (N.t <= 0 || ny > LH || this.solidAt(nx, ny) || (e && !e.under)) { this.nukes.splice(i, 1); this.nukeBlast(N.x, N.y); continue; }
      N.x = nx; N.y = ny;
      if (Math.random() < 0.7) this.fx.emit(N.x, N.y, { n: 1, angle: Math.atan2(-N.vy, -N.vx), spread: 0.4, speed: [20, 60], life: [0.3, 0.6], size: [3, 6], cols: [0x77706a, 0x55504c], alpha: [0.5, 0], g: -20 });
    }
  },
  nukeBlast(x, y) {
    const k0 = this.stats.kills;
    this.explode(x, y, TUNE.NUKE.boom);
    BUS.emit('flash', 0.6); this.impactFrame(3); this.shake(900, 0.02); this.zoomPunch = Math.max(this.zoomPunch, 0.12); this.warpPulse(1); Sfx.nuke();
    this.spawnLight(x, y, 'glow', 0xfff0c0, 4, 7, 1, 0.8); this.spawnLight(x, y, 'ring', 0xffd080, 0.5, 6, 1, 0.6);
    for (let i = 0; i < 6; i++) this.time.delayedCall(i * 90, () => { this.fxFire(x + rand(-30, 30), y - i * 12, 10); this.fxSmoke(x + rand(-20, 20), y - 20 - i * 14, 6, 2); });
    this.time.delayedCall(60, () => { const n = this.stats.kills - k0; if (n >= 3) { BUS.emit('callout', 'NUKED x' + n); this.addStyle(40 * n); } if (n >= 5) this.award('nukeit'); });
  },

  // ================================================================== rush round ====
  // ---------------------------------------------------------------- riot shield ----
  // Hold: a plate of hard light in front of you (+/-0.75 rad, 22 px): enemy shots that reach it are reflected back
  // along their path as yours (a parry slug), rockets and bombs are stopped dead; you move at 60%. Let go: a shield
  // bash (30 and a big shove to anything in front, 0.5 s cooldown).
  shieldTrigger(trig, now, dt) {
    const T = TUNE.SHIELD, a = this.aim, sx = this.shoulder.x, sy = this.shoulder.y;
    const front = (x, y, pad) => { const dx = x - sx, dy = y - sy, d = Math.hypot(dx, dy); if (d > T.reach + pad) return false; const an = Math.atan2(dy, dx) - a; return Math.abs(Math.atan2(Math.sin(an), Math.cos(an))) < T.arc + 0.2; };
    if (trig && this.state !== 'dead') {
      if (now >= this.shieldUntil) Sfx.ui();
      this.shieldUntil = now + 90; this.shieldHeld = true;
      for (const list of [this.ebulletList, this.boltList]) for (const q of list) {
        if (!q.active || !front(q.x, q.y, 6)) continue;
        const x = q.x, y = q.y, v = q.body.velocity, back = Math.atan2(-v.y, -v.x); q.disableBody(true, true);
        this.spawnBullet('parry', x, y, back, 560, Math.max(12, (q.dmg || 8) * 1.5), 1.2);
        this.fxSparks(x, y, 5, back, 0.8, [80, 200]); this.shieldBlockT = now; Sfx.shieldBlock(); this.addStyle(8);
      }
      for (const q of this.eprojList) if (q.active && front(q.x, q.y, 8)) { q.disableBody(true, true); q.glow.setVisible(false); this.fxSparks(q.x, q.y, 10, a + Math.PI, 1.4, [80, 240]); this.shieldBlockT = now; Sfx.clang(0.6); this.addStyle(12); }
      for (const D of this.discs) if (!D.mine && front(D.x, D.y, 6)) { D.mine = true; D.st = 'back'; this.shieldBlockT = now; Sfx.clang(0.5); }
      return;
    }
    if (this.shieldHeld) {                                                // let go: BASH
      this.shieldHeld = false;
      if (now < this.nextFire) return;
      this.nextFire = now + T.cooldown; this.stats.shots++;
      const pb = this.player.body, ca = Math.cos(a), sa = Math.sin(a); pb.velocity.x += ca * 220; let n = 0;
      for (const e of this.enemies.getChildren()) {
        if (!e.alive || e.under || !front(e.body.center.x, e.body.center.y, Math.max(e.body.halfWidth, e.body.halfHeight) + 22)) continue;   // the bash reaches further than the block
        n++; this.stats.hits++;
        if (this.canExecute(e)) { this.execute(e, ca >= 0 ? 1 : -1); continue; }
        this.damageEnemy(e, T.bash, ca, sa, 'kick');
        if (e.alive && !e.def.anchored && e.def.kb > 0) { const kb = Math.max(0.3, e.def.kb); e.body.velocity.x = ca * T.push * kb; e.body.velocity.y = -180 * kb; e.kickedT = 0.6; e.stunT = Math.max(e.stunT, 0.6); }
      }
      Sfx.whoosh(); if (n) { Sfx.kickHit(); this.hitStop(60); this.shake(110, 0.006); if (n >= 2) { BUS.emit('callout', 'SHIELD BASH'); this.addStyle(30); } }
      this.recoil = -4; this.addKick(ca * 3, sa * 3);
    }
  },

  // ---------------------------------------------------------------- glue gun ----
  // Amber globs (340 px/s, a slight arc): a foe hit is gummed up for 3 s and crawls at 35% (and can barely jump); a
  // glob that lands on a floor leaves a 6 s puddle that gums up anything walking through it.
  updateGlobs(dt, now) {
    const T = TUNE.GLUE;
    for (let i = this.globs.length - 1; i >= 0; i--) {
      const G = this.globs[i]; G.t -= dt; G.vy += 500 * dt;
      const nx = G.x + G.vx * dt, ny = G.y + G.vy * dt, e = this.enemyAt(nx, ny, 2);
      if (e && !e.under) { this.damageEnemy(e, T.dmg, Math.sign(G.vx) || 1, 0, 'pellet'); if (e.alive) e.glueT = Math.max(e.glueT || 0, T.glueT); this.stats.hits++; this.fx.emit(nx, ny, { n: 8, speed: [30, 90], life: [0.2, 0.4], size: [2, 1], cols: [0xffd040, 0xc89a20], g: 300 }); this.globs.splice(i, 1); continue; }
      if (this.solidAt(nx, ny) || G.t <= 0) {
        if (this.standAt(nx, ny + 2) || this.solidAt(nx, ny + 3)) { const fy = Math.floor((ny + 2) / TS) * TS; this.gluePuds.push({ x: nx, y: fy, w: T.pudW, t: T.pud }); }
        this.fx.emit(G.x, G.y, { n: 6, speed: [20, 70], life: [0.2, 0.4], size: [2, 1], cols: [0xffd040, 0xc89a20], g: 300 }); Sfx.glue(); this.globs.splice(i, 1); continue;
      }
      G.x = nx; G.y = ny;
    }
    const gg = this.iceG;                                                 // puddles: drawn with the ice sheets
    for (let i = this.gluePuds.length - 1; i >= 0; i--) {
      const P = this.gluePuds[i]; P.t -= dt; if (P.t <= 0) { this.gluePuds.splice(i, 1); continue; }
      const a = Math.min(1, P.t / 0.6); gg.fillStyle(0xc89a20, 0.7 * a).fillRect(P.x - P.w / 2, P.y - 2, P.w, 3); gg.fillStyle(0xffd040, 0.8 * a).fillRect(P.x - P.w / 2 + 2, P.y - 2, P.w - 4, 1);
      for (const e of this.enemies.getChildren()) if (e.alive && !FLIERS.has(e.kind) && Math.abs(e.body.center.x - P.x) < P.w / 2 + 2 && Math.abs(e.body.bottom - P.y) < 5) e.glueT = Math.max(e.glueT || 0, 0.5);
    }
  },

  // ---------------------------------------------------------------- gas launcher ----
  // A lobbed canister (1 s fuse, or on contact) that bursts into a big cloud of your own gas: it spares you, eats metal
  // as well as meat (5 per 0.4 s, and corrodes what it touches) and goes up in a fireball if anything lights it.

  // ---------------------------------------------------------------- bubble gun ----
  // Slow soap bubbles (200 px/s, drifting up) that trap the first foe they touch: it floats up helpless for 2.2 s,
  // then the bubble bursts and it drops (30 when it lands). Hit a bubbled foe and the bubble pops early. Fliers, bosses
  // and anything over 200 HP just take 12.
  updateBubbles(dt, now) {
    const T = TUNE.BUBBLE;
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const B = this.bubbles[i]; B.t -= dt; B.w += dt * 9;
      B.vy -= 30 * dt; B.vx *= Math.pow(0.7, dt); B.x += B.vx * dt + Math.sin(B.w) * 0.3; B.y += B.vy * dt;
      if (B.t <= 0 || this.solidAt(B.x, B.y)) { this.popBubbleFx(B.x, B.y, 4); this.bubbles.splice(i, 1); continue; }
      const e = this.enemyAt(B.x, B.y, 3);
      if (!e || e.under || e.bubbleUntil > now) continue;
      this.bubbles.splice(i, 1); this.stats.hits++;
      if (FLIERS.has(e.kind) || e.def.noClip || e.def.hp > T.big || e.def.boss || e.def.miniBoss || e.kind === 'burrower' || e.kind === 'turret' || e.frozen > 0 || e.stasisT > 0 || e.gravT > 0) {
        this.popBubbleFx(B.x, B.y, 6); this.damageEnemy(e, T.dmg, Math.sign(B.vx) || 1, 0, 'pellet'); continue;
      }
      const b = e.body; e.gravT = T.float; e.gravSlam = false; b.setAllowGravity(false); b.setVelocity(b.velocity.x * 0.2, -T.rise); e.bubbleUntil = now + T.float * 1000;
      this.damageEnemy(e, 4, 0, -1, 'net'); Sfx.bubble();
      if (!this.bubbled) { this.bubbled = true; BUS.emit('callout', 'BUBBLED'); }
    }
  },
  popBubbleFx(x, y, r) { this.fx.emit(x, y, { n: 8, speed: [30, 90], life: [0.15, 0.3], size: [1, 1], cols: [0xffffff, 0xc8f0ff], add: true }); if (r > 5) this.spawnLight(x, y, 'ring', 0xc8f0ff, 0.2, r / 16, 0.8, 0.15); Sfx.bubblePop(); },

  // ================================================================== mutator round ====
  // ---------------------------------------------------------------- tripwire ----
  // A thrown emitter (320 px/s, falling) that sticks to the first surface it hits and projects a laser straight out
  // from it (to the next wall, 400 px at most). Anything crossing the beam is zapped (25, a 0.5 s stun); four zaps
  // and it blows. Two can be set at once: a third sets off the oldest.
  updateTrips(dt, now) {
    const T = TUNE.TRIPWIRE;
    for (let i = this.trips.length - 1; i >= 0; i--) {
      const W = this.trips[i];
      if (W.st === 'fly') {
        W.t += dt; W.vy += 600 * dt; const nx = W.x + W.vx * dt, ny = W.y + W.vy * dt;
        if (W.t > 3 || ny > LH) { this.trips.splice(i, 1); continue; }
        if (!this.solidAt(nx, ny)) { W.x = nx; W.y = ny; continue; }
        const hx = this.solidAt(nx, W.y), hy = this.solidAt(W.x, ny);
        W.ux = hx && !hy ? -Math.sign(W.vx) : 0; W.uy = W.ux ? 0 : -(Math.sign(W.vy) || 1);   // the beam points out of the face it stuck to
        let ex = W.x, ey = W.y; for (let d = 4; d < T.len; d += 3) { ex = W.x + W.ux * d; ey = W.y + W.uy * d; if (this.solidAt(ex, ey)) break; }
        W.x1 = ex; W.y1 = ey; W.st = 'set'; Sfx.tripSet(); this.spawnLight(W.x, W.y, 'glow', 0xff3020, 0.6, 1.2, 0.8, 0.15);
        continue;
      }
      let gone = false;
      for (const e of this.enemies.getChildren()) {
        if (!e.alive || e.under || (W.hitT.get(e) || 0) > now) continue;
        const b = e.body;
        const cross = W.ux ? (b.top < W.y && b.bottom > W.y && b.right > Math.min(W.x, W.x1) && b.left < Math.max(W.x, W.x1))
                           : (b.left < W.x && b.right > W.x && b.bottom > Math.min(W.y, W.y1) && b.top < Math.max(W.y, W.y1));
        if (!cross) continue;
        W.hitT.set(e, now + 700); W.n++;
        const zx = W.ux ? b.center.x : W.x, zy = W.ux ? W.y : b.center.y;
        this.damageEnemy(e, T.zap, 0, -1, 'arc'); if (e.alive) e.stunT = Math.max(e.stunT, 0.5);
        if (!W.counted) { W.counted = true; this.stats.hits++; }        // one emitter, one shot
        this.fxSparks(zx, zy, 8); this.pylonZaps.push({ x0: W.x, y0: W.y, x1: zx, y1: zy, t: now }); Sfx.pylonZap();
        if (W.n >= T.trips) { this.explode(W.x, W.y, T.boom, !W.counted); this.trips.splice(i, 1); gone = true; break; }
      }
      if (gone) continue;
    }
  },

  // ---------------------------------------------------------------- drone pod ----
  // Two little gun drones that orbit you for 10 s, each firing a nail (8) at the nearest foe it can see within 260 px
  // every 0.4 s. Firing it again while they're up tops their timer back up.
  fireDronePod(now, mx, my) {
    const T = TUNE.DRONEPOD;
    this.stats.shots++; Sfx.dronePod(); this.recoil = 3; this.spawnLight(mx, my, 'glow', 0x46e6ff, 0.6, 1.4, 0.8, 0.15);
    if (this.allies.length) { for (const A of this.allies) A.t = T.life; return; }
    for (let k = 0; k < T.n; k++) this.allies.push({ ang: k * Math.PI, t: T.life, fireT: 0.3 + k * 0.2, x: mx, y: my, face: 1 });
    this.fx.emit(mx, my, { n: 10, speed: [40, 120], life: [0.2, 0.4], size: [2, 1], cols: [0xffffff, 0x46e6ff], add: true });
  },
  updateAllies(dt, now) {
    const T = TUNE.DRONEPOD;
    for (let i = this.allies.length - 1; i >= 0; i--) {
      const A = this.allies[i]; A.t -= dt; A.ang += dt * 2.4;
      if (A.t <= 0 || this.state === 'dead') { this.fx.emit(A.x, A.y, { n: 8, speed: [30, 100], life: [0.2, 0.4], size: [2, 1], cols: [0xc8d0da, 0x46e6ff], add: true }); this.allies.splice(i, 1); continue; }
      const px = this.player.x + Math.cos(A.ang) * T.orbit, py = this.player.y - 18 + Math.sin(A.ang) * 10, k = Math.min(1, dt * 8);
      A.x += (px - A.x) * k; A.y += (py - A.y) * k;
      if ((A.fireT -= dt) > 0) continue;
      let tgt = null, bd = T.range;
      for (const e of this.enemies.getChildren()) { if (!e.alive || e.under) continue; const d = Math.hypot(e.body.center.x - A.x, e.body.center.y - A.y); if (d < bd && this.los(A.x, A.y, e.body.center.x, e.body.center.y)) { bd = d; tgt = e; } }
      if (!tgt) { A.fireT = 0.15; continue; }
      A.fireT = T.rate; const a = Math.atan2(tgt.body.center.y - A.y, tgt.body.center.x - A.x); A.face = Math.cos(a) >= 0 ? 1 : -1;
      this.spawnBullet('nail', A.x, A.y, a, 520, T.dmg, 0.8); this.spawnLight(A.x, A.y, 'glow', 0xffc060, 0.3, 0.8, 0.7, 0.06);
      if (Math.random() < 0.5) Sfx.tink(0.25);
    }
  },

  // ================================================================== foreman round ====
  // ---------------------------------------------------------------- rocket gauntlet ----
  // A thruster punch: you rocket forward along your aim (a dash, half again as far, with its i-frames, but it doesn't
  // spend your dash). The first foe in the way takes 45 and is launched (into walls for a splat) and anything else
  // within 34 px takes 15; you bounce back off it. Glowing foes are executed.
  rocketPunch(now, a, ca, sa) {
    const pb = this.player.body, onG = pb.blocked.down || pb.touching.down, dr = this.dashReady, da = this.dashAir;
    this.startDash(now, ca, onG && sa > 0 ? 0 : sa, onG); this.dashReady = dr; this.dashAir = da;
    this.dashVx *= TUNE.GAUNTLET.boost; this.dashVy *= TUNE.GAUNTLET.boost;
    this.punchUntil = this.dashUntil + 30; this.punchHit = false; this.punchDir = [Math.cos(Math.atan2(this.dashVy, this.dashVx)), Math.sin(Math.atan2(this.dashVy, this.dashVx))];
    this.stats.shots++; Sfx.gauntlet(); this.recoil = -4; this.shake(60, 0.004);
    this.fxFire(this.shoulder.x - ca * 8, this.shoulder.y - sa * 8, 6); this.fxSmoke(this.shoulder.x - ca * 10, this.shoulder.y - sa * 10, 3);
  },
  updatePunch(dt, now) {
    if (now >= this.punchUntil || this.punchHit || this.state === 'dead') return;
    const T = TUNE.GAUNTLET, pb = this.player.body, [ux, uy] = this.punchDir, fx = pb.center.x + ux * 10, fy = pb.center.y + uy * 8;
    if (Math.random() < 0.8) this.fxFire(pb.center.x - ux * 8, pb.center.y - uy * 8, 1);
    for (const k of this.barrelList) if (k.active && Math.abs(k.x - fx) < 10 && Math.abs(k.y - fy) < 12) { k.body.velocity.x = ux * 480; k.body.velocity.y = -200; k.kicked = true; }
    if (this.props) this.hitPropsAt(fx, fy, ux, uy, T.dmg, 'punch' + this.punchUntil);
    for (const e of this.enemies.getChildren()) {
      if (!e.alive || e.under) continue;
      const b = e.body; if (fx < b.left - 6 || fx > b.right + 6 || fy < b.top - 8 || fy > b.bottom + 8) continue;
      this.punchHit = true; this.dashUntil = now; this.stats.hits++;
      if (this.canExecute(e)) { this.execute(e, ux >= 0 ? 1 : -1); return; }
      this.damageEnemy(e, T.dmg, ux, uy, 'kick');
      if (e.alive && !e.def.anchored && e.def.kb > 0) { const kb = Math.max(0.3, e.def.kb); b.velocity.x = ux * T.push * kb; b.velocity.y = uy * 200 - 180 * kb; e.kickedT = 0.7; e.stunT = Math.max(e.stunT, 0.6); }
      for (const o of this.enemies.getChildren()) if (o.alive && o !== e && !o.under && Math.hypot(o.body.center.x - fx, o.body.center.y - fy) < 34) this.damageEnemy(o, T.splash, Math.sign(o.body.center.x - fx) || 1, -0.4, 'pellet');
      pb.velocity.x = -ux * 120; pb.velocity.y = -80;
      this.hitStop(90); this.shake(160, 0.008); Sfx.punchHit(); BUS.emit('callout', 'HAYMAKER'); this.addStyle(50); this.zoomPunch = Math.max(this.zoomPunch, 0.06);
      this.fxSparks(fx, fy, 12, Math.atan2(uy, ux), 1, [100, 300]); this.spawnLight(fx, fy, 'glow', 0xffa040, 1.2, 2, 0.9, 0.2);
      return;
    }
  },

  // ---------------------------------------------------------------- marksman rifle ----
  // A scoped rifle with a laser sight: a hitscan round (900 px) for 80, x3 on a headshot, that punches through the
  // first body into one more (60% to the second). A headshot kill buys a beat of slow-mo. 1 s between shots.
  fireMarksman(now, ox, oy, a, mx, my) {
    const W = TUNE.MARKSMAN, sx = this.shoulder.x, sy = this.shoulder.y, ca = Math.cos(a), sa = Math.sin(a), hits = [];
    this.stats.shots++;
    let x = sx, y = sy, wall = false;
    for (let d = 4; d < W.range; d += 3) {
      x = sx + ca * d; y = sy + sa * d;
      if (this.solidAt(x, y)) { wall = true; break; }
      const e = this.enemyAt(x, y, 1); if (e && !e.under && !hits.some(h => h.e === e)) { hits.push({ e, x, y }); if (hits.length >= 2) break; }
    }
    this.beams.push({ x0: ox, y0: oy, x1: x, y1: y, t: 0, dur: 0.2, col: 'rev' });
    hits.forEach((h, k) => {
      const e = h.e;
      if (this.shieldBlocks(e, ca, h.y)) { this.fxSparks(h.x, h.y, 6, a + Math.PI, 1.2); Sfx.clang(0.6); return; }
      const hs = (isHumanoid(e) || e.kind === 'jet') && h.y < e.body.top + 5;
      this.stats.hits++;
      if (e.def.mech) this.fxSparks(h.x, h.y, 6, a + Math.PI, 1.6); else { this.fxBlood(h.x, h.y, 7, a, 0.9, [60, 240]); if (hs) this.fxBlood(h.x, h.y, 7, -Math.PI / 2, 1, [40, 180]); }
      this.damageEnemy(e, W.dmg * (k ? W.pierce : 1) * (hs ? W.head : 1), ca, sa, 'rail', hs);
      if (hs && !e.alive) { BUS.emit('callout', 'HEADSHOT'); this.slowmoUntil = Math.max(this.slowmoUntil, now + 260); this.addStyle(60); }
    });
    if (wall) { this.fxSparks(x - ca * 2, y - sa * 2, 6, a + Math.PI, 1.2); this.paintHole(x, y); this.damageTile(Math.floor(x / TS), Math.floor(y / TS), 30); }
    Sfx.marksman(); this.recoil = 8; this.muzzle(mx, my, a, 1.3, 60); this.fxSmoke(mx, my, 4); this.shake(110, 0.006); this.addKick(-ca * 6, -sa * 6);
    this.time.delayedCall(300, () => { if (this.state !== 'dead') this.spawnShell(); });
  },

  // ================================================================== expansion: weapons ====
  // Ten wheel-only guns for the full arsenal (OVERTIME, DAILY, BOSS RUSH and the Lab); the campaign never issues them.
  // Whatever one leaves behind (a ball still rolling, a quake, a tornado, caltrops, a barrage) credits its kills to the
  // gun that made it, not the one in hand: xwHit and xwBoom set creditW for the hit, and killEnemy reads it.
  initExpansionWeapons() {
    this.cannonballs = []; this.quakes = []; this.phaseBolts = []; this.lballs = []; this.cyclones = []; this.caltrops = []; this.spear = null; this.barrages = [];
    this.hrHeat = 0; this.hrVentUntil = 0; this.hrLock = 0; this.hrTarget = null; this.hrOnUntil = 0; this.hrBeam = null; this.hrScorchT = 0;
    this.hydroUntil = 0; this.hydroJet = null; this.hydroPud = 0; this.xwFoes = new Set(); this.creditW = null;
    this.xwFloorG = this.add.graphics().setDepth(4.98);                 // quake cracks and rocks, barrage markers: on the floor, behind the foes
    this.xwG = this.add.graphics().setDepth(8.6);                       // cables, the cyclone's funnel, falling shells, the water jet
    this.xwAG = this.add.graphics().setDepth(16).setBlendMode(ADD);     // phase tracers, arcs, the heat ray
    this.hrGlow = this.add.image(0, 0, 'glow').setBlendMode(ADD).setTint(0xff6020).setDepth(18).setVisible(false);
  },
  xwHit(e, dmg, dx, dy, src, wid, hs) {                                 // a hit on behalf of one of these guns (see creditW)
    const c = this.creditW; this.creditW = wid;
    try { this.damageEnemy(e, dmg, dx, dy, src, hs); } finally { this.creditW = c; }
  },
  xwBoom(x, y, W, wid, countHit) {
    const c = this.creditW; this.creditW = wid;
    try { this.explode(x, y, W, countHit); } finally { this.creditW = c; }
  },
  xwBonus(e, src) {                                                     // damageEnemy asks: a quake-launched foe still in the air, a soaked one zapped
    const now = this.time.now, b = e.body; let k = 1;
    if (e.juggleUntil > now && src !== 'burn' && src !== 'quake' && !(b.blocked.down || b.touching.down)) {
      k *= TUNE.QUAKE.bonus;
      this.fx.emit(b.center.x, b.center.y, { n: 3, speed: [30, 90], life: [0.15, 0.3], size: [2, 1], cols: [0xffffff, 0xffe080, 0xffa030], add: true, cosmetic: true });
    }
    if (e.soakUntil > now && (src === 'arc' || src === 'shock')) {
      k *= TUNE.HYDRO.zap;
      this.fx.emit(b.center.x, b.center.y, { n: 6, speed: [40, 140], life: [0.1, 0.25], size: [2, 1], cols: [0xffffff, 0xc8f4ff, 0x46c8ff], add: true, cosmetic: true });
    }
    return k;
  },
  juggleKill(e) {                                                       // killEnemy: a foe the quake threw up, finished before it lands
    BUS.emit('callout', 'JUGGLE!'); this.addStyle(60);
    this.spawnLight(e.body.center.x, e.body.center.y, 'ring', 0xffd080, 0.2, 1.4, 0.9, 0.2);
  },
  xwPropAt(x, y) { for (const p of this.props || []) if (p.st === 'ok' && Math.abs(x - p.cx) <= p.hw && Math.abs(y - p.cy) <= p.hh) return p; return null; },   // thrown things stop at scenery
  xwDrop() {                                                            // setWeapon: let go of what the held guns hold
    this.hrTarget = null; this.hrLock = 0; this.hrOnUntil = 0; this.hydroUntil = 0;
    if (this.spear) this.spearDrop();
  },
  updateExpansionWeapons(dt, now) {
    this.xwFloorG.clear(); this.xwG.clear(); this.xwAG.clear();
    this.updateCannonballs(dt, now); this.updateQuakes(dt, now); this.updatePhaseBolts(dt, now); this.updateLBalls(dt, now); this.updateCyclones(dt, now);
    this.updateCaltrops(dt, now); this.updateSpear(dt, now); this.updateHeatRay(dt, now); this.updateBarrages(dt, now); this.updateHydro(dt, now);
  },

  // ---------------------------------------------------------------- hand cannon ----
  // A heavy iron ball on a gravity arc (400 px/s): 60 to the first body, and it plows on through light foes, three in all,
  // keeping 72% of its speed and punch after each and throwing them about (360; a wall makes a splat). Crates and girders
  // it meets take 80 and usually give; a heavy foe, a boss or grey metal bounces it. It kicks: 300 px/s back on the
  // ground, a full cannon-jump in the air (400 along the reverse of the shot).
  fireCannon(now, ox, oy, a, mx, my) {
    const T = TUNE.CANNON, ca = Math.cos(a), sa = Math.sin(a), pb = this.player.body;
    this.stats.shots++;
    this.cannonballs.push({ x: ox, y: oy, vx: ca * T.speed, vy: sa * T.speed - T.lift, t: T.life, k: 1, n: 0, hits: new Set(), hit: false, bounces: 0, tok: {}, rest: -1,
      img: this.add.image(ox, oy, 'xw_ball').setDepth(9) });
    if (pb.blocked.down || pb.touching.down) { pb.velocity.x -= ca * T.recoil; if (sa > 0.6) { pb.velocity.y = -sa * T.jump * 0.8; this.jumpCuttable = false; this.lastGround = -1e9; } }
    else { pb.velocity.x -= ca * T.jump; pb.velocity.y = Math.max(-T.maxRise, Math.min(pb.velocity.y, 0) - sa * T.jump); this.jumpCuttable = false; this.lastGround = -1e9; }
    this.recoil = 9; Sfx.cannon();
    this.muzzle(mx, my, a, 1.9, 90); this.fxSmoke(mx, my, 10, 1.3); this.fxSmoke(this.shoulder.x, this.shoulder.y, 3, 0.6); this.fxFire(mx, my, 6);
    this.fxSparks(mx, my, 10, a, 0.7, [100, 300]);
    this.fx.emit(mx, my, { n: 10, angle: a, spread: 0.5, speed: [60, 200], life: [0.4, 0.8], size: [3, 8], cols: [0xa09a90, 0x77706a, 0x55504c], alpha: [0.6, 0], drag: 3, g: -20 });
    this.shake(170, 0.01); this.addKick(-ca * 9, -sa * 9); this.zoomPunch = Math.max(this.zoomPunch, 0.04); this.hitStop(30);
  },
  updateCannonballs(dt, now) {
    const T = TUNE.CANNON;
    for (let i = this.cannonballs.length - 1; i >= 0; i--) {
      const B = this.cannonballs[i];
      if (B.rest >= 0) {                                                 // spent: it sits a moment, then fades
        B.rest -= dt; B.img.setAlpha(clamp(B.rest / 0.4, 0, 1));
        if (B.rest <= 0) { B.img.destroy(); this.cannonballs.splice(i, 1); }
        continue;
      }
      B.t -= dt; B.vy += T.grav * dt;
      const sp0 = Math.hypot(B.vx, B.vy), n = Math.max(1, Math.ceil(sp0 * dt / 3));
      let stop = false;
      for (let s = 0; s < n && !stop; s++) {
        const nx = B.x + B.vx * dt / n, ny = B.y + B.vy * dt / n, sp = Math.hypot(B.vx, B.vy) || 1, ux = B.vx / sp, uy = B.vy / sp;
        if (this.solidAt(nx, ny)) {
          const tx = Math.floor(nx / TS), ty = Math.floor(ny / TS);
          if (TILE_HP[this.tileAt(tx, ty)] && sp > 160 && this.damageTile(tx, ty, T.tile * B.k)) { B.vx *= 0.8; B.vy *= 0.8; B.k *= 0.85; this.shake(90, 0.005); Sfx.cannonHit(0.8); }   // smashed through
          if (this.solidAt(nx, ny)) { stop = this.cannonBounce(B, nx, ny, sp); break; }
        }
        B.x = nx; B.y = ny;
        for (const e of this.enemies.getChildren()) {                   // bodies: once each, plowed through or bounced off
          if (!e.alive || e.under || B.hits.has(e) || B.k < 0.2) continue;
          const b = e.body;
          if (B.x < b.left - 3 || B.x > b.right + 3 || B.y < b.top - 3 || B.y > b.bottom + 3) continue;
          B.hits.add(e);
          if (this.shieldBlocks(e, B.vx, B.y)) { e.ai = 'stagger'; e.aiUntil = now + 900; this.fxSparks(B.x, B.y, 10, Math.atan2(-uy, -ux), 1.2, [80, 240]); Sfx.clang(); B.vx *= -0.35; B.vy = -140; B.k = 0.1; continue; }
          if (!B.hit) { B.hit = true; this.stats.hits++; }
          const heavy = e.def.anchored || e.def.kb < 0.45 || e.def.hp > 150 || e.def.noClip;
          if (e.def.mech) this.fxSparks(B.x, B.y, 12, Math.atan2(uy, ux), 1, [80, 280]); else { this.fxBlood(B.x, B.y, 14, Math.atan2(uy, ux), 0.8, [100, 320]); this.fxBlood(B.x, B.y, 6, Math.atan2(-uy, -ux), 1.2, [40, 140]); }
          this.xwHit(e, T.dmg * B.k, ux, uy, 'cannon', 'cannon');
          if (e.alive && !heavy) { const kb = Math.max(0.35, e.def.kb); b.velocity.x += ux * T.knock * kb * B.k; b.velocity.y = Math.min(b.velocity.y, (uy - 0.6) * T.knock * 0.6 * kb); e.stunT = Math.max(e.stunT, 0.6); e.kickedT = 0.5; }
          Sfx.cannonHit(); this.hitStop(45); this.shake(110, 0.006); this.spawnLight(B.x, B.y, 'ring', 0xfff0d0, 0.2, 1.3, 0.8, 0.16);
          B.n++;
          if (heavy || B.n >= T.pierce) { B.vx *= -0.3; B.vy = -150; B.k = 0.1; Sfx.clang(0.6); }
          else { B.vx *= T.keep; B.vy *= T.keep; B.k *= T.keep; }
        }
        for (const k of this.barrelList) if (k.active && !B.hits.has(k) && Math.abs(k.x - B.x) < 7 && Math.abs(k.y - B.y) < 9) { B.hits.add(k); this.damageBarrel(k, 40 * B.k); k.body.velocity.x += ux * 260; k.body.velocity.y -= 160; }
        if (B.k >= 0.2) this.propHitAt(B.x, B.y, ux, uy, T.dmg * B.k * 0.7, B.tok);   // scenery: each piece once (tok)
        const rh = this.ragdolls.length ? this.ragAt(B.x, B.y, 2) : null;
        if (rh && !B.hits.has(rh.rd) && B.k >= 0.2) { B.hits.add(rh.rd); this.hitRagdoll(rh.rd, B.x, B.y, 50 * B.k, ux, uy, 'rail', rh.pi); }
      }
      if (stop) continue;
      if (B.t <= 0 || B.y > LH) { B.rest = 0.01; continue; }
      if (Math.random() < 0.6) this.fx.emit(B.x, B.y, { n: 1, speed: [4, 18], life: [0.3, 0.6], size: [2, 5], cols: [0x8a8580, 0x5a5652, 0x3a3836], alpha: [0.45, 0], g: -20, drag: 2 });
      B.img.setPosition(B.x, B.y).setRotation(B.img.rotation + B.vx * dt * 0.08);
    }
  },
  cannonBounce(B, nx, ny, sp) {                                        // grey metal or a crate that held: thud, bounce; slow enough and it's spent
    const hx = this.solidAt(nx, B.y), hy = this.solidAt(B.x, ny) || (!hx);
    if (hx) B.vx *= -0.35;
    if (hy) { B.vy *= -0.35; B.vx *= 0.75; }
    B.bounces++;
    if (sp > 120) {
      Sfx.cannonHit(Math.min(1, sp / 380)); this.fxDust(B.x, B.y, 6); this.fxSparks(B.x, B.y, 6, Math.atan2(-B.vy, -B.vx), 1.4, [60, 200]);
      this.shake(80, 0.004); this.paintScorch(nx, ny, 3); this.makeNoise(B.x, B.y, 200, true);
    }
    B.k *= 0.6;
    if (Math.hypot(B.vx, B.vy) < 90 || B.bounces > 3) { B.rest = 1.2; B.img.setPosition(B.x, B.y); return true; }
    return false;
  },

  // ---------------------------------------------------------------- seismic launcher ----
  // Thumps a quake into the floor at your feet that runs along it the way you aim (280 px/s, up to 400 px), climbing or
  // dropping single steps and stopping at walls and drop-offs. Every grounded foe it passes is popped into the air (24,
  // a 390 launch) and stays JUGGLE-able for 1.4 s: while it's airborne your hits do x1.5. Drums jump, scenery cracks.
  fireQuake(now, a, mx, my) {
    const T = TUNE.QUAKE, p = this.player, pb = p.body, dir = Math.cos(a) >= 0 ? 1 : -1;
    this.stats.shots++;
    let x = p.x + dir * 8, fy = this.floorBelow(x, pb.bottom - 4, 140);
    if (fy === null || this.solidAt(x, fy - 6)) { x = p.x; fy = this.floorBelow(x, pb.bottom - 4, 140); }
    if (fy !== null) {
      this.quakes.push({ x, y: fy, dir, dist: 0, hit: new Set(), counted: false, fxT: 0, rocks: [], rockD: 0, crackD: 0, done: 0 });
      this.fxDust(x, fy, 10);
      this.fx.emit(x, fy - 2, { n: 18, angle: -Math.PI / 2, spread: 1.4, speed: [60, 220], life: [0.3, 0.6], size: [3, 1], cols: [0xc8b8a0, 0x8a7a68, 0x5a4e44], g: 600, mode: 1 });
      this.paintScorch(x, fy + 2, 7); this.makeNoise(x, fy, 260, true);
    } else this.fxDust(mx, my, 6);
    this.recoil = 7; Sfx.quake(); this.muzzle(mx, my, a, 0.9, 50);
    this.spawnLight(x, (fy ?? my) - 4, 'glow', 0xffb060, 1.4, 2.6, 0.7, 0.2);
    this.shake(200, 0.008); this.addKick(0, 6); this.hitStop(35);
  },
  updateQuakes(dt, now) {
    const T = TUNE.QUAKE, G = this.xwFloorG;
    for (let i = this.quakes.length - 1; i >= 0; i--) {
      const Q = this.quakes[i];
      for (let k = Q.rocks.length - 1; k >= 0; k--) {                    // the rocks it throws up sink back behind it
        const R0 = Q.rocks[k]; R0.t += dt; const f = R0.t < 0.08 ? R0.t / 0.08 : Math.max(0, 1 - (R0.t - 0.08) / 0.4), h = R0.h * f;
        if (R0.t > 0.48) { Q.rocks.splice(k, 1); continue; }
        G.fillStyle(0x3a322c, 1).fillTriangle(R0.x - R0.w, R0.y, R0.x + R0.w, R0.y, R0.x + R0.lean, R0.y - h);
        G.fillStyle(0x8a7a68, 1).fillTriangle(R0.x - R0.w + 1, R0.y, R0.x, R0.y, R0.x + R0.lean, R0.y - h + 1);
        G.fillStyle(0xd8c4a0, 0.9).fillRect(Math.round(R0.x + R0.lean) - 1, Math.round(R0.y - h), 1, 1);
      }
      if (Q.done) { if (!Q.rocks.length) this.quakes.splice(i, 1); continue; }
      const step = T.speed * dt; let nx = Q.x + Q.dir * step, ny = Q.y;
      Q.dist += step;
      if (this.solidAt(nx, ny - 6)) ny = !this.solidAt(nx, ny - TS - 6) && !this.solidAt(Q.x, ny - TS - 6) ? ny - TS : null;   // one step up, or a wall
      else if (!this.standAt(nx, ny + 2)) ny = this.standAt(nx, ny + TS + 2) ? ny + TS : null;                                // one step down, or a drop-off
      if (ny === null || Q.dist > T.range) {                             // it runs out: one last heave of rock
        Q.done = 1; this.fxDust(Q.x, Q.y, 8);
        this.fx.emit(Q.x, Q.y - 2, { n: 12, angle: -Math.PI / 2 + Q.dir * 0.3, spread: 1.2, speed: [60, 200], life: [0.3, 0.6], size: [3, 1], cols: [0xc8b8a0, 0x8a7a68, 0x5a4e44], g: 600, mode: 1 });
        continue;
      }
      if (ny !== Q.y) this.fxDust(nx, ny, 4);
      Q.x = nx; Q.y = ny;
      if ((Q.rockD += step) > 6) {                                       // a rock spike pops every 6 px; a crack runs under it
        Q.rockD = 0; Q.rocks.push({ x: Q.x + rand(-2, 2), y: Q.y, w: rand(2.5, 5), h: rand(8, 17), lean: Q.dir * rand(0, 4), t: 0 });
        this.fx.emit(Q.x, Q.y - 1, { n: 3, angle: -Math.PI / 2 + Q.dir * 0.4, spread: 0.9, speed: [50, 170], life: [0.25, 0.5], size: [2, 1], cols: [0xc8b8a0, 0x8a7a68, 0x5a4e44], g: 600, mode: 1 });
        if (Math.random() < 0.4) this.fxDust(Q.x, Q.y, 1);
        const L = this.lvlCtx; L.globalCompositeOperation = 'source-atop'; L.fillStyle = '#0a0806';
        for (let k = 0; k < 6; k++) L.fillRect(Math.round(Q.x - Q.dir * k), Q.y + 1 + (Math.random() < 0.4 ? 1 : 0), 1, 1);
        L.globalCompositeOperation = 'source-over'; this.lvlMark(Q.x, Q.y, 6);
        const tx = Math.floor(Q.x / TS), ty = Math.floor((Q.y + 2) / TS), key = 't' + tx + ',' + ty;   // breakable floor it runs over: cracked once
        if (TILE_HP[this.tileAt(tx, ty)] && !Q.hit.has(key)) { Q.hit.add(key); this.damageTile(tx, ty, T.tile); }
      }
      if ((Q.fxT -= dt) <= 0) { Q.fxT = 0.2; Sfx.rumble(0.6); }
      for (const e of this.enemies.getChildren()) {
        if (!e.alive || e.under || Q.hit.has(e) || FLIERS.has(e.kind)) continue;
        const b = e.body;
        if (Math.abs(b.center.x - Q.x) > b.halfWidth + 7 || Math.abs(b.bottom - Q.y) > 10) continue;
        Q.hit.add(e);
        if (!Q.counted) { Q.counted = true; this.stats.hits++; }
        this.xwHit(e, T.dmg, 0, -1, 'quake', 'quake');
        this.fx.emit(b.center.x, b.bottom, { n: 12, angle: -Math.PI / 2, spread: 1, speed: [80, 240], life: [0.3, 0.6], size: [3, 1], cols: [0xffffff, 0xc8b8a0, 0x8a7a68], g: 600, mode: 1 });
        Sfx.quakePop(); this.hitStop(25);
        if (e.alive && !e.def.anchored && !e.def.noClip) {
          const kb = Math.max(0.35, e.def.kb); b.velocity.y = -T.launch * kb; b.velocity.x = Q.dir * 50 * kb; e.stunT = Math.max(e.stunT, 0.8); e.juggleUntil = now + T.juggle * 1000;
          this.spawnLight(b.center.x, b.bottom - 4, 'glow', 0xffc080, 0.8, 1.6, 0.7, 0.15);
        }
      }
      for (const kg of this.barrelList) if (kg.active && !Q.hit.has(kg) && Math.abs(kg.x - Q.x) < 8 && Math.abs(kg.y + 7 - Q.y) < 10) { Q.hit.add(kg); kg.body.velocity.y = -320; this.damageBarrel(kg, 10); }
      for (const p of this.props || []) if (p.st === 'ok' && !Q.hit.has(p) && p.D.mount === 'floor' && Math.abs(p.cx - Q.x) < p.hw + 4 && Math.abs(p.cy + p.hh - Q.y) < 10) { Q.hit.add(p); this.hitProp(p, 16, 'kick', Q.x, Q.y - 2, Q.dir, -1); }
      for (const g of this.gibList) if (g.active && Math.abs(g.x - Q.x) < 8 && Math.abs(g.y - Q.y) < 14 && !Q.hit.has(g)) { Q.hit.add(g); if (g.stuckT > 0) { g.stuckT = 0; g.body.setAllowGravity(true); } g.body.velocity.y = -rand(220, 360); g.body.angularVelocity = rand(-900, 900); }
      for (const rd of this.ragdolls) if (!Q.hit.has(rd) && Math.abs(rd.pts[2].x - Q.x) < 10 && Math.abs(rd.pts[2].y - Q.y) < 20) { Q.hit.add(rd); for (const q of rd.pts) { q.vy = -rand(240, 360); q.vx += Q.dir * rand(20, 60); } rd.asleep = false; }
    }
  },

  // ---------------------------------------------------------------- phase rifle ----
  // A violet bolt (820 px/s, 560 px) that slips through walls, floors and scenery as if they weren't there and pierces
  // up to three bodies (22 each, x1.5 to the head): it finds foes behind cover. It still clips drums and props it passes.
  firePhase(now, a, mx, my) {
    const T = TUNE.PHASE, ca = Math.cos(a), sa = Math.sin(a);
    this.stats.shots++;
    this.phaseBolts.push({ x: mx, y: my, vx: ca * T.speed, vy: sa * T.speed, d: 0, n: 0, hits: new Set(), hit: false, tok: {}, inWall: this.solidAt(mx, my), trail: [[mx, my]], fade: -1 });
    this.recoil = 4; Sfx.phase();
    this.spawnLight(mx, my, 'glow', 0xb070ff, 1.2, 2.2, 0.9, 0.12); this.spawnLight(mx, my, 'ring', 0xd8b0ff, 0.15, 0.9, 0.8, 0.14);
    this.fx.emit(mx, my, { n: 8, angle: a, spread: 0.9, speed: [40, 160], life: [0.15, 0.35], size: [2, 1], cols: [0xffffff, 0xe0c8ff, 0xa060ff, 0x5020a0], add: true, drag: 2 });
    this.shake(60, 0.003); this.addKick(-ca * 3, -sa * 3);
  },
  updatePhaseBolts(dt, now) {
    const T = TUNE.PHASE, G = this.xwAG;
    for (let i = this.phaseBolts.length - 1; i >= 0; i--) {
      const P = this.phaseBolts[i];
      if (P.fade >= 0) { P.fade -= dt; if (P.fade <= 0) { this.phaseBolts.splice(i, 1); continue; } }
      else {
        const sp = T.speed, n = Math.max(1, Math.ceil(sp * dt / 3)), ux = P.vx / sp, uy = P.vy / sp;
        for (let s = 0; s < n && P.fade < 0; s++) {
          P.x += P.vx * dt / n; P.y += P.vy * dt / n; P.d += sp * dt / n;
          const inW = this.solidAt(P.x, P.y);
          if (inW !== P.inWall) {                                        // phasing in or out: a violet ripple on the surface
            P.inWall = inW;
            this.fx.emit(P.x, P.y, { n: 6, speed: [20, 80], life: [0.2, 0.4], size: [2, 1], cols: [0xffffff, 0xd0a0ff, 0x8040e0], add: true, drag: 3 });
            if (Math.random() < 0.5) this.spawnLight(P.x, P.y, 'ring', 0xb070ff, 0.1, 0.6, 0.7, 0.12);
          }
          for (const e of this.enemies.getChildren()) {
            if (!e.alive || e.under || P.hits.has(e)) continue;
            const b = e.body;
            if (P.x < b.left - 2 || P.x > b.right + 2 || P.y < b.top - 2 || P.y > b.bottom + 2) continue;
            P.hits.add(e);
            if (!P.hit) { P.hit = true; this.stats.hits++; }
            const hs = (isHumanoid(e) || e.kind === 'jet') && P.y < b.top + 5;
            if (e.def.mech) this.fxSparks(P.x, P.y, 5, Math.atan2(uy, ux), 1.4); else this.fxBlood(P.x, P.y, 6, Math.atan2(uy, ux), 0.8, [60, 220]);
            this.fx.emit(P.x, P.y, { n: 8, speed: [40, 140], life: [0.15, 0.35], size: [2, 1], cols: [0xffffff, 0xe0c8ff, 0xa060ff], add: true, drag: 2 });
            this.xwHit(e, T.dmg * (hs ? T.head : 1), ux, uy, 'phase', 'phase', hs); Sfx.phaseHit();
            if (++P.n >= T.pierce) { P.fade = 0.12; break; }
          }
          for (const k of this.barrelList) if (k.active && !P.hits.has(k) && Math.abs(k.x - P.x) < 6 && Math.abs(k.y - P.y) < 8) { P.hits.add(k); this.damageBarrel(k, T.dmg); }
          this.propHitAt(P.x, P.y, ux, uy, T.dmg, P.tok);
          const rh = this.ragdolls.length ? this.ragAt(P.x, P.y, 1) : null;
          if (rh && !P.hits.has(rh.rd)) { P.hits.add(rh.rd); this.hitRagdoll(rh.rd, P.x, P.y, T.dmg, ux, uy, 'nail', rh.pi); }
          if (P.d >= T.range || P.x < -20 || P.x > LW + 20 || P.y < -20 || P.y > LH + 20) { P.fade = 0.12; this.fx.emit(P.x, P.y, { n: 6, speed: [10, 50], life: [0.2, 0.4], size: [2, 1], cols: [0xe0c8ff, 0x8040e0], add: true, drag: 2 }); }
        }
        P.trail.push([P.x, P.y]); if (P.trail.length > 7) P.trail.shift();
        if (Math.random() < 0.7) this.fx.emit(P.x, P.y, { n: 1, speed: [2, 14], life: [0.25, 0.5], size: [2, 1], cols: [0xe0c8ff, 0xa060ff, 0x5020a0], add: true, drag: 1 });
      }
      const fa = P.fade >= 0 ? P.fade / 0.12 : 1, tr = P.trail;              // the tracer: a fading violet streak, dimmer and flickering inside walls
      for (let k = 1; k < tr.length; k++) {
        const t = k / (tr.length - 1), wall = this.solidAt(tr[k][0], tr[k][1]), al = (wall ? 0.35 + 0.25 * Math.random() : 1) * t * fa;
        G.lineStyle(4, 0x6020c0, 0.35 * al).lineBetween(tr[k - 1][0], tr[k - 1][1], tr[k][0], tr[k][1]);
        G.lineStyle(2, 0xb070ff, 0.7 * al).lineBetween(tr[k - 1][0], tr[k - 1][1], tr[k][0], tr[k][1]);
        G.lineStyle(1, 0xf0e0ff, al).lineBetween(tr[k - 1][0], tr[k - 1][1], tr[k][0], tr[k][1]);
      }
      if (P.fade < 0) { G.fillStyle(0xffffff, 1).fillCircle(P.x, P.y, 1.5); G.fillStyle(0xb070ff, 0.5).fillCircle(P.x, P.y, 3); }
    }
  },

  // ---------------------------------------------------------------- ball lightning ----
  // A slow orb (70 px/s) that drifts along your aim, bouncing off walls, for 2.5 s. Every 0.22 s it arcs to up to three
  // foes within 80 px (7 each) and lights any puddle under it; then it bursts (radius 44, 45->15, electric).
  fireBallLight(now, ox, oy, a, mx, my) {
    const T = TUNE.BALLLIGHT, ca = Math.cos(a), sa = Math.sin(a);
    this.stats.shots++;
    this.lballs.push({ x: ox, y: oy, vx: ca * T.speed, vy: sa * T.speed, t: T.life, zapT: 0.08, arcs: [], hit: false, ph: rand(0, 6),
      img: this.add.image(ox, oy, 'xw_lball0').setBlendMode(ADD).setDepth(9), glow: this.add.image(ox, oy, 'glow').setBlendMode(ADD).setTint(0x4ab8ff).setScale(1.2).setAlpha(0.6).setDepth(18) });
    this.recoil = 4; Sfx.ballLaunch();
    this.spawnLight(mx, my, 'glow', 0x6ad0ff, 1.2, 2.4, 0.9, 0.15); this.spawnLight(mx, my, 'ring', 0xd8f4ff, 0.2, 1, 0.8, 0.15);
    this.fx.emit(mx, my, { n: 10, angle: a, spread: 1.2, speed: [40, 160], life: [0.15, 0.35], size: [2, 1], cols: [0xffffff, 0xc8f4ff, 0x4ab8ff], add: true, drag: 2 });
    this.shake(60, 0.003); this.addKick(-ca * 2.5, -sa * 2.5);
  },
  updateLBalls(dt, now) {
    const T = TUNE.BALLLIGHT, G = this.xwAG;
    for (let i = this.lballs.length - 1; i >= 0; i--) {
      const L = this.lballs[i]; L.t -= dt; L.ph += dt;
      const nx = L.x + L.vx * dt, ny = L.y + L.vy * dt + Math.sin(L.ph * 5) * 12 * dt;   // drifts with a lazy bob
      if (this.solidAt(nx, L.y)) L.vx = -L.vx; else L.x = nx;
      if (this.solidAt(L.x, ny)) L.vy = -L.vy; else L.y = ny;
      if ((L.zapT -= dt) <= 0) {
        L.zapT = T.rate;
        const near = [];
        for (const e of this.enemies.getChildren()) {
          if (!e.alive || e.under) continue;
          const d = Math.hypot(e.body.center.x - L.x, e.body.center.y - L.y);
          if (d < T.reach && this.los(L.x, L.y, e.body.center.x, e.body.center.y)) near.push([d, e]);
        }
        near.sort((p, q) => p[0] - q[0]);
        for (const [, e] of near.slice(0, T.n)) {
          const ex = e.body.center.x, ey = e.body.center.y;
          L.arcs.push({ x: ex, y: ey, t: 0.12 });
          this.xwHit(e, T.dmg, Math.sign(ex - L.x) || 1, 0, 'arc', 'balllight');
          this.fxSparks(ex, ey, 3, 0, Math.PI * 2, [40, 140]);
          if (!L.hit) { L.hit = true; this.stats.hits++; }
        }
        let left = T.n - Math.min(T.n, near.length);                    // spare arcs go to drums and scenery in reach
        for (const k of this.barrelList) if (left > 0 && k.active && Math.hypot(k.x - L.x, k.y - L.y) < T.reach && this.los(L.x, L.y, k.x, k.y)) { left--; L.arcs.push({ x: k.x, y: k.y - 4, t: 0.12 }); this.damageBarrel(k, T.dmg); }
        for (const p of this.props || []) if (left > 0 && p.st === 'ok' && Math.hypot(p.cx - L.x, p.cy - L.y) < T.reach + Math.max(p.hw, p.hh) && this.los(L.x, L.y, p.cx, p.cy)) { left--; L.arcs.push({ x: p.cx, y: p.cy, t: 0.12 }); this.hitProp(p, T.dmg, 'shot', p.cx, p.cy, Math.sign(p.cx - L.x) || 1, 0); }
        if (left < T.n) Sfx.ballZap();
        else if (Math.random() < 0.5) { const an = rand(0, Math.PI * 2), r = rand(12, 26); L.arcs.push({ x: L.x + Math.cos(an) * r, y: L.y + Math.sin(an) * r, t: 0.08 }); }   // a stray crackle
        if (this.waters.length) { const fy = this.floorBelow(L.x, L.y, 90); if (fy !== null && this.electrifyWater(L.x, fy, 20)) L.arcs.push({ x: L.x, y: fy - 1, t: 0.12 }); }   // a puddle under it goes live
      }
      for (let k = L.arcs.length - 1; k >= 0; k--) { const A = L.arcs[k]; A.t -= dt; if (A.t <= 0) { L.arcs.splice(k, 1); continue; } this.zapCol(G, L.x, L.y, A.x, A.y, 0x4ab8ff, 0xe8f8ff); }
      if (L.t <= 0) {                                                    // burst
        this.lballs.splice(i, 1); L.img.destroy(); L.glow.destroy();
        const h0 = this.stats.hits;
        this.xwBoom(L.x, L.y, T.boom, 'balllight', !L.hit);
        if (this.waters.length) { const fy = this.floorBelow(L.x, L.y, 90); if (fy !== null) this.electrifyWater(L.x, fy, 50); }
        for (let k = 0; k < 6; k++) { const an = k / 6 * Math.PI * 2 + rand(-0.3, 0.3); this.zapCol(G, L.x, L.y, L.x + Math.cos(an) * 40, L.y + Math.sin(an) * 40, 0x4ab8ff, 0xffffff); }
        Sfx.coilBoom(); if (this.stats.hits > h0) L.hit = true;
        continue;
      }
      const fl = L.t < 0.5 && Math.floor(L.t * 20) % 2;                 // it flickers as it's about to go
      L.img.setPosition(L.x, L.y).setTexture(Math.floor(now / 50) % 2 ? 'xw_lball1' : 'xw_lball0').setRotation(Math.floor(now / 90) * 1.3).setScale(fl ? 1.25 : 1);
      L.glow.setPosition(L.x, L.y).setScale(1.1 + Math.sin(now / 40) * 0.15 + (fl ? 0.4 : 0)).setAlpha(0.55 + Math.random() * 0.15);
      if (Math.random() < 0.5) this.fx.emit(L.x, L.y, { n: 1, speed: [10, 40], life: [0.15, 0.3], size: [2, 1], cols: [0xffffff, 0x9ae8ff, 0x2a8ad0], add: true });
    }
  },

  // ---------------------------------------------------------------- cyclone launcher ----
  // Lobs a turbine canister that spins up into a tornado where it lands and wanders the floor for 3 s (70 px/s, turning
  // at walls and edges). Light foes (140 HP or less) within 44 px are sucked in and whirled round it (15 DPS), gibs, corpses
  // and drums with them; heavier ones take half that and get shoved. When it blows out it flings everything it holds.
  fireCyclone(now, ox, oy, a, mx, my) {
    const T = TUNE.CYCLONE, ca = Math.cos(a), sa = Math.sin(a);
    this.stats.shots++;
    this.cyclones.push({ st: 'fly', x: ox, y: oy, vx: ca * T.speed + this.player.body.velocity.x * 0.2, vy: sa * T.speed - T.lift, dir: ca >= 0 ? 1 : -1, t: 2.5, caught: [], tick: 0, hit: false, age: 0, sndT: 0,
      img: this.add.image(ox, oy, 'xw_cyc').setDepth(9) });
    this.recoil = 4; Sfx.cycloneLaunch(); this.muzzle(mx, my, a, 0.8, 45); this.fxSmoke(mx, my, 3);
    this.fx.emit(mx, my, { n: 8, angle: a, spread: 1, speed: [40, 140], life: [0.2, 0.4], size: [2, 1], cols: [0xffffff, 0xd8e8f0, 0x9aa4b0], drag: 3 });
    this.shake(60, 0.003); this.addKick(-ca * 3, -sa * 3);
  },
  cycloneForm(C, x, y) {
    const T = TUNE.CYCLONE, live = this.cyclones.filter(o => o.st === 'spin');
    if (live.length >= T.max) this.cycloneEnd(live[0]);                 // two at most: the oldest blows itself out
    C.st = 'spin'; C.x = x; C.y = y; C.t = T.life; C.age = 0; C.img.destroy(); C.img = null;
    if (Math.abs(C.vx) > 20) C.dir = Math.sign(C.vx);
    this.fxDust(x, y, 10); Sfx.cyclone(1); this.spawnLight(x, y - 16, 'ring', 0xd8e8f0, 0.2, 1.4, 0.6, 0.25);
  },
  cycloneEnd(C) {
    const T = TUNE.CYCLONE, i = this.cyclones.indexOf(C); if (i >= 0) this.cyclones.splice(i, 1);
    if (C.img) C.img.destroy();
    if (C.st !== 'spin') return;
    for (const c of C.caught) {                                          // fling the lot
      const e = c.e; if (!e.alive) continue;
      const b = e.body, kb = Math.max(0.35, e.def.kb), out = Math.cos(c.ph) >= 0 ? 1 : -1;
      b.velocity.x = out * T.fling * kb * rand(0.7, 1); b.velocity.y = -T.fling * 0.6 * kb; e.stunT = Math.max(e.stunT, 0.6); e.kickedT = 0.7;
    }
    for (const g of this.gibList) if (g.active && Math.abs(g.x - C.x) < T.reach * 1.4 && g.y > C.y - 80 && g.y < C.y + 6) { g.body.velocity.x = Math.sign(g.x - C.x || 1) * rand(200, 420); g.body.velocity.y = -rand(200, 380); }
    for (const rd of this.ragdolls) if (Math.abs(rd.pts[2].x - C.x) < T.reach * 1.4 && rd.pts[2].y > C.y - 80 && rd.pts[2].y < C.y + 10) { const out = Math.sign(rd.pts[2].x - C.x) || 1; for (const q of rd.pts) { q.vx = out * rand(240, 380); q.vy = -rand(220, 320); } rd.asleep = false; }
    this.fxDust(C.x, C.y, 12); this.fx.emit(C.x, C.y - 20, { n: 20, speed: [80, 240], life: [0.3, 0.6], size: [3, 1], cols: [0xffffff, 0xd8e8f0, 0x9aa4b0, 0x6a7380], drag: 2 });
    Sfx.whoosh(); this.shake(120, 0.005);
  },
  updateCyclones(dt, now) {
    const T = TUNE.CYCLONE, G = this.xwG;
    for (let i = this.cyclones.length - 1; i >= 0; i--) {
      const C = this.cyclones[i];
      if (C.st === 'fly') {
        C.t -= dt; C.vy += 600 * dt;
        const nx = C.x + C.vx * dt, ny = C.y + C.vy * dt, e = this.enemyAt(nx, ny, 2);
        if (C.t <= 0 || ny > LH) { this.cycloneEnd(C); continue; }
        if (this.solidAt(nx, ny) || (C.vy > 0 && this.standAt(nx, ny + 1)) || (e && !e.under) || this.xwPropAt(nx, ny)) {
          const hit = this.sweep(C.x, C.y, nx, ny), px = hit ? hit.x : nx, fy = this.floorBelow(px, (hit ? hit.y : ny) - 6, 140);
          if (fy === null) { this.cycloneEnd(C); continue; }
          this.cycloneForm(C, clamp(px, 8, LW - 8), fy); continue;
        }
        C.x = nx; C.y = ny; C.img.setPosition(C.x, C.y).setRotation(C.img.rotation + 18 * dt);
        continue;
      }
      C.t -= dt; C.age += dt;
      if (C.t <= 0) { this.cycloneEnd(C); continue; }
      let nx = C.x + C.dir * T.walk * dt, ny = C.y;                     // wander the floor: steps up and down, turn at walls and edges
      if (this.solidAt(nx, ny - 6)) { if (!this.solidAt(nx, ny - TS - 6) && !this.solidAt(C.x, ny - TS - 6)) ny -= TS; else { C.dir *= -1; nx = C.x; } }
      else if (!this.standAt(nx, ny + 2)) { if (this.standAt(nx, ny + TS + 2)) ny += TS; else { C.dir *= -1; nx = C.x; } }
      C.x = nx; C.y = ny;
      const grow = Math.min(1, C.age / 0.25) * Math.min(1, C.t / 0.3), reach = T.reach * grow, top = C.y - 70;
      if ((C.sndT -= dt) <= 0) { C.sndT = 0.45; Sfx.cyclone(0.8); }
      for (const e of this.enemies.getChildren()) {                      // suck in what's light; shove what isn't
        if (!e.alive || e.under || e.def.anchored || C.caught.some(c => c.e === e)) continue;
        const b = e.body;
        if (Math.abs(b.center.x - C.x) > reach + b.halfWidth || b.center.y < top || b.top > C.y + 4) continue;
        if (e.def.hp <= T.maxHp && e.def.kb >= 0.45 && !e.def.noClip && !this.cyclones.some(o => o !== C && o.caught.some(c => c.e === e))) { C.caught.push({ e, ph: Math.atan2(0, b.center.x - C.x), r: rand(8, 14), h: 0 }); Sfx.whoosh(); }
        else { b.velocity.x += Math.sign(C.x - b.center.x) * 300 * dt; if ((e.cycT = (e.cycT || 0) - dt) <= 0) { e.cycT = 0.2; this.xwHit(e, T.dps * 0.2 * 0.5, 0, 0, 'siphon', 'cyclone'); if (!C.hit) { C.hit = true; this.stats.hits++; } } }
      }
      C.tick -= dt; const tick = C.tick <= 0; if (tick) C.tick = 0.2;
      for (let k = C.caught.length - 1; k >= 0; k--) {                   // the caught: round and round, rising
        const c = C.caught[k], e = c.e;
        if (!e.alive) { C.caught.splice(k, 1); continue; }
        const b = e.body; c.ph += 10 * dt; c.h = Math.min(34, c.h + 40 * dt);
        const tx = C.x + Math.cos(c.ph) * c.r, ty = C.y - 12 - c.h + Math.sin(c.ph * 2) * 2;
        b.velocity.x = (tx - b.center.x) * 14; b.velocity.y = (ty - b.center.y) * 14; e.stunT = Math.max(e.stunT, 0.25); e.dir = Math.sin(c.ph) >= 0 ? 1 : -1;
        if (tick) { this.xwHit(e, T.dps * 0.2, 0, 0, 'siphon', 'cyclone'); if (!C.hit) { C.hit = true; this.stats.hits++; } if (Math.random() < 0.5 && !e.def.mech) this.fxBlood(b.center.x, b.center.y, 2, 0, Math.PI * 2, [40, 120]); }
      }
      for (const g of this.gibList) {                                    // gibs, corpses and drums go round too
        if (!g.active || Math.abs(g.x - C.x) > reach * 1.3 || g.y < top || g.y > C.y + 6) continue;
        if (g.stuckT > 0) { g.stuckT = 0; g.body.setAllowGravity(true); }
        const dx = g.x - C.x; g.body.velocity.x = -dx * 5 + (dx >= 0 ? -1 : 1) * 40 + Math.cos(now / 60 + g.x) * 60; g.body.velocity.y = Math.max(-160, g.body.velocity.y - 1500 * dt); g.body.angularVelocity = 900;
      }
      for (const rd of this.ragdolls) {
        const c0 = rd.pts[2]; if (Math.abs(c0.x - C.x) > reach * 1.3 || c0.y < top || c0.y > C.y + 10) continue;
        for (const q of rd.pts) { q.vx += ((C.x - q.x) * 6 + Math.sin(now / 80 + q.y * 0.2) * 90) * dt * 4; q.vy = Math.max(-140, q.vy - 1500 * dt); }
        rd.asleep = false; rd.stillT = 0;
      }
      for (const kg of this.barrelList) if (kg.active && Math.abs(kg.x - C.x) < reach + 4 && kg.y > top && kg.y < C.y + 6) { kg.body.velocity.x = (C.x - kg.x) * 4 + C.dir * 60; kg.body.velocity.y = Math.max(-120, kg.body.velocity.y - 1100 * dt); if (tick) this.damageBarrel(kg, 3); }
      this.propsIn((px, py, r) => Math.abs(px - C.x) < reach + r && py + r > top && py - r < C.y + 4, 4, 'kick', C.dir, -1, true);
      // the funnel: bands that widen and whirl as they rise, specks of debris flying round it
      const sw = Math.sin(C.age * 3) * 4, topX = C.x + sw, H = 62 * grow, Wt = 24 * grow;
      G.fillStyle(0x8a94a0, 0.14 * grow).fillTriangle(C.x - 3, C.y, C.x + 3, C.y, topX - Wt, C.y - H).fillTriangle(C.x + 3, C.y, topX + Wt, C.y - H, topX - Wt, C.y - H);   // the dusty body of it
      for (let k = 0; k < 12; k++) {                                     // bands that widen and whirl as they rise
        const f = k / 11, y = C.y - 2 - f * H, w = 3 + f * Wt, x = C.x + (topX - C.x) * f + Math.sin(C.age * 7 + k * 0.8) * 1.5, ph = (C.age * 15 + k * 1.1) % (Math.PI * 2);
        G.lineStyle(2, k % 2 ? 0xc8d0d8 : 0x8a94a0, (0.7 - f * 0.3) * grow);
        G.beginPath(); G.arc(x, y, w, ph, ph + 2.4, false); G.strokePath();
        G.lineStyle(1, 0xffffff, 0.5 * grow); G.beginPath(); G.arc(x, y, w * 0.75, ph + 3.1, ph + 4.3, false); G.strokePath();
        const dp = C.age * 11 + k * 2.1; G.fillStyle(k % 3 ? 0x6a5a48 : 0xd8e8f0, 0.9 * grow).fillRect(Math.round(x + Math.cos(dp) * (w + 2)) - 1, Math.round(y + Math.sin(dp) * 2), 2, 2);   // debris round it
      }
      if (Math.random() < 0.6) this.fx.emit(C.x + rand(-8, 8), C.y - 1, { n: 1, angle: -Math.PI / 2 + C.dir * 0.6, spread: 1.2, speed: [30, 90], life: [0.3, 0.6], size: [2, 4], cols: [0x9aa4b0, 0x6a6f78], alpha: [0.6, 0], g: -30, drag: 2 });
    }
  },

  // ---------------------------------------------------------------- caltrop scatter ----
  // A fan of seven spiked caltrops that bounce and settle on whatever floor they reach, for 8 s. A grounded foe stood on
  // one takes 9 (at most every 0.45 s) and limps at 55% for a second after; fliers float over them. One that hits a foe
  // in the air stings for 4.
  fireCaltrops(now, ox, oy, a, mx, my) {
    const T = TUNE.CALTROP, ca = Math.cos(a), sa = Math.sin(a), shot = { hit: false }, pvx = this.player.body.velocity.x * 0.3;
    this.stats.shots++;
    for (let i = 0; i < T.n; i++) {
      const an = a + ((i - (T.n - 1) / 2) / ((T.n - 1) / 2)) * T.fan * 0.5 + rand(-0.06, 0.06), sp = T.speed * rand(0.65, 1.15);
      this.caltrops.push({ st: 'fly', x: ox, y: oy, vx: Math.cos(an) * sp + pvx, vy: Math.sin(an) * sp - rand(40, 100), t: T.life, spin: rand(8, 20), shot, bounce: 0,
        img: this.add.image(ox, oy, 'xw_caltrop' + (i % 2)).setDepth(4.99) });
    }
    while (this.caltrops.length > T.max) this.caltrops.shift().img.destroy();
    this.recoil = 4; Sfx.caltrops(); this.muzzle(mx, my, a, 0.8, 40); this.fxSparks(mx, my, 4, a, 0.8, [60, 160]); this.fxSmoke(mx, my, 3);
    this.shake(60, 0.003); this.addKick(-ca * 3, -sa * 3);
  },
  caltropHit(C, e, dmg, now) {
    const b = e.body;
    this.xwHit(e, dmg, 0, 0, 'caltrop', 'caltrop');
    if (!C.shot.hit) { C.shot.hit = true; this.stats.hits++; }
    if (e.def.mech) this.fxSparks(C.x, C.y - 2, 4, -Math.PI / 2, 1.4, [40, 140]); else this.fxBlood(C.x, C.y - 2, 5, -Math.PI / 2, 1.2, [40, 160]);
    Sfx.caltropStab();
    if (e.alive && !e.def.anchored) { e.spikeUntil = now + TUNE.CALTROP.slowT * 1000; this.xwFoes.add(e); }   // (the limp is applied in updateCaltrops)
  },
  updateCaltrops(dt, now) {
    const T = TUNE.CALTROP;
    for (let i = this.caltrops.length - 1; i >= 0; i--) {
      const C = this.caltrops[i];
      if (C.st === 'fly') {
        C.vy += 700 * dt;
        const n = Math.max(1, Math.ceil(Math.hypot(C.vx, C.vy) * dt / 3));
        for (let s = 0; s < n && C.st === 'fly'; s++) {
          const nx = C.x + C.vx * dt / n, ny = C.y + C.vy * dt / n;
          if (this.solidAt(nx, C.y)) { C.vx *= -0.4; continue; }
          if (C.vy > 0 && this.standAt(nx, ny + 1)) {                      // a floor (gratings too): bounce once, then settle
            C.x = nx; C.y = Math.floor((ny + 1) / TS) * TS - 1;
            if (++C.bounce > 1 || C.vy < 120) { C.st = 'set'; C.img.setTexture('xw_caltrop0').setRotation(0); if (Math.random() < 0.4) Sfx.tink(0.4); }
            else { C.vy *= -0.3; C.vx *= 0.5; }
            continue;
          }
          if (C.vy < 0 && this.solidAt(nx, ny)) { C.vy = 0; continue; }
          C.x = nx; C.y = ny;
          const e = this.enemyAt(C.x, C.y, 1);
          if (e && !e.under && !(e.spikeHitT > now)) { e.spikeHitT = now + T.cd * 1000; this.caltropHit(C, e, 4, now); C.vx *= 0.2; C.vy = 40; }
        }
        if (C.y > LH || (C.t -= dt) <= 0) { C.img.destroy(); this.caltrops.splice(i, 1); continue; }
        if (C.st === 'fly') C.img.setPosition(C.x, C.y).setRotation(C.img.rotation + C.spin * dt);
        else C.img.setPosition(C.x, C.y - 2);
        continue;
      }
      C.t -= dt;
      if (C.t <= 0 || !this.standAt(C.x, C.y + 2)) { C.img.destroy(); this.caltrops.splice(i, 1); continue; }   // spent, or the floor under it broke
      C.img.setAlpha(C.t < 1 ? (Math.floor(C.t * 12) % 2 ? 0.4 : 1) : 1);
      for (const e of this.enemies.getChildren()) {
        if (!e.alive || e.under || FLIERS.has(e.kind) || e.spikeHitT > now) continue;
        const b = e.body;
        if (Math.abs(b.center.x - C.x) > b.halfWidth + 1 || Math.abs(b.bottom - C.y) > 5) continue;
        e.spikeHitT = now + T.cd * 1000; this.caltropHit(C, e, T.dmg, now);
      }
    }
    for (const e of this.xwFoes) {                                        // spiked foes hobble (soaked ones drip: updateHydro)
      if (!e.alive || !(e.spikeUntil > now)) continue;
      const b = e.body, cap = (e.def.chase || e.def.speed || 120) * T.slow;                // a hobble: capped at 55% of its pace (a knock still throws it)
      if (!(e.kickedT > 0) && !(e.stunT > 0.1) && Math.abs(b.velocity.x) > cap) b.velocity.x = Math.sign(b.velocity.x) * cap;
      if (Math.random() < 0.06 && !e.def.mech) this.fxBlood(e.body.center.x, e.body.bottom - 2, 1, Math.PI / 2, 0.4, [10, 40]);
    }
  },

  // ---------------------------------------------------------------- spear gun ----
  // A barbed spear on a cable (640 px/s, 320 px). It skewers the first foe for 35: a light one (140 HP or less) is reeled
  // in to you, a heavy one or a boss reels YOU to it, and either way it ends in a free boot (a kick's 25 and launch, or an
  // execution if it's glowing). A kill it skewers rides the spear to the next wall and is PINNED there.
  fireSpear(now, ox, oy, a, mx, my) {
    const T = TUNE.SPEAR, ca = Math.cos(a), sa = Math.sin(a);
    if (this.spear) this.spearDrop();
    this.stats.shots++;
    this.spear = { st: 'fly', x: ox, y: oy, vx: ca * T.speed, vy: sa * T.speed, a, d: 0, t: 0, e: null, carry: [], hit: false, tok: {}, hits: new Set(),
      img: this.add.image(ox, oy, 'xw_spear').setOrigin(0.85, 0.5).setRotation(a).setDepth(9) };
    this.recoil = 6; Sfx.spear(); this.muzzle(mx, my, a, 0.8, 50); this.fxSmoke(mx, my, 3);
    this.shake(80, 0.004); this.addKick(-ca * 4, -sa * 4);
  },
  spearDrop() {
    const S = this.spear; if (!S) return;
    for (const c of S.carry) if (!c.rd.gone) { c.rd.asleep = false; c.rd.stillT = 0; }
    S.img.destroy(); this.spear = null;
  },
  spearHit(S, e, now) {
    const T = TUNE.SPEAR, ca = Math.cos(S.a), sa = Math.sin(S.a), b = e.body;
    S.hits.add(e);
    if (this.shieldBlocks(e, ca, S.y)) { this.fxSparks(S.x, S.y, 8, S.a + Math.PI, 1.2, [80, 240]); Sfx.clang(); e.ai = 'stagger'; e.aiUntil = now + 900; S.st = 'back'; return; }
    if (!S.hit) { S.hit = true; this.stats.hits++; }
    if (e.def.mech) this.fxSparks(S.x, S.y, 8, S.a + Math.PI, 1.2); else { this.fxBlood(S.x, S.y, 10, S.a, 0.7, [100, 300]); this.fxBlood(S.x, S.y, 4, S.a + Math.PI, 1, [40, 120]); }
    Sfx.hookHit(); this.hitStop(40);
    this.lastRag = null;
    this.xwHit(e, T.dmg, ca, sa, 'spear', 'spear');
    if (!e.alive) {                                                      // skewered: the body rides on to the wall
      if (this.lastRag && this.lastRag.from === e && S.carry.length < T.carry) { S.carry.push({ rd: this.lastRag, pi: 1 }); Sfx.squish(); }
      return;
    }
    const heavy = e.def.anchored || e.def.kb < 0.45 || e.def.hp > T.light || e.def.noClip;
    S.st = heavy ? 'zip' : 'reel'; S.e = e; S.t = 0; S.ox = S.x - b.center.x; S.oy = S.y - b.center.y;
    e.stunT = Math.max(e.stunT, 0.6);
    BUS.emit('callout', heavy ? 'HARPOONED!' : 'GET OVER HERE!'); this.addStyle(30); Sfx.spearReel();
  },
  spearKick(e, f) {                                                     // the end of the reel: a free boot
    const K = TUNE.KICK, b = e.body;
    this.kickUntil = this.time.now + 180; Sfx.kickHit(); this.hitStop(60); this.shake(100, 0.006); this.addStyle(25);
    if (this.canExecute(e)) { this.execute(e, f); return; }
    if (!e.def.anchored && !e.def.noClip) { const kb = Math.max(0.3, e.def.kb); b.velocity.x = f * K.push * kb; b.velocity.y = -200 * kb; e.kickedT = 0.6; e.stunT = Math.max(e.stunT, 0.5); }
    if (e.def.mech) this.fxSparks(b.center.x, b.center.y, 8, f > 0 ? 0 : Math.PI, 1, [80, 220]); else this.fxBlood(b.center.x, b.center.y, 8, f > 0 ? 0 : Math.PI, 1, [80, 220]);
    this.xwHit(e, K.damage, f, -0.3, 'kick', 'spear');
  },
  updateSpear(dt, now) {
    const S = this.spear; if (!S) return;
    const T = TUNE.SPEAR, pb = this.player.body, sx = this.shoulder.x, sy = this.shoulder.y;
    if (this.state === 'dead') { this.spearDrop(); return; }
    S.t += dt;
    if (S.st === 'fly') {
      S.vy += 160 * dt; S.a = Math.atan2(S.vy, S.vx);
      const ca = Math.cos(S.a), sa = Math.sin(S.a), sp = Math.hypot(S.vx, S.vy), n = Math.max(1, Math.ceil(sp * dt / 3));
      for (let k = 0; k < n && S.st === 'fly'; k++) {
        const nx = S.x + S.vx * dt / n, ny = S.y + S.vy * dt / n;
        if (this.solidAt(nx, ny)) {                                       // a wall: thunk (and nail up whatever it carries)
          const tx = Math.floor(nx / TS), ty = Math.floor(ny / TS);
          if (S.carry.length) { this.stakeWall({ carry: S.carry, disableBody() {} }, S.x, S.y, tx, ty, S.a); S.carry = []; }
          else { this.fxSparks(S.x, S.y, 8, S.a + Math.PI, 1.4, [60, 200]); this.fxDust(S.x, S.y, 3); this.paintHole(nx, ny); Sfx.clang(0.6); this.damageTile(tx, ty, 15); }
          S.st = 'wall'; S.t = 0; break;
        }
        S.x = nx; S.y = ny; S.d += sp * dt / n;
        const e = this.enemyAt(S.x, S.y, 1);
        if (e && !e.under && !S.hits.has(e)) { this.spearHit(S, e, now); continue; }
        const kg = this.barrelList.find(q => q.active && Math.abs(q.x - S.x) < 6 && Math.abs(q.y - S.y) < 8);
        if (kg) { this.damageBarrel(kg, T.dmg); kg.body.velocity.x -= ca * 200; kg.body.velocity.y -= 120; S.st = 'back'; break; }   // a drum: holed, and tugged your way
        if (this.propHitAt(S.x, S.y, ca, sa, T.dmg, S.tok)) { S.st = 'back'; break; }
        if (S.carry.length < T.carry) { const rh = this.ragdolls.length ? this.ragAt(S.x, S.y, 1) : null; if (rh && !S.carry.some(c => c.rd === rh.rd)) { rh.rd.pin = null; S.carry.push({ rd: rh.rd, pi: rh.pi }); this.hitRagdoll(rh.rd, S.x, S.y, 6, ca, sa, 'stake', rh.pi); } }
      }
      if (S.st === 'fly' && S.d > T.range) S.st = 'back';
      if (S.st === 'fly') S.carry.forEach((c, j) => { if (c.rd.gone) return; const q = c.rd.pts[c.pi]; q.x = S.x - Math.cos(S.a) * (5 + j * 7); q.y = S.y - Math.sin(S.a) * (5 + j * 7); q.vx = S.vx; q.vy = S.vy; c.rd.asleep = false; c.rd.stillT = 0; });
    } else if (S.st === 'reel') {                                        // a light foe hauled in on the cable
      const e = S.e; if (!e.alive) { S.st = 'back'; }
      else {
        const b = e.body, dx = sx - b.center.x, dy = sy - b.center.y, d = Math.hypot(dx, dy) || 1;
        S.x = b.center.x + S.ox; S.y = b.center.y + S.oy; S.a = Math.atan2(-dy, -dx);
        if (d < b.halfWidth + 14 || S.t > T.reelT) { this.spearKick(e, Math.sign(-dx) || this.facing); S.st = 'back'; }
        else { b.velocity.x = dx / d * T.yank; b.velocity.y = dy / d * T.yank - 40; e.stunT = Math.max(e.stunT, 0.4); if ((S.clk = (S.clk || 0) - dt) <= 0) { S.clk = 0.2; Sfx.spearReel(); } }
      }
    } else if (S.st === 'zip') {                                         // a heavy one: the cable hauls you to it
      const e = S.e; if (!e.alive) { S.st = 'back'; }
      else {
        const b = e.body, dx = b.center.x - pb.center.x, dy = b.center.y - pb.center.y, d = Math.hypot(dx, dy) || 1, f = Math.sign(dx) || this.facing;
        S.x = b.center.x + S.ox; S.y = b.center.y + S.oy; S.a = Math.atan2(dy, dx);
        if (d < b.halfWidth + 12 || S.t > T.reelT) { this.spearKick(e, f); pb.velocity.x = -f * 220; pb.velocity.y = -220; this.jumpCuttable = false; this.lastGround = -1e9; S.st = 'back'; }
        else { pb.velocity.x = dx / d * T.pull; pb.velocity.y = dy / d * T.pull; this.jumpCuttable = false; this.lastGround = -1e9; e.stunT = Math.max(e.stunT, 0.3); if (Math.random() < 0.5) this.fx.emit(pb.center.x, pb.center.y, { n: 1, speed: [0, 10], life: [0.1, 0.2], size: [2, 1], cols: [0xffffff, 0xc8d0d8], add: true }); }
      }
    } else if (S.st === 'wall') { if (S.t > 0.15) S.st = 'back'; }
    if (S.st === 'back') {                                               // the cable winds the spear home
      const dx = sx - S.x, dy = sy - S.y, d = Math.hypot(dx, dy) || 1;
      if (d < 12) { this.spearDrop(); return; }
      S.a = Math.atan2(-dy, -dx); S.x += dx / d * 900 * dt; S.y += dy / d * 900 * dt;
      for (const c of S.carry) if (!c.rd.gone) { c.rd.asleep = false; } S.carry = [];
    }
    const G = this.xwG, a = this.aim, mx = sx + Math.cos(a) * 26, my = sy + Math.sin(a) * 26, tx = S.x - Math.cos(S.a) * 13, ty = S.y - Math.sin(S.a) * 13;
    const taut = S.st === 'reel' || S.st === 'zip', L = Math.hypot(tx - mx, ty - my), sag = taut ? 0 : Math.min(10, L * 0.06), N = Math.max(2, Math.round(L / 6));
    let px = mx, py = my;                                                // the cable: taut while it hauls, a little slack otherwise
    for (let k = 1; k <= N; k++) { const t = k / N, qx = mx + (tx - mx) * t, qy = my + (ty - my) * t + Math.sin(t * Math.PI) * sag; G.lineStyle(1, 0x2a2e35, 1).lineBetween(px, py, qx, qy); G.lineStyle(1, taut ? 0xd8dee6 : 0x8a94a0, 0.6).lineBetween(px, py - 1, qx, qy - 1); px = qx; py = qy; }
    S.img.setPosition(S.x, S.y).setRotation(S.a);
  },

  // ---------------------------------------------------------------- heat ray ----
  // Hold for a 210 px beam (20 ticks/s) that cooks whatever it rests on: 1.2 a tick on a fresh target, ramping to 6 (120
  // a second) after 1.8 s on the same foe, which then catches fire. It heats the gun as it runs: 3.2 s of fire overheats
  // it for a forced 1.6 s vent (steam, no shots); let go and it cools in 1.5 s. The gun glows with the heat.
  fireHeatRay(now, ox, oy, a) {
    const T = TUNE.HEATRAY, ca = Math.cos(a), sa = Math.sin(a), sx = this.shoulder.x, sy = this.shoulder.y;
    if (now < this.hrVentUntil) { this.nextFire = this.hrVentUntil; return; }   // venting: nothing until it's cool
    this.stats.shots++; this.hrOnUntil = now + 110; this.recoil = 1.5;
    this.hrHeat = Math.min(1, this.hrHeat + T.cooldown / 1000 / T.heat);
    let ex = ox, ey = oy, hitE = null, wall = false, keg = null, rd = null;
    for (let d = 0; d < T.range; d += 3) {
      const x = sx + ca * d, y = sy + sa * d;
      if (this.solidAt(x, y)) { wall = true; break; }
      ex = x; ey = y;
      hitE = this.enemyAt(x, y, 2); if (hitE && !hitE.under) break; hitE = null;
      keg = this.barrelList.find(k => k.active && Math.abs(k.x - x) < 6 && Math.abs(k.y - y) < 8); if (keg) break;
      if (this.props && this.hitPropsAt(x, y, ca, sa)) break;
      rd = this.ragdolls.length ? this.ragAt(x, y, 1) : null; if (rd) break;
    }
    if (hitE && hitE === this.hrTarget) this.hrLock += T.cooldown / 1000; else { this.hrTarget = hitE; this.hrLock = 0; }
    const k = Math.min(1, this.hrLock / T.ramp), dmg = T.dmg0 + (T.dmg1 - T.dmg0) * k;
    if (hitE) {
      this.stats.hits++;
      this.xwHit(hitE, dmg, ca, sa, 'microwave', 'heatray');
      if (k >= 1 && hitE.alive) this.ignite(hitE, T.burn);
      if (Math.random() < 0.5 + 0.5 * k) this.fx.emit(ex, ey, { n: 1, angle: -Math.PI / 2, spread: 0.8, speed: [10, 40], life: [0.3, 0.7], size: [2, 5], cols: [0x8a8580, 0x55504c], alpha: [0.5, 0], g: -40 });
    }
    if (keg) { this.damageBarrel(keg, dmg); if (k > 0.3 || this.hrHeat > 0.5) this.igniteBarrel(keg); }
    if (rd) { rd.rd.burnT = Math.max(rd.rd.burnT, T.burn); this.hitRagdoll(rd.rd, ex, ey, dmg, ca, sa, 'flame', rd.pi); }
    for (const P of this.tars.slice()) if (Math.abs(P.x - ex) < P.w / 2 + 3 && Math.abs(P.y - ey) < 8) this.igniteTar(P);   // the beam lights tar and gas
    for (const C of this.clouds.slice()) if (Math.hypot(C.x - ex, C.y - ey) < C.r * 0.8) this.igniteCloud(C);
    if (wall && now > this.hrScorchT) { this.hrScorchT = now + 160; this.paintScorch(ex + ca * 2, ey + sa * 2, 3 + Math.round(3 * k)); }
    if (Math.random() < 0.6) this.fx.emit(ex, ey, { n: 1 + Math.round(2 * k), angle: a + Math.PI, spread: 2, speed: [40, 140], life: [0.1, 0.3], size: [2, 1], cols: [0xffffff, 0xffe080, 0xff8a20, 0xc03010], add: true, g: 300, mode: 1 });
    this.hrBeam = { x0: ox, y0: oy, x1: ex, y1: ey, k };
    if (this.hrHeat >= 1) {                                              // overheated: a forced vent
      this.hrVentUntil = now + T.vent * 1000; this.nextFire = this.hrVentUntil; this.hrTarget = null; this.hrLock = 0;
      Sfx.overheat(); Sfx.steam(); BUS.emit('callout', 'OVERHEATED');
      this.fx.emit(this.shoulder.x + ca * 14, this.shoulder.y + sa * 14 - 2, { n: 16, angle: -Math.PI / 2, spread: 1.6, speed: [30, 110], life: [0.5, 1], size: [3, 8], cols: [0xffffff, 0xe8f0f4, 0xb0bcc4], alpha: [0.7, 0], g: -60, drag: 2 });
    }
    this.shake(25, 0.0008 * (1 + k));
  },
  updateHeatRay(dt, now) {
    const T = TUNE.HEATRAY, on = now < this.hrOnUntil && this.state !== 'dead', venting = now < this.hrVentUntil, held = WEAPONS[this.weapon].id === 'heatray';
    if (venting) {
      this.hrHeat = Math.max(0, (this.hrVentUntil - now) / (T.vent * 1000));
      if (held && Math.random() < 0.5) { const ca = Math.cos(this.aim), sa = Math.sin(this.aim); this.fx.emit(this.shoulder.x + ca * rand(8, 18), this.shoulder.y + sa * rand(8, 18) - 3, { n: 1, angle: -Math.PI / 2, spread: 0.9, speed: [20, 70], life: [0.4, 0.9], size: [2, 6], cols: [0xffffff, 0xe8f0f4, 0xb0bcc4], alpha: [0.6, 0], g: -50, drag: 1.5 }); }
    } else if (!on) this.hrHeat = Math.max(0, this.hrHeat - dt / T.cool);
    if (!on) { this.hrTarget = null; this.hrLock = 0; }
    if (!held || this.hrHeat <= 0.01 || this.state === 'dead') this.hrGlow.setVisible(false);
    Sfx.heatSet(on && held ? 0.3 + 0.7 * Math.min(1, this.hrLock / T.ramp) : 0);
    const B = this.hrBeam; if (!on || !B || !held) return;
    const G = this.xwAG, k = B.k, w = 1 + 2 * k, flick = 0.85 + Math.random() * 0.15;   // the beam: red when it lands, white-hot when it's locked
    const outer = k < 0.5 ? 0xc02010 : 0xff6020, mid = k < 0.5 ? 0xff5020 : 0xffb040, core = k < 0.7 ? 0xffc080 : 0xffffff;
    G.lineStyle(w + 4, outer, 0.25 * flick).lineBetween(B.x0, B.y0, B.x1, B.y1);
    G.lineStyle(w + 1, mid, 0.7 * flick).lineBetween(B.x0, B.y0, B.x1, B.y1);
    G.lineStyle(Math.max(1, w - 1), core, flick).lineBetween(B.x0, B.y0, B.x1, B.y1);
    G.fillStyle(mid, 0.5).fillCircle(B.x1, B.y1, 2 + 3 * k * flick); G.fillStyle(0xffffff, 0.9).fillCircle(B.x1, B.y1, 1 + k);
    if (Math.random() < 0.3) this.spawnLight(B.x1, B.y1, 'glow', 0xff7020, 0.8 + k, 1.4 + k, 0.5, 0.08);
  },
  heatGun(ca, sa, now) {                                                // syncVisuals: the heat shows on the gun, white at the top end; venting it flickers
    const h = this.hrHeat, v = now < this.hrVentUntil && Math.floor(now / 70) % 2, G = GUNS.heatray;
    this.gun.setTint(v ? 0xffffff : (255 << 16) | (Math.round(255 - 150 * h) << 8) | Math.round(255 - 220 * h));
    this.gunTinted = true; this.hrGlow.setVisible(true).setPosition(this.gun.x + ca * (G.muzzle - 6), this.gun.y + sa * (G.muzzle - 6)).setScale(0.3 + 0.9 * h).setAlpha(0.25 + 0.55 * h);
  },

  // ---------------------------------------------------------------- barrage beacon ----
  // Lobs a beacon that lands, blinks and calls it in: 0.7 s later six shells walk out from it along the floor the way you
  // threw it, 32 px apart and 0.28 s between them, each marked on the floor 0.55 s before it lands (radius 34, 48->14).
  // A wall stops the walk.
  fireBarrage(now, ox, oy, a, mx, my) {
    const T = TUNE.BARRAGE, ca = Math.cos(a), sa = Math.sin(a);
    this.stats.shots++;
    this.barrages.push({ st: 'fly', x: ox, y: oy, vx: ca * T.speed + this.player.body.velocity.x * 0.2, vy: sa * T.speed - T.lift, dir: ca >= 0 ? 1 : -1, t: 0, shells: null, counted: false,
      img: this.add.image(ox, oy, 'xw_beacon0').setDepth(6) });
    this.recoil = 4; Sfx.mineThrow(); this.muzzle(mx, my, a, 0.7, 40); this.spawnLight(mx, my, 'glow', 0xff4030, 0.6, 1.2, 0.8, 0.1);
    this.addKick(-ca * 2, -sa * 2);
  },
  updateBarrages(dt, now) {
    const T = TUNE.BARRAGE, G = this.xwFloorG, GA = this.xwG;
    for (let i = this.barrages.length - 1; i >= 0; i--) {
      const B = this.barrages[i]; B.t += dt;
      if (B.st === 'fly') {
        B.vy += 600 * dt;
        const nx = B.x + B.vx * dt, ny = B.y + B.vy * dt;
        if (B.t > 4 || ny > LH) { B.img.destroy(); this.barrages.splice(i, 1); continue; }
        if (this.solidAt(nx, B.y)) B.vx *= -0.3;
        else if (B.vy > 0 && this.standAt(nx, ny + 4)) {                  // down: it plants itself and calls it in
          B.x = nx; B.y = Math.floor((ny + 4) / TS) * TS; B.st = 'set'; B.t = 0; Sfx.beaconSet(); this.fxDust(B.x, B.y, 3);
        } else if (B.vy < 0 && this.solidAt(nx, ny)) B.vy = 0;
        else {
          B.x = nx; B.y = ny;
          const e = this.enemyAt(B.x, B.y, 1); if ((e && !e.under) || this.xwPropAt(B.x, B.y)) { B.vx *= 0.2; B.vy = Math.max(B.vy, 40); }   // glances off a foe or a prop and drops
        }
        B.img.setPosition(B.x, B.y - 4).setRotation(B.img.rotation + B.vx * dt * 0.05);
        continue;
      }
      const lit = Math.floor(B.t * (B.t < T.delay ? 6 : 14)) % 2;
      if (B.img) { B.img.setPosition(B.x, B.y - 4).setRotation(0).setTexture(lit ? 'xw_beacon1' : 'xw_beacon0'); if (lit && !B.lastLit) { Sfx.beaconPing(B.shells ? 2 : 0); this.spawnLight(B.x, B.y - 7, 'glow', 0xff3020, 0.4, 0.8, 0.8, 0.12); } }
      B.lastLit = lit;
      if (B.st === 'set' && B.t < T.delay) { GA.lineStyle(1, 0xff3020, 0.25 + 0.3 * lit).lineBetween(B.x, B.y - 8, B.x, B.y - 8 - 60 * (B.t / T.delay)); }   // its designator climbs
      if (!B.shells && B.t >= T.delay) {                                 // plot the walk: floor under each step, stopped by walls
        B.shells = [];
        for (let k = 0; k < T.shells; k++) {
          const x = clamp(B.x + B.dir * T.step * k, 8, LW - 8), fy = this.floorBelow(x, B.y - 40, 160);
          if (fy === null) continue;
          if (fy <= B.y - 36) break;                                        // a wall in the way
          B.shells.push({ x, y: fy, at: T.delay + k * T.gap + T.tell, warn: T.delay + k * T.gap, whist: false, done: false });
        }
      }
      if (B.shells) {
        let left = 0;
        for (const S of B.shells) {
          if (S.done) continue;
          left++;
          if (B.t < S.warn) continue;
          if (!S.whist) { S.whist = true; Sfx.whistle(); }
          const f = clamp((B.t - S.warn) / T.tell, 0, 1), blink = Math.floor(B.t * 16) % 2, r = 10 - 5 * f;
          G.lineStyle(1, 0xff3020, 0.5 + 0.5 * blink).strokeEllipse(S.x, S.y - 1, r * 2 + 4, 4);       // the marker: a closing red ring on the floor
          G.fillStyle(0xff3020, 0.35 + 0.4 * f).fillRect(S.x - 1, S.y - 2, 2, 1);
          if (f > 0.55) { const k2 = (f - 0.55) / 0.45, y = S.y - 200 * (1 - k2); GA.lineStyle(1, 0xfff0c0, 0.25).lineBetween(S.x, y - 24, S.x, y - 4); GA.fillStyle(0x4a5240, 1).fillRect(S.x - 1, y - 7, 3, 6); GA.fillStyle(0xe8b422, 1).fillRect(S.x - 1, y - 5, 3, 1); GA.fillStyle(0x2a2e35, 1).fillRect(S.x - 1, y - 1, 3, 2); }   // the shell coming in
          if (B.t >= S.at) {
            S.done = true; left--;
            const h0 = this.stats.hits;
            this.xwBoom(S.x, S.y - 3, T.blast, 'barrage', !B.counted);
            if (this.stats.hits > h0) B.counted = true;
            this.fx.emit(S.x, S.y - 2, { n: 14, angle: -Math.PI / 2, spread: 0.9, speed: [100, 280], life: [0.4, 0.8], size: [3, 1], cols: [0xc8b8a0, 0x8a7a68, 0x5a4e44], g: 700, mode: 1 });
          }
        }
        if (!left) { if (B.img) { this.fxSparks(B.x, B.y - 4, 6); B.img.destroy(); } this.barrages.splice(i, 1); }
      }
    }
  },

  // ---------------------------------------------------------------- hydro cannon ----
  // Hold for a pressurised jet (18 ticks/s, 140 px, 8 degrees): 1 a tick, but it shoves foes back hard (340, wall splats)
  // and soaks them for 5 s: soaked, they take x1.5 from electric hits (the arc caster, shock rifle, storm coil, ball
  // lightning) and chill x1.8 faster under the cryo cannon. It puts out burning foes, floor fire, burning tar and drums,
  // and leaves puddles where it lands, which electric hits can light. Molten slag takes x3 and steams.
  fireHydro(now, ox, oy, a) {
    const T = TUNE.HYDRO, ca = Math.cos(a), sa = Math.sin(a), sx = this.shoulder.x, sy = this.shoulder.y, pb = this.player.body;
    this.hydroUntil = now + 120; this.stats.shots++; this.recoil = 1.5;
    let ex = ox, ey = oy, wall = false;
    for (let d = 6; d < T.range; d += 3) { const x = sx + ca * d, y = sy + sa * d; if (this.solidAt(x, y)) { wall = true; break; } ex = x; ey = y; }
    const inCone = (x, y, extra) => {
      const d = Math.hypot(x - sx, y - sy); if (d > T.range + extra) return false;
      let da = Math.abs(Math.atan2(y - sy, x - sx) - a) % (Math.PI * 2); if (da > Math.PI) da = Math.PI * 2 - da;
      return (da <= (T.cone + 8) * DEG || d < 12) && this.los(sx, sy, x, y);
    };
    let hitAny = false;
    for (const e of this.enemies.getChildren()) {
      if (!e.alive || e.under || !inCone(e.body.center.x, e.body.center.y, e.body.halfWidth)) continue;
      const b = e.body, kb = e.def.kb; hitAny = true;
      e.soakUntil = now + T.soak * 1000; this.xwFoes.add(e);
      if (e.burnT > 0) { e.burnT = 0; e.panicT = 0; Sfx.sizzle(); this.fx.emit(b.center.x, b.top, { n: 8, angle: -Math.PI / 2, spread: 1, speed: [10, 50], life: [0.5, 1], size: [3, 7], cols: [0xe8f0f4, 0xb0bcc4], alpha: [0.5, 0], g: -40, drag: 2 }); }
      if (!e.def.anchored && !e.def.noClip && kb > 0) {
        b.velocity.x = approach(b.velocity.x, ca * T.push * kb, T.push * kb * 0.6);
        if (FLIERS.has(e.kind)) b.velocity.y = approach(b.velocity.y, sa * T.push * kb, T.push * kb * 0.6); else if (sa < -0.3) b.velocity.y = Math.min(b.velocity.y, sa * T.push * kb * 0.7);
        e.stunT = Math.max(e.stunT, 0.12);
        if (!(e.hydroSplatT > now) && Math.abs(b.velocity.x) > 180) { e.kickedT = 0.25; e.hydroSplatT = now + 900; }   // hosed into a wall: a splat, once in a while
      }
      if (e.def.molten && Math.random() < 0.5) this.fx.emit(b.center.x, b.center.y, { n: 3, angle: -Math.PI / 2, spread: 1.2, speed: [20, 70], life: [0.4, 0.8], size: [3, 7], cols: [0xffffff, 0xe8f0f4, 0xb0bcc4], alpha: [0.6, 0], g: -50, drag: 2 });
      this.xwHit(e, T.dmg * (e.def.molten ? 3 : 1), ca, sa, 'siphon', 'hydro');
      if (Math.random() < 0.5) this.fx.emit(b.center.x - ca * b.halfWidth, b.center.y, { n: 3, angle: a + Math.PI, spread: 1.6, speed: [40, 140], life: [0.2, 0.45], size: [2, 1], cols: [0xffffff, 0xc8ecff, 0x6ab8f0], g: 500, mode: 1 });
    }
    if (hitAny) this.stats.hits++;
    for (const k of this.barrelList) if (k.active && inCone(k.x, k.y, 6)) {                       // drums get shoved and put out
      k.body.velocity.x = approach(k.body.velocity.x, ca * 160, 40);
      if (k.burning && k.hp > 0) { k.burning = false; k.fuse = -1; k.clearTint(); Sfx.sizzle(); }
    }
    this.propsIn((px, py, r) => inCone(px, py, r), 3, 'shot', ca, sa, true);                      // scenery wears down under it
    for (const rd of this.ragdolls) { const c = rd.pts[2]; if (inCone(c.x, c.y, 6)) { for (const q of rd.pts) { q.vx += ca * 30; q.vy += sa * 30 - 6; } rd.asleep = false; rd.stillT = 0; } }
    for (const g of this.gibList) if (g.active && inCone(g.x, g.y, 2)) { if (g.stuckT > 0) { g.stuckT = 0; g.body.setAllowGravity(true); } g.body.velocity.x += ca * 40; g.body.velocity.y += sa * 40; }
    this.douse(ex, ey, 18); this.douse((sx + ex) / 2, (sy + ey) / 2, 14);                        // fires out: floor fire, burning tar, foes, props
    if ((this.hydroPud += T.cooldown / 1000) >= T.pud) { this.hydroPud = 0; this.spawnWater(ex - ca * 2, ey - sa * 2, 12); }   // it pools where it lands
    this.hydroJet = { x0: ox, y0: oy, x1: ex, y1: ey, a, wall };
    for (let k = 0; k < 3; k++) this.fx.emit(ox, oy, { n: 1, angle: a, spread: T.cone * 2 * DEG, speed: [250, 340], life: [0.25, 0.45], size: [2, 1], cols: [0xffffff, 0xd8f4ff, 0x7ac8f0, 0x3a8ad0], g: 260, drag: 0.6, vx: pb.velocity.x * 0.4 });
    this.fx.emit(ex, ey, { n: 3, angle: a + Math.PI, spread: 2.4, speed: [40, 160], life: [0.2, 0.45], size: [2, 1], cols: [0xffffff, 0xc8ecff, 0x6ab8f0], g: 500, mode: 1 });
    if (Math.random() < 0.5) this.fx.emit(ex, ey, { n: 1, speed: [5, 25], life: [0.4, 0.8], size: [3, 7], cols: [0xe8f4ff, 0xb8d4e8], alpha: [0.35, 0], g: -10, drag: 2 });
    pb.velocity.x -= ca * 10; this.shake(25, 0.0007);
  },
  updateHydro(dt, now) {
    const on = now < this.hydroUntil && this.state !== 'dead' && WEAPONS[this.weapon].id === 'hydro';
    Sfx.hydroSet(on);
    for (const e of this.xwFoes) {                                        // soaked foes drip (the set holds the spiked ones too)
      if (!e.alive || (!(e.soakUntil > now) && !(e.spikeUntil > now))) { this.xwFoes.delete(e); continue; }
      if (e.soakUntil > now && Math.random() < 0.25) this.fx.emit(e.body.center.x + rand(-e.body.halfWidth, e.body.halfWidth), e.body.center.y + rand(-4, 6), { n: 1, angle: Math.PI / 2, spread: 0.2, speed: [5, 20], life: [0.3, 0.6], size: [1, 1], cols: [0xc8ecff, 0x6ab8f0], g: 400, mode: 1 });
    }
    const J = this.hydroJet; if (!on || !J) return;
    const G = this.xwG, L = Math.hypot(J.x1 - J.x0, J.y1 - J.y0) || 1, nx = -(J.y1 - J.y0) / L, ny = (J.x1 - J.x0) / L, N = Math.max(3, Math.round(L / 6));
    let px = J.x0, py = J.y0;                                            // the jet: a wobbling rope of water that swells and frays as it goes
    for (let k = 1; k <= N; k++) {
      const t = k / N, wob = Math.sin(now / 30 + t * 9) * 1.4 * t, qx = J.x0 + (J.x1 - J.x0) * t + nx * wob, qy = J.y0 + (J.y1 - J.y0) * t + ny * wob + t * t * 3, w = 2 + t * 3;
      G.lineStyle(w + 3, 0x2a6aa8, 0.35).lineBetween(px, py, qx, qy);
      G.lineStyle(w, 0x6ab8f0, 0.85).lineBetween(px, py, qx, qy);
      G.lineStyle(Math.max(1, w * 0.4), 0xe8f8ff, 0.95).lineBetween(px, py - w * 0.2, qx, qy - w * 0.2);
      if (k % 3 === 0) G.fillStyle(0xffffff, 0.8).fillRect(Math.round(qx + nx * w * 0.6), Math.round(qy + ny * w * 0.6), 1, 1);   // droplets peeling off
      px = qx; py = qy;
    }
    const sp = 4 + Math.sin(now / 25) * 1.5;                             // the splash where it lands
    G.fillStyle(0x9ad8ff, 0.45).fillCircle(px, py, sp + 2); G.fillStyle(0xe8f8ff, 0.85).fillCircle(px, py, sp * 0.6); G.fillStyle(0xffffff, 1).fillCircle(px, py, 1.5);
  },

  // ================================================================== armory round ====
  // ---------------------------------------------------------------- stasis grenade ----
  // A lobbed canister (0.8 s fuse, or on contact) that opens a 70 px field of stopped time for 3 s. Foes inside
  // freeze mid-motion and every hit they take is stored (+25%) and lands all at once when time starts again; enemy
  // shots inside hang in the air until then. Bosses shrug it off.
  openStasis(x, y) {
    this.stasisFields.push({ x, y, t: TUNE.STASIS.time, held: new Map() });
    this.spawnLight(x, y, 'ring', 0xc8e8ff, 0.2, 2, 0.9, 0.3); this.spawnLight(x, y, 'glow', 0x9ab8ff, 1.5, 2.2, 0.6, 0.4);
    this.fx.emit(x, y, { n: 20, speed: [40, 150], life: [0.3, 0.6], size: [2, 1], cols: [0xffffff, 0xc8e8ff, 0x9ab8ff], add: true });
    Sfx.stasis(); this.warpPulse(0.5);
  },
  updateStasisFields(dt, now) {
    const T = TUNE.STASIS;
    for (let i = this.stasisFields.length - 1; i >= 0; i--) {
      const F = this.stasisFields[i]; F.t -= dt; const end = F.t <= 0;
      let n = 0;
      for (const e of this.enemies.getChildren()) {
        if (end || !e.alive || e.under || e.def.boss || e.def.miniBoss) continue;
        if (Math.hypot(e.body.center.x - F.x, e.body.center.y - F.y) > T.radius) continue;
        if (!(e.stasisT > 0)) { e.stasisDmg = 0; e.stasisGrav = this.tb && this.tb.o === e ? this.tb.grav : e.body.allowGravity; e.body.setAllowGravity(false); }
        e.stasisT = 0.12; e.body.setVelocity(0, 0); n++;
      }
      if (!F.called && n >= 3) { F.called = true; BUS.emit('callout', 'TIME STOP'); this.addStyle(40); }
      for (const list of [this.ebulletList, this.boltList, this.eprojList]) for (const q of list) {   // shots hang in the air
        if (!q.active) { F.held.delete(q); continue; }
        if (F.held.has(q)) { if (end) { const [vx, vy, ag] = F.held.get(q); q.body.setAllowGravity(ag); q.body.setVelocity(vx, vy); } else { q.body.setVelocity(0, 0); if (q.life !== undefined) q.life += dt; } continue; }
        if (!end && Math.hypot(q.x - F.x, q.y - F.y) < T.radius && !this.stasisFields.some(G => G !== F && G.held.has(q))) { F.held.set(q, [q.body.velocity.x, q.body.velocity.y, q.body.allowGravity]); q.body.setVelocity(0, 0); q.body.setAllowGravity(false); }
      }
      if (end) { F.held.clear(); this.stasisFields.splice(i, 1); this.spawnLight(F.x, F.y, 'ring', 0xffffff, 1.6, 0.2, 0.8, 0.25); Sfx.stasisEnd(); this.shake(80, 0.004); }
    }
  },
  updateStasisFoe(e, dt) {
    e.stasisT -= dt; e.body.setVelocity(0, 0);
    if (e.stasisT > 0) return;
    if (this.tb && this.tb.o === e) this.tb.grav = e.gravT > 0 || e.gravSlam || e.stasisGrav !== false; else e.body.setAllowGravity(e.stasisGrav !== false);   // time catches up: everything it took lands at once
    const d = e.stasisDmg; e.stasisDmg = 0;
    if (d > 0 && e.alive) {
      this.fxSparks(e.body.center.x, e.body.center.y, 8, 0, Math.PI * 2, [60, 200]); this.spawnLight(e.body.center.x, e.body.center.y, 'ring', 0xc8e8ff, 0.2, 1, 0.9, 0.2);
      this.damageEnemy(e, d, 0, -1, 'stasis');
      if (d >= 80) { BUS.emit('callout', "TIME'S UP"); this.addStyle(50); this.hitStop(60); }
    }
  },

  // ---------------------------------------------------------------- microwave ----
  // A 150 px beam that locks onto the foe nearest your aim: 1.5 a tick, and it cooks. About 1.2 s of it and the foe
  // swells and POPS: 40 + 15% of its max HP to it and 25 to anything within 40 px. Bosses cook at a third the speed.
  fireMicrowave(now, ox, oy, a) {
    const W = TUNE.MICROWAVE, sx = this.shoulder.x, sy = this.shoulder.y;
    this.stats.shots++;
    let tgt = null, bd = 1e9;
    for (const e of this.enemies.getChildren()) {
      if (!e.alive || e.under) continue;
      const ex = e.body.center.x, ey = e.body.center.y, d = Math.hypot(ex - sx, ey - sy); if (d > W.range + e.body.halfWidth) continue;
      const an = Math.atan2(ey - sy, ex - sx) - a, da = Math.abs(Math.atan2(Math.sin(an), Math.cos(an))); if (da > W.cone) continue;
      const sc = d + da * 120; if (sc < bd && this.los(sx, sy, ex, ey)) { bd = sc; tgt = e; }
    }
    if ((this.mwSndT = (this.mwSndT || 0) - W.cooldown / 1000) <= 0) { this.mwSndT = 0.3; Sfx.microwave(); }
    if (!tgt) { this.mwFx = { x0: ox, y0: oy, x1: ox + Math.cos(a) * 40, y1: oy + Math.sin(a) * 40, t: now }; return; }
    const ex = tgt.body.center.x, ey = tgt.body.center.y; this.mwFx = { x0: ox, y0: oy, x1: ex, y1: ey, t: now };
    tgt.cook = Math.min(1, (tgt.cook || 0) + W.cook * (tgt.def.boss || tgt.def.miniBoss ? 0.35 : 1)); tgt.cookT = now;
    this.damageEnemy(tgt, W.dmg, Math.cos(a), Math.sin(a), 'microwave'); this.stats.hits++;
    if (tgt.alive && tgt.cook >= 1) this.mwPop(tgt);
  },
  mwPop(e) {
    const W = TUNE.MICROWAVE, cx = e.body.center.x, cy = e.body.center.y;
    e.cook = 0; e.setScale((e.shrunkOn ? 0.5 : 1) * (e.growS || 1));
    if (e.def.mech) this.fxSparks(cx, cy, 16, 0, Math.PI * 2, [80, 260]); else this.fxBlood(cx, cy, 18, 0, Math.PI * 2, [80, 280]);
    this.spawnLight(cx, cy, 'glow', 0xffa040, 1.6, 2.6, 0.9, 0.3); Sfx.mwPop(); this.shake(110, 0.006); this.hitStop(50);
    this.damageEnemy(e, W.pop + e.def.hp * W.popFrac, 0, -1, 'rocket');
    for (const o of this.enemies.getChildren()) if (o.alive && o !== e && !o.under && Math.hypot(o.body.center.x - cx, o.body.center.y - cy) < 40 + o.body.halfWidth) this.damageEnemy(o, W.splash, Math.sign(o.body.center.x - cx) || 1, -0.3, 'pellet');
    BUS.emit('callout', 'POP!'); this.addStyle(40);
    if ((this.ms.pops = (this.ms.pops || 0) + 1) >= 5) this.award('popcorn');
  },

  // ---------------------------------------------------------------- splitter ----
  // A bright bolt (430 px/s) that splits in two whenever it hits something: off a wall it reflects and forks +/-0.3
  // rad, through a foe it forks on past it. Three generations: 22, then 2 x 14, 4 x 10 and 8 x 7.
  updateSplits(dt) {
    const T = TUNE.SPLITTER;
    for (let i = this.splits.length - 1; i >= 0; i--) {
      const S = this.splits[i]; S.t -= dt;
      if (S.t <= 0) { this.splits.splice(i, 1); continue; }
      const nx = S.x + S.vx * dt, ny = S.y + S.vy * dt;
      let hitE = null;
      for (const e of this.enemies.getChildren()) { if (!e.alive || e.under || S.hit.has(e)) continue; const b = e.body; if (nx >= b.left - 2 && nx <= b.right + 2 && ny >= b.top - 2 && ny <= b.bottom + 2) { hitE = e; break; } }
      if (hitE) {
        const a = Math.atan2(S.vy, S.vx); this.damageEnemy(hitE, T.dmg[S.gen], Math.cos(a), Math.sin(a), 'pellet'); this.stats.hits++;
        this.fxSparks(nx, ny, 4, a, 1, [60, 180]); this.splitBolt(nx, ny, a, S, hitE); this.splits.splice(i, 1); continue;
      }
      if (this.solidAt(nx, ny)) {                                       // reflect off the face it hit, then fork
        const hx = this.solidAt(nx, S.y), hy = this.solidAt(S.x, ny); let vx = S.vx, vy = S.vy;
        if (hx || !hy) vx = -vx; if (hy || !hx) vy = -vy;
        this.damageTile(Math.floor(nx / TS), Math.floor(ny / TS), 6);
        this.splitBolt(S.x, S.y, Math.atan2(vy, vx), S, null); this.splits.splice(i, 1); continue;
      }
      S.px = S.x; S.py = S.y; S.x = nx; S.y = ny;
    }
  },
  splitBolt(x, y, a, S, skip) {
    const T = TUNE.SPLITTER;
    if (S.gen >= T.gens) { this.fx.emit(x, y, { n: 4, speed: [30, 90], life: [0.1, 0.25], size: [2, 1], cols: [0x8a7aff, 0xffffff], add: true }); return; }
    for (const d of [-1, 1]) { const b = a + d * T.fan; this.splits.push({ x, y, px: x, py: y, vx: Math.cos(b) * T.speed * 0.95, vy: Math.sin(b) * T.speed * 0.95, gen: S.gen + 1, t: T.life * 0.85, hit: new Set(skip ? [skip] : []) }); }
    this.spawnLight(x, y, 'glow', 0x9af4ff, 0.5, 1.2, 0.8, 0.1); Sfx.splitPop();
  },

  // ---------------------------------------------------------------- decoy launcher ----
  // A lobbed holo canister (0.7 s fuse, or on contact) that projects a hologram of you for 5 s. Foes within 260 px
  // that are nearer it than you go for it; the first one to reach it, or the timer, sets it off (70 at the centre).
  deployDecoy(x, y) {
    if (this.decoy) this.decoyBoom();                                   // one at a time: the old one goes off
    const fy = this.floorBelow(x, y - 6), gy = fy !== null && fy - y < 90 ? fy : y + 10;
    const img = this.add.image(x, gy, 'player', 'idle0').setOrigin(0.5, 1).setTint(0x46e6ff).setAlpha(0.6).setDepth(5.5).setFlipX(this.facing < 0);
    this.decoy = { x, y: gy - 12, t: TUNE.DECOY.life, img, glow: this.add.image(x, gy - 12, 'glow').setBlendMode(ADD).setTint(0x46e6ff).setScale(1).setAlpha(0.45).setDepth(5.4) };
    this.spawnLight(x, gy - 12, 'ring', 0x46e6ff, 0.2, 1.6, 0.9, 0.3); BUS.emit('callout', 'DECOY'); Sfx.decoy();
  },
  updateDecoy(dt, now) {
    const D = this.decoy; if (!D) return;
    D.t -= dt; D.img.setAlpha((D.t < 1 && Math.floor(now / 80) % 2 ? 0.25 : 0.45) + Math.random() * 0.2).setX(D.x + (Math.random() < 0.06 ? rand(-2, 2) : 0));
    D.glow.setScale(0.9 + Math.sin(now / 100) * 0.1);
    let touched = false;
    for (const e of this.enemies.getChildren()) if (e.alive && !e.under && !e.def.tiny && Math.abs(e.body.center.x - D.x) < e.body.halfWidth + 8 && Math.abs(e.body.center.y - D.y) < e.body.halfHeight + 12) { touched = true; break; }
    if (touched || D.t <= 0 || this.state === 'dead') this.decoyBoom();
  },
  decoyBoom() {
    const D = this.decoy; if (!D) return; this.decoy = null;
    D.img.destroy(); D.glow.destroy();
    if (this.state !== 'dead') this.explode(D.x, D.y, TUNE.DECOY.boom);
  },
  updateDiscs(dt, now) {
    const T = TUNE.DISCUS, pb = this.player.body;
    for (let i = this.discs.length - 1; i >= 0; i--) {
      const D = this.discs[i], o = D.owner; D.spin += dt * 30;
      const drop = () => { this.fx.emit(D.x, D.y, { n: 6, speed: [30, 100], life: [0.2, 0.4], size: [2, 1], cols: [0xc8d0da, 0xffffff], add: true }); if (o && o.disc === D) o.disc = null; this.discs.splice(i, 1); };
      if (D.st === 'out') {
        D.x += D.vx * dt; D.y += D.vy * dt; D.dist += Math.hypot(D.vx, D.vy) * dt;
        if (this.solidAt(D.x, D.y)) { this.fxSparks(D.x, D.y, 5); Sfx.clang(0.4); D.x -= D.vx * dt; D.y -= D.vy * dt; D.st = 'back'; }
        else if (D.dist >= T.range) D.st = 'back';
      } else if (!o || !o.alive) {                                       // its thrower is gone: it drops
        D.vy += 500 * dt; D.x += D.vx * dt; D.y += D.vy * dt;
        if (this.solidAt(D.x, D.y) || D.y > LH) { drop(); continue; }
      } else {                                                           // it curves back to its thrower's hand
        const ddx = o.x - D.x, ddy = o.y - 4 - D.y, l = Math.hypot(ddx, ddy) || 1;
        if (l < 10) { if (D.mine) { this.damageEnemy(o, T.kickDmg, Math.sign(D.vx) || 1, 0, 'saw'); this.fxSparks(D.x, D.y, 10); Sfx.clang(); BUS.emit('callout', 'SPECIAL DELIVERY'); this.addStyle(60); } drop(); continue; }
        const sp = D.mine ? 380 : 300; D.vx += (ddx / l * sp - D.vx) * Math.min(1, dt * 5); D.vy += (ddy / l * sp - D.vy) * Math.min(1, dt * 5);
        D.x += D.vx * dt; D.y += D.vy * dt;
      }
      if (D.mine) {
        for (const e of this.enemies.getChildren()) {
          if (!e.alive || e.under || e === o || D.hits.has(e)) continue;
          const b = e.body; if (D.x < b.left - 3 || D.x > b.right + 3 || D.y < b.top - 3 || D.y > b.bottom + 3) continue;
          D.hits.add(e); this.damageEnemy(e, T.kickDmg, Math.sign(D.vx) || 1, 0, 'saw'); this.fxSparks(D.x, D.y, 6); Sfx.clang(0.5);
        }
      } else if (this.state !== 'dead' && now >= D.hitP && D.x > pb.left - 3 && D.x < pb.right + 3 && D.y > pb.top - 3 && D.y < pb.bottom + 3) {
        D.hitP = now + 450; this.hurtPlayer(T.dmg, D.x, { srcY: D.y });
      }
      if (Math.random() < 0.5) this.fx.emit(D.x, D.y, { n: 1, speed: [0, 10], life: [0.1, 0.2], size: [2, 1], cols: D.mine ? [0xffe46a] : [0xc8d0da], add: true });
    }
  },
  updateSpores(dt, now) {
    const T = TUNE.SPOREPOD, pb = this.player.body, tx = pb.center.x, ty = pb.center.y;
    for (let i = this.spores.length - 1; i >= 0; i--) {
      const S = this.spores[i]; S.t -= dt;
      if (S.t <= 0 || this.solidAt(S.x, S.y)) { this.popSpore(i); continue; }
      const ddx = tx - S.x, ddy = ty - S.y, l = Math.hypot(ddx, ddy) || 1, k = Math.min(1, dt * T.turn);
      S.vx += (ddx / l * T.speed - S.vx) * k; S.vy += (ddy / l * T.speed - S.vy) * k; S.x += S.vx * dt; S.y += S.vy * dt + Math.sin(now / 200 + i) * 0.3;
      let shot = false; for (const bl of this.bulletList) if (bl.active && Math.abs(bl.x - S.x) < 5 && Math.abs(bl.y - S.y) < 5) { shot = true; break; }
      if (shot) { this.popSpore(i); continue; }
      if (this.state !== 'dead' && Math.abs(S.x - tx) < pb.halfWidth + 2 && Math.abs(S.y - ty) < pb.halfHeight + 2) { this.hurtPlayer(T.dmg, S.x, { knock: false, srcY: S.y }); this.popSpore(i); continue; }
      if (Math.random() < 0.15) this.fx.emit(S.x, S.y, { n: 1, speed: [0, 8], life: [0.3, 0.6], size: [2, 3], cols: [0xb8e040, 0x7a9a30], alpha: [0.4, 0] });
    }
  },
  popSpore(i) { const S = this.spores[i]; this.fx.emit(S.x, S.y, { n: 6, speed: [20, 70], life: [0.2, 0.5], size: [2, 4], cols: [0xe0ff80, 0xb8e040, 0x7a9a30], alpha: [0.7, 0] }); this.spores.splice(i, 1); },

  // ---------------------------------------------------------------- scrap vacuum ----
  // Hold: a 170 px intake cone drags gibs, corpses, drums and light foes toward you; gibs that reach the nozzle go in
  // the hopper (24 max) and corpses are torn up for more. Let go: up to 16 pieces blast out as 9-damage shrapnel,
  // shoving you back. Nothing stored: a puff of air.
  vacuumTrigger(trig, now, dt) {
    const V = this.vac, W = TUNE.VACUUM, sx = this.shoulder.x, sy = this.shoulder.y, a = this.aim, ca = Math.cos(a), sa = Math.sin(a);
    if (trig && now >= this.nextFire && this.state !== 'dead') {
      if (!V.on) { V.on = true; V.humT = 0; }
      const nx = sx + ca * 16, ny = sy + sa * 16;
      const cone = (x, y) => { const ddx = x - sx, ddy = y - sy, d = Math.hypot(ddx, ddy); if (d > W.range || d < 1) return 0; const an = Math.atan2(ddy, ddx) - a; return Math.abs(Math.atan2(Math.sin(an), Math.cos(an))) < W.cone ? d : 0; };
      for (const gb of this.gibList) {
        if (!gb.active) continue; const d = cone(gb.x, gb.y); if (!d) continue;
        if (gb.stuckT > 0) { gb.stuckT = 0; gb.body.setAllowGravity(true); }
        const k = W.pull * (1.3 - d / W.range), gl = Math.hypot(nx - gb.x, ny - gb.y) || 1, m = Math.min(1, dt * 6);
        gb.body.velocity.x += ((nx - gb.x) / gl * k - gb.body.velocity.x) * m; gb.body.velocity.y += ((ny - gb.y) / gl * k - gb.body.velocity.y) * m;
        if (gl < 12 && V.ammo < W.store) { gb.disableBody(true, true); V.ammo++; if (Math.random() < 0.4) Sfx.tink(0.3); }
      }
      for (const rd of this.ragdolls.slice()) {                           // corpses: dragged in and torn up at the nozzle
        const c = rd.pts[2], d = cone(c.x, c.y); if (!d) continue;
        for (const q of rd.pts) { q.vx += (nx - q.x) / d * W.pull * 2.2 * dt; q.vy += (ny - q.y) / d * W.pull * 2.2 * dt - 300 * dt; }
        rd.asleep = false; rd.stillT = 0;
        if (Math.hypot(c.x - nx, c.y - ny) < 18) this.gibRagdoll(rd, ca, sa, 'kick');
      }
      for (const k of this.barrelList) if (k.active) { const d = cone(k.x, k.y); if (d) k.body.velocity.x += (nx - k.x) / d * 200 * dt; }
      // props are bolted down and the suction does no damage, so the vacuum leaves them alone
      for (const e of this.enemies.getChildren()) {
        if (!e.alive || e.under || e.def.kb < 0.5 || e.hp > 90 || e.def.noClip || e.def.boss || e.def.miniBoss) continue;
        const d = cone(e.body.center.x, e.body.center.y); if (!d) continue;
        e.body.velocity.x += (nx - e.body.center.x) / d * W.pull * 0.8 * e.def.kb * dt;
        if (FLIERS.has(e.kind)) e.body.velocity.y += (ny - e.body.center.y) / d * W.pull * 0.8 * e.def.kb * dt;
        e.stunT = Math.max(e.stunT, 0.1);
      }
      if (Math.random() < 0.8) { const r = rand(40, W.range), aa = a + rand(-W.cone, W.cone); this.fx.emit(sx + Math.cos(aa) * r, sy + Math.sin(aa) * r, { n: 1, angle: aa + Math.PI, spread: 0.05, speed: [r * 2.5, r * 3], life: [0.2, 0.3], size: [1, 1], cols: [0xc8d0da, 0x8a94a0], alpha: [0.6, 0] }); }
      if ((V.humT -= dt) <= 0) { V.humT = 0.3; Sfx.vacuum(); }
      this.recoil = 1;
    }
    if (!trig && V.on) {                                                  // let go: blast the hopper out
      V.on = false;
      const G = GUNS.vacuum, ox = this.gun.x + ca * G.muzzle, oy = this.gun.y + sa * G.muzzle, n = Math.min(V.ammo, W.burst);
      this.nextFire = now + W.cooldown;
      if (n > 0) {
        V.ammo -= n; this.stats.shots += n;
        for (let i = 0; i < n; i++) this.spawnBullet('shard', ox, oy, a + rand(-1, 1) * W.spread * DEG * (0.4 + n / W.burst * 0.6), W.speed * rand(0.8, 1.1), W.shard, 0.55);
        this.recoil = 4 + n * 0.4; Sfx.scrapBlast(); this.muzzle(ox, oy, a, 1 + n / 16, 70); this.fxSmoke(ox, oy, 4 + Math.round(n / 3));
        this.shake(60 + n * 6, 0.003 + n * 0.0003); this.addKick(-ca * (2 + n * 0.3), -sa * (2 + n * 0.3));
        const pb = this.player.body; pb.velocity.x -= ca * (40 + n * 9); if (!pb.blocked.down) pb.velocity.y -= sa * (30 + n * 6);
        if (n >= 12) { BUS.emit('callout', 'SCRAP STORM'); this.addStyle(40); }
      } else { Sfx.whoosh(); this.fx.emit(ox, oy, { n: 6, angle: a, spread: 0.4, speed: [60, 160], life: [0.15, 0.3], size: [2, 1], cols: [0xc8d0da], alpha: [0.6, 0] }); }
    }
  },

  // ---------------------------------------------------------------- siphon ----
  // A 140 px drain beam that latches onto the foe nearest your aim (a 0.4 rad cone, line of sight): 2.2 a tick
  // (~37 a second), a fifth of it back to you as health. You move at 75% while it drains.
  fireSiphon(now, ox, oy, a) {
    const W = TUNE.SIPHON, sx = this.shoulder.x, sy = this.shoulder.y;
    this.stats.shots++; this.siphonUntil = now + 120;
    let tgt = null, bd = 1e9;
    for (const e of this.enemies.getChildren()) {
      if (!e.alive || e.under) continue;
      const ex = e.body.center.x, ey = e.body.center.y, d = Math.hypot(ex - sx, ey - sy); if (d > W.range + e.body.halfWidth) continue;
      const an = Math.atan2(ey - sy, ex - sx) - a, da = Math.abs(Math.atan2(Math.sin(an), Math.cos(an))); if (da > W.cone) continue;
      const sc = d + da * 120; if (sc < bd && this.los(sx, sy, ex, ey)) { bd = sc; tgt = e; }
    }
    if ((this.sipSndT = (this.sipSndT || 0) - W.cooldown / 1000) <= 0) { this.sipSndT = 0.32; Sfx.siphon(); }
    if (!tgt) { this.siphonFx = { x0: ox, y0: oy, x1: ox + Math.cos(a) * 34, y1: oy + Math.sin(a) * 34, t: now, e: null }; return; }
    const ex = tgt.body.center.x, ey = tgt.body.center.y;
    this.siphonFx = { x0: ox, y0: oy, x1: ex, y1: ey, t: now, e: tgt };
    this.damageEnemy(tgt, W.dmg, Math.cos(a), Math.sin(a), 'siphon'); this.stats.hits++;
    if (this.hp < TUNE.PLAYER_HP && this.state !== 'dead') {
      this.sipAcc += W.dmg * W.heal;
      if (this.sipAcc >= 1) { const h = Math.floor(this.sipAcc); this.sipAcc -= h; this.hp = Math.min(TUNE.PLAYER_HP, this.hp + h); BUS.emit('hp', this.hp, 0); this.sipShown += h; }
    }
    if (Math.random() < 0.6) this.fx.emit(ex, ey, { n: 1, angle: Math.atan2(sy - ey, sx - ex), spread: 0.3, speed: [120, 200], life: [0.2, 0.35], size: [2, 1], cols: [0xff3a4a, 0xff8090], add: true });
    this.spawnLight(ex, ey, 'glow', 0xff3a4a, 0.4, 0.8, 0.5, 0.08);
  },

  // ================================================================== arsenal round ====
  // ---------------------------------------------------------------- firework launcher ----
  // An erratic rocket (300 px/s and speeding up, wandering as it goes) that bursts after 0.45-0.7 s or on contact:
  // 18 on a direct hit, 10 to anything within 28 px, and 10 coloured stars that fall and burn (7 each, one hit a foe).
  fireFirework(now, ox, oy, a, mx, my) {
    const cols = [[0xff4a6a, 0xffc0d0], [0x4ae0ff, 0xd0f8ff], [0xffd040, 0xfff4c0], [0x7aff5a, 0xe0ffd0], [0xc070ff, 0xf0d8ff]], T = TUNE.FIREWORK;
    this.stats.shots++;
    this.fireworks.push({ x: ox, y: oy, a: a + rand(-0.08, 0.08), sp: T.speed, t: rand(T.fuse[0], T.fuse[1]), wob: rand(0, 6), col: cols[randi(0, cols.length - 1)], shot: { counted: false } });
    Sfx.firework(); this.recoil = 3; this.muzzle(mx, my, a, 0.7, 40); this.fxSmoke(mx, my, 3); this.addKick(-Math.cos(a) * 2, -Math.sin(a) * 2);
  },
  updateFireworks(dt, now) {
    for (let i = this.fireworks.length - 1; i >= 0; i--) {
      const F = this.fireworks[i]; F.t -= dt; F.wob += dt * 18;
      F.a += Math.sin(F.wob) * dt * 3 + rand(-1, 1) * dt * 2; F.sp = Math.min(F.sp + 500 * dt, 520);   // it wanders like a real one
      const nx = F.x + Math.cos(F.a) * F.sp * dt, ny = F.y + Math.sin(F.a) * F.sp * dt, e = this.enemyAt(nx, ny, 3);
      const prop = this.props && this.props.some(q => q.st === 'ok' && Math.abs(nx - q.cx) <= q.hw && Math.abs(ny - q.cy) <= q.hh);   // it pops on scenery too
      if (F.t <= 0 || this.solidAt(nx, ny) || (e && !e.under) || prop) {
        if (e && !e.under) { this.damageEnemy(e, TUNE.FIREWORK.dmg, Math.cos(F.a), Math.sin(F.a), 'rocket'); this.fireworkHit(F.shot); }
        this.fireworkBurst(F.x, F.y, F.col, F.shot); this.fireworks.splice(i, 1); continue;
      }
      F.x = nx; F.y = ny;
      this.fx.emit(F.x, F.y, { n: 2, angle: F.a + Math.PI, spread: 0.5, speed: [20, 80], life: [0.15, 0.35], size: [2, 1], cols: [0xffffff, F.col[0], 0xffa030], add: true, g: 120 });
    }
    for (let i = this.stars.length - 1; i >= 0; i--) {                   // the stars: drift, fall, sparkle, burn what they touch
      const S = this.stars[i]; S.t -= dt; S.vy += 260 * dt; S.vx *= Math.pow(0.4, dt); S.vy *= Math.pow(0.7, dt);
      S.x += S.vx * dt; S.y += S.vy * dt;
      if (S.t <= 0 || this.solidAt(S.x, S.y)) { this.stars.splice(i, 1); continue; }
      for (const e of this.enemies.getChildren()) {
        if (!e.alive || e.under || S.hit.has(e)) continue;
        const b = e.body; if (S.x < b.left - 2 || S.x > b.right + 2 || S.y < b.top - 2 || S.y > b.bottom + 2) continue;
        S.hit.add(e); this.damageEnemy(e, TUNE.FIREWORK.starDmg, Math.sign(S.vx) || 1, 0, 'needle'); this.fireworkHit(S.shot);
        if (e.alive && Math.random() < 0.35) this.ignite(e, 1.2);
      }
      if (Math.random() < 0.4) this.fx.emit(S.x, S.y, { n: 1, speed: [0, 10], life: [0.1, 0.25], size: [1, 1], cols: [S.col, 0xffffff], add: true, g: 40 });
    }
  },
  fireworkHit(shot) { if (!shot.counted) { shot.counted = true; this.stats.hits++; } },   // a rocket is one shot: its hit, burst or stars count once
  fireworkBurst(x, y, col, shot = { counted: false }) {
    const T = TUNE.FIREWORK;
    for (let k = 0; k < T.stars; k++) { const a = k / T.stars * Math.PI * 2 + rand(-0.15, 0.15), v = rand(T.starSpeed[0], T.starSpeed[1]); this.stars.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, t: rand(T.starLife[0], T.starLife[1]), col: k % 3 ? col[0] : col[1], hit: new Set(), shot }); }
    for (const e of this.enemies.getChildren()) { if (!e.alive || e.under) continue; const d = Math.hypot(e.body.center.x - x, e.body.center.y - y); if (d < 28 + e.body.halfWidth) { this.damageEnemy(e, T.blast, Math.sign(e.body.center.x - x) || 1, -0.3, 'pellet'); this.fireworkHit(shot); } }
    for (const k of this.barrelList) if (k.active && Math.hypot(k.x - x, k.y - y) < 24) this.damageBarrel(k, 12);
    this.propsIn((px, py, r) => Math.hypot(px - x, py - y) < 24 + r, 12, 'shot');
    this.spawnLight(x, y, 'glow', col[0], 1.6, 3.2, 1, 0.35); this.spawnLight(x, y, 'ring', col[1], 0.2, 1.4, 0.9, 0.25);
    this.fx.emit(x, y, { n: 18, speed: [60, 240], life: [0.2, 0.5], size: [2, 1], cols: [0xffffff, col[1], col[0]], add: true, g: 60 });
    Sfx.fireworkPop(); this.shake(60, 0.003);
    this.time.delayedCall(rand(250, 400), () => Sfx.crackle());
  },

  // ---------------------------------------------------------------- plasma katana ----
  // A 46 px, 110 degree slash (alternating up and down cuts) every 260 ms: 30 to everything in it and a shove; it
  // executes glowing foes. Enemy shots in the arc are batted back at the nearest foe, rockets and bombs are cut in
  // two. Slash out of a dash for a DASH CUT: x1.8 damage and half again the reach.
  slashKatana(now, a, mx, my) {
    const T = TUNE.KATANA, sx = this.shoulder.x, sy = this.shoulder.y, dash = now < this.dashUntil + 120, reach = T.reach * (dash ? 1.5 : 1), mul = dash ? T.dashMul : 1;
    this.stats.shots++; this.kSwing = -this.kSwing;
    this.slashFx.push({ x: sx, y: sy, a, r: reach, dir: this.kSwing, t: 0, dash });
    const inArc = (x, y, pad) => { const ddx = x - sx, ddy = y - sy, d = Math.hypot(ddx, ddy); if (d > reach + pad) return false; return d < 12 || Math.abs(Math.atan2(Math.sin(Math.atan2(ddy, ddx) - a), Math.cos(Math.atan2(ddy, ddx) - a))) < T.arc / 2; };
    let n = 0, refl = 0;
    for (const e of this.enemies.getChildren()) {
      if (!e.alive || e.under) continue;
      const b = e.body; if (!inArc(b.center.x, b.center.y, Math.max(b.halfWidth, b.halfHeight))) continue;
      n++; this.stats.hits++;
      if (this.canExecute(e)) { this.execute(e, this.facing); continue; }
      if (e.def.mech) this.fxSparks(b.center.x, b.center.y, 6, a, 1, [80, 240]); else this.fxBlood(b.center.x, b.center.y, 8, a, 1, [80, 260]);
      this.damageEnemy(e, T.dmg * mul, Math.cos(a), Math.sin(a), 'slash');
      if (e.alive && e.def.kb > 0 && !e.def.anchored) { b.velocity.x += Math.cos(a) * T.push * e.def.kb; b.velocity.y -= 90 * e.def.kb; }
    }
    for (const list of [this.ebulletList, this.boltList]) for (const q of list) {   // bat the shots back
      if (!q.active || !inArc(q.x, q.y, 6)) continue;
      const x = q.x, y = q.y; q.disableBody(true, true); refl++;
      let tgt = null, bd = 520;
      for (const e of this.enemies.getChildren()) { if (!e.alive) continue; const d = Math.hypot(e.body.center.x - x, e.body.center.y - y); if (d < bd && this.los(x, y, e.body.center.x, e.body.center.y)) { bd = d; tgt = e; } }
      const ang = tgt ? Math.atan2(tgt.body.center.y - y, tgt.body.center.x - x) : a;
      this.spawnBullet('parry', x, y, ang, TUNE.KICK.parrySpeed, TUNE.KICK.parryDamage * 0.75, 1.2);
      this.fxSparks(x, y, 6, ang, 0.8, [100, 260]); this.spawnLight(x, y, 'glow', 0x46e6ff, 0.6, 1.4, 0.9, 0.12);
    }
    for (const q of this.eprojList) {                                    // rockets, bombs and globs: cut in two
      if (!q.active || !inArc(q.x, q.y, 8)) continue;
      q.disableBody(true, true); q.glow.setVisible(false); refl++;
      this.fxSparks(q.x, q.y, 10, a, 1.4, [80, 240]); this.fx.emit(q.x, q.y, { n: 6, speed: [30, 90], life: [0.3, 0.6], size: [3, 6], cols: [0x77706a, 0x55504c], alpha: [0.5, 0], g: -30 });
    }
    for (const k of this.barrelList) if (k.active && inArc(k.x, k.y, 6)) this.damageBarrel(k, 30);
    this.propsIn(inArc, 30, 'slash', Math.cos(a), Math.sin(a));
    for (const D of this.discs) if (!D.mine && inArc(D.x, D.y, 6)) { D.mine = true; D.st = 'back'; refl++; }
    for (let i = this.spores.length - 1; i >= 0; i--) if (inArc(this.spores[i].x, this.spores[i].y, 4)) this.popSpore(i);
    for (const gb of this.gibList) if (gb.active && inArc(gb.x, gb.y, 4)) { gb.body.velocity.x = Math.cos(a) * rand(240, 380); gb.body.velocity.y = Math.sin(a) * rand(240, 380) - 120; if (gb.stuckT > 0) { gb.stuckT = 0; gb.body.setAllowGravity(true); } }
    if (refl) { BUS.emit('callout', refl > 1 ? 'DEFLECT x' + refl : 'DEFLECT'); this.addStyle(30 * refl); Sfx.clang(0.6); this.hitStop(50); if ((this.ms.deflects = (this.ms.deflects || 0) + refl) >= 8) this.award('blademaster'); }
    if (n) { Sfx.slashHit(); this.hitStop(dash ? 70 : 35); this.shake(70, 0.004); if (n >= 3) { BUS.emit('callout', 'CLEAVE'); this.addStyle(40); } }
    if (dash && n) { BUS.emit('callout', 'DASH CUT'); this.addStyle(50); this.slowmoUntil = Math.max(this.slowmoUntil, now + 120); this.zoomPunch = Math.max(this.zoomPunch, 0.04); }
    Sfx.katana(); this.recoil = -2; this.addKick(Math.cos(a) * 2, Math.sin(a) * 2);
    this.spawnLight(sx + Math.cos(a) * reach * 0.6, sy + Math.sin(a) * reach * 0.6, 'glow', 0x46e6ff, 0.8, 1.6, 0.6, 0.12);
  },
  orbiterPlateHit(e, k, dmg) {                                          // a plate soaks it; enough and it shears off
    const a = e.spin + k * Math.PI * 2 / e.plates.length, px = e.x + Math.cos(a) * TUNE.ORBITER.radius, py = e.y + Math.sin(a) * TUNE.ORBITER.radius;
    e.plates[k] -= dmg; e.plateHit[k] = this.time.now + 60;
    this.fxSparks(px, py, 3, a, 1.2, [60, 180]); if (Math.random() < 0.5) Sfx.clang(0.3);
    if (e.plates[k] <= 0) {
      this.spawnGib('g_plate', px, py, Math.cos(a) * rand(140, 240), Math.sin(a) * rand(140, 240) - 100, 'metal');
      this.fxSparks(px, py, 10, a, 1.6, [80, 260]); Sfx.plateBreak(); this.addStyle(25); this.hitStop(30);
      if (e.plates.every(h => h <= 0)) { BUS.emit('callout', 'EXPOSED'); this.addStyle(40); }
    }
  },

  // ---------------------------------------------------------------- grav bomb ----
  // A lobbed violet charge (bounces, 0.9 s fuse, pops on a foe). It doesn't blow: every grounded foe within 90 px
  // floats up helpless for 1.4 s, then gravity comes back hard: 30 when it hits the floor. Corpses, gibs and drums
  // go up too. Fliers, bosses and things in the walls are immune.
  gravPulse(x, y) {
    const T = TUNE.GRAV; let n = 0;
    for (const e of this.enemies.getChildren()) {
      if (!e.alive || e.under || FLIERS.has(e.kind) || e.def.noClip || e.frozen > 0 || e.netT > 0 || (e.kind === 'para' && e.ai === 'drop')) continue;
      if (e.def.boss || e.def.miniBoss || e.kind === 'burrower' || e.kind === 'turret') continue;
      const b = e.body; if (Math.hypot(b.center.x - x, b.center.y - y) > T.radius + b.halfWidth) continue;
      e.gravT = T.float; e.gravSlam = false; b.setAllowGravity(false); b.setVelocity(b.velocity.x * 0.2 + (b.center.x - x) * 0.4, -T.rise);
      this.damageEnemy(e, T.dmg, 0, -1, 'kick'); n++;
    }
    for (const rd of this.ragdolls) if (Math.hypot(rd.pts[2].x - x, rd.pts[2].y - y) < T.radius) for (const q of rd.pts) q.vy = -rand(260, 360);
    for (const g2 of this.gibList) if (g2.active && Math.hypot(g2.x - x, g2.y - y) < T.radius) { if (g2.stuckT > 0) { g2.stuckT = 0; g2.body.setAllowGravity(true); } g2.body.velocity.y = -rand(250, 420); }
    for (const k of this.barrelList) if (k.active && Math.hypot(k.x - x, k.y - y) < T.radius) { k.body.velocity.y = -360; k.kicked = true; }
    this.propsIn((px, py, r) => Math.hypot(px - x, py - y) < T.radius + r, T.dmg, 'kick', 0, -1);
    this.gravFx.push({ x, y, t: 0 });
    Sfx.gravPulse(); this.warpPulse(0.5); this.shake(120, 0.005); this.spawnLight(x, y, 'glow', 0x9a60ff, 1.6, 0.4, 0.9, 0.3);
    this.fx.emit(x, y, { n: 24, speed: [40, 160], life: [0.4, 0.8], size: [2, 1], cols: [0xe0c8ff, 0x9a60ff, 0x5a20c0], add: true, g: -120 });
    if (n) this.stats.hits++;                                           // the bomb's one hit: the pulse that lifts foes
    if (n >= 3) { BUS.emit('callout', 'LIFTOFF'); this.addStyle(40); }
  },
  updateGravved(e, dt, now) {                                           // floating helpless, then slammed back down
    const b = e.body;
    if (e.gravT > 0) {
      e.gravT -= dt; b.velocity.y *= Math.pow(0.15, dt); b.velocity.x *= Math.pow(0.3, dt); e.rotation += dt * 2 * (e.dir || 1);
      if (Math.random() < 0.3) this.fx.emit(b.center.x + rand(-4, 4), b.bottom, { n: 1, angle: Math.PI / 2, spread: 0.3, speed: [10, 30], life: [0.2, 0.4], size: [2, 1], cols: [0x9a60ff, 0xe0c8ff], add: true });
      if (e.gravT <= 0) { e.gravT = 0; b.setAllowGravity(true); b.setVelocityY(TUNE.GRAV.slam); e.gravSlam = true; e.slamT = 1.2; }
      return;
    }
    e.slamT -= dt;
    if (b.blocked.down || b.touching.down || e.slamT <= 0) {
      e.gravSlam = false; e.rotation = 0;
      if (e.slamT > 0) {
        this.fxDust(b.center.x, b.bottom, 8); this.shake(90, 0.006); Sfx.stomp(); this.paintSplatAround(b.center.x, b.bottom - 1, 6);
        this.damageEnemy(e, TUNE.GRAV.slamDmg, 0, 1, 'crush');
      }
    }
  },

  // ---------------------------------------------------------------- pinball cannon ----
  // A heavy steel ball (560 px/s, light gravity) that bounces off everything for 5 s. 16 a hit, +6 for every bounce
  // so far (10 max), scaled by its speed; it caroms off foes too and glows hotter as the count climbs. Three out at
  // most: a fourth recycles the oldest. 700 ms.
  firePinball(now, ox, oy, a, mx, my) {
    const T = TUNE.PINBALL;
    let ball = this.balls.getFirstDead(false);
    if (!ball) { ball = this.ballList.filter(o => o.active).sort((p, q) => p.born - q.born)[0]; if (!ball) return; }
    this.stats.shots++;
    ball.enableBody(true, ox, oy, true, true);
    ball.body.setCircle(4); ball.body.setAllowGravity(true); ball.body.setGravityY(-this.physics.world.gravity.y * 0.45); ball.body.setBounce(T.bounce, T.bounce);
    ball.setVelocity(Math.cos(a) * T.speed, Math.sin(a) * T.speed);
    Object.assign(ball, { born: now, life: T.life, bounces: 0, hitMap: new Map(), pvx: Math.cos(a) * T.speed, pvy: Math.sin(a) * T.speed, slowT: 0, called: false, counted: false });
    ball.setTint(0xffffff);
    Sfx.pinball(0); this.recoil = 6; this.muzzle(mx, my, a, 1.1, 60); this.fxSparks(mx, my, 5, a, 0.6, [60, 200]); this.shake(70, 0.004); this.addKick(-Math.cos(a) * 4, -Math.sin(a) * 4);
  },
  onBallHit(ball, e) {
    if (!ball.active || !e.alive || e.under) return;
    const now = this.time.now, T = TUNE.PINBALL; if ((ball.hitMap.get(e) || 0) > now) return; ball.hitMap.set(e, now + 220);
    const v = ball.body.velocity, sp = Math.hypot(v.x, v.y) || 1, ux = v.x / sp, uy = v.y / sp;
    this.damageEnemy(e, (T.dmg + T.perBounce * ball.bounces) * clamp(sp / 420, 0.5, 1.3), ux, uy, 'pellet');
    if (!ball.counted) { ball.counted = true; this.stats.hits++; }      // a ball is one shot however often it bounces into foes
    if (e.alive && e.def.kb > 0 && !e.def.anchored) { e.body.velocity.x += ux * 260 * e.def.kb; e.body.velocity.y -= 120 * e.def.kb; }
    const b = e.body, nx0 = ball.x - b.center.x, ny0 = ball.y - b.center.y, nl = Math.hypot(nx0, ny0) || 1, nx = nx0 / nl, ny = ny0 / nl;   // carom off it
    const dot = v.x * nx + v.y * ny; if (dot < 0) { v.x -= 2 * dot * nx; v.y -= 2 * dot * ny; }
    v.x *= 0.9; v.y *= 0.9; ball.pvx = v.x; ball.pvy = v.y;
    ball.bounces = Math.min(T.maxBounce, ball.bounces + 1);
    Sfx.pinball(ball.bounces); this.hitStop(25); this.fxSparks(ball.x, ball.y, 5, Math.atan2(ny, nx), 1, [80, 220]);
    if (ball.bounces >= 6 && !ball.called) { ball.called = true; BUS.emit('callout', 'BUMPER x' + ball.bounces); this.addStyle(30); }
  },
  updateBalls(dt, now) {
    const T = TUNE.PINBALL;
    for (const ball of this.ballList) {
      if (!ball.active) continue;
      ball.life -= dt;
      const b = ball.body, v = b.velocity, sp = Math.hypot(v.x, v.y), onG = b.blocked.down || b.touching.down;
      const flipX = Math.sign(v.x) !== Math.sign(ball.pvx) && Math.abs(ball.pvx) > 80, flipY = Math.sign(v.y) !== Math.sign(ball.pvy) && Math.abs(ball.pvy) > 80;
      if (flipX || flipY) { ball.bounces = Math.min(T.maxBounce, ball.bounces + 1); Sfx.pinball(ball.bounces); this.fxSparks(ball.x, ball.y, 3, flipY ? (v.y < 0 ? -Math.PI / 2 : Math.PI / 2) : (v.x < 0 ? Math.PI : 0), 1.2, [40, 140]); }
      ball.pvx = v.x; ball.pvy = v.y;
      if (onG) v.x *= Math.pow(0.5, dt);                                  // it rolls to a stop on the floor
      ball.slowT = sp < 40 && onG ? ball.slowT + dt : 0;
      if (ball.life <= 0 || ball.slowT > 0.6) { this.fx.emit(ball.x, ball.y, { n: 6, speed: [20, 80], life: [0.2, 0.4], size: [2, 1], cols: [0xc8d0da, 0xffffff], add: true }); ball.disableBody(true, true); continue; }
      ball.rotation += v.x * dt * 0.08;
      const heat = ball.bounces / T.maxBounce;                              // hotter with every bounce: steel, orange, white-hot
      ball.setTint(Phaser.Display.Color.GetColor(255, Math.round(255 - 130 * heat), Math.round(255 - 230 * heat)));
      if (sp > 120 && Math.random() < 0.6) this.fx.emit(ball.x, ball.y, { n: 1, speed: [0, 0], life: [0.08, 0.16], size: [3, 1], cols: heat > 0.5 ? [0xffa030, 0xff5a1a] : [0xc8d0da, 0x8a94a0], add: true });
      for (const k of this.barrelList) if (k.active && Math.abs(k.x - ball.x) < 8 && Math.abs(k.y - ball.y) < 10 && !(ball.hitMap.get(k) > now)) { ball.hitMap.set(k, now + 300); this.damageBarrel(k, 20 + 6 * ball.bounces); }
      if (this.props && !(ball.propT > now) && this.hitPropsAt(ball.x, ball.y, Math.sign(v.x) || 1, 0, 20 + 6 * ball.bounces)) ball.propT = now + 300;
    }
  },

  // ================================================================== mastery round ====
  // ---------------------------------------------------------------- shrink ray ----
  // A wobbling ray (hitscan, 380 px). The foe it hits shrinks to half size for 8 s: it takes x1.5, bites for half, and
  // you can jump on it to squash it flat. Bosses only shrink for 3 s and can't be stomped.
  fireShrink(now, ox, oy, a, mx, my) {
    const W = TUNE.SHRINK, ca = Math.cos(a), sa = Math.sin(a), sx = this.shoulder.x, sy = this.shoulder.y;
    this.stats.shots++;
    let ex = ox, ey = oy, hit = null;
    for (let d = 6; d < W.range; d += 3) { const x = sx + ca * d, y = sy + sa * d; if (this.solidAt(x, y)) break; ex = x; ey = y; const e = this.enemyAt(x, y, 1); if (e && !e.under) { hit = e; break; } }
    this.shrinkFx.push({ x0: ox, y0: oy, x1: ex, y1: ey, t: 0 });
    Sfx.shrink(); this.recoil = 3; this.spawnLight(mx, my, 'glow', 0x60ffe0, 0.6, 1.2, 0.8, 0.1);
    if (!hit) return;
    const big = hit.def.boss || hit.def.miniBoss || hit.kind === 'blimp';
    if (hit.kind === 'gasbag' || hit.kind === 'claw') { this.damageEnemy(hit, 10, ca, sa, 'shock'); return; }
    hit.shrunkT = big ? 3 : W.time; hit.noStomp = big; this.stats.hits++;
    this.spawnLight(hit.x, hit.y, 'ring', 0xff60d0, 1.2, 0.3, 0.9, 0.2);
    if (!hit.shrunkOn) BUS.emit('callout', 'SHRUNK!');
  },
  updateStomps(dt, now) {                                               // land on a shrunk foe: squish
    if (this.state === 'dead') return;
    const pb = this.player.body; if (pb.velocity.y <= 40) return;
    for (const e of this.enemies.getChildren()) {
      if (!e.alive || !(e.shrunkT > 0) || e.noStomp) continue;
      const b = e.body; if (pb.right < b.left || pb.left > b.right || pb.bottom < b.top - 6 || pb.bottom > b.bottom + 2) continue;
      pb.velocity.y = -240; this.jumpCuttable = false; this.paintSplatAround(b.center.x, b.bottom - 1, 8);
      BUS.emit('callout', 'SQUISHED!'); this.addStyle(70); Sfx.squish(); Sfx.splat(1); this.hitStop(60);
      e.hp = 0; this.killEnemy(e, 0, 1, 'stomp');
      break;
    }
  },

  // ---------------------------------------------------------------- sonic blaster ----
  // A thump of sound through a 60 degree cone, 110 px: 10 to everything in it and a huge shove away (wall splats!),
  // a stun, and every enemy shot in the cone blown out of the air. 900 ms.
  fireSonic(now, a, mx, my) {
    const W = TUNE.SONIC, sx = this.shoulder.x, sy = this.shoulder.y;
    this.stats.shots++;
    const inCone = (x, y, pad) => { const d = Math.hypot(x - sx, y - sy); if (d > W.range + pad) return false; let da = Math.abs(Math.atan2(y - sy, x - sx) - a) % (Math.PI * 2); if (da > Math.PI) da = Math.PI * 2 - da; return da <= W.cone || d < 12; };
    let n = 0;
    for (const e of this.enemies.getChildren()) {
      if (!e.alive || e.under || !inCone(e.body.center.x, e.body.center.y, e.body.halfWidth)) continue;
      const b = e.body, ux = Math.cos(Math.atan2(b.center.y - sy, b.center.x - sx)), uy = Math.sin(Math.atan2(b.center.y - sy, b.center.x - sx));
      this.damageEnemy(e, W.dmg, ux, uy, 'kick'); n++;
      if (e.alive && e.def.kb > 0) { b.velocity.x = ux * W.push * e.def.kb; b.velocity.y = Math.min(-120, uy * W.push * e.def.kb) * 0.8; e.kickedT = 0.7; e.stunT = Math.max(e.stunT, 0.6); }
    }
    if (n) this.stats.hits++;                                           // one shot, one hit, however many it shoves
    for (const list of [this.ebulletList, this.boltList]) for (const b of list) if (b.active && inCone(b.x, b.y, 4)) { const x = b.x, y = b.y; b.disableBody(true, true); this.fxSparks(x, y, 3); }
    for (const q of this.eprojList) if (q.active && inCone(q.x, q.y, 4)) { q.body.velocity.x = Math.cos(a) * 300; q.body.velocity.y = Math.sin(a) * 300 - 60; }
    for (const g2 of this.gibList) if (g2.active && inCone(g2.x, g2.y, 6)) { if (g2.stuckT > 0) { g2.stuckT = 0; g2.body.setAllowGravity(true); } g2.body.velocity.x = Math.cos(a) * 420; g2.body.velocity.y = Math.sin(a) * 420 - 120; }
    for (const k of this.barrelList) if (k.active && inCone(k.x, k.y, 6)) { k.body.velocity.x = Math.cos(a) * 320; k.body.velocity.y = -180; k.kicked = true; }
    this.propsIn(inCone, W.dmg, 'sonic', Math.cos(a), Math.sin(a));
    for (const rd of this.ragdolls) if (inCone(rd.pts[2].x, rd.pts[2].y, 6)) for (const q of rd.pts) { q.vx = Math.cos(a) * 380; q.vy = Math.sin(a) * 380 - 160; }
    this.sonics.push({ x: sx, y: sy, a, t: 0 });
    Sfx.sonic(); this.recoil = 7; this.shake(140, 0.007); this.warpPulse(0.35); this.addKick(-Math.cos(a) * 6, -Math.sin(a) * 6);
    this.player.body.velocity.x -= Math.cos(a) * 120;
    if (n >= 3) { BUS.emit('callout', 'SONIC BOOM'); this.addStyle(40); }
  },

  // ---------------------------------------------------------------- bee swarm ----
  // A hive pod that bursts after 0.25 s into six bees. Each one hunts a foe near it and stings (4 every 0.3 s) for 4 s,
  // buzzing round its target, then dies.
  fireBees(now, ox, oy, a, mx, my) {
    const W = TUNE.BEES;
    this.stats.shots++; Sfx.bees(); this.recoil = 3;
    this.time.delayedCall(250, () => {
      const x = ox + Math.cos(a) * W.speed * 0.25, y = oy + Math.sin(a) * W.speed * 0.25, px = this.solidAt(x, y) ? ox : x, py = this.solidAt(x, y) ? oy : y;
      this.fx.emit(px, py, { n: 8, speed: [30, 90], life: [0.2, 0.4], size: [2, 1], cols: [0xffe040, 0xc8a028], add: true });
      for (let i = 0; i < W.n; i++) this.bees.push({ x: px, y: py, vx: rand(-120, 120), vy: rand(-120, 60), t: W.life + rand(-0.4, 0.4), tgt: null, stingT: rand(0, 0.3), retarget: 0 });
      Sfx.bees();
    });
  },
  updateBees(dt, now) {
    if (!this.bees.length) return;
    const W = TUNE.BEES;
    for (let i = this.bees.length - 1; i >= 0; i--) {
      const B = this.bees[i]; B.t -= dt;
      if (B.t <= 0) { this.fx.emit(B.x, B.y, { n: 2, speed: [10, 40], life: [0.1, 0.2], size: [1, 1], cols: [0xffe040], add: true }); this.bees.splice(i, 1); continue; }
      if ((B.retarget -= dt) <= 0 || !B.tgt || !B.tgt.alive) {
        B.retarget = 0.5; B.tgt = null; let bd = 220;
        for (const e of this.enemies.getChildren()) { if (!e.alive || e.under) continue; const d = Math.hypot(e.body.center.x - B.x, e.body.center.y - B.y) + rand(0, 40); if (d < bd) { bd = d; B.tgt = e; } }
      }
      const tx = B.tgt ? B.tgt.body.center.x + Math.sin(now / 90 + i) * 8 : this.player.x + Math.cos(now / 300 + i) * 30, ty = B.tgt ? B.tgt.body.center.y + Math.cos(now / 70 + i) * 8 : this.player.y - 20;
      const dx = tx - B.x, dy = ty - B.y, l = Math.hypot(dx, dy) || 1, k = Math.min(1, dt * 5);
      B.vx += (dx / l * W.fly - B.vx) * k + rand(-60, 60) * dt * 10; B.vy += (dy / l * W.fly - B.vy) * k + rand(-60, 60) * dt * 10;
      B.x += B.vx * dt; B.y += B.vy * dt;
      if (B.tgt && (B.stingT -= dt) <= 0 && Math.abs(B.x - B.tgt.body.center.x) < B.tgt.body.halfWidth + 3 && Math.abs(B.y - B.tgt.body.center.y) < B.tgt.body.halfHeight + 3) {
        B.stingT = W.stingCd; this.damageEnemy(B.tgt, W.sting, Math.sign(B.vx) || 1, 0, 'needle'); this.stats.hits++;
      }
    }
    if (Math.random() < dt * 3) Sfx.bees();
  },

  // ---------------------------------------------------------------- laser whip ----
  // A 74 px crack of plasma along your aim (a slight curve): 28 to everything along it, and it drags them toward you
  // (and gibs, drums and gas cans too).
  crackWhip(now, a, mx, my) {
    const W = TUNE.WHIP, sx = this.shoulder.x, sy = this.shoulder.y, ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca, bend = this.facing * 10;
    this.stats.shots++;
    const pts = [];
    for (let i = 0; i <= 10; i++) { const t = i / 10, d = 12 + W.reach * t, w = Math.sin(t * Math.PI) * bend; let x = sx + ca * d + nx * w, y = sy + sa * d + ny * w; if (this.solidAt(x, y)) break; pts.push([x, y]); }
    if (pts.length < 2) return;
    this.whipFx = { pts, t: 0 };
    const hitSet = new Set();
    for (const [x, y] of pts) for (const e of this.enemies.getChildren()) {
      if (!e.alive || e.under || hitSet.has(e)) continue;
      const b = e.body; if (x < b.left - 4 || x > b.right + 4 || y < b.top - 4 || y > b.bottom + 4) continue;
      hitSet.add(e); this.stats.hits++;
      if (e.def.mech) this.fxSparks(x, y, 5); else this.fxBlood(x, y, 6, a, 1.2, [60, 200]);
      this.damageEnemy(e, W.dmg, -ca, -sa, 'whip');
      if (e.alive && e.def.kb > 0) { const dx = sx - b.center.x, dy = sy - b.center.y, l = Math.hypot(dx, dy) || 1; b.velocity.x = dx / l * W.pull * e.def.kb; b.velocity.y = dy / l * W.pull * e.def.kb - 80; e.stunT = Math.max(e.stunT, 0.4); }
    }
    const tip = pts[pts.length - 1];
    for (const gb of this.gibList) if (gb.active && Math.hypot(gb.x - tip[0], gb.y - tip[1]) < 20) { gb.body.velocity.x = (sx - gb.x) * 6; gb.body.velocity.y = (sy - gb.y) * 6 - 100; }
    for (const k of this.barrelList) if (k.active && Math.hypot(k.x - tip[0], k.y - tip[1]) < 18) { k.body.velocity.x = (sx - k.x) * 5; k.body.velocity.y = -160; }
    if (this.props) { const tok = 'whip' + now; for (const [x, y] of pts) this.hitPropsAt(x, y, ca, sa, W.dmg, tok); }   // the whole lash, once per prop a crack
    if (hitSet.size) { Sfx.kickHit(); this.hitStop(35); if (hitSet.size >= 3) { BUS.emit('callout', 'WHIPLASH'); this.addStyle(40); } }
    Sfx.whip(); this.recoil = 4; this.shake(50, 0.002); this.spawnLight(tip[0], tip[1], 'glow', 0xff40c0, 0.6, 1.4, 0.8, 0.1);
  },

  // ================================================================== codex round ====
  // ---------------------------------------------------------------- spider mines ----
  // Fires a little bot that lands and scuttles along the floor at the nearest foe (110 px/s, hopping steps), then
  // blows when it reaches one (radius 34, 50->15), or after 6 s. Up to 4 out; a 5th sets off the oldest.
  fireSpider(now, ox, oy, a, mx, my) {
    const W = TUNE.SPIDER;
    this.stats.shots++;
    if (this.spiders.length >= W.max) this.popSpider(this.spiders[0]);
    this.spiders.push({ x: ox, y: oy, vx: Math.cos(a) * W.speed, vy: Math.sin(a) * W.speed - 40, st: 'fly', dir: Math.cos(a) >= 0 ? 1 : -1, t: W.life, img: this.add.image(ox, oy, 'spider0').setDepth(7) });
    Sfx.limpet(); this.recoil = 3; this.spawnLight(mx, my, 'glow', 0xff6040, 0.5, 1, 0.6, 0.08);
  },
  popSpider(L) { const i = this.spiders.indexOf(L); if (i < 0) return; this.spiders.splice(i, 1); L.img.destroy(); this.explode(L.x, L.y - 2, TUNE.SPIDER.blast); },
  updateSpiders(dt, now) {
    const W = TUNE.SPIDER, G = this.physics.world.gravity.y;
    for (const L of this.spiders.slice()) {
      L.t -= dt;
      if (L.t <= 0) { this.popSpider(L); continue; }
      if (L.st === 'fly') {
        const px = L.x, py = L.y; L.vy += G * dt; L.x += L.vx * dt; L.y += L.vy * dt;
        const hit = this.sweep(px, py, L.x, L.y);
        if (hit) { if (L.vy > 0 && this.standAt(hit.x, hit.y + 2)) { L.st = 'walk'; L.x = hit.x; L.y = Math.floor((hit.y + 2) / TS) * TS; Sfx.stick(); } else { L.x = px; L.y = py; L.vx *= -0.3; L.vy = Math.max(L.vy, 0); } }
        if (L.y > LH) { this.popSpider(L); continue; }
      } else {
        let tgt = null, bd = 300;
        for (const e of this.enemies.getChildren()) { if (!e.alive || e.under) continue; const d = Math.hypot(e.body.center.x - L.x, e.body.center.y - L.y); if (d < bd && Math.abs(e.body.bottom - L.y) < 70) { bd = d; tgt = e; } }
        if (tgt) L.dir = Math.sign(tgt.body.center.x - L.x) || L.dir;
        const nx = L.x + L.dir * W.walk * dt;
        if (this.solidAt(nx + L.dir * 3, L.y - 3)) { L.st = 'fly'; L.vx = L.dir * 80; L.vy = -230; }                 // hop the step
        else if (!this.standAt(nx, L.y + 2)) { L.st = 'fly'; L.vx = L.dir * W.walk; L.vy = 0; L.x = nx; }        // off the edge
        else L.x = nx;
        if (Math.random() < dt * 6) this.fxDust(L.x, L.y, 1);
      }
      if (this.enemies.getChildren().some(e => e.alive && !e.under && Math.abs(e.body.center.x - L.x) < e.body.halfWidth + 6 && L.y > e.body.top - 4 && L.y - 6 < e.body.bottom)) this.popSpider(L);
    }
  },

  // ---------------------------------------------------------------- napalm ----
  // Lobs a fuel canister that splashes on impact: three fire patches across 60 px and every foe within 44 px alight.
  fireNapalm(now, ox, oy, a, mx, my) {
    const W = TUNE.NAPALM;
    this.stats.shots++;
    this.napalms.push({ x: ox, y: oy, vx: Math.cos(a) * W.speed, vy: Math.sin(a) * W.speed - 60, img: this.add.image(ox, oy, 'napalmcan').setDepth(8) });
    Sfx.grenade(); this.recoil = 5; this.muzzle(mx, my, a, 1.1, 60); this.fxSmoke(mx, my, 4);
  },
  updateNapalms(dt, now) {
    const W = TUNE.NAPALM, G = this.physics.world.gravity.y;
    for (let i = this.napalms.length - 1; i >= 0; i--) {
      const n = this.napalms[i], px = n.x, py = n.y; n.vy += G * 0.8 * dt; n.x += n.vx * dt; n.y += n.vy * dt;
      const hit = this.sweep(px, py, n.x, n.y), e = this.enemyAt(n.x, n.y, 2);
      if (!(hit || (e && !e.under) || n.y > LH)) { n.img.setPosition(n.x, n.y).setRotation(Math.atan2(n.vy, n.vx)); continue; }
      const x = hit ? hit.x : n.x, y = hit ? hit.y : n.y;
      this.napalms.splice(i, 1); n.img.destroy();
      for (const dx of [-30, 0, 30]) this.spawnFirePatch(x + dx, y - 6);
      let burned = false;
      for (const o of this.enemies.getChildren()) if (o.alive && !o.under && Math.hypot(o.body.center.x - x, o.body.center.y - y) < W.splash) { this.ignite(o, W.burn); this.damageEnemy(o, 10, Math.sign(o.x - x) || 1, -0.5, 'flame'); burned = true; }
      if (burned) this.stats.hits++;
      for (let k = 0; k < 8; k++) this.fxFire(x + rand(-30, 30), y - 2, 3);
      this.spawnLight(x, y, 'glow', 0xff8a20, 2, 4, 0.9, 0.3); Sfx.tarIgnite(); this.shake(120, 0.005);
      for (const T of this.tars.slice()) if (Math.abs(T.x - x) < T.w / 2 + 40 && Math.abs(T.y - y) < 20) this.igniteTar(T);
      for (const C of this.clouds.slice()) if (Math.hypot(C.x - x, C.y - y) < C.r + 30) this.igniteCloud(C);
    }
  },
  beaconCall(e) {
    const fy = this.floorBelow(e.x, e.y); if (fy === null) return;
    Sfx.warp(); BUS.emit('callout', 'REINFORCEMENTS');
    for (let i = 0; i < TUNE.BEACON.adds; i++) {
      const x = clamp(e.x + (i ? 24 : -24), 40, LW - 40), cx = Math.floor(x / TS), cy = Math.floor((fy - 2) / TS);
      if (this.solidAt(x, fy - 10)) continue;
      this.spawnLight(x, fy - 14, 'ring', 0xff80e0, 1.4, 0.2, 0.8, 0.6);
      this.time.delayedCall(600, () => {
        if (this.state === 'dead') return;
        const o = this.spawnEnemy(pick(['grunt', 'stalker', 'enforcer']), cx, cy), now = this.time.now;
        Object.assign(o, { summoned: true, aggro: true, aggroT: 6 });
        if (isHumanoid(o)) { o.lkx = this.player.x; o.lky = this.player.y; o.lkT = now; this.alertHumanoid(o, now, false); }
      });
    }
  },

  // ---------------------------------------------------------------- orbital designator ----
  // Hold to paint a spot (0.8 s). Let go early and it cancels. Locked, the strike lands 0.6 s later: a 14 px column
  // from the roof (or the first metal above) down to the mark for 1 s, 90 DPS to anything in it (a third of that to
  // you), igniting and punching through scenery. 5 s cooldown.
  orbitalTrigger(trig, now, dt) {
    const S = this.sky, O = TUNE.ORBITAL;
    if (S.st === 'idle' && trig && now >= this.nextFire) { S.st = 'paint'; S.t = 0; }
    if (S.st !== 'paint') return;
    if (!trig) { S.st = 'idle'; return; }                                // released before the lock: cancelled
    S.t += dt;
    const a = this.aim, ca = Math.cos(a), sa = Math.sin(a), sx = this.shoulder.x, sy = this.shoulder.y;
    let x = sx, y = sy;
    for (let d = 6; d < O.range; d += 3) { const qx = sx + ca * d, qy = sy + sa * d; if (this.solidAt(qx, qy)) break; x = qx; y = qy; const e = this.enemyAt(qx, qy, 1); if (e && !e.under) break; }
    S.x = x; S.y = y;
    if ((S.beepT = (S.beepT || 0) - dt) <= 0) { S.beepT = 0.12 - 0.08 * Math.min(1, S.t / O.paint); Sfx.paint(); }
    if (S.t >= O.paint) {                                                // locked: find where the strike comes down from
      let fy = S.y; for (let yy = S.y; yy < S.y + 200; yy += 3) { if (this.solidAt(S.x, yy)) { fy = yy - 1; break; } fy = yy; }
      S.y = fy; let top = S.y; for (let yy = S.y - 4; yy > 0; yy -= 4) { const c = this.tileAt(Math.floor(S.x / TS), Math.floor(yy / TS)); if (c === '#') break; top = yy; }
      S.top = top; S.st = 'wait'; S.t = O.delay; this.nextFire = now + O.cooldown; this.stats.shots++;
      BUS.emit('callout', 'STRIKE INBOUND'); Sfx.lockOn(3);
    }
  },
  updateSky(dt, now) {
    const S = this.sky, O = TUNE.ORBITAL;
    if (S.st === 'wait') { S.t -= dt; if (S.t <= 0) { S.st = 'fire'; S.t = O.fire; S.tick = 0; Sfx.orbital(); this.impactFrame(2); BUS.emit('flash', 0.25); } return; }
    if (S.st !== 'fire') return;
    S.t -= dt;
    this.shake(80, 0.006); if (Math.random() < 0.8) this.fxSparks(S.x + rand(-6, 6), S.y - 2, 3, -Math.PI / 2, 1.6, [80, 260]); if (Math.random() < 0.4) this.fxSmoke(S.x, S.y - 4, 2);
    if ((S.tick -= dt) <= 0) {
      S.tick = 0.1; const x0 = S.x - O.half, x1 = S.x + O.half, pb = this.player.body;
      for (const e of this.enemies.getChildren()) {
        if (!e.alive || e.under) continue;
        const b = e.body; if (b.right < x0 || b.left > x1 || b.bottom < S.top || b.top > S.y + 4) continue;
        this.ignite(e, 2); this.damageEnemy(e, O.dps * 0.1, 0, 1, 'rail'); this.stats.hits++;
      }
      if (this.state !== 'dead' && pb.right > x0 && pb.left < x1 && pb.bottom > S.top && pb.top < S.y + 4) this.hurtPlayer(O.dps * 0.1 / 3, S.x, { knock: false, iframes: false, burn: true });
      for (let yy = S.top; yy < S.y + 4; yy += TS) { const tx = Math.floor(S.x / TS), ty = Math.floor(yy / TS), c = this.tileAt(tx, ty); if (c === 'x' || c === 'g' || c === '=') this.damageTile(tx, ty, 40); }
      for (const k of this.barrelList) if (k.active && k.x > x0 - 4 && k.x < x1 + 4 && k.y > S.top && k.y < S.y + 8) this.igniteBarrel(k);
      for (const T of this.tars.slice()) if (Math.abs(T.x - S.x) < T.w / 2 + O.half && Math.abs(T.y - S.y) < 10) this.igniteTar(T);
      this.paintScorch(S.x, S.y + 2, 9);
    }
    if (S.t <= 0) S.st = 'idle';
  },

  // ---------------------------------------------------------------- plasma cutter ----
  // A flat plasma blade (20 px across, at right angles to the shot) that flies 300 px, cutting every body it crosses
  // once (30) and slicing through crates; grey metal stops it.
  fireCutter(now, ox, oy, a, mx, my) {
    const W = TUNE.CUTTER;
    this.stats.shots++;
    this.blades.push({ x: ox, y: oy, vx: Math.cos(a) * W.speed, vy: Math.sin(a) * W.speed, ang: a, t: W.life, hits: new Set() });
    Sfx.cutter(); this.recoil = 3; this.spawnLight(mx, my, 'glow', 0x60d0ff, 0.6, 1.2, 0.8, 0.08); this.shake(40, 0.0015);
  },
  updateBlades(dt, now) {
    const W = TUNE.CUTTER;
    for (let i = this.blades.length - 1; i >= 0; i--) {
      const B = this.blades[i]; B.t -= dt; B.x += B.vx * dt; B.y += B.vy * dt;
      const px = -Math.sin(B.ang) * W.half, py = Math.cos(B.ang) * W.half;
      if (B.t <= 0 || this.tileAt(Math.floor(B.x / TS), Math.floor(B.y / TS)) === '#') { this.fxSparks(B.x, B.y, 6, B.ang + Math.PI, 1.4); this.blades.splice(i, 1); continue; }
      for (const k of [-1, 0, 1]) { const tx = Math.floor((B.x + px * k) / TS), ty = Math.floor((B.y + py * k) / TS), c = this.tileAt(tx, ty); if (c === 'x' || c === 'g' || c === '=') this.damageTile(tx, ty, 20); }
      for (const e of this.enemies.getChildren()) {
        if (!e.alive || e.under || B.hits.has(e)) continue;
        if (this.segDist(e.body.center.x, e.body.center.y, B.x - px, B.y - py, B.x + px, B.y + py)[0] > Math.max(e.body.halfWidth, e.body.halfHeight)) continue;
        B.hits.add(e); this.stats.hits++;
        if (e.def.mech) this.fxSparks(e.body.center.x, e.body.center.y, 6); else this.fxBlood(e.body.center.x, e.body.center.y, 10, B.ang, 1.4, [80, 260]);
        this.damageEnemy(e, W.dmg, Math.cos(B.ang), Math.sin(B.ang), 'saw');
      }
      if (Math.random() < 0.6) this.fx.emit(B.x, B.y, { n: 1, speed: [0, 15], life: [0.1, 0.2], size: [2, 1], cols: [0xffffff, 0x9ae8ff], add: true });
    }
  },

  // ---------------------------------------------------------------- net gun ----
  // A slow net shell that bursts on contact (radius 26): everything caught is tangled for 3 s (no moving, no
  // attacking, fliers drop, 6 DPS of shock, and it takes +25% from everything else).
  fireNet(now, ox, oy, a, mx, my) {
    const W = TUNE.NET;
    this.stats.shots++;
    this.nets.push({ x: ox, y: oy, vx: Math.cos(a) * W.speed, vy: Math.sin(a) * W.speed - 20, img: this.add.image(ox, oy, 'netball').setDepth(8) });
    Sfx.net(); this.recoil = 4; this.muzzle(mx, my, a, 0.8, 40); this.shake(50, 0.002);
  },
  updateNets(dt, now) {
    const W = TUNE.NET, G = this.physics.world.gravity.y;
    for (let i = this.nets.length - 1; i >= 0; i--) {
      const n = this.nets[i], px = n.x, py = n.y;
      n.vy += G * 0.35 * dt; n.x += n.vx * dt; n.y += n.vy * dt;
      const hit = this.sweep(px, py, n.x, n.y), e = this.enemyAt(n.x, n.y, 3);
      if (hit || (e && !e.under) || n.y > LH) {
        const x = hit ? hit.x : n.x, y = hit ? hit.y : n.y;
        this.nets.splice(i, 1); n.img.destroy();
        this.spawnLight(x, y, 'ring', 0xc8c0a8, 0.2, 1.4, 0.9, 0.2);
        for (let k = 0; k < 10; k++) { const th = k / 10 * Math.PI * 2; this.fx.emit(x, y, { n: 1, angle: th, spread: 0.1, speed: [80, 120], life: [0.15, 0.25], size: [2, 1], cols: [0xc8c0a8, 0x8a8070] }); }
        let caught = 0;
        for (const o of this.enemies.getChildren()) {
          if (!o.alive || o.under || o.kind === 'wyrmseg' || o.kind === 'wraith') continue;
          if (Math.hypot(o.body.center.x - x, o.body.center.y - y) > W.radius + Math.max(o.body.halfWidth, o.body.halfHeight)) continue;
          const boss = o.def.boss || o.def.miniBoss;
          o.netT = boss ? W.hold * 0.4 : W.hold; o.netTick = 0; caught++;
          if (FLIERS.has(o.kind) && !boss) o.body.setAllowGravity(true);
        }
        if (caught) { this.stats.hits++; Sfx.zap(); if (caught >= 3) { BUS.emit('callout', 'NET HAUL'); this.addStyle(60); } }
        continue;
      }
      n.img.setPosition(n.x, n.y).setRotation(n.x / 6);
    }
  },
  updateNetted(e, dt, now) {
    const b = e.body;
    e.netT -= dt; e.stunT = Math.max(e.stunT, 0.1);
    b.velocity.x *= Math.pow(0.01, dt); if (!b.allowGravity) b.velocity.y *= Math.pow(0.01, dt);
    if ((e.netTick -= dt) <= 0) { e.netTick = 0.25; this.damageEnemy(e, TUNE.NET.dps * 0.25, 0, 0, 'net'); if (Math.random() < 0.5) this.fxSparks(b.center.x, b.center.y, 2, 0, Math.PI * 2, [30, 90]); }
    if (e.netT <= 0 && FLIERS.has(e.kind)) { b.setAllowGravity(false); b.velocity.y = -60; }   // shakes the net off and lifts again
  },

  // ---------------------------------------------------------------- chain flail ----
  // Hold: a spiked ball whirls round you on its chain (30 px, winding up over 0.6 s), 14 a hit (0.3 s per target),
  // swatting enemy shots out of the air. Release: hurl it along your aim (420 px/s, 40, through two bodies and
  // crates), and the chain yanks it back.
  flailTrigger(trig, now, dt) {
    const F = this.flail, W = TUNE.FLAIL;
    if (trig && F.st === 'idle' && now >= this.nextFire) { F.st = 'spin'; F.w = W.w0; F.ang = this.aim + Math.PI; F.hits.clear(); }
    if (F.st === 'spin' && !trig) {                                       // let go: hurl it
      F.st = 'throw'; F.t = W.out; F.vx = Math.cos(this.aim) * W.throwSpeed; F.vy = Math.sin(this.aim) * W.throwSpeed; F.hits.clear(); F.pierce = 2;
      this.stats.shots++; Sfx.whoosh(); this.recoil = 6; this.addKick(Math.cos(this.aim) * 3, Math.sin(this.aim) * 3);
    }
  },
  updateFlail(dt, now) {
    const F = this.flail, W = TUNE.FLAIL, sx = this.shoulder.x, sy = this.shoulder.y;
    if (F.st === 'idle') return;
    if (this.state === 'dead') { F.st = 'idle'; return; }
    if (F.st === 'spin') {
      F.w = Math.min(W.w1, F.w + (W.w1 - W.w0) / W.spinUp * dt); F.ang += F.w * dt * this.facing;
      F.x = sx + Math.cos(F.ang) * W.r; F.y = sy + Math.sin(F.ang) * W.r;
      if ((F.whT = (F.whT || 0) - dt) <= 0) { F.whT = 0.45 - 0.25 * (F.w / W.w1); Sfx.whoosh(); }
      for (const list of [this.ebulletList, this.boltList]) for (const b of list) if (b.active && Math.hypot(b.x - F.x, b.y - F.y) < 8) { const x = b.x, y = b.y; b.disableBody(true, true); this.fxSparks(x, y, 5); Sfx.clang(0.5); this.addStyle(15); }
    } else if (F.st === 'throw') {
      F.t -= dt; const px = F.x, py = F.y; F.x += F.vx * dt; F.y += F.vy * dt;
      const tx = Math.floor(F.x / TS), ty = Math.floor(F.y / TS), c = this.tileAt(tx, ty);
      if (c === 'x' || c === 'g' || c === '=') { this.damageTile(tx, ty, 60); }
      if (this.sweep(px, py, F.x, F.y) || F.t <= 0 || F.pierce < 0) { F.st = 'return'; if (F.t > 0) { this.fxSparks(F.x, F.y, 6); Sfx.clang(0.7); this.shake(80, 0.004); } }
    } else {                                                             // reeled back in
      const dx = sx - F.x, dy = sy - F.y, d = Math.hypot(dx, dy);
      if (d < 12) { F.st = 'idle'; this.nextFire = now + W.cooldown; return; }
      const v = Math.min(d / dt, 620); F.x += dx / d * v * dt; F.y += dy / d * v * dt;
    }
    const spin = F.st === 'spin', dmg = spin ? W.hit * (0.5 + 0.5 * F.w / W.w1) : F.st === 'throw' ? W.throwDmg : W.hit * 0.6;
    for (const e of this.enemies.getChildren()) {
      if (!e.alive || e.under) continue;
      const b = e.body; if (F.x < b.left - 5 || F.x > b.right + 5 || F.y < b.top - 5 || F.y > b.bottom + 5) continue;
      if ((F.hits.get(e) || 0) > now) continue;
      F.hits.set(e, now + (spin ? 300 : 10000));
      const ux = spin ? -Math.sin(F.ang) * this.facing : Math.sign(F.vx || 1), uy = spin ? Math.cos(F.ang) * this.facing : 0;
      this.stats.hits++; if (e.def.mech) this.fxSparks(F.x, F.y, 6); else this.fxBlood(F.x, F.y, 8, Math.atan2(uy, ux), 1.2, [60, 220]);
      this.damageEnemy(e, dmg, ux, uy, 'kick'); Sfx.kickHit(); this.hitStop(spin ? 25 : 50);
      if (F.st === 'throw') F.pierce--;
    }
  },

  // ---------------------------------------------------------------- flare gun ----
  // A lobbed flare that sticks to whatever it hits and burns for 6 s: the body it's in burns (10 DPS), anything within
  // 22 px catches, tar and gas go up, and in a BLACKOUT it lights foes within 90 px through the dark.
  fireFlare(now, ox, oy, a, mx, my) {
    const W = TUNE.FLARE;
    this.stats.shots++;
    if (this.flares.length >= W.max) this.dropFlare(this.flares[0]);
    this.flares.push({ x: ox, y: oy, vx: Math.cos(a) * W.speed, vy: Math.sin(a) * W.speed - 40, t: W.burn, stuck: false, e: null, ox: 0, oy: 0, tick: 0,
      img: this.add.image(ox, oy, 'flare').setDepth(16.3), glow: this.add.image(ox, oy, 'glow').setBlendMode(ADD).setTint(0xff7a20).setScale(1.4).setAlpha(0.8).setDepth(16.4) });
    Sfx.flare(); this.recoil = 4; this.muzzle(mx, my, a, 0.9, 50); this.fxSmoke(mx, my, 3);
    this.shake(50, 0.002); this.addKick(-Math.cos(a) * 2, -Math.sin(a) * 2);
  },
  dropFlare(F) { const i = this.flares.indexOf(F); if (i >= 0) this.flares.splice(i, 1); F.img.destroy(); F.glow.destroy(); },
  updateFlares(dt, now) {
    const W = TUNE.FLARE, G = this.physics.world.gravity.y;
    for (const F of this.flares.slice()) {
      F.t -= dt;
      if (F.t <= 0) { this.dropFlare(F); continue; }
      if (!F.stuck) {
        const px = F.x, py = F.y; F.vy += G * 0.6 * dt; F.x += F.vx * dt; F.y += F.vy * dt;
        const hit = this.sweep(px, py, F.x, F.y), e = this.enemyAt(F.x, F.y, 2);
        if (e && !e.under) { F.stuck = true; F.e = e; F.ox = F.x - e.x; F.oy = F.y - e.y; this.ignite(e, 3); this.stats.hits++; Sfx.stick(); }
        else if (hit) { F.stuck = true; F.x = hit.x; F.y = hit.y; Sfx.stick(); }
      } else if (F.e) {
        if (!F.e.alive) { F.e = null; F.stuck = false; F.vx = 0; F.vy = 0; }
        else { F.x = F.e.x + F.ox; F.y = F.e.y + F.oy; F.e.burnT = Math.max(F.e.burnT, 0.6); }
      }
      if ((F.tick -= dt) <= 0) {
        F.tick = 0.5;
        for (const e of this.enemies.getChildren()) if (e.alive && !e.under && Math.hypot(e.body.center.x - F.x, e.body.center.y - F.y) < W.igniteR) this.ignite(e, 2);
        for (const T of this.tars.slice()) if (Math.abs(T.y - F.y) < 8 && Math.abs(T.x - F.x) < T.w / 2 + 4) this.igniteTar(T);
        for (const C of this.clouds.slice()) if (Math.hypot(C.x - F.x, C.y - F.y) < C.r) this.igniteCloud(C);
        for (const k of this.barrelList) if (k.active && Math.hypot(k.x - F.x, k.y - F.y) < W.igniteR) this.igniteBarrel(k);
      }
      if (this.darkA > 0.1) for (const e of this.enemies.getChildren()) if (e.alive && Math.hypot(e.body.center.x - F.x, e.body.center.y - F.y) < W.lightR) e.flareLit = now + 120;
      const fl = 0.8 + Math.random() * 0.3, k = Math.min(1, F.t / 1);
      F.img.setPosition(F.x, F.y); F.glow.setPosition(F.x, F.y).setScale((1.3 + (this.darkA > 0.1 ? 1.4 : 0)) * fl * k).setAlpha(0.75 * k);
      if (Math.random() < 0.7) this.fx.emit(F.x, F.y, { n: 1, angle: -Math.PI / 2, spread: 0.8, speed: [20, 70], life: [0.2, 0.5], size: [2, 1], cols: [0xffffff, 0xffe080, 0xff8a20, 0xc03010], add: true, g: -30 });
      if (Math.random() < 0.15) this.fxSmoke(F.x, F.y - 2, 1, 0.6);
    }
  },

  // ---------------------------------------------------------------- limpet launcher ----
  // Tap: a sticky bomb (up to 5 out, the 6th recycles the oldest). Hold 0.35 s: they all go off in a quick ripple
  // (radius 38, 55->15 each). Four or more at once: DEMOLITION.
  limpetTrigger(trig, now, dt) {
    const W = TUNE.LIMPET;
    if (trig && !this.limpetHeld) { this.limpetHeld = true; this.limpetHoldT = 0; this.limpetBlown = false; }
    if (this.limpetHeld && trig) {
      this.limpetHoldT += dt;
      if (!this.limpetBlown && this.limpetHoldT >= W.holdMs / 1000 && this.limpets.length) { this.limpetBlown = true; this.detonateLimpets(); }
      return;
    }
    if (this.limpetHeld && !trig) {
      this.limpetHeld = false;
      if (!this.limpetBlown && now >= this.nextFire) this.fireLimpet(now);
    }
  },
  fireLimpet(now) {
    const W = TUNE.LIMPET, a = this.aim, ca = Math.cos(a), sa = Math.sin(a), G = GUNS.limpet;
    const sx = this.shoulder.x, sy = this.shoulder.y, mx = sx + ca * G.muzzle, my = sy + sa * G.muzzle;
    const blocked = this.solidAt(mx, my) || !this.los(sx, sy, mx, my), ox = blocked ? sx : mx, oy = blocked ? sy : my;
    this.nextFire = now + W.cooldown * (this.perks.trigger ? 0.8 : 1); this.lastShotT = now; this.stats.shots++;
    if (this.limpets.length >= W.max) this.blowLimpet(this.limpets[0]);
    this.limpets.push({ x: ox, y: oy, vx: ca * W.speed, vy: sa * W.speed - 60, stuck: false, e: null, ox: 0, oy: 0, img: this.add.image(ox, oy, 'limpet').setDepth(8) });
    Sfx.limpet(); this.recoil = 3; this.addKick(-ca * 2, -sa * 2); this.spawnLight(mx, my, 'glow', 0xffd060, 0.5, 1, 0.6, 0.08);
  },
  detonateLimpets() {
    const L = this.limpets.slice(), n = L.length;
    L.forEach((q, i) => this.time.delayedCall(i * TUNE.LIMPET.gap * 1000, () => this.blowLimpet(q)));
    if (n >= 3) { BUS.emit('callout', n >= 4 ? 'DEMOLITION!' : 'CHAIN DETONATION'); this.addStyle(n * 20); }
    if (n >= 4) this.award('demo');
    Sfx.beep();
  },
  blowLimpet(q) {
    const i = this.limpets.indexOf(q); if (i < 0) return;
    this.limpets.splice(i, 1); q.img.destroy();
    this.explode(q.x, q.y, TUNE.LIMPET_BOOM);
  },
  updateLimpets(dt, now) {
    const G = this.physics.world.gravity.y;
    for (const q of this.limpets) {
      if (!q.stuck) {
        const px = q.x, py = q.y; q.vy += G * 0.8 * dt; q.x += q.vx * dt; q.y += q.vy * dt;
        const hit = this.sweep(px, py, q.x, q.y), e = this.enemyAt(q.x, q.y, 2);
        if (e && !e.under) { q.stuck = true; q.e = e; q.ox = q.x - e.x; q.oy = q.y - e.y; Sfx.stick(); }
        else if (hit) { q.stuck = true; q.x = hit.x; q.y = hit.y; Sfx.stick(); }
        if (q.y > LH) q.stuck = true;
      } else if (q.e) {
        if (!q.e.alive) { q.e = null; q.stuck = false; q.vx = 0; q.vy = 0; } else { q.x = q.e.x + q.ox; q.y = q.e.y + q.oy; }
      }
      q.img.setPosition(q.x, q.y);
    }
  },

  // ---------------------------------------------------------------- drill launcher ----
  // A drill bolt that chews straight through crates, girders and gratings (only grey metal stops it). It bores
  // into the first body it meets and grinds (40 DPS) for 1.2 s, then blows (radius 44, 70->20); in metal, 0.6 s.
  fireDrill(now, ox, oy, a, mx, my) {
    const W = TUNE.DRILL;
    this.stats.shots++;
    this.drills.push({ x: ox, y: oy, vx: Math.cos(a) * W.speed, vy: Math.sin(a) * W.speed, a, t: W.life, state: 'fly', timer: 0, tick: 0, e: null, ox: 0, oy: 0, spin: 0,
      img: this.add.image(ox, oy, 'drill0').setRotation(a).setDepth(8) });
    Sfx.drillFire(); this.recoil = 5; this.muzzle(mx, my, a, 1, 55); this.fxSmoke(mx, my, 4);
    this.shake(70, 0.003); this.addKick(-Math.cos(a) * 4, -Math.sin(a) * 4);
  },
  updateDrills(dt, now) {
    const W = TUNE.DRILL;
    for (let i = this.drills.length - 1; i >= 0; i--) {
      const d = this.drills[i]; d.spin += dt;
      d.img.setTexture(Math.floor(d.spin * 30) % 2 ? 'drill1' : 'drill0');
      if (d.state === 'fly') {
        d.t -= dt;
        const steps = 3;
        for (let s2 = 0; s2 < steps && d.state === 'fly'; s2++) {
          d.x += d.vx * dt / steps; d.y += d.vy * dt / steps;
          const tx = Math.floor(d.x / TS), ty = Math.floor(d.y / TS), c = this.tileAt(tx, ty);
          if (c === '#') { d.state = 'wall'; d.timer = W.wallT; Sfx.clang(0.7); this.fxSparks(d.x, d.y, 8, d.a + Math.PI, 1.2); }
          else if (c !== '.') { this.damageTile(tx, ty, 999); this.fxSparks(d.x, d.y, 4, d.a + Math.PI, 1.4); Sfx.drill(); }   // chews right through
          const e = this.enemyAt(d.x, d.y, 2);
          if (d.state === 'fly' && e && !e.under) { d.state = 'stuck'; d.e = e; d.ox = d.x - e.x; d.oy = d.y - e.y; d.timer = W.grindT; this.stats.hits++; Sfx.clang(0.5); }
        }
        if (d.state === 'fly' && Math.random() < 0.5) this.fx.emit(d.x - d.vx * 0.02, d.y - d.vy * 0.02, { n: 1, speed: [5, 20], life: [0.2, 0.4], size: [2, 3], cols: [0x8a8580, 0x5a5652], alpha: [0.4, 0], g: -20 });
        if (d.state === 'fly' && d.t <= 0) { this.drillBoom(d, i); continue; }
      } else if (d.state === 'stuck') {
        const e = d.e;
        if (!e.alive) { this.drillBoom(d, i); continue; }
        d.x = e.x + d.ox; d.y = e.y + d.oy; e.stunT = Math.max(e.stunT, 0.15);
        if ((d.tick -= dt) <= 0) {                                        // grinding: blood (or sparks) and a little shove
          d.tick = 0.1; this.damageEnemy(e, W.grind * 0.1, Math.cos(d.a), Math.sin(d.a), 'drill');
          if (e.def.mech) this.fxSparks(d.x, d.y, 3, d.a + Math.PI, 1.4); else this.fxBlood(d.x, d.y, 3, d.a + Math.PI, 1.2, [40, 160]);
          Sfx.drill();
        }
        if ((d.timer -= dt) <= 0 || !e.alive) { this.drillBoom(d, i); continue; }
      } else {
        if (Math.random() < 0.6) this.fxSparks(d.x, d.y, 1, d.a + Math.PI, 1.4, [40, 120]);
        if ((d.timer -= dt) <= 0) { this.drillBoom(d, i); continue; }
      }
      d.img.setPosition(d.x, d.y).setRotation(d.a);
    }
  },
  drillBoom(d, i) { this.drills.splice(i, 1); d.img.destroy(); this.explode(d.x, d.y, TUNE.DRILL.blast); },

  // ---------------------------------------------------------------- trick revolver ----
  // Six hitscan rounds (26). A shot that hits a wall ricochets once at the nearest foe within 220 px (x1.25, TRICK SHOT).
  // Hold the trigger to fan the hammer (120 ms, wider). Empty: a 1 s reload, chambers shown over your head.
  fireRevolver(now, ox, oy, a, mx, my) {
    const W = TUNE.REVOLVER, sx = this.shoulder.x, sy = this.shoulder.y;
    if (this.revAmmo <= 0) { this.nextFire = Math.max(this.nextFire, this.revReloadUntil); return; }
    const fanning = this.trigPrev && now - this.revLastT < W.cooldown + 90; this.revLastT = now;
    if (fanning) this.nextFire = now + W.fan * (this.perks.trigger ? 0.8 : 1);
    const ang = a + (fanning ? rand(-1, 1) * W.spread * DEG : 0);
    this.revAmmo--; this.stats.shots++;
    const r1 = this.revTrace(sx, sy, ang, W.range);
    this.beams.push({ x0: ox, y0: oy, x1: r1.x, y1: r1.y, t: 0, dur: 0.12, col: 'rev' });
    if (r1.e) this.revHit(r1.e, r1.x, r1.y, ang, W.dmg, false);
    else if (r1.wall) {
      const bx = r1.x - Math.cos(ang) * 2, by = r1.y - Math.sin(ang) * 2;
      this.fxSparks(bx, by, 5, ang + Math.PI, 1.2); this.paintHole(r1.x, r1.y);
      let tgt = null, bd = W.ricochet;
      for (const e of this.enemies.getChildren()) {
        if (!e.alive || e.under) continue;
        const d = Math.hypot(e.body.center.x - bx, e.body.center.y - by);
        if (d < bd && this.los(bx, by, e.body.center.x, e.body.center.y)) { bd = d; tgt = e; }
      }
      if (tgt) {
        const a2 = Math.atan2(tgt.body.center.y - by, tgt.body.center.x - bx), r2 = this.revTrace(bx, by, a2, bd + 20);
        this.beams.push({ x0: bx, y0: by, x1: r2.x, y1: r2.y, t: 0, dur: 0.16, col: 'rev' });
        Sfx.ricochet(0.7);
        if (r2.e) this.revHit(r2.e, r2.x, r2.y, a2, W.dmg * W.trickMul, true);
      }
    }
    Sfx.revolver(); this.recoil = 5; this.muzzle(mx, my, a, 1, 50); this.fxSmoke(mx, my, 2);
    this.shake(70, 0.004); this.addKick(-Math.cos(a) * 3, -Math.sin(a) * 3);
    if (this.revAmmo <= 0) {                                             // empty: spin the cylinder, shake out six brass
      this.revReloadUntil = now + W.reload * 1000; this.nextFire = Math.max(this.nextFire, this.revReloadUntil); Sfx.revReload();
      for (let k = 0; k < 6; k++) this.time.delayedCall(200 + k * 40, () => { if (this.state !== 'dead') this.spawnGib('g_casing', this.shoulder.x, this.shoulder.y - 2, rand(-60, 60), rand(-160, -90), 'shell'); });
    }
  },
  revTrace(x0, y0, a, range) {
    const ca = Math.cos(a), sa = Math.sin(a);
    for (let d = 4; d < range; d += 3) {
      const x = x0 + ca * d, y = y0 + sa * d;
      if (this.solidAt(x, y)) return { x, y, wall: true };
      const e = this.enemyAt(x, y, 1); if (e && !e.under) return { x, y, e };
    }
    return { x: x0 + ca * range, y: y0 + sa * range };
  },
  revHit(e, x, y, a, dmg, trick) {
    if (this.shieldBlocks(e, Math.cos(a), y)) { this.fxSparks(x, y, 5, a + Math.PI, 1.2); Sfx.clang(0.6); return; }
    const hs = (isHumanoid(e) || e.kind === 'jet') && y < e.body.top + 5;
    this.stats.hits++;
    if (e.def.mech) this.fxSparks(x, y, 5, a + Math.PI, 1.6); else { this.fxBlood(x, y, 5, a, 0.9, [60, 220]); if (hs) this.fxBlood(x, y, 5, -Math.PI / 2, 1, [40, 160]); }
    this.damageEnemy(e, dmg * (hs ? TUNE.HEADSHOT : 1), Math.cos(a), Math.sin(a), 'revolver', hs);
    if (trick) { BUS.emit('callout', hs ? 'TRICK HEADSHOT!' : 'TRICK SHOT!'); this.addStyle(hs ? 80 : 50); this.hitStop(50); if (++this.ms.trick >= 5) this.award('trick'); }
  },

  // ================================================================== shockworks round ====
  // ---------------------------------------------------------------- shock rifle ----
  // Tap: a slow plasma orb that pops on contact. Hold 0.22 s and release: a hitscan beam (34). Hit one of your own
  // orbs with the beam and it goes up as a SHOCK COMBO (radius 76, up to 130).
  shockTrigger(trig, now, dt) {
    const W = TUNE.SHOCK;
    if (trig && !this.shockHeld) { if (now < this.nextFire) return; this.shockHeld = true; this.shockHoldT = 0; this.shockReady = false; }
    if (this.shockHeld && trig) { this.shockHoldT += dt; if (this.shockHoldT >= W.holdMs / 1000 && !this.shockReady) { this.shockReady = true; Sfx.shockCharge(); } return; }
    if (this.shockHeld && !trig) { this.shockHeld = false; const beam = this.shockReady; this.shockReady = false; this.fireShock(now, beam); }
  },
  fireShock(now, beam) {
    const W = TUNE.SHOCK, a = this.aim, ca = Math.cos(a), sa = Math.sin(a), G = GUNS.shock;
    const sx = this.shoulder.x, sy = this.shoulder.y, mx = sx + ca * G.muzzle, my = sy + sa * G.muzzle;
    const blocked = this.solidAt(mx, my) || !this.los(sx, sy, mx, my), ox = blocked ? sx : mx, oy = blocked ? sy : my;
    this.nextFire = now + W.cooldown * (now < this.rampageUntil ? TUNE.RAMPAGE.fire : 1) * (this.perks.trigger ? 0.8 : 1); this.lastShotT = now; this.stats.shots++;
    if (now > this.noiseT) { this.noiseT = now + 250; this.makeNoise(sx, sy, 250, true); }
    if (!beam) {
      this.shockOrbs.push({ x: ox, y: oy, px: ox, py: oy, vx: ca * W.orbSpeed, vy: sa * W.orbSpeed, t: W.orbLife,
        img: this.add.image(ox, oy, 'orb').setTint(0x80f0ff).setDepth(8), glow: this.add.image(ox, oy, 'glow').setBlendMode(ADD).setTint(0x40c0ff).setScale(1.2).setAlpha(0.7).setDepth(18) });
      Sfx.shockOrb(); this.recoil = 3; this.addKick(-ca * 2, -sa * 2); this.shake(50, 0.002);
      this.spawnLight(mx, my, 'glow', 0x60d0ff, 0.8, 1.6, 0.8, 0.12);
      return;
    }
    let ex = ox, ey = oy, hitE = null, combo = null;
    for (let d = 0; d < W.range; d += 3) {                               // hitscan: stops at a wall, a body or one of your orbs
      const x = sx + ca * d, y = sy + sa * d;
      if (this.solidAt(x, y)) break;
      ex = x; ey = y;
      combo = this.shockOrbs.find(o => Math.hypot(o.x - x, o.y - y) < W.orbR + 4); if (combo) break;
      if (d > 8) { const h = this.enemyAt(x, y, 1); if (h && !h.under) { hitE = h; break; } }
    }
    this.shockBeams.push({ x0: ox, y0: oy, x1: ex, y1: ey, t: 0, dur: combo ? 0.3 : 0.18, combo: !!combo });
    Sfx.shockBeam(); this.recoil = 6; this.addKick(-ca * 4, -sa * 4); this.shake(80, 0.004); this.muzzle(mx, my, a, 1, 50);
    this.spawnLight(ex, ey, 'glow', 0x9ae8ff, 0.6, 1.4, 0.9, 0.12);
    this.electrifyLine(ox, oy, ex, ey, 24);
    if (combo) this.shockCombo(combo);
    else if (hitE) {
      const hs = isHumanoid(hitE) && ey < hitE.body.top + 5; this.stats.hits++;
      if (hitE.def.mech) this.fxSparks(ex, ey, 6, a + Math.PI, 1.2); else this.fxBlood(ex, ey, 6, a, 0.9, [60, 200]);
      this.damageEnemy(hitE, W.beamDmg * (hs ? TUNE.HEADSHOT : 1), ca, sa, 'shock', hs);
    } else this.fxSparks(ex, ey, 5, a + Math.PI, 1.2);
  },
  shockCombo(o) {
    const now = this.time.now, x = o.x, y = o.y;
    this.removeShockOrb(o);
    this.explode(x, y, TUNE.SHOCK_COMBO); this.electrifyWater(x, y, 40);
    this.spawnLight(x, y, 'ring', 0x80f0ff, 0.3, 3.4, 1, 0.35); this.spawnLight(x, y, 'glow', 0x60d0ff, 2, 5, 1, 0.3);
    for (let i = 0; i < 8; i++) { const th = i / 8 * Math.PI * 2; this.fx.emit(x, y, { n: 3, angle: th, spread: 0.2, speed: [160, 320], life: [0.2, 0.4], size: [2, 1], cols: [0xffffff, 0x9ae8ff, 0x4080ff], add: true, drag: 1 }); }
    BUS.emit('callout', 'SHOCK COMBO!'); BUS.emit('flash', 0.3); this.impactFrame(3); if (++this.ms.combos >= 3) this.award('jockey'); this.zoomPunch = Math.max(this.zoomPunch, 0.09);
    this.slowmoUntil = Math.max(this.slowmoUntil, now + 280); this.addStyle(120); Sfx.shockCombo();
  },
  updateShockOrbs(dt) {
    for (let i = this.shockOrbs.length - 1; i >= 0; i--) {
      const o = this.shockOrbs[i]; o.t -= dt; o.px = o.x; o.py = o.y; o.x += o.vx * dt; o.y += o.vy * dt;
      const hit = this.sweep(o.px, o.py, o.x, o.y), e = this.enemyAt(o.x, o.y, 2);
      if (hit || (e && !e.under) || o.t <= 0) { this.shockPop(o, hit ? hit.x : o.x, hit ? hit.y : o.y); continue; }
      o.img.setPosition(o.x, o.y).setRotation(o.t * 8); o.glow.setPosition(o.x, o.y).setScale(1.1 + Math.sin(o.t * 30) * 0.15);
      if (Math.random() < 0.5) this.fx.emit(o.x, o.y, { n: 1, speed: [0, 15], life: [0.15, 0.3], size: [2, 1], cols: [0xffffff, 0x9ae8ff, 0x40a0ff], add: true });
    }
  },
  shockPop(o, x, y) { this.removeShockOrb(o); this.explode(x, y, TUNE.SHOCK_ORB); this.electrifyWater(x, y, 32); Sfx.zap(); this.spawnLight(x, y, 'ring', 0x80f0ff, 0.2, 1.2, 0.9, 0.18); },
  removeShockOrb(o) { const i = this.shockOrbs.indexOf(o); if (i >= 0) this.shockOrbs.splice(i, 1); o.img.destroy(); o.glow.destroy(); },

  // ---------------------------------------------------------------- needler ----
  // 10 needles/s that curve onto the nearest foe in front. They stick (4 each); the 7th in one target sets off a
  // SUPERCOMBINE (radius 36, up to 75). Needles that sit 3 s without a new one fizzle out.
  fireNeedle(now, ox, oy, a, mx, my) {
    const W = TUNE.NEEDLE;
    this.stats.shots++;
    let tgt = null, bs = 1e9;
    for (const e of this.enemies.getChildren()) {
      if (!e.alive || e.under) continue;
      const dx = e.body.center.x - ox, dy = e.body.center.y - oy, d = Math.hypot(dx, dy); if (d > 280) continue;
      let da = Math.abs(Math.atan2(dy, dx) - a) % (Math.PI * 2); if (da > Math.PI) da = Math.PI * 2 - da;
      if (da > 0.5) continue;
      const sc = d * (1 + da * 2); if (sc < bs && this.los(ox, oy, e.body.center.x, e.body.center.y)) { bs = sc; tgt = e; }
    }
    const sp = a + rand(-1, 1) * 4 * DEG;
    this.needles.push({ x: ox, y: oy, px: ox, py: oy, vx: Math.cos(sp) * W.speed, vy: Math.sin(sp) * W.speed, t: W.life, tgt });
    Sfx.needle(); this.recoil = 1.5; this.shake(25, 0.0008);
    this.spawnLight(mx, my, 'glow', 0xff60d0, 0.4, 0.9, 0.7, 0.06);
  },
  updateNeedles(dt) {
    const W = TUNE.NEEDLE;
    for (let i = this.needles.length - 1; i >= 0; i--) {
      const n = this.needles[i]; n.t -= dt;
      if (n.tgt && n.tgt.alive && !n.tgt.under) {                         // home: turn toward the target at 6 rad/s
        const h = Math.atan2(n.vy, n.vx), want = Math.atan2(n.tgt.body.center.y - n.y, n.tgt.body.center.x - n.x);
        let d = want - h; d = Math.atan2(Math.sin(d), Math.cos(d));
        const nh = h + clamp(d, -W.turn * dt, W.turn * dt); n.vx = Math.cos(nh) * W.speed; n.vy = Math.sin(nh) * W.speed;
      }
      n.px = n.x; n.py = n.y; n.x += n.vx * dt; n.y += n.vy * dt;
      const hit = this.sweep(n.px, n.py, n.x, n.y);
      if (hit || n.t <= 0) { if (hit) this.fx.emit(hit.x, hit.y, { n: 3, speed: [20, 70], life: [0.1, 0.25], size: [2, 1], cols: [0xffd0f4, 0xff60d0], add: true }); this.needles.splice(i, 1); continue; }
      const e = this.enemyAt(n.x, n.y, 2);
      if (e && !e.under) { this.needles.splice(i, 1); this.stickNeedle(e, n); continue; }
    }
  },
  stickNeedle(e, n) {
    const W = TUNE.NEEDLE, sp = Math.hypot(n.vx, n.vy) || 1;
    e.needles = (e.needles || 0) + 1; e.needleT = W.fade; (e.needleAngs = e.needleAngs || []).push(Math.atan2(-n.vy, -n.vx) + rand(-0.5, 0.5));
    this.stats.hits++; Sfx.needleStick();
    this.fx.emit(n.x, n.y, { n: 2, speed: [20, 60], life: [0.1, 0.2], size: [2, 1], cols: [0xffe0f8, 0xff60d0], add: true });
    this.damageEnemy(e, W.dmg, n.vx / sp, n.vy / sp, 'needle');
    if (e.alive && e.needles >= W.stick) this.supercombine(e);
  },
  supercombine(e) {
    const cx = e.body.center.x, cy = e.body.center.y;
    e.needles = 0; e.needleAngs = [];
    this.explode(cx, cy, TUNE.NEEDLE_BOOM);
    this.fx.emit(cx, cy, { n: 26, speed: [80, 260], life: [0.3, 0.6], size: [2, 1], cols: [0xffffff, 0xffd0f4, 0xff60d0, 0xb030a0], add: true, g: 200, drag: 0.8 });
    this.spawnLight(cx, cy, 'ring', 0xff80e0, 0.3, 2.2, 1, 0.3); this.spawnLight(cx, cy, 'glow', 0xff60d0, 1.5, 3.5, 0.9, 0.25);
    BUS.emit('callout', 'SUPERCOMBINE!'); this.addStyle(80); this.impactFrame(2); Sfx.supercombine(); if (++this.ms.supers >= 3) this.award('pin');
  },
});
