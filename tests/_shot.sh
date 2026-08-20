#!/bin/zsh
# Dev-only: headless screenshot of a URL on the local preview server.
#   _shot.sh <out.png> <url-path> <width> <height>
# 2x scale so type and glow gradients are judgeable; virtual-time-budget lets the home
# intro finish before the frame is taken.
#
# ⚠️ NOT FOR ANYTHING THAT ANIMATES. `--virtual-time-budget` stops the clock advancing normally, so a
# CSS TRANSITION NEVER COMPLETES: the phone Add sheet is `translateY(100%)` with a transition and this
# script photographs it still parked below the screen, every time. That cost an hour on queue 428
# ("the Media and Audio tabs are broken" — the sheet had simply never opened in the shot).
# Use `python3 tests/_shotlive.py /tests/_fixture.html out.png [w] [h]` for anything that slides,
# fades or flings. Same dpr 2, real clock.
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
