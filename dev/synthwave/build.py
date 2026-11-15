"""Pack out/<name>.wav into ../../music_bank.js (base64 stereo Ogg Opus) and ../../music_bank_aac.js (the same tracks as
AAC in MP4, which the game loads only when the browser can't decode Ogg Opus), then check both banks.

    .venv/Scripts/python build.py                    build both, then check
    .venv/Scripts/python build.py --aac              build and check only the AAC bank, leaving music_bank.js alone
    .venv/Scripts/python build.py --check [bank.js]  only check an existing bank (default ../../music_bank.js)

Every track is gain-matched to the same K-weighted RMS (TARGET, peaks kept under PEAK); the game's music bus
(Music.LEVEL) sets the level against the SFX. Loops are encoded with PAD samples of their own wrap on both
sides so the codec never sees an edge at the loop point; the game plays [ls, ls + len]. Encodes are bit-exact
(no random Ogg serial), so the same WAVs give the same bytes.

The check decodes every track back with ffmpeg and exits non-zero, naming the track, when:
- a track the game asks for (WAVE_MUSIC in slaghouse.html, plus title, win and lose) is missing;
- a track's K-weighted RMS is more than LOUD_TOL dB from TARGET (LOUD_TOL_AAC for the AAC bank);
- a loop's seam is off: the SEAM_W samples after ls + len don't repeat the ones after ls (the pad there is a copy
  of the loop start, so this catches a len, ls or encoder offset of about 1 ms or more).
"""
import os, re, sys, base64, subprocess, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', 'audiolib'))   # loud.py, shared with dev/sfxgen
import numpy as np, soundfile as sf
from loud import loudness

TARGET = 0.16
PEAK = 0.97
BITRATE = '64k'
AAC_RATE = '64k'
PAD = 4800
OUT = os.path.normpath(os.path.join(HERE, '..', '..', 'music_bank.js'))
OUT_AAC = os.path.normpath(os.path.join(HERE, '..', '..', 'music_bank_aac.js'))
GAME = os.path.normpath(os.path.join(HERE, '..', '..', 'slaghouse.html'))
LOUD_TOL = 0.5        # dB either side of TARGET
LOUD_TOL_AAC = 1.5    # AAC at 64k drops some top end, and a track already held down by PEAK can't be lifted back
SEAM_W = 2400         # 50 ms compared across the loop point
SEAM_MAX = 0.65       # relative RMS difference; a good seam measures 0.2-0.5 after Opus, a 1 ms slip 0.8 and up


def opus(y):
    with tempfile.TemporaryDirectory() as td:
        src, dst = os.path.join(td, 'a.wav'), os.path.join(td, 'a.ogg')
        sf.write(src, y, 48000, subtype='PCM_16')
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', src, '-c:a', 'libopus', '-b:a', BITRATE,
                        '-application', 'audio', '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact', dst],
                       check=True)
        return open(dst, 'rb').read()


def aac(y):
    """AAC-LC in MP4, bit-exact. Its priming offset (about 1024 samples) lands inside a loop's PAD, which repeats the
    loop's own wrap, so [ls, ls + len] still loops seamlessly."""
    with tempfile.TemporaryDirectory() as td:
        src, dst = os.path.join(td, 'a.wav'), os.path.join(td, 'a.m4a')
        sf.write(src, y, 48000, subtype='PCM_16')
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', src, '-c:a', 'aac', '-b:a', AAC_RATE,
                        '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact', '-f', 'mp4', dst], check=True)
        return open(dst, 'rb').read()


def decode(b64):
    """base64 Ogg Opus or AAC in MP4 -> float64 stereo at 48 kHz, as the browser would decode it."""
    raw = base64.b64decode(b64)
    with tempfile.TemporaryDirectory() as td:
        src = os.path.join(td, 'a.ogg' if raw[:4] == b'OggS' else 'a.m4a')
        with open(src, 'wb') as f:
            f.write(raw)
        raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', src, '-f', 'f32le', '-ac', '2', '-ar', '48000', '-'],
                             check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)


def read_bank(path):
    pat = re.compile(r"^\s+(\w+): \{ loop: (true|false), bpm: ([\d.]+), ls: ([\d.]+), len: ([\d.]+), "
                     r"title: (['\"])(.*?)\6, d: '([A-Za-z0-9+/=]+)' \}", re.M)
    with open(path, encoding='utf-8') as f:
        txt = f.read()
    return {m.group(1): dict(loop=m.group(2) == 'true', ls=float(m.group(4)), len=float(m.group(5)), d=m.group(8))
            for m in pat.finditer(txt)}


def wanted():
    """Every track name the game asks for."""
    with open(GAME, encoding='utf-8') as f:
        m = re.search(r"const WAVE_MUSIC = \[([^\]]*)\]", f.read())
    if not m:
        sys.exit(f'check: no WAVE_MUSIC in {GAME}')
    return set(re.findall(r"'(\w+)'", m.group(1))) | {'title', 'win', 'lose'}


