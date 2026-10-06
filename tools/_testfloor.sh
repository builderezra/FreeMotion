# ---------------------------------------------------------------------------------------------------
# THE SUITE MUST HAVE ACTUALLY RUN. Sourced by ship.sh and mutate.sh; one copy, because two copies of a
# safety check is how they end up disagreeing.
#
# WHY THIS EXISTS, measured 20 Aug 2026. Both scripts asked only whether anything FAILED — ship.sh for
# `"ok": true`, mutate.sh for the absence of FAIL lines. Neither asked whether any test had run. So a
# tests/tests.js with a SYNTAX ERROR registers ZERO tests, nothing fails, and both scripts call that
# green: ship.sh would have committed and pushed it while printing a tick, and mutate.sh cached the
# tree as a proven-green baseline. Demonstrated deliberately — an unbalanced brace spliced into the
# file came back "every test still passed".
#
# A count that only ever goes UP is the guarantee: the floor is raised on every green run, so the next
# run has to at least match it. Deleting a test on purpose is the one case that trips it, and the
# message says so — a deliberate removal is one line of maintenance, which is the right price for
# closing a hole that silently pushes a suite that never ran.
test_floor_check() {
  local out="$1" floor_file="tools/.test-floor" n floor
  n="$(printf '%s' "$out" | grep -o '"summary": "Regression [0-9]*/[0-9]*' | head -1 | sed 's|.*/||')"
  if [ -z "$n" ] || [ "$n" -eq 0 ] 2>/dev/null; then
    echo "❌ THE SUITE REGISTERED NO TESTS AT ALL — that is not green, that is a suite that never ran."
    echo "   The usual cause is a syntax error in tests/tests.js, which registers zero tests and so"
    echo "   fails nothing. Its parse, checked now (jsc on the Mac, node elsewhere — tools/_platform.sh fm_js_parse):"
    if command -v fm_js_parse >/dev/null 2>&1; then
      echo "   tests/tests.js: $(fm_js_parse tests/tests.js 2>&1 | head -3)"
    else
      echo "   (tools/_platform.sh is not loaded here — run:  . tools/_platform.sh; fm_js_parse tests/tests.js)"
    fi
    return 1
  fi
  floor="$(cat "$floor_file" 2>/dev/null || echo 0)"
  case "$floor" in ''|*[!0-9]*) floor=0;; esac
  if [ "$n" -lt "$floor" ]; then
    echo "❌ THE SUITE REGISTERED $n TESTS BUT THIS REPO HAS RUN $floor — $((floor - n)) went missing."
    echo "   Tests do not vanish on their own: the usual cause is tests/tests.js failing to parse, or a"
    echo "   test file that returns early, either of which reads as GREEN because nothing failed."
    echo "   If you removed a test on purpose, lower the number yourself:  echo $n > $floor_file"
    return 1
  fi
  printf '%s' "$n" > "$floor_file"
  return 0
}

# THE SUITE'S TIME CAP, IN ONE PLACE (6 Oct). ship.sh has set it from tools/.suite-seconds since 30 Sep — 1.6x the last green
# pass, never below an hour — while mutate.sh still hard-coded 1800 s, under the Mac's own measured 2697 s pass. Its runs
# then timed out with no FAIL line and read as "SURVIVED — the assertion is DEAD". One function, both callers.
#
# PER MACHINE (6 Oct, #1071). tools/.suite-seconds held ONE number, and two machines now run the suite: the Mac (2697 s) and
# the Windows laptop under WSL (2905 s). Each green pass overwrote the other's, so one machine's cap was always set from the
# other's pass. Now one line per machine — "<machine id> <seconds>" — each pass writes its own line and keeps the rest, and a
# machine with no line of its own takes the LARGEST known (a cap too long costs a wait; too short kills a good run). A bare
# number (the old format) counts as one more known value. The id is fm_machine_id (tools/_platform.sh): the short hostname.
suite_machine() {
  if command -v fm_machine_id >/dev/null 2>&1; then fm_machine_id
  else hostname -s 2>/dev/null || uname -n; fi
}
# suite_seconds_for [ID] — that machine's last green pass in seconds; its own line, else the largest known, else 0
suite_seconds_for() {
  awk -v m="${1:-$(suite_machine)}" '
    NF == 1 && $1 ~ /^[0-9]+$/ { if ($1 + 0 > max) max = $1 + 0; next }
    NF >= 2 && $2 ~ /^[0-9]+$/ { if ($1 == m) mine = $2 + 0; if ($2 + 0 > max) max = $2 + 0 }
    END { if (mine != "") print mine; else print max + 0 }' tools/.suite-seconds 2>/dev/null || echo 0
}
# suite_seconds_record SECONDS [ID] — set this machine's line, keep every other machine's (a bare old number is dropped once
# a machine has its own line: it was the Mac's, and the Mac's own pass replaces it)
suite_seconds_record() {
  local id="${2:-$(suite_machine)}" tmp="tools/.suite-seconds.$$.tmp"
  case "$1" in ''|*[!0-9]*) echo "suite_seconds_record: '$1' is not a number of seconds" >&2; return 1 ;; esac
  { awk -v m="$id" 'NF >= 2 && $1 != m && $2 ~ /^[0-9]+$/ { print $1, $2 }' tools/.suite-seconds 2>/dev/null
    echo "$id $1"; } | sort > "$tmp" && mv -f "$tmp" tools/.suite-seconds
}
suite_timeout() {
  local last t
  last="$(suite_seconds_for)"
  t=$(( ${last:-0} * 16 / 10 ))
  [ "$t" -lt 3600 ] && t=3600
  echo "$t"
}

