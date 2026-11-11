"""Render the score to 48 kHz stereo WAVs.

    .venv/Scripts/python render.py [names]      -> out/<name>.wav

Loops are rendered once with a few seconds of tail (reverb, delay, releases) and the tail is folded back onto
the start, so the file plays exactly as if it had been looping forever: no seam to hide. Time-based effects
(sidechain pump, compressor, chorus LFO) are computed periodically over the loop for the same reason.
"""
import os, sys, zlib, time
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', 'audiolib'))   # loud.py, shared with dev/sfxgen
import soundfile as sf
from dsp import (SR, reverb_ir, gated_ir, convolve, pingpong, chorus, compress, softclip, fold, hp, lp)
import instruments as I
from score import TRACKS

OUT = os.path.join(HERE, 'out')
TAIL = 4.0
DRUM_GAIN = dict(k=0.95, s=0.55, c=0.35, h=0.22, o=0.2, t=0.45, T=0.5, C=0.28, rise=0.5, boom=0.9)


def seed(s):
    return zlib.crc32(s.encode()) & 0xffff


# Mix targets: gated K-weighted loudness of each stem relative to the kick (dB). Track.master['bal'] overrides.
BALANCE = dict(drum_s=-1.0, snare_room=-6.0, bass=-1.5, lead=-1.0, lead2=-9.0, pad=-6.5, stab=-4.0, arp=-8.5,
               drum_h=-10.5, drum_perc=-10.0, drum_fx=-11.0, drum_rev=-13.0, hall=-9.0, delay=-14.0)


def gated_loud(x):
    """K-weighted loudness (power) over the 400 ms blocks where the stem actually plays (BS.1770-style gate)."""
    from loud import kweight
    y = kweight(x.mean(0)) if x.ndim == 2 else kweight(x)
    B = int(0.4 * SR)
    nb = len(y) // B
    if nb == 0:
        return float(np.mean(y ** 2))
    p = np.mean(y[:nb * B].reshape(nb, B) ** 2, axis=1)
    keep = p > max(p.max() * 10 ** (-30 / 10), 1e-14)
    return float(np.mean(p[keep])) if keep.any() else 1e-14


def sc_curve(kicks, n, L, depth, att=0.005, rel=0.15):
    """Sidechain gain: duck to (1 - depth) on every kick, recover over ~rel. Periodic in L when L is given."""
    if depth <= 0 or not len(kicks):
        return np.ones(n)
    k = np.array(sorted(kicks), dtype=np.int64)
    if L:
        k = np.concatenate([k - L, k])
    i = np.arange(n)
    j = np.searchsorted(k, i, side='right') - 1
    dt = np.where(j >= 0, (i - k[np.maximum(j, 0)]) / SR, 10.0)
    duck = depth * np.minimum(1, dt / att) * np.exp(-np.maximum(0, dt - att) / rel)
    return 1 - duck


def tapestop(y, t0, dur):
    i0, n = int(t0 * SR), int(dur * SR)
    rate = (1 - np.arange(n) / n) ** 1.6
    pos = i0 + np.cumsum(rate)
    seg = np.stack([np.interp(pos, np.arange(y.shape[1]), y[c]) for c in range(2)])
    seg *= np.minimum(1, (n - np.arange(n)) / (0.05 * SR))
    return np.concatenate([y[:, :i0], seg, np.zeros((2, int(0.3 * SR)))], axis=1)


