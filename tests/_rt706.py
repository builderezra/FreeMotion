#!/usr/bin/env python3
# REAL-TOUCH PROBE for queue 706 (the Add sheet "opens twice" on his phone). Chrome at 380px reproduces
# NOTHING by any route — see the entry. Run: python3 tests/_rt706.py 8777 [empty]   then: pkill -f "headless=new"
"""Queue 706 — REAL touch at 380px: does one tap open the Add sheet TWICE? For each route (FAB, add row,
empty-timeline area) count FM.mobile.openAdd() calls per tap and sample the sheet's top edge + .open class
every 30ms for 900ms, so a reopen / mid-flight re-render shows up as a reversal in the trace."""
import importlib.util, json, os, sys, tempfile, time
REPO="/Users/ezrasmith/Claude/FreeMotion"
spec=importlib.util.spec_from_file_location("_cdp", os.path.join(REPO,"tests","_cdp.py")); _cdp=importlib.util.module_from_spec(spec); spec.loader.exec_module(_cdp)
PORT=int(sys.argv[1]); EMPTY = (len(sys.argv)>2 and sys.argv[2]=="empty")
dbg=_cdp.free_port(); prof=tempfile.mkdtemp(prefix="fm-706-"); proc=_cdp.launch(dbg,380,820,prof); c=None
try:
    c=_cdp.CDP(_cdp.ws_url(dbg)); c.send("Page.enable"); c.send("Runtime.enable")
    c.send("Emulation.setDeviceMetricsOverride",width=380,height=820,deviceScaleFactor=2,mobile=True)
    c.send("Emulation.setTouchEmulationEnabled",enabled=True,maxTouchPoints=5)
    c.send("Page.navigate",url=f"http://localhost:{PORT}/index.html")
    for _ in range(300):
        try:
            if c.eval("!!(window.FM && FM.scene && FM.timeline && FM.mobile)"): break
        except Exception: pass
        time.sleep(0.1)
    print("setup:", c.eval("""(async function(){ const s=ms=>new Promise(r=>setTimeout(r,ms)); const sp=document.getElementById('splash'); if(sp) sp.remove();
      if (FM.home&&FM.home.isOpen&&FM.home.isOpen()){ const k=document.querySelector('.hm-card'); if(k) k.click(); else FM.home.close(); } await s(1200);
      if (FM.home&&FM.home.isOpen&&FM.home.isOpen()) FM.home.close(); await s(400);
      FM.scene.layers.length=0; if(!%s){ const L=FM.makeLayer('shape',{shape:'rect',x:200,y:300,shapeW:120,shapeH:90,fill:'#c05030'}); L.start=0; L.duration=2.5; FM.scene.layers.push(L); }
      FM.scene.project.duration=6; FM.selectLayer(null); FM.refreshAll(); FM.timeline.rebuild(); await s(600);
      // instrumentation: count openAdd calls, and watch the sheet
      window.__opens=0; const orig=FM.mobile.openAdd; FM.mobile.openAdd=function(){ window.__opens++; window.__openLog.push(Math.round(performance.now()-window.__t0)); return orig.apply(this,arguments); };
      window.__openLog=[]; window.__t0=performance.now();
      window.__sample=function(){ const sh=document.getElementById('add-sheet'); const r=sh.getBoundingClientRect(); const g=document.getElementById('add-grid'); return {t:Math.round(performance.now()-window.__t0), top:Math.round(r.top), open:sh.classList.contains('open'), tiles:g?g.children.length:-1, bodyOpen:document.body.classList.contains('add-open')}; };
      const fab=document.getElementById('add-fab'), row=document.querySelector('.tl-addrow'), tl=document.getElementById('timeline');
      const R=el=>{ if(!el) return null; const r=el.getBoundingClientRect(); return {x:Math.round(r.left+r.width/2), y:Math.round(r.top+r.height/2), w:Math.round(r.width), h:Math.round(r.height), vis:getComputedStyle(el).display!=='none'&&r.width>0}; };
      return JSON.stringify({empty: %s, emptyStart: !!document.querySelector('.tl-empty-start'), fab:R(fab), row:R(row), tl:R(tl), sheetTop0: Math.round(document.getElementById('add-sheet').getBoundingClientRect().top)}); })()""" % ("true" if EMPTY else "false", "true" if EMPTY else "false"), await_promise=True))
    info=json.loads(c.eval("JSON.stringify({fab:(function(){const e=document.getElementById('add-fab');const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,vis:getComputedStyle(e).display!=='none'&&r.width>0}})(), row:(function(){const e=document.querySelector('.tl-addrow'); if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.left+Math.min(60,r.width/3),y:r.top+r.height/2,vis:r.width>0}})()})"))
    T=lambda k,p: c.send("Input.dispatchTouchEvent",type=k,touchPoints=p)
    def tap(name, x, y):
        c.eval("FM.mobile.closeAdd(); window.__opens=0; window.__openLog=[]; window.__t0=performance.now();"); time.sleep(0.5)
        c.eval("window.__t0=performance.now(); window.__trace=[]; window.__iv=setInterval(()=>{ window.__trace.push(window.__sample()); if(window.__trace.length>=30) clearInterval(window.__iv); },30);")
        T("touchStart",[{"x":x,"y":y,"id":1}]); time.sleep(0.06); T("touchEnd",[]); time.sleep(1.0)
        r=json.loads(c.eval("JSON.stringify({opens:window.__opens, at:window.__openLog, trace:window.__trace})"))
        tops=[s['top'] for s in r['trace']]; opens=[s['open'] for s in r['trace']]; tiles=[s['tiles'] for s in r['trace']]
        # a sheet that opens ONCE moves monotonically toward its resting top; a reversal = it went back and came again
        dirs=[(b<a)-(b>a) for a,b in zip(tops,tops[1:]) if a!=b]; reversals=sum(1 for a,b in zip(dirs,dirs[1:]) if a!=b)
        flips=sum(1 for a,b in zip(opens,opens[1:]) if a!=b)
        print(f"  {name:28} openAdd() calls={r['opens']} at {r['at']}ms   .open flips={flips}   top-edge reversals={reversals}   tiles {tiles[0]}->{tiles[-1]} (changes mid-flight: {sum(1 for a,b in zip(tiles,tiles[1:]) if a!=b)})")
        print("     top trace:", ' '.join(str(t) for t in tops[:30]))
    if info['fab'] and info['fab']['vis']: tap("FAB (+) tap", info['fab']['x'], info['fab']['y'])
    else: print("  FAB not visible in this state")
    if info['row'] and info['row']['vis']: tap("add-row tap", info['row']['x'], info['row']['y'])
    else: print("  add row not present in this state")
    # ── the sequence the reading predicts: the sheet is ALREADY OPEN and the add row is tapped again ──
    if info['row'] and info['row']['vis']:
        c.eval("FM.mobile.closeAdd(); window.__opens=0; window.__openLog=[];"); time.sleep(0.4)
        T("touchStart",[{"x":info['row']['x'],"y":info['row']['y'],"id":1}]); time.sleep(0.06); T("touchEnd",[]); time.sleep(0.8)   # first tap: opens
        c.eval("window.__opens=0; window.__openLog=[]; window.__t0=performance.now(); window.__trace=[]; window.__closes=0; const oc=FM.mobile.closeAdd; FM.mobile.closeAdd=function(){ window.__closes++; return oc.apply(this,arguments); }; window.__iv=setInterval(()=>{ window.__trace.push(window.__sample()); if(window.__trace.length>=30) clearInterval(window.__iv); },30);")
        T("touchStart",[{"x":info['row']['x'],"y":info['row']['y'],"id":1}]); time.sleep(0.06); T("touchEnd",[]); time.sleep(1.0)   # second tap, sheet open
        r=json.loads(c.eval("JSON.stringify({opens:window.__opens, closes:window.__closes, at:window.__openLog, trace:window.__trace})"))
        tops=[x['top'] for x in r['trace']]; opens=[x['open'] for x in r['trace']]
        flips=sum(1 for a,b in zip(opens,opens[1:]) if a!=b); dirs=[(b<a)-(b>a) for a,b in zip(tops,tops[1:]) if a!=b]; rev=sum(1 for a,b in zip(dirs,dirs[1:]) if a!=b)
        print(f"  add-row tap WHILE OPEN       closeAdd() calls={r['closes']}  openAdd() calls={r['opens']} at {r['at']}ms   .open flips={flips}   top-edge reversals={rev}")
        print("     top trace:", ' '.join(str(t) for t in tops[:30]))
        print("     → " + ("🔴 CLOSE-THEN-REOPEN: the sheet drops and hinges up again from a single tap" if (r['closes']>=1 and r['opens']>=1) else "one motion"))
    if EMPTY:
        tl=json.loads(c.eval("JSON.stringify((function(){const e=document.getElementById('timeline');const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.bottom-30}})())")); tap("empty-area tap", tl['x'], tl['y'])
finally:
    if c: c.close()
    proc.terminate()
    try: proc.wait(timeout=5)
    except Exception: proc.kill()
