// ---- havoc-update enemies -------------------------------------------------------------
const CK = { k: '#08060c', d: '#14101c', a: '#221a30', b: '#342848', c: '#4c3c66', eye: '#40f0ff', blade: '#c8e0ff' };
const CKLEG = { a: CK.a, b: CK.b, c: CK.c, d: CK.d, k: CK.k };
const PY = { k: '#140a06', d: '#2a1810', a: '#4a2a1a', b: '#6e3e24', c: '#94582e', mask: '#3a3f47', lens: '#ffb040', tank: '#a02018', tankL: '#d04030', fire: '#ff8a20' };
const PYLEG = { a: PY.a, b: PY.b, c: PY.c, d: PY.d, k: PY.k };
function drawCloaker(ctx, by, front, back, pose) {   // 18x24 phase-cloaked assassin with a wrist blade
  drawPLeg(ctx, 7, 15 + by, back[0], back[1], true, CKLEG, 2);
  drawPLeg(ctx, 10, 15 + by, front[0], front[1], false, CKLEG, 2);
  const u = (col, x, y, w, h) => R(ctx, col, x + 1, y + by, w, h);
  u(CK.d, 2, 9, 3, 7); u(CK.a, 2, 9, 1, 7);                                                      // trailing cloak
  u(CK.a, 5, 1, 6, 1); u(CK.a, 4, 2, 8, 5); u(CK.b, 5, 2, 4, 1);                                 // hood
  u(CK.k, 8, 3, 4, 3); u(CK.eye, 9, 4, 3, 1);                                                    // visor slit
  u(CK.b, 4, 8, 8, 2); u(CK.c, 5, 8, 3, 1); u(CK.a, 4, 10, 7, 4); u(CK.k, 4, 14, 7, 1);
  if (pose === 'lunge') { u(CK.b, 10, 9, 3, 2); u(CK.blade, 13, 9, 4, 1); u('#ffffff', 16, 9, 1, 1); }
  else { u(CK.b, 10, 9, 2, 4); u(CK.blade, 11, 13, 1, 4); u('#ffffff', 11, 13, 1, 1); }
}
function drawPyro(ctx, by, front, back, pose) {      // 18x24 firebomber with a fuel tank on its back
  drawPLeg(ctx, 7, 15 + by, back[0], back[1], true, PYLEG);
  drawPLeg(ctx, 10, 15 + by, front[0], front[1], false, PYLEG);
  const u = (col, x, y, w, h) => R(ctx, col, x + 1, y + by, w, h);
  u(PY.tank, 0, 6, 4, 9); u(PY.tankL, 0, 6, 1, 9); u('#e8b422', 0, 10, 4, 1); u('#3a3f47', 1, 4, 2, 2);   // fuel tank
  u(PY.a, 5, 1, 7, 1); u(PY.a, 4, 2, 8, 5); u(PY.b, 5, 2, 4, 1);                                       // hood
  u(PY.mask, 8, 3, 5, 4); u(PY.lens, 9, 4, 1, 1); u(PY.lens, 11, 4, 1, 1); u('#22262c', 12, 6, 2, 2);
  u(PY.b, 4, 8, 8, 2); u(PY.c, 5, 8, 3, 1); u(PY.a, 4, 10, 8, 4); u(PY.k, 4, 14, 8, 1);
  if (pose === 'crouch') { u(PY.b, 9, 4, 2, 5); u('#7a5a30', 9, 1, 2, 3); u(PY.fire, 9, 0, 2, 1); }     // arm cocked with a lit bottle
  else if (pose === 'lunge') u(PY.b, 10, 8, 4, 2);
  else { u(PY.b, 10, 9, 2, 4); u('#7a5a30', 11, 12, 2, 3); u(PY.fire, 11, 11, 1, 1); }
}
function drawGunship(ctx, f, wreck) {                // 56x24 armoured gunship (faces right); wreck = burnt-out falling hulk
  const H = wreck ? ['#14161a', '#24272d', '#33373e', '#44494f'] : ['#22262c', '#3a414b', '#5a636e', '#8a94a0'];
  R(ctx, H[0], 0, 3, 4, 6); R(ctx, H[2], 0, 3, 4, 1);                                            // tail fin
  R(ctx, H[1], 2, 6, 9, 5); R(ctx, H[2], 2, 6, 9, 1);                                            // tail boom
  R(ctx, H[1], 8, 8, 38, 9); R(ctx, H[2], 9, 8, 36, 2); R(ctx, H[0], 8, 16, 38, 1);              // hull
  R(ctx, H[1], 44, 9, 9, 6); R(ctx, H[2], 44, 9, 8, 1); R(ctx, H[0], 52, 11, 2, 3);              // nose
  R(ctx, wreck ? '#3a1a10' : '#ffb040', 46, 11, 4, 2); R(ctx, wreck ? '#2a1008' : '#fff0a0', 48, 11, 2, 1);   // cockpit
  for (let i = 0; i < 8; i++) R(ctx, i % 2 ? '#15161a' : wreck ? '#6a5a20' : '#e8b422', 18 + i * 2, 12, 2, 2);   // hazard band
  R(ctx, H[0], 14, 3, 10, 5); R(ctx, H[2], 14, 3, 10, 1); R(ctx, H[0], 32, 3, 10, 5); R(ctx, H[2], 32, 3, 10, 1);   // engines
  R(ctx, H[0], 20, 17, 14, 3); R(ctx, H[2], 20, 17, 14, 1);                                      // rocket pod
  for (let i = 0; i < 3; i++) R(ctx, wreck ? '#401010' : '#c02018', 22 + i * 4, 19, 2, 2);
  if (!wreck) { const c = f ? '#c8f0ff' : '#6ab0ff'; R(ctx, c, 16, 8, 6, 1); R(ctx, c, 34, 8, 6, 1); }   // engine glow slits
  else { R(ctx, '#0a0a0a', 26, 9, 5, 4); R(ctx, '#ff6a1a', 27, 10, 2, 2); }                      // a smoking hole
}
