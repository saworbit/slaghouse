"""Generate raw AudioGen candidates for every sound in sounds.py.

    .venv/Scripts/python gen.py            # all sounds, skips ones already generated
    .venv/Scripts/python gen.py nail gib   # just these (regenerates them)

Writes out/raw/<name>_<i>.wav (16 kHz mono float).
"""
import os, sys, time, zlib, warnings
warnings.filterwarnings('ignore')
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import numpy as np, soundfile as sf, torch
from sounds import SOUNDS

RAW = os.path.join(HERE, 'out', 'raw')
os.makedirs(RAW, exist_ok=True)

only = sys.argv[1:]
todo = [k for k in SOUNDS if (k in only if only else not os.path.exists(os.path.join(RAW, f'{k}_0.wav')))]
if not todo:
    print('nothing to generate'); sys.exit(0)

from audiocraft.models import AudioGen
t0 = time.time()
model = AudioGen.get_pretrained('facebook/audiogen-medium', device='cuda')
print(f'model loaded in {time.time() - t0:.0f}s, sr={model.sample_rate}', flush=True)

for idx, name in enumerate(todo):
    s = SOUNDS[name]
    n = s.get('n', 6)
    prompts = s['p'] if isinstance(s['p'], list) else [s['p']]
    batch = [prompts[i % len(prompts)] for i in range(n)]
    torch.manual_seed(zlib.crc32(name.encode()))      # from the name, so adding or moving a sound reseeds no other
    model.set_generation_params(duration=s['d'], top_k=250, cfg_coef=3.0)
    t = time.time()
    with torch.no_grad():
        wav = model.generate(batch, progress=False).float().cpu().numpy()[:, 0]
    for i, w in enumerate(wav):
        sf.write(os.path.join(RAW, f'{name}_{i}.wav'), w.astype(np.float32), model.sample_rate, subtype='FLOAT')
    print(f'[{idx + 1}/{len(todo)}] {name}: {n} x {s["d"]}s in {time.time() - t:.1f}s', flush=True)

print(f'done in {time.time() - t0:.0f}s')
