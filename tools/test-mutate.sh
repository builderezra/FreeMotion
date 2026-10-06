#!/bin/bash
# ═══ mutate.sh's OWN TEST ═══════════════════════════════════════════════════════════════════════════
#
#   tools/test-mutate.sh        # seconds; touches nothing outside a temp directory; no browser
#
# WHY. mutate.sh's FULL mode runs the whole suite twice, so nobody can afford to watch its edge cases happen for real —
# and its edge cases are exactly the silent ones: a run that TIMED OUT read as "SURVIVED — the assertion is DEAD" (an
# accusation against a good test), a cap of 1800 s that every full pass (2697 s) outgrew, a detached run whose verdict
# has to be read from a log. So the real mutate.sh runs here against a STUB tests/_cdp.py that answers instantly — green,
# red, timed out, did not run, zero tests — from what is on disk, the way the real suite would. (The --only mode is proven
# on a real slice in a real Chrome; see the commit that added this file.)
set -uo pipefail
cd "$(dirname "$0")/.."
REPO="$PWD"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/fm-mutate-test-XXXXXX")"
cleanup() { pkill -f "$TMP" 2>/dev/null; rm -rf "$TMP"; }
trap cleanup EXIT
FAILED=0
ok()  { printf '  ✅ %s\n' "$1"; }
bad() { printf '  ❌ %s\n' "$1"; FAILED=1; }

S="$TMP/repo"; mkdir -p "$S/tools" "$S/tests" "$S/js"
cp "$REPO/tools/mutate.sh" "$REPO/tools/_shiplock.sh" "$REPO/tools/_testfloor.sh" "$REPO/tools/_spotjudge.py" "$REPO/tools/serve.sh" "$S/tools/"
cat > "$S/tests/_cdp.py" <<'STUB'
#!/usr/bin/env python3
# STUB driver: answers at once, from the tree on disk. Mode in stub-mode: normal | red | timeout | timeout-mutated | error | zero-mutated
import json, sys, urllib.parse, os
args = sys.argv[1:]
def opt(n, d=None):
    return args[args.index(n) + 1] if n in args else d
url, timeout, names = opt('--url', ''), opt('--timeout', '?'), '--names' in args
open('stub-calls', 'a').write('timeout=%s url=%s\n' % (timeout, url))
mode = open('stub-mode').read().strip() if os.path.exists('stub-mode') else 'normal'
mutated = 'MUTATED' in open('js/a.js').read()
if mode == 'timeout' or (mode == 'timeout-mutated' and mutated):
    print(json.dumps({"ok": False, "error": "suite did not finish within %ss" % timeout, "lastTest": "t-catches"})); sys.exit(2)
if mode == 'error':
    print(json.dumps({"ok": False, "error": "nothing is serving that url"})); sys.exit(2)
tests = ['t-catches the defect', 't-other']
only = urllib.parse.parse_qs(urllib.parse.urlparse(url).query).get('only', [''])[0]
if only:
    want = [o for o in only.split('\n') if o]
    tests = [t for t in tests if any(o in t for o in want)]
if mode == 'zero-mutated' and mutated: tests = []
fails = []
ran = []
for t in tests:
    bad = (t.startswith('t-catches') and mutated) or (mode == 'red' and t.startswith('t-catches'))
    ran.append({"name": t, "ok": not bad, "pending": False})
    if bad: fails.append('FAIL' + t + ' — saw the defect')
n = len(tests); p = n - len(fails)
out = {"ok": not fails, "summary": "Regression %d/%d %s" % (p, n, '✓' if not fails else '✗'), "failures": fails, "slowest": [], "sceneLeaks": []}
if names: out["ran"] = ran
print(json.dumps(out)); sys.exit(0 if not fails else 1)
STUB
echo '<html><span class="ver">v1.2</span></html>' > "$S/index.html"
echo 'run' > "$S/tests/run.html"; echo '// tests' > "$S/tests/tests.js"
printf 'function a() {\n  return 1;\n}\nvar b = 2;\n' > "$S/js/a.js"
echo 10 > "$S/tools/.suite-seconds"; echo 1 > "$S/tools/.test-floor"
cd "$S" || exit 1
git init -q . && git config user.email t@t && git config user.name t && git add -A && git commit -q -m base
ORIG="$(shasum js/a.js)"

