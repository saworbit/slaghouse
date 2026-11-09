# SLAGHOUSE: draft GitHub issues

These issues came out of the play-test session (fixes landed in commit 41c8e75 on `audio-soundtrack-sfx`).
They aren't filed because the local repo has no GitHub remote and saworbit has no matching repository.
Labels use GitHub's defaults (`bug`, `enhancement`), which a new repo starts with.
Issues 1-5 come from the play-test session, 6-8 from the session that built the game, 9-13 from the SFX
session, and 14 from the overdrive round. They were checked against each other for duplicates.

---

## 1. [HUD] Keep the pending "ESC AGAIN: QUIT" prompt visible for its whole window

**Status:** obsolete. The overdrive round replaced the double-press Esc with a pause menu, so there is no prompt left to hide.

**Labels:** bug

**Context**
The first Esc mid-run starts a 1.6 s confirm window (`GameScene.update`, `slaghouse.html:2625`) and shows a callout.
`HudScene.callout()` (`slaghouse.html:6563`) kills the current callout's tweens and replaces its text. Any combat
callout fired during the window (multi-kill, rank-up, rampage, and so on) wipes the prompt. The confirm is still armed,
but the player can't see it, so a second Esc quits with no visible warning.

**Repro**
In a busy wave, press Esc and keep killing. A combat callout replaces "ESC AGAIN: QUIT" before 1.6 s are up.

**Proposed fix / acceptance**
- While `escUntil` is in the future, either stop other callouts from replacing the prompt, or draw the prompt in its own label.
- The prompt stays readable for the full window, and combat callouts come back afterwards.

---

## 2. [HUD] Stop damage numbers stacking into an unreadable blob

**Status:** done in the overdrive round. `dmgNumber` now moves a new number up and sideways, away from numbers still rising nearby.

**Labels:** enhancement

**Context**
`flushDmg` and `dmgNumber` (`slaghouse.html:3778-3791`) spawn each number at the enemy's head with only ±4 px of
horizontal jitter. Rapid hits on one target, or on enemies packed together, overlap. Two numbers then read as one,
e.g. "18" and "12!" look like "1812!".

**Proposed fix / acceptance**
- Push each new number away from numbers still alive nearby (upward or sideways), or merge them into one rising total
  per enemy.
- In a dense fight, each number on screen can be read on its own.

---

## 3. [Game] Add a real pause state (Esc / P, and when the tab is hidden)

**Status:** done in the overdrive round. Esc or P opens resume / restart / post FX / quit. A hidden tab pauses the run, and coming back waits on the menu.

**Labels:** enhancement

**Context**
There is no pause. Players press Esc expecting one. Esc used to quit the run instantly; it now needs a second press,
but that's a stopgap. A hidden tab freezes the loop (and, since 41c8e75, the audio), then drops the player straight
back into live combat on return.

**Proposed fix / acceptance**
- Esc (and/or P) opens a pause overlay: resume, restart, quit to title. The overlay pauses physics, timers and weapon
  sound loops.
- Hiding the tab enters the same pause, and returning doesn't resume until the player chooses to.
- Once quit is a menu option, the double-press Esc confirm can go.

---

## 4. [Tooling] Fix or remove the broken `static` and `static-alt` preview configs

**Labels:** bug

**Context**
In `.claude/launch.json`:
- `static` (port 8765): on the dev machine that port is held by another long-running process serving a stale copy of the game.
- `static-alt` (port 8771): `autoPort` isn't set to false, so the preview tool reassigns the port (to 8772). python
  still binds 8771 from its hard-coded args, so nothing listens on the reassigned port and the preview comes up dead.
- `static-test` (port 8781, `autoPort: false`) is the only working config.

Cause of the first point (found 2026-11-09): the game-build session's preview tool is still tied to the folder it
started in. Its `static` server on 8765 serves the old copy of the game from there, whatever config name is asked
for. That server is stopped now and won't be started again. The `autoPort` problem still stands.

