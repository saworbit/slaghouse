"""Turn raw AudioGen output into game-ready candidates and rank them.

    .venv/Scripts/python process.py [names...]

For every raw clip: high-pass, cut it down (first event / every event / seamless loop), upsample
16k -> 48k, synthesize the missing >8 kHz band ("air"), fade, peak-normalize. Then score each
candidate against its prompt with CLAP and write:
  out/proc/<name>/<id>.wav    48 kHz 16-bit candidates
  out/candidates.json         per sound: candidates sorted best-first (clap score, loudness, length)
  out/sheets/<name>.png       spectrogram contact sheet of the top candidates
"""
import os, sys, json, glob, warnings
warnings.filterwarnings('ignore')
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import numpy as np, soundfile as sf
from scipy import signal
from sounds import SOUNDS
from loud import loudness

RAW = os.path.join(HERE, 'out', 'raw')
PROC = os.path.join(HERE, 'out', 'proc')
SHEETS = os.path.join(HERE, 'out', 'sheets')
CJSON = os.path.join(HERE, 'out', 'candidates.json')
SR_IN, SR = 16000, 48000
rng = np.random.default_rng(7)


def env_db(x, sr, win=0.004, hop=0.002):
    w, h = int(sr * win), int(sr * hop)
    n = max(1, (len(x) - w) // h + 1)
    idx = np.arange(n) * h
    e = np.sqrt(np.array([np.mean(x[i:i + w] ** 2) for i in idx]) + 1e-12)
    return 20 * np.log10(e), idx


def first_event(x, sr, maxlen, on_db=-12):
    fdb, fidx = env_db(x, sr)                         # fine envelope: exact onset
    above = np.nonzero(fdb > fdb.max() + on_db)[0]
    if not len(above):
        return None
    start = max(0, fidx[above[0]] - int(0.003 * sr))
    W, H = 0.02, 0.005
    db, idx = env_db(x, sr, win=W, hop=H)             # smooth envelope: where the event ends
    i0 = min(len(db) - 1, int(np.searchsorted(idx, start)))
    pk = i0 + int(np.argmax(db[i0:i0 + int(0.15 / H)]))
    top, min_len = db[pk], max(0.08, 0.35 * maxlen)
    runmin, runmin_i, end = top, pk, None
    for i in range(pk + 1, len(db)):
        if db[i] < runmin:
            runmin, runmin_i = db[i], i
        # a clear dip followed by a new attack = a second event: cut in the dip
        if (idx[i] - start) / sr > min_len and runmin < top - 18 and db[i] > runmin + 15 and db[i] > top - 10:
            end = idx[runmin_i] + int(W * sr / 2); break
        if db[i] < top - 48:
            end = idx[i]; break
    end = len(x) if end is None else end
    end = min(end, start + int(maxlen * sr))
    return x[start:end]


def all_events(x, sr, maxlen, limit=6):
    db, idx = env_db(x, sr)
    peak = db.max()
    hop = idx[1] - idx[0] if len(idx) > 1 else 1
    look = max(1, int(0.012 * sr / hop))
    onsets = []
    for i in range(look, len(db)):
        if db[i] > peak - 22 and db[i] - db[i - look:i].min() > 9:
            if not onsets or idx[i] - onsets[-1] > 0.045 * sr:
                onsets.append(idx[i - look // 2])
    segs = []
    for j, o in enumerate(onsets):
        s = max(0, o - int(0.002 * sr))
        e = min(len(x), s + int(maxlen * sr))
        if j + 1 < len(onsets):
            e = min(e, onsets[j + 1] - int(0.002 * sr))
        if e - s > 0.035 * sr:
            segs.append(x[s:e])
    segs.sort(key=lambda z: -np.max(np.abs(z)))
    return segs[:limit]


def make_loop(x, sr, L, xf=0.3):
    n, X = int(L * sr), int(xf * sr)
    if len(x) < n + X + int(0.4 * sr):
        return None
    # choose the steadiest window (least RMS wobble), skipping the attack
    best, best_a = None, None
    for a in range(int(0.4 * sr), len(x) - n - X, int(0.05 * sr)):
        db, _ = env_db(x[a:a + n + X], sr, win=0.05, hop=0.025)
        score = np.std(db) - 0.15 * np.mean(db)
        if best is None or score < best:
            best, best_a = score, a
    seg = x[best_a:best_a + n + X].copy()
    t = np.linspace(0, np.pi / 2, X)
    out = seg[:n].copy()
    out[:X] = seg[:X] * np.sin(t) + seg[n:n + X] * np.cos(t)   # equal-power: end flows into start
    return out


def add_air(y, sr, amount):
    if amount <= 0:
        return y
    band = signal.sosfilt(signal.butter(4, [3500, 7600], 'bandpass', fs=sr, output='sos'), y)
    env = np.abs(signal.hilbert(band))
    env = signal.sosfilt(signal.butter(2, 300, fs=sr, output='sos'), env)
    hpf = signal.butter(6, 7900, 'highpass', fs=sr, output='sos')
    noise = signal.sosfilt(hpf, rng.standard_normal(len(y))) * env
    m = np.max(np.abs(band)) + 1e-9
    harm = signal.sosfilt(hpf, np.tanh(3 * band / m) * m)
    hf = 0.65 * noise / (np.std(noise) + 1e-9) + 0.35 * harm / (np.std(harm) + 1e-9)
    hf = signal.sosfilt(signal.butter(1, 13000, fs=sr, output='sos'), hf)
    hf *= amount * 0.5 * np.std(band) / (np.std(hf) + 1e-9)
    return y + hf


def finish(y, sr, spec, loop=False):
    if not loop:
        fi = int(0.001 * sr)
        y[:fi] *= np.linspace(0, 1, fi)
        fl = spec.get('fade', min(0.25, 0.3 * len(y) / sr))
        fo = max(int(0.004 * sr), int(fl * sr))
        fo = min(fo, len(y))
        y[-fo:] *= np.cos(np.linspace(0, np.pi / 2, fo)) ** 2
    pk = np.max(np.abs(y)) + 1e-9
    return (y * (0.89 / pk)).astype(np.float32)


def process_one(name, spec):
    mode = spec.get('mode', 'first')
    hp = signal.butter(2, spec.get('hp', 35), 'highpass', fs=SR_IN, output='sos')
    outdir = os.path.join(PROC, name)
    os.makedirs(outdir, exist_ok=True)
    for f in glob.glob(os.path.join(outdir, '*.wav')):
        os.remove(f)
    cands = []
    for f in sorted(glob.glob(os.path.join(RAW, f'{name}_*.wav')), key=lambda p: int(p.rsplit('_', 1)[1][:-4])):
        ri = int(f.rsplit('_', 1)[1][:-4])
        x, sr = sf.read(f, dtype='float32')
        x = signal.sosfiltfilt(hp, x - x.mean())
        if mode == 'slice':
            pieces = all_events(x, sr, spec['max'])
        elif mode == 'loop':
            pieces = [make_loop(x, sr, spec['max'])]
        else:
            pieces = [first_event(x, sr, spec['max'], spec.get('on', -12))]
        for j, pc in enumerate(p for p in pieces if p is not None and len(p) > 0.03 * sr):
            y = signal.resample_poly(pc, SR // SR_IN, 1)
            y = add_air(y, SR, spec.get('air', 0.5))
            y = finish(y, SR, spec, loop=(mode == 'loop'))
            cid = f'{ri}' if mode != 'slice' else f'{ri}-{j}'
            sf.write(os.path.join(outdir, f'{cid}.wav'), y, SR, subtype='PCM_16')
            cands.append(dict(id=cid, dur=round(len(y) / SR, 3), loud=loudness(y, SR, loop=(mode == 'loop')),
                              _y=y, prompt=(spec['p'] if isinstance(spec['p'], str) else spec['p'][ri % len(spec['p'])])))
    return cands


def clap_scores(results):
    import torch
    from transformers import ClapModel, ClapProcessor
    dev = os.environ.get('CLAP_DEVICE') or ('cuda' if torch.cuda.is_available() else 'cpu')
    model = ClapModel.from_pretrained('laion/larger_clap_general').to(dev).eval()
    proc = ClapProcessor.from_pretrained('laion/larger_clap_general')
    with torch.no_grad():
        for name, cands in results.items():
            texts = sorted({c['prompt'] for c in cands})
            if not texts:
                continue
            ti = proc(text=texts, return_tensors='pt', padding=True).to(dev)
            te = model.get_text_features(**ti)
            te = te / te.norm(dim=-1, keepdim=True)
            tmap = {t: te[i] for i, t in enumerate(texts)}
            for k in range(0, len(cands), 16):
                chunk = cands[k:k + 16]
                ai = proc(audios=[c['_y'] for c in chunk], sampling_rate=SR, return_tensors='pt').to(dev)
                ae = model.get_audio_features(**ai)
                ae = ae / ae.norm(dim=-1, keepdim=True)
                for c, a in zip(chunk, ae):
                    c['clap'] = round(float(a @ tmap[c['prompt']]), 4)


def sheet(name, cands, top=8):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    cs = cands[:top]
    fig, axes = plt.subplots(2, len(cs), figsize=(2.2 * len(cs), 3.6), squeeze=False)
    for i, c in enumerate(cs):
        y = c['_y']
        t = np.arange(len(y)) / SR
        axes[0, i].plot(t, y, lw=0.4, color='k'); axes[0, i].set_ylim(-1, 1)
        axes[0, i].set_title(f"{c['id']}  clap {c['clap']:.2f}\n{c['dur']:.2f}s", fontsize=7)
        axes[1, i].specgram(y + 1e-7, NFFT=512, Fs=SR, noverlap=384, cmap='magma', vmin=-120)
        axes[1, i].set_ylim(0, 20000)
        for a in axes[:, i]:
            a.tick_params(labelsize=5)
    fig.suptitle(name, fontsize=9)
    fig.tight_layout()
    os.makedirs(SHEETS, exist_ok=True)
    fig.savefig(os.path.join(SHEETS, f'{name}.png'), dpi=90)
    plt.close(fig)


if __name__ == '__main__':
    only = sys.argv[1:]
    names = [k for k in SOUNDS if (k in only if only else glob.glob(os.path.join(RAW, f'{k}_0.wav')))]
    results = {}
    for name in names:
        results[name] = process_one(name, SOUNDS[name])
        print(f'{name}: {len(results[name])} candidates', flush=True)
    clap_scores(results)
    data = json.load(open(CJSON)) if os.path.exists(CJSON) else {}
    for name, cands in results.items():
        spec = SOUNDS[name]
        for c in cands:                                   # rank: CLAP match, minus a penalty for clips cut far shorter than intended
            short = spec.get('mode', 'first') != 'loop' and c['dur'] < 0.4 * spec['max']
            c['score'] = round(c.get('clap', 0) - (0.08 if short else 0), 4)
        cands.sort(key=lambda c: -c['score'])
        sheet(name, cands)
        data[name] = [{k: v for k, v in c.items() if k != '_y'} for c in cands]
    json.dump(data, open(CJSON, 'w'), indent=1)
    print('wrote', CJSON)
