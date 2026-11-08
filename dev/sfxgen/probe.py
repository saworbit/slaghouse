"""Debug helper: classify one sound's candidates against contrasting labels with CLAP (softmax over labels).
    probe.py hurt "a man grunting in pain" "a punch impact" "noise" """
import sys, json, warnings; warnings.filterwarnings('ignore')
import soundfile as sf, torch
from transformers import ClapModel, ClapProcessor
name, labels = sys.argv[1], sys.argv[2:]
C = json.load(open('out/candidates.json'))[name]
m = ClapModel.from_pretrained('laion/larger_clap_general').eval(); p = ClapProcessor.from_pretrained('laion/larger_clap_general')
with torch.no_grad():
    t = m.get_text_features(**p(text=labels, return_tensors='pt', padding=True)); t = t / t.norm(dim=-1, keepdim=True)
    ys = [sf.read(f'out/proc/{name}/{c["id"]}.wav', dtype='float32')[0] for c in C]
    a = m.get_audio_features(**p(audios=ys, sampling_rate=48000, return_tensors='pt')); a = a / a.norm(dim=-1, keepdim=True)
    pr = (100 * a @ t.T).softmax(-1)
print(' ' * 6 + ''.join(l[:14].rjust(16) for l in labels))
for c, r in zip(C, pr): print(c['id'].ljust(6) + ''.join(f'{v:16.2f}' for v in r.tolist()))
