# Changelog

All notable changes to SLAGHOUSE are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the game has no numbered releases yet.

## [Unreleased]

### Added
- **Overdrive round: four new weapons.** Ripper (**]**), a held chain blade that pins and shreds what it chews,
  cuts crates, eats enemy shots and heals you 6 HP per kill. Hornet pod (`\`): hold to paint up to six lock-ons
  near the crosshair, release to launch a seeker per lock. Magma lance (**;**): hold to charge, release a molten
  beam that pierces, bores through breakable tiles, ignites, and kicks you back hard enough to lance-jump; a full
  charge bursts on impact, and holding it too long vents and scalds you. Glaive (**'**): a thrown ring that cuts on
  the way out and back, ready to throw again once caught; hold fire to make it grind in place, steered by the mouse.
- **Four new enemies.** Slaglings: molten blobs that split big → mid → small (seven kills each). Burrowers: slag worms
  that swim under your floor and erupt through you after a rumbling tell, hittable only once they're out.
  Harpooners: chain-harpoon brutes that reel you in for a slash (kick, dash or hurt them to break free). Linkers:
  drone pairs that throw a beam between them at your chest height, frying their own side too.
- **MELTDOWN wave** (new wave 5, before the boss): molten slag floods the ground floor for 6 s at a time. It burns
  you, ignites anything not fireproof, sets off ticks and drums, and melts gibs. Harpooners join wave 3 and a
  linker pair joins wave 4. The run is now six waves.
- **Dash** (**Shift**): 8-way burst with i-frames, one air dash per jump, a style bonus for dodging through hits,
  and a dropkick when you kick straight out of a dash.
- **Pause menu** (**Esc** / **P**): resume, restart, post FX on/off, quit to title. Hiding the tab pauses the run,
  and returning waits on the menu.
- **Post-processing** (**V**, remembered between sessions): bloom, a warp pulse on nearby blasts, and colour grading
  for rampage, low health, death and pause. It uses Phaser 4 camera filters on the world only, not the HUD.
- **HUD and feedback:** wave title cards with the wave's modifier; markers round the player showing where each hit
  came from; edge arrows to off-screen enemies once five or fewer are left (and to bosses); a dash meter; a lance
  charge ring and hornet lock pips at the crosshair; lock-on brackets on targets.
- Sounds for all of the above. `sfx_bank.js` has AudioGen takes for 16 of them (dash, hornet launch, lance shot
  and charge hum, ripper rev and cut loops, glaive throw / catch / whirr, sizzle, slag splat, worm rumble /
  eruption / dig, chain, linker power-up and buzz), each with a procedural fallback. The lance hum pitches up
  with charge, and the ripper crossfades from revving to cutting on a bite. The lock-on and dodge chimes stay
  synth, like the other UI cues. The bank grows from 62 to 79 sounds.
- Synthwave soundtrack (`music_bank.js`, rendered by `dev/synthwave`): title theme, MELT FLOOR (waves 1-2),
  SLAG RAIN (waves 3-5), THE SMELTER (boss), and arena-cleared / game-over jingles. Stage loops stay muffled
  until an enemy notices you and open up as the fight heats up. **B** switches to the procedural drum + bass loop.
- Sampled sound effects (`sfx_bank.js`, generated with AudioGen by `dev/sfxgen`): 62 sounds with 1-5 takes each,
  level-matched to the synth versions they replace, slight pitch variation, and never the same take twice in a
  row. **N** switches back to the procedural synth sounds.
- `dev/sfxgen/build.py` re-encodes only sounds whose picks or source audio changed (tracked in
  `out/bank_src.json`), and its encodes are bit-exact, so adding a sound no longer rewrites the whole bank.
- Both audio banks are optional: without `sfx_bank.js` or `music_bank.js` the game falls back to its procedural
  audio.
- Asset pipelines for the banks: `dev/sfxgen` (generate, trim, rank, audition, calibrate, build) and
  `dev/synthwave` (offline synth engine and score).

### Changed
- **Esc** mid-run opens the pause menu. It replaces the earlier double-press confirm (`ESC AGAIN: QUIT`).
- The weapon bar holds 18 compact slots, and the control hints list the new keys.
- Damage numbers step aside from numbers still rising nearby, so rapid hits stay readable.
- The control hints fade out completely after about 13 s instead of staying on screen at 30%.

### Fixed
- Each weapon keeps its own fire cooldown, so swapping off a slow gun (such as the Singularity) no longer locks
  out the next weapon.
- Music and weapon loops no longer keep playing while the tab is hidden; audio pauses with the game and resumes
  when you come back.
- Mines, sentry, style rank and rampage HUD elements no longer show through the results screen.

## Initial import - 2026-11-08

The game as first committed (`d5ee58a`). It was built in update rounds before it went into git; the file as it
stood before each round is kept in `versions/` (`slaghouse.before-<round>.html`).

### Added
- **Base game** (`versions/slaghouse.before-ragdoll.html`): single-file Phaser 4 arena shooter with procedural
  pixel art and Web Audio sound. Nine weapons (nailgun, shotgun, grenade launcher, rocket launcher, arc caster,
  railgun, saw launcher, slag hose, Singularity) plus a boot kick. Grunts, heavies, drones, enforcers, stalkers,
  bulwarks, menders, snipers and ticks; explosive barrels, headshots, gibs. Three waves ending in THE SMELTER
  boss, with a title, win/lose and restart loop.
- **Ragdoll round:** some kills leave ragdolls cut from the enemy's own sprite. They tumble, take hits, kicks,
  fire and blasts, and burst into gibs when shot enough. Headshot kills leave a headless body. THE SMELTER's art
  and animation reworked.
- **Chaos round:** destructible terrain (crates fall when nothing is under them; girders and gratings drop when
  cut from their anchors; falling blocks crush). Rivet minigun (**0**), cluster mortar (**-**). Rocketeers
  (rockets can be shot down or kicked back), bomber wasps, charging rammers. Four waves.
- **Mayhem round:** stake driver (**=**) that pins bodies to walls, prox mines (**G** / middle click), gas
  canisters that rocket around when shot, hanging lamps that drop and crush, kill-cam slow-mo and CHAOS callouts.
  Jet troopers, sappers with satchel charges, brood mothers that birth ticks. Five waves.
- **Frenzy round:** cryo cannon (**Backspace**) that freezes enemies into shatterable statues, auto-sentry
  (**T**), rampage mode at S style rank. Screamer kamikaze skulls, shield-tethering wardens, and the juggernaut
  mini-boss. Wave modifiers: SLAG RAIN on wave 3, LOW GRAVITY on wave 4.
- **Havoc round:** prism laser (**[**) that ricochets off walls, grapple hook (**C**) that reels enemies in or
  you to walls. Phase-cloaked cloakers, fireproof pyros with firebombs, and the gunship mini-boss that crashes
  when killed. BLACKOUT modifier on wave 2.
