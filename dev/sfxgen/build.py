"""Pack the chosen candidates into ../../sfx_bank.js (base64 Ogg Opus + per-sound gain).

    .venv/Scripts/python build.py

Picks: picks.json {name: [candidate ids]} if present (export it from review.html), otherwise the
top `keep` candidates by CLAP score. Gains: each sound is matched to the K-weighted loudness of the
procedural version it replaces (calib.json, measured in the browser by calib.js), times MASTER, but never
peaks more than PEAK_CAP x above that synth version.

Takes come from out/proc/<name>/<id>.wav (gitignored, written by process.py) and, where that's missing, from
takes/<name>/<id>.flac: committed, lossless copies of just the takes the bank uses. After a build, takes/ holds
exactly those takes, matching out/proc/, so a fresh clone rebuilds sfx_bank.js byte for byte.

Rebuilds only re-encode what changed: out/bank_src.json records each sound's picked ids, a hash of their
samples and the bitrate, and a sound whose record still matches keeps its Opus data from the current
sfx_bank.js. New encodes are bit-exact (no random Ogg serial), so the same input gives the same bytes. That
way adding one sound doesn't rewrite the whole bank in git. Delete out/bank_src.json to force a full re-encode.
"""
import os, re, sys, json, base64, hashlib, subprocess, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', 'audiolib'))   # loud.py, shared with dev/synthwave
import numpy as np, soundfile as sf
from sounds import SOUNDS
from loud import loudness

MASTER = 1.0          # overall sample level relative to the synth versions they replace
PEAK_CAP = 2.0        # a sample may peak at most this much (+6 dB) above the synth it replaces (protects the master compressor)
BITRATE = '40k'
OUT = os.path.normpath(os.path.join(HERE, '..', '..', 'sfx_bank.js'))
PROC = os.path.join(HERE, 'out', 'proc')
TAKES = os.path.join(HERE, 'takes')

cands = json.load(open(os.path.join(HERE, 'out', 'candidates.json')))
calib = json.load(open(os.path.join(HERE, 'calib.json')))
picks = json.load(open(os.path.join(HERE, 'picks.json'))) if os.path.exists(os.path.join(HERE, 'picks.json')) else {}
JIT = {'nail': 0.08, 'rivet': 0.08, 'step': 0.08, 'tink': 0.1, 'clunk': 0.08, 'hit': 0.07, 'squish': 0.08, 'eshot': 0.06,
       'heart': 0.0, 'humLoop': 0.0, 'hurt': 0.04, 'roar': 0.04}


def choose(name, spec):
    if name in picks:
        return picks[name]
    k = spec.get('keep', 1)
    out, used_raw = [], set()
    for c in cands[name]:                       # best-first; spread slices across different raw takes
        raw = c['id'].split('-')[0]
        if spec.get('mode') == 'slice' and raw in used_raw and len(used_raw) < len({x['id'].split('-')[0] for x in cands[name]}):
            continue
        out.append(c['id']); used_raw.add(raw)
        if len(out) == k:
            break
    return out


def opus(y):
    with tempfile.TemporaryDirectory() as td:
        src, dst = os.path.join(td, 'a.wav'), os.path.join(td, 'a.ogg')
        sf.write(src, y, 48000, subtype='PCM_16')
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', src, '-c:a', 'libopus', '-b:a', BITRATE,
                        '-application', 'audio', '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact', dst], check=True)
        return open(dst, 'rb').read()


def take(name, cid):                            # the processed WAV if there is one, else its committed FLAC copy
    wav = os.path.join(PROC, name, f'{cid}.wav')
    return wav if os.path.exists(wav) else os.path.join(TAKES, name, f'{cid}.flac')


def samples_hash(path):                         # of the 16-bit samples, so a WAV and its FLAC copy hash the same
    return hashlib.sha1(sf.read(path, dtype='int16')[0].tobytes()).hexdigest()[:16]


def previous_bank():                            # name -> [base64 takes] from the sfx_bank.js being replaced
    prev = {}
    if os.path.exists(OUT):
        for line in open(OUT, encoding='utf-8'):
            m = re.match(r"\s+(\w+): \{ g: [\d.]+, j: [\d.]+, d: \[(.*)\] \},?$", line.rstrip('\n'))
            if m:
                prev[m.group(1)] = re.findall(r"'([^']*)'", m.group(2))
    return prev


# calib.json entries measured against an older version of their procedural sound (calibcheck.mjs; needs node)
try:
    print(subprocess.run(['node', os.path.join(HERE, 'calibcheck.mjs')], capture_output=True, text=True, check=True).stdout, end='')
except (OSError, subprocess.CalledProcessError) as e:
    print(f'note: calib.json was not checked for stale entries ({e})')

