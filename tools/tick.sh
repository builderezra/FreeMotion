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
. tools/_platform.sh || { echo "❌ tools/_platform.sh is missing"; exit 1; }
hr() { printf '\n── %s ──\n' "$1"; }

hr "IN FLIGHT — do not edit the tree or take a browser reading while any of these is true"
if [ -f .mutation-in-progress ]; then echo "⛔ MUTATION IN PROGRESS: $(cat .mutation-in-progress)"; else echo "no mutation running"; fi
# fm_pgrep_args, not `pgrep -fl` (6 Oct): procps' -fl prints "PID name" only, so `grep -v pgrep` could not drop a shell
# that is merely WAITING on a suite (`while pgrep -f tests/_cdp.py …`) and this counted it as one. Full command line on both.
if ! command -v pgrep >/dev/null 2>&1; then
  echo "⚠️ cannot tell whether a suite is running — there is no pgrep on this machine. Assume one may be; check before editing."
else
  SUITES="$(fm_pgrep_args 'tests/_cdp.py' 2>/dev/null | grep -v pgrep | wc -l | tr -d ' ')"
  [ "$SUITES" != "0" ] && echo "⚠️ $SUITES suite run(s) alive (a ship or mutate is in flight — a mid-flight edit lands in a run meant to test the previous tree)" || echo "no suite running"
fi
[ -n "$(git status --porcelain)" ] && { echo "✏️ uncommitted changes:"; git status --porcelain | head -12; } || echo "tree clean"
# THE LAST SHIP'S VERDICT, read from the file ship.sh writes on EVERY exit path (see the note at the
# top of ship.sh). A dirty tree alone does not say whether the last release REFUSED or was simply
# interrupted, and on 20 Sep a session spent twenty-five minutes rediscovering that by hand — after
# reading "exit code 0" from a ship that had refused, because it had been piped through `tail`.
if [ -f .last-ship ]; then
  _V="$(cat .last-ship 2>/dev/null)"
  case "$_V" in
    # A refusal is not automatically a problem — the docs-only batch gate refuses ON PURPOSE and says so.
    # Shouting at that one would teach the next session to scroll past the banner, which costs the real
    # refusals this line exists to surface. So the alarm is reserved for a refusal with no stated reason.
    *batched*) echo "last ship: held back on purpose ($_V) — carry on; the notes ride out with the next real change" ;;
    # the bar is ship.sh's own (fm_load_bar), and the command to read the load works on the Mac and on Linux alike
    *overloaded*) echo "⏸ last ship: the $(fm_machine_noun) was overloaded, not the code ($_V) — the tree is a finished release; ship it again once \`. tools/_platform.sh; fm_load1\` is under $(fm_load_bar 2>/dev/null || echo '1.6x the cores') (ship.sh refuses in a second otherwise, so trying costs nothing)" ;;
    # ship.sh's "only the Mac ships" gate (6 Oct) is a refusal ON PURPOSE too. Under the alarm below it read "fix the gate it
    # tripped, ship again" — an instruction to defeat the one rule the PM made hard. The switch-over is the PM's decision.
    *"not the shipping machine"*) echo "⏸ last ship: refused ON PURPOSE ($_V) — this $(fm_machine_noun) does not ship or push main until the PM's switch-over. Do NOT set FM_SHIP_ALLOW_NON_MAC (that is the PM's decision, not a session's); work here reaches main only through the Mac." ;;
    REFUSED*)  echo "🚨 THE LAST SHIP REFUSED ($_V) — the tree above is an UNSHIPPED release, not work in progress. Read the log, fix the gate it tripped, ship again." ;;
    *)         echo "last ship: $_V" ;;
  esac
fi

hr "INBOX — Ezra writes here from his phone; if anything is listed, log it VERBATIM into REQUESTS.md first and do nothing else this tick"
./tools/inbox.sh 2>&1 | tail -20

