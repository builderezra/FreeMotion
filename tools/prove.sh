#!/bin/bash
# PROVE THE RELEASE BEFORE IT SHIPS — every test the working tree adds or changes must FAIL against
# HEAD's source and PASS against the working tree. Called by tools/ship.sh; runnable alone.
#
#   tools/prove.sh
#
# WHY. Ezra, 5 Sep: "dont assume fixes will work". mutate.sh proves a test by hand-picking one mutation,
# and is voluntary; a session under time pressure skips it and writes "mutation caught" in the log. This
# is the same proof, automatic, for every release, with the one mutation that always makes sense — the
# fix itself, reverted. A release that changes app source must carry at least one test that fails
# without it, or it does not ship. It costs one Chrome run per side (all changed tests run in ONE pass
# via ?only=a%0Ab%0Ac), so about a minute, however many items are batched.
#
# The escape hatch is a declaration he can read: "UNPROVABLE: <why>" in the newest POLISH-LOG line.
# It exists for the genuinely untestable (a comment-only edit, a build-tooling change) and it is a
# visible confession, not a flag.
set -uo pipefail
cd "$(dirname "$0")/.."
[ -f .mutation-in-progress ] && { echo "❌ a mutation is in progress — the tree is not the code"; exit 1; }
WIDTH="${WIDTH:-1280}"
SRC="$(python3 tools/_srcfiles.py --worktree)"   # index.html counts only beyond its version label / ?v= bumps
if [ -z "$SRC" ]; then echo "○ prove: no app source changed (beyond a version label) — nothing to prove"; exit 0; fi
LOGLINE="$(grep '^- v[0-9]' POLISH-LOG.md | tail -1)"
DECLARED=""; printf '%s' "$LOGLINE" | grep -q 'UNPROVABLE:' && DECLARED="$(printf '%s' "$LOGLINE" | grep -o 'UNPROVABLE:.*' | cut -c1-160)"
TITLES="$(python3 tools/_spottests.py --worktree)"
if [ -z "$TITLES" ]; then
  if [ -n "$DECLARED" ]; then echo "⚠️  prove: app source changed and NO test changed — shipping on the declaration: $DECLARED"; exit 0; fi
  echo "❌ NO TEST — app source changed ($(echo "$SRC" | tr '\n' ' ')) but no test in tests/tests.js was added or changed."
  echo "   A fix nobody proved. Add a test that FAILS without the change. Only if the change genuinely has no"
  echo "   testable behaviour, write  UNPROVABLE: <why>  in the newest POLISH-LOG line — he reads that file."
  exit 3
fi
TMP="$(mktemp -d "${TMPDIR:-/tmp}/fm-prove-XXXXXX")"; WT="$TMP/wt"; SRV1=""; SRV2=""
cleanup() { [ -n "$SRV1" ] && kill "$SRV1" 2>/dev/null; [ -n "$SRV2" ] && kill "$SRV2" 2>/dev/null; git worktree remove --force "$WT" >/dev/null 2>&1; rm -rf "$TMP"; }
trap cleanup EXIT INT TERM
printf '%s\n' "$TITLES" > "$TMP/titles"
Q="$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(open(sys.argv[1]).read().rstrip("\n"), safe=""))' "$TMP/titles")"
freeport() { python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1])'; }
waitfor() { for _ in $(seq 1 20); do curl -s -o /dev/null "http://127.0.0.1:$1/tests/run.html" && return 0; sleep 0.5; done; return 1; }

echo "→ prove: $(printf '%s\n' "$TITLES" | wc -l | tr -d ' ') changed test(s) must PASS here and FAIL against HEAD's source"
printf '%s\n' "$TITLES" | sed 's/^/    · /' | cut -c1-120
# CONTROL — the working tree as it will ship
P1="$(freeport)"; ( exec python3 -m http.server "$P1" --bind 127.0.0.1 ) >/dev/null 2>&1 & SRV1=$!
waitfor "$P1" || { echo "prove: could not serve the working tree"; exit 2; }
run() { python3 tests/_cdp.py --url "http://127.0.0.1:$1/tests/run.html?only=$Q" --width "$2" --timeout 600 > "$3" 2>&1; }
run "$P1" "$WIDTH" "$TMP/ctrl"
python3 tools/_spotjudge.py "$TMP/ctrl" "$TMP/titles" > "$TMP/ctrl.v"
# REVERTED — HEAD's source with the working tree's tests
git worktree add -q "$WT" HEAD || { echo "prove: could not create a worktree"; exit 2; }
rsync -a --delete tests/ "$WT/tests/"
P2="$(freeport)"; ( cd "$WT" && exec python3 -m http.server "$P2" --bind 127.0.0.1 ) >/dev/null 2>&1 & SRV2=$!
waitfor "$P2" || { echo "prove: could not serve the HEAD worktree"; exit 2; }
run "$P2" "$WIDTH" "$TMP/rev"
python3 tools/_spotjudge.py "$TMP/rev" "$TMP/titles" > "$TMP/rev.v"

