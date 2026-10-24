#!/bin/bash
# What If kit — build one video:  ~/dev/stickman-videos/whatif-kit/build.sh <video dir> <output name>
# Renders scene.mjs, mixes sound, muxes, and verifies duration/decode/loudness.
set -euo pipefail
DIR=$(cd "$1" && pwd); NAME=${2:-$(basename "$DIR")}
KIT=$(cd "$(dirname "$0")" && pwd)
PY=~/dev/masked-and-undefined/tools/.venv/bin/python
node "$DIR/scene.mjs"
$PY -I "$KIT/sfx.py" "$DIR"
ffmpeg -v error -y -i "$DIR/build/video.mp4" -i "$DIR/build/mix.wav" -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 44100 -c:a aac -b:a 192k -shortest -movflags +faststart "$DIR/$NAME.mp4"
ffmpeg -v error -i "$DIR/$NAME.mp4" -f null - && echo "decode OK"
printf 'duration '; ffprobe -v error -show_entries format=duration -of csv=p=0 "$DIR/$NAME.mp4"
ffmpeg -i "$DIR/$NAME.mp4" -af volumedetect -vn -f null - 2>&1 | grep -E "mean_volume|max_volume" | sed 's/.*\] //'
