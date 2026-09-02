#!/usr/bin/env python3
# RELEASE BISECT (queue 707): does lifting the finger after a trim-hold retime the clip? Tremor in X vs Y, 1px vs 3px,
# with every public FM.* on the release path wrapped to name the culprit. Found the phantom compatibility click that
# lands on the edit sheet opened under the finger. Run: python3 tests/_rt707_release.py   (server on :8777)
import importlib.util, json, os, sys, tempfile, time
HERE=os.path.dirname(os.path.abspath(__file__)); REPO="/Users/ezrasmith/Claude/FreeMotion"
spec=importlib.util.spec_from_file_location("_cdp", os.path.join(REPO,"tests","_cdp.py")); _cdp=importlib.util.module_from_spec(spec); spec.loader.exec_module(_cdp)
src=open(os.path.join(HERE,"_realtouch.py")).read()
def block(n): return src.split(n+' = r"""')[1].split('"""')[0]
SETUP,PICK,RESET=block("SETUP"),block("PICK"),block("RESET")
dbg=_cdp.free_port(); prof=tempfile.mkdtemp(prefix="fm-707c-"); proc=_cdp.launch(dbg,380,820,prof); c=None
try:
    c=_cdp.CDP(_cdp.ws_url(dbg)); c.send("Page.enable"); c.send("Runtime.enable")
    c.send("Emulation.setDeviceMetricsOverride",width=380,height=820,deviceScaleFactor=2,mobile=True); c.send("Emulation.setTouchEmulationEnabled",enabled=True,maxTouchPoints=5)
    c.send("Page.navigate",url="http://localhost:8777/index.html")
    for _ in range(300):
        try:
            if c.eval("!!(window.FM && FM.scene && FM.timeline && FM.makeLayer)"): break
        except Exception: pass
        time.sleep(0.1)
    c.eval(SETUP,await_promise=True)
    # wrap every public call on the release path; record which one moves the layer
    c.eval("""(function(){ window.__calls=[]; const L=()=>window.__L; const wrap=(obj,name,label)=>{ const o=obj[name]; if(typeof o!=='function') return; obj[name]=function(){ const b=L()?L().start+'/'+L().duration:'?'; const r=o.apply(this,arguments); const a=L()?L().start+'/'+L().duration:'?'; if(b!==a) window.__calls.push(label+': '+b+' -> '+a); return r; }; };
      wrap(FM,'autoFitDuration','autoFitDuration'); wrap(FM,'selectLayer','selectLayer'); wrap(FM.timeline,'rebuild','timeline.rebuild'); wrap(FM,'refreshAll','refreshAll'); if(FM.history) wrap(FM.history,'commit','history.commit'); if(FM.inspector) wrap(FM.inspector,'refresh','inspector.refresh'); wrap(FM,'scrubTime','scrubTime'); wrap(FM,'setTime','setTime'); wrap(FM,'requestRender','requestRender'); })()""")
    T=lambda k,pts: c.send("Input.dispatchTouchEvent",type=k,touchPoints=pts)
    def case(name, tremor_dx, tremor_dy, release_back):
        c.eval(RESET); time.sleep(0.5); p=c.eval(PICK); x,y=p["gx"],p["gy"]; c.eval("window.__calls=[]; FM._lastTrim=null")
        t0=c.eval("FM.time")
        T("touchStart",[{"x":x,"y":y,"id":1}]); time.sleep(0.12)
        if tremor_dx or tremor_dy: T("touchMove",[{"x":x+tremor_dx,"y":y+tremor_dy,"id":1}])
        time.sleep(0.38)
        if release_back: T("touchMove",[{"x":x,"y":y,"id":1}]); time.sleep(0.03)
        T("touchEnd",[]); time.sleep(0.4)
        r=c.eval("(function(){const L=window.__L; return {clip:L.start.toFixed(2)+'/'+L.duration.toFixed(2), t:FM.time, lt:!!FM._lastTrim, calls:window.__calls}})()")
        print("  %-38s %s -> %s   playhead %.2f->%.2f   applyTrimAt ran: %s   moved by: %s" % (name, p["before"], r["clip"], t0, r["t"], r["lt"], r["calls"] or "(no wrapped call changed it)"))
    case("no tremor (control)", 0, 0, False)
    case("3px tremor in X", 3, 0, False)
    case("3px tremor in Y", 0, 3, False)
    case("3px X tremor, then back to x, release", 3, 0, True)
    case("1px tremor in X", 1, 0, False)
finally:
    if c: c.close()
    proc.terminate()
