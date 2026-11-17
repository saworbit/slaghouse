// -----------------------------------------------------------------------------
class HudScene extends Phaser.Scene {
  constructor() { super('Hud'); }
  create() {
    this.hp = TUNE.PLAYER_HP; this.dispHp = this.hp; this.weapon = 0; this.count = 0;
    this.hurtA = 0; this.healA = 0; this.aimMode = 'keys'; this.overOn = false; this.t0 = this.time.now; this.countPulse = 0;
    this.flashA = 0; this.hmT = 0; this.hmKill = false; this.hmHead = false; this.panelShake = 0;
    this.splats = []; this.rankPop = 0; this.styleA = 0; this.shownRank = -1;
    const shadow = '#000000';
    this.add.image(VIEW_W / 2, VIEW_H / 2, 'vignette').setDepth(0);
    this.splatG = this.add.graphics().setDepth(0.5);                   // blood on the lens
    this.flashG = this.add.graphics().setDepth(1);
    this.g = this.add.graphics().setDepth(2);
    new PixelLabel(this, 26, 20, 'hud_hplbl', { text: 'HEALTH', align: 'left', scale: 2, color: '#8f9bab', shadow }).setDepth(3);
    this.lblHp = new PixelLabel(this, 304, 16, 'hud_hp', { maxChars: 3, text: '100', align: 'right', scale: 3, color: '#ffffff', shadow }).setDepth(3);
    // arsenal round: a ribbon of 9 slots (the gun in hand and 4 either side) that slides as you swap
    this.ribPos = 0; this.ribPop = 0; this.lockedIds = [];
    this.slotIcons = WEAPONS.map(w => { const ic = this.add.image(0, 110, 'icon_' + w.gun).setDepth(3).setVisible(false); ic.baseS = Math.min(1.25, 27 / GUNS[w.gun].w); return ic.setScale(ic.baseS); });
    this.slotKeys = WEAPONS.map((w, i) => new PixelLabel(this, 0, 85, 'hud_slot' + i, { text: SLOT_KEYS[i] || ' ', align: 'left', scale: 2, color: '#ffffff', shadow }).setDepth(3).setVisible(false));
    this.lblWeapon = new PixelLabel(this, 26, 136, 'hud_wname', { maxChars: 19, align: 'left', scale: 2, color: '#ffb347', shadow }).setDepth(3);
    this.lblMines = new PixelLabel(this, 26, 156, 'hud_mines', { maxChars: 12, text: 'G MINES ' + TUNE.MINE.max, align: 'left', scale: 2, color: '#ff6a4a', shadow }).setDepth(3);
    this.lblSentry = new PixelLabel(this, 26, 176, 'hud_sentry', { maxChars: 16, text: 'T SENTRY READY', align: 'left', scale: 2, color: '#5cff7a', shadow }).setDepth(3); this.sentTxt = '';
    // overdrive round: off-screen arrows, hit direction, wave cards, pause menu
    this.dirs = []; this.dashK = 1; this.wcT = 0; this.wcDur = 2.6; this.pauseOn = false; this.pSel = 0; this.pArm = -1; this.hudFrame = 0;
    this.pConfirm = -1; this.rArmF = 0;                                 // the pause item waiting on its confirm press; how much of mid-run R's confirm window is left
    this.arrowG = this.add.graphics().setDepth(2.5);
    this.wcG = this.add.graphics().setDepth(4.5);
    this.wcTitle = new PixelLabel(this, 480, 246, 'hud_wct', { maxChars: 16, scale: 6, rows: CALL_ROWS, shadow, originY: 0.5 }).setDepth(4.6).setVisible(false);
    this.wcSub = new PixelLabel(this, 480, 286, 'hud_wcs', { maxChars: 36, scale: 2, color: '#ffd8a0', shadow, originY: 0.5 }).setDepth(4.6).setVisible(false);
    this.pG = this.add.graphics().setDepth(10);
    this.pTitle = new PixelLabel(this, 480, 150, 'hud_pt', { text: 'PAUSED', scale: 8, rows: LOGO_ROWS, shadow, originY: 0.5 }).setDepth(11);
    this.pItems = PAUSE_ITEMS.map(({ id }, i) => new PixelLabel(this, 480, PAUSE_Y0 + i * PAUSE_GAP, 'hud_pi_' + id, { maxChars: 17, text: id.toUpperCase(), scale: 3, color: '#c6ced8', shadow, originY: 0.5 }).setDepth(11));
    this.wheelG = this.add.graphics().setDepth(11.5);                   // Tab: weapon wheel
    this.wheelIcons = WEAPONS.map(w => this.add.image(0, 0, 'icon_' + w.gun).setDepth(12).setVisible(false));
    this.wheelBlurb = new PixelLabel(this, 480, 328, 'hud_wb', { maxChars: 40, scale: 1, color: '#c8d0da', originY: 0.5 }).setDepth(12).setVisible(false);
    this.wheelName = new PixelLabel(this, 480, 282, 'hud_wn', { maxChars: 16, scale: 3, color: '#ffb347', shadow, originY: 0.5 }).setDepth(12).setVisible(false);
    this.wheelKey = new PixelLabel(this, 480, 306, 'hud_wk', { maxChars: 12, scale: 2, color: '#8f9bab', shadow, originY: 0.5 }).setDepth(12).setVisible(false);
    this.pHint = new PixelLabel(this, 480, 446, 'hud_ph', { maxChars: 37, text: 'W/S PICK  :  A/D CHANGE  :  ESC BACK', scale: 2, color: '#7d8896', shadow, originY: 0.5 }).setDepth(11);
    this.ctlTitle = new PixelLabel(this, 480, 108, 'hud_ctt', { text: 'CONTROLS', scale: 4, rows: CALL_ROWS, shadow, originY: 0.5 }).setDepth(11);
    this.ctlLines = [this.ctlTitle, ...CONTROL_LINES.map(([t, c], i) => new PixelLabel(this, 480, 146 + i * 26, 'hud_ctl' + i, { maxChars: 80, text: t, scale: 2, color: c || '#c6ced8', shadow, originY: 0.5 }).setDepth(11)),
      new PixelLabel(this, 480, 446, 'hud_ctb', { text: 'ESC / ENTER / CLICK / B : BACK', scale: 2, color: '#7d8896', shadow, originY: 0.5 }).setDepth(11)];
    this.setPause(false);
    this.input.keyboard.on('keydown', ev => this.onPauseKey(ev));
    this.input.on('pointermove', p => this.onPausePointer(p, false));
    this.input.on('pointerdown', p => this.onPausePointer(p, true));
    this.lblMute = new PixelLabel(this, 26, 196, 'hud_mute', { text: 'MUTED  M SOUND ON', align: 'left', scale: 2, color: '#8f9bab', shadow }).setDepth(3).setVisible(false);
    this.lblRamp = new PixelLabel(this, 944, 214, 'hud_ramp', { maxChars: 8, text: 'RAMPAGE', align: 'right', scale: 2, color: '#ff7a2a', shadow }).setDepth(3).setVisible(false); this.rampA = 0;
    this.add.image(784, 40, 'skull').setScale(3).setDepth(3);
    new PixelLabel(this, 932, 20, 'hud_hostlbl', { text: 'HOSTILES', align: 'right', scale: 2, color: '#8f9bab', shadow }).setDepth(3);
    this.lblCount = new PixelLabel(this, 932, 52, 'hud_count', { maxChars: 2, align: 'right', scale: 4, color: '#ff5a3a', shadow, originY: 0.5 }).setDepth(3);
    this.lblWave = new PixelLabel(this, 768, 64, 'hud_wave', { maxChars: 11, text: 'WAVE 1/' + CAMPAIGN.length, align: 'left', scale: 2, color: '#d090ff', shadow }).setDepth(3);
    this.routeLabel = new PixelLabel(this, 540, 24, 'hud_route', { maxChars: 33, scale: 2, color: '#d8dee6', shadow }).setDepth(3).setVisible(false);
    this.routeDetail = new PixelLabel(this, 540, 42, 'hud_route_detail', { maxChars: 46, scale: 1.5, color: '#ffd58c', shadow }).setDepth(3).setVisible(false);
    this.unlockCards = Array.from({ length: 3 }, (_, i) => {
      const label = (y, part, maxChars, scale, color) => new PixelLabel(this, 480, y, 'hud_unlock_' + part + i,
        { maxChars, scale, color, shadow }).setDepth(3).setVisible(false);
      return { name: label(444, 'name', 22, 2, '#a1f2ff'), use: label(465, 'use', 44, 1, '#d8dee6'), key: label(477, 'key', 30, 1.5, '#ffd58c') };
    });
    this.lblCombo = new PixelLabel(this, 940, 104, 'hud_combo', { maxChars: 10, align: 'right', scale: 3, rows: CALL_ROWS, shadow, originY: 0.5 }).setDepth(3).setAlpha(0);
    this.lblStyleT = new PixelLabel(this, 944, 128, 'hud_stylet', { text: 'STYLE', align: 'right', scale: 2, color: '#8f9bab', shadow }).setDepth(3);
    this.lblRank = new PixelLabel(this, 944, 166, 'hud_rank', { maxChars: 3, text: 'D', align: 'right', scale: 6, color: STYLE_RANKS[0].c, shadow, originY: 0.5 }).setDepth(3);
    this.hmG = this.add.graphics().setDepth(21);
    this.hint1 = new PixelLabel(this, 480, 500, 'hud_hint1', { maxChars: 80, text: HINT1, scale: 2, color: '#9aa6b4', shadow }).setDepth(3);
    this.hint2 = new PixelLabel(this, 480, 518, 'hud_hint2', { maxChars: 80, text: HINT2, scale: 2, color: '#9aa6b4', shadow }).setDepth(3);
    this.mkLbl = new PixelLabel(this, 480, 216, 'hud_mk', { maxChars: 12, scale: 3, color: '#ffe14a', shadow, originY: 0.5 }).setDepth(5).setAlpha(0);
    this.call = new PixelLabel(this, 480, 176, 'hud_call', { maxChars: 16, scale: 5, rows: CALL_ROWS, shadow, originY: 0.5 }).setDepth(5).setAlpha(0);
    this.ovG = this.add.graphics().setDepth(8);
    this.ovTitle = new PixelLabel(this, 480, 164, 'hud_ovt', { maxChars: 16, scale: 7, rows: WIN_ROWS, shadow, originY: 0.5 }).setDepth(9);
    this.ovStat1 = new PixelLabel(this, 410, 198, 'hud_ovs1', { maxChars: 48, scale: 2, color: '#d8dee6', shadow }).setDepth(9);
    this.ovStat2 = new PixelLabel(this, 410, 218, 'hud_ovs2', { maxChars: 48, scale: 2, color: '#d8dee6', shadow }).setDepth(9);
    this.ovStat3 = new PixelLabel(this, 410, 238, 'hud_ovs3', { maxChars: 48, scale: 2, color: '#d8dee6', shadow }).setDepth(9);
    this.ovStat4 = new PixelLabel(this, 410, 258, 'hud_ovs4', { maxChars: 52, scale: 2, color: '#ffb347', shadow }).setDepth(9);
    this.ovStat5 = new PixelLabel(this, 410, 278, 'hud_ovs5', { maxChars: 52, scale: 2, color: '#c6ced8', shadow }).setDepth(9);
    this.ovScore = new PixelLabel(this, 410, 306, 'hud_ovsc', { maxChars: 16, scale: 3, color: '#ffe14a', shadow }).setDepth(9);
    this.ovBest = new PixelLabel(this, 410, 338, 'hud_ovbest', { maxChars: 16, scale: 2, color: '#5cff7a', shadow }).setDepth(9);
    this.ovGrade = new PixelLabel(this, 822, 270, 'hud_ovgrade', { maxChars: 1, text: 'S', scale: 14, color: '#ffd040', shadow, originY: 0.5 }).setDepth(9);
    this.ovGradeLbl = new PixelLabel(this, 822, 206, 'hud_ovgl', { text: 'GRADE', scale: 2, color: '#8f9bab', shadow, originY: 0.5 }).setDepth(9);
    this.ovPrompt = new PixelLabel(this, 480, 378, 'hud_ovp', { text: 'PRESS R OR ENTER TO RESTART', maxChars: 35, scale: 3, color: '#ffb347', shadow }).setDepth(9);
    this.ovSub = new PixelLabel(this, 480, 410, 'hud_ovsub', { text: 'ESC FOR TITLE SCREEN', scale: 2, color: '#7d8896', shadow }).setDepth(9);
    this.xhair = this.add.image(0, 0, 'xhair').setScale(2).setDepth(20).setVisible(false);
    this.bossName = new PixelLabel(this, 540, 46, 'hud_bossname', { maxChars: 16, scale: 2, color: '#ffb060', shadow, originY: 0 }).setDepth(3).setVisible(false);
    this.lbG = this.add.graphics().setDepth(7);                         // boss intro letterbox
    this.lbTitle = new PixelLabel(this, 480, 236, 'hud_lbt', { maxChars: 16, scale: 8, rows: LOGO_ROWS, shadow, originY: 0.5 }).setDepth(9).setVisible(false);
    this.lbSub = new PixelLabel(this, 480, 284, 'hud_lbs', { maxChars: 20, scale: 3, color: '#ff8a1f', shadow, originY: 0.5 }).setDepth(9).setVisible(false);
    this.lbT = 0; this.bossDisp = 1;
    // ironclad round: medal toasts, the jam glitch, medals on the results screen
    this.medG = this.add.graphics().setDepth(6); this.medQ = []; this.medT = 0; this.jamT = 0;
    this.medLbl = new PixelLabel(this, 480, 146, 'hud_medal', { maxChars: 30, scale: 2, color: '#ffd040', shadow, originY: 0.5 }).setDepth(6.1).setVisible(false);
    this.rArmLbl = new PixelLabel(this, 480, 66, 'hud_rarm', { maxChars: 26, scale: 2, color: '#ffe46a', shadow, originY: 0.5 }).setDepth(6.2).setVisible(false);   // its own label: callouts can't wipe it
    this.medSub = new PixelLabel(this, 480, 164, 'hud_medsub', { maxChars: 34, scale: 1, color: '#d8dee6', shadow, originY: 0.5 }).setDepth(6.1).setVisible(false);
    this.jamLbl = new PixelLabel(this, 26, 136, 'hud_jam', { maxChars: 10, text: 'JAMMED', align: 'left', scale: 2, color: '#60ff9a', shadow }).setDepth(3.5).setVisible(false);
    this.ovMedals = new PixelLabel(this, 410, 356, 'hud_ovmed', { maxChars: 62, scale: 2, color: '#ffd040', shadow }).setDepth(9);
    // slagforge round: perk draft between waves
    this.perkG = this.add.graphics().setDepth(10.5); this.perkOn = false; this.perkSel = 1; this.perkIds = []; this.perkArm = -1;
    this.perkTitle = new PixelLabel(this, 480, 168, 'hud_pkt', { text: 'PICK A PERK', scale: 5, rows: CALL_ROWS, shadow, originY: 0.5 }).setDepth(10.6);
    this.perkCards = [0, 1, 2].map(i => ({
      name: new PixelLabel(this, 260 + i * 220, 228, 'hud_pkn' + i, { maxChars: 14, scale: 2, color: '#ffb347', shadow, originY: 0.5 }).setDepth(10.6),
      d: [0, 1, 2].map(j => new PixelLabel(this, 260 + i * 220, 258 + j * 18, 'hud_pkd' + i + j, { maxChars: 17, scale: 2, color: '#d8dee6', shadow, originY: 0.5 }).setDepth(10.6)),
      key: new PixelLabel(this, 260 + i * 220, 326, 'hud_pkk' + i, { text: '[' + (i + 1) + ']', scale: 2, color: '#8f9bab', shadow, originY: 0.5 }).setDepth(10.6),
    }));
    this.lblPower = new PixelLabel(this, 26, 214, 'hud_power', { maxChars: 40, align: 'left', scale: 2, color: '#ffffff', shadow }).setDepth(3);
    this.lblPerks = new PixelLabel(this, 26, 196, 'hud_perks', { maxChars: 56, align: 'left', scale: 2, color: '#c8a0ff', shadow }).setDepth(3);
    this.setPerkUi(false);
    this.input.keyboard.on('keydown', ev => this.onPerkKey(ev));
    this.input.on('pointermove', p => this.onPerkPointer(p, false));
    this.input.on('pointerdown', p => this.onPerkPointer(p, true));
    this.setOverlay(false);
    this.applyWeapon(0);
    this.lblCount.setText(String(this.count));
    const on = (ev, fn) => { BUS.on(ev, fn, this); this.events.once('shutdown', () => BUS.off(ev, fn, this)); };
    on('reset', this.onReset); on('hp', this.onHp); on('weapon', this.applyWeapon); on('enemies', this.onCount);
    on('callout', this.callout); on('multikill', this.showMulti); on('over', this.showOver); on('aim', this.onAim);
    on('combo', this.onCombo); on('hitmark', this.onHitmark); on('flash', this.onFlash);
    on('wave', this.onWave); on('mines', this.onMines); on('minibar', this.onMinibar); on('splat', this.onSplat); on('rankup', this.onRankUp); on('boss', this.onBoss);
    on('dmgdir', this.onDmgDir); on('wavecard', this.onWaveCard); on('pause', this.onPause);
    on('binds', () => { this.slotKeys.forEach((o, i) => o.setText(SLOT_KEYS[i] || ' ')); this.hint1.setText(PAD.active ? HINT_PAD1 : HINT1); this.hint2.setText(PAD.active ? HINT_PAD2 : HINT2); });
    on('medal', m => this.medQ.push(m)); on('jam', t => { this.jamT = t; });
    on('locked', ids => { this.lockedIds = ids.slice(); });
    on('perks', this.onPerks); on('perkdone', () => this.setPerkUi(false)); on('perklist', ids => this.lblPerks.setText(ids.length ? 'PERKS ' + ids.map(id => (PERKS.find(q => q.id === id) || {}).tag).join(' ') : ''));
    this.polInit();                                                      // expansion: polish (cosmetic only)
  }
  // ---- slagforge round: perk cards ----
  onPerks(ids) {
    this.perkIds = ids; this.perkSel = Math.min(1, ids.length - 1); this.perkArm = this.hudFrame;
    ids.forEach((id, i) => { const P = PERKS.find(q => q.id === id), C = this.perkCards[i]; C.name.setText(P.name); C.d.forEach((l, j) => l.setText(P.d[j] || '')); });
    this.setPerkUi(true);
  }
  setPerkUi(on) {
    this.perkOn = on;
    const show = on && !this.pauseOn;                                   // paused mid-draft: the cards wait behind the menu
    this.perkTitle.setVisible(show);
    this.perkCards.forEach((C, i) => { const v = show && i < this.perkIds.length; C.name.setVisible(v); C.d.forEach(l => l.setVisible(v)); C.key.setVisible(v); });
    if (!show) this.perkG.clear();
  }
  pickPerk(i) { if (!this.perkOn || i < 0 || i >= this.perkIds.length) return; const id = this.perkIds[i]; this.setPerkUi(false); BUS.emit('perkpick', id); }
  onPerkKey(ev) {
    if (!this.perkOn || this.pauseOn || this.hudFrame === this.perkArm) return;
    const k = ev.keyCode, N = this.perkIds.length;
    if (k >= 49 && k <= 51) this.pickPerk(k - 49);
    else if (k === 37 || k === 65) { this.perkSel = (this.perkSel + N - 1) % N; Sfx.swap(); }
    else if (k === 39 || k === 68) { this.perkSel = (this.perkSel + 1) % N; Sfx.swap(); }
    else if (k === 13) this.pickPerk(this.perkSel);
  }
  onPerkPointer(p, click) {
    if (!this.perkOn || this.pauseOn) return;
    const i = this.perkIds.findIndex((id, j) => Math.abs(p.x - (260 + j * 220)) < 100 && p.y > 200 && p.y < 340);
    if (i < 0) return;
    if (i !== this.perkSel) { this.perkSel = i; Sfx.swap(); }
    if (click && this.hudFrame !== this.perkArm) this.pickPerk(i);
  }
  drawPerks(time) {                                                    // the cards deal in one after another; the pick lifts and glows (expansion: polish)
    const g = this.perkG; g.clear();
    if (this.polPerkFor !== this.perkArm) { this.polPerkFor = this.perkArm; this.polPerkT0 = time; this.polLift = [0, 0, 0]; }   // a new draft
    const age = (time - this.polPerkT0) / 1000, rdt = Math.min(this.game.loop.delta, 50) / 1000;
    g.fillStyle(0x000000, 0.5 * clamp(age / 0.15, 0, 1)); g.fillRect(0, 134, VIEW_W, 222);
    this.perkIds.forEach((id, i) => {
      const k = clamp((age - i * 0.07) / 0.3, 0, 1), e = 1 - Math.pow(1 - k, 3), sel = i === this.perkSel, C = this.perkCards[i];
      this.polLift[i] += ((sel ? 6 : 0) - this.polLift[i]) * Math.min(1, rdt * 16);
      const x = 160 + i * 220, lift = Math.round(this.polLift[i] - (1 - e) * 40), top = 200 - lift, glow = sel ? 0.5 + 0.5 * Math.sin(time / 140) : 0;
      if (sel) { g.lineStyle(4, 0xff8a1f, (0.15 + 0.25 * glow) * e); g.strokeRect(x - 3, top - 3, 206, 146); }
      g.fillStyle(sel ? 0x2a1806 : 0x0a0b0e, 0.94 * e); g.fillRect(x, top, 200, 140);
      g.lineStyle(2, sel ? (glow > 0.6 ? 0xffd070 : 0xffb347) : 0x3a424d, e); g.strokeRect(x, top, 200, 140);
      if (sel) { const bob = Math.round(Math.sin(time / 120) * 2), by = top + 140; g.fillStyle(0xffe46a, e); g.fillTriangle(x + 100 - 6, by + 12 + bob, x + 100 + 6, by + 12 + bob, x + 100, by + 6 + bob); }
      C.name.setY(228 - lift).setAlpha(e); C.d.forEach((l, j) => l.setY(258 + j * 18 - lift).setAlpha(e)); C.key.setY(326 - lift).setAlpha(e);
    });
  }
  // ---- overdrive round: hit direction, wave cards, pause menu ----
  onDmgDir(a, dmg) { this.dirs.push({ a, t: 0.9, s: Math.min(1, 0.45 + dmg / 30) }); if (this.dirs.length > 6) this.dirs.shift(); }
  onWaveCard(title, sub) {
    this.wcDur = title === 'FINAL WAVE' ? 2.1 : 2.6; this.wcT = this.wcDur;
    this.wcTitle.setText(title); this.wcSub.setText(sub || '');
  }
  onPause(on) { this.setPause(on); if (on) { this.pArm = this.hudFrame; this.pSel = 0; this.input.setDefaultCursor('default'); } }
  setPause(on) {
    this.pauseOn = on; this.pShownSel = -1; this.ctlOn = false; this.pConfirm = -1;
    if (this.perkOn) this.setPerkUi(true);                              // the pause menu hides a perk draft until RESUME
    [this.pTitle, this.pHint, ...this.pItems].forEach(o => o.setVisible(on));
    this.ctlLines.forEach(o => o.setVisible(false));
    if (on) this.pLabels();
    if (!on) this.pG.clear();
  }
  setControls(on) {                                                    // the CONTROLS page swaps in for the menu; back returns to it
    this.ctlOn = on; this.pShownSel = -1;
    [this.pTitle, this.pHint, ...this.pItems].forEach(o => o.setVisible(!on));
    this.ctlLines.forEach(o => o.setVisible(on));
    if (on) CONTROL_LINES.forEach(([t], i) => this.ctlLines[i + 1]?.setText(t));
  }
  pausePick(i) {
    const gs = this.scene.get('Game'), item = PAUSE_ITEMS[i]; Sfx.ui();
    if (item.confirm && !gs.lab && this.pConfirm !== i) { this.pConfirm = i; this.pShownSel = -1; this.pLabels(); return; }   // restart and quit lose the run: pick them twice
    if (item.step) { this.pStep(i, -1, true); return; }
    switch (item.id) {
      case 'resume': this.setPause(false); this.scene.resume('Game'); BUS.emit('pause', false); break;
      case 'restart': this.setPause(false); gs.restartRun(); break;
      case 'postfx': gs.togglePostFx(); this.pLabels(); break;
      case 'flash': OPTS.flash = OPTS.flash ? 0 : 1; saveOpt('flash'); this.pLabels(); break;   // the effects read OPTS.flash live
      case 'controls': if (gs.lab) LAB_PANEL.open(); else this.setControls(true); break;
      case 'quit': this.setPause(false); gs.quitToTitle(); break;
    }
  }
  pLabels() {
    const gs = this.scene.get('Game');
    PAUSE_ITEMS.forEach((item, i) => this.pItems[i].setText(item.label(gs) + (this.pConfirm === i ? '?' : '')));
    this.pHint.setText(this.pConfirm >= 0 ? 'PRESS AGAIN TO CONFIRM  :  ESC CANCEL' : 'W/S PICK  :  A/D CHANGE  :  ESC BACK');
  }
  pStep(i, dir, wrap) {                                                // a volume row in quarter steps; Enter wraps 0 back to 100
    const key = PAUSE_ITEMS[i].step; if (!key) return;
    if (key !== 'shake' && Sfx.muted) Sfx.toggleMute();                 // changing a volume while muted unmutes, so you hear it
    let v = Math.round(OPTS[key] * 4) + dir;
    if (wrap && v < 0) v = 4;
    OPTS[key] = Math.max(0, Math.min(4, v)) / 4; saveOpt(key);
    if (key !== 'shake') Sfx.applyVolume();
    this.pLabels();
  }
  pMove(i) {                                                           // the list stops at both ends, so RESUME is never one press from QUIT TO TITLE
    i = clamp(i, 0, this.pItems.length - 1);
    if (i === this.pSel) return;
    this.pSel = i; Sfx.swap();
    if (this.pConfirm >= 0) { this.pConfirm = -1; this.pShownSel = -1; this.pLabels(); }   // moving off a pending restart / quit cancels it
  }
  pCancel() { this.pConfirm = -1; this.pShownSel = -1; this.pLabels(); Sfx.swap(); }
  onPauseKey(ev) {
    if (!this.pauseOn || this.hudFrame === this.pArm || LAB_PANEL.isOpen()) return;
    const k = ev.keyCode;
    if (this.ctlOn) { if (k === 13 || k === 32 || k === 27 || k === 80 || k === 8) { this.setControls(false); Sfx.ui(); } return; }
    const item = PAUSE_ITEMS[this.pSel], side = k === 37 || k === 65 ? -1 : k === 39 || k === 68 ? 1 : 0;
    if (k === 38 || k === 87) this.pMove(this.pSel - 1);
    else if (k === 40 || k === 83) this.pMove(this.pSel + 1);
    else if ((k === 27 || k === 80) && this.pConfirm >= 0) this.pCancel();
    else if (side && item.step) { this.pStep(this.pSel, side, false); Sfx.ui(); }
    else if (side && item.toggle) this.pausePick(this.pSel);
    else if (k === 77) { Sfx.toggleMute(); this.pLabels(); }            // M works here too; the volume rows say MUTED
    else if (k === 13 || k === 32) this.pausePick(this.pSel);
    else if (k === 27 || k === 80) this.pausePick(0);
  }
  onPausePointer(p, click) {
    if (!this.pauseOn || LAB_PANEL.isOpen()) return;
    if (this.ctlOn) { if (click && this.hudFrame !== this.pArm) { this.setControls(false); Sfx.ui(); } return; }
    const i = this.pItems.findIndex(o => Math.abs(p.y - o.y) < PAUSE_GAP / 2 && Math.abs(p.x - 480) < 190);
    if (i < 0) return;
    this.pMove(i);
    if (click && this.hudFrame !== this.pArm) this.pausePick(i);
  }
  drawPause(time) {
    const g = this.pG; g.clear();
    g.fillStyle(0x000000, 0.62); g.fillRect(0, 0, VIEW_W, VIEW_H);
    if (this.ctlOn) { g.fillStyle(0x06070a, 0.9); g.fillRect(6, 80, VIEW_W - 12, 390); g.fillStyle(0xff8a1f, 1); g.fillRect(6, 80, VIEW_W - 12, 3); g.fillRect(6, 467, VIEW_W - 12, 3); return; }
    g.fillStyle(0x06070a, 0.85); g.fillRect(270, 100, 420, 366);
    g.fillStyle(0xff8a1f, 1); g.fillRect(270, 100, 420, 3); g.fillRect(270, 463, 420, 3);
    if (this.pShownSel !== this.pSel) { this.pShownSel = this.pSel; this.pItems.forEach((o, i) => o.setStyle({ color: i === this.pConfirm ? '#ff6a4a' : i === this.pSel ? '#ffe46a' : '#8f9bab' })); }
    const o = this.pItems[this.pSel], ask = this.pConfirm === this.pSel, oy = this.polSlideY(o.y);   // a pending restart / quit turns its bar red; the bar slides to the pick
    g.fillStyle(ask ? 0x2a0806 : 0x2a1806, 0.95); g.fillRect(300, oy - 15, 360, 30); g.fillStyle(ask ? 0xff4a3a : 0xff8a1f, 1); g.fillRect(300, oy - 15, 4, 30); g.fillRect(656, oy - 15, 4, 30);
    const bob = Math.round(Math.sin(time / 120) * 2);
    g.fillStyle(0xffe46a, 1); g.fillTriangle(314 + bob, oy - 6, 314 + bob, oy + 6, 322 + bob, oy);
  }
  drawWheel(gs) {                                                      // radial weapon picker (hold Tab): time crawls while it's open
    const on = !!(gs && gs.sys.isActive() && gs.wheelOn), g = this.wheelG; g.clear();
    this.wheelIcons.forEach(o => o.setVisible(false)); this.wheelName.setVisible(on); this.wheelKey.setVisible(on); this.wheelBlurb.setVisible(on);
    if (!on) return;
    const slots = gs.weaponSlots, N = slots.length;
    const cx = VIEW_W / 2, cy = VIEW_H / 2 + 10, R0 = 206, sel = gs.wheelSel;
    g.fillStyle(0x000000, 0.45); g.fillRect(0, 0, VIEW_W, VIEW_H);
    g.fillStyle(0x06070a, 0.82); g.fillCircle(cx, cy, R0 + 34);
    g.lineStyle(2, 0x3a424d, 1); g.strokeCircle(cx, cy, R0 + 34); g.strokeCircle(cx, cy, R0 - 32);
    for (const [k, i] of slots.entries()) {
      const rr = N > 48 ? (N % 2 && k === N - 1 ? R0 : R0 + (k % 2 ? -13 : 13)) : R0;   // a full arsenal staggers on two rings so neighbours don't overlap
      const a = -Math.PI / 2 + k * Math.PI * 2 / N, x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr, s2 = i === sel;
      if (s2) {
        g.fillStyle(0x2a1806, 1); g.fillCircle(x, y, 25); g.lineStyle(3, 0xff8a1f, 1); g.strokeCircle(x, y, 25);
        g.lineStyle(2, 0xff8a1f, 0.6); g.lineBetween(cx + Math.cos(a) * 44, cy + Math.sin(a) * 44, cx + Math.cos(a) * (R0 - 28), cy + Math.sin(a) * (R0 - 28));
      } else if (i === gs.weapon) { g.lineStyle(2, 0x6a7380, 0.8); g.strokeCircle(x, y, 20); }
      this.wheelIcons[i].setVisible(true).setPosition(x, y).setScale((s2 ? 1.5 : 1) * Math.min(1, 26 / GUNS[WEAPONS[i].gun].w)).setAlpha(s2 ? 1 : i === gs.weapon ? 0.9 : gs.locked && gs.locked.has(i) ? 0.15 : 0.5);
      const st = masteryStars(WEAPONS[i].id); for (let k = 0; k < st; k++) { g.fillStyle(0xffd040, 1); g.fillRect(x - 5 + k * 4, y + 11, 2, 2); }   // mastery pips
    }
    this.wheelName.setText(WEAPONS[sel].name); this.wheelBlurb.setText(BLURBS[WEAPONS[sel].id] || '');
    const ms = masteryStars(WEAPONS[sel].id); this.wheelKey.setText((SLOT_KEYS[sel].trim() ? 'KEY ' + SLOT_KEYS[sel] : 'WHEEL') + '  ' + '*'.repeat(ms) + '-'.repeat(3 - ms));
  }
  drawWaveCard(dt, hidden) {                                           // hidden: the weapon wheel is open over it; the card still runs out
    const g = this.wcG; g.clear();
    if (this.wcT > 0) this.wcT -= dt;
    if (this.wcT <= 0 || hidden) { this.wcTitle.setVisible(false); this.wcSub.setVisible(false); return; }
    const kin = clamp((this.wcDur - this.wcT) / 0.25, 0, 1), kout = clamp(this.wcT / 0.3, 0, 1), k = Math.min(kin, kout), e = 1 - Math.pow(1 - k, 3);
    const h = Math.round(92 * e), y = 262 - h / 2, slide = (1 - kin) * -140 + (1 - kout) * 140;
    g.fillStyle(0x000000, 0.55 * e); g.fillRect(0, y, VIEW_W, h);
    g.fillStyle(0xff8a1f, e); g.fillRect(480 - 480 * e, y, 960 * e, 2); g.fillRect(480 - 480 * e, y + h - 2, 960 * e, 2);
    this.wcTitle.setVisible(true).setAlpha(e).setPosition(480 + slide, 246).setScale(6 + (1 - kin) * 2);
    this.wcSub.setVisible(true).setAlpha(e).setPosition(480 - slide * 0.6, 288);
  }
  drawIndicators(gs, time) {                                            // off-screen hostiles + where the last hit came from
    const g = this.arrowG; g.clear();
    this.routeLabel.setVisible(false);
    this.routeDetail.setVisible(false);
    for (const { name, use, key } of this.unlockCards) {
      name.setVisible(false); use.setVisible(false); key.setVisible(false);
    }
    if (!gs || !gs.sys.isActive() || this.overOn) return;
    const showRoute = gs.state === 'play' && !this.pauseOn && !this.perkOn && !gs.wheelOn && !gs.descending && !gs.ride;   // the route, and OVERTIME's lift
    const showCampaign = gs.campaign && showRoute;
    if (showCampaign && gs.time.now < gs.unlockUntil) {
      const slots = gs.unlockSlots;
      for (const [i, slot] of slots.entries()) {
        const card = this.unlockCards[i], weapon = WEAPONS[slot], x = 480 + (i - (slots.length - 1) / 2) * 292;
        const key = SLOT_KEYS[slot]?.trim(), equipped = slot === gs.weapon;
        const action = equipped ? 'EQUIPPED' : PAD.on && PAD.active ? 'HOLD ' + padLabel('wheel') + ' FOR WHEEL' :
          key ? (key === '<' ? 'BKSP' : key) + ' TO EQUIP' : 'HOLD TAB FOR WHEEL';
        g.fillStyle(0x071118, 0.94).fillRect(x - 140, 437, 280, 54);
        g.fillStyle(0x76e8ff, 1).fillRect(x - 140, 437, 280, 2);
        card.name.setX(x).setText(weapon.name).setVisible(true);
        card.use.setX(x).setText(BLURBS[weapon.id] || '').setVisible(true);
        card.key.setX(x).setText(action).setVisible(true);
      }
    }
    const cam = gs.cameras.main, wv = cam.worldView, z = cam.zoom, toS = (x, y) => [(x - wv.x) * z, (y - wv.y) * z];
    if (showRoute && !gs.boss && (gs.campaign || gs.campaignRoute.length)) {
      const station = gs.campaignRoute[0], op = gs.campaign ? CAMPAIGN[gs.wave] : null, n = op ? op.squads.length : 0;
      const next = gs.campaignSquads[0], released = n - gs.campaignSquads.length;
      const incoming = op ? Math.ceil((gs.campaignReinforceAt - gs.time.now) / 1000) : 0;
      if (station || incoming > 0 || gs.activeHostiles() > 0) {
        const [stationLabel, stationDetail] = station ? gs.routeText(station) : [];
        const label = stationLabel || (incoming > 0 ? (next?.incoming || next?.name || 'NEXT SQUAD') + ' IN ' + incoming + 'S' :
          (op.squads[released - 1]?.name || op.name) + '  /  SQUAD ' + released + '/' + n);
        this.routeLabel.setText(label).setVisible(true);
        g.fillStyle(0x070d12, 0.9).fillRect(328, 12, 424, 43);
        g.fillStyle(station ? 0x76e8ff : 0xffb347, 1).fillRect(328, 12, 424, 2);
        if (station) {
          if (stationDetail) this.routeDetail.setText(stationDetail).setVisible(true);
          const [sx, sy] = toS(station.x, station.y - 28);
          if (gs.routeGoal() && (sx < 24 || sx > VIEW_W - 24 || sy < 90 || sy > VIEW_H - 36)) {
            const x = clamp(sx, 24, VIEW_W - 24), y = clamp(sy, 90, VIEW_H - 36);
            const a = Math.atan2(sy - y, sx - x), ca = Math.cos(a), sa = Math.sin(a);
            g.fillStyle(0x0b1015, 0.95).fillCircle(x, y, 14);
            g.fillStyle(0x76e8ff, 1).fillTriangle(x + ca * 9, y + sa * 9,
              x - ca * 5 - sa * 6, y - sa * 5 + ca * 6, x - ca * 5 + sa * 6, y - sa * 5 - ca * 6);
          }
        } else if (incoming > 0 && next?.prepare) {
          this.routeDetail.setText(next.prepare).setVisible(true);
        } else {
          for (let i = 0; i < n; i++) {
            g.fillStyle(i < released ? 0xffb347 : 0x37424f, 1).fillRect(540 + (i - n / 2) * 20 + 2, 44, 16, 3);
          }
        }
      }
    }
    if (gs.state === 'play' && (gs.activeHostiles() <= 5 || (gs.boss && gs.boss.alive))) {
      let n = 0;
      for (const e of gs.enemies.getChildren()) {
        if (!e.alive || n >= 8 || e.def.tiny || e.kind === 'wyrmseg') continue;
        const big = e === gs.boss;
        if (gs.activeHostiles() > 5 && !big) continue;
        const [sx, sy] = e.under ? toS(e.ux, e.floorY - 8) : toS(e.body.center.x, e.body.center.y);
        if (sx > 8 && sx < VIEW_W - 8 && sy > 8 && sy < VIEW_H - 8) continue;
        n++;
        const cx = VIEW_W / 2, cy = VIEW_H / 2, a = Math.atan2(sy - cy, sx - cx), ca = Math.cos(a), sa = Math.sin(a);
        const t = Math.min((VIEW_W / 2 - 26) / Math.abs(ca || 1e-6), (VIEW_H / 2 - 26) / Math.abs(sa || 1e-6)), px = cx + ca * t, py = cy + sa * t;
        const r = big ? 13 : 9, al = 0.55 + 0.35 * Math.sin(time / 140 + n);
        g.fillStyle(0x000000, al * 0.8).fillTriangle(px + ca * (r + 2), py + sa * (r + 2), px - sa * (r * 0.75 + 2) - ca * 3, py + ca * (r * 0.75 + 2) - sa * 3, px + sa * (r * 0.75 + 2) - ca * 3, py - ca * (r * 0.75 + 2) - sa * 3);
        g.fillStyle(big ? 0xffb040 : 0xff5a3a, al).fillTriangle(px + ca * r, py + sa * r, px - sa * r * 0.75, py + ca * r * 0.75, px + sa * r * 0.75, py - ca * r * 0.75);
      }
    }
    if (gs.state !== 'dead' && this.dirs.length) {
      const [px, py] = toS(gs.pv.x, gs.pv.y - 12);
      for (const d of this.dirs) {
        const al = Math.min(1, d.t * 1.6) * d.s;
        for (let k = -2; k <= 2; k++) {
          const a = d.a + k * 0.13, r = 58 - Math.abs(k) * 2, x = Math.round((px + Math.cos(a) * r) / 2) * 2, y = Math.round((py + Math.sin(a) * r) / 2) * 2, s = k === 0 ? 8 : 6;
          g.fillStyle(0x000000, al * 0.7).fillRect(x - s / 2 - 1, y - s / 2 - 1, s + 2, s + 2);
          g.fillStyle(k === 0 ? 0xff6a4a : 0xff2a1a, al).fillRect(x - s / 2, y - s / 2, s, s);
        }
      }
    }
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
  onFlash(a) { this.flashA = Math.max(this.flashA, a * (OPTS.flash ? 1 : 0.25)); }
  onWave(n, total) { this.lblWave.setText(n === 'LAB' ? n : total ? 'WAVE ' + n + '/' + total : 'OT WAVE ' + n); }
  onMines(n) { this.lblMines.setText('G MINES ' + n); }
  onMinibar(name) { this.bossName.setText(name); this.bossDisp = 1; }
  onRankUp() { this.rankPop = 0.35; }
  onBoss(name, sub) {
    this.wcT = Math.min(this.wcT, 0.3);                                 // the boss title card takes over from the wave card
    this.lbT = 2.8; this.lbTitle.setText(name); this.lbSub.setText(sub); this.bossName.setText(name); this.bossDisp = 1;
    this.tweens.killTweensOf(this.call); this.call.setAlpha(0);          // the title card owns the screen
  }
  onSplat(n) {                                                         // chunky blood blobs that drip and fade
    for (let i = 0; i < n && this.splats.length < 28; i++) {
      const r = randi(3, 7) * 4, sat = [];
      for (let j = 0; j < 6; j++) sat.push([randi(-r, r), randi(-r, r), randi(1, 3) * 4]);
      this.splats.push({ x: Math.round(rand(40, VIEW_W - 40) / 4) * 4, y: Math.round(rand(30, VIEW_H - 90) / 4) * 4, r, a: rand(0.55, 0.85),
                         drip: 0, dripMax: rand(20, 90), sat, life: rand(2.2, 3.4), t: 0 });
    }
  }
  onReset(d) {
    this.lbT = 0;
    this.lockedIds = [];                                                 // stolen guns come back with a new run
    this.hp = this.dispHp = d.hp; this.lblHp.setStyle({ color: d.hp > 60 ? '#ffffff' : d.hp > 30 ? '#ffc23a' : '#ff4a3a' }).setText(String(Math.ceil(d.hp)));
    this.applyWeapon(d.weapon); this.count = d.enemies; this.lblCount.setText(String(d.enemies));
    this.setOverlay(false); this.tweens.killTweensOf(this.call); this.call.setAlpha(0);
    this.setPerkUi(false);
    this.t0 = d.carry ? -1e9 : this.time.now; this.hurtA = 0; this.healA = 0; this.flashA = 0; this.hmT = 0; this.splats = [];
    this.tweens.killTweensOf(this.lblCombo); this.lblCombo.setAlpha(0);
    this.tweens.killTweensOf(this.mkLbl); this.mkLbl.setAlpha(0);
    this.dirs = []; this.wcT = 0; this.setPause(false);
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
    this.ribPop = 1;
  }
  showMulti(name, n) {                                                  // DOUBLE KILL ... MASSACRE: punches in under the callout
    if (this.overOn) return;
    this.tweens.killTweensOf(this.mkLbl);
    this.mkLbl.setStyle({ color: ['#ffe14a', '#ffe14a', '#ffe14a', '#ffb347', '#ff7a2a', '#ff4a2a'][n] || '#ff3040' }).setText(name).setAlpha(1).setScale(4.6).setAngle(crand(-5, 5));
    this.tweens.add({ targets: this.mkLbl, scale: 3, angle: 0, duration: 180, ease: 'Back.easeOut' });
    this.tweens.add({ targets: this.mkLbl, alpha: 0, delay: 900, duration: 350 });
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
    this.ovTitle.setStyle({ rows: d.won || d.endless ? WIN_ROWS : LOSE_ROWS }).setText(d.endless ? (d.daily ? 'DAILY W' : 'OVERTIME W') + d.waves : d.won ? (d.rush ? 'RUSH CLEARED' : 'FOUNDRY DOWN') : 'YOU GOT GIBBED');
    this.ovPrompt.setText(d.checkpoint ? 'PRESS R OR ENTER TO RETRY ACT' : 'PRESS R OR ENTER TO RESTART');
    this.ovGrade.setStyle({ color: { S: '#ffd040', A: '#5cff7a', B: '#5cc8ff', C: '#c6ced8', D: '#ff6a4a' }[d.grade] }).setText(d.grade);
    this.ovData = d; this.ovT = 0; this.ovTick = 0; this.ovGradeShown = false; this.gradePop = 0;
    this.setOverlay(true);
    this.tallyOver(0);
  }
  tallyOver(dt) {                                                      // results count up row by row, then the grade stamps in
    const d = this.ovData; if (!d) return;
    this.ovT += dt;
    const t = this.ovT, ease = k => 1 - Math.pow(1 - clamp(k, 0, 1), 3), row = i => ease((t - 0.15 * i) / 0.5), n = (v, k) => Math.round(v * k), on = i => (t >= 0.15 * i ? 1 : 0);
    this.ovStat1.setText(`TIME ${(d.time * row(0)).toFixed(1)}S   KILLS ${n(d.kills, row(0))}/${d.total}   ACCURACY ${n(d.acc, row(0))}%`).setAlpha(on(0));
    this.ovStat2.setText(`HEADSHOTS ${n(d.headshots, row(1))}   BEST COMBO X${n(d.combo, row(1))}   EXECUTES ${n(d.executes, row(1))}`).setAlpha(on(1));
    this.ovStat3.setText(`DODGES ${n(d.dodges, row(2))}   DAMAGE TAKEN ${n(d.taken, row(2))}   BEST STYLE ${d.style}`).setAlpha(on(2));
    let tg = 'TOP GUNS'; for (const [nm, k] of (d.top || [])) { const c = tg + '   ' + nm + ' ' + k; if (c.length <= 52) tg = c; }
    this.ovStat4.setText(d.top && d.top.length ? tg : `FAVOURITE GUN ${d.fav}`).setAlpha(on(3));
    this.ovStat5.setText(`BIGGEST HIT ${n(d.big || 0, row(4))}   ${d.killer ? 'KILLED BY ' + d.killer : d.diff + ' MODE'}`).setStyle({ color: d.killer ? '#ff8a7a' : '#c6ced8' }).setAlpha(on(4));
    this.ovScore.setText('SCORE ' + n(d.score, ease((t - 0.7) / 0.9))).setAlpha(t > 0.7 ? 1 : 0);
    this.ovMedals.setText(d.medals && d.medals.length ? 'MEDALS  ' + d.medals.slice(0, 3).join('  ') + (d.medals.length > 3 ? '  +' + (d.medals.length - 3) : '') : '').setAlpha(t > 1.9 ? 1 : 0);
    this.ovBest.setText(d.newBest ? 'NEW BEST!' : 'BEST ' + d.best).setAlpha(t > 1.6 ? (d.newBest ? (Math.floor(t * 4) % 2 ? 1 : 0.45) : 0.8) : 0);
    if (t > 0.1 && t < 1.6 && (this.ovTick -= dt) <= 0) { this.ovTick = 0.06; Sfx.tink(0.35); }
    if (t >= 1.7 && !this.ovGradeShown) { this.ovGradeShown = true; this.ovGrade.setVisible(true); this.gradePop = 0.4; Sfx.rankUp(); this.onFlash(0.3); this.panelShake = 0.3; }
    if (this.ovGradeShown) { this.gradePop = Math.max(0, this.gradePop - dt); this.ovGrade.setScale(14 + this.gradePop * 25); }
  }
  setOverlay(on) {
    this.overOn = on;
    const g = this.ovG; g.clear();
    if (on) {
      g.fillStyle(0x000000, 0.7); g.fillRect(0, 126, VIEW_W, 312);
      g.fillStyle(0xff8a1f, 1); g.fillRect(0, 126, VIEW_W, 2); g.fillRect(0, 436, VIEW_W, 2);
      g.fillStyle(0x06070a, 0.9); g.fillRect(760, 194, 124, 140); g.lineStyle(2, 0x3a424d, 1); g.strokeRect(761, 195, 122, 138);
    }
    [this.ovTitle, this.ovStat1, this.ovStat2, this.ovStat3, this.ovStat4, this.ovStat5, this.ovScore, this.ovBest, this.ovGradeLbl, this.ovPrompt, this.ovSub, this.ovMedals].forEach(o => o.setVisible(on));
    this.ovGrade.setVisible(false);
    [this.lblMines, this.lblSentry, this.lblWeapon, this.lblPerks].forEach(o => o.setVisible(!on));   // they sit inside the results strip
    if (on) { this.medQ = []; this.medT = 0; this.medLbl.setVisible(false); this.medSub.setVisible(false); this.medG.clear(); }   // the results list the medals
  }
  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000; this.hudFrame++;
    const gsr = this.scene.get('Game');
    if (gsr && gsr.sys.isActive()) {                                     // sentry status + rampage timer, read from the game
      const st = gsr.sentry ? 'T SENTRY ' + Math.ceil(gsr.sentry.t) + 'S' : gsr.time.now >= gsr.sentryReadyAt ? 'T SENTRY READY' : 'T SENTRY ' + Math.ceil((gsr.sentryReadyAt - gsr.time.now) / 1000);
      if (st !== this.sentTxt) { this.sentTxt = st; this.lblSentry.setStyle({ color: gsr.sentry ? '#46e6ff' : st.endsWith('READY') ? '#5cff7a' : '#7d8896' }).setText(st); }
      this.rampA = Math.max(0, (gsr.rampageUntil || 0) - gsr.time.now);
      this.rArmF = gsr.state === 'play' && !this.pauseOn ? clamp((gsr.restartArmUntil - gsr.time.now) / RESTART_CONFIRM_MS, 0, 1) : 0;
      if (this.rArmF > 0) this.rArmLbl.setText('PRESS R AGAIN TO ' + (gsr.chapterStart ? 'RETRY ACT' : 'RESTART'));
    } else { this.rampA = 0; this.rArmF = 0; }
    this.rArmLbl.setVisible(this.rArmF > 0);
    this.lblMute.setVisible(Sfx.muted && !this.overOn);
    if (this.padHints !== PAD.active) {                                  // the hint strip follows the device in use, as the weapon cards do
      this.padHints = PAD.active; this.hint1.setText(PAD.active ? HINT_PAD1 : HINT1); this.hint2.setText(PAD.active ? HINT_PAD2 : HINT2);
    }
    this.lblRamp.setVisible(this.rampA > 0 && !this.overOn).setAlpha(Math.floor(time / 150) % 2 ? 1 : 0.55);
    this.dispHp = this.dispHp > this.hp ? Math.max(this.hp, this.dispHp - 30 * dt) : this.hp;
    this.hurtA = Math.max(0, this.hurtA - dt * 1.8); this.healA = Math.max(0, this.healA - dt * 2);
    this.flashA = Math.max(0, this.flashA - dt * 2.2); this.panelShake = Math.max(0, this.panelShake - dt);
    if (gsr && !this.pauseOn) {                                          // hit-direction markers fade; dash meter refills
      for (let i = this.dirs.length - 1; i >= 0; i--) if ((this.dirs[i].t -= dt) <= 0) this.dirs.splice(i, 1);
      this.dashK = clamp(1 - ((gsr.dashReady || 0) - gsr.time.now) / (TUNE.DASH.cd * 1000), 0, 1);
    }
    this.draw(time);
    this.drawSplats(dt);
    this.drawBoss(dt);
    this.drawWaveCard(dt, !!(gsr && gsr.sys.isActive() && gsr.wheelOn));
    this.drawIndicators(gsr, time);
    if (this.pauseOn) this.drawPause(time);
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
    if (gsr && gsr.sys.isActive() && this.aimMode === 'mouse' && gsr.state !== 'dead') {   // crosshair readouts: lance charge ring, hornet lock pips
      const p = this.input.activePointer, cx = Math.round(p.x), cy = Math.round(p.y), wid = WEAPONS[gsr.weapon].id;
      if (wid === 'lance' && gsr.lanceOn) {
        const c = gsr.lanceCharge, n = 16, lit = Math.round(n * c), full = c >= 1, blink = full && Math.floor(time / 70) % 2;
        for (let i = 0; i < n; i++) {
          const a = -Math.PI / 2 + i / n * Math.PI * 2, x = Math.round(cx + Math.cos(a) * 18), y = Math.round(cy + Math.sin(a) * 18);
          hg.fillStyle(0x000000, 0.6).fillRect(x - 2, y - 2, 4, 4);
          hg.fillStyle(i < lit ? (blink ? 0xffffff : full ? 0xffe080 : 0xff8a20) : 0x3a2010, 1).fillRect(x - 1, y - 1, 2, 2);
        }
      } else if (wid === 'hornet' && (gsr.locks.length || gsr.hornetHeld)) {
        for (let i = 0; i < TUNE.HORNET.maxLocks; i++) { const x = cx - 17 + i * 6, y = cy + 16; hg.fillStyle(0x000000, 0.7).fillRect(x - 1, y - 1, 6, 6); hg.fillStyle(i < gsr.locks.length ? 0xff5a2a : 0x3a2a24, 1).fillRect(x, y, 4, 4); }
      }
    }
    // style rank: read straight from the game scene
    const gs = this.scene.get('Game'), st = gs && gs.style;
    if (st) {
      const r = st.rank, R = STYLE_RANKS[r];
      if (r !== this.shownRank) { this.shownRank = r; this.lblRank.setStyle({ color: R.c }).setText(R.n); }
      this.styleA += ((st.pts > 4 && !this.overOn ? 1 : 0) - this.styleA) * Math.min(1, dt * 5);
      this.rankPop = Math.max(0, this.rankPop - dt);
      this.lblRank.setAlpha(this.styleA).setScale(6 + this.rankPop * 10); this.lblStyleT.setAlpha(this.styleA * 0.9);
      this.styleFrac = r + 1 < STYLE_RANKS.length ? clamp((st.pts - R.t) / (STYLE_RANKS[r + 1].t - R.t), 0, 1) : 1;
    }
    const age = (time - this.t0) / 1000, ha = age < 10 ? 0.9 : Math.max(0, 0.9 - (age - 10) * 0.3);   // gone after 13 s: the strip sits right over the floor you fight on
    this.hint1.setAlpha(ha); this.hint2.setAlpha(ha);
    const p = this.input.activePointer;
    if (this.aimMode === 'pad' && gsr && gsr.sys.isActive() && gsr.aimPt) {   // pad aim: crosshair rides 70 px out along the aim
      const cam = gsr.cameras.main;
      this.xhair.setVisible(true).setPosition(Math.round((gsr.aimPt.x - cam.worldView.x) * cam.zoom), Math.round((gsr.aimPt.y - cam.worldView.y) * cam.zoom));
    } else this.xhair.setVisible(this.aimMode === 'mouse').setPosition(Math.round(p.x), Math.round(p.y));
    // medal toasts: a gold banner slides in under the weapon bar, one at a time
    const mg = this.medG; mg.clear();
    if (this.overOn) this.medQ = [];
    if (this.medT <= 0 && this.medQ.length) { const m = this.medQ.shift(); this.medT = 2.8; this.medLbl.setText('MEDAL  ' + m.name).setVisible(true); this.medSub.setText(m.d).setVisible(true); Sfx.rankUp(); }
    if (this.medT > 0) {
      this.medT -= dt; const k = Math.min(1, (2.8 - this.medT) * 6, this.medT * 4), y = 130 + (1 - k) * -20;
      mg.fillStyle(0x1a1206, 0.88 * k); mg.fillRect(300, y, 360, 44); mg.fillStyle(0xffd040, k); mg.fillRect(300, y, 360, 2); mg.fillRect(300, y + 42, 360, 2);
      mg.fillStyle(0xffd040, k); mg.fillTriangle(318, y + 22, 326, y + 8, 334, y + 22); mg.fillTriangle(318, y + 18, 334, y + 18, 326, y + 32);   // a star
      this.medLbl.setY(y + 16).setAlpha(k); this.medSub.setY(y + 33).setAlpha(k);
      if (this.medT <= 0) { this.medLbl.setVisible(false); this.medSub.setVisible(false); }
    }
    if (this.jamT > 0) {                                                 // jammed: the weapon readout glitches
      this.jamT -= dt; this.jamLbl.setVisible(true).setAlpha(Math.random() < 0.8 ? 1 : 0.3); this.lblWeapon.setAlpha(0);
      mg.fillStyle(0x60ff9a, 0.18); for (let i = 0; i < 6; i++) mg.fillRect(14 + rand(0, 700), rand(80, 124), rand(20, 120), 1);
      if (this.jamT <= 0) { this.jamLbl.setVisible(false); this.lblWeapon.setAlpha(1); }
    }
    if (gsr && gsr.sys.isActive() && gsr.aegis !== undefined) {           // active power-ups and the seconds left
      const nw = gsr.time.now, parts = [];
      if (nw < gsr.dmgUntil) parts.push('OVERDRIVE ' + Math.ceil((gsr.dmgUntil - nw) / 1000));
      if (nw < gsr.hasteUntil) parts.push('HASTE ' + Math.ceil((gsr.hasteUntil - nw) / 1000));
      if (gsr.aegis > 0) parts.push('AEGIS ' + Math.ceil(gsr.aegis));
      this.lblPower.setText(parts.join('  ')).setVisible(!this.overOn);
      if (parts.length) this.lblPower.setStyle({ color: nw < gsr.dmgUntil ? '#ff6070' : nw < gsr.hasteUntil ? '#ffe040' : '#60c0ff' });
    }
    if (this.perkOn && !this.pauseOn) {                                  // perk cards: draw, and let the pad pick
      this.drawPerks(time);
      if (!this.pauseOn && this.hudFrame !== this.perkArm) { const mx = PAD.menuX(), N = this.perkIds.length; if (mx) { this.perkSel = (this.perkSel + N + mx) % N; Sfx.swap(); } if (PAD.jd(0)) this.pickPerk(this.perkSel); }
    }
    if (this.pauseOn && this.hudFrame !== this.pArm && !LAB_PANEL.isOpen()) { // pad drives the pause menu
      const my = PAD.menuY(), mx = PAD.menuX();
      if (this.ctlOn) { if (PAD.jd(0) || PAD.jd(1) || PAD.jd(9)) { this.setControls(false); Sfx.ui(); } }   // the CONTROLS page: any of A / B / Start goes back
      else {
        if (my) this.pMove(this.pSel + my);
        const item = PAUSE_ITEMS[this.pSel];
        if (mx && item.step) { this.pStep(this.pSel, mx, false); Sfx.ui(); }
        else if (mx && item.toggle) this.pausePick(this.pSel);
        if (PAD.jd(0)) this.pausePick(this.pSel);
        else if (PAD.jd(1) || PAD.jd(9)) { if (this.pConfirm >= 0) this.pCancel(); else this.pausePick(0); }   // B / Start back out of a pending restart / quit first
      }
    }
    if (this.overOn) { this.ovPrompt.setAlpha(Math.floor(time / 400) % 2 ? 1 : 0.35); this.tallyOver(dt); }
    this.drawWheel(gsr);
    if (this.countPulse > 0) { this.countPulse -= dt; this.lblCount.setScale(4 + Math.max(0, this.countPulse) * 6); }
    this.polUpdate(time, dt, gsr);                                       // expansion: polish (cosmetic only)
  }
  drawBoss(dt) {
    const lg = this.lbG; lg.clear();
    if (this.lbT > 0) {                                                 // cinematic bars + title card
      this.lbT -= dt;
      const k = clamp(Math.min((2.8 - this.lbT) / 0.35, this.lbT / 0.35), 0, 1), h = Math.round(64 * k);
      lg.fillStyle(0x000000, 1); lg.fillRect(0, 0, VIEW_W, h); lg.fillRect(0, VIEW_H - h, VIEW_W, h);
      const ta = clamp(Math.min((2.8 - this.lbT - 0.3) / 0.3, this.lbT / 0.4), 0, 1);
      this.lbTitle.setVisible(ta > 0).setAlpha(ta).setScale(8 + (1 - ta) * 3); this.lbSub.setVisible(ta > 0).setAlpha(ta);
    } else { this.lbTitle.setVisible(false); this.lbSub.setVisible(false); }
    const gs = this.scene.get('Game'), b = gs && gs.boss;
    if (b && b.alive && this.lbT < 2.2) {                                // boss health bar: polBossBar fills it in, holds a chip trail, flashes and marks the phases
      this.polBossBar(b, clamp(b.hp / b.def.hp, 0, 1), dt);
      this.bossName.setVisible(true);
    } else { this.bossName.setVisible(false); this.polBossRef = null; }
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
    if (this.rArmF > 0) {                                               // mid-run R: backing for the confirm prompt and its shrinking window
      g.fillStyle(0x06070a, 0.85); g.fillRect(322, 56, 316, 22);
      g.fillStyle(0xffb347, 1); g.fillRect(322, 76, Math.round(316 * this.rArmF), 2);
    }
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
    const dk = this.dashK;                                              // dash meter under the health bar
    g.fillStyle(0x1a1d22, 1); g.fillRect(26, 65, 278, 4);
    g.fillStyle(dk >= 1 ? 0x46e6ff : 0x2a6a80, 1); g.fillRect(26, 65, Math.round(278 * dk), 4);
    if (dk >= 1) { g.fillStyle(0xffffff, 0.35); g.fillRect(26, 65, 278, 1); }
    {                                                                   // the weapon ribbon: slides the shortest way round
      const slots = this.scene.get('Game').weaponSlots || ALL_WEAPON_SLOTS, N = slots.length;
      const rdt = Math.min(this.game.loop.delta, 50) / 1000;
      let dR = Math.max(0, slots.indexOf(this.weapon)) - this.ribPos; dR -= Math.round(dR / N) * N;
      this.ribPos = (((this.ribPos + dR * Math.min(1, rdt * 16)) % N) + N) % N; this.ribPop = Math.max(0, this.ribPop - rdt * 5);
      this.slotIcons.forEach(o => o.setVisible(false));
      this.slotKeys.forEach(o => o.setVisible(false));
      for (const [k, i] of slots.entries()) {
        let d = k - this.ribPos; d -= Math.round(d / N) * N;
        if (N <= 9) d = k - 4;
        const ic = this.slotIcons[i], kl = this.slotKeys[i], ad = Math.abs(d);
        if (ad > 4.6) continue;
        const x = Math.round(14 + (4 + d) * 34), y = 82, sel = i === this.weapon, fade = clamp((4.6 - ad) * 1.4, 0, 1), lock = this.lockedIds.includes(i);
        g.fillStyle(sel ? 0x2a1806 : 0x06070a, (sel ? 0.9 : 0.6) * fade); g.fillRect(x, y, 32, 46);
        g.lineStyle(2, sel ? 0xff8a1f : 0x2a2f37, fade); g.strokeRect(x + 1, y + 1, 30, 44);
        ic.setTint(masteryStars(WEAPONS[i].id) >= 3 ? 0xffe080 : 0xffffff);   // mastered guns show gold
        ic.setVisible(true).setPosition(x + 16, y + 28).setAlpha((lock ? 0.15 : sel ? 1 : 0.45) * fade).setScale(ic.baseS * (sel ? 1 + 0.35 * this.ribPop : 1));
        kl.setVisible(true).setPosition(x + 3, y + 3).setAlpha(fade * (sel ? 1 : 0.7));
      }
    }
    panel(756, 10, 190, 76);
    if (this.styleA > 0.02) {                                           // progress toward the next style rank
      g.fillStyle(0x06070a, 0.7 * this.styleA); g.fillRect(850, 190, 94, 6);
      g.fillStyle(Phaser.Display.Color.HexStringToColor(STYLE_RANKS[Math.max(0, this.shownRank)].c).color, this.styleA); g.fillRect(851, 191, Math.round(92 * (this.styleFrac || 0)), 4);
    }
    if (this.rampA > 0 && !this.overOn) { g.fillStyle(0x06070a, 0.7); g.fillRect(850, 226, 94, 6); g.fillStyle(0xff7a2a, 1); g.fillRect(851, 227, Math.round(92 * this.rampA / TUNE.RAMPAGE.time), 4); }
    g.fillStyle(0x000000, 0.55 * this.hint1.alpha); g.fillRect(0, 494, VIEW_W, 38);   // backing strip for the control hints
    const fg = this.flashG; fg.clear();
    let red = this.hurtA * 0.6;
    if (this.hp > 0 && this.hp <= 30) red = Math.max(red, 0.16 + 0.34 * this.polBeat);   // throbs with the heartbeat (expansion: polish)
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
    if (this.rampA > 0) edge(0xff6a10, 0.22 + 0.1 * Math.sin(time / 90));
    if (this.flashA > 0.01) { fg.fillStyle(0xfff2d8, this.flashA); fg.fillRect(0, 0, VIEW_W, VIEW_H); }
  }
  // ---- expansion: polish ----
  // HUD juice: the crosshair blooms with recoil and twists on a kill, the low-health edge throbs with the heartbeat,
  // the health readout punches when it changes, a weapon swap slides its name in and glints its slot, the boss bar
  // fills in, holds a chip trail and jolts on big hits, wave cards catch a sweep of light, a picked perk card flashes,
  // and the results grade lands with a ring. Cosmetic only: it reads the game scene and draws from fxRandom, never
  // Math.random, since this scene runs inside the seeded campaigns too.
  polInit() {
    this.polG = this.add.graphics().setDepth(4.7).setBlendMode(ADD);   // light sweeps: the wave card, the weapon slot
    this.polTop = this.add.graphics().setDepth(9.5).setBlendMode(ADD); // over the results and the perk cards: the grade ring, the pick flash
    this.polHp = this.hp; this.polHpK = 0; this.polHpHeal = false; this.polBeat = 0; this.polHeartT = 0; this.polDub = -1;
    this.polW = this.weapon; this.polWT = 1; this.polBloom = 0; this.polXTint = -1; this.polGrade = false; this.polGradeT = 1;
    this.polPerkOn = false; this.polPickT = 1; this.polPickX = 0; this.polPickY = 0; this.polBossRef = null; this.polPOn = false;
    this.polNotchTab = { boss: [0.66, 0.33, 0.15], foreman: [0.6, 0.25], gunship: [0.5, 0.25] };   // where each boss changes phase; a new boss can set barNotches on its record
  }
  polSlideY(y) {                                                       // drawPause: the highlight bar glides to the pick
    const rdt = Math.min(this.game.loop.delta, 50) / 1000;
    this.polPY = this.polPOn ? this.polPY + (y - this.polPY) * Math.min(1, rdt * 22) : y; this.polPOn = true;
    return Math.round(this.polPY);
  }
  polBossBar(b, frac, dt) {                                            // drawBoss, every frame a boss is up
    const g = this.g, x = 336, y = 18, w = 408, notches = b.def.barNotches || this.polNotchTab[b.kind] || [];
    if (this.polBossRef !== b) { this.polBossRef = b; this.polBossIn = 0; this.polBossF = frac; this.bossDisp = frac; this.polChip = 0; this.polBossHit = 0; this.polJolt = 0; this.polNotch = notches.map(n => frac <= n ? 0 : -1); }
    this.polBossIn = Math.min(1, this.polBossIn + dt / 0.8);
    if (frac < this.polBossF - 1e-4) { this.polChip = 0.5; this.polBossHit = 0.1; this.polJolt = Math.min(0.35, this.polJolt + (this.polBossF - frac) * 8); }   // a hit: hold the trail, flash, jolt by the chunk lost
    this.polBossF = frac;
    if (this.polChip > 0) this.polChip -= dt; else this.bossDisp = Math.max(frac, this.bossDisp - dt * 0.7);   // the chip trail waits, then drains
    if (this.bossDisp < frac) this.bossDisp = frac;
    this.polBossHit = Math.max(0, this.polBossHit - dt); this.polJolt = Math.max(0, this.polJolt - dt);
    const fill = 1 - Math.pow(1 - this.polBossIn, 3), jx = this.polJolt > 0 ? Math.round(crand(-3, 3) * this.polJolt * 3) : 0, jy = this.polJolt > 0 ? Math.round(crand(-1, 1) * this.polJolt * 3) : 0;
    const X = x + jx, Y = y + jy, shown = Math.round(w * Math.min(frac, fill)), trail = Math.round(w * Math.min(this.bossDisp, fill)), low = frac < 0.25;
    g.fillStyle(0x06070a, 0.85); g.fillRect(X - 4, Y - 4, w + 8, 22);
    if (low) { g.lineStyle(2, 0xff2a2a, 0.3 + 0.4 * (0.5 + 0.5 * Math.sin(this.time.now / 90))); g.strokeRect(X - 5, Y - 5, w + 10, 24); }   // nearly down: the frame pulses red
    g.fillStyle(0x3a2010, 1); g.fillRect(X, Y, Math.round(w * fill), 14);
    g.fillStyle(this.polChip > 0 ? 0xffffff : 0xffd0a0, 0.9); g.fillRect(X, Y, trail, 14);
    g.fillStyle(frac > 0.66 ? 0xff8a20 : frac > 0.33 ? 0xff5a20 : 0xff2a2a, 1); g.fillRect(X, Y, shown, 14);
    g.fillStyle(0xffffff, 0.3); g.fillRect(X, Y, shown, 3);
    if (this.polBossHit > 0) { g.fillStyle(0xffffff, this.polBossHit * (OPTS.flash ? 5 : 2)); g.fillRect(X, Y, shown, 14); }
    if (this.polBossIn < 1) { g.fillStyle(0xffffff, 0.9); g.fillRect(X + Math.round(w * fill) - 2, Y - 2, 3, 18); }   // filling in: a bright leading edge
    notches.forEach((n, i) => {
      const nx = X + Math.round(w * n), gone = frac <= n;
      if (this.polNotch[i] < 0 && gone) this.polNotch[i] = 0.6;         // a phase line just broke
      const f = this.polNotch[i] > 0 ? (this.polNotch[i] = Math.max(0, this.polNotch[i] - dt)) / 0.6 : 0;
      g.fillStyle(gone ? 0x2a1206 : 0x000000, 1); g.fillRect(nx, Y, 2, 14);
      if (f > 0) { g.fillStyle(0xffe46a, f); g.fillRect(nx - 1, Y - 2 - Math.round(6 * f), 4, 18 + Math.round(12 * f)); g.fillStyle(0xffffff, f * 0.5); g.fillRect(nx - 10 * f, Y + 6, 2 + 20 * f, 2); }
    });
  }
  polUpdate(time, dt, gs) {                                            // update(), last thing every frame
    const live = !!(gs && gs.sys.isActive()), pg = this.polG, tg = this.polTop; pg.clear(); tg.clear();
    if (!this.pauseOn) this.polPOn = false;
    // health readout: punches on a hit, swells on a heal, and beats with the heart below 30
    if (this.hp !== this.polHp) { this.polHpHeal = this.hp > this.polHp; this.polHpK = this.polHpHeal ? 0.6 : 1; this.polHp = this.hp; }
    this.polHpK = Math.max(0, this.polHpK - dt * 5);
    if (live && this.hp > 0 && this.hp <= 30) { if (gs.heartT > this.polHeartT + 0.05) { this.polBeat = 1; this.polDub = 0.17; } this.polHeartT = gs.heartT; }   // the game resets heartT on each beat
    if (this.polDub >= 0 && (this.polDub -= dt) < 0) this.polBeat = Math.max(this.polBeat, 0.7);   // lub... dub
    this.polBeat = Math.max(0, this.polBeat - dt * 4.5);
    const hk = this.polHpK * this.polHpK;
    this.lblHp.setScale(3 * (1 + 0.28 * hk + 0.1 * this.polBeat)).setY(16 + (this.polHpHeal || !hk ? 0 : Math.round(crand(-2, 2) * hk)));
    // crosshair: blooms with the gun's recoil, twists and goes red on a kill
    if (live && this.xhair.visible) {
      const r = clamp((gs.recoil || 0) / 6, 0, 1), kk = this.hmT > 0 && this.hmKill ? this.hmT / 0.32 : 0;
      this.polBloom += (r - this.polBloom) * Math.min(1, dt * (r > this.polBloom ? 40 : 10));
      this.xhair.setScale(2 * (1 + 0.35 * this.polBloom + 0.3 * kk)).setRotation(kk * Math.PI / 4);
      const tint = kk > 0 ? 0xff7a60 : 0xffffff; if (tint !== this.polXTint) { this.polXTint = tint; if (tint === 0xffffff) this.xhair.clearTint(); else this.xhair.setTint(tint); }
    }
    // weapon swap: the name slides in and a glint crosses the slot in hand
    if (this.weapon !== this.polW) { this.polW = this.weapon; this.polWT = 0; }
    if (this.polWT < 1) {
      this.polWT = Math.min(1, this.polWT + dt / 0.28);
      this.lblWeapon.setX(26 - Math.round(Math.pow(1 - this.polWT, 3) * 16));
      const slots = (live && gs.weaponSlots) || ALL_WEAPON_SLOTS, N = slots.length, k = slots.indexOf(this.weapon);
      if (k >= 0 && !this.overOn) {
        const sx = 14 + (4 + (N <= 9 ? k - 4 : 0)) * 34, gx = sx - 8 + this.polWT * 48, a = 0.5 * (1 - this.polWT), c = v => clamp(v, sx + 2, sx + 30);
        pg.fillStyle(0xffffff, a); pg.fillTriangle(c(gx), 84, c(gx + 6), 84, c(gx - 8), 126); pg.fillTriangle(c(gx + 6), 84, c(gx - 2), 126, c(gx - 8), 126);
      }
    }
    // wave card: a sweep of light crosses the band, and sparks ride the ends of its rules as they draw out
    if (this.wcT > 0 && this.wcTitle.visible) {
      const age = this.wcDur - this.wcT, kin = clamp(age / 0.25, 0, 1), kout = clamp(this.wcT / 0.3, 0, 1), e = 1 - Math.pow(1 - Math.min(kin, kout), 3), h = Math.round(92 * e), y0 = 262 - h / 2;
      if (kin < 1) for (let s = -1; s <= 1; s += 2) { const sx = 480 + s * 480 * e, a = 1 - kin; pg.fillStyle(0xffe8b0, 0.9 * a); pg.fillRect(sx - 6, y0 - 1, 12, 4); pg.fillRect(sx - 6, y0 + h - 3, 12, 4); pg.fillStyle(0xff8a1f, 0.5 * a); pg.fillRect(sx - 1, y0 - 6, 3, 14); pg.fillRect(sx - 1, y0 + h - 8, 3, 14); }
      const p = (age - 0.2) / 0.7;
      if (p > 0 && p < 1 && h > 8) { const bx = -120 + p * 1200; pg.fillStyle(0xfff0d0, 0.2 * Math.sin(Math.PI * p)); pg.fillTriangle(bx, y0, bx + 70, y0, bx + 40, y0 + h); pg.fillTriangle(bx, y0, bx + 40, y0 + h, bx - 30, y0 + h); }
    }
    // perk draft: the picked card flashes as the draft closes
    if (this.perkOn) { this.polPerkOn = true; this.polPickX = 160 + this.perkSel * 220; this.polPickY = 200 - Math.round(this.polLift ? this.polLift[this.perkSel] || 0 : 0); }
    else if (this.polPerkOn) { this.polPerkOn = false; if (!this.pauseOn && live && gs.state === 'play') this.polPickT = 0; }
    if (this.polPickT < 1) {
      this.polPickT = Math.min(1, this.polPickT + dt / 0.35);
      const a = 1 - this.polPickT, gr = Math.round(this.polPickT * 14);
      tg.fillStyle(0xffd890, 0.5 * a * a * a * (OPTS.flash ? 1 : 0.4)); tg.fillRect(this.polPickX, this.polPickY, 200, 140);
      tg.lineStyle(2, 0xffb347, a); tg.strokeRect(this.polPickX - gr, this.polPickY - gr, 200 + gr * 2, 140 + gr * 2);
    }
    // results: the grade stamps in with a ring and a spray of sparks
    if (!this.overOn) this.polGrade = false;
    else if (this.ovGradeShown && !this.polGrade) { this.polGrade = true; this.polGradeT = 0; }
    if (this.polGradeT < 1) {
      this.polGradeT = Math.min(1, this.polGradeT + dt / 0.55);
      const e = 1 - Math.pow(1 - this.polGradeT, 3), a = 1 - this.polGradeT, col = { S: 0xffd040, A: 0x5cff7a, B: 0x5cc8ff, C: 0xc6ced8, D: 0xff6a4a }[this.ovData && this.ovData.grade] || 0xffd040;
      tg.lineStyle(3, col, a); tg.strokeCircle(822, 270, 24 + 84 * e); tg.lineStyle(1, 0xffffff, a * 0.8); tg.strokeCircle(822, 270, 12 + 60 * e);
      tg.fillStyle(col, a); for (let i = 0; i < 12; i++) { const an = i / 12 * Math.PI * 2 + 0.26, r = 30 + 78 * e; tg.fillRect(Math.round(822 + Math.cos(an) * r) - 2, Math.round(270 + Math.sin(an) * r) - 2, 4, 4); }
    }
  }
}

