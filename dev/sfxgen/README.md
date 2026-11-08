# sfxgen: AudioGen sample bank for SLAGHOUSE

Generates the game's sampled SFX with [AudioCraft](https://github.com/facebookresearch/audiocraft)'s
AudioGen (`facebook/audiogen-medium`, runs locally on the GPU) and packs them into `../../sfx_bank.js`.
The game plays a sample when one is loaded and falls back to its procedural synth otherwise. Press **N**
in game to A/B the two.

## Pipeline

| step | file | what it does |
| --- | --- | --- |
| prompts | `sounds.py` | one entry per replaced sound: prompt(s), length, cut mode, variants kept |
| generate | `gen.py [names]` | 6-12 AudioGen takes per sound -> `out/raw/` (about 12 min for everything on an RTX 3070 Ti) |
| process | `process.py [names]` | trim / slice / seamless loop, 16 -> 48 kHz with synthesized >8 kHz "air", CLAP ranking -> `out/proc/`, `out/candidates.json`, `out/sheets/` |
| audition | `review.html` | serve the repo root and open `/dev/sfxgen/review.html`: play every take, tick picks, export `picks.json` |
| calibrate | `calib.js` -> `calib.json` | renders each procedural sound offline in the browser and measures K-weighted loudness + peak |
| build | `build.py` | encodes the picks to Opus, gain-matches each sound to the synth it replaces -> `../../sfx_bank.js` |

`picks.json` holds hand overrides (sounds where the CLAP ranking chose badly); everything else uses the
top-ranked takes. `MASTER` in `build.py` trims all samples against the synth mix; `PEAK_CAP` limits how
much hotter a sample may peak than the sound it replaces.

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
AudioGen output is CC-BY-NC 4.0 (the model weights' license), so the samples are fine for a
non-commercial project; check before selling the game.
