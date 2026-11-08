#!/bin/bash
# tools/design/sheets/sm3-sheet2/build.sh - index.html (one self-contained page) from sheet.html + the pictures + shots.json.
# build.py does the work and refuses on anything missing; --allow-missing makes a draft with red boxes. Arguments pass through.
HERE=$(cd "$(dirname "$0")" && pwd)
exec python3 "$HERE/build.py" "$@"
