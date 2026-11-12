# Changelog

All notable changes to SLAGHOUSE are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and releases are tagged `vX.Y.Z` on GitHub.

## [Unreleased]

### Added
- **Twenty kinds of breakable scenery**, restocked every wave: neon signs, strip lights, floodlights, fuse boxes,
  capacitor banks, propane tanks, toxic and oil drums, cryo and water tanks, a steam boiler, wall fans, slag ladles,
  vending machines, terminals, ammo crates, flare cases, extinguishers, control-room windows and PA horns. Each goes
  off its own way (a ladle pours slag, a fan's blades fly off as saw blades, a capacitor chains lightning, a vending
  machine sprays fizzing cans and health orbs) and they set each other off: fire cooks off what burns, a PA horn
  shatters glass, spilt water conducts when anything electrical goes off near it. Every arena has a set; ARENA 01
  has one of each. Shots, blasts, kicks, saw blades, the hose and the wrecking ball all hit them.
- `dev/playtest/props.js`, run by `run.mjs` and CI: every prop in every arena is broken, run through its effect,
  restocked and broken again without an error.
- **Five-act campaign.** Ten operations descend from the Melt Floor through the Wrecking Yard and Powerhouse.
  Enemy squads introduce blackout, slag showers, presses, the wrecking ball and live rails in stages. Fight
  the Foreman in the Yard before facing the Smelter in the Powerhouse.
- **Campaign arsenal.** Start with the Nailgun, earn the Shotgun after the first patrol, and unlock 27 weapons
  through the campaign. All other modes start with the full arsenal.
- **Campaign checkpoints.** Lifts save health, weapon, perks, stats, difficulty and mutator at the start of
  Acts 2–5. Continue from the title or retry the act after death. Saves from the three-act campaign keep
  their equipped weapon.
- The pause menu has a CONTROLS page with every keyboard and gamepad binding. It is built from the same strings as
  the HUD's control hints, plus the weapon keys and the toggles they leave out. (#26)
