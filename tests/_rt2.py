#!/usr/bin/env python3
# REAL-TOUCH TABLE (queue 699 / 707): python3 tests/_rt2.py 8777 "label". Body control runs FIRST.
# Needs tests/_realtouch.py beside it. Kill stray headless Chromes afterwards: pkill -f "headless=new".
"""Queue 699 — REAL touch (CDP Input.dispatchTouchEvent) against the app on PORT. Body control runs
FIRST so the grip result is only reported against a control that moved. Prints one line per case."""
import importlib.util, json, os, sys, tempfile, time
HERE=os.path.dirname(os.path.abspath(__file__)); REPO="/Users/ezrasmith/Claude/FreeMotion"
spec=importlib.util.spec_from_file_location("_cdp", os.path.join(REPO,"tests","_cdp.py")); _cdp=importlib.util.module_from_spec(spec); spec.loader.exec_module(_cdp)
PORT=int(sys.argv[1]); LABEL=sys.argv[2] if len(sys.argv)>2 else str(PORT)
src=open(os.path.join(HERE,"_realtouch.py")).read()
def block(n): return src.split(n+' = r"""')[1].split('"""')[0]
SETUP,PICK,READ,RESET=block("SETUP"),block("PICK"),block("READ"),block("RESET")
def main():
    dbg=_cdp.free_port(); prof=tempfile.mkdtemp(prefix="fm-rt2-"); proc=_cdp.launch(dbg,380,820,prof); c=None
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
        info=c.eval(SETUP,await_promise=True)
        if not info or info.get("clips")!=4: print(LABEL,"FIXTURE FAILED",info); return 2
        T=lambda k,p: c.send("Input.dispatchTouchEvent",type=k,touchPoints=p)
        def fresh():
            c.eval(RESET); time.sleep(0.5); return c.eval(PICK)
        def swipe(x,y):
            T("touchStart",[{"x":x,"y":y,"id":1}])
            for k in range(1,9): T("touchMove",[{"x":x-60.0*k/8,"y":y,"id":1}]); time.sleep(0.02)
            T("touchEnd",[]); time.sleep(0.45); return c.eval(READ)
        def hold(x,y,jit=0,drag=0):
            T("touchStart",[{"x":x,"y":y,"id":1}]); time.sleep(0.12)
            if jit: T("touchMove",[{"x":x+jit,"y":y,"id":1}])
            time.sleep(0.38); mid=c.eval(READ)
            for k in range(1,7):
                if drag: T("touchMove",[{"x":x+jit+drag*k/6,"y":y,"id":1}]); time.sleep(0.03)
            T("touchEnd",[]); time.sleep(0.4); return mid,c.eval(READ)
        out={}
        print(f"\n[{LABEL}] REAL TOUCH at 380px")
        p=fresh(); r=swipe(p["bx"],p["by"]); body=abs(r["time"]-p["time"])+abs(r["scroll"]-p["scroll"])/100
        print(f"  body swipe (CONTROL)   time {p['time']:.2f}->{r['time']:.2f}  scroll {p['scroll']}->{r['scroll']}  live={r['live']}  {'✅' if body>0.05 else '⚠️ CONTROL DEAD'}")
        p=fresh(); r=swipe(p["gx"],p["gy"]); grip=abs(r["time"]-p["time"])+abs(r["scroll"]-p["scroll"])/100
        print(f"  grip swipe             time {p['time']:.2f}->{r['time']:.2f}  scroll {p['scroll']}->{r['scroll']}  live={r['live']}  {'✅ moves' if grip>0.05 else '❌ DEAD STRIP'}")
        for jit in (0,3,6):
            p=fresh(); mid,end=hold(p["gx"],p["gy"],jit=jit)
            print(f"  hold, {jit}px tremor, release   armed@500={mid['armed']!s:5}  live@500={mid['live']:9}  after: live={end['live']} trim {p['before']}->{end['after']}"
                  + ("  ❌ NOT ARMED" if not mid['armed'] else "") + ("  ⚠️ RETIMED WITHOUT DRAGGING" if end['after']!=p['before'] else ""))
        p=fresh(); mid,end=hold(p["gx"],p["gy"],jit=3,drag=30)
        print(f"  hold, 3px tremor, DRAG 30  armed@500={mid['armed']!s:5}  trim {p['before']}->{end['after']}  live={end['live']}  {'✅ TRIMMED' if end['after']!=p['before'] and mid['armed'] else '❌'}")
        p=fresh(); mid,end=hold(p["gx"],p["gy"],jit=0,drag=30)
        print(f"  hold, still, DRAG 30       armed@500={mid['armed']!s:5}  trim {p['before']}->{end['after']}  live={end['live']}  {'✅ TRIMMED' if end['after']!=p['before'] and mid['armed'] else '❌'}")
        return 0
    finally:
        if c: c.close()
        proc.terminate()
sys.exit(main())
