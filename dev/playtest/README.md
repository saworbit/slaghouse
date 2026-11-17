# playtest: in-page test harness

The playtest scripts step `slaghouse.html` on a virtual clock, exercise Lab encounters and drive full campaigns.
Load them from DevTools or use the headless runner. The game's built-in `SlagLab` API is available without the harness.

| file | what it gives you |
| --- | --- |
| `harness.js` | `window.T`: `T.boot()`, `T.run(ms)`, `T.seed(n)` (seeds `Math.random` and mutes sound; every seeded check starts with it), `T.setup(arena, keepWaves)`, `T.tp(tx, ty)`, `T.aimAt(x, y)`, `T.trig(on)`, `T.bot({ seconds })`, `T.snap(name)`, `T.errs` |
| `chaos.js` | `window.CH`: `CH.arenaStorm(arena, secs)` spawns every enemy kind in batches while the bot fights, and `CH.check(g, tag)` lists broken invariants (NaN positions, foes outside the world, overheal, gravity stuck off, runaway lists) |
| `twotab.js` | `window.TT`: `TT.check()` plays a second tab by writing to `localStorage`, then checks that lifetime stats, mastery and codex sightings add up and that a stale run can't replace a newer campaign checkpoint. It puts every `slaghouse.*` key back; reload before other tests |
| `daily.js` | `window.DY`: `DY.check()` moves the clock past the next 00:00 UTC in a DAILY run and checks the waves, a restart's arena and the record's date keep the run's day |
| `modes.js` | `window.RMC`: `RMC.check()` plays every `RUN_MODES` record from the title (a few seconds, a restart, a death, Quit to Title) and checks its wave total, that lifetime runs and time move only for modes that count toward lifetime stats, and that its results screen writes its own record key and no other. The table is also checked against a spec pinned in the file, so a record key can't move unnoticed, and every record must carry each rule the scene asks it for (run start, restart, difficulty, mutator, the wave rules and the results screen) |
| `kinds.js` | `window.KC`: `KC.check()` warps in every kind in `ENEMY` on its own, the way a wave does, and checks that it has a codex row, a texture with its start frame, an `update` method the scene has and any `setup`, `visuals`, `death`, `armour`, `contact`, `bossArmour` or `bossContact` method it names, that the values `killEnemy` reads off its record have the right types and that `ragdoll: true` matches the ragdoll art in `RAG`, spawns on that frame, then runs, takes a hit and dies without an error. `KC.check(['wasp'])` checks only those |
| `props.js` | `window.PR`: `PR.check()` goes through the breakable props of every arena (ARENAS 06-10 in their OVERTIME layout only, since the campaign never goes there) and of the Lab's Breakables Bay, and checks each has its art, frames and scene methods, sits where it can (a floor under it, clear of walls, something to hang from), then breaks it with grunts about, runs its effect to a wreck, restocks it and breaks it again to a blast, all without an error. `PR.check([0])` checks only ARENA 01 and `PR.check(['lab'])` only the Bay. `PR.campaignContactDamage()` checks sustained damage from electrified water, overlapping oil fire, and an active ladle with overlapping pools on Normal. `PR.accuracy()` checks, on a fixed seed, that an ammo crate's cook-off, drum and gas canister blasts, and the blasts of a gunship wreck, a torcher or pyro tank and a haywire jetpack add no hits while the player's own bullets and rockets do. `PR.weapons()` fires each weapon that hits drums at a vending machine and fails by name if one does nothing to it or counts a hit. `PR.spills()` checks that fire, tar, ice, slag and slug acid stop at a ledge and that an Arc Caster beam, a shock orb and a Thundercloud strike electrify a puddle. |
| `tactics.js` | `window.AT`: `AT.check()` sets up small fights in ARENA 01 on a fixed seed and checks the squad tactics every foe shares: the prediction lands a jump on the floor below it and stops a run at a wall, and shots lead a runner; a grunt climbs to you on a raised deck by the nav graph; drones take hover spots apart from each other, each with a line of sight to you; on Normal an enforcer lights the drum by your feet; a hard-hit enforcer ducks into cover while a squadmate opens up; and of two enforcers that lose you, one goes where you were heading and the other watches the spot. It returns `{ fails, notes }` |
| `checkpoint.js` | `window.CP` checks campaign saves, including legacy checkpoints, and scripted pacing via `CP.progression()`, `CP.furnacePacing()` and `CP.latePacing()`. `CP.linkerRecovery()` checks escape from the Furnace ceiling pockets. `CP.traversal()` checks catwalk access and wall jumps. `CP.mutatorHazards()` checks that MOON BOOTS and LIGHTS OUT stay on through Slag Rain's scripted rain. `CP.modifierCues()` checks that low gravity is called before it starts and ends, and that the Furnace vents restart with a tell. `CP.hudReset()` checks that a reset clears the multi-kill label. |
| `lab.js` | `checkLab()` verifies presets, snapshots, roster validation, reset and save isolation through the browser API. |
| `lab-sweep.js` | `labSweep('weapons' \| 'mobs' \| 'hazards')` fires weapons through player input and uses controlled fixtures to exercise enemy AI, boss phases, machinery, breakables and traversal. A weapon that hurts its dummy must count a hit for each shot that connected, so accuracy stays fair. |
| `dump.js` | `window.KD`: `KD.run(kinds, states)` spawns, draws and kills each kind on a seeded RNG and pinned clocks and returns what each step did, line by line, for `compare.mjs` to diff. `KD.kinds()` and `KD.states()` list the build's kinds and the AI states its scene tests for |
| `compare.mjs` | Runs `dump.js` in the working tree and in a git ref side by side and lists the kinds and cases that differ. See [Comparing two builds](#comparing-two-builds) |
| `run.mjs` | Serves the repo, opens the game in headless Chrome and runs the checks below. CI runs it on pushes to `main` and on pull requests. |
| `campaign-bot.js` | The campaign controller follows platforms, jumps, grapples, climbs walls, takes long drops, dodges fire, steps off burning, corrosive, gassed or live ground and seeks medkits using normal game mechanics. It plans on the same graph `run.mjs` checks, the player's long drops and wall climbs included. It keeps after the foe it's chasing while it can reach and hurt it, unless one in sight is much closer. A foe stranded on a deck whose steps were blown away comes last, and the controller shoots it from any reachable spot that can see it rather than trying to reach it. On a route it turns valves and pulls the breaker under fire, and it fights a valve crew rather than wait at a lift that won't come (the scene's `routeGoal()`). |
| `vibe.js` | `window.VB`: `VB.campaign(maxSecs)` plays the campaign to the end (the Smelter down) and reports per-wave time and damage, kills, errors, callout counts and the real cost of each simulated frame |

