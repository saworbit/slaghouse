// ---- chaos-update enemies --------------------------------------------------------
const RK = { k: '#14110a', d: '#2a2412', a: '#4a3e1a', b: '#6e5c24', c: '#9a8434', w: '#d2bc62', visor: '#ff8a20', tube: '#3a3f47', tip: '#d02a1a' };
const RKLEG = { a: RK.a, b: RK.b, c: RK.c, d: RK.d, k: RK.k };
const WP = { k: '#0e0d0a', d: '#26221a', a: '#3e3a2c', b: '#5a5440', c: '#8a8460', y: '#e8b422', wing: '#b8d0e0', wingD: '#7890a0', eye: '#ff3020' };
const RM = { k: '#120c0a', fd: '#3e241f', f: '#6a3c30', fl: '#94614b', md: '#2c3036', m: '#4c535e', ml: '#7c8692', mh: '#a8b2be', y: '#e8b422', eye: '#ff3b1f' };
function drawRocketeer(ctx, by, front, back) {      // 20x24 hazard-armoured launcher trooper with a rocket backpack
  drawPLeg(ctx, 8, 15 + by, back[0], back[1], true, RKLEG);
  drawPLeg(ctx, 11, 15 + by, front[0], front[1], false, RKLEG);
  const u = (col, x, y, w, h) => R(ctx, col, x + 1, y + by, w, h);
  u(RK.tube, 0, 5, 4, 10); u('#5a636e', 0, 5, 1, 10); u(RK.tip, 0, 3, 2, 2); u(RK.tip, 2, 4, 2, 1); u('#ff6a4a', 0, 3, 1, 1);   // rocket pack
  u(RK.b, 5, 1, 7, 1); u(RK.b, 4, 2, 9, 5); u(RK.c, 5, 2, 5, 1); u(RK.w, 6, 1, 3, 1);           // helmet
  u(RK.k, 8, 3, 5, 3); u(RK.visor, 9, 4, 4, 1); u('#ffe0a0', 12, 4, 1, 1);                       // visor
  u(RK.k, 7, 7, 3, 1);
  u(RK.c, 3, 8, 11, 2); u(RK.w, 4, 8, 3, 1); u(RK.k, 3, 10, 11, 1);                            // pauldrons
  u(RK.b, 4, 10, 9, 4); u(RK.c, 5, 10, 3, 1);
  for (let i = 0; i < 9; i++) u(((i >> 1) & 1) ? '#16171a' : '#e8b422', 4 + i, 12, 1, 1);       // hazard chest band
  u(RK.k, 4, 14, 9, 1); u(RK.w, 8, 14, 1, 1);
}
function drawRLauncher(ctx, arm) {                   // 26x11, pivot (2,5)
  if (arm) drawArm(ctx, 5, RKLEG);
  R(ctx, '#3a3f47', 5, 2, 18, 6); R(ctx, '#6a7380', 5, 2, 18, 1); R(ctx, '#23272d', 5, 7, 18, 1);
  for (let i = 0; i < 6; i++) R(ctx, (i >> 1) % 2 ? '#15161a' : '#e8b422', 10 + i, 3, 1, 4);
  R(ctx, '#2a2e35', 9, 8, 2, 3); R(ctx, '#8a94a0', 22, 1, 3, 8); R(ctx, '#15171a', 23, 3, 2, 4); R(ctx, '#d02a1a', 3, 3, 2, 4);
}
function drawWasp(ctx, flap, bay) {                  // 22x14 bomber drone: insect hull, buzzing wings, bomb bay
  if (flap) { R(ctx, WP.wingD, 6, 0, 7, 2); R(ctx, WP.wing, 7, 0, 5, 1); R(ctx, WP.wingD, 12, 1, 5, 2); R(ctx, WP.wing, 12, 1, 4, 1); }
  else { R(ctx, WP.wingD, 4, 3, 8, 2); R(ctx, WP.wing, 5, 3, 6, 1); R(ctx, WP.wingD, 12, 3, 6, 2); R(ctx, WP.wing, 12, 3, 5, 1); }
  R(ctx, WP.a, 1, 5, 8, 5); R(ctx, WP.b, 2, 5, 6, 1);                                            // striped abdomen
  for (let i = 0; i < 4; i++) R(ctx, i % 2 ? WP.k : WP.y, 2 + i * 2, 6, 2, 3);
  R(ctx, WP.k, 0, 7, 1, 2);
  R(ctx, WP.d, 9, 4, 7, 6); R(ctx, WP.b, 10, 4, 5, 1);                                           // thorax
  R(ctx, WP.a, 15, 5, 5, 4); R(ctx, WP.c, 16, 5, 3, 1); R(ctx, WP.eye, 18, 6, 2, 2); R(ctx, '#ffd0a0', 19, 6, 1, 1);   // head
  R(ctx, WP.k, 11, 10, 1, 2); R(ctx, WP.k, 14, 10, 1, 2);
  if (bay) { R(ctx, '#a02018', 11, 11, 4, 3); R(ctx, '#e8b422', 12, 12, 2, 1); } else R(ctx, WP.k, 11, 10, 4, 1);
}
function drawRammer(ctx, phase, pose) {              // 30x22 armoured ram-beast; pose walk|wind|charge|dizzy, faces right
  const charge = pose === 'charge', wind = pose === 'wind', low = wind ? 2 : 0;
  const G = charge ? [[4, 1, -4, 0], [-3, 0, 3, 1]][phase % 2] : [[2, 0, -2, 0], [0, 0, 0, 1], [-2, 0, 2, 0], [0, 1, 0, 0]][phase];
  const leg = (hx, off, lift, back) => {
    const fy = 20 - lift;
    for (let y = 15; y < fy; y++) R(ctx, back ? RM.md : RM.m, Math.round(hx + off * (y - 15) / Math.max(1, fy - 16)) - 1, y, 3, 1);
    R(ctx, back ? RM.md : RM.ml, hx + off - 2, fy, 5, 2);
  };
  leg(9, G[2], G[3], true); leg(19, G[0], G[1], true);
  R(ctx, RM.f, 4, 7 + low, 18, 9); R(ctx, RM.fl, 6, 8 + low, 10, 2); R(ctx, RM.fd, 4, 14 + low, 18, 2);   // humped flesh
  R(ctx, RM.m, 5, 4 + low, 14, 5); R(ctx, RM.ml, 6, 4 + low, 12, 1); R(ctx, RM.md, 5, 8 + low, 14, 1);  // dorsal plate
  for (let i = 0; i < 3; i++) R(ctx, RM.mh, 7 + i * 4, 5 + low, 1, 1);
  R(ctx, RM.m, 2, 6 + low, 3, 6); R(ctx, RM.md, 2, 11 + low, 3, 1);                                   // rump plate
  const hy = (wind ? 6 : charge ? 5 : 4) + low;
  R(ctx, RM.fd, 20, hy + 3, 4, 6); R(ctx, RM.f, 20, hy + 3, 3, 2);
  R(ctx, RM.m, 22, hy, 7, 11); R(ctx, RM.ml, 22, hy, 7, 1); R(ctx, RM.mh, 23, hy + 1, 1, 9); R(ctx, RM.md, 28, hy + 1, 1, 10);   // ram plate
  for (let j = 0; j < 4; j++) R(ctx, j % 2 ? RM.k : RM.y, 24, hy + 3 + j * 2, 4, 1);
  R(ctx, RM.k, 21, hy + 2, 2, 2); R(ctx, pose === 'dizzy' ? '#ffe14a' : RM.eye, 21, hy + 2, 1, 1);
  R(ctx, RM.mh, 28, hy + 11, 2, 1);
  leg(11, G[0], G[1], false); leg(21, G[2], G[3], false);
}
// ---- breakable tiles (level art + falling-block textures share these) ------------------
function drawCrate(ctx, x, y, h = 0) {               // 'x': rusty cargo crate, falls when nothing is under it
  R(ctx, '#21130b', x, y, 16, 16); R(ctx, '#6e4222', x + 1, y + 1, 14, 14);
  R(ctx, '#9a5e2e', x + 1, y + 1, 14, 1); R(ctx, '#9a5e2e', x + 1, y + 1, 1, 14);
  R(ctx, '#40240f', x + 1, y + 14, 14, 1); R(ctx, '#40240f', x + 14, y + 2, 1, 13);
  R(ctx, '#52301a', x + 3, y + 3, 10, 10);
  for (let i = 0; i < 10; i++) { R(ctx, '#8a5228', x + 3 + i, y + 12 - i); if (i < 9) R(ctx, '#2e1a0c', x + 4 + i, y + 12 - i); }   // brace
  for (const [bx, by] of [[2, 2], [13, 2], [2, 13], [13, 13]]) R(ctx, '#c8a070', x + bx, y + by);
  if (h % 3 === 0) for (let i = 0; i < 6; i++) R(ctx, (i >> 1) % 2 ? '#16171a' : '#e8b422', x + 5 + i, y + 1, 1, 1);
}
function drawGirder(ctx, x, y, endL, endR) {         // 'g': open truss girder, cantilevered from its bolted ends
  R(ctx, '#b0703a', x, y, 16, 1); R(ctx, '#8a5228', x, y + 1, 16, 2); R(ctx, '#4a2a14', x, y + 3, 16, 1);
  for (let r = 0; r < 8; r++) { R(ctx, '#7a4622', x + 2 * r, y + 4 + r, 2, 1); R(ctx, '#3e2210', x + 14 - 2 * r, y + 4 + r, 2, 1); }
  R(ctx, '#5a3418', x, y + 4, 1, 8); R(ctx, '#2e1a0c', x + 15, y + 4, 1, 8);
  R(ctx, '#6e4020', x, y + 12, 16, 2); R(ctx, '#3a200e', x, y + 14, 16, 1); R(ctx, '#1a0e06', x, y + 15, 16, 1);
  for (let i = 2; i < 16; i += 4) R(ctx, '#d09060', x + i, y + 1);
  if (endL) { R(ctx, '#2a2e35', x, y + 1, 3, 14); R(ctx, '#4a525c', x, y + 1, 3, 1); R(ctx, '#8a94a0', x + 1, y + 4); R(ctx, '#8a94a0', x + 1, y + 11); }
  if (endR) { R(ctx, '#2a2e35', x + 13, y + 1, 3, 14); R(ctx, '#4a525c', x + 13, y + 1, 3, 1); R(ctx, '#8a94a0', x + 14, y + 4); R(ctx, '#8a94a0', x + 14, y + 11); }
}
function drawGrating(ctx, x, y, endL, endR) {        // '=': one-way grating, flimsy
  R(ctx, '#7a8695', x, y, 16, 1); R(ctx, '#505a67', x, y + 1, 16, 1);
  for (let i = 0; i < 16; i++) { if (i % 4 === 0) R(ctx, '#3a424c', x + i, y + 2, 1, 3); else if ((i + 2) % 4 === 0) R(ctx, '#2c323a', x + i, y + 3); }
  R(ctx, '#2a3038', x, y + 5, 16, 1);
  if (endL) { R(ctx, '#3a424c', x, y + 6, 3, 1); R(ctx, '#3a424c', x, y + 7, 2, 1); R(ctx, '#3a424c', x, y + 8); }
  if (endR) { R(ctx, '#3a424c', x + 13, y + 6, 3, 1); R(ctx, '#3a424c', x + 14, y + 7, 2, 1); R(ctx, '#3a424c', x + 15, y + 8); }
}
