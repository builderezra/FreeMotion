#!/usr/bin/env python3
"""THE SUITE'S MEMORY, WATCHED WHILE IT RUNS (#1085, 7 Oct) — loaded by tests/_cdp.py on EVERY run.

Why it exists. One suite run reserved ~8.7 GB on the Windows laptop, and on this 8 GB Mac the full suite froze part-way with
the page's renderer squeezed into swap — so no release could ship from it. Nothing in the run could say which test grew the
page: a frozen run reads exactly like a hung test, and a run that merely got heavy reads as green. The measurement
(tests/_memrun.py + _memhook.py, ?fmmem=1) found one test holding 2.1 GB (the fx sweep stacking ~195 effects) and the intro
film holding 176 MB for the whole run. Both are fixed; this is the lock on the door, so the next one is named the day it lands
instead of being found by a frozen Mac:

  * every ~0.5 s it reads the page's renderer footprint — macOS phys_footprint (resident + compressed + swapped, i.e. what
    Activity Monitor calls Memory, so a renderer being pushed into swap does not look like it shrank), Linux VmRSS + VmSwap —
    and which test is running (the runner's window.__fmLastTest);
  * the growth between two readings is put against the test that was running at the first of them, so each test's
    "grew while it ran" adds up to the page's whole growth;
  * when the renderer stands more than the BUDGET above the lowest it has been this run, it forces two garbage collections
    first (garbage the collector has not reached yet is not held), and if it is still over, the run FAILS, naming the test
    it crossed in — and with a green suite still exits 1, the code for red;
  * past twice the budget, or with the machine under 8% free memory after a crossing, it stops the run on the spot: the
    point is a machine that stays usable, and every test after that line would be measured on a swapping Mac anyway;
  * at the end it always prints the run's memory line and the tests that grew the page most — never silently.

THE BUDGET IS A MEASUREMENT (see DEFAULT_BUDGET_MB). --mem-budget MB on _cdp.py changes it for one run; 0 turns the guard
off, for a run that is measuring the leak rather than gating on it.
"""

import os, subprocess, sys, time

sys.dont_write_bytecode = True
_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)
import _memhook  # noqa: E402 — proc_mem (libproc / procfs) and chrome_tree, shared with the measuring hook

MB = 1024 * 1024

# THE BUDGET: how far the page's renderer may stand above the lowest it has been in one run. Set from measurement on 7 Oct
# (tests/_memguard.py's own readings of normal runs, after the two fixes): the fullest third of the suite grew the renderer
# by MEASURED_MB below at most, and before the fixes one test alone added 2,157 MB and the runs that froze this Mac had the
# renderer at 2.5-3 GB. The budget sits between the two, so ordinary cache warming passes and one leak of that kind does not.
MEASURED_MB = 0          # filled in from the after-fix runs (see the commit that sets it)
DEFAULT_BUDGET_MB = 1500
SAMPLE_EVERY_S = 0.5
GC_EVERY_S = 20.0         # a crossing is confirmed after a forced collection, at most this often
LOW_FREE_PCT = 8          # past the budget AND under this much free memory: stop the run now


def free_pct():
    """The machine's free memory in percent (macOS: what memory_pressure calls the free percentage; Linux: MemAvailable),
    or None when it cannot be read."""
    try:
        if sys.platform == "darwin":
            out = subprocess.run(["sysctl", "-n", "kern.memorystatus_level"], capture_output=True, text=True, timeout=5).stdout
            return int(out.strip())
        with open("/proc/meminfo") as f:
            kv = dict(l.split(":", 1) for l in f if ":" in l)
        tot = int(kv["MemTotal"].split()[0])
        avail = int(kv["MemAvailable"].split()[0])
        return int(round(100.0 * avail / tot)) if tot else None
    except Exception:
        return None


def _clean(s, n=110):
    """A test name made safe for a line printed beside the driver's JSON: readers find the JSON at the first '{', and
    ship.sh reads FAIL anywhere in a run that did not finish as a red suite."""
    s = str(s or "").replace("{", "(").replace("}", ")").replace("FAIL", "fail").replace("\n", " ")
    return s if len(s) <= n else s[:n - 1] + "…"


NAME_JS = ("(function(){var f=document.getElementById('app');var w=f&&f.contentWindow;"
           "return w?String(w.__fmLastTest||''):'';})()")


