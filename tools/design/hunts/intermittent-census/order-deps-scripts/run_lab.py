import json,subprocess,time,urllib.request,websocket,tempfile,sys
CH='/opt/pw-browsers/chromium-1194/chrome-linux/chrome'; port=int(sys.argv[2]) if len(sys.argv)>2 else 9425
extra=sys.argv[3:] 
ud=tempfile.mkdtemp()
p=subprocess.Popen([CH,'--headless=new','--no-sandbox','--disable-gpu','--remote-allow-origins=*','--remote-debugging-port=%d'%port,'--user-data-dir='+ud]+extra+['about:blank'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
try:
    for _ in range(60):
        try: tabs=json.load(urllib.request.urlopen('http://127.0.0.1:%d/json'%port)); break
        except Exception: time.sleep(.3)
    ws=websocket.create_connection([t for t in tabs if t['type']=='page'][0]['webSocketDebuggerUrl'],timeout=60); n=[0]
    def call(m,pr=None):
        n[0]+=1; ws.send(json.dumps({'id':n[0],'method':m,'params':pr or {}}))
        while True:
            r=json.loads(ws.recv())
            if r.get('id')==n[0]: return r
    call('Page.enable'); call('Page.navigate',{'url':sys.argv[1]})
    for _ in range(100):
        r=call('Runtime.evaluate',{'expression':'window.__lab?document.getElementById("out").textContent:null','returnByValue':True})
        v=r.get('result',{}).get('result',{}).get('value')
        if v: print(v); break
        time.sleep(.3)
    else: print('no result', call('Runtime.evaluate',{'expression':'document.getElementById("out").textContent','returnByValue':True}))
finally: p.kill()