def check(path=OUT, tol=LOUD_TOL):
    bank, bad = read_bank(path), []
    bad += [f'{n}: the game asks for it, but the bank has no such track' for n in sorted(wanted() - set(bank))]
    for name, t in bank.items():
        z = decode(t['d']).mean(1)
        s, n = round(t['ls'] * 48000), round(t['len'] * 48000)
        db = 20 * np.log10(max(1e-9, loudness(z[s:s + n], 48000, loop=True)) / TARGET)
        line = f'check {name:7s} level {db:+.2f} dB'
        if abs(db) > tol:
            bad.append(f'{name}: level is {db:+.2f} dB from TARGET (limit {tol} dB)')
        if t['loop']:
            if s + n + SEAM_W > len(z):
                bad.append(f'{name}: ls + len runs past the end of the encoded audio')
            else:
                a, b = z[s:s + SEAM_W], z[s + n:s + n + SEAM_W]
                r = float(np.sqrt(np.mean((b - a) ** 2)) / max(1e-9, np.sqrt(np.mean(a ** 2))))
                line += f'  seam {r:.2f}'
                if r > SEAM_MAX:
                    bad.append(f'{name}: loop seam is off (after ls + len the audio differs from ls by {r:.2f}, limit {SEAM_MAX})')
        print(line)
    for b in bad:
        print('FAIL  ' + b)
    if bad:
        sys.exit(1)
    print(f'check: {len(bank)} tracks ok')


def write_bank(path, var, bank, note):
    with open(path, 'w', newline='\n') as f:
        f.write('// SLAGHOUSE soundtrack - original synthwave rendered by dev/synthwave (score.py -> render.py -> build.py).\n')
        f.write(f'// {note} Do not edit by hand.\n')
        f.write(f'window.{var} = {{\n')
        for i, (name, s) in enumerate(bank.items()):
            f.write(f"  {name}: {{ loop: {'true' if s['loop'] else 'false'}, bpm: {s['bpm']}, ls: {s['ls']}, len: {s['len']}, "
                    f"title: {s['title']!r}, d: {s['d']!r} }}{',' if i < len(bank) - 1 else ''}\n")
        f.write('};\n')


def build(formats=('opus', 'aac')):
    from score import TRACKS
    banks = {f: {} for f in formats}
    total = {f: 0 for f in formats}
    for name, t in TRACKS.items():
        y, sr = sf.read(os.path.join(HERE, 'out', f'{name}.wav'), dtype='float32')     # (n, 2)
        assert sr == 48000
        g = min(TARGET / loudness(y.mean(1), 48000, loop=True), PEAK / float(np.max(np.abs(y))))
        y = y * g
        n = len(y)
        if t.loop:
            y = np.concatenate([y[-PAD:], y, y[:PAD]])
        for f in formats:
            b = (opus if f == 'opus' else aac)(y.astype(np.float32))
            if f == 'aac':                                                # AAC drops some top end: level it once more to TARGET
                s0 = PAD if t.loop else 0
                z = decode(base64.b64encode(b).decode()).mean(1)[s0:s0 + n]
                k = min(TARGET / max(1e-9, loudness(z, 48000, loop=True)), PEAK / float(np.max(np.abs(y))))
                if abs(20 * np.log10(k)) > 0.05:
                    b = aac((y * k).astype(np.float32))
            total[f] += len(b)
            banks[f][name] = dict(loop=t.loop, bpm=t.bpm, ls=PAD / 48000 if t.loop else 0, len=n / 48000, title=t.title,
                                  d=base64.b64encode(b).decode())
        print(f'{name:7s} {n / 48000:6.2f}s  gain {g:5.2f}')
    if 'opus' in formats:
        write_bank(OUT, 'SLAG_MUSIC', banks['opus'], 'Optional: without this file the game uses its procedural drum + bass loop.')
        print(f'wrote {OUT}: {len(banks["opus"])} tracks, {total["opus"] / 1024:.0f} KB opus, {os.path.getsize(OUT) / 1024:.0f} KB file')
    if 'aac' in formats:
        write_bank(OUT_AAC, 'SLAG_MUSIC_AAC', banks['aac'], 'The same tracks as AAC, loaded only where Ogg Opus will not decode.')
        print(f'wrote {OUT_AAC}: {len(banks["aac"])} tracks, {total["aac"] / 1024:.0f} KB aac, {os.path.getsize(OUT_AAC) / 1024:.0f} KB file')


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--check':
        check(os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 else OUT)
    elif len(sys.argv) > 1 and sys.argv[1] == '--aac':
        build(('aac',))
        check(OUT_AAC, LOUD_TOL_AAC)
    else:
        build()
        check()
        check(OUT_AAC, LOUD_TOL_AAC)
