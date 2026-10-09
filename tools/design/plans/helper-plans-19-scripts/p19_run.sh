#!/bin/bash
# usage: p19_run.sh WIDTH ONLY
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd $SP/wt-p19; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
python3 tests/_cdp_h52.py --port 8908 --width $1 --names --timeout 1500 --url "http://localhost:8908/tests/run.html?only=$2" 2>&1 | python3 -c "
import sys,json
t=sys.stdin.read()
try: j=json.loads(t[t.index('{'):])
except Exception: print(t[-600:]); sys.exit()
print('$1',j.get('summary'))
for r in j.get('ran',[]):
    print('  ', 'ok ' if r['ok'] else 'RED', r['name'][:90])
for f in j.get('failures',[]): print(str(f)[:700])"
