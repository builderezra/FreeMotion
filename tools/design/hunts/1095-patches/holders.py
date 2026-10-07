import sys,json,time,subprocess,tempfile,urllib.request,websocket
CHROME='/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
SERVER=sys.argv[1]; NCAT=int(sys.argv[2]) if len(sys.argv)>2 else 2
ud=tempfile.mkdtemp(); port=9995
p=subprocess.Popen([CHROME,'--headless=new','--no-sandbox','--disable-gpu','--mute-audio','--remote-allow-origins=*','--remote-debugging-port=%d'%port,'--user-data-dir='+ud,'about:blank'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
for _ in range(60):
    try: tabs=json.load(urllib.request.urlopen('http://127.0.0.1:%d/json'%port)); break
    except Exception: time.sleep(.3)
ws=websocket.create_connection([t for t in tabs if t['type']=='page'][0]['webSocketDebuggerUrl'],timeout=900)
n=[0]; chunks=[]
def call(m,pr=None):
    n[0]+=1; ws.send(json.dumps({'id':n[0],'method':m,'params':pr or {}}))
    while True:
        r=json.loads(ws.recv())
        if r.get('method')=='HeapProfiler.addHeapSnapshotChunk': chunks.append(r['params']['chunk'])
        if r.get('id')==n[0]: return r
def ev(e):
    r=call('Runtime.evaluate',{'expression':e,'awaitPromise':True,'returnByValue':True}); return r.get('result',{}).get('result',{}).get('value',r)
try:
    call('Page.enable'); call('Runtime.enable'); call('HeapProfiler.enable')
    call('Emulation.setDeviceMetricsOverride',{'width':1280,'height':800,'deviceScaleFactor':1,'mobile':False})
    call('Page.navigate',{'url':SERVER+'/index.html'}); time.sleep(6)
    ev("""(async function(){var L=FM.makeLayer('shape',{shape:'rect',x:200,y:300,shapeW:120,shapeH:90,fill:'#c05030'});L.start=0;L.duration=3;FM.scene.layers.push(L);FM.refreshAll();FM.selectLayer(L.id);L.effects=[];FM.fxBrowser.open(L);await new Promise(function(r){setTimeout(r,300)});return 1})()""")
    cats=ev("(FM.FX_CATEGORIES||[]).map(function(c){return c.key})"); print("cats",cats)
    for ck in cats[:NCAT]:
        ev("""(async function(){FM.fxBrowser._openCategory('%s');await new Promise(function(r){setTimeout(r,200)});var tiles=[].slice.call(document.querySelectorAll('#fx-browser .fxb-catview [data-fxid]'));var seen={};tiles.forEach(function(t){var id=t.dataset.fxid;if(seen[id])return;seen[id]=1;t.click()});var back=document.querySelector('#fx-browser .fxb-catview .fxb-back');if(back)back.click();await new Promise(function(r){setTimeout(r,100)});return tiles.length})()"""%ck)
    ev("""(function(){var d=document.querySelector('#fx-browser .fxb-subdone');if(d)d.click();FM.fxBrowser.close&&FM.fxBrowser.close();return 1})()""")
    time.sleep(9)
    call('HeapProfiler.collectGarbage'); call('HeapProfiler.collectGarbage')
    r=call('Runtime.evaluate',{'expression':'HTMLCanvasElement.prototype'})['result']['result']
    q=call('Runtime.queryObjects',{'prototypeObjectId':r['objectId']})['result']['objects']
    out=call('Runtime.callFunctionOn',{'objectId':q['objectId'],'functionDeclaration':"function(){var a=this,big=0,k=0;for(var i=0;i<a.length;i++){var c=a[i];if(c.width*c.height>=200000){c.__bigmark=c.width+'x'+c.height+'#'+(k++);big++}}return {n:a.length,big:big}}",'returnByValue':True})['result']['result']['value']
    print('marked',out)
    call('Runtime.releaseObject',{'objectId':q['objectId']}); call('Runtime.releaseObject',{'objectId':r['objectId']}); call('HeapProfiler.collectGarbage'); call('HeapProfiler.collectGarbage')
    chunks.clear(); call('HeapProfiler.takeHeapSnapshot',{'reportProgress':False,'captureNumericValue':False}); snap=''.join(chunks)
    open('/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad/holders.heapsnapshot','w').write(snap)
    print('snapshot bytes',len(snap))
finally: p.kill()
