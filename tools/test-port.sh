#!/bin/bash
# ═══ THE PORT'S OWN TEST: NOT RUN HERE, and the review's fixes to the gates and the driver ═════════════════════════════
#
#   tools/test-port.sh        # seconds; temp directories only; no browser, no network
#
# WHY (6 Oct, the move to the Windows laptop — #1071, the PM's tools/design/pm/port-wsl-review.json). The port made the tools
# run on Linux/WSL, and the review found the places where a machine difference could still read as a verdict: a NOT RUN
# test read as PASS by the judges, a gate that matched the wrong line, a reaper that silently matched nothing. Every one is
# silent when it goes wrong, so each is run here against a fixture that separates right from wrong. Where a case needs the
# OTHER machine, `uname` is shimmed on PATH (the tools ask uname, so the shim is the machine they see).
set -uo pipefail
cd "$(dirname "$0")/.."
REPO="$PWD"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/fm-port-test-XXXXXX")"
trap 'rm -rf "$TMP"' EXIT
FAILED=0
ok()  { printf '  ✅ %s\n' "$1"; }
bad() { printf '  ❌ %s\n' "$1"; FAILED=1; }
# a `uname` that answers $1 for -s (and passes everything else to the real one)
shim_os() {
  mkdir -p "$TMP/shim-$1"
  printf '#!/bin/sh\nif [ "${1:-}" = "-s" ]; then echo %s; else exec /usr/bin/uname "$@"; fi\n' "$1" > "$TMP/shim-$1/uname"
  chmod +x "$TMP/shim-$1/uname"
  echo "$TMP/shim-$1"
}

echo "── NOT RUN HERE: the judges read a not-run test as did-not-run, never PASS or FAIL ──"
T1="$TMP/titles"; printf 'aac test\nplain test\n' > "$T1"
# count-only path (prove.sh): the not-run test is absent from the failures, which used to read PASS
cat > "$TMP/r1.json" <<'J'
{"ok": true, "summary": "Regression 1/2 ✓ · NOT RUN HERE 1", "failures": [], "notRun": [{"name": "aac test", "item": "215", "reason": "needs an AAC audio encoder"}]}
J
v="$(python3 tools/_spotjudge.py "$TMP/r1.json" "$T1")"
printf '%s\n' "$v" | grep -q $'^NORUN\taac test\tNOT RUN HERE: needs an AAC' && ok "_spotjudge (count path): a NOT RUN test is NORUN with its reason, never PASS" || bad "_spotjudge count path: $v"
printf '%s\n' "$v" | grep -q $'^PASS\tplain test' && ok "…and the test that ran is still PASS" || bad "_spotjudge count path, control: $v"
# names path (mutate.sh --only): ok is false for it, which used to read FAIL — i.e. CAUGHT
cat > "$TMP/r2.json" <<'J'
{"ok": true, "summary": "Regression 1/2 ✓", "failures": [], "notRun": [{"name": "aac test", "item": "215", "reason": "needs an AAC audio encoder"}],
 "ran": [{"name": "aac test", "ok": false, "pending": false, "notRun": "needs an AAC audio encoder"}, {"name": "plain test", "ok": true, "pending": false}]}
J
v="$(python3 tools/_spotjudge.py "$TMP/r2.json" "$T1")"
printf '%s\n' "$v" | grep -q $'^NORUN\taac test' && ! printf '%s\n' "$v" | grep -q $'^FAIL' && ok "_spotjudge (names path): NORUN, never FAIL (a FAIL here would read as CAUGHT)" || bad "_spotjudge names path: $v"

echo "── NOT RUN HERE: ship.sh lists them by name after a pass, and the Mac refuses on one ──"
. tools/_platform.sh; . tools/_testfloor.sh
l="$(notrun_list "$(cat "$TMP/r1.json")")"
[ "$l" = "$(printf 'aac test\tneeds an AAC audio encoder')" ] && ok "notrun_list: name<TAB>reason" || bad "notrun_list: $l"
l="$(notrun_list '{"ok": true, "summary": "Regression 2/2 ✓", "failures": [], "notRun": []}')"
[ -z "$l" ] && ok "notrun_list: an empty list prints nothing" || bad "notrun_list empty: $l"
l="$(notrun_list '{"ok": true, "summary": "Regression 2/2 ✓", "failures": []}')"
case "$l" in "?"*) ok "notrun_list: a result with no notRun list is a '?' line — unknown, never 'none'";; *) bad "notrun_list missing: $l";; esac
out="$(PATH="$(shim_os Darwin):$PATH" bash -c '. tools/_testfloor.sh; notrun_report "$1" desktop' _ "$(cat "$TMP/r1.json")")"; rc=$?
[ "$rc" = 1 ] && printf '%s' "$out" | grep -q 'aac test' && printf '%s' "$out" | grep -q 'THE MAC RUNS EVERY TEST' && ok "notrun_report on the Mac: lists it and refuses (1)" || bad "notrun_report Darwin: rc=$rc $out"
out="$(PATH="$(shim_os Linux):$PATH" bash -c '. tools/_testfloor.sh; notrun_report "$1" desktop' _ "$(cat "$TMP/r1.json")")"; rc=$?
[ "$rc" = 0 ] && printf '%s' "$out" | grep -q 'aac test — needs an AAC' && ok "notrun_report elsewhere: lists it by name and reason, carries on (0)" || bad "notrun_report Linux: rc=$rc $out"
out="$(PATH="$(shim_os Darwin):$PATH" bash -c '. tools/_testfloor.sh; notrun_report "$1" desktop' _ '{"ok": true, "summary": "Regression 2/2 ✓", "failures": [], "notRun": []}')"; rc=$?
[ "$rc" = 0 ] && [ -z "$out" ] && ok "control: none NOT RUN on the Mac → silent, 0" || bad "notrun_report none: rc=$rc $out"

