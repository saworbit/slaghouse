// GameScene, continued: the campaign: squads, the route's stations, the lifts and the ride between acts (#166).
// Plain methods added to the class after it, so src/join.mjs stays a concatenation: game.js must come first.
Object.assign(GameScene.prototype, {
  xbRoute(x, y, tx, ty, s) {                                            // a line through the arc goes over the swing instead: up, across, then down
    const W = this.A.wrecker; if (!W) return [tx, ty];
    const inside = Math.hypot(x - W.px, y - W.py) < W.len;              // a target near the arc is pushed to the side the flier is on, so it can't flip
    if (this.xbBallGap(x, y, s) > 0) return this.xbClear(x, y, s, inside);   // in its reach: out the shortest way first
    [tx, ty] = this.xbClear(tx, ty, s, inside);
    const crosses = (x1, y1) => { for (let i = 1; i <= 12; i++) if (this.xbBallGap(x + (x1 - x) * i / 12, y + (y1 - y) * i / 12, s) > 0) return true; return false; };
    if (!crosses(tx, ty)) return [tx, ty];
    const top = W.py + Math.cos(W.amp) * W.len - TUNE.WRECK.r - s - 8;   // the lane over the ends of the swing
    if (top < 56) return [this.xbSafeX(tx, x), ty];                   // too big to pass over: stay on this side
    if (y > top + 4) return !crosses(x, top) ? [x, top] : [x < W.px ? W.px - W.len * Math.sin(W.amp) - TUNE.WRECK.r - s - 8 : W.px + W.len * Math.sin(W.amp) + TUNE.WRECK.r + s + 8, y];   // out from under the arc, then up
    return [tx, top];
  },
  xbLift(e, x, y, alt) { const fy = this.floorBelow(x, y - 8), [nx, ny] = this.xbClear(x, clamp(fy === null ? y : Math.min(y, fy - alt), 56, LH - 96), this.xbReach(e)); e.body.reset(nx, ny); },   // warped in on the floor, a flier rises to hover

  // ================================================================== furnace round ====
  // ------------------------------------------------------------------- the lift ----
  // Two lift doors are set in the back wall: the car you came down in, at the start, and the way on, at the far end
  // (the arena's liftX column, 95 unless it says otherwise; the campaign's last act, BOSS RUSH's last arena and the
  // Lab have no way on). Slots in the door panels show the car's light while it's at this floor or passing it. The
  // way on stays locked (red lamp) until the act's route gets there, or after the arena's last wave in OVERTIME, DAILY
  // and BOSS RUSH. Then the car comes down, chimes and opens, but never while a foe is left. Walk in and the doors
  // shut on you, the lamp shows a falling arrow and the car goes. The next arena opens on the car arriving at the start
  // and letting you out. From Meltdown on, Act 03's lift is heat-locked: it glows until both coolant valves are turned.
  setupLifts() {
    const fy = 25 * TS, mk = (x, open) => ({ x, y: fy, k: open ? 1 : 0, cy: open ? 0 : -40, st: open ? 'open' : 'shut', t: 0, cover: false, lamp: open ? 'go' : 'stop', heat: 0, hiss: 0,
      glow: this.add.image(x, fy - 18, 'glow').setBlendMode(ADD).setDepth(18).setAlpha(0), lampGlow: this.add.image(x, fy - 37, 'glow').setBlendMode(ADD).setScale(0.3).setDepth(18) });
    this.fixG = this.add.graphics().setDepth(1.4); this.liftG = this.add.graphics().setDepth(1.45); this.liftCoverG = this.add.graphics().setDepth(7.55);   // the doors cover you once you're in
    const L = this.liftIn = mk(this.player.x, true);
    if (this.carry?.lift) {                                              // you rode down: the car arrives with you in it
      Object.assign(L, { st: 'call', k: 0, cy: -40, cover: true, lamp: 'down' });
      this.ride = { lift: L, st: 'arrive', t: 0 }; this.facing = 1;
    } else L.t = 0.6;                                                    // a fresh start: you've just stepped out, and it shuts behind you
    const exit = this.campaign ? this.A.id < CAMPAIGN_ACTS.length : this.mode.id !== 'bossrush' || this.A.last < 99;
    this.liftOut = exit ? mk((this.A.liftX ?? 95) * TS + 8, false) : null;
    if (this.campaign) {                                                 // the act's route hardware stands there all act
      const act = CAMPAIGN_ACTS[this.A.id - 1];
      for (let i = act.first; i <= act.last; i++) for (const st of CAMPAIGN[i].route || []) {
        if (st.valve || st.breaker) this.fixtures.push({ kind: st.valve ? 'valve' : 'breaker', x: st.cell[0] * TS + TS / 2, y: (st.cell[1] + 1) * TS, k: 0, done: false });
      }
    }
  },
  callLift(L) { Object.assign(L, { st: 'call', cy: Math.min(L.cy, -40), lamp: 'come' }); Sfx.clunk(); },   // the car comes down from above
  boardLift(L) {
    this.campaignRoute.shift(); this.routeHold = 0;
    if (!L) { this.descend(); return; }
    this.ride = { lift: L, st: 'board', t: 0 }; this.hook = null; L.t = 0;
  },
  openLiftRoute() {                                                     // OVERTIME, DAILY and BOSS RUSH: the arena's done and the lift is on its way
    const L = this.liftOut;
    if (!L) { this.descend(); return; }
    this.campaignRoute = [{ x: L.x, y: L.y, label: 'TAKE THE LIFT' }]; this.routeHold = 0;
    BUS.emit('wavecard', 'LIFT OPEN', 'NEXT / ' + ARENAS[this.A.id % ARENAS.length].sub);
  },
  updateRide(dt, now) {                                                 // in a lift car: no control and no harm, and hidden once the doors shut
    const R = this.ride, L = R.lift, b = this.player.body;
    R.t += dt;
    this.pFrame = 'idle' + (Math.floor(now / 500) % 2); this.sqx = this.sqy = 1;
    if (R.st === 'board') {                                             // step into the car
      const dx = L.x - b.center.x;
      if (Math.abs(dx) > 1.5 && R.t < 0.5) { b.setVelocityX(clamp(dx * 12, -110, 110)); this.facing = dx > 0 ? 1 : -1; this.pFrame = 'run' + (Math.floor(now / 80) % 6); }
      else { b.setVelocityX(0); L.cover = true; L.st = 'closing'; Sfx.clank(); R.st = 'shut'; }
    } else {
      b.setVelocityX(0);
      if (R.st === 'shut' && L.st === 'shut') this.descend();
      else if (R.st === 'arrive' && L.st === 'open') {                   // out you go, patched up if the act started you higher
        L.cover = false; L.t = 1.4; this.ride = null;
        if (this.campaign && this.carry?.patched > 0 && !this.arrivedRetry) { const pb = this.player.body; this.spawnLight(pb.center.x, pb.center.y, 'ring', 0x7dff8a, 0.4, 2, 0.9, 0.5); BUS.emit('callout', 'SUIT PATCHED +' + this.carry.patched); }
      }
    }
    const hide = !!this.ride && L.cover;
    this.gun.setVisible(!hide); this.visor.setVisible(!hide);
  },
  stepLift(L, dt, up) {                                                 // up: the car you came in by goes back up once you're out
    switch (L.st) {
      case 'call': L.cy = Math.min(0, L.cy + dt * 46); if (L.cy >= 0) { L.st = 'opening'; L.lamp = 'go'; Sfx.ding(); Sfx.clank(); } break;
      case 'opening': L.k = Math.min(1, L.k + dt / 0.5); if (L.k >= 1) L.st = 'open'; break;
      case 'open': if (L.t > 0 && (L.t -= dt) <= 0) { L.st = 'closing'; Sfx.clank(); } break;
      case 'closing': L.k = Math.max(0, L.k - dt / 0.45); if (L.k <= 0) { L.st = L.cover ? 'shut' : 'gone'; if (!L.cover) L.lamp = up ? 'up' : 'down'; } break;
      case 'gone': L.cy = up ? L.cy - dt * 40 : L.cy + dt * 40; if (Math.abs(L.cy) >= 40) { L.st = 'shut'; L.lamp = 'stop'; } break;
      case 'leave': L.cy = Math.min(40, L.cy + dt * 30); break;                 // down the shaft with you in it
    }
  },
  updateLifts(dt, now) {
    if (this.liftIn) this.stepLift(this.liftIn, dt, true);
    const O = this.liftOut;
    if (O) {
      this.stepLift(O, dt, false);
      const hot = this.campaign && this.coolant < 2 && !!CAMPAIGN[this.wave]?.route?.some(st => st.valve);   // Meltdown cooks Act 03's shaft
      const was = O.heat; O.heat = approach(O.heat, hot ? 1 : 0, dt * (hot ? 0.08 : 0.4));
      if (O.heat > 0.3 && fxRandom() < dt * 6 * O.heat) this.fx.emit(O.x + crand(-15, 15), O.y - crand(4, 40), { n: 1, angle: -Math.PI / 2, spread: 0.5, speed: [10, 35], life: [0.4, 0.9], size: [1, 1], cols: [0xffe0a0, 0xff7a20], add: true, g: -30, cosmetic: true });
      if (O.heat < was && (O.hiss -= dt) <= 0) {                        // cooling: steam off the doors
        O.hiss = 0.06;
        this.fx.emit(O.x + crand(-12, 12), O.y - crand(4, 38), { n: 1, angle: -Math.PI / 2, spread: 0.7, speed: [20, 60], life: [0.7, 1.3], size: [2, 8], cols: [0xeef6f8, 0xb8ccd4], alpha: [0.55, 0], g: -40, cosmetic: true });
      }
    }
    this.liftG.clear(); this.liftCoverG.clear();
    for (const L of [this.liftIn, O]) if (L) this.drawLift(L, now);
    this.drawFixtures(now);
  },
  drawLift(L, now) {
    const g = this.liftG, d = L.cover ? this.liftCoverG : g, x = L.x, y = L.y, ox = x - 12, oy = y - 34, cy = Math.round(L.cy);
    g.fillStyle(0x15171b, 1).fillRect(x - 17, y - 41, 34, 41);                                         // the frame
    g.fillStyle(0x3a414a, 1).fillRect(x - 16, y - 40, 32, 40);
    g.fillStyle(0x5a6574, 1).fillRect(x - 16, y - 40, 32, 1).fillRect(x - 16, y - 40, 1, 40);
    g.fillStyle(0x22262c, 1).fillRect(x - 15, y - 39, 30, 4);                                          // the header: hazard ends, the lamp, an arrow
    for (const sx of [x - 15, x + 9]) for (let i = 0; i < 3; i++) g.fillStyle(i % 2 ? 0x15161a : 0xe8b422, 1).fillRect(sx + i * 2, y - 39, 2, 4);
    const hot = L.heat > 0.3 && L.lamp === 'stop', blink = Math.floor(now / 160) % 2;
    const lc = hot ? (Math.floor(now / 300) % 2 ? 0xff6a10 : 0x5a1a08) : { stop: 0xff3020, go: 0x5cff7a, down: 0xffb030, up: 0xffb030, come: blink ? 0xffb030 : 0x3a2a10 }[L.lamp];
    g.fillStyle(lc, 1).fillRect(x - 2, y - 38, 4, 2);
    if (L.lamp === 'down') g.fillStyle(0xffb030, 1).fillTriangle(x + 4, y - 38, x + 8, y - 38, x + 6, y - 36);
    else if (L.lamp === 'up') g.fillStyle(0xffb030, 1).fillTriangle(x + 4, y - 36, x + 8, y - 36, x + 6, y - 38);
    L.lampGlow.setTint(lc).setAlpha(lc === 0x3a2a10 || lc === 0x5a1a08 ? 0.1 : 0.45);
    g.fillStyle(0x07080a, 1).fillRect(ox, oy, 24, 34);                                                 // the shaft
    const c0 = Math.max(oy, oy + cy), c1 = Math.min(y, oy + cy + 34);                                   // the car, wherever it is in the shaft
    if (c1 > c0) {
      g.fillStyle(0x2a3c44, 1).fillRect(ox, c0, 24, c1 - c0);
      g.fillStyle(0x3c525c, 1).fillRect(ox + 2, c0, 1, c1 - c0).fillRect(ox + 21, c0, 1, c1 - c0);
      if (cy + 1 >= 0 && cy + 1 < 34) g.fillStyle(0xe8fbff, 1).fillRect(ox + 4, oy + cy + 1, 16, 2);  // its ceiling light
      if (cy + 32 >= 0 && cy + 32 < 34) g.fillStyle(0x15171b, 1).fillRect(ox, oy + cy + 32, 24, 2);    // its floor
    }
    const pw = Math.round(12 * (1 - L.k));                                                              // the doors part from the middle
    if (pw > 0) for (const px of [ox, ox + 24 - pw]) {
      d.fillStyle(0x4b535e, 1).fillRect(px, oy, pw, 34);
      d.fillStyle(0x6a7380, 1).fillRect(px, oy, pw, 1);
      d.fillStyle(0x2a2e35, 1).fillRect(px === ox ? px + pw - 1 : px, oy, 1, 34);
      if (pw < 5) continue;
      const sx = px + (pw >> 1) - 1, s0 = Math.max(oy + 6, oy + cy), s1 = Math.min(oy + 18, oy + cy + 32), ly = oy + cy + 1;   // a slot: the car's light shows if it's there
      d.fillStyle(0x0b0d10, 1).fillRect(sx, oy + 6, 2, 12);
      if (s1 > s0) d.fillStyle(0x7ac4dc, 1).fillRect(sx, s0, 2, s1 - s0);
      if (ly >= oy + 6 && ly < oy + 18) d.fillStyle(0xffffff, 1).fillRect(sx, ly, 2, 2);
    }
    if (L.heat > 0.01) {                                                                                // heat-locked: it glows
      const h = L.heat * (0.8 + 0.2 * Math.sin(now / 240));
      d.fillStyle(0xff4a10, 0.3 * h).fillRect(x - 17, y - 41, 34, 41);
      d.fillStyle(0xffa040, 0.55 * h).fillRect(ox, oy, 24, 1).fillRect(ox + 11, oy, 2, 34);
    }
    const lit = Math.max(0, 1 - Math.abs(cy) / 34) * L.k;
    L.glow.setTint(L.heat > 0.05 ? 0xff5a1a : 0xbfefff).setScale(L.heat > 0.05 ? 1.8 : 1.3).setAlpha(Math.max(lit * 0.3, L.heat * 0.5));
  },
  drawFixtures(now) {
    const g = this.fixG; g.clear();
    const valves = this.fixtures.filter(f => f.kind === 'valve');
    if (valves.length) {                                                // the coolant main: fed from the wall, valve to valve, into the lift's head
      const py = valves[0].y - 46, end = this.liftOut ? this.liftOut.x - 11 : valves[valves.length - 1].x, stops = [2 * TS, ...valves.map(v => v.x), end];
      for (let i = 0; i < stops.length - 1; i++) this.drawMain(g, stops[i], stops[i + 1], py, i === 0 ? 'fed' : valves[i - 1].done ? 'flow' : 'dry', now);
      if (this.liftOut) {
        const top = this.liftOut.y - 41, flow = valves[valves.length - 1].done;
        g.fillStyle(0x15171b, 1).fillRect(end - 3, py, 7, top - py); g.fillStyle(0x4b535e, 1).fillRect(end - 2, py, 5, top - py);
        if (flow) g.fillStyle(0x9ae8ff, 0.4).fillRect(end - 2, py, 5, top - py);
      }
    }
    for (const f of this.fixtures) if (f.kind === 'valve') this.drawValve(g, f); else this.drawBreaker(g, f, now);
    if (this.powerCut && this.A.id === 5) {                             // the generator winds down: its windings and core go dark, flickering as they go
      const k = clamp((now - this.powerCutAt) / 1400, 0, 1), a = 0.78 * (k < 1 && fxRandom() < 0.35 ? k * 0.3 : k);
      g.fillStyle(0x07090e, a).fillRect(45 * TS + 2, 18 * TS + 2, 10 * TS - 4, 6 * TS - 4);
    }
  },
  drawMain(g, x0, x1, y, st, now) {                                     // st: 'fed' (charged), 'flow' (coolant running) or 'dry'
    for (let x = Math.round(x0 / 2) * 2; x < x1; x += 2) {
      if (this.solidAt(x, y + 2)) continue;                             // it runs behind walls and crates
      g.fillStyle(0x15171b, 1).fillRect(x, y - 1, 2, 7);
      g.fillStyle(0x4b535e, 1).fillRect(x, y, 2, 5);
      g.fillStyle(0x6a7380, 1).fillRect(x, y, 2, 1);
      if (st === 'flow') {
        g.fillStyle(0x9ae8ff, 0.35).fillRect(x, y, 2, 5);
        if (((x - now * 0.06) % 14 + 14) % 14 < 4) g.fillStyle(0xe0fcff, 1).fillRect(x, y + 2, 2, 1);
      } else if (st === 'fed') g.fillStyle(0x2a7a90, 0.7).fillRect(x, y + 2, 2, 1);
      if (x % 48 === 0) g.fillStyle(0x5a6574, 1).fillRect(x, y - 2, 2, 9);   // flanges
    }
  },
  descend() {
    if (this.descending) return;
    this.descending = true; this.invulnUntil = this.time.now + 4500;
    const arena = this.A.id % ARENAS.length, nx = ARENAS[arena], L = this.liftOut;
    if (L) Object.assign(L, { st: 'leave', k: 0, lamp: 'down' });
    if (this.ride) this.ride.st = 'down';
    BUS.emit('wavecard', 'DESCENDING', 'NEXT / ' + nx.sub);
    Sfx.clunk(); Sfx.rumble(1); this.shake(2000, 0.004);
    this.time.delayedCall(1500, () => this.cameras.main.fadeOut(650, 0, 0, 0));
    this.time.delayedCall(2200, () => {
      if (this.state !== 'play') return;
      const carry = {
        hp: this.hp, weapon: this.weapon, stats: { ...this.stats, wk: { ...this.stats.wk } }, style: { ...this.style },
        headshots: this.headshots, bestCombo: this.bestCombo, totalEnemies: this.totalEnemies, wave: this.wave + 1,
        perks: { ...this.perks }, medals: [...this.medals], ms: { ...this.ms }, lastMod: this.lastMod, lift: true,   // lift: the next arena opens on the car arriving
      };
      if (this.campaign) {
        this.savePlayTime();
        carry.arena = arena;
        carry.revision = CAMPAIGN_REVISION;
        carry.legacyWeapon = this.legacyWeapon;
        carry.runId = this.campaignRunId;
        carry.elapsed = Math.max(0, this.runTime() * 1000);
        carry.diff = this.runDiff; carry.mut = this.runMut; carry.retried = this.campaignRetried;
        if (this.testRun) carry.test = true;
        if (this.mutator !== 'vamp') carry.hp = Math.max(carry.hp, CAMPAIGN_ACTS[arena].recovery);
        if (carry.hp > this.hp) carry.patched = Math.round(carry.hp - this.hp);   // the next act says so as you step out
        delete carry.stats.t0;
        const save = loadCampaign();
        if (ownsCampaign(save, this.campaignRunId)) writeCampaign({ ...save, checkpoint: carry, cleared: !!save?.cleared, owner: this.campaignRunId });   // a stale tab keeps playing but leaves a newer campaign's checkpoint alone
      } else carry.playSaved = this.playSaved;
      Sfx.stopLoops();
      this.scene.restart({ arena, carry });
    });
  },
  applyCarry(c) {
    this.lastMod = c.lastMod || null;
    Object.assign(this, {
      hp: c.hp, stats: { ...this.stats, ...c.stats, wk: { ...c.stats.wk } }, style: { ...c.style },
      headshots: c.headshots, bestCombo: c.bestCombo, totalEnemies: c.totalEnemies, wave: c.wave - 1, perks: { ...c.perks },
    });
    this.medals = new Set(c.medals || []); this.ms = { ...this.ms, ...c.ms }; this.waveTaken = this.stats.taken;
    this.weapon = c.weapon; this.applyGunTexture();
    if (!this.campaign) this.playSaved = c.playSaved || 0;              // OVERTIME keeps one clock across the lift; each campaign act starts its own
  },

  // ================================================================== powerhouse round ====
  // ---------------------------------------------------------------- live rails ----
  // ARENA 05: four floor rails in two banks. Every ~4-5.5 s one bank hums (1.2 s, flashing yellow), then goes live for
  // 2.2 s: 6 per 0.3 s to you if you're standing on it, 12 and a jolt to any foe on it; the banks take turns. Stay on
  // the walkways, the decks or the other bank.
  setCampaignMachinery(kind = null) {
    if (kind === this.campaignMachinery) return;
    this.campaignMachinery = kind;
    if (kind === 'rails') this.railCyc = { st: 'idle', t: 3.5, g: 0 };
    if (kind === 'vents' && this.jetCycle) {                             // back on from idle, so every burst follows a grate tell
      this.jetCycle = { st: 'idle', t: 6, f: 0 };
      for (const jet of this.jets) jet.lit = false;
    }
    if (kind === 'wreck' && this.wreck) {                                // release from the top of the swing, where its holdback cable kept it
      const W = this.wreck; W.t = W.period / 4; W.snapT = 0.5; Sfx.clank();
      const hx = W.px + Math.sin(W.amp) * W.len, hy = W.py + Math.cos(W.amp) * W.len;
      this.fx.emit(hx, hy - TUNE.WRECK.r, { n: 12, speed: [60, 180], life: [0.15, 0.35], size: [2, 1], cols: [0xffffff, 0xffe080, 0xff9a40], add: true, g: 300, cosmetic: true });
    }
  },
  openCampaignRoute(route) {
    // Restore the lights after the blackout and let the slag drain before reaching the valves.
    this.applyMod(null);
    this.campaignRoute = route.map(({ cell: [cx, cy], ...station }) =>
      ({ ...station, x: cx * TS + TS / 2, y: (cy + 1) * TS }));
    BUS.emit('wavecard', ...(route[0].card || ['LIFT OPEN', 'CHECKPOINT AT THE NEXT ACT']));
    Sfx.pickup();
    this.enterStation();
  },
  enterStation() {                                                      // the route moves on: a valve crew comes for you
    const st = this.campaignRoute[0]; this.routeHold = 0;
    if (!st?.guard) return;
    const spawns = st.guard.map(foe => ({ foe }));
    this.enemiesLeft += spawns.length; BUS.emit('enemies', this.activeHostiles());
    this.queueWaveSpawns(spawns, 420, 900);
    this.time.delayedCall(900, () => { if (this.state === 'play') BUS.emit('callout', st.crew || 'HOSTILES!'); });
  },
  routeGoal() { const st = this.campaignRoute[0]; return st && (st.hold || this.activeHostiles() <= 0) ? st : null; },   // where to go now: the lift waits for a clear area
  routeText(st) {                                                       // the HUD's line for the open station and a hint under it
    if (!st.hold && this.activeHostiles() > 0) return ['CLEAR THE AREA', 'THE LIFT COMES ONCE THE AREA IS CLEAR'];
    if (st.valve) return [st.label, this.activeHostiles() > 0 ? 'HOLD UNDER THE WHEEL / A KNOCK SETS IT BACK' : 'STAND UNDER THE WHEEL TO TURN IT'];
    if (st.breaker) return [st.label, 'STAND AT THE PANEL TO PULL IT'];
    return [st.label, null];
  },
  updateCampaignRoute(dt, now) {
    const g = this.routeG, station = this.campaignRoute[0];
    g.clear();
    if (!station || this.state !== 'play' || this.ride) return;
    const { x, y, hold = 0 } = station, b = this.player.body, L = this.liftOut;
    const fix = hold && this.fixtures.find(f => f.x === x && f.y === y);
    const inZone = Math.abs(b.center.x - x) <= (hold ? 19 : 17) && Math.abs(b.bottom - y) <= 6;
    if (hold) {                                                         // knocked off the wheel, it creeps back rather than starting over
      this.routeHold = inZone ? this.routeHold + dt : Math.max(0, this.routeHold - dt * 0.5);
      if (fix) { const k = clamp(this.routeHold / hold, 0, 1); if (inZone && Math.floor(k * 6) !== Math.floor(fix.k * 6)) Sfx.creak(); fix.k = k; }
    } else if (L && L.st === 'shut' && L.heat < 0.08 && this.activeHostiles() <= 0) this.callLift(L);
    const top = y - (hold ? 50 : 54);
    if (hold) {
      g.fillStyle(0x0b1015, 1).fillRect(x - 14, top - 7, 28, 3);
      g.fillStyle(0x76e8ff, 1).fillRect(x - 14, top - 7, 28 * clamp(this.routeHold / hold, 0, 1), 3);
    }
    if (hold || this.activeHostiles() <= 0) {                           // the marker: over the wheel, or over the lift once it can come
      const markerY = top - 12 + Math.round(Math.sin(now / 210) * 3);
      g.fillStyle(0x0b1015, 0.95).fillTriangle(x - 9, markerY - 3, x + 9, markerY - 3, x, markerY + 7);
      g.fillStyle(0x76e8ff, 1).fillTriangle(x - 6, markerY - 2, x + 6, markerY - 2, x, markerY + 4);
    }
    if (!inZone) return;
    if (!hold) { if (this.activeHostiles() <= 0 && (!L || L.st === 'open')) this.boardLift(L); return; }
    if (this.routeHold < hold) return;

    this.campaignRoute.shift();
    this.routeHold = 0;
    if (fix) fix.done = true;
    Sfx.pickup();
    this.spawnLight(x, y - 32, 'ring', 0x76e8ff, 0.4, 1.8, 1, 0.5);
    BUS.emit('callout', station.done);
    if (station.valve) { this.coolant++; Sfx.steam(); for (let i = 0; i < 10; i++) this.fx.emit(x + crand(-4, 4), y - 46, { n: 1, angle: -Math.PI / 2, spread: 1.4, speed: [30, 90], life: [0.6, 1.2], size: [2, 7], cols: [0xeef6f8, 0x9ae8ff], alpha: [0.6, 0], g: -30, cosmetic: true }); }
    if (station.breaker) this.cutPower();
    if (this.campaignRoute.length) this.enterStation();
    else this.time.delayedCall(1600, () => { if (this.state === 'play') this.startWave(this.wave + 1); });   // a route of held stations: the next operation, right here
  },
  cutPower() {                                                          // Act 05's breaker: the plant goes dark but for the emergency lamps
    this.powerCut = true; this.powerCutAt = this.time.now;
    Sfx.emp(); Sfx.rumble(0.5); BUS.emit('flash', 0.2);
    for (const L of this.lamps) L.cone.setTint(0xff4a30);
  },
  releaseCampaignSquad(opening = false) {
    const next = this.campaignSquads[0], act = CAMPAIGN_ACTS[this.A.id - 1], op = CAMPAIGN[this.wave];
    if (!next || this.campaignReinforceAt || (!opening && this.activeHostiles() > 0)) return;
    const breakMs = next.breakMs ?? op.breakMs ?? act.breakMs;
    if (next.machinery === null) this.setCampaignMachinery(null);
    if (next.mod === null && this.mod !== null) {
      const wasRaining = this.mod === 'slag';
      this.applyMod(null);
      if (wasRaining) BUS.emit('callout', 'RAIN CLEARED');
    }
    this.issueWeapons(next.unlock);
    const deploy = () => {
      this.campaignReinforceAt = 0;
      if (this.state !== 'play') return;
      this.campaignSquads.shift();
      this.campaignReserve -= next.spawns.length;
      if (next.name) BUS.emit('callout', next.name);
      if (next.mod && next.mod !== this.mod) this.applyMod(next.mod);
      if (next.machinery) this.setCampaignMachinery(next.machinery);
      this.queueWaveSpawns(next.spawns, op.spawnGap ?? act.spawnGap, opening ? op.leadMs : undefined);
      if (!opening) BUS.emit('enemies', this.activeHostiles());
    };
    if (opening) deploy();
    else {
      this.campaignReinforceAt = this.time.now + breakMs;
      this.time.delayedCall(breakMs, deploy);
    }
  },
});
