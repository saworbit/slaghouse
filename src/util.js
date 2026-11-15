// =============================================================================
//  SMALL UTILITIES
// =============================================================================
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[(Math.random() * arr.length) | 0];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const approach = (v, t, d) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t));
const DEG = Math.PI / 180;
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

