#!/usr/bin/env python3
"""Per-test verdicts out of one tests/_cdp.py run. Used by tools/prove.sh and tools/mutate.sh --only.

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
# WHEN THE RUN SAYS WHICH TESTS RAN (tests/_cdp.py --names, 6 Oct), A TITLE IS JUDGED ON WHAT RAN — so a title that
# matched nothing is NORUN, not "PASS" (below, the count-only path cannot tell those apart). A title is matched the way
# ?only= matched it: exactly if some test has that name, otherwise as a substring; it FAILS if any test it matched
# failed. tools/mutate.sh --only relies on this: a mutation is only SURVIVED by a test that actually ran.
if 'ran' in d:
    ran = d.get('ran')
    if not isinstance(ran, list):
        for t in titles: print('NORUN\t%s\tthe runner published no per-test list (run.html too old?) — cannot say what ran' % t)
        sys.exit(0)
    for t in titles:
        hit = [r for r in ran if r.get('name') == t] or [r for r in ran if t in (r.get('name') or '')]
        if not hit:
            print('NORUN\t%s\tno test with this title ran (%d ran: %s)' % (t, len(ran), summary[:120]))
            continue
        bad = [r for r in hit if not r.get('ok')]
        if not bad:
            print('PASS\t%s' % t)
            continue
        why = ''
        for r in bad:
            row = next((f for f in fails if f.replace('\n', ' ').startswith('FAIL' + r['name'])), None)
            if row:
                why = row.replace('\n', ' ')[len('FAIL' + r['name']):].strip(' —-:'); break
        print('FAIL\t%s\t%s' % (t, (why or 'failed (%s)' % bad[0]['name'][:80])[:300]))
    sys.exit(0)
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
