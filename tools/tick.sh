#!/bin/bash
# ONE COMMAND PER LOOP TICK — everything a tick needs to know, printed once, in the order it matters.
#
#   tools/tick.sh
#
# WHY. The loop's rules live in LOOP.md, which is ~1,900 lines and mostly history; a tick that "reads
# LOOP.md first" either reads all of it (expensive, every minute) or skims it (and forgets a rule — the
# thing Ezra asked on 5 Sep to make impossible: "never forgetting base rules and instructions"). So the
# facts a tick needs are COMPUTED here, from the repo, every time. Nothing here is remembered.
#
# Order: (1) is anything in flight that must not be disturbed, (2) is he talking (INBOX), (3) is the tree
# where the remote thinks it is, (4) the queue, (5) the questions that are stale, (6) the release that has
# gone longest without an after-the-fact proof, (7) the standing reminders he asked to hear every reply.
set -uo pipefail
cd "$(dirname "$0")/.."
hr() { printf '\n── %s ──\n' "$1"; }

hr "IN FLIGHT — do not edit the tree or take a browser reading while any of these is true"
if [ -f .mutation-in-progress ]; then echo "⛔ MUTATION IN PROGRESS: $(cat .mutation-in-progress)"; else echo "no mutation running"; fi
SUITES="$(pgrep -fl 'tests/_cdp.py' 2>/dev/null | grep -v pgrep | wc -l | tr -d ' ')"
[ "$SUITES" != "0" ] && echo "⚠️ $SUITES suite run(s) alive (a ship or mutate is in flight — a mid-flight edit lands in a run meant to test the previous tree)" || echo "no suite running"
[ -n "$(git status --porcelain)" ] && { echo "✏️ uncommitted changes:"; git status --porcelain | head -12; } || echo "tree clean"

hr "INBOX — Ezra writes here from his phone; if anything is listed, log it VERBATIM into REQUESTS.md first and do nothing else this tick"
./tools/inbox.sh 2>&1 | tail -20

hr "REMOTE"
git fetch ssh --prune -q 2>/dev/null
L="$(git rev-parse HEAD)"; R="$(git rev-parse ssh/main 2>/dev/null)"
if [ "$L" = "$R" ]; then echo "HEAD == ssh/main ($(git rev-parse --short HEAD)) — pushed"; else echo "⚠️ HEAD $(git rev-parse --short HEAD) != ssh/main $(git rev-parse --short ssh/main 2>/dev/null) — a release did not land, or the remote moved (pull first)"; fi
echo "app version: $(grep -o '>v[0-9][0-9.]*<' index.html | head -1 | tr -d '><')   newest log: $(grep -oE '^- v[0-9.]+' POLISH-LOG.md | tail -1 | sed 's/^- //')   test floor: $(cat tools/.test-floor 2>/dev/null)"

hr "QUEUE — oldest first; his words before audit findings; BUILT OUT items are not work"
./tools/next.sh 2>&1 | sed -n '/^ACTIONABLE/,$p' | head -60
./tools/next.sh 2>&1 | grep -A3 'STALE ASKS' | head -8

hr "PROOF DEBT — releases that changed source and have never been spot-checked (tools/spotcheck.sh <hash>); oldest first"
python3 - <<'PY'
import subprocess, re
log = subprocess.run(['git','log','--format=%h %s','-60'], capture_output=True, text=True).stdout.splitlines()
checked = set()
try:
    for l in open('tools/.spotcheck.log'):
        p = l.split()
        if len(p) >= 2: checked.add(p[1])
except FileNotFoundError: pass
debt = []
for l in log:
    h, s = l.split(' ', 1)
    if not re.match(r'v\d+\.\d+', s): continue
    files = subprocess.run(['git','diff-tree','--no-commit-id','--name-only','-r',h], capture_output=True, text=True).stdout.split()
    if not any(re.match(r'^(index\.html|styles\.css|theme-glass\.css|js/[^/]+\.js)$', f) for f in files): continue
    if any(h.startswith(c) or c.startswith(h) for c in checked): continue
    debt.append(l)
debt.reverse()
print(f"{len(debt)} unchecked of the last 60 commits" + (":" if debt else "."))
for l in debt[:8]: print("  " + l[:110])
if len(debt) > 8: print(f"  … and {len(debt)-8} more")
try:
    bad = [l.strip() for l in open('tools/.spotcheck.log') if 'NOT-PROVEN' in l or 'NO-TEST' in l]
    if bad: print("❌ releases whose proof FAILED — each is an open defect in a test or a fix:"); [print("  " + b) for b in bad[-10:]]
except FileNotFoundError: pass
PY

hr "SAY IN EVERY REPLY UNTIL HE ANSWERS (from LOOP.md)"
awk '/SAY THESE IN EVERY REPLY/{f=1; next} f && /^\*\*▶️|^\*\*📌|^## /{exit} f && /^- \*\*#/{print}' LOOP.md | cut -c1-200
echo
echo "Rules in one breath: log him verbatim before working · oldest first · read the code before building · never stop the cron ·"
echo "prove before claiming (a fix ships with a test that FAILS without it — ship.sh checks) · mobile at 380px · batch 3-5 items per ship ·"
echo "ship.sh in the background with timeout 600000, then HEAD == ssh/main · when he is silent, DECIDE and show him the picture (rule 16)."
