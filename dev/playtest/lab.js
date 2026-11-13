// Step the same Lab rooms the title menu launches, through the public browser API.
window.checkLab = () => {
  const fails = [], check = (pass, message) => { if (!pass) fails.push(message); };
  const storage = () => JSON.stringify(Object.entries(localStorage).sort());
  const saved = storage(), before = JSON.stringify({ LIFE, MASTERY, seen: [...SEEN] });
  const lab = SlagLab, catalog = lab.catalog();
  T.start();
  for (const { id, preset } of catalog.rooms) {
    lab.load(id); T.run(1550);
    const s = lab.snapshot(), count = preset.groups.reduce((sum, group) => sum + group.count, 0);
    check(s.ready && s.config.room === id && s.player.weapon === preset.weapon && s.remaining === count, id + ' preset did not deploy');
    check(T.g().weaponSlots.length === catalog.weapons.length, id + ' did not issue every weapon');
  }
  for (const { id, preset } of catalog.rooms) {
    for (const { id: kind } of catalog.enemies) {
      try { labSpawns(labConfig(id, { ...preset, groups: [{ kind }] })); }
      catch { fails.push(id + ' has no spawn for ' + kind); }
    }
  }

  lab.load('range', { weapon: 'rail', groups: [{ kind: 'grunt', elite: 'armored' }] }); T.run(1400);
  let s = lab.snapshot(), g = T.g();
  check(s.ready && s.remaining === 1 && s.enemies[0]?.elite === 'armored', 'elite spawn missing');
  const x = s.enemies[0]?.x;
  T.run(1000);
  check(lab.snapshot().enemies[0]?.x === x, 'stationary target moved on its own');
  g.hurtPlayer(200, 0);
  check(g.hp === 100, 'invulnerability did not block damage');
  g.keys.J.isDown = g.keys.J._justDown = true; T.run(2500); g.keys.J.isDown = false;
  s = lab.snapshot();
  check(s.stats.shots > 0 && s.stats.hits > 0 && s.stats.kills === 1 && s.remaining === 0 && s.state === 'play',
    `firing did not kill the target and leave the room open (${s.stats.hits}/${s.stats.shots} hits, target HP ${s.enemies[0]?.hp})`);
  try { lab.load('range', { groups: [{ kind: 'nope' }] }); fails.push('invalid roster was accepted'); }
  catch (e) { check(e instanceof RangeError && lab.snapshot().stats.kills === s.stats.kills, 'invalid roster changed the current run'); }

  lab.reset(); T.run(1400); s = lab.snapshot();
  check(s.ready && s.remaining === 1 && s.enemies[0]?.x === x && s.stats.kills === 0, 'reset did not restore the configured target and stats');
  lab.load('breakables'); T.run(100);
  g = T.g(); const oil = g.props.find(p => p.kind === 'oil');
  g.hitProp(oil, oil.hp + 1, 'rocket', oil.cx, oil.cy, 1, 0); T.run(100);
  check(lab.snapshot().props.find(p => p.id === 'oil')?.state !== 'ok', 'broken prop is missing from the snapshot');
  lab.reset(); T.run(100);
  check(lab.snapshot().props.find(p => p.id === 'oil')?.state === 'ok', 'reset did not restock the prop');

  lab.load('encounter', { groups: [{ kind: 'gnat' }], stationary: true, modifier: 'lowg' }); T.run(1000);
  g = T.g(); const gnat = g.enemies.getChildren()[0];
  g.damageEnemy(gnat, 999, 1, 0, 'rail');
  check(lab.snapshot().remaining === 0, 'tiny enemy did not count as cleared');
  check(g.physics.world.gravity.y === TUNE.GRAVITY / 2, 'low gravity was not applied');
  g.hurtPlayer(200, 0); T.run(1600);
  check(lab.snapshot().state === 'dead' && g.overShown, 'Lab death did not finish');
  lab.reset(); T.run(1000);
  check(lab.snapshot().state === 'play' && lab.snapshot().player.hp === 100, 'reset after death did not restore play');
  check(saved === storage() && before === JSON.stringify({ LIFE, MASTERY, seen: [...SEEN] }), 'Lab modified progression');
  return fails;
};
