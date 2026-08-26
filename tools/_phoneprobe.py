#!/usr/bin/env python3
"""Measure the editing path under CPU THROTTLING — i.e. at phone speed.

Why this exists.  The "Editing lags, and gets bad fast" entry in REQUESTS.md is measured to death
— renderScene, timeline rebuild, tap->inspector, a 90-cycle memory soak, per-effect compositor cost
— and every one of those numbers came off an UNTHROTTLED DESKTOP browser.  The entry says so itself,
twice: "I can only measure this on a desktop browser.  Whether it FEELS better on your phone is the
half I cannot take from you."  That is true of the FEEL and false of the SPEED: Chrome will happily
run the whole app at a quarter or a sixth of its clock, which is roughly where a mid-range phone
sits against this Mac.  An 8 ms desktop frame is 48 ms at 6x, and 48 ms is visible lag.

So this asks the question the entry never asked: which parts of editing survive a phone's CPU, and
which fall off a cliff?  A cost that scales cleanly with the throttle is honest work; one that
scales WORSE than the throttle is a real finding, because something is timing out or thrashing.

Run:  python3 tools/_phoneprobe.py --port 8777
"""
import argparse, json, os, statistics, sys, tempfile, time
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tests"))
import importlib.util
_spec = importlib.util.spec_from_file_location(
    "_cdp", os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tests", "_cdp.py"))
_cdp = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(_cdp)

SETUP = r"""
(async function () {
  const s = ms => new Promise(r => setTimeout(r, ms));
  if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close();
  await s(200);
  // His own project shape: 1080x1350, a handful of layers, a couple of effects.
  FM.scene.w = 1080; FM.scene.h = 1350;
  FM.scene.layers.length = 0;
  for (let i = 0; i < 6; i++) {
    FM.addShapeLayer && FM.addShapeLayer('rect');
  }
  const ls = FM.scene.layers;
  ls.forEach((L, i) => {
    L.transform = L.transform || {};
    L.transform.x = 200 + i * 90; L.transform.y = 300 + i * 120;
    L.transform.scale = 60 + i * 8; L.transform.rotation = i * 11;
  });
  // Representative of HIS work, not a toy: real effects on most layers.  Six bare rects composite
  // in ~0 ms, which reads as "the app is instant" and measures nothing.
  // ⚠️ BUILD EFFECTS WITH THE APP'S OWN CONSTRUCTOR, never by hand.  The first version of this
  // probe wrote {id: 'blur', params: {...}} and every effect was silently IGNORED -- an instance is
  // keyed {type, enabled, params}, so `id` matches nothing.  renderScene then measured a bare scene
  // and reported 0.00 ms at every throttle, which reads as "the compositor is free on a phone" and
  // is the exact false reassurance this repo keeps getting burned by.  makeInstance() cannot be
  // wrong about its own shape.
  const WANT = [['blur'], ['saturate', 'contrast'], ['glow'], ['vignette'], [], []];
  let made = 0;
  ls.forEach((L, i) => {
    L.effects = (WANT[i] || []).map(id => {
      try { const inst = FM.fxRegistry.makeInstance(id); if (inst) made++; return inst; }
      catch (e) { return null; }
    }).filter(Boolean);
  });
  if (!made) throw new Error('no effects were built - probe would measure nothing');
  FM.requestRender && FM.requestRender();
  await s(300);
  return ls.length + ':' + made + 'fx';
})()
"""

MEASURE = r"""
(async function () {
  const s = ms => new Promise(r => setTimeout(r, ms));
  const med = a => { a = a.slice().sort((x, y) => x - y); return a.length ? a[a.length >> 1] : -1; };
  const out = {};

  // 1. renderScene — the compositor, the thing that has to hit 60fps.
  {
    const cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1350;
    const ctx = cv.getContext('2d'); const t = [];
    for (let i = 0; i < 24; i++) {
      const a = performance.now();
      FM.renderScene(ctx, FM.scene, (i % 30) / 30);
      t.push(performance.now() - a);
    }
    out.renderScene = +med(t).toFixed(2);
  }

  // 2. tap -> inspector: select a layer and let the panel rebuild.
  {
    const t = []; const ls = FM.scene.layers;
    for (let i = 0; i < 12; i++) {
      const L = ls[i % ls.length];
      const a = performance.now();
      FM.selectLayer ? FM.selectLayer(L.id) : (FM.scene.selected = L.id);
      FM.inspector && FM.inspector.refresh && FM.inspector.refresh();
      void document.body.offsetHeight;                 // force the layout the tap really costs
      t.push(performance.now() - a);
      await s(8);
    }
    out.tapInspector = +med(t).toFixed(2);
  }

  // 3. timeline rebuild — the panel he says lags when scrubbing.
  {
    const t = [];
    for (let i = 0; i < 12; i++) {
      const a = performance.now();
      FM.timeline && FM.timeline.rebuild ? FM.timeline.rebuild()
        : (FM.timeline && FM.timeline.refresh && FM.timeline.refresh());
      void document.body.offsetHeight;
      t.push(performance.now() - a);
      await s(8);
    }
    out.timelineRebuild = +med(t).toFixed(2);
  }

  // 4. SCRUBBING — the gesture he actually complains about (queue 387: "pressing on a layer to
  //    scrub is still laggy").  Drive the app's own scrub entry point, not a bare rAF loop.
  {
    const t = [];
    for (let i = 0; i < 20; i++) {
      const a = performance.now();
      FM.scrubTime ? FM.scrubTime((i % 20) / 10) : FM.setTime((i % 20) / 10);
      FM.requestRender && FM.requestRender();
      void document.body.offsetHeight;
      t.push(performance.now() - a);
      await s(6);
    }
    out.scrub = +med(t).toFixed(2);
  }

  // 5. a real playback burst, driven through the app's OWN render request.
  {
    let frames = 0, longest = 0, last = performance.now();
    const t0 = performance.now();
    await new Promise(done => {
      function tick() {
        const now = performance.now(); const dt = now - last; last = now;
        if (frames) longest = Math.max(longest, dt);
        frames++;
        if (now - t0 > 1800) return done();
        FM.setTime && FM.setTime(((now - t0) / 1000) % 3);
        FM.requestRender && FM.requestRender();
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
    const secs = (performance.now() - t0) / 1000;
    out.fps = +(frames / secs).toFixed(1);
    out.worstFrameMs = +longest.toFixed(1);
    try { out.appQuality = FM.playbackQualityInfo ? FM.playbackQualityInfo() : null; } catch (e) {}
  }
  return JSON.stringify(out);
})()
"""


SWEEP = r"""
(async function () {
  const s = ms => new Promise(r => setTimeout(r, ms));
  if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close();
  await s(150);
  /* ⚠️ SET scene.project, NOT JUST scene.w/h — and set it to HIS size. The warp plate is sized from
   * `scene.project`, so leaving whatever project was last open (a 480x480 element, in the run that
   * produced the first ranking) silently measures everything at that size instead. That is not a
   * cosmetic difference: the ranking CHANGES. Pixel kernels are CPU loops that grow with AREA, while
   * rasterextrude is a fixed number of GPU blits that barely grows — so at 480x480 rasterextrude looked
   * like the 3rd dearest effect (35.3 ms) and at a real 1080x1350 it is 16.2 ms while ripple is 565.
   * Rank at the size he actually edits at, or the ranking is about the fixture rather than the app. */
  FM.scene.project = { name: 'Sweep', width: 1080, height: 1350, fps: 30, duration: 5, background: null, markers: [] };
  FM.scene.w = 1080; FM.scene.h = 1350; FM.scene.layers.length = 0;
  FM.addShapeLayer && FM.addShapeLayer('rect');
  const L = FM.scene.layers[0];
  const cv = document.createElement('canvas'); cv.width = 540; cv.height = 675;
  const ctx = cv.getContext('2d');
  const med = a => { a = a.slice().sort((x, y) => x - y); return a[a.length >> 1]; };
  // ⚠️ THE WHOLE POINT: measure each effect BOTH ways.  Without the readback the CPU-side cost is
  // all you see; with it, the queued GPU work is drained inside the timer too.  The DIFFERENCE is
  // the cost that every per-effect number in this repo has been blind to.
  const flush = () => ctx.getImageData(0, 0, 1, 1).data[0];
  async function cost(ids, doFlush) {
    L.effects = ids.map(i => { try { return FM.fxRegistry.makeInstance(i); } catch (e) { return null; } })
                   .filter(Boolean);
    FM.renderScene(ctx, FM.scene, 0.1); flush(); await s(12);
    const t = [];
    for (let i = 0; i < 7; i++) {
      const a = performance.now();
      FM.renderScene(ctx, FM.scene, (i % 6) / 6);
      if (doFlush) flush();
      t.push(performance.now() - a);
    }
    if (!doFlush) flush();
    return med(t);
  }
  const bareF = await cost([], true), bareN = await cost([], false);
  const ids = FM.fxRegistry.all().map(f => f.id);
  const rows = [];
  for (const id of ids) {
    let cf, cn;
    try { cf = await cost([id], true); cn = await cost([id], false); }
    catch (e) { continue; }
    rows.push({ id: id, cpu: +(cn - bareN).toFixed(2), total: +(cf - bareF).toFixed(2) });
  }
  rows.forEach(r => { r.gpu = +(r.total - r.cpu).toFixed(2); });
  rows.sort((a, b) => b.total - a.total);
  // Does a stack cost the sum of its parts, or more?
  const top5 = rows.slice(0, 5).map(r => r.id);
  const stacked = +(await cost(top5, true) - bareF).toFixed(2);
  const sum = +rows.slice(0, 5).reduce((a, r) => a + r.total, 0).toFixed(2);
  return JSON.stringify({ bareFlushed: +bareF.toFixed(2), counted: rows.length,
    top: rows.slice(0, 15), over8: rows.filter(r => r.total > 8).length,
    hiddenGpu: rows.filter(r => r.gpu > r.cpu * 2 && r.gpu > 2).slice(0, 12),
    stack: { ids: top5, measured: stacked, sumOfParts: sum,
             ratio: +(stacked / (sum || 1)).toFixed(2) } });
})()
"""


def sweep(port):
    dbg = _cdp.free_port()
    profile = tempfile.mkdtemp(prefix="fm-sweep-")
    proc = _cdp.launch(dbg, 380, 780, profile)
    cdp = None
    try:
        cdp = _cdp.CDP(_cdp.ws_url(dbg))
        cdp.send("Page.enable"); cdp.send("Runtime.enable")
        cdp.send("Page.navigate", url="http://localhost:%d/index.html" % port)
        deadline = time.time() + 40
        while time.time() < deadline:
            try:
                if cdp.eval("!!(window.FM && FM.fxRegistry && FM.renderScene)"):
                    break
            except Exception:
                pass
            time.sleep(0.4)
        d = json.loads(cdp.eval(SWEEP, await_promise=True))
    finally:
        if cdp: cdp.close()
        proc.terminate()
    print("bare scene: %s ms   effects measured: %d   over 8 ms: %d"
          % (d["bareFlushed"], d["counted"], d["over8"]))
    print("\n| effect | total | CPU | GPU |")
    print("|---|---|---|---|")
    for r in d["top"]:
        print("| %s | %s ms | %s | %s |" % (r["id"], r["total"], r["cpu"], r["gpu"]))
    print("\nCOST THAT CPU-ONLY TIMING MISSED (gpu > 2x cpu):")
    for r in d["hiddenGpu"]:
        print("  %-18s total %-7s cpu %-7s gpu %s" % (r["id"], r["total"], r["cpu"], r["gpu"]))
    st = d["stack"]
    print("\nstack of the 5 dearest %s\n  measured %s ms vs sum-of-parts %s ms  => %sx"
          % (st["ids"], st["measured"], st["sumOfParts"], st["ratio"]))
    print(json.dumps(d)[:400])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8777)
    ap.add_argument("--sweep", action="store_true",
                    help="rank every effect by TRUE cost, CPU vs GPU, with a readback")
    ap.add_argument("--rates", default="1,4,6")
    a = ap.parse_args()
    if a.sweep:
        return sweep(a.port)
    url = f"http://localhost:{a.port}/index.html"
    rates = [int(x) for x in a.rates.split(",")]

    dbg = _cdp.free_port()
    profile = tempfile.mkdtemp(prefix="fm-phone-")
    proc = _cdp.launch(dbg, 380, 780, profile)
    cdp = None
    rows = []
    try:
        cdp = _cdp.CDP(_cdp.ws_url(dbg))
        cdp.send("Page.enable"); cdp.send("Runtime.enable")
        for rate in rates:
            cdp.send("Page.navigate", url=url)
            deadline = time.time() + 40
            while time.time() < deadline:
                try:
                    if cdp.eval("!!(window.FM && FM.scene && FM.renderScene)"):
                        break
                except Exception:
                    pass
                time.sleep(0.4)
            else:
                raise SystemExit("app never became ready — is the dev server on that port?")
            n = cdp.eval(SETUP, await_promise=True)
            # THROTTLE ONLY NOW, so the setup cost is not part of the reading.
            cdp.send("Emulation.setCPUThrottlingRate", rate=rate)
            time.sleep(0.3)
            raw = cdp.eval(MEASURE, await_promise=True)
            cdp.send("Emulation.setCPUThrottlingRate", rate=1)
            d = json.loads(raw); d["rate"] = rate; d["layers"] = n
            rows.append(d)
            print(f"  {rate}x  {json.dumps(d)}", flush=True)
    finally:
        if cdp: cdp.close()
        proc.terminate()

    base = rows[0]
    print("\n| CPU | renderScene | tap→inspector | timeline | scrub | fps | worst frame |")
    print("|---|---|---|---|---|---|---|")
    for r in rows:
        print(f"| {r['rate']}x | {r['renderScene']} ms | {r['tapInspector']} ms | "
              f"{r['timelineRebuild']} ms | {r.get('scrub')} ms | {r['fps']} | {r['worstFrameMs']} ms |")
    print("\nscaling vs the throttle (1.0 = exactly as slow as the CPU is; >1.3 = worse than linear):")
    for r in rows[1:]:
        for k in ("renderScene", "tapInspector", "timelineRebuild", "scrub"):
            b = base[k] or 0.01
            print(f"  {r['rate']}x {k}: {r[k]/b/r['rate']:.2f}x")
    print(json.dumps(rows))


if __name__ == "__main__":
    main()
