#!/bin/bash
# Serve the What If brand site locally (ES modules need http://, not file://).
cd "$(dirname "$0")" && echo "http://localhost:${1:-4173}" && python3 -m http.server "${1:-4173}" --bind 127.0.0.1