echo "── ship.sh's double-quote title gate matches a test DECLARATION, not a .test('…\"…') call (review minor) ──"
# ship.sh's own _DQ line, evaluated in a fixture — so this tests what ship.sh does, whatever it does
DQLINE="$(grep -m1 '^_DQ=' tools/ship.sh)"
dq_in() { ( cd "$1" && . "$REPO/tools/_shipgates.sh" 2>/dev/null; eval "$DQLINE"; printf '%s' "$_DQ" ); }
mkdir -p "$TMP/dq1/tests" "$TMP/dq2/tests"
printf "  test('a plain title', function () {\n    if (!/x/.test('<b class=\"x\">')) throw new Error('no');\n    var v = latest('a \"b\" c');\n  });\n" > "$TMP/dq1/tests/tests.js"
printf "  test('a \"quoted\" title', function () {});\n" > "$TMP/dq2/tests/tests.js"
[ -n "$DQLINE" ] || bad "ship.sh has no _DQ= line any more — this check cannot see the gate"
v="$(dq_in "$TMP/dq1")"
[ -z "$v" ] && ok "a regex .test('<b class=\"x\">') and a latest('a \"b\" c') call are not test titles — no refusal" || bad "the DQ gate refuses on a line that declares no test: $v"
v="$(dq_in "$TMP/dq2")"
[ -n "$v" ] && ok "control: a title with a double quote in it is still refused" || bad "the DQ gate no longer catches a real double-quoted title"
[ -z "$(dq_in "$REPO")" ] && ok "today's tests/tests.js: no double-quoted title" || bad "today's tests.js has a double-quoted title: $(dq_in "$REPO")"

echo "── ship.sh refuses off main in a second (it commits on the checked-out branch and pushes main) — review minor ──"
B="$TMP/branch"; mkdir -p "$B"
( cd "$B" && git init -q . && git config user.email t@t && git config user.name t && git checkout -q -b main 2>/dev/null
  echo '<span>v1.2</span>' > index.html && git add -A && git commit -q -m base && git checkout -q -b work )
printf 'a release\n' > "$TMP/msg.txt"
out="$(cd "$B" && FM_SHIP_ALLOW_NON_MAC=1 bash "$REPO/tools/ship.sh" -F "$TMP/msg.txt" 2>&1)"; rc=$?
[ "$rc" = 1 ] && printf '%s' "$out" | grep -q 'NOT main' && grep -q '^REFUSED rc=1 not on main' "$B/.last-ship" && ok "on a work branch: refused at once (exit 1), .last-ship says why" || bad "off main: rc=$rc — $(printf '%s' "$out" | tail -3) — .last-ship: $(cat "$B/.last-ship" 2>/dev/null)"
[ ! -f "$B/.ship-in-progress" ] && ok "…and its lock is gone" || bad "off main: the ship lock was left behind"
( cd "$B" && git checkout -q main )
out="$(cd "$B" && FM_SHIP_ALLOW_NON_MAC=1 bash "$REPO/tools/ship.sh" -F "$TMP/msg.txt" 2>&1)"; rc=$?
! printf '%s' "$out" | grep -q 'NOT main' && printf '%s' "$out" | grep -q 'GITHUB CANNOT BE REACHED' && ok "control: on main it passes this gate and stops at the next (no 'ssh' remote here — GitHub unreachable)" || bad "on main: rc=$rc — $(printf '%s' "$out" | tail -3)"

echo "── a git that cannot answer is a refusal in ship.sh's gates, never 'nothing changed' (review minor) ──"
mkdir -p "$TMP/badgit"
printf '#!/bin/sh\necho "fatal: detected dubious ownership in repository" >&2\nexit 128\n' > "$TMP/badgit/git"; chmod +x "$TMP/badgit/git"
G="$TMP/gitfix"; mkdir -p "$G/js" "$G/tools"
( cd "$G" && git init -q . && git config user.email t@t && git config user.name t && echo 'var a=1;' > js/a.js && echo '<script src="js/a.js?v=1"></script>' > index.html && git add -A && git commit -q -m base && echo 'var a=2;' > js/a.js )
cp tools/_shipgates.py "$G/tools/" 2>/dev/null
# 1. the parse gate's file list: ship.sh's own _JSFILES line, under a git that fails
JSLINE="$(grep -m1 '^_JSFILES=' tools/ship.sh)"
out="$(cd "$G" && PATH="$TMP/badgit:$PATH" bash -c '. "$1/tools/_shipgates.sh" 2>/dev/null; _WHY=""; eval "$2"; echo "LISTED[$_JSFILES]"' _ "$REPO" "$JSLINE" 2>&1)"; rc=$?
[ "$rc" != 0 ] && ! printf '%s' "$out" | grep -q 'LISTED\[' && ok "the parse gate's file list: a failing git REFUSES (exit $rc), never an empty list" || bad "the parse gate read a failing git as 'no script changed': rc=$rc $out"
out="$(cd "$G" && bash -c '. "$1/tools/_shipgates.sh" 2>/dev/null; eval "$2"; echo "LISTED[$_JSFILES]"' _ "$REPO" "$JSLINE" 2>&1)"
[ "$out" = "LISTED[js/a.js]" ] && ok "control: with a working git it lists the changed js/a.js" || bad "parse-gate list, control: $out"
# 2. the cache-buster gate: ship.sh's own BUSTER_MISS heredoc, under a git that fails
awk '/^BUSTER_MISS="\$\(python3 - <<.PYEOF.$/{f=1; next} f && /^PYEOF$/{exit} f{print}' tools/ship.sh > "$TMP/buster.py"
[ -s "$TMP/buster.py" ] || bad "could not find the BUSTER_MISS python in ship.sh — this check cannot see the gate"
out="$(cd "$G" && PATH="$TMP/badgit:$PATH" python3 "$TMP/buster.py" 2>&1)"; rc=$?
[ "$rc" != 0 ] && ok "the cache-buster gate: a failing git ends it non-zero (ship.sh refuses), never 'no stale buster'" || bad "the cache-buster gate read a failing git as 'nothing changed' (exit 0): $out"
out="$(cd "$G" && python3 "$TMP/buster.py" 2>&1)"; rc=$?
[ "$rc" = 0 ] && printf '%s' "$out" | grep -q 'js/a.js (still ?v=1)' && ok "control: with a working git it names js/a.js's stale buster" || bad "buster control: rc=$rc $out"

