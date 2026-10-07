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
# fm_chrome / fm_require below; a missing helper is a refusal like any other here: no verdict, nothing logged
. tools/_platform.sh || { echo "spotcheck: tools/_platform.sh is missing — no verdict, nothing logged"; exit 2; }
C="${1:?usage: tools/spotcheck.sh <commit> [--width N]}"; shift || true
WIDTH=1280
while [ $# -gt 0 ]; do case "$1" in --width) WIDTH="$2"; shift 2;; *) echo "spotcheck: unknown option $1"; exit 2;; esac; done
H="$(git rev-parse --verify "$C^{commit}" 2>/dev/null)" || { echo "spotcheck: no such commit: $C"; exit 2; }
SHORT="$(git rev-parse --short "$H")"; SUBJ="$(git log -1 --format=%s "$H")"
echo "▶ spotcheck $SHORT — $SUBJ"

# index.html counts only beyond its version label / ?v= bumps. A helper that could not answer must not be logged as
# "tests-only" — tick.sh would count that as checked and the proof debt would vanish (6 Oct).
SRC="$(python3 tools/_srcfiles.py "$H")" || { echo "spotcheck: could not list $SHORT's app source (the reason is above) — no verdict, nothing logged"; exit 2; }
if [ -z "$SRC" ]; then
  echo "○ TESTS/DOCS ONLY — this commit changed no app source (beyond a version label), so there is no fix to revert. Nothing to prove."
  printf '%s %s tests-only\n' "$(date '+%Y-%m-%d %H:%M')" "$SHORT" >> tools/.spotcheck.log; exit 0
fi

TITLES="$(python3 tools/_spottests.py "$H")" || { echo "spotcheck: could not list $SHORT's changed tests (the reason is above) — no verdict, nothing logged"; exit 2; }
if [ -z "$TITLES" ]; then
  echo "❌ NO TEST — this commit changed app source ($(echo "$SRC" | tr '\n' ' ')) and touched no test in tests/tests.js."
  echo "   A fix nobody proved. (If the proof lives in a probe page under tests/, say so in the entry.)"
  printf '%s %s NO-TEST\n' "$(date '+%Y-%m-%d %H:%M')" "$SHORT" >> tools/.spotcheck.log; exit 3
fi

WTROOT="$(mktemp -d "${TMPDIR:-/tmp}/fm-spot-XXXXXX")"; WT="$WTROOT/wt"; SRV=""
cleanup() { rm -f .spotcheck-in-progress; [ -n "$SRV" ] && kill "$SRV" 2>/dev/null; git worktree remove --force "$WT" >/dev/null 2>&1; rm -rf "$WTROOT"; }
trap cleanup EXIT INT TERM
# ONE SUITE AT A TIME (5 Sep): refuse while a ship is running, and hold a lock so a ship refuses while this runs — see tools/ship.sh.
[ -f .ship-in-progress ] && { echo "spotcheck: a ship is in progress (.ship-in-progress) — not starting a second suite beside it"; exit 4; }
touch .spotcheck-in-progress
git worktree add -q "$WT" "$H" || { echo "spotcheck: could not create a worktree"; exit 2; }
# THE RUNNER AT THIS COMMIT MUST KNOW ?only= (added 2 Sep, v15.0x). Before that a filtered URL ran the WHOLE suite, so
# the "control" was a 1,000-test run against a 300 s budget and six releases (v13.88–v14.40) were logged NOT-PROVEN
# NO-CONTROL on 5 Sep for a limitation of this tool, not a fault of theirs. Say so instead of accusing.
if ! grep -q "qs.get('only')" "$WT/tests/tests.js" 2>/dev/null; then
  echo "○ PRE-FILTER — the test runner at $SHORT predates ?only= (2 Sep), so its tests cannot be run in isolation here."
  echo "   Nothing is proven or disproven about this release by this tool. (Its tests still run in every full suite.)"
  printf '%s %s pre-filter\n' "$(date '+%Y-%m-%d %H:%M')" "$SHORT" >> tools/.spotcheck.log; exit 0
fi
# ⚠️ A MACHINE THAT CANNOT RUN THE SUITE MUST NOT LEAVE A VERDICT (6 Oct, the WSL port). With no Chrome, no curl or a server
# that never came up, every run below came back "did not run", the control read NO-CONTROL, and `<hash> NOT-PROVEN
# NO-CONTROL` went into tools/.spotcheck.log — which tick.sh lists as an OPEN DEFECT in that release, for good. A missing
# tool is this machine's fault, not the release's: say so and log nothing, the same as the git failures above.
fm_chrome >/dev/null || { echo "spotcheck: no Chrome to run the tests in (the reason is above) — no verdict, nothing logged"; exit 2; }
fm_require curl || { echo "spotcheck: cannot tell when the worktree's server is up — no verdict, nothing logged"; exit 2; }
PORT="$(python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1])')"
# 🚨 tools/serve.sh, NOT `python3 -m http.server` (21 Sep) — same reason prove.sh was fixed: the
# stdlib accept queue is 5, this page pulls ~71 scripts, and a refused one half-loads the app so the
# red lands on an innocent test. A spot-check that cannot be trusted is worse than none.
( exec "$(dirname "$0")/serve.sh" "$PORT" "$WT" ) >/dev/null 2>&1 &
SRV=$!
# up to 10 s, as prove.sh waits — and a server that never answered is a refusal, not a run against nothing (it was a quiet
# fall-through into the runs, which then all read "did not run")
UP=0
for _ in $(seq 1 20); do curl -s -o /dev/null "http://127.0.0.1:$PORT/tests/run.html" && { UP=1; break; }; sleep 0.5; done
[ "$UP" = 1 ] || { echo "spotcheck: the worktree's server (tools/serve.sh) never answered on port $PORT — no verdict, nothing logged"; exit 2; }
# the same question after a run that did not run: is it still this machine that cannot run anything?
env_ok() { fm_chrome >/dev/null && curl -s -o /dev/null "http://127.0.0.1:$PORT/tests/run.html"; }

run_one() {  # $1 = title -> "PASS|summary" / "FAIL|summary failures" / "NORUN|summary (0 tests ran)" / "NOSUITE|why"
  # NOSUITE = the runner did NOT run to a verdict (tests/_cdp.py's exit 2 "error": no Chrome, no server, a launch failure,
  # a timeout). Kept apart from NORUN (the page ran and matched no test) because only NOSUITE can be the machine's fault.
  local q out sum ran why
  q="$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1], safe=""))' "$1")"
  out="$(python3 tests/_cdp.py --url "http://127.0.0.1:$PORT/tests/run.html?only=$q" --width "$WIDTH" --timeout 300 2>&1)"
  sum="$(printf '%s' "$out" | grep -o '"summary": "[^"]*"' | head -1 | sed 's/"summary": //')"
  ran="$(printf '%s' "$sum" | grep -oE 'Regression [0-9]+/[0-9]+' | grep -oE '/[0-9]+' | tr -d /)"
  if [ -z "$sum" ]; then
    why="$(printf '%s' "$out" | grep -o '"error": "[^"]*"' | head -1)"
    [ -n "$why" ] || why="(no answer from tests/_cdp.py; its last line: $(printf '%s\n' "$out" | tail -1 | cut -c1-200))"
    echo "NOSUITE|$why"; return
  fi
  if [ -z "$ran" ] || [ "$ran" = "0" ]; then echo "NORUN|$sum"; return; fi
  # NOT RUN HERE (6 Oct, tests.js notRunHere): the test needs what THIS machine lacks. Absent from the failures, it used to
  # read PASS; it is this machine's limit, not the release's — the callers below log no verdict for it.
  why="$(printf '%s' "$out" | python3 -c 'import sys,json
raw=sys.stdin.read(); i=raw.find("{")
try: d=json.loads(raw[i:])
except Exception: d={}
nr=d.get("notRun") or []
print(("NOT RUN HERE: " + nr[0].get("name","")[:80] + " — " + str(nr[0].get("reason",""))[:200]) if nr else "")' 2>/dev/null)"
  if [ -n "$why" ]; then echo "NOTHERE|$why"; return; fi
  if grep -q '"ok": true' <<<"$out"; then echo "PASS|$sum"; return; fi
  echo "FAIL|$sum :: $(printf '%s' "$out" | python3 -c 'import sys,json
raw=sys.stdin.read(); i=raw.find("{")
try: d=json.loads(raw[i:]); f=d.get("failures") or []; print((f[0] if f else "").replace("\n"," ")[:400])
except Exception: print("(could not read the failure text)")')"
}
# A test that fails WITHOUT its fix because a seam the fix ADDED is missing ("seam missing", "is not a
# function", "undefined") has caught the absence of the code, not the bug. Still a fail, but a weaker proof
# than a behavioural one — say so, so nobody reads WEAK as PROVEN by mistake.
weak() { grep -qiE "seams? (are |is )?missing|missing seam|seam.{0,40}missing|is not a function|not exposed|not reachable|undefined|null" <<<"$1" && echo " (WEAK: fails on a missing seam, not on the behaviour)"; }

VERDICT=0; RESULTS=""; CAUGHT=0
echo "  tests under check:"; printf '%s\n' "$TITLES" | sed 's/^/    · /'
echo "→ control: at $SHORT, with its fix (must PASS)…"
CTRL=()
while IFS= read -r t; do
  r="$(run_one "$t")"; CTRL+=("$r")
  echo "    ${r%%|*}  ${t:0:90}"; [ "${r%%|*}" = "PASS" ] || echo "         ${r#*|}"
  # A control that did not run is no evidence about the release either way WHEN THE MACHINE IS WHY (Chrome or the server gone):
  # no verdict, nothing logged. ⚠️ BUT ASK, THE WAY THE REVERTED SIDE ASKS (6 Oct, the PM's port review). NOSUITE also covers
  # _cdp.py's own timeout — a changed test that HANGS, or now takes past 300 s — and with Chrome and the server healthy that
  # is the release's, not the machine's: it is NO-CONTROL below (logged NOT-PROVEN), as it was before the port. Blaming the
  # machine every time meant a hanging test was never recorded, and every later spot-check of it repeated the excuse.
  if [ "${r%%|*}" = NOSUITE ]; then
    env_ok || { echo "spotcheck: the control did not run to a verdict, and Chrome or the server is gone (above) — not $SHORT. No verdict, nothing logged."; exit 2; }
    echo "         Chrome and the server are fine, so this is the test's own (a hang, or past the 300 s budget): NO-CONTROL."
  fi
  # a test this machine cannot run (NOT RUN HERE) proves nothing about the release either way: no verdict, nothing logged
  if [ "${r%%|*}" = NOTHERE ]; then
    echo "spotcheck: ${t:0:80} cannot run on this machine (${r#*|}) — not $SHORT's fault. No verdict, nothing logged; check it where it runs."
    exit 2
  fi
done <<< "$TITLES"

echo "→ reverting the commit's SOURCE to its parent (tests kept): $(echo "$SRC" | tr '\n' ' ')"
# A file the commit ADDED has no parent version to check out — "pathspec did not match" killed the whole check
# (v16.23, which added js/ai-chat.js). Reverting an addition means removing the file, so do that instead.
for f in $SRC; do
  if ( cd "$WT" && git cat-file -e "$H^:$f" 2>/dev/null ); then
    ( cd "$WT" && git checkout -q "$H^" -- "$f" ) || { echo "spotcheck: revert failed on $f"; exit 2; }
  else
    ( cd "$WT" && rm -f -- "$f" ) && echo "   (added by the commit, so removed: $f)"
  fi
done
echo "→ same tests without the fix (must FAIL)…"
i=0
while IFS= read -r t; do
  r="$(run_one "$t")"; c="${CTRL[$i]%%|*}"; v="${r%%|*}"; i=$((i+1))
  case "$c/$v" in
    PASS/FAIL)  tag="CAUGHT"; CAUGHT=$((CAUGHT+1));;
    PASS/PASS)  tag="DEAD";;
    PASS/NORUN) tag="NORUN"; VERDICT=1;;
    # did not run WITHOUT the fix: if Chrome or the server is gone now, that is this machine — no verdict. Otherwise (the
    # reverted app hung, say) it is the NORUN it always was.
    PASS/NOSUITE)
      env_ok || { echo "spotcheck: the run without the fix did not run, and Chrome or the server is gone (above) — not $SHORT. No verdict, nothing logged."; exit 2; }
      tag="NORUN"; VERDICT=1;;
    PASS/NOTHERE)
      echo "spotcheck: without the fix, ${t:0:80} could not run on this machine (${r#*|}) — no verdict, nothing logged."; exit 2;;
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
