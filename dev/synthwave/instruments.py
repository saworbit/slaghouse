"""Synth patches and drum machine. Notes are (midi, start_s, dur_s, vel); every renderer returns (2, n) stereo.

Randomness (oscillator phases, noise) is seeded per note index, so rendering the same part twice gives the
same samples, which the loop folding relies on.
"""
import numpy as np
from dsp import SR, mtof, saw, pulse, sine, svf, lp24, hp, lp, bp, adsr, decay_env, pan, softclip

# ------------------------------------------------------------------------------------------------ patches
PATCHES = {
    # wide detuned supersaw pad, slow filter bloom
    'pad': dict(osc='saw', voices=7, detune=24, width=0.95, sub=0.0, cut=1500, env_oct=1.4, kt=0.4, res=0.8,
                fa=0.9, fd=2.5, fs=0.55, a=0.45, d=2.0, s=0.85, r=1.1, gain=0.11),
    # dark, slow, cinematic pad (title / lose)
    'darkpad': dict(osc='saw', voices=7, detune=18, width=0.95, sub=0.25, cut=800, env_oct=1.2, kt=0.3, res=0.9,
                    fa=1.6, fd=3.0, fs=0.6, a=0.9, d=3.0, s=0.9, r=2.0, gain=0.12),
    # plucky arp: pulse + saw, snappy filter
    'arp': dict(osc='pulse', pw=0.3, voices=2, detune=7, width=0.5, sub=0.0, cut=800, env_oct=3.6, kt=0.6, res=1.6,
                fa=0.001, fd=0.16, fs=0.0, a=0.001, d=0.22, s=0.0, r=0.12, gain=0.09),
    # synth-brass stab (boss / stage2 hits)
    'stab': dict(osc='saw', voices=5, detune=14, width=0.8, sub=0.3, cut=900, env_oct=3.0, kt=0.5, res=1.0,
                 fa=0.004, fd=0.28, fs=0.25, a=0.004, d=0.4, s=0.45, r=0.18, gain=0.10),
    # bell-ish glass lead for the title (sine + pulse octave)
    'glass': dict(osc='pulse', pw=0.12, voices=2, detune=5, width=0.6, sub=0.0, cut=1800, env_oct=2.0, kt=0.8, res=0.8,
                  fa=0.001, fd=0.6, fs=0.2, a=0.002, d=1.2, s=0.15, r=0.9, gain=0.08),
}
MONO = {
    # driving sidechained bass: two saws + sine sub, plucky 24 dB filter
    'bass': dict(osc='saw', voices=2, detune=6, sub=0.55, cut=150, env_oct=3.0, kt=0.5, res=1.1, fd=0.13,
                 a=0.0015, d=0.25, s=0.65, r=0.035, glide=0.0, drive=1.4, gain=0.30),
    # darksynth bass: hotter filter, heavy drive
    'growl': dict(osc='saw', voices=3, detune=10, sub=0.6, cut=190, env_oct=3.4, kt=0.5, res=1.4, fd=0.16,
                  a=0.0015, d=0.3, s=0.7, r=0.03, glide=0.0, drive=3.2, gain=0.24),
    # soaring saw lead with glide, delayed vibrato
    'lead': dict(osc='saw', voices=3, detune=11, sub=0.28, cut=2400, env_oct=1.2, kt=0.6, res=1.2, fd=0.45,
                 a=0.008, d=0.6, s=0.85, r=0.22, glide=0.055, vib=0.16, vib_rate=5.3, drive=1.2, gain=0.12),
    # hard square lead (boss)
    'sqlead': dict(osc='pulse', pw=0.4, voices=2, detune=9, sub=0.35, cut=2600, env_oct=1.6, kt=0.6, res=1.1, fd=0.3,
                   a=0.004, d=0.5, s=0.8, r=0.15, glide=0.035, vib=0.14, vib_rate=5.8, drive=1.8, gain=0.11),
}


