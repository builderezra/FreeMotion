#!/bin/bash
# ═══ THE PC-SPEED READER'S OWN TEST (#1098 clause 2, 17 Oct) ══════════════════════════════════════════════════════════════
#
#   bash tools/test-perf-report.sh      # seconds; a temp directory only; no browser, no network, no server
#
# WHY. tools/perf_report.py prints the speed tests' PC-speed numbers beside their phone-speed ones after each ship pass. Every
# way it can go wrong is silent: a reader that prints nothing reads exactly like "no test recorded anything", a driver that
# drops the "perf" key reads like a reader that lost it, and a test that stops calling perfNote() reads like a quiet run. So
# each link is run here against a canned fixture that separates right from wrong — the reader (two metrics, none, unknown),
# the driver's half (tests/_cdp.py _perf_records against a fake page), the slow pass carrying the records, and the wiring
# (ship.sh prints it after each pass, the driver puts it in its JSON, the S8 test records it). ship.sh runs this whenever one
# of the files it names changes (its trigger line is checked at the bottom).
set -uo pipefail
cd "$(dirname "$0")/.."
REPO="$PWD"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/fm-perf-test-XXXXXX")"
trap 'rm -rf "$TMP"' EXIT
FAILED=0
ok()  { printf '  ✅ %s\n' "$1"; }
bad() { printf '  ❌ %s\n' "$1"; FAILED=1; }

echo "── tools/perf_report.py: one line per metric, sorted, phone beside PC with the ratio ──"
# as ship.sh saves a pass: a stderr line, then the driver's JSON — the two metrics deliberately out of order
cat > "$TMP/two.out" <<'J'
[0101/000000.000:ERROR:a chrome stderr line before the JSON]
{
 "ok": true,
 "summary": "Regression 2/2 ✓",
 "failures": [],
 "notRun": [],
 "perf": [
  {"test": "921 S8 500 layers", "metric": "hot tick median", "phone": 3.1, "pc": 0.8, "unit": "ms", "rate": 4, "why": ""},
  {"test": "921 S8 500 layers", "metric": "commit median", "phone": 13.7, "pc": 3.42, "unit": "ms", "rate": 4, "why": ""}
 ]
}
J
v="$(python3 tools/perf_report.py "$TMP/two.out")"; rc=$?
want="$(printf '%s\n%s' 'PC speed · 921 S8 500 layers · commit median: phone 13.7 ms · PC 3.42 ms (×4.0)' \
                       'PC speed · 921 S8 500 layers · hot tick median: phone 3.10 ms · PC 0.80 ms (×3.9)')"
[ "$rc" = 0 ] && [ "$v" = "$want" ] && ok "two metrics → two lines, sorted (commit before hot tick), phone · PC (×ratio), exit 0" \
  || bad "two metrics: rc=$rc — got [$v] want [$want]"
v="$(python3 tools/perf_report.py "$TMP/two.out" 'desktop pass')"
[ "$(printf '%s\n' "$v" | grep -c '^PC speed (desktop pass) · 921 S8 500 layers · ')" = 2 ] && ok "…and with a second argument every line says which pass" || bad "pass label: [$v]"

echo "── …and says plainly when there are none, and tells none from unknown ──"
printf '%s\n' '{"ok": true, "summary": "Regression 2/2 ✓", "failures": [], "notRun": [], "perf": []}' > "$TMP/none.out"
v="$(python3 tools/perf_report.py "$TMP/none.out" 'phone pass')"; rc=$?
[ "$rc" = 0 ] && [ "$(printf '%s\n' "$v" | wc -l | tr -d ' ')" = 1 ] && printf '%s' "$v" | grep -q '^PC speed (phone pass): none — no test in this run recorded' \
  && ok "perf: [] → ONE plain line saying none (never silence)" || bad "none: rc=$rc [$v]"
