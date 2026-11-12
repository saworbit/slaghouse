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
note, not a failure: the synth plays instead). CI runs the same script on every push to `main` and on every pull
request.

CI also runs the [play-test harness](dev/playtest/README.md) headless: the two-tab and DAILY checks, the campaign
checkpoint checks (reload and Continue, retry the act, damaged saves) and a full campaign run. It takes about half
a minute headless. To run it locally with Google Chrome installed:

```bash
npm ci --prefix dev/playtest
```

```bash
node dev/playtest/run.mjs --quick
```

`--quick` skips the campaign run. Still play the affected modes in a browser and watch the console for errors.

### Campaign smoke check

1. In a fresh campaign, confirm that the wheel, hotkeys and cycling only offer the Nailgun until the first
   grunt patrol falls. Equip the newly issued Shotgun. Pick a perk with **1**, **2** or **3** after Lockdown and
   confirm the equipped weapon stays put. Check that the Flare Gun arrives before the lights go out.
2. Clear Blackout and enter the marked lift. Record your weapon, perks, difficulty and mutator. Reload at the
   same URL and choose **Campaign → Continue**. Check that you start Slag Rain with the recorded build and settings.
3. Die in the Furnace and press **R** after the results appear. Verify that the retry restores the Furnace
   checkpoint. Check that the rain and molten puddles clear before the Gunship and that ground fire stops
   damaging you after **WAVE CLEARED**, including during the Gunship crash. Check that one Hound arrives in
   the first low-gravity squad and the second arrives with **Gravity Surge**. Enter the Sorting Line lift and
   confirm **Continue** now starts in the Sorting Line.
4. After Meltdown, leave the first coolant valve early to reset its meter, then pause on the valve to check
   that the meter holds. Resume, seal both valves in order and enter the Wrecking Yard lift.
5. Check that the wrecking ball starts with the second Demolition squad and that the rails turn on after the
   first Live Circuit squad. Defeat the Foreman and Smelter in order. Confirm the results appear and Continue
   is unavailable on the campaign screen.
6. Start OVERTIME, DAILY and BOSS RUSH. Check that the full arsenal is available and each mode has its own
   wave, boss or daily perk setup.

## Workflow

1. Branch from `main` (for example `fix/blimp-altitude` or `round/powerhouse`).
2. Keep commits focused. Subjects follow the existing history: `Add the <name> round: ...` for content rounds,
   `Fix ...` for bug fixes, in the imperative.
3. Update `CHANGELOG.md` under `[Unreleased]` (Added / Changed / Fixed).
4. If you change a value in `TUNE`, update the header comment at the top of `slaghouse.html` to match.
5. Open a pull request with the template filled in. CI must pass, and the owner reviews every change.

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
