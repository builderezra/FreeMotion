#!/usr/bin/env python3
# REAL-TOUCH PROBE (queue 699 / 707). Drives the app with TRUSTED touch via CDP Input.dispatchTouchEvent —
# the suite's synthetic PointerEvents cannot be pointer-captured, so they never take the path a phone takes.
# Run: python3 tests/_realtouch.py 8777   (a static server on that port; tests/_rt2.py is the compact table).
"""Queue-699 review probe: drive the trim grip with REAL (trusted) touch via CDP Input.dispatchTouchEvent,
and compare with the synthetic `new PointerEvent` path the suite uses.

The question: does the clip's `innerEl.setPointerCapture(e.pointerId)` (js/timeline.js:1782), which
SILENTLY THROWS for a synthetic pointerId, change what happens to the grip's 300ms arm timer when the
capture actually succeeds?
"""
import importlib.util, json, os, sys, tempfile, time

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = "/Users/ezrasmith/Claude/FreeMotion"
spec = importlib.util.spec_from_file_location("_cdp", os.path.join(REPO, "tests", "_cdp.py"))
_cdp = importlib.util.module_from_spec(spec); spec.loader.exec_module(_cdp)

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8777

SETUP = r"""
(async function () {
  const s = ms => new Promise(r => setTimeout(r, ms));
  const sp = document.getElementById('splash'); if (sp) sp.remove();
  if (window.FM && FM.home && FM.home.isOpen && FM.home.isOpen()) {
    const k = document.querySelector('.hm-card');
    if (k) k.click(); else FM.home.close();
  }
  await s(1200);
  if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close();
  await s(400);
  FM.scene.layers.length = 0;
  for (let i = 0; i < 4; i++) {
    const L = FM.makeLayer('shape', { shape: 'rect', x: 200 + i * 20, y: 300, shapeW: 120, shapeH: 90, fill: '#c05030' });
    L.start = i * 2; L.duration = 2.5; FM.scene.layers.push(L);
  }
  FM.scene.project.duration = 10;
  FM.selectLayer(null);
  FM.refreshAll(); FM.timeline.rebuild();
  await s(600);

  // ---- instrumentation -------------------------------------------------------------------------
  window.__log = [];
  const nameOf = el => !el ? 'null' : (el.id ? '#' + el.id : (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className) || el.tagName);
  if (!window.__patched) {
    window.__patched = 1;
    const orig = Element.prototype.setPointerCapture;
    Element.prototype.setPointerCapture = function (id) {
      try { const r = orig.call(this, id); window.__log.push('setPointerCapture OK   on ' + nameOf(this) + ' (id ' + id + ')'); return r; }
      catch (e) { window.__log.push('setPointerCapture THREW ' + e.name + ' on ' + nameOf(this) + ' (id ' + id + ')'); throw e; }
    };
  }
  window.__watch = function (el) {
    ['pointerdown','pointermove','pointerup','pointercancel','pointerleave','pointerout','gotpointercapture','lostpointercapture']
      .forEach(t => el.addEventListener(t, ev => {
        if (t === 'pointermove') { window.__moves = (window.__moves||0)+1; return; }
        window.__log.push('GRIP got ' + t + '  (target ' + nameOf(ev.target) + ')');
      }));
  };
  const clips = document.querySelectorAll('#tl-tracks .clip');
  const tl = document.getElementById('timeline');
  return { clips: clips.length, grips: document.querySelectorAll('#tl-tracks .clip-grip').length,
           scrollable: tl.scrollWidth > tl.clientWidth + 4, w: innerWidth,
           maxTouchPoints: navigator.maxTouchPoints };
})()
"""