echo "── spotcheck: a control that TIMED OUT on a healthy machine is the release's NO-CONTROL, not 'the machine' (review minor) ──"
SC="$TMP/spot"; mkdir -p "$SC/tools" "$SC/tests" "$SC/js"
cp tools/spotcheck.sh tools/_platform.sh tools/_srcfiles.py tools/_spottests.py tools/serve.sh "$SC/tools/"
printf '#!/bin/sh\nexit 0\n' > "$TMP/fakechrome"; chmod +x "$TMP/fakechrome"
cat > "$SC/tests/_cdp.py" <<'STUB'
#!/usr/bin/env python3
# STUB driver: every run is _cdp.py's own timeout (no summary, exit 2) — what a changed test that HANGS looks like
import json, sys
print(json.dumps({"ok": False, "error": "suite did not finish within 300s", "lastTest": "t-hangs"})); sys.exit(2)
STUB
( cd "$SC" && git init -q . && git config user.email t@t && git config user.name t
  echo '<html></html>' > index.html; echo 'var a = 1;' > js/a.js; printf '.spotcheck-in-progress\n' > .gitignore
  printf "var qs; qs.get('only');\n  test('t-other', function () {});\n" > tests/tests.js
  git add -A && git commit -q -m base
  echo 'var a = 2;' > js/a.js; printf "  test('t-hangs on the fix', function () {});\n" >> tests/tests.js
  git add -A && git commit -q -m 'a fix with a test' )
out="$(cd "$SC" && FM_CHROME="$TMP/fakechrome" tools/spotcheck.sh HEAD 2>&1)"; rc=$?
logged="$(cat "$SC/tools/.spotcheck.log" 2>/dev/null)"
[ "$rc" = 1 ] && printf '%s' "$logged" | grep -q 'NOT-PROVEN NO-CONTROL' && ok "a hanging control with Chrome and the server healthy → NOT-PROVEN NO-CONTROL, logged" || bad "a hanging control on a healthy machine: rc=$rc log=[$logged] — $(printf '%s' "$out" | tail -2)"
rm -f "$SC/tools/.spotcheck.log"
out="$(cd "$SC" && FM_CHROME="$TMP/no-such-chrome" tools/spotcheck.sh HEAD 2>&1)"; rc=$?
[ "$rc" = 2 ] && [ ! -s "$SC/tools/.spotcheck.log" ] && ok "control: with no Chrome it is the machine — exit 2, nothing logged" || bad "no Chrome: rc=$rc log=[$(cat "$SC/tools/.spotcheck.log" 2>/dev/null)]"

echo "── the reaper: the pattern follows FM_CHROME, and 'a run is alive' means a python running _cdp.py (review minor) ──"
py_reap() { python3 -c 'import sys; sys.path.insert(0, "tests"); import _platform as P
if sys.argv[1] == "linux": P.sys.platform = "linux"; P.IS_LINUX = True
print(P.reap_pattern())' "$1"; }
sh_reap() { PATH="$(shim_os "$1"):$PATH" bash -c '. tools/_platform.sh; fm_chrome_reap_pattern'; }
for os_ in Darwin Linux; do
  pos="$( [ "$os_" = Linux ] && echo linux || echo darwin )"
  for fc in "" "/opt/x/chrome-headless-shell" "/Applications/Chromium.app/Contents/MacOS/Chromium" "/usr/bin/chromium"; do
    a="$(FM_CHROME="$fc" py_reap "$pos")"; b="$(FM_CHROME="$fc" sh_reap "$os_")"
    [ "$a" = "$b" ] || bad "the twins disagree on $os_ with FM_CHROME='$fc': python '$a' vs shell '$b'"
  done
done
ok "tests/_platform.py and tools/_platform.sh give the same reap pattern (Mac and Linux, with and without FM_CHROME)"
p="$(FM_CHROME=/opt/x/chrome-headless-shell sh_reap Linux)"
printf '%s\n' "/opt/x/chrome-headless-shell --headless=new --user-data-dir=/tmp/fm-cdp-abc about:blank" | grep -qE "$p" \
  && ok "Linux, FM_CHROME=chrome-headless-shell: its processes are matched (they were not, so never reaped)" || bad "chrome-headless-shell is not matched by '$p'"
printf '%s\n' "/opt/google/chrome/chrome --type=renderer --user-data-dir=/tmp/fm-cdp-abc" | grep -qE "$p" && ok "…and the stock Chrome still is" || bad "stock chrome not matched by '$p'"
printf '%s\n' "bash -c echo /opt/x/chrome-headless-shell --user-data-dir=/tmp/fm-cdp-x" | grep -qE "$p" && bad "a decoy SHELL carrying the binary's path is matched by '$p' (it would be SIGKILLed)" || ok "…and a decoy shell carrying its path is not (what is matched is SIGKILLed)"
p="$(FM_CHROME="/Applications/Chromium.app/Contents/MacOS/Chromium" sh_reap Darwin)"
printf '%s\n' "/Applications/Chromium.app/Contents/MacOS/Chromium --headless=new --user-data-dir=/var/x/fm-cdp-abc" | grep -qE "$p" && ok "Mac, FM_CHROME=Chromium.app: matched" || bad "Chromium.app is not matched by '$p'"
# the liveness pattern, against REAL processes on this machine: a python running a _cdp.py, and a shell that only names one
mkdir -p "$TMP/drv/tests"; printf 'import time\ntime.sleep(8)\n' > "$TMP/drv/tests/_cdp.py"
python3 "$TMP/drv/tests/_cdp.py" --port 1 & PYPID=$!
bash -c 'sleep 8; : waiting on tests/_cdp.py' & SHPID=$!
sleep 1
dp="$(. tools/_platform.sh; fm_driver_pattern 2>/dev/null)"
if [ -z "$dp" ]; then bad "no fm_driver_pattern — the liveness check still matches any command line naming _cdp.py"
else
  hits="$(pgrep -f "$dp" | tr '\n' ' ')"
  case " $hits " in *" $PYPID "*) ok "a python running …/tests/_cdp.py is a live run (pid $PYPID)";; *) bad "a running driver is not seen as alive by '$dp' (pgrep: $hits)";; esac
  case " $hits " in *" $SHPID "*) bad "a shell that merely names tests/_cdp.py is read as a live run (pid $SHPID) — the reaper would stand down for it";; *) ok "a shell that only names tests/_cdp.py is not a live run";; esac
  [ "$(python3 -c 'import sys; sys.path.insert(0, "tests"); import _platform; print(_platform.driver_pattern())')" = "$dp" ] && ok "the twins agree on the liveness pattern" || bad "tests/_platform.py driver_pattern differs from fm_driver_pattern"