BAD=0; CAUGHT=0; DEADN=0; RETRY=""
while IFS=$'\t' read -r cv ct cr; do
  rv="$(grep -F "$(printf '\t%s' "$ct")" "$TMP/rev.v" | head -1 | cut -f1)"; rr="$(grep -F "$(printf '\t%s' "$ct")" "$TMP/rev.v" | head -1 | cut -f3)"
  case "$cv/$rv" in
    PASS/FAIL) echo "    ✅ CAUGHT  ${ct:0:100}"; echo "         fails without the fix as: ${rr:0:220}"; CAUGHT=$((CAUGHT+1))
               printf '%s' "$rr" | grep -qiE 'seams? (are |is )?missing|missing seam|seam.{0,40}missing|is not a function|not exposed|not reachable|undefined' && echo "         (WEAK: it fails on a missing seam, not on the behaviour — a behavioural assertion would be stronger)";;
    PASS/PASS) echo "    ⚠️ DEAD    ${ct:0:100}"; echo "         still PASSES with the fix reverted — fine for a rename or a removed row; a dead assertion otherwise"; DEADN=$((DEADN+1)); RETRY="$RETRY$ct
";;
    PASS/*)    echo "    ❌ NORUN   ${ct:0:100}"; echo "         reverted side: ${rr:0:200}"; BAD=1;;
    FAIL/*)    echo "    ❌ RED     ${ct:0:100}"; echo "         fails even WITH the fix: ${cr:0:220}"; BAD=1;;
    *)         echo "    ❌ NORUN   ${ct:0:100}"; echo "         ${cr:0:200}"; BAD=1;;
  esac
done < "$TMP/ctrl.v"
# A phone-only test can be a no-op at 1280px and read DEAD for the wrong reason: give a DEAD test one more
# chance at 380px before believing it. (Ship.sh runs the suite at both widths for the same reason.)
if [ -n "$RETRY" ] && [ "$WIDTH" != "380" ]; then
  echo "→ prove: re-checking the DEAD test(s) at 380px in case they only run on a phone…"
  printf '%s' "$RETRY" > "$TMP/titles2"
  Q="$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(open(sys.argv[1]).read().rstrip("\n"), safe=""))' "$TMP/titles2")"
  run "$P1" 380 "$TMP/ctrl2"; python3 tools/_spotjudge.py "$TMP/ctrl2" "$TMP/titles2" > "$TMP/ctrl2.v"
  run "$P2" 380 "$TMP/rev2";  python3 tools/_spotjudge.py "$TMP/rev2"  "$TMP/titles2" > "$TMP/rev2.v"
  while IFS=$'\t' read -r cv ct cr; do
    rv="$(grep -F "$(printf '\t%s' "$ct")" "$TMP/rev2.v" | head -1 | cut -f1)"
    if [ "$cv/$rv" = "PASS/FAIL" ]; then echo "    ✅ CAUGHT at 380px  ${ct:0:90}"; CAUGHT=$((CAUGHT+1)); DEADN=$((DEADN-1)); else echo "    ⚠️ still DEAD at 380px  ${ct:0:90}"; fi
  done < "$TMP/ctrl2.v"
fi
# One catching test per queue item the log line names — a batch of three fixes needs three proofs, not one.
NEED="$(printf '%s' "$LOGLINE" | grep -o 'queue [0-9]\+' | grep -o '[0-9]\+' | sort -u | wc -l | tr -d ' ')"; [ "$NEED" -ge 1 ] || NEED=1
if [ "$BAD" = 0 ] && [ "$CAUGHT" -ge "$NEED" ]; then
  echo "✅ prove: $CAUGHT test(s) fail without their fix and pass with it ($NEED queue item(s) named in the log line)$( [ "$DEADN" -gt 0 ] && echo "; $DEADN changed test(s) do not see the fix — see above")."; exit 0
fi
[ "$BAD" = 0 ] && [ "$CAUGHT" -lt "$NEED" ] && echo "❌ prove: the log line names $NEED queue item(s) but only $CAUGHT changed test(s) catch a reverted fix — every item ships with its own proof."
if [ -n "$DECLARED" ]; then echo "⚠️  prove: NOT PROVEN, shipping on the declaration in the log line: $DECLARED"; exit 0; fi
echo "❌ prove: NOT PROVEN. Fix the test so it sees the bug (or, only if the change genuinely has no testable"
echo "   behaviour, write UNPROVABLE: <why> in the newest POLISH-LOG line — he reads that file)."
exit 1
