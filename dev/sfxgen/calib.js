// Measures the game's procedural Sfx sounds so AudioGen samples can be dropped in at matching levels.
// Load into slaghouse.html BEFORE clicking into the game (so nothing else is using Sfx), then:
//   await slagCalib()            -> { name: [loudness, peak], ... }   (K-weighted loudness as loud.py, plus raw peak)
//   await slagCalib(['dash'])    -> just these sounds (merge the result into calib.json by hand)
window.slagCalib = async function (only) {
  const SR = 48000;
  // ITU-R BS.1770 K-weighting at 48 kHz (same coefficients as loud.py)
  const BQ = [[[1.53512485958697, -2.69169618940638, 1.19839281085285], [-1.69065929318241, 0.73248077421585]],
              [[1.0, -2.0, 1.0], [-1.99004745483398, 0.99007225036621]]];
  const kweight = x => {
    const y = Float64Array.from(x);
    for (const [[b0, b1, b2], [a1, a2]] of BQ) {
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
      for (let i = 0; i < y.length; i++) { const xi = y[i], yi = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = xi; y2 = y1; y1 = yi; y[i] = yi; }
    }
    return y;
  };
  const loud = (x, loop) => {
    const y = kweight(x);
    if (loop) { let s = 0; for (const v of y) s += v * v; return Math.sqrt(s / y.length); }
    const w = Math.round(0.04 * SR), h = Math.round(0.01 * SR);
    const c = new Float64Array(y.length + 1);
    for (let i = 0; i < y.length; i++) c[i + 1] = c[i] + y[i] * y[i];
    let best = 0;
    for (let s = 0; s + w <= y.length; s += h) best = Math.max(best, c[s + w] - c[s]);
    return Math.sqrt(best / w);
  };
  const S = Sfx;
  // name -> [call, seconds to render, loop?, seconds to skip before measuring]
  const one = f => [f, 2.5, false, 0];
  const L = {
    nail: one(() => S.nail()), shotgun: one(() => S.shotgun()), rocket: one(() => S.rocket()), grenade: one(() => S.grenade()),
    stake: one(() => S.stake()), rivet: one(() => S.rivet()), mortar: one(() => S.mortar()), sawLaunch: one(() => S.sawLaunch()),
    rail: one(() => S.rail()), clusterPop: one(() => S.clusterPop()), mineThrow: one(() => S.mineThrow()),
    hookFire: one(() => S.hookFire()), hookHit: one(() => S.hookHit()), prism: one(() => S.prism()), zap: one(() => S.zap()),
    eshot: one(() => S.eshot()), snipe: one(() => S.snipe()), whistle: one(() => S.whistle()), radio: one(() => S.radio()),
    explosion: one(() => S.explosion(1)), killcam: one(() => S.killcam()), stomp: one(() => S.stomp()), rampage: one(() => S.rampage()),
    clang: one(() => S.clang(1)), tink: one(() => S.tink(1)), clunk: one(() => S.clunk(1)), smash: one(() => S.smash('#')),
    smashMetal: one(() => S.smash('=')), creak: one(() => S.creak()), snap: one(() => S.snap()), pin: one(() => S.pin()),
    shieldHit: one(() => S.shieldHit()), freeze: one(() => S.freeze()), crack: one(() => S.crack()), shatter: one(() => S.shatter()),
    hit: one(() => S.hit()), kickHit: one(() => S.kickHit()), squish: one(() => S.squish()), gib: one(() => S.gib(1)),
    splatWall: one(() => S.splatWall()), step: one(() => S.step()), land: one(() => S.land(0.5)), jump: one(() => S.jump()),
    swap: one(() => S.swap()), whoosh: one(() => S.whoosh()), hurt: one(() => S.hurt()), heart: one(() => S.heart()),
    roar: one(() => S.roar()), growl: one(() => S.growl(false)), snort: one(() => S.snort()), scream: one(() => S.scream()),
    hiss: one(() => S.hiss()), ignite: one(() => S.ignite()), gasHiss: one(() => S.gasHiss()), sputter: one(() => S.sputter()),
    singOpen: one(() => S.singOpen()), warp: one(() => S.warp()), decloak: one(() => S.decloak()),
    flameLoop: [() => S.flameSet(true), 1.6, true, 0.4], cryoLoop: [() => S.cryoSet(true), 1.6, true, 0.4],
    arcLoop: [() => S.arcSet(true), 1.6, true, 0.4], humLoop: [() => S.startHum(), 3, true, 0.5],
    // overdrive round: each measured at the setting where the game plays its sample at full gain
    dash: one(() => S.dash()), hornet: one(() => S.hornet()), lanceFire: one(() => S.lanceFire(1)), glaive: one(() => S.glaive()),
    glaiveCatch: one(() => S.glaiveCatch()), whirr: one(() => S.whirr(1)), sizzle: one(() => S.sizzle()), splat: one(() => S.splat(1)),
    rumble: one(() => S.rumble(1)), erupt: one(() => S.erupt()), dig: one(() => S.dig()), chain: one(() => S.chain()),
    linkOn: one(() => S.linkOn()), buzz: one(() => S.buzz()),
    lanceLoop: [() => S.lanceSet(1), 1.6, true, 0.4], ripperLoop: [() => S.ripperSet(0.55), 1.6, true, 0.4],
    ripperBite: [() => S.ripperSet(1), 1.6, true, 0.4],
    // crucible round
    execute: one(() => S.execute()), hammerSlam: one(() => S.hammerSlam(1)), flak: one(() => S.flak()), flakBurst: one(() => S.flakBurst()),
    coilBoom: one(() => S.coilBoom()), gnatPop: one(() => S.gnatPop()), stitch: one(() => S.stitch()), revive: one(() => S.revive()),
    swarmLoop: [() => S.swarmSet(1), 1.6, true, 0.4],
    // furnace round
    tractorGrab: one(() => S.tractorGrab()), tractorThrow: one(() => S.tractorThrow()), ricochet: one(() => S.ricochet(1)), magTell: one(() => S.magTell()),
    magPulse: one(() => S.magPulse()), gurgle: one(() => S.gurgle()), tarIgnite: one(() => S.tarIgnite()),
    tractorLoop: [() => S.tractorSet(1), 1.6, true, 0.4], acidLoop: [() => S.acidSet(true), 1.6, true, 0.4],
    // shockworks round
    shockOrb: one(() => S.shockOrb()), shockBeam: one(() => S.shockBeam()), shockCombo: one(() => S.shockCombo()), needle: one(() => S.needle()),
    supercombine: one(() => S.supercombine()), blink: one(() => S.blink()), chomp: one(() => S.chomp()),
    // slagforge round
    drill: one(() => S.drill()), drillFire: one(() => S.drillFire()), revolver: one(() => S.revolver()), revReload: one(() => S.revReload()),
    gasPop: one(() => S.gasPop()), gasBoom: one(() => S.gasBoom()), weld: one(() => S.weld()), slash: one(() => S.slash()),
    // ironclad round
    flare: one(() => S.flare()), limpet: one(() => S.limpet()), steam: one(() => S.steam()), emp: one(() => S.emp()),
    jammed: one(() => S.jammed()), roll: one(() => S.roll()), skitter: one(() => S.skitter()),
    // sorting line round
    net: one(() => S.net()), press: one(() => S.press()), clank: one(() => S.clank()), golem: one(() => S.golem()),
    // overtime round
    orbital: one(() => S.orbital()), cutter: one(() => S.cutter()), boing: one(() => S.boing()), snatch: one(() => S.snatch()),
    // codex round
    alarm: one(() => S.alarm()), squelch: one(() => S.squelch()), suck: one(() => S.suck()),
    // supply round
    powerup: one(() => S.powerup()), whip: one(() => S.whip()), bees: one(() => S.bees()),
    // mastery round
    shrink: one(() => S.shrink()), sonic: one(() => S.sonic()), laser: one(() => S.laser()),
    // finale round
    gravPulse: one(() => S.gravPulse()), pinball: one(() => S.pinball(0)), wail: one(() => S.wail()), iceForm: one(() => S.iceForm()), warhorn: one(() => S.warhorn()),
    // arsenal round
    firework: one(() => S.firework()), fireworkPop: one(() => S.fireworkPop()), crackle: one(() => S.crackle()), katana: one(() => S.katana()), slashHit: one(() => S.slashHit()),
    swapTell: one(() => S.swapTell()), swapZap: one(() => S.swapZap()), scorch: one(() => S.scorch()), plateBreak: one(() => S.plateBreak()),
    // elite round
    vacuum: one(() => S.vacuum()), scrapBlast: one(() => S.scrapBlast()), siphon: one(() => S.siphon()), grab: one(() => S.grab()), spotted: one(() => S.spotted()),
    bark: one(() => S.bark()), shieldPop: one(() => S.shieldPop()),
    // wrecking-yard round
    wreckSwing: one(() => S.wreckSwing()), wreckHit: one(() => S.wreckHit()), creak: one(() => S.creak()), split: one(() => S.split()), splitPop: one(() => S.splitPop()),
    decoy: one(() => S.decoy()), discThrow: one(() => S.discThrow()), sporePuff: one(() => S.sporePuff()),
    // armory round
    stasis: one(() => S.stasis()), stasisEnd: one(() => S.stasisEnd()), microwave: one(() => S.microwave()), mwPop: one(() => S.mwPop()), vortexSpin: one(() => S.vortexSpin()),
    pylonCharge: one(() => S.pylonCharge()), pylonZap: one(() => S.pylonZap()), chomp: one(() => S.chomp()),
    // foreman round
    gauntlet: one(() => S.gauntlet()), punchHit: one(() => S.punchHit()), marksman: one(() => S.marksman()), shuriken: one(() => S.shuriken()), thunder: one(() => S.thunder()),
    // mutator round
    tripSet: one(() => S.tripSet()), dronePod: one(() => S.dronePod()), axeChop: one(() => S.axeChop()), berserk: one(() => S.berserk()), hardlight: one(() => S.hardlight()),
    // debrief round
    bubble: one(() => S.bubble()), bubblePop: one(() => S.bubblePop()), zealotCast: one(() => S.zealotCast()), soul: one(() => S.soul()), squeak: one(() => S.squeak()),
  };
  const keep = { ctx: S.ctx, out: S.out, crunch: S.crunch, noiseBuf: S.noiseBuf, last: S.last, muted: S.muted, useBank: S.useBank,
    hum: S.hum, humSynth: S.humSynth, flameNode: S.flameNode, arcNode: S.arcNode, cryoNode: S.cryoNode, lanceNode: S.lanceNode, ripNode: S.ripNode, swarmNode: S.swarmNode, tractorNode: S.tractorNode, acidNode: S.acidNode };
  const res = {};
  try {
    for (const [name, [fn, secs, loop, skip]] of Object.entries(L)) {
      if (only && !only.includes(name)) continue;
      const oc = new OfflineAudioContext(1, Math.round(SR * secs), SR);
      S.ctx = oc; S.out = oc.createGain(); S.out.connect(oc.destination);
      S.crunch = oc.createWaveShaper();
      const n = 1024, curve = new Float32Array(n);
      for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; curve[i] = Math.tanh(x * 3.2); }
      S.crunch.curve = curve; S.crunch.connect(S.out);
      const len = (SR * 1.5) | 0; S.noiseBuf = oc.createBuffer(1, len, SR);
      const d = S.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      S.last = {}; S.muted = false; S.useBank = false; S.hum = S.humSynth = S.flameNode = S.arcNode = S.cryoNode = S.lanceNode = S.ripNode = S.swarmNode = S.tractorNode = S.acidNode = null;
      fn();
      const buf = await oc.startRendering();
      const x = buf.getChannelData(0).subarray(Math.round(skip * SR));
      let pk = 0; for (const v of x) pk = Math.max(pk, Math.abs(v));
      res[name] = [+loud(x, loop).toFixed(6), +pk.toFixed(4)];
    }
  } finally { Object.assign(S, keep); }
  return res;
};
