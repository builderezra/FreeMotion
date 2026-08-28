#!/usr/bin/env python3
"""What a STACK of effects costs at phone speed, with the GPU chain on and off.

Why this exists, and why it is not just another row in _phoneprobe.py.

The oldest entry on the list ("Editing lags, and gets bad fast") reached one conclusion after three
months of measuring: the editing path is fine, and the cost is DRAWING.  Its own words for the
remaining problem were "five effects on six shapes — the cheapest possible content — already gives
45 fps on a fast desktop and 17 fps at 6x.  THAT is your lag."  So the number that answers his
complaint is not what one effect costs; it is what a STACK costs on a slow CPU.

The interesting part is what CPU throttling does to a GPU path.  Chrome's throttle slows JavaScript,
not the graphics card.  If the drawing really has moved off the CPU, then throttling the CPU by 6x
should barely touch the frame time — and that, rather than any single speedup figure, is what makes
a phone feel different.  This probe measures exactly that: the same scene, the same browser, three
paths (CPU loop / GPU per-effect / GPU chained), at 1x and at phone speed.

⚠️ EVERY READING IS FENCED.  renderScene returns when the GPU work is QUEUED, not when it is done.
Timing without reading a pixel back reports ~0.1 ms and a chained path that looks SLOWER than an
unchained one, which is what an empty queue looks like.  This project has made that mistake three
times; getImageData(0,0,1,1) is the fence that cannot be deferred past.

Run:  python3 tools/_chainphone.py            (starts its own server)
"""
import argparse, json, os, subprocess, sys, tempfile, time, importlib.util

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
_spec = importlib.util.spec_from_file_location("_cdp", os.path.join(ROOT, "tests", "_cdp.py"))
_cdp = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(_cdp)

SETUP = r"""
(async function () {
  const s = ms => new Promise(r => setTimeout(r, ms));
  if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close();
  await s(200);
  const P = FM.scene.project;
  P.width = 1080; P.height = 1350; P.duration = 6;          // his own project shape
  FM.scene.layers.length = 0;
  // Six layers, like a real project — and a STACK of warps on one of them, which is the case the
  // entry identified as the expensive one.
  for (let i = 0; i < 5; i++) {
    const L = FM.makeLayer('shape', { shape: i % 2 ? 'ellipse' : 'rect',
      x: 200 + i * 150, y: 300 + (i % 3) * 260, shapeW: 240, shapeH: 240,
      fill: ['#4fd1ff','#ff9a4f','#22ff88','#ff5fa2','#c9a0ff'][i] });
    L.start = 0; L.duration = 6;
    FM.scene.layers.push(L);
  }
  const T = FM.makeLayer('shape', { shape: 'rect', x: 540, y: 470, shapeW: 720, shapeH: 560, fill: '#4fd1ff' });
  T.start = 0; T.duration = 6; T.effects = [];
  const stack = ['wave','ripple','twirl','bulge','kaleidoscope'];
  const made = [];
  for (const k of stack) {
    const inst = FM.fxRegistry.makeInstance(k);
    if (inst) { T.effects.push(inst); made.push(k); }
  }
  FM.scene.layers.push(T);
  await s(500);
  // A probe that built no effects would time an empty scene and call the app fast — it has happened.
  if (!made.length) throw new Error('no effects were made');
  return JSON.stringify({ layers: FM.scene.layers.length, stack: made });
})()
"""

MEASURE = r"""
(async function () {
  const s = ms => new Promise(r => setTimeout(r, ms));
  const P = FM.scene.project;
  const cv = document.createElement('canvas'); cv.width = P.width; cv.height = P.height;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  function one() {
    const t0 = performance.now();
    cx.clearRect(0, 0, cv.width, cv.height);
    FM.renderScene(cx, FM.scene, 0.7);
    cx.getImageData(0, 0, 1, 1);            // THE FENCE — see the module docstring
    return performance.now() - t0;
  }
  one(); one();                              // warm the shader cache, then measure
  const a = [];
  for (let i = 0; i < 7; i++) { a.push(one()); await s(16); }
  a.sort((x, y) => x - y);
  const st = FM.glWarp ? FM.glWarp.stats() : {};
  return JSON.stringify({ ms: a[a.length >> 1], best: a[0], worst: a[a.length - 1],
                          gpu: st.gpu | 0, cpu: st.cpu | 0, chains: st.chains | 0, chained: st.chained | 0 });
})()
"""

