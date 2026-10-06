#!/bin/bash
# RECORD THIS MACHINE'S BASELINES FOR THE TESTS THAT PIN THE MAC'S OUTPUT (6 Oct, #1071 — his answer: the recommended plan).
#
#   tools/record-baselines.sh                    # record this OS's values into tests/baselines.json, then prove them
#   tools/record-baselines.sh --only '<title>'   # just the pinned tests whose titles contain it (merged into the file)
#   tools/record-baselines.sh --fake-os linux --file .baselines-proof.json   # a PROOF on any machine (never the real file)
#
# WHY. 22 tests pin output recorded on the Mac — picture and sample hashes "byte for byte as on v17.xx" (482), and blur
# tolerances measured there (986 C24). Another OS draws and mixes the same correct code into other bytes: the first WSL
# pass had 16 such reds with nothing broken. tests/tests.js keeps the Mac's numbers as the literals they always were and
# looks every other OS up in tests/baselines.json; an OS with nothing recorded says NOT RUN HERE: no baseline recorded for
# <os> (run tools/record-baselines.sh). This writes that OS's section.
#
# ⚠️ RECORD ON A TREE THE MAC HAS PASSED, AND ONLY THEN. A recording blesses whatever this machine draws today, so it is
# only as good as the code it was taken from: the Mac's full suite must have been green on this commit (a shipped
# release is). It refuses on the Mac (nothing to record — the literals ARE the Mac's), refuses when a pinned test fails
# for any other reason while recording, refuses when a table was not fully seen, and then PROVES the recording: the
# pinned tests must pass at 1280 and at 380 against what was just written, with none NOT RUN for want of a baseline.
# Commit tests/baselines.json afterwards; it is tracked, one section per OS.
set -uo pipefail
cd "$(dirname "$0")/.."
. tools/_platform.sh || { echo "record-baselines: tools/_platform.sh is missing"; exit 2; }
ONLY=""; FAKE=""; FILE="baselines.json"
while [ $# -gt 0 ]; do
  case "$1" in
    --only) ONLY="$2"; shift 2 ;;
    --fake-os) FAKE="$2"; shift 2 ;;
    --file) FILE="$2"; shift 2 ;;
    *) echo "record-baselines: unknown option $1"; exit 2 ;;
  esac
