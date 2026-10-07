#!/usr/bin/env python3
"""THE FINGER TESTS A LINUX FULL PASS COULD NOT RUN, EACH IN A BROWSER OF ITS OWN (7 Oct, #1097).

    python3 tests/_cdp.py --port 8777 [--width 380] > full.json                # a full pass: its finger tests say NOT RUN HERE
    python3 tests/_touch_pass.py --port 8777 --from full.json [--width 380] --out touch.json --remaining remaining.tsv

On Linux headless Chrome the first touch-emulation OFF takes the PAGE's mouse for good, so a full pass cannot give its ~90 real-finger
tests the phone's media state (tests/_platform.py). A fresh browser can: each finger test runs alone (?only=<its exact name>), with
FM_TOUCH_PAGE=1 — real emulation, as on the Mac — and the browser is thrown away. The cloud helper's H17 measured 84 of 88 green
this way at both widths (hunt/1097-linux-touch, lead 2).

A finger test COUNTS only when the test with exactly that name ran in its page and passed: ?only= matches substrings, so a name that
is a prefix of another runs both, and the verdict read is the exact one's. A run that reached no verdict (no JSON, a crashed Chrome,
the exact name missing from what ran) is RED here, never a pass, and so is a test that answers NOT RUN for some other reason — it
stays in the remaining list, with that reason.

--remaining writes the full pass's NOT RUN list minus the finger tests that passed here, one "name<TAB>reason" line each, in exactly
the form tools/_testfloor.sh notrun_list prints, so ship.sh's feature gate reads it unchanged: green finger tests leave the list
(they RAN here), everything else stays. Exit 0 = every finger test passed; 1 = at least one was red; 2 = nothing could be judged.
"""
import argparse, json, os, subprocess, sys, time, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
TOUCH_REASON = "needs real touch emulation"


def flat(s):
    return " ".join(str(s).split())


def tsv(name, reason):
    # the same flattening and lengths as tools/_testfloor.sh notrun_list — the feature gate compares these lines
    return flat(name)[:200] + "\t" + flat(reason)[:240]


def load(path):
    raw = open(path, encoding="utf-8").read()
    dec = json.JSONDecoder()
    for i in [0] + [k + 1 for k, c in enumerate(raw) if c == "\n"]:
        if raw.startswith("{", i):
            try:
                o, _ = dec.raw_decode(raw, i)
            except ValueError:
                continue
            if isinstance(o, dict) and "ok" in o:
                return o
    return None


def run_one(name, a, after=None):
    # alone (?only=<name>), or IN ORDER: every test after the previous finger test up to this one, as the full pass runs them
    if a.in_order:
        q = "upto=%s" % urllib.parse.quote(name) + ("&after=%s" % urllib.parse.quote(after) if after else "")
    else:
        q = "only=%s" % urllib.parse.quote(name)
    url = "http://localhost:%d/tests/run.html?%s" % (a.port, q)
    env = dict(os.environ, FM_TOUCH_PAGE="1")
    try:
        p = subprocess.run([sys.executable, os.path.join(HERE, "_cdp.py"), "--port", str(a.port), "--width", str(a.width),
                            "--names", "--timeout", str(a.timeout), "--url", url],
                           env=env, capture_output=True, text=True, timeout=a.timeout + 120)
        out = p.stdout
    except subprocess.TimeoutExpired:
        return "red", "the driver did not return within %ss" % (a.timeout + 120)
    i = out.find("{")
    try:
        r = json.loads(out[i:]) if i >= 0 else None
    except ValueError:
        r = None
    if not isinstance(r, dict):
        return "red", "no verdict: " + flat(out[-160:] + " " + p.stderr[-160:])
    if r.get("error"):
        return "red", "no verdict: " + flat(r["error"])[:300]
    ran = [x for x in (r.get("ran") or []) if x.get("name") == name]
    if len(ran) != 1:
        return "red", "the exact test did not run once in its page (ran: %d match(es) of %d)" % (len(ran), len(r.get("ran") or []))
    x = ran[0]
    if x.get("notRun"):
        return "notrun", flat(x["notRun"])
    if not x.get("ok"):
        fails = [f for f in (r.get("failures") or []) if name[:60] in f]
        return "red", flat(fails[0] if fails else "failed")[:400]
    return "pass", ""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8777)
    ap.add_argument("--width", type=int, default=1280)
    ap.add_argument("--from", dest="src", required=True, help="the full pass's tests/_cdp.py JSON")
    ap.add_argument("--timeout", type=int, default=300, help="seconds per finger test")
    ap.add_argument("--out", default=None, help="write the per-test verdicts here (JSON)")
    ap.add_argument("--remaining", default=None, help="write the NOT RUN list minus the finger tests that passed (name<TAB>reason)")
    # A VALIDATION, NOT A SHIP STEP (the PM, 7 Oct): a page of its own is CLEANER than the suite's — no earlier test's scene,
    # selection or settings — so a finger test that only passes alone would be a false green. --in-order gives each finger test
    # the tests that run before it in the full pass (from the previous finger test on) in the same fresh browser. About one full
    # pass of time; compare its verdicts with the alone run's.
    ap.add_argument("--in-order", action="store_true", help="run each finger test after its suite-order predecessors")
    a = ap.parse_args()
    d = load(a.src)
    if d is None or not isinstance(d.get("notRun"), list):
        print("touch pass: %s has no driver result with a NOT RUN list — nothing can be judged" % a.src)
        return 2
    touch = [x for x in d["notRun"] if str(x.get("reason", "")).startswith(TOUCH_REASON)]
    res = {"width": a.width, "from": a.src, "mode": "in-order" if a.in_order else "alone", "total": len(touch), "pass": [], "red": [], "notRun": []}
    t_all = time.time()
    prev = None
    for x in touch:
        n = x["name"]
        t0 = time.time()
        verdict, why = run_one(n, a, prev)
        prev = n
        res["pass" if verdict == "pass" else "red" if verdict == "red" else "notRun"].append({"name": n, "why": why})
        print("   %-6s %3ds  %s%s" % ({"pass": "pass", "red": "RED", "notrun": "NOTRUN"}[verdict], time.time() - t0, flat(n)[:100],
                                    "" if verdict == "pass" else "  — " + why[:200]), flush=True)
    res["seconds"] = round(time.time() - t_all)
    passed = set(x["name"] for x in res["pass"])
    if a.out:
        with open(a.out, "w", encoding="utf-8") as f:
            json.dump(res, f, indent=1, ensure_ascii=False)
    if a.remaining:
        with open(a.remaining, "w", encoding="utf-8") as f:
            for x in d["notRun"]:
                if x.get("name") in passed:
                    continue
                own = [y for y in res["notRun"] if y["name"] == x.get("name")]
                f.write(tsv(x.get("name", ""), own[0]["why"] if own else x.get("reason", "")) + "\n")
    print("finger tests at %d px, one page each: %d pass, %d red, %d not run, of %d (%ds)" % (
        a.width, len(res["pass"]), len(res["red"]), len(res["notRun"]), len(touch), res["seconds"]))
    if not touch:
        return 0
    return 1 if res["red"] else 0


if __name__ == "__main__":
    sys.exit(main())
