#!/bin/bash
# usage: run.sh WIDTH 'only fragment (url-encoded)' -> prints summary + failures
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
cd $SP/wt-s1
curl -sf -o /dev/null http://localhost:8830/tests/run.html || (setsid nohup tools/serve.sh 8830 >$SP/s1_serve.log 2>&1 </dev/null & sleep 2)
python3 tests/_cdp.py --port 8830 --width $1 --names --timeout 1800 --url "http://localhost:8830/tests/run.html?only=$2" > $SP/s1_run_$1.txt 2>&1
python3 - $1 <<'PY'
import json,sys
t=open('/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad/s1_run_%s.txt'%sys.argv[1]).read()
if '{' not in t: print(t[-800:]); raise SystemExit
d=json.loads(t[t.index('{'):]); print(d['summary'])
for f in d['failures']: print(f[:900]); print()
PY
