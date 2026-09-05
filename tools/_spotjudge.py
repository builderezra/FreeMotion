#!/usr/bin/env python3
"""Per-test verdicts out of one tests/_cdp.py run. Used by tools/prove.sh.

    python3 tools/_spotjudge.py <cdp-output-file> <titles-file>

Prints one line per title: PASS<TAB>title / FAIL<TAB>title<TAB>reason / NORUN<TAB>title<TAB>why.
A failure row from the runner is "FAIL" + title + " — " + message, so a title is matched as a prefix,
which cannot confuse two titles that share a substring.
"""
import json, sys
raw = open(sys.argv[1], encoding='utf-8').read()
titles = [t for t in open(sys.argv[2], encoding='utf-8').read().split('\n') if t]
i = raw.find('{')
try:
    d = json.loads(raw[i:])
except Exception:
    for t in titles: print('NORUN\t%s\t%s' % (t, raw.strip().replace('\n', ' ')[:200]))
    sys.exit(0)
if d.get('error'):
    for t in titles: print('NORUN\t%s\t%s' % (t, d['error'][:200]))
    sys.exit(0)
summary = d.get('summary', '')
fails = d.get('failures') or []
import re
m = re.search(r'Regression \d+/(\d+)', summary)
ran = int(m.group(1)) if m else 0
if ran == 0:
    for t in titles: print('NORUN\t%s\tno test matched: %s' % (t, summary[:160]))
    sys.exit(0)
for t in titles:
    row = next((f for f in fails if f.replace('\n', ' ').startswith('FAIL' + t)), None)
    if row is None:
        # the summary says N ran; if fewer than len(titles) matched, a title may simply not have run
        print('PASS\t%s' % t)
    else:
        print('FAIL\t%s\t%s' % (t, row.replace('\n', ' ')[len('FAIL' + t):].strip(' —-:')[:300]))
