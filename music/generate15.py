#!/usr/bin/env python3
"""Generate music from text with ACE-Step 1.5 (turbo, MLX) — the fast engine.

Standalone, stdlib-only: it writes a TOML config and shells out to the
ACE-Step 1.5 checkout's CLI, then copies the result to --out. Measured on
this Mac: 30 s of audio in ~49 s of generation (plus ~1 min model load).

    ./music/generate.sh --tags "lofi, chill, mellow piano, 80 BPM" --duration 30
"""

import argparse
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

ACE15_DIR = Path(os.environ.get("ACE_STEP15_DIR", Path.home() / "dev" / "ace-step-1.5"))


def toml_str(s: str) -> str:
    return '"""' + s.replace("\\", "\\\\").replace('"""', '\\"\\"\\"') + '"""'


def main():
    ap = argparse.ArgumentParser(description="Text-to-music via ACE-Step 1.5 turbo (MLX)")
    ap.add_argument("--tags", required=True,
                    help="caption: genres, moods, instruments, BPM — the main prompt")
    ap.add_argument("--lyrics", default="",
                    help="lyrics with [verse]/[chorus]/[bridge] tags; empty = instrumental")
    ap.add_argument("--lyrics-file", default=None,
                    help="read lyrics from a file instead of --lyrics")
    ap.add_argument("--duration", type=float, default=60.0, help="seconds of audio (default 60)")
    ap.add_argument("--seed", type=int, default=None, help="seed for reproducible output")
    ap.add_argument("--out", default=None,
                    help="output path (.flac native; default music/out/<timestamp>.flac)")
    args = ap.parse_args()

    py = ACE15_DIR / ".venv" / "bin" / "python"
    if not py.exists():
        sys.exit(f"ACE-Step 1.5 venv not found at {py} — see music/README.md for setup")

    lyrics = args.lyrics
    if args.lyrics_file:
        lyrics = Path(args.lyrics_file).read_text()
    instrumental = not lyrics.strip()

    out = Path(args.out) if args.out else (
        Path(__file__).parent / "out" / f"{time.strftime('%Y%m%d-%H%M%S')}.flac")
    out.parent.mkdir(parents=True, exist_ok=True)

    cfg = [
        'config_path = "acestep-v15-turbo"',
        'backend = "mlx"',
        "thinking = false",
        f"caption = {toml_str(args.tags)}",
        f"instrumental = {'true' if instrumental else 'false'}",
        f"duration = {args.duration}",
        "batch_size = 1",
        'save_dir = "output"',
    ]
    if not instrumental:
        cfg.append(f"lyrics = {toml_str(lyrics)}")
    if args.seed is not None:
        cfg += [f"seed = {args.seed}", "use_random_seed = false"]

    with tempfile.NamedTemporaryFile("w", suffix=".toml", delete=False) as f:
        f.write("\n".join(cfg) + "\n")
        cfg_path = f.name

    t0 = time.time()
    try:
        proc = subprocess.run([str(py), "cli.py", "--config", cfg_path],
                              cwd=ACE15_DIR, capture_output=True, text=True)
    finally:
        os.unlink(cfg_path)
    sys.stdout.write(proc.stdout[-2000:])
    if proc.returncode != 0:
        sys.stderr.write(proc.stderr[-3000:])
        sys.exit(f"generation failed (exit {proc.returncode})")

    m = re.findall(r"Path:\s*(\S+\.(?:flac|wav|mp3))", proc.stdout)
    if not m:
        sys.exit("could not find the output path in the CLI output")
    src = ACE15_DIR / m[-1]
    shutil.copy(src, out)
    print(f"\nwrote {out}  ({args.duration:.0f}s of audio in {time.time() - t0:.0f}s wall)")


if __name__ == "__main__":
    main()