**Proposed fix / acceptance**
- Set `autoPort: false` on every config whose args hard-code the port, or drop the broken entries and keep one working config.
- `preview_start` on each remaining config serves the current `slaghouse.html`.

---

## 5. [Testing] Save the play-test bot as a repeatable smoke test

**Labels:** enhancement

**Context**
The project has no automated tests. The session's regression run used an in-page harness typed into the console
and never saved. It did the following:
- Sent synthetic key events (`keydown`/`keyup` with `keyCode`/`code`).
- Aimed by setting `activePointer` from enemy positions with `g.aimMode = 'mouse'`.
- Kept the player alive by forcing `g.hp`.
- Cleared waves with `damageEnemy(e, 99999, 1, 0, 'nail')`, and jumped waves by setting `g.wave = N - 1` and clearing.
It caught the weapon-swap cooldown bug and confirmed a full 61/61 run.

**Proposed fix / acceptance**
- Add `dev/playtest/bot.js` that can be loaded into a running page, plus a short README.
- One call plays all five waves to ARENA CLEARED while cycling weapons, and reports kills, errors and average fps.
- Optional: a headless runner (e.g. Playwright) that serves the page and fails on console errors or an incomplete run.
- Audio checks (from the SFX session): every name passed to `Sfx.smp()` / `loopNode()` exists in `sfx_bank.js`,
  and `dev/sfxgen/build.py` printed no `skip <name>` lines. A missing name silently falls back to the synth.
- Prior art (from the game-build session): its harness fast-forwarded deterministically with `game.loop.sleep()`
  plus repeated `game.step()`, and posted canvas snapshots to `dev/build/recv.py`. It was also never saved.
- Notes from the overdrive-round session, which drove the game the same way:
  - Also set `game.loop.now`, `time` and `delta` before each `game.step()`.
  - Stub `Date.now` with a virtual clock. Phaser 4's TweenManager times itself with `Date.now()` and skips any gap
    over 500 ms, so HUD callouts freeze under manual stepping otherwise.
  - `renderer.snapshot()` only resolves after a rendered frame, so step at least one frame before awaiting it.
  - A hidden preview pane fires `visibilitychange`, which now pauses the run; stub `pauseGame` while testing.
  - A full six-wave bot run (all 18 weapons, dash, kicks) finished 88/88 with no errors.
- Notes from the furnace-round session:
  - A naive bot (aim at the nearest foe, walk toward it, jump when blocked) gets stuck behind ARENA 02's pillar and
    the arena 1 plateau. It needs an unstick rule: after 5 s with no line of sight to any enemy, teleport to an open
    tile with floor near the nearest one. With that, a run with all 23 weapons cleared both arenas, 88/88, no errors.
  - To test the second arena directly, restart the scene with `{ arena: 1, carry: {...} }` (see `descend()`).
  - Placing test enemies by tile needs care: several floor tiles hold crates ('x'), and an enemy spawned inside one
    never moves.

---

# Game and repo issues (from the game-build session)

## 6. [Balance] Tune the havoc waves after real-time play

**Labels:** enhancement

**Context**
The havoc round (prism laser, grapple hook, cloaker, pyro, gunship, BLACKOUT on wave 2) was only checked in a stepped
simulation, never played at real speed. Signs it may be too harsh:
- In a 40 s soak of wave 3 (slag rain, a pyro and the gunship), a player standing still took 58 hits for 386 damage.
  The player has 100 HP and four +30 medkits.
- Wave 2 has 17 enemies, two of them near-invisible cloakers whose strikes do 20, inside the blackout's small
  circle of vision.
- The juggernaut needed a second tuning pass after the frenzy round for the same reason.

The knobs are `TUNE.CLOAKER`, `TUNE.PYRO`, `TUNE.GUNSHIP`, the `WAVES` table, and the blackout mask's gradient.

The overdrive round adds to this: harpooners in wave 3, a linker pair in wave 4, and the new MELTDOWN wave 5
(slag tide, slaglings, burrowers). None of it has been played at real speed either. Knobs: `TUNE.HARPOON`,
`TUNE.LINKER`, `TUNE.BURROWER`, `TUNE.SLAGLING`, `TUNE.TIDE`.

