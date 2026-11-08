// ---- frenzy-update enemies & gear -----------------------------------------------------
function drawScreamer(ctx, f, wind) {                // 14x12 burning kamikaze skull, faces right
  const fl = f ? ['#ffe46a', '#ff8a1f', '#c03010'] : ['#fff0a0', '#ffb040', '#e05018'];
  R(ctx, fl[2], 0, 4 + f, 3, 4); R(ctx, fl[1], 1, 4, 3, 4); R(ctx, fl[0], 3, 5, 2, 2);               // flame tail
  R(ctx, '#d8d0b8', 4, 1, 8, 7); R(ctx, '#f0ead8', 5, 1, 5, 2); R(ctx, '#a89f80', 4, 7, 8, 1);        // skull
  R(ctx, '#1a0a08', 8, 3, 2, 2); R(ctx, '#1a0a08', 11, 3, 1, 2);
  R(ctx, wind ? '#ffffff' : '#ff4020', 8, 3, 1, 1); R(ctx, wind ? '#ffffff' : '#ff4020', 11, 3, 1, 1);   // burning eyes
  R(ctx, '#1a0a08', 10, 5, 1, 1);
  if (wind) { R(ctx, '#1a0a08', 7, 8, 5, 2); R(ctx, '#d8d0b8', 6, 10, 6, 1); R(ctx, '#ffffff', 8, 8, 1, 1); R(ctx, '#ffffff', 10, 8, 1, 1); }   // shrieking
  else { R(ctx, '#c8bea0', 6, 8, 6, 2); R(ctx, '#1a0a08', 7, 8, 1, 1); R(ctx, '#1a0a08', 9, 8, 1, 1); R(ctx, '#1a0a08', 11, 8, 1, 1); }
}
function drawWarden(ctx, f) {                        // 18x16 shield-projector drone
  R(ctx, '#3a4250', 4, 6, 10, 6); R(ctx, '#5a6474', 5, 6, 8, 1); R(ctx, '#232830', 4, 11, 10, 1);     // hull
  R(ctx, '#40d0ff', 7, 8, 4, 2); R(ctx, '#c8f8ff', 8, 8, 2, 1);                                       // core
  R(ctx, '#6a7484', 8, 3, 2, 3); R(ctx, '#8a94a6', 5, 1, 8, 2); R(ctx, '#c0c8d4', 6, 1, 6, 1); R(ctx, '#40d0ff', 8, 0, 2, 1);   // dish
  const fy = f ? 12 : 13;
  R(ctx, '#2a2e35', 3, fy, 3, 2); R(ctx, '#2a2e35', 12, fy, 3, 2); R(ctx, '#40d0ff', 4, fy + 2, 1, 1); R(ctx, '#40d0ff', 13, fy + 2, 1, 1);
  R(ctx, '#2a2e35', 1, 8, 3, 2); R(ctx, '#2a2e35', 14, 8, 3, 2);
}
function drawJugg(ctx, phase, stage) {               // 32x30 juggernaut; stage 0 armoured, 1 cracked, 2 stripped
  const L = [[2, 0, -2, 0], [0, 0, 0, 1], [-2, 0, 2, 0], [0, 1, 0, 0]][phase];
  const leg = (hx, off, lift, back) => {
    const fy = 27 - lift;
    for (let y = 20; y < fy; y++) { const lx = Math.round(hx + off * (y - 20) / Math.max(1, fy - 21)); R(ctx, back ? '#2a2e35' : '#4a525c', lx - 2, y, 5, 1); if (!back) R(ctx, '#6a7380', lx - 2, y, 1, 1); }
    R(ctx, back ? '#22262c' : '#3a414b', hx + off - 3, fy, 7, 3); R(ctx, back ? '#3a414b' : '#8a94a0', hx + off - 3, fy, 7, 1);
  };
  leg(12, L[2], L[3], true);
  R(ctx, '#5a2a22', 8, 8, 16, 13); R(ctx, '#7a3b30', 9, 9, 10, 3); R(ctx, '#3e1a14', 8, 19, 16, 2);     // the meat inside
  if (stage < 2) {
    R(ctx, '#3a414b', 7, 7, 18, 14); R(ctx, '#5a636e', 8, 7, 16, 1); R(ctx, '#22262c', 7, 20, 18, 1);     // chest plate
    for (let i = 0; i < 5; i++) R(ctx, i % 2 ? '#15161a' : '#e8b422', 9 + i * 3, 15, 3, 2);
    for (const [x, y] of [[9, 9], [22, 9], [9, 18], [22, 18]]) R(ctx, '#8a94a0', x, y);
  }
  if (stage === 1) { R(ctx, '#7a3b30', 10, 8, 4, 4); R(ctx, '#c03030', 11, 9, 1, 1); R(ctx, '#15161a', 14, 9, 1, 5); R(ctx, '#15161a', 15, 13, 3, 1); }   // cracked open
  if (stage < 2) { R(ctx, '#4a525c', 3, 5, 8, 6); R(ctx, '#8a94a0', 3, 5, 8, 1); R(ctx, '#2a2e35', 3, 10, 8, 1); }
  else { R(ctx, '#7a3b30', 4, 7, 6, 5); R(ctx, '#ddd3b0', 6, 8, 1, 1); R(ctx, '#c03030', 5, 10, 2, 1); }
  if (stage === 0) { R(ctx, '#4a525c', 21, 5, 8, 6); R(ctx, '#8a94a0', 21, 5, 8, 1); R(ctx, '#2a2e35', 21, 10, 8, 1); }
  else { R(ctx, '#7a3b30', 22, 7, 6, 5); R(ctx, '#c03030', 24, 9, 2, 1); }
  R(ctx, '#3a414b', 12, 0, 9, 8); R(ctx, '#5a636e', 13, 0, 7, 1); R(ctx, '#15171a', 15, 3, 6, 2); R(ctx, '#ff3020', 16, 3, 4, 1); R(ctx, '#22262c', 12, 7, 9, 1);   // helm
  leg(20, L[0], L[1], false);
}
function drawJuggGun(ctx, alt) {                     // 30x12 minigun, pivot (4,6)
  R(ctx, '#2a2e35', 2, 3, 10, 7); R(ctx, '#4a525c', 2, 3, 10, 1); R(ctx, '#5a4a2a', 4, 8, 6, 4); R(ctx, '#8a7040', 4, 8, 6, 1);
  R(ctx, '#3a414b', 12, 3, 3, 6);
  for (let i = 0; i < 3; i++) R(ctx, (i + (alt ? 1 : 0)) % 2 ? '#9aa4b0' : '#5a636e', 15, 4 + i * 2, 13, 1);
  R(ctx, '#23272d', 15, 5, 13, 1); R(ctx, '#23272d', 15, 7, 13, 1); R(ctx, '#6a7380', 27, 3, 2, 7);
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
