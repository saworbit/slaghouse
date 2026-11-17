// =============================================================================
//  5x7 PIXEL FONT  (rendered into canvas textures so all text stays chunky)
// =============================================================================
const FONT = {
  A: [14, 17, 17, 17, 31, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14], D: [28, 18, 17, 17, 17, 18, 28],
  E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16], G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17], N: [17, 17, 25, 21, 19, 17, 17], O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17], S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 17, 10, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
  0: [14, 17, 19, 21, 25, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14], 2: [14, 17, 1, 2, 4, 8, 31], 3: [31, 2, 4, 2, 1, 17, 14],
  4: [2, 6, 10, 18, 31, 2, 2], 5: [31, 16, 30, 1, 1, 17, 14], 6: [6, 8, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8],
  8: [14, 17, 17, 14, 17, 17, 14], 9: [14, 17, 17, 15, 1, 2, 12],
  ' ': [0, 0, 0, 0, 0, 0, 0], '.': [0, 0, 0, 0, 0, 12, 12], ',': [0, 0, 0, 0, 12, 4, 8], ':': [0, 12, 12, 0, 12, 12, 0],
  '!': [4, 4, 4, 4, 4, 0, 4], '?': [14, 17, 1, 2, 4, 0, 4], '-': [0, 0, 0, 31, 0, 0, 0], '+': [0, 4, 4, 31, 4, 4, 0],
  '/': [0, 1, 2, 4, 8, 16, 0], '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8], "'": [12, 4, 8, 0, 0, 0, 0],
  '%': [24, 25, 2, 4, 8, 19, 3], '>': [8, 4, 2, 1, 2, 4, 8], '<': [2, 4, 8, 16, 8, 4, 2], '[': [14, 8, 8, 8, 8, 8, 14],
  ']': [14, 2, 2, 2, 2, 2, 14], '=': [0, 0, 31, 0, 31, 0, 0], '|': [4, 4, 4, 4, 4, 4, 4], '*': [0, 4, 21, 14, 21, 4, 0],
  '#': [10, 10, 31, 10, 31, 10, 10], '_': [0, 0, 0, 0, 0, 0, 31], '\\': [0, 16, 8, 4, 2, 1, 0], ';': [0, 12, 12, 0, 12, 4, 8],
};
function drawGlyphs(ctx, str, x, y, color, rows) {
  for (let i = 0; i < str.length; i++) {
    const g = FONT[str[i]] || FONT['?'];
    for (let r = 0; r < 7; r++) {
      const bits = g[r]; if (!bits) continue;
      ctx.fillStyle = rows ? rows[r] : color;
      for (let c = 0; c < 5; c++) if (bits & (16 >> c)) ctx.fillRect(x + i * 6 + c, y + r, 1, 1);
    }
  }
}
// Image backed by its own small CanvasTexture; setText() redraws only when the text changes.
class PixelLabel extends Phaser.GameObjects.Image {
  constructor(scene, x, y, key, opts = {}) {
    const text = String(opts.text || '').toUpperCase();
    const maxChars = Math.max(opts.maxChars || 0, text.length, 1);
    const w = maxChars * 6 + 1, h = 8;
    if (scene.textures.exists(key)) {
      const old = scene.textures.get(key);
      if (old.source[0].width !== w) scene.textures.remove(key);
    }
    const tex = scene.textures.exists(key) ? scene.textures.get(key) : scene.textures.createCanvas(key, w, h);
    super(scene, x, y, key);
    this.tex = tex; this.cw = w; this.opts = opts; this._text = null;
    const align = opts.align || 'center';
    this.setOrigin(align === 'left' ? 0 : align === 'right' ? 1 : 0.5, opts.originY !== undefined ? opts.originY : 0);
    if (opts.scale) this.setScale(opts.scale);
    scene.add.existing(this);
    this.setText(text);
  }
  setStyle(o) { Object.assign(this.opts, o); const t = this._text; this._text = null; if (t !== null) this.setText(t); return this; }   // redraw now in the new style
  setText(str) {
    str = String(str).toUpperCase();
    if (str === this._text) return this;
    this._text = str;
    const ctx = this.tex.context || this.tex.getContext();
    ctx.clearRect(0, 0, this.cw, 8);
    const tw = str.length * 6 - 1, align = this.opts.align || 'center';
    const x0 = align === 'left' ? 0 : align === 'right' ? this.cw - 1 - tw : Math.floor((this.cw - 1 - tw) / 2);
    if (this.opts.shadow) drawGlyphs(ctx, str, x0 + 1, 1, this.opts.shadow);
    drawGlyphs(ctx, str, x0, 0, this.opts.color || '#ffffff', this.opts.rows);
    this.tex.refresh();
    return this;
  }
}
const LOGO_ROWS = ['#eef2f6', '#c6ced8', '#9ba6b3', '#ffa040', '#ff7a1a', '#d9480f', '#7e2408'];
const CALL_ROWS = ['#fff8c8', '#ffe46a', '#ffd040', '#ffb030', '#ff8a1f', '#ff6a10', '#c84008'];
const WIN_ROWS = ['#ffffff', '#e6f7ff', '#bfe9ff', '#7dd8ff', '#46b8f0', '#2a86c8', '#1a5a90'];
const LOSE_ROWS = ['#ffd0c0', '#ff9a80', '#ff6a50', '#ff3a2a', '#d81e14', '#a0100c', '#600808'];
let HINT1 = '', HINT2 = '';                        // the keyboard hint strips, from the bindings (bindTexts)
let HINT_PAD1 = '', HINT_PAD2 = '';                // the gamepad's, from PAD_BINDS (bindTexts)
const RESTART_CONFIRM_MS = 2000;                     // mid-run R arms a restart; a second R inside this window confirms it
const CONTROL_LINES = [];                          // the CONTROLS page: the hint strips plus everything they leave out
function bindTexts() {                             // rebuild every key label from BINDS; with the defaults they read as they always did
  const k = bindLabel, arrows = ['UP', 'DOWN', 'LEFT', 'RIGHT'].every(n => BINDS[n].join() === BIND_DEFAULTS[n].join());
  slotLabels();
  HINT1 = `${k('A')}/${k('D')} MOVE  ${k('SPACE')} JUMP  ${k('SHIFT')} DASH  CLICK FIRE  ${k('F')} KICK  ${k('G')} MINE  ${k('C')} HOOK  ${k('T')} SENTRY`;
  HINT2 = `${k('TAB')} WHEEL  ${k('Q')}/${k('E')} CYCLE  KICK GLOWING FOES TO EXECUTE  ${k('ESC')} PAUSE  ${k('V')} FX`;
  const p = padLabel, dpad = PAD_BINDS.prev === 12 && PAD_BINDS.next === 13;
  HINT_PAD1 = `LS MOVE  RS AIM  ${p('fire')} FIRE  ${p('jump')} JUMP  ${p('dash')} DASH  ${p('kick')} KICK  ${p('hook')} HOOK  ${p('mine')} MINE  ${p('sentry')} SENTRY`;
  HINT_PAD2 = `HOLD ${p('wheel')} WHEEL  ${dpad ? 'DPAD UP/DOWN' : p('prev') + '/' + p('next')} CYCLE  KICK GLOWING FOES  ${p('pause')} PAUSE`;
  CONTROL_LINES.length = 0;
  CONTROL_LINES.push(['KEYBOARD', '#ffb347'], [HINT1], [HINT2],
    ['WEAPONS  ' + SLOT_KEYS.filter(s => s.trim()).map(s => (s === '<' ? 'BKSP' : s)).join(' ')],
    [`${arrows ? 'ARROWS' : k('LEFT') + '/' + k('RIGHT')} MOVE  ${k('W')} JUMP  ${k('S')}+${k('SPACE')} DROP  RIGHT CLICK KICK  MIDDLE CLICK MINE`],
    [`${k('J')} FIRE ON KEYS  MOUSE WHEEL CYCLE  ${k('P')} PAUSE  ${k('R')} TWICE RESTART  ${k('M')} MUTE`],
    [`${k('N')} SAMPLED/SYNTH SFX  ${k('B')} SAMPLED/SYNTH MUSIC   OPTIONS > KEYS REBINDS`],
    ['GAMEPAD', '#ffb347'], [HINT_PAD1], [HINT_PAD2],
    [`DOWN+${p('jump')} DROP  RS PICKS IN THE WHEEL  MENUS: DPAD OR LS, A PICK, B BACK`]);
}
bindTexts();
try {                                              // the keyboard's own key labels, once the browser has them
  navigator.keyboard?.getLayoutMap?.().then(m => { KEY_LAYOUT = m; bindTexts(); BUS.emit('binds'); }, () => {});
} catch (err) { /* not offered here */ }
// Pause menu rows, top to bottom. Handlers find a row by its id or fields, never by position, so a row can be added
// or moved without breaking the others. The rows the title OPTIONS page shares run in the same order there.
//   confirm: picking it loses the run, so it takes a second pick (not in the Lab)
//   step:    an OPTS volume in quarter steps; A/D change it, Enter wraps 0 back to 100
//   toggle:  A/D flip it, the same as Enter
const PAUSE_PCT = v => Math.round(v * 100) + '%';
const PAUSE_ITEMS = [
  { id: 'resume', label: () => 'RESUME' },
  { id: 'restart', confirm: true, label: gs => (gs.chapterStart ? 'RETRY ACT' : 'RESTART') },
  { id: 'music', step: 'music', label: () => 'MUSIC: ' + (Sfx.muted ? 'MUTED' : PAUSE_PCT(OPTS.music)) },
  { id: 'sfx', step: 'sfx', label: () => 'SFX: ' + (Sfx.muted ? 'MUTED' : PAUSE_PCT(OPTS.sfx)) },
  { id: 'shake', step: 'shake', label: () => 'SHAKE: ' + PAUSE_PCT(OPTS.shake) },
  { id: 'postfx', toggle: true, label: () => 'POST FX: ' + (POSTFX.on ? 'ON' : 'OFF') },
  { id: 'flash', toggle: true, label: () => 'FLASHES: ' + (OPTS.flash ? 'FULL' : 'REDUCED') },
  { id: 'controls', label: gs => (gs.lab ? 'LAB CONTROLS' : 'CONTROLS') },
  { id: 'quit', confirm: true, label: () => 'QUIT TO TITLE' },
];
const OPTION_ITEMS = [                                // the title OPTIONS page, top to bottom; handlers find rows by id
  { id: 'diff', label: () => 'DIFFICULTY  ' + DIFFS[OPTS.diff].name },
  { id: 'music', step: 'music', label: () => 'MUSIC  ' + (Sfx.muted ? 'MUTED' : PAUSE_PCT(OPTS.music)) },
  { id: 'sfx', step: 'sfx', label: () => 'SFX  ' + (Sfx.muted ? 'MUTED' : PAUSE_PCT(OPTS.sfx)) },
  { id: 'shake', step: 'shake', label: () => 'SHAKE  ' + PAUSE_PCT(OPTS.shake) },
  { id: 'postfx', label: () => 'POST FX  ' + (POSTFX.on ? 'ON' : 'OFF') },
  { id: 'flash', label: () => 'FLASHES  ' + (OPTS.flash ? 'FULL' : 'REDUCED') },
  { id: 'mut', label: () => 'MUTATOR  ' + MUTATORS[OPTS.mut].name },
  { id: 'keys', label: () => 'KEYS' },
  { id: 'controls', label: () => 'CONTROLS' },
  { id: 'back', label: () => 'BACK' },
];
const PAUSE_Y0 = 200, PAUSE_GAP = 27;                 // nine rows fit between the PAUSED title and the hint line
const TRACE_NAIL = [0xffe46a, 0xff8a1f], TRACE_PELLET = [0xfff0a0, 0xffa030], TRACE_ENEMY = [0xff6a4a, 0xc02010], TRACE_PARRY = [0xffffff, 0xffe14a];
const TRACE_SNIPE = [0xffffff, 0x9adcff];