PICK = r"""
(function () {
  const clip = document.querySelectorAll('#tl-tracks .clip')[1];
  const g = clip.querySelector('.clip-grip');
  window.__g = g; window.__clip = clip;
  window.__log = []; window.__moves = 0;
  window.__watch(g);
  const r = g.getBoundingClientRect(), cr = clip.getBoundingClientRect();
  const L = FM.scene.layers.slice().sort((a,b)=>a.start-b.start)[1];
  window.__L = L;
  /* The body control must land ON THE CLIP. At +40px on a 380px screen the finger hits BUTTON.row-drag,
     the row-reorder handle painted over the clip, and the control read as dead (2 Sep). Scan for a point
     whose hit-test resolves inside this clip and is not a grip; refuse rather than guess. */
  let bx = null, by = cr.top + cr.height/2;
  for (let f = 0.1; f <= 0.9 && bx == null; f += 0.05) {
    const x = cr.left + cr.width * f; if (x < 2 || x > 378) continue;
    const el = document.elementFromPoint(x, by);
    if (el && clip.contains(el) && !el.closest('.clip-grip')) bx = x;
  }
  if (bx == null) { const c0 = document.querySelectorAll('#tl-tracks .clip')[0], c0r = c0.getBoundingClientRect();
    for (let f = 0.1; f <= 0.9 && bx == null; f += 0.05) { const x = c0r.left + c0r.width * f; if (x < 2 || x > 378) continue;
      const el = document.elementFromPoint(x, by); if (el && c0.contains(el) && !el.closest('.clip-grip')) bx = x; } }
  return { gx: r.left + r.width/2, gy: r.top + r.height/2, gw: r.width,
           bx: bx, by: by, bodyHit: bx == null ? 'NONE FOUND' : (document.elementFromPoint(bx, by).className || 'clip'),
           before: L.start + '/' + L.duration, time: FM.time,
           scroll: document.getElementById('timeline').scrollLeft };
})()
"""

READ = r"""
(function () {
  const g = window.__g, L = window.__L, tl = document.getElementById('timeline');
  let st = 'n/a'; try { const d = FM.timeline._dragState(); st = d && d.any ? d.live.join('+') : 'none'; } catch (e) { st = 'err ' + e.message; }
  return { armed: g.classList.contains('armed'), attached: document.contains(g),
           after: L.start + '/' + L.duration, time: FM.time, scroll: tl.scrollLeft,
           live: st, moves: window.__moves, log: window.__log.slice() };
})()
"""


RESET = r"""
(function () {
  FM.scene.layers.length = 0;
  for (let i = 0; i < 4; i++) {
    const L = FM.makeLayer('shape', { shape: 'rect', x: 200 + i * 20, y: 300, shapeW: 120, shapeH: 90, fill: '#c05030' });
    L.start = i * 2; L.duration = 2.5; FM.scene.layers.push(L);
  }
  FM.scene.project.duration = 10;
  FM.selectLayer(null); FM.setTime(1.3);
  FM.refreshAll(); FM.timeline.rebuild();
  const tl = document.getElementById('timeline'); tl.scrollLeft = 0;
  return document.querySelectorAll('#tl-tracks .clip').length;
})()
"""

