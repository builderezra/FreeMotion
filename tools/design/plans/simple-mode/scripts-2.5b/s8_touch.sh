#!/bin/bash
# usage: s8_touch.sh <tree> <port> <width> <label> <only>   — a finger test in a browser of its own, with REAL touch emulation (FM_TOUCH_PAGE=1) and the repo's own driver
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd $SP/$1; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
FM_TOUCH_PAGE=1 python3 tests/_cdp.py --port $2 --width $3 --names --timeout ${6:-300} --url "http://localhost:$2/tests/run.html?only=$5" > $SP/touch_$4.json 2>&1
python3 - <<PY
import json
t=open("$SP/touch_$4.json").read()
try: j=json.loads(t[t.index('{'):])
except Exception: print("$4 NOJSON", t[:300]); raise SystemExit
print("$4", j.get('summary'))
for r in j.get('ran',[]): print('   '+('ok  ' if r['ok'] else 'RED ')+r['name'][:100]+(' | '+r.get('notRun','')[:50] if r.get('notRun') else ''))
for f in (j.get('failures') or [])[:4]: print('   F:',str(f)[:420])
PY