fi
kill "$PYPID" "$SHPID" 2>/dev/null; wait "$PYPID" "$SHPID" 2>/dev/null
grep -q 'fm_driver_pattern' tools/ship.sh && grep -q 'driver_pattern()' tests/_cdp.py && ok "ship.sh and tests/_cdp.py both ask the shared liveness pattern" || bad "ship.sh or tests/_cdp.py still has its own liveness pattern"

echo "── the driver: no websocket-client is DID NOT RUN (exit 2) with the cure, never a traceback that reads as red (review minor) ──"
mkdir -p "$TMP/nows/websocket"
printf 'raise ImportError("No module named websocket (simulated: a fresh Ubuntu)")\n' > "$TMP/nows/websocket/__init__.py"
out="$(PYTHONPATH="$TMP/nows" python3 tests/_cdp.py --port 1 2>&1)"; rc=$?
[ "$rc" = 2 ] && printf '%s' "$out" | python3 -c 'import json,sys; d=json.loads(sys.stdin.read()); sys.exit(0 if (d["ok"] is False and "websocket-client" in d["error"] and "apt install" in d["error"]) else 1)' 2>/dev/null \
  && ok "websocket-client missing → exit 2 and a JSON error naming it and the install line" || bad "websocket-client missing: rc=$rc — $(printf '%s' "$out" | tail -2)"
grep -q "python3 -c 'import websocket'" tools/ship.sh && ok "ship.sh asks for it up front, beside Chrome" || bad "ship.sh does not check for websocket-client before the suite"

echo "── which browser: Chromium on PATH is never used silently, and every driver result names the browser (review minor) ──"
mkdir -p "$TMP/onlychromium" "$TMP/withchrome"
printf '#!/bin/sh\nexit 0\n' > "$TMP/onlychromium/chromium"; chmod +x "$TMP/onlychromium/chromium"
cp "$TMP/onlychromium/chromium" "$TMP/withchrome/chromium"; cp "$TMP/onlychromium/chromium" "$TMP/withchrome/google-chrome"
BASEPATH="/usr/bin:/bin:/usr/sbin:/sbin"
pyc() { _FM_MAC_APP=/nonexistent PATH="$1:$BASEPATH" FM_CHROME="${2:-}" python3 -c 'import sys; sys.path.insert(0, "tests"); import _platform as P
try: print("USE " + P.chrome_path())
except P.ChromeNotFound as e: print("REFUSED " + str(e))'; }
shc() { _FM_MAC_APP=/nonexistent PATH="$1:$BASEPATH" FM_CHROME="${2:-}" bash -c '. tools/_platform.sh; if p="$(fm_chrome 2>"$0")"; then echo "USE $p"; else echo "REFUSED $(cat "$0")"; fi' "$TMP/err.txt"; }
for f in pyc shc; do
  v="$($f "$TMP/onlychromium")"
  case "$v" in REFUSED*"is NOT used unless FM_CHROME"*) ok "$f: only chromium on PATH → refused, and the refusal names it and FM_CHROME";; *) bad "$f: only chromium on PATH: $v";; esac
  v="$($f "$TMP/withchrome")"
  [ "$v" = "USE $TMP/withchrome/google-chrome" ] && ok "$f: google-chrome on PATH is used (over chromium)" || bad "$f: with google-chrome: $v"
  v="$($f "$TMP/onlychromium" "$TMP/onlychromium/chromium")"
  [ "$v" = "USE $TMP/onlychromium/chromium" ] && ok "$f: FM_CHROME naming chromium is a decision — used" || bad "$f: FM_CHROME=chromium: $v"
done
grep -q '"browser": _browser()' tests/_cdp.py && [ "$(grep -c '_browser()' tests/_cdp.py)" -ge 4 ] && ok "tests/_cdp.py puts the browser in the result, the timeout and every did-not-run" || bad "tests/_cdp.py does not name the browser in every result"

echo "── tests/_shot.sh launches Chrome with the flags that give Linux the Mac's mouse (review minor) ──"
for os_ in Darwin Linux; do
  pos="$( [ "$os_" = Linux ] && echo linux || echo darwin )"
  a="$(python3 -c 'import sys; sys.path.insert(0, "tests"); import _platform as P
if sys.argv[1] == "linux": P.IS_LINUX = True
else: P.IS_LINUX = False
print("\n".join(P.chrome_extra_flags()))' "$pos")"
  b="$(PATH="$(shim_os "$os_"):$PATH" bash -c '. tools/_platform.sh; fm_chrome_extra_flags' 2>/dev/null)"
  [ "$a" = "$b" ] && ok "$os_: fm_chrome_extra_flags is the twin of chrome_extra_flags() ($(printf '%s' "$a" | wc -l | tr -d ' ') line breaks)" || bad "$os_: the extra flags differ — python [$a] vs shell [$b]"
