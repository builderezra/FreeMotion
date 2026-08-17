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

# A MALFORMED ENTRY IS AN INVISIBLE ENTRY. Item 211 sat glued to the end of another entry's last
# line for weeks — "...refused permission to.- [ ] **211 — ..." — so it never started a line, and
# every queue tool here matches ^- \[ \]. It was not deprioritised, it was unreachable, and he found
# it himself: "i said this a long time ago and still no fix". Same failure as the unnumbered items,
# different cause, so it gets the same treatment: detected loudly rather than trusted.
# ...but it must not cry wolf, or it gets ignored and we are back where we started. The first version
# fired on this file's own PROSE: #211's writeup quotes the malformed text verbatim to explain the bug,
# inside backticks. Backtick-quoted spans are stripped before testing, so a quotation of the problem is
# not mistaken for the problem.
BAD="$(python3 - "$F" << 'PYEOF'
import re, sys
for i, ln in enumerate(open(sys.argv[1], encoding='utf-8'), 1):
    bare = re.sub(r'`[^`]*`', '', ln)          # drop anything quoted in backticks
    if re.search(r'\S- \[[ x]\] \*\*[0-9]', bare):
        print('%d:%s' % (i, ln.rstrip()[:100]))
PYEOF
)"
if [ -n "$BAD" ]; then
  echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  echo "!! MALFORMED ENTRIES — these do NOT start a line, so NOTHING below sees them:"
  echo "$BAD"
  echo "!! Put each on its own line before trusting this list."
  echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  echo
fi

# AN OPEN ITEM FILED UNDER "## Done" IS A DONE ITEM, to anyone reading the file — and REQUESTS.md is
# written for EZRA to read, not only for a script. Six of them were sitting down there on 17 Aug,
# including "EXPORTED VIDEO CAME OUT WITH NO AUDIO" and the entry this file calls "the most serious
# thing open". The greps below scan the WHOLE file, so they were never invisible to the tooling — which
# is exactly why nothing caught it. Same family as the malformed-entry check above: detected loudly
# rather than trusted.
MISFILED="$(awk '/^## Done/{d=1} d && /^- \[ \] \*\*/{printf "%d:%s\n", NR, substr($0,1,100)}' "$F")"
if [ -n "$MISFILED" ]; then
  echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  echo "!! OPEN items filed under '## Done' — they read as FINISHED to anyone opening this file:"
  echo "$MISFILED"
  echo "!! Move them back above the Done heading."
  echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  echo
fi

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
