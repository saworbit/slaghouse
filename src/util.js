// =============================================================================
//  SMALL UTILITIES
// =============================================================================
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[(Math.random() * arr.length) | 0];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const approach = (v, t, d) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t));
const DEG = Math.PI / 180;
// Cosmetic randomness. An effect that changes nothing in play (a spark, a glint, a HUD wobble) draws from this
// generator instead of Math.random, so the seeded campaign runs, which seed Math.random, play out the same with or
// without it. Never use it for anything that moves, hurts or decides.
const fxRandom = (() => { let s = 0x2f6b9d1; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
const crand = (a, b) => a + fxRandom() * (b - a);
const cpick = arr => arr[(fxRandom() * arr.length) | 0];
function hash2(x, y) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}
const BUS = new Phaser.Events.EventEmitter();      // Game -> HUD messages
const BLOOD_NUM = [0x9a1414, 0x7a0c0c, 0x5c0808, 0xb01c1c];
const BLOOD_CSS = ['#9a1414', '#7a0c0c', '#5c0808', '#6e0a0a'];
const cssCache = {};
const numCss = n => cssCache[n] || (cssCache[n] = '#' + n.toString(16).padStart(6, '0'));

