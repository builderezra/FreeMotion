#!/usr/bin/env python3
"""Per-test verdicts out of one tests/_cdp.py run. Used by tools/prove.sh and tools/mutate.sh --only.

    python3 tools/_spotjudge.py <cdp-output-file> <titles-file>

Prints one line per title: PASS<TAB>title / FAIL<TAB>title<TAB>reason / NORUN<TAB>title<TAB>why.
A failure row from the runner is "FAIL" + title + " — " + message, so a title is matched as a prefix,
which cannot confuse two titles that share a substring.
"""
import json, sys
# --merge-touch <verdicts file> <tests/_touch_pass.py --out JSON> (7 Oct, the laptop): on Linux every real-finger test reads NORUN
# in prove.sh's shared page (#1097), so prove.sh hands those to the finger pass — each alone, in a touch page of its own — and this
# puts that pass's verdict in place of the NORUN line: pass → PASS, red → FAIL, NOT RUN there too → NORUN with ITS reason. Only a
# NORUN whose title the pass ran is replaced; no JSON (a pass that could not run) leaves every line as it was, so it still refuses.
if len(sys.argv) > 1 and sys.argv[1] == '--merge-touch':
    vf, tj = sys.argv[2], sys.argv[3]
    try:
        res = json.load(open(tj, encoding='utf-8'))
    except Exception:
        sys.exit(0)
    v = {}
    for x in res.get('pass') or []:
        v[x['name']] = 'PASS\t%s' % x['name']
    for x in res.get('red') or []:
        v[x['name']] = 'FAIL\t%s\t%s' % (x['name'], ('(a finger test, in a page of its own) ' + str(x.get('why', '')))[:300])
    for x in res.get('notRun') or []:
        v[x['name']] = 'NORUN\t%s\tNOT RUN HERE: %s' % (x['name'], str(x.get('why', ''))[:200])
    rows = [l for l in open(vf, encoding='utf-8').read().split('\n') if l]
    out = []
    for l in rows:
        p = l.split('\t')
        out.append(v[p[1]] if len(p) > 1 and p[0] == 'NORUN' and p[1] in v else l)
    open(vf, 'w', encoding='utf-8').write('\n'.join(out) + ('\n' if out else ''))
    sys.exit(0)
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
# NOT RUN HERE (6 Oct, tests.js notRunHere): a test this machine cannot run — no AAC encoder, no BarcodeDetector, no touch
# emulation, no baseline recorded for this OS. It is NEVER a PASS: in the count-only path below it is simply absent from
# the failures, which read as PASS; in the `ran` path its ok is false, which read as FAIL. Both wrong, so it is asked FIRST:
# a title that matched a not-run test is NORUN, with the reason, whatever else it matched.
_nr = d.get('notRun') or []
def _not_run_for(t):
    hit = [r for r in _nr if r.get('name') == t] or [r for r in _nr if t in (r.get('name') or '')]
    return hit[0] if hit else None
_titles_left = []
for t in titles:
    nr = _not_run_for(t)
    if nr:
        print('NORUN\t%s\tNOT RUN HERE: %s' % (t, str(nr.get('reason', ''))[:200]))
    else:
        _titles_left.append(t)
titles = _titles_left
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
