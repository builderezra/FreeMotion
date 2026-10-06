#!/bin/bash
# LAUNCH A SHIP, DETACHED — the only way a ship should be started (6 Oct, RULES-AUDIT B1).
#
#   (write the commit message to .claude/ship/msg.txt first)
#   tools/ship-bg.sh          # exit 3 = LAUNCHED, NOT shipped.  1 = refused.  2 = no usable message.  NEVER 0.
#
# WHY. A ship is two full suite passes plus the proof — far longer than any harness timeout (the real length of one pass
# is in tools/.suite-seconds). Every written instruction still described the old short ship, so on 5 Oct a session
# followed them, launched it with run_in_background, and the harness KILLED it at its 10-minute limit: "THE SUITE DID
# NOT RUN", nothing committed. The method that worked lived only in a memory note. Now it is this script.
#
# IT NEVER EXITS 0. On 20 Sep a ship REFUSED and the caller read "exit code 0" (piped through tail), and the next
# session built on a release that never landed. A launcher that exited 0 would bring that back: "the command
# succeeded" would mean "a ship started", which is not "shipped". Shipped is only a ship.log line STARTING with
# "✅ pushed and verified: HEAD == ssh/main" AND .last-ship saying PUSHED <hash> with hash == git rev-parse --short HEAD.
# The words alone are not enough: ship.sh's self-tests print into the same log before any suite runs.
#
# No setsid (it does not exist on this Mac); nohup + disown is what survived on 5 Oct. .claude/ is gitignored, so
# ship.sh's `git add -A` cannot sweep the log or the message into the release.
set -uo pipefail
cd "$(dirname "$0")/.."
. tools/_shiplock.sh
mkdir -p .claude/ship

# ONE LAUNCHER AT A TIME, TAKEN NOT CHECKED (6 Oct, the B1 check). The check below and the launch are separate steps, so
# two ship-bg.sh started together both found no ship running, both emptied the log, both launched — and both exited 3
# naming the SAME pid, because each waited for "a live pid in the lock" and the winner's was the only one there. The
# loser's ship.sh, refused or not, wrote into the winner's log. ship.sh's own guard is atomic now too, but that alone
# cannot keep a second launcher off the shared log, so the launcher holds a lock of its own (taken the same way, one
# step) until it has seen its ship take .ship-in-progress, or seen it end.
_launcher_alive() { local p; p="$(ship_lock_pid "$1")"; [ -n "$p" ] && [ "$p" != "$$" ] && kill -0 "$p" 2>/dev/null && ps -p "$p" -o command= 2>/dev/null | grep -q 'ship-bg\.sh'; }
LAUNCH_LOCK=.claude/ship/launching
if ! _take_lockfile "$LAUNCH_LOCK" "pid=$$ since=$(date +%s)" _launcher_alive; then
  echo "❌ another tools/ship-bg.sh is launching a ship right now ($(printf '%s' "$_OLD" | head -1)) — not launching a second one."
  echo "   In a few seconds .ship-in-progress names the ship it started; tools/tick.sh says what it is doing."
  exit 1
fi
trap '[ "$(ship_lock_pid "$LAUNCH_LOCK")" = "$$" ] && rm -f "$LAUNCH_LOCK"' EXIT

# One ship at a time — the same reader ship.sh uses, so the two cannot disagree about what "running" means.
st="$(ship_lock_state .ship-in-progress)"
case "$st" in
  live*) set -- $st
         echo "❌ a ship is already running (pid $2, phase $3) — not launching a second one."
         echo "   Watch it: until grep -q '^SHIP EXIT' .claude/ship/ship.log || ! kill -0 $2 2>/dev/null; do sleep 30; done; tail -25 .claude/ship/ship.log; cat .last-ship"
         exit 1 ;;
esac

MSGF=.claude/ship/msg.txt
[ -s "$MSGF" ] || { echo "❌ no commit message — write it to $MSGF first (nothing launched)."; exit 2; }
# A message that already shipped is a stale file, not this release's message: the commit would describe the last one.
if [ "$(head -1 "$MSGF")" = "$(git log -1 --format=%s 2>/dev/null)" ]; then
  echo "❌ $MSGF is the message HEAD already shipped with — write this release's message first (nothing launched)."
  exit 2
fi

mkdir -p .claude/ship
# Empty the log NOW, not inside the detached shell: until that shell gets round to its own `>`, a reader would still
# see the PREVIOUS ship's "pushed and verified" and "SHIP EXIT 0" — a stale success read as this one's.
: > .claude/ship/ship.log
nohup bash -c 'tools/ship.sh -F .claude/ship/msg.txt > .claude/ship/ship.log 2>&1; echo "SHIP EXIT $?" >> .claude/ship/ship.log' </dev/null >/dev/null 2>&1 & disown

# Wait (briefly) for ship.sh to put its pid in the lock, so the watch line below names a real process. ship.sh writes it
# before its first gate, so this is normally well under a second. A ship that refuses that fast is said here.
pid=""
for _ in $(seq 1 40); do
  pid="$(ship_lock_pid .ship-in-progress)"
  [ -n "$pid" ] && ship_pid_alive "$pid" && break
  pid=""
  grep -q '^SHIP EXIT' .claude/ship/ship.log 2>/dev/null && break
  sleep 0.25
done
if [ -z "$pid" ] && grep -q '^SHIP EXIT' .claude/ship/ship.log 2>/dev/null; then
  echo "❌ the ship ended straight away — it was REFUSED (or failed to start), nothing shipped:"
  tail -12 .claude/ship/ship.log | sed 's/^/   /'
  exit 1
fi

echo 'LAUNCHED - NOT shipped yet; shipped is only a line starting "✅ pushed and verified: HEAD == ssh/main" in .claude/ship/ship.log AND .last-ship = PUSHED <the short hash of HEAD>'
if [ -n "$pid" ]; then
  echo "   ship.sh pid $pid. Watch it (Monitor, or Bash with run_in_background):"
  echo "   until grep -q '^SHIP EXIT' .claude/ship/ship.log || ! kill -0 $pid 2>/dev/null; do sleep 30; done; tail -25 .claude/ship/ship.log; cat .last-ship"
else
  echo "   ⚠️ ship.sh has not written its pid to .ship-in-progress yet — read .claude/ship/ship.log before trusting anything."
fi
exit 3
