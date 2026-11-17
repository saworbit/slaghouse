// =============================================================================
//  AUDIO (raw Web Audio; Phaser's own audio is disabled in the config)
//  Sampled takes from sfx_bank.js (AudioGen, see dev/sfxgen) play when loaded; every sound keeps its
//  procedural synth version as the fallback, and N flips between the two in game.
// =============================================================================
const Sfx = {
  ctx: null, out: null, crunch: null, noiseBuf: null, muted: false, last: {}, hum: null,
  bank: {}, bankGain: {}, bankJit: {}, bankLast: {}, bankLoading: false, bankDone: false, useBank: true,
  buildShared(c) {                                 // the noise buffer and soft-clip every booming sound uses; dev/sfxgen/calib.js builds its renders with this too
    const len = (c.sampleRate * 1.5) | 0;
    this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.crunch = c.createWaveShaper();                       // soft-clip for gritty booms
    const n = 1024, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; curve[i] = Math.tanh(x * 3.2); }
    this.crunch.curve = curve; this.crunch.connect(this.out);
  },
  init() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        const c = this.ctx = new AC();
        const comp = c.createDynamicsCompressor();
        comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.2;
        this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : 0.55; this.master.connect(comp); comp.connect(c.destination);
        this.out = c.createGain(); this.out.gain.value = OPTS.sfx; this.out.connect(this.master);   // every effect goes through here (SFX volume)
        this.buildShared(c);
        this.probeOpus();
        this.loadBank();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) { this.ctx = null; }
  },
  ok(name, gap) {
    if (!this.ctx || this.muted) return false;
    const t = this.ctx.currentTime;
    if (gap && this.last[name] !== undefined && t - this.last[name] < gap) return false;
    this.last[name] = t; return true;
  },
  decode(b64) {                                    // base64 Ogg -> AudioBuffer promise; bad base64 rejects too (older Safari only has the callback form)
    return new Promise((res, rej) => {
      const bin = atob(b64), u = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      const p = this.ctx.decodeAudioData(u.buffer, res, rej); if (p && p.then) p.then(res, rej);
    });
  },
  // 20 ms of silence as Ogg Opus. A browser that can't decode it (older Safari) gets the AAC copies of both banks.
  OPUS_PROBE: 'T2dnUwACAAAAAAAAAAAAAAAAAAAAAAIotXIBE09wdXNIZWFkAQE4AYC7AAAAAABPZ2dTAAAAAAAAAAAAAAAAAAABAAAASZW+VAEuT3B1c1RhZ3MGAAAAZmZtcGVnAQAAABQAAABlbmNvZGVyPUxhdmMgbGlib3B1c09nZ1MABPgEAAAAAAAAAAAAAAIAAAD4eE9GAg8ReAvkwTbsxY2MSUaZpCaweAfJcifhROpV8fDA1d3pUmA=',
  probeOpus() {
    this.decode(this.OPUS_PROBE).then(() => { this.opus = true; }, () => { this.opus = false; this.loadAac(); });
  },
  loadAac() {                                      // fetch sfx_bank_aac.js and music_bank_aac.js once, then decode from them instead
    if (this.aacTried) return;
    this.aacTried = true;
    const add = (src, done) => {
      const el = document.createElement('script'); el.src = src; el.onload = done;
      el.onerror = () => console.warn(`SLAGHOUSE: ${src} didn't load, so this browser plays the synth versions`);
      document.head.appendChild(el);
    };
    add('sfx_bank_aac.js', () => {
      if (!window.SLAG_SFX_AAC) return;
      window.SLAG_SFX = window.SLAG_SFX_AAC; this.bank = {}; this.bankDone = this.bankLoading = false; this.loadBank();
    });
    add('music_bank_aac.js', () => {
      if (!window.SLAG_MUSIC_AAC) return;
      window.SLAG_MUSIC = window.SLAG_MUSIC_AAC; Music.failed = {}; Music.pend = {}; Music.bank = {};
      if (Music.want) Music.track(Music.want, true);
    });
  },
  loadBank() {                                     // decode every take in sfx_bank.js (async; synth covers the gap)
    const B = window.SLAG_SFX; if (!B || this.bankLoading) return;
    this.bankLoading = true;
    const jobs = []; let bad = 0;
    for (const name in B) {
      const s = B[name]; this.bankGain[name] = s.g; this.bankJit[name] = s.j;
      for (const b64 of s.d) jobs.push(this.decode(b64).then(buf => { (this.bank[name] || (this.bank[name] = [])).push(buf); }, () => { bad++; }));
    }
    Promise.all(jobs).then(() => {
      this.bankDone = true;
      if (bad && this.opus !== false) console.warn(`SLAGHOUSE: ${bad} of ${jobs.length} SFX takes failed to decode; ${this.bankOk() ? 'those sounds play' : 'every sound plays'} the synth version`);
      this.swapHum();
    });
  },
  bankOk() { return !this.bankDone || Object.keys(this.bank).length > 0; },   // false once decoding is over and nothing came through
  smp(name, v = 1, o) {                            // one-shot from the bank; false = not available, caller synthesizes
    const set = this.useBank && this.bank[name];
    if (!set || !set.length) return false;
    const c = this.ctx, t = c.currentTime + ((o && o.delay) || 0);
    let i = (Math.random() * set.length) | 0;
    if (set.length > 1 && i === this.bankLast[name]) i = (i + 1) % set.length;   // never the same take twice in a row
    this.bankLast[name] = i;
    const src = c.createBufferSource(), g = c.createGain(), j = this.bankJit[name];
    src.buffer = set[i];
    src.playbackRate.value = ((o && o.rate) || 1) * (1 + rand(-j, j));
    g.gain.value = v * this.bankGain[name];
    src.connect(g); g.connect((o && o.dest) || this.out); src.start(t);
    return true;
  },
  loopNode(name, fadeIn) {                         // looping bank take behind one gain; null = build the synth version
    const set = this.useBank && this.bank[name];
    if (!set || !set.length) return null;
    const c = this.ctx, g = c.createGain(), src = c.createBufferSource(), buf = set[(Math.random() * set.length) | 0];
    src.buffer = buf; src.loop = true; src.playbackRate.value = 1 + rand(-this.bankJit[name], this.bankJit[name]);
    g.gain.value = 0.0001; src.connect(g); g.connect(this.out);
    src.start(c.currentTime, Math.random() * buf.duration);          // random start point so bursts never repeat exactly
    g.gain.setTargetAtTime(this.bankGain[name], c.currentTime, fadeIn);
    return { g, nodes: [src] };
  },
  env(g, t, vol, a, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  },
  tone(o) {
    const c = this.ctx, t = c.currentTime + (o.delay || 0);
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f0, t);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t + o.dur);
    if (o.detune) osc.detune.value = o.detune;
    this.env(g, t, o.vol, o.attack || 0.003, o.dur);
    osc.connect(g); g.connect(o.dest || this.out);
    osc.start(t); osc.stop(t + o.dur + 0.05);
  },
  noise(o) {
    const c = this.ctx, t = c.currentTime + (o.delay || 0);
    const src = c.createBufferSource(); src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = o.filter || 'lowpass'; f.Q.value = o.q || 0.8;
    f.frequency.setValueAtTime(o.f0 || 2000, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + o.dur);
    const g = c.createGain(); this.env(g, t, o.vol, o.attack || 0.002, o.dur);
    src.connect(f); f.connect(g); g.connect(o.dest || this.out);
    src.start(t, Math.random() * 0.3, o.dur + 0.05);
  },
  nail() { if (!this.ok('nail', 0.02)) return; if (this.smp('nail')) return;
    this.tone({ type: 'square', f0: 1300, f1: 260, dur: 0.07, vol: 0.08, detune: rand(-90, 90) });
    this.tone({ type: 'triangle', f0: 190, f1: 60, dur: 0.06, vol: 0.14 });
    this.noise({ filter: 'highpass', f0: 2600, dur: 0.035, vol: 0.12 }); },
  shotgun() { if (!this.ok('sg')) return; if (this.smp('shotgun')) return;
    this.noise({ filter: 'lowpass', f0: 5200, f1: 260, dur: 0.4, vol: 0.8, dest: this.crunch });
    this.tone({ type: 'sine', f0: 150, f1: 36, dur: 0.3, vol: 0.75 });
    this.noise({ filter: 'bandpass', f0: 2600, q: 3, dur: 0.035, vol: 0.25, delay: 0.3 });
    this.noise({ filter: 'bandpass', f0: 1800, q: 3, dur: 0.05, vol: 0.3, delay: 0.42 }); },
  rocket() { if (!this.ok('rk')) return; if (this.smp('rocket')) return;
    this.noise({ filter: 'bandpass', f0: 450, f1: 2400, q: 1.2, dur: 0.5, vol: 0.45 });
    this.tone({ type: 'sawtooth', f0: 120, f1: 50, dur: 0.35, vol: 0.14 });
    this.noise({ filter: 'lowpass', f0: 900, dur: 0.12, vol: 0.45 }); },
  explosion(v = 1) { if (!this.ok('ex', 0.03)) return; if (this.smp('explosion', v)) return;
    this.noise({ filter: 'lowpass', f0: 2400, f1: 60, dur: 1.15, vol: 0.95 * v, dest: this.crunch });
    this.tone({ type: 'sine', f0: 100, f1: 22, dur: 0.75, vol: 0.9 * v });
    this.noise({ filter: 'highpass', f0: 3000, dur: 0.08, vol: 0.3 * v }); },
  hit() { if (!this.ok('hit', 0.025)) return; if (this.smp('hit')) return;
    this.noise({ filter: 'bandpass', f0: rand(700, 1150), q: 2, dur: 0.07, vol: 0.32 });
    this.tone({ type: 'square', f0: 210, f1: 80, dur: 0.06, vol: 0.06 }); },
  gib(p = 1) { if (!this.ok('gib', 0.03)) return; if (this.smp('gib', Math.min(1.3, p))) return;
    const v = Math.min(1.3, p);
    this.noise({ filter: 'lowpass', f0: 1500, f1: 160, dur: 0.42, vol: 0.62 * v, dest: this.crunch });
    this.tone({ type: 'sine', f0: 130, f1: 38, dur: 0.22, vol: 0.45 * v });
    for (let i = 0; i < 4; i++) this.tone({ type: 'sine', f0: rand(300, 750), f1: 90, dur: 0.07, vol: 0.12, delay: rand(0.02, 0.28) }); },
  squish() { if (!this.ok('sq', 0.06)) return; if (this.smp('squish')) return; this.noise({ filter: 'lowpass', f0: 700, f1: 180, dur: 0.09, vol: 0.18 }); },
  jump() { if (!this.ok('jump', 0.05)) return; if (this.smp('jump')) return;
    this.tone({ type: 'square', f0: 250, f1: 520, dur: 0.09, vol: 0.05 }); this.noise({ filter: 'lowpass', f0: 700, dur: 0.05, vol: 0.06 }); },
  land(v = 0.5) { if (!this.ok('land', 0.08)) return; if (this.smp('land', (0.12 + 0.2 * v) / 0.22)) return;
    this.noise({ filter: 'lowpass', f0: 520, f1: 110, dur: 0.1, vol: 0.12 + 0.2 * v }); this.tone({ type: 'sine', f0: 95, f1: 45, dur: 0.08, vol: 0.18 * v }); },
  step() { if (!this.ok('step', 0.09)) return; if (this.smp('step')) return; this.noise({ filter: 'bandpass', f0: 900, q: 2, dur: 0.03, vol: 0.05 }); },
  hurt() { if (!this.ok('hurt', 0.08)) return; if (this.smp('hurt')) return;
    this.tone({ type: 'sawtooth', f0: 330, f1: 90, dur: 0.24, vol: 0.22 }); this.noise({ filter: 'lowpass', f0: 1600, dur: 0.12, vol: 0.25 }); },
  swap() { if (!this.ok('swap', 0.04)) return; if (this.smp('swap')) return;
    this.noise({ filter: 'highpass', f0: 2200, dur: 0.025, vol: 0.18 }); this.noise({ filter: 'bandpass', f0: 1200, q: 4, dur: 0.04, vol: 0.22, delay: 0.07 }); },
  zap() { if (!this.ok('zap', 0.05)) return; if (this.smp('zap')) return;
    this.tone({ type: 'sine', f0: 1100, f1: 240, dur: 0.22, vol: 0.12 }); this.tone({ type: 'square', f0: 550, f1: 120, dur: 0.2, vol: 0.04 }); },
  charge(v = 0.5) { if (!this.ok('chg', 0.1)) return; this.tone({ type: 'sine', f0: 220, f1: 900, dur: 0.38, vol: 0.14 * v }); },
  growl(big) { if (!this.ok('growl', 0.15)) return; if (this.smp('growl', 1, { rate: big ? 0.78 : 1 })) return;
    const f = big ? 55 : 85;
    this.tone({ type: 'sawtooth', f0: f * 1.35, f1: f, dur: 0.32, vol: 0.16 }); this.noise({ filter: 'bandpass', f0: big ? 300 : 520, q: 1.5, dur: 0.3, vol: 0.18 }); },
  stomp() { if (!this.ok('stomp', 0.1)) return; if (this.smp('stomp')) return;
    this.noise({ filter: 'lowpass', f0: 750, f1: 55, dur: 0.5, vol: 0.65, dest: this.crunch }); this.tone({ type: 'sine', f0: 72, f1: 26, dur: 0.45, vol: 0.75 }); },
  tink(v = 1) { if (!this.ok('tink', 0.035)) return; if (this.smp('tink', v)) return; this.tone({ type: 'triangle', f0: rand(2200, 3300), f1: 1500, dur: 0.05, vol: 0.05 * v }); },
  grenade() { if (!this.ok('gl')) return; if (this.smp('grenade')) return;                       // hollow "bloomp" + reload click
    this.tone({ type: 'sine', f0: 320, f1: 110, dur: 0.15, vol: 0.45 }); this.noise({ filter: 'lowpass', f0: 1300, f1: 280, dur: 0.13, vol: 0.38 });
    this.noise({ filter: 'bandpass', f0: 2400, q: 3, dur: 0.03, vol: 0.16, delay: 0.26 }); },
  clunk(v = 1) { if (!this.ok('clunk', 0.04)) return; if (this.smp('clunk', v)) return;
    this.tone({ type: 'triangle', f0: rand(480, 700), f1: 190, dur: 0.06, vol: 0.13 * v }); this.noise({ filter: 'bandpass', f0: 1800, q: 2, dur: 0.03, vol: 0.1 * v }); },
  beep() { if (!this.ok('beep', 0.05)) return; this.tone({ type: 'square', f0: 1400, dur: 0.03, vol: 0.035 }); },
  confirm(kill) { if (!this.ok('cf', 0.03)) return;              // arena-style hit-confirm tick
    this.tone({ type: 'square', f0: kill ? 1500 : 2100, f1: kill ? 820 : undefined, dur: kill ? 0.1 : 0.03, vol: kill ? 0.07 : 0.045 }); },
  radio() { if (!this.ok('radio', 0.3)) return; if (this.smp('radio')) return;                  // squad callout: static + two chirps
    this.noise({ filter: 'bandpass', f0: 1800, q: 4, dur: 0.18, vol: 0.12 });
    this.tone({ type: 'square', f0: 900, dur: 0.05, vol: 0.05, delay: 0.02 }); this.tone({ type: 'square', f0: 1250, dur: 0.06, vol: 0.05, delay: 0.1 }); },
  eshot() { if (!this.ok('eshot', 0.03)) return; if (this.smp('eshot')) return;
    this.noise({ filter: 'highpass', f0: 1800, dur: 0.06, vol: 0.26 }); this.tone({ type: 'square', f0: 620, f1: 180, dur: 0.05, vol: 0.06 }); },
  laser() { if (!this.ok('laser', 0.1)) return; this.tone({ type: 'sine', f0: 700, f1: 1700, dur: 0.45, vol: 0.035 }); },
  hiss() { if (!this.ok('hiss', 0.25)) return; if (this.smp('hiss')) return; this.noise({ filter: 'bandpass', f0: 3600, q: 3, dur: 0.3, vol: 0.2, attack: 0.04 }); },
  whoosh() { if (!this.ok('whoosh', 0.1)) return; if (this.smp('whoosh')) return; this.noise({ filter: 'bandpass', f0: 700, f1: 2600, q: 1.5, dur: 0.2, vol: 0.22 }); },
  rail() { if (!this.ok('rail')) return; if (this.smp('rail')) return;                         // supersonic crack + falling whine + thump
    this.noise({ filter: 'highpass', f0: 2500, dur: 0.25, vol: 0.35 }); this.tone({ type: 'sawtooth', f0: 2400, f1: 120, dur: 0.35, vol: 0.12 });
    this.tone({ type: 'sine', f0: 90, f1: 30, dur: 0.4, vol: 0.7 }); },
  sawLaunch() { if (!this.ok('saw', 0.05)) return; if (this.smp('sawLaunch')) return;
    this.tone({ type: 'sawtooth', f0: 900, f1: 1500, dur: 0.18, vol: 0.06 }); this.noise({ filter: 'bandpass', f0: 3000, q: 4, dur: 0.15, vol: 0.12 }); },
  clang(v = 1) { if (!this.ok('clang', 0.04)) return; if (this.smp('clang', v)) return;               // metal on metal (shields, saw ricochets)
    this.tone({ type: 'square', f0: rand(900, 1300), f1: 500, dur: 0.12, vol: 0.06 * v }); this.tone({ type: 'triangle', f0: rand(2600, 3400), f1: 2000, dur: 0.18, vol: 0.05 * v });
    this.noise({ filter: 'highpass', f0: 3000, dur: 0.04, vol: 0.12 * v }); },
  ding() { if (!this.ok('ding', 0.05)) return; this.tone({ type: 'triangle', f0: 1760, dur: 0.18, vol: 0.09 }); this.tone({ type: 'sine', f0: 2640, dur: 0.14, vol: 0.05, delay: 0.02 }); },
  warp() { if (!this.ok('warp', 0.1)) return; if (this.smp('warp')) return; this.tone({ type: 'sine', f0: 200, f1: 1200, dur: 0.8, vol: 0.08 }); this.noise({ filter: 'bandpass', f0: 600, f1: 3000, q: 2, dur: 0.8, vol: 0.1 }); },
  rankUp() { if (!this.ok('rank', 0.2)) return; [660, 990, 1320].forEach((f, i) => this.tone({ type: 'square', f0: f, dur: 0.07, vol: 0.05, delay: i * 0.05 })); },
  kickHit() { if (!this.ok('kick', 0.05)) return; if (this.smp('kickHit')) return; this.tone({ type: 'sine', f0: 160, f1: 50, dur: 0.12, vol: 0.6 }); this.noise({ filter: 'lowpass', f0: 1400, f1: 300, dur: 0.1, vol: 0.4 }); },
  splatWall() { if (!this.ok('splatw', 0.06)) return; if (this.smp('splatWall')) return; this.noise({ filter: 'lowpass', f0: 2000, f1: 200, dur: 0.22, vol: 0.55, dest: this.crunch }); this.tone({ type: 'square', f0: 90, f1: 40, dur: 0.12, vol: 0.2 }); },
  snipe() { if (!this.ok('snipe', 0.05)) return; if (this.smp('snipe')) return;
    this.noise({ filter: 'highpass', f0: 1500, dur: 0.3, vol: 0.5 }); this.tone({ type: 'sawtooth', f0: 1800, f1: 200, dur: 0.25, vol: 0.1 }); this.tone({ type: 'sine', f0: 110, f1: 40, dur: 0.3, vol: 0.5 }); },
  ignite() { if (!this.ok('ignite', 0.12)) return; if (this.smp('ignite')) return; this.noise({ filter: 'bandpass', f0: 800, f1: 2400, q: 1, dur: 0.3, vol: 0.25 }); },
  chirp() { if (!this.ok('chirp', 0.08)) return; this.tone({ type: 'square', f0: 1800, f1: 2600, dur: 0.05, vol: 0.04 }); },
  singOpen() { if (!this.ok('sing', 0.1)) return; if (this.smp('singOpen')) return; this.tone({ type: 'sine', f0: 600, f1: 60, dur: 1.2, vol: 0.25 }); this.noise({ filter: 'bandpass', f0: 2000, f1: 200, q: 3, dur: 1.2, vol: 0.12 }); },
  roar() { if (!this.ok('roar', 0.3)) return; if (this.smp('roar')) return;
    this.tone({ type: 'sawtooth', f0: 70, f1: 40, dur: 1.1, vol: 0.35 }); this.tone({ type: 'sawtooth', f0: 105, f1: 55, dur: 1.0, vol: 0.2, detune: 15 });
    this.noise({ filter: 'lowpass', f0: 900, f1: 200, dur: 1.1, vol: 0.4, dest: this.crunch }); },
  mortar() { if (!this.ok('mortar', 0.06)) return; if (this.smp('mortar')) return; this.tone({ type: 'sine', f0: 140, f1: 50, dur: 0.25, vol: 0.6 }); this.noise({ filter: 'lowpass', f0: 600, dur: 0.2, vol: 0.4 }); },
  cryoSet(on) {                                                    // continuous freezing hiss while the cryo cannon runs
    if (!this.ctx) return;
    if (on && !this.cryoNode && !this.muted && (this.cryoNode = this.loopNode('cryoLoop', 0.03))) return;
    if (on && !this.cryoNode && !this.muted) {
      const c = this.ctx, g = c.createGain(); g.gain.value = 0.0001;
      const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
      const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2600; f.Q.value = 0.7;
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 3200; const og = c.createGain(); og.gain.value = 0.05;
      src.connect(f); f.connect(g); o.connect(og); og.connect(g); g.connect(this.out);
      src.start(); o.start(); g.gain.setTargetAtTime(0.13, c.currentTime, 0.03);
      this.cryoNode = { g, nodes: [src, o] };
    } else if (!on && this.cryoNode) {
      const a = this.cryoNode, t = this.ctx.currentTime; this.cryoNode = null;
      a.g.gain.setTargetAtTime(0.0001, t, 0.05); a.nodes.forEach(n => n.stop(t + 0.3));
    }
  },
  freeze() { if (!this.ok('freeze', 0.08)) return; if (this.smp('freeze')) return; [1800, 2400, 3200].forEach((f, i) => this.tone({ type: 'triangle', f0: f, f1: f * 1.2, dur: 0.18, vol: 0.05, delay: i * 0.03 })); this.noise({ filter: 'highpass', f0: 4000, dur: 0.2, vol: 0.12 }); },
  shatter() { if (!this.ok('shatter', 0.05)) return; if (this.smp('shatter')) return;
    this.noise({ filter: 'highpass', f0: 2500, dur: 0.35, vol: 0.45 }); this.tone({ type: 'sine', f0: 200, f1: 60, dur: 0.2, vol: 0.3 });
    for (let i = 0; i < 6; i++) this.tone({ type: 'triangle', f0: rand(2000, 4500), f1: rand(1200, 2000), dur: 0.08, vol: 0.05, delay: rand(0, 0.2) }); },
  crack() { if (!this.ok('crack', 0.1)) return; if (this.smp('crack')) return; this.noise({ filter: 'bandpass', f0: 3000, q: 3, dur: 0.12, vol: 0.2 }); },
  scream() { if (!this.ok('scream', 0.15)) return; if (this.smp('scream')) return;
    this.tone({ type: 'sawtooth', f0: 900, f1: 1800, dur: 0.45, vol: 0.07 }); this.tone({ type: 'square', f0: 1300, f1: 2400, dur: 0.4, vol: 0.04, detune: 30 });
    this.noise({ filter: 'bandpass', f0: 2500, q: 2, dur: 0.4, vol: 0.12 }); },
  shieldHit() { if (!this.ok('shld', 0.06)) return; if (this.smp('shieldHit')) return; this.tone({ type: 'sine', f0: 900, f1: 500, dur: 0.1, vol: 0.06 }); this.noise({ filter: 'bandpass', f0: 3500, q: 4, dur: 0.06, vol: 0.08 }); },
  rampage() { if (!this.ok('ramp', 1)) return; if (this.smp('rampage')) return;
    [220, 277, 330, 440].forEach((f, i) => this.tone({ type: 'sawtooth', f0: f, dur: 0.5, vol: 0.06, delay: i * 0.05 }));
    this.noise({ filter: 'lowpass', f0: 1200, f1: 200, dur: 0.6, vol: 0.4, dest: this.crunch }); },
  flameSet(on) {                                                   // continuous roar while the hose is open
    if (!this.ctx) return;
    if (on && !this.flameNode && !this.muted && (this.flameNode = this.loopNode('flameLoop', 0.03))) return;
    if (on && !this.flameNode && !this.muted) {
      const c = this.ctx, g = c.createGain(); g.gain.value = 0.0001;
      const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; f.Q.value = 0.7;
      const lfo = c.createOscillator(); lfo.frequency.value = 13; const lg = c.createGain(); lg.gain.value = 0.04;
      src.connect(f); f.connect(g); lfo.connect(lg); lg.connect(g.gain); g.connect(this.out);
      src.start(); lfo.start(); g.gain.setTargetAtTime(0.16, c.currentTime, 0.03);
      this.flameNode = { g, nodes: [src, lfo] };
    } else if (!on && this.flameNode) {
      const a = this.flameNode, t = this.ctx.currentTime; this.flameNode = null;
      a.g.gain.setTargetAtTime(0.0001, t, 0.05); a.nodes.forEach(n => n.stop(t + 0.3));
    }
  },
  arcSet(on) {                                                     // continuous crackling hum while the arc caster fires
    if (!this.ctx) return;
    if (on && !this.arcNode && !this.muted && (this.arcNode = this.loopNode('arcLoop', 0.03))) return;
    if (on && !this.arcNode && !this.muted) {
      const c = this.ctx, g = c.createGain(); g.gain.value = 0.0001;
      const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 1.5;
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 95; const og = c.createGain(); og.gain.value = 0.35;
      const lfo = c.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 23; const lg = c.createGain(); lg.gain.value = 0.03;
      src.connect(f); f.connect(g); o.connect(og); og.connect(g); lfo.connect(lg); lg.connect(g.gain); g.connect(this.out);
      src.start(); o.start(); lfo.start();
      g.gain.setTargetAtTime(0.07, c.currentTime, 0.02);
      this.arcNode = { g, nodes: [src, o, lfo] };
    } else if (!on && this.arcNode) {
      const a = this.arcNode, t = this.ctx.currentTime; this.arcNode = null;
      a.g.gain.setTargetAtTime(0.0001, t, 0.03); a.nodes.forEach(n => n.stop(t + 0.25));
    }
  },
  rivet() { if (!this.ok('rivet', 0.018)) return; if (this.smp('rivet')) return;
    this.noise({ filter: 'highpass', f0: 2200, dur: 0.03, vol: 0.13 }); this.tone({ type: 'square', f0: rand(700, 900), f1: 240, dur: 0.035, vol: 0.05 });
    this.tone({ type: 'sine', f0: 130, f1: 55, dur: 0.05, vol: 0.16 }); },
  smash(c) { if (!this.ok('smash', 0.05)) return; if (this.smp(c === '=' ? 'smashMetal' : 'smash')) return;                   // crate / girder / grating giving way
    this.noise({ filter: 'lowpass', f0: c === '=' ? 3200 : 1800, f1: 180, dur: 0.3, vol: 0.5, dest: this.crunch });
    this.tone({ type: 'square', f0: rand(260, 420), f1: 90, dur: 0.12, vol: 0.08 });
    for (let i = 0; i < 3; i++) this.tone({ type: 'triangle', f0: rand(900, 2200), f1: 500, dur: 0.06, vol: 0.05, delay: rand(0.03, 0.2) }); },
  creak() { if (!this.ok('creak', 0.25)) return; if (this.smp('creak')) return;                    // metal groan before a span drops
    this.tone({ type: 'sawtooth', f0: 95, f1: 48, dur: 0.7, vol: 0.14 }); this.tone({ type: 'sawtooth', f0: 140, f1: 70, dur: 0.6, vol: 0.06, detune: 25 });
    this.noise({ filter: 'bandpass', f0: 420, q: 4, dur: 0.6, vol: 0.12 }); },
  whistle() { if (!this.ok('whistle', 0.15)) return; if (this.smp('whistle')) return; this.tone({ type: 'sine', f0: 1700, f1: 700, dur: 0.55, vol: 0.05 }); },
  snort() { if (!this.ok('snort', 0.3)) return; if (this.smp('snort')) return; this.noise({ filter: 'bandpass', f0: 500, f1: 1400, q: 1.5, dur: 0.25, vol: 0.35 }); this.tone({ type: 'sawtooth', f0: 75, f1: 50, dur: 0.4, vol: 0.2 }); },
  clusterPop() { if (!this.ok('cpop', 0.08)) return; if (this.smp('clusterPop')) return; this.tone({ type: 'sine', f0: 600, f1: 140, dur: 0.12, vol: 0.4 }); this.noise({ filter: 'bandpass', f0: 2600, q: 2, dur: 0.18, vol: 0.25 }); },
  miniSet(sp) {                                                    // motor whine that follows the minigun's barrel spin
    if (!this.ctx) return;
    if (sp > 0.02 && !this.miniNode && !this.muted) {
      const c = this.ctx, g = c.createGain(); g.gain.value = 0.0001;
      const o = c.createOscillator(); o.type = 'sawtooth'; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2.5;
      const o2 = c.createOscillator(); o2.type = 'square'; const g2 = c.createGain(); g2.gain.value = 0.3;
      o.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(this.out); o.start(); o2.start();
      this.miniNode = { g, o, o2, f };
    }
    const n = this.miniNode; if (!n) return;
    const t = this.ctx.currentTime;
    if (sp <= 0.02) { this.miniNode = null; n.g.gain.setTargetAtTime(0.0001, t, 0.05); n.o.stop(t + 0.3); n.o2.stop(t + 0.3); return; }
    n.o.frequency.setTargetAtTime(70 + 330 * sp, t, 0.03); n.o2.frequency.setTargetAtTime(35 + 160 * sp, t, 0.03);
    n.f.frequency.setTargetAtTime(400 + 1400 * sp, t, 0.03); n.g.gain.setTargetAtTime(0.06 * sp, t, 0.03);
  },
  stake() { if (!this.ok('stake', 0.05)) return; if (this.smp('stake')) return;                    // pneumatic thump + whoosh
    this.noise({ filter: 'lowpass', f0: 2600, f1: 300, dur: 0.18, vol: 0.5, dest: this.crunch }); this.tone({ type: 'sawtooth', f0: 180, f1: 60, dur: 0.16, vol: 0.2 });
    this.noise({ filter: 'highpass', f0: 3000, dur: 0.05, vol: 0.2 }); },
  pin() { if (!this.ok('pin', 0.05)) return; if (this.smp('pin')) return;                        // stake biting into the wall
    this.tone({ type: 'square', f0: 520, f1: 140, dur: 0.1, vol: 0.12 }); this.tone({ type: 'triangle', f0: 2400, f1: 1800, dur: 0.25, vol: 0.06 }); this.noise({ filter: 'lowpass', f0: 900, dur: 0.1, vol: 0.3 }); },
  snap() { if (!this.ok('snap', 0.1)) return; if (this.smp('snap')) return; this.noise({ filter: 'highpass', f0: 2800, dur: 0.06, vol: 0.3 }); this.tone({ type: 'triangle', f0: 3000, f1: 1200, dur: 0.12, vol: 0.06 }); },
  mineThrow() { if (!this.ok('mthrow', 0.05)) return; if (this.smp('mineThrow')) return; this.noise({ filter: 'bandpass', f0: 1500, q: 2, dur: 0.06, vol: 0.15 }); this.tone({ type: 'square', f0: 700, dur: 0.03, vol: 0.04 }); },
  mineArm() { if (!this.ok('marm', 0.05)) return; this.tone({ type: 'square', f0: 1200, dur: 0.04, vol: 0.05 }); this.tone({ type: 'square', f0: 1800, dur: 0.05, vol: 0.05, delay: 0.07 }); },
  mineTrig() { if (!this.ok('mtrig', 0.05)) return; this.tone({ type: 'square', f0: 2400, f1: 3000, dur: 0.12, vol: 0.07 }); },
  sputter() { if (!this.ok('sput', 0.07)) return; if (this.smp('sputter')) return; this.noise({ filter: 'bandpass', f0: rand(300, 900), q: 1.5, dur: 0.08, vol: 0.25 }); },
  gasHiss() { if (!this.ok('gas', 0.09)) return; if (this.smp('gasHiss')) return; this.noise({ filter: 'highpass', f0: 2500, dur: 0.12, vol: 0.16 }); },
  killcam() { if (!this.ok('kcam', 0.5)) return; if (this.smp('killcam')) return; this.tone({ type: 'sine', f0: 80, f1: 30, dur: 0.9, vol: 0.5 }); this.noise({ filter: 'bandpass', f0: 1800, f1: 200, q: 1, dur: 0.8, vol: 0.2 }); },
  prism() { if (!this.ok('prism', 0.05)) return; if (this.smp('prism')) return;
    this.tone({ type: 'sawtooth', f0: 1800, f1: 400, dur: 0.25, vol: 0.08 }); this.tone({ type: 'sine', f0: 600, f1: 2400, dur: 0.18, vol: 0.08 }); this.noise({ filter: 'bandpass', f0: 4000, q: 2, dur: 0.12, vol: 0.15 }); },
  prismBounce() { if (!this.ok('pbnc', 0.02)) return; this.tone({ type: 'triangle', f0: rand(2400, 3600), f1: 1600, dur: 0.1, vol: 0.05 }); },
  hookFire() { if (!this.ok('hookf', 0.05)) return; if (this.smp('hookFire')) return; this.noise({ filter: 'bandpass', f0: 1200, f1: 3000, q: 1.5, dur: 0.15, vol: 0.2 }); this.tone({ type: 'square', f0: 300, f1: 900, dur: 0.1, vol: 0.04 }); },
  hookHit() { if (!this.ok('hookh', 0.05)) return; if (this.smp('hookHit')) return; this.tone({ type: 'square', f0: 700, f1: 200, dur: 0.08, vol: 0.1 }); this.noise({ filter: 'lowpass', f0: 1500, dur: 0.08, vol: 0.25 }); },
  decloak() { if (!this.ok('dcl', 0.2)) return; if (this.smp('decloak')) return; this.noise({ filter: 'bandpass', f0: 5000, f1: 800, q: 3, dur: 0.3, vol: 0.18 }); this.tone({ type: 'sine', f0: 2000, f1: 300, dur: 0.3, vol: 0.05 }); },
  // ---- overdrive round: sampled from sfx_bank.js when it has them (lockOn / dodge stay synth: UI cues) ----
  dash() { if (!this.ok('dash', 0.05)) return; if (this.smp('dash')) return; this.noise({ filter: 'bandpass', f0: 900, f1: 3800, q: 1.2, dur: 0.16, vol: 0.28 }); this.tone({ type: 'sine', f0: 320, f1: 900, dur: 0.1, vol: 0.06 }); },
  dodge() { if (!this.ok('dodge', 0.2)) return; this.tone({ type: 'triangle', f0: 1400, f1: 2200, dur: 0.12, vol: 0.06 }); this.tone({ type: 'triangle', f0: 2100, f1: 2900, dur: 0.1, vol: 0.04, delay: 0.05 }); },
  lockOn(n) { if (!this.ok('lock', 0.03)) return; this.tone({ type: 'square', f0: 620 + n * 140, dur: 0.05, vol: 0.06 }); this.tone({ type: 'square', f0: 930 + n * 210, dur: 0.04, vol: 0.04, delay: 0.05 }); },
  hornet() { if (!this.ok('hornet', 0.03)) return; if (this.smp('hornet')) return; this.noise({ filter: 'bandpass', f0: 1800, f1: 600, q: 1, dur: 0.22, vol: 0.22 }); this.tone({ type: 'sawtooth', f0: 520, f1: 1400, dur: 0.12, vol: 0.05 }); this.tone({ type: 'sine', f0: 160, f1: 60, dur: 0.08, vol: 0.2 }); },
  lanceFire(c) { if (!this.ok('lance', 0.05)) return; if (this.smp('lanceFire', 0.5 + 0.5 * c, { rate: 1.15 - 0.15 * c })) return;   // weak shots: quieter, a touch higher
    this.noise({ filter: 'lowpass', f0: 3000 + 3000 * c, f1: 200, dur: 0.3 + 0.4 * c, vol: 0.45 + 0.4 * c, dest: this.crunch });
    this.tone({ type: 'sawtooth', f0: 900 + 600 * c, f1: 80, dur: 0.25 + 0.35 * c, vol: 0.12 + 0.12 * c });
    this.tone({ type: 'sine', f0: 120, f1: 30, dur: 0.3 + 0.3 * c, vol: 0.2 + 0.5 * c }); },
  lanceSet(c) {                                                    // charge hum: the sampled loop pitches up with charge; the synth whine is the fallback
    if (!this.ctx) return;
    if (c > 0.01 && !this.lanceNode && !this.muted) {
      const L = this.loopNode('lanceLoop', 0.05);
      if (L) this.lanceNode = Object.assign(L, { bank: true });
      else {
        const x = this.ctx, g = x.createGain(); g.gain.value = 0.0001;
        const o = x.createOscillator(); o.type = 'sawtooth'; const o2 = x.createOscillator(); o2.type = 'square';
        const f = x.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 4; const g2 = x.createGain(); g2.gain.value = 0.25;
        o.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(this.out); o.start(); o2.start();
        this.lanceNode = { g, o, o2, f, nodes: [o, o2] };
      }
    }
    const n = this.lanceNode; if (!n) return;
    const t = this.ctx.currentTime;
    if (c <= 0.01) { this.lanceNode = null; n.g.gain.setTargetAtTime(0.0001, t, 0.03); for (const s of n.nodes) s.stop(t + 0.2); return; }
    if (n.bank) {                                                  // full charge: a nervous wobble on top
      n.nodes[0].playbackRate.setTargetAtTime(0.7 + 0.7 * c + (c >= 1 ? Math.sin(t * 60) * 0.05 : 0), t, 0.03);
      n.g.gain.setTargetAtTime(this.bankGain.lanceLoop * (0.35 + 0.65 * c), t, 0.03);
      return;
    }
    const wob = c >= 1 ? Math.sin(t * 60) * 30 : 0;
    n.o.frequency.setTargetAtTime(120 + 520 * c + wob, t, 0.02); n.o2.frequency.setTargetAtTime(60 + 260 * c, t, 0.02);
    n.f.frequency.setTargetAtTime(500 + 2400 * c, t, 0.03); n.g.gain.setTargetAtTime(0.025 + 0.05 * c, t, 0.03);
  },
  ripperSet(v) {                                                   // sampled: a revving chainsaw loop crossfades to a cutting one on a bite
    if (!this.ctx) return;
    if (v > 0.01 && !this.ripNode && !this.muted) {
      const a = this.loopNode('ripperLoop', 0.03), b = a && this.loopNode('ripperBite', 0.03);
      if (a && b) {
        b.g.gain.cancelScheduledValues(this.ctx.currentTime); b.g.gain.value = 0.0001;
        this.ripNode = { bank: true, a, b };
      } else {
        if (a) a.nodes[0].stop();
        const x = this.ctx, g = x.createGain(); g.gain.value = 0.0001;   // two-stroke synth chug; lower and grindier on meat
        const o = x.createOscillator(); o.type = 'sawtooth';
        const lfo = x.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 30; const lg = x.createGain(); lg.gain.value = 0.5;
        const am = x.createGain(); am.gain.value = 0.5; lfo.connect(lg); lg.connect(am.gain);
        const f = x.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 3;
        const ns = x.createBufferSource(); ns.buffer = this.noiseBuf; ns.loop = true;
        const nf = x.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 2400; nf.Q.value = 1.2; const ng = x.createGain(); ng.gain.value = 0;
        o.connect(am); am.connect(f); f.connect(g); ns.connect(nf); nf.connect(ng); ng.connect(g); g.connect(this.out);
        o.start(); lfo.start(); ns.start();
        this.ripNode = { g, o, lfo, f, ns, ng, nodes: [o, lfo, ns] };
      }
    }
    const n = this.ripNode; if (!n) return;
    const t = this.ctx.currentTime, bite = v > 0.9;
    if (v <= 0.01) {
      this.ripNode = null;
      if (n.bank) for (const L of [n.a, n.b]) { L.g.gain.setTargetAtTime(0.0001, t, 0.04); L.nodes[0].stop(t + 0.3); }
      else { n.g.gain.setTargetAtTime(0.0001, t, 0.04); for (const s of n.nodes) s.stop(t + 0.3); }
      return;
    }
    if (n.bank) {
      n.a.g.gain.setTargetAtTime(this.bankGain.ripperLoop * (bite ? 0.3 : 1), t, 0.03);
      n.b.g.gain.setTargetAtTime(bite ? this.bankGain.ripperBite : 0.0001, t, 0.03);
      n.a.nodes[0].playbackRate.setTargetAtTime(bite ? 0.9 : 1.05, t, 0.05);
      return;
    }
    n.o.frequency.setTargetAtTime(bite ? 72 : 118, t, 0.03); n.lfo.frequency.setTargetAtTime(bite ? 22 : 34, t, 0.03);
    n.f.frequency.setTargetAtTime(bite ? 900 : 1500, t, 0.03); n.ng.gain.setTargetAtTime(bite ? 0.5 : 0.12, t, 0.03); n.g.gain.setTargetAtTime(bite ? 0.13 : 0.07, t, 0.03);
  },
  glaive() { if (!this.ok('glaive', 0.05)) return; if (this.smp('glaive')) return; this.noise({ filter: 'bandpass', f0: 2600, f1: 900, q: 2, dur: 0.18, vol: 0.2 }); this.tone({ type: 'triangle', f0: 1800, f1: 2400, dur: 0.1, vol: 0.05 }); },
  glaiveCatch() { if (!this.ok('gcatch', 0.05)) return; if (this.smp('glaiveCatch')) return; this.tone({ type: 'square', f0: 340, f1: 200, dur: 0.05, vol: 0.12 }); this.noise({ filter: 'highpass', f0: 2500, dur: 0.04, vol: 0.2 }); this.tone({ type: 'triangle', f0: 2600, dur: 0.12, vol: 0.05, delay: 0.02 }); },
  whirr(v) { if (!this.ok('whirr', 0.07)) return; if (this.smp('whirr', 0.5 + 0.5 * v)) return; this.noise({ filter: 'bandpass', f0: 1600 + 600 * v, q: 3, dur: 0.1, vol: 0.06 + 0.1 * v }); },
  sizzle() { if (!this.ok('sizzle', 0.25)) return; if (this.smp('sizzle')) return; this.noise({ filter: 'highpass', f0: 3500, f1: 6000, dur: 0.35, vol: 0.12 }); },
  splat(tier) { if (!this.ok('splat', 0.05)) return; if (this.smp('splat', [0.64, 1, 1.36][tier] || 1, { rate: [1.25, 1, 0.82][tier] || 1 })) return; this.noise({ filter: 'lowpass', f0: 900 + 300 * tier, f1: 200, dur: 0.14 + 0.05 * tier, vol: 0.18 + 0.1 * tier }); this.noise({ filter: 'highpass', f0: 4000, dur: 0.12, vol: 0.06 }); this.tone({ type: 'sine', f0: 140 - tier * 20, f1: 60, dur: 0.1, vol: 0.12 + tier * 0.06 }); },
  rumble(v) { if (!this.ok('rumble', 0.2)) return; if (this.smp('rumble', 0.25 + 0.75 * v)) return; this.noise({ filter: 'lowpass', f0: 220, f1: 120, q: 1.5, dur: 0.4, vol: 0.12 + 0.35 * v }); this.tone({ type: 'sine', f0: 48, f1: 40, dur: 0.35, vol: 0.12 * v }); },
  erupt() { if (!this.ok('erupt', 0.1)) return; if (this.smp('erupt')) return; this.noise({ filter: 'lowpass', f0: 2400, f1: 150, dur: 0.6, vol: 0.7, dest: this.crunch }); this.tone({ type: 'sawtooth', f0: 90, f1: 40, dur: 0.5, vol: 0.25 }); this.tone({ type: 'square', f0: 420, f1: 160, dur: 0.3, vol: 0.08, delay: 0.05 }); },
  dig() { if (!this.ok('dig', 0.1)) return; if (this.smp('dig')) return; this.noise({ filter: 'lowpass', f0: 1200, f1: 200, dur: 0.35, vol: 0.35 }); },
  chain() { if (!this.ok('chain', 0.08)) return; if (this.smp('chain')) return; for (let i = 0; i < 3; i++) this.tone({ type: 'square', f0: rand(1800, 2600), dur: 0.025, vol: 0.035, delay: i * 0.03 }); this.noise({ filter: 'highpass', f0: 5000, dur: 0.08, vol: 0.06 }); },
  linkOn() { if (!this.ok('linkon', 0.2)) return; if (this.smp('linkOn')) return; this.tone({ type: 'sawtooth', f0: 220, f1: 880, dur: 0.2, vol: 0.08 }); this.noise({ filter: 'bandpass', f0: 3000, q: 2, dur: 0.2, vol: 0.12 }); },
  buzz() { if (!this.ok('buzz', 0.14)) return; if (this.smp('buzz')) return; this.tone({ type: 'sawtooth', f0: 110 + rand(-6, 6), dur: 0.13, vol: 0.05 }); this.noise({ filter: 'bandpass', f0: 2600, q: 3, dur: 0.1, vol: 0.05 }); },
  // ---- crucible round ----
  execute() { if (!this.ok('exec', 0.08)) return; if (this.smp('execute')) return; this.noise({ filter: 'lowpass', f0: 1800, f1: 120, dur: 0.45, vol: 0.6, dest: this.crunch }); this.tone({ type: 'sine', f0: 90, f1: 35, dur: 0.4, vol: 0.5 }); this.noise({ filter: 'bandpass', f0: 900, q: 1.2, dur: 0.18, vol: 0.3, delay: 0.03 }); },
  hammerSlam(k = 1) { if (!this.ok('slam', 0.08)) return; if (this.smp('hammerSlam', 0.6 + 0.4 * k)) return; this.noise({ filter: 'lowpass', f0: 2600, f1: 90, dur: 0.6, vol: 0.5 + 0.4 * k, dest: this.crunch }); this.tone({ type: 'sine', f0: 110, f1: 28, dur: 0.55, vol: 0.4 + 0.4 * k }); this.tone({ type: 'square', f0: 260, f1: 80, dur: 0.12, vol: 0.12 }); },
  flak() { if (!this.ok('flak', 0.05)) return; if (this.smp('flak')) return; this.noise({ filter: 'lowpass', f0: 3800, f1: 220, dur: 0.35, vol: 0.65, dest: this.crunch }); this.tone({ type: 'sine', f0: 140, f1: 40, dur: 0.28, vol: 0.55 }); },
  flakBurst() { if (!this.ok('flakb', 0.04)) return; if (this.smp('flakBurst')) return; this.noise({ filter: 'highpass', f0: 1800, f1: 5000, dur: 0.12, vol: 0.3 }); this.tone({ type: 'square', f0: 900, f1: 300, dur: 0.06, vol: 0.06 }); this.noise({ filter: 'bandpass', f0: 2600, q: 2, dur: 0.25, vol: 0.12, delay: 0.03 }); },
  coilBoom() { if (!this.ok('coilb', 0.05)) return; if (this.smp('coilBoom')) return; this.noise({ filter: 'bandpass', f0: 2400, f1: 600, q: 0.8, dur: 0.4, vol: 0.45 }); this.tone({ type: 'sawtooth', f0: 1400, f1: 90, dur: 0.35, vol: 0.12 }); this.tone({ type: 'sine', f0: 100, f1: 40, dur: 0.3, vol: 0.3 }); },
  gnatPop() { if (!this.ok('gpop', 0.03)) return; if (this.smp('gnatPop')) return; this.noise({ filter: 'bandpass', f0: 2400, q: 2, dur: 0.05, vol: 0.12 }); this.tone({ type: 'square', f0: 1200, f1: 600, dur: 0.04, vol: 0.03 }); },
  stitch() { if (!this.ok('stitch', 0.25)) return; if (this.smp('stitch')) return; this.tone({ type: 'sine', f0: 180, f1: 240, dur: 0.3, vol: 0.06 }); this.tone({ type: 'triangle', f0: 720 + rand(-40, 40), dur: 0.25, vol: 0.03 }); },
  revive() { if (!this.ok('revive', 0.2)) return; if (this.smp('revive')) return; this.tone({ type: 'sawtooth', f0: 90, f1: 260, dur: 0.6, vol: 0.12 }); this.noise({ filter: 'bandpass', f0: 600, f1: 2400, q: 1.5, dur: 0.6, vol: 0.2 }); this.tone({ type: 'sine', f0: 330, f1: 660, dur: 0.5, vol: 0.06, delay: 0.1 }); },
  orb(n) { if (!this.ok('orb', 0.03)) return; const f = Math.pow(1.06, Math.min(n, 12)); this.tone({ type: 'square', f0: 660 * f, dur: 0.06, vol: 0.05 }); this.tone({ type: 'triangle', f0: 1320 * f, dur: 0.08, vol: 0.03, delay: 0.03 }); },
  swarmSet(v) {                                                    // gnat swarm drone: louder the more of them are around you
    if (!this.ctx) return;
    if (v > 0.02 && !this.swarmNode && !this.muted) {
      const L = this.loopNode('swarmLoop', 0.2);
      if (L) this.swarmNode = Object.assign(L, { bank: true });
      else {
        const x = this.ctx, g = x.createGain(); g.gain.value = 0.0001;
        const o = x.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 210; const o2 = x.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = 223;
        const lfo = x.createOscillator(); lfo.frequency.value = 13; const lg = x.createGain(); lg.gain.value = 18; lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
        const f = x.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 2;
        o.connect(f); o2.connect(f); f.connect(g); g.connect(this.out); o.start(); o2.start(); lfo.start();
        this.swarmNode = { g, nodes: [o, o2, lfo] };
      }
    }
    const n = this.swarmNode; if (!n) return;
    const t = this.ctx.currentTime;
    if (v <= 0.02) { this.swarmNode = null; n.g.gain.setTargetAtTime(0.0001, t, 0.15); for (const s of n.nodes) s.stop(t + 0.8); return; }
    n.g.gain.setTargetAtTime((n.bank ? this.bankGain.swarmLoop : 0.05) * v, t, 0.1);
  },
  // ---- gold round ----
  tether() { if (!this.ok('tth', 0.08)) return; if (this.smp('tether')) return; this.tone({ type: 'sine', f0: 1200, f1: 2400, dur: 0.12, vol: 0.05 }); this.tone({ type: 'triangle', f0: 600, f1: 900, dur: 0.15, vol: 0.03 }); },
  sprout() { if (!this.ok('spr', 0.2)) return; if (this.smp('sprout')) return; this.noise({ filter: 'lowpass', f0: 900, f1: 300, dur: 0.25, vol: 0.15 }); this.tone({ type: 'sine', f0: 200, f1: 500, dur: 0.2, vol: 0.05 }); },
  gatlingSpin() { if (!this.ok('gsp', 0.6)) return; if (this.smp('gatlingSpin')) return; this.tone({ type: 'sawtooth', f0: 80, f1: 600, dur: 0.9, vol: 0.05 }); },
  gatlingFire() { if (!this.ok('gfr', 0.06)) return; if (this.smp('gatlingFire')) return; this.noise({ filter: 'bandpass', f0: 1500, q: 1, dur: 0.05, vol: 0.18 }); },
  bannerPlant() { if (!this.ok('bnp', 0.5)) return; if (this.smp('bannerPlant')) return; this.noise({ filter: 'lowpass', f0: 1200, f1: 200, dur: 0.2, vol: 0.25 }); this.tone({ type: 'sine', f0: 520, f1: 780, dur: 0.3, vol: 0.05, delay: 0.1 }); },
  // ---- expansion: weapons (synth only) ----
  cannon() { if (!this.ok('xcan', 0.08)) return; this.noise({ filter: 'lowpass', f0: 2600, f1: 110, dur: 0.55, vol: 0.75, dest: this.crunch }); this.tone({ type: 'sine', f0: 130, f1: 32, dur: 0.45, vol: 0.6 }); this.tone({ type: 'square', f0: 260, f1: 70, dur: 0.1, vol: 0.1 }); },
  cannonHit(v = 1) { if (!this.ok('xcanh', 0.05)) return; this.tone({ type: 'sine', f0: 150, f1: 45, dur: 0.18, vol: 0.45 * v }); this.noise({ filter: 'lowpass', f0: 1300, f1: 200, dur: 0.16, vol: 0.35 * v }); },
  quake() { if (!this.ok('xqk', 0.1)) return; this.noise({ filter: 'lowpass', f0: 800, f1: 60, dur: 0.9, vol: 0.7, dest: this.crunch }); this.tone({ type: 'sine', f0: 75, f1: 28, dur: 0.8, vol: 0.55 }); this.tone({ type: 'sawtooth', f0: 52, f1: 38, dur: 0.6, vol: 0.07 }); },
  quakePop() { if (!this.ok('xqkp', 0.05)) return; this.noise({ filter: 'bandpass', f0: 500, f1: 1500, q: 1, dur: 0.12, vol: 0.3 }); this.tone({ type: 'sine', f0: 90, f1: 240, dur: 0.12, vol: 0.22 }); },
  phase() { if (!this.ok('xph', 0.05)) return; this.tone({ type: 'sine', f0: 1900, f1: 210, dur: 0.22, vol: 0.12 }); this.tone({ type: 'triangle', f0: 3700, f1: 900, dur: 0.15, vol: 0.04 }); this.noise({ filter: 'bandpass', f0: 5200, f1: 1600, q: 4, dur: 0.18, vol: 0.08 }); },
  phaseHit() { if (!this.ok('xphh', 0.04)) return; this.tone({ type: 'sine', f0: 900, f1: 1500, dur: 0.07, vol: 0.06 }); this.noise({ filter: 'highpass', f0: 4000, dur: 0.05, vol: 0.05 }); },
  ballLaunch() { if (!this.ok('xbl', 0.1)) return; this.tone({ type: 'sawtooth', f0: 80, f1: 260, dur: 0.35, vol: 0.08 }); this.noise({ filter: 'bandpass', f0: 2400, q: 2, dur: 0.3, vol: 0.12 }); this.tone({ type: 'sine', f0: 600, f1: 1200, dur: 0.25, vol: 0.05 }); },
  ballZap() { if (!this.ok('xblz', 0.06)) return; this.noise({ filter: 'highpass', f0: 2800, dur: 0.07, vol: 0.15 }); this.tone({ type: 'square', f0: 1300 + Math.random() * 500, f1: 500, dur: 0.05, vol: 0.035 }); },
  cycloneLaunch() { if (!this.ok('xcyl', 0.1)) return; this.noise({ filter: 'bandpass', f0: 500, f1: 2200, q: 1, dur: 0.3, vol: 0.25 }); this.tone({ type: 'sine', f0: 220, f1: 90, dur: 0.15, vol: 0.2 }); },
  cyclone(v = 1) { if (!this.ok('xcy', 0.35)) return; this.noise({ filter: 'bandpass', f0: 360, f1: 900, q: 1.3, dur: 0.5, vol: 0.18 * v, attack: 0.1 }); this.noise({ filter: 'bandpass', f0: 1900, f1: 1200, q: 3, dur: 0.45, vol: 0.06 * v, attack: 0.12 }); },
  caltrops() { if (!this.ok('xct', 0.08)) return; for (let i = 0; i < 5; i++) this.tone({ type: 'triangle', f0: 2400 + i * 260, f1: 1600, dur: 0.04, vol: 0.04, delay: i * 0.025 }); this.noise({ filter: 'highpass', f0: 3000, dur: 0.12, vol: 0.08 }); },
  caltropStab() { if (!this.ok('xcts', 0.06)) return; this.noise({ filter: 'bandpass', f0: 1700, q: 2, dur: 0.06, vol: 0.18 }); this.tone({ type: 'square', f0: 720, f1: 280, dur: 0.05, vol: 0.05 }); },
  spear() { if (!this.ok('xsp', 0.08)) return; this.tone({ type: 'triangle', f0: 190, f1: 85, dur: 0.25, vol: 0.22 }); this.noise({ filter: 'bandpass', f0: 1100, f1: 3200, q: 1.5, dur: 0.18, vol: 0.2 }); this.tone({ type: 'sawtooth', f0: 330, f1: 300, dur: 0.16, vol: 0.04 }); },
  spearReel() { if (!this.ok('xspr', 0.25)) return; for (let i = 0; i < 5; i++) this.tone({ type: 'square', f0: 1500 - i * 60, dur: 0.015, vol: 0.04, delay: i * 0.035 }); },
  overheat() { if (!this.ok('xhr', 0.5)) return; for (let i = 0; i < 3; i++) this.tone({ type: 'square', f0: 1300, f1: 1100, dur: 0.06, vol: 0.05, delay: i * 0.09 }); this.noise({ filter: 'highpass', f0: 2600, dur: 1.1, vol: 0.22, attack: 0.03 }); },
  beaconSet() { if (!this.ok('xbcs', 0.2)) return; this.tone({ type: 'square', f0: 900, f1: 1800, dur: 0.1, vol: 0.05 }); this.noise({ filter: 'lowpass', f0: 1200, dur: 0.08, vol: 0.12 }); },
  beaconPing(n = 0) { if (!this.ok('xbcp', 0.05)) return; this.tone({ type: 'square', f0: 1600 + n * 120, dur: 0.04, vol: 0.045 }); },
  heatSet(v) {                                                     // the heat ray's hum: it climbs in pitch and grit as the beam locks on
    if (!this.ctx) return;
    if (v > 0.02 && !this.heatNode && !this.muted) {
      const c = this.ctx, g = c.createGain(); g.gain.value = 0.0001;
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 120;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600; f.Q.value = 4;
      const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
      const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 2400; nf.Q.value = 1.2; const ng = c.createGain(); ng.gain.value = 0.5;
      o.connect(f); f.connect(g); src.connect(nf); nf.connect(ng); ng.connect(g); g.connect(this.out); o.start(); src.start();
      this.heatNode = { g, o, f, nodes: [o, src] };
    }
    const n = this.heatNode; if (!n) return;
    const t = this.ctx.currentTime;
    if (v <= 0.02) { this.heatNode = null; n.g.gain.setTargetAtTime(0.0001, t, 0.05); for (const s of n.nodes) s.stop(t + 0.3); return; }
    n.g.gain.setTargetAtTime(0.05 + 0.05 * v, t, 0.04); n.o.frequency.setTargetAtTime(110 + 170 * v, t, 0.08); n.f.frequency.setTargetAtTime(500 + 1600 * v, t, 0.08);
  },
  hydroSet(on) {                                                   // the hydro cannon's jet: a hard hiss over a low rush
    if (!this.ctx) return;
    if (on && !this.hydroNode && !this.muted) {
      const c = this.ctx, g = c.createGain(); g.gain.value = 0.0001;
      const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1700; f.Q.value = 0.6;
      const src2 = c.createBufferSource(); src2.buffer = this.noiseBuf; src2.loop = true; const f2 = c.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 300;
      const lfo = c.createOscillator(); lfo.frequency.value = 17; const lg = c.createGain(); lg.gain.value = 0.025;
      src.connect(f); f.connect(g); src2.connect(f2); f2.connect(g); lfo.connect(lg); lg.connect(g.gain); g.connect(this.out);
      src.start(0, Math.random()); src2.start(0, Math.random()); lfo.start(); g.gain.setTargetAtTime(0.14, c.currentTime, 0.03);
      this.hydroNode = { g, nodes: [src, src2, lfo] };
    } else if (!on && this.hydroNode) {
      const a = this.hydroNode, t = this.ctx.currentTime; this.hydroNode = null;
      a.g.gain.setTargetAtTime(0.0001, t, 0.05); a.nodes.forEach(n => n.stop(t + 0.3));
    }
  },
  // ---- powerhouse round ----
  nuke() { if (!this.ok('nuk', 0.3)) return; if (this.smp('nuke')) return; this.noise({ filter: 'lowpass', f0: 2500, f1: 60, dur: 1.8, vol: 0.8, dest: this.crunch }); this.tone({ type: 'sine', f0: 60, f1: 25, dur: 1.6, vol: 0.6 }); },
  dragon() { if (!this.ok('drg', 0.1)) return; if (this.smp('dragon')) return; this.noise({ filter: 'lowpass', f0: 4000, f1: 600, dur: 0.4, vol: 0.45 }); this.noise({ filter: 'bandpass', f0: 900, f1: 1800, q: 0.8, dur: 0.5, vol: 0.2, delay: 0.04 }); },
  railHum() { if (!this.ok('rlh', 1)) return; if (this.smp('railHum')) return; this.tone({ type: 'sawtooth', f0: 60, f1: 120, dur: 1.2, vol: 0.06 }); this.noise({ filter: 'highpass', f0: 3500, dur: 1.2, vol: 0.03 }); },
  dozer() { if (!this.ok('dzr', 0.6)) return; if (this.smp('dozer')) return; this.tone({ type: 'sawtooth', f0: 55, f1: 62, dur: 0.6, vol: 0.08 }); this.noise({ filter: 'lowpass', f0: 400, dur: 0.6, vol: 0.12 }); },
  jellyZap() { if (!this.ok('jlz', 0.15)) return; if (this.smp('jellyZap')) return; this.noise({ filter: 'highpass', f0: 2500, dur: 0.12, vol: 0.15 }); this.tone({ type: 'square', f0: 900, f1: 1400, dur: 0.08, vol: 0.04 }); },
  // ---- rush round ----
  shieldBlock() { if (!this.ok('shb', 0.05)) return; if (this.smp('shieldBlock')) return; this.noise({ filter: 'bandpass', f0: 1800, q: 3, dur: 0.12, vol: 0.2 }); this.tone({ type: 'square', f0: 1200, f1: 900, dur: 0.06, vol: 0.05 }); },
  glue() { if (!this.ok('glu', 0.06)) return; if (this.smp('glue')) return; this.noise({ filter: 'lowpass', f0: 1400, f1: 500, dur: 0.12, vol: 0.18 }); },
  quills() { if (!this.ok('qul', 0.1)) return; if (this.smp('quills')) return; for (let i = 0; i < 5; i++) this.noise({ filter: 'highpass', f0: 3500, dur: 0.05, vol: 0.08, delay: i * 0.02 }); },
  spit() { if (!this.ok('spt', 0.2)) return; if (this.smp('spit')) return; this.noise({ filter: 'bandpass', f0: 700, f1: 1500, q: 1, dur: 0.3, vol: 0.3 }); },
  leap() { if (!this.ok('lep', 0.2)) return; if (this.smp('leap')) return; this.tone({ type: 'sawtooth', f0: 120, f1: 400, dur: 0.25, vol: 0.08 }); this.noise({ filter: 'bandpass', f0: 900, q: 1, dur: 0.2, vol: 0.12 }); },
  // ---- debrief round ----
  bubble() { if (!this.ok('bub', 0.08)) return; if (this.smp('bubble')) return; this.tone({ type: 'sine', f0: 400, f1: 900, dur: 0.1, vol: 0.06 }); },
  bubblePop() { if (!this.ok('bbp', 0.05)) return; if (this.smp('bubblePop')) return; this.tone({ type: 'sine', f0: 1400, f1: 600, dur: 0.06, vol: 0.08 }); this.noise({ filter: 'highpass', f0: 3000, dur: 0.04, vol: 0.06 }); },
  zealotCast() { if (!this.ok('zlc', 0.3)) return; if (this.smp('zealotCast')) return; this.tone({ type: 'sine', f0: 440, f1: 440, dur: 0.5, vol: 0.05 }); this.tone({ type: 'sine', f0: 660, f1: 660, dur: 0.5, vol: 0.035 }); },
  soul() { if (!this.ok('sol', 0.15)) return; if (this.smp('soul')) return; this.tone({ type: 'sine', f0: 800, f1: 1600, dur: 0.3, vol: 0.04 }); this.noise({ filter: 'bandpass', f0: 2000, q: 4, dur: 0.3, vol: 0.04 }); },
  squeak() { if (!this.ok('sqk', 0.12)) return; if (this.smp('squeak')) return; this.tone({ type: 'square', f0: 2200, f1: 2800, dur: 0.05, vol: 0.03 }); },
  // ---- mutator round ----
  tripSet() { if (!this.ok('trs', 0.1)) return; if (this.smp('tripSet')) return; this.tone({ type: 'square', f0: 900, f1: 1800, dur: 0.12, vol: 0.05 }); this.tone({ type: 'sine', f0: 1800, f1: 1800, dur: 0.2, vol: 0.03, delay: 0.12 }); },
  dronePod() { if (!this.ok('drp', 0.3)) return; if (this.smp('dronePod')) return; this.tone({ type: 'sawtooth', f0: 200, f1: 600, dur: 0.4, vol: 0.06 }); this.noise({ filter: 'bandpass', f0: 1200, q: 2, dur: 0.4, vol: 0.08 }); },
  axeChop() { if (!this.ok('axc', 0.1)) return; if (this.smp('axeChop')) return; this.noise({ filter: 'lowpass', f0: 2200, f1: 150, dur: 0.4, vol: 0.55 }); this.tone({ type: 'sine', f0: 90, f1: 40, dur: 0.3, vol: 0.4 }); },
  berserk() { if (!this.ok('brs', 0.5)) return; if (this.smp('berserk')) return; this.tone({ type: 'sawtooth', f0: 160, f1: 90, dur: 0.6, vol: 0.12 }); this.noise({ filter: 'bandpass', f0: 600, q: 1, dur: 0.6, vol: 0.15 }); },
  hardlight() { if (!this.ok('hlt', 0.3)) return; if (this.smp('hardlight')) return; this.tone({ type: 'sine', f0: 300, f1: 1200, dur: 0.3, vol: 0.06 }); this.tone({ type: 'triangle', f0: 1200, f1: 1200, dur: 0.3, vol: 0.03, delay: 0.25 }); },
  // ---- foreman round ----
  gauntlet() { if (!this.ok('gnt', 0.1)) return; if (this.smp('gauntlet')) return; this.noise({ filter: 'bandpass', f0: 600, f1: 2200, q: 1, dur: 0.25, vol: 0.3 }); this.tone({ type: 'sawtooth', f0: 120, f1: 260, dur: 0.2, vol: 0.06 }); },
  punchHit() { if (!this.ok('pnh', 0.08)) return; if (this.smp('punchHit')) return; this.noise({ filter: 'lowpass', f0: 1800, f1: 150, dur: 0.3, vol: 0.55 }); this.tone({ type: 'sine', f0: 110, f1: 40, dur: 0.25, vol: 0.45 }); },
  marksman() { if (!this.ok('mks', 0.1)) return; if (this.smp('marksman')) return; this.noise({ filter: 'lowpass', f0: 5000, f1: 500, dur: 0.5, vol: 0.5 }); this.tone({ type: 'square', f0: 220, f1: 60, dur: 0.15, vol: 0.12 }); },
  shuriken() { if (!this.ok('shk', 0.15)) return; if (this.smp('shuriken')) return; this.noise({ filter: 'highpass', f0: 2500, f1: 4500, dur: 0.15, vol: 0.12 }); },
  thunder() { if (!this.ok('thd', 0.2)) return; if (this.smp('thunder')) return; this.noise({ filter: 'highpass', f0: 1200, f1: 300, dur: 0.2, vol: 0.4 }); this.noise({ filter: 'lowpass', f0: 600, f1: 80, dur: 1.0, vol: 0.4, delay: 0.05 }); },
  // ---- armory round ----
  stasis() { if (!this.ok('sts', 0.2)) return; if (this.smp('stasis')) return; this.tone({ type: 'sine', f0: 900, f1: 120, dur: 0.5, vol: 0.12 }); this.noise({ filter: 'highpass', f0: 3000, dur: 0.4, vol: 0.06 }); },
  stasisEnd() { if (!this.ok('ste', 0.2)) return; if (this.smp('stasisEnd')) return; this.tone({ type: 'sine', f0: 120, f1: 900, dur: 0.3, vol: 0.12 }); this.noise({ filter: 'lowpass', f0: 2000, f1: 200, dur: 0.3, vol: 0.2 }); },
  microwave() { if (!this.ok('mwv', 0.3)) return; if (this.smp('microwave')) return; this.tone({ type: 'sawtooth', f0: 60, f1: 62, dur: 0.32, vol: 0.05 }); this.tone({ type: 'sine', f0: 2400, f1: 2300, dur: 0.3, vol: 0.02 }); },
  mwPop() { if (!this.ok('mwp', 0.06)) return; if (this.smp('mwPop')) return; this.noise({ filter: 'lowpass', f0: 2600, f1: 300, dur: 0.3, vol: 0.45 }); this.tone({ type: 'sine', f0: 180, f1: 60, dur: 0.2, vol: 0.3 }); },
  vortexSpin() { if (!this.ok('vtx', 0.5)) return; if (this.smp('vortexSpin')) return; this.noise({ filter: 'bandpass', f0: 400, f1: 1600, q: 1.5, dur: 1.2, vol: 0.14 }); },
  pylonCharge() { if (!this.ok('plc', 0.8)) return; if (this.smp('pylonCharge')) return; this.tone({ type: 'sawtooth', f0: 80, f1: 400, dur: 1.2, vol: 0.04 }); this.noise({ filter: 'highpass', f0: 4000, dur: 1.2, vol: 0.03 }); },
  pylonZap() { if (!this.ok('plz', 0.1)) return; if (this.smp('pylonZap')) return; this.noise({ filter: 'highpass', f0: 1500, f1: 400, dur: 0.35, vol: 0.45 }); this.tone({ type: 'square', f0: 120, f1: 40, dur: 0.3, vol: 0.1 }); },
  chomp() { if (!this.ok('chm', 0.25)) return; if (this.smp('chomp')) return; this.noise({ filter: 'lowpass', f0: 1200, f1: 300, dur: 0.15, vol: 0.25 }); },
  // ---- wrecking-yard round ----
  wreckSwing() { if (!this.ok('wsw', 1)) return; if (this.smp('wreckSwing')) return; this.noise({ filter: 'bandpass', f0: 300, f1: 700, q: 0.8, dur: 0.6, vol: 0.18 }); },
  wreckHit() { if (!this.ok('wht', 0.1)) return; if (this.smp('wreckHit')) return; this.noise({ filter: 'lowpass', f0: 1500, f1: 120, dur: 0.4, vol: 0.5 }); this.tone({ type: 'square', f0: 220, f1: 90, dur: 0.25, vol: 0.12 }); this.tone({ type: 'sine', f0: 70, f1: 40, dur: 0.35, vol: 0.4 }); },
  creak() { if (!this.ok('crk2', 0.8)) return; if (this.smp('creak')) return; this.tone({ type: 'sawtooth', f0: 190, f1: 150, dur: 0.5, vol: 0.03 }); this.noise({ filter: 'bandpass', f0: 900, q: 6, dur: 0.4, vol: 0.05 }); },
  split() { if (!this.ok('spl', 0.05)) return; if (this.smp('split')) return; this.tone({ type: 'square', f0: 1800, f1: 600, dur: 0.12, vol: 0.06 }); this.noise({ filter: 'highpass', f0: 3000, dur: 0.08, vol: 0.1 }); },
  splitPop() { if (!this.ok('spp', 0.04)) return; if (this.smp('splitPop')) return; this.tone({ type: 'triangle', f0: 2400, f1: 3200, dur: 0.06, vol: 0.05 }); },
  decoy() { if (!this.ok('dco', 0.3)) return; if (this.smp('decoy')) return; this.tone({ type: 'sine', f0: 600, f1: 1200, dur: 0.25, vol: 0.06 }); this.tone({ type: 'square', f0: 1200, f1: 1200, dur: 0.05, vol: 0.04, delay: 0.25 }); },
  discThrow() { if (!this.ok('dsc', 0.2)) return; if (this.smp('discThrow')) return; this.noise({ filter: 'bandpass', f0: 2000, f1: 1200, q: 2, dur: 0.3, vol: 0.12 }); },
  sporePuff() { if (!this.ok('spf', 0.3)) return; if (this.smp('sporePuff')) return; this.noise({ filter: 'lowpass', f0: 1200, f1: 300, dur: 0.3, vol: 0.2 }); },
  // ---- elite round ----
  vacuum() { if (!this.ok('vac', 0.25)) return; if (this.smp('vacuum')) return; this.noise({ filter: 'bandpass', f0: 700, f1: 900, q: 0.7, dur: 0.32, vol: 0.12 }); this.tone({ type: 'sawtooth', f0: 110, f1: 120, dur: 0.3, vol: 0.03 }); },
  scrapBlast() { if (!this.ok('scb', 0.1)) return; if (this.smp('scrapBlast')) return; this.noise({ filter: 'lowpass', f0: 3000, f1: 400, dur: 0.35, vol: 0.4 }); this.tone({ type: 'square', f0: 160, f1: 60, dur: 0.2, vol: 0.12 }); for (let i = 0; i < 4; i++) this.noise({ filter: 'highpass', f0: 2500, dur: 0.04, vol: 0.1, delay: 0.04 + i * 0.05 }); },
  siphon() { if (!this.ok('sip', 0.25)) return; if (this.smp('siphon')) return; this.tone({ type: 'sine', f0: 220, f1: 180, dur: 0.35, vol: 0.06 }); this.noise({ filter: 'bandpass', f0: 500, q: 3, dur: 0.3, vol: 0.06 }); },
  grab() { if (!this.ok('grab', 0.2)) return; if (this.smp('grab')) return; this.noise({ filter: 'lowpass', f0: 900, f1: 200, dur: 0.25, vol: 0.4 }); this.tone({ type: 'sine', f0: 90, f1: 50, dur: 0.2, vol: 0.3 }); },
  spotted() { if (!this.ok('spot', 0.6)) return; if (this.smp('spotted')) return; for (let i = 0; i < 2; i++) this.tone({ type: 'square', f0: 1400, f1: 1400, dur: 0.07, vol: 0.06, delay: i * 0.11 }); },
  bark() { if (!this.ok('bark', 0.15)) return; if (this.smp('bark')) return; this.tone({ type: 'sawtooth', f0: 420, f1: 180, dur: 0.12, vol: 0.12 }); this.noise({ filter: 'bandpass', f0: 1200, q: 2, dur: 0.1, vol: 0.12 }); },
  shieldPop() { if (!this.ok('shp', 0.1)) return; if (this.smp('shieldPop')) return; this.noise({ filter: 'highpass', f0: 2000, dur: 0.25, vol: 0.2 }); this.tone({ type: 'sine', f0: 1600, f1: 300, dur: 0.25, vol: 0.08 }); },
  // ---- arsenal round ----
  firework() { if (!this.ok('fwl', 0.05)) return; if (this.smp('firework')) return; this.noise({ filter: 'bandpass', f0: 1200, f1: 3800, q: 2, dur: 0.35, vol: 0.12 }); this.tone({ type: 'sine', f0: 900, f1: 2400, dur: 0.3, vol: 0.05 }); },
  fireworkPop() { if (!this.ok('fwp', 0.04)) return; if (this.smp('fireworkPop')) return; this.noise({ filter: 'lowpass', f0: 2400, f1: 300, dur: 0.3, vol: 0.35 }); this.tone({ type: 'sine', f0: 140, f1: 50, dur: 0.25, vol: 0.3 }); },
  crackle() { if (!this.ok('crk', 0.1)) return; if (this.smp('crackle')) return; for (let i = 0; i < 6; i++) this.noise({ filter: 'highpass', f0: 3000, dur: 0.03, vol: 0.12, delay: i * 0.05 + Math.random() * 0.03 }); },
  katana() { if (!this.ok('kat', 0.05)) return; if (this.smp('katana')) return; this.noise({ filter: 'bandpass', f0: 2600, f1: 900, q: 1.5, dur: 0.14, vol: 0.2 }); this.tone({ type: 'sine', f0: 1800, f1: 2600, dur: 0.12, vol: 0.03 }); },
  slashHit() { if (!this.ok('slh', 0.05)) return; if (this.smp('slashHit')) return; this.noise({ filter: 'lowpass', f0: 3000, f1: 600, dur: 0.12, vol: 0.3 }); },
  swapTell() { if (!this.ok('swt', 0.5)) return; if (this.smp('swapTell')) return; this.tone({ type: 'sine', f0: 300, f1: 900, dur: 0.8, vol: 0.06 }); this.tone({ type: 'triangle', f0: 310, f1: 930, dur: 0.8, vol: 0.04 }); },
  swapZap() { if (!this.ok('swz', 0.2)) return; if (this.smp('swapZap')) return; this.tone({ type: 'square', f0: 200, f1: 1600, dur: 0.18, vol: 0.06 }); this.tone({ type: 'sine', f0: 1600, f1: 200, dur: 0.25, vol: 0.08, delay: 0.12 }); },
  scorch() { if (!this.ok('sco', 0.3)) return; if (this.smp('scorch')) return; this.noise({ filter: 'bandpass', f0: 500, f1: 1400, q: 0.8, dur: 0.6, vol: 0.2 }); },
  plateBreak() { if (!this.ok('plb', 0.08)) return; if (this.smp('plateBreak')) return; this.noise({ filter: 'highpass', f0: 1500, dur: 0.2, vol: 0.25 }); this.tone({ type: 'square', f0: 700, f1: 200, dur: 0.15, vol: 0.06 }); },
  // ---- finale round ----
  gravPulse() { if (!this.ok('grav', 0.1)) return; if (this.smp('gravPulse')) return; this.tone({ type: 'sine', f0: 60, f1: 220, dur: 0.4, vol: 0.4 }); this.tone({ type: 'triangle', f0: 900, f1: 200, dur: 0.3, vol: 0.06 }); },
  pinball(k = 0) { if (!this.ok('pinb', 0.04)) return; const r = 1 + Math.min(k, 10) * 0.05; if (this.smp('pinball', 1, { rate: r })) return; this.tone({ type: 'triangle', f0: 1200 * r, f1: 900 * r, dur: 0.12, vol: 0.12 }); this.tone({ type: 'square', f0: 300, dur: 0.05, vol: 0.05 }); },
  wail(v = 1) { if (!this.ok('wail', 0.3)) return; if (this.smp('wail', v)) return; this.tone({ type: 'sine', f0: 500, f1: 1300, dur: 0.5, vol: 0.08 * v }); this.tone({ type: 'sine', f0: 520, f1: 1240, dur: 0.5, vol: 0.06 * v }); },
  iceForm() { if (!this.ok('ice', 0.08)) return; if (this.smp('iceForm')) return; this.noise({ filter: 'highpass', f0: 4000, dur: 0.3, vol: 0.12 }); this.tone({ type: 'triangle', f0: 2400, f1: 3200, dur: 0.15, vol: 0.04 }); },
  warhorn() { if (!this.ok('horn', 0.5)) return; if (this.smp('warhorn')) return; this.tone({ type: 'sawtooth', f0: 110, f1: 116, dur: 0.9, vol: 0.12 }); this.tone({ type: 'sawtooth', f0: 165, f1: 172, dur: 0.9, vol: 0.06 }); },
  multi(n) {                                                // multikill sting: climbs a step for every kill in the chain
    if (!this.ok('multi', 0.08)) return;
    const f = 330 * Math.pow(1.122, Math.min(n, 8));
    this.tone({ type: 'square', f0: f, f1: f * 1.5, dur: 0.12, vol: 0.06 }); this.tone({ type: 'sawtooth', f0: f / 2, dur: 0.2, vol: 0.05, delay: 0.03 });
    if (n >= 4) this.noise({ filter: 'highpass', f0: 3000, dur: 0.25, vol: 0.05 });
  },
  // ---- mastery round ----
  shrink() { if (!this.ok('shrnk', 0.08)) return; if (this.smp('shrink')) return; this.tone({ type: 'sine', f0: 1800, f1: 400, dur: 0.25, vol: 0.12 }); this.tone({ type: 'square', f0: 900, f1: 200, dur: 0.2, vol: 0.04 }); },
  sonic() { if (!this.ok('sonic', 0.1)) return; if (this.smp('sonic')) return; this.tone({ type: 'sine', f0: 120, f1: 40, dur: 0.35, vol: 0.6 }); this.noise({ filter: 'lowpass', f0: 900, f1: 100, dur: 0.3, vol: 0.4, dest: this.crunch }); },
  laser() { if (!this.ok('laser', 0.3)) return; if (this.smp('laser')) return; this.tone({ type: 'sawtooth', f0: 600, f1: 640, dur: 1.1, vol: 0.06 }); this.noise({ filter: 'bandpass', f0: 2500, q: 2, dur: 1.1, vol: 0.08 }); },
  // ---- supply round ----
  powerup() { if (!this.ok('pwr', 0.2)) return; if (this.smp('powerup')) return; [523, 784, 1046, 1568].forEach((f, i) => this.tone({ type: 'square', f0: f, dur: 0.1, vol: 0.06, delay: i * 0.05 })); this.noise({ filter: 'highpass', f0: 4000, dur: 0.2, vol: 0.06 }); },
  whip() { if (!this.ok('whip', 0.08)) return; if (this.smp('whip')) return; this.noise({ filter: 'bandpass', f0: 1500, f1: 5000, q: 2, dur: 0.12, vol: 0.4 }); this.tone({ type: 'sawtooth', f0: 800, f1: 2400, dur: 0.08, vol: 0.06 }); },
  bees() { if (!this.ok('bees', 0.15)) return; if (this.smp('bees')) return; for (let i = 0; i < 3; i++) this.tone({ type: 'sawtooth', f0: 220 + i * 17, dur: 0.3, vol: 0.03, delay: i * 0.02 }); },
  // ---- codex round ----
  alarm() { if (!this.ok('alarm', 0.4)) return; if (this.smp('alarm')) return; [880, 660, 880, 660].forEach((f, i) => this.tone({ type: 'square', f0: f, dur: 0.1, vol: 0.06, delay: i * 0.12 })); },
  squelch() { if (!this.ok('squel', 0.08)) return; if (this.smp('squelch')) return; this.noise({ filter: 'lowpass', f0: 1100, f1: 250, dur: 0.18, vol: 0.3 }); this.tone({ type: 'sine', f0: 200, f1: 80, dur: 0.12, vol: 0.15 }); },
  suck() { if (!this.ok('suck', 0.3)) return; if (this.smp('suck')) return; this.noise({ filter: 'bandpass', f0: 600, f1: 1400, q: 2, dur: 0.25, vol: 0.2 }); this.tone({ type: 'sine', f0: 300, f1: 150, dur: 0.2, vol: 0.08 }); },
  // ---- overtime round ----
  orbital() { if (!this.ok('orb2', 0.3)) return; if (this.smp('orbital')) return; this.noise({ filter: 'lowpass', f0: 2500, f1: 200, dur: 1.1, vol: 0.7, dest: this.crunch }); this.tone({ type: 'sawtooth', f0: 220, f1: 60, dur: 1.0, vol: 0.12 }); this.tone({ type: 'sine', f0: 50, dur: 1.0, vol: 0.4 }); },
  paint() { if (!this.ok('paint', 0.15)) return; this.tone({ type: 'square', f0: 1600, dur: 0.04, vol: 0.04 }); },
  cutter() { if (!this.ok('cut', 0.06)) return; if (this.smp('cutter')) return; this.tone({ type: 'sawtooth', f0: 2600, f1: 900, dur: 0.18, vol: 0.08 }); this.noise({ filter: 'bandpass', f0: 4000, q: 2, dur: 0.12, vol: 0.12 }); },
  boing() { if (!this.ok('boing', 0.1)) return; if (this.smp('boing')) return; this.tone({ type: 'sine', f0: 180, f1: 520, dur: 0.18, vol: 0.18 }); this.tone({ type: 'triangle', f0: 360, f1: 900, dur: 0.12, vol: 0.05 }); },
  snatch() { if (!this.ok('snatch', 0.2)) return; if (this.smp('snatch')) return; this.noise({ filter: 'bandpass', f0: 1800, f1: 3500, q: 1.5, dur: 0.15, vol: 0.25 }); this.tone({ type: 'square', f0: 900, f1: 1500, dur: 0.1, vol: 0.05, delay: 0.05 }); },
  // ---- sorting line round ----
  net() { if (!this.ok('net', 0.1)) return; if (this.smp('net')) return; this.noise({ filter: 'lowpass', f0: 900, f1: 300, dur: 0.2, vol: 0.35 }); this.tone({ type: 'sine', f0: 160, f1: 70, dur: 0.15, vol: 0.2 }); },
  press() { if (!this.ok('press', 0.12)) return; if (this.smp('press')) return; this.noise({ filter: 'lowpass', f0: 1500, f1: 100, dur: 0.5, vol: 0.8, dest: this.crunch }); this.tone({ type: 'sine', f0: 60, f1: 30, dur: 0.4, vol: 0.5 }); this.noise({ filter: 'highpass', f0: 3000, dur: 0.3, vol: 0.12, delay: 0.1 }); },
  clank() { if (!this.ok('clank', 0.1)) return; if (this.smp('clank')) return; this.tone({ type: 'square', f0: 300, f1: 180, dur: 0.08, vol: 0.08 }); this.noise({ filter: 'bandpass', f0: 2500, q: 3, dur: 0.12, vol: 0.2 }); },
  golem() { if (!this.ok('golem', 0.8)) return; if (this.smp('golem')) return; this.tone({ type: 'sawtooth', f0: 70, f1: 45, dur: 0.6, vol: 0.12 }); this.noise({ filter: 'lowpass', f0: 600, dur: 0.6, vol: 0.3 }); },
  // ---- ironclad round ----
  flare() { if (!this.ok('flare', 0.08)) return; if (this.smp('flare')) return; this.noise({ filter: 'bandpass', f0: 900, f1: 2400, q: 1, dur: 0.3, vol: 0.3 }); this.tone({ type: 'sine', f0: 400, f1: 900, dur: 0.2, vol: 0.06 }); },
  limpet() { if (!this.ok('limp', 0.06)) return; if (this.smp('limpet')) return; this.tone({ type: 'sine', f0: 220, f1: 90, dur: 0.12, vol: 0.25 }); this.noise({ filter: 'lowpass', f0: 1200, dur: 0.08, vol: 0.12 }); },
  stick() { if (!this.ok('stick', 0.04)) return; this.tone({ type: 'square', f0: 900, f1: 600, dur: 0.04, vol: 0.04 }); this.noise({ filter: 'lowpass', f0: 2000, dur: 0.05, vol: 0.08 }); },
  steam() { if (!this.ok('steam', 0.3)) return; if (this.smp('steam')) return; this.noise({ filter: 'highpass', f0: 2500, dur: 1.2, vol: 0.3 }); this.noise({ filter: 'bandpass', f0: 1200, q: 0.8, dur: 0.4, vol: 0.2 }); },
  emp() { if (!this.ok('emp', 0.2)) return; if (this.smp('emp')) return; this.tone({ type: 'sawtooth', f0: 1400, f1: 80, dur: 0.5, vol: 0.12 }); this.noise({ filter: 'bandpass', f0: 3000, q: 1, dur: 0.4, vol: 0.2 }); this.tone({ type: 'sine', f0: 90, f1: 40, dur: 0.4, vol: 0.3 }); },
  jammed() { if (!this.ok('jamd', 0.5)) return; if (this.smp('jammed')) return; this.noise({ filter: 'bandpass', f0: 2000, q: 0.5, dur: 0.6, vol: 0.18 }); for (let i = 0; i < 5; i++) this.tone({ type: 'square', f0: rand(300, 900), dur: 0.03, vol: 0.04, delay: i * 0.1 }); },
  roll() { if (!this.ok('roll', 0.25)) return; if (this.smp('roll')) return; this.noise({ filter: 'lowpass', f0: 500, dur: 0.3, vol: 0.25 }); this.tone({ type: 'sine', f0: 70, f1: 50, dur: 0.3, vol: 0.15 }); },
  skitter() { if (!this.ok('skit', 0.2)) return; if (this.smp('skitter')) return; for (let i = 0; i < 4; i++) this.noise({ filter: 'highpass', f0: 3000, dur: 0.02, vol: 0.08, delay: i * 0.04 }); },
  // ---- slagforge round ----
  drill() { if (!this.ok('drill', 0.1)) return; if (this.smp('drill')) return; this.tone({ type: 'sawtooth', f0: 180, f1: 230, dur: 0.12, vol: 0.06 }); this.noise({ filter: 'bandpass', f0: 2200, q: 2, dur: 0.1, vol: 0.12 }); },
  drillFire() { if (!this.ok('drillf', 0.1)) return; if (this.smp('drillFire')) return; this.noise({ filter: 'lowpass', f0: 1400, f1: 300, dur: 0.25, vol: 0.4 }); this.tone({ type: 'sawtooth', f0: 220, f1: 420, dur: 0.3, vol: 0.06 }); },
  revolver() { if (!this.ok('rev', 0.05)) return; if (this.smp('revolver')) return; this.noise({ filter: 'lowpass', f0: 4000, f1: 400, dur: 0.22, vol: 0.55, dest: this.crunch }); this.tone({ type: 'sine', f0: 180, f1: 60, dur: 0.15, vol: 0.35 }); },
  revReload() { if (!this.ok('revr', 0.3)) return; if (this.smp('revReload')) return; for (let i = 0; i < 6; i++) this.tone({ type: 'square', f0: 2400 - i * 100, dur: 0.02, vol: 0.03, delay: i * 0.08 }); this.noise({ filter: 'highpass', f0: 3000, dur: 0.1, vol: 0.06, delay: 0.5 }); },
  revClick() { if (!this.ok('revc', 0.2)) return; this.tone({ type: 'square', f0: 1800, dur: 0.03, vol: 0.05 }); this.tone({ type: 'square', f0: 1200, dur: 0.03, vol: 0.05, delay: 0.05 }); },
  gasPop() { if (!this.ok('gpop2', 0.08)) return; if (this.smp('gasPop')) return; this.noise({ filter: 'lowpass', f0: 1500, f1: 200, dur: 0.3, vol: 0.4 }); this.noise({ filter: 'highpass', f0: 2500, dur: 0.6, vol: 0.12, delay: 0.05 }); },
  gasBoom() { if (!this.ok('gboom', 0.1)) return; if (this.smp('gasBoom')) return; this.noise({ filter: 'lowpass', f0: 1200, f1: 100, dur: 1.0, vol: 0.8, dest: this.crunch }); this.tone({ type: 'sine', f0: 70, f1: 25, dur: 0.8, vol: 0.5 }); },
  weld() { if (!this.ok('weld', 0.12)) return; if (this.smp('weld')) return; this.noise({ filter: 'bandpass', f0: 5000, q: 1, dur: 0.12, vol: 0.06 }); this.tone({ type: 'square', f0: rand(80, 120), dur: 0.08, vol: 0.02 }); },
  slash() { if (!this.ok('slash', 0.08)) return; if (this.smp('slash')) return; this.noise({ filter: 'bandpass', f0: 3000, f1: 1200, q: 2, dur: 0.14, vol: 0.25 }); this.tone({ type: 'triangle', f0: 1800, f1: 3400, dur: 0.1, vol: 0.04 }); },
  // ---- shockworks round ----
  shockOrb() { if (!this.ok('sorb', 0.08)) return; if (this.smp('shockOrb')) return; this.tone({ type: 'sine', f0: 900, f1: 300, dur: 0.25, vol: 0.12 }); this.tone({ type: 'square', f0: 450, f1: 150, dur: 0.2, vol: 0.04 }); this.noise({ filter: 'bandpass', f0: 3000, q: 2, dur: 0.15, vol: 0.06 }); },
  shockBeam() { if (!this.ok('sbeam', 0.06)) return; if (this.smp('shockBeam')) return; this.noise({ filter: 'bandpass', f0: 2600, f1: 800, q: 1.5, dur: 0.25, vol: 0.35 }); this.tone({ type: 'sawtooth', f0: 1800, f1: 200, dur: 0.22, vol: 0.08 }); this.tone({ type: 'sine', f0: 160, f1: 60, dur: 0.18, vol: 0.25 }); },
  shockCharge() { if (!this.ok('schg', 0.1)) return; this.tone({ type: 'sine', f0: 1400, f1: 2200, dur: 0.08, vol: 0.05 }); },
  shockCombo() { if (!this.ok('scombo', 0.1)) return; if (this.smp('shockCombo')) return; this.noise({ filter: 'lowpass', f0: 3000, f1: 150, dur: 0.8, vol: 0.7, dest: this.crunch }); this.tone({ type: 'sine', f0: 120, f1: 30, dur: 0.6, vol: 0.5 }); this.tone({ type: 'sawtooth', f0: 2400, f1: 100, dur: 0.5, vol: 0.12 }); },
  needle() { if (!this.ok('ndl', 0.05)) return; if (this.smp('needle')) return; this.tone({ type: 'triangle', f0: rand(2400, 2800), f1: 1600, dur: 0.06, vol: 0.06 }); this.noise({ filter: 'highpass', f0: 5000, dur: 0.04, vol: 0.05 }); },
  needleStick() { if (!this.ok('nstk', 0.04)) return; this.tone({ type: 'square', f0: rand(3000, 3600), dur: 0.03, vol: 0.025 }); },
  supercombine() { if (!this.ok('scomb', 0.1)) return; if (this.smp('supercombine')) return; this.noise({ filter: 'highpass', f0: 2500, dur: 0.4, vol: 0.4 }); this.tone({ type: 'sine', f0: 200, f1: 50, dur: 0.35, vol: 0.4 }); [2600, 3300, 4100].forEach((f, i) => this.tone({ type: 'triangle', f0: f, dur: 0.2, vol: 0.05, delay: i * 0.03 })); },
  blink() { if (!this.ok('blink', 0.06)) return; if (this.smp('blink')) return; this.tone({ type: 'sine', f0: 300, f1: 1800, dur: 0.14, vol: 0.12 }); this.noise({ filter: 'bandpass', f0: 4000, q: 3, dur: 0.1, vol: 0.06 }); },
  chomp() { if (!this.ok('chomp', 0.15)) return; if (this.smp('chomp')) return; this.noise({ filter: 'lowpass', f0: 1200, f1: 300, dur: 0.12, vol: 0.3 }); this.tone({ type: 'square', f0: 140, f1: 70, dur: 0.1, vol: 0.12 }); },
  // ---- furnace round ----
  tractorGrab() { if (!this.ok('tgrab', 0.08)) return; if (this.smp('tractorGrab')) return; this.tone({ type: 'sine', f0: 180, f1: 620, dur: 0.18, vol: 0.18 }); this.tone({ type: 'square', f0: 90, f1: 260, dur: 0.12, vol: 0.05 }); this.noise({ filter: 'bandpass', f0: 1800, q: 3, dur: 0.1, vol: 0.08 }); },
  tractorThrow() { if (!this.ok('tthrow', 0.08)) return; if (this.smp('tractorThrow')) return; this.noise({ filter: 'bandpass', f0: 500, f1: 3000, q: 1.2, dur: 0.22, vol: 0.3 }); this.tone({ type: 'sine', f0: 140, f1: 40, dur: 0.2, vol: 0.4 }); this.tone({ type: 'sawtooth', f0: 600, f1: 120, dur: 0.15, vol: 0.06 }); },
  ricochet(v = 1) { if (!this.ok('rico', 0.05)) return; if (this.smp('ricochet', v)) return; this.tone({ type: 'triangle', f0: rand(2600, 3400), f1: 900, dur: 0.12, vol: 0.06 * v }); this.noise({ filter: 'highpass', f0: 3500, dur: 0.05, vol: 0.12 * v }); },
  magTell() { if (!this.ok('mtell', 0.3)) return; if (this.smp('magTell')) return; this.tone({ type: 'sawtooth', f0: 60, f1: 240, dur: 0.5, vol: 0.06 }); this.tone({ type: 'sine', f0: 120, f1: 480, dur: 0.5, vol: 0.1 }); },
  magPulse() { if (!this.ok('mpulse', 0.2)) return; if (this.smp('magPulse')) return; this.tone({ type: 'sine', f0: 520, f1: 50, dur: 0.35, vol: 0.4 }); this.noise({ filter: 'lowpass', f0: 1200, f1: 100, dur: 0.3, vol: 0.3, dest: this.crunch }); },
  gurgle() { if (!this.ok('gurg', 0.2)) return; if (this.smp('gurgle')) return; for (let i = 0; i < 4; i++) this.tone({ type: 'sine', f0: rand(90, 160), f1: rand(50, 80), dur: 0.07, vol: 0.18, delay: i * 0.06 }); this.noise({ filter: 'lowpass', f0: 700, dur: 0.25, vol: 0.12 }); },
  tarIgnite() { if (!this.ok('tign', 0.1)) return; if (this.smp('tarIgnite')) return; this.noise({ filter: 'lowpass', f0: 900, f1: 200, dur: 0.6, vol: 0.5, dest: this.crunch }); this.tone({ type: 'sine', f0: 80, f1: 35, dur: 0.4, vol: 0.35 }); this.noise({ filter: 'bandpass', f0: 1500, q: 0.8, dur: 0.5, vol: 0.15, delay: 0.05 }); },
  tractorSet(v) {                                                  // gravity-gun hum: half while it's searching, full while it's holding something
    if (!this.ctx) return;
    if (v > 0.02 && !this.tractorNode && !this.muted) {
      const L = this.loopNode('tractorLoop', 0.08);
      if (L) this.tractorNode = Object.assign(L, { bank: true });
      else {
        const x = this.ctx, g = x.createGain(); g.gain.value = 0.0001;
        const o = x.createOscillator(); o.type = 'sine'; o.frequency.value = 110; const o2 = x.createOscillator(); o2.type = 'triangle'; o2.frequency.value = 221;
        const lfo = x.createOscillator(); lfo.frequency.value = 6; const lg = x.createGain(); lg.gain.value = 9; lfo.connect(lg); lg.connect(o2.frequency);
        const src = x.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true; const f = x.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 520; f.Q.value = 3; const ng = x.createGain(); ng.gain.value = 0.3;
        o.connect(g); o2.connect(g); src.connect(f); f.connect(ng); ng.connect(g); g.connect(this.out); o.start(); o2.start(); lfo.start(); src.start();
        this.tractorNode = { g, nodes: [o, o2, lfo, src] };
      }
    }
    const n = this.tractorNode; if (!n) return;
    const t = this.ctx.currentTime;
    if (v <= 0.02) { this.tractorNode = null; n.g.gain.setTargetAtTime(0.0001, t, 0.06); for (const s of n.nodes) s.stop(t + 0.4); return; }
    n.g.gain.setTargetAtTime((n.bank ? this.bankGain.tractorLoop : 0.07) * v, t, 0.06);
    if (n.nodes[0].playbackRate) n.nodes[0].playbackRate.setTargetAtTime(0.85 + 0.15 * v, t, 0.1);
  },
  stopLoops() {                                                    // every continuous weapon sound; a new loop gets its line here and nowhere else
    this.arcSet(false); this.flameSet(false); this.miniSet(0); this.cryoSet(false); this.ripperSet(0);
    this.lanceSet(0); this.swarmSet(0); this.acidSet(false); this.tractorSet(0);
    this.heatSet(0); this.hydroSet(false);
  },
  acidSet(on) {                                                    // hiss of the corroder while it sprays
    if (!this.ctx) return;
    if (on && !this.acidNode && !this.muted && (this.acidNode = this.loopNode('acidLoop', 0.03))) return;
    if (on && !this.acidNode && !this.muted) {
      const c = this.ctx, g = c.createGain(); g.gain.value = 0.0001;
      const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = 0.9;
      const lfo = c.createOscillator(); lfo.frequency.value = 9; const lg = c.createGain(); lg.gain.value = 0.03;
      src.connect(f); f.connect(g); lfo.connect(lg); lg.connect(g.gain); g.connect(this.out);
      src.start(); lfo.start(); g.gain.setTargetAtTime(0.12, c.currentTime, 0.03);
      this.acidNode = { g, nodes: [src, lfo] };
    } else if (!on && this.acidNode) {
      const a = this.acidNode, t = this.ctx.currentTime; this.acidNode = null;
      a.g.gain.setTargetAtTime(0.0001, t, 0.05); a.nodes.forEach(n => n.stop(t + 0.3));
    }
  },
  heart() { if (!this.ok('heart', 0.4)) return; if (this.smp('heart')) return;
    this.tone({ type: 'sine', f0: 72, f1: 40, dur: 0.12, vol: 0.42 }); this.tone({ type: 'sine', f0: 62, f1: 36, dur: 0.12, vol: 0.3, delay: 0.17 }); },
  pickup() { if (!this.ok('pk', 0.1)) return; [523, 659, 784, 1046].forEach((f, i) => this.tone({ type: 'square', f0: f, dur: 0.08, vol: 0.06, delay: i * 0.06 })); },
  ui() { if (!this.ok('ui', 0.05)) return; this.tone({ type: 'square', f0: 330, f1: 990, dur: 0.14, vol: 0.08 }); this.noise({ filter: 'highpass', f0: 3000, dur: 0.06, vol: 0.08 }); },
  win() { if (!this.ok('win')) return; [392, 523, 659, 784, 1046].forEach((f, i) => this.tone({ type: 'square', f0: f, dur: 0.18, vol: 0.07, delay: 0.15 + i * 0.1 })); },
  lose() { if (!this.ok('lose')) return; [330, 262, 196, 131].forEach((f, i) => this.tone({ type: 'sawtooth', f0: f, f1: f * 0.94, dur: 0.26, vol: 0.09, delay: 0.35 + i * 0.18 })); },
  startHum(fade) {                                 // low industrial drone under everything; this.hum = { g, nodes, bank }
    if (!this.ctx || this.hum) return;
    const L = this.loopNode('humLoop', 1.2); if (L) { this.hum = Object.assign(L, { bank: true }); return; }
    const c = this.ctx, g = c.createGain(); g.gain.value = fade ? 0.0001 : 0.035;
    if (fade) g.gain.setTargetAtTime(0.035, c.currentTime, fade);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 170; f.Q.value = 3;
    const o1 = c.createOscillator(), o2 = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain();
    o1.type = o2.type = 'sawtooth'; o1.frequency.value = 46; o2.frequency.value = 46.7;
    lfo.frequency.value = 0.13; lg.gain.value = 60; lfo.connect(lg); lg.connect(f.frequency);
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(this.out);
    o1.start(); o2.start(); lfo.start(); this.hum = { g, nodes: [o1, o2, lfo], bank: false };
  },
  swapHum() {                                      // crossfade the drone to the version now selected (bank decoded late, or N flipped it)
    const h = this.hum; if (!h) return;
    if (h.bank === !!(this.useBank && this.bank.humLoop && this.bank.humLoop.length)) return;
    const t = this.ctx.currentTime; this.hum = null;
    h.g.gain.cancelScheduledValues(t); h.g.gain.setTargetAtTime(0.0001, t, 0.6); h.nodes.forEach(n => n.stop(t + 4));
    this.startHum(1.2);
  },
  toggleMute() {                                   // M, remembered across reloads; returns the new state
    this.muted = !this.muted; OPTS.muted = this.muted ? 1 : 0; saveOpt('muted');
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.55, this.ctx.currentTime, 0.02);
    return this.muted;
  },
  applyVolume() { if (this.out) this.out.gain.setTargetAtTime(OPTS.sfx, this.ctx.currentTime, 0.03); Music.applyVolume();
  },
};
Sfx.muted = !!OPTS.muted;                            // remembered mute (M), set out here: the block above reads no page globals at load (dev/sfxgen/calibcheck.mjs evaluates it alone)

