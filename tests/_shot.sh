#!/bin/zsh
# Dev-only: headless screenshot of a URL on the local preview server.
#   _shot.sh <out.png> <url-path> <width> <height>
# 2x scale so type and glow gradients are judgeable; virtual-time-budget lets the home
# intro finish before the frame is taken.
OUT="$1"; URLPATH="$2"; W="${3:-380}"; H="${4:-300}"
mkdir -p "$(dirname "$OUT")"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=2 \
  --window-size="$W","$H" \
  --virtual-time-budget=5000 \
  --screenshot="$OUT" \
  "http://localhost:8777$URLPATH" 2>/dev/null
echo "wrote $OUT"
