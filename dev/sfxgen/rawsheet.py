"""Debug helper: waveform + spectrogram of every raw take of one sound -> out/sheets/<name>_raw.png"""
import sys, os, glob
import numpy as np, soundfile as sf, matplotlib
matplotlib.use('Agg'); import matplotlib.pyplot as plt
name = sys.argv[1]
fs = sorted(glob.glob(f'out/raw/{name}_*.wav'))
fig, ax = plt.subplots(2, len(fs), figsize=(2.4 * len(fs), 3.4), squeeze=False)
for i, f in enumerate(fs):
    x, sr = sf.read(f); t = np.arange(len(x)) / sr
    ax[0, i].plot(t, x, lw=0.3, color='k'); ax[0, i].set_title(os.path.basename(f), fontsize=7)
    ax[1, i].specgram(x + 1e-7, NFFT=256, Fs=sr, noverlap=192, cmap='magma', vmin=-120)
    for a in ax[:, i]: a.tick_params(labelsize=5)
fig.tight_layout(); fig.savefig(f'out/sheets/{name}_raw.png', dpi=85)
