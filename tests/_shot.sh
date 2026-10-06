#!/bin/bash
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
# bash, not zsh, and Chrome from tools/_platform.sh (6 Oct, the WSL port): Ubuntu has no zsh (exit 126) and no
# /Applications. bash 3.2 on the Mac runs this unchanged. --mute-audio: every test Chrome is silent.
. "$(dirname "$0")/../tools/_platform.sh" || { echo "_shot.sh: tools/_platform.sh is missing"; exit 2; }
CHROME="$(fm_chrome)" || exit 2
mkdir -p "$(dirname "$OUT")"
rm -f "$OUT"   # so a Chrome that wrote nothing cannot leave an older PNG to be reported as this one
"$CHROME" \
  --headless --disable-gpu --hide-scrollbars --mute-audio \
  --force-device-scale-factor=2 \
  --window-size="$W","$H" \
  --virtual-time-budget=5000 \
  --screenshot="$OUT" \
  "http://localhost:8777$URLPATH" 2>/dev/null
[ -s "$OUT" ] || { echo "❌ no screenshot was written to $OUT (is tools/serve.sh up on 8777?)"; exit 1; }
echo "wrote $OUT"
# Said on EVERY run, not just in the header above, because the header is read once and this trap costs
# an hour each time it is met: virtual time does not finish a transition, so anything that slides is
# photographed where it started. Moving the warning to the moment of use is the whole point.
echo "  (virtual time: CSS transitions never complete — if this screen slides or fades, use tests/_shotlive.py)"
