#!/bin/zsh
# Render the PC Friends-pair option pictures through tools/shot.py (one throwaway Chrome per call, one call at a time).
#   tools/design/plans/2026-09-28-pc-friends-pair/render.sh OUTDIR OPT PLAN WIDTH HEIGHT [FRAMES]
# OPT A|B, PLAN strip|sizes|measure. Waits for the tree to be quiet first (no ship / mutation / spotcheck, load < 8).
set -e
cd /Users/ezrasmith/Claude/FreeMotion
HERE=tools/design/plans/2026-09-28-pc-friends-pair
OUT=$1 OPT=$2 PLAN=$3 W=$4 H=$5 FR=${6:-}
until [ ! -f .ship-in-progress ] && [ ! -f .mutation-in-progress ] && [ ! -f .spotcheck-in-progress ] && [ "$(sysctl -n vm.loadavg | awk '{print int($2)}')" -lt 8 ]; do sleep 20; done
JS=$OUT/_proto-$OPT-$PLAN.js
{ echo "const OPT='$OPT'; const PLAN='$PLAN';"; cat $HERE/proto.js; } > $JS
if [ -n "$FR" ]; then
  python3 tools/shot.py --width $W --height $H --setup '' --js-file $JS --frames $FR --out $OUT/$OPT-$PLAN-$W.png
else
  python3 tools/shot.py --width $W --height $H --setup '' --js-file $JS --wait 300 --out $OUT/$OPT-$PLAN-$W.png
fi
rm -f $JS
