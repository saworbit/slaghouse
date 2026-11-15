// =============================================================================
//  BOOT
// =============================================================================
window.game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW_W,
  height: VIEW_H,
  backgroundColor: '#050608',
  pixelArt: true,                                    // nearest-neighbour + rounded pixels for crisp art
  audio: { noAudio: true },                          // all sound is our own Web Audio graph
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: TUNE.GRAVITY }, debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, TitleScene, GameScene, HudScene],
});
game.events.on('prestep', () => { PAD.poll(); LAB_PANEL.pad(); });
// A hidden tab stops the game loop but not our own Web Audio graph: without this the music, the hum and any
// weapon loop that was running (hose, arc, cryo, minigun motor) keep playing over a frozen game.
// Hiding or closing the tab credits the time played so far and writes the lifetime counts and mastery, so a run
// that never reaches its results screen still counts.
const flushLife = () => {
  const gs = game.scene.getScene('Game');
  if (gs && gs.sys.isActive()) gs.savePlayTime();
  saveLife(); saveMastery();
};
window.addEventListener('pagehide', flushLife);
game.events.on('hidden', () => {
  const gs = game.scene.getScene('Game');                              // a hidden tab pauses the run; coming back waits on the menu
  if (gs && gs.sys.isActive() && gs.state === 'play' && !gs.paused) gs.pauseGame();
  flushLife();
  if (Sfx.ctx && Sfx.ctx.state === 'running') Sfx.ctx.suspend().catch(() => {});
});
game.events.on('blur', () => {                                         // focus left a visible window (another monitor, DevTools): pause too
  const gs = game.scene.getScene('Game');
  if (gs && gs.sys.isActive() && gs.state === 'play' && !gs.paused) gs.pauseGame();
});
game.events.on('visible', () => { if (Sfx.ctx && Sfx.ctx.state === 'suspended') Sfx.ctx.resume().catch(() => {}); });
