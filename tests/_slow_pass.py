#!/usr/bin/env python3
"""THE SPEED TESTS A PASS CALLED THIS MACHINE TOO SLOW FOR, EACH RUN AGAIN ALONE (11 Oct, after v17.38's second refusal).

    python3 tests/_slow_pass.py --port 8777 --width 1280 --remaining .claude/ship/notrun-desktop.tsv [--out slow.json]

921 S8 times collab code under a CPU throttle worked out from its own speed benchmark, and says NOT RUN when this machine reads
too slow to stand in for the phone. Two hours into a ship that is the laptop running hot (or a page full of earlier tests'
leftovers), not the code — and the feature gate then refused the release for a test that passes alone. So each such test runs
again in a fresh page of its own, up to --tries times with --pause seconds between them for the CPU to cool.

The --remaining file is the pass's NOT RUN list ("name<TAB>reason", as tools/_testfloor.sh notrun_list prints it) and is
rewritten in place: a test that RAN and passed leaves it; one still NOT RUN stays with its newest reason; every other line is
kept unchanged. A test that RAN and FAILED is red here like anywhere (exit 1). Exit 0 = nothing red; 2 = no list to read.
A run counts only when the test with exactly that name ran once in its page — the same rule as tests/_touch_pass.py.
"""
import argparse, json, os, subprocess, sys, time, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
SLOW_REASON = "too slow to stand in for the phone"


def flat(s):
    return " ".join(str(s).split())


def run_one(name, a):
    url = "http://localhost:%d/tests/run.html?only=%s" % (a.port, urllib.parse.quote(name))
    try:
        p = subprocess.run([sys.executable, os.path.join(HERE, "_cdp.py"), "--port", str(a.port), "--width", str(a.width),
                            "--names", "--timeout", str(a.timeout), "--url", url],
                           capture_output=True, text=True, timeout=a.timeout + 120)
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
    ap.add_argument("--remaining", required=True, help="the pass's NOT RUN list (name<TAB>reason), rewritten in place")
    ap.add_argument("--out", default=None, help="write the per-test verdicts here (JSON)")
    ap.add_argument("--tries", type=int, default=3)
    ap.add_argument("--pause", type=int, default=120, help="seconds between tries, for a hot CPU to cool")
    ap.add_argument("--timeout", type=int, default=600)
    a = ap.parse_args()
    try:
        lines = [l.rstrip("\n") for l in open(a.remaining, encoding="utf-8") if l.strip()]
    except OSError:
        print("slow pass: no NOT RUN list at %s — nothing judged" % a.remaining)
        return 2
    slow = [l for l in lines if SLOW_REASON in l.split("\t", 1)[-1]]
    res = {"width": a.width, "total": len(slow), "pass": [], "red": [], "notRun": []}
    keep = {}
    for l in slow:
        name = l.split("\t", 1)[0]
        verdict, why = "notrun", ""
        for t in range(a.tries):
            if t:
                time.sleep(a.pause)
            t0 = time.time()
            verdict, why = run_one(name, a)
            print("   %-6s %3ds  try %d  %s%s" % ({"pass": "pass", "red": "RED", "notrun": "NOTRUN"}[verdict], time.time() - t0, t + 1,
                                               flat(name)[:90], "" if verdict == "pass" else "  — " + why[:180]), flush=True)
            if verdict != "notrun":
                break
        res["pass" if verdict == "pass" else "red" if verdict == "red" else "notRun"].append({"name": name, "why": why})
        if verdict == "notrun":
            keep[l] = flat(name)[:200] + "\t" + flat(why)[:240]
    if a.out:
        with open(a.out, "w", encoding="utf-8") as f:
            json.dump(res, f, indent=1, ensure_ascii=False)
    passed = set(x["name"] for x in res["pass"])
    with open(a.remaining, "w", encoding="utf-8") as f:
        for l in lines:
            if l.split("\t", 1)[0] in passed:
                continue
            f.write(keep.get(l, l) + "\n")
    print("speed tests at %d px, alone after the pass: %d pass, %d red, %d still not run, of %d" % (
        a.width, len(res["pass"]), len(res["red"]), len(res["notRun"]), len(slow)))
    return 1 if res["red"] else 0


if __name__ == "__main__":
    sys.exit(main())
