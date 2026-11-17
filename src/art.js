// =============================================================================
//  PROCEDURAL PIXEL ART
// =============================================================================
function mkCanvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}
function R(ctx, col, x, y, w = 1, h = 1) { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); }
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
// 1px auto-outline around every opaque shape: makes simple rect-built sprites read as pixel art
function outlineCanvas(ctx, w, h, col) {
  const img = ctx.getImageData(0, 0, w, h), d = img.data, src = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) src[i] = d[i * 4 + 3] > 0 ? 1 : 0;
  const [r, g, b] = hexRgb(col);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (src[i]) continue;
    if ((x > 0 && src[i - 1]) || (x < w - 1 && src[i + 1]) || (y > 0 && src[i - w]) || (y < h - 1 && src[i + w])) {
      d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}
function makeSprite(w, h, draw, ol = '#06070a') { const { c, ctx } = mkCanvas(w, h); draw(ctx); if (ol) outlineCanvas(ctx, w, h, ol); return c; }
function whiteCopy(src) {
  const { c, ctx } = mkCanvas(src.width, src.height);
  ctx.drawImage(src, 0, 0); ctx.globalCompositeOperation = 'source-in'; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
  return c;
}
function addTex(scene, key, canvas) { if (scene.textures.exists(key)) scene.textures.remove(key); return scene.textures.addCanvas(key, canvas); }
function addSheet(scene, key, frames, fw, fh, white) {
  const { c, ctx } = mkCanvas(fw * frames.length, fh);
  frames.forEach((f, i) => ctx.drawImage(f.c, i * fw, 0));
  const mk = (k, canvas) => { const t = addTex(scene, k, canvas); frames.forEach((f, i) => t.add(f.name, 0, i * fw, 0, fw, fh)); };
  mk(key, c); if (white) mk(key + '_w', whiteCopy(c));          // white copy = hit-flash frames
}

// ---- palettes ---------------------------------------------------------------
const PAL = { pk: '#1e232b', pd: '#2b313b', pa: '#3e4655', pb: '#5b6677', pc: '#8a96a7', pw: '#cdd6e0',
  visor: '#46e6ff', visorHi: '#e0ffff', orange: '#ff8a1f', orangeHi: '#ffc46e' };
const EP = { fd: '#3e241f', f: '#6a3c30', fl: '#94614b', md: '#353b44', m: '#58616c', ml: '#8b95a1',
  bone: '#ddd3b0', eye: '#ff3b1f', eyeHi: '#ffe2b8', gum: '#8e1e22', core: '#ff7a1a', coreHi: '#ffe08a' };
const PLEG = { a: PAL.pa, b: PAL.pb, c: PAL.pc, d: PAL.pd, k: PAL.pk };
const EN = { k: '#1a0f10', d: '#2c1a1d', a: '#4c2329', b: '#73323b', c: '#a04a52', w: '#d08080', mask: '#3a3f47', maskHi: '#6a7380', lens: '#ff3a2a', strap: '#e8b422' };
const ST = { k: '#0c0f0c', d: '#1c221c', a: '#2c342c', b: '#46524a', c: '#6a7a6e', skin: '#9aa890', skinD: '#6e7a66', eye: '#7dff4a', blade: '#d8e0e8', bladeHi: '#ffffff' };
const ENLEG = { a: EN.a, b: EN.b, c: EN.c, d: EN.d, k: EN.k }, STLEG = { a: ST.a, b: ST.b, c: ST.c, d: ST.d, k: ST.k };
const BW = { k: '#0d1416', d: '#1b2a2e', a: '#2a4046', b: '#3e5c64', c: '#5f8790', w: '#9fc4cc', visor: '#ff9a2a', sh: '#4a535e', shHi: '#7c8794', shD: '#2a3038', rivet: '#a0aab6' };
const BWLEG = { a: BW.a, b: BW.b, c: BW.c, d: BW.d, k: BW.k };
const MD = { d: '#2a3a34', a: '#cfd8d2', b: '#eef4f0', c: '#9fb0a8', core: '#40ff90', coreHi: '#d0ffe0', cross: '#ff4040' };
const SN = { k: '#0c1016', d: '#1a2230', a: '#2a3648', b: '#3e4e66', c: '#5f7090', w: '#9fb0d0', eye: '#60c0ff', strap: '#c0c8d0' };
const SNLEG = { a: SN.a, b: SN.b, c: SN.c, d: SN.d, k: SN.k };
const SM = { k: '#120a08', fd: '#3a2018', f: '#62382a', md: '#22262c', m: '#3e444e', ml: '#6a7380', mh: '#9aa4b0', g: '#ff8a20', gh: '#ffe080', ember: '#ff4a10' };

// ---- player (18x24 frames, faces right) --------------------------------------
function drawPLeg(ctx, hipX, hipY, off, lift, shade, P = PLEG, w = 3) {
  const footX = hipX + off, footY = 21 - lift, n = Math.max(1, footY - hipY);
  const kx = Math.round(hipX + off * 0.55 + (lift > 0 ? 0.8 : 0.2)), ky = hipY + (n >> 1);
  for (let i = 0; i < n; i++) {
    const upper = hipY + i <= ky;
    const t = upper ? (i / Math.max(1, ky - hipY)) : ((hipY + i - ky) / Math.max(1, footY - ky));
    const lx = Math.round(upper ? hipX + (kx - hipX) * t : kx + (footX - kx) * t);
    R(ctx, shade ? P.a : P.b, lx - 1, hipY + i, w, 1);
    if (!shade) R(ctx, P.c, lx - 1, hipY + i, 1, 1);
    if (w >= 3) R(ctx, shade ? P.k : P.d, lx + w - 2, hipY + i, 1, 1);
  }
  R(ctx, shade ? P.b : P.c, kx - 1, ky, w, 1);
  R(ctx, shade ? P.k : P.d, footX - 1, footY, w + 1, 2);
  R(ctx, shade ? P.d : P.a, footX - 1, footY, w + 1, 1);
  if (!shade) R(ctx, P.c, footX + w - 1, footY, 1, 1);
}
function drawPlayer(ctx, by, front, back) {
  drawPLeg(ctx, 7, 15 + by, back[0], back[1], true);
  drawPLeg(ctx, 10, 15 + by, front[0], front[1], false);
  const u = (col, x, y, w, h) => R(ctx, col, x + 1, y + by, w, h);
  u(PAL.pb, 5, 1, 6, 1); u(PAL.pb, 4, 2, 8, 5); u(PAL.pa, 5, 7, 6, 1);               // helmet
  u(PAL.pc, 5, 2, 4, 1); u(PAL.pw, 6, 1, 3, 1); u(PAL.pa, 4, 5, 2, 2); u(PAL.orange, 5, 3, 1, 2);
  u(PAL.pk, 7, 3, 5, 1); u(PAL.visor, 8, 4, 4, 1); u(PAL.visorHi, 10, 4, 2, 1);          // visor
  u(PAL.pk, 8, 5, 4, 1); u(PAL.pa, 8, 6, 3, 1);
  u(PAL.pk, 6, 8, 4, 1);                                                                   // neck
  u(PAL.pc, 2, 9, 11, 1); u(PAL.pb, 2, 10, 11, 2); u(PAL.pw, 3, 9, 3, 1); u(PAL.pa, 2, 11, 2, 1); // pauldrons
  u(PAL.pa, 2, 12, 2, 3); u(PAL.pk, 2, 14, 2, 1);                                          // rear arm
  u(PAL.pb, 4, 11, 8, 3); u(PAL.pc, 5, 11, 3, 1); u(PAL.orange, 5, 12, 6, 1); u(PAL.pa, 4, 13, 8, 1); // chest
  u(PAL.pk, 4, 14, 8, 1); u(PAL.orangeHi, 7, 14, 2, 1);                                   // belt
}
const RUN_LEGS = [[4, 0], [1, 0], [-2, 0], [-3, 2], [0, 3], [3, 1]];
const RUN_BOB = [1, 0, 0, 1, 0, 0];

// ---- humanoid enemies (same skeleton as the player, different silhouettes) -------
function drawEnforcer(ctx, by, front, back) {   // 18x24 gas-masked rifleman, faces right
  const sw = Math.round((back[0] - front[0]) * 0.25);
  drawPLeg(ctx, 7, 15 + by, back[0], back[1], true, ENLEG);
  drawPLeg(ctx, 10, 15 + by, front[0], front[1], false, ENLEG);
  const u = (col, x, y, w, h) => R(ctx, col, x + 1, y + by, w, h);
  u(EN.k, 1, 6, 1, 3); u(EN.d, 0, 9, 4, 6); u(EN.a, 1, 9, 3, 5); u(EN.b, 1, 9, 3, 1);    // radio pack + antenna
  u('#ff5040', 2, 11, 1, 1); u('#ffc0b0', 2, 11, 1, 1); u(EN.k, 1, 13, 2, 1);
  u(EN.a, 5, 1, 6, 1); u(EN.b, 4, 2, 8, 4); u(EN.c, 5, 2, 5, 1); u(EN.w, 6, 1, 3, 1);     // helmet dome
  u(EN.a, 4, 4, 2, 2); u(EN.k, 4, 6, 8, 1);
  u(EN.mask, 7, 4, 5, 3); u(EN.maskHi, 7, 4, 5, 1); u('#22262c', 7, 6, 5, 1);             // gas mask
  u(EN.lens, 8, 5, 2, 1); u('#ffd0b0', 8, 5, 1, 1); u(EN.lens, 11, 5, 1, 1);              // glowing lenses
  u(EN.k, 6, 7, 4, 1);
  u(EN.c, 2, 8, 11, 1); u(EN.b, 2, 9, 11, 2); u(EN.w, 3, 8, 3, 1); u(EN.a, 2, 10, 2, 1);  // pauldrons
  u(EN.a, 2 + sw, 11, 2, 3); u(EN.k, 2 + sw, 13, 2, 1);                                   // rear arm
  u(EN.a, 4, 10, 8, 4); u(EN.b, 4, 10, 7, 3); u(EN.c, 5, 10, 3, 1);                       // armored chest
  u(EN.strap, 5, 11, 1, 1); u(EN.strap, 6, 12, 1, 1); u(EN.strap, 7, 13, 1, 1);
  u(EN.d, 8, 11, 3, 2); u(EN.maskHi, 9, 11, 1, 1);                                        // chest mag pouch
  u(EN.k, 4, 14, 8, 1); u(EN.strap, 8, 14, 2, 1);
  u(EN.mask, 10, 7, 3, 2); u(EN.maskHi, 10, 7, 2, 1); u('#181b20', 12, 8, 1, 1);          // respirator snout
}
function drawStalker(ctx, by, front, back, pose) {   // 20x24 hooded blade-armed hunter
  const lean = pose === 'run' || pose === 'lunge' ? 1 : 0, sw = Math.round((front[0] - back[0]) * 0.25);
  drawPLeg(ctx, 8, 15 + by, back[0], back[1], true, STLEG, 2);
  drawPLeg(ctx, 11, 15 + by, front[0], front[1], false, STLEG, 2);
  const u = (col, x, y, w, h) => R(ctx, col, x + 2 + (y < 12 ? lean : 0), y + by, w, h);
  u(ST.skinD, 3 - sw, 10, 2, 4); u(ST.blade, 2 - sw, 13, 1, 4); u(ST.bladeHi, 2 - sw, 13, 1, 2); // rear arm + mantis blade
  u(ST.d, 3 - lean, 9, 3, 6); u(ST.a, 2 - lean, 12 + (sw & 1), 2, 4);                     // tattered cloak back
  u(ST.a, 5, 1, 6, 2); u(ST.a, 4, 3, 8, 5); u(ST.b, 5, 2, 4, 2); u(ST.c, 6, 2, 2, 1);     // deep hood
  u(ST.d, 3, 4, 1, 4);
  u(ST.k, 8, 4, 4, 3); u(ST.eye, 9, 5, 1, 1); u('#d8ffc0', 9, 5, 1, 1); u(ST.eye, 11, 5, 1, 1); // glowing eyes
  u(ST.d, 5, 8, 6, 1); u(ST.a, 4, 9, 7, 3); u(ST.b, 5, 9, 4, 1); u(ST.c, 6, 9, 2, 1);     // shoulder cowl
  u(ST.d, 5, 12, 5, 3); u(ST.skin, 6, 12, 3, 2); u(ST.skinD, 6, 13, 2, 1);                // sinewy torso
  u(ST.k, 5, 14, 6, 1); u(ST.b, 7, 14, 1, 1); u(ST.d, 4 - (sw > 0 ? 1 : 0), 15, 2, 3);    // belt + rag
  if (pose === 'lunge') {
    u(ST.skin, 10, 9, 3, 2); u(ST.skinD, 10, 10, 3, 1);
    u(ST.blade, 12, 8, 4, 2); u(ST.bladeHi, 13, 8, 3, 1); u(ST.eye, 11, 9, 1, 1);
  } else if (pose === 'crouch') {
    u(ST.skin, 9, 10, 2, 3); u(ST.blade, 10, 7, 2, 5); u(ST.bladeHi, 11, 7, 1, 4);
  } else {
    u(ST.skin, 10, 10, 2, 4); u(ST.skinD, 10, 12, 1, 2);
    u(ST.blade, 12, 12, 1, 5); u(ST.bladeHi, 12, 12, 1, 3); u(ST.blade, 13, 15, 1, 2);
  }
}
function drawBulwark(ctx, by, front, back, pose, melted) {   // 22x24 riot-shield trooper; pose: 'walk' | 'bash' | 'stagger'; melted = corroder ate the shield
  drawPLeg(ctx, 8, 15 + by, back[0], back[1], true, BWLEG);
  drawPLeg(ctx, 11, 15 + by, front[0], front[1], false, BWLEG);
  const u = (col, x, y, w, h) => R(ctx, col, x, y + by, w, h);
  u(BW.d, 2, 8, 3, 6); u(BW.a, 2, 8, 2, 5);                                               // back armor pack
  u(BW.b, 6, 1, 6, 1); u(BW.b, 5, 2, 8, 5); u(BW.c, 6, 2, 5, 1); u(BW.w, 7, 1, 3, 1);     // heavy helm
  u(BW.k, 9, 4, 4, 1); u(BW.visor, 10, 4, 3, 1); u('#ffe8a0', 11, 4, 1, 1);               // glowing visor slit
  u(BW.a, 5, 6, 8, 1); u(BW.k, 6, 7, 6, 1);                                               // gorget collar
  u(BW.c, 3, 7, 11, 2); u(BW.w, 4, 7, 4, 1); u(BW.a, 3, 9, 11, 1);                        // heavy pauldrons
  u(BW.b, 4, 9, 9, 5); u(BW.c, 5, 9, 4, 2); u(BW.w, 6, 9, 2, 1);                          // chest plate
  u(BW.a, 4, 13, 9, 1); u(BW.k, 5, 14, 8, 1); u(BW.visor, 8, 14, 2, 1);                   // belt
  u(BW.b, 12, 10, 3, 2); u(BW.c, 12, 10, 2, 1);                                           // shield arm
  const sx = pose === 'bash' ? 16 : pose === 'stagger' ? 13 : 14, sy = pose === 'stagger' ? 8 : 3;
  if (melted) {                                                       // a slagged stub on the handle, dripping green
    const top = sy + 9, h = 18 - (sy - 3) - 9;
    u(BW.shD, sx, top, 5, h); u('#4a5a3a', sx, top, 4, h - 1); u('#7a8a5a', sx, top, 4, 1);
    u('#9aff5a', sx + 1, top - 1, 1, 1); u('#9aff5a', sx + 3, top, 1, 1); u('#5ac02a', sx + 2, top + h, 1, 2); u('#5ac02a', sx, top + h, 1, 1);
    return;
  }
  const shH = 18 - (sy - 3);
  u(BW.shD, sx, sy, 5, shH); u(BW.sh, sx, sy + 1, 4, shH - 2);
  u(BW.shHi, sx, sy, 4, 1); u(BW.shHi, sx, sy + 1, 1, shH - 2); u('#c8d4e0', sx, sy + 1, 1, 4); // bevels
  u(BW.k, sx + 1, sy + 4, 3, 2); u(BW.visor, sx + 2, sy + 4, 1, 1);                       // armored viewport
  u('#e8b422', sx + 1, sy + shH - 4, 3, 1); u(BW.k, sx + 2, sy + shH - 4, 1, 1);          // hazard stripe
  for (const ry of [2, 8, shH - 2]) if (ry < shH) u(BW.rivet, sx + 1, sy + ry, 1, 1);
}
function drawMender(ctx, flap, heal) {              // 18x16 hovering field medic
  const wy = flap ? 2 : 5, by = flap ? 0 : 1;
  R(ctx, MD.d, 0, wy + 1, 5, 2); R(ctx, MD.c, 1, wy, 4, 2); R(ctx, MD.b, 2, wy, 3, 1);    // left stabilizer wing
  R(ctx, MD.d, 13, wy + 1, 5, 2); R(ctx, MD.c, 13, wy, 4, 2); R(ctx, MD.b, 13, wy, 3, 1); // right stabilizer wing
  blob(ctx, 9, 7 + by, 4.5, 4.8, [MD.d, MD.c, MD.a, MD.b, '#ffffff'], 2.4, 0.12);         // domed medical capsule
  R(ctx, MD.cross, 8, 4 + by, 2, 4); R(ctx, MD.cross, 7, 5 + by, 4, 2); R(ctx, '#ffa0a0', 8, 4 + by, 1, 1); // red cross
  R(ctx, MD.d, 5, 9 + by, 8, 2); R(ctx, heal ? MD.coreHi : MD.core, 6, 9 + by, 6, 1); R(ctx, '#ffffff', 8, 9 + by, 2, 1); // bio-core band
  R(ctx, heal ? MD.coreHi : MD.core, 6, 1, 6, 1); R(ctx, '#ffffff', 8, 1, 2, 1);          // hovering halo
  R(ctx, MD.d, 7, 11 + by, 4, 2); R(ctx, heal ? '#ffffff' : MD.core, 8, 13 + by, 2, 2);   // ventral emitter
}
function drawTick(ctx, phase, armed) {               // 14x10 suicide crawler with a glowing bomb sac
  const by = phase % 2 ? 0 : 1;
  for (const [x, i] of [[2, 0], [5, 1], [9, 2], [11, 3]]) {
    const up = (i + phase) % 2, dir = x < 7 ? -1 : 1;
    R(ctx, EP.f, x, 6 + by, 2, 1); R(ctx, EP.fd, x + dir, 7 - up, 1, 2 + up); R(ctx, EP.bone, x + dir, 8, 1, 1);
  }
  const sacRamp = armed ? ['#7a2008', '#d05010', '#ff9a20', '#ffe860', '#ffffff'] : ['#3a0808', '#6a1010', '#a81818', '#e03828', '#ff9070'];
  blob(ctx, 6.5, (armed ? 3 : 3.5) + by * 0.5, armed ? 4.2 : 3.6, armed ? 3.2 : 2.6, sacRamp, 2.1, 0.15); // volatile bomb sac
  R(ctx, EP.fd, 3, 5 + by, 9, 2); R(ctx, EP.f, 4, 5 + by, 7, 1); R(ctx, EP.ml, 8, 4 + by, 3, 1); // chitin thorax
  R(ctx, armed ? '#ffffff' : EP.eye, 11, 5 + by, 1, 1); R(ctx, EP.bone, 12, 6 + by, 1, 1); // eye + mandible
}
function drawSniper(ctx, by, front, back) {          // 18x24 hooded marksman with a single scope-eye
  const sw = Math.round((front[0] - back[0]) * 0.25);
  drawPLeg(ctx, 7, 15 + by, back[0], back[1], true, SNLEG);
  drawPLeg(ctx, 10, 15 + by, front[0], front[1], false, SNLEG);
  const u = (col, x, y, w, h) => R(ctx, col, x + 1, y + by, w, h);
  u(SN.d, 2 - (sw > 0 ? 1 : 0), 11, 4, 7); u(SN.a, 3 - (sw > 0 ? 1 : 0), 12, 2, 5);       // ghillie cloak tail
  u(SN.a, 5, 1, 6, 1); u(SN.a, 4, 2, 8, 5); u(SN.b, 5, 2, 5, 1); u(SN.c, 6, 1, 2, 1);     // sniper hood
  u(SN.d, 3, 3, 1, 4);
  u(SN.k, 8, 3, 4, 3); u('#1a3a5a', 9, 4, 3, 2); u(SN.eye, 10, 4, 2, 1); u('#e0ffff', 11, 4, 1, 1); // scope optic
  u(SN.k, 6, 7, 4, 1);
  u(SN.b, 3, 8, 9, 2); u(SN.c, 4, 8, 4, 1); u(SN.w, 5, 8, 2, 1);                          // camouflaged shoulders
  u(SN.a, 4, 10, 7, 4); u(SN.b, 5, 10, 3, 2);
  u(SN.strap, 5, 10, 1, 1); u(SN.strap, 6, 11, 1, 1); u(SN.strap, 7, 12, 1, 1); u(SN.strap, 8, 13, 1, 1); // ammo bandolier
  u(SN.k, 4, 14, 7, 1); u(SN.eye, 7, 14, 1, 1);
}
function drawSniperRifle(ctx, arm) {                 // 34x9, pivot (2,4)
  if (arm) drawArm(ctx, 4, SNLEG);
  R(ctx, '#1e2126', 4, 4, 3, 2); R(ctx, '#2a2e35', 6, 3, 11, 3); R(ctx, '#5a636e', 6, 3, 10, 1); R(ctx, '#1e2126', 9, 6, 2, 2);
  R(ctx, '#3a3f47', 17, 4, 14, 1); R(ctx, '#6a7380', 17, 3, 10, 1); R(ctx, '#2a2e35', 24, 5, 1, 3); // fluted barrel + bipod
  R(ctx, '#1e2126', 8, 1, 7, 2); R(ctx, '#3a4654', 9, 1, 5, 1); R(ctx, '#60c0ff', 14, 1, 1, 2); R(ctx, '#ffffff', 14, 1, 1, 1); // scope
  R(ctx, '#8a94a0', 30, 3, 3, 3); R(ctx, '#2a2e35', 31, 4, 1, 1);                         // muzzle brake
}
// ---- shaded-volume helpers: lit from the top-left, quantised to a colour ramp ----------
const LIGHT3 = (() => { const l = [-0.5, -0.75, 0.45], m = Math.hypot(...l); return l.map(v => v / m); })();
const shadeIdx = (n, I, bias) => clamp(Math.floor((I * 0.55 + 0.3 + bias) * n), 0, n - 1);
const inBlob = (x, y, cx, cy, rx, ry, p) => Math.pow(Math.abs((x + 0.5 - cx) / rx), p) + Math.pow(Math.abs((y + 0.5 - cy) / ry), p) <= 1;
function blob(ctx, cx, cy, rx, ry, ramp, p = 2, bias = 0, clip) {        // superellipse shaded as a dome
  for (let y = Math.floor(cy - ry); y < Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x < Math.ceil(cx + rx); x++) {
    const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, ax = Math.abs(nx), ay = Math.abs(ny), s = Math.pow(ax, p) + Math.pow(ay, p);
    if (s > 1 || (clip && !clip(x, y))) continue;
    const gx = Math.sign(nx) * Math.pow(ax, p - 1), gy = Math.sign(ny) * Math.pow(ay, p - 1), gl = Math.hypot(gx, gy) || 1;
    const e = Math.pow(s, 1 / p), nz = Math.sqrt(1 - e * e * 0.85);
    const I = (gx / gl * e) * LIGHT3[0] + (gy / gl * e) * LIGHT3[1] + nz * LIGHT3[2];
    R(ctx, ramp[shadeIdx(ramp.length, I, bias)], x, y);
  }
}
function limb(ctx, x0, y0, x1, y1, r0, r1, ramp, bias = 0, flat) {       // tapered capsule (or flat-ended tube) shaded as a cylinder
  const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1, rm = Math.max(r0, r1);
  for (let y = Math.floor(Math.min(y0, y1) - rm); y <= Math.ceil(Math.max(y0, y1) + rm); y++)
    for (let x = Math.floor(Math.min(x0, x1) - rm); x <= Math.ceil(Math.max(x0, x1) + rm); x++) {
      const px = x + 0.5 - x0, py = y + 0.5 - y0, tr = (px * dx + py * dy) / L2, t = clamp(tr, 0, 1);
      if (flat && tr !== t) continue;
      const qx = px - dx * t, qy = py - dy * t, d = Math.hypot(qx, qy), r = r0 + (r1 - r0) * t;
      if (d > r) continue;
      const k = d / r, nz = Math.sqrt(1 - k * k * 0.85), I = (d ? qx / d * k : 0) * LIGHT3[0] + (d ? qy / d * k : 0) * LIGHT3[1] + nz * LIGHT3[2];
      R(ctx, ramp[shadeIdx(ramp.length, I, bias)], x, y);
    }
}
function part(ctx, w, h, fn, ol = '#07080b') {                            // one piece on its own layer, with its own outline
  const { c, ctx: p } = mkCanvas(w, h); fn(p); outlineCanvas(p, w, h, ol); ctx.drawImage(c, 0, 0);
}
function ik2(hx, hy, fx, fy, l1, l2, bend) {                               // two-bone IK -> knee (bend -1: knee points back)
  const dx = fx - hx, dy = fy - hy, d = clamp(Math.hypot(dx, dy), 0.01, l1 + l2 - 0.01), a = Math.atan2(dy, dx);
  const off = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)), ka = a - bend * off;
  return [hx + Math.cos(ka) * l1, hy + Math.sin(ka) * l1];
}
const IRN = ['#0c0e12', '#171a20', '#232730', '#323843', '#454d5a', '#5d6775', '#7f8a99', '#aab4c2'];
const RST = ['#1a0c08', '#2e150d', '#4a2214', '#6a321c', '#8c4626', '#a85c32'];
const MLT = ['#3a0a04', '#7a1806', '#c0340a', '#f05a12', '#ff8a20', '#ffb840', '#ffe68a', '#fffbe0'];
const HAZ = ['#3a2a06', '#7a5a0c', '#c08a14', '#e8b422', '#ffd860'];

// 48x44 "The Smelter", faces right. phase 0-3 = walk cycle; pose idle|wind (mortar up)|crouch (slam tell)|breath
function drawBoss(ctx, phase, pose) {
  const W = 48, H = 44, crouch = pose === 'crouch', hot = pose === 'wind' || pose === 'breath', walk = pose === 'idle';
  const by = (crouch ? 5 : 0) + (walk ? [1, 0, 1, 0][phase] : 0);
  const FX = [6, 2, -3, 2], FL = [0, 0, 0, 3];                             // foot offset from hip / lift, per walk frame
  const fOff = walk ? FX[phase] : crouch ? 5 : 3, fLift = walk ? FL[phase] : 0;
  const bOff = walk ? FX[(phase + 2) % 4] : crouch ? -4 : -2, bLift = walk ? FL[(phase + 2) % 4] : 0;
  const leg = (hx, off, lift, back) => part(ctx, W, H, c => {
    const hy = 30 + by, ax = hx + off, ay = 39 - lift, b = back ? -0.3 : 0;
    const [kx, ky] = ik2(hx, hy, ax, ay, 7.5, 8, -1);                       // reverse-jointed walker leg
    limb(c, hx, hy, kx, ky, 3.6, 2.9, IRN, b);                                // thigh
    limb(c, kx, ky, ax, ay, 2.7, 2.1, IRN, b - 0.04);                         // shin
    limb(c, (hx + kx) / 2 + 1.5, (hy + ky) / 2 - 0.5, (kx + ax) / 2 + 1.5, (ky + ay) / 2, 0.75, 0.75, IRN, b + 0.3);   // hydraulic ram
    blob(c, kx, ky, 2.7, 2.7, IRN, 2, b + 0.12);                              // knee joint
    blob(c, ax + 1.5, ay + 2.6, 5.6, 2.3, IRN, 3, b, (x, y) => y <= 43);     // splayed foot
    R(c, IRN[back ? 3 : 6], Math.round(ax + 5), Math.round(ay + 3), 2, 1);   // toe claw
  });
  leg(19, bOff, bLift, true);
  part(ctx, W, H, c => {                                                     // smokestacks
    limb(c, 9.5, 15 + by, 9.5, 3 + by, 2.4, 2.2, IRN, -0.12); limb(c, 15.5, 13 + by, 15.5, 6 + by, 1.7, 1.6, IRN, -0.16);
    R(c, IRN[5], 6, 1 + by, 7, 2); R(c, IRN[6], 6, 1 + by, 7, 1); R(c, MLT[hot ? 6 : 4], 8, 1 + by, 3, 1);
    R(c, IRN[4], 13, 5 + by, 5, 1); R(c, MLT[hot ? 5 : 3], 14, 5 + by, 3, 1);
    R(c, IRN[2], 7, 8 + by, 5, 1); R(c, IRN[2], 14, 9 + by, 3, 1);
  });
  part(ctx, W, H, c => {                                                     // furnace hull
    const cx = 22, cy = 20 + by, rx = 15.5, ry = 12, P = 2.6, ins = (x, y) => inBlob(x, y, cx, cy, rx, ry, P);
    blob(c, cx, cy, rx, ry, IRN, P, 0.04);
    blob(c, cx, cy, rx, ry, RST, P, 0.06, (x, y) => y >= cy + 3);            // scorched lower hull
    for (let x = 6; x < 38; x++) { if (ins(x, cy + 3)) R(c, IRN[1], x, cy + 3); if (ins(x, cy - 6) && x > 12 && x < 33) R(c, IRN[2], x, cy - 6); }
    for (let x = 9; x < 37; x += 4) if (ins(x, cy + 1)) { R(c, IRN[7], x, cy + 1); R(c, IRN[2], x, cy + 2); }   // rivets
    for (let i = 0; i < 3; i++) R(c, IRN[1], 9, cy - 4 + i * 2, 5, 1);       // back vents
    for (let x = 6; x < 38; x++) for (const y of [cy + 9, cy + 10]) if (ins(x, y)) R(c, HAZ[((x - y) >> 1) & 1 ? 3 : 0], x, y);   // hazard skirt
    const fx0 = 17, fy0 = cy - 4, fw = 15, fh = 10;                          // the furnace mouth
    R(c, IRN[0], fx0, fy0, fw, fh); R(c, IRN[5], fx0 + 1, fy0 - 1, fw - 2, 1); R(c, IRN[2], fx0, fy0 + fh, fw, 1);
    for (let y = fy0 + 1; y < fy0 + fh - 1; y++) for (let x = fx0 + 1; x < fx0 + fw - 1; x++) {
      const d = Math.hypot((x + 0.5 - (fx0 + fw / 2)) / (fw / 2), (y + 0.5 - (fy0 + fh * 0.6)) / (fh / 2));
      R(c, MLT[clamp(Math.round(7 - d * 5) - (hot ? 0 : 1), 1, 7)], x, y);
    }
    for (let x = fx0 + 3; x < fx0 + fw - 1; x += 3) { R(c, IRN[1], x, fy0 + 1, 1, fh - 2); R(c, IRN[4], x, fy0 + 1); }   // grate bars
  });
  leg(27, fOff, fLift, false);
  part(ctx, W, H, c => {                                                     // hunched helm
    const br = pose === 'breath', hx = 37 + (br ? 1 : 0), hy = 12 + by + (br ? 1 : 0);
    blob(c, hx - 4, hy + 2.5, 4.6, 3.6, IRN, 2, -0.14);                      // neck collar
    blob(c, hx, hy, 6, 5, IRN, 2.4, 0.1);
    for (let x = hx - 2; x <= hx + 5; x++) R(c, IRN[0], x, hy - 1);           // brow
    for (let x = hx - 1; x <= hx + 5; x++) R(c, MLT[x >= hx + 3 ? 7 : x >= hx + 1 ? 6 : 4], x, hy);   // furnace-eye slit
    R(c, IRN[7], hx - 3, hy - 4, 2, 1);
    if (br) { R(c, IRN[0], hx - 1, hy + 2, 7, 3); R(c, MLT[5], hx, hy + 3, 6, 1); R(c, MLT[7], hx + 3, hy + 3, 3, 1); blob(c, hx + 1.5, hy + 5.6, 4.6, 1.8, IRN, 2, -0.06); }
    else { R(c, IRN[1], hx, hy + 3, 6, 1); for (let i = 0; i < 3; i++) R(c, IRN[6], hx + 1 + i * 2, hy + 3); }
  });
  part(ctx, W, H, c => {                                                     // mortar-cannon arm
    const sx = 30, sy = 19 + by;
    const [ex, ey] = pose === 'wind' ? [41, 4 + by] : crouch ? [43, 31 + by] : pose === 'breath' ? [40, 31 + by] : [44, 26 + by];
    const bx = sx + 2, byy = sy + 4, ux = ex - bx, uy = ey - byy, ul = Math.hypot(ux, uy), ca = ux / ul, sa = uy / ul;
    limb(c, bx, byy, ex - ca * 1, ey - sa * 1, 3.8, 3.1, IRN, 0, true);       // barrel
    limb(c, bx + ux * 0.42, byy + uy * 0.42, bx + ux * 0.52, byy + uy * 0.52, 3.9, 3.8, HAZ, 0.05, true);   // hazard band
    limb(c, ex - ca * 3, ey - sa * 3, ex + ca * 0.5, ey + sa * 0.5, 4.1, 4.1, IRN, 0.12, true);   // muzzle collar
    R(c, IRN[0], Math.round(ex + ca * 1.5 - 1), Math.round(ey + sa * 1.5 - 1), 2, 2);
    R(c, MLT[hot ? 7 : 4], Math.round(ex + ca * 1.5 - 0.5), Math.round(ey + sa * 1.5 - 0.5), 1, 1);
    blob(c, sx, sy, 5.6, 4.8, IRN, 2.2, 0.14);                              // pauldron
    R(c, IRN[7], sx - 2, sy - 3, 2, 1); R(c, IRN[2], sx - 4, sy + 2, 8, 1);
  });
}
// ---- chaos-update enemies --------------------------------------------------------
const RK = { k: '#14110a', d: '#2a2412', a: '#4a3e1a', b: '#6e5c24', c: '#9a8434', w: '#d2bc62', visor: '#ff8a20', tube: '#3a3f47', tip: '#d02a1a' };
const RKLEG = { a: RK.a, b: RK.b, c: RK.c, d: RK.d, k: RK.k };
const WP = { k: '#0e0d0a', d: '#26221a', a: '#3e3a2c', b: '#5a5440', c: '#8a8460', y: '#e8b422', wing: '#b8d0e0', wingD: '#7890a0', eye: '#ff3020' };
const RM = { k: '#120c0a', fd: '#3e241f', f: '#6a3c30', fl: '#94614b', md: '#2c3036', m: '#4c535e', ml: '#7c8692', mh: '#a8b2be', y: '#e8b422', eye: '#ff3b1f' };
function drawRocketeer(ctx, by, front, back) {      // 20x24 hazard-armoured launcher trooper with a rocket backpack
  drawPLeg(ctx, 8, 15 + by, back[0], back[1], true, RKLEG);
  drawPLeg(ctx, 11, 15 + by, front[0], front[1], false, RKLEG);
  const u = (col, x, y, w, h) => R(ctx, col, x + 1, y + by, w, h);
  u('#22262c', 0, 5, 4, 10); u(RK.tube, 0, 5, 3, 9); u('#6a7380', 0, 5, 1, 9);          // twin missile pack
  u(RK.tip, 0, 3, 2, 2); u(RK.tip, 2, 4, 2, 1); u('#ff9070', 0, 3, 1, 1); u('#e8b422', 0, 9, 4, 1);
  u(RK.b, 5, 1, 7, 1); u(RK.b, 4, 2, 9, 5); u(RK.c, 5, 2, 5, 1); u(RK.w, 6, 1, 3, 1);   // blast helmet
  u(RK.k, 8, 3, 5, 3); u(RK.visor, 9, 4, 4, 1); u('#fff0b0', 11, 4, 2, 1);               // visor
  u(RK.k, 7, 7, 4, 1);
  u(RK.c, 3, 8, 11, 2); u(RK.w, 4, 8, 3, 1); u(RK.k, 3, 10, 11, 1);                     // pauldrons
  u(RK.b, 4, 10, 9, 4); u(RK.c, 5, 10, 4, 1);
  for (let i = 0; i < 9; i++) u(((i >> 1) & 1) ? '#16171a' : '#e8b422', 4 + i, 12, 1, 1); // hazard chest band
  u(RK.k, 4, 14, 9, 1); u(RK.w, 8, 14, 2, 1);
}
function drawRLauncher(ctx, arm) {                   // 26x11, pivot (2,5)
  if (arm) drawArm(ctx, 5, RKLEG);
  R(ctx, '#3a3f47', 5, 2, 18, 6); R(ctx, '#7a8492', 5, 2, 18, 1); R(ctx, '#23272d', 5, 7, 18, 1);
  for (let i = 0; i < 6; i++) R(ctx, (i >> 1) % 2 ? '#15161a' : '#e8b422', 10 + i, 3, 1, 4);
  R(ctx, '#2a2e35', 9, 8, 2, 3); R(ctx, '#60ff9a', 17, 1, 2, 1);                         // grip + optic sight
  R(ctx, '#8a94a0', 22, 1, 3, 8); R(ctx, '#15171a', 23, 3, 2, 4); R(ctx, '#d02a1a', 3, 3, 2, 4);
}
function drawWasp(ctx, flap, bay) {                  // 22x14 bomber drone: insect hull, buzzing wings, bomb bay
  const by = flap ? 0 : 1;
  if (flap) {
    R(ctx, WP.wingD, 5, 0, 8, 2); R(ctx, WP.wing, 6, 0, 6, 1); R(ctx, '#ffffff', 7, 0, 3, 1);
    R(ctx, WP.wingD, 11, 1, 6, 2); R(ctx, WP.wing, 12, 1, 5, 1);
  } else {
    R(ctx, WP.wingD, 4, 3, 8, 2); R(ctx, WP.wing, 5, 3, 6, 1); R(ctx, '#e8f8ff', 6, 3, 3, 1);
    R(ctx, WP.wingD, 11, 3, 7, 2); R(ctx, WP.wing, 12, 3, 5, 1);
  }
  blob(ctx, 5, 7.5 + by * 0.5, 4.5, 2.8, [WP.k, WP.d, WP.a, WP.b, WP.c], 2.2, 0.05);     // abdomen
  for (let i = 0; i < 4; i++) R(ctx, i % 2 ? WP.k : WP.y, 2 + i * 2, 6 + by, 2, 3);      // wasp stripes
  R(ctx, WP.c, 0, 7 + by, 2, 1);                                                         // stinger
  blob(ctx, 12.5, 7 + by * 0.5, 4, 3.2, [WP.k, WP.d, WP.a, WP.b, WP.c], 2.2, 0.1);       // armored thorax
  blob(ctx, 17.5, 7 + by * 0.5, 2.8, 2.4, [WP.d, WP.a, WP.b, WP.c], 2.2, 0.12);          // head
  R(ctx, WP.eye, 18, 6 + by, 2, 2); R(ctx, '#ffe0a0', 19, 6 + by, 1, 1);                 // compound eye
  R(ctx, WP.c, 20, 8 + by, 2, 1);                                                        // mandible
  R(ctx, WP.k, 10, 10 + by, 1, 2); R(ctx, WP.k, 15, 10 + by, 1, 2);                      // landing claws
  if (bay) { R(ctx, '#a02018', 11, 10 + by, 4, 3); R(ctx, '#ff5040', 12, 10 + by, 2, 1); R(ctx, '#e8b422', 12, 12 + by, 2, 1); }
  else R(ctx, WP.k, 11, 10 + by, 4, 1);
}
function drawRammer(ctx, phase, pose) {              // 30x22 armoured ram-beast; pose walk|wind|charge|dizzy, faces right
  const charge = pose === 'charge', wind = pose === 'wind', dizzy = pose === 'dizzy';
  const low = wind ? 2 : dizzy ? 1 : (phase % 2 ? 0 : 1);
  const G = charge ? [[4, 2, -4, 0], [-4, 0, 4, 2]][phase % 2] : [[3, 0, -2, 0], [0, 0, 0, 2], [-2, 0, 3, 0], [0, 2, 0, 0]][phase];
  const leg = (hx, off, lift, back) => {
    const hy = 13 + low, fx = hx + off, fy = 20 - lift;
    const [kx, ky] = ik2(hx, hy, fx, fy, 4, 4, back ? -1 : 1);
    limb(ctx, hx, hy, kx, ky, 2.1, 1.7, back ? RST : IRN, back ? -0.18 : 0.04);
    limb(ctx, kx, ky, fx, fy, 1.7, 1.4, IRN, back ? -0.2 : 0.06);
    R(ctx, back ? RM.md : RM.ml, fx - 2, fy, 5, 2); R(ctx, RM.mh, fx + 2, fy + 1, 1, 1);
  };
  leg(8, G[2], G[3], true); leg(18, G[0], G[1], true);
  blob(ctx, 13, 11 + low, 9.5, 5.2, [RM.k, RM.fd, RM.f, RM.fl, '#b87c62'], 2.3, 0.06);   // muscular beast torso
  blob(ctx, 12, 7.5 + low, 7.5, 3.2, IRN, 2.5, 0.1);                                     // dorsal armor carapace
  for (let i = 0; i < 3; i++) { R(ctx, RM.mh, 7 + i * 4, 5 + low, 2, 1); R(ctx, RM.md, 7 + i * 4, 6 + low, 2, 1); } // dorsal spikes/rivets
  R(ctx, RM.m, 2, 7 + low, 3, 5); R(ctx, RM.ml, 2, 7 + low, 3, 1);                       // rump guard
  const hy = (wind ? 6 : charge ? 5 : 4) + low;
  blob(ctx, 24.5, hy + 5.5, 4.5, 5.5, IRN, 2.6, 0.14);                                   // massive battering-ram skull
  R(ctx, RM.mh, 23, hy + 1, 1, 9); R(ctx, RM.mh, 28, hy + 2, 1, 8);                      // reinforced ram bevels
  for (let j = 0; j < 4; j++) R(ctx, j % 2 ? RM.k : RM.y, 24, hy + 3 + j * 2, 4, 1);     // hazard stripes on ram face
  R(ctx, RM.k, 20, hy + 2, 3, 2); R(ctx, dizzy ? '#ffe14a' : RM.eye, 21, hy + 2, 2, 1); R(ctx, '#ffffff', 22, hy + 2, 1, 1);
  R(ctx, RM.mh, 28, hy + 10, 2, 2); R(ctx, RM.mh, 28, hy + 1, 2, 1);                     // ramming tusks
  leg(10, G[0], G[1], false); leg(20, G[2], G[3], false);
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
// ---- mayhem-update enemies ----------------------------------------------------------
const JT = { k: '#0c1218', d: '#18242e', a: '#26404e', b: '#3a6070', c: '#5a8a9a', w: '#a0d0dc', visor: '#ffe040', pack: '#3a3f47', packL: '#6a7380' };
const JTLEG = { a: JT.a, b: JT.b, c: JT.c, d: JT.d, k: JT.k };
const SP = { k: '#120e0a', d: '#2a2016', a: '#4a3a24', b: '#6e5634', c: '#94784a', mask: '#3a3f47', lens: '#7dff4a', bag: '#5a2a18', bagL: '#8a4a28', strap: '#e8b422', red: '#d02a1a' };
const SPLEG = { a: SP.a, b: SP.b, c: SP.c, d: SP.d, k: SP.k };
const BRF = ['#240a0a', '#421616', '#622626', '#843830', '#a4523f', '#c4745e'];
const BRE = ['#5a3e06', '#9a7010', '#d8b028', '#f8e070', '#fff8c0'];
function drawJet(ctx, swing) {                       // 20x24 jetpack trooper, legs dangling under twin thrusters
  drawPLeg(ctx, 8, 15, swing ? 2 : -1, 2, true, JTLEG);
  drawPLeg(ctx, 11, 15, swing ? -1 : 2, 1, false, JTLEG);
  const u = (col, x, y, w, h) => R(ctx, col, x + 1, y, w, h);
  u('#1e2228', 0, 6, 4, 10); u(JT.pack, 0, 7, 3, 9); u(JT.packL, 0, 7, 1, 8);               // twin turbofan pack
  u('#22262c', 0, 16, 2, 2); u('#22262c', 2, 16, 2, 2); u('#ff9a30', 0, 17, 1, 1); u('#ff9a30', 2, 17, 1, 1); // nozzles
  u('#ff8a20', 1, 9, 2, 1); u('#ffe080', 1, 9, 1, 1);
  u(JT.b, 5, 1, 7, 1); u(JT.b, 4, 2, 9, 5); u(JT.c, 5, 2, 5, 1); u(JT.w, 6, 1, 3, 1);       // flight helmet
  u(JT.k, 8, 3, 5, 2); u(JT.visor, 9, 3, 4, 1); u('#ffffff', 11, 3, 1, 1);
  u(JT.k, 7, 7, 4, 1);
  u(JT.c, 3, 8, 11, 2); u(JT.w, 4, 8, 4, 1); u(JT.a, 3, 10, 11, 1);                         // aero pauldrons
  u(JT.b, 4, 10, 9, 4); u(JT.c, 5, 10, 4, 2); u(JT.a, 4, 13, 9, 1);
  u(JT.k, 4, 14, 9, 1); u('#e8b422', 8, 14, 2, 1);
}
function drawSMG(ctx, arm) {                         // 18x9, pivot (2,4)
  if (arm) drawArm(ctx, 4, JTLEG);
  R(ctx, '#2a2e35', 5, 2, 9, 4); R(ctx, '#5a636e', 5, 2, 9, 1); R(ctx, '#1e2126', 8, 6, 2, 3); R(ctx, '#3a3f47', 14, 3, 3, 2); R(ctx, '#ffe040', 11, 3, 2, 1);
}
function drawSapper(ctx, by, front, back, pose) {    // 18x24 gas-masked demolitions runner with a satchel of charges
  drawPLeg(ctx, 7, 15 + by, back[0], back[1], true, SPLEG);
  drawPLeg(ctx, 10, 15 + by, front[0], front[1], false, SPLEG);
  const u = (col, x, y, w, h) => R(ctx, col, x + 1, y + by, w, h);
  u('#38180c', 0, 8, 5, 7); u(SP.bag, 0, 8, 4, 6); u(SP.bagL, 0, 8, 4, 1);                  // heavy C4 satchel
  u(SP.red, 1, 10, 3, 2); u('#ffe040', 2, 9, 1, 1); u('#ff5040', 1, 13, 2, 1);
  u(SP.a, 5, 1, 7, 1); u(SP.a, 4, 2, 8, 5); u(SP.b, 5, 2, 5, 1); u(SP.c, 6, 1, 2, 1);       // blast hood
  u(SP.mask, 8, 3, 5, 4); u('#5a636e', 8, 3, 4, 1);
  u(SP.lens, 9, 4, 1, 1); u('#d8ffc0', 9, 4, 1, 1); u(SP.lens, 11, 4, 1, 1); u('#22262c', 12, 6, 2, 2); // goggles + filter
  u(SP.b, 4, 8, 8, 2); u(SP.c, 5, 8, 4, 1); u(SP.a, 4, 10, 8, 4);
  u(SP.strap, 5, 9, 1, 1); u(SP.strap, 6, 10, 1, 1); u(SP.strap, 7, 11, 1, 1); u(SP.strap, 8, 12, 1, 1);
  u(SP.k, 4, 14, 8, 1); u(SP.red, 5, 13, 2, 1); u(SP.red, 9, 13, 2, 1); u('#ffe040', 6, 13, 1, 1); // belt charges
  if (pose === 'crouch') { u(SP.b, 10, 11, 2, 5); u(SP.red, 10, 15, 4, 2); u('#ffe040', 11, 15, 2, 1); u('#ffffff', 12, 15, 1, 1); } // planting charge
  else { const sw = Math.round((front[0] - back[0]) * 0.2); u(SP.b, 10 + sw, 9, 2, 4); u(SP.red, 10 + sw, 12, 2, 2); }
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
// ---- frenzy-update enemies & gear -----------------------------------------------------
function drawScreamer(ctx, f, wind) {                // 14x12 burning kamikaze skull, faces right
  const fl = f ? ['#fff0a0', '#ff9a20', '#d03810', '#7a1406'] : ['#ffffff', '#ffd050', '#f05a18', '#9a1c08'];
  R(ctx, fl[3], 0, 3 + f, 4, 5); R(ctx, fl[2], 1, 2 + f, 5, 6); R(ctx, fl[1], 2, 3, 4, 5); R(ctx, fl[0], 3, 4, 3, 3); // roaring flame trail
  blob(ctx, 8, 4.5, 4.2, 3.6, ['#7a7058', '#a89f80', '#d8d0b8', '#f0ead8', '#ffffff'], 2.3, 0.12); // volumetric cranium
  R(ctx, '#1a0a08', 7, 3, 2, 2); R(ctx, '#1a0a08', 11, 3, 2, 2);                            // eye sockets
  R(ctx, wind ? '#ffffff' : '#ff4020', 8, 3, 1, 1); R(ctx, wind ? '#ffffff' : '#ff4020', 11, 3, 1, 1);
  if (wind) { R(ctx, '#ffe060', 7, 3, 1, 1); R(ctx, '#ffe060', 12, 3, 1, 1); }
  R(ctx, '#1a0a08', 10, 5, 1, 1);                                                           // nasal cavity
  if (wind) {                                                                               // unhinged shrieking jaw
    R(ctx, '#3a0a04', 6, 7, 6, 3); R(ctx, '#ff6a18', 7, 8, 4, 2); R(ctx, '#fff0a0', 8, 8, 2, 1);
    R(ctx, '#d8d0b8', 6, 10, 6, 1); R(ctx, '#ffffff', 7, 7, 1, 1); R(ctx, '#ffffff', 9, 7, 1, 1); R(ctx, '#ffffff', 11, 7, 1, 1);
  } else {
    R(ctx, '#c8bea0', 6, 8, 6, 2); R(ctx, '#1a0a08', 7, 8, 1, 1); R(ctx, '#1a0a08', 9, 8, 1, 1); R(ctx, '#1a0a08', 11, 8, 1, 1);
  }
}
function drawWarden(ctx, f) {                        // 18x16 shield-projector drone
  const fy = f ? 11 : 12;
  blob(ctx, 9, 8.5, 5.5, 3.6, IRN, 2.4, 0.08);                                              // armored hull
  R(ctx, '#14222e', 6, 7, 6, 3); R(ctx, '#40d0ff', 7, 7, 4, 2); R(ctx, '#e0ffff', 8, 7, 2, 1); // shield core
  R(ctx, '#5a6474', 8, 3, 2, 3);                                                            // emitter mast
  blob(ctx, 9, 2, 4.5, 1.5, ['#3a4250', '#6a7484', '#9aa4b4', '#d8e4f0'], 2.2, 0.15);       // top projector dish
  R(ctx, f ? '#ffffff' : '#40d0ff', 8, 0, 2, 1);                                            // crystal tip
  R(ctx, '#2a2e35', 2, fy, 3, 2); R(ctx, '#2a2e35', 13, fy, 3, 2);                          // twin vector thrusters
  R(ctx, '#40d0ff', 3, fy + 2, 1, 2); R(ctx, '#40d0ff', 14, fy + 2, 1, 2);
  R(ctx, '#454d5a', 1, 7, 3, 3); R(ctx, '#454d5a', 14, 7, 3, 3); R(ctx, '#40d0ff', 1, 8, 1, 1); R(ctx, '#40d0ff', 16, 8, 1, 1);
}
function drawJugg(ctx, phase, stage) {               // 32x30 juggernaut; stage 0 armoured, 1 cracked, 2 stripped
  const L = [[3, 0, -2, 0], [0, 0, 0, 2], [-2, 0, 3, 0], [0, 2, 0, 0]][phase], by = phase % 2 ? 0 : 1;
  const leg = (hx, off, lift, back) => {
    const hy = 19 + by, fx = hx + off, fy = 27 - lift;
    const [kx, ky] = ik2(hx, hy, fx, fy, 4.5, 4.5, 1);
    limb(ctx, hx, hy, kx, ky, 2.6, 2.2, IRN, back ? -0.22 : 0.04);
    limb(ctx, kx, ky, fx, fy, 2.2, 1.9, IRN, back ? -0.2 : 0.08);
    R(ctx, back ? '#22262c' : '#4a525c', fx - 3, fy, 7, 3); R(ctx, back ? '#4a525c' : '#9aa4b0', fx - 3, fy, 7, 1);
  };
  leg(12, L[2], L[3], true);
  blob(ctx, 16, 14 + by, 8.5, 7, BRF, 2.3, 0.06);                                           // hulking muscled torso
  for (let y = 10; y <= 16; y += 2) R(ctx, '#ddd3b0', 14, y + by, 5, 1);                    // exposed ribcage under armor
  if (stage < 2) {
    blob(ctx, 16, 13.5 + by, 9, 7, IRN, 2.6, 0.08);                                         // dreadnought breastplate
    for (let i = 0; i < 5; i++) R(ctx, i % 2 ? '#15161a' : '#e8b422', 9 + i * 3, 15 + by, 3, 2);
    for (const [x, y] of [[9, 9], [22, 9], [9, 18], [22, 18]]) R(ctx, '#aab4c2', x, y + by);
  }
  if (stage === 1) {                                                                        // shattered armor + glowing core
    R(ctx, '#3e1614', 10, 8 + by, 6, 5); R(ctx, '#843830', 11, 9 + by, 4, 3); R(ctx, '#ff6a20', 12, 10 + by, 2, 2);
    R(ctx, '#0c0e12', 15, 9 + by, 1, 6); R(ctx, '#0c0e12', 16, 13 + by, 4, 1);
  }
  if (stage < 2) {
    blob(ctx, 6.5, 8 + by, 4.2, 3.2, IRN, 2.3, 0.1); R(ctx, '#aab4c2', 4, 5 + by, 5, 1);    // rear pauldron
  } else {
    blob(ctx, 6.5, 9 + by, 3.5, 3, BRF, 2, 0.05); R(ctx, '#ddd3b0', 5, 6 + by, 2, 2); R(ctx, '#ff3020', 6, 10 + by, 2, 1);
  }
  if (stage === 0) {
    blob(ctx, 25, 8 + by, 4.2, 3.2, IRN, 2.3, 0.14); R(ctx, '#aab4c2', 22, 5 + by, 5, 1);   // front pauldron
  } else {
    blob(ctx, 24.5, 9 + by, 3.5, 3, BRF, 2, 0.08); R(ctx, '#ddd3b0', 25, 6 + by, 2, 2); R(ctx, '#ff6a20', 23, 9 + by, 2, 2);
  }
  blob(ctx, 16.5, 4 + by, 4.8, 4, IRN, 2.4, 0.12);                                          // juggernaut helm
  R(ctx, '#0c0e12', 14, 3 + by, 7, 2); R(ctx, '#ff3020', 15, 3 + by, 5, 1); R(ctx, '#ffe0a0', 18, 3 + by, 2, 1);
  for (let x = 14; x <= 19; x += 2) R(ctx, '#7f8a99', x, 6 + by, 1, 1);                     // respirator grille
  leg(20, L[0], L[1], false);
}
function drawJuggGun(ctx, alt) {                     // 30x12 minigun, pivot (4,6)
  R(ctx, '#1e2228', 2, 3, 10, 7); R(ctx, '#4a525c', 2, 3, 10, 2); R(ctx, '#7f8a99', 3, 3, 6, 1);
  R(ctx, '#5a4a2a', 4, 8, 6, 4); R(ctx, '#c8a040', 4, 8, 6, 1); R(ctx, '#e8b422', 5, 9, 4, 1); // ammo drum
  R(ctx, '#3a414b', 12, 2, 3, 8); R(ctx, '#8a94a0', 12, 2, 3, 1);
  for (let i = 0; i < 4; i++) R(ctx, (i + (alt ? 1 : 0)) % 2 ? '#aab4c2' : '#454d5a', 15, 3 + i * 2, 13, 1);
  R(ctx, '#171a20', 15, 4, 13, 1); R(ctx, '#171a20', 15, 6, 13, 1);
  R(ctx, '#6a7380', 23, 2, 2, 8); R(ctx, '#8a94a0', 27, 2, 2, 8); R(ctx, '#ffffff', 28, 3, 1, 2);
}
function drawSentryBase(c) {                         // 14x10 tripod
  R(c, '#2a2e35', 6, 0, 3, 5); R(c, '#4a525c', 6, 0, 1, 5); R(c, '#e8b422', 6, 2, 3, 1);
  for (let i = 0; i < 5; i++) { R(c, '#3a414b', 6 - i, 5 + i, 1, 1); R(c, '#3a414b', 8 + i, 5 + i, 1, 1); }
  R(c, '#3a414b', 7, 5, 1, 5); R(c, '#22262c', 1, 9, 3, 1); R(c, '#22262c', 11, 9, 3, 1);
}
function drawSentryHead(c) {                         // 16x8 gun head, pivot (5,4)
  R(c, '#3a414b', 1, 1, 8, 6); R(c, '#6a7380', 1, 1, 8, 1); R(c, '#22262c', 2, 6, 6, 1); R(c, '#46e6ff', 6, 3, 2, 1);
  R(c, '#5a636e', 9, 3, 6, 2); R(c, '#9aa4b0', 9, 3, 6, 1); R(c, '#2a2e35', 14, 2, 1, 4);
}
// ---- havoc-update enemies -------------------------------------------------------------
const CK = { k: '#08060c', d: '#14101c', a: '#221a30', b: '#342848', c: '#4c3c66', eye: '#40f0ff', blade: '#c8e0ff' };
const CKLEG = { a: CK.a, b: CK.b, c: CK.c, d: CK.d, k: CK.k };
const PY = { k: '#140a06', d: '#2a1810', a: '#4a2a1a', b: '#6e3e24', c: '#94582e', mask: '#3a3f47', lens: '#ffb040', tank: '#a02018', tankL: '#d04030', fire: '#ff8a20' };
const PYLEG = { a: PY.a, b: PY.b, c: PY.c, d: PY.d, k: PY.k };
function drawCloaker(ctx, by, front, back, pose) {   // 18x24 phase-cloaked assassin with a wrist blade
  const sw = Math.round((front[0] - back[0]) * 0.25);
  drawPLeg(ctx, 7, 15 + by, back[0], back[1], true, CKLEG, 2);
  drawPLeg(ctx, 10, 15 + by, front[0], front[1], false, CKLEG, 2);
  const u = (col, x, y, w, h) => R(ctx, col, x + 1, y + by, w, h);
  u(CK.d, 1 - (sw > 0 ? 1 : 0), 9, 4, 8); u(CK.a, 2 - (sw > 0 ? 1 : 0), 9, 2, 7);           // flowing stealth mantle
  u(CK.a, 5, 1, 6, 1); u(CK.a, 4, 2, 8, 5); u(CK.b, 5, 2, 5, 1); u(CK.c, 6, 1, 2, 1);       // stealth cowl
  u(CK.k, 8, 3, 4, 3); u(CK.eye, 9, 4, 3, 1); u('#ffffff', 11, 4, 1, 1); u(CK.eye, 9, 3, 1, 1); // tri-optic visor
  u(CK.b, 4, 8, 8, 2); u(CK.c, 5, 8, 4, 1); u(CK.a, 4, 10, 7, 4); u(CK.b, 5, 11, 3, 1);
  u(CK.k, 4, 14, 7, 1); u(CK.eye, 7, 14, 1, 1);                                             // phase belt node
  if (pose === 'lunge') {
    u(CK.b, 10, 9, 3, 2); u(CK.blade, 12, 8, 5, 2); u('#ffffff', 13, 8, 4, 1); u(CK.eye, 12, 9, 3, 1);
  } else if (pose === 'crouch') {
    u(CK.b, 9, 9, 2, 3); u(CK.blade, 10, 6, 2, 5); u('#ffffff', 11, 6, 1, 4);
  } else {
    u(CK.b, 10, 9, 2, 4); u(CK.blade, 11, 12, 1, 5); u('#ffffff', 11, 12, 1, 3); u(CK.eye, 12, 14, 1, 3);
  }
}
function drawPyro(ctx, by, front, back, pose) {      // 18x24 firebomber with a fuel tank on its back
  drawPLeg(ctx, 7, 15 + by, back[0], back[1], true, PYLEG);
  drawPLeg(ctx, 10, 15 + by, front[0], front[1], false, PYLEG);
  const u = (col, x, y, w, h) => R(ctx, col, x + 1, y + by, w, h);
  u('#5a100c', 0, 6, 4, 9); u(PY.tank, 0, 6, 3, 8); u(PY.tankL, 0, 6, 1, 8);                // napalm cylinder
  u('#e8b422', 0, 10, 4, 1); u('#5a636e', 1, 4, 2, 2); u('#ffe080', 1, 4, 1, 1);            // valve + pressure gauge
  u(PY.a, 5, 1, 7, 1); u(PY.a, 4, 2, 8, 5); u(PY.b, 5, 2, 5, 1); u(PY.c, 6, 1, 2, 1);       // asbestos hood
  u(PY.mask, 8, 3, 5, 4); u('#5a636e', 8, 3, 4, 1);
  u(PY.lens, 9, 4, 1, 1); u('#fff0a0', 9, 4, 1, 1); u(PY.lens, 11, 4, 1, 1); u('#22262c', 12, 6, 2, 2);
  u(PY.b, 4, 8, 8, 2); u(PY.c, 5, 8, 4, 1); u(PY.a, 4, 10, 8, 4); u(PY.b, 5, 11, 4, 2);
  u(PY.k, 4, 14, 8, 1); u('#e8b422', 7, 14, 2, 1);
  if (pose === 'crouch') {                                                                  // arm cocked with lit molotov
    u(PY.b, 9, 4, 2, 5); u('#7a5a30', 9, 1, 2, 3); u(PY.fire, 8, 0, 3, 2); u('#fff0a0', 9, 0, 1, 1);
  } else if (pose === 'lunge') {
    u(PY.b, 10, 8, 5, 2); u(PY.c, 10, 8, 3, 1);
  } else {
    u(PY.b, 10, 9, 2, 4); u('#7a5a30', 11, 12, 2, 3); u(PY.fire, 11, 10, 2, 2); u('#fff0a0', 11, 11, 1, 1);
  }
}
function drawGunship(ctx, f, wreck) {                // 56x24 armoured gunship (faces right); wreck = burnt-out falling hulk
  const H = wreck ? ['#0c0e12', '#181b20', '#262a32', '#363c46', '#4a525e'] : ['#14181e', '#262c35', '#3e4652', '#647080', '#9aa6b6'];
  R(ctx, H[1], 0, 2, 5, 7); R(ctx, H[3], 0, 2, 4, 1); R(ctx, wreck ? '#402010' : '#ff3020', 1, 3, 2, 1); // tail fin + beacon
  R(ctx, H[1], 3, 6, 10, 5); R(ctx, H[3], 3, 6, 10, 1); R(ctx, H[0], 3, 10, 10, 1);          // tail boom
  blob(ctx, 28, 12.5, 21, 5.5, H, 2.8, 0.08);                                               // armored fuselage
  R(ctx, H[4], 12, 8, 28, 1); R(ctx, H[0], 9, 16, 38, 1);                                   // dorsal highlight + ventralchine
  R(ctx, H[2], 44, 9, 10, 6); R(ctx, H[3], 44, 9, 8, 1); R(ctx, H[1], 51, 11, 4, 3);        // nose cone + chin sensor
  R(ctx, '#0c1016', 42, 9, 9, 4);                                                           // stepped tandem canopy
  R(ctx, wreck ? '#4a1a10' : '#ff9a20', 43, 10, 7, 2); R(ctx, wreck ? '#2a1008' : '#fff0a0', 46, 10, 3, 1);
  for (let i = 0; i < 9; i++) R(ctx, i % 2 ? '#15161a' : wreck ? '#6a5a20' : '#e8b422', 16 + i * 2, 12, 2, 2); // hazard stripe
  for (const ex of [13, 31]) {                                                              // twin turbofan nacelles
    blob(ctx, ex + 5.5, 5.5, 6, 3, H, 2.5, 0.12);
    R(ctx, H[0], ex + 9, 4, 2, 3); R(ctx, H[4], ex + 2, 3, 6, 1);
    if (!wreck) {
      R(ctx, f ? '#e0ffff' : '#60d0ff', ex + 2, 8, 7, 1); R(ctx, '#ffffff', ex + 4, 8, 3, 1); // VTOL thruster wash
    }
  }
  R(ctx, H[0], 19, 17, 16, 4); R(ctx, H[2], 20, 17, 14, 1);                                 // underbelly rocket pod
  for (let i = 0; i < 3; i++) { R(ctx, wreck ? '#401010' : '#d02a1a', 21 + i * 4, 18, 3, 2); if (!wreck) R(ctx, '#ff9070', 22 + i * 4, 18, 1, 1); }
  R(ctx, H[1], 46, 15, 6, 2); R(ctx, H[3], 51, 15, 4, 1);                                   // chin autocannon
  if (wreck) { R(ctx, '#08080a', 24, 8, 7, 5); R(ctx, '#ff6a1a', 26, 9, 4, 3); R(ctx, '#ffe080', 27, 10, 2, 1); }
}
// ---- ragdoll parts: cut from each walker's own drawing so a corpse matches the living sprite ----------
// boxes are [x, y, w, h] in the source frame. 'up' = stands on a vertical spine; the husk lies along a horizontal one.
// clear = regions wiped before cutting (arms/shields that become their own pieces). hp = corpse toughness.
// The heavy isn't here on purpose: it's drawn front-on, so it always bursts.
// ---- overdrive round: new enemies ------------------------------------------------
const SLG = ['#2a0a04', '#4a1406', '#7a2008', '#b8380a', '#f06a14', '#ffa030', '#ffd870', '#fff6d0'];   // molten slag ramp
const CRUST = ['#140c0a', '#241612', '#36221a', '#4a3024'];
function drawSlagling(ctx, w, h, form, tier) {       // molten splitter blob, faces right; form 'a' rest | 'q' squash | 's' stretch
  const sq = form === 'q' ? [1.08, 0.78] : form === 's' ? [0.86, 1.12] : [1, 1];
  const rx = (w / 2 - 1.5) * sq[0], ry = (h / 2 - 1.5) * sq[1], cx = w / 2, cy = h - 1 - ry;
  blob(ctx, cx, cy, rx, ry, SLG, 2.2, 0.08);
  const n = 2 + tier * 2;                             // cooling crust plates riding on top
  for (let i = 0; i < n; i++) {
    const a = -Math.PI * (0.12 + 0.76 * (i + 0.5) / n), px = cx + Math.cos(a) * rx * 0.6, py = cy + Math.sin(a) * ry * 0.62;
    const pw = Math.max(2, Math.round(rx * 0.42)), ph = Math.max(1, Math.round(ry * 0.28));
    R(ctx, CRUST[2], Math.round(px - pw / 2), Math.round(py - ph / 2), pw, ph); R(ctx, CRUST[3], Math.round(px - pw / 2), Math.round(py - ph / 2), pw, 1);
  }
  const es = tier >= 1 ? 2 : 1, ex = Math.round(cx + rx * 0.3), ey = Math.round(cy + ry * 0.05);   // white-hot eyes
  R(ctx, SLG[1], ex - es - 1, ey - 1, es * 2 + 3, es + 2);
  R(ctx, SLG[7], ex - es, ey, es, es); R(ctx, SLG[7], ex + 1, ey, es, es);
  if (tier >= 1) { R(ctx, SLG[1], ex - es + 1, ey + es + 1, es * 2, 1); R(ctx, SLG[6], ex - es + 2, ey + es + 1, 1, 1); }   // grin
  R(ctx, SLG[5], Math.round(cx - rx * 0.45), h - 1, 1, 1); R(ctx, SLG[6], Math.round(cx + rx * 0.15), h - 1, 1, 1);           // drips
}
const WRM = ['#1a0e10', '#2e1618', '#4a2224', '#6a3430', '#8c4a3e', '#b06850', '#d08a6a'];
function drawBurrower(ctx, open, sway) {             // 18x30 slag worm, head up: ringed hide, magma maw
  for (let i = 5; i >= 0; i--) {                      // tail (bottom) up to the neck
    const t = i / 5, y = 27.5 - i * 3.5, x = 9 + Math.sin(t * Math.PI) * sway * 1.6, r = 4 + t * 1.8;
    blob(ctx, x, y, r, 2.7, WRM, 2, 0.04);
    R(ctx, i % 2 ? '#ff8a20' : '#c84008', Math.round(x - r + 1.5), Math.round(y + 1.4), Math.max(1, Math.round(r * 2 - 3)), 1);   // glowing seams
  }
  const hx = 9 + sway * 0.8;
  blob(ctx, hx, 6.5, 6.5, 6, WRM, 2.3, 0.1);
  R(ctx, '#ffd040', Math.round(hx - 6), 8, 1, 1); R(ctx, '#ffd040', Math.round(hx + 5), 8, 1, 1);                 // pit eyes
  if (open) {
    for (let y = 0; y < 9; y++) for (let x = 2; x < 17; x++) {
      const d = Math.hypot((x + 0.5 - hx) / 4.4, (y + 0.5 - 4) / 3.4);
      if (d < 1) R(ctx, d < 0.4 ? '#fff6d0' : d < 0.68 ? '#ffa030' : '#7a2008', x, y);
    }
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; R(ctx, '#e8e2d0', Math.round(hx - 0.5 + Math.cos(a) * 4), Math.round(3.5 + Math.sin(a) * 3)); }   // tooth ring
  } else {
    R(ctx, '#e8e2d0', Math.round(hx - 4), 1, 2, 3); R(ctx, '#e8e2d0', Math.round(hx + 2), 1, 2, 3); R(ctx, '#e8e2d0', Math.round(hx - 1), 0, 2, 2);   // mandibles
    R(ctx, '#ff8a20', Math.round(hx - 2), 4, 4, 1);
  }
}
const HPN = { k: '#0e0c0a', d: '#22201a', a: '#3a3628', b: '#5a5238', c: '#7e7450', brass: '#b08428', brassHi: '#f0c860', port: '#ffe040', chain: '#a0aab6', chainD: '#4a525c', hook: '#e0e8f0' };
const HPLEG = { a: HPN.a, b: HPN.b, c: HPN.c, d: HPN.d, k: HPN.k };
function drawHarpooner(ctx, by, front, back, pose) { // 20x24 dock brute: brass diving helmet, chain coil, hand harpoon
  drawPLeg(ctx, 8, 15 + by, back[0], back[1], true, HPLEG);
  drawPLeg(ctx, 11, 15 + by, front[0], front[1], false, HPLEG);
  const u = (col, x, y, w, h) => R(ctx, col, x + 1, y + by, w, h);
  u(HPN.chainD, 0, 8, 5, 6); for (let i = 0; i < 6; i++) u(HPN.chain, 1 + (i % 2) * 2, 8 + i, 1, 1); // heavy chain coil
  u('#7a5818', 4, 1, 9, 6); u(HPN.brass, 5, 0, 7, 1); u(HPN.brass, 4, 1, 8, 5);              // brass diving dome
  u(HPN.brassHi, 5, 1, 3, 1); u(HPN.brassHi, 4, 2, 1, 2);
  u(HPN.k, 8, 2, 5, 4); u(HPN.port, 9, 3, 3, 2); u('#ffffff', 10, 3, 1, 1); u(HPN.brass, 10, 2, 1, 4); // caged porthole
  u(HPN.brass, 5, 7, 7, 1);
  u(HPN.c, 3, 8, 11, 1); u(HPN.b, 3, 9, 11, 2); u(HPN.b, 4, 11, 9, 3); u(HPN.c, 5, 9, 4, 1); // oilskin coat
  u(HPN.a, 4, 13, 9, 1); u(HPN.k, 4, 14, 9, 1); u(HPN.brassHi, 8, 14, 2, 1);
  if (pose === 'crouch') { u(HPN.b, 1, 6, 3, 3); u(HPN.chainD, 1, 1, 1, 6); u(HPN.hook, 0, 0, 4, 1); u('#ffffff', 1, 0, 2, 2); }
  else if (pose === 'lunge') { u(HPN.b, 12, 9, 5, 2); u(HPN.c, 12, 9, 3, 1); }
  else { u(HPN.b, 12, 10, 2, 4); u(HPN.chainD, 13, 4, 1, 12); u(HPN.hook, 12, 2, 3, 2); u('#ffffff', 13, 1, 1, 3); }
}
function drawLinker(ctx, f, hot) {                   // 16x14 fence drone: twin prongs throw a beam to its partner
  const y = f ? 1 : 0;
  blob(ctx, 8, 6.5 + y, 5.2, 3.8, IRN, 2.4, 0.08);                                          // armored chassis
  R(ctx, '#e8b422', 4, 8 + y, 2, 1); R(ctx, '#e8b422', 8, 8 + y, 2, 1);
  R(ctx, '#142430', 4, 4 + y, 6, 3); R(ctx, hot ? '#e0ffff' : '#40f0ff', 5, 5 + y, 5, 2); R(ctx, '#ffffff', 6, 5 + y, 2, 1); // arc core
  R(ctx, '#5a636e', 12, 2 + y, 3, 2); R(ctx, '#5a636e', 12, 8 + y, 3, 2);                    // twin emitter prongs
  R(ctx, hot ? '#ffffff' : '#9af8ff', 14, 2 + y, 2, 2); R(ctx, hot ? '#ffffff' : '#9af8ff', 14, 8 + y, 2, 2);
  if (hot) { R(ctx, '#40f0ff', 15, 4 + y, 1, 4); R(ctx, '#ffffff', 15, 5 + y, 1, 2); }       // arc bridge across prongs
  R(ctx, '#3a414b', 1, 4 + y, 2, 4); R(ctx, '#8a94a0', 0, 5 + y, 1, 2);                      // rear fin
  R(ctx, '#232730', 6, 10 + y, 4, 2); R(ctx, '#7dd8ff', 7, 12 + y, 2, 1);                    // thruster
}
// ---- crucible round: new enemies ---------------------------------------------------
const MR = { k: '#0e0c16', d: '#1e1a2e', a: '#2e2848', b: '#463e6a', c: '#6a5e98', w: '#b0a8e0', visor: '#e080ff', g0: '#3a2a6a', g1: '#7a5ad0', g2: '#c0a8ff', g3: '#ffffff' };
const MRLEG = { a: MR.a, b: MR.b, c: MR.c, d: MR.d, k: MR.k };
function drawMirror(ctx, by, front, back, pose, broken) {   // 22x24 mirror knight: a prism shield that throws your shots back
  drawPLeg(ctx, 8, 15 + by, back[0], back[1], true, MRLEG);
  drawPLeg(ctx, 11, 15 + by, front[0], front[1], false, MRLEG);
  const u = (col, x, y, w, h) => R(ctx, col, x, y + by, w, h);
  u(MR.a, 2, 8, 3, 7); u(MR.b, 2, 8, 2, 5);                                                 // royal cape
  u(MR.b, 6, 1, 6, 1); u(MR.b, 5, 2, 8, 5); u(MR.c, 6, 2, 5, 1); u(MR.w, 7, 1, 3, 1); u('#ffffff', 8, 0, 2, 1); // crested spire helm
  u(MR.k, 9, 4, 4, 1); u(MR.visor, 10, 4, 3, 1); u('#ffffff', 11, 4, 1, 1); u(MR.a, 5, 6, 8, 1);
  u(MR.c, 3, 7, 11, 2); u(MR.w, 4, 7, 4, 1); u(MR.a, 3, 9, 11, 1);                          // fluted pauldrons
  u(MR.b, 4, 9, 9, 5); u(MR.c, 5, 9, 4, 2); u(MR.w, 6, 10, 2, 2); u(MR.a, 4, 13, 9, 1); u(MR.k, 5, 14, 8, 1);
  u(MR.b, 12, 10, 3, 2);
  if (broken) { u(MR.d, 14, 8, 3, 5); u(MR.g2, 15, 8, 1, 2); u(MR.g1, 15, 11, 1, 2); return; } // shattered prism frame
  const sx = pose === 'bash' ? 16 : pose === 'stagger' ? 13 : 14, sy = pose === 'stagger' ? 8 : 3, h = 18 - (sy - 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < 5; x++) {                                  // faceted prism crystal
    const t = (x + y * 0.65) % 6;
    u(t < 1.3 ? MR.g3 : t < 2.7 ? MR.g2 : t < 4.6 ? MR.g1 : MR.g0, sx + x, sy + y, 1, 1);
  }
  u(MR.w, sx, sy, 5, 1); u(MR.w, sx, sy + h - 1, 5, 1); u('#ffffff', sx + 1, sy, 2, 1);
}
function drawHive(ctx, f) {                          // 22x22 floating hive sac that spits a gnat swarm
  const s = f ? 0.5 : 0;
  blob(ctx, 11, 10, 8.2 + s, 8.6 - s * 0.5, BRF, 2.1, 0.06);
  for (const [x, y] of [[6, 6], [13, 5], [10, 11], [15, 10], [5, 12], [11, 6]]) {
    R(ctx, '#180505', x, y, 3, 3); R(ctx, '#9a5018', x, y + 1, 2, 2); R(ctx, f ? '#fff890' : '#f0d038', x + 1, y + 1, 1, 1);
  }
  for (let i = 0; i < 5; i++) {                                                             // writhing tendrils
    const tx = 5 + i * 3, len = 2 + ((i + f) % 3);
    R(ctx, BRF[2], tx, 17, 1, len); R(ctx, BRF[1], tx + (f ? 1 : 0), 17 + len, 1, 1);
  }
  R(ctx, BRF[4], 8, 2, 6, 1); R(ctx, BRF[5], 9, 2, 3, 1);
}
function drawGnat(ctx, f) {                          // 7x6 swarm gnat: yellow-banded so a swarm reads against the dark
  R(ctx, '#2a1a10', 0, 3, 5, 2); R(ctx, '#ffd040', 1, 3, 2, 2); R(ctx, '#ffd040', 4, 3, 1, 2);
  R(ctx, '#ff3020', 5, 3, 1, 1); R(ctx, '#ffffff', 5, 2, 1, 1);
  const wc = f ? '#ffffff' : '#b8e0f8', wy = f ? 0 : 1;
  R(ctx, wc, 1, wy, 2, 2); R(ctx, wc, 3, wy + 1, 2, 1);
}
function drawStitcher(ctx, f, chan) {                // 18x16 reanimator drone: skull face, needle arms, sick green core
  const y = f ? 1 : 0, eye = chan ? '#ffffff' : '#60ff70', glow = chan ? '#80ff90' : '#289040';
  blob(ctx, 9, 6.5 + y, 5.2, 4.5, ['#1e241e', '#2e382e', '#465446', '#687a68', '#94a894'], 2.3, 0.08); // necrotech carapace
  blob(ctx, 9, 6.5 + y, 3.3, 2.8, ['#8a8068', '#b8b098', '#ded6c0', '#f4efe0'], 2.2, 0.12); // embedded skull
  R(ctx, '#140808', 7, 5 + y, 1, 2); R(ctx, '#140808', 10, 5 + y, 1, 2); R(ctx, '#140808', 7, 8 + y, 4, 1);
  R(ctx, eye, 7, 5 + y, 1, 1); R(ctx, eye, 10, 5 + y, 1, 1);
  const ay = chan ? 7 + y : 5 + y;                                                          // articulated needle arms
  R(ctx, '#6a7480', 1, 5 + y, 3, 2); R(ctx, '#d8e4f0', 0, ay, 2, 4); R(ctx, eye, 0, ay + 3, 1, 1);
  R(ctx, '#6a7480', 14, 5 + y, 3, 2); R(ctx, '#d8e4f0', 16, ay, 2, 4); R(ctx, eye, 17, ay + 3, 1, 1);
  R(ctx, '#1e241e', 6, 11 + y, 6, 2); R(ctx, glow, 7, 12 + y, 4, 1); R(ctx, eye, 8, 13 + y, 2, 2);
}
function drawWyrmHead(ctx, open) {                   // 28x26 slag wyrm head, faces right: plated skull, magma maw
  blob(ctx, 12, 13, 11, 10, WRM, 2.4, 0.08);
  R(ctx, '#d08a6a', 4, 4, 4, 2); R(ctx, '#d08a6a', 9, 3, 5, 2);                             // dorsal horn ridges
  R(ctx, '#ff8a20', 3, 11, 1, 5); R(ctx, '#c84008', 6, 9, 1, 9); R(ctx, '#ff8a20', 9, 7, 1, 13); R(ctx, '#ffe080', 9, 11, 1, 4); // glowing magma seams
  const jx = 18;
  if (open) {
    for (let y = 6; y < 21; y++) for (let x = jx; x < 28; x++) { const d = Math.hypot((x - jx) / 9.5, (y - 13.5) / 6.5); if (d < 1 && x > jx + 1) R(ctx, d < 0.45 ? '#fff6d0' : d < 0.75 ? '#ffa030' : '#7a2008', x, y); }
    for (let x = jx + 2; x < 27; x += 2) { R(ctx, '#f0ead8', x, 6, 1, 3); R(ctx, '#f0ead8', x, 18, 1, 3); }
  } else {
    R(ctx, '#2e1618', jx, 13, 9, 1); for (let x = jx + 1; x < 27; x += 2) R(ctx, '#f0ead8', x, 11, 1, 4);
  }
  R(ctx, '#ff6a10', 12, 6, 4, 3); R(ctx, '#ffd040', 13, 7, 2, 2); R(ctx, '#ffffff', 14, 7, 1, 1);
}
function drawWyrmSeg(ctx, f) {                       // 20x20 wyrm body segment: plated ring round a magma core
  blob(ctx, 10, 10, 8.5, 8.5, WRM, 2.2, 0.05);
  R(ctx, f ? '#ffa030' : '#ff6a10', 8, 3, 4, 14); R(ctx, f ? '#fff0a0' : '#ffb840', 9, 4, 2, 12);
  R(ctx, '#2e1618', 7, 3, 1, 14); R(ctx, '#2e1618', 12, 3, 1, 14);
  for (const yy of [4, 10, 15]) { R(ctx, '#d08a6a', 3, yy, 3, 1); R(ctx, '#d08a6a', 14, yy, 3, 1); }
}
// ---- furnace round: new enemies --------------------------------------------------
function drawBuzzsaw(ctx) {                          // 16x16 ricocheting saw drone: toothed ring round a red eye
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const dx = x + 0.5 - 8, dy = y + 0.5 - 8, d = Math.hypot(dx, dy), ang = Math.atan2(dy, dx), tooth = Math.sin(ang * 10 + d * 0.35) > 0.05;
    if (d < 2.3) R(ctx, d < 1.2 ? '#ffffff' : '#ff3020', x, y);
    else if (d < 3.8) R(ctx, '#1e2228', x, y);
    else if (d < 5.7) R(ctx, dx + dy < 0 ? '#d8e0e8' : '#7f8a99', x, y);
    else if (d < 7.4 && tooth) R(ctx, d > 6.4 ? '#ffffff' : '#b8c2d0', x, y);
  }
}
function drawMagnet(ctx, hot) {                      // 18x18 magnetron: horseshoe magnet drone, red and blue poles
  blob(ctx, 9, 5.5, 5, 3.8, IRN, 2.4, 0.1);                                                 // flux housing
  R(ctx, hot ? '#ffffff' : '#6ad0ff', 7, 4, 4, 3); R(ctx, '#ffffff', 8, 4, 2, 1);           // glowing core
  limb(ctx, 4.2, 8, 4.2, 15, 1.8, 1.8, IRN, 0.05, true);                                    // left arm
  limb(ctx, 13.8, 8, 13.8, 15, 1.8, 1.8, IRN, -0.05, true);                                 // right arm
  R(ctx, '#c87a30', 3, 10, 3, 2); R(ctx, '#c87a30', 12, 10, 3, 2);                          // copper coils
  R(ctx, hot ? '#ffb0a0' : '#e02a1a', 3, 13, 3, 4); R(ctx, hot ? '#b0d0ff' : '#2a6ae0', 12, 13, 3, 4); // N/S poles
  R(ctx, '#ffffff', 4, 15, 1, 1); R(ctx, '#ffffff', 13, 15, 1, 1);
  if (hot) { R(ctx, '#9ae8ff', 6, 15, 2, 1); R(ctx, '#9ae8ff', 10, 15, 2, 1); R(ctx, '#ffffff', 8, 16, 2, 1); } // arc between poles
  R(ctx, '#8a94a0', 1, 4, 3, 2); R(ctx, '#8a94a0', 14, 4, 3, 2);
}
const TS2 = { k: '#0c0a08', d: '#1c1814', a: '#2c2620', b: '#423a30', c: '#5e5444', mask: '#3a3f47', lens: '#b0ff40', tank: '#1a1410', tankL: '#4a3c30', tar: '#0a0806' };
const TSLEG = { a: TS2.a, b: TS2.b, c: TS2.c, d: TS2.d, k: TS2.k };
function drawTarspit(ctx, by, front, back, pose) {   // 18x24 tar spitter: rubber suit, tar tank, a sprayer nozzle
  drawPLeg(ctx, 7, 15 + by, back[0], back[1], true, TSLEG);
  drawPLeg(ctx, 10, 15 + by, front[0], front[1], false, TSLEG);
  const u = (col, x, y, w, h) => R(ctx, col, x + 1, y + by, w, h);
  u(TS2.tank, 0, 6, 4, 9); u(TS2.tankL, 0, 6, 1, 9); u('#e8b422', 0, 10, 4, 1);             // tar boiler tank
  u(TS2.tar, 1, 15, 2, 2); u('#6a5640', 0, 7, 2, 1);
  u(TS2.b, 5, 1, 6, 1); u(TS2.b, 4, 2, 8, 4); u(TS2.c, 5, 2, 5, 1); u('#7e705c', 6, 1, 2, 1); // rubber hood
  u(TS2.mask, 7, 4, 5, 3); u('#5a636e', 7, 4, 4, 1);
  u(TS2.lens, 8, 5, 1, 1); u('#e8ffc0', 8, 5, 1, 1); u(TS2.lens, 10, 5, 1, 1); u(TS2.k, 6, 7, 4, 1);
  u(TS2.c, 3, 8, 10, 1); u(TS2.b, 3, 9, 10, 2); u(TS2.b, 4, 11, 8, 3); u(TS2.a, 4, 13, 8, 1);
  u(TS2.tar, 6, 11, 3, 2); u(TS2.k, 4, 14, 8, 1); u('#e8b422', 8, 14, 2, 1);                // tar-splattered apron
  if (pose === 'crouch') { u(TS2.b, 10, 6, 3, 2); u('#3a3f47', 12, 4, 3, 3); u('#b0ff40', 13, 4, 1, 1); }
  else if (pose === 'lunge') { u(TS2.b, 11, 9, 4, 2); u('#3a3f47', 14, 8, 3, 2); u(TS2.tar, 16, 8, 2, 3); }
  else { u(TS2.b, 11, 10, 2, 3); u('#3a3f47', 12, 11, 4, 2); u(TS2.tar, 15, 12, 1, 2); }
}
// ---- shockworks round: new enemies ---------------------------------------------------
function pxLine(ctx, col, x0, y0, x1, y1, w = 1) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; for (let i = 0; i <= n; i++) R(ctx, col, Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), w, w); }
function drawMimic(ctx, mode, step) {                // 14x18 mimic: an explosive drum until you get close
  const B = oy => {
    for (let y = 1; y < 13; y++) for (let x = 2; x < 12; x++) {
      const nx = (x - 6.5) / 5;
      R(ctx, nx < -0.35 ? '#d04030' : nx < 0.25 ? '#a02018' : nx < 0.65 ? '#701210' : '#480a0a', x, y + oy);
    }
    R(ctx, '#ff8068', 3, 1 + oy, 2, 11); R(ctx, '#e05038', 2, 1 + oy, 10, 1); R(ctx, '#400808', 2, 12 + oy, 10, 1);
    R(ctx, '#2a2e35', 1, 4 + oy, 12, 1); R(ctx, '#5a636e', 2, 4 + oy, 5, 1);
    R(ctx, '#2a2e35', 1, 9 + oy, 12, 1); R(ctx, '#5a636e', 2, 9 + oy, 5, 1);
    for (let i = 0; i < 10; i++) R(ctx, (i >> 1) % 2 ? '#15161a' : '#e8b422', 2 + i, 6 + oy, 1, 2);
  };
  if (mode === 'h') { B(4); R(ctx, '#ff9080', 4, 5, 3, 1); R(ctx, '#8a94a0', 9, 4, 2, 1); return; }
  const oy = step ? 1 : 2, open = mode === 'bite' ? 4 : 2, a = step ? 1 : -1;
  for (const [x, d] of [[3, -a], [5, a], [8, -a], [10, a]]) {
    const kx = x + d, fx = x + d + (x < 7 ? -1 : 1);
    pxLine(ctx, '#4a1414', x, 13 + oy, kx, 15, 1);
    pxLine(ctx, '#2a0808', kx, 15, fx, 17, 1);
    R(ctx, '#d8d0b8', fx, 17, 1, 1);
  }
  B(oy);
  R(ctx, '#1e0406', 2, oy + 1, 10, 4); R(ctx, '#4a0810', 3, oy + 2, 8, 2);                // deep maw where the lid was
  R(ctx, '#701210', 1, Math.max(0, oy - open), 12, 2); R(ctx, '#d04030', 1, Math.max(0, oy - open), 12, 1); R(ctx, '#ff8068', 3, Math.max(0, oy - open), 4, 1); // hinged lid
  for (let i = 0; i < 5; i++) {
    R(ctx, '#f0e8d0', 2 + i * 2, oy + 1, 1, 2); R(ctx, '#b8a888', 2 + i * 2, oy + 1, 1, 1);
    R(ctx, '#f0e8d0', 3 + i * 2, Math.max(0, oy - open + 2), 1, 2);
  }
  R(ctx, '#ff3050', 5, oy + 3, 5, 1); R(ctx, '#ff8090', 7, oy + 2, 3, 1); if (mode === 'bite') R(ctx, '#ff3050', 10, oy + 1, 2, 1); // lashing tongue
  R(ctx, '#ffe040', 3, oy + 5, 2, 1); R(ctx, '#ff3020', 4, oy + 5, 1, 1);
  R(ctx, '#ffe040', 9, oy + 5, 2, 1); R(ctx, '#ff3020', 10, oy + 5, 1, 1);
}
function drawHowitzer(ctx, frame) {                  // 26x22 artillery tripod: a mortar on three stilts
  const plant = frame === 'plant' || frame === 'fire', s = frame === 'w1' ? 1 : 0, by = plant ? 2 : s ? -1 : 0;
  const L = '#3a3f47', Ld = '#22262c', M = '#5a636e', H = '#8a94a0', A = '#e8b422';
  // Rear & side articulated hydraulic tripod legs
  const lx = plant ? 1 : 3 + s, rx = plant ? 23 : 21 - s, mx = 12 + (plant ? 0 : s ? 1 : -1);
  limb(ctx, 9, 13 + by, lx + 1, 20, 1.5, 1.1, IRN, -0.35);
  limb(ctx, 16, 13 + by, rx + 1, 20, 1.5, 1.1, IRN, -0.1);
  limb(ctx, 12, 14 + by, mx + 1, 20, 1.4, 1.0, IRN, 0.15);
  R(ctx, Ld, plant ? 0 : 2 + s, 20, 4, 2); R(ctx, M, plant ? 0 : 2 + s, 20, 4, 1);
  R(ctx, Ld, plant ? 22 : 20 - s, 20, 4, 2); R(ctx, M, plant ? 22 : 20 - s, 20, 4, 1);
  R(ctx, Ld, mx - 1, 20, 4, 2); R(ctx, H, mx, 20, 2, 1);
  // Brass elevation arc & armored turret carriage
  R(ctx, '#8a6a18', 14, 5 + by, 4, 4); R(ctx, A, 15, 5 + by, 2, 3);
  blob(ctx, 12.5, 10 + by, 6.8, 4.2, IRN);
  R(ctx, H, 7, 6 + by, 7, 1); R(ctx, Ld, 6, 13 + by, 13, 1);
  R(ctx, '#140808', 7, 8 + by, 4, 3); R(ctx, '#ff3020', 8, 9 + by, 2, 2); R(ctx, '#ffffff', 8, 9 + by, 1, 1); // targeting optic
  for (let i = 0; i < 5; i++) R(ctx, i % 2 ? '#15161a' : A, 12 + i, 11 + by, 1, 2);       // hazard stripe
  const rc = frame === 'fire' ? 2 : 0;
  // Recoiling heavy mortar tube + muzzle collar
  limb(ctx, 14 - rc, 9 + by, 22 - rc, 2 + by, 2.3, 2.0, IRN, 0.25);
  R(ctx, H, 21 - rc, 1 + by, 3, 2); R(ctx, Ld, 22 - rc, 2 + by, 2, 2);
  if (frame === 'fire') { R(ctx, '#ff7a18', 21, 0, 4, 3); R(ctx, '#ffe46a', 22, 0, 3, 2); R(ctx, '#ffffff', 23, 0, 2, 1); }
}
function drawBlinker(ctx, frame) {                   // 16x20 phase striker: a hooded violet wraith with a blade arm
  const dash = frame === 'dash', t = frame === 'b1' ? 1 : 0, by = dash ? 1 : t ? -1 : 0;
  const C = '#3a1a5a', Cd = '#1e0c34', Cl = '#6a3aa0', Ch = '#b080ff', K = '#0a0612', E = '#60f0ff', Bl = '#d8f4ff';
  const VIO = [Cd, C, Cl, Ch];
  if (dash) { R(ctx, Cd, 0, 5, 3, 8); R(ctx, Cl, 1, 7, 2, 4); R(ctx, E, 2, 6, 2, 1); }    // phase afterimage trail
  // Tattered astral cloak tail
  R(ctx, Cd, 3 - (dash ? 2 : 0), 14 + by, 8, 3);
  R(ctx, C, 4 + t - (dash ? 2 : 0), 16 + by, 3, 3); R(ctx, Cd, 3 + t, 18 + by, 2, 2);
  R(ctx, C, 8 - t, 16 + by, 3, 3); R(ctx, Cl, 9 - t, 17 + by, 2, 2);
  // Volumetric torso & cowl
  blob(ctx, 8, 12 + by, 4.2, 3.5, VIO);
  R(ctx, E, 7, 11 + by, 2, 2); R(ctx, '#ffffff', 7, 11 + by, 1, 1);                       // phase core crystal
  blob(ctx, 8, 5.5 + by, 4.2, 4.0, VIO);
  R(ctx, Ch, 5, 2 + by, 4, 1);
  R(ctx, K, 7, 5 + by, 4, 3); R(ctx, E, 8, 6 + by, 3, 1); R(ctx, '#ffffff', 10, 6 + by, 1, 1); // glowing eye slit
  if (dash) {
    R(ctx, Cl, 10, 9 + by, 3, 2);
    R(ctx, '#60c8ff', 12, 7 + by, 4, 3); R(ctx, Bl, 13, 8 + by, 3, 1); R(ctx, '#ffffff', 14, 7 + by, 2, 1); // phase blade thrust
  } else {
    R(ctx, Cl, 11, 9 + by, 2, 3);
    R(ctx, '#60c8ff', 12, 12 + by, 2, 5); R(ctx, Bl, 12, 12 + by, 1, 5); R(ctx, '#ffffff', 13, 16 + by, 1, 2);
  }
}
// ---- slagforge round: new enemies -----------------------------------------------------
function drawGasbag(ctx, frame) {                    // 18x20 gasbag: a swollen, veined sac with a valve and two tendrils
  const sw = frame === 'swell', t = frame === 'g1' ? 1 : 0, by = t && !sw ? -1 : 0;
  const RAMP = sw ? ['#5a3810', '#9a6818', '#d8a830', '#fff090'] : ['#2e4414', '#5a7a28', '#9ab040', '#e8ff90'];
  const V = sw ? '#ff3818' : '#3a5018', Vh = sw ? '#ff9040' : '#6a8a30';
  blob(ctx, 9, 8 + by, sw ? 8.4 : 7.8, sw ? 7.2 : 6.7, RAMP);
  R(ctx, '#ffffff', 5, 3 + by, 2, 1); R(ctx, RAMP[3], 4, 4 + by, 2, 2);                   // wet membrane sheen
  // Branching pulsing veins across the gas sac
  pxLine(ctx, V, 9, 2 + by, 10, 8 + by, 1); pxLine(ctx, V, 10, 6 + by, 13, 9 + by, 1);
  pxLine(ctx, V, 5, 7 + by, 9, 9 + by, 1); pxLine(ctx, V, 6, 9 + by, 5, 12 + by, 1);
  R(ctx, Vh, 9, 5 + by, 1, 2); R(ctx, Vh, 12, 9 + by, 1, 2);
  // Corroded iron valve collar & gauge
  R(ctx, '#22262c', 6, 14 + by, 6, 3); R(ctx, '#5a636e', 7, 14 + by, 4, 2); R(ctx, '#8a94a0', 7, 14 + by, 2, 1);
  R(ctx, sw ? '#ff3020' : '#7aff3a', 9, 15 + by, 1, 1);
  // Writhing tendrils
  pxLine(ctx, '#5a3a28', 7, 17 + by, 6 - t, 19, 1); R(ctx, '#8a5a40', 7, 17 + by, 1, 1);
  pxLine(ctx, '#3a2418', 9, 17 + by, 9 + (t ? 1 : -1), 19, 1);
  pxLine(ctx, '#5a3a28', 11, 17 + by, 12 + t, 19, 1); R(ctx, '#8a5a40', 11, 17 + by, 1, 1);
}
function drawWelder(ctx, frame) {                    // 18x20 welder bot: a squat yellow mech with a torch arm and a visor
  const s = frame === 'w1' ? 1 : 0, wd = frame === 'weld', by = s ? -1 : 0;
  const K = '#1a1e24', M = '#5a636e', H = '#8a94a0';
  // Pressurized twin gas cylinders on back
  R(ctx, '#7a2018', 0, 7 + by, 3, 7); R(ctx, '#c03828', 1, 7 + by, 1, 6); R(ctx, H, 1, 6 + by, 2, 1);
  // Articulated legs + magnetic boots
  R(ctx, K, 4 + s, 15 + by, 3, 4); R(ctx, M, 5 + s, 16 + by, 1, 2); R(ctx, '#3a3f47', 3 + s, 19, 5, 1);
  R(ctx, K, 11 - s, 15 + by, 3, 4); R(ctx, M, 12 - s, 16 + by, 1, 2); R(ctx, '#3a3f47', 10 - s, 19, 5, 1);
  // Volumetric yellow industrial chassis
  blob(ctx, 9, 10.5 + by, 6.2, 5.2, HAZ);
  for (let i = 0; i < 5; i++) R(ctx, i % 2 ? K : '#f2c230', 4 + i * 2, 13 + by, 2, 2);   // hazard band
  // Flip-down welding hood & visor
  blob(ctx, 10, 4.2 + by, 3.8, 2.8, IRN);
  R(ctx, K, 8, 3 + by, 6, 3); R(ctx, wd ? '#80f0ff' : '#ffd040', 9, 4 + by, 4, 1); R(ctx, '#ffffff', 11, 4 + by, 1, 1);
  // Articulated torch arm + welding arc flare
  limb(ctx, 13, 9 + by, 16, wd ? 7 + by : 10 + by, 1.4, 1.2, IRN, 0.2);
  if (wd) { R(ctx, '#60e0ff', 15, 5 + by, 3, 3); R(ctx, '#ffffff', 16, 6 + by, 2, 2); R(ctx, '#ffe060', 17, 4 + by, 1, 1); }
  else { R(ctx, '#ff8a20', 17, 11 + by, 1, 1); }
}
function drawTurret(ctx) {                           // 14x10 mini turret: a dome on a tripod base (the barrel is drawn live)
  R(ctx, '#1a1e24', 0, 8, 14, 2); R(ctx, '#3a3f47', 1, 7, 12, 2); R(ctx, '#8a94a0', 2, 8, 2, 1); R(ctx, '#8a94a0', 10, 8, 2, 1); // splayed tripod
  R(ctx, '#4a3820', 1, 4, 3, 3); R(ctx, '#c8a040', 2, 5, 1, 2);                           // side ammo box
  blob(ctx, 7.5, 5.2, 4.5, 3.2, IRN);                                                     // armored dome
  R(ctx, '#8a94a0', 6, 1, 2, 1);                                                          // sensor fin
  R(ctx, '#2a0808', 6, 4, 4, 3); R(ctx, '#ff3020', 7, 5, 2, 2); R(ctx, '#ffb0a0', 7, 5, 1, 1); // red optic
}
const DU = { k: '#0c0608', d: '#3a0c18', a: '#6a1428', b: '#9a2038', c: '#d84864', mask: '#ece4dc', eye: '#ff2a5a', blade: '#e4f0fc' };
const DULEG = { a: '#2a2028', b: '#3a3040', c: '#524658', d: '#1a141a', k: '#0c080c' };
function drawDuelist(ctx, by, front, back, pose) {   // 18x24 duelist: a crimson-coated fencer in a white mask with a long blade
  drawPLeg(ctx, 7, 15 + by, back[0], back[1], true, DULEG);
  drawPLeg(ctx, 10, 15 + by, front[0], front[1], false, DULEG);
  const u = (col, x, y, w, h) => R(ctx, col, x + 1, y + by, w, h);
  const sw = front[0] > 0 ? -1 : front[0] < 0 ? 1 : 0;
  // Flowing crimson cape & coat tail
  u(DU.d, 1 + sw, 9, 3, 9); u(DU.a, 2 + sw, 10, 3, 7); u(DU.b, 2 + sw, 10, 2, 4);
  // Porcelain fencer mask + crimson plume
  u(DU.b, 3, 0, 3, 2); u(DU.c, 4, 0, 2, 1);                                               // feather plume
  u(DU.d, 5, 1, 6, 6); u(DU.mask, 6, 1, 5, 6); u('#ffffff', 7, 1, 3, 2);
  u(DU.k, 7, 3, 4, 1); u(DU.eye, 9, 3, 2, 1); u('#ffa0b8', 10, 3, 1, 1);
  // Crimson tailcoat + gold epaulette & baldric
  u(DU.a, 4, 7, 8, 7); u(DU.b, 4, 7, 7, 6); u(DU.c, 5, 7, 3, 2);
  u('#e8b422', 4, 7, 2, 2); u('#e8b422', 6, 9, 1, 1); u('#e8b422', 8, 11, 1, 1);          // gold epaulette & buttons
  u(DU.k, 4, 13, 8, 2); u('#e8b422', 8, 13, 2, 1);                                        // belt & buckle
  // Rapier with ornate gold cup-hilt
  if (pose === 'crouch') {
    u(DU.b, 10, 8, 3, 2); u('#e8b422', 11, 7, 3, 2); u(DU.blade, 12, 0, 1, 7); u('#ffffff', 12, 0, 1, 3);
  } else if (pose === 'lunge') {
    u(DU.b, 11, 9, 4, 2); u('#e8b422', 14, 8, 2, 3); u(DU.blade, 15, 9, 2, 1); u('#ffffff', 16, 8, 1, 2);
  } else {
    u(DU.b, 11, 9, 2, 3); u('#e8b422', 11, 11, 3, 2); u(DU.blade, 12, 13, 1, 5); u('#ffffff', 13, 16, 1, 2);
  }
}
// ---- ironclad round: new enemies --------------------------------------------------------
function drawCreeper(ctx, frame) {                   // 16x10 creeper: a pale ceiling spider with a glowing green eye
  const t = frame === 'c1' ? 1 : 0, dr = frame === 'drop';
  const CR = ['#22221a', '#3a3a30', '#6a6a5a', '#a8a890'];
  // 8 articulated arachnid legs
  for (const [x, i] of [[3, 0], [5, 1], [9, 2], [11, 3]]) {
    const up = (i + t) % 2, dir = x < 7 ? -1 : 1;
    const ky = dr ? 3 : 4 - up, fy = dr ? 7 : 9 - up;
    pxLine(ctx, '#3a3a30', x, 5, x + dir * 2, ky, 1);
    pxLine(ctx, '#22221a', x + dir * 2, ky, x + dir * 3, fy, 1);
    R(ctx, '#d8d8c0', x + dir * 3, fy, 1, 1);
  }
  blob(ctx, 6.5, 4.2, 4.2, 2.8, CR);                                                      // segmented abdomen
  R(ctx, '#d0d0b8', 5, 2, 3, 1); R(ctx, '#22221a', 6, 3, 1, 1);                           // pale skull marking
  blob(ctx, 11.5, 4.5, 2.8, 2.2, CR);                                                     // cephalothorax
  R(ctx, '#5aff20', 12, 3, 2, 2); R(ctx, '#e0ff90', 13, 4, 1, 1); R(ctx, '#5aff20', 11, 4, 1, 1); // cluster of green eyes
  R(ctx, '#f0f0d0', 14, 5, 1, 2); R(ctx, '#9aff40', 14, 7, 1, 1);                         // venom-dripping fang
}
function drawRoller(ctx, frame) {                    // 18x18 roller: an armour-plated grub that curls into a ball
  const P = '#5a636e', Ph = '#9aa4b0', Pd = '#22262c', F = '#a05a40', Fd = '#6a3020', Fl = '#d08060';
  if (frame === 'ball') {
    blob(ctx, 9, 9, 7.8, 7.8, IRN);
    for (let k = 0; k < 4; k++) pxLine(ctx, Pd, 9, 9, Math.round(9 + Math.cos(k * 0.8 + 0.3) * 7), Math.round(9 + Math.sin(k * 0.8 + 0.3) * 7));
    R(ctx, Ph, 5, 3, 5, 1); R(ctx, '#ffffff', 6, 3, 2, 1); R(ctx, Ph, 4, 4, 1, 3);
    R(ctx, '#ff6a18', 11, 9, 2, 2); R(ctx, '#ffe060', 12, 10, 1, 1);                      // glowing curled core
    return;
  }
  const s = frame === 'r1' ? 1 : 0, by = s ? -1 : 0;
  // Soft segmented grub underbelly
  R(ctx, Fd, 2, 12, 14, 4); R(ctx, F, 3, 12, 12, 3); R(ctx, Fl, 4, 13, 10, 1);
  // Overlapping curved carapace plates
  for (let i = 0; i < 4; i++) {
    const px = 2 + i * 3, py = 6 + (i % 2 ? by : 0);
    blob(ctx, px + 2, py + 3, 2.4, 3.6, IRN);
    R(ctx, Ph, px + 1, py, 2, 1); R(ctx, Pd, px + 3, py + 1, 1, 5);
  }
  // Armored head shield + mandibles + glowing eye
  blob(ctx, 15, 10.5, 2.4, 2.6, IRN);
  R(ctx, '#ff6a18', 15, 9, 2, 2); R(ctx, '#ffe060', 16, 10, 1, 1);
  R(ctx, '#d8d0b8', 17, 12, 1, 1);
  for (let i = 0; i < 5; i++) { const ly = (i + s) % 2; R(ctx, Fd, 3 + i * 2.5 | 0, 15 + ly, 1, 2); R(ctx, '#d8d0b8', 3 + i * 2.5 | 0, 17, 1, 1); }
}
function drawJammer(ctx, frame) {                    // 16x14 jammer: a flying dish with an antenna array
  const hot = frame === 'jh', C = hot ? '#ffffff' : '#60ff9a', Cm = hot ? '#60ff9a' : '#289050';
  // 3 dipole antenna masts + interference arcs
  for (const [x, h] of [[4, 4], [8, 5], [12, 4]]) {
    R(ctx, '#5a636e', x, 5 - h, 1, h); R(ctx, '#8a94a0', x, 6 - h, 1, 1);
    R(ctx, C, x, 4 - h, 1, 2);
  }
  if (hot) { R(ctx, '#60ff9a', 5, 1, 2, 1); R(ctx, '#60ff9a', 9, 1, 2, 1); }              // arc bridge between antennae
  // Parabolic dish hull
  blob(ctx, 8, 7.2, 6.4, 2.6, IRN);
  R(ctx, '#a0aab6', 4, 5, 6, 1); R(ctx, '#22262c', 2, 8, 12, 1);
  // Ventral ECM emitter core
  R(ctx, '#22262c', 5, 9, 6, 4); R(ctx, '#3a3f47', 6, 9, 4, 3);
  R(ctx, Cm, 6, 10, 4, 2); R(ctx, C, 7, 10, 2, 2);
}
// ---- sorting line round: new enemies ----------------------------------------------------
function drawClaw(ctx, frame) {                      // 16x12 crane claw: a hub and three hooked fingers
  const open = frame === 'open';
  R(ctx, '#8a94a0', 7, 0, 2, 1);                                                          // cable link
  blob(ctx, 8, 2.2, 3.6, 2.2, IRN);                                                       // gantry hub
  R(ctx, '#e8b422', 5, 1, 1, 2); R(ctx, '#e8b422', 10, 1, 1, 2);                          // hazard stripes
  R(ctx, '#ff3020', 7, 2, 2, 2); R(ctx, '#ffb0a0', 7, 2, 1, 1);                           // optic sensor
  if (open) {
    limb(ctx, 5, 4, 1, 9, 1.3, 1.0, IRN, -0.3); R(ctx, '#e8eef4', 1, 9, 2, 2);
    limb(ctx, 10, 4, 14, 9, 1.3, 1.0, IRN, 0.3); R(ctx, '#e8eef4', 13, 9, 2, 2);
    limb(ctx, 8, 4, 8, 10, 1.2, 0.9, IRN, 0.0); R(ctx, '#e8eef4', 7, 10, 2, 1);
  } else {
    limb(ctx, 5, 4, 4, 10, 1.3, 1.0, IRN, -0.3); R(ctx, '#e8eef4', 5, 10, 2, 2);
    limb(ctx, 10, 4, 11, 10, 1.3, 1.0, IRN, 0.3); R(ctx, '#e8eef4', 9, 10, 2, 2);
    limb(ctx, 8, 4, 8, 11, 1.2, 0.9, IRN, 0.0);
  }
}
function drawSparker(ctx, frame) {                   // 12x12 sparker: a little hopping capacitor with a crackling top
  const air = frame === 's1', by = air ? -1 : 0;
  // Twin porcelain electrodes + crackling arc
  R(ctx, '#8a94a0', 3, 2 + by, 2, 2); R(ctx, '#8a94a0', 7, 2 + by, 2, 2);
  R(ctx, '#60e0ff', 4, 0, 1, 3 + by); R(ctx, '#60e0ff', 7, 0, 1, 3 + by);
  R(ctx, '#ffffff', 4, 0, 4, 1); if (air) R(ctx, '#60e0ff', 5, 1, 2, 1);
  // Capacitor drum + copper coils
  blob(ctx, 6, 7 + by, 4.2, 3.6, IRN);
  R(ctx, '#c87a30', 2, 5 + by, 8, 1); R(ctx, '#ffb060', 3, 5 + by, 3, 1);
  R(ctx, '#c87a30', 2, 8 + by, 8, 1); R(ctx, '#ffb060', 3, 8 + by, 3, 1);
  R(ctx, '#14222e', 4, 6 + by, 4, 2); R(ctx, '#60e0ff', 5, 6 + by, 2, 2); R(ctx, '#ffffff', 5, 6 + by, 1, 1); // plasma window
  R(ctx, '#22262c', 2, air ? 10 : 11, 3, 1); R(ctx, '#22262c', 7, air ? 10 : 11, 3, 1);
}
function drawGolem(ctx, frame) {                     // 28x30 scrap golem: junk plates, a furnace heart, fists like engine blocks
  const s = frame === 'g1' ? 1 : 0, th = frame === 'throw', sl = frame === 'slam', by = sl ? 2 : s ? -1 : 0;
  // Heavy piston-and-girder legs
  limb(ctx, 10, 20 + by, 9 - s, 28, 2.4, 2.2, IRN, -0.2); R(ctx, '#1a1e24', 6 - s, 28, 6, 2); R(ctx, '#5a636e', 7 - s, 28, 4, 1);
  limb(ctx, 17, 20 + by, 18 + s, 28, 2.4, 2.2, IRN, 0.2); R(ctx, '#1a1e24', 15 + s, 28, 6, 2); R(ctx, '#5a636e', 16 + s, 28, 4, 1);
  // Volumetric scrap-iron and rusted-plate torso
  blob(ctx, 14, 14.5 + by, 9.2, 7.5, IRN);
  blob(ctx, 9.5, 11.5 + by, 4.2, 3.2, RST);
  blob(ctx, 18.5, 16.5 + by, 4.0, 3.2, RST);
  R(ctx, '#a0aab6', 12, 8 + by, 8, 1);
  // Roaring furnace heart behind iron grate
  R(ctx, '#140804', 10, 11 + by, 8, 7);
  R(ctx, '#c84008', 11, 12 + by, 6, 5); R(ctx, '#ff8a20', 12, 13 + by, 4, 3); R(ctx, '#ffe46a', 13, 13 + by, 2, 2); R(ctx, '#ffffff', 13, 14 + by, 1, 1);
  R(ctx, '#2a2e35', 12, 11 + by, 1, 7); R(ctx, '#2a2e35', 15, 11 + by, 1, 7);            // furnace grate bars
  // Welded boiler head + jaw grate + furnace eyes
  blob(ctx, 14.5, 5 + by, 4.8, 3.8, IRN);
  R(ctx, '#140804', 11, 3 + by, 8, 2); R(ctx, '#ffe040', 12, 3 + by, 2, 2); R(ctx, '#ffe040', 16, 3 + by, 2, 2); R(ctx, '#ffffff', 12, 3 + by, 1, 1);
  for (let x = 11; x <= 17; x += 2) R(ctx, '#22262c', x, 6 + by, 1, 2);                   // jaw grate
  // Engine-block arms & fists
  if (sl) {
    limb(ctx, 5, 11 + by, 3, 21, 2.2, 2.8, IRN, -0.3); blob(ctx, 3.5, 23, 3.2, 3.5, RST);
    limb(ctx, 22, 11 + by, 24, 21, 2.2, 2.8, IRN, 0.3); blob(ctx, 24.5, 23, 3.2, 3.5, RST);
  } else if (th) {
    limb(ctx, 5, 11 + by, 3, 15 + by, 2.2, 2.4, IRN, -0.3);
    limb(ctx, 22, 10 + by, 24, 3, 2.2, 2.6, IRN, 0.3);
    blob(ctx, 24.5, 3.5, 3.5, 3.5, RST); R(ctx, '#ffb040', 23, 2, 2, 2);                  // molten scrap boulder held overhead
  } else {
    limb(ctx, 5, 10 + by, 3, 19 + by, 2.2, 2.6, IRN, -0.3); blob(ctx, 3, 20 + by, 2.8, 2.8, RST);
    limb(ctx, 22, 10 + by, 24, 19 + by, 2.2, 2.6, IRN, 0.3); blob(ctx, 24.5, 20 + by, 2.8, 2.8, RST);
  }
}
// ---- overtime round: new enemies ---------------------------------------------------------
function drawPilferer(ctx, frame) {                  // 14x10 pilferer: a rat-shaped thief drone with a rotor and a long tail
  const r = frame === 'p1';
  // Whipping segmented wire tail
  pxLine(ctx, '#b86070', 3, 6, 0, r ? 5 : 8, 1); R(ctx, '#e890a0', 1, 6, 2, 1);
  // Streamlined rat-drone body + ears + snout
  blob(ctx, 7, 5.8, 4.4, 2.3, IRN);
  R(ctx, '#3a3f47', 9, 3, 2, 2); R(ctx, '#8a94a0', 10, 3, 1, 1);                          // metal ear
  R(ctx, '#5a636e', 10, 5, 3, 2); R(ctx, '#ff2a40', 11, 5, 2, 1); R(ctx, '#ffffff', 12, 5, 1, 1); // ruby eye
  R(ctx, '#ffb0b8', 13, 6, 1, 1);                                                         // nose tip
  // Coaxial rotor mast & spinning blade blur
  R(ctx, '#22262c', 6, 2, 2, 2); R(ctx, '#d8dee6', r ? 1 : 3, 1, r ? 12 : 8, 1); R(ctx, '#ffffff', 6, 1, 2, 1);
  // Grappling claws underneath
  R(ctx, '#22262c', 4, 8, 2, 2); R(ctx, '#8a94a0', 5, 9, 1, 1);
  R(ctx, '#22262c', 8, 8, 2, 2); R(ctx, '#8a94a0', 9, 9, 1, 1);
}
function drawPogo(ctx, frame) {                      // 16x18 pogo: a drum-bodied robot riding a big spring
  const c = frame === 'c', sl = frame === 'slam', top = c ? 5 : 0;
  const PGR = ['#14301e', '#265838', '#3a8a5a', '#7ce0a0'];
  // Handlebars & top cap
  R(ctx, '#5a636e', 2, top + 2, 12, 1); R(ctx, '#8a94a0', 6, top, 4, 1);
  // Volumetric emerald drum body
  blob(ctx, 8, top + 5, 5.2, 4.5, PGR);
  R(ctx, '#0a1610', 4, top + 3, 8, 3);
  R(ctx, sl ? '#ff5030' : '#60ff9a', 5, top + 4, 2, 2); R(ctx, sl ? '#ff5030' : '#60ff9a', 9, top + 4, 2, 2);
  R(ctx, '#ffffff', 6, top + 4, 1, 1); R(ctx, '#ffffff', 10, top + 4, 1, 1);
  // Helical steel spring + central shock rod
  const sy = top + 9, sh = 17 - sy;
  R(ctx, '#2a2e35', 7, sy, 2, sh);
  for (let y = 0; y < sh; y++) {
    const odd = y % 2;
    R(ctx, odd ? '#c8d0da' : '#5a636e', odd ? 4 : 5, sy + y, odd ? 8 : 6, 1);
    if (odd) R(ctx, '#ffffff', 5, sy + y, 2, 1);
  }
  R(ctx, '#22262c', 4, 17, 8, 1); R(ctx, '#8a94a0', 6, 17, 4, 1);
  if (sl) for (const x of [2, 6, 10, 13]) R(ctx, '#ffffff', x, 17, 2, 1);
}
// ---- codex round: new enemies ------------------------------------------------------------
function drawBeacon(ctx, frame) {                    // 14x16 beacon: a hovering pylon with a red lamp on top
  const on = frame === 'b1', by = on ? -1 : 0;
  blob(ctx, 7, 8.5 + by, 3.6, 4.8, IRN);
  for (let i = 0; i < 3; i++) R(ctx, i % 2 ? '#15161a' : '#e8b422', 5, 7 + i * 2 + by, 4, 1);
  // Upper strobe cage & crimson emergency lamp
  R(ctx, '#2a2e35', 3, 2 + by, 8, 2); R(ctx, '#8a94a0', 4, 2 + by, 6, 1);
  R(ctx, on ? '#ff6040' : '#a01810', 4, 0 + by, 6, 2);
  R(ctx, on ? '#ffffff' : '#ff3020', 5, 0 + by, 4, 2);
  if (on) { R(ctx, '#ff8060', 2, 0, 2, 1); R(ctx, '#ff8060', 10, 0, 2, 1); }              // strobe flare rays
  // Twin ventral ion thrusters
  R(ctx, '#2a2e35', 2, 12 + by, 3, 2); R(ctx, '#2a2e35', 9, 12 + by, 3, 2);
  R(ctx, '#60b0ff', 3, 14 + by, 1, 2); R(ctx, '#60b0ff', 10, 14 + by, 1, 2);
  R(ctx, '#ffffff', 3, 14 + by, 1, 1); R(ctx, '#ffffff', 10, 14 + by, 1, 1);
}
function drawSlug(ctx, frame) {                      // 18x10 slug: a glistening acid-green grub with eye stalks
  const s = frame === 's1' ? 1 : 0, sp = frame === 'spit';
  const SLG = ['#1e3c10', '#3a6a20', '#64a832', '#b8f070'];
  // Peristaltic segmented body
  blob(ctx, 4.5 + s, 7, 3.5, 2.5, SLG);
  blob(ctx, 8.5, 6.2 - s, 4.2, 3.2 + s * 0.5, SLG);
  blob(ctx, 13, 6.8, 3.6, 2.8, SLG);
  R(ctx, '#7aff3a', 3, 9, 12, 1);                                                         // glowing mucus trail
  R(ctx, '#7aff3a', 4, 7, 2, 2); R(ctx, '#e0ff90', 4, 7, 1, 1);                           // acid pustules
  R(ctx, '#7aff3a', 9, 6 - s, 2, 2); R(ctx, '#e0ff90', 9, 6 - s, 1, 1);
  // Flexible eye stalks
  pxLine(ctx, '#3a6a20', 12, 4, 12 - s, 1, 1); R(ctx, '#e0ff90', 12 - s, 0, 2, 2); R(ctx, '#1e3c10', 13 - s, 0, 1, 1);
  pxLine(ctx, '#3a6a20', 14, 4, 15 + s, 1, 1); R(ctx, '#e0ff90', 15 + s, 0, 2, 2); R(ctx, '#1e3c10', 16 + s, 0, 1, 1);
  if (sp) { R(ctx, '#1e3c10', 15, 5, 3, 3); R(ctx, '#7aff3a', 16, 6, 2, 2); R(ctx, '#ffffff', 17, 6, 1, 1); }
  else R(ctx, '#1a3a10', 15, 7, 2, 1);
}
function drawLeech(ctx, frame) {                     // 10x8 leech: a dark red worm with a sucker mouth
  const t = frame === 'l1' ? 1 : 0;
  const LCH = ['#2a0408', '#5a0a14', '#941c2c', '#e05868'];
  blob(ctx, 2.5, 4.5 - t, 2.0, 1.6, LCH);
  blob(ctx, 5.0, 3.5 + t, 2.4, 2.0, LCH);
  blob(ctx, 7.5, 4.2, 2.2, 2.2, LCH);
  R(ctx, '#1a0204', 8, 3, 2, 3); R(ctx, '#ff6070', 8, 4, 2, 1);                           // circular sucker maw
  R(ctx, '#f0e8d0', 9, 3, 1, 1); R(ctx, '#f0e8d0', 9, 5, 1, 1);                           // tiny lamprey teeth
}
// ---- supply round: new enemies ------------------------------------------------------------
const GR = { k: '#0c0a08', a: '#3a3a2a', b: '#5a5a3a', c: '#828256', mask: '#2a2e35', lens: '#ff8a20', nade: '#4a6428' };
const GRLEG = { a: '#2a2a1e', b: '#3a3a28', c: '#4a4a34', d: '#1a1a12', k: '#0c0c08' };
function drawGrenadier(ctx, by, front, back, pose) {  // 18x24 grenadier: olive fatigues, a gas mask and a bandolier of grenades
  drawPLeg(ctx, 7, 15 + by, back[0], back[1], true, GRLEG);
  drawPLeg(ctx, 10, 15 + by, front[0], front[1], false, GRLEG);
  const u = (col, x, y, w, h) => R(ctx, col, x + 1, y + by, w, h);
  u('#2a2a1e', 1, 7, 3, 6); u('#4a4a34', 1, 7, 2, 2);                                     // grenade pack on back
  // Helmet + snout gas mask + glowing amber lenses
  u(GR.a, 4, 1, 8, 6); u(GR.b, 4, 1, 7, 3); u(GR.c, 5, 1, 4, 1);
  u(GR.mask, 7, 4, 5, 4); u('#4b535e', 10, 6, 3, 2);                                      // filter canister snout
  u(GR.lens, 8, 4, 2, 2); u('#ffe080', 8, 4, 1, 1); u(GR.lens, 11, 4, 1, 2);
  // Heavy flak vest + pineapple grenade bandolier
  u(GR.a, 3, 7, 10, 8); u(GR.b, 3, 8, 9, 6); u(GR.c, 4, 8, 4, 1); u(GR.k, 3, 14, 10, 1);
  for (let i = 0; i < 4; i++) {
    u(GR.nade, 4 + i * 2, 9 + (i % 2), 2, 2);
    u('#d8dee6', 4 + i * 2, 8 + (i % 2), 1, 1);                                           // grenade pins
  }
  if (pose === 'crouch') { u(GR.b, 1, 4, 3, 4); u(GR.nade, 0, 2, 3, 3); u('#ffe060', 1, 1, 1, 1); } // cocked grenade back
  else if (pose === 'lunge') { u(GR.b, 11, 8, 4, 2); u(GR.nade, 14, 7, 3, 3); u('#d8dee6', 15, 6, 1, 1); }
  else { u(GR.b, 11, 10, 2, 3); u(GR.nade, 12, 12, 3, 3); u('#d8dee6', 13, 11, 1, 1); }
}
function drawSpikeball(ctx, frame) {                 // 14x14 spikeball: an iron ball bristling with spikes
  blob(ctx, 7, 7, 5.2, 5.2, IRN);
  R(ctx, '#22262c', 2, 7, 10, 1);                                                         // equatorial weld seam
  R(ctx, '#2a0808', 6, 6, 3, 3); R(ctx, '#ff3020', 6, 6, 2, 2); R(ctx, '#ffffff', 6, 6, 1, 1); // central red sensor
  const sp = frame === 'k1' ? [[7, 0], [7, 13], [0, 7], [13, 7]] : [[2, 2], [11, 2], [2, 11], [11, 11]];
  for (const [x, y] of sp) R(ctx, '#ffffff', x, y, 1, 1);
  for (const [x, y] of [[7, 1], [7, 12], [1, 7], [12, 7], [3, 3], [10, 3], [3, 10], [10, 10]]) R(ctx, '#c8d0da', x, y, 1, 1);
}
function drawPara(ctx, frame) {                      // 16x22 paratrooper: helmet, harness and a carbine
  const dr = frame === 'drop', s = frame === 'w1' ? 1 : 0, by = dr ? 0 : s ? -1 : 0;
  // Articulated legs + jump boots
  drawPLeg(ctx, 6, 14 + by, dr ? -1 : s * 2, dr ? 1 : 0, true, GRLEG);
  drawPLeg(ctx, 9, 14 + by, dr ? 1 : -s * 2, dr ? 2 : 0, false, GRLEG);
  // Airborne jumpsuit + X-pattern parachute harness
  R(ctx, '#3a4a24', 4, 8 + by, 8, 7); R(ctx, '#5a6a3a', 5, 8 + by, 6, 6);
  pxLine(ctx, '#c8b888', 4, 8 + by, 11, 13 + by, 1); pxLine(ctx, '#c8b888', 11, 8 + by, 4, 13 + by, 1); // X-straps
  R(ctx, '#2a2a1e', 4, 13 + by, 8, 2); R(ctx, '#8a94a0', 7, 13 + by, 2, 1);               // reserve pack / buckle
  // Paratrooper helmet with goggles on brow
  R(ctx, '#3a4a24', 4, 1 + by, 8, 4); R(ctx, '#5a6a3a', 5, 1 + by, 6, 3); R(ctx, '#8a9a60', 5, 1 + by, 3, 1);
  R(ctx, '#e8b422', 6, 3 + by, 2, 1); R(ctx, '#e8b422', 9, 3 + by, 2, 1);                 // goggles on helmet rim
  R(ctx, '#c89874', 6, 5 + by, 5, 3); R(ctx, '#1a1a12', 9, 6 + by, 1, 1);                 // face
  if (dr) {
    limb(ctx, 4, 8, 2, 2, 1.3, 1.1, ['#2a3a18', '#4a5a2a', '#6a7a40', '#8a9a60'], -0.2);
    limb(ctx, 11, 8, 13, 2, 1.3, 1.1, ['#2a3a18', '#4a5a2a', '#6a7a40', '#8a9a60'], 0.2);
  } else {
    R(ctx, '#5a6a3a', 10, 9 + by, 3, 2);
    R(ctx, '#1a1e24', 9, 9 + by, 7, 2); R(ctx, '#5a636e', 11, 9 + by, 4, 1); R(ctx, '#8a94a0', 14, 9 + by, 2, 1); // carbine
  }
}
// ---- mastery round: new enemies --------------------------------------------------------
function drawLugger(ctx, frame) {                    // 22x26 lugger: a hunched brute with arms like cargo cranes
  const s = frame === 'w1' ? 1 : 0, up = frame === 'carry', th = frame === 'throw', by = s ? -1 : 0;
  // Piston-braced legs
  limb(ctx, 8, 18 + by, 7 - s, 25, 2.0, 1.8, BRF, -0.2); R(ctx, '#1a1410', 5 - s, 25, 5, 1);
  limb(ctx, 14, 18 + by, 15 + s, 25, 2.0, 1.8, BRF, 0.2); R(ctx, '#1a1410', 12 + s, 25, 5, 1);
  // Hunched muscular torso + yellow exo-rig harness
  blob(ctx, 11, 12.5 + by, 7.2, 6.2, BRF);
  R(ctx, '#a07810', 4, 15 + by, 14, 2); R(ctx, '#e8b422', 5, 15 + by, 12, 1); R(ctx, '#ffffff', 10, 15 + by, 2, 2); // exo-belt
  R(ctx, '#e8b422', 6, 7 + by, 2, 8); R(ctx, '#e8b422', 14, 7 + by, 2, 8);                // exo-shoulder straps
  // Scarred brute head + glowing cyber-eye
  blob(ctx, 11.5, 4.8 + by, 3.8, 3.2, BRF);
  R(ctx, '#22262c', 11, 3 + by, 4, 2); R(ctx, '#ffb040', 13, 4 + by, 2, 1); R(ctx, '#ffffff', 14, 4 + by, 1, 1);
  // Crane-loader arms
  if (up) {
    limb(ctx, 4, 9 + by, 3, 1, 2.0, 1.8, BRF, -0.2); R(ctx, '#5a636e', 2, 0, 3, 2);
    limb(ctx, 18, 9 + by, 19, 1, 2.0, 1.8, BRF, 0.2); R(ctx, '#5a636e', 17, 0, 3, 2);
  } else if (th) {
    limb(ctx, 4, 9 + by, 2, 14 + by, 1.8, 1.6, BRF, -0.2);
    limb(ctx, 17, 8 + by, 21, 5 + by, 2.2, 2.0, BRF, 0.2); R(ctx, '#8a94a0', 20, 4 + by, 2, 3);
  } else {
    limb(ctx, 4, 9 + by, 2, 19 + by, 2.0, 2.2, BRF, -0.2); R(ctx, '#3a3f47', 1, 18 + by, 4, 3);
    limb(ctx, 18, 9 + by, 19, 19 + by, 2.0, 2.2, BRF, 0.2); R(ctx, '#3a3f47', 17, 18 + by, 4, 3);
  }
}
function drawBlimp(ctx, frame) {                     // 34x20 blimp: a patched gas bag over a bomb gondola
  const p = frame === 'b1' ? 1 : 0;
  const BLM = ['#2e3024', '#4a4c3a', '#787a5c', '#b0b48a'];
  // Cruciform tail fins
  R(ctx, '#a02818', 0, 2, 5, 9); R(ctx, '#d04028', 1, 3, 3, 3);
  // Dirigible gas envelope with rib seams & canvas patch
  blob(ctx, 17.5, 6.5, 16.2, 6.2, BLM);
  for (const rx of [8, 14, 20, 26]) pxLine(ctx, '#3a3c2e', rx, 1, rx, 11, 1);             // vertical rib seams
  R(ctx, '#5a3a20', 21, 4, 5, 4); R(ctx, '#8a6038', 22, 5, 3, 2);                         // stitched patch
  // Rigging cables & armored bomb gondola
  pxLine(ctx, '#22262c', 11, 11, 12, 14, 1); pxLine(ctx, '#22262c', 23, 11, 22, 14, 1);
  blob(ctx, 17, 15.5, 6.2, 2.8, IRN);
  R(ctx, '#ff3020', 13, 15, 2, 2); R(ctx, '#ffe060', 17, 15, 2, 1); R(ctx, '#80c8ff', 20, 15, 2, 1); // gondola portholes
  // Stern pusher propeller
  R(ctx, '#22262c', 23, 15, 2, 2);
  R(ctx, '#c8d0da', 24, 13 + p, 1, 5 - p * 2); R(ctx, '#ffffff', 25, 14 + (1 - p), 1, 3);
}
function drawStrider(ctx, frame) {                   // 20x36 strider: a sensor head on two long reverse-jointed legs
  const s = frame === 'w1' ? 1 : 0, crouch = frame === 'fire', top = crouch ? 3 : s ? 1 : 0;
  // Back reverse-jointed digitigrade leg
  const bkx = 4 - s * 2, bky = 22 + (crouch ? 1 : 0);
  limb(ctx, 8, 11 + top, bkx, bky, 1.6, 1.3, IRN, -0.35);
  limb(ctx, bkx, bky, 7 - s, 34, 1.3, 1.0, IRN, -0.25);
  R(ctx, '#3a3f47', 4 - s, 34, 5, 2); R(ctx, '#8a94a0', 8 - s, 35, 2, 1);
  // Front reverse-jointed digitigrade leg
  const fkx = 15 + s * 2, fky = 22 + (crouch ? 1 : 0);
  limb(ctx, 12, 11 + top, fkx, fky, 1.7, 1.4, IRN, 0.25);
  limb(ctx, fkx, fky, 13 + s, 34, 1.4, 1.1, IRN, 0.35);
  R(ctx, '#5a636e', 10 + s, 34, 5, 2); R(ctx, '#c8d0da', 14 + s, 35, 2, 1);
  // Knee servo caps
  R(ctx, '#8a94a0', bkx - 1, bky - 1, 2, 2); R(ctx, '#c8d0da', fkx - 1, fky - 1, 2, 2);
  // Armored sensor pod head + radar mast + scanner visor
  R(ctx, '#8a94a0', 7, top, 1, 3); R(ctx, '#ff3020', 7, top, 1, 1);                       // antenna mast
  blob(ctx, 10.5, 6.5 + top, 6.5, 4.8, IRN);
  R(ctx, '#e8b422', 6, 9 + top, 6, 1);
  R(ctx, '#0a0a0c', 11, 4 + top, 6, 4); R(ctx, '#ff3020', 13, 5 + top, 3, 2); R(ctx, '#ffffff', 15, 5 + top, 1, 1);
  if (crouch) { R(ctx, '#ff8a20', 16, 9 + top, 3, 2); R(ctx, '#ffffff', 18, 9 + top, 1, 1); } // chin laser charging
}
// ---- finale round: new enemies --------------------------------------------------------
// ---- gold round: new enemies --------------------------------------------------------
function drawCinder(ctx, frame) {                    // 16x16 cinder wheel: an iron spoked wheel wrapped in flame
  const f = frame === 'w1' ? 1 : 0;
  // Roaring outer flame corona
  for (let a = 0; a < 12; a++) {
    const ang = a * Math.PI / 6 + (f ? 0.26 : 0), r = 6.8 + ((a + f) % 2) * 0.9;
    const fx = Math.round(7.5 + Math.cos(ang) * r), fy = Math.round(7.5 + Math.sin(ang) * r);
    R(ctx, (a + f) % 2 ? '#ff8a1f' : '#c83008', fx, fy, 2, 2);
  }
  // Iron wheel rim & rotating spokes
  for (let y = 1; y < 15; y++) for (let x = 1; x < 15; x++) {
    const d = Math.hypot(x + 0.5 - 8, y + 0.5 - 8);
    if (d >= 4.6 && d <= 6.6) R(ctx, d > 5.8 ? '#1a1c20' : '#4b535e', x, y);
  }
  if (f) { R(ctx, '#3a3f47', 7, 2, 2, 12); R(ctx, '#3a3f47', 2, 7, 12, 2); }
  else { pxLine(ctx, '#3a3f47', 3, 3, 12, 12, 2); pxLine(ctx, '#3a3f47', 12, 3, 3, 12, 2); }
  // White-hot molten axle hub
  blob(ctx, 8, 8, 3.2, 3.2, MLT); R(ctx, '#ffffff', 7, 7, 2, 2);
}
function drawGatling(ctx, frame) {                   // 22x24 gatling: a heavy hauling a six-barrel gun on a strap
  const s = frame === 'w1' ? 1 : 0, f = frame === 'fire' || frame === 'fire2', by = s ? -1 : 0;
  const GTL = ['#182218', '#2a382a', '#4a5e4a', '#789478'];
  // Braced heavy legs + knee pads
  limb(ctx, 7, 15 + by, 6 - s, 22, 1.8, 1.6, GTL, -0.2); R(ctx, '#141410', 4 - s, 22, 5, 2);
  limb(ctx, 12, 15 + by, 13 + s, 22, 1.8, 1.6, GTL, 0.2); R(ctx, '#141410', 11 + s, 22, 5, 2);
  // Backpack ammo drum + armored torso + draped brass ammo belt
  R(ctx, '#2a2e35', 1, 7 + by, 4, 8); R(ctx, '#5a636e', 2, 7 + by, 2, 6);
  blob(ctx, 9.5, 11 + by, 5.5, 5.0, GTL);
  for (let i = 0; i < 6; i++) R(ctx, i % 2 ? '#e8b422' : '#a07810', 4 + i * 2, 8 + (i >> 1) + by, 2, 2); // brass belt
  // Commando head + visor + cigar
  blob(ctx, 10, 3.8 + by, 3.4, 3.0, ['#6a4430', '#9a684c', '#c89070', '#e8b898']);
  R(ctx, '#2a382a', 7, 1 + by, 6, 2); R(ctx, '#141410', 10, 3 + by, 4, 1); R(ctx, '#ff5a1a', 14, 5 + by, 1, 1);
  // 6-barrel rotary gatling cannon
  R(ctx, '#22262c', 10, 10 + by, 8, 6); R(ctx, '#4b535e', 11, 10 + by, 6, 4); R(ctx, '#8a94a0', 13, 8 + by, 3, 2);
  R(ctx, '#1a1e24', 17, 9 + by, 5, 7);
  for (let i = 0; i < 3; i++) {
    const hi = (frame === 'fire2' ? i + 1 : i) % 2;
    R(ctx, hi ? '#c8d0da' : '#4b535e', 17, 10 + i * 2 + by, 4, 1);
  }
  if (f) { R(ctx, '#ff8a1f', 20, 9 + by, 2, 7); R(ctx, '#ffe46a', 21, 10 + by, 1, 5); R(ctx, '#ffffff', 21, 12 + by, 1, 1); }
}
function drawBanner(ctx, frame) {                    // 16x26 banner: a robed bearer with a tall green banner
  const s = frame === 'w1' ? 1 : 0, pl = frame === 'plant', by = pl ? 1 : s ? -1 : 0;
  const BNR = ['#122012', '#1e361e', '#3a5e3a', '#649664'];
  // Layered war-robes with gold hem trim
  blob(ctx, 6.5, 19.5, 3.8, 5.2, BNR);
  R(ctx, '#e8b422', 3, 23, 7, 1);
  R(ctx, '#122012', 3 - s, 24, 3, 2); R(ctx, '#122012', 7 + s, 24, 3, 2);
  blob(ctx, 6.5, 11.5 + by, 3.8, 4.5, BNR);
  R(ctx, '#e8b422', 4, 9 + by, 5, 1);                                                     // gold collar
  // Hooded faceplate + glowing green eyes
  blob(ctx, 6.5, 4.5 + by, 3.0, 3.2, BNR);
  R(ctx, '#22262c', 6, 3 + by, 3, 3); R(ctx, '#5cff7a', 7, 4 + by, 2, 1);
  // Iron-shod war-pole & waving neon-green standard
  const px = pl ? 11 : 10;
  R(ctx, '#5a3a20', px, 0, 1, pl ? 26 : 23); R(ctx, '#c8d0da', px, 0, 1, 2);
  R(ctx, '#1e5a2a', px + 1, 1, 5, 9); R(ctx, '#2a8a3a', px + 1, 1, 4, 8);
  R(ctx, '#5cff7a', px + 1, 1, 3, 7 - s); R(ctx, '#c8ffd8', px + 1, 1, 2, 2);
  R(ctx, '#ffffff', px + 2, 3, 2, 2); R(ctx, '#1e5a2a', px + 3, 4, 1, 1);                 // skull/chevron emblem
}
// ---- powerhouse round: new enemies --------------------------------------------------------
function drawBulldozer(ctx, frame) {                 // 26x20 bulldozer: a yellow tracked dozer behind a huge plow blade
  const s = frame === 'w1' ? 1 : 0, Y = '#e8b422', Yd = '#a07810', M = '#4b535e', Md = '#22262c';
  R(ctx, Md, 2, 14, 18, 6); for (let i = 0; i < 5; i++) R(ctx, '#5a636e', 3 + i * 4 + s, 15, 2, 4);                       // tracks
  R(ctx, Yd, 3, 6, 15, 9); R(ctx, Y, 4, 6, 13, 8); R(ctx, Md, 6, 1, 8, 6); R(ctx, '#80c8ff', 8, 2, 4, 3);                // hull, cab, window
  R(ctx, Md, 4, 2, 2, 5); R(ctx, '#3a3f47', 4, 0, 2, 2);                                                                  // exhaust stack
  R(ctx, Md, 18, 8, 3, 4); R(ctx, M, 21, 3, 4, 17); R(ctx, '#8a94a0', 22, 3, 1, 17); R(ctx, Md, 25, 4, 1, 15);           // arm + the plow blade
  for (let i = 0; i < 4; i++) R(ctx, '#15161a', 4 + i * 4, 10, 2, 1);
}
function drawCopycat(ctx, frame) {                   // 16x14 copycat: a mirror-plated drone with a lens like a gun sight
  const f = frame === 'c1' ? 1 : 0, M = '#9aa4b0', Md = '#4b535e', Ml = '#e0e8f0';
  R(ctx, Md, 2 + f, 0, 12 - f * 2, 1); R(ctx, Md, 7, 1, 2, 2);                                                            // rotor
  R(ctx, Md, 2, 3, 12, 8); R(ctx, M, 3, 3, 10, 7); R(ctx, Ml, 3, 3, 4, 1); R(ctx, Ml, 4, 5, 1, 3);                       // mirrored shell
  R(ctx, '#141618', 8, 5, 5, 4); R(ctx, '#ff3020', 10, 6, 2, 2); R(ctx, '#ff3020', 9, 7, 4, 1);                           // the sight
  R(ctx, Md, 5, 11, 6, 2);                                                                                                // the gun cradle
}
function drawJelly(ctx, frame) {                     // 16x20 jellyfish: a translucent bell pulsing with light (its tendrils are drawn live)
  const p = frame === 'j1' ? 1 : 0, B = '#c060b0', Bd = '#7a2a70', Bl = '#ffb0f0';
  R(ctx, Bd, 3 - p, 2 + p, 10 + p * 2, 7 - p); R(ctx, Bd, 2 - p, 5, 12 + p * 2, 4); R(ctx, B, 3 - p, 3 + p, 10 + p * 2, 5 - p); R(ctx, Bl, 5, 3 + p, 4, 1);   // the bell
  R(ctx, '#ffe0ff', 6, 5, 4, 2); R(ctx, Bd, 3, 9, 10, 1);                                                                  // glowing heart, rim
  for (let i = 0; i < 4; i++) R(ctx, Bd, 4 + i * 3, 10, 1, 3 + ((i + p) % 2) * 2);                                       // short frills
}
// ---- rush round: new enemies --------------------------------------------------------
function drawPorcupine(ctx, frame) {                 // 20x16 porcupine: a squat beast under a crown of steel quills
  const s = frame === 'w1' ? 1 : 0, b = frame === 'bristle', F = '#7a5a40', Fd = '#4a3020', Q = '#c8d0da', Qd = '#6a7380';
  R(ctx, Fd, 3 + s, 12, 3, 4); R(ctx, Fd, 13 - s, 12, 3, 4);                                                              // legs
  R(ctx, Fd, 2, 7, 15, 7); R(ctx, F, 3, 8, 13, 5);                                                                        // body
  R(ctx, Fd, 15, 8, 5, 5); R(ctx, F, 16, 9, 3, 3); R(ctx, '#140c08', 18, 9, 1, 1); R(ctx, '#e8e8d0', 19, 11, 1, 1);      // snout
  const L = b ? 5 : 3; for (let i = 0; i < 6; i++) { const x = 3 + i * 2; R(ctx, Qd, x, 7 - L, 1, L); R(ctx, Q, x, 7 - L, 1, 1); }   // quills, raised when it bristles
  if (b) { R(ctx, Q, 1, 4, 1, 3); R(ctx, Q, 17, 4, 1, 3); }
}
function drawSponge(ctx, frame) {                    // 20x20 sponge: a pocked yellow blob that swells with every bullet it drinks
  const s = frame === 'w1' ? 1 : 0, Y = '#c8a040', Yd = '#8a6a20', Yl = '#e8c860', K = '#3a2a10';
  R(ctx, Yd, 3, 4, 14, 14); R(ctx, Yd, 2, 6, 16, 10); R(ctx, Y, 3, 5, 14, 12); R(ctx, Yl, 4, 5, 6, 2);                   // the blob
  for (const [x, y] of [[5, 8], [10, 7], [13, 11], [7, 13], [12, 15], [4, 12]]) R(ctx, K, x, y, 2, 2);                    // pores
  R(ctx, '#141008', 13, 8, 2, 1); R(ctx, '#ff3020', 14, 8, 1, 1);                                                         // eye
  R(ctx, Yd, 5 + s, 18, 3, 2); R(ctx, Yd, 12 - s, 18, 3, 2);                                                              // stubby feet
}
function drawLeaper(ctx, frame) {                    // 18x18 leaper: a frog-legged hopper bot with a heavy chassis
  const c = frame === 'crouch', a = frame === 'air', M = '#4b535e', Md = '#2a2e35', Ml = '#8a94a0';
  const by = c ? 7 : a ? 3 : 5;
  R(ctx, Md, 3, by, 12, 7); R(ctx, M, 4, by, 10, 6); R(ctx, Ml, 4, by, 5, 1); R(ctx, '#ff8a20', 12, by + 2, 2, 2);      // chassis, eye
  if (a) { R(ctx, Md, 2, by + 7, 3, 6); R(ctx, Md, 13, by + 7, 3, 6); }                                                    // legs trailing
  else if (c) { R(ctx, Md, 1, 13, 5, 3); R(ctx, Md, 12, 13, 5, 3); R(ctx, Md, 1, 16, 6, 2); R(ctx, Md, 11, 16, 6, 2); }   // legs coiled
  else { R(ctx, Md, 2, 12, 3, 6); R(ctx, Md, 13, 12, 3, 6); R(ctx, '#141618', 1, 17, 5, 1); R(ctx, '#141618', 12, 17, 5, 1); }
}
// ---- debrief round: new enemies --------------------------------------------------------
function drawZealot(ctx, frame) {                    // 16x24 zealot: a robed fanatic with a censer staff
  const s = frame === 'w1' ? 1 : 0, c = frame === 'cast';
  const Rb = '#6a2a3a', Rd = '#3a1420', Rl = '#9a4a5a', K = '#141010', G = '#ffe080';
  R(ctx, Rd, 4, 14, 8, 10); R(ctx, Rb, 5, 14, 6, 9); R(ctx, Rd, 4 - s, 22, 3, 2); R(ctx, Rd, 9 + s, 22, 3, 2);            // robe hem
  R(ctx, Rd, 4, 6, 8, 9); R(ctx, Rb, 5, 6, 6, 8); R(ctx, Rl, 5, 6, 3, 1); R(ctx, G, 7, 9, 2, 1);                          // body, sash
  R(ctx, Rd, 5, 0, 6, 6); R(ctx, '#2a1018', 6, 1, 4, 4); R(ctx, G, 8, 3, 1, 1);                                           // hood, one eye glowing
  if (c) { R(ctx, '#5a3a20', 12, 0, 1, 10); R(ctx, G, 11, 0, 3, 2); R(ctx, '#ffffff', 12, 0, 1, 1); }                    // staff raised
  else { R(ctx, '#5a3a20', 12, 4, 1, 16); R(ctx, '#c8a040', 11, 4, 3, 2); }
}
function drawMinelayer(ctx, frame) {                 // 20x12 mine layer: a flat drone with a mine bay and twin rotors
  const f = frame === 'm1' ? 1 : 0, M = '#4b535e', Md = '#2a2e35', Ml = '#8a94a0';
  R(ctx, Md, 1 + f, 0, 6 - f * 2, 1); R(ctx, Md, 13 + f, 0, 6 - f * 2, 1); R(ctx, Ml, 3, 1, 1, 2); R(ctx, Ml, 16, 1, 1, 2);   // rotors
  R(ctx, Md, 1, 3, 18, 6); R(ctx, M, 2, 3, 16, 5); R(ctx, Ml, 2, 3, 8, 1); R(ctx, '#e8b422', 2, 7, 16, 1);               // hull
  R(ctx, '#141618', 7, 8, 6, 3); R(ctx, '#3a3f47', 8, 9, 4, 2); R(ctx, '#ff3020', 9, 10, 2, 1);                           // the bay, a mine in it
  R(ctx, '#ff3020', 17, 4, 1, 1);
}
function drawRatking(ctx, frame) {                   // 22x16 rat king: a knot of ratbots, tails tangled, eyes everywhere
  const s = frame === 'w1' ? 1 : 0, M = '#5a5f6a', Md = '#2e3138', Ml = '#9aa4b0', E = '#ff3020';
  R(ctx, Md, 2, 4, 18, 11); R(ctx, M, 3, 5, 16, 9); R(ctx, Ml, 4, 5, 6, 1);                                               // the heap
  for (const [x, y] of [[4, 6], [9, 4], [14, 6], [6, 10], [12, 9], [17, 10]]) { R(ctx, Md, x, y, 4, 3); R(ctx, E, x + 3, y + 1, 1, 1); }   // ratbot heads
  R(ctx, Md, 0, 8 + s, 3, 1); R(ctx, Md, 19, 7 - s, 3, 1); R(ctx, Md, 5 + s, 15, 2, 1); R(ctx, Md, 14 - s, 15, 2, 1);    // tails, legs
}
function drawRatbot(ctx, frame) {                    // 8x6 ratbot: a little metal rat
  const s = frame === 'r1' ? 1 : 0;
  R(ctx, '#2e3138', 1, 1, 5, 4); R(ctx, '#5a5f6a', 2, 1, 4, 3); R(ctx, '#ff3020', 6, 2, 1, 1); R(ctx, '#2e3138', 6, 3, 2, 1);
  R(ctx, '#2e3138', 0, 2 + s, 1, 1); R(ctx, '#2e3138', 2 + s, 5, 1, 1); R(ctx, '#2e3138', 5 - s, 5, 1, 1);
}
// ---- mutator round: new enemies --------------------------------------------------------
function drawHeadsman(ctx, frame) {                  // 24x28 headsman: a hooded executioner with a great axe
  const s = frame === 'w1' ? 1 : 0, rs = frame === 'raise', ch = frame === 'chop' || frame === 'stuck';
  const S = '#7a5a48', Sd = '#4a3428', K = '#141010', H = '#1e1a1e', A = '#9aa4b0', Ad = '#5a636e';
  R(ctx, Sd, 7 - s, 19, 4, 9); R(ctx, Sd, 13 + s, 19, 4, 9); R(ctx, K, 6 - s, 27, 6, 1); R(ctx, K, 12 + s, 27, 6, 1);      // legs
  R(ctx, Sd, 5, 9, 14, 11); R(ctx, S, 6, 9, 12, 10); R(ctx, K, 6, 14, 12, 2);                                              // bare torso, belt
  R(ctx, H, 8, 1, 8, 9); R(ctx, H, 7, 3, 10, 6); R(ctx, '#ff3020', 13, 5, 1, 1); R(ctx, '#ff3020', 15, 5, 1, 1);          // the hood, eyes
  if (rs) { R(ctx, '#5a3a20', 15, 0, 2, 12); R(ctx, Ad, 12, 0, 9, 5); R(ctx, A, 13, 0, 8, 3); }                           // axe raised high
  else if (ch) { R(ctx, '#5a3a20', 15, 14, 8, 2); R(ctx, Ad, 19, 15, 5, 12); R(ctx, A, 20, 16, 4, 10); }                  // axe down in the floor
  else { R(ctx, '#5a3a20', 4, 6, 2, 16); R(ctx, Ad, 0, 3, 6, 7); R(ctx, A, 0, 4, 4, 5); }                                // axe on the shoulder
}
function drawBerserker(ctx, frame) {                 // 18x24 berserker: a wiry brute with a saw-blade arm, veins standing out
  const s = frame === 'w1' ? 1 : 0, sw = frame === 'swing';
  const S = '#a06a54', Sd = '#6a3a2a', K = '#1a0e0a', B = '#c8d0da';
  R(ctx, Sd, 5 - s, 16, 3, 8); R(ctx, Sd, 10 + s, 16, 3, 8); R(ctx, K, 4 - s, 23, 5, 1); R(ctx, K, 9 + s, 23, 5, 1);
  R(ctx, Sd, 4, 7, 10, 10); R(ctx, S, 5, 7, 8, 9); R(ctx, '#c02020', 6, 9, 1, 4); R(ctx, '#c02020', 10, 8, 1, 5);          // torso, veins
  R(ctx, Sd, 6, 1, 6, 6); R(ctx, S, 7, 2, 4, 4); R(ctx, '#ffe040', 9, 3, 2, 1); R(ctx, K, 8, 5, 3, 1);                     // head, wild eyes, snarl
  if (sw) { R(ctx, Sd, 13, 6, 3, 3); R(ctx, B, 14, 2, 4, 4); R(ctx, '#ffffff', 15, 3, 2, 2); }                            // saw raised
  else { R(ctx, Sd, 13, 9, 3, 5); R(ctx, B, 13, 13, 5, 5); R(ctx, '#5a636e', 15, 15, 1, 1); }                              // saw at the hip
  R(ctx, Sd, 2, 9, 2, 6);
}
function drawBastion(ctx, frame) {                   // 18x22 bastion: a squat bot with a hard-light projector on its arm
  const s = frame === 'w1' ? 1 : 0, cast = frame === 'cast';
  const M = '#4b535e', Md = '#2a2e35', Ml = '#8a94a0', C = cast ? '#ffffff' : '#46e6ff';
  R(ctx, Md, 4 - s, 15, 4, 7); R(ctx, Md, 10 + s, 15, 4, 7); R(ctx, '#141618', 3 - s, 21, 6, 1); R(ctx, '#141618', 9 + s, 21, 6, 1);
  R(ctx, Md, 3, 5, 12, 11); R(ctx, M, 4, 5, 10, 10); R(ctx, Ml, 4, 5, 5, 1); R(ctx, '#e8b422', 4, 11, 10, 1);              // body, stripe
  R(ctx, Md, 6, 0, 6, 5); R(ctx, M, 7, 1, 4, 3); R(ctx, C, 9, 2, 2, 1);                                                    // head, visor
  R(ctx, Md, 14, 6, 4, 6); R(ctx, C, 16, 7, 2, 4); if (cast) R(ctx, '#d0f8ff', 17, 5, 1, 8);                               // the projector
}
// ---- foreman round: new enemies --------------------------------------------------------
function drawShellback(ctx, frame) {                 // 22x16 shellback: a crab-tortoise under a riveted shell, peering out front
  const s = frame === 'w1' ? 1 : 0, fl = frame === 'flip' || frame === 'flip2', t = frame === 'tell';
  const Sh = '#5a636e', Shd = '#2a2e35', Shl = '#8a94a0', B = '#c8a080', Bd = '#8a6040', K = '#141008';
  if (fl) {                                                                                                             // belly up, legs kicking the air
    const k = frame === 'flip2' ? 1 : 0;
    R(ctx, Shd, 2, 8, 18, 7); R(ctx, Sh, 3, 9, 16, 5); R(ctx, B, 4, 5, 14, 4); R(ctx, Bd, 4, 8, 14, 1);
    for (let i = 0; i < 3; i++) R(ctx, Bd, 5 + i * 5, 1 + ((i + k) % 2) * 2, 2, 4);
    return;
  }
  R(ctx, Bd, 3 + s, 12, 2, 4); R(ctx, Bd, 8 - s, 12, 2, 4); R(ctx, Bd, 13 + s, 12, 2, 4);                              // legs
  R(ctx, Shd, 1, 3, 17, 10); R(ctx, Sh, 2, 3, 15, 8); R(ctx, Shl, 3, 3, 8, 1); for (let i = 0; i < 4; i++) R(ctx, Shl, 4 + i * 4, 6, 1, 1);   // shell, rivets
  const hx = t ? 16 : 17; R(ctx, Bd, hx, 7, 5, 5); R(ctx, B, hx + 1, 8, 3, 3); R(ctx, K, hx + 3, 8, 1, 1); R(ctx, '#e8e8d0', hx + 2, 11, 2, 1);   // head, eye, beak
}
function drawShinobi(ctx, frame) {                   // 16x22 shinobi: a masked runner in dark wraps, a red scarf
  const s = frame === 'w1' ? 1 : 0, air = frame === 'air', cl = frame === 'cling';
  const C = '#2a2a3a', Cd = '#16161e', Ch = '#4a4a62', Rd = '#c02030', E = '#e8e8f0';
  if (air) { R(ctx, Cd, 4, 12, 3, 5); R(ctx, Cd, 9, 13, 3, 4); } else if (cl) { R(ctx, Cd, 1, 13, 3, 6); R(ctx, Cd, 6, 15, 3, 6); } else { R(ctx, Cd, 5 - s, 15, 2, 7); R(ctx, Cd, 9 + s, 15, 2, 7); }
  R(ctx, Cd, 4, 6, 8, 10); R(ctx, C, 5, 6, 6, 9); R(ctx, Ch, 5, 6, 3, 1);                                                // torso
  R(ctx, Cd, 5, 0, 6, 6); R(ctx, C, 6, 1, 4, 4); R(ctx, E, 8, 2, 3, 1);                                                  // hood, eye slit
  R(ctx, Rd, 3, 5, 6, 2); R(ctx, Rd, 1, 6, 3, 1); R(ctx, Rd, 0, 7, 2, 1);                                                // scarf
  if (air) { R(ctx, Cd, 11, 7, 4, 2); R(ctx, '#c8d0da', 14, 6, 2, 2); } else R(ctx, Cd, 11, 8, 2, 6);                   // throwing arm
}
function drawThunder(ctx, frame) {                   // 26x14 thundercloud: a storm drone wrapped in a dark cloud bank
  const c = frame === 'c1', K = '#2a3040', Kd = '#1a1e28', Kl = c ? '#a0c8ff' : '#4a5468';
  R(ctx, Kd, 2, 4, 22, 8); R(ctx, Kd, 5, 2, 8, 4); R(ctx, Kd, 13, 1, 9, 5); R(ctx, Kd, 0, 6, 26, 5);
  R(ctx, K, 3, 5, 20, 6); R(ctx, K, 6, 3, 6, 3); R(ctx, K, 14, 2, 7, 4); R(ctx, Kl, 6, 3, 4, 1); R(ctx, Kl, 15, 2, 4, 1);
  R(ctx, '#4b535e', 10, 10, 6, 3); R(ctx, c ? '#ffffff' : '#80c8ff', 12, 12, 2, 2);
  if (c) { R(ctx, '#e0f0ff', 4, 8, 1, 2); R(ctx, '#e0f0ff', 20, 7, 1, 2); }
}
function drawForeman(ctx, frame) {                   // 44x36 the foreman: a four-legged crane walker, a cab and a magnet arm
  const s = frame === 'w1' ? 1 : 0, sl = frame === 'slam', mg = frame === 'magnet';
  const Y = '#e8b422', Yd = '#a07810', M = '#4b535e', Md = '#22262c', Ml = '#8a94a0', K = '#141618';
  for (const [lx, ph] of [[5, 0], [14, 1], [26, 0], [35, 1]]) { const o = (ph ^ s) ? 1 : 0; R(ctx, Md, lx, 24 - o, 4, 12 + o); R(ctx, M, lx + 1, 24 - o, 2, 10); R(ctx, K, lx - 1, 34, 6, 2); }   // legs
  R(ctx, Md, 3, 14, 38, 12); R(ctx, Y, 4, 15, 36, 9); R(ctx, Yd, 4, 22, 36, 2); for (let i = 0; i < 9; i++) R(ctx, i % 2 ? K : Y, 4 + i * 4, 24, 4, 2);   // hull, hazard stripe
  R(ctx, Md, 24, 4, 14, 11); R(ctx, M, 25, 5, 12, 9); R(ctx, '#80c8ff', 30, 6, 6, 4); R(ctx, '#ffffff', 31, 6, 2, 1); R(ctx, '#ff3020', 25, 3, 2, 2);   // cab
  if (sl) { R(ctx, Md, 8, 0, 4, 15); R(ctx, M, 2, 0, 16, 4); R(ctx, Ml, 3, 0, 14, 1); }                                    // arm raised to slam
  else if (mg) { R(ctx, Md, 36, 10, 8, 3); R(ctx, M, 38, 6, 6, 12); R(ctx, '#80c8ff', 43, 7, 1, 10); }                     // magnet out front, live
  else { R(ctx, Md, 6, 6, 4, 9); R(ctx, Md, 2, 4, 10, 3); R(ctx, M, 0, 7, 8, 5); R(ctx, Ml, 1, 7, 6, 1); }                // arm folded
  R(ctx, Md, 14, 10, 8, 5); R(ctx, Ml, 15, 10, 6, 1);                                                                      // engine block
}
// ---- armory round: new enemies --------------------------------------------------------
function drawVortex(ctx, frame) {                    // 18x18 vortex: a turbine drone, blades round a glowing intake
  const sp = frame === 'spin', f = frame === 'v1' ? 1 : 0, M = '#4b535e', Md = '#2a2e35', Ml = '#8a94a0', L = sp ? '#ffffff' : '#9ad8ff';
  R(ctx, Md, 3, 3, 12, 12); R(ctx, M, 4, 4, 10, 10); R(ctx, Ml, 4, 4, 5, 1);                                            // housing
  if (sp) { R(ctx, '#6a7a8a', 0, 7, 18, 4); R(ctx, '#6a7a8a', 7, 0, 4, 18); R(ctx, '#9aa4b0', 1, 8, 16, 2); }          // blades as a blur
  else if (f) { R(ctx, Md, 0, 0, 4, 4); R(ctx, Md, 14, 14, 4, 4); R(ctx, Md, 14, 0, 4, 4); R(ctx, Md, 0, 14, 4, 4); }  // blades diagonal
  else { R(ctx, Md, 7, 0, 4, 3); R(ctx, Md, 7, 15, 4, 3); R(ctx, Md, 0, 7, 3, 4); R(ctx, Md, 15, 7, 3, 4); }           // blades square
  R(ctx, '#141a22', 6, 6, 6, 6); R(ctx, L, 7, 7, 4, 4); R(ctx, '#ffffff', 8, 8, 2, 2);                                 // the intake
}
function drawPylon(ctx, frame) {                     // 16x28 arc pylon: a tesla tower of stacked coils and an orb on top
  const g = frame === 'p1', M = '#4b535e', Md = '#2a2e35', C = '#c87a30', Cl = '#ffb060', O = g ? '#ffffff' : '#80c8ff';
  R(ctx, Md, 2, 24, 12, 4); R(ctx, M, 3, 24, 10, 2);                                                                     // base
  R(ctx, Md, 6, 7, 4, 17); R(ctx, M, 7, 7, 2, 17);                                                                       // mast
  for (let i = 0; i < 4; i++) { const y = 9 + i * 4, w = 10 - i; R(ctx, C, 8 - w / 2, y, w, 2); R(ctx, Cl, 8 - w / 2, y, 2, 1); }   // copper coils
  R(ctx, Md, 4, 1, 8, 7); R(ctx, '#1a2a3a', 5, 2, 6, 5); R(ctx, O, 6, 3, 4, 3); R(ctx, '#ffffff', 6, 3, 1, 1);           // the orb
}
function drawScavenger(ctx, frame) {                 // 20x18 scavenger: a hunched ghoul on all fours, long jaw, ribs showing
  const r = frame === 'w1' ? 1 : 0, eat = frame === 'eat', S = '#8a8a7a', Sd = '#4a4a3e', Sh = '#b8b8a0', K = '#1a1a14';
  R(ctx, Sd, 3 + r, 12, 2, 6); R(ctx, Sd, 7 - r, 12, 2, 6); R(ctx, Sd, 12 + r, 12, 2, 6); R(ctx, Sd, 15 - r, 12, 2, 6);   // limbs
  R(ctx, Sd, 2, 6, 14, 7); R(ctx, S, 3, 6, 12, 6); R(ctx, Sh, 4, 6, 6, 1); for (let i = 0; i < 4; i++) R(ctx, Sd, 5 + i * 2, 9, 1, 2);   // body, ribs
  const hy = eat ? 9 : 4;
  R(ctx, Sd, 14, hy, 6, 5); R(ctx, S, 15, hy, 4, 4); R(ctx, '#ff3020', 17, hy + 1, 1, 1); R(ctx, K, 16, hy + 3, 4, 1); R(ctx, '#e8e8d0', 17, hy + 3, 1, 1); R(ctx, '#e8e8d0', 19, hy + 3, 1, 1);   // head, jaw, teeth
  if (eat) R(ctx, '#a01010', 16, hy + 4, 4, 1);
}
// ---- wrecking-yard round: new enemies --------------------------------------------------------
function drawTorcher(ctx, frame) {                   // 22x24 torcher: a heavy in a scorched hazard suit, a fuel tank on its back
  const s = frame === 'w1' ? 1 : 0, sp = frame === 'spray';
  const S = '#5a4a3a', Sd = '#33281e', Sh = '#8a7a5a', K = '#141008', T = '#c84008';
  R(ctx, Sd, 6 - s, 17, 4, 7); R(ctx, Sd, 12 + s, 17, 4, 7); R(ctx, K, 5 - s, 23, 6, 1); R(ctx, K, 11 + s, 23, 6, 1);   // legs
  R(ctx, '#4a4e56', 1, 6, 5, 11); R(ctx, T, 2, 7, 3, 9); R(ctx, '#ff8a20', 2, 7, 1, 3); R(ctx, '#2a2e35', 2, 16, 3, 1);  // the fuel tank
  R(ctx, Sd, 5, 6, 12, 12); R(ctx, S, 6, 6, 10, 11); R(ctx, Sh, 6, 6, 5, 1); R(ctx, '#e8b422', 6, 12, 10, 1);            // body, hazard band
  R(ctx, Sd, 8, 0, 8, 7); R(ctx, S, 9, 0, 6, 6); R(ctx, '#1a1a1a', 11, 2, 4, 2); R(ctx, '#ff8a20', 13, 2, 2, 1);          // hood, visor
  R(ctx, Sd, 14, 9, 6, 3); R(ctx, '#3a3f47', 17, 8, 5, 3); R(ctx, sp ? '#ffe46a' : '#ff5a1a', 21, 9, 1, 1);                // the nozzle
}
function drawDiscus(ctx, frame) {                    // 16x24 discus: a lean thrower in shoulder pads, a steel disc in hand
  const s = frame === 'w1' ? 1 : 0, th = frame === 'throw';
  const S = '#3a4a6a', Sd = '#22283a', Sh = '#6a7aa0', K = '#12141c', D = '#c8d0da';
  R(ctx, Sd, 5 - s, 16, 2, 8); R(ctx, Sd, 9 + s, 16, 2, 8); R(ctx, K, 4 - s, 23, 4, 1); R(ctx, K, 8 + s, 23, 4, 1);
  R(ctx, Sd, 4, 7, 8, 10); R(ctx, S, 5, 7, 6, 9); R(ctx, Sh, 3, 7, 3, 2); R(ctx, Sh, 10, 7, 3, 2);                          // torso, pads
  R(ctx, Sd, 5, 1, 6, 6); R(ctx, '#c89070', 6, 2, 4, 4); R(ctx, K, 8, 3, 2, 1);                                            // head
  if (th) { R(ctx, Sd, 11, 4, 4, 2); R(ctx, D, 13, 1, 3, 3); }                                                             // arm up, disc away
  else { R(ctx, Sd, 11, 9, 2, 6); R(ctx, D, 11, 14, 5, 2); R(ctx, '#ffffff', 12, 14, 2, 1); }                              // disc at the hip
}
function drawSporepod(ctx, frame) {                  // 20x18 spore pod: a swollen fungus on a root mat, glowing pores
  const p = frame === 'p1' ? 1 : 0, pf = frame === 'puff';
  const F = '#6a7a30', Fd = '#3a4418', Fh = '#a0b850', G = '#e0ff80', W = pf ? 3 : p;
  R(ctx, Fd, 1, 15, 18, 3); R(ctx, '#2a3010', 0, 17, 20, 1);                                                               // root mat
  R(ctx, Fd, 4 - W, 5 - W, 12 + W * 2, 11 + W); R(ctx, F, 5 - W, 6 - W, 10 + W * 2, 9 + W); R(ctx, Fh, 6 - W, 6 - W, 5, 2);   // the bulb, swelling
  R(ctx, G, 7, 9, 2, 2); R(ctx, G, 12, 8, 2, 2); R(ctx, G, 9, 12, 2, 1); R(ctx, G, 13, 12, 1, 1);                          // pores
  R(ctx, Fd, 8, 3 - W, 4, 2); R(ctx, pf ? '#ffffff' : G, 9, 2 - W, 2, 1);                                                  // the vent on top
}
// ---- elite round: new enemies --------------------------------------------------------
function drawGrappler(ctx, frame) {                  // 22x26 grappler: a hulking brute in a leather harness, arms like girders
  const s = frame === 'w1' ? 1 : 0, t = frame === 'tell', gr = frame === 'grab' || frame === 'hold';
  const S = '#8a5a44', Sd = '#5a3424', Sh = '#b07a5a', L = '#3a2a20', K = '#1a1010';
  R(ctx, L, 6 - s, 18, 4, 8); R(ctx, L, 12 + s, 18, 4, 8); R(ctx, K, 5 - s, 25, 6, 1); R(ctx, K, 11 + s, 25, 6, 1);                    // legs
  R(ctx, Sd, 4, 7, 14, 12); R(ctx, S, 5, 7, 12, 11); R(ctx, Sh, 6, 7, 6, 2); R(ctx, L, 5, 12, 12, 2); R(ctx, '#c8a040', 10, 12, 2, 2);   // torso, harness, buckle
  R(ctx, Sd, 8, 1, 7, 7); R(ctx, S, 9, 1, 5, 6); R(ctx, K, 11, 3, 3, 1); R(ctx, '#ff5a3a', 13, 3, 1, 1); R(ctx, Sd, 10, 6, 4, 1);       // head, brow, eye
  if (t) { R(ctx, Sd, 0, 4, 5, 4); R(ctx, Sd, 17, 4, 5, 4); R(ctx, S, 0, 2, 3, 3); R(ctx, S, 19, 2, 3, 3); }                           // arms thrown wide
  else if (gr) { R(ctx, Sd, 14, 8, 8, 4); R(ctx, S, 18, 7, 4, 6); R(ctx, Sd, 12, 12, 8, 3); }                                          // arms out front, hands shut
  else { R(ctx, Sd, 1, 8, 4, 10); R(ctx, Sd, 17, 8, 4, 10); R(ctx, S, 1, 16, 4, 3); R(ctx, S, 17, 16, 4, 3); }                        // arms hanging, fists
}
function drawSpotter(ctx, frame) {                   // 16x14 spotter: a floating eye in a steel housing, a rotor on top
  const f = frame === 's1' ? 1 : 0, M = '#4b535e', Md = '#2a2e35', Ml = '#8a94a0';
  R(ctx, Md, 3 + f, 0, 10 - f * 2, 1); R(ctx, Ml, 7, 1, 2, 2);                                                                          // rotor blur, mast
  R(ctx, Md, 2, 3, 12, 9); R(ctx, M, 3, 3, 10, 8); R(ctx, Ml, 3, 3, 5, 1);                                                             // housing
  R(ctx, '#3a0a0a', 6, 5, 7, 5); R(ctx, '#ff2020', 8, 6, 4, 3); R(ctx, '#ffb0a0', 9, 6, 1, 1);                                          // the big red lens
  R(ctx, Md, 4, 12, 2, 2); R(ctx, Md, 10, 12, 2, 2);
}
function drawHound(ctx, frame) {                     // 22x14 hound: a lean robot dog with a red eye and a whip of a tail
  const r = frame === 'r1' ? 1 : 0, c = frame === 'crouch', l = frame === 'leap', M = '#5a5f6a', Md = '#2e3138', Ml = '#9aa4b0', by = c ? 6 : l ? 3 : 4;
  R(ctx, Md, 4, by, 12, 5); R(ctx, M, 5, by, 10, 4); R(ctx, Ml, 5, by, 6, 1);                                                           // body
  R(ctx, Md, 15, by - 3, 6, 5); R(ctx, M, 16, by - 3, 4, 4); R(ctx, '#ff3020', 19, by - 2, 1, 1); R(ctx, Md, 20, by + 1, 2, 1);         // head, eye, jaw
  R(ctx, Md, 1, by - 2 + r, 4, 1); R(ctx, Md, 0, by - 3 + r, 2, 1);                                                                     // tail
  if (l) { R(ctx, Md, 3, by + 4, 4, 2); R(ctx, Md, 14, by + 4, 5, 2); }                                                                 // legs tucked in a pounce
  else { const a = r ? 1 : -1, ly = by + 5, lh = 14 - ly; R(ctx, Md, 5 + a, ly, 2, lh); R(ctx, Md, 8 - a, ly, 2, lh); R(ctx, Md, 12 + a, ly, 2, lh); R(ctx, Md, 15 - a, ly, 2, lh); }
}
// ---- arsenal round: new enemies --------------------------------------------------------
function drawOrbiter(ctx, frame) {                   // 16x16 orbiter core: an armoured ball with one lens (its plates are drawn live)
  const f = frame === 'fire', p = frame === 'o1';
  const M = '#4b535e', Md = '#2a2e35', Ml = '#8a94a0', L = f ? '#ffffff' : p ? '#9af4ff' : '#46e6ff';
  R(ctx, Md, 4, 1, 8, 14); R(ctx, Md, 1, 4, 14, 8); R(ctx, Md, 2, 2, 12, 12);
  R(ctx, M, 3, 3, 10, 10); R(ctx, M, 4, 2, 8, 12); R(ctx, M, 2, 4, 12, 8); R(ctx, Ml, 4, 3, 4, 1); R(ctx, Ml, 3, 4, 1, 3);   // shell + rim light
  R(ctx, '#141a22', 7, 5, 6, 6); R(ctx, L, 8, 6, 4, 4); R(ctx, '#ffffff', 8, 6, 1, 1);                                   // the lens
  R(ctx, Md, 7, 0, 2, 1); R(ctx, Md, 7, 15, 2, 1); R(ctx, '#ff8a20', 3, 11, 1, 1);
}
function drawSwapper(ctx, frame) {                   // 16x24 swapper: a slim phase bot with a violet core in its chest
  const s = frame === 'w1' ? 1 : 0, t = frame === 'tell';
  const M = '#3a3f52', Md = '#22242e', Ml = '#7a7fa0', V = t ? '#f0d8ff' : '#b070ff', Vd = '#6a30c0';
  R(ctx, Md, 5 - s, 16, 2, 8); R(ctx, Md, 9 + s, 16, 2, 8); R(ctx, '#141418', 4 - s, 23, 4, 1); R(ctx, '#141418', 8 + s, 23, 4, 1);   // legs
  R(ctx, Md, 4, 7, 8, 10); R(ctx, M, 5, 7, 6, 9); R(ctx, Ml, 5, 7, 3, 1);                                                 // torso
  R(ctx, Vd, 6, 10, 4, 4); R(ctx, V, 7, 11, 2, 2);                                                                         // phase core
  R(ctx, Md, 5, 1, 6, 6); R(ctx, M, 6, 1, 4, 5); R(ctx, V, 8, 3, 2, 1); R(ctx, Ml, 7, 0, 1, 1);                           // head, visor, antenna
  if (t) { R(ctx, Md, 1, 6, 3, 2); R(ctx, Md, 12, 6, 3, 2); R(ctx, V, 0, 5, 2, 2); R(ctx, V, 14, 5, 2, 2); }               // arms out, crackling
  else { R(ctx, Md, 2, 8, 2, 7); R(ctx, Md, 12, 9, 2, 5); R(ctx, Ml, 12, 12, 4, 2); }                                     // arms; a pistol hand
}
function drawScorcher(ctx, frame) {                  // 18x22 scorcher: a hunched sprinter with a fuel pack and a burning scalp
  const r = frame === 'r1' ? 1 : 0, p = frame === 'pant';
  const S = '#6a3a24', Sd = '#3a2014', Sh = '#9a5a34', F1 = '#ffe46a', F2 = '#ff8a1f', F3 = '#c83010', K = '#140a06', hy = p ? 7 : 3;
  R(ctx, Sd, 4 + r * 2, 15, 3, 7); R(ctx, Sd, 10 - r * 2, 15, 3, 7); R(ctx, K, 3 + r * 2, 21, 5, 1); R(ctx, K, 9 - r * 2, 21, 5, 1);   // legs in stride
  R(ctx, '#4a4e56', 2, 8, 4, 7); R(ctx, '#c84008', 3, 9, 2, 5);                                                          // fuel pack
  R(ctx, Sd, 5, 8, 9, 8); R(ctx, S, 6, 8, 7, 7); R(ctx, Sh, 6, 8, 4, 1);                                                  // body, leaning in
  R(ctx, Sd, 9, hy, 6, 6); R(ctx, S, 10, hy, 4, 5); R(ctx, K, 12, hy + 2, 2, 1);                                          // head, goggles
  if (!p) { R(ctx, F3, 9, hy - 3, 6, 3); R(ctx, F2, 10, hy - 3, 4, 2); R(ctx, F1, 11, hy - 3, 2, 1); } else R(ctx, F3, 10, hy - 1, 4, 1);   // the flame dims when winded
  R(ctx, Sd, 13, 10, 4, 2); R(ctx, F2, 16, 10, 2, 2); R(ctx, F1, 17, 10, 1, 1);                                          // torch hand
}
function drawWraith(ctx, frame) {                    // 18x22 wraith: a hooded shroud trailing wisps, two cold eyes
  const f = frame === 'f1' ? 1 : 0, t = frame === 'tell';
  const C = '#b8a8e8', Cd = '#6a5aa8', Cl = '#e8e0ff', K = '#140c24', E = t ? '#ffffff' : '#a0f0ff';
  R(ctx, Cd, 4, 2, 10, 4); R(ctx, Cd, 3, 5, 12, 9); R(ctx, C, 4, 3, 10, 9); R(ctx, Cl, 5, 3, 4, 1);                    // hood
  R(ctx, K, 6, 6, 6, 5); R(ctx, E, 7, 8, 1, 1); R(ctx, E, 10, 8, 1, 1);                                                // the dark under it, eyes
  R(ctx, C, 3, 13, 12, 3); R(ctx, Cd, 3, 16, 3 + f, 3); R(ctx, Cd, 8, 16, 2, 4 - f); R(ctx, Cd, 12 - f, 16, 3, 3 + f);   // trailing hem
  R(ctx, Cd, 4 + f, 19, 2, 2); R(ctx, Cd, 11, 19 + f, 2, 2);
  if (t) { R(ctx, C, 0, 7, 3, 2); R(ctx, C, 15, 7, 3, 2); R(ctx, Cl, 0, 9, 2, 2); R(ctx, Cl, 16, 9, 2, 2); }            // claws out
  else { R(ctx, C, 1, 9, 2, 4); R(ctx, C, 15, 9, 2, 4); }
}
function drawChiller(ctx, frame) {                   // 18x24 chiller: a cryo trooper in a frosted suit, a tank on its back
  const s = frame === 'w1' ? 1 : 0, th = frame === 'throw';
  const S = '#4a6a8a', Sd = '#2a3a50', Sh = '#8ab0d0', I = '#c8f0ff', K = '#141a22';
  R(ctx, Sd, 5 - s, 17, 3, 7); R(ctx, Sd, 10 + s, 17, 3, 7); R(ctx, K, 4 - s, 23, 5, 1); R(ctx, K, 9 + s, 23, 5, 1);   // legs
  R(ctx, '#3a4450', 1, 8, 4, 9); R(ctx, I, 2, 9, 2, 6); R(ctx, '#ffffff', 2, 9, 1, 2);                                 // the cryo tank
  R(ctx, Sd, 4, 8, 10, 10); R(ctx, S, 5, 8, 8, 9); R(ctx, Sh, 5, 8, 4, 1); R(ctx, I, 5, 13, 8, 1);                      // body, frost belt
  R(ctx, Sd, 6, 1, 7, 7); R(ctx, S, 7, 1, 5, 6); R(ctx, I, 9, 3, 3, 2); R(ctx, '#ffffff', 10, 3, 1, 1);                  // helmet + visor
  if (th) { R(ctx, Sd, 13, 2, 3, 7); R(ctx, I, 13, 0, 3, 3); }                                                          // arm up with a frost ball
  else { R(ctx, Sd, 13, 9, 3, 7); R(ctx, Sh, 13, 15, 3, 2); }
}
function drawWarhorn(ctx, frame) {                   // 20x20 warhorn: a squat tracked bot hauling a great brass horn
  const s = frame === 'w1' ? 1 : 0, bl = frame === 'blow';
  const M = '#4b535e', Md = '#2a2e35', B = '#c8a040', Bd = '#8a6a20', Bl = '#ffe080';
  R(ctx, Md, 2, 15, 16, 5); for (let i = 0; i < 4; i++) R(ctx, '#5a636e', 3 + i * 4 + s, 16, 2, 3);                  // tracks
  R(ctx, Md, 4, 7, 12, 9); R(ctx, M, 5, 7, 10, 7); R(ctx, '#8a94a0', 5, 7, 5, 1); R(ctx, '#ff3020', 12, 11, 2, 1);      // hull + eye (under the bell, facing the way it blows)
  R(ctx, Bd, 9, 3, 3, 5); R(ctx, B, 10, 3, 2, 4);                                                                       // horn neck
  R(ctx, Bd, 12, 0, 2, 8); R(ctx, B, 14, bl ? 0 : 1, 2, bl ? 9 : 7); R(ctx, B, 16, bl ? 0 : 2, 3, bl ? 10 : 5); R(ctx, Bl, 18, bl ? 1 : 3, 1, bl ? 8 : 3);   // the bell, flared when it blows
}
const RAG = {
  grunt:    { up: false, hp: 35, fw: 20, fh: 18, body: x => drawGrunt(x, 1, false), head: [12, 5, 6, 6], torso: [3, 2, 9, 10],
              leg: x => { for (let y = 12; y < 16; y++) R(x, EP.f, 10, y, 2, 1); R(x, EP.m, 10, 16, 3, 1); R(x, EP.bone, 13, 16); }, thigh: [10, 12, 2, 2], shin: [10, 14, 4, 3] },
  enforcer: { up: true, hp: 40, fw: 18, fh: 24, body: x => drawEnforcer(x, 0, [0, 0], [0, 0]), head: [4, 0, 11, 8], torso: [2, 8, 13, 7], P: ENLEG, legW: 3 },
  sniper:   { up: true, hp: 35, fw: 18, fh: 24, body: x => drawSniper(x, 0, [0, 0], [0, 0]), head: [4, 0, 10, 8], torso: [3, 8, 11, 7], P: SNLEG, legW: 3 },
  stalker:  { up: true, hp: 35, fw: 20, fh: 24, body: x => drawStalker(x, 0, [0, 0], [0, 0], 'idle'), clear: [[4, 10, 2, 8], [12, 10, 3, 8]], head: [5, 1, 9, 7], torso: [6, 8, 7, 8], P: STLEG, legW: 2, blade: true },
  bulwark:  { up: true, hp: 55, fw: 22, fh: 24, body: x => drawBulwark(x, 0, [0, 0], [0, 0], 'walk'), clear: [[14, 0, 8, 24]], head: [5, 0, 9, 7], torso: [3, 7, 11, 8], P: BWLEG, legW: 3 },
  rocketeer: { up: true, hp: 45, fw: 20, fh: 24, body: x => drawRocketeer(x, 0, [0, 0], [0, 0]), head: [5, 0, 10, 8], torso: [1, 8, 14, 7], P: RKLEG, legW: 3 },
  sapper:   { up: true, hp: 40, fw: 18, fh: 24, body: x => drawSapper(x, 0, [0, 0], [0, 0], 'idle'), head: [4, 0, 11, 8], torso: [1, 8, 13, 7], P: SPLEG, legW: 3 },
  cloaker:  { up: true, hp: 35, fw: 18, fh: 24, body: x => drawCloaker(x, 0, [0, 0], [0, 0], 'idle'), head: [4, 0, 10, 8], torso: [2, 8, 12, 7], P: CKLEG, legW: 2 },
  pyro:     { up: true, hp: 45, fw: 18, fh: 24, body: x => drawPyro(x, 0, [0, 0], [0, 0], 'idle'), head: [4, 0, 11, 8], torso: [1, 8, 13, 7], P: PYLEG, legW: 3 },
};
// ---- expansion: bosses ----------------------------------------------------------------
// The five expansion bosses (BOSS RUSH, OVERTIME, the Lab): every one is drawn for its three phases, so the wear
// shows as the fight goes on, plus the egg sacs, shield nodes and saw blades that come with them.
const XCH = ['#0a0710', '#160e20', '#24162e', '#36203f', '#4c2c54', '#6a406e', '#8e5c8e'];   // brood chitin
const XCU = ['#24100a', '#42200e', '#6a3416', '#984c20', '#c46a2c', '#e8904a', '#ffc27a'];   // copper windings
const XGL = ['#0c1824', '#16283a', '#244056', '#3a6482', '#5e94b8', '#9ccce8', '#e0f6ff'];   // glass
const XCT = ['#05060c', '#0b0f1c', '#141a2e', '#1e2842', '#2c3a5a', '#425478'];               // tailcoat
const XSC = ['#4a3a3a', '#7a6a66', '#a89a94', '#d2c8c0', '#f2ece4'];                          // sclera
const XSR = ['#300606', '#5a1010', '#8a1c1c', '#b83434', '#e06060'];                          // a bloodshot sclera
const xbHash = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 2246822519) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };   // fixed noise: art never reads Math.random
function xbCrack(c, pts, glow) {                     // a jagged crack along a polyline, lit from inside when glow is set
  for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; pxLine(c, '#07080b', x0, y0, x1, y1); if (glow) pxLine(c, glow, x0 + 1, y0, x1 + 1, y1); }
}
function drawCrucible(ctx, ph, pose) {               // 56x48 the crucible: a slag cauldron on thrusters, spout right; pose i | t (pouring) | v (venting)
  const W = 56, H = 48, tl = pose === 't', vt = pose === 'v', hot = ph === 3;
  const BOWL = hot ? ['#0c0e12', '#1a1210', '#2e1a14', '#4a2418', '#6a3420', '#8c4a2a', '#a86a48'] : IRN;
  part(ctx, W, H, c => {                                                     // thruster pods and their stubby flames
    for (const x of [17, 39]) { limb(c, x, 37, x, 43, 3.6, 2.6, IRN, -0.05, true); R(c, IRN[6], x - 2, 37, 4, 1); R(c, IRN[0], x - 2, 43, 5, 1); R(c, vt ? MLT[4] : '#9ad8ff', x - 1, 44, 3, 1); R(c, '#ffffff', x, 44, 1, 1); }
    for (const x of [4, 52]) { blob(c, x, 24, 4.2, 4.6, IRN, 2.4, 0.06); R(c, IRN[0], x - 2, 28, 4, 2); R(c, IRN[6], x - 2, 21, 2, 1); }
    limb(c, 8, 24, 12, 24, 1.4, 1.4, IRN, 0.1, true); limb(c, 44, 24, 48, 24, 1.4, 1.4, IRN, 0.1, true);   // trunnion arms
  });
  part(ctx, W, H, c => {                                                     // the bowl
    const cx = 28, cy = 25, rx = 20, ry = 15, P = 2.3, ins = (x, y) => inBlob(x, y, cx, cy, rx, ry, P);
    blob(c, cx, cy, rx, ry, BOWL, P, 0.05, (x, y) => y >= 12);
    blob(c, cx, cy, rx, ry, RST, P, 0.04, (x, y) => y >= 31);                 // scorched underside
    for (let x = 8; x < 49; x++) for (const y of [30, 31]) if (ins(x, y)) R(c, HAZ[((x + y) >> 1) & 1 ? 3 : 0], x, y);   // hazard band
    for (let x = 10; x < 47; x += 4) if (ins(x, 17) && !(ph === 3 && x > 30 && x < 40)) { R(c, IRN[7], x, 17); R(c, IRN[2], x, 18); }   // rivets
    R(c, IRN[1], 12, 20, 6, 6); R(c, IRN[5], 13, 21, 4, 4); R(c, '#e8e2d0', 14, 22, 2, 2); R(c, '#d02a1a', 15, 22, 1, 2);   // pressure gauge, needle in the red
    for (let i = 0; i < 3; i++) R(c, IRN[1], 39, 20 + i * 2, 6, 1);           // side vents
    if (ph >= 2) {
      xbCrack(c, [[19, 13], [17, 17], [20, 21], [18, 27]], MLT[4]); xbCrack(c, [[41, 24], [45, 28], [43, 33]], MLT[3]); R(c, IRN[1], 34, 33, 4, 2); R(c, IRN[2], 9, 19, 2, 2);
      for (const [x, y0, n] of [[24, 14, 4], [36, 14, 6], [11, 16, 3]]) for (let i = 0; i < n; i++) R(c, MLT[i < 2 ? 5 : 3], x + (i > 2 ? 1 : 0), y0 + i);   // slag running down from the lip
    }
    if (ph === 3) {                                                           // plates blown off: the glowing liner shows
      for (const [x0, y0, w, h] of [[31, 15, 9, 4], [8, 25, 5, 5], [40, 33, 6, 3]]) for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (ins(x, y)) R(c, MLT[2 + ((x + y) % 3)], x, y);
      R(c, MLT[6], 34, 16, 2, 1); R(c, MLT[5], 10, 27, 2, 1);
    }
  });
  part(ctx, W, H, c => {                                                     // the hatch over its core
    const hx = 28, hy = 24;
    if (vt) {
      blob(c, hx, hy, 7, 6.5, IRN, 2, -0.2); blob(c, hx, hy, 5.6, 5.2, MLT, 2, 0.35);
      R(c, '#ffffff', hx - 2, hy - 2, 3, 2); R(c, MLT[7], hx - 3, hy - 1, 5, 3); R(c, '#ffffff', hx - 1, hy - 1, 2, 1);
      blob(c, hx - 11, hy, 2.4, 6, IRN, 2.6, 0.1); blob(c, hx + 11, hy, 2.4, 6, IRN, 2.6, 0.1);   // the doors swung open
    } else {
      blob(c, hx, hy, 7, 6.5, IRN, 2.2, 0.08);
      for (let y = hy - 3; y <= hy + 3; y += 2) R(c, IRN[0], hx - 5, y, 11, 1);
      for (let y = hy - 3; y <= hy + 3; y += 2) R(c, MLT[tl || hot ? 4 : 2], hx - 4 + ((y >> 1) & 1), y, 9, 1);   // the glow through the grille
      R(c, IRN[7], hx - 1, hy - 6, 3, 1); R(c, IRN[0], hx - 1, hy + 6, 3, 1);
    }
  });
  part(ctx, W, H, c => {                                                     // the rim, the slag in it and the spout
    const cx = 28, cy = 11;
    for (let y = 5; y <= 17; y++) for (let x = 6; x <= 50; x++) {
      const o = Math.pow((x + 0.5 - cx) / 22, 2) + Math.pow((y + 0.5 - cy) / 5.6, 2), n = Math.pow((x + 0.5 - cx) / 18, 2) + Math.pow((y + 0.5 - cy + 0.6) / 3.4, 2);
      if (o > 1) continue;
      if (n <= 1) { const d = Math.sqrt(n), sl = tl ? (x - cx) / 40 : 0; R(c, MLT[clamp(Math.round(7 - d * 4 - (hot ? 0 : 1) + sl * 2 + (xbHash(x, y, ph) < 0.12 ? -2 : 0)), 2, 7)], x, y); }
      else R(c, hot ? (y < cy ? RST[5] : y > cy + 2 ? RST[2] : MLT[2]) : (y < cy - 1 ? IRN[6] : y > cy + 2 ? IRN[2] : IRN[4]), x, y);
    }
    for (let x = 9; x < 48; x += 5) R(c, hot ? MLT[3] : IRN[7], x, cy - 5 + (Math.abs(x - cx) > 15 ? 1 : 0));
    limb(c, 47, 11, 54, 13, 2.6, 2.0, hot ? RST : IRN, 0.1, true);            // spout trough
    R(c, MLT[tl ? 6 : 4], 48, 10, 5, 1); R(c, MLT[tl ? 7 : 5], 50, 10, 2, 1);
    if (tl) { R(c, MLT[6], 54, 14, 2, 2); R(c, MLT[5], 55, 16, 1, 2); R(c, MLT[4], 54, 18, 1, 1); }   // slag leaving the lip
    if (ph >= 2) { R(c, '#07080b', 14, 7, 3, 1); R(c, '#07080b', 40, 14, 4, 1); }   // dents in the lip
    if (hot) for (const [x, y] of [[12, 9], [44, 9], [30, 6]]) R(c, '#ffffff', x, y);   // boiling over
  });
}
function drawGrinder(ctx, ph, k) {                   // 48x48 the grinder: a saw ring spinning round a fixed armoured hub; k 0-3 steps the spin
  const cx = 24, cy = 24, a0 = k * Math.PI / 24, seg = Math.PI / 6;
  const SAW = ['#1a1e24', '#2a3038', '#3e4652', '#5a6474', '#7e8a9a', '#a8b4c2', '#d8e2ec'];
  part(ctx, 48, 48, c => {                                                   // the saw ring and its teeth
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = Math.hypot(dx, dy), ang = Math.atan2(dy, dx), u = (((ang - a0) / seg) % 1 + 1) % 1;
      const lit = clamp(Math.round(3.5 - (dx * 0.5 + dy * 0.75) / r * 2.5), 0, 6);
      if (r >= 15 && r < 19.5) {
        const band = r >= 17.5 ? (Math.floor((ang - a0) / seg + 12) % 2 ? HAZ[3] : '#15161a') : null;   // painted outer band: the stripes show it turning
        R(c, band && ph < 3 ? band : r < 16 ? SAW[1] : SAW[clamp(lit, 1, 5)], x, y);
        if (ph >= 2 && band && xbHash(Math.floor((ang - a0) * 8), 3, ph) < 0.25) R(c, SAW[2], x, y);   // paint chipped off
      } else if (r >= 19.5 && r < 24 && r - 19.5 < 4.4 * Math.pow(1 - u, 0.8)) R(c, u < 0.2 ? SAW[6] : SAW[clamp(lit + 1, 3, 6)], x, y);   // the teeth, keen on the leading edge
    }
    for (let i = 0; i < 6; i++) { const a = a0 + i * seg * 2 + seg / 2; R(c, SAW[0], Math.round(cx + Math.cos(a) * 16.5), Math.round(cy + Math.sin(a) * 16.5), 1, 1); }   // bolt heads
  });
  part(ctx, 48, 48, c => {                                                   // the hub housing, upright whatever the ring does
    blob(c, cx, cy, 13, 12, IRN, 3.4, 0.06);
    if (ph === 1) {
      for (const [x0, y0] of [[13, 15], [26, 15], [13, 25], [26, 25]]) { R(c, IRN[5], x0, y0, 9, 8); R(c, IRN[6], x0, y0, 9, 1); R(c, IRN[3], x0, y0 + 7, 9, 1); R(c, IRN[7], x0 + 1, y0 + 1); R(c, IRN[7], x0 + 7, y0 + 6); }
      for (let i = 0; i < 6; i++) R(c, i % 2 ? '#15161a' : HAZ[3], 13 + i * 4, 23, 4, 2);
    } else if (ph === 2) {
      for (const [x0, y0] of [[13, 15], [13, 25], [26, 25]]) { R(c, IRN[4], x0, y0, 9, 8); R(c, IRN[5], x0, y0, 9, 1); R(c, IRN[2], x0, y0 + 7, 9, 1); }
      R(c, IRN[0], 26, 15, 9, 8); for (let i = 0; i < 4; i++) R(c, i % 2 ? '#c84a20' : '#40c0ff', 27 + i * 2, 16 + i, 1, 5);   // a plate gone: wiring
      xbCrack(c, [[14, 26], [18, 29], [17, 32]], null); xbCrack(c, [[30, 27], [33, 30]], null);
      for (let i = 0; i < 6; i++) R(c, i % 2 ? '#15161a' : HAZ[1], 13 + i * 4, 23, 4, 2);
    } else {
      blob(c, cx, cy, 11, 10, ['#140806', '#2a0e08', '#4a1a0c', '#7a2a10'], 2.6, 0);   // stripped: the gearbox and its hot core
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; R(c, IRN[4], Math.round(cx + Math.cos(a) * 8.5), Math.round(cy + Math.sin(a) * 8), 2, 2); }
      blob(c, cx, cy, 5.2, 5, MLT, 2, 0.3); R(c, '#ffffff', cx - 2, cy - 2, 2, 2);
      R(c, IRN[3], 12, 14, 4, 3); R(c, IRN[3], 33, 31, 4, 3);
    }
    R(c, IRN[0], 32, 18, 6, 4); R(c, ph === 3 ? MLT[6] : '#ff3020', 33, 19, 5, 2); R(c, '#ffe0a0', 36, 19, 2, 1);   // the visor slit, looking ahead
    if (ph >= 2) R(c, '#07080b', 34, 18, 1, 4);
    limb(c, 17, 11, 17, 6, 1.8, 1.6, IRN, -0.1, true); limb(c, 22, 11, 22, 7, 1.5, 1.4, IRN, -0.1, true);   // exhaust stacks
    R(c, ph === 3 ? MLT[5] : IRN[1], 16, 5, 3, 1); R(c, ph === 3 ? MLT[4] : IRN[1], 21, 6, 3, 1);
    blob(c, cx, cy + 12, 4, 2.2, IRN, 2.4, 0.1); R(c, IRN[7], cx - 1, cy + 11, 2, 1);   // axle cap
  });
}
function drawQueen(ctx, ph, pose) {                  // 56x40 the hive queen, faces right; pose a | b wingbeat, s rearing to screech
  const sc = pose === 's', up = pose === 'a' || sc, by = sc ? -2 : 0;
  const wingFill = (c, cx, cy, rx, ry, rot, tatter) => {
    const cs = Math.cos(rot), sn = Math.sin(rot);
    for (let y = Math.floor(cy - rx - 1); y <= cy + rx + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
      const px = x + 0.5 - cx, py = y + 0.5 - cy, u = (px * cs + py * sn) / rx, v = (-px * sn + py * cs) / ry;
      if (u * u + v * v > 1 || x < 0 || y < 0 || x >= 56 || y >= 40) continue;
      if (tatter && xbHash(x >> 1, y >> 1, tatter) < 0.22 * tatter && u > -0.3) continue;   // torn membrane
      const vein = Math.abs(v - u * 0.4) < 0.09 || Math.abs(v + u * 0.5 - 0.3) < 0.08 || Math.abs(u - 0.35) < 0.05;
      c.fillStyle = vein ? 'rgba(90,120,150,0.95)' : u > 0.55 ? 'rgba(220,240,255,0.7)' : 'rgba(170,210,240,0.5)'; c.fillRect(x, y, 1, 1);
    }
  };
  const wings = (back) => part(ctx, 56, 40, c => {
    const t = back ? 0 : ph - 1, dx = back ? -3 : 0;
    if (sc) wingFill(c, 23 + dx, 8, 13, 4, -0.5, t);
    else if (up) wingFill(c, 21 + dx, 9, 13, 4, -0.38, t);
    else wingFill(c, 18 + dx, 15, 15, 3.6, -0.06, t);
  }, back ? '#20182a' : '#07080b');
  wings(true);
  part(ctx, 56, 40, c => {                                                   // legs, folded under
    for (const [hx, f] of [[27, 0], [31, 1], [35, 2]]) {
      const kx = hx - 3 + f * 2, ky = 30 + by + (f === 1 ? 1 : 0), fx = hx - 6 + f * 4, fy = 35 + by;
      pxLine(c, XCH[3], hx, 24 + by, kx, ky, 1); pxLine(c, XCH[4], hx + 1, 24 + by, kx + 1, ky, 1); pxLine(c, XCH[2], kx, ky, fx, fy, 1); R(c, XCH[5], fx, fy, 1, 1);
    }
  });
  part(ctx, 56, 40, c => {                                                   // the egg-heavy abdomen
    const cx = 15, cy = 23 + by * 0.5, rx = 13.5, ry = 10.5;
    blob(c, cx, cy, rx, ry, BRF, 2.1, 0.04);
    blob(c, cx + 1, cy - 3.5, rx - 1, ry - 4.5, XCH, 2.4, 0.08, (x, y) => y < cy - 1);   // dorsal plates
    for (let x = 6; x < 26; x += 5) for (let y = Math.round(cy - 8); y < cy + 9; y++) if (inBlob(x, y, cx, cy, rx, ry, 2.1)) R(c, '#1a0808', x, y);   // segment bands
    for (const [x, y] of [[8, 25], [13, 27], [19, 26], [10, 21], [16, 23], [22, 22], [5, 23]]) { R(c, BRE[ph === 3 ? 3 : 2], x, y + by * 0.5, 2, 2); R(c, BRE[4], x, y + by * 0.5, 1, 1); }   // eggs glowing through
    R(c, XCH[2], 1, 23, 3, 3); R(c, BRE[1], 0, 24, 2, 1);                     // ovipositor
    if (ph === 3) {                                                           // ruptured: brood seeping out
      blob(c, 17, 28, 4.2, 3, ['#140404', '#2a0808', '#4a1010'], 2, -0.2);
      for (const [x, y] of [[15, 27], [18, 28], [16, 29], [19, 27]]) { R(c, BRE[3], x, y); R(c, BRE[4], x, y - 1 + (x & 1)); }
      R(c, BRE[2], 16, 31, 1, 3); R(c, BRE[3], 16, 34, 1, 1); R(c, BRE[2], 19, 31, 1, 2);
    }
    if (ph >= 2) xbCrack(c, [[12, 15], [14, 18], [12, 21]], null);
  });
  part(ctx, 56, 40, c => {                                                   // thorax and head
    blob(c, 31, 19 + by, 7.5, 6.5, XCH, 2.2, 0.1);
    R(c, XCH[6], 29, 13 + by, 4, 1); if (ph >= 2) xbCrack(c, [[30, 15 + by], [32, 19 + by]], null);
    const hx = 41 + (sc ? 1 : 0), hy = 18 + by - (sc ? 2 : 0);
    for (const [x, h] of [[hx - 4, 3], [hx - 2, 4], [hx, 3]]) { R(c, XCH[3], x, hy - 4 - h, 1, h); R(c, XCH[6], x, hy - 4 - h, 1, 1); }   // her crown of spines
    blob(c, hx, hy, 6, 5.2, XCH, 2.3, 0.12);
    pxLine(c, XCH[5], hx + 1, hy - 4, hx + 7, hy - 11 - (sc ? 1 : 0)); pxLine(c, XCH[4], hx - 1, hy - 4, hx + 3, hy - 12);   // antennae
    R(c, XCH[6], hx + 7, hy - 12, 1, 1); R(c, XCH[6], hx + 3, hy - 13, 1, 1);
    const eye = ph === 3 ? ['#ff2010', '#ffb080', '#ffffff'] : ['#c02818', '#ff7040', '#ffd0a0'];
    R(c, '#140606', hx - 1, hy - 3, 5, 4); R(c, eye[0], hx - 1, hy - 3, 4, 3); R(c, eye[1], hx, hy - 3, 2, 2); R(c, eye[2], hx + 1, hy - 3, 1, 1);   // compound eye
    const open = sc ? 4 : 1;                                                // mandibles
    pxLine(c, XCH[5], hx + 5, hy + 1, hx + 10, hy - open, 2); R(c, '#e8e2d0', hx + 10, hy - open, 1, 2);
    pxLine(c, XCH[4], hx + 5, hy + 2, hx + 10, hy + 2 + open, 2); R(c, '#e8e2d0', hx + 10, hy + 1 + open, 1, 2);
    if (sc) { R(c, '#3a0808', hx + 6, hy, 3, 2); R(c, '#ff6040', hx + 7, hy + 1, 1, 1); }
  });
  wings(false);
}
function drawOverseer(ctx, ph, pose) {               // 48x48 the overseer: an armoured eye on a thruster stalk; pose i | c (charging, lids narrowed). The iris is drawn live
  const ch = pose === 'c', cx = 24, cy = 22;
  part(ctx, 48, 48, c => {                                                   // stalk, fins, antenna
    limb(c, cx, 35, cx, 44, 4.2, 2.6, IRN, -0.05, true); R(c, IRN[6], cx - 3, 36, 2, 1); R(c, '#40e0ff', cx - 1, 45, 3, 1); R(c, '#ffffff', cx, 45, 1, 1);
    limb(c, 10, 24, 2, 33, 2.4, 1.4, IRN, 0, true); limb(c, 38, 24, 46, 33 + (ph >= 2 ? 2 : 0), 2.4, 1.4, IRN, 0.05, true);
    R(c, ph === 3 ? '#401010' : '#ff3020', 2, 33, 1, 1); R(c, '#40e0ff', 45, 33 + (ph >= 2 ? 2 : 0), 1, 1);
    limb(c, cx, 7, cx, 2, 1, 0.8, IRN, 0, true); R(c, '#ff3020', cx, 1, 1, 1);
    limb(c, 15, 9, 12, 4, 1.4, 1, IRN, 0, true); limb(c, 33, 9, 36, 4, 1.4, 1, IRN, 0, true);
  });
  part(ctx, 48, 48, c => {                                                   // the armoured housing
    const P = 2.4, ins = (x, y) => inBlob(x, y, cx, cy, 17, 16, P);
    blob(c, cx, cy, 17, 16, IRN, P, 0.06);
    for (let a = 0; a < 8; a++) { const t = a / 8 * Math.PI * 2 + 0.2; for (let r = 12; r < 16; r++) { const x = Math.round(cx + Math.cos(t) * r), y = Math.round(cy + Math.sin(t) * r * 0.94); if (ins(x, y)) R(c, IRN[1], x, y); } }   // panel seams
    for (const [px, py] of [[cx - 13, cy - 9], [cx + 12, cy - 9], [cx - 13, cy + 9], [cx + 12, cy + 9]]) { R(c, IRN[0], px, py, 3, 3); R(c, ph === 1 ? '#46e6ff' : ph === 2 ? '#1a4a58' : '#401010', px + 1, py + 1, 1, 1); }   // shield ports
    if (ph >= 2) { xbCrack(c, [[12, 12], [15, 15], [14, 19]], null); xbCrack(c, [[34, 31], [36, 34], [33, 36]], null); }
    if (ph === 3) for (const [x0, y0, w, h] of [[30, 8, 7, 5], [8, 26, 6, 6]]) for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (ins(x, y)) R(c, (y - y0) % 2 === 1 && (x - x0) % 5 < 4 ? ((x + y) % 4 ? '#c83a18' : '#ffb040') : '#1a0606', x, y);   // blown panels: hot wiring
  });
  part(ctx, 48, 48, c => {                                                   // the socket, the eye and its lids
    blob(c, cx, cy, 11.5, 11, IRN, 2, -0.25);
    blob(c, cx, cy, 9.4, 9.2, ph === 3 ? XSR : XSC, 2, 0.1);
    if (ph >= 2) for (const [x0, y0, x1, y1] of [[cx - 8, cy - 2, cx - 4, cy - 1], [cx + 8, cy + 3, cx + 4, cy + 2], [cx - 6, cy + 5, cx - 3, cy + 3]]) pxLine(c, ph === 3 ? '#ff7060' : '#c03030', x0, y0, x1, y1);   // bloodshot
    const lid = ch ? 5 : 2;
    for (let y = cy - 12; y < cy - 9 + lid; y++) for (let x = cx - 12; x <= cx + 12; x++) if (inBlob(x, y, cx, cy, 11.5, 11, 2)) R(c, y === cy - 10 + lid ? IRN[1] : IRN[y < cy - 9 ? 5 : 4], x, y);
    for (let y = cy + 10 - lid; y <= cy + 12; y++) for (let x = cx - 12; x <= cx + 12; x++) if (inBlob(x, y, cx, cy, 11.5, 11, 2)) R(c, y === cy + 10 - lid ? IRN[1] : IRN[3], x, y);
  });
}
function drawConductor(ctx, ph, pose) {              // 40x48 the conductor: a live wire in a tailcoat, a glass-domed head and a lightning baton; pose i | c (baton raised)
  const cast = pose === 'c', hot = ph === 3, CU = hot ? XCU.slice(2).concat(['#fff0c0']) : XCU;
  part(ctx, 40, 48, c => {                                                   // coat tails, trailing as it floats
    for (const [x0, len, sw, w0] of [[12, 14, -5, 6], [20, 16, -8, 7]]) for (let i = 0; i < len; i++) {
      const y = 31 + i, w = Math.max(1, Math.round(w0 - i * 0.38)), x = Math.round(x0 + sw * (i / len) * (i / len));
      if (ph >= 2 && x0 === 20 && i > len - 6 && i % 2) continue;             // a tail torn ragged
      R(c, XCT[i < 3 ? 3 : 2], x, y, w, 1); R(c, hot ? '#80e0ff' : XCT[4], x, y, 1, 1); R(c, XCT[1], x + w - 1, y, 1, 1);
    }
  });
  const arm = (sx, sy, hx, hy, back) => part(ctx, 40, 48, c => {
    const ex = (sx + hx) / 2 + (back ? -1 : 1), ey = (sy + hy) / 2 + 1;
    limb(c, sx, sy, ex, ey, 2.4, 2.1, XCT, back ? -0.2 : 0.05); limb(c, ex, ey, hx, hy, 2.1, 1.6, XCT, back ? -0.2 : 0.05);
    R(c, CU[4], Math.round(ex) - 1, Math.round(ey), 3, 1); blob(c, hx, hy, 1.9, 1.9, CU, 2, 0.1);
  });
  if (cast) arm(10, 17, 5, 6, true); else arm(10, 17, 7, 30, true);
  part(ctx, 40, 48, c => {                                                   // the coat, its copper waistcoat and lapels
    blob(c, 20, 25, 10.5, 11, XCT, 2.7, 0.05);
    for (let y = 18; y < 32; y += 2) { R(c, CU[3], 16, y, 8, 1); R(c, CU[5], 17, y, 3, 1); R(c, CU[1], 16, y + 1, 8, 1); }   // windings
    pxLine(c, XCT[5], 15, 16, 17, 30); pxLine(c, XCT[5], 25, 16, 23, 30); R(c, '#e8b422', 20, 32, 1, 1); R(c, '#e8b422', 20, 34, 1, 1);
    blob(c, 9.5, 17, 4, 2.8, CU, 2.2, 0.1); blob(c, 30.5, 17, 4, 2.8, CU, 2.2, 0.12);   // coil epaulettes
    for (const x of [7, 9, 11, 29, 31, 33]) R(c, CU[1], x, 16, 1, 3);
    if (ph >= 2) { R(c, XCT[0], 25, 27, 3, 3); R(c, '#80e0ff', 26, 28, 1, 1); R(c, XCT[0], 12, 31, 2, 2); }
    if (hot) { pxLine(c, '#80e0ff', 12, 21, 13, 33); pxLine(c, '#80e0ff', 28, 21, 27, 33); R(c, '#ffffff', 20, 24, 1, 1); }
    limb(c, 14, 14, 26, 14, 2.4, 2.4, CU, 0.05, true);                        // the coil collar
  });
  part(ctx, 40, 48, c => {                                                   // the glass dome and its filament
    blob(c, 20, 8, 7.4, 7, XGL, 2.1, 0.1);
    const F = hot ? '#ffffff' : '#c8faff';
    pxLine(c, F, 16, 12, 17, 6); pxLine(c, F, 17, 6, 20, 11); pxLine(c, F, 20, 11, 23, 6); pxLine(c, F, 23, 6, 24, 12);
    R(c, XGL[6], 15, 3, 2, 1); R(c, XGL[6], 14, 4, 1, 3);
    R(c, '#ffe060', 18, 8, 1, 1); R(c, '#ffe060', 22, 8, 1, 1);
    if (ph >= 2) { xbCrack(c, [[22, 1], [24, 4], [26, 5]], null); R(c, XGL[1], 24, 2, 2, 2); }
    R(c, CU[2], 14, 13, 13, 1); R(c, CU[4], 15, 13, 5, 1);                     // the dome's base ring
  });
  if (cast) arm(30, 17, 33, 6, false); else arm(30, 17, 33, 26, false);
  part(ctx, 40, 48, c => {                                                   // the baton, a lightning rod with a live tip
    const [x0, y0, x1, y1] = cast ? [33, 6, 36, 0] : [33, 26, 39, 20];
    pxLine(c, '#c8a040', x0, y0, x1, y1); pxLine(c, '#fff0a0', x0, y0 - 1, x1 - 1, y1);
    R(c, '#ffffff', x1, y1, 1, 1); R(c, '#80e0ff', x1 - 1, y1, 1, 1);
  });
}
function drawEyenode(ctx, f) {                       // 14x14 shield node: a steel octahedron round a cyan emitter
  for (let y = 0; y < 14; y++) for (let x = 0; x < 14; x++) {
    const dx = x - 6.5, dy = y - 6.5; if (Math.abs(dx) + Math.abs(dy) > 6.5) continue;
    R(ctx, IRN[dx < 0 && dy < 0 ? 6 : dx < 0 || dy < 0 ? 4 : 2], x, y);
  }
  R(ctx, IRN[0], 4, 4, 6, 6); R(ctx, '#1a6a80', 5, 5, 4, 4); R(ctx, f ? '#c8faff' : '#46e6ff', 6 - f, 6 - f, 2 + 2 * f, 2 + 2 * f); R(ctx, '#ffffff', 6, 6, 1, 1);
}
function drawEggsac(ctx, f) {                        // 14x16 egg sac: an amber sac on a goo foot; f 0 | 1 pulse | 2 hatching
  const sw = f ? 0.5 : 0;
  R(ctx, XCH[2], 2, 14, 10, 2); R(ctx, XCH[4], 3, 14, 7, 1);
  blob(ctx, 7, 8.5, 5.4 + sw, 6.4 + sw, ['#2a1008', '#4e200e', '#7a3814', '#a8561c', '#cc7a26', '#e8a238'], 2.1, f === 2 ? 0.2 : 0.06);
  blob(ctx, 7.5, 9.5, 2.6 + sw, 3.2 + sw, ['#e89a2a', '#ffd060', '#fff0a8'], 2, 0.1);   // the yolk glowing through
  for (const [x0, y0, x1, y1] of [[4, 4, 5, 12], [9, 3, 8, 13], [6, 2, 7, 7]]) pxLine(ctx, XCH[3], x0, y0, x1, y1);
  R(ctx, '#ffffff', 5, 5, 1, 1);
  if (f === 2) { pxLine(ctx, '#140606', 6, 3, 8, 8); pxLine(ctx, '#140606', 8, 8, 6, 12); R(ctx, '#ff3020', 7, 7, 1, 1); R(ctx, XCH[4], 11, 9, 2, 1); }
}
function drawXBlade(ctx, r) {                        // a launched saw blade (12x12, or 8x8 split off)
  const c0 = r + 2;
  for (let y = 0; y < c0 * 2; y++) for (let x = 0; x < c0 * 2; x++) {
    const dx = x + 0.5 - c0, dy = y + 0.5 - c0, d = Math.hypot(dx, dy), u = (((Math.atan2(dy, dx) / (Math.PI / 4)) % 1) + 1) % 1;
    if (d <= r - 0.5) R(ctx, d < 1.5 ? '#2a3038' : dx + dy < 0 ? '#c8d2dc' : '#7e8a9a', x, y);
    else if (d < r + 1.8 * (1 - u)) R(ctx, '#e8f0f8', x, y);
  }
}
function genExpansionBossArt(scene) {                 // their sheets: a frame per phase and pose, with white hit-flash copies
  const sheet = (key, w, h, names, draw) => addSheet(scene, key, names.map(n => ({ name: n, c: makeSprite(w, h, x => draw(x, +n[0], n.slice(1))) })), w, h, true);
  const per = poses => [1, 2, 3].flatMap(p => poses.map(q => p + q));
  sheet('crucible', 56, 48, per(['i', 't', 'v']), drawCrucible);
  sheet('grinder', 48, 48, per(['a', 'b', 'c', 'd']), (x, p, q) => drawGrinder(x, p, 'abcd'.indexOf(q)));
  sheet('queen', 56, 40, per(['a', 'b', 's']), drawQueen);
  sheet('overseer', 48, 48, per(['i', 'c']), drawOverseer);
  sheet('conductor', 40, 48, per(['i', 'c']), drawConductor);
  addSheet(scene, 'eyenode', ['n0', 'n1'].map((n, f) => ({ name: n, c: makeSprite(14, 14, x => drawEyenode(x, f)) })), 14, 14, true);
  addSheet(scene, 'eggsac', ['e0', 'e1', 'e2'].map((n, f) => ({ name: n, c: makeSprite(14, 16, x => drawEggsac(x, f)) })), 14, 16, true);
  addTex(scene, 'xblade', makeSprite(12, 12, x => drawXBlade(x, 4))); addTex(scene, 'xbladeS', makeSprite(8, 8, x => drawXBlade(x, 2)));
  addTex(scene, 'g_xtooth', makeSprite(6, 5, c => { R(c, '#d8e2ec', 1, 1, 3, 1); R(c, '#7e8a9a', 1, 2, 2, 1); R(c, '#d8e2ec', 1, 3, 1, 1); }));
  addTex(scene, 'g_xlens', makeSprite(6, 6, c => { R(c, '#f2ece4', 1, 1, 3, 3); R(c, '#46e6ff', 2, 2, 2, 2); R(c, '#07080b', 3, 3, 1, 1); }));
  addTex(scene, 'g_xcoil', makeSprite(7, 5, c => { for (let i = 0; i < 3; i++) R(c, XCU[i % 2 ? 3 : 5], 1 + i * 2, 1, 1, 3); R(c, XCU[1], 1, 3, 5, 1); }));
}
function buildRagParts(scene) {
  const put = (key, c) => { addTex(scene, key, c); addTex(scene, key + '_w', whiteCopy(c)); };   // + white hit-flash copy
  for (const kind in RAG) {
    const D = RAG[kind], lw = D.legW || 3;
    const src = makeSprite(D.fw, D.fh, D.body, null), sx = src.getContext('2d');
    (D.clear || []).forEach(([x, y, w, h]) => sx.clearRect(x, y, w, h));
    const cut = (cv, [x, y, w, h], stump) => {
      const { c, ctx } = mkCanvas(w + 2, h + 2);
      ctx.drawImage(cv, x, y, w, h, 1, 1, w, h);
      if (stump) {                                                     // raw neck stump where the head was
        const d = ctx.getImageData(0, 0, w + 2, h + 2).data, op = (i, j) => d[(j * (w + 2) + i) * 4 + 3] > 0;
        if (D.up) { let j0 = 1; while (j0 < h && ![...Array(w + 2).keys()].some(i => op(i, j0))) j0++;
          for (let i = 0; i < w + 2; i++) { if (op(i, j0)) R(ctx, i % 3 ? '#a01818' : '#6a0c0c', i, j0); if (op(i, j0 + 1) && i % 2) R(ctx, '#5a0a0a', i, j0 + 1); }
          R(ctx, '#ddd3b0', (w + 2) >> 1, j0); }
        else { let i0 = w; while (i0 > 1 && ![...Array(h + 2).keys()].some(j => op(i0, j))) i0--;
          for (let j = 0; j < h + 2; j++) { if (op(i0, j)) R(ctx, j % 3 ? '#a01818' : '#6a0c0c', i0, j); if (op(i0 - 1, j) && j % 2) R(ctx, '#5a0a0a', i0 - 1, j); }
          R(ctx, '#ddd3b0', i0, (h + 2) >> 1); }
      }
      outlineCanvas(ctx, w + 2, h + 2, '#06070a');
      return c;
    };
    put(`rg_${kind}_head`, cut(src, D.head));
    put(`rg_${kind}_torso`, cut(src, D.torso));
    put(`rg_${kind}_torsoX`, cut(src, D.torso, true));
    const legSrc = makeSprite(D.fw, D.fh, D.leg || (x => drawPLeg(x, 9, 15, 0, 0, false, D.P, lw)), null);
    put(`rg_${kind}_thigh`, cut(legSrc, D.thigh || [8, 15, lw, 3]));
    put(`rg_${kind}_shin`, cut(legSrc, D.shin || [8, 18, lw + 1, 5]));
    if (D.P) put(`rg_${kind}_arm`, makeSprite(D.blade ? 4 : 5, D.blade ? 11 : 9, c => {
      if (D.blade) { R(c, ST.skin, 1, 1, 2, 5); R(c, ST.skinD, 2, 1, 1, 5); R(c, ST.blade, 2, 6, 1, 4); R(c, ST.bladeHi, 2, 6, 1, 1); }
      else { const P = D.P; R(c, P.b, 1, 1, 3, 5); R(c, P.c, 1, 1, 1, 5); R(c, P.a, 3, 1, 1, 5); R(c, P.k, 1, 6, 3, 2); }
    }, '#06070a'));
  }
}
function drawRifle(ctx, arm) {                   // 24x11, pivot (2,5)
  if (arm) drawArm(ctx, 5, ENLEG);
  R(ctx, '#2a2e35', 6, 3, 10, 3); R(ctx, '#4a525c', 6, 3, 10, 1); R(ctx, '#1e2126', 10, 6, 2, 3);
  R(ctx, '#1e2126', 9, 2, 3, 1); R(ctx, '#3a3f47', 16, 4, 5, 1); R(ctx, '#8a94a0', 21, 4, 1, 1); R(ctx, '#ff3a2a', 15, 5, 1, 1);
}

// ---- weapons (drawn pointing right; pivot = shoulder at x=2, y=py) -------------
function drawArm(ctx, py, P = PLEG) {
  R(ctx, P.b, 1, py - 1, 5, 3); R(ctx, P.c, 1, py - 1, 4, 1); R(ctx, P.a, 1, py + 1, 5, 1); R(ctx, P.k, 5, py - 1, 2, 3);
}
// ---- expansion: enemies --------------------------------------------------------
// Ten foes for OVERTIME, the DAILY and the Lab. Each faces right; the parts they swing, aim or throw (a ball and
// chain, a turret, a bundle of dynamite, a water jet) are their own sprites or drawn live.
const XLTH = ['#1a0e08', '#2e180e', '#4a2616', '#6a3a20', '#8c522e'];           // leather
const XRUB = ['#3a2a06', '#6a4e0c', '#a07810', '#d0a020', '#f0c840'];           // yellow rubber
const XTNK = ['#0e1a2e', '#1a3050', '#2a5080', '#4a80b8', '#8ac0e8'];           // blue steel
const XOLV = ['#14180e', '#222a16', '#343f22', '#4a5a30', '#66783f', '#8a9a5a']; // olive drab
const XBNE = ['#3a3630', '#6a6458', '#a8a090', '#d8d0c0', '#f4eee0'];           // bone plate
const XGUL = ['#2a2c30', '#4a4e56', '#7a808a', '#b0b8c2', '#e0e6ec'];           // gull grey
const XVIO = ['#160a22', '#2a1440', '#422266', '#5e348c', '#8050b8'];           // illusionist's cloak
const XSKN = ['#3a1e14', '#5e3424', '#8a5038', '#b07050'];
function xArc(ctx, cx, cy, r, a0, a1, col, w = 1) {  // a curved blade: an arc of pixels, w thick at its root tapering to a point
  const n = Math.ceil(Math.abs(a1 - a0) * r * 1.5) + 1;
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = a0 + (a1 - a0) * t, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r, k = Math.max(1, Math.round(w * (1 - t)));
    for (let j = 0; j < k; j++) R(ctx, col, Math.round(x - Math.cos(a) * j), Math.round(y - Math.sin(a) * j));
  }
}
function drawFlailer(ctx, frame) {                   // 24x24 flailer: a mail-clad brute in a bucket helm (its ball and chain are drawn live)
  const s = frame === 'w1' ? 1 : 0, wd = frame === 'wind', th = frame === 'throw', by = wd ? 1 : s ? -1 : 0;
  // Thick legs in leather breeches + iron sabatons
  limb(ctx, 9, 15 + by, 8 - s, 21, 2.2, 1.8, XLTH, -0.2); R(ctx, '#2a2e35', 5 - s, 21, 6, 3); R(ctx, '#5d6775', 6 - s, 21, 4, 1);
  limb(ctx, 14, 15 + by, 15 + s, 21, 2.2, 1.8, XLTH, 0.2); R(ctx, '#2a2e35', 13 + s, 21, 6, 3); R(ctx, '#7f8a99', 14 + s, 21, 4, 1);
  // Back arm hanging at its side
  limb(ctx, 7, 9 + by, 5, 15 + by, 1.7, 1.5, XLTH, -0.3);
  // Barrel chest in chainmail, a blood-red tabard and a studded belt
  blob(ctx, 11.5, 11 + by, 6.2, 5.6, IRN.slice(1, 7));
  for (let y = 7; y < 16; y++) for (let x = 6 + (y & 1); x < 18; x += 2) if (inBlob(x, y - by, 11.5, 11, 5.4, 4.8, 2)) R(ctx, '#232730', x, y);
  R(ctx, '#6a1610', 9, 10 + by, 5, 7); R(ctx, '#a82a1e', 10, 10 + by, 3, 6); R(ctx, '#d84a30', 10, 10 + by, 1, 5);
  R(ctx, '#3a2010', 6, 15 + by, 12, 2); for (let i = 0; i < 4; i++) R(ctx, '#c8d0da', 7 + i * 3, 15 + by, 1, 1);
  R(ctx, '#5d6775', 4, 7 + by, 5, 3); R(ctx, '#aab4c2', 5, 7 + by, 2, 1); R(ctx, '#c8d0da', 3, 6 + by, 1, 1);           // pauldron + spike
  // Bucket helm with a cross slit and one ember eye
  blob(ctx, 12.5, 4.5 + by, 3.8, 3.8, IRN.slice(2), 4);
  R(ctx, '#aab4c2', 10, 1 + by, 4, 1); R(ctx, '#0a0a0c', 12, 4 + by, 5, 1); R(ctx, '#0a0a0c', 14, 3 + by, 1, 3); R(ctx, '#ff5a1a', 15, 4 + by, 1, 1);
  // Front arm: chain fist at the chest (whirling), cocked over the shoulder (wind-up), punched out (throw)
  const [hx, hy] = th ? [21, 10] : wd ? [9, 3] : [16, 10];
  limb(ctx, 14, 9 + by, hx, hy + by, 1.9, 1.7, XLTH, 0.1);
  R(ctx, '#3a3f47', hx - 1, hy - 1 + by, 3, 3); R(ctx, '#8a94a0', hx - 1, hy - 1 + by, 2, 1);                           // gauntlet
}
function drawHoser(ctx, frame) {                     // 18x24 hoser: a trooper in a rubber suit with a water tank and a fire hose
  const s = frame === 'w1' ? 1 : 0, br = frame === 'brace' || frame === 'spray', sp = frame === 'spray', by = br ? 1 : 0, fs = br ? 2 : s;
  // Rubber-booted legs, braced wide against the kick of the hose
  limb(ctx, 7, 15 + by, 6 - fs, 22, 1.6, 1.5, XRUB, -0.2); R(ctx, '#141210', 4 - fs, 22, 5, 2);
  limb(ctx, 11, 15 + by, 12 + fs, 22, 1.6, 1.5, XRUB, 0.2); R(ctx, '#141210', 10 + fs, 22, 5, 2);
  // The water tank on its back: blue steel, a valve and a pressure gauge
  limb(ctx, 3, 8 + by, 3, 16 + by, 2.6, 2.6, XTNK, -0.2, true); R(ctx, '#c8d0da', 2, 5 + by, 3, 2); R(ctx, '#ffffff', 2, 10 + by, 1, 3);
  R(ctx, '#e8e8e0', 3, 12 + by, 2, 2); R(ctx, '#ff3020', 4, 12 + by, 1, 1);
  // Rubber suit with reflective bands
  blob(ctx, 9.5, 11.5 + by, 4.6, 5, XRUB);
  R(ctx, '#e0e8f0', 6, 12 + by, 8, 1); R(ctx, '#8a94a0', 6, 13 + by, 8, 1);
  // Helmet with a wide brim and a fogged faceplate
  blob(ctx, 10, 4.6 + by, 3.4, 3.2, XRUB);
  R(ctx, '#a07810', 6, 6 + by, 9, 1); R(ctx, '#1a2a3a', 10, 3 + by, 4, 3); R(ctx, '#6ab8e0', 11, 4 + by, 3, 1); R(ctx, '#ffffff', 13, 4 + by, 1, 1);
  // The hose over its shoulder down to a brass nozzle held in both hands
  pxLine(ctx, '#1a1a1e', 3, 6 + by, 7, 8 + by, 1); pxLine(ctx, '#1a1a1e', 7, 8 + by, 12, 12 + (br ? 0 : 1) + by, 1);
  const ny = br ? 10 : 12;
  limb(ctx, 10, 9 + by, 14, ny + by, 1.4, 1.2, XRUB, 0.1);
  R(ctx, '#22262c', 12, ny - 1 + by, 3, 3); R(ctx, '#c8a040', 15, ny + by, 3, 2); R(ctx, '#ffe080', 15, ny + by, 3, 1);
  if (sp) R(ctx, '#bfe8ff', 17, ny - 1 + by, 1, 4);
}
function drawDemo(ctx, frame) {                      // 16x22 demo runner: a wiry sprinter clutching a bundle of lit dynamite
  const a = frame === 'air', lt = frame === 'light', s = frame === 'r1' ? 1 : 0, PNT = ['#141420', '#24243a', '#3a3a5a', '#56567a'];
  // Legs in full stride, tucked for a hop, or planted while it lights the fuse
  if (lt) { limb(ctx, 6, 13, 4, 20, 1.4, 1.2, PNT, -0.2); limb(ctx, 9, 13, 11, 20, 1.4, 1.2, PNT); R(ctx, '#c8c0b0', 2, 20, 4, 2); R(ctx, '#e8e0d0', 10, 20, 4, 2); }
  else if (a) { limb(ctx, 6, 13, 3, 17, 1.4, 1.2, PNT); limb(ctx, 9, 13, 12, 16, 1.4, 1.2, PNT); R(ctx, '#e8e0d0', 1, 17, 3, 2); R(ctx, '#e8e0d0', 11, 16, 3, 2); }
  else {
    const [fx, bx, by] = s ? [11, 3, 17] : [12, 2, 18];
    limb(ctx, 7, 13, bx, by, 1.4, 1.2, PNT, -0.3); R(ctx, '#c8c0b0', bx - 2, by, 3, 2);
    limb(ctx, 8, 13, fx - 2, 17, 1.5, 1.3, PNT); limb(ctx, fx - 2, 17, fx, 20, 1.3, 1.2, PNT); R(ctx, '#e8e0d0', fx - 1, 20, 4, 2);
  }
  // Lean torso in a striped vest, pitched forward into the run
  blob(ctx, 8, 9.5, 3.4, 4, ['#3a0c0c', '#6a1612', '#9a2418', '#c03a28']);
  for (let i = 0; i < 3; i++) R(ctx, '#e8e0d0', 6, 8 + i * 2, 5, 1);
  // Head with a red bandana and welding goggles
  blob(ctx, 10, 4, 2.8, 2.8, XSKN);
  R(ctx, '#c02020', 8, 1, 5, 2); R(ctx, '#c02020', 5, 2, 3, 1); R(ctx, '#ff5a40', 9, 1, 2, 1);
  R(ctx, '#2a2e35', 10, 3, 4, 1); R(ctx, '#ffe040', 12, 3, 1, 1);
  // Both arms out front clutching three sticks of dynamite taped together, the fuse on top
  limb(ctx, 9, 8, 12, 11, 1.1, 1.0, XSKN);
  R(ctx, '#6a0c0c', 12, 9, 4, 5); R(ctx, '#d02818', 12, 9, 1, 5); R(ctx, '#d02818', 14, 9, 1, 5); R(ctx, '#ff6a50', 12, 9, 1, 1);
  R(ctx, '#e8b422', 12, 11, 4, 1); R(ctx, '#8a8a80', 14, 7, 1, 2);
  if (lt) { R(ctx, '#ffe46a', 13, 5, 3, 2); R(ctx, '#ffffff', 14, 5, 1, 1); }                                              // the match flaring at the fuse
}
function drawPanzer(ctx, frame) {                    // 30x20 panzer: a treaded mini-tank hull behind a thick glacis plate (the turret is its own sprite)
  const s = frame === 'w1' ? 1 : 0;
  // The track loop, road wheels and cleats
  blob(ctx, 15, 16.2, 14.2, 3.6, IRN.slice(0, 5), 3);
  for (let i = 0; i < 6; i++) { const wx = 4.5 + i * 4.2; blob(ctx, wx, 16.5, 1.9, 1.9, IRN.slice(3)); R(ctx, '#0c0e12', Math.round(wx) - 1, 16, 1, 1); }
  for (let i = 0; i < 13; i++) { R(ctx, '#5d6775', 2 + i * 2 + s, 13, 1, 1); R(ctx, '#323843', 3 + i * 2 - s, 19, 1, 1); }
  // Hull: an olive armour box with a hazard stripe; the engine deck at the back glows through its grille (its soft spot)
  blob(ctx, 14, 10, 11.5, 3.4, XOLV, 4);
  R(ctx, '#e8b422', 8, 11, 14, 1); for (let i = 0; i < 4; i++) R(ctx, '#15161a', 9 + i * 4, 11, 2, 1);
  R(ctx, '#1a1c20', 2, 8, 5, 5); for (let y = 0; y < 4; y++) R(ctx, y % 2 ? '#c04010' : '#ff8a20', 3, 9 + y, 3, 1);
  R(ctx, '#3a3f47', 1, 5, 2, 4); R(ctx, '#5d6775', 1, 5, 2, 1);                                                          // exhaust stack
  // Front glacis: a thick sloped plate with rivets, a coax gun and a headlight
  for (let y = 7; y < 14; y++) { const w = 3 + ((y - 7) >> 1); R(ctx, y < 9 ? '#aab4c2' : y < 11 ? '#7f8a99' : '#5d6775', 24 - ((y - 7) >> 2), y, w, 1); }
  R(ctx, '#232730', 25, 9, 1, 1); R(ctx, '#232730', 26, 12, 1, 1); R(ctx, '#ffe080', 28, 10, 1, 1);
  R(ctx, '#232730', 27, 11, 3, 1); R(ctx, '#0c0e12', 29, 11, 1, 1);
  R(ctx, '#232730', 10, 6, 10, 2); R(ctx, '#4a5a30', 11, 6, 8, 1);                                                      // turret ring
}
function drawPanzerGun(ctx) {                        // 18x9 panzer turret: a domed mantlet and a long barrel, pivot at (5, 4.5)
  blob(ctx, 5, 4.5, 4.5, 3.6, XOLV);
  R(ctx, '#e8b422', 2, 6, 6, 1);
  limb(ctx, 8, 4, 16, 4, 1.4, 1.2, IRN.slice(2), 0, true); R(ctx, '#3a3f47', 15, 3, 3, 3); R(ctx, '#0c0e12', 17, 4, 1, 1);
  R(ctx, '#aab4c2', 3, 2, 3, 1); R(ctx, '#ff3020', 6, 3, 1, 1);
}
function drawReaper(ctx, frame) {                    // 22x32 reaper: a gaunt robot on stilt legs with two scythe arms
  const s = frame === 'w1' ? 1 : 0, tl = frame === 'tell', sp = frame === 'spin0' || frame === 'spin1', sp1 = frame === 'spin1', dz = frame === 'dizzy';
  const by = tl ? 2 : dz ? 1 : 0, LG = IRN.slice(2), BL = '#d8e0e8', BLD = '#8a94a0';
  // Stilt legs: pistons with reverse knees
  limb(ctx, 9, 18 + by, 6 - s, 24, 1.3, 1.1, LG, -0.3); limb(ctx, 6 - s, 24, 8 - s, 30, 1.1, 1.0, LG); R(ctx, '#141618', 5 - s, 30, 5, 2);
  limb(ctx, 13, 18 + by, 16 + s, 24, 1.3, 1.1, LG, 0.3); limb(ctx, 16 + s, 24, 14 + s, 30, 1.1, 1.0, LG); R(ctx, '#141618', 12 + s, 30, 5, 2);
  R(ctx, '#7f8a99', 5 - s, 23, 2, 2); R(ctx, '#aab4c2', 15 + s, 23, 2, 2);
  // Back scythe arm (behind the body)
  if (sp) { limb(ctx, 9, 10 + by, 2, 11 + by, 1.1, 1.0, LG); xArc(ctx, 2, sp1 ? 6 : 16, 5, sp1 ? Math.PI / 2 : -Math.PI / 2, sp1 ? Math.PI * 1.25 : -Math.PI * 1.25, BLD, 2); }
  else if (tl) { limb(ctx, 9, 10 + by, 6, 3, 1.1, 1.0, LG); xArc(ctx, 3, 4, 3.5, 0, -Math.PI * 1.1, BLD, 2); }
  else if (dz) { limb(ctx, 9, 10 + by, 6, 18, 1.1, 1.0, LG); xArc(ctx, 6, 22, 4, -Math.PI / 2, -Math.PI * 1.2, BLD, 2); }
  else { limb(ctx, 9, 10 + by, 6, 16, 1.1, 1.0, LG); xArc(ctx, 6, 11, 5, Math.PI / 2, Math.PI * 1.2, BLD, 2); }
  // Ribbed chest cage and pelvis with a red core
  R(ctx, '#2a2e35', 9, 16 + by, 5, 3);
  blob(ctx, 11, 12 + by, 4.2, 5, IRN.slice(1, 7));
  for (let i = 0; i < 3; i++) R(ctx, '#0c0e12', 8, 10 + i * 2 + by, 6, 1);
  R(ctx, '#ff2a1a', 10, 12 + by, 2, 2); R(ctx, '#ffb0a0', 10, 12 + by, 1, 1);
  // Skull head: a bone plate with a single red eye slit (dim and askew when it's dizzy)
  blob(ctx, 11.5 + (dz ? 1 : 0), 5 + by, 3.4, 3.6, XBNE);
  R(ctx, '#0a0a0c', 11 + (dz ? 1 : 0), 5 + by, 4, 1); R(ctx, dz ? '#7a2010' : '#ff3020', 13 + (dz ? 1 : 0), 5 + by, 2, 1); R(ctx, '#0a0a0c', 11 + (dz ? 1 : 0), 7 + by, 3, 1);
  // Front scythe arm
  if (sp) { limb(ctx, 13, 10 + by, 20, 11 + by, 1.2, 1.1, LG); xArc(ctx, 20, sp1 ? 16 : 6, 5, sp1 ? -Math.PI / 2 : Math.PI / 2, sp1 ? Math.PI * 0.25 : -Math.PI * 0.25, BL, 2); }
  else if (tl) { limb(ctx, 13, 10 + by, 17, 2, 1.2, 1.1, LG); xArc(ctx, 19, 4, 3.5, Math.PI, Math.PI * 2.1, BL, 2); }
  else if (dz) { limb(ctx, 13, 10 + by, 15, 19, 1.2, 1.1, LG); xArc(ctx, 15, 23, 4, -Math.PI / 2, Math.PI * 0.2, BL, 2); }
  else { limb(ctx, 13, 10 + by, 16, 16, 1.2, 1.1, LG); xArc(ctx, 16, 11, 5, Math.PI / 2, -Math.PI * 0.2, BL, 2); }
}
function drawGull(ctx, frame) {                      // 22x14 gull: a carrion drone in scrap feathers with a hooked beak
  const up = frame === 'f0', dv = frame === 'dive', sc = frame === 'scream', K = '#141618';
  const wing = (pts, cols) => { for (let i = 0; i < pts.length - 1; i++) pxLine(ctx, cols[Math.min(i, cols.length - 1)], pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 2); };
  // Far wing, behind the body (darker)
  if (dv) wing([[12, 5], [8, 4], [4, 4]], ['#4a4e56', '#2a2c30']);
  else if (up) wing([[12, 5], [11, 2], [9, 0]], ['#4a4e56', '#2a2c30']);
  else wing([[12, 8], [12, 11], [11, 12]], ['#4a4e56', '#2a2c30']);
  // Tail fan + a sleek body: dark steel back, pale belly, rivets along the spine
  R(ctx, '#4a4e56', 2, 6, 4, 3); R(ctx, '#7a808a', 1, 7, 3, 1); R(ctx, K, 0, 7, 1, 2);
  blob(ctx, 10, 8, 6, 2.8, XGUL);
  R(ctx, '#4a4e56', 6, 6, 8, 1); R(ctx, '#e0e6ec', 7, 10, 7, 1); for (let i = 0; i < 3; i++) R(ctx, K, 7 + i * 3, 6, 1, 1);
  // Head, red eye and a hooked beak (gaping when it screeches)
  blob(ctx, 16, 6.5, 2.7, 2.5, XGUL);
  R(ctx, '#ff3020', 17, 6, 1, 1); R(ctx, '#ffb0a0', 17, 5, 1, 1);
  R(ctx, '#e8b422', 18, sc ? 5 : 6, 3, 1); R(ctx, '#c08a14', 21, sc ? 5 : 6, 1, 2);
  if (sc) { R(ctx, '#7a1a14', 18, 6, 3, 1); R(ctx, '#c08a14', 18, 7, 3, 1); }
  // Near wing: raised, beating down, or folded back for the dive, with black tips
  if (dv) { wing([[13, 7], [9, 5], [5, 5], [2, 4]], ['#e0e6ec', '#b0b8c2', '#7a808a']); R(ctx, K, 1, 4, 2, 1); }
  else if (up) { wing([[12, 7], [10, 3], [7, 1], [5, 0]], ['#e0e6ec', '#b0b8c2', '#7a808a']); R(ctx, K, 4, 0, 2, 1); R(ctx, K, 6, 2, 1, 1); }
  else { wing([[12, 8], [10, 11], [8, 12], [6, 12]], ['#e0e6ec', '#b0b8c2', '#7a808a']); R(ctx, K, 5, 12, 2, 1); R(ctx, K, 7, 13, 1, 1); }
}
function drawOverclock(ctx, frame) {                 // 16x16 overclocker: a hovering capacitor drone around a glowing yellow coil
  const f = frame === 'o1' ? 1 : 0;
  R(ctx, '#2a2e35', 3 + f, 0, 10 - 2 * f, 1); R(ctx, '#5d6775', 7, 1, 2, 2);                                             // rotor
  for (let i = 0; i < 3; i++) { const c = (i + f) % 2 ? '#aab4c2' : '#5d6775'; R(ctx, c, 0, 5 + i * 2, 3, 1); R(ctx, c, 13, 5 + i * 2, 3, 1); }   // cooling fins
  blob(ctx, 8, 8, 5, 4.6, IRN.slice(2), 3);
  R(ctx, '#e8b422', 4, 11, 8, 1); R(ctx, '#15161a', 5, 11, 1, 1); R(ctx, '#15161a', 8, 11, 1, 1); R(ctx, '#15161a', 11, 11, 1, 1);
  R(ctx, '#3a2006', 6, 5, 4, 5); for (let i = 0; i < 5; i++) R(ctx, (i + f) % 2 ? '#fff4b0' : '#ffc830', 6, 5 + i, 4, 1);   // the coil window
  R(ctx, '#5d6775', 5, 13, 1, 2); R(ctx, '#5d6775', 10, 13, 1, 2); R(ctx, '#ffe060', 5, 15, 1, 1); R(ctx, '#ffe060', 10, 15, 1, 1);   // emitter prongs
}
function drawRefractor(ctx, frame) {                 // 18x18 refractor: a tripod turret under a faceted prism
  const ch = frame === 'charge', g = frame === 'p1';
  pxLine(ctx, '#2a2e35', 8, 12, 3, 17, 2); pxLine(ctx, '#2a2e35', 10, 12, 15, 17, 2); R(ctx, '#3a3f47', 8, 12, 3, 6);   // tripod
  R(ctx, '#5d6775', 5, 11, 9, 2); R(ctx, '#8a94a0', 5, 11, 9, 1);
  R(ctx, '#3a3f47', 4, 4, 2, 8); R(ctx, '#3a3f47', 13, 4, 2, 8); R(ctx, '#7f8a99', 4, 4, 1, 3);                          // gimbal yoke
  const CR = ch ? ['#6ad8f0', '#c8f8ff', '#ffffff'] : ['#145a78', '#2a9ac0', '#6ad8f0'];
  for (let y = 0; y < 11; y++) { const w = 5 - Math.abs(y - 5); if (w <= 0) continue; R(ctx, CR[0], 9.5 - w, y + 1, w, 1); R(ctx, CR[1], 9.5, y + 1, w, 1); }
  R(ctx, CR[2], 9, 3, 1, 3); R(ctx, CR[2], 10, 5, 2, 1); if (g || ch) R(ctx, '#ffffff', 8, 4, 1, 1);
  R(ctx, '#0a2a3a', 13, 6, 2, 1); R(ctx, ch ? '#ffffff' : '#60e8ff', 15, 6, 1, 1);                                        // emitter lens
}
function drawMirage(ctx, frame) {                    // 16x24 mirage: a hooded illusionist in a cracked porcelain mask
  const s = frame === 'w1' ? 1 : 0, ca = frame === 'cast', fi = frame === 'fire';
  R(ctx, '#141018', 5 - s, 21, 3, 3); R(ctx, '#141018', 9 + s, 21, 3, 3);
  blob(ctx, 8, 16.5, 5, 5.5, XVIO); R(ctx, '#46e6ff', 3, 21, 10, 1); R(ctx, '#2a8ab0', 4, 22, 8, 1);                    // cloak, holo-trim hem
  blob(ctx, 8, 10, 4.2, 4.6, XVIO);
  R(ctx, '#46e6ff', 7, 8, 1, 6); R(ctx, '#2a8ab0', 7, 14, 1, 1);                                                        // seam
  blob(ctx, 8.5, 4.5, 3.6, 3.8, XVIO);
  R(ctx, '#e8e4dc', 9, 3, 3, 4); R(ctx, '#b8b0a8', 9, 6, 3, 1); R(ctx, '#46e6ff', 10, 4, 1, 1); R(ctx, '#3a3040', 11, 2, 1, 3);   // mask, eye, crack
  if (ca) { limb(ctx, 6, 8, 3, 2, 1.1, 1.0, XVIO); limb(ctx, 11, 8, 14, 2, 1.1, 1.0, XVIO); R(ctx, '#ffffff', 2, 1, 2, 2); R(ctx, '#ffffff', 13, 1, 2, 2); R(ctx, '#46e6ff', 4, 0, 9, 1); }
  else if (fi) { limb(ctx, 10, 8, 14, 10, 1.1, 1.0, XVIO); R(ctx, '#2a2e35', 13, 9, 3, 3); R(ctx, '#ff60e0', 15, 10, 1, 1); }
  else { limb(ctx, 10, 8, 11, 13, 1.1, 1.0, XVIO); R(ctx, '#2a2e35', 10, 13, 2, 2); }
}
function drawClinger(ctx, frame) {                   // 12x12 clinger: a magnetic limpet bomb on a little thruster, claws out
  const f = frame === 'c1' ? 1 : 0, cl = frame === 'clamp';
  if (cl) { R(ctx, '#5d6775', 1, 3, 1, 3); R(ctx, '#5d6775', 10, 3, 1, 3); R(ctx, '#5d6775', 1, 8, 2, 1); R(ctx, '#5d6775', 9, 8, 2, 1); }
  else { R(ctx, '#5d6775', 0, 2 + f, 2, 1); R(ctx, '#5d6775', 10, 2 + f, 2, 1); R(ctx, '#5d6775', 0, 9 - f, 2, 1); R(ctx, '#5d6775', 10, 9 - f, 2, 1); }
  blob(ctx, 6, 6, 4, 4, IRN.slice(2));
  R(ctx, '#8a1414', 2, 7, 8, 1); R(ctx, '#e02a1a', 3, 7, 6, 1);                                                           // magnet band
  R(ctx, cl || f ? '#ff3020' : '#6a1010', 5, 3, 2, 2); if (cl || f) R(ctx, '#ffffff', 5, 3, 1, 1);                        // the LED
  R(ctx, '#3a3f47', 0, 5, 1, 2); R(ctx, f ? '#ffa040' : '#ff6020', 0, 5 + f, 1, 1);                                       // thruster nub
}
const XGIBDEF = {                                    // their own loose parts
  g_hosetank: [6, 8, c => { R(c, '#2a5080', 1, 1, 4, 6); R(c, '#8ac0e8', 1, 1, 1, 6); R(c, '#c8d0da', 2, 1, 2, 1); }],
  g_tnt: [7, 4, c => { R(c, '#d02818', 1, 1, 5, 2); R(c, '#ff6a50', 1, 1, 5, 1); R(c, '#e8b422', 3, 1, 1, 2); }],
  g_tread: [10, 4, c => { R(c, '#232730', 1, 1, 8, 2); for (let i = 0; i < 4; i++) R(c, '#5d6775', 1 + i * 2, 1, 1, 1); }],
  g_scythe: [9, 7, c => { R(c, '#d8e0e8', 1, 1, 5, 1); R(c, '#d8e0e8', 6, 2, 1, 2); R(c, '#8a94a0', 7, 4, 1, 2); R(c, '#454d5a', 1, 2, 2, 1); }],
  g_feather: [7, 3, c => { R(c, '#7a808a', 1, 1, 5, 1); R(c, '#b0b8c2', 2, 1, 2, 1); }],
  g_coil: [6, 6, c => { R(c, '#3a2006', 1, 1, 4, 4); R(c, '#ffc830', 1, 1, 4, 1); R(c, '#ffc830', 1, 3, 4, 1); R(c, '#fff4b0', 2, 1, 1, 1); }],
  g_prism: [5, 5, c => { R(c, '#2a9ac0', 1, 2, 3, 1); R(c, '#6ad8f0', 2, 1, 1, 3); R(c, '#ffffff', 2, 2, 1, 1); }],
  g_xmask: [7, 7, c => { R(c, '#e8e4dc', 1, 1, 5, 5); R(c, '#b8b0a8', 1, 5, 5, 1); R(c, '#46e6ff', 2, 3, 1, 1); R(c, '#3a3040', 4, 1, 1, 3); }],
};
function genExpansionEnemyArt(scene) {               // their sheets (+ the white copies a hit flashes), loose parts and props
  addSheet(scene, 'flailer', ['w0', 'w1', 'wind', 'throw'].map(f => ({ name: f, c: makeSprite(24, 24, x => drawFlailer(x, f)) })), 24, 24, true);
  addSheet(scene, 'hoser', ['w0', 'w1', 'brace', 'spray'].map(f => ({ name: f, c: makeSprite(18, 24, x => drawHoser(x, f)) })), 18, 24, true);
  addSheet(scene, 'demo', ['r0', 'r1', 'air', 'light'].map(f => ({ name: f, c: makeSprite(16, 22, x => drawDemo(x, f)) })), 16, 22, true);
  addSheet(scene, 'panzer', ['w0', 'w1'].map(f => ({ name: f, c: makeSprite(30, 20, x => drawPanzer(x, f)) })), 30, 20, true);
  addSheet(scene, 'reaper', ['w0', 'w1', 'tell', 'spin0', 'spin1', 'dizzy'].map(f => ({ name: f, c: makeSprite(22, 32, x => drawReaper(x, f)) })), 22, 32, true);
  addSheet(scene, 'gull', ['f0', 'f1', 'scream', 'dive'].map(f => ({ name: f, c: makeSprite(22, 14, x => drawGull(x, f)) })), 22, 14, true);
  addSheet(scene, 'overclock', ['o0', 'o1'].map(f => ({ name: f, c: makeSprite(16, 16, x => drawOverclock(x, f)) })), 16, 16, true);
  addSheet(scene, 'refractor', ['p0', 'p1', 'charge'].map(f => ({ name: f, c: makeSprite(18, 18, x => drawRefractor(x, f)) })), 18, 18, true);
  addSheet(scene, 'mirage', ['w0', 'w1', 'cast', 'fire'].map(f => ({ name: f, c: makeSprite(16, 24, x => drawMirage(x, f)) })), 16, 24, true);
  addSheet(scene, 'clinger', ['c0', 'c1', 'clamp'].map(f => ({ name: f, c: makeSprite(12, 12, x => drawClinger(x, f)) })), 12, 12, true);
  const gun = makeSprite(18, 9, drawPanzerGun); addTex(scene, 'panzer_gun', gun); addTex(scene, 'panzer_gun_w', whiteCopy(gun));
  addTex(scene, 'flailer_ball', makeSprite(13, 13, c => {
    blob(c, 6.5, 6.5, 3.8, 3.8, IRN.slice(1, 7));
    R(c, '#c8ced6', 6, 0, 1, 2); R(c, '#c8ced6', 6, 11, 1, 2); R(c, '#c8ced6', 0, 6, 2, 1); R(c, '#c8ced6', 11, 6, 2, 1);   // spikes
    for (const [x, y] of [[2, 2], [10, 2], [2, 10], [10, 10]]) R(c, '#aab4c2', x, y);
    R(c, '#5a3020', 5, 5, 2, 2);                                                                                         // dried blood
  }));
  addTex(scene, 'demo_tnt', makeSprite(7, 8, c => { R(c, '#6a0c0c', 1, 2, 5, 6); R(c, '#d02818', 1, 2, 1, 6); R(c, '#d02818', 3, 2, 1, 6); R(c, '#e8b422', 1, 4, 5, 1); R(c, '#8a8a80', 3, 0, 1, 2); }));
  for (const k in XGIBDEF) { const [w, h, fn] = XGIBDEF[k]; addTex(scene, k, makeSprite(w, h, fn, '#140606')); }
}
const GUNS = {
  nail: { w: 23, h: 11, py: 5, muzzle: 21, draw(ctx, arm) {
    if (arm) drawArm(ctx, 5);
    R(ctx, '#3c424b', 6, 3, 9, 4); R(ctx, '#6f7884', 6, 3, 9, 1); R(ctx, PAL.orange, 8, 5, 5, 1);
    R(ctx, '#2a2e35', 8, 7, 2, 2); R(ctx, '#24282e', 11, 7, 3, 2);
    R(ctx, '#59626e', 15, 4, 5, 2); R(ctx, '#9aa4b0', 15, 4, 5, 1); R(ctx, '#c8d0d8', 20, 4, 1, 2);
  } },
  shotgun: { w: 26, h: 11, py: 5, muzzle: 24, draw(ctx, arm) {
    if (arm) drawArm(ctx, 5);
    R(ctx, '#3a3f47', 6, 3, 8, 5); R(ctx, '#6a7380', 6, 3, 8, 1); R(ctx, '#7a5230', 7, 7, 3, 2);
    R(ctx, '#58616c', 14, 3, 9, 2); R(ctx, '#4a525c', 14, 5, 9, 2); R(ctx, '#9aa4b0', 14, 3, 9, 1);
    R(ctx, '#2a2e35', 15, 7, 5, 1); R(ctx, '#c9a24a', 12, 4, 1, 3); R(ctx, '#c8d0d8', 23, 3, 1, 4);
  } },
  flame: { w: 26, h: 12, py: 6, muzzle: 24, draw(ctx, arm) {
    if (arm) drawArm(ctx, 6);
    R(ctx, '#3a3f47', 6, 3, 8, 6); R(ctx, '#6a7380', 6, 3, 8, 1);
    R(ctx, '#a02818', 7, 8, 6, 3); R(ctx, '#d04a2a', 7, 8, 6, 1);                                   // fuel tank
    R(ctx, '#4b535e', 14, 5, 8, 2); R(ctx, '#8a94a0', 14, 5, 8, 1); R(ctx, '#2a2e35', 22, 4, 2, 4); R(ctx, '#ffb040', 24, 6, 1, 1);
  } },
  sing: { w: 26, h: 13, py: 6, muzzle: 24, draw(ctx, arm) {
    if (arm) drawArm(ctx, 6);
    R(ctx, '#2e333b', 6, 3, 10, 7); R(ctx, '#5a636e', 6, 3, 10, 1);
    R(ctx, '#6020c0', 10, 5, 5, 3); R(ctx, '#d0a0ff', 11, 6, 2, 1);                                  // singularity chamber
    R(ctx, '#3a414b', 16, 4, 6, 5); R(ctx, '#8a94a0', 22, 3, 2, 7); R(ctx, '#b060ff', 23, 5, 1, 3);
  } },
  arc: { w: 24, h: 11, py: 5, muzzle: 22, draw(ctx, arm) {
    if (arm) drawArm(ctx, 5);
    R(ctx, '#3a3f47', 6, 3, 7, 5); R(ctx, '#6a7380', 6, 3, 7, 1); R(ctx, '#2a2e35', 7, 8, 2, 2);
    R(ctx, '#4a525c', 13, 4, 8, 3);
    for (let i = 0; i < 4; i++) R(ctx, i % 2 ? '#b8732a' : '#e09a48', 13 + i * 2, 3, 1, 5);        // copper coils
    R(ctx, '#6ad0ff', 21, 4, 2, 3); R(ctx, '#e0f8ff', 22, 5, 1, 1);
  } },
  rail: { w: 30, h: 11, py: 5, muzzle: 28, draw(ctx, arm) {
    if (arm) drawArm(ctx, 5);
    R(ctx, '#2e333b', 6, 3, 8, 5); R(ctx, '#5a636e', 6, 3, 8, 1); R(ctx, '#2a2e35', 8, 8, 2, 2); R(ctx, '#1e2126', 9, 2, 3, 1);
    R(ctx, '#3a414b', 14, 3, 14, 1); R(ctx, '#3a414b', 14, 6, 14, 1);                               // twin rails
    R(ctx, '#46e6ff', 14, 4, 13, 2); R(ctx, '#c8f6ff', 15, 4, 11, 1); R(ctx, '#8a94a0', 27, 3, 1, 4);
  } },
  saw: { w: 25, h: 13, py: 6, muzzle: 22, draw(ctx, arm) {
    if (arm) drawArm(ctx, 6);
    R(ctx, '#3a3f47', 6, 5, 12, 5); R(ctx, '#6a7380', 6, 5, 12, 1); R(ctx, '#2a2e35', 8, 10, 2, 2);
    for (let y = 1; y < 8; y++) for (let x = 10; x < 18; x++) { const d = Math.hypot(x + 0.5 - 14, y + 0.5 - 4); if (d < 3.4) R(ctx, d < 1.2 ? '#3a3f47' : (x + y) % 2 ? '#c8d0d8' : '#9aa4b0', x, y); }
    R(ctx, '#e8b422', 18, 6, 1, 3); R(ctx, '#15171a', 19, 6, 3, 3); R(ctx, '#8a94a0', 22, 5, 1, 5);
  } },
  grenade: { w: 25, h: 13, py: 6, muzzle: 23, draw(ctx, arm) {
    if (arm) drawArm(ctx, 6);
    R(ctx, '#3a3f47', 6, 3, 7, 6); R(ctx, '#6a7380', 6, 3, 7, 1); R(ctx, '#2a2e35', 7, 9, 2, 3);          // receiver + grip
    R(ctx, '#55603f', 8, 7, 6, 4); R(ctx, '#77845a', 8, 7, 6, 1); R(ctx, '#2a2f22', 10, 8, 1, 2); R(ctx, '#2a2f22', 12, 8, 1, 2); // drum
    R(ctx, '#4b535e', 13, 3, 8, 5); R(ctx, '#7c8790', 13, 3, 8, 1); R(ctx, '#2a2e35', 13, 7, 8, 1);       // fat barrel
    R(ctx, '#e8b422', 16, 4, 2, 3); R(ctx, '#9aa4b0', 21, 2, 2, 7); R(ctx, '#15171a', 22, 4, 1, 3);
  } },
  mini: { w: 28, h: 13, py: 6, muzzle: 27, draw(ctx, arm, alt) {
    if (arm) drawArm(ctx, 6);
    R(ctx, '#3a3f47', 5, 3, 9, 7); R(ctx, '#6a7380', 5, 3, 9, 1); R(ctx, '#2a2e35', 6, 10, 3, 2); R(ctx, '#e8b422', 8, 5, 3, 2);   // housing, grip, decal
    R(ctx, '#4a525c', 14, 3, 3, 7); R(ctx, '#8a94a0', 14, 3, 3, 1);                                                                 // barrel clamp
    for (let i = 0; i < 3; i++) R(ctx, (i + (alt ? 1 : 0)) % 2 ? '#9aa4b0' : '#5a636e', 17, 4 + i * 2, 8, 1);                       // three spinning barrels
    R(ctx, '#23272d', 17, 5, 8, 1); R(ctx, '#23272d', 17, 7, 8, 1); R(ctx, '#6a7380', 25, 3, 2, 7);
  } },
  cluster: { w: 26, h: 14, py: 7, muzzle: 24, draw(ctx, arm) {
    if (arm) drawArm(ctx, 7);
    R(ctx, '#3a3f47', 5, 4, 8, 7); R(ctx, '#6a7380', 5, 4, 8, 1); R(ctx, '#2a2e35', 6, 11, 2, 3);
    R(ctx, '#5a4a2a', 7, 8, 5, 4); R(ctx, '#8a7040', 7, 8, 5, 1);                                         // shell drum
    R(ctx, '#4b535e', 13, 2, 9, 9); R(ctx, '#7c8790', 13, 2, 9, 1); R(ctx, '#2a2e35', 13, 10, 9, 1);      // fat mortar tube
    for (let i = 0; i < 4; i++) R(ctx, i % 2 ? '#15161a' : '#e8b422', 15 + i, 4, 1, 5);
    R(ctx, '#9aa4b0', 22, 1, 3, 11); R(ctx, '#15171a', 23, 3, 1, 7);
  } },
  stake: { w: 30, h: 12, py: 6, muzzle: 29, draw(ctx, arm) {
    if (arm) drawArm(ctx, 6);
    R(ctx, '#3a3f47', 5, 3, 12, 6); R(ctx, '#6a7380', 5, 3, 12, 1); R(ctx, '#23272d', 5, 8, 12, 1); R(ctx, '#e8b422', 9, 4, 3, 1);   // body
    R(ctx, '#7a3b20', 7, 9, 5, 3); R(ctx, '#a0582e', 7, 9, 5, 1);                                                                     // pressure tank
    R(ctx, '#2a2e35', 17, 4, 11, 4); R(ctx, '#15171a', 17, 5, 11, 2);                                                                 // channel
    R(ctx, '#b8c2cc', 17, 5, 10, 1); R(ctx, '#ffffff', 27, 5, 2, 1); R(ctx, '#8a94a0', 28, 3, 2, 6);                                 // loaded stake
  } },
  prism: { w: 28, h: 11, py: 5, muzzle: 27, draw(ctx, arm) {
    if (arm) drawArm(ctx, 5);
    R(ctx, '#2e333b', 5, 3, 10, 5); R(ctx, '#5a636e', 5, 3, 10, 1); R(ctx, '#2a2e35', 7, 8, 2, 3);
    R(ctx, '#3a414b', 15, 2, 6, 7); R(ctx, '#ff4adc', 16, 4, 4, 3); R(ctx, '#ffd0f4', 17, 5, 2, 1);          // prism crystal
    R(ctx, '#4b535e', 21, 4, 5, 3); R(ctx, '#8a94a0', 21, 4, 5, 1); R(ctx, '#ff4adc', 26, 5, 1, 1);
  } },
  cryo: { w: 28, h: 12, py: 6, muzzle: 26, draw(ctx, arm) {
    if (arm) drawArm(ctx, 6);
    R(ctx, '#3a414b', 5, 3, 10, 6); R(ctx, '#6a7380', 5, 3, 10, 1); R(ctx, '#2a2e35', 6, 9, 2, 3);
    R(ctx, '#2a6a9a', 7, 8, 6, 4); R(ctx, '#5ab0e0', 7, 8, 6, 1); R(ctx, '#c8f0ff', 8, 9, 2, 1);                 // coolant tank
    R(ctx, '#4b535e', 15, 4, 7, 4); R(ctx, '#8a94a0', 15, 4, 7, 1);
    for (let i = 0; i < 3; i++) R(ctx, '#9adcff', 16 + i * 2, 5, 1, 2);                                          // frost coils
    R(ctx, '#2a2e35', 22, 3, 3, 6); R(ctx, '#c8f0ff', 25, 5, 1, 2); R(ctx, '#ffffff', 25, 5, 1, 1);
  } },
  rocket: { w: 28, h: 13, py: 6, muzzle: 26, draw(ctx, arm) {
    if (arm) drawArm(ctx, 6);
    R(ctx, '#3d4636', 5, 3, 18, 7); R(ctx, '#5f6b52', 5, 3, 18, 1); R(ctx, '#262b22', 5, 9, 18, 1);
    for (let r = 4; r < 8; r++) for (let i = 0; i < 6; i++) R(ctx, ((i + r) >> 1) % 2 ? '#15161a' : '#e8b422', 10 + i, r, 1, 1);
    R(ctx, '#7c8790', 23, 2, 3, 9); R(ctx, '#aab4bc', 23, 2, 3, 1); R(ctx, '#1a1d20', 24, 4, 2, 5);
    R(ctx, '#2a2e35', 3, 4, 2, 5); R(ctx, '#2a2e35', 12, 1, 3, 2); R(ctx, '#ff3a2a', 13, 1, 1, 1); R(ctx, '#2a2e35', 9, 10, 2, 2);
  } },
  ripper: { w: 28, h: 13, py: 6, muzzle: 22, draw(ctx, arm, alt) {           // chain blade; alt = teeth advanced one link
    if (arm) drawArm(ctx, 6);
    R(ctx, '#3a3f47', 5, 3, 9, 7); R(ctx, '#6a7380', 5, 3, 9, 1); R(ctx, '#23272d', 5, 9, 9, 1);                       // motor housing
    R(ctx, '#e8b422', 6, 5, 6, 1); R(ctx, '#15161a', 7, 5, 1, 1); R(ctx, '#15161a', 9, 5, 1, 1); R(ctx, '#15161a', 11, 5, 1, 1);
    R(ctx, '#2a2e35', 6, 10, 3, 2); R(ctx, '#8a94a0', 13, 2, 2, 9); R(ctx, '#c8d0d8', 13, 2, 1, 9);                    // grip + guard
    R(ctx, '#4a525c', 15, 4, 11, 5); R(ctx, '#8a94a0', 15, 4, 11, 1); R(ctx, '#2a2e35', 15, 8, 11, 1);                 // bar
    R(ctx, '#ff8a20', 17, 6, 7, 1);                                                                                     // hot groove
    for (let x = 15; x < 27; x++) { const on = (x + (alt ? 1 : 0)) % 2 === 0; R(ctx, on ? '#eef2f6' : '#6a7380', x, 3); R(ctx, on ? '#6a7380' : '#eef2f6', x, 9); }
    R(ctx, '#eef2f6', 26, 4, 1, 5); R(ctx, '#6a7380', 27, 5, 1, 3);
  } },
  hornet: { w: 26, h: 14, py: 7, muzzle: 24, draw(ctx, arm) {                 // six-shot seeker pod
    if (arm) drawArm(ctx, 7);
    R(ctx, '#3a3f47', 5, 6, 8, 5); R(ctx, '#6a7380', 5, 6, 8, 1); R(ctx, '#2a2e35', 6, 11, 2, 3);
    R(ctx, '#4a5240', 10, 1, 14, 10); R(ctx, '#6e7a5e', 10, 1, 14, 1); R(ctx, '#2e3428', 10, 10, 14, 1);              // pod
    for (let r = 0; r < 2; r++) for (let i = 0; i < 3; i++) { R(ctx, '#15161a', 13 + i * 4, 3 + r * 4, 3, 3); R(ctx, '#ffd040', 14 + i * 4, 4 + r * 4, 1, 1); }
    R(ctx, '#e8b422', 11, 2, 1, 8); R(ctx, '#9aa4b0', 24, 1, 1, 10); R(ctx, '#ff3a2a', 22, 1, 1, 1);
  } },
  lance: { w: 32, h: 13, py: 6, muzzle: 30, draw(ctx, arm) {                  // charge beam with a magma core
    if (arm) drawArm(ctx, 6);
    R(ctx, '#2e333b', 5, 3, 10, 7); R(ctx, '#5a636e', 5, 3, 10, 1); R(ctx, '#2a2e35', 7, 10, 2, 3);
    R(ctx, '#7a2a10', 7, 5, 6, 3); R(ctx, '#ff8a20', 8, 6, 4, 1); R(ctx, '#ffe68a', 9, 6, 1, 1);                       // magma chamber
    R(ctx, '#3a414b', 15, 3, 14, 7); R(ctx, '#6a7380', 15, 3, 14, 1); R(ctx, '#23272d', 15, 9, 14, 1);
    for (let i = 0; i < 4; i++) R(ctx, '#c84008', 17 + i * 3, 4, 1, 5);                                                 // heat vents
    R(ctx, '#ffb840', 15, 6, 14, 1); R(ctx, '#8a94a0', 29, 2, 2, 9); R(ctx, '#ffe68a', 30, 5, 1, 3);
  } },
  glaive: { w: 27, h: 17, py: 8, muzzle: 18, draw(ctx, arm, empty) {          // mag gauntlet; empty while the glaive is out
    if (arm) drawArm(ctx, 8);
    R(ctx, '#3a3f47', 5, 6, 8, 5); R(ctx, '#6a7380', 5, 6, 8, 1); R(ctx, '#2a2e35', 6, 11, 2, 3);
    R(ctx, '#23272d', 11, 6, 2, 5); R(ctx, empty ? '#1a5a70' : '#46e6ff', 12, 7, 1, 3);                                  // mag clamp
    if (!empty) drawGlaiveBlade(ctx, 19, 8.5);
  } },
  hammer: { w: 30, h: 17, py: 8, muzzle: 25, draw(ctx, arm) {                // pneumatic sledge with a furnace in the head
    if (arm) drawArm(ctx, 8);
    R(ctx, '#3a3f47', 5, 7, 16, 3); R(ctx, '#6a7380', 5, 7, 16, 1); R(ctx, '#7a3b20', 7, 10, 4, 2);                        // haft + grip wrap
    R(ctx, '#4a525c', 20, 1, 10, 15); R(ctx, '#8a94a0', 20, 1, 10, 2); R(ctx, '#2a2e35', 20, 14, 10, 2);                   // head
    R(ctx, '#e8b422', 21, 4, 1, 9); R(ctx, '#15161a', 22, 4, 1, 9);
    R(ctx, '#7a2008', 24, 5, 4, 7); R(ctx, '#ff8a20', 25, 6, 2, 5); R(ctx, '#ffe68a', 25, 8, 1, 1); R(ctx, '#c8d0d8', 29, 2, 1, 13);
  } },
  coil: { w: 24, h: 13, py: 6, muzzle: 22, draw(ctx, arm) {                  // coil thrower with one loaded in the cradle
    if (arm) drawArm(ctx, 6);
    R(ctx, '#3a3f47', 5, 4, 9, 6); R(ctx, '#6a7380', 5, 4, 9, 1); R(ctx, '#2a2e35', 6, 10, 2, 3); R(ctx, '#2a2e35', 14, 3, 8, 8);
    for (let i = 0; i < 3; i++) R(ctx, i % 2 ? '#b8732a' : '#e09a48', 15, 4 + i * 2, 5, 1);
    R(ctx, '#6ad0ff', 20, 5, 2, 3); R(ctx, '#e0f8ff', 21, 6, 1, 1); R(ctx, '#8a94a0', 22, 3, 1, 7);
  } },
  flak: { w: 28, h: 14, py: 7, muzzle: 27, draw(ctx, arm) {                  // stubby flak cannon with a red-hot breech
    if (arm) drawArm(ctx, 7);
    R(ctx, '#3a3f47', 5, 4, 9, 7); R(ctx, '#6a7380', 5, 4, 9, 1); R(ctx, '#2a2e35', 6, 11, 2, 3); R(ctx, '#7a2a10', 8, 6, 4, 3); R(ctx, '#ff8a20', 9, 7, 2, 1);
    R(ctx, '#4b535e', 14, 2, 11, 10); R(ctx, '#7c8790', 14, 2, 11, 1); R(ctx, '#2a2e35', 14, 11, 11, 1);
    for (let i = 0; i < 3; i++) R(ctx, '#23272d', 16 + i * 3, 3, 1, 8);
    R(ctx, '#9aa4b0', 25, 1, 3, 12); R(ctx, '#15171a', 26, 3, 2, 8); R(ctx, '#ffb040', 27, 6, 1, 2);
  } },
  tractor: { w: 27, h: 15, py: 7, muzzle: 25, draw(ctx, arm) {               // gravity gun: three prongs round a violet core
    if (arm) drawArm(ctx, 7);
    R(ctx, '#3a3f47', 5, 4, 10, 7); R(ctx, '#6a7380', 5, 4, 10, 1); R(ctx, '#2a2e35', 6, 11, 2, 3); R(ctx, '#e8b422', 7, 9, 5, 1);
    R(ctx, '#2e2848', 15, 5, 5, 5); R(ctx, '#b080ff', 16, 6, 3, 3); R(ctx, '#ffffff', 17, 7, 1, 1);
    R(ctx, '#8a94a0', 19, 1, 6, 2); R(ctx, '#8a94a0', 19, 12, 6, 2); R(ctx, '#c8d0d8', 24, 2, 2, 2); R(ctx, '#c8d0d8', 24, 11, 2, 2);
    R(ctx, '#5a636e', 20, 6, 4, 3); R(ctx, '#d0b0ff', 24, 7, 1, 1);
  } },
  acid: { w: 27, h: 13, py: 6, muzzle: 25, draw(ctx, arm) {                  // corroder: a sloshing green tank and a nozzle
    if (arm) drawArm(ctx, 6);
    R(ctx, '#3a3f47', 6, 3, 8, 6); R(ctx, '#6a7380', 6, 3, 8, 1); R(ctx, '#2a2e35', 7, 9, 2, 3);
    R(ctx, '#2a5a20', 6, 8, 7, 4); R(ctx, '#7dff4a', 7, 9, 5, 1); R(ctx, '#3a8a2a', 7, 10, 5, 1);
    R(ctx, '#4b535e', 14, 4, 8, 3); R(ctx, '#8a94a0', 14, 4, 8, 1); R(ctx, '#2a2e35', 22, 3, 3, 5); R(ctx, '#b0ff70', 25, 5, 1, 1);
  } },
  shock: { w: 27, h: 12, py: 5, muzzle: 25, draw(ctx, arm) {                  // shock rifle: blue coils down a long barrel
    if (arm) drawArm(ctx, 5);
    R(ctx, '#3a3f47', 5, 3, 10, 5); R(ctx, '#6a7380', 5, 3, 10, 1); R(ctx, '#2a2e35', 7, 8, 3, 3);
    R(ctx, '#4b535e', 15, 4, 10, 3); R(ctx, '#8a94a0', 15, 4, 10, 1);
    for (let i = 0; i < 3; i++) { R(ctx, '#2a8ad0', 16 + i * 3, 3, 2, 5); R(ctx, '#9ae8ff', 16 + i * 3, 3, 1, 1); }
    R(ctx, '#c8f4ff', 25, 5, 1, 1);
  } },
  seed: { w: 20, h: 12, py: 5, muzzle: 18, draw(ctx, arm) {                   // seed launcher: a wooden-gripped tube with a seed pod
    if (arm) drawArm(ctx, 5);
    R(ctx, '#5a3a20', 4, 5, 5, 5); R(ctx, '#3a4a2a', 8, 3, 9, 6); R(ctx, '#5a6a3a', 8, 3, 9, 1); R(ctx, '#8ac040', 12, 4, 3, 3); R(ctx, '#e0ff80', 13, 4, 1, 1); R(ctx, '#22262c', 17, 4, 3, 4);
  } },
  tether: { w: 22, h: 12, py: 5, muzzle: 20, draw(ctx, arm) {                 // tether gun: a dart gun with a coiled light-cord
    if (arm) drawArm(ctx, 5);
    R(ctx, '#3a3f47', 5, 4, 13, 4); R(ctx, '#6a7380', 5, 4, 13, 1); R(ctx, '#2a2e35', 6, 8, 3, 3);
    R(ctx, '#80ffe0', 9, 2, 1, 2); R(ctx, '#80ffe0', 11, 2, 1, 2); R(ctx, '#80ffe0', 13, 2, 1, 2); R(ctx, '#22262c', 18, 5, 4, 2); R(ctx, '#ffffff', 21, 5, 1, 1);
  } },
  nuke: { w: 28, h: 14, py: 6, muzzle: 26, draw(ctx, arm) {                   // mini-nuke: a fat launch tube with a warhead in the mouth
    if (arm) drawArm(ctx, 6);
    R(ctx, '#3a4a2a', 4, 2, 20, 10); R(ctx, '#5a6a3a', 4, 2, 20, 1); R(ctx, '#2a2e35', 6, 12, 3, 2); R(ctx, '#e8b422', 12, 4, 6, 6); R(ctx, '#141618', 14, 5, 2, 4); R(ctx, '#141618', 13, 6, 4, 2);
    R(ctx, '#d8e040', 24, 4, 3, 6); R(ctx, '#ffffff', 25, 5, 1, 1);
  } },
  dragon: { w: 24, h: 12, py: 5, muzzle: 22, draw(ctx, arm) {                 // dragon's breath: a sawn-off with a red-hot muzzle
    if (arm) drawArm(ctx, 5);
    R(ctx, '#3a2a20', 3, 5, 6, 5); R(ctx, '#3a3f47', 8, 3, 13, 5); R(ctx, '#6a7380', 8, 3, 13, 1); R(ctx, '#2a2e35', 10, 8, 2, 3);
    R(ctx, '#c84008', 19, 3, 3, 5); R(ctx, '#ffa030', 21, 4, 1, 3);
  } },
  shield: { w: 14, h: 18, py: 8, muzzle: 12, draw(ctx, arm) {                 // riot shield: a tall steel plate with a view slot
    if (arm) drawArm(ctx, 8);
    R(ctx, '#2a2e35', 6, 0, 7, 18); R(ctx, '#4b535e', 7, 1, 5, 16); R(ctx, '#8a94a0', 7, 1, 2, 16); R(ctx, '#80c8ff', 8, 4, 3, 2); R(ctx, '#e8b422', 7, 12, 5, 1);
  } },
  glue: { w: 20, h: 12, py: 5, muzzle: 18, draw(ctx, arm) {                   // glue gun: a hot-glue blaster with an amber tank
    if (arm) drawArm(ctx, 5);
    R(ctx, '#3a3f47', 5, 4, 12, 5); R(ctx, '#6a7380', 5, 4, 12, 1); R(ctx, '#2a2e35', 6, 9, 3, 3);
    R(ctx, '#c89a20', 8, 1, 4, 3); R(ctx, '#ffd040', 9, 1, 1, 1); R(ctx, '#22262c', 17, 5, 3, 2); R(ctx, '#ffd040', 19, 6, 1, 1);
  } },
  gaslaunch: { w: 22, h: 12, py: 5, muzzle: 20, draw(ctx, arm) {              // gas launcher: a fat tube with a green canister drum
    if (arm) drawArm(ctx, 5);
    R(ctx, '#3a3f47', 5, 3, 14, 6); R(ctx, '#6a7380', 5, 3, 14, 1); R(ctx, '#2a2e35', 6, 9, 3, 3);
    R(ctx, '#5a7a20', 9, 2, 5, 8); R(ctx, '#a0e040', 10, 3, 3, 1); R(ctx, '#22262c', 19, 2, 3, 8);
  } },
  bubble: { w: 20, h: 12, py: 5, muzzle: 18, draw(ctx, arm) {                 // bubble gun: a toy-bright blaster with a soap tank
    if (arm) drawArm(ctx, 5);
    R(ctx, '#3a6ab0', 5, 4, 11, 5); R(ctx, '#6a9ae0', 5, 4, 11, 1); R(ctx, '#2a2e35', 6, 9, 3, 3);
    R(ctx, '#c8f0ff', 8, 1, 4, 3); R(ctx, '#ffffff', 9, 1, 1, 1); R(ctx, '#e8b422', 16, 5, 3, 3); R(ctx, '#ffffff', 18, 6, 1, 1);
  } },
  tripwire: { w: 20, h: 12, py: 5, muzzle: 18, draw(ctx, arm) {               // tripwire: a stubby launcher with a red emitter loaded
    if (arm) drawArm(ctx, 5);
    R(ctx, '#3a3f47', 5, 3, 12, 6); R(ctx, '#6a7380', 5, 3, 12, 1); R(ctx, '#2a2e35', 6, 9, 3, 3); R(ctx, '#22262c', 15, 2, 3, 8); R(ctx, '#ff3020', 17, 5, 2, 2); R(ctx, '#ffffff', 17, 5, 1, 1);
  } },
  dronepod: { w: 22, h: 12, py: 5, muzzle: 20, draw(ctx, arm) {               // drone pod: a launcher with two little drones nested in it
    if (arm) drawArm(ctx, 5);
    R(ctx, '#3a3f47', 5, 3, 15, 7); R(ctx, '#6a7380', 5, 3, 15, 1); R(ctx, '#2a2e35', 6, 10, 3, 2);
    R(ctx, '#8a94a0', 9, 4, 4, 2); R(ctx, '#46e6ff', 12, 4, 1, 1); R(ctx, '#8a94a0', 14, 7, 4, 2); R(ctx, '#46e6ff', 17, 7, 1, 1);
  } },
  gauntlet: { w: 18, h: 14, py: 6, muzzle: 16, draw(ctx, arm) {               // rocket gauntlet: a huge armoured fist with thrusters
    if (arm) drawArm(ctx, 6);
    R(ctx, '#3a3f47', 5, 2, 9, 10); R(ctx, '#6a7380', 5, 2, 9, 1); R(ctx, '#e8b422', 6, 5, 7, 1);
    R(ctx, '#4b535e', 13, 3, 5, 8); R(ctx, '#8a94a0', 14, 4, 3, 2); R(ctx, '#8a94a0', 14, 7, 3, 2); R(ctx, '#2a2e35', 4, 9, 2, 4); R(ctx, '#ff8a20', 3, 11, 1, 2);
  } },
  marksman: { w: 30, h: 12, py: 5, muzzle: 29, draw(ctx, arm) {               // marksman rifle: a long barrel and a big scope
    if (arm) drawArm(ctx, 5);
    R(ctx, '#3a2a20', 3, 5, 6, 4); R(ctx, '#3a3f47', 8, 4, 12, 4); R(ctx, '#6a7380', 8, 4, 12, 1); R(ctx, '#22262c', 20, 5, 10, 2); R(ctx, '#2a2e35', 10, 8, 2, 3);
    R(ctx, '#22262c', 10, 1, 8, 3); R(ctx, '#80c8ff', 17, 2, 1, 1); R(ctx, '#ff3020', 29, 5, 1, 1);
  } },
  stasis: { w: 22, h: 12, py: 5, muzzle: 20, draw(ctx, arm) {                 // stasis grenade: a launcher with a clock-face drum
    if (arm) drawArm(ctx, 5);
    R(ctx, '#3a3f47', 5, 3, 14, 6); R(ctx, '#6a7380', 5, 3, 14, 1); R(ctx, '#2a2e35', 6, 9, 3, 3);
    R(ctx, '#c8e8ff', 10, 3, 5, 5); R(ctx, '#2a2e35', 12, 4, 1, 2); R(ctx, '#2a2e35', 12, 5, 2, 1); R(ctx, '#22262c', 19, 2, 3, 8);
  } },
  microwave: { w: 22, h: 12, py: 5, muzzle: 20, draw(ctx, arm) {              // microwave: a ribbed emitter dish
    if (arm) drawArm(ctx, 5);
    R(ctx, '#3a3f47', 5, 4, 10, 5); R(ctx, '#6a7380', 5, 4, 10, 1); R(ctx, '#2a2e35', 6, 9, 3, 3);
    for (let i = 0; i < 3; i++) R(ctx, '#ffa040', 7 + i * 3, 6, 1, 2);
    R(ctx, '#4b535e', 15, 2, 2, 9); R(ctx, '#8a94a0', 17, 1, 2, 11); R(ctx, '#ffb050', 19, 5, 2, 3);
  } },
  splitter: { w: 22, h: 12, py: 5, muzzle: 20, draw(ctx, arm) {               // splitter: a prism core and a forked barrel
    if (arm) drawArm(ctx, 5);
    R(ctx, '#3a3f47', 5, 3, 11, 6); R(ctx, '#6a7380', 5, 3, 11, 1); R(ctx, '#2a2e35', 6, 9, 3, 3);
    R(ctx, '#46e6ff', 9, 5, 4, 2); R(ctx, '#22262c', 16, 2, 5, 3); R(ctx, '#22262c', 16, 7, 5, 3); R(ctx, '#9af4ff', 20, 3, 1, 1); R(ctx, '#9af4ff', 20, 8, 1, 1);
  } },
  decoy: { w: 22, h: 12, py: 5, muzzle: 20, draw(ctx, arm) {                  // decoy launcher: a stubby tube loaded with a holo canister
    if (arm) drawArm(ctx, 5);
    R(ctx, '#3a3f47', 5, 3, 14, 6); R(ctx, '#6a7380', 5, 3, 14, 1); R(ctx, '#2a2e35', 6, 9, 3, 3); R(ctx, '#46e6ff', 15, 4, 3, 4); R(ctx, '#d0f8ff', 16, 5, 1, 1); R(ctx, '#22262c', 19, 2, 3, 8);
  } },
  vacuum: { w: 26, h: 14, py: 6, muzzle: 24, draw(ctx, arm) {                 // scrap vacuum: a hopper drum and a flared intake
    if (arm) drawArm(ctx, 6);
    R(ctx, '#3a3f47', 5, 3, 10, 9); R(ctx, '#6a7380', 5, 3, 10, 1); R(ctx, '#e8b422', 6, 6, 8, 2);
    R(ctx, '#2a2e35', 15, 5, 6, 5); R(ctx, '#4b535e', 21, 2, 3, 11); R(ctx, '#8a94a0', 23, 3, 1, 9); R(ctx, '#2a2e35', 7, 12, 3, 2);
  } },
  siphon: { w: 22, h: 12, py: 5, muzzle: 20, draw(ctx, arm) {                  // siphon: a glass vial of red feeding a needle emitter
    if (arm) drawArm(ctx, 5);
    R(ctx, '#3a3f47', 5, 3, 9, 6); R(ctx, '#6a7380', 5, 3, 9, 1); R(ctx, '#8a1020', 7, 4, 5, 4); R(ctx, '#ff3a4a', 8, 5, 3, 2);
    R(ctx, '#2a2e35', 14, 4, 5, 4); R(ctx, '#c8d0da', 19, 5, 3, 2); R(ctx, '#2a2e35', 6, 9, 3, 3);
  } },
  firework: { w: 24, h: 12, py: 5, muzzle: 22, draw(ctx, arm) {               // firework launcher: a striped tube with a rocket nosed in
    if (arm) drawArm(ctx, 5);
    R(ctx, '#3a3f47', 5, 3, 17, 6); R(ctx, '#c83040', 8, 3, 2, 6); R(ctx, '#e8c040', 12, 3, 2, 6); R(ctx, '#3aa0e0', 16, 3, 2, 6);
    R(ctx, '#6a7380', 5, 3, 17, 1); R(ctx, '#2a2e35', 6, 9, 3, 3); R(ctx, '#ff5a6a', 22, 4, 2, 4); R(ctx, '#ffffff', 22, 5, 1, 1);
  } },
  katana: { w: 28, h: 12, py: 5, muzzle: 24, draw(ctx, arm) {                  // plasma katana: a wrapped hilt and a humming cyan edge
    if (arm) drawArm(ctx, 5);
    R(ctx, '#2a2e35', 4, 5, 5, 2); R(ctx, '#8a2020', 5, 5, 1, 2); R(ctx, '#8a2020', 7, 5, 1, 2);
    R(ctx, '#c8a040', 9, 3, 1, 6); R(ctx, '#46e6ff', 10, 5, 16, 2); R(ctx, '#e8fcff', 10, 5, 15, 1); R(ctx, '#46e6ff', 26, 5, 1, 1);
  } },
  grav: { w: 22, h: 12, py: 5, muzzle: 20, draw(ctx, arm) {                   // grav bomb: a stubby launcher with a violet core
    if (arm) drawArm(ctx, 5);
    R(ctx, '#3a3f47', 5, 3, 13, 6); R(ctx, '#6a7380', 5, 3, 13, 1); R(ctx, '#2a2e35', 6, 9, 3, 3);
    R(ctx, '#7a40d0', 10, 4, 4, 4); R(ctx, '#d8b0ff', 11, 5, 2, 2); R(ctx, '#22262c', 18, 2, 3, 8);
  } },
  pinball: { w: 24, h: 12, py: 5, muzzle: 22, draw(ctx, arm) {                // pinball cannon: a fat barrel, a steel ball in the breech
    if (arm) drawArm(ctx, 5);
    R(ctx, '#3a3f47', 5, 2, 17, 8); R(ctx, '#6a7380', 5, 2, 17, 1); R(ctx, '#2a2e35', 6, 10, 3, 2);
    R(ctx, '#c8d0da', 8, 4, 4, 4); R(ctx, '#ffffff', 9, 4, 1, 1); R(ctx, '#e8b422', 15, 3, 1, 6); R(ctx, '#22262c', 21, 1, 3, 10);
  } },
  shrink: { w: 22, h: 12, py: 5, muzzle: 20, draw(ctx, arm) {                 // shrink ray: a retro ray gun with rings
    if (arm) drawArm(ctx, 5);
    R(ctx, '#3a3f47', 5, 3, 9, 5); R(ctx, '#6a7380', 5, 3, 9, 1); R(ctx, '#2a2e35', 6, 8, 3, 3);
    for (let i = 0; i < 3; i++) { R(ctx, i % 2 ? '#ff60d0' : '#60ffe0', 14 + i * 2, 2 + i, 1, 7 - i * 2); }
    R(ctx, '#ffffff', 20, 5, 1, 1);
  } },
  sonic: { w: 24, h: 14, py: 6, muzzle: 21, draw(ctx, arm) {                  // sonic blaster: a squat speaker horn
    if (arm) drawArm(ctx, 6);
    R(ctx, '#3a3f47', 5, 4, 9, 6); R(ctx, '#6a7380', 5, 4, 9, 1); R(ctx, '#2a2e35', 6, 10, 3, 3);
    R(ctx, '#4b535e', 14, 3, 3, 8); R(ctx, '#5a636e', 17, 1, 3, 12); R(ctx, '#8a94a0', 20, 0, 2, 14); R(ctx, '#c8e0ff', 21, 5, 1, 4);
  } },
  bees: { w: 22, h: 13, py: 6, muzzle: 20, draw(ctx, arm) {                   // bee swarm: a striped hive canister
    if (arm) drawArm(ctx, 6);
    R(ctx, '#c8a028', 5, 3, 12, 7); for (let i = 0; i < 3; i++) R(ctx, '#2a2418', 7 + i * 4, 3, 2, 7); R(ctx, '#f0d060', 5, 3, 12, 1);
    R(ctx, '#3a3f47', 17, 4, 4, 5); R(ctx, '#ffe040', 20, 6, 1, 1);
  } },
  whip: { w: 18, h: 12, py: 5, muzzle: 14, draw(ctx, arm) {                   // laser whip: a hilt with a coiled emitter
    if (arm) drawArm(ctx, 5);
    R(ctx, '#3a3f47', 4, 4, 8, 3); R(ctx, '#6a7380', 4, 4, 8, 1); R(ctx, '#ff40c0', 12, 4, 2, 3); R(ctx, '#ffe0f8', 14, 5, 2, 1);
  } },
  spider: { w: 24, h: 13, py: 6, muzzle: 22, draw(ctx, arm) {                 // spider-mine launcher: a box magazine of folded bots
    if (arm) drawArm(ctx, 6);
    R(ctx, '#3a3f47', 5, 3, 13, 6); R(ctx, '#6a7380', 5, 3, 13, 1); R(ctx, '#2a2e35', 7, 9, 6, 4); R(ctx, '#ff3020', 8, 10, 1, 1); R(ctx, '#ff3020', 11, 10, 1, 1);
    R(ctx, '#4b535e', 18, 4, 4, 4); R(ctx, '#8a94a0', 22, 5, 1, 2);
  } },
  napalm: { w: 26, h: 13, py: 6, muzzle: 24, draw(ctx, arm) {                 // napalm launcher: a fat orange tube with a fuel drum
    if (arm) drawArm(ctx, 6);
    R(ctx, '#8a3a10', 5, 3, 16, 6); R(ctx, '#d86a18', 5, 3, 16, 1); R(ctx, '#5a2a10', 7, 9, 6, 4); R(ctx, '#ffa040', 8, 10, 4, 1);
    R(ctx, '#2a2e35', 21, 2, 3, 8); R(ctx, '#ffe080', 24, 5, 1, 2);
  } },
  orbital: { w: 26, h: 12, py: 5, muzzle: 24, draw(ctx, arm) {               // orbital designator: a slim laser marker with a dish
    if (arm) drawArm(ctx, 5);
    R(ctx, '#3a3f47', 5, 4, 14, 3); R(ctx, '#6a7380', 5, 4, 14, 1); R(ctx, '#2a2e35', 7, 7, 3, 4);
    R(ctx, '#8a94a0', 9, 0, 5, 2); R(ctx, '#5a636e', 11, 2, 1, 2);                          // dish
    R(ctx, '#4b535e', 19, 4, 5, 2); R(ctx, '#ff3020', 24, 5, 1, 1);
  } },
  cutter: { w: 24, h: 13, py: 6, muzzle: 22, draw(ctx, arm) {                 // plasma cutter: a boxy body with three emitter prongs
    if (arm) drawArm(ctx, 6);
    R(ctx, '#3a3f47', 5, 3, 12, 7); R(ctx, '#6a7380', 5, 3, 12, 1); R(ctx, '#2a2e35', 7, 10, 3, 3); R(ctx, '#2a8ad0', 8, 6, 6, 1);
    for (const y of [2, 6, 10]) { R(ctx, '#5a636e', 17, y, 4, 1); R(ctx, '#9ae8ff', 21, y, 1, 1); }
  } },
  net: { w: 24, h: 13, py: 6, muzzle: 22, draw(ctx, arm) {                    // net gun: a wide flared barrel over a coiled-net canister
    if (arm) drawArm(ctx, 6);
    R(ctx, '#3a3f47', 5, 4, 12, 5); R(ctx, '#6a7380', 5, 4, 12, 1); R(ctx, '#8a8070', 7, 9, 5, 3); R(ctx, '#c8c0a8', 7, 9, 5, 1);
    R(ctx, '#4b535e', 17, 3, 3, 7); R(ctx, '#2a2e35', 20, 2, 3, 9); R(ctx, '#c8c0a8', 22, 5, 1, 3);
  } },
  flail: { w: 18, h: 12, py: 5, muzzle: 14, draw(ctx, arm) {                  // chain flail: a stout haft and a coil of chain
    if (arm) drawArm(ctx, 5);
    R(ctx, '#5a3a20', 4, 4, 9, 3); R(ctx, '#7a5a30', 4, 4, 9, 1); R(ctx, '#3a3f47', 12, 3, 3, 5);
    for (let i = 0; i < 3; i++) R(ctx, i % 2 ? '#5a636e' : '#a0aab6', 14 + i, 5 + (i % 2), 1, 2);
  } },
  flare: { w: 22, h: 12, py: 5, muzzle: 20, draw(ctx, arm) {                   // flare gun: a chunky orange signal pistol
    if (arm) drawArm(ctx, 5);
    R(ctx, '#5a3a20', 5, 6, 3, 5); R(ctx, '#d86a18', 6, 2, 12, 5); R(ctx, '#ffa040', 6, 2, 12, 1); R(ctx, '#8a3a10', 6, 6, 12, 1);
    R(ctx, '#2a2e35', 18, 3, 3, 3); R(ctx, '#ffe080', 20, 4, 1, 1);
  } },
  limpet: { w: 25, h: 13, py: 6, muzzle: 23, draw(ctx, arm) {                 // limpet launcher: a drum magazine under a short tube
    if (arm) drawArm(ctx, 6);
    R(ctx, '#3a3f47', 5, 3, 16, 5); R(ctx, '#6a7380', 5, 3, 16, 1); R(ctx, '#2a2e35', 7, 8, 7, 4); R(ctx, '#c8a040', 8, 9, 5, 1); R(ctx, '#ff3020', 9, 11, 1, 1);
    R(ctx, '#4b535e', 21, 4, 3, 3); R(ctx, '#ff6040', 23, 5, 1, 1);
  } },
  drill: { w: 26, h: 13, py: 6, muzzle: 24, draw(ctx, arm) {                  // drill launcher: a fat tube with a spinning bit poking out
    if (arm) drawArm(ctx, 6);
    R(ctx, '#3a3f47', 5, 3, 14, 7); R(ctx, '#6a7380', 5, 3, 14, 1); R(ctx, '#2a2e35', 7, 10, 3, 3); R(ctx, '#c8a040', 8, 6, 8, 1);
    R(ctx, '#8a94a0', 19, 5, 3, 3); R(ctx, '#d8dee6', 22, 5, 2, 3); R(ctx, '#ffffff', 24, 6, 1, 1);
  } },
  revolver: { w: 20, h: 11, py: 4, muzzle: 19, draw(ctx, arm) {               // trick revolver: long barrel, fat cylinder, brass trim
    if (arm) drawArm(ctx, 4);
    R(ctx, '#5a3a20', 4, 5, 3, 5); R(ctx, '#7a5a30', 4, 5, 1, 4);
    R(ctx, '#3a3f47', 6, 2, 5, 5); R(ctx, '#8a94a0', 6, 2, 5, 1); R(ctx, '#c8a040', 7, 4, 3, 1);
    R(ctx, '#4b535e', 11, 3, 8, 2); R(ctx, '#a0aab6', 11, 3, 8, 1); R(ctx, '#2a2e35', 18, 2, 1, 1);
  } },
  needler: { w: 24, h: 13, py: 6, muzzle: 22, draw(ctx, arm) {                // needler: pink crystal spines on a squat body
    if (arm) drawArm(ctx, 6);
    R(ctx, '#3a2a40', 5, 4, 12, 6); R(ctx, '#5a4a66', 5, 4, 12, 1); R(ctx, '#2a1e30', 7, 10, 3, 3);
    for (let i = 0; i < 4; i++) { R(ctx, '#ff60d0', 7 + i * 3, 1 + (i % 2), 1, 3); R(ctx, '#ffd0f4', 7 + i * 3, 1 + (i % 2), 1, 1); }
    R(ctx, '#4a3a52', 17, 5, 5, 3); R(ctx, '#ff9ae8', 22, 6, 1, 1);
  } },
  // ---- expansion: weapons ----
  cannon: { w: 26, h: 14, py: 7, muzzle: 24, draw(ctx, arm) {                 // hand cannon: a banded iron barrel on a wooden grip
    if (arm) drawArm(ctx, 7);
    R(ctx, '#5a3a20', 4, 7, 6, 4); R(ctx, '#7a5a30', 4, 7, 6, 1); R(ctx, '#3a2414', 6, 11, 3, 3);                       // stock + grip
    R(ctx, '#2a2e35', 9, 3, 13, 8); R(ctx, '#4b535e', 9, 3, 13, 2); R(ctx, '#15171a', 9, 10, 13, 1);                    // iron barrel
    for (const x of [11, 17]) { R(ctx, '#8a6a20', x, 2, 2, 10); R(ctx, '#e0b850', x, 2, 1, 10); }                      // brass bands
    R(ctx, '#3a3f47', 22, 1, 3, 12); R(ctx, '#6a7380', 22, 1, 3, 1); R(ctx, '#0a0b0d', 23, 4, 2, 6);                    // flared muzzle
    R(ctx, '#ff8a20', 14, 2, 1, 1); R(ctx, '#ffe080', 14, 1, 1, 1);                                                      // a spark at the touchhole
  } },
  quake: { w: 25, h: 14, py: 6, muzzle: 22, draw(ctx, arm) {                   // seismic launcher: a hazard-striped thumper with a piston ram
    if (arm) drawArm(ctx, 6);
    R(ctx, '#3a3f47', 5, 3, 12, 7); R(ctx, '#6a7380', 5, 3, 12, 1); R(ctx, '#2a2e35', 6, 10, 3, 3);
    for (let i = 0; i < 4; i++) R(ctx, i % 2 ? '#15161a' : '#e8b422', 7 + i * 2, 8, 2, 2);                              // hazard stripes
    R(ctx, '#7a4a20', 9, 4, 5, 3); R(ctx, '#ffa040', 10, 5, 3, 1); R(ctx, '#ffe080', 11, 5, 1, 1);                       // seismic core
    R(ctx, '#4b535e', 17, 2, 4, 10); R(ctx, '#8a94a0', 17, 2, 4, 1); R(ctx, '#2a2e35', 17, 11, 4, 1);                    // ram housing
    R(ctx, '#9aa4b0', 21, 3, 3, 8); R(ctx, '#c8d0d8', 21, 3, 3, 1); R(ctx, '#5a636e', 23, 4, 1, 7);                      // the ram face
  } },
  phase: { w: 28, h: 11, py: 5, muzzle: 27, draw(ctx, arm) {                  // phase rifle: a slim black rifle ringed with violet emitters
    if (arm) drawArm(ctx, 5);
    R(ctx, '#2a2438', 5, 3, 10, 5); R(ctx, '#4a3e66', 5, 3, 10, 1); R(ctx, '#1a1622', 7, 8, 3, 3); R(ctx, '#7a40d0', 8, 5, 5, 1);
    R(ctx, '#3a3248', 15, 4, 11, 2); R(ctx, '#5a4e78', 15, 4, 11, 1);
    for (let i = 0; i < 3; i++) { R(ctx, '#a060ff', 16 + i * 3, 2, 1, 6); R(ctx, '#e8d8ff', 16 + i * 3, 2, 1, 1); }      // phase rings
    R(ctx, '#d8b0ff', 26, 4, 1, 2); R(ctx, '#ffffff', 26, 4, 1, 1);
  } },
  balllight: { w: 24, h: 14, py: 6, muzzle: 22, draw(ctx, arm) {              // ball lightning: a caged plasma orb on a copper-wound stock
    if (arm) drawArm(ctx, 6);
    R(ctx, '#3a3f47', 5, 4, 9, 6); R(ctx, '#6a7380', 5, 4, 9, 1); R(ctx, '#2a2e35', 6, 10, 3, 3);
    for (let i = 0; i < 3; i++) R(ctx, i % 2 ? '#b8732a' : '#e09a48', 7 + i * 2, 5, 1, 4);                              // copper winding
    for (let y = 2; y < 12; y++) for (let x = 14; x < 21; x++) { const d = Math.hypot(x + 0.5 - 17.5, y + 0.5 - 7); if (d < 3.4) R(ctx, d < 1.3 ? '#ffffff' : d < 2.4 ? '#9ae8ff' : '#2a8ad0', x, y); }   // the orb
    R(ctx, '#5a636e', 13, 2, 1, 10); R(ctx, '#5a636e', 21, 2, 1, 10); R(ctx, '#8a94a0', 13, 1, 9, 1); R(ctx, '#4b535e', 13, 12, 9, 1); R(ctx, '#5a636e', 17, 2, 1, 1);   // the cage
  } },
  cyclone: { w: 26, h: 14, py: 6, muzzle: 24, draw(ctx, arm) {                // cyclone launcher: a turbine drum and a flared vortex nozzle
    if (arm) drawArm(ctx, 6);
    R(ctx, '#3a3f47', 5, 4, 8, 6); R(ctx, '#6a7380', 5, 4, 8, 1); R(ctx, '#2a2e35', 6, 10, 3, 3);
    for (let y = 1; y < 13; y++) for (let x = 10; x < 20; x++) {                                                       // turbine: six blades in a ring
      const dx = x + 0.5 - 15, dy = y + 0.5 - 7, d = Math.hypot(dx, dy); if (d >= 5.6) continue;
      R(ctx, d > 4.5 ? '#5a636e' : d < 1.2 ? '#e8f4ff' : Math.floor(Math.atan2(dy, dx) / (Math.PI / 3) + 6) % 2 ? '#c8d0d8' : '#6a7380', x, y);
    }
    R(ctx, '#4b535e', 20, 4, 2, 6); R(ctx, '#8a94a0', 22, 2, 3, 10); R(ctx, '#bfe8f0', 23, 5, 1, 4);                    // nozzle
  } },
  caltrop: { w: 24, h: 13, py: 6, muzzle: 22, draw(ctx, arm) {                // caltrop scatter: a hopper of spikes over a short bell-mouthed barrel
    if (arm) drawArm(ctx, 6);
    R(ctx, '#3a3f47', 5, 5, 13, 5); R(ctx, '#6a7380', 5, 5, 13, 1); R(ctx, '#2a2e35', 6, 10, 3, 3);
    R(ctx, '#4b535e', 8, 2, 7, 3); R(ctx, '#2a2e35', 8, 4, 7, 1);                                                       // hopper
    for (const [x, y] of [[9, 0], [11, 1], [13, 0]]) { R(ctx, '#eef2f6', x, y, 1, 1); R(ctx, '#9aa4b0', x, y + 1, 1, 1); }   // spikes poking out
    R(ctx, '#4b535e', 18, 4, 2, 7); R(ctx, '#8a94a0', 18, 4, 2, 1); R(ctx, '#15171a', 20, 5, 2, 5); R(ctx, '#9aa4b0', 22, 3, 1, 9); R(ctx, '#c8d0d8', 22, 3, 1, 1);   // bell mouth
  } },
  spear: { w: 30, h: 12, py: 5, muzzle: 28, draw(ctx, arm) {                  // spear gun: a cable reel under a long rail, a barbed spear loaded
    if (arm) drawArm(ctx, 5);
    R(ctx, '#3a3f47', 5, 3, 9, 5); R(ctx, '#6a7380', 5, 3, 9, 1); R(ctx, '#2a2e35', 7, 8, 3, 3);
    R(ctx, '#5a636e', 9, 7, 5, 4); R(ctx, '#c8a040', 10, 8, 3, 1); R(ctx, '#2a2e35', 11, 9, 1, 1);                       // cable reel
    R(ctx, '#2a2e35', 14, 5, 12, 2); R(ctx, '#a0aab6', 12, 4, 14, 1);                                                   // rail + shaft
    R(ctx, '#eef2f6', 26, 3, 2, 3); R(ctx, '#9aa4b0', 25, 2, 1, 1); R(ctx, '#9aa4b0', 25, 6, 1, 1); R(ctx, '#ffffff', 28, 4, 1, 1);   // barbed head
  } },
  heatray: { w: 27, h: 13, py: 6, muzzle: 25, draw(ctx, arm) {                // heat ray: radiator fins down a fat emitter, a red lens
    if (arm) drawArm(ctx, 6);
    R(ctx, '#3a3f47', 5, 3, 9, 7); R(ctx, '#6a7380', 5, 3, 9, 1); R(ctx, '#2a2e35', 6, 10, 3, 3); R(ctx, '#e8b422', 7, 5, 4, 1);
    R(ctx, '#4b535e', 14, 4, 9, 5); R(ctx, '#8a94a0', 14, 4, 9, 1);
    for (let i = 0; i < 4; i++) { R(ctx, '#2a2e35', 15 + i * 2, 2, 1, 9); R(ctx, '#7c8790', 15 + i * 2, 2, 1, 1); }      // radiator fins
    R(ctx, '#7a2008', 23, 3, 2, 7); R(ctx, '#ff4a20', 25, 4, 1, 5); R(ctx, '#ffd0a0', 25, 6, 1, 1);                       // lens
  } },
  barrage: { w: 24, h: 13, py: 6, muzzle: 22, draw(ctx, arm) {               // barrage beacon: a stubby launcher with a beacon nosed in, its aerial up
    if (arm) drawArm(ctx, 6);
    R(ctx, '#4a5240', 5, 4, 13, 6); R(ctx, '#6e7a5e', 5, 4, 13, 1); R(ctx, '#2e3428', 5, 9, 13, 1); R(ctx, '#2a2e35', 6, 10, 3, 3);
    R(ctx, '#e8b422', 11, 6, 4, 1); R(ctx, '#2e3428', 9, 1, 1, 3); R(ctx, '#ff3020', 9, 0, 1, 1);                       // stripe + aerial
    R(ctx, '#2a2e35', 18, 3, 2, 8); R(ctx, '#3a3f47', 20, 4, 3, 6); R(ctx, '#ff3020', 21, 6, 2, 2); R(ctx, '#ffb0a0', 21, 6, 1, 1);   // the beacon in the mouth
  } },
  hydro: { w: 26, h: 13, py: 6, muzzle: 24, draw(ctx, arm) {                 // hydro cannon: a blue pressure tank, a gauge and a brass nozzle
    if (arm) drawArm(ctx, 6);
    R(ctx, '#3a3f47', 5, 3, 11, 5); R(ctx, '#6a7380', 5, 3, 11, 1); R(ctx, '#2a2e35', 6, 8, 3, 4);
    R(ctx, '#1e4a8a', 9, 8, 7, 4); R(ctx, '#4a90d8', 9, 8, 7, 1); R(ctx, '#9ad0ff', 10, 9, 2, 1);                        // water tank
    R(ctx, '#d8dee6', 11, 0, 3, 3); R(ctx, '#ff3020', 12, 1, 1, 1);                                                      // pressure gauge
    R(ctx, '#4b535e', 16, 4, 5, 3); R(ctx, '#8a94a0', 16, 4, 5, 1); R(ctx, '#8a6a20', 21, 3, 3, 5); R(ctx, '#e0b850', 21, 3, 3, 1); R(ctx, '#9ad8ff', 24, 5, 1, 1);   // brass nozzle
  } },
};
// ---- expansion: weapons ---- what the ten wheel-only guns fire and leave behind (the quake's rocks, the cyclone's
// funnel, the beams and the jet are drawn live in game.js)
function genExpansionWeaponArt(scene) {
  addTex(scene, 'xw_ball', makeSprite(9, 9, c => {                                                                      // cannonball: lit iron with a glint
    for (let y = 1; y < 8; y++) for (let x = 1; x < 8; x++) { const dx = x + 0.5 - 4.5, dy = y + 0.5 - 4.5, d = Math.hypot(dx, dy); if (d < 3.6) R(c, dx + dy < -2.5 ? '#5a636e' : dx + dy > 2.5 ? '#15171a' : '#2e333b', x, y); }
    R(c, '#c8d0d8', 3, 3, 1, 1); R(c, '#8a94a0', 4, 3, 1, 1); R(c, '#8a94a0', 3, 4, 1, 1);
  }));
  for (const f of [0, 1]) addTex(scene, 'xw_lball' + f, makeSprite(13, 13, c => {                                     // ball lightning: a white core in a jagged blue corona
    for (let y = 0; y < 13; y++) for (let x = 0; x < 13; x++) { const d = Math.hypot(x + 0.5 - 6.5, y + 0.5 - 6.5); if (d < 4) R(c, d < 1.6 ? '#ffffff' : d < 2.8 ? '#c8f4ff' : '#4ab8ff', x, y); }
    const spikes = f ? [[6, 0], [12, 5], [1, 10], [9, 11], [2, 2]] : [[0, 6], [10, 1], [11, 10], [4, 12], [7, 0]];
    for (const [sx, sy] of spikes) { R(c, '#9ae8ff', Math.round((sx + 6) / 2), Math.round((sy + 6) / 2)); R(c, '#4ab8ff', sx, sy); }
  }, null));
  addTex(scene, 'xw_cyc', makeSprite(8, 7, c => { R(c, '#4b535e', 1, 1, 6, 5); R(c, '#8a94a0', 1, 1, 6, 1); R(c, '#bfe8f0', 2, 3, 1, 2); R(c, '#bfe8f0', 4, 2, 1, 2); R(c, '#2a2e35', 6, 2, 1, 3); }));   // cyclone canister
  for (const f of [0, 1]) addTex(scene, 'xw_caltrop' + f, makeSprite(7, 7, c => {                                     // caltrop: a spike up, three legs down (two poses to tumble through)
    if (f) { R(c, '#eef2f6', 1, 1); R(c, '#9aa4b0', 2, 2); R(c, '#5a636e', 3, 3); R(c, '#c8d0d8', 5, 1); R(c, '#9aa4b0', 4, 2); R(c, '#c8d0d8', 3, 4); R(c, '#9aa4b0', 3, 5); R(c, '#c8d0d8', 5, 5); R(c, '#8a94a0', 4, 4); }
    else { R(c, '#ffffff', 3, 1); R(c, '#c8d0d8', 3, 2); R(c, '#5a636e', 3, 3); R(c, '#9aa4b0', 2, 3); R(c, '#9aa4b0', 4, 3); R(c, '#c8d0d8', 1, 4); R(c, '#c8d0d8', 5, 4); R(c, '#8a94a0', 3, 4); R(c, '#eef2f6', 3, 5); }
  }));
  addTex(scene, 'xw_spear', makeSprite(18, 5, c => {                                                                    // spear: a steel shaft, a barbed head
    R(c, '#5a636e', 1, 2, 2, 1); R(c, '#a0aab6', 3, 2, 9, 1); R(c, '#d8dee6', 4, 2, 6, 1);
    R(c, '#9aa4b0', 12, 1, 1, 1); R(c, '#9aa4b0', 12, 3, 1, 1); R(c, '#eef2f6', 12, 2, 4, 1); R(c, '#c8d0d8', 13, 1, 2, 3); R(c, '#ffffff', 16, 2, 1, 1);
  }));
  for (const f of [0, 1]) addTex(scene, 'xw_beacon' + f, makeSprite(7, 10, c => {                                    // barrage beacon: a squat olive can, an aerial, a red lamp (lit in frame 1)
    R(c, '#4a5240', 1, 5, 5, 4); R(c, '#6e7a5e', 1, 5, 5, 1); R(c, '#e8b422', 1, 7, 5, 1); R(c, '#2e3428', 3, 1, 1, 4);
    R(c, f ? '#ff3020' : '#7a1810', 2, 3, 3, 2); if (f) R(c, '#ffd0c0', 3, 3, 1, 1); R(c, '#9aa4b0', 3, 1, 1, 1);
  }));
  addTex(scene, 'xw_shell', makeSprite(5, 10, c => { R(c, '#4a5240', 1, 1, 3, 6); R(c, '#6e7a5e', 1, 1, 1, 6); R(c, '#e8b422', 1, 3, 3, 1); R(c, '#2a2e35', 1, 7, 3, 1); R(c, '#8a94a0', 2, 8, 1, 1); }));   // a falling shell, nose down
}
function drawGlaiveBlade(ctx, cx, cy) {              // three hooked blades on a ring, centred on (cx, cy)
  for (let y = Math.floor(cy - 9); y < cy + 9; y++) for (let x = Math.floor(cx - 9); x < cx + 9; x++) {
    const px = x + 0.5 - cx, py = y + 0.5 - cy, d = Math.hypot(px, py);
    if (d < 1.6) R(ctx, '#e0ffff', x, y);
    else if (d < 2.6) R(ctx, '#46e6ff', x, y);
    else if (d > 3.2 && d < 5.4) R(ctx, (x + y) % 2 ? '#c8d0d8' : '#9aa4b0', x, y);
  }
  for (let k = 0; k < 3; k++) for (let t = 0; t <= 1.001; t += 0.12) {             // swept hooks
    const a = k * Math.PI * 2 / 3 + t * 1.1, r = 5 + t * 3.6;
    R(ctx, t > 0.7 ? '#ffffff' : '#e8eef4', Math.round(cx - 0.5 + Math.cos(a) * r), Math.round(cy - 0.5 + Math.sin(a) * r));
    if (t < 0.6) R(ctx, '#7c8692', Math.round(cx - 0.5 + Math.cos(a - 0.25) * (r - 0.6)), Math.round(cy - 0.5 + Math.sin(a - 0.25) * (r - 0.6)));
  }
}

// ---- enemies ------------------------------------------------------------------
const LEG4 = [[2, 0, -2, 0], [0, 0, 0, 1], [-2, 0, 2, 0], [0, 1, 0, 0]];
function drawGrunt(ctx, phase, open) {           // 20x18 biomech "husk"
  const [fo, flift, bo, blift] = LEG4[phase];
  const leg = (hx, off, lift, back) => {
    const fx = hx + off, fy = 16 - lift;
    for (let y = 12; y < fy; y++) { const t = (y - 12) / Math.max(1, fy - 13); R(ctx, back ? EP.fd : EP.f, Math.round(hx + off * t), y, 2, 1); }
    R(ctx, back ? EP.md : EP.m, fx - 1, fy, 3, 1); R(ctx, EP.bone, fx + 2, fy, 1, 1);
  };
  leg(6, bo, blift, true);
  R(ctx, EP.f, 4, 6, 9, 6); R(ctx, EP.f, 3, 8, 1, 3); R(ctx, EP.fl, 6, 9, 5, 2); R(ctx, EP.fd, 4, 11, 9, 1); R(ctx, EP.fd, 3, 10, 1, 1);
  R(ctx, EP.m, 4, 4, 7, 3); R(ctx, EP.ml, 5, 4, 5, 1); R(ctx, EP.md, 4, 6, 7, 1); R(ctx, EP.md, 6, 5, 1, 1); R(ctx, EP.md, 9, 5, 1, 1);
  R(ctx, EP.ml, 5, 3, 1, 1); R(ctx, EP.ml, 7, 2, 1, 2); R(ctx, EP.ml, 9, 3, 1, 1);
  R(ctx, EP.m, 12, 5, 5, 3); R(ctx, EP.ml, 13, 5, 3, 1); R(ctx, EP.md, 12, 7, 5, 1);
  if (open) { R(ctx, EP.eye, 14, 6, 3, 1); R(ctx, EP.eyeHi, 16, 6, 1, 1);
    R(ctx, EP.gum, 13, 8, 5, 2); R(ctx, EP.bone, 13, 8, 1, 1); R(ctx, EP.bone, 15, 8, 1, 1); R(ctx, EP.bone, 17, 8, 1, 1);
    R(ctx, EP.fd, 12, 10, 6, 1); R(ctx, EP.bone, 14, 10, 1, 1); R(ctx, EP.bone, 16, 10, 1, 1);
  } else { R(ctx, EP.eye, 15, 6, 2, 1); R(ctx, EP.eyeHi, 16, 6, 1, 1);
    R(ctx, EP.fd, 12, 8, 6, 2); R(ctx, EP.bone, 13, 8, 1, 1); R(ctx, EP.bone, 15, 8, 1, 1); R(ctx, EP.bone, 17, 8, 1, 1); R(ctx, EP.gum, 14, 9, 3, 1);
  }
  leg(11, fo, flift, false);
  R(ctx, EP.f, 10, 10, 3, 2); R(ctx, EP.fl, 10, 10, 2, 1); R(ctx, EP.bone, 13, 11, 1, 1); R(ctx, EP.bone, 12, 12, 1, 1);
}
function drawHeavy(ctx, phase, wind) {           // 28x28 armoured brute with a furnace core
  const [fo, flift, bo, blift] = LEG4[phase];
  const leg = (hx, off, lift, back) => {
    const fy = 25 - lift;
    for (let y = 19; y < fy; y++) { const t = (y - 19) / Math.max(1, fy - 20), lx = Math.round(hx + off * t);
      R(ctx, back ? EP.md : EP.m, lx - 2, y, 4, 1); if (!back) R(ctx, EP.ml, lx - 2, y, 1, 1); }
    const fx = hx + off; R(ctx, back ? EP.md : EP.m, fx - 3, fy, 6, 2); R(ctx, back ? EP.m : EP.ml, fx - 3, fy, 6, 1);
  };
  leg(10, bo, blift, true);
  R(ctx, EP.f, 7, 10, 14, 10); R(ctx, EP.fd, 7, 19, 14, 1);
  R(ctx, EP.fl, 10, 17, 1, 2); R(ctx, EP.fl, 13, 17, 1, 2); R(ctx, EP.fl, 16, 17, 1, 2);
  R(ctx, EP.m, 8, 9, 12, 8); R(ctx, EP.ml, 9, 9, 10, 1); R(ctx, EP.md, 8, 16, 12, 1); R(ctx, EP.md, 8, 9, 1, 8);
  if (wind) { R(ctx, EP.core, 11, 10, 6, 6); R(ctx, EP.coreHi, 12, 11, 4, 4); R(ctx, '#ffffff', 13, 12, 2, 2); }
  else { R(ctx, EP.core, 12, 11, 4, 4); R(ctx, EP.coreHi, 13, 12, 2, 2); }
  R(ctx, EP.fd, 12, 4, 6, 5); R(ctx, EP.f, 13, 4, 4, 1); R(ctx, EP.m, 14, 6, 4, 3); R(ctx, EP.ml, 14, 6, 4, 1); R(ctx, EP.eye, 16, 7, 2, 1);
  R(ctx, EP.m, 3, 8, 6, 5); R(ctx, EP.ml, 3, 8, 6, 1); R(ctx, EP.md, 3, 12, 6, 1); R(ctx, EP.ml, 5, 7, 1, 1);
  R(ctx, EP.m, 19, 8, 6, 5); R(ctx, EP.ml, 19, 8, 6, 1); R(ctx, EP.md, 19, 12, 6, 1); R(ctx, EP.ml, 22, 7, 1, 1);
  leg(17, fo, flift, false);
  if (!wind) {
    R(ctx, EP.f, 3, 13, 4, 6); R(ctx, EP.fd, 3, 18, 4, 1); R(ctx, EP.md, 2, 19, 6, 5); R(ctx, EP.m, 2, 19, 6, 1);
    R(ctx, EP.f, 21, 13, 4, 6); R(ctx, EP.fl, 21, 13, 1, 5); R(ctx, EP.m, 20, 19, 6, 5); R(ctx, EP.ml, 20, 19, 6, 1); R(ctx, EP.md, 20, 23, 6, 1);
  } else {
    R(ctx, EP.f, 3, 4, 4, 5); R(ctx, EP.md, 2, 1, 6, 4); R(ctx, EP.m, 2, 1, 6, 1);
    R(ctx, EP.f, 21, 4, 4, 5); R(ctx, EP.m, 20, 1, 6, 4); R(ctx, EP.ml, 20, 1, 6, 1);
  }
}
function drawDrone(ctx, sway, charge) {          // 18x16 hovering eye-sentry
  [6, 9, 12].forEach((x, i) => { const s = (i + sway) % 2; R(ctx, EP.f, x, 12, 1, 2); R(ctx, EP.fd, x + s, 14, 1, 1); });
  const cx = 9, cy = 7.5, r = 5.6;
  for (let y = 1; y < 14; y++) for (let x = 2; x < 17; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy; if (dx * dx + dy * dy > r * r) continue;
    const l = (-dx * 0.55 - dy * 0.85) / r;
    R(ctx, l > 0.45 ? EP.ml : l > -0.2 ? EP.m : EP.md, x, y);
  }
  for (let x = 4; x < 15; x++) if ((x + 0.5 - cx) ** 2 + (10.5 - cy) ** 2 <= r * r) R(ctx, '#2a2f36', x, 10);
  for (let y = 4; y < 12; y++) for (let x = 8; x < 16; x++) {
    const dx = x + 0.5 - 11.5, dy = y + 0.5 - 7.5, d2 = dx * dx + dy * dy;
    if (d2 <= 7.3) R(ctx, d2 > 4.4 ? '#1a1d22' : '#e8e2d8', x, y);
  }
  R(ctx, charge ? '#ffd23a' : EP.eye, 11, 6, 2, 3); R(ctx, charge ? '#ffffff' : '#3a0505', 12, 7, 1, 1);
  R(ctx, EP.md, 1, 5, 2, 1); R(ctx, EP.md, 1, 10, 2, 1); R(ctx, EP.m, 2, 6, 1, 4);
  R(ctx, EP.ml, 8, 1, 1, 1); R(ctx, EP.md, 7, 13, 4, 1);
}

// ---- destructible props: art ------------------------------------------------------
// Thirty breakables, drawn like the rest of the scenery: lit from the top left, volumes quantised to a ramp and a 1px
// outline. Each has its intact frame, any frames it needs while it's hurt or going off, and a wreck ('x') that stays
// put until the next wave restocks it. PROP_ART[kind] = { w, h, fr: frame names (the first is the intact one), draw }.
const PRR = {
  red: ['#1e0605', '#3a0c0a', '#5e1410', '#8a1e16', '#b42c1e', '#d8442c', '#f26e4e', '#ffa080'],
  wht: ['#2a2e34', '#454b53', '#646b74', '#868d96', '#a8aeb6', '#c8cdd3', '#e4e7ea', '#ffffff'],
  yel: ['#2e2004', '#5a3e08', '#86600e', '#b08416', '#d4a422', '#f0c434', '#ffe070'],
  grn: ['#0a2006', '#14400c', '#226a14', '#36961e', '#56c42c', '#86ec4a', '#c8ff96'],
  ice: ['#0a1626', '#12304c', '#1c5276', '#2c7aa2', '#4ca4c8', '#7ccae4', '#b8ecf8', '#f0fdff'],
  blk: ['#060608', '#0e0f12', '#17191e', '#22252c', '#30343c', '#444952', '#5e6470', '#868c98'],
  cop: ['#1a0a05', '#36170a', '#5a2a12', '#82401c', '#aa5a28', '#ce7836', '#ec9c52', '#ffc888'],
  brs: ['#241606', '#46300c', '#6a4a12', '#92661c', '#b88828', '#d8aa40', '#f2d26c', '#fff0b0'],
  olv: ['#10140a', '#1e2410', '#2e3818', '#3e4c20', '#50622a', '#687c36', '#849a48'],
  tea: ['#041418', '#082a30', '#0e4048', '#16585f', '#227478', '#349494', '#56b8b4', '#90e0d8'],
  blu: ['#06101e', '#0c1e36', '#142e52', '#1e446e', '#2a5c8c', '#3a78aa', '#5a9ac8', '#8cc0e6'],
};
const prCyl = (c, cx, y0, y1, r, ramp, bias = 0) => limb(c, cx, y0, cx, y1, r, r, ramp, bias, true);   // upright drum
function prEll(c, cx, cy, rx, ry, col) {
  for (let y = Math.floor(cy - ry); y < Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x < Math.ceil(cx + rx); x++) if (inBlob(x, y, cx, cy, rx, ry, 2)) R(c, col, x, y);
}
function prLine(c, col, x0, y0, x1, y1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) R(c, col, Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n));
}
const prRng = s => () => ((s = (s * 16807) % 2147483647) & 0xffff) / 0xffff;
function prCracks(c, cx, cy, n, len, seed, hi = '#d8f0fa', lo = '#4a7484') {   // a starburst of cracks in glass
  const rnd = prRng(seed * 7919 + 13);
  for (let i = 0; i < n; i++) {
    let a = (i / n) * Math.PI * 2 + rnd() * 0.7, x = cx + 0.5, y = cy + 0.5;
    const L = len * (0.55 + rnd() * 0.7);
    for (let k = 0; k < L; k++) { a += (rnd() - 0.5) * 0.6; x += Math.cos(a); y += Math.sin(a); R(c, k % 3 === 2 ? lo : hi, Math.floor(x), Math.floor(y)); }
  }
  R(c, '#ffffff', cx, cy);
}
function prOpaque(c, x, y) { return x >= 0 && y >= 0 && x < c.canvas.width && y < c.canvas.height && c.getImageData(x, y, 1, 1).data[3] > 0; }
function prTear(c, x0, x1, y0, amp, seed, rim = '#1a120e') {    // rip the top off along a ragged line, with a scorched lip
  const rnd = prRng(seed * 4099 + 7); let h = y0;
  for (let x = x0; x < x1; x++) {
    h = clamp(Math.round(h + (rnd() - 0.5) * amp * 1.8 + (y0 - h) * 0.35), y0 - amp, y0 + amp);
    const top = h - (rnd() < 0.2 ? Math.round(rnd() * amp * 1.5) : 0);   // the odd petal of metal sticking up
    c.clearRect(x, 0, 1, top);
    if (prOpaque(c, x, top)) R(c, rim, x, top);
  }
}
function prScorch(c, x0, y0, w, h, n, seed) {                       // soot on whatever is already drawn
  const rnd = prRng(seed * 131 + 3);
  c.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < n; i++) { c.fillStyle = rnd() < 0.5 ? 'rgba(6,5,4,0.8)' : 'rgba(18,12,9,0.55)'; c.fillRect(Math.floor(x0 + rnd() * w), Math.floor(y0 + rnd() * h), rnd() < 0.3 ? 2 : 1, rnd() < 0.3 ? 2 : 1); }
  c.globalCompositeOperation = 'source-over';
}
function prDrum(c, cx, r, ramp, band) {                             // a 15-tall drum with rolled ribs, its lid seen a little from above
  prCyl(c, cx, 2, 14.5, r, ramp);
  prCyl(c, cx, 5, 6, r + 0.1, band); prCyl(c, cx, 10, 11, r + 0.1, band);
  prEll(c, cx, 2.2, r, 1.7, ramp[ramp.length - 2]); prEll(c, cx, 2.3, r - 1.1, 1.0, ramp[2]);
}
const NEON_G = {
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  G: ['.####', '#....', '#....', '#..##', '#...#', '#...#', '.###.'],
};
const NEON_POP = [3, 0, 2, 1];                                    // the order the letters go out
function drawNeon(c, lit, dead) {                                 // 34x15: 'SLAG' in pink tube inside a cyan frame tube
  for (const bx of [7, 25]) { R(c, '#2a2e35', bx, 0, 2, 3); R(c, '#5d6775', bx, 0, 1, 2); }
  R(c, '#0d0f13', 0, 2, 34, 13); R(c, '#181b21', 1, 3, 32, 11); R(c, '#262a32', 1, 3, 32, 1); R(c, '#08090b', 1, 13, 32, 1);
  const off = new Set(NEON_POP.slice(0, 4 - lit)), on = i => !dead && !off.has(i), glyph = (i, fn) => {
    const g = NEON_G['SLAG'[i]], ox = 4 + i * 7;
    for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if (g[y][x] === '#') fn(ox + x, 5 + y);
  };
  for (let i = 0; i < 4; i++) if (on(i)) glyph(i, (x, y) => { for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) R(c, '#3a0c26', x + dx, y + dy); });
  for (let i = 0; i < 4; i++) if (on(i)) glyph(i, (x, y) => { for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) R(c, '#b0207a', x + dx, y + dy); });
  const cy = dead ? '#1c3a42' : '#4ce4fa';
  for (let x = 2; x <= 31; x++) { R(c, cy, x, 4); R(c, cy, x, 12); }
  for (let y = 4; y <= 12; y++) { R(c, cy, 2, y); R(c, cy, 31, y); }
  if (!dead) { R(c, '#e4fdff', 3, 4, 27, 1); R(c, '#e4fdff', 2, 5, 1, 6); }
  for (let i = 0; i < 4; i++) glyph(i, (x, y) => R(c, on(i) ? '#ffd2ee' : '#3e1a30', x, y));
  if (dead) { R(c, '#0d0f13', 13, 5, 1, 3); R(c, '#0d0f13', 27, 9, 2, 1); }      // gaps where tube snapped
  for (const [x, y] of [[1, 3], [32, 3], [1, 13], [32, 13]]) R(c, '#4b535e', x, y);
}
function drawTube(c, st) {                                        // 26x6 fluorescent fitting: 'ok' lit, 'off' mid-flicker, 'x' smashed
  R(c, '#262a31', 0, 0, 26, 2); R(c, '#4b535e', 1, 0, 24, 1); R(c, '#15171b', 1, 2, 24, 1);
  for (const ex of [0, 24]) { R(c, '#3a3f47', ex, 2, 2, 4); R(c, '#5d6775', ex, 2, 1, 4); R(c, '#c8a040', ex ? 24 : 1, 3, 1, 1); }
  if (st === 'x') { R(c, '#b8c8d0', 2, 3, 3, 1); R(c, '#7c8c98', 2, 4, 2, 1); R(c, '#dfe8ee', 21, 3, 3, 1); R(c, '#9aaab6', 22, 5, 2, 1); R(c, '#c8d8e0', 3, 5, 1, 1); return; }
  const lit = st === 'ok';
  R(c, lit ? '#f4fcff' : '#7a8a98', 2, 3, 22, 1); R(c, lit ? '#9ad4ec' : '#36424c', 2, 4, 22, 1); R(c, lit ? '#e0f5ff' : '#68788a', 2, 5, 22, 1);
  if (lit) { R(c, '#ffffff', 4, 3, 9, 1); R(c, '#ffffff', 15, 5, 5, 1); }
}
function drawFlood(c, st) {                                       // 16x24 tripod floodlight, lens facing right
  const Y = PRR.yel, x = st === 'x';
  prLine(c, IRN[2], 8, 14, 8, 22); prLine(c, IRN[5], 7, 13, 1, 23); prLine(c, IRN[4], 9, 13, 15, 23);
  R(c, IRN[3], 0, 23, 3, 1); R(c, IRN[3], 14, 23, 2, 1); R(c, IRN[2], 7, 22, 3, 1);
  R(c, IRN[3], 6, 12, 5, 2); R(c, IRN[6], 6, 12, 5, 1); R(c, IRN[3], 7, 9, 3, 3); R(c, IRN[5], 7, 9, 1, 3);
  R(c, IRN[4], 3, 9, 11, 1); R(c, IRN[4], 3, 3, 1, 7); R(c, IRN[3], 13, 3, 1, 7); R(c, IRN[6], 3, 5, 1, 1); R(c, IRN[6], 13, 5, 1, 1);   // yoke
  limb(c, 5, 5.5, 11, 5.5, 4.4, 4.4, Y, 0.02, true);
  for (const fx of [5, 7]) R(c, Y[1], fx, 2, 1, 7);                // cooling fins
  R(c, IRN[3], 6, 0, 5, 1); R(c, IRN[5], 6, 0, 2, 1);              // handle
  prEll(c, 12.5, 5.5, 2.2, 5, '#1a1d22');
  prEll(c, 12.6, 5.5, 1.5, 4.2, x ? '#12161c' : '#fff2c4');
  if (!x) { R(c, '#ffffff', 12, 3, 1, 5); R(c, '#ffe08a', 13, 2, 1, 1); R(c, '#ffe08a', 13, 8, 1, 1); }
  else { R(c, '#c8d8e0', 12, 2); R(c, '#8a9aa6', 13, 4); R(c, '#dfe8ee', 12, 7); R(c, '#8a9aa6', 13, 8); R(c, Y[0], 8, 2, 2, 2); R(c, Y[5], 8, 4, 2, 1); prScorch(c, 4, 1, 10, 9, 10, 5); }
}
function drawFuse(c, st) {                                        // 14x18 fuse box on a conduit
  R(c, IRN[3], 6, 0, 2, 4); R(c, IRN[5], 6, 0, 1, 4);
  R(c, IRN[1], 0, 3, 14, 15); R(c, IRN[4], 1, 4, 12, 13); R(c, IRN[6], 1, 4, 12, 1); R(c, IRN[5], 1, 5, 1, 12); R(c, IRN[2], 1, 16, 12, 1); R(c, IRN[3], 12, 5, 1, 11);
  if (st === 'x') {
    R(c, '#07080a', 2, 5, 10, 11);
    for (let i = 0; i < 3; i++) { const y = 6 + i * 3; R(c, IRN[3], 3, y, 8, 2); for (let k = 0; k < 4; k++) R(c, (i + k) % 3 ? '#c8cdd3' : '#e8b422', 3 + k * 2, y, 1, 1); }
    R(c, '#020202', 6, 7, 3, 4); R(c, '#020202', 5, 9, 1, 3); R(c, '#020202', 8, 11, 2, 2);
    R(c, '#c83020', 4, 15, 1, 3); R(c, '#e8b422', 8, 15, 1, 3); R(c, '#3a80e0', 10, 16, 1, 2); R(c, IRN[7], 1, 6); R(c, IRN[7], 1, 13);
    return;
  }
  R(c, IRN[5], 2, 5, 10, 11); R(c, IRN[6], 2, 5, 10, 1); R(c, IRN[3], 2, 15, 10, 1); R(c, IRN[3], 11, 6, 1, 9); R(c, IRN[7], 2, 6); R(c, IRN[7], 2, 13);
  for (let r = 0; r < 4; r++) R(c, r === 3 ? '#c08a14' : '#e8b422', 7 - r, 6 + r, r * 2 + 1, 1);
  R(c, '#15161a', 7, 7); R(c, '#15161a', 6, 8, 2, 1); R(c, '#15161a', 7, 9);
  R(c, IRN[2], 4, 11, 6, 1); R(c, IRN[2], 4, 13, 6, 1); R(c, IRN[7], 4, 12, 6, 1);
  R(c, IRN[2], 10, 9, 1, 3); R(c, IRN[7], 10, 9);
  R(c, st === 'hit' ? '#ffb0a0' : '#ff2a14', 10, 6);
  if (st === 'hit') { R(c, IRN[3], 4, 6, 2, 1); R(c, IRN[7], 4, 7, 2, 1); R(c, '#07080a', 9, 11); R(c, '#07080a', 5, 14); R(c, '#ffe080', 5, 13); }
}
function drawCap(c, st) {                                         // 18x22 capacitor bank: two cans, a coil and a spark gap
  const ch = st === 'charge';
  R(c, IRN[2], 0, 19, 18, 3); R(c, IRN[4], 0, 19, 18, 1);
  for (let i = 0; i < 9; i++) R(c, i % 2 ? '#15161a' : '#e8b422', i * 2, 20, 2, 2);
  for (let y = 7; y < 18; y++) { R(c, y % 2 ? PRR.cop[5] : PRR.cop[2], 8, y, 2, 1); if (!(y % 2)) R(c, ch ? '#e8fbff' : '#1e5aa0', 8 + (y % 4 ? 1 : 0), y, 1, 1); }
  R(c, IRN[3], 7, 18, 4, 1);
  for (const cx of [4, 14]) {
    prCyl(c, cx, 6, 19, 3.5, PRR.blk); prCyl(c, cx, 9, 11, 3.6, PRR.yel); prCyl(c, cx, 15, 16, 3.6, PRR.yel.slice(0, 5));
    prEll(c, cx, 6, 3.5, 1.2, PRR.blk[5]); prCyl(c, cx, 3, 6, 1.5, PRR.cop); R(c, PRR.cop[7], cx - 1, 3);
  }
  R(c, IRN[5], 5, 3, 2, 1); R(c, IRN[5], 11, 3, 2, 1); blob(c, 7, 3.5, 1.4, 1.4, PRR.cop, 2, 0.1); blob(c, 11, 3.5, 1.4, 1.4, PRR.cop, 2, 0.1);
  if (ch) { R(c, '#ffffff', 8, 3, 2, 1); R(c, '#a0e8ff', 9, 2); R(c, '#a0e8ff', 8, 4); }
  R(c, '#0a0b0e', 6, 16, 6, 2);
  for (let i = 0; i < 4; i++) R(c, i < (ch ? 4 : 2) ? (ch ? '#c8f8ff' : '#5cff7a') : '#1a2a1e', 7 + i, 17);
  if (st === 'x') { prTear(c, 0, 18, 10, 3, 11); prScorch(c, 0, 8, 18, 14, 40, 7); R(c, '#3a2a20', 8, 12, 2, 1); }
}
function drawPropane(c, st) {                                     // 12x18 propane bottle in its guard collar
  const W = PRR.wht;
  R(c, W[1], 2, 16, 8, 2); R(c, W[3], 2, 16, 8, 1);
  limb(c, 6, 7.5, 6, 12.5, 5, 5, W, 0.04);
  R(c, W[2], 2, 10, 8, 1); R(c, W[5], 2, 11, 1, 1);
  R(c, W[3], 2, 1, 8, 1); R(c, W[6], 2, 1, 4, 1); R(c, W[4], 2, 2, 1, 2); R(c, W[2], 9, 2, 1, 2);
  R(c, PRR.brs[4], 5, 2, 2, 2); R(c, PRR.brs[6], 5, 2, 1, 1); R(c, PRR.red[4], 4, 1, 4, 1); R(c, PRR.red[6], 4, 1, 1, 1);
  R(c, PRR.red[5], 6, 11); R(c, PRR.red[5], 5, 12, 3, 1); R(c, PRR.red[5], 6, 13); R(c, '#ffffff', 6, 12);
  if (st === 'hit') { R(c, W[2], 3, 7, 2, 1); R(c, W[7], 3, 8, 2, 1); R(c, W[1], 8, 14); }
  if (st === 'x') { prTear(c, 0, 12, 11, 3, 3); prScorch(c, 0, 7, 12, 11, 22, 3); }
}
function drawToxic(c, st) {                                       // 13x15 waste drum: hazard band, ooze over the rim
  const G = PRR.grn;
  prDrum(c, 6.5, 5.5, PRR.yel, PRR.yel.slice(0, 5));
  for (let y = 6; y <= 9; y++) for (let x = 1; x < 12; x++) if (prOpaque(c, x, y) && ((x + y) >> 1) % 2 === 0) R(c, x < 3 ? '#34322a' : x > 9 ? '#060608' : '#15161a', x, y);
  R(c, G[5], 3, 2, 4, 1); R(c, G[6], 4, 2); R(c, G[4], 3, 3, 1, 4); R(c, G[6], 3, 3); R(c, G[3], 3, 7); R(c, G[4], 6, 3, 1, 2); R(c, G[3], 6, 5);
  R(c, G[4], 9, 3, 1, 2); R(c, G[5], 9, 3);
  if (st === 'hit') { R(c, '#0a1406', 10, 11); R(c, G[5], 10, 12, 1, 2); R(c, '#0a1406', 4, 12); R(c, G[5], 4, 13); R(c, PRR.yel[2], 9, 4, 1, 1); }
  if (st === 'x') { prTear(c, 0, 13, 8, 2, 5); for (let x = 2; x < 11; x++) if (prOpaque(c, x, 9)) R(c, x % 3 ? G[3] : G[5], x, 9); prScorch(c, 0, 8, 13, 7, 14, 9); }
}
function drawCryo(c, st) {                                        // 12x20 coolant tank, frosting over
  const I = PRR.ice.slice(2);
  prCyl(c, 6, 5, 19.5, 5, I, 0.06);
  blob(c, 6, 5.2, 5, 2.6, I, 2, 0.1, (x, y) => y <= 5);
  prCyl(c, 6, 9, 12, 5.08, PRR.ice.slice(0, 5));
  R(c, '#ffffff', 6, 9, 1, 3); R(c, '#ffffff', 5, 10, 3, 1); for (const [x, y] of [[5, 9], [7, 9], [5, 11], [7, 11]]) R(c, '#a8e4f8', x, y);
  R(c, '#f0fdff', 1, 17, 3, 1); R(c, '#f0fdff', 2, 16); R(c, '#d8f4ff', 1, 15, 1, 2); R(c, '#f0fdff', 8, 18, 2, 1); R(c, '#ffffff', 2, 6); R(c, '#e8fbff', 9, 15);
  R(c, IRN[4], 5, 0, 2, 3); R(c, IRN[6], 5, 0, 1, 2); R(c, PRR.wht[6], 8, 1, 2, 2); R(c, '#e02020', 9, 1);
  if (st === 'hit') { R(c, '#2c5a78', 8, 6, 2, 1); R(c, '#ffffff', 8, 7, 2, 1); R(c, '#12304c', 3, 13); R(c, '#ffffff', 3, 14, 1, 2); }
  if (st === 'x') { prTear(c, 0, 12, 12, 3, 8, '#7ccae4'); for (const x of [2, 5, 8, 10]) if (prOpaque(c, x, 12)) R(c, '#f0fdff', x, 10, 1, 2); prScorch(c, 0, 10, 12, 10, 6, 2); }
}
function drawOil(c, st) {                                         // 12x15 black oil drum: a wet sheen and an orange flammable band
  prDrum(c, 6, 5, PRR.blk, PRR.blk.slice(2));
  prCyl(c, 6, 7, 10, 5.06, ['#3a1404', '#6a2a08', '#a8480e', '#d8681a', '#f08a30', '#ffb060']);
  R(c, '#f4f4ec', 6, 7); R(c, '#f4f4ec', 5, 8, 3, 1); R(c, '#f4f4ec', 6, 9); R(c, '#c8401a', 6, 8);
  R(c, '#8a909c', 2, 3, 1, 4); R(c, '#8a909c', 2, 11, 1, 3); R(c, '#d8dce4', 2, 4);
  R(c, '#020203', 9, 2, 1, 4); R(c, '#4a4e58', 9, 3); R(c, '#020203', 8, 2);
  if (st === 'hit') { R(c, '#000000', 3, 12); R(c, '#2a2d35', 3, 13, 1, 1); R(c, PRR.blk[2], 9, 4, 1, 2); R(c, PRR.blk[6], 9, 6); }
  if (st === 'x') { prTear(c, 0, 12, 8, 2, 4, '#5e6470'); R(c, '#020203', 4, 9, 4, 1); }
}
function drawBoiler(c, st) {                                      // 26x30 riveted copper boiler on its firebox
  const hot = st === 'hot', C = PRR.cop;
  R(c, IRN[1], 2, 22, 22, 7); R(c, IRN[4], 2, 22, 22, 1); R(c, IRN[3], 2, 23, 1, 6); R(c, IRN[0], 23, 23, 1, 6);
  R(c, IRN[1], 2, 29, 5, 1); R(c, IRN[1], 19, 29, 5, 1);
  R(c, IRN[0], 8, 24, 10, 4);
  for (let x = 9; x < 17; x++) { R(c, MLT[hot ? 5 + (x * 7) % 3 : 2 + (x * 5) % 3], x, 26, 1, 2); R(c, MLT[hot ? 4 : 1], x, 25); }
  for (const x of [10, 13, 16]) R(c, IRN[3], x, 24, 1, 4);
  prCyl(c, 13, 8, 22, 10, C, hot ? 0.08 : 0.02);
  blob(c, 13, 8.5, 10, 5.5, C, 2.2, 0.06, (x, y) => y < 8.5);
  for (const y of [11, 18]) { prCyl(c, 13, y, y + 1.2, 10.1, PRR.brs); for (let x = 5; x <= 21; x += 3) R(c, hot ? '#ffe070' : PRR.brs[7], x, y); }
  if (hot) for (const y of [12, 19, 8]) for (let x = 4; x < 23; x++) if ((x * 13 + y) % 5 < 2) R(c, x % 2 ? '#ff6a1a' : '#ffb040', x, y);
  prEll(c, 19, 14.5, 3.2, 3.2, IRN[1]); prEll(c, 19, 14.5, 2.4, 2.4, '#e8e4d8'); R(c, '#e02020', 21, 13, 1, 2); R(c, '#e02020', 20, 12);
  R(c, IRN[3], 16, 0, 2, 5); R(c, IRN[5], 16, 0, 1, 5); R(c, IRN[3], 8, 0, 9, 2); R(c, IRN[5], 8, 0, 9, 1);
  prCyl(c, 9.5, 2, 5, 1.6, PRR.brs); R(c, PRR.brs[7], 9, 2);
  R(c, PRR.brs[4], 3, 20, 2, 2); R(c, PRR.red[4], 2, 20, 1, 1);
  if (st === 'x') { prTear(c, 0, 26, 16, 4, 6, '#3a1a0c'); prScorch(c, 0, 10, 26, 20, 60, 4); R(c, IRN[0], 9, 25, 8, 3); }
}
function drawFanBase(c, st) {                                     // 22x22 wall fan housing (the blades and guard are their own sprites)
  R(c, IRN[2], 0, 0, 22, 22); R(c, IRN[4], 0, 0, 22, 1); R(c, IRN[4], 0, 0, 1, 22); R(c, IRN[0], 21, 0, 1, 22); R(c, IRN[0], 0, 21, 22, 1);
  for (let y = 1; y < 21; y++) for (let x = 1; x < 21; x++) {
    const dx = x + 0.5 - 11, dy = y + 0.5 - 11, r = Math.hypot(dx, dy);
    if (r > 10.3) continue;
    if (r > 9.2) R(c, IRN[(dx + dy) < 0 ? 5 : 2], x, y);
    else R(c, r < 4 ? '#11141a' : r < 7 ? '#0c0e12' : '#08090c', x, y);
  }
  for (const [x, y] of [[2, 2], [19, 2], [2, 19], [19, 19]]) { R(c, IRN[6], x, y); R(c, IRN[0], x + 1, y + 1); }
  if (st === 'x') {
    prLine(c, '#6a737e', 3, 7, 8, 10); prLine(c, '#4b535e', 14, 16, 18, 12); prLine(c, '#6a737e', 11, 2, 12, 5); prLine(c, '#4b535e', 4, 15, 7, 13);
    blob(c, 11, 11, 2.6, 2.6, IRN, 2, 0.05); R(c, '#2a1810', 10, 12, 2, 1); prScorch(c, 4, 4, 14, 14, 18, 6);
  }
}
function drawFanBlade(c) {                                        // 18x18 three curved paddles on a hub
  for (let y = 0; y < 18; y++) for (let x = 0; x < 18; x++) {
    const dx = x + 0.5 - 9, dy = y + 0.5 - 9;
    for (let k = 0; k < 3; k++) {
      const b = k * Math.PI * 2 / 3, u = dx * Math.cos(b) + dy * Math.sin(b), v = -dx * Math.sin(b) + dy * Math.cos(b);
      if (u < 1.5 || u > 8.4) continue;
      const t = (u - 1.2) / 7.2, half = 0.6 + 2.3 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.95)), 0.8), sv = v - 0.09 * (u - 1.5) * (u - 1.5);
      if (Math.abs(sv) > half) continue;
      const e = sv / half; R(c, u > 7.6 ? IRN[4] : e < -0.45 ? IRN[7] : e < 0.25 ? IRN[6] : e < 0.7 ? IRN[5] : IRN[3], x, y);
    }
  }
  blob(c, 9, 9, 2.7, 2.7, IRN, 2, 0.12); R(c, IRN[7], 8, 8); R(c, '#e8b422', 9, 9);
}
function drawFanGrill(c) {                                        // 22x22 see-through wire guard
  for (let y = 0; y < 22; y++) for (let x = 0; x < 22; x++) {
    const dx = x + 0.5 - 11, dy = y + 0.5 - 11, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    const ring = Math.abs(r - 4.2) < 0.5 || Math.abs(r - 6.9) < 0.5 || Math.abs(r - 9.4) < 0.55;
    const spoke = r > 2.2 && r < 9.8 && Math.abs(Math.sin(a * 2)) < 0.55 / r;
    if (ring || spoke) R(c, dx + dy < 0 ? '#a0aab6' : dx + dy < 6 ? '#6a737e' : '#4b535e', x, y);
  }
  R(c, '#2a2e35', 10, 10, 2, 2); R(c, '#c8d0d8', 10, 10);
}
function drawLadle(c, st) {                                       // 22x18 foundry ladle on a bail, slag glowing in its mouth
  const cold = st === 'x';
  for (let i = 0; i <= 28; i++) { const a = Math.PI * i / 28; R(c, IRN[i < 14 ? 6 : 4], Math.round(11 - Math.cos(a) * 10), Math.round(9 - Math.sin(a) * 8)); }
  R(c, IRN[7], 10, 0, 2, 1); R(c, IRN[6], 1, 8, 1, 2); R(c, IRN[4], 20, 8, 1, 2);
  for (let y = 6; y < 18; y++) {
    const hw = 10 - (y - 6) / 11 * 3, x0 = Math.round(11 - hw), x1 = Math.round(11 + hw), band = y === 9 || y === 14, ramp = band ? RST : IRN;
    for (let x = x0; x < x1; x++) { const n = (x + 0.5 - 11) / hw, I = -n * 0.55 + Math.sqrt(Math.max(0, 1 - n * n)) * 0.45 - (y - 6) * 0.015; R(c, ramp[shadeIdx(ramp.length, I, band ? 0.1 : -0.04)], x, y); }
  }
  R(c, IRN[6], 1, 6, 20, 1); R(c, IRN[7], 2, 6, 6, 1); R(c, IRN[5], 0, 5, 2, 1); R(c, IRN[6], 0, 4);
  prEll(c, 11, 5.6, 8.6, 1.5, cold ? '#2a1a14' : MLT[5]);
  if (!cold) { prEll(c, 11, 5.6, 6, 0.9, MLT[6]); R(c, MLT[7], 9, 5, 4, 1); R(c, MLT[2], 5, 6); R(c, MLT[2], 16, 5); R(c, MLT[3], 17, 6); R(c, MLT[4], 0, 6); }
  else { R(c, '#4a2a1a', 6, 5, 3, 1); R(c, '#140c08', 12, 6, 4, 1); R(c, '#6a3418', 15, 5); prScorch(c, 2, 6, 18, 12, 16, 8); }
}
function drawVending(c, st) {                                     // 18x30 coolant-cola machine
  const T = PRR.tea, x = st === 'x', hit = st === 'hit';
  R(c, T[2], 0, 0, 18, 30); R(c, T[5], 0, 0, 18, 1); R(c, T[4], 0, 1, 1, 29); R(c, T[1], 17, 1, 1, 29); R(c, T[0], 0, 29, 18, 1);
  R(c, '#061012', 1, 1, 16, 5);
  if (!x) { R(c, '#3ae8e0', 2, 2, 14, 3); R(c, '#d8fffc', 2, 2, 14, 1); for (const lx of [3, 5, 6, 8, 10, 11, 13, 14]) R(c, '#0e6a66', lx, 3); for (const lx of [4, 7, 9, 12]) R(c, '#0e6a66', lx, 4); }
  else { R(c, '#0c1a1c', 2, 2, 14, 3); R(c, '#2a8a86', 3, 2, 2, 1); R(c, '#1a5a58', 12, 4, 3, 1); }
  R(c, '#b8c2cc', 1, 7, 11, 18); R(c, '#e8eef4', 1, 7, 11, 1); R(c, '#e8eef4', 1, 7, 1, 18); R(c, '#6a737e', 11, 8, 1, 17);
  R(c, x ? '#040608' : '#081014', 2, 8, 9, 16);
  const CAN = ['#e03424', '#38c858', '#f0c828', '#3a88f0'];
  for (let s = 0; s < 4; s++) {
    const y = 11 + s * 4; R(c, '#6a737e', 2, y, 9, 1);
    for (let k = 0; k < 3; k++) {
      if ((x && (s + k) % 3) || (hit && s === 1 && k === 2)) continue;
      const cx = 3 + k * 3, col = CAN[(s + k) % 4]; R(c, col, cx, y - 3, 2, 3); R(c, '#ffffff', cx, y - 3, 2, 1); R(c, 'rgba(0,0,0,0.35)', cx + 1, y - 2, 1, 2);
    }
  }
  if (!x) for (let i = 0; i < 16; i++) { const yy = 8 + i, xx = 10 - Math.floor(i * 0.5); R(c, 'rgba(170,225,245,0.32)', xx, yy); if (i % 3) R(c, 'rgba(170,225,245,0.18)', xx - 4, yy); }
  if (hit) prCracks(c, 6, 13, 6, 6, 11);
  if (x) { for (const [tx, ty, h] of [[2, 8, 2], [5, 8, 3], [9, 8, 1], [2, 21, 3], [10, 19, 4], [7, 23, 1]]) R(c, '#9ab4c0', tx, ty, 1, h); prScorch(c, 2, 8, 9, 16, 14, 2); }
  R(c, T[1], 12, 7, 5, 18); R(c, T[3], 12, 7, 5, 1); R(c, '#e8b422', 13, 9, 3, 1); R(c, '#15161a', 14, 9);
  for (let r = 0; r < 3; r++) for (const kx of [13, 15]) R(c, x ? '#3a4448' : '#c8d0d8', kx, 12 + r * 2);
  R(c, x ? '#2a1008' : '#ff6a20', 13, 19, 3, 1);
  R(c, '#04070a', 3, 26, 12, 2); R(c, '#22343a', 3, 26, 12, 1);
  if (x) { prScorch(c, 0, 0, 18, 30, 40, 5); R(c, '#ffe080', 14, 21); }
}
function drawTerminal(c, st) {                                    // 24x20 console: two green-screen CRTs on a keyboard deck
  const f = st === 'ok1' ? 1 : st === 'ok2' ? 2 : 0, x = st === 'x';
  R(c, IRN[2], 0, 13, 24, 7); R(c, IRN[4], 0, 13, 24, 1); R(c, IRN[3], 0, 14, 1, 6); R(c, IRN[1], 23, 14, 1, 6);
  R(c, IRN[1], 2, 15, 20, 2); for (let k = 0; k < 10; k++) { if (x && k % 3 === 1) continue; R(c, '#8a94a0', 3 + k * 2, 15); R(c, '#5d6775', 2 + k * 2, 16); }
  const LED = ['#ff4020', '#5cff7a', '#ffd040', '#46e6ff'];
  for (let i = 0; i < 6; i++) R(c, x ? '#1a1d22' : (i + f) % 3 ? LED[(i + f) % 4] : '#2a2e35', [3, 5, 7, 16, 18, 20][i], 18);
  R(c, IRN[5], 21, 0, 1, 2); R(c, x ? '#3a1010' : '#ff3020', 21, 0);
  for (const mx of [0, 12]) {
    R(c, IRN[3], mx + 1, 2, 10, 10); R(c, IRN[5], mx + 1, 2, 10, 1); R(c, IRN[4], mx + 1, 3, 1, 8); R(c, IRN[1], mx + 10, 3, 1, 8); R(c, IRN[1], mx + 1, 11, 10, 1);
    R(c, IRN[2], mx + 4, 12, 4, 1);
    const sx = mx + 3, sy = 4, broke = x, stat = st === 'hit' && mx === 0;
    if (broke) { R(c, '#040508', sx, sy, 6, 6); R(c, '#8a9aa6', sx, sy, 2, 1); R(c, '#c8d8e0', sx + 5, sy + 1, 1, 2); R(c, '#6a7a86', sx + 1, sy + 5, 2, 1); R(c, '#0a0a0a', sx + 1, 1, 3, 1); continue; }
    R(c, '#04180c', sx, sy, 6, 6);
    if (stat) { const rnd = prRng(77); for (let yy = 0; yy < 6; yy++) for (let xx = 0; xx < 6; xx++) if (rnd() < 0.45) R(c, rnd() < 0.5 ? '#c8d8d0' : '#5a6a64', sx + xx, sy + yy); prCracks(c, sx + 2, sy + 2, 4, 3, 5, '#e8f0ec', '#3a4440'); continue; }
    const rnd = prRng(mx * 31 + f * 7 + 3);
    for (let r = 0; r < 6; r += 2) { const len = 1 + Math.floor(rnd() * 5); R(c, '#46f088', sx, sy + r, len, 1); if (r === 4 && f !== 1) R(c, '#d8ffe4', sx + len, sy + r, 1, 1); }
    for (let r = 1; r < 6; r += 2) R(c, '#031008', sx, sy + r, 6, 1);
    R(c, '#a8ffd0', sx, sy);
  }
  if (x) prScorch(c, 0, 0, 24, 20, 30, 12);
}
function drawAmmo(c, st) {                                        // 18x12 ammunition crate, lid lifted on a row of rounds
  const O = PRR.olv, x = st === 'x';
  if (!x) {
    R(c, O[5], 1, 0, 16, 1); R(c, O[4], 0, 1, 18, 2); R(c, O[6], 0, 1, 18, 1); R(c, O[2], 0, 3, 18, 1);
    for (let bx = 9; bx < 17; bx += 2) { R(c, PRR.brs[7], bx, 3); R(c, PRR.brs[4], bx + 1, 3); }
    R(c, IRN[6], 8, 2, 2, 2); R(c, IRN[3], 8, 3, 2, 1);
  }
  R(c, O[3], 0, 4, 18, 8); R(c, O[4], 2, 4, 14, 1); R(c, O[1], 2, 7, 14, 1); R(c, O[4], 2, 8, 14, 1); R(c, O[1], 0, 11, 18, 1);
  for (const bx of [0, 16]) { R(c, IRN[3], bx, 4, 2, 8); R(c, IRN[bx ? 2 : 5], bx, 4, 1, 8); R(c, IRN[7], bx + 1, 5); R(c, IRN[7], bx + 1, 10); }
  R(c, '#d8c848', 5, 5, 8, 1); R(c, '#d8c848', 5, 9, 3, 1); R(c, '#d8c848', 9, 9, 4, 1); R(c, '#a89830', 12, 5);
  R(c, '#b08a50', 2, 6, 1, 3); R(c, '#b08a50', 15, 6, 1, 3); R(c, '#e0c080', 2, 6);
  if (x) { prTear(c, 0, 18, 6, 2, 9, '#2a1a10'); prScorch(c, 0, 4, 18, 8, 26, 4); R(c, PRR.brs[5], 2, 11); R(c, PRR.brs[5], 14, 11); }
}
function drawFlares(c, st) {                                      // 16x10 signal-flare case, lid propped open
  const Rr = PRR.red, x = st === 'x';
  if (!x) { R(c, Rr[2], 1, 0, 14, 2); R(c, Rr[4], 1, 0, 14, 1); for (let i = 0; i < 4; i++) { const fx = 2 + i * 3; R(c, '#e02818', fx, 1, 2, 3); R(c, '#ff7a5a', fx, 2, 1, 2); R(c, '#f4f0e8', fx, 1, 2, 1); } }
  R(c, Rr[3], 0, 3, 16, 7); R(c, Rr[5], 0, 3, 16, 1); R(c, Rr[5], 0, 4, 1, 5); R(c, Rr[1], 15, 4, 1, 5); R(c, Rr[1], 0, 9, 16, 1);
  R(c, '#ecece4', 1, 6, 14, 1); R(c, '#ffd040', 7, 5, 2, 3); R(c, '#ff8a20', 7, 6, 2, 1);
  R(c, IRN[3], 0, 5, 1, 2); R(c, IRN[3], 15, 5, 1, 2);
  if (x) { prTear(c, 0, 16, 5, 1, 2, '#1a0a06'); prScorch(c, 0, 3, 16, 7, 40, 6); }
}
function drawExt(c, st) {                                         // 8x16 fire extinguisher in its wall bracket
  R(c, IRN[2], 2, 1, 4, 15); R(c, IRN[4], 2, 1, 1, 15);
  if (st !== 'x') {
    limb(c, 4, 5.5, 4, 13, 2.8, 2.8, PRR.red, 0.02);
    R(c, PRR.wht[5], 3, 1, 3, 2); R(c, PRR.wht[7], 3, 1); R(c, PRR.wht[6], 2, 0, 5, 1);
    R(c, '#e8e8e0', 5, 3); R(c, '#40d060', 5, 3);
    R(c, '#15161a', 6, 2); R(c, '#15161a', 7, 3, 1, 7); R(c, '#2a2e35', 6, 10, 1, 2);
    R(c, '#f0ece0', 3, 8, 2, 3); R(c, PRR.red[5], 3, 9, 2, 1);
  } else { prScorch(c, 2, 1, 4, 15, 10, 3); R(c, '#c8cdd3', 3, 14, 2, 1); }
  R(c, IRN[5], 1, 8, 6, 1); R(c, IRN[7], 1, 8, 2, 1);
}
function drawWindow(c, st) {                                      // 34x22 control-room window, two panes
  R(c, IRN[3], 0, 0, 34, 22); R(c, IRN[5], 0, 0, 34, 1); R(c, IRN[5], 0, 0, 1, 22); R(c, IRN[1], 33, 1, 1, 21); R(c, IRN[1], 1, 21, 33, 1);
  for (let rx = 3; rx < 33; rx += 5) { R(c, IRN[6], rx, 1); R(c, IRN[6], rx, 20); }
  R(c, IRN[6], 1, 19, 32, 1);
  const GR = ['#14303c', '#102631', '#0c1d26', '#09161d'];
  for (const px of [2, 18]) {
    for (let y = 0; y < 17; y++) R(c, GR[Math.min(3, Math.floor(y / 4.5))], px, 2 + y, 14, 1);
    R(c, '#05090b', px + 1, 14, 12, 5); R(c, '#3aff7a', px + 3, 15); R(c, '#ffb040', px + 6, 15); R(c, '#3aff7a', px + 10, 16); R(c, '#2a6a8a', px + 8, 15, 2, 1);
    R(c, '#3a3424', px + 5, 3, 4, 1);
    if (st !== 'x') {
      for (let y = 0; y < 17; y++) for (let xx = 0; xx < 14; xx++) { const k = (xx + y * 0.7) % 11; if (k < 1.2) R(c, 'rgba(150,210,235,0.30)', px + xx, 2 + y); else if (k > 5 && k < 5.7) R(c, 'rgba(150,210,235,0.14)', px + xx, 2 + y); }
      R(c, 'rgba(225,248,255,0.75)', px, 2, 3, 1); R(c, 'rgba(225,248,255,0.55)', px, 3, 1, 2);
    } else {
      const rnd = prRng(px + 5);
      for (let xx = 0; xx < 14; xx++) { if (rnd() < 0.55) R(c, '#7aa4b4', px + xx, 2, 1, 1 + Math.floor(rnd() * 3)); if (rnd() < 0.4) { const h = 1 + Math.floor(rnd() * 2); R(c, '#5a8494', px + xx, 19 - h, 1, h); } }
      for (let y = 0; y < 17; y++) { if (rnd() < 0.3) R(c, '#6a94a4', px, 2 + y, 1 + Math.floor(rnd() * 2), 1); if (rnd() < 0.3) R(c, '#6a94a4', px + 13, 2 + y, 1, 1); }
    }
  }
  R(c, IRN[4], 16, 2, 2, 17); R(c, IRN[6], 16, 2, 1, 17);
  if (st === 'c1' || st === 'c2') prCracks(c, 8, 8, 6, 6, 3);
  if (st === 'c2') { prCracks(c, 25, 11, 7, 7, 9); prCracks(c, 5, 15, 4, 4, 21); }
}
function drawHorn(c, st) {                                        // 16x14 PA horn on a wall bracket, warning beacon on top
  R(c, IRN[2], 0, 4, 3, 8); R(c, IRN[4], 0, 4, 1, 8); R(c, IRN[6], 1, 5); R(c, IRN[6], 1, 10);
  R(c, IRN[4], 2, 7, 3, 2); R(c, IRN[6], 2, 7, 3, 1);
  if (st === 'x') {
    limb(c, 5, 8, 7, 10, 2.2, 2.2, PRR.yel); limb(c, 7, 10, 11, 13, 1.5, 3.4, IRN.slice(2), 0, true); R(c, '#05060a', 11, 11, 2, 3);
    prLine(c, '#15161a', 2, 3, 4, 6); R(c, '#e8b422', 2, 2); prScorch(c, 4, 6, 10, 8, 8, 5);
    return;
  }
  blob(c, 1.5, 2.5, 1.6, 2, PRR.red, 2, 0.1); R(c, '#ffd0c0', 1, 1); R(c, IRN[3], 0, 3, 3, 1);
  limb(c, 4.5, 7.5, 7, 7.5, 2.5, 2.5, PRR.yel);
  limb(c, 7, 7.5, 14.5, 7.5, 1.7, 5.8, IRN.slice(2), 0.02, true);
  for (const rx of [9, 11]) for (let y = 0; y < 14; y++) if (prOpaque(c, rx, y)) R(c, y < 7 ? IRN[5] : IRN[3], rx, y);
  R(c, IRN[7], 14, 3, 1, 4); R(c, IRN[5], 14, 7, 1, 5); R(c, '#05060a', 15, 3, 1, 9); R(c, '#20242c', 15, 4, 1, 1);
}
function drawWaterTank(c, st) {                                   // 22x26 water tank on a braced stand
  const B = PRR.blu, x = st === 'x';
  R(c, IRN[2], 5, 17, 1, 8); R(c, IRN[2], 16, 17, 1, 8);
  R(c, IRN[4], 2, 16, 2, 10); R(c, IRN[6], 2, 16, 1, 10); R(c, IRN[4], 18, x ? 18 : 16, 2, x ? 8 : 10); R(c, IRN[3], 19, 16, 1, 10);
  prLine(c, IRN[3], 4, 18, 17, 24); prLine(c, IRN[3], 17, 18, 4, 24);
  R(c, IRN[1], 1, 25, 4, 1); R(c, IRN[1], 17, 25, 4, 1);
  prCyl(c, 11, 4, 17, 10, B, 0.03); blob(c, 11, 4.5, 10, 3.8, B, 2.2, 0.08, (xx, y) => y < 4.5);
  for (const y of [7, 14]) { prCyl(c, 11, y, y + 1.2, 10.1, IRN.slice(2)); for (let rx = 3; rx <= 19; rx += 4) R(c, IRN[7], rx, y); }
  R(c, '#05080c', 17, 5, 2, 9); R(c, '#4ac8f8', 17, 9, 2, 5); R(c, '#d8f8ff', 17, 9, 2, 1); R(c, IRN[6], 17, 4, 2, 1); R(c, IRN[6], 17, 14, 2, 1);
  R(c, PRR.wht[6], 5, 9, 7, 3); R(c, PRR.wht[4], 5, 11, 7, 1); for (const lx of [6, 8, 10]) R(c, B[3], lx, 10);
  R(c, PRR.brs[4], 10, 17, 2, 2); R(c, PRR.brs[6], 10, 17); R(c, PRR.red[4], 9, 17, 4, 1);
  R(c, IRN[3], 9, 0, 4, 2); R(c, IRN[5], 9, 0, 4, 1);
  if (st === 'hit') { R(c, '#02060c', 6, 13); R(c, '#8ce0ff', 6, 14, 1, 2); R(c, '#02060c', 14, 6); R(c, '#8ce0ff', 14, 7); R(c, B[2], 12, 3, 2, 1); }
  if (x) { prTear(c, 0, 22, 10, 4, 10, '#0c1e36'); R(c, '#4ac8f8', 6, 12, 8, 1); prScorch(c, 0, 8, 22, 10, 10, 2); }
}
// ---- expansion: props ----
const PRT = {                                                     // the last ten's own ramps
  trf: ['#141a22', '#1e2630', '#2c3846', '#3e4c5c', '#546474', '#6e8092', '#90a2b4', '#b8c8d8'],   // transformer grey
  snd: ['#3a2a14', '#5e4422', '#8a6834', '#b08a50', '#d0aa6a', '#e8c88a', '#f8e4b0'],              // sand
  pnt: [['#4a0a2a', '#8a1450', '#d0307e', '#ff6ab4', '#ffb4dc'], ['#05303a', '#0a6a78', '#18b0c4', '#5ae8f4', '#b8fcff'],
        ['#4a3804', '#9a7408', '#e8b818', '#ffe050', '#fff4a8']],                                  // paint: pink, cyan, yellow
};
const PAINT_COLS = [0xff3a9a, 0x2ad8ec, 0xffd21a];               // what the paint cans splash (PRT.pnt's middles, brighter)
function drawHoist(c, st) {                                       // 22x18 engine block slung from a crane hook; 'x' is what's left of it on the floor
  const Rr = PRR.red;
  if (st === 'x') {
    R(c, PRR.blk[2], 0, 17, 22, 1); R(c, PRR.blk[4], 3, 17, 5, 1); R(c, PRR.blk[3], 15, 17, 4, 1);                     // oil spreading out from under it
    R(c, IRN[3], 1, 11, 10, 6); R(c, IRN[5], 1, 11, 9, 1); R(c, IRN[4], 1, 12, 1, 5); R(c, IRN[1], 10, 12, 1, 5);         // the front half, still upright
    R(c, Rr[3], 2, 9, 8, 2); R(c, Rr[5], 2, 9, 7, 1); R(c, IRN[1], 1, 11, 10, 1); R(c, IRN[2], 2, 15, 8, 1);
    for (const x of [4, 7]) { R(c, IRN[2], x, 13, 1, 2); R(c, IRN[4], x - 1, 13, 1, 2); }
    for (const [x, y] of [[11, 10], [11, 12], [10, 14], [11, 16]]) R(c, IRN[0], x, y, 1, 2);                              // the torn face
    R(c, IRN[3], 12, 13, 9, 4); R(c, IRN[5], 12, 13, 8, 1); R(c, IRN[1], 20, 14, 1, 3); R(c, Rr[2], 13, 12, 5, 1); R(c, Rr[4], 13, 12, 2, 1);   // the back half, on its side
    R(c, IRN[2], 16, 14, 1, 3); R(c, PRR.brs[5], 5, 14); R(c, PRR.brs[4], 14, 15); R(c, IRN[6], 17, 11); R(c, IRN[6], 7, 8);   // core plugs and bolts
    blob(c, 1.5, 15, 1.6, 1.6, IRN.slice(2), 2, 0.1);                                                                   // the pulley, knocked loose
    prScorch(c, 0, 8, 22, 10, 22, 5);
    return;
  }
  R(c, IRN[6], 10, 0, 2, 1); R(c, IRN[7], 10, 0); R(c, IRN[5], 9, 1, 1, 2); R(c, IRN[3], 12, 1, 1, 2); R(c, IRN[2], 10, 3, 2, 1);   // the ring it hangs by
  R(c, PRR.yel[4], 10, 4, 2, 2); R(c, PRR.yel[6], 10, 4); R(c, '#15161a', 11, 5);                                      // the hook block
  for (let i = 0; i < 5; i++) { R(c, i % 2 ? IRN[4] : IRN[7], 9 - i, 6 + (i >> 1)); R(c, i % 2 ? IRN[3] : IRN[6], 12 + i, 6 + (i >> 1)); }   // sling chains
  R(c, IRN[6], 4, 8); R(c, IRN[5], 17, 8);                                                                             // lifting eyes
  R(c, Rr[4], 5, 8, 12, 2); R(c, Rr[6], 5, 8, 11, 1); R(c, Rr[7], 5, 8, 4, 1); R(c, Rr[2], 5, 9, 12, 1); R(c, Rr[3], 16, 8);   // red rocker cover
  for (const x of [6, 11, 15]) R(c, IRN[6], x, 9);
  R(c, IRN[1], 4, 10, 14, 1);                                                                                          // gasket
  R(c, IRN[4], 4, 11, 14, 2); R(c, IRN[6], 4, 11, 13, 1); for (const x of [6, 9, 12, 15]) R(c, IRN[1], x, 12, 2, 1);     // head and its ports
  R(c, IRN[3], 3, 13, 16, 3); R(c, IRN[5], 4, 13, 14, 1); R(c, IRN[5], 3, 13, 1, 3); R(c, IRN[1], 18, 13, 1, 3);         // block
  for (const x of [7, 11, 15]) { R(c, IRN[2], x, 14, 1, 2); R(c, IRN[4], x - 1, 14, 1, 2); }
  R(c, PRR.brs[5], 5, 15); R(c, PRR.brs[5], 9, 15); R(c, PRR.brs[3], 13, 15);                                         // core plugs
  R(c, IRN[2], 6, 16, 10, 1); R(c, IRN[4], 6, 16, 4, 1); R(c, IRN[1], 7, 17, 8, 1);                                    // sump
  R(c, IRN[3], 19, 11, 2, 6); R(c, IRN[5], 19, 11, 1, 6); R(c, IRN[1], 21, 12, 1, 4);                                  // bell housing
  blob(c, 2, 14, 2.2, 2.2, IRN.slice(2), 2, 0.1); R(c, IRN[0], 2, 14); R(c, IRN[7], 1, 13);                            // crank pulley
  if (st === 'hit') { prLine(c, IRN[0], 12, 13, 15, 16); R(c, IRN[6], 13, 13); R(c, Rr[1], 8, 8, 2, 1); R(c, Rr[1], 13, 9); R(c, PRR.blk[1], 14, 16, 1, 2); R(c, PRR.blk[4], 14, 17); }
}
function drawServer(c, st) {                                      // 14x28 server rack: five units of blinking LEDs; 'ok0'-'ok2' blink
  const f = st === 'ok1' ? 1 : st === 'ok2' ? 2 : 0, x = st === 'x', hit = st === 'hit', LED = ['#5cff7a', '#ffb040', '#46a0ff'];
  R(c, IRN[1], 0, 0, 14, 28); R(c, IRN[5], 0, 0, 14, 1); R(c, IRN[4], 0, 1, 1, 24); R(c, IRN[0], 13, 1, 1, 24); R(c, IRN[3], 1, 1, 12, 1);   // the cabinet
  for (let i = 2; i < 12; i += 2) R(c, IRN[0], i, 2, 1, 2);                                                            // vent slots
  for (let k = 0; k < 5; k++) {
    const y = 5 + k * 4, dead = (hit && k === 2) || (x && k !== 1);
    R(c, IRN[3], 1, y, 12, 3); R(c, IRN[5], 1, y, 12, 1); R(c, IRN[2], 1, y + 2, 12, 1);
    for (let d = 0; d < 3; d++) { R(c, IRN[1], 2 + d * 2, y + 1); R(c, IRN[4], 3 + d * 2, y + 1); }                      // drive bays
    for (let i = 0; i < 3; i++) { const on = !dead && (k * 3 + i * 5 + f * 7) % 4 !== 0; R(c, on ? LED[(k + i + f) % 3] : '#16201a', 9 + i, y + 1); }
    if (dead && x) { R(c, '#05060a', 2 + (k % 2) * 4, y + 1, 4, 2); R(c, IRN[6], 2 + (k % 2) * 4, y + 2, 2, 1); }
  }
  R(c, IRN[6], 12, 12, 1, 4);                                                                                          // door handle
  R(c, IRN[2], 0, 25, 14, 2); R(c, IRN[4], 0, 25, 14, 1); R(c, IRN[0], 1, 27, 3, 1); R(c, IRN[0], 10, 27, 3, 1);         // plinth and feet
  if (hit) { R(c, IRN[0], 7, 10, 3, 1); R(c, IRN[6], 7, 11, 3, 1); prLine(c, '#e8b422', 4, 18, 3, 22); prLine(c, '#c83020', 6, 18, 6, 21); R(c, '#ffe080', 3, 23); }
  if (x) {
    R(c, '#ff3020', 9, 10);
    prLine(c, '#e8b422', 3, 15, 2, 21); prLine(c, '#c83020', 7, 15, 8, 20); prLine(c, '#3a80e0', 10, 19, 11, 24); prLine(c, IRN[4], 5, 23, 4, 26);   // cables hanging out
    R(c, IRN[0], 0, 8, 1, 6); R(c, IRN[5], 13, 17, 1, 3);
    prScorch(c, 0, 0, 14, 28, 36, 13);
  }
}
function drawJukebox(c, st) {                                     // 20x26 jukebox: a neon arch over the record deck, wood pillars, chrome foot; 'disc' is one of its records
  if (st === 'disc') {                                            // a record, centred in the frame
    for (let y = 8; y < 18; y++) for (let xx = 5; xx < 15; xx++) {
      const r = Math.hypot(xx + 0.5 - 10, y + 0.5 - 13); if (r > 4.6) continue;
      R(c, r < 0.8 ? '#06070a' : r < 1.8 ? '#e0402a' : Math.abs(r - 3.3) < 0.45 || Math.abs(r - 2.4) < 0.35 ? '#34343e' : '#121216', xx, y);
    }
    R(c, '#9a9aaa', 7, 10); R(c, '#5a5a68', 8, 9); R(c, '#5a5a68', 6, 11); R(c, '#ff8a6a', 9, 12);
    return;
  }
  const x = st === 'x', W = PRR.wht, C = PRR.cop, ARCH = x ? ['#3a1e2a', '#3a2418', '#38301a'] : ['#ff5ac0', '#ff8a3a', '#ffd23a'];
  for (let y = 0; y < 11; y++) for (let xx = 0; xx < 20; xx++) {
    const dx = xx + 0.5 - 10, dy = y + 0.5 - 10.5, r = Math.hypot(dx, dy);
    if (r > 9.9 || dy > 0) continue;
    if (r > 8.7) R(c, dx < -2 && dy < -3 ? W[6] : dx > 4 ? W[2] : W[4], xx, y);                                         // chrome rim
    else if (r > 6.5) { const a = Math.atan2(-dy, dx) / Math.PI; R(c, r > 7.9 && !x ? '#fff0f8' : ARCH[Math.min(2, Math.floor(Math.abs(a - 0.5) * 5))], xx, y); }   // neon tube: pink at the crown to yellow at the sides
    else R(c, (Math.floor(xx / 2) + Math.floor(y / 2)) % 2 ? '#2e1022' : '#1a0812', xx, y);                              // the grille behind
  }
  R(c, C[3], 1, 10, 18, 14);
  for (const px of [1, 16]) { R(c, C[px > 8 ? 2 : 5], px, 10, 3, 14); R(c, C[px > 8 ? 1 : 6], px, 10, 1, 14); }         // wood pillars
  for (let y = 11; y < 23; y++) { R(c, ARCH[(y >> 1) % 3], 2, y); R(c, ARCH[((y >> 1) + 1) % 3], 17, y); }              // tubes in the pillars
  R(c, W[2], 4, 11, 12, 7); R(c, W[5], 4, 11, 12, 1); R(c, '#08090c', 5, 12, 10, 5);                                    // the record window
  if (!x) {
    prEll(c, 9.5, 14.6, 4, 1.6, '#16161c'); prEll(c, 9.5, 14.6, 2.6, 1, '#2a2a34'); R(c, '#d83a2a', 9, 14, 2, 1);
    R(c, W[6], 13, 12, 1, 2); R(c, W[5], 12, 13); R(c, 'rgba(210,240,255,0.35)', 5, 12, 3, 1); R(c, 'rgba(210,240,255,0.2)', 5, 13, 1, 2);
  } else { R(c, '#8a9aa6', 5, 12, 1, 2); R(c, '#c8d8e0', 14, 15); R(c, '#6a7a86', 11, 12); R(c, '#2a2a34', 6, 15, 4, 1); }
  for (let i = 0; i < 6; i++) R(c, x ? '#3a3a3a' : i % 2 ? '#ffffff' : '#ffe0a0', 5 + i * 2, 18); R(c, C[1], 4, 19, 12, 1);   // selector keys
  R(c, '#1a1008', 4, 20, 12, 3); for (let y = 20; y < 23; y++) for (let i = 0; i < 12; i += 2) R(c, C[2], 4 + i + (y % 2), y);   // speaker grille
  R(c, W[3], 0, 23, 20, 2); R(c, W[6], 0, 23, 20, 1); R(c, W[1], 1, 25, 4, 1); R(c, W[1], 15, 25, 4, 1);                 // chrome foot
  if (st === 'hit') { prCracks(c, 8, 6, 5, 4, 7, '#fff0f8', '#7a2a4a'); R(c, '#3a1e2a', 17, 15, 1, 3); }
  if (x) { prCracks(c, 11, 5, 6, 5, 9, '#6a4a5a', '#1a0812'); prScorch(c, 0, 0, 20, 26, 60, 9); R(c, '#05060a', 6, 21, 4, 2); }
}
function drawHydrant(c, st) {                                     // 10x14 fire hydrant: bonnet, side caps and a brass pumper nozzle
  const Rr = PRR.red, B = PRR.brs;
  R(c, IRN[2], 0, 13, 10, 1); R(c, IRN[4], 0, 13, 4, 1); R(c, IRN[6], 1, 13); R(c, IRN[6], 8, 13);                     // base bolted to the floor
  R(c, Rr[3], 1, 12, 8, 1); R(c, Rr[5], 1, 12, 3, 1);                                                                  // flange
  if (st === 'x') {
    prCyl(c, 5, 9, 12, 3, Rr, 0.04);
    R(c, '#05080c', 3, 9, 4, 1); R(c, '#1c4a6a', 4, 10, 2, 1); for (const [xx, h] of [[2, 1], [3, 2], [5, 1], [7, 2]]) R(c, Rr[xx < 5 ? 5 : 3], xx, 9 - h, 1, h);   // sheared off, a jagged lip
    R(c, '#4ac8f8', 2, 11); R(c, '#8ce0ff', 7, 10);
    return;
  }
  prCyl(c, 5, 4, 12, 3, Rr, 0.04);                                                                                     // barrel
  blob(c, 5, 4.2, 3.4, 3.2, Rr, 2, 0.08, (xx, y) => y < 4);                                                            // bonnet
  R(c, Rr[2], 1, 4, 8, 1); R(c, Rr[6], 1, 4, 2, 1);
  R(c, B[5], 4, 0, 2, 1); R(c, B[6], 4, 0); R(c, B[2], 4, 1, 2, 1);                                                    // operating nut
  R(c, Rr[4], 0, 6, 2, 2); R(c, Rr[6], 0, 6, 2, 1); R(c, B[5], 0, 6, 1, 2); R(c, Rr[3], 8, 6, 2, 2); R(c, B[3], 9, 6, 1, 2);   // side caps
  blob(c, 5, 8.5, 1.9, 1.9, B, 2, 0.1); R(c, B[1], 5, 9); R(c, B[7], 4, 7);                                             // pumper nozzle
  prLine(c, IRN[5], 1, 8, 2, 10);                                                                                      // cap chain
}
function drawGasline(c, st) {                                     // 20x14 gas main: a yellow line through a shut-off valve and its handwheel to a flanged nozzle (facing right)
  const Y = PRR.yel, Rr = PRR.red, B = PRR.brs;
  R(c, IRN[3], 0, 3, 3, 9); R(c, IRN[5], 0, 3, 1, 9); R(c, IRN[1], 2, 4, 1, 8); R(c, IRN[6], 1, 4); R(c, IRN[6], 1, 10);   // wall plate
  limb(c, 2, 7.5, 16, 7.5, 2.1, 2.1, Y, 0.02, true);                                                                   // the line
  R(c, IRN[4], 4, 5, 1, 6); R(c, IRN[6], 4, 5); R(c, Rr[4], 14, 6, 1, 4); R(c, Rr[6], 14, 6);                         // a clamp and a red band
  R(c, B[3], 8, 4, 5, 7); R(c, B[5], 8, 4, 5, 1); R(c, B[5], 8, 4, 1, 7); R(c, B[1], 12, 5, 1, 6); R(c, B[2], 8, 10, 5, 1); R(c, B[6], 9, 5);   // valve body
  R(c, IRN[5], 10, 2, 1, 2);                                                                                           // stem
  R(c, Rr[5], 7, 1, 7, 1); R(c, Rr[3], 7, 2, 7, 1); R(c, Rr[7], 7, 1, 2, 1); R(c, IRN[6], 10, 1);                      // handwheel, edge on
  R(c, IRN[3], 16, 4, 3, 7); R(c, IRN[5], 16, 4, 3, 1); R(c, IRN[6], 16, 5, 1, 5); R(c, IRN[1], 18, 5, 1, 6);           // nozzle flange
  R(c, '#05060a', 19, 6, 1, 3); R(c, IRN[7], 17, 5); R(c, IRN[7], 17, 9);
  if (st === 'x') { prTear(c, 7, 14, 6, 2, 13, '#2a1a0c'); prScorch(c, 6, 3, 14, 10, 34, 11); R(c, '#05060a', 9, 6, 3, 1); R(c, '#ff8a20', 10, 6); R(c, '#14100c', 19, 5, 1, 5); }
}
function drawHopper(c, st) {                                      // 20x22 sand hopper: a riveted bin, its funnel and a gated chute
  const O = PRR.olv, S = PRT.snd, Rr = PRR.red, x = st === 'x';
  if (!x) { prEll(c, 10, 2.4, 7, 2, S[3]); prEll(c, 10, 2, 5, 1.3, S[5]); R(c, S[6], 7, 1, 3, 1); R(c, S[2], 13, 2); }  // sand heaped over the rim
  R(c, IRN[5], 0, 2, 20, 1); R(c, IRN[6], 0, 2, 8, 1);                                                                // rim
  R(c, O[3], 1, 3, 18, 10); R(c, O[5], 1, 3, 18, 1); R(c, O[4], 1, 4, 1, 9); R(c, O[1], 18, 4, 1, 9); R(c, O[2], 1, 12, 18, 1);   // the bin
  for (const sx of [6, 13]) { R(c, O[4], sx, 4, 1, 5); R(c, O[1], sx + 1, 4, 1, 5); }                                // stiffeners
  for (let i = 2; i < 18; i++) for (const y of [9, 10]) R(c, ((i + y) >> 1) % 2 ? '#15161a' : HAZ[3], i, y);         // hazard band
  for (const rx of [2, 9, 16]) R(c, O[6], rx, 4);
  for (let y = 13; y < (x ? 15 : 18); y++) {                                                                          // the funnel
    const hw = 8.5 - (y - 13) * 1.5, x0 = Math.round(10 - hw), x1 = Math.round(10 + hw);
    for (let xx = x0; xx < x1; xx++) R(c, O[clamp(Math.round(4 - (xx + 0.5 - 10) / hw * 2.2 - (y - 13) * 0.3), 0, 6)], xx, y);
  }
  if (x) {                                                                                                            // the bottom blown out, the chute hanging
    R(c, '#05060a', 4, 14, 12, 1); for (const xx of [4, 7, 9, 12, 14]) R(c, O[2], xx, 15); R(c, O[3], 6, 15, 1, 2); R(c, O[3], 11, 15, 1, 2);
    R(c, IRN[3], 13, 16, 2, 4); R(c, IRN[5], 13, 16, 1, 4); R(c, S[3], 8, 13, 3, 1);
    prScorch(c, 0, 3, 20, 14, 26, 4);
    return;
  }
  R(c, IRN[3], 8, 18, 4, 2); R(c, IRN[5], 8, 18, 1, 2); R(c, IRN[1], 11, 18, 1, 2);                                    // chute
  R(c, Rr[4], 7, 20, 6, 1); R(c, Rr[6], 7, 20, 2, 1); R(c, IRN[2], 8, 21, 4, 1);                                       // the gate
  R(c, IRN[6], 13, 17, 1, 3); R(c, Rr[5], 13, 16);                                                                     // its lever
  if (st === 'hit') { R(c, O[0], 14, 6, 2, 1); R(c, O[6], 14, 7, 2, 1); R(c, '#05060a', 4, 7); R(c, S[4], 4, 8, 1, 1); R(c, O[0], 3, 11, 2, 1); R(c, O[6], 10, 15); }
}
function drawVat(c, st) {                                         // 18x26 chem vat: a glass tank of green acid on an iron stand
  const G = PRR.grn, x = st === 'x';
  R(c, IRN[2], 1, 21, 16, 3); R(c, IRN[5], 1, 21, 16, 1); R(c, IRN[4], 1, 22, 1, 2); R(c, IRN[0], 16, 22, 1, 2);       // stand
  R(c, IRN[3], 1, 24, 2, 2); R(c, IRN[3], 15, 24, 2, 2); R(c, IRN[1], 3, 24, 12, 1);                                   // legs
  R(c, HAZ[3], 7, 22, 4, 2); R(c, HAZ[4], 7, 22, 4, 1); R(c, '#15161a', 8, 22, 2, 1); R(c, '#15161a', 9, 23);           // hazard plate
  R(c, IRN[4], 2, 20, 14, 1); R(c, IRN[6], 2, 20, 6, 1);                                                               // bottom ring
  if (x) {                                                                                                            // shattered: jagged glass round a green residue
    const h = [4, 6, 2, 5, 7, 3, 2, 6, 4, 3, 7, 2, 5, 3];
    for (let i = 0; i < 14; i++) R(c, i % 3 ? 'rgba(170,230,215,0.6)' : '#d0ece4', 2 + i, 20 - h[i], 1, h[i]);
    R(c, G[2], 3, 19, 12, 1); R(c, G[4], 4, 19, 5, 1); R(c, G[3], 6, 21, 3, 1); R(c, G[3], 12, 22);
    return;
  }
  R(c, 'rgba(150,220,205,0.22)', 2, 5, 14, 2);                                                                         // empty glass above the acid
  prCyl(c, 9, 7, 20, 6.5, G, 0.02);                                                                                    // the acid
  R(c, G[6], 3, 7, 12, 1); R(c, G[5], 3, 8, 3, 1);                                                                     // its surface
  for (const [bx, by] of [[5, 15], [7, 11], [11, 17], [12, 12], [9, 9], [6, 18], [10, 14]]) R(c, G[6], bx, by);
  R(c, '#e0fff4', 2, 5, 1, 15); R(c, '#5a8a80', 15, 5, 1, 15); R(c, 'rgba(240,255,250,0.55)', 4, 6, 1, 13); R(c, 'rgba(240,255,250,0.3)', 5, 8, 1, 7);   // glass edges and glare
  R(c, IRN[4], 2, 4, 14, 1); R(c, IRN[6], 2, 4, 6, 1);                                                                 // top ring
  blob(c, 9, 4, 6, 2.8, IRN.slice(2), 2, 0.05, (xx, y) => y < 4); R(c, IRN[7], 7, 2, 2, 1);                             // lid
  R(c, IRN[4], 12, 0, 2, 3); R(c, IRN[6], 12, 0, 1, 3);                                                                // vent pipe
  if (st === 'hit') { prCracks(c, 6, 12, 5, 4, 17, '#e8ffe0', '#2a6a20'); R(c, G[5], 15, 18, 1, 2); R(c, G[4], 16, 20); }
}
function drawTransformer(c, st) {                                 // 16x22 pole transformer: a finned can, two porcelain bushings, a wall bracket
  const T = PRT.trf, x = st === 'x';
  R(c, IRN[2], 0, 6, 1, 12); for (const y of [7, 15]) { R(c, IRN[3], 0, y, 4, 2); R(c, IRN[5], 0, y, 4, 1); }          // bracket off the wall
  for (let y = 8; y < 19; y += 2) { R(c, T[3], 13, y, 2, 1); R(c, T[5], 13, y + 1, 2, 1); }                             // cooling fins
  prCyl(c, 8, 6, 19.5, 5, T, 0.03);                                                                                    // the can
  prEll(c, 8, 6, 5, 1.6, T[6]); prEll(c, 8, 6.2, 3.6, 0.9, T[4]);                                                       // lid
  R(c, T[1], 4, 19, 8, 1); R(c, IRN[5], 8, 20); R(c, IRN[3], 8, 21);                                                    // drain cock
  R(c, HAZ[3], 7, 11, 2, 1); R(c, HAZ[3], 6, 12, 4, 2); R(c, HAZ[3], 7, 14, 2, 1); R(c, '#15161a', 8, 11); R(c, '#15161a', 7, 12); R(c, '#15161a', 8, 13); R(c, '#15161a', 7, 14);   // the bolt sign
  if (!x) for (const bx of [5, 10]) { for (let y = 1; y < 6; y++) R(c, y % 2 ? '#a0603a' : '#d8985c', bx, y, 2, 1); R(c, '#f0c090', bx, 2); R(c, PRR.cop[6], bx, 0, 2, 1); }   // bushings
  if (st === 'hit') { prScorch(c, 9, 12, 5, 6, 12, 5); R(c, '#05060a', 10, 15, 2, 2); R(c, '#80c8ff', 10, 15); R(c, T[0], 13, 12, 2, 1); R(c, T[6], 13, 13, 2, 1); }
  if (x) {
    prTear(c, 3, 14, 10, 3, 19, '#1a1410');
    R(c, PRR.cop[4], 5, 12, 6, 1); R(c, PRR.cop[6], 6, 12, 2, 1); R(c, PRR.cop[3], 5, 13, 6, 1);                        // the windings, cooked
    R(c, '#a0603a', 5, 8, 2, 2); R(c, '#d8985c', 11, 9, 1, 1);
    prScorch(c, 0, 6, 16, 16, 56, 21);
  }
}
function drawPaint(c, st) {                                       // 16x12 three tins of paint, stacked two and one, drips down their sides
  const W = PRR.wht, P = PRT.pnt;
  if (st === 'x') {                                                                                                   // burst flat, paint everywhere
    const rnd = prRng(41);
    R(c, W[2], 1, 9, 6, 3); R(c, W[4], 1, 9, 5, 1); R(c, P[0][2], 1, 10, 6, 1);
    R(c, W[2], 9, 8, 6, 4); R(c, W[4], 9, 8, 6, 1); R(c, P[1][2], 9, 10, 6, 1); R(c, '#05060a', 11, 8, 2, 1);
    limb(c, 6, 6.5, 10, 6.5, 2, 2, W.slice(1), 0.02, true); R(c, P[2][2], 7, 6, 2, 2);
    for (let i = 0; i < 52; i++) { const k = i % 3; R(c, P[k][2 + (rnd() < 0.35 ? 1 : 0)], Math.floor(rnd() * 16), 3 + Math.floor(rnd() * 9)); }
    R(c, W[6], 13, 3, 3, 1); R(c, W[6], 0, 5, 2, 1);
    return;
  }
  const can = (cx, y0, p) => {
    prCyl(c, cx, y0 + 1, y0 + 6, 3.5, W.slice(1), 0.02);
    prCyl(c, cx, y0 + 2.5, y0 + 5, 3.56, p.slice(0, 4));                                                               // its label
    prEll(c, cx, y0 + 1, 3.5, 1, W[6]); prEll(c, cx, y0 + 1.1, 2.4, 0.6, p[2]);                                        // lid, paint round the rim
    R(c, p[3], Math.round(cx - 2), y0 + 1, 1, 2); R(c, p[2], Math.round(cx + 1), y0 + 1, 1, 3);                        // drips
  };
  can(3.5, 5, P[0]); can(12.5, 5, P[1]); can(8, -1, P[2]);
  R(c, IRN[5], 6, 0); R(c, IRN[5], 10, 0);                                                                             // the top tin's handle lugs
}
function drawSprinkler(c, st) {                                   // 10x8 sprinkler head under a red feed pipe: brass yoke, red glass bulb, deflector
  const Rr = PRR.red, B = PRR.brs, x = st === 'x';
  R(c, Rr[5], 0, 0, 10, 1); R(c, Rr[3], 0, 1, 10, 1); R(c, Rr[7], 1, 0, 3, 1);                                         // the feed pipe
  R(c, B[4], 4, 2, 2, 2); R(c, B[6], 4, 2, 1, 2);                                                                      // fitting
  R(c, B[5], 3, 4, 1, 2); R(c, B[3], 6, 4, 1, 2);                                                                      // yoke
  if (!x) { R(c, '#ff3a2a', 4, 4, 2, 2); R(c, '#ffb0a0', 4, 4); R(c, B[6], 1, 6, 8, 1); for (let i = 1; i < 9; i += 2) R(c, B[3], i, 7); }   // bulb, deflector and its teeth
  else { R(c, '#a02018', 5, 5); R(c, B[6], 1, 6, 4, 1); R(c, B[5], 5, 7, 4, 1); R(c, B[3], 1, 7); R(c, '#8ce0ff', 4, 6); }
}
const PROP_ART = {
  neon:     { w: 34, h: 15, fr: ['n4', 'n3', 'n2', 'n1', 'n0', 'dead', 'x'], draw: (c, f) => f === 'x' ? (R(c, '#2a2e35', 7, 0, 2, 2), R(c, '#2a2e35', 9, 1, 2, 1), R(c, '#2a2e35', 25, 0, 2, 3), R(c, '#5d6775', 25, 0, 1, 2), prLine(c, '#1a1c20', 26, 3, 27, 6), prLine(c, '#1a1c20', 27, 6, 25, 9), R(c, '#e8b422', 25, 10), R(c, '#ff8040', 24, 10)) : drawNeon(c, f === 'dead' ? 0 : +f[1], f === 'dead') },
  tube:     { w: 26, h: 6,  fr: ['ok', 'off', 'x'], draw: drawTube },
  flood:    { w: 16, h: 24, fr: ['ok', 'x'], draw: drawFlood },
  fuse:     { w: 14, h: 18, fr: ['ok', 'hit', 'x'], draw: drawFuse },
  capacitor:{ w: 18, h: 22, fr: ['ok', 'charge', 'x'], draw: drawCap },
  propane:  { w: 12, h: 18, fr: ['ok', 'hit', 'x'], draw: drawPropane },
  toxic:    { w: 13, h: 15, fr: ['ok', 'hit', 'x'], draw: drawToxic },
  cryo:     { w: 12, h: 20, fr: ['ok', 'hit', 'x'], draw: drawCryo },
  oil:      { w: 12, h: 15, fr: ['ok', 'hit', 'x'], draw: drawOil },
  boiler:   { w: 26, h: 30, fr: ['ok', 'hot', 'x'], draw: drawBoiler },
  fan:      { w: 22, h: 22, fr: ['ok', 'x'], draw: drawFanBase },
  ladle:    { w: 22, h: 18, fr: ['ok', 'x'], draw: drawLadle },
  vending:  { w: 18, h: 30, fr: ['ok', 'hit', 'x'], draw: drawVending },
  terminal: { w: 24, h: 20, fr: ['ok0', 'ok1', 'ok2', 'hit', 'x'], draw: drawTerminal },
  ammo:     { w: 18, h: 12, fr: ['ok', 'x'], draw: drawAmmo },
  flares:   { w: 16, h: 10, fr: ['ok', 'x'], draw: drawFlares },
  ext:      { w: 8,  h: 16, fr: ['ok', 'x'], draw: drawExt },
  window:   { w: 34, h: 22, fr: ['ok', 'c1', 'c2', 'x'], draw: drawWindow },
  horn:     { w: 16, h: 14, fr: ['ok', 'x'], draw: drawHorn },
  water:    { w: 22, h: 26, fr: ['ok', 'hit', 'x'], draw: drawWaterTank },
  // ---- expansion: props ----
  hoist:       { w: 22, h: 18, fr: ['ok', 'hit', 'x'], draw: drawHoist },
  server:      { w: 14, h: 28, fr: ['ok0', 'ok1', 'ok2', 'hit', 'x'], draw: drawServer },
  jukebox:     { w: 20, h: 26, fr: ['ok', 'hit', 'x', 'disc'], draw: drawJukebox },
  hydrant:     { w: 10, h: 14, fr: ['ok', 'x'], draw: drawHydrant },
  gasline:     { w: 20, h: 14, fr: ['ok', 'x'], draw: drawGasline },
  hopper:      { w: 20, h: 22, fr: ['ok', 'hit', 'x'], draw: drawHopper },
  vat:         { w: 18, h: 26, fr: ['ok', 'hit', 'x'], draw: drawVat },
  transformer: { w: 16, h: 22, fr: ['ok', 'hit', 'x'], draw: drawTransformer },
  paint:       { w: 16, h: 12, fr: ['ok', 'x'], draw: drawPaint },
  sprinkler:   { w: 10, h: 8,  fr: ['ok', 'x'], draw: drawSprinkler },
};
function genPropTextures(scene) {
  for (const k in PROP_ART) {
    const A = PROP_ART[k];
    addSheet(scene, 'pr_' + k, A.fr.map(name => ({ name, c: makeSprite(A.w, A.h, c => A.draw(c, name)) })), A.w, A.h, true);
  }
  addTex(scene, 'pr_blade', makeSprite(18, 18, drawFanBlade));
  addTex(scene, 'pr_grill', makeSprite(22, 22, drawFanGrill, null));
}

// ---- gibs -----------------------------------------------------------------------
const GIBDEF = {
  g_flesh1: [7, 6, c => { R(c, '#7a3b30', 1, 1, 5, 4); R(c, '#a3584a', 2, 1, 2, 1); R(c, '#4e211b', 1, 4, 5, 1); R(c, '#b01818', 4, 2, 1, 1); }],
  g_flesh2: [6, 7, c => { R(c, '#7a3b30', 1, 1, 4, 5); R(c, '#a3584a', 1, 1, 2, 2); R(c, '#4e211b', 3, 4, 2, 2); R(c, '#b01818', 2, 3, 1, 1); }],
  g_flesh3: [9, 5, c => { R(c, '#7a3b30', 1, 1, 5, 3); R(c, '#a3584a', 2, 1, 3, 1); R(c, '#ddd3b0', 6, 2, 2, 1); R(c, '#ddd3b0', 7, 1, 1, 3); R(c, '#4e211b', 1, 3, 5, 1); }],
  g_chunk: [5, 5, c => { R(c, '#8e1c1c', 1, 1, 3, 3); R(c, '#c03030', 1, 1, 1, 1); }],
  g_bone: [8, 4, c => { R(c, '#ddd3b0', 2, 1, 4, 2); R(c, '#ddd3b0', 1, 1, 1, 1); R(c, '#ddd3b0', 6, 2, 1, 1); R(c, '#a89f80', 2, 2, 4, 1); }],
  g_rib: [7, 6, c => { R(c, '#ddd3b0', 1, 1, 1, 4); R(c, '#ddd3b0', 2, 1, 4, 1); R(c, '#ddd3b0', 3, 3, 3, 1); R(c, '#7a3b30', 2, 2, 3, 1); R(c, '#7a3b30', 2, 4, 2, 1); }],
  g_jaw: [8, 6, c => { R(c, '#58616c', 1, 1, 6, 2); R(c, '#8b95a1', 1, 1, 6, 1); R(c, '#3e241f', 2, 3, 5, 2); R(c, '#ddd3b0', 2, 3, 1, 1); R(c, '#ddd3b0', 4, 3, 1, 1); R(c, '#ddd3b0', 6, 3, 1, 1); }],
  g_eye: [6, 6, c => { R(c, '#e8e2d8', 1, 2, 4, 2); R(c, '#e8e2d8', 2, 1, 2, 4); R(c, '#ff2a1a', 3, 2, 1, 2); R(c, '#9a1414', 1, 4, 1, 1); }],
  g_plate: [7, 5, c => { R(c, '#58616c', 1, 1, 5, 3); R(c, '#8b95a1', 1, 1, 5, 1); R(c, '#353b44', 2, 3, 1, 1); }],
  g_plateL: [9, 6, c => { R(c, '#58616c', 1, 1, 7, 4); R(c, '#8b95a1', 1, 1, 7, 1); R(c, '#353b44', 1, 4, 7, 1); R(c, '#2a2e35', 3, 2, 1, 1); R(c, '#2a2e35', 6, 2, 1, 1); }],
  g_wire: [8, 4, c => { R(c, '#3a3f47', 1, 1, 2, 1); R(c, '#3a3f47', 3, 2, 2, 1); R(c, '#3a3f47', 5, 1, 2, 1); R(c, '#ff7a1a', 6, 1, 1, 1); }],
  g_core: [6, 6, c => { R(c, '#ff7a1a', 1, 1, 4, 4); R(c, '#ffe08a', 2, 2, 2, 2); }],
  g_helm: [10, 9, c => { R(c, PAL.pb, 1, 1, 7, 6); R(c, PAL.pc, 2, 1, 4, 1); R(c, PAL.pk, 4, 3, 4, 1); R(c, PAL.visor, 5, 4, 3, 1); R(c, PAL.orange, 2, 3, 1, 2); R(c, '#7a0c0c', 1, 7, 4, 1); }],
  g_armor: [8, 6, c => { R(c, PAL.pb, 1, 1, 6, 4); R(c, PAL.pc, 1, 1, 6, 1); R(c, PAL.orange, 2, 3, 4, 1); }],
  g_shell: [5, 3, c => { R(c, '#c42a1e', 1, 1, 2, 1); R(c, '#d9a640', 3, 1, 1, 1); }],
  g_shard: [5, 4, c => { R(c, '#5d6674', 1, 1, 3, 2); R(c, '#a0aab6', 1, 1, 2, 1); }],
  g_shard2: [6, 3, c => { R(c, '#4a525e', 1, 1, 4, 1); R(c, '#8a94a2', 1, 1, 2, 1); }],
  g_ehelm: [9, 8, c => { R(c, EN.b, 1, 1, 7, 5); R(c, EN.c, 2, 1, 4, 1); R(c, EN.mask, 3, 3, 5, 3); R(c, EN.lens, 4, 4, 1, 1); R(c, EN.lens, 6, 4, 1, 1); R(c, '#7a0c0c', 1, 6, 3, 1); }],
  g_earmor: [8, 6, c => { R(c, EN.b, 1, 1, 6, 4); R(c, EN.c, 1, 1, 6, 1); R(c, EN.strap, 3, 2, 1, 3); }],
  g_hood: [8, 6, c => { R(c, ST.a, 1, 1, 6, 4); R(c, ST.b, 2, 1, 3, 1); R(c, ST.k, 4, 3, 3, 2); R(c, ST.eye, 5, 3, 1, 1); }],
  g_blade: [9, 4, c => { R(c, ST.blade, 1, 1, 6, 1); R(c, ST.bladeHi, 6, 1, 1, 1); R(c, ST.skinD, 1, 2, 2, 1); }],
  g_bhelm: [10, 8, c => { R(c, BW.b, 1, 1, 7, 5); R(c, BW.c, 2, 1, 4, 1); R(c, BW.k, 4, 3, 4, 1); R(c, BW.visor, 5, 3, 3, 1); R(c, '#7a0c0c', 1, 6, 4, 1); }],
  g_shield: [7, 11, c => { R(c, BW.sh, 1, 1, 5, 9); R(c, BW.shHi, 1, 1, 5, 1); R(c, BW.shHi, 1, 1, 1, 9); R(c, BW.rivet, 3, 4, 1, 1); R(c, BW.shD, 2, 8, 4, 1); }],
  g_mcore: [6, 6, c => { R(c, MD.core, 1, 1, 4, 4); R(c, MD.coreHi, 2, 2, 2, 2); }],
  g_shood: [8, 6, c => { R(c, SN.a, 1, 1, 6, 4); R(c, SN.b, 2, 1, 3, 1); R(c, SN.k, 4, 3, 3, 2); R(c, SN.eye, 5, 3, 2, 1); }],
  g_plank: [9, 4, c => { R(c, '#7a4a24', 1, 1, 7, 2); R(c, '#a0632e', 1, 1, 7, 1); R(c, '#c8a070', 6, 1, 1, 1); }],
  g_plank2: [6, 5, c => { R(c, '#6e4222', 1, 1, 4, 3); R(c, '#9a5e2e', 1, 1, 4, 1); }],
  g_beam: [10, 4, c => { R(c, '#8a5228', 1, 1, 8, 2); R(c, '#b0703a', 1, 1, 8, 1); R(c, '#3a200e', 4, 2, 2, 1); }],
  g_bar: [9, 3, c => { R(c, '#505a67', 1, 1, 7, 1); R(c, '#7a8695', 1, 1, 3, 1); }],
  g_casing: [4, 3, c => { R(c, '#d9a640', 1, 1, 2, 1); }],
  g_rhelm: [10, 8, c => { R(c, RK.b, 1, 1, 8, 5); R(c, RK.c, 2, 1, 4, 1); R(c, RK.k, 4, 3, 5, 2); R(c, RK.visor, 5, 3, 4, 1); R(c, '#7a0c0c', 1, 6, 4, 1); }],
  g_rarmor: [8, 6, c => { R(c, RK.b, 1, 1, 6, 4); R(c, RK.c, 1, 1, 6, 1); R(c, '#e8b422', 2, 3, 4, 1); }],
  g_wing: [8, 3, c => { R(c, WP.wing, 1, 1, 6, 1); R(c, WP.wingD, 2, 1, 2, 1); }],
  g_horn: [10, 9, c => { R(c, RM.m, 1, 1, 6, 7); R(c, RM.ml, 1, 1, 6, 1); R(c, RM.y, 2, 3, 4, 1); R(c, RM.k, 2, 5, 4, 1); R(c, RM.mh, 7, 6, 2, 1); }],
  g_jhelm: [10, 8, c => { R(c, JT.b, 1, 1, 8, 5); R(c, JT.c, 2, 1, 4, 1); R(c, JT.k, 4, 3, 5, 2); R(c, JT.visor, 5, 3, 4, 1); R(c, '#7a0c0c', 1, 6, 4, 1); }],
  g_jarmor: [8, 6, c => { R(c, JT.b, 1, 1, 6, 4); R(c, JT.c, 1, 1, 6, 1); R(c, '#e8b422', 2, 3, 4, 1); }],
  g_smask: [8, 7, c => { R(c, SP.a, 1, 1, 6, 3); R(c, SP.mask, 2, 3, 5, 3); R(c, SP.lens, 3, 4, 1, 1); R(c, SP.lens, 5, 4, 1, 1); R(c, '#7a0c0c', 1, 6, 3, 1); }],
  g_satchel: [7, 5, c => { R(c, SP.bag, 1, 1, 5, 3); R(c, SP.bagL, 1, 1, 5, 1); R(c, SP.red, 2, 3, 3, 1); }],
  g_egg: [6, 6, c => { R(c, '#d8b028', 1, 1, 4, 4); R(c, '#fff8c0', 2, 1, 2, 2); R(c, '#9a7010', 1, 4, 4, 1); }],
  g_can: [7, 5, c => { R(c, '#2a6a3a', 1, 1, 5, 3); R(c, '#4aa060', 1, 1, 5, 1); R(c, '#e8b422', 3, 2, 2, 1); }],
  g_chood: [8, 6, c => { R(c, CK.a, 1, 1, 6, 4); R(c, CK.b, 2, 1, 3, 1); R(c, CK.k, 4, 3, 3, 2); R(c, CK.eye, 4, 3, 3, 1); }],
  g_pmask: [8, 7, c => { R(c, PY.a, 1, 1, 6, 3); R(c, PY.mask, 2, 3, 5, 3); R(c, PY.lens, 3, 4, 1, 1); R(c, PY.lens, 5, 4, 1, 1); R(c, '#7a0c0c', 1, 6, 3, 1); }],
  g_tank: [6, 8, c => { R(c, PY.tank, 1, 1, 4, 6); R(c, PY.tankL, 1, 1, 1, 6); R(c, '#e8b422', 1, 4, 4, 1); }],
  g_ice1: [6, 5, c => { R(c, '#a8e0f8', 1, 1, 4, 3); R(c, '#ffffff', 1, 1, 2, 1); R(c, '#6ab0d8', 3, 3, 2, 1); }],
  g_ice2: [5, 6, c => { R(c, '#a8e0f8', 1, 1, 3, 4); R(c, '#e8fbff', 1, 1, 1, 2); }],
  g_ice3: [8, 4, c => { R(c, '#c8f0ff', 1, 1, 6, 2); R(c, '#ffffff', 2, 1, 2, 1); R(c, '#7ac0e0', 5, 2, 2, 1); }],
  g_skull: [7, 6, c => { R(c, '#d8d0b8', 1, 1, 5, 3); R(c, '#1a0a08', 2, 2, 1, 1); R(c, '#1a0a08', 4, 2, 1, 1); R(c, '#c8bea0', 2, 4, 3, 1); }],
  g_dish: [8, 4, c => { R(c, '#8a94a6', 1, 1, 6, 2); R(c, '#c0c8d4', 2, 1, 4, 1); R(c, '#40d0ff', 3, 2, 2, 1); }],
  g_jplate: [11, 7, c => { R(c, '#3a414b', 1, 1, 9, 5); R(c, '#5a636e', 1, 1, 9, 1); for (let i = 0; i < 3; i++) R(c, i % 2 ? '#15161a' : '#e8b422', 2 + i * 3, 3, 3, 2); }],
  g_jughelm: [10, 9, c => { R(c, '#3a414b', 1, 1, 8, 6); R(c, '#5a636e', 2, 1, 6, 1); R(c, '#15171a', 3, 3, 6, 2); R(c, '#ff3020', 4, 3, 4, 1); R(c, '#7a0c0c', 1, 7, 4, 1); }],
  g_barrel: [7, 5, c => { R(c, '#a02018', 1, 1, 5, 3); R(c, '#e8b422', 2, 2, 2, 1); R(c, '#601010', 1, 3, 5, 1); }],
  // destructible props
  g_glass: [5, 4, c => { R(c, '#d0f0fa', 1, 1, 3, 1); R(c, '#6aa8c4', 1, 2, 2, 1); }],
  g_glass2: [4, 5, c => { R(c, '#eefaff', 1, 1, 1, 3); R(c, '#7ab8d0', 2, 2, 1, 2); }],
  g_neon: [7, 3, c => { R(c, '#ff5ac0', 1, 1, 5, 1); R(c, '#ffe0f4', 2, 1, 2, 1); }],
  g_soda: [4, 6, c => { R(c, '#d83424', 1, 1, 2, 4); R(c, '#f4f4f0', 1, 1, 2, 1); R(c, '#ff8a70', 1, 2, 1, 2); }],
  g_door: [10, 12, c => { R(c, '#5d6775', 1, 1, 8, 10); R(c, '#7f8a99', 1, 1, 8, 1); R(c, '#e8b422', 4, 3, 2, 1); R(c, '#e8b422', 3, 4, 4, 1); R(c, '#e8b422', 2, 5, 6, 1); R(c, '#232730', 2, 8, 6, 1); }],
  g_lid: [12, 5, c => { R(c, '#aa5a28', 1, 1, 10, 2); R(c, '#ec9c52', 2, 1, 6, 1); R(c, '#5a2a12', 1, 3, 10, 1); R(c, '#d8aa40', 5, 1, 2, 1); }],
  g_crt: [6, 5, c => { R(c, '#1a2a22', 1, 1, 4, 3); R(c, '#4af088', 2, 2, 1, 1); R(c, '#8a9aa6', 1, 1, 4, 1); }],
  g_ext: [6, 11, c => { R(c, '#b42c1e', 1, 2, 4, 8); R(c, '#f26e4e', 1, 2, 1, 8); R(c, '#c8cdd3', 2, 1, 2, 1); R(c, '#f0ece0', 2, 5, 2, 2); }],
  g_cop: [6, 4, c => { R(c, '#aa5a28', 1, 1, 4, 2); R(c, '#ec9c52', 1, 1, 2, 1); }],
  g_yel: [7, 5, c => { R(c, '#d4a422', 1, 1, 5, 3); R(c, '#ffe070', 1, 1, 3, 1); R(c, '#15161a', 4, 2, 2, 1); }],
  g_blk: [7, 5, c => { R(c, '#22252c', 1, 1, 5, 3); R(c, '#5e6470', 1, 1, 3, 1); }],
  g_wht: [7, 5, c => { R(c, '#a8aeb6', 1, 1, 5, 3); R(c, '#e4e7ea', 1, 1, 3, 1); R(c, '#d8442c', 4, 2, 1, 1); }],
  g_blu: [7, 5, c => { R(c, '#2a5c8c', 1, 1, 5, 3); R(c, '#5a9ac8', 1, 1, 3, 1); }],
  // overdrive round
  g_slag: [6, 6, c => { R(c, '#b8380a', 1, 1, 4, 4); R(c, '#ffa030', 1, 1, 3, 3); R(c, '#fff6d0', 2, 2, 1, 1); }],
  g_crust: [6, 4, c => { R(c, '#36221a', 1, 1, 4, 2); R(c, '#4a3024', 1, 1, 4, 1); R(c, '#f06a14', 4, 2, 1, 1); }],
  g_wormseg: [9, 6, c => { R(c, '#6a3430', 1, 1, 7, 4); R(c, '#8c4a3e', 2, 1, 5, 1); R(c, '#ff8a20', 1, 4, 7, 1); R(c, '#2e1618', 1, 3, 1, 1); }],
  g_tooth: [4, 5, c => { R(c, '#e8e2d0', 1, 1, 2, 2); R(c, '#e8e2d0', 1, 3, 1, 1); R(c, '#a89f80', 2, 2, 1, 1); }],
  g_hhelm: [10, 9, c => { R(c, '#b08428', 1, 1, 8, 6); R(c, '#f0c860', 2, 1, 3, 1); R(c, '#0e0c0a', 4, 2, 4, 3); R(c, '#ffe040', 5, 3, 2, 1); R(c, '#7a0c0c', 1, 7, 4, 1); }],
  g_chain: [8, 3, c => { R(c, '#a0aab6', 1, 1, 2, 1); R(c, '#4a525c', 3, 1, 1, 1); R(c, '#a0aab6', 4, 1, 2, 1); R(c, '#4a525c', 6, 1, 1, 1); }],
  g_emitter: [6, 6, c => { R(c, '#2a3038', 1, 1, 4, 4); R(c, '#40f0ff', 2, 2, 2, 2); R(c, '#ffffff', 2, 2, 1, 1); }],
  // crucible round
  g_mhelm: [10, 9, c => { R(c, '#463e6a', 1, 1, 8, 6); R(c, '#6a5e98', 2, 1, 4, 1); R(c, '#0e0c16', 4, 3, 4, 1); R(c, '#e080ff', 5, 3, 3, 1); R(c, '#b0a8e0', 4, 0, 1, 1); R(c, '#7a0c0c', 1, 7, 4, 1); }],
  g_glass: [5, 5, c => { R(c, '#7a5ad0', 1, 1, 3, 3); R(c, '#c0a8ff', 1, 1, 2, 1); R(c, '#ffffff', 1, 1, 1, 1); }],
  g_hive: [7, 6, c => { R(c, '#622626', 1, 1, 5, 4); R(c, '#a4523f', 2, 1, 3, 1); R(c, '#e8d040', 3, 3, 1, 1); }],
  g_needle: [8, 3, c => { R(c, '#8a94a0', 1, 1, 3, 1); R(c, '#d8e0e8', 4, 1, 3, 1); }],
  g_magnet: [7, 6, c => { R(c, '#5a636e', 1, 1, 5, 2); R(c, '#e02a1a', 1, 3, 2, 2); R(c, '#2a6ae0', 4, 3, 2, 2); }],
  g_gmask: [8, 7, c => { R(c, '#3a3a2a', 1, 1, 6, 5); R(c, '#2a2e35', 3, 3, 4, 3); R(c, '#ff8a20', 3, 4, 1, 1); R(c, '#ff8a20', 5, 4, 1, 1); }],
  g_dmask: [8, 7, c => { R(c, '#e8e0d8', 1, 1, 6, 5); R(c, '#0c0608', 3, 3, 4, 1); R(c, '#ff2a5a', 5, 3, 2, 1); R(c, '#3a0c18', 1, 0, 6, 1); }],
  g_tmask: [9, 8, c => { R(c, '#423a30', 1, 1, 7, 5); R(c, '#3a3f47', 3, 3, 5, 3); R(c, '#b0ff40', 4, 4, 1, 1); R(c, '#b0ff40', 6, 4, 1, 1); R(c, '#7a0c0c', 1, 6, 3, 1); }],
  g_tartank: [6, 8, c => { R(c, '#1a1410', 1, 1, 4, 6); R(c, '#4a3c30', 1, 1, 1, 6); R(c, '#e8b422', 1, 4, 4, 1); }],
  g_wyrmplate: [10, 7, c => { R(c, '#6a3430', 1, 1, 8, 5); R(c, '#8c4a3e', 1, 1, 8, 1); R(c, '#ff8a20', 1, 5, 8, 1); R(c, '#d08a6a', 2, 3, 1, 1); R(c, '#d08a6a', 7, 3, 1, 1); }],
};

// ---- level ----------------------------------------------------------------------
// Built from rectangles (tile units) instead of a hand-typed ASCII grid: easier to keep exact.
// '#' = solid metal, '=' = one-way grating (jump up through, S+Space drops down), 'x' = breakable crate,
// 'g' = breakable girder. Only '#' is permanent.
function buildLevel() {
  const g = [];
  for (let y = 0; y < MAP_H; y++) g.push(new Array(MAP_W).fill('.'));
  const fill = (x, y, w, h, c = '#') => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (g[j] && i >= 0 && i < MAP_W) g[j][i] = c; };
  fill(0, 0, 100, 2); fill(0, 25, 100, 2); fill(0, 0, 2, 27); fill(98, 0, 2, 27);    // shell
  fill(14, 23, 4, 2, 'x'); fill(28, 23, 2, 2, 'x'); fill(38, 21, 19, 4); fill(78, 23, 2, 2, 'x');   // crate stacks + plateau
  fill(7, 24, 2, 1, 'x'); fill(69, 24, 2, 1, 'x'); fill(92, 23, 2, 2, 'x'); fill(34, 16, 1, 1, 'x'); fill(62, 16, 1, 1, 'x'); fill(90, 20, 1, 1, 'x');
  fill(32, 2, 2, 5); fill(66, 2, 2, 5);                                                // hanging pillars
  // platform tiers: standing surfaces are 4 tiles (64 px) apart - inside the ~79 px jump
  fill(7, 21, 6, 1, '='); fill(20, 21, 6, 1, 'g'); fill(68, 21, 7, 1, '='); fill(86, 21, 7, 1, 'g');
  fill(13, 17, 7, 1, '='); fill(30, 17, 7, 1, 'g'); fill(44, 17, 7, 1, '='); fill(60, 17, 7, 1, 'g'); fill(77, 17, 7, 1, '='); fill(92, 17, 6, 1);
  fill(2, 13, 7, 1); fill(22, 13, 7, 1, '='); fill(38, 13, 5, 1, 'g'); fill(52, 13, 5, 1, 'g'); fill(70, 13, 7, 1, '='); fill(84, 13, 6, 1, 'g');
  fill(12, 9, 7, 1, '='); fill(44, 9, 7, 1, 'g'); fill(60, 9, 5, 1, '='); fill(90, 9, 8, 1);
  return g;
}
const LEVEL_GRID = buildLevel();
const SPAWNS = {                                  // [col, row] of the empty cell the actor stands in
  player: [4, 24],
  health: [[4, 12], [94, 8], [80, 16], [47, 20]],
};

// The operation order controls the arsenal, the first appearance of threats, and when machinery starts.
const CAMPAIGN = [
  { name: 'LOCKDOWN', brief: 'CLEAR THE PATROL WITH THE NAILGUN',
    breakMs: 3200, spawnGap: 1100, damageScale: 0.8, recovery: 75, squads: [
    { foes: [['grunt', 11, 24], ['grunt', 24, 24]] },
    { name: 'HEAVY INBOUND', incoming: 'HEAVY', unlock: ['shotgun'], foes: [['heavy', 62, 24]] },
    { name: 'DRONES INBOUND', incoming: 'DRONES', foes: [['drone', 47, 11], ['drone', 80, 6]] },
    { name: 'FLOOR SECURITY', foes: [['enforcer', 47, 8], ['stalker', 54, 20]] },
  ] },
  { name: 'BLACKOUT', brief: 'USE FLARES WHEN THE LIGHTS CUT', unlock: ['flare', 'net'],
    breakMs: 2800, spawnGap: 950, damageScale: 0.85, hazardContactMs: 500, squads: [
    { foes: [['grunt', 'G'], ['enforcer', 'G'], ['bulwark', 'G']] },
    { name: 'DARK AMBUSH', mod: 'dark', foes: [['creeper', 'A'], ['mimic', 'G'], ['stalker', 'G']] },
    { name: 'FLOOR SWEEP', foes: [['grunt', 'G'], ['tarspit', 'G'], ['mender', 'A']] },
  ], route: [{ cell: [95, 24], label: 'REACH THE FURNACE LIFT' }] },
  { name: 'SLAG RAIN', brief: 'FIND OVERHEAD COVER BEFORE THE RAIN', machinery: 'vents', unlock: ['grenade', 'saw', 'acid'],
    breakMs: 2800, spawnGap: 950, damageScale: 0.9, hazardContactMs: 425, recovery: 65, squads: [
    { foes: [['grunt', 'G'], ['roller', 'G'], ['shellback', 'G']] },
    { name: 'SALVAGE CREW', mod: 'slag', foes: [['lugger', 'G'], ['wasp', 'A']] },
    { name: 'FURNACE GUARD', foes: [['golem', 'G'], ['enforcer', 'G']] },
    { name: 'DEMOLITION TEAM', mod: null, machinery: null, foes: [['pyro', 'G'], ['rocketeer', 'G']] },
    { incoming: 'GUNSHIP', prepare: 'FIND COVER BEFORE THE VOLLEY', breakMs: 6200, foes: [['gunship', 50, 6]] },
  ] },
  { name: 'GRAVITY LOSS', brief: 'TAKE THE HIGH GROUND IN LOW GRAVITY', mod: 'lowg', machinery: 'vents', unlock: ['rail', 'cryo', 'hornet'],
    breakMs: 2500, spawnGap: 850, damageScale: 0.95, hazardContactMs: 350, squads: [
    { foes: [['grunt', 'G'], ['hound', 'G'], ['blinker', 'A']] },
    { name: 'GRAVITY SURGE', foes: [['hound', 'G'], ['pogo', 'G']] },
    { name: 'LINKER PAIR', foes: [['linker', 33, 17], ['linker', 39, 17]] },
    { name: 'HEAVY SUPPORT', foes: [['welder', 'G'], ['howitzer', 'G']] },
    { name: 'CONTAINMENT CREW', foes: [['slug', 'G'], ['chiller', 'G']] },
    { incoming: 'JUGGERNAUT', breakMs: 3500, machinery: null, foes: [['jugg', 'G']] },
  ], route: [{ cell: [95, 24], label: 'REACH THE SORTING LINE LIFT' }] },
  { name: 'SORTING SHIFT', brief: 'RIDE THE BELTS AND WATCH FOR MINES', machinery: 'belts', unlock: ['arc', 'stake'],
    breakMs: 1600, spawnGap: 550, elites: 1, squads: [
    { foes: [['grunt', 'G'], ['roller', 'G'], ['scavenger', 'G'], ['spotter', 'A']] },
    { name: 'FLOOR TRAPS', foes: [['minelayer', 'A'], ['grenadier', 'G'], ['pogo', 'G'], ['sporepod', 'G'],
      ['shellback', 'G'], ['mender', 'A']] },
  ] },
  { name: 'MELTDOWN', brief: 'MOVE WHEN THE PRESS LIGHTS FLASH', machinery: 'presses', unlock: ['katana'], elites: 2, squads: [
    { foes: [['slagling', 'G'], ['scavenger', 'G']] },
    { name: 'PRESS CREW', foes: [['linker', 'A'], ['linker', 'A'], ['ratking', 'G']] },
    { name: 'LAST SHIFT', prepare: 'CLIMB TO THE WALKWAYS', breakMs: 3200, machinery: null, mod: 'melt', unlock: ['rocket'],
      foes: [['burrower', 'G'], ['para', 'A'], ['tarspit', 'G'], ['headsman', 'G'], ['leaper', 'G']] },
    { name: 'CONTROL GUARD', prepare: 'SLAG DRAINING', mod: null, unlock: ['siphon'],
      foes: [['strider', 'G'], ['warhorn', 'G'], ['swapper', 'G'], ['grappler', 'G'], ['gatling', 'G']] },
    { incoming: 'WYRM', prepare: 'WATCH THE GROUND FOR ITS TELL', breakMs: 3200, foes: [['wyrm', 'G']] },
  ], route: [
    { cell: [36, 24], label: 'STAND AT COOLANT VALVE 1', hold: 0.8, done: 'INTAKE OPEN' },
    { cell: [63, 24], label: 'STAND AT COOLANT VALVE 2', hold: 0.8, done: 'COOLANT SEALED' },
    { cell: [95, 24], label: 'REACH THE WRECKING YARD LIFT' },
  ] },
  { name: 'DEMOLITION', brief: 'CLEAR THE CREW BEFORE THE BALL DROPS', unlock: ['drill'], elites: 2, squads: [
    { foes: [['lugger', 'G'], ['heavy', 'G'], ['roller', 'G'], ['enforcer', 'G']] },
    { name: 'BALL RELEASED', incoming: 'WRECKING BALL', prepare: 'STAY ON THE DAIS', breakMs: 2600, machinery: 'wreck', unlock: ['tractor'],
      foes: [['bulldozer', 'G'], ['harpooner', 'G'], ['hound', 'G'], ['spotter', 'A']] },
    { name: 'WRECKING CREW', unlock: ['flak'], foes: [['rocketeer', 'G'], ['wraith', 'A'], ['bastion', 'G'], ['buzzsaw', 'A'], ['pylon', 'G']] },
  ] },
  { name: 'THE FOREMAN', music: 'boss', brief: 'JUMP OVER THE SLAM WAVES', leadMs: 1800, unlock: ['shield', 'mini', 'marksman'],
    squads: [{ foes: [['foreman', 'B']] }], route: [{ cell: [95, 24], label: 'REACH THE POWERHOUSE LIFT' }] },
  { name: 'LIVE CIRCUIT', brief: 'CLEAR THE CREW WHILE RAILS ARE OFF', unlock: ['coil'], elites: 3, squads: [
    { foes: [['sparker', 'G'], ['sparker', 'G'], ['linker', 'A'], ['linker', 'A']] },
    { name: 'RAIL CREW', prepare: 'JUMP TO THE WALKWAYS', breakMs: 2600, machinery: 'rails', unlock: ['prism'],
      foes: [['magnet', 'A'], ['jammer', 'A'], ['pylon', 'G'], ['welder', 'G']] },
    { name: 'SURGE CREW', unlock: ['tether'], foes: [['vortex', 'A'], ['thundercloud', 'A'], ['bastion', 'G'], ['duelist', 'G']] },
    { name: 'CORE GUARD', foes: [['gatling', 'G'], ['sponge', 'G'], ['shellback', 'G'], ['copycat', 'A']] },
  ] },
  { name: 'THE SMELTER', music: 'boss', brief: 'KEEP CLEAR OF ITS BREATH', leadMs: 1800, unlock: ['lance', 'sing', 'nuke'],
    squads: [{ foes: [['boss', 'B']] }] },
];
const CAMPAIGN_ACTS = [
  { name: 'MELT FLOOR', first: 0, last: 1, job: 'BREAK LOCKDOWN AND RESTORE LIFT ACCESS', color: 0xffb347 },
  { name: 'FURNACE', first: 2, last: 3, job: 'BREACH THE FURNACE SECURITY LINE', color: 0xff764a, recovery: 60 },
  { name: 'SORTING LINE', first: 4, last: 5, job: 'SEAL THE COOLANT VALVES', color: 0x76e8ff, recovery: 75, breakMs: 1500, spawnGap: 525 },
  { name: 'WRECKING YARD', first: 6, last: 7, job: 'BRING DOWN THE FOREMAN', color: 0x9fe5a6, recovery: 75, breakMs: 1350, spawnGap: 490 },
  { name: 'POWERHOUSE', first: 8, last: 9, job: 'CUT POWER AND DESTROY THE SMELTER', color: 0xc9aaff, recovery: 80, breakMs: 1250, spawnGap: 460 },
];
const campaignFoesFrom = wave => CAMPAIGN.slice(wave).reduce((total, op) =>
  total + op.squads.reduce((n, squad) => n + squad.foes.length, 0), 0);
const CAMPAIGN_TOTAL = campaignFoesFrom(0);
const CAMPAIGN_KEY = 'slaghouse.campaign.v1';
const CAMPAIGN_REVISION = 2;
const ALL_WEAPON_SLOTS = WEAPONS.map((_, i) => i);
const weaponSlot = id => WEAPONS.findIndex(w => w.id === id);
function campaignWeaponSlots(wave, legacyWeapon) {
  const earned = CAMPAIGN.slice(0, wave).flatMap(op => [
    ...(op.unlock || []), ...op.squads.flatMap(squad => squad.unlock || []),
  ]);
  const slots = new Set([weaponSlot('nail'), ...earned.map(weaponSlot)]);
  if (legacyWeapon !== undefined) slots.add(legacyWeapon);
  return [...slots];
}
let campaignSave = null;                                               // keep the checkpoint available if storage is blocked
function loadCampaign() {
  if (campaignSave) return campaignSave;
  try {
    const stored = JSON.parse(localStorage.getItem(CAMPAIGN_KEY) || 'null');
    return stored && typeof stored.cleared === 'boolean' ? stored : null;
  } catch (err) { return null; }
}
function writeCampaign(save) {
  try { localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(save)); campaignSave = null; }
  catch (err) { campaignSave = save; }
}
const newRunId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
const campaignOwner = save => save?.owner ?? save?.checkpoint?.runId ?? null;   // the run whose lift rides save checkpoints; older saves name it only in the checkpoint
const ownsCampaign = (save, runId) => { const owner = campaignOwner(save); return owner === null || owner === runId; };
function campaignCheckpoint(save = loadCampaign()) {
  const c = save?.checkpoint, act = CAMPAIGN_ACTS[c?.arena];
  const nonnegative = n => Number.isFinite(n) && n >= 0;
  const index = (n, items) => Number.isInteger(n) && n >= 0 && n < items.length;
  const legacy = c?.revision === undefined;
  if (!index(c?.arena, CAMPAIGN_ACTS) || !act.first || c.wave !== act.first || typeof c.runId !== 'string' ||
      (legacy ? c.arena > 2 : c.revision !== CAMPAIGN_REVISION) ||
      (c.legacyWeapon !== undefined && !index(c.legacyWeapon, WEAPONS)) ||
      !index(c.diff, DIFFS) || !index(c.mut, MUTATORS) || !index(c.weapon, WEAPONS) ||
      !nonnegative(c.hp) || c.hp <= 0 || c.hp > TUNE.PLAYER_HP ||
      ![c.elapsed, c.bestCombo, c.headshots, c.totalEnemies, c.style?.pts].every(nonnegative) ||
      !index(c.style.rank, STYLE_RANKS) || !index(c.style.best, STYLE_RANKS)) return null;
  const stats = c.stats, wk = stats?.wk;
  if (!stats || !['shots', 'hits', 'kills', 'taken', 'executes', 'dodges'].every(k => nonnegative(stats[k])) ||
      (stats.big !== undefined && !nonnegative(stats.big)) || !wk || Array.isArray(wk) ||
      typeof wk !== 'object' || !Object.entries(wk).every(([id, n]) => WEAPONS.some(w => w.id === id) && nonnegative(n)) ||
      !Array.isArray(c.medals) || !c.medals.every(id => MEDALS.some(m => m.id === id)) ||
      !c.perks || Array.isArray(c.perks) || typeof c.perks !== 'object' ||
      !Object.entries(c.perks).every(([id, on]) => on === true && PERKS.some(p => p.id === id)) ||
      !c.ms || Array.isArray(c.ms) || typeof c.ms !== 'object' || !Object.values(c.ms).every(nonnegative)) return null;
  if (stats.kills > c.totalEnemies) return null;
  const legacyWeapon = legacy ? c.weapon : c.legacyWeapon;
  if (!campaignWeaponSlots(c.wave, legacyWeapon).includes(c.weapon)) return null;
  // A checkpoint only saves after an act is clear. Keep its kills and use the current rosters for the acts ahead.
  return { ...c, revision: CAMPAIGN_REVISION, legacyWeapon, totalEnemies: stats.kills + campaignFoesFrom(c.wave) };
}
// BOSS RUSH: ten bosses back to back across the first five arenas, two to each, a perk between each
// Run modes (#128): one record per mode holding every rule that differs between modes, from its waves and music to its
// start, restart and results. GameScene.create sets this.mode from RUNMODE (or the Lab) and asks it. this.campaign and
// this.lab stay as flags for the campaign's own systems (squads, routes, checkpoints) and the Lab's (its roster and
// switches), which are features of those modes rather than rules. A new mode is a new record here; modes.js checks
// that it carries every rule the scene asks for.
//   waves     operations in a run; 0 for endless modes (and the Lab, which counts no waves)
//   total     foes the run starts out counting
//   openTotal each wave adds its foes to the total as it starts (the endless modes)
//   lifetime  the run counts toward lifetime runs, kills, deaths, time played, weapon mastery, medals and codex sightings
//   record    the localStorage key its results screen writes; null for none
//   dated     the run plays one UTC day's seeded waves, kept through its restarts (DAILY)
//   confirmRestart  mid-run R and the pause menu's RESTART / QUIT ask first (all but the Lab)
//   winCallout      the callout a won run ends on
//   smelterCard     the Smelter's fall puts up its VICTORY card (the endless modes carry on instead)
//   waveScore       score per wave reached, on top of the shared formula (OVERTIME and DAILY)
//   endCard         [title, subtitle] shown in place of a results screen (the Lab, which keeps no score)
// and, as functions of the scene g:
//   difficulty(g), mutator(g)   the run's difficulty index and MUTATORS index (a campaign checkpoint carries its own)
//   begin(g, carry, now)        the first frame of a run or an arena: its wave card, music and first wave
//   restartData(g, checkpoint)  the data R / RESTART restarts the scene with
//   startArena(day)             the arena a fresh run starts in (DAILY: the day's)
//   onWin(g)                    a won run's mode medals (the campaign's speed, Ironclad and mutant; BOSS RUSH's Rusher)
//   writeRecord(g, result)      files the run's record under its key; returns { best, newBest } and its own fields
//                               for the results screen (result is { score, grade, time, won })
// and, for the modes that run waves (i is the wave from 0):
//   squads(g, i)        the wave's authored squads, each { foes: [[kind, point], ...] } plus any campaign squad fields
//   rng(g, i)           the random source for its modifier and elites (DAILY: seeded by the day, the same for everyone)
//   modifier(g, i, rng) the wave's modifier: 'dark', 'slag', 'lowg', 'melt' or null
//   card(g, i, mod)     the wave card's [title, subtitle]
//   elites(g, i)        how many of its foes become elites
//   music(g, i)         the soundtrack track for the wave
//   foeRng(g, i)        the endless modes' random source for a wave's roster (DAILY: seeded by the day)
//   liftAfter(g)        after this wave's perk, ride the lift to the next arena (the non-campaign modes)
//   hpScale(g)          foes' HP multiplier this wave (OVERTIME grows it; others leave it out)
const MOD_ROLL = ['dark', 'slag', 'lowg', 'melt'];
const liftArrival = (g, c) => {                                      // down the lift: the arena card, then the next wave
  BUS.emit('wavecard', g.A.name, g.A.sub); Music.track(g.waveTrack(c.wave));
  g.time.delayedCall(2000, () => { if (g.state === 'play') g.startWave(c.wave); });
};
const bestRecord = (g, r) => {                                       // the best score: a mutator run is marked, not kept apart
  const key = g.mode.record, best = loadRec(key), newBest = r.score > 0 && (!best || r.score > best.score);
  if (newBest) try { localStorage.setItem(key, JSON.stringify({ score: r.score, grade: r.grade, time: Math.round(r.time), won: r.won, diff: DIFFS[g.runDiff].name, mut: g.mutator !== 'none' ? g.mutator : undefined })); } catch (err) { /* private mode: no record */ }
  return { best: best ? best.score : 0, newBest, won: r.won, rush: false, checkpoint: !r.won && !!g.chapterStart };
};
const standardRestart = (g, cp) => ({ arena: cp?.arena ?? g.mode.startArena(g.day), carry: cp, retry: !!cp, runId: g.campaignRunId, day: g.day });   // the same run again: it keeps (or still lacks) the save
const overtimeMode = (id, record, dated) => ({                       // OVERTIME and DAILY: endless waves, the same rules
  id, waves: 0, total: 0, openTotal: true, lifetime: true, record, dated, confirmRestart: true,
  winCallout: 'ARENA CLEARED', smelterCard: false, waveScore: 600,
  writeRecord: (g, r) => {                                            // the wave you reached; DAILY's is kept per day
    let ob = loadRec(record);
    const later = dated && ob && ob.date > g.day;                     // a newer day's record stays, even if this run's day ended mid-run
    if (dated && ob && ob.date !== g.day) ob = null;                  // another day's daily doesn't count
    const nb = !later && (!ob || g.wave + 1 > ob.wave || (g.wave + 1 === ob.wave && r.score > ob.score));
    if (nb) try { localStorage.setItem(record, JSON.stringify(dated ? { date: g.day, wave: g.wave + 1, score: r.score } : { wave: g.wave + 1, score: r.score, mut: g.mutator !== 'none' ? g.mutator : undefined })); } catch (err) { /* private mode */ }
    return { best: ob ? ob.score : 0, newBest: nb, won: false, endless: true, daily: dated, waves: g.wave + 1 };
  },
  difficulty: () => OPTS.diff, mutator: () => (dated ? 0 : OPTS.mut),      // DAILY is the same run for everyone: no mutator
  rng: dated ? (g, i) => seeded(g.day * 31 + i) : () => Math.random,
  foeRng: dated ? (g, i) => seeded(g.day * 131 + i * 7919) : () => Math.random,
  startArena: dated ? day => dailyArena(day) : () => 0,
  restartData: standardRestart,
  begin: (g, c) => {                                                  // no placed wave: it starts straight in
    BUS.emit('wave', (c ? c.wave : 0) + 1, g.mode.waves);
    if (c) { liftArrival(g, c); return; }
    if (dated) {                                                      // DAILY: two seeded starting perks
      const r = seeded(g.day + 77), pool = PERKS.slice();
      for (let k = 0; k < 2; k++) g.perks[pool.splice(Math.floor(r() * pool.length), 1)[0].id] = true;
      BUS.emit('perklist', Object.keys(g.perks));
    }
    BUS.emit('wavecard', dated ? 'DAILY ' + g.day : 'OVERTIME', dated ? 'SAME WAVES FOR EVERYONE TODAY' : 'SURVIVE AS LONG AS YOU CAN'); Music.track(g.waveTrack(0), true);
    g.time.delayedCall(1800, () => { if (g.state === 'play') g.startWave(0); });
  },
  liftAfter: g => (g.wave + 1) % TUNE.ENDLESS.cycle === 0,
  hpScale: g => (g.wave > 0 ? 1 + TUNE.ENDLESS.hpPer * g.wave : 1),  // tougher every wave
  squads: (g, i) => [{ foes: g.endlessWave(i) }],
  modifier: (g, i, rng) => {                                          // a boss every sixth wave, otherwise 45% a modifier, never twice running
    let mod = i % 6 === 5 ? null : rng() < 0.45 ? MOD_ROLL[Math.floor(rng() * 4)] : null;
    if (mod && mod === g.lastMod) mod = MOD_ROLL.filter(m => m !== mod)[Math.floor(rng() * 3)];
    return mod;
  },
  card: (g, i, mod) => ['OVERTIME ' + (i + 1), i % 6 === 5 ? OT_BOSSES[Math.floor(i / 6) % OT_BOSSES.length][1] : MOD_CARDS[mod] || 'HOSTILES INBOUND'],
  elites: (g, i) => Math.min(6, Math.floor(i / 2)),
  music: (g, i) => WAVE_MUSIC[i % WAVE_MUSIC.length],                // round the six-wave cycle
});
const campaignMusic = (g, i) => { const op = CAMPAIGN[Math.min(i, CAMPAIGN.length - 1)]; return op.music || (i < CAMPAIGN_ACTS[1].first ? 'stage1' : 'stage2'); };
const RUN_MODES = {
  campaign: { id: 'campaign', get waves() { return CAMPAIGN.length; }, get total() { return CAMPAIGN_TOTAL; }, openTotal: false, lifetime: true, record: 'slaghouse.best',
    dated: false, confirmRestart: true, winCallout: 'FOUNDRY DOWN', smelterCard: true, waveScore: 0,
    difficulty: g => (g.carry ? g.carry.diff : OPTS.diff), mutator: g => (g.carry ? g.carry.mut : OPTS.mut),   // a checkpoint keeps the run's settings
    onWin: g => {
      if (!g.campaignRetried && g.runTime() < 600) g.award('speed');
      if (g.runDiff === 2) g.award('ironclad');
      if (g.runMut) g.award('mutant');
    },
    writeRecord: (g, r) => {
      const out = bestRecord(g, r);
      if (r.won) {                                                    // the campaign is cleared
        const save = loadCampaign(), checkpoint = campaignCheckpoint(save);
        writeCampaign({ ...save, checkpoint: checkpoint?.runId === g.campaignRunId ? null : checkpoint, cleared: true, revision: CAMPAIGN_REVISION });   // keeps the owner, so a stale tab's win leaves the newer run's save
      }
      return out;
    },
    startArena: () => 0, restartData: standardRestart,
    begin: (g, c, now) => {                                           // each act opens on its card, then its first operation
      BUS.emit('wave', (c ? c.wave : 0) + 1, g.mode.waves);
      g.stats.t0 = now;
      const act = CAMPAIGN_ACTS[g.A.id - 1];
      if (!act) throw new Error(`campaign run in ARENA 0${g.A.id}, which has no act (only OVERTIME and DAILY go there)`);
      BUS.emit('wavecard', 'ACT 0' + g.A.id, act.name + (c ? ' / CHECKPOINT' : ''));
      Music.track(g.waveTrack(act.first), !c);
      g.time.delayedCall(1800, () => { if (g.state === 'play') g.startWave(act.first); });
    },
    squads: (g, i) => CAMPAIGN[i].squads, rng: () => Math.random, modifier: (g, i) => CAMPAIGN[i].mod ?? null,
    card: (g, i) => [CAMPAIGN[i].name, CAMPAIGN[i].brief], elites: (g, i) => CAMPAIGN[i].elites ?? 0, music: campaignMusic },
  endless: overtimeMode('endless', 'slaghouse.bestEndless', false),                                   // OVERTIME
  daily: overtimeMode('daily', 'slaghouse.daily', true),
  bossrush: { id: 'bossrush', get waves() { return RUSH.length; }, get total() { return RUSH.length; }, openTotal: false, lifetime: true, record: 'slaghouse.bestRush',
    dated: false, confirmRestart: true, winCallout: 'ARENA CLEARED', smelterCard: true, waveScore: 0,
    difficulty: () => OPTS.diff, mutator: () => OPTS.mut,
    onWin: g => g.award('rusher'),
    writeRecord: (g, r) => ({ ...bestRecord(g, r), rush: true }),     // its own record, apart from the campaign's
    startArena: () => 0, restartData: standardRestart,
    begin: (g, c) => {                                                // straight into the first boss (or the next one, down the lift)
      BUS.emit('wave', (c ? c.wave : 0) + 1, g.mode.waves);
      if (c) { liftArrival(g, c); return; }
      BUS.emit('wavecard', 'BOSS RUSH', 'TEN BOSSES BACK TO BACK'); Music.track(g.waveTrack(0), true);
      g.time.delayedCall(1800, () => { if (g.state === 'play') g.startWave(0); });
    },
    liftAfter: g => g.wave >= g.A.last,
    squads: (g, i) => [{ foes: RUSH[i] }], rng: () => Math.random, modifier: () => null,
    card: (g, i) => ['BOSS ' + (i + 1) + ' OF ' + RUSH.length, RUSH_SUBS[i]], elites: () => 0, music: () => WAVE_MUSIC[WAVE_MUSIC.length - 1] },
  lab: { id: 'lab', waves: 0, total: 0, openTotal: false, lifetime: false, record: null, dated: false,   // runs no waves: its roster warps in at once
    confirmRestart: false,                                            // R resets the room at once
    winCallout: 'ARENA CLEARED', smelterCard: true, waveScore: 0, endCard: ['TEST ENDED', 'R RESET / F2 CONTROLS / ESC EXIT'],
    difficulty: g => g.lab.difficulty ?? OPTS.diff, mutator: () => 0,
    restartData: g => ({ lab: g.lab, spawns: g.labRoster }),
    begin: g => {
      const room = LAB_ROOMS[g.lab.room];
      BUS.emit('wave', 'LAB'); BUS.emit('wavecard', room.name.toUpperCase(), 'F2 CONTROLS / R RESET ROOM');
      g.applyMod(g.lab.modifier === 'none' ? null : g.lab.modifier);
      const spawns = g.labRoster;
      g.labPending = g.enemiesLeft = g.totalEnemies = spawns.length;
      BUS.emit('enemies', g.enemiesLeft);
      for (const { kind, cell, flying, elite } of spawns) g.warpIn(kind, cell, flying, elite);
      Music.track(g.waveTrack(0), true);
    },
    music: campaignMusic },
};
const RUSH = [[['jugg', 'G']], [['grinder', 'B']], [['gunship', 'A']], [['crucible', 'B']], [['wyrm', 'G']], [['queen', 'B']], [['foreman', 'B']], [['overseer', 'B']], [['conductor', 'B']], [['boss', 'B']]];
const RUSH_SUBS = ['THE JUGGERNAUT', 'THE GRINDER', 'THE GUNSHIP', 'THE CRUCIBLE', 'THE SLAG WYRM', 'THE HIVE QUEEN', 'THE FOREMAN', 'THE OVERSEER', 'THE CONDUCTOR', 'THE SMELTER'];
// OVERTIME's boss every sixth wave, in turn (DAILY too): [kind, the wave card's line]
const OT_BOSSES = [['boss', 'THE SMELTER RETURNS'], ['foreman', 'THE FOREMAN CLOCKS IN'], ['crucible', 'THE CRUCIBLE BOILS OVER'], ['grinder', 'THE GRINDER ROLLS IN'],
  ['queen', 'THE HIVE QUEEN DESCENDS'], ['overseer', 'THE OVERSEER IS WATCHING'], ['conductor', 'THE CONDUCTOR TAKES THE STAGE']];
// what a copycat copies: lobs, spreads and beams; anything else is a rapid burst
const CAT_LOB = new Set(['grenade', 'cluster', 'napalm', 'grav', 'gaslaunch', 'stasis', 'decoy', 'limpet', 'coil', 'nuke', 'sing', 'spider', 'tripwire', 'glue', 'bubble', 'cannon', 'quake', 'balllight', 'cyclone', 'barrage']);
const CAT_SPREAD = new Set(['shotgun', 'flak', 'dragon', 'vacuum', 'splitter', 'bees', 'firework', 'cutter', 'saw', 'caltrop']);
const CAT_BEAM = new Set(['arc', 'rail', 'prism', 'lance', 'siphon', 'microwave', 'cryo', 'flame', 'acid', 'shrink', 'marksman', 'orbital', 'sonic', 'whip', 'shock', 'phase', 'spear', 'heatray', 'hydro']);
const SPONGE_EATS = new Set(['nail', 'pellet', 'rivet', 'shard', 'needle', 'revolver', 'parry', 'prism', 'phase']);
const WAVE_POINTS = {
  G: [[10, 24], [26, 24], [52, 20], [63, 24], [80, 16], [95, 24], [87, 12], [47, 8], [33, 16], [4, 12], [16, 16], [73, 20]],
  A: [[20, 10], [47, 11], [72, 8], [90, 6], [30, 6], [56, 6], [10, 16], [82, 10]],
  B: [[47, 20]],                                                // the boss always lands on the plateau
};
const DECOR = {
  lamps: [[168, 66], [600, 74], [904, 62], [1176, 70], [1416, 66]],
  beacons: [[605, 356], [915, 356], [35, 290], [1565, 290]],
  vents: [[47 * TS + 8, 21 * TS], [75 * TS + 8, 25 * TS]],
};
// ARENA 02 :: THE FURNACE (campaign waves 3-4): a furnace block in the middle, two towers,
// and a long girder catwalk hung from two pillars that comes down when you cut it. Tiers 4 tiles apart, as in 01.
function buildLevel2() {
  const g = [];
  for (let y = 0; y < MAP_H; y++) g.push(new Array(MAP_W).fill('.'));
  const fill = (x, y, w, h, c = '#') => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (g[j] && i >= 0 && i < MAP_W) g[j][i] = c; };
  fill(0, 0, 100, 2); fill(0, 25, 100, 2); fill(0, 0, 2, 27); fill(98, 0, 2, 27);    // shell
  fill(44, 19, 12, 6);                                                                // the furnace (stand on it at row 18)
  fill(41, 22, 3, 3, 'x'); fill(56, 22, 3, 3, 'x');                                  // crate steps up to it
  fill(23, 14, 3, 11); fill(74, 14, 3, 11);                                           // towers
  fill(42, 2, 1, 8); fill(57, 2, 1, 8);                                               // pillars the catwalk hangs from
  fill(36, 10, 28, 1, 'g');
  fill(47, 10, 6, 1, '=');                                                            // jump through the center of the catwalk
  fill(46, 16, 5, 1, '='); fill(49, 13, 5, 1, '=');                                   // permanent steps from the furnace top
  fill(5, 21, 7, 1, '='); fill(14, 21, 6, 1, 'g'); fill(80, 21, 6, 1, 'g'); fill(88, 21, 7, 1, '=');
  fill(9, 17, 6, 1, 'g'); fill(17, 17, 6, 1, '='); fill(77, 17, 6, 1, '='); fill(85, 17, 6, 1, 'g');
  fill(29, 14, 6, 1, '='); fill(65, 14, 6, 1, '=');
  fill(2, 13, 6, 1); fill(92, 13, 6, 1);
  fill(12, 9, 6, 1, '='); fill(82, 9, 6, 1, '=');
  fill(60, 17, 5, 1, '='); fill(59, 13, 5, 1, '='); fill(59, 10, 5, 1, '=');
  fill(70, 18, 4, 1, '='); fill(77, 13, 5, 1, '='); fill(89, 13, 3, 1, '=');
  fill(8, 23, 2, 2, 'x'); fill(33, 24, 2, 1, 'x'); fill(65, 24, 2, 1, 'x'); fill(90, 23, 2, 2, 'x');
  return g;
}
function paintFurnace(ctx) {                         // ARENA 02: the furnace's glowing grate
  const x0 = 46 * TS, y0 = 20 * TS + 4, w = 8 * TS, h = 3 * TS + 4;
  R(ctx, '#0b0a09', x0 - 2, y0 - 2, w + 4, h + 4); R(ctx, '#4a3424', x0 - 1, y0 - 1, w + 2, 1);
  for (let y = 0; y < h; y++) { const t = y / h; R(ctx, t < 0.3 ? '#7a2008' : t < 0.7 ? '#c84008' : '#ff8a20', x0, y0 + y, w, 1); }
  for (let x = 0; x < w; x += 6) R(ctx, '#1a1210', x0 + x, y0, 2, h);
  R(ctx, '#ffe68a', x0, y0 + h - 2, w, 1);
}
const DECOR2 = {
  lamps: [[200, 66], [470, 74], [1130, 74], [1400, 66]],
  beacons: [[378, 236], [1222, 236], [35, 290], [1565, 290]],
  vents: [[50 * TS, 19 * TS], [28 * TS + 8, 25 * TS], [71 * TS + 8, 25 * TS]],
  glows: [[50 * TS, 22 * TS, 4.5, 0xff6a10]],
  jets: [[46 * TS + 8, 19 * TS], [50 * TS, 19 * TS], [53 * TS + 8, 19 * TS]],   // fire vents on the furnace top
};
function buildLevel3() {                             // ARENA 03 :: THE SORTING LINE
  const g = [];
  for (let y = 0; y < MAP_H; y++) g.push(new Array(MAP_W).fill('.'));
  const fill = (x, y, w, h, c = '#') => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (g[j] && i >= 0 && i < MAP_W) g[j][i] = c; };
  fill(0, 0, 100, 2); fill(0, 25, 100, 2); fill(0, 0, 2, 27); fill(98, 0, 2, 27);    // shell
  fill(44, 21, 12, 4);                                                                // control block (stand on it at row 20)
  fill(41, 23, 3, 2, 'x'); fill(56, 23, 3, 2, 'x');                                  // crate steps
  fill(8, 17, 22, 1); fill(70, 17, 22, 1);                                            // the upper belts (solid, presses hang under them)
  fill(35, 2, 1, 12); fill(64, 2, 1, 12); fill(36, 13, 28, 1, 'g');
  fill(41, 13, 6, 1, '='); fill(53, 13, 6, 1, '=');                                   // access either side of the central press
  fill(41, 17, 6, 1, '='); fill(53, 17, 6, 1, '=');
  fill(3, 21, 5, 1, '='); fill(92, 21, 5, 1, '='); fill(32, 19, 6, 1, '='); fill(62, 19, 6, 1, '=');   // gratings up
  fill(2, 11, 8, 1); fill(90, 11, 8, 1);                                              // side ledges
  fill(14, 13, 6, 1, '='); fill(80, 13, 6, 1, '=');
  fill(33, 24, 2, 1, 'x'); fill(65, 24, 2, 1, 'x');
  return g;
}
const BELTS3 = [{ x0: 6 * TS, x1: 31 * TS, y: 25 * TS, v: 60 }, { x0: 69 * TS, x1: 94 * TS, y: 25 * TS, v: -60 },
                { x0: 8 * TS, x1: 30 * TS, y: 17 * TS, v: -50 }, { x0: 70 * TS, x1: 92 * TS, y: 17 * TS, v: 50 }];
const PRESSES3 = [{ x: 19 * TS, top: 18 * TS, bot: 25 * TS }, { x: 81 * TS, top: 18 * TS, bot: 25 * TS }, { x: 50 * TS, top: 14 * TS, bot: 21 * TS }];
function paintSorting(ctx) {                         // ARENA 03: rubber belts with rollers, press housings under the upper belts
  for (const B of BELTS3) {
    R(ctx, '#15161a', B.x0, B.y, B.x1 - B.x0, 5); R(ctx, '#2a2c30', B.x0, B.y, B.x1 - B.x0, 1);
    for (let x = B.x0 + 4; x < B.x1 - 4; x += 12) { R(ctx, '#4b535e', x, B.y + 2, 4, 3); R(ctx, '#8a94a0', x + 1, B.y + 2, 2, 1); }
    R(ctx, '#c8a040', B.x0, B.y + 5, 3, 3); R(ctx, '#c8a040', B.x1 - 3, B.y + 5, 3, 3);
  }
  for (const Pr of PRESSES3) { R(ctx, '#22262c', Pr.x - 14, Pr.top, 28, 6); R(ctx, '#4b535e', Pr.x - 13, Pr.top + 1, 26, 2); for (let i = 0; i < 6; i++) R(ctx, i % 2 ? '#15161a' : '#e8b422', Pr.x - 12 + i * 4, Pr.top + 4, 4, 2); }
}
const DECOR3 = {
  lamps: [[260, 66], [600, 74], [1000, 74], [1340, 66]],
  beacons: [[300, 270], [1300, 270], [35, 160], [1565, 160]],
  vents: [[22 * TS, 25 * TS], [78 * TS, 25 * TS]],
};
// ARENA 04 :: THE WRECKING YARD: junk heaps of crates, a raised dais in the middle, and a
// wrecking ball on a 12-tile chain swinging across the middle from a gantry under the roof.
function buildLevel4(campaign = false) {
  const g = [];
  for (let y = 0; y < MAP_H; y++) g.push(new Array(MAP_W).fill('.'));
  const fill = (x, y, w, h, c = '#') => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (g[j] && i >= 0 && i < MAP_W) g[j][i] = c; };
  fill(0, 0, 100, 2); fill(0, 25, 100, 2); fill(0, 0, 2, 27); fill(98, 0, 2, 27);    // shell
  fill(48, 2, 4, 1);                                                                  // the ball's pivot mount
  fill(10, 21, 8, 4, 'x'); fill(8, 23, 2, 2, 'x'); fill(82, 21, 8, 4, 'x'); fill(90, 23, 2, 2, 'x');   // junk heaps
  fill(44, 18, 12, 7); fill(41, 22, 3, 3, 'x'); fill(56, 22, 3, 3, 'x');             // the dais (stand on it at row 17) + crate steps
  fill(24, 19, 9, 1); fill(67, 19, 9, 1);                                             // side platforms
  fill(5, 16, 6, 1, '='); fill(89, 16, 6, 1, '='); fill(15, 13, 7, 1, '='); fill(78, 13, 7, 1, '=');
  fill(32, 11, 6, 1, '='); fill(62, 11, 6, 1, '=');
  fill(2, 9, 7, 1); fill(91, 9, 7, 1);                                                // side ledges
  fill(28, 24, 2, 1, 'x'); fill(70, 24, 2, 1, 'x');
  fill(10, 18, 6, 1, '='); fill(84, 18, 6, 1, '=');
  fill(9, 11, 6, 1, '='); fill(85, 11, 6, 1, '=');
  fill(28, 15, 6, 1, '='); fill(66, 15, 6, 1, '=');
  if (campaign) { fill(35, 22, 5, 1, '='); fill(60, 22, 5, 1, '='); }   // keep a route over the dais after the crates break
  return g;
}
function paintYard(ctx) {                            // ARENA 04: the gantry the ball hangs from, hazard paint on the dais
  R(ctx, '#22262c', 36 * TS, 2 * TS, 28 * TS, 10); R(ctx, '#4b535e', 36 * TS, 2 * TS + 1, 28 * TS, 2); R(ctx, '#15161a', 36 * TS, 2 * TS + 8, 28 * TS, 2);
  for (let x = 36 * TS + 6; x < 64 * TS; x += 16) R(ctx, '#8a94a0', x, 2 * TS + 4, 2, 2);
  R(ctx, '#e8b422', 49 * TS, 3 * TS, 2 * TS, 4); R(ctx, '#15161a', 49 * TS + 13, 3 * TS, 6, 4);
  for (let i = 0; i < 12; i++) R(ctx, i % 2 ? '#15161a' : '#e8b422', 44 * TS + i * 16, 18 * TS, 16, 3);
}
const DECOR4 = {
  lamps: [[200, 66], [480, 74], [1120, 74], [1400, 66]],
  beacons: [[300, 280], [1300, 280], [35, 130], [1565, 130]],
  vents: [[26 * TS, 25 * TS], [74 * TS, 25 * TS]],
};
// ARENA 05 :: THE POWERHOUSE: a generator block in the middle, gratings and decks over a floor of
// live rails that power up in two banks, turn and turn about.
function buildLevel5(campaign = false) {
  const g = [];
  for (let y = 0; y < MAP_H; y++) g.push(new Array(MAP_W).fill('.'));
  const fill = (x, y, w, h, c = '#') => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (g[j] && i >= 0 && i < MAP_W) g[j][i] = c; };
  fill(0, 0, 100, 2); fill(0, 25, 100, 2); fill(0, 0, 2, 27); fill(98, 0, 2, 27);    // shell
  fill(44, 17, 12, 8); fill(41, 22, 3, 3, 'x'); fill(56, 22, 3, 3, 'x');             // the generator (stand on it at row 16) + crate steps
  fill(8, 20, 16, 1, '='); fill(76, 20, 16, 1, '='); fill(28, 20, 10, 1, '='); fill(62, 20, 10, 1, '=');   // walkways over the rails
  fill(14, 15, 8, 1); fill(78, 15, 8, 1); fill(30, 12, 8, 1, '='); fill(62, 12, 8, 1, '=');
  fill(46, 9, 8, 1, '='); fill(2, 10, 7, 1); fill(91, 10, 7, 1);
  fill(24, 23, 2, 2, 'x'); fill(74, 23, 2, 2, 'x');
  fill(22, 17, 5, 1, '='); fill(73, 17, 5, 1, '=');
  fill(9, 13, 5, 1, '='); fill(86, 13, 5, 1, '=');
  fill(30, 16, 8, 1, '='); fill(62, 16, 8, 1, '=');
  fill(40, 19, 4, 1, '='); fill(56, 19, 4, 1, '=');
  fill(46, 13, 8, 1, '=');
  if (campaign) {                                                       // permanent steps to the catwalks over every rail bank
    for (const x of [5, 30, 64, 87]) fill(x, 23, 6, 1, '=');
  }
  return g;
}
const RAILS5 = [{ x0: 4 * TS, x1: 22 * TS, y: 25 * TS, g: 0 }, { x0: 26 * TS, x1: 41 * TS, y: 25 * TS, g: 1 },
                { x0: 59 * TS, x1: 73 * TS, y: 25 * TS, g: 0 }, { x0: 77 * TS, x1: 96 * TS, y: 25 * TS, g: 1 }];
function paintPower(ctx) {                           // ARENA 05: the generator's turbine housing and its coils
  const x0 = 45 * TS, y0 = 18 * TS, w = 10 * TS, h = 6 * TS;
  R(ctx, '#0e1018', x0, y0, w, h); R(ctx, '#2a3040', x0 + 2, y0 + 2, w - 4, h - 4); R(ctx, '#3a4458', x0 + 2, y0 + 2, w - 4, 2);
  for (let i = 0; i < 9; i++) R(ctx, i % 2 ? '#c87a30' : '#ffb060', x0 + 8 + i * 16, y0 + 8, 8, h - 16);       // copper windings
  R(ctx, '#80c8ff', x0 + w / 2 - 10, y0 + h / 2 - 6, 20, 12); R(ctx, '#e0f4ff', x0 + w / 2 - 6, y0 + h / 2 - 3, 12, 6);   // the glowing core
  for (const R0 of RAILS5) for (let x = R0.x0; x < R0.x1; x += 16) R(ctx, '#e8b422', x, R0.y + 1, 8, 2);        // hazard paint on the rails
}
const DECOR5 = {
  lamps: [[200, 66], [480, 74], [1120, 74], [1400, 66]],
  beacons: [[300, 280], [1300, 280], [35, 140], [1565, 140]],
  vents: [[26 * TS, 25 * TS], [74 * TS, 25 * TS]],
  glows: [[50 * TS, 21 * TS, 3.5, 0x80c8ff]],
};
// ---- expansion: arenas ----
// ARENAS 06-10, for OVERTIME's lift rotation, the DAILY and the Lab (never the campaign). Each is a grid builder (tiers
// 4 tiles apart, as in 01-05), a paint function, its DECOR and, on its ARENAS record, the settings for its machinery
// (GameScene.setupArenaMachinery).
function xaGrid() {                                   // the shell every arena shares, and the fill helper
  const g = [];
  for (let y = 0; y < MAP_H; y++) g.push(new Array(MAP_W).fill('.'));
  const fill = (x, y, w, h, c = '#') => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (g[j] && i >= 0 && i < MAP_W) g[j][i] = c; };
  fill(0, 0, 100, 2); fill(0, 25, 100, 2); fill(0, 0, 2, 27); fill(98, 0, 2, 27);
  return [g, fill];
}
const xaBehind = (ctx, fn) => { ctx.globalCompositeOperation = 'destination-over'; fn(); ctx.globalCompositeOperation = 'source-over'; };   // paints only where no tile is
// ARENA 06 :: THE COOLING TOWER: a pump housing in the middle of a basin that floods with coolant, gratings close
// together so dry footing is never far off, and two high-voltage cable reels in the roof.
function buildLevel6() {
  const [g, fill] = xaGrid();
  fill(44, 17, 12, 8);                                                                // the pump housing (stand on it at row 16)
  fill(20, 2, 2, 4); fill(78, 2, 2, 4);                                               // spray headers hung from the roof
  fill(4, 21, 7, 1, '='); fill(15, 21, 6, 1, '='); fill(26, 21, 7, 1, 'g'); fill(37, 21, 6, 1, '='); fill(57, 21, 6, 1, '='); fill(67, 21, 7, 1, 'g'); fill(79, 21, 6, 1, '='); fill(89, 21, 7, 1, '=');
  fill(9, 17, 7, 1, '='); fill(21, 17, 7, 1, '='); fill(33, 17, 6, 1, 'g'); fill(61, 17, 6, 1, 'g'); fill(72, 17, 7, 1, '='); fill(84, 17, 7, 1, '=');
  fill(2, 13, 6, 1); fill(15, 13, 6, 1, '='); fill(27, 13, 7, 1, '='); fill(46, 13, 8, 1, '='); fill(66, 13, 7, 1, '='); fill(79, 13, 6, 1, '='); fill(92, 13, 6, 1);
  fill(9, 9, 7, 1, '='); fill(25, 9, 7, 1, '='); fill(45, 9, 10, 1, '='); fill(68, 9, 7, 1, '='); fill(84, 9, 7, 1, '=');
  fill(32, 23, 2, 2, 'x'); fill(66, 23, 2, 2, 'x');
  return g;
}
const FLOOD6 = { top: 21 * TS + 6, floor: 25 * TS, cables: [24 * TS + 8, 75 * TS + 8], idle: [10, 14], first: 7, warn: 2.6, rise: 3, hold: 6, drain: 3.5,
  live: 0.45, cable: 1.4, dmg: 6, edmg: 14, tick: 0.35 };
function paintTower(ctx) {                           // ARENA 06: the curved concrete shell, the inlets, the pump and the flood line
  xaBehind(ctx, () => {
    for (let y = 2 * TS; y < 25 * TS; y += 2) {      // the hyperbolic shell leans in to a waist at mid-height
      const k = (y - 12 * TS) / (13 * TS), w = Math.round(30 + 90 * k * k);
      for (const dir of [1, -1]) {
        const x0 = dir > 0 ? 2 * TS : 98 * TS - w, edge = dir > 0 ? x0 + w - 3 : x0;
        R(ctx, '#18232a', x0, y, w, 2); R(ctx, '#2c3f46', edge, y, 3, 2); R(ctx, '#3e5860', dir > 0 ? edge + 2 : edge, y, 1, 2);
        for (let x = 4; x < w - 4; x += 6) if (hash2(x0 + x * 7, 11) % 4 === 0) R(ctx, (hash2(x, y >> 4) & 1) ? '#141c22' : '#1d2a31', x0 + x, y, 1, 2);   // stains run down it
        if ((y >> 1) % 24 === 0) R(ctx, '#121a20', x0, y, w, 1);                                                                // pour lines
      }
    }
    for (let i = 0; i < 9; i++) { const r = 70 - i * 7; R(ctx, i % 2 ? '#1a2a30' : '#1e3038', 50 * TS - r, 2 * TS + i, r * 2, 1); }   // daylight through the open top
  });
  for (const dir of [1, -1]) {                       // the inlets the flood pours from
    const cx = dir > 0 ? 2 * TS - 6 : 98 * TS + 6, cy = 18 * TS;
    R(ctx, '#0b0f12', cx - 8, cy - 12, 16, 24); R(ctx, '#3a4a52', cx - 9, cy - 13, 18, 2); R(ctx, '#3a4a52', cx - 9, cy + 11, 18, 2);
    R(ctx, '#56707a', cx - 9, cy - 13, 18, 1); for (let j = -10; j <= 8; j += 6) R(ctx, '#22303a', cx - 6, cy + j, 12, 2);
    R(ctx, '#e8b422', dir > 0 ? cx + 7 : cx - 9, cy - 14, 2, 28);
  }
  const px = 44 * TS, py = 17 * TS;                  // the pump housing: casing, a teal sight glass, the gauge
  R(ctx, '#121820', px + 6, py + 10, 12 * TS - 12, 6 * TS); R(ctx, '#243440', px + 8, py + 12, 12 * TS - 16, 6 * TS - 4);
  for (let i = 0; i < 6; i++) R(ctx, '#1a6a78', px + 16 + i * 26, py + 20, 14, 52), R(ctx, '#3ab8c8', px + 18 + i * 26, py + 22, 3, 48), R(ctx, '#0e3a44', px + 16 + i * 26, py + 66, 14, 6);
  for (let y = 21 * TS - 30; y < 25 * TS; y += 8) R(ctx, '#7f8b99', px + 2, y, y % 32 === 0 ? 5 : 3, 1);
  R(ctx, '#ff3a2a', px, FLOOD6.top, 7, 2); drawGlyphs(ctx, 'MAX', px + 9, FLOOD6.top - 3, '#ff6a50');
  drawGlyphs(ctx, 'COOLANT', px + 50, py + 4, '#9ae8f0');
  for (const x of FLOOD6.cables) {                   // the high-voltage reels the live cable drops from
    R(ctx, '#15181d', x - 10, 2 * TS, 20, 9); R(ctx, '#3a414a', x - 9, 2 * TS + 1, 18, 7); R(ctx, '#e8b422', x - 9, 2 * TS + 7, 18, 2);
    for (let i = 0; i < 4; i++) R(ctx, '#15181d', x - 8 + i * 5, 2 * TS + 7, 2, 2);
    R(ctx, '#0b0c0f', x - 6, 2 * TS + 2, 12, 4); R(ctx, '#ff5a2a', x - 1, 2 * TS + 3, 2, 2);
  }
  for (const x of [20, 78]) for (let i = 0; i < 2; i++) { R(ctx, '#0e1216', x * TS + 6 + i * 12, 6 * TS, 8, 3); R(ctx, '#3ab8c8', x * TS + 8 + i * 12, 6 * TS + 3, 4, 1); }   // spray nozzles
  for (const x of [12, 24, 76, 88]) { R(ctx, '#0b0e10', x * TS, 25 * TS + 1, 32, 4); for (let i = 0; i < 7; i++) R(ctx, '#2a3a40', x * TS + 2 + i * 4, 25 * TS + 2, 2, 2); }   // floor drains
  for (let x = 2 * TS; x < 98 * TS; x += 2) if (hash2(x, 7) % 3) R(ctx, '#1e4a52', x, 25 * TS, 2, 1);   // a wet film on the floor
}
const DECOR6 = {
  lamps: [[150, 66], [560, 74], [1040, 74], [1450, 66]],
  beacons: [[45, 230], [1555, 230], [44 * TS + 4, 17 * TS - 6], [56 * TS - 4, 17 * TS - 6]],
  vents: [[38 * TS, 25 * TS], [62 * TS, 25 * TS]],
  glows: [[50 * TS, 20 * TS, 4, 0x3ac8e0], [50 * TS, 3 * TS, 5, 0x6a9ab0]],
};
// ARENA 07 :: THE CHILL VAULT: a cold store of racks and shelves over sheet-ice floors. Icicles grow under the roof and
// the solid shelves and drop on a shadow tell; cryo vents in the floor puff frost.
function buildLevel7() {
  const [g, fill] = xaGrid();
  fill(45, 21, 10, 4);                                                                // the freezer unit (stand on it at row 20)
  fill(5, 21, 7, 1, '='); fill(18, 21, 7, 1, '='); fill(31, 21, 6, 1, '='); fill(63, 21, 6, 1, '='); fill(75, 21, 7, 1, '='); fill(88, 21, 7, 1, '=');
  fill(10, 17, 8, 1); fill(24, 17, 6, 1, '='); fill(38, 17, 6, 1, '='); fill(56, 17, 6, 1, '='); fill(70, 17, 6, 1, '='); fill(82, 17, 8, 1);
  fill(2, 13, 6, 1); fill(16, 13, 6, 1, '='); fill(29, 13, 8, 1); fill(41, 13, 18, 1, '='); fill(63, 13, 8, 1); fill(78, 13, 6, 1, '='); fill(92, 13, 6, 1);
  fill(9, 9, 6, 1, '='); fill(22, 9, 7, 1, '='); fill(44, 9, 12, 1); fill(71, 9, 7, 1, '='); fill(85, 9, 6, 1, '=');
  fill(34, 23, 2, 2, 'x'); fill(64, 23, 2, 2, 'x');
  return g;
}
const GRID7 = buildLevel7();
// sheet ice [first column, last column + 1, the row whose top it lies on]; icicle spots [column, the solid row they hang
// under]; cryo vents [x, floor y]
const VAULT7 = { ice: [[6, 28, 25], [72, 94, 25], [45, 55, 21], [10, 18, 17], [82, 90, 17], [29, 37, 13], [63, 71, 13], [44, 56, 9]],
  icicles: [[16, 1], [33, 1], [68, 1], [84, 1], [13, 17], [86, 17], [32, 13], [67, 13], [47, 9], [53, 9]],
  vents: [[20 * TS, 25 * TS], [40 * TS, 25 * TS], [60 * TS, 25 * TS], [80 * TS, 25 * TS], [50 * TS, 21 * TS]],
  grow: [6, 9], ripe: [0.8, 3.5], tell: 1, regrow: [3, 5], dmg: 16, edmg: 45, hp: 12,
  vent: { idle: [5, 8], tell: 0.9, puff: 1.4, h: 60, w: 18, dmg: 3, chill: 0.25, tick: 0.3 } };
function paintVault(ctx) {                           // ARENA 07: frost on every ledge, a vault door, racks of frozen stock
  xaBehind(ctx, () => {
    const dx = 50 * TS, dy = 9 * TS + 4;             // the vault door on the back wall, its locking wheel
    for (let r = 46; r > 0; r -= 2) R(ctx, r > 42 ? '#2a3442' : r > 40 ? '#4a5868' : (r >> 1) % 3 ? '#222c38' : '#1c2430', dx - r, dy - Math.round(r * 0.9), r * 2, 2);
    for (let a = 0; a < 6; a++) { const ca = Math.cos(a * Math.PI / 3), sa = Math.sin(a * Math.PI / 3); for (let t = 4; t < 22; t++) R(ctx, '#5a6878', Math.round(dx + ca * t), Math.round(dy + sa * t * 0.9), 2, 2); }
    for (const x of [8 * TS, 26 * TS, 72 * TS, 90 * TS]) {             // freezer-room doors, rimed shut
      R(ctx, '#121820', x - 18, 19 * TS + 2, 36, 6 * TS - 2); R(ctx, '#2a3644', x - 16, 19 * TS + 4, 32, 6 * TS - 4); R(ctx, '#46566a', x - 16, 19 * TS + 4, 32, 1);
      R(ctx, '#8a94a0', x + 10, 22 * TS, 3, 10); for (let i = 0; i < 32; i += 2) R(ctx, '#a8d0f0', x - 16 + i, 19 * TS + 4, 2, 1 + hash2(x, i) % 3);
    }
    for (let x = 2 * TS; x < 98 * TS; x += 4) R(ctx, '#202a36', x, 2 * TS, 2, 2 + hash2(x, 3) % 5);   // rime along the roof
  });
  for (let ty = 1; ty < MAP_H - 1; ty++) for (let tx = 1; tx < MAP_W - 1; tx++) {          // rime on whatever faces up, frost fringes under what faces down
    const c = GRID7[ty][tx], x = tx * TS, y = ty * TS, h = hash2(tx, ty * 3);
    if (c === '.' || c === 'x') continue;
    if (GRID7[ty - 1][tx] === '.') { R(ctx, '#d8f4ff', x, y, 16, 1); R(ctx, '#9ad0f0', x, y + 1, 16, 1); for (let i = 0; i < 16; i += 3) if ((h >> i) & 1) R(ctx, '#ffffff', x + i, y, 2, 1); }
    if (GRID7[ty + 1][tx] === '.' && c === '#') for (let i = 1; i < 15; i += 3) if ((h >> (i + 2)) % 3) R(ctx, '#a8dcf8', x + i, y + 16, 1, 1 + ((h >> i) & 3));
  }
  for (const [x0, x1, row] of VAULT7.ice) { const y = row * TS; for (let x = x0 * TS; x < x1 * TS; x += 2) { R(ctx, '#bfe8ff', x, y, 2, 1); if (hash2(x, row) % 5 === 0) R(ctx, '#ffffff', x, y, 2, 1); if (hash2(x, row + 9) % 7 === 0) R(ctx, '#8ac4e8', x, y + 1, 1, 2 + hash2(x, 1) % 3); } }
  for (const [tx, ty] of VAULT7.icicles) { const x = tx * TS + 8, y = (ty + 1) * TS; R(ctx, '#d8f4ff', x - 4, y, 9, 2); R(ctx, '#8ac4e8', x - 3, y + 2, 7, 1); }   // frost caps where icicles grow
  for (const [vx, vy] of VAULT7.vents) {             // cryo vents: a ribbed grate with a cyan pilot
    R(ctx, '#1a2028', vx - 10, vy - 1, 20, 5); R(ctx, '#4a5868', vx - 10, vy - 1, 20, 1);
    for (let i = 0; i < 5; i++) R(ctx, '#0a0e12', vx - 8 + i * 4, vy + 1, 2, 3);
    R(ctx, '#6ae0ff', vx - 1, vy + 3, 2, 1);
  }
  drawGlyphs(ctx, 'COLD STORE 7', 50 * TS - 35, 21 * TS + 6, '#8ac4e8');
  drawGlyphs(ctx, '-28C', 50 * TS - 11, 22 * TS + 6, '#6ae0ff');
}
const DECOR7 = {
  lamps: [[180, 66], [600, 74], [1000, 74], [1420, 66]],
  beacons: [[35, 180], [1565, 180]],
  vents: [],
  glows: [[50 * TS, 9 * TS, 4.5, 0x6ab8ff], [20 * TS, 24 * TS, 3, 0x60c0ff], [80 * TS, 24 * TS, 3, 0x60c0ff]],
};
// ARENA 08 :: THE STORM ROOF: a rooftop at night under an open sky. A stairwell hut, a water tower, a radio mast,
// a billboard and a shed with its chimney; lightning favours whatever stands highest and gusts sweep the roof.
function buildLevel8() {
  const [g, fill] = xaGrid();
  fill(6, 21, 9, 4); fill(2, 17, 5, 1, '='); fill(2, 13, 4, 1);                      // the stairwell hut, its fire escape
  fill(21, 22, 6, 3); fill(17, 17, 6, 1, '=');                                        // an air-con unit
  fill(32, 21, 12, 4); fill(33, 13, 10, 4); fill(31, 17, 14, 1, '=');                // the water tower: its base, the tank, the catwalk
  fill(48, 17, 4, 8); fill(52, 21, 6, 1, '='); fill(46, 13, 8, 1, '='); fill(47, 9, 6, 1, '=');   // the radio mast's base and platforms
  fill(60, 21, 10, 1, '='); fill(62, 17, 9, 1, '='); fill(60, 13, 10, 1, '='); fill(62, 9, 7, 1, '=');   // the billboard's scaffold
  fill(72, 22, 5, 3);                                                                 // another air-con unit
  fill(80, 21, 9, 4); fill(91, 17, 3, 8); fill(94, 21, 4, 1, '='); fill(94, 13, 4, 1); // the shed, its chimney, the far corner
  return g;
}
const STORM8 = { every: [2.4, 4.2], warn: 1.3, r: 16, dmg: 22, edmg: 50, gust: { idle: [7, 10], first: 9, warn: 1.6, blow: 3.2, push: 115, shelter: 5 } };
function paintStorm(ctx) {                           // ARENA 08: the open sky above, parapets and a chain-link fence at the edges, rooftop kit
  ctx.clearRect(0, 0, LW, 2 * TS);                                                  // no roof over it (the sky layer shows through)
  for (const x0 of [0, 98 * TS]) {                   // a chain-link fence over each parapet
    ctx.clearRect(x0, 2 * TS, 2 * TS, 19 * TS);
    R(ctx, '#3a414a', x0 + 2, 6 * TS, 3, 15 * TS); R(ctx, '#3a414a', x0 + 26, 6 * TS, 3, 15 * TS); R(ctx, '#5a636e', x0, 6 * TS, 2 * TS, 2);
    for (let y = 6 * TS + 2; y < 21 * TS; y++) for (let x = 0; x < 2 * TS; x++) if ((x + y) % 6 === 0 || (x - y + 600) % 6 === 0) R(ctx, '#2a3038', x0 + x, y, 1, 1);
    R(ctx, '#4a3a30', x0, 21 * TS, 2 * TS, 4 * TS); for (let y = 21 * TS; y < 25 * TS; y += 6) R(ctx, '#3a2c24', x0, y, 2 * TS, 1);   // brick parapet
  }
  xaBehind(ctx, () => {
    const tl = 32 * TS + 6, tr = 44 * TS - 6;        // the water tower's legs and cross braces
    for (const x of [tl, tl + 26, tr - 26, tr]) R(ctx, '#20252c', x - 2, 17 * TS, 4, 4 * TS);
    for (let i = 0; i < 4 * TS; i++) { R(ctx, '#1a1e24', tl + Math.round(i * 26 / (4 * TS)), 17 * TS + i, 2, 1); R(ctx, '#1a1e24', tr - Math.round(i * 26 / (4 * TS)), 17 * TS + i, 2, 1); }
    const mx = 50 * TS;                              // the radio mast up into the storm, a lightning rod on top
    for (let y = 2; y < 17 * TS; y++) { R(ctx, '#252a32', mx - 5, y, 2, 1); R(ctx, '#252a32', mx + 3, y, 2, 1); if (y % 12 === 0) R(ctx, '#2e343d', mx - 5, y, 10, 1); if (y % 12 < 6) R(ctx, '#1c2026', mx - 3 + (y % 12), y, 1, 1); }
    R(ctx, '#8a94a0', mx - 1, 0, 2, 8);
    const bx = 60 * TS, by = 3 * TS + 8, bw = 10 * TS;   // the billboard: a faded ad for coolant cola
    R(ctx, '#1a1e24', bx, by, bw, 5 * TS); R(ctx, '#3a2a40', bx + 3, by + 3, bw - 6, 5 * TS - 6);
    for (let y = 0; y < 5 * TS - 6; y += 2) R(ctx, y < 30 ? '#4a2a50' : '#2a3a5a', bx + 3, by + 3 + y, bw - 6, 1);
    drawGlyphs(ctx, 'COOLANT', bx + 38, by + 20, '#ff60b0'); drawGlyphs(ctx, 'COLA', bx + 56, by + 32, '#60e0ff');
    for (let x = bx + 8; x < bx + bw; x += 30) R(ctx, '#0c0e12', x, by + 5 * TS, 3, 21 * TS - by - 5 * TS);
  });
  for (let x = 2 * TS; x < 98 * TS; x += 2) { R(ctx, hash2(x, 5) % 4 ? '#2a3038' : '#323a44', x, 25 * TS, 2, 1); if (hash2(x, 9) % 37 === 0) R(ctx, '#3a5a7a', x, 25 * TS, 6, 1); }   // wet roofing felt, rain pools
  for (const [x, w] of [[21, 6], [72, 5]]) {         // air-con fans
    const cx = x * TS + w * 8, cy = 23 * TS;
    for (let r = 10; r > 0; r--) R(ctx, r > 8 ? '#15181d' : r % 3 ? '#2a3038' : '#3a414a', cx - r, cy - r, r * 2, r * 2);
    R(ctx, '#5a636e', cx - 1, cy - 9, 2, 18); R(ctx, '#5a636e', cx - 9, cy - 1, 18, 2);
  }
  R(ctx, '#0b0c0f', 9 * TS, 22 * TS, 3 * TS, 3 * TS); R(ctx, '#3a414a', 9 * TS - 2, 22 * TS - 2, 3 * TS + 4, 2); drawGlyphs(ctx, 'EXIT', 9 * TS + 12, 22 * TS + 6, '#40ff80');   // the stairwell door
  for (let y = 17 * TS; y < 25 * TS; y += 4) R(ctx, '#4a3a30', 91 * TS, y, 3 * TS, 1);   // chimney bricks
  R(ctx, '#15181d', 91 * TS - 2, 17 * TS, 3 * TS + 4, 3);
  const tx = 33 * TS, ty = 13 * TS, tw = 10 * TS, th = 4 * TS;      // the water tank: timber staves, iron hoops, a conical cap
  for (let x = 0; x < tw; x++) { const k = Math.abs(x - tw / 2) / (tw / 2), col = k > 0.85 ? '#2a1c14' : x % 8 === 0 ? '#3a2618' : k > 0.6 ? '#4a3020' : '#5a3a26'; R(ctx, col, tx + x, ty + 2, 1, th - 2); }
  for (const hy of [ty + 8, ty + 30, ty + 52]) { R(ctx, '#3a414a', tx, hy, tw, 3); R(ctx, '#6a7380', tx, hy, tw, 1); }
  R(ctx, '#15181d', tx - 2, ty, tw + 4, 3); R(ctx, '#5a636e', tx - 2, ty, tw + 4, 1); drawGlyphs(ctx, 'H2O', tx + tw / 2 - 9, ty + 17, '#c8b080');
  for (let x = 80 * TS; x < 89 * TS; x += 4) { R(ctx, '#2e343c', x, 21 * TS + 1, 2, 4 * TS - 1); R(ctx, '#4a525c', x + 2, 21 * TS + 1, 1, 4 * TS - 1); }   // the shed's corrugated wall
  R(ctx, '#15181d', 82 * TS, 22 * TS, 20, 3 * TS); R(ctx, '#3a2c20', 82 * TS + 2, 22 * TS + 2, 16, 3 * TS - 2); R(ctx, '#8a94a0', 82 * TS + 14, 23 * TS + 4, 2, 4);
}
const DECOR8 = {
  lamps: [],
  beacons: [[50 * TS, 6], [44 * TS - 6, 13 * TS + 4], [70 * TS - 6, 3 * TS + 6], [92 * TS + 8, 17 * TS - 4]],
  vents: [[84 * TS, 21 * TS], [24 * TS, 22 * TS]],
  glows: [[9 * TS + 24, 22 * TS, 2.4, 0x40ff80], [65 * TS, 6 * TS, 6, 0xff60b0], [38 * TS, 18 * TS, 3, 0x6a80c0]],
};
// ARENA 09 :: THE CRUSHER: a compactor hall. Hydraulic walls close in from both ends to the crush line on a cycle; the
// outer floors are open gratings, so anything left on the floor is caught between a wall and an anvil. The middle is
// never touched.
function buildLevel9() {
  const [g, fill] = xaGrid();
  const both = (x, y, w, h, c) => { fill(x, y, w, h, c); fill(100 - x - w, y, w, h, c); };   // mirrored about the middle
  fill(44, 21, 12, 4);                                                                // the press bed (stand on it at row 20)
  both(30, 22, 3, 3);                                                                 // the anvils at the crush line
  both(3, 21, 9, 1, '='); both(16, 21, 14, 1, '=');
  both(7, 17, 10, 1, '='); both(21, 17, 15, 1, '=');
  both(2, 13, 9, 1, '='); both(15, 13, 10, 1, '=');
  both(8, 9, 8, 1, '='); both(22, 9, 9, 1, '=');
  both(38, 17, 5, 1); fill(44, 13, 12, 1, 'g'); both(36, 9, 7, 1, '='); fill(46, 5, 8, 1);
  return g;
}
const CRUSH9 = { reach: 28 * TS, idle: [9, 13], first: 8, warn: 2.2, close: 3.2, hold: 1.4, open: 2.6, dmg: 45, edmg: 400, bossDmg: 80 };
function paintCrusher(ctx) {                         // ARENA 09: the crush lines, the piston housings in the end walls, the press bed
  for (const x of [30 * TS, 70 * TS]) {              // hazard paint where the walls stop
    for (let y = 2 * TS; y < 22 * TS; y += 8) R(ctx, (y >> 3) % 2 ? '#15161a' : '#c83020', x - 1, y, 2, 4);
    for (let i = 0; i < 6; i++) R(ctx, i % 2 ? '#15161a' : '#e8b422', x - 24 + i * 8, 25 * TS, 8, 3);
  }
  drawGlyphs(ctx, 'CRUSH', 30 * TS - 32, 21 * TS - 8, '#ff5040'); drawGlyphs(ctx, 'CRUSH', 70 * TS + 4, 21 * TS - 8, '#ff5040');
  for (const x0 of [0, 98 * TS]) for (let ty = 3; ty < 24; ty += 5) {   // piston housings in the end walls
    R(ctx, '#0e1014', x0 + 4, ty * TS, 24, 3 * TS); R(ctx, '#3a414a', x0 + 6, ty * TS + 2, 20, 3 * TS - 4);
    R(ctx, '#8a94a0', x0 + 8, ty * TS + 20, 16, 8); R(ctx, '#c8d0d8', x0 + 8, ty * TS + 20, 16, 2);
  }
  const bx = 44 * TS, by = 21 * TS;                  // the press bed: a steel platen with a drain channel
  R(ctx, '#3a2c20', bx + 4, by + 6, 12 * TS - 8, 3); for (let x = bx + 6; x < bx + 12 * TS - 6; x += 10) R(ctx, '#14100c', x, by + 6, 4, 3);
  drawGlyphs(ctx, 'PRESS 9', bx + 72, by + 22, '#e8b422');
  xaBehind(ctx, () => { for (let x = 2 * TS; x < 98 * TS; x += 64) { R(ctx, '#1a1612', x, 2 * TS, 6, 23 * TS); for (let y = 2 * TS; y < 25 * TS; y += 32) R(ctx, '#241e18', x - 2, y, 10, 3); } });
}
const DECOR9 = {
  lamps: [[560, 74], [1040, 74], [700, 50], [900, 50]],
  beacons: [[30 * TS, 2 * TS + 6], [70 * TS, 2 * TS + 6], [44 * TS + 6, 21 * TS - 4], [56 * TS - 6, 21 * TS - 4]],
  vents: [[38 * TS, 25 * TS], [62 * TS, 25 * TS]],
  glows: [[50 * TS, 22 * TS, 3.5, 0xffb030]],
};
// ARENA 10 :: THE TURBINE HALL: floor fans whose updrafts carry you up, a turbine in the left wall that blows the upper
// hall to the right, and two rotors over the gaps in the middle tier that spin in a steady rhythm.
function buildLevel10() {
  const [g, fill] = xaGrid();
  fill(2, 3, 3, 8);                                                                   // the turbine nacelle in the left wall
  fill(40, 21, 7, 4); fill(53, 21, 7, 4);                                             // generator housings either side of the middle fan
  fill(4, 21, 7, 1, '='); fill(19, 21, 7, 1, '='); fill(30, 21, 6, 1, '='); fill(64, 21, 6, 1, '='); fill(74, 21, 7, 1, '='); fill(89, 21, 7, 1, '=');
  fill(6, 17, 6, 1, '='); fill(22, 17, 9, 1); fill(35, 17, 12, 1); fill(47, 17, 6, 1, '='); fill(53, 17, 12, 1); fill(69, 17, 9, 1); fill(88, 17, 6, 1, '=');
  fill(2, 13, 6, 1); fill(17, 13, 8, 1, '='); fill(36, 13, 9, 1, '='); fill(55, 13, 9, 1, '='); fill(75, 13, 8, 1, '='); fill(92, 13, 6, 1);
  fill(8, 9, 5, 1, '='); fill(24, 9, 8, 1, '='); fill(44, 9, 12, 1, '='); fill(68, 9, 8, 1, '='); fill(87, 9, 5, 1, '=');
  fill(46, 5, 8, 1, '=');
  return g;
}
// fans [x, the y the updraft reaches]; rotors [x, y, phase]; the gust band [top, bottom] blows from the nacelle
const TURB10 = { fans: [[15 * TS + 8, 9 * TS], [50 * TS, 4 * TS], [84 * TS + 8, 9 * TS]], w: 40, lift: 230,
  rotors: [[33 * TS, 16 * TS + 4, 0], [67 * TS, 16 * TS + 4, 0.5]], r: 30, spin: 3.4, slow: 0.8, stop: 2.2, wind: 0.9, dmg: 18, edmg: 35,
  gust: { x0: 5 * TS, x1: 97 * TS, top: 3 * TS, bot: 12 * TS, idle: [6, 9], first: 6, warn: 1.5, blow: 4, push: 130, shelter: 4 } };
function paintTurbine(ctx) {                         // ARENA 10: the turbine nacelle, fan pits in the floor, cable trays and dials
  const nx = 2 * TS, ny = 3 * TS;                    // the nacelle: a riveted cowl round the blades
  R(ctx, '#1a2026', nx, ny, 3 * TS, 8 * TS); R(ctx, '#3a4652', nx + 2, ny + 2, 3 * TS - 4, 8 * TS - 4); R(ctx, '#56646e', nx + 2, ny + 2, 3 * TS - 4, 2);
  for (let y = ny + 8; y < ny + 8 * TS - 4; y += 12) { R(ctx, '#8a94a0', nx + 4, y, 2, 2); R(ctx, '#8a94a0', nx + 3 * TS - 6, y, 2, 2); }
  R(ctx, '#0b0e12', nx + 3 * TS - 6, ny + 6, 6, 8 * TS - 12);
  for (const [fx] of TURB10.fans) {                  // fan pits: a housing in the floor and a guard grille
    R(ctx, '#0b0e12', fx - 22, 25 * TS, 44, 6); R(ctx, '#3a4652', fx - 24, 25 * TS, 4, 6); R(ctx, '#3a4652', fx + 20, 25 * TS, 4, 6);
    for (let i = 0; i < 11; i++) R(ctx, '#56646e', fx - 20 + i * 4, 25 * TS, 2, 1);
    R(ctx, '#e8b422', fx - 24, 25 * TS + 6, 48, 2); for (let i = 0; i < 6; i++) R(ctx, '#15161a', fx - 22 + i * 8, 25 * TS + 6, 4, 2);
  }
  xaBehind(ctx, () => {
    for (const [rx, ry] of TURB10.rotors) { R(ctx, '#1a2026', rx - 2, 2 * TS, 4, ry - 2 * TS); R(ctx, '#2a333c', rx - 1, 2 * TS, 1, ry - 2 * TS); }   // the rotors' struts
    for (let x = 6 * TS; x < 96 * TS; x += 2) { R(ctx, '#151a1f', x, 2 * TS + 4, 2, 3); if (x % 48 === 0) R(ctx, '#1e252c', x, 2 * TS + 2, 2, 9); }   // cable trays under the roof
    for (const [dx, dy] of [[40 * TS, 19 * TS], [60 * TS, 19 * TS], [12 * TS, 6 * TS], [88 * TS, 6 * TS]]) {   // dials and status panels
      R(ctx, '#121619', dx - 14, dy - 10, 28, 20); R(ctx, '#2a333c', dx - 13, dy - 9, 26, 18);
      for (let i = 0; i < 4; i++) R(ctx, i % 2 ? '#40ff80' : '#e8b422', dx - 10 + i * 6, dy + 4, 3, 2);
      R(ctx, '#0b0e12', dx - 8, dy - 6, 16, 8); R(ctx, '#40ff80', dx - 6, dy - 3, 12, 1);
    }
  });
  for (const x of [40 * TS, 53 * TS]) { R(ctx, '#121619', x + 4, 21 * TS + 6, 7 * TS - 8, 3 * TS); for (let i = 0; i < 5; i++) R(ctx, i % 2 ? '#c87a30' : '#ffb060', x + 10 + i * 18, 21 * TS + 12, 10, 3 * TS - 12); }   // generator windings
  drawGlyphs(ctx, 'T-10', 50 * TS - 11, 24 * TS - 2, '#e8b422');
}
const DECOR10 = {
  lamps: [[300, 66], [700, 74], [900, 74], [1300, 66]],
  beacons: [[5 * TS + 4, 3 * TS + 4], [5 * TS + 4, 11 * TS - 4], [35, 340], [1565, 340]],
  vents: [[26 * TS, 25 * TS], [74 * TS, 25 * TS]],
  glows: [[43 * TS, 23 * TS, 2.5, 0xffa040], [56 * TS, 23 * TS, 2.5, 0xffa040], [4 * TS, 7 * TS, 4, 0x80f0ff]],
};
function xaNoise(x, y, s, seed) {                    // smooth value noise for the storm clouds
  const ix = Math.floor(x / s), iy = Math.floor(y / s), u0 = x / s - ix, v0 = y / s - iy, u = u0 * u0 * (3 - 2 * u0), v = v0 * v0 * (3 - 2 * v0);
  const h = (a, b) => (hash2(a + seed * 131, b - seed * 71) & 1023) / 1023, a = h(ix, iy), b = h(ix + 1, iy), c = h(ix, iy + 1), d = h(ix + 1, iy + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function drawStormSky(flash) {                       // ARENA 08's night sky, dithered storm cloud over a city skyline; flash: the clouds lit
  const [w, h] = bgSize(BG.far), { c, ctx } = mkCanvas(w, h), img = ctx.createImageData(w, h), px = img.data;
  const deck = [[20, 27, 44], [29, 38, 62], [40, 52, 84], [56, 70, 108]], lit = [[90, 110, 160], [140, 160, 210], [190, 205, 240], [230, 238, 255]], bayer = [0, 0.5, 0.75, 0.25];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const t = y / h, n = xaNoise(x, y * 1.9, 96, 1) * 0.55 + xaNoise(x, y * 1.9, 36, 2) * 0.3 + xaNoise(x, y * 2.2, 13, 3) * 0.15;
    const cloud = clamp((n - 0.4) * 2.6, 0, 1) * (1 - t * 0.55), lv = Math.floor(cloud * 4 + bayer[(x & 1) + (y & 1) * 2]) - 1, i = (y * w + x) * 4;
    if (flash) { if (lv >= 1) { const [r, g, b] = lit[Math.min(3, lv)]; px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 60 + lv * 45; } continue; }
    let r = 4 + t * 12, g = 6 + t * 12, b = 12 + t * 24;
    if (lv >= 0) [r, g, b] = deck[Math.min(3, lv)];
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  if (flash) return c;
  let s = 23; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let x = 0; x < w;) {                          // the city on the horizon, a few windows still lit
    const bw = (12 + rnd() * 36) | 0, bh = (16 + rnd() * 64) | 0;
    R(ctx, '#05070b', x, h - bh, bw, bh); R(ctx, '#0b0f17', x, h - bh, bw, 1);
    for (let wy = h - bh + 4; wy < h - 4; wy += 5) for (let wx = x + 2; wx < x + bw - 2; wx += 4) if (rnd() < 0.09) R(ctx, rnd() < 0.6 ? '#c8a050' : '#6a8ac0', wx, wy, 1, 2);
    if (rnd() < 0.3) { R(ctx, '#05070b', x + (bw >> 1), h - bh - 12, 2, 12); R(ctx, '#ff3020', x + (bw >> 1), h - bh - 13, 2, 2); }
    x += bw + ((rnd() * 5) | 0);
  }
  for (let y = h - 34; y < h; y += 2) { ctx.fillStyle = `rgba(60,80,130,${(((y - (h - 34)) / 34) * 0.25).toFixed(3)})`; ctx.fillRect(0, y, w, 2); }   // rain haze low down
  return c;
}
function drawXaBackdrop(kind) {                     // a back wall for ARENAS 06, 07, 09 and 10, in place of the factory's (BG.mid parallax)
  const [w, h] = bgSize(BG.mid), { c, ctx } = mkCanvas(w, h), img = ctx.createImageData(w, h), px = img.data;
  const base = { tower: [20, 30, 34], vault: [30, 40, 54], crusher: [30, 24, 18], turbine: [20, 28, 32] }[kind];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {          // the wall itself: mottled, with fine grain
    const n = xaNoise(x, y, 40, 7) * 0.7 + xaNoise(x, y, 9, 8) * 0.3, g = (hash2(x, y) & 7) - 3.5, k = 0.8 + n * 0.45, i = (y * w + x) * 4;
    px[i] = base[0] * k + g; px[i + 1] = base[1] * k + g; px[i + 2] = base[2] * k + g; px[i + 3] = 255;
  }
  const cx = w / 2, discs = [[cx - 330, 150, 96], [cx, 180, 120], [cx + 330, 150, 96]];
  if (kind === 'turbine') for (const [tx, ty, r] of discs) for (let y = -r - 10; y <= r + 10; y++) for (let x = -r - 10; x <= r + 10; x++) {   // the great rotors of the turbines behind
    const d = Math.hypot(x, y), X = Math.round(tx + x), Y = ty + y; if (d > r + 10 || X < 0 || X >= w || Y < 0 || Y >= h) continue;
    let col;
    if (d > r) col = d > r + 7 ? [12, 16, 20] : [42, 52, 60];
    else if (d < r * 0.22) col = d < r * 0.1 ? [138, 148, 160] : [62, 72, 82];
    else { const a = ((Math.atan2(y, x) + Math.PI) / (Math.PI * 2) * 18 + d / r * 1.4) % 1; col = a < 0.55 ? (a < 0.12 ? [90, 102, 114] : [52, 64, 74]) : [20, 26, 32]; }
    const i = (Y * w + X) * 4; px[i] = col[0]; px[i + 1] = col[1]; px[i + 2] = col[2];
  }
  ctx.putImageData(img, 0, 0);
  if (kind === 'tower') {                            // the inside of a cooling tower: pour lines bowing round the drum, ribs, daylight from the top
    for (let a = -1.4; a <= 1.41; a += 0.2) {
      const x = Math.round(cx + Math.sin(a) * cx * 1.02), rw = Math.max(3, Math.round(16 * Math.cos(a)));
      R(ctx, '#121a1e', x - rw / 2, 0, rw, h); R(ctx, '#2a3c42', x + (a < 0 ? rw / 2 - 2 : -rw / 2), 0, 2, h);
    }
    for (let j = 0; j < 9; j++) for (let x = 0; x < w; x += 2) { const t = (x - cx) / cx, y = Math.round(30 + j * 46 + 26 * t * t); R(ctx, '#10181b', x, y, 2, 2); R(ctx, '#273840', x, y + 2, 2, 1); if (hash2(x, j) % 12 === 0) R(ctx, '#0e1518', x, y + 3, 1, 8 + hash2(j, x) % 30); }
    for (let r = 120; r > 0; r -= 4) { ctx.fillStyle = `rgba(150,215,225,${(0.012 + (120 - r) / 120 * 0.05).toFixed(3)})`; ctx.beginPath(); ctx.ellipse(cx, -10, r * 1.6, r * 0.55, 0, 0, Math.PI * 2); ctx.fill(); }
    for (let s = 0; s < 5; s++) { ctx.fillStyle = 'rgba(140,210,220,0.035)'; ctx.beginPath(); const x0 = cx - 80 + s * 40; ctx.moveTo(x0, 0); ctx.lineTo(x0 + 26, 0); ctx.lineTo(x0 + 70 + s * 14, h); ctx.lineTo(x0 + 20 + s * 14, h); ctx.fill(); }
    for (let y = h - 120; y < h; y += 2) { ctx.fillStyle = `rgba(90,170,180,${(((y - (h - 120)) / 120) * 0.12).toFixed(3)})`; ctx.fillRect(0, y, w, 2); }   // vapour off the basin
  } else if (kind === 'vault') {                     // a cold store: frosted panels, evaporator coils, a rail of hooks
    for (let py = 0; py < h; py += 40) for (let qx = 0; qx < w; qx += 48) {
      R(ctx, '#1a222e', qx, py, 48, 1); R(ctx, '#1a222e', qx, py, 1, 40);
      for (let i = 0; i < 48; i++) if (hash2(qx + i, py) % 3) R(ctx, '#6a88a4', qx + i, py + 1, 1, 1 + (hash2(i, py + qx) % 3));   // rime along the top edge
    }
    for (const cy of [96, 250]) {
      R(ctx, '#0e141c', 0, cy - 2, w, 30); for (let x = 0; x < w; x += 3) R(ctx, '#3a4a5c', x, cy, 1, 26);
      R(ctx, '#56708a', 0, cy - 2, w, 2); for (let x = 0; x < w; x++) if (hash2(x, cy) % 2) R(ctx, '#b8d8f0', x, cy - 3, 1, 1 + hash2(cy, x) % 2);
    }
    R(ctx, '#3a4452', 0, 40, w, 4); R(ctx, '#6a7686', 0, 40, w, 1);
    for (let x = 30; x < w; x += 46) {                                // hooks, a few still carrying frozen stock
      R(ctx, '#4a5462', x, 44, 1, 14); R(ctx, '#6a7686', x - 2, 57, 3, 1); R(ctx, '#6a7686', x - 3, 55, 1, 3);
      if (hash2(x, 5) % 3 === 0) { const ch = 34 + hash2(x, 9) % 16; R(ctx, '#2a1a1e', x - 7, 58, 14, ch); R(ctx, '#3a2428', x - 6, 58, 6, ch - 4); R(ctx, '#8aa8c0', x - 7, 58, 14, 1); R(ctx, '#20141a', x - 4, 58 + ch, 8, 4); }
    }
    for (let y = h - 90; y < h; y += 2) { ctx.fillStyle = `rgba(190,225,255,${(((y - (h - 90)) / 90) * 0.16).toFixed(3)})`; ctx.fillRect(0, y, w, 2); }   // cold fog on the floor
  } else if (kind === 'crusher') {                   // a compactor hall: bales of crushed scrap stacked to the gantry, warning stripes
    R(ctx, '#1a140e', 0, 34, w, 10); for (let x = 0; x < w; x += 24) R(ctx, '#2e241a', x, 34, 12, 10);
    for (let x = 0; x < w; x += 4) R(ctx, ((x >> 3) & 1) ? '#14120e' : '#5a4a14', x, 64, 4, 6);
    const metal = ['#3a3e44', '#4a3a30', '#2e3a44', '#4a4434', '#3a2a2a', '#344034'];
    for (let stack = 0; stack < 9; stack++) {
      const sx = 20 + stack * 124, rows = 3 + hash2(stack, 3) % 3;
      for (let r = 0; r < rows; r++) for (let b = 0; b < 3 - (r > 2 ? 1 : 0); b++) {
        const bx = sx + b * 30 + (r % 2) * 14, by = h - 26 - (r + 1) * 26, col = metal[hash2(stack * 7 + r, b) % metal.length];
        R(ctx, '#0c0a08', bx - 1, by - 1, 30, 26); R(ctx, col, bx, by, 28, 24);
        for (let i = 0; i < 9; i++) R(ctx, hash2(bx + i, by) % 2 ? '#1a1612' : '#6a6458', bx + hash2(i, bx) % 26, by + hash2(by, i) % 22, 2 + hash2(i, by) % 4, 1);   // crumpled panels
        R(ctx, '#8a8070', bx, by, 28, 1); R(ctx, '#5a5048', bx, by + 8, 28, 1); R(ctx, '#5a5048', bx, by + 16, 28, 1);   // baling wire
      }
    }
    for (let x = 60; x < w; x += 220) { R(ctx, '#120e0a', x, 44, 10, h); R(ctx, '#2a2218', x, 44, 2, h); }
  } else {                                           // the turbine hall: status lights under the rotors, ducts along the wall
    for (const [tx, ty, r] of discs) { R(ctx, '#40ff80', tx - 2, ty + r + 14, 4, 2); R(ctx, '#e8b422', tx + 8, ty + r + 14, 4, 2); }
    for (const y of [40, h - 70]) { R(ctx, '#161c22', 0, y, w, 12); R(ctx, '#2c3640', 0, y, w, 2); for (let x = 20; x < w; x += 90) R(ctx, '#3a4652', x, y - 2, 6, 16); }
  }
  ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = 'rgba(3,5,10,0.38)'; ctx.fillRect(0, 0, w, h);   // back, so the foreground reads
  return c;
}
const ICICLE_LEN = [6, 10, 14, 18, 23];
function drawIcicle(c, len) {                        // 7x24, hanging from its top: a tapered spike of blue ice with a bright edge
  for (let y = 0; y < len; y++) {
    const hw = Math.max(0, Math.round(3 * (1 - y / len) + 0.3)), x0 = 3 - hw;
    R(c, '#7ab4e0', x0, y, hw * 2 + 1, 1); R(c, '#d8f4ff', x0, y, 1, 1); if (hw > 0) R(c, '#4a80b8', 3 + hw, y, 1, 1);
    if (y % 5 === 2 && hw > 1) R(c, '#ffffff', x0 + 1, y, 1, 1);
  }
  R(c, '#ffffff', 2, 0, 3, 1);
}
function drawRotor(c) {                              // 64x64: three swept steel blades on a hub, hazard paint at the tips
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const dx = x + 0.5 - 32, dy = y + 0.5 - 32, r = Math.hypot(dx, dy);
    if (r < 5 || r > 30) continue;
    for (let b = 0; b < 3; b++) {
      const a = Math.atan2(dy, dx) - b * Math.PI * 2 / 3 - 0.18 * (r - 5) / 25, along = r * Math.cos(a), side = r * Math.sin(a), hw = 3.6 - 1.8 * (r - 5) / 25;
      if (along <= 0 || Math.abs(side) > hw) continue;
      R(c, r > 24 ? ((r >> 1) % 2 ? '#e8b422' : '#15161a') : side < -hw * 0.3 ? '#c8d0d8' : side > hw * 0.4 ? '#3e4652' : '#7f8b99', x, y);
    }
  }
}
function genExpansionArenaArt(scene) {               // the machinery of ARENAS 06-10
  addSheet(scene, 'xa_icicle', ICICLE_LEN.map((len, i) => ({ name: 'i' + i, c: makeSprite(7, 24, c => drawIcicle(c, len), '#14243a') })), 7, 24, false);
  addTex(scene, 'xa_rotor', makeSprite(64, 64, drawRotor));
  addTex(scene, 'xa_hub', makeSprite(14, 14, c => { for (let y = 0; y < 14; y++) for (let x = 0; x < 14; x++) { const d = Math.hypot(x + 0.5 - 7, y + 0.5 - 7); if (d < 6) R(c, d > 4.6 ? '#2a3038' : d < 1.6 ? '#c8d0d8' : (x + y) % 5 ? '#5a636e' : '#8a94a0', x, y); } }));
  addSheet(scene, 'xa_fan', [0, 1, 2].map(f => ({ name: 'f' + f, c: makeSprite(44, 6, c => {   // a floor fan seen edge-on in its pit, blades blurring past
    R(c, '#0b0e12', 0, 0, 44, 6); R(c, '#3a4652', 0, 4, 44, 2);
    for (let x = (f * 5) % 15; x < 44; x += 15) { R(c, '#8a94a0', x, 1, 6, 3); R(c, '#c8d0d8', x, 1, 6, 1); R(c, '#4b535e', x + 5, 1, 2, 3); }
    R(c, '#2a3038', 20, 0, 4, 6);
  }, null) })), 44, 6, false);
  addSheet(scene, 'xa_turbine', [0, 1, 2].map(f => ({ name: 't' + f, c: makeSprite(12, 124, c => {   // the turbine's rotor edge-on in the nacelle mouth
    R(c, '#0b0e12', 2, 0, 8, 124);
    for (let y = (f * 9) % 27; y < 124; y += 27) { R(c, '#8a94a0', 3, y, 6, 12); R(c, '#c8d0d8', 3, y, 2, 12); R(c, '#4b535e', 8, y, 1, 12); }
    R(c, '#5a636e', 1, 56, 10, 12); R(c, '#e8b422', 1, 61, 10, 2);
  }) })), 12, 124, false);
}
function xaLazyTex(scene, key) {                     // the big backdrops are painted the first time their arena is built, not at load
  if (!scene.textures.exists(key)) addTex(scene, key, key === 'xa_sky' ? drawStormSky(false) : key === 'xa_skyflash' ? drawStormSky(true) : drawXaBackdrop(key.slice(6)));
  return key;
}
// ---- end expansion: arenas ----
const ARENAS = [
  { id: 1, name: 'ARENA 01', sub: 'THE MELT FLOOR', grid: LEVEL_GRID, spawns: SPAWNS, points: WAVE_POINTS, decor: DECOR, barrels: BARRELS, canisters: CANISTERS, last: 1, pipes: [[32, 388, 1], [1568, 388, -1], [608, 388, -1], [912, 388, 1]] },
  { id: 2, name: 'ARENA 02', sub: 'THE FURNACE', grid: buildLevel2(), bgTint: 0xffb8a0, paint: paintFurnace, last: 3,
    spawns: { player: [4, 24], health: [[4, 12], [94, 12], [24, 13], [75, 13]] },
    points: { G: [[11, 24], [28, 24], [37, 24], [62, 24], [71, 24], [95, 24], [50, 18], [20, 16], [80, 16], [24, 13], [75, 13], [50, 9]],
              A: [[20, 8], [50, 6], [80, 8], [32, 12], [68, 12], [10, 15], [90, 15], [50, 14]], B: [[50, 18]] },
    decor: DECOR2, barrels: [[12, 24], [36, 24], [63, 24], [86, 24], [47, 18], [20, 16]], canisters: [[30, 24], [70, 24], [53, 18], [87, 16]],
    pipes: [[32, 388, 1], [1568, 388, -1], [368, 388, -1], [416, 388, 1], [1184, 388, -1], [1232, 388, 1]] },
  { id: 3, name: 'ARENA 03', sub: 'THE SORTING LINE', grid: buildLevel3(), bgTint: 0xb8d0ff, paint: paintSorting, last: 5, belts: BELTS3, presses: PRESSES3,
    spawns: { player: [4, 24], health: [[4, 10], [94, 10], [40, 12], [60, 12]] },
    points: { G: [[10, 24], [25, 24], [37, 24], [62, 24], [75, 24], [90, 24], [50, 20], [15, 16], [85, 16], [45, 12], [55, 12], [5, 10], [95, 10]],
              A: [[20, 8], [50, 6], [80, 8], [30, 12], [70, 12], [10, 14], [90, 14], [50, 16]], B: [[50, 20]] },
    decor: DECOR3, barrels: [[12, 24], [36, 24], [63, 24], [88, 24], [47, 20], [20, 16]], canisters: [[30, 24], [70, 24], [53, 20], [80, 16]],
    pipes: [[32, 388, 1], [1568, 388, -1], [704, 388, -1], [896, 388, 1]] },
  { id: 4, name: 'ARENA 04', sub: 'THE WRECKING YARD', grid: buildLevel4(), bgTint: 0xc8f0d0, paint: paintYard, last: 7,
    wrecker: { px: 50 * TS, py: 3 * TS, len: 12 * TS, amp: 0.95, period: 5.2 },
    spawns: { player: [4, 24], health: [[4, 8], [95, 8], [27, 18], [72, 18]] },
    points: { G: [[13, 20], [21, 24], [36, 24], [63, 24], [78, 24], [86, 20], [95, 24], [50, 17], [28, 18], [71, 18], [5, 8], [94, 8]],
              A: [[20, 8], [80, 8], [30, 14], [70, 14], [10, 12], [90, 12], [50, 8], [50, 14]], B: [[50, 17]] },
    decor: DECOR4, barrels: [[22, 24], [36, 24], [63, 24], [78, 24], [27, 18], [72, 18]], canisters: [[32, 24], [68, 24], [47, 17], [14, 20]],
    pipes: [[32, 388, 1], [1568, 388, -1]] },
  { id: 5, name: 'ARENA 05', sub: 'THE POWERHOUSE', grid: buildLevel5(), bgTint: 0xd0c8ff, paint: paintPower, last: 99, rails: RAILS5,
    spawns: { player: [4, 24], health: [[4, 9], [95, 9], [17, 14], [82, 14]] },
    points: { G: [[12, 24], [33, 24], [66, 24], [86, 24], [50, 16], [16, 19], [84, 19], [32, 19], [67, 19], [18, 14], [82, 14], [5, 9], [94, 9]],
              A: [[20, 8], [80, 8], [34, 10], [66, 10], [50, 6], [10, 13], [90, 13], [50, 13]], B: [[50, 16]] },
    decor: DECOR5, barrels: [[14, 24], [35, 24], [64, 24], [85, 24], [18, 14], [82, 14]], canisters: [[30, 24], [70, 24], [48, 16], [20, 19]],
    pipes: [[32, 388, 1], [1568, 388, -1]] },
  // ---- expansion: arenas ---- (OVERTIME, DAILY and the Lab only; last: 99 keeps BOSS RUSH from riding on to them)
  { id: 6, name: 'ARENA 06', sub: 'THE COOLING TOWER', grid: buildLevel6(), bgTint: 0x98d8d8, paint: paintTower, last: 99, backdrop: 'tower', flood: FLOOD6, lampTint: 0x9af0ff,
    spawns: { player: [4, 24], health: [[4, 12], [95, 12], [50, 16], [50, 8]] },
    points: { G: [[10, 24], [25, 24], [40, 24], [60, 24], [75, 24], [92, 24], [7, 20], [30, 20], [70, 20], [92, 20], [50, 16], [12, 16], [87, 16], [18, 12], [82, 12], [50, 8]],
              A: [[20, 9], [50, 5], [80, 9], [36, 12], [64, 12], [12, 15], [88, 15], [50, 14]], B: [[50, 16]] },
    decor: DECOR6, barrels: [[12, 24], [36, 24], [63, 24], [86, 24], [47, 16], [24, 16]], canisters: [[29, 24], [71, 24], [53, 16], [75, 16]],
    pipes: [[32, 388, 1], [1568, 388, -1]] },
  { id: 7, name: 'ARENA 07', sub: 'THE CHILL VAULT', grid: GRID7, bgTint: 0xc8e4ff, paint: paintVault, last: 99, backdrop: 'vault', vault: VAULT7, lampTint: 0xd0f0ff,
    spawns: { player: [4, 24], health: [[4, 12], [95, 12], [50, 20], [50, 8]] },
    points: { G: [[10, 24], [24, 24], [39, 24], [60, 24], [76, 24], [92, 24], [50, 20], [13, 16], [86, 16], [32, 12], [67, 12], [5, 12], [94, 12], [50, 8]],
              A: [[20, 6], [50, 5], [80, 6], [30, 10], [70, 10], [12, 14], [88, 14], [50, 16]], B: [[50, 20]] },
    decor: DECOR7, barrels: [[16, 24], [42, 24], [58, 24], [84, 24], [14, 16], [33, 12]], canisters: [[28, 24], [72, 24], [52, 20], [66, 12]],
    pipes: [[32, 388, 1], [1568, 388, -1]] },
  { id: 8, name: 'ARENA 08', sub: 'THE STORM ROOF', grid: buildLevel8(), bgTint: 0x7888b8, paint: paintStorm, last: 99, storm: STORM8,
    spawns: { player: [4, 24], health: [[3, 12], [96, 12], [38, 12], [50, 8]] },
    points: { G: [[17, 24], [29, 24], [46, 24], [58, 24], [76, 24], [89, 24], [10, 20], [37, 20], [84, 20], [24, 21], [65, 20], [38, 12], [50, 12], [65, 12], [92, 16], [50, 8]],
              A: [[14, 8], [28, 10], [40, 6], [56, 6], [76, 8], [86, 12], [22, 14], [80, 15]], B: [[84, 20]] },
    decor: DECOR8, barrels: [[18, 24], [45, 24], [57, 24], [78, 24], [8, 20], [84, 20]], canisters: [[28, 24], [69, 24], [41, 20], [66, 16]],
    pipes: [] },
  { id: 9, name: 'ARENA 09', sub: 'THE CRUSHER', grid: buildLevel9(), bgTint: 0xffe0a0, paint: paintCrusher, last: 99, backdrop: 'crusher', crusher: CRUSH9, lampTint: 0xffb040,
    spawns: { player: [4, 24], health: [[50, 20], [50, 4], [40, 16], [59, 16]] },
    points: { G: [[10, 24], [22, 24], [36, 24], [64, 24], [78, 24], [90, 24], [50, 20], [40, 16], [59, 16], [28, 16], [71, 16], [50, 12], [39, 8], [60, 8], [50, 4]],
              A: [[20, 6], [50, 8], [80, 6], [36, 12], [64, 12], [12, 15], [88, 15], [50, 16]], B: [[50, 20]] },
    decor: DECOR9, barrels: [[36, 24], [63, 24], [45, 20], [54, 20], [39, 8], [60, 8]], canisters: [[41, 24], [58, 24], [42, 16], [57, 16]],
    pipes: [] },
  { id: 10, name: 'ARENA 10', sub: 'THE TURBINE HALL', grid: buildLevel10(), bgTint: 0xd8f0e0, paint: paintTurbine, last: 99, backdrop: 'turbine', turbine: TURB10, lampTint: 0xc0ffe0,
    spawns: { player: [4, 24], health: [[4, 12], [95, 12], [50, 4], [50, 16]] },
    points: { G: [[10, 24], [26, 24], [36, 24], [64, 24], [74, 24], [90, 24], [43, 20], [56, 20], [26, 16], [40, 16], [59, 16], [73, 16], [20, 12], [79, 12], [28, 8], [71, 8]],
              A: [[20, 6], [50, 7], [80, 6], [33, 11], [67, 11], [12, 15], [88, 15], [50, 14]], B: [[27, 24]] },
    decor: DECOR10, barrels: [[11, 24], [37, 24], [62, 24], [89, 24], [41, 20], [58, 20]], canisters: [[27, 24], [73, 24], [24, 16], [75, 16]],
    pipes: [[32, 388, 1], [1568, 388, -1]] },
];
// Where each arena keeps its breakables: [kind, tile x, tile y, facing]. Floor props stand in that cell, wall props
// centre on it and hanging ones dangle there from whatever is overhead. ARENA 01 has one of each.
const PROP_SPOTS = [
  [['neon', 50, 4], ['window', 18, 5], ['tube', 25, 7], ['horn', 22, 8], ['ladle', 58, 9], ['fan', 8, 19], ['fuse', 36, 22], ['water', 33, 24],
   ['capacitor', 66, 24], ['propane', 24, 24], ['toxic', 60, 16], ['cryo', 31, 16], ['oil', 85, 24], ['vending', 61, 24, -1], ['terminal', 41, 20],
   ['ammo', 70, 20], ['flares', 21, 20], ['ext', 55, 19], ['flood', 7, 12], ['boiler', 89, 24, -1]],
  [['ladle', 39, 12], ['ladle', 60, 12, -1], ['boiler', 16, 24], ['propane', 38, 24], ['oil', 61, 24], ['fan', 5, 18], ['fuse', 27, 20], ['water', 20, 24],
   ['capacitor', 68, 24], ['ext', 40, 20], ['tube', 12, 11], ['flood', 96, 12, -1], ['ammo', 82, 20], ['vending', 93, 24, -1], ['cryo', 79, 24]],
  [['terminal', 45, 20], ['window', 25, 5], ['horn', 49, 4], ['neon', 50, 9], ['capacitor', 38, 24], ['fuse', 59, 21], ['water', 60, 24], ['fan', 3, 15],
   ['fan', 96, 15, -1], ['vending', 37, 12], ['tube', 44, 15], ['tube', 56, 15], ['ext', 32, 15], ['flood', 8, 10], ['flares', 93, 20], ['ammo', 5, 20]],
  [['oil', 25, 24], ['propane', 34, 24], ['toxic', 66, 24], ['ammo', 60, 24], ['flares', 39, 24], ['vending', 30, 18], ['water', 69, 18], ['fuse', 66, 15],
   ['fan', 3, 13], ['flood', 6, 8], ['horn', 22, 5], ['ext', 40, 15], ['tube', 64, 6], ['cryo', 88, 20], ['capacitor', 12, 20]],
  [['water', 17, 24], ['water', 95, 24], ['capacitor', 38, 24], ['capacitor', 61, 24], ['terminal', 50, 16], ['fuse', 13, 21], ['fuse', 94, 21, -1], ['neon', 50, 5],
   ['window', 25, 6], ['horn', 31, 8], ['tube', 47, 11], ['tube', 52, 11], ['cryo', 15, 14], ['ext', 60, 18], ['vending', 80, 14], ['fan', 3, 13]],
  // ---- expansion: arenas ---- ARENAS 06-10
  [['terminal', 50, 16], ['horn', 3, 10], ['water', 40, 24], ['cryo', 58, 24], ['capacitor', 19, 20], ['tube', 12, 18], ['tube', 87, 18], ['ext', 43, 22],
   ['flood', 6, 12], ['flood', 93, 12, -1], ['window', 50, 11], ['vending', 30, 12], ['ammo', 70, 12], ['oil', 17, 24], ['propane', 83, 24],
   ['transformer', 36, 15], ['server', 69, 20], ['sprinkler', 64, 15], ['vat', 88, 16, -1]],
  [['cryo', 30, 24], ['cryo', 70, 24], ['cryo', 47, 20], ['vending', 53, 20, -1], ['terminal', 4, 12], ['flares', 95, 12], ['tube', 18, 14], ['tube', 80, 14],
   ['fan', 3, 19], ['fan', 96, 19, -1], ['ext', 44, 23], ['horn', 50, 6], ['water', 60, 24], ['ammo', 24, 16], ['neon', 50, 3],
   ['gasline', 40, 19], ['hopper', 60, 19], ['jukebox', 7, 20], ['paint', 91, 20]],
  [['neon', 65, 6], ['flood', 13, 20], ['flood', 86, 20, -1], ['capacitor', 49, 16], ['fuse', 16, 23], ['water', 55, 24], ['propane', 30, 24], ['oil', 46, 24],
   ['horn', 53, 11], ['terminal', 82, 20], ['ammo', 95, 20], ['tube', 64, 18], ['flares', 4, 16],
   ['hydrant', 20, 24], ['transformer', 28, 14], ['server', 66, 12, -1], ['sprinkler', 76, 14]],
  [['terminal', 49, 20], ['capacitor', 51, 20], ['ammo', 39, 16], ['flares', 60, 16], ['oil', 34, 24], ['propane', 65, 24], ['water', 38, 24], ['toxic', 61, 24],
   ['fuse', 43, 22], ['fuse', 56, 22, -1], ['horn', 50, 10], ['window', 50, 16], ['tube', 46, 14], ['tube', 54, 14], ['neon', 50, 3],
   ['vat', 43, 24], ['jukebox', 56, 24, -1], ['gasline', 36, 14], ['hopper', 63, 14]],
  [['fan', 96, 6, -1], ['capacitor', 43, 20], ['capacitor', 56, 20], ['terminal', 4, 12], ['flares', 95, 12], ['boiler', 92, 24], ['oil', 8, 24], ['fuse', 38, 22],
   ['fuse', 61, 22, -1], ['tube', 26, 18], ['tube', 73, 18], ['horn', 20, 6], ['window', 50, 11], ['ammo', 28, 8], ['propane', 72, 8], ['vending', 33, 24],
   ['hoist', 40, 15], ['hydrant', 68, 24], ['paint', 6, 20], ['transformer', 88, 16]],
];
ARENAS.forEach((A, i) => { A.props = PROP_SPOTS[i] || []; });
const CAMPAIGN_ARENAS = [
  ...ARENAS.slice(0, 3),
  { ...ARENAS[3], grid: buildLevel4(true) },
  { ...ARENAS[4], grid: buildLevel5(true), spawns: { ...ARENAS[4].spawns, player: [3, 24] } },
];

// Lab layouts share the normal world, collision, prop and enemy systems.
function buildLabArena(variant) {
  const grid = Array.from({ length: MAP_H }, (_, y) =>
    Array.from({ length: MAP_W }, (_, x) => y < 2 || y >= 25 || x < 2 || x >= 98 ? '#' : '.'));
  const fill = (x, y, w, h, tile) => { for (let row = y; row < y + h; row++) grid[row].fill(tile, x, x + w); };
  const workshop = variant === 'breakables', traversal = variant === 'traversal';
  if (workshop) {
    fill(22, 23, 3, 2, 'x'); fill(42, 20, 2, 5, '#'); fill(44, 20, 8, 1, 'g'); fill(52, 20, 2, 5, '#');
    fill(58, 17, 36, 1, '#'); fill(54, 21, 4, 1, '='); fill(62, 7, 3, 1, '#');   // the upper deck, a step up to it, and a beam over it for the hoist
  }
  if (traversal) {
    fill(14, 21, 6, 1, '='); fill(21, 17, 6, 1, '='); fill(28, 13, 6, 1, '=');
    fill(36, 12, 2, 13, '#'); fill(43, 12, 2, 13, '#'); fill(45, 12, 8, 1, '=');
    fill(59, 16, 6, 1, '='); fill(70, 20, 7, 1, '='); fill(83, 21, 9, 4, '#');
    fill(54, 9, 5, 1, '#'); fill(66, 12, 4, 1, '#'); // grapple anchors above the gaps
  }
  const columns = [13, 17, 28, 33, 39, 48, 56, 62, 68, 78, 82, 94];
  return {
    id: 0, grid, spawns: { player: [6, 24], health: [[4, 24], [94, 24]] },
    points: { G: columns.filter(x => grid[24][x] === '.' && grid[23][x] === '.').map(x => [x, 24]) },
    decor: { lamps: [[156, 165], [394, 128], [702, 150], [972, 130], [1350, 148]], beacons: [[52, 356], [1544, 356]], vents: [] },
    props: workshop ? [['propane', 16, 24], ['oil', 27, 24], ['water', 34, 24], ['capacitor', 38, 24],
      ['ladle', 48, 21], ['terminal', 57, 24], ['cryo', 63, 24], ['vending', 69, 24], ['boiler', 76, 24],
      ['hydrant', 59, 16], ['hoist', 63, 11], ['server', 67, 16], ['transformer', 68, 12], ['jukebox', 72, 16], ['vat', 78, 16],
      ['hopper', 82, 11], ['paint', 86, 16], ['sprinkler', 89, 10], ['gasline', 92, 15, -1]] : [],
    barrels: workshop ? [[12, 24], [31, 24], [82, 24]] : [], canisters: workshop ? [[18, 24], [86, 24]] : [],
    pipes: workshop ? [[32, 388, 1], [1568, 388, -1]] : [],
    paint(ctx) {
      for (let x = 96; x < 1510; x += 64) {
        R(ctx, '#cf904e', x, 402, 1, (x - 96) % 256 ? 4 : 8);
        if ((x - 96) % 256 === 0) drawGlyphs(ctx, String(x - 96), x + 5, 404, '#ffd59a');
      }
    },
  };
}
const LAB_RANGE = buildLabArena('range');
const LAB_ROOMS = {
  range: { name: 'Firing Range', detail: 'A clear sightline, marked distances and stationary ground and air targets.',
    arena: LAB_RANGE, weapon: 'nail', stationary: true, invulnerable: true, groups: [{ kind: 'grunt', count: 3 }, { kind: 'drone', count: 1 }] },
  encounter: { name: 'Combat Pit', detail: 'Mix enemy types and elites in an open arena. Add groups to build a fight.',
    arena: LAB_RANGE, weapon: 'shotgun', groups: [{ kind: 'grunt', count: 3 }, { kind: 'enforcer', count: 1 }, { kind: 'heavy', count: 1 }, { kind: 'drone', count: 2 }] },
  breakables: { name: 'Breakables Bay', detail: 'Set off drums, fluids and a hanging ladle, then climb to the deck for the heavy kit. Shoot out a girder or stack of crates.',
    arena: buildLabArena('breakables'), weapon: 'rocket', invulnerable: true, groups: [] },
  traversal: { name: 'Traversal Course', detail: 'Climb staggered grates, wall-jump up the shaft and grapple across the gaps.',
    arena: buildLabArena('traversal'), weapon: 'nail', invulnerable: true, groups: [] },
  machinery: { name: 'Machinery Floor', detail: 'Ride the Sorting Line belts and cross the presses with or without enemies.',
    arena: ARENAS[2], weapon: 'rail', groups: [] },
  furnace: { name: 'Furnace Vents', detail: 'Watch for the vent warnings and use the catwalk to get above the jets.',
    arena: ARENAS[1], weapon: 'flare', groups: [] },
  yard: { name: 'Wrecking Yard', detail: 'Cross the swinging ball and use its impact against enemies or scenery.',
    arena: ARENAS[3], weapon: 'tractor', groups: [] },
  rails: { name: 'Live Rails', detail: 'Cross the Powerhouse while sections of the floor charge in sequence.',
    arena: ARENAS[4], weapon: 'coil', groups: [] },
  bosses: { name: 'Boss Chamber', detail: 'Practice one boss at a time. Change the enemy group to pick a different boss.',
    arena: LAB_RANGE, weapon: 'rail', groups: [{ kind: 'boss', count: 1 }] },
  // ---- expansion: arenas ----
  tower: { name: 'Cooling Tower', detail: 'Climb clear of the coolant floods. When a cable drops in, the water goes live until it drains.',
    arena: ARENAS[5], weapon: 'arc', groups: [] },
  vault: { name: 'Chill Vault', detail: 'Slide on the ice, read the icicle shadows and shoot them down onto enemies. Cryo vents puff frost.',
    arena: ARENAS[6], weapon: 'flame', groups: [] },
  storm: { name: 'Storm Roof', detail: 'Lightning hits the marked spots, most often up high. Get behind cover when the gust streaks blow in.',
    arena: ARENAS[7], weapon: 'shock', groups: [] },
  crusher: { name: 'Crusher', detail: 'Get off the floor or into the middle before the walls close. Anything caught against an anvil is crushed.',
    arena: ARENAS[8], weapon: 'hammer', groups: [] },
  turbine: { name: 'Turbine Hall', detail: 'Ride the fan updrafts, lean into the turbine gusts and cross the rotors while they idle.',
    arena: ARENAS[9], weapon: 'saw', groups: [] },
};
const LAB_MODIFIERS = { none: 'None', dark: 'Blackout', slag: 'Slag Rain', lowg: 'Low Gravity', melt: 'Meltdown' };
const LAB_BOSSES = new Set(RUSH.map(([entry]) => entry[0]));
const LAB_ENEMIES = [...CODEX.map(([id, name]) => ({ id, name })),
  { id: 'slagmid', name: 'SLAGLING HALF' }, { id: 'slagbit', name: 'SLAGLING BIT' }, { id: 'eggsac', name: 'EGG SAC' }, { id: 'eyenode', name: 'SHIELD NODE' }]
  .sort((a, b) => a.name.localeCompare(b.name));
const LAB_MAX_ENEMIES = 16;

function labConfig(room = 'range', options = {}) {
  if (!Object.hasOwn(LAB_ROOMS, room)) throw new RangeError('Unknown Lab room: ' + room);
  const preset = LAB_ROOMS[room];
  const { weapon = preset.weapon, difficulty = 1, modifier = 'none', stationary = !!preset.stationary,
    invulnerable = !!preset.invulnerable, groups = preset.groups } = options;
  if (weaponSlot(weapon) < 0) throw new RangeError('Unknown weapon: ' + weapon);
  if (!Number.isInteger(difficulty) || !DIFFS[difficulty]) throw new RangeError('Choose a difficulty from 0 to 2.');
  if (!Object.hasOwn(LAB_MODIFIERS, modifier)) throw new RangeError('Unknown modifier: ' + modifier);
  if (typeof stationary !== 'boolean' || typeof invulnerable !== 'boolean') throw new TypeError('Stationary and invulnerable must be booleans.');
  if (!Array.isArray(groups) || groups.length > LAB_MAX_ENEMIES) throw new RangeError('Use at most ' + LAB_MAX_ENEMIES + ' enemy groups.');
  let total = 0, bosses = 0;
  const roster = Array.from(groups, group => {
    const { kind, count = 1, elite = null } = group || {};
    if (!LAB_ENEMIES.some(e => e.id === kind)) throw new RangeError('Unknown Lab enemy: ' + kind);
    if (!Number.isInteger(count) || count < 1 || count > LAB_MAX_ENEMIES) throw new RangeError('Set each group count from 1 to ' + LAB_MAX_ENEMIES + '.');
    if (elite !== null && (!ELITE_KINDS.includes(elite) || NO_ELITE.has(kind) || ENEMY[kind].tiny)) throw new RangeError('Invalid elite for ' + kind + '.');
    total += count; if (LAB_BOSSES.has(kind)) bosses += count;
    return { kind, count, elite };
  });
  if (total > LAB_MAX_ENEMIES) throw new RangeError('A room can start with up to ' + LAB_MAX_ENEMIES + ' enemies.');
  if (bosses > 1) throw new RangeError('A room can start with one boss.');
  return { room, weapon, difficulty, modifier, stationary, invulnerable, groups: roster };
}

function labSpawns(config) {
  const A = LAB_ROOMS[config.room].arena, used = [];
  const floor = A.grid.flatMap((row, y) => row.flatMap((cell, x) => cell === '.' && /[#=gx]/.test(A.grid[y + 1]?.[x] || '') ? [[x, y]] : []));
  const air = A.grid.flatMap((row, y) => y > 3 && y < 23 ? row.flatMap((cell, x) => cell === '.' && x % 3 === 1 && y % 3 === 2 ? [[x, y]] : []) : []);
  const props = [...A.barrels, ...A.canisters, ...A.props.map(([, x, y]) => [x, y])];
  return config.groups.flatMap(({ kind, count, elite }) => Array.from({ length: count }, () => {
    const D = ENEMY[kind], flying = !!D.flier, radius = Math.ceil((D.fw - TS) / (TS * 2));
    const preferred = LAB_BOSSES.has(kind) ? 21 : 12 + 4 * used.length;
    const fits = ([x, y]) => {
      const top = y - Math.ceil((flying ? D.fh / 2 : D.fh) / TS), bottom = flying ? y + Math.floor(D.fh / (TS * 2)) : y;
      for (let row = top; row <= bottom; row++) for (let col = x - radius; col <= x + radius; col++) if (A.grid[row]?.[col] !== '.') return false;
      return Math.abs(x - A.spawns.player[0]) >= 5 &&
        !props.some(([px, py]) => Math.abs(px - x) <= radius + 1 && Math.abs(py - y) <= 1) &&
        !used.some(([px, py, r]) => Math.abs(px - x) < r + radius + 2 && Math.abs(py - y) < 4);
    };
    const score = ([x, y]) => Math.abs(x - preferred) + Math.abs(y - (flying ? 20 : 24)) * 2;
    const cell = (flying ? air : floor).filter(fits).sort((a, b) => score(a) - score(b))[0];
    if (!cell) throw new RangeError('This room has no free spawn point for ' + kind + '.');
    used.push([...cell, radius]);
    return { kind, cell, flying, elite };
  }));
}
function mergeRects(grid, ch, rowsOnly) {        // greedy-merge tiles into few static bodies (no seams to snag on)
  const H = grid.length, W = grid[0].length, used = grid.map(r => r.map(() => false)), out = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (grid[y][x] !== ch || used[y][x]) continue;
    let w = 1; while (x + w < W && grid[y][x + w] === ch && !used[y][x + w]) w++;
    let h = 1;
    while (!rowsOnly && y + h < H) {
      let ok = true;
      for (let i = 0; i < w; i++) if (grid[y + h][x + i] !== ch || used[y + h][x + i]) { ok = false; break; }
      if (!ok) break; h++;
    }
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) used[y + j][x + i] = true;
    out.push({ x, y, w, h });
  }
  return out;
}
// ---- platform navigation graph (humanoid pathfinding) ------------------------------
// Nodes: empty cells with floor (solid or grating) underneath and headroom above.
// Edges: walk, drop off a ledge, drop through a grating, and jumps whose arc is clearance-checked
// (up-jumps rise straight then cross above the target's level; gap hops stay low then fall).
function buildNav(grid) {
  const H = grid.length, W = grid[0].length;
  const cell = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? '#' : grid[y][x]);
  const solid = (x, y) => { const c = cell(x, y); return c === '#' || c === 'x' || c === 'g'; };
  const stand = (x, y) => cell(x, y) === '.' && !solid(x, y - 1) && cell(x, y + 1) !== '.';
  const nodes = [], ids = new Int32Array(W * H).fill(-1);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (stand(x, y)) { ids[y * W + x] = nodes.length; nodes.push({ x, y, edges: [] }); }
  const id = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? -1 : ids[y * W + x]);
  const span = (x0, x1, fn) => { const s = Math.sign(x1 - x0); for (let i = 0; i <= Math.abs(x1 - x0); i++) if (!fn(x0 + s * i)) return false; return true; };
  const clearUp = (x0, y0, x1, y1) => {
    for (let y = y0 - 1; y >= y1 - 2; y--) if (solid(x0, y)) return false;
    return span(x0, x1, x => { for (let y = y1 - 2; y <= y1; y++) if (solid(x, y)) return false; return true; });
  };
  const clearAcross = (x0, y0, x1, y1) => {
    if (!span(x0, x1, x => { for (let y = y0 - 2; y <= y0; y++) if (solid(x, y)) return false; return true; })) return false;
    for (let y = y0; y <= y1; y++) if (solid(x1, y)) return false;
    return true;
  };
  for (const n of nodes) {
    const { x, y } = n;
    for (const d of [-1, 1]) {
      const w = id(x + d, y);
      if (w >= 0) { n.edges.push({ to: w, type: 'walk', cost: 1 }); continue; }
      if (solid(x + d, y) || solid(x + d, y - 1)) continue;
      for (let yy = y + 1; yy < H; yy++) {
        if (solid(x + d, yy)) break;
        const m = id(x + d, yy); if (m >= 0) { n.edges.push({ to: m, type: 'drop', cost: 1.2 + (yy - y) * 0.25 }); break; }
      }
    }
    if (cell(x, y + 1) === '=') for (let yy = y + 2; yy < H; yy++) {
      if (solid(x, yy)) break;
      const m = id(x, yy); if (m >= 0) { n.edges.push({ to: m, type: 'fall', cost: 1.5 + (yy - y) * 0.25 }); break; }
    }
    for (let dy = -4; dy <= 6; dy++) for (let dx = -5; dx <= 5; dx++) {
      if ((dx === 0 && dy >= 0) || (dy === 0 && Math.abs(dx) === 1)) continue;
      if (dy > 2 && Math.abs(dx) > 3) continue;                         // a longer drop: step off and drift up to three columns
      const m = id(x + dx, y + dy); if (m < 0) continue;
      if (dy >= 0) {                                       // only hop where there's an actual gap
        let gap = false;
        for (let i = 1; i < Math.abs(dx); i++) if (id(x + Math.sign(dx) * i, y) < 0) gap = true;
        if (!gap || !clearAcross(x, y, x + dx, y + dy)) continue;
      } else if (!clearUp(x, y, x + dx, y + dy)) continue;
      const cost = 2 + Math.abs(dx) * 0.5 + Math.max(0, -dy) * 0.8;
      n.edges.push(dy > 2 ? { to: m, type: 'jump', cost: Infinity, playerCost: cost } : { to: m, type: 'jump', cost });
    }
    // Moves only the player makes: the longer drops above (dy 3-6) and wall climbs. Holding into a wall and jumping
    // again off it climbs any unbroken face, so the player can scale a wall too tall to jump and step onto its top.
    // These edges cost Infinity, so enemy pathing never takes them; playerCost prices them for the player. With them,
    // every standing cell can reach the arena's start and get back (run.mjs checks). The campaign bot plans with
    // them too (#154).
    for (const d of [-1, 1]) {
      if (!solid(x + d, y) || !solid(x + d, y - 1)) continue;
      let t = y - 1;
      while (solid(x + d, t) && !solid(x, t)) t--;
      if (solid(x, t) || solid(x, t - 1) || y - t < 5) continue;
      const m = id(x + d, t); if (m < 0) continue;
      n.edges.push({ to: m, type: 'climb', cost: Infinity, playerCost: 2 + (y - t) * 0.6 });
    }
  }
  return { nodes, id, solid };
}
function heapPush(h, it) {
  h.push(it);
  for (let i = h.length - 1; i > 0;) { const p = (i - 1) >> 1; if (h[p][0] <= h[i][0]) break; [h[p], h[i]] = [h[i], h[p]]; i = p; }
}
function heapPop(h) {
  const top = h[0], last = h.pop();
  if (h.length) {
    h[0] = last;
    for (let i = 0; ;) {
      const l = 2 * i + 1, r = l + 1; let m = i;
      if (l < h.length && h[l][0] < h[m][0]) m = l;
      if (r < h.length && h[r][0] < h[m][0]) m = r;
      if (m === i) break; [h[m], h[i]] = [h[i], h[m]]; i = m;
    }
  }
  return top;
}
// Dijkstra over NAV; goal = -1 explores everything within maxCost (used to score candidate positions).
function navDijkstra(start, goal, maxCost, edgeCost) {
  // Float64 on purpose: float32 rounding made `d > dist[u]` drop valid entries.
  const N = NAV.nodes.length, dist = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), prevE = new Array(N);
  const done = new Uint8Array(N), heap = [[0, start]], reached = [];
  dist[start] = 0;
  while (heap.length) {
    const [d, u] = heapPop(heap);
    if (done[u] || d > dist[u]) continue;
    done[u] = 1; reached.push(u);
    if (u === goal) break;
    for (const ed of NAV.nodes[u].edges) {
      const nd = d + (edgeCost ? edgeCost(u, ed) : ed.cost);
      if (nd < dist[ed.to] && nd <= maxCost) { dist[ed.to] = nd; prev[ed.to] = u; prevE[ed.to] = ed; heapPush(heap, [nd, ed.to]); }
    }
  }
  return { dist, prev, prevE, reached };
}
function navPath(res, goal) {
  const out = [];
  for (let v = goal; res.prev[v] >= 0; v = res.prev[v]) out.push({ to: v, from: res.prev[v], type: res.prevE[v].type });
  return out.reverse();
}
function navAt(x, feetY) {                        // node an actor is standing on (tolerates straddling a cell edge)
  const ty = Math.floor((feetY - 2) / TS);
  for (const ox of [0, -5, 5]) { const m = NAV.id(Math.floor((x + ox) / TS), ty); if (m >= 0) return m; }
  return -1;
}
function navBelow(x, y, rows = 12) {              // first node straight down from a point (airborne targets)
  const tx = Math.floor(x / TS);
  for (let ty = Math.floor(y / TS), r = 0; r < rows; r++, ty++) {
    const m = NAV.id(tx, ty); if (m >= 0) return m;
    if (NAV.solid(tx, ty)) break;
  }
  return -1;
}
function drawLevelArt(grid, decor = DECOR, paint = null) {
  const { c, ctx } = mkCanvas(LW, LH);
  const solid = (x, y) => x < 0 || y < 0 || x >= MAP_W || y >= MAP_H || grid[y][x] === '#';
  for (let ty = 0; ty < MAP_H; ty++) for (let tx = 0; tx < MAP_W; tx++) {
    const ch = grid[ty][tx], x = tx * TS, y = ty * TS, h = hash2(tx, ty);
    if (ch === '#') {
      const up = !solid(tx, ty - 1), dn = !solid(tx, ty + 1), lf = !solid(tx - 1, ty), rt = !solid(tx + 1, ty);
      const deep = !(up || dn || lf || rt) && solid(tx, ty - 2) && solid(tx, ty + 2) && solid(tx - 2, ty) && solid(tx + 2, ty);
      const base = deep ? '#181b21' : '#272c34', plate = deep ? '#1e2128' : '#323843', hi = deep ? '#252a31' : '#434a57', sh = deep ? '#101216' : '#1c2026';
      R(ctx, base, x, y, 16, 16); R(ctx, plate, x + 1, y + 1, 14, 14);
      R(ctx, hi, x + 1, y + 1, 14, 1); R(ctx, hi, x + 1, y + 1, 1, 14); R(ctx, sh, x + 1, y + 14, 14, 1); R(ctx, sh, x + 14, y + 1, 1, 14);
      const v = h % 11;
      if (v === 0 || v === 5) for (let i = 0; i < 4; i++) { R(ctx, '#0f1114', x + 4, y + 4 + i * 2, 8, 1); }
      else if (v === 3) for (let i = 0; i < 10; i++) { R(ctx, sh, x + 3 + i, y + 3 + i); R(ctx, sh, x + 12 - i, y + 3 + i); }
      else if (v === 7 && !deep) { R(ctx, '#2c2218', x + 3, y + 8, 6, 3); R(ctx, '#3a2a18', x + 4, y + 9, 3, 1); }
      if (h % 3 !== 0) for (const [rx, ry] of [[3, 3], [12, 3], [3, 12], [12, 12]]) { R(ctx, deep ? '#2a2f37' : '#4c5562', x + rx, y + ry); R(ctx, '#0e1013', x + rx, y + ry + 1); }
      if (up) {
        R(ctx, '#7f8b99', x, y, 16, 1); R(ctx, '#5a6574', x, y + 1, 16, 1); R(ctx, '#3d4550', x, y + 2, 16, 1);
        if ((h >> 4) % 4 === 0) for (let r = 3; r < 5; r++) for (let i = 0; i < 16; i++) R(ctx, (((x + i + r) >> 2) & 1) ? '#16171a' : '#b8931f', x + i, y + r);
      }
      if (dn) { R(ctx, '#14161a', x, y + 14, 16, 1); R(ctx, '#0c0d10', x, y + 15, 16, 1); }
      if (lf) R(ctx, '#454e5a', x, y, 1, 16);
      if (rt) R(ctx, '#121418', x + 15, y, 1, 16);
    } else if (ch === '=') drawGrating(ctx, x, y, grid[ty][tx - 1] !== '=', grid[ty][tx + 1] !== '=');
    else if (ch === 'g') drawGirder(ctx, x, y, grid[ty][tx - 1] !== 'g', grid[ty][tx + 1] !== 'g');
    else if (ch === 'x') drawCrate(ctx, x, y, h);
  }
  if (paint) paint(ctx);
  for (const [lx, ly] of decor.lamps) for (let y = 2 * TS; y < ly - 3; y++) R(ctx, (y >> 1) % 2 ? '#2a2e35' : '#4a525c', lx, y);   // chains
  for (const [bx, by] of decor.beacons) { R(ctx, '#2a2e35', bx - 2, by - 3, 5, 6); R(ctx, '#5a1410', bx - 1, by - 2, 3, 4); R(ctx, '#ff5040', bx, by - 1, 1, 2); }
  for (const [vx, vy] of decor.vents) { R(ctx, '#3a414a', vx - 7, vy, 14, 3); for (let i = 0; i < 4; i++) R(ctx, '#08090b', vx - 6 + i * 3, vy + 1, 2, 2); }
  return c;
}
function bgSize(sf) {
  const vw = VIEW_W / ZOOM, vh = VIEW_H / ZOOM;
  return [Math.ceil((LW - vw) * sf + vw + BG.pad * 2), Math.ceil((LH - vh) * sf + vh + BG.pad * 2)];
}
function drawBgFar() {
  const [w, h] = bgSize(BG.far), { c, ctx } = mkCanvas(w, h);
  for (let y = 0; y < h; y += 4) { const t = y / h; R(ctx, `rgb(${Math.round(9 + t * 22)},${Math.round(10 + t * 9)},${Math.round(13 + t * 2)})`, 0, y, w, 4); }
  let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let x = 0; x < w;) {
    const bw = (20 + rnd() * 60) | 0, bh = (60 + rnd() * h * 0.7) | 0;
    R(ctx, '#0b0c10', x, h - bh, bw, bh); R(ctx, '#13151b', x, h - bh, 1, bh); R(ctx, '#13151b', x, h - bh, bw, 1);
    for (let wy = h - bh + 6; wy < h - 10; wy += 9) for (let wx = x + 4; wx < x + bw - 4; wx += 7) if (rnd() < 0.12) R(ctx, rnd() < 0.5 ? '#4a2a14' : '#2d1c12', wx, wy, 2, 2);
    if (rnd() < 0.35) { const cx = x + ((bw * rnd()) | 0); R(ctx, '#0b0c10', cx, h - bh - 40, 6, 40); }
    x += bw + ((rnd() * 10) | 0);
  }
  for (let y = h - 60; y < h; y += 2) { ctx.fillStyle = `rgba(255,90,20,${(((y - (h - 60)) / 60) * 0.22).toFixed(3)})`; ctx.fillRect(0, y, w, 2); }
  return c;
}
function drawBgMid() {
  const [w, h] = bgSize(BG.mid), { c, ctx } = mkCanvas(w, h);
  R(ctx, '#101216', 0, 0, w, h);
  const stencils = ['B7', 'C-3', '42', 'N9', 'HOT', 'D-1', 'SEC 4', 'NO ENTRY', '09'];
  for (let py = 0; py < h; py += 40) for (let px = 0; px < w; px += 48) {
    R(ctx, '#15181d', px + 1, py + 1, 46, 38); R(ctx, '#1b1f25', px + 1, py + 1, 46, 1); R(ctx, '#1b1f25', px + 1, py + 1, 1, 38);
    R(ctx, '#0b0c0f', px + 1, py + 38, 46, 1); R(ctx, '#0b0c0f', px + 46, py + 1, 1, 38);
    const hv = hash2(px, py) % 9;
    if (hv === 0) for (let i = 0; i < 6; i++) R(ctx, '#0a0b0e', px + 10, py + 9 + i * 3, 28, 1);
    else if (hv === 1) for (let i = 0; i < 46; i++) R(ctx, (((i + py) >> 2) & 1) ? '#2c2610' : '#121214', px + 1 + i, py + 30, 1, 4);
    else if (hv === 2) drawGlyphs(ctx, stencils[hash2(py, px) % stencils.length].slice(0, 7), px + 4, py + 8, '#252931');
    else if (hv === 3) { R(ctx, '#5a1410', px + 39, py + 6, 2, 2); R(ctx, '#3a2a0a', px + 35, py + 6, 2, 2); }
  }
  for (const [wx, wy, ww, wh] of [[110, 96, 86, 56], [380, 70, 120, 64], [700, 120, 96, 56], [930, 84, 110, 60]]) {
    if (wx + ww > w) continue;
    ctx.clearRect(wx, wy, ww, wh);                                       // openings show the far layer
    R(ctx, '#232830', wx - 4, wy - 4, ww + 8, 4); R(ctx, '#0b0c0f', wx - 4, wy + wh, ww + 8, 4);
    R(ctx, '#1a1e24', wx - 4, wy, 4, wh); R(ctx, '#1a1e24', wx + ww, wy, 4, wh);
    for (let bx = wx + 9; bx < wx + ww; bx += 12) R(ctx, '#0c0d10', bx, wy, 2, wh);
  }
  for (let gx = 40; gx < w; gx += 170) {
    R(ctx, '#1a1e24', gx, 0, 14, h); R(ctx, '#262b33', gx, 0, 2, h); R(ctx, '#0f1114', gx + 12, 0, 2, h);
    for (let y = 6; y < h; y += 16) { R(ctx, '#2e343d', gx + 4, y); R(ctx, '#2e343d', gx + 9, y); }
    if (gx + 170 < w) for (let i = 0; i < 156; i++) { const t = i / 156; R(ctx, '#16191e', gx + 14 + i, Math.round(150 + t * 60), 1, 2); R(ctx, '#16191e', gx + 14 + i, Math.round(210 - t * 60), 1, 2); }
  }
  const pipe = (y, th) => {
    const cols = ['#2f353d', '#3e454f', '#4b535e', '#353b44', '#262a30', '#1b1e22'];
    for (let i = 0; i < th; i++) R(ctx, cols[Math.floor(i / th * cols.length)], 0, y + i, w, 1);
    for (let fx = 30; fx < w; fx += 96) { R(ctx, '#545d6b', fx, y - 1, 4, th + 2); R(ctx, '#15171b', fx + 4, y - 1, 1, th + 2); }
  };
  pipe(50, 8); pipe(h - 96, 10);
  for (let k = 0; k < 6; k++) {
    const x0 = 60 + k * 190, x1 = x0 + 150, y0 = 64 + (k % 3) * 30, sag = 18 + (k % 2) * 14;
    for (let x = x0; x < x1 && x < w; x++) { const t = (x - x0) / (x1 - x0); R(ctx, '#07080a', x, Math.round(y0 + sag * Math.sin(Math.PI * t)), 1, 2); }
  }
  // push the back wall down & cool so the playable foreground reads clearly
  ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = 'rgba(3,5,10,0.5)'; ctx.fillRect(0, 0, w, h);
  return c;
}

// ---- texture factory (runs once in Boot) -------------------------------------------
function genTextures(scene) {
  // player
  const pf = [];
  pf.push({ name: 'idle0', c: makeSprite(18, 24, x => drawPlayer(x, 0, [1, 0], [-1, 0])) });
  pf.push({ name: 'idle1', c: makeSprite(18, 24, x => drawPlayer(x, 1, [1, 0], [-1, 0])) });
  pf.push({ name: 'jump', c: makeSprite(18, 24, x => drawPlayer(x, 0, [3, 3], [-2, 1])) });
  pf.push({ name: 'fall', c: makeSprite(18, 24, x => drawPlayer(x, 0, [2, 1], [-3, 0])) });
  for (let i = 0; i < 6; i++) pf.push({ name: 'run' + i, c: makeSprite(18, 24, x => drawPlayer(x, RUN_BOB[i], RUN_LEGS[i], RUN_LEGS[(i + 3) % 6])) });
  pf.push({ name: 'kick', c: makeSprite(18, 24, x => drawPlayer(x, 0, [4, 6], [-1, 0])) });
  addSheet(scene, 'player', pf, 18, 24, false);
  addSheet(scene, 'echo', pf, 18, 24, true);                          // the echo wears your frames (tinted cyan in play)
  // guns + HUD icons
  for (const k in GUNS) {
    const G = GUNS[k];
    addTex(scene, 'gun_' + k, makeSprite(G.w, G.h, x => G.draw(x, true)));
    addTex(scene, 'icon_' + k, makeSprite(G.w, G.h, x => G.draw(x, false)));
  }
  // enemies (+ white flash copies)
  const gf = [];
  for (let i = 0; i < 4; i++) gf.push({ name: 'w' + i, c: makeSprite(20, 18, x => drawGrunt(x, i, false)) });
  for (let i = 0; i < 4; i++) gf.push({ name: 'c' + i, c: makeSprite(20, 18, x => drawGrunt(x, i, true)) });
  addSheet(scene, 'grunt', gf, 20, 18, true);
  const hf = [];
  for (let i = 0; i < 4; i++) hf.push({ name: 'w' + i, c: makeSprite(28, 28, x => drawHeavy(x, i, false)) });
  hf.push({ name: 'wind', c: makeSprite(28, 28, x => drawHeavy(x, 0, true)) });
  addSheet(scene, 'heavy', hf, 28, 28, true);
  addSheet(scene, 'drone', [
    { name: 'd0', c: makeSprite(18, 16, x => drawDrone(x, 0, false)) },
    { name: 'd1', c: makeSprite(18, 16, x => drawDrone(x, 1, false)) },
    { name: 'dc', c: makeSprite(18, 16, x => drawDrone(x, 0, true)) },
  ], 18, 16, true);
  const ef = [
    { name: 'idle0', c: makeSprite(18, 24, x => drawEnforcer(x, 0, [1, 0], [-1, 0])) },
    { name: 'idle1', c: makeSprite(18, 24, x => drawEnforcer(x, 1, [1, 0], [-1, 0])) },
    { name: 'jump', c: makeSprite(18, 24, x => drawEnforcer(x, 0, [3, 3], [-2, 1])) },
    { name: 'fall', c: makeSprite(18, 24, x => drawEnforcer(x, 0, [2, 1], [-3, 0])) },
  ];
  for (let i = 0; i < 6; i++) ef.push({ name: 'run' + i, c: makeSprite(18, 24, x => drawEnforcer(x, RUN_BOB[i], RUN_LEGS[i], RUN_LEGS[(i + 3) % 6])) });
  addSheet(scene, 'enforcer', ef, 18, 24, true);
  const sf = [
    { name: 'idle', c: makeSprite(20, 24, x => drawStalker(x, 0, [1, 0], [-1, 0], 'idle')) },
    { name: 'crouch', c: makeSprite(20, 24, x => drawStalker(x, 3, [2, 0], [-2, 0], 'crouch')) },
    { name: 'lunge', c: makeSprite(20, 24, x => drawStalker(x, 1, [4, 2], [-4, 0], 'lunge')) },
    { name: 'air', c: makeSprite(20, 24, x => drawStalker(x, 0, [3, 3], [-2, 1], 'run')) },
  ];
  for (let i = 0; i < 6; i++) sf.push({ name: 'run' + i, c: makeSprite(20, 24, x => drawStalker(x, RUN_BOB[i], RUN_LEGS[i], RUN_LEGS[(i + 3) % 6], 'run')) });
  addSheet(scene, 'stalker', sf, 20, 24, true);
  addTex(scene, 'gun_rifle', makeSprite(24, 11, x => drawRifle(x, true)));
  addTex(scene, 'icon_rifle', makeSprite(24, 11, x => drawRifle(x, false)));
  addTex(scene, 'ebullet', makeSprite(6, 2, c => { R(c, '#ff4a2a', 0, 1, 4, 1); R(c, '#ffb080', 2, 0, 3, 1); R(c, '#ffffff', 5, 0); }, null));
  addTex(scene, 'sbullet', makeSprite(12, 2, c => { R(c, '#3a80c0', 0, 1, 6, 1); R(c, '#9adcff', 4, 0, 7, 1); R(c, '#ffffff', 11, 0, 1, 2); }, null));
  addTex(scene, 'parry', makeSprite(9, 4, c => { R(c, '#c08010', 0, 1, 4, 2); R(c, '#ffe14a', 3, 0, 5, 4); R(c, '#ffffff', 6, 1, 3, 2); }, null));
  addTex(scene, 'barrel', makeSprite(12, 14, c => {
    R(c, '#a02018', 1, 1, 10, 12); R(c, '#d04030', 1, 1, 10, 1); R(c, '#601010', 1, 12, 10, 1); R(c, '#401010', 1, 4, 10, 1); R(c, '#401010', 1, 9, 10, 1);
    for (let i = 0; i < 10; i++) R(c, (i >> 1) % 2 ? '#15161a' : '#e8b422', 1 + i, 6, 1, 2);
    R(c, '#ff9080', 3, 2, 2, 1);
  }));
  addTex(scene, 'orb', makeSprite(11, 11, c => { for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) { const d = Math.hypot(x + 0.5 - 5.5, y + 0.5 - 5.5); if (d < 4.6) R(c, d < 1.6 ? '#ffffff' : d < 3 ? '#d0a0ff' : '#7030d0', x, y); } }, null));
  addTex(scene, 'voidcore', makeSprite(18, 18, c => { for (let y = 0; y < 18; y++) for (let x = 0; x < 18; x++) { const d = Math.hypot(x + 0.5 - 9, y + 0.5 - 9); if (d < 8.5) R(c, d < 6 ? '#050208' : d < 7.3 ? '#4010a0' : '#c080ff', x, y); } }, null));
  addTex(scene, 'slag', makeSprite(7, 7, c => { R(c, '#c03010', 1, 1, 5, 5); R(c, '#ff8a20', 2, 1, 3, 4); R(c, '#ffe080', 2, 2, 2, 2); }));
  addSheet(scene, 'tick', [
    { name: 'k0', c: makeSprite(14, 10, x => drawTick(x, 0, false)) }, { name: 'k1', c: makeSprite(14, 10, x => drawTick(x, 1, false)) },
    { name: 'ka', c: makeSprite(14, 10, x => drawTick(x, 0, true)) },
  ], 14, 10, true);
  const snf = [
    { name: 'idle0', c: makeSprite(18, 24, x => drawSniper(x, 0, [1, 0], [-1, 0])) }, { name: 'idle1', c: makeSprite(18, 24, x => drawSniper(x, 1, [1, 0], [-1, 0])) },
    { name: 'jump', c: makeSprite(18, 24, x => drawSniper(x, 0, [3, 3], [-2, 1])) }, { name: 'fall', c: makeSprite(18, 24, x => drawSniper(x, 0, [2, 1], [-3, 0])) },
  ];
  for (let i = 0; i < 6; i++) snf.push({ name: 'run' + i, c: makeSprite(18, 24, x => drawSniper(x, RUN_BOB[i], RUN_LEGS[i], RUN_LEGS[(i + 3) % 6])) });
  addSheet(scene, 'sniper', snf, 18, 24, true);
  addTex(scene, 'gun_sniper', makeSprite(34, 9, x => drawSniperRifle(x, true)));
  addTex(scene, 'icon_sniper', makeSprite(34, 9, x => drawSniperRifle(x, false)));
  const bsf = [];
  for (let i = 0; i < 4; i++) bsf.push({ name: 'w' + i, c: makeSprite(48, 44, x => drawBoss(x, i, 'idle')) });
  for (const p of ['wind', 'crouch', 'breath']) bsf.push({ name: p, c: makeSprite(48, 44, x => drawBoss(x, 0, p)) });
  addSheet(scene, 'boss', bsf, 48, 44, true);
  const shortStride = l => [Math.round(l[0] * 0.7), l[1]];
  for (const [key, m] of [['bulwark', false], ['bulwarkm', true]]) {   // bulwarkm: shield eaten by the corroder
    const bwf = [
      { name: 'idle0', c: makeSprite(22, 24, x => drawBulwark(x, 0, [1, 0], [-1, 0], 'walk', m)) },
      { name: 'idle1', c: makeSprite(22, 24, x => drawBulwark(x, 1, [1, 0], [-1, 0], 'walk', m)) },
      { name: 'bash', c: makeSprite(22, 24, x => drawBulwark(x, 1, [3, 0], [-3, 0], 'bash', m)) },
      { name: 'stagger', c: makeSprite(22, 24, x => drawBulwark(x, 1, [0, 0], [-2, 0], 'stagger', m)) },
    ];
    for (let i = 0; i < 6; i++) bwf.push({ name: 'run' + i, c: makeSprite(22, 24, x => drawBulwark(x, RUN_BOB[i], shortStride(RUN_LEGS[i]), shortStride(RUN_LEGS[(i + 3) % 6]), 'walk', m)) });
    addSheet(scene, key, bwf, 22, 24, true);
  }
  buildRagParts(scene);
  const rkf = [
    { name: 'idle0', c: makeSprite(20, 24, x => drawRocketeer(x, 0, [1, 0], [-1, 0])) }, { name: 'idle1', c: makeSprite(20, 24, x => drawRocketeer(x, 1, [1, 0], [-1, 0])) },
    { name: 'jump', c: makeSprite(20, 24, x => drawRocketeer(x, 0, [3, 3], [-2, 1])) }, { name: 'fall', c: makeSprite(20, 24, x => drawRocketeer(x, 0, [2, 1], [-3, 0])) },
  ];
  for (let i = 0; i < 6; i++) rkf.push({ name: 'run' + i, c: makeSprite(20, 24, x => drawRocketeer(x, RUN_BOB[i], RUN_LEGS[i], RUN_LEGS[(i + 3) % 6])) });
  addSheet(scene, 'rocketeer', rkf, 20, 24, true);
  addTex(scene, 'gun_rlaunch', makeSprite(26, 11, x => drawRLauncher(x, true)));
  addTex(scene, 'icon_rlaunch', makeSprite(26, 11, x => drawRLauncher(x, false)));
  addSheet(scene, 'wasp', [{ name: 'p0', c: makeSprite(22, 14, x => drawWasp(x, 0, false)) }, { name: 'p1', c: makeSprite(22, 14, x => drawWasp(x, 1, false)) },
                           { name: 'pb', c: makeSprite(22, 14, x => drawWasp(x, 0, true)) }], 22, 14, true);
  const rmf = [];
  for (let i = 0; i < 4; i++) rmf.push({ name: 'w' + i, c: makeSprite(30, 22, x => drawRammer(x, i, 'walk')) });
  rmf.push({ name: 'wind', c: makeSprite(30, 22, x => drawRammer(x, 0, 'wind')) }, { name: 'c0', c: makeSprite(30, 22, x => drawRammer(x, 0, 'charge')) },
           { name: 'c1', c: makeSprite(30, 22, x => drawRammer(x, 1, 'charge')) }, { name: 'dz', c: makeSprite(30, 22, x => drawRammer(x, 0, 'dizzy')) });
  addSheet(scene, 'rammer', rmf, 30, 22, true);
  addTex(scene, 'erocket', makeSprite(10, 5, c => { R(c, '#8a8f98', 2, 1, 6, 3); R(c, '#c4ccd4', 2, 1, 6, 1); R(c, '#e02a1a', 8, 1, 1, 3); R(c, '#e8b422', 4, 1, 1, 3); R(c, '#4a525c', 0, 0, 2, 1); R(c, '#4a525c', 0, 4, 2, 1); }));
  addTex(scene, 'ebomb', makeSprite(8, 6, c => { R(c, '#a02018', 2, 1, 5, 4); R(c, '#d04030', 2, 1, 5, 1); R(c, '#e8b422', 4, 1, 1, 4); R(c, '#3a3f47', 0, 1, 2, 1); R(c, '#3a3f47', 0, 4, 2, 1); R(c, '#3a3f47', 1, 2, 1, 2); }));
  addTex(scene, 'cshell', makeSprite(9, 7, c => { R(c, '#5a4a2a', 1, 1, 7, 5); R(c, '#8a7040', 2, 1, 5, 1); R(c, '#e8b422', 3, 3, 3, 1); R(c, '#2a2216', 1, 5, 7, 1); }));
  addTex(scene, 'bomblet', makeSprite(5, 5, c => { R(c, '#c03010', 1, 1, 3, 3); R(c, '#ffb040', 2, 1, 1, 1); }));
  addTex(scene, 'gravbomb', makeSprite(7, 7, c => { R(c, '#3a1a6a', 1, 0, 5, 7); R(c, '#3a1a6a', 0, 1, 7, 5); R(c, '#9a60ff', 1, 1, 5, 5); R(c, '#e0c8ff', 2, 2, 2, 2); }));
  addTex(scene, 'pinball', makeSprite(8, 8, c => { R(c, '#5a636e', 2, 0, 4, 8); R(c, '#5a636e', 0, 2, 8, 4); R(c, '#5a636e', 1, 1, 6, 6); R(c, '#c8d0da', 2, 1, 4, 5); R(c, '#ffffff', 2, 2, 2, 1); }));
  addTex(scene, 'gasshell', makeSprite(6, 7, c => { R(c, '#2a2e35', 1, 0, 4, 7); R(c, '#a0e040', 2, 1, 2, 5); R(c, '#e0ff80', 2, 2, 1, 1); }));
  addTex(scene, 'stasiscan', makeSprite(6, 7, c => { R(c, '#2a2e35', 1, 0, 4, 7); R(c, '#c8e8ff', 2, 1, 2, 5); R(c, '#ffffff', 2, 3, 2, 1); }));
  addTex(scene, 'decoycan', makeSprite(6, 7, c => { R(c, '#2a2e35', 1, 0, 4, 7); R(c, '#46e6ff', 2, 1, 2, 5); R(c, '#ffffff', 2, 2, 1, 1); }));
  addTex(scene, 'wball', makeSprite(22, 24, c => {                     // the wrecking ball: a dented iron sphere on a shackle
    R(c, '#2a2e35', 9, 0, 4, 4); R(c, '#6a7380', 10, 1, 2, 2);
    R(c, '#15161a', 6, 3, 10, 21); R(c, '#15161a', 3, 6, 16, 15); R(c, '#15161a', 2, 9, 18, 9);
    R(c, '#3a3f47', 6, 4, 10, 19); R(c, '#3a3f47', 3, 7, 16, 13); R(c, '#3a3f47', 3, 9, 16, 9);
    R(c, '#5a636e', 6, 6, 6, 4); R(c, '#8a94a0', 7, 7, 3, 2); R(c, '#2a2e35', 13, 16, 4, 3); R(c, '#22262c', 5, 13, 2, 2);
  }));
  addTex(scene, 'frostball', makeSprite(6, 6, c => { R(c, '#4a8ab0', 1, 0, 4, 6); R(c, '#4a8ab0', 0, 1, 6, 4); R(c, '#c8f0ff', 1, 1, 4, 4); R(c, '#ffffff', 2, 1, 1, 1); }));
  addTex(scene, 'rivet', makeSprite(6, 3, c => { R(c, '#b07030', 0, 1, 2, 1); R(c, '#ffd27a', 2, 1, 3, 1); R(c, '#ffffff', 5, 1); R(c, '#ff9a3a', 2, 0, 3, 1); R(c, '#ff9a3a', 2, 2, 3, 1); }, null));
  addTex(scene, 'gun_mini2', makeSprite(GUNS.mini.w, GUNS.mini.h, x => GUNS.mini.draw(x, true, true)));
  addTex(scene, 'fb_x', makeSprite(16, 16, c => drawCrate(c, 0, 0, 1), null));          // falling-block versions of the tiles
  addTex(scene, 'fb_g', makeSprite(16, 16, c => drawGirder(c, 0, 0, false, false), null));
  addTex(scene, 'fb_=', makeSprite(16, 7, c => drawGrating(c, 0, 0, false, false), null));
  addSheet(scene, 'jet', [{ name: 'j0', c: makeSprite(20, 24, x => drawJet(x, 0)) }, { name: 'j1', c: makeSprite(20, 24, x => drawJet(x, 1)) }], 20, 24, true);
  addSheet(scene, 'screamer', [{ name: 's0', c: makeSprite(14, 12, x => drawScreamer(x, 0, false)) }, { name: 's1', c: makeSprite(14, 12, x => drawScreamer(x, 1, false)) },
                               { name: 'sw', c: makeSprite(14, 12, x => drawScreamer(x, 0, true)) }], 14, 12, true);
  addSheet(scene, 'warden', [{ name: 'v0', c: makeSprite(18, 16, x => drawWarden(x, 0)) }, { name: 'v1', c: makeSprite(18, 16, x => drawWarden(x, 1)) }], 18, 16, true);
  const jgf = [];
  for (let st = 0; st < 3; st++) for (let i = 0; i < 4; i++) jgf.push({ name: 's' + st + 'w' + i, c: makeSprite(32, 30, x => drawJugg(x, i, st)) });
  addSheet(scene, 'jugg', jgf, 32, 30, true);
  addTex(scene, 'gun_jugg', makeSprite(30, 12, x => drawJuggGun(x, false)));
  addTex(scene, 'gun_jugg2', makeSprite(30, 12, x => drawJuggGun(x, true)));
  addTex(scene, 'sentry_base', makeSprite(14, 10, drawSentryBase));
  addTex(scene, 'sentry_head', makeSprite(16, 8, drawSentryHead));
  const ckf = [{ name: 'idle', c: makeSprite(18, 24, x => drawCloaker(x, 0, [1, 0], [-1, 0], 'idle')) }, { name: 'crouch', c: makeSprite(18, 24, x => drawCloaker(x, 3, [2, 0], [-2, 0], 'idle')) },
               { name: 'lunge', c: makeSprite(18, 24, x => drawCloaker(x, 1, [4, 2], [-4, 0], 'lunge')) }, { name: 'air', c: makeSprite(18, 24, x => drawCloaker(x, 0, [3, 3], [-2, 1], 'idle')) }];
  for (let i = 0; i < 6; i++) ckf.push({ name: 'run' + i, c: makeSprite(18, 24, x => drawCloaker(x, RUN_BOB[i], RUN_LEGS[i], RUN_LEGS[(i + 3) % 6], 'idle')) });
  addSheet(scene, 'cloaker', ckf, 18, 24, true);
  const pyf = [{ name: 'idle', c: makeSprite(18, 24, x => drawPyro(x, 0, [1, 0], [-1, 0], 'idle')) }, { name: 'crouch', c: makeSprite(18, 24, x => drawPyro(x, 1, [2, 0], [-2, 0], 'crouch')) },
               { name: 'lunge', c: makeSprite(18, 24, x => drawPyro(x, 0, [3, 0], [-2, 0], 'lunge')) }, { name: 'air', c: makeSprite(18, 24, x => drawPyro(x, 0, [3, 3], [-2, 1], 'idle')) }];
  for (let i = 0; i < 6; i++) pyf.push({ name: 'run' + i, c: makeSprite(18, 24, x => drawPyro(x, RUN_BOB[i], RUN_LEGS[i], RUN_LEGS[(i + 3) % 6], 'idle')) });
  addSheet(scene, 'pyro', pyf, 18, 24, true);
  addSheet(scene, 'gunship', [{ name: 'g0', c: makeSprite(56, 24, x => drawGunship(x, 0, false)) }, { name: 'g1', c: makeSprite(56, 24, x => drawGunship(x, 1, false)) },
                              { name: 'wreck', c: makeSprite(56, 24, x => drawGunship(x, 0, true)) }], 56, 24, true);
  addTex(scene, 'hook', makeSprite(8, 7, c => { R(c, '#8a94a0', 0, 3, 4, 1); R(c, '#c8d0d8', 3, 1, 2, 5); R(c, '#c8d0d8', 5, 0, 2, 2); R(c, '#c8d0d8', 5, 5, 2, 2); R(c, '#ffffff', 6, 0, 1, 1); }));
  addTex(scene, 'firebomb', makeSprite(9, 5, c => { R(c, '#7a5a30', 0, 1, 6, 3); R(c, '#a07a40', 0, 1, 6, 1); R(c, '#5a4020', 6, 2, 2, 1); R(c, '#ff8a20', 8, 1, 1, 3); R(c, '#ffe080', 8, 2, 1, 1); }));
  { const { c, ctx } = mkCanvas(1000, 600), gr = ctx.createRadialGradient(500, 300, 34, 500, 300, 118);   // blackout vision mask (world px)
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.45, 'rgba(0,0,0,0.6)'); gr.addColorStop(1, 'rgba(2,2,6,0.965)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, 1000, 600); addTex(scene, 'darkmask', c); }
  addTex(scene, 'gun_smg', makeSprite(18, 9, x => drawSMG(x, true)));
  addTex(scene, 'icon_smg', makeSprite(18, 9, x => drawSMG(x, false)));
  const spf = [{ name: 'idle', c: makeSprite(18, 24, x => drawSapper(x, 0, [1, 0], [-1, 0], 'idle')) }, { name: 'crouch', c: makeSprite(18, 24, x => drawSapper(x, 3, [2, 0], [-2, 0], 'crouch')) },
               { name: 'lunge', c: makeSprite(18, 24, x => drawSapper(x, 0, [4, 1], [-3, 0], 'run')) }, { name: 'air', c: makeSprite(18, 24, x => drawSapper(x, 0, [3, 3], [-2, 1], 'run')) }];
  for (let i = 0; i < 6; i++) spf.push({ name: 'run' + i, c: makeSprite(18, 24, x => drawSapper(x, RUN_BOB[i], RUN_LEGS[i], RUN_LEGS[(i + 3) % 6], 'run')) });
  addSheet(scene, 'sapper', spf, 18, 24, true);
  const brf = [];
  for (let i = 0; i < 4; i++) brf.push({ name: 'w' + i, c: makeSprite(34, 26, x => drawBrood(x, i, 0), null) });
  brf.push({ name: 'sw', c: makeSprite(34, 26, x => drawBrood(x, 0, 1), null) }, { name: 'sw2', c: makeSprite(34, 26, x => drawBrood(x, 1, 2), null) });
  addSheet(scene, 'brood', brf, 34, 26, true);
  addTex(scene, 'stake', makeSprite(16, 3, c => { R(c, '#b8c2cc', 0, 0, 12, 1); R(c, '#7c8692', 0, 1, 12, 1); R(c, '#3a3f47', 0, 2, 12, 1); R(c, '#d8e0e8', 12, 0, 2, 3); R(c, '#ffffff', 14, 1, 2, 1); R(c, '#5a3418', 0, 0, 2, 3); }, null));
  addTex(scene, 'mine', makeSprite(7, 5, c => { R(c, '#2a2e35', 0, 2, 7, 3); R(c, '#4a525c', 1, 2, 5, 1); R(c, '#e8b422', 1, 4, 5, 1); R(c, '#ff3020', 3, 1, 1, 1); }));
  addTex(scene, 'satchel', makeSprite(9, 7, c => { R(c, '#5a2a18', 1, 2, 7, 4); R(c, '#8a4a28', 1, 2, 7, 1); R(c, '#d02a1a', 2, 4, 5, 1); R(c, '#3a3f47', 3, 0, 3, 2); R(c, '#ffe040', 4, 0, 1, 1); }));
  addTex(scene, 'canister', makeSprite(9, 15, c => {
    R(c, '#2a6a3a', 1, 3, 7, 11); R(c, '#4aa060', 1, 3, 2, 11); R(c, '#1a4a26', 7, 3, 1, 11);
    for (let i = 0; i < 7; i++) R(c, (i >> 1) % 2 ? '#15161a' : '#e8b422', 1 + i, 7, 1, 2);
    R(c, '#8a94a0', 3, 1, 3, 2); R(c, '#c8d0d8', 4, 0, 1, 1); R(c, '#e0fff0', 3, 4, 1, 2);
  }));
  addSheet(scene, 'mender', [
    { name: 'm0', c: makeSprite(18, 16, x => drawMender(x, 0, false)) },
    { name: 'm1', c: makeSprite(18, 16, x => drawMender(x, 1, false)) },
    { name: 'mh', c: makeSprite(18, 16, x => drawMender(x, 0, true)) },
  ], 18, 16, true);
  addTex(scene, 'saw', makeSprite(13, 13, c => {
    for (let y = 0; y < 13; y++) for (let x = 0; x < 13; x++) {
      const dx = x + 0.5 - 6.5, dy = y + 0.5 - 6.5, d = Math.hypot(dx, dy), tooth = Math.sin(Math.atan2(dy, dx) * 8) > 0.2;
      if (d < 3.6 || (d < 4.9 && tooth)) R(c, d < 1.3 ? '#2a2e35' : d < 3.6 ? ((x + y) % 2 ? '#c8d0d8' : '#aab4bc') : '#e8eef4', x, y);
    }
  }));
  addTex(scene, 'beam', makeSprite(10, 64, ctx => {                  // warp-in light column
    for (let y = 0; y < 64; y++) for (let x = 0; x < 10; x++) {
      const q = Math.ceil(Math.pow(1 - Math.abs(x + 0.5 - 5) / 5, 1.5) * (0.3 + 0.7 * y / 63) * 5) / 5;
      if (q > 0) { ctx.fillStyle = `rgba(255,255,255,${(q * 0.9).toFixed(2)})`; ctx.fillRect(x, y, 1, 1); }
    }
  }, null));
  const DIGCH = '0123456789!+', DIGFR = '0123456789xp';              // damage-number glyph sheets, one per colour
  for (const [k, col] of [['W', '#ffffff'], ['Y', '#ffe14a'], ['G', '#5cff7a'], ['R', '#ff4a3a']]) {
    const { c, ctx } = mkCanvas(DIGCH.length * 6, 8);
    for (let i = 0; i < DIGCH.length; i++) { drawGlyphs(ctx, DIGCH[i], i * 6 + 1, 1, '#000000'); drawGlyphs(ctx, DIGCH[i], i * 6, 0, col); }
    const t = addTex(scene, 'dig' + k, c);
    for (let i = 0; i < DIGFR.length; i++) t.add(DIGFR[i], 0, i * 6, 0, 6, 8);
  }
  for (const k in GIBDEF) { const [w, h, fn] = GIBDEF[k]; addTex(scene, k, makeSprite(w, h, fn, '#140606')); }
  // projectiles
  addTex(scene, 'nail', makeSprite(7, 3, c => { R(c, '#b0601a', 0, 1, 3, 1); R(c, '#ffcf5a', 3, 1, 3, 1); R(c, '#ffffff', 6, 1); R(c, '#ff8a1f', 3, 0, 3, 1); R(c, '#ff8a1f', 3, 2, 3, 1); }, null));
  addTex(scene, 'pellet', makeSprite(6, 2, c => { R(c, '#ff9a2a', 0, 1, 4, 1); R(c, '#ffe680', 1, 0, 4, 1); R(c, '#ffffff', 5, 0); }, null));
  addTex(scene, 'rocket', makeSprite(12, 6, c => { R(c, '#8b95a1', 3, 1, 6, 4); R(c, '#c4ccd4', 3, 1, 6, 1); R(c, '#e02a1a', 9, 1, 2, 4); R(c, '#ff8a6a', 9, 1, 1, 1); R(c, '#4a525c', 1, 0, 3, 1); R(c, '#4a525c', 1, 5, 3, 1); R(c, '#4a525c', 1, 2, 2, 2); }));
  addTex(scene, 'grenade', makeSprite(8, 7, c => { R(c, '#55603f', 1, 1, 6, 5); R(c, '#77845a', 2, 1, 4, 1); R(c, '#2a2f22', 1, 3, 6, 1); R(c, '#ff3a2a', 3, 2, 2, 1); }));
  addTex(scene, 'bolt',makeSprite(9, 9, c => { for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) { const d = Math.hypot(x - 4, y - 4); if (d < 4.4) R(c, d < 1.5 ? '#ffffff' : d < 2.8 ? '#ff9be0' : '#e0309a', x, y); } }, null));
  addTex(scene, 'nailStuck', makeSprite(7, 3, c => { R(c, '#5a636e', 0, 0, 1, 3); R(c, '#9aa4b0', 1, 1, 6, 1); }, null));
  // muzzle flashes (3 variants)
  for (let k = 0; k < 3; k++) addTex(scene, 'mf' + k, makeSprite(16, 12, ctx => {
    let s = (k + 1) * 9973; const rnd = () => ((s = (s * 16807) % 2147483647) & 0xffff) / 0xffff;
    const cy = 6;
    for (let x = 0; x < 16; x++) {
      const t = x / 15, half = Math.max(0, Math.round((1 - t) * 5 * (0.55 + 0.45 * rnd())));
      for (let y = -half; y <= half; y++) { const e = Math.abs(y) / (half + 0.5); R(ctx, e < 0.4 && t < 0.55 ? '#ffffff' : e < 0.75 ? '#ffe46a' : '#ff8c1f', x, cy + y); }
    }
    for (let j = 0; j < 4; j++) { const a = (rnd() - 0.5) * 2.4, len = 3 + rnd() * 7; for (let i = 0; i < len; i++) R(ctx, i < len * 0.5 ? '#ffe46a' : '#ff8c1f', Math.round(Math.cos(a) * i), Math.round(cy + Math.sin(a) * i)); }
  }, null));
  // banded (posterised) glow - reads as pixel lighting when tinted + additive
  addTex(scene, 'glow', makeSprite(32, 32, ctx => {
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const d = Math.hypot(x + 0.5 - 16, y + 0.5 - 16) / 16; if (d >= 1) continue;
      const q = Math.ceil(Math.pow(1 - d, 1.6) * 6) / 6; ctx.fillStyle = `rgba(255,255,255,${(q * 0.9).toFixed(3)})`; ctx.fillRect(x, y, 1, 1);
    }
  }, null));
  addTex(scene, 'ring', makeSprite(48, 48, ctx => { for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) { const d = Math.hypot(x + 0.5 - 24, y + 0.5 - 24); if (Math.abs(d - 21.5) < 1.3) R(ctx, '#ffffff', x, y); else if (Math.abs(d - 19.5) < 1) R(ctx, '#ffd090', x, y); } }, null));
  addTex(scene, 'cone', makeSprite(48, 64, ctx => {
    for (let y = 0; y < 64; y++) { const half = 3 + y * 0.33; for (let x = 0; x < 48; x++) { const dx = Math.abs(x + 0.5 - 24); if (dx > half) continue;
      const a = (1 - y / 64) * (1 - dx / half * 0.7); ctx.fillStyle = `rgba(255,255,255,${(Math.ceil(a * 5) / 5 * 0.9).toFixed(2)})`; ctx.fillRect(x, y, 1, 1); } }
  }, null));
  // explosion fireball frames
  const bf = [];
  for (let f = 0; f < 6; f++) bf.push({ name: 'b' + f, c: makeSprite(48, 48, ctx => {
    const t = f / 5, r = 7 + t * 16;
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
      const n = (hash2(x >> 1, (y >> 1) + f * 7) % 1000) / 1000, d = Math.hypot(x + 0.5 - 24, y + 0.5 - 24) + (n - 0.5) * 6;
      if (d > r || (t > 0.45 && n > 1.25 - t)) continue;
      const k = d / r * 0.9 + t * 0.8;
      R(ctx, k < 0.35 ? '#ffffff' : k < 0.6 ? '#fff3a8' : k < 0.85 ? '#ffb43c' : k < 1.05 ? '#ff6a1a' : k < 1.25 ? '#c4301a' : k < 1.45 ? '#5a2620' : '#2a1a18', x, y);
    }
  }, null) });
  addSheet(scene, 'boom', bf, 48, 48, false);
  // props / UI
  addTex(scene, 'medkit', makeSprite(13, 11, c => { R(c, '#cfd5dc', 1, 3, 11, 7); R(c, '#eef2f6', 1, 3, 11, 1); R(c, '#8e98a4', 1, 9, 11, 1);
    R(c, '#5a636e', 4, 1, 5, 1); R(c, '#5a636e', 4, 2, 1, 1); R(c, '#5a636e', 8, 2, 1, 1); R(c, '#e02424', 5, 4, 3, 5); R(c, '#e02424', 4, 5, 5, 3); R(c, '#ff7070', 5, 5, 1, 1); }));
  addTex(scene, 'skull', makeSprite(9, 9, c => { R(c, '#e8e2d0', 2, 1, 5, 1); R(c, '#e8e2d0', 1, 2, 7, 4); R(c, '#e8e2d0', 2, 6, 5, 1);
    R(c, '#e8e2d0', 2, 7, 1, 1); R(c, '#e8e2d0', 4, 7, 1, 1); R(c, '#e8e2d0', 6, 7, 1, 1); R(c, '#ff3b1f', 2, 3, 2, 2); R(c, '#ff3b1f', 5, 3, 2, 2); R(c, '#1a0a0a', 4, 5, 1, 1); }));
  addTex(scene, 'alert', makeSprite(4, 11, c => { R(c, '#ff3a2a', 1, 1, 2, 6); R(c, '#ff3a2a', 1, 8, 2, 2); R(c, '#ffb0a0', 1, 1, 1, 2); }));
  addTex(scene, 'xhair', makeSprite(13, 13, c => { R(c, '#ffffff', 6, 1, 1, 3); R(c, '#ffffff', 6, 9, 1, 3); R(c, '#ffffff', 1, 6, 3, 1); R(c, '#ffffff', 9, 6, 3, 1); R(c, '#ff5a2a', 6, 6, 1, 1); }, '#000000'));
  addTex(scene, 'lamp', makeSprite(13, 9, c => { R(c, '#2a2e35', 5, 1, 3, 2); R(c, '#3c434d', 3, 3, 7, 2); R(c, '#58616c', 3, 3, 7, 1); R(c, '#1a1d22', 2, 5, 9, 1);
    R(c, '#fff1c0', 5, 6, 3, 1); R(c, '#ffd27a', 4, 6, 1, 1); R(c, '#ffd27a', 8, 6, 1, 1); }));
  genPropTextures(scene);
  // backgrounds + vignette
  addTex(scene, 'bgFar', drawBgFar());
  addTex(scene, 'bgMid', drawBgMid());
  const { c: vc, ctx: vx } = mkCanvas(VIEW_W, VIEW_H);
  const grd = vx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.62);
  grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,0.6)'); vx.fillStyle = grd; vx.fillRect(0, 0, VIEW_W, VIEW_H);
  addTex(scene, 'vignette', vc);
  // ---- overdrive round ----
  addTex(scene, 'gun_ripper2', makeSprite(GUNS.ripper.w, GUNS.ripper.h, x => GUNS.ripper.draw(x, true, true)));
  addTex(scene, 'gun_glaive2', makeSprite(GUNS.glaive.w, GUNS.glaive.h, x => GUNS.glaive.draw(x, true, true)));
  addTex(scene, 'glaive', makeSprite(19, 19, c => drawGlaiveBlade(c, 9.5, 9.5)));
  addTex(scene, 'hornet', makeSprite(9, 4, c => { R(c, '#8a94a0', 2, 1, 5, 2); R(c, '#c4ccd4', 2, 1, 5, 1); R(c, '#ffd040', 7, 1, 1, 2); R(c, '#e8b422', 4, 1, 1, 2); R(c, '#4a525c', 0, 0, 2, 1); R(c, '#4a525c', 0, 3, 2, 1); }));
  addTex(scene, 'harpoon', makeSprite(11, 7, c => { R(c, '#6a7380', 0, 3, 6, 1); R(c, '#e0e8f0', 6, 2, 3, 3); R(c, '#ffffff', 9, 3, 2, 1); R(c, '#e0e8f0', 6, 0, 2, 2); R(c, '#e0e8f0', 6, 5, 2, 2); }));
  for (const [key, w, h, tier] of [['slagling', 26, 20, 2], ['slagmid', 18, 14, 1], ['slagbit', 12, 10, 0]])
    addSheet(scene, key, ['a', 'q', 's'].map(f => ({ name: f, c: makeSprite(w, h, x => drawSlagling(x, w, h, f, tier), '#1a0604') })), w, h, true);
  addSheet(scene, 'burrower', [{ name: 'up', c: makeSprite(18, 30, x => drawBurrower(x, true, 0)) }, { name: 'shut', c: makeSprite(18, 30, x => drawBurrower(x, false, 0)) },
                               { name: 'sw0', c: makeSprite(18, 30, x => drawBurrower(x, true, -1)) }, { name: 'sw1', c: makeSprite(18, 30, x => drawBurrower(x, false, 1)) }], 18, 30, true);
  const hpf = [{ name: 'idle', c: makeSprite(20, 24, x => drawHarpooner(x, 0, [1, 0], [-1, 0], 'idle')) }, { name: 'crouch', c: makeSprite(20, 24, x => drawHarpooner(x, 1, [2, 0], [-2, 0], 'crouch')) },
               { name: 'lunge', c: makeSprite(20, 24, x => drawHarpooner(x, 0, [3, 0], [-3, 0], 'lunge')) }, { name: 'air', c: makeSprite(20, 24, x => drawHarpooner(x, 0, [3, 3], [-2, 1], 'idle')) }];
  for (let i = 0; i < 6; i++) hpf.push({ name: 'run' + i, c: makeSprite(20, 24, x => drawHarpooner(x, RUN_BOB[i], RUN_LEGS[i], RUN_LEGS[(i + 3) % 6], 'idle')) });
  addSheet(scene, 'harpooner', hpf, 20, 24, true);
  addSheet(scene, 'linker', [{ name: 'l0', c: makeSprite(16, 14, x => drawLinker(x, 0, false)) }, { name: 'l1', c: makeSprite(16, 14, x => drawLinker(x, 1, false)) },
                             { name: 'lc', c: makeSprite(16, 14, x => drawLinker(x, 0, true)) }], 16, 14, true);
  // ---- crucible round ----
  for (const [key, broken] of [['mirror', false], ['mirrorb', true]]) {
    const mf = [
      { name: 'idle0', c: makeSprite(22, 24, x => drawMirror(x, 0, [1, 0], [-1, 0], 'walk', broken)) },
      { name: 'idle1', c: makeSprite(22, 24, x => drawMirror(x, 1, [1, 0], [-1, 0], 'walk', broken)) },
      { name: 'bash', c: makeSprite(22, 24, x => drawMirror(x, 1, [3, 0], [-3, 0], 'bash', broken)) },
      { name: 'stagger', c: makeSprite(22, 24, x => drawMirror(x, 1, [0, 0], [-2, 0], 'stagger', broken)) },
    ];
    for (let i = 0; i < 6; i++) mf.push({ name: 'run' + i, c: makeSprite(22, 24, x => drawMirror(x, RUN_BOB[i], shortStride(RUN_LEGS[i]), shortStride(RUN_LEGS[(i + 3) % 6]), 'walk', broken)) });
    addSheet(scene, key, mf, 22, 24, true);
  }
  addSheet(scene, 'hive', [{ name: 'h0', c: makeSprite(22, 22, x => drawHive(x, 0)) }, { name: 'h1', c: makeSprite(22, 22, x => drawHive(x, 1)) }], 22, 22, true);
  addSheet(scene, 'gnat', [{ name: 'n0', c: makeSprite(7, 6, x => drawGnat(x, 0)) }, { name: 'n1', c: makeSprite(7, 6, x => drawGnat(x, 1)) }], 7, 6, true);
  addSheet(scene, 'stitcher', [{ name: 's0', c: makeSprite(18, 16, x => drawStitcher(x, 0, false)) }, { name: 's1', c: makeSprite(18, 16, x => drawStitcher(x, 1, false)) },
                               { name: 'sc', c: makeSprite(18, 16, x => drawStitcher(x, 0, true)) }], 18, 16, true);
  addSheet(scene, 'wyrm', [{ name: 'o', c: makeSprite(28, 26, x => drawWyrmHead(x, true)) }, { name: 'c', c: makeSprite(28, 26, x => drawWyrmHead(x, false)) }], 28, 26, true);
  addSheet(scene, 'wyrmseg', [{ name: 'a', c: makeSprite(20, 20, x => drawWyrmSeg(x, false)) }, { name: 'b', c: makeSprite(20, 20, x => drawWyrmSeg(x, true)) }], 20, 20, true);
  addTex(scene, 'coil', makeSprite(9, 12, c => {
    R(c, '#3a3f47', 1, 9, 7, 3); R(c, '#6a7380', 1, 9, 7, 1); R(c, '#4a525c', 3, 2, 3, 7);
    for (let i = 0; i < 3; i++) R(c, i % 2 ? '#b8732a' : '#e09a48', 2, 3 + i * 2, 5, 1);
    R(c, '#6ad0ff', 3, 0, 3, 2); R(c, '#e0f8ff', 4, 0, 1, 1);
  }));
  addTex(scene, 'shard', makeSprite(5, 3, c => { R(c, '#ff8a20', 0, 1, 3, 1); R(c, '#ffe080', 2, 0, 2, 3); R(c, '#ffffff', 4, 1); }, null));
  addSheet(scene, 'buzzsaw', [{ name: 'z0', c: makeSprite(16, 16, drawBuzzsaw) }], 16, 16, true);
  addSheet(scene, 'magnet', [{ name: 'm0', c: makeSprite(18, 18, x => drawMagnet(x, false)) }, { name: 'mh', c: makeSprite(18, 18, x => drawMagnet(x, true)) }], 18, 18, true);
  const tsf = [{ name: 'idle', c: makeSprite(18, 24, x => drawTarspit(x, 0, [1, 0], [-1, 0], 'idle')) }, { name: 'crouch', c: makeSprite(18, 24, x => drawTarspit(x, 1, [2, 0], [-2, 0], 'crouch')) },
               { name: 'lunge', c: makeSprite(18, 24, x => drawTarspit(x, 0, [3, 0], [-2, 0], 'lunge')) }, { name: 'air', c: makeSprite(18, 24, x => drawTarspit(x, 0, [3, 3], [-2, 1], 'idle')) }];
  for (let i = 0; i < 6; i++) tsf.push({ name: 'run' + i, c: makeSprite(18, 24, x => drawTarspit(x, RUN_BOB[i], RUN_LEGS[i], RUN_LEGS[(i + 3) % 6], 'idle')) });
  addSheet(scene, 'tarspit', tsf, 18, 24, true);
  addSheet(scene, 'mimic', [{ name: 'h', c: makeSprite(14, 18, x => drawMimic(x, 'h', 0)) }, { name: 'o0', c: makeSprite(14, 18, x => drawMimic(x, 'o', 0)) },
                            { name: 'o1', c: makeSprite(14, 18, x => drawMimic(x, 'o', 1)) }, { name: 'bite', c: makeSprite(14, 18, x => drawMimic(x, 'bite', 0)) }], 14, 18, true);
  addSheet(scene, 'howitzer', ['w0', 'w1', 'plant', 'fire'].map(f => ({ name: f, c: makeSprite(26, 22, x => drawHowitzer(x, f)) })), 26, 22, true);
  addSheet(scene, 'blinker', ['b0', 'b1', 'dash'].map(f => ({ name: f, c: makeSprite(16, 20, x => drawBlinker(x, f)) })), 16, 20, true);
  addSheet(scene, 'cinder', ['w0', 'w1'].map(f => ({ name: f, c: makeSprite(16, 16, x => drawCinder(x, f)) })), 16, 16, true);
  addSheet(scene, 'gatling', ['w0', 'w1', 'fire', 'fire2'].map(f => ({ name: f, c: makeSprite(22, 24, x => drawGatling(x, f)) })), 22, 24, true);
  addSheet(scene, 'banner', ['w0', 'w1', 'plant'].map(f => ({ name: f, c: makeSprite(16, 26, x => drawBanner(x, f)) })), 16, 26, true);
  addSheet(scene, 'bulldozer', ['w0', 'w1'].map(f => ({ name: f, c: makeSprite(26, 20, x => drawBulldozer(x, f)) })), 26, 20, true);
  addSheet(scene, 'copycat', ['c0', 'c1'].map(f => ({ name: f, c: makeSprite(16, 14, x => drawCopycat(x, f)) })), 16, 14, true);
  addSheet(scene, 'jelly', ['j0', 'j1'].map(f => ({ name: f, c: makeSprite(16, 20, x => drawJelly(x, f)) })), 16, 20, true);
  addSheet(scene, 'porcupine', ['w0', 'w1', 'bristle'].map(f => ({ name: f, c: makeSprite(20, 16, x => drawPorcupine(x, f)) })), 20, 16, true);
  addSheet(scene, 'sponge', ['w0', 'w1'].map(f => ({ name: f, c: makeSprite(20, 20, x => drawSponge(x, f)) })), 20, 20, true);
  addSheet(scene, 'leaper', ['w0', 'crouch', 'air'].map(f => ({ name: f, c: makeSprite(18, 18, x => drawLeaper(x, f)) })), 18, 18, true);
  addSheet(scene, 'zealot', ['w0', 'w1', 'cast'].map(f => ({ name: f, c: makeSprite(16, 24, x => drawZealot(x, f)) })), 16, 24, true);
  addSheet(scene, 'minelayer', ['m0', 'm1'].map(f => ({ name: f, c: makeSprite(20, 12, x => drawMinelayer(x, f)) })), 20, 12, true);
  addSheet(scene, 'ratking', ['w0', 'w1'].map(f => ({ name: f, c: makeSprite(22, 16, x => drawRatking(x, f)) })), 22, 16, true);
  addSheet(scene, 'ratbot', ['r0', 'r1'].map(f => ({ name: f, c: makeSprite(8, 6, x => drawRatbot(x, f)) })), 8, 6, true);
  addSheet(scene, 'headsman', ['w0', 'w1', 'raise', 'chop', 'stuck'].map(f => ({ name: f, c: makeSprite(24, 28, x => drawHeadsman(x, f)) })), 24, 28, true);
  addSheet(scene, 'berserker', ['w0', 'w1', 'swing'].map(f => ({ name: f, c: makeSprite(18, 24, x => drawBerserker(x, f)) })), 18, 24, true);
  addSheet(scene, 'bastion', ['w0', 'w1', 'cast'].map(f => ({ name: f, c: makeSprite(18, 22, x => drawBastion(x, f)) })), 18, 22, true);
  addSheet(scene, 'shellback', ['w0', 'w1', 'tell', 'flip', 'flip2'].map(f => ({ name: f, c: makeSprite(22, 16, x => drawShellback(x, f)) })), 22, 16, true);
  addSheet(scene, 'shinobi', ['w0', 'w1', 'air', 'cling'].map(f => ({ name: f, c: makeSprite(16, 22, x => drawShinobi(x, f)) })), 16, 22, true);
  addSheet(scene, 'thundercloud', ['c0', 'c1'].map(f => ({ name: f, c: makeSprite(26, 14, x => drawThunder(x, f)) })), 26, 14, true);
  addSheet(scene, 'foreman', ['w0', 'w1', 'slam', 'magnet'].map(f => ({ name: f, c: makeSprite(44, 36, x => drawForeman(x, f)) })), 44, 36, true);
  genExpansionBossArt(scene);
  addSheet(scene, 'vortex', ['v0', 'v1', 'spin'].map(f => ({ name: f, c: makeSprite(18, 18, x => drawVortex(x, f)) })), 18, 18, true);
  addSheet(scene, 'pylon', ['p0', 'p1'].map(f => ({ name: f, c: makeSprite(16, 28, x => drawPylon(x, f)) })), 16, 28, true);
  addSheet(scene, 'scavenger', ['w0', 'w1', 'eat'].map(f => ({ name: f, c: makeSprite(20, 18, x => drawScavenger(x, f)) })), 20, 18, true);
  addSheet(scene, 'torcher', ['w0', 'w1', 'spray'].map(f => ({ name: f, c: makeSprite(22, 24, x => drawTorcher(x, f)) })), 22, 24, true);
  addSheet(scene, 'discus', ['w0', 'w1', 'throw'].map(f => ({ name: f, c: makeSprite(16, 24, x => drawDiscus(x, f)) })), 16, 24, true);
  addSheet(scene, 'sporepod', ['p0', 'p1', 'puff'].map(f => ({ name: f, c: makeSprite(20, 18, x => drawSporepod(x, f)) })), 20, 18, true);
  addSheet(scene, 'grappler', ['w0', 'w1', 'tell', 'grab', 'hold'].map(f => ({ name: f, c: makeSprite(22, 26, x => drawGrappler(x, f)) })), 22, 26, true);
  addSheet(scene, 'spotter', ['s0', 's1'].map(f => ({ name: f, c: makeSprite(16, 14, x => drawSpotter(x, f)) })), 16, 14, true);
  addSheet(scene, 'hound', ['r0', 'r1', 'crouch', 'leap'].map(f => ({ name: f, c: makeSprite(22, 14, x => drawHound(x, f)) })), 22, 14, true);
  addSheet(scene, 'orbiter', ['o0', 'o1', 'fire'].map(f => ({ name: f, c: makeSprite(16, 16, x => drawOrbiter(x, f)) })), 16, 16, true);
  addSheet(scene, 'swapper', ['w0', 'w1', 'tell'].map(f => ({ name: f, c: makeSprite(16, 24, x => drawSwapper(x, f)) })), 16, 24, true);
  addSheet(scene, 'scorcher', ['r0', 'r1', 'pant'].map(f => ({ name: f, c: makeSprite(18, 22, x => drawScorcher(x, f)) })), 18, 22, true);
  addSheet(scene, 'wraith', ['f0', 'f1', 'tell'].map(f => ({ name: f, c: makeSprite(18, 22, x => drawWraith(x, f)) })), 18, 22, true);
  addSheet(scene, 'chiller', ['w0', 'w1', 'throw'].map(f => ({ name: f, c: makeSprite(18, 24, x => drawChiller(x, f)) })), 18, 24, true);
  addSheet(scene, 'warhorn', ['w0', 'w1', 'blow'].map(f => ({ name: f, c: makeSprite(20, 20, x => drawWarhorn(x, f)) })), 20, 20, true);
  addSheet(scene, 'lugger', ['w0', 'w1', 'carry', 'throw'].map(f => ({ name: f, c: makeSprite(22, 26, x => drawLugger(x, f)) })), 22, 26, true);
  addSheet(scene, 'blimp', ['b0', 'b1'].map(f => ({ name: f, c: makeSprite(34, 20, x => drawBlimp(x, f)) })), 34, 20, true);
  addSheet(scene, 'strider', ['w0', 'w1', 'fire'].map(f => ({ name: f, c: makeSprite(20, 36, x => drawStrider(x, f)) })), 20, 36, true);
  genExpansionArenaArt(scene);                                        // ARENAS 06-10: their machinery
  const grf = [{ name: 'idle', c: makeSprite(18, 24, x => drawGrenadier(x, 0, [1, 0], [-1, 0], 'idle')) }, { name: 'crouch', c: makeSprite(18, 24, x => drawGrenadier(x, 1, [2, 0], [-2, 0], 'crouch')) },
               { name: 'lunge', c: makeSprite(18, 24, x => drawGrenadier(x, 0, [3, 0], [-3, 0], 'lunge')) }, { name: 'air', c: makeSprite(18, 24, x => drawGrenadier(x, 0, [3, 3], [-2, 1], 'idle')) }];
  for (let i = 0; i < 6; i++) grf.push({ name: 'run' + i, c: makeSprite(18, 24, x => drawGrenadier(x, RUN_BOB[i], RUN_LEGS[i], RUN_LEGS[(i + 3) % 6], 'idle')) });
  addSheet(scene, 'grenadier', grf, 18, 24, true);
  addSheet(scene, 'spikeball', ['k0', 'k1'].map(f => ({ name: f, c: makeSprite(14, 14, x => drawSpikeball(x, f)) })), 14, 14, true);
  addSheet(scene, 'para', ['drop', 'w0', 'w1'].map(f => ({ name: f, c: makeSprite(16, 22, x => drawPara(x, f)) })), 16, 22, true);
  genExpansionEnemyArt(scene);
  addTex(scene, 'enade', makeSprite(5, 6, c => { R(c, '#4a5a2a', 0, 1, 5, 5); R(c, '#6a7a40', 1, 1, 2, 1); R(c, '#8a94a0', 1, 0, 3, 1); }));
  addTex(scene, 'supply', makeSprite(14, 12, c => { R(c, '#5a4a28', 0, 0, 14, 12); R(c, '#7a6a38', 1, 1, 12, 1); R(c, '#3a3018', 0, 11, 14, 1); R(c, '#e8e0d0', 5, 3, 4, 6); R(c, '#e8e0d0', 3, 5, 8, 2); R(c, '#c83020', 6, 4, 2, 4); R(c, '#c83020', 4, 5, 6, 2); }));
  addTex(scene, 'capsule', makeSprite(9, 9, c => { for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) { const d = Math.hypot(x + 0.5 - 4.5, y + 0.5 - 4.5); if (d < 4.3) R(c, d > 3.2 ? '#8a94a0' : '#ffffff', x, y); } }));
  addSheet(scene, 'beacon', ['b0', 'b1'].map(f => ({ name: f, c: makeSprite(14, 16, x => drawBeacon(x, f)) })), 14, 16, true);
  addSheet(scene, 'slug', ['s0', 's1', 'spit'].map(f => ({ name: f, c: makeSprite(18, 10, x => drawSlug(x, f)) })), 18, 10, true);
  addSheet(scene, 'leech', ['l0', 'l1'].map(f => ({ name: f, c: makeSprite(10, 8, x => drawLeech(x, f)) })), 10, 8, true);
  addTex(scene, 'acidglob', makeSprite(6, 6, c => { R(c, '#4aa020', 1, 1, 4, 4); R(c, '#9aff4a', 2, 1, 2, 2); R(c, '#e0ff90', 2, 1, 1, 1); }));
  addTex(scene, 'spider0', makeSprite(9, 6, c => { R(c, '#3a3f47', 2, 1, 5, 3); R(c, '#8a94a0', 3, 1, 3, 1); R(c, '#ff3020', 6, 2, 1, 1); for (const x of [1, 3, 5, 7]) R(c, '#22262c', x, 4, 1, 2); }));
  addTex(scene, 'spider1', makeSprite(9, 6, c => { R(c, '#3a3f47', 2, 1, 5, 3); R(c, '#8a94a0', 3, 1, 3, 1); R(c, '#ff3020', 6, 2, 1, 1); for (const x of [0, 2, 6, 8]) R(c, '#22262c', x, 4, 1, 2); }));
  addTex(scene, 'napalmcan', makeSprite(7, 5, c => { R(c, '#8a3a10', 0, 1, 7, 3); R(c, '#d86a18', 1, 1, 5, 1); R(c, '#2a2e35', 6, 1, 1, 3); }));
  addSheet(scene, 'pilferer', ['p0', 'p1'].map(f => ({ name: f, c: makeSprite(14, 10, x => drawPilferer(x, f)) })), 14, 10, true);
  addSheet(scene, 'pogo', ['c', 'up', 'slam'].map(f => ({ name: f, c: makeSprite(16, 18, x => drawPogo(x, f)) })), 16, 18, true);
  addSheet(scene, 'claw', ['open', 'closed'].map(f => ({ name: f, c: makeSprite(16, 12, x => drawClaw(x, f)) })), 16, 12, true);
  addSheet(scene, 'sparker', ['s0', 's1'].map(f => ({ name: f, c: makeSprite(12, 12, x => drawSparker(x, f)) })), 12, 12, true);
  addSheet(scene, 'golem', ['g0', 'g1', 'throw', 'slam'].map(f => ({ name: f, c: makeSprite(28, 30, x => drawGolem(x, f)) })), 28, 30, true);
  genExpansionWeaponArt(scene);
  addTex(scene, 'netball', makeSprite(7, 7, c => { R(c, '#8a8070', 1, 1, 5, 5); R(c, '#c8c0a8', 1, 1, 5, 1); R(c, '#c8c0a8', 1, 3, 5, 1); R(c, '#c8c0a8', 3, 1, 1, 5); R(c, '#4a4438', 2, 5, 3, 1); }));
  addTex(scene, 'flailball', makeSprite(11, 11, c => { R(c, '#3a3f47', 3, 3, 5, 5); R(c, '#8a94a0', 4, 3, 3, 1); for (const [x, y] of [[5, 0], [5, 9], [0, 5], [9, 5], [1, 1], [8, 1], [1, 8], [8, 8]]) R(c, '#c8ced6', x, y, 2, 2); }));
  addTex(scene, 'scrap', makeSprite(7, 6, c => { R(c, '#5a636e', 1, 1, 5, 4); R(c, '#7a4a30', 2, 2, 3, 2); R(c, '#8a94a0', 1, 1, 3, 1); }));
  addSheet(scene, 'creeper', ['c0', 'c1', 'drop'].map(f => ({ name: f, c: makeSprite(16, 10, x => drawCreeper(x, f)) })), 16, 10, true);
  addSheet(scene, 'roller', ['r0', 'r1', 'ball'].map(f => ({ name: f, c: makeSprite(18, 18, x => drawRoller(x, f)) })), 18, 18, true);
  addSheet(scene, 'jammer', ['j0', 'jh'].map(f => ({ name: f, c: makeSprite(16, 14, x => drawJammer(x, f)) })), 16, 14, true);
  addTex(scene, 'flare', makeSprite(5, 5, c => { R(c, '#ffffff', 1, 1, 3, 3); R(c, '#ffe080', 0, 2, 5, 1); R(c, '#ffe080', 2, 0, 1, 5); }));
  addTex(scene, 'limpet', makeSprite(6, 5, c => { R(c, '#3a3f47', 0, 1, 6, 4); R(c, '#6a7380', 1, 1, 4, 1); R(c, '#c8a040', 1, 3, 4, 1); }));
  addTex(scene, 'pipe', makeSprite(8, 10, c => { R(c, '#4b535e', 0, 2, 8, 6); R(c, '#8a94a0', 0, 2, 8, 1); R(c, '#2a2e35', 0, 7, 8, 1); R(c, '#c8a040', 5, 0, 2, 10); R(c, '#ff4020', 2, 4, 2, 2); }));
  addTex(scene, 'pipeb', makeSprite(8, 10, c => { R(c, '#3a3f47', 0, 2, 5, 6); R(c, '#5a636e', 0, 2, 5, 1); R(c, '#1a1e24', 4, 3, 2, 4); R(c, '#c8a040', 5, 0, 2, 3); R(c, '#c8a040', 5, 7, 2, 3); }));
  addSheet(scene, 'gasbag', ['g0', 'g1', 'swell'].map(f => ({ name: f, c: makeSprite(18, 20, x => drawGasbag(x, f)) })), 18, 20, true);
  addSheet(scene, 'welder', ['w0', 'w1', 'weld'].map(f => ({ name: f, c: makeSprite(18, 20, x => drawWelder(x, f)) })), 18, 20, true);
  addSheet(scene, 'turret', [{ name: 't0', c: makeSprite(14, 10, drawTurret) }], 14, 10, true);
  const duf = [{ name: 'idle', c: makeSprite(18, 24, x => drawDuelist(x, 0, [1, 0], [-1, 0], 'idle')) }, { name: 'crouch', c: makeSprite(18, 24, x => drawDuelist(x, 1, [2, 0], [-2, 0], 'crouch')) },
               { name: 'lunge', c: makeSprite(18, 24, x => drawDuelist(x, 0, [3, 0], [-3, 0], 'lunge')) }, { name: 'air', c: makeSprite(18, 24, x => drawDuelist(x, 0, [3, 3], [-2, 1], 'idle')) }];
  for (let i = 0; i < 6; i++) duf.push({ name: 'run' + i, c: makeSprite(18, 24, x => drawDuelist(x, RUN_BOB[i], RUN_LEGS[i], RUN_LEGS[(i + 3) % 6], 'idle')) });
  addSheet(scene, 'duelist', duf, 18, 24, true);
  addTex(scene, 'drill0', makeSprite(11, 5, c => { R(c, '#5a636e', 0, 1, 5, 3); R(c, '#8a94a0', 0, 1, 5, 1); R(c, '#d8dee6', 5, 1, 3, 3); R(c, '#d8dee6', 8, 2, 2, 1); R(c, '#4b535e', 6, 1, 1, 3); R(c, '#4b535e', 8, 2, 1, 1); R(c, '#ffffff', 10, 2, 1, 1); }));
  addTex(scene, 'drill1', makeSprite(11, 5, c => { R(c, '#5a636e', 0, 1, 5, 3); R(c, '#8a94a0', 0, 1, 5, 1); R(c, '#d8dee6', 5, 1, 3, 3); R(c, '#d8dee6', 8, 2, 2, 1); R(c, '#4b535e', 5, 1, 1, 3); R(c, '#4b535e', 7, 1, 1, 3); R(c, '#ffffff', 10, 2, 1, 1); }));
  addTex(scene, 'tarblob', makeSprite(7, 6, c => { R(c, '#1a1410', 1, 1, 5, 4); R(c, '#4a3c30', 2, 1, 2, 1); R(c, '#0a0806', 1, 4, 5, 1); }));
  addTex(scene, 'hporb', makeSprite(7, 7, c => { for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) { const d = Math.hypot(x + 0.5 - 3.5, y + 0.5 - 3.5); if (d < 3.3) R(c, d < 1.2 ? '#ffffff' : d < 2.3 ? '#9dff9a' : '#2ad05a', x, y); } }, null));
  ART.levelBase = drawLevelArt(LEVEL_GRID);
  for (const A of new Set([...ARENAS, ...CAMPAIGN_ARENAS, ...Object.values(LAB_ROOMS).map(room => room.arena)])) A.art = drawLevelArt(A.grid, A.decor, A.paint);
}
const ART = { levelBase: null };
let NAV = buildNav(LEVEL_GRID);                    // rebuilt whenever the terrain breaks

