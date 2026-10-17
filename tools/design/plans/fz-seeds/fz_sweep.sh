#!/bin/bash
# THE S1 CONVERGENCE FUZZ OVER A RANGE OF SEEDS (hunt/fz-seeds) — a port of hunt/fuzz-seeds' fz_range.sh + fz_seed.sh, which
# pointed at a private scratchpad and a private copy of the driver. This one serves THIS tree with tools/serve.sh on a free
# port and drives it with tests/_cdp.py.
#
#   bash tools/design/plans/fz-seeds/fz_sweep.sh FIRST LAST [WIDTH] [OUT]
#   bash tools/design/plans/fz-seeds/fz_sweep.sh 1 150            # what hunt/fuzz-seeds measured on v17.34
#
# `?seed=N` on tests/run.html picks the seed of the pinned test only ('921 S1 convergence fuzz: …'); its default stays
# 20260923. Each seed is one Chrome run of that one test. One line per seed in OUT: "N PASS", "N FAIL <the failure>" or
# "N ERR <why>" — an ERR is not a pass (the run did not finish, or that test did not run at all).
#
# ⚠️ A TEST RUNNER. Never beside ship.sh, a mutation, a spotcheck or another heavy job (CLAUDE.md: no agents beside
# ship.sh), and on the laptop mind the heat after long stretches.
set -uo pipefail
cd "$(dirname "$0")/../../../.." || exit 2
for f in .ship-in-progress .mutation-in-progress .spotcheck-in-progress; do
  [ -f "$f" ] && { echo "fz_sweep: $f exists — the tree is busy, not now"; exit 10; }
done
FIRST="${1:?usage: fz_sweep.sh FIRST LAST [WIDTH] [OUT]}"; LAST="${2:?usage: fz_sweep.sh FIRST LAST [WIDTH] [OUT]}"
WIDTH="${3:-1280}"
OUT="${4:-tools/design/plans/fz-seeds/sweep_${FIRST}_${LAST}_${WIDTH}.txt}"
HERE="$(dirname "$0")"
PORT="$(python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1])')"
( exec tools/serve.sh "$PORT" ) >/dev/null 2>&1 &
SRV=$!
trap 'kill "$SRV" 2>/dev/null' EXIT INT TERM
up=0
for _ in $(seq 1 20); do curl -s -o /dev/null "http://127.0.0.1:$PORT/tests/run.html" && { up=1; break; }; sleep 0.5; done
[ "$up" = 1 ] || { echo "fz_sweep: could not serve the tree on $PORT"; exit 2; }
: > "$OUT"
pass=0; fail=0; err=0
for s in $(seq "$FIRST" "$LAST"); do
  raw="$(python3 tests/_cdp.py --url "http://127.0.0.1:$PORT/tests/run.html?only=921%20S1%20convergence%20fuzz&seed=$s" --width "$WIDTH" --names --timeout 900 2>&1)"
  v="$(printf '%s' "$raw" | python3 "$HERE/fz_verdict.py")"
  case "$v" in PASS*) pass=$((pass+1));; FAIL*) fail=$((fail+1));; *) err=$((err+1));; esac
  echo "$s $v" | tee -a "$OUT" | cut -c1-200
done
echo "END pass=$pass fail=$fail err=$err (seeds $FIRST-$LAST, width $WIDTH)" | tee -a "$OUT"