def _osc(P, f, rng):
    if P['osc'] == 'saw':
        return saw(f, rng.random())
    return pulse(f, P.get('pw', 0.5), rng.random())


def poly(notes, P, total, seed=0):
    """Polyphonic part: every note its own detuned voices, filter envelope and amp envelope."""
    out = np.zeros((2, total))
    V = P['voices']
    for idx, (m, st, du, ve) in enumerate(notes):
        rng = np.random.default_rng(seed * 100003 + idx)
        env = adsr(du * SR, P['a'], P['d'], P['s'], P['r'])
        i0 = int(round(st * SR))
        n = min(len(env), total - i0)
        if n <= 0:
            continue
        env = env[:n]
        f0 = float(mtof(m))
        L, R = np.zeros(n), np.zeros(n)
        for v in range(V):
            x = (v / (V - 1) * 2 - 1) if V > 1 else 0.0
            f = np.full(n, f0 * 2 ** (x * P['detune'] / 1200))
            s = _osc(P, f, rng) * (1.0 if v == V // 2 else 0.8)
            a = (x * P['width'] + 1) * np.pi / 4
            L += s * np.cos(a)
            R += s * np.sin(a)
        if P['sub']:
            sb = sine(np.full(n, f0 / 2), 0.0) * P['sub'] * 1.4
            L += sb
            R += sb
        t = np.arange(n) / SR
        fenv = np.where(t < P['fa'], t / P['fa'], P['fs'] + (1 - P['fs']) * np.exp(-(t - P['fa']) * 6.9 / P['fd']))
        cut = P['cut'] * (f0 / 261.6) ** P['kt'] * 2 ** (P['env_oct'] * fenv * (0.6 + 0.4 * ve))
        g = env * ve * P['gain'] / np.sqrt(V)
        out[0, i0:i0 + n] += lp24(L, cut, P['res']) * g
        out[1, i0:i0 + n] += lp24(R, cut, P['res']) * g
    return out


def mono(notes, P, total, seed=0):
    """Monophonic part with glide between overlapping/adjacent notes and per-note envelopes."""
    notes = sorted(notes, key=lambda n: n[1])
    freq = np.full(total, float(mtof(notes[0][0])) if notes else 100.0)
    amp = np.zeros(total)
    fenv = np.zeros(total)
    vib = np.zeros(total)
    prev_f, prev_end, last_hi = None, -1.0, 0
    for k, (m, st, du, ve) in enumerate(notes):
        i0 = int(round(st * SR))
        if i0 >= total:
            continue
        nxt = int(round(notes[k + 1][1] * SR)) if k + 1 < len(notes) else total
        env = adsr(du * SR, P['a'], P['d'], P['s'], P['r'])
        n = min(len(env), total - i0)
        seg_end = min(total, max(nxt, i0 + n))
        f0 = float(mtof(m))
        t = np.arange(seg_end - i0) / SR
        legato = prev_f is not None and st <= prev_end + 0.02
        if legato and P['glide'] > 0:
            freq[i0:seg_end] = f0 * (prev_f / f0) ** np.exp(-t / P['glide'])
        else:
            freq[i0:seg_end] = f0
        if legato and P['glide'] > 0:                 # tied: no re-attack, envelope carries on at sustain
            env = np.concatenate([np.full(int(du * SR), P['s']), env[int(du * SR):]])[:n]
        amp[i0:last_hi] = 0                           # a new note cuts the previous one's release
        amp[i0:i0 + n] = env[:n] * ve
        last_hi = max(last_hi, i0 + n)
        fe = np.exp(-t[:seg_end - i0] * 6.9 / P['fd'])
        fenv[i0:seg_end] = fe if not legato else np.maximum(fe * 0.4, 0)
        if P.get('vib'):
            vib[i0:seg_end] = np.clip((t - 0.28) / 0.35, 0, 1) * P['vib']
        prev_f, prev_end = f0, st + du
    if P.get('vib'):
        freq = freq * 2 ** (vib * np.sin(2 * np.pi * P['vib_rate'] * np.arange(total) / SR) / 12)
    rng = np.random.default_rng(seed)
    V = P['voices']
    x = np.zeros(total)
    for v in range(V):
        d = ((v / (V - 1) * 2 - 1) if V > 1 else 0) * P['detune']
        x += _osc(P, freq * 2 ** (d / 1200), rng)
    x /= np.sqrt(V)
    if P['sub']:
        x += sine(freq / 2, 0.0) * P['sub']
    cut = P['cut'] * (freq / 261.6) ** P['kt'] * 2 ** (P['env_oct'] * fenv)
    y = lp24(x, cut, P['res'])
    if P.get('drive', 1) > 1:
        y = np.tanh(y * P['drive']) / np.tanh(P['drive'])
    y = y * amp * P['gain']
    return np.stack([y, y])


# ------------------------------------------------------------------------------------------------ drums
def _noise(n, rng):
    return rng.standard_normal(n)


def kick(rng, punch=1.0):
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    f = 44 + 120 * np.exp(-t / 0.028) * punch + 30 * np.exp(-t / 0.004)
    body = sine(f, 0.25) * np.exp(-t / 0.30) * np.minimum(1, t / 0.0008)   # starts on the peak: soften the edge
    click = hp(_noise(n, rng), 3000) * np.exp(-t / 0.003) * 0.35
    return np.tanh((body + click) * 1.6) * 0.9


def snare(rng):
    n = int(0.4 * SR)
    t = np.arange(n) / SR
    tone = sine(185 - 25 * (1 - np.exp(-t / 0.03)), 0.0) * np.exp(-t / 0.07) * 0.6
    nz = _noise(n, rng)
    body = bp(nz, 1900, 0.6) * np.exp(-t / 0.13) * 1.6 + hp(nz, 4500) * np.exp(-t / 0.07) * 1.0
    return (tone + body) * 0.8


def clap(rng):
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    env = np.zeros(n)
    for k, o in enumerate([0, 0.011, 0.022, 0.034]):
        i = int(o * SR)
        env[i:] += np.exp(-(t[:n - i]) / (0.008 if k < 3 else 0.14))
    return bp(_noise(n, rng), 1300, 0.8) * env * 0.9


def hat(rng, open_=False):
    n = int((0.4 if open_ else 0.08) * SR)
    t = np.arange(n) / SR
    metal = sum(np.sign(np.sin(2 * np.pi * f * t + rng.random() * 6.28)) for f in (204, 298, 366, 522, 540, 800))
    x = hp(_noise(n, rng) * 0.7 + metal * 0.12, 7000)
    return x * np.exp(-t / (0.16 if open_ else 0.022)) * 0.5


def crash(rng):
    n = int(2.6 * SR)
    t = np.arange(n) / SR
    metal = sum(np.sign(np.sin(2 * np.pi * f * t + rng.random() * 6.28)) for f in (311, 427, 561, 693, 811, 1013))
    x = hp(_noise(n, rng) * 0.8 + metal * 0.08, 4200)
    return x * np.exp(-t / 0.75) * 0.45


def tom(rng, f0=140):
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    body = sine(f0 * (0.65 + 0.35 * np.exp(-t / 0.06)), 0.0) * np.exp(-t / 0.2)
    return np.tanh(body * 1.3 + bp(_noise(n, rng), 900, 0.7) * np.exp(-t / 0.03) * 0.3) * 0.8


def riser(rng, dur):
    n = int(dur * SR)
    t = np.arange(n) / n
    x = _noise(n, rng)
    from dsp import svf as _svf
    y = _svf(x, 300 * 2 ** (6 * t ** 1.5), 2.0, 1)
    return y * t ** 2 * 0.35


def boom(rng):
    n = int(2.2 * SR)
    t = np.arange(n) / SR
    body = sine(28 + 70 * np.exp(-t / 0.12), 0.0) * np.exp(-t / 0.7)
    return np.tanh(body * 1.8 + lp(_noise(n, rng), 400) * np.exp(-t / 0.5) * 0.5) * 0.9
