#!/usr/bin/env python3
# REAL-TOUCH TRIM PROBE (queue 707): hold clip 1's left grip past the arm, drag +30px in 6 PACED steps (30ms), and
# print the trim's own internals (FM._lastTrim: finger term, scroll term, pps, snap) at every step — real touch, then the
# suite's synthetic path. Needs tests/_realtouch.py beside it. Run: python3 tests/_rt707.py 8777   then pkill -f "headless=new"
"""Queue 707 — does the timeline's SCALE move under a real-touch trim? Hold a LEFT grip past the arm, drag
+30px in 6 steps; at down / arm / every move / release log: #timeline width, --head-w, the drawn scale
(clip 0's width / its duration, in px per second), the layer's start/duration, and body.m-editing.
Control: the same trim driven by SYNTHETIC PointerEvents, which the suite uses and which trims correctly."""
import importlib.util, json, os, sys, tempfile, time
REPO="/Users/ezrasmith/Claude/FreeMotion"; HERE=os.path.dirname(os.path.abspath(__file__))
spec=importlib.util.spec_from_file_location("_cdp", os.path.join(REPO,"tests","_cdp.py")); _cdp=importlib.util.module_from_spec(spec); spec.loader.exec_module(_cdp)
PORT=int(sys.argv[1]); src=open(os.path.join(HERE,"_realtouch.py")).read()
def block(n): return src.split(n+' = r"""')[1].split('"""')[0]
SETUP,PICK,RESET=block("SETUP"),block("PICK"),block("RESET")
SCALE = """(function(){ const tl=document.getElementById('timeline'), c0=document.querySelectorAll('#tl-tracks .clip')[0];
  const L0=FM.scene.layers.slice().sort((a,b)=>a.start-b.start)[0], L=window.__L;
  const hw=getComputedStyle(document.getElementById('tl-inner')||document.body).getPropertyValue('--head-w').trim();
  return { pps: c0 ? +(c0.getBoundingClientRect().width / L0.duration).toFixed(1) : null,
           clip: L.start.toFixed(2)+'/'+L.duration.toFixed(2), sl: tl.scrollLeft, lt: FM._lastTrim ? {dt:+FM._lastTrim.dt.toFixed(3), sX:Math.round(FM._lastTrim.startX), cX:Math.round(FM._lastTrim.clientX), sc:FM._lastTrim.scrollLeft-FM._lastTrim.startScroll, pps:+FM._lastTrim.pps.toFixed(1), snap:FM._lastTrim.snapped?FM._lastTrim.guide:null} : null }; })()"""
dbg=_cdp.free_port(); prof=tempfile.mkdtemp(prefix="fm-707-"); proc=_cdp.launch(dbg,380,820,prof); c=None
try:
    c=_cdp.CDP(_cdp.ws_url(dbg)); c.send("Page.enable"); c.send("Runtime.enable")
    c.send("Emulation.setDeviceMetricsOverride",width=380,height=820,deviceScaleFactor=2,mobile=True)
    c.send("Emulation.setTouchEmulationEnabled",enabled=True,maxTouchPoints=5)
    c.send("Page.navigate",url=f"http://localhost:{PORT}/index.html")
    for _ in range(300):
        try:
            if c.eval("!!(window.FM && FM.scene && FM.timeline && FM.makeLayer)"): break
        except Exception: pass
        time.sleep(0.1)
    info=c.eval(SETUP,await_promise=True); assert info and info.get("clips")==4, info
    S=lambda tag: print("   %-22s %s" % (tag, json.dumps(c.eval(SCALE))))
    T=lambda k,pts: c.send("Input.dispatchTouchEvent",type=k,touchPoints=pts)
    print("\n[REAL TOUCH] hold left grip of clip 1, then drag +30px")
    c.eval(RESET); time.sleep(0.5); p=c.eval(PICK); x,y=p["gx"],p["gy"]
    S("before"); T("touchStart",[{"x":x,"y":y,"id":1}]); S("touchStart"); time.sleep(0.42); S("after arm (420ms)")
    for k in range(1,7): T("touchMove",[{"x":x+30.0*k/6,"y":y,"id":1}]); time.sleep(0.03); S("move %d (+%.0fpx)" % (k, 30.0*k/6))
    T("touchEnd",[]); time.sleep(0.4); S("released")
    print("\n[SYNTHETIC] the suite's path, same gesture")
    c.eval(RESET); time.sleep(0.5); p=c.eval(PICK); x,y=p["gx"],p["gy"]
    PE=lambda t,cx,b: c.eval("(function(){ const g=window.__g; const o={pointerId:9,pointerType:'touch',isPrimary:true,bubbles:true,cancelable:true,clientX:%f,clientY:%f,button:0,buttons:%d}; g.dispatchEvent(new PointerEvent('%s',o)); if('%s'!=='pointerdown') window.dispatchEvent(new PointerEvent('%s',o)); })()" % (cx,y,b,t,t,t))
    S("before"); PE('pointerdown',x,1); S("pointerdown"); time.sleep(0.42); S("after arm (420ms)")
    for k in range(1,7): PE('pointermove',x+30.0*k/6,1); time.sleep(0.03); S("move %d (+%.0fpx)" % (k, 30.0*k/6))
    PE('pointerup',x+30,0); time.sleep(0.4); S("released")
finally:
    if c: c.close()
    proc.terminate()
    try: proc.wait(timeout=5)
    except Exception: proc.kill()