The crucible round adds a mirror knight to wave 2, a stitcher to wave 3, a hive to wave 4 and the Slag Wyrm
mini-boss to wave 5, plus executions and health orbs (a new source of healing). Knobs: `TUNE.MIRROR`, `TUNE.HIVE`,
`TUNE.GNAT`, `TUNE.STITCH`, `TUNE.WYRM`, `TUNE.EXECUTE`. The results-screen grade weights (in `showOver`) are a
first guess too.

The furnace round adds a tar spitter to wave 2, buzzsaws to waves 3-4, magnetrons to waves 4-5 and a tar spitter
to wave 5, moves waves 4-6 into the second arena, and adds a difficulty select. Points to check at real speed:
- In a low pocket (under a girder) a hostile buzzsaw hit the player 6 times in 3 s before it got a 0.8 s daze and a
  1.2 s re-hit window after each hit. Check it is now fair, and that kicking it back is easy to time.
- The magnetron's field makes every bullet weapon miss (bend 22 rad/s at the centre). That is the intent (use beams,
  blasts, the kick or a thrown object), but check that players read it; a SHOTS DEFLECTED callout fires once.
- Tar (x0.5 run speed, x0.72 jump) combined with the BLACKOUT on wave 2 may be harsh.
Knobs: `TUNE.BUZZSAW`, `TUNE.MAGNET`, `TUNE.TARSPIT`, `TUNE.TRACTOR`, `TUNE.ACID`, and `DIFFS` for the difficulty
multipliers.

The shockworks and slagforge rounds add the mimic, howitzer and blinker, the gasbag, welder (with turrets) and
duelist, the furnace fire jets, and a perk pick after each wave. Points to check:
- The duelist was tuned against a bot with perfect aim (it lasts 1-2 s against a held nailgun). A human may find
  its sidestep too slippery; `dodge`, `dodgeCd` and the 0.25 s slip window are the knobs.
- Perks stack: hollow points + adrenaline is x1.8 damage under 35 HP, and volatile can chain. None of it has
  been played for real. Knobs: `PERKS`, `TUNE.VOLATILE`.
- The fire jets fling you sideways after one tick; check you can't be juggled between two columns.

**Proposed fix / acceptance**
- Someone plays waves 2-4 at real speed and notes each death and its cause.
- Every big hit (cloaker strike, gunship volley, firebomb) has a tell a player can react to, and the blackout still
  shows threats coming.
- Any change goes into both `TUNE` and the header comment in `slaghouse.html`.

---

## 7. [Licensing] Choose a project licence and clear the AudioGen SFX before any commercial use

**Labels:** documentation

**Context**
- There is no LICENSE file, so the terms for the code, art and music are unstated.
- The samples in `sfx_bank.js` come from `facebook/audiogen-medium`, whose weights are CC-BY-NC 4.0
  (`dev/sfxgen/README.md`). That allows non-commercial use with attribution. The README now mentions it; the game
  itself credits nothing.

**Proposed fix / acceptance**
- The owner picks a licence; a LICENSE file is added and the README's Licensing section is updated.
- AudioGen gets attributed wherever credits are shown, including any in-game credits added later.
- Before any commercial release, either regenerate the SFX from a commercially licensed source or ship without
  `sfx_bank.js` (every sampled sound already has a synth fallback).

---

## 8. [Build] Keep the source in modules and build the single-file game from them

**Labels:** enhancement

**Context**
`slaghouse.html` is about 480 KB and 6,900 lines. Each update round was applied by a one-off script
(`dev/build/splice_*.py`) that finds text anchors in the file and inserts code. If an anchor has moved, the splice
fails. The scripts can't be re-run, and every change is a diff buried in one very large file.

**Proposed fix / acceptance**
- Keep shipping one self-contained `slaghouse.html`, but keep the source in `src/` (for example art, level, player,
  weapons, enemies, scenes, audio) and join the files with a small build script: plain concatenation, no bundler.
- The built file plays the same as today's.
- Future rounds edit `src/` directly, and `dev/build/` becomes history.

