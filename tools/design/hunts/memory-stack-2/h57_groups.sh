#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
run(){ # tree port width label only
  cd $SP/$1; python3 tests/_cdp_h52.py --port $2 --width $3 --names --timeout 900 --url "http://localhost:$2/tests/run.html?only=$5" > $SP/h57g_$4.json 2>&1
  python3 - <<PY
import json
t=open("$SP/h57g_$4.json").read()
try: j=json.loads(t[t.index('{'):])
except Exception: print("$4 NOJSON", t[:300]); raise SystemExit
print("$4", j.get('summary'))
for r in j.get('ran',[]): print('   '+('ok  ' if r['ok'] else 'RED ')+r['name'][:100])
for f in (j.get('failures') or [])[:6]: print('   F:',str(f)[:260])
PY
}
enc(){ python3 -c "import sys,urllib.parse; print(urllib.parse.quote('\n'.join(sys.argv[1:])))" "$@"; }
A=$(enc 'H40 an export leaves no temporal plates' 'H40 an audio mix frees the PCM' 'H40 the file kept for undo of a replaced clip is dropped' 'H44 the file kept for undo' '1011 an export that fails closes' '1011 an audio encode that fails')
B=$(enc 'H40 the effect sample tiles stay under' '1009 fill pictures' '1010 the CPU blur reuses')
C=$(enc '1095 the effect scratch pools' 'H40 a pool entry the floor keeps' 'H43 the Filter-container plates')
ALL=$(enc 'H40 an export leaves no temporal plates' 'H40 an audio mix frees the PCM' 'H40 the file kept for undo of a replaced clip is dropped' 'H44 the file kept for undo' '1011 an export that fails closes' '1011 an audio encode that fails' 'H40 the effect sample tiles stay under' '1009 fill pictures' '1010 the CPU blur reuses' '1095 the effect scratch pools' 'H40 a pool entry the floor keeps' 'H43 the Filter-container plates')
for W in 1280 380; do
  # group A: tests on main (red), then on A
  (cd $SP/wt-m57 && git show 6e009ce6:tests/tests.js > tests/tests.js); run wt-m57 8861 $W A_red_$W "$A"; (cd $SP/wt-m57 && git checkout -q -- tests/tests.js)
  run wt-h57a 8865 $W A_green_$W "$A"
  (cd $SP/wt-h57a && git show a5121dd1:tests/tests.js > tests/tests.js); run wt-h57a 8865 $W B_red_$W "$B"; (cd $SP/wt-h57a && git checkout -q -- tests/tests.js)
  run wt-h57b 8866 $W B_green_$W "$B"
  (cd $SP/wt-h57b && git show c94a50ee:tests/tests.js > tests/tests.js); run wt-h57b 8866 $W C_red_$W "$C"; (cd $SP/wt-h57b && git checkout -q -- tests/tests.js)
  run wt-h57 8862 $W C_green_$W "$C"
  run wt-h57 8862 $W ALL_$W "$ALL"
done
echo GROUPSDONE
