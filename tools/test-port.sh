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

echo
if [ "$FAILED" = 0 ]; then echo "✅ port: every check passed"; else echo "❌ port: a check FAILED (above)"; fi
exit "$FAILED"