---

# Audio issues (from the SFX session)

`tech-debt` is not a GitHub default label: create it, or use `enhancement`.

## 9. [sfxgen] Make sfx_bank.js rebuildable from a fresh clone

**Labels:** tech-debt

**Problem.** `build.py` reads the picked takes from `out/proc/<name>/<id>.wav` (dev/sfxgen/build.py:60), but
`out/proc/` is gitignored (dev/sfxgen/.gitignore). On a fresh clone `build.py` crashes with a soundfile error.
The only way back is to re-run `gen.py` and `process.py`: about 12 min on the GPU plus about 7 GB of model
downloads. Even then the takes may not match `picks.json`:

- Seeds are `1000 + list(SOUNDS).index(name)` (dev/sfxgen/gen.py:33), so adding or reordering a sound in
  `sounds.py` reseeds every sound after it.
- Different GPU, torch or xformers versions can change the output for the same seed.

So the candidate ids in `picks.json` can silently point to different sounds.

**Proposal.**
- Commit only the takes the bank uses: 119 takes, 6.5 MB as 48 kHz WAV, roughly half that as FLAC. For example
  `takes/<name>/<id>.flac`, with `build.py` reading those first.
- Seed from a stable hash of the sound's name instead of its position in the manifest.
- Until then, have `build.py` exit with a clear message ("run gen.py + process.py first") when `out/proc/` is
  missing.

**Done when.** On a fresh clone, `build.py` reproduces `sfx_bank.js`. Adding a new sound to `sounds.py` doesn't
change any other sound's takes.

---

## 10. [sfxgen] Flag a stale calib.json when a procedural sound changes

**Labels:** tech-debt

**Problem.** Every sample's gain is matched to the loudness of the synth sound it replaces, as stored in
`calib.json` (dev/sfxgen/build.py:68). That file is measured by hand: paste `calib.js` into the devtools console
on `slaghouse.html` and run `slagCalib()`. If someone edits a synth sound in the `Sfx` object (making it louder,
longer or brighter), nothing notices, and that sample stays matched to the old level. The N A/B toggle then
compares unequal levels, and the sample sits wrong in the mix.

**Proposal.** When `calib.js` runs, record a fingerprint per sound: a hash of `Sfx[method].toString()`.
Add a small check that hashes the same methods from the current `slaghouse.html` (or have `calib.js` report
the mismatch), so stale entries are listed before a build. Optional: run calibration headless (Playwright or
Puppeteer driving the `OfflineAudioContext` code that already exists) so re-measuring is one command.

**Done when.** Changing a procedural sound and then building warns that the sound's calibration is stale.

---

## 11. [Sfx] N toggle leaves the ambient hum on the old version

**Labels:** bug

**Problem.** The N handler resets the arc, flame and cryo loops (`Sfx.arcSet(false)` etc.) but not the ambient
hum. `startHum()` only runs once (`if (this.hum) return`). And when the hum comes from the bank, it stores just
the gain (`this.hum = L.g`) and drops the looping `BufferSource`, so the code can't stop it later.

**Steps to reproduce.** With `sfx_bank.js` loaded, start a run and press N (the callout reads `SYNTH SFX`). The
sampled hum keeps playing under the synth one-shots. Starting in synth mode does the opposite: after N, the synth
drone stays.

**Proposal.** Keep the full `{ g, nodes }` for both hum versions (as `humSynth` already does for the synth one).
Generalize `swapHum()` to crossfade from whichever version is playing to the one `useBank` now selects, and call
it from the N handler.

**Done when.** After each N press, the hum matches the selected mode. It crossfades with no gap and no doubled
drone, and repeated toggling doesn't stack or leak nodes.

---

## 12. [Audio] Report sample-bank decode failures instead of swallowing them

**Labels:** bug

