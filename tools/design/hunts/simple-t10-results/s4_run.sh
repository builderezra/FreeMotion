#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd $SP/wt-s4; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
python3 tests/_cdp_h52.py --port 8846 --width $2 --names --timeout 600 --url "http://localhost:8846/tests/run.html?only=$3" > $SP/s4_$1.json 2>&1
python3 - <<PY
import json
t=open("$SP/s4_$1.json").read(); j=json.loads(t[t.index('{'):])
print("$1",j.get('summary'))
for r in j.get('ran',[]): print(('  ok  ' if r['ok'] else '  RED ')+r['name'][:70])
for f in (j.get('failures') or []): print('  F:',str(f)[:330])
PY
