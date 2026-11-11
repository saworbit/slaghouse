# playtest: in-page test harness

Scripts you load into a running `slaghouse.html` to drive the game by hand: step it on a virtual clock, play it with a
bot, throw every enemy at an arena, and time a whole campaign. They are not part of the game and nothing loads them
automatically.

| file | what it gives you |
| --- | --- |
| `harness.js` | `window.T`: `T.boot()`, `T.run(ms)`, `T.setup(arena)`, `T.tp(tx, ty)`, `T.aimAt(x, y)`, `T.trig(on)`, `T.bot({ seconds })`, `T.snap(name)`, `T.errs` |
| `chaos.js` | `window.CH`: `CH.arenaStorm(arena, secs)` spawns every enemy kind in batches while the bot fights, and `CH.check(g, tag)` lists broken invariants (NaN positions, foes outside the world, overheal, gravity stuck off, runaway lists) |
| `vibe.js` | `window.VB`: `VB.campaign(maxSecs)` plays the campaign to ARENA CLEARED and reports per-wave time and damage, kills, errors, callout counts and the real cost of each simulated frame |

## Running it

Serve the repo root (`python -m http.server 8765 --bind 127.0.0.1`), open `slaghouse.html`, then in the console:

```js
for (const f of ['harness', 'chaos', 'vibe']) eval(await (await fetch('/dev/playtest/' + f + '.js')).text());
RUNMODE = 'campaign'; T.boot(); T.run(300);
const r = await VB.campaign(900);   // { waves, state, kills, total, totalTaken, msPerFrame, simFps, callouts, errs }
```

`state: 'won'` and an empty `errs` is a pass. `T.setup(1)` restarts in ARENA 02 (index 1) with a wave 4 carry, no
waves and a god-mode player, which is the quickest way to stage a fight by hand.

## Things that bite

- `T.boot()` puts the game loop to sleep and stubs `Date.now` with a virtual clock. Phaser 4's tweens time themselves
  with `Date.now()` and skip any gap over 500 ms, so HUD callouts freeze under manual stepping without it. Every
  `T.run` also sets `game.loop.now`, `time` and `delta` before `game.step()`.
- A hidden browser tab (or a hidden preview pane) never ticks on its own and fires `visibilitychange`, which pauses the
  run. Step it with `T.run`, and stub `g.pauseGame = () => {}` (the bot does this for you).
- `T.boot()` skips the title's start, so no audio is running. Call `Sfx.init(); Sfx.startHum(); Music.start();` first if
  you're testing sound.
- Phaser reuses the scene object across `scene.restart()`, so anything you assign on it (`g.startWave = () => {}`,
  `g.hurtPlayer`) survives into the next run. Reload the page between tests that stub methods.
- Keys need `_justDown` as well as `isDown` for `JustDown` checks (jumps, weapon keys, N, B) to fire.
- A fake pad: `navigator.getGamepads = () => [{ connected: true, mapping: 'standard', buttons: [...], axes: [0, 0, 0, 0] }]`.
- `game.renderer.snapshot()` only resolves after a rendered frame, so step at least one frame before awaiting it.
  `T.snap(name)` posts the image to `dev/build/recv.py` on port 8767.
- Long runs block the page while they step. Start them with `setTimeout` and check a global from short calls rather
  than awaiting them in one call. `CH.arenaStorm` and `VB.campaign` turn rendering off while they run.
- Placing enemies by tile needs care: several floor tiles hold crates (`x`), and an enemy spawned inside one never moves.