# ---- NOT RUN HERE, BY NAME (6 Oct, #1071) ----------------------------------------------------------------------------
# tests.js's third verdict: a test that needs what this machine lacks (an AAC encoder, a BarcodeDetector, touch emulation,
# a baseline recorded for this OS) says NOT RUN HERE instead of failing or quietly passing. tests/_cdp.py lists every one
# under "notRun" in its JSON — always, [] when there are none. This prints them "name<TAB>reason", one a line, and nothing
# when there are none; a result with NO notRun list at all is not "none" (a driver that could not say), so it prints one
# "?" line and the caller treats it as a NOT RUN it cannot name.
notrun_list() {
  printf '%s' "$1" | python3 -c '
import json, sys
raw = sys.stdin.read(); dec = json.JSONDecoder(); d = None
for i in [0] + [k + 1 for k, c in enumerate(raw) if c == "\n"]:
    if raw.startswith("{", i):
        try: o, _ = dec.raw_decode(raw, i)
        except ValueError: continue
        if isinstance(o, dict) and "ok" in o: d = o; break
flat = lambda s: " ".join(str(s).split())
if d is None or not isinstance(d.get("notRun"), list):
    print("?\tthe driver result carries no NOT RUN list, so whether every test ran is unknown"); sys.exit()
for r in d["notRun"]: print(flat(r.get("name", ""))[:200] + "\t" + flat(r.get("reason", ""))[:240])
'
}

# What ship.sh says after each pass: the list, by name, and — on the Mac — a refusal. The Mac is the reference machine:
# every feature, its own baselines (the literals in tests/tests.js), real touch emulation. A NOT RUN there is a test that
# lost its only machine, which is news, not noise. Elsewhere it is listed and the release goes on, EXCEPT where its diff
# touches what a not-run test covers (ship.sh's feature gate). $1 = the driver output, $2 = which pass. Returns 1 to refuse.
notrun_report() {
  local nr n
  nr="$(notrun_list "$1")"
  [ -n "$nr" ] || return 0
  n="$(printf '%s\n' "$nr" | wc -l | tr -d ' ')"
  echo "⚠️  NOT RUN HERE on the $2 pass — $n test(s) need what this machine does not have (never counted as a pass):"
  printf '%s\n' "$nr" | head -40 | awk -F'\t' '{ printf "     · %s — %s\n", substr($1, 1, 110), $2 }'
  [ "$n" -gt 40 ] && echo "     … and $((n - 40)) more"
  if [ "$(uname -s)" = Darwin ]; then
    echo "❌ THE MAC RUNS EVERY TEST — a NOT RUN HERE on it means a test lost the one machine that runs it (a Chrome update"
    echo "   that dropped a feature, a baseline that went missing). Find out why before shipping; nothing is committed or pushed."
    return 1
  fi
  return 0
}
# font_report — one ⚠️ line when the driver measured the app's text in a different font than the Mac's (tests/_cdp.py
# fontParity, 6 Oct — the PM's review). Reported, never refused: a different font moves every width, wrap and clip the
# suite measures, so a layout green here is not proven for his iPhone — the Mac's passes are the ones that say so.
font_report() {
  printf '%s' "$1" | python3 -c '
import json, sys
raw = sys.stdin.read(); dec = json.JSONDecoder()
for i in [0] + [k + 1 for k, c in enumerate(raw) if c == "\n"]:
    if raw.startswith("{", i):
        try: d, _ = dec.raw_decode(raw, i)
        except ValueError: continue
        if isinstance(d, dict) and "ok" in d:
            f = d.get("fontParity") or {}
            if f.get("same") is False:
                m = f.get("mac") or {}
                print("⚠️  FONT (%s pass): the app text was measured in %s (%s px), the Mac draws it in %s (%s px) — widths, wraps"
                      " and clipping on this pass are NOT the Mac or iPhone ones; trust a layout once the Mac passes it too."
                      % (sys.argv[1], f.get("resolved"), f.get("width"), m.get("resolved"), m.get("width")))
            break
' "${2:-a}" 2>/dev/null
  return 0
}