skipped = [n for n in SOUNDS if n not in cands or n not in calib]
buildable = [n for n in SOUNDS if n not in skipped]
missing = [os.path.relpath(take(n, cid), HERE) for n in buildable for cid in choose(n, SOUNDS[n]) if not os.path.exists(take(n, cid))]
if missing:                                     # checked before anything is written, so a failed build leaves the bank alone
    sys.exit(f'{len(missing)} take(s) are in neither takes/ nor out/proc/, starting with {missing[0]}. A new pick needs '
             f'gen.py and process.py first (see "Rebuilding from a fresh clone" in README.md).')

SRC_JSON = os.path.join(HERE, 'out', 'bank_src.json')
prev_data, prev_src = previous_bank(), (json.load(open(SRC_JSON)) if os.path.exists(SRC_JSON) else {})
bank, total, used, src, reused = {}, 0, {}, {}, 0
for name, spec in SOUNDS.items():
    if name in skipped:
        print(f'skip {name} (no candidates or calibration)'); continue
    loop = spec.get('mode') == 'loop'
    used[name] = choose(name, spec)
    paths = [take(name, cid) for cid in used[name]]
    ys = [sf.read(p, dtype='float32')[0] for p in paths]
    louds = [loudness(y, 48000, loop=loop) for y in ys]
    common = min(min(l * 0.99 / (np.max(np.abs(y)) + 1e-9) for y, l in zip(ys, louds)), min(louds) * 1.5)
    src[name] = {'ids': used[name], 'wav': [samples_hash(p) for p in paths], 'rate': BITRATE}
    if prev_src.get(name) == src[name] and len(prev_data.get(name, [])) == len(ys):
        data = prev_data[name]; reused += 1      # same picks, same source audio: keep the existing encode
        total += sum(len(base64.b64decode(d)) for d in data)
    else:
        data = []
        for y, l in zip(ys, louds):
            b = opus((y * (common / l)).astype(np.float32))
            total += len(b)
            data.append(base64.b64encode(b).decode())
    target, synth_peak = calib[name][:2]               # [loudness, peak, fingerprint]
    g = MASTER * target / common
    peak = max(float(np.max(np.abs(y * (common / l)))) for y, l in zip(ys, louds))
    capped = g * peak > PEAK_CAP * synth_peak
    if capped:
        g = PEAK_CAP * synth_peak / peak
    bank[name] = {'g': round(g, 4), 'j': JIT.get(name, 0.05), 'd': data}
    print(f'{name:11s} x{len(data)}  gain {g:6.3f}{"  (peak-capped)" if capped else ""}')

with open(OUT, 'w', newline='\n') as f:
    f.write('// SLAGHOUSE sample bank - generated by dev/sfxgen/build.py from AudioGen (facebook/audiogen-medium) output.\n')
    f.write('// Optional: if this file is missing the game falls back to its procedural sounds. Do not edit by hand.\n')
    f.write('window.SLAG_SFX = {\n')
    for i, (name, s) in enumerate(bank.items()):
        f.write(f"  {name}: {{ g: {s['g']}, j: {s['j']}, d: [{', '.join(repr(d) for d in s['d'])}] }}{',' if i < len(bank) - 1 else ''}\n")
    f.write('};\n')
# takes/ = exactly the takes the bank uses: copy new or changed picks from out/proc/, drop what no sound uses any more
added, dropped = 0, 0
for name, ids in used.items():
    os.makedirs(os.path.join(TAKES, name), exist_ok=True)
    for cid, h in zip(ids, src[name]['wav']):
        flac, wav = os.path.join(TAKES, name, f'{cid}.flac'), os.path.join(PROC, name, f'{cid}.wav')
        if os.path.exists(wav) and (not os.path.exists(flac) or samples_hash(flac) != h):
            sf.write(flac, sf.read(wav, dtype='int16')[0], 48000, format='FLAC', subtype='PCM_16')
            added += 1
for name in sorted(os.listdir(TAKES)) if os.path.isdir(TAKES) else []:
    keep = {f'{cid}.flac' for cid in used.get(name, [])}
    for f in os.listdir(os.path.join(TAKES, name)):
        if f not in keep:
            os.remove(os.path.join(TAKES, name, f)); dropped += 1
    if not os.listdir(os.path.join(TAKES, name)):
        os.rmdir(os.path.join(TAKES, name))
if added or dropped:
    print(f'takes/: {added} added, {dropped} dropped')
json.dump(used, open(os.path.join(HERE, 'out', 'picks_used.json'), 'w'), indent=1)       # for review.html
json.dump({k: v.get('keep', 1) for k, v in SOUNDS.items()}, open(os.path.join(HERE, 'out', 'keep.json'), 'w'))
json.dump(src, open(SRC_JSON, 'w', newline='\n'), indent=1)
print(f'wrote {OUT}: {len(bank)} sounds ({reused} reused, {len(bank) - reused} encoded), {total / 1024:.0f} KB opus, {os.path.getsize(OUT) / 1024:.0f} KB file')
if skipped:
    print(f'NOTE: {len(skipped)} sound(s) in sounds.py are not in the bank, so the game plays their synth versions: {" ".join(skipped)}')
