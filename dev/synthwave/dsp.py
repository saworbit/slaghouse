"""DSP building blocks for the SLAGHOUSE synthwave renderer (48 kHz, numba for the per-sample loops)."""
import numpy as np
from numba import njit
from scipy import signal

SR = 48000


def mtof(m):
    return 440.0 * 2.0 ** ((np.asarray(m, dtype=np.float64) - 69.0) / 12.0)


# ---------------------------------------------------------------- oscillators (polyBLEP, band-limited)
@njit(cache=True, fastmath=True)
def _blep(t, dt):
    if t < dt:
        t /= dt
        return t + t - t * t - 1.0
    if t > 1.0 - dt:
        t = (t - 1.0) / dt
        return t * t + t + t + 1.0
    return 0.0


@njit(cache=True, fastmath=True)
def saw(freq, phase):
    n = freq.shape[0]
    out = np.empty(n)
    p = phase
    for i in range(n):
        dt = freq[i] / SR
        p += dt
        if p >= 1.0:
            p -= 1.0
        out[i] = 2.0 * p - 1.0 - _blep(p, dt)
    return out


@njit(cache=True, fastmath=True)
def pulse(freq, width, phase):
    n = freq.shape[0]
    out = np.empty(n)
    p = phase
    for i in range(n):
        dt = freq[i] / SR
        p += dt
        if p >= 1.0:
            p -= 1.0
        v = 1.0 if p < width else -1.0
        q = p + 1.0 - width
        if q >= 1.0:
            q -= 1.0
        out[i] = v + _blep(p, dt) - _blep(q, dt) - (2.0 * width - 1.0)
    return out


@njit(cache=True, fastmath=True)
def sine(freq, phase):
    n = freq.shape[0]
    out = np.empty(n)
    p = phase
    for i in range(n):
        p += freq[i] / SR
        if p >= 1.0:
            p -= 1.0
        out[i] = np.sin(2.0 * np.pi * p)
    return out


# ---------------------------------------------------------------- filters
@njit(cache=True, fastmath=True)
def svf(x, cutoff, q, mode):
    """TPT state-variable filter with a per-sample cutoff. mode 0 = low-pass, 1 = band-pass, 2 = high-pass."""
    n = x.shape[0]
    y = np.empty(n)
    ic1 = 0.0
    ic2 = 0.0
    k = 1.0 / q
    for i in range(n):
        fc = cutoff[i]
        if fc < 20.0:
            fc = 20.0
        elif fc > 0.45 * SR:
            fc = 0.45 * SR
        g = np.tan(np.pi * fc / SR)
        a1 = 1.0 / (1.0 + g * (g + k))
        a2 = g * a1
        a3 = g * a2
        v3 = x[i] - ic2
        v1 = a1 * ic1 + a2 * v3
        v2 = ic2 + a2 * ic1 + a3 * v3
        ic1 = 2.0 * v1 - ic1
        ic2 = 2.0 * v2 - ic2
        if mode == 0:
            y[i] = v2
        elif mode == 1:
            y[i] = v1
        else:
            y[i] = x[i] - k * v1 - v2
    return y


def lp24(x, cutoff, res=0.9):
    """24 dB/oct low-pass: two SVFs, the resonance on the second."""
    return svf(svf(x, cutoff, 0.54, 0), cutoff, res, 0)


def hp(x, fc, order=2):
    return signal.sosfilt(signal.butter(order, fc, 'hp', fs=SR, output='sos'), x)


def lp(x, fc, order=2):
    return signal.sosfilt(signal.butter(order, fc, 'lp', fs=SR, output='sos'), x)


def bp(x, f0, q=1.0):
    lo, hi = f0 / (1 + 0.5 / q), f0 * (1 + 0.5 / q)
    return signal.sosfilt(signal.butter(2, [lo, min(hi, 0.45 * SR)], 'bp', fs=SR, output='sos'), x)


def tilt(x, db=-3.0, f0=1500.0):
    """Gentle high-shelf tilt (negative = darker)."""
    g = 10 ** (db / 20)
    return x + (g - 1) * hp(x, f0, 1)


# ---------------------------------------------------------------- envelopes
def adsr(n_on, a, d, s, r):
    """Gate of n_on samples -> envelope with release appended. a/d/r in seconds (d, r = time to ~-60 dB)."""
    n_on = max(1, int(n_on))
    t = np.arange(n_on) / SR
    a = max(a, 1e-4)
    on = np.where(t < a, t / a, s + (1 - s) * np.exp(-(t - a) * 6.9 / max(d, 1e-4)))
    nr = int(r * SR)
    rel = on[-1] * np.exp(-np.arange(nr) / SR * 6.9 / max(r, 1e-4)) if nr > 0 else np.zeros(0)
    return np.concatenate([on, rel])


def decay_env(n, tau):
    return np.exp(-np.arange(n) / SR / tau)


