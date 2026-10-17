#!/usr/bin/env python3
"""One line for fz_sweep.sh from tests/_cdp.py's JSON on stdin: PASS, FAIL <first failure>, or ERR <why>.

PASS only when the pinned fuzz test is in the driver's own `ran` list (so --names is required) and passed. A run whose
JSON cannot be read, or that ran no test with that title, is ERR, never PASS: "did not run" and "passed" must not read
the same (the first sweep in hunt/fuzz-seeds reported "all pass" because the seam silently ran the pinned seed)."""
import json
import sys

TITLE = '921 S1 convergence fuzz: a host and three guests'

t = sys.stdin.read()
try:
    j = json.loads(t[t.index('{'):])
except Exception:
    print('ERR no JSON from the driver: ' + t[-300:].replace('\n', ' '))
    sys.exit(0)
ran = [r for r in (j.get('ran') or []) if str(r.get('name', '')).startswith(TITLE)]
fails = j.get('failures') or []
if fails:
    print('FAIL ' + str(fails[0]).replace('\n', ' ')[:1200])
elif len(ran) != 1:
    print('ERR the pinned fuzz test ran %d time(s) (summary: %s)' % (len(ran), str(j.get('summary', ''))[:200]))
elif not ran[0].get('ok') or ran[0].get('pending') or ran[0].get('notRun'):
    print('ERR the pinned fuzz test did not pass and named no failure: ' + json.dumps(ran[0])[:300])
else:
    print('PASS')
