#!/bin/bash
# run.sh <scene.js> <out.png> [shot args…] — lib-open.js + code/rail-arrows.js + code/rail.css + proto.js + the scene,
# through shot_classic.py.
# Waits for the repo's locks and a sane load first (a measurement beside ship.sh or a mutation is worthless).
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$HERE/../../../.." && pwd)"
cd "$ROOT"
until [ ! -f .ship-in-progress ] && [ ! -f .mutation-in-progress ] && [ ! -f .spotcheck-in-progress ] && [ "$(sysctl -n vm.loadavg | awk '{print int($2)}')" -lt 8 ]; do sleep 20; done
scene="$1"; out="$2"; shift 2
tmp="$(mktemp -t railjs).js"
{ cat "$HERE/lib-open.js" "$HERE/code/rail-arrows.js"
  printf 'const RAIL_CSS = %s;\n' "$(python3 -c 'import json,sys; print(json.dumps(open(sys.argv[1]).read()))' "$HERE/code/rail.css")"
  cat "$HERE/proto.js" "$HERE/$scene"; } > "$tmp"
python3 "$HERE/shot_classic.py" --js-file "$tmp" --out "$out" "$@"
rm -f "$tmp"
