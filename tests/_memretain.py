#!/usr/bin/env python3
"""WHO HOLDS IT — a heap snapshot after a slice of the suite, and the retaining path of everything big it left (#1085).

    python3 tests/_memretain.py --port 9111 --range 1279-1279 [--repeat 1] [--targets canvas,media,audio,window] [--out FILE]

Runs tests.js's ?fmmem=1&fmrange=A-B in its own headless Chrome (ONE Chrome — the same as tests/_cdp.py's), answers the
runner's handshake after every test, and after the LAST test of the range: collects garbage twice, takes a V8 heap snapshot
of the page, finds every target object (a detached <canvas>, a media element, an AudioContext, a detached Window…) and
prints the shortest retaining path from a GC root to each, grouped — so "2 GB of canvases are alive" becomes "411 canvases
are held by fx-thumbs.js's `cache` Map through …". The heap walk of tests/_memhook.py (counts and sizes by creator) is
printed with it. Nothing here runs in a normal suite run.
"""

import argparse, json, os, shutil, sys, tempfile, time
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.dont_write_bytecode = True
import _cdp, _memhook  # noqa: E402

# Blink's own nodes in a V8 heap snapshot are "native" and named by their markup for an element (`<canvas width="1080"
# height="1920">`, with detachedness 2 once detached) or by their class otherwise. A target is a name PREFIX.
TARGETS = {
    "canvas": ("<canvas",),
    "media": ("<video", "<audio"),
    "audio": ("AudioContext", "OfflineAudioContext"),
    "window": ("Window",),
    "iframe": ("<iframe",),
    "bitmap": ("ImageBitmap",),
}
APP = "document.getElementById('app').contentWindow"


def take_snapshot(cdp):
    cdp.send("HeapProfiler.enable")
    cdp.send("HeapProfiler.collectGarbage")
    cdp.send("HeapProfiler.collectGarbage")
    _, evs = _memhook._send_collect(cdp, "HeapProfiler.takeHeapSnapshot", reportProgress=False, captureNumericValue=False)
    chunks = [e["params"]["chunk"] for e in evs if e.get("method") == "HeapProfiler.addHeapSnapshotChunk"]
    return json.loads("".join(chunks))


def analyse(snap, kinds, max_groups=12, detached_only=True, exclude=()):
    meta = snap["snapshot"]["meta"]
    nf, ef = meta["node_fields"], meta["edge_fields"]
    ntypes, etypes = meta["node_types"][0], meta["edge_types"][0]
    N, E, S = snap["nodes"], snap["edges"], snap["strings"]
    nfl, efl = len(nf), len(ef)
    i_type, i_name, i_size, i_ec = nf.index("type"), nf.index("name"), nf.index("self_size"), nf.index("edge_count")
    i_det = nf.index("detachedness") if "detachedness" in nf else None
    e_type, e_name, e_to = ef.index("type"), ef.index("name_or_index"), ef.index("to_node")
    n = len(N) // nfl
    first = [0] * (n + 1)
    for k in range(n):
        first[k + 1] = first[k] + N[k * nfl + i_ec] * efl
    weak = etypes.index("weak") if "weak" in etypes else -1
    shortcut = etypes.index("shortcut") if "shortcut" in etypes else -1
    # BFS from the root over strong edges: parent pointers give the shortest retaining path
    parent = [-1] * n
    pedge = [-1] * n
    seen = bytearray(n)
    seen[0] = 1
    q = [0]
    qi = 0
    while qi < len(q):
        v = q[qi]
        qi += 1
        for ei in range(first[v], first[v + 1], efl):
            t = E[ei + e_type]
            if t == weak or t == shortcut or (exclude and etypes[t] in ("context", "property", "internal") and S[E[ei + e_name]] in exclude):
                continue
            w = E[ei + e_to] // nfl
            if not seen[w]:
                seen[w] = 1
                parent[w] = v
                pedge[w] = ei
                q.append(w)

    def nname(k):
        return S[N[k * nfl + i_name]]

    def ename(ei):
        t = etypes[E[ei + e_type]]
        x = E[ei + e_name]
        if t in ("element", "hidden"):
            return "[%d]" % x
        return S[x] if isinstance(x, int) and x < len(S) else str(x)

    want = set()
    for k in kinds:
        want.update(TARGETS.get(k, (k,)))
    out = {}
    for kind_name in sorted(want):
        hits = []
        sizes = Counter()
        for k in range(n):
            nm = nname(k)
            if not nm.startswith(kind_name) or (not kind_name.startswith("<") and nm != kind_name and not nm.startswith(kind_name + " ")):
                continue
            ty = ntypes[N[k * nfl + i_type]]
            if ty != "native":
                continue      # the Blink node, not its JS wrapper
            det = N[k * nfl + i_det] if i_det is not None else 0
            if detached_only and kind_name.startswith("<") and det != 2:
                continue
            hits.append(k)
            sizes[nm[:60]] += 1
        groups = defaultdict(list)
        unreachable = 0
        for k in hits:
            if not seen[k]:
                unreachable += 1
                continue
            path = []
            v = k
            while parent[v] >= 0 and len(path) < 40:
                path.append((ename(pedge[v]), nname(parent[v])[:60], ntypes[N[parent[v] * nfl + i_type]]))
                v = parent[v]
            path.reverse()
            # group on the JS-side holder: the steps from the first non-root, non-synthetic node, minus array indices
            sig = " -> ".join("%s.%s" % (nm[:40], ("[]" if en.startswith("[") else en[:40])) for en, nm, ty in path
                              if not nm.startswith("(") and ty not in ("synthetic",))[-260:]
            groups[sig].append(k)
        out[kind_name] = {"found": len(hits), "unreachable": unreachable, "names": dict(sizes.most_common(6)),
                          "groups": sorted(([len(v), sig] for sig, v in groups.items()), reverse=True)[:max_groups]}
    return out


