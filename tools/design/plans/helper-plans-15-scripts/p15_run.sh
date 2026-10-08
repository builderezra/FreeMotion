#!/bin/bash
# usage: p15_run.sh <width> <label> [only]
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd $SP/wt-p15m; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
ONLY=${3:-P15}
U="http://localhost:8843/tests/run.html?only=$ONLY"
python3 tests/_cdp_h52.py --port 8843 --width $1 --names --timeout 400 --url "$U" > $SP/p15_$2.json 2>&1
python3 - <<PY
import json
t=open("$SP/p15_$2.json").read(); j=json.loads(t[t.index('{'):])
print("$2", j.get('summary'))
for r in j.get('ran',[]): print(('ok  ' if r['ok'] else 'RED ')+r['name'][:100])
for f in (j.get('failures') or [])[:8]: print('  F:',str(f)[:420])
PY
