#!/bin/bash
# usage: h56_run.sh <label> <width> <query-string-after-?>   (server 8840 = wt-p13p @ origin/main 842a23de)
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd $SP/wt-p13p; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
python3 tests/_cdp_h52.py --port 8840 --width $2 --names --timeout 1500 --url "http://localhost:8840/tests/run.html?$3" > $SP/h56_$1.json 2>&1
python3 - <<PY
import json
t=open("$SP/h56_$1.json").read()
try: j=json.loads(t[t.index('{'):])
except Exception as e: print("$1 NOJSON",t[:300]); raise SystemExit
ran=j.get('ran',[]); red=[r for r in ran if not r['ok']]
print("$1", j.get('summary'), 'ran',len(ran))
for r in red: print('  RED',r['name'][:100])
for f in (j.get('failures') or [])[:4]: print('  F:',str(f)[:300])
PY