def main():
    if len(sys.argv) > 2 and sys.argv[1] == "--analyse":   # a saved snapshot (--snap), analysed again without a browser
        res = analyse(json.load(open(sys.argv[2])), (sys.argv[3] if len(sys.argv) > 3 else "canvas,media,audio,window,iframe").split(","), exclude=tuple(x for x in (sys.argv[4] if len(sys.argv) > 4 else "").split(",") if x))
        for k, v in res.items():
            print("%s: %d found (%d unreachable from the roots) %s" % (k, v["found"], v["unreachable"], v.get("names")))
            for cnt, sig in v["groups"]:
                print("   %5d  %s" % (cnt, sig))
        return
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=9111)
    ap.add_argument("--range", required=True)
    ap.add_argument("--repeat", type=int, default=1)
    ap.add_argument("--targets", default="canvas,media,audio,window,iframe")
    ap.add_argument("--all", action="store_true", help="every target, not only detached DOM nodes")
    ap.add_argument("--timeout", type=int, default=1800)
    ap.add_argument("--width", type=int, default=1280)
    ap.add_argument("--out", default=None)
    ap.add_argument("--snap", default=None, help="also save the heap snapshot here (opens in DevTools → Memory → Load)")
    a = ap.parse_args()
    url = "http://localhost:%d/tests/run.html?fmmem=1&fmrange=%s%s" % (a.port, a.range, "&fmrepeat=%d" % a.repeat if a.repeat > 1 else "")
    dbg = _cdp.free_port()
    profile = tempfile.mkdtemp(prefix="fm-cdp-")
    proc = _cdp.launch(dbg, a.width, 900, profile)
    result = {"range": a.range, "repeat": a.repeat}
    try:
        cdp = _cdp.CDP(_cdp.ws_url(dbg, proc=proc))
        cdp.send("Page.enable")
        cdp.send("Runtime.enable")
        cdp.send("Page.navigate", url=url)
        state = {}
        deadline = time.time() + a.timeout
        done = False
        while time.time() < deadline and not done:
            try:
                raw = cdp.eval("(function(){var w=%s;var q=w&&w.__fmWantMem;if(!q||typeof q.seq!=='number'||w.__fmMemDone===q.seq)return null;"
                               "return JSON.stringify(q);})()" % APP)
            except Exception:
                raw = None
            if raw:
                want = json.loads(raw)
                last = want.get("i") == want.get("last")
                if want.get("i") == -1 or last:
                    rec = _memhook.measure(cdp, proc.pid, want, state, deep=True, infra=True)
                    rec.pop("procs", None)
                    result["before" if want.get("i") == -1 else "after"] = rec
                if last:
                    t0 = time.time()
                    snap = take_snapshot(cdp)
                    result["snapshotSecs"] = round(time.time() - t0, 1)
                    if a.snap:
                        with open(a.snap, "w") as sf:
                            json.dump(snap, sf)
                    result["retainers"] = analyse(snap, a.targets.split(","), detached_only=not a.all)
                    done = True
                cdp.eval("(function(){var w=%s;if(w)w.__fmMemDone=%d;})()" % (APP, int(want["seq"])))
                continue
            time.sleep(0.25)
    finally:
        try:
            proc.terminate()
            proc.wait(timeout=10)
        except Exception:
            proc.kill()
        shutil.rmtree(profile, ignore_errors=True)
    txt = json.dumps(result, indent=1)
    if a.out:
        open(a.out, "w").write(txt)
    for k, v in (result.get("retainers") or {}).items():
        print("%s: %d found (%d unreachable from the roots) %s" % (k, v["found"], v["unreachable"], v.get("names")))
        for cnt, sig in v["groups"]:
            print("   %5d  %s" % (cnt, sig))
    b, af = result.get("before") or {}, result.get("after") or {}
    if af:
        et = (af.get("deep") or {}).get("et") or {}
        print("page renderer (largest renderer) %s → %s MB; detached canvas sizes: %s" % (
            round((b.get("rendMax") or 0) / 1e6), round((af.get("rendMax") or 0) / 1e6), et.get("detSizes")))
        for k, v in list((et.get("who") or {}).items())[:6]:
            print("   made by %-70s %s" % (k[:70], v))


if __name__ == "__main__":
    main()
