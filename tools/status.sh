#!/bin/bash
# Writes a one-line STATUS at the top of every OPEN entry in REQUESTS.md.
#
# WHY. Ezra, 21 Aug, asked to be able to find things without reading paragraphs: "don't clean up
# unless it's just labeling stuff for quick finding I guess". So: labels, and NOTHING deleted — the
# history is the point and he said so twice.
#
# WHY IT IS GENERATED RATHER THAN TYPED. A status line written by hand is true on the day it is
# written and wrong a week later, which is worse than no label — it would tell him something is
# waiting on him long after he answered. This regenerates from the entry's own text every time
# tools/ship.sh runs, so a label cannot rot. It is the same reasoning as next.sh existing at all.
#
# The verdict comes from tools/_classify.py, which tools/next.sh also uses. ONE rule, two readers.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1
python3 - <<'PY'
import re, sys
sys.path.insert(0, 'tools')
from _classify import classify

LABEL = {
    'ACTIONABLE':               '🟢 READY — nothing is stopping this',
    'blocked on Ezra':          '🟠 NEEDS YOU — waiting on your answer',
    'held by Ezra':             '⏸️ HELD — you asked to leave this',
    'needs its own session':    '🔵 BIG — wants a session of its own',
    'standing note (no build)': '📌 NOTE — nothing to build',
    'only long-term ideas left':'💡 LATER — long-term ideas only',
}
MARK = '      **STATUS: '

p = 'REQUESTS.md'
lines = open(p).read().split('\n')
starts = [i for i, l in enumerate(lines) if re.match(r'^- \[[ x]\] ', l)]
out, added, updated, removed = [], 0, 0, 0
for n, i in enumerate(starts):
    end = starts[n + 1] if n + 1 < len(starts) else len(lines)
    block = lines[i:end]
    # drop any previous STATUS line so this is idempotent and never stacks
    had = [b for b in block if b.startswith(MARK)]
    block = [b for b in block if not b.startswith(MARK)]
    if lines[i].startswith('- [ ] '):
        body = '\n'.join(block)
        block.insert(1, MARK + LABEL[classify(body)] + '**')
        if had: updated += 1
        else:   added += 1
    elif had:
        removed += 1          # an entry that got ticked since the last run
    out.append((i, end, block))

new = list(lines[:starts[0]]) if starts else list(lines)
for _, _, block in out:
    new.extend(block)
open(p, 'w').write('\n'.join(new))
print('STATUS lines: %d added, %d refreshed, %d dropped from now-closed entries' % (added, updated, removed))
PY
