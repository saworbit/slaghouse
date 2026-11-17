// =============================================================================
//  LIGHTWEIGHT PIXEL PARTICLES  (pooled, square "pixels", tile-aware)
//  Phaser's emitter can't collide with the tile grid; ours lets sparks bounce and
//  blood droplets stick: mode 1 = bounce, mode 2 = paint onto the level and die.
// =============================================================================
class FX {
  constructor(scene, max, depth = 12) {
    this.gN = scene.add.graphics().setDepth(depth);
    this.gA = scene.add.graphics().setDepth(depth + 1).setBlendMode(ADD);
    this.pool = []; this.live = []; this.solid = null; this.paint = null;
    // twin: a second FX that takes the cosmetic emits. Sharing one list, a cosmetic particle's fxRandom lifetime set
    // when the seeded ones swap places in it, so the order they painted the level in (and drew Math.random for it)
    // shifted with any cosmetic change, and the seeded campaigns with it.
    this.twin = null;
    for (let i = 0; i < max; i++) this.pool.push({});
  }
  emit(x, y, o) {                                     // o.cosmetic: draw from fxRandom, leaving the seeded Math.random alone
    if (o.cosmetic && this.twin) return this.twin.emit(x, y, o);     // ...and live in the twin's list (see the constructor)
    const n = o.n || 1, spread = o.spread === undefined ? Math.PI * 2 : o.spread, ang = o.angle || 0, j = o.jitter || 0;
    const r = o.cosmetic ? fxRandom : Math.random, rr = (a, b) => a + r() * (b - a);
    for (let i = 0; i < n; i++) {
      const p = this.pool.pop(); if (!p) return;
      const a = ang + (r() - 0.5) * spread, sp = rr(o.speed[0], o.speed[1]);
      p.x = x + (j ? rr(-j, j) : 0); p.y = y + (j ? rr(-j, j) : 0);
      p.vx = Math.cos(a) * sp + (o.vx || 0); p.vy = Math.sin(a) * sp + (o.vy || 0);
      p.max = p.life = rr(o.life[0], o.life[1]);
      p.s0 = o.size[0]; p.s1 = o.size[1]; p.cols = o.cols; p.fixed = o.randCol ? o.cols[(r() * o.cols.length) | 0] : undefined;
      p.a0 = o.alpha ? o.alpha[0] : 1; p.a1 = o.alpha ? o.alpha[1] : 1;
      p.g = o.g || 0; p.drag = o.drag || 0; p.add = !!o.add; p.mode = o.mode || 0;
      this.live.push(p);
    }
  }
  update(dt) {
    const L = this.live, solid = this.solid;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.life -= dt;
      if (p.life <= 0) { L[i] = L[L.length - 1]; L.pop(); this.pool.push(p); continue; }
      p.vy += p.g * dt;
      if (p.drag) { const f = Math.exp(-p.drag * dt); p.vx *= f; p.vy *= f; }
      const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
      if (p.mode && solid && solid(nx, ny)) {
        if (p.mode === 2) { if (this.paint) this.paint(nx, ny, p, solid(nx, p.y)); L[i] = L[L.length - 1]; L.pop(); this.pool.push(p); continue; }
        if (solid(nx, p.y)) p.vx *= -0.45; else p.x = nx;
        if (solid(p.x, ny)) { p.vy *= -0.35; p.vx *= 0.75; } else p.y = ny;
        continue;
      }
      p.x = nx; p.y = ny;
    }
  }
  draw() {
    const gN = this.gN, gA = this.gA; gN.clear(); gA.clear();
    for (const p of this.live) {
      const t = 1 - p.life / p.max, s = Math.round(p.s0 + (p.s1 - p.s0) * t);
      if (s <= 0) continue;
      const col = p.fixed !== undefined ? p.fixed : p.cols[Math.min(p.cols.length - 1, (t * p.cols.length) | 0)];
      const g = p.add ? gA : gN;
      g.fillStyle(col, p.a0 + (p.a1 - p.a0) * t);
      g.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
    }
  }
}