class Guard:
    def __init__(self, root_pid, budget_mb=DEFAULT_BUDGET_MB, every=SAMPLE_EVERY_S):
        self.root = root_pid
        self.budget = max(0, float(budget_mb or 0)) * MB
        self.every = every
        self.pid = None
        self.start = None        # the first reading once the suite has started
        self.low = None          # the lowest reading so far — growth is measured from here
        self.peak = (0, "")
        self.last = None         # (fp, name, time) of the previous reading
        self.grew = {}           # name -> bytes the page grew while it ran
        self.first_fp = {}       # name -> the reading when it was first seen running
        self.crossed = None
        self.samples = 0
        self.t_next = 0.0
        self.t_gc = 0.0
        self.t_free = 0.0
        self.low_free = None
        self.note = ""

    # ── reading ─────────────────────────────────────────────────────────────────────────────────────────────────────
    def _find_page_renderer(self):
        """The page's renderer: the biggest renderer once the suite is running (it has loaded the whole app; a spare
        renderer or a collaboration test's extra frame is a fraction of it at that moment). Kept by pid afterwards, so a
        later extra frame cannot be mistaken for it."""
        best = None
        for pid, kind in _memhook.chrome_tree(self.root):
            if kind != "renderer":
                continue
            m = _memhook.proc_mem(pid)
            if m and (best is None or m["fp"] > best[0]):
                best = (m["fp"], pid)
        return best[1] if best else None

    def _read(self):
        if self.pid is None:
            self.pid = self._find_page_renderer()
            if self.pid is None:
                return None
        m = _memhook.proc_mem(self.pid)
        if not m:                              # the renderer went away (a crash is the driver's to report)
            self.note = "the page's renderer (pid %s) went away mid-run" % self.pid
            self.pid = None
            return None
        return m["fp"]

    def tick(self, cdp):
        """Called from the driver's poll loop. Returns None, or "stop" when the run must end now (see the module note)."""
        now = time.time()
        if now < self.t_next:
            return None
        self.t_next = now + self.every
        try:
            name = cdp.eval(NAME_JS) or ""
        except Exception:
            return None
        if not name:
            return None                        # the runner has not started a test yet
        fp = self._read()
        if fp is None:
            return None
        self.samples += 1
        if self.start is None:
            self.start = self.low = fp
        if self.last is not None:
            pfp, pname, _pt = self.last
            self.grew[pname] = self.grew.get(pname, 0) + (fp - pfp)
        self.first_fp.setdefault(name, fp)
        if fp > self.peak[0]:
            self.peak = (fp, name)
        prev_name = self.last[1] if self.last else ""
        prev_age = (now - self.last[2]) if self.last else 0.0
        self.last = (fp, name, now)
        if fp < self.low:
            self.low = fp
        if now - self.t_free > 10:
            self.t_free = now
            fr = free_pct()
            if fr is not None and (self.low_free is None or fr < self.low_free):
                self.low_free = fr
        if not self.budget:
            return None
        over = fp - self.low
        if over > self.budget and self.crossed is None:
            confirmed, gc = fp, False
            if now - self.t_gc > GC_EVERY_S:
                self.t_gc = now
                try:
                    cdp.send("HeapProfiler.collectGarbage")
                    cdp.send("HeapProfiler.collectGarbage")
                    time.sleep(0.3)
                    gc = True
                    confirmed = self._read() or fp
                except Exception:
                    pass
            if confirmed - self.low > self.budget:
                self.crossed = {"test": name, "prev": prev_name if prev_name != name else "", "prevAgo": round(prev_age, 1),
                                "MB": round((confirmed - self.low) / MB), "atMB": round(confirmed / MB),
                                "afterGc": gc, "sample": self.samples}
            else:
                return None
        if self.crossed is not None:
            fr = free_pct()
            if fp - self.low > 2 * self.budget or (fr is not None and fr < LOW_FREE_PCT):
                self.crossed["stopped"] = True
                self.crossed["freePct"] = fr
                return "stop"
        return None

    # ── reporting ───────────────────────────────────────────────────────────────────────────────────────────────────
    def top(self, n=8):
        rows = sorted(((v, k) for k, v in self.grew.items() if v > 0), reverse=True)[:n]
        return [[round(v / MB), _clean(k, 300)] for v, k in rows]

    def report(self):
        """Everything above as plain data, for the JSON. Names are _clean'd: a title can carry FAIL ('967 7c … FAILED …'),
        and ship.sh reads FAIL anywhere in a run that did not finish green as a red suite."""
        end = self.last[0] if self.last else None
        c = dict(self.crossed) if self.crossed else None
        if c:
            c["test"], c["prev"] = _clean(c.get("test"), 300), _clean(c.get("prev"), 300)
        r = {"budgetMB": round(self.budget / MB), "samples": self.samples, "pid": self.pid,
             "startMB": round(self.start / MB) if self.start else None,
             "lowestMB": round(self.low / MB) if self.low else None,
             "endMB": round(end / MB) if end else None,
             "peakMB": round(self.peak[0] / MB) if self.peak[0] else None, "peakTest": _clean(self.peak[1], 300),
             "grewMB": round((end - self.low) / MB) if end and self.low else None,
             "lowFreePct": self.low_free, "crossed": c, "top": self.top()}
        if self.note:
            r["note"] = self.note
        return r

    def failure_row(self):
        """The red row for a crossing, in the runner's own shape ("FAIL" + what + " — " + why), or None. The test comes
        first: a quiet run cuts each row at a few hundred characters."""
        c = self.crossed
        if not c:
            return None
        where = "“%s”" % _clean(c["test"], 160)
        if c.get("prev"):
            where += " (the reading before, %.1f s earlier, was during “%s”)" % (c.get("prevAgo", self.every), _clean(c["prev"], 120))
        tops = "; ".join("+%d MB “%s”" % (mb, _clean(nm, 70)) for mb, nm in self.top(4))
        return ("FAIL MEMORY BUDGET — the page's renderer passed its budget while %s ran: %d MB, %d MB above the lowest it "
                "had been this run (budget %d MB)%s. Grew the page most while they ran: %s. %s (tests/_memguard.py)"
                % (where, c["atMB"], c["MB"], round(self.budget / MB),
                   ", still after a forced garbage collection" if c.get("afterGc") else "", tops or "(no readings)",
                   ("The run was STOPPED there, so the machine stayed usable (free memory %s%%)." % c.get("freePct"))
                   if c.get("stopped") else "The tests after it ran on; their own verdicts stand."))

    def lines(self):
        """The human-readable block printed at the end of every run."""
        r = self.report()
        if not r["samples"]:
            return ["MEMORY  (no readings of the page's renderer were taken%s)" % ("; " + self.note if self.note else "")]
        verdict = ("OVER BUDGET at “%s”" % _clean(self.crossed["test"], 90)) if self.crossed else "within budget"
        if not self.budget:
            verdict = "no budget (guard off)"
        out = ["MEMORY  page renderer %s MB at the first test, %s at the end, lowest %s, peak %s during “%s” — "
               "grew %s MB above its lowest; budget %s MB: %s%s"
               % (r["startMB"], r["endMB"], r["lowestMB"], r["peakMB"], _clean(r["peakTest"], 80), r["grewMB"],
                  r["budgetMB"], verdict, ("; machine low %s%% free" % r["lowFreePct"]) if r["lowFreePct"] is not None else "")]
        if r["top"]:
            out.append("  grew the page most while they ran (read every %.1f s, no forced collection, so a short test can "
                       "share its neighbour's reading):" % self.every)
            for mb, nm in r["top"]:
                out.append("    +%5d MB  %s" % (mb, _clean(nm, 120)))
        return out