done
cat > "$TMP/argvchrome" <<'FAKE'
#!/bin/sh
# a fake Chrome: records its arguments one a line, then writes the screenshot it was asked for
for a in "$@"; do echo "$a"; done > "$ARGV_OUT"
for a in "$@"; do case "$a" in --screenshot=*) printf 'png' > "${a#--screenshot=}" ;; esac; done
FAKE
chmod +x "$TMP/argvchrome"
out="$(PATH="$(shim_os Linux):$PATH" ARGV_OUT="$TMP/argv.txt" FM_CHROME="$TMP/argvchrome" bash tests/_shot.sh "$TMP/shot.png" /index.html 1280 800 2>&1)"; rc=$?
if [ "$rc" = 0 ] && [ -f "$TMP/argv.txt" ]; then
  grep -q '^--blink-settings=primaryPointerType=4,availablePointerTypes=4,primaryHoverType=2,availableHoverTypes=2$' "$TMP/argv.txt" && ok "Linux: _shot.sh passes the mouse (blink settings), so a PC-width picture is the PC layout" || bad "Linux: _shot.sh launches Chrome WITHOUT the mouse flags — PC pictures are the finger layout: $(tr '\n' ' ' < "$TMP/argv.txt")"
  grep -q '^--user-data-dir=' "$TMP/argv.txt" && ok "…on its own profile (removed after)" || bad "_shot.sh has no profile of its own"
else bad "_shot.sh did not run under the fake Chrome: rc=$rc $out"; fi

echo "── the load gate says when it passed blind: on WSL it sees the VM's load only (review minor) ──"
printf '5.15.153.1-microsoft-standard-WSL2\n' > "$TMP/osrelease-wsl"; printf '6.8.0-45-generic\n' > "$TMP/osrelease-linux"
printf 'MemTotal:       16000000 kB\nMemAvailable:    5242880 kB\n' > "$TMP/meminfo"
note() { PATH="$(shim_os "$1"):$PATH" _FM_OSRELEASE="$2" _FM_MEMINFO="$TMP/meminfo" bash -c '. tools/_platform.sh; fm_load_blind_note' 2>&1; }
v="$(note Linux "$TMP/osrelease-wsl")"
case "$v" in *"WSL VM's own load only"*"5120 MB available"*) ok "WSL: a pass says it saw the VM only, and what the VM has free";; *) bad "WSL pass note: [$v]";; esac
[ -z "$(note Linux "$TMP/osrelease-linux")" ] && ok "plain Linux: nothing to add" || bad "plain Linux printed a WSL note"
[ -z "$(note Darwin "$TMP/osrelease-wsl")" ] && ok "the Mac: nothing to add (its load is the whole machine's)" || bad "the Mac printed a WSL note"
awk '/FM_SHIP_IGNORE_LOAD:-/{f=1} f && /fm_load_blind_note/{found=1} f && /^fi$/{exit} END{exit !found}' tools/ship.sh && ok "ship.sh says it on the load gate's pass path" || bad "ship.sh's load gate does not call fm_load_blind_note"

echo "── the driver's mouse gate asks from its own isolated world, and confirms the mouse before answering a batch (review minor) ──"
v="$(python3 - <<'PY' 2>&1
import sys, json
sys.path.insert(0, 'tests'); sys.dont_write_bytecode = True
import _cdp
class Fake:
    """records what the driver asks; the page's own world would say False (a stub), the isolated world says True"""
    def __init__(self, answers): self.calls = []; self.answers = list(answers)
    def send(self, method, **p):
        self.calls.append((method, p))
        if method == 'Page.getFrameTree': return {'frameTree': {'frame': {'id': 'F1'}}}
        if method == 'Page.createIsolatedWorld': return {'executionContextId': 77}
        if method == 'Runtime.evaluate':
            if p.get('contextId') == 77: return {'result': {'value': self.answers.pop(0) if self.answers else True}}
            return {'result': {'value': False}}
        return {}
    def eval(self, expr, await_promise=False):
        self.calls.append(('eval', {'expr': expr})); return False
f = Fake([True])
got = _cdp._mouse_state(f)
iso = [c for c in f.calls if c[0] == 'Runtime.evaluate' and c[1].get('contextId') == 77]
print('ISOLATED' if (got is True and iso and not [c for c in f.calls if c[0] == 'eval']) else 'MAINWORLD got=%r calls=%r' % (got, [c[0] for c in f.calls]))
g = Fake([False, False, True])
print('CONFIRM' if getattr(_cdp, '_confirm_mouse', None) and _cdp._confirm_mouse(g, 2.0) is True else 'NOCONFIRM')
h = Fake([False] * 100)
print('GIVESUP' if getattr(_cdp, '_confirm_mouse', None) and _cdp._confirm_mouse(h, 0.3) is False else 'NOGIVEUP')
PY
)"
printf '%s' "$v" | grep -q '^ISOLATED' && ok "_mouse_state reads an isolated world — a page stub (False in the page's world) cannot answer for the browser" || bad "_mouse_state: $v"
printf '%s' "$v" | grep -q '^CONFIRM' && printf '%s' "$v" | grep -q '^GIVESUP' && ok "_confirm_mouse waits for the mouse to come back, and gives up (False) when it does not" || bad "_confirm_mouse: $v"
awk '/_confirm_mouse\(cdp\)/{c=NR} /w.__fmInputErr=%s;w.__fmInputDone=%s/{d=NR} END{exit !(c && d && c < d)}' tests/_cdp.py && ok "…and a real-input batch is answered only after it (the line order in tests/_cdp.py)" || bad "the batch is answered before the mouse is confirmed"