printf '%s\n' '{"ok": true, "summary": "Regression 2/2 ✓", "failures": [], "notRun": [], "perf": null}' > "$TMP/null.out"
v="$(python3 tools/perf_report.py "$TMP/null.out")"
printf '%s' "$v" | grep -q 'could not read the page' && printf '%s' "$v" | grep -q 'unknown, not none' && ok "perf: null (the driver could not read it) → unknown, not none" || bad "null: [$v]"
printf '%s\n' '{"ok": true, "summary": "Regression 2/2 ✓", "failures": [], "notRun": []}' > "$TMP/old.out"
v="$(python3 tools/perf_report.py "$TMP/old.out")"
printf '%s' "$v" | grep -q 'carries no perf list' && printf '%s' "$v" | grep -q 'unknown, not none' && ok "no perf key at all (an older driver) → unknown, not none" || bad "no key: [$v]"
printf 'Traceback (most recent call last):\n  nothing here is JSON\n' > "$TMP/junk.out"
v="$(python3 tools/perf_report.py "$TMP/junk.out")"; rc=$?
[ "$rc" = 1 ] && printf '%s' "$v" | grep -q 'no driver result in this file' && ok "a file with no driver result → says so, exit 1" || bad "junk: rc=$rc [$v]"
v="$(python3 tools/perf_report.py "$TMP/no-such-file.out")"; rc=$?
[ "$rc" = 1 ] && printf '%s' "$v" | grep -q 'could not read' && ok "a missing file → says so, exit 1 (ship.sh never refuses on it)" || bad "missing: rc=$rc [$v]"
# a PC half that did not run says why, and the phone number still shows
printf '%s\n' '{"ok": true, "perf": [{"test": "921 S8 500 layers", "metric": "commit p90", "phone": 15.2, "pc": null, "why": "the CPU throttle was still on (4x) when the PC half began"}]}' > "$TMP/half.out"
v="$(python3 tools/perf_report.py "$TMP/half.out")"
[ "$v" = 'PC speed · 921 S8 500 layers · commit p90: phone 15.2 ms · PC not measured (the CPU throttle was still on (4x) when the PC half began)' ] \
  && ok "a missing PC half → the phone number and the reason, no ratio" || bad "half: [$v]"

echo "── tests/_cdp.py hands the page's records over as \"perf\": a list, [] when none, null when it could not read them ──"
v="$(cd "$REPO" && python3 - <<'PY' 2>&1
import sys, json
sys.path.insert(0, 'tests'); sys.dont_write_bytecode = True
import _cdp
if not hasattr(_cdp, '_perf_records'): print('NOFUNC'); sys.exit()
class Fake:
    def __init__(self, ans, boom=False): self.ans, self.boom, self.asked = ans, boom, []
    def eval(self, expr, await_promise=False):
        self.asked.append(expr)
        if self.boom: raise RuntimeError('the page went away')
        return self.ans
two = [{"test": "t", "metric": "m", "phone": 3.0, "pc": 1.0, "why": "a FAIL that did not finish within 5s, STALLED"}, "junk"]
f = Fake(json.dumps(two)); a = _cdp._perf_records(f)
print('LIST' if isinstance(a, list) and len(a) == 1 and a[0]["phone"] == 3.0 and a[0]["pc"] == 1.0 else 'A=%r' % (a,))
print('SAFE' if a and 'FAIL' not in a[0]["why"] and 'did not finish within' not in a[0]["why"] and 'STALLED' not in a[0]["why"] else 'UNSAFE %r' % (a,))
print('APPFRAME' if "getElementById('app')" in f.asked[0] and '__fmPerf' in f.asked[0] else 'WHERE %r' % f.asked[:1])
print('EMPTY' if _cdp._perf_records(Fake('[]')) == [] else 'E=%r' % (_cdp._perf_records(Fake('[]')),))
print('NULL' if _cdp._perf_records(Fake(None)) is None and _cdp._perf_records(Fake('{"a": 1}')) is None and _cdp._perf_records(Fake('[]', boom=True)) is None else 'N')
print('CAP' if len(_cdp._perf_records(Fake(json.dumps([{"test": "t"}] * 250)))) == 200 else 'NOCAP')
PY
)"
_miss=""; for w in LIST SAFE APPFRAME EMPTY NULL CAP; do printf '%s\n' "$v" | grep -qx "$w" || _miss="$_miss $w"; done
[ -z "$_miss" ] && ok "_perf_records: the app frame's list (non-objects dropped, capped at 200), [] for none, None when unreadable, and no verdict words leak into the JSON" \
  || bad "_perf_records: missing$_miss — $(printf '%s' "$v" | tr '\n' ' ' | cut -c1-300)"
grep -q '^            out\["perf"\] = _perf_records(cdp)' tests/_cdp.py && ok "…and main() puts it in every finished run's JSON" || bad "tests/_cdp.py main() no longer writes \"perf\" into its JSON"

echo "── tests/_slow_pass.py keeps the records of the run that gave each verdict ──"
SPD="$TMP/sp"; mkdir -p "$SPD/tests"; cp tests/_slow_pass.py "$SPD/tests/"
cat > "$SPD/tests/_cdp.py" <<'STUB'
import json, sys, urllib.parse
url = sys.argv[sys.argv.index("--url") + 1]; name = urllib.parse.unquote(url.split("only=", 1)[1])
print(json.dumps({"ok": True, "summary": "Regression 1/1 ✓", "failures": [], "notRun": [], "ran": [{"name": name, "ok": True}],
                  "perf": [{"test": "921 S8 500 layers", "metric": "commit median", "phone": 13.7, "pc": 3.42}]}))