PATHS = [
    ("CPU loop",           "FM._noGL = true;  FM._noGLChain = true;"),
    ("GPU, per effect",    "FM._noGL = false; FM._noGLChain = true;"),
    ("GPU, chained",       "FM._noGL = false; FM._noGLChain = false;"),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8791)
    ap.add_argument("--rates", default="1,6")
    a = ap.parse_args()
    rates = [int(x) for x in a.rates.split(",")]

    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(a.port)], cwd=ROOT,
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.0)
    url = f"http://localhost:{a.port}/index.html"
    dbg = _cdp.free_port()
    profile = tempfile.mkdtemp(prefix="fm-chainphone-")
    proc = _cdp.launch(dbg, 380, 780, profile)
    cdp = None
    out = {}
    try:
        cdp = _cdp.CDP(_cdp.ws_url(dbg))
        cdp.send("Page.enable"); cdp.send("Runtime.enable")
        for rate in rates:
            cdp.send("Page.navigate", url=url)
            deadline = time.time() + 40
            while time.time() < deadline:
                try:
                    if cdp.eval("!!(window.FM && FM.scene && FM.renderScene && FM.fxRegistry)"):
                        break
                except Exception:
                    pass
                time.sleep(0.4)
            else:
                raise SystemExit("app never became ready")
            info = json.loads(cdp.eval(SETUP, await_promise=True))
            if not cdp.eval("!!(FM.glWarp && FM.glWarp.available())"):
                print("⚠️  WebGL is not available in this browser — the GPU rows below are the CPU loop.")
            cdp.send("Emulation.setCPUThrottlingRate", rate=rate)   # after setup, so setup is not in the reading
            time.sleep(0.4)
            for label, switch in PATHS:
                cdp.eval(switch + " FM.glWarp && FM.glWarp._reset(); 1")
                time.sleep(0.15)
                out[(rate, label)] = json.loads(cdp.eval(MEASURE, await_promise=True))
            cdp.eval("FM._noGL = false; FM._noGLChain = false; 1")
            cdp.send("Emulation.setCPUThrottlingRate", rate=1)
        print(f"\nA STACK OF {len(info['stack'])} WARPS ({' → '.join(info['stack'])}) on one of "
              f"{info['layers']} layers, at 1080x1350.\n")
        head = "  path".ljust(22) + "".join(f"{r}x CPU".rjust(16) for r in rates)
        print(head); print("  " + "-" * (len(head) - 2))
        for label, _ in PATHS:
            row = "  " + label.ljust(20)
            for r in rates:
                d = out[(r, label)]
                row += f"{d['ms']:.1f} ms".rjust(16)
            print(row)
        print()
        for r in rates:
            c = out[(r, "CPU loop")]["ms"]; g = out[(r, "GPU, per effect")]["ms"]; ch = out[(r, "GPU, chained")]["ms"]
            print(f"  at {r}x:  chained is {c/ch:.1f}x the CPU loop and {g/ch:.2f}x the per-effect GPU path")
        # THE CONTROL. Without it a run where WebGL quietly failed reads as a fast CPU.
        print()
        for r in rates:
            d = out[(r, "GPU, chained")]; e = out[(r, "CPU loop")]
            print(f"  control {r}x: chained → chains {d['chains']}, gpu {d['gpu']}  |  CPU row → gpu {e['gpu']}, cpu {e['cpu']}"
                  + ("   ✅" if d['chains'] > 0 and e['gpu'] == 0 else "   🚨 the switches did not switch"))
        # The headline: what does slowing the CPU 6x actually do to each path?
        if len(rates) > 1:
            lo, hi = rates[0], rates[-1]
            print(f"\n  HOW MUCH DOES A {hi}x SLOWER CPU HURT EACH PATH?")
            for label, _ in PATHS:
                a1 = out[(lo, label)]["ms"]; a2 = out[(hi, label)]["ms"]
                print(f"    {label.ljust(20)} {a1:.1f} → {a2:.1f} ms   ({a2/a1:.2f}x slower)")
    finally:
        if cdp: cdp.close()
        proc.terminate()
        srv.terminate()


if __name__ == "__main__":
    main()
