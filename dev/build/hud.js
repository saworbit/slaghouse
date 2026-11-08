class HudScene extends Phaser.Scene {
  constructor() { super('Hud'); }
  create() {
    this.hp = TUNE.PLAYER_HP; this.dispHp = this.hp; this.weapon = 0; this.count = WAVES[0].length;
    this.hurtA = 0; this.healA = 0; this.aimMode = 'keys'; this.overOn = false; this.t0 = this.time.now; this.countPulse = 0;
    this.flashA = 0; this.hmT = 0; this.hmKill = false; this.hmHead = false; this.panelShake = 0;
    this.splats = []; this.rankPop = 0; this.styleA = 0; this.shownRank = -1;
    const shadow = '#000000', SW = 68;                                 // SW = weapon slot pitch
    this.add.image(VIEW_W / 2, VIEW_H / 2, 'vignette').setDepth(0);
    this.splatG = this.add.graphics().setDepth(0.5);                   // blood on the lens
    this.flashG = this.add.graphics().setDepth(1);
    this.g = this.add.graphics().setDepth(2);
    new PixelLabel(this, 26, 20, 'hud_hplbl', { text: 'HEALTH', align: 'left', scale: 2, color: '#8f9bab', shadow }).setDepth(3);
    this.lblHp = new PixelLabel(this, 304, 16, 'hud_hp', { maxChars: 3, text: '100', align: 'right', scale: 3, color: '#ffffff', shadow }).setDepth(3);
    this.slotIcons = WEAPONS.map((w, i) => this.add.image(14 + i * SW + 32, 82 + 31, 'icon_' + w.gun).setScale(2).setDepth(3));
    WEAPONS.forEach((w, i) => new PixelLabel(this, 14 + i * SW + 4, 86, 'hud_slot' + i, { text: String(i + 1), align: 'left', scale: 2, color: '#ffffff', shadow }).setDepth(3));
    this.lblWeapon = new PixelLabel(this, 26, 142, 'hud_wname', { maxChars: 12, align: 'left', scale: 2, color: '#ffb347', shadow }).setDepth(3);
    this.add.image(784, 40, 'skull').setScale(3).setDepth(3);
    new PixelLabel(this, 932, 20, 'hud_hostlbl', { text: 'HOSTILES', align: 'right', scale: 2, color: '#8f9bab', shadow }).setDepth(3);
    this.lblCount = new PixelLabel(this, 932, 52, 'hud_count', { maxChars: 2, align: 'right', scale: 4, color: '#ff5a3a', shadow, originY: 0.5 }).setDepth(3);
    this.lblWave = new PixelLabel(this, 768, 64, 'hud_wave', { maxChars: 8, text: 'WAVE 1/' + WAVES.length, align: 'left', scale: 2, color: '#d090ff', shadow }).setDepth(3);
    this.lblCombo = new PixelLabel(this, 940, 104, 'hud_combo', { maxChars: 10, align: 'right', scale: 3, rows: CALL_ROWS, shadow, originY: 0.5 }).setDepth(3).setAlpha(0);
    this.lblStyleT = new PixelLabel(this, 944, 128, 'hud_stylet', { text: 'STYLE', align: 'right', scale: 2, color: '#8f9bab', shadow }).setDepth(3);
    this.lblRank = new PixelLabel(this, 944, 166, 'hud_rank', { maxChars: 3, text: 'D', align: 'right', scale: 6, color: STYLE_RANKS[0].c, shadow, originY: 0.5 }).setDepth(3);
    this.hmG = this.add.graphics().setDepth(21);
    this.hint1 = new PixelLabel(this, 480, 500, 'hud_hint1', { text: HINT1, scale: 2, color: '#9aa6b4', shadow }).setDepth(3);
    this.hint2 = new PixelLabel(this, 480, 518, 'hud_hint2', { text: HINT2, scale: 2, color: '#9aa6b4', shadow }).setDepth(3);
    this.call = new PixelLabel(this, 480, 176, 'hud_call', { maxChars: 16, scale: 5, rows: CALL_ROWS, shadow, originY: 0.5 }).setDepth(5).setAlpha(0);
    this.ovG = this.add.graphics().setDepth(8);
    this.ovTitle = new PixelLabel(this, 480, 212, 'hud_ovt', { maxChars: 16, scale: 7, rows: WIN_ROWS, shadow, originY: 0.5 }).setDepth(9);
    this.ovStat1 = new PixelLabel(this, 480, 264, 'hud_ovs1', { maxChars: 48, scale: 2, color: '#d8dee6', shadow }).setDepth(9);
    this.ovStat2 = new PixelLabel(this, 480, 286, 'hud_ovs2', { maxChars: 48, scale: 2, color: '#d8dee6', shadow }).setDepth(9);
    this.ovStat3 = new PixelLabel(this, 480, 308, 'hud_ovs3', { maxChars: 48, scale: 2, color: '#ffe14a', shadow }).setDepth(9);
    this.ovPrompt = new PixelLabel(this, 480, 340, 'hud_ovp', { text: 'PRESS R OR ENTER TO RESTART', scale: 3, color: '#ffb347', shadow }).setDepth(9);
    this.ovSub = new PixelLabel(this, 480, 374, 'hud_ovsub', { text: 'ESC FOR TITLE SCREEN', scale: 2, color: '#7d8896', shadow }).setDepth(9);
    this.xhair = this.add.image(0, 0, 'xhair').setScale(2).setDepth(20).setVisible(false);
    this.setOverlay(false);
    this.applyWeapon(0);
    this.lblCount.setText(String(this.count));
    const on = (ev, fn) => { BUS.on(ev, fn, this); this.events.once('shutdown', () => BUS.off(ev, fn, this)); };
    on('reset', this.onReset); on('hp', this.onHp); on('weapon', this.applyWeapon); on('enemies', this.onCount);
    on('callout', this.callout); on('over', this.showOver); on('aim', this.onAim);
    on('combo', this.onCombo); on('hitmark', this.onHitmark); on('flash', this.onFlash);
    on('wave', this.onWave); on('splat', this.onSplat); on('rankup', this.onRankUp);
  }
  onCombo(n) {
    this.tweens.killTweensOf(this.lblCombo);
    this.lblCombo.setText('COMBO X' + n).setAlpha(1).setScale(4.5);
    this.tweens.add({ targets: this.lblCombo, scale: 3, duration: 180, ease: 'Back.easeOut' });
    this.tweens.add({ targets: this.lblCombo, alpha: 0, delay: 2000, duration: 500 });
  }
  onHitmark(kill, head) {
    if (kill) { this.hmKill = true; this.hmT = 0.32; }
    else if (!(this.hmKill && this.hmT > 0)) { this.hmKill = false; this.hmT = 0.14; }
    if (head) this.hmHead = true;
  }
  onFlash(a) { this.flashA = Math.max(this.flashA, a); }
  onWave(n, total) { this.lblWave.setText('WAVE ' + n + '/' + total); }
  onRankUp() { this.rankPop = 0.35; }
  onSplat(n) {                                                         // chunky blood blobs that drip and fade
    for (let i = 0; i < n && this.splats.length < 28; i++) {
      const r = randi(3, 7) * 4, sat = [];
      for (let j = 0; j < 6; j++) sat.push([randi(-r, r), randi(-r, r), randi(1, 3) * 4]);
      this.splats.push({ x: Math.round(rand(40, VIEW_W - 40) / 4) * 4, y: Math.round(rand(30, VIEW_H - 90) / 4) * 4, r, a: rand(0.55, 0.85),
                         drip: 0, dripMax: rand(20, 90), sat, life: rand(2.2, 3.4), t: 0 });
    }
  }
  onReset(d) {
    this.hp = this.dispHp = d.hp; this.lblHp.setStyle({ color: '#ffffff' }).setText(String(d.hp));
    this.applyWeapon(d.weapon); this.count = d.enemies; this.lblCount.setText(String(d.enemies));
    this.setOverlay(false); this.tweens.killTweensOf(this.call); this.call.setAlpha(0);
    this.t0 = this.time.now; this.hurtA = 0; this.healA = 0; this.flashA = 0; this.hmT = 0; this.splats = [];
    this.tweens.killTweensOf(this.lblCombo); this.lblCombo.setAlpha(0);
  }
  onHp(hp, dmg) {
    if (hp < this.hp) { this.hurtA = Math.min(1, this.hurtA + 0.45 + dmg / 40); this.panelShake = 0.25; } else if (hp > this.hp) this.healA = 1;
    this.hp = hp;
    this.lblHp.setStyle({ color: hp > 60 ? '#ffffff' : hp > 30 ? '#ffc23a' : '#ff4a3a' }).setText(String(Math.ceil(hp)));
  }
  onAim(m) { this.aimMode = m; }
  onCount(n) { this.count = n; this.lblCount.setText(String(n)); this.countPulse = 0.25; }
  applyWeapon(i) {
    this.weapon = i;
    this.lblWeapon.setText(WEAPONS[i].name);
    this.slotIcons.forEach((ic, j) => ic.setAlpha(j === i ? 1 : 0.4));
  }
  callout(txt) {
    if (this.overOn) return;
    this.tweens.killTweensOf(this.call);
    this.call.setText(txt).setAlpha(1).setScale(7);
    this.tweens.add({ targets: this.call, scale: 5, duration: 160, ease: 'Back.easeOut' });
    this.tweens.add({ targets: this.call, alpha: 0, delay: 1100, duration: 400 });
  }
  showOver(d) {
    this.tweens.killTweensOf(this.call); this.call.setAlpha(0);
    this.ovTitle.setStyle({ rows: d.won ? WIN_ROWS : LOSE_ROWS }).setText(d.won ? 'ARENA CLEARED' : 'YOU GOT GIBBED');
    this.ovStat1.setText(`TIME ${d.time.toFixed(1)}S    KILLS ${d.kills}/${d.total}`);
    this.ovStat2.setText(`SHOTS ${d.shots}   ACCURACY ${d.acc}%   BEST COMBO X${d.combo}`);
    this.ovStat3.setText(`HEADSHOTS ${d.headshots}    BEST STYLE ${d.style}`);
    this.setOverlay(true);
  }
  setOverlay(on) {
    this.overOn = on;
    const g = this.ovG; g.clear();
    if (on) {
      g.fillStyle(0x000000, 0.66); g.fillRect(0, 168, VIEW_W, 226);
      g.fillStyle(0xff8a1f, 1); g.fillRect(0, 168, VIEW_W, 2); g.fillRect(0, 392, VIEW_W, 2);
    }
    [this.ovTitle, this.ovStat1, this.ovStat2, this.ovStat3, this.ovPrompt, this.ovSub].forEach(o => o.setVisible(on));
  }
  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    this.dispHp = this.dispHp > this.hp ? Math.max(this.hp, this.dispHp - 30 * dt) : this.hp;
    this.hurtA = Math.max(0, this.hurtA - dt * 1.8); this.healA = Math.max(0, this.healA - dt * 2);
    this.flashA = Math.max(0, this.flashA - dt * 2.2); this.panelShake = Math.max(0, this.panelShake - dt);
    this.draw(time);
    this.drawSplats(dt);
    // hit marker: four ticks round the crosshair; red + wider on a kill, yellow ring on a headshot
    const hg = this.hmG; hg.clear();
    if (this.hmT > 0 && this.aimMode === 'mouse') {
      this.hmT -= dt;
      const p = this.input.activePointer, cx = Math.round(p.x), cy = Math.round(p.y), grow = this.hmKill ? 5 : 2;
      const col = this.hmHead ? 0xffe14a : this.hmKill ? 0xff3a2a : 0xffffff;
      for (const [c, o] of [[0x000000, 1], [col, 0]]) {
        hg.fillStyle(c, 1);
        for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) for (let i = 0; i < 3; i++) {
          const d = 9 + i * 2 + grow; hg.fillRect(cx + sx * d - 1 + o, cy + sy * d - 1 + o, 2, 2);
        }
      }
      if (this.hmHead) { hg.lineStyle(2, 0xffe14a, Math.min(1, this.hmT * 4)); hg.strokeCircle(cx, cy, 20 + (0.32 - this.hmT) * 30); }
    } else { this.hmT = Math.max(0, this.hmT - dt); }
    if (this.hmT <= 0) this.hmHead = false;
    // style rank: read straight from the game scene
    const gs = this.scene.get('Game'), st = gs && gs.style;
    if (st) {
      const r = st.rank, R = STYLE_RANKS[r];
      if (r !== this.shownRank) { this.shownRank = r; this.lblRank.setStyle({ color: R.c }).setText(R.n); }
      this.styleA += ((st.pts > 4 ? 1 : 0) - this.styleA) * Math.min(1, dt * 5);
      this.rankPop = Math.max(0, this.rankPop - dt);
      this.lblRank.setAlpha(this.styleA).setScale(6 + this.rankPop * 10); this.lblStyleT.setAlpha(this.styleA * 0.9);
      this.styleFrac = r + 1 < STYLE_RANKS.length ? clamp((st.pts - R.t) / (STYLE_RANKS[r + 1].t - R.t), 0, 1) : 1;
    }
    const age = (time - this.t0) / 1000, ha = age < 10 ? 0.9 : Math.max(0.3, 0.9 - (age - 10) * 0.3);
    this.hint1.setAlpha(ha); this.hint2.setAlpha(ha);
    const p = this.input.activePointer;
    this.xhair.setVisible(this.aimMode === 'mouse').setPosition(Math.round(p.x), Math.round(p.y));
    if (this.overOn) this.ovPrompt.setAlpha(Math.floor(time / 400) % 2 ? 1 : 0.35);
    if (this.countPulse > 0) { this.countPulse -= dt; this.lblCount.setScale(4 + Math.max(0, this.countPulse) * 6); }
  }
  drawSplats(dt) {
    const g = this.splatG; g.clear();
    for (let i = this.splats.length - 1; i >= 0; i--) {
      const s = this.splats[i]; s.t += dt; s.drip = Math.min(s.dripMax, s.drip + dt * 14);
      if (s.t >= s.life) { this.splats.splice(i, 1); continue; }
      const a = s.a * Math.min(1, 2 - 2 * s.t / s.life);
      g.fillStyle(0x6a0808, a); g.fillRect(s.x - s.r / 2, s.y - s.r / 2, s.r, s.r * 0.8);
      for (const [ox, oy, w] of s.sat) g.fillRect(s.x + ox - w / 2, s.y + oy - w / 2, w, w);
      g.fillRect(s.x - 2, s.y, 4, Math.round(s.drip / 4) * 4);
      g.fillStyle(0x9a1414, a * 0.7); g.fillRect(s.x - s.r / 4, s.y - s.r / 4, s.r / 2, s.r / 3);
    }
  }
  draw(time) {
    const g = this.g; g.clear();
    const panel = (x, y, w, h) => {
      g.fillStyle(0x06070a, 0.78); g.fillRect(x, y, w, h);
      g.fillStyle(0x3a424d, 1); g.fillRect(x, y, w, 2);
      g.fillStyle(0x1c2027, 1); g.fillRect(x, y + h - 2, w, 2); g.fillRect(x, y, 2, h); g.fillRect(x + w - 2, y, 2, h);
    };
    panel(14, 10, 302, 64);
    const frac = this.hp / TUNE.PLAYER_HP, dfrac = this.dispHp / TUNE.PLAYER_HP;
    const col = frac > 0.6 ? 0x5cff7a : frac > 0.3 ? 0xffc23a : 0xff3a2a;
    const ox = this.panelShake > 0 ? randi(-2, 2) : 0, oy = this.panelShake > 0 ? randi(-2, 2) : 0;   // bar jolts when hit
    for (let i = 0; i < 20; i++) {
      const t = (i + 1) / 20, x = 26 + i * 14 + ox, y = 42 + oy;
      let c = 0x1a1d22;
      if (t <= frac + 1e-6) c = col; else if (t <= dfrac + 1e-6) c = 0xffffff;
      g.fillStyle(c, 1); g.fillRect(x, y, 12, 20);
      if (c === col) { g.fillStyle(0xffffff, 0.28); g.fillRect(x, y, 12, 4); g.fillStyle(0x000000, 0.25); g.fillRect(x, y + 16, 12, 4); }
    }
    WEAPONS.forEach((w, i) => {
      const x = 14 + i * 68, y = 82, sel = i === this.weapon;
      g.fillStyle(sel ? 0x2a1806 : 0x06070a, sel ? 0.9 : 0.6); g.fillRect(x, y, 64, 52);
      g.lineStyle(2, sel ? 0xff8a1f : 0x2a2f37, 1); g.strokeRect(x + 1, y + 1, 62, 50);
    });
    panel(756, 10, 190, 76);
    if (this.styleA > 0.02) {                                           // progress toward the next style rank
      g.fillStyle(0x06070a, 0.7 * this.styleA); g.fillRect(850, 190, 94, 6);
      g.fillStyle(Phaser.Display.Color.HexStringToColor(STYLE_RANKS[Math.max(0, this.shownRank)].c).color, this.styleA); g.fillRect(851, 191, Math.round(92 * (this.styleFrac || 0)), 4);
    }
    g.fillStyle(0x000000, 0.55 * this.hint1.alpha); g.fillRect(0, 494, VIEW_W, 38);   // backing strip for the control hints
    const fg = this.flashG; fg.clear();
    let red = this.hurtA * 0.6;
    if (this.hp > 0 && this.hp <= 30) red = Math.max(red, 0.2 + 0.14 * Math.sin(time / 160));
    const edge = (color, a) => {
      for (let i = 0; i < 6; i++) {
        const t = 12, ins = i * t, al = a * (1 - i / 6) * 0.5;
        fg.fillStyle(color, al);
        fg.fillRect(ins, ins, VIEW_W - ins * 2, t); fg.fillRect(ins, VIEW_H - ins - t, VIEW_W - ins * 2, t);
        fg.fillRect(ins, ins + t, t, VIEW_H - ins * 2 - t * 2); fg.fillRect(VIEW_W - ins - t, ins + t, t, VIEW_H - ins * 2 - t * 2);
      }
    };
    if (red > 0.01) edge(0xff1010, red);
    if (this.healA > 0.01) edge(0x30ff60, this.healA * 0.5);
    if (this.flashA > 0.01) { fg.fillStyle(0xfff2d8, this.flashA); fg.fillRect(0, 0, VIEW_W, VIEW_H); }
  }
}

