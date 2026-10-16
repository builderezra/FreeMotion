#!/bin/bash
# tools/design/sheets/sm3-sheet2/capture.sh - the pictures for Ezra's second Simple Phase 3 sheet (capture.py does the work).
#
#   bash tools/design/sheets/sm3-sheet2/capture.sh                   # every scene, at 380x800, 1280x800 and 900x700
#   bash tools/design/sheets/sm3-sheet2/capture.sh --only r6b,r6c    # just those scenes again (shots.json keeps the rest)
#
# Copied from the first sheet's capture.sh (never edited), with its own log, pid file, profile prefix and detach marker.
# - REFUSES while a ship, a mutation or a spot-check is running here or in ~/FreeMotion: a browser beside ship.sh turned 921
#   red, and a reading taken during a mutation describes the mutation (CLAUDE.md, "SHIPS AND SUITES").
# - Serves THIS worktree with its own tools/serve.sh (else ~/FreeMotion's) on a FREE port - never 8777, checked before use.
# - Runs in its OWN SESSION (setsid): when the shell that launched it ends it otherwise takes Chrome's zygote with it (the
#   v17.48 "STALLED" launches). After launching it PAUSES and checks the detached job is alive and is this script; a job that
#   died at once is reported with its log and its exit code instead of being tailed as if it were running. Then it waits and
#   prints the log as it goes; if the launching shell dies, the run carries on and finishes into capture.log.
# - Kills ONLY what it started: its server's pid and the Chrome pids capture.py wrote down (each checked to be one of ours).
set -u
HERE=$(cd "$(dirname "$0")" && pwd)
TREE=$(cd "$HERE/../../../.." && pwd)
MAIN=/home/ezra/FreeMotion
LOG="$HERE/capture.log"

busy() {
  for d in "$MAIN" "$TREE"; do
    for f in .ship-in-progress .mutation-in-progress .spotcheck-in-progress; do
      [ -e "$d/$f" ] && { echo "$d/$f"; return 0; }
    done
  done
  return 1
}
if B=$(busy); then
  echo "REFUSED: $B exists - a ship, mutation or spot-check is running. Run this again when it is gone."
  exit 3
fi

if [ -z "${SM3_SHEET2_DETACHED:-}" ]; then
  export SM3_SHEET2_DETACHED=1
  : > "$LOG"
  echo "capture: its own session, log $LOG"
  T0=$(date +%s)
  setsid -w bash "$0" "$@" >> "$LOG" 2>&1 < /dev/null &
  CHILD=$!
  # PAUSE, then check the detached job is alive and is ours - never tail a job that is already gone
  sleep 5
  if ! kill -0 "$CHILD" 2>/dev/null; then
    wait "$CHILD"; RC=$?
    echo "capture: the detached run ended within $(( $(date +%s) - T0 )) s (exit $RC). Its log:"
    cat "$LOG"
    # a real run takes minutes (three Chromes, twelve scenes); a clean exit this fast means it did nothing
    [ "$RC" -eq 0 ] && { echo "capture: exit 0 that fast means no picture was taken - treated as a failure"; exit 2; }
    exit "$RC"
  fi
  # (setsid execs this script in place, or forks once and waits: either way the job's command line carries "$0")
  if ! tr '\0' ' ' < "/proc/$CHILD/cmdline" 2>/dev/null | grep -qF -- "$0"; then
    echo "capture: pid $CHILD is alive but its command line ($(tr '\0' ' ' < "/proc/$CHILD/cmdline" 2>/dev/null)) is not this capture."
    echo "capture: nothing was killed; if a capture is running its log is $LOG"
    exit 2
  fi
  echo "capture: the detached run is alive (pid $CHILD)"
  tail -n +1 -f --pid="$CHILD" "$LOG"
  wait "$CHILD"
  exit $?
fi

# ---- from here on: the detached run ----
cd "$TREE" || exit 2
PIDS="$HERE/.chrome-pids"
: > "$PIDS"
SPID=""
PYPID=""
cleanup() {
  # capture.py first: a TERM makes it close its own Chrome (its finally), then whatever is left of ours goes
  if [ -n "$PYPID" ] && kill -0 "$PYPID" 2>/dev/null; then kill "$PYPID" 2>/dev/null; sleep 3; fi
  [ -n "$SPID" ] && kill "$SPID" 2>/dev/null
  if [ -s "$PIDS" ]; then
    while read -r p; do
      [ -n "$p" ] || continue
      # ours only: a Chrome on an fm-sm3sheet2- profile (a pid can be reused after it ended)
      if tr '\0' ' ' < "/proc/$p/cmdline" 2>/dev/null | grep -q 'fm-sm3sheet2-'; then kill "$p" 2>/dev/null; fi
    done < "$PIDS"
  fi
  rm -f "$PIDS"
}
trap cleanup EXIT
trap 'exit 130' INT TERM HUP

PORT=""
for _ in 1 2 3 4 5; do
  P=$(python3 -c 'import socket; s = socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1]); s.close()')
  [ "$P" = "8777" ] && continue
  if python3 -c 'import socket, sys; s = socket.socket(); sys.exit(0 if s.connect_ex(("127.0.0.1", int(sys.argv[1]))) else 1)' "$P"; then PORT=$P; break; fi
done
[ -n "$PORT" ] || { echo "capture: no free port found"; exit 2; }

SERVE="$TREE/tools/serve.sh"; [ -f "$SERVE" ] || SERVE="$MAIN/tools/serve.sh"
sh "$SERVE" "$PORT" "$TREE" > "$HERE/.serve.log" 2>&1 &
SPID=$!
UP=""
for _ in $(seq 1 80); do
  if python3 -c 'import sys, urllib.request; urllib.request.urlopen("http://127.0.0.1:%s/index.html" % sys.argv[1], timeout=2)' "$PORT" 2>/dev/null; then UP=1; break; fi
  kill -0 "$SPID" 2>/dev/null || break
  sleep 0.25
done
[ -n "$UP" ] || { echo "capture: the server on port $PORT never answered ($SERVE):"; cat "$HERE/.serve.log"; exit 2; }

HEAD=$(git -C "$TREE" rev-parse --short HEAD 2>/dev/null)
[ -n "$(git -C "$TREE" status --porcelain -- js styles.css index.html 2>/dev/null)" ] && HEAD="$HEAD+uncommitted"
echo "capture: serving $TREE ($HEAD) on port $PORT, server pid $SPID"
python3 "$HERE/capture.py" --port "$PORT" --pids "$PIDS" --tree "$HEAD" "$@" &
PYPID=$!
wait "$PYPID"
RC=$?
PYPID=""
rm -f "$HERE/.serve.log"
echo "capture: exit $RC"
exit $RC
