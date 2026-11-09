# Changelog

All notable changes to SLAGHOUSE are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the game has no numbered releases yet.

## [Unreleased]

### Added
- **Sorting Line round: a third arena.** ARENA 03 :: THE SORTING LINE, with conveyor belts on the floor and upper
  decks that carry you, enemies, drums, gibs and corpses, and three crusher presses that slam down on a tell
  (40 to you, 200 to enemies, so luring them under one pays). The run now spends two waves in each arena, and the
  lift drops you into whichever comes next.
- **Two more weapons.** Net gun (**H**): a net shell that tangles everything it catches for 3 s (fliers drop,
  tangled enemies take extra damage). Chain flail (wheel / Q/E): hold to whirl a spiked ball round you that swats
  enemy shots, release to hurl it through a crowd and yank it back.
- **Three more enemies.** Claw: a crane claw on a roof trolley that grabs you, hauls you up and flings you (kick,
  dash or hurt it to break free). Sparker: little hoppers that link up with live arcs. Scrap golem: a junk brute
  that lobs scrap over cover, slams the floor and dies in a shrapnel blast.
- AudioGen takes for the net shot, press slam, claw clank and golem groan. The bank grows to 122 sounds.
- **Ironclad round: medals.** Sixteen run achievements (an untouched wave, trick shots, a x20 combo, executions,
  burning kills, crush kills, shock combos, supercombines, wall splats, kills with 15 guns, rampages, dodges, a
  four-limpet detonation, beating the Smelter, a sub-10-minute win, a Brutal win). A gold toast pops as each one
  lands, the results screen lists the run's medals, and the title screen counts the collection.
