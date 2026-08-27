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

# A NUMBER ALLOCATED WHOSE ENTRY WAS NEVER WRITTEN (22 Aug). #153 — "trimming should show the numbers and
# the frame notches" — sat inside #154's BODY for eight days with no header of its own. Every tool here
# matches ^- \[ \], so it was not deprioritised: unreachable, like the unnumbered items and the malformed
# line above. The numbering jumped 152 -> 154 and nothing noticed.
# THE GAP is the signal that works. A "dated His words line buried deep in a block" detector was tried
# first and REJECTED: measured against this file, legitimate entries carry that line up to 22 lines into
# their body (#303, #305), so it cried wolf — and a detector that cries wolf stops being read, which is
# how the last one died.
# The 24 gaps below were the state when this was written; most are numbers merged into a neighbour
# ("119 + 120"), and 90/91 are unexplained with no recoverable text anywhere in the file. They are listed
# so the check stays SILENT on them and speaks only for a NEW hole — which is exactly the #153 shape.
KNOWN_GAPS="32 33 34 36 38 39 40 41 42 43 44 45 46 49 50 51 52 54 55 56 57 90 91 120"
NEWGAP="$(python3 - "$F" "$KNOWN_GAPS" <<'PYG'
import re, sys
nums = set()
for l in open(sys.argv[1], encoding='utf-8'):
    m = re.match(r'^- \[[ x]\] \*\*(\d+)', l)
    if m: nums.add(int(m.group(1)))
known = set(int(x) for x in sys.argv[2].split())
if nums:
    lo, hi = min(nums), max(nums)
    new = [n for n in range(lo, hi + 1) if n not in nums and n not in known]
    if new: print(' '.join(str(n) for n in new))
PYG
)"
if [ -n "$NEWGAP" ]; then
  echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  echo "!! NUMBERS WITH NO ENTRY: $NEWGAP"
  echo "!! A number was allocated and its entry never written — that request is UNREACHABLE."
  echo "!! #153 sat inside #154's body this way for eight days. Search the file for its text; if it is"
  echo "!! buried in another entry, give it its own '- [ ] **N — …**' line. If the number was merged into"
  echo "!! a neighbour on purpose, add it to KNOWN_GAPS in this script."
  echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  echo
fi

# AN ENTRY TICKED [x] THAT SAYS IT IS STILL OPEN (22 Aug). #426 was marked DONE while its own header read
# "⚠️ STAYS OPEN. A guard shipped in v10.65, but the bug was never reproduced" — so every queue tool here,
# which matches ^- \[ \], could not see it. Not deprioritised: UNREACHABLE, for weeks, and found only
# because Ezra pushed back with "you did not meet every task i believe, double check again".
# Same family as the unnumbered items and the malformed entry above, third cause, same treatment: detected
# loudly rather than trusted. The checkbox and the prose must agree.
# …and a BACKTICK-QUOTED mention is a discussion of the phrase, not the phrase. #426's own history now
# explains that its header used to carry one, and without this the detector fired on that explanation —
# the same "a note about the problem is mistaken for the problem" trap the malformed-entry check above
# already guards against, and for the same reason: a detector that cries wolf stops being read.
CONTRA="$(sed 's/`[^`]*`//g' "$F" | awk '/^- \[x\] /{e=NR; t=$0} /STAYS OPEN|still OPEN|NOT done|remains open/{if (e && NR-e<4) printf "%d:%s\n", e, substr(t,1,100)}' | sort -u)"
if [ -n "$CONTRA" ]; then
  echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  echo "!! TICKED [x] BUT THE ENTRY SAYS IT IS STILL OPEN — invisible to every list below:"
  echo "$CONTRA"
  echo "!! Untick it so it can be worked, or delete the claim if it really is done."
  echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  echo
fi

