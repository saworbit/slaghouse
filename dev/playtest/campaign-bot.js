// Campaign controller. Observes the scene and drives the player controls one simulation frame at a time.
window.campaignBot = () => {
  const priority = ['vampire', 'djump', 'hollow', 'trigger', 'burner', 'scav', 'adren', 'blast', 'style', 'boots', 'thorns'];
  const grounded = b => b.blocked.down || b.touching.down;
  const xOf = node => (node.x + 0.5) * TS;
  const feetOf = node => (node.y + 1) * TS;
  let player, graph, walk, plan, action, timeout, failedEdges, focus, progress, lastHp, aim, motion, detour, anchor;
  const input = (g, key, held, press = false) => {
    g.keys[key].isDown = held;
    g.keys[key]._justDown = press;
  };
  const steer = (dx, velocity, air = false) => {
    const stop = Math.sign(velocity) * velocity * velocity / (2 * (air ? 1250 : TUNE.GROUND_DECEL));
    const delta = dx - stop;
    return Math.abs(delta) < 3 ? 0 : Math.sign(delta);
  };

  // Ground that hurts to stand on, with the same tests the scene uses plus a little margin: fire and slag puddles,
  // acid, a foe's gas, a cooking propane prop's jet, a tipped ladle's slag stream, live water and live rails. feet is the bottom
  // of the player's body.
  function hazardAt(g, x, feet) {
    const top = feet - 24, cy = feet - 12;
    for (const P of g.puddles) if (Math.abs(x - P.x) < P.w / 2 + 9 && Math.abs(feet - P.y) < 8) return true;
    for (const A of g.acids) if (Math.abs(x - A.x) < A.w / 2 + 7 && Math.abs(feet - A.y) < 6) return true;
    for (const C of g.clouds) if (!C.mine && Math.hypot(x - C.x, cy - C.y) < C.r + 8) return true;
    for (const W of g.waters) if (W.zap > 0 && Math.abs(x - W.x) < W.w / 2 * W.grow + 7 && Math.abs(feet - W.y) < 7) return true;
    const C = g.railCyc;                                               // ARENA 05's rails: off them from the warning on
    if (C && C.st !== 'idle') for (const R0 of g.rails) if (R0.g === C.g && x > R0.x0 - 7 && x < R0.x1 + 7 && Math.abs(feet - R0.y) < 6) return true;
    for (const p of g.props) if (p.st === 'live') {
      if (p.kind === 'propane') {
        const vx = p.x + p.jd * 2, vy = p.y - 16, x0 = Math.min(vx, vx + p.jd * 50), x1 = Math.max(vx, vx + p.jd * 50);
        if (x + 10 > x0 && x - 10 < x1 && feet > vy - 10 && top < vy + 10) return true;
      } else if (p.kind === 'ladle' && p.phase === 'pour') {               // the slag stream, from the lip to the floor
        const r = -p.sw + p.rot, lx = p.x - 11 * p.dir * Math.cos(r) - 6 * Math.sin(r), ly = p.y - 11 * p.dir * Math.sin(r) + 6 * Math.cos(r);
        if (Math.abs(x - lx) < 16 && feet > ly && top < (g.floorBelow(lx, ly) ?? LH)) return true;
      }
    }
    return false;
  }
  // the nearest floor beside the player, within reach along this floor, that isn't hazardous
  function safeGround(g, b) {
    for (let d = 16; d <= 176; d += 16) for (const side of [1, -1]) {
      const x = b.center.x + side * d;
      if (g.solidAt(x, b.center.y) || !g.standAt(x, b.bottom + 3) || hazardAt(g, x, b.bottom)) continue;
      let clear = true;
      for (let s = 8; s < d && clear; s += 8) if (g.solidAt(b.center.x + side * s, b.center.y) || !g.standAt(b.center.x + side * s, b.bottom + 3)) clear = false;
      if (clear) return x;
    }
    return null;
  }

  function nearestNode(b) {
    const current = navAt(b.center.x, b.bottom);
    if (current >= 0) return current;
    return navBelow(b.center.x, b.bottom - 2, MAP_H);
  }

  function avoidEdge(edge, now) {
    // Penalize the failed approach while keeping the landing platform available from other routes.
    const key = edge.from * NAV.nodes.length + edge.to;
    failedEdges.set(key, now + 20000);
    walk = null;
  }

  function choosePosition(g, start, value) {
    if (start < 0) return;
    const b = player.body, current = NAV.nodes[start], now = g.time.now;
    if (!walk || walk.start !== start || now >= walk.expires) {
      let expires = Infinity;
      for (const [key, until] of failedEdges) {
        if (until <= now) failedEdges.delete(key);
        else expires = Math.min(expires, until);
      }
      // the player's own moves count too: long drops and wall climbs, priced by playerCost (enemies can't take them)
      const edgeCost = (from, edge) => (edge.playerCost ?? edge.cost) + (failedEdges.has(from * NAV.nodes.length + edge.to) ? 32 : 0);
      walk = { start, expires, ...navDijkstra(start, -1, Infinity, edgeCost) };
    }
    let best = start, score = Infinity;
    for (let i = 0; i < NAV.nodes.length; i++) {
      const node = NAV.nodes[i], x = xOf(node), feet = feetOf(node), walkCost = walk.dist[i];
      const distance = Math.hypot(x - b.center.x, feet - b.bottom);
      const unreachable = !Number.isFinite(walkCost);
      if (unreachable && feet < b.bottom - 230) continue;
      const candidate = value(x, feet - 14) + (unreachable ? 115 + distance * 0.34 : walkCost * 3) + (i === start ? -9 : 0);
      if (candidate < score) { best = i; score = candidate; }
    }
    const target = NAV.nodes[best];
    if (best !== start && !Number.isFinite(walk.dist[best])) {
      // Leave the current platform for a lower level, or use the grapple to reach a higher surface.
      const side = Math.sign(target.x - current.x) || 1;
      return { best, fallback: true, x: xOf(target), feet: feetOf(target), side };
    }
    const path = navPath(walk, best);
    return { best, path, x: xOf(target), feet: feetOf(target) };
  }

  function grapple(g, x, feet) {
    const b = player.body, sx = player.x, sy = player.y - 2;
    if (g.hook || g.time.now < g.hookReady) return null;
    let best = null, score = Infinity;
    for (let tx = Math.floor((sx - 180) / TS); tx <= Math.floor((sx + 180) / TS); tx++) {
      for (let ty = 1; ty < Math.floor((b.bottom - 32) / TS); ty++) {
        const hx = (tx + 0.5) * TS, hy = (ty + 1) * TS;
        if (!g.solidAt(hx, hy - 2) || g.solidAt(hx, hy + 4)) continue;
        const d = Math.hypot(hx - sx, hy - sy);
        if (d > TUNE.HOOK.range - 8 || d < 40 || !g.los(sx, sy, hx, hy + 5)) continue;
        const value = Math.abs(hx - x) + Math.abs(hy - (feet - 48)) * 0.7;
        if (value < score) { best = { x: hx, y: hy - 2 }; score = value; }
      }
    }
    return best;
  }

  function move(g, targetX, targetFeet, immediate) {
    const b = player.body, now = g.time.now, ground = grounded(b), start = nearestNode(b);
    let dir = 0, jump = b.velocity.y < 0, press = false, drop = false, hook = null;
    if (g.hook?.state === 'zip') {
      return { dir: steer(targetX - b.center.x, b.velocity.x, true), jump: true, detach: b.top < targetFeet - 34 && Math.abs(b.center.x - targetX) < 65 };
    }
    if (action) {
      const from = NAV.nodes[action.edge.from], to = NAV.nodes[action.edge.to];
      const climb = action.edge.type === 'climb', limit = climb ? 1450 + (from ? from.y - to.y : 0) * 220 : 1450;
      if (!from || !to || now > action.t + limit || (ground && now > action.t + 100 && (action.air || now > action.t + 430))) {
        const landed = NAV.nodes[start];
        if (!landed || !to || landed.y !== to.y || Math.abs(landed.x - to.x) > 1) avoidEdge(action.edge, now);
        action = null;
        plan = null;
      } else {
        if (!ground) action.air = true;
        if (climb) {                                                    // hold into the wall and kick off it again until over the top
          const side = Math.sign(to.x - from.x), over = b.bottom <= feetOf(to) + 2;
          const kick = !over && !ground && now - g.wallT < TUNE.WALL.grace && b.velocity.y > -120 && now - (action.kick || 0) > 120;
          if (kick) action.kick = now;
          return { dir: side, jump: true, press: kick };
        }
        const up = to.y < from.y;
        const dx = xOf(to) - b.center.x;
        dir = up && b.bottom > feetOf(to) - 5 && b.velocity.y < 0 ? steer(xOf(from) - b.center.x, b.velocity.x, true) : steer(dx, b.velocity.x, true);
        if (up && g.perks.djump && !g.djUsed && !ground && b.velocity.y > -55 && b.bottom > feetOf(to) - 19) press = true;
        return { dir, jump: b.velocity.y < 0 || press || !action.air, press };
      }
    }
    if (immediate || !plan || start < 0) return { dir: steer(targetX - b.center.x, b.velocity.x, !ground), jump };
    if (plan.fallback) {
      const side = Math.sign(plan.x - b.center.x) || plan.side;
      const wall = side < 0 ? b.blocked.left || g.solidAt(b.left - 3, b.center.y) : b.blocked.right || g.solidAt(b.right + 3, b.center.y);
      if (wall) {
        press = ground || (now - g.wallT < TUNE.WALL.grace && b.velocity.y > -110) ||
          (!ground && g.perks.djump && !g.djUsed && b.velocity.y > -30);
        if (!press && b.velocity.y > -60) hook = grapple(g, plan.x, b.bottom - 96);
        return { dir: side, jump: jump || press, press, hook };
      }
      if (plan.feet < b.bottom - 22) {
        if (ground && Math.abs(plan.x - b.center.x) < 90) press = true;
        else if (!ground && g.perks.djump && !g.djUsed && b.velocity.y > -40) press = true;
        if (!press && !ground && b.velocity.y > -70) hook = grapple(g, plan.x, plan.feet);
        return { dir: side, jump: jump || press, press, hook };
      }
      if (ground && g.onOneWay() && Math.abs(plan.x - b.center.x) < 100) return { dir: 0, jump: true, press: true, drop: true };
      return { dir: steer(plan.x - b.center.x, b.velocity.x, !ground), jump };
    }
    const edge = plan.path.find(edge => edge.from === start);
    if (!edge) return { dir: steer(targetX - b.center.x, b.velocity.x, !ground), jump };
    const to = NAV.nodes[edge.to], from = NAV.nodes[edge.from];
    if (!ground || edge.type === 'walk' || edge.type === 'drop') {
      return { dir: steer(xOf(to) - b.center.x, b.velocity.x, !ground), jump };
    }
    const dx = xOf(from) - b.center.x;
    dir = steer(dx, b.velocity.x);
    if (Math.abs(dx) < 5 && Math.abs(b.velocity.x) < 65) {
      action = { edge, t: now, air: false };
      press = true; jump = true; drop = edge.type === 'fall';
      if ((edge.type === 'jump' && to.y >= from.y) || edge.type === 'climb') dir = Math.sign(to.x - from.x);
    }
    return { dir, jump, press, drop };
  }

  function threat(g) {
    const b = player.body, { x, y } = b.center;
    let closest = Infinity, dodge = 0;
    for (const list of [g.ebulletList, g.boltList, g.eprojList]) for (const p of list) {
      if (!p.active) continue;
      const vx = p.body.velocity.x, vy = p.body.velocity.y;
      const vv = vx * vx + vy * vy;
      if (vv < 1600) continue;
      const dx = x - p.x, dy = y - p.y, t = (dx * vx + dy * vy) / vv;
      if (t < 0 || t > 0.28 || t >= closest || Math.hypot(dx - vx * t, dy - vy * t) > (list === g.eprojList ? 28 : 16)) continue;
      if (!g.los(p.x, p.y, x, y)) continue;
      closest = t; dodge = Math.sign(-vx || dx) || 1;
    }
    return dodge;
  }

  function weapon(g, target, distance, throughCover) {
    const choices = throughCover ? ['rail'] : target.kind === 'sponge' ? ['rail', 'arc', 'acid'] :
      target.kind === 'boss' ? ['rail', 'marksman', 'nail'] :
      [...(distance < 130 && g.hp < 72 ? ['siphon'] : []), 'rail', ...(distance < 165 ? ['arc'] : []), 'nail'];
    const available = choices.map(weaponSlot).filter(i => g.weaponSlots.includes(i) && !g.locked.has(i));
    return available[0];
  }

  return g => {
    const b = g.player.body, now = g.time.now;
    if (player !== g.player || graph !== NAV) {
      player = g.player; graph = NAV; walk = plan = action = focus = motion = detour = anchor = null; timeout = 0; failedEdges = new Map(); progress = now;
    }
    if (g.perkOffer) {
      const choice = priority.find(id => g.perkOffer.includes(id)) || g.perkOffer[0];
      const hud = game.scene.getScene('Hud');
      hud.onPerkKey({ keyCode: 49 + g.perkOffer.indexOf(choice) });
    }
    const px = b.center.x, py = b.center.y, ground = grounded(b), start = nearestNode(b);
    const visible = (x, y) => g.los(px, py - 2, x, y);
    const foes = g.enemies.getChildren().filter(e => e.alive && !e.under && e.body.enable);
    const nearest = foes.reduce((best, e) => Math.hypot(e.x - px, e.y - py) < Math.hypot((best?.x ?? 1e5) - px, (best?.y ?? 0) - py) ? e : best, null);
    const rail = g.weaponSlots.includes(weaponSlot('rail'));
    const targets = foes.filter(e => visible(e.body.center.x, e.body.center.y) ||
      (rail && Math.hypot(e.x - px, e.y - py) < 420 && g.losHard(px, py - 2, e.body.center.x, e.body.center.y)));
    const target = targets.reduce((best, e) => {
      const rank = o => Math.hypot(o.x - px, o.y - py) + (o.summoned ? 100 : 0) - (g.canExecute(o) ? 20 : 0);
      return !best || rank(e) < rank(best) ? e : best;
    }, null);
    const objective = g.campaignRoute[0];
    const heal = !objective && g.hp <= 70 && g.pickups.filter(k => !k.taken)
      .sort((a, c) => Math.hypot(a.x - px, a.y - py) - Math.hypot(c.x - px, c.y - py))[0];
    const buried = g.enemies.getChildren().find(e => e.alive && e.under && !e.summoned && (e.kind === 'wyrm' || e.kind === 'burrower'));
    const foe = target || nearest || buried;
    if (focus !== foe || foe?.hp < lastHp) { focus = foe; lastHp = foe?.hp; progress = now; anchor = null; }
    const stall = now - progress > 2200;
    let gx = px, gy = b.bottom, direct = false;
    const out = ground && hazardAt(g, px, b.bottom) ? safeGround(g, b) : null;
    if (objective && Math.abs(py - (objective.y - 12)) < 8 && visible(objective.x, objective.y - 12)) {
      gx = objective.x; direct = true;
    } else if (out !== null) {                                         // standing in fire, acid, gas or a jet: step out first
      gx = out; direct = true;
    } else if (heal && Math.abs(heal.y - py) < 16 && visible(heal.x, heal.y) && (!foe || Math.abs(heal.x - px) < 200)) {
      gx = heal.x; direct = true;
    } else if (foe && target && !objective && (!heal || foe === g.boss) && (!stall || foe === g.boss) && Math.abs(foe.y - py) < 55 && !g.tide) {
      const dx = foe.x - px, dist = Math.abs(dx), side = Math.sign(dx) || 1;
      const space = g.canExecute(foe) ? 15 : (foe === g.boss ? 185 : 130);
      gx = px + side * (dist - space);
      if (!g.solidAt(px + Math.sign(gx - px) * 22, py) && (dist > 65 || g.standAt(gx, b.bottom + 3)) && !hazardAt(g, gx, b.bottom)) direct = true;
    }
    if (!direct && !action && ground && (now > timeout || !plan)) {
      const tide = g.mod === 'melt' ? TUNE.TIDE.top : LH;
      const goal = objective || heal;
      const targetX = foe?.body.center.x, targetY = foe?.body.center.y;
      plan = choosePosition(g, start, (x, y) => {
        const hazard = (y + 14 > tide ? 140 : 0) + (hazardAt(g, x, y + 14) ? 160 : 0);
        if (goal) return Math.abs(x - goal.x) * 1.8 + Math.abs(y - (objective ? goal.y - 14 : goal.y)) * 3 + hazard;
        if (!foe) return Math.abs(x - px) + Math.abs(y - py) + hazard;
        if (foe === buried) return Math.abs(x - (foe.ux ?? px)) * 0.16 + (LH - y) * 2 + hazard;
        const dist = Math.hypot(x - targetX, y - targetY);
        const sight = g.los(x, y, targetX, targetY);
        const softCover = rail && g.losHard(x, y, targetX, targetY);
        return (sight ? 0 : softCover ? 55 : 300) + Math.abs(dist - (foe === g.boss ? 200 : 135)) + hazard;
      });
      timeout = now + 420;
    }
    if (!direct && plan) { gx = plan.x; gy = plan.feet; }
    if (!motion || Math.hypot(px - motion.x, py - motion.y) > 42) motion = { x: px, y: py, time: now };
    if (!anchor) anchor = { x: px, y: py, time: now };
    if (Math.hypot(gx - px, gy - b.bottom) > 42 && !detour && (now - motion.time > 2500 || now - anchor.time > 12000)) {
      const side = Math.sign(px - gx) || 1;
      const down = gy > b.bottom + 18;
      if (down) detour = { x: px + side * 135, until: now + 1250, down: true };
      else if (plan) {
        const edge = plan.path?.find(edge => edge.from === start);
        if (edge) avoidEdge(edge, now);
        detour = { x: gx, feet: Math.min(gy, b.bottom - 64), until: now + 1750 };
      }
      action = null;
      motion = { x: px, y: py, time: now };
      anchor = motion;
    }
    if (detour && (now >= detour.until || (detour.down && b.bottom > gy - 12))) { detour = null; plan = null; }
    let moveInput;
    if (detour?.down) moveInput = { dir: steer(detour.x - px, b.velocity.x, !ground), jump: false };
    else if (detour) {
      const direction = Math.sign(detour.x - px) || 1;
      const grappleAim = b.velocity.y > -80 ? grapple(g, detour.x, detour.feet) : null;
      const launch = !g.hook && (ground || (g.perks.djump && !g.djUsed && b.velocity.y > -45) ||
        (now - g.wallT < TUNE.WALL.grace && b.velocity.y > -100));
      moveInput = { dir: direction, jump: true, press: launch, hook: grappleAim };
    } else moveInput = move(g, gx, gy, direct && !action);
    let { dir, jump, press, drop, hook, detach } = moveInput;
    let dash = false;
    if (now >= g.dashReady && (ground || g.dashAir)) {
      const incoming = threat(g), contact = nearest && Math.hypot(nearest.x - px, nearest.y - py) < 39 && !g.canExecute(nearest);
      if (g.reeledBy || g.grabbedBy || g.clawBy || incoming || contact) {
        dash = true;
        const away = contact ? (Math.sign(px - nearest.x) || -1) : incoming;
        if (away && !g.solidAt(px + away * 26, py)) dir = away;
        else if (ground && incoming) { jump = press = true; dash = false; }
      }
    }
    input(g, 'A', dir < 0); input(g, 'D', dir > 0); input(g, 'S', !!drop);
    input(g, 'SPACE', !!jump, press); input(g, 'SHIFT', false, dash);
    input(g, 'C', false, !!hook || detach);
    if (target && !hook) {
      const eb = target.body, d = Math.hypot(eb.center.x - px, eb.center.y - py);
      const slot = weapon(g, target, d, !visible(eb.center.x, eb.center.y));
      if (slot !== undefined) g.setWeapon(slot);
      const id = WEAPONS[g.weapon].id;
      const travel = id === 'nail' ? d / TUNE.NAIL.speed : 0;
      const head = isHumanoid(target) && id === 'rail' || target.shieldUp;
      aim = { x: eb.center.x + eb.velocity.x * travel * 0.72, y: (head ? eb.top + 2 : eb.center.y) + eb.velocity.y * travel * 0.55 };
      if (!visible(aim.x, aim.y)) aim = { x: eb.center.x, y: head ? eb.top + 2 : eb.center.y };
      const kick = d < 28 && now >= g.kickReady;
      input(g, 'F', false, kick);
      if (ground && d < 245 && !g.sentry && now >= g.sentryReadyAt && (d > 50 || foes.length > 1)) input(g, 'T', false, true);
      T.trig(!kick);
    } else { aim = hook; T.trig(false); }
    if (aim) T.aimAt(aim.x, aim.y);
    return { x: Math.round(px), y: Math.round(py), hp: Math.round(g.hp), goal: [Math.round(gx), Math.round(gy)],
      route: objective?.label, target: foe?.kind, path: plan?.path?.length, fallback: plan?.fallback, node: start,
      edge: action?.edge ?? plan?.path?.find(edge => edge.from === start), grounded: ground, move: dir, hook: g.hook?.state };
  };
};