def render(t, verbose=True):
    t0 = time.time()
    st = t.step
    L = int(round(t.bars * 16 * st * SR))
    total = L + int((TAIL if t.loop else t.tail) * SR)
    S = lambda steps: steps * st
    loopL = L if t.loop else None

    # ---- instruments
    buses, rev, dly = {}, np.zeros((2, total)), np.zeros(total)
    for part, notes in t.parts.items():
        kind, pname = t.patch[part]
        mx = t.mix[part]
        ns = [(m, S(s), S(l), v) for m, s, l, v in notes]
        if kind == 'poly':
            y = I.poly(ns, I.PATCHES[pname], total, seed=seed(t.name + part))
        else:
            y = I.mono(ns, I.MONO[pname], total, seed=seed(t.name + part))
        y = y * mx['gain']
        if mx['chorus']:
            y = chorus(y, loop_len=(L / SR) if t.loop else None, mix=mx['chorus'])
        buses[part] = y
        rev += y * mx['rev']
        dly += y.mean(0) * mx['dly']
    dwet = pingpong(dly, S(t.master['dly']), fb=0.42)[:, :total]
    rev += dwet * 0.35

    # ---- drums
    dr = {k: np.zeros((2, total)) for k in ('k', 's', 'h', 'perc', 'fx')}
    kicks = []
    for idx, ev in enumerate(t.drums):
        kind, step, vel = ev[0], ev[1], ev[2]
        rng = np.random.default_rng(seed(t.name) * 1000 + idx)
        i0 = int(round(S(step) * SR))
        if kind == 'k':
            x, bus = I.kick(rng), 'k'
            kicks.append(i0)
        elif kind == 's':
            x, bus = I.snare(rng), 's'
        elif kind == 'c':
            x, bus = I.clap(rng), 's'
        elif kind in 'ho':
            x, bus = I.hat(rng, kind == 'o'), 'h'
        elif kind in 'tT':
            x, bus = I.tom(rng, 190 if kind == 't' else 120), 'perc'
        elif kind == 'C':
            x, bus = I.crash(rng), 'perc'
        elif kind == 'rise':
            x, bus = I.riser(rng, S(ev[3] if len(ev) > 3 else 16)), 'fx'
        elif kind == 'boom':
            x, bus = I.boom(rng), 'fx'
        else:
            raise ValueError(kind)
        x = x * vel * DRUM_GAIN[kind]
        n = min(len(x), total - i0)
        if n <= 0:
            continue
        p = {'h': 0.25, 't': -0.3, 'T': 0.3, 'C': -0.2}.get(kind, 0.0)
        a = (p + 1) * np.pi / 4
        dr[bus][0, i0:i0 + n] += x[:n] * np.cos(a) * 1.414
        dr[bus][1, i0:i0 + n] += x[:n] * np.sin(a) * 1.414
    snare_room = convolve(dr['s'], gated_ir())[:, :total] * 0.55
    plate = reverb_ir(1.2, predelay=0.012, seed=5, damp=0.45)
    drum_rev = convolve(dr['s'] * 0.18 + dr['perc'] * 0.25 + dr['fx'] * 0.4, plate)[:, :total]
    hall = convolve(rev, reverb_ir(t.master['rev_rt'], seed=11))[:, :total] * 0.55

    # ---- fold the tails, then the periodic sidechain
    stems = dict(buses)
    stems.update({'drum_' + k: v for k, v in dr.items()})
    stems.update(snare_room=snare_room, drum_rev=drum_rev, hall=hall, delay=dwet * 0.5)
    n = L if t.loop else total
    if t.loop:
        stems = {k: fold(v, L) for k, v in stems.items()}
    bal = dict(BALANCE, **t.master.get('bal', {}))
    ref = gated_loud(stems['drum_k'])
    for k in stems:
        if k in bal and np.any(stems[k]):
            g = np.sqrt(ref * 10 ** (bal[k] / 10) / gated_loud(stems[k]))
            stems[k] = stems[k] * float(np.clip(g, 0.03, 30))
    mix = np.zeros((2, n))
    for k, v in stems.items():
        depth = t.mix[k]['sc'] if k in t.mix else {'hall': 0.35, 'delay': 0.25}.get(k, 0.0)
        mix += v * sc_curve(kicks, n, loopL, depth)

    # ---- master
    mix_pre = mix
    mix = np.stack([hp(mix[0], 28), hp(mix[1], 28)])
    mix = mix + 0.3 * np.stack([hp(mix[0], 6000, 1), hp(mix[1], 6000, 1)])    # a little air
    mix = compress(mix, thr=-16, ratio=2.5, att=0.012, rel=0.18, circular=t.loop)
    ref = np.percentile(np.abs(mix), 99.9)
    mix = softclip(mix * (0.8 / (ref + 1e-9)), 0.97)
    if 'tapestop' in t.master:
        a, d = t.master['tapestop']
        mix = tapestop(mix, a * 16 * st, d)
    if not t.loop:
        f = int(0.35 * SR)
        mix[:, -f:] *= np.linspace(1, 0, f) ** 2
    if verbose:                                   # K-weighted level of each stem relative to the whole mix (LU)
        from loud import kweight
        km = np.sqrt(np.mean(kweight(mix_pre.mean(0)) ** 2)) + 1e-12
        rms = {k: float(np.sqrt(np.mean(kweight(v.mean(0)) ** 2))) / km for k, v in stems.items()}
        top = ' '.join(f'{k}={20 * np.log10(r + 1e-9):+.0f}' for k, r in sorted(rms.items(), key=lambda kv: -kv[1]))
        print(f'{t.name:7s} {t.bpm} bpm {mix.shape[1] / SR:6.2f}s  peak {np.max(np.abs(mix)):.2f}  '
              f'rms {20 * np.log10(np.sqrt(np.mean(mix ** 2))):.1f} dB  ({time.time() - t0:.1f}s)\n          stems LU vs mix: {top}')
    return mix.astype(np.float32)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name in (sys.argv[1:] or TRACKS):
        y = render(TRACKS[name])
        sf.write(os.path.join(OUT, f'{name}.wav'), y.T, SR, subtype='FLOAT')
