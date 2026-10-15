#!/bin/bash
# THE ONE COMMAND for Ezra's Simple Phase 3 sheet, once no ship is running:
#
#   bash /home/ezra/fm-helper-wt/sm3-stack/tools/design/sheets/sm3-sheet/run-all.sh
#
# capture.sh (every scene at 380x800, 1280x800 and 900x700, the worktree served on a free port, its own session and Chrome)
# -> build.sh (index.html, one self-contained page, its numbers and "(recommended)" marks from what was measured)
# -> any picture taller than 3x its width split into phone pages (~/FreeMotion/tools/phonepages.py) -> the paths it made.
# Arguments go to capture.sh: --only look,morph retakes just those scenes (shots.json keeps the rest), --tags 380 one size.
set -u
HERE=$(cd "$(dirname "$0")" && pwd)
MAIN=/home/ezra/FreeMotion
if [ -e "$MAIN/.ship-in-progress" ]; then
  echo "REFUSED: $MAIN/.ship-in-progress exists - a ship is running. Run this again when it has finished."
  exit 3
fi
bash "$HERE/capture.sh" "$@"
RC=$?
if [ "$RC" -ne 0 ]; then
  echo "run-all: capture did not finish clean (exit $RC). The FAIL lines above name each missing picture; FAILED-*.png show the"
  echo "screen at the moment it failed. Nothing was built. A draft anyway: bash $HERE/build.sh --allow-missing"
  exit "$RC"
fi
bash "$HERE/build.sh" || { echo "run-all: build refused - see the REFUSED lines above"; exit 1; }
PP="$MAIN/tools/phonepages.py"
[ -f "$PP" ] || PP="$(cd "$HERE/../../.." && pwd)/phonepages.py"
TALL=$(python3 "$HERE/build.py" --list-tall)
PAGES=""
# shellcheck disable=SC2086
[ -n "$TALL" ] && PAGES=$(python3 "$PP" $TALL --out "$HERE/pages")
echo
echo "== the sheet: one self-contained page =="
echo "$HERE/index.html"
echo "== the pictures =="
ls -1 "$HERE"/*.png
if [ -n "$PAGES" ]; then
  echo "== split into phone pages (taller than 3x their width) =="
  echo "$PAGES"
else
  echo "(no picture is taller than 3x its width: nothing to split)"
fi
echo "== measured facts and every picture: $HERE/shots.json; the run's log: $HERE/capture.log"