echo "── the driver says when the app's text was measured in another font than the Mac's (review minor) ──"
v="$(python3 - <<'PY' 2>&1
import sys, json
sys.path.insert(0, 'tests'); sys.dont_write_bytecode = True
import _cdp, _platform
if not hasattr(_cdp, '_font_parity'): print('NOFONT'); sys.exit()
class Fake:
    def __init__(self, ans): self.ans = ans
    def eval(self, expr, await_promise=False): return json.dumps(self.ans)
_platform.MAC_FONT = {"resolved": "-apple-system", "width": 400.0}
a = _cdp._font_parity(Fake({"stack": "x", "resolved": "-apple-system", "width": 400.2}))
b = _cdp._font_parity(Fake({"stack": "x", "resolved": "DejaVu Sans", "width": 452.1}))
c = _cdp._font_parity(Fake({"stack": "x", "resolved": "-apple-system", "width": 409.0}))
print('SAME' if a["same"] is True else 'A=%r' % a)
print('DIFF' if b["same"] is False and c["same"] is False else 'B=%r C=%r' % (b, c))
PY
)"
printf '%s' "$v" | grep -q '^SAME' && printf '%s' "$v" | grep -q '^DIFF' && ok "_font_parity: the Mac's font within 0.5 px is the same; another font, or 9 px wider, is not" || bad "_font_parity: $v"
l="$(. tools/_testfloor.sh; font_report '{"ok": true, "fontParity": {"resolved": "DejaVu Sans", "width": 452.1, "same": false, "mac": {"resolved": "-apple-system", "width": 400}}}' phone)"
case "$l" in *"FONT (phone pass)"*"DejaVu Sans"*"-apple-system"*) ok "ship.sh's font_report says it, naming both fonts";; *) bad "font_report: [$l]";; esac
l="$(. tools/_testfloor.sh; font_report '{"ok": true, "fontParity": {"resolved": "-apple-system", "width": 400, "same": true}}' phone)"
[ -z "$l" ] && ok "…and says nothing when the font is the Mac's" || bad "font_report on the same font: [$l]"
grep -q 'font_report "$OUT" desktop' tools/ship.sh && grep -q 'font_report "$POUT" phone' tools/ship.sh && ok "ship.sh reports it after both passes" || bad "ship.sh does not call font_report after both passes"
python3 -c 'import sys; sys.path.insert(0, "tests"); import _platform as P; sys.exit(0 if P.MAC_FONT.get("width") and P.MAC_FONT.get("resolved") else 1)' \
  && ok "the Mac's own measurement is recorded (tests/_platform.py MAC_FONT) — without it the check could never say 'different'" || bad "MAC_FONT has no width: the font check is inert"

echo "── tools/.suite-seconds is per machine: each keeps its own line, a new machine takes the largest known (#1071) ──"
SS="$TMP/ss"; mkdir -p "$SS/tools"
ss() { ( cd "$SS" && FM_MACHINE_ID="$1" bash -c '. "$0/tools/_platform.sh"; . "$0/tools/_testfloor.sh"; '"$2" "$REPO" ); }
printf 'mac-a 2697\npc-b 2905\n' > "$SS/tools/.suite-seconds"
[ "$(ss mac-a 'suite_seconds_for')" = 2697 ] && [ "$(ss pc-b 'suite_seconds_for')" = 2905 ] && ok "each machine reads its own pass (mac-a 2697, pc-b 2905)" || bad "per-machine read: mac-a=$(ss mac-a suite_seconds_for) pc-b=$(ss pc-b suite_seconds_for)"
[ "$(ss new-c 'suite_seconds_for')" = 2905 ] && ok "a machine with no line takes the largest known (2905)" || bad "missing key: $(ss new-c suite_seconds_for)"
[ "$(ss mac-a 'suite_timeout')" = 4315 ] && [ "$(ss new-c 'suite_timeout')" = 4648 ] && ok "the cap: 1.6 × its own (mac-a 4315 s), 1.6 × the largest for a new machine (4648 s)" || bad "caps: mac-a=$(ss mac-a suite_timeout) new-c=$(ss new-c suite_timeout)"
ss pc-b 'suite_seconds_record 3010' >/dev/null
[ "$(cat "$SS/tools/.suite-seconds")" = "$(printf 'mac-a 2697\npc-b 3010')" ] && ok "a green pass on pc-b rewrites pc-b's line only (mac-a's 2697 kept)" || bad "record: $(tr '\n' '|' < "$SS/tools/.suite-seconds")"
printf '2697\n' > "$SS/tools/.suite-seconds"
[ "$(ss pc-b 'suite_seconds_for')" = 2697 ] && ok "the old one-number file still reads (2697 for any machine)" || bad "legacy read: $(ss pc-b suite_seconds_for)"
ss mac-a 'suite_seconds_record 2700' >/dev/null
[ "$(cat "$SS/tools/.suite-seconds")" = "mac-a 2700" ] && ok "…and the first pass recorded turns it into a machine's line" || bad "legacy record: $(tr '\n' '|' < "$SS/tools/.suite-seconds")"
v="$(ss mac-a 'suite_seconds_record notanumber' 2>&1)"; [ "$(cat "$SS/tools/.suite-seconds")" = "mac-a 2700" ] && ok "a non-number is refused and the file is untouched" || bad "bad record: $v"
grep -q 'suite_seconds_record "$_suite_secs"' tools/ship.sh && grep -q '_last_suite="$(suite_seconds_for)"' tools/ship.sh && ok "ship.sh reads and writes it through these (mutate.sh takes suite_timeout)" || bad "ship.sh still reads or writes tools/.suite-seconds as one number"
[ "$(awk 'NF >= 2' tools/.suite-seconds | wc -l | tr -d ' ')" -ge 1 ] && ok "the repo's tools/.suite-seconds is in the per-machine format: $(tr '\n' ' ' < tools/.suite-seconds)" || bad "tools/.suite-seconds is still one bare number"

