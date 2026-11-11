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

Then open <http://localhost:8765/slaghouse.html>.

## Checks

```bash
node dev/check.mjs
```

This compiles the game script and both audio banks, checks that local scripts exist and that CDN scripts are pinned
to an exact version. CI runs the same script on every push to `main` and on every pull request.

There are no automated gameplay tests yet; play the modes you touched (campaign, OVERTIME, DAILY, BOSS RUSH) and
watch the browser console for errors.

## Workflow

1. Branch from `main` (for example `fix/blimp-altitude` or `round/powerhouse`).
2. Keep commits focused. Subjects follow the existing history: `Add the <name> round: ...` for content rounds,
   `Fix ...` for bug fixes, in the imperative.
3. Update `CHANGELOG.md` under `[Unreleased]` (Added / Changed / Fixed).
4. If you change a value in `TUNE`, update the header comment at the top of `slaghouse.html` to match.
5. Open a pull request with the template filled in. CI must pass, and the owner reviews every change.

## Releasing

Releases are tagged `vX.Y.Z` and published on GitHub with a playable zip. These steps are manual for now;
automating them is [issue #20](https://github.com/saworbit/slaghouse/issues/20).

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

4. Build the playable zip (a `slaghouse/` folder with the game, both audio banks, LICENSE, README and CHANGELOG):

   ```bash
   python -c "import sys,zipfile;v=sys.argv[1];z=zipfile.ZipFile(f'slaghouse-{v}.zip','w',zipfile.ZIP_DEFLATED);[z.write(f,'slaghouse/'+f) for f in ['slaghouse.html','sfx_bank.js','music_bank.js','LICENSE','README.md','CHANGELOG.md']]" vX.Y.Z
   ```

5. Publish the release with notes (highlights, notable fixes, how to play) and the zip attached:

   ```bash
   gh release create vX.Y.Z --title "SLAGHOUSE vX.Y.Z" --notes-file notes.md --verify-tag slaghouse-vX.Y.Z.zip
   ```

## Audio

The sound banks are optional; every sampled sound has a synth fallback in the game. To regenerate them, follow
[`dev/sfxgen/README.md`](dev/sfxgen/README.md) and [`dev/synthwave/README.md`](dev/synthwave/README.md).

## Reporting problems

Use the [issue templates](https://github.com/saworbit/slaghouse/issues/new/choose) for bugs and ideas; open work is
tracked in [GitHub issues](https://github.com/saworbit/slaghouse/issues), not in `dev/ISSUES.md` (the old drafts).
For security problems, see [SECURITY.md](SECURITY.md).