**Problem.** Both loaders discard `decodeAudioData` errors. `Sfx.loadBank()` passes `() => {}` as the rejection
handler for every take, and the music loader does the same. Some browsers can't decode Ogg Opus through
`decodeAudioData`, for example Safari versions without Ogg support. There, the game silently plays the synth
versions of everything. The N callout still says `SAMPLED SFX`, because it checks `window.SLAG_SFX` (the bank
file loaded), not whether anything decoded. The result looks like a mixing bug rather than a missing feature.

**Proposal.**
- Count failed decodes per bank and print one `console.warn` with the count.
- Base the N (and B) callouts on decoded buffers, for example `SFX BANK UNAVAILABLE` when nothing decoded.
- Optionally, fall back to AAC/MP4 takes for browsers without Opus; this needs a second encode in `build.py`.

**Done when.** A corrupted take, or a browser without Opus decoding, logs a warning, and the toggle callouts
show what is actually playing.

---

## 13. [Repo] Keep generated audio banks and version snapshots from growing history

**Status:** partly done in the overdrive round. `build.py` now keeps the existing encode for any sound whose picks and source WAVs are unchanged (`out/bank_src.json`), and new encodes are bit-exact, so adding a sound adds one line to `sfx_bank.js`. `music_bank.js` and `versions/` still stand as described.

**Labels:** tech-debt

**Problem.** `music_bank.js` (2.6 MB) and `sfx_bank.js` (0.46 MB) are base64 blobs that change completely on every
rebuild, so each re-render adds their full size to git history. The object store is already about 5 MB after
three commits. `versions/` holds full copies of `slaghouse.html` from before each update round (2.2 MB), which git
history and tags now cover.

**Proposal.** Pick one:
- Track the banks with Git LFS.
- Commit only the source files (`picks.json`, `score.py`) plus the cached takes from issue 9, and build the banks
  in a release step. This could share a step with the single-file build in issue 8.

Replace new `versions/` snapshots with tags such as `before-sfx`.

**Done when.** Rebuilding a bank no longer adds megabytes to history, and the way to get a playable build is
documented.

---

## 14. [sfxgen] Sampled takes for the overdrive-round sounds

**Status:** done. 16 sounds now have bank takes (17 bank entries: the ripper loop has rev and cut takes). `lockOn` and `dodge` stay synth as UI cues. The prompts went at the end of `sounds.py`, so no existing seed moved.

**Labels:** enhancement

**Context**
The overdrive round added 18 procedural sounds with no bank takes yet: `dash`, `dodge`, `lockOn`, `hornet`,
`lanceFire`, the `lanceSet` and `ripperSet` loops, `glaive`, `glaiveCatch`, `whirr`, `sizzle`, `splat`, `rumble`,
`erupt`, `dig`, `chain`, `linkOn`, `buzz`. They skip `Sfx.smp()`, so **N** doesn't change them, and they sit beside
the AudioGen takes at synth quality.

**Proposed fix / acceptance**
- Add prompts for them to `dev/sfxgen/sounds.py`, generate, pick and calibrate as usual. Mind issue 9: today a new
  entry reseeds every sound listed after it.
- Route each one-shot through `this.smp(name)` first (and the two loops through `loopNode`), keeping the synth
  version as the fallback.

---

## 15. [Input] Test the gamepad layer on real controllers

**Labels:** testing

**Context**
The shockworks round added gamepad support (`PAD` in `slaghouse.html`), read straight from `navigator.getGamepads()`
with the standard button mapping. It was only tested against a stubbed gamepad object in the browser console: title
start and difficulty, stick movement and aim, trigger fire, D-pad weapon cycling, the pause menu, and that rumble
calls `vibrationActuator.playEffect`. No real pad has been plugged in yet.

**Things to check**
- An Xbox pad and a DualSense on Chrome and Firefox (Firefox maps some pads non-standard; `gp.mapping` should be
  `'standard'`).
- The 0.22 dead zone and the 0.35 / 0.6 move and drop thresholds feel right; aim isn't twitchy at the stick's edge.
- Rumble strength (`shake()` intensity x 90) is pleasant and never stuck on.
- Holding LB for the wheel while steering with the right stick picks the slot you expect.

**Done when.** Each pad has been played through a full run and any mapping fixes are in.
