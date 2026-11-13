# SLAGHOUSE

[![CI](https://github.com/saworbit/slaghouse/actions/workflows/ci.yml/badge.svg)](https://github.com/saworbit/slaghouse/actions/workflows/ci.yml)
![License: proprietary](https://img.shields.io/badge/license-proprietary-red)
![Phaser 4.2.1](https://img.shields.io/badge/Phaser-4.2.1-8a2be2)
![No build step](https://img.shields.io/badge/build-none-lightgrey)

![SLAGHOUSE: a railgun fight mid-wave, with the weapon ribbon, combo counter and style rank](docs/screenshot.png)

A pixel-art side-scrolling arena shooter running on [Phaser 4](https://phaser.io/) with procedural pixel art,
ragdolls, destructible terrain, twenty kinds of breakable scenery, 61 weapons with mastery stars, 94 enemy types and
27 medals. The five-act
campaign ends in a boss fight. The game also includes endless OVERTIME, a seeded DAILY run and BOSS RUSH.
Play on Easy, Normal or Brutal with keyboard and mouse or a gamepad with aim assist. The game runs in a browser
with no build step.

## Play

The game loads Phaser 4.2.1 from the jsDelivr CDN, so it needs an internet connection. Serve the folder locally
(Python 3 shown) and open the page:

```bash
python -m http.server 8765 --bind 127.0.0.1
```

Open <http://127.0.0.1:8765/slaghouse.html> and click the game. On the title screen, use **W / S** to choose,
**Enter** to select, **A / D** to change difficulty and **E** to start OVERTIME. In **CAMPAIGN**, use **A / D**
to choose **New Campaign** or **Continue** when a checkpoint is available.

The title also has **OVERTIME** (endless waves), **DAILY** (today's seeded OVERTIME run), **BOSS RUSH** (five bosses
back to back), **CODEX**, **ARMORY**, **MEDALS** and **OPTIONS**. Options include the Glass Cannon, Swarm, Moon Boots,
Lights Out and Vampire mutators.

`sfx_bank.js` (sampled sound effects) and `music_bank.js` (soundtrack) sit next to the page and load
automatically. Both are optional; without them the game uses its built-in procedural audio.

## Controls

| Action | Keys |
| --- | --- |
| Move | **A / D** or arrow keys |
| Jump / drop through a platform / wall jump | **Space** or **W** / **S + Space** / jump near a wall, even while rising. Hold toward the wall and jump again to climb |
| Dash (8-way, i-frames) | **Shift** (kick straight out of a dash for a dropkick) |
| Aim and fire | mouse + left click (**J** fires when playing on the keyboard) |
| Kick / parry / execute (enemies pulsing orange) | **F** or right click |
| Prox mine | **G** or middle click |
| Auto-sentry | **T** |
| Grapple hook | **C** (press again to let go) |
| Pick a weapon | **1-9**, **0**, **-**, **=**, **Backspace**, **[**, **]**, `\`, **;**, **'**, **,**, **.**, **/**, **Z**, **X**, **K**, **L**, **U**, **I**, **O**, **Y**, **H** (the chain flail, orbital designator, plasma cutter, spider mines, napalm launcher, bee swarm, laser whip, shrink ray, sonic blaster, grav bomb, pinball cannon, firework launcher, plasma katana, scrap vacuum, siphon, splitter, decoy launcher, stasis grenade, microwave, rocket gauntlet, marksman rifle, tripwire, drone pod, gas launcher, bubble gun, riot shield, glue gun, mini-nuke, dragon's breath, seed launcher and tether gun have no key: use the wheel or Q/E) |
| Weapon wheel (time slows while it's open) | hold **Tab** |
| Cycle weapons | **Q / E** or mouse wheel |
| Pause menu (resume, retry act or restart, post FX, screen shake, volume, controls, quit to title) | **Esc** or **P** |
| Retry the current campaign act or restart the run (mid-run, or once the results are up) | **R** |
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
| Y | Limpet launcher (tap: sticky bomb; hold: set them all off) | H | Net gun (tangles foes for 3 s; fliers drop) |
| wheel | Chain flail (hold: whirl it round you; release: hurl it) | wheel | Orbital designator (hold to paint a spot; a sky laser follows) |
| wheel | Plasma cutter (piercing plasma blades that slice crates) | wheel | Spider mines (crawling bombs that hunt the nearest foe) |
| wheel | Napalm launcher (fuel cans that splash fire across the floor) | wheel | Bee swarm (a pod of homing stingers) |
| wheel | Laser whip (a long crack that drags foes in) | wheel | Shrink ray (shrinks a foe; land on it to squish it) |
| wheel | Sonic blaster (a cone of sound that shoves and stuns) | wheel | Grav bomb (floats foes up, then slams them down) |
| wheel | Pinball cannon (a steel ball that hits harder every bounce) | wheel | Firework launcher (wild rockets that burst into burning stars) |
| wheel | Plasma katana (a slash that bats enemy shots back; slash out of a dash for a dash cut) | wheel | Scrap vacuum (hold: suck up gibs and corpses; let go: blast them out) |
| wheel | Siphon (a drain beam that heals you as it hurts) | wheel | Splitter (a bolt that splits in two every time it hits) |
| wheel | Decoy launcher (a hologram of you that draws foes in, then blows up) | wheel | Stasis grenade (stops time in a bubble; hits stack up and land together) |
| wheel | Microwave (cooks a foe until it pops) | wheel | Rocket gauntlet (a thruster punch that carries you into them) |
| wheel | Marksman rifle (laser-sighted, pierces, triple-damage headshots) | wheel | Tripwire (a laser beam that zaps whatever crosses it) |
| wheel | Drone pod (two gun drones orbit you for 10 s) | wheel | Gas launcher (a cloud of your own gas; light it for a fireball) |
| wheel | Bubble gun (floats foes up in bubbles; pop them to drop them) | wheel | Riot shield (hold to block and reflect shots, let go to bash) |
| wheel | Glue gun (gums foes up so they crawl) | wheel | Mini-nuke (one slow shell, one very big bang) |
| wheel | Dragon's breath (burning buckshot) | wheel | Seed launcher (plants a fungus turret that spores foes) |
| wheel | Tether gun (links three foes: hurt one, hurt all) | | |

The comment at the top of `slaghouse.html` documents every weapon, enemy, wave and tuning value.

## Campaign

The campaign starts with the Nailgun. Clear the first patrol to earn the Shotgun. Other weapons unlock at fixed
points as operations or reinforcement breaks begin. Hotkeys, the wheel and weapon cycling share the issued
arsenal. Across the first five operations, the largest squad grows from two to six foes, the
breaks shorten from 3.2 to 1.6 seconds, and incoming damage rises from 80% to full for the selected difficulty.
The HUD counts down each break. The first heavy arrives alone after you get the Shotgun.
OVERTIME, DAILY and BOSS RUSH start with all 61 weapons.

| Act | Operations | New weapons | Threats and objectives |
| --- | --- | --- | --- |
| I · The Melt Floor | **Lockdown**, **Blackout** | Nailgun, Shotgun, Flare Gun, Net Gun | Start with grunts, then a heavy and drones. Blackout starts in the light so you can equip the Flare Gun before the ambush cuts power. |
| II · The Furnace | **Slag Rain**, **Gravity Loss** | Grenade Launcher, Saw Launcher, Corroder, Railgun, Cryo Cannon, Hornet Pod | Take cover during slag showers, then face the Demolition Team in clear weather. Use the six-second countdown to find cover before the Gunship. The Gunship telegraphs its rocket volleys and strafes, with a pause between attacks. In low gravity, the second Hound, Linkers, and later enemy pairs arrive in separate squads. |
| III · The Sorting Line | **Sorting Shift**, **Meltdown** | Arc Caster, Stake Driver, Plasma Katana, Rocket Launcher, Siphon | Learn the belts and presses, then climb before the slag rises. Fight the Wyrm after the floor drains and seal both coolant valves to open the lift. |
| IV · The Wrecking Yard | **Demolition**, **The Foreman** | Drill Launcher, Tractor, Flak Cannon, Riot Shield, Rivet Minigun, Marksman Rifle | Get to the dais before the second squad releases the ball. The ball starts swinging again after you breach the Foreman's armor. |
| V · The Powerhouse | **Live Circuit**, **The Smelter** | Storm Coil, Prism Laser, Tether Gun, Magma Lance, Singularity, Mini-Nuke | Use the walkway break to get above the rails. The Smelter starts the rail charge in its second phase and overheats below 15% health. |

Clear each squad to start the next countdown. Preparation prompts point to safe terrain before new machinery
starts. Each new weapon card shows what the weapon does and how to equip it. Ground fire clears at the end of an
operation, and the Gunship wreck can no longer set the arena on fire after the clear.

Clearing Lockdown restores health to at least 75 HP before the first perk choice. Clearing Slag Rain brings
it up to at least 65 HP. The Vampire mutator skips clear recovery. Pick Hollow Points, Vampire or Double Jump
after Lockdown. Later perk drafts draw from the remaining pool.
Step onto each marked lift to enter the next act and save a checkpoint. Arrival raises health to at least
60 HP in the Furnace, 75 HP in the Sorting Line and Wrecking Yard, and 80 HP in the Powerhouse. The Vampire
mutator skips this recovery. Checkpoints restore issued weapons, the equipped weapon, perks, difficulty,
mutator and accumulated run stats. A checkpoint from the three-act campaign also keeps its equipped weapon
if that weapon falls outside the new progression.

Choose **Campaign → Continue** to return to the saved act after quitting or reloading. Keep the same browser
profile, host and port to find your save. **New Campaign** replaces the active checkpoint, and completing the
campaign clears it. A campaign left running in another tab keeps playing but stops saving once you start a new one.

Press **R** during play or after defeat to retry the saved act. In Act I or after victory, **R** starts a fresh
run. The pause menu shows **Retry Act** when a checkpoint is available. Speedrunner requires a clear under
10 minutes without using **Continue** or retrying from a checkpoint.

**OVERTIME** (E on the title screen) is endless: random waves that grow and toughen, a mini-boss every few waves,
a boss every sixth (the Smelter and THE FOREMAN, a four-legged crane walker, take turns), a perk after each wave and a new arena every three, including THE WRECKING YARD,
with a wrecking ball swinging across the middle, and THE POWERHOUSE, whose floor rails go live in turns. Your best wave is kept. Every enemy
type can turn up, from echoes (holograms that replay your path and shots) to wraiths and warhorns.
**DAILY** is an OVERTIME run seeded by the date: the same arena, starting perks, waves and modifiers for everyone
that day (mutators are switched off for it). A run keeps the day you started it on, past 00:00 UTC and through
restarts, and its record counts for that day.

Every kill counts toward that gun's **mastery** (three stars gold-plate it): 25, 100 and 250 kills earn its three stars, each +5% damage with
it. The weapon wheel shows each gun's stars.

Medkits restock between waves, and after each wave you pick one of three perks for the rest of the run (more
damage, faster fire, life steal, a double jump, exploding kills and so on). Steam pipes on the walls burst into
scalding jets when shot. Quick kills chain into DOUBLE KILL, TRIPLE and on up to MASSACRE. When five or fewer foes are left, arrows at the screen edge point to them and the stragglers come looking for you. From wave 2, a few foes warp in as **elites**
(armored, shielded, volatile or regenerating, marked by a coloured diamond) that drop health when they die. Medals pop up as you earn them, and the title screen counts your collection. Supply
crates float down mid-wave with a power-up: OVERDRIVE (double damage), HASTE, an AEGIS shield or a MEDPACK. Kicking an enemy that's pulsing orange (under 20% health) executes it for health
orbs. The results screen lists your top guns, your biggest hit and what killed you, grades the run (S-D) and
keeps your best score.

## Project layout

| Path | What it is |
| --- | --- |
| `slaghouse.html` | The whole game. Tuning values live in the `TUNE` object, and the header comment records them. |
| `sfx_bank.js` | Optional sampled SFX bank (Opus, base64), generated by `dev/sfxgen`. |
| `music_bank.js` | Optional synthwave soundtrack (Opus, base64), rendered by `dev/synthwave`. |
| `versions/` | Snapshots of `slaghouse.html` taken before each update round (`slaghouse.before-<round>.html`). |
| `dev/sfxgen/` | AudioGen pipeline for the SFX bank; see its README. |
| `dev/synthwave/` | Offline synth engine and score for the soundtrack; see its README. |
| `dev/audiolib/` | `loud.py`, the K-weighted loudness both audio pipelines level against. |
| `dev/build/` | One-off scripts and code snippets that applied each update round to `slaghouse.html`. Already applied; they won't re-run against the current file. `recv.py` receives playtest screenshots. |
| `dev/playtest/` | In-page test harness: step the game by hand, a bot, arena storms and a timed campaign run; see its README. |
| `dev/screenshots/` | Screenshots from playtesting. |
| `dev/ISSUES.md` | The original issue drafts; the open ones are filed as [GitHub issues](https://github.com/saworbit/slaghouse/issues). |
| `dev/check.mjs` | Static checks run by CI (and locally with `node dev/check.mjs`). |
| `docs/` | Images for this README. |
| `.github/` | CI and release workflows, Dependabot, issue and pull request templates, CODEOWNERS. |
| `.claude/launch.json` | Local preview-server configs for Claude Code. |

## Development notes

- **Tuning:** change the values in `TUNE` (top of the script) and update the header comment to match.
- **Breakable props:** how each kind plays (HP, mounting, what it does when it breaks) is in `PROPS` and
  `PROP_BLAST`, its art in `PROP_ART`, and where each arena puts them in `PROP_SPOTS`. The header comment's
  Breakables entry lists their numbers; `dev/playtest/props.js` checks every spot in both the campaign and
  OVERTIME layouts.
- **Checks:** `node dev/check.mjs` compiles the game script and both audio banks, checks the script tags, and notes
  any sampled sound the game asks for that `sfx_bank.js` lacks; CI runs it on every push to `main` and every pull
  request.
- **Testing:** CI runs static checks and a headless campaign suite. Use the
  [campaign smoke checklist](CONTRIBUTING.md#campaign-smoke-check) to check progression and pacing at real speed.
  See the [playtest guide](dev/playtest/README.md) for local commands and what the automated run covers.
- **Audio:** to regenerate the sound banks, follow `dev/sfxgen/README.md` and `dev/synthwave/README.md`. Both
  need a Python 3.11 venv and `ffmpeg` with libopus; the SFX pipeline also needs a CUDA GPU, while the soundtrack's
  venv comes from `dev/synthwave/requirements.txt`.
- **History:** see [CHANGELOG.md](CHANGELOG.md). Pushing a `vX.Y.Z` tag builds the release and its playable zip
  (`.github/workflows/release.yml`); the steps are in [CONTRIBUTING.md](CONTRIBUTING.md).

## Contributing and security

Contributions are by invitation; see [CONTRIBUTING.md](CONTRIBUTING.md). Report security problems privately as
described in [SECURITY.md](SECURITY.md).

## Licensing

Copyright (c) 2026 Shane Wall. All rights reserved. SLAGHOUSE is proprietary software: no part of it may be copied,
modified or distributed without written permission. See [LICENSE](LICENSE).

Third-party components keep their own licenses:

- **Phaser** is MIT-licensed and loaded from the jsDelivr CDN; it isn't included in this repository.
- The sampled SFX in `sfx_bank.js` were generated with Meta's **AudioGen** (`facebook/audiogen-medium`), whose model
  weights are licensed CC BY-NC 4.0, so treat that bank as non-commercial. Every sampled sound has a synth fallback,
  so the game can ship without it.
