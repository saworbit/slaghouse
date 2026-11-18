// Builds slaghouse.html from the files in src/ (#7). Plain concatenation in the order below, no bundler, so the
// page stays one self-contained file that plays exactly as it did. Edit the files in src/, then run this.
//   node src/join.mjs            write slaghouse.html
//   node src/join.mjs --check    write nothing; exit 1 if slaghouse.html isn't what src/ builds (dev/check.mjs, CI)
// The parts split along the section banners in the code: the page and its header comment, config and tuning,
// small utilities, audio, the pixel font, procedural art, particles, the boot and title scenes, GameScene, the HUD,
// the Lab panel and the boot code, then the page's closing tags. GameScene is the class in game.js plus four parts
// that add methods to it after it (#166): weapons, enemies, the world and the campaign.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const PARTS = ['page-head.html', 'config.js', 'util.js', 'audio.js', 'font.js', 'art.js', 'particles.js', 'scenes.js',
  'game.js', 'game-weapons.js', 'game-enemies.js', 'game-world.js', 'game-campaign.js', 'hud.js', 'lab.js', 'boot.js', 'page-tail.html'];
const here = dirname(fileURLToPath(import.meta.url));
export const OUT = join(here, '..', 'slaghouse.html');
export const build = () => Buffer.concat(PARTS.map(f => readFileSync(join(here, f))));

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const built = build();
  if (process.argv.includes('--check')) {
    let now = null;
    try { now = readFileSync(OUT); } catch { /* missing */ }
    if (!now || Buffer.compare(now, built)) {
      console.error('join: slaghouse.html is not what src/ builds. Edit src/ and run node src/join.mjs.');
      process.exit(1);
    }
    console.log(`join: slaghouse.html matches src/ (${PARTS.length} parts)`);
  } else {
    writeFileSync(OUT, built);
    console.log(`join: wrote slaghouse.html from ${PARTS.length} parts, ${built.length} bytes`);
  }
}
