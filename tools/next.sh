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

# ---- THE INBOX GATE (v11.21) --------------------------------------------------------------------
# REFUSES TO HAND OUT WORK WHILE INBOX.md HAS ANYTHING IN IT.
#
# WHY. On 21 Aug Ezra spent an hour and a half unable to reach a running loop. Direct messages could
# not drain into cron-driven turns, and INBOX.md — the channel built precisely so he could throw
# requests in from his phone — went unread: that session called next.sh 230 times in its last 20MB of
# transcript and read INBOX.md ONCE. Six releases shipped without him seeing any of them. He had to
# stop it by hand-editing this script into a wall.
#
# CLAUDE.md says to drain INBOX.md at the start of every loop item. That instruction is a hope that
# the next session reads it, and it was not read. This is the same rule with teeth: the loop cannot
# get its next job without the inbox being empty first, so a message from him STOPS THE LOOP by
# existing. Per his own standing rule — "every safe guard needs to be structural, in fact anything
# that is important even slightly that could be forgotten needs to be structural."
#
# Draining is: move each item into REQUESTS.md with a number, then clear the list below the ---.
INBOX_BODY="$(sed -n '/^---$/,$p' INBOX.md 2>/dev/null | sed '1d' | tr -d '[:space:]')"
if [ -n "$INBOX_BODY" ]; then
  echo "=============================================================================="
  echo "⛔  STOP — INBOX.md IS NOT EMPTY. Ezra has said something. Read it FIRST."
  echo "=============================================================================="
  echo
  sed -n '/^---$/,$p' INBOX.md | sed '1d'
  echo
  echo "=============================================================================="
  echo "Drain it before taking any item: log each request VERBATIM into REQUESTS.md with"
  echo "a number, clear everything below the --- in INBOX.md, then run this again."
  echo "No next item will be handed out until then. This is deliberate, not a bug."
  echo "=============================================================================="
  exit 2
fi
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
echo

# ---------------------------------------------------------------------------------------------------
# WHICH OF THOSE CAN ACTUALLY BE WORKED ON — because the list above never said, and every session paid
# for that. A session on 20 Aug re-derived it by reading entries one at a time, called far too many of
# them "blocked", and fell back to bug hunts while buildable items sat there. The entries already SAY
# which is which in prose; nothing here changes REQUESTS.md, it just reads what is written.
# Deliberately conservative: anything it cannot classify is ACTIONABLE, so the failure mode is being
# handed work rather than being told there is none.
python3 - "$F" <<'PY'
import re, sys
lines = open(sys.argv[1]).read().split('\n')
starts = [i for i, l in enumerate(lines) if re.match(r'^- \[[ x]\] ', l)]
HELD    = re.compile(r'⚠️ *HELD|Held because|Log don.t do yet|held at (his|your) request|deliberately not being done', re.I)
BLOCKED = re.compile(r'one word from (him|you)|need one photo|worth one line from (him|you)|your call|your word|'
                     r'needs? (his|your) (decision|word|call)|decision for you|say the word|Ask him|'
                     r'would settle it|from you would close it|LEFT OPEN for your eye|still worth your ears|'
                     r'waiting on (his|your)|ASKED HIM|STAYS OPEN|is his call|his call alone|'
                     # …and the big one the first version missed: items that are FIXED and left open only
                     # until he confirms on his own device. They read as actionable and are not — there is
                     # nothing to build, only something for him to look at.
                     r'Left OPEN rather than ticked|left open until|until (he|you) confirm|say so and (it|this) is live|'
                     r'if it still|next time it happens|one line from (him|you)|REAL-DEVICE report|'
                     # …and the plainest block of all: the thing the request refers to never arrived.
                     r'IS NOT IN THE INBOX|did not come through|never arrived|no screenshot|reference image', re.I)
BIG     = re.compile(r'wants a session of its own|Not started deliberately|days of work', re.I)
# …and entries that are NOT WORK AT ALL. Some exist as a receipt — a standing instruction he has had to
# repeat, kept so it does not live only in a chat log — and some say in their own words that they no
# longer hold the queue. Both used to land in ACTIONABLE, because nothing about them looks blocked, and
# that sends the next session to read a reminder instead of building something.
STANDING = re.compile(r'Nothing to build|this is the receipt|Standing reminder|no longer holds the queue|'
                      r'standing instruction', re.I)
# …and entries whose REMAINING clauses are all marked by him as ideas rather than requests. #277 had
# nine of ten clauses shipped with the last one written "potentially"; #343's two open clauses both say
# "(long term)". Both were topping the actionable list looking like days of work. If every unticked
# clause is hedged that way, the entry is not queued work — the ticked ones are the real state.
CLAUSE  = re.compile(r'^\s*\d+\. \[ \]')
HEDGED  = re.compile(r'\(long term\)|\(Idea|potentially|eventually|one day', re.I)
buckets = {'ACTIONABLE': [], 'blocked on Ezra': [], 'held by Ezra': [], 'needs its own session': [], 'standing note (no build)': [], 'only long-term ideas left': []}
for n, i in enumerate(starts):
    if not lines[i].startswith('- [ ] '): continue
    end = starts[n + 1] if n + 1 < len(starts) else len(lines)
    body = '\n'.join(lines[i:end])
    m = re.match(r'- \[ \] \*\*(\d+[a-z]?)', lines[i])
    tag = m.group(1) if m else '(unnumbered)'
    title = re.sub(r'\*\*', '', lines[i][6:])[:64]
    open_clauses = [l for l in body.split('\n') if CLAUSE.match(l)]
    hedged_only = bool(open_clauses) and all(HEDGED.search(l) for l in open_clauses)
    key = ('only long-term ideas left' if hedged_only else
           'standing note (no build)' if STANDING.search(body) else
           'held by Ezra' if HELD.search(body) else
           'blocked on Ezra' if BLOCKED.search(body) else
           'needs its own session' if BIG.search(body) else 'ACTIONABLE')
    buckets[key].append((tag, title, i + 1))
for k in ('ACTIONABLE', 'blocked on Ezra', 'held by Ezra', 'needs its own session', 'standing note (no build)', 'only long-term ideas left'):
    print('%-22s %d' % (k + ':', len(buckets[k])))
act = buckets['ACTIONABLE']
if act:
    print('\nSTART HERE (oldest first) — but READ THE CODE BEFORE YOU BUILD:')
    print('  On 20 Aug THREE open entries turned out to be already done — 395 (audio export shipped')
    print('  under 216), 277 (nine of ten clauses), 418 clause 2 (already at 1.8). Each was found by')
    print('  opening the file the entry names. An entry is a record of what was ASKED, not of what is')
    print('  still missing, and nothing keeps the two in step automatically.')
    def key(t):
        mm = re.match(r'(\d+)', t[0])
        return (0, 0) if not mm else (1, int(mm.group(1)))
    for tag, title, ln in sorted(act, key=key)[:5]:
        print('  %-6s line %-6d %s' % (tag, ln, title))
else:
    print('\nNothing classified as actionable — bug hunts are the fallback (his explicit instruction).')
print('\n(A guess from the prose. If one is wrong, the entry is what to fix, not this script.)')
PY
