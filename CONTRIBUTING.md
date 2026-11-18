# Contributing to SLAGHOUSE

SLAGHOUSE is open source under the [MIT License](LICENSE). Contributions are welcome. When you submit a contribution,
you agree that it is licensed under the same MIT License. The sampled SFX banks come from AudioGen and keep their
non-commercial note; see [License](README.md#license) in the README.

## Running the game

The whole game ships as one file, `slaghouse.html`, built from the parts in `src/`. Playing it needs no build. It loads
Phaser 4.2.1 from the jsDelivr CDN, so you need an internet connection. Serve the folder and open the page:

```bash
python -m http.server 8765 --bind 127.0.0.1
```

Then open <http://127.0.0.1:8765/slaghouse.html>. Use the same URL and browser profile when testing a saved checkpoint.

## Editing the game

Edit the files in `src/`, never `slaghouse.html` itself, then rebuild it:

```bash
node src/join.mjs
```

`src/join.mjs` concatenates the parts in a fixed order, with no bundler: `page-head.html` (the page, its loading screen
and the header comment), `config.js` (`TUNE`, weapons, the `ENEMY` records), `util.js`, `audio.js` (`Sfx`, `Music`),
`font.js`, `art.js`, `particles.js`, `scenes.js` (boot and title), `game.js` (`GameScene`), `game-weapons.js`,
`game-enemies.js`, `game-world.js`, `game-campaign.js`, `hud.js`, `lab.js`, `boot.js` and `page-tail.html`.

`GameScene` spans five parts (#166). The class itself is in `game.js`: its scene setup, the update loop, damage, the
run's flow (waves, elites, medals, perks, supply drops) and the AI that every foe shares (the nav routes and the squad
tactics). The other four add plain methods after it with `Object.assign(GameScene.prototype, { ... })`, so `game.js`
has to come first:

- `game-weapons.js`: firing, projectiles and each gun's own effects
- `game-enemies.js`: every method an `ENEMY` record names (`setup`, `update`, `visuals`, `death`, `armour`, `contact`
  and the boss hooks), and each humanoid kind's `think` method
- `game-world.js`: terrain, props, gibs and ragdolls, and the arena hazards and machinery
- `game-campaign.js`: the campaign's squads, the route's stations, the lifts and the ride between acts

A new method goes in the part for its subsystem, with a comma after it. Commit both `src/` and the rebuilt
`slaghouse.html`. `node dev/check.mjs`, and so CI, fails if they're out of step.

### Keeping the seeded campaigns steady

The campaign checks seed `Math.random`, so one extra call anywhere the campaign runs changes everything after it,
and a pinned seed can tip from a win to a loss. An effect that changes nothing in play (a spark, a glint, a HUD
wobble, lightning jitter) draws from the cosmetic generator in `src/util.js` instead: `crand(a, b)`, `cpick(arr)`,
`fxRandom()`, and particles with `this.fx.emit(x, y, { ..., cosmetic: true })`. Cosmetic particles also run in
their own list (`this.cfx`, the emitter's `twin`). Sharing one list, a cosmetic particle's lifetime decided when the
seeded ones swapped places in it, and so the order that blood and slag drops painted the level in and drew
`Math.random` for it. Don't give a cosmetic emit `mode: 2` (paint); the twin doesn't paint. These also draw `Math.random` or
change timing, so keep them out of shared paths unless the change is meant to play differently: `rand`, `randi`,
`pick`, `this.shake()` (Phaser's camera shake draws every frame), `hitStop` and `slowmoUntil`. Content that the
campaign never issues or spawns can use them freely in its own code.

To check that a change leaves the campaign alone, run the Normal and Brutal campaign commands below on `main` and on
your branch and compare each seed's line. With the sim fps and wall times stripped, they should match exactly.

## Checks

```bash
node dev/check.mjs
```

This checks that `slaghouse.html` is exactly what `src/` builds, compiles the game script and the audio banks, checks
that each AAC bank holds the same sounds and tracks as its Opus bank, and that local scripts exist and CDN scripts are
pinned to an exact version and carry an integrity hash. If you bump Phaser, put the new file's sha384 hash in the tag. It also notes any sampled sound name the game asks for that `sfx_bank.js` doesn't have (a
note, not a failure: the synth plays instead). It fails if the `Sfx` block in `slaghouse.html` can't load on its own
(it must not read page globals such as `OPTS` while loading) or if a `dev/sfxgen/calib.json` entry was measured
against an older version of its procedural sound. CI runs the same script on every push to `main` and on every pull
request.

CI also runs the [playtest harness](dev/playtest/README.md) in headless Chrome. It checks Lab controls and save
isolation, sweeps the weapon and enemy catalogs and arena hazards, and runs the save, DAILY and campaign regression
checks. The final checks clear all ten operations on Normal seeds 91, 404, 137, 5, 15, 1, 13 and 17, and pass when at
least seven of them win. A separate CI job clears them on Brutal seeds 91, 137, 7, 11, 21, 4, 6 and 14, and passes
when at least seven of them win. To run it locally from the repository root, use Node.js 22 (the CI version) and
installed Google Chrome. Set `PLAYTEST_CHROME` to the executable path if using a different browser binary.

```bash
npm ci --prefix dev/playtest
```

```bash
node dev/playtest/run.mjs
```

Add `--quick` to skip the full campaigns while keeping the scripted checks, or use `--lab` to run just the Lab
checks. To run the eight-seed Brutal campaign check, use the following command.

```bash
node dev/playtest/run.mjs --campaign --brutal --seeds=91,137,7,11,21,4,6,14 --min-wins=7
```

A full campaign check requires every operation, the full kill count, and zero survivors. The bot uses game
inputs and ordinary in-game healing. A failed run prints the surviving mobs and the bot's position and goal.

### Campaign smoke check

To check a late act at real speed without playing the acts before it, load `slaghouse.html?act=N` for N from 2 to 5.
It saves a test start at that act's checkpoint, with the weapons earned by then, a perk for each cleared operation,
full health and your difficulty and mutator, then opens the campaign page on **Continue**. If a checkpoint is already
saved, it asks before replacing it. A test start, and every act its lift rides on to, counts toward no lifetime stats,
codex sightings, medals, best run or the cleared flag; the act card and the campaign page say **TEST START**.

1. In a fresh campaign on Normal, confirm that the wheel, hotkeys and cycling only offer the Nailgun until the first
   grunt patrol falls. Check that the Shotgun arrives on a green supply beam, then equip it using the **2** shown
   on its card. Pick a perk with
   **1**, **2** or **3** after Lockdown and confirm the equipped weapon stays put. Check that the Flare Gun
   arrives before the lights go out. Press **R** once mid-fight: only the **PRESS R AGAIN** prompt should
   appear, and it should clear after two seconds. In the pause menu, check that **Restart** and **Quit to
   Title** each ask for a second pick and that **Esc** cancels without resuming.
2. Clear Blackout and enter the marked lift. Record your weapon, perks, difficulty and mutator. Reload at the
   same URL and choose **Campaign → Continue**. Check that you start Slag Rain with the recorded build and settings,
   and that stepping out of the car calls out **SUIT PATCHED** if the act raised your health.
3. Die in the Furnace and press **R** after the results appear. Verify that the retry restores the Furnace
   checkpoint. On Normal, check that the rain clears before the **Demolition Team** (drops still falling crumble to
   cinders and its puddles steam out) and that the vents stop. At each wave start, check that restocked drums, gas
   cans and medkits beam in and that a valve you burst is welded back on.
   After that squad, check that the Gunship countdown prompts you to find cover and gives you about six seconds
   to move. Run to each end of the arena and check that the Gunship follows you and does not stay above the
   catwalk. Verify that its rocket and strafe warnings give you time to react, and that after **WAVE CLEARED** the
   fire suppression sprays out the ground fire and it stops damaging you, including any the crash leaves. In Gravity Loss, check that the second Hound
   arrives with **Gravity Surge** and the Linkers arrive in the next squad. Climb onto the catwalk and confirm the
   last Linker stays in reach or descends below it. Hold toward a wall and repeat the jump input to climb without
   drifting away. Enter the Sorting Line lift and confirm **Continue** now starts in the Sorting Line.
4. In Meltdown, check that the countdown gives you time to reach a walkway. The presses park at the top before
   the slag rises, and the floor drains before the Wyrm arrives. Watch the far lift glow as the meltdown heats it.
   After Meltdown, a valve crew warps in: step off the first coolant valve partway and check that its meter creeps
   back rather than resetting, then pause on the valve to check that the meter holds. Resume and turn both valves
   in order. Check that coolant runs along the pipe to the lift, that the lift steams as it cools, and that it only
   comes once both crews are down. Blast the steps up to the right-hand deck and confirm the bolted, striped ones
   stay. Ride the lift to the Wrecking Yard and check that you arrive in the car at the start.
5. Check that the wrecking ball hangs latched before its squad, that the wrecking ball and live rails have
   preparation countdowns, and that the gantry winches the ball back up after Demolition. Fight the Foreman and
   verify that it cuts the ball loose in phase two. After Live Circuit, pull the main breaker and check that the
   lights and generator go dark before the Smelter warps in, and that it hotwires the rails in phase two. Defeat
   it and confirm the results appear and Continue is unavailable on the campaign screen.
6. Start OVERTIME, DAILY and BOSS RUSH. Check that the full arsenal is available and each mode has its own
   wave, boss or daily perk setup. Clear an OVERTIME cycle and check that the lift comes and you have to walk in.

### Lab smoke check

1. Choose **Lab** on the title screen. Tab through the setup, select **Firing Range**, choose a starting weapon
   and deploy. Confirm the targets stay in place and that you can equip another weapon and hit them.
2. Open **Lab controls** with **F2**, deploy **Breakables Bay** and break a prop. Press **R** and confirm the
   starting weapon, player health and intact props return.
3. Deploy **Furnace Vents** with invulnerability off and watch for the warning before a jet fires. Use
   **Lab controls → Exit to title**. If you started with a campaign checkpoint, confirm **Continue** still opens it.
4. With a gamepad, open **Lab** from the title, change the starting weapon with the D-pad, and deploy with **A**.
   Pause with **Start**, open **Lab controls**, and back out with **B**.

## Workflow

1. Branch from `main` (for example `fix/blimp-altitude` or `round/powerhouse`).
2. Keep commits focused. Subjects follow the existing history: `Add the <name> round: ...` for content rounds,
   `Fix ...` for bug fixes, in the imperative.
3. Update `CHANGELOG.md` under `[Unreleased]` (Added / Changed / Fixed).
4. If you change a value in `TUNE` (`src/config.js`), update the header comment in `src/page-head.html` to match.
5. Open a pull request with the template filled in. CI must pass, and the owner reviews every change. `main` requires
   the **Static checks**, **Headless play-test** and **Brutal campaign seeds** jobs, so `gh pr merge --auto --squash`
   waits for all three before it merges.

## Adding an enemy kind or a run mode

An enemy kind is one record in `ENEMY` (`src/config.js`) plus its own `GameScene` methods (`src/game-enemies.js`). The
comment above `ENEMY` lists the fields: its stats and gibs, `frame0`, `flier` or `humanoid`, and the methods it names
for its `setup` when it spawns, its `update` each frame, its `visuals` and its `death`, plus the values its death
reads (a ragdoll, a gun to drop, a bigger shake). Give it a `CODEX` row too.
`dev/playtest/kinds.js` warps in every kind and fails one with a missing codex row, start frame or method, so run
`node dev/playtest/run.mjs --quick` after adding one. A kind with its own armour (a plate, a weak spot, a fuse) can
name an `armour` method on its record, which `damageEnemy` calls just before the bulldozer's plow check, and a
`contact` method that replaces the plain bite when it touches you. Armour whose place in the damage order matters
differently still goes in `damageEnemy` itself.

A kind that shoots aims with `this.aimLead(x, y, speed)` (or `this.leadAngle(e, speed)`), so it leads the player on
the shared `TUNE.AI.lead` scale for each difficulty. Every bullet it takes from `this.ebullets` sets `keg: null`: the
pool reuses bullets, and a bullet that keeps an old `keg` sets that drum burning. A humanoid can reuse the squad
helpers: `startSearch` and `searchStep` when it loses you, `underFire` and `coverMe` when it is hit hard, and
`bark(e, text)` to show what it does. `dev/playtest/tactics.js` checks the shared behaviour.

A full boss sets `boss: true` and a mini-boss `miniBoss: true`. Every shared rule reads those flags, never the kind
(#177): neither is made an elite, doubled by SWARM, made to panic when it burns, frozen by stasis, hasted by an
Overclocker, healed by a Welder, Mender or Banner, or yanked by the hook or the tractor. Each takes 60 at most from a
press and a short net hold. A boss is never tethered by a Linker; a mini-boss is, unless it passes through walls. A
boss with `title: [name, subtitle]` gets the title card, the boss bar and the camera on its warp-in, with
`barNotches` for its phase marks. Its own hooks are `bossArmour` and `bossContact`: they run before every other
kind's, and `bossContact` replaces all contact rules. Then add it to `RUSH` and `RUSH_SUBS` for BOSS RUSH and
`OT_BOSSES` for OVERTIME's sixth wave, and give it phase checks in the mob sweep in `dev/playtest/lab-sweep.js`.
`SWARM_SKIP` and `NO_ELITE` build themselves from the flags.

A run mode is one record in `RUN_MODES`. The comment above it lists every rule a record carries: its waves and
music, its start and restart, its difficulty and mutator, and its results screen. `dev/playtest/modes.js` plays every
record and fails one that's missing a rule or writes another mode's record key. Add the new mode to the `SPEC` pinned
in that file as well.

## Releasing

Releases are tagged `vX.Y.Z` and published on GitHub with a playable zip.

Before any commercial release, clear the sampled SFX first: `sfx_bank.js` and `sfx_bank_aac.js` come from AudioGen,
whose weights are CC BY-NC 4.0 (see License in README.md). Either regenerate them from a commercially licensed
source or leave both files out of the zip and the Pages site; every sampled sound has a synth fallback. AudioGen is
credited in README.md, and has to be credited anywhere else credits are shown, in-game credits included.

1. In `CHANGELOG.md`, move the `[Unreleased]` entries under a new `## [X.Y.Z] - YYYY-MM-DD` heading and update the
   version links at the bottom of the file.
2. Commit, push to `main`, and wait for CI to pass.
3. Tag the commit and push the tag:

   ```bash
   git tag -a vX.Y.Z -m "SLAGHOUSE vX.Y.Z"
   ```

   ```bash
   git push origin vX.Y.Z
   ```

The `Release` workflow (`.github/workflows/release.yml`) takes it from there: it runs `node dev/check.mjs`, builds
`slaghouse-vX.Y.Z.zip` (a `slaghouse/` folder with the game, both audio banks and their AAC copies, LICENSE, README and CHANGELOG) and
publishes the release with that version's changelog section as its notes. If the release already exists, it attaches
the zip to it. Edit the notes on GitHub afterwards to add highlights or how to play.

To try the workflow without a tag, run it by hand (Actions, Release, Run workflow, or the command below). The dry run
builds the same zip and notes from the branch you pick, takes the notes from the changelog section you name
(`Unreleased` by default), and uploads them as the `slaghouse-dry-run` artifact. It doesn't create or change a release.

```bash
gh workflow run release.yml --ref main -f version=Unreleased
```

The tag also starts the `Pages` workflow (`.github/workflows/pages.yml`), which publishes the game to
<https://saworbit.github.io/slaghouse/>. It runs `node dev/check.mjs`, then deploys the same files as the zip plus an
`index.html` that sends the bare URL on to `slaghouse.html` with its query string (so `?lab=furnace` still works). A
pull request that changes the workflow builds the site without deploying it. To publish another ref, for example
`main` between releases or an older tag again, run it by hand and name the ref. The ref doesn't need the workflow file:

```bash
gh workflow run pages.yml --ref main -f ref=main
```

## Audio

The sound banks are optional; every sampled sound has a synth fallback in the game. Each has an AAC copy
(`sfx_bank_aac.js`, `music_bank_aac.js`) for browsers without Ogg Opus, built alongside it. To regenerate them, follow
[`dev/sfxgen/README.md`](dev/sfxgen/README.md) and [`dev/synthwave/README.md`](dev/synthwave/README.md).

## Reporting problems

Use the [issue templates](https://github.com/saworbit/slaghouse/issues/new/choose) for bugs and ideas; open work is
tracked in [GitHub issues](https://github.com/saworbit/slaghouse/issues), not in `dev/ISSUES.md` (the old drafts).
For security problems, see [SECURITY.md](SECURITY.md).
