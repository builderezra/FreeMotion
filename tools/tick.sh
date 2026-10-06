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

hr "IN FLIGHT — while any of these is true, take no browser reading and do not edit THIS tree; keep building in your worktree (created before the ship)"
if [ -f .mutation-in-progress ]; then
  # since 6 Oct the lock names its pid: a pid that is gone is a KILLED mutation, and the file it names may still be mutated
  _mp="$(sed -n 's/^pid=//p' .mutation-in-progress | head -1)"
  if [ -n "$_mp" ] && ! kill -0 "$_mp" 2>/dev/null; then echo "🚨 A KILLED MUTATION (pid $_mp is gone) may have left $(sed -n 's/^file=//p' .mutation-in-progress | head -1) MUTATED — run tools/mutate.sh --restore before anything else"
  else echo "⛔ $(head -1 .mutation-in-progress)${_mp:+ (pid $_mp)}"; fi
else echo "no mutation running"; fi
# fm_pgrep_args, not `pgrep -fl` (6 Oct): procps' -fl prints "PID name" only, so `grep -v pgrep` could not drop a shell
# that is merely WAITING on a suite (`while pgrep -f tests/_cdp.py …`) and this counted it as one. Full command line on both.
if ! command -v pgrep >/dev/null 2>&1; then
  echo "⚠️ cannot tell whether a suite is running — there is no pgrep on this machine. Assume one may be; check before editing."
else
  SUITES="$(fm_pgrep_args 'tests/_cdp.py' 2>/dev/null | grep -v pgrep | wc -l | tr -d ' ')"
  [ "$SUITES" != "0" ] && echo "⚠️ $SUITES suite run(s) alive (a ship or mutate is in flight — a mid-flight edit lands in a run meant to test the previous tree)" || echo "no suite running"
fi
[ -n "$(git status --porcelain)" ] && { echo "✏️ uncommitted changes:"; git status --porcelain | head -12; } || echo "tree clean"
# THE SHIP: the lock and the last verdict, read by tools/_shiplock.sh (the same reader ship.sh and ship-bg.sh use).
# ship.sh writes .last-ship on EVERY exit path that runs its trap, and "RUNNING <pid>" before its first gate — so a
# ship that was KILLED (no trap runs) is the one that still says RUNNING with its pid gone (6 Oct, RULES-AUDIT B1).
# A dirty tree alone does not say whether the last release REFUSED, was killed, or is still running, and on 20 Sep a
# session spent twenty-five minutes rediscovering that by hand — after reading "exit code 0" from a refused ship.
# (The port's two on-purpose verdicts — overloaded on this machine, and "not the shipping machine" — live there too.)
. tools/_shiplock.sh
ship_status_lines

hr "INBOX — Ezra writes here from his phone; if anything is listed, log it VERBATIM into REQUESTS.md first and do nothing else this tick"
./tools/inbox.sh 2>&1 | tail -20

hr "REMOTE"
git fetch ssh --prune -q 2>/dev/null
# "Did the release land" is a question about main. On another branch (the WSL laptop's port branch, a Mac work branch)
# HEAD != ssh/main is normal, and "pull first" would invite pulling main INTO that branch — so say which branch this is.
# On main, HEAD == ssh/main alone proves nothing (it is also true when a ship refused and moved nothing) — the UNSHIPPED
# RELEASE line below is the one that says whether a release is waiting.
_B="$(git symbolic-ref --short HEAD 2>/dev/null || true)"
if [ "$_B" = main ]; then
  L="$(git rev-parse HEAD)"; R="$(git rev-parse ssh/main 2>/dev/null)"
  if [ "$L" = "$R" ]; then echo "HEAD == ssh/main ($(git rev-parse --short HEAD))"; else echo "⚠️ HEAD $(git rev-parse --short HEAD) != ssh/main $(git rev-parse --short ssh/main 2>/dev/null) — commits here that live does not have, or the remote moved (pull first)"; fi
else
  echo "on branch ${_B:-(detached HEAD)}, not main — only main ships, so whether a release landed is not asked here. HEAD $(git rev-parse --short HEAD); its upstream: $(git rev-parse --short '@{u}' 2>/dev/null || echo 'none set')"
fi
echo "app version: $(grep -o '>v[0-9][0-9.]*<' index.html | head -1 | tr -d '><')   newest log: $(grep -oE '^- v[0-9.]+' POLISH-LOG.md | tail -1 | sed 's/^- //')   test floor: $(cat tools/.test-floor 2>/dev/null)"
# The first-message check reads THIS line (CLAUDE.md step 3, RULES-AUDIT B5) — not `git status`, which is dirty most of
# the time for reasons that are not an unshipped release (the logging chat's files, the batch in progress).
unshipped_release_line
# PER-OS BASELINES (6 Oct, #1071): off the Mac, the 22 tests that pin the Mac's pictures and tolerances say NOT RUN HERE
# until this OS's values are recorded — said here every tick, so the one command that records them is never a memory.
case "$(fm_os)" in
  Darwin) ;;
  *) _OSK="$(fm_os | tr 'A-Z' 'a-z')"
     python3 -c 'import json,sys; d=json.load(open("tests/baselines.json")); sys.exit(0 if isinstance(d.get(sys.argv[1]), dict) and d[sys.argv[1]].get("tables") else 1)' "$_OSK" 2>/dev/null \
       || echo "⚠️ NO BASELINES RECORDED FOR '$_OSK' — 22 pinned tests say NOT RUN HERE on this machine until they are: tools/record-baselines.sh (on a tree the Mac has passed), then commit tests/baselines.json." ;;
esac
hr "QUEUE — oldest first; his words before audit findings; BUILT OUT items are not work"
# next.sh exits 2 with a STOP banner while INBOX.md has a line (6 Oct, the PM's port review): the sed below starts at
# ACTIONABLE, which that banner never reaches, so the queue used to read EMPTY right under an inbox that looked empty too.
_NX="$(./tools/next.sh 2>&1)"; _NXRC=$?
if [ "$_NXRC" = 2 ]; then printf '%s\n' "$_NX" | head -30
else
  printf '%s\n' "$_NX" | sed -n '/^ACTIONABLE/,$p' | head -60
  printf '%s\n' "$_NX" | grep -A3 'STALE ASKS' | head -8
fi

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
echo "when he is silent, DECIDE and show him the picture (rule 16)."
echo "Ships: write the message to .claude/ship/msg.txt, run tools/ship-bg.sh (exit 3 means launched, NOT shipped), then Monitor .claude/ship/ship.log until a line starts with SHIP EXIT or kill -0 on the pid in .ship-in-progress fails. Shipped = a log line starts with \"✅ pushed and verified: HEAD == ssh/main\" AND .last-ship is PUSHED <hash> with hash == git rev-parse --short HEAD. HEAD == ssh/main alone proves nothing, nor do those words elsewhere in the log. RUNNING with no live pid means a KILLED ship: re-ship it."
_CAP_MS="$( . tools/_testfloor.sh 2>/dev/null && echo $(( $(suite_timeout) * 1000 )) )"
echo "Suites: a full suite may use run_in_background with timeout = 1.6 × THIS machine's line in tools/.suite-seconds × 1000 = ${_CAP_MS:-?} ms here (at most 7200000). Only ?only= slices run in the foreground (timeout ≤ 600000). Never write minutes into prose."
