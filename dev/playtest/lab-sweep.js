// Exercise the Lab with the normal scene, weapon input and enemy updates.
window.labSweep = section => {
  const fails = [], lab = SlagLab, catalog = lab.catalog();
  const originalRandom = Math.random;
  T.start();
  function test(id, run) {
    Math.random = seeded(1279);
    try { run(message => fails.push(`${id}: ${message}`)); }
    catch (err) { fails.push(`${id}: ${err.stack.split('\n').slice(0, 3).join(' | ')}`); }
  }
  function load(room, options) {
    lab.load(room, options); T.run(1500);
    if (!lab.snapshot()?.ready) throw new Error('room did not finish deploying');
    return T.g();
  }
  function stepUntil(test, ms, interval = 100) {
    for (let t = 0; t < ms; t += interval) { if (test()) return true; T.run(interval); }
    return test();
  }
  const enemies = g => g.enemies.getChildren().filter(e => e.alive);
  function checkScene(g, fail) {
    for (const e of [g.player, ...enemies(g)]) {
      const { center, velocity } = e.body;
      if (![e.x, e.y, center.x, center.y, velocity.x, velocity.y, e === g.player ? g.hp : e.hp].every(Number.isFinite)) fail('nonfinite state for ' + (e.kind || 'player'));
      if (!g.textures.get(e.texture.key).has(e.fr ?? e.frame.name)) fail('missing animation frame for ' + (e.kind || 'player'));
    }
  }
  const trigger = (g, on) => { g.keys.J.isDown = on; };
  function weapons() {
    const lob = new Set(['grenade', 'cluster', 'grav', 'napalm', 'decoy', 'stasis', 'gaslaunch', 'tripwire', 'seed', 'nuke', 'cannon', 'cyclone', 'caltrop', 'barrage']);
    const melee = new Set(['ripper', 'hammer', 'katana', 'shield', 'gauntlet', 'flail', 'whip']);
    const hold = { hornet: 950, lance: 1250, hammer: 850, shock: 650, orbital: 1300, mini: 1300, flail: 950, tractor: 450, vacuum: 550, shield: 350 };
    for (const { id } of catalog.weapons) test(id, fail => {
      const g = load('range', { weapon: id, groups: [{ kind: 'grunt' }, { kind: 'heavy', count: 2 }] });
      const target = enemies(g)[0];
      const x = target.body.center.x;
      if (melee.has(id)) { g.player.body.reset(x - 25, 388); T.run(100); }
      const aim = { x: target.body.center.x, y: target.body.center.y - (lob.has(id) ? 24 : 0) };
      const pointer = g.input.activePointer, originalAim = pointer.positionToCamera;
      pointer.positionToCamera = (_camera, out) => out.set(aim.x, aim.y);
      g.aimMode = 'mouse';
      try {
        if (id === 'vacuum') {
          const ox = g.shoulder.x + 18, oy = g.shoulder.y;
          for (let i = 0; i < 4; i++) g.spawnGib('g_shard', ox + i * 2, oy, 0, 0, 'metal');
        }
        if (id === 'shield') g.spawnEBullet(g.player.x + 55, g.shoulder.y, Math.PI, 150, 8);
        const start = g.stats.shots, hits0 = g.stats.hits;
        trigger(g, true); T.run(hold[id] || 250);
        if (id === 'hornet' && !g.locks.includes(target)) fail('did not acquire a target lock');
        if (id === 'tractor' && g.tb?.o !== target) fail('did not grab the target');
        if (id === 'vacuum' && !g.vac.ammo) fail('did not collect scrap');
        if (id === 'shield' && !g.shieldBlockT) fail('did not reflect the incoming bullet');
        trigger(g, false); T.run(150);
        if (id === 'tractor' && !g.thrown.length) fail('release did not throw the target');
        if (id !== 'tractor' && g.stats.shots <= start) fail('weapon produced no shot');
        if (id === 'limpet') { trigger(g, true); T.run(750); trigger(g, false); }
        if (id === 'tripwire') {
          if (!stepUntil(() => g.trips.some(w => w.st === 'set'), 2400, 17)) fail('emitter did not arm');
          else {
            const wire = g.trips.find(w => w.st === 'set');
            target.body.reset((wire.x + wire.x1) / 2, (wire.y + wire.y1) / 2);
          }
        }
        let applied = false;
        stepUntil(() => {
          applied ||= g.stats.hits > 0 || !target.alive || target.hp < target.def.hp ||
            [target.netT, target.glueT, target.gravT, target.stasisT, target.chill, target.shrunkT].some(t => t > 0) ||
            target.tetherT > g.time.now || target.bubbleUntil > g.time.now;
          return applied;
        }, 3400, 50);
        if (!applied) fail('no hit or status effect registered');
        const hurt = !target.alive || target.hp < target.def.hp;          // accuracy: a shot that hurt the target counts a hit (#126)
        if (hurt && g.stats.shots > start && g.stats.hits === hits0) fail(`hurt the target but counted ${g.stats.shots - start} shots and no hits`);
        T.run(1000);
        if (g.state !== 'play' || g.hp !== TUNE.PLAYER_HP) fail('invulnerable player took damage or died');
        checkScene(g, fail);
      } finally { trigger(g, false); pointer.positionToCamera = originalAim; }
    });
    return catalog.weapons.length;
  }
  function mobs() {
    const kinds = catalog.enemies.map(e => e.id);
    if (kinds.length + 1 !== Object.keys(ENEMY).length || !Object.hasOwn(ENEMY, 'wyrmseg')) fails.push('Lab roster does not cover the enemy registry');
    const bosses = new Set(catalog.enemies.filter(e => e.boss).map(e => e.id));
    for (const id of kinds) test(id, fail => {
      const groups = [{ kind: id, count: id === 'linker' || id === 'sparker' ? 2 : 1 }];
      if (['warden', 'mender', 'welder', 'spotter', 'banner', 'warhorn'].includes(id)) groups.push({ kind: 'grunt' });
      const g = load(bosses.has(id) ? 'bosses' : 'encounter', { weapon: 'rail', groups, invulnerable: true });
      const e = enemies(g).find(e => e.kind === id);
      if (!e) { fail('did not warp in'); return; }
      const phaseStates = new Set();
      const observe = (ms, step = 100) => {
        for (let time = 0; time < ms; time += step) { T.run(step); phaseStates.add(e.ai); }
        checkScene(g, fail);
      };
      if (bosses.has(id) && g.boss !== e) fail('boss HUD has no target');
      observe(bosses.has(id) ? 8000 : 3800);
      if (id === 'linker' && !e.partner) fail('pair did not link');
      if (id === 'wyrm' && e.segs.length !== TUNE.WYRM.segs) fail('missing body segments');
      if (!e.alive) return; // suicide enemies and friendly fire can finish the encounter first
      const strike = dmg => {
        if (!stepUntil(() => !e.under, 7000, 17)) throw new Error('never became targetable');
        g.damageEnemy(e, dmg, 0, -1, 'crush'); T.run(50);
      };
      if (id === 'boss' || id === 'foreman' || id === 'jugg') {
        const fractions = id === 'boss' ? [0.61, 0.30, 0.12] : id === 'foreman' ? [0.55, 0.2] : [0.61, 0.30];
        for (const [i, fraction] of fractions.entries()) {
          strike(e.hp - e.def.hp * fraction);
          if ((id === 'jugg' ? e.stage : e.phase - 1) !== i + 1) fail('did not enter phase ' + (i + 2));
          observe(id === 'foreman' && i === 1 ? 14000 : 3200);
        }
        if (id === 'jugg' && !phaseStates.has('fire')) fail('Juggernaut did not fire');
        if (id === 'foreman' && (!phaseStates.has('spray') || !enemies(g).some(o => o.kind === 'hound' && o.summoned))) fail('Foreman did not use its spray and hound reinforcements');
        if (id === 'boss' && ![...phaseStates].some(state => state === 'breath' || state === 'mortarWind')) fail('Smelter did not attack');
      } else if (id === 'wyrm') {
        if (!stepUntil(() => e.segs.some(part => !part.under), 7000, 17)) { fail('no body segment surfaced'); return; }
        const part = e.segs.find(part => !part.under), hp = e.hp;
        g.damageEnemy(part, 10, 0, -1, 'crush');
        if (e.hp >= hp) fail('segment did not transfer damage to the head');
        strike(e.hp - e.def.hp * 0.4);
        if (!stepUntil(() => g.slagList.some(s => s.active && !s.rain), 9000, 17)) fail('low-health Wyrm never spat slag');
      } else {
        const hp = e.hp; strike(4);
        if (e.alive && e.hp >= hp) fail('took no damage');
        if (id === 'gunship') {
          strike(e.hp - e.def.hp * 0.3);
          observe(6500);
          if (!phaseStates.has('volley') || !phaseStates.has('strafe') || e.drops < 1) fail('Gunship did not use rockets, strafing and a drop');
        }
      }
      if (e.alive) strike(e.hp * 8 + 100);
      if (e.alive) fail('did not die after the finishing hit');
      T.run(2000); checkScene(g, fail);
      if (g.state !== 'play') fail('room closed when the encounter ended');
      if (id === 'slagling') {
        const children = enemies(g).filter(o => o.kind === 'slagmid');
        if (children.length !== 2) fail('missing slagmid children');
        for (const child of children) g.damageEnemy(child, 999, 0, -1, 'crush');
        T.run(400);
        const bits = enemies(g).filter(o => o.kind === 'slagbit');
        if (bits.length !== 4) fail('missing slagbit children');
        for (const bit of bits) g.damageEnemy(bit, 999, 0, -1, 'crush');
        if (lab.snapshot().remaining !== 0) fail('split children did not clear the encounter');
      }
    });
    test('split readiness', fail => {
      const g = load('range', { groups: [{ kind: 'slagling' }] });
      const [e] = enemies(g);
      g.damageEnemy(e, 999, 0, -1, 'crush');
      const pending = lab.snapshot();
      if (pending.ready || pending.remaining !== 2 || pending.enemies.length) fail('snapshot marked the pending halves as ready');
      T.run(300);
      if (!lab.snapshot().ready || enemies(g).length !== 2) fail('snapshot did not become ready when both halves spawned');
    });
    for (const elite of ELITE_KINDS) test(elite + ' elite', fail => {
      const g = load('range', { groups: [{ kind: 'heavy', elite }] });
      const [e] = enemies(g), hp = e.hp;
      if (e.elite !== elite || hp <= ENEMY.heavy.hp) fail('elite setup was not applied');
      g.damageEnemy(e, 10, 0, 0, 'crush');
      if (elite === 'shielded' && (e.hp !== hp || !(e.esh < e.eshMax))) fail('shield did not absorb the hit');
      if (elite === 'regen') {
        const hurt = e.hp;
        T.run(3200);
        if (e.hp <= hurt) fail('did not heal after taking damage');
      }
      g.damageEnemy(e, 999, 0, 0, 'crush'); T.run(900);
      if (e.alive || lab.snapshot().remaining) fail('elite death did not clear');
    });
    return Object.keys(ENEMY).length;
  }
  function hazards() {
    const checks = {
      blackout(fail) {
        const g = load('range', { modifier: 'dark', groups: [] }); T.run(600);
        if (!g.darkImg.visible || g.darkA <= 0) fail('darkness did not appear');
        lab.reset(); T.run(1500);
        if (T.g().mod !== 'dark') fail('reset lost the modifier');
      },
      gravity(fail) {
        const g = load('range', { modifier: 'lowg', groups: [] });
        if (g.physics.world.gravity.y !== TUNE.GRAVITY / 2) fail('world gravity did not halve');
        if (load('range', { groups: [] }).physics.world.gravity.y !== TUNE.GRAVITY) fail('gravity leaked into the next room');
      },
      rain(fail) {
        const g = load('range', { modifier: 'slag', groups: [] });
        if (!stepUntil(() => g.slagList.some(s => s.active && s.rain), 4500)) fail('no slag fell');
        if (!stepUntil(() => g.puddles.some(p => p.rain), 4500)) fail('slag did not make a puddle');
      },
      tide(fail) {
        const g = load('range', { modifier: 'melt', groups: [], invulnerable: false });
        if (!stepUntil(() => g.hp < TUNE.PLAYER_HP, 14000)) fail('rising slag did not hurt a grounded player');
      },
      vents(fail) {
        const g = load('furnace'), jet = g.jets[0];
        g.player.body.reset(jet.x, jet.y - 14);
        if (!stepUntil(() => g.hp < TUNE.PLAYER_HP, 10000)) fail('furnace vent did not hurt the player');
      },
      belts(fail) {
        const g = load('machinery'), belt = g.belts[0];
        const x = belt.x0 + 32; g.player.body.reset(x, belt.y - 12); T.run(350);
        if ((g.player.x - x) * Math.sign(belt.v) < 3) fail('belt did not carry the player');
      },
      presses(fail) {
        const g = load('machinery'), press = g.presses[2]; // the two floor presses sit over moving belts
        g.player.body.reset(press.x, press.bot - 12);
        if (!stepUntil(() => g.hp < TUNE.PLAYER_HP, 6000, 17)) fail('press did not hurt the player');
      },
      rails(fail) {
        const g = load('rails'), rail = g.rails.find(r => r.g === 0);
        g.player.body.reset((rail.x0 + rail.x1) / 2, rail.y - 12);
        if (!stepUntil(() => g.hp < TUNE.PLAYER_HP, 7500)) fail('rail did not hurt the player');
      },
      ball(fail) {
        const g = load('yard');
        if (!stepUntil(() => {
          const W = g.wreck;
          if (Math.hypot(W.vx, W.vy) > 100) g.player.body.reset(W.x, W.y);
          return g.hp < TUNE.PLAYER_HP;
        }, 6000, 17)) fail('wrecking ball did not hurt the player');
      },
      // ARENAS 06-10's machinery, in their Lab rooms
      flood(fail) {
        const g = load('tower'), W = g.flood;
        W.t = 0; T.run(50); W.live = true;                               // this one goes live
        if (W.st !== 'warn') fail('no klaxon before the flood');
        if (!stepUntil(() => W.k >= 1, 7000)) fail('the coolant did not rise');
        g.player.body.reset(10 * TS + 8, 25 * TS - 12);
        if (!stepUntil(() => g.hp < TUNE.PLAYER_HP, 5000)) fail('the live flood did not hurt a wading player');
        if (!stepUntil(() => W.st === 'idle' && W.k === 0, 12000)) fail('the flood did not drain');
      },
      icicles(fail) {
        const g = load('vault'), [I, J] = g.vault.icicles.filter(i => i.y === 18 * TS);   // under the shelves, over the floor
        I.k = 1; I.st = 'ripe'; I.t = 0; g.player.body.reset(I.x, I.fy - 12);
        if (!stepUntil(() => g.hp < TUNE.PLAYER_HP, 3000, 17)) fail('a falling icicle did not hurt the player under it');
        J.k = 1; J.st = 'ripe'; J.t = 99;
        if (!g.hitIcicleAt(J.x, J.y + 8) || J.st !== 'fall') fail('a shot did not bring an icicle down');
        if (!stepUntil(() => J.st === 'gone', 3000, 17)) fail('the dropped icicle did not shatter');
      },
      'vault ice and vents'(fail) {
        const g = load('vault'), S = g.vault.sheets[0], vt = g.vault.vents[0];
        g.player.body.reset(S.x, S.y - 12); T.run(200);
        if (!g.onIce) fail('the vault floor ice did not make the player slide');
        vt.st = 'idle'; vt.t = 0; g.player.body.reset(vt.x, vt.y - 12);
        if (!stepUntil(() => g.hp < TUNE.PLAYER_HP && g.chillT > 0, 4000, 17)) fail('a cryo vent did not chill the player standing on it');
      },
      lightning(fail) {
        const g = load('storm'), W = g.storm;
        g.player.body.reset(28 * TS + 8, 25 * TS - 12); T.run(100);      // open sky over it
        W.next = 99; W.marks.push({ x: g.player.x, y: g.floorBelow(g.player.x, 2 * TS + 2, 400), t: 0.4 });
        if (!stepUntil(() => g.hp < TUNE.PLAYER_HP, 1500, 17)) fail('lightning on its mark did not hurt the player');
      },
      'storm gust'(fail) {
        const g = load('storm'), Gs = g.storm.gust, x = 58 * TS + 8;
        g.player.body.reset(x, 25 * TS - 12); T.run(100);
        Gs.st = 'idle'; Gs.t = 0; T.run(50);
        if (Gs.st !== 'warn') fail('no streaks before the gust');
        stepUntil(() => Gs.st === 'blow', 2500); T.run(1500);
        if (Math.abs(g.player.x - x) < 40) fail('the gust did not push the player');
      },
      crusher(fail) {
        const g = load('crusher'), W = g.crusher;
        g.player.body.reset(20 * TS + 8, 25 * TS - 12); T.run(100);
        W.st = 'idle'; W.t = 0;
        if (!stepUntil(() => g.player.x > 26 * TS, 7000)) fail('the closing wall did not push the player');
        if (!stepUntil(() => g.hp < TUNE.PLAYER_HP, 3000, 17)) fail('the walls did not crush the player against the anvil');
        if (!stepUntil(() => W.st === 'idle', 6000)) fail('the walls did not open again');
      },
      updraft(fail) {
        const g = load('turbine'), F = g.turbine.fans[1];
        g.player.body.reset(F.x, 25 * TS - 12); T.run(50);
        const y = g.player.y; T.run(800);
        if (g.player.y > y - 48) fail('the fan updraft did not lift the player');
      },
      rotors(fail) {
        const g = load('turbine'), W = g.turbine, Rt = W.rotors[0], hold = () => { g.player.body.reset(Rt.x + 18, Rt.y); return g.hp < TUNE.PLAYER_HP; };
        W.clock = 5; Rt.w = 0;                                           // its standing phase
        if (stepUntil(hold, 1200, 17)) fail('a standing rotor hurt the player');
        W.clock = 0; Rt.w = 10;
        if (!stepUntil(hold, 1500, 17)) fail('a spinning rotor did not hurt the player');
      },
      'turbine gust'(fail) {
        const g = load('turbine'), Gs = g.turbine.gust, x = 30 * TS;
        g.player.body.reset(x, 9 * TS - 12); T.run(50);
        Gs.st = 'blow'; Gs.t = 3; T.run(1200);
        if (g.player.x < x + 40) fail('the turbine gust did not push the player');
      },
      breakables(fail) {
        const g = load('breakables');
        for (const p of g.props) g.hitProp(p, p.hp + 1, 'rocket', p.cx, p.cy, 1, 0);
        g.damageTile(22, 24, 999); g.damageTile(44, 20, 999); g.burstPipe(g.pipes[0]);
        T.run(6500);
        if (g.props.some(p => !['gone', 'x'].includes(p.st))) fail('a prop did not finish breaking');
        if (g.grid[24][22] !== '.' || g.grid[20][44] !== '.') fail('crate or girder did not break');
        lab.reset(); T.run(1500);
        if (g.props.some(p => p.st !== 'ok') || g.grid[24][22] !== 'x' || g.grid[20][44] !== 'g' || g.pipes[0].broken) fail('reset did not restore terrain and props');
      },
      'stationary spawn on platforms'(fail) {
        const g = load('traversal', { groups: [{ kind: 'grunt', count: 12 }], stationary: true });
        const targets = enemies(g);
        if (targets.length !== 12) { fail('the whole roster did not spawn'); return; }
        for (const e of targets) {
          const b = e.body;
          if (g.solidAt(b.left + 1, b.top + 1) || g.solidAt(b.right - 1, b.bottom - 1)) fail('target spawned inside a solid');
        }
      },
      'stationary targets stay idle under fire'(fail) {
        const g = load('range', { groups: [{ kind: 'grunt' }, { kind: 'enforcer' }] });
        for (const e of enemies(g)) { e.aggro = false; e.ai = e.kind === 'grunt' ? 'patrol' : 'idle'; }
        g.makeNoise(g.player.x, g.player.y, 400, true);
        if (enemies(g).some(e => e.aggro)) fail('gunfire alerted a stationary target');
      },
      'traversal equipment'(fail) {
        const g = load('traversal');
        const key = name => { g.keys[name].isDown = g.keys[name]._justDown = true; };
        const release = name => { g.keys[name].isDown = false; };
        const y = g.player.y;
        key('SPACE'); T.run(180); release('SPACE');
        if (g.player.y >= y - 25) fail('jump did not gain height');
        key('D'); key('SHIFT'); T.run(100); release('D'); release('SHIFT');
        if (!g.dashing && g.dashReady <= g.time.now) fail('dash did not start');
        g.player.body.reset(56 * TS + 8, 388); T.run(180);
        const pointer = g.input.activePointer, aim = pointer.positionToCamera;
        pointer.positionToCamera = (_cam, out) => out.set(g.player.x, 20);
        try {
          g.aimMode = 'mouse'; key('C'); T.run(17); release('C');
          if (!stepUntil(() => g.hook?.state === 'zip', 550, 17)) fail('grapple did not latch onto the overhead anchor');
        } finally { pointer.positionToCamera = aim; }
      },
      'death before warp'(fail) {
        lab.load('bosses'); T.run(100);
        const g = T.g();
        g.hurtPlayer(200, 0); T.run(1700);
        const s = lab.snapshot();
        if (s.enemies.length || s.remaining !== 0 || s.total !== 0) fail('cancelled warp still counted as a hostile');
        lab.reset(); T.run(1600);
        if (!lab.snapshot().enemies.some(e => e.id === 'boss')) fail('reset did not redeploy the cancelled boss');
      },
    };
    for (const [id, run] of Object.entries(checks)) test(id, run);
    return Object.keys(checks).length;
  }
  try {
    const count = { weapons, mobs, hazards }[section]();
    return { count, fails };
  } finally { Math.random = originalRandom; }
};
