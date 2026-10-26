#!/usr/bin/env bash
# Thin launcher for text-to-music.
#   default        → ACE-Step 1.5 turbo on MLX (~49s for 30s of audio)
#   MUSIC_ENGINE=v1 → original ACE-Step v1 on MPS (slow: ~45 min for 20s; max quality knobs)
set -euo pipefail
HERE="$(dirname "$0")"

if [ "${MUSIC_ENGINE:-v15}" = "v1" ]; then
  ACE_STEP_DIR="${ACE_STEP_DIR:-$HOME/dev/ace-step}"
  PY="$ACE_STEP_DIR/.venv/bin/python"
  if [ ! -x "$PY" ]; then
    echo "ACE-Step v1 venv not found at $PY — see music/README.md for setup." >&2
    exit 1
  fi
  exec "$PY" "$HERE/generate.py" "$@"
fi

exec python3 "$HERE/generate15.py" "$@"