- `dev/playtest/`: the in-page harness from the red-team pass (`T` for stepping and the bot, `CH` for arena storms,
  `VB.campaign()` for a timed full campaign run that reports kills, errors and step cost), with a README. (#4)
- `dev/check.mjs` lists any sampled sound name the game asks for that `sfx_bank.js` doesn't have. (#4)
- A `Release` workflow: pushing a `vX.Y.Z` tag runs the checks, builds the playable zip and publishes the release
  with that version's changelog notes. CONTRIBUTING.md's release steps shrink to match. (#20)
- `dev/synthwave/build.py` checks the bank after writing it (`--check` checks the current one): every track the game
  asks for is there, each level is within 0.5 dB of `TARGET`, and each loop's seam lines up with its `ls` / `len`.
  It exits non-zero and names the track. (#23)
- `dev/sfxgen/calibcheck.mjs`: `calib.json` entries carry a fingerprint of the synth code they measured, and
  `build.py` lists any whose procedural sound has changed since. Existing entries got the fingerprint of the
  version they were measured against, taken from git history. (#9)
- `dev/playtest/run.mjs` runs the play-test harness in headless Chrome, and CI runs it as a second job: the two-tab
  and DAILY checks, campaign checkpoint checks (reload and Continue, die and retry the act, five damaged saves) and a
  full `VB.campaign(1500)` run across all five acts. Any page or console error fails it. `dev/playtest/checkpoint.js` holds the checkpoint
  steps. (#45, #39)
- `dev/synthwave/render.py` checks every loop for a baked-in seam: each stem has died away before the render ends,
  and the reverb and delay don't drop across the wrap. A loop that fails isn't written to `out/`, and it exits 1
  naming the track. Skipping the tail fold for one track now fails it. (#41)
- The `Release` workflow has a dry run: run it by hand and it builds the zip and notes from the chosen branch and
  uploads them as an artifact instead of publishing. Tag pushes work as before. (#43)
- `dev/playtest/kinds.js`, run by `run.mjs` and CI: every enemy kind is warped in on its own and must have a codex
  row and its start frame, then run, take a hit and die without an error. A broken kind fails by name. (#52)

### Changed
- **Campaign pacing.** The first five operations build from two to six foes per squad while shortening
  reinforcement breaks and raising incoming damage in steps. The first heavy enters alone, slag rain gives
  more time to reach cover and clears before the Gunship, and Gravity Loss brings in the Hounds in separate squads.
  Lockdown and Slag Rain restore a minimum amount of health after a clear.
- Later campaign squads wait for the current fight to end. Meltdown separates presses, rising slag and the
  Wyrm. Demolition and Live Circuit give players time to reach safe ground before the wrecking ball or rails
  activate. The Foreman and Smelter start their arena machinery in phase two.
- Campaign countdowns show what arrives next and where to prepare. New weapon cards show each weapon's use and
  equip control. Meltdown, Demolition and Live Circuit issue their weapons across successive squads.
- Each enemy record in `ENEMY` now holds its start frame and whether it flies or is humanoid. `FLIERS` and
  `isHumanoid` are built from the records, and the start-frame map in `spawnEnemy` is gone, so a new kind no longer
  needs entries in three side tables. No foe behaves differently. (#52)
- Each enemy record also names the scene method that runs it each frame (`update`). `updateEnemies` calls it
  directly instead of testing the kind against an 81-line `else if` chain, and `kinds.js` fails a record whose
  method doesn't exist. Every kind runs the same method as before. (#52)
- Every continuous weapon sound stops through one `Sfx.stopLoops()`. The run reset, **N**, death, restart, quit,
  pause and lift ride all call it, so the **N** list can no longer fall behind (it was missing the minigun). (#53)
- Opening the pause menu starts decoding the track RESTART will play and the title theme, so neither starts late.
  The next wave's look-ahead drops them again. (#40)
- Lockdown starts with a grunt patrol and offers a choice of damage, sustain or mobility in the first perk draft.
- Speedrunner requires a campaign clear under 10 minutes without using Continue or retrying from a checkpoint.
- `dev/synthwave` has its own `requirements.txt` (numpy, scipy, numba, soundfile; no torch or GPU), and `loud.py`
  moved to `dev/audiolib/`, shared by both audio pipelines. Soundtrack encodes are bit-exact, so rebuilding from
  unchanged WAVs no longer rewrites `music_bank.js`. (#24)
- Best records (campaign, BOSS RUSH, OVERTIME) store the mutator that was on, and the title screen shows it next to
  the best. A mutator run is marked, not kept apart. Old records without the field still load. (#21)
- CONTRIBUTING.md has a release runbook (changelog, tag, playable zip, GitHub release) and points to GitHub issues
  for open work.
- The README and the in-game header notes describe the red-team behaviour: R and Esc wait for the results screen,
  the pause menu holds every timer, hazards are named as your killer, and the last few foes come looking for you.
- The README no longer shows a release badge; shields.io can't read the private repository.
- The README and CONTRIBUTING.md list `dev/audiolib/`, the release workflow and `dev/check.mjs`'s missing-sound note.
- Soundtrack tracks decode when they're about to be needed (the title set at boot, then this wave's track, the
  next one and the jingles), and tracks a run no longer needs are let go. Decoded music drops from about 85 MB to
  under 50 MB. (#22)

### Fixed
- Ground fires go out when a campaign round clears. Late explosions and fire patches can no longer damage the
  player while choosing a perk or waiting for the next round.
- A Gunship wreck that lands after the campaign round clears can no longer start new fires, including after
  the next operation starts.
- **Slag Rain** comes in 7 to 9 s showers with 5 to 7 s clear spells instead of without a break, and **SLAG
  INCOMING** warns 1.2 s before each shower. Rain drops still burn and knock you about, but they no longer break
  platforms or set off drums, so a shower can't dig you into a pit you can't climb out of. The Smelter's slag
  still breaks terrain. (`TUNE.RAIN`)
- `T.setup()` can stage all five campaign arenas with the arsenal earned before the selected act, including
  the Wrecking Yard and Powerhouse. (#47)
- The play-test bot's teleport picks a tile that can see the foe, skips the spot that just failed, and falls back to
  the foe's own row, so `VB.campaign` no longer loops forever under a foe it can't see in ARENA 02. As a backstop,
  `VB.campaign` removes a foe hidden for 30 s with five or fewer left and lists it in `removed`. (#46)
- `dev/sfxgen/calib.js` renders through the game's own noise buffer and crunch curve (`Sfx.buildShared`, which
  `Sfx.init` calls) instead of a copy, and sounds that use them carry `buildShared` in their fingerprint. A change to
  the curve or noise now marks those entries stale. The 170 affected fingerprints were moved without re-measuring.
  (#48)
- `slagCalib()` seeds its random noise and jitter from each sound's name, so measuring the same code twice gives
  the same numbers. (#37)
- A DAILY run reads its day once, when you pick DAILY, and keeps it. A run that crosses 00:00 UTC no longer
  switches to the next day's waves and modifiers, R stays in the same arena, and the record is filed under the
  day the run started. A newer day's record is never replaced. `dev/playtest/daily.js` checks it. (#49)
- Lifetime kills, runs, deaths, play time, weapon mastery and codex sightings read the stored value again before
  saving and add this tab's progress to it, so a second tab no longer erases the first one's. (#51)
- **New Campaign** makes its run the owner of the campaign save. A run left open in another tab keeps playing, but
  its lift rides and its win no longer replace the newer run's checkpoint. `dev/playtest/twotab.js` checks both
  fixes. (#38)
- Phaser loads with a Subresource Integrity hash, so a changed or tampered `phaser.min.js` doesn't run and the
  page shows its "could not be loaded" message. `dev/check.mjs` fails if a CDN script loses its hash. (#55)
- `dev/build/recv.py` only writes plain `.png` / `.jpg` names, only for pages served from this machine, and only up
  to 16 MB, and it no longer sends `Access-Control-Allow-Origin: *`. Before, any open web page could overwrite the
  scripts beside it. It now listens on 8767 by default, the port `T.snap` posts to. (#54)
- Dead foes leave the enemy group 3 s after they die, so the per-frame loops stop walking every corpse sprite until
  the arena changes. In a 10-minute OVERTIME run under SWARM the group peaked at 28 sprites, down from 104. (#14)
- `dev/sfxgen/build.py` stops with a clear message, before writing anything, when processed takes are missing (as
  on a fresh clone) instead of crashing in soundfile, and ends with a note listing the sounds it skipped. (part of
  #8 and #15)
- `.claude/launch.json` keeps only the preview config that works (`static-test` on 8781); the two that came up dead
  or served a stale copy are gone. (#3)
- OVERTIME and DAILY play the stage loops again after wave 6; the boss theme now comes back only on boss waves
  (6, 12, 18 ...). A BOSS RUSH lift ride keeps the boss theme instead of a stage loop. (#25)
- **N** now swaps the ambient hum along with the other sounds, with a crossfade, instead of leaving the old drone
  running. (#10)
- Sample bank decode failures are no longer silent: the console gets one warning with the count, **N** says
  `SFX BANK UNAVAILABLE` when nothing decoded, and a music track that fails to decode hands over to the procedural
  loop (and **B** says so) instead of playing nothing. (#11)
- When five or fewer foes are left, a walker stuck against a wall it can't climb (ARENA 02's side pockets) warps
  out to the ground spawn point nearest you after a few seconds, so the wave finishes without hooking in. (#16)
- The ranged keepers (discus, chiller, bastion, howitzer) hop high enough to climb back up the 3-tile steps they
  are allowed to step down, so they hold high ground over a long wave. The howitzer only leaves its perch to hunt
  you once you're out of its lob range. (#19)
- The pause menu now stops the game's clock itself, so every timer holds while paused, including the ones the old
  timestamp shifting missed (per-target cooldowns, kill-time lists, local timers). (#18)
- The Game scene no longer adds another `resume` listener on every restart. (#17)

## [0.1.0] - 2026-11-11

### Added
- **Repository and release setup.** A proprietary LICENSE; CI that runs `dev/check.mjs` (compiles the game script
  and audio banks, checks the script tags) on every push and pull request; Dependabot for GitHub Actions; issue
  forms, a pull request template and CODEOWNERS; CONTRIBUTING.md and SECURITY.md; and a playable zip on the GitHub
  release. The open drafts in `dev/ISSUES.md` are filed as GitHub issues.
- **Gold round: gold guns and lifetime stats.** A gun with all three mastery stars is gold-plated: it glints gold in
  your hand, on the HUD ribbon and in the ARMORY, and the first one earns the GOLDSMITH medal. Lifetime kills, runs,
  deaths and time played are kept and shown on the ARMORY page.
- **Two more weapons** (wheel / Q/E). Seed launcher: plants a fungus turret that puffs homing spores at foes. Tether
  gun: links up to three foes so damage to one is shared with the others.
- **Three more enemies.** Cinder wheel: a burning wheel that rolls and hops at you (kick it back at them). Gatling:
  spins up and hoses a slow-tracking stream, then overheats. Banner: plants a banner that heals every foe near it.
- AudioGen takes for the tether dart, the fungus sprouting, the gatling's fire and the banner thud. The bank grows
  to 195 sounds.
- **Powerhouse round: ARENA 05.** OVERTIME and DAILY now also visit THE POWERHOUSE: a generator block, walkways and
  decks over a floor of live rails that power up in two banks, turn and turn about, zapping whoever's standing on
  them. A new NUKE IT medal is for 5 kills with one mini-nuke.
- **Two more weapons** (wheel / Q/E). Mini-nuke: one slow shell, one very big bang. Dragon's breath: burning
  buckshot that sets foes and floors alight.
- **Three more enemies.** Bulldozer: plows drums, corpses, crates and you ahead of it; flank it. Copycat: copies the
  gun in your hand. Jellyfish: trails shock tendrils and pops in a shock nova.
- AudioGen takes for the nuke, the dragon's breath, the rails' hum, the bulldozer's engine and the jellyfish zap.
  The bank grows to 191 sounds.
- **Rush round: BOSS RUSH.** A new title mode: the Juggernaut, the Gunship, the Slag Wyrm, the Foreman and the Smelter
  back to back across the three arenas, with a perk between each and its own best record. A new RUSHER medal is for
  beating it.
- **Two more weapons** (wheel / Q/E). Riot shield: hold to block and reflect enemy shots, let go to bash. Glue gun:
  gums foes up so they crawl, and leaves sticky puddles.
- **Three more enemies.** Porcupine: answers every 40 damage with a burst of quills. Sponge: soaks up bullets and
  spits them back (blast, burn or beam it instead). Leaper: marks where you stand and leaps onto it with a shockwave.
- AudioGen takes for the shield deflection, the glue, the quill burst, the sponge's spit and the leaper's jump. The
  bank grows to 186 sounds.
- **Debrief round: a fuller results screen.** The results now show your top three guns by kills, the biggest single
  hit of the run and, if you died, what killed you. A new PEST CONTROL medal is for 15 ratbots in a run.
- **Two more weapons** (wheel / Q/E). Gas launcher: a cloud of your own gas that spares you, eats metal and meat
  alike, and goes up in a fireball if you light it. Bubble gun: floats foes up in soap bubbles; pop one to drop its
  foe.
- **Three more enemies** (and a fourth that comes with one). Zealot: drinks the souls of foes dying near it and grows
  stronger. Mine layer: a drone that seeds the floor with proximity mines. Rat king: a knot of ratbots that sheds them
  as it goes and bursts into more when it dies.
- AudioGen takes for the bubbles, the zealot's chant and the souls, and the ratbots' squeak. The bank grows to 181
  sounds.
- **Mutator round: run mutators.** OPTIONS has a MUTATOR row (one at a time, remembered, shown on the title):
  GLASS CANNON, SWARM, MOON BOOTS, LIGHTS OUT and VAMPIRE. A new MUTANT medal is for winning the campaign with one on.
- **Two more weapons** (wheel / Q/E). Tripwire: a sticky emitter whose laser zaps anything that crosses it. Drone
  pod: two little gun drones that orbit you and shoot for 10 s.
- **Three more enemies.** Headsman: a slow axe that splits the floor and sticks after each chop. Berserker: goes
  berserk at half health, twice as fast. Bastion: throws up hard-light walls that stop your bullets.
- AudioGen takes for the tripwire arming, the drone pod, the headsman's chop and the berserker's roar. The bank
  grows to 176 sounds.
- **Foreman round: a second boss.** OVERTIME's boss waves now alternate between the Smelter and THE FOREMAN, a
  four-legged crane walker with a letterbox intro and its own bar: it slams shockwaves along the floor, sprays
  rivets, and below 60% rips its armour off to drag you in with a magnet and call in hounds; below 25% its core is
  exposed and it rages. A new UNION BUSTER medal is for bringing it down.
- **Two more weapons** (wheel / Q/E). Rocket gauntlet: a thruster punch that carries you into a foe and launches it.
  Marksman rifle: a laser-sighted rifle whose rounds pierce and do triple damage on headshots.
- **Three more enemies.** Shellback: armoured from the front; kick or blast it onto its back. Shinobi: leaps wall to
  wall, throwing stars at the top of each jump. Thundercloud: hangs over you and drops lightning.
- AudioGen takes for the gauntlet's thruster and punch, the rifle crack, the thrown stars and the thunder. The
  bank grows to 172 sounds.
- **Armory round: an ARMORY page.** The title menu has a new ARMORY: every gun, 13 to a row with three mastery pips
  under each, and the picked one's name, line, key, kills and the kills to its next star. A new POPCORN medal is
  for 5 microwave pops in a run.
- **Two more weapons** (wheel / Q/E). Stasis grenade: a bubble of stopped time; hits on frozen foes are stored and
  land all at once (+25%) when time restarts, and enemy shots hang in the air. Microwave: a beam that cooks a foe
  until it swells and pops.
- **Three more enemies.** Vortex: a turbine drone that drags you in and shreds you up close. Arc pylon: a tesla tower
  that charges, then throws lightning at you if it can see you. Scavenger: a ghoul that eats corpses to heal and
  grow.
- AudioGen takes for the stasis field opening and closing, the microwave hum and pop, the pylon's charge and bolt,
  and the scavenger's chomp. The bank grows to 167 sounds. (The vortex's spin-up was generated but never
  calibrated, so it still plays synth: [#15](https://github.com/saworbit/slaghouse/issues/15).)
- **Wrecking-yard round: ARENA 04.** OVERTIME and DAILY now rotate through a fourth arena, THE WRECKING YARD: junk
  heaps of crates, a raised dais, and a wrecking ball swinging across the middle that flings foes, knocks you aside,
  smashes crates and lights drums. A new WRECKING CREW medal is for 3 kills with it in a run.
- **Two more weapons** (wheel / Q/E). Splitter: a bolt that splits in two every time it hits, three generations
  deep. Decoy launcher: a holo canister that projects a hologram of you; nearby foes go for it and set it off.
- **Three more enemies.** Torcher: a fireproof heavy that sweeps a flamethrower; its fuel tank blows if you shoot
  it from behind. Discus: throws a disc that comes back to its hand (kick it to send it back). Spore pod: a rooted
  fungus that puffs homing spores and bursts into a toxic cloud.
- AudioGen takes for the wrecking ball (swing, crash, chain creak), the splitter's zap and forks, the discus throw
  and the spore puff. The bank grows to 161 sounds. (The decoy was generated but never calibrated, so it still
  plays synth: [#15](https://github.com/saworbit/slaghouse/issues/15).)
- **Elite round: elite foes.** From wave 2 a few foes in each wave (more as OVERTIME climbs) warp in as elites with
  extra health, a coloured aura, a diamond over the head and one trait: ARMORED (double health), SHIELDED (a
  recharging bubble), VOLATILE (blows up when it dies) or REGEN (heals when left alone). Each drops two health
  orbs; a new ELITE HUNTER medal is for 6 in a run. The medals page now lays out in three columns.
- **Two more weapons** (wheel / Q/E). Scrap vacuum: hold to suck up gibs, corpses, drums and light foes, let go to
  blast the stored scrap out as shrapnel. Siphon: a drain beam that heals you a little as it hurts.
- **Three more enemies.** Grappler: a brute that grabs you and hurls you across the room (kick or dash free).
  Spotter: a floating eye that marks you, so every foe hunts you and hits land harder. Hound: robot dogs that hunt
  in pairs, flank and pounce.
- AudioGen takes for the vacuum, the scrap blast, the siphon, the grappler's grab, the spotter's alarm, the hound's
  bark and an elite shield breaking. The bank grows to 155 sounds.
- **Arsenal round: a weapon ribbon and codex pages.** The HUD's strip of 41 tiny slots is now a ribbon of nine: the
  gun in hand in the middle, four either side, sliding the short way round as you swap, with a pop on the new pick.
  The codex holds 66 foes a page and Q/E turns the pages. A new BLADEMASTER medal is for 8 katana deflects in a run.
- **Two more weapons** (wheel / Q/E). Firework launcher: a wandering rocket that bursts into coloured stars that
  fall and burn. Plasma katana: a fast slash that bats enemy shots back at the nearest foe and cuts rockets in two;
  slash out of a dash for a DASH CUT.
- **Three more enemies.** Orbiter: a flying core whose three spinning plates eat your shots; fire through the gaps.
  Swapper: a phase bot that trades places with you after a violet tether (hit it to break the tell). Scorcher: a
  fireproof sprinter that leaves a trail of fire and stands winded afterwards.
- AudioGen takes for the firework launch, burst and crackle, the katana swing and hit, the swapper's zap, the
  scorcher's roar and a plate breaking off. The bank grows to 148 sounds.
- **Finale round: multikills and a clearer arsenal.** Kills in quick succession chain into DOUBLE KILL, TRIPLE, QUAD,
  PENTA and MASSACRE, punched in under the callouts with a rising sting and a beat of hit-stop. A new MASSACRE medal
  is for a 6-kill chain. The weapon wheel shows a one-line description of the selected gun. OVERTIME now draws on
  every enemy type, the newer ones included. The codex fits 11 to a row.
- **Two more weapons** (wheel / Q/E). Grav bomb: a lobbed charge that floats every grounded foe nearby up into the
  air, then slams them down. Pinball cannon: a heavy steel ball that bounces around the arena, hitting harder with
  every bounce.
- **Three more enemies.** Wraith: drifts through walls and floors, then shrieks and lunges. Chiller: lobs frost
  that ices the floor, where you slide (fire melts it). Warhorn: blasts a horn that makes nearby enemies take half
  damage for 6 s.
- AudioGen takes for the grav pulse, pinball bounce, wraith wail, ice crackle and war horn. The bank grows to 140
  sounds.
- **Mastery round: weapon mastery and a daily run.** Kills with each gun count toward its mastery for good: 25, 100
  and 250 kills earn three stars, each +5% damage with that gun, shown as gold pips on the weapon wheel. **DAILY** on
  the title menu is an OVERTIME run seeded by the date (arena, two starting perks, waves and modifiers), with its own
  best wave for the day.
- **Two more weapons** (wheel / Q/E). Shrink ray: shrinks a foe to half size for 8 s; it takes x1.5 damage, bites
  for half, and you can squish it by landing on it. Sonic blaster: a cone of sound that shoves and stuns everything
  in front of you and blows enemy shots away.
- **Three more enemies.** Lugger: picks up the arena's drums and hurls them (shoot the one it's carrying). Blimp: a
  bomber airship that drops bombs when you're below it and crashes in flames. Strider: a stilt walker that sweeps a
  laser across the room after a red-sight tell.
- AudioGen takes for the shrink ray, sonic blast and strider laser. The bank grows to 135 sounds.
- **Supply round: supply drops and power-ups.** A crate floats down on a chute near you about 22 s into each wave
  and every 40 s after, and elite enemies sometimes drop a capsule: OVERDRIVE (double damage), HASTE (faster fire
  and movement), AEGIS (a shield that soaks 60 damage) or MEDPACK (+40 HP). An aura and a HUD timer show what's
  running.
- **Reduced flashes** option (title screen OPTIONS): drops the impact frames and dims screen flashes.
- **Two more weapons** (wheel / Q/E). Bee swarm: a pod that bursts into six homing bees that sting whatever they
  find. Laser whip: a long crack of plasma that hits everything along it and drags them toward you.
- **Three more enemies.** Grenadier: lobs bouncing grenades on a fuse (kick them back). Spikeball: a spiked ball
  that rolls its platform and rages when hurt. Paratrooper: floats down under a chute shooting; shoot the canopy
  and it falls to its death.
- AudioGen takes for the power-up pickup, whip crack and bee buzz. The bank grows to 132 sounds.
- **Codex round: a title menu.** CAMPAIGN, OVERTIME, CODEX, MEDALS and OPTIONS, driven by keyboard, mouse or pad.
  The **codex** lists all 53 enemies, each a grey silhouette until you've met it, then its sprite, name and a line
  on how it fights (met foes are remembered). **Medals** is the gallery, earned ones in gold. **Options** sets
  difficulty, music, SFX, screen shake and post FX.
- **Two more weapons** (wheel / Q/E). Spider mines: little bots that land and scuttle along the floor to the nearest
  foe before blowing. Napalm launcher: fuel cans that splash fire patches across the floor and light everything
  near the impact.
- **Three more enemies.** Beacon: a pylon that calls in two reinforcements unless you kill it within 3 s. Slug: an
  acid grub whose trail and spit corrode you (you take +25% damage and glow green). Leech: latches on, drains you
  and slows you until a dash or kick shakes it off.
- AudioGen takes for the beacon's alarm, the slug's squelch and the leech's slurp. The bank grows to 129 sounds.
- **Overtime round: OVERTIME, an endless mode** (E on the title screen, Y on a pad). Random waves that grow by
  two each time and get tougher (enemy HP +7% a wave), harder enemy types mixing in, a mini-boss every few waves,
  the Smelter every sixth, a random modifier now and then, a perk after every wave and a new arena every three.
  The best wave reached is saved and shown on the title screen.
- **The Smelter's OVERHEAT phase:** below 15% health its armour blows off, it speeds up and fans slag shells
  everywhere. Its death now holds the camera on it through a longer chain of blasts and debris, with a VICTORY card.
- **Two more weapons** (on the wheel / Q/E; the keyboard is out of letters). Orbital designator: hold to paint a
  spot, then a sky laser comes down on it. Plasma cutter: flat plasma blades that slice through every body and
  crate in their path.
- **Three more enemies.** Echo: a hologram that walks your path 1.5 s behind you and shoots at you whenever you
  were shooting. Pilferer: a thief drone that steals the gun in your hands (the slot greys out) until you kill it.
  Pogo: a spring bot that bounces in big arcs and slams down on your head.
- AudioGen takes for the orbital strike, cutter blade, pogo spring and pilferer snatch. The bank grows to 126 sounds.
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
- When five or fewer enemies are left (when the off-screen arrows appear), the ones lurking out of sight come
  looking for you, so the last few don't stall a wave.
- Ranged enemies that hold a ledge (discus, chiller, bastion, howitzer) and broods now step down short drops, and
  drop off bigger ones to find you if they've lost sight of you below for a few seconds. A creeper stuck at the end
  of a ceiling with you out of reach drops down and gives chase.
- Enemies too far away to plan a full route to you head for the nearest point they can reach instead of standing
  still.
- OVERTIME never rolls the same wave twist (blackout, slag rain, low gravity, meltdown) twice in a row, even across
  a lift.
- The painted level (blood, scorch marks, bullet holes) is now shown as 16 tiles, and only the tiles that were painted
  are re-uploaded to the GPU, instead of the whole 1600 x 432 texture several times a second during heavy gore.
- **Esc** mid-run opens the pause menu. It replaces the earlier double-press confirm (`ESC AGAIN: QUIT`).
- The weapon bar holds 21 compact slots, and the control hints list the new keys.
- Wave 2 swaps a bulwark for a mirror knight, wave 3 a grunt for a stitcher, wave 4 a sapper for a hive, and
  wave 5 a burrower for the Slag Wyrm.
- Damage numbers step aside from numbers still rising nearby, so rapid hits stay readable.
- The control hints fade out completely after about 13 s instead of staying on screen at 30%.

### Fixed
- **Restarting reused the last run's arena and carry.** Phaser keeps a scene's last start data when it restarts
  without new data, so pressing R after the lift, or starting a new run from the title, could drop you into a later
  arena with the old HP, perks, stats and wave count (and BOSS RUSH could start at the wrong boss, or crash). Every
  run and restart now starts from explicit data.
- The pause menu now stops the clock: RAMPAGE, OVERDRIVE, HASTE, i-frames, enemy tells and every other timer used to
  keep running (and run out) while paused, and paused time counted toward the results TIME.
- Pressing R or Esc in the second after dying or winning skipped the results and lost the run's records; both now
  wait for the results screen.
- Dying or winning with the weapon wheel open left the wheel on screen and the world in slow motion.
- Hazards (live rails, presses, fire) could still hurt and "kill" you after a win.
- The results screen named a random enemy as your killer for hazard deaths; it now says A LIVE RAIL, THE WRECKING
  BALL, A CRUSHER or STEAM.
- BIGGEST HIT counted scripted kills (a paratrooper splat, the Foreman's hounds dying with it) as hits of 999+.
- The campaign medals (SPEEDRUNNER, IRONCLAD, MUTANT) could be earned by winning BOSS RUSH.
- A mangled saved record showed "undefined" on the title screen and could stop new OVERTIME bests from saving.
- A stolen gun stayed greyed out on the HUD ribbon after a restart.
- A tethered jellyfish that died from a shared hit could kill its partner twice, counting two kills and ending a wave
  early; shared tether damage also had every damage bonus (difficulty, GLASS, OVERDRIVE, perks) applied twice.
- A grappler that was frozen, netted, floated or time-stopped while holding you let go, then yanked you back from
  across the map when the effect wore off.
- An enemy carried by the tractor beam into a stasis field (or grabbed out of one, or out of a grav bomb's slam) could
  lose its gravity for good.
- Burning enemies no longer panic-run when they're bosses, fliers or rooted (the Foreman, pylons, spore pods,
  turrets), and stand still while frozen or time-stopped.
- SWARM cut the HP of the Juggernaut, Gunship and Slag Wyrm without adding any extra enemies; DAILY now ignores
  mutators, so it really is the same run for everyone.
- A zealot could take more than three souls' worth of HP when several foes died next to it at once.
- Overlapping stasis fields could leave enemy shots hanging in the air after both fields ended.
- The riot shield could fire a free bash the next time you picked it, if you'd swapped away (or died) holding it.
- Tripwires could have three wires out instead of two, and the Foreman could have five hounds instead of four.
- OVERTIME's Foreman waves showed THE SMELTER RETURNS; they now say THE FOREMAN CLOCKS IN.
- Microwave heat never cooled on some enemy types (grenadiers, harpooners, burrowers and others), so short bursts
  added up until they popped.
- An elite's aura and diamond gave away a cloaked cloaker or a blinked-out blinker.
- A swap with a Swapper now cuts your grapple line.
- The blimp could cruise out of reach high over a tall arena, stalling the wave; it now keeps a height over you.
- A lugger kept waiting forever under a drum it couldn't reach; it now gives up after a few seconds.
- A welder could build its turret inside a wall or off the edge of a ledge.
- The cinder wheel jammed against any step or wall between it and you; it now hops steps and bounces off walls.
- Slugs got stuck against one-tile steps; they now hump over them.
- The blimp could jam against the pillars that hold up the furnace arena's catwalk and hang there out of reach,
  stalling wave 4; it now sails through scenery.
- Several per-run values (leech count, a claw's grip, the corrosion tint) could survive a restart, because Phaser
  keeps a scene's properties when it restarts; they're now reset at the start of every run.
- The results screen no longer shows the perk list or a medal toast through its panel.
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

[Unreleased]: https://github.com/saworbit/slaghouse/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/saworbit/slaghouse/releases/tag/v0.1.0
