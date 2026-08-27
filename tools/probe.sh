#!/usr/bin/env bash
# Run ONE tests/_*.html probe headless and print its #o output.
#   tools/probe.sh _604decode.html [seconds]
# Exists because tests/_cdp.py only knows how to wait for the REGRESSION runner's #sum. Every
# ad-hoc probe in tests/ was otherwise driven by hand-rolled python pasted into a Bash call,
# which is how one of them got run against a mutated tree.
set -euo pipefail
cd "$(dirname "$0")/.."
PAGE="${1:?usage: tools/probe.sh _name.html [seconds]}"
WAIT="${2:-120}"
[ -f "tests/$PAGE" ] || { echo "no such probe: tests/$PAGE"; exit 2; }
if [ -f .mutation-in-progress ]; then
  echo "❌ a mutation is in progress — a browser reading now would describe the MUTATION, not the code."
  exit 3
fi
PORT=8777
python3 -m http.server $PORT >/dev/null 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null || true' EXIT
sleep 1
python3 - "$PAGE" "$WAIT" "$PORT" <<'PY'
import sys, os, tempfile, time
sys.path.insert(0, os.path.join(os.getcwd(), "tests"))
import importlib.util
spec = importlib.util.spec_from_file_location("cdpmod", "tests/_cdp.py")
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
page, wait, port = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
dp = m.free_port(); prof = tempfile.mkdtemp()
proc = m.launch(dp, 1280, 900, prof); cdp = None
try:
    cdp = m.CDP(m.ws_url(dp))
    cdp.send("Page.enable"); cdp.send("Runtime.enable")
    cdp.send("Page.navigate", url=f"http://localhost:{port}/tests/{page}")
    deadline = time.time() + wait
    last = ""
    while time.time() < deadline:
        try:
            done = cdp.eval("!!window.__done")
            last = cdp.eval("(document.getElementById('o')||{}).textContent||''") or last
            if done: break
        except Exception: pass
        time.sleep(1.0)
    print(last if last else "(the probe printed nothing)")
    if time.time() >= deadline: print("\n⚠️ probe did not signal __done within %ds" % wait)
finally:
    if cdp: cdp.close()
    proc.terminate()
PY