# run full mode, then wait for its detached verdict; prints the log, returns MUTATE EXIT's code
full() {
  local out rc
  out="$(tools/mutate.sh "$@" 2>&1)"; rc=$?
  [ "$rc" = 11 ] || { echo "LAUNCH-RC=$rc $out"; return 99; }
  printf '%s' "$out" | grep -q '^LAUNCHED - NO verdict yet' || { echo "no LAUNCHED line: $out"; return 98; }
  for _ in $(seq 1 120); do grep -q '^MUTATE EXIT' .claude/mutate/mutate.log 2>/dev/null && break; sleep 0.25; done
  cat .claude/mutate/mutate.log
  return "$(sed -n 's/^MUTATE EXIT //p' .claude/mutate/mutate.log | tail -1)"
}
restored() { [ "$(shasum js/a.js)" = "$ORIG" ] && [ ! -f .mutation-in-progress ]; }

echo "── full mode: launched detached (exit 11), verdict in the log ──"
log="$(full js/a.js 'return 1;' 'return 1; /*MUTATED*/' 't-catches')"; rc=$?
[ "$rc" = 0 ] && printf '%s' "$log" | grep -q 'CAUGHT' && restored && ok "a mutation the suite catches: LAUNCHED, then MUTATE EXIT 0 CAUGHT, file restored" || bad "caught: rc=$rc — $log"
grep -q 'timeout=3600 ' stub-calls && ok "cap = max(3600, 1.6 × tools/.suite-seconds): 3600 when the last pass was 10 s" || bad "cap: $(cat stub-calls)"
log="$(full js/a.js 'var b = 2;' 'var b = 3; /*NOT-SEEN*/')"; rc=$?
[ "$rc" = 1 ] && printf '%s' "$log" | grep -q 'SURVIVED' && restored && ok "a mutation nothing sees: MUTATE EXIT 1 SURVIVED, file restored" || bad "survived: rc=$rc — $log"

echo "── a run that did not finish is never a verdict ──"
echo timeout-mutated > stub-mode
log="$(full js/a.js 'return 1;' 'return 1; /*MUTATED*/')"; rc=$?
[ "$rc" = 8 ] && printf '%s' "$log" | grep -q 'TIMED OUT - nothing proven either way' && ! printf '%s' "$log" | grep -q 'SURVIVED' && restored \
  && ok "the mutated run TIMES OUT → \"TIMED OUT - nothing proven either way\", exit 8, never SURVIVED" || bad "mutated timeout: rc=$rc — $log"
echo timeout > stub-mode; rm -f tools/.mutate-green; echo 3000 > tools/.suite-seconds; : > stub-calls
log="$(full js/a.js 'return 1;' 'return 1; /*MUTATED*/')"; rc=$?
[ "$rc" = 8 ] && printf '%s' "$log" | grep -q 'TIMED OUT' && ! printf '%s' "$log" | grep -q 'NO TESTS\|REGISTERED NO TESTS' && restored \
  && ok "the BASELINE times out → TIMED OUT, exit 8, never \"no tests\"" || bad "baseline timeout: rc=$rc — $log"
grep -q 'timeout=4800 ' stub-calls && ok "cap grows with the suite: 4800 when the last pass was 3000 s" || bad "cap: $(cat stub-calls)"
echo 10 > tools/.suite-seconds
echo error > stub-mode
log="$(full js/a.js 'return 1;' 'return 1; /*MUTATED*/')"; rc=$?
[ "$rc" = 8 ] && printf '%s' "$log" | grep -q 'DID NOT RUN' && restored && ok "a run that never started → DID NOT RUN, exit 8" || bad "did not run: rc=$rc — $log"
echo zero-mutated > stub-mode
log="$(full js/a.js 'return 1;' 'return 1; /*MUTATED*/')"; rc=$?
[ "$rc" = 8 ] && ! printf '%s' "$log" | grep -q 'SURVIVED' && restored && ok "a mutated tree that registers NO tests → exit 8, never SURVIVED" || bad "zero tests: rc=$rc — $log"

