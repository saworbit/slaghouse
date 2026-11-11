# sfxgen: AudioGen sample bank for SLAGHOUSE

Generates the game's sampled SFX with [AudioCraft](https://github.com/facebookresearch/audiocraft)'s
AudioGen (`facebook/audiogen-medium`, runs locally on the GPU) and packs them into `../../sfx_bank.js`.
The game plays a sample when one is loaded and falls back to its procedural synth otherwise. Press **N**
in game to A/B the two. The weapon loops (arc, flame, cryo) switch on the next trigger pull, but the ambient
hum keeps whichever version it started with.

## Pipeline

| step | file | what it does |
| --- | --- | --- |
| prompts | `sounds.py` | one entry per replaced sound: prompt(s), length, cut mode, variants kept |
| generate | `gen.py [names]` | 6-12 AudioGen takes per sound -> `out/raw/` (about 12 min for everything on an RTX 3070 Ti) |
| process | `process.py [names]` | trim / slice / seamless loop, 16 -> 48 kHz with synthesized >8 kHz "air", CLAP ranking -> `out/proc/`, `out/candidates.json`, `out/sheets/` |
| audition | `review.html` | serve the repo root and open `/dev/sfxgen/review.html`: play every take, tick picks, export `picks.json` |
| calibrate | `calib.js` -> `calib.json` | renders each procedural sound offline in the browser and measures K-weighted loudness + peak |
| build | `build.py` | encodes the picks to Opus, gain-matches each sound to the synth it replaces -> `../../sfx_bank.js` (only re-encodes sounds whose picks or source audio changed, see below) |

`picks.json` holds hand overrides (sounds where the CLAP ranking chose badly); everything else uses the
top-ranked takes. `MASTER` in `build.py` trims all samples against the synth mix; `PEAK_CAP` limits how
much hotter a sample may peak than the sound it replaces.

## Calibration

`build.py` levels each sample against `calib.json`, so re-measure it whenever a procedural sound in
`slaghouse.html` changes; otherwise that sample keeps the old level. Serve the repo root and open
`slaghouse.html`. Before clicking into the game, paste `calib.js` into the devtools console. Then run
`copy(JSON.stringify(await slagCalib()))` and paste the result over `calib.json`. To measure only some
sounds (for example ones you just added), pass their names: `await slagCalib(['dash', 'erupt'])`, and merge
the result into `calib.json`. Every sound's noise is random, so re-measuring everything shifts the old values
slightly. A loop is measured at the setting where the game plays its sample at full gain (e.g. the lance
loop at full charge).

A sound in `sounds.py` with no `calib.json` entry is left out of the bank: `build.py` prints
`skip <name> (no candidates or calibration)` and the game plays that sound's synth version. So calibrate every
new sound before building, and check the build output for `skip` lines.

## Rebuilding from a fresh clone

Only `out/candidates.json`, `out/picks_used.json`, `out/keep.json` and `out/bank_src.json` are committed. The processed WAVs that
`build.py` and `review.html` read (`out/proc/`) are gitignored, so on a fresh clone run `gen.py` and
`process.py` first. Each sound's seed is `1000 + its position in sounds.py`. Adding or reordering entries
shifts the seeds, and different GPU or library versions can also change the takes. After regenerating,
re-check the `picks.json` overrides in `review.html`.

Rebuilds re-encode only what changed. `out/bank_src.json` records each sound's picked ids, a hash of their
processed WAVs and the bitrate. A sound whose record still matches keeps its Opus data from the current
`sfx_bank.js`, so adding one sound adds a line instead of rewriting the whole bank in git. New encodes are
bit-exact (`-fflags +bitexact`, no random Ogg serial), so the same input always gives the same bytes. Delete
`out/bank_src.json` to force a full re-encode.

Debug helpers: `overview.py` (top take of every sound on one sheet), `rawsheet.py <name>` (raw takes),
`probe.py <name> "label" ...` / `batchprobe.py` (CLAP zero-shot classification of the candidates;
far better than the prompt score for spotting e.g. a "grunt" that is really a punch).

## Setup (Windows)

```
uv venv --python 3.11 .venv
uv pip install --python .venv/Scripts/python.exe torch==2.5.1 torchaudio==2.5.1 --index-url https://download.pytorch.org/whl/cu124
uv pip install --python .venv/Scripts/python.exe --no-deps audiocraft==1.3.0 xformers==0.0.28.post3 --index-url https://download.pytorch.org/whl/cu124 --extra-index-url https://pypi.org/simple
uv pip install --python .venv/Scripts/python.exe "numpy<2" einops flashy hydra-core hydra_colorlog julius num2words sentencepiece huggingface_hub tqdm "transformers>=4.31,<4.47" librosa soundfile av protobuf scipy matplotlib spacy==3.7.5 click torchmetrics
```

Needs `ffmpeg` with libopus on PATH. First run downloads about 7 GB of models (AudioGen, T5, CLAP).
The AudioGen weights are licensed CC-BY-NC 4.0. Treat the generated samples as non-commercial until their
status is cleared: fine for the project as it stands, but check before selling the game.