# AN OPEN ENTRY WHOSE EVERY CLAUSE IS TICKED (22 Aug). The mirror of the check above, and it cost a
# tick the day it was added: #343 had all four of its clauses ticked — two of them that same night — and
# its own checkbox left at [ ], so it sat at the top of "oldest first" looking like work. This is the
# CHEAPER direction of the same failure (nothing is lost, only time), which is exactly why nobody would
# notice it: the entry reads as open, so you re-read it, and only the clause list tells you otherwise.
# Only fires on entries that HAVE numbered clauses. An entry with none is prose, and prose has no
# checklist to be finished — flagging those would cry wolf on nearly every entry in the file.
ALLDONE="$(python3 - "$F" <<'PYA'
import sys, re, io
lines = io.open(sys.argv[1], encoding='utf-8').read().split('\n')
out, cur, clauses, body = [], None, [], []
def flush():
    # AN ENTRY MAY SAY WHY IT IS STILL OPEN, and then it is not a miss — this banner asks for exactly
    # that ("say in it what is left"), so it has to honour the answer or it argues with itself forever.
    # #418 has both clauses built and stays open for one thing only: his eye on a reference image that
    # never reached me. That is not work, and it is not something to tick away either.
    txt = (cur[1] if cur else '') + chr(10) + chr(10).join(body)
    if cur and re.search(r'REMAIN(?:S)? OPEN|\(partial\)|NOT STARTED', txt, re.I):
        return
    if cur and clauses and all(clauses):
        out.append('%d:%s' % (cur[0], cur[1][:100]))
for i, ln in enumerate(lines, 1):
    m = re.match(r'^- \[( |x)\] ', ln)
    if m:
        flush()
        cur = (i, ln) if m.group(1) == ' ' else None
        clauses = []; body = []
        continue
    if cur:
        body.append(ln)
        c = re.match(r'^\s+\d+\. \[( |x)\] ', ln)
        if c: clauses.append(c.group(1) == 'x')
flush()
print('\n'.join(out))
PYA
)"
if [ -n "$ALLDONE" ]; then
  echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  echo "!! OPEN [ ] BUT EVERY CLAUSE IS TICKED — this is finished and is still holding the queue:"
  echo "$ALLDONE"
  echo "!! Tick the entry, or say in it what is left that the clause list does not cover."
  echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  echo
fi

# AN OPEN ENTRY WHOSE BODY CLAIMS A VERSIONED FIX (22 Aug). The no-clauses sibling of the check above,
# and it was added because that one MISSED #431: the entry has no numbered clauses, so nothing looked at
# it, while its body said "✅ FIXED v11.71" and its checkbox and STATUS line both still said open. He had
# already seen the fix working in a screenshot.
# No suppression heuristic here on purpose. The obvious one — "unless the entry also says something is
# still outstanding" — would have suppressed #431 itself, because its STALE status line says NEEDS YOU.
# Measured before shipping: across the whole file this matches exactly ONE entry, so it does not need to
# be clever to avoid crying wolf. If it ever starts matching many, that is the signal to add nuance,
# not now.
# ── DONE ENTRIES HIDING AN UNTICKED CLAUSE (rule 15's end-of-batch audit, made structural 26 Aug) ──
# His sharpest line, and it is fair: "u constantly dont do stuff i ask or just fail at it and dont even
# realise". The 25 Aug audit found #418 and #352 ticked DONE with unticked clauses inside — invisible to
# the top-level checkbox this script reads, which is exactly how half a request goes missing. LOOP.md
# rule 15 says to re-run that audit at the end of every batch; a thing to re-run by hand is a thing to
# forget, so it runs here, every tick.
# ⚠️ IT IGNORES CLAUSES THAT SAY WHY THEY ARE UNTICKED. #277's last clause is his own word
# ("potentially"), and #426's is "unticked until he confirms" — both deliberate, both documented. A
# banner that fires on those every single tick trains you to ignore the banner, which is worse than not
# having one.
HALFDONE="$(python3 - "$F" <<'PYH'
import sys, re, io
txt = io.open(sys.argv[1], encoding='utf-8').read().split('\n')
CLAUSE = re.compile(r'^\s*\d+[a-z]?\. \[ \]')
# a clause that explains itself is not a miss — it is a decision
HEDGE = re.compile(r'\(idea|potentially|long term|eventually|one day|until (he|you) confirm|'
                   r'unticked until|his call|your call|held\b', re.I)
out, cur, body = [], None, []
def flush():
    if not cur: return
    # A CLAUSE IS A BLOCK, NOT A LINE. The reason a clause is deliberately unticked is almost always
    # written on the wrapped lines under it — checking only the first line re-flagged #426 for a note
    # sitting two lines below the checkbox.
    live = []
    for i, c in enumerate(body):
        if not CLAUSE.match(c): continue
        blk = [c]
        for nxt in body[i + 1:]:
            if CLAUSE.match(nxt) or not nxt.startswith('    '): break
            blk.append(nxt)
        if not HEDGE.search(' '.join(blk)):
            live.append(c)
    if live:
        out.append('%d:%s' % (cur[0], cur[1][:96]))
        for c in live[:3]:
            out.append('      %s' % c.strip()[:110])
