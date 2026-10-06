#!/usr/bin/env python3
"""Measure what each test leaves in memory, one SLICE of the suite at a time (#1085, 7 Oct).

    python3 tests/_memrun.py --port 9111 --out DIR 0-149 150-299 …     # suite positions, 0-based, inclusive
    python3 tests/_memrun.py --port 9111 --out DIR --step 150 --from 0 --to 2285

Each slice is one tests/_cdp.py run with ?fmmem=1&fmrange=A-B and --mem DIR/A-B.mem (tests/_memhook.py writes one JSON
line per test). It exists because a whole measured suite does not fit in this Mac's memory — which is the bug being
measured — so the suite is cut into slices that each start from a fresh page, and ONE Chrome runs at a time:

  * before every slice it waits until no ship is in progress, the 1-minute load is under 8 and no other fm-cdp Chrome is
    alive (a heavy neighbour makes the numbers and the timings meaningless, and starves a ship);
  * while a slice runs it watches the driver's progress file: a page that has said nothing for --silent seconds (120) is
    itself a finding — the slice is stopped, and DIR/A-B.result names the test it froze on;
  * it also stops a slice when the Mac's free memory falls under --min-free percent (8), before swap takes the machine.

Report with tests/_memreport.py DIR.
"""

import argparse, json, os, re, signal, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
SHIP_LOCK = os.path.join(os.path.dirname(HERE), ".ship-in-progress")
MAIN_LOCK = "/Users/ezrasmith/Claude/FreeMotion/.ship-in-progress"


def load1():
    try:
        out = subprocess.run(["uptime"], capture_output=True, text=True).stdout
        return float(re.search(r"load averages?: ([0-9.]+)", out).group(1))
    except Exception:
        return 0.0


def free_pct():
    try:
        out = subprocess.run(["memory_pressure"], capture_output=True, text=True, timeout=20).stdout
        return int(re.search(r"free percentage: (\d+)%", out).group(1))
    except Exception:
        return 100


def swap_used_mb():
    try:
        out = subprocess.run(["sysctl", "vm.swapusage"], capture_output=True, text=True).stdout
        return float(re.search(r"used = ([0-9.]+)M", out).group(1))
    except Exception:
        return -1.0


def others_alive():
    r = subprocess.run(["pgrep", "-f", "fm-cdp"], capture_output=True, text=True)
    return [p for p in r.stdout.split() if p.strip()]


def other_headless():
    """Headless Chromes of any other tool (a probe's own `cdp-…` profile is not caught by the fm-cdp pattern)."""
    r = subprocess.run(["pgrep", "-f", "Google Chrome --headless"], capture_output=True, text=True)
    return [p for p in r.stdout.split() if p.strip()]


def wait_quiet(log):
    said = False
    t0 = time.time()
    while True:
        busy = []
        if os.path.exists(MAIN_LOCK) or os.path.exists(SHIP_LOCK):
            busy.append("a ship is in progress")
        if load1() >= 8:
            busy.append("load %.1f" % load1())
        if others_alive():
            busy.append("another fm-cdp Chrome is alive")
        if other_headless() and time.time() - t0 < 180:   # a neighbour's probe: give it up to 3 minutes to finish
            busy.append("another headless Chrome is alive")
        if not busy:
            return
        if not said:
            log("waiting: " + ", ".join(busy))
            said = True
        time.sleep(30)


def tree(pid):
    out = subprocess.run(["ps", "-Ao", "pid=,ppid="], capture_output=True, text=True).stdout
    kids = {}
    for line in out.splitlines():
        p = line.split()
        if len(p) == 2:
            kids.setdefault(int(p[1]), []).append(int(p[0]))
    res, todo = [], [pid]
    while todo:
        x = todo.pop()
        res.append(x)
        todo.extend(kids.get(x, []))
    return res


def stop(proc):
    """SIGINT first (the driver's finally closes its Chrome and deletes the profile), then the whole tree by force."""
    try:
        proc.send_signal(signal.SIGINT)
        proc.wait(timeout=20)
    except Exception:
        for p in reversed(tree(proc.pid)):
            try:
                os.kill(p, 9)
            except Exception:
                pass


PLAIN_NAMES = []


