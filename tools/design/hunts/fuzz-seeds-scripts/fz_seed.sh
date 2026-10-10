#!/bin/bash
# fz_seed.sh PORT SEED -> prints PASS or the failure text
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
python3 $SP/wt-fz/tests/_cdp_h52.py --port $1 --width 1280 --names --timeout 600 --url "http://localhost:$1/tests/run.html?only=921%20S1%20convergence&seed=$2" 2>&1 | python3 -c "
import sys,json
t=sys.stdin.read()
try: j=json.loads(t[t.index('{'):])
except Exception: print('ERR',t[-300:]); sys.exit()
f=j.get('failures',[])
print('PASS' if not f else 'FAIL '+str(f[0])[:1200])"