for i, ln in enumerate(txt, 1):
    if re.match(r'^- \[( |x)\] ', ln):
        flush(); cur = (i, ln) if ln.startswith('- [x]') else None; body = []
    elif cur is not None:
        body.append(ln)
flush()
print('\n'.join(out))
PYH
)"
if [ -n "$HALFDONE" ]; then
  echo "######################################################################"
  echo "## TICKED DONE, BUT A CLAUSE INSIDE IS STILL UNTICKED — half a request may be missing:"
  echo "$HALFDONE"
  echo "## Either tick the clause, or say in it why it is deliberately left (a reason is not a miss)."
  echo "######################################################################"
  echo
fi

CLAIMSFIXED="$(python3 - "$F" <<'PYF'
import sys, re, io
lines = io.open(sys.argv[1], encoding='utf-8').read().split('\n')
out, cur, body = [], None, []
def flush():
    # An entry can legitimately be fixed and then RE-OPENED, because the fix turned out to be wrong
    # (480: shipped at v11.94, and an adversarial review found the fix was in the wrong coordinate
    # space, so the symptom Ezra reported never went away). Before this exemption the guard fired on that
    # case and its advice was "tick it" — i.e. it argued for hiding a real, still-broken item. The
    # entry has to keep the old claim as history, so the honest signal is the RE-OPENED word.
    txt = (cur[1] if cur else '') + '\n' + '\n'.join(body)
    if cur and re.search(r'RE-?OPENED', txt, re.I):
        return
    # A PARTIAL IS NOT A MISS EITHER (26 Aug). A multi-clause entry can legitimately ship one clause and
    # stay open for the rest — #539 shipped its corner fix at v12.72 with three clauses still to do, and
    # the "DONE v12.72" inside it made this guard demand the whole entry be ticked. Its advice would have
    # been to close a request that is three-quarters outstanding, which is the opposite of what this
    # file is for. The entry has to SAY it, so the honest signal is the words already used for it.
    # (No apostrophes in here: this heredoc sits inside a command substitution and one breaks the parse.)
    if cur and re.search(r'REMAIN(?:S)? OPEN|\(partial\)|NOT STARTED', txt, re.I):
        return
    # AND AN ENTRY WHOSE STATUS SAYS IT IS WAITING ON EZRA IS NOT HOLDING THE QUEUE FOR NOTHING (27 Aug).
    # 582 shipped two of three clauses and its third turned into a pick for him, so its body legitimately
    # carries DONE vN while the box stays open -- and this guard shouted about it on EVERY run for days.
    # Noise that never goes away is noise that gets ignored, which is worse than no warning at all.
    # The STATUS line is already the canonical statement of who an entry waits on, so honour it rather
    # than demanding yet another magic phrase somewhere in the prose.
    if cur and re.search(r'STATUS:[^\n]*(NEEDS YOU|HELD)', txt):
        return
    if cur and re.search(r'\u2705 \*\*(?:FIXED|DONE|BUILT|SHIPPED) v[0-9]', txt):
        out.append('%d:%s' % (cur[0], cur[1][:100]))
for i, ln in enumerate(lines, 1):
    m = re.match(r'^- \[( |x)\] ', ln)
    if m:
        flush()
        cur = (i, ln) if m.group(1) == ' ' else None
        body = []
        continue
    if cur: body.append(ln)
flush()
print('\n'.join(out))
PYF
)"
if [ -n "$CLAIMSFIXED" ]; then
  echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  echo "!! OPEN [ ] BUT THE BODY SAYS IT WAS FIXED IN A VERSION — it is holding the queue for nothing:"
  echo "$CLAIMSFIXED"
  echo "!! Tick it, or say in the entry what is left that the fix did not cover."
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
# THE CLASSIFIER LIVES IN ONE PLACE — tools/_classify.py — because tools/status.sh writes the same
# verdict into REQUESTS.md for Ezra to read. Two copies of this rule would drift, and a rule living in
# two places is the most expensive bug shape in this project.
sys.path.insert(0, 'tools')
from _classify import classify, BUCKETS
buckets = {k: [] for k in BUCKETS}
for n, i in enumerate(starts):
    if not lines[i].startswith('- [ ] '): continue
    end = starts[n + 1] if n + 1 < len(starts) else len(lines)
    body = '\n'.join(lines[i:end])
    m = re.match(r'- \[ \] \*\*(\d+[a-z]?)', lines[i])
    tag = m.group(1) if m else '(unnumbered)'
    title = re.sub(r'\*\*', '', lines[i][6:])[:64]
    key = classify(body)
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
