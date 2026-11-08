"""Pack out/<name>.wav into ../../music_bank.js (base64 stereo Ogg Opus).

    ../sfxgen/.venv/Scripts/python build.py

Every track is gain-matched to the same K-weighted RMS (TARGET, peaks kept under PEAK); the game's music bus
(Music.LEVEL) sets the level against the SFX. Loops are encoded with PAD samples of their own wrap on both
sides so the codec never sees an edge at the loop point; the game plays [ls, ls + len].
"""
import os, sys, base64, subprocess, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', 'sfxgen'))
import numpy as np, soundfile as sf
from score import TRACKS
from loud import loudness

TARGET = 0.16
PEAK = 0.97
BITRATE = '64k'
PAD = 4800
OUT = os.path.normpath(os.path.join(HERE, '..', '..', 'music_bank.js'))


def opus(y):
    with tempfile.TemporaryDirectory() as td:
        src, dst = os.path.join(td, 'a.wav'), os.path.join(td, 'a.ogg')
        sf.write(src, y, 48000, subtype='PCM_16')
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', src, '-c:a', 'libopus', '-b:a', BITRATE,
                        '-application', 'audio', '-map_metadata', '-1', dst], check=True)
        return open(dst, 'rb').read()


bank, total = {}, 0
for name, t in TRACKS.items():
    y, sr = sf.read(os.path.join(HERE, 'out', f'{name}.wav'), dtype='float32')     # (n, 2)
    assert sr == 48000
    g = min(TARGET / loudness(y.mean(1), 48000, loop=True), PEAK / float(np.max(np.abs(y))))
    y = y * g
    n = len(y)
    if t.loop:
        y = np.concatenate([y[-PAD:], y, y[:PAD]])
    b = opus(y.astype(np.float32))
    total += len(b)
    bank[name] = dict(loop=t.loop, bpm=t.bpm, ls=PAD / 48000 if t.loop else 0, len=n / 48000, title=t.title,
                      d=base64.b64encode(b).decode())
    print(f'{name:7s} {n / 48000:6.2f}s  gain {g:5.2f}  {len(b) / 1024:5.0f} KB')

with open(OUT, 'w', newline='\n') as f:
    f.write('// SLAGHOUSE soundtrack - original synthwave rendered by dev/synthwave (score.py -> render.py -> build.py).\n')
    f.write('// Optional: without this file the game uses its procedural drum + bass loop. Do not edit by hand.\n')
    f.write('window.SLAG_MUSIC = {\n')
    for i, (name, s) in enumerate(bank.items()):
        f.write(f"  {name}: {{ loop: {'true' if s['loop'] else 'false'}, bpm: {s['bpm']}, ls: {s['ls']}, len: {s['len']}, "
                f"title: {s['title']!r}, d: {s['d']!r} }}{',' if i < len(bank) - 1 else ''}\n")
    f.write('};\n')
print(f'wrote {OUT}: {len(bank)} tracks, {total / 1024:.0f} KB opus, {os.path.getsize(OUT) / 1024:.0f} KB file')