echo "── the four old gates still refuse ──"
echo red > stub-mode; rm -f tools/.mutate-green
log="$(full js/a.js 'return 1;' 'return 1; /*MUTATED*/')"; rc=$?
[ "$rc" = 5 ] && printf '%s' "$log" | grep -q 'ALREADY RED' && restored && ok "green-before: a red tree → exit 5" || bad "red baseline: rc=$rc — $log"
echo normal > stub-mode
out="$(tools/mutate.sh js/a.js 'return 9;' 'x' 2>&1)"; rc=$?; [ "$rc" = 3 ] && ok "found: a missing old string → exit 3, nothing launched" || bad "not found: rc=$rc — $out"
printf 'var c = 1;\nvar c = 1;\n' >> js/a.js; git commit -qam dup; ORIG="$(shasum js/a.js)"
out="$(tools/mutate.sh js/a.js 'var c = 1;' 'x' 2>&1)"; rc=$?; [ "$rc" = 4 ] && ok "unique: an ambiguous old string → exit 4" || bad "ambiguous: rc=$rc — $out"
out="$(tools/mutate.sh js/a.js 'return 1;' 'return 1;' 2>&1)"; rc=$?; [ "$rc" = 7 ] && ok "changed-something: old == new → exit 7" || bad "no change: rc=$rc — $out"

echo "── it refuses beside a ship, a spot-check or a live mutation ──"
printf 'pid=%s phase=desktop since=1\n' "$$" > .ship-in-progress
out="$(tools/mutate.sh js/a.js 'return 1;' 'return 2;' 2>&1)"; rc=$?
[ "$rc" = 10 ] && ok "a ship lock → exit 10 ($(printf '%s' "$out" | head -1 | cut -c1-70)…)" || bad "ship lock: rc=$rc — $out"
rm -f .ship-in-progress; touch .spotcheck-in-progress
out="$(tools/mutate.sh --only 't-catches' js/a.js 'return 1;' 'return 2;' 't-catches' 2>&1)"; rc=$?
[ "$rc" = 10 ] && ok "a spot-check lock → exit 10, in --only mode too" || bad "spotcheck lock: rc=$rc — $out"
rm -f .spotcheck-in-progress

echo "── --only: a title that does not run refuses; a KILLED mutation is put back first ──"
out="$(tools/mutate.sh --only 't-catches
no such title' js/a.js 'return 1;' 'return 1; /*MUTATED*/' 't-catches' 2>&1)"; rc=$?
[ "$rc" = 9 ] && restored && ok "a named title that ran nothing → exit 9 (the count alone said 1/1 green)" || bad "norun: rc=$rc — $out"
out="$(tools/mutate.sh --only 't-catches' js/a.js 'return 1;' 'return 1; /*MUTATED*/' 't-catches' 2>&1)"; rc=$?
[ "$rc" = 0 ] && restored && ok "--only CAUGHT → exit 0" || bad "--only caught: rc=$rc — $out"
mutate_by_hand() { perl -pi -e 's{return 1;}{return 1; /*MUTATED*/}' js/a.js; }   # perl: same on macOS and Linux
cp js/a.js "$TMP/a.orig"; mutate_by_hand
printf 'MUTATION IN PROGRESS on js/a.js\npid=999999\nfile=js/a.js\nbak=%s\nsha=%s\nsrv=\nport=\n' "$TMP/a.orig" "$(shasum js/a.js | cut -d' ' -f1)" > .mutation-in-progress
out="$(tools/mutate.sh --restore 2>&1)"; rc=$?
[ "$rc" = 0 ] && restored && printf '%s' "$out" | grep -q 'KILLED mutation' && ok "--restore puts back a file a KILLED mutation left mutated" || bad "restore: rc=$rc — $out"
cp js/a.js "$TMP/a.orig"; mutate_by_hand; M="$(shasum js/a.js | cut -d' ' -f1)"; echo '// someone else edited this' >> js/a.js
printf 'MUTATION IN PROGRESS on js/a.js\npid=999999\nfile=js/a.js\nbak=%s\nsha=%s\nsrv=\nport=\n' "$TMP/a.orig" "$M" > .mutation-in-progress
out="$(tools/mutate.sh --restore 2>&1)"; rc=$?
[ "$rc" = 10 ] && grep -q 'someone else edited this' js/a.js && ok "…but refuses (exit 10) rather than overwrite edits made after the kill" || bad "restore over edits: rc=$rc — $out"

echo
if [ "$FAILED" = 0 ]; then echo "✅ mutate.sh: every check passed"; exit 0; fi
echo "❌ mutate.sh: a check failed — see above"; exit 1
