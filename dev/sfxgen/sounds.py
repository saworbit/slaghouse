"""SLAGHOUSE sample manifest: one entry per Sfx sound that gets an AudioGen replacement.

Keys match the names the game's Sfx object plays through Sfx.smp(name).
Fields:
  p     prompt (str) or list of prompts rotated across candidates
  d     seconds of audio AudioGen generates per candidate
  max   longest clip kept after trimming (seconds)
  n     candidates generated (default 6)
  keep  variants shipped in the game; picked at random per play (default 1)
  mode  'first' = keep the first event after the onset (default)
        'slice' = cut every distinct event out of each candidate (for rapid-fire / footsteps)
        'loop'  = cut a seamless loop `max` seconds long (continuous weapons, ambience)
  air   amount of synthetic >8 kHz content added back (AudioGen is 16 kHz, so nothing above 8k)
  hp    high-pass cutoff in Hz (default 35)
  fade  fade-out length in seconds (default: 30% of the clip, capped at 0.25)
  on    onset threshold in dB below the loudest point (default -12 = start on the main hit; swells use -24)

Sounds NOT listed here stay procedural on purpose: UI blips/jingles (beep, confirm, chirp, ding,
rankUp, pickup, ui, win, lose, plus the overdrive round's lockOn and dodge), mine arm/trigger beeps,
laser/charge tones, prismBounce, the minigun motor whine (pitch follows spin), and the music.

New entries go at the END: each sound's seed is 1000 + its position here, so inserting one in the
middle reseeds (and changes) every take listed after it.
"""

