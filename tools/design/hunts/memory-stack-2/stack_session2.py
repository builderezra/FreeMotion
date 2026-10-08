import sys,json,time,subprocess,tempfile,urllib.request,websocket,os,re
CHROME='/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
SERVER=sys.argv[1]; LABEL=sys.argv[2]; PORT=int(sys.argv[3]); ROUNDS=int(sys.argv[4]) if len(sys.argv)>4 else 2
SP=os.path.dirname(os.path.abspath(__file__))+'/'
ud=tempfile.mkdtemp()
p=subprocess.Popen([CHROME,'--headless=new','--no-sandbox','--disable-gpu','--mute-audio','--remote-allow-origins=*','--remote-debugging-port=%d'%PORT,'--window-size=380,900','--user-data-dir='+ud,'about:blank'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
for _ in range(80):
    try: tabs=json.load(urllib.request.urlopen('http://127.0.0.1:%d/json'%PORT)); break
    except Exception: time.sleep(.3)
ws=websocket.create_connection([t for t in tabs if t['type']=='page'][0]['webSocketDebuggerUrl'],timeout=900)
n=[0]
def call(m,pr=None):
    n[0]+=1; ws.send(json.dumps({'id':n[0],'method':m,'params':pr or {}}))
    while True:
        r=json.loads(ws.recv())
        if r.get('id')==n[0]: return r
def ev(e):
    r=call('Runtime.evaluate',{'expression':e,'awaitPromise':True,'returnByValue':True}); x=r.get('result',{}).get('result',{})
    if 'exceptionDetails' in r.get('result',{}): return 'EXC '+json.dumps(r['result']['exceptionDetails'])[:200]
    return x.get('value')
def status(pid):
    d={}
    try:
        for ln in open('/proc/%d/status'%pid):
            if ln.startswith(('VmData','VmRSS','VmHWM')): k,v=ln.split(':'); d[k]=round(int(v.split()[0])/1024,1)
    except Exception: pass
    return d
OUT=[]
def measure(label):
    call('HeapProfiler.collectGarbage'); call('HeapProfiler.collectGarbage')
    r=call('Runtime.evaluate',{'expression':'HTMLCanvasElement.prototype'})['result']['result']
    q=call('Runtime.queryObjects',{'prototypeObjectId':r['objectId']})['result']['objects']
    cv=call('Runtime.callFunctionOn',{'objectId':q['objectId'],'functionDeclaration':"function(){var a=this,n=0,px=0,big=0;for(var i=0;i<a.length;i++){var c=a[i];if(c.width*c.height>0){n++;px+=c.width*c.height;if(c.width*c.height>=1000000)big++}}return {canvases:n,mpx:Math.round(px/1e4)/100,big:big}}",'returnByValue':True})['result']['result']['value']
    call('Runtime.releaseObject',{'objectId':q['objectId']}); call('Runtime.releaseObject',{'objectId':r['objectId']})
    hu=call('Runtime.getHeapUsage')['result']
    best=None; brow=None
    for ln in subprocess.run(['ps','-eo','pid,args'],capture_output=True,text=True).stdout.splitlines():
        if ud not in ln: continue
        pid=int(ln.split()[0]); st=status(pid)
        if '--type=renderer' in ln:
            if best is None or st.get('VmRSS',0)>best[1].get('VmRSS',0): best=(pid,st)
        elif '--type=' not in ln: brow=st
    row={'stage':label,'canvases':cv['canvases'],'canvasMpx':cv['mpx'],'big':cv['big'],'jsHeapMB':round(hu['usedSize']/1048576,1),'rendererVmDataMB':best[1].get('VmData'),'rendererRSS_MB':best[1].get('VmRSS'),'browserRSS_MB':(brow or {}).get('VmRSS')}
    print(json.dumps(row),flush=True); OUT.append(row)
try:
    call('Page.enable'); call('Runtime.enable'); call('HeapProfiler.enable')
    call('Emulation.setDeviceMetricsOverride',{'width':380,'height':760,'deviceScaleFactor':1,'mobile':False})
    call('Page.navigate',{'url':SERVER+'/index.html'}); time.sleep(7)
    for f in ('h40_round.js','h44_page.js','h43_trig.js'): ev(open(SP+f).read())
    ev("window.__h44.mode='disk'")
    measure('0 boot')
    print(ev('''(async function(){var pid=await FM.projects.create({name:"Stack",width:1080,height:1920}); await FM.projects.open(pid); return 'project'})()'''))
    t0=time.time()
    print(ev('window.__h44.importN(20)'),'import s',round(time.time()-t0)); measure('1 after 20 clips imported')
    # effects browsing: 12 categories, tiles clicked, ROUNDS times, on an image-or-shape layer
    ev('''(async function(){var L=FM.makeLayer('shape',{shape:'rect',x:540,y:900,shapeW:500,shapeH:500,fill:'#c05030',name:'fxl'});L.start=0;L.duration=6;FM.scene.layers.unshift(L);FM.refreshAll();FM.selectLayer(L.id);L.effects=[];return 1})()''')
    cats=ev("(FM.FX_CATEGORIES||[]).map(function(c){return c.key})")
    for rd in range(ROUNDS):
        ev("(async function(){var L=FM.scene.layers[0];FM.selectLayer(L.id);FM.fxBrowser.open(L);await new Promise(function(r){setTimeout(r,300)});return 1})()")
        for ck in cats:
            ev("""(async function(){FM.fxBrowser._openCategory('%s');await new Promise(function(r){setTimeout(r,200)});var tiles=[].slice.call(document.querySelectorAll('#fx-browser .fxb-catview [data-fxid]'));var seen={};tiles.slice(0,4).forEach(function(t){var id=t.dataset.fxid;if(seen[id])return;seen[id]=1;t.click()});var back=document.querySelector('#fx-browser .fxb-catview .fxb-back');if(back)back.click();await new Promise(function(r){setTimeout(r,100)});return tiles.length})()"""%ck)
        ev("""(function(){var d=document.querySelector('#fx-browser .fxb-subdone');if(d)d.click();FM.fxBrowser.close&&FM.fxBrowser.close();return 1})()""")
        time.sleep(4)
    measure('2 after effects-browser sweeps (%d x %d categories)'%(ROUNDS,len(cats)))
    # editing: random effects with renders, undo/redo, replace media, the trigger setups
    print(ev('window.__round("stk",{fx:40})')[:120])
    print(ev('window.__h44.replace(6)'),'replaced'); print(ev('window.__h44.undoRedo(4)'))
    ev('''(async function(){var R=FM.fxRegistry; var L=FM.scene.layers[0]; L.effects=[R.makeInstance('objectblur'),R.makeInstance('fillbehind')]; var b=R.makeInstance(FM.FX_CONTAINER); b.effects=[R.makeInstance('pixelate')].filter(Boolean); b.params=b.params||{}; b.params.strength=0.5; L.effects.push(b); L.transform.rotationX=20; L.transform.x={kf:[{t:0,v:200},{t:2,v:800}]}; var A=FM.makeLayer('adjustment',{start:0,duration:6}); var b2=R.makeInstance(FM.FX_CONTAINER); b2.effects=[R.makeInstance('pixelate')].filter(Boolean); b2.params=b2.params||{}; b2.params.strength=0.5; A.effects=[b2]; FM.scene.layers.unshift(A); FM.refreshAll(); for(var k=0;k<12;k++){FM.setTime(0.3*k);FM.requestRender&&FM.requestRender();await new Promise(function(r){setTimeout(r,250)});} return 1})()''')
    measure('3 after editing session (effects, undo/redo, replaces, containers)')
    ev('''(function(){FM.scene.project.duration=0.6; FM.scene.layers.forEach(function(l){l.duration=Math.min(l.duration,0.6)}); document.getElementById("exp-format").value="gif"; document.getElementById("exp-range").value="whole"; FM._setExportSoloId(null); window.__expP=FM._runExport().then(function(){window.__expDone=1},function(e){window.__expDone='err '+e}); return 1})()''')
    for _ in range(300):
        time.sleep(1)
        d=ev('window.__expDone')
        if d: break
        # a ready card, if any, is pressed
        ev('''(function(){var e=document.getElementById("export-ready"); if(e&&!e.classList.contains("hidden")){document.getElementById("xr-discard").click()}})()''')
    print('export:',ev('window.__expDone'))
    measure('4 right after one GIF export')
    time.sleep(45)
    measure('5 after 45 s idle (trim windows)')
    json.dump(OUT,open(SP+'stack_session_%s.json'%LABEL,'w'),indent=1)
finally:
    p.kill()
