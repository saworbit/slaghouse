// ---- ragdoll parts: cut from each walker's own drawing so a corpse matches the living sprite ----------
// boxes are [x, y, w, h] in the source frame. 'up' = stands on a vertical spine; the husk lies along a horizontal one.
// clear = regions wiped before cutting (arms/shields that become their own pieces). hp = corpse toughness.
const RAG = {
  grunt:    { up: false, hp: 35, fw: 20, fh: 18, body: x => drawGrunt(x, 1, false), head: [12, 5, 6, 6], torso: [3, 2, 9, 10],
              leg: x => { for (let y = 12; y < 16; y++) R(x, EP.f, 10, y, 2, 1); R(x, EP.m, 10, 16, 3, 1); R(x, EP.bone, 13, 16); }, thigh: [10, 12, 2, 2], shin: [10, 14, 4, 3] },
  heavy:    { up: true, hp: 90, fw: 28, fh: 28, body: x => drawHeavy(x, 1, false), clear: [[2, 13, 5, 11], [21, 13, 5, 11]], head: [12, 3, 7, 6], torso: [2, 8, 24, 12],
              leg: x => { for (let y = 19; y < 25; y++) { R(x, EP.m, 15, y, 4, 1); R(x, EP.ml, 15, y, 1, 1); } R(x, EP.m, 14, 25, 6, 2); R(x, EP.ml, 14, 25, 6, 1); },
              thigh: [15, 19, 4, 3], shin: [14, 22, 6, 5], armBox: [2, 13, 6, 11] },
  enforcer: { up: true, hp: 40, fw: 18, fh: 24, body: x => drawEnforcer(x, 0, [0, 0], [0, 0]), head: [4, 0, 11, 8], torso: [2, 8, 13, 7], P: ENLEG, legW: 3 },
  sniper:   { up: true, hp: 35, fw: 18, fh: 24, body: x => drawSniper(x, 0, [0, 0], [0, 0]), head: [4, 0, 10, 8], torso: [3, 8, 11, 7], P: SNLEG, legW: 3 },
  stalker:  { up: true, hp: 35, fw: 20, fh: 24, body: x => drawStalker(x, 0, [0, 0], [0, 0], 'idle'), clear: [[4, 10, 2, 8], [12, 10, 3, 8]], head: [5, 1, 9, 7], torso: [6, 8, 7, 8], P: STLEG, legW: 2, blade: true },
  bulwark:  { up: true, hp: 55, fw: 22, fh: 24, body: x => drawBulwark(x, 0, [0, 0], [0, 0], 'walk'), clear: [[14, 0, 8, 24]], head: [5, 0, 9, 7], torso: [3, 7, 11, 8], P: BWLEG, legW: 3 },
};
function buildRagParts(scene) {
  const put = (key, c) => { addTex(scene, key, c); addTex(scene, key + '_w', whiteCopy(c)); };   // + white hit-flash copy
  for (const kind in RAG) {
    const D = RAG[kind], lw = D.legW || 3;
    const full = makeSprite(D.fw, D.fh, D.body, null), src = makeSprite(D.fw, D.fh, D.body, null), sx = src.getContext('2d');
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
    if (D.armBox) put(`rg_${kind}_arm`, cut(full, D.armBox));
    else if (D.P) put(`rg_${kind}_arm`, makeSprite(D.blade ? 4 : 5, D.blade ? 11 : 9, c => {
      if (D.blade) { R(c, ST.skin, 1, 1, 2, 5); R(c, ST.skinD, 2, 1, 1, 5); R(c, ST.blade, 2, 6, 1, 4); R(c, ST.bladeHi, 2, 6, 1, 1); }
      else { const P = D.P; R(c, P.b, 1, 1, 3, 5); R(c, P.c, 1, 1, 1, 5); R(c, P.a, 3, 1, 1, 5); R(c, P.k, 1, 6, 3, 2); }
    }, '#06070a'));
  }
}