SOUNDS = {
    # ------------------------------------------------------------------ player weapons
    'nail': dict(p=['a pneumatic nail gun firing nails rapidly', 'a nail gun shooting, sharp pneumatic clacks'],
                 d=2.5, max=0.22, keep=4, mode='slice', air=0.6),
    'shotgun': dict(p='a loud pump action shotgun blast followed by the pump being racked', d=2.5, max=1.1, keep=2, air=0.6),
    'rocket': dict(p='a rocket launcher firing, loud whoosh of a rocket taking off', d=2.0, max=0.9, keep=2, air=0.5, on=-18),
    'grenade': dict(p='a grenade launcher firing, hollow metallic thump', d=1.5, max=0.5, keep=2, air=0.4),
    'stake': dict(p='a heavy pneumatic piston firing a steel spike, loud thump and hiss of air', d=1.5, max=0.55, keep=2, air=0.5),
    'rivet': dict(p=['an assault rifle firing single shots', 'a rifle firing single shots in a row'], d=2.5, max=0.12, keep=5, n=8, mode='slice', air=0.6),
    'mortar': dict(p='a mortar round fired from a metal tube, deep hollow boom', d=2.0, max=0.8, keep=2, air=0.3),
    'sawLaunch': dict(p='a circular saw blade spinning up fast, metallic whine', d=1.5, max=0.4, air=0.6, on=-20),
    'rail': dict(p='a powerful electric railgun shot, sharp electric crack and deep boom', d=2.0, max=1.0, keep=2, air=0.7),
    'clusterPop': dict(p='a firework shell bursting in the air, sharp pop', d=2.0, max=0.6, keep=2, air=0.6),
    'mineThrow': dict(p='a small metal object tossed onto a concrete floor, clank', d=1.0, max=0.3, air=0.6),
    'hookFire': dict(p='a grappling hook launched, metal chain rattling out fast', d=1.5, max=0.45, air=0.6, on=-20),
    'hookHit': dict(p='a heavy metal hook slamming into meat, wet clank', d=1.0, max=0.3, air=0.5),
    'prism': dict(p='a sci-fi laser gun shot, high pitched electric zap', d=1.0, max=0.4, air=0.7),
    'zap': dict(p='an electric spark zap, short circuit', d=1.0, max=0.35, air=0.8),

    # ------------------------------------------------------------------ enemy weapons / cues
    'eshot': dict(p=['a single pistol gunshot', 'a single gunshot from a handgun'], d=1.5, max=0.35, keep=3, air=0.6),
    'snipe': dict(p='a single loud sniper rifle shot with echo', d=2.5, max=1.1, keep=2, air=0.6),
    'whistle': dict(p=['a bomb falling with a descending whistle', 'a mortar shell whistling as it falls'], d=2.0, max=0.8, n=8, air=0.3, on=-24),
    'radio': dict(p='a walkie talkie radio squelch with static', d=1.5, max=0.4, keep=2, air=0.6, on=-20),

    # ------------------------------------------------------------------ explosions / heavy impacts
    'explosion': dict(p=['a huge explosion, loud boom with debris', 'a bomb exploding, massive blast and rumble'],
                      d=3.0, max=1.8, keep=3, air=0.6),
    'killcam': dict(p='a deep cinematic boom impact with a long reverb tail', d=3.0, max=1.5, air=0.3, on=-20),
    'stomp': dict(p='a giant robot stomping on a metal floor, heavy boom and rumble', d=2.0, max=1.0, keep=2, air=0.4),
    'rampage': dict(p='a deep distorted cinematic horn blast with a heavy impact', d=2.0, max=1.0, air=0.4, on=-18),

    # ------------------------------------------------------------------ metal / props
    'clang': dict(p='a bullet ricocheting off a steel plate, loud metallic clang', d=1.5, max=0.4, keep=3, air=0.8),
    'tink': dict(p='brass bullet casings dropping and bouncing on a metal floor', d=2.0, max=0.12, keep=3, mode='slice', air=0.9),
    'clunk': dict(p='a metal gas canister bouncing on a concrete floor', d=2.0, max=0.2, keep=3, mode='slice', air=0.6),
    'smash': dict(p='a wooden crate smashed into pieces', d=1.5, max=0.6, keep=2, air=0.6),
    'smashMetal': dict(p='a metal grate breaking and clattering to the floor', d=1.5, max=0.6, keep=2, air=0.7),
    'creak': dict(p='a huge steel beam groaning and creaking under stress', d=2.0, max=1.0, air=0.4, on=-24),
    'snap': dict(p=['a metal chain breaking with a sharp snap', 'a steel cable snapping'], d=1.0, max=0.3, n=8, air=0.7),
    'pin': dict(p='a steel spike hammered into a wooden wall, heavy thunk', d=1.0, max=0.4, air=0.5),
    'shieldHit': dict(p='a bullet hitting an electric force field, buzzing ping', d=1.0, max=0.25, keep=2, air=0.7),

    # ------------------------------------------------------------------ ice
    'freeze': dict(p='water freezing instantly into ice, crackling', d=1.5, max=0.4, air=0.8),
    'crack': dict(p='ice cracking, a single sharp crack', d=1.0, max=0.25, air=0.8),
    'shatter': dict(p='a block of ice shattering into pieces', d=1.5, max=0.6, keep=2, air=0.9),

    # ------------------------------------------------------------------ bodies / gore
    'hit': dict(p='a punch hitting flesh, short wet thwack', d=1.0, max=0.15, keep=3, air=0.5),
    'kickHit': dict(p='a heavy kick hitting a body, hard punch impact', d=1.0, max=0.3, keep=3, air=0.5),
    'squish': dict(p=['squishing wet mud', 'stepping on raw meat, wet squelch', 'a wet slap of raw meat'], d=1.0, max=0.18, keep=3, n=9, air=0.5),
    'gib': dict(p=['a gory wet splatter of flesh and guts', 'a body bursting apart, wet splatter'], d=1.5, max=0.6, keep=3, air=0.5),
    'splatWall': dict(p=['a wet body slam against a wall', 'a heavy wet splat'], d=1.0, max=0.4, keep=2, n=8, air=0.5),

    # ------------------------------------------------------------------ player foley
    'step': dict(p='footsteps of heavy boots walking on a metal grating', d=3.0, max=0.12, keep=4, mode='slice', air=0.6),
    'land': dict(p='a heavy boot landing on a metal floor, thud', d=1.0, max=0.22, keep=2, air=0.5),
    'jump': dict(p=['a quick cloth swish', 'a boot scuffing quickly on a metal floor'], d=1.0, max=0.18, keep=2, n=8, air=0.6),
    'swap': dict(p='a gun being cocked, mechanical metal clicks', d=1.0, max=0.3, keep=2, air=0.7),
    'whoosh': dict(p='a fast swing whoosh through the air', d=1.0, max=0.3, keep=2, air=0.6, on=-24),
    'hurt': dict(p=['a man grunting in pain', 'a man grunts loudly', 'a man says ugh in pain'], d=1.2, max=0.45, keep=3, n=12, air=0.4, on=-18),
    'heart': dict(p='a slow loud heartbeat', d=4.0, max=0.45, keep=2, mode='slice', air=0.1, hp=25),

    # ------------------------------------------------------------------ creatures
    'roar': dict(p='a huge monster roaring, deep and menacing', d=2.5, max=1.4, keep=2, air=0.4, on=-20),
    'growl': dict(p='a large beast growling aggressively', d=1.5, max=0.6, keep=2, air=0.4, on=-20),
    'snort': dict(p='an angry bull snorting loudly', d=1.5, max=0.5, air=0.4, on=-20),
    'scream': dict(p='a shrill alien creature screeching', d=1.5, max=0.6, keep=2, air=0.6, on=-20),
    'hiss': dict(p='a creature hissing aggressively like a snake', d=1.0, max=0.4, air=0.8, on=-20),

    # ------------------------------------------------------------------ fire / gas
    'ignite': dict(p='a gas burner igniting with a whoosh of flame', d=1.5, max=0.5, air=0.6, on=-20),
    'gasHiss': dict(p='pressurized gas leaking from a valve, sharp hiss', d=1.5, max=0.2, keep=2, air=0.9),
    'sputter': dict(p=['a small engine backfiring and sputtering', 'gas spitting from a punctured tank in short bursts'], d=2.0, max=0.12, keep=3, n=8, mode='slice', air=0.7),

    # ------------------------------------------------------------------ sci-fi
    'singOpen': dict(p='a deep sci-fi vortex opening, low rumble and swirling wind', d=2.0, max=1.3, air=0.4, on=-24),
    'warp': dict(p='a sci-fi teleport, rising shimmering whoosh', d=1.5, max=0.9, air=0.6, on=-24),
    'decloak': dict(p='a sci-fi cloaking device switching off, shimmering whoosh', d=1.0, max=0.4, air=0.7, on=-20),

    # ------------------------------------------------------------------ loops
    'flameLoop': dict(p='a flamethrower spraying fire continuously, roaring flames', d=4.0, max=2.0, mode='loop', air=0.6),
    'cryoLoop': dict(p='a high pressure jet of freezing gas spraying continuously, steady hiss', d=4.0, max=2.0, mode='loop', air=0.9),
    'arcLoop': dict(p='electricity arcing continuously, crackling high voltage buzz', d=4.0, max=2.0, mode='loop', air=0.8),
    'humLoop': dict(p='low industrial factory ambience, distant heavy machinery drone', d=8.0, max=6.0, mode='loop', air=0.2, hp=25),

    # ------------------------------------------------------------------ overdrive round (appended so earlier seeds stay put)
    'dash': dict(p=['a fast powerful whoosh of air', 'a short burst of a jet thruster, quick whoosh'], d=1.0, max=0.3, keep=2, n=8, air=0.7, on=-24),
    'hornet': dict(p=['a small model rocket launching, sharp fizzing whoosh', 'a firework rocket shooting up into the sky, whistling whoosh'],
                   d=1.5, max=0.45, keep=3, n=8, air=0.7, on=-20),
    'lanceFire': dict(p=['a powerful plasma cannon blast, deep roaring energy beam', 'a huge electric arc discharge with a deep boom and sizzle'],
                      d=2.0, max=1.0, keep=2, n=8, air=0.6),
    'lanceLoop': dict(p='a high voltage electrical transformer humming loudly with crackling', d=4.0, max=1.5, mode='loop', air=0.7),
    'ripperLoop': dict(p='a chainsaw engine revving at full throttle continuously', d=4.0, max=1.5, mode='loop', air=0.6),
    'ripperBite': dict(p='a chainsaw cutting through a thick log continuously', d=4.0, max=1.5, mode='loop', air=0.6),
    'glaive': dict(p=['a metal disc thrown spinning through the air, sharp whoosh', 'a sword swinging fast through the air with a metallic ring'],
                   d=1.0, max=0.35, keep=2, n=8, air=0.8, on=-20),
    'glaiveCatch': dict(p='catching a heavy metal disc with a metal glove, solid metallic clack', d=1.0, max=0.25, keep=2, air=0.7),
    'whirr': dict(p=['a helicopter rotor spinning, fast rhythmic whooshing', 'a rope being swung around quickly in circles, repeated whooshing'],
                  d=2.5, max=0.16, keep=4, n=8, mode='slice', air=0.7),          # the game plays it as rapid pulses: one whoosh each
    'sizzle': dict(p='water splashed onto red hot metal, loud sizzling hiss', d=1.5, max=0.4, keep=2, air=0.9),
    'splat': dict(p=['a thick wet glob of mud splatting on the ground', 'molten lava splashing and sizzling'], d=1.0, max=0.35, keep=3, n=8, air=0.6),
    'rumble': dict(p='a deep underground rumble, the ground shaking', d=2.0, max=0.5, keep=2, air=0.2, hp=25, on=-24),
    'erupt': dict(p=['rocks and dirt exploding out of the ground with a deep crunch', 'a giant creature bursting up through a concrete floor, rubble crashing'],
                  d=2.0, max=0.9, keep=2, n=8, air=0.5),
    'dig': dict(p='a shovel digging quickly into gravel, scraping crunch', d=1.5, max=0.4, keep=2, air=0.6),
    'chain': dict(p=['a heavy iron chain pulled fast through a metal ring, loud rattling', 'a heavy metal chain dropped on a concrete floor'],
                  d=1.5, max=0.3, keep=2, n=8, air=0.8),
    'linkOn': dict(p='a sci-fi energy shield switching on, rising electric hum', d=1.5, max=0.45, air=0.7, on=-24),
    'buzz': dict(p='a loud electric buzz from a high voltage power line', d=1.5, max=0.14, keep=3, air=0.8, on=-20),
}