echo "── the feature gate: a release that changes what a NOT RUN test proves refuses unless it RAN here — AAC, QR, touch, baselines, any other (#1071) ──"
fg() { printf '%b' "$3" | python3 tools/_shipgates.py feature-gate --files "$1" --diff-file "$2" 2>&1; }
printf 'diff --git a/js/collab-ui.js b/js/collab-ui.js\n--- a/js/collab-ui.js\n+++ b/js/collab-ui.js\n@@ -1 +1 @@\n-var a = 1;\n+var a = 2; // the Scan QR button\n' > "$TMP/qr.diff"
printf 'diff --git a/js/collab-ui.js b/js/collab-ui.js\n--- a/js/collab-ui.js\n+++ b/js/collab-ui.js\n@@ -1 +1 @@\n-var a = 1;\n+var a = 2; // the presence dots\n' > "$TMP/noqr.diff"
: > "$TMP/empty.diff"
AAC='215 a test\tneeds an AAC audio encoder (AudioEncoder mp4a.40.2) — this browser has none\n'
BD='921 S8 a test\tneeds a working BarcodeDetector (qr_code) — this browser has no BarcodeDetector\n'
v="$(fg js/exporter.js "$TMP/empty.diff" "$AAC")"; rc=$?
[ "$rc" = 1 ] && printf '%s' "$v" | grep -q 'AAC export audio (js/exporter.js)' && ok "js/exporter.js changed + an AAC test NOT RUN → refused, naming both" || bad "exporter + AAC not run: rc=$rc $v"
v="$(fg js/audio-fx.js "$TMP/empty.diff" "$AAC")"; rc=$?; [ "$rc" = 1 ] && ok "js/audio-*.js counts too" || bad "audio-fx + AAC not run: rc=$rc $v"
v="$(fg js/exporter.js "$TMP/empty.diff" '')"; rc=$?; [ "$rc" = 0 ] && ok "control: js/exporter.js changed, every test ran → passes" || bad "exporter, all ran: rc=$rc $v"
v="$(fg js/timeline.js "$TMP/empty.diff" "$AAC")"; rc=$?; [ "$rc" = 0 ] && ok "control: an unrelated file + AAC NOT RUN → passes (listed, not refused)" || bad "unrelated + AAC: rc=$rc $v"
v="$(fg js/collab-ui.js "$TMP/qr.diff" "$BD")"; rc=$?; [ "$rc" = 1 ] && ok "js/collab-ui.js lines about QR + a QR test NOT RUN → refused" || bad "collab-ui qr: rc=$rc $v"
v="$(fg js/collab-ui.js "$TMP/noqr.diff" "$BD")"; rc=$?; [ "$rc" = 0 ] && ok "js/collab-ui.js lines about something else → passes" || bad "collab-ui other: rc=$rc $v"
v="$(fg js/collab-qr.js "$TMP/empty.diff" "$BD")"; rc=$?; [ "$rc" = 1 ] && ok "js/collab-qr.js (all of it) + a QR test NOT RUN → refused" || bad "collab-qr: rc=$rc $v"
v="$(fg js/exporter.js "$TMP/empty.diff" '?\tthe driver result carries no NOT RUN list\n')"; rc=$?; [ "$rc" = 1 ] && ok "an unknown NOT RUN list ('?') counts against the release — unknown is not 'ran'" || bad "unknown list: rc=$rc $v"
# THE TWO REASONS THE GATE DID NOT KNOW (6 Oct, the port audit, MAJOR). Off the Mac ~80 real-finger tests say NOT RUN for want
# of touch emulation and 22 pinned tests for want of a baseline — and what they prove is the whole app, not one file. They
# were listed and the release went on, so a phone-touch or pinned-render regression shipped from WSL. Any of them, and any
# reason this gate has no narrower map for, now refuses a release that changes shipped source.
TOUCH='924 a real finger dragging a LAYER\tneeds real touch emulation (a finger with the phone media state: pointer coarse, hover none, 5 touch points) — Linux headless Chrome\n'
NOBASE='482 a picture\tno baseline recorded for linux (run tools/record-baselines.sh) — x holds pictures or samples recorded on the Mac\n'
PART='482 another picture\tthe linux baseline for y is incomplete (1 of 9 keys missing, e.g. k) — run tools/record-baselines.sh\n'
NOCASE='986 a blur\tthe linux baseline for z has no case c — run tools/record-baselines.sh\n'
v="$(fg js/timeline.js,styles.css,js/compositor.js "$TMP/empty.diff" "$TOUCH$NOBASE$PART")"; rc=$?
[ "$rc" = 1 ] && printf '%s' "$v" | grep -q 'touch' && printf '%s' "$v" | grep -q 'baseline' && ok "the audit's own case: js/timeline.js, styles.css, js/compositor.js + touch and baseline NOT RUN → refused, naming both" || bad "the audit's case passed the gate: rc=$rc [$v]"
_fgmiss=""
for f in js/timeline.js styles.css index.html theme-glass.css sw.js manifest.json vendor/mp4-muxer.js; do
  v="$(fg "$f" "$TMP/empty.diff" "$TOUCH")"; [ $? = 1 ] || _fgmiss="$_fgmiss $f"