## Running it headless

Use Node.js 22 to match CI. Install Google Chrome or set `PLAYTEST_CHROME` to the browser executable path. From the repository root:

```bash
npm ci --prefix dev/playtest
```

```bash
node dev/playtest/run.mjs
```

Each check gets a fresh browser profile. The suite covers multi-tab persistence, DAILY date changes, lifetime time
for runs ended by R, quit or a hidden tab, run accuracy, mid-run **R** and the pause menu's restart and quit confirms
with real key and pad input, rebinding keys from OPTIONS > KEYS (and keys going by position on another layout), the pause menu over a perk draft, pausing on blur, mute, and enemy spawning, plus prop
placement, breakage, restocking and overlapping hazard damage on Normal. Each run mode keeps its own wave total,
lifetime stats and record. Every arena's navigation graph, counting
the player's long drops and wall climbs, must let every standing cell reach the start and get back. Campaign checks
cover weapon and preparation prompts, blackout, the Gunship warning and fire cleanup, staged Furnace squads,
Linker descent, catwalk access, repeated wall jumps and late machinery and boss phases. Checkpoint coverage
includes reload, retry, legacy migration and five damaged saves. The full suite calls `VB.campaign(1500)` for
Normal seeds 91, 404, 137 and 5. Each run must complete all ten operations, win with the
full kill count, and leave zero survivors at the lifts and at victory. The Smelter's death sequence pops everything
it summoned, so none may be left a second after it falls.

