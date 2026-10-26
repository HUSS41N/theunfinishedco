# music/ — text-to-music with ACE-Step

Generate original music from a text description, locally and free. This folder is
**standalone**: nothing in the engine or any episode depends on it, and it depends on
nothing else in the repo. Use it when an episode, trailer or reel needs a music bed
that the sfx mixer can't provide.

Two engines, both [ACE-Step](https://github.com/ace-step/ACE-Step) family, both doing
full songs with vocals from lyrics or instrumentals from tags alone:

| engine | where | speed on this Mac | notes |
|---|---|---|---|
| **ACE-Step 1.5 turbo** (default) | `~/dev/ace-step-1.5` | **30 s of audio in ~49 s** (+ ~1 min model load) — MLX, Apple Silicon native | 8-step turbo DiT, 48 kHz stereo FLAC |
| ACE-Step v1 3.5B | `~/dev/ace-step` | ~45 min for 20 s (fp32 on MPS) | keep for its mature knobs (steps/CFG); rarely worth it here |

## One-time setup (already done on this machine)

```bash
# 1.5 — the default engine
git clone https://github.com/ACE-Step/ACE-Step-1.5.git ~/dev/ace-step-1.5
cd ~/dev/ace-step-1.5 && uv sync          # installs MLX on Apple Silicon automatically
# first generation downloads ~9.4 GB of checkpoints into the checkout

# v1 — optional fallback
git clone https://github.com/ace-step/ACE-Step.git ~/dev/ace-step
cd ~/dev/ace-step && uv venv --python 3.10 .venv
uv pip install -p .venv/bin/python -e .
uv pip install -p .venv/bin/python torchcodec   # torch ≥2.14 needs it to write WAVs (uses brew ffmpeg)
# first generation downloads ~7.5 GB to ~/.cache/ace-step/checkpoints
```

If a checkout lives elsewhere, point `ACE_STEP15_DIR` / `ACE_STEP_DIR` at it.

## Generate

```bash
# a 30-second instrumental (1.5 turbo, ~2 min wall including model load)
./music/generate.sh --tags "lofi, hip hop, chill, mellow piano, 80 BPM" --duration 30

# a song with vocals
./music/generate.sh --tags "indie pop, female vocals, dreamy, 100 BPM" \
  --duration 90 --lyrics-file my-lyrics.txt

# reproducible + custom output path
./music/generate.sh --tags "epic cinematic, orchestral, tense" \
  --duration 45 --seed 7 --out music/out/trailer-bed.flac

# force the old v1 engine (slow, extra knobs: --steps)
MUSIC_ENGINE=v1 ./music/generate.sh --tags "..." --duration 20 --steps 27
```

Output lands in `music/out/` — FLAC from 1.5, WAV from v1 (gitignored, like all render
intermediates — copy keepers out or commit them deliberately).

### Flags (both engines)

| flag | meaning | default |
|---|---|---|
| `--tags` | genres, moods, instruments, BPM — the main prompt | required |
| `--lyrics` / `--lyrics-file` | lyrics with `[verse]` `[chorus]` `[bridge]` tags; empty = instrumental | instrumental |
| `--duration` | seconds of audio | 60 |
| `--seed` | fix for reproducible output | random |
| `--out` | output path | `music/out/<timestamp>` |
| `--steps` | (v1 only) diffusion steps, 27 fast / 60 max quality | 27 |

## Notes for this machine (M-series, 24 GB)

- 1.5 runs the **MLX** backend (Apple Silicon native) with the 2B turbo DiT —
  8 steps, no CFG. Measured: 3.9 s/step diffusion + 8 s VAE decode for 30 s of audio.
- The wrapper runs 1.5 **DiT-only** (`thinking = false`): the LM planner is skipped,
  tags/lyrics condition the DiT directly. Enable the LM in the 1.5 Gradio UI
  (`./start_gradio_ui_macos.sh`) if you want auto-written lyrics/blueprints.
- v1 must run float32 — bf16 errors on MPS; its wrapper handles it.
- Tags behave like Suno-style style prompts: concrete beats vague
  (`"melancholy solo piano, slow, sparse, 70 BPM"` > `"sad music"`).
- Also tried: **Stable Audio Open Small** (`~/dev/stable-audio-open`, ~11 s clips in
  seconds) — blocked on accepting the model license on Hugging Face + `hf auth login`.
