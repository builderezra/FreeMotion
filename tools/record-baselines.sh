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
# ⚠️ RECORD ON A TREE THE MAC HAS PASSED, AND ONLY THEN — and that is a gate, not this sentence (6 Oct, the port audit,
# MAJOR). A recording blesses whatever the served tree draws (pinSame() stores it and says yes, pinTol() says Infinity), so
# it is only as good as the code it was taken from. It used to serve the WORKING TREE, uncommitted edits and all, stamp it
# with HEAD's hash and never ask whether HEAD had shipped — so a render regression in the tree could be written down as
# this OS's baseline and then "proven" green against itself. Now:
#   • into the tracked tests/baselines.json only when HEAD is a RELEASED commit (in ssh/main — a ship ran the Mac's two
#     suite passes on it). A proof file (--file) may be any commit; it is never what the suite reads.
#   • from HEAD AS COMMITTED: `git archive HEAD` into a temporary directory, which is what is served — never the working
#     tree, whatever it holds. The stamp is then the truth.
#   • and ship.sh refuses a release that carries tests/baselines.json beside shipped source, or a changed section whose
#     commit is not in ssh/main (tools/_shipgates.py baseline-gate) — so a recording ships on its own.
# It also refuses on the Mac (nothing to record — the literals ARE the Mac's), refuses when a pinned test fails for any
# other reason while recording, refuses when a table was not fully seen, and then PROVES the recording: the pinned tests
# must pass at 1280 and at 380 against what was just written, with none NOT RUN for want of a baseline.
# Commit tests/baselines.json afterwards, ON ITS OWN; it is tracked, one section per OS.
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
# WHAT IS RECORDED: HEAD, as committed — and for the tracked file, only a HEAD that has shipped (see the header).
HEAD_FULL="$(git rev-parse --verify -q HEAD)" || { echo "record-baselines: git cannot say what HEAD is — nothing recorded"; exit 2; }
HEAD_SHORT="$(git rev-parse --short "$HEAD_FULL")"
if [ "$FILE" = baselines.json ]; then
  export GIT_SSH_COMMAND="${GIT_SSH_COMMAND:-ssh -o ConnectTimeout=15 -o BatchMode=yes}"
  git fetch -q ssh 2>/dev/null || echo "   (could not reach GitHub — judging by the last-fetched ssh/main)"
  if ! git rev-parse -q --verify ssh/main >/dev/null; then
    echo "❌ there is no ssh/main here to say whether HEAD ($HEAD_SHORT) has shipped — nothing recorded."; exit 2
  fi
  if ! git merge-base --is-ancestor "$HEAD_FULL" ssh/main; then
    echo "❌ HEAD ($HEAD_SHORT) is not a released commit (it is not in ssh/main): a recording blesses whatever it draws, so it is"
    echo "   taken only from code a ship has passed on the Mac. Check out a released commit (or ship this one first) — nothing recorded."
    exit 2
  fi
fi
if [ -n "$(git status --porcelain --untracked-files=no 2>/dev/null | grep -v ' tests/baselines\.json$')" ]; then
  echo "   ⚠️  the working tree has uncommitted changes — they are NOT recorded: this records HEAD ($HEAD_SHORT) exactly as committed"
fi
fm_chrome >/dev/null || { echo "record-baselines: no Chrome (the reason is above) — nothing recorded"; exit 2; }
fm_require curl python3 tar || exit 2
for lock in .ship-in-progress .mutation-in-progress .spotcheck-in-progress; do
  [ -f "$lock" ] && { echo "❌ $lock exists — another suite is using this tree; not starting a second one beside it."; exit 2; }
done

TMP="$(mktemp -d "${TMPDIR:-/tmp}/fm-baselines-XXXXXX")"
SRV=""
trap '[ -n "$SRV" ] && kill "$SRV" 2>/dev/null; rm -rf "$TMP"' EXIT
# HEAD's own tree, exported — the server serves THIS, so nothing uncommitted can reach the page (tools/ and audits/ are left
# out: the pinned tests load none of it, and tools/ is most of the repo's weight)
SNAP="$TMP/tree"; mkdir -p "$SNAP"
git archive --format=tar "$HEAD_FULL" -- . ':(exclude)tools' ':(exclude)audits' | tar -x -C "$SNAP" \
  || { echo "record-baselines: could not export HEAD ($HEAD_SHORT) to serve it — nothing recorded"; exit 2; }
PORT="$(python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1])')"
( exec tools/serve.sh "$PORT" "$SNAP" ) >/dev/null 2>&1 & SRV=$!
disown "$SRV" 2>/dev/null   # its kill on the way out is ours: no "Terminated" line from the shell
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
MERGE="$(python3 - "$TMP/rec.json" "$TMP/run.json" "tests/$FILE" "$RC" "$( [ -n "$ONLY" ] && echo merge || echo replace)" "$HEAD_SHORT" <<'PY'
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
# The same exported HEAD is served, with the file just written put into it — the page reads its baselines from there.
cp "tests/$FILE" "$SNAP/tests/$FILE" || { echo "❌ could not put tests/$FILE into the served copy of HEAD to prove it"; exit 1; }
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
[ "$FILE" = baselines.json ] && echo "   Commit tests/baselines.json ON ITS OWN (ship.sh refuses it beside shipped source) — then this machine's full suite runs those tests instead of NOT RUN HERE."
exit 0
