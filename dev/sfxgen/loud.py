"""K-weighted (ITU-R BS.1770) 'peak momentary' loudness, kept in step with calib.js (which measures the
game's procedural sounds in the browser) so sample gains can be matched to the existing mix.
Both sides run at exactly 48 kHz, so the standard 48 kHz biquad coefficients are used directly."""
import numpy as np
from scipy import signal

SHELF = ([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585])
RLB = ([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621])


def kweight(x):
    y = signal.lfilter(*SHELF, np.asarray(x, dtype=np.float64))
    return signal.lfilter(*RLB, y)


def loudness(x, fs=48000, loop=False, win=0.04, hop=0.01):
    """Loudest 40 ms K-weighted RMS (one-shots) or overall K-weighted RMS (loops), linear."""
    assert fs == 48000
    y = kweight(x)
    if loop:
        return round(float(np.sqrt(np.mean(y ** 2))), 6)
    w, h = int(win * fs), int(hop * fs)
    if len(y) <= w:
        return round(float(np.sqrt(np.mean(y ** 2))), 6)
    c = np.concatenate([[0], np.cumsum(y ** 2)])
    starts = np.arange(0, len(y) - w + 1, h)
    return round(float(np.sqrt(np.max(c[starts + w] - c[starts]) / w)), 6)
