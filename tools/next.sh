#!/bin/bash
# What to work on next, oldest first. Use THIS, not a grep.
#
# WHY THIS EXISTS. The command that lived in CLAUDE.md was:
#
#     grep -n "^- \[ \] \*\*[0-9]" REQUESTS.md | sed ... | sort -n | head
#
# and the `[0-9]` in it is a silent filter. Ten open items in REQUESTS.md have no number — they
# predate the numbering — so for as long as that grep has been the way to find the next job, those
# ten have been INVISIBLE to it. Not deprioritised: unreachable. One of them is a measured phone bug
# where six effects' option rows run off the screen and the last options cannot be tapped.
#
# That is the exact failure REQUESTS.md exists to prevent ("nothing rots at the bottom"), caused by
# the tool meant to enforce it. So the fix is a script that cannot filter them out, rather than a
# note reminding someone to also check for unnumbered ones.
#
# ORDERING: unnumbered items come FIRST, because they predate the numbering and oldest-first is the
# rule. Numbered items follow in numeric order.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1
F="REQUESTS.md"

echo "=== UNNUMBERED (pre-date the numbering, so these are the OLDEST) ==="
grep -n '^- \[ \] \*\*[^0-9]' "$F" | sed 's/^\([0-9]*\):- \[ \] \*\*/  line \1: /' | sed 's/\*\*.*//' | cut -c1-100

echo
echo "=== NUMBERED, oldest first ==="
# awk, not sed, and it must never silently drop a row. The first version of this script used a sed
# pattern that required "N — " after the number, so item 31b — whose number carries a LETTER — failed
# to match, passed through unsubstituted, and sorted to the BOTTOM as if it were item 2500. That is
# the same class of bug this script was written to fix, reintroduced by the script itself. So any
# line that does not parse is now printed as UNPARSED rather than quietly mis-sorted.
python3 - "$F" << 'PY'
import re, sys
rows, bad = [], []
for i, ln in enumerate(open(sys.argv[1], encoding='utf-8'), 1):
    if not ln.startswith('- [ ] **'):
        continue
    m = re.match(r'- \[ \] \*\*(\d+)([a-z]?)\s*[—-]*\s*(.*)', ln)
    if not m:
        continue                      # unnumbered — already listed above
    n, suf, title = int(m.group(1)), m.group(2), m.group(3).strip()
    rows.append((n, suf, i, re.sub(r'\*\*', '', title)[:70]))
for n, suf, i, title in sorted(rows):
    print('%s%s\t(line %d)\t%s' % (n, suf, i, title))
PY

echo
printf 'open: %s unnumbered + %s numbered = %s total\n' \
  "$(grep -c '^- \[ \] \*\*[^0-9]' "$F")" \
  "$(grep -c '^- \[ \] \*\*[0-9]' "$F")" \
  "$(grep -c '^- \[ \] \*\*' "$F")"
echo
echo "Blocked on a decision from Ezra? It does NOT hold the queue — note it and take the next one."
