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

CI covers static checks. Play the affected modes in a browser and watch the console for errors.
The [in-page harness](dev/playtest/README.md) can step the game for combat and arena checks.

### Campaign smoke check

1. In a fresh browser profile, start a new campaign. Clear Lockdown and confirm the three opening perks appear.
   Pick one with **1**, **2** or **3** while a different weapon is equipped. The perk pick should leave the weapon equipped.
2. Clear Blackout and enter the marked lift. Record your weapon, perks, difficulty and mutator. Reload at the
   same URL and choose **Campaign → Continue**. Check that you start Slag Rain with the recorded build and settings.
3. Die in the Furnace and press **R** after the results appear. Verify that the retry restores the Furnace
   checkpoint. Clear the act and enter the Sorting Line lift. Confirm **Continue** now starts in the Sorting Line.
4. After Meltdown, leave the first coolant valve before the meter fills and check that it resets. Pause while
   standing at the valve and check that the meter holds. Resume, open both valves in order and defeat the Smelter.
   Confirm the results appear and **Continue** is unavailable on the campaign screen.
5. Start OVERTIME, DAILY and BOSS RUSH after a campaign change to the shared wave or results code. Check that each
   mode starts in the expected arena and shows its own wave, boss or daily perk setup.

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

## Audio

The sound banks are optional; every sampled sound has a synth fallback in the game. To regenerate them, follow
[`dev/sfxgen/README.md`](dev/sfxgen/README.md) and [`dev/synthwave/README.md`](dev/synthwave/README.md).

## Reporting problems

Use the [issue templates](https://github.com/saworbit/slaghouse/issues/new/choose) for bugs and ideas; open work is
tracked in [GitHub issues](https://github.com/saworbit/slaghouse/issues), not in `dev/ISSUES.md` (the old drafts).
For security problems, see [SECURITY.md](SECURITY.md).