# ── SELF-TEST: python3 tests/_memguard.py ─────────────────────────────────────────────────────────────────────────────
# The guard is the only thing standing between the next 2 GB leak and a frozen Mac, and its failure mode is SILENCE: a guard
# that never crosses reads exactly like a suite that never grows. So every rule above is driven here with fake readings —
# no Chrome, a few milliseconds — and tests/_cdp.py runs it before EVERY suite run: a broken guard is a run that did not
# run, said so, never a green run that was not guarded. Each check was proven by mutating the rule it pins (7 of 7 caught).

def selftest():
    fails = []

    def run(seq, budget, gc_drop_mb=0, free=50):
        """seq: [(test name, page renderer MB)], one reading each. gc_drop_mb: what a forced collection gives back."""
        st = {"i": 0, "gc": 0}
        real_tree, real_mem, real_free = _memhook.chrome_tree, _memhook.proc_mem, globals()["free_pct"]
        _memhook.chrome_tree = lambda root: [(root, "browser"), (12, "renderer"), (11, "renderer")]   # the small spare one FIRST

        def mem(pid):
            mb = seq[min(st["i"], len(seq) - 1)][1] - (gc_drop_mb if st["gc"] else 0)
            return {"fp": int((mb if pid == 11 else 40) * MB)}
        _memhook.proc_mem = mem
        globals()["free_pct"] = lambda: free

        class Cdp:
            def eval(self, expr):
                return seq[min(st["i"], len(seq) - 1)][0]

            def send(self, method, **kw):
                st["gc"] += 1
                return {}
        g = Guard(1, budget, every=0)
        stop = None
        gc_every = globals()["GC_EVERY_S"]
        globals()["GC_EVERY_S"] = 0
        try:
            for i in range(len(seq)):
                st["i"] = i
                st["gc"] = 0
                if g.tick(Cdp()) == "stop":
                    stop = seq[i][0]
                    break
        finally:
            _memhook.chrome_tree, _memhook.proc_mem = real_tree, real_mem
            globals()["free_pct"] = real_free
            globals()["GC_EVERY_S"] = gc_every
        return g, stop

    def check(ok, what):
        if not ok:
            fails.append(what)

    steady = [("t%d" % i, 300 + i) for i in range(40)]
    g, stop = run(steady, 500)
    check(g.crossed is None and stop is None, "steady growth of 40 MB crossed a 500 MB budget")
    check(g.report()["pid"] == 11, "the page renderer was not the biggest renderer (picked %s)" % g.report()["pid"])

    leak = [("a%d" % i, 300) for i in range(5)] + [("the leak {FAIL}", 300 + 100 * k) for k in range(1, 9)] + [("after", 1100)]
    g, stop = run(leak, 500)
    c = g.crossed or {}
    check(c.get("test") == "the leak {FAIL}", "a 500 MB budget crossed by one test was not named for it (%r)" % c.get("test"))
    check(bool(g.top(1)) and g.top(1)[0][1] == "the leak (fail)", "the biggest grower was not listed first, cleaned (%r)" % g.top(1))
    row = g.failure_row() or ""
    check(row.startswith("FAIL MEMORY BUDGET") and "the leak (fail)" in row and "{" not in row,
          "the failure row is not a FAIL row naming the cleaned test: %r" % row[:200])
    check(all("{" not in ln and "FAIL" not in ln for ln in g.lines()), "the printed block carries '{' or FAIL: %r" % g.lines())
    check(stop is None, "a crossing below twice the budget stopped the run")

    g, stop = run(leak, 500, gc_drop_mb=700)
    check(g.crossed is None, "garbage a forced collection gives back was counted as held (crossed %r)" % g.crossed)

    runaway = [("b%d" % i, 300) for i in range(3)] + [("runaway", 300 + 200 * k) for k in range(1, 12)]
    g, stop = run(runaway, 500)
    check(stop == "runaway", "growth past twice the budget did not stop the run at the test that did it (%r)" % stop)

    g, stop = run(leak, 500, free=5)
    check(stop == "the leak {FAIL}", "a crossing on a machine under %d%% free did not stop the run (%r)" % (LOW_FREE_PCT, stop))

    g, stop = run(leak, 0)
    check(g.crossed is None and stop is None and bool(g.report()["top"]), "budget 0 is not 'off, still reporting'")

    dip = [("c0", 400), ("c1", 250), ("c2", 700), ("c3", 800)]
    g, stop = run(dip, 500)
    check((g.crossed or {}).get("test") == "c3", "growth is not measured from the LOWEST reading (%r)" % g.crossed)

    # the growth between two readings belongs to the test running at the FIRST of them: one reading of "grower", and the
    # page is 600 MB bigger by the next test's first reading
    edge = [("d0", 300), ("grower", 300), ("quiet", 900), ("quiet2", 900)]
    g, stop = run(edge, 5000)
    check(g.top(1) == [[600, "grower"]], "growth across a test boundary went to %r, not the test that was running" % g.top(1))

    return fails


if __name__ == "__main__":
    _f = selftest()
    for _x in _f:
        print("memguard self-test FAILED: " + _x)
    if not _f:
        print("memguard self-test: all 13 checks passed")
    sys.exit(1 if _f else 0)