hr "REMOTE"
git fetch ssh --prune -q 2>/dev/null
# "Did the release land" is a question about main. On another branch (the WSL laptop's port branch, a Mac work branch)
# HEAD != ssh/main is normal, and "pull first" would invite pulling main INTO that branch — so say which branch this is.
_B="$(git symbolic-ref --short HEAD 2>/dev/null || true)"
if [ "$_B" = main ]; then
  L="$(git rev-parse HEAD)"; R="$(git rev-parse ssh/main 2>/dev/null)"
  if [ "$L" = "$R" ]; then echo "HEAD == ssh/main ($(git rev-parse --short HEAD)) — pushed"; else echo "⚠️ HEAD $(git rev-parse --short HEAD) != ssh/main $(git rev-parse --short ssh/main 2>/dev/null) — a release did not land, or the remote moved (pull first)"; fi
else
  echo "on branch ${_B:-(detached HEAD)}, not main — only main ships, so whether a release landed is not asked here. HEAD $(git rev-parse --short HEAD); its upstream: $(git rev-parse --short '@{u}' 2>/dev/null || echo 'none set')"
fi
echo "app version: $(grep -o '>v[0-9][0-9.]*<' index.html | head -1 | tr -d '><')   newest log: $(grep -oE '^- v[0-9.]+' POLISH-LOG.md | tail -1 | sed 's/^- //')   test floor: $(cat tools/.test-floor 2>/dev/null)"

hr "QUEUE — oldest first; his words before audit findings; BUILT OUT items are not work"
./tools/next.sh 2>&1 | sed -n '/^ACTIONABLE/,$p' | head -60
./tools/next.sh 2>&1 | grep -A3 'STALE ASKS' | head -8

hr "PROOF DEBT — releases that changed source and have never been spot-checked (tools/spotcheck.sh <hash>); oldest first"
python3 - <<'PY'
import subprocess, re
log = subprocess.run(['git','log','--format=%h %s','-60'], capture_output=True, text=True).stdout.splitlines()
checked = set(); latest = {}
try:
    for l in open('tools/.spotcheck.log'):
        p = l.split()
        # a log line is "date time hash verdict…": the hash is the THIRD column (keyed on the time until 5 Sep 12:40,
        # which matched nothing, so every release read as unchecked); a re-run supersedes an earlier verdict
        if len(p) >= 4: checked.add(p[2]); latest[p[2]] = l.strip()
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
bad = [v for v in latest.values() if ('NOT-PROVEN' in v or 'NO-TEST' in v) and 'pre-filter' not in v and 'superseded' not in v]   # pre-filter = the tool cannot isolate that commit's tests; superseded = fixed by a later release
if bad: print("❌ releases whose LATEST proof FAILED — each is an open defect in a test or a fix (re-run supersedes):"); [print("  " + b) for b in bad[-10:]]
PY

# WEAK PROOFS STILL OWED (queue 901). prove.sh logs a test whose only catch was a missing seam; it stays listed
# here until a RESOLVED line for the same title records the mutation that proved the behaviour itself.
if [ -f tools/.weak-proofs.log ]; then
  python3 - <<'PYW'
open_ = {}
for l in open('tools/.weak-proofs.log', encoding='utf-8'):
    p = l.rstrip('\n').split('\t')
    if len(p) < 3: continue
    if p[1] == 'WEAK': open_[p[2]] = p[0]
    elif p[1] == 'RESOLVED': open_.pop(p[2], None)
if open_:
    print("\n── WEAK PROOFS STILL OWED — each caught only on a missing seam; prove the BEHAVIOUR by a mutation that keeps the seam, then log RESOLVED ──")
    for t, d in open_.items(): print("  " + d + "  " + t[:110])
PYW
fi

hr "SAY IN EVERY REPLY UNTIL HE ANSWERS (from LOOP.md)"
awk '/SAY THESE IN EVERY REPLY/{f=1; next} f && /^\*\*▶️|^\*\*📌|^## /{exit} f && /^- \*\*#/{print}' LOOP.md | cut -c1-200
echo
echo "If the app is broken and needs undoing:  tools/rollback.sh  (no args = list releases; tools/rollback.sh v16.12 = put it back and push)"
echo
echo "Rules in one breath: log him verbatim before working · oldest first · read the code before building · never stop the cron ·"
echo "prove before claiming (a fix ships with a test that FAILS without it — ship.sh checks) · mobile at 380px · batch 3-5 items per ship ·"
echo "ship.sh in the background with timeout 600000, then HEAD == ssh/main · when he is silent, DECIDE and show him the picture (rule 16)."
