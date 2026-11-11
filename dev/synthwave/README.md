# synthwave: SLAGHOUSE soundtrack

Original synthwave / darksynth score, rendered offline by a small synth engine and packed into `../../music_bank.js`.
The game plays the bank when it is loaded and falls back to its procedural drum + bass loop otherwise; **B** in game
flips between the two.

| track | game use | key / tempo / length |
| --- | --- | --- |
| `title` SLAGHOUSE | title screen, and under the results screen after a jingle | F minor, 96 BPM, 16 bars (40 s) |
| `stage1` MELT FLOOR | campaign waves 1-2; OVERTIME / DAILY waves 1-2 of every six | A minor, 118 BPM, 32 bars (65 s) |
| `stage2` SLAG RAIN | campaign waves 3-5; OVERTIME / DAILY waves 3-5 of every six | D minor, 126 BPM, 32 bars (61 s) |
| `boss` THE SMELTER | campaign wave 6 (the Smelter); every BOSS RUSH fight; OVERTIME / DAILY waves 6, 12, 18 ... | E minor / phrygian, 140 BPM, 32 bars (55 s) |
| `win` / `lose` | ARENA CLEARED fanfare / YOU GOT GIBBED tape-stop | 6.5 s / 5.3 s |

Waves pick their track from `WAVE_MUSIC` in `slaghouse.html` (`waveTrack`): the campaign's last entry covers any later
wave, and OVERTIME and DAILY go round all six.
Stage loops are muffled (low-pass, quieter) until an enemy notices you and open up as the fight heats up
(`Music.shade`); title, boss and jingles always play full, and the pause menu muffles everything. `Music.LEVEL` sets
the base music level against the SFX, and the pause menu's music volume (`OPTS.music`) scales it.

## Files

| file | what it is |
| --- | --- |
| `score.py` | the compositions: per-bar chords, bass patterns, arps, pads, stabs, lead melodies, drum lanes, risers |
| `instruments.py` | patches (supersaw pads, plucked arp, sidechained / distorted basses, saw and square leads, brass stabs) and the drum machine |
| `dsp.py` | band-limited oscillators, resonant SVF filters, envelopes, hall / gated reverb, ping-pong delay, chorus, compressor (numba for the per-sample loops) |
| `render.py [names]` | renders tracks to `out/<name>.wav` (48 kHz stereo) and prints each stem's loudness relative to the mix |
| `build.py` | gain-matches the tracks and encodes them to 64 kbps stereo Opus -> `../../music_bank.js` |

Run with the sfxgen venv (numpy, scipy, numba, soundfile; `ffmpeg` with libopus on PATH). numba comes in with
librosa in the sfxgen setup (tested with numba 0.68.1, numpy 1.26.4, scipy 1.17.1). `build.py` and `render.py`
also import `loud.py` from `../sfxgen`.

```
../sfxgen/.venv/Scripts/python render.py
../sfxgen/.venv/Scripts/python build.py
```

A full render takes about a minute.

## How it holds together

- **Seamless loops by construction.** Each loop is rendered once with 4 s of tail (reverb, delay, releases) and the
  tail is folded back onto the start, so the file is exactly what you would hear after it had been looping for a
  while. Oscillator phases and noise are seeded per note, the chorus LFO is snapped to a whole number of cycles per
  loop, and the sidechain pump and master compressor are computed circularly. `build.py` also pads each loop with
  100 ms of its own wrap so Opus never sees an edge; the game loops `[ls, ls + len]`.
- **Auto-balanced mix.** `render.py` sets every stem to a target loudness relative to the kick (gated K-weighted
  loudness, `BALANCE`), so a new part or patch lands at a sensible level without hand-riding faders. Per-track
  overrides go in `Track.master['bal']`.
- **Sidechain pump.** Pads, bass, arps and the reverb return duck on every kick (`mix(..., sc=depth)`).

To change a tune, edit `score.py` (melody syntax: `note/len` in 16ths, `r` rest, `-` tie, `|` bar line, every bar
16 steps; checked when the track is built), then render and build.
