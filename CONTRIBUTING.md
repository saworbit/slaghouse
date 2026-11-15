# Contributing to SLAGHOUSE

SLAGHOUSE is proprietary software (see [LICENSE](LICENSE)). Contributions are accepted only from collaborators the
owner has invited. Unless you've agreed otherwise in writing, by submitting a contribution you grant the copyright
holder the right to use, modify and distribute it under any terms, including proprietary ones.

## Running the game

The whole game is `slaghouse.html`; there's no build step. It loads Phaser 4.2.1 from the jsDelivr CDN, so you need
an internet connection. Serve the folder and open the page:

```bash
python -m http.server 8765 --bind 127.0.0.1
```

Then open <http://127.0.0.1:8765/slaghouse.html>. Use the same URL and browser profile when testing a saved checkpoint.

## Checks

```bash
node dev/check.mjs
```

This compiles the game script and both audio banks, checks that local scripts exist and that CDN scripts are pinned
to an exact version and carry an integrity hash. If you bump Phaser, put the new file's sha384 hash in the tag. It also notes any sampled sound name the game asks for that `sfx_bank.js` doesn't have (a
note, not a failure: the synth plays instead). It fails if the `Sfx` block in `slaghouse.html` can't load on its own
(it must not read page globals such as `OPTS` while loading) or if a `dev/sfxgen/calib.json` entry was measured
against an older version of its procedural sound. CI runs the same script on every push to `main` and on every pull
request.

CI also runs the [playtest harness](dev/playtest/README.md) in headless Chrome. It checks Lab controls and save
isolation, sweeps the weapon and enemy catalogs and arena hazards, and runs the save, DAILY and campaign regression
checks. The final checks clear all ten operations on Normal seeds 91, 404, 137 and 5. A separate CI job clears them
on Brutal seeds 91, 137, 7 and 11.
To run it locally from the repository root, use Node.js 22 (the CI version) and installed Google Chrome. Set
`PLAYTEST_CHROME` to the executable path if using a different browser binary.

```bash
npm ci --prefix dev/playtest
```

```bash
node dev/playtest/run.mjs
```

Add `--quick` to skip the full campaigns while keeping the scripted checks, or use `--lab` to run just the Lab
checks. To run the four-seed Brutal campaign check, use the following command.

```bash
node dev/playtest/run.mjs --campaign --brutal --seeds=91,137,7,11
```

A full campaign check requires every operation, the full kill count, and zero survivors. The bot uses game
inputs and ordinary in-game healing. A failed run prints the surviving mobs and the bot's position and goal.

### Campaign smoke check

1. In a fresh campaign on Normal, confirm that the wheel, hotkeys and cycling only offer the Nailgun until the first
   grunt patrol falls. Equip the newly issued Shotgun using the **2** shown on its card. Pick a perk with
   **1**, **2** or **3** after Lockdown and confirm the equipped weapon stays put. Check that the Flare Gun
   arrives before the lights go out. Press **R** once mid-fight: only the **PRESS R AGAIN** prompt should
   appear, and it should clear after two seconds. In the pause menu, check that **Restart** and **Quit to
   Title** each ask for a second pick and that **Esc** cancels without resuming.
2. Clear Blackout and enter the marked lift. Record your weapon, perks, difficulty and mutator. Reload at the
   same URL and choose **Campaign → Continue**. Check that you start Slag Rain with the recorded build and settings.
3. Die in the Furnace and press **R** after the results appear. Verify that the retry restores the Furnace
   checkpoint. On Normal, check that the rain, its puddles and the vents clear before the **Demolition Team**.
   After that squad, check that the Gunship countdown prompts you to find cover and gives you about six seconds
   to move. Verify that its rocket and strafe warnings give you time to react and that ground fire stops
   damaging you after **WAVE CLEARED**, including during the crash. In Gravity Loss, check that the second Hound
   arrives with **Gravity Surge** and the Linkers arrive in the next squad. Climb onto the catwalk and confirm the
   last Linker stays in reach or descends below it. Hold toward a wall and repeat the jump input to climb without
   drifting away. Enter the Sorting Line lift and confirm **Continue** now starts in the Sorting Line.
4. In Meltdown, check that the countdown gives you time to reach a walkway. The presses stop before the slag
   rises, and the floor drains before the Wyrm arrives. After Meltdown, leave the first coolant valve early to
   reset its meter, then pause on the valve to check that the meter holds. Resume, seal both valves in order
   and enter the Wrecking Yard lift.
5. Check that the wrecking ball and live rails have preparation countdowns before their squads. Fight the
   Foreman and Smelter and verify that each starts its arena machinery in phase two. Defeat them in order
   and confirm the results appear and Continue is unavailable on the campaign screen.
6. Start OVERTIME, DAILY and BOSS RUSH. Check that the full arsenal is available and each mode has its own
   wave, boss or daily perk setup.

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
4. If you change a value in `TUNE`, update the header comment at the top of `slaghouse.html` to match.
5. Open a pull request with the template filled in. CI must pass, and the owner reviews every change. `main` requires
   the **Static checks**, **Headless play-test** and **Brutal campaign seeds** jobs, so `gh pr merge --auto --squash`
   waits for all three before it merges.

## Adding an enemy kind or a run mode

An enemy kind is one record in `ENEMY` in `slaghouse.html` plus its own `GameScene` methods. The comment above
`ENEMY` lists the fields: its stats and gibs, `frame0`, `flier` or `humanoid`, and the methods it names for its
`setup` when it spawns, its `update` each frame, its `visuals` and its `death`, plus the values its death reads (a
ragdoll, a gun to drop, a bigger shake). Give it a `CODEX` row too.
`dev/playtest/kinds.js` warps in every kind and fails one with a missing codex row, start frame or method, so run
`node dev/playtest/run.mjs --quick` after adding one. Special armour (a plate, a weak spot, a hit counter) still goes
in `damageEnemy`, where its place in the damage order matters.

A run mode is one record in `RUN_MODES`. The comment above it lists every rule a record carries: its waves and
music, its start and restart, its difficulty and mutator, and its results screen. `dev/playtest/modes.js` plays every
record and fails one that's missing a rule or writes another mode's record key. Add the new mode to the `SPEC` pinned
in that file as well.

## Releasing

Releases are tagged `vX.Y.Z` and published on GitHub with a playable zip.

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
`slaghouse-vX.Y.Z.zip` (a `slaghouse/` folder with the game, both audio banks, LICENSE, README and CHANGELOG) and
publishes the release with that version's changelog section as its notes. If the release already exists, it attaches
the zip to it. Edit the notes on GitHub afterwards to add highlights or how to play.

To try the workflow without a tag, run it by hand (Actions, Release, Run workflow, or the command below). The dry run
builds the same zip and notes from the branch you pick, takes the notes from the changelog section you name
(`Unreleased` by default), and uploads them as the `slaghouse-dry-run` artifact. It doesn't create or change a release.

```bash
gh workflow run release.yml --ref main -f version=Unreleased
```

## Audio

The sound banks are optional; every sampled sound has a synth fallback in the game. To regenerate them, follow
[`dev/sfxgen/README.md`](dev/sfxgen/README.md) and [`dev/synthwave/README.md`](dev/synthwave/README.md).

## Reporting problems

Use the [issue templates](https://github.com/saworbit/slaghouse/issues/new/choose) for bugs and ideas; open work is
tracked in [GitHub issues](https://github.com/saworbit/slaghouse/issues), not in `dev/ISSUES.md` (the old drafts).
For security problems, see [SECURITY.md](SECURITY.md).
