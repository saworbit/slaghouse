"""Debug helper: the top-ranked take of every sound on one sheet -> out/sheets/_overview.png"""
import json, numpy as np, soundfile as sf, matplotlib
matplotlib.use('Agg'); import matplotlib.pyplot as plt
C = json.load(open('out/candidates.json'))
names = list(C); cols = 8; rows = (len(names) + cols - 1) // cols
fig, ax = plt.subplots(rows * 2, cols, figsize=(cols * 2.1, rows * 2.5))
for k, n in enumerate(names):
    r, c = divmod(k, cols); y, sr = sf.read(f'out/proc/{n}/{C[n][0]["id"]}.wav'); t = np.arange(len(y)) / sr
    a, b = ax[r * 2, c], ax[r * 2 + 1, c]
    a.plot(t, y, lw=0.3, color='k'); a.set_ylim(-1, 1); a.set_title(f'{n} [{C[n][0]["id"]}] {C[n][0]["score"]:.2f} {len(y)/sr:.2f}s', fontsize=6)
    b.specgram(y + 1e-7, NFFT=512, Fs=sr, noverlap=384, cmap='magma', vmin=-120); b.set_ylim(0, 20000)
    for z in (a, b): z.set_xticks([]); z.set_yticks([])
for k in range(len(names), rows * cols):
    r, c = divmod(k, cols); ax[r * 2, c].axis('off'); ax[r * 2 + 1, c].axis('off')
fig.tight_layout(); fig.savefig('out/sheets/_overview.png', dpi=80)
