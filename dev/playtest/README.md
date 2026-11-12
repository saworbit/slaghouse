# playtest: in-page test harness

Scripts you load into a running `slaghouse.html` to drive the game by hand: step it on a virtual clock, play it with a
bot, throw every enemy at an arena, and time a whole campaign. They are not part of the game and nothing loads them
automatically.

| file | what it gives you |
| --- | --- |
| `harness.js` | `window.T`: `T.boot()`, `T.run(ms)`, `T.setup(arena)`, `T.tp(tx, ty)`, `T.aimAt(x, y)`, `T.trig(on)`, `T.bot({ seconds })`, `T.snap(name)`, `T.errs` |
| `chaos.js` | `window.CH`: `CH.arenaStorm(arena, secs)` spawns every enemy kind in batches while the bot fights, and `CH.check(g, tag)` lists broken invariants (NaN positions, foes outside the world, overheal, gravity stuck off, runaway lists) |
| `twotab.js` | `window.TT`: `TT.check()` plays a second tab by writing to `localStorage`, then checks that lifetime stats, mastery and codex sightings add up and that a stale run can't replace a newer campaign checkpoint. It puts every `slaghouse.*` key back; reload before other tests |
| `daily.js` | `window.DY`: `DY.check()` moves the clock past the next 00:00 UTC in a DAILY run and checks the waves, a restart's arena and the record's date keep the run's day |
| `checkpoint.js` | `window.CP`: `CP.save()`, `CP.resume(snap)`, `CP.retry(snap)` and `CP.damaged()`, the campaign checkpoint checks `run.mjs` drives across page reloads |
| `run.mjs` | the headless runner: serves the repo, opens the game in headless Chrome and runs the checks below. CI runs it on every push and pull request |
| `vibe.js` | `window.VB`: `VB.campaign(maxSecs)` plays the campaign to the end (the Smelter down) and reports per-wave time and damage, kills, errors, callout counts and the real cost of each simulated frame |

## Running it headless

`run.mjs` needs Node and an installed Google Chrome (or `PLAYTEST_CHROME` set to a browser's path). From the repo root:

```bash
npm ci --prefix dev/playtest
```

```bash
node dev/playtest/run.mjs
```

Each check gets a fresh browser profile: `TT.check()`, `DY.check()`, the checkpoint flow (New Campaign on BRUTAL with
GLASS CANNON and a changed loadout, ride the Furnace lift, reload, Continue, compare; then change the loadout, die,
retry the act, compare), a legacy save and five damaged saves, and `VB.campaign(1500)`, which must visit all five acts and end won. Foes in its
`removed` list are printed as a note, since a mimic hiding as a drum can beat the bot without anything being broken.
Any page error or console error fails the check it happened in. Phaser is fetched from jsDelivr once, checked
against the tag's integrity hash and served to every page. `--quick` skips the campaign run (the whole thing takes about 30 s headless; the campaign is most of it).
It exits 1 and names each failure.

## Running it in a browser

Serve the repo root with `python -m http.server 8765 --bind 127.0.0.1`. In a fresh page at
<http://127.0.0.1:8765/slaghouse.html>, run the following in the browser console.

```js
for (const f of ['harness', 'chaos', 'vibe']) eval(await (await fetch('/dev/playtest/' + f + '.js')).text());
RUNMODE = 'campaign'; T.boot(); T.run(300);
const r = await VB.campaign(1500);   // Inspect waves, state, kills, total, totalTaken, msPerFrame, simFps, callouts and errs.
```

A pass has `state: 'won'`, an empty `errs` array and an empty `removed` array. `removed` lists any foe the bot
couldn't see for 30 s with five or fewer left; `VB.campaign` kills it so the run goes on, so a non-empty list means
the bot got stuck there. The bot stands on lift and coolant-valve markers as they
open. Use `T.setup(0)` to stage a fight in the Melt Floor or `T.setup(1)` to stage one in the Furnace with waves
disabled. Use `T.setup(3)` or `T.setup(4)` for the Wrecking Yard or Powerhouse. Campaign setups restore the
arsenal earned before that act. Use the [campaign smoke checklist](../../CONTRIBUTING.md#campaign-smoke-check) to verify checkpoint
reload, retry and the valve meter's pause behavior.

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
  `T.snap(name)` posts the image to `dev/build/recv.py` on port 8767 (start it with `python dev/build/recv.py`). The name
  must be a plain `.png` or `.jpg` file name.
- Long runs block the page while they step. Start them with `setTimeout` and check a global from short calls rather
  than awaiting them in one call. `CH.arenaStorm` and `VB.campaign` turn rendering off while they run.
- Placing enemies by tile needs care: several floor tiles hold crates (`x`), and an enemy spawned inside one never moves.
