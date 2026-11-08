"""Sample-bank support for Sfx: plays AudioGen takes from sfx_bank.js, falls back to the synth when absent.
usage: python splice_sfx.py slaghouse.html"""
import re, sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()


def rep(a, b, cnt=1):
    global s
    assert s.count(a) == cnt, (s.count(a), a[:80])
    s = s.replace(a, b)


rep('<script src="https://cdn.jsdelivr.net/npm/phaser@4.2.1/dist/phaser.min.js"></script>\n',
    '<script src="https://cdn.jsdelivr.net/npm/phaser@4.2.1/dist/phaser.min.js"></script>\n'
    '<script src="sfx_bank.js"></script>  <!-- optional AudioGen sample bank (dev/sfxgen); synth fallback without it -->\n')

rep("""//  PROCEDURAL AUDIO (raw Web Audio; Phaser's own audio is disabled in the config)
// =============================================================================
const Sfx = {
  ctx: null, out: null, crunch: null, noiseBuf: null, muted: false, last: {}, hum: null,""",
"""//  AUDIO (raw Web Audio; Phaser's own audio is disabled in the config)
//  Sampled takes from sfx_bank.js (AudioGen, see dev/sfxgen) play when loaded; every sound keeps its
//  procedural synth version as the fallback, and N flips between the two in game.
// =============================================================================
const Sfx = {
  ctx: null, out: null, crunch: null, noiseBuf: null, muted: false, last: {}, hum: null, humSynth: null,
  bank: {}, bankGain: {}, bankJit: {}, bankLast: {}, bankLoading: false, useBank: true,""")

rep("""        this.crunch.curve = curve; this.crunch.connect(this.out);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();""",
"""        this.crunch.curve = curve; this.crunch.connect(this.out);
        this.loadBank();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();""")

rep("""  env(g, t, vol, a, dur) {""",
"""  loadBank() {                                     // decode every take in sfx_bank.js (async; synth covers the gap)
    const B = window.SLAG_SFX; if (!B || this.bankLoading) return;
    this.bankLoading = true;
    const jobs = [];
    for (const name in B) {
      const s = B[name]; this.bankGain[name] = s.g; this.bankJit[name] = s.j;
      for (const b64 of s.d) {
        const bin = atob(b64), u = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
        jobs.push(this.ctx.decodeAudioData(u.buffer).then(buf => { (this.bank[name] || (this.bank[name] = [])).push(buf); }, () => {}));
      }
    }
    Promise.all(jobs).then(() => { if (this.humSynth && this.bank.humLoop) this.swapHum(); });
  },
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
  env(g, t, vol, a, dur) {""")

# --- one-shots: try the bank right after the rate-limit check, keep the synth body as the fallback
SIMPLE = ['nail', 'shotgun', 'rocket', 'grenade', 'stake', 'rivet', 'mortar', 'sawLaunch', 'rail', 'clusterPop', 'mineThrow',
          'hookFire', 'hookHit', 'prism', 'zap', 'eshot', 'snipe', 'whistle', 'radio', 'killcam', 'stomp', 'rampage',
          'creak', 'snap', 'pin', 'shieldHit', 'freeze', 'crack', 'shatter', 'hit', 'kickHit', 'squish', 'splatWall',
          'step', 'jump', 'swap', 'whoosh', 'hurt', 'heart', 'roar', 'snort', 'scream', 'hiss', 'ignite', 'gasHiss',
          'sputter', 'singOpen', 'warp', 'decloak']
