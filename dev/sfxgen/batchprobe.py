"""Debug helper: P(intended label) for every candidate of many sounds in one CLAP pass.
Prints candidates best-first as id:prob; '*' marks the current default pick (top `keep` by score)."""
import json, sys, warnings; warnings.filterwarnings('ignore')
sys.path.insert(0, '.')
import soundfile as sf, torch
from transformers import ClapModel, ClapProcessor
from sounds import SOUNDS
PROBES = {
 'gib': ['a wet gory splatter', 'an explosion', 'a punch', 'static noise'],
 'eshot': ['a gunshot', 'a door slam', 'a hand clap', 'static noise'],
 'snipe': ['a rifle gunshot', 'an explosion', 'a door slam', 'thunder'],
 'clang': ['a metal clang', 'a gunshot', 'glass breaking', 'static noise'],
 'roar': ['a monster roaring', 'an engine', 'wind', 'a man screaming'],
 'growl': ['an animal growling', 'an engine', 'wind', 'a man speaking'],
 'scream': ['a creature screeching', 'a siren', 'a whistle', 'static noise'],
 'kickHit': ['a punch hitting a body', 'a door slam', 'a footstep', 'an explosion'],
 'hit': ['a punch hitting a body', 'a door slam', 'a footstep', 'a gunshot'],
 'land': ['a heavy footstep thud', 'a punch', 'a door slam', 'an explosion'],
 'tink': ['a small metal tink', 'a gunshot', 'a footstep', 'static noise'],
 'nail': ['a nail gun shot', 'a gunshot', 'a footstep', 'static noise'],
 'step': ['a footstep', 'a gunshot', 'a door knock', 'static noise'],
 'shatter': ['ice shattering', 'a gunshot', 'an explosion', 'static noise'],
 'smash': ['wood breaking', 'glass breaking', 'an explosion', 'a gunshot'],
 'smashMetal': ['metal clattering', 'glass breaking', 'an explosion', 'a gunshot'],
 'heart': ['a heartbeat', 'a drum', 'a footstep', 'a door knock'],
 'swap': ['a gun being cocked', 'a footstep', 'a door closing', 'static noise'],
 'rocket': ['a rocket launching', 'an explosion', 'a jet engine', 'wind'],
 'radio': ['radio static squelch', 'a beep', 'a man speaking', 'music'],
 'stomp': ['a giant footstep boom', 'an explosion', 'thunder', 'a door slam'],
 'grenade': ['a grenade launcher thump', 'an explosion', 'a gunshot', 'a door slam'],
 'clunk': ['a metal canister bouncing', 'a gunshot', 'a footstep', 'static noise'],
 'pin': ['a spike hammered into wood', 'a gunshot', 'a metal clang', 'a footstep'],
 # overdrive round
 'dash': ['a fast whoosh of air', 'an explosion', 'a gunshot', 'static noise'],
 'hornet': ['a small rocket launching with a whoosh', 'an explosion', 'a gunshot', 'wind'],
 'lanceFire': ['a powerful energy blast', 'an explosion', 'a gunshot', 'thunder'],
 'lanceLoop': ['an electrical hum', 'an engine running', 'wind', 'static noise'],
 'ripperLoop': ['a chainsaw running', 'a motorcycle engine', 'a lawn mower', 'static noise'],
 'ripperBite': ['a chainsaw cutting wood', 'a motorcycle engine', 'a drill', 'static noise'],
 'glaive': ['a fast metallic whoosh', 'a gunshot', 'a bell ringing', 'static noise'],
 'glaiveCatch': ['a metallic clack', 'a gunshot', 'a footstep', 'glass breaking'],
 'whirr': ['a spinning blade whirring', 'an engine', 'wind', 'static noise'],
 'sizzle': ['hot metal sizzling', 'rain', 'static noise', 'applause'],
 'splat': ['a wet splat', 'a gunshot', 'a footstep', 'an explosion'],
 'rumble': ['a deep rumble', 'thunder', 'an engine', 'wind'],
 'erupt': ['rocks and rubble crashing', 'an explosion', 'a gunshot', 'thunder'],
 'dig': ['digging in gravel', 'a footstep', 'static noise', 'rain'],
 'chain': ['a metal chain rattling', 'coins jingling', 'a bell', 'static noise'],
 'linkOn': ['an electric power up hum', 'a siren', 'an engine', 'static noise'],
 'buzz': ['an electric buzz', 'a bee buzzing', 'an engine', 'static noise'],
 # crucible round
 'execute': ['a bone crunching punch', 'an explosion', 'a gunshot', 'a door slam'],
 'hammerSlam': ['a heavy hammer slam on metal', 'an explosion', 'a gunshot', 'thunder'],
 'flak': ['a cannon blast', 'an explosion', 'a door slam', 'thunder'],
 'flakBurst': ['metal fragments scattering', 'glass breaking', 'a gunshot', 'static noise'],
 'coilBoom': ['an electrical explosion with crackling', 'an explosion', 'a gunshot', 'fireworks'],
 'gnatPop': ['a tiny wet pop', 'a gunshot', 'a footstep', 'static noise'],
 'stitch': ['an eerie electric hum', 'an engine', 'a siren', 'static noise'],
 'revive': ['a zombie groan', 'a man screaming', 'wind', 'an engine'],
 'swarmLoop': ['a swarm of bees buzzing', 'an engine', 'an electric hum', 'static noise'],
 # furnace round
 'tractorGrab': ['an electric power up whoop', 'a gunshot', 'a door slam', 'static noise'],
 'tractorThrow': ['a heavy whoosh and thump', 'a gunshot', 'glass breaking', 'static noise'],
 'tractorLoop': ['an electrical hum', 'an engine running', 'wind', 'static noise'],
 'acidLoop': ['a hissing liquid spray', 'rain', 'an engine', 'static noise'],
 'ricochet': ['a bullet ricochet', 'a gunshot', 'a bell', 'static noise'],
 'magTell': ['an electric charging whine', 'a siren', 'an engine', 'static noise'],
 'magPulse': ['a deep electric pulse blast', 'an explosion', 'a gunshot', 'thunder'],
 'gurgle': ['liquid gurgling', 'a man speaking', 'an engine', 'static noise'],
 'tarIgnite': ['fire igniting with a whoosh', 'an explosion', 'wind', 'static noise'],
 # shockworks round
 'shockOrb': ['an electric zap', 'a gunshot', 'a door slam', 'static noise'],
 'shockBeam': ['an electric zap', 'a gunshot', 'glass breaking', 'static noise'],
 'shockCombo': ['an electrical explosion', 'a gunshot', 'thunder', 'static noise'],
 'needle': ['a glassy ping', 'a gunshot', 'a footstep', 'static noise'],
 'supercombine': ['glass shattering', 'an explosion', 'a gunshot', 'static noise'],
 'blink': ['a sci-fi teleport shimmer', 'a gunshot', 'a door slam', 'static noise'],
 'chomp': ['a monster biting', 'a door slam', 'a footstep', 'static noise'],
 # slagforge round
 'drill': ['a power drill', 'a gunshot', 'a footstep', 'static noise'],
 'drillFire': ['a whirring launcher', 'an explosion', 'a door slam', 'static noise'],
 'revolver': ['a pistol gunshot', 'an explosion', 'a door slam', 'a hand clap'],
 'revReload': ['a gun cylinder clicking', 'a footstep', 'a bell', 'static noise'],
 'gasPop': ['gas hissing out', 'a gunshot', 'rain', 'static noise'],
 'gasBoom': ['a fiery explosion', 'thunder', 'a door slam', 'static noise'],
 'weld': ['electric welding crackle', 'rain', 'an engine', 'a bird'],
 'slash': ['a sword swish', 'a gunshot', 'wind', 'static noise'],
 # ironclad round
 'flare': ['a flare fizzing whoosh', 'a gunshot', 'a door slam', 'static noise'],
 'limpet': ['a hollow launcher thump', 'a gunshot', 'glass breaking', 'static noise'],
 'steam': ['steam hissing', 'rain', 'an engine', 'applause'],
 'emp': ['an electric pulse blast', 'a gunshot', 'thunder', 'static noise'],
 'jammed': ['electronic static', 'rain', 'a man speaking', 'music'],
 'roll': ['a heavy ball rolling', 'thunder', 'an engine', 'static noise'],
 'skitter': ['insect legs clicking', 'rain', 'a clock ticking', 'static noise'],
 # sorting line round
 'net': ['a pneumatic thump', 'a gunshot', 'glass breaking', 'static noise'],
 'press': ['a hydraulic press slam', 'thunder', 'a gunshot', 'static noise'],
 'clank': ['a metal clank', 'a gunshot', 'a bell', 'static noise'],
 'golem': ['a metal monster groan', 'a man speaking', 'wind', 'static noise'],
 # overtime round
 'orbital': ['a huge energy beam blast', 'thunder', 'a gunshot', 'static noise'],
 'cutter': ['an electric zing', 'a gunshot', 'a bell', 'static noise'],
 'boing': ['a spring boing', 'a gunshot', 'a door slam', 'static noise'],
 'snatch': ['a quick whoosh grab', 'a gunshot', 'a footstep', 'static noise'],
 # codex round
 'alarm': ['an alarm siren', 'a bird', 'music', 'static noise'],
 'squelch': ['a wet squelch', 'a gunshot', 'a footstep', 'static noise'],
 'suck': ['a wet slurp', 'a gunshot', 'wind', 'static noise'],
 # supply round
 'powerup': ['a shimmering chime', 'a gunshot', 'a door slam', 'static noise'],
 'whip': ['a whip crack', 'a gunshot', 'a door slam', 'static noise'],
 'bees': ['bees buzzing', 'an engine', 'rain', 'static noise'],
 # mastery round
 'shrink': ['a ray gun zap', 'a gunshot', 'a door slam', 'static noise'],
 'sonic': ['a deep boom', 'a gunshot', 'glass breaking', 'static noise'],
 'laser': ['a laser beam hum', 'an engine', 'rain', 'music'],
 # finale round
 'gravPulse': ['a deep whoomp', 'a gunshot', 'glass breaking', 'static noise'],
 'pinball': ['a metal ping', 'a gunshot', 'a door slam', 'static noise'],
 'wail': ['a ghostly wail', 'a dog barking', 'an engine', 'static noise'],
 'iceForm': ['ice cracking', 'a gunshot', 'rain', 'static noise'],
 'warhorn': ['a horn blast', 'an engine', 'a gunshot', 'music'],
 # arsenal round
 'firework': ['a firework whistle', 'a gunshot', 'an engine', 'static noise'],
 'fireworkPop': ['a firework bang', 'a door slam', 'rain', 'static noise'],
 'crackle': ['crackling sparks', 'rain', 'an engine', 'static noise'],
 'katana': ['a sword whoosh', 'a gunshot', 'a door slam', 'static noise'],
 'slashHit': ['a blade slicing', 'a gunshot', 'glass breaking', 'static noise'],
 'swapTell': ['a sci-fi hum', 'an engine', 'music', 'static noise'],
 'swapZap': ['a teleport zap', 'a gunshot', 'a dog barking', 'static noise'],
 'scorch': ['a burst of fire', 'an engine', 'rain', 'static noise'],
 'plateBreak': ['a metal clang', 'a gunshot', 'glass breaking', 'static noise'],
 # elite round
 'vacuum': ['a vacuum cleaner sucking', 'an engine', 'rain', 'static noise'],
 'scrapBlast': ['a loud blast with rattling metal', 'a door slam', 'rain', 'static noise'],
 'siphon': ['a wet slurping', 'an engine', 'a dog barking', 'static noise'],
 'grab': ['a body thud', 'a gunshot', 'glass breaking', 'static noise'],
 'spotted': ['an alarm beep', 'a dog barking', 'an engine', 'static noise'],
 'bark': ['a dog barking', 'a gunshot', 'an engine', 'static noise'],
 'shieldPop': ['a glassy electric burst', 'a gunshot', 'rain', 'static noise'],
 # wrecking-yard round
 'wreckSwing': ['a deep whoosh', 'an engine', 'rain', 'static noise'],
 'wreckHit': ['a massive metal crash', 'a gunshot', 'rain', 'static noise'],
 'creak': ['a creaking chain', 'an engine', 'a dog barking', 'static noise'],
 'split': ['a laser zap', 'a gunshot', 'a door slam', 'static noise'],
 'splitPop': ['an electric pop', 'a gunshot', 'rain', 'static noise'],
 'decoy': ['a sci-fi shimmer', 'an engine', 'music', 'static noise'],
 'discThrow': ['a whirring whoosh', 'a gunshot', 'an engine', 'static noise'],
 'sporePuff': ['a soft puff', 'a gunshot', 'glass breaking', 'static noise'],
 # armory round
 'stasis': ['a sci-fi warp whoosh', 'a gunshot', 'a dog barking', 'static noise'],
 'stasisEnd': ['a rising whoosh snap', 'a gunshot', 'rain', 'static noise'],
 'microwave': ['an electric hum', 'a dog barking', 'rain', 'music'],
 'mwPop': ['a wet pop', 'a gunshot', 'glass breaking', 'static noise'],
 'vortexSpin': ['a whirling turbine', 'a dog barking', 'rain', 'music'],
 'pylonCharge': ['a crackling electric buzz', 'a dog barking', 'rain', 'music'],
 'pylonZap': ['an electric crack', 'a gunshot', 'a door slam', 'static noise'],
 'chomp': ['a wet chomping bite', 'a gunshot', 'an engine', 'static noise'],
 # foreman round
 'gauntlet': ['a fiery thruster whoosh', 'a gunshot', 'a dog barking', 'static noise'],
 'punchHit': ['a heavy punch thud', 'a gunshot', 'glass breaking', 'static noise'],
 'marksman': ['a sniper rifle shot', 'a door slam', 'an engine', 'static noise'],
 'shuriken': ['a sharp swish', 'a gunshot', 'an engine', 'static noise'],
 'thunder': ['a thunder crack', 'a gunshot', 'an engine', 'music'],
 # mutator round
 'tripSet': ['an electronic chirp', 'a gunshot', 'a dog barking', 'static noise'],
 'dronePod': ['a buzzing drone', 'a gunshot', 'rain', 'static noise'],
 'axeChop': ['a heavy axe thunk', 'a gunshot', 'glass breaking', 'static noise'],
 'berserk': ['a monster roar', 'a gunshot', 'an engine', 'music'],
 'hardlight': ['a rising energy hum', 'a dog barking', 'rain', 'static noise'],
 # debrief round
 'bubble': ['a soft bubble bloop', 'a gunshot', 'an engine', 'static noise'],
 'bubblePop': ['a tiny pop', 'a gunshot', 'glass breaking', 'static noise'],
 'zealotCast': ['a choir chant', 'a dog barking', 'an engine', 'static noise'],
 'soul': ['an ethereal whoosh', 'a gunshot', 'a dog barking', 'static noise'],
 'squeak': ['a rat squeak', 'a gunshot', 'an engine', 'static noise'],
 # rush round
 'shieldBlock': ['a metallic ping', 'a dog barking', 'rain', 'static noise'],
 'glue': ['a wet squelch', 'a gunshot', 'glass breaking', 'static noise'],
 'quills': ['a volley of darts', 'an engine', 'a dog barking', 'static noise'],
 'spit': ['a wet spray', 'a gunshot', 'glass breaking', 'static noise'],
 'leap': ['a spring whoosh', 'a gunshot', 'glass breaking', 'static noise'],
}
names = sys.argv[1:] or list(PROBES)
C = json.load(open('out/candidates.json'))
m = ClapModel.from_pretrained('laion/larger_clap_general').eval(); p = ClapProcessor.from_pretrained('laion/larger_clap_general')
with torch.no_grad():
    for n in names:
        L = PROBES[n]; cs = C[n]; k = SOUNDS[n].get('keep', 1)
        t = m.get_text_features(**p(text=L, return_tensors='pt', padding=True)); t = t / t.norm(dim=-1, keepdim=True)
        pr = []
        for i in range(0, len(cs), 16):
            ys = [sf.read(f'out/proc/{n}/{c["id"]}.wav', dtype='float32')[0] for c in cs[i:i + 16]]
            a = m.get_audio_features(**p(audios=ys, sampling_rate=48000, return_tensors='pt')); a = a / a.norm(dim=-1, keepdim=True)
            pr += (100 * a @ t.T).softmax(-1)[:, 0].tolist()
        top = {c['id'] for c in cs[:k]}
        order = sorted(zip(cs, pr), key=lambda z: -z[1])
        print(f'{n:10s} k={k} ' + ' '.join(f"{c['id']}{'*' if c['id'] in top else ''}:{v:.2f}" for c, v in order[:10]), flush=True)