// Music. With music_bank.js loaded (synthwave soundtrack rendered by dev/synthwave) the game plays sampled
// Tracks: title, stage1, stage2 and boss loops, plus win and lose jingles. GameScene.waveTrack picks by mode.
// Combat intensity colours the stage loops: unnoticed = muffled and low, noticed = opening up, fighting = full.
// Without the bank (or after B flips it off) the procedural drum machine + bass plays instead:
// intensity 0 = silent, 1 = kick/hats (you've been noticed), 2 = + snare & bass, 3 = full (boss or S rank).
const WAVE_MUSIC = ['stage1', 'stage1', 'stage2', 'stage2', 'stage2', 'boss'];
const Music = {
  intensity: 0, step: 0, nextT: 0, timer: null, out: null,
  LEVEL: 0.2, bank: {}, pend: {}, failed: {}, useBank: true, bus: null, lp: null, cur: null, want: null, shownI: -1,
  TITLE_SET: ['title', 'stage1', 'boss'],         // the title theme plus the first track of every mode, so any start is gapless
  start() {
    if (!Sfx.ctx || this.timer) return;
    const c = Sfx.ctx;
    this.out = c.createGain(); this.out.gain.value = 0.2 * OPTS.music; this.out.connect(Sfx.master);
    this.lp = c.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 20000; this.lp.Q.value = 0.6;
    this.bus = c.createGain(); this.bus.gain.value = this.LEVEL;
    this.lp.connect(this.bus); this.bus.connect(Sfx.master);
    this.nextT = c.currentTime + 0.1;
    this.timer = setInterval(() => this.pump(), 25);
    this.keep(this.TITLE_SET);
    if (this.want) this.track(this.want, true);
  },
  need(name) {                                     // decode one track (async) unless it's ready, on its way or broken; a wanted track starts once ready
    const s = window.SLAG_MUSIC && window.SLAG_MUSIC[name];
    if (!s || !Sfx.ctx || this.bank[name] || this.pend[name] || this.failed[name]) return;
    const tok = this.pend[name] = {};
    Sfx.decode(s.d).then(buf => {
      if (this.pend[name] !== tok) return;          // dropped by keep() while it decoded
      delete this.pend[name];
      const ls = s.ls || 0;                       // loops carry 100 ms of their own wrap either side: play [ls, ls + len]
      this.bank[name] = { buf, loop: s.loop, ls, len: Math.min(s.len, buf.duration - ls) };
      if (this.want === name && !this.cur) this.track(name, true);
    }, () => {
      if (this.pend[name] !== tok) return;
      delete this.pend[name]; this.failed[name] = true;
      console.warn(`SLAGHOUSE: music track "${name}" failed to decode; the procedural loop plays in its place`);
      if (this.want === name) this.track(name, true);
    });
  },
  keep(names) {                                    // decode these ahead and drop every other decoded track (but never the one playing or wanted)
    for (const n of names) this.need(n);
    const hold = new Set(names); if (this.cur) hold.add(this.cur.name); if (this.want) hold.add(this.want);
    for (const n of Object.keys(this.bank)) if (!hold.has(n)) delete this.bank[n];
    for (const n of Object.keys(this.pend)) if (!hold.has(n)) delete this.pend[n];
  },
  sampled() {                                      // bank on, and the wanted track decoded or decoding (one that failed falls back to the procedural loop)
    const B = window.SLAG_MUSIC;
    return this.useBank && !!B && (!this.want || (!!B[this.want] && !this.failed[this.want]));
  },
  voice(name) {                                    // start a bank track now, behind its own gain
    const c = Sfx.ctx, t = this.bank[name], src = c.createBufferSource(), g = c.createGain();
    src.buffer = t.buf;
    if (t.loop) { src.loop = true; src.loopStart = t.ls; src.loopEnd = t.ls + t.len; }
    g.gain.value = 1; src.connect(g); g.connect(this.lp); src.start(c.currentTime + 0.03, t.ls);
    return { name, src, g, loop: t.loop };
  },
  fadeOut(sec) {
    const v = this.cur; if (!v) return;
    this.cur = null;
    const t = Sfx.ctx.currentTime, g = v.g.gain;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0, t + sec);
    v.src.onended = null; v.src.stop(t + sec + 0.05);
  },
  track(name, restart) {                           // switch the looping track; the same one keeps playing unless restart
    this.want = name;
    if (!this.bus) return;
    if (!this.sampled()) { this.fadeOut(0.2); return; }   // B is on synth, or this track failed: the procedural loop takes over
    this.need(name);
    if (!restart && this.cur && this.cur.name === name) return;
    this.fadeOut(restart ? 0.05 : 0.7);
    if (this.bank[name]) this.cur = this.voice(name);
  },
  jingle(name, then) {                             // one-shot, then loop `then`; false = not decoded (caller synthesizes)
    if (!this.bus || !this.useBank || !this.bank[name]) return false;
    this.fadeOut(0.12);
    this.want = then || null; if (then) this.need(then);   // `then` decodes while the jingle plays
    const v = this.cur = this.voice(name);
    v.src.onended = () => { if (this.cur === v) { this.cur = null; if (this.want) this.track(this.want); } };
    return true;
  },
  toggle() {                                       // B: sampled soundtrack <-> procedural loop
    this.useBank = !this.useBank;
    if (this.useBank) { if (this.want) this.track(this.want, true); } else this.fadeOut(0.2);
    return this.useBank;
  },
  shade() {                                        // stage loops follow the fight; title, boss and jingles always play full
    const I = this.paused ? 0 : this.cur && this.cur.name.startsWith('stage') ? this.intensity : 3;   // the pause menu muffles everything
    if (I === this.shownI) return;
    const t = Sfx.ctx.currentTime, up = I > this.shownI;
    this.shownI = I;
    this.lp.frequency.setTargetAtTime([900, 3200, 20000, 20000][I], t, up ? 0.06 : 0.5);
    this.bus.gain.setTargetAtTime(this.LEVEL * OPTS.music * [0.6, 0.85, 1, 1.15][I], t, up ? 0.06 : 0.5);
  },
  applyVolume() { if (this.out) this.out.gain.value = 0.2 * OPTS.music; this.shownI = -1; },   // next pump re-applies the shade at the new level
  _noop() {
  },
  pump() {
    const c = Sfx.ctx, spb = 60 / 132 / 4;                        // 16th notes at 132 BPM
    if (!c) return;
    if (this.cur || this.sampled()) { this.shade(); return; }
    if (this.nextT < c.currentTime - 0.5) this.nextT = c.currentTime + 0.05;   // tab slept: skip the backlog
    while (this.nextT < c.currentTime + 0.12) { this.play(this.step, this.nextT); this.nextT += spb; this.step++; }
  },
  play(s, t) {
    const I = this.paused ? 0 : this.intensity; if (I <= 0 || Sfx.muted) return;
    const d = Math.max(0, t - Sfx.ctx.currentTime), beat = s % 16, bar = (s >> 4) % 4, o = this.out;
    if (beat % 4 === 0 || (I >= 3 && (beat === 10 || beat === 7))) {
      Sfx.tone({ type: 'sine', f0: 150, f1: 42, dur: 0.14, vol: 0.85, delay: d, dest: o }); Sfx.noise({ filter: 'lowpass', f0: 3000, dur: 0.01, vol: 0.2, delay: d, dest: o });
    }
    if (I >= 1 && (beat % 2 === 0 || I >= 3)) Sfx.noise({ filter: 'highpass', f0: 7000, dur: beat % 4 === 2 ? 0.05 : 0.025, vol: beat % 4 === 2 ? 0.18 : 0.1, delay: d, dest: o });
    if (I >= 2 && (beat === 4 || beat === 12 || (I >= 3 && bar === 3 && beat >= 13))) {
      Sfx.noise({ filter: 'bandpass', f0: 1900, q: 0.9, dur: 0.13, vol: 0.4, delay: d, dest: o }); Sfx.tone({ type: 'triangle', f0: 230, f1: 150, dur: 0.07, vol: 0.2, delay: d, dest: o });
    }
    if (I >= 2 && beat % 2 === 0) {
      const riff = [40, 40, 52, 40, 43, 40, 45, 43], m = riff[(s >> 1) % 8] + (bar === 2 ? 3 : bar === 3 ? -2 : 0);
      Sfx.tone({ type: 'triangle', f0: 440 * Math.pow(2, (m - 69) / 12), dur: 0.12, vol: 0.32, delay: d, dest: o });
    }
  },
};