done
case "$FILE" in *[!A-Za-z0-9_.-]*|*/*|"") echo "record-baselines: --file is a plain name under tests/ (got '$FILE')"; exit 2 ;; esac
case "$FILE" in *.json) ;; *) echo "record-baselines: --file must end in .json"; exit 2 ;; esac
if [ -n "$FAKE" ] && [ "$FILE" = baselines.json ]; then
  echo "❌ --fake-os writes another OS's values from THIS machine — never into the tracked tests/baselines.json. Pass --file <name>.json."; exit 2
fi
if [ -z "$FAKE" ] && [ "$(fm_os)" = Darwin ]; then
  echo "❌ this is the Mac: its baselines are the literals in tests/tests.js — there is nothing to record here."; exit 2
fi
fm_chrome >/dev/null || { echo "record-baselines: no Chrome (the reason is above) — nothing recorded"; exit 2; }
fm_require curl python3 || exit 2
for lock in .ship-in-progress .mutation-in-progress .spotcheck-in-progress; do
  [ -f "$lock" ] && { echo "❌ $lock exists — another suite is using this tree; not starting a second one beside it."; exit 2; }
done

PORT="$(python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1])')"
( exec tools/serve.sh "$PORT" ) >/dev/null 2>&1 & SRV=$!
disown "$SRV" 2>/dev/null   # its kill on the way out is ours: no "Terminated" line from the shell
TMP="$(mktemp -d "${TMPDIR:-/tmp}/fm-baselines-XXXXXX")"
trap 'kill "$SRV" 2>/dev/null; rm -rf "$TMP"' EXIT
UP=0; for _ in $(seq 1 20); do curl -s -o /dev/null "http://127.0.0.1:$PORT/tests/run.html" && { UP=1; break; }; sleep 0.5; done
[ "$UP" = 1 ] || { echo "record-baselines: tools/serve.sh never answered on port $PORT — nothing recorded"; exit 2; }

Q="pinned=1"
[ -n "$ONLY" ] && Q="$Q&only=$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1], safe=""))' "$ONLY")"
[ -n "$FAKE" ] && Q="$Q&fmos=$FAKE"
OS_SEEN=""
echo "→ recording: the pinned tests, once, at 1280 px ($( [ -n "$FAKE" ] && echo "faking OS '$FAKE'" || echo "OS $(fm_os)"))…"
python3 tests/_cdp.py --url "http://127.0.0.1:$PORT/tests/run.html?$Q&fmrecord=1" --width 1280 --timeout 3000 \
  --record-baselines "$TMP/rec.json" > "$TMP/run.json" 2>"$TMP/run.err"
RC=$?
MERGE="$(python3 - "$TMP/rec.json" "$TMP/run.json" "tests/$FILE" "$RC" "$( [ -n "$ONLY" ] && echo merge || echo replace)" "$(git rev-parse --short HEAD 2>/dev/null)" <<'PY'
import json, sys, time
rec_f, run_f, out_f, rc, mode, head = sys.argv[1:7]
def bad(msg):
    print("REFUSE\t" + msg); sys.exit(0)
try: run = json.loads(open(run_f, encoding='utf-8').read() or 'null')
except Exception: run = None
if not isinstance(run, dict): bad("the recording run gave no result (exit %s) — nothing recorded" % rc)
if run.get("error"): bad("the recording run did not run: %s" % run["error"][:300])
if run.get("failures"):
    bad("a pinned test FAILED while recording, for a reason a baseline cannot cover — fix that first: " + " | ".join(f[:200] for f in run["failures"][:3]))
nr = [r for r in (run.get("notRun") or [])]
if nr: bad("a pinned test said NOT RUN HERE while recording: " + "; ".join("%s — %s" % (r.get("name", "")[:80], r.get("reason", "")[:120]) for r in nr[:3]))
try: rec = json.loads(open(rec_f, encoding='utf-8').read() or 'null')
except Exception: rec = None
if not isinstance(rec, dict): bad("the page published no recording (window.__fmBaselineRecord) — nothing recorded")
if rec.get("incomplete"): bad("these tables were not fully seen, so a later run would be NOT RUN on them: " + "; ".join(rec["incomplete"][:4]))
if not rec.get("tables") and not rec.get("tols"): bad("nothing was recorded (no pinned test ran?)")
osname = rec.get("os") or "unknown"
try: base = json.loads(open(out_f, encoding='utf-8').read())
except FileNotFoundError: base = {}
except Exception as e: bad("tests/%s is not readable JSON (%s) — fix or delete it first" % (out_f, e))
sec = base.get(osname) if (mode == "merge" and isinstance(base.get(osname), dict)) else {}
tables = dict(sec.get("tables") or {}); tables.update(rec.get("tables") or {})
tols = dict(sec.get("tols") or {}); tols.update(rec.get("tols") or {})
base["_about"] = ("Per-OS baselines for the tests that pin the Mac's output (tests/tests.js pinned()/pinTol()). The Mac's "
                  "values are the literals in tests.js; each other OS's are recorded here by tools/record-baselines.sh.")
base[osname] = {"recorded": time.strftime("%Y-%m-%d %H:%M"), "commit": head, "browser": run.get("browser", ""),
                "tests": sorted(set((sec.get("tests") or []) + (rec.get("tests") or []))), "tables": tables, "tols": tols}
with open(out_f + ".tmp", "w", encoding="utf-8") as f:
    json.dump(base, f, indent=1, sort_keys=True, ensure_ascii=False); f.write("\n")
import os; os.replace(out_f + ".tmp", out_f)
print("OK\t%s\t%d\t%d\t%d" % (osname, len(rec.get("tables") or {}), len(rec.get("tols") or {}), len(rec.get("tests") or [])))
PY
)"
case "$MERGE" in
  REFUSE*) echo "❌ ${MERGE#REFUSE	}"; tail -3 "$TMP/run.err" 2>/dev/null | sed 's/^/   /'; exit 1 ;;
  OK*) IFS=$'\t' read -r _ OS_SEEN NT NL NTESTS <<< "$MERGE"
       echo "   recorded for '$OS_SEEN': $NT pinned table(s) and $NL tolerance set(s) from $NTESTS test(s) → tests/$FILE" ;;
  *) echo "❌ the merge step said nothing useful: $MERGE"; exit 1 ;;
esac

# PROVE IT: the pinned tests must now PASS here, against what was just written, at both widths — and none may be NOT RUN
# for want of a baseline. (Any other NOT RUN — a missing encoder — is listed, and is not this script's to fix.)
VQ="pinned=1"
[ -n "$ONLY" ] && VQ="$VQ&only=$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1], safe=""))' "$ONLY")"
[ -n "$FAKE" ] && VQ="$VQ&fmos=$FAKE"
[ "$FILE" != baselines.json ] && VQ="$VQ&fmbaselines=$FILE"
FAILV=0
for W in 1280 380; do
  echo "→ proving the recording at ${W}px…"
  python3 tests/_cdp.py --url "http://127.0.0.1:$PORT/tests/run.html?$VQ" --width "$W" --timeout 3000 > "$TMP/v$W.json" 2>/dev/null
  V="$(python3 - "$TMP/v$W.json" <<'PY'
import json, sys
try: d = json.loads(open(sys.argv[1], encoding='utf-8').read())
except Exception: print("BAD\tno result"); sys.exit()
if d.get("error"): print("BAD\tdid not run: " + d["error"][:200]); sys.exit()
nb = [r for r in (d.get("notRun") or []) if "baseline" in (r.get("reason") or "")]
if nb: print("BAD\tstill NOT RUN for want of a baseline: " + "; ".join(r["name"][:80] for r in nb[:3])); sys.exit()
if not d.get("ok"): print("BAD\tred against the recording: " + " | ".join(f[:200] for f in (d.get("failures") or [])[:3])); sys.exit()
other = d.get("notRun") or []
print("OK\t" + d.get("summary", "") + ((" — NOT RUN for another reason: " + "; ".join(r["name"][:60] + " (" + r["reason"][:60] + ")" for r in other[:3])) if other else ""))
PY
)"
  case "$V" in OK*) echo "   ✅ ${V#OK	}" ;; *) echo "   ❌ ${V#BAD	}"; FAILV=1 ;; esac
done
if [ "$FAILV" = 1 ]; then
  echo "❌ THE RECORDING DOES NOT HOLD — the pinned tests are not green against it (above). tests/$FILE was written; do not"
  echo "   commit it. The usual cause is a test whose picture differs run to run on this machine, or between widths."
  exit 1
fi
echo "✅ baselines for '$OS_SEEN' recorded and proven at 1280 and 380 px."
[ "$FILE" = baselines.json ] && echo "   Commit tests/baselines.json (it is tracked) — then this machine's full suite runs those tests instead of NOT RUN HERE."
exit 0