# ---------------------------------------------------------------- effects
def pan(x, p):
    """Equal-power pan, p in [-1, 1] -> (2, n)."""
    a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)])


def reverb_ir(rt60=2.4, length=None, predelay=0.025, damp=0.5, seed=1, bright=4500.0):
    """Synthetic stereo hall: decorrelated noise tails, highs decaying faster (damp = HF rt60 fraction)."""
    length = length or rt60 * 1.1
    n = int(length * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    out = []
    for ch in range(2):
        w = rng.standard_normal(n)
        lo = lp(w, bright, 1) * np.exp(-6.9 * t / rt60)
        hi = hp(w, bright, 1) * np.exp(-6.9 * t / (rt60 * damp))
        x = lo + hi
        x[:int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
        out.append(np.concatenate([np.zeros(int(predelay * SR)), x]))
    ir = np.stack(out)
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


def gated_ir(length=0.32, predelay=0.006, seed=7):
    """The 80s gated snare room: dense, almost flat, then slammed shut."""
    n = int(length * SR)
    rng = np.random.default_rng(seed)
    env = np.exp(-np.arange(n) / SR / 0.6)
    env[-int(0.03 * SR):] *= np.linspace(1, 0, int(0.03 * SR)) ** 2
    ir = np.stack([np.concatenate([np.zeros(int(predelay * SR)), hp(lp(rng.standard_normal(n), 7000), 200) * env]) for _ in range(2)])
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


def convolve(x, ir):
    """x (n,) or (2, n), ir (2, m) -> (2, n + m - 1)."""
    if x.ndim == 1:
        x = np.stack([x, x])
    return np.stack([signal.oaconvolve(x[c], ir[c]) for c in range(2)])


def pingpong(x, delay, fb=0.45, taps=8, damp=5000.0):
    """Mono in -> stereo ping-pong echoes (wet only), each repeat darker."""
    d = int(delay * SR)
    out = np.zeros((2, len(x) + d * taps))
    cur = x
    for k in range(1, taps + 1):
        cur = lp(cur, damp, 1)
        out[(k + 1) % 2, k * d:k * d + len(cur)] += cur * fb ** (k - 1)
    return out


@njit(cache=True, fastmath=True)
def _moddelay(x, base, depth, rate, phase):
    n = x.shape[0]
    y = np.zeros(n)
    for i in range(n):
        d = (base + depth * np.sin(2.0 * np.pi * rate * i / SR + phase)) * SR
        j = i - d
        j0 = int(np.floor(j))
        if j0 >= 0 and j0 + 1 < n:
            f = j - j0
            y[i] = x[j0] * (1.0 - f) + x[j0 + 1] * f
    return y


def chorus(x, loop_len=None, rate=0.35, base=0.012, depth=0.004, mix=0.5):
    """Stereo chorus from mono or stereo input. rate is snapped so the LFO repeats exactly once per loop."""
    if loop_len:
        rate = max(1, round(rate * loop_len)) / loop_len
    m = x.mean(0) if x.ndim == 2 else x
    wl = _moddelay(m, base, depth, rate, 0.0)
    wr = _moddelay(m, base, depth, rate, np.pi / 2)
    dry = x if x.ndim == 2 else np.stack([x, x])
    return dry * (1 - mix * 0.5) + np.stack([wl, wr]) * mix


@njit(cache=True, fastmath=True)
def _comp_gain(level, thr, ratio, att, rel):
    n = level.shape[0]
    g = np.empty(n)
    env = 0.0
    a = np.exp(-1.0 / (att * SR))
    r = np.exp(-1.0 / (rel * SR))
    for i in range(n):
        v = level[i]
        if v > env:
            env = a * env + (1.0 - a) * v
        else:
            env = r * env + (1.0 - r) * v
        db = 20.0 * np.log10(env + 1e-9)
        over = db - thr
        gr = -over * (1.0 - 1.0 / ratio) if over > 0 else 0.0
        g[i] = 10.0 ** (gr / 20.0)
    return g


def compress(x, thr=-14.0, ratio=3.0, att=0.01, rel=0.15, circular=False):
    """Stereo-linked compressor. circular=True runs it over the loop twice so the wrap is in steady state."""
    lvl = np.max(np.abs(x), axis=0)
    if circular:
        g = _comp_gain(np.concatenate([lvl, lvl]), thr, ratio, att, rel)[len(lvl):]
    else:
        g = _comp_gain(lvl, thr, ratio, att, rel)
    return x * g


def softclip(x, ceiling=0.95):
    return np.tanh(x / ceiling) * ceiling


def fold(x, L):
    """Wrap everything after sample L back onto the start: the loop then plays as if it had always been looping."""
    y = x[..., :L].copy()
    i = L
    while i < x.shape[-1]:
        c = x[..., i:i + L]
        y[..., :c.shape[-1]] += c
        i += L
    return y
