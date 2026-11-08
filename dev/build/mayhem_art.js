// ---- mayhem-update enemies ----------------------------------------------------------
const JT = { k: '#0c1218', d: '#18242e', a: '#26404e', b: '#3a6070', c: '#5a8a9a', w: '#a0d0dc', visor: '#ffe040', pack: '#3a3f47', packL: '#6a7380' };
const JTLEG = { a: JT.a, b: JT.b, c: JT.c, d: JT.d, k: JT.k };
const SP = { k: '#120e0a', d: '#2a2016', a: '#4a3a24', b: '#6e5634', c: '#94784a', mask: '#3a3f47', lens: '#7dff4a', bag: '#5a2a18', bagL: '#8a4a28', strap: '#e8b422', red: '#d02a1a' };
const SPLEG = { a: SP.a, b: SP.b, c: SP.c, d: SP.d, k: SP.k };
const BRF = ['#240a0a', '#421616', '#622626', '#843830', '#a4523f', '#c4745e'];
const BRE = ['#5a3e06', '#9a7010', '#d8b028', '#f8e070', '#fff8c0'];
function drawJet(ctx, swing) {                       // 20x24 jetpack trooper, legs dangling under twin thrusters
  drawPLeg(ctx, 8, 15, swing ? 1 : -1, 2, true, JTLEG);
  drawPLeg(ctx, 11, 15, swing ? -1 : 1, 1, false, JTLEG);
  const u = (col, x, y, w, h) => R(ctx, col, x + 1, y, w, h);
  u(JT.pack, 0, 7, 4, 9); u(JT.packL, 0, 7, 1, 9); u('#2a2e35', 0, 16, 2, 2); u('#2a2e35', 2, 16, 2, 2); u('#ff8a20', 1, 9, 1, 1);   // jetpack
  u(JT.b, 5, 1, 7, 1); u(JT.b, 4, 2, 9, 5); u(JT.c, 5, 2, 5, 1); u(JT.w, 6, 1, 3, 1);            // helmet
  u(JT.k, 8, 3, 5, 2); u(JT.visor, 9, 3, 4, 1);
  u(JT.k, 7, 7, 3, 1);
  u(JT.c, 3, 8, 11, 2); u(JT.w, 4, 8, 3, 1);                                                    // shoulders
  u(JT.b, 4, 10, 9, 4); u(JT.c, 5, 10, 3, 1); u(JT.a, 4, 13, 9, 1);
  u(JT.k, 4, 14, 9, 1); u('#e8b422', 8, 14, 1, 1);
}
function drawSMG(ctx, arm) {                         // 18x9, pivot (2,4)
  if (arm) drawArm(ctx, 4, JTLEG);
  R(ctx, '#2a2e35', 5, 2, 9, 4); R(ctx, '#4a525c', 5, 2, 9, 1); R(ctx, '#1e2126', 8, 6, 2, 3); R(ctx, '#3a3f47', 14, 3, 3, 1); R(ctx, '#ffe040', 12, 3, 1, 1);
}
function drawSapper(ctx, by, front, back, pose) {    // 18x24 gas-masked demolitions runner with a satchel of charges
  drawPLeg(ctx, 7, 15 + by, back[0], back[1], true, SPLEG);
  drawPLeg(ctx, 10, 15 + by, front[0], front[1], false, SPLEG);
  const u = (col, x, y, w, h) => R(ctx, col, x + 1, y + by, w, h);
  u(SP.bag, 0, 8, 5, 7); u(SP.bagL, 0, 8, 5, 1); u(SP.red, 1, 11, 3, 1); u('#ffe040', 2, 9, 1, 1);   // satchel
  u(SP.a, 5, 1, 7, 1); u(SP.a, 4, 2, 8, 5); u(SP.b, 5, 2, 4, 1);                                     // hood
  u(SP.mask, 8, 3, 5, 4); u(SP.lens, 9, 4, 1, 1); u(SP.lens, 11, 4, 1, 1); u('#22262c', 12, 6, 2, 2); // mask + filter
  u(SP.b, 4, 8, 8, 2); u(SP.c, 5, 8, 3, 1); u(SP.a, 4, 10, 8, 4);
  u(SP.strap, 5, 9, 1, 1); u(SP.strap, 6, 10, 1, 1); u(SP.strap, 7, 11, 1, 1);
  u(SP.k, 4, 14, 8, 1); u(SP.red, 5, 13, 2, 1); u(SP.red, 9, 13, 2, 1);                              // belt charges
  if (pose === 'crouch') { u(SP.b, 10, 11, 2, 5); u(SP.red, 10, 15, 3, 2); u('#ffe040', 11, 15, 1, 1); }   // planting
  else u(SP.b, 10, 9, 2, 4);
}
function drawBrood(ctx, phase, swell) {              // 34x26 bloated brood-sac crawler; swell 0..2 = birthing tell
  const W = 34, H = 26, s = swell;
  part(ctx, W, H, c => {                                                 // little legs
    for (let i = 0; i < 5; i++) { const x = 6 + i * 5, up = (i + phase) % 2; R(c, BRF[1], x, 21, 2, 3 - up); R(c, BRF[0], x + (i < 2 ? -1 : 1), 24 - up, 2, 1); }
  });
  part(ctx, W, H, c => {
    blob(c, 15, 13 - s * 0.5, 12.5 + s, 9.5 + s, BRF, 2.2, 0.05);         // the sac
    for (const [x0, y0, len, dir] of [[8, 9, 6, 1], [14, 6, 5, -1], [20, 12, 6, 1], [11, 16, 5, -1]]) {   // veins
      let x = x0, y = y0; for (let i = 0; i < len; i++) { R(c, '#3a0a10', x, y); x += 1; y += i % 2 ? dir : 0; }
    }
    for (const [ex, ey] of [[9, 10], [15, 7], [20, 11], [13, 14]]) blob(c, ex, ey - s * 0.5, 2.2 + s * 0.3, 1.8 + s * 0.3, BRE, 2, s ? 0.25 : 0);   // glowing eggs
  });
  part(ctx, W, H, c => {                                                 // head: tusks, mouth, eye
    blob(c, 28, 17, 5, 4.2, BRF, 2, 0.08);
    R(c, '#140606', 29, 18, 5, 2); R(c, '#ddd3b0', 30, 18, 1, 1); R(c, '#ddd3b0', 32, 18, 1, 1); R(c, '#ddd3b0', 31, 19, 1, 1);
    R(c, '#ddd3b0', 33, 16, 1, 3); R(c, '#ff3b1f', 29, 15, 2, 1); R(c, '#ffd0a0', 30, 15, 1, 1);
  });
}