| Option | What it runs |
| --- | --- |
| `--quick` | All checks except the full campaigns |
| `--campaign` | Full campaigns only |
| `--seeds=91,404` | Selects the seeds for any full campaigns in the run. Use comma-separated unsigned 32-bit integers |
| `--brutal` | Sets the difficulty of the full campaigns to Brutal |
| `--min-wins=7` | Passes if at least that many of the full campaigns win. A lost or stalled one prints as `LOST`; page and harness errors still fail |
| `--lab` | Lab sweeps, menu and gamepad controls, room changes and the roster tally, presets, snapshots, reset and save isolation |
| `--lab-sweep` | Weapon, enemy and hazard sweeps only |
| `--help` | Prints the options. An unknown option or a bad `--seeds` value exits with status 2 |

CI runs the eight-seed Brutal check as its own job and passes when at least seven win, since any change that moves the
random stream can tip one thin run over. A lost or stalled seed prints as `LOST` with its details; an error in the
page or the harness still fails. Run this command to repeat it.

```bash
node dev/playtest/run.mjs --campaign --brutal --seeds=91,137,7,11,10,4,6,14 --min-wins=7
```

Page errors and console errors fail the check. The runner exits with status 1 and names the failing checks.
It fetches Phaser from jsDelivr once and verifies it against the game's integrity hash. Set `PLAYTEST_PHASER`
to a local copy of `phaser.min.js` to run offline. The same integrity check applies.

## Comparing two builds

`compare.mjs` checks a refactor or a balance pass against another build, kind by kind. It serves the working tree and
a git ref side by side, runs the same dumps for every enemy kind in both and lists what differs:

```bash
node dev/playtest/compare.mjs
```

```bash
node dev/playtest/compare.mjs HEAD~1 --kinds=heavy,boss
```

The ref defaults to `origin/main`. Each kind is spawned in the campaign, in OVERTIME and in a stationary Lab room,
drawn once in every AI state the scene tests for (status marks off and on, plain and busy state fields), and killed
by bullet, pellet, rocket, shatter, tick blast, crush, kick, execute and ripper, with a big overkill, a headshot, as
an elite, burning, while held, as the second last foe, as the last foe of a wave and as the last foe of the run.
It records every field a spawn sets, the body and attached images, both graphics layers' command buffers, BUS
events, timers, gib, light, blast, spawn, fx, shake and hit stop calls, and how many random draws each step used.
Cases with the same change print once with a count. Lines that match but come in another order are called out,
since a moved random draw is enough to change a seeded campaign. It takes about 40 seconds, exits 0 when nothing
differs, 1 when anything does or a page throws, and 2 on a bad option or ref.

Both pages run the working tree's `harness.js` and `dump.js`. What keeps a dump the same between page loads:

- pin `game.loop.now` before `T.boot`, set `Sfx.muted`, and seed `Math.random` before each spawn and each step
- pin the scene clock (`g.time.now`) after `T.setup`, and point `Date.now` at the loop clock
- after a spawn or a kill, fire only the scene clock's timers (`g.time.preUpdate` and `g.time.update`); full
  `T.run` steps don't repeat between page loads
- give both builds the same list of kinds in the same order, since state carries over from one kind to the next.
  `compare.mjs` uses the ref's order and adds any kinds only the working tree has at the end

## Running it in a browser

Serve the repo root with `python -m http.server 8765 --bind 127.0.0.1`. In a fresh page at
<http://127.0.0.1:8765/slaghouse.html>, run the following in the browser console.

