#!/bin/bash
# run-probes.sh [filters|voices|both] [out_dir] — the browser-slot run for tools/design/plans/new-effects (no build step, nothing
# changes in the app). Serves THIS worktree, starts recv.py, runs tools/shot.py with each probe, then turns what the probes posted
# into the filter contact sheet (compose-filters-sheet.py) and the voice WAVs. Default out_dir: /tmp/fm-new-effects.
#   FM_RECOMMEND=id,id,... puts a "Recommended" badge on those filters in the sheet.
# It refuses exactly when the other slot scripts refuse: no browser slot granted (~/.fm-browser-slot holds a future epoch), or a
# ship / mutation in progress here or in the main checkout (a browser beside a ship turned 921 red three times).
set -u
HERE=$(cd "$(dirname "$0")" && pwd)
TREE=$(cd "$HERE/../../../.." && pwd)
WHAT=${1:-both}
OUT=${2:-/tmp/fm-new-effects}
case "$WHAT" in filters|voices|both) ;; *) echo "usage: $0 [filters|voices|both] [out_dir]"; exit 2 ;; esac
E=$(tr -cd 0-9 < ~/.fm-browser-slot 2>/dev/null | head -c 12)
[ -n "$E" ] && [ "$E" -gt "$(date +%s)" ] || { echo "REFUSED: no browser slot (~/.fm-browser-slot) — the browser is granted, never taken"; exit 9; }
for f in /home/ezra/FreeMotion/.ship-in-progress /home/ezra/FreeMotion/.mutation-in-progress "$TREE/.ship-in-progress" "$TREE/.mutation-in-progress"; do
  [ -e "$f" ] && { echo "REFUSED: $f exists"; exit 9; }
done
mkdir -p "$OUT"
free_port() { python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1])'; }
P=$(free_port); R=$(free_port)
( exec "$TREE/tools/serve.sh" "$P" "$TREE" ) >/dev/null 2>&1 & SRV=$!
( exec python3 "$HERE/recv.py" "$R" "$OUT" ) 2>>"$OUT/recv.log" & RCV=$!
trap 'kill $SRV $RCV 2>/dev/null; wait $SRV $RCV 2>/dev/null' EXIT
up=0
for _ in $(seq 1 60); do
  if curl -s -o /dev/null "http://127.0.0.1:$P/index.html" && curl -s "http://127.0.0.1:$R/ping" | grep -q ok; then up=1; break; fi
  sleep 0.5
done
[ $up = 1 ] || { echo "the dev server ($P) or the receiver ($R) never came up"; exit 3; }
cd "$TREE" || exit 1
shoot() {   # <probe> <name>
  echo "python3 tools/shot.py --port $P --path \"/index.html?fmrecv=$R\" --width 1280 --height 800 --wait 300 --js-file $HERE/$1 --out $OUT/$2-page.png"
  python3 tools/shot.py --port "$P" --path "/index.html?fmrecv=$R" --width 1280 --height 800 --wait 300 \
    --js-file "$HERE/$1" --out "$OUT/$2-page.png" | tee "$OUT/$2-shot.txt"
}
rc=0
if [ "$WHAT" != voices ]; then
  rm -f "$OUT/filters.json"
  shoot render-filters-probe.js filters
  if [ -s "$OUT/filters.json" ]; then
    python3 "$HERE/compose-filters-sheet.py" "$OUT/filters.json" "$OUT/filters-sheet.jpg" ${FM_RECOMMEND:+--recommend "$FM_RECOMMEND"} || rc=4
  else echo "NO filters.json — read $OUT/filters-shot.txt"; rc=4; fi
fi
if [ "$WHAT" != filters ]; then
  rm -f "$OUT/voices.json"
  shoot render-voices-probe.js voices
  if [ -s "$OUT/voices.json" ]; then
    python3 - "$OUT" <<'PY' || rc=5
import base64, json, os, sys
out = sys.argv[1]
d = json.load(open(os.path.join(out, 'voices.json'), encoding='utf-8'))
os.makedirs(os.path.join(out, 'voices'), exist_ok=True)
for i, (k, v) in enumerate(d['voices'].items()):
    name = '%02d-%s.wav' % (i, k)
    open(os.path.join(out, 'voices', name), 'wb').write(base64.b64decode(v))
    print(name, '-', d['names'].get(k, k), '|', d['stacks'].get(k, 'dry'), '| peak before normalising', d['peaks'].get(k))
print('wrote', len(d['voices']), 'WAVs into', os.path.join(out, 'voices'), '| errors:', d.get('errors') or 'none')
PY
  else echo "NO voices.json — read $OUT/voices-shot.txt"; rc=5; fi
fi
exit $rc
