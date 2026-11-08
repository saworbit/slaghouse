// ---- shaded-volume helpers: lit from the top-left, quantised to a colour ramp ----------
const LIGHT3 = (() => { const l = [-0.5, -0.75, 0.45], m = Math.hypot(...l); return l.map(v => v / m); })();
const shadeIdx = (n, I, bias) => clamp(Math.floor((I * 0.55 + 0.42 + bias) * n), 0, n - 1);
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
function limb(ctx, x0, y0, x1, y1, r0, r1, ramp, bias = 0) {             // tapered capsule shaded as a cylinder
  const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1, rm = Math.max(r0, r1);
  for (let y = Math.floor(Math.min(y0, y1) - rm); y <= Math.ceil(Math.max(y0, y1) + rm); y++)
    for (let x = Math.floor(Math.min(x0, x1) - rm); x <= Math.ceil(Math.max(x0, x1) + rm); x++) {
      const px = x + 0.5 - x0, py = y + 0.5 - y0, t = clamp((px * dx + py * dy) / L2, 0, 1);
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
const IRN = ['#0f1115', '#1b1f26', '#2a2f38', '#3d4450', '#555e6c', '#727d8c', '#9aa5b4', '#c4ccd6'];
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
    limb(c, bx, byy, ex, ey, 3.8, 3.2, IRN, 0);
    limb(c, bx + ux * 0.45, byy + uy * 0.45, bx + ux * 0.58, byy + uy * 0.58, 4, 4, HAZ, -0.05);   // hazard band
    limb(c, ex - ca * 2, ey - sa * 2, ex, ey, 4.2, 4.2, IRN, 0.12);          // muzzle collar
    R(c, IRN[0], Math.round(ex + ca * 1.5 - 1), Math.round(ey + sa * 1.5 - 1), 2, 2);
    R(c, MLT[hot ? 7 : 4], Math.round(ex + ca * 1.5 - 0.5), Math.round(ey + sa * 1.5 - 0.5), 1, 1);
    blob(c, sx, sy, 5.6, 4.8, IRN, 2.2, 0.14);                              // pauldron
    R(c, IRN[7], sx - 2, sy - 3, 2, 1); R(c, IRN[2], sx - 4, sy + 2, 8, 1);
  });
}
