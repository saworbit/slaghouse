# playtest: in-page test harness

Scripts you load into a running `slaghouse.html` to drive the game by hand: step it on a virtual clock, play it with a
bot, throw every enemy at an arena, and time a whole campaign. They are not part of the game and nothing loads them
automatically.

| file | what it gives you |
| --- | --- |
| `harness.js` | `window.T`: `T.boot()`, `T.run(ms)`, `T.setup(arena, keepWaves)`, `T.tp(tx, ty)`, `T.aimAt(x, y)`, `T.trig(on)`, `T.bot({ seconds })`, `T.snap(name)`, `T.errs` |
| `chaos.js` | `window.CH`: `CH.arenaStorm(arena, secs)` spawns every enemy kind in batches while the bot fights, and `CH.check(g, tag)` lists broken invariants (NaN positions, foes outside the world, overheal, gravity stuck off, runaway lists) |
| `twotab.js` | `window.TT`: `TT.check()` plays a second tab by writing to `localStorage`, then checks that lifetime stats, mastery and codex sightings add up and that a stale run can't replace a newer campaign checkpoint. It puts every `slaghouse.*` key back; reload before other tests |
| `daily.js` | `window.DY`: `DY.check()` moves the clock past the next 00:00 UTC in a DAILY run and checks the waves, a restart's arena and the record's date keep the run's day |
| `kinds.js` | `window.KC`: `KC.check()` warps in every kind in `ENEMY` on its own, the way a wave does, and checks that it has a codex row, a texture with its start frame and an `update` method the scene has, spawns on that frame, then runs, takes a hit and dies without an error. `KC.check(['wasp'])` checks only those |
| `props.js` | `window.PR`: `PR.check()` goes through every arena's breakable props and checks each has its art, frames and scene methods, sits where it can (a floor under it, clear of walls, something to hang from), then breaks it with grunts about, runs its effect to a wreck, restocks it and breaks it again to a blast, all without an error. `PR.check([0])` checks only ARENA 01 |
| `checkpoint.js` | `window.CP` checks campaign saves, including legacy checkpoints, and scripted pacing via `CP.progression()`, `CP.furnacePacing()` and `CP.latePacing()` |
| `run.mjs` | Serves the repo, opens the game in headless Chrome and runs the checks below. CI runs it on pushes to `main` and on pull requests. |
| `vibe.js` | `window.VB`: `VB.campaign(maxSecs)` plays the campaign to the end (the Smelter down) and reports per-wave time and damage, kills, errors, callout counts and the real cost of each simulated frame |

## Running it headless

Use Node.js 22 to match CI. Install Google Chrome or set `PLAYTEST_CHROME` to the browser executable path. From the repository root:

```bash
npm ci --prefix dev/playtest
```

```bash
node dev/playtest/run.mjs
```

Each check gets a fresh browser profile. The suite covers multi-tab persistence, DAILY date changes, and enemy
spawning, plus prop placement, breakage and restocking. It checks weapon and preparation prompts, blackout, fire cleanup, the separate Hound squads, and
late-campaign machinery and boss phases. Checkpoint coverage includes reload, retry, legacy migration and five
damaged saves. The full run calls `VB.campaign(1500)` and checks that the bot visits all five acts and wins.

Any page or console error fails the check. Phaser is fetched from jsDelivr once, verified against the tag's
integrity hash, and served to each page. `--quick` skips `VB.campaign(1500)` and runs the other checks.
The runner exits 1 on failure and names the failing checks.

## Running it in a browser

Serve the repo root with `python -m http.server 8765 --bind 127.0.0.1`. In a fresh page at
<http://127.0.0.1:8765/slaghouse.html>, run the following in the browser console.

```js
for (const f of ['harness', 'chaos', 'vibe']) eval(await (await fetch('/dev/playtest/' + f + '.js')).text());
RUNMODE = 'campaign'; T.boot(); T.run(300);
const r = await VB.campaign(1500);   // Inspect waves, state, kills, total, totalTaken, msPerFrame, simFps, callouts and errs.
```

An automated clear reports `state: 'won'` and an empty `errs` array. The bot restores health and can teleport to
enemies, lift markers and coolant valves. `VB.campaign` also removes foes that stay out of sight for 30 seconds
with five or fewer hostiles left. The runner logs these under `removed` without failing the run.

`T.setup(arena)` uses a zero-based index from 0 (Melt Floor) to 4 (Powerhouse) and disables scheduled waves.
Pass `true` as the second argument to keep waves enabled in a fresh harness session. Campaign setups restore
the arsenal earned before the selected act. Use the [campaign smoke checklist](../../CONTRIBUTING.md#campaign-smoke-check)
to verify real-time pacing, traversal, checkpoint reload, retry and the valve meter's pause behavior.

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