def main():
    dbg = _cdp.free_port()
    profile = tempfile.mkdtemp(prefix="fm-699-")
    proc = _cdp.launch(dbg, 380, 820, profile)
    c = None
    try:
        c = _cdp.CDP(_cdp.ws_url(dbg))
        c.send("Page.enable"); c.send("Runtime.enable")
        c.send("Emulation.setDeviceMetricsOverride", width=380, height=820,
               deviceScaleFactor=2, mobile=True)
        c.send("Emulation.setTouchEmulationEnabled", enabled=True, maxTouchPoints=5)
        c.send("Page.navigate", url=f"http://localhost:{PORT}/index.html")
        for _ in range(300):
            try:
                if c.eval("!!(window.FM && FM.scene && FM.timeline && FM.makeLayer)"):
                    break
            except Exception:
                pass
            time.sleep(0.1)
        info = c.eval(SETUP, await_promise=True)
        print("SETUP:", json.dumps(info))
        if not info or info.get("clips") != 4:
            print("FIXTURE FAILED — nothing below is trustworthy"); return 2

        def touch(kind, pts):
            c.send("Input.dispatchTouchEvent", type=kind, touchPoints=pts)

        results = {}

        # ---------- 1. REAL touch: still hold on the grip past the 300ms arm ----------
        p = c.eval(PICK)
        print("\n[1] REAL TOUCH — still hold on grip, 460ms:", json.dumps(p))
        touch("touchStart", [{"x": p["gx"], "y": p["gy"], "id": 1}])
        time.sleep(0.46)
        mid = c.eval(READ)
        touch("touchEnd", [])
        time.sleep(0.3)
        end = c.eval(READ)
        results["real_hold"] = {"at460ms": mid, "afterRelease": end}
        print("  armed at 460ms:", mid["armed"], " live:", mid["live"])
        print("  log:"); [print("     ", l) for l in mid["log"]]
        print("  after release: live=", end["live"], " trim:", p["before"], "->", end["after"])

        # ---------- 2. SYNTHETIC (what the suite does): same still hold ----------
        print("  reset clips:", c.eval(RESET)); time.sleep(0.5)
        p2 = c.eval(PICK)
        c.eval("""(function(){ const g=window.__g, r=g.getBoundingClientRect();
          const x=r.left+r.width/2, y=r.top+r.height/2;
          const o={pointerId:5,pointerType:'touch',isPrimary:true,bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,buttons:1};
          g.dispatchEvent(new PointerEvent('pointerdown',o)); })()""")
        time.sleep(0.46)
        mid2 = c.eval(READ)
        c.eval("""(function(){ const g=window.__g, r=g.getBoundingClientRect();
          const x=r.left+r.width/2, y=r.top+r.height/2;
          const u={pointerId:5,pointerType:'touch',isPrimary:true,bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,buttons:0};
          g.dispatchEvent(new PointerEvent('pointerup',u)); window.dispatchEvent(new PointerEvent('pointerup',u)); })()""")
        time.sleep(0.3)
        end2 = c.eval(READ)
        results["synthetic_hold"] = {"at460ms": mid2, "afterRelease": end2}
        print("\n[2] SYNTHETIC hold (the suite's path)")
        print("  armed at 460ms:", mid2["armed"], " live:", mid2["live"])
        print("  log:"); [print("     ", l) for l in mid2["log"]]

        # ---------- 3. REAL touch: hold then drag => does the clip actually get trimmed? ----------
        print("  reset clips:", c.eval(RESET)); time.sleep(0.5)
        p3 = c.eval(PICK)
        print("\n[3] REAL TOUCH — hold 460ms then drag +30px (a trim):", p3["before"])
        touch("touchStart", [{"x": p3["gx"], "y": p3["gy"], "id": 1}])
        time.sleep(0.46)
        for k in range(1, 7):
            touch("touchMove", [{"x": p3["gx"] + 30.0 * k / 6, "y": p3["gy"], "id": 1}])
            time.sleep(0.03)
        touch("touchEnd", [])
        time.sleep(0.4)
        end3 = c.eval(READ)
        results["real_trim"] = end3
        print("  ", p3["before"], "->", end3["after"],
              "  TRIMMED" if end3["after"] != p3["before"] else "  ❌ NO TRIM")
        print("  live after:", end3["live"], " grip still attached:", end3["attached"])
        print("  log:"); [print("     ", l) for l in end3["log"]]

        # ---------- 4. control: REAL touch swipe starting on the grip should scroll/scrub ----------
        print("  reset clips:", c.eval(RESET)); time.sleep(0.5)
        p4 = c.eval(PICK)
        print("\n[4] REAL TOUCH — 60px swipe from the grip (the queue-699 fix's whole point)")
        touch("touchStart", [{"x": p4["gx"], "y": p4["gy"], "id": 1}])
        for k in range(1, 9):
            touch("touchMove", [{"x": p4["gx"] - 60.0 * k / 8, "y": p4["gy"], "id": 1}])
            time.sleep(0.02)
        touch("touchEnd", [])
        time.sleep(0.4)
        end4 = c.eval(READ)
        results["real_swipe_grip"] = end4
        print("  time", p4["time"], "->", end4["time"], "  scroll", p4["scroll"], "->", end4["scroll"],
              "  live after:", end4["live"])

        # ---------- 5. control: REAL touch swipe on the clip BODY ----------
        print("  reset clips:", c.eval(RESET)); time.sleep(0.5)
        p5 = c.eval(PICK)
        touch("touchStart", [{"x": p5["bx"], "y": p5["by"], "id": 1}])
        for k in range(1, 9):
            touch("touchMove", [{"x": p5["bx"] - 60.0 * k / 8, "y": p5["by"], "id": 1}])
            time.sleep(0.02)
        touch("touchEnd", [])
        time.sleep(0.4)
        end5 = c.eval(READ)
        results["real_swipe_body"] = end5
        print("\n[5] CONTROL — same swipe on the clip BODY")
        print("  time", p5["time"], "->", end5["time"], "  scroll", p5["scroll"], "->", end5["scroll"],
              "  live after:", end5["live"])

        with open(os.path.join(HERE, "realtouch.json"), "w") as f:
            json.dump(results, f, indent=1)
        return 0
    finally:
        if c: c.close()
        proc.terminate()


sys.exit(main())