```js
for (const f of ['harness', 'campaign-bot', 'vibe']) eval(await (await fetch('/dev/playtest/' + f + '.js')).text());
RUNMODE = 'campaign'; T.boot(); T.run(300);
const r = await VB.campaign(1500);   // Inspect waves, state, kills, total, totalTaken, msPerFrame, simFps, callouts and errs.
```

An automated clear reports `state: 'won'`, the selected `difficulty`, all ten operations in `waves`, matching
`kills` and `total`, zero `pending`, and empty `remaining`, `leftBehind`, `bossCleanup` and `errs` arrays.
The campaign controller uses normal traversal and combat. Health comes from the game's pickups, perks and
campaign recovery. Start from a fresh campaign for these checks. `T.setup()` and `T.bot()` are assisted arena fixtures.
A stalled run reports each surviving enemy with its cell and whether the player can see it (or how long it has
been hidden), the operation, reserve, squads still to come and open route station, and the controller's position,
goal and current route edge when available.

`T.setup(arena)` uses a zero-based index from 0 (Melt Floor) to 4 (Powerhouse) and disables scheduled waves.
Pass `true` as the second argument to keep waves enabled in a fresh harness session. Campaign setups restore
the arsenal earned before the selected act. Use the [campaign smoke checklist](../../CONTRIBUTING.md#campaign-smoke-check)
to verify real-time pacing, traversal, checkpoint reload, retry and the valve meter's pause behavior.

## Lab browser API

`window.SlagLab` uses the same rooms and configuration as the title screen's Lab. Start on the title screen
or in an existing Lab session. The API works from DevTools or from a browser driver such as Playwright.

```js
const catalog = await page.evaluate(() => SlagLab.catalog());
await page.evaluate(() => SlagLab.load('encounter', {
  weapon: 'rail',
  groups: [{ kind: 'enforcer', count: 2, elite: 'armored' }, { kind: 'drone' }],
  difficulty: 1,
  modifier: 'dark',
  invulnerable: true,
}));
await page.waitForFunction(() => SlagLab.snapshot()?.ready);
await page.keyboard.down('2');
try {
  await page.waitForFunction(() => SlagLab.snapshot()?.player.weapon === 'shotgun');
} finally {
  await page.keyboard.up('2');
}
const state = await page.evaluate(() => SlagLab.snapshot());
await page.evaluate(() => SlagLab.reset());
await page.waitForFunction(() => SlagLab.snapshot()?.ready);
```

- `catalog()` lists room IDs and presets, weapon and enemy IDs, eligible elites, difficulty values and modifiers.
- `load(room, options)` defaults to the Firing Range and uses the selected room's preset for omitted settings.
  Use `groups: []` for an empty room or `stationary: true` to disable enemy movement and attacks. Difficulty
  IDs are `0` (Easy), `1` (Normal) and `2` (Brutal). A setup can deploy up to 16 enemies including at most
  one boss, subject to room space. Invalid options or a roster that cannot fit throw before deployment.
- `reset()` rebuilds the current configuration and requires an active Lab. Both `load()` and `reset()` return
  the normalized configuration. Wait for `snapshot()?.ready` before taking measurements. The configured
  placement repeats. Live enemy decisions, weapon spread and effects use the game's RNG.
- `snapshot()` returns `null` outside the Lab. In a room, it reports the current setup, player position and health, equipped weapon, shot and
  kill counters, enemy positions and HP, and breakable prop states. Coordinates are world pixels. `remaining`
  includes pending enemies and split children, and `ready` is false while they are arriving. Boss summons appear
  in `enemies` with `summoned: true`.

Use regular input for live testing. To step virtual time, load `harness.js`, call `T.start()` on the title screen,
then call `SlagLab.load(...)`. Use `T.run(ms)` to advance time until the snapshot reports `ready`, and step
again after each input.

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
