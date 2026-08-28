#!/bin/bash
# EVERYTHING WAITING ON ONE ANSWER FROM EZRA, in one place.
#
# WHY THIS EXISTS. `tools/next.sh` reports the count — 44 of 81 open items are "blocked on Ezra" — and
# has never been able to say WHAT they are waiting for. So the questions live scattered through a
# 25,000-line file, each inside the entry that raised it, and he has no way to see them together. On
# 28 Aug he said *"Idk why ur so selective with what you fix"*, and part of the honest answer is that
# several of those items were waiting on a word he was never shown he owed.
#
# It reads the entries rather than keeping a list, for the same reason next.sh does: a hand-maintained
# list of open questions is one more thing to forget to update, which is the bug this is fixing.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1
python3 - "REQUESTS.md" <<'PY'
import re, sys
sys.path.insert(0, 'tools')
from _classify import classify
lines = open(sys.argv[1], encoding='utf-8').read().split('\n')
starts = [i for i, l in enumerate(lines) if re.match(r'^- \[[ x]\] ', l)]
rows = []
for n, i in enumerate(starts):
    if not lines[i].startswith('- [ ] '): continue
    end = starts[n + 1] if n + 1 < len(starts) else len(lines)
    body = '\n'.join(lines[i:end])
    if classify(body) != 'blocked on Ezra': continue
    m = re.match(r'- \[ \] \*\*(\d+[a-z]?)', lines[i])
    tag = m.group(1) if m else '(unnumbered)'
    title = re.sub(r'\*\*|✅|🔴|🚨|⚠️', '', lines[i][6:]).strip()[:64]
    # the ASK: a pick-one table row marked recommended, or the first line that reads as a question
    ask = ''
    # ❓ASK: is the AGREED PLACE. Guessing the question out of prose worked for 25 of 44 entries and
    # missed 19, several of which he had asked about directly — so an entry that means to be waiting on
    # him states it in one line, and one that does not is reported as the defect it is.
    m2 = re.search(r'^\s*❓ASK:\s*(.+)$', body, re.M)
    if m2:
        ask = m2.group(1).strip()
    else:
        opts = re.findall(r'\*\*([A-C])\s*(?:—|-)\s*([^*|\n]{4,60})', body)
        if opts:
            ask = 'PICK: ' + ' · '.join('%s %s' % (a, b.strip()) for a, b in opts[:3])
        else:
            for ln in body.split('\n'):
                t = ln.strip()
                if t.startswith('❓') or ('?' in t and re.search(r'\b(does|do|is|which|what|would|should|can)\b', t, re.I)):
                    ask = re.sub(r'^[^A-Za-z]*', '', t)[:110]; break
    rows.append((tag, title, ask))
def key(r):
    m = re.match(r'(\d+)([a-z]?)$', r[0])
    return (1, int(m.group(1)), m.group(2)) if m else (0, 0, '')
rows.sort(key=key)
print('%d open item(s) are waiting on an answer from Ezra.\n' % len(rows))
withask = [r for r in rows if r[2]]
print('── THESE NAME WHAT THEY NEED (%d) ──' % len(withask))
for tag, title, ask in withask:
    print('  #%-5s %s' % (tag, title))
    print('         %s' % ask)
print()
rest = [r for r in rows if not r[2]]
print('── THESE DO NOT NAME A QUESTION (%d) — that is a bug in the ENTRY, not in him ──' % len(rest))
print('   Fix by adding one line to the entry:  ❓ASK: <the question, answerable in a word or a letter>')
for tag, title, _ in rest[:14]:
    print('  #%-5s %s' % (tag, title))
if len(rest) > 14: print('  …and %d more' % (len(rest) - 14))
PY
