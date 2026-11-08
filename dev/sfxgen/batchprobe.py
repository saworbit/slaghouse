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
