# SLAGHOUSE

A pixel-art side-scrolling arena shooter: one HTML file running on [Phaser 4](https://phaser.io/) with procedural
pixel art, ragdolls and gibs, destructible terrain, 29 weapons, 44 enemy types, two arenas and six waves that end
in a boss fight, a perk pick after every wave and 16 medals to collect, on Easy, Normal or Brutal, with keyboard
and mouse or a gamepad (with aim assist). The game runs in a browser with no build step.

## Play

The game loads Phaser 4.2.1 from the jsDelivr CDN, so it needs an internet connection. Serve the folder locally
(Python 3 shown) and open the page:

```bash
python -m http.server 8765 --bind 127.0.0.1
```

Then go to <http://localhost:8765/slaghouse.html>, click the game, pick a difficulty with **A / D** and press
**Enter**.

`sfx_bank.js` (sampled sound effects) and `music_bank.js` (soundtrack) sit next to the page and load
automatically. Both are optional; without them the game uses its built-in procedural audio.

## Controls

| Action | Keys |
| --- | --- |
| Move | **A / D** or arrow keys |
| Jump / drop through a platform / wall jump | **Space** or **W** / **S + Space** / jump while sliding down a wall |
| Dash (8-way, i-frames) | **Shift** (kick straight out of a dash for a dropkick) |
| Aim and fire | mouse + left click (**J** fires when playing on the keyboard) |
| Kick / parry / execute (enemies pulsing orange) | **F** or right click |
| Prox mine | **G** or middle click |
| Auto-sentry | **T** |
| Grapple hook | **C** (press again to let go) |
| Pick a weapon | **1-9**, **0**, **-**, **=**, **Backspace**, **[**, **]**, `\`, **;**, **'**, **,**, **.**, **/**, **Z**, **X**, **K**, **L**, **U**, **I**, **O**, **Y** |
| Weapon wheel (time slows while it's open) | hold **Tab** |
| Cycle weapons | **Q / E** or mouse wheel |
| Pause menu (resume, restart, post FX, screen shake, music and SFX volume, quit to title) | **Esc** or **P** |
| Restart run | **R** |
| Post-processing on / off | **V** |
| Mute / sampled vs synth SFX / sampled vs synth music | **M** / **N** / **B** |

On a gamepad: left stick moves (down + **A** drops through a platform), right stick aims, **RT** fires, **LT** throws a
mine, **A** jumps, **B** dashes, **X** kicks, **Y** fires the hook, **RB** drops the sentry, hold **LB** for the weapon
wheel (pick with the right stick), the D-pad cycles weapons and **Start** pauses. Menus take the D-pad or left stick,
**A** and **B**.

## Weapons

| Key | Weapon | Key | Weapon |
| --- | --- | --- | --- |
| 1 | Nailgun | 8 | Slag hose |
| 2 | Shotgun | 9 | Singularity |
| 3 | Grenade launcher | 0 | Rivet minigun |
| 4 | Rocket launcher | - | Cluster mortar |
| 5 | Arc caster | = | Stake driver |
| 6 | Railgun | Backspace | Cryo cannon |
| 7 | Saw launcher | [ | Prism laser |
| ] | Ripper (held chain blade; kills heal you) | `\` | Hornet pod (hold to lock on, release to launch) |
| ; | Magma lance (hold to charge, release to fire) | ' | Glaive (thrown ring that comes back; hold to grind) |
| , | Forge hammer (tap to swing; hold for a shockwave slam, or a ground-pound in the air) | . | Storm coil (sticky tesla coils that link into fences; hold to overload) |
| / | Flak cannon (bursts into ricocheting shrapnel) | Z | Tractor (hold to grab drums, corpses or light enemies; release to throw) |
| X | Corroder (acid cone; corroded enemies take +40% damage, shields melt) | K | Shock rifle (tap: plasma orb; hold: beam; beam an orb for a combo) |
| L | Needler (homing needles; seven in one target supercombine) | U | Drill launcher (bores through scenery, grinds into a body, then blows) |
| I | Trick revolver (six rounds; wall shots ricochet into the nearest foe) | O | Flare gun (sticky flares that burn and light foes up in the dark) |
| Y | Limpet launcher (tap: sticky bomb; hold: set them all off) | | |

The comment at the top of `slaghouse.html` documents every weapon, enemy, wave and tuning value.

## Waves

Waves 1-3 are fought in **ARENA 01 :: THE MELT FLOOR**. Clearing wave 3 takes you down the lift to **ARENA 02 ::
THE FURNACE** for the rest of the run, with your health, gun and stats carried over.

1. 10 placed enemies.
2. 17 enemies in a **BLACKOUT**: you only see a small circle around you, and gunfire lights it up. Includes a
   mirror knight that reflects your shots, a tar spitter whose puddles slow you (and burn when lit), a mimic
   hiding among the drums, a gasbag whose toxic cloud goes up in a fireball if you light it, and a creeper that
   drops off the ceiling.
3. 17 enemies under **SLAG RAIN**, with a pyro, a harpooner, a corpse-raising stitcher, a ricocheting buzzsaw
   (kick it back), a mimic, a gasbag, a duelist that sidesteps your shots, an armoured roller and the gunship
   mini-boss.
4. 16 enemies in **LOW GRAVITY**, led by the juggernaut mini-boss, with a pair of linker fence drones, a hive
   that keeps a gnat swarm going, a buzzsaw, a magnetron whose field bends your shots away, a teleporting blinker
   a howitzer that shells you from range, a welder that repairs the machines and builds turrets, and a jammer whose
   EMP ring jams your gun. The furnace's fire vents go off every few seconds.
5. 15 enemies (27 once the slaglings split) in **MELTDOWN**: molten slag floods the ground floor for 6 s at a
   time, about every 25 s. Slaglings, a burrower, harpooners, linkers, a duelist, a roller, a magnetron, a tar
   spitter, a blinker and the Slag Wyrm mini-boss.
6. THE SMELTER, the boss.

Medkits restock between waves, and after each wave you pick one of three perks for the rest of the run (more
damage, faster fire, life steal, a double jump, exploding kills and so on). Steam pipes on the walls burst into
scalding jets when shot. Medals pop up as you earn them, and the title screen counts your collection. Kicking an enemy that's pulsing orange (under 20% health) executes it for health
orbs. The results screen grades the run (S-D) and keeps your best score.

## Project layout

| Path | What it is |
| --- | --- |
| `slaghouse.html` | The whole game. Tuning values live in the `TUNE` object, and the header comment records them. |
| `sfx_bank.js` | Optional sampled SFX bank (Opus, base64), generated by `dev/sfxgen`. |
| `music_bank.js` | Optional synthwave soundtrack (Opus, base64), rendered by `dev/synthwave`. |
| `versions/` | Snapshots of `slaghouse.html` taken before each update round (`slaghouse.before-<round>.html`). |
| `dev/sfxgen/` | AudioGen pipeline for the SFX bank; see its README. |
| `dev/synthwave/` | Offline synth engine and score for the soundtrack; see its README. |
| `dev/build/` | One-off scripts and code snippets that applied each update round to `slaghouse.html`. Already applied; they won't re-run against the current file. `recv.py` receives playtest screenshots. |
| `dev/screenshots/` | Screenshots from playtesting. |
| `dev/ISSUES.md` | Draft GitHub issues (the repo has no GitHub remote yet). |
| `.claude/launch.json` | Local preview-server configs for Claude Code. |

## Development notes

- **Tuning:** change the values in `TUNE` (top of the script) and update the header comment to match.
- **Testing:** there are no automated tests yet. Playtesting has been done by driving the game from the browser
  console; saving that as a smoke test is a draft issue in `dev/ISSUES.md`.
- **Audio:** to regenerate the sound banks, follow `dev/sfxgen/README.md` and `dev/synthwave/README.md`. Both
  need a Python 3.11 venv and `ffmpeg` with libopus; the SFX pipeline also needs a CUDA GPU.
- **History:** see [CHANGELOG.md](CHANGELOG.md).

## Licensing

The code, art, music and procedural sounds are original to this project, and there is no license file yet. The
sampled SFX in `sfx_bank.js` were generated with Meta's AudioGen, whose model weights are licensed CC-BY-NC 4.0,
so treat that bank as non-commercial. Phaser is MIT-licensed and loaded from its CDN.
