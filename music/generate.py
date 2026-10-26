#!/usr/bin/env python
"""Generate music from text with ACE-Step (https://github.com/ace-step/ACE-Step).

Standalone — nothing else in this repo imports it, and it imports nothing from
the engine. Run it with the Python from the local ACE-Step checkout's venv
(it needs the `acestep` package installed there):

    ~/dev/ace-step/.venv/bin/python music/generate.py \
        --tags "lofi, hip hop, chill, mellow, 80 BPM" --duration 30

or just use ./music/generate.sh, which picks that interpreter for you.

Tags are comma-separated genres/moods/instruments/BPM. For songs with vocals,
pass --lyrics or --lyrics-file with [verse]/[chorus]/[bridge] structure tags;
leave lyrics empty (the default, sent as "[inst]") for instrumentals.

The first run downloads the ACE-Step-v1-3.5B checkpoint (~7.5 GB) to
~/.cache/ace-step/checkpoints. On this Mac it runs on MPS in float32
(bf16 errors out on macOS, per the ACE-Step README).
"""

import argparse
import sys
import time
from pathlib import Path


def main():
    ap = argparse.ArgumentParser(description="Text-to-music via ACE-Step")
    ap.add_argument("--tags", required=True,
                    help="comma-separated tags: genres, moods, instruments, BPM")
    ap.add_argument("--lyrics", default="",
                    help="lyrics with [verse]/[chorus]/[bridge] tags; empty = instrumental")
    ap.add_argument("--lyrics-file", default=None,
                    help="read lyrics from a file instead of --lyrics")
    ap.add_argument("--duration", type=float, default=60.0,
                    help="seconds of audio (default 60)")
    ap.add_argument("--steps", type=int, default=27,
                    help="diffusion steps; 27 is the benchmark setting, 60 is max quality")
    ap.add_argument("--seed", type=int, default=None,
                    help="seed for reproducible output (default: random)")
    ap.add_argument("--out", default=None,
                    help="output .wav path (default: music/out/<timestamp>.wav)")
    args = ap.parse_args()

    lyrics = args.lyrics
    if args.lyrics_file:
        lyrics = Path(args.lyrics_file).read_text()
    if not lyrics.strip():
        lyrics = "[inst]"

    out = Path(args.out) if args.out else (
        Path(__file__).parent / "out" / f"{time.strftime('%Y%m%d-%H%M%S')}.wav")
    out.parent.mkdir(parents=True, exist_ok=True)

    try:
        from acestep.pipeline_ace_step import ACEStepPipeline
    except ImportError:
        sys.exit("acestep is not importable — run this with the ACE-Step venv python "
                 "(~/dev/ace-step/.venv/bin/python) or via music/generate.sh")

    # float32: bf16 is broken on macOS/MPS per the ACE-Step README.
    pipeline = ACEStepPipeline(checkpoint_dir="", dtype="float32")

    t0 = time.time()
    pipeline(
        format="wav",
        audio_duration=args.duration,
        prompt=args.tags,
        lyrics=lyrics,
        infer_step=args.steps,
        manual_seeds=[args.seed] if args.seed is not None else None,
        save_path=str(out),
    )
    print(f"\nwrote {out}  ({args.duration:.0f}s of audio in {time.time() - t0:.0f}s)")


if __name__ == "__main__":
    main()
