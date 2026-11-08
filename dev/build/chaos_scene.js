  // ------------------------------------------------------------ destructible terrain ----
  // 'x' crates fall when nothing is under them; 'g' girders and '=' gratings hang from their anchors
  // (original ends, or anything bolted to solid metal) and anything more than TUNE.TILE.span tiles out
  // sags off. Blasts, rails, bullets, saws, kicks, the rammer and the boss all chew through them.
  initTerrain() {
    this.tileHp = new Map(); this.breakZones = []; this.onewayDirty = false; this.navDirtyT = 0; this.stabQ = [];
    this.anchors = new Set();
    for (let ty = 0; ty < MAP_H; ty++) for (let tx = 0; tx < MAP_W; tx++) {
      const c = this.grid[ty][tx];
      if ((c === 'g' || c === '=') && (this.grid[ty][tx - 1] !== c || this.grid[ty][tx + 1] !== c)) this.anchors.add(ty * MAP_W + tx);
    }
    this.rebuildBreakZones();
  }
  tileAt(tx, ty) { return tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H ? '#' : this.grid[ty][tx]; }
  rebuildBreakZones() {
    for (const z of this.breakZones) z.destroy();
    this.breakZones = [];
    for (const [ch, rows] of [['x', false], ['g', true]]) for (const r of mergeRects(this.grid, ch, rows)) {
      const z = this.add.zone(r.x * TS + r.w * TS / 2, r.y * TS + r.h * TS / 2, r.w * TS, r.h * TS);
      this.solids.add(z); this.breakZones.push(z);
    }
    this.breakDirty = false;
  }
  rebuildOneways() {
    this.oneways.clear(true, true);
    for (const r of mergeRects(this.grid, '=', true)) {
      const z = this.add.zone(r.x * TS + r.w * TS / 2, r.y * TS + 3, r.w * TS, 6);
      this.oneways.add(z);
      const cc = z.body.checkCollision; cc.down = false; cc.left = false; cc.right = false;
    }
    this.onewayDirty = false;
  }
  rebuildNav() {
    NAV = buildNav(this.grid);
    for (const e of this.enemies.getChildren()) if (e.alive && 'path' in e) { e.path = null; e.pathI = 0; e.goalNode = -1; e.repathT = 0; e.repickT = 0; e.navAir = false; }
  }
  damageTile(tx, ty, dmg) {
    const c = this.tileAt(tx, ty), max = TILE_HP[c]; if (!max || !(dmg > 0)) return false;
    const key = ty * MAP_W + tx, hp0 = this.tileHp.has(key) ? this.tileHp.get(key) : max, hp = hp0 - dmg;
    if (hp <= 0) { this.destroyTile(tx, ty, true); return true; }
    this.tileHp.set(key, hp);
    if (Math.floor(hp / max * 3) < Math.floor(hp0 / max * 3)) this.crackTile(tx, ty, c);
    return false;
  }
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
    L.globalCompositeOperation = 'source-over'; this.lvlDirty = true;
    this.fxDust(x0 + 8, y0 + h / 2, 3);
    this.fx.emit(x0 + 8, y0 + h / 2, { n: 4, speed: [30, 100], life: [0.3, 0.6], size: [2, 1], cols: c === '=' ? [0x7a8695, 0x505a67] : [0x9a5e2e, 0x6e4222], g: 500, mode: 1 });
    Sfx.clunk(0.8);
  }
  destroyTile(tx, ty, fx) {
    const c = this.tileAt(tx, ty); if (!TILE_HP[c]) return;
    this.grid[ty][tx] = '.'; this.tileHp.delete(ty * MAP_W + tx);
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
    L.globalCompositeOperation = 'source-over'; this.lvlDirty = true;
    const cx = x + 8, cy = y + (c === '=' ? 3 : 8);
    if (fx) {
      const gibs = c === 'x' ? ['g_plank', 'g_plank2', 'g_plank', 'g_shard'] : c === 'g' ? ['g_beam', 'g_beam', 'g_shard', 'g_shard2'] : ['g_bar', 'g_bar', 'g_shard2'];
      for (let i = 0; i < 5; i++) this.spawnGib(pick(gibs), cx + rand(-5, 5), cy + rand(-4, 4), rand(-170, 170), rand(-280, -60), 'metal');
      this.fxDust(cx, cy, 8); this.fxSmoke(cx, cy, 3, 0.8); this.fxSparks(cx, cy, 6, -Math.PI / 2, Math.PI * 2, [60, 220]);
      Sfx.smash(c); this.shake(70, 0.003);
    }
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) this.stabQ.push(tx + dx, ty + dy);
    this.addStyle(4);
  }
  blastTiles(x, y, R, dmg) {
    const x0 = Math.floor((x - R) / TS), x1 = Math.floor((x + R) / TS), y0 = Math.floor((y - R) / TS), y1 = Math.floor((y + R) / TS);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const c = this.tileAt(tx, ty); if (!TILE_HP[c]) continue;
      const d = Math.max(0, Math.hypot(tx * TS + 8 - x, ty * TS + (c === '=' ? 3 : 8) - y) - 6);
      if (d < R) this.damageTile(tx, ty, dmg * (1.35 - d / R));
    }
  }
  processStability() {
    let guard = 0;
    while (this.stabQ.length && guard++ < 600) {
      const ty = this.stabQ.pop(), tx = this.stabQ.pop(), c = this.tileAt(tx, ty);
      if (c === 'x') { if (this.tileAt(tx, ty + 1) === '.') this.collapseTile(tx, ty); }   // crates need something under them
      else if (c === 'g' || c === '=') this.checkSpan(tx, ty, c);
    }
  }
  checkSpan(tx, ty, c) {
    const D4 = [[-1, 0], [1, 0], [0, -1], [0, 1]], comp = [], seen = new Set([ty * MAP_W + tx]), q = [[tx, ty]];
    while (q.length) {
      const [x, y] = q.pop(); comp.push([x, y]);
      for (const [dx, dy] of D4) { const k = (y + dy) * MAP_W + x + dx; if (!seen.has(k) && this.tileAt(x + dx, y + dy) === c) { seen.add(k); q.push([x + dx, y + dy]); } }
    }
    const dist = new Map(), bq = [];
    for (const [x, y] of comp) {
      const k = y * MAP_W + x;
      if (this.anchors.has(k) || D4.some(([dx, dy]) => this.tileAt(x + dx, y + dy) === '#')) { dist.set(k, 0); bq.push([x, y]); }
    }
    for (let i = 0; i < bq.length; i++) {
      const [x, y] = bq[i], d = dist.get(y * MAP_W + x);
      for (const [dx, dy] of D4) { const k = (y + dy) * MAP_W + x + dx; if (seen.has(k) && !dist.has(k)) { dist.set(k, d + 1); bq.push([x + dx, y + dy]); } }
    }
    let n = 0;
    for (const [x, y] of comp) { const d = dist.get(y * MAP_W + x); if (d === undefined || d > TUNE.TILE.span) { this.collapseTile(x, y); n++; } }
    if (n) { Sfx.creak(); this.shake(220, 0.005); if (n >= 3) BUS.emit('callout', 'COLLAPSE!'); }
  }
  collapseTile(tx, ty) {                                               // tears loose and drops as a solid block
    const c = this.tileAt(tx, ty); if (!TILE_HP[c]) return;
    this.destroyTile(tx, ty, false);
    const cx = tx * TS + 8, cy = ty * TS + (c === '=' ? 3 : 8);
    this.fxDust(cx, cy, 3);
    const fb = this.fblocks.getFirstDead(false); if (!fb) return;
    fb.setTexture('fb_' + c).enableBody(true, cx, cy, true, true);
    fb.body.setSize(14, c === '=' ? 5 : 14, true); fb.body.setAllowGravity(true);
    fb.setVelocity(rand(-25, 25), rand(-40, 0)); fb.setRotation(0); fb.body.setAngularVelocity(rand(-140, 140));
    Object.assign(fb, { kind: c, t: 0, hits: new Set(), hitP: false });
  }
  updateFallingBlocks(dt) {
    for (const fb of this.fblockList) {
      if (!fb.active) continue;
      fb.t += dt;
      const vy = fb.body.velocity.y, hh = fb.kind === '=' ? 3 : 7;
      if (vy > 140) {                                                   // anything under it gets flattened
        for (const e of this.enemies.getChildren()) {
          if (!e.alive || fb.hits.has(e) || e.kind === 'boss') continue;
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
  }
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
  }

  // ------------------------------------------------------------ enemy rockets & bombs ----
  // Slow enough to read: shoot them down, kick them back, or just get out of the splash.
  spawnEProj(kind, x, y, vx, vy) {
    const p = this.eprojs.getFirstDead(false); if (!p) return null;
    p.setTexture(kind === 'bomb' ? 'ebomb' : 'erocket').enableBody(true, x, y, true, true);
    p.body.setSize(5, 5, true); p.body.setAllowGravity(kind === 'bomb');
    p.setVelocity(vx, vy); p.setRotation(Math.atan2(vy, vx));
    Object.assign(p, { pk: kind, life: kind === 'bomb' ? 4 : 3.5, px: x, py: y });
    p.glow.setVisible(true).setPosition(x, y).setTint(kind === 'bomb' ? 0xff3020 : 0xffa040);
    return p;
  }
  popEProj(p, x = p.x, y = p.y) {
    p.disableBody(true, true); p.glow.setVisible(false);
    this.explode(x, y, p.pk === 'bomb' ? TUNE.WASP.bomb : TUNE.ROCKETEER.blast);
  }
  updateEProjs(dt) {
    const pb = this.player.body;
    for (const p of this.eprojList) {
      if (!p.active) continue;
      p.life -= dt;
      const hit = this.sweep(p.px, p.py, p.x, p.y);
      const onP = this.state !== 'dead' && p.x > pb.left - 3 && p.x < pb.right + 3 && p.y > pb.top - 3 && p.y < pb.bottom + 3;
      const landed = p.pk === 'bomb' && p.body.velocity.y > 0 && this.standAt(p.x, p.y + 3);   // gratings catch bombs too
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
      } else if (Math.random() < 0.5) this.fx.emit(p.x, p.y - 3, { n: 1, speed: [0, 8], life: [0.1, 0.2], size: [2, 1], cols: [0xffe46a, 0xff5a1a], add: true });
      p.px = p.x; p.py = p.y;
    }
  }

  // ------------------------------------------------------------------ rocketeer ----
  // Humanoid with a launcher: keeps its distance, 0.75 s orange laser tell, slow rocket aimed at your feet.
  thinkRocketeer(e, dt, now, c) {
    const T = TUNE.ROCKETEER;
    e.fireCd -= dt; e.repickT -= dt;
    switch (e.ai) {
      case 'idle': this.lookAround(e, dt); return 'hold';
      case 'dodge': if (c.onGround && now > e.aiUntil + 120) { e.ai = 'engage'; e.repickT = 0; } return 'free';
      case 'aim': {
        const k = (now - e.aimStart) / T.aimMs;
        if (k < T.lockAt) e.aimA = this.rocketAim(e);
        if (!c.canSee && k < 0.4) { e.ai = 'engage'; e.fireCd = 0.6; return 'hold'; }
        if (now >= e.aiUntil) { this.rocketeerShoot(e); e.fireCd = T.fireCd * rand(0.85, 1.15); e.ai = 'engage'; e.repickT = Math.random() < 0.5 ? 0 : 1.2; }
        return 'hold';
      }
      case 'retreat': if (now > e.aiUntil) { e.ai = 'engage'; e.repickT = 0; } return 'path';
      case 'search':
        if (c.canSee || now - e.lkT < 300) { e.ai = 'engage'; e.repickT = 0; return 'path'; }
        if (now > e.searchUntil || !c.alive) { e.ai = 'idle'; e.aggro = false; return 'hold'; }
        if (!e.path || e.pathI >= e.path.length) { this.lookAround(e, dt, 2.5); return 'hold'; }
        return 'path';
      default: {
        if (!c.alive) { e.ai = 'idle'; e.aggro = false; return 'hold'; }
        if (now - e.lkT > 1800) { e.ai = 'search'; e.searchUntil = now + 6000; this.pathTo(e, navBelow(e.lkx, e.lky - 4), 160); return 'path'; }
        if (c.dist < 80 && c.onGround && !e.navAir && e.repickT < 1.5) { e.repickT = 2; e.ai = 'retreat'; e.aiUntil = now + 1400; this.pickPosition(e, 'retreat'); return 'path'; }
        if (c.onGround && !e.navAir && e.repickT <= 0) { e.repickT = rand(3, 4.5); if (!this.pickPosition(e, 'attack')) this.pathTo(e, navBelow(e.lkx, e.lky - 4), 160); }
        if (c.canSee && c.onGround && !e.navAir && e.fireCd <= 0 && c.dist < 340 && c.dist > 60) {
          e.ai = 'aim'; e.aimStart = now; e.aiUntil = now + T.aimMs; e.aimA = this.rocketAim(e); Sfx.charge(0.6); return 'hold';
        }
        return 'path';
      }
    }
  }
  rocketAim(e) {                                                       // aims at your feet so near misses still splash
    const pb = this.player.body, sx = e.x, sy = e.y - 2, tof = Math.hypot(pb.center.x - sx, pb.bottom - sy) / TUNE.ROCKETEER.rocketSpeed;
    return Math.atan2(pb.bottom - 3 - sy + (pb.blocked.down ? 0 : pb.velocity.y * tof * 0.2), pb.center.x + pb.velocity.x * tof * 0.5 - sx);
  }
  rocketeerShoot(e) {
    const T = TUNE.ROCKETEER, sx = e.x + (e.dir > 0 ? 0 : -1), sy = e.y - 2, a = e.aimA + rand(-2, 2) * DEG;
    const mx = sx + Math.cos(a) * 22, my = sy + Math.sin(a) * 22;
    e.recoil = 5; e.body.velocity.x -= Math.cos(a) * 60;
    Sfx.rocket(); this.spawnLight(mx, my, 'glow', 0xffa040, 1, 1.8, 0.9, 0.12);
    this.fxSmoke(sx - Math.cos(a) * 8, sy - Math.sin(a) * 8, 6); this.fxFire(mx, my, 4);
    if (this.solidAt(mx, my) || !this.los(sx, sy, mx, my)) return;
    this.spawnEProj('rocket', mx, my, Math.cos(a) * T.rocketSpeed, Math.sin(a) * T.rocketSpeed);
  }

  // ---------------------------------------------------------------------- wasp ----
  // Bomber drone: climbs to a perch well above your head, then makes straight bomb runs over you
  // (blinking bomb sight, 3 bombs) and peels away to line up the next one.
  updateWasp(e, dt, now, dx, dy, dist, alive) {
    const b = e.body, T = TUNE.WASP, pb = this.player.body;
    if (alive && !e.aggro && (e.sees || dist < 140) && dist < e.def.sight) { this.alertEnemy(e, now); Sfx.chirp(); }
    if (e.aggro && e.sees) e.aggroT = Math.max(e.aggroT, 4);
    if (e.aggro && (e.aggroT <= 0 || !alive)) { e.aggro = false; e.ai = 'patrol'; }
    let tx, ty, spd = T.speed;
    if (e.ai === 'run' && alive) {
      tx = e.x + e.runDir * 200; ty = e.runY; spd = T.speed * 1.5;
      e.bombT -= dt;
      if (e.bombT <= 0 && e.bombs > 0 && Math.abs(e.x - pb.center.x) < 64) { e.bombT = T.bombGap; e.bombs--; this.waspDrop(e); }
      const passed = e.runDir > 0 ? e.x > pb.center.x + 110 : e.x < pb.center.x - 110, walled = e.runDir > 0 ? b.blocked.right : b.blocked.left;
      if (now > e.aiUntil || walled || (passed && e.bombs < T.runBombs)) { e.ai = 'rest'; e.aiUntil = now + T.rest * 1000; }
    } else if (e.aggro && alive) {
      const side = e.x < pb.center.x ? -1 : 1, rest = e.ai === 'rest' && now < e.aiUntil;
      tx = pb.center.x + side * (rest ? 140 : 95);
      ty = pb.top - T.height; for (let i = 0; i < 6 && this.solidAt(tx, ty); i++) ty += 12;   // stay under the ceiling
      ty += Math.sin(e.t * 2) * 6;
      if (!rest) {
        e.ai = 'stalk';
        if (Math.abs(e.y - ty) < 20 && Math.abs(e.x - tx) < 40 && e.sees) { e.ai = 'run'; e.runDir = -side; e.runY = e.y; e.bombs = T.runBombs; e.bombT = 0.1; e.aiUntil = now + 3200; Sfx.chirp(); }
      }
    } else { tx = e.homeX + Math.sin(e.t * 0.5) * 60; ty = e.homeY + Math.sin(e.t * 1.3) * 10; }
    if (e.stunT <= 0) {
      const k = Math.min(1, dt * 3);
      b.velocity.x += (clamp((tx - b.center.x) * 2.2, -spd, spd) - b.velocity.x) * k;
      b.velocity.y += (clamp((ty - b.center.y) * 2.2, -spd * 0.8, spd * 0.8) - b.velocity.y) * k;
    } else { const f = Math.pow(0.05, dt); b.velocity.x *= f; b.velocity.y *= f; }
    if (Math.abs(b.velocity.x) > 8) e.dir = b.velocity.x > 0 ? 1 : -1;
    e.fr = e.ai === 'run' && e.bombs > 0 ? 'pb' : Math.floor(e.t * 18) % 2 ? 'p1' : 'p0';
  }
  waspDrop(e) {
    const b = e.body;
    this.spawnEProj('bomb', e.x, b.bottom + 3, b.velocity.x * 0.6, 30);
    Sfx.whistle(); Sfx.clunk(0.6);
  }

  // -------------------------------------------------------------------- rammer ----
  // Armoured charger: snorts and scrapes (0.65 s), then bulldozes in a straight line, smashing crates and
  // girders and trampling its own side. Its ram plate shrugs off frontal fire; slam it into solid metal
  // and it's dizzy - and takes double damage - for a moment.
  updateRammer(e, dt, now, dx, dy, dist, alive) {
    const b = e.body, D = e.def, T = TUNE.RAMMER, onGround = b.blocked.down || b.touching.down, adx = Math.abs(dx);
    if (alive && !e.aggro && e.sees && adx < D.sight && Math.abs(dy) < 80) this.alertEnemy(e, now);
    if (e.aggro && e.sees) e.aggroT = Math.max(e.aggroT, 4);
    if (e.aggro && (e.aggroT <= 0 || !alive) && e.ai !== 'charge') { e.aggro = false; e.ai = 'patrol'; }
    e.atkCd -= dt;
    let fr = null;
    if (e.ai === 'wind') {
      b.velocity.x = 0; fr = 'wind';
      if (Math.random() < 0.4) this.fxDust(b.center.x - e.dir * 8, b.bottom, 1);
      if (now >= e.aiUntil) { e.ai = 'charge'; e.aiUntil = now + T.chargeT * 1000; e.hitSet = new Set(); Sfx.growl(true); this.shake(120, 0.004); }
    } else if (e.ai === 'charge') {
      b.velocity.x = e.dir * T.speed; fr = Math.floor(now / 70) % 2 ? 'c0' : 'c1';
      if (Math.random() < 0.6) this.fxDust(b.center.x - e.dir * 10, b.bottom, 1);
      if (Math.floor(now / 140) !== e.stepK) { e.stepK = Math.floor(now / 140); Sfx.land(0.5); this.shake(50, 0.002); }
      const fx = e.dir > 0 ? b.right + 2 : b.left - 2;
      for (let yy = b.top + 2; yy < b.bottom - 1; yy += 6) {                // bulldozes breakables
        const tx = Math.floor(fx / TS), ty = Math.floor(yy / TS), ch = this.tileAt(tx, ty);
        if (ch === 'x' || ch === 'g') { this.destroyTile(tx, ty, true); this.addKick(e.dir * 2, 0); }
      }
      for (const o of this.enemies.getChildren()) {                       // ...and its own side
        if (o === e || !o.alive || e.hitSet.has(o) || o.kind === 'boss') continue;
        const ob = o.body; if (ob.right < b.left - 2 || ob.left > b.right + 2 || ob.bottom < b.top || ob.top > b.bottom) continue;
        e.hitSet.add(o); const k = Math.max(0.3, o.def.kb);
        o.body.velocity.x = e.dir * 380 * k; o.body.velocity.y = -260 * k; o.kickedT = 0.6;
        this.damageEnemy(o, 40, e.dir, -0.5, 'kick'); Sfx.kickHit();
      }
      const pb = this.player.body;
      if (alive && !e.hitP && pb.right > b.left - 2 && pb.left < b.right + 2 && pb.bottom > b.top && pb.top < b.bottom) {
        e.hitP = true;
        if (this.hurtPlayer(T.dmg, b.center.x)) { pb.velocity.x = e.dir * 420; pb.velocity.y = -260; this.shake(200, 0.012); this.addKick(e.dir * 8, -3); Sfx.kickHit(); }
      }
      if (e.dir > 0 ? b.blocked.right : b.blocked.left) {                 // hit solid metal: seeing stars
        e.ai = 'dizzy'; e.aiUntil = now + T.stun * 1000; b.velocity.x = -e.dir * 120; b.velocity.y = -150;
        this.shake(300, 0.012); Sfx.stomp(); Sfx.clang(); this.fxSparks(fx, b.center.y, 14, e.dir > 0 ? Math.PI : 0, 1.4, [80, 260]);
        this.blastTiles(fx + e.dir * 6, b.center.y, 20, 60);
        if (Math.hypot(this.player.x - e.x, this.player.y - e.y) < 320) BUS.emit('callout', 'BONK!');
      } else if (now >= e.aiUntil) { e.ai = 'skid'; e.aiUntil = now + 450; }
    } else if (e.ai === 'skid') {
      b.velocity.x = approach(b.velocity.x, 0, 900 * dt); fr = 'w0';
      if (Math.random() < 0.8) this.fxDust(b.center.x + e.dir * 8, b.bottom, 1);
      if (now >= e.aiUntil) { e.ai = 'chase'; e.atkCd = T.cd; }
    } else if (e.ai === 'dizzy') {
      if (onGround) b.velocity.x = approach(b.velocity.x, 0, 600 * dt); fr = 'dz';
      if (Math.random() < 0.6) this.fx.emit(b.center.x + Math.cos(now / 110) * 9, b.top - 3 + Math.sin(now / 110) * 2, { n: 1, speed: [0, 5], life: [0.2, 0.3], size: [2, 1], cols: [0xffe14a, 0xffffff], add: true });
      if (now >= e.aiUntil) { e.ai = 'chase'; e.atkCd = T.cd * 0.6; }
    } else if (e.aggro && alive) {
      e.ai = 'chase'; e.dir = dx > 0 ? 1 : -1;
      const ground = this.standAt(b.center.x + e.dir * (b.halfWidth + 4), b.bottom + 4);
      b.velocity.x = approach(b.velocity.x, (ground || dy > 20) && adx > 10 ? e.dir * D.chase : 0, 500 * dt);
      if (onGround && e.atkCd <= 0 && e.sees && adx < 300 && adx > 40 && Math.abs(dy) < 30) { e.ai = 'wind'; e.aiUntil = now + T.windMs; e.hitP = false; Sfx.snort(); this.popAlert(e); }
    } else {
      if (onGround) { const ground = this.standAt(b.center.x + e.dir * (b.halfWidth + 4), b.bottom + 4), wall = e.dir > 0 ? b.blocked.right : b.blocked.left; if (!ground || wall) e.dir *= -1; }
      b.velocity.x = approach(b.velocity.x, e.dir * D.patrol, 400 * dt);
    }
    if (!fr) { const moving = Math.abs(b.velocity.x) > 6 && onGround; if (moving) e.animT += dt * Math.abs(b.velocity.x) / 16; fr = 'w' + (moving ? Math.floor(e.animT) % 4 : 0); }
    e.fr = fr;
  }

  // ------------------------------------------------------------- cluster mortar ----
  clusterBurst(x, y, vx, vy) {                                          // airburst: scatters bomblets over everything below
    const C = TUNE.CLUSTER;
    this.explode(x, y, C.shell); Sfx.clusterPop();
    for (let i = 0; i < C.bomblets; i++) {
      const b = this.spawnGrenade(x, y, 0, 'bomb'); if (!b) break;
      b.setVelocity(vx * 0.45 + rand(-170, 170), Math.min(vy * 0.3, 60) + rand(-200, -40));
    }
  }