STUB
printf 'speed x\tthis machine is too slow to stand in for the phone these budgets mean\n' > "$SPD/r.tsv"
(cd "$SPD" && python3 tests/_slow_pass.py --remaining r.tsv --pause 0 --tries 1 --out o.json >/dev/null 2>&1); rc=$?
v="$(python3 tools/perf_report.py "$SPD/o.json" 'desktop pass, run alone')"
[ "$rc" = 0 ] && [ "$v" = 'PC speed (desktop pass, run alone) · 921 S8 500 layers · commit median: phone 13.7 ms · PC 3.42 ms (×4.0)' ] \
  && ok "the slow pass's --out carries \"perf\" and the reader reads it" || bad "slow pass perf: rc=$rc [$v] — $(head -c 300 "$SPD/o.json" 2>/dev/null)"

echo "── the wiring: ship.sh prints it after each pass, and the S8 test records it ──"
awk '/^font_report "\$OUT" desktop/{f=NR} /^echo "✅ \$SUM /{s=NR} /^python3 tools\/perf_report\.py \.claude\/ship\/suite-desktop\.out "desktop pass"/{p=NR} END{exit !(f && s && p && f < s && s < p)}' tools/ship.sh \
  && ok "ship.sh: after the desktop pass's summary line" || bad "ship.sh does not print the PC-speed lines after the desktop pass's summary"
awk '/^  echo "✅ phone \$PSUM/{s=NR} /^  python3 tools\/perf_report\.py \.claude\/ship\/suite-phone\.out "phone pass"/{p=NR} END{exit !(s && p && s < p)}' tools/ship.sh \
  && ok "ship.sh: after the phone pass's summary line" || bad "ship.sh does not print the PC-speed lines after the phone pass's summary"
awk '/^slow_pass\(\) \{/{a=NR} a && !b && /^}/{b=NR} /perf_report\.py "\.claude\/ship\/slow-\$2\.json"/{p=NR} END{exit !(a && b && p && a < p && p < b)}' tools/ship.sh \
  && ok "ship.sh: and inside slow_pass, for a speed test the pass had to run again alone" || bad "ship.sh's slow_pass does not print the PC-speed lines of its re-run"
grep -q '^  function perfNote(test, metric, v) {' tests/tests.js && grep -q "perfNote(T8, m\[0\]" tests/tests.js && grep -q "const T8 = '921 S8 500 layers';" tests/tests.js \
  && ok "tests.js: perfNote() exists and 921 S8 records its five metrics through it" || bad "tests.js: perfNote() or the S8 test's call to it is gone — every pass would say none"
# the PC half can only add numbers: it runs after the phone half's controls and before the budgets, and never throws
awk '/the hot ticks never reached the guest/{c=NR} /const pcHalf = await pcSpeed921\(/{p=NR} /the commit-hook diff at 500 layers is over 30 ms/{b=NR} END{exit !(c && p && b && c < p && p < b)}' tests/tests.js \
  && ok "…its PC half runs after the phone half's two controls and before the budgets it does not touch" || bad "the S8 PC half is not between the phone half's controls and the budgets"

echo "── ship.sh runs THIS test whenever a file it proves changes ──"
TRIG="$(grep -E '^if \[ -n "\$\(git status --porcelain -- .*tools/test-perf-report\.sh' tools/ship.sh | head -1)"
if [ -z "$TRIG" ]; then bad "ship.sh has no 'git status --porcelain -- … tools/test-perf-report.sh …' trigger line"
else
  _untrig=""
  for f in $(grep -oE '(tools|tests)/[A-Za-z0-9_.-]+\.(sh|py)' "$REPO/tools/test-perf-report.sh" | sort -u); do
    printf '%s\n' "$TRIG" | tr ' ' '\n' | grep -qxF "$f" || _untrig="$_untrig $f"
  done
  [ -z "$_untrig" ] && ok "every script this test exercises is in ship.sh's trigger for it" || bad "ship.sh would ship a change to these WITHOUT running this test:$_untrig"
fi

echo
if [ "$FAILED" = 0 ]; then echo "✅ perf-report: every check passed"; else echo "❌ perf-report: a check FAILED (above)"; fi
exit "$FAILED"