- **Gamepad aim assist** (the aim leans onto a foe close to the stick's line) and a radial stick dead zone, so
  shallow angles no longer snap flat.
- **Steam pipes** on the walls of both arenas: shoot or blast a valve and it bursts into a scalding steam jet that
  hurts and shoves anything in it. New pipes every wave.
- **Two more weapons.** Flare gun (**O**): sticky flares that burn whatever they hit, light nearby foes, tar and
  gas, and reveal enemies through the BLACKOUT. Limpet launcher (**Y**): sticky bombs; hold the trigger to set them
  all off in a ripple.
- **Three more enemies.** Creeper: a spider that crawls along ceilings and drops on you. Roller: an armoured grub
  that curls up and bowls at you, bouncing off walls until it knocks itself dizzy. Jammer: an EMP drone whose ring
  jams your gun (with a glitching HUD) and shorts out your sentry unless you dash through it.
- AudioGen takes for the flare shot, limpet launch, steam burst, EMP pulse, jam static and roller rumble (the
  creeper's skitter stays synth: no take sounded right). The bank grows to 118 sounds.

### Fixed
- The results screen no longer shows the perk list or a medal toast through its panel.
- **Slagforge round: perk draft.** After every wave but the last you pick one of three perks (keys 1-3, click or the
  pad) from twelve: hollow points, hair trigger, vampire, iron boots, double jump, blast shield, afterburner,
  scavenger, showboat, volatile, adrenaline and barbed plate. They last the run, ride the lift into ARENA 02 and
  show on the HUD.
- **Wall slide and wall jump:** push into a wall while falling to slide down it slowly, and jump to kick off it.
- **Last-kill cam:** the final kill of each wave gets slow-mo, a zoom punch, an impact frame and the camera on the
  body.
- **Two more weapons.** Drill launcher (**U**): a drill bolt that bores through crates and girders, grinds into
  the first body it meets and then blows. Trick revolver (**I**): six hitscan rounds, fan the hammer by holding the
  trigger, and wall shots ricochet into the nearest foe for a TRICK SHOT.
- **Four more enemies.** Gasbag: a drifting sac that bursts into a toxic cloud, which goes up in a fireball if any
  fire or blast reaches it. Welder: a support bot that repairs damaged machines and builds mini turrets (the
  fourth new type). Duelist: a fencer that reads your aim, sidesteps your shots and chains up to three cuts.
- AudioGen takes for the drill (shot and grind), revolver (shot and reload), gas pop and gas fireball, welding
  crackle and sword slash. The bank grows to 112 sounds.
- **Shockworks round: gamepad support.** Twin-stick play on any standard-mapping pad (left stick moves, right stick
  aims with its own crosshair, triggers fire and mine, face buttons jump / dash / kick / hook, hold LB for the
  weapon wheel), with rumble that follows the screen-shake setting. The title screen, pause menu and results screen
  all work from the pad, and the HUD hints switch to pad buttons.
- **Fire jets** in ARENA 02: the furnace's grate flares, then three vents on its top fire in sequence, burning and
  flinging you and lighting any enemy, corpse, drum or tar standing up there.
- **Impact frames:** two or three stark black-and-white frames on executions, kill-cams, shock combos,
  supercombines and mini-boss deaths.
- **Two more weapons.** Shock rifle (**K**): tap for a slow plasma orb, hold and release for a hitscan beam, and
  beam one of your own orbs for a SHOCK COMBO. Needler (**L**): homing crystal needles that stick; the seventh in
  one target sets off a SUPERCOMBINE.
- **Three more enemies.** Mimic: an explosive drum that bares its teeth when you get close, chases you down and
  still blows like a drum when it dies. Howitzer: an artillery tripod that keeps its distance and lobs three-shell
  barrages with red landing rings. Blinker: teleports in behind you after a violet shimmer, dashes through you,
  then hangs exposed before blinking away.
- AudioGen takes for the shock orb, beam and combo, the needle shot and supercombine, the blink and the mimic's
  chomp. The bank grows to 104 sounds.
- **Furnace round: a second arena.** Clearing wave 3 drops you down the lift (rumble, i-frames, fade) into
  **ARENA 02 :: THE FURNACE** for waves 4-6: a furnace block with a glowing grate in the middle, a tall pillar,
  girder decks, warmer light and embers everywhere. Health, gun, stats, style and kills carry over, and the new
  arena opens with its own title card.
- **Difficulty select** on the title screen (**A / D**, remembered): Easy (x0.6 damage taken, x0.8 enemy HP, x0.7
  score), Normal, Brutal (x1.4 damage taken, x1.25 enemy HP, x1.5 score). The results screen and the best-run
  record show the difficulty.
- **Music and SFX volume** in the pause menu (0-100% in quarter steps, **A / D** or **Enter**, remembered), on
  separate buses under the master mute.
- **Two more weapons.** Tractor (**Z**): a gravity gun. Hold to catch the nearest drum, satchel, gas can, gib, corpse
  or light enemy and carry it at the muzzle (held enemies get crushed), then release to hurl it: drums and satchels
  explode on impact, gas cans become rockets, bodies bowl through a crowd. Corroder (**X**): an acid cone whose
  corrosion makes enemies take +40% from everything else for 5 s; it melts riot and mirror shields for good (new
  slagged-shield bulwark sprite) and eats crates.
- **Three more enemies.** Buzzsaw: a saw-blade drone that ricochets round the room curving toward you and carves
  anything it crosses, its own side included; kick it and it's yours for 2 s, seeking the nearest foe, and when it
  dies its blade spins free as one of your saws. Magnetron: a hovering drone whose field turns your bullets,
  rockets and saws away, with a pulse that yanks you in and zaps you up close. Tar spitter: lobs tar that halves
  your run speed and saps your jump; any fire lights the tar into a long burn that runs along touching puddles.
- Sounds for all of the above. `sfx_bank.js` gains AudioGen takes for the tractor grab, throw and hum, the
  corroder spray loop, saw ricochets, the magnetron tell and pulse, the tar spitter's gurgle and tar ignition. The
  bank grows to 97 sounds.
- **Crucible round: three more weapons.** Forge hammer (**,**): tap to swing; hold and release on the ground to
  slam, sending shockwaves along the floor that launch everything on it; release in the air to dive and
  ground-pound. Storm coil (**.**): sticky tesla coils (up to 3) that zap nearby enemies and link into lightning
  fences; hold fire to overload them all. Flak cannon (**/**): a slag shell that bursts into nine shards that
  ricochet twice.
- **Four more enemies.** Mirror knight: a bulwark whose prism shield reflects your shots back until it breaks.
  Hive: a floating sac that keeps a flocking gnat swarm going (gnats sting and die). Stitcher: a drone that raises
  corpses as revenants, so gibbing bodies now matters. **Slag Wyrm**: a 9-segment worm mini-boss in wave 5 that
  bursts out of the floor in breaches and low skims, takes 60% damage through its body, spits slag below half
  health and blows apart segment by segment.
- **Executions:** enemies under 20% health pulse orange; kick them to burst them with slow-mo for 2-3 homing health
  orbs. Kick kills sometimes drop an orb.
- **Weapon wheel** (hold **Tab**): all 21 guns in a ring, at 1/6 speed while it's open.
- **Results screen:** stats count up row by row, then a grade (S-D) and a score stamp in; the best score is saved
  and shown on the title screen.
- **Screen shake setting** in the pause menu (100 / 50 / 0 %, remembered).
- AudioGen takes for the new sounds (execute, hammer slam, flak shot and burst, coil overload, gnat pop, stitch,
  revive, swarm drone loop); the orb pickup stays synth. The bank grows to 88 sounds.
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
- The weapon bar holds 21 compact slots, and the control hints list the new keys.
- Wave 2 swaps a bulwark for a mirror knight, wave 3 a grunt for a stitcher, wave 4 a sapper for a hive, and
  wave 5 a burrower for the Slag Wyrm.
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
