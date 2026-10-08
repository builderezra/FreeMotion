#!/bin/bash
# usage: p16_run.sh <tree m|p> <width> <label> [only]
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
if [ "$1" = m ]; then T=wt-p16m; PORT=8863; else T=wt-p16; PORT=8864; fi
cd $SP/$T; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
ONLY=${4:-P16}
nice -n 19 python3 tests/_cdp_h52.py --port $PORT --width $2 --names --timeout ${TMO:-500} --url "http://localhost:$PORT/tests/run.html?only=$ONLY" > $SP/p16_$3.json 2>&1
python3 - <<PY
import json
t=open("$SP/p16_$3.json").read()
try: j=json.loads(t[t.index('{'):])
except Exception: print("$3 NOJSON", t[:400]); raise SystemExit
print("$3", j.get('summary'))
for r in j.get('ran',[]): print(('ok  ' if r['ok'] else 'RED ')+r['name'][:110])
for f in (j.get('failures') or [])[:10]: print('  F:',str(f)[:520])
PY
