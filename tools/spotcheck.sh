#!/bin/bash
# PROVE A SHIPPED FIX AFTER THE FACT — structurally, so "the test caught it" is a measurement, not a memory.
#
#   tools/spotcheck.sh <commit>            # e.g. tools/spotcheck.sh 995c64f
#   tools/spotcheck.sh <commit> --width 380
#
# WHY. On 5 Sep Ezra came back to a fortnight of autonomous releases and said "i think there could be a lot
# of delusion and lack of effort … dont assume fixes will work". Every release's POLISH-LOG line says
# "mutation caught", and nothing in the repo could re-check that claim once the release was out. This can:
#
#   1. a throwaway git worktree is checked out AT THE COMMIT;
#   2. the tests that commit added or changed are found from its own diff (tools/_spottests.py);
#   3. CONTROL — those tests are run at the commit and must PASS (a test that fails even with its fix is
#      not evidence of anything);
#   4. the commit's SOURCE files (index.html, styles.css, js/*.js, …) are reverted to the parent while the
#      TESTS are kept, and the same tests are run again and must FAIL.
#
# A test that still passes without its fix never saw the bug — the release's proof was a ceremony. That is
# the verdict this prints, per test, and appends to tools/.spotcheck.log so the loop can pick the release
# that was checked longest ago. The worktree is removed on a trap (success, failure, Ctrl-C, kill) and is
# served on its own free port, so it never touches the working tree, :8777, or a suite that is running.
set -uo pipefail
cd "$(dirname "$0")/.."
C="${1:?usage: tools/spotcheck.sh <commit> [--width N]}"; shift || true
WIDTH=1280
while [ $# -gt 0 ]; do case "$1" in --width) WIDTH="$2"; shift 2;; *) echo "spotcheck: unknown option $1"; exit 2;; esac; done
H="$(git rev-parse --verify "$C^{commit}" 2>/dev/null)" || { echo "spotcheck: no such commit: $C"; exit 2; }
SHORT="$(git rev-parse --short "$H")"; SUBJ="$(git log -1 --format=%s "$H")"
echo "▶ spotcheck $SHORT — $SUBJ"

SRC="$(python3 tools/_srcfiles.py "$H")"   # index.html counts only beyond its version label / ?v= bumps
if [ -z "$SRC" ]; then
  echo "○ TESTS/DOCS ONLY — this commit changed no app source (beyond a version label), so there is no fix to revert. Nothing to prove."
  printf '%s %s tests-only\n' "$(date '+%Y-%m-%d %H:%M')" "$SHORT" >> tools/.spotcheck.log; exit 0
fi

TITLES="$(python3 tools/_spottests.py "$H")"
if [ -z "$TITLES" ]; then
  echo "❌ NO TEST — this commit changed app source ($(echo "$SRC" | tr '\n' ' ')) and touched no test in tests/tests.js."
  echo "   A fix nobody proved. (If the proof lives in a probe page under tests/, say so in the entry.)"
  printf '%s %s NO-TEST\n' "$(date '+%Y-%m-%d %H:%M')" "$SHORT" >> tools/.spotcheck.log; exit 3
fi

WTROOT="$(mktemp -d "${TMPDIR:-/tmp}/fm-spot-XXXXXX")"; WT="$WTROOT/wt"; SRV=""
cleanup() { [ -n "$SRV" ] && kill "$SRV" 2>/dev/null; git worktree remove --force "$WT" >/dev/null 2>&1; rm -rf "$WTROOT"; }
trap cleanup EXIT INT TERM
git worktree add -q "$WT" "$H" || { echo "spotcheck: could not create a worktree"; exit 2; }
PORT="$(python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1])')"
( cd "$WT" && exec python3 -m http.server "$PORT" --bind 127.0.0.1 ) >/dev/null 2>&1 &
SRV=$!
for _ in 1 2 3 4 5 6 7 8 9 10; do curl -s -o /dev/null "http://127.0.0.1:$PORT/tests/run.html" && break; sleep 0.5; done

run_one() {  # $1 = title -> "PASS|summary" / "FAIL|summary failures" / "NORUN|why"
  local q out sum ran
  q="$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1], safe=""))' "$1")"
  out="$(python3 tests/_cdp.py --url "http://127.0.0.1:$PORT/tests/run.html?only=$q" --width "$WIDTH" --timeout 300 2>&1)"
  sum="$(printf '%s' "$out" | grep -o '"summary": "[^"]*"' | head -1 | sed 's/"summary": //')"
  ran="$(printf '%s' "$sum" | grep -oE 'Regression [0-9]+/[0-9]+' | grep -oE '/[0-9]+' | tr -d /)"
  if [ -z "$sum" ]; then echo "NORUN|$(printf '%s' "$out" | grep -o '"error": "[^"]*"' | head -1)"; return; fi
  if [ -z "$ran" ] || [ "$ran" = "0" ]; then echo "NORUN|$sum"; return; fi
  if printf '%s' "$out" | grep -q '"ok": true'; then echo "PASS|$sum"; return; fi
  echo "FAIL|$sum :: $(printf '%s' "$out" | python3 -c 'import sys,json
raw=sys.stdin.read(); i=raw.find("{")
try: d=json.loads(raw[i:]); f=d.get("failures") or []; print((f[0] if f else "").replace("\n"," ")[:400])
except Exception: print("(could not read the failure text)")')"
}
# A test that fails WITHOUT its fix because a seam the fix ADDED is missing ("seam missing", "is not a
# function", "undefined") has caught the absence of the code, not the bug. Still a fail, but a weaker proof
# than a behavioural one — say so, so nobody reads WEAK as PROVEN by mistake.
weak() { printf '%s' "$1" | grep -qiE "seam missing|is not a function|not exposed|undefined|null" && echo " (WEAK: fails on a missing seam, not on the behaviour)"; }

VERDICT=0; RESULTS=""; CAUGHT=0
echo "  tests under check:"; printf '%s\n' "$TITLES" | sed 's/^/    · /'
echo "→ control: at $SHORT, with its fix (must PASS)…"
CTRL=()
while IFS= read -r t; do
  r="$(run_one "$t")"; CTRL+=("$r")
  echo "    ${r%%|*}  ${t:0:90}"; [ "${r%%|*}" = "PASS" ] || echo "         ${r#*|}"
done <<< "$TITLES"

echo "→ reverting the commit's SOURCE to its parent (tests kept): $(echo "$SRC" | tr '\n' ' ')"
( cd "$WT" && git checkout -q "$H^" -- $SRC ) || { echo "spotcheck: revert failed"; exit 2; }
echo "→ same tests without the fix (must FAIL)…"
i=0
while IFS= read -r t; do
  r="$(run_one "$t")"; c="${CTRL[$i]%%|*}"; v="${r%%|*}"; i=$((i+1))
  case "$c/$v" in
    PASS/FAIL)  tag="CAUGHT"; CAUGHT=$((CAUGHT+1));;
    PASS/PASS)  tag="DEAD";;
    PASS/NORUN) tag="NORUN"; VERDICT=1;;
    *)          tag="NO-CONTROL"; VERDICT=1;;
  esac
  case "$tag" in CAUGHT) mark="✅";; DEAD) mark="⚠️";; *) mark="❌";; esac
  echo "    $mark $tag  ${t:0:90}"
  [ "$tag" = "CAUGHT" ] && echo "         fails as: $(printf '%s' "${r#*|}" | cut -c1-300)$(weak "${r#*|}")"
  [ "$tag" = "DEAD" ] && echo "         still PASSES with the fix reverted — fine for a rename or a removed row; a dead assertion otherwise"
  [ "$tag" = "NORUN" ] && echo "         ${r#*|}"
  [ "$tag" = "NO-CONTROL" ] && echo "         the control did not pass, so this test proves nothing either way"
  RESULTS="$RESULTS $tag"
done <<< "$TITLES"
[ "$CAUGHT" -ge 1 ] || VERDICT=1
if [ "$VERDICT" = 0 ]; then echo "✅ $SHORT PROVEN — $CAUGHT test(s) fail without the fix and pass with it$( [ "$CAUGHT" -lt "$(printf '%s\n' "$TITLES" | wc -l | tr -d ' ')" ] && echo "; the other changed test(s) do not see it — see above")."
else echo "❌ $SHORT NOT PROVEN — no changed test fails with the fix reverted (or a control failed). The release claimed a proof it did not have."; fi
FINAL=PROVEN; [ "$VERDICT" = 0 ] || FINAL=NOT-PROVEN
printf '%s %s %s%s\n' "$(date '+%Y-%m-%d %H:%M')" "$SHORT" "$FINAL" "$RESULTS" >> tools/.spotcheck.log
exit $VERDICT