def run_slice(a, lo, hi, log):
    name = "%d-%d" % (lo, hi)
    mem, prog, res = (os.path.join(a.out, name + ext) for ext in (".mem", ".progress", ".result"))
    for f in (mem, prog):
        if os.path.exists(f):
            os.remove(f)
    if a.plain:
        # A NORMAL run of the same slice — no ?fmmem, nothing in the page waits for anybody — sampled from outside every
        # 2 s, so the instrument's own cost can be told from the suite's (DIR/A-B.plain, one JSON line per sample).
        from urllib.parse import quote
        nm = PLAIN_NAMES
        q = []
        if lo > 0:
            q.append("after=" + quote(nm[lo - 1]))
        q.append("upto=" + quote(nm[hi]))
        url = "http://localhost:%d/tests/run.html?%s" % (a.port, "&".join(q))
        cmd = [sys.executable, os.path.join(HERE, "_cdp.py"), "--port", str(a.port), "--url", url, "--timeout", str(a.timeout),
               "--quiet", "--progress", prog, "--width", str(a.width)]
        plain = open(os.path.join(a.out, name + ".plain"), "w")
    else:
        url = "http://localhost:%d/tests/run.html?fmmem=1&fmrange=%s" % (a.port, name) + ("&fmrepeat=%d" % a.repeat if a.repeat > 1 else "")
        cmd = [sys.executable, os.path.join(HERE, "_cdp.py"), "--port", str(a.port), "--url", url, "--timeout", str(a.timeout),
               "--quiet", "--progress", prog, "--mem", mem, "--width", str(a.width)]
        plain = None
    env = dict(os.environ)
    env["FM_MEM_INFRA"] = str(a.infra or 0)
    if a.no_deep:
        env["FM_MEM_DEEP"] = "0"
    t0 = time.time()
    swap0 = swap_used_mb()
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, env=env)
    verdict, low_free = "", 100
    last_lines = 0
    sys.path.insert(0, HERE)
    import _memhook
    while proc.poll() is None:
        time.sleep(2 if plain else 5)
        if plain:
            out = subprocess.run(["ps", "-Ao", "pid=,ppid=,command="], capture_output=True, text=True).stdout
            kids = [int(l.split()[0]) for l in out.splitlines() if len(l.split()) > 2 and l.split()[1] == str(proc.pid) and "Chrome" in l]
            chrome = kids[0] if kids else None
            if chrome:
                snap = _memhook.snapshot_procs(chrome)
                try:
                    cur = json.load(open(prog)).get("test", "")
                except Exception:
                    cur = ""
                plain.write(json.dumps({"t": round(time.time() - t0, 1), "test": cur, "procs": {str(k): [v["kind"], v["fp"]] for k, v in snap.items()}}) + "\n")
                plain.flush()
        ref = max([os.path.getmtime(f) for f in (prog, mem) if os.path.exists(f)] or [t0])
        silent = time.time() - ref
        try:
            p = json.load(open(prog))
            silent = max(silent, p.get("page_silent_s", 0))
        except Exception:
            p = {}
        n = sum(1 for _ in open(mem)) if os.path.exists(mem) else 0
        if n != last_lines:
            last_lines = n
        fp = free_pct() if int(time.time() - t0) % 30 < 5 else None
        if fp is not None:
            low_free = min(low_free, fp)
        if silent > a.silent and time.time() - t0 > 90:
            verdict = "FROZE: the page said nothing for %ds on '%s' (%d tests measured)" % (silent, p.get("test", "?"), max(0, n - 2))
            break
        if fp is not None and fp < a.min_free:
            verdict = "STOPPED: the Mac's free memory fell to %d%% on '%s' (%d tests measured)" % (fp, p.get("test", "?"), max(0, n - 2))
            break
    if proc.poll() is None:
        stop(proc)
    out = proc.stdout.read() if proc.stdout else ""
    rec = {"slice": name, "secs": round(time.time() - t0), "verdict": verdict or "finished", "exit": proc.returncode,
           "driver": out.strip()[-3000:], "lowFreePct": low_free, "swapMB": [swap0, swap_used_mb()]}
    with open(res, "w") as f:
        json.dump(rec, f, indent=1)
    log("%s: %s in %ds (exit %s, low free %d%%, swap %s→%s MB) %s" % (name, rec["verdict"], rec["secs"], proc.returncode, low_free,
                                                                         swap0, rec["swapMB"][1], out.strip().splitlines()[0][:160] if out.strip() else ""))
    return rec


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("ranges", nargs="*")
    ap.add_argument("--port", type=int, default=9111)
    ap.add_argument("--out", required=True)
    ap.add_argument("--step", type=int, default=150)
    ap.add_argument("--from", dest="lo", type=int, default=None)
    ap.add_argument("--to", dest="hi", type=int, default=None)
    ap.add_argument("--timeout", type=int, default=3000)
    ap.add_argument("--silent", type=int, default=120)
    ap.add_argument("--min-free", type=int, default=8)
    ap.add_argument("--infra", type=int, default=5, help="memory-infra dump every Nth test (0 = never)")
    ap.add_argument("--width", type=int, default=1280)
    ap.add_argument("--repeat", type=int, default=1, help="run every test of the slice N times in a row (fmrepeat)")
    ap.add_argument("--no-deep", action="store_true", help="skip the per-test heap walk")
    ap.add_argument("--plain", default=None, metavar="NAMES", help="a NORMAL run (no fmmem) sampled from outside; NAMES = a file of "
                    "the suite's test names in order, one per line (or idx<TAB>line<TAB>name)")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    if a.plain:
        global PLAIN_NAMES
        PLAIN_NAMES = [l.rstrip("\n").split("\t")[-1] for l in open(a.plain, encoding="utf-8") if l.strip()]
    ranges = []
    for r in a.ranges:
        lo, hi = r.split("-")
        ranges.append((int(lo), int(hi)))
    if a.lo is not None:
        x = a.lo
        while x <= a.hi:
            ranges.append((x, min(a.hi, x + a.step - 1)))
            x += a.step
    logf = open(os.path.join(a.out, "run.log"), "a")

    def log(msg):
        line = time.strftime("%H:%M:%S ") + msg
        print(line, flush=True)
        logf.write(line + "\n")
        logf.flush()

    for lo, hi in ranges:
        wait_quiet(log)
        log("slice %d-%d starting (load %.1f, free %d%%)" % (lo, hi, load1(), free_pct()))
        run_slice(a, lo, hi, log)


if __name__ == "__main__":
    main()
