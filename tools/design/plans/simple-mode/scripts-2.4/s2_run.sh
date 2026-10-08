#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd $SP/wt-s2; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
python3 tests/_cdp_h52.py --port 8849 --width $2 --names --timeout ${4:-1200} --url "http://localhost:8849/tests/run.html?only=$3" > $SP/s2_$1.json 2>&1
python3 - <<PY
import json
t=open("$SP/s2_$1.json").read()
try: j=json.loads(t[t.index('{'):])
except Exception as e: print("$1 NOJSON", t[:300]); raise SystemExit
print("$1",j.get('summary'))
for r in j.get('ran',[]):
    if not r['ok']: print('  RED '+r['name'][:90]+(' | '+(r.get('notRun') or '')[:40] if r.get('notRun') else ''))
for f in (j.get('failures') or [])[:12]: print('  F:',str(f)[:330])
PY
