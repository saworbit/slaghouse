// =============================================================================
//  LAB CONTROLS
// =============================================================================
function activeLab() {
  const scene = window.game?.scene.getScene('Game');
  return scene?.lab && (scene.sys.isActive() || scene.sys.isPaused()) ? scene : null;
}

function deployLab(room, options) {
  const lab = labConfig(room, options);
  const spawns = labSpawns(lab);                                        // check that the roster fits before restarting
  const live = activeLab(), title = game.scene.getScene('Title');
  if (!live && (!title.sys.isActive() || title.started)) throw new Error('Open the Lab from the title screen.');
  LAB_PANEL.close(false);
  Sfx.init(); Sfx.startHum(); Sfx.stopLoops(); Music.start();
  if (live) {
    live.labTransition = true;
    live.scene.restart({ lab, spawns });
  }
  else {
    title.started = true;
    title.scene.start('Game', { lab, spawns });
    title.scene.launch('Hud');
  }
  return labConfig(room, lab);
}

const LAB_PANEL = (() => {
  const dialog = document.getElementById('lab-panel'), form = document.getElementById('lab-form');
  const dock = document.getElementById('lab-dock'), list = document.getElementById('lab-groups');
  const reset = document.getElementById('lab-reset'), exit = document.getElementById('lab-exit');
  const resume = document.getElementById('lab-resume'), add = document.getElementById('lab-add');
  const error = document.getElementById('lab-error'), detail = document.getElementById('lab-room-detail');
  const tallyLbl = document.getElementById('lab-tally'), deploy = form.querySelector('button[type=submit]');
  const { room, weapon, difficulty, modifier, stationary, invulnerable } = form.elements;
  const touched = new Set();                                          // fields changed since the room's preset loaded: a new room keeps them
  let resumeGame = null, padArmed = false;
  const fillSelect = (select, choices) => select.replaceChildren(...choices.map(([value, label]) => new Option(label, value)));
  fillSelect(room, Object.entries(LAB_ROOMS).map(([id, data]) => [id, data.name]));
  fillSelect(weapon, WEAPONS.map(w => [w.id, w.name]));
  fillSelect(difficulty, DIFFS.map((d, i) => [i, d.name]));
  fillSelect(modifier, Object.entries(LAB_MODIFIERS));
  const field = (label, input) => { const node = document.createElement('label'); node.append(label, input); return node; };
  const report = message => { error.textContent = message; error.hidden = !message; };
  function addGroup({ kind = 'grunt', count = 1, elite = null } = {}) {
    if (list.children.length >= LAB_MAX_ENEMIES) return;
    const row = document.createElement('div'); row.className = 'lab-group';
    const enemy = document.createElement('select'), qty = document.createElement('input');
    const rank = document.createElement('select'), remove = document.createElement('button');
    enemy.dataset.field = 'kind'; qty.dataset.field = 'count'; rank.dataset.field = 'elite';
    fillSelect(enemy, LAB_ENEMIES.map(e => [e.id, e.name])); enemy.value = kind;
    Object.assign(qty, { type: 'number', min: 1, max: LAB_MAX_ENEMIES, required: true, value: count });
    const updateElite = () => {
      rank.disabled = NO_ELITE.has(enemy.value) || !!ENEMY[enemy.value].tiny;
      if (rank.disabled) rank.value = '';
    };
    fillSelect(rank, [['', 'Standard'], ...ELITE_KINDS.map(id => [id, id === 'regen' ? 'Regenerating' : id[0].toUpperCase() + id.slice(1)])]);
    rank.value = elite || ''; updateElite(); enemy.addEventListener('change', updateElite);
    remove.type = 'button'; remove.textContent = 'Remove';
    remove.addEventListener('click', () => { row.remove(); add.disabled = false; add.focus(); touched.add('groups'); tally(); });
    row.append(field('Enemy', enemy), field('Count', qty), field('Elite', rank), remove);
    list.append(row); add.disabled = list.children.length >= LAB_MAX_ENEMIES;
    tally();
    return enemy;
  }
  function tally() {                                                  // live totals beside Add group; Deploy waits while the roster is over
    let total = 0, bosses = 0;
    for (const row of list.children) {
      const n = Math.max(0, Math.floor(Number(row.querySelector('[data-field=count]').value) || 0));
      total += n; if (LAB_BOSSES.has(row.querySelector('[data-field=kind]').value)) bosses += n;
    }
    const over = total > LAB_MAX_ENEMIES || bosses > 1;
    tallyLbl.textContent = `Enemies ${total} / ${LAB_MAX_ENEMIES} · Bosses ${bosses} / 1`;
    tallyLbl.classList.toggle('over', over); deploy.disabled = over;
  }
  function load(config) {
    room.value = config.room; weapon.value = config.weapon; difficulty.value = config.difficulty;
    modifier.value = config.modifier; stationary.checked = config.stationary; invulnerable.checked = config.invulnerable;
    detail.textContent = LAB_ROOMS[config.room].detail;
    list.replaceChildren(); add.disabled = false; config.groups.forEach(addGroup); report(''); tally();
    touched.clear();
  }
  function changeRoom() {                                             // the new room's preset fills only the fields you haven't changed
    const preset = labConfig(room.value);
    detail.textContent = LAB_ROOMS[room.value].detail;
    if (!touched.has('weapon')) weapon.value = preset.weapon;
    if (!touched.has('difficulty')) difficulty.value = preset.difficulty;
    if (!touched.has('modifier')) modifier.value = preset.modifier;
    if (!touched.has('stationary')) stationary.checked = preset.stationary;
    if (!touched.has('invulnerable')) invulnerable.checked = preset.invulnerable;
    if (!touched.has('groups')) { list.replaceChildren(); add.disabled = false; preset.groups.forEach(addGroup); }
    report(''); tally();
  }
  function open(initial = 'range') {
    if (dialog.open) return;
    const live = activeLab(), title = game.scene.getScene('Title');
    if (!live && (!title.sys.isActive() || title.started)) return;
    load(live?.lab ?? labConfig(initial));
    resumeGame = live?.sys.isActive() && live.state === 'play' ? live : null;
    if (resumeGame) live.pauseGame();
    reset.hidden = exit.hidden = !live;
    resume.textContent = resumeGame ? 'Resume' : 'Back';
    dialog.showModal();
    room.focus();
    padArmed = false;                                                 // the press that opened the dialog can't also pick a field
    if (unknownRoom) { report(`There is no Lab room called "${unknownRoom}". Opened the ${LAB_ROOMS.range.name}.`); unknownRoom = null; }
  }
  const focusable = () => Array.from(dialog.querySelectorAll('button, select, input')).filter(el => !el.disabled && !el.hidden);
  // A standard-mapped pad drives the dialog: D-pad or left stick up/down moves between fields, left/right changes a
  // list or a count, A presses a button or ticks a box, B or Start backs out like Esc. Runs after PAD.poll each step,
  // and swallows the presses it uses so the title, pause menu or a fresh run don't act on them too.
  function pad() {
    if (!dialog.open || !PAD.on) return;
    if (!padArmed) { if (!PAD.b.some(v => v > 0.4)) padArmed = true; return; }
    const my = PAD.menuY(), mx = PAD.menuX(), a = PAD.jd(0), back = PAD.jd(1) || PAD.jd(9);
    if (!my && !mx && !a && !back) return;
    dialog.classList.add('lab-pad');
    const fields = focusable(), el = document.activeElement, at = fields.indexOf(el);
    if (my) (fields[(at + my + fields.length) % fields.length] || fields[0])?.focus();
    else if (mx && el?.tagName === 'SELECT') {
      const i = clamp(el.selectedIndex + mx, 0, el.options.length - 1);
      if (i !== el.selectedIndex) { el.selectedIndex = i; el.dispatchEvent(new Event('change', { bubbles: true })); }
    } else if (mx && el?.type === 'number') {
      el.value = clamp((Number(el.value) || 0) + mx, Number(el.min), Number(el.max)); el.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (a && el?.type === 'checkbox') { el.checked = !el.checked; el.dispatchEvent(new Event('change', { bubbles: true })); }
    else if (a && el?.tagName === 'BUTTON') el.click();
    else if (back) close();
    PAD.prev = PAD.b.slice(); PAD.prevStickY = PAD.stickY; PAD.prevStickX = PAD.stickX;
  }
  function close(shouldResume = true) {
    if (!dialog.open) return;
    dialog.close();
    if (shouldResume && resumeGame?.sys.isPaused()) {
      resumeGame.scene.resume(); BUS.emit('pause', false);
    }
    resumeGame = null;
    document.activeElement?.blur();
  }
  // Phaser listens on window. Keep the dialog's keyboard navigation and clicks inside the controls.
  for (const event of ['keydown', 'keyup', 'pointerdown', 'pointerup']) dialog.addEventListener(event, e => e.stopPropagation());
  for (const event of ['keydown', 'pointerdown']) dialog.addEventListener(event, () => dialog.classList.remove('lab-pad'));
  for (const el of [weapon, difficulty, modifier, stationary, invulnerable]) el.addEventListener('change', () => touched.add(el.name));
  list.addEventListener('change', () => { touched.add('groups'); tally(); });
  list.addEventListener('input', () => { touched.add('groups'); tally(); });
  dialog.addEventListener('cancel', e => { e.preventDefault(); close(); });
  dialog.addEventListener('keydown', e => {
    if (e.key === 'F2') { e.preventDefault(); close(); }
    if (e.key === 'Tab') {
      const fields = Array.from(dialog.querySelectorAll('button, select, input')).filter(el => !el.disabled && !el.hidden);
      const next = fields.indexOf(document.activeElement) + (e.shiftKey ? -1 : 1);
      fields[(next + fields.length) % fields.length].focus();
      e.preventDefault();
    }
  });
  room.addEventListener('change', changeRoom);
  add.addEventListener('click', () => { touched.add('groups'); addGroup()?.focus(); });
  resume.addEventListener('click', () => close());
  reset.addEventListener('click', () => { const live = activeLab(); if (live) deployLab(live.lab.room, live.lab); });
  exit.addEventListener('click', () => { const live = activeLab(); close(false); live?.quitToTitle(); });
  dock.addEventListener('click', () => open());
  window.addEventListener('keydown', e => {
    if (e.key === 'F2' && !e.repeat && activeLab()) { e.preventDefault(); open(); }
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const groups = Array.from(list.children, row => {
      const value = field => row.querySelector(`[data-field=${field}]`).value;
      return { kind: value('kind'), count: Number(value('count')), elite: value('elite') || null };
    });
    try {
      deployLab(room.value, { weapon: weapon.value, difficulty: Number(difficulty.value), modifier: modifier.value,
        stationary: stationary.checked, invulnerable: invulnerable.checked, groups });
    } catch (err) { report(err.message); }
  });
  const initial = new URLSearchParams(location.search).get('lab');
  let unknownRoom = initial !== null && !Object.hasOwn(LAB_ROOMS, initial) ? initial : null;   // ?lab= named no room: say so when the Lab opens
  return { open, close, pad, isOpen: () => dialog.open, dock, initialRoom: initial === null ? null : Object.hasOwn(LAB_ROOMS, initial) ? initial : 'range' };
})();

window.SlagLab = Object.freeze({
  catalog() {
    return {
      rooms: Object.entries(LAB_ROOMS).map(([id, { name, detail }]) => ({ id, name, detail, preset: labConfig(id) })),
      weapons: WEAPONS.map(({ id, name }) => ({ id, name })),
      enemies: LAB_ENEMIES.map(({ id, name }) => ({ id, name, hp: ENEMY[id].hp, boss: LAB_BOSSES.has(id),
        elites: NO_ELITE.has(id) || ENEMY[id].tiny ? [] : [...ELITE_KINDS] })),
      difficulties: DIFFS.map((d, id) => ({ id, name: d.name })),
      modifiers: { ...LAB_MODIFIERS }, maxEnemies: LAB_MAX_ENEMIES,
    };
  },
  load: deployLab,
  reset() {
    const g = activeLab(); if (!g) throw new Error('Load a Lab room first.');
    return deployLab(g.lab.room, g.lab);
  },
  snapshot() {
    const g = activeLab(); if (!g) return null;
    const position = body => ({ x: body.center.x, y: body.center.y, vx: body.velocity.x, vy: body.velocity.y });
    const enemies = g.enemies.getChildren().filter(e => e.alive).map(e => ({ id: e.kind, hp: e.hp, maxHp: e.def.hp,
      elite: e.elite ?? null, summoned: e.summoned, targetable: e.body.enable && !e.under, ...position(e.body) }));
    return {
      config: labConfig(g.lab.room, g.lab), state: g.state, paused: g.paused,
      ready: !g.labTransition && !g.needReset && g.labPending === 0,
      elapsedMs: Math.round(g.time.now - g.stats.t0),
      player: { ...position(g.player.body), hp: g.hp, weapon: WEAPONS[g.weapon].id },
      stats: { ...g.stats, wk: { ...g.stats.wk } }, enemies,
      props: g.props.map(p => ({ id: p.kind, x: p.cx, y: p.cy, hp: p.hp, state: p.st })),
      remaining: g.enemiesLeft, total: g.totalEnemies,
    };
  },
});