CALL = {m: f"this.smp('{m}')" for m in SIMPLE}
CALL.update({
    'explosion': "this.smp('explosion', v)",
    'clang': "this.smp('clang', v)",
    'tink': "this.smp('tink', v)",
    'clunk': "this.smp('clunk', v)",
    'gib': "this.smp('gib', Math.min(1.3, p))",
    'land': "this.smp('land', (0.12 + 0.2 * v) / 0.22)",
    'growl': "this.smp('growl', 1, { rate: big ? 0.78 : 1 })",
    'smash': "this.smp(c === '=' ? 'smashMetal' : 'smash')",
})
start = s.index('const Sfx = {'); end = s.index('\n};\n', start)
body = s[start:end]
for m, call in CALL.items():
    pat = re.compile(r"(\n  " + m + r"\([^)]*\) \{ if \(!this\.ok\([^)]*\)\) return;)")
    assert len(pat.findall(body)) == 1, m
    body = pat.sub(lambda mo: mo.group(1) + f' if ({call}) return;', body)
s = s[:start] + body + s[end:]

# --- continuous sounds
for fn, node, name in [('cryoSet', 'cryoNode', 'cryoLoop'), ('flameSet', 'flameNode', 'flameLoop'), ('arcSet', 'arcNode', 'arcLoop')]:
    rep(f"    if (on && !this.{node} && !this.muted) {{\n      const c = this.ctx, g = c.createGain(); g.gain.value = 0.0001;\n",
        f"    if (on && !this.{node} && !this.muted && (this.{node} = this.loopNode('{name}', 0.03))) return;\n"
        f"    if (on && !this.{node} && !this.muted) {{\n      const c = this.ctx, g = c.createGain(); g.gain.value = 0.0001;\n")

rep("""  startHum() {                                     // low industrial drone under everything
    if (!this.ctx || this.hum) return;
    const c = this.ctx, g = c.createGain(); g.gain.value = 0.035;""",
"""  startHum() {                                     // low industrial drone under everything
    if (!this.ctx || this.hum) return;
    const L = this.loopNode('humLoop', 1.2); if (L) { this.hum = L.g; return; }
    const c = this.ctx, g = c.createGain(); g.gain.value = 0.035;""")
rep("""    o1.start(); o2.start(); lfo.start(); this.hum = g;
  },""",
"""    o1.start(); o2.start(); lfo.start(); this.hum = g; this.humSynth = { g, nodes: [o1, o2, lfo] };
  },
  swapHum() {                                      // the bank finished decoding after the synth drone started: crossfade
    const h = this.humSynth, t = this.ctx.currentTime; this.humSynth = null; this.hum = null;
    h.g.gain.setTargetAtTime(0.0001, t, 0.6); h.nodes.forEach(n => n.stop(t + 4));
    this.startHum();
  },""")

# --- N: A/B between sampled and synth sounds
rep("'W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,J,Q,E,F,ONE,TWO,THREE,FOUR,FIVE,SIX,SEVEN,EIGHT,NINE,ZERO,MINUS,PLUS,BACKSPACE,OPEN_BRACKET,G,T,C,R,M,ENTER,ESC'",
    "'W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,J,Q,E,F,ONE,TWO,THREE,FOUR,FIVE,SIX,SEVEN,EIGHT,NINE,ZERO,MINUS,PLUS,BACKSPACE,OPEN_BRACKET,G,T,C,R,M,N,ENTER,ESC'")
rep("'G', 'T', 'C', 'R', 'M', 'ENTER', 'ESC']) this.jd[k] = JD(K[k]);",
    "'G', 'T', 'C', 'R', 'M', 'N', 'ENTER', 'ESC']) this.jd[k] = JD(K[k]);")
rep("    if (this.jd.M) Sfx.toggleMute();\n",
    "    if (this.jd.M) Sfx.toggleMute();\n"
    "    if (this.jd.N && window.SLAG_SFX) { Sfx.useBank = !Sfx.useBank; Sfx.arcSet(false); Sfx.flameSet(false); Sfx.cryoSet(false); BUS.emit('callout', Sfx.useBank ? 'SAMPLED SFX' : 'SYNTH SFX'); }\n")
rep("R RESTART  M MUTE';", "R RESTART  M MUTE  N SFX';")

open(p, 'w', encoding='utf-8', newline='').write(s)
print('ok')
