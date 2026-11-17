// =============================================================================
//  SCENES
// =============================================================================
class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() { genTextures(this); this.scene.start('Title'); }
}

// -----------------------------------------------------------------------------
class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }
  create() {
    this.started = false;
    this.input.setDefaultCursor('default');
    // title theme: plays at once if the browser already allows audio, otherwise from the first key / click
    document.getElementById('boot')?.remove();                          // the static loading screen gives way to the title
    Sfx.init(); Music.start(); Music.track('title'); Music.keep(Music.TITLE_SET);
    this.input.keyboard.on('keydown', () => Sfx.init());
    const far = this.add.image(0, -40, 'bgFar').setOrigin(0).setScale(2);
    const mid = this.add.image(0, -60, 'bgMid').setOrigin(0).setScale(2);
    this.tweens.add({ targets: far, x: VIEW_W - far.displayWidth, duration: 90000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: mid, x: VIEW_W - mid.displayWidth, duration: 90000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.5); g.fillRect(0, 0, VIEW_W, VIEW_H);
    g.fillStyle(0x22262d, 1); g.fillRect(0, 384, VIEW_W, 156);
    g.fillStyle(0x7f8b99, 1); g.fillRect(0, 384, VIEW_W, 4); g.fillStyle(0x5a6574, 1); g.fillRect(0, 388, VIEW_W, 4); g.fillStyle(0x3d4550, 1); g.fillRect(0, 392, VIEW_W, 4);
    for (let x = 0; x < VIEW_W; x += 16) { g.fillStyle((x / 16) % 2 ? 0x16171a : 0xb8931f, 1); g.fillRect(x, 396, 16, 6); }
    g.fillStyle(0x15181d, 1); g.fillRect(0, 402, VIEW_W, 138);
    this.add.image(480, 340, 'glow').setBlendMode(ADD).setTint(0xff6a20).setScale(16, 5).setAlpha(0.3);
    // character line-up
    const base = 384;
    this.add.sprite(200, base, 'player', 'idle0').setOrigin(0.5, 1).setScale(4);
    this.add.image(200, base - 56, 'gun_shotgun').setOrigin(2 / 26, 5.5 / 11).setScale(4).setRotation(-0.12);
    this.add.image(200 + 12, base - 76, 'glow').setBlendMode(ADD).setTint(0x46e6ff).setScale(1.2).setAlpha(0.5);
    this.add.sprite(370, base, 'stalker', 'crouch').setOrigin(0.5, 1).setScale(4).setFlipX(true);
    this.add.image(362, base - 62, 'glow').setBlendMode(ADD).setTint(0x7dff4a).setScale(1.1).setAlpha(0.7);
    this.add.sprite(520, base, 'enforcer', 'idle0').setOrigin(0.5, 1).setScale(4).setFlipX(true);
    this.add.image(516, base - 56, 'gun_rifle').setOrigin(2 / 24, 5.5 / 11).setScale(4, -4).setRotation(Math.PI + 0.08);
    this.add.image(506, base - 74, 'glow').setBlendMode(ADD).setTint(0xff3020).setScale(1).setAlpha(0.7);
    this.add.sprite(640, base, 'grunt', 'c1').setOrigin(0.5, 1).setScale(4).setFlipX(true);
    this.add.sprite(760, base, 'heavy', 'wind').setOrigin(0.5, 1).setScale(4).setFlipX(true);
    this.add.image(760, base - 62, 'glow').setBlendMode(ADD).setTint(0xff7a1a).setScale(3).setAlpha(0.55);
    const dr = this.add.sprite(880, 280, 'drone', 'd0').setScale(4).setFlipX(true);
    const de = this.add.image(868, 280, 'glow').setBlendMode(ADD).setTint(0xff3020).setScale(1.6).setAlpha(0.7);
    this.tweens.add({ targets: [dr, de], y: 296, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // text
    new PixelLabel(this, 480, 84, 'title_logo', { text: 'SLAGHOUSE', scale: 10, rows: LOGO_ROWS, shadow: '#000000', originY: 0.5 });
    new PixelLabel(this, 480, 150, 'title_sub',{ text: CAMPAIGN_ACTS.map(a => a.name).join(' > '), scale: 2, color: '#ff8a1f', shadow: '#000000', originY: 0.5 });   // every act, from the act table
    let best = loadRec(RUN_MODES.campaign.record);
    const medN = loadMedals().length;
    if (best || medN) new PixelLabel(this, 480, 172, 'title_best', { text: (best ? 'BEST RUN  ' + best.grade + '  ' + best.score + (best.diff ? '  ' + best.diff : '') + mutTag(best) + '    ' : '') + 'MEDALS ' + medN + '/' + MEDALS.length, scale: 2, color: '#ffe14a', shadow: '#000000', originY: 0.5 });
    let otb = loadRec(RUN_MODES.endless.record);
    if (otb) new PixelLabel(this, 480, 190, 'title_otbest', { text: 'OVERTIME BEST  WAVE ' + otb.wave + '  ' + otb.score + mutTag(otb), scale: 2, color: '#c8a0ff', shadow: '#000000', originY: 0.5 });
    this.buildMenu();
    new PixelLabel(this, 480, 128, 'title_tag',{ text: 'NAILS. SHELLS. GRENADES. ROCKETS. MEAT.', scale: 2, color: '#c6ced8', shadow: '#000000', originY: 0.5 });
    // difficulty: A/D or the arrows (or click the arrows) before starting; remembered between visits
    const DCOL = ['#5cff7a', '#ffb347', '#ff4a3a'], DSUB = ['THEY HIT SOFTER. YOU LAST LONGER.', 'AS THE FOUNDRY INTENDED.', 'MORE PAIN. TOUGHER MEAT. x1.5 SCORE.'];
    new PixelLabel(this, 480, 214, 'title_dlbl', { text: 'DIFFICULTY', scale: 2, color: '#8f9bab', shadow: '#000000', originY: 0.5 });
    const dl = new PixelLabel(this, 480, 238, 'title_diff', { maxChars: 12, scale: 3, color: '#ffb347', shadow: '#000000', originY: 0.5 });
    const ds = new PixelLabel(this, 480, 262, 'title_dsub', { maxChars: 40, scale: 2, color: '#c6ced8', shadow: '#000000', originY: 0.5 });
    const showDiff = () => { dl.setText('<  ' + DIFFS[OPTS.diff].name + '  >').setStyle({ color: DCOL[OPTS.diff] }); ds.setText(DSUB[OPTS.diff]); };
    const stepDiff = d => { if (this.started) return; OPTS.diff = (OPTS.diff + d + 3) % 3; saveOpt('diff'); Sfx.init(); Sfx.swap(); showDiff(); this.tweens.add({ targets: dl, scale: { from: 3.5, to: 3 }, duration: 160 }); };
    showDiff();
    this.stepDiff = stepDiff;
    this.mutLbl = new PixelLabel(this, 480, 282, 'title_mut', { maxChars: 30, scale: 2, color: '#c8a0ff', shadow: '#000000', originY: 0.5 }).setText(OPTS.mut ? 'MUTATOR: ' + MUTATORS[OPTS.mut].name : '');
    this.fx = new FX(this, 300, 5);
    this.touchGate = touchOnly() && !PAD.on;                              // cleared by the first key press or pad input
    this.touchNote = new PixelLabel(this, 480, 22, 'title_touch', { text: 'SLAGHOUSE NEEDS A KEYBOARD AND MOUSE OR A GAMEPAD', scale: 2, color: '#ff8a5a', shadow: '#000000', originY: 0.5 }).setDepth(30).setVisible(this.touchGate);
    this.rotateNote = new PixelLabel(this, 480, 40, 'title_rotate', { text: 'TURN YOUR DEVICE SIDEWAYS FOR A BIGGER VIEW', scale: 1.5, color: '#ffb347', shadow: '#000000', originY: 0.5 }).setDepth(30).setVisible(false);
    this.coarse = touchOnly();
    if (this.input.mouse) this.input.mouse.disableContextMenu();          // right click backs out of a page
    const start = (checkpoint = null, runId = null) => {
      if (this.started) return;
      if (this.touchGate) { this.wantEndless = this.wantDaily = this.wantRush = false; this.nudgeTouch(); return; }   // held: forget the pick so a later one starts what it says
      RUNMODE = this.wantDaily ? 'daily' : this.wantEndless ? 'endless' : this.wantRush ? 'bossrush' : 'campaign'; this.wantEndless = false; this.wantDaily = false; this.wantRush = false;
      this.started = true;
      Sfx.init(); Sfx.startHum(); Sfx.ui(); Music.start();
      this.cameras.main.fadeOut(240, 0, 0, 0);
      const mode = RUN_MODES[RUNMODE], day = mode.dated ? dayKey() : null;   // read once, when DAILY is picked: the whole run plays this day
      const data = { arena: checkpoint?.arena ?? mode.startArena(day), carry: checkpoint, retry: !!checkpoint, runId, day };
      this.time.delayedCall(260, () => { this.scene.start('Game', data); this.scene.launch('Hud'); });
    };
    this.startRun = start;
    this.input.keyboard.on('keydown', ev => (this.sub === 'keys' && this.keysKey(ev)) || this.onTitleKey(ev.keyCode));
    this.input.on('pointermove', p => this.onTitlePointer(p, false));
    this.input.on('pointerdown', p => { Sfx.init(); this.onTitlePointer(p, true); });
    this.input.on('wheel', (p, over, dx, dy) => this.onTitleWheel(dy));
    if (LAB_PANEL.initialRoom) {
      this.menuSel = this.menuItems.length - 1;
      const room = LAB_PANEL.initialRoom;
      this.time.delayedCall(0, () => LAB_PANEL.open(room));
      LAB_PANEL.initialRoom = null;
    }
  }
  // ---- codex round: the title menu and its pages ----
  buildMenu() {
    const sh = '#000000';
    this.menuSel = 0; this.sub = null; this.subSel = 0;
    this.menuG = this.add.graphics().setDepth(5);
    // play modes on the left, the extras on the right; W/S walks down the left column, then the right
    this.menuItems = ['CAMPAIGN', 'OVERTIME', 'DAILY', 'BOSS RUSH', 'CODEX', 'ARMORY', 'MEDALS', 'OPTIONS', 'LAB'].map((t, i) =>
      new PixelLabel(this, i < 4 ? 300 : 660, 420 + (i < 4 ? i : i - 4) * 22, 'title_m' + i, { text: t, scale: 2, color: '#8f9bab', shadow: sh, originY: 0.5 }).setDepth(6));
    const tag = (row, key, text, color) => new PixelLabel(this, row.x + row.displayWidth / 2 + 28, row.y, key, { text, align: 'left', scale: 1.5, color, shadow: sh, originY: 0.5 }).setDepth(6);
    let dly = loadRec(RUN_MODES.daily.record);
    let rsh = loadRec(RUN_MODES.bossrush.record);
    if (rsh && rsh.won) tag(this.menuItems[3], 'title_rsh', 'CLEARED ' + rsh.grade + mutTag(rsh), '#ffb347');
    if (dly && dly.date === dayKey()) tag(this.menuItems[2], 'title_dly', 'TODAY W' + dly.wave, '#c8a0ff');
    this.menuHint = new PixelLabel(this, 480, 530, 'title_mhint', { maxChars: 72, text: this.menuHintText(), scale: 1.5, color: '#8f9bab', shadow: sh, originY: 0.5 }).setDepth(6);
    this.subG = this.add.graphics().setDepth(20);
    this.subTitle = new PixelLabel(this, 480, 64, 'title_subt', { maxChars: 10, scale: 4, rows: CALL_ROWS, shadow: sh, originY: 0.5 }).setDepth(21);
    this.subHint = new PixelLabel(this, 480, 514, 'title_subh', { maxChars: 56, scale: 2, color: '#6a7380', shadow: sh, originY: 0.5 }).setDepth(21);
    this.subBack = new PixelLabel(this, 52, 64, 'title_subback', { text: '< BACK', align: 'left', scale: 2, color: '#8f9bab', shadow: sh, originY: 0.5 }).setDepth(21);   // the click target for leaving a page
    this.ctlLines = CONTROL_LINES.map(([t, c], i) => new PixelLabel(this, 480, 124 + i * 30, 'title_ctl' + i, { maxChars: 80, text: t, scale: 1.75, color: c || '#c6ced8', shadow: sh, originY: 0.5 }).setDepth(21));   // the pause menu's CONTROLS page
    this.codexImgs = CODEX.map(([kind, name, fr], i) => {                 // 66 to a page (11 x 6)
      const D = ENEMY[kind], j = i % 66, col = j % 11, row = Math.floor(j / 11), sc = Math.min(2, 38 / D.fh, 60 / D.fw);
      const img = this.add.image(480 + (col - 5) * 72, 126 + row * 54, D.key, fr).setScale(sc).setDepth(21);
      img.page = Math.floor(i / 66);
      if (!SEEN.has(kind)) { img.setTint(0x2a2e35); if (img.setTintMode && Phaser.TintModes) img.setTintMode(Phaser.TintModes.FILL); } else if (kind === 'echo') img.setTint(0x70e8ff);   // unmet: a flat grey silhouette
      return img;
    });
    this.codexName = new PixelLabel(this, 480, 438, 'title_cxn', { maxChars: 20, scale: 3, color: '#ffb347', shadow: sh, originY: 0.5 }).setDepth(21);
    this.codexDesc = new PixelLabel(this, 480, 470, 'title_cxd', { maxChars: 64, scale: 2, color: '#d8dee6', shadow: sh, originY: 0.5 }).setDepth(21);
    this.codexCount = new PixelLabel(this, 480, 88, 'title_cxc', { maxChars: 24, scale: 2, color: '#8f9bab', shadow: sh, originY: 0.5 }).setDepth(21);
    const got = loadMedals(), medalRowH = Math.min(44, Math.floor(396 / Math.ceil(MEDALS.length / 3)));   // rows close up as medals are added, clear of the hint line
    this.medalRows = MEDALS.map((m, i) => {
      const x = 52 + (i % 3) * 300, y = 116 + Math.floor(i / 3) * medalRowH, on = got.includes(m.id);
      return { x, y, on,
        name: new PixelLabel(this, x + 26, y - 6, 'title_mn' + i, { text: m.name, align: 'left', scale: 2, color: on ? '#ffd040' : '#5a636e', shadow: sh }).setDepth(21),
        desc: new PixelLabel(this, x + 26, y + 12, 'title_md' + i, { text: m.d, align: 'left', scale: 1, color: on ? '#e8ecf0' : '#8f9bab' }).setDepth(21) };
    });
    this.medalCount = new PixelLabel(this, 480, 96, 'title_mc', { text: 'COLLECTED ' + got.length + '/' + MEDALS.length, scale: 2, color: '#8f9bab', shadow: sh, originY: 0.5 }).setDepth(21);
    this.armImgs = WEAPONS.map((w, i) => this.add.image(480 + (i % 13 - 6) * 66, 124 + Math.floor(i / 13) * 56, 'icon_' + w.gun).setScale(Math.min(2, 52 / GUNS[w.gun].w)).setDepth(21));   // every gun, 13 to a row
    this.armName = new PixelLabel(this, 480, 404, 'title_arn', { maxChars: 20, scale: 3, color: '#ffb347', shadow: sh, originY: 0.5 }).setDepth(21);
    this.armDesc = new PixelLabel(this, 480, 436, 'title_ard', { maxChars: 40, scale: 2, color: '#d8dee6', shadow: sh, originY: 0.5 }).setDepth(21);
    this.armStat = new PixelLabel(this, 480, 464, 'title_ars', { maxChars: 52, scale: 2, color: '#8f9bab', shadow: sh, originY: 0.5 }).setDepth(21);
    this.armLife = new PixelLabel(this, 480, 490, 'title_arl', { maxChars: 60, scale: 1, color: '#c8a0ff', originY: 0.5 }).setDepth(21);
    this.armCount = new PixelLabel(this, 480, 96, 'title_arc', { maxChars: 28, scale: 2, color: '#8f9bab', shadow: sh, originY: 0.5 }).setDepth(21);
    this.mutDesc = new PixelLabel(this, 480, 482, 'title_mutd', { maxChars: 44, scale: 2, color: '#c8a0ff', shadow: sh, originY: 0.5 }).setDepth(21);
    this.optLbls = OPTION_ITEMS.map(({ id }, i) => new PixelLabel(this, 480, 124 + i * 34, 'title_op_' + id, { maxChars: 28, scale: 3, color: '#c6ced8', shadow: sh, originY: 0.5 }).setDepth(21));
    this.keyRows = [...BIND_ROWS, ['reset', 'RESET ALL TO DEFAULTS'], ['back', 'BACK']];
    this.keyLbls = Array.from({ length: 12 }, (_, j) => new PixelLabel(this, 480, 106 + j * 29, 'title_key' + j, { maxChars: 44, scale: 2.5, color: '#8f9bab', shadow: sh, originY: 0.5 }).setDepth(21));
    this.keyNote = new PixelLabel(this, 480, 470, 'title_keyn', { maxChars: 64, scale: 1.75, color: '#ffb347', shadow: sh, originY: 0.5 }).setDepth(21);
    this.campaignCards = CAMPAIGN_ACTS.map((act, i) => {
      const x = 136 + i * 172, text = (y, key, opts) => new PixelLabel(this, x, y, 'title_route_' + key + i, opts).setDepth(21);
      return {
        x,
        act: text(160, 'act', { text: 'ACT 0' + (i + 1), scale: 2, color: '#9aa6b4' }),
        title: text(188, 'name', { text: act.name, scale: act.name.length > 12 ? 1.75 : 2, color: '#' + act.color.toString(16) }),
        first: text(218, 'first', { text: CAMPAIGN[act.first].name, scale: 1, color: '#d8dee6' }),
        last: text(234, 'last', { text: CAMPAIGN[act.last].name, scale: 1, color: '#d8dee6' }),
        status: text(255, 'status', { maxChars: 14, scale: 2, color: '#9aa6b4' }),
      };
    });
    this.campaignJob = new PixelLabel(this, 480, 305, 'title_route_job', { maxChars: 46, scale: 2, color: '#d8dee6' }).setDepth(21);
    this.campaignSettings = new PixelLabel(this, 480, 330, 'title_route_settings', { maxChars: 48, scale: 1, color: '#9aa6b4' }).setDepth(21);
    this.campaignButtons = ['CONTINUE', 'NEW CAMPAIGN'].map((text, i) =>
      new PixelLabel(this, 346 + 268 * i, 397, 'title_route_pick' + i, { text, scale: 3, originY: 0.5 }).setDepth(21));
    this.campaignNote = new PixelLabel(this, 480, 451, 'title_route_note', { maxChars: 58, scale: 1.5, color: '#ffb347' }).setDepth(21);
    this.showSub(null);
  }
  showSub(name) {
    this.sub = name; this.subSel = 0;
    const cx = name === 'codex', md = name === 'medals', op = name === 'options', ar = name === 'armory', ct = name === 'controls', ky = name === 'keys';
    this.capture = null;
    this.keyLbls.forEach(o => o.setVisible(ky)); this.keyNote.setVisible(ky).setText('');
    if (ct) CONTROL_LINES.forEach(([t], i) => this.ctlLines[i]?.setText(t));
    const cp = name === 'campaign';
    this.subTitle.setVisible(!!name).setText(cp ? 'CAMPAIGN' : cx ? 'CODEX' : md ? 'MEDALS' : op ? 'OPTIONS' : ar ? 'ARMORY' : ct ? 'CONTROLS' : ky ? 'KEYS' : '');
    this.subBack.setVisible(!!name); this.ctlLines.forEach(o => o.setVisible(ct));
    for (const { act, title, first, last, status } of this.campaignCards) [act, title, first, last, status].forEach(o => o.setVisible(cp));
    [this.campaignJob, this.campaignSettings, this.campaignNote, ...this.campaignButtons].forEach(o => o.setVisible(cp));
    if (cp) {
      this.routeSave = loadCampaign();
      this.checkpoint = campaignCheckpoint(this.routeSave);
      this.subSel = this.checkpoint ? 0 : 1;
    }
    this.armImgs.forEach((o, i) => o.setVisible(ar).setTint(masteryStars(WEAPONS[i].id) >= 3 ? 0xffe080 : 0xffffff));
    if (this.armLife) { const h = Math.floor(LIFE.time / 3600), m = Math.floor(LIFE.time / 60) % 60; this.armLife.setVisible(ar).setText('LIFETIME  KILLS ' + LIFE.kills + '   RUNS ' + LIFE.runs + '   DEATHS ' + LIFE.deaths + '   TIME ' + (h ? h + 'H' : '') + m + 'M'); } this.armName.setVisible(ar); this.armDesc.setVisible(ar); this.armStat.setVisible(ar);
    this.armCount.setVisible(ar).setText('STARS ' + WEAPONS.reduce((n, w) => n + masteryStars(w.id), 0) + '/' + WEAPONS.length * 3 + '   GUNS ' + WEAPONS.length);
    this.subHint.setVisible(!!name).setText(ky ? 'W/S CHOOSE   ENTER REBIND   ESC BACK' : cp ? 'A/D CHOOSE   ENTER SELECT   ESC BACK' : cx ? 'ARROWS BROWSE   Q/E OR WHEEL PAGE   ESC BACK' : ar ? 'ARROWS OR WHEEL BROWSE   ESC BACK' : op ? 'W/S CHOOSE   A/D CHANGE   ESC BACK' : 'ESC OR RIGHT CLICK BACK');
    this.codexImgs.forEach(o => o.setVisible(cx)); this.codexName.setVisible(cx); this.codexDesc.setVisible(cx); this.codexCount.setVisible(cx).setText('MET ' + CODEX.filter(c => SEEN.has(c[0])).length + '/' + CODEX.length);
    this.medalRows.forEach(r => { r.name.setVisible(md); r.desc.setVisible(md); }); this.medalCount.setVisible(md);
    this.optLbls.forEach(o => o.setVisible(op)); this.mutDesc.setVisible(op);
    if (this.mutLbl) this.mutLbl.setText(OPTS.mut ? 'MUTATOR: ' + MUTATORS[OPTS.mut].name : '');
    this.menuItems.forEach(o => o.setVisible(!name)); this.menuHint.setVisible(!name);
    if (!name) this.subG.clear();
    this.refreshSub();
  }
  refreshSub() {
    if (this.sub === 'campaign') {
      const cp = this.checkpoint, resume = cp && this.subSel === 0, act = resume ? cp.arena : 0;
      this.campaignCards.forEach(({ status }, i) => {
        const saved = i === cp?.arena;
        const completed = this.routeSave?.cleared && (this.routeSave.revision === CAMPAIGN_REVISION || i < 3);
        const cleared = completed || i < (cp?.arena ?? 0);
        status.setText(saved ? 'CHECKPOINT' : cleared ? 'CLEARED' : i === 0 ? 'START' : 'LOCKED')
          .setStyle({ color: saved ? '#76e8ff' : cleared ? '#5cff7a' : i === act ? '#ffb347' : '#84909f' });
      });
      this.campaignJob.setText(CAMPAIGN_ACTS[act].job);
      const diff = resume ? cp.diff : OPTS.diff, mut = resume ? cp.mut : OPTS.mut;
      this.campaignSettings.setText(DIFFS[diff].name + (mut ? '  /  ' + MUTATORS[mut].name : '') +
        (resume ? '  /  ' + Math.ceil(cp.hp) + ' HP  /  ' + Object.keys(cp.perks).length + ' PERKS' : ''));
      this.campaignNote.setText(resume ? 'RESUME AT THE START OF THIS ACT' : cp ? 'NEW CAMPAIGN REPLACES THE ACTIVE CHECKPOINT' : 'CHECKPOINTS SAVE AT THE START OF ACTS 2-5');
      this.campaignButtons.forEach((o, i) => o.setStyle({ color: i === this.subSel ? '#ffe46a' : i === 0 && !cp ? '#606a76' : '#c6ced8' }));
    } else if (this.sub === 'codex') {
      const [kind, name, , d] = CODEX[this.subSel], seen = SEEN.has(kind), pg = Math.floor(this.subSel / 66), pages = Math.ceil(CODEX.length / 66);
      this.codexImgs.forEach(o => o.setVisible(o.page === pg));
      this.codexCount.setText('MET ' + CODEX.filter(c => SEEN.has(c[0])).length + '/' + CODEX.length + (pages > 1 ? '   PAGE ' + (pg + 1) + '/' + pages : ''));
      this.codexName.setText(seen ? name : '???'); this.codexDesc.setText(seen ? d : 'NOT MET YET');
    } else if (this.sub === 'armory') {
      const w = WEAPONS[this.subSel], k = MASTERY[w.id] || 0, nx = TUNE.MASTERY.find(n => k < n), key = (SLOT_KEYS[this.subSel] || ' ').trim();
      this.armName.setText(w.name); this.armDesc.setText(BLURBS[w.id] || '');
      this.armStat.setText((key ? 'KEY ' + (key === '<' ? 'BKSP' : key) : 'WHEEL') + '   KILLS ' + k + '   ' + (nx ? 'NEXT STAR AT ' + nx : 'MASTERED'));
    } else if (this.sub === 'keys') {
      const N = this.keyRows.length, top = clamp(this.subSel - 5, 0, N - this.keyLbls.length);
      this.keyLbls.forEach((o, j) => {
        const i = top + j, [name, label] = this.keyRows[i], sel = i === this.subSel;
        const keys = BINDS[name] ? BINDS[name].map(keyLabel).join(' / ') : '';
        const text = this.capture === name ? label.padEnd(24) + '...' : keys ? label.padEnd(24) + keys : label;
        o.setText(sel ? '> ' + text : text).setStyle({ color: this.capture === name ? '#76e8ff' : sel ? '#ffe46a' : '#8f9bab' });
      });
    } else if (this.sub === 'options') {
      OPTION_ITEMS.forEach(({ id, label }, i) => this.optLbls[i].setText(i === this.subSel ? '< ' + label() + ' >' : label())
        .setStyle({ color: i === this.subSel ? '#ffe46a' : id === 'mut' && OPTS.mut ? '#c8a0ff' : '#8f9bab' }));
      this.mutDesc.setText(OPTION_ITEMS[this.subSel].id === 'mut' || OPTS.mut ? MUTATORS[OPTS.mut].d : '');
    }
  }
  subKey(a) {
    if (!a) return;
    if (this.sub === 'controls') {                                       // back (or Enter) returns to OPTIONS on the CONTROLS row
      if (a === 'back' || a === 'ok') { Sfx.ui(); this.showSub('options'); this.subSel = OPTION_ITEMS.findIndex(o => o.id === 'controls'); this.refreshSub(); }
      return;
    }
    if (this.sub === 'keys') {
      const N = this.keyRows.length, row = this.keyRows[this.subSel][0];
      if (a === 'back' || (a === 'ok' && row === 'back')) { Sfx.ui(); this.showSub('options'); this.subSel = OPTION_ITEMS.findIndex(o => o.id === 'keys'); this.refreshSub(); return; }
      if (a === 'up' || a === 'down' || a === 'pgup' || a === 'pgdn') {
        const d = { up: -1, down: 1, pgup: -10, pgdn: 10 }[a];
        this.subSel = Math.abs(d) > 1 ? clamp(this.subSel + d, 0, N - 1) : (this.subSel + d + N) % N; Sfx.swap();
      } else if (a === 'ok' && row === 'reset') {
        BINDS = loadBinds.defaults(); this.bindsChanged('ALL KEYS ARE BACK ON THEIR DEFAULTS');
      } else if (a === 'ok') { this.capture = row; this.keyNote.setText('PRESS A KEY FOR ' + bindRow(row) + '   ESC KEEPS ' + BINDS[row].map(keyLabel).join(' / ')); Sfx.ui(); }
      this.refreshSub();
      return;
    }
    if (a === 'back') { Sfx.ui(); this.showSub(null); return; }
    if (this.sub === 'campaign') {
      if (a === 'ok') {
        const runId = this.subSel === 1 ? newRunId() : null;   // a new campaign owns the save from here, so an older tab's run can't replace its checkpoints
        if (runId) {
          const save = loadCampaign();
          writeCampaign({ ...save, checkpoint: null, cleared: !!save?.cleared, owner: runId });
        }
        this.startRun(this.subSel === 0 ? this.checkpoint : null, runId);
      } else if (this.checkpoint && ['left', 'right', 'up', 'down'].includes(a)) {
        this.subSel = 1 - this.subSel; Sfx.swap(); this.refreshSub();
      }
      return;
    }
    if (this.sub === 'codex') {
      const N = CODEX.length, d = { left: -1, right: 1, up: -11, down: 11 }[a];
      if (d) { this.subSel = (this.subSel + d + N) % N; Sfx.swap(); this.refreshSub(); }
      else if (a === 'pgup' || a === 'pgdn') { const n = clamp(this.subSel + (a === 'pgup' ? -66 : 66), 0, N - 1); if (n !== this.subSel) { this.subSel = n; Sfx.swap(); this.refreshSub(); } }
      return;
    }
    if (this.sub === 'armory') {
      const N = WEAPONS.length, d = { left: -1, right: 1, up: -13, down: 13 }[a];
      if (d) { this.subSel = (this.subSel + d + N) % N; Sfx.swap(); this.refreshSub(); }
      return;
    }
    if (this.sub === 'options') {
      const N = OPTION_ITEMS.length;
      if (a === 'up' || a === 'down') { this.subSel = (this.subSel + (a === 'up' ? N - 1 : 1)) % N; Sfx.swap(); }
      else if (a === 'left' || a === 'right' || a === 'ok') {
        const dir = a === 'left' ? -1 : 1, id = OPTION_ITEMS[this.subSel].id;
        if (id === 'diff') this.stepDiff(dir);
        else if (OPTION_ITEMS[this.subSel].step) { const key = OPTION_ITEMS[this.subSel].step; if (key !== 'shake' && Sfx.muted) Sfx.toggleMute(); let v = Math.round(OPTS[key] * 4) + (a === 'ok' ? -1 : dir); if (a === 'ok' && v < 0) v = 4; OPTS[key] = clamp(v, 0, 4) / 4; saveOpt(key); if (key !== 'shake') Sfx.applyVolume(); Sfx.ui(); }
        else if (id === 'postfx') { POSTFX.on = !POSTFX.on; try { localStorage.setItem('slaghouse.postfx', POSTFX.on ? '1' : '0'); } catch (err) { /* private mode */ } Sfx.ui(); }
        else if (id === 'flash') { OPTS.flash = OPTS.flash ? 0 : 1; saveOpt('flash'); Sfx.ui(); }
        else if (id === 'mut') { OPTS.mut = (OPTS.mut + (a === 'left' ? -1 : 1) + MUTATORS.length) % MUTATORS.length; saveOpt('mut'); Sfx.ui(); }
        else if (a === 'ok' && id === 'controls') { Sfx.ui(); this.showSub('controls'); return; }
        else if (a === 'ok' && id === 'keys') { Sfx.ui(); this.showSub('keys'); return; }
        else if (a === 'ok' && id === 'back') { Sfx.ui(); this.showSub(null); return; }
      }
      this.refreshSub();
      return;
    }
    if (a === 'ok') { Sfx.ui(); this.showSub(null); }
  }
  keysKey(ev) {                                    // true when the KEYS page used the key, so onTitleKey skips it
    if (!this.capture) return false;
    const name = this.capture, code = ev.code;
    this.capture = null;
    if (!code || code === 'Escape') { Sfx.ui(); this.keyNote.setText(bindRow(name) + ' STAYS ON ' + bindLabel(name)); this.refreshSub(); return true; }
    const old = BINDS[name][0], other = Object.keys(BINDS).find(n => n !== name && BINDS[n].includes(code));
    BINDS[name] = [code, ...BINDS[name].slice(1).filter(c => c !== code)];
    let note = bindRow(name) + ' ON ' + keyLabel(code);
    if (other && code !== old) {                     // a key does one job: the row that had it takes this row's old key
      BINDS[other] = BINDS[other].map(c => (c === code ? old : c)).filter((c, i, all) => all.indexOf(c) === i);
      note += '   ' + bindRow(other) + ' MOVED TO ' + keyLabel(old);
    }
    this.bindsChanged(note);
    return true;
  }
  bindsChanged(note) { saveBinds(); bindTexts(); BUS.emit('binds'); Sfx.ui(); this.keyNote.setText(note); this.refreshSub(); }
  menuPick(i) {
    if (this.started) return;
    Sfx.init();
    if (i === 0) { Sfx.ui(); this.showSub('campaign'); }
    else if (i === 1) { this.wantEndless = true; this.startRun(); }
    else if (i === 2) { this.wantDaily = true; this.startRun(); }
    else if (i === 3) { this.wantRush = true; this.startRun(); }
    else if (i === this.menuItems.length - 1) { if (this.touchGate) this.nudgeTouch(); else this.time.delayedCall(0, () => LAB_PANEL.open()); }
    else { Sfx.ui(); this.showSub(['codex', 'armory', 'medals', 'options'][i - 4]); }
  }
  onTitleKey(k) {
    Sfx.init(); this.clearTouchGate();
    if (this.started || LAB_PANEL.isOpen()) return;
    const up = k === 38 || k === 87, down = k === 40 || k === 83, left = k === 37 || k === 65, right = k === 39 || k === 68, ok = k === 13 || k === 32, back = k === 27 || k === 8;
    if (this.sub) { this.subKey(up ? 'up' : down ? 'down' : left ? 'left' : right ? 'right' : ok ? 'ok' : back ? 'back' : k === 81 || k === 33 ? 'pgup' : k === 69 || k === 34 ? 'pgdn' : null); return; }
    if (up || down) { const n = this.menuItems.length; this.menuSel = (this.menuSel + n + (up ? -1 : 1)) % n; Sfx.swap(); }
    else if (left || right) this.stepDiff(left ? -1 : 1);
    else if (ok) this.menuPick(this.menuSel);
    else if (k === 69) this.menuPick(1);
    else if (k === 77) { Sfx.toggleMute(); this.menuHint.setText(this.menuHintText()); }
  }
  clearTouchGate() { if (this.touchGate) { this.touchGate = false; this.touchNote.setVisible(false); } }
  nudgeTouch() { Sfx.ui(); this.tweens.add({ targets: this.touchNote, scale: { from: 2.6, to: 2 }, duration: 220 }); }
  onTitleWheel(dy) {                                                    // the wheel pages the CODEX and steps through the other lists
    if (this.started || LAB_PANEL.isOpen() || !dy || this.time.now < (this.wheelAt || 0)) return;
    this.wheelAt = this.time.now + 120;                                  // a trackpad sends a burst of deltas per swipe
    const down = dy > 0;
    if (this.sub === 'codex') this.subKey(down ? 'pgdn' : 'pgup');
    else if (this.sub === 'armory' || this.sub === 'options' || this.sub === 'keys') { if (!this.capture) this.subKey(down ? 'down' : 'up'); }
    else if (!this.sub) { const n = this.menuItems.length; this.menuSel = (this.menuSel + (down ? 1 : n - 1)) % n; Sfx.swap(); }
  }
  menuHintText() { return 'W/S CHOOSE   ENTER PICK   A/D DIFFICULTY   E OVERTIME   ' + (Sfx.muted ? 'M SOUND ON (MUTED)' : 'M MUTE'); }
  onTitlePointer(p, click) {
    if (this.started || LAB_PANEL.isOpen()) return;
    if (this.sub && click) {                                             // a page closes only through its BACK or a right click
      const b = this.subBack;
      if (p.rightButtonDown() || (p.x >= b.x - 8 && p.x <= b.x + b.displayWidth + 8 && Math.abs(p.y - b.y) < 16)) { this.subKey('back'); return; }
    }
    if (this.sub === 'campaign') {
      const i = this.campaignButtons.findIndex(o => Math.abs(p.x - o.x) < 116 && Math.abs(p.y - o.y) < 25);
      if (i >= 0 && (i !== 0 || this.checkpoint)) {
        if (i !== this.subSel) { this.subSel = i; Sfx.swap(); this.refreshSub(); }
        if (click) this.subKey('ok');
      }
      return;
    }
    if (this.sub === 'codex') {
      const i = this.codexImgs.findIndex(o => o.visible && Math.abs(p.x - o.x) < 35 && Math.abs(p.y - o.y) < 26);
      if (i >= 0 && i !== this.subSel) { this.subSel = i; this.refreshSub(); }
      const c = this.codexCount;                                         // click MET n/94  PAGE 1/2 for the other page
      if (click && i < 0 && CODEX.length > 66 && Math.abs(p.y - c.y) < 12 && Math.abs(p.x - 480) < c.displayWidth / 2 + 10) this.subKey(this.subSel < 66 ? 'pgdn' : 'pgup');
      return;
    }
    if (this.sub === 'armory') {
      const i = this.armImgs.findIndex(o => Math.abs(p.x - o.x) < 32 && Math.abs(p.y - o.y) < 28);
      if (i >= 0 && i !== this.subSel) { this.subSel = i; this.refreshSub(); }
      return;
    }
    if (this.sub === 'options') {
      const i = this.optLbls.findIndex(o => Math.abs(p.y - o.y) < 17 && Math.abs(p.x - 480) < 220);
      if (i >= 0 && i !== this.subSel) { this.subSel = i; this.refreshSub(); }
      if (click && i >= 0) { const id = OPTION_ITEMS[i].id; this.subKey(id === 'controls' || id === 'keys' || id === 'back' ? 'ok' : p.x < 480 ? 'left' : 'right'); }
      return;
    }
    if (this.sub === 'keys') {
      if (this.capture) return;                        // waiting for a key
      const N = this.keyRows.length, top = clamp(this.subSel - 5, 0, N - this.keyLbls.length);
      const j = this.keyLbls.findIndex(o => Math.abs(p.y - o.y) < 14 && Math.abs(p.x - 480) < 300), i = j < 0 ? -1 : top + j;
      if (i >= 0 && i !== this.subSel && !click) { this.subSel = i; this.refreshSub(); }
      if (click && i >= 0) { this.subSel = i; this.subKey('ok'); }
      return;
    }
    if (this.sub) return;
    if (click && Math.abs(p.y - 238) < 18 && Math.abs(p.x - 480) < 140) { this.stepDiff(p.x < 480 ? -1 : 1); return; }   // the difficulty arrows
    const i = this.menuItems.findIndex(o => Math.abs(p.y - o.y) < 11 && Math.abs(p.x - o.x) < 130);
    if (i >= 0 && i !== this.menuSel) { this.menuSel = i; Sfx.swap(); }
    if (click && i >= 0) this.menuPick(i);
  }
  drawMenu(time) {
    const g = this.menuG; g.clear();
    this.menuItems.forEach((o, i) => o.setStyle({ color: i === this.menuSel ? '#ffe46a' : '#8f9bab' }));
    if (!this.sub) { const o = this.menuItems[this.menuSel], w = o.displayWidth / 2 + 14, bob = Math.round(Math.sin(time / 120) * 2); g.fillStyle(0xffe46a, 1); g.fillTriangle(o.x - w - 6 + bob, o.y - 5, o.x - w - 6 + bob, o.y + 5, o.x - w + bob, o.y); g.fillTriangle(o.x + w + 6 - bob, o.y - 5, o.x + w + 6 - bob, o.y + 5, o.x + w - bob, o.y); }
    const sg = this.subG; sg.clear();
    if (!this.sub) return;
    sg.fillStyle(0x05060a, 1); sg.fillRect(30, 30, 900, 500); sg.fillStyle(0xff8a1f, 1); sg.fillRect(30, 30, 900, 2); sg.fillRect(30, 528, 900, 2);
    if (this.sub === 'campaign') {
      const selected = this.subSel === 0 ? this.checkpoint.arena : 0;
      sg.fillStyle(0x353e48, 1).fillRect(136, 208, 688, 2);
      for (const [i, { x }] of this.campaignCards.entries()) {
        const c = i === selected ? CAMPAIGN_ACTS[i].color : 0x353e48;
        sg.fillStyle(i === selected ? 0x161b20 : 0x0d1016, 1).fillRect(x - 80, 134, 160, 146);
        sg.fillStyle(c, 1).fillRect(x - 80, 134, 160, 3);
        sg.lineStyle(1, c, 0.75).strokeRect(x - 80, 137, 160, 143);
      }
      for (const [i, o] of this.campaignButtons.entries()) {
        const on = i === this.subSel;
        sg.fillStyle(on ? 0x2b1c0e : 0x10141a, 1).fillRect(o.x - 116, 372, 232, 50);
        sg.lineStyle(2, on ? 0xffb347 : 0x353e48, 1).strokeRect(o.x - 116, 372, 232, 50);
      }
    }
    if (this.sub === 'codex') { const o = this.codexImgs[this.subSel]; sg.lineStyle(2, 0xffb347, 0.6 + 0.4 * Math.sin(time / 120)); sg.strokeRect(o.x - 34, o.y - 25, 68, 50); }
    if (this.sub === 'armory') {                                          // a frame on the pick, three mastery pips under every gun
      const o = this.armImgs[this.subSel]; sg.lineStyle(2, 0xffb347, 0.6 + 0.4 * Math.sin(time / 120)); sg.strokeRect(o.x - 31, o.y - 22, 62, 52);
      this.armImgs.forEach((im, i) => { const st = masteryStars(WEAPONS[i].id); for (let j = 0; j < 3; j++) { sg.fillStyle(j < st ? 0xffd040 : 0x2a2e35, 1); sg.fillRect(im.x - 9 + j * 7, im.y + 20, 5, 4); } });
    }
    if (this.sub === 'medals') for (const r of this.medalRows) { sg.fillStyle(r.on ? 0xffd040 : 0x2a2e35, 1); sg.fillTriangle(r.x, r.y + 4, r.x + 8, r.y - 10, r.x + 16, r.y + 4); sg.fillTriangle(r.x, r.y - 4, r.x + 16, r.y - 4, r.x + 8, r.y + 10); }
  }
  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    if (this.touchGate && PAD.active) this.clearTouchGate();
    if (this.rotateNote) this.rotateNote.setVisible(this.coarse && window.innerHeight > window.innerWidth);
    if (this.menuItems && !this.started && !LAB_PANEL.isOpen()) {        // the pad drives the menu and its pages
      const my = PAD.menuY(), mx = PAD.menuX();
      if (this.sub) { if (my) this.subKey(my < 0 ? 'up' : 'down'); if (mx) this.subKey(mx < 0 ? 'left' : 'right'); if (PAD.jd(0)) this.subKey('ok'); if (PAD.jd(1)) this.subKey('back'); }
      else { if (my) { const n = this.menuItems.length; this.menuSel = (this.menuSel + my + n) % n; Sfx.swap(); } if (mx) this.stepDiff(mx); if (PAD.jd(3)) this.menuPick(1); else if (PAD.jd(0) || PAD.jd(9)) this.menuPick(this.menuSel); }
    }
    if (this.menuItems) this.drawMenu(time);
    if (Math.random() < 0.6) this.fx.emit(rand(0, VIEW_W), VIEW_H + 2, { n: 1, angle: -Math.PI / 2, spread: 0.5, speed: [40, 110], life: [2, 4], size: [4, 2], cols: [0xffe46a, 0xff8a1f, 0xd04010], alpha: [0.9, 0], add: true, g: -10, drag: 0.3 });
    this.fx.update(dt); this.fx.draw();
  }
}