done
[ -z "$_fgmiss" ] && ok "a touch NOT RUN refuses a change to ANY shipped file (js/, styles.css, theme-glass.css, index.html, sw.js, manifest.json, vendor/)" || bad "a touch NOT RUN let these through:$_fgmiss"
_fgmiss=""
for r in "$NOBASE" "$PART" "$NOCASE"; do v="$(fg js/effects.js "$TMP/empty.diff" "$r")"; [ $? = 1 ] || _fgmiss="$_fgmiss [$(printf '%b' "$r" | cut -f2 | cut -c1-40)]"; done
[ -z "$_fgmiss" ] && ok "every baseline reason (none recorded, incomplete, a missing case) refuses a js/ change" || bad "a baseline NOT RUN let js/effects.js through:$_fgmiss"
v="$(fg js/app.js "$TMP/empty.diff" '999 a test\tneeds a gamepad — this browser has none\n')"; rc=$?
[ "$rc" = 1 ] && ok "a reason the gate has no map for refuses any shipped change (fail-safe: a renamed reason cannot slip past)" || bad "an unmapped NOT RUN reason passed the gate: rc=$rc $v"
v="$(fg tests/tests.js,tools/ship.sh,REQUESTS.md,tests/baselines.json "$TMP/empty.diff" "$TOUCH$NOBASE")"; rc=$?
[ "$rc" = 0 ] && ok "control: touch and baseline NOT RUN with only tests, tools and notes changed → passes (listed, not refused)" || bad "a tests/tools-only release was refused for a touch NOT RUN: rc=$rc $v"
python3 - "$REPO" <<'PY' && ok "the gate's named reasons are the ones tests/tests.js and tests/_cdp.py actually write" || bad "a NOT RUN reason in tests.js or _cdp.py no longer starts the way tools/_shipgates.py expects (it would fall to the catch-all)"
import sys, re
sys.path.insert(0, sys.argv[1] + '/tools'); import _shipgates as G
src = open(sys.argv[1] + '/tests/tests.js', encoding='utf-8').read(); drv = open(sys.argv[1] + '/tests/_cdp.py', encoding='utf-8').read()
want = {"needs real touch emulation (a finger": "touch", "needs an AAC audio encoder (AudioEncoder": "AAC", "needs a working BarcodeDetector (qr_code)": "QR",
        "no baseline recorded for linux (run": "baseline", "the linux baseline for \"x\" is incomplete": "baseline", "the linux baseline for \"x\" has no case": "baseline"}
lits = ["notRunHere('needs real touch emulation (a finger", "'needs an AAC audio encoder (AudioEncoder", "'needs a working BarcodeDetector (qr_code)",
        "notRunHere('no baseline recorded for ' + FM_OS", "notRunHere('the ' + FM_OS + ' baseline for \"' + name + '\" is incomplete", "notRunHere('the ' + FM_OS + ' baseline for \"' + name + '\" has no case"]
missing = [l for l in lits if l not in src] + ([] if '"NOTRUN: needs real touch emulation' in drv else ['_cdp.py NOTRUN: needs real touch emulation'])
wrong = [(r, k, G.claimed_by(r)) for r, k in want.items() if k not in (G.claimed_by(r) or '')]
if missing or wrong: print("   missing literals:", missing, "| claimed wrongly:", wrong); sys.exit(1)
PY
awk '/_shipgates.py feature-gate/{f=NR} /^ship_phase push/{p=NR} END{exit !(f && p && f < p)}' tools/ship.sh && ok "ship.sh asks it after the suite passes, before the commit" || bad "ship.sh does not run the feature gate before the push"

echo "── tools/record-baselines.sh refuses where a recording would be wrong (#1071) ──"
out="$(PATH="$(shim_os Darwin):$PATH" tools/record-baselines.sh 2>&1)"; rc=$?
[ "$rc" = 2 ] && printf '%s' "$out" | grep -q "this is the Mac" && ok "on the Mac: refused (its baselines ARE the literals in tests.js)" || bad "record on the Mac: rc=$rc $out"
out="$(tools/record-baselines.sh --fake-os linux 2>&1)"; rc=$?
[ "$rc" = 2 ] && printf '%s' "$out" | grep -q 'never into the tracked tests/baselines.json' && ok "a fake OS may never write the tracked file" || bad "fake into tracked: rc=$rc $out"
out="$(tools/record-baselines.sh --fake-os linux --file ../x.json 2>&1)"; rc=$?
[ "$rc" = 2 ] && ok "--file must be a plain name under tests/" || bad "--file path: rc=$rc $out"
python3 -c 'import json,sys; d=json.load(open("tests/baselines.json")); sys.exit(0 if isinstance(d, dict) and "_about" in d and "macos" not in d else 1)' && ok "tests/baselines.json is tracked, valid, and holds no 'macos' section (the Mac's are the literals)" || bad "tests/baselines.json is missing, not JSON, or holds a macos section"

echo "── ship.sh runs THIS test whenever a file it proves changes (6 Oct, the port audit, minor) ──"
# A release that edited only tools/_shipgates.py (the feature gate, and the sh() that makes a failed git a refusal) shipped
# with no self-test at all: ship.sh runs this file only when a file in its trigger list changes, and the list was written by
# hand. So the list is checked against what this file actually exercises: every tools/ and tests/ script named above.
TRIG="$(grep -E '^if \[ -n "\$\(git status --porcelain -- .*tools/test-port\.sh' tools/ship.sh | head -1)"
if [ -z "$TRIG" ]; then bad "ship.sh has no 'git status --porcelain -- … tools/test-port.sh …' trigger line — this check cannot see when it runs"
else
  _untrig=""
  for f in $(grep -oE '(tools|tests)/[A-Za-z0-9_.-]+\.(sh|py)' "$REPO/tools/test-port.sh" | sort -u); do
    printf '%s\n' "$TRIG" | tr ' ' '\n' | grep -qxF "$f" || _untrig="$_untrig $f"
  done
  [ -z "$_untrig" ] && ok "every script this test exercises is in ship.sh's trigger for it ($(printf '%s\n' "$TRIG" | tr ' ' '\n' | grep -cE '^(tools|tests)/') files)" || bad "ship.sh would ship a change to these WITHOUT running this test:$_untrig"
fi

echo
if [ "$FAILED" = 0 ]; then echo "✅ port: every check passed"; else echo "❌ port: a check FAILED (above)"; fi
exit "$FAILED"
